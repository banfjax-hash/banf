const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const GALLERY_DIR = path.join(__dirname, 'docs', 'gallery');

async function main() {
  console.log('=== BANF Facebook Full-Size Photo Downloader ===\n');
  
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
  await page.setViewport({ width: 1440, height: 900 });
  
  console.log('Loading Facebook photos page...');
  await page.goto('https://www.facebook.com/banfofficial/photos/', {
    waitUntil: 'networkidle2', timeout: 30000
  });
  
  // Get all photo links (they link to individual photo pages)
  const photoLinks = await page.evaluate(() => {
    const links = document.querySelectorAll('a[href*="/photo"]');
    return [...new Set(Array.from(links).map(a => a.href))].filter(h => h.includes('photo'));
  });
  
  console.log(`Found ${photoLinks.length} photo links\n`);
  
  // Visit each photo page to get the full-size image
  let downloaded = 0;
  const photoData = [];
  
  for (let i = 0; i < photoLinks.length; i++) {
    const link = photoLinks[i];
    console.log(`\nPhoto ${i+1}/${photoLinks.length}: ${link.substring(0, 80)}`);
    
    try {
      const photoPage = await browser.newPage();
      await photoPage.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
      
      // Collect large images loaded on this page
      const largeImages = [];
      photoPage.on('response', async (resp) => {
        const url = resp.url();
        if (url.includes('scontent') && resp.status() === 200) {
          const ct = resp.headers()['content-type'] || '';
          const cl = parseInt(resp.headers()['content-length'] || '0');
          if (ct.includes('image') && cl > 30000) {
            largeImages.push({ url, size: cl });
          }
        }
      });
      
      await photoPage.goto(link, { waitUntil: 'networkidle2', timeout: 20000 });
      
      // Also get the biggest img from DOM
      const domImg = await photoPage.evaluate(() => {
        const imgs = Array.from(document.querySelectorAll('img[src*="scontent"]'));
        // Sort by dimensions
        imgs.sort((a, b) => {
          const aSize = (a.naturalWidth || a.width) * (a.naturalHeight || a.height);
          const bSize = (b.naturalWidth || b.width) * (b.naturalHeight || b.height);
          return bSize - aSize;
        });
        if (imgs.length === 0) return null;
        return { src: imgs[0].src, alt: imgs[0].alt || '', w: imgs[0].naturalWidth, h: imgs[0].naturalHeight };
      });
      
      // Choose the best image: largest from network intercept or DOM
      let bestUrl = null;
      let bestAlt = '';
      
      if (largeImages.length > 0) {
        largeImages.sort((a, b) => b.size - a.size);
        bestUrl = largeImages[0].url;
        bestAlt = domImg?.alt || '';
        console.log(`  Network: found ${largeImages.length} large images, best ${(largeImages[0].size/1024).toFixed(0)}KB`);
      } else if (domImg) {
        bestUrl = domImg.src;
        bestAlt = domImg.alt;
        console.log(`  DOM only: ${domImg.w}x${domImg.h}`);
      }
      
      if (bestUrl) {
        const filename = `fb-full-${String(i + 1).padStart(3, '0')}.jpg`;
        const filepath = path.join(GALLERY_DIR, filename);
        
        // Download the image
        const imgPage = await browser.newPage();
        const resp = await imgPage.goto(bestUrl, { timeout: 15000 });
        if (resp && resp.ok()) {
          const buf = await resp.buffer();
          if (buf.length > 10000) {
            fs.writeFileSync(filepath, buf);
            console.log(`  Saved: ${filename} (${(buf.length/1024).toFixed(0)}KB) ${bestAlt.substring(0,60)}`);
            photoData.push({ file: filename, alt: bestAlt, size: buf.length });
            downloaded++;
          }
        }
        await imgPage.close();
      }
      
      await photoPage.close();
    } catch(e) {
      console.log(`  Error: ${e.message.substring(0, 80)}`);
    }
    
    await new Promise(r => setTimeout(r, 1000));
  }
  
  await browser.close();
  
  fs.writeFileSync(path.join(__dirname, '_fb-fullsize-data.json'), JSON.stringify(photoData, null, 2));
  console.log(`\n=== Summary ===`);
  console.log(`Downloaded: ${downloaded} full-size photos`);
}

main().catch(e => { console.error('Fatal:', e.message); process.exit(1); });
