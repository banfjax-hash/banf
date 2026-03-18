#!/usr/bin/env node
/**
 * BANF Facebook Album Downloader - Photo Viewer Navigation
 * 
 * Connects to Edge (with your FB credentials) via remote debugging port.
 * For each album: opens the album grid, clicks first photo, then uses
 * "Right Arrow" key to navigate through ALL photos one by one.
 * Downloads the full-size image at each step.
 * 
 * PRE-REQUISITES:
 *   1. Close all Edge windows
 *   2. Launch Edge with: msedge.exe --remote-debugging-port=9222
 *   3. Make sure you're logged into Facebook
 *   4. Run: node _fb-download-all.js
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const GALLERY_DIR = path.join(__dirname, 'docs', 'gallery');
const PROGRESS_FILE = path.join(__dirname, '_fb-dl-progress.json');

const ALBUMS = [
  { name: 'Durga Puja 2025',          set: 'a.1221583500009872', expected: 20 },
  { name: 'Spandan 2025',             set: 'a.1180264127475143', expected: 357 },
  { name: 'Sports Day 2025',          set: 'a.1102569225244634', expected: 58 },
  { name: 'Anandadhara Returns 2023', set: 'a.673000554868172',  expected: 105 },
  { name: 'Mobile Uploads',           set: 'a.360315859469978',  expected: 1159 },
  { name: 'Photos',                   set: 'a.360315866136644',  expected: 568 },
];

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function loadProgress() {
  try { return JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf8')); }
  catch { return { downloadedFbids: {}, albumCounts: {} }; }
}
function saveProgress(prog) {
  fs.writeFileSync(PROGRESS_FILE, JSON.stringify(prog, null, 2));
}

async function getCurrentPhotoInfo(page) {
  return page.evaluate(() => {
    const url = window.location.href;
    const fbidMatch = url.match(/fbid=(\d+)/);
    
    // Find largest scontent image
    const imgs = Array.from(document.querySelectorAll('img[src*="scontent"]'));
    let best = null, bestArea = 0;
    for (const img of imgs) {
      const area = (img.naturalWidth || 0) * (img.naturalHeight || 0);
      if (area > bestArea) { bestArea = area; best = img; }
    }
    
    return {
      fbid: fbidMatch ? fbidMatch[1] : null,
      imgSrc: best ? best.src : null,
      imgW: best ? best.naturalWidth : 0,
      imgH: best ? best.naturalHeight : 0,
    };
  });
}

async function downloadCurrentPhoto(page, fbid, albumKey, progress) {
  const filename = `${albumKey}-${fbid}.jpg`;
  const filepath = path.join(GALLERY_DIR, filename);
  
  // Skip if already downloaded
  if (progress.downloadedFbids[fbid] || fs.existsSync(filepath)) {
    progress.downloadedFbids[fbid] = progress.downloadedFbids[fbid] || filename;
    return { skipped: true };
  }
  
  // Wait for images to be loaded in the viewer
  await sleep(500);
  
  // Try multiple approaches to get the image
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      // Get the largest scontent image that's fully loaded
      const imgUrl = await page.evaluate(() => {
        const imgs = Array.from(document.querySelectorAll('img[src*="scontent"]'));
        let best = null, bestArea = 0;
        for (const img of imgs) {
          // Only consider fully loaded images
          if (!img.complete || img.naturalWidth === 0) continue;
          const area = img.naturalWidth * img.naturalHeight;
          if (area > bestArea) { bestArea = area; best = img.src; }
        }
        return best;
      });
      
      if (!imgUrl) {
        await sleep(1000);
        continue;
      }
      
      // Method 1: Use XMLHttpRequest with responseType blob (works better than fetch for same-origin)
      const imgData = await page.evaluate((url) => {
        return new Promise((resolve) => {
          const xhr = new XMLHttpRequest();
          xhr.open('GET', url, true);
          xhr.responseType = 'blob';
          xhr.onload = function() {
            if (xhr.status === 200) {
              const reader = new FileReader();
              reader.onloadend = () => resolve({ data: reader.result, size: xhr.response.size });
              reader.readAsDataURL(xhr.response);
            } else {
              resolve(null);
            }
          };
          xhr.onerror = () => resolve(null);
          xhr.send();
        });
      }, imgUrl);
      
      if (imgData?.data && imgData.size > 5000) {
        const base64 = imgData.data.split(',')[1];
        if (base64) {
          const buf = Buffer.from(base64, 'base64');
          if (buf.length > 5000) {
            fs.writeFileSync(filepath, buf);
            progress.downloadedFbids[fbid] = filename;
            return { filename, size: buf.length };
          }
        }
      }
      
      // Method 2: Draw image to canvas and export
      const canvasData = await page.evaluate(() => {
        const imgs = Array.from(document.querySelectorAll('img[src*="scontent"]'));
        let best = null, bestArea = 0;
        for (const img of imgs) {
          if (!img.complete || img.naturalWidth === 0) continue;
          const area = img.naturalWidth * img.naturalHeight;
          if (area > bestArea) { bestArea = area; best = img; }
        }
        if (!best) return null;
        
        try {
          const canvas = document.createElement('canvas');
          canvas.width = best.naturalWidth;
          canvas.height = best.naturalHeight;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(best, 0, 0);
          return canvas.toDataURL('image/jpeg', 0.95);
        } catch {
          return null; // CORS tainted canvas
        }
      });
      
      if (canvasData) {
        const base64 = canvasData.split(',')[1];
        if (base64) {
          const buf = Buffer.from(base64, 'base64');
          if (buf.length > 5000) {
            fs.writeFileSync(filepath, buf);
            progress.downloadedFbids[fbid] = filename;
            return { filename, size: buf.length };
          }
        }
      }
      
      await sleep(800);
    } catch {
      await sleep(500);
    }
  }
  
  return { error: 'download failed' };
}

async function processAlbum(page, album, progress) {
  const albumKey = album.name.replace(/[^a-z0-9]+/gi, '-').toLowerCase();
  
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`  ${album.name} (expected ~${album.expected} photos)`);
  console.log(`${'═'.repeat(60)}`);
  
  // Step 1: Go to album page
  const albumUrl = `https://www.facebook.com/media/set/?set=${album.set}&type=3`;
  console.log(`  Loading album: ${albumUrl}`);
  await page.goto(albumUrl, { waitUntil: 'networkidle2', timeout: 30000 });
  await sleep(3000);
  
  // Step 2: Click the first photo to open the lightbox viewer
  // We must CLICK (not navigate) so the album context is established for arrow navigation
  console.log('  Clicking first photo in album grid...');
  
  const clicked = await page.evaluate((albumSet) => {
    const links = Array.from(document.querySelectorAll('a[href*="fbid="]'));
    // Find a photo link that belongs to this album set
    for (const a of links) {
      if (a.href.includes('set=' + albumSet)) {
        a.click();
        return a.href.match(/fbid=(\d+)/)?.[1];
      }
    }
    // Fallback: click any photo link
    if (links.length > 0) {
      links[0].click();
      return links[0].href.match(/fbid=(\d+)/)?.[1];
    }
    return null;
  }, album.set);
  
  if (!clicked) {
    console.log('  ✗ No photo links found in album grid!');
    return 0;
  }
  console.log(`  Opened photo viewer (fbid=${clicked})`);
  await sleep(3000);
  
  // Wait for the photo viewer to load (URL should contain fbid)
  let viewerReady = false;
  for (let w = 0; w < 10; w++) {
    const url = page.url();
    if (url.includes('fbid=')) { viewerReady = true; break; }
    await sleep(500);
  }
  if (!viewerReady) {
    console.log('  ✗ Photo viewer did not open!');
    return 0;
  }
  
  // Step 3: Navigate through photos using Right Arrow
  const seenFbids = new Set();
  let downloaded = 0;
  let skipped = 0;
  let errors = 0;
  const maxPhotos = album.expected + 100; // Safety margin
  let firstViewedFbid = null;
  
  for (let step = 0; step < maxPhotos; step++) {
    const info = await getCurrentPhotoInfo(page);
    
    if (!info.fbid) {
      errors++;
      if (errors > 15) {
        console.log('  ⚠ Too many errors, stopping album.');
        break;
      }
      // Try clicking the Next button directly
      await page.evaluate(() => {
        const btn = document.querySelector('[aria-label="Next photo"]');
        if (btn) btn.click();
      });
      await sleep(2000);
      continue;
    }
    
    // Record the first photo we see
    if (!firstViewedFbid) firstViewedFbid = info.fbid;
    
    // Loop detection: if we've seen this fbid before, we've gone through all photos
    if (seenFbids.has(info.fbid)) {
      console.log(`  ↻ Loop detected (back to fbid ${info.fbid}). Album complete!`);
      break;
    }
    seenFbids.add(info.fbid);
    
    // Download the current photo
    const result = await downloadCurrentPhoto(page, info.fbid, albumKey, progress);
    
    if (result.skipped) {
      skipped++;
    } else if (result.filename) {
      downloaded++;
      errors = 0;
      if (downloaded <= 5 || downloaded % 25 === 0) {
        console.log(`  [${downloaded}] ${result.filename} (${(result.size/1024).toFixed(0)}KB)`);
      }
    } else {
      errors++;
      if (errors <= 3) console.log(`  [skip] fbid ${info.fbid}: ${result.error}`);
    }
    
    // Save progress every 50 photos
    if ((downloaded + skipped) % 50 === 0 && (downloaded + skipped) > 0) {
      saveProgress(progress);
      if (downloaded > 0) {
        console.log(`  💾 Progress: ${downloaded} new, ${skipped} existing, ${seenFbids.size} visited`);
      }
    }
    
    // Navigate to next photo - try arrow key first, then button click
    await page.keyboard.press('ArrowRight');
    await sleep(1500);
    
    // Wait for URL to change (new photo loaded)
    let waited = 0;
    let navigated = false;
    while (waited < 6000) {
      const newInfo = await getCurrentPhotoInfo(page);
      if (newInfo.fbid && newInfo.fbid !== info.fbid) { navigated = true; break; }
      await sleep(400);
      waited += 400;
    }
    
    // If arrow key didn't work, try clicking the Next button
    if (!navigated) {
      await page.evaluate(() => {
        const btn = document.querySelector('[aria-label="Next photo"]');
        if (btn) btn.click();
      });
      await sleep(2000);
    }
  }
  
  progress.albumCounts[albumKey] = { total: seenFbids.size, downloaded, skipped };
  saveProgress(progress);
  
  console.log(`\n  ✓ ${album.name}: ${downloaded} new + ${skipped} existing = ${seenFbids.size} total\n`);
  return downloaded;
}

async function main() {
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║   BANF Facebook Album Downloader                        ║');
  console.log('║   Connects to Edge on port 9222                         ║');
  console.log('║   Uses photo viewer + arrow key navigation              ║');
  console.log('╚══════════════════════════════════════════════════════════╝\n');

  if (!fs.existsSync(GALLERY_DIR)) fs.mkdirSync(GALLERY_DIR, { recursive: true });
  
  const progress = loadProgress();

  // Connect to Edge
  console.log('Connecting to Edge...');
  let browser;
  try {
    browser = await puppeteer.connect({
      browserURL: 'http://localhost:9222',
      defaultViewport: null
    });
    console.log('✓ Connected!\n');
  } catch (e) {
    console.error('✗ Cannot connect to Edge on port 9222.');
    console.error('  Close all Edge windows, then run:');
    console.error('  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe" --remote-debugging-port=9222');
    process.exit(1);
  }

  const page = await browser.newPage();
  
  // Check FB login
  console.log('Checking Facebook login...');
  await page.goto('https://www.facebook.com/banfofficial/', { waitUntil: 'networkidle2', timeout: 30000 });
  await sleep(2000);
  
  const isLoggedIn = await page.evaluate(() => {
    return !document.querySelector('[data-testid="royal_login_button"]') &&
           !document.querySelector('input[name="email"]');
  });
  
  if (!isLoggedIn) {
    console.log('✗ Not logged in! Please log in to Facebook in Edge first.');
    await page.close();
    browser.disconnect();
    process.exit(1);
  }
  console.log('✓ Logged in to Facebook\n');

  // Process each album
  let grandTotal = 0;
  
  for (const album of ALBUMS) {
    try {
      const count = await processAlbum(page, album, progress);
      grandTotal += count;
    } catch (err) {
      console.log(`  ❌ Error in "${album.name}": ${err.message}`);
    }
  }

  // Final summary
  const totalFiles = fs.readdirSync(GALLERY_DIR).filter(f => /\.(jpg|png)$/i.test(f)).length;
  
  console.log('\n' + '═'.repeat(58));
  console.log('  DOWNLOAD COMPLETE!');
  console.log(`  New photos this run: ${grandTotal}`);
  console.log(`  Total gallery files: ${totalFiles}\n`);
  
  for (const album of ALBUMS) {
    const key = album.name.replace(/[^a-z0-9]+/gi, '-').toLowerCase();
    const ac = progress.albumCounts[key] || {};
    console.log(`  ${album.name}: ${ac.total || '?'} photos (${ac.downloaded || 0} new)`);
  }
  console.log('═'.repeat(58));
  
  await page.close();
  browser.disconnect();
}

main().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
