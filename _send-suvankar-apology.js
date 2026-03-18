#!/usr/bin/env node
/**
 * Send apology + analysis email for Suvankar Paul spouse name error
 * Usage:
 *   node _send-suvankar-apology.js                  # dry run
 *   node _send-suvankar-apology.js --test            # send to Ranadhir for review
 *   node _send-suvankar-apology.js --send            # send to Suvankar (live)
 */
const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');

const secrets = JSON.parse(fs.readFileSync(path.join(__dirname, '.banf-secrets.json'), 'utf8'));
const BANF_EMAIL = 'banfjax@gmail.com';
const BANF_ORG = 'BANF - Bengali Association of North Florida';
const TEST_EMAIL = 'ranadhir.ghosh@gmail.com';
const LIVE_EMAIL = 'suvankar.paul@gmail.com';

const html = `<div style="font-family:'Segoe UI',Arial,Helvetica,sans-serif;max-width:660px;margin:0 auto;background:#ffffff">
  <div style="background:linear-gradient(135deg,#b91c1c,#ef4444);color:#ffffff;padding:24px 28px;border-radius:10px 10px 0 0">
    <h2 style="margin:0;font-size:1.25rem;font-weight:700">BANF CRM &mdash; Correction Notice</h2>
    <p style="margin:6px 0 0;opacity:.9;font-size:.88rem">We Apologize for the Error in Our Previous Email</p>
  </div>

  <div style="padding:24px 28px;border:1px solid #e0e0e0;border-top:none;border-radius:0 0 10px 10px;color:#333333">
    <p style="margin:0 0 14px">Dear <strong>Suvankar</strong>,</p>

    <p>We sincerely apologize for an error in the CRM verification email you received earlier today. Your <strong>spouse name was incorrectly listed as Paramita Paul</strong>. This was wrong, and we want to explain what happened, the investigation we performed, and what we have done to fix it.</p>

    <!-- SECTION 1: What Was Wrong -->
    <div style="background:#fef2f2;border:2px solid #ef4444;border-radius:10px;padding:16px;margin:18px 0">
      <div style="font-size:.82rem;color:#991b1b;font-weight:600;margin-bottom:8px">&#10060; What Was Wrong</div>
      <table style="width:100%;border-collapse:collapse;font-size:.88rem">
        <tr style="border-bottom:1px solid #fecaca">
          <td style="padding:6px 8px;font-weight:600;color:#991b1b;width:120px">Incorrect</td>
          <td style="padding:6px 8px"><s style="color:#991b1b">Spouse: Paramita Paul</s></td>
        </tr>
        <tr>
          <td style="padding:6px 8px;font-weight:600;color:#991b1b">Incorrect</td>
          <td style="padding:6px 8px"><s style="color:#991b1b">Family: Suvankar &amp; Paramita Paul</s></td>
        </tr>
      </table>
    </div>

    <!-- SECTION 2: Corrected Information -->
    <div style="background:#f0fdf4;border:2px solid #22c55e;border-radius:10px;padding:16px;margin:18px 0">
      <div style="font-size:.82rem;color:#166534;font-weight:600;margin-bottom:8px">&#9989; Corrected Information</div>
      <table style="width:100%;border-collapse:collapse;font-size:.88rem">
        <tr style="border-bottom:1px solid #bbf7d0">
          <td style="padding:6px 8px;font-weight:600;color:#166534;width:120px">Spouse</td>
          <td style="padding:6px 8px;font-weight:700;color:#166534">Sharmistha Poddar</td>
        </tr>
        <tr style="border-bottom:1px solid #bbf7d0">
          <td style="padding:6px 8px;font-weight:600;color:#166534">Family Name</td>
          <td style="padding:6px 8px;font-weight:700;color:#166534">Suvankar Paul &amp; Sharmistha Poddar</td>
        </tr>
        <tr style="border-bottom:1px solid #bbf7d0">
          <td style="padding:6px 8px;font-weight:600;color:#166534">Your Roles</td>
          <td style="padding:6px 8px">Member, President (2022&ndash;2026), Joint Secretary (2026&ndash;2028)</td>
        </tr>
        <tr>
          <td style="padding:6px 8px;font-weight:600;color:#166534">Member Since</td>
          <td style="padding:6px 8px">2022</td>
        </tr>
      </table>
    </div>

    <!-- SECTION 3: What Caused The Error -->
    <div style="background:#fffbeb;border:2px solid #facc15;border-radius:10px;padding:18px;margin:18px 0">
      <div style="font-weight:700;color:#854d0e;font-size:.95rem;margin-bottom:10px">&#9888;&#65039; What Caused This Error</div>
      <p style="margin:0 0 10px;font-size:.88rem;color:#555555">Our CRM system automatically groups members into families based on surname matching. Because <strong>Paul</strong> and <strong>Pal</strong> are treated as spelling variants of the same Bengali surname, the system incorrectly merged three separate individuals into one family unit (RFAM-074):</p>
      <ul style="margin:8px 0;padding-left:18px;color:#555555;font-size:.88rem;line-height:1.7">
        <li><strong>Sumit Pal</strong> and <strong>Paramita Pal</strong> (who are an actual married couple)</li>
        <li><strong>Suvankar Paul</strong> (you &mdash; incorrectly linked due to surname similarity)</li>
      </ul>
      <p style="margin:10px 0 0;font-size:.88rem;color:#555555">This caused Paramita Pal (Sumit&rsquo;s wife) to be wrongly listed as your spouse instead of <strong>Sharmistha Poddar</strong>.</p>
    </div>

    <!-- SECTION 4: Investigation - Document Co-occurrence Analysis -->
    <div style="background:#faf5ff;border:2px solid #a855f7;border-radius:10px;padding:18px;margin:18px 0">
      <div style="font-weight:700;color:#6b21a8;font-size:.95rem;margin-bottom:10px">&#128270; Investigation: Document Co-occurrence Analysis</div>
      <p style="margin:0 0 12px;font-size:.88rem;color:#555555">We performed a thorough investigation across <strong>all BANF documents in Google Drive</strong> (CRM reports, membership records, event guest lists, payment records, magazine contributions, family universe data) to verify the correct spouse using <em>name co-occurrence analysis</em> &mdash; which is far more accurate than surname matching alone.</p>

      <div style="background:#ffffff;border:1px solid #d8b4fe;border-radius:8px;padding:14px;margin:10px 0">
        <div style="font-weight:600;color:#6b21a8;font-size:.85rem;margin-bottom:8px">Evidence Linking Sharmistha to Suvankar (Correct)</div>
        <table style="width:100%;border-collapse:collapse;font-size:.82rem">
          <tr style="background:#faf5ff">
            <td style="padding:5px 8px;font-weight:600;color:#6b21a8;border-bottom:1px solid #e9d5ff">#</td>
            <td style="padding:5px 8px;font-weight:600;color:#6b21a8;border-bottom:1px solid #e9d5ff">Source Document</td>
            <td style="padding:5px 8px;font-weight:600;color:#6b21a8;border-bottom:1px solid #e9d5ff">Evidence</td>
          </tr>
          <tr style="border-bottom:1px solid #f3e8ff">
            <td style="padding:5px 8px">1</td>
            <td style="padding:5px 8px">Family Universe Report</td>
            <td style="padding:5px 8px">EC Leadership: <em>&ldquo;Suvankar | Sharmistha Poddar | Cultural Secretary&rdquo;</em></td>
          </tr>
          <tr style="border-bottom:1px solid #f3e8ff">
            <td style="padding:5px 8px">2</td>
            <td style="padding:5px 8px">Family Universe Report</td>
            <td style="padding:5px 8px">Jagriti Magazine: <em>&ldquo;Suvankar | Sharmistha Poddar | Painting&rdquo;</em></td>
          </tr>
          <tr style="border-bottom:1px solid #f3e8ff">
            <td style="padding:5px 8px">3</td>
            <td style="padding:5px 8px">Family Universe v3 (xlsx)</td>
            <td style="padding:5px 8px">Family FAM-AD8928F5: <em>Primary Surname: Suvankar, Members: Sharmistha</em> &mdash; Original entry: <strong>&ldquo;Sharmistha and Family Suvankar&rdquo;</strong></td>
          </tr>
          <tr style="border-bottom:1px solid #f3e8ff">
            <td style="padding:5px 8px">4</td>
            <td style="padding:5px 8px">Bosonto Workflow Agent</td>
            <td style="padding:5px 8px">Case 3 analysis: <em>&ldquo;Evite 2A confirms couple. Spouse: Sharmistha (sharmi.p09@gmail.com in CRM)&rdquo;</em></td>
          </tr>
          <tr style="border-bottom:1px solid #f3e8ff">
            <td style="padding:5px 8px">5</td>
            <td style="padding:5px 8px">WF Payment Records</td>
            <td style="padding:5px 8px">$330 from SUVANKAR &mdash; M2 Premium <strong>Couple</strong> price point, confirming couple status</td>
          </tr>
          <tr style="border-bottom:1px solid #f3e8ff">
            <td style="padding:5px 8px">6</td>
            <td style="padding:5px 8px">Evite Guest List</td>
            <td style="padding:5px 8px">Suvankar RSVP: Yes, <strong>2 adults</strong> (couple). Sharmistha Paul (sharmi.p09@gmail.com) listed separately.</td>
          </tr>
          <tr style="border-bottom:1px solid #f3e8ff">
            <td style="padding:5px 8px">7</td>
            <td style="padding:5px 8px">Jagriti 2022 / 2023</td>
            <td style="padding:5px 8px">Contributor listed as <em>&ldquo;Sharmistha Paul&rdquo;</em> (2022) and <em>&ldquo;Sharmistha Poddar&rdquo;</em> (2023) &mdash; same person, maiden/married name</td>
          </tr>
          <tr>
            <td style="padding:5px 8px">8</td>
            <td style="padding:5px 8px">QR Food Check-in</td>
            <td style="padding:5px 8px">Sharmistha Poddar (sharmi.p09@gmail.com) checked in at BANF events</td>
          </tr>
        </table>
      </div>

      <div style="background:#ffffff;border:1px solid #d8b4fe;border-radius:8px;padding:14px;margin:10px 0">
        <div style="font-weight:600;color:#6b21a8;font-size:.85rem;margin-bottom:8px">Co-occurrence Statistics</div>
        <table style="width:100%;border-collapse:collapse;font-size:.82rem">
          <tr style="background:#faf5ff;border-bottom:1px solid #e9d5ff">
            <td style="padding:5px 8px;font-weight:600;color:#6b21a8">Name Pair</td>
            <td style="padding:5px 8px;font-weight:600;color:#6b21a8;text-align:center">Source Data Links</td>
            <td style="padding:5px 8px;font-weight:600;color:#6b21a8;text-align:center">Total Direct Links</td>
            <td style="padding:5px 8px;font-weight:600;color:#6b21a8;text-align:center">Verdict</td>
          </tr>
          <tr style="border-bottom:1px solid #f3e8ff;background:#f0fdf4">
            <td style="padding:5px 8px;font-weight:600">Sharmistha + Suvankar</td>
            <td style="padding:5px 8px;text-align:center;font-weight:700;color:#166534">6 in source data</td>
            <td style="padding:5px 8px;text-align:center;font-weight:700;color:#166534">20 across all reports</td>
            <td style="padding:5px 8px;text-align:center;font-weight:700;color:#166534">&#9989; CORRECT SPOUSE</td>
          </tr>
          <tr style="background:#fef2f2">
            <td style="padding:5px 8px;font-weight:600">Paramita + Suvankar</td>
            <td style="padding:5px 8px;text-align:center;font-weight:700;color:#991b1b">1 in source data</td>
            <td style="padding:5px 8px;text-align:center;color:#991b1b">24 (inflated by erroneous CRM propagation)</td>
            <td style="padding:5px 8px;text-align:center;font-weight:700;color:#991b1b">&#10060; FALSE MATCH</td>
          </tr>
        </table>
        <p style="margin:10px 0 0;font-size:.8rem;color:#777">Note: Paramita+Suvankar&rsquo;s 24 &ldquo;direct links&rdquo; are almost entirely from <strong>one CRM reconciliation report that propagated the original error</strong> (14 of 24 hits). In contrast, Sharmistha+Suvankar&rsquo;s 20 links come from <strong>3 independent sources</strong> (workflow analysis, CRM comprehensive report, and reconciliation) corroborating each other.</p>
      </div>

      <div style="background:#ffffff;border:1px solid #d8b4fe;border-radius:8px;padding:14px;margin:10px 0">
        <div style="font-weight:600;color:#6b21a8;font-size:.85rem;margin-bottom:8px">Confirmation: Paramita Pal&rsquo;s Correct Family</div>
        <p style="margin:0;font-size:.82rem;color:#555555">The CRM Universe Report correctly lists <strong>Paramita Pal</strong> (runaparamita@gmail.com) under the family <strong>&ldquo;Sumit &amp; Paramita Pal&rdquo;</strong> &mdash; confirming she is <strong>Sumit Pal&rsquo;s wife</strong>, not Suvankar&rsquo;s.</p>
      </div>
    </div>

    <!-- SECTION 5: Actions Taken -->
    <div style="background:#eff6ff;border:2px solid #3b82f6;border-radius:10px;padding:18px;margin:18px 0">
      <div style="font-weight:700;color:#1e40af;font-size:.95rem;margin-bottom:10px">&#128736;&#65039; Actions Taken to Prevent This for All Members</div>
      <ol style="margin:0;padding-left:20px;color:#555555;font-size:.88rem;line-height:1.9">
        <li><strong>Immediate fix:</strong> Your spouse name has been corrected to <strong>Sharmistha Poddar</strong> in all our systems and email templates.</li>
        <li><strong>Document co-occurrence validation:</strong> We are now cross-referencing family relationships against <strong>multiple independent data sources</strong> (event check-ins, payment records, magazine contributions, evite RSVPs, family universe records) rather than relying on surname matching alone. A name pair must appear together across at least 2 independent sources to be considered a valid family link.</li>
        <li><strong>CRM verification drive:</strong> We are asking all stakeholders and members to verify their personal and family details &mdash; this is exactly why we sent the CRM verification email. Your reply will help us confirm accuracy.</li>
        <li><strong>Surname alias audit:</strong> We are reviewing all Bengali surname variants (Pal/Paul, Das/Doss, Mitra/Mitter, etc.) to ensure the family-grouping algorithm does not create false associations across different families who happen to share transliteration variants.</li>
        <li><strong>EC Tenure Report:</strong> We have published a comprehensive <a href="https://banfjax-hash.github.io/banf/BANF_EC_TENURE_REPORT.html" style="color:#1e40af;font-weight:600">EC Tenure Report</a> documenting all EC members across tenures, so role attributions are properly verified and transparent.</li>
      </ol>
    </div>

    <p style="font-size:.88rem;color:#555555">We take data accuracy very seriously. If you notice any other discrepancies in your records, please reply to this email and we will correct them immediately.</p>

    <p style="font-size:.88rem;color:#555555">Once again, we sincerely apologize for this error.</p>

    <p style="font-size:.88rem;color:#555555">Warm regards,<br><strong>Dr. Ranadhir Ghosh</strong><br>President, BANF (2026&ndash;2028)<br>On behalf of the Executive Committee</p>

    <p style="color:#777777;font-size:.82rem;margin-top:24px;border-top:1px solid #eeeeee;padding-top:14px">
      BANF &mdash; Bengali Association of North Florida<br>
      <a href="https://www.jaxbengali.org" style="color:#3b82f6">www.jaxbengali.org</a> &nbsp;|&nbsp;
      <a href="mailto:banfjax@gmail.com" style="color:#3b82f6">banfjax@gmail.com</a>
    </p>
  </div>
</div>`;

async function main() {
  const LIVE = process.argv.includes('--send');
  const TEST = process.argv.includes('--test');
  const toEmail = LIVE ? LIVE_EMAIL : TEST ? TEST_EMAIL : null;

  if (!toEmail) {
    console.log('=== DRY RUN ===');
    console.log('Use --test to send to', TEST_EMAIL);
    console.log('Use --send to send to', LIVE_EMAIL);
    return;
  }

  console.log(LIVE ? '=== LIVE SEND ===' : '=== TEST SEND ===');

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      type: 'OAuth2',
      user: BANF_EMAIL,
      clientId: secrets.CLIENT_ID,
      clientSecret: secrets.CLIENT_SECRET,
      refreshToken: secrets.REFRESH_TOKEN
    }
  });
  await transporter.verify();
  console.log('Gmail OAuth2 transporter verified OK');

  const subject = TEST
    ? '[TEST REVIEW] BANF CRM Correction - Apology Email Draft for Suvankar'
    : 'BANF CRM Correction - We Apologize for the Spouse Name Error';

  const info = await transporter.sendMail({
    from: `"${BANF_ORG}" <${BANF_EMAIL}>`,
    to: toEmail,
    replyTo: BANF_EMAIL,
    subject,
    html
  });
  console.log('SENT OK:', info.messageId);
  console.log('To:', toEmail);
  console.log('Subject:', subject);
}

main().catch(e => { console.error('FAILED:', e.message); process.exit(1); });
