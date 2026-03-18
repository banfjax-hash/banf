#!/usr/bin/env node
/** Extract all text from GBM-related PPTX files slide by slide */
const fs = require('fs');
const path = require('path');
const JSZip = require('jszip');

const FILES = [
  'banf1-wix/banf-data_ingest/BANF-EC Transition-7thFeb2026.pptx',
  'BANF_FY2026-27_Final_Presentation.pptx',
  'BANF_FY2026-27_Final_Presentation_UPDATED.pptx',
  'BANF_FY2026-27_Final_Presentation_UPDATED_A_V3.pptx',
  'BANF_FY2026-27_Final_Presentation_UPDATED_A_V11 (1).pptx',
  'banf1-wix/banf-data_ingest/data/Financial Summary 2022-2023.pptx',
  'banf1-wix/banf-data_ingest/data/Financial Summary 2023-2024.pptx',
  'banf1-wix/banf-data_ingest/data/Financial Summary 2024-2025.pptx',
];

async function extractSlides(filePath) {
  const buf = fs.readFileSync(filePath);
  const zip = await JSZip.loadAsync(buf);
  const slides = [];
  const slideFiles = Object.keys(zip.files)
    .filter(n => /^ppt\/slides\/slide\d+\.xml$/.test(n))
    .sort((a, b) => {
      const na = parseInt(a.match(/slide(\d+)/)[1]);
      const nb = parseInt(b.match(/slide(\d+)/)[1]);
      return na - nb;
    });
  for (const name of slideFiles) {
    const xml = await zip.files[name].async('text');
    // Extract text from <a:t> tags
    const texts = [];
    const re = /<a:t>([^<]*)<\/a:t>/g;
    let m;
    while ((m = re.exec(xml)) !== null) {
      if (m[1].trim()) texts.push(m[1]);
    }
    const num = name.match(/slide(\d+)/)[1];
    slides.push({ num, text: texts.join(' | ') });
  }
  return slides;
}

async function main() {
  for (const rel of FILES) {
    const fp = path.join(__dirname, rel);
    if (!fs.existsSync(fp)) { console.log(`\n=== MISSING: ${rel} ===\n`); continue; }
    console.log(`\n${'='.repeat(70)}`);
    console.log(`FILE: ${rel}`);
    console.log(`${'='.repeat(70)}`);
    try {
      const slides = await extractSlides(fp);
      for (const s of slides) {
        console.log(`\n--- Slide ${s.num} ---`);
        console.log(s.text);
      }
    } catch (e) {
      console.log(`ERROR: ${e.message}`);
    }
  }
}

main().catch(e => console.error(e));
