#!/usr/bin/env node
/**
 * BANF Membership Fees CORRECTION Email - to Current EC
 * =======================================================
 * Sends a correction notice highlighting 6 discrepancies between
 * the verified fee report and the live website, and asks EC to
 * confirm which values are correct.
 *
 * Usage:
 *   node _send-fees-correction-emails.js              # DRY RUN
 *   node _send-fees-correction-emails.js --send        # SEND to all EC
 *   node _send-fees-correction-emails.js --test-only   # Test to Ranadhir
 */

const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');

const CONFIG = {
  BANF_EMAIL: 'banfjax@gmail.com',
  BANF_ORG: 'BANF - Bengali Association of North Florida',
  BANF_WEBSITE: 'https://www.jaxbengali.org',
  LANDING_PAGE_URL: 'https://www.jaxbengali.org/_functions/home',
  FEES_REPORT_URL: 'https://banfjax-hash.github.io/banf/membership-fees-verification.html',
  TEST_EMAIL: 'ranadhir.ghosh@gmail.com',
  SEND_DELAY_MS: 2000
};

let GMAIL = { CLIENT_ID: '', CLIENT_SECRET: '', REFRESH_TOKEN: '' };
const secretsPath = path.join(__dirname, '.banf-secrets.json');
try {
  const secrets = JSON.parse(fs.readFileSync(secretsPath, 'utf8'));
  GMAIL.CLIENT_ID = secrets.CLIENT_ID || '';
  GMAIL.CLIENT_SECRET = secrets.CLIENT_SECRET || '';
  GMAIL.REFRESH_TOKEN = secrets.REFRESH_TOKEN || '';
} catch (e) {
  GMAIL.CLIENT_ID = process.env.BANF_GMAIL_CLIENT_ID || '';
  GMAIL.CLIENT_SECRET = process.env.BANF_GMAIL_CLIENT_SECRET || '';
  GMAIL.REFRESH_TOKEN = process.env.BANF_GMAIL_REFRESH_TOKEN || '';
}

// ---- Current EC Members (2026-2028) ----
const EC_MEMBERS = [
  { name: 'Dr. Ranadhir Ghosh', firstName: 'Ranadhir', email: 'ranadhir.ghosh@gmail.com', role: 'President / IT Lead' },
  { name: 'Partha Mukhopadhyay', firstName: 'Partha', email: 'mukhopadhyay.partha@gmail.com', role: 'Vice President' },
  { name: 'Amit Chandak', firstName: 'Amit', email: 'amit.everywhere@gmail.com', role: 'Treasurer' },
  { name: 'Rajanya Ghosh', firstName: 'Rajanya', email: 'rajanya.ghosh@gmail.com', role: 'General Secretary' },
  { name: 'Dr. Moumita Ghosh', firstName: 'Moumita', email: 'moumita.mukherje@gmail.com', role: 'Cultural Secretary' },
  { name: 'Soumyajit Dutta (Banty)', firstName: 'Soumyajit', email: 'duttasoumyajit86@gmail.com', role: 'Food Coordinator' },
  { name: 'Dr. Sumanta Ghosh', firstName: 'Sumanta', email: 'sumo475@gmail.com', role: 'Event Coordinator' },
  { name: 'Rwiti Choudhury', firstName: 'Rwiti', email: 'rwitichoudhury@gmail.com', role: 'Puja Coordinator' }
];

function esc(s) { return (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }

// ---- Email Template ----
function emailFeesCorrection(member) {
  const subject = 'CORRECTION: BANF Membership Fees — 6 Discrepancies Found — Please Verify ASAP';
  const html = `<div style="font-family:'Segoe UI',Arial,Helvetica,sans-serif;max-width:720px;margin:0 auto;background:#ffffff">
  <div style="background:linear-gradient(135deg,#991b1b,#dc2626);color:#ffffff;padding:24px 28px;border-radius:10px 10px 0 0">
    <h2 style="margin:0;font-size:1.25rem;font-weight:700">⚠️ CORRECTION: Membership Fee Discrepancies Found</h2>
    <p style="margin:6px 0 0;opacity:.9;font-size:.88rem">6 values on the website differ from the verified fee report</p>
  </div>

  <div style="padding:24px 28px;border:1px solid #e0e0e0;border-top:none;border-radius:0 0 10px 10px;color:#333333">
    <p style="margin:0 0 14px">Dear <strong>${esc(member.firstName)}</strong>,</p>

    <p>As <strong>${esc(member.role)}</strong> of the current EC, we need your urgent attention.
    We found <strong>6 discrepancies</strong> between the <strong>verified membership fee report</strong>
    (extracted from the official <code>member_fees.png</code>) and what is currently displayed on the
    <strong>live website</strong>.</p>

    <div style="background:#fef2f2;border:2px solid #ef4444;border-radius:10px;padding:16px;margin:18px 0">
      <div style="font-weight:700;color:#dc2626;font-size:.95rem;margin-bottom:8px">⚠️ 6 Discrepancies Found — Please Reply ASAP</div>
      <p style="margin:0;font-size:.88rem;color:#555">The following cells differ between the verified report and the live website.
      Please confirm which values are correct so we can fix the website immediately.</p>
    </div>

    <!-- Discrepancy Table -->
    <div style="margin:20px 0">
      <table style="width:100%;border-collapse:collapse;font-size:.88rem;border:2px solid #dc2626;border-radius:8px;overflow:hidden">
        <thead>
          <tr style="background:#991b1b;color:#fff">
            <th style="padding:10px 12px;text-align:left;font-size:.82rem">#</th>
            <th style="padding:10px 12px;text-align:left;font-size:.82rem">Tier</th>
            <th style="padding:10px 12px;text-align:left;font-size:.82rem">Category</th>
            <th style="padding:10px 12px;text-align:center;font-size:.82rem">Verified Report</th>
            <th style="padding:10px 12px;text-align:center;font-size:.82rem">Live Website</th>
            <th style="padding:10px 12px;text-align:center;font-size:.82rem">Difference</th>
          </tr>
        </thead>
        <tbody>
          <tr style="background:#fef2f2;border-bottom:1px solid #fecaca">
            <td style="padding:8px 12px;font-weight:700">1</td>
            <td style="padding:8px 12px;font-weight:700">Earlybird Premium</td>
            <td style="padding:8px 12px">Couple</td>
            <td style="padding:8px 12px;text-align:center;font-weight:700;color:#16a34a">$330</td>
            <td style="padding:8px 12px;text-align:center;font-weight:700;color:#dc2626">$290</td>
            <td style="padding:8px 12px;text-align:center;color:#dc2626;font-weight:700">-$40</td>
          </tr>
          <tr style="border-bottom:1px solid #fecaca">
            <td style="padding:8px 12px;font-weight:700">2</td>
            <td style="padding:8px 12px;font-weight:700">Earlybird Premium</td>
            <td style="padding:8px 12px">Individual</td>
            <td style="padding:8px 12px;text-align:center;font-weight:700;color:#16a34a">$205</td>
            <td style="padding:8px 12px;text-align:center;font-weight:700;color:#dc2626">$215</td>
            <td style="padding:8px 12px;text-align:center;color:#dc2626;font-weight:700">+$10</td>
          </tr>
          <tr style="background:#fef2f2;border-bottom:1px solid #fecaca">
            <td style="padding:8px 12px;font-weight:700">3</td>
            <td style="padding:8px 12px;font-weight:700">Premium</td>
            <td style="padding:8px 12px">Couple</td>
            <td style="padding:8px 12px;text-align:center;font-weight:700;color:#16a34a">$365</td>
            <td style="padding:8px 12px;text-align:center;font-weight:700;color:#dc2626">$330</td>
            <td style="padding:8px 12px;text-align:center;color:#dc2626;font-weight:700">-$35</td>
          </tr>
          <tr style="border-bottom:1px solid #fecaca">
            <td style="padding:8px 12px;font-weight:700">4</td>
            <td style="padding:8px 12px;font-weight:700">Premium</td>
            <td style="padding:8px 12px">Individual</td>
            <td style="padding:8px 12px;text-align:center;font-weight:700;color:#16a34a">$230</td>
            <td style="padding:8px 12px;text-align:center;font-weight:700;color:#dc2626">$240</td>
            <td style="padding:8px 12px;text-align:center;color:#dc2626;font-weight:700">+$10</td>
          </tr>
          <tr style="background:#fef2f2;border-bottom:1px solid #fecaca">
            <td style="padding:8px 12px;font-weight:700">5</td>
            <td style="padding:8px 12px;font-weight:700">Premium</td>
            <td style="padding:8px 12px">Student</td>
            <td style="padding:8px 12px;text-align:center;font-weight:700;color:#16a34a">$165</td>
            <td style="padding:8px 12px;text-align:center;font-weight:700;color:#dc2626">$175</td>
            <td style="padding:8px 12px;text-align:center;color:#dc2626;font-weight:700">+$10</td>
          </tr>
          <tr>
            <td style="padding:8px 12px;font-weight:700">6</td>
            <td style="padding:8px 12px;font-weight:700">Earlybird Premium</td>
            <td style="padding:8px 12px">Ticker Banner</td>
            <td style="padding:8px 12px;text-align:center;font-weight:700;color:#16a34a">$330 / $205</td>
            <td style="padding:8px 12px;text-align:center;font-weight:700;color:#dc2626">$290 / $215</td>
            <td style="padding:8px 12px;text-align:center;color:#dc2626;font-weight:700">Mismatch</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Full Correct Fee Table -->
    <div style="margin:20px 0">
      <div style="font-weight:700;color:#1e3a5f;font-size:.95rem;margin-bottom:12px">✅ Correct Values (from Verified Fee Report)</div>
      <table style="width:100%;border-collapse:collapse;font-size:.88rem;border:2px solid #16a34a;border-radius:8px;overflow:hidden">
        <thead>
          <tr style="background:#166534;color:#fff">
            <th style="padding:12px;text-align:left;font-size:.82rem">Tier / Category</th>
            <th style="padding:12px;text-align:center;font-size:.82rem;width:80px">Family</th>
            <th style="padding:12px;text-align:center;font-size:.82rem;width:80px">Couple</th>
            <th style="padding:12px;text-align:center;font-size:.82rem;width:90px">Individual</th>
            <th style="padding:12px;text-align:center;font-size:.82rem;width:80px">Student</th>
          </tr>
        </thead>
        <tbody>
          <tr style="border-bottom:1px solid #e0e0e0">
            <td style="padding:10px 12px;font-weight:700">Earlybird Premium <span style="font-size:.72rem;color:#16a34a">(until May 31)</span></td>
            <td style="padding:10px 8px;text-align:center;font-weight:700">$375</td>
            <td style="padding:10px 8px;text-align:center;font-weight:700;color:#dc2626;background:#fef2f2">$330 ✱</td>
            <td style="padding:10px 8px;text-align:center;font-weight:700;color:#dc2626;background:#fef2f2">$205 ✱</td>
            <td style="padding:10px 8px;text-align:center;font-weight:700">$145</td>
          </tr>
          <tr style="border-bottom:1px solid #e0e0e0">
            <td style="padding:10px 12px;font-weight:700">Premium</td>
            <td style="padding:10px 8px;text-align:center;font-weight:700">$410</td>
            <td style="padding:10px 8px;text-align:center;font-weight:700;color:#dc2626;background:#fef2f2">$365 ✱</td>
            <td style="padding:10px 8px;text-align:center;font-weight:700;color:#dc2626;background:#fef2f2">$230 ✱</td>
            <td style="padding:10px 8px;text-align:center;font-weight:700;color:#dc2626;background:#fef2f2">$165 ✱</td>
          </tr>
          <tr style="border-bottom:1px solid #e0e0e0">
            <td style="padding:10px 12px;font-weight:700">Regular</td>
            <td style="padding:10px 8px;text-align:center;font-weight:700">$280</td>
            <td style="padding:10px 8px;text-align:center;font-weight:700">$255</td>
            <td style="padding:10px 8px;text-align:center;font-weight:700">$140</td>
            <td style="padding:10px 8px;text-align:center;font-weight:700">$100</td>
          </tr>
          <tr style="border-bottom:1px solid #e0e0e0">
            <td style="padding:10px 12px;font-weight:700">Culture Special Pass</td>
            <td style="padding:10px 8px;text-align:center;font-weight:700">$200</td>
            <td style="padding:10px 8px;text-align:center;font-weight:700">$175</td>
            <td style="padding:10px 8px;text-align:center;font-weight:700">$100</td>
            <td style="padding:10px 8px;text-align:center;font-weight:700">$75</td>
          </tr>
          <tr style="border-bottom:1px solid #e0e0e0">
            <td style="padding:10px 12px;font-weight:700">Durga Puja Celebration</td>
            <td style="padding:10px 8px;text-align:center;font-weight:700">$210</td>
            <td style="padding:10px 8px;text-align:center;font-weight:700">$175</td>
            <td style="padding:10px 8px;text-align:center;font-weight:700">$110</td>
            <td style="padding:10px 8px;text-align:center;font-weight:700">$80</td>
          </tr>
          <tr>
            <td style="padding:10px 12px;font-weight:700">Durga Puja Core</td>
            <td style="padding:10px 8px;text-align:center;font-weight:700">$150</td>
            <td style="padding:10px 8px;text-align:center;font-weight:700">$125</td>
            <td style="padding:10px 8px;text-align:center;font-weight:700">$80</td>
            <td style="padding:10px 8px;text-align:center;font-weight:700">$60</td>
          </tr>
        </tbody>
      </table>
      <p style="font-size:.78rem;color:#dc2626;margin-top:6px">✱ = Differs from live website — needs correction if confirmed</p>
    </div>

    <div style="background:#fefce8;border:2px solid #fbbf24;border-radius:10px;padding:18px;margin:18px 0">
      <div style="font-weight:700;color:#854d0e;font-size:.95rem;margin-bottom:10px">How to Reply:</div>
      <p style="margin:0 0 10px;font-size:.88rem;color:#555">Please reply to this email with one of:</p>
      <ul style="margin:0;padding-left:20px;font-size:.88rem;color:#555;line-height:1.8">
        <li><strong>"Report values are correct"</strong> — we will update website to match the report</li>
        <li><strong>"Website values are correct"</strong> — we will update the report to match the website</li>
        <li><strong>Different values</strong> — specify which cells need what value</li>
      </ul>
    </div>

    <div style="background:#eff6ff;border:1px solid #93c5fd;border-radius:8px;padding:14px;margin:18px 0">
      <strong style="color:#1e40af">Reference Links:</strong>
      <ul style="margin:8px 0 0;padding-left:18px;color:#555;font-size:.84rem;line-height:1.8">
        <li><a href="${CONFIG.FEES_REPORT_URL}" style="color:#1e40af;font-weight:600">Verified Fee Report</a> (extracted from member_fees.png)</li>
        <li><a href="${CONFIG.LANDING_PAGE_URL}" style="color:#1e40af;font-weight:600">Live Website</a> (scroll to Membership section)</li>
      </ul>
    </div>

    <p style="font-size:.88rem;color:#555"><strong>Please reply at your earliest convenience</strong> so we can correct the website before the membership drive opens.</p>

    <p style="color:#777;font-size:.82rem;margin-top:24px;border-top:1px solid #eee;padding-top:14px">
      ${esc(CONFIG.BANF_ORG)}<br>
      <a href="${CONFIG.BANF_WEBSITE}" style="color:#1e40af">${CONFIG.BANF_WEBSITE}</a> |
      <a href="mailto:${CONFIG.BANF_EMAIL}" style="color:#1e40af">${CONFIG.BANF_EMAIL}</a>
    </p>
  </div>
</div>`;
  return { subject, html };
}

// ---- Transporter ----
async function createTransporter() {
  if (!GMAIL.CLIENT_ID || !GMAIL.REFRESH_TOKEN) {
    throw new Error('Gmail OAuth2 credentials not found.');
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

async function sendEmail(transporter, member, testMode) {
  const emailContent = emailFeesCorrection(member);
  const actualTo = testMode ? CONFIG.TEST_EMAIL : member.email;
  const actualSubject = testMode && member.email !== CONFIG.TEST_EMAIL
    ? `[TEST -> ${member.email}] ${emailContent.subject}`
    : emailContent.subject;

  const info = await transporter.sendMail({
    from: `"${CONFIG.BANF_ORG}" <${CONFIG.BANF_EMAIL}>`,
    to: actualTo,
    replyTo: CONFIG.BANF_EMAIL,
    subject: actualSubject,
    html: emailContent.html
  });
  return {
    messageId: info.messageId,
    to: actualTo,
    originalTo: member.email,
    name: member.name,
    timestamp: new Date().toISOString()
  };
}

async function main() {
  const args = process.argv.slice(2);
  const doSend = args.includes('--send');
  const testOnly = args.includes('--test-only');

  console.log('='.repeat(68));
  console.log('  BANF Membership Fees CORRECTION Email — EC (2026-2028)');
  console.log('  Mode: ' + (doSend ? 'LIVE SEND' : testOnly ? 'TEST ONLY (Ranadhir)' : 'DRY RUN'));
  console.log('  Date: ' + new Date().toISOString());
  console.log('='.repeat(68));

  console.log('\n  DISCREPANCIES FOUND:');
  console.log('  ' + '-'.repeat(60));
  console.log('  #  Tier                  Category    Report  Website  Diff');
  console.log('  ' + '-'.repeat(60));
  console.log('  1  Earlybird Premium     Couple      $330    $290     -$40');
  console.log('  2  Earlybird Premium     Individual  $205    $215     +$10');
  console.log('  3  Premium               Couple      $365    $330     -$35');
  console.log('  4  Premium               Individual  $230    $240     +$10');
  console.log('  5  Premium               Student     $165    $175     +$10');
  console.log('  6  EB Ticker Banner       Couple/Ind  $330/$205  $290/$215');
  console.log('  ' + '-'.repeat(60));
  console.log('');

  const targets = testOnly
    ? EC_MEMBERS.filter(m => m.email === CONFIG.TEST_EMAIL)
    : EC_MEMBERS;

  for (const m of targets) {
    console.log(`--- ${m.name} (${m.role}) → ${m.email}`);
  }
  console.log('');

  if (!doSend && !testOnly) {
    console.log('DRY RUN complete. No emails sent.');
    console.log('Use --send to send to all EC, or --test-only for test.');
    return;
  }

  console.log('Creating Gmail transporter...');
  let transporter;
  try {
    transporter = await createTransporter();
    console.log('Transporter verified OK.\n');
  } catch (err) {
    console.error('ERROR:', err.message);
    return;
  }

  const results = [];
  for (let i = 0; i < targets.length; i++) {
    const m = targets[i];
    console.log(`[${i + 1}/${targets.length}] Sending to ${m.name}...`);
    try {
      const r = await sendEmail(transporter, m, testOnly);
      results.push(r);
      console.log(`  OK: ${r.messageId}`);
    } catch (err) {
      console.error(`  FAILED: ${err.message}`);
      results.push({ name: m.name, email: m.email, error: err.message });
    }
    if (i < targets.length - 1) await new Promise(r => setTimeout(r, CONFIG.SEND_DELAY_MS));
  }

  console.log('\n' + '='.repeat(68));
  console.log('  RESULTS');
  console.log('='.repeat(68));
  const ok = results.filter(r => r.messageId);
  const fail = results.filter(r => r.error);
  console.log(`  Sent: ${ok.length}  |  Failed: ${fail.length}  |  Total: ${targets.length}`);
  if (fail.length) fail.forEach(f => console.log(`    FAIL: ${f.name} — ${f.error}`));
  console.log('='.repeat(68));
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
