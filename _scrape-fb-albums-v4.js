#!/usr/bin/env node
/**
 * BANF FB Album Scraper v4 - Photo Viewer Navigation
 * Instead of scrolling album grid (which FB blocks for bots),
 * opens the first photo then clicks Next to navigate through ALL photos.
 * This mimics how a human would browse an album.
 */
const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const GALLERY_DIR = path.join(__dirname, 'docs', 'gallery');
const DATA_FILE = path.join(__dirname, '_fb-deep-scrape-data.json');

// Each album: first photo fbid (from what we already know) + set ID
const ALBUMS = [
  { 
    name: 'Durga Puja 2025', year: 2025, count: 20,
    // First photo in the set - we'll navigate to it via album URL
    setId: 'a.1221583500009872',
  },
  { 
    name: 'Sports Day 2025', year: 2025, count: 58,
    setId: 'a.1102569225244634',
  },
  { 
    name: 'Anandadhara Returns 2023', year: 2023, count: 105,
    setId: 'a.673000554868172',
  },
  { 
    name: 'Spandan 2025', year: 2025, count: 357,
    setId: 'a.1180264127475143',
  },
  { 
    name: 'Photos', count: 568,
    setId: 'a.360315866136644',
  },
  { 
    name: 'Mobile Uploads', count: 1159,
    setId: 'a.360315859469978',
  },
];

function loadProgress() {
  try { return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')); } catch { return {}; }
}
function saveProgress(p) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(p, null, 2));
}

async function downloadPhotoFromViewer(page, fbid, filename) {
  const filepath = path.join(GALLERY_DIR, filename);
  if (fs.existsSync(filepath) && fs.statSync(filepath).size > 5000) {
    return { status: 'exists' };
  }
  
  // Get the largest image from the current photo viewer page
  const imgInfo = await page.evaluate(() => {
    const imgs = Array.from(document.querySelectorAll('img[src*="scontent"]'));
    // Sort by natural dimensions (largest first)
    imgs.sort((a, b) => {
      const aS = (a.naturalWidth || 0) * (a.naturalHeight || 0);
      const bS = (b.naturalWidth || 0) * (b.naturalHeight || 0);
      return bS - aS;
    });
    if (imgs[0]) {
      return { src: imgs[0].src, alt: imgs[0].alt || '', w: imgs[0].naturalWidth, h: imgs[0].naturalHeight };
    }
    return null;
  });
  
  if (!imgInfo || !imgInfo.src) {
    return { status: 'no-image' };
  }
  
  // Download via a new page (to include cookies)
  const browser = page.browser();
  const dlPage = await browser.newPage();
  try {
    const resp = await dlPage.goto(imgInfo.src, { timeout: 15000 });
    if (resp && resp.ok()) {
      const buf = await resp.buffer();
      if (buf.length > 5000) {
        fs.writeFileSync(filepath, buf);
        await dlPage.close();
        return { status: 'downloaded', size: buf.length, alt: imgInfo.alt };
      }
    }
  } catch (e) {
    try { await dlPage.close(); } catch {}
    return { status: 'error', error: e.message.substring(0, 60) };
  }
  try { await dlPage.close(); } catch {}
  return { status: 'failed' };
}

/**
 * Navigate an album by clicking through photos one by one.
 * Opens album grid, clicks first photo, then uses Next arrow.
 */
async function scrapeAlbumViaNavigation(browser, album, progress) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Album: ${album.name} (expected ~${album.count})`);
  console.log('='.repeat(60));
  
  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36');
  await page.setViewport({ width: 1440, height: 900 });
  
  // Intercept network for largest images
  const networkImages = new Map(); // url -> size
  page.on('response', async (resp) => {
    try {
      const url = resp.url();
      if (url.includes('scontent') && resp.status() === 200) {
        const cl = parseInt(resp.headers()['content-length'] || '0');
        const ct = resp.headers()['content-type'] || '';
        if (ct.includes('image') && cl > 30000) {
          networkImages.set(url, cl);
        }
      }
    } catch {}
  });
  
  // Load album page
  const albumUrl = `https://www.facebook.com/media/set/?set=${album.setId}&type=3`;
  console.log(`  Loading album: ${albumUrl}`);
  await page.goto(albumUrl, { waitUntil: 'networkidle2', timeout: 30000 });
  await new Promise(r => setTimeout(r, 3000));
  
  // Find and click the first photo link
  const firstPhotoClicked = await page.evaluate(() => {
    const links = document.querySelectorAll('a[href*="fbid="]');
    if (links.length > 0) {
      // Find the first non-profile photo link
      for (const link of links) {
        const href = link.href;
        if (href.includes('fbid=') && !href.includes('profile')) {
          link.click();
          return true;
        }
      }
      links[0].click();
      return true;
    }
    return false;
  });
  
  if (!firstPhotoClicked) {
    console.log('  ERROR: Could not find first photo link!');
    await page.close();
    return { downloaded: 0, skipped: 0, errors: 0 };
  }
  
  // Wait for photo viewer to load
  await new Promise(r => setTimeout(r, 4000));
  
  let prefix = album.name === 'Mobile Uploads' || album.name === 'Photos'
    ? 'fb-misc'
    : album.name.toLowerCase().replace(/\s+/g, '-');
  
  let downloaded = 0, skipped = 0, errors = 0;
  const seenFbids = new Set();
  let consecutiveExisting = 0;
  let noNavCount = 0;
  
  for (let i = 0; i < album.count + 20; i++) {
    // Extract current photo's fbid from URL
    const currentUrl = page.url();
    const fbidMatch = currentUrl.match(/fbid=(\d+)/);
    
    if (!fbidMatch) {
      console.log(`  [${i + 1}] No fbid in URL: ${currentUrl.substring(0, 80)}`);
      noNavCount++;
      if (noNavCount > 3) break;
      // Try clicking next anyway
      await tryClickNext(page);
      await new Promise(r => setTimeout(r, 2000));
      continue;
    }
    
    const fbid = fbidMatch[1];
    
    // Detect loop (we've seen this photo before = album wrapped around)
    if (seenFbids.has(fbid)) {
      console.log(`  [${i + 1}] Already seen fbid ${fbid} - album complete!`);
      break;
    }
    seenFbids.add(fbid);
    
    const filename = `${prefix}-${fbid}.jpg`;
    process.stdout.write(`  [${i + 1}] ${fbid}...`);
    
    // Check if already downloaded
    if (progress[fbid]?.status === 'downloaded') {
      const fp = path.join(GALLERY_DIR, filename);
      if (fs.existsSync(fp) && fs.statSync(fp).size > 5000) {
        console.log(' exists');
        skipped++;
        consecutiveExisting++;
      } else {
        // Re-download
        const result = await downloadPhotoFromViewer(page, fbid, filename);
        progress[fbid] = { ...result, file: filename, album: album.name, year: album.year };
        if (result.status === 'downloaded') {
          console.log(` OK (${(result.size / 1024).toFixed(0)}KB)`);
          downloaded++;
        } else {
          console.log(` ${result.status}`);
          errors++;
        }
      }
    } else {
      const result = await downloadPhotoFromViewer(page, fbid, filename);
      progress[fbid] = { ...result, file: filename, album: album.name, year: album.year };
      
      if (result.status === 'downloaded') {
        console.log(` OK (${(result.size / 1024).toFixed(0)}KB)`);
        downloaded++;
        consecutiveExisting = 0;
      } else if (result.status === 'exists') {
        console.log(' exists');
        skipped++;
        consecutiveExisting++;
      } else {
        console.log(` ${result.status}: ${result.error || ''}`);
        errors++;
        consecutiveExisting = 0;
      }
    }
    
    // Save every 10
    if ((i + 1) % 10 === 0) {
      saveProgress(progress);
      console.log(`  --- Progress: ${downloaded} new, ${skipped} existing, ${errors} errors ---`);
    }
    
    // Click Next arrow to go to next photo
    const navigated = await tryClickNext(page);
    if (!navigated) {
      console.log(`  Could not find Next button - album may be complete.`);
      // Try again
      await new Promise(r => setTimeout(r, 2000));
      const retry = await tryClickNext(page);
      if (!retry) {
        console.log(`  Confirmed: no Next button. Album done.`);
        break;
      }
    }
    
    // Wait for next photo to load
    await new Promise(r => setTimeout(r, 1500));
    
    // Wait for URL to change (indicates navigation happened)
    const newUrl = page.url();
    const newFbid = newUrl.match(/fbid=(\d+)/);
    if (newFbid && newFbid[1] === fbid) {
      // URL didn't change yet, wait more
      await new Promise(r => setTimeout(r, 2000));
    }
  }
  
  saveProgress(progress);
  await page.close();
  
  console.log(`\n  "${album.name}": ${downloaded} downloaded, ${skipped} skipped, ${errors} errors (${seenFbids.size} total photos found)`);
  return { downloaded, skipped, errors };
}

/**
 * Try to click the Next (right arrow) button in the photo viewer.
 * Returns true if clicked successfully.
 */
async function tryClickNext(page) {
  return await page.evaluate(() => {
    // Strategy 1: Look for right arrow button by aria-label
    const ariaButtons = document.querySelectorAll('[aria-label*="Next"], [aria-label*="next"], [aria-label*="Right"]');
    for (const btn of ariaButtons) {
      if (btn.offsetParent !== null) { // visible
        btn.click();
        return true;
      }
    }
    
    // Strategy 2: Look for SVG right arrow buttons
    const buttons = document.querySelectorAll('div[role="button"]');
    for (const btn of buttons) {
      const rect = btn.getBoundingClientRect();
      // Right side buttons (photo viewers put next on right side)
      if (rect.left > window.innerWidth * 0.6 && rect.width < 100 && rect.height < 100 && rect.height > 20) {
        const svg = btn.querySelector('svg');
        if (svg) {
          btn.click();
          return true;
        }
      }
    }
    
    // Strategy 3: Press right arrow key
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', code: 'ArrowRight', keyCode: 39, bubbles: true }));
    return true; // Can't verify if it worked
  });
}

async function main() {
  console.log('=== BANF FB Album Scraper v4 (Photo Navigation) ===\n');
  if (!fs.existsSync(GALLERY_DIR)) fs.mkdirSync(GALLERY_DIR, { recursive: true });
  
  let progress = loadProgress();
  
  const browser = await puppeteer.launch({
    headless: false,
    args: ['--no-sandbox', '--start-maximized', '--disable-blink-features=AutomationControlled'],
    defaultViewport: null,
  });
  
  // Override navigator.webdriver
  const pages = await browser.pages();
  for (const p of pages) {
    await p.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => false });
    });
  }
  
  let totalDl = 0, totalSkip = 0, totalErr = 0;
  
  for (const album of ALBUMS) {
    const result = await scrapeAlbumViaNavigation(browser, album, progress);
    totalDl += result.downloaded;
    totalSkip += result.skipped;
    totalErr += result.errors;
  }
  
  await browser.close();
  saveProgress(progress);
  
  console.log('\n' + '='.repeat(60));
  console.log('=== FINAL SUMMARY ===');
  console.log(`Downloaded: ${totalDl}, Skipped: ${totalSkip}, Errors: ${totalErr}`);
  
  const files = fs.readdirSync(GALLERY_DIR).filter(f => f.endsWith('.jpg'));
  const sz = files.reduce((s, f) => s + fs.statSync(path.join(GALLERY_DIR, f)).size, 0);
  console.log(`Gallery: ${files.length} photos (${(sz / 1024 / 1024).toFixed(1)}MB)`);
}

main().catch(e => { console.error('Fatal:', e.message); process.exit(1); });
