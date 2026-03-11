#!/usr/bin/env node
/**
 * Scan Gmail SENT folder for all payment acknowledgment emails already sent
 * to determine who still needs an ack.
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
  if (!r.access_token) throw new Error('Token failed');
  return r.access_token;
}

async function searchGmail(query, token, maxResults = 100) {
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
  const url = `https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}?format=metadata&metadataHeaders=To&metadataHeaders=Subject&metadataHeaders=Date`;
  const r = await httpsRequest(url, { headers: { Authorization: `Bearer ${token}` } });
  const headers = (r.payload && r.payload.headers) || [];
  const getH = name => (headers.find(h => h.name.toLowerCase() === name.toLowerCase()) || {}).value || '';
  return { id, to: getH('To'), subject: getH('Subject'), date: getH('Date'), labels: r.labelIds || [] };
}

async function main() {
  const token = await getToken();
  console.log('✅ Token obtained\n');

  // Search sent folder for payment-related emails from banfjax
  // Try multiple queries to find all payment ack emails
  const queries = [
    'in:sent from:banfjax@gmail.com subject:"Payment Confirmed" after:2026/03/01',
    'in:sent from:banfjax@gmail.com subject:"Thank You for Your Payment" after:2026/03/01',
    'in:sent from:banfjax@gmail.com subject:"Membership Payment" after:2026/03/01',
    'in:sent from:banfjax@gmail.com subject:"Updated" subject:"Payment" after:2026/03/01',
    'in:sent from:banfjax@gmail.com subject:"BANF" subject:"Payment" after:2026/03/01',
  ];

  const allSentIds = new Set();
  const allSent = [];

  for (const q of queries) {
    const ids = await searchGmail(q, token);
    console.log(`Query: "${q.substring(0, 60)}..." → ${ids.length} results`);
    for (const id of ids) {
      if (!allSentIds.has(id)) {
        allSentIds.add(id);
        const msg = await getMessage(id, token);
        allSent.push(msg);
      }
    }
  }

  // Extract recipient email from "To" header
  const sentAcks = [];
  for (const msg of allSent) {
    // Parse email from "Name <email>" or just "email"
    const toMatch = msg.to.match(/<([^>]+)>/) || [null, msg.to.trim()];
    const toEmail = (toMatch[1] || '').toLowerCase().trim();
    sentAcks.push({
      to: toEmail,
      toRaw: msg.to,
      subject: msg.subject,
      date: msg.date,
      gmailId: msg.id
    });
  }

  // Sort by date
  sentAcks.sort((a, b) => new Date(a.date) - new Date(b.date));

  console.log(`\n═══ ALL PAYMENT-RELATED SENT EMAILS (${sentAcks.length}) ═══\n`);
  const ackedEmails = new Set();
  for (const s of sentAcks) {
    const marker = s.subject.includes('Updated') ? ' [CORRECTION]' : '';
    console.log(`  ${s.date}`);
    console.log(`    To: ${s.toRaw}`);
    console.log(`    Subject: ${s.subject}${marker}`);
    console.log(`    ---`);
    if (s.to) ackedEmails.add(s.to);
  }

  // Now load the 19 mapped payers from the live scan data
  const fs = require('fs');
  const deepScan = JSON.parse(fs.readFileSync('bosonto-deep-scan-results.json', 'utf8'));
  const payments = (deepScan.payments && deepScan.payments.details) || [];

  // Payer map
  const PAYER_TO_EMAIL = {
    'RANADHIR GHOSH':       'ranadhir.ghosh@gmail.com',
    'AMIT CHANDAK':         'amit.everywhere@gmail.com',
    'SUNETRA BASU GHOSH':   'sunetra.basu@gmail.com',
    'SUVANKAR PAUL':        'suvankar.paul@gmail.com',
    'Amit Kumar Saha':      'asahaech@yahoo.com',
    'ASOK CHAUDHURI':       'asokchaudhuri@gmail.com',
    'TARIT K MONDAL':       'trt.mondal@gmail.com',
    'Ishita Saha':          'saha.ishita@mayo.edu',
    'FNU AMRITA':           'amrriita@gmail.com',
    'SUVENDU MAITRA':       'slmaitra@gmail.com',
    'RAHUL BANERJEE':       'weekender_in@yahoo.com',
    'NILAY CHANDRA':        'chandranilay@gmail.com',
    'KAUSHIKI BHATTACHARYA':'kb94311@gmail.com',
    'DIPRA GHOSH':          'ghosh.dipra@gmail.com',
    'Latika Mukherjee':     'lmukhe@yahoo.com',
    'ATMADEEP MAZUMDAR':    'atmadeep.mazumdar@gmail.com',
    'PARTHA CHOWDHURY':     'partha.chowdhury@gmail.com',
    'SUMAN GHOSH':          'sumon.ghosh@gmail.com',
    'ROY':                  'dbroy05@gmail.com',
  };

  // Aggregate payments by email
  const byEmail = {};
  for (const p of payments) {
    const email = PAYER_TO_EMAIL[p.name];
    if (!email) continue;
    const key = email.toLowerCase();
    if (!byEmail[key]) byEmail[key] = { name: p.name, email: key, total: 0, payments: [] };
    byEmail[key].total += p.amount;
    byEmail[key].payments.push(p);
  }

  console.log(`\n═══ CROSS-REFERENCE: WHO STILL NEEDS ACK? ═══\n`);
  console.log(`  Total payers:          ${Object.keys(byEmail).length}`);
  console.log(`  Already acked (sent):  ${ackedEmails.size}`);

  const needsAck = [];
  const alreadyDone = [];

  for (const [email, info] of Object.entries(byEmail)) {
    if (ackedEmails.has(email)) {
      alreadyDone.push(info);
    } else {
      needsAck.push(info);
    }
  }

  console.log(`  Still needs ack:       ${needsAck.length}\n`);

  if (alreadyDone.length > 0) {
    console.log(`  ── ALREADY ACKNOWLEDGED (${alreadyDone.length}) ──`);
    alreadyDone.forEach((r, i) => {
      console.log(`    ${i + 1}. ${r.name} <${r.email}> — $${r.total}`);
    });
  }

  if (needsAck.length > 0) {
    console.log(`\n  ── 🔴 NEEDS ACKNOWLEDGMENT (${needsAck.length}) ──`);
    needsAck.forEach((r, i) => {
      console.log(`    ${i + 1}. ${r.name} <${r.email}> — $${r.total} (${r.payments.length} payment(s))`);
    });
  } else {
    console.log(`\n  ✅ All payers have been acknowledged!`);
  }

  // Save the verified list
  fs.writeFileSync('banf-payment-ack-verified.json', JSON.stringify({
    scanDate: new Date().toISOString(),
    sentAcks: sentAcks.map(s => ({ to: s.to, subject: s.subject, date: s.date })),
    ackedEmails: [...ackedEmails],
    needsAck,
    alreadyDone: alreadyDone.map(r => ({ email: r.email, name: r.name, total: r.total }))
  }, null, 2));
  console.log(`\n  📄 Verified results saved to banf-payment-ack-verified.json`);
}

main().catch(e => console.error('Error:', e));
