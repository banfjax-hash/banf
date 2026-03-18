#!/usr/bin/env node
/**
 * Send SJCSD Facility Use Request (notarized, filled) to Mrs. Ottosen
 * Attached: SJCSD_Facility-Use-Request_FILLED.zip
 */

const https = require('https');
const fs = require('fs');
const path = require('path');
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

async function sendEmailWithAttachment(token, to, subject, htmlBody, plainText, attachPath, attachFilename) {
  const boundary = 'boundary_banf_' + Date.now();
  const fileData = fs.readFileSync(attachPath);
  const fileBase64 = fileData.toString('base64');

  const raw = [
    `From: BANF Jacksonville <${FROM_EMAIL}>`,
    `To: ${to}`,
    `Subject: ${subject}`,
    'MIME-Version: 1.0',
    `Content-Type: multipart/mixed; boundary="${boundary}"`,
    '',
    `--${boundary}`,
    'Content-Type: multipart/alternative; boundary="alt_boundary"',
    '',
    '--alt_boundary',
    'Content-Type: text/plain; charset=UTF-8',
    '',
    plainText,
    '',
    '--alt_boundary',
    'Content-Type: text/html; charset=UTF-8',
    '',
    htmlBody,
    '',
    '--alt_boundary--',
    '',
    `--${boundary}`,
    `Content-Type: application/zip; name="${attachFilename}"`,
    'Content-Transfer-Encoding: base64',
    `Content-Disposition: attachment; filename="${attachFilename}"`,
    '',
    ...fileBase64.match(/.{1,76}/g),
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

const plainText = `Dear Mrs. Ottosen,

Good morning. I hope this email finds you well.

Please find attached the completed SJCSD Facility Use Request form for our upcoming community event at Mill Creek Academy on April 25, 2026. The document has been notarized and can be accessed in the attached zip file.

Please let us know if any additional information or documentation is needed to finalize the booking.

Thank you for your time and assistance.

Warm regards,
BANF Executive Committee
Bengali Association of North Florida
banfjax@gmail.com | jaxbengali.org`;

const htmlBody = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,Helvetica,sans-serif">
<div style="max-width:600px;margin:32px auto;background:#ffffff;border-radius:10px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.1)">

  <div style="background:linear-gradient(135deg,#b91c1c,#7f1d1d);padding:28px 32px">
    <h1 style="color:#ffffff;margin:0;font-size:22px;font-weight:700">Bengali Association of NE Florida</h1>
    <p style="color:rgba(255,255,255,0.75);margin:4px 0 0;font-size:13px">jaxbengali.org | banfjax@gmail.com</p>
  </div>

  <div style="padding:28px 32px">

    <p style="color:#334155;font-size:14px;line-height:1.6;margin:0 0 16px">
      Dear Mrs. Ottosen,
    </p>
    <p style="color:#334155;font-size:14px;line-height:1.6;margin:0 0 16px">
      Good morning. I hope this email finds you well.
    </p>
    <p style="color:#334155;font-size:14px;line-height:1.6;margin:0 0 16px">
      Please find attached the completed <strong>SJCSD Facility Use Request</strong> form for our upcoming community event at Mill Creek Academy on <strong>April 25, 2026</strong>. The document has been notarized and can be accessed in the attached zip file.
    </p>
    <p style="color:#334155;font-size:14px;line-height:1.6;margin:0 0 16px">
      Please let us know if any additional information or documentation is needed to finalize the booking.
    </p>
    <p style="color:#334155;font-size:14px;line-height:1.6;margin:0 0 8px">
      Thank you for your time and assistance.
    </p>
    <p style="color:#334155;font-size:14px;line-height:1.6;margin:16px 0 0">
      Warm regards,<br>
      <strong>BANF Executive Committee</strong><br>
      Bengali Association of North Florida
    </p>

  </div>

  <div style="background:#f8fafc;padding:16px 32px;border-top:1px solid #e2e8f0">
    <p style="color:#94a3b8;font-size:11px;margin:0;line-height:1.5">
      Bengali Association of NE Florida (BANF) | 501(c)(3) Non-Profit<br>
      Jacksonville, FL | <a href="https://www.jaxbengali.org" style="color:#64748b">jaxbengali.org</a> | banfjax@gmail.com
    </p>
  </div>

</div>
</body>
</html>`;

(async () => {
  console.log('='.repeat(60));
  console.log('  Send SJCSD Facility Use Request to Mrs. Ottosen');
  console.log('='.repeat(60));

  const to = 'Jacqueline.Ottosen@stjohns.k12.fl.us';
  const subject = 'SJCSD Facility Use Request - Notarized (Mill Creek Academy, April 25, 2026)';
  const attachPath = path.join(__dirname, 'SJCSD_Facility-Use-Request_FILLED.zip');
  const attachFilename = 'SJCSD_Facility-Use-Request_FILLED.zip';

  console.log('\n  To:', to);
  console.log('  Subject:', subject);
  console.log('  Attachment:', attachFilename, '(' + (fs.statSync(attachPath).size / 1024).toFixed(1) + ' KB)');

  console.log('\n[1] Authenticating...');
  const token = await getToken();
  console.log('  Token acquired');

  console.log('\n[2] Sending email with attachment...');
  const result = await sendEmailWithAttachment(token, to, subject, htmlBody, plainText, attachPath, attachFilename);

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
