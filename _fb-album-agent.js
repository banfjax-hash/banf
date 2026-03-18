#!/usr/bin/env node
/**
 * BANF Facebook Album Photo Downloader Agent
 * 
 * Opens a VISIBLE Chrome browser so you can log in to Facebook.
 * Then systematically downloads ALL photos from every album on the BANF page.
 * 
 * Strategy: For each album, open first photo in lightbox viewer, 
 * then click "Next" arrow repeatedly to traverse ALL photos.
 * Intercepts full-resolution image URLs via network monitoring.
 * 
 * Usage: node _fb-album-agent.js
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const PAGE_URL = 'https://www.facebook.com/banfofficial/';
const ALBUMS_URL = 'https://www.facebook.com/banfofficial/photos_albums';
const GALLERY_DIR = path.join(__dirname, 'docs', 'gallery');
const DATA_FILE = path.join(__dirname, '_fb-agent-progress.json');

// Known albums from previous scrape
const ALBUMS = [
  { name: 'Durga Puja 2025',          set: 'a.1221583500009872', year: 2025, expected: 20 },
  { name: 'Spandan 2025',             set: 'a.1180264127475143', year: 2025, expected: 357 },
  { name: 'Sports Day 2025',          set: 'a.1102569225244634', year: 2025, expected: 58 },
  { name: 'Anandadhara Returns 2023', set: 'a.673000554868172',  year: 2023, expected: 105 },
  { name: 'Mobile Uploads',           set: 'a.360315859469978',  year: null, expected: 1159 },
  { name: 'Photos',                   set: 'a.360315866136644',  year: null, expected: 568 },
];

// Load or init progress
function loadProgress() {
  try { return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')); }
  catch { return { albums: {}, totalDownloaded: 0 }; }
}
function saveProgress(progress) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(progress, null, 2));
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function waitForLogin(page) {
  console.log('\n╔══════════════════════════════════════════════════════════╗');
  console.log('║  FACEBOOK LOGIN REQUIRED                                ║');
  console.log('║                                                         ║');
  console.log('║  A Chrome window has opened. Please:                    ║');
  console.log('║  1. Log in to Facebook with the admin account           ║');
  console.log('║  2. Navigate to the BANF page if not already there      ║');
  console.log('║  3. Come back here - the script will auto-detect login  ║');
  console.log('╚══════════════════════════════════════════════════════════╝\n');

  // Wait until we detect a logged-in state
  let loggedIn = false;
  for (let i = 0; i < 300; i++) { // Wait up to 5 minutes
    try {
      loggedIn = await page.evaluate(() => {
        // Check for logged-in indicators
        return !!document.querySelector('[aria-label="Your profile"]') ||
               !!document.querySelector('[aria-label="Account"]') ||
               !!document.querySelector('[data-pagelet="ProfileActions"]') ||
               !!document.querySelector('[role="banner"] [aria-label="Facebook"]') && 
               !document.querySelector('[data-testid="royal_login_button"]');
      });
      if (loggedIn) break;
    } catch {}
    await sleep(1000);
    if (i % 15 === 0 && i > 0) console.log(`  Waiting for login... (${i}s)`);
  }

  if (!loggedIn) {
    console.log('⚠ Could not confirm login. Proceeding anyway...');
  } else {
    console.log('✓ Login detected! Starting download...\n');
  }
  await sleep(2000);
}

async function downloadImage(url, filepath) {
  try {
    const resp = await fetch(url, { signal: AbortSignal.timeout(30000) });
    if (!resp.ok) return false;
    const buf = Buffer.from(await resp.arrayBuffer());
    if (buf.length < 5000) return false; // Skip tiny images
    fs.writeFileSync(filepath, buf);
    return buf.length;
  } catch { return false; }
}

async function scrapeAlbumViaPhotoViewer(browser, page, album, progress) {
  const albumKey = album.name.replace(/\s+/g, '-').toLowerCase();
  if (!progress.albums[albumKey]) {
    progress.albums[albumKey] = { downloaded: [], fbids: new Set(), errors: 0 };
  } else {
    // Convert array back to Set after JSON load
    progress.albums[albumKey].fbids = new Set(progress.albums[albumKey].fbids);
  }
  const albumProgress = progress.albums[albumKey];

  console.log(`\n${'═'.repeat(60)}`);
  console.log(`Album: ${album.name} (expected ~${album.expected} photos)`);
  console.log(`Already downloaded: ${albumProgress.downloaded.length}`);
  console.log(`${'═'.repeat(60)}`);

  // Navigate to the album
  const albumUrl = `https://www.facebook.com/media/set/?set=${album.set}&type=3`;
  console.log(`Opening: ${albumUrl}`);
  await page.goto(albumUrl, { waitUntil: 'networkidle2', timeout: 30000 });
  await sleep(3000);

  // Scroll down a LOT to load more photo thumbnails
  console.log('Scrolling to load photo grid...');
  let prevHeight = 0;
  let sameCount = 0;
  for (let scroll = 0; scroll < 200; scroll++) {
    await page.evaluate(() => window.scrollBy(0, 1500));
    await sleep(800);
    
    const height = await page.evaluate(() => document.body.scrollHeight);
    if (height === prevHeight) {
      sameCount++;
      if (sameCount > 5) break; // No more content loading
    } else {
      sameCount = 0;
      prevHeight = height;
    }
    
    if (scroll % 20 === 0 && scroll > 0) {
      const count = await page.evaluate(() => document.querySelectorAll('a[href*="fbid="]').length);
      console.log(`  Scroll ${scroll}: ${count} photo links found, page height: ${height}`);
    }
  }

  // Collect all photo links
  const photoLinks = await page.evaluate(() => {
    const links = Array.from(document.querySelectorAll('a[href*="fbid="]'));
    const seen = new Set();
    return links
      .map(a => {
        const m = a.href.match(/fbid=(\d+)/);
        if (!m || seen.has(m[1])) return null;
        seen.add(m[1]);
        return { href: a.href, fbid: m[1] };
      })
      .filter(Boolean);
  });

  console.log(`Found ${photoLinks.length} unique photo links in album grid`);

  if (photoLinks.length === 0) {
    console.log('  No photo links found! Album may require login or be empty.');
    return;
  }

  // Click into the FIRST photo to enter lightbox/photo viewer
  console.log('\nOpening first photo in viewer...');
  
  // Method: Click the first photo link
  try {
    await page.evaluate(() => {
      const firstLink = document.querySelector('a[href*="fbid="]');
      if (firstLink) firstLink.click();
    });
    await sleep(3000);
  } catch (e) {
    console.log(`  Error clicking first photo: ${e.message}`);
    return;
  }

  // Now we're in the photo viewer. Collect images by:
  // 1. Getting the current large image
  // 2. Clicking "Next" arrow
  // 3. Repeat until we loop back to the first photo
  
  let photoCount = 0;
  let loopDetectFbids = new Set();
  let consecutiveErrors = 0;
  const maxPhotos = Math.min(album.expected + 50, 2000); // Safety limit
  
  // Set up network interception for full-size images
  const capturedImages = new Map(); // fbid -> url
  
  while (photoCount < maxPhotos && consecutiveErrors < 10) {
    try {
      // Get current photo info
      const photoInfo = await page.evaluate(() => {
        // Find the main/largest image in the viewer
        const imgs = Array.from(document.querySelectorAll('img[src*="scontent"]'));
        let best = null;
        let bestArea = 0;
        for (const img of imgs) {
          const area = (img.naturalWidth || img.width || 0) * (img.naturalHeight || img.height || 0);
          if (area > bestArea) {
            bestArea = area;
            best = img;
          }
        }
        
        // Also try to extract from the URL bar or data attributes
        const urlMatch = window.location.href.match(/fbid=(\d+)/);
        const fbid = urlMatch ? urlMatch[1] : null;
        
        return {
          src: best ? best.src : null,
          alt: best ? best.alt : '',
          width: best ? (best.naturalWidth || img.width) : 0,
          height: best ? (best.naturalHeight || img.height) : 0,
          fbid: fbid,
          url: window.location.href
        };
      });

      if (!photoInfo.fbid) {
        // Try to get fbid from the page content
        const fbidFromPage = await page.evaluate(() => {
          const m = document.body.innerHTML.match(/"photoID":"(\d+)"/);
          return m ? m[1] : null;
        });
        if (fbidFromPage) photoInfo.fbid = fbidFromPage;
      }

      if (photoInfo.fbid && loopDetectFbids.has(photoInfo.fbid)) {
        console.log(`\n  ↻ Loop detected at fbid ${photoInfo.fbid} - album complete!`);
        break;
      }

      if (photoInfo.fbid) {
        loopDetectFbids.add(photoInfo.fbid);
      }

      if (photoInfo.src && photoInfo.fbid) {
        // Check if already downloaded
        if (!albumProgress.fbids.has(photoInfo.fbid)) {
          const slug = albumKey;
          const filename = `${slug}-${photoInfo.fbid}.jpg`;
          const filepath = path.join(GALLERY_DIR, filename);
          
          if (!fs.existsSync(filepath)) {
            // Try to get highest res version
            // Replace size params in URL for larger version
            let highResUrl = photoInfo.src
              .replace(/s\d+x\d+/, 's2048x2048')
              .replace(/p\d+x\d+/, 'p2048x2048')
              .replace(/cp0.*?\//, '');
            
            // Try to get image from the page context (with cookies)
            const imgData = await page.evaluate(async (url) => {
              try {
                const r = await fetch(url);
                if (!r.ok) return null;
                const blob = await r.blob();
                const reader = new FileReader();
                return new Promise((resolve) => {
                  reader.onloadend = () => resolve(reader.result);
                  reader.readAsDataURL(blob);
                });
              } catch { return null; }
            }, photoInfo.src);
            
            let saved = false;
            if (imgData) {
              const base64 = imgData.split(',')[1];
              if (base64) {
                const buf = Buffer.from(base64, 'base64');
                if (buf.length > 10000) {
                  fs.writeFileSync(filepath, buf);
                  saved = true;
                  photoCount++;
                  albumProgress.downloaded.push(filename);
                  albumProgress.fbids.add(photoInfo.fbid);
                  progress.totalDownloaded++;
                  
                  if (photoCount % 10 === 0 || photoCount <= 5) {
                    console.log(`  [${photoCount}] ${filename} (${(buf.length/1024).toFixed(0)}KB) ${photoInfo.alt?.substring(0,40)||''}`);
                  }
                  if (photoCount % 50 === 0) {
                    // Save progress periodically
                    const saveData = { ...progress };
                    for (const k of Object.keys(saveData.albums)) {
                      saveData.albums[k] = { ...saveData.albums[k], fbids: [...saveData.albums[k].fbids] };
                    }
                    saveProgress(saveData);
                    console.log(`  💾 Progress saved (${progress.totalDownloaded} total)`);
                  }
                }
              }
            }
            
            if (!saved) {
              // Fallback: download directly
              const size = await downloadImage(photoInfo.src, filepath);
              if (size) {
                photoCount++;
                albumProgress.downloaded.push(filename);
                albumProgress.fbids.add(photoInfo.fbid);
                progress.totalDownloaded++;
                if (photoCount % 10 === 0 || photoCount <= 5) {
                  console.log(`  [${photoCount}] ${filename} (${(size/1024).toFixed(0)}KB)`);
                }
              }
            }
          } else {
            albumProgress.fbids.add(photoInfo.fbid);
            photoCount++;
            if (photoCount % 50 === 0) {
              console.log(`  [${photoCount}] Skip (exists): ${photoInfo.fbid}`);
            }
          }
          consecutiveErrors = 0;
        }
      } else {
        consecutiveErrors++;
      }

      // Click "Next" arrow to go to the next photo
      const clicked = await page.evaluate(() => {
        // Facebook's next arrow button
        const selectors = [
          '[aria-label="Next photo"]',
          '[aria-label="Next"]',
          '[data-testid="rightCaret"]',
          'div[class*="spotlight"] + div a',
          'a[aria-label="Next photo"]',
          'div[role="button"][aria-label="Next"]',
        ];
        
        for (const sel of selectors) {
          const btn = document.querySelector(sel);
          if (btn) {
            btn.click();
            return 'clicked: ' + sel;
          }
        }
        
        // Try finding by SVG arrow icon
        const svgs = document.querySelectorAll('svg');
        for (const svg of svgs) {
          const parent = svg.closest('[role="button"]') || svg.closest('div[tabindex]');
          if (parent) {
            const rect = parent.getBoundingClientRect();
            // Right side of screen = next button
            if (rect.left > window.innerWidth * 0.7 && rect.width < 100) {
              parent.click();
              return 'clicked: svg-right-button';
            }
          }
        }
        
        // Last resort: find clickable elements on the right side
        const rightButtons = document.querySelectorAll('[role="button"]');
        for (const btn of rightButtons) {
          const rect = btn.getBoundingClientRect();
          if (rect.left > window.innerWidth * 0.8 && 
              rect.top > window.innerHeight * 0.3 && 
              rect.top < window.innerHeight * 0.7 &&
              rect.width < 80) {
            btn.click();
            return 'clicked: right-area-button';
          }
        }
        
        return null;
      });

      if (!clicked) {
        // Try keyboard arrow
        await page.keyboard.press('ArrowRight');
        await sleep(500);
        
        // Check if URL changed
        const newUrl = await page.url();
        const newFbid = newUrl.match(/fbid=(\d+)/)?.[1];
        if (newFbid === photoInfo.fbid) {
          consecutiveErrors++;
          if (consecutiveErrors > 3) {
            console.log('  ⚠ Cannot navigate to next photo. Trying alternative method...');
            // Close lightbox and try clicking next photo from grid
            await page.keyboard.press('Escape');
            await sleep(1000);
            break;
          }
        }
      }

      await sleep(1500); // Wait for next photo to load
      
    } catch (err) {
      console.log(`  Error: ${err.message.substring(0, 60)}`);
      consecutiveErrors++;
      await sleep(2000);
    }
  }

  console.log(`\n  Album "${album.name}" complete: ${photoCount} photos processed`);
  
  // Save progress
  const saveData = { ...progress };
  for (const k of Object.keys(saveData.albums)) {
    saveData.albums[k] = { ...saveData.albums[k], fbids: [...(saveData.albums[k].fbids || [])] };
  }
  saveProgress(saveData);
}

// Alternative: Scrape album by scrolling + collecting all image URLs from network
async function scrapeAlbumViaNetworkIntercept(browser, album, progress) {
  const albumKey = album.name.replace(/\s+/g, '-').toLowerCase();
  if (!progress.albums[albumKey]) {
    progress.albums[albumKey] = { downloaded: [], fbids: new Set(), errors: 0 };
  } else {
    progress.albums[albumKey].fbids = new Set(progress.albums[albumKey].fbids || []);
  }
  const albumProgress = progress.albums[albumKey];

  console.log(`\n${'═'.repeat(60)}`);
  console.log(`Album: ${album.name} (expected ~${album.expected} photos)`);
  console.log(`Method: Network intercept + aggressive scroll`);
  console.log(`Already downloaded: ${albumProgress.downloaded.length}`);
  console.log(`${'═'.repeat(60)}`);

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  // Intercept ALL image responses
  const imageMap = new Map(); // url -> size estimate
  
  page.on('response', async (response) => {
    const url = response.url();
    if (url.includes('scontent') && !url.includes('_s.') && !url.includes('c_fill')) {
      try {
        const headers = response.headers();
        const ct = headers['content-type'] || '';
        if (ct.includes('image')) {
          const cl = parseInt(headers['content-length'] || '0');
          if (cl > 20000 || !cl) { // Only decent-sized images
            imageMap.set(url.split('?')[0], { url, size: cl });
          }
        }
      } catch {}
    }
  });

  const albumUrl = `https://www.facebook.com/media/set/?set=${album.set}&type=3`;
  await page.goto(albumUrl, { waitUntil: 'networkidle2', timeout: 30000 });
  await sleep(3000);

  // Aggressive scrolling with pauses to load content
  console.log('Scrolling to load all photos...');
  let prevImageCount = 0;
  let staleCount = 0;
  let scrollCount = 0;
  
  while (staleCount < 8 && scrollCount < 500) {
    // Scroll down
    await page.evaluate(() => window.scrollBy(0, 2000));
    await sleep(600);
    scrollCount++;
    
    // Every 5 scrolls, check progress
    if (scrollCount % 5 === 0) {
      const currentCount = imageMap.size;
      if (currentCount === prevImageCount) {
        staleCount++;
        // Try scrolling to bottom then back up to trigger more loading
        if (staleCount === 3) {
          await page.evaluate(() => window.scrollTo(0, 0));
          await sleep(1000);
          await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
          await sleep(2000);
        }
      } else {
        staleCount = 0;
        prevImageCount = currentCount;
      }
      
      if (scrollCount % 25 === 0) {
        console.log(`  Scroll ${scrollCount}: ${imageMap.size} unique images captured`);
      }
    }
  }

  console.log(`\nScroll complete. Total unique images: ${imageMap.size}`);

  // Also get all fbid links for reference
  const fbidLinks = await page.evaluate(() => {
    return [...new Set(
      Array.from(document.querySelectorAll('a[href*="fbid="]'))
        .map(a => a.href.match(/fbid=(\d+)/)?.[1])
        .filter(Boolean)
    )];
  });
  console.log(`Photo fbid links found: ${fbidLinks.length}`);

  // Now download each captured image
  let downloaded = 0;
  const entries = [...imageMap.values()].sort((a, b) => (b.size || 0) - (a.size || 0));
  
  // Deduplicate by base filename
  const seen = new Set();
  const toDownload = [];
  for (const entry of entries) {
    const base = entry.url.split('?')[0].split('/').pop();
    if (!seen.has(base)) {
      seen.add(base);
      toDownload.push(entry);
    }
  }

  console.log(`Unique images to download: ${toDownload.length}\n`);

  for (let i = 0; i < toDownload.length; i++) {
    const entry = toDownload[i];
    const idx = String(i + 1).padStart(4, '0');
    const filename = `${albumKey}-${idx}.jpg`;
    const filepath = path.join(GALLERY_DIR, filename);

    if (fs.existsSync(filepath)) {
      if (i % 50 === 0) console.log(`  [${i+1}/${toDownload.length}] Skip existing...`);
      continue;
    }

    try {
      // Download using the page context (has cookies)
      const imgData = await page.evaluate(async (url) => {
        try {
          const r = await fetch(url, { credentials: 'include' });
          if (!r.ok) return null;
          const blob = await r.blob();
          return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.readAsDataURL(blob);
          });
        } catch { return null; }
      }, entry.url);

      if (imgData) {
        const base64 = imgData.split(',')[1];
        if (base64) {
          const buf = Buffer.from(base64, 'base64');
          if (buf.length > 10000) {
            fs.writeFileSync(filepath, buf);
            downloaded++;
            albumProgress.downloaded.push(filename);
            progress.totalDownloaded++;
            
            if (downloaded % 20 === 0 || downloaded <= 5) {
              console.log(`  [${downloaded}] ${filename} (${(buf.length/1024).toFixed(0)}KB)`);
            }
          }
        }
      }
    } catch (err) {
      // Ignore individual errors
    }

    // Rate limit
    if (i % 10 === 0) await sleep(500);
    
    // Save progress periodically
    if (downloaded % 100 === 0 && downloaded > 0) {
      const saveData = { ...progress };
      for (const k of Object.keys(saveData.albums)) {
        saveData.albums[k] = { ...saveData.albums[k], fbids: [...(saveData.albums[k].fbids || [])] };
      }
      saveProgress(saveData);
      console.log(`  💾 Progress saved (${progress.totalDownloaded} total across all albums)`);
    }
  }

  await page.close();
  
  console.log(`\n  Album "${album.name}": ${downloaded} new photos downloaded`);
  return downloaded;
}

async function main() {
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║     BANF Facebook Album Photo Downloader Agent          ║');
  console.log('║     Page: facebook.com/banfofficial                     ║');
  console.log('╚══════════════════════════════════════════════════════════╝\n');

  // Ensure gallery dir exists
  if (!fs.existsSync(GALLERY_DIR)) fs.mkdirSync(GALLERY_DIR, { recursive: true });

  const progress = loadProgress();
  
  // Launch visible browser
  const browser = await puppeteer.launch({
    headless: false, // VISIBLE browser so user can log in
    defaultViewport: null,
    args: [
      '--start-maximized',
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-blink-features=AutomationControlled'
    ]
  });

  const pages = await browser.pages();
  const page = pages[0] || await browser.newPage();
  
  // Disable webdriver detection
  await page.evaluateOnNewDocument(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => false });
  });

  // Go to Facebook
  console.log('Opening Facebook...');
  await page.goto('https://www.facebook.com/banfofficial/', {
    waitUntil: 'networkidle2',
    timeout: 30000
  });

  // Check if logged in
  const needsLogin = await page.evaluate(() => {
    return !!document.querySelector('[data-testid="royal_login_button"]') ||
           !!document.querySelector('input[name="email"]') ||
           document.title.includes('Log in') || document.title.includes('log in');
  });

  if (needsLogin) {
    await waitForLogin(page);
  } else {
    console.log('✓ Already logged in (or page is public)\n');
  }

  // First, discover all albums with their photo counts
  console.log('Navigating to albums page...');
  await page.goto(ALBUMS_URL, { waitUntil: 'networkidle2', timeout: 30000 });
  await sleep(3000);

  // Try to discover albums dynamically
  const discoveredAlbums = await page.evaluate(() => {
    const albumEls = document.querySelectorAll('a[href*="/media/set"]');
    return Array.from(albumEls).map(a => {
      const text = a.innerText.trim();
      const m = a.href.match(/set=([^&]+)/);
      return { 
        name: text.split('\n')[0].trim(),
        set: m ? m[1] : null,
        itemCount: text.match(/(\d[\d,]*)\s*Items?/i)?.[1]?.replace(/,/g, '') || '0',
        href: a.href
      };
    }).filter(a => a.set);
  });

  console.log(`\nDiscovered ${discoveredAlbums.length} albums:`);
  discoveredAlbums.forEach(a => {
    console.log(`  ${a.name} (${a.itemCount} items) - set=${a.set}`);
  });

  // Use discovered albums, enriched with our known years
  const yearMap = {
    'Durga Puja 2025': 2025, 'Spandan 2025': 2025, 'Sports Day 2025': 2025,
    'Anandadhara Returns 2023': 2023, 'Cover photos': null, 'Profile pictures': null
  };
  
  const albumsToProcess = discoveredAlbums
    .filter(a => !a.name.toLowerCase().includes('profile picture') && !a.name.toLowerCase().includes('cover photo'))
    .map(a => ({
      name: a.name,
      set: a.set,
      year: yearMap[a.name] || null,
      expected: parseInt(a.itemCount) || 100
    }));

  console.log(`\nWill process ${albumsToProcess.length} albums (excluding profile/cover photos)\n`);

  // Process each album
  let totalNewPhotos = 0;
  for (const album of albumsToProcess) {
    try {
      const count = await scrapeAlbumViaNetworkIntercept(browser, album, progress);
      totalNewPhotos += count || 0;
    } catch (err) {
      console.log(`\n  ❌ Error processing "${album.name}": ${err.message}`);
    }
    await sleep(2000);
  }

  // Final save
  const saveData = { ...progress };
  for (const k of Object.keys(saveData.albums)) {
    saveData.albums[k] = { ...saveData.albums[k], fbids: [...(saveData.albums[k].fbids || [])] };
  }
  saveProgress(saveData);

  console.log('\n' + '═'.repeat(60));
  console.log(`COMPLETE!`);
  console.log(`  New photos downloaded this run: ${totalNewPhotos}`);
  console.log(`  Total photos across all runs: ${progress.totalDownloaded}`);
  console.log(`  Progress saved to: ${DATA_FILE}`);
  console.log('═'.repeat(60));

  // List downloaded per album
  const galleryFiles = fs.readdirSync(GALLERY_DIR).filter(f => f.endsWith('.jpg'));
  console.log(`\nGallery directory: ${galleryFiles.length} total photos`);
  
  // Group by album prefix
  const byAlbum = {};
  for (const f of galleryFiles) {
    const prefix = f.replace(/-\d{4}\.jpg$/, '').replace(/-\d+\.jpg$/, '');
    byAlbum[prefix] = (byAlbum[prefix] || 0) + 1;
  }
  Object.entries(byAlbum).sort((a,b) => b[1] - a[1]).forEach(([prefix, count]) => {
    console.log(`  ${prefix}: ${count} photos`);
  });

  // Keep browser open for user to verify
  console.log('\nBrowser left open for inspection. Close it manually when done.');
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });
