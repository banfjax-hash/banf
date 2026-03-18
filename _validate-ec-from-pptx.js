#!/usr/bin/env node
/** Quick EC validation agent — extracts text from PPTX slides and cross-refs EC members */
const fs = require('fs');
const path = require('path');
const JSZip = require('jszip');

const PPTX_DIR = path.join(__dirname, 'banf1-wix', 'banf-data_ingest', 'data');

async function extractPptxText(filePath) {
  const buf = fs.readFileSync(filePath);
  const zip = await JSZip.loadAsync(buf);
  const texts = [];
  for (const [name, file] of Object.entries(zip.files)) {
    if (name.startsWith('ppt/slides/slide') && name.endsWith('.xml')) {
      const xml = await file.async('text');
      const stripped = xml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      if (stripped.length > 10) texts.push({ slide: name, text: stripped });
    }
  }
  return texts;
}

async function main() {
  // Find all PPTX files recursively
  const pptxFiles = [];
  function walk(dir) {
    try {
      for (const f of fs.readdirSync(dir)) {
        const fp = path.join(dir, f);
        const st = fs.statSync(fp);
        if (st.isDirectory()) walk(fp);
        else if (f.endsWith('.pptx') && !f.startsWith('~')) pptxFiles.push(fp);
      }
    } catch (e) {}
  }
  walk(PPTX_DIR);
  // Also check root for any pptx
  for (const f of fs.readdirSync(__dirname)) {
    if (f.endsWith('.pptx') && !f.startsWith('~')) pptxFiles.push(path.join(__dirname, f));
  }

  console.log(`Found ${pptxFiles.length} PPTX files\n`);

  const EC_NAMES = [
    'Ranadhir', 'Partha', 'Mukhopadhyay', 'Amit Chandak', 'Rajanya',
    'Moumita', 'Sumanta', 'Rwiti', 'Choudhury',
    'Suvankar', 'Anita Mandal', 'Tanay', 'Bhaduri', 'Sreya', 'Deepra', 'Souvik Chakraborty',
    'Sanjukta', 'Saugata', 'Reshma',
    'Soumyajit', 'Bunty', 'Sudip Roy', 'Swarnendu',
    'President', 'Vice President', 'Secretary', 'Treasurer', 'Cultural', 'Coordinator'
  ];

  for (const fp of pptxFiles) {
    const rel = path.relative(__dirname, fp);
    console.log(`=== ${rel} ===`);
    try {
      const slides = await extractPptxText(fp);
      let found = false;
      for (const s of slides) {
        const matches = EC_NAMES.filter(n => s.text.toLowerCase().includes(n.toLowerCase()));
        if (matches.length >= 2) {
          found = true;
          console.log(`  ${s.slide}: ${matches.join(', ')}`);
          // Print the relevant excerpt
          for (const m of matches) {
            const idx = s.text.toLowerCase().indexOf(m.toLowerCase());
            const start = Math.max(0, idx - 40);
            const end = Math.min(s.text.length, idx + m.length + 60);
            console.log(`    ...${s.text.substring(start, end)}...`);
          }
        }
      }
      if (!found) console.log('  (no EC member references found)');
    } catch (e) {
      console.log(`  ERROR: ${e.message}`);
    }
    console.log();
  }
}

main().catch(e => console.error(e));
