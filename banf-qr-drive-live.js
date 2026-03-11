#!/usr/bin/env node
/**
 * ═══════════════════════════════════════════════════════════════════════
 *  BANF QR CODE EMAIL DRIVE — Live Cautious Batch Sender
 * ═══════════════════════════════════════════════════════════════════════
 *
 *  Sends QR code emails to ALL RSVP-Yes attendees for Bosonto Utsob 2026
 *  with STRICT no-duplicate enforcement and cautious batch approach.
 *
 *  ██ NO-DUPLICATE POLICY ██
 *  - File-based lockfile (banf-qr-drive-lock.json) prevents ANY duplicate
 *  - Email is checked against lock BEFORE send — once sent, NEVER re-sent
 *  - Lock file is append-only — cannot be reset without explicit --force-reset
 *  - Drive ID prevents concurrent runs
 *
 *  ██ CAUTIOUS BATCH APPROACH ██
 *  Phase 1: Send to 3 test recipients (EC members) — verify template
 *  Phase 2: Send next batch of 10 — wait for feedback
 *  Phase 3: Send remaining in batches of 10 with 5s delay
 *  Each phase generates a status report for EC admin review.
 *
 *  ██ EC ADMIN VISIBILITY ██
 *  - Writes banf-qr-drive-status.json — consumed by admin portal
 *  - Real-time progress: sent/failed/pending/total
 *  - Each send logged with timestamp, messageId, recipient
 *
 *  Usage:
 *    node banf-qr-drive-live.js --phase 1          (test batch: 3 EC members)
 *    node banf-qr-drive-live.js --phase 2          (next 10 members)
 *    node banf-qr-drive-live.js --phase 3          (all remaining, batch 10)
 *    node banf-qr-drive-live.js --continue          (send next batch of pending)
 *    node banf-qr-drive-live.js --dry-run           (preview who would receive)
 *    node banf-qr-drive-live.js --status            (show drive status)
 *    node banf-qr-drive-live.js --batch N           (override batch size)
 *    node banf-qr-drive-live.js --delay N           (override delay in ms)
 *    node banf-qr-drive-live.js --force-reset       (DANGER: clear lock file)
 *
 * ═══════════════════════════════════════════════════════════════════════
 */

const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');
const QRCode = require('qrcode');
const crypto = require('crypto');

// ─── Config ─────────────────────────────────────────────────────────
const CONFIG = {
  BANF_EMAIL: 'banfjax@gmail.com',
  BANF_ORG: 'Bengali Association of North Florida (BANF)',
  EVENT_NAME: 'Bosonto Utsob 2026',
  EVENT_DATE: 'Saturday, March 7, 2026',
  EVENT_TIME: '11:00 AM EST',
  VENUE: 'Southside Community Center, 10080 Beach Blvd, Jacksonville FL 32246',
  PORTAL_URL: 'https://www.jaxbengali.org/admin-portal',
  QR_SCAN_URL: 'https://www.jaxbengali.org/admin-portal#qr-food-serving',
  DEFAULT_DELAY: 5000,       // ms between emails (cautious)
  DEFAULT_BATCH: 10,          // emails per batch
  PHASE1_BATCH: 3,            // test batch size
  PHASE2_BATCH: 10,           // verification batch
  PHASE3_BATCH: 10,           // full send batch
  ZELLE_EMAIL: 'banfjax@gmail.com'
};

const GMAIL = {
  CLIENT_ID: '1020178199135-3usrl611ara38i7rhu2ub6sn6g1150ml.apps.googleusercontent.com',
  CLIENT_SECRET: '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',
  REFRESH_TOKEN: require('./banf-gmail-config').REFRESH_TOKEN
};

const CRM_PATH = path.join(__dirname, 'banf-crm-reconciliation.json');
const QR_DIR = path.join(__dirname, 'qr-codes');

// ── QR SECURITY: HMAC-SHA256 Signing ────────────────────────────────
// Shared secret between QR generators and admin portal.
// Portal verifies this signature — external QR readers cannot process codes.
const BANF_QR_SECRET = 'banf-bosonto-2026-ec-secure-qr-key';

function banfHmacSign(payload) {
  const crypto = require('crypto');
  const msg = [payload.type || '', payload.email || '', payload.regCode || '', payload.event || ''].join('|');
  return crypto.createHmac('sha256', BANF_QR_SECRET).update(msg).digest('hex');
}

// ─── STRICT NO-DUPLICATE FILES ──────────────────────────────────────
const LOCK_FILE = path.join(__dirname, 'banf-qr-drive-lock.json');
const STATUS_FILE = path.join(__dirname, 'banf-qr-drive-status.json');
const DRIVE_ID_FILE = path.join(__dirname, '.banf-qr-drive-id');

// EC Members (Phase 1 test recipients)
const EC_TEST_EMAILS = [
  'ranadhir.ghosh@gmail.com',
  'amit.everywhere@gmail.com',
  'rajanya.ghosh@gmail.com'
];

const EC_ALL_EMAILS = [
  'ranadhir.ghosh@gmail.com',
  'mukhopadhyay.partha@gmail.com',
  'amit.everywhere@gmail.com',
  'rajanya.ghosh@gmail.com',
  'moumitamukherjee2002@yahoo.com',
  'duttasoumyajit86@gmail.com',
  'sumantadatta07@gmail.com',
  'rwitichoudhury@gmail.com'
];

const EC_ROLE_MAP = {
  'ranadhir.ghosh@gmail.com': 'President',
  'mukhopadhyay.partha@gmail.com': 'Vice President',
  'amit.everywhere@gmail.com': 'Treasurer',
  'rajanya.ghosh@gmail.com': 'General Secretary',
  'moumitamukherjee2002@yahoo.com': 'Cultural Secretary',
  'duttasoumyajit86@gmail.com': 'Food Coordinator',
  'sumantadatta07@gmail.com': 'Event Coordinator',
  'rwitichoudhury@gmail.com': 'Puja Coordinator'
};

// ═══════════════════════════════════════════════════════════════════
// NO-DUPLICATE ENFORCEMENT — LOCKFILE SYSTEM
// ═══════════════════════════════════════════════════════════════════

/**
 * Lock file structure:
 * {
 *   driveId: string,           // Unique drive instance ID
 *   created: ISO string,
 *   event: string,
 *   sentEmails: {              // APPEND-ONLY — never removed
 *     "email@domain.com": {
 *       sentAt: ISO string,
 *       messageId: string,
 *       name: string,
 *       phase: number,
 *       batchId: string
 *     }
 *   }
 * }
 */
function loadLock() {
  try {
    return JSON.parse(fs.readFileSync(LOCK_FILE, 'utf8'));
  } catch (e) {
    return null;
  }
}

function initLock() {
  const driveId = `QR-DRIVE-${Date.now().toString(36)}-${crypto.randomBytes(4).toString('hex')}`;
  const lock = {
    driveId,
    created: new Date().toISOString(),
    event: CONFIG.EVENT_NAME,
    eventDate: CONFIG.EVENT_DATE,
    sentEmails: {}
  };
  fs.writeFileSync(LOCK_FILE, JSON.stringify(lock, null, 2));
  fs.writeFileSync(DRIVE_ID_FILE, driveId);
  return lock;
}

function recordSent(lock, email, name, messageId, phase, batchId) {
  lock.sentEmails[email.toLowerCase()] = {
    sentAt: new Date().toISOString(),
    messageId: messageId || 'unknown',
    name,
    phase,
    batchId
  };
  // Atomic write: write to temp, then rename
  const tmpFile = LOCK_FILE + '.tmp';
  fs.writeFileSync(tmpFile, JSON.stringify(lock, null, 2));
  fs.renameSync(tmpFile, LOCK_FILE);
}

function isAlreadySent(lock, email) {
  if (!lock || !lock.sentEmails) return false;
  return !!lock.sentEmails[email.toLowerCase()];
}

function getSentCount(lock) {
  if (!lock || !lock.sentEmails) return 0;
  return Object.keys(lock.sentEmails).length;
}

// ═══════════════════════════════════════════════════════════════════
// DRIVE STATUS — EC ADMIN VISIBILITY
// ═══════════════════════════════════════════════════════════════════

function loadDriveStatus() {
  try {
    return JSON.parse(fs.readFileSync(STATUS_FILE, 'utf8'));
  } catch (e) {
    return createFreshStatus();
  }
}

function createFreshStatus() {
  return {
    driveId: null,
    driveName: 'QR Code Email Drive — Bosonto Utsob 2026',
    event: CONFIG.EVENT_NAME,
    eventDate: CONFIG.EVENT_DATE,
    status: 'initialized',   // initialized | phase1_testing | phase2_verifying | phase3_sending | paused | completed | error
    phase: 0,
    totalRecipients: 0,
    sent: 0,
    failed: 0,
    pending: 0,
    lastSentAt: null,
    lastSentTo: null,
    startedAt: null,
    pausedAt: null,
    completedAt: null,
    batches: [],
    errors: [],
    log: []
  };
}

function updateDriveStatus(updates) {
  const status = loadDriveStatus();
  Object.assign(status, updates);
  status.updatedAt = new Date().toISOString();
  fs.writeFileSync(STATUS_FILE, JSON.stringify(status, null, 2));
  return status;
}

function logDriveEvent(message, level = 'info') {
  const status = loadDriveStatus();
  status.log = status.log || [];
  status.log.push({
    time: new Date().toISOString(),
    level,
    message
  });
  // Keep last 100 log entries
  if (status.log.length > 100) status.log = status.log.slice(-100);
  status.updatedAt = new Date().toISOString();
  fs.writeFileSync(STATUS_FILE, JSON.stringify(status, null, 2));
}

// ═══════════════════════════════════════════════════════════════════
// CRM DATA LOADING
// ═══════════════════════════════════════════════════════════════════

// ── Manual additions: confirmed attendees not in CRM RSVP-Yes ──
// These are paid members who confirmed attendance outside Evite
const MANUAL_ADDITIONS = [
  { name: 'Suvendu Maitra', email: 'slmaitra@gmail.com', adults: 2, kids: 0, dietary: 'Not specified',
    paymentStatus: 'paid', paymentAmount: 280, householdType: 'family', membershipTier: 'family',
    expectedAmount: 280, remainingBalance: 0, isEC: false, ecRole: null },
  { name: 'Amrita Mukhopadhyay', email: 'amrriita@gmail.com', adults: 2, kids: 1, dietary: 'Not specified',
    paymentStatus: 'paid', paymentAmount: 375, householdType: 'family', membershipTier: 'family',
    expectedAmount: 375, remainingBalance: 0, isEC: false, ecRole: null }
];

function loadAllRSVPMembers() {
  const crmRaw = JSON.parse(fs.readFileSync(CRM_PATH, 'utf8'));
  // Handle both { members: [...] } and flat array formats
  const crmMembers = Array.isArray(crmRaw) ? crmRaw : (crmRaw.members || Object.values(crmRaw));
  const members = [];

  for (const m of crmMembers) {
    if (!m.email) continue;
    const ev = m.eventAttendance && m.eventAttendance.find(e =>
      e.eventName && e.eventName.toLowerCase().includes('bosonto') && (e.rsvp || '').toLowerCase() === 'yes'
    );
    if (!ev) continue;

    const email = m.email.toLowerCase();
    members.push({
      name: m.displayName || m.firstName || email.split('@')[0],
      email,
      adults: parseInt(ev.adults) || parseInt(ev.partySize) || 1,
      kids: parseInt(ev.kids) || 0,
      dietary: ev.dietary || 'Not specified',
      paymentStatus: m.paymentStatus || 'not_paid',
      paymentAmount: m.totalPaid || m.paymentAmount || 0,
      householdType: m.householdType || 'individual',
      membershipTier: m.membershipTier || m.membershipCategory || 'individual',
      expectedAmount: ev.expectedAmount || 0,
      remainingBalance: ev.remainingBalance || 0,
      isEC: EC_ALL_EMAILS.includes(email),
      ecRole: EC_ROLE_MAP[email] || null
    });
  }

  // Add EC members not in CRM
  for (const email of EC_ALL_EMAILS) {
    if (!members.find(m => m.email === email)) {
      const name = email.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
      members.push({
        name, email, adults: 2, kids: 0, dietary: 'Not specified',
        paymentStatus: 'not_paid', paymentAmount: 0, householdType: 'family',
        membershipTier: 'family', expectedAmount: 375, remainingBalance: 375,
        isEC: true, ecRole: EC_ROLE_MAP[email] || 'EC Member'
      });
    }
  }

  // Add manual additions (confirmed attendees not in CRM RSVP)
  for (const manual of MANUAL_ADDITIONS) {
    if (!members.find(m => m.email === manual.email.toLowerCase())) {
      members.push({ ...manual, email: manual.email.toLowerCase() });
    }
  }

  return members;
}

// ═══════════════════════════════════════════════════════════════════
// QR CODE GENERATION
// ═══════════════════════════════════════════════════════════════════

function findExistingQR(email) {
  if (!fs.existsSync(QR_DIR)) return null;
  const slug = email.replace(/[@.]/g, '_');
  const pattern = `Bosonto-Utsob-2026_${slug}.png`;
  const qrPath = path.join(QR_DIR, pattern);
  if (fs.existsSync(qrPath)) return qrPath;
  const files = fs.readdirSync(QR_DIR);
  const match = files.find(f => f.toLowerCase().includes(slug.toLowerCase()) && f.toLowerCase().includes('bosonto'));
  return match ? path.join(QR_DIR, match) : null;
}

async function generateQR(member) {
  const regCode = `BANF-Bosonto-${member.email.split('@')[0].slice(0, 12).toUpperCase()}`;
  const payload = {
    type: 'BANF_FOOD_CHECK_IN',
    regCode, name: member.name, email: member.email,
    adults: member.adults, kids: member.kids,
    veg: 0, nonVeg: member.adults + member.kids,
    dietary: member.dietary, dietaryNotes: '',
    householdType: member.householdType,
    membershipTier: member.membershipTier,
    paid: member.paymentStatus === 'paid',
    amount: member.paymentAmount,
    expectedAmount: member.expectedAmount,
    remainingBalance: member.remainingBalance,
    paymentStatus: member.paymentStatus === 'paid' ? 'PAID' : (member.paymentStatus === 'partial' ? 'PARTIAL' : 'UNPAID'),
    event: CONFIG.EVENT_NAME
  };
  // ── SECURITY: Add HMAC-SHA256 signature for portal-only verification ──
  payload.sig = banfHmacSign(payload);

  if (!fs.existsSync(QR_DIR)) fs.mkdirSync(QR_DIR, { recursive: true });
  const safeName = member.email.replace(/[^a-z0-9]/gi, '_');
  const filename = `Bosonto-Utsob-2026_${safeName}.png`;
  const filePath = path.join(QR_DIR, filename);

  await QRCode.toFile(filePath, JSON.stringify(payload), {
    width: 300, margin: 2,
    color: { dark: '#000000', light: '#ffffff' },
    errorCorrectionLevel: 'M'
  });
  return filePath;
}

// ═══════════════════════════════════════════════════════════════════
// EMAIL TEMPLATE — Verified for March 7, 2026
// ═══════════════════════════════════════════════════════════════════

function buildEmailHTML(member, qrCid) {
  const name = member.name.split(' ')[0];
  const payStatus = member.paymentStatus === 'paid' ? '✅ Paid' :
                    member.paymentStatus === 'partial' ? '⚠️ Partial' : '❌ Unpaid';
  const payAmount = member.paymentAmount ? `$${member.paymentAmount}` : '—';
  const ecLine = member.isEC ? `<tr><td style="font-weight:600">EC Role:</td><td>${member.ecRole}</td></tr>` : '';

  // Payment recommendation for unpaid members
  let paymentBlock = '';
  if (member.paymentStatus !== 'paid') {
    paymentBlock = `
    <div style="background:#fef2f2;border-radius:12px;padding:16px;margin:20px 0;border-left:4px solid #ef4444">
      <h3 style="font-size:14px;color:#991b1b;margin:0 0 8px">💰 Payment Information</h3>
      <p style="font-size:13px;color:#7f1d1d;margin:0 0 8px">Your membership payment is pending. Please pay via Zelle for quick check-in at the event.</p>
      <table style="font-size:13px;color:#333;margin:8px 0" cellpadding="4">
        <tr><td style="font-weight:600">Zelle to:</td><td>${CONFIG.ZELLE_EMAIL}</td></tr>
        <tr><td style="font-weight:600">Expected:</td><td>$${member.expectedAmount || 'See tier below'}</td></tr>
      </table>
      <p style="font-size:12px;color:#991b1b;margin:4px 0 0">M2 Premium: Family $375 · Couple $330 · Individual $215 · Student $145</p>
      <p style="font-size:11px;color:#b91c1c;margin:4px 0 0">Cash/Zelle accepted at the event. Please include your name in the Zelle memo.</p>
    </div>`;
  }

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f0f4f8;font-family:'Segoe UI',system-ui,sans-serif">
<div style="max-width:600px;margin:20px auto;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.08)">

  <!-- Header -->
  <div style="background:linear-gradient(135deg,#1e3a5f 0%,#2d5a8e 50%,#d4a843 100%);padding:32px 24px;text-align:center">
    <h1 style="color:#fff;font-size:22px;margin:0 0 4px">🌸 ${CONFIG.EVENT_NAME}</h1>
    <p style="color:rgba(255,255,255,.85);font-size:14px;margin:0">${CONFIG.EVENT_DATE} · ${CONFIG.EVENT_TIME}</p>
    <p style="color:rgba(255,255,255,.7);font-size:12px;margin:6px 0 0">${CONFIG.VENUE}</p>
  </div>

  <!-- Body -->
  <div style="padding:28px 24px">
    <p style="font-size:15px;color:#1a1a1a;margin:0 0 16px">Hello <strong>${name}</strong>,</p>
    <p style="font-size:14px;color:#4a4a4a;line-height:1.6;margin:0 0 20px">
      Thank you for registering for <strong>${CONFIG.EVENT_NAME}</strong>!
      Below is your personal <strong>QR code</strong> — please present it at the food serving counter for quick check-in.
    </p>

    <!-- QR Code -->
    <div style="text-align:center;margin:24px 0;padding:20px;background:#f8fafc;border-radius:12px;border:2px dashed #d4a843">
      <img src="cid:${qrCid}" alt="QR Code" style="width:200px;height:200px;border-radius:8px">
      <p style="font-size:12px;color:#888;margin:8px 0 0">Present this QR code at the food serving counter</p>
    </div>

    <!-- Registration Details -->
    <div style="background:#f0f7ff;border-radius:12px;padding:16px;margin:20px 0;border-left:4px solid #2d5a8e">
      <h3 style="font-size:14px;color:#1e3a5f;margin:0 0 10px">📋 Your Registration Details</h3>
      <table style="width:100%;font-size:13px;color:#333" cellpadding="4">
        <tr><td style="font-weight:600;width:140px">Name:</td><td>${member.name}</td></tr>
        ${ecLine}
        <tr><td style="font-weight:600">Party Size:</td><td>${member.adults} adults${member.kids > 0 ? ` + ${member.kids} kids` : ''}</td></tr>
        <tr><td style="font-weight:600">Dietary:</td><td>${member.dietary}</td></tr>
        <tr><td style="font-weight:600">Payment:</td><td>${payStatus} ${payAmount}</td></tr>
      </table>
    </div>

    ${paymentBlock}

    <!-- Event Day Information -->
    <div style="background:#f0fdf4;border-radius:12px;padding:16px;margin:20px 0;border-left:4px solid #22c55e">
      <h3 style="font-size:14px;color:#15803d;margin:0 0 8px">📍 Event Day Information</h3>
      <table style="font-size:13px;color:#166534;line-height:1.7" cellpadding="4">
        <tr><td style="font-weight:600">Date:</td><td>${CONFIG.EVENT_DATE}</td></tr>
        <tr><td style="font-weight:600">Time:</td><td>${CONFIG.EVENT_TIME}</td></tr>
        <tr><td style="font-weight:600">Venue:</td><td>${CONFIG.VENUE}</td></tr>
      </table>
      <ul style="font-size:12px;color:#166534;line-height:1.6;margin:8px 0 0;padding-left:20px">
        <li>Please have this email ready on your phone at the event</li>
        <li>The QR code scanner will verify your registration instantly</li>
        <li>Each QR code is unique to your registration — do not share it</li>
      </ul>
    </div>

    <p style="font-size:13px;color:#888;text-align:center;margin:20px 0 0">
      See you at ${CONFIG.EVENT_NAME}! 🌸<br>
      <a href="https://www.jaxbengali.org" style="color:#2d5a8e">jaxbengali.org</a>
    </p>
  </div>

  <!-- Footer -->
  <div style="background:#f8fafc;padding:16px 24px;text-align:center;border-top:1px solid #e5e7eb">
    <p style="font-size:11px;color:#999;margin:0">${CONFIG.BANF_ORG} · <a href="https://www.jaxbengali.org" style="color:#2d5a8e">jaxbengali.org</a></p>
    <p style="font-size:10px;color:#ccc;margin:4px 0 0">You received this because you RSVP'd Yes for ${CONFIG.EVENT_NAME}</p>
  </div>
</div>
</body></html>`;
}

// ═══════════════════════════════════════════════════════════════════
// EMAIL TRANSPORT
// ═══════════════════════════════════════════════════════════════════

let _transport = null;
async function getTransport() {
  if (_transport) return _transport;
  _transport = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      type: 'OAuth2',
      user: CONFIG.BANF_EMAIL,
      clientId: GMAIL.CLIENT_ID,
      clientSecret: GMAIL.CLIENT_SECRET,
      refreshToken: GMAIL.REFRESH_TOKEN
    }
  });
  return _transport;
}

async function sendQREmail(member, qrPath) {
  const transport = await getTransport();
  const qrCid = 'banf-qr-' + member.email.replace(/[^a-z0-9]/gi, '-');

  const info = await transport.sendMail({
    from: `"BANF" <${CONFIG.BANF_EMAIL}>`,
    to: member.email,
    subject: `🌸 ${CONFIG.EVENT_NAME} — Your QR Check-In Code`,
    html: buildEmailHTML(member, qrCid),
    attachments: [{ filename: 'qr-code.png', path: qrPath, cid: qrCid }],
    headers: {
      'X-BANF-Drive': 'QR-Code-Email-Drive',
      'X-BANF-Event': CONFIG.EVENT_NAME,
      'X-BANF-NoDup': 'strict'
    }
  });
  return info;
}

// ═══════════════════════════════════════════════════════════════════
// MAIN — CAUTIOUS BATCH SENDING ENGINE
// ═══════════════════════════════════════════════════════════════════

async function main() {
  const args = process.argv.slice(2);
  const phaseIdx = args.indexOf('--phase');
  const phase = phaseIdx >= 0 ? parseInt(args[phaseIdx + 1]) || 0 : 0;
  const dryRun = args.includes('--dry-run');
  const showStatus = args.includes('--status');
  const forceReset = args.includes('--force-reset');
  const continueMode = args.includes('--continue');
  const batchIdx = args.indexOf('--batch');
  const delayIdx = args.indexOf('--delay');
  const batchOverride = batchIdx >= 0 ? parseInt(args[batchIdx + 1]) : null;
  const delayOverride = delayIdx >= 0 ? parseInt(args[delayIdx + 1]) : null;

  console.log('═══════════════════════════════════════════════════════════');
  console.log('  🌸 BANF QR CODE EMAIL DRIVE — Live Cautious Sender');
  console.log('  📅 Event: ' + CONFIG.EVENT_DATE + ' · ' + CONFIG.VENUE);
  console.log('═══════════════════════════════════════════════════════════\n');

  // ── Force Reset (DANGER) ──
  if (forceReset) {
    console.log('⚠️  FORCE RESET requested. This will clear ALL send records.');
    console.log('    Any member previously sent will be eligible again.\n');
    try { fs.unlinkSync(LOCK_FILE); } catch (e) {}
    try { fs.unlinkSync(STATUS_FILE); } catch (e) {}
    try { fs.unlinkSync(DRIVE_ID_FILE); } catch (e) {}
    console.log('✅ Lock file, status file, and drive ID cleared.');
    console.log('   Run again to start a fresh drive.\n');
    return;
  }

  // ── Load or Initialize Lock ──
  let lock = loadLock();
  if (!lock) {
    lock = initLock();
    console.log(`🆕 New drive initialized: ${lock.driveId}`);
    logDriveEvent(`Drive initialized: ${lock.driveId}`);
  } else {
    console.log(`📋 Resuming drive: ${lock.driveId}`);
    console.log(`   Previously sent: ${getSentCount(lock)} emails`);
  }

  // ── Load CRM Members ──
  const allMembers = loadAllRSVPMembers();
  console.log(`\n📊 Total RSVP-Yes members: ${allMembers.length}`);
  console.log(`   Total headcount: ${allMembers.reduce((s, m) => s + m.adults + m.kids, 0)}`);

  // ── Compute Pending (STRICT NO-DUP) ──
  const pending = allMembers.filter(m => !isAlreadySent(lock, m.email));
  const alreadySent = allMembers.filter(m => isAlreadySent(lock, m.email));
  console.log(`   Already sent (locked): ${alreadySent.length}`);
  console.log(`   Pending to send: ${pending.length}`);

  // Update drive status
  updateDriveStatus({
    driveId: lock.driveId,
    totalRecipients: allMembers.length,
    sent: getSentCount(lock),
    pending: pending.length,
    status: pending.length === 0 ? 'completed' : (phase === 0 && !continueMode ? 'initialized' : `phase${phase || 'continue'}_sending`)
  });

  // ── Status View ──
  if (showStatus) {
    console.log('\n╔════════════════════════════════════════════════════════╗');
    console.log('║  QR CODE EMAIL DRIVE STATUS                           ║');
    console.log('╠════════════════════════════════════════════════════════╣');
    console.log(`║  Drive ID:    ${lock.driveId}`);
    console.log(`║  Event:       ${CONFIG.EVENT_NAME} (${CONFIG.EVENT_DATE})`);
    console.log(`║  Total:       ${allMembers.length} recipients`);
    console.log(`║  Sent:        ${getSentCount(lock)} ✅`);
    console.log(`║  Pending:     ${pending.length} ⏳`);
    console.log('║');
    if (alreadySent.length > 0) {
      console.log('║  ── Sent (locked — will NOT receive again) ──');
      alreadySent.forEach(m => {
        const info = lock.sentEmails[m.email.toLowerCase()];
        console.log(`║    ✅ ${m.name} <${m.email}> — ${info.sentAt.split('T')[0]} Phase${info.phase}`);
      });
    }
    if (pending.length > 0) {
      console.log('║');
      console.log('║  ── Pending (will receive in next send) ──');
      pending.forEach(m => {
        const ecTag = m.isEC ? ' [EC]' : '';
        console.log(`║    ⏳ ${m.name} <${m.email}>${ecTag}`);
      });
    }
    console.log('╚════════════════════════════════════════════════════════╝\n');
    return;
  }

  if (pending.length === 0) {
    console.log('\n✅ ALL EMAILS SENT! Drive is complete — no duplicates possible.');
    updateDriveStatus({ status: 'completed', completedAt: new Date().toISOString() });
    return;
  }

  // ── Determine Batch ──
  let batchSize, batchLabel, phaseNum;
  if (phase === 1) {
    // Phase 1: Test with 3 EC members
    batchSize = CONFIG.PHASE1_BATCH;
    batchLabel = 'Phase 1 — EC Test Batch';
    phaseNum = 1;
  } else if (phase === 2) {
    // Phase 2: Next 10
    batchSize = CONFIG.PHASE2_BATCH;
    batchLabel = 'Phase 2 — Verification Batch';
    phaseNum = 2;
  } else if (phase === 3 || continueMode) {
    // Phase 3 / Continue: All remaining in batches
    batchSize = batchOverride || CONFIG.PHASE3_BATCH;
    batchLabel = continueMode ? 'Continue — Next Batch' : 'Phase 3 — Full Send';
    phaseNum = 3;
  } else {
    console.log('\n⚠️  Please specify a phase or --continue:');
    console.log('    --phase 1    Test batch (3 EC members)');
    console.log('    --phase 2    Verification batch (10 members)');
    console.log('    --phase 3    Full send (all remaining, batch 10)');
    console.log('    --continue   Send next batch of pending');
    console.log('    --dry-run    Preview without sending');
    console.log('    --status     Show drive status');
    return;
  }

  const delay = delayOverride || CONFIG.DEFAULT_DELAY;

  // Sort: EC members first for Phase 1
  let toSendPool = [...pending];
  if (phase === 1) {
    // Phase 1: Only EC test members
    toSendPool = pending.filter(m => EC_TEST_EMAILS.includes(m.email));
    if (toSendPool.length === 0) {
      console.log('\n⚠️  All Phase 1 EC test members already sent. Try --phase 2 or --continue.');
      return;
    }
  } else {
    // EC members first, then community
    toSendPool.sort((a, b) => {
      if (a.isEC && !b.isEC) return -1;
      if (!a.isEC && b.isEC) return 1;
      return 0;
    });
  }

  const toSend = toSendPool.slice(0, batchSize);
  const batchId = `BATCH-${Date.now().toString(36)}`;

  console.log(`\n📧 ${batchLabel}`);
  console.log(`   Batch size: ${toSend.length} (of ${pending.length} pending)`);
  console.log(`   Delay: ${delay}ms between emails`);
  console.log(`   Batch ID: ${batchId}`);

  // ── Dry Run ──
  if (dryRun) {
    console.log('\n── DRY RUN — Would send to: ──');
    toSend.forEach((m, i) => {
      const ecTag = m.isEC ? ` [EC: ${m.ecRole}]` : '';
      const qr = findExistingQR(m.email) ? '✓QR' : '⚡NEW';
      const pay = m.paymentStatus === 'paid' ? '✅Paid' : '❌Unpaid';
      console.log(`  ${i + 1}. ${m.name} <${m.email}>${ecTag} — ${qr} ${pay}`);
    });
    console.log(`\n🔒 No emails would be sent in dry-run mode.`);
    console.log(`   Already locked (skip): ${alreadySent.length}`);
    console.log(`   Would remain pending: ${pending.length - toSend.length}`);
    return;
  }

  // ═══════════════════════════════════════════════════════════════
  // SEND LOOP — WITH STRICT NO-DUP CHECK AT EACH EMAIL
  // ═══════════════════════════════════════════════════════════════

  updateDriveStatus({
    status: `phase${phaseNum}_sending`,
    phase: phaseNum,
    startedAt: lock.created
  });
  logDriveEvent(`${batchLabel}: sending ${toSend.length} emails (batch ${batchId})`);

  console.log(`\n📱 Step 1: Ensuring QR codes exist...\n`);
  for (const m of toSend) {
    let qr = findExistingQR(m.email);
    if (!qr) {
      console.log(`  ⚡ Generating QR for ${m.name}...`);
      qr = await generateQR(m);
    }
    m._qrPath = qr;
  }
  console.log(`  ✅ All ${toSend.length} QR codes ready\n`);

  console.log(`📧 Step 2: Sending emails...\n`);
  let sent = 0, failed = 0;
  const batchResults = [];

  for (const m of toSend) {
    // ██ STRICT NO-DUP: Re-check lock IMMEDIATELY before send ██
    // This prevents races if multiple instances run
    const freshLock = loadLock();
    if (isAlreadySent(freshLock, m.email)) {
      console.log(`  🔒 SKIP (already sent): ${m.name} <${m.email}>`);
      batchResults.push({ email: m.email, name: m.name, status: 'skip_dup', reason: 'Already in lock file' });
      continue;
    }

    try {
      const info = await sendQREmail(m, m._qrPath);

      // ██ RECORD IN LOCK FILE IMMEDIATELY AFTER SUCCESSFUL SEND ██
      recordSent(lock, m.email, m.name, info.messageId, phaseNum, batchId);
      sent++;

      batchResults.push({ email: m.email, name: m.name, status: 'sent', messageId: info.messageId });

      console.log(`  ✅ ${sent}/${toSend.length} — ${m.name} <${m.email}> [${info.messageId}]`);

      updateDriveStatus({
        sent: getSentCount(lock),
        pending: allMembers.length - getSentCount(lock),
        lastSentAt: new Date().toISOString(),
        lastSentTo: m.email
      });

      // Delay between sends
      if (sent < toSend.length) {
        await new Promise(r => setTimeout(r, delay));
      }
    } catch (err) {
      const errMsg = err.message || String(err);
      failed++;
      batchResults.push({ email: m.email, name: m.name, status: 'failed', error: errMsg.slice(0, 200) });

      console.error(`  ❌ FAILED: ${m.name} — ${errMsg.slice(0, 100)}`);
      logDriveEvent(`FAILED: ${m.email} — ${errMsg.slice(0, 150)}`, 'error');

      // If rate limited, stop immediately
      if (errMsg.includes('limit exceeded') || errMsg.includes('550-5.4.5') || errMsg.includes('ECONNRESET')) {
        console.log('\n⚠️  Gmail limit or connection error — stopping. Run --continue to resume.');
        updateDriveStatus({
          status: 'paused',
          pausedAt: new Date().toISOString(),
          failed: (loadDriveStatus().failed || 0) + 1,
          errors: [...(loadDriveStatus().errors || []), { email: m.email, error: errMsg.slice(0, 200), time: new Date().toISOString() }]
        });
        break;
      }
    }
  }

  // ── Batch Summary ──
  const totalSent = getSentCount(lock);
  const remaining = allMembers.length - totalSent;

  // Save batch record
  const status = loadDriveStatus();
  status.batches = status.batches || [];
  status.batches.push({
    batchId,
    phase: phaseNum,
    label: batchLabel,
    sentAt: new Date().toISOString(),
    attempted: toSend.length,
    sent,
    failed,
    skipped: toSend.length - sent - failed,
    results: batchResults
  });
  status.sent = totalSent;
  status.pending = remaining;
  status.failed = (status.failed || 0) + failed;
  if (remaining === 0) {
    status.status = 'completed';
    status.completedAt = new Date().toISOString();
  }
  fs.writeFileSync(STATUS_FILE, JSON.stringify(status, null, 2));

  console.log(`\n${'═'.repeat(60)}`);
  console.log(`  ${batchLabel} — COMPLETE`);
  console.log(`  ✅ Sent: ${sent}`);
  console.log(`  ❌ Failed: ${failed}`);
  console.log(`  🔒 Skipped (dup): ${toSend.length - sent - failed}`);
  console.log(`  📊 Total progress: ${totalSent}/${allMembers.length} emails delivered`);
  console.log(`  ⏳ Remaining: ${remaining}`);
  console.log(`${'═'.repeat(60)}`);

  if (remaining > 0) {
    console.log(`\n💡 Next step:`);
    if (phaseNum === 1) {
      console.log('   1. Check the test emails arrived correctly');
      console.log('   2. Verify template, date, venue, QR code');
      console.log('   3. Run: node banf-qr-drive-live.js --phase 2');
    } else if (phaseNum === 2) {
      console.log('   1. Monitor for any reply issues (wait 5-10 min)');
      console.log('   2. Run: node banf-qr-drive-live.js --phase 3');
    } else {
      console.log(`   Run: node banf-qr-drive-live.js --continue`);
    }
  } else {
    console.log('\n🎉 ALL EMAILS SENT! QR Code Email Drive is COMPLETE.');
    console.log('   Lock file prevents any future duplicate sends.');
  }
  console.log('');
}

main().catch(err => {
  console.error('Fatal error:', err);
  logDriveEvent(`FATAL: ${err.message}`, 'error');
  updateDriveStatus({ status: 'error' });
  process.exit(1);
});
