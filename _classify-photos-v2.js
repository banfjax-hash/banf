#!/usr/bin/env node
/**
 * BANF Photo Classifier v2 - Parallel Fast Version
 * 
 * Uses 5 concurrent browser tabs for ~5x speed improvement.
 * Faster page loads (domcontentloaded + 1s wait instead of networkidle2 + 1.5s).
 * 
 * Output: _photo-classifications.json
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const GALLERY_DIR = path.join(__dirname, 'docs', 'gallery');
const OUTPUT_FILE = path.join(__dirname, '_photo-classifications.json');
const PROGRESS_FILE = path.join(__dirname, '_classify-progress.json');
const CONCURRENCY = 5; // parallel tabs

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

const EVENT_PATTERNS = [
  { pattern: /durga\s*puja/i,                      event: 'Durga Puja' },
  { pattern: /spandan/i,                            event: 'Spandan' },
  { pattern: /sports?\s*day/i,                      event: 'Sports Day' },
  { pattern: /anandadhara/i,                         event: 'Anandadhara Returns' },
  { pattern: /anand\s*baz[ae][ae]r/i,              event: 'Anand Bazar' },
  { pattern: /kali\s*puja/i,                        event: 'Kali Puja' },
  { pattern: /holi|dol\s*[jy]atra/i,               event: 'Holi Gaan' },
  { pattern: /diwali|deepa[vw]ali/i,               event: 'Diwali' },
  { pattern: /saraswati\s*puja/i,                   event: 'Saraswati Puja' },
  { pattern: /new\s*year/i,                         event: 'New Year Celebration' },
  { pattern: /picnic/i,                             event: 'Picnic' },
  { pattern: /bbq|barbe[cq]ue/i,                   event: 'BBQ' },
  { pattern: /cricket/i,                            event: 'Cricket' },
  { pattern: /badminton/i,                          event: 'Badminton' },
  { pattern: /women'?s?\s*day/i,                    event: "International Women's Day" },
  { pattern: /independence\s*day/i,                 event: 'Independence Day' },
  { pattern: /republic\s*day/i,                     event: 'Republic Day' },
  { pattern: /rabindra|tagore/i,                    event: 'Rabindra Jayanti' },
  { pattern: /nabo\s*borsho|poila\s*boisakh|bengali\s*new\s*year/i, event: 'Poila Boisakh' },
  { pattern: /general\s*(body\s*)?meeting|gbm|agm/i, event: 'General Meeting' },
  { pattern: /election/i,                           event: 'Election' },
  { pattern: /fund\s*rais/i,                        event: 'Fundraiser' },
  { pattern: /laxmi\s*puja|lakshmi\s*puja/i,       event: 'Laxmi Puja' },
  { pattern: /ganesh/i,                             event: 'Ganesh Puja' },
  { pattern: /rath\s*yatra/i,                       event: 'Rath Yatra' },
  { pattern: /janmashtami|krishna/i,               event: 'Janmashtami' },
  { pattern: /welcome\s*party|welcome\s*new/i,     event: 'Welcome Party' },
  { pattern: /farewell/i,                           event: 'Farewell' },
  { pattern: /thanksgiving/i,                       event: 'Thanksgiving' },
  { pattern: /christmas|xmas/i,                     event: 'Christmas' },
  { pattern: /halloween/i,                          event: 'Halloween' },
  { pattern: /summer\s*(get[\s-]?together|party|fest)/i, event: 'Summer Get-Together' },
  { pattern: /winter\s*(get[\s-]?together|party|fest)/i, event: 'Winter Get-Together' },
  { pattern: /potluck|pot\s*luck/i,                event: 'Potluck' },
  { pattern: /cultural\s*(program|evening|event|night)/i, event: 'Cultural Program' },
  { pattern: /workshop/i,                           event: 'Workshop' },
  { pattern: /blood\s*d(rive|onat)/i,              event: 'Blood Drive' },
  { pattern: /charity|donat/i,                      event: 'Charity Event' },
  { pattern: /annual\s*day/i,                       event: 'Annual Day' },
  { pattern: /graduation/i,                         event: 'Graduation' },
  { pattern: /birthday/i,                           event: 'Birthday Celebration' },
  { pattern: /congratulat/i,                        event: 'Congratulations' },
  { pattern: /volunteer/i,                          event: 'Volunteer Event' },
  { pattern: /beach\s*clean/i,                      event: 'Beach Cleanup' },
  { pattern: /trail|hik(e|ing)/i,                   event: 'Hiking' },
  { pattern: /food\s*fest/i,                        event: 'Food Festival' },
  { pattern: /concert|performance/i,                event: 'Music & Performance' },
  { pattern: /dance/i,                              event: 'Dance' },
  { pattern: /camping|camp\b/i,                     event: 'Camp' },
  { pattern: /beach\s*(party|event|day|trip)/i,     event: 'Beach Event' },
];

function classifyFromText(text) {
  if (!text) return null;
  
  let event = null;
  for (const ep of EVENT_PATTERNS) {
    if (ep.pattern.test(text)) {
      event = ep.event;
      break;
    }
  }
  
  // Extract year
  const years = text.match(/20(1[89]|2[0-6])/g);
  let year = null;
  if (years && years.length > 0) {
    const counts = {};
    for (const y of years) { counts[y] = (counts[y] || 0) + 1; }
    year = parseInt(Object.entries(counts).sort((a,b) => b[1] - a[1])[0][0]);
  }
  
  if (event && year) return { event: `${event} ${year}`, year };
  if (event) return { event, year };
  if (year) return { event: null, year };
  return null;
}

async function scrapeOne(page, fbid) {
  const url = `https://www.facebook.com/photo/?fbid=${fbid}`;
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 12000 });
    await sleep(1200); // let JS render the post text
    
    return await page.evaluate(() => {
      const noiseRx = /^Notifications$|^New See all$|^See previous|^Unread|commented on|posted a story|posted a link|posted a new reel|likes your|Press Enter|^Write a comment|^Most relevant|^Like$|^Reply$|reactions? ·/i;
      const texts = [];
      for (const el of document.querySelectorAll('[dir="auto"]')) {
        const t = el.innerText.trim();
        if (t.length >= 5 && t.length < 2000 && !noiseRx.test(t)) {
          texts.push(t);
        }
      }
      texts.push('TITLE: ' + document.title);
      for (const c of document.querySelectorAll('[role="article"]')) {
        const t = c.innerText.trim();
        if (t.length > 10 && t.length < 500 && !noiseRx.test(t)) {
          texts.push('COMMENT: ' + t.substring(0, 200));
        }
      }
      return texts.join('\n');
    });
  } catch {
    return null;
  }
}

async function main() {
  console.log('BANF Photo Classifier v2 (parallel)\n');

  const allFiles = fs.readdirSync(GALLERY_DIR).filter(f => /\.(jpg|png)$/i.test(f)).sort();
  console.log(`Total gallery files: ${allFiles.length}`);

  const classifications = {};
  const progress = loadProgress();

  // STEP 1: Direct classification
  let directCount = 0;
  const needsScrape = [];
  
  for (const file of allFiles) {
    let matched = false;
    for (const [prefix, info] of Object.entries(ALBUM_MAP)) {
      if (file.startsWith(prefix + '-')) {
        classifications[file] = { event: info.event, year: info.year, source: 'album' };
        directCount++;
        matched = true;
        break;
      }
    }
    
    if (!matched) {
      if (file.startsWith('mobile-uploads-') || file.startsWith('photos-')) {
        const fbidMatch = file.match(/(\d{6,})\.jpg$/);
        if (fbidMatch) needsScrape.push({ file, fbid: fbidMatch[1] });
      } else {
        // Legacy files
        const lowerName = file.toLowerCase();
        let event = 'BANF Event';
        let year = null;
        if (lowerName.includes('puja')) event = 'Puja Celebration';
        if (lowerName.includes('sports') || lowerName.includes('tennis')) event = 'Sports';
        if (lowerName.includes('flyer') || lowerName.includes('poster')) event = 'Flyers & Announcements';
        if (lowerName.includes('spandan')) { event = 'Spandan 2025'; year = 2025; }
        if (lowerName.includes('beach')) event = 'Beach Cleanup';
        const ym = file.match(/(20\d{2})/);
        if (ym) year = parseInt(ym[1]);
        classifications[file] = { event, year, source: 'filename' };
        directCount++;
      }
    }
  }
  
  console.log(`Direct classified: ${directCount}`);
  console.log(`Need FB scraping: ${needsScrape.length}`);

  // STEP 2: Apply cached progress
  const remaining = [];
  for (const p of needsScrape) {
    if (progress[p.fbid]) {
      const c = progress[p.fbid];
      classifications[p.file] = {
        event: c.event || 'Uncategorized',
        year: c.year || null,
        source: 'fb-comment'
      };
    } else {
      remaining.push(p);
    }
  }
  
  const cachedCount = needsScrape.length - remaining.length;
  console.log(`Cached from previous runs: ${cachedCount}`);
  console.log(`Remaining to scrape: ${remaining.length}\n`);

  if (remaining.length > 0) {
    // Connect to Edge
    let browser;
    try {
      browser = await puppeteer.connect({ browserURL: 'http://localhost:9222', defaultViewport: null });
      console.log('Connected to Edge\n');
    } catch {
      console.error('Cannot connect to Edge on port 9222. Marking remaining as uncategorized.');
      for (const p of remaining) {
        classifications[p.file] = { event: 'Uncategorized', year: null, source: 'none' };
      }
      browser = null;
    }
    
    if (browser) {
      // Create pool of pages
      const pages = [];
      for (let i = 0; i < CONCURRENCY; i++) {
        pages.push(await browser.newPage());
      }
      
      let scraped = 0;
      let classified = 0;
      const startTime = Date.now();
      
      // Process in batches of CONCURRENCY
      for (let i = 0; i < remaining.length; i += CONCURRENCY) {
        const batch = remaining.slice(i, i + CONCURRENCY);
        
        const results = await Promise.all(
          batch.map(async (p, idx) => {
            const text = await scrapeOne(pages[idx], p.fbid);
            const result = classifyFromText(text);
            return { ...p, text, result };
          })
        );
        
        for (const r of results) {
          scraped++;
          progress[r.fbid] = {
            text: (r.text || '').substring(0, 300),
            event: r.result?.event || null,
            year: r.result?.year || null,
          };
          
          if (r.result?.event || r.result?.year) {
            classified++;
            classifications[r.file] = {
              event: r.result.event || 'BANF Event',
              year: r.result.year || null,
              source: 'fb-comment'
            };
          } else {
            classifications[r.file] = {
              event: 'Uncategorized',
              year: null,
              source: 'fb-comment-empty'
            };
          }
        }
        
        // Log progress every batch
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(0);
        const rate = (scraped / ((Date.now() - startTime) / 1000)).toFixed(1);
        const eta = remaining.length > scraped 
          ? (((remaining.length - scraped) / rate) / 60).toFixed(1)
          : '0';
        
        // Show last item of batch + stats
        const last = results[results.length - 1];
        const ev = classifications[last.file].event || 'uncategorized';
        const yr = classifications[last.file].year || '?';
        console.log(`  [${scraped}/${remaining.length}] ${ev} (${yr}) | ${rate}/s | ETA: ${eta}m | classified: ${classified}`);
        
        // Save progress every 100
        if (scraped % 100 < CONCURRENCY) {
          saveProgress(progress);
        }
      }
      
      // Cleanup
      for (const page of pages) await page.close();
      browser.disconnect();
      saveProgress(progress);
      
      const totalTime = ((Date.now() - startTime) / 1000 / 60).toFixed(1);
      console.log(`\nScraping done: ${scraped} scraped, ${classified} classified in ${totalTime}m`);
    }
  }

  // STEP 3: Save
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(classifications, null, 2));
  
  // Summary
  const byEvent = {};
  const byYear = {};
  for (const [file, info] of Object.entries(classifications)) {
    const ev = info.event || 'Uncategorized';
    const yr = info.year || 'Unknown';
    byEvent[ev] = (byEvent[ev] || 0) + 1;
    byYear[yr] = (byYear[yr] || 0) + 1;
  }
  
  console.log(`\nBy Event (${Object.keys(byEvent).length} events):`);
  Object.entries(byEvent).sort((a,b) => b[1] - a[1]).forEach(([ev, count]) => {
    console.log(`  ${ev}: ${count}`);
  });
  
  console.log(`\nBy Year:`);
  Object.entries(byYear).sort().forEach(([yr, count]) => {
    console.log(`  ${yr}: ${count}`);
  });
  
  console.log('\nDONE! Classifications saved to _photo-classifications.json');
}

main().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
