#!/usr/bin/env node
/**
 * BANF Facebook Album Scraper v2
 * Uses m.facebook.com (mobile) for reliable "See More" pagination
 * instead of the unreliable infinite scroll on desktop.
 * Runs in headed (visible) mode to leverage existing login session.
 */
const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const GALLERY_DIR = path.join(__dirname, 'docs', 'gallery');
const DATA_FILE = path.join(__dirname, '_fb-deep-scrape-data.json');
const LOG_FILE = path.join(__dirname, '_fb-scrape-v2.log');

// Albums: setId stripped of "a." prefix for mobile URLs
const ALBUMS = [
  { setId: '360315859469978', name: 'Mobile Uploads', count: 1159 },
  { setId: '360315866136644', name: 'Photos', count: 568 },
  { setId: '1180264127475143', name: 'Spandan 2025', count: 357, year: 2025 },
  { setId: '673000554868172', name: 'Anandadhara Returns 2023', count: 105, year: 2023 },
  { setId: '1102569225244634', name: 'Sports Day 2025', count: 58, year: 2025 },
  { setId: '1221583500009872', name: 'Durga Puja 2025', count: 20, year: 2025 },
  { setId: '360315876136643', name: 'Profile Pictures', count: 51 },
];

const SKIP_ALBUMS = ['Cover Photos', 'Profile Pictures'];

function log(msg) {
  const line = `[${new Date().toLocaleTimeString()}] ${msg}`;
  console.log(line);
  fs.appendFileSync(LOG_FILE, line + '\n');
}

// Load/save progress
function loadProgress() {
  try { return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')); } catch { return {}; }
}
function saveProgress(progress) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(progress, null, 2));
}

/**
 * Collect all photo fbids from a mobile album page by following "See More" links.
 * m.facebook.com shows ~30 photos per page with a "See More Photos" link.
 */
async function collectAlbumPhotoIds(page, album) {
  const allFbids = new Set();
  let pageNum = 0;
  let url = `https://m.facebook.com/media/set/?set=a.${album.setId}&type=3`;
  
  while (url) {
    pageNum++;
    log(`  Page ${pageNum}: loading... (${allFbids.size} photos collected so far)`);
    
    try {
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    } catch (e) {
      log(`  Page ${pageNum}: navigation timeout, retrying...`);
      try {
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await new Promise(r => setTimeout(r, 3000));
      } catch {
        log(`  Page ${pageNum}: failed to load, stopping.`);
        break;
      }
    }
    
    // Wait a bit for content to settle
    await new Promise(r => setTimeout(r, 1500));
    
    // Extract fbids from this page
    const newFbids = await page.evaluate(() => {
      const ids = new Set();
      // Multiple selectors for different FB mobile layouts
      const selectors = [
        'a[href*="fbid="]',
        'a[href*="/photo.php"]',
        'a[href*="/photo/"]',
        'a[href*="/photos/"]',
      ];
      for (const sel of selectors) {
        document.querySelectorAll(sel).forEach(a => {
          const href = a.href;
          let m = href.match(/fbid=(\d+)/);
          if (!m) m = href.match(/\/photo(?:\.php)?\?.*?fbid=(\d+)/);
          if (!m) m = href.match(/photos\/(\d+)/);
          if (m) ids.add(m[1]);
        });
      }
      return [...ids];
    });
    
    const before = allFbids.size;
    for (const id of newFbids) allFbids.add(id);
    const added = allFbids.size - before;
    log(`  Page ${pageNum}: found ${newFbids.length} links, ${added} new (total: ${allFbids.size})`);
    
    // If no new photos, try scrolling down first
    if (added === 0 && pageNum === 1) {
      log(`  Trying scroll on first page...`);
      for (let i = 0; i < 10; i++) {
        await page.evaluate(() => window.scrollBy(0, 1500));
        await new Promise(r => setTimeout(r, 800));
      }
      const afterScroll = await page.evaluate(() => {
        const ids = new Set();
        document.querySelectorAll('a[href*="fbid="]').forEach(a => {
          const m = a.href.match(/fbid=(\d+)/);
          if (m) ids.add(m[1]);
        });
        return [...ids];
      });
      for (const id of afterScroll) allFbids.add(id);
      log(`  After scroll: ${allFbids.size} total`);
    }
    
    // Look for "See More Photos" or next page link
    url = await page.evaluate(() => {
      // Look for various "see more" patterns
      const links = Array.from(document.querySelectorAll('a'));
      for (const a of links) {
        const text = (a.textContent || '').toLowerCase().trim();
        const href = a.href || '';
        // "See More Photos", "See more", pagination links
        if ((text.includes('see more') || text.includes('more photos') || text.includes('ver más')) 
            && href.includes('facebook.com')) {
          return href;
        }
      }
      // Also look for numbered pagination or "next" links
      for (const a of links) {
        const text = (a.textContent || '').toLowerCase().trim();
        if (text === 'next' || text === 'siguiente') {
          return a.href;
        }
      }
      // Check for links with cursor/after params (FB pagination)
      for (const a of links) {
        const href = a.href || '';
        if (href.includes('set=a.') && (href.includes('after') || href.includes('cursor'))) {
          return href;
        }
      }
      return null;
    });
    
    if (!url) {
      log(`  No more pages found.`);
    }
    
    // Rate limit between pages
    await new Promise(r => setTimeout(r, 1000));
  }
  
  return [...allFbids];
}

/**
 * Download a single full-size photo by visiting its photo page
 */
async function downloadPhoto(browser, fbid, filename, retries = 2) {
  const filepath = path.join(GALLERY_DIR, filename);
  if (fs.existsSync(filepath) && fs.statSync(filepath).size > 5000) {
    return { status: 'exists', file: filename };
  }
  
  for (let attempt = 0; attempt <= retries; attempt++) {
    let photoPage;
    try {
      photoPage = await browser.newPage();
      await photoPage.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36');
      
      // Intercept network responses for large images
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
      
      // Visit the photo page (desktop for full-size)
      await photoPage.goto(`https://www.facebook.com/photo/?fbid=${fbid}`, {
        waitUntil: 'networkidle2', timeout: 25000
      });
      
      // Wait for images to load
      await new Promise(r => setTimeout(r, 2000));
      
      // Get best image URL
      let bestUrl = null;
      let alt = '';
      
      // Best from network intercepts
      if (largeImages.length > 0) {
        largeImages.sort((a, b) => b.size - a.size);
        bestUrl = largeImages[0].url;
      }
      
      // Also check DOM for largest img
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
        // Download the image
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
      if (attempt < retries) await new Promise(r => setTimeout(r, 2000));
    } catch (e) {
      try { if (photoPage) await photoPage.close(); } catch {}
      if (attempt === retries) {
        return { status: 'error', file: filename, error: e.message.substring(0, 80) };
      }
      await new Promise(r => setTimeout(r, 3000));
    }
  }
  return { status: 'failed', file: filename };
}

async function main() {
  log('=== BANF Facebook Album Scraper v2 (Mobile Pagination) ===');
  if (!fs.existsSync(GALLERY_DIR)) fs.mkdirSync(GALLERY_DIR, { recursive: true });
  
  let progress = loadProgress();
  
  // Launch in HEADED mode to leverage login session
  const browser = await puppeteer.launch({
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--start-maximized'],
    defaultViewport: null,
  });
  
  const mainPage = await browser.newPage();
  await mainPage.setUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1');
  await mainPage.setViewport({ width: 430, height: 932 });
  
  // Quick login check
  await mainPage.goto('https://m.facebook.com/banfofficial/', { waitUntil: 'networkidle2', timeout: 30000 });
  await new Promise(r => setTimeout(r, 2000));
  
  const pageTitle = await mainPage.title();
  log(`FB Page title: "${pageTitle}"`);
  
  let totalDownloaded = 0, totalSkipped = 0, totalErrors = 0;
  const allAlbumData = {};
  
  for (const album of ALBUMS) {
    if (SKIP_ALBUMS.includes(album.name)) {
      log(`\nSkipping: ${album.name}`);
      continue;
    }
    
    log(`\n${'='.repeat(60)}`);
    log(`Album: ${album.name} (expected ~${album.count})`);
    log('='.repeat(60));
    
    // Phase 1: Collect all photo IDs via mobile pagination
    const fbids = await collectAlbumPhotoIds(mainPage, album);
    log(`Total photos found in "${album.name}": ${fbids.length}`);
    allAlbumData[album.name] = { fbids, year: album.year };
    
    // Determine filename prefix
    let prefix;
    if (album.name === 'Mobile Uploads' || album.name === 'Photos') {
      prefix = 'fb-misc';
    } else {
      prefix = album.name.toLowerCase().replace(/\s+/g, '-');
    }
    
    // Phase 2: Download each photo (full-size from desktop page)
    let albumDl = 0, albumSkip = 0, albumErr = 0;
    
    for (let i = 0; i < fbids.length; i++) {
      const fbid = fbids[i];
      const filename = `${prefix}-${fbid}.jpg`;
      
      // Skip if already downloaded successfully
      if (progress[fbid]?.status === 'downloaded') {
        const fp = path.join(GALLERY_DIR, filename);
        if (fs.existsSync(fp) && fs.statSync(fp).size > 5000) {
          albumSkip++; totalSkipped++;
          continue;
        }
      }
      
      process.stdout.write(`  [${i + 1}/${fbids.length}] ${fbid}...`);
      
      const result = await downloadPhoto(browser, fbid, filename);
      progress[fbid] = { ...result, album: album.name, year: album.year };
      
      if (result.status === 'downloaded') {
        console.log(` OK (${(result.size / 1024).toFixed(0)}KB)`);
        albumDl++; totalDownloaded++;
      } else if (result.status === 'exists') {
        console.log(' exists');
        albumSkip++; totalSkipped++;
      } else {
        console.log(` ${result.status}: ${result.error || ''}`);
        albumErr++; totalErrors++;
      }
      
      // Save progress every 10
      if ((i + 1) % 10 === 0) saveProgress(progress);
      
      // Rate limit
      await new Promise(r => setTimeout(r, 400));
    }
    
    saveProgress(progress);
    log(`Album "${album.name}" done: ${albumDl} downloaded, ${albumSkip} skipped, ${albumErr} errors`);
  }
  
  await browser.close();
  saveProgress(progress);
  
  // Summary
  log('\n' + '='.repeat(60));
  log('=== FINAL SUMMARY ===');
  log(`Downloaded: ${totalDownloaded}`);
  log(`Skipped: ${totalSkipped}`);
  log(`Errors: ${totalErrors}`);
  
  for (const [name, data] of Object.entries(allAlbumData)) {
    log(`  ${name}: ${data.fbids.length} photos found`);
  }
  
  const files = fs.readdirSync(GALLERY_DIR).filter(f => f.endsWith('.jpg'));
  const sz = files.reduce((s, f) => s + fs.statSync(path.join(GALLERY_DIR, f)).size, 0);
  log(`\nGallery: ${files.length} photos (${(sz / 1024 / 1024).toFixed(1)}MB)`);
}

main().catch(e => { log(`Fatal: ${e.message}`); process.exit(1); });
