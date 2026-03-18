#!/usr/bin/env node
/**
 * BANF Facebook Photo Agent
 * 
 * Opens a VISIBLE Chrome browser so YOU can log in to Facebook.
 * Then automatically navigates every album, clicks through every photo,
 * and downloads the full-size version.
 * 
 * Usage: node _fb-photo-agent.js
 * 
 * Step 1: Browser opens Facebook login page → YOU log in manually
 * Step 2: Press ENTER in this terminal when logged in
 * Step 3: Agent takes over - navigates albums, downloads everything
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

// ─── CONFIG ───
const FB_PAGE = 'banfofficial';
const GALLERY_DIR = path.join(__dirname, 'docs', 'gallery');
const DATA_FILE = path.join(__dirname, '_fb-agent-progress.json');
const DOWNLOAD_DELAY = 500;  // ms between downloads
const SCROLL_DELAY = 1500;   // ms between scrolls
const MAX_SCROLL_ATTEMPTS = 200; // max scrolls per album

// Album configs - from our earlier scrape
const ALBUMS = [
  { name: 'Durga Puja 2025',          setId: 'a.1221583500009872', year: 2025, expected: 20 },
  { name: 'Spandan 2025',             setId: 'a.1180264127475143', year: 2025, expected: 357 },
  { name: 'Sports Day 2025',          setId: 'a.1102569225244634', year: 2025, expected: 58 },
  { name: 'Anandadhara Returns 2023', setId: 'a.673000554868172',  year: 2023, expected: 105 },
  { name: 'Mobile Uploads',           setId: 'a.360315859469978',  year: null, expected: 1159 },
  { name: 'Photos',                   setId: 'a.360315866136644',  year: null, expected: 568 },
];

function askUser(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => rl.question(question, ans => { rl.close(); resolve(ans); }));
}

function slug(s) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '').substring(0, 50);
}

function loadProgress() {
  try { return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')); }
  catch { return { downloaded: {}, albums: {} }; }
}

function saveProgress(progress) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(progress, null, 2));
}

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function downloadImage(page, url, filepath) {
  try {
    const response = await page.evaluate(async (imageUrl) => {
      const resp = await fetch(imageUrl, { credentials: 'include' });
      if (!resp.ok) return null;
      const blob = await resp.blob();
      const reader = new FileReader();
      return new Promise(resolve => {
        reader.onload = () => resolve(reader.result);
        reader.readAsDataURL(blob);
      });
    }, url);
    
    if (!response) return false;
    
    // Convert data URL to buffer
    const base64 = response.split(',')[1];
    const buf = Buffer.from(base64, 'base64');
    if (buf.length < 5000) return false; // too small
    
    fs.writeFileSync(filepath, buf);
    return true;
  } catch (e) {
    return false;
  }
}

async function scrapeAlbumViaScroll(page, album, progress) {
  const albumSlug = slug(album.name);
  const albumDir = path.join(GALLERY_DIR, albumSlug);
  if (!fs.existsSync(albumDir)) fs.mkdirSync(albumDir, { recursive: true });
  
  if (!progress.albums[album.name]) {
    progress.albums[album.name] = { photoIds: [], downloaded: 0, total: album.expected };
  }
  const albumProgress = progress.albums[album.name];
  
  const url = `https://www.facebook.com/media/set/?set=${album.setId}&type=3`;
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`Album: ${album.name} (expected ~${album.expected} photos)`);
  console.log(`URL: ${url}`);
  console.log(`${'═'.repeat(60)}`);
  
  await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
  await sleep(2000);
  
  // Strategy: Intercept GraphQL responses that contain photo data
  const photoUrls = new Map(); // fbid -> {url, alt}
  
  // Set up response interceptor for GraphQL/ajax calls
  page.on('response', async (response) => {
    const reqUrl = response.url();
    if (reqUrl.includes('graphql') || reqUrl.includes('api/graphql')) {
      try {
        const text = await response.text();
        // Extract image URLs from GraphQL responses
        const imageMatches = text.matchAll(/"uri":"(https:\/\/scontent[^"]+)"/g);
        for (const m of imageMatches) {
          const imgUrl = m[1].replace(/\\\//g, '/');
          // Look for large images (width > 500)
          if (imgUrl.includes('_n.') || imgUrl.includes('p960x960') || imgUrl.includes('s960x960')) {
            // Try to find associated fbid
            const fbidMatch = text.match(new RegExp(`"(\\d{10,20})"[^}]*?"uri":"${imgUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').substring(0, 50)}`));
            photoUrls.set(imgUrl, { url: imgUrl, fromGraphQL: true });
          }
        }
      } catch {}
    }
  });
  
  // Also intercept image responses directly
  page.on('response', async (response) => {
    const url = response.url();
    if (url.includes('scontent') && response.status() === 200) {
      const ct = response.headers()['content-type'] || '';
      const cl = parseInt(response.headers()['content-length'] || '0');
      if (ct.includes('image') && cl > 50000) {
        photoUrls.set(url, { url, size: cl, fromNetwork: true });
      }
    }
  });

  // Scroll aggressively to load all photos
  let prevCount = 0;
  let noNewCount = 0;
  
  for (let scroll = 0; scroll < MAX_SCROLL_ATTEMPTS; scroll++) {
    // Get photo links from DOM
    const domPhotos = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('a[href*="fbid="]'));
      const results = [];
      const seen = new Set();
      for (const a of links) {
        const m = a.href.match(/fbid=(\d+)/);
        if (m && !seen.has(m[1])) {
          seen.add(m[1]);
          // Find the img inside this link
          const img = a.querySelector('img[src*="scontent"]');
          results.push({
            fbid: m[1],
            href: a.href,
            imgSrc: img ? img.src : null,
            alt: img ? img.alt : ''
          });
        }
      }
      return results;
    });
    
    const currentCount = domPhotos.length;
    
    if (scroll % 10 === 0 || currentCount !== prevCount) {
      process.stdout.write(`\r  Scroll ${scroll + 1}: ${currentCount} photos in DOM, ${photoUrls.size} from network`);
    }
    
    if (currentCount === prevCount) {
      noNewCount++;
      if (noNewCount >= 15) {
        console.log(`\n  Scrolling stopped: no new photos after ${noNewCount} scrolls`);
        break;
      }
    } else {
      noNewCount = 0;
    }
    prevCount = currentCount;
    
    // Scroll to bottom
    await page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight);
    });
    await sleep(SCROLL_DELAY);
    
    // Also try clicking "See more" or loading spinners
    try {
      const seeMore = await page.$('div[role="button"]:has-text("See more")');
      if (seeMore) await seeMore.click();
    } catch {}
  }
  
  // Get final DOM state
  const finalPhotos = await page.evaluate(() => {
    const links = Array.from(document.querySelectorAll('a[href*="fbid="]'));
    const results = [];
    const seen = new Set();
    for (const a of links) {
      const m = a.href.match(/fbid=(\d+)/);
      if (m && !seen.has(m[1])) {
        seen.add(m[1]);
        const img = a.querySelector('img[src*="scontent"]');
        results.push({
          fbid: m[1],
          href: a.href,
          imgSrc: img ? img.src : null,
          alt: img ? img.alt : ''
        });
      }
    }
    return results;
  });
  
  console.log(`\n  Final count: ${finalPhotos.length} photos found in DOM`);
  
  // Now visit each photo page to get full-size image
  let downloaded = 0;
  let skipped = 0;
  
  for (let i = 0; i < finalPhotos.length; i++) {
    const photo = finalPhotos[i];
    const filename = `${albumSlug}-${String(i + 1).padStart(4, '0')}-${photo.fbid}.jpg`;
    const filepath = path.join(albumDir, filename);
    
    // Skip if already downloaded
    if (progress.downloaded[photo.fbid] || fs.existsSync(filepath)) {
      skipped++;
      continue;
    }
    
    process.stdout.write(`\r  Downloading [${i + 1}/${finalPhotos.length}] ${filename}...`);
    
    try {
      // Open photo in the lightbox viewer
      const photoPage = await page.browser().newPage();
      await photoPage.setViewport({ width: 1440, height: 900 });
      await photoPage.goto(photo.href, { waitUntil: 'networkidle2', timeout: 20000 });
      await sleep(1000);
      
      // Get the largest image from the photo viewer
      const bestImg = await photoPage.evaluate(() => {
        const imgs = Array.from(document.querySelectorAll('img[src*="scontent"]'));
        // Sort by size
        imgs.sort((a, b) => {
          const aS = (a.naturalWidth || 0) * (a.naturalHeight || 0);
          const bS = (b.naturalWidth || 0) * (b.naturalHeight || 0);
          return bS - aS;
        });
        if (imgs.length === 0) return null;
        return {
          src: imgs[0].src,
          width: imgs[0].naturalWidth,
          height: imgs[0].naturalHeight,
          alt: imgs[0].alt || ''
        };
      });
      
      if (bestImg && bestImg.src) {
        const ok = await downloadImage(photoPage, bestImg.src, filepath);
        if (ok) {
          const stat = fs.statSync(filepath);
          progress.downloaded[photo.fbid] = {
            file: filename,
            album: album.name,
            year: album.year,
            size: stat.size,
            alt: bestImg.alt
          };
          downloaded++;
        }
      }
      
      await photoPage.close();
    } catch (e) {
      // Silently continue
    }
    
    // Save progress every 10 downloads
    if (downloaded % 10 === 0 && downloaded > 0) {
      saveProgress(progress);
    }
    
    await sleep(DOWNLOAD_DELAY);
  }
  
  albumProgress.downloaded = downloaded;
  albumProgress.photoIds = finalPhotos.map(p => p.fbid);
  saveProgress(progress);
  
  console.log(`\n  ✓ Album done: ${downloaded} new, ${skipped} skipped`);
  return downloaded;
}

async function main() {
  console.log('╔════════════════════════════════════════════════════╗');
  console.log('║   BANF Facebook Photo Download Agent              ║');
  console.log('║   Downloads ALL photos from ALL Facebook albums   ║');
  console.log('╚════════════════════════════════════════════════════╝\n');
  
  // Ensure gallery directory exists
  if (!fs.existsSync(GALLERY_DIR)) fs.mkdirSync(GALLERY_DIR, { recursive: true });
  
  // Load previous progress
  const progress = loadProgress();
  const prevDownloaded = Object.keys(progress.downloaded).length;
  if (prevDownloaded > 0) {
    console.log(`Resuming: ${prevDownloaded} photos already downloaded\n`);
  }
  
  // Launch VISIBLE browser
  console.log('Launching Chrome (visible mode)...');
  const browser = await puppeteer.launch({
    headless: false,         // VISIBLE so user can log in
    defaultViewport: null,   // Use full window
    args: [
      '--start-maximized',
      '--disable-blink-features=AutomationControlled'
    ]
  });
  
  const page = (await browser.pages())[0];
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
  
  // Navigate to Facebook
  console.log('\nOpening Facebook...');
  await page.goto('https://www.facebook.com', { waitUntil: 'networkidle2', timeout: 30000 });
  
  // Check if already logged in
  const isLoggedIn = await page.evaluate(() => {
    return !document.querySelector('input[name="email"]') && !document.querySelector('#login_form');
  });
  
  if (!isLoggedIn) {
    console.log('\n┌─────────────────────────────────────────────────┐');
    console.log('│  Please LOG IN to Facebook in the browser window │');
    console.log('│  Then come back here and press ENTER             │');
    console.log('└─────────────────────────────────────────────────┘');
    await askUser('\nPress ENTER when logged in to Facebook... ');
  } else {
    console.log('Already logged in to Facebook!');
  }
  
  // Verify login by going to the BANF page
  console.log('\nVerifying access to BANF page...');
  await page.goto(`https://www.facebook.com/${FB_PAGE}/photos_albums`, {
    waitUntil: 'networkidle2', timeout: 30000
  });
  await sleep(2000);
  
  const pageTitle = await page.title();
  console.log(`Page: ${pageTitle}`);
  
  // Discover albums dynamically
  console.log('\nDiscovering albums...');
  const discoveredAlbums = await page.evaluate(() => {
    const links = Array.from(document.querySelectorAll('a[href*="/media/set"]'));
    return links.map(a => {
      const setMatch = a.href.match(/set=([^&]+)/);
      return {
        url: a.href,
        setId: setMatch ? setMatch[1] : '',
        text: a.innerText.trim().replace(/\n+/g, ' | ').substring(0, 100)
      };
    }).filter(a => a.setId);
  });
  
  console.log(`\nFound ${discoveredAlbums.length} albums:`);
  discoveredAlbums.forEach((a, i) => console.log(`  ${i + 1}. ${a.text}`));
  
  // Merge discovered albums with our known album config
  const allAlbums = [];
  for (const disc of discoveredAlbums) {
    const known = ALBUMS.find(a => a.setId === disc.setId);
    if (known) {
      allAlbums.push(known);
    } else {
      // Parse name and count from text
      const parts = disc.text.split('|').map(s => s.trim());
      const name = parts[0] || 'Unknown Album';
      const countMatch = disc.text.match(/(\d[\d,]+)\s*Items?/i);
      const expected = countMatch ? parseInt(countMatch[1].replace(/,/g, '')) : 50;
      allAlbums.push({
        name,
        setId: disc.setId,
        year: name.match(/202\d/) ? parseInt(name.match(/(202\d)/)[1]) : null,
        expected
      });
    }
  }
  
  console.log(`\n${'═'.repeat(60)}`);
  console.log('Starting download of ALL albums...');
  console.log(`${'═'.repeat(60)}`);
  
  let totalDownloaded = 0;
  
  for (const album of allAlbums) {
    // Skip profile pictures and cover photos
    if (album.name.toLowerCase().includes('profile') || album.name.toLowerCase().includes('cover')) {
      console.log(`\n  Skipping: ${album.name}`);
      continue;
    }
    
    try {
      const count = await scrapeAlbumViaScroll(page, album, progress);
      totalDownloaded += count;
    } catch (e) {
      console.log(`\n  ERROR in ${album.name}: ${e.message}`);
    }
  }
  
  // Final summary
  const allDownloaded = Object.keys(progress.downloaded).length;
  console.log(`\n${'═'.repeat(60)}`);
  console.log('╔════════════════════════════════════════════════════╗');
  console.log(`║  DONE! Total photos: ${allDownloaded} downloaded              ║`);
  console.log('╚════════════════════════════════════════════════════╝\n');
  
  // Summary by album
  for (const [name, data] of Object.entries(progress.albums)) {
    console.log(`  ${name}: ${data.photoIds?.length || 0} found, ${data.downloaded || 0} new`);
  }
  
  // List gallery folders
  console.log('\nGallery folders:');
  const folders = fs.readdirSync(GALLERY_DIR).filter(f => {
    return fs.statSync(path.join(GALLERY_DIR, f)).isDirectory();
  });
  for (const folder of folders) {
    const files = fs.readdirSync(path.join(GALLERY_DIR, folder)).filter(f => f.endsWith('.jpg'));
    const totalSize = files.reduce((s, f) => s + fs.statSync(path.join(GALLERY_DIR, folder, f)).size, 0);
    console.log(`  ${folder}/: ${files.length} photos (${(totalSize / 1024 / 1024).toFixed(1)} MB)`);
  }
  
  saveProgress(progress);
  console.log('\nProgress saved. You can re-run this script to resume.');
  console.log('Press ENTER to close the browser...');
  await askUser('');
  await browser.close();
}

main().catch(e => { console.error('Fatal:', e.message); process.exit(1); });
