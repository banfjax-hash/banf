#!/usr/bin/env node
/**
 * Send notarized SJCSD Facility Use Request PDFs to Mrs. Ottosen (v3 - fixed MIME)
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
      timeout: 60000
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

function buildMimeMessage(to, cc, subject, plainText, htmlBody, attachments) {
  const mixedBoundary = 'mixed_' + Date.now() + '_banf';
  const altBoundary = 'alt_' + Date.now() + '_banf';

  const lines = [];

  // Headers
  lines.push(`From: BANF Jacksonville <${FROM_EMAIL}>`);
  lines.push(`To: ${to}`);
  if (cc) lines.push(`Cc: ${cc}`);
  lines.push(`Subject: ${subject}`);
  lines.push('MIME-Version: 1.0');
  lines.push(`Content-Type: multipart/mixed; boundary="${mixedBoundary}"`);
  lines.push('');

  // Part 1: The message body (multipart/alternative for plain+html)
  lines.push(`--${mixedBoundary}`);
  lines.push(`Content-Type: multipart/alternative; boundary="${altBoundary}"`);
  lines.push('');

  // Plain text version
  lines.push(`--${altBoundary}`);
  lines.push('Content-Type: text/plain; charset="UTF-8"');
  lines.push('Content-Transfer-Encoding: 7bit');
  lines.push('');
  lines.push(plainText);
  lines.push('');

  // HTML version
  lines.push(`--${altBoundary}`);
  lines.push('Content-Type: text/html; charset="UTF-8"');
  lines.push('Content-Transfer-Encoding: 7bit');
  lines.push('');
  lines.push(htmlBody);
  lines.push('');

  // Close alternative
  lines.push(`--${altBoundary}--`);

  // Attachments
  for (const att of attachments) {
    const fileData = fs.readFileSync(att.path);
    const fileBase64 = fileData.toString('base64');
    lines.push('');
    lines.push(`--${mixedBoundary}`);
    lines.push(`Content-Type: application/pdf; name="${att.filename}"`);
    lines.push('Content-Transfer-Encoding: base64');
    lines.push(`Content-Disposition: attachment; filename="${att.filename}"`);
    lines.push('');
    // Split base64 into 76-char lines
    for (let i = 0; i < fileBase64.length; i += 76) {
      lines.push(fileBase64.substring(i, i + 76));
    }
  }

  // Close mixed
  lines.push('');
  lines.push(`--${mixedBoundary}--`);

  return lines.join('\r\n');
}

const plainText = `Dear Mrs. Ottosen,

Good afternoon. I hope this email finds you well.

I am resending this email as the previous one with a zip attachment may not have been delivered due to your email system's security policy. This time I have attached the PDF files directly.

Please find attached the completed SJCSD Facility Use Request form along with the Proof Verification Instructions for our upcoming community event at Mill Creek Academy. The documents have been notarized and are attached as individual PDF files for your convenience.

I apologize that I was unable to visit the school today as planned - a last-minute meeting came up. I will coordinate a visit at the earliest opportunity.

Additionally, I have two requests:

1. Fee Confirmation: Could you please confirm the facility use fees for our event so that we can include the venue cost details in the event invitations (evites) being sent to all our members?

2. Next Steps: Please let us know if there is anything further that needs to be done from our end to finalize the booking confirmation for April 25, 2026.

Thank you for your time and assistance. We truly appreciate Mill Creek Academy's support for our community event.

Warm regards,
Dr. Ranadhir Ghosh
President, Bengali Association of North Florida (BANF)
Phone: (904) 402-3967
banfjax@gmail.com | jaxbengali.org

--- Previous Email Chain ---

[March 12, 2026 - Mrs. Ottosen to BANF]
I will not be on campus tomorrow - but I will return on Tuesday if you would like to stop by then.

Jacque Ottosen, Vice Principal/LEA
Mill Creek Academy

[March 12, 2026 - BANF to Mrs. Ottosen]
Can we visit tomorrow afternoon pls?

[March 12, 2026 - Mrs. Ottosen to BANF]
Good afternoon, We have availability in our cafeteria for this date. I attached the forms with the information we need prior to placing your event on our calendar.

[March 12, 2026 - Dr. Goodwin to BANF]
Good Morning: Mrs. Ottosen, copied on this email, handles our facilities requests. She will be able to let you know about availability and cost.

Ken Goodwin, Ed.D., Principal, Mill Creek Academy

[March 11, 2026 - BANF to Dr. Goodwin]
Dear Dr. Ken Goodwin,
I am writing with a quick correction to the venue inquiry email we sent earlier today regarding our Noboborsho (Bengali New Year) celebration.

Corrected Details:
- Event: Saturday, April 25, 2026 - 9:00 AM to 5:00 PM
- Setup/Decoration: Friday, April 24, 2026 - evening (if possible)

Thanks and Regards,
Dr. Ranadhir Ghosh
President, BANF`;

const htmlBody = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,Helvetica,sans-serif">
<div style="max-width:640px;margin:32px auto;background:#ffffff;border-radius:10px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.1)">

  <div style="background:linear-gradient(135deg,#b91c1c,#7f1d1d);padding:28px 32px">
    <h1 style="color:#ffffff;margin:0;font-size:22px;font-weight:700">Bengali Association of NE Florida</h1>
    <p style="color:rgba(255,255,255,0.75);margin:4px 0 0;font-size:13px">jaxbengali.org | banfjax@gmail.com</p>
  </div>

  <div style="padding:28px 32px">

    <p style="color:#334155;font-size:14px;line-height:1.7;margin:0 0 16px">Dear Mrs. Ottosen,</p>

    <p style="color:#334155;font-size:14px;line-height:1.7;margin:0 0 16px">Good afternoon. I hope this email finds you well.</p>

    <p style="color:#334155;font-size:14px;line-height:1.7;margin:0 0 16px">I am resending this email as the previous one with a zip attachment may not have been delivered due to your email system's security policy. This time I have attached the PDF files directly.</p>

    <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:16px 20px;margin:0 0 20px">
      <h3 style="color:#166534;font-size:14px;margin:0 0 8px">Notarized Documents Attached</h3>
      <p style="color:#334155;font-size:13px;line-height:1.6;margin:0 0 8px">Please find attached the completed <strong>SJCSD Facility Use Request</strong> form along with the <strong>Proof Verification Instructions</strong> for our upcoming community event at Mill Creek Academy. The documents have been notarized and are attached as individual PDF files.</p>
      <ul style="color:#334155;font-size:13px;line-height:1.8;margin:0;padding-left:20px">
        <li>SJCSD_Facility-Use-Request_FILLED.pdf</li>
        <li>Proof_Verification_Instructions.pdf</li>
      </ul>
    </div>

    <p style="color:#334155;font-size:14px;line-height:1.7;margin:0 0 16px">I apologize that I was unable to visit the school today as planned &mdash; a last-minute meeting came up. I will coordinate a visit at the earliest opportunity.</p>

    <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:16px 20px;margin:0 0 20px">
      <h3 style="color:#1e40af;font-size:14px;margin:0 0 10px">Follow-up Requests</h3>
      <table style="width:100%;border-collapse:collapse;font-size:13px">
        <tr>
          <td style="padding:8px 12px;vertical-align:top;color:#1e40af;font-weight:700;width:24px">1.</td>
          <td style="padding:8px 0;color:#334155;line-height:1.6"><strong>Fee Confirmation:</strong> Could you please confirm the facility use fees for our event? We would like to include the venue cost details in the event invitations being sent to all our members.</td>
        </tr>
        <tr>
          <td style="padding:8px 12px;vertical-align:top;color:#1e40af;font-weight:700">2.</td>
          <td style="padding:8px 0;color:#334155;line-height:1.6"><strong>Next Steps:</strong> Please let us know if there is anything further that needs to be done from our end to finalize the booking confirmation for <strong>April 25, 2026</strong>.</td>
        </tr>
      </table>
    </div>

    <p style="color:#334155;font-size:14px;line-height:1.7;margin:0 0 16px">Thank you for your time and assistance. We truly appreciate Mill Creek Academy's support for our community event.</p>

    <p style="color:#334155;font-size:14px;line-height:1.7;margin:16px 0 0">
      Warm regards,<br>
      <strong>Dr. Ranadhir Ghosh</strong><br>
      President, Bengali Association of North Florida (BANF)<br>
      Phone: (904) 402-3967<br>
      banfjax@gmail.com | <a href="https://www.jaxbengali.org" style="color:#2563eb">jaxbengali.org</a>
    </p>

    <div style="margin-top:28px;border-top:2px solid #e2e8f0;padding-top:20px">
      <h3 style="color:#64748b;font-size:13px;text-transform:uppercase;letter-spacing:0.5px;margin:0 0 16px">Previous Email Chain</h3>

      <div style="background:#f8fafc;border-left:3px solid #94a3b8;padding:12px 16px;margin:0 0 12px;border-radius:0 6px 6px 0">
        <p style="color:#64748b;font-size:11px;margin:0 0 4px"><strong>From:</strong> Jacqueline Ottosen | <strong>Date:</strong> March 12, 2026, 6:30 PM ET</p>
        <p style="color:#334155;font-size:13px;line-height:1.5;margin:4px 0 0">I will not be on campus tomorrow &mdash; but I will return on Tuesday if you would like to stop by then.</p>
        <p style="color:#64748b;font-size:12px;margin:4px 0 0;font-style:italic">Jacque Ottosen, Vice Principal/LEA, Mill Creek Academy</p>
      </div>

      <div style="background:#f8fafc;border-left:3px solid #3b82f6;padding:12px 16px;margin:0 0 12px;border-radius:0 6px 6px 0">
        <p style="color:#64748b;font-size:11px;margin:0 0 4px"><strong>From:</strong> BANF Jacksonville | <strong>Date:</strong> March 12, 2026, 6:15 PM ET</p>
        <p style="color:#334155;font-size:13px;line-height:1.5;margin:4px 0 0">Can we visit tomorrow afternoon pls?</p>
      </div>

      <div style="background:#f8fafc;border-left:3px solid #94a3b8;padding:12px 16px;margin:0 0 12px;border-radius:0 6px 6px 0">
        <p style="color:#64748b;font-size:11px;margin:0 0 4px"><strong>From:</strong> Jacqueline Ottosen | <strong>Date:</strong> March 12, 2026, 6:00 PM ET</p>
        <p style="color:#334155;font-size:13px;line-height:1.5;margin:4px 0 0">Good afternoon, We have availability in our cafeteria for this date. I attached the forms with the information we need prior to placing your event on our calendar.</p>
        <p style="color:#64748b;font-size:12px;margin:4px 0 0;font-style:italic">Jacque Ottosen, Vice Principal/LEA, Mill Creek Academy</p>
      </div>

      <div style="background:#f8fafc;border-left:3px solid #94a3b8;padding:12px 16px;margin:0 0 12px;border-radius:0 6px 6px 0">
        <p style="color:#64748b;font-size:11px;margin:0 0 4px"><strong>From:</strong> Dr. Kenneth Goodwin | <strong>Date:</strong> March 12, 2026, 7:11 AM ET</p>
        <p style="color:#334155;font-size:13px;line-height:1.5;margin:4px 0 0">Good Morning: Mrs. Ottosen, copied on this email, handles our facilities requests. She will be able to let you know about availability and cost.</p>
        <p style="color:#64748b;font-size:12px;margin:4px 0 0;font-style:italic">Ken Goodwin, Ed.D., Principal, Mill Creek Academy</p>
      </div>

      <div style="background:#f8fafc;border-left:3px solid #3b82f6;padding:12px 16px;margin:0 0 12px;border-radius:0 6px 6px 0">
        <p style="color:#64748b;font-size:11px;margin:0 0 4px"><strong>From:</strong> BANF Jacksonville | <strong>Date:</strong> March 11, 2026, 6:17 PM ET</p>
        <p style="color:#334155;font-size:13px;line-height:1.5;margin:4px 0 0">
          Dear Dr. Ken Goodwin,<br><br>
          I am writing with a quick correction to the venue inquiry email regarding our Noboborsho (Bengali New Year) celebration.<br><br>
          <strong>Corrected Details:</strong><br>
          - Event: Saturday, April 25, 2026 &mdash; 9:00 AM to 5:00 PM<br>
          - Setup/Decoration: Friday, April 24, 2026 &mdash; evening (if possible)
        </p>
        <p style="color:#64748b;font-size:12px;margin:4px 0 0;font-style:italic">Dr. Ranadhir Ghosh, President, BANF | (904) 402-3967</p>
      </div>
    </div>

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
  console.log('='.repeat(65));
  console.log('  Send Facility Request PDFs to Mrs. Ottosen (v3 - fixed MIME)');
  console.log('='.repeat(65));

  const to = 'Jacqueline.Ottosen@stjohns.k12.fl.us';
  const cc = 'ranadhir.ghosh@gmail.com';
  const subject = 'Re: Inquiry - Community Event Venue Rental at Mill Creek Academy (April 25, 2026) - Notarized Documents';

  const attachDir = path.join(__dirname, 'SJCSD_Facility-Use-Request_FILLED');
  const attachments = [
    { path: path.join(attachDir, 'SJCSD_Facility-Use-Request_FILLED.pdf'), filename: 'SJCSD_Facility-Use-Request_FILLED.pdf' },
    { path: path.join(attachDir, 'Proof Verification Instructions.pdf'), filename: 'Proof_Verification_Instructions.pdf' },
  ];

  console.log('\n  To:', to);
  console.log('  Cc:', cc);
  console.log('  Subject:', subject);
  attachments.forEach(a => {
    const size = (fs.statSync(a.path).size / 1024).toFixed(1);
    console.log('  Attachment:', a.filename, `(${size} KB)`);
  });

  // Build proper MIME
  const raw = buildMimeMessage(to, cc, subject, plainText, htmlBody, attachments);

  // Verify structure
  const hasMixedBoundary = raw.includes('Content-Type: multipart/mixed');
  const hasAltBoundary = raw.includes('Content-Type: multipart/alternative');
  const hasPlain = raw.includes('Content-Type: text/plain');
  const hasHtml = raw.includes('Content-Type: text/html');
  console.log('\n  MIME check: mixed=' + hasMixedBoundary + ' alt=' + hasAltBoundary + ' plain=' + hasPlain + ' html=' + hasHtml);

  console.log('\n[1] Authenticating...');
  const body = `grant_type=refresh_token&refresh_token=${encodeURIComponent(REFRESH_TOKEN)}&client_id=${encodeURIComponent(CLIENT_ID)}&client_secret=${encodeURIComponent(CLIENT_SECRET)}`;
  const r = await httpsReq('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Content-Length': Buffer.byteLength(body) },
    body
  });
  const token = r.access_token;
  if (!token) throw new Error('Auth failed');
  console.log('  Token acquired');

  console.log('\n[2] Sending email...');
  const encoded = Buffer.from(raw).toString('base64')
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

  const url = 'https://gmail.googleapis.com/gmail/v1/users/me/messages/send';
  const jsonBody = JSON.stringify({ raw: encoded });
  const result = await httpsReq(url, {
    method: 'POST',
    headers: {
      Authorization: 'Bearer ' + token,
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(jsonBody)
    },
    body: jsonBody
  });

  if (result.id) {
    console.log('  SENT! Message ID:', result.id);
    console.log('  Thread ID:', result.threadId);
  } else {
    console.log('  FAILED:', JSON.stringify(result).substring(0, 500));
  }

  console.log('\n' + '='.repeat(65));
  console.log('  Done');
  console.log('='.repeat(65));
})().catch(e => {
  console.error('FATAL:', e.message);
});
