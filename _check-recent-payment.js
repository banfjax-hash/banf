#!/usr/bin/env node
const https = require('https');
const CREDENTIALS = [
  { id: '1020178199135-3usrl611ara38i7rhu2ub6sn6g1150ml.apps.googleusercontent.com', secret: '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' },
  { id: '407408718192.apps.googleusercontent.com', secret: 'kd-_2_AUosoGGTNYyMJiFL3j' },
];
const REFRESH_TOKEN = '1//04HRG0eZ_xPToCgYIARAAGAQSNwF-L9IrIgvTylK3UlSUAk93qYZvEVLzBXsOYBt02JlenPqCN-vYtSQO4GAs6eUbGO3c6h_F-64';

function httpsReq(url, opts = {}) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const o = { hostname: u.hostname, port: 443, path: u.pathname + u.search, method: opts.method || 'GET', headers: opts.headers || {}, timeout: 30000 };
    const req = https.request(o, res => { let d = ''; res.on('data', c => d += c); res.on('end', () => { try { resolve(JSON.parse(d)); } catch { resolve(d); } }); });
    req.on('error', reject);
    if (opts.body) req.write(opts.body);
    req.end();
  });
}

async function getToken() {
  for (const cred of CREDENTIALS) {
    const body = `grant_type=refresh_token&refresh_token=${encodeURIComponent(REFRESH_TOKEN)}&client_id=${encodeURIComponent(cred.id)}&client_secret=${encodeURIComponent(cred.secret)}`;
    const r = await httpsReq('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Content-Length': Buffer.byteLength(body) }, body });
    if (r.access_token) return r.access_token;
  }
  throw new Error('Auth failed');
}

async function gmailSearch(q, token) {
  const url = `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(q)}&maxResults=50`;
  const r = await httpsReq(url, { headers: { Authorization: 'Bearer ' + token } });
  return (r.messages || []).map(m => m.id);
}

async function gmailGet(id, token) {
  const url = `https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}?format=full`;
  const r = await httpsReq(url, { headers: { Authorization: 'Bearer ' + token } });
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
  if (!bodyText && bodyHtml) {
    bodyText = bodyHtml.replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&')
      .replace(/\s+/g, ' ').trim();
  }
  return { id, from: getH('From'), subject: getH('Subject'), date: getH('Date'), body: bodyText.trim(), internalDate: r.internalDate };
}

(async () => {
  const token = await getToken();
  console.log('Token OK\n');
  
  // Search for ALL Zelle received emails after March 10, 2026
  const queries = [
    'from:notify.wellsfargo.com subject:"You received" after:2026/03/10',
    'from:wellsfargo subject:"received" Zelle after:2026/03/10',
    'from:wellsfargo after:2026/03/14',
  ];
  
  const allIds = new Set();
  for (const q of queries) {
    const ids = await gmailSearch(q, token);
    ids.forEach(id => allIds.add(id));
    console.log(`Query: ${q.substring(0,70)} => ${ids.length} results`);
  }
  console.log(`\nTotal unique emails: ${allIds.size}\n`);
  
  for (const id of allIds) {
    const msg = await gmailGet(id, token);
    const emailDate = msg.date ? new Date(msg.date) : new Date(parseInt(msg.internalDate));
    
    // Parse amount and payer
    let match = msg.body.match(/([A-Z][A-Za-z .''-]+?)\s+sent you\s+\$?([\d,]+(?:\.\d{2})?)/i);
    let payerName = match ? match[1].trim() : '';
    let amount = match ? parseFloat(match[2].replace(',', '')) : 0;
    
    if (!amount) {
      match = msg.body.match(/received?\s+\$?([\d,]+(?:\.\d{2})?)\s+from\s+(.+?)(?:\.|[\r\n]|$)/i);
      if (match) { amount = parseFloat(match[1].replace(',', '')); payerName = match[2].trim(); }
    }
    
    // Memo
    match = msg.body.match(/Memo:\s*(.+?)(?:We deposited|$)/i);
    const memo = match ? match[1].trim() : '';
    
    // Confirmation
    match = msg.body.match(/Confirmation:\s*([A-Z0-9]+)/i);
    const conf = match ? match[1] : '';
    
    // Date from body
    match = msg.body.match(/Date:\s*(\d{2}\/\d{2}\/\d{4})/);
    const payDate = match ? match[1] : '';
    
    console.log(`${emailDate.toISOString().slice(0,19)} | $${amount} | ${payerName} | Date: ${payDate} | Memo: ${memo} | Conf: ${conf}`);
    console.log(`   Subject: ${msg.subject.substring(0,100)}`);
    console.log();
  }
})().catch(e => console.error('ERROR:', e.message));
