const fs = require('fs');
const path = require('path');
const https = require('https');
const { execSync } = require('child_process');

function getGitHubToken() {
  if (process.env.GITHUB_TOKEN) return process.env.GITHUB_TOKEN;
  try { return execSync('gh auth token', { encoding: 'utf8' }).trim(); } catch { }
  console.error('No GitHub token found. Run: gh auth login');
  process.exit(1);
}

function apiRequest(hostname, apiPath, body, token) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const opts = {
      hostname, path: apiPath, method: 'POST', headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'Content-Length': Buffer.byteLength(data)
      }
    };
    const req = https.request(opts, res => {
      let buf = '';
      res.on('data', c => buf += c);
      res.on('end', () => resolve({ status: res.statusCode, body: buf }));
    });
    req.on('error', reject);
    req.setTimeout(60000, () => { req.destroy(); reject(new Error('Timeout')); });
    req.write(data);
    req.end();
  });
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function identifyPhoto(filePath, token) {
  const base64 = fs.readFileSync(filePath).toString('base64');
  const body = {
    model: 'openai/gpt-4o-mini',
    messages: [{
      role: 'user',
      content: [
        {
          type: 'text',
          text: `This is a photo from BANF (Bengali Association of North Florida) in Jacksonville, FL.
Answer in this exact JSON format (no markdown):
{"type":"photo|flyer|poster","event":"event name","year":2025,"season":"spring|summer|fall|winter","description":"one sentence description","suggested_filename":"descriptive-name"}
- type: is this a real event PHOTO or a FLYER/POSTER/graphic?
- event: what event (e.g. "Anand Bazar", "Durga Puja", "Spandan", "Picnic", "Sports Day", "Cultural Night", "AGM", etc.)
- year: best guess year from any visible text or context (use 2025 if unsure)
- season: best guess season
- description: brief description of what you see
- suggested_filename: a short kebab-case descriptive name for this image`
        },
        {
          type: 'image_url',
          image_url: { url: `data:image/jpeg;base64,${base64}` }
        }
      ]
    }],
    max_tokens: 200
  };

  const resp = await apiRequest('models.github.ai', '/inference/chat/completions', body, token);
  if (resp.status === 200) {
    const parsed = JSON.parse(resp.body);
    const content = parsed.choices?.[0]?.message?.content || '';
    try {
      return JSON.parse(content.replace(/```json\n?/g, '').replace(/```/g, '').trim());
    } catch {
      return { type: 'unknown', description: content, raw: true };
    }
  } else if (resp.status === 429) {
    return { type: 'rate_limited', description: 'Rate limited, retry' };
  }
  return { type: 'error', description: `API error ${resp.status}` };
}

async function main() {
  const token = getGitHubToken();
  console.log('=== BANF Photo Identifier & Classifier ===\n');

  const GALLERY = path.join(__dirname, 'docs', 'gallery');
  const files = fs.readdirSync(GALLERY)
    .filter(f => f.endsWith('.jpg') && (f.startsWith('fb-full-') || f.startsWith('ig-')))
    .sort();

  console.log(`Photos to identify: ${files.length}\n`);

  // Load alt text data for context
  let fbData = [], igData = [];
  try { fbData = JSON.parse(fs.readFileSync('_fb-fullsize-data.json', 'utf8')); } catch {}
  try { igData = JSON.parse(fs.readFileSync('_ig-scraped-data.json', 'utf8')); } catch {}

  const altMap = {};
  for (const d of [...fbData, ...igData]) {
    if (d.alt) altMap[d.file] = d.alt;
  }

  const results = {};
  let i = 0;
  for (const file of files) {
    i++;
    console.log(`[${i}/${files.length}] ${file}...`);
    
    const filePath = path.join(GALLERY, file);
    let result = await identifyPhoto(filePath, token);

    // Retry on rate limit
    if (result.type === 'rate_limited') {
      console.log('  Rate limited, waiting 30s...');
      await sleep(30000);
      result = await identifyPhoto(filePath, token);
    }

    // Add alt text context
    if (altMap[file]) result.altText = altMap[file];
    result.originalFile = file;
    result.source = file.startsWith('fb-') ? 'facebook' : 'instagram';

    results[file] = result;
    console.log(`  -> ${result.type}: ${result.event || ''} (${result.year || '?'}) - ${(result.description || '').substring(0, 60)}`);

    await sleep(2000); // rate limit
  }

  // Save results
  fs.writeFileSync('_photo-classifications.json', JSON.stringify(results, null, 2));
  console.log('\n=== Classification Summary ===');
  
  // Group by year and event
  const byYear = {};
  for (const [file, data] of Object.entries(results)) {
    const year = data.year || 'unknown';
    if (!byYear[year]) byYear[year] = [];
    byYear[year].push({ file, ...data });
  }

  for (const year of Object.keys(byYear).sort()) {
    console.log(`\n${year}: ${byYear[year].length} photos`);
    for (const p of byYear[year]) {
      console.log(`  ${p.type}: ${p.file} -> ${p.event || 'unknown'} (${p.suggested_filename || ''})`);
    }
  }

  console.log('\nSaved to _photo-classifications.json');
}

main().catch(e => { console.error('Fatal:', e.message); process.exit(1); });
