#!/usr/bin/env node
/**
 * EC Onboarding Invitation — Send to Amit Chandak (corrected email)
 * Sends the EC Admin portal signup invitation to amit.everywhere@gmail.com
 * 
 * Usage: node ec-send-amit-chandak.js
 */

const https = require('https');
const compliance = require('./communication-compliance.js');

// Gmail OAuth2 credentials
const GOOGLE_REFRESH_TOKEN = require('./banf-gmail-config').REFRESH_TOKEN;
const GOOGLE_CLIENT_ID = '1020178199135-3usrl611ara38i7rhu2ub6sn6g1150ml.apps.googleusercontent.com';
const GOOGLE_CLIENT_SECRET = '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';
const FROM_EMAIL = 'banfjax@gmail.com';

const AMIT = {
  email: 'amit.everywhere@gmail.com',
  name: 'Amit Chandak',
  position: 'Treasurer'
};

const ONBOARD_URL = 'https://banfjax-hash.github.io/banf/ec-admin-login.html';
const PORTAL_URL = 'https://banfjax-hash.github.io/banf/admin-portal.html';

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
  const result = compliance.buildCompliantMessage({
    to,
    toName: compliance.sanitizeName(toName),
    from: FROM_EMAIL,
    fromName: 'BANF Admin',
    subject,
    htmlBody,
    agent: 'ec_onboard_invite_agent',
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

function buildOnboardingInviteEmail() {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background: linear-gradient(135deg, #1a1a2e, #16213e); padding: 25px; border-radius: 12px 12px 0 0; text-align: center;">
        <h1 style="color: #e0e0e0; margin: 0; font-size: 24px;">🏛️ BANF EC Admin Portal</h1>
        <p style="color: rgba(255,255,255,0.8); margin: 8px 0 0 0; font-size: 14px;">Executive Committee Onboarding — FY2026-28</p>
    </div>
    
    <div style="background: #fff; padding: 30px; border: 1px solid #ddd; border-top: none;">
        <p style="font-size: 17px;">Dear <strong>${AMIT.name}</strong>,</p>
        
        <p>You are invited to join the <strong>BANF EC Admin Portal</strong> as <strong>${AMIT.position}</strong> for the FY2026-28 term.</p>
        
        <div style="background: #e8f5e9; border-left: 5px solid #4caf50; padding: 15px; margin: 20px 0; border-radius: 4px;">
            <strong style="color: #2e7d32;">✅ Your Account Details</strong>
            <p style="margin: 8px 0 0 0;">
                <strong>Email:</strong> ${AMIT.email}<br>
                <strong>Role:</strong> ${AMIT.position} (EC Admin)<br>
                <strong>Password:</strong> banf-ec-2026<br>
                <strong>Term:</strong> FY2026-28
            </p>
        </div>
        
        <p>As Treasurer, you will have access to:</p>
        <ul style="background: #f8f9fa; padding: 20px 20px 20px 40px; border-radius: 8px; margin: 15px 0;">
            <li style="margin-bottom: 10px;">💰 <strong>Financial Dashboard</strong> — Budget, payments, reconciliation</li>
            <li style="margin-bottom: 10px;">👥 <strong>Member CRM</strong> — Membership dues, payment tracking</li>
            <li style="margin-bottom: 10px;">📊 <strong>EC Admin Portal</strong> — Audit drives, procurement, reports</li>
            <li style="margin-bottom: 10px;">📋 <strong>Stakeholder Requirements</strong> — Budget planning, vendor management</li>
            <li>🔐 <strong>RBAC-Protected Portal</strong> — Role-based access control</li>
        </ul>
        
        <div style="text-align: center; margin: 30px 0;">
            <a href="${ONBOARD_URL}?email=${encodeURIComponent(AMIT.email)}" style="display: inline-block; background: linear-gradient(135deg, #4caf50, #2e7d32); color: #fff; padding: 16px 40px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 18px; box-shadow: 0 4px 15px rgba(46,125,50,0.3);">Sign In to EC Portal →</a>
        </div>
        
        <div style="text-align: center; margin: 15px 0;">
            <a href="${PORTAL_URL}" style="display: inline-block; background: #fff; color: #1a1a2e; border: 2px solid #1a1a2e; padding: 10px 24px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px;">📊 View Admin Portal</a>
        </div>
        
        <div style="background: #f0f4ff; border: 1px solid #c5cae9; padding: 15px; margin: 20px 0; border-radius: 8px;">
            <strong>🔑 Quick Start:</strong>
            <ol style="margin: 8px 0 0 0; padding-left: 20px;">
                <li>Click the green button above</li>
                <li>Enter your email: <code>${AMIT.email}</code></li>
                <li>Password: <code>banf-ec-2026</code></li>
                <li>You'll be redirected to the EC Admin Portal</li>
            </ol>
        </div>
        
        <p style="margin-top: 20px; color: #666; font-size: 14px;">
            This is a <strong>corrected invitation</strong> sent to your updated email address.
            Your previous invitation was sent to an incorrect email. Please use this new link.
        </p>
        
        <p style="margin-top: 25px;">If you have any questions, please contact me at <a href="mailto:ranadhir.ghosh@gmail.com">ranadhir.ghosh@gmail.com</a>.</p>
        
        <p style="margin-top: 25px;">Best regards,<br><strong>Dr. Ranadhir Ghosh</strong><br>President, BANF<br><em>On behalf of the BANF Executive Committee</em></p>
    </div>
    
    <div style="background: #1a1a2e; color: #999; padding: 15px; text-align: center; font-size: 12px; border-radius: 0 0 12px 12px;">
        Bengali Association of North Florida | <a href="https://www.jaxbengali.org" style="color: #7c8aff;">www.jaxbengali.org</a>
    </div>
</body>
</html>`;
}

async function main() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  📧 EC ONBOARDING INVITATION — AMIT CHANDAK (CORRECTED EMAIL)');
  console.log('  📅 Date: ' + new Date().toLocaleString());
  console.log('  📬 To: ' + AMIT.email);
  console.log('  🏛️ Role: ' + AMIT.position);
  console.log('═══════════════════════════════════════════════════════════════\n');

  const accessToken = await getAccessToken();

  const subject = '🏛️ BANF EC Admin Portal — Treasurer Onboarding Invitation';
  const html = buildOnboardingInviteEmail();

  console.log(`[SEND] Sending EC onboarding invitation to ${AMIT.name} <${AMIT.email}>...`);

  try {
    const res = await sendGmail(accessToken, AMIT.email, AMIT.name, subject, html);

    if (res.status >= 200 && res.status < 300) {
      console.log(`\n  ✅ EMAIL SENT SUCCESSFULLY`);
      console.log(`  📧 To: ${AMIT.name} <${AMIT.email}>`);
      console.log(`  🆔 Message ID: ${res.data.id || 'unknown'}`);
      console.log(`  📋 Subject: ${subject}`);
      console.log(`  🕐 Timestamp: ${new Date().toISOString()}`);
    } else {
      console.log(`\n  ❌ FAILED TO SEND`);
      console.log(`  Status: ${res.status}`);
      console.log(`  Error: ${JSON.stringify(res.data)}`);
    }
  } catch (err) {
    console.log(`\n  ❌ ERROR: ${err.message}`);
  }

  console.log('\n═══════════════════════════════════════════════════════════════');
}

main().catch(err => {
  console.error('[FATAL]', err);
  process.exit(1);
});
