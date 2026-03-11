#!/usr/bin/env node
/**
 * ingest-ranadhir-email-crm.js
 * ----------------------------
 * 1. Search banfjax@gmail.com for recent email from Ranadhir Ghosh
 * 2. Download any CSV/TXT attachment (or parse inline CSV from body)
 * 3. Parse member rows: name, email, phone, RSVP details
 * 4. Merge into banf-crm-reconciliation.json using email as key
 * 5. Print a detailed diff report
 *
 * Usage:
 *   node ingest-ranadhir-email-crm.js            # auto-find & ingest
 *   node ingest-ranadhir-email-crm.js --dry-run  # parse only, no CRM write
 *   node ingest-ranadhir-email-crm.js --dump     # dump raw email + attachment body
 */
'use strict';

const https   = require('https');
const fs      = require('fs');
const path    = require('path');

const CRM_FILE = path.join(__dirname, 'banf-crm-reconciliation.json');
const OUT_CSV  = path.join(__dirname, 'ranadhir-email-member-data.csv');

const GOOGLE_CLIENT_ID     = '1020178199135-3usrl611ara38i7rhu2ub6sn6g1150ml.apps.googleusercontent.com';
const GOOGLE_CLIENT_SECRET = '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';
const PLAYGROUND_CLIENT_ID = '407408718192.apps.googleusercontent.com';
const PLAYGROUND_SECRET    = 'kd-_2_AUosoGGTNYyMJiFL3j';
const GOOGLE_REFRESH_TOKEN = require('./banf-gmail-config').REFRESH_TOKEN;

const args      = process.argv.slice(2);
const DRY_RUN   = args.includes('--dry-run');
const DUMP_MODE = args.includes('--dump');

// ─── HTTP helper ───────────────────────────────────────────────────────────
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
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => {
        const raw = Buffer.concat(chunks);
        try { resolve({ status: res.statusCode, data: JSON.parse(raw.toString()), raw }); }
        catch { resolve({ status: res.statusCode, data: raw.toString(), raw }); }
      });
    });
    req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
    req.on('error', reject);
    if (options.body) req.write(options.body);
    req.end();
  });
}

// ─── Gmail Auth ────────────────────────────────────────────────────────────
async function getGmailToken() {
  for (const [cid, csec] of [[GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET], [PLAYGROUND_CLIENT_ID, PLAYGROUND_SECRET]]) {
    const body = `grant_type=refresh_token&refresh_token=${encodeURIComponent(GOOGLE_REFRESH_TOKEN)}&client_id=${encodeURIComponent(cid)}&client_secret=${encodeURIComponent(csec)}`;
    const resp = await httpsRequest('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Content-Length': Buffer.byteLength(body) },
      body
    });
    if (resp.data && resp.data.access_token) return resp.data.access_token;
  }
  throw new Error('Could not obtain Gmail access token');
}

// ─── Gmail search ─────────────────────────────────────────────────────────
async function gmailSearch(query, token, max = 20) {
  const url = `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(query)}&maxResults=${max}`;
  const resp = await httpsRequest(url, { headers: { Authorization: `Bearer ${token}` } });
  if (resp.data && resp.data.error) throw new Error('Gmail search: ' + resp.data.error.message);
  return (resp.data.messages || []).map(m => m.id);
}

// ─── Gmail full message ─────────────────────────────────────────────────
async function gmailGetMessage(id, token) {
  const url = `https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}?format=full`;
  const resp = await httpsRequest(url, { headers: { Authorization: `Bearer ${token}` } });
  return resp.data;
}

// ─── Gmail attachment ─────────────────────────────────────────────────────
async function gmailGetAttachment(messageId, attachmentId, token) {
  const url = `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}/attachments/${attachmentId}`;
  const resp = await httpsRequest(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!resp.data.data) throw new Error('Empty attachment data');
  // Gmail returns URL-safe base64 — convert to standard
  const b64 = resp.data.data.replace(/-/g, '+').replace(/_/g, '/');
  return Buffer.from(b64, 'base64').toString('utf8');
}

// ─── Extract all parts recursively ───────────────────────────────────────
function extractParts(payload) {
  const result = { text: '', html: '', attachments: [] };
  function walk(part) {
    if (!part) return;
    const mime = (part.mimeType || '').toLowerCase();
    const body = part.body || {};

    if (body.attachmentId) {
      // It's an attachment
      result.attachments.push({
        filename: part.filename || '',
        mimeType: mime,
        attachmentId: body.attachmentId,
        size: body.size || 0
      });
    } else if (mime === 'text/plain' && body.data) {
      const b64 = body.data.replace(/-/g, '+').replace(/_/g, '/');
      result.text += Buffer.from(b64, 'base64').toString('utf8');
    } else if (mime === 'text/html' && body.data) {
      const b64 = body.data.replace(/-/g, '+').replace(/_/g, '/');
      result.html += Buffer.from(b64, 'base64').toString('utf8');
    }
    if (part.parts) part.parts.forEach(walk);
  }
  walk(payload);
  return result;
}

// ─── CSV / TSV / pipe-delimited parser with auto-detect ────────────────────
function parseDelimitedData(raw) {
  const lines = raw.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  if (lines.length < 2) return [];

  // Detect delimiter: comma, tab, pipe, semicolon
  const sample = lines[0];
  let delim = ',';
  if ((sample.match(/\t/g) || []).length >= 2) delim = '\t';
  else if ((sample.match(/\|/g) || []).length >= 2) delim = '|';
  else if ((sample.match(/;/g) || []).length >= 2) delim = ';';

  function splitRow(line) {
    if (delim === ',') {
      // Handle quoted fields
      const cols = [];
      let cur = '', inQ = false;
      for (let i = 0; i < line.length; i++) {
        const c = line[i];
        if (c === '"' && !inQ) { inQ = true; }
        else if (c === '"' && inQ && line[i+1] === '"') { cur += '"'; i++; }
        else if (c === '"' && inQ) { inQ = false; }
        else if (c === ',' && !inQ) { cols.push(cur.trim()); cur = ''; }
        else { cur += c; }
      }
      cols.push(cur.trim());
      return cols;
    }
    return line.split(delim).map(c => c.trim().replace(/^"|"$/g, ''));
  }

  // Normalize header names
  const rawHeaders = splitRow(lines[0]).map(h =>
    h.toLowerCase()
     .replace(/[^a-z0-9]/g, '_')
     .replace(/_+/g, '_')
     .replace(/^_|_$/g, '')
  );

  console.log(`[PARSE] Delimiter: "${delim === '\t' ? 'TAB' : delim}" | Headers: ${rawHeaders.join(', ')}`);

  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = splitRow(lines[i]);
    if (cols.length < 2) continue;
    const rec = {};
    rawHeaders.forEach((h, idx) => { rec[h] = cols[idx] || ''; });
    rows.push(rec);
  }
  return rows;
}

// ─── Map raw row → CRM compatible fields ─────────────────────────────────
function mapRowToCRM(row) {
  // Flexible column name aliases
  const get = (...keys) => {
    for (const k of keys) {
      for (const rk of Object.keys(row)) {
        if (rk === k || rk.includes(k)) {
          const v = (row[rk] || '').trim();
          if (v) return v;
        }
      }
    }
    return '';
  };

  // Name resolution — try full name split, or separate first/last
  let firstName = get('first_name', 'firstname', 'first');
  let lastName  = get('last_name', 'lastname', 'last');
  let displayName = get('display_name', 'name', 'full_name', 'member_name', 'member');

  if (!firstName && displayName) {
    const parts = displayName.trim().split(/\s+/);
    firstName = parts[0] || '';
    lastName  = parts.slice(1).join(' ') || '';
  }
  if (!displayName && (firstName || lastName)) {
    displayName = [firstName, lastName].filter(Boolean).join(' ');
  }

  const email  = get('email', 'email_address', 'mail').toLowerCase();
  const phone  = get('phone', 'phone_number', 'mobile', 'cell', 'contact');
  const phone2 = get('phone2', 'alternate_phone', 'home_phone');
  const address = get('address', 'addr', 'street');
  const city   = get('city') || 'Jacksonville';
  const state  = get('state') || 'FL';
  const zip    = get('zip', 'zipcode', 'postal');

  // RSVP fields
  const rsvpRaw = get('rsvp', 'attending', 'response', 'confirmed').toLowerCase();
  const rsvp    = rsvpRaw.match(/yes|y|attending|confirmed|going/) ? 'yes'
                : rsvpRaw.match(/no|n|not|declined/)              ? 'no'
                : rsvpRaw.match(/maybe|tentative|might/)          ? 'maybe'
                : rsvpRaw || null;

  const adults  = parseInt(get('adults', 'adult_count', 'adults_attending', 'num_adults')) || 0;
  const kids    = parseInt(get('kids', 'children', 'kids_count', 'children_count', 'num_kids', 'num_children')) || 0;
  const dietary = get('dietary', 'dietary_restriction', 'food_pref', 'diet');

  const membership = get('membership', 'membership_type', 'tier', 'category', 'plan');
  const payStatus  = get('payment_status', 'paid', 'payment');
  const payAmount  = parseFloat(get('amount', 'payment_amount', 'fee').replace(/[$,]/g, '')) || 0;

  const notes = get('notes', 'comments', 'remarks', 'note');

  return {
    email, firstName, lastName, displayName,
    phone, phone2, address, city, state, zip,
    rsvp, adults, kids, dietary, membership, payStatus, payAmount, notes,
    _rawRow: row
  };
}

// ─── CRM merge logic ──────────────────────────────────────────────────────
function mergeToCRM(crm, parsedMembers, sourceLabel) {
  const stats = { new: 0, updated: 0, skipped: 0, fields: [] };
  const membersByEmail = {};
  (crm.members || []).forEach(m => { membersByEmail[m.email.toLowerCase()] = m; });

  for (const p of parsedMembers) {
    if (!p.email || !p.email.includes('@')) {
      stats.skipped++;
      continue;
    }
    const key = p.email.toLowerCase();
    const existing = membersByEmail[key];

    if (existing) {
      // Update: only overwrite if the incoming value is non-empty and different
      const changes = [];
      const tryUpdate = (field, incomingVal) => {
        if (!incomingVal) return;
        const cur = existing[field] || '';
        if (String(incomingVal) !== String(cur)) {
          changes.push({ field, from: cur, to: incomingVal });
          existing[field] = incomingVal;
        }
      };
      if (p.firstName)  tryUpdate('firstName', p.firstName);
      if (p.lastName)   tryUpdate('lastName',  p.lastName);
      if (p.displayName)tryUpdate('displayName', p.displayName);
      if (p.phone)      tryUpdate('phone', p.phone);
      if (p.phone2)     tryUpdate('phone2', p.phone2);
      if (p.address)    tryUpdate('address', p.address);
      if (p.city)       tryUpdate('city', p.city);
      if (p.state)      tryUpdate('state', p.state);
      if (p.zip)        tryUpdate('zip', p.zip);
      if (p.dietary)    tryUpdate('dietary', p.dietary);
      if (p.notes)      tryUpdate('notes', p.notes);

      // RSVP — update bosonto event data sub-object
      if (p.rsvp) {
        existing.eviteResponse = p.rsvp;
        if (p.adults) existing.eviteAdults = p.adults;
        if (p.kids)   existing.eviteKids   = p.kids;
        changes.push({ field: 'eviteResponse', from: '?', to: p.rsvp });
      }

      // Membership patch
      if (p.membership) {
        existing.membershipCategory = p.membership;
        changes.push({ field: 'membershipCategory', from: '?', to: p.membership });
      }
      if (p.payStatus) {
        existing.paymentStatus = p.payStatus.toLowerCase().includes('paid') ? 'paid' : p.payStatus;
        changes.push({ field: 'paymentStatus', from: '?', to: existing.paymentStatus });
      }
      if (p.payAmount) {
        existing.paymentAmount = p.payAmount;
        changes.push({ field: 'paymentAmount', from: '?', to: p.payAmount });
      }

      // Source tag
      existing.crmSources = existing.crmSources || [];
      if (!existing.crmSources.includes(sourceLabel)) existing.crmSources.push(sourceLabel);
      existing.lastUpdated = new Date().toISOString();

      if (changes.length) {
        stats.updated++;
        stats.fields.push({ email: key, name: p.displayName, changes });
        console.log(`  ✏️  UPDATED  ${p.displayName || key}`);
        changes.forEach(c => console.log(`         ${c.field}: "${c.from}" → "${c.to}"`));
      } else {
        stats.skipped++;
        console.log(`  ─   NO CHANGE ${p.displayName || key}`);
      }
    } else {
      // New member — create a minimal valid CRM record
      const newRec = {
        email: key,
        firstName: p.firstName, lastName: p.lastName, displayName: p.displayName,
        phone: p.phone, phone2: p.phone2, address: p.address,
        city: p.city || 'Jacksonville', state: p.state || 'FL', zip: p.zip,
        gender: '', profession: '', employer: '', education: '', dateOfBirth: '',
        householdId: null, householdType: 'individual',
        householdDisplayName: p.displayName, householdMembers: [],
        householdRole: 'primary', householdEvidence: [],
        inferredKids: p.kids || 0,
        householdMembershipCategory: p.membership || null,
        householdMembershipAmount: p.payAmount || 0,
        householdYearActive: ['2026-27'],
        eviteResponse: p.rsvp, eviteAdults: p.adults, eviteKids: p.kids,
        paymentStatus: p.payStatus || null, paymentAmount: p.payAmount || 0,
        membershipCategory: p.membership || null,
        crmSources: [sourceLabel],
        notes: p.notes || '',
        dietary: p.dietary || '',
        lastUpdated: new Date().toISOString(),
        source: 'ranadhir_email_import'
      };
      membersByEmail[key] = newRec;
      crm.members.push(newRec);
      stats.new++;
      console.log(`  ➕  NEW      ${p.displayName || key} (${key})`);
    }
  }

  crm.totalMembers = crm.members.length;
  crm.lastEnriched = new Date().toISOString();
  crm.enrichmentSources = crm.enrichmentSources || [];
  if (!crm.enrichmentSources.includes(sourceLabel)) crm.enrichmentSources.push(sourceLabel);

  return stats;
}

// ─── MAIN ─────────────────────────────────────────────────────────────────
async function main() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  📬 BANF CRM INGEST — Email from Ranadhir Ghosh');
  console.log('  Mode: ' + (DRY_RUN ? 'DRY RUN (no CRM write)' : 'LIVE'));
  console.log('═══════════════════════════════════════════════════════════════\n');

  // 1. Auth
  console.log('[1/5] Authenticating with Gmail...');
  const token = await getGmailToken();
  console.log('      ✅ Token obtained\n');

  // 2. Search for email from ranadhir
  // Cast wide net: last 14 days, from ranadhir gmail addresses, any attachment/CSV
  const searches = [
    'from:ranadhir.ghosh@gmail.com newer_than:14d',
    'from:ranadhir newer_than:14d (has:attachment OR filename:csv OR filename:txt)',
    'from:ranadhir newer_than:30d',
  ];

  console.log('[2/5] Searching Gmail for emails from Ranadhir Ghosh...');
  let allIds = [];
  for (const q of searches) {
    console.log(`      Query: "${q}"`);
    const ids = await gmailSearch(q, token, 10);
    console.log(`      → ${ids.length} email(s) found`);
    for (const id of ids) if (!allIds.includes(id)) allIds.push(id);
  }

  if (allIds.length === 0) {
    console.log('\n❌ No emails found from Ranadhir Ghosh in the last 30 days.');
    console.log('   Check that the email was sent to banfjax@gmail.com.');
    process.exit(1);
  }
  console.log(`\n      ✅ ${allIds.length} unique email(s) to examine\n`);

  // 3. Fetch each message, find the one with CSV/member data
  console.log('[3/5] Fetching message contents and attachments...');
  const candidates = [];

  for (const id of allIds) {
    const msg = await gmailGetMessage(id, token);
    const headers = (msg.payload && msg.payload.headers) || [];
    const getH = n => (headers.find(h => h.name.toLowerCase() === n) || {}).value || '';
    const subject = getH('subject');
    const from    = getH('from');
    const date    = getH('date');

    console.log(`\n  📧 [${id}]`);
    console.log(`     From:    ${from}`);
    console.log(`     Subject: ${subject}`);
    console.log(`     Date:    ${date}`);

    const parts = extractParts(msg.payload || {});
    console.log(`     Parts:   ${parts.attachments.length} attachment(s) | body text: ${parts.text.length} chars`);

    // Score this message — higher = more likely to be the member CSV email
    let score = 0;
    let csvContent = null;
    let csvSource  = null;

    // Check attachments
    for (const att of parts.attachments) {
      console.log(`     📎 Attachment: "${att.filename}" (${att.mimeType}, ${att.size} bytes)`);
      const isCSV = /\.(csv|tsv|txt|xlsx?)$/i.test(att.filename) ||
                    att.mimeType.includes('csv') || att.mimeType.includes('spreadsheet') ||
                    att.mimeType.includes('plain');
      if (isCSV) {
        score += 50;
        if (!csvContent) {
          try {
            csvContent = await gmailGetAttachment(id, att.attachmentId, token);
            csvSource  = `attachment:${att.filename}`;
            console.log(`     ✅ Downloaded attachment (${csvContent.length} chars)`);
          } catch (e) {
            console.log(`     ⚠️  Could not download attachment: ${e.message}`);
          }
        }
      }
    }

    // Check body for inline CSV/member data
    const bodyText = parts.text || parts.html.replace(/<[^>]+>/g, ' ');
    const looksLikeCSV = (bodyText.match(/,/g) || []).length > 20 ||
                         (bodyText.match(/\|/g) || []).length > 10 ||
                         (bodyText.match(/\t/g) || []).length > 10;
    const hasMemberKeywords = /email|phone|rsvp|member|name|attending/i.test(bodyText);

    if (looksLikeCSV && hasMemberKeywords) { score += 30; }
    if (/member|rsvp|roster|list|csv|spreadsheet|contact/i.test(subject)) { score += 20; }
    if (parts.attachments.length > 0) { score += 10; }

    candidates.push({ id, subject, from, date, bodyText, parts, score, csvContent, csvSource });

    if (DUMP_MODE) {
      console.log('\n  ── BODY DUMP (first 2000 chars) ──');
      console.log(bodyText.substring(0, 2000));
    }
  }

  // Sort by score descending
  candidates.sort((a, b) => b.score - a.score);
  const best = candidates[0];

  console.log(`\n\n  🏆 Best candidate: [${best.id}] "${best.subject}" (score: ${best.score})`);

  // 4. Extract CSV content
  console.log('\n[4/5] Extracting and parsing member data...');

  let rawCSV = best.csvContent;
  let sourceLabel = best.csvSource || `email_body:${best.id}`;

  if (!rawCSV) {
    // Try to extract from body — look for CSV/table block
    rawCSV = best.bodyText;
    sourceLabel = `email_body:${best.id}`;
    console.log('      Using email body text as data source');
  } else {
    console.log(`      Using attachment: ${best.csvSource}`);
  }

  // Save raw CSV for audit
  fs.writeFileSync(OUT_CSV, rawCSV, 'utf8');
  console.log(`      📄 Raw data saved to: ${OUT_CSV}`);

  // Parse
  const rows = parseDelimitedData(rawCSV);

  if (rows.length === 0) {
    // Fallback: try to parse line-by-line as a roster (name, email, phone pattern)
    console.log('      ⚠️  Standard CSV parse yielded 0 rows — trying roster line parser...');
    const rosterRows = parseRosterLines(rawCSV);
    if (rosterRows.length === 0) {
      console.error('\n❌ Could not extract structured member data from this email.');
      console.error('   Run with --dump to inspect the raw content.');
      process.exit(1);
    }
    rows.push(...rosterRows);
  }

  console.log(`      ✅ Parsed ${rows.length} member record(s)\n`);

  // Map to CRM fields
  const parsedMembers = rows.map(mapRowToCRM).filter(p => p.email);
  console.log(`      ✅ ${parsedMembers.length} record(s) with valid email addresses\n`);

  if (parsedMembers.length === 0) {
    console.error('❌ No records with valid email addresses found. Exiting.');
    process.exit(1);
  }

  // Print preview table
  console.log('  Preview of parsed records:');
  console.log('  ' + '─'.repeat(90));
  console.log(`  ${'Name'.padEnd(28)} ${'Email'.padEnd(34)} ${'Phone'.padEnd(16)} ${'RSVP'.padEnd(6)} Adults Kids`);
  console.log('  ' + '─'.repeat(90));
  for (const p of parsedMembers) {
    console.log(`  ${(p.displayName||'').padEnd(28)} ${p.email.padEnd(34)} ${(p.phone||'').padEnd(16)} ${(p.rsvp||'').padEnd(6)} ${String(p.adults||'').padEnd(6)} ${p.kids||''}`);
  }
  console.log('  ' + '─'.repeat(90) + '\n');

  if (DRY_RUN) {
    console.log('DRY RUN — no changes written to CRM.\n');
    return;
  }

  // 5. Merge into CRM
  console.log('[5/5] Merging into CRM...\n');
  const crm = JSON.parse(fs.readFileSync(CRM_FILE, 'utf8'));
  const stats = mergeToCRM(crm, parsedMembers, `ranadhir_email_${new Date().toISOString().slice(0,10)}`);

  // Save CRM
  fs.writeFileSync(CRM_FILE, JSON.stringify(crm, null, 2));

  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('  ✅ CRM INGEST COMPLETE');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`  New members added:  ${stats.new}`);
  console.log(`  Members updated:    ${stats.updated}`);
  console.log(`  No changes:         ${stats.skipped}`);
  console.log(`  Total CRM size:     ${crm.totalMembers} members`);
  console.log(`  CRM file:           ${CRM_FILE}`);
  console.log(`  Raw data saved:     ${OUT_CSV}`);
  console.log('═══════════════════════════════════════════════════════════════\n');
}

// ─── Roster line parser (fallback for non-CSV formatted lists) ─────────────
// Handles patterns like:
//   John Doe | john@example.com | 904-555-1234 | yes | 2 adults
//   1. Jane Smith <jane@example.com> — attending, 3 adults
function parseRosterLines(text) {
  const rows = [];
  const emailRegex = /[\w.+%-]+@[\w.-]+\.[a-z]{2,}/gi;
  const phoneRegex = /(\+?1[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/g;

  const lines = text.split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.length < 5) continue;

    const emails = trimmed.match(emailRegex);
    if (!emails || emails.length === 0) continue;

    const email = emails[0].toLowerCase();
    const phones = trimmed.match(phoneRegex);
    const phone  = phones ? phones[0] : '';

    // Extract name — text before email with common noise removed
    const nameRaw = trimmed
      .replace(email, '').replace(phone, '')
      .replace(/^[\d\.\)\-\s]+/, '')           // leading list numbers
      .replace(/<|>|\|/g, '')                   // brackets/pipes
      .replace(/\s{2,}/g, ' ')
      .trim();

    // Extract RSVP hints
    const rsvpMatch = trimmed.match(/\b(yes|no|maybe|attending|confirmed|declined)\b/i);
    const rsvp = rsvpMatch ? rsvpMatch[1].toLowerCase() : null;

    // Adults/kids
    const adultsM = trimmed.match(/(\d+)\s*adult/i);
    const kidsM   = trimmed.match(/(\d+)\s*(kid|child|children)/i);

    rows.push({
      email, name: nameRaw, phone,
      rsvp: rsvp === 'attending' || rsvp === 'confirmed' ? 'yes' : rsvp,
      adults: adultsM ? parseInt(adultsM[1]) : 0,
      kids:   kidsM   ? parseInt(kidsM[1])   : 0
    });
  }
  return rows;
}

main().catch(err => {
  console.error('\n❌ FATAL ERROR:', err.message);
  if (process.env.DEBUG) console.error(err.stack);
  process.exit(1);
});
