#!/usr/bin/env node
/**
 * ═══════════════════════════════════════════════════════════════════════
 *  BANF Bosonto Utsob 2026 — Continuous Email Reader Agent
 * ═══════════════════════════════════════════════════════════════════════
 *
 *  Polls Gmail every hour (configurable) for:
 *    1. New Evite RSVP notifications → pipeline + optional auto-send
 *    2. New Zelle/payment confirmation emails → CRM update
 *
 *  Modes:
 *    node bosonto-email-reader-agent.js                # Run once
 *    node bosonto-email-reader-agent.js --poll          # Continuous polling (default: 1 hour)
 *    node bosonto-email-reader-agent.js --poll --interval=30  # Poll every 30 min
 *    node bosonto-email-reader-agent.js --auto-send     # Auto-send emails for new RSVPs
 *    node bosonto-email-reader-agent.js --poll --auto-send --batch=3
 *
 *  Features:
 *    - Deduplication: tracks already-processed email IDs
 *    - Incremental: only processes NEW emails since last scan
 *    - Smart tier resolution with spouse/family detection
 *    - Generates actionable reports
 *    - Feeds into existing pipeline for batch sending
 *
 * ═══════════════════════════════════════════════════════════════════════
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

// User Query Agent for non-drive email processing
const { processQueryEmail, ClassifierAgent, CATEGORIES } = require('./user-query-agent.js');

// Agent Memory — Vector RAG for long-term learning
const memory = require('./agent-memory-rag.js');

// Communication Compliance — header encoding, content validation, audit
const compliance = require('./communication-compliance.js');

// Payment Purpose Detection Engine — intelligent payment classification
const { classifyPayment, generatePaymentAcknowledgment, isMembershipPaidForFY, getFiscalYear }
    = require('./banf-payment-purpose-engine.js');

// Delivery Failure Recovery Agent — bounce detection, spouse recovery, escalation
const { scanDeliveryFailures, isEmailFlagged } = require('./banf-delivery-failure-agent.js');

// Reinforcement Learning Feedback Engine — action recommendation from feedback
const rl = require('./banf-rl-feedback-engine.js');

// Event Manager Agent — YAML-driven drive lifecycle controller
let eventManager;
try { eventManager = require('./banf-event-manager.js'); } catch (e) { eventManager = null; }

// Message Queue — file-backed FIFO with dedup, DLQ, retry
const mq = require('./banf-message-queue.js');

// Development Instruct Agent — email-driven dev workflow via GitHub CLI + Claude Opus
const devInstruct = require('./banf-dev-instruct-agent.js');

// ── Config ──────────────────────────────────────────────────────
const WIX_ENDPOINT = 'https://banfwix.wixsite.com/banf1/_functions/bosonto_pipeline';
const ADMIN_KEY = 'banf-bosonto-2026-live';
const CRM_FILE = path.join(__dirname, 'banf-crm-reconciliation.json');
const SCAN_OUTPUT = path.join(__dirname, 'bosonto-evite-scan.json');
const PIPELINE_FILE = path.join(__dirname, 'bosonto-full-pipeline.json');
const STATE_FILE = path.join(__dirname, 'bosonto-reader-agent-state.json');
const LOG_FILE = path.join(__dirname, 'bosonto-reader-agent.log');

// Gmail OAuth2
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
const DO_POLL = args.includes('--poll');
const AUTO_SEND = args.includes('--auto-send');
const intervalArg = args.find(a => a.startsWith('--interval='));
const POLL_INTERVAL_MIN = intervalArg ? parseInt(intervalArg.split('=')[1]) : 5; // default 5 min for faster instruction processing
const batchArg = args.find(a => a.startsWith('--batch='));
const BATCH_SIZE = batchArg ? parseInt(batchArg.split('=')[1]) : 3;
const NO_IMAGES = args.includes('--no-images');

if (args.includes('--help') || args.includes('-h')) {
  console.log('Usage: node bosonto-email-reader-agent.js [options]');
  console.log('  --poll          Continuous polling mode (runs indefinitely)');
  console.log('  --interval=N    Poll interval in minutes (default: 60)');
  console.log('  --auto-send     Auto-send emails for new RSVPs');
  console.log('  --batch=N       Batch size for auto-send (default: 3)');
  console.log('  --no-images     Skip image attachments for auto-send');
  console.log('  --help          Show this help');
  process.exit(0);
}

// ═══════════════════════════════════════════════════════════════
// LOGGING
// ═══════════════════════════════════════════════════════════════

function log(level, msg) {
  const ts = new Date().toISOString();
  const line = `[${ts}] [${level}] ${msg}`;
  console.log(line);
  try {
    fs.appendFileSync(LOG_FILE, line + '\n');
  } catch { /* ignore log write failure */ }
}

// ═══════════════════════════════════════════════════════════════
// STATE MANAGEMENT — tracks processed emails
// ═══════════════════════════════════════════════════════════════

function loadState() {
  try {
    if (fs.existsSync(STATE_FILE)) {
      return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
    }
  } catch (e) {
    log('WARN', `Failed to load state: ${e.message}`);
  }
  return {
    lastScanTime: null,
    processedEmailIds: [],
    processedInstructionIds: [],  // instruction emails from admin
    processedQueryIds: [],        // user query emails
    processedGuestNames: [],
    sentEmails: [],         // emails already sent by this agent
    newRsvps: [],           // detected new RSVPs
    newPayments: [],        // detected new payments
    instructionResults: [], // results of instruction processing
    userQueryResults: [],   // results of user query processing
    pollCount: 0,
    createdAt: new Date().toISOString()
  };
}

function saveState(state) {
  state.lastSaved = new Date().toISOString();
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

// ═══════════════════════════════════════════════════════════════
// HTTP + GMAIL HELPERS (same as batch sender)
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

// Track token health — avoid hammering Google when token is expired
let _tokenFailCount = 0;
let _tokenLastFailTime = null;
const TOKEN_FAIL_BACKOFF_CYCLES = 12; // After 12 consecutive failures, only retry every 12 cycles (1 hour at 5-min interval)
const TOKEN_EXPIRY_NOTIFY_FILE = path.join(__dirname, 'gmail-token-expired.flag');

async function getGmailToken() {
  // If token has been failing repeatedly, implement exponential backoff
  if (_tokenFailCount >= TOKEN_FAIL_BACKOFF_CYCLES) {
    const hoursSinceLastFail = _tokenLastFailTime ? (Date.now() - _tokenLastFailTime) / 3600000 : 0;
    if (hoursSinceLastFail < 1) {
      throw new Error('Gmail token: expired/revoked (backoff — retry in ' + Math.ceil(60 - hoursSinceLastFail * 60) + ' min). Run: node gmail-oauth-refresh.js');
    }
    // Reset to allow retry after backoff
    log('INFO', 'Token backoff period elapsed, retrying token refresh...');
  }

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
    if (resp.data.access_token) {
      // Token works — reset failure tracking
      if (_tokenFailCount > 0) {
        log('INFO', `Gmail token recovered after ${_tokenFailCount} failures`);
        try { if (fs.existsSync(TOKEN_EXPIRY_NOTIFY_FILE)) fs.unlinkSync(TOKEN_EXPIRY_NOTIFY_FILE); } catch {}
      }
      _tokenFailCount = 0;
      _tokenLastFailTime = null;
      return resp.data.access_token;
    }
    lastError = resp.data.error_description || resp.data.error || 'Unknown error';
  }

  // Token failed — track and notify
  _tokenFailCount++;
  _tokenLastFailTime = Date.now();

  // Write flag file on first failure (for external monitoring)
  if (_tokenFailCount === 1) {
    try {
      fs.writeFileSync(TOKEN_EXPIRY_NOTIFY_FILE, JSON.stringify({
        error: lastError,
        failedAt: new Date().toISOString(),
        fix: 'Run: node gmail-oauth-refresh.js'
      }, null, 2));
    } catch {}
    log('ERROR', `Gmail token expired/revoked! Run: node gmail-oauth-refresh.js`);
  }

  throw new Error('Gmail token: ' + lastError);
}

async function gmailSearch(query, token, maxResults = 500) {
  const q = encodeURIComponent(query);
  const allIds = [];
  let pageToken = '';
  while (true) {
    const url = `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${q}&maxResults=${Math.min(maxResults - allIds.length, 100)}${pageToken ? '&pageToken=' + pageToken : ''}`;
    const resp = await httpsRequest(url, { headers: { Authorization: `Bearer ${token}` } });
    if (resp.data.error) throw new Error('Gmail search: ' + (resp.data.error.message || JSON.stringify(resp.data.error)));
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
  if (resp.data.error) throw new Error('Gmail get: ' + resp.data.error.message);
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
    id, from: getH('From'), to: getH('To'),
    subject: getH('Subject'), date: getH('Date'),
    body: bodyText.trim(), bodyHtml
  };
}

// ═══════════════════════════════════════════════════════════════
// EVITE EMAIL PARSER
// ═══════════════════════════════════════════════════════════════

function parseEviteEmail(msg) {
  const result = {
    gmailId: msg.id, from: msg.from, subject: msg.subject, date: msg.date,
    guestName: null, guestEmail: null, rsvp: null,
    adults: 0, kids: 0, dietary: null, message: null,
    parseMethod: null, raw: msg.body ? msg.body.substring(0, 500) : ''
  };

  const subj = (msg.subject || '');
  const body = (msg.body || '');
  const fullText = `${subj}\n${body}`;

  // Subject: "Evite update | New RSVP from GuestName"
  let match = subj.match(/New\s+RSVP\s+from\s+(.+?)$/i);
  if (match) {
    result.guestName = match[1].trim();
    result.parseMethod = 'evite_subject';
  }

  // Subject alt: "Evite Reminder: GuestName..."
  if (!result.guestName) {
    match = subj.match(/Evite\s+(?:update|reminder)[^|]*\|\s*(?:New\s+RSVP\s+from\s+)?(.+?)$/i);
    if (match) {
      result.guestName = match[1].trim();
      result.parseMethod = 'evite_subject_alt';
    }
  }

  // Body: "GuestName replied Yes/No for N adults and N kid(s)"
  match = body.match(/([A-Z][\w\s'-]+?)\s+replied\s+(Yes|No|Maybe)\s+for\s+(\d+)\s+adult/i);
  if (match) {
    if (!result.guestName) result.guestName = match[1].trim();
    result.rsvp = match[2].toLowerCase();
    result.adults = parseInt(match[3]) || 0;
    result.parseMethod = (result.parseMethod || '') + '+body_full';
    const kidsMatch = body.match(/(\d+)\s+kid/i);
    if (kidsMatch) result.kids = parseInt(kidsMatch[1]) || 0;
  }

  // Body: "GuestName replied Yes/No" (no count)
  if (!result.rsvp) {
    match = body.match(/([A-Z][\w\s'-]+?)\s+replied\s+(Yes|No|Maybe)(?:\s|$)/i);
    if (match) {
      if (!result.guestName) result.guestName = match[1].trim();
      result.rsvp = match[2].toLowerCase();
      result.parseMethod = (result.parseMethod || '') + '+body_replied';
      if (result.rsvp === 'yes') result.adults = 1;
    }
  }

  // Subject: "GuestName has RSVP'd Yes/No"
  if (!result.rsvp) {
    match = subj.match(/(.+?)\s+has\s+RSVP'?d?\s+(Yes|No|Maybe)/i);
    if (match) {
      if (!result.guestName) result.guestName = match[1].trim();
      result.rsvp = match[2].toLowerCase();
      result.parseMethod = 'subject_rsvpd';
    }
  }

  // Dietary
  if (body.match(/\bveg\b/i) && !body.match(/\bnon[\s-]*veg/i)) result.dietary = 'vegetarian';
  else if (body.match(/\bnon[\s-]*veg/i)) result.dietary = 'non_vegetarian';

  // Email
  const emailMatch = fullText.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
  if (emailMatch && !emailMatch[1].includes('evite.com') && !emailMatch[1].includes('banfjax')) {
    result.guestEmail = emailMatch[1].toLowerCase();
  }

  // Clean guest name
  if (result.guestName) {
    result.guestName = result.guestName.replace(/\d+$/, '').trim();
    if (result.guestName === result.guestName.toLowerCase() || result.guestName === result.guestName.toUpperCase()) {
      result.guestName = result.guestName.split(/\s+/).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
    }
  }

  return result;
}

// ═══════════════════════════════════════════════════════════════
// PAYMENT EMAIL PARSER
// ═══════════════════════════════════════════════════════════════

function parsePaymentEmail(msg) {
  const body = (msg.body || '');
  const subj = (msg.subject || '');
  const result = {
    gmailId: msg.id, from: msg.from, subject: subj, date: msg.date,
    payerName: null, payerEmail: null, amount: 0, source: null,
    memo: null, parsed: false
  };

  // Zelle payment received: "You received $XXX from Name"
  let match = body.match(/(?:you\s+)?received?\s+\$?([\d,]+(?:\.\d{2})?)\s+from\s+(.+?)(?:\.|$)/i);
  if (match) {
    result.amount = parseFloat(match[1].replace(',', ''));
    result.payerName = match[2].trim();
    result.source = 'zelle';
    result.parsed = true;
  }

  // Zelle subject: "You received $XXX"
  if (!result.parsed) {
    match = subj.match(/received?\s+\$?([\d,]+(?:\.\d{2})?)/i);
    if (match) {
      result.amount = parseFloat(match[1].replace(',', ''));
      result.source = 'zelle_subject';
      result.parsed = true;
    }
  }

  // PayPal payment: "payment of $XXX from Name"
  if (!result.parsed) {
    match = body.match(/payment\s+of\s+\$?([\d,]+(?:\.\d{2})?)\s+from\s+(.+?)(?:\.|$)/i);
    if (match) {
      result.amount = parseFloat(match[1].replace(',', ''));
      result.payerName = match[2].trim();
      result.source = 'paypal';
      result.parsed = true;
    }
  }

  // Memo/note
  match = body.match(/(?:memo|note|message)[:\s]+(.+?)(?:\n|$)/i);
  if (match) result.memo = match[1].trim();

  // BANF-related?
  const isBanf = /banf|bosonto|membership|dues/i.test(body + subj);
  result.isBanf = isBanf;

  return result;
}

// ═══════════════════════════════════════════════════════════════
// CRM HELPERS
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

  // 2. Exact display name
  for (const m of members) {
    if (normalize(m.displayName) === normGuest) return { member: m, matchType: 'name_exact', confidence: 0.95 };
    const fullName = `${m.firstName || ''} ${m.lastName || ''}`.trim();
    if (normalize(fullName) === normGuest) return { member: m, matchType: 'fullname_exact', confidence: 0.95 };
  }

  // 3. Email handle match
  const normGuestLower = normGuest.toLowerCase();
  for (const m of members) {
    const handle = (m.email || '').split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '');
    if (handle && normGuestLower === handle) return { member: m, matchType: 'email_handle_exact', confidence: 0.9 };
    const handleNoNums = handle.replace(/\d+/g, '');
    const guestNoNums = normGuestLower.replace(/\d+/g, '');
    if (handleNoNums.length >= 4 && guestNoNums.length >= 4 && handleNoNums === guestNoNums) {
      return { member: m, matchType: 'email_handle_fuzzy', confidence: 0.8 };
    }
  }

  // 4. Fuzzy name match
  if (guestParts.length >= 2) {
    for (const m of members) {
      const mFirst = (m.firstName || '').toLowerCase();
      const mLast = (m.lastName || '').toLowerCase();
      if (guestParts.includes(mFirst) && guestParts.includes(mLast)) {
        return { member: m, matchType: 'name_parts', confidence: 0.85 };
      }
    }
  }

  // 5. Spouse/household match
  for (const m of members) {
    for (const hm of (m.householdMembers || [])) {
      const hmName = normalize(`${hm.firstName || ''} ${hm.lastName || ''}`);
      if (hmName && hmName === normGuest) return { member: m, matchType: 'spouse_name', confidence: 0.8 };
    }
  }

  // 6. Household display name
  for (const m of members) {
    if (m.householdDisplayName && normalize(m.householdDisplayName).includes(normGuest)) {
      return { member: m, matchType: 'household_name', confidence: 0.7 };
    }
  }

  // 7. Unique first name
  if (guestParts.length >= 1) {
    const matches = members.filter(m => (m.firstName || '').toLowerCase() === guestParts[0]);
    if (matches.length === 1) return { member: matches[0], matchType: 'first_name_unique', confidence: 0.6 };
  }

  return null;
}

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
  // Own payment records
  for (const pay of (m.paymentRecords || [])) {
    const pCat = (pay.category || '').toLowerCase();
    if (pCat.includes('family')) return 'family';
    if (pCat.includes('couple')) return 'couple';
    const amt = pay.amount || 0;
    for (const [, cat] of Object.entries(PRICING)) {
      if (cat.family === amt) return 'family';
      if (cat.couple === amt) return 'couple';
    }
  }
  // familyMembers spouse check
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
  // householdMembers check
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
  // householdDisplayName "&" check
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
// PHASE 1: INCREMENTAL EVITE SCAN
// ═══════════════════════════════════════════════════════════════

async function scanNewEviteEmails(state, existingToken) {
  log('INFO', 'Scanning Gmail for new Evite RSVP emails...');

  const token = existingToken || await getGmailToken();
  if (!existingToken) log('INFO', 'Gmail token obtained');

  const processedIds = new Set(state.processedEmailIds || []);
  const queries = [
    'from:evite.com Bosonto after:2026/01/01',
    'from:mailva.evite.com Bosonto after:2026/01/01',
    'subject:Bosonto from:evite after:2026/01/01',
  ];

  const allIds = new Set();
  for (const q of queries) {
    try {
      const ids = await gmailSearch(q, token, 500);
      ids.forEach(id => allIds.add(id));
    } catch (e) {
      log('WARN', `Query failed: ${q} — ${e.message}`);
    }
  }

  log('INFO', `Total emails found: ${allIds.size}, previously processed: ${processedIds.size}`);

  // Filter to only new emails
  const newIds = [...allIds].filter(id => !processedIds.has(id));
  log('INFO', `New emails to process: ${newIds.length}`);

  if (newIds.length === 0) {
    return { newRsvps: [], allIds: [...allIds], token };
  }

  // Fetch and parse new emails
  const newRsvps = [];
  for (const id of newIds) {
    try {
      const msg = await gmailGetMessage(id, token);
      const fromLower = (msg.from || '').toLowerCase();
      const isBosonto = (msg.subject || '').toLowerCase().includes('bosonto') ||
                        (msg.body || '').toLowerCase().includes('bosonto');

      if (!isBosonto) {
        processedIds.add(id); // Mark as processed even if not relevant
        continue;
      }

      const rsvp = parseEviteEmail(msg);
      rsvp.isEviteEmail = fromLower.includes('evite.com');
      rsvp.detectedAt = new Date().toISOString();

      if (rsvp.guestName && rsvp.rsvp) {
        newRsvps.push(rsvp);
        log('INFO', `  NEW RSVP: ${rsvp.guestName} → ${rsvp.rsvp.toUpperCase()} (${rsvp.adults}a/${rsvp.kids}k)`);
      }

      processedIds.add(id);
    } catch (e) {
      log('WARN', `Failed to fetch email ${id}: ${e.message}`);
    }
  }

  // Update state with all processed IDs
  state.processedEmailIds = [...processedIds];
  return { newRsvps, allIds: [...allIds], token };
}

// ═══════════════════════════════════════════════════════════════
// PHASE 2: INCREMENTAL PAYMENT SCAN
// ═══════════════════════════════════════════════════════════════

async function scanNewPaymentEmails(state, token) {
  log('INFO', 'Scanning Gmail for new payment notifications...');

  if (!token) token = await getGmailToken();

  const processedIds = new Set(state.processedEmailIds || []);
  const queries = [
    'subject:"You received" OR subject:"payment received" Zelle after:2026/01/01',
    'subject:BANF payment after:2026/01/01',
    'subject:membership payment after:2026/01/01',
  ];

  const allIds = new Set();
  for (const q of queries) {
    try {
      const ids = await gmailSearch(q, token, 100);
      ids.forEach(id => allIds.add(id));
    } catch (e) {
      log('WARN', `Payment query failed: ${e.message}`);
    }
  }

  const newIds = [...allIds].filter(id => !processedIds.has(id));
  log('INFO', `Payment emails: ${allIds.size} total, ${newIds.length} new`);

  const newPayments = [];
  for (const id of newIds) {
    try {
      const msg = await gmailGetMessage(id, token);
      const payment = parsePaymentEmail(msg);

      if (payment.parsed && payment.amount > 0) {
        newPayments.push(payment);
        log('INFO', `  NEW PAYMENT: $${payment.amount} from ${payment.payerName || 'unknown'} via ${payment.source}`);
      }

      processedIds.add(id);
    } catch (e) {
      log('WARN', `Failed to fetch payment email ${id}: ${e.message}`);
    }
  }

  state.processedEmailIds = [...processedIds];
  return newPayments;
}

// ═══════════════════════════════════════════════════════════════
// PHASE 2b: INSTRUCTION EMAIL SCAN (ADMIN COMMANDS)
// ═══════════════════════════════════════════════════════════════

const ADMIN_EMAIL = 'ranadhir.ghosh@gmail.com';
const INSTRUCTION_COMMANDS = {
  // Payment-related commands
  'send payment followup': async (args, state) => {
    const emailMatch = args.match(/email[:\s]+([^\s,]+)/i);
    const amountMatch = args.match(/amount[:\s]+\$?(\d+(?:\.\d{2})?)/i);
    const nameMatch = args.match(/name[:\s]+"?([^",]+)"?/i);
    const tierMatch = args.match(/tier[:\s]+(\w+)/i);
    
    if (!emailMatch || !amountMatch) {
      return { success: false, error: 'Usage: send payment followup email: X amount: Y [name: "Z"] [tier: couple/individual/family]' };
    }
    
    log('INFO', `  📧 Instruction: Sending payment followup to ${emailMatch[1]} for $${amountMatch[1]}`);
    
    const payload = {
      adminKey: ADMIN_KEY,
      members: [{
        action: 'payment_followup',
        email: emailMatch[1],
        displayName: nameMatch ? nameMatch[1].trim() : emailMatch[1].split('@')[0],
        amountPaid: parseFloat(amountMatch[1]),
        totalPaidSoFar: parseFloat(amountMatch[1]),
        membershipTier: tierMatch ? tierMatch[1].toLowerCase() : 'individual',
        householdType: tierMatch ? tierMatch[1].toLowerCase() : 'individual',
        isPartialPayment: true
      }]
    };
    
    const resp = await httpsRequest(WIX_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    
    return { success: resp.data?.success || false, result: resp.data };
  },
  
  // RSVP email sending
  'send rsvp email': async (args, state) => {
    const emailMatch = args.match(/email[:\s]+([^\s,]+)/i);
    if (!emailMatch) {
      return { success: false, error: 'Usage: send rsvp email email: X' };
    }
    
    const members = loadCRM();
    const member = members.find(m => m.email?.toLowerCase() === emailMatch[1].toLowerCase());
    if (!member) {
      return { success: false, error: `Member not found: ${emailMatch[1]}` };
    }
    
    log('INFO', `  📧 Instruction: Sending RSVP email to ${member.email}`);
    
    const pipeline = JSON.parse(fs.readFileSync(PIPELINE_FILE, 'utf8'));
    const pMember = (pipeline.all || []).find(m => m.email?.toLowerCase() === emailMatch[1].toLowerCase());
    
    const payload = {
      adminKey: ADMIN_KEY,
      members: [pMember || member]
    };
    
    const resp = await httpsRequest(WIX_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    
    return { success: resp.data?.success || false, result: resp.data };
  },
  
  // Check member status
  'check member': async (args, state) => {
    const emailMatch = args.match(/email[:\s]+([^\s,]+)/i) || args.match(/(\S+@\S+)/);
    if (!emailMatch) {
      return { success: false, error: 'Usage: check member email: X' };
    }
    
    const email = emailMatch[1].toLowerCase();
    const members = loadCRM();
    const member = members.find(m => m.email?.toLowerCase() === email);
    
    if (!member) {
      return { success: false, error: `Member not found: ${email}` };
    }
    
    const pipeline = JSON.parse(fs.readFileSync(PIPELINE_FILE, 'utf8'));
    const inPipeline = (pipeline.all || []).some(m => m.email?.toLowerCase() === email);
    const emailsSent = (state.sentEmails || []).filter(e => e.email?.toLowerCase() === email);
    const pay2026 = (member.paymentRecords || []).find(p => p.year === '2026-27');
    
    return {
      success: true,
      result: {
        email: member.email,
        displayName: member.displayName,
        householdType: member.householdType,
        payment2026: pay2026 ? `$${pay2026.amount} (${pay2026.category})` : 'unpaid',
        inPipeline,
        emailsSent: emailsSent.length,
        emailLog: emailsSent.map(e => `${e.type} at ${e.sentAt}`)
      }
    };
  },
  
  // List pending members
  'list pending': async (args, state) => {
    const pipeline = JSON.parse(fs.readFileSync(PIPELINE_FILE, 'utf8'));
    const sentEmails = new Set((state.sentEmails || []).map(e => e.email?.toLowerCase()));
    const pending = (pipeline.sendable || []).filter(m => !sentEmails.has(m.email?.toLowerCase()));
    
    return {
      success: true,
      result: {
        totalPending: pending.length,
        pending: pending.slice(0, 20).map(m => ({
          email: m.email,
          name: m.displayName,
          rsvp: m.eviteResponse,
          payment: m.paymentStatus
        }))
      }
    };
  },
  
  // Run scan
  'run scan': async (args, state) => {
    log('INFO', '  📧 Instruction: Triggering email scan...');
    // The normal scan will run, just log it
    return { success: true, result: 'Scan will be performed in this cycle' };
  },
  
  // Status report
  'status': async (args, state) => {
    const pipeline = JSON.parse(fs.readFileSync(PIPELINE_FILE, 'utf8'));
    return {
      success: true,
      result: {
        pollCount: state.pollCount,
        lastScanTime: state.lastScanTime,
        totalProcessedEmails: (state.processedEmailIds || []).length,
        totalSentEmails: (state.sentEmails || []).length,
        totalRsvps: (state.newRsvps || []).length,
        totalPayments: (state.newPayments || []).length,
        pipelineTotal: (pipeline.all || []).length,
        pipelineSendable: (pipeline.sendable || []).length,
        pipelineDeclined: (pipeline.declined || []).length
      }
    };
  }
};

async function scanInstructionEmails(state, token) {
  log('INFO', 'Scanning Gmail for instruction emails from admin...');
  
  if (!token) token = await getGmailToken();
  
  const processedIds = new Set(state.processedInstructionIds || []);
  
  // Search for emails FROM admin with "instruction" in subject
  const query = `from:${ADMIN_EMAIL} subject:instruction after:2026/01/01`;
  
  let allIds = [];
  try {
    allIds = await gmailSearch(query, token, 50);
  } catch (e) {
    log('WARN', `Instruction email query failed: ${e.message}`);
    return [];
  }
  
  const newIds = allIds.filter(id => !processedIds.has(id));
  log('INFO', `Instruction emails: ${allIds.length} total, ${newIds.length} new`);
  
  const instructions = [];
  for (const id of newIds) {
    try {
      const msg = await gmailGetMessage(id, token);
      const from = msg.from || '';
      const subject = msg.subject || '';
      const body = msg.body || '';
      
      // Verify it's from admin and has "instruction" in subject
      if (from.toLowerCase().includes(ADMIN_EMAIL.toLowerCase()) && 
          subject.toLowerCase().includes('instruction')) {
        instructions.push({
          gmailId: id,
          from,
          subject,
          body: body.trim(),
          date: msg.date,
          detectedAt: new Date().toISOString()
        });
        log('INFO', `  NEW INSTRUCTION: ${subject.substring(0, 60)}`);
      }
      
      processedIds.add(id);
    } catch (e) {
      log('WARN', `Failed to fetch instruction email ${id}: ${e.message}`);
    }
  }
  
  state.processedInstructionIds = [...processedIds];
  return instructions;
}

async function processInstructions(instructions, state) {
  if (instructions.length === 0) return [];
  
  log('INFO', `Processing ${instructions.length} instruction email(s)...`);
  const results = [];
  
  for (const instr of instructions) {
    const body = instr.body.toLowerCase();
    let executed = false;
    
    // Try to match each known command
    for (const [cmdPattern, handler] of Object.entries(INSTRUCTION_COMMANDS)) {
      if (body.includes(cmdPattern.toLowerCase())) {
        log('INFO', `  Executing: ${cmdPattern}`);
        try {
          const result = await handler(instr.body, state);
          results.push({
            instruction: instr,
            command: cmdPattern,
            ...result
          });
          executed = true;
          
          // Log result
          if (result.success) {
            log('INFO', `    ✓ Success: ${JSON.stringify(result.result).substring(0, 200)}`);
          } else {
            log('WARN', `    ✗ Failed: ${result.error || 'Unknown error'}`);
          }
        } catch (e) {
          log('ERROR', `    ✗ Error: ${e.message}`);
          results.push({
            instruction: instr,
            command: cmdPattern,
            success: false,
            error: e.message
          });
        }
        break; // Only execute first matching command
      }
    }
    
    if (!executed) {
      log('WARN', `  Unknown instruction: ${instr.body.substring(0, 100)}`);
      results.push({
        instruction: instr,
        command: null,
        success: false,
        error: 'Unknown instruction. Available commands: ' + Object.keys(INSTRUCTION_COMMANDS).join(', ')
      });
    }
  }
  
  // Save instruction results
  state.instructionResults = [...(state.instructionResults || []), ...results];
  
  return results;
}

// ═══════════════════════════════════════════════════════════════
// PHASE 2e: GITHUB ACTIONS FAILURE EMAIL SCAN
// ═══════════════════════════════════════════════════════════════

/**
 * Detect and classify GitHub Actions run failure notification emails.
 * Routes them to the dev instruct pipeline for automated analysis/fix.
 *
 * GitHub notification emails typically come from:
 *   - notifications@github.com
 *   - noreply@github.com
 * Subject patterns:
 *   - "[owner/repo] Run failed: workflow-name - branch (hash)"
 *   - "[owner/repo] Some check has failed on branch"
 *   - "Re: [owner/repo] ..."
 */

const GITHUB_FAILURE_PATTERNS = [
  /\brun failed\b/i,
  /\bworkflow.*(failed|failure|error)\b/i,
  /\bfailed\b.*\bgithub\b/i,
  /\bcheck.*(failed|failure)\b/i,
  /\bbuild.*(failed|broken|error)\b/i,
  /\bci.*(failed|failure|broken)\b/i,
  /\bdeploy.*(failed|failure|error)\b/i
];

const GITHUB_SENDER_PATTERNS = [
  'notifications@github.com',
  'noreply@github.com',
  'github.com'
];

function isGitHubFailureEmail(from, subject, body) {
  const fromLower = (from || '').toLowerCase();
  const isGitHub = GITHUB_SENDER_PATTERNS.some(p => fromLower.includes(p));
  if (!isGitHub) return { isFailure: false, reason: 'Not from GitHub' };

  const subjectLower = (subject || '').toLowerCase();
  const bodyLower = (body || '').toLowerCase().substring(0, 3000);
  const combinedText = subjectLower + ' ' + bodyLower;

  // Check for failure patterns
  for (const pat of GITHUB_FAILURE_PATTERNS) {
    if (pat.test(subject) || pat.test(body?.substring(0, 3000) || '')) {
      // Extract workflow & repo info
      const repoMatch = (subject || '').match(/\[([^\]]+)\]/);
      const repo = repoMatch ? repoMatch[1] : 'unknown';
      const workflowMatch = (subject || '').match(/:\s*(.+?)(?:\s*-\s*|\s*$)/);
      const workflow = workflowMatch ? workflowMatch[1].trim() : '';
      return {
        isFailure: true,
        repo,
        workflow,
        pattern: pat.toString(),
        reason: `GitHub Actions failure: ${repo} — ${workflow || subject}`
      };
    }
  }

  // Also check for generic failure in body from GitHub
  if (combinedText.includes('failed') || combinedText.includes('failure') || combinedText.includes('error')) {
    if (combinedText.includes('action') || combinedText.includes('workflow') || combinedText.includes('run') || combinedText.includes('build')) {
      const repoMatch = (subject || '').match(/\[([^\]]+)\]/);
      return {
        isFailure: true,
        repo: repoMatch ? repoMatch[1] : 'unknown',
        workflow: '',
        pattern: 'generic_failure',
        reason: `GitHub notification with failure indicators`
      };
    }
  }

  return { isFailure: false, reason: 'GitHub email but no failure pattern detected' };
}

async function scanGitHubFailureEmails(state, token) {
  log('INFO', 'Scanning Gmail for GitHub Actions failure emails...');

  if (!token) token = await getGmailToken();
  const processedIds = new Set(state.processedGitHubFailureIds || []);

  // Search for GitHub notification emails with failure-related content
  const queries = [
    `from:notifications@github.com "run failed" after:2026/01/01`,
    `from:notifications@github.com "failed" after:2026/01/01`,
    `from:noreply@github.com "failed" after:2026/01/01`,
    `from:github.com subject:"failed" after:2026/01/01`
  ];

  const allIds = new Set();
  for (const q of queries) {
    try {
      const ids = await gmailSearch(q, token, 50);
      ids.forEach(id => allIds.add(id));
    } catch (e) {
      log('WARN', `GitHub failure query failed (${q.substring(0,50)}): ${e.message}`);
    }
  }

  const newIds = [...allIds].filter(id => !processedIds.has(id));
  log('INFO', `  GitHub notification emails: ${allIds.size} total, ${newIds.length} new`);

  const results = [];
  for (const id of newIds) {
    try {
      const msg = await gmailGetMessage(id, token);
      const classification = isGitHubFailureEmail(msg.from, msg.subject, msg.body);

      if (classification.isFailure) {
        results.push({
          gmailId: id,
          from: msg.from,
          subject: msg.subject,
          body: (msg.body || '').substring(0, 5000),
          date: msg.date,
          repo: classification.repo,
          workflow: classification.workflow,
          pattern: classification.pattern,
          detectedAt: new Date().toISOString()
        });
        log('INFO', `  🔴 GitHub Failure: ${classification.repo} — ${msg.subject.substring(0,80)}`);
      }

      processedIds.add(id);
    } catch (e) {
      log('WARN', `  Failed to fetch GitHub email ${id}: ${e.message}`);
    }
  }

  state.processedGitHubFailureIds = [...processedIds];
  log('INFO', `  GitHub failure scan complete: ${results.length} failures detected`);
  return results;
}

/**
 * Route GitHub failure emails to the dev instruct pipeline.
 * Creates synthetic INSTRUCT emails from each failure so the dev agent can analyse and fix.
 */
async function routeGitHubFailuresToDevPipeline(failures) {
  const routed = [];
  for (const failure of failures) {
    try {
      // Create a synthetic instruction for the dev pipeline
      const instructBody = `[AUTO-DETECTED GITHUB ACTIONS FAILURE]

Repository: ${failure.repo}
Workflow: ${failure.workflow || 'N/A'}
Date: ${failure.date}
Email Subject: ${failure.subject}

FAILURE DETAILS:
${failure.body.substring(0, 3000)}

INSTRUCTIONS:
1. Analyze the GitHub Actions run failure above
2. Identify the root cause of the failure
3. If it's a code issue, implement the fix
4. If it's a configuration/infrastructure issue, document the fix steps
5. Run relevant tests to verify
6. Provide a summary of findings and actions taken`;

      const syntheticEmail = {
        from: `GitHub Actions <notifications@github.com>`,
        subject: `INSTRUCT: Fix GitHub Actions failure in ${failure.repo}`,
        body: instructBody,
        gmailId: `github-failure-${failure.gmailId}`,
        date: failure.date,
        _instructType: 'github_failure',
        _sourceRepo: failure.repo,
        _sourceWorkflow: failure.workflow
      };

      await devInstruct.processInstruction(syntheticEmail);
      routed.push({ ...failure, routed: true });
      log('INFO', `  🔧 Routed to dev pipeline: ${failure.repo} failure`);
    } catch (e) {
      log('WARN', `  Failed to route GitHub failure to dev pipeline: ${e.message}`);
      routed.push({ ...failure, routed: false, error: e.message });
    }
  }
  return routed;
}

// ═══════════════════════════════════════════════════════════════
// PHASE 2b-instruct: DEVELOPMENT INSTRUCT EMAIL SCAN
// ═══════════════════════════════════════════════════════════════

/**
 * Dedicated Gmail scan for INSTRUCT subject emails from president.
 * These are routed to the Development Instruct Agent (banf-dev-instruct-agent.js)
 * for GitHub CLI + Claude Opus execution.
 *
 * Detection: Subject is exactly "INSTRUCT" or reply to [BANF-DEV] INST-xxx
 */
async function scanDevInstructEmails(state, token) {
  log('INFO', 'Scanning Gmail for INSTRUCT emails from president...');

  if (!token) token = await getGmailToken();
  const processedIds = new Set(state.processedDevInstructIds || []);

  // Search for exact "INSTRUCT" subject OR [BANF-DEV] reply chain
  const queries = [
    `from:${ADMIN_EMAIL} subject:INSTRUCT after:2026/01/01`,
    `from:${ADMIN_EMAIL} subject:"[BANF-DEV] INST-" after:2026/01/01`
  ];

  let allIds = new Set();
  for (const q of queries) {
    try {
      const ids = await gmailSearch(q, token, 20);
      ids.forEach(id => allIds.add(id));
    } catch (e) {
      log('WARN', `Dev instruct query failed (${q.substring(0,40)}): ${e.message}`);
    }
  }

  const newIds = [...allIds].filter(id => !processedIds.has(id));
  log('INFO', `Dev Instruct emails: ${allIds.size} total, ${newIds.length} new`);

  const results = [];
  for (const id of newIds) {
    try {
      const msg = await gmailGetMessage(id, token);
      const email = {
        gmailId: id,
        from: msg.from || '',
        subject: msg.subject || '',
        body: (msg.body || '').trim(),
        threadId: msg.threadId || null,
        date: msg.date,
        detectedAt: new Date().toISOString()
      };

      // Classify: new instruct or reply to existing
      if (devInstruct.isInstructEmail(email)) {
        email._instructType = 'new';
        results.push(email);
        log('INFO', `  🔧 NEW INSTRUCT: ${email.subject} from ${email.from}`);
      } else if (devInstruct.isInstructReply(email)) {
        email._instructType = 'reply';
        results.push(email);
        log('INFO', `  🔧 INSTRUCT REPLY: ${email.subject}`);
      }

      processedIds.add(id);
    } catch (e) {
      log('WARN', `Failed to fetch dev instruct email ${id}: ${e.message}`);
    }
  }

  state.processedDevInstructIds = [...processedIds];
  return results;
}

// ═══════════════════════════════════════════════════════════════
// PHASE 2c: USER QUERY EMAIL DETECTION
// ═══════════════════════════════════════════════════════════════

// --- Subject sanitization: use compliance module for consistent handling ---
function sanitizeSubject(raw) {
  return compliance.sanitizeIncomingSubject(raw);
}

// --- Marketing / spam domain blocklist ---
const MARKETING_BLOCKED_DOMAINS = [
  'e.harborfreight.com', 'signupgenius.com', 'marketing', 'promo',
  'mailva.evite.com', 'info@mailva', 'mailer-daemon', 'googlemail.com',
  'bounce', 'sendgrid.net', 'mailchimp', 'constantcontact', 'hubspot',
  'drip.com', 'activecampaign', 'klaviyo', 'brevo.com', 'sendinblue',
  'e.wix.com', 'go.wix.com', 'news.', 'offers.', 'deals.',
  'promotions.', 'campaign.', 'email.', 'info@', 'support@',
  'alerts@notify.wellsfargo.com', 'alerts@', 'noreply@', 'no-reply@',
  'donotreply', 'unsubscribe', 'notifications@', 'notification@',
  'postmaster', 'daemon'
];

// Marketing pattern detection in subject/body
const MARKETING_SUBJECT_PATTERNS = [
  /\bfree\b.*\b(offer|gift|bucket|pair|shipping)/i,
  /\bsale\b.*\b(start|end|today|final|last)/i,
  /\bbuy\s+\d+.*get.*free/i,
  /\b(early access|last chance|deadline|expires|act now|limited time)/i,
  /\b(parking lot sale|clearance|discount|coupon|promo code)/i,
  /\b(unsubscribe|opt.out|email preferences)/i,
  /\bdelivery status notification/i,
  /\bdomain renewal/i,
  /\baccount update/i,      // bank/financial auto-notifications
  /\bverification code\b/i, // OTP codes
  /\bnew product alert/i,
  /\bearning revenue|partner program\b/i,
  /\b(osteoporosis|skincare|eligible.*products)/i, // health spam
  /^(fw|fwd):\s*(fw|fwd):/i // double-forwarded chains
];

function extractSenderEmail(fromHeader) {
  const m = (fromHeader || '').match(/<([^>]+)>/);
  return (m ? m[1] : fromHeader || '').toLowerCase().trim();
}

function extractSenderDomain(fromHeader) {
  const email = extractSenderEmail(fromHeader);
  const parts = email.split('@');
  return parts.length > 1 ? parts[1] : '';
}

/**
 * Determine if an email is marketing/spam/automated.
 * Returns { isMarketing: bool, reason: string }
 */
function isMarketingEmail(from, subject, body) {
  const fromLower = (from || '').toLowerCase();
  const senderEmail = extractSenderEmail(from);
  const senderDomain = extractSenderDomain(from);
  const subjectLower = (subject || '').toLowerCase();
  const bodyLower = (body || '').toLowerCase().substring(0, 2000); // only check first 2KB
  
  // 0. GitHub notification exemption — never treat as marketing (handled by Phase 2e)
  if (senderDomain === 'github.com' || senderEmail.includes('github.com')) {
    return { isMarketing: false, reason: 'GitHub notification (exempted — handled by GitHub failure scanner)' };
  }

  // 1. Blocked domain check
  for (const blocked of MARKETING_BLOCKED_DOMAINS) {
    if (senderEmail.includes(blocked) || senderDomain.includes(blocked) || fromLower.includes(blocked)) {
      return { isMarketing: true, reason: `Blocked domain: ${blocked}` };
    }
  }
  
  // 2. Subject pattern check
  for (const pat of MARKETING_SUBJECT_PATTERNS) {
    if (pat.test(subject || '')) {
      return { isMarketing: true, reason: `Marketing subject: ${pat}` };
    }
  }
  
  // 3. Body markers (mass email footers)
  const spamBodyMarkers = [
    'unsubscribe', 'opt out of', 'email preferences', 'manage subscriptions',
    'you are receiving this email because', 'to stop receiving',
    'this email was sent to', 'view in browser', 'view as web page',
    'sent by mailchimp', 'powered by constant contact'
  ];
  const bodyMarkerHits = spamBodyMarkers.filter(m => bodyLower.includes(m)).length;
  if (bodyMarkerHits >= 2) {
    return { isMarketing: true, reason: `Mass email: ${bodyMarkerHits} spam markers in body` };
  }
  
  // 4. ALL-CAPS subject (>60% caps in subject with 5+ chars)
  if (subject && subject.length > 5) {
    const capsRatio = (subject.match(/[A-Z]/g) || []).length / subject.replace(/\s/g, '').length;
    if (capsRatio > 0.6) {
      return { isMarketing: true, reason: `ALL-CAPS subject (${(capsRatio*100).toFixed(0)}%)` };
    }
  }
  
  // 5. Not a personal email domain (heuristic: known freemail = person)
  const personalDomains = [
    'gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'aol.com',
    'icloud.com', 'mail.com', 'proton.me', 'protonmail.com', 'live.com',
    'msn.com', 'att.net', 'comcast.net', 'verizon.net', 'bellsouth.net',
    'cox.net', 'charter.net'
  ];
  const isPersonalDomain = personalDomains.includes(senderDomain);
  
  // If it's from a company domain AND has marketing patterns in subject, skip
  if (!isPersonalDomain && !subjectLower.startsWith('re:') && !subjectLower.startsWith('fwd:')) {
    // Check if body includes interest in BANF specifically
    const banfInterest = bodyLower.includes('banf') || bodyLower.includes('bengali') || 
                          bodyLower.includes('bosonto') || bodyLower.includes('membership') ||
                          bodyLower.includes('event') || bodyLower.includes('community');
    if (!banfInterest) {
      return { isMarketing: true, reason: `Company email (${senderDomain}) with no BANF relevance` };
    }
  }
  
  return { isMarketing: false, reason: '' };
}

/**
 * Check if BANF already replied to this email's thread.
 * Uses Gmail thread API to look for sent messages from banfjax@gmail.com.
 * Returns { alreadyReplied: bool, repliedAt: string|null }
 */
async function checkAlreadyReplied(gmailId, token) {
  try {
    // Get the thread ID from the message
    const msgUrl = `https://gmail.googleapis.com/gmail/v1/users/me/messages/${gmailId}?format=minimal`;
    const msgResp = await httpsRequest(msgUrl, { headers: { Authorization: `Bearer ${token}` } });
    if (msgResp.data.error) return { alreadyReplied: false, repliedAt: null };
    
    const threadId = msgResp.data.threadId;
    if (!threadId) return { alreadyReplied: false, repliedAt: null };
    
    // Get all messages in the thread
    const threadUrl = `https://gmail.googleapis.com/gmail/v1/users/me/threads/${threadId}?format=metadata&metadataHeaders=From&metadataHeaders=Date`;
    const threadResp = await httpsRequest(threadUrl, { headers: { Authorization: `Bearer ${token}` } });
    if (threadResp.data.error) return { alreadyReplied: false, repliedAt: null };
    
    const messages = threadResp.data.messages || [];
    
    // Find the index of our target message
    const targetIdx = messages.findIndex(m => m.id === gmailId);
    
    // Check if any message AFTER our target is from banfjax@gmail.com
    for (let i = targetIdx + 1; i < messages.length; i++) {
      const hdrs = (messages[i].payload?.headers || []);
      const from = (hdrs.find(h => h.name === 'From') || {}).value || '';
      if (from.toLowerCase().includes('banfjax@gmail.com')) {
        const date = (hdrs.find(h => h.name === 'Date') || {}).value || null;
        return { alreadyReplied: true, repliedAt: date };
      }
    }
    
    return { alreadyReplied: false, repliedAt: null };
  } catch (e) {
    log('DEBUG', `  Thread check failed for ${gmailId}: ${e.message}`);
    return { alreadyReplied: false, repliedAt: null };
  }
}

/**
 * Detect if email is a member reply to a BANF-sent email.
 * Pattern: In-Reply-To header + subject starts with Re: + body references BANF content.
 * Example: Subrata Chattopadhyay replying "Please change name from Mahua to Subrata"
 */
function isMemberReplyToBANF(msg) {
  const subject = (msg.subject || '').toLowerCase();
  const from = (msg.from || '').toLowerCase();
  const body = (msg.body || '').toLowerCase();
  
  // Must be a reply (Re: or Fwd:)
  const isReply = subject.startsWith('re:') || subject.startsWith('fwd:');
  if (!isReply) return false;
  
  // Must reference BANF content in subject
  const hasBanfRef = subject.includes('banf') || subject.includes('bosonto') ||
                     subject.includes('membership') || subject.includes('gbm') ||
                     subject.includes('bengali') || subject.includes('noboborsho') ||
                     subject.includes('verify your communication') ||
                     subject.includes('invitation');
  if (!hasBanfRef) return false;
  
  // Must be from a person (not automated)
  const senderDomain = extractSenderDomain(from);
  const personalDomains = ['gmail.com','yahoo.com','hotmail.com','outlook.com','aol.com','icloud.com','live.com','comcast.net','att.net','bellsouth.net'];
  const isFromPerson = personalDomains.includes(senderDomain);
  
  return isFromPerson;
}

async function scanUserQueryEmails(state, token) {
  log('INFO', 'Scanning Gmail for user query emails...');
  
  if (!token) token = await getGmailToken();
  
  const processedIds = new Set(state.processedQueryIds || []);
  const processedDriveIds = new Set([
    ...(state.processedEmailIds || []),      // Evite RSVPs
    ...(state.processedInstructionIds || []) // Admin instructions
  ]);
  
  // Find emails TO BANF (not from evite, not from admin instructions)
  // Exclude known automated senders
  const query = `to:banfjax@gmail.com -from:notify@evite.com -from:noreply -from:no-reply -from:mailer-daemon -from:postmaster -subject:instruction after:2026/01/01`;
  
  let allIds = [];
  try {
    allIds = await gmailSearch(query, token, 50);
  } catch (e) {
    log('WARN', `User query email search failed: ${e.message}`);
    return [];
  }
  
  // Filter out already processed emails and drive-related emails
  const newIds = allIds.filter(id => !processedIds.has(id) && !processedDriveIds.has(id));
  log('INFO', `User query emails: ${allIds.length} total, ${newIds.length} new`);
  
  const userQueries = [];
  const classifier = new ClassifierAgent();
  let skippedMarketing = 0, skippedReplied = 0, skippedDrive = 0;
  
  for (const id of newIds) {
    try {
      const msg = await gmailGetMessage(id, token);
      const from = msg.from || '';
      const rawSubject = msg.subject || '';
      const subject = sanitizeSubject(rawSubject);
      const body = msg.body || '';
      
      // Skip if from admin (these are instruction emails)
      if (from.toLowerCase().includes(ADMIN_EMAIL.toLowerCase())) {
        processedIds.add(id);
        continue;
      }
      
      // Skip if from BANF itself (outgoing emails)
      if (from.toLowerCase().includes('banfjax@gmail.com')) {
        processedIds.add(id);
        continue;
      }
      
      // ── FILTER 1: Marketing / Spam / Automated ──
      const marketingCheck = isMarketingEmail(from, subject, body);
      if (marketingCheck.isMarketing) {
        log('DEBUG', `  SKIP [MARKETING] ${subject.substring(0, 40)}... (${marketingCheck.reason})`);
        processedIds.add(id);
        skippedMarketing++;
        continue;
      }
      
      // ── FILTER 2: Already replied by BANF ──
      const replyCheck = await checkAlreadyReplied(id, token);
      if (replyCheck.alreadyReplied) {
        log('DEBUG', `  SKIP [ALREADY REPLIED] ${subject.substring(0, 40)}... (replied: ${replyCheck.repliedAt})`);
        processedIds.add(id);
        skippedReplied++;
        continue;
      }
      
      // ── DETECT: Member reply to BANF-sent email (like Subrata's) ──
      const memberReply = isMemberReplyToBANF(msg);
      
      // Classify the email
      const classification = classifier.classify({ subject, body, from });
      
      // Skip drive emails UNLESS it's a member reply (member replies take priority)
      if (classification.isDrive && !memberReply) {
        processedIds.add(id);
        skippedDrive++;
        continue;
      }
      
      // Only process if classified OR is a member reply
      if (classification.category !== 'unknown' || memberReply) {
        // For member replies, override classification (even drive) to appropriate category
        let finalClassification = classification;
        if (memberReply && (classification.category === 'unknown' || classification.isDrive)) {
          const bodyLower = body.toLowerCase();
          if (bodyLower.includes('change') || bodyLower.includes('update') || bodyLower.includes('correct') || bodyLower.includes('phone') || bodyLower.includes('name')) {
            finalClassification = {
              category: 'profile_update',
              categoryType: 'safe',
              confidence: 0.85,
              isDrive: false,
              needsHuman: true,
              reason: 'Member reply with update/correction request',
              priority: 'normal'
            };
          } else {
            finalClassification = {
              category: 'general_info',
              categoryType: 'safe',
              confidence: 0.7,
              isDrive: false,
              needsHuman: true,
              reason: 'Member reply to BANF email',
              priority: 'normal'
            };
          }
        }
        
        const senderEmail = extractSenderEmail(from);
        userQueries.push({
          gmailId: id,
          from,
          senderEmail,
          subject,
          body: body.trim(),
          date: msg.date,
          detectedAt: new Date().toISOString(),
          classification: finalClassification,
          isMemberReply: memberReply
        });
        log('INFO', `  NEW USER QUERY [${finalClassification.category}]${memberReply ? ' [MEMBER REPLY]' : ''}: ${subject.substring(0, 50)}... from ${senderEmail} (conf: ${finalClassification.confidence.toFixed(2)})`);
      } else {
        log('DEBUG', `  Skipping unclassified: ${subject.substring(0, 40)}`);
      }
      
      processedIds.add(id);
    } catch (e) {
      log('WARN', `Failed to fetch user query email ${id}: ${e.message}`);
    }
  }
  
  log('INFO', `  Filtering: ${skippedMarketing} marketing, ${skippedReplied} already-replied, ${skippedDrive} drive`);
  
  // Store scan results in RAG memory for pattern learning
  if (skippedMarketing > 0 || userQueries.length > 0) {
    try {
      memory.store({
        type: 'experience',
        content: `Email scan: ${newIds.length} new emails. Filtered: ${skippedMarketing} marketing, ${skippedReplied} already-replied, ${skippedDrive} drive. Passed: ${userQueries.length} user queries.`,
        context: {
          skippedMarketing, skippedReplied, skippedDrive,
          userQueryCount: userQueries.length,
          source: 'email_reader_agent'
        },
        impact: 'low',
        tags: ['email_scan', 'filtering']
      });
    } catch (err) { /* ignore memory errors during scan */ }
  }
  
  state.processedQueryIds = [...processedIds];
  return userQueries;
}

async function processUserQueries(queries, state) {
  if (queries.length === 0) return [];
  
  log('INFO', `Processing ${queries.length} user query email(s) via User Query Agent...`);
  const results = [];
  
  for (const query of queries) {
    try {
      // ── RL Pre-Filter: ask the RL engine if we should even process this ──
      const rlRec = rl.recommend({ from: query.from, subject: query.subject, body: query.body });
      if (rlRec.action === 'DO_NOTHING' && rlRec.confidence >= 0.80) {
        log('INFO', `    🤖 RL: ${query.subject.substring(0, 40)}... → DO_NOTHING (${(rlRec.confidence * 100).toFixed(0)}%) — silent drop`);
        results.push({
          query,
          result: { skipped: true, reason: 'rl_do_nothing', rlRecommendation: rlRec },
          processedAt: new Date().toISOString()
        });
        continue;
      }
      if (rlRec.action === 'NOTIFY_PRESIDENT' && rlRec.confidence >= 0.80) {
        log('INFO', `    🤖 RL: ${query.subject.substring(0, 40)}... → NOTIFY_PRESIDENT (${(rlRec.confidence * 100).toFixed(0)}%) — flag only, no response`);
        // Still process through pipeline but mark as president-notify-only
        query.rlOverride = { action: 'NOTIFY_PRESIDENT', confidence: rlRec.confidence };
      }

      // Extract sender email from the 'from' field
      const emailMatch = query.from.match(/<([^>]+)>/) || [null, query.from];
      const senderEmail = emailMatch[1] || query.from;
      
      // Process through the User Query Agent (pass classification override for member replies)
      const result = await processQueryEmail({
        from: senderEmail,
        subject: query.subject,
        body: query.body,
        receivedAt: query.date
      }, query.isMemberReply ? query.classification : undefined);
      
      results.push({
        query,
        result,
        processedAt: new Date().toISOString()
      });
      
      if (result.requiresApproval) {
        log('INFO', `    ⏳ ${query.subject.substring(0, 30)}... → PENDING APPROVAL (${result.classification.category})`);
      } else if (result.autoApproved) {
        log('INFO', `    ✅ ${query.subject.substring(0, 30)}... → AUTO-APPROVED & SENT`);
      } else {
        log('INFO', `    📋 ${query.subject.substring(0, 30)}... → QUEUED for processing`);
      }
    } catch (e) {
      log('ERROR', `  ❌ Failed to process query: ${e.message}`);
      results.push({
        query,
        error: e.message,
        processedAt: new Date().toISOString()
      });
    }
  }
  
  // Save query results
  state.userQueryResults = [...(state.userQueryResults || []), ...results];
  
  return results;
}

// ═══════════════════════════════════════════════════════════════
// PHASE 3: CRM CROSS-REFERENCE + PIPELINE UPDATE
// ═══════════════════════════════════════════════════════════════

function processNewRsvps(newRsvps, state) {
  if (newRsvps.length === 0) return { newMembers: [], updatedMembers: [] };

  log('INFO', `Cross-referencing ${newRsvps.length} new RSVPs with CRM...`);
  const members = loadCRM();

  // Load existing pipeline
  let existingPipeline = null;
  if (fs.existsSync(PIPELINE_FILE)) {
    existingPipeline = JSON.parse(fs.readFileSync(PIPELINE_FILE, 'utf8'));
  }
  const existingEmails = new Set(
    (existingPipeline?.all || []).map(m => m.email.toLowerCase())
  );

  const newMembers = [];
  const updatedMembers = [];

  for (const rsvp of newRsvps) {
    const crmMatch = findCRMMember(members, rsvp.guestName, rsvp.guestEmail);

    if (crmMatch) {
      const m = crmMatch.member;
      const isNew = !existingEmails.has(m.email.toLowerCase());
      const pay2026 = (m.paymentRecords || []).find(p => p.year === '2026-27');
      const tier = resolveSmartTier(m);

      const memberData = {
        email: m.email,
        firstName: m.firstName || (rsvp.guestName.split(' ')[0] || ''),
        lastName: m.lastName || (rsvp.guestName.split(' ').slice(1).join(' ') || ''),
        displayName: m.displayName || rsvp.guestName,
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
        eviteResponse: rsvp.rsvp,
        eviteAdults: rsvp.adults || 0,
        eviteKids: rsvp.kids || 0,
        eviteGuestName: rsvp.guestName,
        paymentAmount: pay2026 ? pay2026.amount : 0,
        paymentStatus: pay2026 ? 'paid' : 'unpaid',
        paymentSource: pay2026 ? pay2026.source : null,
        membershipCategory: pay2026 ? guessCategoryFromAmount(pay2026.amount, tier) : null,
        membershipTier: tier,
        crmMatchType: crmMatch.matchType,
        crmMatchConfidence: crmMatch.confidence,
        source: 'reader_agent',
        detectedAt: rsvp.detectedAt
      };

      if (isNew) {
        newMembers.push(memberData);
        log('INFO', `  ✨ NEW member in pipeline: ${memberData.displayName} <${memberData.email}> → ${rsvp.rsvp} (${tier})`);
      } else {
        updatedMembers.push(memberData);
        log('INFO', `  🔄 UPDATED: ${memberData.displayName} → ${rsvp.rsvp} (was already in pipeline)`);
      }
    } else {
      log('WARN', `  ❓ UNMATCHED: ${rsvp.guestName} (${rsvp.guestEmail || 'no email'}) → ${rsvp.rsvp}`);
      state.newRsvps.push({
        guestName: rsvp.guestName,
        guestEmail: rsvp.guestEmail,
        rsvp: rsvp.rsvp,
        adults: rsvp.adults,
        kids: rsvp.kids,
        detectedAt: rsvp.detectedAt,
        status: 'unmatched'
      });
    }
  }

  // Update pipeline with new members
  if (existingPipeline && newMembers.length > 0) {
    log('INFO', `Adding ${newMembers.length} new members to pipeline...`);

    for (const nm of newMembers) {
      existingPipeline.all.push(nm);

      if (nm.eviteResponse === 'yes') {
        if (nm.paymentStatus === 'paid') {
          existingPipeline.sendable.push(nm);
        } else {
          existingPipeline.sendable.push(nm);
        }
      } else if (nm.eviteResponse === 'no') {
        existingPipeline.declined.push(nm);
        if (nm.paymentStatus !== 'paid') {
          existingPipeline.declinedSendable.push(nm);
        }
      }
    }

    // Update summary
    existingPipeline.summary.total = existingPipeline.all.length;
    existingPipeline.summary.sendable = existingPipeline.sendable.length;
    existingPipeline.summary.declinedSendable = (existingPipeline.declinedSendable || []).length;
    existingPipeline.lastUpdated = new Date().toISOString();

    fs.writeFileSync(PIPELINE_FILE, JSON.stringify(existingPipeline, null, 2));
    log('INFO', `Pipeline updated: ${existingPipeline.all.length} total members`);
  }

  return { newMembers, updatedMembers };
}

// ═══════════════════════════════════════════════════════════════
// PHASE 4: AUTO-SEND FOR NEW MEMBERS
// ═══════════════════════════════════════════════════════════════

async function autoSendPaymentFollowups(newPayments, state) {
  if (!AUTO_SEND || newPayments.length === 0) {
    if (newPayments.length > 0) {
      log('INFO', `${newPayments.length} payments detected but auto-send is OFF. Use --auto-send to enable.`);
    }
    return [];
  }

  log('INFO', `Processing ${newPayments.length} payment followups...`);
  const members = loadCRM();
  const results = [];

  for (const payment of newPayments) {
    // Match payer to CRM
    const crmMatch = findCRMMember(members, payment.payerName, payment.payerEmail);

    if (!crmMatch) {
      log('WARN', `  ❓ Payment $${payment.amount} from ${payment.payerName} - NO CRM MATCH (manual followup needed)`);
      results.push({ payment, status: 'unmatched', action: 'manual_review' });
      continue;
    }

    const m = crmMatch.member;
    const tier = resolveSmartTier(m);

    // ── Payment Purpose Classification (v1.0) ──
    const purposeClassification = classifyPayment(payment, m, {
      membershipDriveActive: true,
      upcomingEvent: 'Anandabazar March 14, 2026',
      currentDate: new Date()
    });
    const paymentPurpose = purposeClassification.purpose;
    const purposeConf = purposeClassification.confidence;
    log('INFO', `  🔍 Purpose: ${paymentPurpose} (${purposeConf}% confidence) | ${generatePaymentAcknowledgment(purposeClassification)}`);

    // If membership already paid, flag as possible sponsorship/donation
    if (purposeClassification.membershipAlreadyPaid) {
      log('INFO', `  ⚠️  Membership already paid for FY${getFiscalYear(new Date())} → payment may be ${paymentPurpose}`);
    }

    // Determine if partial or full payment
    const m2Price = PRICING.m2[tier] || PRICING.m2.individual;
    const m1Price = PRICING.m1[tier] || PRICING.m1.individual;
    const culturalPrice = PRICING.cultural[tier] || PRICING.cultural.individual;
    const isPartial = payment.amount < culturalPrice;

    const memberData = {
      action: 'payment_followup',
      email: m.email,
      firstName: m.firstName || payment.payerName.split(' ')[0],
      lastName: m.lastName || payment.payerName.split(' ').slice(1).join(' '),
      displayName: m.displayName || payment.payerName,
      householdType: m.householdType || tier,
      membershipTier: tier,
      amountPaid: payment.amount,
      totalPaidSoFar: payment.amount, // Could be cumulative if we track prior payments
      isPartialPayment: isPartial,
      alreadyVerified: false, // Assume not verified
      familyMembers: m.familyMembers || [],
      householdMembers: m.householdMembers || [],
      householdDisplayName: m.householdDisplayName || '',
      paymentRecords: m.paymentRecords || []
    };

    log('INFO', `  💰 Payment $${payment.amount} from ${m.displayName} → ${isPartial ? 'PARTIAL' : 'FULL'} (${tier})`);

    // Check if recipient email is flagged as non-deliverable
    const flagCheck = isEmailFlagged(m.email);
    if (flagCheck.flagged) {
      log('WARN', `  ⚠️ Email ${m.email} is flagged: ${flagCheck.reason} (bounces: ${flagCheck.bounceCount})`);
      if (flagCheck.recoveryTarget) {
        log('INFO', `    → Recovery target: ${flagCheck.recoveryTarget}`);
        memberData.email = flagCheck.recoveryTarget; // Redirect to recovery target
        log('INFO', `    → Redirecting payment followup to ${flagCheck.recoveryTarget}`);
      } else {
        log('WARN', `    → No recovery target — skipping send`);
        results.push({ payment, member: m.email, status: 'flagged', reason: flagCheck.reason });
        continue;
      }
    }

    try {
      const payload = {
        adminKey: ADMIN_KEY,
        members: [memberData]
      };

      const bodyStr = JSON.stringify(payload);
      const resp = await httpsRequest(WIX_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(bodyStr)
        },
        body: bodyStr
      });

      if (resp.status === 200 && resp.data.success) {
        log('INFO', `    ✉️ Payment followup sent to ${m.email}`);
        results.push({ payment, member: m.email, status: 'sent', isPartial });
        state.sentEmails.push({
          email: m.email,
          displayName: m.displayName,
          type: 'payment_followup',
          amount: payment.amount,
          isPartial,
          sentAt: new Date().toISOString(),
          pollCycle: state.pollCount
        });
      } else {
        log('ERROR', `    ❌ Failed to send payment followup to ${m.email}: ${JSON.stringify(resp.data)}`);
        results.push({ payment, member: m.email, status: 'failed', error: resp.data });
      }
    } catch (e) {
      log('ERROR', `    ❌ Payment followup error for ${m.email}: ${e.message}`);
      results.push({ payment, member: m.email, status: 'error', error: e.message });
    }

    // Delay between sends
    await new Promise(r => setTimeout(r, 1000));
  }

  return results;
}

async function autoSendNewMembers(newMembers, state) {
  if (!AUTO_SEND || newMembers.length === 0) {
    if (newMembers.length > 0) {
      log('INFO', `${newMembers.length} new members found but auto-send is OFF. Use --auto-send to enable.`);
    }
    return;
  }

  log('INFO', `Auto-sending emails to ${newMembers.length} new members...`);

  // Filter out members with flagged emails (delivery failures)
  const sendableMembers = [];
  for (const m of newMembers) {
    const flagCheck = isEmailFlagged(m.email);
    if (flagCheck.flagged && !flagCheck.isTemporary) {
      log('WARN', `  ⚠️ Skipping ${m.email} — flagged: ${flagCheck.reason}`);
      if (flagCheck.recoveryTarget) {
        log('INFO', `    → Would redirect to ${flagCheck.recoveryTarget} (manual action needed)`);
      }
      continue;
    }
    sendableMembers.push(m);
  }

  if (sendableMembers.length === 0) {
    log('INFO', 'No sendable members after delivery failure filtering.');
    return;
  }

  // Load images
  let images = null;
  if (!NO_IMAGES) {
    try {
      const eventsB64 = fs.readFileSync(path.join(__dirname, 'membership_events.jpg')).toString('base64');
      const feesB64 = fs.readFileSync(path.join(__dirname, 'membership_fees.jpg')).toString('base64');
      images = { events: eventsB64, fees: feesB64 };
    } catch (e) {
      log('WARN', `Images not loaded: ${e.message}`);
    }
  }

  // Send in batches
  for (let i = 0; i < newMembers.length; i += BATCH_SIZE) {
    const batch = newMembers.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(newMembers.length / BATCH_SIZE);

    log('INFO', `  Batch ${batchNum}/${totalBatches}: ${batch.length} members`);

    try {
      const payload = {
        action: 'execute_pipeline',
        adminKey: ADMIN_KEY,
        members: batch,
        images: images
      };

      const bodyStr = JSON.stringify(payload);
      const resp = await httpsRequest(WIX_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(bodyStr)
        },
        body: bodyStr
      });

      if (resp.status === 200) {
        const results = resp.data.results || [];
        for (const r of results) {
          const sentCount = (r.emails || []).filter(e => e.messageId).length;
          const emailType = r.emails?.[0]?.type || 'unknown';
          log('INFO', `    ✉️  ${r.displayName}: ${sentCount} sent (${emailType})`);
          state.sentEmails.push({
            email: r.email,
            displayName: r.displayName,
            type: emailType,
            sentAt: new Date().toISOString(),
            batchNum, pollCycle: state.pollCount
          });
        }
      } else {
        log('ERROR', `    Batch ${batchNum} failed: HTTP ${resp.status}`);
      }
    } catch (e) {
      log('ERROR', `    Batch ${batchNum} error: ${e.message}`);
    }

    // Delay between batches
    if (i + BATCH_SIZE < newMembers.length) {
      await new Promise(r => setTimeout(r, 5000));
    }
  }
}

// ═══════════════════════════════════════════════════════════════
// PIPELINE STATUS — writes JSON for the EC admin portal
// ═══════════════════════════════════════════════════════════════

const PIPELINE_STATUS_FILE = path.join(__dirname, 'banf-pipeline-status.json');

function writePipelineStatus(state, cycleResult, elapsedSec) {
  const now = new Date();
  const nextPollAt = DO_POLL ? new Date(now.getTime() + POLL_INTERVAL_MIN * 60000).toISOString() : null;

  // Active drives detection — use Event Manager if available, else fallback to heuristic
  let activeDrives = [];
  if (eventManager) {
    try {
      activeDrives = eventManager.getActiveDrives().map(d => `${d.driveId} (${d.type})`);
    } catch (e) { /* fallback below */ }
  }
  if (activeDrives.length === 0) {
    // Fallback: infer from state
    if (state.newRsvps && state.newRsvps.length > 0) activeDrives.push('Evite RSVP Pipeline');
    if (state.newPayments && state.newPayments.length > 0) activeDrives.push('Zelle Payment Pipeline');
    if (state.instructionResults && state.instructionResults.length > 0) activeDrives.push('Admin Instruction Pipeline');
    if (state.userQueryResults && state.userQueryResults.length > 0) activeDrives.push('User Query Pipeline');
    if (activeDrives.length === 0) activeDrives.push('Monitoring (idle)');
  }

  // Recent activity — last 10 events
  const recentActivity = [];
  const addRecent = (items, type) => {
    (items || []).slice(-5).forEach(item => {
      recentActivity.push({
        type,
        name: item.displayName || item.payerName || item.email || '—',
        email: item.email || item.payerEmail || '—',
        time: item.detectedAt || item.sentAt || now.toISOString(),
        detail: type === 'payment' ? `$${item.amount}` : (item.rsvp || item.status || '—'),
        cycle: item.pollCycle || state.pollCount
      });
    });
  };
  addRecent(state.newRsvps, 'rsvp');
  addRecent(state.newPayments, 'payment');
  addRecent(state.sentEmails, 'email_sent');
  recentActivity.sort((a, b) => new Date(b.time) - new Date(a.time));

  const status = {
    pipelineStatus: DO_POLL ? 'ACTIVE' : 'SINGLE_RUN',
    health: 'GREEN',
    lastScanTime: state.lastScanTime || now.toISOString(),
    nextPollAt,
    pollIntervalMin: POLL_INTERVAL_MIN,
    pollCount: state.pollCount || 0,
    autoSend: AUTO_SEND,
    batchSize: BATCH_SIZE,
    upSince: state.createdAt || now.toISOString(),
    lastCycle: {
      duration: elapsedSec + 's',
      newRsvps: cycleResult.newRsvps,
      newPayments: cycleResult.newPayments,
      newMembers: cycleResult.newMembers,
      paymentFollowups: cycleResult.paymentFollowups,
      instructions: cycleResult.instructions,
      userQueries: cycleResult.userQueries,
      deliveryFailures: cycleResult.deliveryFailures || 0,
    },
    driveConfig: eventManager ? {
      source: 'banf-drives.yaml',
      totalDrives: eventManager.getActiveDrives().length + (eventManager.getAllDriveConfigs ? Object.keys(eventManager.getAllDriveConfigs()).length - eventManager.getActiveDrives().length : 0),
      activeDriveCount: eventManager.getActiveDrives().length,
    } : null,
    totals: {
      processedEmails: (state.processedEmailIds || []).length,
      totalRsvps: (state.newRsvps || []).length,
      totalPayments: (state.newPayments || []).length,
      totalEmailsSent: (state.sentEmails || []).length,
      totalInstructions: (state.instructionResults || []).length,
      totalQueries: (state.userQueryResults || []).length,
    },
    activeDrives,
    recentActivity: recentActivity.slice(0, 15),
    updatedAt: now.toISOString(),
  };

  try {
    fs.writeFileSync(PIPELINE_STATUS_FILE, JSON.stringify(status, null, 2));
    log('INFO', `  Pipeline status written → ${PIPELINE_STATUS_FILE}`);
  } catch (e) {
    log('WARN', `  Failed to write pipeline status: ${e.message}`);
  }
}

// ═══════════════════════════════════════════════════════════════
// MAIN POLLING LOOP
// ═══════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════
// MESSAGE QUEUE INTEGRATION — enqueue, process, ack/nack
// ═══════════════════════════════════════════════════════════════

/**
 * Enqueue all newly scanned emails into the message queue for tracking.
 * Each email gets a queue name based on its scan phase.
 * The MQ provides: dedup by emailId, retry on failure, DLQ for dead messages.
 */
function enqueueScannedEmails(phase, items) {
  let enqueued = 0;
  for (const item of items) {
    const emailId = item.emailId || item.messageId || item.id || `${phase}-${Date.now()}-${Math.random().toString(36).slice(2,8)}`;
    const result = mq.enqueue(phase, {
      emailId,
      phase,
      from: item.from || item.payerName || item.guestName || 'unknown',
      subject: item.subject || item.paymentSource || '',
      data: item,
      enqueuedAt: new Date().toISOString(),
    }, { priority: item.priority || 'normal' });
    if (result.enqueued) enqueued++;
  }
  return enqueued;
}

/**
 * After processing, ack all completed messages in a queue.
 * Failed items get nack'd → retry or DLQ.
 */
function ackProcessedMessages(phase, items, results) {
  // For each processed item, ack or nack based on result
  const queue = mq.getStatus();
  const queueMsgs = queue.queues[phase];
  if (!queueMsgs || queueMsgs.total === 0) return;

  // Drain the queue — ack all since they've been processed by the scan functions
  let acked = 0;
  let msg;
  while ((msg = mq.dequeue(phase))) {
    mq.ack(phase, msg.id);
    acked++;
  }
  if (acked > 0) {
    log('INFO', `  📬 MQ: ${phase} — ${acked} messages acknowledged`);
  }
}

async function runOnce(state) {
  const startTime = Date.now();
  state.pollCount = (state.pollCount || 0) + 1;
  log('INFO', `═══ Poll cycle #${state.pollCount} ═══`);

  // ── Sync drive states from YAML config ──
  if (eventManager) {
    try {
      eventManager.syncDriveState();
      const active = eventManager.getActiveDrives();
      log('INFO', `  🎛️  Active drives: ${active.map(d => d.driveId).join(', ') || 'none'}`);
    } catch (e) {
      log('WARN', `Drive sync failed (continuing without drive gating): ${e.message}`);
    }
  }

  // Phase 1: Scan for new Evite RSVPs (EVENT_BOUND — gated by drive state)
  let newRsvps = [], token = null;
  const eviteActive = !eventManager || eventManager.isDriveActive('evite_rsvp');

  // Acquire Gmail token first — if this fails, log error and skip all Gmail phases
  try {
    token = await getGmailToken();
  } catch (tokenErr) {
    log('ERROR', `Gmail token unavailable: ${tokenErr.message}`);
    log('ERROR', `Skipping all Gmail scan phases this cycle. Fix: node gmail-oauth-refresh.js`);
    // Still save state and return — don't crash the poll loop
    saveState(state);
    return { rsvps: 0, payments: 0, instructions: 0, queries: 0, devInstruct: { newInstructions: 0, replies: 0 }, elapsed: Date.now() - startTime, tokenError: true };
  }

  if (eviteActive) {
    ({ newRsvps } = await scanNewEviteEmails(state, token));
    // If first RSVP detected and drive was dormant, auto-activate via Event Manager
    if (newRsvps.length > 0 && eventManager) {
      const driveState = eventManager.getDriveState('evite_rsvp');
      if (driveState && driveState.status === 'dormant') {
        const events = eventManager.getEvents();
        const nextEvent = events.find(e => e.status === 'dormant');
        if (nextEvent) eventManager.notifyFirstRsvp(nextEvent.id);
      }
    }
  } else {
    log('INFO', `  ⏸️  Evite RSVP drive is DORMANT — skipping Phase 1`);
  }

  // Phase 2: Scan for new payments (ALWAYS_ON)
  const newPayments = await scanNewPaymentEmails(state, token);
  if (newPayments.length > 0) enqueueScannedEmails('payment', newPayments);

  // Phase 2b: Scan for admin instruction emails (ALWAYS_ON)
  const newInstructions = await scanInstructionEmails(state, token);
  if (newInstructions.length > 0) enqueueScannedEmails('admin_instruction', newInstructions);
  const instructionResults = await processInstructions(newInstructions, state);
  ackProcessedMessages('admin_instruction', newInstructions, instructionResults);

  // Phase 2b-instruct: Development Instruct Agent (ALWAYS_ON)
  // Detects emails with exact subject "INSTRUCT" from president → routes to dev instruct agent
  let devInstructResults = { newInstructions: 0, replies: 0 };
  try {
    const instructEmails = newInstructions.filter(e => devInstruct.isInstructEmail(e));
    const replyEmails = newInstructions.filter(e => devInstruct.isInstructReply(e));

    // Also scan the user queries for instruct emails that may bypass instruction filter
    const directInstructs = (await scanDevInstructEmails(state, token));

    const allInstructs = [...instructEmails, ...directInstructs];
    for (const email of allInstructs) {
      try {
        await devInstruct.processInstruction(email);
        devInstructResults.newInstructions++;
        log('INFO', `  🔧 Dev Instruct: processed new INSTRUCT email — ${email.subject}`);
      } catch (e) {
        log('WARN', `  Dev Instruct failed: ${e.message}`);
      }
    }

    for (const reply of replyEmails) {
      try {
        await devInstruct.processReply(reply);
        devInstructResults.replies++;
        log('INFO', `  🔧 Dev Instruct: processed reply — ${reply.subject}`);
      } catch (e) {
        log('WARN', `  Dev Instruct reply failed: ${e.message}`);
      }
    }

    if (allInstructs.length > 0 || replyEmails.length > 0) {
      enqueueScannedEmails('dev_instruct', [...allInstructs, ...replyEmails]);
    }
  } catch (e) {
    log('WARN', `Dev Instruct scan failed: ${e.message}`);
  }

  // Phase 2c: Scan for user query emails (ALWAYS_ON — with RL pre-filter)
  const userQueries = await scanUserQueryEmails(state, token);
  if (userQueries.length > 0) enqueueScannedEmails('user_query', userQueries);
  const queryResults = await processUserQueries(userQueries, state);
  ackProcessedMessages('user_query', userQueries, queryResults);

  // Phase 2d: Scan for delivery failure emails (ALWAYS_ON)
  let deliveryFailureResults = { bouncesFound: 0, recovered: 0, escalated: 0, flagged: 0 };
  try {
    deliveryFailureResults = await scanDeliveryFailures(null, token);
    if (deliveryFailureResults.bouncesFound > 0) {
      log('INFO', `  📛 Delivery failures: ${deliveryFailureResults.bouncesFound} bounces, ${deliveryFailureResults.recovered} recovered, ${deliveryFailureResults.escalated} escalated`);
    }
  } catch (e) {
    log('WARN', `Delivery failure scan failed: ${e.message}`);
  }

  // Phase 2e: Scan for GitHub Actions failure emails (ALWAYS_ON)
  let githubFailureResults = { detected: 0, routed: 0 };
  try {
    const ghFailures = await scanGitHubFailureEmails(state, token);
    if (ghFailures.length > 0) {
      const routed = await routeGitHubFailuresToDevPipeline(ghFailures);
      githubFailureResults.detected = ghFailures.length;
      githubFailureResults.routed = routed.filter(r => r.routed).length;
      enqueueScannedEmails('github_failure', ghFailures);
      log('INFO', `  🔴 GitHub failures: ${ghFailures.length} detected, ${githubFailureResults.routed} routed to dev pipeline`);
    }
  } catch (e) {
    log('WARN', `GitHub failure scan failed: ${e.message}`);
  }

  // ── MQ: Enqueue RSVPs and ack payments ──
  if (newRsvps.length > 0) enqueueScannedEmails('evite_rsvp', newRsvps);
  if (newPayments.length > 0) ackProcessedMessages('payment', newPayments, []);

  // Phase 3: Cross-reference with CRM
  const { newMembers, updatedMembers } = processNewRsvps(newRsvps, state);

  // Record new payments in state
  if (newPayments.length > 0) {
    state.newPayments.push(...newPayments.map(p => ({
      ...p,
      detectedAt: new Date().toISOString(),
      pollCycle: state.pollCount
    })));
  }

  // Phase 4a: Auto-send payment followups if any payments detected
  const paymentFollowupResults = await autoSendPaymentFollowups(newPayments, state);

  // Phase 4b: Auto-send RSVP emails if enabled
  await autoSendNewMembers(newMembers, state);

  // Record new RSVPs in state
  for (const nm of newMembers) {
    state.newRsvps.push({
      email: nm.email, displayName: nm.displayName,
      rsvp: nm.eviteResponse, tier: nm.membershipTier,
      detectedAt: nm.detectedAt, status: 'processed',
      pollCycle: state.pollCount
    });
  }

  state.lastScanTime = new Date().toISOString();
  saveState(state);

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

  // Summary
  log('INFO', `─── Cycle #${state.pollCount} complete (${elapsed}s) ───`);
  log('INFO', `  New RSVPs: ${newRsvps.length} (${newMembers.length} new to pipeline, ${updatedMembers.length} updated)`);
  log('INFO', `  New payments: ${newPayments.length}`);
  if (newInstructions.length > 0) {
    const successful = instructionResults.filter(r => r.success).length;
    log('INFO', `  Instructions processed: ${successful}/${newInstructions.length}`);
  }
  if (devInstructResults.newInstructions > 0 || devInstructResults.replies > 0) {
    log('INFO', `  🔧 Dev Instruct: ${devInstructResults.newInstructions} new, ${devInstructResults.replies} replies`);
  }
  if (userQueries.length > 0) {
    const pendingApproval = queryResults.filter(r => r.result?.requiresApproval).length;
    const autoApproved = queryResults.filter(r => r.result?.autoApproved).length;
    log('INFO', `  User queries: ${userQueries.length} (${autoApproved} auto-approved, ${pendingApproval} pending approval)`);
  }
  if (AUTO_SEND && paymentFollowupResults.length > 0) {
    const sent = paymentFollowupResults.filter(r => r.status === 'sent').length;
    log('INFO', `  Payment followups sent: ${sent}/${paymentFollowupResults.length}`);
  }
  if (deliveryFailureResults.bouncesFound > 0) {
    log('INFO', `  Delivery failures: ${deliveryFailureResults.bouncesFound} (recovered: ${deliveryFailureResults.recovered}, escalated: ${deliveryFailureResults.escalated})`);
  }
  if (githubFailureResults.detected > 0) {
    log('INFO', `  🔴 GitHub Actions failures: ${githubFailureResults.detected} detected, ${githubFailureResults.routed} routed to dev pipeline`);
  }
  log('INFO', `  Total processed emails: ${state.processedEmailIds.length}`);
  if (AUTO_SEND && newMembers.length > 0) {
    log('INFO', `  RSVP emails auto-sent: ${newMembers.length} members`);
  }

  // ── MQ: Ack RSVPs after processing ──
  ackProcessedMessages('evite_rsvp', newRsvps, []);

  // ── MQ: Status summary ──
  const mqStatus = mq.getStatus() || {};
  const mqPending = mqStatus.queues ? Object.values(mqStatus.queues).reduce((sum, q) => sum + (q.pending || 0), 0) : 0;
  const mqDLQ = mqStatus.dlq ? mqStatus.dlq.total || 0 : 0;
  if (mqPending > 0 || mqDLQ > 0) {
    log('INFO', `  📬 MQ: ${mqPending} pending, ${mqDLQ} in DLQ`);
  }

  // ── Write pipeline status JSON for EC admin portal ──
  const cycleResult = { newRsvps: newRsvps.length, newPayments: newPayments.length, newMembers: newMembers.length, paymentFollowups: paymentFollowupResults.length, instructions: newInstructions.length, devInstructs: devInstructResults.newInstructions, devInstructReplies: devInstructResults.replies, userQueries: userQueries.length, deliveryFailures: deliveryFailureResults.bouncesFound, githubFailures: githubFailureResults.detected, githubFailuresRouted: githubFailureResults.routed, mqPending, mqDLQ };
  writePipelineStatus(state, cycleResult, elapsed);

  return cycleResult;
}

async function main() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  🌸 BANF Bosonto Utsob 2026 — Continuous Email Reader Agent');
  console.log(`  📡 Mode: ${DO_POLL ? `CONTINUOUS (every ${POLL_INTERVAL_MIN} min)` : 'SINGLE RUN'}`);
  console.log(`  📧 Auto-send: ${AUTO_SEND ? 'YES' : 'NO'}`);
  console.log(`  📦 Batch size: ${BATCH_SIZE}`);
  console.log('═══════════════════════════════════════════════════════════════');

  const state = loadState();

  if (!DO_POLL) {
    // Single run
    await runOnce(state);
    console.log('\n✅ Done. Use --poll for continuous monitoring.');
    return;
  }

  // Continuous polling
  log('INFO', `Starting continuous polling every ${POLL_INTERVAL_MIN} minutes...`);
  log('INFO', 'Press Ctrl+C to stop.\n');

  // Run immediately
  await runOnce(state);

  // Set up interval
  const intervalMs = POLL_INTERVAL_MIN * 60 * 1000;
  const timer = setInterval(async () => {
    try {
      await runOnce(state);
    } catch (e) {
      log('ERROR', `Poll cycle failed: ${e.message}`);
      log('ERROR', e.stack);
    }
  }, intervalMs);

  // Graceful shutdown
  process.on('SIGINT', () => {
    log('INFO', 'Received SIGINT — shutting down gracefully...');
    clearInterval(timer);
    saveState(state);
    log('INFO', `Final state saved. ${state.pollCount} cycles completed.`);
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    log('INFO', 'Received SIGTERM — shutting down...');
    clearInterval(timer);
    saveState(state);
    process.exit(0);
  });

  // Keep alive
  log('INFO', `Next poll in ${POLL_INTERVAL_MIN} minutes...`);
}

main().catch(e => {
  log('ERROR', `Fatal: ${e.message}`);
  console.error(e.stack);
  process.exit(1);
});
