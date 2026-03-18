#!/usr/bin/env node
/**
 * Scan Gmail SENT folder for GBM (General Body Meeting) invitation emails
 * that were sent in two slots. Also scan for Noboborsho/event emails.
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

async function searchGmail(query, token, maxResults = 500) {
  const allIds = [];
  let pageToken = '';
  while (true) {
    const url = `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(query)}&maxResults=100${pageToken ? '&pageToken=' + pageToken : ''}`;
    const r = await httpsRequest(url, { headers: { Authorization: `Bearer ${token}` } });
    const msgs = r.messages || [];
    allIds.push(...msgs.map(m => m.id));
    if (!r.nextPageToken || allIds.length >= maxResults) break;
    pageToken = r.nextPageToken;
  }
  return allIds;
}

async function getMessage(id, token) {
  const url = `https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}?format=metadata&metadataHeaders=To&metadataHeaders=Subject&metadataHeaders=Date&metadataHeaders=Cc&metadataHeaders=Bcc`;
  const r = await httpsRequest(url, { headers: { Authorization: `Bearer ${token}` } });
  const headers = (r.payload && r.payload.headers) || [];
  const getH = name => (headers.find(h => h.name.toLowerCase() === name.toLowerCase()) || {}).value || '';
  return { id, to: getH('To'), cc: getH('Cc'), bcc: getH('Bcc'), subject: getH('Subject'), date: getH('Date'), snippet: r.snippet || '' };
}

function extractEmails(str) {
  if (!str) return [];
  return [...str.matchAll(/[\w.+-]+@[\w.-]+\.\w+/gi)].map(m => m[0].toLowerCase());
}

async function main() {
  const token = await getToken();
  console.log('✅ Token obtained\n');

  // Search for GBM / General Body Meeting related sent emails
  const queries = [
    'in:sent from:banfjax@gmail.com subject:"GBM" after:2025/01/01',
    'in:sent from:banfjax@gmail.com subject:"General Body" after:2025/01/01',
    'in:sent from:banfjax@gmail.com subject:"General Meeting" after:2025/01/01',
    'in:sent from:banfjax@gmail.com (GBM OR "general body" OR "general meeting") after:2025/01/01',
    // Also look for event/invitation emails
    'in:sent from:banfjax@gmail.com subject:"invitation" after:2025/01/01',
    'in:sent from:banfjax@gmail.com subject:"Noboborsho" after:2025/01/01',
    'in:sent from:banfjax@gmail.com subject:"Bengali New Year" after:2025/01/01',
    'in:sent from:banfjax@gmail.com subject:"BANF" subject:"event" after:2025/01/01',
    'in:sent from:banfjax@gmail.com subject:"you are invited" after:2025/01/01',
    'in:sent from:banfjax@gmail.com subject:"RSVP" after:2025/01/01',
    // Broader: any mass email from banfjax with many BCC
    'in:sent from:banfjax@gmail.com bcc:me after:2025/06/01',
  ];

  const allMsgIds = new Set();
  for (const q of queries) {
    console.log(`🔎 Query: ${q}`);
    const ids = await searchGmail(q, token, 200);
    console.log(`   → ${ids.length} results`);
    ids.forEach(id => allMsgIds.add(id));
  }

  console.log(`\n📬 Total unique messages: ${allMsgIds.size}\n`);

  // Get details for each message
  const messages = [];
  const idArr = [...allMsgIds];
  for (let i = 0; i < idArr.length; i++) {
    if (i % 20 === 0 && i > 0) console.log(`  Fetching ${i}/${idArr.length}...`);
    try {
      const msg = await getMessage(idArr[i], token);
      messages.push(msg);
    } catch (e) {
      console.log(`  ⚠️ Failed to fetch ${idArr[i]}: ${e.message}`);
    }
  }

  // Collect all recipient emails
  const allRecipients = new Map(); // email -> {first seen date, subjects}
  for (const msg of messages) {
    const allEmails = [
      ...extractEmails(msg.to),
      ...extractEmails(msg.cc),
      ...extractEmails(msg.bcc)
    ].filter(e => e !== 'banfjax@gmail.com');

    for (const email of allEmails) {
      if (!allRecipients.has(email)) {
        allRecipients.set(email, { subjects: new Set(), dates: [] });
      }
      allRecipients.get(email).subjects.add(msg.subject);
      allRecipients.get(email).dates.push(msg.date);
    }
  }

  // Group by subject for "two slots" analysis
  const bySubject = new Map();
  for (const msg of messages) {
    const key = msg.subject.replace(/^(Re|Fwd):\s*/gi, '').trim();
    if (!bySubject.has(key)) bySubject.set(key, []);
    bySubject.get(key).push(msg);
  }

  console.log('=== SENT EMAILS BY SUBJECT ===\n');
  for (const [subj, msgs] of [...bySubject.entries()].sort((a, b) => b[1].length - a[1].length)) {
    const recipients = new Set();
    msgs.forEach(m => {
      extractEmails(m.to).forEach(e => recipients.add(e));
      extractEmails(m.cc).forEach(e => recipients.add(e));
      extractEmails(m.bcc).forEach(e => recipients.add(e));
    });
    recipients.delete('banfjax@gmail.com');
    console.log(`📧 "${subj}"`);
    console.log(`   Sent ${msgs.length} times, ${recipients.size} unique recipients`);
    console.log(`   Dates: ${msgs.map(m => m.date).sort().join(', ')}`);
    if (recipients.size > 0 && recipients.size <= 50) {
      console.log(`   Recipients: ${[...recipients].sort().join(', ')}`);
    }
    console.log();
  }

  console.log('\n=== ALL UNIQUE RECIPIENT EMAILS ===\n');
  const sortedEmails = [...allRecipients.keys()].sort();
  console.log(`Total: ${sortedEmails.length} unique emails`);
  sortedEmails.forEach(e => console.log(`  ${e}`));
}

main().catch(e => { console.error('Fatal:', e.message); process.exit(1); });
