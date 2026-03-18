#!/usr/bin/env node
/**
 * Download all photos from BANF Instagram account via Graph API
 * Usage: node _download-ig-photos.js
 * 
 * Required: Set FB_PAGE_ACCESS_TOKEN and IG_BUSINESS_ACCOUNT_ID below (or in .banf-secrets.json)
 * Note: Instagram Graph API uses the Facebook Page Access Token + IG Business Account ID
 */

const fs = require('fs');
const path = require('path');

// ─── CREDENTIALS (will be filled in) ───
let FB_PAGE_ACCESS_TOKEN = '';
let IG_BUSINESS_ACCOUNT_ID = '';

// Try loading from secrets file
try {
  const secrets = JSON.parse(fs.readFileSync('.banf-secrets.json', 'utf8'));
  FB_PAGE_ACCESS_TOKEN = secrets.FB_PAGE_ACCESS_TOKEN || FB_PAGE_ACCESS_TOKEN;
  IG_BUSINESS_ACCOUNT_ID = secrets.IG_BUSINESS_ACCOUNT_ID || IG_BUSINESS_ACCOUNT_ID;
} catch (_) {}

if (!FB_PAGE_ACCESS_TOKEN) {
  console.error('ERROR: FB_PAGE_ACCESS_TOKEN not set.');
  console.error('Add it to .banf-secrets.json or set it directly in this script.');
  process.exit(1);
}

const GALLERY_DIR = path.join(__dirname, 'docs', 'gallery');
const API_BASE = 'https://graph.facebook.com/v19.0';

async function getIGAccountId() {
  if (IG_BUSINESS_ACCOUNT_ID) return IG_BUSINESS_ACCOUNT_ID;
  
  // Look up IG Business Account from the Page's connected Instagram
  console.log('Looking up Instagram Business Account ID via Facebook Page...');
  const r = await fetch(`${API_BASE}/me?fields=instagram_business_account&access_token=${FB_PAGE_ACCESS_TOKEN}`);
  const d = await r.json();
  if (d.error) throw new Error(`Graph API error: ${d.error.message}`);
  
  if (!d.instagram_business_account) {
    console.error('No Instagram Business Account connected to this Facebook Page.');
    console.error('Make sure the Instagram account (@banf_jax) is connected as a Business account to the Facebook page.');
    process.exit(1);
  }
  
  console.log(`Instagram Business Account ID: ${d.instagram_business_account.id}`);
  return d.instagram_business_account.id;
}

async function getAllMedia(igId) {
  const media = [];
  let url = `${API_BASE}/${igId}/media?fields=id,media_type,media_url,thumbnail_url,timestamp,caption,permalink,children{media_url,media_type}&limit=50&access_token=${FB_PAGE_ACCESS_TOKEN}`;
  
  while (url) {
    console.log(`Fetching media... (${media.length} so far)`);
    const r = await fetch(url);
    const d = await r.json();
    if (d.error) throw new Error(`Graph API error: ${d.error.message}`);
    
    if (d.data) {
      for (const item of d.data) {
        if (item.media_type === 'IMAGE') {
          media.push({
            id: item.id,
            url: item.media_url,
            timestamp: item.timestamp,
            caption: item.caption || '',
            permalink: item.permalink,
            type: 'image'
          });
        } else if (item.media_type === 'CAROUSEL_ALBUM' && item.children) {
          // Carousel: download each image in the album
          for (const child of item.children.data) {
            if (child.media_type === 'IMAGE') {
              media.push({
                id: child.id || item.id,
                url: child.media_url,
                timestamp: item.timestamp,
                caption: item.caption || '',
                permalink: item.permalink,
                type: 'carousel'
              });
            }
          }
        } else if (item.media_type === 'VIDEO') {
          // Use thumbnail for videos
          if (item.thumbnail_url) {
            media.push({
              id: item.id,
              url: item.thumbnail_url,
              timestamp: item.timestamp,
              caption: `[Video] ${item.caption || ''}`,
              permalink: item.permalink,
              type: 'video_thumb'
            });
          }
        }
      }
    }
    
    url = d.paging?.next || null;
  }
  
  return media;
}

function classifyMedia(item) {
  const date = new Date(item.timestamp);
  const year = date.getFullYear();
  
  let event = 'general';
  const text = (item.caption || '').toLowerCase();
  
  if (text.includes('puja') || text.includes('durga') || text.includes('navratri')) event = 'puja';
  else if (text.includes('spandan') || text.includes('cultural') || text.includes('dance') || text.includes('performance')) event = 'cultural';
  else if (text.includes('picnic') || text.includes('bbq') || text.includes('outing') || text.includes('gathering')) event = 'picnic';
  else if (text.includes('sport') || text.includes('cricket') || text.includes('tennis') || text.includes('badminton')) event = 'sports';
  else if (text.includes('holi') || text.includes('diwali') || text.includes('saraswati') || text.includes('lakshmi')) event = 'festival';
  else if (text.includes('agm') || text.includes('meeting') || text.includes('election') || text.includes('committee')) event = 'meeting';
  else if (text.includes('beach') || text.includes('cleanup') || text.includes('volunteer')) event = 'community';
  else if (text.includes('new year') || text.includes('pohela') || text.includes('boishakh') || text.includes('bosonto')) event = 'newyear';
  else if (text.includes('eid') || text.includes('iftar')) event = 'eid';
  
  return { year, event };
}

function sanitizeFilename(s) {
  return s.replace(/[^a-zA-Z0-9_-]/g, '-').replace(/-+/g, '-').substring(0, 50);
}

async function downloadMedia(item, filename) {
  const filepath = path.join(GALLERY_DIR, filename);
  if (fs.existsSync(filepath)) {
    console.log(`  Skip (exists): ${filename}`);
    return false;
  }
  
  const r = await fetch(item.url);
  if (!r.ok) { console.log(`  FAIL: ${filename} (${r.status})`); return false; }
  const buf = Buffer.from(await r.arrayBuffer());
  fs.writeFileSync(filepath, buf);
  console.log(`  Downloaded: ${filename} (${(buf.length / 1024).toFixed(0)}KB)`);
  return true;
}

async function main() {
  console.log('=== BANF Instagram Photo Downloader ===\n');
  
  const igId = await getIGAccountId();
  console.log(`\nFetching all media from IG account ${igId}...`);
  
  const media = await getAllMedia(igId);
  console.log(`\nFound ${media.length} images total.\n`);
  
  if (media.length === 0) {
    console.log('No media found. Check that the token has instagram_basic permission.');
    return;
  }
  
  // Ensure gallery directory exists
  if (!fs.existsSync(GALLERY_DIR)) fs.mkdirSync(GALLERY_DIR, { recursive: true });
  
  // Classify and download
  const classified = {};
  let downloaded = 0;
  
  for (const item of media) {
    const { year, event } = classifyMedia(item);
    const key = `${year}`;
    if (!classified[key]) classified[key] = [];
    
    const idx = classified[key].length + 1;
    const captionSlug = sanitizeFilename(item.caption.substring(0, 50) || event);
    const filename = `ig-${year}-${event}-${String(idx).padStart(2, '0')}-${captionSlug}.jpg`;
    
    classified[key].push({
      file: filename,
      caption: item.caption || `Instagram post (${new Date(item.timestamp).toLocaleDateString()})`,
      year,
      event,
      created: item.timestamp,
      permalink: item.permalink
    });
    
    if (await downloadMedia(item, filename)) downloaded++;
    
    // Rate limit
    await new Promise(r => setTimeout(r, 300));
  }
  
  // Save classification data
  const outputFile = path.join(__dirname, '_ig-photo-data.json');
  fs.writeFileSync(outputFile, JSON.stringify(classified, null, 2));
  console.log(`\n=== Summary ===`);
  console.log(`Total images found: ${media.length}`);
  console.log(`New downloads: ${downloaded}`);
  console.log(`Classification saved to: _ig-photo-data.json`);
  Object.keys(classified).sort().forEach(year => {
    console.log(`  ${year}: ${classified[year].length} images`);
  });
}

main().catch(e => { console.error('Fatal:', e.message); process.exit(1); });
