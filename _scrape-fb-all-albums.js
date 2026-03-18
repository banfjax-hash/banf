const fs = require('fs');
const puppeteer = require('puppeteer');
const path = require('path');

const GALLERY_DIR = path.join(__dirname, 'docs', 'gallery');

async function main() {
  console.log('=== Scraping ALL Facebook Albums & Photos ===\n');

  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
  await page.setViewport({ width: 1440, height: 900 });

  // Step 1: Get all album links from the albums page
  console.log('Loading albums page...');
  await page.goto('https://www.facebook.com/banfofficial/photos_albums', {
    waitUntil: 'networkidle2', timeout: 30000
  });

  // Scroll to load all albums
  for (let i = 0; i < 5; i++) {
    await page.evaluate(() => window.scrollBy(0, 800));
    await new Promise(r => setTimeout(r, 1500));
  }

  // Extract album links and cover images
  const albumData = await page.evaluate(() => {
    const links = Array.from(document.querySelectorAll('a[href*="/media/set"]'));
    const albums = links.map(a => ({
      url: a.href,
      text: a.innerText.trim().substring(0, 100)
    }));
    // Also get any links with "album" in them
    const links2 = Array.from(document.querySelectorAll('a[href*="album"]'));
    for (const a of links2) {
      if (!albums.find(x => x.url === a.href)) {
        albums.push({ url: a.href, text: a.innerText.trim().substring(0, 100) });
      }
    }
    return albums;
  });

  console.log(`Found ${albumData.length} album links:`);
  albumData.forEach(a => console.log(`  ${a.text || '(no title)'}: ${a.url.substring(0, 100)}`));

  // Also extract ALL photo links from the albums page itself
  const photoLinksFromAlbumsPage = await page.evaluate(() => {
    const links = Array.from(document.querySelectorAll('a[href*="/photo"]'));
    return [...new Set(links.map(a => a.href))];
  });
  console.log(`\nDirect photo links on albums page: ${photoLinksFromAlbumsPage.length}`);

  // Step 2: Visit each album to get individual photos
  const allPhotoLinks = new Set(photoLinksFromAlbumsPage);
  
  for (const album of albumData) {
    if (!album.url.includes('media/set') && !album.url.includes('album')) continue;
    console.log(`\n--- Album: ${album.text || album.url.substring(0, 60)} ---`);
    try {
      await page.goto(album.url, { waitUntil: 'networkidle2', timeout: 20000 });
      // Scroll to load all photos in this album
      for (let i = 0; i < 10; i++) {
        await page.evaluate(() => window.scrollBy(0, 1000));
        await new Promise(r => setTimeout(r, 1500));
      }
      const links = await page.evaluate(() => {
        return [...new Set(Array.from(document.querySelectorAll('a[href*="/photo"]')).map(a => a.href))];
      });
      console.log(`  Photos in album: ${links.length}`);
      links.forEach(l => allPhotoLinks.add(l));
    } catch (e) {
      console.log(`  Error: ${e.message.substring(0, 60)}`);
    }
  }

  console.log(`\n=== Total unique photo links: ${allPhotoLinks.size} ===\n`);

  // Step 3: Visit each individual photo page to get full-size images
  if (!fs.existsSync(GALLERY_DIR)) fs.mkdirSync(GALLERY_DIR, { recursive: true });
  
  const photoLinks = [...allPhotoLinks].filter(l => l.includes('fbid=') || l.includes('photo.php'));
  console.log(`Downloadable photo pages: ${photoLinks.length}\n`);
  
  let downloaded = 0;
  const photoData = [];
  
  // Track existing fb-full files to avoid re-downloading
  const existing = new Set(fs.readdirSync(GALLERY_DIR).filter(f => f.startsWith('fb-full-')));

  for (let i = 0; i < photoLinks.length; i++) {
    const link = photoLinks[i];
    // Extract fbid for dedup
    const fbidMatch = link.match(/fbid=(\d+)/);
    const fbid = fbidMatch ? fbidMatch[1] : `unknown-${i}`;
    const filename = `fb-full-${fbid}.jpg`;
    
    if (existing.has(filename)) {
      console.log(`  [${i+1}/${photoLinks.length}] Skip (exists): ${filename}`);
      const stat = fs.statSync(path.join(GALLERY_DIR, filename));
      photoData.push({ file: filename, fbid, size: stat.size });
      continue;
    }

    console.log(`  [${i+1}/${photoLinks.length}] ${link.substring(0, 80)}...`);
    
    try {
      const photoPage = await browser.newPage();
      await photoPage.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
      
      // Collect large images
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
      
      // Get alt text from DOM
      const domInfo = await photoPage.evaluate(() => {
        const imgs = Array.from(document.querySelectorAll('img[src*="scontent"]'));
        imgs.sort((a, b) => {
          const aS = (a.naturalWidth || a.width) * (a.naturalHeight || a.height);
          const bS = (b.naturalWidth || b.width) * (b.naturalHeight || b.height);
          return bS - aS;
        });
        return imgs[0] ? { src: imgs[0].src, alt: imgs[0].alt || '', w: imgs[0].naturalWidth, h: imgs[0].naturalHeight } : null;
      });
      
      // Pick largest image
      let bestUrl = null;
      if (largeImages.length > 0) {
        largeImages.sort((a, b) => b.size - a.size);
        bestUrl = largeImages[0].url;
      } else if (domInfo) {
        bestUrl = domInfo.src;
      }
      
      if (bestUrl) {
        const imgPage = await browser.newPage();
        const resp = await imgPage.goto(bestUrl, { timeout: 15000 });
        if (resp && resp.ok()) {
          const buf = await resp.buffer();
          if (buf.length > 10000) {
            fs.writeFileSync(path.join(GALLERY_DIR, filename), buf);
            console.log(`    Saved: ${filename} (${(buf.length/1024).toFixed(0)}KB) ${(domInfo?.alt||'').substring(0,50)}`);
            photoData.push({ file: filename, fbid, alt: domInfo?.alt || '', size: buf.length });
            downloaded++;
          }
        }
        await imgPage.close();
      }
      
      await photoPage.close();
    } catch(e) {
      console.log(`    Error: ${e.message.substring(0, 60)}`);
    }
    
    await new Promise(r => setTimeout(r, 800));
  }
  
  await browser.close();
  
  // Save results
  fs.writeFileSync('_fb-all-photos-data.json', JSON.stringify(photoData, null, 2));
  console.log(`\n=== Summary ===`);
  console.log(`Total photo pages found: ${photoLinks.length}`);
  console.log(`New downloads: ${downloaded}`);
  console.log(`Data saved to _fb-all-photos-data.json`);
}

main().catch(e => { console.error('Fatal:', e.message); process.exit(1); });
