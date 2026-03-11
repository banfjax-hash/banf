#!/usr/bin/env node
/**
 * Quick Gmail scan for ALL Asok Chaudhuri payments + any new payments since deep scan
 */
const https = require('https');

const GOOGLE_CLIENT_ID = '1020178199135-3usrl611ara38i7rhu2ub6sn6g1150ml.apps.googleusercontent.com';
const GOOGLE_CLIENT_SECRET = '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';
const GOOGLE_REFRESH_TOKEN = require('./banf-gmail-config').REFRESH_TOKEN;

function httpsRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const opts = {
      hostname: u.hostname, port: 443,
      path: u.pathname + u.search,
      method: options.method || 'GET',
      headers: options.headers || {},
      timeout: 30000
    };
    const req = https.request(opts, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        try { resolve(JSON.parse(d)); } catch { resolve(d); }
      });
    });
    req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
    req.on('error', reject);
    if (options.body) req.write(options.body);
    req.end();
  });
}

async function getToken() {
  const body = `grant_type=refresh_token&refresh_token=${encodeURIComponent(GOOGLE_REFRESH_TOKEN)}&client_id=${encodeURIComponent(GOOGLE_CLIENT_ID)}&client_secret=${encodeURIComponent(GOOGLE_CLIENT_SECRET)}`;
  const r = await httpsRequest('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Content-Length': Buffer.byteLength(body) },
    body
  });
  if (!r.access_token) throw new Error('Token failed: ' + JSON.stringify(r));
  return r.access_token;
}

async function searchGmail(query, token) {
  const url = `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(query)}&maxResults=50`;
  const r = await httpsRequest(url, { headers: { Authorization: `Bearer ${token}` } });
  return r.messages || [];
}

async function getMessage(id, token) {
  const url = `https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}?format=full`;
  const r = await httpsRequest(url, { headers: { Authorization: `Bearer ${token}` } });
  const headers = (r.payload && r.payload.headers) || [];
  const getH = name => (headers.find(h => h.name.toLowerCase() === name.toLowerCase()) || {}).value || '';

  let bodyText = '';
  let bodyHtml = '';
  function extractParts(part) {
    if (part.mimeType === 'text/plain' && part.body && part.body.data) {
      try { bodyText += Buffer.from(part.body.data, 'base64').toString('utf8'); } catch {}
    }
    if (part.mimeType === 'text/html' && part.body && part.body.data) {
      try { bodyHtml += Buffer.from(part.body.data, 'base64').toString('utf8'); } catch {}
    }
    if (part.parts) part.parts.forEach(extractParts);
  }
  extractParts(r.payload || {});

  // Strip HTML for text
  const cleanHtml = bodyHtml
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();

  return { id, from: getH('From'), subject: getH('Subject'), date: getH('Date'), body: bodyText || cleanHtml, bodyHtml };
}

function parsePayment(msg) {
  const text = msg.body + ' ' + (msg.bodyHtml ? msg.bodyHtml.replace(/<[^>]+>/g, ' ') : '');
  const result = { gmailId: msg.id, date: msg.date, subject: msg.subject, payerName: null, amount: 0 };

  // "NAME sent you $AMOUNT"
  let match = text.match(/([A-Z][A-Z\s]+?)\s+sent\s+you\s+\$?([\d,]+(?:\.\d{2})?)/i);
  if (match) {
    result.payerName = match[1].trim();
    result.amount = parseFloat(match[2].replace(/,/g, ''));
    return result;
  }

  // "You received $XXX from Name"
  match = text.match(/received?\s+\$?([\d,]+(?:\.\d{2})?)\s+from\s+(.+?)(?:\.|$)/im);
  if (match) {
    result.amount = parseFloat(match[1].replace(/,/g, ''));
    result.payerName = match[2].trim();
    return result;
  }

  // Generic dollar amount
  match = text.match(/\$([\d,]+(?:\.\d{2})?)/);
  if (match) result.amount = parseFloat(match[1].replace(/,/g, ''));

  return result;
}

async function main() {
  const token = await getToken();
  console.log('✅ Token obtained\n');

  // 1. Search for ALL WF alerts mentioning Chaudhuri or Asok
  console.log('═══ SEARCH: Asok/Chaudhuri WF Zelle alerts ═══');
  const q1 = 'from:alerts@notify.wellsfargo.com chaudhuri after:2026/02/27';
  const q2 = 'from:alerts@notify.wellsfargo.com asok after:2026/02/27';
  
  const m1 = await searchGmail(q1, token);
  const m2 = await searchGmail(q2, token);
  
  // Deduplicate
  const idSet = new Set();
  const allAsokIds = [];
  for (const m of [...m1, ...m2]) {
    if (!idSet.has(m.id)) { idSet.add(m.id); allAsokIds.push(m.id); }
  }
  
  console.log(`  "chaudhuri" query: ${m1.length} results`);
  console.log(`  "asok" query: ${m2.length} results`);
  console.log(`  Unique Asok-related WF emails: ${allAsokIds.length}\n`);

  for (const id of allAsokIds) {
    const msg = await getMessage(id, token);
    const p = parsePayment(msg);
    console.log(`  📧 Date: ${msg.date}`);
    console.log(`     Subject: ${msg.subject}`);
    console.log(`     Payer: ${p.payerName || '?'}  |  Amount: $${p.amount}`);
    console.log(`     Gmail ID: ${id}`);
    console.log('     ---');
  }

  // 2. Search ALL WF alerts after March 6 (deep scan date) for ANY new payments
  console.log('\n═══ ALL NEW WF ALERTS AFTER MARCH 6 (post deep-scan) ═══');
  const newMsgs = await searchGmail('from:alerts@notify.wellsfargo.com after:2026/03/06', token);
  console.log(`  Total new WF alerts: ${newMsgs.length}\n`);

  const newPayments = [];
  for (const m of newMsgs) {
    const msg = await getMessage(m.id, token);
    const p = parsePayment(msg);
    if (p.amount > 0) {
      newPayments.push(p);
      console.log(`  💰 ${p.payerName || '?'} — $${p.amount} on ${msg.date}`);
    } else {
      console.log(`  📧 (non-payment) Subject: ${msg.subject} | Date: ${msg.date}`);
    }
  }

  // 3. Also search ALL WF alerts after March 2 to catch anything between Mar 2 and Mar 6
  console.log('\n═══ ALL WF ALERTS AFTER MARCH 2 (to catch ALL payments) ═══');
  const allRecent = await searchGmail('from:alerts@notify.wellsfargo.com after:2026/03/02', token);
  console.log(`  Total WF alerts after Mar 2: ${allRecent.length}\n`);
  
  const allPayments = [];
  for (const m of allRecent) {
    const msg = await getMessage(m.id, token);
    const p = parsePayment(msg);
    if (p.amount > 0) {
      allPayments.push(p);
    }
  }
  
  // Show all payments found, grouped by payer
  const byPayer = {};
  for (const p of allPayments) {
    const key = (p.payerName || 'UNKNOWN').toUpperCase();
    if (!byPayer[key]) byPayer[key] = [];
    byPayer[key].push(p);
  }
  
  console.log('  All Zelle payments after Mar 2:');
  for (const [name, payments] of Object.entries(byPayer)) {
    const total = payments.reduce((s, p) => s + p.amount, 0);
    console.log(`    ${name}: ${payments.length} payment(s), total $${total}`);
    for (const p of payments) {
      console.log(`      - $${p.amount} on ${p.date}`);
    }
  }

  console.log('\n✅ Scan complete.');
}

main().catch(e => console.error('Error:', e));
