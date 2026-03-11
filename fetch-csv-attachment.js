#!/usr/bin/env node
/**
 * Find and download the latest CSV attachment from banfjax Gmail inbox
 */
const https = require('https');
const fs = require('fs');

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
        try { resolve({ status: res.statusCode, data: JSON.parse(d) }); }
        catch { resolve({ status: res.statusCode, data: d }); }
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
  return r.data.access_token;
}

async function searchGmail(query, token) {
  const url = `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(query)}&maxResults=20`;
  const r = await httpsRequest(url, { headers: { Authorization: `Bearer ${token}` } });
  return r.data.messages || [];
}

async function getMessage(id, token) {
  const url = `https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}?format=full`;
  const r = await httpsRequest(url, { headers: { Authorization: `Bearer ${token}` } });
  const msg = r.data;
  const headers = (msg.payload && msg.payload.headers) || [];
  const getH = name => (headers.find(h => h.name.toLowerCase() === name.toLowerCase()) || {}).value || '';
  return { id, from: getH('From'), subject: getH('Subject'), date: getH('Date'), payload: msg.payload };
}

async function getAttachment(msgId, attId, token) {
  const url = `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msgId}/attachments/${attId}`;
  const r = await httpsRequest(url, { headers: { Authorization: `Bearer ${token}` } });
  return r.data.data; // base64url encoded
}

function findAttachments(payload) {
  const attachments = [];
  function walk(part) {
    if (part.filename && part.filename.length > 0 && part.body && part.body.attachmentId) {
      attachments.push({
        filename: part.filename,
        mimeType: part.mimeType,
        size: part.body.size,
        attachmentId: part.body.attachmentId
      });
    }
    if (part.parts) part.parts.forEach(walk);
  }
  walk(payload);
  return attachments;
}

(async () => {
  console.log('🔍 Searching for CSV attachment emails...\n');
  const token = await getToken();

  // Search for emails with CSV/spreadsheet attachments
  const queries = [
    'has:attachment filename:csv guest',
    'has:attachment filename:csv bosonto',
    'has:attachment filename:csv attendee',
    'has:attachment filename:csv',
    'has:attachment filename:xlsx guest',
    'has:attachment guest list',
    'has:attachment filename:csv OR filename:xlsx newer_than:30d',
  ];

  const seenIds = new Set();
  const results = [];

  for (const q of queries) {
    const msgs = await searchGmail(q, token);
    for (const m of msgs) {
      if (seenIds.has(m.id)) continue;
      seenIds.add(m.id);
      const msg = await getMessage(m.id, token);
      const attachments = findAttachments(msg.payload);
      const csvOrXlsx = attachments.filter(a => 
        a.filename.toLowerCase().endsWith('.csv') || 
        a.filename.toLowerCase().endsWith('.xlsx') ||
        a.filename.toLowerCase().endsWith('.xls')
      );
      if (csvOrXlsx.length > 0) {
        results.push({ ...msg, attachments: csvOrXlsx });
        console.log(`📧 ${msg.date}`);
        console.log(`   From: ${msg.from}`);
        console.log(`   Subject: ${msg.subject}`);
        csvOrXlsx.forEach(a => console.log(`   📎 ${a.filename} (${a.mimeType}, ${a.size} bytes)`));
        console.log('');
      }
    }
  }

  console.log(`\nTotal emails with CSV/XLSX attachments: ${results.length}`);

  if (results.length === 0) {
    console.log('No CSV attachment found. Trying broader search...');
    // Try even broader
    const broader = await searchGmail('has:attachment newer_than:7d', token);
    console.log(`Recent emails with any attachment: ${broader.length}`);
    for (const m of broader.slice(0, 10)) {
      const msg = await getMessage(m.id, token);
      const attachments = findAttachments(msg.payload);
      if (attachments.length > 0) {
        console.log(`  ${msg.date} | ${msg.from} | ${msg.subject}`);
        attachments.forEach(a => console.log(`    📎 ${a.filename} (${a.mimeType})`));
      }
    }
    return;
  }

  // Download the latest CSV
  const latest = results[0]; // Already sorted by date (newest first from Gmail)
  console.log('═══════════════════════════════════════════════════');
  console.log('  DOWNLOADING LATEST CSV');
  console.log('═══════════════════════════════════════════════════');
  console.log(`From: ${latest.from}`);
  console.log(`Subject: ${latest.subject}`);
  console.log(`Date: ${latest.date}`);

  for (const att of latest.attachments) {
    console.log(`\nDownloading: ${att.filename}`);
    const b64data = await getAttachment(latest.id, att.attachmentId, token);
    // base64url to normal base64
    const normalB64 = b64data.replace(/-/g, '+').replace(/_/g, '/');
    const buffer = Buffer.from(normalB64, 'base64');
    const outPath = `c:\\projects\\banf\\evite-guest-list-${att.filename}`;
    fs.writeFileSync(outPath, buffer);
    console.log(`✅ Saved to: ${outPath} (${buffer.length} bytes)`);

    // If CSV, show preview
    if (att.filename.toLowerCase().endsWith('.csv')) {
      const text = buffer.toString('utf8');
      const lines = text.split('\n');
      console.log(`\n📋 CSV Preview (${lines.length} lines):`);
      console.log('Header: ' + lines[0]);
      console.log('\nFirst 10 rows:');
      lines.slice(0, 15).forEach((l, i) => console.log(`  ${i}: ${l.substring(0, 200)}`));
      console.log('\nLast 5 rows:');
      lines.slice(-6).forEach((l, i) => console.log(`  ${lines.length - 6 + i}: ${l.substring(0, 200)}`));
    }
  }

})().catch(e => console.error('Error:', e.message, e.stack));
