#!/usr/bin/env node
/**
 * Send membership payment acknowledgment email to Chirajyoti Deb
 * Payment: $330 via Zelle on 03/16/2026
 * Membership: M2 Premium Early Bird - Couple (FY 2026-27)
 * Confirmation: BACb1iov0i4r
 */

const https = require('https');
const fs = require('fs');
const secrets = JSON.parse(fs.readFileSync('.banf-secrets.json', 'utf8'));

const CLIENT_ID = secrets.CLIENT_ID;
const CLIENT_SECRET = secrets.CLIENT_SECRET;
const REFRESH_TOKEN = secrets.REFRESH_TOKEN;
const FROM_EMAIL = 'banfjax@gmail.com';

function httpsReq(url, opts = {}) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const o = {
      hostname: u.hostname, port: 443,
      path: u.pathname + u.search,
      method: opts.method || 'GET',
      headers: opts.headers || {},
      timeout: 30000
    };
    const req = https.request(o, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => { try { resolve(JSON.parse(d)); } catch { resolve(d); } });
    });
    req.on('error', reject);
    if (opts.body) req.write(opts.body);
    req.end();
  });
}

async function getToken() {
  const body = `grant_type=refresh_token&refresh_token=${encodeURIComponent(REFRESH_TOKEN)}&client_id=${encodeURIComponent(CLIENT_ID)}&client_secret=${encodeURIComponent(CLIENT_SECRET)}`;
  const r = await httpsReq('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Content-Length': Buffer.byteLength(body) },
    body
  });
  if (r.access_token) return r.access_token;
  throw new Error('Auth failed: ' + (r.error_description || r.error));
}

async function sendEmail(token, to, subject, htmlBody) {
  const boundary = 'boundary_banf_' + Date.now();
  const raw = [
    `From: BANF Jacksonville <${FROM_EMAIL}>`,
    `To: ${to}`,
    `Subject: ${subject}`,
    'MIME-Version: 1.0',
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    '',
    `--${boundary}`,
    'Content-Type: text/plain; charset=UTF-8',
    '',
    // Plain text fallback
    'Dear Chirajyoti,',
    '',
    'Thank you for your BANF membership payment of $330.00 via Zelle on March 16, 2026.',
    '',
    'PAYMENT DETAILS:',
    '- Amount: $330.00',
    '- Method: Zelle',
    '- Date: March 16, 2026',
    '- Confirmation: BACb1iov0i4r',
    '',
    'MEMBERSHIP DETAILS:',
    '- Category: M2 Premium Early Bird (Couple)',
    '- Fiscal Year: 2026-27',
    '- Members: Chirajyoti Deb & Aparajita Deb',
    '- Address: Sanford, FL 32771',
    '- Events Included: All 17 events',
    '',
    'Please verify your personal details for our records at:',
    'https://www.jaxbengali.org/member-portal.html',
    '',
    'Warm regards,',
    'BANF Jacksonville',
    'banfjax@gmail.com | jaxbengali.org',
    '',
    `--${boundary}`,
    'Content-Type: text/html; charset=UTF-8',
    '',
    htmlBody,
    '',
    `--${boundary}--`
  ].join('\r\n');

  const encoded = Buffer.from(raw).toString('base64')
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

  const url = 'https://gmail.googleapis.com/gmail/v1/users/me/messages/send';
  const jsonBody = JSON.stringify({ raw: encoded });
  const r = await httpsReq(url, {
    method: 'POST',
    headers: {
      Authorization: 'Bearer ' + token,
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(jsonBody)
    },
    body: jsonBody
  });

  return r;
}

// Build the HTML email -- pure ASCII, no emoji Unicode, no junk chars
function buildHtml() {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,Helvetica,sans-serif">
<div style="max-width:600px;margin:32px auto;background:#ffffff;border-radius:10px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.1)">

  <!-- Header -->
  <div style="background:linear-gradient(135deg,#b91c1c,#7f1d1d);padding:28px 32px">
    <h1 style="color:#ffffff;margin:0;font-size:22px;font-weight:700">Bengali Association of NE Florida</h1>
    <p style="color:rgba(255,255,255,0.75);margin:4px 0 0;font-size:13px">jaxbengali.org | banfjax@gmail.com</p>
  </div>

  <div style="padding:28px 32px">

    <!-- Acknowledgment -->
    <h2 style="color:#1e293b;font-size:18px;margin:0 0 16px">Payment Received - Thank You!</h2>
    <p style="color:#334155;font-size:14px;line-height:1.6;margin:0 0 16px">
      Dear Chirajyoti,
    </p>
    <p style="color:#334155;font-size:14px;line-height:1.6;margin:0 0 16px">
      We are pleased to confirm that we have received your Zelle payment. Thank you for being a valued member of BANF! Your membership for FY 2026-27 is now active.
    </p>

    <!-- Payment Details -->
    <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:16px 20px;margin:0 0 20px">
      <h3 style="color:#166534;font-size:14px;margin:0 0 12px;text-transform:uppercase;letter-spacing:0.5px">Payment Details</h3>
      <table style="width:100%;border-collapse:collapse;font-size:14px">
        <tr><td style="padding:4px 0;color:#64748b;width:140px">Amount</td><td style="padding:4px 0;color:#166534;font-weight:700">$330.00</td></tr>
        <tr><td style="padding:4px 0;color:#64748b">Payment Method</td><td style="padding:4px 0;color:#334155">Zelle</td></tr>
        <tr><td style="padding:4px 0;color:#64748b">Payment Date</td><td style="padding:4px 0;color:#334155">March 16, 2026</td></tr>
        <tr><td style="padding:4px 0;color:#64748b">Confirmation</td><td style="padding:4px 0;color:#334155;font-family:monospace">BACb1iov0i4r</td></tr>
        <tr><td style="padding:4px 0;color:#64748b">Payer Name</td><td style="padding:4px 0;color:#334155">Chirajyoti Deb</td></tr>
      </table>
    </div>

    <!-- Membership Info -->
    <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:16px 20px;margin:0 0 20px">
      <h3 style="color:#1e40af;font-size:14px;margin:0 0 12px;text-transform:uppercase;letter-spacing:0.5px">Membership Information</h3>
      <table style="width:100%;border-collapse:collapse;font-size:14px">
        <tr><td style="padding:4px 0;color:#64748b;width:140px">Category</td><td style="padding:4px 0;color:#1e40af;font-weight:700">M2 Premium Early Bird</td></tr>
        <tr><td style="padding:4px 0;color:#64748b">Household Tier</td><td style="padding:4px 0;color:#334155">Couple</td></tr>
        <tr><td style="padding:4px 0;color:#64748b">Fiscal Year</td><td style="padding:4px 0;color:#334155">2026-27</td></tr>
        <tr><td style="padding:4px 0;color:#64748b">Members</td><td style="padding:4px 0;color:#334155">Chirajyoti Deb &amp; Aparajita Deb</td></tr>
        <tr><td style="padding:4px 0;color:#64748b">Location</td><td style="padding:4px 0;color:#334155">Sanford, FL 32771</td></tr>
        <tr><td style="padding:4px 0;color:#64748b">Events Included</td><td style="padding:4px 0;color:#334155">All 17 events (full access)</td></tr>
        <tr><td style="padding:4px 0;color:#64748b">Value Multiplier</td><td style="padding:4px 0;color:#334155">2.64x (Best Value)</td></tr>
      </table>
    </div>

    <!-- What's Included -->
    <div style="background:#fefce8;border:1px solid #fef08a;border-radius:8px;padding:16px 20px;margin:0 0 20px">
      <h3 style="color:#854d0e;font-size:14px;margin:0 0 10px;text-transform:uppercase;letter-spacing:0.5px">Your M2 Premium Early Bird Benefits</h3>
      <ul style="color:#334155;font-size:13px;line-height:1.8;margin:0;padding-left:20px">
        <li>All 17 events fully included (cultural, religious, social, educational)</li>
        <li>Priority seating at all programs</li>
        <li>Early Bird savings: $35 saved vs. standard M2 Premium</li>
        <li>Full couple access for both members</li>
        <li>Digital magazine and newsletter</li>
        <li>Member directory and voting rights</li>
      </ul>
    </div>

    <!-- CRM Verification Link -->
    <div style="background:#faf5ff;border:1px solid #e9d5ff;border-radius:8px;padding:16px 20px;margin:0 0 20px">
      <h3 style="color:#7e22ce;font-size:14px;margin:0 0 10px;text-transform:uppercase;letter-spacing:0.5px">Verify Your Personal Details</h3>
      <p style="color:#334155;font-size:13px;line-height:1.6;margin:0 0 12px">
        To ensure our records are accurate, please take a moment to verify and update your personal details (name, email, phone, address) in the BANF Member Portal:
      </p>
      <div style="text-align:center;margin:8px 0">
        <a href="https://www.jaxbengali.org/member-portal.html" style="display:inline-block;background:linear-gradient(135deg,#7c3aed,#6d28d9);color:#ffffff;text-decoration:none;padding:12px 28px;border-radius:6px;font-size:14px;font-weight:700">Open Member Portal</a>
      </div>
      <p style="color:#64748b;font-size:12px;text-align:center;margin:8px 0 0">
        If you are unable to access the portal, you may reply to this email with your updated details.
      </p>
    </div>

    <!-- Closing -->
    <p style="color:#334155;font-size:14px;line-height:1.6;margin:0 0 8px">
      We look forward to seeing you at our upcoming events! The next event is <strong>Noboborsho (Bengali New Year)</strong> on <strong>April 14, 2026</strong>.
    </p>
    <p style="color:#334155;font-size:14px;line-height:1.6;margin:16px 0 0">
      Warm regards,<br>
      <strong>BANF Executive Committee (2026-28)</strong>
    </p>

  </div>

  <!-- Footer -->
  <div style="background:#f8fafc;padding:16px 32px;border-top:1px solid #e2e8f0">
    <p style="color:#94a3b8;font-size:11px;margin:0;line-height:1.5">
      Bengali Association of NE Florida (BANF) | 501(c)(3) Non-Profit<br>
      Jacksonville, FL | <a href="https://www.jaxbengali.org" style="color:#64748b">jaxbengali.org</a> | banfjax@gmail.com<br>
      Receipt Reference: MEM-2026-CDEB-0316
    </p>
  </div>

</div>
</body>
</html>`;
}

(async () => {
  console.log('='.repeat(60));
  console.log('  BANF Payment Acknowledgment Email');
  console.log('='.repeat(60));

  const to = 'drchiradeb@gmail.com';
  const subject = 'BANF Membership Payment Received - $330.00 (M2 Premium Early Bird Couple, FY 2026-27)';

  console.log('\n  To:', to);
  console.log('  Subject:', subject);

  console.log('\n[1] Authenticating...');
  const token = await getToken();
  console.log('  Token acquired');

  console.log('\n[2] Sending email...');
  const html = buildHtml();
  const result = await sendEmail(token, to, subject, html);

  if (result.id) {
    console.log('  SENT! Message ID:', result.id);
    console.log('  Thread ID:', result.threadId);
  } else {
    console.log('  FAILED:', JSON.stringify(result));
  }

  console.log('\n' + '='.repeat(60));
  console.log('  Done');
  console.log('='.repeat(60));
})().catch(e => {
  console.error('FATAL:', e.message);
});
