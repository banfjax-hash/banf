const fs = require('fs');
const path = require('path');

async function main() {
  console.log('=== Scraping BANF Facebook Public Photos ===\n');
  
  // Fetch the public photos page
  const r = await fetch('https://www.facebook.com/banfofficial/photos/', {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1)' },
    redirect: 'follow',
    signal: AbortSignal.timeout(20000)
  });
  const html = await r.text();
  
  // Extract all scontent image URLs
  const re = /https:\/\/scontent[^"'\s);&]+/g;
  const allImgs = [...html.matchAll(re)].map(m => m[0].replace(/&amp;/g, '&'));
  
  // Deduplicate, filter for actual photos (not tiny icons)
  const seen = new Set();
  const photos = [];
  for (const url of allImgs) {
    // Extract the base image identifier (before query params)
    const base = url.split('?')[0];
    if (seen.has(base)) continue;
    seen.add(base);
    // Skip tiny profile pics / icons - look for actual photo URLs
    if (url.includes('s320x320') || url.includes('cp0') || url.includes('_tt6')) continue;
    photos.push(url);
  }
  
  console.log(`Found ${allImgs.length} total image URLs, ${photos.length} unique full-size photos\n`);
  
  // Also get ALL unique base URLs including different sizes to find the largest
  const byBase = {};
  for (const url of allImgs) {
    const u = url.replace(/&amp;/g, '&');
    const base = u.split('?')[0];
    if (!byBase[base]) byBase[base] = [];
    byBase[base].push(u);
  }
  
  console.log('Unique image bases:', Object.keys(byBase).length);
  
  // Try to get the largest version of each image
  const GALLERY_DIR = path.join(__dirname, 'docs', 'gallery');
  if (!fs.existsSync(GALLERY_DIR)) fs.mkdirSync(GALLERY_DIR, { recursive: true });
  
  let downloaded = 0;
  const photoData = [];
  let idx = 0;
  
  for (const [base, urls] of Object.entries(byBase)) {
    // Pick the URL that looks like the largest version
    // Prefer s960x960, then no size constraint, skip tiny ones
    let bestUrl = urls[0];
    for (const u of urls) {
      if (u.includes('s960x960')) { bestUrl = u; break; }
      if (!u.includes('s320x320') && !u.includes('_tt6') && !u.includes('cp0')) bestUrl = u;
    }
    
    // Skip profile picture sized images 
    if (base.includes('-1/') && !base.includes('-6/')) continue; // -1/ is usually profile photos
    
    idx++;
    const filename = `fb-photo-${String(idx).padStart(3, '0')}.jpg`;
    const filepath = path.join(GALLERY_DIR, filename);
    
    if (fs.existsSync(filepath)) {
      console.log(`  Skip (exists): ${filename}`);
      photoData.push({ file: filename, url: bestUrl, base });
      continue;
    }
    
    try {
      const imgR = await fetch(bestUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1)' },
        signal: AbortSignal.timeout(15000)
      });
      if (!imgR.ok) { console.log(`  FAIL ${filename}: ${imgR.status}`); continue; }
      const buf = Buffer.from(await imgR.arrayBuffer());
      if (buf.length < 5000) { console.log(`  Skip tiny ${filename}: ${buf.length}B`); continue; }
      fs.writeFileSync(filepath, buf);
      console.log(`  Downloaded: ${filename} (${(buf.length/1024).toFixed(0)}KB)`);
      photoData.push({ file: filename, url: bestUrl, base, size: buf.length });
      downloaded++;
    } catch(e) {
      console.log(`  Error ${filename}: ${e.message}`);
    }
    
    await new Promise(r => setTimeout(r, 300));
  }
  
  // Now try to get MORE photos by checking the page for album links
  // Also try the /photos/albums/ URL
  console.log('\n--- Trying albums page ---');
  try {
    const r2 = await fetch('https://www.facebook.com/banfofficial/photos_albums/', {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1)' },
      redirect: 'follow',
      signal: AbortSignal.timeout(15000)
    });
    const html2 = await r2.text();
    const imgs2 = [...html2.matchAll(/https:\/\/scontent[^"'\s);&]+/g)].map(m => m[0].replace(/&amp;/g, '&'));
    const newImgs = imgs2.filter(u => !seen.has(u.split('?')[0]));
    console.log(`Albums page: ${imgs2.length} images, ${newImgs.length} new`);
    
    for (const url of newImgs) {
      const base = url.split('?')[0];
      if (seen.has(base)) continue;
      seen.add(base);
      if (base.includes('-1/')) continue;
      
      idx++;
      const filename = `fb-photo-${String(idx).padStart(3, '0')}.jpg`;
      const filepath = path.join(GALLERY_DIR, filename);
      
      try {
        const imgR = await fetch(url, {
          headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1)' },
          signal: AbortSignal.timeout(15000)
        });
        if (!imgR.ok) continue;
        const buf = Buffer.from(await imgR.arrayBuffer());
        if (buf.length < 5000) continue;
        fs.writeFileSync(filepath, buf);
        console.log(`  Downloaded: ${filename} (${(buf.length/1024).toFixed(0)}KB)`);
        photoData.push({ file: filename, url, base, size: buf.length });
        downloaded++;
      } catch(e) {}
      
      await new Promise(r => setTimeout(r, 300));
    }
  } catch(e) {
    console.log('Albums page error:', e.message);
  }
  
  // Save results
  fs.writeFileSync(path.join(__dirname, '_fb-scraped-data.json'), JSON.stringify(photoData, null, 2));
  console.log(`\n=== Done ===`);
  console.log(`Downloaded: ${downloaded} new photos`);
  console.log(`Total: ${photoData.length} photos`);
  console.log('Data saved to _fb-scraped-data.json');
}

main().catch(e => { console.error('Fatal:', e.message); process.exit(1); });
