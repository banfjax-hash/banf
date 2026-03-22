#!/usr/bin/env node
/**
 * Send membership payment acknowledgment email to Santanu Bhattacharya
 * Payment: $340.00 - EB Family for FY 2026-27
 * Rule: Any payment after Feb 2026 = FY 2026-27 (EC Term: Feb 2026 - Mid Feb 2027)
 * Household: Santanu & Sanchari Bhattacharya
 * CRM: tosantanu@gmail.com | RFAM-088 | MBR-MLX38YHN-IYN7
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
    'Dear Santanu Da,',
    '',
    'Thank you for your BANF membership payment of $340.00 for FY 2026-27.',
    '',
    'PAYMENT DETAILS:',
    '- Amount: $340.00',
    '- Category: EB - Family (Early Bird Family)',
    '- Fiscal Year: 2026-27 (Feb 2026 - Mid Feb 2027)',
    '- Ref: Santanu Da / Sanchari Di (per membership records)',
    '',
    'MEMBERSHIP DETAILS:',
    '- Category: EB - Family',
    '- Fiscal Year: 2026-27',
    '- Members: Santanu Bhattacharya & Sanchari Bhattacharyya',
    '- Location: Jacksonville, FL',
    '- Events: All 17 events (full access)',
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
      Dear Santanu Da,
    </p>
    <p style="color:#334155;font-size:14px;line-height:1.6;margin:0 0 16px">
      We are pleased to confirm that we have received your BANF membership payment. Thank you and Sanchari Di for being valued members of our community! Your Early Bird Family membership for FY 2026-27 is now confirmed.
    </p>

    <!-- Payment Details -->
    <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:16px 20px;margin:0 0 20px">
      <h3 style="color:#166534;font-size:14px;margin:0 0 12px;text-transform:uppercase;letter-spacing:0.5px">Payment Details</h3>
      <table style="width:100%;border-collapse:collapse;font-size:14px">
        <tr><td style="padding:4px 0;color:#64748b;width:140px">Amount</td><td style="padding:4px 0;color:#166534;font-weight:700">$340.00</td></tr>
        <tr><td style="padding:4px 0;color:#64748b">Payment Category</td><td style="padding:4px 0;color:#334155">EB - Family (Early Bird Family)</td></tr>
        <tr><td style="padding:4px 0;color:#64748b">Fiscal Year</td><td style="padding:4px 0;color:#334155">2026-27 (Feb 2026 - Mid Feb 2027)</td></tr>
        <tr><td style="padding:4px 0;color:#64748b">Ref Name</td><td style="padding:4px 0;color:#334155">Santanu Da / Sanchari Di</td></tr>
        <tr><td style="padding:4px 0;color:#64748b">Receipt Ref</td><td style="padding:4px 0;color:#334155;font-family:monospace">MEM-2627-SBHATT-EBFAM</td></tr>
      </table>
    </div>

    <!-- Membership Info -->
    <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:16px 20px;margin:0 0 20px">
      <h3 style="color:#1e40af;font-size:14px;margin:0 0 12px;text-transform:uppercase;letter-spacing:0.5px">Membership Information</h3>
      <table style="width:100%;border-collapse:collapse;font-size:14px">
        <tr><td style="padding:4px 0;color:#64748b;width:140px">Category</td><td style="padding:4px 0;color:#1e40af;font-weight:700">EB - Family (Early Bird)</td></tr>
        <tr><td style="padding:4px 0;color:#64748b">Tier Code</td><td style="padding:4px 0;color:#334155">EB-Family</td></tr>
        <tr><td style="padding:4px 0;color:#64748b">Household Tier</td><td style="padding:4px 0;color:#334155">Family</td></tr>
        <tr><td style="padding:4px 0;color:#64748b">Fiscal Year</td><td style="padding:4px 0;color:#334155">2026-27 (Feb 2026 - Mid Feb 2027)</td></tr>
        <tr><td style="padding:4px 0;color:#64748b">Primary Members</td><td style="padding:4px 0;color:#334155">Santanu Bhattacharya &amp; Sanchari Bhattacharyya</td></tr>
        <tr><td style="padding:4px 0;color:#64748b">Location</td><td style="padding:4px 0;color:#334155">Jacksonville, FL</td></tr>
        <tr><td style="padding:4px 0;color:#64748b">Events Included</td><td style="padding:4px 0;color:#334155">All BANF events (full access)</td></tr>
        <tr><td style="padding:4px 0;color:#64748b">CRM Member ID</td><td style="padding:4px 0;color:#334155;font-family:monospace">MBR-MLX38YHN-IYN7</td></tr>
        <tr><td style="padding:4px 0;color:#64748b">Member Since</td><td style="padding:4px 0;color:#334155">2022 (4th consecutive year)</td></tr>
        <tr><td style="padding:4px 0;color:#64748b">Early Bird Deadline</td><td style="padding:4px 0;color:#334155">May 31, 2026</td></tr>
      </table>
    </div>

    <!-- What's Included -->
    <div style="background:#fefce8;border:1px solid #fef08a;border-radius:8px;padding:16px 20px;margin:0 0 20px">
      <h3 style="color:#854d0e;font-size:14px;margin:0 0 10px;text-transform:uppercase;letter-spacing:0.5px">Your Early Bird Family Membership Benefits</h3>
      <ul style="color:#334155;font-size:13px;line-height:1.8;margin:0;padding-left:20px">
        <li>Full family access to all BANF events (cultural, religious, social, educational)</li>
        <li>Early Bird rate applied - thank you for your early support!</li>
        <li>Priority seating at all major programs</li>
        <li>Full family access for all household members</li>
        <li>BANF digital magazine (Jagriti) and community newsletter</li>
        <li>Member directory listing, voting rights at GBM</li>
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
      We look forward to seeing you and the family at our upcoming events! The next event is <strong>Noboborsho (Bengali New Year)</strong> on <strong>April 14, 2026</strong>.
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
      Receipt Reference: MEM-2627-SBHATT-EBFAM | Member Portal: jaxbengali.org/member-portal.html
    </p>
  </div>

</div>
</body>
</html>`;
}

(async () => {
  console.log('='.repeat(60));
  console.log('  BANF Payment Acknowledgment Email - Santanu Bhattacharya');
  console.log('='.repeat(60));

  const to = 'tosantanu@gmail.com';
  const cc = 'tosanchari@gmail.com';
  const subject = 'BANF Membership Payment Received - $340.00 (EB Family, FY 2026-27)';

  console.log('\n  To:', to);
  console.log('  CC:', cc);
  console.log('  Subject:', subject);
  console.log('\n  Payment:  $340.00 | EB - Family | FY 2026-27');
  console.log('  Household: Santanu & Sanchari Bhattacharya');
  console.log('  CRM ID:    MBR-MLX38YHN-IYN7 | RFAM-088');

  console.log('\n[1] Authenticating with Gmail...');
  const token = await getToken();
  console.log('  Token acquired');

  console.log('\n[2] Sending acknowledgment email...');
  const html = buildHtml();
  const result = await sendEmail(token, to, subject, html);

  if (result.id) {
    console.log('  SENT! Message ID:', result.id);
    console.log('  Thread ID:', result.threadId);

    // Log the ack to a JSON record for tracking
    const logEntry = {
      timestamp: new Date().toISOString(),
      email: to,
      name: 'Santanu Bhattacharya',
      household: 'Santanu & Sanchari Bhattacharya',
      amount: 340,
      category: 'EB - Family',
      year: '2026-27',
      memberId: 'MBR-MLX38YHN-IYN7',
      familyId: 'RFAM-088',
      messageId: result.id,
      status: 'sent'
    };
    const logFile = 'banf-payment-ack-santanu-log.json';
    require('fs').writeFileSync(logFile, JSON.stringify(logEntry, null, 2));
    console.log('\n  Logged to:', logFile);
  } else {
    console.log('  FAILED:', JSON.stringify(result, null, 2));
  }

  console.log('\n' + '='.repeat(60));
  console.log('  Done');
  console.log('='.repeat(60));
})().catch(e => {
  console.error('FATAL:', e.message);
  process.exit(1);
});
