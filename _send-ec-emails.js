/**
 * EC Email Campaign Sender
 * Sends onboarding emails to all 7 EC members via ec_send_welcome_email endpoint
 * Outputs JSON results for the monitoring dashboard
 */
const https = require('https');

const API_HOST = 'www.jaxbengali.org';
const LOGIN_URL = 'https://banfjax-hash.github.io/banf/ec-admin-login.html';
const PORTAL_URL = 'https://banfjax-hash.github.io/banf/admin-portal.html';
const SITE_URL = 'https://www.jaxbengali.org';

const EC_MEMBERS = [
  { email: 'ranadhir.ghosh@gmail.com',     firstName: 'Ranadhir', lastName: 'Ghosh',        ecTitle: 'President' },
  { email: 'mukhopadhyay.partha@gmail.com', firstName: 'Partha',   lastName: 'Mukhopadhyay', ecTitle: 'Vice President' },
  { email: 'amit.everywhere@gmail.com',     firstName: 'Amit',     lastName: 'Chandak',      ecTitle: 'Treasurer' },
  { email: 'rajanya.ghosh@gmail.com',       firstName: 'Rajanya',  lastName: 'Ghosh',        ecTitle: 'General Secretary' },
  { email: 'moumita.mukherje@gmail.com',    firstName: 'Moumita',  lastName: 'Ghosh',        ecTitle: 'Cultural Secretary' },
  { email: 'sumo475@gmail.com',            firstName: 'Sumanta',  lastName: 'Ghosh',        ecTitle: 'Event Coordinator' },
  { email: 'rwitichoudhury@gmail.com',      firstName: 'Rwiti',    lastName: 'Choudhury',    ecTitle: 'Puja Coordinator' },
];

function post(path, data) {
  return new Promise((resolve) => {
    const body = JSON.stringify(data);
    const req = https.request({
      hostname: API_HOST,
      path: '/_functions/' + path,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }
    }, (res) => {
      let s = '';
      res.on('data', c => s += c);
      res.on('end', () => {
        try { resolve({ statusCode: res.statusCode, ...JSON.parse(s) }); }
        catch (e) { resolve({ statusCode: res.statusCode, raw: s.slice(0, 500), parseError: true }); }
      });
    });
    req.on('error', e => resolve({ error: e.message, networkError: true }));
    req.write(body);
    req.end();
  });
}

function getSignupUrl(m) {
  const expires = Date.now() + 7 * 24 * 60 * 60 * 1000;
  return `${LOGIN_URL}?signup=true&email=${encodeURIComponent(m.email)}&expires=${expires}`;
}

function getEmailHtml(m) {
  const signupUrl = getSignupUrl(m);
  return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 620px; margin: 0 auto; padding: 0;">
    <div style="background: linear-gradient(135deg, #8B0000, #DC143C); padding: 28px 24px; border-radius: 8px 8px 0 0; text-align: center;">
        <div style="font-size: 32px; font-weight: 800; color: #fff; letter-spacing: 2px;">BANF</div>
        <div style="font-size: 13px; color: rgba(255,255,255,0.8); margin-top: 4px;">Bengali Association of North Florida</div>
        <div style="font-size: 11px; color: rgba(255,255,255,0.5); margin-top: 6px;">EC Admin onboarding &mdash; Noboborsho 2026</div>
    </div>
    <div style="background: #ffffff; padding: 28px 24px; border: 1px solid #e0e0e0; border-top: none;">
        <h2 style="color: #1a1a2e; margin: 0 0 12px 0; font-size: 20px;">Namaskar ${m.firstName}!</h2>
        <p style="color: #444; font-size: 15px;">As <strong>${m.ecTitle}</strong> for BANF Noboborsho 2026, you have a dedicated admin account on our new <strong>EC Admin Portal</strong>. Please complete the following steps to get fully set up:</p>
        <div style="background: #f8f9ff; border-left: 4px solid #8B0000; border-radius: 0 8px 8px 0; padding: 16px 18px; margin: 18px 0;">
            <div style="font-weight: 700; color: #1a1a2e; font-size: 15px; margin-bottom: 6px;">Step 1: Sign Up &amp; Set Password</div>
            <p style="color: #555; font-size: 14px; margin: 0 0 10px 0;">Click the button below to create your account. Use this email address (<strong>${m.email}</strong>) and set a strong password.</p>
            <a href="${signupUrl}" style="display: inline-block; background: linear-gradient(135deg, #8B0000, #DC143C); color: #fff; padding: 12px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 14px;">Sign Up Now &rarr;</a>
        </div>
        <div style="background: #f0fdf4; border-left: 4px solid #16a34a; border-radius: 0 8px 8px 0; padding: 16px 18px; margin: 18px 0;">
            <div style="font-weight: 700; color: #1a1a2e; font-size: 15px; margin-bottom: 6px;">Step 2: Log In &amp; Explore the Portal</div>
            <p style="color: #555; font-size: 14px; margin: 0 0 8px 0;">After signup, log in to the <a href="${PORTAL_URL}" style="color: #3b82f6; font-weight: 600;">EC Admin Portal</a> and explore:</p>
            <ul style="color: #555; font-size: 14px; margin: 0; padding-left: 20px; line-height: 1.8;">
                <li><strong>Dashboard</strong> &mdash; Overview of event &amp; membership status</li>
                <li><strong>Procurement</strong> &mdash; Submit budget requests for your area</li>
                <li><strong>E-Vite Manager</strong> &mdash; Track invitation delivery &amp; RSVPs</li>
                <li><strong>Ledger</strong> &mdash; View financial transactions</li>
            </ul>
        </div>
        <div style="background: #fefce8; border-left: 4px solid #eab308; border-radius: 0 8px 8px 0; padding: 16px 18px; margin: 18px 0;">
            <div style="font-weight: 700; color: #1a1a2e; font-size: 15px; margin-bottom: 6px;">Step 3: Update Your EC Profile &#11088; <span style="font-size:11px;color:#DC143C;font-weight:400">(NEW)</span></div>
            <p style="color: #555; font-size: 14px; margin: 0 0 8px 0;">We've added a new <strong>&quot;My EC Profile&quot;</strong> section in the portal. Please:</p>
            <ul style="color: #555; font-size: 14px; margin: 0; padding-left: 20px; line-height: 1.8;">
                <li><strong>Upload your profile photo</strong> &mdash; This will appear on the BANF website's EC team page</li>
                <li><strong>Write a short summary</strong> (1-2 lines for your EC member card)</li>
                <li><strong>Add your bio</strong> &mdash; education, profession, interests</li>
            </ul>
            <p style="color: #777; font-size: 13px; margin: 8px 0 0 0;">Photos are auto-resized. You can update anytime.</p>
        </div>
        <div style="text-align: center; margin: 24px 0 16px 0;">
            <a href="${signupUrl}" style="display: inline-block; background: linear-gradient(135deg, #8B0000, #DC143C); color: #fff; padding: 14px 36px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; letter-spacing: 0.5px;">Get Started &rarr;</a>
        </div>
        <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 20px 0;">
        <p style="color: #777; font-size: 13px; margin-bottom: 6px;"><strong>Quick Links:</strong></p>
        <ul style="color: #777; font-size: 13px; line-height: 1.8; padding-left: 18px; margin: 0;">
            <li><a href="${LOGIN_URL}" style="color: #3b82f6;">EC Admin Login</a></li>
            <li><a href="${PORTAL_URL}" style="color: #3b82f6;">EC Admin Portal</a></li>
            <li><a href="${SITE_URL}" style="color: #3b82f6;">BANF Website</a></li>
        </ul>
        <p style="color: #777; font-size: 13px; margin-top: 16px;">If you have any questions, reply to this email or reach out to the President directly.</p>
        <p style="color: #444; margin-top: 20px;">Thank you for your service to BANF!<br><strong>BANF Admin Team</strong></p>
    </div>
    <div style="background: #1a1a2e; color: #888; padding: 16px; text-align: center; font-size: 12px; border-radius: 0 0 8px 8px;">
        Bengali Association of North Florida &bull; Jacksonville, FL<br>
        <a href="${SITE_URL}" style="color: #aaa;">www.jaxbengali.org</a>
    </div>
</body>
</html>`;
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

(async () => {
  const results = [];
  const startTime = new Date().toISOString();
  console.log('=== EC EMAIL CAMPAIGN START ===');
  console.log('Time:', startTime);
  console.log('Members:', EC_MEMBERS.length);
  console.log('');

  for (const m of EC_MEMBERS) {
    const subject = `Action Required: Complete Your BANF EC Admin Setup — ${m.ecTitle}`;
    const html = getEmailHtml(m);
    const sendStart = Date.now();

    console.log(`Sending to ${m.firstName} ${m.lastName} (${m.ecTitle}) <${m.email}>...`);

    const r = await post('ec_send_welcome_email', {
      email: m.email,
      name: m.firstName + ' ' + m.lastName,
      ecTitle: m.ecTitle,
      customSubject: subject,
      customHtml: html
    });

    const elapsed = Date.now() - sendStart;
    const success = r.success === true;
    const entry = {
      email: m.email,
      firstName: m.firstName,
      lastName: m.lastName,
      ecTitle: m.ecTitle,
      subject: subject,
      success: success,
      emailSent: r.emailSent || false,
      statusCode: r.statusCode,
      error: r.error || null,
      elapsed: elapsed,
      sentAt: new Date().toISOString()
    };
    results.push(entry);

    console.log(`  ${success ? 'OK' : 'FAIL'} (${elapsed}ms) ${r.error || ''}`);

    // 2 second delay between sends to avoid rate limiting
    if (EC_MEMBERS.indexOf(m) < EC_MEMBERS.length - 1) {
      await sleep(2000);
    }
  }

  const endTime = new Date().toISOString();
  const sent = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;

  console.log('');
  console.log(`=== DONE: ${sent} sent, ${failed} failed ===`);

  // Write results JSON for dashboard
  const report = {
    campaign: 'EC Onboarding Email',
    startTime,
    endTime,
    totalMembers: EC_MEMBERS.length,
    sent,
    failed,
    results
  };

  require('fs').writeFileSync(
    require('path').join(__dirname, '_ec-email-campaign-results.json'),
    JSON.stringify(report, null, 2)
  );
  console.log('Results saved to _ec-email-campaign-results.json');
})();
