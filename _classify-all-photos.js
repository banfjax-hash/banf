const fs = require('fs');
const path = require('path');
const https = require('https');
const { execSync } = require('child_process');

function getGitHubToken() {
  if (process.env.GITHUB_TOKEN) return process.env.GITHUB_TOKEN;
  try { return execSync('gh auth token', { encoding: 'utf8' }).trim(); } catch { }
  console.error('No GitHub token. Run: gh auth login');
  process.exit(1);
}

function apiRequest(body, token) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const opts = {
      hostname: 'models.github.ai', path: '/inference/chat/completions', method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}`, 'Content-Length': Buffer.byteLength(data) }
    };
    const req = https.request(opts, res => {
      let buf = '';
      res.on('data', c => buf += c);
      res.on('end', () => resolve({ status: res.statusCode, body: buf }));
    });
    req.on('error', reject);
    req.setTimeout(60000, () => { req.destroy(); reject(new Error('Timeout')); });
    req.write(data); req.end();
  });
}

// Map album set IDs to album names from our scrape
const ALBUM_MAP = {
  '360315859469978': 'Mobile Uploads',
  '360315876136643': 'Profile Pictures',
  '360315866136644': 'Photos',
  '1221583500009872': 'Durga Puja 2025',
  '1180264127475143': 'Spandan 2025',
  '1102569225244634': 'Sports Day 2025',
  '360315869469977': 'Cover Photos',
  '673000554868172': 'Anandadhara Returns 2023'
};

async function identifyPhoto(filePath, token) {
  const base64 = fs.readFileSync(filePath).toString('base64');
  const body = {
    model: 'openai/gpt-4o-mini',
    messages: [{
      role: 'user',
      content: [
        { type: 'text', text: `This is from BANF (Bengali Association of North Florida). Reply ONLY with JSON, no markdown:
{"type":"photo or flyer","event":"event name","year":2025,"description":"one sentence","suggested_name":"kebab-case-name"}` },
        { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${base64}` } }
      ]
    }],
    max_tokens: 150
  };
  const resp = await apiRequest(body, token);
  if (resp.status === 200) {
    const content = JSON.parse(resp.body).choices?.[0]?.message?.content || '';
    try { return JSON.parse(content.replace(/```json\n?/g,'').replace(/```/g,'').trim()); }
    catch { return { type:'unknown', description: content }; }
  }
  if (resp.status === 429) return { type:'rate_limited' };
  return { type:'error', description: `Status ${resp.status}` };
}

async function main() {
  const token = getGitHubToken();
  const GALLERY = path.join(__dirname, 'docs', 'gallery');
  
  // Load existing photo data from facebook scrape
  let fbPhotoData = [];
  try { fbPhotoData = JSON.parse(fs.readFileSync('_fb-all-photos-data.json','utf8')); } catch {}
  const fbidToAlbum = {};
  for (const p of fbPhotoData) {
    if (p.fbid) fbidToAlbum[p.fbid] = p;
  }

  // Get all photos needing identification (fb-full and ig files)
  const files = fs.readdirSync(GALLERY)
    .filter(f => f.endsWith('.jpg') && (f.startsWith('fb-full-') || f.startsWith('ig-')))
    .sort();
  
  // Load existing classifications if any
  let existing = {};
  try { existing = JSON.parse(fs.readFileSync('_photo-classifications.json','utf8')); } catch {}
  
  console.log(`=== Photo Classification (${files.length} photos) ===\n`);
  
  const results = { ...existing };
  let classified = 0;
  
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    if (results[file] && !results[file].rate_limited) {
      console.log(`[${i+1}/${files.length}] ${file} - already classified`);
      continue;
    }
    
    console.log(`[${i+1}/${files.length}] ${file}...`);
    
    let result = await identifyPhoto(path.join(GALLERY, file), token);
    
    if (result.type === 'rate_limited') {
      console.log('  Rate limited, waiting 30s...');
      await new Promise(r => setTimeout(r, 30000));
      result = await identifyPhoto(path.join(GALLERY, file), token);
    }
    
    // Add album context from FB data
    if (file.startsWith('fb-full-')) {
      const fbid = file.replace('fb-full-','').replace('.jpg','');
      const fbInfo = fbidToAlbum[fbid];
      if (fbInfo && fbInfo.album) result.album = fbInfo.album;
      // Try to infer from album map
      for (const [setId, albumName] of Object.entries(ALBUM_MAP)) {
        if (fbInfo?.url?.includes(setId)) result.album = albumName;
      }
    }
    
    result.source = file.startsWith('fb-') ? 'facebook' : 'instagram';
    result.originalFile = file;
    result.sizeKB = Math.round(fs.statSync(path.join(GALLERY, file)).size / 1024);
    
    results[file] = result;
    classified++;
    
    console.log(`  -> ${result.type}: ${result.event||'?'} (${result.year||'?'}) ${(result.description||'').substring(0,50)}`);
    
    // Save incrementally
    if (classified % 5 === 0) {
      fs.writeFileSync('_photo-classifications.json', JSON.stringify(results, null, 2));
    }
    
    await new Promise(r => setTimeout(r, 2500));
  }
  
  fs.writeFileSync('_photo-classifications.json', JSON.stringify(results, null, 2));
  
  // Summary by year
  console.log('\n=== Summary by Year ===');
  const byYear = {};
  for (const [file, data] of Object.entries(results)) {
    const y = data.year || 'unknown';
    if (!byYear[y]) byYear[y] = [];
    byYear[y].push({ file, ...data });
  }
  for (const year of Object.keys(byYear).sort()) {
    console.log(`\n${year} (${byYear[year].length} photos):`);
    byYear[year].forEach(p => console.log(`  ${p.type}: ${p.file} -> ${p.event||'?'} - ${p.suggested_name||''}`));
  }
  
  console.log(`\nClassified ${classified} new photos. Total: ${Object.keys(results).length}`);
}

main().catch(e => { console.error('Fatal:', e.message); process.exit(1); });
