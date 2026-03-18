#!/usr/bin/env node
/**
 * BANF Facebook Album Scraper v3
 * Strategy: Intercept GraphQL/XHR responses during scrolling to capture ALL photo IDs.
 * Facebook loads photos in batches via Relay/GraphQL with cursor pagination.
 * We capture the response payloads which contain photo data.
 */
const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const GALLERY_DIR = path.join(__dirname, 'docs', 'gallery');
const DATA_FILE = path.join(__dirname, '_fb-deep-scrape-data.json');

const ALBUMS = [
  { setId: 'a.1221583500009872', name: 'Durga Puja 2025', count: 20, year: 2025 },
  { setId: 'a.1102569225244634', name: 'Sports Day 2025', count: 58, year: 2025 },
  { setId: 'a.673000554868172', name: 'Anandadhara Returns 2023', count: 105, year: 2023 },
  { setId: 'a.1180264127475143', name: 'Spandan 2025', count: 357, year: 2025 },
  { setId: 'a.360315866136644', name: 'Photos', count: 568 },
  { setId: 'a.360315859469978', name: 'Mobile Uploads', count: 1159 },
];

function loadProgress() {
  try { return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')); } catch { return {}; }
}
function saveProgress(p) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(p, null, 2));
}

/**
 * Intercept network responses to collect photo IDs from GraphQL/XHR.
 * Returns a Set that accumulates IDs over time.
 */
function setupPhotoIdCollector(page) {
  const collectedIds = new Set();
  
  page.on('response', async (response) => {
    try {
      const url = response.url();
      const ct = response.headers()['content-type'] || '';
      
      // Only process JSON/graphql responses
      if (!ct.includes('json') && !ct.includes('javascript') && !url.includes('graphql')) return;
      if (response.status() !== 200) return;
      
      const text = await response.text();
      
      // Extract photo IDs from response text using multiple patterns
      // Pattern 1: "fbid" in various contexts
      const fbidMatches = text.matchAll(/fbid[=:](\d{10,20})/g);
      for (const m of fbidMatches) collectedIds.add(m[1]);
      
      // Pattern 2: photo nodes in GraphQL responses {"id":"XXXXX",..."__typename":"Photo"}
      const photoNodeMatches = text.matchAll(/"id":"(\d{10,20})"[^}]*?"__typename":"Photo"/g);
      for (const m of photoNodeMatches) collectedIds.add(m[1]);
      
      // Pattern 3: Reverse pattern
      const photoNode2 = text.matchAll(/"__typename":"Photo"[^}]*?"id":"(\d{10,20})"/g);
      for (const m of photoNode2) collectedIds.add(m[1]);
      
      // Pattern 4: photo_id fields
      const photoIdMatches = text.matchAll(/photo_id['":\s]+['"]?(\d{10,20})/g);
      for (const m of photoIdMatches) collectedIds.add(m[1]);
      
      // Pattern 5: In media set context, match node IDs that appear near image URLs
      const nodeIdMatches = text.matchAll(/"node":\{"id":"(\d{10,20})"/g);
      for (const m of nodeIdMatches) collectedIds.add(m[1]);
      
    } catch {
      // Response might be disposed or not available
    }
  });
  
  return collectedIds;
}

/**
 * Aggressive scroll to trigger all lazy-loaded content and GraphQL fetches.
 * Much more aggressive than v1: scrolls faster, longer, with different patterns.
 */
async function aggressiveScroll(page, collectedIds, expectedCount) {
  let prevSize = collectedIds.size;
  let stableRounds = 0;
  const MAX_STABLE = 8; // Higher threshold before giving up
  
  // Phase 1: Rapid scrolls
  console.log('  Phase 1: Rapid scrolling...');
  for (let i = 0; i < 200; i++) {
    await page.evaluate(() => window.scrollBy(0, 3000));
    await new Promise(r => setTimeout(r, 300));
    
    if (i % 10 === 9) {
      // Also check DOM for any new fbid links
      const domIds = await page.evaluate(() => {
        const ids = [];
        document.querySelectorAll('a[href*="fbid="]').forEach(a => {
          const m = a.href.match(/fbid=(\d+)/);
          if (m) ids.push(m[1]);
        });
        // Also check image elements for IDs in their data attributes
        document.querySelectorAll('img[data-imgperflogname]').forEach(img => {
          const src = img.src || '';
          const m = src.match(/\/(\d{10,20})_/);
          if (m) ids.push(m[1]);
        });
        return ids;
      });
      for (const id of domIds) collectedIds.add(id);
      
      const currentSize = collectedIds.size;
      process.stdout.write(`\r  Scroll ${i + 1}: ${currentSize} photos collected (stable: ${stableRounds}/${MAX_STABLE})    `);
      
      if (currentSize === prevSize) {
        stableRounds++;
        if (stableRounds >= MAX_STABLE) {
          console.log('\n  Scroll stabilized.');
          break;
        }
      } else {
        stableRounds = 0;
        prevSize = currentSize;
      }
    }
    
    // If we have enough, stop early
    if (collectedIds.size >= expectedCount * 0.95) {
      console.log(`\n  Reached ${collectedIds.size}/${expectedCount} expected photos.`);
      break;
    }
  }
  
  // Phase 2: Scroll back to top and down again (triggers FB to load missed items)
  if (collectedIds.size < expectedCount * 0.5) {
    console.log('\n  Phase 2: Re-scroll from top...');
    await page.evaluate(() => window.scrollTo(0, 0));
    await new Promise(r => setTimeout(r, 2000));
    
    for (let i = 0; i < 100; i++) {
      await page.evaluate(() => window.scrollBy(0, 1500));
      await new Promise(r => setTimeout(r, 500));
      
      if (i % 10 === 9) {
        const domIds = await page.evaluate(() => {
          const ids = [];
          document.querySelectorAll('a[href*="fbid="]').forEach(a => {
            const m = a.href.match(/fbid=(\d+)/);
            if (m) ids.push(m[1]);
          });
          return ids;
        });
        for (const id of domIds) collectedIds.add(id);
        process.stdout.write(`\r  Re-scroll ${i + 1}: ${collectedIds.size} photos    `);
      }
    }
  }
  
  console.log('');
}

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
        waitUntil: 'networkidle2', timeout: 25000
      });
      
      await new Promise(r => setTimeout(r, 2000));
      
      let bestUrl = null, alt = '';
      if (largeImages.length > 0) {
        largeImages.sort((a, b) => b.size - a.size);
        bestUrl = largeImages[0].url;
      }
      
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
  console.log('=== BANF Facebook Album Scraper v3 (GraphQL Intercept) ===\n');
  if (!fs.existsSync(GALLERY_DIR)) fs.mkdirSync(GALLERY_DIR, { recursive: true });
  
  let progress = loadProgress();
  
  const browser = await puppeteer.launch({
    headless: false,
    args: ['--no-sandbox', '--start-maximized'],
    defaultViewport: null,
  });
  
  const mainPage = await browser.newPage();
  await mainPage.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36');
  await mainPage.setViewport({ width: 1440, height: 900 });
  
  let totalDownloaded = 0, totalSkipped = 0, totalErrors = 0;
  
  for (const album of ALBUMS) {
    console.log('='.repeat(60));
    console.log(`Album: ${album.name} (expected ~${album.count})`);
    console.log('='.repeat(60));
    
    // Set up photo ID collector (intercepts GraphQL responses)
    const collectedIds = setupPhotoIdCollector(mainPage);
    
    // Navigate to album
    const albumUrl = `https://www.facebook.com/media/set/?set=${album.setId}&type=3`;
    console.log(`  Loading: ${albumUrl}`);
    await mainPage.goto(albumUrl, { waitUntil: 'networkidle2', timeout: 30000 });
    await new Promise(r => setTimeout(r, 3000));
    
    // Also extract IDs from initial DOM
    const domIds = await mainPage.evaluate(() => {
      const ids = [];
      document.querySelectorAll('a[href*="fbid="]').forEach(a => {
        const m = a.href.match(/fbid=(\d+)/);
        if (m) ids.push(m[1]);
      });
      return ids;
    });
    for (const id of domIds) collectedIds.add(id);
    console.log(`  Initial DOM: ${domIds.length} fbid links, total collected: ${collectedIds.size}`);
    
    // Aggressive scroll to trigger loading
    await aggressiveScroll(mainPage, collectedIds, album.count);
    
    // Filter out known non-photo IDs (page IDs, user IDs, etc.)
    // Photo IDs for this page are typically in a specific range - we'll filter during download
    const fbids = [...collectedIds];
    console.log(`  Total unique IDs collected: ${fbids.length}`);
    
    // Determine filename prefix
    let prefix;
    if (album.name === 'Mobile Uploads' || album.name === 'Photos') {
      prefix = 'fb-misc';
    } else {
      prefix = album.name.toLowerCase().replace(/\s+/g, '-');
    }
    
    // Download
    let albumDl = 0, albumSkip = 0, albumErr = 0;
    
    for (let i = 0; i < fbids.length; i++) {
      const fbid = fbids[i];
      const filename = `${prefix}-${fbid}.jpg`;
      
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
      
      if ((i + 1) % 10 === 0) saveProgress(progress);
      await new Promise(r => setTimeout(r, 400));
    }
    
    saveProgress(progress);
    console.log(`\n  "${album.name}": ${albumDl} downloaded, ${albumSkip} skipped, ${albumErr} errors\n`);
  }
  
  await browser.close();
  saveProgress(progress);
  
  console.log('='.repeat(60));
  console.log('=== FINAL SUMMARY ===');
  console.log(`Downloaded: ${totalDownloaded}, Skipped: ${totalSkipped}, Errors: ${totalErrors}`);
  
  const files = fs.readdirSync(GALLERY_DIR).filter(f => f.endsWith('.jpg'));
  const sz = files.reduce((s, f) => s + fs.statSync(path.join(GALLERY_DIR, f)).size, 0);
  console.log(`Gallery: ${files.length} photos (${(sz / 1024 / 1024).toFixed(1)}MB)`);
}

main().catch(e => { console.error('Fatal:', e.message); process.exit(1); });
