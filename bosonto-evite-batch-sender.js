#!/usr/bin/env node
/**
 * ═══════════════════════════════════════════════════════════════════════
 *  BANF Bosonto Utsob 2026 — Full Evite Scanner + Batch Email Sender
 * ═══════════════════════════════════════════════════════════════════════
 *
 *  Complete pipeline:
 *    1. Scan Gmail for ALL Evite notification emails (Feb 2026)
 *    2. Parse each email → extract guest name, RSVP, adult/kid counts
 *    3. Cross-reference with CRM for payment status & member data
 *    4. Run verification agent (integrity checks)
 *    5. Send emails in progressive batches (small → larger)
 *
 *  Usage:
 *    node bosonto-evite-batch-sender.js --scan          # Phase 1-3: scan + reconcile
 *    node bosonto-evite-batch-sender.js --verify        # Phase 4: verify only
 *    node bosonto-evite-batch-sender.js --dry-run       # Phase 5: dry run (no sending)
 *    node bosonto-evite-batch-sender.js --send          # Phase 5: live send in batches
 *    node bosonto-evite-batch-sender.js --send --batch=5 --start=0
 *    node bosonto-evite-batch-sender.js --no-images     # Skip image attachments
 *    node bosonto-evite-batch-sender.js --scan --send   # Full pipeline
 *
 * ═══════════════════════════════════════════════════════════════════════
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

// ── Config ──────────────────────────────────────────────────────
const WIX_ENDPOINT = 'https://banfwix.wixsite.com/banf1/_functions/bosonto_pipeline';
const ADMIN_KEY = 'banf-bosonto-2026-live';
const CRM_FILE = path.join(__dirname, 'banf-crm-reconciliation.json');
const SCAN_OUTPUT = path.join(__dirname, 'bosonto-evite-scan.json');
const PIPELINE_FILE = path.join(__dirname, 'bosonto-full-pipeline.json');
const RESULT_FILE = path.join(__dirname, 'bosonto-batch-result.json');

// Gmail OAuth2 (same credentials as bosonto-email-sender.js — dual credential support)
const GOOGLE_CLIENT_ID = '1020178199135-3usrl611ara38i7rhu2ub6sn6g1150ml.apps.googleusercontent.com';
const GOOGLE_CLIENT_SECRET = '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';
const PLAYGROUND_CLIENT_ID = '407408718192.apps.googleusercontent.com';
const PLAYGROUND_SECRET = 'kd-_2_AUosoGGTNYyMJiFL3j';
const GOOGLE_REFRESH_TOKEN = require('./banf-gmail-config').REFRESH_TOKEN;

const PRICING = {
  m2:       { family: 375, couple: 330, individual: 205, student: 145, name: 'M2 Premium' },
  m1:       { family: 280, couple: 255, individual: 140, student: 100, name: 'M1 Regular' },
  cultural: { family: 180, couple: 140, individual: 100, student: 75, name: 'Cultural Special' },
  guest:    { family: 50, couple: 35, individual: 25, student: 15, name: 'Guest Pass' }
};

// ── CLI Args ────────────────────────────────────────────────────
const args = process.argv.slice(2);
const DO_SCAN = args.includes('--scan');
const DO_VERIFY = args.includes('--verify');
const DO_SEND = args.includes('--send');
const DRY_RUN = args.includes('--dry-run');
const DO_DECLINED = args.includes('--declined');
const NO_IMAGES = args.includes('--no-images');
const batchArg = args.find(a => a.startsWith('--batch='));
const BATCH_SIZE = batchArg ? parseInt(batchArg.split('=')[1]) : 3;
const startArg = args.find(a => a.startsWith('--start='));
const START_INDEX = startArg ? parseInt(startArg.split('=')[1]) : 0;
const countArg = args.find(a => a.startsWith('--count='));
const MAX_COUNT = countArg ? parseInt(countArg.split('=')[1]) : 0; // 0 = no limit
const BATCH_DELAY_MS = 5000;

if (!DO_SCAN && !DO_VERIFY && !DO_SEND && !DRY_RUN && !DO_DECLINED) {
  console.log('Usage: node bosonto-evite-batch-sender.js [--scan] [--verify] [--dry-run] [--send] [--declined] [--batch=N] [--start=N] [--count=N] [--no-images]');
  console.log('  --scan      Fetch & parse all Evite emails from Gmail');
  console.log('  --verify    Run verification agent on pipeline data');
  console.log('  --dry-run   Build pipeline, print summary, don\'t send');
  console.log('  --send      Send emails to paid + unpaid-yes members');
  console.log('  --declined  Send appreciation emails to No-RSVP members');
  console.log('  --batch=N   Batch size (default: 3)');
  console.log('  --start=N   Start from member index N (default: 0)');
  console.log('  --count=N   Max members to send to (default: 0=all)');
  console.log('  --no-images Skip image attachments');
  process.exit(0);
}

console.log('═══════════════════════════════════════════════════════════════');
console.log('  🌸 BANF Bosonto Utsob 2026 — Evite Scanner + Batch Sender');
console.log('  📡 Endpoint: ' + WIX_ENDPOINT);
console.log('  🔍 Scan: ' + (DO_SCAN ? 'YES' : 'NO'));
console.log('  ✅ Verify: ' + (DO_VERIFY || DO_SCAN ? 'YES' : 'NO'));
console.log('  📧 Send: ' + (DO_SEND ? 'LIVE' : DRY_RUN ? 'DRY RUN' : 'NO'));
console.log('  📦 Batch size: ' + BATCH_SIZE + ', start: ' + START_INDEX + (MAX_COUNT > 0 ? ', count: ' + MAX_COUNT : ''));
console.log('  🖼️  Images: ' + (NO_IMAGES ? 'DISABLED' : 'ENABLED'));
console.log('═══════════════════════════════════════════════════════════════\n');

// ═══════════════════════════════════════════════════════════════
// GMAIL API HELPERS
// ═══════════════════════════════════════════════════════════════

function httpsRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const opts = {
      hostname: u.hostname,
      port: 443,
      path: u.pathname + u.search,
      method: options.method || 'GET',
      headers: options.headers || {},
      timeout: 30000
    };
    const req = https.request(opts, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(data) }); }
        catch { resolve({ status: res.statusCode, data: data }); }
      });
    });
    req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
    req.on('error', reject);
    if (options.body) req.write(options.body);
    req.end();
  });
}

async function getGmailToken() {
  const credentials = [
    [GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET],
    [PLAYGROUND_CLIENT_ID, PLAYGROUND_SECRET]
  ];
  let lastError = null;
  for (const [cid, csec] of credentials) {
    const body = `grant_type=refresh_token&refresh_token=${encodeURIComponent(GOOGLE_REFRESH_TOKEN)}&client_id=${encodeURIComponent(cid)}&client_secret=${encodeURIComponent(csec)}`;
    const resp = await httpsRequest('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Content-Length': Buffer.byteLength(body) },
      body
    });
    if (resp.data.access_token) return resp.data.access_token;
    lastError = resp.data.error_description || resp.data.error || 'Unknown error';
  }
  throw new Error('Gmail token: ' + lastError + ' (tried both app + playground credentials)');
}

async function gmailSearch(query, token, maxResults = 500) {
  const q = encodeURIComponent(query);
  const allIds = [];
  let pageToken = '';
  while (true) {
    const url = `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${q}&maxResults=${Math.min(maxResults - allIds.length, 100)}${pageToken ? '&pageToken=' + pageToken : ''}`;
    const resp = await httpsRequest(url, { headers: { Authorization: `Bearer ${token}` } });
    if (resp.data.error) throw new Error('Gmail search error: ' + (resp.data.error.message || JSON.stringify(resp.data.error)));
    const msgs = resp.data.messages || [];
    allIds.push(...msgs.map(m => m.id));
    if (!resp.data.nextPageToken || allIds.length >= maxResults) break;
    pageToken = resp.data.nextPageToken;
  }
  return allIds;
}

async function gmailGetMessage(id, token) {
  const url = `https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}?format=full`;
  const resp = await httpsRequest(url, { headers: { Authorization: `Bearer ${token}` } });
  if (resp.data.error) throw new Error('Gmail get error: ' + resp.data.error.message);
  const msg = resp.data;
  const headers = (msg.payload && msg.payload.headers) || [];
  const getH = name => (headers.find(h => h.name.toLowerCase() === name.toLowerCase()) || {}).value || '';

  let bodyText = '';
  let bodyHtml = '';
  function extractParts(part) {
    if (part.mimeType === 'text/plain' && part.body && part.body.data) {
      try { bodyText += Buffer.from(part.body.data, 'base64').toString('utf8'); } catch {}
    }
    if (part.mimeType === 'text/html' && part.body && part.body.data) {
      try { bodyHtml += Buffer.from(part.body.data, 'base64').toString('utf8'); } catch {}
    }
    if (part.parts) part.parts.forEach(extractParts);
  }
  extractParts(msg.payload || {});

  // If no plain text, strip HTML
  if (!bodyText && bodyHtml) {
    bodyText = bodyHtml.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
                       .replace(/<[^>]+>/g, ' ')
                       .replace(/&nbsp;/g, ' ')
                       .replace(/&amp;/g, '&')
                       .replace(/&lt;/g, '<')
                       .replace(/&gt;/g, '>')
                       .replace(/&#\d+;/g, '')
                       .replace(/\s+/g, ' ')
                       .trim();
  }

  return {
    id,
    from: getH('From'),
    to: getH('To'),
    subject: getH('Subject'),
    date: getH('Date'),
    body: bodyText.trim(),
    bodyHtml
  };
}

// ═══════════════════════════════════════════════════════════════
// EVITE EMAIL PARSER
// ═══════════════════════════════════════════════════════════════

function parseEviteEmail(msg) {
  const result = {
    gmailId: msg.id,
    from: msg.from,
    subject: msg.subject,
    date: msg.date,
    guestName: null,
    guestEmail: null,
    rsvp: null,        // yes / no / maybe / unclear
    adults: 0,
    kids: 0,
    dietary: null,
    message: null,
    parseMethod: null,
    raw: msg.body ? msg.body.substring(0, 500) : ''
  };

  const subj = (msg.subject || '');
  const body = (msg.body || '');
  const fullText = `${subj}\n${body}`;

  // ── EVITE FORMAT: Subject = "Evite update | New RSVP from GuestName" ──
  let match = subj.match(/New\s+RSVP\s+from\s+(.+?)$/i);
  if (match) {
    result.guestName = match[1].trim();
    result.parseMethod = 'evite_subject';
  }

  // ── EVITE FORMAT: Subject = "Evite Reminder: GuestName..." ──
  if (!result.guestName) {
    match = subj.match(/Evite\s+(?:update|reminder)[^|]*\|\s*(?:New\s+RSVP\s+from\s+)?(.+?)$/i);
    if (match) {
      result.guestName = match[1].trim();
      result.parseMethod = 'evite_subject_alt';
    }
  }

  // ── EVITE BODY: "GuestName replied Yes/No for N adults and N kid(s)" ──
  // Primary pattern with guest count
  match = body.match(/([A-Z][\w\s'-]+?)\s+replied\s+(Yes|No|Maybe)\s+for\s+(\d+)\s+adult/i);
  if (match) {
    if (!result.guestName) result.guestName = match[1].trim();
    result.rsvp = match[2].toLowerCase();
    result.adults = parseInt(match[3]) || 0;
    result.parseMethod = (result.parseMethod || '') + '+body_full';

    // Kids: "and N kid(s)"
    const kidsMatch = body.match(/(\d+)\s+kid/i);
    if (kidsMatch) result.kids = parseInt(kidsMatch[1]) || 0;
  }

  // ── EVITE BODY: "GuestName replied Yes/No" (no count) ──
  if (!result.rsvp) {
    match = body.match(/([A-Z][\w\s'-]+?)\s+replied\s+(Yes|No|Maybe)(?:\s|$)/i);
    if (match) {
      if (!result.guestName) result.guestName = match[1].trim();
      result.rsvp = match[2].toLowerCase();
      result.parseMethod = (result.parseMethod || '') + '+body_replied';
      if (result.rsvp === 'yes') result.adults = 1; // at least 1
    }
  }

  // ── Subject-based fallback: "GuestName has RSVP'd Yes/No" ──
  if (!result.rsvp) {
    match = subj.match(/(.+?)\s+has\s+RSVP'?d?\s+(Yes|No|Maybe)/i);
    if (match) {
      if (!result.guestName) result.guestName = match[1].trim();
      result.rsvp = match[2].toLowerCase();
      result.parseMethod = 'subject_rsvpd';
    }
  }

  // ── Dietary info ──
  if (body.match(/\bveg\b/i) && !body.match(/\bnon[\s-]*veg/i)) result.dietary = 'vegetarian';
  else if (body.match(/\bnon[\s-]*veg/i)) result.dietary = 'non_vegetarian';

  // ── Extract email if present (not evite addresses) ──
  const emailMatch = fullText.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
  if (emailMatch && !emailMatch[1].includes('evite.com') && !emailMatch[1].includes('banfjax')) {
    result.guestEmail = emailMatch[1].toLowerCase();
  }

  // ── Clean up guest name ──
  if (result.guestName) {
    // Remove trailing numbers/special chars from usernames like "Poushalidatta1"
    result.guestName = result.guestName.replace(/\d+$/, '').trim();
    // Capitalize properly
    if (result.guestName === result.guestName.toLowerCase() || result.guestName === result.guestName.toUpperCase()) {
      result.guestName = result.guestName.split(/\s+/).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
    }
  }

  return result;
}

// ═══════════════════════════════════════════════════════════════
// CRM CROSS-REFERENCE
// ═══════════════════════════════════════════════════════════════

function loadCRM() {
  const recon = JSON.parse(fs.readFileSync(CRM_FILE, 'utf8'));
  return recon.members || recon;
}

function normalize(s) {
  return (s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

function findCRMMember(members, guestName, guestEmail) {
  // 1. Exact email match
  if (guestEmail) {
    const byEmail = members.find(m => (m.email || '').toLowerCase() === guestEmail.toLowerCase());
    if (byEmail) return { member: byEmail, matchType: 'email_exact', confidence: 1.0 };
  }

  if (!guestName) return null;

  const normGuest = normalize(guestName);
  const guestParts = guestName.toLowerCase().split(/\s+/).filter(p => p.length > 1);

  // 2. Exact display name match
  for (const m of members) {
    if (normalize(m.displayName) === normGuest) return { member: m, matchType: 'name_exact', confidence: 0.95 };
    const fullName = `${m.firstName || ''} ${m.lastName || ''}`.trim();
    if (normalize(fullName) === normGuest) return { member: m, matchType: 'fullname_exact', confidence: 0.95 };
  }

  // 3. Email handle match — Evite username = email handle (e.g., "Asahaech" = asahaech@yahoo.com)
  const normGuestLower = normGuest.toLowerCase();
  for (const m of members) {
    const handle = (m.email || '').split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '');
    if (handle && normGuestLower === handle) {
      return { member: m, matchType: 'email_handle_exact', confidence: 0.9 };
    }
    // Handle with numbers stripped might match (soma1979p → soma)
    const handleNoNums = handle.replace(/\d+/g, '');
    const guestNoNums = normGuestLower.replace(/\d+/g, '');
    if (handleNoNums.length >= 4 && guestNoNums.length >= 4 && handleNoNums === guestNoNums) {
      return { member: m, matchType: 'email_handle_fuzzy', confidence: 0.8 };
    }
  }

  // 4. Fuzzy name match (first + last name components)
  if (guestParts.length >= 2) {
    for (const m of members) {
      const mFirst = (m.firstName || '').toLowerCase();
      const mLast = (m.lastName || '').toLowerCase();
      // Both first and last match (any order)
      if (guestParts.includes(mFirst) && guestParts.includes(mLast)) {
        return { member: m, matchType: 'name_parts', confidence: 0.85 };
      }
    }
  }

  // 5. Spouse name match (check household members)
  for (const m of members) {
    for (const hm of (m.householdMembers || [])) {
      const hmName = normalize(`${hm.firstName || ''} ${hm.lastName || ''}`);
      if (hmName && hmName === normGuest) {
        return { member: m, matchType: 'spouse_name', confidence: 0.8 };
      }
      const hmFirst = (hm.firstName || '').toLowerCase();
      const hmLast = (hm.lastName || '').toLowerCase();
      if (guestParts.length >= 2 && guestParts.includes(hmFirst) && guestParts.includes(hmLast)) {
        return { member: m, matchType: 'spouse_name_parts', confidence: 0.75 };
      }
    }
  }

  // 6. Household display name match
  for (const m of members) {
    if (m.householdDisplayName && normalize(m.householdDisplayName).includes(normGuest)) {
      return { member: m, matchType: 'household_name', confidence: 0.7 };
    }
  }

  // 7. First-name-only match (low confidence — only if unique)
  if (guestParts.length >= 1) {
    const firstNameMatches = members.filter(m =>
      (m.firstName || '').toLowerCase() === guestParts[0]
    );
    if (firstNameMatches.length === 1) {
      return { member: firstNameMatches[0], matchType: 'first_name_unique', confidence: 0.6 };
    }
  }

  return null;
}

// ═══════════════════════════════════════════════════════════════
// SMART TIER & CATEGORY RESOLUTION
// ═══════════════════════════════════════════════════════════════

function resolveSmartTier(m) {
  const ht = (m.householdType || 'individual').toLowerCase();
  if (ht === 'family' || ht === 'couple') return ht;
  const hhCat = (m.householdMembershipCategory || '').toLowerCase();
  if (hhCat.includes('family')) return 'family';
  if (hhCat.includes('couple')) return 'couple';
  const hhAmt = m.householdMembershipAmount || 0;
  if (hhAmt > 0) {
    for (const [, cat] of Object.entries(PRICING)) {
      if (cat.family === hhAmt) return 'family';
      if (cat.couple === hhAmt) return 'couple';
    }
  }
  // Check own payment records (amount AND category)
  for (const pay of (m.paymentRecords || [])) {
    const amt = pay.amount || 0;
    const pCat = (pay.category || '').toLowerCase();
    if (pCat.includes('family')) return 'family';
    if (pCat.includes('couple')) return 'couple';
    for (const [, cat] of Object.entries(PRICING)) {
      if (cat.family === amt) return 'family';
      if (cat.couple === amt) return 'couple';
    }
  }
  // RELATIONSHIP AGENT: Check familyMembers for spouse
  if ((m.familyMembers || []).length > 0) {
    for (const fm of m.familyMembers) {
      if (fm.paymentRecords) {
        for (const pay of fm.paymentRecords) {
          const pCat = (pay.category || '').toLowerCase();
          if (pCat.includes('family')) return 'family';
          if (pCat.includes('couple')) return 'couple';
        }
      }
    }
    return m.inferredKids > 0 ? 'family' : 'couple';
  }
  // Check householdMembers
  if ((m.householdMembers || []).length > 0) {
    for (const hm of m.householdMembers) {
      if (hm.paymentRecords) {
        for (const pay of hm.paymentRecords) {
          const pCat = (pay.category || '').toLowerCase();
          if (pCat.includes('family')) return 'family';
          if (pCat.includes('couple')) return 'couple';
        }
      }
    }
    return m.inferredKids > 0 ? 'family' : 'couple';
  }
  // Check householdDisplayName for "&" separator
  if (m.householdDisplayName && m.householdDisplayName.includes('&')) {
    return m.inferredKids > 0 ? 'family' : 'couple';
  }
  return ht === 'student' ? 'student' : 'individual';
}

function guessCategoryFromAmount(amount, hhType) {
  const tier = hhType === 'family' ? 'family' : hhType === 'couple' ? 'couple' : 'individual';
  for (const [catId, cat] of Object.entries(PRICING)) { if (cat[tier] === amount) return catId; }
  for (const [catId, cat] of Object.entries(PRICING)) { for (const [t, p] of Object.entries(cat)) { if (t !== 'name' && p === amount) return catId; } }
  return null;
}

// ═══════════════════════════════════════════════════════════════
// PHASE 1: SCAN GMAIL FOR EVITE EMAILS
// ═══════════════════════════════════════════════════════════════

async function scanEviteEmails() {
  console.log('\n🔍 PHASE 1: Scanning Gmail for Evite emails about Bosonto Utsob...');

  const token = await getGmailToken();
  console.log('   ✅ Gmail token obtained');

  // Search for all Evite-related emails mentioning Bosonto
  // Also search for direct RSVP-style emails
  const queries = [
    'from:evite.com Bosonto after:2026/01/01',
    'from:evite.com "Bosonto Utsob" after:2026/01/01',
    'subject:Bosonto from:evite after:2026/01/01',
    'from:mailva.evite.com Bosonto after:2026/01/01',
    'subject:"RSVP" Bosonto after:2026/01/01',
  ];

  const allIds = new Set();
  for (const q of queries) {
    try {
      const ids = await gmailSearch(q, token, 500);
      ids.forEach(id => allIds.add(id));
      console.log(`   📧 Query "${q.substring(0, 50)}..." → ${ids.length} results`);
    } catch (e) {
      console.warn(`   ⚠️  Query failed: ${e.message}`);
    }
  }

  console.log(`   📬 Total unique emails: ${allIds.size}`);

  // Fetch and parse each email
  const parsed = [];
  const errors = [];
  let count = 0;
  for (const id of allIds) {
    count++;
    try {
      process.stdout.write(`\r   📨 Fetching ${count}/${allIds.size}...`);
      const msg = await gmailGetMessage(id, token);

      // Only process Evite notification emails (from evite.com domain)
      const fromLower = (msg.from || '').toLowerCase();
      const isEvite = fromLower.includes('evite.com');
      const isBosonto = (msg.subject || '').toLowerCase().includes('bosonto') ||
                        (msg.body || '').toLowerCase().includes('bosonto');

      if (!isBosonto) continue; // Skip non-Bosonto emails

      const rsvp = parseEviteEmail(msg);
      rsvp.isEviteEmail = isEvite;
      parsed.push(rsvp);
    } catch (e) {
      errors.push({ id, error: e.message });
    }
  }
  console.log(`\n   ✅ Parsed ${parsed.length} Bosonto-related emails (${errors.length} errors)`);

  // Deduplicate: keep latest email per guest name
  const byGuest = new Map();
  for (const r of parsed) {
    const key = normalize(r.guestName || r.guestEmail || r.gmailId);
    if (!key) { byGuest.set(r.gmailId, r); continue; }
    const existing = byGuest.get(key);
    if (!existing || new Date(r.date) > new Date(existing.date)) {
      byGuest.set(key, r);
    }
  }

  const dedupedResults = [...byGuest.values()];
  console.log(`   📋 After dedup: ${dedupedResults.length} unique RSVPs`);

  // Summary
  const yesCount = dedupedResults.filter(r => r.rsvp === 'yes').length;
  const noCount = dedupedResults.filter(r => r.rsvp === 'no').length;
  const maybeCount = dedupedResults.filter(r => r.rsvp === 'maybe').length;
  const unclearCount = dedupedResults.filter(r => !r.rsvp || r.rsvp === 'unclear').length;
  const totalAdults = dedupedResults.filter(r => r.rsvp === 'yes').reduce((sum, r) => sum + (r.adults || 0), 0);
  const totalKids = dedupedResults.filter(r => r.rsvp === 'yes').reduce((sum, r) => sum + (r.kids || 0), 0);

  console.log(`\n   📊 RSVP Breakdown:`);
  console.log(`      ✅ Yes: ${yesCount} (${totalAdults} adults + ${totalKids} kids = ${totalAdults + totalKids} total attendees)`);
  console.log(`      ❌ No: ${noCount}`);
  console.log(`      🤷 Maybe: ${maybeCount}`);
  console.log(`      ❓ Unclear: ${unclearCount}`);

  // Save scan results
  const scanData = {
    scannedAt: new Date().toISOString(),
    totalEmails: allIds.size,
    totalParsed: parsed.length,
    totalDeduped: dedupedResults.length,
    summary: { yes: yesCount, no: noCount, maybe: maybeCount, unclear: unclearCount, totalAdults, totalKids },
    results: dedupedResults,
    errors,
    rawParsed: parsed
  };

  fs.writeFileSync(SCAN_OUTPUT, JSON.stringify(scanData, null, 2));
  console.log(`   💾 Saved to ${path.basename(SCAN_OUTPUT)}`);

  return scanData;
}

// ═══════════════════════════════════════════════════════════════
// PHASE 2-3: CROSS-REFERENCE WITH CRM & BUILD PIPELINE
// ═══════════════════════════════════════════════════════════════

function buildPipeline(scanData) {
  console.log('\n📋 PHASE 2-3: Cross-referencing with CRM & building pipeline...');

  const members = loadCRM();
  console.log(`   📂 CRM loaded: ${members.length} members`);

  // Also load existing CRM Bosonto data (in case scan is incomplete)
  const crmBosonto = members.filter(m =>
    (m.eventAttendance || []).some(e => (e.eventName || '').toLowerCase().includes('bosonto'))
  );
  console.log(`   📋 CRM Bosonto attendees: ${crmBosonto.length}`);

  const pipeline = [];
  const unmatched = [];
  const processedEmails = new Set();

  // Process scan results
  const eviteResults = scanData ? scanData.results : [];
  console.log(`   🔍 Evite scan results: ${eviteResults.length}`);

  for (const rsvp of eviteResults) {
    const crmMatch = findCRMMember(members, rsvp.guestName, rsvp.guestEmail);

    if (crmMatch) {
      const m = crmMatch.member;
      if (processedEmails.has(m.email.toLowerCase())) continue; // Skip duplicates
      processedEmails.add(m.email.toLowerCase());

      const pay2026 = (m.paymentRecords || []).find(p => p.year === '2026-27');
      const tier = resolveSmartTier(m);
      const eviteName = (rsvp.guestName || '').trim();
      // If CRM displayName looks like an email, prefer evite guest name
      const rawCrmName = (m.displayName || `${m.firstName || ''} ${m.lastName || ''}`).trim();
      const crmName = (rawCrmName && !rawCrmName.includes('@')) ? rawCrmName : '';
      const bestName = crmName || eviteName || m.email;

      pipeline.push({
        email: m.email,
        firstName: m.firstName || (eviteName.split(' ')[0] || ''),
        lastName: m.lastName || (eviteName.split(' ').slice(1).join(' ') || ''),
        displayName: bestName,
        phone: m.phone || '',
        address: m.address || '',
        city: m.city || 'Jacksonville',
        state: m.state || 'FL',
        zip: m.zip || '',
        householdType: m.householdType || 'individual',
        isECMember: m.isECMember || false,
        householdDisplayName: m.householdDisplayName || '',
        householdMembers: m.householdMembers || [],
        householdMembershipAmount: m.householdMembershipAmount || 0,
        householdMembershipCategory: m.householdMembershipCategory || '',
        paymentRecords: m.paymentRecords || [],
        familyMembers: m.familyMembers || [],
        inferredKids: m.inferredKids || 0,
        memberId: m.memberId || m._id || '',
        familyId: m.familyId || '',
        eviteResponse: rsvp.rsvp || 'unclear',
        eviteAdults: rsvp.adults || 0,
        eviteKids: rsvp.kids || 0,
        eviteGuestName: rsvp.guestName,
        paymentAmount: pay2026 ? pay2026.amount : 0,
        paymentStatus: pay2026 ? 'paid' : 'unpaid',
        paymentSource: pay2026 ? pay2026.source : null,
        paymentSenderName: pay2026 ? pay2026.rawName : null,
        membershipCategory: pay2026 ? guessCategoryFromAmount(pay2026.amount, tier) : null,
        membershipTier: tier,
        crmMatchType: crmMatch.matchType,
        crmMatchConfidence: crmMatch.confidence,
        source: 'evite_scan'
      });
    } else {
      // Unmatched — new guest not in CRM
      unmatched.push({
        guestName: rsvp.guestName,
        guestEmail: rsvp.guestEmail,
        rsvp: rsvp.rsvp,
        adults: rsvp.adults,
        kids: rsvp.kids,
        message: rsvp.message,
        date: rsvp.date,
        parseMethod: rsvp.parseMethod,
        raw: rsvp.raw
      });
    }
  }

  // Also include CRM Bosonto members not found in scan
  for (const m of crmBosonto) {
    if (processedEmails.has(m.email.toLowerCase())) continue;
    processedEmails.add(m.email.toLowerCase());

    const bosonto = (m.eventAttendance || []).find(e => (e.eventName || '').toLowerCase().includes('bosonto'));
    const pay2026 = (m.paymentRecords || []).find(p => p.year === '2026-27');
    const tier = resolveSmartTier(m);

    pipeline.push({
      email: m.email,
      firstName: m.firstName || '',
      lastName: m.lastName || '',
      displayName: m.displayName || `${m.firstName} ${m.lastName}`,
      phone: m.phone || '',
      address: m.address || '',
      city: m.city || 'Jacksonville',
      state: m.state || 'FL',
      zip: m.zip || '',
      householdType: m.householdType || 'individual',
      isECMember: m.isECMember || false,
      householdDisplayName: m.householdDisplayName || '',
      householdMembers: m.householdMembers || [],
      householdMembershipAmount: m.householdMembershipAmount || 0,
      householdMembershipCategory: m.householdMembershipCategory || '',
      paymentRecords: m.paymentRecords || [],
      familyMembers: m.familyMembers || [],
      inferredKids: m.inferredKids || 0,
      memberId: m.memberId || m._id || '',
      familyId: m.familyId || '',
      eviteResponse: (bosonto.rsvp || '').toLowerCase(),
      eviteAdults: parseInt(bosonto.adults) || 0,
      eviteKids: parseInt(bosonto.kids) || 0,
      eviteGuestName: m.displayName,
      paymentAmount: pay2026 ? pay2026.amount : 0,
      paymentStatus: pay2026 ? 'paid' : 'unpaid',
      paymentSource: pay2026 ? pay2026.source : null,
      paymentSenderName: pay2026 ? pay2026.rawName : null,
      membershipCategory: pay2026 ? guessCategoryFromAmount(pay2026.amount, tier) : null,
      membershipTier: tier,
      crmMatchType: 'crm_existing',
      crmMatchConfidence: 1.0,
      source: 'crm_bosonto'
    });
  }

  // Also add paid members who have 2026-27 payment but no Evite RSVP
  for (const m of members) {
    if (processedEmails.has((m.email || '').toLowerCase())) continue;
    const pay2026 = (m.paymentRecords || []).find(p => p.year === '2026-27');
    if (!pay2026) continue;
    processedEmails.add(m.email.toLowerCase());
    const tier = resolveSmartTier(m);

    pipeline.push({
      email: m.email,
      firstName: m.firstName || '',
      lastName: m.lastName || '',
      displayName: m.displayName || `${m.firstName} ${m.lastName}`,
      phone: m.phone || '',
      address: m.address || '',
      city: m.city || 'Jacksonville',
      state: m.state || 'FL',
      zip: m.zip || '',
      householdType: m.householdType || 'individual',
      isECMember: m.isECMember || false,
      householdDisplayName: m.householdDisplayName || '',
      householdMembers: m.householdMembers || [],
      householdMembershipAmount: m.householdMembershipAmount || 0,
      householdMembershipCategory: m.householdMembershipCategory || '',
      paymentRecords: m.paymentRecords || [],
      familyMembers: m.familyMembers || [],
      inferredKids: m.inferredKids || 0,
      memberId: m.memberId || m._id || '',
      familyId: m.familyId || '',
      eviteResponse: null,
      eviteAdults: 0,
      eviteKids: 0,
      eviteGuestName: null,
      paymentAmount: pay2026.amount,
      paymentStatus: 'paid',
      paymentSource: pay2026.source,
      paymentSenderName: pay2026.rawName,
      membershipCategory: guessCategoryFromAmount(pay2026.amount, tier),
      membershipTier: tier,
      crmMatchType: 'paid_no_evite',
      crmMatchConfidence: 1.0,
      source: 'crm_paid'
    });
  }

  // Classify pipeline
  const paid = pipeline.filter(m => m.paymentStatus === 'paid');
  const unpaidYes = pipeline.filter(m => m.eviteResponse === 'yes' && m.paymentStatus !== 'paid');
  const declined = pipeline.filter(m => m.eviteResponse === 'no');
  const maybe = pipeline.filter(m => m.eviteResponse === 'maybe');
  const other = pipeline.filter(m => !['yes', 'no', 'maybe'].includes(m.eviteResponse) && m.paymentStatus !== 'paid');

  // Only send emails to: paid members + unpaid-yes members + declined (no)
  const sendable = [...paid, ...unpaidYes];
  // Exclude paid members from declined list (they already got thank-you emails)
  const paidEmails = new Set(paid.map(m => m.email.toLowerCase()));
  const declinedSendable = declined.filter(m => !paidEmails.has(m.email.toLowerCase()));

  console.log(`\n   📊 Pipeline Summary:`);
  console.log(`      Total: ${pipeline.length} members`);
  console.log(`      ✅ Paid: ${paid.length} → verify + signup emails`);
  console.log(`      🔶 Unpaid (Yes RSVP): ${unpaidYes.length} → payment reminder emails`);
  console.log(`      ❌ Declined: ${declined.length} → appreciation + next event emails`);
  console.log(`      🤷 Maybe: ${maybe.length} → no emails (for now)`);
  console.log(`      ❓ Other: ${other.length} → no emails`);
  console.log(`      📧 Sendable: ${sendable.length + declinedSendable.length} (${paid.length * 2 + unpaidYes.length + declinedSendable.length} emails)`);
  console.log(`      ❓ Unmatched Evite guests: ${unmatched.length}`);

  if (unmatched.length > 0) {
    console.log(`\n   🔍 Unmatched guests (need manual resolution):`);
    for (const u of unmatched) {
      console.log(`      ${u.guestName || 'UNKNOWN'} ${u.guestEmail ? '<' + u.guestEmail + '>' : ''} - ${u.rsvp || 'unclear'} (${u.adults || 0} adults, ${u.kids || 0} kids)`);
    }
  }

  const pipelineData = {
    builtAt: new Date().toISOString(),
    summary: {
      total: pipeline.length,
      paid: paid.length,
      unpaidYes: unpaidYes.length,
      declined: declined.length,
      maybe: maybe.length,
      other: other.length,
      sendable: sendable.length,
      declinedSendable: declinedSendable.length,
      expectedEmails: paid.length * 2 + unpaidYes.length + declinedSendable.length,
      unmatched: unmatched.length
    },
    sendable,
    declinedSendable,
    all: pipeline,
    unmatched,
    declined: declined
  };

  fs.writeFileSync(PIPELINE_FILE, JSON.stringify(pipelineData, null, 2));
  console.log(`   💾 Saved pipeline to ${path.basename(PIPELINE_FILE)}`);

  return pipelineData;
}

// ═══════════════════════════════════════════════════════════════
// PHASE 4: VERIFICATION AGENT
// ═══════════════════════════════════════════════════════════════

function runVerificationAgent(pipelineData) {
  console.log('\n✅ PHASE 4: Running Verification Agent...');

  const checks = [];
  let passed = 0;
  let warned = 0;
  let failed = 0;

  function check(name, condition, detail = '') {
    const status = condition ? 'PASS' : 'FAIL';
    if (condition) passed++; else failed++;
    checks.push({ name, status, detail });
    const icon = condition ? '✅' : '❌';
    console.log(`   ${icon} ${name}${detail ? ': ' + detail : ''}`);
  }

  function warn(name, condition, detail = '') {
    if (!condition) {
      warned++;
      checks.push({ name, status: 'WARN', detail });
      console.log(`   ⚠️  ${name}${detail ? ': ' + detail : ''}`);
    } else {
      passed++;
      checks.push({ name, status: 'PASS', detail });
      console.log(`   ✅ ${name}`);
    }
  }

  const sendable = pipelineData.sendable || [];
  const paid = sendable.filter(m => m.paymentStatus === 'paid');
  const unpaidYes = sendable.filter(m => m.eviteResponse === 'yes' && m.paymentStatus !== 'paid');

  // ── Data Integrity ──
  console.log('\n   --- Data Integrity ---');
  check('Pipeline has members', sendable.length > 0, `${sendable.length} sendable members`);

  const emails = sendable.map(m => m.email.toLowerCase());
  const uniqueEmails = new Set(emails);
  check('No duplicate emails', emails.length === uniqueEmails.size, `${emails.length} total, ${uniqueEmails.size} unique`);

  check('All members have email', sendable.every(m => m.email && m.email.includes('@')), sendable.filter(m => !m.email || !m.email.includes('@')).map(m => m.displayName).join(', ') || 'all valid');

  check('All members have displayName', sendable.every(m => m.displayName && m.displayName.length > 1), sendable.filter(m => !m.displayName).map(m => m.email).join(', ') || 'all valid');

  // ── Payment Verification ──
  console.log('\n   --- Payment Verification ---');
  check('Paid members have payment amount', paid.every(m => m.paymentAmount > 0), paid.filter(m => !m.paymentAmount).map(m => m.email).join(', ') || 'all valid');

  check('Paid members have membership category', paid.every(m => m.membershipCategory), paid.filter(m => !m.membershipCategory).map(m => m.email + ': $' + m.paymentAmount).join(', ') || 'all valid');

  for (const m of paid) {
    const cat = PRICING[m.membershipCategory];
    if (cat) {
      const expectedPrice = cat[m.membershipTier];
      warn(`${m.displayName} payment matches tier pricing`,
        m.paymentAmount === expectedPrice,
        m.paymentAmount !== expectedPrice ?
          `Paid $${m.paymentAmount}, expected $${expectedPrice} for ${m.membershipCategory} ${m.membershipTier}` : '');
    }
  }

  // ── Tier Verification ──
  console.log('\n   --- Tier Assignment ---');
  for (const m of sendable) {
    const tier = m.membershipTier;
    warn(`${m.displayName} tier is valid`, ['family', 'couple', 'individual', 'student'].includes(tier), `tier="${tier}"`);
  }

  // ── Email Flow Verification ──
  console.log('\n   --- Email Flow ---');
  check('Paid members get 2 emails (verify + signup)', true, `${paid.length} × 2 = ${paid.length * 2} emails`);
  check('Unpaid Yes members get 1 email (payment_reminder)', true, `${unpaidYes.length} × 1 = ${unpaidYes.length} emails`);
  check('Total expected emails', true, `${paid.length * 2 + unpaidYes.length} total`);

  // ── CRM Match Quality ──
  console.log('\n   --- CRM Match Quality ---');
  const highConf = sendable.filter(m => m.crmMatchConfidence >= 0.85).length;
  const medConf = sendable.filter(m => m.crmMatchConfidence >= 0.6 && m.crmMatchConfidence < 0.85).length;
  const lowConf = sendable.filter(m => m.crmMatchConfidence < 0.6).length;
  check('High confidence matches (≥85%)', highConf > 0, `${highConf} members`);
  warn('No low confidence matches', lowConf === 0, lowConf > 0 ? `${lowConf} members with <60% match confidence` : '');

  // ── Batch Safety ──
  console.log('\n   --- Batch Safety ---');
  const totalBatches = Math.ceil(sendable.length / BATCH_SIZE);
  check('Batch size reasonable', BATCH_SIZE >= 1 && BATCH_SIZE <= 10, `size=${BATCH_SIZE}, ${totalBatches} batches`);
  warn('First batch is small for validation', BATCH_SIZE <= 5, `batch_size=${BATCH_SIZE}`);

  // ── Summary ──
  console.log(`\n   📊 Verification Summary: ${passed} passed, ${warned} warnings, ${failed} failed`);

  const verificationResult = {
    timestamp: new Date().toISOString(),
    passed,
    warned,
    failed,
    checks,
    recommendation: failed === 0 ? 'SAFE_TO_SEND' : 'FIX_ISSUES_FIRST'
  };

  return verificationResult;
}

// ═══════════════════════════════════════════════════════════════
// PHASE 5: BATCH SENDING
// ═══════════════════════════════════════════════════════════════

function sendBatchToWix(members, images, batchNum, totalBatches) {
  return new Promise((resolve) => {
    const payload = JSON.stringify({
      adminKey: ADMIN_KEY,
      members,
      images
    });

    console.log(`\n   📦 Batch ${batchNum}/${totalBatches}: ${members.length} members (${Math.round(payload.length / 1024)} KB)`);
    members.forEach(m => {
      const st = m.paymentStatus === 'paid' ? '✅' : m.eviteResponse === 'yes' ? '🔶' : m.eviteResponse === 'no' ? '📨' : '❓';
      console.log(`      ${st} ${m.displayName} <${m.email}> ${m.membershipTier}`);
    });

    const url = new URL(WIX_ENDPOINT);
    const options = {
      hostname: url.hostname,
      port: 443,
      path: url.pathname,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) },
      timeout: 60000
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        console.log(`      📬 HTTP ${res.statusCode}`);
        try {
          resolve(JSON.parse(data));
        } catch {
          console.error(`      ❌ Parse error: ${data.substring(0, 200)}`);
          resolve({ success: false, error: `HTTP ${res.statusCode}`, emailsSent: 0, results: [], errors: [{ error: data.substring(0, 200) }] });
        }
      });
    });

    req.on('timeout', () => {
      console.error(`      ❌ Timeout`);
      req.destroy();
      resolve({ success: false, error: 'Timeout', emailsSent: 0, results: [], errors: [{ error: 'Timeout' }] });
    });

    req.on('error', (e) => {
      console.error(`      ❌ Error: ${e.message}`);
      resolve({ success: false, error: e.message, emailsSent: 0, results: [], errors: [{ error: e.message }] });
    });

    req.write(payload);
    req.end();
  });
}

async function executeBatchSending(pipelineData, dryRun = false) {
  let sendable = (pipelineData.sendable || []).slice(START_INDEX);
  if (MAX_COUNT > 0) sendable = sendable.slice(0, MAX_COUNT);
  if (sendable.length === 0) {
    console.log('\n⚠️  No members to send to.');
    return;
  }

  console.log(`\n🚀 PHASE 5: ${dryRun ? 'DRY RUN' : 'LIVE SENDING'} — ${sendable.length} members, batch size ${BATCH_SIZE}`);

  // Load images
  let images = null;
  if (!NO_IMAGES) {
    try {
      const eventsB64 = fs.readFileSync(path.join(__dirname, 'membership_events.jpg')).toString('base64');
      const feesB64 = fs.readFileSync(path.join(__dirname, 'membership_fees.jpg')).toString('base64');
      images = { events: eventsB64, fees: feesB64 };
      console.log(`   📸 Images loaded: events=${Math.round(eventsB64.length / 1024)}KB, fees=${Math.round(feesB64.length / 1024)}KB`);
    } catch (e) {
      console.warn(`   ⚠️  Images not loaded: ${e.message}`);
    }
  }

  if (dryRun) {
    console.log('\n   🧪 DRY RUN — Not sending, showing what would be sent:');
    const paid = sendable.filter(m => m.paymentStatus === 'paid');
    const unpaidYes = sendable.filter(m => m.eviteResponse === 'yes' && m.paymentStatus !== 'paid');
    const declinedList = (pipelineData.declinedSendable || []).slice(START_INDEX);

    console.log(`\n   ✅ PAID (${paid.length}) → verify + signup emails:`);
    paid.forEach(m => console.log(`      ${m.displayName} <${m.email}> - ${m.membershipTier} - $${m.paymentAmount} ${m.membershipCategory || ''}`));

    console.log(`\n   🔶 UNPAID YES (${unpaidYes.length}) → payment reminder:`);
    unpaidYes.forEach(m => console.log(`      ${m.displayName} <${m.email}> - ${m.membershipTier} - ${m.eviteAdults}a/${m.eviteKids}k`));

    console.log(`\n   ❌ DECLINED (${declinedList.length}) → appreciation + next event:`);
    declinedList.forEach(m => console.log(`      ${m.displayName} <${m.email}> - ${m.membershipTier} - hh:${m.householdType}`));

    console.log(`\n   📧 Would send ${paid.length * 2 + unpaidYes.length + declinedList.length} emails total`);

    // Save dry run
    const dryRunData = {
      mode: 'dry_run', timestamp: new Date().toISOString(),
      summary: { paid: paid.length, unpaidYes: unpaidYes.length, declined: declinedList.length, totalEmails: paid.length * 2 + unpaidYes.length + declinedList.length },
      paid: paid.map(m => ({ email: m.email, displayName: m.displayName, tier: m.membershipTier, amount: m.paymentAmount, category: m.membershipCategory })),
      unpaidYes: unpaidYes.map(m => ({ email: m.email, displayName: m.displayName, tier: m.membershipTier, adults: m.eviteAdults, kids: m.eviteKids })),
      declined: declinedList.map(m => ({ email: m.email, displayName: m.displayName, tier: m.membershipTier, householdType: m.householdType }))
    };
    fs.writeFileSync(path.join(__dirname, 'bosonto-batch-dryrun.json'), JSON.stringify(dryRunData, null, 2));
    console.log(`\n   💾 Dry run saved to bosonto-batch-dryrun.json`);
    return;
  }

  // LIVE SENDING
  const batches = [];
  for (let i = 0; i < sendable.length; i += BATCH_SIZE) {
    batches.push(sendable.slice(i, i + BATCH_SIZE));
  }

  console.log(`   📦 ${batches.length} batches of ≤${BATCH_SIZE}`);

  const allResults = [];
  const allErrors = [];
  let totalEmails = 0;
  let batchesFailed = 0;

  for (let i = 0; i < batches.length; i++) {
    if (i > 0) {
      console.log(`\n   ⏳ Waiting ${BATCH_DELAY_MS / 1000}s before batch ${i + 1}...`);
      await new Promise(r => setTimeout(r, BATCH_DELAY_MS));
    }

    const result = await sendBatchToWix(batches[i], images, i + 1, batches.length);

    if (result.success) {
      totalEmails += result.emailsSent || 0;
      if (result.results) {
        allResults.push(...result.results);
        for (const r of result.results) {
          const sentCount = r.emails ? r.emails.filter(e => e.messageId).length : 0;
          console.log(`      ✉️  ${r.displayName}: ${sentCount} sent`);
          // Show verification token info
          for (const e of (r.emails || [])) {
            if (e.verifyToken) console.log(`         🔗 Verify token: ${e.verifyToken}`);
          }
        }
      }
      if (result.errors && result.errors.length > 0) {
        allErrors.push(...result.errors);
        for (const e of result.errors) {
          console.error(`      ❌ ${e.displayName || e.email}: ${e.error}`);
        }
      }
    } else {
      batchesFailed++;
      console.error(`      ❌ Batch ${i + 1} FAILED: ${result.error}`);
      allErrors.push({ batch: i + 1, error: result.error });

      // If first batch fails, abort
      if (i === 0) {
        console.error('\n   🛑 First batch failed — aborting to avoid further issues.');
        break;
      }

      // If 2+ batches fail in a row, abort
      if (batchesFailed >= 2) {
        console.error('\n   🛑 Multiple batch failures — aborting.');
        break;
      }
    }
  }

  // ── Final Summary ──
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('  🌸 BATCH SENDING COMPLETE');
  console.log(`  📧 Emails sent: ${totalEmails}`);
  console.log(`  👤 Members processed: ${allResults.length}`);
  console.log(`  📦 Batches: ${batches.length} (${batchesFailed} failed)`);
  if (allErrors.length > 0) {
    console.log(`  ⚠️  Errors: ${allErrors.length}`);
    for (const e of allErrors) {
      console.log(`     ❌ ${e.displayName || 'Batch ' + e.batch}: ${e.error}`);
    }
  }
  console.log('═══════════════════════════════════════════════════════════════');

  // Save results
  const fullResult = {
    mode: 'live', timestamp: new Date().toISOString(),
    batchSize: BATCH_SIZE, startIndex: START_INDEX,
    totalEmails, totalMembers: allResults.length,
    totalBatches: batches.length, batchesFailed,
    results: allResults,
    errors: allErrors
  };
  fs.writeFileSync(RESULT_FILE, JSON.stringify(fullResult, null, 2));
  console.log(`📄 Result saved to ${path.basename(RESULT_FILE)}`);
}

// ═══════════════════════════════════════════════════════════════
// PHASE 5b: DECLINED RSVP BATCH SENDING
// ═══════════════════════════════════════════════════════════════

async function executeDeclinedSending(pipelineData) {
  let declined = (pipelineData.declinedSendable || []).slice(START_INDEX);
  if (MAX_COUNT > 0) declined = declined.slice(0, MAX_COUNT);
  if (declined.length === 0) {
    console.log('\n⚠️  No declined members to send to.');
    return;
  }

  console.log(`\n🚀 PHASE 5b: DECLINED BATCH SENDING — ${declined.length} members, batch size ${BATCH_SIZE}`);

  // Load images
  let images = null;
  if (!NO_IMAGES) {
    try {
      const eventsB64 = fs.readFileSync(path.join(__dirname, 'membership_events.jpg')).toString('base64');
      const feesB64 = fs.readFileSync(path.join(__dirname, 'membership_fees.jpg')).toString('base64');
      images = { events: eventsB64, fees: feesB64 };
      console.log(`   📸 Images loaded: events=${Math.round(eventsB64.length / 1024)}KB, fees=${Math.round(feesB64.length / 1024)}KB`);
    } catch (e) {
      console.warn(`   ⚠️  Images not loaded: ${e.message}`);
    }
  }

  // Mark each declined member so Wix backend knows to send declined_rsvp template
  const declinedMembers = declined.map(m => ({
    ...m,
    eviteResponse: 'no'  // Ensure it's set
  }));

  const batches = [];
  for (let i = 0; i < declinedMembers.length; i += BATCH_SIZE) {
    batches.push(declinedMembers.slice(i, i + BATCH_SIZE));
  }

  console.log(`   📦 ${batches.length} batches of ≤${BATCH_SIZE}`);

  const allResults = [];
  const allErrors = [];
  let totalEmails = 0;
  let batchesFailed = 0;

  for (let i = 0; i < batches.length; i++) {
    if (i > 0) {
      console.log(`\n   ⏳ Waiting ${BATCH_DELAY_MS / 1000}s before batch ${i + 1}...`);
      await new Promise(r => setTimeout(r, BATCH_DELAY_MS));
    }

    const result = await sendBatchToWix(batches[i], images, i + 1, batches.length);

    if (result.success) {
      totalEmails += result.emailsSent || 0;
      if (result.results) {
        allResults.push(...result.results);
        for (const r of result.results) {
          const sentCount = r.emails ? r.emails.filter(e => e.messageId).length : 0;
          console.log(`      ✉️  ${r.displayName}: ${sentCount} sent (declined_rsvp)`);
        }
      }
      if (result.errors && result.errors.length > 0) {
        allErrors.push(...result.errors);
        for (const e of result.errors) {
          console.error(`      ❌ ${e.displayName || e.email}: ${e.error}`);
        }
      }
    } else {
      batchesFailed++;
      console.error(`      ❌ Batch ${i + 1} FAILED: ${result.error}`);
      allErrors.push({ batch: i + 1, error: result.error });
      if (i === 0) { console.error('\n   🛑 First batch failed — aborting.'); break; }
      if (batchesFailed >= 2) { console.error('\n   🛑 Multiple failures — aborting.'); break; }
    }
  }

  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('  📨 DECLINED BATCH SENDING COMPLETE');
  console.log(`  📧 Emails sent: ${totalEmails}`);
  console.log(`  👤 Declined members processed: ${allResults.length}`);
  console.log(`  📦 Batches: ${batches.length} (${batchesFailed} failed)`);
  console.log('═══════════════════════════════════════════════════════════════');

  const fullResult = {
    mode: 'declined_live', timestamp: new Date().toISOString(),
    batchSize: BATCH_SIZE, startIndex: START_INDEX,
    totalEmails, totalMembers: allResults.length,
    totalBatches: batches.length, batchesFailed,
    results: allResults, errors: allErrors
  };
  fs.writeFileSync(path.join(__dirname, 'bosonto-declined-result.json'), JSON.stringify(fullResult, null, 2));
  console.log(`📄 Result saved to bosonto-declined-result.json`);
}

// ═══════════════════════════════════════════════════════════════
// MAIN ORCHESTRATOR
// ═══════════════════════════════════════════════════════════════

async function main() {
  try {
    let scanData = null;
    let pipelineData = null;

    // Phase 1-3: Scan + Build Pipeline
    if (DO_SCAN) {
      scanData = await scanEviteEmails();
      pipelineData = buildPipeline(scanData);
    } else {
      // Load from saved files
      if (fs.existsSync(SCAN_OUTPUT)) {
        scanData = JSON.parse(fs.readFileSync(SCAN_OUTPUT, 'utf8'));
        console.log(`📂 Loaded scan data from ${path.basename(SCAN_OUTPUT)} (${scanData.results?.length || 0} results)`);
      }
      if (fs.existsSync(PIPELINE_FILE)) {
        pipelineData = JSON.parse(fs.readFileSync(PIPELINE_FILE, 'utf8'));
        console.log(`📂 Loaded pipeline from ${path.basename(PIPELINE_FILE)} (${pipelineData.sendable?.length || 0} sendable)`);
      }
      if (!pipelineData && scanData) {
        pipelineData = buildPipeline(scanData);
      }
      if (!pipelineData) {
        // Build from CRM only (no scan data)
        console.log('⚠️  No scan data found. Building pipeline from CRM only...');
        pipelineData = buildPipeline({ results: [] });
      }
    }

    // Phase 4: Verification
    if (DO_VERIFY || DO_SCAN) {
      const verification = runVerificationAgent(pipelineData);
      if (verification.failed > 0 && (DO_SEND || DRY_RUN)) {
        console.log('\n⚠️  Verification has failures. Review above before proceeding.');
        if (DO_SEND) {
          console.log('   Use --dry-run first to review, or fix the issues.');
          // Don't abort — let user decide
        }
      }
    }

    // Phase 5: Send/Dry Run
    if (DO_SEND || DRY_RUN) {
      await executeBatchSending(pipelineData, DRY_RUN);
    }

    // Phase 5b: Send declined emails separately
    if (DO_DECLINED) {
      await executeDeclinedSending(pipelineData);
    }

    console.log('\n✅ Done.');
  } catch (e) {
    console.error('\n❌ Fatal error:', e.message);
    console.error(e.stack);
    process.exit(1);
  }
}

main();
