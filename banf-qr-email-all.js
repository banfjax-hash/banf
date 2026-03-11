#!/usr/bin/env node
/**
 * ═══════════════════════════════════════════════════════════════════════
 *  BANF QR Code — Bulk Email Sender (ALL RSVP'd Members)
 * ═══════════════════════════════════════════════════════════════════════
 *
 *  Sends QR code emails to ALL members who RSVP'd YES for Bosonto Utsob 2026.
 *  Includes all EC members + community members.
 *
 *  Features:
 *  - Generates missing QR codes automatically
 *  - Tracks sent/failed in banf-qr-email-status.json (resume on failure)
 *  - Delay between sends to avoid Gmail rate limits
 *  - Can resume from where it left off after Gmail limit resets
 *
 *  Usage:
 *    node banf-qr-email-all.js                    (send to all pending)
 *    node banf-qr-email-all.js --dry-run          (preview who will receive)
 *    node banf-qr-email-all.js --status            (show send status)
 *    node banf-qr-email-all.js --reset             (clear status, start fresh)
 *    node banf-qr-email-all.js --batch 10          (send max N before stopping)
 *    node banf-qr-email-all.js --delay 5000        (ms between emails, default 3000)
 *
 * ═══════════════════════════════════════════════════════════════════════
 */

const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');
const QRCode = require('qrcode');

// ─── Config ─────────────────────────────────────────────────────────
const CONFIG = {
  BANF_EMAIL: 'banfjax@gmail.com',
  BANF_ORG: 'Bengali Association of North Florida (BANF)',
  EVENT_NAME: 'Bosonto Utsob 2026',
  EVENT_DATE: 'Saturday, March 7, 2026',
  VENUE: 'Southside Community Center, 10080 Beach Blvd, Jacksonville FL 32246',
  PORTAL_URL: 'https://www.jaxbengali.org/admin-portal',
  QR_SCAN_URL: 'https://www.jaxbengali.org/admin-portal#qr-food-serving',
  DEFAULT_DELAY: 3000       // ms between emails
};

const GMAIL = {
  CLIENT_ID: '1020178199135-3usrl611ara38i7rhu2ub6sn6g1150ml.apps.googleusercontent.com',
  CLIENT_SECRET: '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',
  REFRESH_TOKEN: require('./banf-gmail-config').REFRESH_TOKEN
};

const CRM_PATH = path.join(__dirname, 'banf-crm-reconciliation.json');
const QR_DIR = path.join(__dirname, 'qr-codes');
const STATUS_FILE = path.join(__dirname, 'banf-qr-email-status.json');

// ─── EC Members (for role enrichment) ───────────────────────────────
const EC_EMAILS = {
  'ranadhir.ghosh@gmail.com': 'President',
  'mukhopadhyay.partha@gmail.com': 'Vice President',
  'amit.everywhere@gmail.com': 'EC Member',
  'rajanya.ghosh@gmail.com': 'EC Member',
  'moumitamukherjee2002@yahoo.com': 'EC Member',
  'duttasoumyajit86@gmail.com': 'EC Member',
  'sumantadatta07@gmail.com': 'EC Member',
  'rwitichoudhury@gmail.com': 'EC Member'
};

// ─── Status Tracking ────────────────────────────────────────────────
function loadStatus() {
  try { return JSON.parse(fs.readFileSync(STATUS_FILE, 'utf8')); } catch(e) { return { sent: {}, failed: {}, lastRun: null }; }
}
function saveStatus(status) {
  status.lastRun = new Date().toISOString();
  fs.writeFileSync(STATUS_FILE, JSON.stringify(status, null, 2));
}

// ─── Load ALL RSVP'd members from CRM ──────────────────────────────
function loadAllRSVPMembers() {
  const crm = JSON.parse(fs.readFileSync(CRM_PATH, 'utf8'));
  const members = [];

  for (const m of crm.members) {
    if (!m.email) continue;
    const ev = m.eventAttendance && m.eventAttendance.find(e =>
      e.eventName && e.eventName.toLowerCase().includes('bosonto') && e.rsvp === 'yes'
    );
    if (!ev) continue;

    members.push({
      name: m.displayName || m.firstName || m.email.split('@')[0],
      email: m.email.toLowerCase(),
      adults: ev.adults || ev.partySize || 1,
      kids: ev.kids || 0,
      dietary: ev.dietary || 'Not specified',
      paymentStatus: m.paymentStatus || 'not_paid',
      paymentAmount: m.paymentAmount || 0,
      householdType: m.householdType || 'individual',
      membershipTier: m.membershipTier || m.membershipCategory || 'individual',
      expectedAmount: ev.expectedAmount || 0,
      remainingBalance: ev.remainingBalance || 0,
      isEC: !!EC_EMAILS[m.email.toLowerCase()],
      ecRole: EC_EMAILS[m.email.toLowerCase()] || null
    });
  }

  // Add EC members who aren't in CRM but should get emails
  for (const [email, role] of Object.entries(EC_EMAILS)) {
    if (!members.find(m => m.email === email)) {
      const name = email.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
      members.push({
        name, email, adults: 2, kids: 0, dietary: 'Not specified',
        paymentStatus: 'not_paid', paymentAmount: 0, householdType: 'family',
        membershipTier: 'family', expectedAmount: 375, remainingBalance: 375,
        isEC: true, ecRole: role
      });
    }
  }

  return members;
}

// ─── QR Code Generation ─────────────────────────────────────────────
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

// ─── Email Template ─────────────────────────────────────────────────
function buildEmailHTML(member, qrCid) {
  const name = member.name.split(' ')[0];
  const payStatus = member.paymentStatus === 'paid' ? '✅ Paid' :
                    member.paymentStatus === 'partial' ? '⚠️ Partial' : '❌ Unpaid';
  const payAmount = member.paymentAmount ? `$${member.paymentAmount}` : '—';
  const ecLine = member.isEC ? `<tr><td style="font-weight:600">EC Role:</td><td>${member.ecRole}</td></tr>` : '';

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f0f4f8;font-family:'Segoe UI',system-ui,sans-serif">
<div style="max-width:600px;margin:20px auto;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.08)">

  <!-- Header -->
  <div style="background:linear-gradient(135deg,#1e3a5f 0%,#2d5a8e 50%,#d4a843 100%);padding:32px 24px;text-align:center">
    <h1 style="color:#fff;font-size:22px;margin:0 0 4px">🎉 ${CONFIG.EVENT_NAME}</h1>
    <p style="color:rgba(255,255,255,.85);font-size:13px;margin:0">${CONFIG.EVENT_DATE} · Jacksonville, FL</p>
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

    <!-- Important Info -->
    <div style="background:#f0fdf4;border-radius:12px;padding:16px;margin:20px 0;border-left:4px solid #22c55e">
      <h3 style="font-size:14px;color:#15803d;margin:0 0 8px">ℹ️ Event Day Information</h3>
      <ul style="font-size:13px;color:#166534;line-height:1.7;margin:0;padding-left:20px">
        <li>Please have this email ready on your phone at the event</li>
        <li>The QR code scanner will verify your registration instantly</li>
        <li>Each QR code is unique to your registration — do not share it</li>
        <li>If you have questions, find any EC member at the event</li>
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
    <p style="font-size:10px;color:#ccc;margin:4px 0 0">You received this because you RSVP'd for ${CONFIG.EVENT_NAME}</p>
  </div>
</div>
</body></html>`;
}

// ─── Send Email ─────────────────────────────────────────────────────
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
    subject: `🎉 ${CONFIG.EVENT_NAME} — Your QR Check-In Code`,
    html: buildEmailHTML(member, qrCid),
    attachments: [{ filename: 'qr-code.png', path: qrPath, cid: qrCid }]
  });
  return info;
}

// ─── Main ───────────────────────────────────────────────────────────
async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const showStatus = args.includes('--status');
  const reset = args.includes('--reset');
  const batchIdx = args.indexOf('--batch');
  const batchSize = batchIdx >= 0 ? parseInt(args[batchIdx + 1]) || 50 : Infinity;
  const delayIdx = args.indexOf('--delay');
  const delay = delayIdx >= 0 ? parseInt(args[delayIdx + 1]) || CONFIG.DEFAULT_DELAY : CONFIG.DEFAULT_DELAY;

  console.log('═══════════════════════════════════════════════════════');
  console.log(' BANF QR Code — Bulk Email Sender (ALL RSVP Members)');
  console.log('═══════════════════════════════════════════════════════\n');

  // Reset
  if (reset) {
    try { fs.unlinkSync(STATUS_FILE); } catch(e) {}
    console.log('✅ Status reset. Run again to send.');
    return;
  }

  // Load members
  const members = loadAllRSVPMembers();
  const status = loadStatus();

  console.log(`📊 Total RSVP'd members: ${members.length}`);
  console.log(`   Already sent: ${Object.keys(status.sent).length}`);
  console.log(`   Previously failed: ${Object.keys(status.failed).length}`);

  // Status view
  if (showStatus) {
    console.log('\n── Sent ──');
    for (const [email, info] of Object.entries(status.sent)) {
      console.log(`  ✅ ${email} — ${info.time}`);
    }
    console.log('\n── Failed ──');
    for (const [email, info] of Object.entries(status.failed)) {
      console.log(`  ❌ ${email} — ${info.error}`);
    }
    return;
  }

  // Pending list (not yet sent successfully)
  const pending = members.filter(m => !status.sent[m.email]);
  console.log(`   Pending: ${pending.length}`);

  if (dryRun) {
    console.log('\n── DRY RUN — Would send to: ──');
    pending.forEach((m, i) => {
      const ecTag = m.isEC ? ' [EC]' : '';
      const qr = findExistingQR(m.email) ? '✓QR' : '⚡NEW';
      console.log(`  ${i+1}. ${m.name} <${m.email}>${ecTag} — ${qr}`);
    });
    console.log(`\n📧 Would send ${Math.min(pending.length, batchSize)} of ${pending.length} emails (batch=${batchSize === Infinity ? 'all' : batchSize}, delay=${delay}ms)`);
    return;
  }

  if (pending.length === 0) {
    console.log('\n✅ All emails already sent!');
    return;
  }

  // Step 1: Ensure all QR codes exist
  console.log('\n📱 Step 1: Checking / generating QR codes...\n');
  for (const m of pending) {
    let qr = findExistingQR(m.email);
    if (!qr) {
      console.log(`  ⚡ Generating QR for ${m.name}...`);
      qr = await generateQR(m);
    }
    m._qrPath = qr;
  }
  console.log(`  ✅ All ${pending.length} QR codes ready`);

  // Step 2: Send emails
  const toSend = pending.slice(0, batchSize).filter(m => m._qrPath);
  console.log(`\n📧 Step 2: Sending emails (batch: ${toSend.length}, delay: ${delay}ms)...\n`);

  let sent = 0, failed = 0;
  for (const m of toSend) {
    try {
      const info = await sendQREmail(m, m._qrPath);
      status.sent[m.email] = { time: new Date().toISOString(), messageId: info.messageId, name: m.name };
      delete status.failed[m.email]; // Clear previous failure
      saveStatus(status);
      sent++;
      console.log(`  ✅ ${sent}/${toSend.length} — ${m.name} <${m.email}>`);
      if (sent < toSend.length) await new Promise(r => setTimeout(r, delay));
    } catch (err) {
      const errMsg = err.message || String(err);
      status.failed[m.email] = { time: new Date().toISOString(), error: errMsg.slice(0, 200), name: m.name };
      saveStatus(status);
      failed++;
      console.error(`  ❌ ${m.name} — ${errMsg.slice(0, 100)}`);
      // If rate limited, stop immediately
      if (errMsg.includes('limit exceeded') || errMsg.includes('550-5.4.5')) {
        console.log('\n⚠️  Gmail daily limit hit — stopping. Run again tomorrow to resume.');
        break;
      }
    }
  }

  console.log(`\n${'═'.repeat(55)}`);
  console.log(`✅ ${sent} sent, ❌ ${failed} failed, 📋 ${pending.length - sent - failed} remaining`);
  console.log(`\nTotal progress: ${Object.keys(status.sent).length}/${members.length} emails delivered`);
  if (pending.length - sent - failed > 0) {
    console.log('\n💡 Run again to continue sending remaining emails.');
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
