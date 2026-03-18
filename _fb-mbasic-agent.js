#!/usr/bin/env node
/**
 * BANF Facebook Album Photo Downloader - mbasic.facebook.com approach
 * 
 * Uses the basic HTML version of Facebook which has simple pagination
 * instead of infinite scroll. This allows traversing ALL photos.
 * 
 * Opens a visible Chrome so you can log in, then uses mbasic.facebook.com
 * for album pagination and www.facebook.com for high-res downloads.
 * 
 * Usage: node _fb-mbasic-agent.js
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const GALLERY_DIR = path.join(__dirname, 'docs', 'gallery');
const DATA_FILE = path.join(__dirname, '_fb-agent-progress.json');
const USER_DATA_DIR = path.join(__dirname, '_chrome-profile');

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function loadProgress() {
  try { return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')); }
  catch { return { albums: {}, totalDownloaded: 0 }; }
}
function saveProgress(progress) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(progress, null, 2));
}

async function main() {
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║     BANF Facebook Photo Downloader (mbasic approach)    ║');
  console.log('║     Page: facebook.com/banfofficial                     ║');
  console.log('╚══════════════════════════════════════════════════════════╝\n');

  if (!fs.existsSync(GALLERY_DIR)) fs.mkdirSync(GALLERY_DIR, { recursive: true });

  const progress = loadProgress();

  // Launch visible browser with persistent profile (so login persists between runs)
  const browser = await puppeteer.launch({
    headless: false,
    userDataDir: USER_DATA_DIR,
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

  await page.evaluateOnNewDocument(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => false });
  });

  // Step 1: Go to mbasic Facebook to log in  
  console.log('Opening mbasic.facebook.com...');
  await page.goto('https://mbasic.facebook.com/banfofficial/', {
    waitUntil: 'networkidle2',
    timeout: 30000
  });
  await sleep(2000);

  // Check if we need to log in
  const needsLogin = await page.evaluate(() => {
    return !!document.querySelector('input[name="email"]') ||
           !!document.querySelector('#login_form') ||
           document.title.toLowerCase().includes('log in');
  });

  if (needsLogin) {
    console.log('\n╔══════════════════════════════════════════════════════════╗');
    console.log('║  PLEASE LOG IN TO FACEBOOK                              ║');
    console.log('║                                                         ║');
    console.log('║  A Chrome window is open. Log in with the Facebook      ║');
    console.log('║  account that can see BANF page photos.                 ║');
    console.log('║  After login, come back here.                           ║');
    console.log('╚══════════════════════════════════════════════════════════╝\n');
    
    // Wait for login (look for user-specific elements)
    for (let i = 0; i < 300; i++) {
      const loggedIn = await page.evaluate(() => {
        return !document.querySelector('input[name="email"]') && 
               !document.querySelector('#login_form') &&
               !document.title.toLowerCase().includes('log in');
      }).catch(() => false);
      if (loggedIn) break;
      await sleep(1000);
      if (i % 15 === 0 && i > 0) console.log(`  Waiting for login... (${i}s)`);
    }
    
    console.log('✓ Login detected!\n');
    // Navigate to BANF page after login
    await page.goto('https://mbasic.facebook.com/banfofficial/', {
      waitUntil: 'networkidle2', timeout: 30000
    });
    await sleep(2000);
  } else {
    console.log('✓ Already logged in!\n');
  }

  // Step 2: Navigate to photos/albums page on mbasic
  console.log('Navigating to albums...');
  await page.goto('https://mbasic.facebook.com/banfofficial/photos/', {
    waitUntil: 'networkidle2', timeout: 30000
  });
  await sleep(2000);

  // Step 3: Discover albums from mbasic
  let albumLinks = await page.evaluate(() => {
    const links = Array.from(document.querySelectorAll('a'));
    return links
      .filter(a => a.href && a.href.includes('/media/set/'))
      .map(a => ({
        name: a.textContent.trim().split('\n')[0],
        href: a.href,
        set: a.href.match(/set=([^&]+)/)?.[1] || ''
      }))
      .filter(a => a.set);
  });

  // Deduplicate
  const seenSets = new Set();
  albumLinks = albumLinks.filter(a => {
    if (seenSets.has(a.set)) return false;
    seenSets.add(a.set);
    return true;
  });

  console.log(`Discovered ${albumLinks.length} albums:`);
  albumLinks.forEach(a => console.log(`  • ${a.name} (${a.set})`));

  // If no albums found on mbasic, use the known ones
  if (albumLinks.length === 0) {
    console.log('\nNo albums found via mbasic. Using known album sets...');
    albumLinks = [
      { name: 'Durga Puja 2025',          set: 'a.1221583500009872' },
      { name: 'Spandan 2025',             set: 'a.1180264127475143' },
      { name: 'Sports Day 2025',          set: 'a.1102569225244634' },
      { name: 'Anandadhara Returns 2023', set: 'a.673000554868172' },
      { name: 'Mobile Uploads',           set: 'a.360315859469978' },
      { name: 'Photos',                   set: 'a.360315866136644' },
    ];
  }

  // Filter out profile/cover photos
  albumLinks = albumLinks.filter(a => 
    !a.name.toLowerCase().includes('profile') && 
    !a.name.toLowerCase().includes('cover')
  );

  console.log(`\nWill process ${albumLinks.length} albums\n`);

  // Step 4: For each album, get ALL photo fbids by paginating through mbasic
  let grandTotal = 0;

  for (const album of albumLinks) {
    const albumKey = album.name.replace(/[^a-z0-9]+/gi, '-').toLowerCase();
    
    console.log(`\n${'═'.repeat(60)}`);
    console.log(`Album: ${album.name}`);
    console.log(`${'═'.repeat(60)}`);

    // Collect all photo page URLs from this album via mbasic pagination
    const allPhotoFbids = [];
    const seenFbids = new Set();
    
    let albumPageUrl = `https://mbasic.facebook.com/media/set/?set=${album.set}&type=3`;
    let pageNum = 0;
    
    while (albumPageUrl && pageNum < 100) { // Safety limit: 100 pages
      pageNum++;
      console.log(`  Page ${pageNum}: loading ${albumPageUrl.substring(0, 80)}...`);
      
      try {
        await page.goto(albumPageUrl, { waitUntil: 'networkidle2', timeout: 20000 });
        await sleep(1500);
      } catch (err) {
        console.log(`  ⚠ Page load error: ${err.message.substring(0, 50)}`);
        break;
      }

      // Extract all photo links on this page
      const photoData = await page.evaluate(() => {
        const links = Array.from(document.querySelectorAll('a'));
        const photos = [];
        
        for (const link of links) {
          const href = link.href || '';
          // mbasic photo links look like /photo.php?fbid=XXXX or /photo/?fbid=XXXX
          const fbidMatch = href.match(/fbid=(\d+)/);
          if (fbidMatch && (href.includes('photo.php') || href.includes('/photo/'))) {
            photos.push(fbidMatch[1]);
          }
        }
        
        // Find "See More" / "next" pagination link
        let nextUrl = null;
        for (const link of links) {
          const text = (link.textContent || '').trim().toLowerCase();
          const href = link.href || '';
          if ((text.includes('see more') || text.includes('more') || text === 'next') && 
              href.includes('media/set') && href.includes('set=')) {
            nextUrl = href;
          }
        }
        
        // Also check for "See more photos" type links
        if (!nextUrl) {
          for (const link of links) {
            const href = link.href || '';
            if (href.includes('media/set') && href.includes('after=')) {
              nextUrl = href;
            }
          }
        }
        
        return { photos, nextUrl };
      });

      let newCount = 0;
      for (const fbid of photoData.photos) {
        if (!seenFbids.has(fbid)) {
          seenFbids.add(fbid);
          allPhotoFbids.push(fbid);
          newCount++;
        }
      }
      console.log(`    Found ${newCount} new photos (total: ${allPhotoFbids.length})`);

      // Check for next page
      if (photoData.nextUrl && photoData.nextUrl !== albumPageUrl) {
        // Make sure it's a mbasic URL
        albumPageUrl = photoData.nextUrl.replace('www.facebook.com', 'mbasic.facebook.com');
      } else {
        albumPageUrl = null;
      }
      
      await sleep(1000); // Be polite
    }

    console.log(`\n  Total photos found in "${album.name}": ${allPhotoFbids.length}`);

    // Step 5: Download each photo via www.facebook.com (for full resolution)
    // We'll open the photo page on www.facebook.com to get the full-size image
    
    if (!progress.albums[albumKey]) {
      progress.albums[albumKey] = { downloaded: [], doneFbids: [] };
    }
    const albumProgress = progress.albums[albumKey];
    const doneFbids = new Set(albumProgress.doneFbids || []);
    
    // Filter to only new photos
    const toDownload = allPhotoFbids.filter(fbid => !doneFbids.has(fbid));
    console.log(`  Already downloaded: ${doneFbids.size}, remaining: ${toDownload.length}\n`);

    let albumDownloaded = 0;

    // Open a second page for downloading (keep mbasic page for navigation)
    const dlPage = await browser.newPage();
    await dlPage.setViewport({ width: 1200, height: 800 });
    await dlPage.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => false });
    });

    for (let i = 0; i < toDownload.length; i++) {
      const fbid = toDownload[i];
      const filename = `${albumKey}-${fbid}.jpg`;
      const filepath = path.join(GALLERY_DIR, filename);

      // Skip if file exists
      if (fs.existsSync(filepath)) {
        doneFbids.add(fbid);
        albumProgress.doneFbids = [...doneFbids];
        if (i % 50 === 0) console.log(`  [${i+1}/${toDownload.length}] Skipping existing...`);
        continue;
      }

      try {
        // Visit the photo page on www.facebook.com to get full resolution
        const photoUrl = `https://www.facebook.com/photo/?fbid=${fbid}&set=${album.set}`;
        await dlPage.goto(photoUrl, { waitUntil: 'networkidle2', timeout: 15000 });
        await sleep(2000);

        // Find the largest image on the page
        const imgSrc = await dlPage.evaluate(() => {
          const imgs = Array.from(document.querySelectorAll('img[src*="scontent"]'));
          let best = null;
          let bestSize = 0;
          for (const img of imgs) {
            const w = img.naturalWidth || img.width || parseInt(img.getAttribute('width') || 0);
            const h = img.naturalHeight || img.height || parseInt(img.getAttribute('height') || 0);
            const size = w * h;
            if (size > bestSize) {
              bestSize = size;
              best = img.src;
            }
          }
          return best;
        });

        if (imgSrc) {
          // Download via page context (has FB cookies)
          const imgData = await dlPage.evaluate(async (url) => {
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
          }, imgSrc);

          if (imgData) {
            const base64 = imgData.split(',')[1];
            if (base64) {
              const buf = Buffer.from(base64, 'base64');
              if (buf.length > 5000) {
                fs.writeFileSync(filepath, buf);
                albumDownloaded++;
                albumProgress.downloaded.push(filename);
                doneFbids.add(fbid);
                albumProgress.doneFbids = [...doneFbids];
                progress.totalDownloaded++;

                if (albumDownloaded <= 5 || albumDownloaded % 25 === 0) {
                  console.log(`  [${albumDownloaded}/${toDownload.length}] ${filename} (${(buf.length/1024).toFixed(0)}KB)`);
                }
              }
            }
          }
        }
      } catch (err) {
        // Skip errors on individual photos
        if (i % 50 === 0) {
          console.log(`  [${i+1}] Error: ${err.message.substring(0, 40)}`);
        }
      }

      // Rate limiting - be gentle
      if (i % 5 === 0) await sleep(500);
      if (i % 20 === 0) await sleep(1000);

      // Save progress every 50 photos
      if (albumDownloaded > 0 && albumDownloaded % 50 === 0) {
        saveProgress(progress);
        console.log(`  💾 Progress saved (${albumDownloaded} this album, ${progress.totalDownloaded} total)`);
      }
    }

    await dlPage.close();
    
    // Save progress after each album
    saveProgress(progress);
    grandTotal += albumDownloaded;

    console.log(`\n  ✓ Album "${album.name}": ${albumDownloaded} new photos downloaded`);
    console.log(`    (${doneFbids.size} total including previous runs)`);
  }

  // Final summary
  console.log('\n' + '═'.repeat(60));
  console.log('DOWNLOAD COMPLETE!');
  console.log(`  New photos this run: ${grandTotal}`);
  console.log(`  Total downloaded: ${progress.totalDownloaded}`);
  
  const galleryFiles = fs.readdirSync(GALLERY_DIR).filter(f => f.endsWith('.jpg') || f.endsWith('.png'));
  console.log(`  Gallery directory: ${galleryFiles.length} files`);
  
  // Group by album
  const byPrefix = {};
  for (const f of galleryFiles) {
    const match = f.match(/^(.+?)-\d+\.jpg$/);
    const prefix = match ? match[1] : 'other';
    byPrefix[prefix] = (byPrefix[prefix] || 0) + 1;
  }
  console.log('\n  Photos by album prefix:');
  Object.entries(byPrefix).sort((a,b) => b[1] - a[1]).forEach(([p, c]) => {
    console.log(`    ${p}: ${c}`);
  });
  
  console.log('\n  Browser left open. Close manually when done.');
  console.log('═'.repeat(60));
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });
