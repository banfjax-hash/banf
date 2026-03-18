const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const GALLERY_DIR = path.join(__dirname, 'docs', 'gallery');

async function main() {
  console.log('=== BANF Facebook Photo Scraper (Puppeteer) ===\n');
  
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
  await page.setViewport({ width: 1280, height: 900 });
  
  // Intercept image requests to collect photo URLs
  const imageUrls = new Set();
  page.on('response', async (response) => {
    const url = response.url();
    if (url.includes('scontent') && response.status() === 200) {
      const ct = response.headers()['content-type'] || '';
      if (ct.includes('image')) {
        imageUrls.add(url);
      }
    }
  });
  
  console.log('Loading Facebook page photos...');
  await page.goto('https://www.facebook.com/banfofficial/photos/', { 
    waitUntil: 'networkidle2', 
    timeout: 30000 
  });
  
  // Scroll down to load more photos
  console.log('Scrolling to load more photos...');
  for (let i = 0; i < 10; i++) {
    await page.evaluate(() => window.scrollBy(0, 1000));
    await new Promise(r => setTimeout(r, 2000));
    console.log(`  Scroll ${i+1}/10 - images: ${imageUrls.size}`);
  }
  
  // Also extract all img src from the DOM
  const domImages = await page.evaluate(() => {
    const imgs = document.querySelectorAll('img[src*="scontent"]');
    return Array.from(imgs).map(img => ({
      src: img.src,
      width: img.naturalWidth || img.width,
      height: img.naturalHeight || img.height,
      alt: img.alt || ''
    }));
  });
  
  console.log(`\nDOM images found: ${domImages.length}`);
  console.log(`Network images intercepted: ${imageUrls.size}`);
  
  // Combine: use network-intercepted images (they have valid cookies) + DOM images
  // Filter for reasonably sized photos (not tiny icons/avatars)
  const allPhotos = [];
  const seenBases = new Set();
  
  for (const img of domImages) {
    if (img.width > 200 || img.src.includes('s960x960') || img.src.includes('_n.')) {
      const base = img.src.split('?')[0];
      if (!seenBases.has(base)) {
        seenBases.add(base);
        allPhotos.push({ url: img.src, alt: img.alt, source: 'dom' });
      }
    }
  }
  
  for (const url of imageUrls) {
    const base = url.split('?')[0];
    if (!seenBases.has(base)) {
      seenBases.add(base);
      allPhotos.push({ url, alt: '', source: 'network' });
    }
  }
  
  console.log(`\nTotal unique photos to download: ${allPhotos.length}\n`);
  
  if (!fs.existsSync(GALLERY_DIR)) fs.mkdirSync(GALLERY_DIR, { recursive: true });
  
  let downloaded = 0;
  const photoData = [];
  
  for (let i = 0; i < allPhotos.length; i++) {
    const photo = allPhotos[i];
    const filename = `fb-${String(i + 1).padStart(3, '0')}.jpg`;
    const filepath = path.join(GALLERY_DIR, filename);
    
    if (fs.existsSync(filepath)) {
      console.log(`  Skip (exists): ${filename}`);
      photoData.push({ file: filename, alt: photo.alt });
      continue;
    }
    
    try {
      // Use page.evaluate to fetch with proper cookies/context
      const imgPage = await browser.newPage();
      const response = await imgPage.goto(photo.url, { timeout: 15000 });
      
      if (response && response.ok()) {
        const buf = await response.buffer();
        if (buf.length > 5000) {
          fs.writeFileSync(filepath, buf);
          console.log(`  Downloaded: ${filename} (${(buf.length/1024).toFixed(0)}KB) ${photo.alt.substring(0,50)}`);
          photoData.push({ file: filename, alt: photo.alt, size: buf.length });
          downloaded++;
        } else {
          console.log(`  Skip tiny: ${filename} (${buf.length}B)`);
        }
      } else {
        console.log(`  FAIL: ${filename} (${response ? response.status() : 'no response'})`);
      }
      
      await imgPage.close();
    } catch(e) {
      console.log(`  Error: ${filename} - ${e.message.substring(0,60)}`);
    }
    
    await new Promise(r => setTimeout(r, 200));
  }
  
  // Also try album URLs
  console.log('\n--- Trying albums ---');
  try {
    await page.goto('https://www.facebook.com/banfofficial/photos_albums/', {
      waitUntil: 'networkidle2', timeout: 20000
    });
    
    for (let i = 0; i < 5; i++) {
      await page.evaluate(() => window.scrollBy(0, 800));
      await new Promise(r => setTimeout(r, 1500));
    }
    
    const albumImages = await page.evaluate(() => {
      const imgs = document.querySelectorAll('img[src*="scontent"]');
      return Array.from(imgs).map(img => ({
        src: img.src,
        width: img.naturalWidth || img.width,
        alt: img.alt || ''
      }));
    });
    
    console.log(`Album page images: ${albumImages.length}`);
    
    for (const img of albumImages) {
      const base = img.src.split('?')[0];
      if (seenBases.has(base) || img.width < 200) continue;
      seenBases.add(base);
      
      const filename = `fb-${String(allPhotos.length + photoData.length + 1).padStart(3, '0')}.jpg`;
      const filepath = path.join(GALLERY_DIR, filename);
      
      try {
        const imgPage = await browser.newPage();
        const response = await imgPage.goto(img.src, { timeout: 15000 });
        if (response && response.ok()) {
          const buf = await response.buffer();
          if (buf.length > 5000) {
            fs.writeFileSync(filepath, buf);
            console.log(`  Downloaded: ${filename} (${(buf.length/1024).toFixed(0)}KB)`);
            photoData.push({ file: filename, alt: img.alt, size: buf.length });
            downloaded++;
          }
        }
        await imgPage.close();
      } catch(e) {}
      
      await new Promise(r => setTimeout(r, 200));
    }
  } catch(e) { console.log('Albums error:', e.message); }
  
  await browser.close();
  
  fs.writeFileSync(path.join(__dirname, '_fb-scraped-data.json'), JSON.stringify(photoData, null, 2));
  console.log(`\n=== Summary ===`);
  console.log(`Downloaded: ${downloaded} photos`);
  console.log(`Total: ${photoData.length} photos`);
  console.log('Data saved to _fb-scraped-data.json');
}

main().catch(e => { console.error('Fatal:', e.message); process.exit(1); });
