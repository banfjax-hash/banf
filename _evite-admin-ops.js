#!/usr/bin/env node
/**
 * BANF Evite — Admin Operations
 * 
 * Local script for operations that can't go through the Wix backend
 * (Wix CLI deploy is blocked by server-side infrastructure issue).
 *
 * Commands:
 *   node _evite-admin-ops.js save-config [configFile]  - Save eviteConfig to Wix DB
 *   node _evite-admin-ops.js send-test                 - Send dry-run to president
 *   node _evite-admin-ops.js send-ec                   - Send to all EC members
 *   node _evite-admin-ops.js send-custom <emailsFile>  - Send to custom list
 *   node _evite-admin-ops.js show-config               - Show current event config
 *   node _evite-admin-ops.js update-image <imageUrl>   - Update banner image URL
 */
const https = require('https');
const fs = require('fs');
const path = require('path');

const secrets = require('./.banf-secrets.json');
const EVENT_ID = '61849b36-68e5-41fc-885d-998feafc21f2';
const RSVP_FORM_URL = 'https://banfjax-hash.github.io/banf/rsvp-v2.html';
const WIX_META_SITE_ID = '6a4f0362-0394-4e28-8559-f6145dd414e0';
const WIX_SITE_ID = '7c1629de-1358-490b-b768-f99fae428170';
const API_BASE = 'https://www.jaxbengali.org/_functions';

const PRESIDENT = { name: 'Ranadhir Ghosh', email: 'ranadhir.ghosh@gmail.com', role: 'president' };
const EC_MEMBERS = [
  { name: 'Ranadhir Ghosh', email: 'ranadhir.ghosh@gmail.com', role: 'president' }
];

// ── Helpers ──
function httpsRequest(options, body) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const opts = { ...options, headers: { ...options.headers, ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}) } };
    const req = https.request(opts, res => {
      let d = '';
      res.on('data', chunk => d += chunk);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(d) }); }
        catch (e) { resolve({ status: res.statusCode, data: d }); }
      });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

function httpsGet(url) {
  return new Promise((resolve, reject) => {
    https.get(url, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        try { resolve(JSON.parse(d)); } catch (e) { resolve(d); }
      });
    }).on('error', reject);
  });
}

function getWixAuth() {
  const authFile = `C:/Users/moumi/.wix/auth/${WIX_META_SITE_ID}.json`;
  if (!fs.existsSync(authFile)) throw new Error('Wix auth not found. Run: npx wix login');
  return JSON.parse(fs.readFileSync(authFile, 'utf8'));
}

async function getGmailAccessToken() {
  const body = `client_id=${encodeURIComponent(secrets.CLIENT_ID)}&client_secret=${encodeURIComponent(secrets.CLIENT_SECRET)}&refresh_token=${encodeURIComponent(secrets.REFRESH_TOKEN)}&grant_type=refresh_token`;
  
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'oauth2.googleapis.com', path: '/token', method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Content-Length': Buffer.byteLength(body) }
    }, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        const data = JSON.parse(d);
        if (data.access_token) resolve(data.access_token);
        else reject(new Error('Gmail token failed: ' + JSON.stringify(data)));
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

function generateToken(length = 32) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  const bytes = require('crypto').randomBytes(length);
  for (let i = 0; i < length; i++) token += chars[bytes[i] % chars.length];
  return token;
}

// ── Wix Data REST API operations ──
async function wixDataUpdate(collectionId, itemId, data) {
  const auth = getWixAuth();
  return httpsRequest({
    hostname: 'www.wixapis.com',
    path: '/wix-data/v2/items/' + encodeURIComponent(itemId),
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': auth.accessToken,
      'wix-site-id': WIX_SITE_ID
    }
  }, {
    dataCollectionId: collectionId,
    dataItem: { _id: itemId, data }
  });
}

async function wixDataGet(collectionId, itemId) {
  const auth = getWixAuth();
  return httpsRequest({
    hostname: 'www.wixapis.com',
    path: `/wix-data/v2/items/${encodeURIComponent(itemId)}?dataCollectionId=${encodeURIComponent(collectionId)}`,
    method: 'GET',
    headers: {
      'Authorization': auth.accessToken,
      'wix-site-id': WIX_SITE_ID
    }
  });
}

async function wixDataInsert(collectionId, data) {
  const auth = getWixAuth();
  return httpsRequest({
    hostname: 'www.wixapis.com',
    path: '/wix-data/v2/items',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': auth.accessToken,
      'wix-site-id': WIX_SITE_ID
    }
  }, { dataCollectionId: collectionId, dataItem: { data } });
}

// ── Commands ──

async function showConfig() {
  console.log('\n  Fetching event config from Wix...');
  const events = await httpsGet(API_BASE + '/evite_events');
  const ev = (events.events || []).find(e => e._id === EVENT_ID);
  if (!ev) { console.log('  ❌ Event not found'); return; }
  
  console.log('\n  Event: ' + ev.eventName);
  console.log('  Date: ' + ev.eventDate);
  console.log('  Venue: ' + (ev.venue || '—'));
  
  if (ev.eviteConfig) {
    const cfg = typeof ev.eviteConfig === 'string' ? JSON.parse(ev.eviteConfig) : ev.eviteConfig;
    console.log('\n  --- eviteConfig ---');
    console.log(JSON.stringify(cfg, null, 2));
  } else {
    console.log('\n  ⚠️  No eviteConfig stored for this event');
  }
}

async function saveConfig(configFile) {
  let config;
  if (configFile && fs.existsSync(configFile)) {
    config = JSON.parse(fs.readFileSync(configFile, 'utf8'));
    console.log('\n  Read config from: ' + configFile);
  } else {
    console.log('\n  ❌ Config file not found: ' + (configFile || 'none'));
    console.log('  Usage: node _evite-admin-ops.js save-config <path-to-config.json>');
    console.log('  Tip: Use the admin portal "Export Config" button to generate the JSON.');
    return;
  }
  
  console.log('  Updating event config in Wix DB...');
  
  // Get current event data first
  const result = await wixDataGet('EviteEvents', EVENT_ID);
  if (result.status !== 200) {
    console.log('  ❌ Failed to read event:', result.status, typeof result.data === 'string' ? result.data.substring(0, 200) : JSON.stringify(result.data).substring(0, 200));
    return;
  }
  
  const currentData = result.data.dataItem?.data || {};
  const updatedData = {
    ...currentData,
    eviteConfig: JSON.stringify(config)
  };
  
  // Apply top-level fields from config.event
  if (config.event) {
    if (config.event.eventName) updatedData.eventName = config.event.eventName;
    if (config.event.eventDate) updatedData.eventDate = new Date(config.event.eventDate).toISOString();
    if (config.event.eventTime) updatedData.eventTime = config.event.eventTime;
    if (config.event.venue) updatedData.venue = config.event.venue;
    if (config.event.description) updatedData.description = config.event.description;
    if (config.event.highlights) updatedData.highlights = config.event.highlights;
    if (config.event.capacity) updatedData.capacity = config.event.capacity;
    if (config.event.rsvpDeadline) updatedData.rsvpDeadline = config.event.rsvpDeadline;
  }
  
  const updateResult = await wixDataUpdate('EviteEvents', EVENT_ID, updatedData);
  if (updateResult.status === 200 || updateResult.status === 201) {
    console.log('  ✅ Event config updated successfully!');
    // Also update the static config file for GitHub Pages RSVP form
    const staticPath = path.join(__dirname, 'docs', 'evite-config.json');
    fs.writeFileSync(staticPath, JSON.stringify(config, null, 2));
    console.log('  ✅ Updated docs/evite-config.json — remember to git push!');
  } else {
    console.log('  ❌ Update failed:', updateResult.status, typeof updateResult.data === 'string' ? updateResult.data.substring(0, 300) : JSON.stringify(updateResult.data).substring(0, 300));
  }
}

async function updateImage(imageUrl) {
  if (!imageUrl) {
    console.log('\n  Usage: node _evite-admin-ops.js update-image <imageUrl>');
    return;
  }
  
  console.log('\n  Updating banner image...');
  const events = await httpsGet(API_BASE + '/evite_events');
  const ev = (events.events || []).find(e => e._id === EVENT_ID);
  if (!ev) { console.log('  ❌ Event not found'); return; }
  
  let config = {};
  if (ev.eviteConfig) {
    config = typeof ev.eviteConfig === 'string' ? JSON.parse(ev.eviteConfig) : ev.eviteConfig;
  }
  config.design = config.design || {};
  config.design.imageUrl = imageUrl;
  
  await saveConfigDirect(config);
}

async function saveConfigDirect(config) {
  const result = await wixDataGet('EviteEvents', EVENT_ID);
  if (result.status !== 200) {
    console.log('  ❌ Failed to read event:', result.status);
    return;
  }
  const currentData = result.data.dataItem?.data || {};
  currentData.eviteConfig = JSON.stringify(config);
  
  const updateResult = await wixDataUpdate('EviteEvents', EVENT_ID, currentData);
  if (updateResult.status === 200 || updateResult.status === 201) {
    console.log('  ✅ Config updated!');
  } else {
    console.log('  ❌ Update failed:', updateResult.status);
  }
}

// ── Send invitation emails ──
async function sendInvitations(recipients) {
  console.log('\n  Getting Gmail access token...');
  const accessToken = await getGmailAccessToken();
  console.log('  ✅ Gmail access token obtained\n');
  
  // Load event data
  const events = await httpsGet(API_BASE + '/evite_events');
  const event = (events.events || []).find(e => e._id === EVENT_ID);
  if (!event) { console.log('  ❌ Event not found'); return; }
  
  let eviteConfig = null;
  if (event.eviteConfig) {
    eviteConfig = typeof event.eviteConfig === 'string' ? JSON.parse(event.eviteConfig) : event.eviteConfig;
  }
  
  // Load email template
  const templatePath = path.join(__dirname, 'evite-noboborsho-preview.html');
  if (!fs.existsSync(templatePath)) {
    console.log('  ❌ Email template not found: evite-noboborsho-preview.html');
    return;
  }
  const template = fs.readFileSync(templatePath, 'utf8');
  
  const results = { sent: 0, failed: 0, details: [] };
  
  for (const recip of recipients) {
    try {
      const token = generateToken();
      const rsvpUrl = `${RSVP_FORM_URL}?token=${token}&eventId=${EVENT_ID}`;
      
      // Generate email HTML
      let html = template
        .replace(/href="#"/g, `href="${rsvpUrl}"`)
        .replace(/\{recipientName\}/g, recip.name)
        .replace(/Dear Member/g, `Dear ${recip.name}`);
      
      // Register invitation in Wix DB
      await wixDataInsert('EviteInvitations', {
        eventId: EVENT_ID,
        eventName: event.eventName,
        token,
        recipientName: recip.name,
        recipientEmail: recip.email.toLowerCase(),
        recipientRole: recip.role || '',
        sentAt: new Date().toISOString(),
        emailSent: true,
        gmailMessageId: '',
        opened: false,
        responded: false,
        rsvpStatus: null,
        adults: 0, kids: 0, dietary: '', notes: '',
        respondedAt: null
      });
      
      // Send email
      const safeEventName = (event.eventName || 'BANF Noboborsho 2026')
        .replace(/[^\x20-\x7E]/g, '').replace(/\s{2,}/g, ' ').trim();
      const subject = "You're Invited: " + safeEventName;
      
      const emailBody = [
        `To: ${recip.name} <${recip.email}>`,
        `From: BANF <banfjax@gmail.com>`,
        `Subject: ${subject}`,
        'MIME-Version: 1.0',
        'Content-Type: text/html; charset=UTF-8',
        '',
        html
      ].join('\r\n');
      
      const encoded = Buffer.from(emailBody).toString('base64url');
      
      const sendResult = await httpsRequest({
        hostname: 'gmail.googleapis.com',
        path: '/gmail/v1/users/me/messages/send',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        }
      }, { raw: encoded });
      
      const ok = sendResult.status === 200;
      results.details.push({ name: recip.name, email: recip.email, sent: ok, messageId: sendResult.data?.id });
      if (ok) {
        results.sent++;
        console.log(`  ✅ Sent to ${recip.name} <${recip.email}>`);
      } else {
        results.failed++;
        console.log(`  ❌ Failed: ${recip.email} — ${JSON.stringify(sendResult.data).substring(0, 150)}`);
      }
    } catch (e) {
      results.failed++;
      results.details.push({ name: recip.name, email: recip.email, sent: false, error: e.message });
      console.log(`  ❌ Error: ${recip.email} — ${e.message}`);
    }
  }
  
  console.log(`\n  ═══════════════════════════════════════`);
  console.log(`  Results: ${results.sent} sent, ${results.failed} failed, ${recipients.length} total`);
  console.log(`  ═══════════════════════════════════════\n`);
}

async function loadECMembers() {
  console.log('  Loading EC members from Wix DB...');
  try {
    const auth = getWixAuth();
    const result = await httpsRequest({
      hostname: 'www.wixapis.com',
      path: '/wix-data/v2/items/query',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': auth.accessToken,
        'wix-site-id': WIX_SITE_ID
      }
    }, {
      dataCollectionId: 'AdminRoles',
      query: { filter: {}, paging: { limit: 50 } }
    });
    
    if (result.data?.dataItems?.length > 0) {
      const members = result.data.dataItems
        .filter(i => i.data.email && i.data.email !== 'banfjax@gmail.com')
        .map(i => ({
          name: i.data.name || i.data.firstName || i.data.email.split('@')[0],
          email: i.data.email,
          role: i.data.role || i.data.ecTitle || 'ec_member'
        }));
      if (members.length > 0) {
        // Ensure president is included
        if (!members.some(m => m.email.toLowerCase() === 'ranadhir.ghosh@gmail.com')) {
          members.push(PRESIDENT);
        }
        console.log(`  Found ${members.length} EC members`);
        return members;
      }
    }
  } catch (e) {
    console.log('  ⚠️  Wix Data API error:', e.message);
  }
  console.log('  ⚠️  Falling back to president only');
  return [PRESIDENT];
}

// ── Main ──
async function main() {
  const [cmd, ...args] = process.argv.slice(2);
  
  console.log('╔═══════════════════════════════════════════════════════╗');
  console.log('║  BANF Evite — Admin Operations                      ║');
  console.log('╚═══════════════════════════════════════════════════════╝');
  
  switch (cmd) {
    case 'show-config':
      await showConfig();
      break;
      
    case 'save-config':
      await saveConfig(args[0]);
      break;
      
    case 'update-image':
      await updateImage(args[0]);
      break;
      
    case 'send-test':
      console.log('\n  Sending dry-run to president...');
      await sendInvitations([PRESIDENT]);
      break;
      
    case 'send-ec':
      console.log('\n  Sending to EC members...');
      const ecMembers = await loadECMembers();
      console.log(`  Found ${ecMembers.length} EC members`);
      await sendInvitations(ecMembers);
      break;
      
    case 'send-custom': {
      const emailsFile = args[0];
      if (!emailsFile || !fs.existsSync(emailsFile)) {
        console.log('\n  Usage: node _evite-admin-ops.js send-custom <emails.txt>');
        console.log('  File format: one per line — Name <email@example.com>');
        break;
      }
      const lines = fs.readFileSync(emailsFile, 'utf8').split('\n').filter(l => l.trim());
      const recipients = lines.map(line => {
        const m = line.match(/^(.+?)\s*<(.+?)>$/);
        if (m) return { name: m[1].trim(), email: m[2].trim() };
        return { name: line.trim().split('@')[0], email: line.trim() };
      }).filter(e => e.email.includes('@'));
      console.log(`\n  Sending to ${recipients.length} custom recipients...`);
      await sendInvitations(recipients);
      break;
    }
      
    default:
      console.log('\n  Commands:');
      console.log('    show-config               Show current event config from Wix DB');
      console.log('    save-config <file.json>    Save eviteConfig to Wix DB');
      console.log('    update-image <url>         Update banner image URL');
      console.log('    send-test                  Send dry-run to president');
      console.log('    send-ec                    Send to all EC members');
      console.log('    send-custom <emails.txt>   Send to custom email list');
      console.log('');
  }
}

main().catch(e => console.error('Error:', e.message));
