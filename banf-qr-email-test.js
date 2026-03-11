#!/usr/bin/env node
/**
 * ═══════════════════════════════════════════════════════════════════════
 *  BANF QR Code Email — Test Sender
 * ═══════════════════════════════════════════════════════════════════════
 *
 *  Sends a test QR code email to Ranadhir Ghosh for Bosonto Utsob 2026.
 *  The QR code contains the attendee payload that the admin portal's
 *  QR Food Verification scanner can read.
 *
 *  Usage:  node banf-qr-email-test.js
 *          node banf-qr-email-test.js --to someone@email.com
 *
 * ═══════════════════════════════════════════════════════════════════════
 */

const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');

// ─── Config ─────────────────────────────────────────────────────────
const CONFIG = {
  BANF_EMAIL: 'banfjax@gmail.com',
  BANF_ORG: 'Bengali Association of North Florida (BANF)',
  EVENT_NAME: 'Bosonto Utsob 2026',
  EVENT_DATE: 'Saturday, March 6, 2026',
  VENUE: 'TBD — Check jaxbengali.org for updates',
  PORTAL_URL: 'https://www.jaxbengali.org/admin-portal',
  QR_SCAN_URL: 'https://www.jaxbengali.org/admin-portal#qr-food-serving'
};

// Gmail OAuth2 credentials
const GMAIL = {
  CLIENT_ID: '1020178199135-3usrl611ara38i7rhu2ub6sn6g1150ml.apps.googleusercontent.com',
  CLIENT_SECRET: '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',
  REFRESH_TOKEN: require('./banf-gmail-config').REFRESH_TOKEN
};

// ─── CRM + QR Code Lookup ───────────────────────────────────────────
const CRM_PATH = path.join(__dirname, 'banf-crm-reconciliation.json');
const QR_DIR = path.join(__dirname, 'qr-codes');

function loadAttendee(email) {
  const crm = JSON.parse(fs.readFileSync(CRM_PATH, 'utf8'));
  const member = crm.members.find(m => m.email && m.email.toLowerCase() === email.toLowerCase());
  if (!member) throw new Error(`Member not found in CRM: ${email}`);

  const ev = member.eventAttendance && member.eventAttendance.find(e =>
    e.eventName && e.eventName.toLowerCase().includes('bosonto')
  );
  if (!ev || ev.rsvp !== 'yes') throw new Error(`No Bosonto RSVP for: ${email}`);

  return { member, event: ev };
}

function findQRCode(email) {
  const slug = email.replace(/[@.]/g, '_');
  const pattern = `Bosonto-Utsob-2026_${slug}.png`;
  const qrPath = path.join(QR_DIR, pattern);
  if (!fs.existsSync(qrPath)) {
    // Try case-insensitive search
    const files = fs.readdirSync(QR_DIR);
    const match = files.find(f => f.toLowerCase().includes(slug.toLowerCase()) && f.toLowerCase().includes('bosonto'));
    if (match) return path.join(QR_DIR, match);
    throw new Error(`QR code not found: ${pattern}`);
  }
  return qrPath;
}

// ─── Email Template ─────────────────────────────────────────────────
function buildEmailHTML(member, event, qrCid) {
  const name = member.displayName || member.firstName || 'Member';
  const adults = event.adults || event.partySize || 1;
  const kids = event.kids || 0;
  const dietary = event.dietary || 'Not specified';
  const payStatus = member.paymentStatus === 'paid' ? '✅ Paid' :
                    member.paymentStatus === 'partial' ? '⚠️ Partial' : '❌ Unpaid';
  const payAmount = member.paymentAmount ? `$${member.paymentAmount}` : '—';

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;font-family:'Segoe UI',Arial,sans-serif;background:#f5f5f5">
<div style="max-width:600px;margin:20px auto;background:white;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.1)">

  <!-- Header -->
  <div style="background:linear-gradient(135deg,#1a237e,#4a148c);padding:28px 24px;text-align:center">
    <h1 style="color:white;margin:0;font-size:22px">🎉 ${CONFIG.EVENT_NAME}</h1>
    <p style="color:rgba(255,255,255,.85);margin:8px 0 0;font-size:14px">${CONFIG.EVENT_DATE}</p>
  </div>

  <!-- Body -->
  <div style="padding:24px">
    <p style="font-size:16px;color:#333">Hello <strong>${name}</strong>,</p>
    <p style="font-size:14px;color:#555;line-height:1.6">
      Here is your personal QR code for <strong>${CONFIG.EVENT_NAME}</strong>.
      Please show this QR code at the event entrance for quick check-in and food serving.
    </p>

    <!-- QR Code -->
    <div style="text-align:center;margin:24px 0;padding:20px;background:#fafafa;border-radius:8px;border:1px solid #eee">
      <img src="cid:${qrCid}" alt="Your QR Code" style="width:200px;height:200px;image-rendering:pixelated" />
      <p style="font-size:12px;color:#888;margin:10px 0 0">Scan at event entrance for check-in</p>
    </div>

    <!-- Details Card -->
    <div style="background:#f8f9fa;border-radius:8px;padding:16px;margin:16px 0;border-left:4px solid #1a237e">
      <h3 style="margin:0 0 10px;color:#1a237e;font-size:15px">📋 Your Registration Details</h3>
      <table style="width:100%;font-size:13px;color:#555">
        <tr><td style="padding:4px 0;font-weight:600">Name:</td><td>${name}</td></tr>
        <tr><td style="padding:4px 0;font-weight:600">Email:</td><td>${member.email}</td></tr>
        <tr><td style="padding:4px 0;font-weight:600">Party Size:</td><td>${adults} Adult${adults > 1 ? 's' : ''}${kids > 0 ? ` + ${kids} Kid${kids > 1 ? 's' : ''}` : ''}</td></tr>
        <tr><td style="padding:4px 0;font-weight:600">Dietary:</td><td>${dietary}</td></tr>
        <tr><td style="padding:4px 0;font-weight:600">Household:</td><td style="text-transform:capitalize">${member.householdType || '—'}</td></tr>
        <tr><td style="padding:4px 0;font-weight:600">Payment:</td><td>${payStatus} ${payAmount}</td></tr>
      </table>
    </div>

    <!-- Instructions -->
    <div style="background:#e8f5e9;border-radius:8px;padding:14px;margin:16px 0">
      <h3 style="margin:0 0 8px;color:#2e7d32;font-size:14px">📱 How to Use</h3>
      <ol style="margin:0;padding:0 0 0 18px;font-size:13px;color:#555;line-height:1.8">
        <li>Save this email or screenshot the QR code</li>
        <li>Show to the EC volunteer at the event entrance</li>
        <li>Volunteer scans your QR → your details appear instantly</li>
        <li>Enjoy the event! 🎶</li>
      </ol>
    </div>

    <p style="font-size:13px;color:#888;margin-top:20px;text-align:center">
      Questions? Reply to this email or contact us at ${CONFIG.BANF_EMAIL}
    </p>
  </div>

  <!-- Footer -->
  <div style="background:#f5f5f5;padding:16px 24px;text-align:center;border-top:1px solid #eee">
    <p style="margin:0;font-size:12px;color:#999">
      ${CONFIG.BANF_ORG} | <a href="https://www.jaxbengali.org" style="color:#1a237e">jaxbengali.org</a>
    </p>
    <p style="margin:4px 0 0;font-size:11px;color:#bbb">
      EC Admin: Scan QR at <a href="${CONFIG.QR_SCAN_URL}" style="color:#666">Admin Portal → QR Food Verification</a>
    </p>
  </div>

</div>
</body>
</html>`;
}

// ─── Gmail Transporter (OAuth2) ─────────────────────────────────────
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

// ─── Main ───────────────────────────────────────────────────────────
async function main() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  📧 BANF QR Code Email — Test Sender');
  console.log('═══════════════════════════════════════════════════════════\n');

  // Parse CLI args
  const args = process.argv.slice(2);
  let targetEmail = 'ranadhir.ghosh@gmail.com'; // default
  const toIdx = args.indexOf('--to');
  if (toIdx >= 0 && args[toIdx + 1]) {
    targetEmail = args[toIdx + 1];
  }

  console.log(`📌 Target: ${targetEmail}`);
  console.log(`🎪 Event:  ${CONFIG.EVENT_NAME}\n`);

  // 1. Load attendee from CRM
  console.log('1️⃣  Loading CRM data...');
  const { member, event } = loadAttendee(targetEmail);
  const name = member.displayName || member.firstName || targetEmail;
  console.log(`   ✅ Found: ${name}`);
  console.log(`   Party: ${event.adults || event.partySize || 1}A + ${event.kids || 0}K`);
  console.log(`   Payment: ${member.paymentStatus} ($${member.paymentAmount || 0})\n`);

  // 2. Load QR code
  console.log('2️⃣  Loading QR code...');
  const qrPath = findQRCode(targetEmail);
  const qrBuffer = fs.readFileSync(qrPath);
  const qrFilename = path.basename(qrPath);
  console.log(`   ✅ QR: ${qrFilename} (${qrBuffer.length} bytes)\n`);

  // 3. Build email
  console.log('3️⃣  Building email...');
  const qrCid = 'qr-code-bosonto-2026';
  const html = buildEmailHTML(member, event, qrCid);
  console.log(`   ✅ HTML template ready (${html.length} chars)\n`);

  // 4. Connect to Gmail
  console.log('4️⃣  Connecting to Gmail (OAuth2)...');
  let transporter;
  try {
    transporter = await createTransporter();
    console.log('   ✅ Gmail connected.\n');
  } catch (err) {
    console.error('   ❌ Gmail connection failed:', err.message);
    console.error('   Check OAuth2 credentials / refresh token validity.');
    process.exit(1);
  }

  // 5. Send email
  console.log('5️⃣  Sending email...');
  const subject = `🎟️ Your QR Code — ${CONFIG.EVENT_NAME}`;
  try {
    const info = await transporter.sendMail({
      from: `"${CONFIG.BANF_ORG}" <${CONFIG.BANF_EMAIL}>`,
      to: targetEmail,
      subject: subject,
      html: html,
      attachments: [
        {
          filename: qrFilename,
          content: qrBuffer,
          cid: qrCid
        }
      ]
    });
    console.log(`   ✅ Email sent!`);
    console.log(`   📬 To: ${targetEmail}`);
    console.log(`   📝 Subject: ${subject}`);
    console.log(`   🆔 Message ID: ${info.messageId}\n`);
  } catch (err) {
    console.error('   ❌ Send failed:', err.message);
    process.exit(1);
  }

  // 6. Summary
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  ✅ QR CODE EMAIL SENT SUCCESSFULLY');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`  📬 To:      ${targetEmail} (${name})`);
  console.log(`  🎪 Event:   ${CONFIG.EVENT_NAME}`);
  console.log(`  🔲 QR Code: ${qrFilename}`);
  console.log(`  💰 Payment: ${member.paymentStatus} ($${member.paymentAmount || 0})`);
  console.log('');
  console.log('  📱 NEXT STEPS FOR EC ADMIN:');
  console.log('  1. Open Admin Portal → QR Food Verification');
  console.log(`     ${CONFIG.QR_SCAN_URL}`);
  console.log('  2. Click "Start Camera" or enter email manually');
  console.log('  3. Scan the QR code from the email');
  console.log('  4. Verify attendee details appear correctly');
  console.log('═══════════════════════════════════════════════════════════');
}

main().catch(err => {
  console.error('\n❌ FATAL:', err.message);
  process.exit(1);
});
