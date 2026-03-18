#!/usr/bin/env node
/**
 * BANF EC Member Validation Agent
 * ================================
 * Extracts EC member names from PowerPoint presentations, Excel files,
 * and text documents across all years, then cross-references to build
 * a validated EC roster for each term.
 *
 * Usage: node _validate-ec-members.js
 */

const fs = require('fs');
const path = require('path');
const AdmZip = require('adm-zip');
const XLSX = require('xlsx');

const BASE = __dirname;
const DATA_INGEST = path.join(BASE, 'banf1-wix', 'banf-data_ingest');

// ── Known EC roles to detect ──
const EC_ROLES = [
  'president', 'vice president', 'vp', 'general secretary', 'gen sec',
  'treasurer', 'cultural secretary', 'cultural sec', 'puja secretary',
  'puja coordinator', 'event coordinator', 'food coordinator',
  'joint secretary', 'social media', 'ec member', 'it lead',
  'secretary', 'coordinator'
];

const EC_ROLE_RE = new RegExp('(' + EC_ROLES.join('|') + ')', 'gi');

// ── Term patterns ──
const TERM_PATTERNS = [
  { re: /2026[\s\-–—]+20?28|2026.*2028/i, term: '2026-2028' },
  { re: /2024[\s\-–—]+20?26|2024.*2026/i, term: '2024-2026' },
  { re: /2022[\s\-–—]+20?24|2022.*2024/i, term: '2022-2024' },
  { re: /2020[\s\-–—]+20?22|2020.*2022/i, term: '2020-2022' },
  { re: /2018[\s\-–—]+20?20|2018.*2020/i, term: '2018-2020' }
];

// ── Helpers ──

/** Extract all text from a PPTX file (ZIP of XML slides) */
function extractPptxText(filePath) {
  try {
    const zip = new AdmZip(filePath);
    const entries = zip.getEntries();
    const texts = [];
    for (const entry of entries) {
      if (/^ppt\/slides\/slide\d+\.xml$/i.test(entry.entryName)) {
        const xml = entry.getData().toString('utf8');
        // Extract text between <a:t> tags
        const matches = xml.match(/<a:t>([^<]*)<\/a:t>/g) || [];
        const slideText = matches.map(m => m.replace(/<\/?a:t>/g, '')).join(' ');
        texts.push({ slide: entry.entryName, text: slideText });
      }
    }
    return texts;
  } catch (e) {
    return [];
  }
}

/** Extract text from an XLSX file */
function extractXlsxText(filePath) {
  try {
    const wb = XLSX.readFile(filePath, { type: 'file' });
    const texts = [];
    for (const sheetName of wb.SheetNames) {
      const sheet = wb.Sheets[sheetName];
      const csv = XLSX.utils.sheet_to_csv(sheet);
      texts.push({ sheet: sheetName, text: csv });
    }
    return texts;
  } catch (e) {
    return [];
  }
}

/** Detect which EC term a text block likely refers to */
function detectTerm(text) {
  for (const tp of TERM_PATTERNS) {
    if (tp.re.test(text)) return tp.term;
  }
  return null;
}

/** Extract name+role pairs near EC role keywords */
function extractNameRolePairs(text) {
  const results = [];
  const lines = text.split(/[\n\r]+/);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Pattern 1: "Name - Role" or "Name – Role"
    const dashMatch = line.match(/^([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,3})\s*[\-–—:]\s*(.*)/);
    if (dashMatch) {
      const possibleName = dashMatch[1].trim();
      const possibleRole = dashMatch[2].trim();
      if (EC_ROLE_RE.test(possibleRole)) {
        EC_ROLE_RE.lastIndex = 0;
        results.push({ name: possibleName, role: possibleRole, line: line });
      }
    }

    // Pattern 2: "Role: Name" or "Role - Name"
    EC_ROLE_RE.lastIndex = 0;
    const roleFirstMatch = line.match(new RegExp('(' + EC_ROLES.join('|') + ')\\s*[:\\-–—]\\s*([A-Z][a-z]+(?:\\s+[A-Z][a-z]+){0,3})', 'i'));
    if (roleFirstMatch) {
      results.push({ name: roleFirstMatch[2].trim(), role: roleFirstMatch[1].trim(), line: line });
    }

    // Pattern 3: line contains a known role keyword + names nearby
    EC_ROLE_RE.lastIndex = 0;
    if (EC_ROLE_RE.test(line)) {
      EC_ROLE_RE.lastIndex = 0;
      // Extract role match
      const roleM = line.match(EC_ROLE_RE);
      // Look for capitalized name patterns
      const nameM = line.match(/(?:Dr\.?\s+)?[A-Z][a-z]{1,15}(?:\s+[A-Z][a-z]{1,15}){1,3}/g);
      if (roleM && nameM) {
        for (const nm of nameM) {
          // Skip if the "name" is actually just the role text
          if (EC_ROLE_RE.test(nm)) { EC_ROLE_RE.lastIndex = 0; continue; }
          EC_ROLE_RE.lastIndex = 0;
          results.push({ name: nm.trim(), role: roleM[0].trim(), line: line });
        }
      }
    }
  }

  return results;
}

// ── Main scan ──

function findFiles(dir, extensions, maxDepth = 4, depth = 0) {
  if (depth > maxDepth) return [];
  const results = [];
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const e of entries) {
      const full = path.join(dir, e.name);
      if (e.isDirectory() && !e.name.startsWith('.') && e.name !== 'node_modules') {
        results.push(...findFiles(full, extensions, maxDepth, depth + 1));
      } else if (e.isFile() && extensions.some(ext => e.name.toLowerCase().endsWith(ext))) {
        results.push(full);
      }
    }
  } catch (e) {}
  return results;
}

async function main() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('  BANF EC Member Validation Agent');
  console.log('  Scanning PowerPoint, Excel, and text sources...');
  console.log('═══════════════════════════════════════════════════════\n');

  const findings = {}; // { term: { name: { roles: Set, sources: [] } } }
  const allSources = [];

  // 1. Scan PPTX files
  const pptxFiles = [
    ...findFiles(DATA_INGEST, ['.pptx']),
    ...findFiles(BASE, ['.pptx'], 1) // root-level pptx
  ];
  console.log(`Found ${pptxFiles.length} PowerPoint files\n`);

  for (const f of pptxFiles) {
    const relPath = path.relative(BASE, f);
    const slides = extractPptxText(f);
    const fullText = slides.map(s => s.text).join('\n');
    const term = detectTerm(fullText) || detectTermFromFilename(relPath);

    if (!term) continue;

    const pairs = extractNameRolePairs(fullText);
    if (pairs.length > 0) {
      allSources.push({ file: relPath, term, pairs: pairs.length });
      for (const p of pairs) {
        addFinding(findings, term, p.name, p.role, relPath, p.line);
      }
    }
  }

  // 2. Scan XLSX files
  const xlsxFiles = findFiles(DATA_INGEST, ['.xlsx', '.xls']);
  console.log(`Found ${xlsxFiles.length} Excel files`);

  for (const f of xlsxFiles) {
    const relPath = path.relative(BASE, f);
    const sheets = extractXlsxText(f);
    const fullText = sheets.map(s => s.text).join('\n');
    const term = detectTerm(fullText) || detectTermFromFilename(relPath);

    if (!term) continue;

    const pairs = extractNameRolePairs(fullText);
    if (pairs.length > 0) {
      allSources.push({ file: relPath, term, pairs: pairs.length });
      for (const p of pairs) {
        addFinding(findings, term, p.name, p.role, relPath, p.line);
      }
    }
  }

  // 3. Scan text/MD files for EC references
  const textFiles = [
    ...findFiles(path.join(DATA_INGEST, 'output'), ['.md', '.txt']),
    ...findFiles(BASE, ['.md'], 1)
  ];
  console.log(`Found ${textFiles.length} text/MD files`);

  for (const f of textFiles) {
    const relPath = path.relative(BASE, f);
    try {
      const text = fs.readFileSync(f, 'utf8');
      if (!EC_ROLE_RE.test(text)) { EC_ROLE_RE.lastIndex = 0; continue; }
      EC_ROLE_RE.lastIndex = 0;

      const term = detectTerm(text) || detectTermFromFilename(relPath);
      if (!term) continue;

      const pairs = extractNameRolePairs(text);
      if (pairs.length > 0) {
        allSources.push({ file: relPath, term, pairs: pairs.length });
        for (const p of pairs) {
          addFinding(findings, term, p.name, p.role, relPath, p.line);
        }
      }
    } catch (e) {}
  }

  // 4. Scan key HTML reports
  const htmlFiles = fs.readdirSync(BASE).filter(f => f.endsWith('.html') && (
    f.includes('crm') || f.includes('bosonto') || f.includes('member') ||
    f.includes('family') || f.includes('ec') || f.includes('EC')
  ));
  console.log(`Found ${htmlFiles.length} relevant HTML reports\n`);

  for (const fname of htmlFiles) {
    const f = path.join(BASE, fname);
    try {
      const raw = fs.readFileSync(f, 'utf8');
      // Strip HTML tags
      const text = raw.replace(/<[^>]+>/g, ' ').replace(/&[a-z]+;/g, ' ');
      if (!EC_ROLE_RE.test(text)) { EC_ROLE_RE.lastIndex = 0; continue; }
      EC_ROLE_RE.lastIndex = 0;

      // HTML reports may cover multiple terms
      for (const tp of TERM_PATTERNS) {
        if (tp.re.test(text)) {
          const pairs = extractNameRolePairs(text);
          if (pairs.length > 0) {
            allSources.push({ file: fname, term: tp.term, pairs: pairs.length });
            for (const p of pairs) {
              addFinding(findings, tp.term, p.name, p.role, fname, p.line);
            }
          }
        }
      }
    } catch (e) {}
  }

  // 5. Scan evite guest list for EC-related info
  const eviteFiles = fs.readdirSync(BASE).filter(f => f.includes('evite') && f.endsWith('.csv'));
  for (const fname of eviteFiles) {
    try {
      const text = fs.readFileSync(path.join(BASE, fname), 'utf8');
      const pairs = extractNameRolePairs(text);
      if (pairs.length > 0) {
        allSources.push({ file: fname, term: 'multi', pairs: pairs.length });
      }
    } catch (e) {}
  }

  // ── Report ──
  console.log('═══════════════════════════════════════════════════════');
  console.log('  VALIDATION RESULTS');
  console.log('═══════════════════════════════════════════════════════\n');

  console.log(`Sources scanned: ${allSources.length} files with EC data\n`);

  const termOrder = ['2026-2028', '2024-2026', '2022-2024', '2020-2022', '2018-2020'];

  for (const term of termOrder) {
    if (!findings[term]) continue;
    const members = findings[term];
    const sorted = Object.entries(members).sort((a, b) => {
      // Sort by number of sources (most confirmed first)
      return b[1].sources.length - a[1].sources.length;
    });

    console.log(`\n┌─────────────────────────────────────────┐`);
    console.log(`│  EC TERM: ${term.padEnd(30)}│`);
    console.log(`├─────────────────────────────────────────┤`);
    console.log(`│  ${sorted.length} unique names found ${' '.repeat(19)}│`);
    console.log(`└─────────────────────────────────────────┘\n`);

    for (const [name, data] of sorted) {
      const roles = [...data.roles].join(', ');
      const srcCount = data.sources.length;
      const srcFiles = [...new Set(data.sources.map(s => s.file))];
      const confidence = srcCount >= 3 ? 'HIGH' : srcCount >= 2 ? 'MEDIUM' : 'LOW';
      const marker = confidence === 'HIGH' ? '✅' : confidence === 'MEDIUM' ? '🟡' : '⚠️';

      console.log(`  ${marker} ${name}`);
      console.log(`     Role(s): ${roles}`);
      console.log(`     Confidence: ${confidence} (${srcCount} source hits across ${srcFiles.length} files)`);
      console.log(`     Sources: ${srcFiles.slice(0, 4).join(', ')}${srcFiles.length > 4 ? ' +' + (srcFiles.length - 4) + ' more' : ''}`);
      console.log('');
    }
  }

  // ── Generate JSON output for further use ──
  const output = {
    generatedAt: new Date().toISOString(),
    sourcesScanned: allSources.length,
    terms: {}
  };

  for (const term of termOrder) {
    if (!findings[term]) continue;
    output.terms[term] = Object.entries(findings[term]).map(([name, data]) => ({
      name,
      roles: [...data.roles],
      sourceCount: data.sources.length,
      sourceFiles: [...new Set(data.sources.map(s => s.file))],
      confidence: data.sources.length >= 3 ? 'HIGH' : data.sources.length >= 2 ? 'MEDIUM' : 'LOW'
    })).sort((a, b) => b.sourceCount - a.sourceCount);
  }

  const outPath = path.join(BASE, 'ec-validation-results.json');
  fs.writeFileSync(outPath, JSON.stringify(output, null, 2));
  console.log(`\n══════════════════════════════════════════`);
  console.log(`  Results saved to: ec-validation-results.json`);
  console.log(`══════════════════════════════════════════\n`);
}

function addFinding(findings, term, name, role, file, lineText) {
  if (!findings[term]) findings[term] = {};
  // Normalize name
  const normName = name.replace(/\s+/g, ' ').trim();
  if (normName.length < 3 || normName.length > 40) return;
  // Skip obvious non-names
  if (/^(the|and|for|with|from|this|that|will|has|have|been|are|was|were|not|but)/i.test(normName)) return;

  if (!findings[term][normName]) {
    findings[term][normName] = { roles: new Set(), sources: [] };
  }
  findings[term][normName].roles.add(role);
  findings[term][normName].sources.push({ file, line: (lineText || '').substring(0, 100) });
}

function detectTermFromFilename(fname) {
  for (const tp of TERM_PATTERNS) {
    if (tp.re.test(fname)) return tp.term;
  }
  if (/2026|26-28/i.test(fname)) return '2026-2028';
  if (/2024|24-26/i.test(fname)) return '2024-2026';
  if (/2022|22-24/i.test(fname)) return '2022-2024';
  if (/2020|20-22/i.test(fname)) return '2020-2022';
  return null;
}

main().catch(e => { console.error('AGENT ERROR:', e); process.exit(1); });
