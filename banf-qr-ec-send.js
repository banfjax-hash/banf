#!/usr/bin/env node
/**
 * ═══════════════════════════════════════════════════════════════════════
 *  BANF QR Code — EC Member Generator + Bulk Email Sender
 * ═══════════════════════════════════════════════════════════════════════
 *
 *  1) Generates QR codes for any EC members who don't already have one
 *  2) Sends QR code emails to ALL 8 EC members
 *
 *  Usage:  node banf-qr-ec-send.js                  (generate + send all)
 *          node banf-qr-ec-send.js --generate-only   (only generate missing QRs)
 *          node banf-qr-ec-send.js --send-only        (only send emails)
 *          node banf-qr-ec-send.js --to email@x.com  (send to one EC member)
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
  QR_SCAN_URL: 'https://www.jaxbengali.org/admin-portal#qr-food-serving'
};

const GMAIL = {
  CLIENT_ID: '1020178199135-3usrl611ara38i7rhu2ub6sn6g1150ml.apps.googleusercontent.com',
  CLIENT_SECRET: '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',
  REFRESH_TOKEN: require('./banf-gmail-config').REFRESH_TOKEN
};

const CRM_PATH = path.join(__dirname, 'banf-crm-reconciliation.json');
const QR_DIR = path.join(__dirname, 'qr-codes');

// ─── EC Member Master List ──────────────────────────────────────────
const EC_MEMBERS = [
  { name: 'Ranadhir Ghosh',        email: 'ranadhir.ghosh@gmail.com',        role: 'President',        ecRole: 'super-admin' },
  { name: 'Partha Mukhopadhyay',   email: 'mukhopadhyay.partha@gmail.com',   role: 'Vice President',   ecRole: 'admin' },
  { name: 'Amit Chandak',          email: 'amit.everywhere@gmail.com',        role: 'EC Member',        ecRole: 'ec-member' },
  { name: 'Rajanya Ghosh',         email: 'rajanya.ghosh@gmail.com',      role: 'EC Member',        ecRole: 'ec-member' },
  { name: 'Moumita Mukherjee',     email: 'moumitamukherjee2002@yahoo.com',   role: 'EC Member',        ecRole: 'ec-member' },
  { name: 'Soumyajit Dutta',       email: 'duttasoumyajit86@gmail.com',       role: 'EC Member',        ecRole: 'ec-member' },
  { name: 'Sumanta Datta',         email: 'sumantadatta07@gmail.com',          role: 'EC Member',        ecRole: 'ec-member' },
  { name: 'Rwiti Choudhury',       email: 'rwitichoudhury@gmail.com',          role: 'EC Member',        ecRole: 'ec-member' }
];

// ─── CRM Lookup (optional — some EC members may not be in CRM) ──────
function lookupCRM(email) {
  try {
    const crm = JSON.parse(fs.readFileSync(CRM_PATH, 'utf8'));
    const member = crm.members.find(m => m.email && m.email.toLowerCase() === email.toLowerCase());
    if (!member) return null;
    const ev = member.eventAttendance && member.eventAttendance.find(e =>
      e.eventName && e.eventName.toLowerCase().includes('bosonto')
    );
    return { member, event: ev };
  } catch (e) { return null; }
}

// ─── QR Code Generation ─────────────────────────────────────────────
function findExistingQR(email) {
  if (!fs.existsSync(QR_DIR)) return null;
  const slug = email.replace(/[@.]/g, '_');
  const pattern = `Bosonto-Utsob-2026_${slug}.png`;
  const qrPath = path.join(QR_DIR, pattern);
  if (fs.existsSync(qrPath)) return qrPath;
  // Case-insensitive fallback
  const files = fs.readdirSync(QR_DIR);
  const match = files.find(f => f.toLowerCase().includes(slug.toLowerCase()) && f.toLowerCase().includes('bosonto'));
  return match ? path.join(QR_DIR, match) : null;
}

async function generateQR(ecMember) {
  const crm = lookupCRM(ecMember.email);
  const ev = crm && crm.event ? crm.event : {};
  const mem = crm && crm.member ? crm.member : {};

  const regCode = `BANF-EC-${ecMember.name.replace(/\s+/g, '-').toUpperCase().slice(0, 20)}`;

  const payload = {
    type: 'BANF_FOOD_CHECK_IN',
    regCode: regCode,
    name: ecMember.name,
    email: ecMember.email,
    adults: ev.adults || ev.partySize || 2,
    kids: ev.kids || 0,
    veg: 0,
    nonVeg: (ev.adults || 2) + (ev.kids || 0),
    dietary: ev.dietary || 'Not specified',
    dietaryNotes: '',
    householdType: mem.householdType || 'family',
    membershipTier: mem.membershipTier || mem.membershipCategory || 'family',
    paid: mem.paymentStatus === 'paid',
    amount: mem.paymentAmount || 0,
    expectedAmount: 375,
    remainingBalance: mem.paymentStatus === 'paid' ? 0 : 375,
    paymentStatus: mem.paymentStatus === 'paid' ? 'PAID' : (mem.paymentStatus === 'partial' ? 'PARTIAL' : 'UNPAID'),
    event: CONFIG.EVENT_NAME,
    ecRole: ecMember.role
  };

  const payloadStr = JSON.stringify(payload);
  const safeName = ecMember.email.replace(/[^a-z0-9]/gi, '_');
  const filename = `Bosonto-Utsob-2026_${safeName}.png`;
  const filePath = path.join(QR_DIR, filename);

  if (!fs.existsSync(QR_DIR)) fs.mkdirSync(QR_DIR, { recursive: true });

  await QRCode.toFile(filePath, payloadStr, {
    width: 300,
    margin: 2,
    color: { dark: '#000000', light: '#ffffff' },
    errorCorrectionLevel: 'M'
  });

  console.log(`  ✅ Generated: ${filename}`);
  return filePath;
}

// ─── Email Template ─────────────────────────────────────────────────
function buildEmailHTML(ecMember, qrCid) {
  const crm = lookupCRM(ecMember.email);
  const mem = crm && crm.member ? crm.member : {};
  const ev = crm && crm.event ? crm.event : {};

  const name = ecMember.name.split(' ')[0];
  const adults = ev.adults || ev.partySize || 2;
  const kids = ev.kids || 0;
  const dietary = ev.dietary || 'Not specified';
  const payStatus = mem.paymentStatus === 'paid' ? '✅ Paid' :
                    mem.paymentStatus === 'partial' ? '⚠️ Partial' : '❌ Unpaid';
  const payAmount = mem.paymentAmount ? `$${mem.paymentAmount}` : '—';

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f0f4f8;font-family:'Segoe UI',system-ui,sans-serif">
<div style="max-width:600px;margin:20px auto;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.08)">

  <!-- Header -->
  <div style="background:linear-gradient(135deg,#1e3a5f 0%,#2d5a8e 50%,#d4a843 100%);padding:32px 24px;text-align:center">
    <h1 style="color:#fff;font-size:22px;margin:0 0 4px">🎉 ${CONFIG.EVENT_NAME}</h1>
    <p style="color:rgba(255,255,255,.85);font-size:13px;margin:0">Your QR Check-In Code — EC Test Drive</p>
  </div>

  <!-- Body -->
  <div style="padding:28px 24px">
    <p style="font-size:15px;color:#1a1a1a;margin:0 0 16px">Hello <strong>${name}</strong>,</p>
    <p style="font-size:14px;color:#4a4a4a;line-height:1.6;margin:0 0 20px">
      As an <strong>EC Member (${ecMember.role})</strong>, here is your personal QR code for <strong>${CONFIG.EVENT_NAME}</strong>.
      This is a <strong>test drive</strong> of our QR food verification system — please try scanning this code using the admin portal's QR scanner.
    </p>

    <!-- QR Code -->
    <div style="text-align:center;margin:24px 0;padding:20px;background:#f8fafc;border-radius:12px;border:2px dashed #d4a843">
      <img src="cid:${qrCid}" alt="QR Code" style="width:200px;height:200px;border-radius:8px">
      <p style="font-size:12px;color:#888;margin:8px 0 0">Scan this QR code at the food serving counter</p>
    </div>

    <!-- Registration Details -->
    <div style="background:#f0f7ff;border-radius:12px;padding:16px;margin:20px 0;border-left:4px solid #2d5a8e">
      <h3 style="font-size:14px;color:#1e3a5f;margin:0 0 10px">📋 Your Registration Details</h3>
      <table style="width:100%;font-size:13px;color:#333" cellpadding="4">
        <tr><td style="font-weight:600;width:140px">Name:</td><td>${ecMember.name}</td></tr>
        <tr><td style="font-weight:600">EC Role:</td><td>${ecMember.role}</td></tr>
        <tr><td style="font-weight:600">Party Size:</td><td>${adults} adults${kids > 0 ? ` + ${kids} kids` : ''}</td></tr>
        <tr><td style="font-weight:600">Dietary:</td><td>${dietary}</td></tr>
        <tr><td style="font-weight:600">Payment:</td><td>${payStatus} ${payAmount}</td></tr>
      </table>
    </div>

    <!-- How to Test -->
    <div style="background:#fff7ed;border-radius:12px;padding:16px;margin:20px 0;border-left:4px solid #d4a843">
      <h3 style="font-size:14px;color:#92400e;margin:0 0 8px">🔍 How to Test the QR Scanner</h3>
      <ol style="font-size:13px;color:#78350f;line-height:1.7;margin:0;padding-left:20px">
        <li>Go to the <a href="${CONFIG.PORTAL_URL}" style="color:#2d5a8e;font-weight:600">Admin Portal</a></li>
        <li>Navigate to <strong>QR Food Serving</strong></li>
        <li>Click <strong>Start Camera</strong> and scan this QR code</li>
        <li>Verify your details appear correctly</li>
        <li>Try the <strong>Approve Attendance</strong> flow</li>
      </ol>
    </div>

    <p style="font-size:13px;color:#888;text-align:center;margin:20px 0 0">
      This is a test email from the BANF Agentic Platform.<br>
      Questions? Contact <a href="mailto:${CONFIG.BANF_EMAIL}" style="color:#2d5a8e">${CONFIG.BANF_EMAIL}</a>
    </p>
  </div>

  <!-- Footer -->
  <div style="background:#f8fafc;padding:16px 24px;text-align:center;border-top:1px solid #e5e7eb">
    <p style="font-size:11px;color:#999;margin:0">${CONFIG.BANF_ORG} · <a href="https://www.jaxbengali.org" style="color:#2d5a8e">jaxbengali.org</a></p>
  </div>
</div>
</body></html>`;
}

// ─── Send Email ─────────────────────────────────────────────────────
async function createTransport() {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      type: 'OAuth2',
      user: CONFIG.BANF_EMAIL,
      clientId: GMAIL.CLIENT_ID,
      clientSecret: GMAIL.CLIENT_SECRET,
      refreshToken: GMAIL.REFRESH_TOKEN
    }
  });
}

async function sendQREmail(ecMember, qrPath) {
  const transport = await createTransport();
  const qrCid = 'banf-qr-' + ecMember.email.replace(/[^a-z0-9]/gi, '-');

  const info = await transport.sendMail({
    from: `"BANF Admin" <${CONFIG.BANF_EMAIL}>`,
    to: ecMember.email,
    subject: `🎉 ${CONFIG.EVENT_NAME} — Your QR Check-In Code (EC Test Drive)`,
    html: buildEmailHTML(ecMember, qrCid),
    attachments: [
      {
        filename: 'qr-code.png',
        path: qrPath,
        cid: qrCid
      }
    ]
  });

  console.log(`  📧 Sent to ${ecMember.name} <${ecMember.email}> — ${info.messageId}`);
  return info;
}

// ─── Main ───────────────────────────────────────────────────────────
async function main() {
  const args = process.argv.slice(2);
  const generateOnly = args.includes('--generate-only');
  const sendOnly = args.includes('--send-only');
  const toFlag = args.indexOf('--to');
  const singleEmail = toFlag >= 0 ? args[toFlag + 1] : null;

  const targets = singleEmail
    ? EC_MEMBERS.filter(m => m.email.toLowerCase() === singleEmail.toLowerCase())
    : EC_MEMBERS;

  if (singleEmail && targets.length === 0) {
    console.error(`❌ EC member not found: ${singleEmail}`);
    console.log('\nAvailable EC members:');
    EC_MEMBERS.forEach(m => console.log(`  - ${m.name} <${m.email}>`));
    process.exit(1);
  }

  console.log('═══════════════════════════════════════════════════════');
  console.log(' BANF QR Code — EC Member Generator + Email Sender');
  console.log('═══════════════════════════════════════════════════════');
  console.log(`\n🎯 Targets: ${targets.length} EC member(s)`);

  // Step 1: Check & Generate QR codes
  if (!sendOnly) {
    console.log('\n📱 Step 1: Checking / Generating QR codes...\n');
    for (const ec of targets) {
      const existing = findExistingQR(ec.email);
      if (existing) {
        console.log(`  ✓ Exists: ${path.basename(existing)} — ${ec.name}`);
        ec._qrPath = existing;
      } else {
        console.log(`  ⚡ Generating for ${ec.name} <${ec.email}>...`);
        ec._qrPath = await generateQR(ec);
      }
    }
  } else {
    // Just find existing QR codes
    for (const ec of targets) {
      const existing = findExistingQR(ec.email);
      if (existing) { ec._qrPath = existing; }
      else { console.error(`  ❌ No QR code for ${ec.name} — run without --send-only first`); }
    }
  }

  // Step 2: Send emails
  if (!generateOnly) {
    const toSend = targets.filter(t => t._qrPath);
    if (toSend.length === 0) {
      console.log('\n❌ No QR codes available — nothing to send');
      process.exit(1);
    }

    console.log(`\n📧 Step 2: Sending QR emails to ${toSend.length} EC member(s)...\n`);

    let sent = 0, failed = 0;
    for (const ec of toSend) {
      try {
        await sendQREmail(ec, ec._qrPath);
        sent++;
        // Small delay between sends to avoid rate limiting
        if (toSend.length > 1) await new Promise(r => setTimeout(r, 2000));
      } catch (err) {
        console.error(`  ❌ Failed for ${ec.name}: ${err.message}`);
        failed++;
      }
    }

    console.log(`\n${'═'.repeat(55)}`);
    console.log(`✅ ${sent} emails sent, ${failed} failed`);
  }

  console.log('\n🏁 Done!');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
