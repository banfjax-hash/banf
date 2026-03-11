#!/usr/bin/env node
/**
 * ═══════════════════════════════════════════════════════════════════════════════
 *  EC SIGNUP REMINDER AGENT v3.0
 *  Sends URGENT signup reminders to EC members who have not signed up on the
 *  EC Admin portal. Signup links expire in 24 hours.
 *
 *  Communication Pattern:
 *    - Direct Gmail API (same as ec-reminder-send.js, bosonto-email-sender.js)
 *    - communication-compliance.js for RFC 2047 encoding, content check, audit
 *    - OAuth2 refresh token → access token → Gmail send
 *
 *  Usage:
 *    node ec-signup-reminder-agent.js                 — Send to all pending
 *    node ec-signup-reminder-agent.js --preview           — Preview reminder email only
 *    node ec-signup-reminder-agent.js --status            — Show signup status
 *    node ec-signup-reminder-agent.js --send <email>      — Send signup reminder to one member
 *    node ec-signup-reminder-agent.js --onboard <email>   — Send onboarding congratulations email to signed-up EC member
 *    node ec-signup-reminder-agent.js --dry-run       — Validate without sending
 *
 *  Architecture:
 *    ┌──────────────┐     ┌────────────────────┐     ┌──────────────┐
 *    │ EC Signup     │────>│ Communication      │────>│ Gmail API    │
 *    │ Reminder Agent│     │ Compliance Module  │     │ (OAuth2)     │
 *    └──────────────┘     └────────────────────┘     └──────────────┘
 *           │                      │                        │
 *           v                      v                        v
 *    ┌──────────────┐     ┌────────────────────┐     ┌──────────────┐
 *    │ HTML Report  │     │ Audit Log          │     │ Email Inbox  │
 *    │ (.html)      │     │ (comm-audit.json)  │     │ (recipient)  │
 *    └──────────────┘     └────────────────────┘     └──────────────┘
 *
 *  Date: March 4, 2026
 * ═══════════════════════════════════════════════════════════════════════════════
 */

const https = require('https');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// RAG Agent Memory — pre-execution context validation
let memory;
try {
  memory = require('./agent-memory-rag.js');
  console.log('[RAG] ✅ Loaded agent-memory-rag.js');
} catch (e) {
  console.log('[RAG] ⚠️ agent-memory-rag.js not found — skipping pre-execution memory check');
  memory = null;
}

// Communication Compliance — header encoding, content validation, audit
let compliance;
try {
  compliance = require('./communication-compliance.js');
  console.log('[COMPLIANCE] ✅ Loaded communication-compliance.js');
} catch (e) {
  console.log('[COMPLIANCE] ⚠️ communication-compliance.js not found — using fallback mode');
  compliance = null;
}

// ═══════════════════════════════════════════════════════════════════
//  CONFIGURATION
// ═══════════════════════════════════════════════════════════════════

// Gmail OAuth2 credentials (same as ec-reminder-send.js, bosonto scripts)
const GOOGLE_REFRESH_TOKEN = require('./banf-gmail-config').REFRESH_TOKEN;
const GOOGLE_CLIENT_ID = '1020178199135-3usrl611ara38i7rhu2ub6sn6g1150ml.apps.googleusercontent.com';
const GOOGLE_CLIENT_SECRET = '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';
const FROM_EMAIL = 'banfjax@gmail.com';
const FROM_NAME = 'BANF Admin';

const CURRENT_FY = 'FY2026-27';
const SIGNUP_BASE_URL = 'https://banfjax-hash.github.io/banf/ec-admin-login.html';
const LANDING_URL = 'https://banfjax-hash.github.io/banf/landing.html';
const LINK_EXPIRY_HOURS = 24;

// ═══════════════════════════════════════════════════════════════════
//  EC MEMBER ROSTER — FY2026-27 (REAL ROSTER — user confirmed 2025-06-15)
//
//  ⚠️  WARNING: Do NOT replace this with data from docs/admin-portal.html
//  admin-portal.html EC_MEMBERS contains FAKE TEST/PLACEHOLDER names.
//  Source of truth: agent-memory-rag.js store + ec-onboarding-drive-agent.js
//  All emails cross-validated across workspace files.
//
//  signedUp / signupDate — update these fields as members complete onboarding.
// ═══════════════════════════════════════════════════════════════════

// ── SHARED STATUS FILE — single source of truth ──
// Instead of hardcoded signedUp flags, read from ec-onboard-status.json
// This file is shared across ALL reminder scripts to prevent stale rosters.
const STATUS_FILE = path.join(__dirname, 'ec-onboard-status.json');

function loadEcStatus() {
  try {
    if (fs.existsSync(STATUS_FILE)) {
      const data = JSON.parse(fs.readFileSync(STATUS_FILE, 'utf8'));
      console.log('[STATUS] ✅ Loaded ec-onboard-status.json (updated: ' + data.lastUpdated + ')');
      return data;
    }
  } catch (e) {
    console.warn('[STATUS] ⚠️ Failed to load ec-onboard-status.json:', e.message);
  }
  return null;
}

function saveEcStatus(statusData) {
  try {
    statusData.lastUpdated = new Date().toISOString();
    fs.writeFileSync(STATUS_FILE, JSON.stringify(statusData, null, 2), 'utf8');
    console.log('[STATUS] ✅ Saved ec-onboard-status.json');
  } catch (e) {
    console.warn('[STATUS] ⚠️ Failed to save ec-onboard-status.json:', e.message);
  }
}

// ── EMAIL COOLDOWN GUARD ──
// Prevents sending the same reminder email within cooldown period (default 7 days / 168 hours).
// Uses ec-onboard-status.json emailLog.sent as persistent store.
function checkEmailCooldown(statusData, email) {
  const cooldownMs = (statusData.emailLog?.cooldownHours || 168) * 60 * 60 * 1000;
  const lastSent = statusData.emailLog?.sent?.[email.toLowerCase()];
  if (!lastSent) return { allowed: true };
  const elapsed = Date.now() - new Date(lastSent).getTime();
  if (elapsed < cooldownMs) {
    const hoursLeft = Math.ceil((cooldownMs - elapsed) / (60 * 60 * 1000));
    return { allowed: false, hoursLeft, lastSent };
  }
  return { allowed: true };
}

function recordEmailSent(statusData, email) {
  if (!statusData.emailLog) statusData.emailLog = { sent: {} };
  if (!statusData.emailLog.sent) statusData.emailLog.sent = {};
  statusData.emailLog.sent[email.toLowerCase()] = new Date().toISOString();
  saveEcStatus(statusData);
}

// ── LOAD EC MEMBERS FROM SHARED STATUS (with hardcoded fallback) ──
const _statusData = loadEcStatus();

const EC_MEMBERS = _statusData ? _statusData.members.map(m => ({
  name: m.name,
  title: m.title,
  email: m.email,
  membership: m.membership || 'Paid',
  gate: m.gate || 'passed',
  signedUp: m.signedUp,
  signupDate: m.signupDate
})) : [
  // FALLBACK — only used if ec-onboard-status.json is missing
  // NAME                         TITLE                       EMAIL                              MEMBERSHIP    GATE       SIGNEDUP  SIGNUP_DATE
  { name: 'Dr. Ranadhir Ghosh',   title: 'President / IT Lead', email: 'ranadhir.ghosh@gmail.com',   membership: 'Paid', gate: 'passed', signedUp: true,  signupDate: '2026-02-15' },
  { name: 'Partha Mukhopadhyay',  title: 'Vice President',      email: 'mukhopadhyay.partha@gmail.com', membership: 'Paid', gate: 'passed', signedUp: true,  signupDate: '2026-02-20' },
  { name: 'Amit Chandak',         title: 'Treasurer',           email: 'amit.everywhere@gmail.com',     membership: 'Paid', gate: 'passed', signedUp: false, signupDate: null },
  { name: 'Rajanya Ghosh',        title: 'General Secretary',   email: 'rajanya.ghosh@gmail.com',    membership: 'Paid', gate: 'passed', signedUp: true,  signupDate: '2026-02-22' },
  { name: 'Dr. Moumita Ghosh',    title: 'Cultural Secretary',  email: 'moumita.mukherje@gmail.com', membership: 'Paid', gate: 'passed', signedUp: false, signupDate: null },
  { name: 'Soumyajit Dutta',      title: 'Food Coordinator',    email: 'duttasoumyajit86@gmail.com', membership: 'Paid', gate: 'passed', signedUp: false, signupDate: null },
  { name: 'Dr. Sumanta Ghosh',    title: 'Event Coordinator',   email: 'sumo475@gmail.com',          membership: 'Paid', gate: 'passed', signedUp: false, signupDate: null },
  { name: 'Rwiti Chowdhury',      title: 'Puja Coordinator',    email: 'rwitichoudhury@gmail.com',   membership: 'Paid', gate: 'passed', signedUp: false, signupDate: null },
];

// ═══════════════════════════════════════════════════════════════════
//  GMAIL API HELPERS (same pattern as ec-reminder-send.js)
// ═══════════════════════════════════════════════════════════════════

function httpsRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const opts = {
      hostname: u.hostname,
      port: 443,
      path: u.pathname + u.search,
      method: options.method || 'GET',
      headers: options.headers || {}
    };
    const req = https.request(opts, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(data) }); }
        catch { resolve({ status: res.statusCode, data }); }
      });
    });
    req.on('error', reject);
    if (options.body) req.write(options.body);
    req.end();
  });
}

async function getAccessToken() {
  console.log('[AUTH] Refreshing Gmail access token...');
  const res = await httpsRequest('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `client_id=${GOOGLE_CLIENT_ID}&client_secret=${GOOGLE_CLIENT_SECRET}&refresh_token=${GOOGLE_REFRESH_TOKEN}&grant_type=refresh_token`
  });
  if (res.data.access_token) {
    console.log('[AUTH] ✅ Token refreshed');
    return res.data.access_token;
  }
  throw new Error('Failed to refresh token: ' + JSON.stringify(res.data));
}

async function sendGmail(accessToken, to, toName, subject, htmlBody) {
  // Use communication-compliance module if available (same as ec-reminder-send.js)
  if (compliance && compliance.buildCompliantMessage) {
    const result = compliance.buildCompliantMessage({
      to,
      toName: compliance.sanitizeName ? compliance.sanitizeName(toName) : toName,
      from: FROM_EMAIL,
      fromName: FROM_NAME,
      subject,
      htmlBody,
      agent: 'ec_signup_reminder_agent',
      requireGreeting: false,
      requireSignoff: false,
    });

    if (result.blocked) {
      console.log(`  [COMPLIANCE] ❌ Blocked: ${result.reason}`);
      return { status: 429, data: { error: result.reason } };
    }

    if (result.compliance && result.compliance.warnings && result.compliance.warnings.length > 0) {
      console.log(`  [COMPLIANCE] Score: ${result.compliance.score}/100 (${result.compliance.level})`);
      result.compliance.warnings.forEach(w => console.log(`    ⚠️ ${w}`));
    }

    const res = await httpsRequest('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ raw: result.raw })
    });
    return res;
  }

  // Fallback: manual MIME construction (same as membership-drive.js sendGmail)
  const raw = [
    `From: ${FROM_NAME} <${FROM_EMAIL}>`,
    `To: ${toName} <${to}>`,
    `Subject: ${subject}`,
    'MIME-Version: 1.0',
    'Content-Type: text/html; charset=UTF-8',
    '',
    htmlBody
  ].join('\r\n');
  const encoded = Buffer.from(raw).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

  const res = await httpsRequest('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ raw: encoded })
  });
  return res;
}

// ═══════════════════════════════════════════════════════════════════
//  SIGNUP LINK GENERATION (24-hour expiry)
// ═══════════════════════════════════════════════════════════════════

function generateSignupToken(email) {
  const payload = email + '|' + Date.now() + '|' + crypto.randomBytes(8).toString('hex');
  return Buffer.from(payload).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

function buildSignupLink(email) {
  const token = generateSignupToken(email);
  const expires = Date.now() + (LINK_EXPIRY_HOURS * 60 * 60 * 1000);
  return `${SIGNUP_BASE_URL}?signup=true&email=${encodeURIComponent(email)}&token=${token}&expires=${expires}`;
}

function getExpiryTime() {
  const exp = new Date(Date.now() + (LINK_EXPIRY_HOURS * 60 * 60 * 1000));
  return exp.toLocaleString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', timeZoneName: 'short' });
}

// ═══════════════════════════════════════════════════════════════════
//  EMAIL TEMPLATE — URGENT EC Signup Reminder
//  Pattern: Same as buildDriveInviteEmail() in admin-portal.html
//  + URGENT flag, 24hr expiry link, "blocking membership drive"
// ═══════════════════════════════════════════════════════════════════

function buildSignupReminderEmail(member) {
  const signupLink = buildSignupLink(member.email);
  const expiresAt = getExpiryTime();
  const year = new Date().getFullYear();
  const sentDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>URGENT: BANF EC Signup Required</title></head>
<body style="margin:0;padding:0;background:#f5f7fa;font-family:'Segoe UI',Arial,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f7fa;padding:30px 0">
<tr><td align="center">
<table width="620" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.1)">

<!-- HEADER: Crimson gradient with URGENT badge (same as buildDriveInviteEmail pattern) -->
<tr><td style="background:linear-gradient(135deg,#DC143C,#8B0000);padding:32px 40px;text-align:center">
<div style="display:inline-block;background:rgba(255,255,255,.15);color:#fff;padding:6px 18px;border-radius:20px;font-size:.82rem;font-weight:700;letter-spacing:1px;margin-bottom:14px">&#x26A0; URGENT ACTION REQUIRED</div>
<h1 style="color:#fff;margin:0;font-size:1.5rem;font-weight:700">Bengali Association of North Florida</h1>
<p style="color:rgba(255,255,255,.85);margin:8px 0 0;font-size:.95rem;letter-spacing:.3px">
EC Member Signup &mdash; Immediate Action Needed</p>
</td></tr>

<!-- GREETING -->
<tr><td style="padding:36px 40px 4px">
<p style="font-size:1.05rem;color:#333;margin:0 0 18px">Dear <strong>${member.name}</strong>,</p>
<p style="color:#444;line-height:1.75;margin:0 0 14px">
We are writing to you as <strong style="color:#8B0000">${member.title}</strong> of the
<strong>BANF Executive Committee (${CURRENT_FY})</strong>. Our records indicate that
you have <strong>not yet completed your signup</strong> on the BANF EC Admin portal.</p>
</td></tr>

<!-- URGENT ALERT BOX -->
<tr><td style="padding:4px 40px">
<div style="background:#fef2f2;border-left:4px solid #DC143C;border-radius:0 10px 10px 0;padding:18px 20px;margin:8px 0 18px">
<p style="margin:0 0 8px;font-weight:700;color:#991b1b;font-size:1rem">&#x1F6A8; Why This Is Urgent</p>
<p style="margin:0 0 10px;color:#7f1d1d;font-size:.92rem;line-height:1.7">
Your signup is <strong>currently blocking the BANF ${CURRENT_FY} membership drive</strong>.
<strong>The BANF community member sign-on campaign will only begin once every EC member has completed this process.</strong>
Until all 8 EC members are onboarded, no general membership registration can open.</p>
<p style="margin:0;color:#7f1d1d;font-size:.88rem;line-height:1.65;border-top:1px solid #fca5a5;padding-top:8px">
As an EC member you are required to sign up before the membership drive can launch.
Please act now &mdash; <strong>every hour of delay pushes back the community sign-on start date.</strong></p>
</div></td></tr>

<!-- TIME-SENSITIVE NOTICE -->
<tr><td style="padding:4px 40px">
<div style="background:#fffbeb;border-left:4px solid #D4AF37;border-radius:0 10px 10px 0;padding:16px 20px;margin:8px 0 18px">
<p style="margin:0 0 6px;font-weight:700;color:#7B5800;font-size:.95rem">&#x23F0; Time-Sensitive Link</p>
<p style="margin:0;color:#5a4000;font-size:.88rem;line-height:1.6">
The signup link below will <strong>expire in ${LINK_EXPIRY_HOURS} hours</strong> (by ${expiresAt}).
After expiry, you will need to request a new link from the Super Admin.</p>
</div></td></tr>

<!-- CTA BUTTON -->
<tr><td style="padding:8px 40px 24px;text-align:center">
<a href="${signupLink}"
style="display:inline-block;background:linear-gradient(135deg,#DC143C,#8B0000);color:#fff;text-decoration:none;
padding:16px 48px;border-radius:30px;font-size:1.1rem;font-weight:700;letter-spacing:.5px;
box-shadow:0 4px 18px rgba(139,0,0,.35)">
Sign Up Now &#x2192;</a>
<p style="margin:14px 0 4px;font-size:.8rem;color:#888">Sign up with your EC email: <strong>${member.email}</strong></p>
<p style="margin:4px 0 0;font-size:.75rem;color:#bbb">This link expires: ${expiresAt}</p>
</td></tr>

<!-- WHAT HAPPENS AFTER -->
<tr><td style="padding:4px 40px">
<p style="margin:0 0 10px;font-weight:700;color:#333;font-size:.95rem">What happens after signup?</p>
<table cellpadding="0" cellspacing="0" style="margin:0 0 18px;width:100%">
<tr><td style="padding:6px 0;color:#444;font-size:.9rem"><span style="color:#22c55e;font-weight:700">&#10003;</span> Your EC Admin portal access will be activated immediately</td></tr>
<tr><td style="padding:6px 0;color:#444;font-size:.9rem"><span style="color:#22c55e;font-weight:700">&#10003;</span> You can authorize and oversee the ${CURRENT_FY} membership drive</td></tr>
<tr><td style="padding:6px 0;color:#444;font-size:.9rem"><span style="color:#22c55e;font-weight:700">&#10003;</span> Access EC meeting notes, budgets, and community dashboards</td></tr>
<tr><td style="padding:6px 0;color:#444;font-size:.9rem"><span style="color:#22c55e;font-weight:700">&#10003;</span> Collaborate with other EC members on the admin platform</td></tr>
</table></td></tr>

<!-- SIGN-OFF -->
<tr><td style="padding:4px 40px 8px">
<p style="color:#444;line-height:1.75;margin:0 0 8px;font-size:.9rem">
Please complete your signup at the earliest. If you face any issues, reach out to the IT team immediately.</p>
<p style="color:#444;margin:0 0 4px;font-size:.9rem">Best regards,</p>
<p style="color:#333;margin:0 0 2px;font-size:.95rem;font-weight:700">Ranadhir Ghosh</p>
<p style="color:#666;margin:0;font-size:.82rem">Technical Lead and Super Admin &mdash; BANF Platform</p>
<p style="color:#888;margin:4px 0 0;font-size:.78rem">Bengali Association of North Florida | <a href="mailto:banfjax@gmail.com" style="color:#8B0000">banfjax@gmail.com</a></p>
</td></tr>

<!-- DATA PRIVACY NOTICE (same as buildDriveInviteEmail) -->
<tr><td style="background:#f0f4f8;border-top:1px solid #dde3ea;padding:22px 40px">
<p style="margin:0 0 8px;font-size:.85rem;font-weight:700;color:#555;letter-spacing:.3px">DATA PRIVACY NOTICE</p>
<p style="margin:0;font-size:.8rem;color:#666;line-height:1.75">
The information associated with your account is collected <strong>solely for internal BANF communication and platform collaboration purposes</strong>.
Your data is used exclusively to provide you with EC access and community management capabilities.</p>
<ul style="margin:8px 0 0;padding-left:18px;font-size:.79rem;color:#666;line-height:1.9">
<li><strong>No third-party sharing:</strong> Your personal details will never be sold, rented, or shared with any external organisation, advertiser, or third party.</li>
<li><strong>Purpose limitation:</strong> Data collected is used only for BANF platform collaboration and communication purposes.</li>
<li><strong>Data security:</strong> Your information is stored securely within the BANF management system with access restricted to authorised BANF committee members and system administrators.</li>
<li><strong>Right to opt out:</strong> You may withdraw consent and unsubscribe at any time by contacting <a href="mailto:banfjax@gmail.com" style="color:#8B0000">banfjax@gmail.com</a>.</li>
<li><strong>Right to erasure:</strong> You may request complete deletion of your personal data at any time.</li>
</ul>
</td></tr>

<!-- FOOTER (same as buildDriveInviteEmail) -->
<tr><td style="background:#f9f9f9;border-top:1px solid #eee;padding:14px 40px;text-align:center">
<p style="margin:0 0 6px;font-size:.75rem;color:#999">
<a href="mailto:banfjax@gmail.com?subject=Unsubscribe" style="color:#8B0000;text-decoration:underline">Unsubscribe from BANF communications</a>
 | Sent on ${sentDate}</p>
<p style="margin:0;font-size:.73rem;color:#bbb">&copy; ${year} Bengali Association of North Florida (BANF). All rights reserved.</p>
<p style="margin:4px 0 0;font-size:.7rem;color:#ccc">jaxbengali.org | banfjax@gmail.com | Jacksonville, FL</p>
</td></tr>

</table></td></tr></table></body></html>`;
}

// ═══════════════════════════════════════════════════════════════════
//  STATUS CHECK
// ═══════════════════════════════════════════════════════════════════

function showStatus() {
  const signedUp = EC_MEMBERS.filter(m => m.signedUp);
  const notSignedUp = EC_MEMBERS.filter(m => !m.signedUp);

  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('  EC SIGNUP STATUS — ' + CURRENT_FY);
  console.log('  Date: ' + new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }));
  console.log('═══════════════════════════════════════════════════════════════\n');

  console.log(`  Total EC Members:    ${EC_MEMBERS.length}`);
  console.log(`  ✅ Signed Up:        ${signedUp.length}`);
  console.log(`  ❌ Not Signed Up:    ${notSignedUp.length}`);
  console.log(`  Completion:          ${Math.round(signedUp.length / EC_MEMBERS.length * 100)}%`);
  console.log('');

  console.log('  ✅ SIGNED UP:');
  signedUp.forEach(m => {
    console.log(`     • ${m.name.padEnd(22)} ${m.title.padEnd(18)} ${m.email.padEnd(28)} ${m.signupDate}`);
  });
  console.log('');

  console.log('  ❌ NOT SIGNED UP (blocking membership drive):');
  notSignedUp.forEach(m => {
    console.log(`     • ${m.name.padEnd(22)} ${m.title.padEnd(18)} ${m.email.padEnd(28)} [${m.membership}, gate: ${m.gate}]`);
  });

  console.log('\n═══════════════════════════════════════════════════════════════\n');
  return { signedUp, notSignedUp };
}

// ═══════════════════════════════════════════════════════════════════
//  HTML REPORT GENERATION
// ═══════════════════════════════════════════════════════════════════

function generateReport(results) {
  const signedUp = EC_MEMBERS.filter(m => m.signedUp);
  const notSignedUp = EC_MEMBERS.filter(m => !m.signedUp);
  const sent = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);
  const now = new Date().toLocaleString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>EC Signup Reminder Report — ${now}</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:'Segoe UI',system-ui,sans-serif;background:#0f172a;color:#e2e8f0;padding:30px}
  .container{max-width:900px;margin:0 auto}
  h1{color:#f8fafc;font-size:1.6rem;margin-bottom:6px}
  .sub{color:#94a3b8;font-size:.85rem;margin-bottom:24px}
  .card{background:#1e293b;border:1px solid #334155;border-radius:14px;padding:24px;margin-bottom:20px}
  .card h2{color:#f1f5f9;font-size:1.1rem;margin-bottom:14px;display:flex;align-items:center;gap:8px}
  .kpis{display:flex;gap:14px;flex-wrap:wrap;margin-bottom:20px}
  .kpi{background:#1e293b;border:1px solid #334155;border-radius:12px;padding:18px 22px;flex:1;min-width:140px;text-align:center}
  .kpi .v{font-size:2rem;font-weight:700;margin-bottom:4px}
  .kpi .k{font-size:.75rem;color:#94a3b8;text-transform:uppercase;letter-spacing:.5px}
  .kpi.green .v{color:#22c55e} .kpi.red .v{color:#ef4444} .kpi.yellow .v{color:#eab308} .kpi.blue .v{color:#3b82f6}
  table{width:100%;border-collapse:collapse;font-size:.85rem}
  th{background:#334155;color:#cbd5e1;padding:10px 12px;text-align:left;font-weight:600;font-size:.75rem;text-transform:uppercase;letter-spacing:.4px}
  td{padding:10px 12px;border-bottom:1px solid #334155;color:#e2e8f0}
  tr:hover{background:#334155}
  .badge{display:inline-block;padding:3px 10px;border-radius:12px;font-size:.72rem;font-weight:600}
  .badge.green{background:#166534;color:#86efac} .badge.red{background:#991b1b;color:#fca5a5}
  .badge.yellow{background:#854d0e;color:#fde047} .badge.blue{background:#1e40af;color:#93c5fd}
  .timeline{border-left:3px solid #334155;padding-left:20px;margin:10px 0}
  .timeline .event{margin-bottom:14px;position:relative}
  .timeline .event::before{content:'';position:absolute;left:-26px;top:4px;width:12px;height:12px;border-radius:50%;background:#3b82f6;border:2px solid #1e293b}
  .timeline .event.success::before{background:#22c55e} .timeline .event.fail::before{background:#ef4444}
  .timeline .event .ts{font-size:.72rem;color:#64748b}
  .timeline .event .msg{font-size:.85rem;color:#e2e8f0}
  .footer{text-align:center;margin-top:30px;color:#64748b;font-size:.75rem}
</style>
</head>
<body>
<div class="container">
  <h1>&#x1F6A8; EC Signup Reminder Report</h1>
  <p class="sub">Generated: ${now} | Agent: ec-signup-reminder-agent v2.0 | ${CURRENT_FY}</p>

  <div class="kpis">
    <div class="kpi blue"><div class="v">${EC_MEMBERS.length}</div><div class="k">Total EC</div></div>
    <div class="kpi green"><div class="v">${signedUp.length}</div><div class="k">Signed Up</div></div>
    <div class="kpi red"><div class="v">${notSignedUp.length}</div><div class="k">Not Signed Up</div></div>
    <div class="kpi ${sent.length === results.length ? 'green' : 'yellow'}"><div class="v">${sent.length}/${results.length}</div><div class="k">Emails Sent</div></div>
  </div>

  <div class="card">
    <h2>&#x2705; Signed Up (${signedUp.length})</h2>
    <table><thead><tr><th>Name</th><th>Title</th><th>Email</th><th>Signup Date</th></tr></thead>
    <tbody>
    ${signedUp.map(m => `<tr><td><strong>${m.name}</strong></td><td>${m.title}</td><td>${m.email}</td><td>${m.signupDate}</td></tr>`).join('')}
    </tbody></table>
  </div>

  <div class="card">
    <h2>&#x274C; Not Signed Up — Reminders Sent (${notSignedUp.length})</h2>
    <table><thead><tr><th>Name</th><th>Title</th><th>Email</th><th>Membership</th><th>Gate</th><th>Reminder</th></tr></thead>
    <tbody>
    ${notSignedUp.map(m => {
      const r = results.find(x => x.email === m.email);
      const status = r ? (r.success ? '<span class="badge green">Sent</span>' : '<span class="badge red">Failed</span>') : '<span class="badge yellow">Skipped</span>';
      return `<tr><td><strong>${m.name}</strong></td><td>${m.title}</td><td>${m.email}</td><td><span class="badge ${m.membership==='Paid'?'green':m.membership==='Pending'?'yellow':'red'}">${m.membership}</span></td><td><span class="badge ${m.gate==='passed'?'green':m.gate==='pending'?'yellow':'red'}">${m.gate}</span></td><td>${status}</td></tr>`;
    }).join('')}
    </tbody></table>
  </div>

  <div class="card">
    <h2>&#x1F4E8; Send Timeline</h2>
    <div class="timeline">
    ${results.map(r => `
      <div class="event ${r.success ? 'success' : 'fail'}">
        <div class="ts">${r.timestamp}</div>
        <div class="msg">${r.success ? '✅' : '❌'} <strong>${r.name}</strong> (${r.email}) — ${r.success ? 'Message ID: ' + (r.messageId || 'ok') : 'Error: ' + (r.error || 'unknown')}</div>
      </div>
    `).join('')}
    </div>
  </div>

  <div class="card">
    <h2>&#x1F4CB; Drive Tasks</h2>
    <table><thead><tr><th>ID</th><th>Task</th><th>Status</th><th>Note</th></tr></thead>
    <tbody>
      <tr><td>ECDT-001</td><td>Check EC member signup status</td><td><span class="badge green">done</span></td><td>${signedUp.length} signed up, ${notSignedUp.length} pending</td></tr>
      <tr><td>ECDT-002</td><td>Send signup reminder to non-signed-up EC members</td><td><span class="badge ${failed.length === 0 ? 'green' : 'yellow'}">${failed.length === 0 ? 'done' : 'partial'}</span></td><td>Sent: ${sent.length}, Failed: ${failed.length}. Link expires ${LINK_EXPIRY_HOURS}hrs.</td></tr>
      <tr><td>ECDT-003</td><td>Follow up on pending membership payments</td><td><span class="badge yellow">todo</span></td><td>Tanmay, Jayanta, Ananya — membership pending</td></tr>
      <tr><td>ECDT-004</td><td>Resolve failed gate (Subir Ghosh)</td><td><span class="badge yellow">todo</span></td><td>Expired membership — confirm if still active EC</td></tr>
      <tr><td>ECDT-005</td><td>Complete EC onboarding drive ${CURRENT_FY}</td><td><span class="badge red">blocked</span></td><td>Blocked until all EC members sign up</td></tr>
    </tbody></table>
  </div>

  <div class="footer">
    <p>Bengali Association of North Florida (BANF) | ec-signup-reminder-agent v2.0 | Communication Agent Pipeline</p>
    <p>Compliance: ${compliance ? 'communication-compliance.js loaded' : 'fallback mode (no compliance module)'} | Gmail OAuth2 Direct</p>
  </div>
</div>
</body></html>`;

  const reportPath = path.join(__dirname, 'ec-signup-reminder-report.html');
  fs.writeFileSync(reportPath, html, 'utf8');
  console.log(`\n[REPORT] ✅ HTML report saved to: ${reportPath}`);
  return reportPath;
}

// ═══════════════════════════════════════════════════════════════════
//  ONBOARDING CONGRATULATIONS EMAIL
// ═══════════════════════════════════════════════════════════════════

function buildOnboardingEmail(member) {
  const year = new Date().getFullYear();
  const dateStr = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>Welcome to BANF Platform</title>
</head>
<body style="margin:0;padding:0;background:#f0fdf4;font-family:'Segoe UI',system-ui,Arial,sans-serif;">
<div style="max-width:620px;margin:30px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

  <!-- Header -->
  <div style="background:linear-gradient(135deg,#006A4E 0%,#00856F 60%,#009688 100%);padding:40px 36px;text-align:center;">
    <div style="font-size:3rem;margin-bottom:12px;">🎉</div>
    <h1 style="margin:0;color:#fff;font-size:1.7rem;font-weight:700;letter-spacing:-.5px;">Welcome to BANF Platform!</h1>
    <p style="color:rgba(255,255,255,.85);margin:8px 0 0;font-size:1rem;">Your EC Member account is active &amp; ready</p>
  </div>

  <!-- Body -->
  <div style="padding:36px;">
    <p style="font-size:1rem;color:#1e293b;margin-top:0;">নমস্কার &amp; Congratulations, <strong>${member.name}</strong>!</p>

    <p style="font-size:.95rem;color:#374151;line-height:1.7;">
      We are thrilled to welcome you as <strong>${member.title}</strong> of the Bengali Association of North Florida (BANF) EC for FY 2026–27.
      Your account on the BANF platform is now fully active. Here's everything you need to get started.
    </p>

    <!-- Portal Cards -->
    <div style="display:grid;gap:14px;margin:24px 0;">
      <div style="background:linear-gradient(135deg,#ecfdf5,#d1fae5);border:1px solid #6ee7b7;border-radius:12px;padding:18px 20px;">
        <div style="font-weight:700;color:#065f46;font-size:.95rem;margin-bottom:6px;">🏠 Member Portal</div>
        <p style="margin:0;font-size:.88rem;color:#064e3b;line-height:1.6;">Access events, pay dues, view the community forum, photo gallery, and your member profile.</p>
        <a href="https://www.jaxbengali.org/member-portal.html" style="display:inline-block;margin-top:10px;background:#006A4E;color:#fff;padding:8px 20px;border-radius:25px;text-decoration:none;font-size:.85rem;font-weight:600;">Open Member Portal →</a>
      </div>
      <div style="background:linear-gradient(135deg,#fff7ed,#ffedd5);border:1px solid #fdba74;border-radius:12px;padding:18px 20px;">
        <div style="font-weight:700;color:#9a3412;font-size:.95rem;margin-bottom:6px;">⚙️ EC / Admin Portal</div>
        <p style="margin:0;font-size:.88rem;color:#7c2d12;line-height:1.6;">Manage members, events, collections, email campaigns, CRM, analytics, and all EC operations.</p>
        <a href="https://www.jaxbengali.org/admin-portal.html" style="display:inline-block;margin-top:10px;background:#ea580c;color:#fff;padding:8px 20px;border-radius:25px;text-decoration:none;font-size:.85rem;font-weight:600;">Open EC Admin Portal →</a>
      </div>
    </div>

    <!-- Testing Section -->
    <div style="background:#eff6ff;border:1px solid #93c5fd;border-radius:12px;padding:20px 22px;margin:24px 0;">
      <div style="font-weight:700;color:#1e40af;font-size:.95rem;margin-bottom:10px;">🧪 Please Help Us Test the Platform</div>
      <p style="font-size:.88rem;color:#1e3a5f;line-height:1.7;margin:0 0 12px;">
        Before we go live, we'd love for you to visit <strong><a href="https://www.jaxbengali.org/" style="color:#1e40af;">https://www.jaxbengali.org/</a></strong>
        and walk through the following areas. Your feedback is invaluable!
      </p>
      <table style="width:100%;border-collapse:collapse;font-size:.85rem;">
        <tr style="background:#dbeafe;">
          <th style="text-align:left;padding:8px 10px;color:#1e40af;border-radius:6px 0 0 6px;">#</th>
          <th style="text-align:left;padding:8px 10px;color:#1e40af;">Area to Test</th>
          <th style="text-align:left;padding:8px 10px;color:#1e40af;border-radius:0 6px 6px 0;">What to Check</th>
        </tr>
        <tr style="border-bottom:1px solid #bfdbfe;">
          <td style="padding:8px 10px;color:#475569;">1</td>
          <td style="padding:8px 10px;color:#1e293b;font-weight:600;">Member Login</td>
          <td style="padding:8px 10px;color:#475569;">Sign in, view your profile, see events dashboard</td>
        </tr>
        <tr style="border-bottom:1px solid #bfdbfe;background:#f0f9ff;">
          <td style="padding:8px 10px;color:#475569;">2</td>
          <td style="padding:8px 10px;color:#1e293b;font-weight:600;">EC Member Login</td>
          <td style="padding:8px 10px;color:#475569;">Access admin panel, test each section tab</td>
        </tr>
        <tr style="border-bottom:1px solid #bfdbfe;">
          <td style="padding:8px 10px;color:#475569;">3</td>
          <td style="padding:8px 10px;color:#1e293b;font-weight:600;">AI Chatbot 🤖</td>
          <td style="padding:8px 10px;color:#475569;">Try the chatbot (bubble, bottom-right). Ask about events, fees, EC team. Powered by Llama 3.1!</td>
        </tr>
        <tr style="border-bottom:1px solid #bfdbfe;background:#f0f9ff;">
          <td style="padding:8px 10px;color:#475569;">4</td>
          <td style="padding:8px 10px;color:#1e293b;font-weight:600;">Events Section</td>
          <td style="padding:8px 10px;color:#475569;">Check Bosonto Utsob 2026 listing (Apr 18), RSVP flow</td>
        </tr>
        <tr style="border-bottom:1px solid #bfdbfe;">
          <td style="padding:8px 10px;color:#475569;">5</td>
          <td style="padding:8px 10px;color:#1e293b;font-weight:600;">Membership Fee Portal</td>
          <td style="padding:8px 10px;color:#475569;">Review fee tiers, payment methods display</td>
        </tr>
        <tr style="background:#f0f9ff;">
          <td style="padding:8px 10px;color:#475569;">6</td>
          <td style="padding:8px 10px;color:#1e293b;font-weight:600;">Mobile View</td>
          <td style="padding:8px 10px;color:#475569;">Open on your phone — check responsiveness</td>
        </tr>
      </table>
    </div>

    <!-- Feedback CTA -->
    <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:18px 20px;margin:20px 0;text-align:center;">
      <p style="margin:0 0 10px;font-size:.9rem;color:#374151;font-weight:600;">📝 Found something? Let us know!</p>
      <p style="margin:0;font-size:.85rem;color:#64748b;">Email any bugs, suggestions, or feedback to:<br>
        <a href="mailto:banfjax@gmail.com" style="color:#006A4E;font-weight:700;">banfjax@gmail.com</a>
        &nbsp;|&nbsp; Subject: <em>"Platform Feedback — ${member.name}"</em>
      </p>
    </div>

    <!-- Important dates -->
    <div style="border-top:2px solid #f1f5f9;padding-top:20px;margin-top:20px;">
      <p style="font-size:.88rem;color:#64748b;line-height:1.7;margin:0;">
        <strong>🗓 Key Upcoming:</strong> Bosonto Utsob 2026 — <strong>Saturday, April 18, 2026</strong> (11 AM – 10 PM)<br>
        <strong>📍 Location:</strong> Community Center, Jacksonville FL<br>
        <strong>💡 EC Drive Status:</strong> Platform test phase — your signup helps us go live!
      </p>
    </div>
  </div>

  <!-- Footer -->
  <div style="background:linear-gradient(135deg,#006A4E,#00856F);padding:24px;text-align:center;">
    <p style="color:rgba(255,255,255,.9);font-size:.85rem;margin:0 0 6px;font-weight:600;">Bengali Association of North Florida (BANF)</p>
    <p style="color:rgba(255,255,255,.7);font-size:.78rem;margin:0;">Jacksonville, FL &nbsp;|&nbsp; <a href="https://www.jaxbengali.org" style="color:#a7f3d0;">www.jaxbengali.org</a> &nbsp;|&nbsp; banfjax@gmail.com</p>
    <p style="color:rgba(255,255,255,.5);font-size:.72rem;margin-top:10px;">${dateStr} · © ${year} BANF Platform</p>
  </div>

</div>
</body>
</html>`;
}

// ═══════════════════════════════════════════════════════════════════
//  MAIN — SEND REMINDERS
// ═══════════════════════════════════════════════════════════════════

async function main() {
  const args = process.argv.slice(2);
  const isPreview = args.includes('--preview');
  const isStatus = args.includes('--status');
  const isDryRun = args.includes('--dry-run');
  const isConfirmed = args.includes('--confirm');
  const sendOneIdx = args.indexOf('--send');
  const sendOneEmail = sendOneIdx >= 0 ? args[sendOneIdx + 1] : null;
  const onboardIdx = args.indexOf('--onboard');
  const onboardEmail = onboardIdx >= 0 ? args[onboardIdx + 1] : null;

  // ── PRE-EXECUTION RAG MEMORY CHECK ──────────────────────────────────────────
  // Mandatory: verify EC roster knowledge is loaded before any email operation.
  // If RAG has no EC roster context, abort and prompt to run ec-roster-seed-memory.js
  if (memory) {
    const rosterCheck = memory.search('BANF real EC roster 2026-27', { limit: 2 });
    const correctionCheck = memory.search('admin-portal fake test data EC', { limit: 2 });
    
    if (rosterCheck && rosterCheck.length > 0) {
      const top = rosterCheck[0].memory || rosterCheck[0];
      console.log('[RAG] ✅ EC roster context found in memory store (' + rosterCheck.length + ' match(es))');
      console.log('[RAG]    → ' + (top.content || '').substring(0, 100).replace(/\n/g, ' ') + '...');
    } else {
      console.error('[RAG] ⛔ ABORT: No EC roster found in agent memory store.');
      console.error('[RAG]    Run: node ec-roster-seed-memory.js to initialize roster knowledge.');
      if (!isDryRun && !isStatus && !isPreview) {
        process.exit(1);
      }
    }
    
    if (correctionCheck && correctionCheck.length > 0) {
      console.log('[RAG] ✅ Correction memory loaded — admin-portal.html fake data warning active.');
    }
  } else {
    console.warn('[RAG] ⚠️ Memory module unavailable — skipping roster validation. Ensure agent-memory-rag.js exists.');
  }
  console.log();
  // ─────────────────────────────────────────────────────────────────────────────

  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  🚨 EC SIGNUP REMINDER AGENT v3.0 (Dedup Guard)');
  console.log('  📅 Date: ' + new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }));
  console.log('  📧 From: ' + FROM_EMAIL);
  console.log('  🔗 Signup URL: ' + SIGNUP_BASE_URL);
  console.log('  ⏰ Link Expiry: ' + LINK_EXPIRY_HOURS + ' hours');
  console.log('  🤖 Compliance: ' + (compliance ? 'ACTIVE' : 'FALLBACK'));
  console.log('  🛡️ Dedup Guard: ' + (_statusData ? 'ACTIVE (ec-onboard-status.json)' : 'FALLBACK'));
  console.log('═══════════════════════════════════════════════════════════════\n');

  // ── WORKFLOW COMPLETE GATE ──────────────────────────────────────────────────
  // If all members have signed up (or workflowComplete flag set), refuse to send any emails.
  if (_statusData && _statusData.workflowComplete) {
    console.log('🛑 WORKFLOW COMPLETE — ec-onboard-status.json has workflowComplete=true.');
    console.log('   No reminder emails will be sent. All EC members have completed onboarding.');
    console.log('   To re-open, set workflowComplete=false in ec-onboard-status.json.');
    if (!isStatus && !isPreview) return;
  }

  // ── STATUS MODE ──
  if (isStatus) {
    showStatus();
    return;
  }

  // ── ONBOARD MODE ──
  if (onboardEmail) {
    const member = EC_MEMBERS.find(m => m.email.toLowerCase() === onboardEmail.toLowerCase());
    if (!member) {
      console.log(`❌ Email ${onboardEmail} not found in EC roster.`);
      console.log(`   Valid emails: ${EC_MEMBERS.map(m => m.email).join(', ')}`);
      return;
    }
    console.log(`\n🎉 Sending onboarding congratulations to: ${member.name} <${member.email}>`);
    const accessToken = await getAccessToken();
    const subject = '🎉 Welcome to BANF Platform — Your EC Account is Ready!';
    const html = buildOnboardingEmail(member);
    const res = await sendGmail(accessToken, member.email, member.name, subject, html);
    if (res.status >= 200 && res.status < 300) {
      console.log(`  ✅ Onboarding email sent! (messageId: ${res.data.id || 'ok'})`);
    } else {
      console.log(`  ❌ Failed: ${res.data?.error?.message || JSON.stringify(res.data)}`);
    }
    return;
  }

  // ── PREVIEW MODE ──
  if (isPreview) {
    const sample = EC_MEMBERS.find(m => !m.signedUp) || EC_MEMBERS[0];
    const html = buildSignupReminderEmail(sample);
    const previewPath = path.join(__dirname, 'ec-signup-reminder-preview.html');
    fs.writeFileSync(previewPath, html, 'utf8');
    console.log('[PREVIEW] ✅ Email preview saved to: ' + previewPath);
    console.log('[PREVIEW] Sample recipient: ' + sample.name + ' (' + sample.email + ')');
    console.log('[PREVIEW] Open the file in a browser to review the email template.');
    return;
  }

  // Show current status
  const { notSignedUp } = showStatus();

  if (notSignedUp.length === 0) {
    console.log('🎉 All EC members have signed up! No reminders needed.');
    return;
  }

  // Determine who to send to
  let targets;
  if (sendOneEmail) {
    // Individual send — allow excluded members too (explicit opt-in)
    targets = EC_MEMBERS.filter(m => !m.signedUp && m.email.toLowerCase() === sendOneEmail.toLowerCase());
    if (targets.length === 0) {
      console.log(`❌ Email ${sendOneEmail} not found in pending list.`);
      console.log('   Note: If the member is excluded (e.g. Former), use --send --force <email>');
      return;
    }
  } else {
    // Batch send — exclude Former/Expired members, require --confirm
    targets = notSignedUp.filter(m => !m.excluded);
    const excluded = notSignedUp.filter(m => m.excluded);
    if (excluded.length > 0) {
      console.log(`\n  ⚠️  EXCLUDED from batch (Former/Expired — use --send to reach individually):`);
      excluded.forEach(m => console.log(`     • ${m.name} (${m.title}) — ${m.email}`));
    }
    if (!isConfirmed && !isDryRun) {
      console.log(`\n  ⛔ BATCH SEND REQUIRES CONFIRMATION`);
      console.log(`     This will send to ${targets.length} EC member(s).`);
      console.log(`     Re-run with --confirm to proceed:`);
      console.log(`       node ec-signup-reminder-agent.js --confirm`);
      console.log(`     To send to one person only:`);
      console.log(`       node ec-signup-reminder-agent.js --send <email>`);
      console.log(`     To preview without sending:`);
      console.log(`       node ec-signup-reminder-agent.js --dry-run\n`);
      return;
    }
  }

  console.log(`\n📧 Sending URGENT signup reminders to ${targets.length} EC member(s)...`);
  if (isDryRun) {
    console.log('   [DRY RUN] No emails will actually be sent.\n');
  }
  console.log('');

  // Rate limit check (if compliance module available)
  if (compliance && compliance.checkRateLimit) {
    const limit = compliance.checkRateLimit();
    if (!limit.allowed) {
      console.log(`❌ Rate limit exceeded. Remaining: ${JSON.stringify(limit.remaining)}`);
      console.log('   Please wait before sending more emails.');
      return;
    }
    console.log(`[RATE] ✅ Rate limit OK — remaining: minute=${limit.remaining.minute}, hour=${limit.remaining.hour}, day=${limit.remaining.day}\n`);
  }

  let accessToken = null;
  if (!isDryRun) {
    accessToken = await getAccessToken();
  }

  const results = [];

  for (let i = 0; i < targets.length; i++) {
    const member = targets[i];
    const timestamp = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    console.log(`[${i + 1}/${targets.length}] ${member.title}: ${member.name} <${member.email}>`);

    // ── COOLDOWN CHECK ──────────────────────────────────────────
    // Skip if a reminder was already sent within the cooldown window (7 days).
    // Use --force to override the cooldown.
    const isForced = process.argv.includes('--force');
    if (_statusData && !isForced) {
      const cooldown = checkEmailCooldown(_statusData, member.email);
      if (!cooldown.allowed) {
        console.log(`  🛡️ COOLDOWN: Skipped — last reminder sent ${cooldown.lastSent} (${cooldown.hoursLeft}h remaining)`);
        console.log(`     Use --force to override the 7-day cooldown.`);
        results.push({ email: member.email, name: member.name, success: false, error: 'COOLDOWN_ACTIVE', timestamp });
        continue;
      }
    }

    const subject = `🚨 URGENT: Complete Your BANF EC Signup — Link Expires in ${LINK_EXPIRY_HOURS} Hours`;
    const html = buildSignupReminderEmail(member);

    if (isDryRun) {
      console.log(`  [DRY RUN] Would send to ${member.email}`);
      console.log(`  [DRY RUN] Subject: ${subject}`);
      console.log(`  [DRY RUN] Signup link generated (24hr expiry)`);
      results.push({ email: member.email, name: member.name, success: true, messageId: 'DRY-RUN', timestamp });
      continue;
    }

    try {
      const res = await sendGmail(accessToken, member.email, member.name, subject, html);

      if (res.status >= 200 && res.status < 300) {
        console.log(`  ✅ Sent successfully (messageId: ${res.data.id || 'ok'})`);
        results.push({ email: member.email, name: member.name, success: true, messageId: res.data.id, timestamp });

        // Record in dedup log to prevent re-sending within cooldown window
        if (_statusData) {
          recordEmailSent(_statusData, member.email);
        }

        // Audit log (if compliance module available)
        if (compliance && compliance.auditLog) {
          compliance.auditLog({
            action: 'ec_signup_reminder_sent',
            to: member.email,
            subject,
            agent: 'ec_signup_reminder_agent',
            result: 'success',
            messageId: res.data.id
          });
        }
      } else {
        const errMsg = res.data?.error?.message || JSON.stringify(res.data) || `HTTP ${res.status}`;
        console.log(`  ❌ Failed: ${errMsg}`);
        results.push({ email: member.email, name: member.name, success: false, error: errMsg, timestamp });

        if (compliance && compliance.auditLog) {
          compliance.auditLog({
            action: 'ec_signup_reminder_failed',
            to: member.email,
            subject,
            agent: 'ec_signup_reminder_agent',
            result: 'failed',
            error: errMsg
          });
        }
      }
    } catch (err) {
      console.log(`  ❌ Error: ${err.message}`);
      results.push({ email: member.email, name: member.name, success: false, error: err.message, timestamp });
    }

    // Small delay between emails (rate-limit friendly)
    if (i < targets.length - 1) {
      await new Promise(r => setTimeout(r, 1500));
    }
  }

  // ── SUMMARY ──
  const sent = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;

  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('  SUMMARY');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`  ✅ Sent:     ${sent}`);
  console.log(`  ❌ Failed:   ${failed}`);
  console.log(`  📧 Total:    ${results.length}`);
  console.log(`  ⏰ Expiry:   ${getExpiryTime()}`);
  console.log(`  🤖 Mode:     ${isDryRun ? 'DRY RUN' : 'LIVE'}`);
  console.log('═══════════════════════════════════════════════════════════════\n');

  results.forEach(r => {
    console.log(`  ${r.success ? '✅' : '❌'} ${r.name.padEnd(22)} ${r.email.padEnd(28)} ${r.success ? 'msgId: ' + (r.messageId || 'ok') : 'ERR: ' + r.error}`);
  });

  // Generate HTML report
  const reportPath = generateReport(results);
  console.log(`\n  📊 Report: ${reportPath}`);
  console.log('');
}

// ═══════════════════════════════════════════════════════════════════
//  RUN
// ═══════════════════════════════════════════════════════════════════

if (require.main === module) {
  main().catch(err => {
    console.error('\n[FATAL] ' + err.message);
    console.error(err.stack);
    process.exit(1);
  });
}

module.exports = { EC_MEMBERS, buildSignupReminderEmail, buildSignupLink, showStatus };
