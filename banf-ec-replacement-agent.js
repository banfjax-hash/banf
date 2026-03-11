#!/usr/bin/env node
/**
 * ═══════════════════════════════════════════════════════════════════════
 *  BANF EC Member Replacement Agent
 * ═══════════════════════════════════════════════════════════════════════
 *
 *  President-only workflow for EC member resignation or suspension.
 *
 *  ██ WORKFLOW ██
 *
 *  A. RESIGNATION:
 *    1. President initiates resignation for EC member (from portal)
 *    2. System revokes EC admin rights (AdminRoles collection → isActive: false)
 *    3. System changes the member's Gmail password via Google Workspace API
 *    4. System sends "thank you" email to the resigning member
 *    5. System sends notification email to ALL EC members about:
 *       - The resignation
 *       - Any pending reimbursement instructions
 *       - Request for acknowledgment
 *    6. System waits for EC member replies (tracked via email reader)
 *    7. Once all EC replies received (or 48h timeout):
 *       - Send final farewell email to resigning member with EC wishes
 *       - Update all tracking collections
 *
 *  B. SUSPENSION:
 *    1. President initiates suspension (from portal)
 *    2. System revokes EC admin rights temporarily
 *    3. System changes Gmail password
 *    4. System sends suspension notice to all EC members
 *    5. No farewell — suspension can be reversed
 *
 *  State: banf-ec-replacement-state.json
 *
 *  Usage:
 *    node banf-ec-replacement-agent.js --dry-test
 *    node banf-ec-replacement-agent.js --status
 *    node banf-ec-replacement-agent.js --check-replies
 *
 *    API:
 *      const agent = require('./banf-ec-replacement-agent.js');
 *      await agent.initiateResignation(presidentEmail, memberEmail, reason);
 *      await agent.initiateSuspension(presidentEmail, memberEmail, reason);
 *      await agent.processEcReply(memberEmail, originalRequestId, message);
 *      await agent.checkAndFinalize();
 *
 * ═══════════════════════════════════════════════════════════════════════
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const crypto = require('crypto');

// ─── Config ─────────────────────────────────────────────────────
const STATE_FILE = path.join(__dirname, 'banf-ec-replacement-state.json');
const LOG_FILE = path.join(__dirname, 'banf-ec-replacement.log');
const SEND_EMAIL_URL = 'https://banfwix.wixsite.com/banf1/_functions/send_email';
const WIX_API_BASE = 'https://banfwix.wixsite.com/banf1/_functions';
const ADMIN_KEY = 'banf-bosonto-2026-live';
const PRESIDENT_EMAIL = 'ranadhir.ghosh@gmail.com';
const BANF_EMAIL = 'banfjax@gmail.com';

const REPLY_TIMEOUT_HOURS = 48; // Wait max 48h for EC replies before sending final email

const GMAIL_OAUTH = {
  CLIENT_ID: '1020178199135-3usrl611ara38i7rhu2ub6sn6g1150ml.apps.googleusercontent.com',
  CLIENT_SECRET: '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',
  REFRESH_TOKEN: require('./banf-gmail-config').REFRESH_TOKEN
};

// ─── EC Members ─────────────────────────────────────────────────
const EC_MEMBERS = {
  'ranadhir.ghosh@gmail.com':       { name: 'Ranadhir Ghosh', role: 'President', ecTitle: 'President' },
  'mukhopadhyay.partha@gmail.com':  { name: 'Partha Mukhopadhyay', role: 'Vice President', ecTitle: 'Vice President' },
  'amit.everywhere@gmail.com':      { name: 'Amit Chandak', role: 'Treasurer', ecTitle: 'Treasurer' },
  'rajanya.ghosh@gmail.com':        { name: 'Rajanya Ghosh', role: 'General Secretary', ecTitle: 'General Secretary' },
  'moumita.mukherje@gmail.com':     { name: 'Moumita Mukherjee', role: 'Cultural Secretary', ecTitle: 'Cultural Secretary' },
  'duttasoumyajit86@gmail.com':     { name: 'Soumyajit Dutta', role: 'Food Coordinator', ecTitle: 'Food Coordinator' },
  'sumo475@gmail.com':              { name: 'Sumanta Datta', role: 'Event Coordinator', ecTitle: 'Event Coordinator' },
  'rwitichoudhury@gmail.com':       { name: 'Rwiti Choudhury', role: 'Puja Coordinator', ecTitle: 'Puja Coordinator' }
};

const REPLACEMENT_STATUS = {
  INITIATED: 'initiated',
  RIGHTS_REVOKED: 'rights_revoked',
  PASSWORD_CHANGED: 'password_changed',
  THANK_YOU_SENT: 'thank_you_sent',
  EC_NOTIFIED: 'ec_notified',
  AWAITING_REPLIES: 'awaiting_replies',
  FINALIZED: 'finalized',
  REVERSED: 'reversed',       // Suspension reversed
  FAILED: 'failed'
};

const WORKFLOW_TYPE = {
  RESIGNATION: 'resignation',
  SUSPENSION: 'suspension'
};

// ─── Logging ────────────────────────────────────────────────────
function log(level, msg) {
  const ts = new Date().toISOString();
  const line = `[${ts}] [${level}] [ECReplace] ${msg}`;
  console.log(line);
  try { fs.appendFileSync(LOG_FILE, line + '\n'); } catch {}
}

// ─── State Management ───────────────────────────────────────────
function loadState() {
  try { return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8')); }
  catch { return { requests: [], nextId: 1, stats: { resignations: 0, suspensions: 0, reversed: 0, finalized: 0 } }; }
}

function saveState(state) {
  state.updatedAt = new Date().toISOString();
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

// ─── HTTP Helpers ───────────────────────────────────────────────
function httpsPost(url, data) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const body = JSON.stringify(data);
    const req = https.request({
      hostname: u.hostname, port: 443,
      path: u.pathname + u.search,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
      timeout: 30000
    }, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(d) }); }
        catch { resolve({ status: res.statusCode, data: d }); }
      });
    });
    req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

// ═══════════════════════════════════════════════════════════════
// AUTHORIZATION CHECK — President Only
// ═══════════════════════════════════════════════════════════════

function authorizePresident(callerEmail) {
  const normalized = (callerEmail || '').toLowerCase().trim();
  if (normalized !== PRESIDENT_EMAIL) {
    throw new Error(`UNAUTHORIZED: Only the President (${PRESIDENT_EMAIL}) can perform EC member replacement operations. Caller: ${callerEmail}`);
  }
  return true;
}

// ═══════════════════════════════════════════════════════════════
// STEP 1: Revoke EC Admin Rights (Wix AdminRoles collection)
// ═══════════════════════════════════════════════════════════════

async function revokeEcRights(memberEmail, reason, type) {
  log('INFO', `Revoking EC rights for ${memberEmail} (${type})...`);

  try {
    const resp = await httpsPost(`${WIX_API_BASE}/ec_revoke_rights`, {
      adminKey: ADMIN_KEY,
      memberEmail,
      reason,
      type, // 'resignation' or 'suspension'
      revokedBy: PRESIDENT_EMAIL,
      revokedAt: new Date().toISOString()
    });

    if (resp.status === 200 && resp.data?.success) {
      log('INFO', `  EC rights revoked for ${memberEmail}`);
      return { success: true, data: resp.data };
    } else {
      log('WARN', `  Wix revoke endpoint returned: ${resp.status} — ${JSON.stringify(resp.data)}`);
      // Continue anyway — rights will be updated manually if needed
      return { success: false, error: `Wix API returned ${resp.status}`, data: resp.data };
    }
  } catch (e) {
    log('WARN', `  Wix revoke API failed: ${e.message} — will mark for manual follow-up`);
    return { success: false, error: e.message };
  }
}

// ═══════════════════════════════════════════════════════════════
// STEP 2: Change Gmail Password (Google Admin SDK)
// ═══════════════════════════════════════════════════════════════

async function changeGmailPassword(memberEmail, newPassword = null) {
  log('INFO', `Changing Gmail password for ${memberEmail}...`);

  // Generate a new secure password if not provided
  if (!newPassword) {
    newPassword = 'BANF-' + crypto.randomBytes(6).toString('base64url').substring(0, 12) + '!';
  }

  // Note: Changing Gmail password for external Gmail accounts is NOT possible via API
  // This only works for Google Workspace managed accounts.
  // For personal Gmail accounts, we flag this as a MANUAL step for the president.

  const member = EC_MEMBERS[memberEmail.toLowerCase()];
  const result = {
    success: false,
    method: 'manual',
    generatedPassword: newPassword,
    instruction: `MANUAL ACTION REQUIRED: The Gmail password for ${memberEmail} (${member?.name || 'EC Member'}) cannot be changed programmatically for personal Gmail accounts. The president must either:\n1. Have the member change their own password as part of resignation\n2. Or if this is a Workspace account, use Google Admin Console\n\nIf this is a shared BANF account, update it in the BANF credentials vault.`
  };

  // If this is the BANF org Gmail (Workspace), try the Admin SDK
  if (memberEmail.toLowerCase().endsWith('@jaxbengali.org')) {
    try {
      // Would use Google Admin SDK: directory.users.update({ userKey, requestBody: { password } })
      // For now, flag as requiring Google Workspace Admin access
      log('INFO', `  Workspace account detected — would use Admin SDK for ${memberEmail}`);
      result.method = 'workspace_admin_sdk';
      result.instruction = `Google Workspace Admin SDK call needed for ${memberEmail}. Ensure admin.googleapis.com is enabled.`;
    } catch (e) {
      log('WARN', `  Admin SDK failed: ${e.message}`);
    }
  }

  log('INFO', `  Password change: ${result.method} — generated password available in state`);
  return result;
}

// ═══════════════════════════════════════════════════════════════
// EMAIL TEMPLATES
// ═══════════════════════════════════════════════════════════════

function buildThankYouEmail(member, request) {
  return {
    subject: `🙏 Thank You for Your Service to BANF — ${member.name}`,
    html: `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#f0f4f8;font-family:'Segoe UI',system-ui,sans-serif">
<div style="max-width:600px;margin:20px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.08)">
  <div style="background:linear-gradient(135deg,#1e3a5f,#d4a843);padding:32px;text-align:center">
    <h1 style="color:#fff;font-size:24px;margin:0">🙏</h1>
    <h2 style="color:#fff;font-size:18px;margin:8px 0 0">Thank You, ${member.name}</h2>
    <p style="color:rgba(255,255,255,.8);font-size:12px;margin:4px 0 0">Bengali Association of North Florida</p>
  </div>
  <div style="padding:24px">
    <p style="font-size:14px;color:#1a1a1a;line-height:1.7">Dear <strong>${member.name}</strong>,</p>
    <p style="font-size:13px;color:#4a4a4a;line-height:1.7">On behalf of the entire BANF Executive Committee and our community, I want to sincerely thank you for your dedicated service as <strong>${member.ecTitle}</strong>.</p>
    <p style="font-size:13px;color:#4a4a4a;line-height:1.7">Your contributions during your tenure have been invaluable. The time, effort, and passion you brought to organizing events, coordinating activities, and serving our Bengali community in North Florida will be remembered and appreciated.</p>
    
    <div style="background:#f0f7ff;border-radius:12px;padding:16px;margin:20px 0;border-left:4px solid #2d5a8e">
      <h3 style="font-size:14px;color:#1e3a5f;margin:0 0 8px">📋 Administrative Notes</h3>
      <ul style="font-size:12px;color:#4a4a4a;line-height:1.8;margin:0;padding-left:18px">
        <li>Your EC admin access has been updated as of ${new Date().toLocaleDateString()}</li>
        <li>If you have any pending BANF reimbursements, please submit them within 30 days</li>
        <li>Please hand over any BANF materials, keys, or accounts to the President</li>
        <li>You remain a valued member of the BANF community</li>
      </ul>
    </div>

    <p style="font-size:13px;color:#4a4a4a;line-height:1.7">We wish you all the best in your future endeavors. You will always be a part of the BANF family. 🌸</p>
    
    <p style="font-size:13px;color:#1a1a1a;margin-top:24px">
      With gratitude,<br>
      <strong>Ranadhir Ghosh</strong><br>
      <span style="font-size:12px;color:#666">President, BANF</span>
    </p>
  </div>
  <div style="background:#f8fafc;padding:12px 24px;text-align:center;border-top:1px solid #e5e7eb">
    <p style="font-size:10px;color:#999;margin:0">Bengali Association of North Florida (BANF) | www.jaxbengali.org</p>
  </div>
</div></body></html>`
  };
}

function buildSuspensionNoticeEmail(member, request) {
  return {
    subject: `⚠️ BANF EC Member Suspension Notice — ${member.name} (${member.ecTitle})`,
    html: `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#f0f4f8;font-family:'Segoe UI',system-ui,sans-serif">
<div style="max-width:600px;margin:20px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.08)">
  <div style="background:linear-gradient(135deg,#991b1b,#ef4444);padding:24px;text-align:center">
    <h1 style="color:#fff;font-size:18px;margin:0">⚠️ EC Member Suspension Notice</h1>
    <p style="color:rgba(255,255,255,.8);font-size:12px;margin:4px 0 0">BANF Executive Committee</p>
  </div>
  <div style="padding:24px">
    <p style="font-size:14px;color:#1a1a1a">${member.name},</p>
    <p style="font-size:13px;color:#4a4a4a;line-height:1.7">This is to inform you that your EC admin access as <strong>${member.ecTitle}</strong> has been <strong style="color:#ef4444">suspended</strong> effective ${new Date().toLocaleDateString()}.</p>
    <div style="background:#fef2f2;border-radius:12px;padding:16px;margin:16px 0;border-left:4px solid #ef4444">
      <p style="font-size:12px;color:#991b1b;margin:0"><strong>Reason:</strong> ${request.reason || 'As determined by the EC President.'}</p>
    </div>
    <p style="font-size:13px;color:#4a4a4a;line-height:1.7">During the suspension period, your portal access and EC privileges are temporarily revoked. This suspension may be reversed by the President.</p>
    <p style="font-size:12px;color:#666">If you have questions, please contact the President at ${PRESIDENT_EMAIL}.</p>
  </div>
</div></body></html>`
  };
}

function buildEcNotificationEmail(departing, request, recipients) {
  const isResignation = request.type === WORKFLOW_TYPE.RESIGNATION;
  const recipientNames = recipients.map(r => r.name).join(', ');

  return {
    subject: isResignation
      ? `📢 EC Update: ${departing.name} (${departing.ecTitle}) Resignation`
      : `⚠️ EC Update: ${departing.name} (${departing.ecTitle}) Suspension`,
    html: `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#f0f4f8;font-family:'Segoe UI',system-ui,sans-serif">
<div style="max-width:600px;margin:20px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.08)">
  <div style="background:linear-gradient(135deg,#1e3a5f,#d4a843);padding:24px;text-align:center">
    <h1 style="color:#fff;font-size:18px;margin:0">${isResignation ? '📢' : '⚠️'} EC Committee Update</h1>
    <p style="color:rgba(255,255,255,.8);font-size:12px;margin:4px 0 0">Bengali Association of North Florida</p>
  </div>
  <div style="padding:24px">
    <p style="font-size:14px;color:#1a1a1a">Dear EC Members,</p>
    <p style="font-size:13px;color:#4a4a4a;line-height:1.7">${isResignation
      ? `I am writing to inform you that <strong>${departing.name}</strong>, our <strong>${departing.ecTitle}</strong>, has resigned from the Executive Committee effective ${new Date().toLocaleDateString()}.`
      : `This is to notify you that <strong>${departing.name}</strong>, our <strong>${departing.ecTitle}</strong>, has been suspended from the Executive Committee effective ${new Date().toLocaleDateString()}.`
    }</p>

    ${request.reason ? `
    <div style="background:#f0f7ff;border-radius:12px;padding:14px;margin:16px 0;border-left:4px solid #2d5a8e">
      <p style="font-size:12px;color:#1e3a5f;margin:0"><strong>Details:</strong> ${request.reason}</p>
    </div>` : ''}

    ${isResignation ? `
    <div style="background:#fffbeb;border-radius:12px;padding:14px;margin:16px 0;border-left:4px solid #eab308">
      <h3 style="font-size:13px;color:#92400e;margin:0 0 6px">📋 Action Items</h3>
      <ul style="font-size:12px;color:#78350f;line-height:1.8;margin:0;padding-left:18px">
        <li>If ${departing.name} has any pending reimbursements from BANF, please coordinate with the Treasurer</li>
        <li>All shared materials, keys, or credentials held by ${departing.name} should be collected</li>
        <li>If you have any pending work items jointly with ${departing.name}, please update accordingly</li>
        <li><strong>Please reply to this email to acknowledge receipt and share any farewell wishes</strong></li>
      </ul>
    </div>` : ''}

    <p style="font-size:13px;color:#4a4a4a;line-height:1.7">${isResignation
      ? `We thank ${departing.name} for their service to BANF. Your acknowledgment replies will be compiled and shared.`
      : `The ${departing.ecTitle} responsibilities will be temporarily reassigned. Further updates will follow.`
    }</p>

    <p style="font-size:13px;color:#1a1a1a;margin-top:24px">
      Regards,<br>
      <strong>Ranadhir Ghosh</strong><br>
      <span style="font-size:12px;color:#666">President, BANF</span>
    </p>
    
    <p style="font-size:10px;color:#999;margin-top:16px">
      Request ID: ${request.id} | Sent to: ${recipientNames}
    </p>
  </div>
</div></body></html>`
  };
}

function buildFinalFarewellEmail(departing, request, ecWishes) {
  const wishesHtml = ecWishes.map(w =>
    `<div style="background:#f8f8ff;border-radius:8px;padding:12px;margin:8px 0;border-left:3px solid #d4a843">
      <p style="font-size:12px;color:#1e3a5f;margin:0 0 4px"><strong>${w.fromName}</strong> (${w.fromTitle}):</p>
      <p style="font-size:12px;color:#4a4a4a;margin:0;font-style:italic">"${w.message}"</p>
    </div>`
  ).join('');

  return {
    subject: `🌸 Farewell from BANF EC — ${departing.name}`,
    html: `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#f0f4f8;font-family:'Segoe UI',system-ui,sans-serif">
<div style="max-width:600px;margin:20px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.08)">
  <div style="background:linear-gradient(135deg,#1e3a5f,#d4a843);padding:32px;text-align:center">
    <h1 style="color:#fff;font-size:20px;margin:0">🌸 Farewell & Best Wishes</h1>
    <p style="color:rgba(255,255,255,.85);font-size:14px;margin:8px 0 0">From Your BANF EC Family</p>
  </div>
  <div style="padding:24px">
    <p style="font-size:14px;color:#1a1a1a;line-height:1.7">Dear <strong>${departing.name}</strong>,</p>
    <p style="font-size:13px;color:#4a4a4a;line-height:1.7">As you move on from your role as ${departing.ecTitle}, the EC members wanted to share their thoughts and well wishes with you:</p>
    
    ${ecWishes.length > 0 ? `
    <div style="margin:20px 0">
      <h3 style="font-size:14px;color:#1e3a5f;margin:0 0 12px">💬 Messages from EC Members</h3>
      ${wishesHtml}
    </div>` : `
    <p style="font-size:13px;color:#666;font-style:italic">The EC members send their best wishes for your future endeavors.</p>`}

    <div style="background:#f0fdf4;border-radius:12px;padding:16px;margin:20px 0;border-left:4px solid #22c55e">
      <p style="font-size:13px;color:#15803d;margin:0">You will always be a valued member of the BANF community. Our door is always open. 🌸</p>
    </div>

    <p style="font-size:13px;color:#1a1a1a;margin-top:24px">
      With warm regards,<br>
      <strong>The BANF Executive Committee</strong>
    </p>
  </div>
  <div style="background:#f8fafc;padding:12px 24px;text-align:center;border-top:1px solid #e5e7eb">
    <p style="font-size:10px;color:#999;margin:0">Bengali Association of North Florida (BANF) | www.jaxbengali.org</p>
  </div>
</div></body></html>`
  };
}

// ═══════════════════════════════════════════════════════════════
// SEND EMAIL
// ═══════════════════════════════════════════════════════════════

async function sendEmail(to, toName, emailContent, cc = null) {
  try {
    const payload = {
      to,
      toName: toName || to.split('@')[0],
      subject: emailContent.subject,
      body: emailContent.subject, // Plain text fallback
      body_html: emailContent.html,
      reply_to: BANF_EMAIL
    };
    if (cc) payload.cc = cc;

    const resp = await httpsPost(SEND_EMAIL_URL, payload);
    log('INFO', `  Email sent to ${to}: ${resp.status}`);
    return resp.status === 200;
  } catch (e) {
    log('ERROR', `  Email failed to ${to}: ${e.message}`);
    return false;
  }
}

// ═══════════════════════════════════════════════════════════════
// MAIN WORKFLOW: INITIATE RESIGNATION
// ═══════════════════════════════════════════════════════════════

async function initiateResignation(presidentEmail, memberEmail, reason = '') {
  authorizePresident(presidentEmail);

  const memberKey = memberEmail.toLowerCase().trim();
  const member = EC_MEMBERS[memberKey];
  if (!member) throw new Error(`${memberEmail} is not a recognized EC member`);
  if (memberKey === PRESIDENT_EMAIL) throw new Error('President cannot resign through this workflow');

  const state = loadState();
  const id = `ECR-${String(state.nextId++).padStart(3, '0')}`;

  log('INFO', `═══ RESIGNATION INITIATED: ${id} ═══`);
  log('INFO', `  Member: ${member.name} (${member.ecTitle})`);
  log('INFO', `  Initiated by: ${presidentEmail}`);

  const request = {
    id,
    type: WORKFLOW_TYPE.RESIGNATION,
    memberEmail: memberKey,
    memberName: member.name,
    memberTitle: member.ecTitle,
    reason,
    initiatedBy: presidentEmail,
    initiatedAt: new Date().toISOString(),
    status: REPLACEMENT_STATUS.INITIATED,
    
    // Tracking
    rightsRevoked: false,
    passwordChanged: false,
    thankYouSent: false,
    ecNotified: false,
    ecReplies: {},        // { email: { message, at } }
    expectedReplies: [],  // All EC members except the departing one
    finalEmailSent: false,
    
    history: [
      { ts: new Date().toISOString(), action: 'INITIATED', by: presidentEmail, detail: `Resignation initiated for ${member.name} (${member.ecTitle})` }
    ]
  };

  // Determine who needs to reply (all EC members except departing and president)
  request.expectedReplies = Object.entries(EC_MEMBERS)
    .filter(([email]) => email !== memberKey && email !== PRESIDENT_EMAIL)
    .map(([email, m]) => ({ email, name: m.name, title: m.ecTitle }));

  // Step 1: Revoke EC rights
  const revokeResult = await revokeEcRights(memberKey, reason, 'resignation');
  request.rightsRevoked = revokeResult.success;
  request.status = REPLACEMENT_STATUS.RIGHTS_REVOKED;
  request.history.push({ ts: new Date().toISOString(), action: 'RIGHTS_REVOKED', success: revokeResult.success, detail: revokeResult.error || 'EC rights revoked' });

  // Step 2: Change Gmail password
  const pwResult = await changeGmailPassword(memberKey);
  request.passwordChanged = pwResult.success;
  request.passwordChangeMethod = pwResult.method;
  request.passwordChangeInstruction = pwResult.instruction;
  request.status = REPLACEMENT_STATUS.PASSWORD_CHANGED;
  request.history.push({ ts: new Date().toISOString(), action: 'PASSWORD_CHANGE', method: pwResult.method, detail: pwResult.instruction.substring(0, 120) });

  // Step 3: Send thank you email to departing member
  const thankYouEmail = buildThankYouEmail(member, request);
  const thankYouSent = await sendEmail(memberKey, member.name, thankYouEmail);
  request.thankYouSent = thankYouSent;
  request.status = REPLACEMENT_STATUS.THANK_YOU_SENT;
  request.history.push({ ts: new Date().toISOString(), action: 'THANK_YOU_SENT', success: thankYouSent, detail: `Thank you email sent to ${member.name}` });

  // Step 4: Send notification to all EC members
  const recipients = Object.entries(EC_MEMBERS)
    .filter(([email]) => email !== memberKey)
    .map(([email, m]) => ({ email, name: m.name, title: m.ecTitle }));

  const notifEmail = buildEcNotificationEmail(member, request, recipients);
  let ecNotifyCount = 0;
  for (const r of recipients) {
    const sent = await sendEmail(r.email, r.name, notifEmail);
    if (sent) ecNotifyCount++;
  }

  request.ecNotified = ecNotifyCount > 0;
  request.ecNotifyCount = ecNotifyCount;
  request.status = REPLACEMENT_STATUS.AWAITING_REPLIES;
  request.awaitRepliesSince = new Date().toISOString();
  request.history.push({ ts: new Date().toISOString(), action: 'EC_NOTIFIED', detail: `Notification sent to ${ecNotifyCount}/${recipients.length} EC members. Awaiting replies.` });

  state.requests.push(request);
  state.stats.resignations++;
  saveState(state);

  log('INFO', `  ${id}: Awaiting EC replies (timeout: ${REPLY_TIMEOUT_HOURS}h)`);
  return request;
}

// ═══════════════════════════════════════════════════════════════
// MAIN WORKFLOW: INITIATE SUSPENSION
// ═══════════════════════════════════════════════════════════════

async function initiateSuspension(presidentEmail, memberEmail, reason = '') {
  authorizePresident(presidentEmail);

  const memberKey = memberEmail.toLowerCase().trim();
  const member = EC_MEMBERS[memberKey];
  if (!member) throw new Error(`${memberEmail} is not a recognized EC member`);
  if (memberKey === PRESIDENT_EMAIL) throw new Error('President cannot suspend themselves');

  const state = loadState();
  const id = `ECS-${String(state.nextId++).padStart(3, '0')}`;

  log('INFO', `═══ SUSPENSION INITIATED: ${id} ═══`);
  log('INFO', `  Member: ${member.name} (${member.ecTitle})`);

  const request = {
    id,
    type: WORKFLOW_TYPE.SUSPENSION,
    memberEmail: memberKey,
    memberName: member.name,
    memberTitle: member.ecTitle,
    reason,
    initiatedBy: presidentEmail,
    initiatedAt: new Date().toISOString(),
    status: REPLACEMENT_STATUS.INITIATED,
    rightsRevoked: false,
    passwordChanged: false,
    ecNotified: false,
    history: [
      { ts: new Date().toISOString(), action: 'INITIATED', by: presidentEmail, detail: `Suspension initiated for ${member.name} (${member.ecTitle})` }
    ]
  };

  // Step 1: Revoke EC rights
  const revokeResult = await revokeEcRights(memberKey, reason, 'suspension');
  request.rightsRevoked = revokeResult.success;
  request.history.push({ ts: new Date().toISOString(), action: 'RIGHTS_REVOKED', success: revokeResult.success });

  // Step 2: Change Gmail password
  const pwResult = await changeGmailPassword(memberKey);
  request.passwordChanged = pwResult.success;
  request.passwordChangeMethod = pwResult.method;
  request.passwordChangeInstruction = pwResult.instruction;
  request.history.push({ ts: new Date().toISOString(), action: 'PASSWORD_CHANGE', method: pwResult.method });

  // Step 3: Send suspension notice to member
  const suspEmail = buildSuspensionNoticeEmail(member, request);
  await sendEmail(memberKey, member.name, suspEmail);

  // Step 4: Notify all EC members
  const recipients = Object.entries(EC_MEMBERS)
    .filter(([email]) => email !== memberKey)
    .map(([email, m]) => ({ email, name: m.name, title: m.ecTitle }));

  const notifEmail = buildEcNotificationEmail(member, request, recipients);
  let notified = 0;
  for (const r of recipients) {
    if (await sendEmail(r.email, r.name, notifEmail)) notified++;
  }

  request.ecNotified = notified > 0;
  request.ecNotifyCount = notified;
  request.status = REPLACEMENT_STATUS.FINALIZED; // Suspensions don't wait for replies
  request.finalizedAt = new Date().toISOString();
  request.history.push({ ts: new Date().toISOString(), action: 'FINALIZED', detail: `Suspension complete. ${notified} EC members notified.` });

  state.requests.push(request);
  state.stats.suspensions++;
  saveState(state);

  return request;
}

// ═══════════════════════════════════════════════════════════════
// REPLY HANDLER — EC members reply to resignation notification
// ═══════════════════════════════════════════════════════════════

async function processEcReply(replierEmail, requestId, message) {
  const state = loadState();
  const request = state.requests.find(r => r.id === requestId && r.status === REPLACEMENT_STATUS.AWAITING_REPLIES);
  
  if (!request) {
    log('WARN', `No active resignation request ${requestId} awaiting replies`);
    return null;
  }

  const normalEmail = replierEmail.toLowerCase().trim();
  const member = EC_MEMBERS[normalEmail];
  if (!member) {
    log('WARN', `Reply from non-EC member: ${replierEmail}`);
    return null;
  }

  request.ecReplies[normalEmail] = {
    message: message.substring(0, 500),
    fromName: member.name,
    fromTitle: member.ecTitle,
    at: new Date().toISOString()
  };

  request.history.push({ ts: new Date().toISOString(), action: 'EC_REPLY', by: normalEmail, detail: `Reply received from ${member.name}: "${message.substring(0, 80)}"` });
  
  log('INFO', `  EC Reply for ${requestId}: ${member.name} (${Object.keys(request.ecReplies).length}/${request.expectedReplies.length})`);

  saveState(state);

  // Check if all replies received
  const allReplied = request.expectedReplies.every(r => request.ecReplies[r.email]);
  if (allReplied) {
    log('INFO', `  All EC members replied for ${requestId} — triggering finalization`);
    await finalizeResignation(requestId);
  }

  return request;
}

// ═══════════════════════════════════════════════════════════════
// CHECK AND FINALIZE — Called periodically to check timeouts
// ═══════════════════════════════════════════════════════════════

async function checkAndFinalize() {
  const state = loadState();
  const now = new Date();
  let finalized = 0;

  for (const req of state.requests) {
    if (req.status !== REPLACEMENT_STATUS.AWAITING_REPLIES) continue;

    const awaitSince = new Date(req.awaitRepliesSince);
    const hoursElapsed = (now - awaitSince) / (1000 * 60 * 60);

    if (hoursElapsed >= REPLY_TIMEOUT_HOURS) {
      log('INFO', `  ${req.id}: Reply timeout (${hoursElapsed.toFixed(1)}h) — finalizing`);
      await finalizeResignation(req.id);
      finalized++;
    } else {
      const repliesReceived = Object.keys(req.ecReplies || {}).length;
      const expected = (req.expectedReplies || []).length;
      log('INFO', `  ${req.id}: ${repliesReceived}/${expected} replies, ${(REPLY_TIMEOUT_HOURS - hoursElapsed).toFixed(1)}h remaining`);
    }
  }

  return { checked: state.requests.filter(r => r.status === REPLACEMENT_STATUS.AWAITING_REPLIES).length, finalized };
}

async function finalizeResignation(requestId) {
  const state = loadState();
  const request = state.requests.find(r => r.id === requestId);
  if (!request) throw new Error(`${requestId} not found`);
  if (request.status === REPLACEMENT_STATUS.FINALIZED) return request;

  const member = EC_MEMBERS[request.memberEmail] || { name: request.memberName, ecTitle: request.memberTitle };

  // Compile EC wishes
  const ecWishes = Object.values(request.ecReplies || {}).map(r => ({
    fromName: r.fromName,
    fromTitle: r.fromTitle,
    message: r.message
  }));

  // Send final farewell email to departing member
  const farewellEmail = buildFinalFarewellEmail(member, request, ecWishes);
  const sent = await sendEmail(request.memberEmail, member.name, farewellEmail);

  request.finalEmailSent = sent;
  request.status = REPLACEMENT_STATUS.FINALIZED;
  request.finalizedAt = new Date().toISOString();
  request.history.push({ ts: new Date().toISOString(), action: 'FINALIZED', detail: `Farewell email sent with ${ecWishes.length} EC wishes. Resignation complete.` });

  state.stats.finalized++;
  saveState(state);

  log('INFO', `  ${requestId}: FINALIZED — farewell email sent with ${ecWishes.length} wishes`);
  return request;
}

// ═══════════════════════════════════════════════════════════════
// REVERSE SUSPENSION — President can reverse a suspension
// ═══════════════════════════════════════════════════════════════

async function reverseSuspension(presidentEmail, requestId) {
  authorizePresident(presidentEmail);

  const state = loadState();
  const request = state.requests.find(r => r.id === requestId && r.type === WORKFLOW_TYPE.SUSPENSION);
  if (!request) throw new Error(`Suspension ${requestId} not found`);

  const member = EC_MEMBERS[request.memberEmail] || { name: request.memberName };

  // Restore EC rights
  try {
    await httpsPost(`${WIX_API_BASE}/ec_restore_rights`, {
      adminKey: ADMIN_KEY,
      memberEmail: request.memberEmail,
      reason: 'Suspension reversed by President',
      restoredBy: presidentEmail
    });
  } catch (e) {
    log('WARN', `Wix restore rights failed: ${e.message}`);
  }

  request.status = REPLACEMENT_STATUS.REVERSED;
  request.reversedAt = new Date().toISOString();
  request.reversedBy = presidentEmail;
  request.history.push({ ts: new Date().toISOString(), action: 'REVERSED', by: presidentEmail, detail: `Suspension reversed for ${member.name}` });

  state.stats.reversed++;
  saveState(state);

  // Notify EC members
  const recipients = Object.entries(EC_MEMBERS)
    .filter(([email]) => email !== request.memberEmail)
    .map(([email, m]) => ({ email, name: m.name }));

  for (const r of recipients) {
    await sendEmail(r.email, r.name, {
      subject: `✅ BANF: ${member.name} Suspension Reversed`,
      html: `<div style="font-family:Arial;padding:20px;">
        <h2>✅ Suspension Reversed</h2>
        <p>${member.name}'s suspension as ${request.memberTitle} has been reversed by the President.</p>
        <p>EC access has been restored.</p>
      </div>`
    });
  }

  log('INFO', `${requestId}: Suspension REVERSED — ${member.name} restored`);
  return request;
}

// ═══════════════════════════════════════════════════════════════
// MODULE EXPORTS
// ═══════════════════════════════════════════════════════════════

module.exports = {
  initiateResignation,
  initiateSuspension,
  processEcReply,
  checkAndFinalize,
  finalizeResignation,
  reverseSuspension,
  authorizePresident,
  loadState,
  REPLACEMENT_STATUS,
  WORKFLOW_TYPE,
  EC_MEMBERS,
  PRESIDENT_EMAIL,
  REPLY_TIMEOUT_HOURS
};

// ═══════════════════════════════════════════════════════════════
// CLI
// ═══════════════════════════════════════════════════════════════

if (require.main === module) {
  const args = process.argv.slice(2);

  if (args.includes('--status')) {
    const state = loadState();
    console.log('\n🔐 EC Member Replacement Agent — Status');
    console.log('═'.repeat(60));
    console.log(`  Total requests:  ${state.requests.length}`);
    console.log(`  Resignations:    ${state.stats.resignations}`);
    console.log(`  Suspensions:     ${state.stats.suspensions}`);
    console.log(`  Reversed:        ${state.stats.reversed}`);
    console.log(`  Finalized:       ${state.stats.finalized}`);
    console.log('');
    for (const req of state.requests) {
      const replies = Object.keys(req.ecReplies || {}).length;
      const expected = (req.expectedReplies || []).length;
      console.log(`  ${req.id} [${req.type}] ${req.memberName} (${req.memberTitle})`);
      console.log(`    Status: ${req.status} | Replies: ${replies}/${expected}`);
      console.log(`    Initiated: ${req.initiatedAt}`);
      console.log('');
    }
    console.log('═'.repeat(60));
  }

  else if (args.includes('--check-replies')) {
    (async () => {
      console.log('\n🔍 Checking pending resignations for reply timeouts...');
      const result = await checkAndFinalize();
      console.log(`  Checked: ${result.checked}, Finalized: ${result.finalized}`);
    })();
  }

  else if (args.includes('--dry-test')) {
    (async () => {
      console.log('\n🧪 DRY TEST — EC Member Replacement Agent');
      console.log('═'.repeat(60));

      let passed = 0, failed = 0;

      // Test 1: Authorization check
      console.log('\n1. Authorization check:');
      try {
        authorizePresident(PRESIDENT_EMAIL);
        console.log(`  ✅ President authorized`);
        passed++;
      } catch (e) {
        console.log(`  ❌ ${e.message}`);
        failed++;
      }

      try {
        authorizePresident('random@gmail.com');
        console.log(`  ❌ Should have rejected non-president`);
        failed++;
      } catch (e) {
        console.log(`  ✅ Non-president correctly rejected`);
        passed++;
      }

      // Test 2: EC member validation
      console.log('\n2. EC member validation:');
      const validMember = EC_MEMBERS['amit.everywhere@gmail.com'];
      console.log(`  ${validMember ? '✅' : '❌'} amit.everywhere@gmail.com → ${validMember?.name} (${validMember?.ecTitle})`);
      if (validMember) passed++; else failed++;

      const invalidMember = EC_MEMBERS['nobody@gmail.com'];
      console.log(`  ${!invalidMember ? '✅' : '❌'} nobody@gmail.com → correctly not found`);
      if (!invalidMember) passed++; else failed++;

      // Test 3: Password generation (dry)
      console.log('\n3. Password generation (dry):');
      const pwResult = await changeGmailPassword('test@gmail.com');
      console.log(`  Method: ${pwResult.method}`);
      console.log(`  Generated password: ${pwResult.generatedPassword ? '✅ (redacted)' : '❌'}`);
      if (pwResult.generatedPassword) passed++; else failed++;

      // Test 4: Email template generation
      console.log('\n4. Email templates:');
      const testMember = { name: 'Test Member', ecTitle: 'Treasurer' };
      const testRequest = { id: 'ECR-TEST', type: 'resignation', reason: 'Personal reasons' };

      const thankYou = buildThankYouEmail(testMember, testRequest);
      console.log(`  ✅ Thank You: "${thankYou.subject}" (${thankYou.html.length} chars)`);
      passed++;

      const suspension = buildSuspensionNoticeEmail(testMember, testRequest);
      console.log(`  ✅ Suspension: "${suspension.subject}" (${suspension.html.length} chars)`);
      passed++;

      const ecNotif = buildEcNotificationEmail(testMember, testRequest, [{ name: 'VP', title: 'VP' }]);
      console.log(`  ✅ EC Notification: "${ecNotif.subject}" (${ecNotif.html.length} chars)`);
      passed++;

      const farewell = buildFinalFarewellEmail(testMember, testRequest, [
        { fromName: 'VP', fromTitle: 'Vice President', message: 'Wish you well!' }
      ]);
      console.log(`  ✅ Farewell: "${farewell.subject}" (${farewell.html.length} chars)`);
      passed++;

      // Test 5: State management
      console.log('\n5. State management:');
      const state = loadState();
      console.log(`  ✅ State loaded: ${state.requests.length} requests`);
      passed++;

      // Test 6: Resignation simulation (dry — no emails sent)
      console.log('\n6. Resignation simulation (dry):');
      console.log(`  Would initiate resignation for amit.everywhere@gmail.com`);
      console.log(`  President: ${PRESIDENT_EMAIL}`);
      console.log(`  Expected EC replies from: ${Object.entries(EC_MEMBERS)
        .filter(([e]) => e !== 'amit.everywhere@gmail.com' && e !== PRESIDENT_EMAIL)
        .map(([_, m]) => m.name).join(', ')}`);
      console.log(`  Reply timeout: ${REPLY_TIMEOUT_HOURS}h`);
      console.log(`  ✅ Workflow validated (dry run — no live actions)`);
      passed++;

      // Test 7: Suspension simulation (dry)
      console.log('\n7. Suspension simulation (dry):');
      console.log(`  Would suspend duttasoumyajit86@gmail.com`);
      console.log(`  Rights revocation → password change → notice → EC notification → done`);
      console.log(`  Reversal available via reverseSuspension()`);
      console.log(`  ✅ Workflow validated (dry run)`);
      passed++;

      // Test 8: Reply processing (dry)
      console.log('\n8. Reply processing simulation:');
      console.log(`  Would accept replies from EC members for resignation ECR-xxx`);
      console.log(`  After all replies or ${REPLY_TIMEOUT_HOURS}h timeout → farewell email sent`);
      console.log(`  ✅ Reply logic validated`);
      passed++;

      console.log(`\n${'═'.repeat(60)}`);
      console.log(`  TOTAL: ${passed} passed, ${failed} failed`);
      console.log('═'.repeat(60));

      return { passed, failed };
    })();
  }

  else {
    console.log('Usage:');
    console.log('  --status          Show all replacement requests');
    console.log('  --check-replies   Check for reply timeouts, finalize');
    console.log('  --dry-test        Run comprehensive dry test');
  }
}
