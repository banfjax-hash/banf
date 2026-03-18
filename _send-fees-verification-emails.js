#!/usr/bin/env node
/**
 * BANF Membership Fees Verification - Email to Current EC
 * ========================================================
 * Sends the current membership fee structure (as displayed on the
 * landing page) to all current EC members (2026-2028) for verification.
 *
 * Usage:
 *   node _send-fees-verification-emails.js              # DRY RUN (preview)
 *   node _send-fees-verification-emails.js --send        # SEND to all EC
 *   node _send-fees-verification-emails.js --test-only   # Send test to Ranadhir
 */

const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');

// ---- Configuration ----
const CONFIG = {
  BANF_EMAIL: 'banfjax@gmail.com',
  BANF_ORG: 'BANF - Bengali Association of North Florida',
  BANF_WEBSITE: 'https://www.jaxbengali.org',
  LANDING_PAGE_URL: 'https://www.jaxbengali.org/_functions/home',
  TEST_EMAIL: 'ranadhir.ghosh@gmail.com',
  SEND_DELAY_MS: 2000
};

// ---- Gmail OAuth2 credentials ----
let GMAIL = { CLIENT_ID: '', CLIENT_SECRET: '', REFRESH_TOKEN: '' };
const secretsPath = path.join(__dirname, '.banf-secrets.json');
try {
  const secrets = JSON.parse(fs.readFileSync(secretsPath, 'utf8'));
  GMAIL.CLIENT_ID = secrets.CLIENT_ID || '';
  GMAIL.CLIENT_SECRET = secrets.CLIENT_SECRET || '';
  GMAIL.REFRESH_TOKEN = secrets.REFRESH_TOKEN || '';
} catch (e) {
  GMAIL.CLIENT_ID = process.env.BANF_GMAIL_CLIENT_ID || '';
  GMAIL.CLIENT_SECRET = process.env.BANF_GMAIL_CLIENT_SECRET || '';
  GMAIL.REFRESH_TOKEN = process.env.BANF_GMAIL_REFRESH_TOKEN || '';
}

// ---- Current EC Members (2026-2028) ----
const EC_MEMBERS = [
  { name: 'Dr. Ranadhir Ghosh', firstName: 'Ranadhir', email: 'ranadhir.ghosh@gmail.com', role: 'President / IT Lead' },
  { name: 'Partha Mukhopadhyay', firstName: 'Partha', email: 'mukhopadhyay.partha@gmail.com', role: 'Vice President' },
  { name: 'Amit Chandak', firstName: 'Amit', email: 'amit.everywhere@gmail.com', role: 'Treasurer' },
  { name: 'Rajanya Ghosh', firstName: 'Rajanya', email: 'rajanya.ghosh@gmail.com', role: 'General Secretary' },
  { name: 'Dr. Moumita Ghosh', firstName: 'Moumita', email: 'moumita.mukherje@gmail.com', role: 'Cultural Secretary' },
  { name: 'Soumyajit Dutta (Banty)', firstName: 'Soumyajit', email: 'duttasoumyajit86@gmail.com', role: 'Food Coordinator' },
  { name: 'Dr. Sumanta Ghosh', firstName: 'Sumanta', email: 'sumo475@gmail.com', role: 'Event Coordinator' },
  { name: 'Rwiti Choudhury', firstName: 'Rwiti', email: 'rwitichoudhury@gmail.com', role: 'Puja Coordinator' }
];

// ---- Membership Fee Data (exactly as displayed on landing page) ----
const FEE_TIERS = [
  {
    name: 'M2 Premium (Early Bird)',
    events: 'All 17 events',
    note: 'Available until May 31, 2026',
    color: '#c8a23c',
    family: 375, couple: 290, individual: 215, student: 145
  },
  {
    name: 'M2 Premium',
    events: 'All 17 events',
    note: 'After May 31, 2026',
    color: '#6f42c1',
    family: 410, couple: 330, individual: 240, student: 175
  },
  {
    name: 'M1 Regular',
    events: '11 events',
    note: 'Excludes 6 premium events',
    color: '#6c757d',
    family: 280, couple: 255, individual: 140, student: 100
  },
  {
    name: 'Culture Special Pass',
    events: '4 cultural events',
    note: 'Cultural events only',
    color: '#e83e8c',
    family: 200, couple: 175, individual: 100, student: 75
  },
  {
    name: 'Durga Puja Celebration',
    events: '5 events (Puja + Artist)',
    note: 'Puja + Artist performances',
    color: '#ff9800',
    family: 210, couple: 175, individual: 110, student: 80
  },
  {
    name: 'Durga Puja Core Pass',
    events: '3 Puja events (no artist)',
    note: 'Puja only, no artist programs',
    color: '#20c997',
    family: 150, couple: 125, individual: 80, student: 60
  }
];

// ---- Helpers ----
function esc(s) { return (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }

// ---- Build Fee Table HTML ----
function buildFeeTableHTML() {
  const rows = FEE_TIERS.map(t => `
        <tr>
          <td style="padding:10px 12px;font-weight:700;border-bottom:1px solid #e0e0e0">
            <span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${t.color};margin-right:8px"></span>
            ${esc(t.name)}
            <div style="font-size:.72rem;color:#888;font-weight:400;margin-top:2px">${esc(t.events)} — ${esc(t.note)}</div>
          </td>
          <td style="padding:10px 8px;text-align:center;font-weight:700;border-bottom:1px solid #e0e0e0;font-size:1rem">$${t.family}</td>
          <td style="padding:10px 8px;text-align:center;font-weight:700;border-bottom:1px solid #e0e0e0;font-size:1rem">$${t.couple}</td>
          <td style="padding:10px 8px;text-align:center;font-weight:700;border-bottom:1px solid #e0e0e0;font-size:1rem">$${t.individual}</td>
          <td style="padding:10px 8px;text-align:center;font-weight:700;border-bottom:1px solid #e0e0e0;font-size:1rem">$${t.student}</td>
        </tr>`).join('\n');

  return `<table style="width:100%;border-collapse:collapse;font-size:.88rem;border:2px solid #1e3a5f;border-radius:8px;overflow:hidden">
      <thead>
        <tr style="background:#1e3a5f;color:#fff">
          <th style="padding:12px;text-align:left;font-size:.82rem">Tier / Category</th>
          <th style="padding:12px;text-align:center;font-size:.82rem;width:80px">Family</th>
          <th style="padding:12px;text-align:center;font-size:.82rem;width:80px">Couple</th>
          <th style="padding:12px;text-align:center;font-size:.82rem;width:80px">Individual</th>
          <th style="padding:12px;text-align:center;font-size:.82rem;width:80px">Student</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>`;
}

// ---- Email Template ----
function emailFeesVerification(member) {
  const subject = 'URGENT: BANF Membership Fees Verification — Please Reply ASAP';
  const html = `<div style="font-family:'Segoe UI',Arial,Helvetica,sans-serif;max-width:720px;margin:0 auto;background:#ffffff">
  <div style="background:linear-gradient(135deg,#1e3a5f,#2563eb);color:#ffffff;padding:24px 28px;border-radius:10px 10px 0 0">
    <h2 style="margin:0;font-size:1.25rem;font-weight:700">BANF Membership Fees — Verification Request</h2>
    <p style="margin:6px 0 0;opacity:.9;font-size:.88rem">FY 2026-27 • 6 Tiers • 4 Member Types</p>
  </div>

  <div style="padding:24px 28px;border:1px solid #e0e0e0;border-top:none;border-radius:0 0 10px 10px;color:#333333">
    <p style="margin:0 0 14px">Dear <strong>${esc(member.firstName)}</strong>,</p>

    <p>As <strong>${esc(member.role)}</strong> of the current BANF EC (2026-2028), we need your help
    to verify the membership fee structure currently published on our website.</p>

    <div style="background:#fef2f2;border:2px solid #ef4444;border-radius:10px;padding:16px;margin:18px 0">
      <div style="font-weight:700;color:#dc2626;font-size:.95rem;margin-bottom:6px">⚠️ Action Required — Please Reply ASAP</div>
      <p style="margin:0;font-size:.88rem;color:#555">Please review the fee table below and reply to this email with:</p>
      <ul style="margin:8px 0 0;padding-left:20px;font-size:.88rem;color:#555;line-height:1.8">
        <li><strong>"All numbers are correct"</strong> — if everything looks good</li>
        <li><strong>Which category/tier</strong> has the wrong number, and <strong>what the correct value should be</strong></li>
      </ul>
    </div>

    <div style="margin:20px 0">
      <div style="font-weight:700;color:#1e3a5f;font-size:.95rem;margin-bottom:12px">Current Membership Fees on Website (FY 2026-27)</div>
      ${buildFeeTableHTML()}
    </div>

    <div style="background:#f0f9ff;border:1px solid #93c5fd;border-radius:8px;padding:14px;margin:18px 0">
      <strong style="color:#1e40af">Member Type Definitions:</strong>
      <ul style="margin:8px 0 0;padding-left:18px;color:#555;font-size:.84rem;line-height:1.7">
        <li><strong>Family</strong> — Couple + dependent children</li>
        <li><strong>Couple</strong> — Two adults</li>
        <li><strong>Individual</strong> — One adult</li>
        <li><strong>Student</strong> — Full-time student</li>
      </ul>
    </div>

    <div style="background:#fefce8;border:1px solid #fbbf24;border-radius:8px;padding:14px;margin:18px 0">
      <strong style="color:#854d0e">How to Reply:</strong>
      <p style="margin:8px 0 0;font-size:.88rem;color:#555">Just hit <strong>Reply</strong> to this email. Examples:</p>
      <ul style="margin:8px 0 0;padding-left:18px;color:#555;font-size:.84rem;line-height:1.8">
        <li>"All numbers are correct" ✅</li>
        <li>"M2 Premium Early Bird Couple should be $330, not $290"</li>
        <li>"Durga Puja Core Student should be $55 instead of $60"</li>
      </ul>
    </div>

    <div style="text-align:center;margin:22px 0">
      <a href="${CONFIG.LANDING_PAGE_URL}" style="display:inline-block;background:linear-gradient(135deg,#1e3a5f,#2563eb);color:#ffffff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:700;font-size:.92rem">View Fees on Live Website</a>
    </div>

    <p style="font-size:.88rem;color:#555">We need to ensure the published fees are 100% accurate before the membership drive opens.
    <strong>Please reply at your earliest convenience.</strong></p>

    <p style="color:#777;font-size:.82rem;margin-top:24px;border-top:1px solid #eee;padding-top:14px">
      ${esc(CONFIG.BANF_ORG)}<br>
      <a href="${CONFIG.BANF_WEBSITE}" style="color:#1e40af">${CONFIG.BANF_WEBSITE}</a> |
      <a href="mailto:${CONFIG.BANF_EMAIL}" style="color:#1e40af">${CONFIG.BANF_EMAIL}</a>
    </p>
  </div>
</div>`;
  return { subject, html };
}

// ---- Transporter ----
async function createTransporter() {
  if (!GMAIL.CLIENT_ID || !GMAIL.REFRESH_TOKEN) {
    throw new Error('Gmail OAuth2 credentials not found. Check .banf-secrets.json or env vars.');
  }
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

// ---- Send one email ----
async function sendEmail(transporter, member, testMode) {
  const emailContent = emailFeesVerification(member);
  const actualTo = testMode ? CONFIG.TEST_EMAIL : member.email;
  const actualSubject = testMode && member.email !== CONFIG.TEST_EMAIL
    ? `[TEST -> ${member.email}] ${emailContent.subject}`
    : emailContent.subject;

  const mailOptions = {
    from: `"${CONFIG.BANF_ORG}" <${CONFIG.BANF_EMAIL}>`,
    to: actualTo,
    replyTo: CONFIG.BANF_EMAIL,
    subject: actualSubject,
    html: emailContent.html
  };

  const info = await transporter.sendMail(mailOptions);
  return {
    messageId: info.messageId,
    to: actualTo,
    originalTo: member.email,
    subject: actualSubject,
    name: member.name,
    accepted: info.accepted,
    timestamp: new Date().toISOString()
  };
}

// ---- Main ----
async function main() {
  const args = process.argv.slice(2);
  const doSend = args.includes('--send');
  const testOnly = args.includes('--test-only');

  console.log('='.repeat(68));
  console.log('  BANF Membership Fees Verification - Email to EC (2026-2028)');
  console.log('  Mode: ' + (doSend ? 'LIVE SEND' : testOnly ? 'TEST ONLY (Ranadhir)' : 'DRY RUN (preview)'));
  console.log('  Date: ' + new Date().toISOString());
  console.log('='.repeat(68));
  console.log('');

  // Print fee summary
  console.log('  FEE STRUCTURE (as on landing page):');
  console.log('  ' + '-'.repeat(64));
  console.log('  Tier                          Family  Couple  Indiv   Student');
  console.log('  ' + '-'.repeat(64));
  for (const t of FEE_TIERS) {
    const n = (t.name + ' '.repeat(32)).slice(0, 32);
    console.log(`  ${n}$${t.family}\t$${t.couple}\t$${t.individual}\t$${t.student}`);
  }
  console.log('  ' + '-'.repeat(64));
  console.log('');

  const targets = testOnly
    ? EC_MEMBERS.filter(m => m.email === CONFIG.TEST_EMAIL)
    : EC_MEMBERS;

  // Preview
  for (const m of targets) {
    console.log(`--- ${m.name} (${m.role}) ---`);
    console.log(`  To: ${m.email}`);
    console.log('');
  }

  if (!doSend && !testOnly) {
    console.log('DRY RUN complete. No emails sent.');
    console.log('Use --send to send to all EC, or --test-only to send test to Ranadhir.');
    return;
  }

  console.log('Creating Gmail transporter...');
  let transporter;
  try {
    transporter = await createTransporter();
    console.log('Transporter verified OK.\n');
  } catch (err) {
    console.error('ERROR: Failed to create transporter:', err.message);
    return;
  }

  const results = [];
  for (let i = 0; i < targets.length; i++) {
    const m = targets[i];
    const testMode = testOnly;
    console.log(`[${i + 1}/${targets.length}] Sending to ${m.name} (${m.email})...`);

    try {
      const result = await sendEmail(transporter, m, testMode);
      results.push(result);
      console.log(`  OK: ${result.messageId}`);
    } catch (err) {
      console.error(`  FAILED: ${err.message}`);
      results.push({ name: m.name, email: m.email, error: err.message });
    }

    if (i < targets.length - 1) {
      await new Promise(r => setTimeout(r, CONFIG.SEND_DELAY_MS));
    }
  }

  // Summary
  console.log('\n' + '='.repeat(68));
  console.log('  RESULTS SUMMARY');
  console.log('='.repeat(68));
  const ok = results.filter(r => r.messageId);
  const fail = results.filter(r => r.error);
  console.log(`  Sent:   ${ok.length}`);
  console.log(`  Failed: ${fail.length}`);
  console.log(`  Total:  ${targets.length}`);
  if (fail.length) {
    console.log('\n  FAILURES:');
    fail.forEach(f => console.log(`    - ${f.name} (${f.email}): ${f.error}`));
  }
  console.log('\n' + '='.repeat(68));
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
