const fs = require('fs');
const path = require('path');

const GALLERY = path.join(__dirname, 'docs', 'gallery');
const classifications = JSON.parse(fs.readFileSync('_photo-classifications.json', 'utf8'));

// Rename plan: fb-full-XXXX.jpg -> descriptive-name.jpg, ig-XXX.jpg -> descriptive-name.jpg
const renames = [];
const counters = {};

function getCounter(prefix) {
  counters[prefix] = (counters[prefix] || 0) + 1;
  return counters[prefix];
}

for (const [file, data] of Object.entries(classifications)) {
  if (data.skip) {
    // Delete skipped files (cover/profile photos)
    const p = path.join(GALLERY, file);
    if (fs.existsSync(p)) {
      fs.unlinkSync(p);
      console.log(`Deleted: ${file} (${data.album})`);
    }
    continue;
  }
  
  // Skip existing wix photos - already named well
  if (data.source === 'wix' || data.method === 'existing') continue;
  
  let newName;
  const source = data.source === 'facebook' ? 'fb' : 'ig';
  
  if (data.album === 'Durga Puja 2025' || data.event?.includes('Durga Puja')) {
    const n = getCounter('durga-puja-2025');
    newName = `durga-puja-2025-${source}-${n}.jpg`;
  } else if (data.album === 'Spandan 2025' || data.event?.includes('Spandan')) {
    const n = getCounter('spandan-2025');
    newName = `spandan-2025-${source}-${n}.jpg`;
  } else if (data.album === 'Sports Day 2025' || data.event?.includes('Sports')) {
    const n = getCounter('sports-day-2025');
    newName = `sports-day-2025-${source}-${n}.jpg`;
  } else if (data.album === 'Anandadhara Returns 2023') {
    const n = getCounter('anandadhara-2023');
    newName = `anandadhara-2023-${source}-${n}.jpg`;
  } else if (data.event?.includes('Kali Puja')) {
    const n = getCounter('kali-puja-2025');
    newName = `kali-puja-2025-${source}-${n}.jpg`;
  } else if (data.event?.includes('Holi') || data.event?.includes('হলি')) {
    const n = getCounter('holi-gaan-2025');
    newName = `holi-gaan-2025-${source}-${n}.jpg`;
  } else if (data.event?.includes('New Year')) {
    const n = getCounter('new-year-2026');
    newName = `new-year-2026-${source}-${n}.jpg`;
  } else if (data.event?.includes('Mortgage') || data.event?.includes('mortgage')) {
    const n = getCounter('sponsor-2025');
    newName = `sponsor-ad-2025-${source}-${n}.jpg`;
  } else if (data.event?.includes('Fundraiser')) {
    const n = getCounter('fundraiser-2025');
    newName = `fundraiser-2025-${source}-${n}.jpg`;
  } else if (data.album === 'Mobile Uploads') {
    const n = getCounter('mobile-upload');
    // These are from 2026 based on the alt text (Anand Bazar 2026 flyers)
    newName = `anand-bazar-2026-${source}-${n}.jpg`;
  } else if (data.album === 'Photos') {
    const n = getCounter('general-photos');
    newName = `banf-event-${source}-${n}.jpg`;
  } else {
    const n = getCounter('misc');
    const yr = data.year || 2025;
    newName = `banf-${yr}-${source}-${n}.jpg`;
  }
  
  renames.push({ oldFile: file, newFile: newName, data });
}

// Execute renames
console.log('\n=== Renaming files ===\n');
for (const r of renames) {
  const oldPath = path.join(GALLERY, r.oldFile);
  const newPath = path.join(GALLERY, r.newFile);
  if (fs.existsSync(oldPath)) {
    if (fs.existsSync(newPath)) {
      // Conflict - add suffix
      r.newFile = r.newFile.replace('.jpg', '-b.jpg');
      fs.renameSync(oldPath, path.join(GALLERY, r.newFile));
    } else {
      fs.renameSync(oldPath, newPath);
    }
    console.log(`${r.oldFile} -> ${r.newFile}`);
  }
}

// Now build the gallery data structure
console.log('\n=== Building GALLERY_DATA ===\n');

// Re-read all files
const allFiles = fs.readdirSync(GALLERY).filter(f => f.endsWith('.jpg')).sort();
console.log(`Total gallery files: ${allFiles.length}`);

// Build the gallery structure
const gallery = {
  '2026': {},
  '2025': {},
  '2024': {},
  '2023': {}
};

for (const file of allFiles) {
  let year, event, caption;
  
  if (file.startsWith('anand-bazar-2026')) {
    year = '2026'; event = 'Anand Bazar 2026'; caption = 'Anand Bazar food festival';
  } else if (file.startsWith('new-year-2026')) {
    year = '2026'; event = 'New Year 2026'; caption = 'New Year celebration';
  } else if (file.startsWith('durga-puja-2025')) {
    year = '2025'; event = 'Durga Puja 2025'; caption = 'Durga Puja celebration';
  } else if (file.startsWith('spandan-2025') || file.startsWith('spandan-flyer') || file.startsWith('spandan-poster')) {
    year = '2025'; event = 'Spandan 2025'; caption = 'Spandan cultural program';
  } else if (file.startsWith('sports-day-2025') || file === 'sports-day-2025.jpg') {
    year = '2025'; event = 'Sports Day 2025'; caption = 'BANF Sports Day';
  } else if (file.startsWith('kali-puja')) {
    year = '2025'; event = 'Kali Puja 2025'; caption = 'Kali Puja celebration';
  } else if (file.startsWith('holi-gaan')) {
    year = '2025'; event = 'Holi Gaan 2025'; caption = 'Holi Gaan musical evening';
  } else if (file.startsWith('fundraiser-2025')) {
    year = '2025'; event = 'Fundraiser Drives'; caption = 'Community fundraiser event';
  } else if (file.startsWith('sponsor-ad')) {
    continue; // Skip sponsor ads from gallery
  } else if (file.startsWith('tennis-camp')) {
    year = '2025'; event = 'Tennis Summer Camp'; caption = 'BANF Tennis Summer Camp for youth';
  } else if (file.startsWith('event-roadmap')) {
    year = '2025'; event = 'Event Roadmap'; caption = 'BANF 2025 program roadmap';
  } else if (file.startsWith('anandadhara-2023')) {
    year = '2023'; event = 'Anandadhara Returns 2023'; caption = 'Anandadhara cultural festival';
  } else if (file.startsWith('community-outing')) {
    year = '2024'; event = 'Community Outing'; caption = 'Community outing at Jacksonville';
  } else if (file.startsWith('beach-cleanup')) {
    year = '2024'; event = 'Beach Cleanup Drive'; caption = 'Beach cleanup at Jacksonville Beach';
  } else if (file.startsWith('puja-celebrations-flyer')) {
    year = '2024'; event = 'Puja Celebrations'; caption = 'Mahalaya, Durga Puja & Lakshmi Puja';
  } else if (file.startsWith('puja-celebration.')) {
    year = '2023'; event = 'Cultural Celebrations'; caption = 'Puja celebration ceremony';
  } else if (file.startsWith('cultural-')) {
    year = '2023'; event = 'Cultural Celebrations'; caption = file.replace('.jpg','').replace(/-/g,' ');
  } else if (file.startsWith('traditional-')) {
    year = '2023'; event = 'Cultural Celebrations'; caption = 'Members in traditional attire';
  } else if (file.startsWith('family-') || file.startsWith('games-') || file.startsWith('social-') || file.startsWith('community-bbq') || file.startsWith('outdoor-')) {
    year = '2023'; event = 'Family & Community Events'; caption = file.replace('.jpg','').replace(/-/g,' ');
  } else if (file.startsWith('youth-')) {
    year = '2023'; event = 'Youth Sports'; caption = 'Youth sports and activities';
  } else if (file.startsWith('banf-event')) {
    year = '2025'; event = 'Community Events'; caption = 'BANF community event';
  } else if (file.startsWith('banf-2025')) {
    year = '2025'; event = 'Community Events'; caption = 'BANF community event';
  } else {
    year = '2025'; event = 'Other'; caption = file.replace('.jpg','').replace(/-/g,' ');
  }
  
  if (!gallery[year]) gallery[year] = {};
  if (!gallery[year][event]) gallery[year][event] = [];
  gallery[year][event].push({ src: `gallery/${file}`, caption });
}

// Remove empty years
for (const y of Object.keys(gallery)) {
  if (Object.keys(gallery[y]).length === 0) delete gallery[y];
}

// Output as JS
let js = 'var GALLERY_DATA = {\n';
for (const year of Object.keys(gallery).sort((a,b) => b-a)) {
  js += `            '${year}': {\n`;
  const events = Object.keys(gallery[year]);
  events.forEach((event, ei) => {
    js += `                '${event}': [\n`;
    gallery[year][event].forEach((photo, pi) => {
      const comma = pi < gallery[year][event].length - 1 ? ',' : '';
      js += `                    { src: '${photo.src}', caption: '${photo.caption.replace(/'/g, "\\'")}' }${comma}\n`;
    });
    js += `                ]${ei < events.length - 1 ? ',' : ''}\n`;
  });
  js += `            }${year !== Object.keys(gallery).sort((a,b) => b-a).slice(-1)[0] ? ',' : ''}\n`;
}
js += '        };';

fs.writeFileSync('_gallery-data-output.js', js);
console.log('\nGALLERY_DATA JS saved to _gallery-data-output.js');

// Summary
for (const year of Object.keys(gallery).sort((a,b) => b-a)) {
  const total = Object.values(gallery[year]).reduce((s, arr) => s + arr.length, 0);
  console.log(`\n${year}: ${total} photos`);
  for (const [event, photos] of Object.entries(gallery[year])) {
    console.log(`  ${event}: ${photos.length} photos`);
  }
}
