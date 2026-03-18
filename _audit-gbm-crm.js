#!/usr/bin/env node
/**
 * Extract GBM recipient emails and cross-reference with CRM
 * Specifically targets "Invitation to Annual GBM 2026" emails
 */
const https = require('https');
const GOOGLE_CLIENT_ID = '1020178199135-3usrl611ara38i7rhu2ub6sn6g1150ml.apps.googleusercontent.com';
const GOOGLE_CLIENT_SECRET = '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';
const GOOGLE_REFRESH_TOKEN = require('./banf-gmail-config').REFRESH_TOKEN;

function httpsRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const opts = { hostname: u.hostname, port: 443, path: u.pathname + u.search, method: options.method || 'GET', headers: options.headers || {}, timeout: 30000 };
    const req = https.request(opts, res => { let d = ''; res.on('data', c => d += c); res.on('end', () => { try { resolve(JSON.parse(d)); } catch { resolve(d); } }); });
    req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
    req.on('error', reject);
    if (options.body) req.write(options.body);
    req.end();
  });
}

async function getToken() {
  const body = `grant_type=refresh_token&refresh_token=${encodeURIComponent(GOOGLE_REFRESH_TOKEN)}&client_id=${encodeURIComponent(GOOGLE_CLIENT_ID)}&client_secret=${encodeURIComponent(GOOGLE_CLIENT_SECRET)}`;
  const r = await httpsRequest('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Content-Length': Buffer.byteLength(body) }, body });
  if (!r.access_token) throw new Error('Token refresh failed');
  return r.access_token;
}

async function searchGmail(query, token) {
  const allIds = [];
  let pageToken = '';
  while (true) {
    const url = `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(query)}&maxResults=100${pageToken ? '&pageToken=' + pageToken : ''}`;
    const r = await httpsRequest(url, { headers: { Authorization: `Bearer ${token}` } });
    (r.messages || []).forEach(m => allIds.push(m.id));
    if (!r.nextPageToken || allIds.length >= 500) break;
    pageToken = r.nextPageToken;
  }
  return allIds;
}

async function getFullMessage(id, token) {
  // Get full message to extract all To/CC/BCC headers
  const url = `https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}?format=full`;
  const r = await httpsRequest(url, { headers: { Authorization: `Bearer ${token}` } });
  const headers = (r.payload && r.payload.headers) || [];
  const getH = name => headers.filter(h => h.name.toLowerCase() === name.toLowerCase()).map(h => h.value).join(', ');
  return { id, to: getH('To'), cc: getH('Cc'), bcc: getH('Bcc'), subject: getH('Subject'), date: getH('Date') };
}

function extractEmailsWithNames(str) {
  if (!str) return [];
  // Match "Name <email>" or just "email"
  const results = [];
  const parts = str.split(/,\s*/);
  for (const part of parts) {
    const match = part.match(/"?([^"<]*)"?\s*<([\w.+-]+@[\w.-]+\.\w+)>/i);
    if (match) {
      results.push({ name: match[1].trim(), email: match[2].toLowerCase() });
    } else {
      const emailMatch = part.match(/([\w.+-]+@[\w.-]+\.\w+)/i);
      if (emailMatch) results.push({ name: '', email: emailMatch[1].toLowerCase() });
    }
  }
  return results;
}

// Query CRM via the admin API
async function queryCRM(token) {
  // Use Wix data API to query CRMMembers collection
  // We'll use the site's admin endpoint instead
  const siteUrl = 'https://www.jaxbengali.org/_functions';
  try {
    const r = await httpsRequest(`${siteUrl}/admin_list_members?limit=500&offset=0`, {
      headers: { 'x-admin-key': 'banf-admin-2024' }
    });
    return r;
  } catch (e) {
    console.log('CRM query via site failed:', e.message);
    return null;
  }
}

async function main() {
  const token = await getToken();
  console.log('✅ Token obtained\n');

  // Get GBM invitation emails specifically
  console.log('🔎 Searching for GBM invitation emails...');
  const gbmIds = await searchGmail('in:sent from:banfjax@gmail.com subject:"Invitation to Annual GBM 2026"', token);
  console.log(`   Found ${gbmIds.length} GBM invitation emails\n`);

  // Also get the GBM link emails 
  const gbmLinkIds = await searchGmail('in:sent from:banfjax@gmail.com subject:"GBM Link" after:2026/02/01', token);
  console.log(`   Found ${gbmLinkIds.length} GBM link emails\n`);

  // Get "Final Presentation Deck" which was also sent to the full list
  const deckIds = await searchGmail('in:sent from:banfjax@gmail.com subject:"Final Presentation Deck" after:2026/03/01', token);
  console.log(`   Found ${deckIds.length} "Final Presentation Deck" emails\n`);

  // Combine all unique IDs
  const allIds = [...new Set([...gbmIds, ...gbmLinkIds, ...deckIds])];
  console.log(`📬 Total unique GBM-related messages: ${allIds.length}\n`);

  // Extract all recipients
  const allRecipients = new Map(); // email -> {names, sources}
  for (let i = 0; i < allIds.length; i++) {
    try {
      const msg = await getFullMessage(allIds[i], token);
      const recipients = [
        ...extractEmailsWithNames(msg.to),
        ...extractEmailsWithNames(msg.cc),
        ...extractEmailsWithNames(msg.bcc)
      ];
      for (const r of recipients) {
        if (r.email === 'banfjax@gmail.com') continue;
        if (!allRecipients.has(r.email)) {
          allRecipients.set(r.email, { names: new Set(), sources: new Set() });
        }
        if (r.name) allRecipients.get(r.email).names.add(r.name);
        allRecipients.get(r.email).sources.add(msg.subject.substring(0, 50));
      }
    } catch (e) {
      console.log(`  ⚠️ Failed: ${e.message}`);
    }
  }

  console.log(`\n=== GBM RECIPIENT LIST (${allRecipients.size} unique emails) ===\n`);
  const sorted = [...allRecipients.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  for (const [email, data] of sorted) {
    const names = [...data.names].join(' / ') || '(no name)';
    console.log(`${email} → ${names}`);
  }

  // Now try to query CRM
  console.log('\n\n=== CRM CROSS-REFERENCE ===\n');
  const crm = await queryCRM(token);
  if (crm && crm.members) {
    console.log(`CRM has ${crm.members.length} members`);
    const crmEmails = new Map();
    for (const m of crm.members) {
      if (m.email) crmEmails.set(m.email.toLowerCase(), m);
      if (m.alternateEmail) crmEmails.set(m.alternateEmail.toLowerCase(), m);
    }

    // Check which GBM recipients are NOT in CRM
    const missing = [];
    const found = [];
    for (const [email] of sorted) {
      if (crmEmails.has(email)) {
        const m = crmEmails.get(email);
        found.push({ email, crmName: m.displayName || `${m.firstName} ${m.lastName}` });
      } else {
        missing.push(email);
      }
    }
    
    console.log(`\n✅ Found in CRM: ${found.length}`);
    console.log(`❌ Missing from CRM: ${missing.length}`);
    if (missing.length > 0) {
      console.log('\nMissing emails:');
      missing.forEach(e => console.log(`  ${e}`));
    }
  } else {
    console.log('Could not query CRM via site API. Will need to check via Wix data.');
    console.log('GBM recipient list has been extracted above for manual cross-reference.');
  }
}

main().catch(e => { console.error('Fatal:', e.message); process.exit(1); });
