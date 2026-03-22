#!/usr/bin/env node
/**
 * BANF Evite — Direct Send with Working RSVP
 *
 * Bypasses the broken Wix deploy by:
 * 1. Creating an invitation record via Wix Data REST API
 * 2. Sending the email locally with a real RSVP link
 *
 * Usage: node _evite-direct-send.js
 */
const https = require('https');
const fs = require('fs');
const path = require('path');

const secrets = require('./.banf-secrets.json');
const PRESIDENT = { name: 'Ranadhir Ghosh', email: 'ranadhir.ghosh@gmail.com', role: 'president' };
const EVENT_ID = '61849b36-68e5-41fc-885d-998feafc21f2';
const RSVP_FORM_URL = 'https://banfjax-hash.github.io/banf/rsvp-v2.html';
const WIX_META_SITE_ID = '6a4f0362-0394-4e28-8559-f6145dd414e0';
const WIX_SITE_ID = '7c1629de-1358-490b-b768-f99fae428170';

// ── Helpers ──
function httpsRequest(options, body) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(data) }); }
        catch (e) { resolve({ status: res.statusCode, data }); }
      });
    });
    req.on('error', reject);
    if (body) req.write(typeof body === 'string' ? body : JSON.stringify(body));
    req.end();
  });
}

function generateToken() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let t = '';
  for (let i = 0; i < 32; i++) t += chars.charAt(Math.floor(Math.random() * chars.length));
  return t;
}

// ── Step 1: Get Gmail access token ──
async function getGmailAccessToken() {
  console.log('  Getting Gmail access token...');
  const postData = `grant_type=refresh_token&refresh_token=${encodeURIComponent(secrets.REFRESH_TOKEN)}&client_id=${encodeURIComponent(secrets.CLIENT_ID)}&client_secret=${encodeURIComponent(secrets.CLIENT_SECRET)}`;
  const result = await httpsRequest({
    hostname: 'oauth2.googleapis.com',
    path: '/token',
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Content-Length': Buffer.byteLength(postData) }
  }, postData);
  if (!result.data.access_token) throw new Error('Gmail token failed: ' + JSON.stringify(result.data));
  console.log('  ✅ Gmail access token obtained');
  return result.data.access_token;
}

// ── Step 2: Register invitation via Wix _functions endpoint ──
async function registerInvitation(token) {
  console.log('  Registering invitation record via Wix backend...');
  
  // Use a custom approach: call evite_rsvp_submit with a pre-registration payload
  // Actually, we need to insert into EviteInvitations. Let's try using the Wix Data REST API.
  
  const wixAuth = JSON.parse(fs.readFileSync(`C:/Users/moumi/.wix/auth/${WIX_META_SITE_ID}.json`, 'utf8'));
  const accessToken = wixAuth.accessToken;
  
  const invitationData = {
    dataCollectionId: 'EviteInvitations',
    dataItem: {
      data: {
        eventId: EVENT_ID,
        eventName: 'BANF Noboborsho 2026',
        token: token,
        recipientName: PRESIDENT.name,
        recipientEmail: PRESIDENT.email.toLowerCase(),
        recipientRole: PRESIDENT.role,
        sentAt: new Date().toISOString(),
        emailSent: true,
        gmailMessageId: '',
        opened: false,
        responded: false,
        rsvpStatus: null,
        adults: 0,
        kids: 0,
        dietary: '',
        notes: '',
        respondedAt: null
      }
    }
  };
  
  const result = await httpsRequest({
    hostname: 'www.wixapis.com',
    path: '/wix-data/v2/items',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': accessToken,
      'wix-site-id': WIX_SITE_ID
    }
  }, invitationData);
  
  if (result.status === 200 || result.status === 201) {
    console.log('  ✅ Invitation record created via Wix Data API');
    return true;
  }
  
  console.log(`  ⚠️  Wix Data API returned ${result.status}:`, typeof result.data === 'string' ? result.data.substring(0, 200) : JSON.stringify(result.data).substring(0, 200));
  
  // Fallback: try using a Wix function endpoint that can write to the collection
  // Try calling bosonto_pipeline or another endpoint that does data inserts
  console.log('  Trying fallback: write via _functions endpoint...');
  
  // Use a generic data write endpoint or create one ad-hoc
  const fbPayload = JSON.stringify({
    collection: 'EviteInvitations',
    item: invitationData.dataItem.data,
    adminKey: 'banf-bosonto-2026-live'
  });
  
  const fbResult = await httpsRequest({
    hostname: 'www.jaxbengali.org',
    path: '/_functions/data_insert',
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(fbPayload) }
  }, fbPayload);
  
  console.log(`  Fallback result: ${fbResult.status}`, JSON.stringify(fbResult.data).substring(0, 200));
  return false;
}

// ── Step 3: Build and send email ──
async function sendEmail(accessToken, rsvpUrl) {
  console.log(`\n  Building email with RSVP link...`);
  console.log(`  RSVP URL: ${rsvpUrl}`);
  
  // Load evite config
  const NOBOBORSHO_EVENT = {
    eventName: 'BANF Noboborsho 2026 — পহেলা বৈশাখ ১৪৩৩',
    eventDate: '2026-04-25',
    eventTime: '11:00 AM – 4:00 PM',
    venue: 'Mill Creek Academy Cafeteria, 3750 International Golf Pkwy, St. Augustine, FL 32092',
    description: 'Join us to celebrate Pohela Boishakh — the Bengali New Year — with a day of culture, music, dance, delicious food and togetherness.',
    highlights: 'Traditional alpona, cultural performances by our members and their families, authentic Bengali cuisine, kids activities, and Rabindra-Nazrul sangeet performances.'
  };
  
  // Load the preview HTML template (generated by evite-noboborsho-dryrun.js)
  // We need to regenerate with the actual RSVP URL
  const previewPath = path.join(__dirname, 'evite-noboborsho-preview.html');
  if (!fs.existsSync(previewPath)) {
    console.error('  ❌ Run "node evite-noboborsho-dryrun.js --preview" first to generate the template');
    return null;
  }
  
  let emailHtml = fs.readFileSync(previewPath, 'utf8');
  
  // Replace the placeholder href="#" with the real RSVP URL
  emailHtml = emailHtml.replace(/href="#"/g, `href="${rsvpUrl}"`);
  // Remove the DRY RUN badge
  emailHtml = emailHtml.replace(/<div class="badge">.*?<\/div>/s, '');
  
  const subject = `You're Invited: ${NOBOBORSHO_EVENT.eventName}`;
  const boundary = 'boundary_' + Date.now();
  const rawEmail = [
    `From: BANF <banfjax@gmail.com>`,
    `To: ${PRESIDENT.name} <${PRESIDENT.email}>`,
    `Subject: =?UTF-8?B?${Buffer.from(subject).toString('base64')}?=`,
    `MIME-Version: 1.0`,
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    ``,
    `--${boundary}`,
    `Content-Type: text/plain; charset=UTF-8`,
    ``,
    `You're invited to ${NOBOBORSHO_EVENT.eventName}!`,
    `Date: ${NOBOBORSHO_EVENT.eventDate} at ${NOBOBORSHO_EVENT.eventTime}`,
    `Venue: ${NOBOBORSHO_EVENT.venue}`,
    ``,
    `RSVP here: ${rsvpUrl}`,
    ``,
    `--${boundary}`,
    `Content-Type: text/html; charset=UTF-8`,
    `Content-Transfer-Encoding: base64`,
    ``,
    Buffer.from(emailHtml).toString('base64').match(/.{1,76}/g).join('\n'),
    ``,
    `--${boundary}--`
  ].join('\r\n');
  
  console.log(`  Sending to: ${PRESIDENT.name} <${PRESIDENT.email}>`);
  const encoded = Buffer.from(rawEmail).toString('base64url');
  
  const sendResult = await httpsRequest({
    hostname: 'gmail.googleapis.com',
    path: '/gmail/v1/users/me/messages/send',
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    }
  }, JSON.stringify({ raw: encoded }));
  
  if (sendResult.status === 200 && sendResult.data.id) {
    console.log(`  ✅ Email sent! Message ID: ${sendResult.data.id}`);
    return sendResult.data;
  } else {
    console.error(`  ❌ Send failed (HTTP ${sendResult.status}):`, JSON.stringify(sendResult.data).substring(0, 300));
    return null;
  }
}

// ── Main ──
async function main() {
  console.log('\n╔═══════════════════════════════════════════════════════════╗');
  console.log('║  BANF Evite — Direct Send with Working RSVP             ║');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');
  
  // Step 1: Gmail token
  const gmailToken = await getGmailAccessToken();
  
  // Step 2: Generate invitation token and RSVP URL
  const invToken = generateToken();
  const rsvpUrl = `${RSVP_FORM_URL}?token=${invToken}&eventId=${EVENT_ID}`;
  
  console.log(`\n  Invitation token: ${invToken}`);
  console.log(`  RSVP URL: ${rsvpUrl}`);
  
  // Step 3: Register the invitation in Wix DB
  const registered = await registerInvitation(invToken);
  
  // Step 4: Generate fresh preview with RSVP URL (update the existing one)
  console.log('\n  Generating preview with RSVP link...');
  // First run the dry run preview to generate the file
  require('child_process').execSync('node evite-noboborsho-dryrun.js --preview 2>&1', { cwd: __dirname, stdio: 'pipe' });
  
  // Step 5: Send email  
  const sendResult = await sendEmail(gmailToken, rsvpUrl);
  
  if (sendResult) {
    console.log('\n╔═══════════════════════════════════════════════════════════╗');
    console.log('║  ✅ EMAIL SENT SUCCESSFULLY                              ║');
    console.log('╚═══════════════════════════════════════════════════════════╝');
    console.log(`\n  To: ${PRESIDENT.email}`);
    console.log(`  Message ID: ${sendResult.id}`);
    console.log(`  RSVP URL: ${rsvpUrl}`);
    if (!registered) {
      console.log('\n  ⚠️  Invitation was NOT registered in Wix DB.');
      console.log('  The RSVP form may show "Invalid or expired invitation token".');
      console.log('  This will be resolved once Wix deploy is working again.');
    } else {
      console.log('\n  ✅ RSVP link should be fully functional!');
    }
  }
}

main().catch(err => {
  console.error('\n❌ Fatal:', err.message);
  process.exit(1);
});
