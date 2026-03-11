#!/usr/bin/env node
/**
 * ═══════════════════════════════════════════════════════════════════════
 *  BANF Delivery Failure Recovery Agent v1.0
 * ═══════════════════════════════════════════════════════════════════════
 *
 *  Automatically handles email delivery failures (bounces) by:
 *    1. Scanning Gmail for mailer-daemon/postmaster bounce emails
 *    2. Parsing the failed recipient and failure reason
 *    3. Looking up CRM record for the failed recipient
 *    4. Attempting smart recovery:
 *       a) Check for alternate email address in CRM
 *       b) Check spouse/household members for 100% match
 *       c) Send email verification request to spouse
 *       d) If no perfect match → escalate to president
 *    5. Flagging non-deliverable addresses to prevent future sends
 *
 *  Integration: Called as Phase 2d in bosonto-email-reader-agent.js runOnce()
 *  Standalone:  node banf-delivery-failure-agent.js [--dry-run|--send|--report]
 *
 *  Architecture:
 *  ┌──────────┐    ┌──────────────┐    ┌────────────┐    ┌─────────────┐
 *  │  Gmail    │───>│ Bounce Parse │───>│ CRM Lookup │───>│  Recovery   │
 *  │  Bounce   │    │ (recipient,  │    │ (member,   │    │  Strategy   │
 *  │  Emails   │    │  reason)     │    │  household)│    │  Execution  │
 *  └──────────┘    └──────────────┘    └────────────┘    └─────────────┘
 *       │                                                       │
 *       │         ┌─────────────────────────────────────┐       │
 *       └────────>│  State: delivery-failure-state.json │<──────┘
 *                 │  - processedBounceIds               │
 *                 │  - flaggedEmails                     │
 *                 │  - recoveryActions                   │
 *                 │  - escalations                       │
 *                 └─────────────────────────────────────┘
 *
 * ═══════════════════════════════════════════════════════════════════════
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const nodemailer = require('nodemailer');

// ── Config ──────────────────────────────────────────────────────
const CONFIG = {
  BANF_EMAIL: 'banfjax@gmail.com',
  BANF_NAME: 'BANF - Bengali Association of North Florida',
  ADMIN_EMAIL: 'ranadhir.ghosh@gmail.com',    // President (escalation target)
  ADMIN_NAME: 'Ranadhir Ghosh',
  CRM_FILE: path.join(__dirname, 'banf-crm-reconciliation.json'),
  STATE_FILE: path.join(__dirname, 'delivery-failure-state.json'),
  LOG_FILE: path.join(__dirname, 'delivery-failure-agent.log'),
  SCAN_SINCE: '2026/03/01',       // Only process bounces after this date
  BOUNCE_SENDERS: [
    'mailer-daemon@googlemail.com',
    'postmaster@',
    'mailer-daemon@'
  ],
  // Confidence thresholds
  SPOUSE_CONFIDENCE_THRESHOLD: 0.95, // Only auto-recover if spouse match ≥ 95%
  // Recovery email sender
  GMAIL: {
    CLIENT_ID: '1020178199135-3usrl611ara38i7rhu2ub6sn6g1150ml.apps.googleusercontent.com',
    CLIENT_SECRET: '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',
    REFRESH_TOKEN: require('./banf-gmail-config').REFRESH_TOKEN,
  }
};

// ── CLI Args (only active when run standalone) ── 
const ARGS = process.argv.slice(2);
const DRY_RUN = ARGS.includes('--dry-run');
const DO_SEND = ARGS.includes('--send');
const REPORT_ONLY = ARGS.includes('--report');
const IS_MODULE = require.main !== module;

const REACTIVATE_EMAIL = ARGS.find(a => a.startsWith('--reactivate='));

if (!IS_MODULE && !DRY_RUN && !DO_SEND && !REPORT_ONLY && !REACTIVATE_EMAIL && ARGS.length === 0) {
  console.log('Usage: node banf-delivery-failure-agent.js [options]');
  console.log('  --dry-run                Scan and analyze but do not send any emails');
  console.log('  --send                   Scan, analyze, and send recovery/escalation emails');
  console.log('  --report                 Generate report from existing state');
  console.log('  --reactivate=<email>     Reactivate a suspended email address');
  console.log('  --integrated             Called from bosonto-email-reader-agent.js (non-interactive)');
  process.exit(0);
}

// ── Logging ─────────────────────────────────────────────────────
function log(level, msg) {
  const ts = new Date().toISOString();
  const line = `[${ts}] [${level}] [DeliveryFailure] ${msg}`;
  console.log(line);
  try { fs.appendFileSync(CONFIG.LOG_FILE, line + '\n'); } catch {}
}

// ── State Management ────────────────────────────────────────────
function loadState() {
  try {
    if (fs.existsSync(CONFIG.STATE_FILE)) {
      return JSON.parse(fs.readFileSync(CONFIG.STATE_FILE, 'utf8'));
    }
  } catch (e) {
    log('WARN', `Failed to load state: ${e.message}`);
  }
  return {
    processedBounceIds: [],      // Gmail IDs of processed bounce emails
    flaggedEmails: {},            // { email: { reason, flaggedAt, bounceCount, lastBounce } }
    recoveryActions: [],          // Recovery attempts with results
    escalations: [],              // Escalations sent to president
    spouseVerifications: [],      // Verification emails sent to spouses
    stats: {
      totalBouncesProcessed: 0,
      totalRecovered: 0,
      totalEscalated: 0,
      totalFlagged: 0,
    },
    createdAt: new Date().toISOString()
  };
}

function saveState(state) {
  state.lastSaved = new Date().toISOString();
  fs.writeFileSync(CONFIG.STATE_FILE, JSON.stringify(state, null, 2));
}

// ── HTTP Helper ─────────────────────────────────────────────────
function httpsRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const opts = {
      hostname: u.hostname, port: 443,
      path: u.pathname + u.search,
      method: options.method || 'GET',
      headers: options.headers || {},
      timeout: 30000
    };
    const req = https.request(opts, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(data) }); }
        catch { resolve({ status: res.statusCode, data: data }); }
      });
    });
    req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
    req.on('error', reject);
    if (options.body) req.write(options.body);
    req.end();
  });
}

async function getGmailToken() {
  const body = `grant_type=refresh_token&refresh_token=${encodeURIComponent(CONFIG.GMAIL.REFRESH_TOKEN)}&client_id=${encodeURIComponent(CONFIG.GMAIL.CLIENT_ID)}&client_secret=${encodeURIComponent(CONFIG.GMAIL.CLIENT_SECRET)}`;
  const resp = await httpsRequest('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Content-Length': Buffer.byteLength(body) },
    body
  });
  if (!resp.data.access_token) throw new Error('Gmail token failed: ' + (resp.data.error_description || resp.data.error));
  return resp.data.access_token;
}

async function gmailSearch(query, token, max = 50) {
  const q = encodeURIComponent(query);
  const url = `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${q}&maxResults=${max}`;
  const resp = await httpsRequest(url, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (resp.data.error) throw new Error('Gmail search: ' + resp.data.error.message);
  return (resp.data.messages || []).map(m => m.id);
}

async function gmailGetMessage(id, token) {
  const url = `https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}?format=full`;
  const resp = await httpsRequest(url, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (resp.data.error) throw new Error('Gmail get: ' + resp.data.error.message);
  const msg = resp.data;
  const headers = (msg.payload?.headers || []);
  const getH = name => (headers.find(h => h.name.toLowerCase() === name.toLowerCase()) || {}).value || '';

  let bodyText = '';
  function extractParts(part) {
    if (part.mimeType === 'text/plain' && part.body?.data) {
      try { bodyText += Buffer.from(part.body.data, 'base64').toString('utf8'); } catch {}
    }
    if (part.parts) part.parts.forEach(extractParts);
  }
  extractParts(msg.payload || {});

  return {
    id,
    from: getH('From'),
    to: getH('To'),
    subject: getH('Subject'),
    date: getH('Date'),
    body: bodyText.trim()
  };
}

// ═══════════════════════════════════════════════════════════════
// BOUNCE EMAIL PARSING
// ═══════════════════════════════════════════════════════════════

/**
 * Detect if an email is a delivery failure notification.
 */
function isBounceEmail(from, subject) {
  const fromLower = (from || '').toLowerCase();
  const subjLower = (subject || '').toLowerCase();

  const isBounce =
    fromLower.includes('mailer-daemon') ||
    fromLower.includes('postmaster') ||
    subjLower.includes('delivery status notification') ||
    subjLower.includes('undeliverable') ||
    subjLower.includes('mail delivery') ||
    subjLower.includes('delivery failure');

  return isBounce;
}

/**
 * Parse a bounce email to extract the failed recipient and reason.
 * Returns: { failedEmail, reason, reasonCode, isTemporary, originalSubject, details }
 */
function parseBounceEmail(msg) {
  const body = msg.body || '';
  const subject = msg.subject || '';
  const bodyLower = body.toLowerCase();

  // Extract failed recipient email
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  const allEmails = [...new Set((body.match(emailRegex) || []))];
  const failedEmail = allEmails.find(e => {
    const el = e.toLowerCase();
    return !el.includes('mailer-daemon') &&
           !el.includes('postmaster') &&
           !el.includes('banfjax') &&
           !el.includes('google.com') &&
           !el.includes('googlemail.com');
  });

  // Determine bounce reason
  let reasonCode = 'unknown';
  let reason = 'Unknown delivery failure';
  let isTemporary = false;

  if (bodyLower.includes('out of storage') || bodyLower.includes('over quota') || bodyLower.includes('mailbox full')) {
    reasonCode = 'mailbox_full';
    reason = 'Recipient mailbox is full / over storage quota';
    isTemporary = true;
  } else if (bodyLower.includes('does not exist') || bodyLower.includes('user unknown') ||
             bodyLower.includes('no such user') || bodyLower.includes('account not found') ||
             bodyLower.includes('invalid recipient') || bodyLower.includes('address rejected')) {
    reasonCode = 'address_not_found';
    reason = 'Email address does not exist';
    isTemporary = false;
  } else if (bodyLower.includes('rejected') || bodyLower.includes('blocked') ||
             bodyLower.includes('spam') || bodyLower.includes('denied')) {
    reasonCode = 'rejected';
    reason = 'Email was rejected by recipient server';
    isTemporary = false;
  } else if (bodyLower.includes('connection timed out') || bodyLower.includes('temporarily') ||
             bodyLower.includes('try again') || bodyLower.includes('delay')) {
    reasonCode = 'temporary_failure';
    reason = 'Temporary delivery failure';
    isTemporary = true;
  } else if (bodyLower.includes('too large') || bodyLower.includes('size limit')) {
    reasonCode = 'message_too_large';
    reason = 'Message too large for recipient';
    isTemporary = false;
  }

  // Try to extract the original subject
  const origSubjMatch = body.match(/Subject:\s*(.+?)(?:\n|$)/i);
  const originalSubject = origSubjMatch ? origSubjMatch[1].trim() : null;

  // Extract SMTP error code if present
  const smtpCodeMatch = body.match(/(\d{3})\s+(\d\.\d\.\d)\s+(.+?)(?:\n|$)/);
  const smtpCode = smtpCodeMatch ? smtpCodeMatch[1] : null;
  const smtpDetail = smtpCodeMatch ? smtpCodeMatch[3].trim() : null;

  return {
    failedEmail: failedEmail ? failedEmail.toLowerCase() : null,
    reason,
    reasonCode,
    isTemporary,
    originalSubject,
    smtpCode,
    smtpDetail,
    bounceDate: msg.date,
    bounceGmailId: msg.id,
    rawPreview: body.substring(0, 500)
  };
}

// ═══════════════════════════════════════════════════════════════
// CRM LOOKUP & HOUSEHOLD RECOVERY
// ═══════════════════════════════════════════════════════════════

function loadCRM() {
  try {
    let crm = JSON.parse(fs.readFileSync(CONFIG.CRM_FILE, 'utf8'));
    if (crm.members) crm = crm.members;
    return crm;
  } catch (e) {
    log('ERROR', `Failed to load CRM: ${e.message}`);
    return [];
  }
}

/**
 * Look up a CRM member by email, including household member emails.
 */
function findMemberByEmail(members, email) {
  if (!email) return null;
  const emailLower = email.toLowerCase();

  // Direct match
  for (const m of members) {
    if (m.email?.toLowerCase() === emailLower) {
      return { member: m, matchType: 'direct', confidence: 1.0 };
    }
  }

  // Alternate/secondary email match
  for (const m of members) {
    if (m.alternateEmail?.toLowerCase() === emailLower ||
        m.secondaryEmail?.toLowerCase() === emailLower) {
      return { member: m, matchType: 'alternate', confidence: 0.95 };
    }
  }

  // Household member match
  for (const m of members) {
    for (const hm of (m.householdMembers || [])) {
      if (hm.email?.toLowerCase() === emailLower) {
        return { member: m, matchType: 'household_member', confidence: 0.9, householdMember: hm };
      }
    }
  }

  return null;
}

/**
 * Plan a recovery strategy based on the bounce and CRM data.
 * 
 * Strategy priority:
 *   1. Alternate email on same CRM record     → recoverable (auto-redirect)
 *   2. Spouse with 100% match in household     → recoverable (verify + redirect)
 *   3. Other household member with email       → recoverable (verify + redirect)
 *   4. CRM record exists but no alt contacts   → escalate to president
 *   5. No CRM record at all                    → escalate to president
 */
function planRecoveryStrategy(bounce, crmResult, members) {
  const strategy = {
    action: null,           // 'redirect_alternate' | 'verify_spouse' | 'escalate' | 'flag_only' | 'retry_later'
    confidence: 0,
    targetEmail: null,
    targetName: null,
    reason: '',
    details: {},
    escalateToPresident: false
  };

  // If temporary failure, plan retry
  if (bounce.isTemporary) {
    strategy.action = 'retry_later';
    strategy.reason = `Temporary failure (${bounce.reasonCode}) — will retry on next cycle`;
    strategy.confidence = 0.5;

    // But still check for alternate contacts in case retry continues to fail
  }

  if (!crmResult) {
    // Not in CRM at all
    strategy.action = 'escalate';
    strategy.escalateToPresident = true;
    strategy.reason = `Email ${bounce.failedEmail} not found in CRM — president review needed`;
    strategy.confidence = 0;
    return strategy;
  }

  const member = crmResult.member;

  // 1. Check for alternate email
  const altEmail = member.alternateEmail || member.secondaryEmail;
  if (altEmail && altEmail.toLowerCase() !== bounce.failedEmail.toLowerCase()) {
    strategy.action = 'redirect_alternate';
    strategy.targetEmail = altEmail;
    strategy.targetName = member.displayName;
    strategy.confidence = 0.95;
    strategy.reason = `Alternate email found: ${altEmail}`;
    return strategy;
  }

  // 2. Check spouse/household members
  const householdMembers = member.householdMembers || [];
  const hhType = (member.householdType || '').toLowerCase();

  for (const hm of householdMembers) {
    if (!hm.email || hm.email.toLowerCase() === bounce.failedEmail.toLowerCase()) continue;

    // Calculate spouse confidence
    let spouseConfidence = 0;
    const evidences = [];

    // Same household = strong signal
    evidences.push('same_household');
    spouseConfidence += 0.40;

    // Household type is couple/family = very strong
    if (hhType === 'couple' || hhType === 'family') {
      evidences.push(`household_type_${hhType}`);
      spouseConfidence += 0.30;
    }

    // householdDisplayName contains "&" (e.g. "Sumanta & Rajanya Ghosh")
    if (member.householdDisplayName && member.householdDisplayName.includes('&')) {
      evidences.push('display_name_ampersand');
      spouseConfidence += 0.15;
    }

    // Same last name
    const memberLast = (member.lastName || '').toLowerCase();
    const hmLast = (hm.lastName || '').toLowerCase();
    if (memberLast && hmLast && memberLast === hmLast) {
      evidences.push('same_last_name');
      spouseConfidence += 0.10;
    }

    // Family evidence (if member has high evidence weight)
    if (member.familyEvidence && member.familyEvidence.weight > 20) {
      evidences.push(`family_evidence_${member.familyEvidence.weight}`);
      spouseConfidence += 0.05;
    }

    spouseConfidence = Math.min(spouseConfidence, 1.0);

    if (spouseConfidence >= CONFIG.SPOUSE_CONFIDENCE_THRESHOLD) {
      strategy.action = 'verify_spouse';
      strategy.targetEmail = hm.email;
      strategy.targetName = `${hm.firstName || ''} ${hm.lastName || ''}`.trim();
      strategy.confidence = spouseConfidence;
      strategy.reason = `Spouse/household member found with ${(spouseConfidence * 100).toFixed(0)}% confidence`;
      strategy.details = {
        spouseName: strategy.targetName,
        spouseEmail: hm.email,
        failedMemberName: member.displayName,
        householdType: hhType,
        householdId: member.householdId,
        householdDisplayName: member.householdDisplayName,
        evidences
      };
      return strategy;
    }
  }

  // 3. Check family members (different structure)
  for (const fm of (member.familyMembers || [])) {
    if (!fm.email || fm.email.toLowerCase() === bounce.failedEmail.toLowerCase()) continue;

    strategy.action = 'verify_spouse';
    strategy.targetEmail = fm.email;
    strategy.targetName = `${fm.firstName || ''} ${fm.lastName || ''}`.trim();
    strategy.confidence = 0.85;
    strategy.reason = `Family member found: ${strategy.targetName}`;
    strategy.details = {
      spouseName: strategy.targetName,
      spouseEmail: fm.email,
      failedMemberName: member.displayName,
      relationship: fm.relationship || 'family_member'
    };
    return strategy;
  }

  // 4. No recovery contacts — escalate
  strategy.action = 'escalate';
  strategy.escalateToPresident = true;
  strategy.reason = `Member found in CRM (${member.displayName}) but no alternate contacts for recovery`;
  strategy.details = {
    memberName: member.displayName,
    householdType: hhType,
    householdId: member.householdId,
    ecMember: member.isECMember || false
  };

  return strategy;
}

// ═══════════════════════════════════════════════════════════════
// EMAIL TEMPLATES
// ═══════════════════════════════════════════════════════════════

function buildSpouseVerificationEmail(bounce, strategy) {
  const failedName = strategy.details.failedMemberName || bounce.failedEmail;
  const spouseName = strategy.targetName;
  const spouseEmail = strategy.targetEmail;
  const householdName = strategy.details.householdDisplayName || failedName;

  return {
    subject: `BANF — Email Delivery Issue for ${failedName}`,
    html: `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><style>
  body { font-family: 'Segoe UI', Tahoma, sans-serif; margin: 0; padding: 0; background: #f5f5f5; }
  .container { max-width: 600px; margin: 20px auto; background: #fff; border-radius: 8px; border: 1px solid #ddd; overflow: hidden; }
  .header { background: linear-gradient(135deg, #1a237e 0%, #283593 100%); color: #fff; padding: 24px 30px; }
  .header h1 { font-size: 20px; margin: 0 0 4px 0; }
  .header p { font-size: 13px; margin: 0; opacity: 0.85; }
  .body { padding: 28px 30px; color: #333; line-height: 1.6; }
  .body p { margin: 0 0 14px 0; }
  .alert-box { background: #fff3e0; border-left: 4px solid #ff9800; padding: 14px 16px; margin: 16px 0; border-radius: 0 6px 6px 0; }
  .info-box { background: #e3f2fd; border-left: 4px solid #1976d2; padding: 14px 16px; margin: 16px 0; border-radius: 0 6px 6px 0; }
  .footer { background: #f5f5f5; padding: 16px 30px; font-size: 12px; color: #888; border-top: 1px solid #eee; }
</style></head>
<body>
<div class="container">
  <div class="header">
    <h1>🌸 Bengali Association of North Florida</h1>
    <p>Important — Email Delivery Issue</p>
  </div>
  <div class="body">
    <p>Dear ${spouseName},</p>

    <div class="alert-box">
      <strong>⚠️ Email delivery failed</strong> for <strong>${failedName}</strong> (${bounce.failedEmail}).<br>
      <em>Reason: ${bounce.reason}</em>
    </div>

    <p>We recently sent an email to your household member <strong>${failedName}</strong> but it could not be delivered because their inbox is currently experiencing issues.</p>

    <div class="info-box">
      <strong>What we need from you:</strong><br>
      We are sending this notification to you as the alternate contact for the <strong>${householdName}</strong> household.
      <ul style="margin: 8px 0 0 0; padding-left: 18px;">
        <li>Please let <strong>${failedName}</strong> know their email inbox may need attention</li>
        <li>If there is an updated email address for ${failedName}, please reply to this email with the new address</li>
        <li>If you'd like all future BANF communications to go to your email (${spouseEmail}) instead, please let us know</li>
      </ul>
    </div>

    <p>We want to make sure your family doesn't miss any important BANF communications, including event updates, membership information, and community news.</p>

    <p>Thank you for helping us stay connected!</p>

    <p style="margin-top: 20px;">
      Warm regards,<br>
      <strong>BANF Communication Team</strong><br>
      <em>Bengali Association of North Florida</em>
    </p>
  </div>
  <div class="footer">
    This is an automated message from BANF regarding email delivery issues for your household.
    If you have questions, reply to this email or contact us at banfjax@gmail.com.
  </div>
</div>
</body>
</html>`
  };
}

function buildPresidentEscalationEmail(bounce, strategy, member) {
  const memberInfo = member
    ? `<strong>${member.displayName}</strong> (${member.email}, ${member.householdType || 'unknown'} type, HH: ${member.householdId || 'N/A'})`
    : `<strong>${bounce.failedEmail}</strong> (not found in CRM)`;

  const ecBadge = member?.isECMember
    ? '<span style="background:#c62828;color:#fff;padding:2px 8px;border-radius:4px;font-size:11px;">EC MEMBER</span> '
    : '';

  return {
    subject: `⚠️ BANF Email Delivery Failure — ${bounce.failedEmail} (Action Required)`,
    html: `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><style>
  body { font-family: 'Segoe UI', Tahoma, sans-serif; margin: 0; padding: 0; background: #f5f5f5; }
  .container { max-width: 600px; margin: 20px auto; background: #fff; border-radius: 8px; border: 1px solid #ddd; overflow: hidden; }
  .header { background: linear-gradient(135deg, #b71c1c 0%, #c62828 100%); color: #fff; padding: 24px 30px; }
  .header h1 { font-size: 20px; margin: 0 0 4px 0; }
  .header p { font-size: 13px; margin: 0; opacity: 0.85; }
  .body { padding: 28px 30px; color: #333; line-height: 1.6; }
  .body p { margin: 0 0 14px 0; }
  .alert-box { background: #ffebee; border-left: 4px solid #c62828; padding: 14px 16px; margin: 16px 0; border-radius: 0 6px 6px 0; }
  .info-box { background: #e8f5e9; border-left: 4px solid #2e7d32; padding: 14px 16px; margin: 16px 0; border-radius: 0 6px 6px 0; }
  .detail-table { width: 100%; border-collapse: collapse; margin: 12px 0; }
  .detail-table td { padding: 6px 12px; border-bottom: 1px solid #eee; font-size: 13px; }
  .detail-table td:first-child { font-weight: 600; color: #555; width: 140px; }
  .footer { background: #f5f5f5; padding: 16px 30px; font-size: 12px; color: #888; border-top: 1px solid #eee; }
</style></head>
<body>
<div class="container">
  <div class="header">
    <h1>⚠️ Email Delivery Failure — Escalation</h1>
    <p>Automated notification from BANF Delivery Failure Agent</p>
  </div>
  <div class="body">
    <p>Dear ${CONFIG.ADMIN_NAME},</p>

    <div class="alert-box">
      <strong>Email delivery failed</strong> for ${ecBadge}${memberInfo}<br><br>
      <em>Reason: ${bounce.reason}</em><br>
      <em>SMTP: ${bounce.smtpCode || 'N/A'} — ${bounce.smtpDetail || 'N/A'}</em>
    </div>

    <p><strong>Why this was escalated:</strong> ${strategy.reason}</p>

    <table class="detail-table">
      <tr><td>Failed Email:</td><td>${bounce.failedEmail}</td></tr>
      <tr><td>Failure Type:</td><td>${bounce.reasonCode} (${bounce.isTemporary ? 'Temporary' : 'Permanent'})</td></tr>
      <tr><td>Bounce Date:</td><td>${bounce.bounceDate}</td></tr>
      <tr><td>Original Email:</td><td>${bounce.originalSubject || '(unknown)'}</td></tr>
      ${member ? `<tr><td>CRM Member:</td><td>${member.displayName}</td></tr>
      <tr><td>Household:</td><td>${member.householdType || 'N/A'} (${member.householdId || 'N/A'})</td></tr>
      <tr><td>EC Member:</td><td>${member.isECMember ? 'YES' : 'No'}</td></tr>` : ''}
    </table>

    <div class="info-box">
      <strong>Recommended actions:</strong>
      <ol style="margin: 8px 0 0 0; padding-left: 18px;">
        <li>Contact the member to get an updated email address</li>
        <li>Update the CRM record with the correct email</li>
        <li>If permanently undeliverable, consider removing from active mailing</li>
      </ol>
    </div>

    <p style="font-size: 12px; color: #888; margin-top: 20px;">
      This email has been automatically flagged as non-deliverable. Future emails to ${bounce.failedEmail} will be held
      until the address is verified or updated in the CRM.
    </p>
  </div>
  <div class="footer">
    BANF Delivery Failure Recovery Agent v1.0 | Automated notification | ${new Date().toISOString()}
  </div>
</div>
</body>
</html>`
  };
}

// ═══════════════════════════════════════════════════════════════
// EMAIL SENDING
// ═══════════════════════════════════════════════════════════════

async function createTransporter() {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      type: 'OAuth2',
      user: CONFIG.BANF_EMAIL,
      clientId: CONFIG.GMAIL.CLIENT_ID,
      clientSecret: CONFIG.GMAIL.CLIENT_SECRET,
      refreshToken: CONFIG.GMAIL.REFRESH_TOKEN
    }
  });
  await transporter.verify();
  return transporter;
}

async function sendRecoveryEmail(transporter, to, toName, emailContent) {
  if (DRY_RUN) {
    log('INFO', `  📧 [DRY RUN] Would send to: ${toName} <${to}>`);
    log('INFO', `     Subject: ${emailContent.subject}`);
    return { status: 'dry-run' };
  }

  try {
    const info = await transporter.sendMail({
      from: `"${CONFIG.BANF_NAME}" <${CONFIG.BANF_EMAIL}>`,
      to: `"${toName}" <${to}>`,
      subject: emailContent.subject,
      html: emailContent.html,
    });
    log('INFO', `  ✅ Sent → ${toName} <${to}> (${info.messageId})`);
    return { status: 'sent', messageId: info.messageId };
  } catch (e) {
    log('ERROR', `  ❌ FAILED → ${toName} <${to}>: ${e.message}`);
    return { status: 'failed', error: e.message };
  }
}

// ═══════════════════════════════════════════════════════════════
// MAIN SCAN & RECOVERY PIPELINE
// ═══════════════════════════════════════════════════════════════

/**
 * Main scanning function — can be called standalone or from bosonto-email-reader-agent.js
 * Returns: { bouncesFound, processed, recovered, escalated, flagged }
 */
async function scanDeliveryFailures(existingState, existingToken) {
  const state = existingState || loadState();
  const token = existingToken || await getGmailToken();

  log('INFO', '═══ Delivery Failure Recovery Agent — Scan Start ═══');

  const processedIds = new Set(state.processedBounceIds || []);

  // Phase 1: Search for bounce emails
  const queries = [
    `from:mailer-daemon@googlemail.com after:${CONFIG.SCAN_SINCE}`,
    `from:postmaster after:${CONFIG.SCAN_SINCE}`,
    `subject:"Delivery Status Notification" after:${CONFIG.SCAN_SINCE}`,
  ];

  const allBounceIds = new Set();
  for (const q of queries) {
    try {
      const ids = await gmailSearch(q, token, 50);
      ids.forEach(id => allBounceIds.add(id));
    } catch (e) {
      log('WARN', `Bounce query failed: ${e.message}`);
    }
  }

  const newIds = [...allBounceIds].filter(id => !processedIds.has(id));
  log('INFO', `Bounce emails: ${allBounceIds.size} total, ${newIds.length} new to process`);

  if (newIds.length === 0) {
    log('INFO', 'No new delivery failures to process.');
    return { bouncesFound: 0, processed: 0, recovered: 0, escalated: 0, flagged: 0 };
  }

  // Phase 2: Parse bounce emails
  const bounces = [];
  for (const id of newIds) {
    try {
      const msg = await gmailGetMessage(id, token);
      if (!isBounceEmail(msg.from, msg.subject)) {
        processedIds.add(id);
        continue;
      }
      const bounce = parseBounceEmail(msg);
      if (bounce.failedEmail) {
        bounces.push(bounce);
        log('INFO', `  📛 Bounce: ${bounce.failedEmail} — ${bounce.reasonCode} (${bounce.isTemporary ? 'temp' : 'perm'})`);
      } else {
        log('WARN', `  Could not parse failed email from bounce ${id}`);
      }
      processedIds.add(id);
    } catch (e) {
      log('WARN', `Failed to fetch bounce email ${id}: ${e.message}`);
    }
  }

  log('INFO', `Parsed ${bounces.length} delivery failures`);

  // Phase 3: CRM lookup & recovery planning
  // De-duplicate: if the same email already had action taken, just bump bounce count — do NOT re-send
  const members = loadCRM();
  const recoveryPlans = [];

  for (const bounce of bounces) {
    const existingFlag = state.flaggedEmails[bounce.failedEmail];
    if (existingFlag && existingFlag.actionTaken && existingFlag.suspended) {
      // Already handled — just update bounce count & timestamp, skip recovery
      existingFlag.bounceCount = (existingFlag.bounceCount || 0) + 1;
      existingFlag.lastBounce = new Date().toISOString();
      log('INFO', `  ⏸️  ${bounce.failedEmail} — already actioned & suspended (bounce #${existingFlag.bounceCount}), skipping re-send`);
      continue;  // Do NOT plan another recovery action
    }

    const crmResult = findMemberByEmail(members, bounce.failedEmail);
    const strategy = planRecoveryStrategy(bounce, crmResult, members);

    recoveryPlans.push({
      bounce,
      crmResult,
      strategy,
      member: crmResult?.member || null
    });

    log('INFO', `  Strategy for ${bounce.failedEmail}: ${strategy.action} (conf: ${(strategy.confidence * 100).toFixed(0)}%)`);
    if (strategy.targetEmail) {
      log('INFO', `    → Target: ${strategy.targetName} <${strategy.targetEmail}>`);
    }
  }

  // Phase 4: Execute recovery actions
  let transporter = null;
  if (DO_SEND && recoveryPlans.length > 0) {
    log('INFO', 'Creating Gmail transporter for recovery emails...');
    transporter = await createTransporter();
    log('INFO', 'Transporter verified.');
  }

  let recovered = 0;
  let escalated = 0;
  let flagged = 0;

  for (const plan of recoveryPlans) {
    const { bounce, strategy, member } = plan;
    const actionRecord = {
      failedEmail: bounce.failedEmail,
      bounceReason: bounce.reasonCode,
      isTemporary: bounce.isTemporary,
      action: strategy.action,
      confidence: strategy.confidence,
      timestamp: new Date().toISOString()
    };

    switch (strategy.action) {
      case 'verify_spouse': {
        // Send verification email to spouse
        const emailContent = buildSpouseVerificationEmail(bounce, strategy);

        if (transporter || DRY_RUN) {
          const result = await sendRecoveryEmail(
            transporter,
            strategy.targetEmail,
            strategy.targetName,
            emailContent
          );
          actionRecord.sendResult = result;
          actionRecord.targetEmail = strategy.targetEmail;
          actionRecord.targetName = strategy.targetName;

          if (result.status === 'sent' || result.status === 'dry-run') {
            recovered++;
            state.spouseVerifications.push({
              failedEmail: bounce.failedEmail,
              spouseEmail: strategy.targetEmail,
              spouseName: strategy.targetName,
              confidence: strategy.confidence,
              sentAt: new Date().toISOString(),
              status: result.status
            });
          }
        } else {
          actionRecord.sendResult = { status: 'not-sent', reason: 'Use --send to enable' };
        }
        break;
      }

      case 'redirect_alternate': {
        // Log the redirect — actual resend would be separate
        log('INFO', `  🔄 Would redirect to alternate: ${strategy.targetEmail}`);
        actionRecord.targetEmail = strategy.targetEmail;
        actionRecord.note = 'Alternate email found — can retry send to this address';
        recovered++;
        break;
      }

      case 'escalate': {
        // Send escalation to president
        const emailContent = buildPresidentEscalationEmail(bounce, strategy, member);

        if (transporter || DRY_RUN) {
          const result = await sendRecoveryEmail(
            transporter,
            CONFIG.ADMIN_EMAIL,
            CONFIG.ADMIN_NAME,
            emailContent
          );
          actionRecord.sendResult = result;
          escalated++;

          state.escalations.push({
            failedEmail: bounce.failedEmail,
            memberName: member?.displayName || bounce.failedEmail,
            reason: strategy.reason,
            sentAt: new Date().toISOString(),
            status: result.status
          });
        } else {
          actionRecord.sendResult = { status: 'not-sent', reason: 'Use --send to enable' };
          escalated++;
        }
        break;
      }

      case 'retry_later': {
        log('INFO', `  ⏳ Will retry later: ${bounce.failedEmail} (${bounce.reasonCode})`);
        actionRecord.note = 'Temporary failure — will be retried';
        // Still flag but as temporary
        break;
      }

      default: {
        log('WARN', `  Unknown recovery action: ${strategy.action}`);
        break;
      }
    }

    // Flag the email address and mark action as taken → suspended until reactivated
    const existingFlag = state.flaggedEmails[bounce.failedEmail] || {};
    const actionWasSent = strategy.action === 'verify_spouse' || strategy.action === 'escalate' || strategy.action === 'redirect_alternate';
    state.flaggedEmails[bounce.failedEmail] = {
      reason: bounce.reasonCode,
      isTemporary: bounce.isTemporary,
      flaggedAt: existingFlag.flaggedAt || new Date().toISOString(),
      lastBounce: new Date().toISOString(),
      bounceCount: (existingFlag.bounceCount || 0) + 1,
      recoveryAction: strategy.action,
      recoveryTarget: strategy.targetEmail || null,
      memberName: member?.displayName || null,
      householdId: member?.householdId || null,
      // Once action is taken (spouse notified / president escalated), suspend all
      // future sends AND recovery emails. Manual reactivation required.
      actionTaken: actionWasSent,
      suspended: actionWasSent,
      suspendedAt: actionWasSent ? new Date().toISOString() : null
    };
    flagged++;

    state.recoveryActions.push(actionRecord);
  }

  // Update state
  state.processedBounceIds = [...processedIds];
  state.stats.totalBouncesProcessed += bounces.length;
  state.stats.totalRecovered += recovered;
  state.stats.totalEscalated += escalated;
  state.stats.totalFlagged += flagged;

  saveState(state);

  log('INFO', '═══ Delivery Failure Recovery — Complete ═══');
  log('INFO', `  Bounces found: ${bounces.length}`);
  log('INFO', `  Recovered: ${recovered}`);
  log('INFO', `  Escalated: ${escalated}`);
  log('INFO', `  Flagged: ${flagged}`);

  return {
    bouncesFound: bounces.length,
    processed: bounces.length,
    recovered,
    escalated,
    flagged,
    bounces,
    plans: recoveryPlans
  };
}

// ═══════════════════════════════════════════════════════════════
// isEmailFlagged — Public API for other agents
// ═══════════════════════════════════════════════════════════════

/**
 * Check if an email is flagged as non-deliverable.
 * Call this before sending any email to prevent sending to known-bad addresses.
 * Returns: { flagged: bool, suspended: bool, reason, isTemporary, recoveryTarget, bounceCount }
 */
function isEmailFlagged(email) {
  try {
    const state = loadState();
    const flag = state.flaggedEmails[email.toLowerCase()];
    if (!flag) return { flagged: false, suspended: false };
    return {
      flagged: true,
      suspended: !!flag.suspended,
      actionTaken: !!flag.actionTaken,
      reason: flag.reason,
      isTemporary: flag.isTemporary,
      recoveryTarget: flag.recoveryTarget,
      bounceCount: flag.bounceCount,
      memberName: flag.memberName,
      flaggedAt: flag.flaggedAt,
      lastBounce: flag.lastBounce,
      suspendedAt: flag.suspendedAt
    };
  } catch {
    return { flagged: false, suspended: false };
  }
}

/**
 * Reactivate a suspended email address.
 * Call this after the member fixes their email (e.g. clears inbox, updates address).
 * Clears the suspension so future sends are allowed again.
 * Returns: { reactivated: bool, email, previousBounces }
 */
function reactivateEmail(email) {
  try {
    const state = loadState();
    const emailLower = email.toLowerCase();
    const flag = state.flaggedEmails[emailLower];
    if (!flag) return { reactivated: false, email: emailLower, error: 'Not flagged' };

    const previousBounces = flag.bounceCount;
    // Clear suspension but keep history
    flag.suspended = false;
    flag.actionTaken = false;
    flag.reactivatedAt = new Date().toISOString();
    flag.reactivationHistory = flag.reactivationHistory || [];
    flag.reactivationHistory.push({
      reactivatedAt: new Date().toISOString(),
      previousBounces,
      previousReason: flag.reason
    });
    // Reset bounce count so it starts fresh
    flag.bounceCount = 0;

    saveState(state);
    log('INFO', `✅ Reactivated ${emailLower} — was suspended since ${flag.suspendedAt} with ${previousBounces} bounces`);
    return { reactivated: true, email: emailLower, previousBounces };
  } catch (e) {
    return { reactivated: false, email, error: e.message };
  }
}

// ═══════════════════════════════════════════════════════════════
// REPORT GENERATION
// ═══════════════════════════════════════════════════════════════

function generateReport(scanResults) {
  const state = loadState();
  const ts = new Date().toISOString();

  let html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>BANF Delivery Failure Recovery Report</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Segoe UI', Tahoma, sans-serif; background: #0a0a1a; color: #e0e0e0; padding: 30px; }
  .header { background: linear-gradient(135deg, #1a1a3e 0%, #4a0000 100%); border-radius: 12px; padding: 30px; margin-bottom: 24px; border: 1px solid #6a2020; }
  .header h1 { font-size: 24px; color: #fff; margin-bottom: 8px; }
  .header .subtitle { color: #aaa; font-size: 14px; }
  .summary { display: grid; grid-template-columns: repeat(5, 1fr); gap: 16px; margin-bottom: 24px; }
  .summary-card { background: #1a1a2e; border-radius: 10px; padding: 16px; border: 1px solid #333; text-align: center; }
  .summary-card .number { font-size: 28px; font-weight: 700; }
  .summary-card .label { font-size: 11px; color: #888; text-transform: uppercase; letter-spacing: 1px; margin-top: 4px; }
  .recovered { color: #00e676; }
  .escalated { color: #ff9800; }
  .flagged { color: #ff5252; }
  .section { background: #1a1a2e; border-radius: 10px; margin-bottom: 16px; border: 1px solid #333; overflow: hidden; }
  .section-header { background: #222244; padding: 14px 20px; font-size: 15px; font-weight: 600; border-bottom: 1px solid #333; }
  .bounce-row { padding: 16px 20px; border-bottom: 1px solid #1a1a2e; }
  .bounce-row:last-child { border-bottom: none; }
  .bounce-row:hover { background: #222240; }
  .bounce-email { font-size: 15px; font-weight: 600; color: #ff7043; }
  .bounce-reason { color: #888; font-size: 13px; margin-top: 4px; }
  .bounce-action { margin-top: 8px; padding: 8px 12px; border-radius: 6px; font-size: 13px; }
  .action-recovered { background: #1b5e20; border: 1px solid #4caf50; }
  .action-escalated { background: #4a3000; border: 1px solid #ff9800; }
  .action-retry { background: #1a237e; border: 1px solid #3f51b5; }
  .footer { text-align: center; padding: 20px; color: #555; font-size: 12px; }
</style>
</head>
<body>

<div class="header">
  <h1>📛 BANF Delivery Failure Recovery Report</h1>
  <div class="subtitle">Generated: ${ts} | Agent v1.0</div>
</div>

<div class="summary">
  <div class="summary-card"><div class="number">${state.stats.totalBouncesProcessed}</div><div class="label">Bounces Processed</div></div>
  <div class="summary-card"><div class="number recovered">${state.stats.totalRecovered}</div><div class="label">Recovered</div></div>
  <div class="summary-card"><div class="number escalated">${state.stats.totalEscalated}</div><div class="label">Escalated</div></div>
  <div class="summary-card"><div class="number flagged">${state.stats.totalFlagged}</div><div class="label">Flagged</div></div>
  <div class="summary-card"><div class="number">${Object.keys(state.flaggedEmails).length}</div><div class="label">Unique Flagged</div></div>
</div>`;

  // Flagged emails detail
  let flaggedRows = '';
  for (const [email, flag] of Object.entries(state.flaggedEmails)) {
    const actionClass = flag.recoveryAction === 'verify_spouse' ? 'action-recovered'
      : flag.recoveryAction === 'escalate' ? 'action-escalated'
      : 'action-retry';

    flaggedRows += `
    <div class="bounce-row">
      <div class="bounce-email">${email}</div>
      <div class="bounce-reason">
        Reason: ${flag.reason} | Bounces: ${flag.bounceCount} | ${flag.isTemporary ? 'Temporary' : 'Permanent'}<br>
        Member: ${flag.memberName || 'Unknown'} | Household: ${flag.householdId || 'N/A'}
      </div>
      <div class="bounce-action ${actionClass}">
        Action: ${flag.recoveryAction || 'none'} ${flag.recoveryTarget ? `→ ${flag.recoveryTarget}` : ''}
      </div>
    </div>`;
  }

  html += `
<div class="section">
  <div class="section-header">📛 Flagged Non-Deliverable Addresses (${Object.keys(state.flaggedEmails).length})</div>
  ${flaggedRows || '<div class="bounce-row" style="color: #66bb6a;">No flagged addresses — all clear!</div>'}
</div>`;

  // Spouse verifications
  if (state.spouseVerifications.length > 0) {
    let verRows = '';
    for (const v of state.spouseVerifications) {
      verRows += `
      <div class="bounce-row">
        <div class="bounce-email">${v.failedEmail} → ${v.spouseEmail}</div>
        <div class="bounce-reason">
          Spouse: ${v.spouseName} | Confidence: ${(v.confidence * 100).toFixed(0)}% | Status: ${v.status}<br>
          Sent: ${v.sentAt}
        </div>
      </div>`;
    }
    html += `
<div class="section">
  <div class="section-header">💑 Spouse Verification Emails Sent (${state.spouseVerifications.length})</div>
  ${verRows}
</div>`;
  }

  // Escalations
  if (state.escalations.length > 0) {
    let escRows = '';
    for (const e of state.escalations) {
      escRows += `
      <div class="bounce-row">
        <div class="bounce-email">${e.failedEmail}</div>
        <div class="bounce-reason">
          Member: ${e.memberName} | Reason: ${e.reason}<br>
          Escalated: ${e.sentAt} | Status: ${e.status}
        </div>
      </div>`;
    }
    html += `
<div class="section">
  <div class="section-header">🔺 Escalations to President (${state.escalations.length})</div>
  ${escRows}
</div>`;
  }

  html += `
<div class="footer">
  BANF Delivery Failure Recovery Agent v1.0 | ${ts}
</div>
</body>
</html>`;

  const reportFile = path.join(__dirname, 'banf-delivery-failure-report.html');
  fs.writeFileSync(reportFile, html);
  log('INFO', `Report saved: ${reportFile}`);
  return reportFile;
}

// ═══════════════════════════════════════════════════════════════
// STANDALONE MAIN
// ═══════════════════════════════════════════════════════════════

async function main() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  📛 BANF Delivery Failure Recovery Agent v1.0');
  console.log(`  📅 ${new Date().toISOString()}`);
  console.log(`  🔧 Mode: ${DO_SEND ? 'LIVE SEND' : DRY_RUN ? 'DRY RUN' : REPORT_ONLY ? 'REPORT ONLY' : 'ANALYSIS'}`);
  console.log('═══════════════════════════════════════════════════════════');

  if (REACTIVATE_EMAIL) {
    const email = REACTIVATE_EMAIL.split('=')[1];
    console.log(`\n  Reactivating: ${email}`);
    const result = reactivateEmail(email);
    if (result.reactivated) {
      console.log(`  ✅ ${email} reactivated (was ${result.previousBounces} bounces)`);
      console.log('  Future sends to this address are now allowed.');
    } else {
      console.log(`  ❌ Could not reactivate: ${result.error}`);
    }
    return;
  }

  if (REPORT_ONLY) {
    generateReport(null);
    return;
  }

  const results = await scanDeliveryFailures();
  generateReport(results);

  console.log('\n═══════════════════════════════════════════════════════════');
  console.log(`  📛 Bounces: ${results.bouncesFound}`);
  console.log(`  ✅ Recovered: ${results.recovered}`);
  console.log(`  🔺 Escalated: ${results.escalated}`);
  console.log(`  🚩 Flagged: ${results.flagged}`);
  console.log('═══════════════════════════════════════════════════════════');
}

// Export for integration with bosonto-email-reader-agent.js
module.exports = {
  scanDeliveryFailures,
  isEmailFlagged,
  reactivateEmail,
  isBounceEmail,
  parseBounceEmail,
  findMemberByEmail,
  planRecoveryStrategy,
  loadState: () => loadState(),
  CONFIG
};

// Run standalone if called directly
if (require.main === module) {
  main().catch(e => {
    log('ERROR', `Fatal: ${e.message}`);
    console.error(e.stack);
    process.exit(1);
  });
}
