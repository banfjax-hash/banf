#!/usr/bin/env node
/**
 * Download all photos from BANF Facebook page via Graph API
 * Usage: node _download-fb-photos.js
 * 
 * Required: Set FB_PAGE_ACCESS_TOKEN and FB_PAGE_ID below (or in .banf-secrets.json)
 */

const fs = require('fs');
const path = require('path');

// ─── CREDENTIALS (will be filled in) ───
let FB_PAGE_ACCESS_TOKEN = '';
let FB_PAGE_ID = '';

// Try loading from secrets file
try {
  const secrets = JSON.parse(fs.readFileSync('.banf-secrets.json', 'utf8'));
  FB_PAGE_ACCESS_TOKEN = secrets.FB_PAGE_ACCESS_TOKEN || FB_PAGE_ACCESS_TOKEN;
  FB_PAGE_ID = secrets.FB_PAGE_ID || FB_PAGE_ID;
} catch (_) {}

if (!FB_PAGE_ACCESS_TOKEN) {
  console.error('ERROR: FB_PAGE_ACCESS_TOKEN not set.');
  console.error('Add it to .banf-secrets.json or set it directly in this script.');
  process.exit(1);
}

const GALLERY_DIR = path.join(__dirname, 'docs', 'gallery');
const API_BASE = 'https://graph.facebook.com/v19.0';

async function getPageId() {
  if (FB_PAGE_ID) return FB_PAGE_ID;
  // Look up page ID from the token
  console.log('Looking up Page ID...');
  const r = await fetch(`${API_BASE}/me?access_token=${FB_PAGE_ACCESS_TOKEN}`);
  const d = await r.json();
  if (d.error) throw new Error(`Graph API error: ${d.error.message}`);
  console.log(`Page: ${d.name} (ID: ${d.id})`);
  return d.id;
}

async function getAllPhotos(pageId) {
  const photos = [];
  let url = `${API_BASE}/${pageId}/photos?type=uploaded&fields=images,created_time,name,album&limit=100&access_token=${FB_PAGE_ACCESS_TOKEN}`;
  
  while (url) {
    console.log(`Fetching photos... (${photos.length} so far)`);
    const r = await fetch(url);
    const d = await r.json();
    if (d.error) throw new Error(`Graph API error: ${d.error.message}`);
    
    if (d.data) {
      for (const photo of d.data) {
        // Get the largest image
        const largest = photo.images.reduce((a, b) => (a.width * a.height > b.width * b.height) ? a : b);
        photos.push({
          id: photo.id,
          url: largest.source,
          width: largest.width,
          height: largest.height,
          created: photo.created_time,
          caption: photo.name || '',
          album: photo.album?.name || 'Uncategorized'
        });
      }
    }
    
    url = d.paging?.next || null;
  }
  
  return photos;
}

function classifyPhoto(photo) {
  const date = new Date(photo.created);
  const year = date.getFullYear();
  
  // Try to determine event from caption or album
  let event = 'general';
  const text = `${photo.caption} ${photo.album}`.toLowerCase();
  
  if (text.includes('puja') || text.includes('durga')) event = 'puja';
  else if (text.includes('spandan') || text.includes('cultural')) event = 'cultural';
  else if (text.includes('picnic') || text.includes('bbq') || text.includes('outing')) event = 'picnic';
  else if (text.includes('sport') || text.includes('cricket') || text.includes('tennis')) event = 'sports';
  else if (text.includes('holi') || text.includes('diwali') || text.includes('saraswati')) event = 'festival';
  else if (text.includes('agm') || text.includes('meeting') || text.includes('election')) event = 'meeting';
  else if (text.includes('beach') || text.includes('cleanup') || text.includes('volunteer')) event = 'community';
  else if (text.includes('new year') || text.includes('pohela') || text.includes('boishakh') || text.includes('bosonto')) event = 'newyear';
  
  return { year, event };
}

function sanitizeFilename(s) {
  return s.replace(/[^a-zA-Z0-9_-]/g, '-').replace(/-+/g, '-').substring(0, 60);
}

async function downloadPhoto(photo, filename) {
  const filepath = path.join(GALLERY_DIR, filename);
  if (fs.existsSync(filepath)) {
    console.log(`  Skip (exists): ${filename}`);
    return false;
  }
  
  const r = await fetch(photo.url);
  if (!r.ok) { console.log(`  FAIL: ${filename} (${r.status})`); return false; }
  const buf = Buffer.from(await r.arrayBuffer());
  fs.writeFileSync(filepath, buf);
  console.log(`  Downloaded: ${filename} (${(buf.length / 1024).toFixed(0)}KB)`);
  return true;
}

async function main() {
  console.log('=== BANF Facebook Photo Downloader ===\n');
  
  const pageId = await getPageId();
  console.log(`\nFetching all photos from page ${pageId}...`);
  
  const photos = await getAllPhotos(pageId);
  console.log(`\nFound ${photos.length} photos total.\n`);
  
  if (photos.length === 0) {
    console.log('No photos found. Check that the token has pages_read_user_content permission.');
    return;
  }
  
  // Ensure gallery directory exists
  if (!fs.existsSync(GALLERY_DIR)) fs.mkdirSync(GALLERY_DIR, { recursive: true });
  
  // Classify and download
  const classified = {};
  let downloaded = 0;
  
  for (const photo of photos) {
    const { year, event } = classifyPhoto(photo);
    const key = `${year}`;
    if (!classified[key]) classified[key] = [];
    
    const idx = classified[key].length + 1;
    const captionSlug = sanitizeFilename(photo.caption || photo.album || event);
    const filename = `fb-${year}-${event}-${String(idx).padStart(2, '0')}-${captionSlug}.jpg`;
    
    classified[key].push({
      file: filename,
      caption: photo.caption || `${photo.album} (${new Date(photo.created).toLocaleDateString()})`,
      year,
      event,
      created: photo.created
    });
    
    if (await downloadPhoto(photo, filename)) downloaded++;
    
    // Rate limit: small delay between downloads
    await new Promise(r => setTimeout(r, 200));
  }
  
  // Save classification data
  const outputFile = path.join(__dirname, '_fb-photo-data.json');
  fs.writeFileSync(outputFile, JSON.stringify(classified, null, 2));
  console.log(`\n=== Summary ===`);
  console.log(`Total photos found: ${photos.length}`);
  console.log(`New downloads: ${downloaded}`);
  console.log(`Classification saved to: _fb-photo-data.json`);
  Object.keys(classified).sort().forEach(year => {
    console.log(`  ${year}: ${classified[year].length} photos`);
  });
}

main().catch(e => { console.error('Fatal:', e.message); process.exit(1); });
