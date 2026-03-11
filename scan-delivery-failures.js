#!/usr/bin/env node
/**
 * scan-delivery-failures.js
 * Scan Gmail for delivery failure / bounce emails
 */

const https = require('https');

const CLIENT_ID = '1020178199135-3usrl611ara38i7rhu2ub6sn6g1150ml.apps.googleusercontent.com';
const CLIENT_SECRET = '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';
const REFRESH_TOKEN = require('./banf-gmail-config').REFRESH_TOKEN;

function httpsReq(url, opts = {}) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const o = {
      hostname: u.hostname, port: 443,
      path: u.pathname + u.search,
      method: opts.method || 'GET',
      headers: opts.headers || {}
    };
    const req = https.request(o, resp => {
      let d = '';
      resp.on('data', c => d += c);
      resp.on('end', () => resolve(JSON.parse(d)));
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
  return r.access_token;
}

async function gmailGet(token, path) {
  return httpsReq(`https://gmail.googleapis.com/gmail/v1/users/me/${path}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
}

async function main() {
  const token = await getToken();
  console.log('=== DELIVERY FAILURE SCAN ===\n');

  const queries = [
    'from:mailer-daemon@googlemail.com after:2026/03/01',
    'subject:"Delivery Status Notification" after:2026/03/01',
    'from:postmaster after:2026/03/01',
    'subject:undeliverable after:2026/03/01',
    'subject:"Mail Delivery" after:2026/03/01',
    '"delivery to the following" after:2026/03/01'
  ];

  const allMsgIds = new Set();

  for (const q of queries) {
    const resp = await gmailGet(token, `messages?q=${encodeURIComponent(q)}&maxResults=20`);
    const msgs = resp.messages || [];
    console.log(`Query: ${q} => ${msgs.length} results`);
    for (const m of msgs) allMsgIds.add(m.id);
  }

  console.log(`\nTotal unique messages: ${allMsgIds.size}\n`);

  // Read each bounce message
  for (const msgId of allMsgIds) {
    const msg = await gmailGet(token, `messages/${msgId}?format=full`);
    const headers = msg.payload?.headers || [];
    const subj = headers.find(h => h.name === 'Subject')?.value || '(no subject)';
    const from = headers.find(h => h.name === 'From')?.value || '(unknown)';
    const date = headers.find(h => h.name === 'Date')?.value || '';
    const to = headers.find(h => h.name === 'To')?.value || '';

    console.log(`--- Message ${msgId} ---`);
    console.log(`  From: ${from}`);
    console.log(`  Subject: ${subj}`);
    console.log(`  Date: ${date}`);
    console.log(`  To: ${to}`);

    // Try to extract the failed recipient from the body
    let body = '';
    function extractText(part) {
      if (part.mimeType === 'text/plain' && part.body?.data) {
        body += Buffer.from(part.body.data, 'base64').toString('utf8');
      }
      if (part.parts) part.parts.forEach(extractText);
    }
    extractText(msg.payload);

    // Look for failed email addresses
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    const allEmails = [...new Set((body.match(emailRegex) || []))];
    const failedEmails = allEmails.filter(e => !e.includes('mailer-daemon') && !e.includes('postmaster') && !e.includes('banfjax'));
    console.log(`  Failed recipients: ${failedEmails.join(', ') || '(none found)'}`);
    console.log(`  Body preview: ${body.substring(0, 300).replace(/\n/g, ' ')}`);
    console.log();
  }
}

main().catch(e => console.error(e));
