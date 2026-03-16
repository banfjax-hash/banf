#!/usr/bin/env node
/**
 * BANF Stakeholder Drive - Email Sender
 * ======================================
 * Sends stakeholder portal onboarding emails to designated stakeholders.
 *
 * Three scenarios handled:
 *   A) Already signed up (e.g. Ranadhir Ghosh) - access notification only
 *   B) Existing member, needs stakeholder signup - signup instructions
 *   C) New stakeholder, needs full signup - full onboarding email
 *
 * Usage:
 *   node _send-stakeholder-drive-emails.js              # DRY RUN (preview only)
 *   node _send-stakeholder-drive-emails.js --send        # SEND emails
 *   node _send-stakeholder-drive-emails.js --test-only   # Send test email to Ranadhir only
 */

const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');

// ---- Configuration ----
const CONFIG = {
  BANF_EMAIL: 'banfjax@gmail.com',
  BANF_ORG: 'BANF - Bengali Association of North Florida',
  BANF_WEBSITE: 'https://www.jaxbengali.org',
  STAKEHOLDER_PORTAL_URL: 'https://banfjax-hash.github.io/banf/BANF_STAKEHOLDER_PORTAL.html',
  MEMBER_PORTAL_URL: 'https://banfwix.wixsite.com/banf1/_functions/member_portal',
  EC_ADMIN_PORTAL_URL: 'https://banfjax-hash.github.io/banf/BANF_SUPER_ADMIN_PORTAL.html',
  SIGNUP_URL: 'https://banfjax-hash.github.io/banf/BANF_STAKEHOLDER_PORTAL.html#signup',
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
  // Fall back to env vars
  GMAIL.CLIENT_ID = process.env.BANF_GMAIL_CLIENT_ID || '';
  GMAIL.CLIENT_SECRET = process.env.BANF_GMAIL_CLIENT_SECRET || '';
  GMAIL.REFRESH_TOKEN = process.env.BANF_GMAIL_REFRESH_TOKEN || '';
}

// ---- Stakeholder Registry ----
// scenario: 'already_signed_up' | 'existing_member' | 'new_stakeholder'
const STAKEHOLDERS = [
  {
    name: 'Ranadhir Ghosh',
    firstName: 'Ranadhir',
    email: 'ranadhir.ghosh@gmail.com',
    username: 'ranadhir.ghosh',
    scenario: 'already_signed_up',
    roles: ['President', 'Super Admin', 'EC Member', 'Member'],
    stakeholderRole: 'Technical Lead & Super Admin',
    familyName: 'Ranadhir & Moumita Ghosh',
    memberSince: '2022'
  },
  {
    name: 'Sudip Roy',
    firstName: 'Sudip',
    email: 'roysu2000@gmail.com',
    username: 'sudip.roy',
    scenario: 'existing_member',
    roles: ['Member', 'Former EC (2024-25)'],
    stakeholderRole: 'Business Stakeholder',
    familyName: 'Sudip & Ipshita Roy',
    memberSince: '2022'
  },
  {
    name: 'Swarnendu Sen',
    firstName: 'Swarnendu',
    email: 'swarnendu.sen@gmail.com',
    username: 'swarnendu.sen',
    scenario: 'existing_member',
    roles: ['Member'],
    stakeholderRole: 'Business Stakeholder',
    familyName: 'Swarnendu & Sreya Sen',
    memberSince: '2022'
  },
  {
    name: 'Saugata Das',
    firstName: 'Saugata',
    email: 'mrsaugatadas@gmail.com',
    username: 'saugata.das',
    scenario: 'existing_member',
    roles: ['Member', 'EC Member (2024-25)'],
    stakeholderRole: 'Business Stakeholder',
    familyName: 'Saugata & Reshma Das',
    memberSince: '2022'
  },
  {
    name: 'Suvankar Paul',
    firstName: 'Suvankar',
    email: 'suvankar.paul@gmail.com',
    username: 'suvankar.paul',
    scenario: 'existing_member',
    roles: ['Member', 'President (2022-2026)', 'Joint Secretary (2026-2028)'],
    stakeholderRole: 'Business Stakeholder',
    familyName: 'Suvankar & Paramita Paul',
    memberSince: '2022'
  }
];

// ---- Helpers ----
function esc(s) { return (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }

function mimeEncodeSubject(subject) {
  // Only ASCII in subject to avoid junk characters
  // If all ASCII, return as-is; otherwise MIME-encode
  if (/^[\x20-\x7E]+$/.test(subject)) return subject;
  return '=?UTF-8?B?' + Buffer.from(subject, 'utf8').toString('base64') + '?=';
}

// ---- Email Templates ----

/**
 * Scenario A: Already signed up.
 * Ranadhir is president + super admin + member. Just inform about stakeholder portal access.
 */
function emailAlreadySignedUp(sh) {
  const rolesStr = sh.roles.join(', ');
  const subject = 'BANF Stakeholder Portal - Your Access is Ready';
  const html = `<div style="font-family:'Segoe UI',Arial,Helvetica,sans-serif;max-width:620px;margin:0 auto;background:#ffffff">
  <div style="background:linear-gradient(135deg,#1e40af,#3b82f6);color:#ffffff;padding:24px 28px;border-radius:10px 10px 0 0">
    <h2 style="margin:0;font-size:1.25rem;font-weight:700">BANF Stakeholder Portal</h2>
    <p style="margin:6px 0 0;opacity:.9;font-size:.88rem">Your Access is Ready</p>
  </div>

  <div style="padding:24px 28px;border:1px solid #e0e0e0;border-top:none;border-radius:0 0 10px 10px;color:#333333">
    <p style="margin:0 0 14px">Dear <strong>${esc(sh.firstName)}</strong>,</p>

    <p>As BANF's <strong>${esc(sh.stakeholderRole)}</strong>, we are pleased to inform you that the
    <strong>BANF Stakeholder Portal</strong> is now live and your access has been activated.</p>

    <div style="background:#eff6ff;border:2px solid #3b82f6;border-radius:10px;padding:16px;margin:18px 0;text-align:center">
      <div style="font-size:.82rem;color:#1e40af;font-weight:600;margin-bottom:8px">Your Current Roles</div>
      <div style="font-size:1rem;font-weight:700;color:#1e40af">${esc(rolesStr)}</div>
    </div>

    <p><strong>What you can do on the Stakeholder Portal:</strong></p>
    <ul style="padding-left:20px;color:#555555;line-height:1.8">
      <li>View system overview, DevOps board, and deployment status</li>
      <li>Review and approve requirements</li>
      <li>Monitor AI agent dashboards and execution frameworks</li>
      <li>Access data governance and system telemetry</li>
      <li>Review development and testing progress</li>
    </ul>

    <div style="background:#f0fdf4;border:1px solid #86efac;border-radius:8px;padding:14px;margin:18px 0">
      <strong style="color:#166534">Your existing credentials work everywhere:</strong>
      <ul style="margin:8px 0 0;padding-left:18px;color:#555555;font-size:.88rem">
        <li><strong>Stakeholder Portal</strong> - Read-only stakeholder dashboard</li>
        <li><strong>Super Admin Portal</strong> - Full admin access</li>
        <li><strong>Member Portal</strong> - Member services</li>
        <li><strong>EC Admin Portal</strong> - Executive Committee functions</li>
      </ul>
    </div>

    <div style="text-align:center;margin:24px 0">
      <a href="${CONFIG.STAKEHOLDER_PORTAL_URL}" style="display:inline-block;background:linear-gradient(135deg,#1e40af,#3b82f6);color:#ffffff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:700;font-size:.92rem">Open Stakeholder Portal</a>
    </div>

    <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:12px;margin:16px 0;font-size:.84rem">
      <strong>Login:</strong> Use your existing username <code style="background:#f1f5f9;padding:2px 6px;border-radius:4px">${esc(sh.username)}</code> and your current password.
    </div>

    <p style="color:#777777;font-size:.82rem;margin-top:24px;border-top:1px solid #eeeeee;padding-top:14px">
      ${esc(CONFIG.BANF_ORG)}<br>
      <a href="${CONFIG.BANF_WEBSITE}" style="color:#3b82f6">${CONFIG.BANF_WEBSITE}</a> |
      <a href="mailto:${CONFIG.BANF_EMAIL}" style="color:#3b82f6">${CONFIG.BANF_EMAIL}</a>
    </p>
  </div>
</div>`;
  return { subject, html };
}

/**
 * Scenario B: Existing BANF member, needs to set up stakeholder portal access.
 * They already have BANF membership. Need to create a stakeholder portal login.
 */
function emailExistingMember(sh) {
  const rolesStr = sh.roles.join(', ');
  const subject = 'You are Invited to the BANF Stakeholder Portal - Sign Up Now';
  const html = `<div style="font-family:'Segoe UI',Arial,Helvetica,sans-serif;max-width:620px;margin:0 auto;background:#ffffff">
  <div style="background:linear-gradient(135deg,#7c3aed,#8b5cf6);color:#ffffff;padding:24px 28px;border-radius:10px 10px 0 0">
    <h2 style="margin:0;font-size:1.25rem;font-weight:700">BANF Stakeholder Portal</h2>
    <p style="margin:6px 0 0;opacity:.9;font-size:.88rem">You Have Been Invited as a Stakeholder</p>
  </div>

  <div style="padding:24px 28px;border:1px solid #e0e0e0;border-top:none;border-radius:0 0 10px 10px;color:#333333">
    <p style="margin:0 0 14px">Dear <strong>${esc(sh.firstName)}</strong>,</p>

    <p>We are pleased to invite you to the <strong>BANF Stakeholder Portal</strong> as a
    <strong>${esc(sh.stakeholderRole)}</strong>.</p>

    <p>As a valued BANF member (${esc(sh.familyName)}, member since ${esc(sh.memberSince)}),
    your insight and feedback are important to our platform development.</p>

    <div style="background:#f5f3ff;border:2px solid #8b5cf6;border-radius:10px;padding:16px;margin:18px 0">
      <div style="font-size:.82rem;color:#5b21b6;font-weight:600;margin-bottom:6px">Your Roles</div>
      <div style="font-size:.95rem;font-weight:700;color:#5b21b6">${esc(rolesStr)}</div>
      <div style="margin-top:6px;font-size:.82rem;color:#7c3aed">+ New: <strong>${esc(sh.stakeholderRole)}</strong> (Stakeholder Portal)</div>
    </div>

    <div style="background:#f0fdf4;border:2px solid #22c55e;border-radius:10px;padding:18px;margin:18px 0">
      <div style="font-weight:700;color:#166534;font-size:.95rem;margin-bottom:10px">How to Get Started</div>
      <ol style="margin:0;padding-left:20px;color:#555555;line-height:2">
        <li>Click the <strong>Sign Up</strong> button below</li>
        <li>Enter your full name and email (<code style="background:#f1f5f9;padding:2px 6px;border-radius:4px">${esc(sh.email)}</code>)</li>
        <li>Choose a username (suggested: <code style="background:#f1f5f9;padding:2px 6px;border-radius:4px">${esc(sh.username)}</code>)</li>
        <li>Create a secure password (min 6 characters)</li>
        <li>Set a <strong>security question</strong> for account recovery</li>
        <li>Sign in and explore the dashboard</li>
      </ol>
    </div>

    <div style="text-align:center;margin:24px 0">
      <a href="${CONFIG.STAKEHOLDER_PORTAL_URL}" style="display:inline-block;background:linear-gradient(135deg,#7c3aed,#8b5cf6);color:#ffffff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:700;font-size:.92rem">Sign Up for Stakeholder Portal</a>
    </div>

    <p><strong>What you will be able to do:</strong></p>
    <ul style="padding-left:20px;color:#555555;line-height:1.8">
      <li>View real-time system overview and KPIs</li>
      <li>Review requirements and approve changes</li>
      <li>Monitor DevOps pipeline and deployment status</li>
      <li>Access AI agent dashboards</li>
      <li>Provide feedback on system development</li>
    </ul>

    <div style="background:#eff6ff;border:1px solid #93c5fd;border-radius:8px;padding:14px;margin:18px 0">
      <strong style="color:#1e40af">Shared Credentials:</strong>
      <p style="margin:6px 0 0;font-size:.84rem;color:#555555">
        Once you sign up, your credentials will work across all BANF portals:
        Stakeholder Portal, Member Portal, and (if applicable) EC Admin Portal.
      </p>
    </div>

    <div style="background:#fefce8;border:1px solid #fde68a;border-radius:8px;padding:14px;margin:16px 0">
      <strong style="color:#854d0e">Security Features:</strong>
      <ul style="margin:8px 0 0;padding-left:18px;color:#555555;font-size:.84rem">
        <li><strong>Security Question</strong> - For password recovery</li>
        <li><strong>Forgot Password</strong> - Answer your security question to reset</li>
        <li><strong>Account Lockout</strong> - 5 failed attempts locks the account</li>
      </ul>
    </div>

    <p style="color:#777777;font-size:.82rem;margin-top:24px;border-top:1px solid #eeeeee;padding-top:14px">
      ${esc(CONFIG.BANF_ORG)}<br>
      <a href="${CONFIG.BANF_WEBSITE}" style="color:#7c3aed">${CONFIG.BANF_WEBSITE}</a> |
      <a href="mailto:${CONFIG.BANF_EMAIL}" style="color:#7c3aed">${CONFIG.BANF_EMAIL}</a>
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
  let emailContent;
  if (sh.scenario === 'already_signed_up') {
    emailContent = emailAlreadySignedUp(sh);
  } else {
    emailContent = emailExistingMember(sh);
  }

  const actualTo = testMode ? CONFIG.TEST_EMAIL : sh.email;
  const actualSubject = testMode && sh.email !== CONFIG.TEST_EMAIL
    ? `[TEST -> ${sh.email}] ${emailContent.subject}`
    : emailContent.subject;

  const mailOptions = {
    from: `"${CONFIG.BANF_ORG}" <${CONFIG.BANF_EMAIL}>`,
    to: actualTo,
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
    scenario: sh.scenario,
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
  console.log('  BANF Stakeholder Drive - Email Sender');
  console.log('  Mode: ' + (doSend ? 'LIVE SEND' : testOnly ? 'TEST ONLY (Ranadhir)' : 'DRY RUN (preview)'));
  console.log('  Date: ' + new Date().toISOString());
  console.log('='.repeat(68));
  console.log('');

  const targets = testOnly
    ? STAKEHOLDERS.filter(s => s.email === CONFIG.TEST_EMAIL)
    : STAKEHOLDERS;

  // Preview all emails
  for (const sh of targets) {
    let emailContent;
    if (sh.scenario === 'already_signed_up') {
      emailContent = emailAlreadySignedUp(sh);
    } else {
      emailContent = emailExistingMember(sh);
    }

    console.log(`--- ${sh.name} (${sh.scenario}) ---`);
    console.log(`  To:      ${sh.email}`);
    console.log(`  Subject: ${emailContent.subject}`);
    console.log(`  Roles:   ${sh.roles.join(', ')}`);
    console.log(`  Stk Role: ${sh.stakeholderRole}`);
    console.log('');
  }

  if (!doSend && !testOnly) {
    console.log('DRY RUN complete. No emails sent.');
    console.log('Use --send to send all emails, or --test-only to send test to Ranadhir.');
    return;
  }

  // Send emails
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
  console.log('');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
