#!/usr/bin/env node
/**
 * BANF EC Tenure Report - Verification Email Sender
 * ===================================================
 * Sends EC Tenure Report to all stakeholders requesting verification.
 *
 * Usage:
 *   node _send-ec-tenure-report-emails.js              # DRY RUN (preview only)
 *   node _send-ec-tenure-report-emails.js --send        # SEND emails live
 *   node _send-ec-tenure-report-emails.js --test-only   # Send test email to Ranadhir only
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

// ---- Stakeholder Registry ----
const STAKEHOLDERS = [
  {
    name: 'Ranadhir Ghosh',
    firstName: 'Ranadhir',
    email: 'ranadhir.ghosh@gmail.com',
    roles: ['President (2026-2028)', 'IT Lead']
  },
  {
    name: 'Sudip Roy',
    firstName: 'Sudip',
    email: 'roysu2000@gmail.com',
    roles: ['Stakeholder', 'EC-Admin']
  },
  {
    name: 'Swarnendu Sen',
    firstName: 'Swarnendu',
    email: 'swarnendu.sen@gmail.com',
    roles: ['Stakeholder', 'President (2018-2020)']
  },
  {
    name: 'Saugata Das',
    firstName: 'Saugata',
    email: 'mrsaugatadas@gmail.com',
    roles: ['Stakeholder', 'Vice President (2022-2024)']
  },
  {
    name: 'Suvankar Paul',
    firstName: 'Suvankar',
    email: 'suvankar.paul@gmail.com',
    roles: ['Member', 'President (2024-2026)']
  }
];

// ---- EC Tenure Data (summary for email) ----
const EC_TERMS = [
  {
    term: '2026-2028',
    label: 'Current Term',
    color: '#1e40af',
    members: [
      'Ranadhir Ghosh - President & IT Lead',
      'Partha Mukhopadhyay - Vice President',
      'Amit Saha - Treasurer',
      'Rajanya Ghosh - General Secretary',
      'Moumita Ghosh - Cultural Secretary',
      'Sumanta Mukherjee - Event Coordinator',
      'Rwiti Choudhury - Puja Coordinator'
    ]
  },
  {
    term: '2024-2026',
    label: 'Previous Term',
    color: '#7c3aed',
    members: [
      'Suvankar Paul - President',
      'Anita Mandal - Vice President',
      'Tanay Bhaduri - Assistant Vice President (Bank Signatory)',
      'Partha Mukhopadhyay - General Secretary',
      'Sreya Ghosh - Treasurer (Bank Signatory)',
      'Sharmistha Poddar - Cultural Secretary',
      'Dipra Ghosh - Events Secretary',
      'Sunetra Basu Ghosh - Puja Secretary',
      'Souvik Chakraborty - Social Media Manager'
    ]
  },
  {
    term: '2022-2024',
    label: '',
    color: '#059669',
    members: [
      'Sanjukta Das - President',
      'Saugata Das - Vice President',
      'Anita Mandal - Secretary',
      'Tanay Bhaduri - Treasurer',
      'Jiniya Chandra - Event Coordinator',
      'Stuti Bagchi - Food Secretary',
      'Bhaskar Roy - Inventory Management',
      'Reshma Das - Cultural Secretary',
      'Rwiti Choudhury - Pujo Coordinator',
      'Arnab Sanyal - Social Media'
    ]
  },
  {
    term: '2020-2022',
    label: '',
    color: '#b45309',
    members: [
      'Prianka Natta - President',
      'Sumit Pal - Vice President',
      'Chandrachur Ganguly - Secretary',
      'Suman Ghosh - Treasurer',
      'Sunetra Basu - Cultural Secretary',
      'Kapil Sadhu - Food Secretary',
      'Tanay Bhaduri - Editor'
    ]
  },
  {
    term: '2018-2020',
    label: '',
    color: '#be185d',
    members: [
      'Swarnendu Sen - President',
      'Indrani Dutta - Vice President',
      'Rupanjan Choudhury - General Secretary',
      'Sreya Sen - Treasurer',
      'Anita Chakraborty - Cultural Secretary',
      'Tanay Bhaduri - Food Secretary',
      'Satyabrata De - Editor'
    ]
  }
];

// ---- Helpers ----
function esc(s) { return (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }

// ---- Build EC Summary HTML for email ----
function buildECTermsHTML() {
  return EC_TERMS.map(t => {
    const memberRows = t.members.map(m => {
      const [name, ...roleParts] = m.split(' - ');
      const role = roleParts.join(' - ');
      return `<tr style="border-bottom:1px solid #f0f0f0">
          <td style="padding:5px 8px;font-size:.84rem">${esc(name)}</td>
          <td style="padding:5px 8px;font-size:.84rem;color:#666">${esc(role)}</td>
        </tr>`;
    }).join('\n');

    return `<div style="margin:14px 0">
      <div style="background:${t.color};color:#fff;padding:10px 14px;border-radius:8px 8px 0 0;font-weight:700;font-size:.9rem">
        ${esc(t.term)} EC Term ${t.label ? '(' + esc(t.label) + ')' : ''}
        <span style="float:right;font-weight:400;opacity:.8">${t.members.length} members</span>
      </div>
      <table style="width:100%;border-collapse:collapse;border:1px solid #e0e0e0;border-top:none;border-radius:0 0 8px 8px">
        <tr style="background:#f8f8f8;border-bottom:2px solid #e0e0e0">
          <th style="padding:6px 8px;text-align:left;font-size:.82rem;color:#555;width:45%">Name</th>
          <th style="padding:6px 8px;text-align:left;font-size:.82rem;color:#555">Role / Designation</th>
        </tr>
        ${memberRows}
      </table>
    </div>`;
  }).join('\n');
}

// ---- Email Template ----
function emailECTenureReport(sh) {
  const rolesStr = sh.roles.join(', ');
  const subject = 'BANF EC Tenure Report - Please Verify and Reply';
  const html = `<div style="font-family:'Segoe UI',Arial,Helvetica,sans-serif;max-width:680px;margin:0 auto;background:#ffffff">
  <div style="background:linear-gradient(135deg,#1e3a5f,#2563eb);color:#ffffff;padding:24px 28px;border-radius:10px 10px 0 0">
    <h2 style="margin:0;font-size:1.25rem;font-weight:700">BANF EC Tenure Report</h2>
    <p style="margin:6px 0 0;opacity:.9;font-size:.88rem">Verification Request - 5 Terms, 40 Positions</p>
  </div>

  <div style="padding:24px 28px;border:1px solid #e0e0e0;border-top:none;border-radius:0 0 10px 10px;color:#333333">
    <p style="margin:0 0 14px">Dear <strong>${esc(sh.firstName)}</strong>,</p>

    <p>We have compiled a comprehensive <strong>BANF Executive Committee (EC) Tenure Report</strong>
    covering <strong>5 terms from 2018 to 2028</strong>, with <strong>40 documented positions</strong>
    across all terms. This data has been sourced from official documents including GBM presentations,
    EC Transition records, and Jagriti magazines.</p>

    <p>As a valued stakeholder (<strong>${esc(rolesStr)}</strong>), we need your help to verify
    the accuracy of this report.</p>

    <div style="text-align:center;margin:20px 0">
      <a href="${CONFIG.EC_TENURE_REPORT_URL}" style="display:inline-block;background:linear-gradient(135deg,#1e3a5f,#2563eb);color:#ffffff;padding:14px 36px;border-radius:8px;text-decoration:none;font-weight:700;font-size:.95rem">View Full Interactive Report</a>
    </div>

    <div style="background:#fefce8;border:2px solid #facc15;border-radius:10px;padding:18px;margin:20px 0">
      <div style="font-weight:700;color:#854d0e;font-size:.95rem;margin-bottom:10px">Action Required: Please Verify</div>
      <p style="margin:0 0 10px;font-size:.88rem;color:#555">Please review the EC member list below and reply to this email with:</p>
      <ul style="margin:0;padding-left:20px;font-size:.88rem;color:#555;line-height:1.8">
        <li><strong>"All correct"</strong> - if the information is accurate</li>
        <li><strong>Any corrections</strong> - wrong names, misspellings, incorrect roles, missing members</li>
        <li><strong>Additional terms</strong> - if you know of EC members from terms before 2018</li>
      </ul>
    </div>

    <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:18px;margin:20px 0">
      <div style="font-weight:700;color:#1e3a5f;font-size:.95rem;margin-bottom:12px">EC Tenure Summary (All 5 Terms)</div>
      ${buildECTermsHTML()}
    </div>

    <div style="background:#eff6ff;border:1px solid #93c5fd;border-radius:8px;padding:14px;margin:18px 0">
      <strong style="color:#1e40af">Data Sources:</strong>
      <ul style="margin:8px 0 0;padding-left:18px;color:#555555;font-size:.84rem;line-height:1.7">
        <li>BANF GBM Presentation (March 2024)</li>
        <li>EC Transition PPTX (2024-2026)</li>
        <li>Jagriti Magazines (2019-2025, 7 issues)</li>
        <li>BANF official records</li>
      </ul>
    </div>

    <p style="font-size:.88rem;color:#555">Simply <strong>reply to this email</strong> with any corrections or confirmations.
    Your response will help us maintain accurate historical records for BANF.</p>

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
async function sendEmail(transporter, sh, testMode) {
  const emailContent = emailECTenureReport(sh);
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
  console.log('  BANF EC Tenure Report - Verification Email Sender');
  console.log('  Mode: ' + (doSend ? 'LIVE SEND' : testOnly ? 'TEST ONLY (Ranadhir)' : 'DRY RUN (preview)'));
  console.log('  Date: ' + new Date().toISOString());
  console.log('='.repeat(68));
  console.log('');

  const targets = testOnly
    ? STAKEHOLDERS.filter(s => s.email === CONFIG.TEST_EMAIL)
    : STAKEHOLDERS;

  // Preview
  for (const sh of targets) {
    const emailContent = emailECTenureReport(sh);
    console.log(`--- ${sh.name} ---`);
    console.log(`  To:      ${sh.email}`);
    console.log(`  Subject: ${emailContent.subject}`);
    console.log(`  Roles:   ${sh.roles.join(', ')}`);
    console.log('');
  }

  if (!doSend && !testOnly) {
    console.log('DRY RUN complete. No emails sent.');
    console.log('Use --send to send all, or --test-only to send test to Ranadhir.');
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
    const sh = targets[i];
    const testMode = testOnly;
    console.log(`[${i + 1}/${targets.length}] Sending to ${sh.name} (${sh.email})...`);

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
