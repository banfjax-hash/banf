#!/usr/bin/env node
/**
 * BANF Gallery Builder
 * 
 * Reads _photo-classifications.json and generates GALLERY_DATA
 * for docs/index.html, organized by Year → Event → photos.
 * 
 * For photos without specific event names but with years,
 * groups them as "BANF Events {year}" or similar.
 * 
 * Usage: node _build-gallery.js
 */

const fs = require('fs');
const path = require('path');

const CLASSIFICATIONS_FILE = path.join(__dirname, '_photo-classifications.json');
const INDEX_FILE = path.join(__dirname, 'docs', 'index.html');

function main() {
  console.log('BANF Gallery Builder\n');
  
  // Load classifications
  const classifications = JSON.parse(fs.readFileSync(CLASSIFICATIONS_FILE, 'utf8'));
  const totalPhotos = Object.keys(classifications).length;
  console.log(`Loaded ${totalPhotos} photo classifications\n`);
  
  // Build GALLERY_DATA structure: { year: { event: [{ src, caption }] } }
  const galleryData = {};
  let uncategorizedCount = 0;
  
  for (const [filename, info] of Object.entries(classifications)) {
    let event = info.event || 'Uncategorized';
    let year = info.year;
    
    // Determine year if missing
    if (!year) {
      // Try to extract from event name
      const ym = event.match(/20\d{2}/);
      if (ym) year = parseInt(ym[0]);
    }
    
    // For "BANF Event" with just a year, group into a more descriptive name
    if (event === 'BANF Event' || event === 'Uncategorized') {
      if (year) {
        event = `BANF Events ${year}`;
      } else {
        // Skip unclassified photos (no year, no event)
        uncategorizedCount++;
        continue;
      }
    }
    
    // Determine year string for grouping
    const yearKey = year ? String(year) : 'Other';
    
    // Ensure event has year in name for clarity
    // (Only if it doesn't already)
    if (year && !event.match(/20\d{2}/)) {
      event = `${event} ${year}`;
    }
    
    // Build caption from event name
    const caption = event;
    
    // Add to gallery data
    if (!galleryData[yearKey]) galleryData[yearKey] = {};
    if (!galleryData[yearKey][event]) galleryData[yearKey][event] = [];
    
    galleryData[yearKey][event].push({
      src: `gallery/${filename}`,
      caption
    });
  }
  
  // Sort: years descending, events alphabetically, photos by filename
  const sortedGalleryData = {};
  const sortedYears = Object.keys(galleryData).sort((a, b) => {
    if (a === 'Other') return 1;
    if (b === 'Other') return -1;
    return parseInt(b) - parseInt(a);
  });
  
  for (const year of sortedYears) {
    sortedGalleryData[year] = {};
    const sortedEvents = Object.keys(galleryData[year]).sort();
    for (const event of sortedEvents) {
      sortedGalleryData[year][event] = galleryData[year][event]
        .sort((a, b) => a.src.localeCompare(b.src));
    }
  }
  
  // Summary
  console.log('Gallery Structure:');
  for (const [year, events] of Object.entries(sortedGalleryData)) {
    const totalInYear = Object.values(events).reduce((s, arr) => s + arr.length, 0);
    console.log(`  ${year}: ${totalInYear} photos in ${Object.keys(events).length} events`);
    for (const [event, photos] of Object.entries(events)) {
      console.log(`    ${event}: ${photos.length} photos`);
    }
  }
  console.log(`  Fully uncategorized: ${uncategorizedCount}\n`);
  
  // Generate GALLERY_DATA JavaScript
  const galleryDataJS = 'var GALLERY_DATA = ' + JSON.stringify(sortedGalleryData, null, 4) + ';';
  
  // Read index.html and replace GALLERY_DATA
  let html = fs.readFileSync(INDEX_FILE, 'utf8');
  
  // Find and replace existing GALLERY_DATA
  const galleryDataRegex = /var GALLERY_DATA\s*=\s*\{[\s\S]*?\};\s*(?=\n\s*(?:var |function |\/\/|\/\*|\<))/;
  
  if (galleryDataRegex.test(html)) {
    html = html.replace(galleryDataRegex, galleryDataJS + '\n');
    console.log('Replaced existing GALLERY_DATA in index.html');
  } else {
    // Try simpler approach: find from "var GALLERY_DATA" to next "var " or "function "
    const startIdx = html.indexOf('var GALLERY_DATA');
    if (startIdx >= 0) {
      // Find the end of GALLERY_DATA by counting braces
      let braceDepth = 0;
      let endIdx = startIdx;
      let foundOpen = false;
      for (let i = startIdx; i < html.length; i++) {
        if (html[i] === '{') { braceDepth++; foundOpen = true; }
        if (html[i] === '}') braceDepth--;
        if (foundOpen && braceDepth === 0) {
          // Find the semicolon after the closing brace
          endIdx = html.indexOf(';', i) + 1;
          break;
        }
      }
      
      if (endIdx > startIdx) {
        html = html.substring(0, startIdx) + galleryDataJS + html.substring(endIdx);
        console.log('Replaced GALLERY_DATA (brace-matching) in index.html');
      } else {
        console.error('Could not find end of GALLERY_DATA');
        return;
      }
    } else {
      console.error('Could not find GALLERY_DATA in index.html');
      return;
    }
  }
  
  fs.writeFileSync(INDEX_FILE, html, 'utf8');
  
  const finalSize = (Buffer.byteLength(html) / 1024).toFixed(0);
  console.log(`Updated index.html (${finalSize} KB)`);
  console.log(`Total: ${totalPhotos} photos across ${sortedYears.length} years\n`);
  console.log('DONE!');
}

main();
