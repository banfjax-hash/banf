#!/usr/bin/env node
/**
 * ═══════════════════════════════════════════════════════════════════════
 *  BANF Bosonto Utsob 2026 — Post-Event Email Agent (v2.0 Aggregate)
 * ═══════════════════════════════════════════════════════════════════════
 *
 *  Sends two types of post-event emails with AGGREGATE INTELLIGENCE:
 *    1. THANK-YOU — to members who checked in (attended)
 *    2. UNDERSTANDING — to members who RSVP'd but did NOT attend
 *
 *  Aggregate Pipeline Integration (NEW v2.0):
 *    - Cross-references payment data → if member paid but unacknowledged,
 *      includes payment acknowledgment in the thank-you email
 *    - Fetches attendance records from server (replaces localStorage)
 *    - Uses Payment Purpose Engine for intelligent payment classification
 *    - Loads ledger data for financial context
 *
 *  Data Sources:
 *    - CRM reconciliation (banf-crm-reconciliation.json)
 *    - QR drive lock (banf-qr-drive-lock.json)
 *    - Email reader state (bosonto-reader-agent-state.json)
 *    - Account ledger (banf-ledger.json) — payment records
 *    - Server attendance (via API GET /admin_attendance)
 *
 *  Usage:
 *    node banf-post-event-email-agent.js --dry-run         # Preview emails, no sending
 *    node banf-post-event-email-agent.js --send             # Send all emails
 *    node banf-post-event-email-agent.js --send --attended  # Send only thank-you emails
 *    node banf-post-event-email-agent.js --send --missed    # Send only understanding emails
 *    node banf-post-event-email-agent.js --list             # Show attended vs missed breakdown
 *
 * ═══════════════════════════════════════════════════════════════════════
 */

const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');
const https = require('https');

// Payment Purpose Engine — for aggregate intelligence
let classifyPayment, generatePaymentAcknowledgment;
try {
  ({ classifyPayment, generatePaymentAcknowledgment } = require('./banf-payment-purpose-engine'));
} catch (e) {
  console.log('  Note: Payment Purpose Engine not available — running without payment aggregation');
  classifyPayment = null;
}

// ── Config ─────────────────────────────────────────────────────────
const CONFIG = {
  BANF_EMAIL: 'banfjax@gmail.com',
  BANF_NAME: 'Bengali Association of North Florida (BANF)',
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

// ── CLI Args ───────────────────────────────────────────────────────
const ARGS = process.argv.slice(2);
const DRY_RUN = ARGS.includes('--dry-run');
const DO_SEND = ARGS.includes('--send');
const ONLY_ATTENDED = ARGS.includes('--attended');
const ONLY_MISSED = ARGS.includes('--missed');
const LIST_ONLY = ARGS.includes('--list');

if (!DRY_RUN && !DO_SEND && !LIST_ONLY) {
  console.log('Usage: node banf-post-event-email-agent.js [--dry-run] [--send] [--attended] [--missed] [--list]');
  process.exit(0);
}

// ═══════════════════════════════════════════════════════════════════
// NO-SHOW LIST — Members who RSVP'd but did NOT physically attend
// ═══════════════════════════════════════════════════════════════════
// Update this list with actual no-show emails once confirmed.
// Everyone NOT in this list (from the 52 RSVP) will get the thank-you email.

const NO_SHOW_EMAILS = [
  'asokchaudhuri@gmail.com',        // Asok Chaudhuri
  'atmadeep.mazumdar@gmail.com',     // Atmadeep Mazumdar
  'reshmabhadra@gmail.com',          // Reshma Das
  'tosanchari@gmail.com',            // Sanchari Bhattacharyya
  'bidhan138@gmail.com',             // bidhan138
  'tanmoy.banerjee2009@gmail.com',   // tanmoy.banerjee2009
  'isindhu7@gmail.com',              // Indrani Sindhuvalli
  'mailsrabasti@gmail.com',          // Srabasti Sengupta
  'palsourav30@gmail.com',           // Sourav Pal
  'trt.mondal@gmail.com',            // Tarit Mondal
];

// ═══════════════════════════════════════════════════════════════════
// LOAD ATTENDEE DATA
// ═══════════════════════════════════════════════════════════════════

function loadRecipients() {
  const CRM_FILE = path.join(__dirname, 'banf-crm-reconciliation.json');
  const LOCK_FILE = path.join(__dirname, 'banf-qr-drive-lock.json');

  const crmRaw = JSON.parse(fs.readFileSync(CRM_FILE, 'utf8'));
  const allMembers = Array.isArray(crmRaw) ? crmRaw : (crmRaw.members || []);

  const lockRaw = JSON.parse(fs.readFileSync(LOCK_FILE, 'utf8'));
  const sentMap = lockRaw.sentEmails || {};
  const sentEmails = Object.keys(sentMap);

  const recipients = [];
  const seen = new Set();

  // Pass 1: CRM members with Bosonto RSVP=Yes
  for (const m of allMembers) {
    const events = m.eventAttendance || [];
    const bosonto = events.find(e =>
      e.eventName && e.eventName.toLowerCase().includes('bosonto') &&
      (e.rsvp || '').toLowerCase() === 'yes'
    );
    if (!bosonto) continue;

    const email = (m.email || '').toLowerCase().trim();
    if (!email || seen.has(email)) continue;
    seen.add(email);

    recipients.push({
      name: m.displayName || `${m.firstName || ''} ${m.lastName || ''}`.trim() || email,
      email: m.email,
      firstName: (m.displayName || '').split(' ')[0] || 'Member',
      adults: parseInt(bosonto.adults) || 1,
      kids: parseInt(bosonto.kids) || 0,
    });
  }

  // Pass 2: QR-sent but not already in list
  for (const email of sentEmails) {
    if (seen.has(email.toLowerCase())) continue;
    seen.add(email.toLowerCase());

    const qr = sentMap[email];
    const crmMember = allMembers.find(m => (m.email || '').toLowerCase() === email.toLowerCase());
    const name = qr.name || (crmMember ? crmMember.displayName : email);

    recipients.push({
      name: name,
      email: email,
      firstName: (name || '').split(' ')[0] || 'Member',
      adults: 1,
      kids: 0,
    });
  }

  // Split into attended vs missed
  const noShowSet = new Set(NO_SHOW_EMAILS.map(e => e.toLowerCase().trim()));
  const attended = recipients.filter(r => !noShowSet.has(r.email.toLowerCase()));
  const missed = recipients.filter(r => noShowSet.has(r.email.toLowerCase()));

  return { attended, missed, total: recipients.length, allMembers };
}

// ═══════════════════════════════════════════════════════════════════
// AGGREGATE PIPELINE DATA — Cross-reference payments & attendance
// ═══════════════════════════════════════════════════════════════════

function httpsGet(url) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const req = https.request({ hostname: u.hostname, port: 443, path: u.pathname + u.search, method: 'GET',
      headers: { 'Accept': 'application/json' }, timeout: 15000 }, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); } catch { resolve(null); }
      });
    });
    req.on('error', () => resolve(null));
    req.on('timeout', () => { req.destroy(); resolve(null); });
    req.end();
  });
}

/**
 * Load aggregate data from multiple pipelines:
 * 1. Payment data from email reader state + ledger
 * 2. Server-side attendance records (replaces localStorage)
 * 3. CRM payment records for each member
 *
 * Returns enriched per-member data with unacknowledged payments
 */
async function loadAggregateData(allMembers) {
  console.log('\n  📊 Loading aggregate pipeline data...');

  const aggregateMap = {}; // email → { payments[], paymentAcknowledged, serverAttended, ... }

  // ── Source 1: Email Reader Agent state (payment detections) ──
  const readerStatePath = path.join(__dirname, 'bosonto-reader-agent-state.json');
  let readerPayments = [];
  try {
    if (fs.existsSync(readerStatePath)) {
      const state = JSON.parse(fs.readFileSync(readerStatePath, 'utf8'));
      readerPayments = state.newPayments || [];
      console.log(`    Email reader: ${readerPayments.length} detected payments`);
    }
  } catch { console.log('    Email reader state: not available'); }

  // ── Source 2: Account Ledger (classified payments) ──
  const ledgerPath = path.join(__dirname, 'banf-ledger.json');
  let ledgerEntries = [];
  try {
    if (fs.existsSync(ledgerPath)) {
      const ledger = JSON.parse(fs.readFileSync(ledgerPath, 'utf8'));
      ledgerEntries = (ledger.entries || []).filter(e => e.type === 'income');
      console.log(`    Ledger: ${ledgerEntries.length} income entries`);
    }
  } catch { console.log('    Ledger: not available'); }

  // ── Source 3: Server-side attendance (try API first) ──
  let serverAttendance = [];
  try {
    const resp = await httpsGet('https://www.jaxbengali.org/_functions/admin_attendance?event=Bosonto+Utsob+2026');
    if (resp && resp.success && resp.records) {
      serverAttendance = resp.records;
      console.log(`    Server attendance: ${serverAttendance.length} records`);
    }
  } catch { console.log('    Server attendance: not available'); }

  // ── Build aggregate per member ──
  for (const m of (allMembers || [])) {
    const email = (m.email || '').toLowerCase();
    if (!email) continue;

    const agg = {
      email,
      name: m.displayName || `${m.firstName || ''} ${m.lastName || ''}`.trim(),

      // Payment data from multiple sources
      readerPayments: readerPayments.filter(p =>
        (p.payerEmail || '').toLowerCase() === email ||
        (p.email || '').toLowerCase() === email
      ),
      ledgerPayments: ledgerEntries.filter(e =>
        (e.memberEmail || '').toLowerCase() === email ||
        (e.payerEmail || '').toLowerCase() === email
      ),
      crmPayments: m.paymentRecords || [],

      // Server attendance
      serverAttended: serverAttendance.some(a =>
        (a.email || '').toLowerCase() === email && a.approved
      ),

      // Payment analysis
      totalPaid: 0,
      paymentAcknowledged: false,
      unacknowledgedAmount: 0,
      paymentPurpose: null,
      paymentNote: null
    };

    // Calculate total paid from all sources (dedup by amount+date)
    const seenAmounts = new Set();
    for (const p of [...agg.readerPayments, ...agg.ledgerPayments]) {
      const key = `${p.amount}|${(p.date || '').slice(0, 10)}`;
      if (!seenAmounts.has(key)) {
        seenAmounts.add(key);
        agg.totalPaid += (p.amount || 0);
      }
    }

    // Check if payment was acknowledged
    const acked = agg.ledgerPayments.some(e => e.acknowledged || e.acknowledgmentSent);
    const sentEmails = agg.readerPayments.filter(p => p.status === 'sent');
    agg.paymentAcknowledged = acked || sentEmails.length > 0;

    if (agg.totalPaid > 0 && !agg.paymentAcknowledged) {
      agg.unacknowledgedAmount = agg.totalPaid;
      // Classify payment purpose if engine available
      if (classifyPayment && agg.readerPayments.length > 0) {
        const lastPayment = agg.readerPayments[agg.readerPayments.length - 1];
        const classification = classifyPayment(lastPayment, m, {
          membershipDriveActive: true,
          upcomingEvent: 'Anandabazar March 14, 2026'
        });
        agg.paymentPurpose = classification.purpose;
        agg.paymentNote = generatePaymentAcknowledgment(classification);
      }
    }

    aggregateMap[email] = agg;
  }

  // Summary
  const withPayments = Object.values(aggregateMap).filter(a => a.totalPaid > 0);
  const unacked = Object.values(aggregateMap).filter(a => a.unacknowledgedAmount > 0);
  console.log(`    Aggregate: ${withPayments.length} members with payments, ${unacked.length} unacknowledged`);

  return aggregateMap;
}

// ═══════════════════════════════════════════════════════════════════
// EMAIL TEMPLATES
// ═══════════════════════════════════════════════════════════════════

function buildThankYouEmail(recipient, aggregateData) {
  const firstName = recipient.firstName;
  const sentDate = new Date().toLocaleDateString('en-US', {
    timeZone: 'America/New_York', weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });

  // ── Aggregate: Payment acknowledgment section ──
  const agg = aggregateData || {};
  let paymentSection = '';
  if (agg.unacknowledgedAmount > 0) {
    const purpose = (agg.paymentPurpose || 'membership').replace(/_/g, ' ');
    paymentSection = `
    <!-- Payment Acknowledgment (Auto-aggregated) -->
    <div style="background:linear-gradient(135deg,#f3e5f5,#ede7f6);border:2px solid #9c27b0;border-radius:12px;padding:20px;margin:20px 0">
      <p style="font-size:.92rem;color:#4a148c;line-height:1.75;margin:0 0 12px">
        <strong>💜 Payment Received — Thank You!</strong>
      </p>
      <p style="font-size:.9rem;color:#4a148c;line-height:1.75;margin:0">
        We also want to <strong>acknowledge your payment of $${agg.unacknowledgedAmount}</strong>
        for <strong>${purpose}</strong>.
        We sincerely appreciate your generosity and financial support for BANF.
        ${agg.paymentNote ? '<br><span style="font-size:.82rem;color:#6a1b9a">' + agg.paymentNote + '</span>' : ''}
      </p>
    </div>
    `;
  }

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Thank You — Bosonto Utsob 2026</title></head>
<body style="margin:0;padding:0;background:#f5f7fa;font-family:'Segoe UI',Arial,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f7fa;padding:30px 0">
<tr><td align="center">
<table width="620" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.1)">

  <!-- Header -->
  <tr><td style="background:linear-gradient(135deg,#006A4E,#2E8B57);padding:32px 40px;text-align:center">
    <h1 style="color:#fff;margin:0;font-size:1.5rem;font-weight:700">ধন্যবাদ / Thank You!</h1>
    <p style="color:rgba(255,255,255,.9);margin:10px 0 0;font-size:1rem;letter-spacing:.3px">
      Bosonto Utsob 2026 — A Heartfelt Note
    </p>
  </td></tr>

  <!-- Body -->
  <tr><td style="padding:36px 40px 16px">

    <p style="font-size:1rem;color:#333;line-height:1.7;margin:0 0 16px">
      Dear ${firstName},
    </p>

    <p style="font-size:.95rem;color:#444;line-height:1.75;margin:0 0 16px">
      On behalf of the entire Executive Committee of the <strong>Bengali Association of North Florida (BANF)</strong>,
      we want to sincerely <strong>thank you</strong> for attending <strong>Bosonto Utsob 2026</strong> on ${CONFIG.EVENT_DATE}.
    </p>

    <!-- Apology Box -->
    <div style="background:#fff8e1;border:1px solid #ffecb3;border-radius:12px;padding:20px;margin:20px 0">
      <p style="font-size:.92rem;color:#5d4037;line-height:1.75;margin:0 0 12px">
        <strong>🙏 Sincere Apologies</strong>
      </p>
      <p style="font-size:.9rem;color:#5d4037;line-height:1.75;margin:0 0 10px">
        We sincerely apologise for the <strong>last-moment venue change</strong> and the inconvenience it caused.
        We understand this was unexpected and may have disrupted your plans. We take full responsibility and deeply regret the confusion.
      </p>
      <p style="font-size:.9rem;color:#5d4037;line-height:1.75;margin:0">
        We also want to express our regret that we <strong>could not celebrate Holi</strong> as originally planned, 
        due to the change in venue. Playing Holi together has always been a cherished highlight of Bosonto,
        and we are truly sorry that this year's celebration missed that joyful tradition.
      </p>
    </div>

    <!-- Thank You Box -->
    <div style="background:linear-gradient(135deg,#e8f5e9,#f1f8e9);border:2px solid #4caf50;border-radius:12px;padding:20px;margin:20px 0">
      <p style="font-size:.92rem;color:#2e7d32;line-height:1.75;margin:0 0 12px">
        <strong>💚 Your Spirit Made the Difference</strong>
      </p>
      <p style="font-size:.9rem;color:#33691e;line-height:1.75;margin:0">
        Despite the challenges, we were deeply moved by your <strong>cooperation, warmth, and positive spirit</strong>.
        Seeing the <strong>smiles and enjoyment on your faces</strong> — especially under the circumstances — 
        gave us immense motivation and strength. Your grace and understanding will drive us to do better,
        and we are committed to correcting and improving things going forward.
      </p>
    </div>

    <p style="font-size:.95rem;color:#444;line-height:1.75;margin:16px 0">
      Your continued support is what makes BANF a true community. Thank you for standing with us.
    </p>

    ${paymentSection}

    <!-- Next Event Box -->
    <div style="background:#e3f2fd;border:1px solid #bbdefb;border-radius:12px;padding:20px;margin:20px 0">
      <p style="font-size:.92rem;color:#1565c0;line-height:1.75;margin:0 0 8px">
        <strong>📅 Coming Up Next — ${CONFIG.NEXT_EVENT}</strong>
      </p>
      <p style="font-size:.9rem;color:#1976d2;line-height:1.75;margin:0">
        We look forward to seeing you at <strong>${CONFIG.NEXT_EVENT}</strong> on <strong>${CONFIG.NEXT_EVENT_DATE}</strong>!
        More details will follow soon. Let's make this one even more special together.
      </p>
    </div>

    <p style="font-size:.95rem;color:#444;line-height:1.75;margin:16px 0 4px">
      With heartfelt gratitude,
    </p>
    <p style="font-size:.95rem;color:#333;line-height:1.6;margin:0 0 4px">
      <strong>The BANF Executive Committee</strong><br>
      <span style="font-size:.85rem;color:#666">Bengali Association of North Florida</span>
    </p>

  </td></tr>

  <!-- Privacy Notice -->
  <tr><td style="background:#f0f4f8;border-top:1px solid #dde3ea;padding:18px 40px">
    <p style="margin:0;font-size:.78rem;color:#888;line-height:1.7">
      🔒 This email was sent to BANF community members who attended Bosonto Utsob 2026. 
      Your information is used solely for BANF community communications. 
      You may <a href="mailto:banfjax@gmail.com?subject=Unsubscribe" style="color:#006A4E">unsubscribe</a> or request data erasure at any time.
    </p>
  </td></tr>

  <!-- Footer -->
  <tr><td style="background:#f9f9f9;border-top:1px solid #eee;padding:14px 40px;text-align:center">
    <p style="margin:0 0 4px;font-size:.75rem;color:#999">
      <a href="mailto:banfjax@gmail.com?subject=Unsubscribe" style="color:#006A4E;text-decoration:underline">Unsubscribe</a>
       &nbsp;|&nbsp; Sent on ${sentDate}
    </p>
    <p style="margin:0;font-size:.73rem;color:#bbb">&copy; 2026 Bengali Association of North Florida (BANF). All rights reserved.</p>
    <p style="margin:4px 0 0;font-size:.7rem;color:#ccc">jaxbengali.org &nbsp;|&nbsp; banfjax@gmail.com &nbsp;|&nbsp; Jacksonville, FL</p>
  </td></tr>

</table></td></tr></table></body></html>`;
}


function buildMissedEmail(recipient) {
  const firstName = recipient.firstName;
  const sentDate = new Date().toLocaleDateString('en-US', {
    timeZone: 'America/New_York', weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>We Missed You — Bosonto Utsob 2026</title></head>
<body style="margin:0;padding:0;background:#f5f7fa;font-family:'Segoe UI',Arial,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f7fa;padding:30px 0">
<tr><td align="center">
<table width="620" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.1)">

  <!-- Header -->
  <tr><td style="background:linear-gradient(135deg,#5c6bc0,#7986cb);padding:32px 40px;text-align:center">
    <h1 style="color:#fff;margin:0;font-size:1.5rem;font-weight:700">আমরা আপনাকে মিস করেছি / We Missed You</h1>
    <p style="color:rgba(255,255,255,.9);margin:10px 0 0;font-size:1rem;letter-spacing:.3px">
      Bosonto Utsob 2026 — A Note from BANF
    </p>
  </td></tr>

  <!-- Body -->
  <tr><td style="padding:36px 40px 16px">

    <p style="font-size:1rem;color:#333;line-height:1.7;margin:0 0 16px">
      Dear ${firstName},
    </p>

    <p style="font-size:.95rem;color:#444;line-height:1.75;margin:0 0 16px">
      On behalf of the <strong>Bengali Association of North Florida (BANF)</strong> Executive Committee,
      we wanted to reach out regarding <strong>Bosonto Utsob 2026</strong> held on ${CONFIG.EVENT_DATE}.
    </p>

    <p style="font-size:.95rem;color:#444;line-height:1.75;margin:0 0 16px">
      We noticed that you were unable to join us, and we completely <strong>understand</strong>.
      We know that circumstances arise and things don't always go as planned — and that's perfectly okay.
    </p>

    <!-- Apology Box -->
    <div style="background:#fff8e1;border:1px solid #ffecb3;border-radius:12px;padding:20px;margin:20px 0">
      <p style="font-size:.92rem;color:#5d4037;line-height:1.75;margin:0 0 12px">
        <strong>🙏 Our Sincere Apologies</strong>
      </p>
      <p style="font-size:.9rem;color:#5d4037;line-height:1.75;margin:0 0 10px">
        We want to sincerely apologise for the <strong>last-moment venue change</strong> that happened. 
        We understand this may have been a contributing factor, and we take full responsibility for the 
        inconvenience and confusion it caused. This should not have happened, and we deeply regret it.
      </p>
      <p style="font-size:.9rem;color:#5d4037;line-height:1.75;margin:0">
        The venue change also meant we <strong>could not celebrate Holi</strong> as originally planned,
        which was a disappointment for everyone. We are truly sorry for this missed tradition.
      </p>
    </div>

    <!-- Commitment Box -->
    <div style="background:linear-gradient(135deg,#e8eaf6,#ede7f6);border:2px solid #7986cb;border-radius:12px;padding:20px;margin:20px 0">
      <p style="font-size:.92rem;color:#283593;line-height:1.75;margin:0 0 12px">
        <strong>🤝 Our Commitment to You</strong>
      </p>
      <p style="font-size:.9rem;color:#303f9f;line-height:1.75;margin:0">
        We are committed to <strong>rectifying these issues going forward</strong>. Your trust in our community
        matters deeply to us. We will work harder to ensure future events run smoothly, with better planning,
        timely communication, and no last-minute surprises. You deserve better, and we will deliver.
      </p>
    </div>

    <!-- Next Event Box -->
    <div style="background:#e3f2fd;border:1px solid #bbdefb;border-radius:12px;padding:20px;margin:20px 0">
      <p style="font-size:.92rem;color:#1565c0;line-height:1.75;margin:0 0 8px">
        <strong>📅 Coming Up Next — ${CONFIG.NEXT_EVENT}</strong>
      </p>
      <p style="font-size:.9rem;color:#1976d2;line-height:1.75;margin:0">
        We would love to see you at <strong>${CONFIG.NEXT_EVENT}</strong> on <strong>${CONFIG.NEXT_EVENT_DATE}</strong>!
        More details will follow soon. Let's start fresh and make this one a wonderful experience together.
      </p>
    </div>

    <p style="font-size:.95rem;color:#444;line-height:1.75;margin:16px 0 4px">
      Warmly,
    </p>
    <p style="font-size:.95rem;color:#333;line-height:1.6;margin:0 0 4px">
      <strong>The BANF Executive Committee</strong><br>
      <span style="font-size:.85rem;color:#666">Bengali Association of North Florida</span>
    </p>

  </td></tr>

  <!-- Privacy Notice -->
  <tr><td style="background:#f0f4f8;border-top:1px solid #dde3ea;padding:18px 40px">
    <p style="margin:0;font-size:.78rem;color:#888;line-height:1.7">
      🔒 This email was sent to BANF community members who were registered for Bosonto Utsob 2026. 
      Your information is used solely for BANF community communications. 
      You may <a href="mailto:banfjax@gmail.com?subject=Unsubscribe" style="color:#5c6bc0">unsubscribe</a> or request data erasure at any time.
    </p>
  </td></tr>

  <!-- Footer -->
  <tr><td style="background:#f9f9f9;border-top:1px solid #eee;padding:14px 40px;text-align:center">
    <p style="margin:0 0 4px;font-size:.75rem;color:#999">
      <a href="mailto:banfjax@gmail.com?subject=Unsubscribe" style="color:#5c6bc0;text-decoration:underline">Unsubscribe</a>
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

// ═══════════════════════════════════════════════════════════════════
// SEND ENGINE
// ═══════════════════════════════════════════════════════════════════

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function sendBatch(transporter, recipients, type, aggregateMap) {
  const results = [];
  const total = recipients.length;
  const subject = type === 'thankyou'
    ? `ধন্যবাদ — Thank You for Attending Bosonto Utsob 2026!`
    : `We Missed You at Bosonto Utsob 2026 — A Note from BANF`;

  console.log(`\n  📧 Sending ${total} "${type}" emails in batches of ${CONFIG.BATCH_SIZE}...\n`);

  for (let i = 0; i < total; i += CONFIG.BATCH_SIZE) {
    const batch = recipients.slice(i, i + CONFIG.BATCH_SIZE);
    const batchNum = Math.floor(i / CONFIG.BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(total / CONFIG.BATCH_SIZE);

    console.log(`  ── Batch ${batchNum}/${totalBatches} (${batch.length} emails) ──`);

    for (const r of batch) {
      // Get aggregate data for this recipient
      const agg = (aggregateMap || {})[r.email.toLowerCase()] || {};
      const html = type === 'thankyou' ? buildThankYouEmail(r, agg) : buildMissedEmail(r);

      if (agg.unacknowledgedAmount > 0 && type === 'thankyou') {
        console.log(`    💰 [AGG] $${agg.unacknowledgedAmount} unacknowledged payment → including in email`);
      }

      if (DRY_RUN) {
        console.log(`    ✉️  [DRY RUN] → ${r.name} <${r.email}>`);
        results.push({ email: r.email, name: r.name, type, status: 'dry-run' });
        continue;
      }

      try {
        const info = await transporter.sendMail({
          from: `"${CONFIG.BANF_NAME}" <${CONFIG.BANF_EMAIL}>`,
          to: `"${r.name}" <${r.email}>`,
          subject: subject,
          html: html,
        });

        console.log(`    ✅ Sent → ${r.name} <${r.email}> (${info.messageId})`);
        results.push({ email: r.email, name: r.name, type, status: 'sent', messageId: info.messageId });
      } catch (err) {
        console.error(`    ❌ FAILED → ${r.name} <${r.email}>: ${err.message}`);
        results.push({ email: r.email, name: r.name, type, status: 'failed', error: err.message });
      }
    }

    // Delay between batches (not after last batch)
    if (i + CONFIG.BATCH_SIZE < total) {
      console.log(`    ⏳ Waiting ${CONFIG.BATCH_DELAY_MS / 1000}s before next batch...`);
      await sleep(CONFIG.BATCH_DELAY_MS);
    }
  }

  return results;
}

// ═══════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════

async function main() {
  console.log('');
  console.log('  ═══════════════════════════════════════════════════════');
  console.log('   BANF Bosonto Utsob 2026 — Post-Event Email Agent');
  console.log('  ═══════════════════════════════════════════════════════');
  console.log('');
  console.log(`  Mode: ${DRY_RUN ? '🔍 DRY RUN' : DO_SEND ? '📨 LIVE SEND' : '📋 LIST'}`);

  // Load data
  const { attended, missed, total, allMembers } = loadRecipients();

  console.log(`\n  📊 Recipient Breakdown:`);
  console.log(`     Total RSVP'd:     ${total}`);
  console.log(`     ✅ Attended:       ${attended.length}`);
  console.log(`     ❌ Did not attend: ${missed.length}`);

  // ── Load aggregate pipeline data ──
  let aggregateMap = {};
  try {
    aggregateMap = await loadAggregateData(allMembers);
    const withUnacked = Object.values(aggregateMap).filter(a => a.unacknowledgedAmount > 0);
    if (withUnacked.length > 0) {
      console.log(`\n  💰 Aggregate: ${withUnacked.length} members have unacknowledged payments — will include in thank-you emails`);
    }
  } catch (e) {
    console.log(`\n  ⚠️  Aggregate data unavailable: ${e.message} — sending without payment context`);
  }

  if (NO_SHOW_EMAILS.length === 0) {
    console.log(`\n  ⚠️  NO-SHOW LIST IS EMPTY — all ${total} members will receive the THANK-YOU email.`);
    console.log(`     To split the list, update NO_SHOW_EMAILS in this file.`);
  }

  if (LIST_ONLY) {
    console.log(`\n  ── ATTENDED (${attended.length}) ──`);
    attended.forEach((r, i) => console.log(`    ${i + 1}. ${r.name} <${r.email}>`));
    if (missed.length > 0) {
      console.log(`\n  ── DID NOT ATTEND (${missed.length}) ──`);
      missed.forEach((r, i) => console.log(`    ${i + 1}. ${r.name} <${r.email}>`));
    }
    return;
  }

  // Create transporter
  let transporter = null;
  if (DO_SEND) {
    console.log('\n  🔑 Creating Gmail OAuth2 transporter...');
    transporter = await createTransporter();
    console.log('  ✅ Transporter verified.');
  }

  const allResults = [];

  // Send thank-you emails
  if (!ONLY_MISSED && attended.length > 0) {
    const results = await sendBatch(transporter, attended, 'thankyou', aggregateMap);
    allResults.push(...results);
  }

  // Send understanding emails
  if (!ONLY_ATTENDED && missed.length > 0) {
    if (allResults.length > 0) {
      console.log(`\n  ⏳ Pausing between email types...`);
      await sleep(5000);
    }
    const results = await sendBatch(transporter, missed, 'missed', aggregateMap);
    allResults.push(...results);
  }

  // Summary
  const sent = allResults.filter(r => r.status === 'sent').length;
  const failed = allResults.filter(r => r.status === 'failed').length;
  const dryRun = allResults.filter(r => r.status === 'dry-run').length;

  console.log('\n  ═══════════════════════════════════════════════════════');
  console.log('   SUMMARY');
  console.log('  ═══════════════════════════════════════════════════════');
  console.log(`   Total emails:   ${allResults.length}`);
  if (DO_SEND) {
    console.log(`   ✅ Sent:         ${sent}`);
    console.log(`   ❌ Failed:       ${failed}`);
  }
  if (DRY_RUN) {
    console.log(`   🔍 Dry run:      ${dryRun}`);
  }
  console.log('  ═══════════════════════════════════════════════════════\n');

  // Save results
  const resultFile = path.join(__dirname, 'banf-post-event-email-results.json');
  fs.writeFileSync(resultFile, JSON.stringify({
    timestamp: new Date().toISOString(),
    mode: DRY_RUN ? 'dry-run' : 'live',
    totalRSVP: total,
    attended: attended.length,
    missed: missed.length,
    results: allResults
  }, null, 2));
  console.log(`  📄 Results saved to: ${resultFile}`);

  if (failed > 0) {
    console.log(`\n  ⚠️  ${failed} email(s) failed. Check results file for details.`);
  }
}

main().catch(err => {
  console.error('\n  ❌ Fatal error:', err.message);
  process.exit(1);
});
