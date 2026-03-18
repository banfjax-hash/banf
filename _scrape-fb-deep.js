#!/usr/bin/env node
/**
 * Deep Facebook Album Scraper - downloads ALL photos from ALL albums
 * Scrolls until no new photos load, then visits each photo page for full-size image
 */
const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const GALLERY_DIR = path.join(__dirname, 'docs', 'gallery');
const DATA_FILE = path.join(__dirname, '_fb-deep-scrape-data.json');

// Albums to scrape (from our discovery)
const ALBUMS = [
  { setId: 'a.360315859469978', name: 'Mobile Uploads', count: 1159 },
  { setId: 'a.360315866136644', name: 'Photos', count: 568 },
  { setId: 'a.1180264127475143', name: 'Spandan 2025', count: 357, year: 2025 },
  { setId: 'a.673000554868172', name: 'Anandadhara Returns 2023', count: 105, year: 2023 },
  { setId: 'a.1102569225244634', name: 'Sports Day 2025', count: 58, year: 2025 },
  { setId: 'a.1221583500009872', name: 'Durga Puja 2025', count: 20, year: 2025 },
  { setId: 'a.360315869469977', name: 'Cover Photos', count: 22 },
];

// Skip these albums
const SKIP_ALBUMS = ['Cover Photos'];

async function scrollUntilAllLoaded(page, expectedCount) {
  let prevCount = 0;
  let stableCount = 0;
  const MAX_STABLE = 5; // stop after 5 scrolls with no new photos
  
  while (stableCount < MAX_STABLE) {
    await page.evaluate(() => window.scrollBy(0, 2000));
    await new Promise(r => setTimeout(r, 1500));
    
    const currentCount = await page.evaluate(() => {
      return document.querySelectorAll('a[href*="fbid="]').length;
    });
    
    if (currentCount === prevCount) {
      stableCount++;
    } else {
      stableCount = 0;
    }
    
    prevCount = currentCount;
    
    // Progress
    if (currentCount % 20 === 0 || stableCount > 0) {
      process.stdout.write(`\r    Loaded ${currentCount} photo links (stable: ${stableCount}/${MAX_STABLE})    `);
    }
    
    // Safety: if we have many more than expected, stop
    if (currentCount > expectedCount * 1.2 + 50) break;
  }
  
  console.log('');
  return prevCount;
}

async function getPhotoLinksFromAlbum(page, album) {
  const url = `https://www.facebook.com/media/set/?set=${album.setId}&type=3`;
  console.log(`\n  Loading: ${url}`);
  
  await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
  
  console.log(`  Scrolling to load all ${album.count} photos...`);
  await scrollUntilAllLoaded(page, album.count);
  
  // Extract all unique fbids
  const fbids = await page.evaluate(() => {
    const links = document.querySelectorAll('a[href*="fbid="]');
    const ids = new Set();
    links.forEach(a => {
      const m = a.href.match(/fbid=(\d+)/);
      if (m) ids.add(m[1]);
    });
    return [...ids];
  });
  
  console.log(`  Found ${fbids.length} unique photos in "${album.name}"`);
  return fbids;
}

async function downloadPhoto(browser, fbid, filename, retries = 2) {
  const filepath = path.join(GALLERY_DIR, filename);
  if (fs.existsSync(filepath)) return { status: 'exists', file: filename };
  
  for (let attempt = 0; attempt <= retries; attempt++) {
    let photoPage;
    try {
      photoPage = await browser.newPage();
      await photoPage.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
      
      // Collect large images from network
      const largeImages = [];
      photoPage.on('response', async (resp) => {
        try {
          const url = resp.url();
          if (url.includes('scontent') && resp.status() === 200) {
            const ct = resp.headers()['content-type'] || '';
            const cl = parseInt(resp.headers()['content-length'] || '0');
            if (ct.includes('image') && cl > 30000) {
              largeImages.push({ url, size: cl });
            }
          }
        } catch {}
      });
      
      await photoPage.goto(`https://www.facebook.com/photo/?fbid=${fbid}`, {
        waitUntil: 'networkidle2', timeout: 20000
      });
      
      // Get the best image
      let bestUrl = null;
      let alt = '';
      
      if (largeImages.length > 0) {
        largeImages.sort((a, b) => b.size - a.size);
        bestUrl = largeImages[0].url;
      }
      
      // Also check DOM
      const domInfo = await photoPage.evaluate(() => {
        const imgs = Array.from(document.querySelectorAll('img[src*="scontent"]'));
        imgs.sort((a, b) => {
          const aS = (a.naturalWidth || 0) * (a.naturalHeight || 0);
          const bS = (b.naturalWidth || 0) * (b.naturalHeight || 0);
          return bS - aS;
        });
        return imgs[0] ? { src: imgs[0].src, alt: imgs[0].alt || '' } : null;
      });
      
      if (!bestUrl && domInfo) bestUrl = domInfo.src;
      alt = domInfo?.alt || '';
      
      if (bestUrl) {
        const imgPage = await browser.newPage();
        try {
          const resp = await imgPage.goto(bestUrl, { timeout: 15000 });
          if (resp && resp.ok()) {
            const buf = await resp.buffer();
            if (buf.length > 5000) {
              fs.writeFileSync(filepath, buf);
              await imgPage.close();
              await photoPage.close();
              return { status: 'downloaded', file: filename, size: buf.length, alt };
            }
          }
        } finally {
          try { await imgPage.close(); } catch {}
        }
      }
      
      await photoPage.close();
      
      if (attempt < retries) {
        await new Promise(r => setTimeout(r, 2000));
      }
    } catch (e) {
      try { if (photoPage) await photoPage.close(); } catch {}
      if (attempt === retries) {
        return { status: 'error', file: filename, error: e.message.substring(0, 60) };
      }
      await new Promise(r => setTimeout(r, 3000));
    }
  }
  return { status: 'failed', file: filename };
}

async function main() {
  console.log('=== BANF Deep Facebook Album Downloader ===');
  console.log(`Target: ${ALBUMS.filter(a => !SKIP_ALBUMS.includes(a.name)).reduce((s, a) => s + a.count, 0)} photos across ${ALBUMS.length - SKIP_ALBUMS.length} albums\n`);
  
  if (!fs.existsSync(GALLERY_DIR)) fs.mkdirSync(GALLERY_DIR, { recursive: true });
  
  // Load existing progress
  let progress = {};
  try { progress = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')); } catch {}
  
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  });
  
  const mainPage = await browser.newPage();
  await mainPage.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
  await mainPage.setViewport({ width: 1440, height: 900 });
  
  let totalDownloaded = 0;
  let totalSkipped = 0;
  let totalErrors = 0;
  
  for (const album of ALBUMS) {
    if (SKIP_ALBUMS.includes(album.name)) {
      console.log(`\n=== Skipping: ${album.name} ===`);
      continue;
    }
    
    console.log(`\n${'='.repeat(60)}`);
    console.log(`Album: ${album.name} (expected ~${album.count} photos)`);
    console.log('='.repeat(60));
    
    // Get all photo links
    const fbids = await getPhotoLinksFromAlbum(mainPage, album);
    
    // Determine filename prefix based on album
    let prefix;
    if (album.name === 'Mobile Uploads' || album.name === 'Photos') {
      prefix = 'fb-misc';
    } else {
      prefix = album.name.toLowerCase().replace(/\s+/g, '-');
    }
    
    // Download each photo
    let albumDownloaded = 0;
    let albumSkipped = 0;
    let albumErrors = 0;
    
    for (let i = 0; i < fbids.length; i++) {
      const fbid = fbids[i];
      const filename = `${prefix}-${fbid}.jpg`;
      
      // Check if already in progress data
      if (progress[fbid] && progress[fbid].status === 'downloaded') {
        albumSkipped++;
        totalSkipped++;
        continue;
      }
      
      process.stdout.write(`  [${i + 1}/${fbids.length}] ${fbid}...`);
      
      const result = await downloadPhoto(browser, fbid, filename);
      progress[fbid] = { ...result, album: album.name, year: album.year };
      
      if (result.status === 'downloaded') {
        console.log(` OK (${(result.size / 1024).toFixed(0)}KB)`);
        albumDownloaded++;
        totalDownloaded++;
      } else if (result.status === 'exists') {
        console.log(' exists');
        albumSkipped++;
        totalSkipped++;
      } else {
        console.log(` ${result.status}: ${result.error || ''}`);
        albumErrors++;
        totalErrors++;
      }
      
      // Save progress every 10 photos
      if ((i + 1) % 10 === 0) {
        fs.writeFileSync(DATA_FILE, JSON.stringify(progress, null, 2));
      }
      
      // Rate limit
      await new Promise(r => setTimeout(r, 500));
    }
    
    console.log(`\n  Album "${album.name}" complete: ${albumDownloaded} new, ${albumSkipped} skipped, ${albumErrors} errors`);
    
    // Save after each album
    fs.writeFileSync(DATA_FILE, JSON.stringify(progress, null, 2));
  }
  
  await browser.close();
  
  // Final save
  fs.writeFileSync(DATA_FILE, JSON.stringify(progress, null, 2));
  
  console.log('\n' + '='.repeat(60));
  console.log('=== FINAL SUMMARY ===');
  console.log(`Downloaded: ${totalDownloaded}`);
  console.log(`Skipped (existing): ${totalSkipped}`);
  console.log(`Errors: ${totalErrors}`);
  console.log(`Progress saved to: ${DATA_FILE}`);
  
  // Count files in gallery
  const galleryFiles = fs.readdirSync(GALLERY_DIR).filter(f => f.endsWith('.jpg'));
  const totalSize = galleryFiles.reduce((s, f) => s + fs.statSync(path.join(GALLERY_DIR, f)).size, 0);
  console.log(`\nGallery: ${galleryFiles.length} photos (${(totalSize / 1024 / 1024).toFixed(1)}MB)`);
}

main().catch(e => { console.error('Fatal:', e.message); process.exit(1); });
