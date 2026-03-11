#!/usr/bin/env node
/**
 * EC Onboarding Reminder — Send urgent reminders to pending EC members
 * Usage: node ec-reminder-send.js [--force] [--dry-run]
 *
 * v2.0 — Reads from ec-onboard-status.json (shared state), adds:
 *   • Workflow-complete gate (refuses to send if all onboarded)
 *   • 7-day email cooldown guard (per-recipient, file-based)
 *   • --force flag to override cooldown
 *   • --dry-run flag for safe preview
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

// Communication Compliance — header encoding, content validation, audit
const compliance = require('./communication-compliance.js');

// Gmail OAuth2 credentials (same as bosonto scripts)
const GOOGLE_REFRESH_TOKEN = require('./banf-gmail-config').REFRESH_TOKEN;
const GOOGLE_CLIENT_ID = '1020178199135-3usrl611ara38i7rhu2ub6sn6g1150ml.apps.googleusercontent.com';
const GOOGLE_CLIENT_SECRET = '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';
const FROM_EMAIL = 'banfjax@gmail.com';

// ═══════════════════════════════════════════════════════════════════
//  SHARED STATUS FILE — single source of truth
//  Reads ec-onboard-status.json shared across ALL reminder scripts.
//  Falls back to hardcoded roster ONLY if file is missing.
// ═══════════════════════════════════════════════════════════════════
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
  } catch (e) {
    console.warn('[STATUS] ⚠️ Failed to save ec-onboard-status.json:', e.message);
  }
}

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

const _statusData = loadEcStatus();

// ── EC ROSTER — read from shared status or fallback ──
const ALL_EC_MEMBERS = _statusData ? _statusData.members.map(m => ({
  email: m.email,
  name: m.name,
  position: m.title,
  signedUp: m.signedUp
})) : [
  // FALLBACK — only used if ec-onboard-status.json is missing
  { email: 'ranadhir.ghosh@gmail.com',        name: 'Dr. Ranadhir Ghosh',  position: 'President',          signedUp: true  },
  { email: 'mukhopadhyay.partha@gmail.com',    name: 'Partha Mukhopadhyay', position: 'Vice President',     signedUp: true  },
  { email: 'amit.everywhere@gmail.com',        name: 'Amit Chandak',        position: 'Treasurer',          signedUp: false },
  { email: 'rajanya.ghosh@gmail.com',          name: 'Rajanya Ghosh',       position: 'General Secretary',  signedUp: true  },
  { email: 'moumita.mukherje@gmail.com',       name: 'Dr. Moumita Ghosh',   position: 'Cultural Secretary', signedUp: false },
  { email: 'duttasoumyajit86@gmail.com',       name: 'Soumyajit Dutta',     position: 'Food Coordinator',   signedUp: false },
  { email: 'sumo475@gmail.com',                name: 'Dr. Sumanta Ghosh',   position: 'Event Coordinator',  signedUp: false },
  { email: 'rwitichoudhury@gmail.com',         name: 'Rwiti Chowdhury',     position: 'Puja Coordinator',   signedUp: false },
];

// Filter: only send to members who have NOT signed up
const PENDING_EC_MEMBERS = ALL_EC_MEMBERS.filter(m => !m.signedUp);

const ONBOARD_URL = 'https://banfjax-hash.github.io/banf1/admin-onboard.html';
const JOURNEY_URL = 'https://banfjax-hash.github.io/banf1/stakeholder-requirements-journey.html';

// ─────────────────────────────────────────
// GMAIL API HELPERS
// ─────────────────────────────────────────

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
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, data });
        }
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
  // Compliance validation + RFC 2047 header encoding
  const result = compliance.buildCompliantMessage({
    to,
    toName: compliance.sanitizeName(toName),
    from: FROM_EMAIL,
    fromName: 'BANF Admin',
    subject,
    htmlBody,
    agent: 'ec_reminder_agent',
    requireGreeting: false,
    requireSignoff: false,
  });
  
  if (result.blocked) {
    console.log(`[COMPLIANCE] Email blocked: ${result.reason}`);
    return { status: 429, data: { error: result.reason } };
  }
  
  if (result.compliance.warnings.length > 0) {
    console.log(`[COMPLIANCE] Score: ${result.compliance.score}/100 (${result.compliance.level})`);
  }
  
  const res = await httpsRequest('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ raw: result.raw })
  });
  
  return res;
}

// ─────────────────────────────────────────
// EMAIL TEMPLATE
// ─────────────────────────────────────────

function buildReminderEmail(member) {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background: linear-gradient(135deg, #8B0000, #DC143C); padding: 25px; border-radius: 12px 12px 0 0;">
        <h1 style="color: #fff; margin: 0; font-size: 26px;">🚨 URGENT: EC Onboarding Required</h1>
        <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0 0; font-size: 14px;">Bengali Association of North Florida — FY2026-27</p>
    </div>
    
    <div style="background: #fff; padding: 30px; border: 1px solid #ddd; border-top: none;">
        <p style="font-size: 17px;">Dear <strong>${member.name}</strong>,</p>
        
        <div style="background: #fff3cd; border-left: 5px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 4px;">
            <strong style="color: #856404;">⚠️ IMPORTANT NOTICE</strong>
            <p style="margin: 8px 0 0 0; color: #856404;">Your EC onboarding as <strong>${member.position}</strong> is <strong>MANDATORY</strong> and must be completed immediately.</p>
        </div>
        
        <p>As an Executive Committee member, your participation in the onboarding process is <strong>required</strong> before we can:</p>
        
        <ul style="background: #f8f9fa; padding: 20px 20px 20px 40px; border-radius: 8px; margin: 15px 0;">
            <li style="margin-bottom: 10px;">Launch the <strong>FY2026-27 Membership Drive</strong></li>
            <li style="margin-bottom: 10px;">Enable the <strong>Member Portal</strong> for all BANF families</li>
            <li style="margin-bottom: 10px;">Process event registrations including <strong>Bosonto Utsob 2026</strong></li>
            <li>Activate your <strong>EC dashboard access</strong></li>
        </ul>
        
        <div style="background: #f8d7da; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <p style="margin: 0; color: #721c24; font-weight: 600;">
                🔴 The entire membership drive is <strong>BLOCKED</strong> until all EC members complete onboarding.
            </p>
        </div>
        
        <p style="font-size: 16px; font-weight: 600; margin-top: 25px;">Please complete your onboarding <u>as soon as possible</u> — ideally today.</p>
        
        <div style="text-align: center; margin: 30px 0;">
            <a href="${ONBOARD_URL}?email=${encodeURIComponent(member.email)}" style="display: inline-block; background: linear-gradient(135deg, #8B0000, #DC143C); color: #fff; padding: 16px 40px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 18px; box-shadow: 0 4px 15px rgba(139,0,0,0.3);">Complete Onboarding Now →</a>
        </div>
        
        <div style="text-align: center; margin: 20px 0;">
            <a href="${JOURNEY_URL}" style="display: inline-block; background: #fff; color: #8B0000; border: 2px solid #8B0000; padding: 12px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 15px;">📋 View Requirements Journey</a>
        </div>
        
        <p style="margin-top: 25px; color: #666; font-size: 14px;">
            <strong>What you need to do:</strong><br>
            1. Click the button above to access the onboarding portal<br>
            2. Set up your password (if not already done)<br>
            3. Complete your profile (phone, address, etc.)<br>
            4. Mark your onboarding as complete
        </p>
        
        <p style="margin-top: 25px;">If you face any issues, please contact the President immediately at <a href="mailto:ranadhir.ghosh@gmail.com">ranadhir.ghosh@gmail.com</a>.</p>
        
        <p style="margin-top: 25px;">Thank you for your prompt attention to this matter.</p>
        
        <p style="margin-top: 20px;">Best regards,<br><strong>Dr. Ranadhir Ghosh</strong><br>President, BANF</p>
    </div>
    
    <div style="background: #333; color: #999; padding: 15px; text-align: center; font-size: 12px; border-radius: 0 0 12px 12px;">
        Bengali Association of North Florida | <a href="https://www.jaxbengali.org" style="color: #ccc;">www.jaxbengali.org</a>
    </div>
</body>
</html>`;
}

// ─────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);
  const isForced = args.includes('--force');
  const isDryRun = args.includes('--dry-run');

  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  🚨 EC ONBOARDING — URGENT REMINDER SENDER v2.0 (Dedup Guard)');
  console.log('  📅 Date: ' + new Date().toLocaleDateString());
  console.log('  👥 Pending EC Members: ' + PENDING_EC_MEMBERS.length);
  console.log('  🛡️ Dedup Guard: ' + (_statusData ? 'ACTIVE' : 'FALLBACK'));
  console.log('  🔄 Force Mode: ' + (isForced ? 'YES — cooldown override' : 'NO'));
  console.log('  🧪 Dry Run: ' + (isDryRun ? 'YES — no emails sent' : 'NO'));
  console.log('═══════════════════════════════════════════════════════════════\n');

  // ── WORKFLOW COMPLETE GATE ──
  if (_statusData && _statusData.workflowComplete) {
    console.log('🛑 WORKFLOW COMPLETE — ec-onboard-status.json has workflowComplete=true.');
    console.log('   No reminder emails will be sent. All EC members have completed onboarding.');
    console.log('   To re-open, set workflowComplete=false in ec-onboard-status.json.');
    return;
  }

  if (PENDING_EC_MEMBERS.length === 0) {
    console.log('🎉 All EC members have signed up! No reminders needed.');
    return;
  }
  
  let accessToken = null;
  if (!isDryRun) {
    accessToken = await getAccessToken();
  }
  
  const results = [];
  
  for (const member of PENDING_EC_MEMBERS) {
    console.log(`\n[SEND] ${member.position}: ${member.name} <${member.email}>`);

    // ── COOLDOWN CHECK ──
    if (_statusData && !isForced) {
      const cooldown = checkEmailCooldown(_statusData, member.email);
      if (!cooldown.allowed) {
        console.log(`  🛡️ COOLDOWN: Skipped — last reminder sent ${cooldown.lastSent} (${cooldown.hoursLeft}h remaining)`);
        console.log(`     Use --force to override the 7-day cooldown.`);
        results.push({ email: member.email, success: false, error: 'COOLDOWN_ACTIVE' });
        continue;
      }
    }

    if (isDryRun) {
      console.log(`  [DRY RUN] Would send to ${member.email}`);
      results.push({ email: member.email, success: true, messageId: 'DRY-RUN' });
      continue;
    }
    
    const subject = `🚨 URGENT: Complete Your EC Onboarding — ${member.position}`;
    const html = buildReminderEmail(member);
    
    try {
      const res = await sendGmail(accessToken, member.email, member.name, subject, html);
      
      if (res.status >= 200 && res.status < 300) {
        console.log(`  ✅ Sent successfully (messageId: ${res.data.id || 'unknown'})`);
        results.push({ email: member.email, success: true, messageId: res.data.id });

        // Record in dedup log
        if (_statusData) {
          recordEmailSent(_statusData, member.email);
        }
      } else {
        console.log(`  ❌ Failed: ${JSON.stringify(res.data)}`);
        results.push({ email: member.email, success: false, error: res.data });
      }
    } catch (err) {
      console.log(`  ❌ Error: ${err.message}`);
      results.push({ email: member.email, success: false, error: err.message });
    }
    
    // Small delay between emails
    await new Promise(r => setTimeout(r, 1000));
  }
  
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('  SUMMARY');
  console.log('═══════════════════════════════════════════════════════════════');
  const sent = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  const cooled = results.filter(r => r.error === 'COOLDOWN_ACTIVE').length;
  console.log(`  ✅ Sent: ${sent}`);
  console.log(`  🛡️ Cooldown-skipped: ${cooled}`);
  console.log(`  ❌ Failed: ${failed - cooled}`);
  console.log('═══════════════════════════════════════════════════════════════\n');
  
  results.forEach(r => {
    const icon = r.success ? '✅' : (r.error === 'COOLDOWN_ACTIVE' ? '🛡️' : '❌');
    console.log(`  ${icon} ${r.email}`);
  });
}

// Only run when executed directly (not when required as module)
if (require.main === module) {
  main().catch(err => {
    console.error('[FATAL]', err);
    process.exit(1);
  });
}
