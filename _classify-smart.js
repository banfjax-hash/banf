const fs = require('fs');
const path = require('path');
const https = require('https');
const { execSync } = require('child_process');

// Album map from our scrape
const ALBUM_MAP = {
  'a.360315859469978': { name: 'Mobile Uploads', year: null },
  'a.360315876136643': { name: 'Profile Pictures', year: null },
  'a.360315866136644': { name: 'Photos', year: null },
  'a.1221583500009872': { name: 'Durga Puja 2025', year: 2025 },
  'a.1180264127475143': { name: 'Spandan 2025', year: 2025 },
  'a.1102569225244634': { name: 'Sports Day 2025', year: 2025 },
  'a.360315869469977': { name: 'Cover Photos', year: null },
  'a.673000554868172': { name: 'Anandadhara Returns 2023', year: 2023 }
};

// Map photo fbids to their album using the download log  
// We'll re-parse from the saved data + known URL patterns
const fbData = JSON.parse(fs.readFileSync('_fb-all-photos-data.json', 'utf8'));

// Parse the terminal output we captured - photo links had set= params
// Let's re-scrape just the links to get album mapping
const puppeteer = require('puppeteer');
const GALLERY = path.join(__dirname, 'docs', 'gallery');

async function getAlbumMapping() {
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');

  const albumPhotos = {};
  
  for (const [setKey, albumInfo] of Object.entries(ALBUM_MAP)) {
    const setId = setKey.replace('a.', '');
    const url = `https://www.facebook.com/media/set/?set=${setKey}&type=3`;
    console.log(`\nAlbum: ${albumInfo.name} (${url})`);
    
    try {
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 20000 });
      for (let i = 0; i < 10; i++) {
        await page.evaluate(() => window.scrollBy(0, 1000));
        await new Promise(r => setTimeout(r, 1500));
      }
      
      const links = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('a[href*="fbid="]'))
          .map(a => {
            const m = a.href.match(/fbid=(\d+)/);
            return m ? m[1] : null;
          })
          .filter(Boolean);
      });
      
      const uniqueFbids = [...new Set(links)];
      console.log(`  Found ${uniqueFbids.length} photos`);
      
      for (const fbid of uniqueFbids) {
        albumPhotos[fbid] = { album: albumInfo.name, year: albumInfo.year, setId };
      }
    } catch (e) {
      console.log(`  Error: ${e.message.substring(0, 60)}`);
    }
  }
  
  await browser.close();
  return albumPhotos;
}

function getGitHubToken() {
  if (process.env.GITHUB_TOKEN) return process.env.GITHUB_TOKEN;
  try { return execSync('gh auth token', { encoding: 'utf8' }).trim(); } catch { }
  return null;
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

async function identifyWithVision(filePath, token) {
  const base64 = fs.readFileSync(filePath).toString('base64');
  const body = {
    model: 'openai/gpt-4o-mini',
    messages: [{
      role: 'user',
      content: [
        { type: 'text', text: `This is from BANF (Bengali Association of North Florida). Reply ONLY with JSON, no markdown:
{"type":"photo or flyer","event":"event name","year":2025,"description":"brief description","suggested_name":"kebab-case-name"}` },
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
  if (resp.status === 429) return null; // rate limited
  return { type:'error', description: `Status ${resp.status}` };
}

async function main() {
  console.log('=== Photo Classification ===\n');
  
  // Step 1: Get album mapping from Facebook
  console.log('--- Step 1: Get album mapping ---');
  const albumMapping = await getAlbumMapping();
  console.log(`\nMapped ${Object.keys(albumMapping).length} photos to albums\n`);
  
  // Step 2: Classify all photos
  const allFiles = fs.readdirSync(GALLERY).filter(f => f.endsWith('.jpg')).sort();
  console.log(`Total gallery files: ${allFiles.length}\n`);
  
  const classifications = {};
  const needsVision = []; // Only IG photos and unmapped FB photos
  
  // IG alt text data
  let igData = [];
  try { igData = JSON.parse(fs.readFileSync('_ig-scraped-data.json', 'utf8')); } catch {}
  const igAltMap = {};
  for (const d of igData) igAltMap[d.file] = d.alt || '';
  
  for (const file of allFiles) {
    const sizeKB = Math.round(fs.statSync(path.join(GALLERY, file)).size / 1024);
    
    if (file.startsWith('fb-full-')) {
      const fbid = file.replace('fb-full-', '').replace('.jpg', '');
      const albumInfo = albumMapping[fbid];
      
      if (albumInfo && albumInfo.album !== 'Profile Pictures' && albumInfo.album !== 'Cover Photos') {
        // Known album - classify directly
        classifications[file] = {
          source: 'facebook',
          album: albumInfo.album,
          year: albumInfo.year,
          event: albumInfo.album,
          type: 'photo',
          sizeKB,
          method: 'album'
        };
        console.log(`FB album: ${file} -> ${albumInfo.album} (${albumInfo.year || '?'})`);
      } else if (albumInfo && (albumInfo.album === 'Profile Pictures' || albumInfo.album === 'Cover Photos')) {
        // Skip profile/cover photos
        console.log(`Skip: ${file} -> ${albumInfo.album}`);
        classifications[file] = { source: 'facebook', album: albumInfo.album, skip: true };
      } else {
        // Unknown album - need vision
        needsVision.push(file);
        console.log(`Need Vision: ${file} (no album match)`);
      }
    } else if (file.startsWith('ig-')) {
      // IG photos - need Vision API (or parse date from alt text)
      const alt = igAltMap[file] || '';
      const dateMatch = alt.match(/on (\w+ \d+, \d+)/);
      if (dateMatch) {
        const date = new Date(dateMatch[1]);
        const year = date.getFullYear();
        classifications[file] = {
          source: 'instagram',
          year,
          type: 'photo',
          altText: alt,
          sizeKB,
          method: 'ig-date'
        };
        console.log(`IG date: ${file} -> ${year} (${dateMatch[1]})`);
        // Still need vision to identify event
        needsVision.push(file);
      } else {
        needsVision.push(file);
        console.log(`Need Vision: ${file} (IG, no date)`);
      }
    } else {
      // Existing Wix photos - already classified
      const yearMatch = file.match(/(\d{4})/);
      classifications[file] = {
        source: 'wix',
        year: yearMatch ? parseInt(yearMatch[1]) : 2023,
        type: 'photo',
        event: file.replace(/-\d{4}/, '').replace('.jpg', '').replace(/-/g, ' '),
        sizeKB,
        method: 'existing'
      };
      console.log(`Existing: ${file}`);
    }
  }
  
  console.log(`\n--- Step 3: Vision API for ${needsVision.length} remaining photos ---`);
  
  const token = getGitHubToken();
  if (token && needsVision.length > 0) {
    for (let i = 0; i < needsVision.length; i++) {
      const file = needsVision[i];
      console.log(`\n[${i+1}/${needsVision.length}] ${file}...`);
      
      const result = await identifyWithVision(path.join(GALLERY, file), token);
      if (!result) {
        console.log('  Rate limited, wait 30s...');
        await new Promise(r => setTimeout(r, 30000));
        const retry = await identifyWithVision(path.join(GALLERY, file), token);
        if (retry) Object.assign(classifications[file] || {}, retry, { method: 'vision' });
      } else {
        const existing = classifications[file] || {};
        classifications[file] = { ...existing, ...result, method: existing.method ? existing.method + '+vision' : 'vision' };
      }
      
      const c = classifications[file] || {};
      console.log(`  -> ${c.type||'?'}: ${c.event||'?'} (${c.year||'?'}) ${(c.description||'').substring(0,50)}`);
      
      await new Promise(r => setTimeout(r, 2500));
    }
  } else if (!token) {
    console.log('  No GitHub token available, skipping Vision API');
  }
  
  // Save
  fs.writeFileSync('_photo-classifications.json', JSON.stringify(classifications, null, 2));
  
  // Summary
  console.log('\n\n=== SUMMARY ===');
  const byYear = {};
  let skipped = 0;
  for (const [file, data] of Object.entries(classifications)) {
    if (data.skip) { skipped++; continue; }
    const y = data.year || 'unknown';
    if (!byYear[y]) byYear[y] = [];
    byYear[y].push({ file, ...data });
  }
  
  for (const year of Object.keys(byYear).sort()) {
    console.log(`\n${year} (${byYear[year].length} photos):`);
    byYear[year].forEach(p => console.log(`  [${p.source}] ${p.file} - ${p.event||p.album||'?'}`));
  }
  console.log(`\nSkipped: ${skipped} (profile/cover photos)`);
  console.log(`Total classified: ${Object.keys(classifications).length - skipped}`);
}

main().catch(e => { console.error('Fatal:', e.message); process.exit(1); });
