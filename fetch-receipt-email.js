#!/usr/bin/env node
/**
 * fetch-receipt-email.js
 * ----------------------
 * 1. Search banfjax@gmail.com for email from ranadhir.ghosh@gmail.com with subject "receipt check"
 * 2. Download all receipt attachments
 * 3. Save them to receipt-test-images/ folder
 */
'use strict';

const https = require('https');
const fs    = require('fs');
const path  = require('path');

const OUT_DIR = path.join(__dirname, 'receipt-test-images');

const CREDS = [
  { cid: '1020178199135-3usrl611ara38i7rhu2ub6sn6g1150ml.apps.googleusercontent.com', csec: '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', rt: '1//04iXClX5dKpqhCgYIARAAGAQSNwF-L9IrCtEUhuup9COlH5wnvGtozgReO4E5ILylE9Jq4f8vw1YUXDT_ysiHcJ89g-PA96eh8Ko' },
  { cid: '1020178199135-3usrl611ara38i7rhu2ub6sn6g1150ml.apps.googleusercontent.com', csec: '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', rt: require('./banf-gmail-config').REFRESH_TOKEN },
  { cid: '407408718192.apps.googleusercontent.com', csec: 'kd-_2_AUosoGGTNYyMJiFL3j', rt: '1//04iXClX5dKpqhCgYIARAAGAQSNwF-L9IrCtEUhuup9COlH5wnvGtozgReO4E5ILylE9Jq4f8vw1YUXDT_ysiHcJ89g-PA96eh8Ko' },
  { cid: '407408718192.apps.googleusercontent.com', csec: 'kd-_2_AUosoGGTNYyMJiFL3j', rt: require('./banf-gmail-config').REFRESH_TOKEN }
];

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
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => {
        const raw = Buffer.concat(chunks);
        try { resolve({ status: res.statusCode, data: JSON.parse(raw.toString()), raw }); }
        catch { resolve({ status: res.statusCode, data: raw.toString(), raw }); }
      });
    });
    req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
    req.on('error', reject);
    if (options.body) req.write(options.body);
    req.end();
  });
}

async function getGmailToken() {
  for (const { cid, csec, rt } of CREDS) {
    try {
      const body = `grant_type=refresh_token&refresh_token=${encodeURIComponent(rt)}&client_id=${encodeURIComponent(cid)}&client_secret=${encodeURIComponent(csec)}`;
      const resp = await httpsRequest('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Content-Length': Buffer.byteLength(body) },
        body
      });
      if (resp.data && resp.data.access_token) {
        console.log('Auth succeeded with client:', cid.substring(0, 20) + '...');
        return resp.data.access_token;
      }
    } catch (e) { /* try next */ }
  }
  throw new Error('All credential combinations failed — token revoked/expired');
}

async function gmailGet(token, apiPath) {
  const resp = await httpsRequest(`https://gmail.googleapis.com/gmail/v1/users/me/${apiPath}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return resp.data;
}

async function gmailGetAttachmentRaw(token, messageId, attachmentId) {
  const resp = await httpsRequest(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}/attachments/${attachmentId}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!resp.data || !resp.data.data) throw new Error('Empty attachment data');
  const b64 = resp.data.data.replace(/-/g, '+').replace(/_/g, '/');
  return Buffer.from(b64, 'base64');
}

function findAttachments(payload) {
  const attachments = [];
  function walk(part) {
    if (!part) return;
    const body = part.body || {};
    if (body.attachmentId) {
      attachments.push({
        filename: part.filename || 'unnamed',
        mimeType: (part.mimeType || '').toLowerCase(),
        attachmentId: body.attachmentId,
        size: body.size || 0
      });
    }
    if (part.parts) part.parts.forEach(p => walk(p));
  }
  walk(payload);
  return attachments;
}

async function main() {
  console.log('=== Fetching receipt email from ranadhir.ghosh@gmail.com ===\n');

  const token = await getGmailToken();
  console.log('Gmail auth OK\n');

  // Search for the email
  const query = 'from:ranadhir.ghosh@gmail.com subject:receipt check';
  console.log(`Search query: "${query}"`);
  const list = await gmailGet(token, `messages?q=${encodeURIComponent(query)}&maxResults=5`);
  const ids = (list.messages || []).map(m => m.id);
  console.log(`Found ${ids.length} message(s)\n`);

  if (!ids.length) {
    console.error('No emails found matching the query!');
    process.exit(1);
  }

  // Get the most recent one
  const msg = await gmailGet(token, `messages/${ids[0]}?format=full`);
  const headers = msg.payload.headers || [];
  const subject = (headers.find(h => h.name === 'Subject') || {}).value || '(no subject)';
  const from    = (headers.find(h => h.name === 'From') || {}).value || '';
  const date    = (headers.find(h => h.name === 'Date') || {}).value || '';

  console.log(`From:    ${from}`);
  console.log(`Subject: ${subject}`);
  console.log(`Date:    ${date}`);
  console.log(`Size:    ${msg.sizeEstimate} bytes\n`);

  // Find attachments
  const attachments = findAttachments(msg.payload);
  console.log(`Attachments found: ${attachments.length}\n`);

  if (!attachments.length) {
    console.error('No attachments found in this email!');
    process.exit(1);
  }

  // Create output directory
  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

  // Download each attachment
  const manifest = [];
  for (let i = 0; i < attachments.length; i++) {
    const att = attachments[i];
    console.log(`[${i+1}/${attachments.length}] Downloading: ${att.filename} (${att.mimeType}, ${att.size} bytes)...`);
    
    const buffer = await gmailGetAttachmentRaw(token, ids[0], att.attachmentId);
    
    // Save with original filename
    const safeName = att.filename.replace(/[^a-zA-Z0-9._-]/g, '_');
    const outPath = path.join(OUT_DIR, safeName);
    fs.writeFileSync(outPath, buffer);
    
    console.log(`  SAVED: ${outPath} (${buffer.length} bytes = ${Math.round(buffer.length/1024)}KB)`);
    
    manifest.push({
      index: i,
      originalName: att.filename,
      savedAs: safeName,
      mimeType: att.mimeType,
      sizeBytes: buffer.length,
      sizeKB: Math.round(buffer.length / 1024)
    });
  }

  // Save manifest
  const manifestPath = path.join(OUT_DIR, 'manifest.json');
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

  console.log('\n=== DOWNLOAD COMPLETE ===');
  console.log(`Directory: ${OUT_DIR}`);
  console.log('Files:');
  manifest.forEach(m => console.log(`  ${m.savedAs} (${m.sizeKB}KB, ${m.mimeType})`));
  console.log(`Manifest: ${manifestPath}`);
}

main().catch(err => { console.error('FATAL:', err.message); process.exit(1); });
