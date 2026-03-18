const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const GALLERY_DIR = path.join(__dirname, 'docs', 'gallery');

async function main() {
  console.log('=== BANF Instagram Photo Scraper (Puppeteer) ===\n');
  
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
  await page.setViewport({ width: 1280, height: 900 });
  
  const imageUrls = new Set();
  page.on('response', async (response) => {
    const url = response.url();
    if ((url.includes('cdninstagram') || url.includes('fbcdn')) && response.status() === 200) {
      const ct = response.headers()['content-type'] || '';
      if (ct.includes('image')) {
        imageUrls.add(url);
      }
    }
  });
  
  console.log('Loading Instagram profile...');
  await page.goto('https://www.instagram.com/banf_jax/', { 
    waitUntil: 'networkidle2', 
    timeout: 30000 
  });
  
  // Check if login wall
  const bodyText = await page.evaluate(() => document.body.innerText.substring(0, 500));
  console.log('Page text preview:', bodyText.substring(0, 200));
  
  // Scroll to load more
  console.log('\nScrolling...');
  for (let i = 0; i < 8; i++) {
    await page.evaluate(() => window.scrollBy(0, 800));
    await new Promise(r => setTimeout(r, 2000));
    console.log(`  Scroll ${i+1}/8 - images: ${imageUrls.size}`);
  }
  
  const domImages = await page.evaluate(() => {
    const imgs = document.querySelectorAll('img[src*="cdninstagram"], img[src*="fbcdn"]');
    return Array.from(imgs).map(img => ({
      src: img.src,
      width: img.naturalWidth || img.width,
      height: img.naturalHeight || img.height,
      alt: img.alt || ''
    }));
  });
  
  console.log(`\nDOM images: ${domImages.length}`);
  console.log(`Network images: ${imageUrls.size}`);
  
  // Also try the JSON data embedded in the page
  const jsonData = await page.evaluate(() => {
    const scripts = document.querySelectorAll('script[type="application/ld+json"]');
    return Array.from(scripts).map(s => s.textContent);
  });
  console.log(`JSON-LD scripts: ${jsonData.length}`);
  
  // Collect all unique photos
  const allPhotos = [];
  const seenBases = new Set();
  
  for (const img of domImages) {
    const base = img.src.split('?')[0];
    if (!seenBases.has(base) && (img.width > 100 || img.src.includes('1080'))) {
      seenBases.add(base);
      allPhotos.push({ url: img.src, alt: img.alt, source: 'dom' });
    }
  }
  
  for (const url of imageUrls) {
    const base = url.split('?')[0];
    if (!seenBases.has(base)) {
      seenBases.add(base);
      allPhotos.push({ url, alt: '', source: 'network' });
    }
  }
  
  console.log(`\nTotal unique photos: ${allPhotos.length}\n`);
  
  if (!fs.existsSync(GALLERY_DIR)) fs.mkdirSync(GALLERY_DIR, { recursive: true });
  
  let downloaded = 0;
  const photoData = [];
  
  for (let i = 0; i < allPhotos.length; i++) {
    const photo = allPhotos[i];
    const filename = `ig-${String(i + 1).padStart(3, '0')}.jpg`;
    const filepath = path.join(GALLERY_DIR, filename);
    
    if (fs.existsSync(filepath)) {
      photoData.push({ file: filename, alt: photo.alt });
      continue;
    }
    
    try {
      const imgPage = await browser.newPage();
      const response = await imgPage.goto(photo.url, { timeout: 15000 });
      
      if (response && response.ok()) {
        const buf = await response.buffer();
        if (buf.length > 5000) {
          fs.writeFileSync(filepath, buf);
          console.log(`  Downloaded: ${filename} (${(buf.length/1024).toFixed(0)}KB) ${photo.alt.substring(0,60)}`);
          photoData.push({ file: filename, alt: photo.alt, size: buf.length });
          downloaded++;
        } else {
          console.log(`  Skip tiny: ${filename} (${buf.length}B)`);
        }
      }
      await imgPage.close();
    } catch(e) {
      console.log(`  Error: ${filename} - ${e.message.substring(0,60)}`);
    }
    
    await new Promise(r => setTimeout(r, 300));
  }
  
  await browser.close();
  
  fs.writeFileSync(path.join(__dirname, '_ig-scraped-data.json'), JSON.stringify(photoData, null, 2));
  console.log(`\n=== Summary ===`);
  console.log(`Downloaded: ${downloaded} photos`);
  console.log(`Total: ${photoData.length} photos`);
}

main().catch(e => { console.error('Fatal:', e.message); process.exit(1); });
