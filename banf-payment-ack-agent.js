#!/usr/bin/env node
/**
 * ═══════════════════════════════════════════════════════════════════════
 *  BANF — Payment Acknowledgment & Membership Mapping Agent  v2.0
 * ═══════════════════════════════════════════════════════════════════════
 *
 *  Scans all Zelle payments received for Bosonto Utsob 2026 / BANF
 *  membership and sends payment acknowledgment emails to every payer
 *  who has NOT yet received one.
 *
 *  v2.0 — LIVE GMAIL SCAN + CUMULATIVE PAYMENT AGGREGATION
 *  Now does a LIVE Gmail scan for ALL Zelle payments, aggregating
 *  multiple payments from the same payer. Also checks previous ack
 *  results to avoid re-sending.
 *
 *  Features:
 *    - LIVE Gmail scan for ALL Zelle payment notifications
 *    - Cumulative payment aggregation (multiple payments → one total)
 *    - Full payment → Membership complete message + tier mapping
 *    - Partial payment → Thank you + remaining balance + tier options
 *    - Correction mode → Re-send corrected email when prior was wrong
 *    - Cross-references CRM and sent-email history
 *    - Uses bosonto-email-sender.js template style
 *
 *  Data Sources:
 *    - LIVE Gmail API scan (primary — always fresh)
 *    - banf-crm-reconciliation.json (member records)
 *    - banf-payment-ack-results.json (previous ack tracking)
 *    - bosonto-reader-agent-state.json (sent email log)
 *
 *  Usage:
 *    node banf-payment-ack-agent.js --list       # Show who needs ack (live scan)
 *    node banf-payment-ack-agent.js --dry-run    # Preview emails (live scan)
 *    node banf-payment-ack-agent.js --send       # Send emails (live scan)
 *    node banf-payment-ack-agent.js --correct <email>  # Correction email to specific payer
 *    node banf-payment-ack-agent.js --offline --list    # Use cached JSON (no Gmail)
 * ═══════════════════════════════════════════════════════════════════════
 */

const nodemailer = require('nodemailer');
const https = require('https');
const fs = require('fs');
const path = require('path');

// ── Config ─────────────────────────────────────────────────────────
const CONFIG = {
  BANF_EMAIL: 'banfjax@gmail.com',
  BANF_NAME: 'Bengali Association of North Florida (BANF)',
  ZELLE_EMAIL: 'banfjax@gmail.com',
  MEMBERSHIP_YEAR: 'FY2026-27',
  EVENT_NAME: 'Bosonto Utsob 2026',
  EVENT_DATE: 'Saturday, March 7, 2026',
  NEXT_EVENT: 'Anandabazar',
  NEXT_EVENT_DATE: 'Saturday, March 14, 2026',
  BATCH_SIZE: 3,
  BATCH_DELAY_MS: 7000,
};

const GMAIL = {
  CLIENT_ID: '1020178199135-3usrl611ara38i7rhu2ub6sn6g1150ml.apps.googleusercontent.com',
  CLIENT_SECRET: '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',
  REFRESH_TOKEN: require('./banf-gmail-config').REFRESH_TOKEN
};

// Membership pricing (M2 Premium Early Bird)
const PRICING = {
  m2:       { family: 375, couple: 330, individual: 205, student: 145, name: 'M2 Premium',       desc: 'All 17 events included' },
  m1:       { family: 280, couple: 255, individual: 140, student: 100, name: 'M1 Regular',       desc: '4 events included + add-on options' },
  cultural: { family: 180, couple: 140, individual: 100, student:  75, name: 'Cultural Special', desc: 'Cultural events included' },
};

// ── CLI Args ───────────────────────────────────────────────────────
const ARGS = process.argv.slice(2);
const LIST_ONLY = ARGS.includes('--list');
const DRY_RUN = ARGS.includes('--dry-run');
const DO_SEND = ARGS.includes('--send');
const OFFLINE = ARGS.includes('--offline');
const CORRECT_IDX = ARGS.indexOf('--correct');
const CORRECT_EMAIL = CORRECT_IDX >= 0 ? (ARGS[CORRECT_IDX + 1] || '').toLowerCase() : null;
const IS_CORRECT_MODE = CORRECT_IDX >= 0;

if (!LIST_ONLY && !DRY_RUN && !DO_SEND && !IS_CORRECT_MODE) {
  console.log('Usage: node banf-payment-ack-agent.js [--list | --dry-run | --send]');
  console.log('       node banf-payment-ack-agent.js --correct <email> [--dry-run | --send]');
  console.log('       Add --offline to use cached JSON instead of live Gmail scan');
  process.exit(0);
}

// ── Payment ↔ CRM name matching ──────────────────────────────────
// Manual mapping: Zelle payer names → CRM emails (from deep scan → CRM reconciliation)
const PAYER_TO_EMAIL = {
  'RANADHIR GHOSH':       'ranadhir.ghosh@gmail.com',
  'AMIT CHANDAK':         'amit.everywhere@gmail.com',
  'SUNETRA BASU GHOSH':   'sunetra.basu@gmail.com',
  'SUVANKAR PAUL':        'suvankar.paul@gmail.com',
  'Amit Kumar Saha':      'asahaech@yahoo.com',
  'ASOK CHAUDHURI':       'asokchaudhuri@gmail.com',
  'TARIT K MONDAL':       'trt.mondal@gmail.com',
  'Ishita Saha':          'saha.ishita@mayo.edu',
  'FNU AMRITA':           'amrriita@gmail.com',   // Amrita Mukhopadhyay
  'SUVENDU MAITRA':       'slmaitra@gmail.com',
  // ── New payers discovered via live Gmail scan (Mar 6-7) ──
  'RAHUL BANERJEE':       'weekender_in@yahoo.com',
  'NILAY CHANDRA':        'chandranilay@gmail.com',
  'KAUSHIKI BHATTACHARYA':'kb94311@gmail.com',
  'DIPRA GHOSH':          'ghosh.dipra@gmail.com',
  'Latika Mukherjee':     'lmukhe@yahoo.com',
  'ATMADEEP MAZUMDAR':    'atmadeep.mazumdar@gmail.com',
  'PARTHA CHOWDHURY':     'partha.chowdhury@gmail.com',  // TODO: verify email
  'SUMAN GHOSH':          'sumon.ghosh@gmail.com',        // TODO: verify — CRM has empty email for Suman Ghosh
  'ROY':                  'dbroy05@gmail.com',             // Dibendu Roy (spouse: Poulomi Roy) — WF truncated name
};

// ═══════════════════════════════════════════════════════════════════
// GMAIL API — LIVE PAYMENT SCAN
// ═══════════════════════════════════════════════════════════════════

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
      res.on('end', () => {
        try { resolve(JSON.parse(d)); } catch { resolve(d); }
      });
    });
    req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
    req.on('error', reject);
    if (options.body) req.write(options.body);
    req.end();
  });
}

async function getGmailToken() {
  const body = `grant_type=refresh_token&refresh_token=${encodeURIComponent(GMAIL.REFRESH_TOKEN)}&client_id=${encodeURIComponent(GMAIL.CLIENT_ID)}&client_secret=${encodeURIComponent(GMAIL.CLIENT_SECRET)}`;
  const r = await httpsRequest('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Content-Length': Buffer.byteLength(body) },
    body
  });
  if (!r.access_token) throw new Error('Gmail token failed: ' + JSON.stringify(r));
  return r.access_token;
}

async function searchGmailMessages(query, token, maxResults = 200) {
  const allIds = [];
  let pageToken = '';
  while (true) {
    const url = `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(query)}&maxResults=100${pageToken ? '&pageToken=' + pageToken : ''}`;
    const r = await httpsRequest(url, { headers: { Authorization: `Bearer ${token}` } });
    if (r.error) throw new Error(JSON.stringify(r.error));
    const msgs = r.messages || [];
    allIds.push(...msgs.map(m => m.id));
    if (!r.nextPageToken || allIds.length >= maxResults) break;
    pageToken = r.nextPageToken;
  }
  return allIds;
}

async function getGmailMessage(id, token) {
  const url = `https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}?format=full`;
  const r = await httpsRequest(url, { headers: { Authorization: `Bearer ${token}` } });
  const headers = (r.payload && r.payload.headers) || [];
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
  extractParts(r.payload || {});

  const cleanHtml = bodyHtml
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();

  return { id, from: getH('From'), subject: getH('Subject'), date: getH('Date'), body: bodyText || cleanHtml, bodyHtml };
}

function parseZellePayment(msg) {
  const text = msg.body + ' ' + (msg.bodyHtml ? msg.bodyHtml.replace(/<[^>]+>/g, ' ') : '');
  const result = { gmailId: msg.id, date: msg.date, subject: msg.subject, name: null, amount: 0, source: 'zelle' };

  // "NAME sent you $AMOUNT"
  let match = text.match(/([A-Z][A-Z\s]+?)\s+sent\s+you\s+\$?([\d,]+(?:\.\d{2})?)/i);
  if (match) {
    result.name = match[1].trim();
    result.amount = parseFloat(match[2].replace(/,/g, ''));
    return result;
  }

  // "You received $XXX from Name"
  match = text.match(/received?\s+\$?([\d,]+(?:\.\d{2})?)\s+from\s+(.+?)(?:\.|$)/im);
  if (match) {
    result.amount = parseFloat(match[1].replace(/,/g, ''));
    result.name = match[2].trim();
    return result;
  }

  return result;
}

/**
 * LIVE Gmail scan — fetches ALL Zelle payment notifications from Wells Fargo
 * Returns array of { name, amount, source, date, gmailId }
 */
async function livePaymentScan() {
  console.log('  🔍 Performing LIVE Gmail scan for Zelle payments...');
  const token = await getGmailToken();
  console.log('  ✅ Gmail token obtained');

  // Search for ALL WF Zelle alerts after Feb 27 (membership year start)
  const msgIds = await searchGmailMessages('from:alerts@notify.wellsfargo.com after:2026/02/27', token);
  console.log(`  📧 Found ${msgIds.length} Wells Fargo alert emails`);

  const payments = [];
  for (let i = 0; i < msgIds.length; i++) {
    if (i % 10 === 0 && i > 0) process.stdout.write(`  Scanning email ${i}/${msgIds.length}...\r`);
    try {
      const msg = await getGmailMessage(msgIds[i], token);
      const p = parseZellePayment(msg);
      // Only include actual Zelle payments (named payer, real amount, not account updates)
      if (p.amount > 0 && p.amount < 1000 && p.name) {
        payments.push(p);
      }
    } catch (e) {}
  }
  console.log(`  💰 Zelle payments found: ${payments.length}                  `);

  // Sort by date descending
  payments.sort((a, b) => new Date(b.date) - new Date(a.date));

  // Update the cached deep scan file with fresh data
  try {
    const deepScanPath = path.join(__dirname, 'bosonto-deep-scan-results.json');
    const existing = JSON.parse(fs.readFileSync(deepScanPath, 'utf8'));
    existing.payments = {
      total: payments.length,
      totalAmount: payments.reduce((s, p) => s + p.amount, 0),
      details: payments,
      lastLiveScan: new Date().toISOString()
    };
    fs.writeFileSync(deepScanPath, JSON.stringify(existing, null, 2));
    console.log(`  📄 Updated bosonto-deep-scan-results.json with ${payments.length} payments`);
  } catch (e) {
    console.log(`  ⚠️  Could not update deep scan cache: ${e.message}`);
  }

  return payments;
}

// ═══════════════════════════════════════════════════════════════════
// LOAD DATA
// ═══════════════════════════════════════════════════════════════════

function loadPaymentsFromCache() {
  const deepScan = JSON.parse(fs.readFileSync(path.join(__dirname, 'bosonto-deep-scan-results.json'), 'utf8'));
  return (deepScan.payments && deepScan.payments.details) || [];
}

function loadCRM() {
  const crm = JSON.parse(fs.readFileSync(path.join(__dirname, 'banf-crm-reconciliation.json'), 'utf8'));
  return Array.isArray(crm) ? crm : (crm.members || []);
}

function loadSentHistory() {
  // Check reader agent state
  let readerSent = [];
  try {
    const readerState = JSON.parse(fs.readFileSync(path.join(__dirname, 'bosonto-reader-agent-state.json'), 'utf8'));
    readerSent = readerState.sentEmails || [];
  } catch (e) {}

  // Check pipeline batch result
  let batchSent = [];
  try {
    const batch = JSON.parse(fs.readFileSync(path.join(__dirname, 'bosonto-batch-result.json'), 'utf8'));
    const results = batch.results || [];
    for (const m of results) {
      const emails = m.emails || [];
      for (const e of emails) {
        if (e.success && (e.type === 'payment_followup' || e.type === 'contact_verify')) {
          batchSent.push({ email: m.email, type: e.type, sentAt: batch.timestamp });
        }
      }
    }
  } catch (e) {}

  // CHECK PREVIOUS ACK RESULTS (this agent's own history)
  let previousAcks = [];
  try {
    const ackResults = JSON.parse(fs.readFileSync(path.join(__dirname, 'banf-payment-ack-results.json'), 'utf8'));
    previousAcks = (ackResults.results || []).filter(r => r.status === 'sent');
  } catch (e) {}

  return { readerSent, batchSent, previousAcks };
}

function findCRMMember(members, payerName, payerEmail) {
  // 1. Exact email match
  if (payerEmail) {
    const m = members.find(m => (m.email || '').toLowerCase() === payerEmail.toLowerCase());
    if (m) return m;
  }
  // 2. Name match
  const norm = (s) => (s || '').toLowerCase().replace(/[^a-z]/g, '');
  const normPayer = norm(payerName);
  for (const m of members) {
    if (norm(m.displayName) === normPayer) return m;
    const full = norm(`${m.firstName || ''} ${m.lastName || ''}`);
    if (full === normPayer) return m;
  }
  return null;
}

function guessTier(member) {
  return (member.householdType || 'individual').toLowerCase();
}

function classifyPayment(amount, tier) {
  // Check if amount exactly matches any membership tier
  for (const [catId, cat] of Object.entries(PRICING)) {
    if (cat[tier] === amount) return { category: catId, full: true, remaining: 0 };
  }
  // Check if it covers any tier
  for (const catId of ['m2', 'm1', 'cultural']) {
    if (amount >= PRICING[catId][tier]) return { category: catId, full: true, remaining: 0 };
  }
  // Partial — calculate remaining for recommended tier (M2)
  const recommended = 'm2';
  const remaining = PRICING[recommended][tier] - amount;
  return { category: null, full: false, remaining: Math.max(0, remaining), recommended };
}

// ═══════════════════════════════════════════════════════════════════
// BUILD RECIPIENTS
// ═══════════════════════════════════════════════════════════════════

async function buildRecipients() {
  // Use LIVE Gmail scan by default, fall back to cached JSON with --offline
  let payments;
  if (OFFLINE) {
    console.log('  📂 Using OFFLINE cached payment data...');
    payments = loadPaymentsFromCache();
  } else {
    try {
      payments = await livePaymentScan();
    } catch (err) {
      console.log(`  ⚠️  Live scan failed (${err.message}), falling back to cached data...`);
      payments = loadPaymentsFromCache();
    }
  }

  const members = loadCRM();
  const { readerSent, batchSent, previousAcks } = loadSentHistory();

  console.log(`\n  📊 Data loaded:`);
  console.log(`     Zelle payments:     ${payments.length}`);
  console.log(`     CRM members:        ${members.length}`);
  console.log(`     Reader emails sent:  ${readerSent.length} (type: ${[...new Set(readerSent.map(s => s.type))].join(', ') || 'none'})`);
  console.log(`     Batch emails sent:   ${batchSent.length}`);
  console.log(`     Previous ack emails: ${previousAcks.length}`);

  // Build set of emails that already received payment ack
  const ackedEmails = new Set();
  for (const s of readerSent) {
    if (s.type === 'payment_followup' || s.type === 'payment_ack' || s.type === 'contact_verify') {
      ackedEmails.add(s.email.toLowerCase());
    }
  }
  for (const s of batchSent) {
    ackedEmails.add(s.email.toLowerCase());
  }
  // Also check this agent's own previous ack results
  for (const s of previousAcks) {
    ackedEmails.add(s.email.toLowerCase());
  }
  console.log(`     Already acknowledged: ${ackedEmails.size}`);

  // In --correct mode, REMOVE the target from ackedEmails so it gets re-processed
  if (IS_CORRECT_MODE && CORRECT_EMAIL) {
    ackedEmails.delete(CORRECT_EMAIL);
    console.log(`  🔧 CORRECTION MODE: force re-processing ${CORRECT_EMAIL}`);
  }

  // Process each payment
  const recipients = [];
  const seenEmails = new Map(); // Aggregate multiple payments per person

  for (const p of payments) {
    const payerName = p.name;
    const mappedEmail = PAYER_TO_EMAIL[payerName];
    const crmMember = findCRMMember(members, payerName, mappedEmail);

    const email = mappedEmail || (crmMember ? crmMember.email : null);
    if (!email) {
      console.log(`  ⚠️  Cannot map payer "${payerName}" ($${p.amount}) to any CRM member — SKIPPING`);
      continue;
    }

    const emailLower = email.toLowerCase();

    // Aggregate multiple payments from same person
    if (seenEmails.has(emailLower)) {
      const existing = seenEmails.get(emailLower);
      existing.totalPaid += p.amount;
      existing.payments.push(p);
      continue;
    }

    const member = crmMember || { displayName: payerName, email, householdType: 'individual' };
    const tier = guessTier(member);
    const firstName = (member.displayName || payerName).split(' ')[0];

    const rec = {
      name: member.displayName || payerName,
      email: email,
      firstName,
      tier,
      totalPaid: p.amount,
      payments: [p],
      member,
      alreadyAcked: ackedEmails.has(emailLower),
    };

    seenEmails.set(emailLower, rec);
    recipients.push(rec);
  }

  // Classify each recipient's payment
  for (const r of recipients) {
    const c = classifyPayment(r.totalPaid, r.tier);
    r.classification = c;
    r.isFullPayment = c.full;
    r.membershipCategory = c.category;
    r.remaining = c.remaining;
  }

  // In CORRECT mode, tag the corrected recipient and filter to only them
  if (IS_CORRECT_MODE && CORRECT_EMAIL) {
    const target = recipients.find(r => r.email.toLowerCase() === CORRECT_EMAIL);
    if (!target) {
      console.log(`  ❌ No payment found for ${CORRECT_EMAIL}`);
      return { recipients, needsAck: [], alreadyDone: recipients, allPayments: payments };
    }
    target.isCorrection = true;
    target.alreadyAcked = false; // Force re-send
    const needsAck = [target];
    const alreadyDone = recipients.filter(r => r !== target);
    return { recipients, needsAck, alreadyDone, allPayments: payments };
  }

  // Filter out already acknowledged
  const needsAck = recipients.filter(r => !r.alreadyAcked);
  const alreadyDone = recipients.filter(r => r.alreadyAcked);

  return { recipients, needsAck, alreadyDone, allPayments: payments };
}

// ═══════════════════════════════════════════════════════════════════
// EMAIL TEMPLATE — Payment Acknowledgment
// ═══════════════════════════════════════════════════════════════════

function buildPaymentAckEmail(r) {
  const sentDate = new Date().toLocaleDateString('en-US', {
    timeZone: 'America/New_York', weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });
  const tier = r.tier;
  const tierLabel = tier.charAt(0).toUpperCase() + tier.slice(1);

  // Payment date formatting — use the LATEST payment date
  const latestPayment = r.payments.sort((a, b) => new Date(b.date) - new Date(a.date))[0];
  const payDate = latestPayment && latestPayment.date
    ? new Date(latestPayment.date).toLocaleDateString('en-US', { timeZone: 'America/New_York', month: 'long', day: 'numeric', year: 'numeric' })
    : 'recently';

  // Multi-payment breakdown section (when 2+ payments from same payer)
  let multiPaymentBreakdown = '';
  if (r.payments.length > 1) {
    const rows = r.payments
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .map((p, i) => {
        const d = p.date ? new Date(p.date).toLocaleDateString('en-US', { timeZone: 'America/New_York', month: 'short', day: 'numeric', year: 'numeric' }) : '?';
        return `<tr>
          <td style="padding:6px 10px;border-bottom:1px solid #eee;font-size:.88rem">${i + 1}. ${d}</td>
          <td style="padding:6px 10px;border-bottom:1px solid #eee;font-size:.88rem;text-align:right;font-weight:600">$${p.amount}</td>
        </tr>`;
      }).join('');

    multiPaymentBreakdown = `
    <div style="background:#f3e5f5;border:1px solid #ce93d8;border-radius:10px;padding:14px;margin:12px 0">
      <p style="margin:0 0 8px;font-weight:700;font-size:.9rem;color:#7b1fa2">📋 Payment History:</p>
      <table style="width:100%;border-collapse:collapse">
        ${rows}
        <tr style="background:#f3e5f5">
          <td style="padding:8px 10px;font-weight:700;font-size:.9rem;color:#4a148c">Total:</td>
          <td style="padding:8px 10px;text-align:right;font-weight:700;font-size:.95rem;color:#4a148c">$${r.totalPaid}</td>
        </tr>
      </table>
    </div>`;
  }

  // Correction notice banner (when re-sending corrected email)
  let correctionBanner = '';
  if (r.isCorrection) {
    correctionBanner = `
    <div style="background:#fff3e0;border:2px solid #ff9800;border-radius:10px;padding:16px;margin:0 0 20px">
      <p style="margin:0;font-size:.92rem;color:#e65100;line-height:1.6">
        <strong>📝 Updated Payment Acknowledgment</strong><br>
        We are sending this updated confirmation as we have now received and processed all your payments.
        Please disregard the earlier partial payment email — this email reflects your complete payment status.
      </p>
    </div>`;
  }

  // Full vs Partial sections
  let paymentSection;
  let headerTitle;
  let headerSubtitle;

  if (r.isFullPayment) {
    const catInfo = PRICING[r.membershipCategory];
    headerTitle = r.isCorrection
      ? 'Updated: Your Membership Payment is Now Complete!'
      : 'Thank You! Your Membership Payment is Confirmed';
    headerSubtitle = `BANF ${CONFIG.MEMBERSHIP_YEAR} — ${catInfo.name}`;

    const paymentMethodNote = r.payments.length > 1
      ? `$${r.totalPaid} total received via Zelle (${r.payments.length} payments)`
      : `$${r.totalPaid} received via Zelle on ${payDate}`;

    paymentSection = `
    ${correctionBanner}

    ${multiPaymentBreakdown}

    <!-- Payment Confirmed Box -->
    <div style="background:linear-gradient(135deg,#e8f5e9,#f1f8e9);border:2px solid #4caf50;border-radius:12px;padding:20px;margin:20px 0">
      <div style="display:flex;align-items:center;gap:10px">
        <span style="font-size:1.5rem;color:#2e7d32;font-weight:bold">✅</span>
        <div>
          <div style="font-size:1.05rem;font-weight:700;color:#2e7d32">Payment Complete — ${catInfo.name} (${tierLabel})</div>
          <div style="font-size:.88rem;color:#555;margin-top:4px">${paymentMethodNote}</div>
        </div>
      </div>
      ${r.membershipCategory === 'm2' ? '<div style="margin-top:10px;font-size:.85rem;color:#2e7d32;font-weight:600">🎉 All 17 BANF events included in your membership!</div>' : ''}
    </div>

    <!-- Membership Details -->
    <div style="background:#f5f5f5;border:1px solid #e0e0e0;border-radius:10px;padding:16px;margin:16px 0">
      <p style="margin:0 0 8px;font-weight:700;color:#333">Your Membership Details:</p>
      <table style="width:100%;border-collapse:collapse;font-size:.9rem">
        <tr><td style="padding:6px 0;color:#555">Plan:</td><td style="padding:6px 0;font-weight:600">${catInfo.name}</td></tr>
        <tr><td style="padding:6px 0;color:#555">Tier:</td><td style="padding:6px 0;font-weight:600">${tierLabel}</td></tr>
        <tr><td style="padding:6px 0;color:#555">Year:</td><td style="padding:6px 0;font-weight:600">${CONFIG.MEMBERSHIP_YEAR}</td></tr>
        <tr><td style="padding:6px 0;color:#555">Amount Paid:</td><td style="padding:6px 0;font-weight:600;color:#2e7d32">$${r.totalPaid}</td></tr>
        <tr><td style="padding:6px 0;color:#555">Status:</td><td style="padding:6px 0;font-weight:700;color:#2e7d32">✅ ACTIVE</td></tr>
      </table>
    </div>
    `;
  } else {
    // Partial payment
    headerTitle = 'Thank You for Your Payment!';
    headerSubtitle = `BANF ${CONFIG.MEMBERSHIP_YEAR} Membership`;

    const m2Remaining = Math.max(0, PRICING.m2[tier] - r.totalPaid);
    const m1Remaining = Math.max(0, PRICING.m1[tier] - r.totalPaid);
    const culturalRemaining = Math.max(0, PRICING.cultural[tier] - r.totalPaid);

    // Check if any tier is fully paid
    let paidTierNote = '';
    if (culturalRemaining <= 0) paidTierNote = '<div style="margin-top:8px;font-size:.85rem;color:#2e7d32">✅ Your payment covers the <strong>Cultural Special</strong> plan!</div>';
    if (m1Remaining <= 0) paidTierNote = '<div style="margin-top:8px;font-size:.85rem;color:#2e7d32">✅ Your payment covers the <strong>M1 Regular</strong> plan!</div>';

    paymentSection = `
    <!-- Payment Received Box -->
    <div style="background:#e3f2fd;border:2px solid #64b5f6;border-radius:12px;padding:20px;margin:20px 0">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px">
        <span style="font-size:1.3rem;color:#1565c0">👍</span>
        <div style="font-size:1.05rem;font-weight:700;color:#1565c0">Payment Received — $${r.totalPaid}</div>
      </div>
      <p style="margin:0 0 12px;color:#333;font-size:.92rem">Thank you so much for your payment of <strong>$${r.totalPaid}</strong> via Zelle on ${payDate}. We truly appreciate your support!</p>
      ${paidTierNote}
    </div>

    <!-- Membership Options Table -->
    <div style="background:#fff;border:1px solid #e0e0e0;border-radius:10px;padding:16px;margin:16px 0">
      <p style="margin:0 0 10px;font-weight:700;color:#333">Membership Options (${tierLabel} Tier):</p>
      <table style="width:100%;border-collapse:collapse;font-size:.88rem">
        <thead>
          <tr style="background:#f5f5f5">
            <th style="padding:8px 10px;text-align:left;font-size:.8rem;color:#555">Plan</th>
            <th style="padding:8px 10px;text-align:right;font-size:.8rem;color:#555">Full Price</th>
            <th style="padding:8px 10px;text-align:right;font-size:.8rem;color:#555">Your Balance</th>
          </tr>
        </thead>
        <tbody>
          <tr style="background:#e8f5e9">
            <td style="padding:8px 10px;border-bottom:1px solid #eee"><span style="color:#4caf50;font-weight:600">★ </span><strong>M2 Premium</strong> <span style="color:#777;font-size:.8rem">(All 17 events)</span></td>
            <td style="padding:8px 10px;border-bottom:1px solid #eee;text-align:right">$${PRICING.m2[tier]}</td>
            <td style="padding:8px 10px;border-bottom:1px solid #eee;text-align:right;font-weight:600;color:${m2Remaining > 0 ? '#f57c00' : '#4caf50'}">${m2Remaining > 0 ? '$' + m2Remaining + ' remaining' : '✅ Paid'}</td>
          </tr>
          <tr>
            <td style="padding:8px 10px;border-bottom:1px solid #eee"><strong>M1 Regular</strong> <span style="color:#777;font-size:.8rem">(4 events + add-ons)</span></td>
            <td style="padding:8px 10px;border-bottom:1px solid #eee;text-align:right">$${PRICING.m1[tier]}</td>
            <td style="padding:8px 10px;border-bottom:1px solid #eee;text-align:right;font-weight:600;color:${m1Remaining > 0 ? '#f57c00' : '#4caf50'}">${m1Remaining > 0 ? '$' + m1Remaining + ' remaining' : '✅ Paid'}</td>
          </tr>
          <tr>
            <td style="padding:8px 10px"><strong>Cultural Special</strong> <span style="color:#777;font-size:.8rem">(Cultural events)</span></td>
            <td style="padding:8px 10px;text-align:right">$${PRICING.cultural[tier]}</td>
            <td style="padding:8px 10px;text-align:right;font-weight:600;color:${culturalRemaining > 0 ? '#f57c00' : '#4caf50'}">${culturalRemaining > 0 ? '$' + culturalRemaining + ' remaining' : '✅ Paid'}</td>
          </tr>
        </tbody>
      </table>
      <p style="margin:12px 0 0;color:#555;font-size:.88rem">
        To complete your <strong>M2 Premium</strong> membership, please send the remaining <strong style="color:#f57c00">$${m2Remaining}</strong> via Zelle to <strong>${CONFIG.ZELLE_EMAIL}</strong>.
      </p>
      <p style="margin:8px 0 0;color:#777;font-size:.82rem">
        <em>If you'd prefer a different plan, just reply to this email and let us know!</em>
      </p>
    </div>
    `;
  }

  // Next event section
  const nextEventSection = `
  <div style="background:#e3f2fd;border:1px solid #bbdefb;border-radius:12px;padding:18px;margin:20px 0">
    <p style="font-size:.92rem;color:#1565c0;line-height:1.75;margin:0 0 8px">
      <strong>📅 Coming Up Next — ${CONFIG.NEXT_EVENT}</strong>
    </p>
    <p style="font-size:.9rem;color:#1976d2;line-height:1.75;margin:0">
      We look forward to seeing you at <strong>${CONFIG.NEXT_EVENT}</strong> on <strong>${CONFIG.NEXT_EVENT_DATE}</strong>!
      More details will follow soon.
    </p>
  </div>`;

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${headerTitle}</title></head>
<body style="margin:0;padding:0;background:#f5f7fa;font-family:'Segoe UI',Arial,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f7fa;padding:30px 0">
<tr><td align="center">
<table width="620" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.1)">

  <!-- Header -->
  <tr><td style="background:linear-gradient(135deg,#1565c0,#1976d2);padding:32px 40px;text-align:center">
    <h1 style="color:#fff;margin:0;font-size:1.4rem;font-weight:700">${headerTitle}</h1>
    <p style="color:rgba(255,255,255,.9);margin:10px 0 0;font-size:.95rem;letter-spacing:.3px">
      ${headerSubtitle}
    </p>
  </td></tr>

  <!-- Body -->
  <tr><td style="padding:36px 40px 16px">

    <p style="font-size:1rem;color:#333;line-height:1.7;margin:0 0 16px">
      Dear ${r.firstName},
    </p>

    <p style="font-size:.95rem;color:#444;line-height:1.75;margin:0 0 16px">
      On behalf of the <strong>Bengali Association of North Florida (BANF)</strong>,
      ${r.isCorrection && r.payments.length > 1
        ? `we are writing to confirm that we have now received and processed <strong>all ${r.payments.length} of your Zelle payments</strong> totaling <strong>$${r.totalPaid}</strong>. We apologize for any confusion from our earlier email — your complete payment is now fully accounted for.`
        : r.payments.length > 1
          ? `we want to sincerely <strong>thank you</strong> for your ${r.payments.length} Zelle payments totaling <strong>$${r.totalPaid}</strong>. Your support means the world to our community!`
          : `we want to sincerely <strong>thank you</strong> for your Zelle payment of <strong>$${r.totalPaid}</strong>. Your support means the world to our community!`
      }
    </p>

    ${paymentSection}

    ${nextEventSection}

    <p style="font-size:.95rem;color:#444;line-height:1.75;margin:16px 0 4px">
      We truly appreciate your support and look forward to seeing you at our events!
    </p>
    <p style="font-size:.95rem;color:#333;line-height:1.6;margin:0 0 4px">
      Warm regards,<br>
      <strong>The BANF Executive Committee</strong><br>
      <span style="font-size:.85rem;color:#666">Bengali Association of North Florida</span>
    </p>

  </td></tr>

  <!-- Privacy -->
  <tr><td style="background:#f0f4f8;border-top:1px solid #dde3ea;padding:18px 40px">
    <p style="margin:0;font-size:.78rem;color:#888;line-height:1.7">
      🔒 This email was sent to BANF community members regarding their membership payment.
      Your information is used solely for BANF community communications.
      You may <a href="mailto:banfjax@gmail.com?subject=Unsubscribe" style="color:#1565c0">unsubscribe</a> at any time.
    </p>
  </td></tr>

  <!-- Footer -->
  <tr><td style="background:#f9f9f9;border-top:1px solid #eee;padding:14px 40px;text-align:center">
    <p style="margin:0 0 4px;font-size:.75rem;color:#999">
      <a href="mailto:banfjax@gmail.com?subject=Unsubscribe" style="color:#1565c0;text-decoration:underline">Unsubscribe</a>
       &nbsp;|&nbsp; Sent on ${sentDate}
    </p>
    <p style="margin:0;font-size:.73rem;color:#bbb">&copy; 2026 Bengali Association of North Florida (BANF). All rights reserved.</p>
    <p style="margin:4px 0 0;font-size:.7rem;color:#ccc">jaxbengali.org &nbsp;|&nbsp; banfjax@gmail.com &nbsp;|&nbsp; Jacksonville, FL</p>
  </td></tr>

</table></td></tr></table></body></html>`;
}

// ═══════════════════════════════════════════════════════════════════
// GMAIL TRANSPORT
// ═══════════════════════════════════════════════════════════════════

async function createTransporter() {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      type: 'OAuth2',
      user: CONFIG.BANF_EMAIL,
      clientId: GMAIL.CLIENT_ID,
      clientSecret: GMAIL.CLIENT_SECRET,
      refreshToken: GMAIL.REFRESH_TOKEN
    }
  });
  await transporter.verify();
  return transporter;
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ═══════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════

async function main() {
  console.log('');
  console.log('  ═══════════════════════════════════════════════════════');
  console.log('   BANF — Payment Acknowledgment & Membership Mapping');
  console.log('  ═══════════════════════════════════════════════════════');
  console.log('');
  console.log(`  Mode: ${IS_CORRECT_MODE ? '🔧 CORRECTION' : LIST_ONLY ? '📋 LIST' : DRY_RUN ? '🔍 DRY RUN' : '📨 LIVE SEND'}`);
  if (IS_CORRECT_MODE) console.log(`  Target: ${CORRECT_EMAIL}`);

  const { recipients, needsAck, alreadyDone, allPayments } = await buildRecipients();

  console.log(`\n  📊 Payment Analysis:`);
  console.log(`     Total Zelle payments:     ${allPayments.length}`);
  console.log(`     Unique payers (mapped):   ${recipients.length}`);
  console.log(`     Already acknowledged:     ${alreadyDone.length}`);
  console.log(`     🔴 Needs acknowledgment:  ${needsAck.length}`);

  const fullPay = needsAck.filter(r => r.isFullPayment);
  const partialPay = needsAck.filter(r => !r.isFullPayment);
  console.log(`\n     Full payments:     ${fullPay.length}`);
  console.log(`     Partial payments:  ${partialPay.length}`);

  // Display list
  console.log(`\n  ── NEEDS PAYMENT ACKNOWLEDGMENT (${needsAck.length}) ──`);
  needsAck.forEach((r, i) => {
    const cat = r.isFullPayment
      ? `✅ FULL — ${PRICING[r.membershipCategory].name}`
      : `⚠️  PARTIAL — $${r.remaining} remaining for M2`;
    const payCount = r.payments.length > 1 ? ` (${r.payments.length} payments aggregated)` : '';
    const corrFlag = r.isCorrection ? ' [CORRECTION]' : '';
    console.log(`    ${i + 1}. ${r.name} <${r.email}> — $${r.totalPaid} (${r.tier}) → ${cat}${payCount}${corrFlag}`);
  });

  if (alreadyDone.length > 0) {
    console.log(`\n  ── ALREADY ACKNOWLEDGED (${alreadyDone.length}) ──`);
    alreadyDone.forEach((r, i) => {
      console.log(`    ${i + 1}. ${r.name} <${r.email}> — $${r.totalPaid} (already sent)`);
    });
  }

  if (LIST_ONLY) return;

  if (needsAck.length === 0) {
    console.log('\n  ✅ All payments already acknowledged. Nothing to send.');
    return;
  }

  // Create transporter for sending
  let transporter = null;
  if (DO_SEND) {
    console.log('\n  🔑 Creating Gmail OAuth2 transporter...');
    transporter = await createTransporter();
    console.log('  ✅ Transporter verified.');
  }

  // Send emails
  const results = [];
  console.log(`\n  📧 Sending ${needsAck.length} payment acknowledgment emails...\n`);

  for (let i = 0; i < needsAck.length; i += CONFIG.BATCH_SIZE) {
    const batch = needsAck.slice(i, i + CONFIG.BATCH_SIZE);
    const batchNum = Math.floor(i / CONFIG.BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(needsAck.length / CONFIG.BATCH_SIZE);

    console.log(`  ── Batch ${batchNum}/${totalBatches} (${batch.length} emails) ──`);

    for (const r of batch) {
      const subject = r.isCorrection
        ? `BANF — Updated: Membership Payment Confirmed ($${r.totalPaid} Total)`
        : r.isFullPayment
          ? `BANF — Thank You! Membership Payment Confirmed ($${r.totalPaid})`
          : `BANF — Thank You for Your Payment of $${r.totalPaid}!`;
      const html = buildPaymentAckEmail(r);

      if (DRY_RUN) {
        console.log(`    ✉️  [DRY RUN] → ${r.name} <${r.email}> | $${r.totalPaid} | ${r.isCorrection ? 'CORRECTION' : r.isFullPayment ? 'FULL' : 'PARTIAL'} | ${r.payments.length} payment(s)`);
        results.push({ email: r.email, name: r.name, amount: r.totalPaid, type: r.isCorrection ? 'correction' : r.isFullPayment ? 'full' : 'partial', paymentCount: r.payments.length, status: 'dry-run' });
        continue;
      }

      try {
        const info = await transporter.sendMail({
          from: `"${CONFIG.BANF_NAME}" <${CONFIG.BANF_EMAIL}>`,
          to: `"${r.name}" <${r.email}>`,
          subject,
          html,
        });
        console.log(`    ✅ Sent → ${r.name} <${r.email}> | $${r.totalPaid} | ${r.isCorrection ? 'CORRECTION' : r.isFullPayment ? 'FULL' : 'PARTIAL'} | ${r.payments.length} payment(s) (${info.messageId})`);
        results.push({ email: r.email, name: r.name, amount: r.totalPaid, type: r.isCorrection ? 'correction' : r.isFullPayment ? 'full' : 'partial', paymentCount: r.payments.length, status: 'sent', messageId: info.messageId });
      } catch (err) {
        console.error(`    ❌ FAILED → ${r.name} <${r.email}>: ${err.message}`);
        results.push({ email: r.email, name: r.name, amount: r.totalPaid, type: r.isCorrection ? 'correction' : r.isFullPayment ? 'full' : 'partial', paymentCount: r.payments.length, status: 'failed', error: err.message });
      }
    }

    if (i + CONFIG.BATCH_SIZE < needsAck.length) {
      console.log(`    ⏳ Waiting ${CONFIG.BATCH_DELAY_MS / 1000}s before next batch...`);
      await sleep(CONFIG.BATCH_DELAY_MS);
    }
  }

  // Summary
  const sent = results.filter(r => r.status === 'sent').length;
  const failed = results.filter(r => r.status === 'failed').length;
  const dryRunCount = results.filter(r => r.status === 'dry-run').length;

  console.log('\n  ═══════════════════════════════════════════════════════');
  console.log('   SUMMARY');
  console.log('  ═══════════════════════════════════════════════════════');
  console.log(`   Total payment ack emails:   ${results.length}`);
  if (DO_SEND) {
    console.log(`   ✅ Sent:                     ${sent}`);
    console.log(`   ❌ Failed:                   ${failed}`);
  }
  if (DRY_RUN) console.log(`   🔍 Dry run:                  ${dryRunCount}`);

  const totalCollected = results.reduce((s, r) => s + r.amount, 0);
  console.log(`   💰 Total payments acked:     $${totalCollected}`);
  console.log('  ═══════════════════════════════════════════════════════\n');

  // Save results
  const resultFile = path.join(__dirname, 'banf-payment-ack-results.json');
  fs.writeFileSync(resultFile, JSON.stringify({
    timestamp: new Date().toISOString(),
    mode: DRY_RUN ? 'dry-run' : 'live',
    totalPayments: allPayments.length,
    needsAck: needsAck.length,
    alreadyAcked: alreadyDone.length,
    results,
  }, null, 2));
  console.log(`  📄 Results saved to: ${resultFile}`);
}

main().catch(err => {
  console.error('\n  ❌ Fatal error:', err.message);
  process.exit(1);
});
