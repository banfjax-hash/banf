#!/usr/bin/env node
// Extract EC member names and designations from all Jagriti magazines
const fs = require('fs');
const { PDFParse } = require('pdf-parse');

const files = [
  { path: 'docs/JAGRITI2019.pdf',               year: 2019 },
  { path: 'docs/JAGRITI2020.pdf',               year: 2020 },
  { path: 'docs/JAGRITI2021.pdf',               year: 2021 },
  { path: 'docs/JAGRITI2022.pdf',               year: 2022 },
  { path: 'docs/JAGRITI2023.pdf',               year: 2023 },
  { path: 'docs/JAGRITI2024.pdf',               year: 2024 },
  { path: 'docs/JAGRITI2025_Final_Version.pdf',  year: 2025 },
];

async function extractEC(file) {
  try {
    const buf = fs.readFileSync(file.path);
    const parser = new PDFParse({ data: buf });
    const result = await parser.getText({ first: 12 }); // EC info in first ~10 pages
    const text = result.text;
    
    // Search for EC-related content
    const ecKeywords = /president|secretary|treasurer|vice|coordinator|social media|event|food|inventory|pujo|puja|cultural/gi;
    let match;
    const snippets = [];
    
    while ((match = ecKeywords.exec(text)) !== null) {
      const start = Math.max(0, match.index - 150);
      const end = Math.min(text.length, match.index + 400);
      const snippet = text.substring(start, end).replace(/\n/g, ' ');
      // Avoid duplicate overlapping snippets
      if (snippets.length === 0 || match.index - snippets[snippets.length - 1].idx > 100) {
        snippets.push({ idx: match.index, text: snippet });
      }
    }
    
    console.log(`\n${'='.repeat(70)}`);
    console.log(`JAGRITI ${file.year} — ${result.total} pages — ${file.path}`);
    console.log('='.repeat(70));
    
    if (snippets.length === 0) {
      console.log('  No EC role keywords found in first 12 pages');
    } else {
      snippets.forEach((s, i) => {
        console.log(`\n--- Snippet ${i + 1} ---`);
        console.log(s.text.trim());
      });
    }
    
    await parser.destroy();
  } catch (e) {
    console.log(`\nERROR processing ${file.path}: ${e.message}`);
  }
}

(async () => {
  for (const f of files) {
    await extractEC(f);
  }
  console.log('\n\nDONE');
})();
