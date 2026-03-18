#!/usr/bin/env node
/**
 * ═══════════════════════════════════════════════════════════════
 *  BANF E-Vite Noboborsho 2026 — Dry Run Test
 * ═══════════════════════════════════════════════════════════════
 *
 *  End-to-end test of the enhanced evite system with cultural section.
 *
 *  Usage:
 *    node evite-noboborsho-dryrun.js                   Full dry run (president only)
 *    node evite-noboborsho-dryrun.js --create-only     Just create event, don't send
 *    node evite-noboborsho-dryrun.js --send-only       Send to existing event (needs --eventId)
 *    node evite-noboborsho-dryrun.js --test-rsvp       Simulate RSVP submission (needs --token)
 *    node evite-noboborsho-dryrun.js --status          Check status (needs --eventId)
 *    node evite-noboborsho-dryrun.js --preview         Generate email HTML locally & open
 *    node evite-noboborsho-dryrun.js --direct-send     Send email directly via local Gmail token
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'banfwix.wixsite.com';
const BASE_PATH = '/banf1/_functions';

// Alternate domain (freshly deployed code)
const ALT_URL = 'www.jaxbengali.org';
const ALT_PATH = '/_functions';
const PRESIDENT = { name: 'Ranadhir Ghosh', email: 'ranadhir.ghosh@gmail.com', role: 'president' };

// ── Noboborsho Event Config ──
const NOBOBORSHO_EVENT = {
  eventName: 'BANF Noboborsho 2026 — পহেলা বৈশাখ ১৪৩৩',
  eventDate: '2026-04-18T16:00:00.000Z',
  eventTime: '4:00 PM - 9:00 PM',
  venue: 'Hallowed Cove Academy, St. Johns, FL',
  description: 'Join us to celebrate Pohela Boishakh — the Bengali New Year — with an evening of culture, music, dance, delicious food and togetherness. শুভ নববর্ষ!',
  highlights: 'Traditional alpona, cultural performances by our members and their families, authentic Bengali cuisine, kids activities, and Rabindra-Nazrul sangeet performances.',
  keywords: ['noboborsho', 'pohela boishakh', 'noboborsho 2026', 'bengali new year'],
  capacity: 200,
  notes: 'Created via Noboborsho dry-run test'
};

// ── Full eviteConfig (matches what EC Admin UI sends) ──
const EVITE_CONFIG = {
  event: {
    eventName: NOBOBORSHO_EVENT.eventName,
    eventDate: '2026-04-18',
    eventTime: '4:00 PM - 9:00 PM',
    venue: NOBOBORSHO_EVENT.venue,
    description: NOBOBORSHO_EVENT.description,
    highlights: NOBOBORSHO_EVENT.highlights,
    capacity: 200,
    rsvpDeadline: '2026-04-15'
  },
  design: {
    introText: 'প্রিয় বন্ধুরা, নববর্ষের শুভেচ্ছা! We warmly invite you and your family to celebrate Pohela Boishakh with the BANF family. Let us come together to welcome the New Year with joy, culture and community spirit.',
    imageUrl: ''  // Add Noboborsho banner URL when available
  },
  rsvp: {
    collectGuests: true,
    collectFood: true,
    collectAllergy: true,
    allowMaybe: true
  },
  cultural: {
    enabled: true,
    header: '🎭 Cultural Program — Participate & Showcase Your Talent!',
    description: 'We are excited to feature cultural performances by our community members at this year\'s Noboborsho celebration! If you or your family members would like to participate, please fill in the details below.',
    categories: ['dance', 'song', 'instrumental', 'skit', 'poetry'],
    modes: ['individual', 'group'],
    ageGroups: ['kid', 'youth', 'adult', 'senior', 'mix'],
    askLanguage: true,
    askDescription: true,
    notes: [
      'If you are a participant, please ask your mentor to apply. Only mentors, individual performers, and parents (on behalf of their kids) should apply.',
      'No EC member can apply as a mentor or individual performer — EC members can only perform in a group managed by a mentor. However, EC members can apply as a parent for their kids.',
      'We will try our best to accommodate every request. If demand exceeds the allotted cultural time, priority will be given to: items aligned with the nature of the program (e.g., Bengali-language performances for Noboborsho), diversity of genre and mode of delivery, and representation by various age groups of our members.'
    ]
  },
  recipients: {
    type: 'test',
    customEmails: []
  }
};

// ── CLI helpers ──
function getArg(name) {
  const arg = process.argv.find(a => a.startsWith(`--${name}=`));
  return arg ? arg.split('=').slice(1).join('=') : null;
}
function hasFlag(name) { return process.argv.includes(`--${name}`); }

// ── HTTPS request helper ──
function apiRequest(method, endpoint, body, useAlt) {
  return new Promise((resolve, reject) => {
    const bodyStr = body ? JSON.stringify(body) : null;
    const options = {
      hostname: useAlt ? ALT_URL : BASE_URL,
      path: `${useAlt ? ALT_PATH : BASE_PATH}/${endpoint}`,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(bodyStr ? { 'Content-Length': Buffer.byteLength(bodyStr) } : {})
      }
    };

    const req = https.request(options, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(new Error(`Invalid JSON response: ${data.substring(0, 200)}`)); }
      });
    });
    req.on('error', reject);
    if (bodyStr) req.write(bodyStr);
    req.end();
  });
}

// ── Step 1: Create Event ──
async function createEvent() {
  console.log('\n╔═══════════════════════════════════════════════╗');
  console.log('║  Step 1: Create Noboborsho Event              ║');
  console.log('╚═══════════════════════════════════════════════╝\n');

  const payload = {
    ...NOBOBORSHO_EVENT,
    eviteConfig: EVITE_CONFIG
  };

  console.log('  Event:', payload.eventName);
  console.log('  Date:', payload.eventDate);
  console.log('  Venue:', payload.venue);
  console.log('  Cultural:', EVITE_CONFIG.cultural.enabled ? 'ENABLED' : 'disabled');
  console.log('  Categories:', EVITE_CONFIG.cultural.categories.join(', '));
  console.log('');

  const result = await apiRequest('POST', 'evite_create_event', payload);
  if (result.success) {
    console.log(`  ✅ Event registered: ${result.eventId}`);
    console.log(`  ${result.existing ? '(Already existed)' : '(Newly created)'}`);
    return result.eventId;
  } else {
    console.error(`  ❌ Failed: ${result.error}`);
    return null;
  }
}

// ── Step 2: Send Invite (President only) ──
async function sendInvite(eventId) {
  console.log('\n╔═══════════════════════════════════════════════╗');
  console.log('║  Step 2: Send Invite (President Dry Run)      ║');
  console.log('╚═══════════════════════════════════════════════╝\n');

  console.log(`  Event ID: ${eventId}`);
  console.log(`  To: ${PRESIDENT.name} <${PRESIDENT.email}>`);
  console.log('');

  const payload = {
    eventId,
    recipientType: 'custom',
    customEmails: [PRESIDENT],
    eviteConfig: EVITE_CONFIG
  };

  const result = await apiRequest('POST', 'evite_send_invites', payload);
  if (result.success) {
    console.log(`  ✅ Sent: ${result.sent}/${result.total}`);
    if (result.details) {
      result.details.forEach(d => {
        const icon = d.sent ? '✅' : '❌';
        console.log(`     ${icon} ${d.name} <${d.email}>${d.error ? ' — ' + d.error : ''}`);
      });
    }
    return result;
  } else {
    console.error(`  ❌ Failed: ${result.error}`);
    return null;
  }
}

// ── Step 3: Check Status ──
async function checkStatus(eventId) {
  console.log('\n╔═══════════════════════════════════════════════╗');
  console.log('║  Step 3: Check Invitation Status              ║');
  console.log('╚═══════════════════════════════════════════════╝\n');

  const result = await apiRequest('GET', `evite_invite_status?eventId=${eventId}`);
  if (result.success) {
    const s = result.summary;
    console.log(`  Total Invites: ${s.total}`);
    console.log(`  Sent: ${s.sent} | Opened: ${s.opened} | Responded: ${s.responded}`);
    console.log(`  Attending: ${s.attending} | Declined: ${s.declined} | Maybe: ${s.maybe}`);
    console.log(`  Headcount: ${s.totalAdults} adults + ${s.totalKids} kids`);
    console.log('');
    (result.invitations || []).forEach(inv => {
      const status = inv.responded
        ? `RSVP: ${inv.rsvpStatus.toUpperCase()} (${inv.adults}A+${inv.kids}K)`
        : inv.opened ? 'Opened (no response)' : 'Sent (not opened)';
      console.log(`    ${inv.recipientName} <${inv.recipientEmail}> — ${status}`);
    });
  } else {
    console.error(`  ❌ Failed: ${result.error}`);
  }
  return result;
}

// ── Step 4: Simulate RSVP submission ──
async function testRsvpSubmission(token) {
  console.log('\n╔═══════════════════════════════════════════════╗');
  console.log('║  Step 4: Simulate RSVP with Cultural Data     ║');
  console.log('╚═══════════════════════════════════════════════╝\n');

  const payload = {
    token,
    rsvpStatus: 'yes',
    adults: 3,
    kids: 2,
    vegCount: 1,
    nonVegCount: 4,
    dietary: 'mixed',
    notes: 'One child has peanut allergy. Need 1 Jain meal (no onion/garlic).',
    cultural: {
      participate: true,
      performances: [
        {
          category: 'song',
          mode: 'individual',
          ageGroup: 'adult',
          language: 'rabindra_sangeet',
          description: 'Rabindra Sangeet — "Purano Sei Diner Kotha" (solo vocal)',
          memberCount: 1,
          memberNames: []
        },
        {
          category: 'dance',
          mode: 'group',
          ageGroup: 'kid',
          language: 'bengali',
          description: 'Bengali folk dance — "Dhitang Dhitang Bole" by 3 kids',
          memberCount: 3,
          memberNames: ['Ria Ghosh', 'Ayan Ghosh', 'Ananya Das']
        }
      ]
    }
  };

  console.log('  Token:', token);
  console.log('  Status: yes | Adults: 3 | Kids: 2');
  console.log('  Food: 1 veg + 4 non-veg');
  console.log('  Cultural: 2 performances');
  console.log('    1) Song / Individual / Adult — Rabindra Sangeet');
  console.log('    2) Dance / Group / Kid — Bengali folk dance (3 kids)');
  console.log('');

  const result = await apiRequest('POST', 'evite_rsvp_submit', payload);
  if (result.success) {
    console.log(`  ✅ ${result.message}`);
    console.log(`  Status: ${result.rsvpStatus}`);
    console.log(`  Responded at: ${result.respondedAt}`);
  } else {
    console.error(`  ❌ Failed: ${result.error}`);
  }
  return result;
}

// ── Preview: Generate email HTML locally ──
function generatePreview() {
  console.log('\n╔═══════════════════════════════════════════════╗');
  console.log('║  Email Preview — Local HTML Generation        ║');
  console.log('╚═══════════════════════════════════════════════╝\n');

  const cfg = EVITE_CONFIG;
  const evt = cfg.event;
  const design = cfg.design || {};
  const cultural = cfg.cultural || {};
  const rsvpCfg = cfg.rsvp || {};

  const dateStr = evt.eventDate
    ? new Date(evt.eventDate + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
    : 'TBD';

  function esc(s) { return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

  // Ask items
  let askItems = '';
  if (rsvpCfg.collectGuests) askItems += '<tr><td style="padding:3px 10px 3px 0">•</td><td>Number of <strong>adults</strong> and <strong>kids</strong></td></tr>';
  if (rsvpCfg.collectFood) askItems += '<tr><td style="padding:3px 10px 3px 0">•</td><td><strong>Vegetarian</strong> vs <strong>non-vegetarian</strong> preference</td></tr>';
  if (rsvpCfg.collectAllergy) askItems += '<tr><td style="padding:3px 10px 3px 0">•</td><td>Any <strong>allergies or dietary restrictions</strong></td></tr>';
  if (cultural.enabled) askItems += '<tr><td style="padding:3px 10px 3px 0">•</td><td>Interest in <strong>cultural program participation</strong></td></tr>';

  // Cultural section
  const catLabels = { dance: '💃 Dance', song: '🎤 Song', instrumental: '🎸 Instrumental', skit: '🎬 Skit / Drama', poetry: '📝 Poetry / Recitation' };
  const modeLabels = { individual: '🧑 Individual', group: '👥 Group' };
  const ageLabels = { kid: '👶 Kid (under 12)', youth: '🧑‍🎤 Youth (12-17)', adult: '🧑‍💼 Adult (18-59)', senior: '👴 Senior (60+)', mix: '🌈 Mix' };

  let culturalHtml = '';
  if (cultural.enabled) {
    const catChips = (cultural.categories || []).map(c =>
      `<span style="display:inline-block;padding:3px 10px;border-radius:10px;font-size:12px;background:#fce4ec;color:#c0392b;margin:2px">${catLabels[c]||c}</span>`
    ).join(' ');
    const modeChips = (cultural.modes || []).map(m =>
      `<span style="display:inline-block;padding:3px 10px;border-radius:10px;font-size:12px;background:#e8eaf6;color:#3f51b5;margin:2px">${modeLabels[m]||m}</span>`
    ).join(' ');
    const ageChips = (cultural.ageGroups || []).map(a =>
      `<span style="display:inline-block;padding:3px 10px;border-radius:10px;font-size:12px;background:#e0f2f1;color:#00695c;margin:2px">${ageLabels[a]||a}</span>`
    ).join(' ');
    let notesHtml = '';
    (cultural.notes || []).forEach(n => {
      notesHtml += `<div style="padding:4px 0;font-size:12px;color:#666">📌 ${esc(n)}</div>`;
    });
    culturalHtml = `
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f7ff;border-radius:12px;border-left:4px solid #3498db;margin:20px 0">
    <tr><td style="padding:20px 24px">
      <div style="font-size:16px;font-weight:700;color:#1a5276;margin-bottom:8px">${esc(cultural.header)}</div>
      <div style="font-size:14px;color:#555;line-height:1.6;margin-bottom:12px">${esc(cultural.description)}</div>
      <div style="margin-bottom:8px"><strong style="font-size:12px;color:#555">Categories:</strong><br>${catChips}</div>
      <div style="margin-bottom:8px"><strong style="font-size:12px;color:#555">Mode:</strong><br>${modeChips}</div>
      <div style="margin-bottom:8px"><strong style="font-size:12px;color:#555">Age Groups:</strong><br>${ageChips}</div>
      ${notesHtml ? '<div style="margin-top:12px;padding-top:12px;border-top:1px dashed #b3d4fc">' + notesHtml + '</div>' : ''}
    </td></tr></table>`;
  }

  const imageHtml = design.imageUrl
    ? `<img src="${esc(design.imageUrl)}" alt="${esc(evt.eventName)}" style="width:100%;max-width:560px;border-radius:12px;margin:0 0 20px;display:block" />`
    : '';

  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${evt.eventName} - Email Preview</title>
<style>body{background:#f4f0ed;padding:20px;font-family:'Segoe UI',sans-serif;display:flex;justify-content:center}
.badge{position:fixed;top:10px;left:10px;background:#FF6B35;color:#fff;padding:8px 16px;border-radius:20px;font-size:12px;font-weight:700;z-index:100}
</style></head>
<body>
<div class="badge">📧 EMAIL PREVIEW — DRY RUN</div>
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.08);margin-top:40px">
<tr><td style="background:linear-gradient(135deg,#8B0000,#DC143C);padding:32px 40px;text-align:center">
  <div style="font-size:14px;color:rgba(255,255,255,.8);letter-spacing:1px;text-transform:uppercase;margin-bottom:8px">You're Invited!</div>
  <div style="font-size:26px;font-weight:700;color:#fff;line-height:1.3">${esc(evt.eventName)}</div>
  <div style="font-size:13px;color:rgba(255,255,255,.7);margin-top:8px">Bengali Association of North Florida</div>
</td></tr>
<tr><td style="padding:32px 40px">
  <p style="font-size:16px;color:#333;margin:0 0 20px">Dear <strong>${PRESIDENT.name}</strong>,</p>
  ${design.introText ? `<p style="font-size:15px;color:#555;margin:0 0 24px;line-height:1.6">${esc(design.introText)}</p>` : ''}
  ${imageHtml}
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#fdf6f0;border-radius:12px;border-left:4px solid #FF6B35;margin-bottom:24px">
  <tr><td style="padding:20px 24px">
    <div style="font-size:13px;color:#888;text-transform:uppercase;letter-spacing:.5px;margin-bottom:12px">Event Details</div>
    <table cellpadding="0" cellspacing="0" style="font-size:14px;color:#333">
      <tr><td style="padding:4px 16px 4px 0;font-weight:600;color:#8B0000">📅 Date</td><td>${dateStr}</td></tr>
      <tr><td style="padding:4px 16px 4px 0;font-weight:600;color:#8B0000">🕐 Time</td><td>${esc(evt.eventTime)}</td></tr>
      <tr><td style="padding:4px 16px 4px 0;font-weight:600;color:#8B0000">📍 Venue</td><td>${esc(evt.venue)}</td></tr>
    </table>
    <div style="margin-top:12px;font-size:14px;color:#555;line-height:1.5">${esc(evt.description)}</div>
  </td></tr></table>
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f7ff;border-radius:12px;border-left:4px solid #3498db;margin-bottom:24px">
  <tr><td style="padding:16px 20px">
    <div style="font-size:13px;color:#2c3e50;font-weight:600;margin-bottom:8px">When you RSVP, we will ask for:</div>
    <table cellpadding="0" cellspacing="0" style="font-size:13px;color:#555">${askItems}</table>
  </td></tr></table>
  <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:12px 0 24px">
    <a href="#" style="display:inline-block;background:linear-gradient(135deg,#8B0000,#DC143C);color:#fff;font-size:16px;font-weight:700;text-decoration:none;padding:14px 40px;border-radius:30px;letter-spacing:.5px;box-shadow:0 4px 16px rgba(139,0,0,.3)">
      RSVP Now
    </a>
  </td></tr></table>
  ${culturalHtml}
  <div style="background:#f9f7f5;border-radius:12px;padding:16px 20px;margin-top:20px">
    <div style="font-size:13px;color:#8B0000;font-weight:600;margin-bottom:8px">What to Expect</div>
    <div style="font-size:14px;color:#555;line-height:1.6">${esc(evt.highlights)}</div>
  </div>
  <div style="background:#fff8f0;border-radius:12px;padding:14px 18px;margin-top:16px;border:1px solid #f0dcc8">
    <div style="font-size:12px;color:#8B6914;line-height:1.6"><strong>A Note on Special Dietary Requests:</strong> We may not always be able to accommodate every special food request. Our team will try our very best. Thank you for your understanding!</div>
  </div>
</td></tr>
<tr><td style="background:#f9f7f5;padding:24px 40px;text-align:center;border-top:1px solid #eee">
  <div style="font-size:12px;color:#999;line-height:1.6">Bengali Association of North Florida<br>Jacksonville, Florida<br><a href="mailto:banfjax@gmail.com" style="color:#8B0000;text-decoration:none">banfjax@gmail.com</a></div>
</td></tr>
</table>
</body></html>`;

  const outPath = path.join(__dirname, 'evite-noboborsho-preview.html');
  fs.writeFileSync(outPath, html, 'utf8');
  console.log(`  ✅ Email preview saved to: ${outPath}`);
  console.log('  Open it in your browser to verify the layout.');
  return outPath;
}

// ── Direct Send: Use local Gmail token to send invite (bypasses Wix) ──
async function directSend() {
  console.log('\n╔═══════════════════════════════════════════════╗');
  console.log('║  Direct Send via Local Gmail Token             ║');
  console.log('╚═══════════════════════════════════════════════╝\n');

  // Load local secrets
  let secrets;
  try {
    secrets = require('./.banf-secrets.json');
  } catch (e) {
    console.error('  ❌ Cannot load .banf-secrets.json:', e.message);
    return;
  }

  // Get access token
  console.log('  Refreshing Gmail access token...');
  const tokenData = await new Promise((resolve, reject) => {
    const postData = `grant_type=refresh_token&refresh_token=${encodeURIComponent(secrets.REFRESH_TOKEN)}&client_id=${encodeURIComponent(secrets.CLIENT_ID)}&client_secret=${encodeURIComponent(secrets.CLIENT_SECRET)}`;
    const req = https.request('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Content-Length': Buffer.byteLength(postData) }
    }, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(JSON.parse(data)));
    });
    req.on('error', reject);
    req.write(postData);
    req.end();
  });

  if (!tokenData.access_token) {
    console.error('  ❌ Token refresh failed:', tokenData.error_description || tokenData.error);
    return;
  }
  console.log('  ✅ Access token obtained');

  // Generate the email HTML (same as preview)
  const previewPath = generatePreview();
  const emailHtml = fs.readFileSync(previewPath, 'utf8');

  // Remove the "DRY RUN" badge from the email
  const cleanHtml = emailHtml.replace(/<div class="badge">.*?<\/div>/s, '');

  // Build RFC 2822 email with MIME
  const boundary = 'boundary_' + Date.now();
  const subject = `You're Invited: ${NOBOBORSHO_EVENT.eventName}`;
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
    `You're invited to ${NOBOBORSHO_EVENT.eventName} on April 18, 2026 at Hallowed Cove Academy.`,
    `This is a dry-run test email. The RSVP link is not active in this direct send.`,
    ``,
    `--${boundary}`,
    `Content-Type: text/html; charset=UTF-8`,
    `Content-Transfer-Encoding: base64`,
    ``,
    Buffer.from(cleanHtml).toString('base64').match(/.{1,76}/g).join('\n'),
    ``,
    `--${boundary}--`
  ].join('\r\n');

  // Send via Gmail API
  console.log(`\n  Sending to: ${PRESIDENT.name} <${PRESIDENT.email}>`);
  const encoded = Buffer.from(rawEmail).toString('base64url');

  const sendResult = await new Promise((resolve, reject) => {
    const body = JSON.stringify({ raw: encoded });
    const req = https.request({
      hostname: 'gmail.googleapis.com',
      path: '/gmail/v1/users/me/messages/send',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body)
      }
    }, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(data) }); }
        catch (e) { resolve({ status: res.statusCode, data }); }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });

  if (sendResult.status === 200 && sendResult.data.id) {
    console.log(`  ✅ Email sent! Message ID: ${sendResult.data.id}`);
    console.log(`  Thread ID: ${sendResult.data.threadId}`);
    console.log(`  Label IDs: ${(sendResult.data.labelIds || []).join(', ')}`);
  } else {
    console.error(`  ❌ Send failed (HTTP ${sendResult.status}):`);
    console.error(`     ${JSON.stringify(sendResult.data).substring(0, 300)}`);
  }

  console.log('\n  Note: This direct send bypasses Wix backend. The RSVP link');
  console.log('  is not functional in this mode. Use --send-only after Wix');
  console.log('  deployment for a full end-to-end test with working RSVP.');
}

// ── Main ──
async function main() {
  console.log('');
  console.log('╔═══════════════════════════════════════════════════════════╗');
  console.log('║   BANF E-Vite — Noboborsho 2026 Dry Run Test          ║');
  console.log('║   পহেলা বৈশাখ ১৪৩৩ — Test Harness                      ║');
  console.log('╚═══════════════════════════════════════════════════════════╝');

  // Preview mode
  if (hasFlag('preview')) {
    generatePreview();
    return;
  }

  // Direct send mode (local Gmail token, bypasses Wix)
  if (hasFlag('direct-send')) {
    await directSend();
    return;
  }

  // Test RSVP submission
  if (hasFlag('test-rsvp')) {
    const token = getArg('token');
    if (!token) {
      console.error('\n  ❌ Missing --token=<invitation_token>');
      console.log('  Get it from the invitation link or from --status output.');
      return;
    }
    await testRsvpSubmission(token);
    return;
  }

  // Status check
  if (hasFlag('status')) {
    const eventId = getArg('eventId');
    if (!eventId) {
      console.error('\n  ❌ Missing --eventId=<id>');
      return;
    }
    await checkStatus(eventId);
    return;
  }

  // Send only
  if (hasFlag('send-only')) {
    const eventId = getArg('eventId');
    if (!eventId) {
      console.error('\n  ❌ Missing --eventId=<id>');
      return;
    }
    await sendInvite(eventId);
    return;
  }

  // Create only
  if (hasFlag('create-only')) {
    const eventId = await createEvent();
    if (eventId) {
      console.log(`\n  ✅ Done. Use --send-only --eventId=${eventId} to send invites.`);
    }
    return;
  }

  // Full dry run: create → send → wait → status
  console.log('\n  Running full dry run: Create → Send → Status\n');

  // Step 1: Generate local preview
  generatePreview();

  // Step 2: Create event via Wix API
  const eventId = await createEvent();
  if (!eventId) {
    console.error('\n  ❌ Aborting: could not create event.');
    return;
  }

  // Step 3: Send invite to president only
  const sendResult = await sendInvite(eventId);
  if (!sendResult) {
    console.log('\n  ⚠️  Wix send failed. Falling back to direct send via local Gmail token...');
    await directSend();
    console.log(`\n  Event ID: ${eventId}`);
    console.log(`  Use --status --eventId=${eventId} to check status after Wix propagation.`);
    return;
  }

  // Step 4: Wait and check status
  console.log('\n  ⏳ Waiting 5 seconds for delivery...\n');
  await new Promise(r => setTimeout(r, 5000));

  await checkStatus(eventId);

  // Summary
  console.log('\n╔═══════════════════════════════════════════════════════════╗');
  console.log('║   DRY RUN COMPLETE                                      ║');
  console.log('╚═══════════════════════════════════════════════════════════╝');
  console.log('');
  console.log('  Next steps:');
  console.log(`  1. Check ${PRESIDENT.email} inbox for the invitation`);
  console.log('  2. Click "RSVP Now" to test the RSVP form');
  console.log('  3. Verify the cultural program section appears');
  console.log('  4. Submit a test RSVP with cultural entries');
  console.log(`  5. Run: node evite-noboborsho-dryrun.js --status --eventId=${eventId}`);
  console.log('');
  console.log('  Files to review:');
  console.log('    - evite-noboborsho-preview.html (email preview)');
  console.log('    - docs/banf-evite-admin.html     (EC admin console)');
  console.log('    - docs/rsvp-v2.html              (RSVP page with cultural)');
  console.log('');
}

main().catch(err => {
  console.error('\n  ❌ Fatal error:', err.message);
  process.exit(1);
});
