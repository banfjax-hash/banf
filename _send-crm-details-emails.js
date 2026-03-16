#!/usr/bin/env node
/**
 * BANF CRM Details Collection - Email Sender
 * ============================================
 * Sends emails to all stakeholders asking them to verify/update their
 * personal and family details for the BANF CRM.
 *
 * Usage:
 *   node _send-crm-details-emails.js              # DRY RUN (preview only)
 *   node _send-crm-details-emails.js --send        # SEND emails live
 *   node _send-crm-details-emails.js --test-only   # Send test email to Ranadhir only
 */

const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');

// ---- Configuration ----
const CONFIG = {
  BANF_EMAIL: 'banfjax@gmail.com',
  BANF_ORG: 'BANF - Bengali Association of North Florida',
  BANF_WEBSITE: 'https://www.jaxbengali.org',
  EC_TENURE_REPORT_URL: 'https://banfjax-hash.github.io/banf/BANF_EC_TENURE_REPORT.html',
  STAKEHOLDER_PORTAL_URL: 'https://banfjax-hash.github.io/banf/BANF_STAKEHOLDER_PORTAL.html',
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

// ---- Stakeholder CRM Data (current records) ----
const STAKEHOLDERS = [
  {
    name: 'Ranadhir Ghosh',
    firstName: 'Ranadhir',
    email: 'ranadhir.ghosh@gmail.com',
    familyName: 'Ranadhir & Moumita Ghosh',
    spouseName: 'Moumita Ghosh',
    roles: ['President (2026-2028)', 'Vice President (2022-2024)', 'IT Lead', 'Super Admin'],
    memberSince: '2022',
    crmFields: {
      phone: 'On file',
      address: 'On file',
      profession: 'On file',
      children: 'On file'
    }
  },
  {
    name: 'Sudip Roy',
    firstName: 'Sudip',
    email: 'roysu2000@gmail.com',
    familyName: 'Sudip & Ipshita Roy',
    spouseName: 'Ipshita Roy',
    roles: ['Member', 'Former EC (2024-2025)'],
    memberSince: '2022',
    crmFields: {
      phone: 'On file',
      address: 'On file',
      profession: 'Needs update',
      children: 'Needs update'
    }
  },
  {
    name: 'Swarnendu Sen',
    firstName: 'Swarnendu',
    email: 'swarnendu.sen@gmail.com',
    familyName: 'Swarnendu & Sreya Sen',
    spouseName: 'Sreya Sen',
    roles: ['Member'],
    memberSince: '2022',
    crmFields: {
      phone: 'On file',
      address: 'On file',
      profession: 'Needs update',
      children: 'Needs update'
    }
  },
  {
    name: 'Saugata Das',
    firstName: 'Saugata',
    email: 'mrsaugatadas@gmail.com',
    familyName: 'Saugata & Reshma Das',
    spouseName: 'Reshma Das',
    roles: ['Member', 'EC Member (2024-2025)'],
    memberSince: '2022',
    crmFields: {
      phone: 'On file',
      address: 'On file',
      profession: 'Needs update',
      children: 'Needs update'
    }
  },
  {
    name: 'Suvankar Paul',
    firstName: 'Suvankar',
    email: 'suvankar.paul@gmail.com',
    familyName: 'Suvankar & Paramita Paul',
    spouseName: 'Paramita Paul',
    roles: ['Member', 'President (2022-2026)', 'Joint Secretary (2026-2028)'],
    memberSince: '2022',
    crmFields: {
      phone: 'On file',
      address: 'On file',
      profession: 'Needs update',
      children: 'Needs update'
    }
  }
];

// ---- Helpers ----
function esc(s) { return (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }

// ---- CRM Details Email Template ----
function emailCRMDetails(sh) {
  const rolesStr = sh.roles.join(', ');
  const subject = 'BANF CRM - Please Verify Your Personal and Family Details';
  const html = `<div style="font-family:'Segoe UI',Arial,Helvetica,sans-serif;max-width:620px;margin:0 auto;background:#ffffff">
  <div style="background:linear-gradient(135deg,#0f766e,#14b8a6);color:#ffffff;padding:24px 28px;border-radius:10px 10px 0 0">
    <h2 style="margin:0;font-size:1.25rem;font-weight:700">BANF CRM - Data Verification</h2>
    <p style="margin:6px 0 0;opacity:.9;font-size:.88rem">Help Us Keep Your Records Accurate</p>
  </div>

  <div style="padding:24px 28px;border:1px solid #e0e0e0;border-top:none;border-radius:0 0 10px 10px;color:#333333">
    <p style="margin:0 0 14px">Dear <strong>${esc(sh.firstName)}</strong>,</p>

    <p>We are updating the <strong>BANF Member CRM</strong> to ensure all personal and family
    details are accurate. As a valued member and stakeholder, we need your help to verify
    and correct the information we currently have on file.</p>

    <div style="background:#f0fdfa;border:2px solid #14b8a6;border-radius:10px;padding:16px;margin:18px 0">
      <div style="font-size:.82rem;color:#0f766e;font-weight:600;margin-bottom:8px">What We Currently Have on File</div>
      <table style="width:100%;border-collapse:collapse;font-size:.88rem">
        <tr style="border-bottom:1px solid #d1fae5">
          <td style="padding:6px 8px;font-weight:600;color:#0f766e;width:140px">Full Name</td>
          <td style="padding:6px 8px">${esc(sh.name)}</td>
        </tr>
        <tr style="border-bottom:1px solid #d1fae5">
          <td style="padding:6px 8px;font-weight:600;color:#0f766e">Spouse Name</td>
          <td style="padding:6px 8px">${esc(sh.spouseName)}</td>
        </tr>
        <tr style="border-bottom:1px solid #d1fae5">
          <td style="padding:6px 8px;font-weight:600;color:#0f766e">Family Name</td>
          <td style="padding:6px 8px">${esc(sh.familyName)}</td>
        </tr>
        <tr style="border-bottom:1px solid #d1fae5">
          <td style="padding:6px 8px;font-weight:600;color:#0f766e">Roles</td>
          <td style="padding:6px 8px">${esc(rolesStr)}</td>
        </tr>
        <tr>
          <td style="padding:6px 8px;font-weight:600;color:#0f766e">Member Since</td>
          <td style="padding:6px 8px">${esc(sh.memberSince)}</td>
        </tr>
      </table>
    </div>

    <div style="background:#fefce8;border:2px solid #facc15;border-radius:10px;padding:18px;margin:18px 0">
      <div style="font-weight:700;color:#854d0e;font-size:.95rem;margin-bottom:10px">Please Reply With Updates For:</div>
      <p style="margin:0 0 12px;font-size:.88rem;color:#555555">Simply reply to this email with any corrections or additions. If the information above is correct, just reply with <strong>"All correct"</strong>.</p>
      <table style="width:100%;border-collapse:collapse;font-size:.88rem">
        <tr style="border-bottom:1px solid #fef08a">
          <td style="padding:6px 8px;font-weight:600;color:#854d0e;width:40px">1.</td>
          <td style="padding:6px 8px"><strong>Your full name</strong> (with any preferred title: Dr., Mr., Mrs., etc.)</td>
        </tr>
        <tr style="border-bottom:1px solid #fef08a">
          <td style="padding:6px 8px;font-weight:600;color:#854d0e">2.</td>
          <td style="padding:6px 8px"><strong>Spouse full name</strong> (correct spelling please)</td>
        </tr>
        <tr style="border-bottom:1px solid #fef08a">
          <td style="padding:6px 8px;font-weight:600;color:#854d0e">3.</td>
          <td style="padding:6px 8px"><strong>Children names and ages</strong> (if any)</td>
        </tr>
        <tr style="border-bottom:1px solid #fef08a">
          <td style="padding:6px 8px;font-weight:600;color:#854d0e">4.</td>
          <td style="padding:6px 8px"><strong>Phone number</strong> (primary contact)</td>
        </tr>
        <tr style="border-bottom:1px solid #fef08a">
          <td style="padding:6px 8px;font-weight:600;color:#854d0e">5.</td>
          <td style="padding:6px 8px"><strong>Home address</strong> (city, state, zip)</td>
        </tr>
        <tr style="border-bottom:1px solid #fef08a">
          <td style="padding:6px 8px;font-weight:600;color:#854d0e">6.</td>
          <td style="padding:6px 8px"><strong>Profession / Employer</strong></td>
        </tr>
        <tr>
          <td style="padding:6px 8px;font-weight:600;color:#854d0e">7.</td>
          <td style="padding:6px 8px"><strong>EC role history</strong> (any past or current BANF EC roles with years)</td>
        </tr>
      </table>
    </div>

    <div style="background:#eff6ff;border:1px solid #93c5fd;border-radius:8px;padding:14px;margin:18px 0">
      <strong style="color:#1e40af">Why is this important?</strong>
      <ul style="margin:8px 0 0;padding-left:18px;color:#555555;font-size:.84rem;line-height:1.7">
        <li>Ensures correct names in event invitations and announcements</li>
        <li>Accurate family records for Durga Puja, Saraswati Puja, and Holi celebrations</li>
        <li>Proper EC role attribution in our tenure records</li>
        <li>Emergency contact information for community events</li>
      </ul>
    </div>

    <div style="text-align:center;margin:24px 0">
      <a href="${CONFIG.EC_TENURE_REPORT_URL}" style="display:inline-block;background:linear-gradient(135deg,#0f766e,#14b8a6);color:#ffffff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:700;font-size:.92rem">View EC Tenure Report</a>
    </div>

    <p style="font-size:.88rem;color:#555555;margin-top:16px">
      You can also view the EC tenure history and verify your role attributions in our
      <a href="${CONFIG.EC_TENURE_REPORT_URL}" style="color:#0f766e;font-weight:600">EC Tenure Report</a>.
    </p>

    <p style="font-size:.88rem;color:#555555">Simply <strong>reply to this email</strong> with your updates. We will process and confirm within 24 hours.</p>

    <p style="color:#777777;font-size:.82rem;margin-top:24px;border-top:1px solid #eeeeee;padding-top:14px">
      ${esc(CONFIG.BANF_ORG)}<br>
      <a href="${CONFIG.BANF_WEBSITE}" style="color:#0f766e">${CONFIG.BANF_WEBSITE}</a> |
      <a href="mailto:${CONFIG.BANF_EMAIL}" style="color:#0f766e">${CONFIG.BANF_EMAIL}</a>
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
async function sendEmail(transporter, sh, testMode) {
  const emailContent = emailCRMDetails(sh);
  const actualTo = testMode ? CONFIG.TEST_EMAIL : sh.email;
  const actualSubject = testMode && sh.email !== CONFIG.TEST_EMAIL
    ? `[TEST -> ${sh.email}] ${emailContent.subject}`
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
    originalTo: sh.email,
    subject: actualSubject,
    name: sh.name,
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
  console.log('  BANF CRM Details Collection - Email Sender');
  console.log('  Mode: ' + (doSend ? 'LIVE SEND' : testOnly ? 'TEST ONLY (Ranadhir)' : 'DRY RUN (preview)'));
  console.log('  Date: ' + new Date().toISOString());
  console.log('='.repeat(68));
  console.log('');

  const targets = testOnly
    ? STAKEHOLDERS.filter(s => s.email === CONFIG.TEST_EMAIL)
    : STAKEHOLDERS;

  // Preview
  for (const sh of targets) {
    const emailContent = emailCRMDetails(sh);
    console.log(`--- ${sh.name} ---`);
    console.log(`  To:      ${sh.email}`);
    console.log(`  Subject: ${emailContent.subject}`);
    console.log(`  Spouse:  ${sh.spouseName}`);
    console.log(`  Roles:   ${sh.roles.join(', ')}`);
    console.log('');
  }

  if (!doSend && !testOnly) {
    console.log('DRY RUN complete. No emails sent.');
    console.log('Use --send to send all emails, or --test-only to send test to Ranadhir.');
    return;
  }

  console.log('Creating Gmail transporter...');
  let transporter;
  try {
    transporter = await createTransporter();
    console.log('Transporter verified OK.');
  } catch (err) {
    console.error('ERROR: Failed to create transporter:', err.message);
    return;
  }

  const results = [];
  for (let i = 0; i < targets.length; i++) {
    const sh = targets[i];
    const testMode = testOnly || !doSend;
    console.log(`\n[${i + 1}/${targets.length}] Sending to ${sh.name} (${sh.email})...`);

    try {
      const result = await sendEmail(transporter, sh, testMode);
      results.push(result);
      console.log(`  OK: ${result.messageId}`);
      console.log(`  To: ${result.to} | Subject: ${result.subject}`);
    } catch (err) {
      console.error(`  FAILED: ${err.message}`);
      results.push({ name: sh.name, email: sh.email, error: err.message });
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
