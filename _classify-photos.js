#!/usr/bin/env node
/**
 * BANF Photo Classifier
 * 
 * 1. Album photos → classified directly by album name + year
 * 2. Mobile Uploads & Photos → visits each photo on FB via Edge (port 9222)
 *    to scrape post text, descriptions, and comments for event/year info
 * 
 * Output: _photo-classifications.json with { filename: { event, year, source } }
 * 
 * Usage: node _classify-photos.js
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const GALLERY_DIR = path.join(__dirname, 'docs', 'gallery');
const OUTPUT_FILE = path.join(__dirname, '_photo-classifications.json');
const PROGRESS_FILE = path.join(__dirname, '_classify-progress.json');

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function loadProgress() {
  try { return JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf8')); }
  catch { return {}; }
}
function saveProgress(prog) {
  fs.writeFileSync(PROGRESS_FILE, JSON.stringify(prog, null, 2));
}

// ── Direct album classification ──
const ALBUM_MAP = {
  'spandan-2025':             { event: 'Spandan 2025',             year: 2025 },
  'sports-day-2025':          { event: 'Sports Day 2025',          year: 2025 },
  'durga-puja-2025':          { event: 'Durga Puja 2025',          year: 2025 },
  'anandadhara-returns-2023': { event: 'Anandadhara Returns 2023', year: 2023 },
  // Legacy names from earlier scrapes
  'spandan-2025-fb':          { event: 'Spandan 2025',             year: 2025 },
  'sports-day-2025-fb':       { event: 'Sports Day 2025',          year: 2025 },
  'durga-puja-2025-fb':       { event: 'Durga Puja 2025',          year: 2025 },
  'durga-puja-2025-ig':       { event: 'Durga Puja 2025',          year: 2025 },
  'anandadhara-2023-fb':      { event: 'Anandadhara Returns 2023', year: 2023 },
  'anand-bazar-2026-fb':      { event: 'Anand Bazar 2026',         year: 2026 },
  'banf-event-fb':            { event: 'BANF Event',               year: 2025 },
  'banf-2025-ig':             { event: 'BANF 2025',                year: 2025 },
  'holi-gaan-2025-ig':        { event: 'Holi Gaan 2025',           year: 2025 },
  'kali-puja-2025-ig':        { event: 'Kali Puja 2025',           year: 2025 },
  'new-year-2026-ig':         { event: 'New Year 2026',            year: 2026 },
  'sponsor-ad-2025-ig':       { event: 'Sponsors',                 year: 2025 },
  'fb-misc':                  { event: 'BANF Miscellaneous',       year: null },
};

// Event keyword detection from text
const EVENT_PATTERNS = [
  { pattern: /durga\s*puja/i,                      event: 'Durga Puja',            yearHint: null },
  { pattern: /spandan/i,                            event: 'Spandan',               yearHint: null },
  { pattern: /sports?\s*day/i,                      event: 'Sports Day',            yearHint: null },
  { pattern: /anandadhara/i,                         event: 'Anandadhara Returns',   yearHint: null },
  { pattern: /anand\s*bazar|anand\s*bazaar/i,       event: 'Anand Bazar',           yearHint: null },
  { pattern: /kali\s*puja/i,                        event: 'Kali Puja',             yearHint: null },
  { pattern: /holi|dol\s*jatra|dol\s*yatra/i,      event: 'Holi Gaan',             yearHint: null },
  { pattern: /diwali|deepavali|deepawali/i,         event: 'Diwali',                yearHint: null },
  { pattern: /saraswati\s*puja/i,                   event: 'Saraswati Puja',        yearHint: null },
  { pattern: /new\s*year/i,                         event: 'New Year Celebration',  yearHint: null },
  { pattern: /picnic/i,                             event: 'Picnic',                yearHint: null },
  { pattern: /bbq|barbeque|barbecue/i,              event: 'BBQ',                   yearHint: null },
  { pattern: /beach/i,                              event: 'Beach Event',           yearHint: null },
  { pattern: /cricket/i,                            event: 'Cricket',               yearHint: null },
  { pattern: /tennis/i,                             event: 'Tennis',                yearHint: null },
  { pattern: /badminton/i,                          event: 'Badminton',             yearHint: null },
  { pattern: /independence\s*day/i,                 event: 'Independence Day',      yearHint: null },
  { pattern: /republic\s*day/i,                     event: 'Republic Day',          yearHint: null },
  { pattern: /rabindra|tagore/i,                    event: 'Rabindra Jayanti',      yearHint: null },
  { pattern: /nabo\s*borsho|poila\s*boisakh|bengali\s*new\s*year/i, event: 'Poila Boisakh', yearHint: null },
  { pattern: /general\s*(body\s*)?meeting|gbm|agm/i, event: 'General Meeting',     yearHint: null },
  { pattern: /election/i,                           event: 'Election',              yearHint: null },
  { pattern: /board\s*meeting/i,                    event: 'Board Meeting',         yearHint: null },
  { pattern: /fund\s*rais/i,                        event: 'Fundraiser',            yearHint: null },
  { pattern: /camp\s*/i,                            event: 'Camp',                  yearHint: null },
  { pattern: /women'?s?\s*day/i,                    event: "International Women's Day", yearHint: null },
  { pattern: /laxmi\s*puja|lakshmi\s*puja/i,       event: 'Laxmi Puja',            yearHint: null },
  { pattern: /ganesh\s*puja|ganesh\s*chaturthi/i,  event: 'Ganesh Puja',           yearHint: null },
  { pattern: /rath\s*yatra/i,                       event: 'Rath Yatra',            yearHint: null },
  { pattern: /janmashtami|krishna/i,               event: 'Janmashtami',           yearHint: null },
  { pattern: /welcome\s*party/i,                    event: 'Welcome Party',         yearHint: null },
  { pattern: /farewell/i,                           event: 'Farewell',              yearHint: null },
  { pattern: /thanksgiving/i,                       event: 'Thanksgiving',          yearHint: null },
  { pattern: /christmas|xmas/i,                     event: 'Christmas',             yearHint: null },
  { pattern: /halloween/i,                          event: 'Halloween',             yearHint: null },
  { pattern: /summer\s*(get[\s-]?together|party|fest)/i, event: 'Summer Get-Together', yearHint: null },
  { pattern: /winter\s*(get[\s-]?together|party|fest)/i, event: 'Winter Get-Together', yearHint: null },
  { pattern: /potluck|pot\s*luck/i,                event: 'Potluck',               yearHint: null },
  { pattern: /cultural\s*(program|evening|event|night)/i, event: 'Cultural Program', yearHint: null },
  { pattern: /movie\s*night|film\s*screening/i,    event: 'Movie Night',           yearHint: null },
  { pattern: /workshop/i,                           event: 'Workshop',              yearHint: null },
  { pattern: /blood\s*drive|blood\s*donat/i,       event: 'Blood Drive',           yearHint: null },
  { pattern: /charity|donat/i,                      event: 'Charity Event',         yearHint: null },
  { pattern: /annual\s*day/i,                       event: 'Annual Day',            yearHint: null },
  { pattern: /graduation/i,                         event: 'Graduation',            yearHint: null },
  { pattern: /birthday/i,                           event: 'Birthday Celebration',  yearHint: null },
  { pattern: /congratulat/i,                        event: 'Congratulations',       yearHint: null },
  { pattern: /volunteer/i,                          event: 'Volunteer Event',       yearHint: null },
  { pattern: /beach\s*clean/i,                      event: 'Beach Cleanup',         yearHint: null },
  { pattern: /trail|hike|hiking/i,                  event: 'Hiking',                yearHint: null },
  { pattern: /food\s*festival|food\s*fest/i,        event: 'Food Festival',         yearHint: null },
  { pattern: /music|concert|performance/i,          event: 'Music & Performance',   yearHint: null },
  { pattern: /dance/i,                              event: 'Dance',                 yearHint: null },
];

function extractYearFromText(text) {
  // Look for 4-digit years in range 2018-2026
  const years = text.match(/20(1[89]|2[0-6])/g);
  if (years && years.length > 0) {
    // Return the most commonly mentioned year
    const counts = {};
    for (const y of years) { counts[y] = (counts[y] || 0) + 1; }
    return parseInt(Object.entries(counts).sort((a,b) => b[1] - a[1])[0][0]);
  }
  return null;
}

function extractDateFromText(text) {
  // Try to extract a date for year determination
  // Patterns: "January 15, 2024", "15 Jan 2024", "01/15/2024", "2024-01-15"
  const datePatterns = [
    /(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+(\d{4})/i,
    /\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{4})/i,
    /\d{1,2}\/\d{1,2}\/(\d{4})/,
    /(\d{4})-\d{2}-\d{2}/,
  ];
  for (const p of datePatterns) {
    const m = text.match(p);
    if (m) return parseInt(m[1]);
  }
  return null;
}

function classifyFromText(text) {
  if (!text) return null;
  
  let event = null;
  for (const ep of EVENT_PATTERNS) {
    if (ep.pattern.test(text)) {
      event = ep.event;
      break;
    }
  }
  
  const year = extractYearFromText(text) || extractDateFromText(text);
  
  // If we found an event, append year if found
  if (event && year) {
    return { event: `${event} ${year}`, year };
  } else if (event) {
    return { event, year };
  } else if (year) {
    return { event: null, year };
  }
  
  return null;
}

async function scrapePhotoInfo(page, fbid) {
  const url = `https://www.facebook.com/photo/?fbid=${fbid}`;
  
  try {
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 15000 });
    await sleep(1500);
    
    const info = await page.evaluate(() => {
      const texts = [];
      
      // Noise filters - skip notification sidebar text 
      const noisePatterns = [
        /^Notifications$/i, /^New See all$/i, /^See previous/i,
        /^Unread/i, /commented on/i, /posted a story/i, /posted a link/i,
        /posted a new reel/i, /likes your/i, /Press Enter/i,
        /^Write a comment/i, /^Most relevant/i, /^Like$/i, /^Reply$/i,
        /reactions? · \d+ comment/i
      ];
      
      function isNoise(t) {
        return noisePatterns.some(p => p.test(t));
      }
      
      // dir=auto elements - filtered for post content only
      let foundPageName = false;
      const dirEls = document.querySelectorAll('[dir="auto"]');
      for (const el of dirEls) {
        const t = el.innerText.trim();
        if (t.length < 5 || t.length > 2000) continue;
        if (isNoise(t)) continue;
        
        // Skip notification sidebar items
        if (t.length < 100 && /^\d+h$/.test(t)) continue;
        
        // Track when we pass the page name to focus on post content
        if (t.includes('Bengali Association') || t.includes('BANF')) {
          foundPageName = true;
        }
        
        texts.push(t);
      }
      
      // Title
      texts.push('TITLE: ' + document.title);
      
      // Comments (role=article are typically comment containers)
      const comments = document.querySelectorAll('[role="article"]');
      for (const c of comments) {
        const t = c.innerText.trim();
        if (t.length > 10 && t.length < 500 && !isNoise(t)) {
          texts.push('COMMENT: ' + t.substring(0, 200));
        }
      }
      
      return texts.join('\n');
    });
    
    return info;
  } catch {
    return null;
  }
}

async function main() {
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║   BANF Photo Classifier                                 ║');
  console.log('║   Albums → direct | Mobile/Photos → FB comment scrape   ║');
  console.log('╚══════════════════════════════════════════════════════════╝\n');

  const allFiles = fs.readdirSync(GALLERY_DIR).filter(f => /\.(jpg|png)$/i.test(f)).sort();
  console.log(`Total gallery files: ${allFiles.length}\n`);

  const classifications = {};
  const progress = loadProgress(); // { fbid: { text, event, year } }

  // ══════════════════════════════════════
  // STEP 1: Classify album photos directly  
  // ══════════════════════════════════════
  console.log('═══ STEP 1: Classifying album photos directly ═══\n');
  
  let directCount = 0;
  const needsScrape = [];
  
  for (const file of allFiles) {
    // Check if filename matches a known album prefix
    let matched = false;
    for (const [prefix, info] of Object.entries(ALBUM_MAP)) {
      if (file.startsWith(prefix + '-')) {
        classifications[file] = { 
          event: info.event, 
          year: info.year, 
          source: 'album' 
        };
        directCount++;
        matched = true;
        break;
      }
    }
    
    if (!matched) {
      // Check for non-album patterns (old Wix / manually named files)
      if (file.startsWith('mobile-uploads-') || file.startsWith('photos-')) {
        // These need FB scraping
        const fbidMatch = file.match(/(\d{6,})\.jpg$/);
        if (fbidMatch) {
          needsScrape.push({ file, fbid: fbidMatch[1] });
        }
      } else {
        // Legacy files (Wix CDN, manually named) - classify by name
        const lowerName = file.toLowerCase();
        let event = 'BANF Event';
        let year = null;
        
        if (lowerName.includes('puja')) { event = 'Puja Celebration'; }
        if (lowerName.includes('cultural')) { event = 'Cultural Event'; }
        if (lowerName.includes('community')) { event = 'Community Event'; }
        if (lowerName.includes('sports') || lowerName.includes('tennis') || lowerName.includes('youth-sports')) { event = 'Sports'; }
        if (lowerName.includes('flyer') || lowerName.includes('poster') || lowerName.includes('roadmap')) { event = 'Flyers & Announcements'; }
        if (lowerName.includes('spandan')) { event = 'Spandan 2025'; year = 2025; }
        if (lowerName.includes('beach')) { event = 'Beach Cleanup'; }
        
        const ym = file.match(/(20\d{2})/);
        if (ym) year = parseInt(ym[1]);
        
        classifications[file] = { event, year, source: 'filename' };
        directCount++;
      }
    }
  }
  
  console.log(`  Directly classified: ${directCount}`);
  console.log(`  Need FB scraping: ${needsScrape.length}\n`);

  // ══════════════════════════════════════
  // STEP 2: Scrape FB for non-album photos
  // ══════════════════════════════════════
  if (needsScrape.length > 0) {
    console.log('═══ STEP 2: Scraping FB comments for event info ═══\n');
    
    // Check how many already have progress
    const alreadyScraped = needsScrape.filter(p => progress[p.fbid]);
    const remaining = needsScrape.filter(p => !progress[p.fbid]);
    console.log(`  Already scraped: ${alreadyScraped.length}`);
    console.log(`  Remaining to scrape: ${remaining.length}\n`);
    
    // Apply already-scraped classifications
    for (const p of alreadyScraped) {
      const cached = progress[p.fbid];
      classifications[p.file] = {
        event: cached.event || 'Uncategorized',
        year: cached.year || null,
        source: 'fb-comment',
        text: (cached.text || '').substring(0, 100)
      };
    }
    
    if (remaining.length > 0) {
      // Connect to Edge
      console.log('  Connecting to Edge...');
      let browser;
      try {
        browser = await puppeteer.connect({
          browserURL: 'http://localhost:9222',
          defaultViewport: null
        });
        console.log('  ✓ Connected!\n');
      } catch (e) {
        console.error('  ✗ Cannot connect to Edge on port 9222');
        console.error('  Skipping FB scrape. Run Edge with --remote-debugging-port=9222');
        // Classify remaining as uncategorized
        for (const p of remaining) {
          classifications[p.file] = { event: 'Uncategorized', year: null, source: 'none' };
        }
        browser = null;
      }
      
      if (browser) {
        const page = await browser.newPage();
        let scraped = 0;
        let classified = 0;
        
        for (let i = 0; i < remaining.length; i++) {
          const p = remaining[i];
          let foundEvent = false;
          
          try {
            const text = await scrapePhotoInfo(page, p.fbid);
            scraped++;
            
            const result = classifyFromText(text);
            foundEvent = !!(result && result.event);
            
            progress[p.fbid] = {
              text: (text || '').substring(0, 300),
              event: result?.event || null,
              year: result?.year || null,
            };
            
            if (result?.event || result?.year) {
              classified++;
              classifications[p.file] = {
                event: result.event || 'BANF Event',
                year: result.year || null,
                source: 'fb-comment',
                text: (text || '').substring(0, 100)
              };
            } else {
              classifications[p.file] = {
                event: 'Uncategorized',
                year: null,
                source: 'fb-comment-empty',
                text: (text || '').substring(0, 100)
              };
            }
          } catch {
            classifications[p.file] = { event: 'Uncategorized', year: null, source: 'error' };
          }
          
          // Progress logging
          if (scraped <= 10 || scraped % 25 === 0 || foundEvent) {
            const e = classifications[p.file].event || 'uncategorized';
            const y = classifications[p.file].year || '?';
            console.log(`  [${scraped}/${remaining.length}] ${p.file} → ${e} (${y})`);
          }
          
          // Save progress every 50
          if (scraped % 50 === 0) {
            saveProgress(progress);
            const pct = ((scraped / remaining.length) * 100).toFixed(1);
            console.log(`  >>> Progress saved: ${scraped}/${remaining.length} (${pct}%) scraped, ${classified} classified`);
          }
          
          await sleep(200 + Math.random() * 200);
        }
        
        await page.close();
        browser.disconnect();
        
        saveProgress(progress);
        console.log(`\n  Scraped: ${scraped}, Classified: ${classified}`);
      }
    }
  }

  // ══════════════════════════════════════
  // STEP 3: Save final classifications
  // ══════════════════════════════════════
  console.log('\n═══ STEP 3: Saving classifications ═══\n');
  
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(classifications, null, 2));
  console.log(`  Saved to ${OUTPUT_FILE}`);
  
  // Summary by event
  const byEvent = {};
  const byYear = {};
  for (const [file, info] of Object.entries(classifications)) {
    const ev = info.event || 'Uncategorized';
    const yr = info.year || 'Unknown';
    byEvent[ev] = (byEvent[ev] || 0) + 1;
    byYear[yr] = (byYear[yr] || 0) + 1;
  }
  
  console.log(`\n  By Event (${Object.keys(byEvent).length} events):`);
  Object.entries(byEvent).sort((a,b) => b[1] - a[1]).forEach(([ev, count]) => {
    console.log(`    ${ev}: ${count}`);
  });
  
  console.log(`\n  By Year:`);
  Object.entries(byYear).sort((a,b) => a[0] < b[0] ? -1 : 1).forEach(([yr, count]) => {
    console.log(`    ${yr}: ${count}`);
  });
  
  console.log('\n  DONE!');
}

main().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
