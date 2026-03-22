#!/usr/bin/env node
/**
 * BANF CRM Member List + Evidence-Based Family Grouping
 *
 * Family = husband/wife (couple) + kids as one nuclear unit.
 * Extended relatives with same surname are SEPARATE units.
 *
 * Evidence sources (multi-year document scan):
 *  1. BANF_Family_Universe_v3.xlsx — Raw Entries with "Name1+Name2 Surname"
 *     spouse pairs across 2022-26 (288 entries, ~40 explicit pairs)
 *  2. BANF_Family_Universe_v3.xlsx — Family Members with familyId
 *  3. BANF Membership 2025-26.xlsx — current membership categories (Couple/Family)
 *  4. CRM contacts (259 via live API) — anchored by email
 *  5. banf-payment-ack-results.json — payment amounts → membership tier
 *
 * Confidence = proportional to # of years/documents where two names co-occur.
 *
 * Sheet 1: All member emails (communication list)
 * Sheet 2: Nuclear family grouping with evidence + confidence
 */
const https = require('https');
const fs = require('fs');
const path = require('path');
const ExcelJS = require('exceljs');
const pdfParse = require('pdf-parse');
const officeparser = require('officeparser');
const { execSync } = require('child_process');

// ── GitHub Models Vision API ──
const VISION_MODEL = 'openai/gpt-4.1-mini';
const VISION_API_HOST = 'models.github.ai';
const VISION_API_PATH = '/inference/chat/completions';
let _ghToken = null;
function getGitHubToken() {
  if (_ghToken) return _ghToken;
  if (process.env.GITHUB_TOKEN) { _ghToken = process.env.GITHUB_TOKEN; return _ghToken; }
  try { _ghToken = execSync('gh auth token', { encoding: 'utf8' }).trim(); return _ghToken; } catch {}
  return null;
}

function visionAPIRequest(body, token) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const opts = {
      hostname: VISION_API_HOST, path: VISION_API_PATH, method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`,
        'Content-Length': Buffer.byteLength(data) }
    };
    const req = https.request(opts, res => {
      let buf = ''; res.on('data', c => buf += c);
      res.on('end', () => resolve({ status: res.statusCode, body: buf }));
    });
    req.on('error', reject);
    req.setTimeout(120000, () => { req.destroy(); reject(new Error('Vision API timeout')); });
    req.write(data); req.end();
  });
}

const GOOGLE_CLIENT_ID = '1020178199135-3usrl611ara38i7rhu2ub6sn6g1150ml.apps.googleusercontent.com';
const GOOGLE_CLIENT_SECRET = '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';
const GOOGLE_REFRESH_TOKEN = require('./banf-gmail-config').REFRESH_TOKEN;

const FROM_EMAIL = 'banfjax@gmail.com';
const PRESIDENT_EMAIL = 'ranadhir.ghosh@gmail.com';
const SITE_API = 'https://www.jaxbengali.org/_functions';

// ── HTTP helper ──
function httpsRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const opts = {
      hostname: u.hostname, port: 443,
      path: u.pathname + u.search,
      method: options.method || 'GET',
      headers: options.headers || {},
      timeout: 30000
    };
    const req = https.request(opts, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => { try { resolve(JSON.parse(d)); } catch { resolve(d); } });
    });
    req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
    req.on('error', reject);
    if (options.body) req.write(options.body);
    req.end();
  });
}

// ── Gmail Auth ──
async function getToken() {
  const body = `grant_type=refresh_token&refresh_token=${encodeURIComponent(GOOGLE_REFRESH_TOKEN)}&client_id=${encodeURIComponent(GOOGLE_CLIENT_ID)}&client_secret=${encodeURIComponent(GOOGLE_CLIENT_SECRET)}`;
  const r = await httpsRequest('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Content-Length': Buffer.byteLength(body) },
    body
  });
  if (!r.access_token) throw new Error('Token refresh failed');
  return r.access_token;
}

// ── Send email with Excel attachment ──
async function sendEmailWithAttachment(token, to, subject, htmlBody, plainText, filePath, fileName) {
  const boundary = 'boundary_banf_' + Date.now();
  const fileData = fs.readFileSync(filePath);
  const fileBase64 = fileData.toString('base64');

  const raw = [
    `From: BANF Jacksonville <${FROM_EMAIL}>`,
    `To: ${to}`,
    `Subject: ${subject}`,
    'MIME-Version: 1.0',
    `Content-Type: multipart/mixed; boundary="${boundary}"`,
    '',
    `--${boundary}`,
    'Content-Type: multipart/alternative; boundary="alt_boundary"',
    '',
    '--alt_boundary',
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: base64',
    '',
    Buffer.from(plainText).toString('base64'),
    '',
    '--alt_boundary',
    'Content-Type: text/html; charset=UTF-8',
    'Content-Transfer-Encoding: base64',
    '',
    Buffer.from(htmlBody).toString('base64'),
    '',
    '--alt_boundary--',
    '',
    `--${boundary}`,
    `Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet; name="${fileName}"`,
    'Content-Transfer-Encoding: base64',
    `Content-Disposition: attachment; filename="${fileName}"`,
    '',
    ...fileBase64.match(/.{1,76}/g),
    '',
    `--${boundary}--`
  ].join('\r\n');

  const encoded = Buffer.from(raw).toString('base64')
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

  const url = 'https://gmail.googleapis.com/gmail/v1/users/me/messages/send';
  const jsonBody = JSON.stringify({ raw: encoded });
  const r = await httpsRequest(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(jsonBody) },
    body: jsonBody
  });
  if (r.id) return r;
  throw new Error('Send failed: ' + JSON.stringify(r));
}

// ── Name / Gender helpers ──
function firstName(name) {
  if (!name) return '';
  return name.trim().split(/\s+/)[0];
}

function lastName(name) {
  if (!name) return '';
  const parts = name.trim().split(/\s+/);
  return parts.length >= 2 ? parts[parts.length - 1] : '';
}

function lastNameLower(name) {
  return lastName(name).toLowerCase();
}

function lastNameFromEmail(email) {
  const local = email.split('@')[0];
  const dotParts = local.split('.');
  if (dotParts.length >= 2) return dotParts[dotParts.length - 1].replace(/\d+/g, '').toLowerCase();
  const underParts = local.split('_');
  if (underParts.length >= 2) return underParts[underParts.length - 1].replace(/\d+/g, '').toLowerCase();
  return '';
}

// Bengali/Indian first-name gender inference
// These are common patterns — not exhaustive but covers most of our CRM
const MALE_NAMES = new Set([
  'ranadhir', 'anirban', 'sumon', 'suman', 'dipra', 'shom', 'jay', 'jayanta',
  'rajanya', 'dibendu', 'dipak', 'sudip', 'nabo', 'bhaskar', 'swapnoneel',
  'tapash', 'sourav', 'amitava', 'arnab', 'rupan', 'angsuman', 'gourab',
  'mukul', 'amit', 'sankallan', 'sankalan', 'sajal', 'raj', 'suvankar',
  'soumo', 'surajit', 'nilay', 'samiran', 'chiradip', 'rupanjan', 'anindya',
  'peter', 'mayukh', 'saugata', 'bidhan', 'ayan', 'soumyajit', 'shamit',
  'indranil', 'debashis', 'rajarshi', 'atmadeep', 'suvendu', 'debanjan',
  'prabir', 'subrata', 'tarit', 'andy', 'partha', 'raghunath', 'sumit',
  'souvik', 'ripon', 'asok', 'vikramjit', 'samrat', 'baidya', 'ananta',
  'kalyan', 'santanu', 'ab', 'tanmay', 'sanat', 'rahul', 'partha',
]);
const FEMALE_NAMES = new Set([
  'mita', 'sunetra', 'sreya', 'priyanka', 'pallavi', 'kaushiki',
  'stuti', 'holly', 'soumita', 'aparna', 'sanghamitra', 'sanjukta',
  'jiniya', 'rajasri', 'supriya', 'bratasree', 'sudeshna', 'mahua',
  'soma', 'rwiti', 'reshma', 'sonika', 'swarnali', 'chrissy',
  'antara', 'ananya', 'banani', 'paromita', 'nandini', 'poushali',
  'navnita', 'swati', 'soumali', 'indrani', 'joyita', 'subhra',
  'chandra', 'varsha', 'lopita', 'rupa', 'madhumita', 'priyanka',
  'munmun', 'sayani', 'dia', 'moumita', 'barnali', 'moushumi',
  'anita', 'latika', 'annandita', 'anupriya', 'paramita', 'rina',
  'sanhita', 'ipshita', 'bithika', 'debasmita', 'padmoja', 'raka',
  'shilpi', 'sunanda', 'anasuya', 'upasana', 'neha', 'sangita',
  'poonam', 'rai', 'sonu', 'bonnie', 'melanie',
]);

function inferGender(name) {
  const first = firstName(name).toLowerCase().replace(/[^a-z]/g, '');
  if (MALE_NAMES.has(first)) return 'M';
  if (FEMALE_NAMES.has(first)) return 'F';
  // Common Bengali name endings
  if (first.endsWith('ita') || first.endsWith('ini') || first.endsWith('ali') ||
      first.endsWith('uma') || first.endsWith('ika') || first.endsWith('iya') ||
      first.endsWith('ana') || first.endsWith('ati') || first.endsWith('ila') ||
      first.endsWith('ree') || first.endsWith('sri') || first.endsWith('lpi') ||
      first.endsWith('nda') || first.endsWith('uya')) return 'F';
  if (first.endsWith('jit') || first.endsWith('deep') || first.endsWith('esh') ||
      first.endsWith('ash') || first.endsWith('bir') || first.endsWith('nil') ||
      first.endsWith('rup') || first.endsWith('man') || first.endsWith('ndu') ||
      first.endsWith('kar') || first.endsWith('pal')) return 'M';
  return '?';
}

// ── Membership tier from payment amount ──
const TIER_MAP = {
  375: { tier: 'M2-EB', type: 'Family' },
  410: { tier: 'M2', type: 'Family' },
  280: { tier: 'M1', type: 'Family' },
  180: { tier: 'CS', type: 'Family' },
  290: { tier: 'M2-EB', type: 'Couple' },
  330: { tier: 'M2', type: 'Couple' },
  255: { tier: 'M1', type: 'Couple' },
  140: { tier: 'M1/CS', type: 'Individual/Couple' },
  215: { tier: 'M2-EB', type: 'Individual' },
  240: { tier: 'M2', type: 'Individual' },
  145: { tier: 'M2-EB', type: 'Student' },
  165: { tier: 'M2', type: 'Student' },
  100: { tier: 'M1/CS', type: 'Individual/Student' },
  75:  { tier: 'CS', type: 'Student' },
};

// ╔═══════════════════════════════════════════════════════════════╗
// ║  COMPREHENSIVE EVIDENCE-BASED FAMILY DETECTION v4            ║
// ║  Scans ALL documents, builds co-occurrence matrix,           ║
// ║  matches ALL CRM members, adds Data Lineage sheet            ║
// ╚═══════════════════════════════════════════════════════════════╝

const DATA_DIR = path.join(__dirname, 'banf1-wix', 'banf-data_ingest');
const DATA_DATA_DIR = path.join(DATA_DIR, 'data');

/**
 * Normalize a name for matching: lowercase, strip honorifics (Da/Di/Didi),
 * remove trailing numbers, extra spaces.
 */
function normName(n) {
  if (!n) return '';
  return n.trim()
    .replace(/\s+(da|di|didi|dada)\s*$/i, '')
    .replace(/\s+(da|di|didi|dada)\s*\//gi, '/')
    .replace(/\d+/g, '')
    .replace(/[()]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Extract first name (normalized, lowercase).
 */
function firstNameNorm(n) {
  return firstName(n).toLowerCase().replace(/[^a-z]/g, '');
}

/**
 * Parse a "rawName" field into individual name tokens.
 * Handles: "Name1+Name2 Surname", "Name1/Name2", "Name1 Da/ Name2 Di",
 *          "Raj & Holly Goswami", "Mousumi Mandal/ Subrata Mandal"
 */
function parseNamePair(raw) {
  if (!raw) return [];
  let s = raw.trim();
  // Remove honorifics
  s = s.replace(/\b(da|di|didi|dada)\b/gi, '').replace(/\s+/g, ' ').trim();

  const names = [];

  // Pattern: "Name1+Name2 Surname"
  const plusMatch = s.match(/^(\w+)\+(\w+)\s+(\w+.*)$/i);
  if (plusMatch) {
    names.push((plusMatch[1] + ' ' + plusMatch[3]).trim());
    names.push((plusMatch[2] + ' ' + plusMatch[3]).trim());
    return names.map(n => n.toLowerCase());
  }

  // Pattern: "Name1 & Name2 Surname"
  const ampMatch = s.match(/^(\w+)\s*&\s*(\w+)\s+(\w+.*)$/i);
  if (ampMatch) {
    names.push((ampMatch[1] + ' ' + ampMatch[3]).trim());
    names.push((ampMatch[2] + ' ' + ampMatch[3]).trim());
    return names.map(n => n.toLowerCase());
  }

  // Pattern: "Name1/ Name2" or "Name1 Surname/ Name2 Surname"
  if (s.includes('/')) {
    const parts = s.split('/').map(p => p.trim()).filter(Boolean);
    return parts.map(p => p.toLowerCase());
  }

  // Pattern: "Name1, Name2, Name3 Surname" (comma separated)
  if (s.includes(',')) {
    const parts = s.split(',').map(p => p.trim()).filter(Boolean);
    return parts.map(p => p.toLowerCase());
  }

  // Single name
  return [s.toLowerCase()];
}

// ══════════════════════════════════════════════════════════════════
//  COMPREHENSIVE FILE SCANNER — scans ALL workspace documents
// ══════════════════════════════════════════════════════════════════

/** Quick check that a parsed name looks like a real person name */
function validName(s) {
  if (!s || s.length < 2 || s.length > 60) return false;
  if (!/[a-z]/i.test(s)) return false;
  if (/^\d+[\s\-\/]*\d*$/.test(s.trim())) return false;
  if (/[@#$%^*=<>{}\[\]|\\:;!?]/.test(s)) return false;
  return s.trim().split(/\s+/).some(w => /^[a-z]{2,}/i.test(w));
}

/** Auto-discover ALL document files in the workspace recursively */
function discoverAllFiles() {
  const ROOT = __dirname;
  const extensions = new Set(['.xlsx', '.xls', '.csv', '.pdf', '.pptx', '.ppt', '.docx', '.doc', '.json']);
  const excludeDirs = new Set(['node_modules', '.git', '.wix', '_edge-profile',
    'wix-backend-backup', 'banf1-mirror', 'banf1-repo', 'banf1']);
  const results = [];
  function walk(dir, depth) {
    if (depth > 6) return;
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          if (!excludeDirs.has(entry.name) && !entry.name.startsWith('.')) walk(full, depth + 1);
        } else if (entry.isFile()) {
          const ext = path.extname(entry.name).toLowerCase();
          if (extensions.has(ext)) results.push(full);
        }
      }
    } catch (e) { /* skip inaccessible */ }
  }
  walk(ROOT, 0);
  return results;
}

/** Infer a year from filename or directory path */
function inferYearFromPath(filePath) {
  const base = path.basename(filePath);
  const m1 = base.match(/20(\d{2})\s*[-–]\s*20?(\d{2})/);
  if (m1) return `20${m1[1]}-${m1[2]}`;
  const m2 = base.match(/(20\d{2})/);
  if (m2) return m2[1];
  const dir = path.basename(path.dirname(filePath));
  if (dir.includes('22-24')) return '2022-24';
  if (dir.includes('24-26')) return '2024-26';
  return 'multi-year';
}

/** Wrap officeparser.parseOffice in a Promise — returns text string */
function parseOfficeText(filePath) {
  return new Promise((resolve, reject) => {
    try {
      const ret = officeparser.parseOffice(filePath, function(data, err) {
        if (err) reject(typeof err === 'string' ? new Error(err) : err);
        else {
          try {
            resolve(typeof data.toText === 'function' ? data.toText() : String(data || ''));
          } catch (e) { resolve(''); }
        }
      });
      // officeparser may return a Promise that rejects on corrupt files
      if (ret && typeof ret.catch === 'function') {
        ret.catch(e => reject(e));
      }
    } catch (e) { reject(e); }
  });
}

/** Scan an Excel file — pair patterns in cells + row-proximity CRM name matching */
async function scanExcelFile(filePath, source, year, crmFirstSet) {
  const results = [];
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(filePath);
  for (const ws of wb.worksheets) {
    ws.eachRow((row, rn) => {
      if (rn === 1) return;
      const rowCRMNames = [];
      row.eachCell((cell) => {
        const val = (cell.value || '').toString().trim();
        if (val.length < 3 || val.length > 300) return;
        // Pair pattern extraction
        if (val.includes('/') || val.includes('+') || val.includes('&')) {
          const parsed = parseNamePair(val);
          if (parsed.length >= 2 && parsed.every(validName)) {
            results.push({ names: parsed, source, year });
          }
        }
        // CRM name check for row proximity
        const norm = normName(val);
        if (norm && norm.length >= 3 && norm.length < 60) {
          const fn = norm.split(' ')[0];
          if (fn && fn.length > 2 && crmFirstSet.has(fn)) rowCRMNames.push(norm);
        }
      });
      // 2+ CRM names in same row = co-occurrence evidence
      const unique = [...new Set(rowCRMNames)];
      if (unique.length >= 2 && unique.length <= 4) {
        results.push({ names: unique, source: source + '[row]', year });
      }
    });
  }
  return results;
}

/** Scan a PDF file — pair patterns in lines + line-proximity CRM name matching */
async function scanPDFFile(filePath, source, year, crmFirstSet) {
  const results = [];
  const stat = fs.statSync(filePath);
  if (stat.size > 50 * 1024 * 1024) return { results, textLength: 0 };
  const buffer = new Uint8Array(fs.readFileSync(filePath));
  const parser = new pdfParse.PDFParse(buffer);
  const data = await parser.getText();
  const allText = (data.pages || []).map(p => p.text || '').join('\n');
  const lines = allText.split('\n');
  for (const line of lines) {
    const t = line.trim();
    if (t.length < 3 || t.length > 500) continue;
    // Pair patterns
    if (t.includes('/') || t.includes('+') || t.includes('&')) {
      const parsed = parseNamePair(t);
      if (parsed.length >= 2 && parsed.every(validName)) {
        results.push({ names: parsed, source, year });
      }
    }
    // Line proximity: find CRM first names on same short line
    if (t.length < 200) {
      const words = t.toLowerCase().split(/[\s,;|()]+/);
      const lineNames = [];
      for (const w of words) {
        const fn = w.replace(/[^a-z]/g, '');
        if (fn && fn.length > 2 && crmFirstSet.has(fn)) lineNames.push(fn);
      }
      const uniq = [...new Set(lineNames)];
      if (uniq.length >= 2 && uniq.length <= 4) {
        results.push({ names: uniq, source: source + '[line]', year });
      }
    }
  }
  return { results, textLength: allText.length };
}

/** Scan a PPTX file — pair patterns + line proximity */
async function scanPPTXFile(filePath, source, year, crmFirstSet) {
  const results = [];
  const text = await parseOfficeText(filePath);
  const lines = (text || '').split('\n');
  for (const line of lines) {
    const t = line.trim();
    if (t.length < 3 || t.length > 500) continue;
    if (t.includes('/') || t.includes('+') || t.includes('&')) {
      const parsed = parseNamePair(t);
      if (parsed.length >= 2 && parsed.every(validName)) {
        results.push({ names: parsed, source, year });
      }
    }
    if (t.length < 200) {
      const words = t.toLowerCase().split(/[\s,;|()]+/);
      const lineNames = [];
      for (const w of words) {
        const fn = w.replace(/[^a-z]/g, '');
        if (fn && fn.length > 2 && crmFirstSet.has(fn)) lineNames.push(fn);
      }
      const uniq = [...new Set(lineNames)];
      if (uniq.length >= 2 && uniq.length <= 4) {
        results.push({ names: uniq, source: source + '[line]', year });
      }
    }
  }
  return results;
}

/** Scan a CSV file — pair patterns in cells */
function scanCSVFile(filePath, source, year) {
  const results = [];
  const text = fs.readFileSync(filePath, 'utf8');
  for (const line of text.split('\n')) {
    const cells = line.split(/[,\t]/).map(c => c.trim().replace(/^"|"$/g, ''));
    for (const cell of cells) {
      if (cell.length > 3 && cell.length < 300 &&
          (cell.includes('/') || cell.includes('+') || cell.includes('&'))) {
        const parsed = parseNamePair(cell);
        if (parsed.length >= 2 && parsed.every(validName)) {
          results.push({ names: parsed, source, year });
        }
      }
    }
  }
  return results;
}

/** Scan a JSON file — recursively find string values with pair patterns */
function scanJSONFile(filePath, source, year) {
  const results = [];
  const stat = fs.statSync(filePath);
  if (stat.size > 10 * 1024 * 1024) return results; // skip > 10MB
  const raw = fs.readFileSync(filePath, 'utf8');
  let data;
  try { data = JSON.parse(raw); } catch { return results; }
  function walk(obj, depth) {
    if (depth > 8) return;
    if (typeof obj === 'string') {
      const s = obj.trim();
      if (s.length >= 4 && s.length <= 200 &&
          (s.includes('/') || s.includes('+') || s.includes('&'))) {
        const parsed = parseNamePair(s);
        if (parsed.length >= 2 && parsed.every(n => validName(n) && /[a-z]/i.test(n))) {
          results.push({ names: parsed, source, year });
        }
      }
    } else if (Array.isArray(obj)) {
      for (let i = 0; i < Math.min(obj.length, 5000); i++) walk(obj[i], depth + 1);
    } else if (obj && typeof obj === 'object') {
      for (const val of Object.values(obj)) walk(val, depth + 1);
    }
  }
  walk(data, 0);
  return results;
}

/**
 * COMPREHENSIVE: Scan ALL workspace documents for name co-occurrences.
 *
 * Phase 1: High-quality specific handlers (CRM payment pairs, Family Universe Raw Entries, etc.)
 * Phase 2: Generic scan of ALL 200+ files (Excel, PDF, PPTX, CSV, JSON)
 *          — pair patterns (/, +, &) in every cell/line
 *          — row/line proximity (2+ CRM member names in same row/line)
 *
 * Returns: Array of { names: string[], source: string, year: string }
 */
async function extractAllNameGroups(contacts) {
  const groups = [];
  const scannedFiles = new Set();

  // Build CRM first-name set for proximity matching
  const crmFirstSet = new Set();
  for (const c of contacts) {
    const fn = firstNameNorm(c.name);
    if (fn && fn.length > 2) crmFirstSet.add(fn);
  }

  console.log('   ── Phase 1: High-quality specific source handlers ──');

  // ─── Source 1: banf-crm-master.json — payment rawName pairs ───
  try {
    const masterPath = path.join(__dirname, 'banf-crm-master.json');
    scannedFiles.add(masterPath);
    const master = JSON.parse(fs.readFileSync(masterPath, 'utf8'));
    let pairCount = 0;
    for (const m of (master.members || [])) {
      for (const pr of m.paymentRecords || []) {
        const parsed = parseNamePair(pr.rawName);
        if (parsed.length >= 2) {
          groups.push({ names: parsed, source: 'CRM-Payment-RawName', year: pr.year || 'unknown' });
          pairCount++;
        }
      }
    }
    console.log(`   📄 CRM Master: ${pairCount} payment rawName pairs`);
  } catch (e) { console.log(`   ⚠️  banf-crm-master.json: ${e.message}`); }

  // ─── Source 2: Family Universe v3 — Raw Entries only ───
  try {
    const fuPath = path.join(DATA_DATA_DIR, 'BANF_Family_Universe_v3.xlsx');
    scannedFiles.add(fuPath);
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.readFile(fuPath);
    const rawSheet = wb.getWorksheet('Raw Entries');
    if (rawSheet) {
      rawSheet.eachRow((row, rn) => {
        if (rn === 1) return;
        const year = (row.getCell(1).value || '').toString().trim();
        const nameEntry = (row.getCell(2).value || '').toString().trim();
        const parsed = parseNamePair(nameEntry);
        if (parsed.length >= 1) groups.push({ names: parsed, source: 'FamilyUniverse-RawEntries', year: year || 'unknown' });
      });
    }
    console.log(`   📄 Family Universe v3: Raw Entries scanned`);
  } catch (e) { console.log(`   ⚠️  BANF_Family_Universe_v3.xlsx: ${e.message}`); }

  // ─── Source 3: Membership 2025-26 ───
  try {
    const memPath = path.join(DATA_DIR, 'BANF Membership 2025 - 26.xlsx');
    scannedFiles.add(memPath);
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.readFile(memPath);
    const ws = wb.worksheets[0];
    if (ws) {
      ws.eachRow((row, rn) => {
        if (rn <= 1) return;
        const rawName = (row.getCell(1).value || '').toString().trim();
        if (!rawName) return;
        const parsed = parseNamePair(rawName);
        if (parsed.length >= 1) groups.push({ names: parsed, source: 'Membership-2025-26', year: '2025-26' });
      });
    }
    console.log(`   📄 Membership 2025-26: scanned`);
  } catch (e) { console.log(`   ⚠️  Membership 2025-26: ${e.message}`); }

  // ─── Source 4: banf-payment-ack-results.json ───
  try {
    const ackPath = path.join(__dirname, 'banf-payment-ack-results.json');
    scannedFiles.add(ackPath);
    const ack = JSON.parse(fs.readFileSync(ackPath, 'utf8'));
    for (const r of ack.results || []) {
      const parsed = parseNamePair(r.name);
      if (parsed.length >= 1) groups.push({ names: parsed, source: 'PaymentAck', year: '2025-26' });
    }
    console.log(`   📄 Payment Ack: scanned`);
  } catch (e) { console.log(`   ⚠️  banf-payment-ack-results: ${e.message}`); }

  // ─── Source 5: banf-payment-ack-verified.json ───
  try {
    const vPath = path.join(__dirname, 'banf-payment-ack-verified.json');
    scannedFiles.add(vPath);
    const vData = JSON.parse(fs.readFileSync(vPath, 'utf8'));
    for (const r of vData.results || vData.verified || []) {
      const parsed = parseNamePair(r.name || r.rawName || '');
      if (parsed.length >= 1) groups.push({ names: parsed, source: 'PaymentAck-Verified', year: '2025-26' });
    }
    console.log(`   📄 Payment Ack Verified: scanned`);
  } catch (e) { console.log(`   ⚠️  banf-payment-ack-verified: ${e.message}`); }

  const phase1Count = groups.length;
  console.log(`   ✅ Phase 1: ${phase1Count} name-group records from specific sources\n`);

  // ──── Phase 2: Comprehensive generic scan of ALL workspace files ────
  console.log('   ── Phase 2: Comprehensive scan of ALL workspace files ──');
  const allFiles = discoverAllFiles();
  console.log(`   📁 Discovered ${allFiles.length} total document files`);

  let scannedCount = 0, fileHits = 0, errorCount = 0;
  const fileStats = { xlsx: 0, pdf: 0, pptx: 0, csv: 0, json: 0, docx: 0 };
  const pdfTextLengths = new Map(); // Track PDFs with low text yield for vision fallback

  for (const filePath of allFiles) {
    if (scannedFiles.has(filePath)) continue;
    const ext = path.extname(filePath).toLowerCase();
    const baseName = path.basename(filePath);
    const year = inferYearFromPath(filePath);
    let fileGroups = [];

    try {
      if (ext === '.xlsx' || ext === '.xls') {
        fileGroups = await scanExcelFile(filePath, baseName, year, crmFirstSet);
        fileStats.xlsx++;
      } else if (ext === '.pdf') {
        const pdfResult = await scanPDFFile(filePath, baseName, year, crmFirstSet);
        fileGroups = pdfResult.results;
        pdfTextLengths.set(filePath, pdfResult.textLength);
        fileStats.pdf++;
      } else if (ext === '.pptx' || ext === '.ppt') {
        fileGroups = await scanPPTXFile(filePath, baseName, year, crmFirstSet);
        fileStats.pptx++;
      } else if (ext === '.csv') {
        fileGroups = scanCSVFile(filePath, baseName, year);
        fileStats.csv++;
      } else if (ext === '.json') {
        fileGroups = scanJSONFile(filePath, baseName, year);
        fileStats.json++;
      } else if (ext === '.docx' || ext === '.doc') {
        const text = await parseOfficeText(filePath);
        const lines = (text || '').split('\n');
        for (const line of lines) {
          const t = line.trim();
          if (t.length < 3 || t.length > 500) continue;
          if (t.includes('/') || t.includes('+') || t.includes('&')) {
            const parsed = parseNamePair(t);
            if (parsed.length >= 2 && parsed.every(validName)) fileGroups.push({ names: parsed, source: baseName, year });
          }
          if (t.length < 200) {
            const words = t.toLowerCase().split(/[\s,;|()]+/);
            const lineNames = [];
            for (const w of words) { const fn = w.replace(/[^a-z]/g, ''); if (fn && fn.length > 2 && crmFirstSet.has(fn)) lineNames.push(fn); }
            const uniq = [...new Set(lineNames)];
            if (uniq.length >= 2 && uniq.length <= 4) fileGroups.push({ names: uniq, source: baseName + '[line]', year });
          }
        }
        fileStats.docx++;
      }
      scannedCount++;
      if (fileGroups.length > 0) {
        groups.push(...fileGroups);
        fileHits++;
        console.log(`   ✅ ${baseName}: ${fileGroups.length} name groups`);
      }
    } catch (e) {
      errorCount++;
      const msg = e.message || '';
      if (!msg.includes('Corrupted zip') && !msg.includes('End of data') && !msg.includes('password')) {
        console.log(`   ⚠️  ${baseName}: ${msg.substring(0, 80)}`);
      }
    }
  }

  const phase2Count = groups.length - phase1Count;
  console.log(`\n   📊 Phase 2 scan summary:`);
  console.log(`      Files scanned: ${scannedCount} (${errorCount} errors)`);
  console.log(`      By type: ${fileStats.xlsx} xlsx, ${fileStats.pdf} pdf, ${fileStats.pptx} pptx, ${fileStats.csv} csv, ${fileStats.json} json, ${fileStats.docx} docx`);
  console.log(`      Files with name data: ${fileHits}`);
  console.log(`      Additional name groups: ${phase2Count}`);

  // ──── Phase 3: Vision-based scanning for PDFs and PPTXs that had low text yield ────
  const ghToken = getGitHubToken();
  if (ghToken) {
    console.log(`\n   ── Phase 3: Vision model scan (${VISION_MODEL}) ──`);
    const { pdf: pdfToImg } = await import('pdf-to-img');

    // Only vision-scan PDFs with low text yield (< 500 chars = likely image-based)
    // Also deduplicate by basename to avoid scanning copies
    const visionCandidates = [];
    const seenBaseNames = new Set();
    for (const fp of allFiles) {
      const ext = path.extname(fp).toLowerCase();
      if (ext !== '.pdf') continue;
      const bn = path.basename(fp).toLowerCase();
      if (seenBaseNames.has(bn)) continue;
      seenBaseNames.add(bn);
      // Skip very large/small files
      try {
        const stat = fs.statSync(fp);
        if (stat.size > 30 * 1024 * 1024 || stat.size < 1000) continue;
      } catch { continue; }
      // Only vision-scan if text extraction was poor
      const textLen = pdfTextLengths.get(fp) || 0;
      if (textLen > 500) continue; // already got good text — skip vision
      visionCandidates.push(fp);
    }

    console.log(`   👁️ ${visionCandidates.length} low-text PDFs for vision-based name extraction (skipped ${seenBaseNames.size - visionCandidates.length} with good text)`);

    const NAME_EXTRACT_PROMPT = `Look at this document page image. Extract ALL person names (first name and last name) you can see.
Focus on:
- Names that appear together (couples, families, pairs like "Name1 / Name2" or "Name1 & Name2")
- Names in member lists, attendance lists, event rosters, sponsorship lists
- Names in any table or formatted list

Return ONLY a JSON array of objects. Each object has:
- "names": array of full names found together on this page section
- "context": brief description of where you found them (e.g. "membership list", "sponsor list")

Example: [{"names":["Ranadhir Ghosh","Moumita Mitra"],"context":"payment record"},{"names":["Raj Goswami"],"context":"volunteer list"}]

If no person names are visible, return: []
Return ONLY valid JSON, no markdown formatting, no backticks.`;

    let visionHits = 0, visionGroups = 0, visionErrors = 0;
    const VISION_BATCH_SIZE = 5; // more pages per API call = fewer calls
    const MAX_PAGES_PER_PDF = 8;
    const visionCallCount = { count: 0 };

    for (const fp of visionCandidates) {
      const baseName = path.basename(fp);
      const year = inferYearFromPath(fp);
      let fileVisionGroups = 0;

      try {
        const pages = await pdfToImg(fp, { scale: 0.75 }); // lower res = faster + smaller payload
        let pageNum = 0;
        let batch = [];

        for await (const pageBuffer of pages) {
          pageNum++;
          if (pageNum > MAX_PAGES_PER_PDF) break;
          batch.push({ pageNum, b64: pageBuffer.toString('base64') });

          if (batch.length >= VISION_BATCH_SIZE || pageNum >= MAX_PAGES_PER_PDF) {
            // Send batch to vision model
            const content = [];
            for (const pg of batch) {
              content.push({ type: 'image_url', image_url: { url: `data:image/png;base64,${pg.b64}` } });
            }
            content.push({ type: 'text', text: NAME_EXTRACT_PROMPT });

            try {
              visionCallCount.count++;
              const resp = await visionAPIRequest({
                model: VISION_MODEL,
                messages: [{ role: 'user', content }],
                max_tokens: 4000, temperature: 0.1
              }, ghToken);

              if (resp.status === 200) {
                const data = JSON.parse(resp.body);
                const text = data.choices?.[0]?.message?.content || '';
                const cleaned = text.replace(/```json\s*/gi, '').replace(/```\s*/gi, '').trim();
                try {
                  const nameArrays = JSON.parse(cleaned);
                  if (Array.isArray(nameArrays)) {
                    for (const entry of nameArrays) {
                      const names = (entry.names || []).map(n => normName(n)).filter(n => n && n.length > 2);
                      if (names.length >= 1) {
                        groups.push({ names, source: `${baseName}[vision-p${batch.map(b=>b.pageNum).join(',')}]`, year });
                        fileVisionGroups++;
                      }
                    }
                  }
                } catch { /* JSON parse fail — skip */ }
              } else if (resp.status === 429) {
                // Rate limited — wait and retry once
                console.log(`   ⏳ Rate limited, waiting 45s then retrying...`);
                await new Promise(r => setTimeout(r, 45000));
                const resp2 = await visionAPIRequest({
                  model: VISION_MODEL,
                  messages: [{ role: 'user', content }],
                  max_tokens: 4000, temperature: 0.1
                }, ghToken);
                if (resp2.status === 200) {
                  const data2 = JSON.parse(resp2.body);
                  const text2 = data2.choices?.[0]?.message?.content || '';
                  const cleaned2 = text2.replace(/```json\s*/gi, '').replace(/```\s*/gi, '').trim();
                  try {
                    const nameArrays2 = JSON.parse(cleaned2);
                    if (Array.isArray(nameArrays2)) {
                      for (const entry of nameArrays2) {
                        const names = (entry.names || []).map(n => normName(n)).filter(n => n && n.length > 2);
                        if (names.length >= 1) {
                          groups.push({ names, source: `${baseName}[vision-p${batch.map(b=>b.pageNum).join(',')}]`, year });
                          fileVisionGroups++;
                        }
                      }
                    }
                  } catch { /* JSON parse fail — skip */ }
                }
              }
            } catch (e) {
              visionErrors++;
            }
            batch = [];

            // Delay between API calls to stay under rate limits
            await new Promise(r => setTimeout(r, 3000));
            if (visionCallCount.count % 3 === 0) await new Promise(r => setTimeout(r, 5000));
          }
        }

        if (fileVisionGroups > 0) {
          visionHits++;
          visionGroups += fileVisionGroups;
          console.log(`   👁️ ${baseName}: ${fileVisionGroups} name groups (vision)`);
        }
      } catch (e) {
        visionErrors++;
        const msg = (e.message || '').substring(0, 60);
        if (msg && !msg.includes('password')) console.log(`   ⚠️  ${baseName}: ${msg}`);
      }
    }

    console.log(`\n   📊 Phase 3 vision summary:`);
    console.log(`      API calls: ${visionCallCount.count} (${visionErrors} errors)`);
    console.log(`      Files with vision name data: ${visionHits}`);
    console.log(`      Additional name groups from vision: ${visionGroups}`);
  } else {
    console.log(`\n   ⚠️ Phase 3 skipped: No GitHub token found for vision API`);
  }

  console.log(`\n   ✅ TOTAL name-group records: ${groups.length}`);
  return groups;
}

/**
 * Given CRM contacts and name groups, build a co-occurrence matrix.
 *
 * For each CRM member (anchored by email), find all name groups where
 * their name appears, and record all OTHER names that co-occur.
 *
 * Returns: Map<email, Map<otherEmail, { count, sources: Set, years: Set }>>
 */
function buildCoOccurrenceMatrix(contacts, nameGroups) {
  // Build indexes: first name → contacts, full name → contacts
  const byFirstName = new Map(); // firstnamenorm → [{email, name, fullnorm}]
  const byFullNorm = new Map();  // full normalized name → [{email, name}]

  for (const c of contacts) {
    const name = (c.name || '').trim();
    if (!name) continue;
    const fn = firstNameNorm(name);
    const full = normName(name);
    const entry = { email: c.email.toLowerCase(), name, fn, full };

    if (fn) {
      if (!byFirstName.has(fn)) byFirstName.set(fn, []);
      byFirstName.get(fn).push(entry);
    }
    if (full) {
      if (!byFullNorm.has(full)) byFullNorm.set(full, []);
      byFullNorm.get(full).push(entry);
    }
  }

  // For a document name, find matching CRM contacts.
  // IMPORTANT: Matches require FIRST NAME match. Surname-only is NOT enough.
  // - "Reshma" (first name only) → matches any CRM contact whose first name is "reshma"
  // - "Reshma Das" (full name) → matches CRM contact with first="reshma" + compatible last name
  // - "Das" (surname only) → NO MATCH (surname-only matching is excluded)
  function findCRMMatches(docName) {
    const dn = normName(docName);
    if (!dn) return [];
    const matches = [];

    // Reject if the name is a single token that looks like a surname (no first name)
    const docParts = dn.split(' ');
    const docFirst = docParts[0];
    const docLast = docParts.length > 1 ? docParts.slice(1).join(' ') : '';

    // If no first name can be extracted, skip
    if (!docFirst) return [];

    // Try full name match first (both first + last)
    if (byFullNorm.has(dn)) {
      for (const m of byFullNorm.get(dn)) matches.push(m);
      return matches;
    }

    // First name must match in our index
    if (!byFirstName.has(docFirst)) return [];

    for (const m of byFirstName.get(docFirst)) {
      // If document has no last name → first-name-only match (document just says "Reshma")
      if (!docLast) {
        matches.push(m);
        continue;
      }
      // If CRM has no last name → accept first-name match
      if (!m.full.includes(' ')) {
        matches.push(m);
        continue;
      }
      // Both have last names → they must be compatible
      const crmLast = m.full.split(' ').slice(1).join(' ');
      if (crmLast === docLast ||
          crmLast.startsWith(docLast) || docLast.startsWith(crmLast) ||
          crmLast.includes(docLast) || docLast.includes(crmLast)) {
        matches.push(m);
      }
    }
    return matches;
  }

  // Build the matrix: email → { otherEmail → { count, sources, years } }
  const matrix = new Map();
  // Also track: email → all doc appearances (for lineage)
  const appearances = new Map(); // email → [{ source, year, groupNames }]

  for (const group of nameGroups) {
    if (group.names.length < 1) continue;

    // Resolve each name in the group to CRM contacts
    const resolvedContacts = [];
    for (const docName of group.names) {
      const crmMatches = findCRMMatches(docName);
      for (const m of crmMatches) {
        resolvedContacts.push({ ...m, docName });
      }
    }

    // Record appearances
    for (const rc of resolvedContacts) {
      if (!appearances.has(rc.email)) appearances.set(rc.email, []);
      appearances.get(rc.email).push({
        source: group.source,
        year: group.year,
        docName: rc.docName,
        groupNames: group.names
      });
    }

    // Build pairwise co-occurrences (only if group has 2+ resolved contacts)
    if (resolvedContacts.length < 2) continue;

    // Deduplicate by email within this group
    const uniqueByEmail = new Map();
    for (const rc of resolvedContacts) {
      if (!uniqueByEmail.has(rc.email)) uniqueByEmail.set(rc.email, rc);
    }
    const unique = [...uniqueByEmail.values()];

    for (let i = 0; i < unique.length; i++) {
      for (let j = i + 1; j < unique.length; j++) {
        const a = unique[i];
        const b = unique[j];
        if (a.email === b.email) continue;

        // a → b
        if (!matrix.has(a.email)) matrix.set(a.email, new Map());
        const aRow = matrix.get(a.email);
        if (!aRow.has(b.email)) aRow.set(b.email, { count: 0, sources: new Set(), years: new Set() });
        const ab = aRow.get(b.email);
        ab.count++;
        ab.sources.add(group.source);
        ab.years.add(group.year);

        // b → a
        if (!matrix.has(b.email)) matrix.set(b.email, new Map());
        const bRow = matrix.get(b.email);
        if (!bRow.has(a.email)) bRow.set(a.email, { count: 0, sources: new Set(), years: new Set() });
        const ba = bRow.get(a.email);
        ba.count++;
        ba.sources.add(group.source);
        ba.years.add(group.year);
      }
    }
  }

  return { matrix, appearances };
}

/**
 * From the co-occurrence matrix, identify spouse pairs.
 * A spouse = the person with HIGHEST co-occurrence count AND
 * different inferred gender (when available).
 *
 * Returns families: array of { members, evidence, confidence }
 */
function identifyFamilies(contacts, matrix, appearances) {
  const emailToContact = new Map();
  for (const c of contacts) {
    emailToContact.set(c.email.toLowerCase(), c);
  }

  const assigned = new Set();
  const families = [];
  let famId = 1;

  // Sort contacts: those with most co-occurrences first
  const contactsByCoOccurrence = [...contacts].sort((a, b) => {
    const aRow = matrix.get(a.email.toLowerCase());
    const bRow = matrix.get(b.email.toLowerCase());
    const aMax = aRow ? Math.max(...[...aRow.values()].map(v => v.count)) : 0;
    const bMax = bRow ? Math.max(...[...bRow.values()].map(v => v.count)) : 0;
    return bMax - aMax;
  });

  for (const c of contactsByCoOccurrence) {
    const email = c.email.toLowerCase();
    if (assigned.has(email)) continue;

    const row = matrix.get(email);
    if (!row || row.size === 0) {
      // No co-occurrences — individual
      assigned.add(email);
      families.push({
        id: famId++,
        type: 'Individual',
        label: (c.name || email).trim(),
        confidence: 'Individual — no co-occurrence found',
        evidenceYears: '',
        evidenceSources: '',
        coOccCount: 0,
        members: [{ email, name: c.name || email }]
      });
      continue;
    }

    // Find best match: highest count, REQUIRE opposite gender + different first name
    const myGender = inferGender(c.name);
    const myFirst = firstNameNorm(c.name);
    let bestEmail = null;
    let bestScore = 0;
    let bestData = null;

    for (const [otherEmail, data] of row) {
      if (assigned.has(otherEmail)) continue;
      const otherContact = emailToContact.get(otherEmail);
      if (!otherContact) continue;

      const otherFirst = firstNameNorm(otherContact.name);
      const otherGender = inferGender(otherContact.name);

      // HARD REJECT: same first name (self-match or duplicate)
      if (myFirst && otherFirst && myFirst === otherFirst) continue;

      // HARD REJECT: same known gender (both M or both F)
      if (myGender !== '?' && otherGender !== '?' && myGender === otherGender) continue;

      let score = data.count;
      // Boost for opposite gender (one or both known)
      if (myGender !== '?' && otherGender !== '?' && myGender !== otherGender) {
        score += 5;
      }
      // Boost for same family last name
      if (lastNameLower(c.name) && lastNameLower(otherContact.name) &&
          lastNameLower(c.name) === lastNameLower(otherContact.name)) {
        score += 1;
      }

      if (score > bestScore) {
        bestScore = score;
        bestEmail = otherEmail;
        bestData = data;
      }
    }

    if (bestEmail && bestData && bestData.count >= 1) {
      const spouse = emailToContact.get(bestEmail);
      assigned.add(email);
      assigned.add(bestEmail);

      const fn1 = firstName(c.name);
      const fn2 = firstName(spouse.name);
      const ln = lastName(c.name) || lastName(spouse.name);

      let confLabel;
      if (bestData.count >= 8) confLabel = `Very High (${bestData.count} co-occurrences, ${bestData.years.size} yrs)`;
      else if (bestData.count >= 4) confLabel = `High (${bestData.count} co-occurrences, ${bestData.years.size} yrs)`;
      else if (bestData.count >= 2) confLabel = `Medium (${bestData.count} co-occurrences)`;
      else confLabel = `Low (${bestData.count} co-occurrence)`;

      families.push({
        id: famId++,
        type: 'Couple',
        label: `${fn1} & ${fn2} ${ln}`,
        confidence: confLabel,
        evidenceYears: [...bestData.years].sort().join(', '),
        evidenceSources: [...bestData.sources].join(', '),
        coOccCount: bestData.count,
        members: [
          { email, name: c.name || email },
          { email: bestEmail, name: spouse.name || bestEmail }
        ]
      });
    } else {
      assigned.add(email);
      families.push({
        id: famId++,
        type: 'Individual',
        label: (c.name || email).trim(),
        confidence: row.size > 0 ? `Review — has ${row.size} co-occurrences but none unassigned` : 'Individual',
        evidenceYears: '',
        evidenceSources: '',
        coOccCount: 0,
        members: [{ email, name: c.name || email }]
      });
    }
  }

  return families;
}


// ══════════════════════════════════════════════
//  MAIN
// ══════════════════════════════════════════════
async function main() {
  console.log('═══════════════════════════════════════════════════');
  console.log('  BANF CRM — Evidence-Based Family Grouping v6');
  console.log('  VISION + 200+ file scan + strict gender rules');
  console.log('  ' + new Date().toISOString());
  console.log('═══════════════════════════════════════════════════\n');

  // ── Step 1: Fetch all CRM contacts ──
  console.log('🔗 Fetching all CRM contacts from live site...');
  const resp = await httpsRequest(`${SITE_API}/evite_recipients?type=all_members`);
  if (!resp.success || !resp.members) {
    console.error('❌ Failed to fetch CRM:', JSON.stringify(resp).substring(0, 300));
    process.exit(1);
  }
  const contacts = resp.members;
  console.log(`   ✅ ${contacts.length} CRM contacts fetched\n`);
  contacts.sort((a, b) => (a.name || '').localeCompare(b.name || ''));

  // ── Step 2: Extract name groups from ALL documents ──
  console.log('📊 Scanning ALL workspace documents for name co-occurrences...');
  const nameGroups = await extractAllNameGroups(contacts);
  console.log('');

  // ── Step 3: Build co-occurrence matrix ──
  console.log('🔗 Building co-occurrence matrix...');
  const { matrix, appearances } = buildCoOccurrenceMatrix(contacts, nameGroups);
  const contactsWithCoOcc = [...matrix.entries()].filter(([, row]) => row.size > 0).length;
  console.log(`   ✅ ${contactsWithCoOcc} contacts have co-occurrences with others\n`);

  // ── Step 4: Identify families ──
  console.log('👨‍👩‍👧 Identifying family units from co-occurrence data...');
  const families = identifyFamilies(contacts, matrix, appearances);

  const coupleUnits = families.filter(f => f.members.length >= 2);
  const individualUnits = families.filter(f => f.members.length === 1);
  const reviewUnits = families.filter(f => f.confidence.includes('Review') || f.confidence.includes('Low'));
  console.log(`   Total family units: ${families.length}`);
  console.log(`   Couple/Family units: ${coupleUnits.length}`);
  console.log(`   Individual units: ${individualUnits.length}`);
  console.log(`   Needs review: ${reviewUnits.length}\n`);

  // Show top couples
  console.log('   Top couples (by co-occurrence count):');
  coupleUnits.sort((a, b) => b.coOccCount - a.coOccCount);
  coupleUnits.slice(0, 15).forEach(f => {
    console.log(`     ${f.label} (co-occ: ${f.coOccCount}, years: ${f.evidenceYears})`);
  });

  // ── Step 5: Generate Excel ──
  console.log('\n📝 Generating Excel with 3 sheets...');
  const wb = new ExcelJS.Workbook();
  wb.creator = 'BANF System';
  wb.created = new Date();

  // --- Sheet 1: All Member Emails ---
  const ws1 = wb.addWorksheet('All Member Emails');
  ws1.columns = [
    { header: '#',     key: 'num',   width: 6 },
    { header: 'Name',  key: 'name',  width: 30 },
    { header: 'Email', key: 'email', width: 40 }
  ];
  ws1.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  ws1.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1565C0' } };
  contacts.forEach((c, i) => {
    ws1.addRow({ num: i + 1, name: c.name || '', email: c.email });
  });
  ws1.autoFilter = 'A1:C1';

  // --- Sheet 2: Family Groups ---
  // Sort: couples first (by confidence), then individuals
  families.sort((a, b) => {
    if (a.members.length >= 2 && b.members.length < 2) return -1;
    if (a.members.length < 2 && b.members.length >= 2) return 1;
    return b.coOccCount - a.coOccCount;
  });

  const ws2 = wb.addWorksheet('Family Groups');
  ws2.columns = [
    { header: 'Unit #',            key: 'famNum',         width: 7 },
    { header: 'Family Unit',       key: 'familyLabel',    width: 32 },
    { header: 'Type',              key: 'unitType',       width: 12 },
    { header: 'Members',           key: 'memberCount',    width: 9 },
    { header: 'Name',              key: 'name',           width: 28 },
    { header: 'Email',             key: 'email',          width: 38 },
    { header: 'Co-occ Count',      key: 'coOccCount',     width: 13 },
    { header: 'Evidence (Years)',   key: 'evidenceYears',  width: 30 },
    { header: 'Evidence (Sources)', key: 'evidenceSources', width: 38 },
    { header: 'Confidence',        key: 'confidence',     width: 38 },
    { header: 'Verify?',           key: 'verify',         width: 10 }
  ];
  ws2.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  ws2.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF283593' } };

  let altColor = false;
  for (const fam of families) {
    const isCouple = fam.members.length >= 2;
    const needsCheck = fam.confidence.includes('Review') || fam.confidence.includes('Low');

    altColor = !altColor;
    const bgColor = isCouple
      ? (altColor ? 'FFE8F5E9' : 'FFE3F2FD')
      : (needsCheck ? 'FFFFF3E0' : (altColor ? 'FFFAFAFA' : 'FFFFFFFF'));

    for (let i = 0; i < fam.members.length; i++) {
      const m = fam.members[i];
      const row = ws2.addRow({
        famNum: i === 0 ? fam.id : '',
        familyLabel: i === 0 ? fam.label : '',
        unitType: i === 0 ? fam.type : '',
        memberCount: i === 0 ? fam.members.length : '',
        name: m.name,
        email: m.email,
        coOccCount: i === 0 ? fam.coOccCount : '',
        evidenceYears: i === 0 ? fam.evidenceYears : '',
        evidenceSources: i === 0 ? fam.evidenceSources : '',
        confidence: i === 0 ? fam.confidence : '',
        verify: needsCheck ? '← CHECK' : ''
      });

      row.eachCell(cell => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } };
      });

      if (isCouple && i === 0) row.getCell('familyLabel').font = { bold: true };
      if (needsCheck) row.getCell('verify').font = { bold: true, color: { argb: 'FFFF6F00' } };
      if (fam.confidence.startsWith('Very High')) row.getCell('confidence').font = { bold: true, color: { argb: 'FF1B5E20' } };
      else if (fam.confidence.startsWith('High')) row.getCell('confidence').font = { color: { argb: 'FF2E7D32' } };
      else if (fam.confidence.includes('Review')) row.getCell('confidence').font = { bold: true, color: { argb: 'FFD84315' } };
    }
  }
  ws2.autoFilter = 'A1:K1';

  // --- Sheet 3: Data Lineage ---
  // For EVERY CRM member, list all other names they co-occur with + count
  const ws3 = wb.addWorksheet('Data Lineage');
  ws3.columns = [
    { header: '#',                key: 'num',           width: 5 },
    { header: 'CRM Name',        key: 'crmName',       width: 28 },
    { header: 'CRM Email',       key: 'crmEmail',      width: 36 },
    { header: 'Doc Appearances',  key: 'docAppearances', width: 14 },
    { header: 'Co-occurs With',  key: 'coOccName',     width: 28 },
    { header: 'Co-occ Email',    key: 'coOccEmail',    width: 36 },
    { header: 'Co-occ Count',    key: 'count',         width: 12 },
    { header: 'Years Seen',      key: 'years',         width: 30 },
    { header: 'Sources',         key: 'sources',       width: 40 }
  ];
  ws3.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  ws3.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4A148C' } };

  const emailToContact = new Map();
  for (const c of contacts) emailToContact.set(c.email.toLowerCase(), c);

  let lineageNum = 0;
  altColor = false;
  for (const c of contacts) {
    lineageNum++;
    const email = c.email.toLowerCase();
    const row_ = matrix.get(email);
    const appCount = (appearances.get(email) || []).length;

    if (!row_ || row_.size === 0) {
      // No co-occurrences — still show the member
      altColor = !altColor;
      const bg = altColor ? 'FFFFF3E0' : 'FFFFF8E1';
      const r = ws3.addRow({
        num: lineageNum, crmName: c.name || '', crmEmail: c.email,
        docAppearances: appCount,
        coOccName: '(none)', coOccEmail: '', count: 0, years: '', sources: ''
      });
      r.eachCell(cell => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } };
      });
      r.getCell('coOccName').font = { italic: true, color: { argb: 'FF999999' } };
      continue;
    }

    // Sort co-occurrences by count descending
    const coOccList = [...row_.entries()]
      .map(([otherEmail, data]) => ({
        otherEmail,
        otherName: (emailToContact.get(otherEmail) || {}).name || otherEmail,
        count: data.count,
        years: [...data.years].sort().join(', '),
        sources: [...data.sources].join(', ')
      }))
      .sort((a, b) => b.count - a.count);

    altColor = !altColor;
    const bgBase = altColor ? 'FFE8EAF6' : 'FFE3F2FD';

    for (let i = 0; i < coOccList.length; i++) {
      const co = coOccList[i];
      const r = ws3.addRow({
        num: i === 0 ? lineageNum : '',
        crmName: i === 0 ? (c.name || '') : '',
        crmEmail: i === 0 ? c.email : '',
        docAppearances: i === 0 ? appCount : '',
        coOccName: co.otherName,
        coOccEmail: co.otherEmail,
        count: co.count,
        years: co.years,
        sources: co.sources
      });
      r.eachCell(cell => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgBase } };
      });
      if (i === 0) {
        r.getCell('crmName').font = { bold: true };
      }
      // Highlight top co-occurrence
      if (co.count >= 4) {
        r.getCell('count').font = { bold: true, color: { argb: 'FF1B5E20' } };
        r.getCell('coOccName').font = { bold: true, color: { argb: 'FF1B5E20' } };
      }
    }
  }
  ws3.autoFilter = 'A1:I1';

  // Save
  const outputPath = path.join(__dirname, 'BANF_CRM_Member_List.xlsx');
  await wb.xlsx.writeFile(outputPath);
  console.log(`\n✅ Excel saved: ${outputPath}`);

  // ── Step 6: Email to president ──
  console.log(`📧 Sending to ${PRESIDENT_EMAIL}...`);
  const token = await getToken();

  const subject = `BANF CRM Family Grouping v6 — ${coupleUnits.length} Couples (Vision + 200+ files + gender rules) — Please Verify`;
  const plainText = [
    'BANF CRM — Evidence-Based Family Grouping v6',
    'VISION AI + 200+ files + strict gender enforcement',
    '=====================================================',
    '',
    `Total members in CRM: ${contacts.length}`,
    `Total family units: ${families.length}`,
    `  Couple units: ${coupleUnits.length}`,
    `  Individual units: ${individualUnits.length}`,
    `  Needs review: ${reviewUnits.length}`,
    '',
    'HOW FAMILIES WERE IDENTIFIED:',
    '  Every CRM email is an anchor. The system comprehensively scanned',
    '  200+ workspace files spanning multiple years:',
    '  — ALL Excel files (membership, events, attendance, QR, finance)',
    '  — ALL PDF files (Jagriti magazines, membership/sponsorship docs, event plans)',
    '  — ALL PowerPoint files (budget, financial summaries, presentations)',
    '  — ALL CSV files (guest lists, member data)',
    '  — ALL JSON files (CRM data, payment records, evite scans, RSVP data)',
    '',
    '  For each file, the system extracted:',
    '  1. Explicit pair patterns: "Name1/Name2", "Name1+Name2 Surname", "Name1 & Name2"',
    '  2. Row proximity: 2+ CRM member names in the same Excel row',
    '  3. Line proximity: 2+ CRM member names on the same PDF/PPTX line',
    '',
    '  A co-occurrence matrix was built: every time two names appear together',
    '  in the same record/row/line, the count increments. Higher count = higher confidence.',
    '',
    'SHEETS:',
    '  1. All Member Emails — complete list for communication',
    '  2. Family Groups — couples + individuals with evidence',
    '  3. Data Lineage — for EVERY member, shows ALL names they co-occur with,',
    '     the count, years, and sources. Use this to debug false positives.',
    '',
    'Please review and reply with corrections.',
    '',
    '— BANF System'
  ].join('\n');

  const htmlBody = `<div style="font-family:'Segoe UI',Arial,sans-serif;max-width:640px;margin:0 auto">
  <div style="background:linear-gradient(135deg,#1a237e,#283593);color:#fff;padding:20px 24px;border-radius:10px 10px 0 0">
    <h2 style="margin:0;font-size:1.2rem">BANF CRM — Evidence-Based Family Grouping v6</h2>
    <p style="margin:6px 0 0;opacity:.9;font-size:.85rem">VISION AI + 200+ files + strict gender enforcement — ${new Date().toLocaleDateString()}</p>
  </div>
  <div style="padding:20px 24px;border:1px solid #e0e0e0;border-top:none;border-radius:0 0 10px 10px">
    <div style="background:#e8eaf6;border-radius:6px;padding:12px;margin-bottom:16px;font-size:.9rem">
      <strong>How:</strong> Every CRM email is an anchor. The system scanned <strong>200+ files</strong>
      including Excel, PDF (via Vision AI), PowerPoint, Word, CSV, and JSON.
      Image-based PDFs were processed with a vision model to extract names.
      Strict gender rules ensure only opposite-gender, different-first-name pairings.
      A co-occurrence matrix was built — higher count = higher confidence.
    </div>
    <table style="width:100%;border-collapse:collapse;margin:16px 0">
      <tr style="background:#f5f5f5"><td style="padding:10px 14px;border-bottom:1px solid #eee"><strong>Total CRM Members</strong></td><td style="padding:10px 14px;border-bottom:1px solid #eee;text-align:right;font-size:1.3rem;font-weight:700;color:#1a237e">${contacts.length}</td></tr>
      <tr><td style="padding:10px 14px;border-bottom:1px solid #eee"><strong>Family Units</strong></td><td style="padding:10px 14px;border-bottom:1px solid #eee;text-align:right;font-size:1.2rem;font-weight:700">${families.length}</td></tr>
      <tr style="background:#e8f5e9"><td style="padding:10px 14px;border-bottom:1px solid #eee;color:#2e7d32"><strong>&nbsp;&nbsp;Couple units</strong></td><td style="padding:10px 14px;border-bottom:1px solid #eee;text-align:right;font-size:1.1rem;font-weight:700;color:#2e7d32">${coupleUnits.length}</td></tr>
      <tr><td style="padding:10px 14px;border-bottom:1px solid #eee"><strong>&nbsp;&nbsp;Individual units</strong></td><td style="padding:10px 14px;border-bottom:1px solid #eee;text-align:right;font-size:1.1rem;font-weight:700">${individualUnits.length}</td></tr>
      <tr style="background:#fff3e0"><td style="padding:10px 14px;border-bottom:1px solid #eee;color:#e65100"><strong>&nbsp;&nbsp;Needs review</strong></td><td style="padding:10px 14px;border-bottom:1px solid #eee;text-align:right;font-size:1.1rem;font-weight:700;color:#e65100">${reviewUnits.length}</td></tr>
    </table>
    <p style="margin:16px 0 8px"><strong>Excel contains 3 sheets:</strong></p>
    <ol style="margin:0;padding-left:20px">
      <li><strong>All Member Emails</strong> — Complete list of all ${contacts.length} emails</li>
      <li><strong>Family Groups</strong> — ${coupleUnits.length} couples + ${individualUnits.length} individuals with co-occurrence count and confidence</li>
      <li><strong>Data Lineage</strong> — For EVERY member, shows ALL names they co-occur with across all documents, with counts and sources. <em>Use this to verify/debug pairings.</em></li>
    </ol>
    <p style="margin-top:16px;padding:12px;background:#fff3e0;border-radius:6px;border-left:4px solid #ff9800;font-size:.9rem">
      <strong>Action requested:</strong> Check Sheet 2 for wrong/missing couples. Use Sheet 3 (Data Lineage) to see the raw evidence for each member.
    </p>
    <p style="color:#777;font-size:.82rem;margin-top:20px;border-top:1px solid #eee;padding-top:12px">Bengali Association of North Florida (BANF) | banfjax@gmail.com</p>
  </div>
</div>`;

  try {
    const result = await sendEmailWithAttachment(
      token, PRESIDENT_EMAIL, subject, htmlBody, plainText,
      outputPath, 'BANF_CRM_Member_List.xlsx'
    );
    console.log(`✅ Email sent! Message ID: ${result.id}`);
  } catch (e) {
    console.error(`❌ Email failed: ${e.message}`);
  }

  console.log('\n═══════════════════════════════════════════════════');
  console.log('  Done!');
  console.log('═══════════════════════════════════════════════════');
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });
