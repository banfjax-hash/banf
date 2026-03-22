#!/usr/bin/env node
/**
 * Quick scanner: find all WF check deposit / deposit emails in Gmail
 */
const https = require('https');

function httpsReq(url, opts = {}) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const o = { hostname: u.hostname, port: 443, path: u.pathname + u.search, method: opts.method || 'GET', headers: opts.headers || {}, timeout: 60000 };
    const req = https.request(o, res => { let d = ''; res.on('data', c => d += c); res.on('end', () => { try { resolve(JSON.parse(d)); } catch { resolve(d); } }); });
    req.on('error', reject);
    if (opts.body) req.write(opts.body);
    req.end();
  });
}

const gmailConfig = require('./banf-gmail-config');

(async () => {
  // Auth using shared config
  const token = await gmailConfig.getToken();
  if (!token) { console.log('Auth failed'); return; }
  console.log('✅ Token OK\n');

  // Search for check/deposit related WF emails
  const queries = [
    'from:wellsfargo subject:deposit after:2026/01/01',
    'from:wellsfargo subject:check after:2026/01/01',
    'from:wellsfargo "mobile deposit" after:2026/01/01',
    'from:wellsfargo "deposited your check" after:2026/01/01',
    'from:wellsfargo "check deposited" after:2026/01/01',
    'from:wellsfargo "direct deposit" after:2026/01/01',
  ];
  const allIds = new Set();
  for (const q of queries) {
    const r = await httpsReq(`https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(q)}&maxResults=50`, { headers: { Authorization: 'Bearer ' + token } });
    const ids = (r.messages || []).map(m => m.id);
    ids.forEach(id => allIds.add(id));
    console.log(`Query: ${q.padEnd(65)} => ${ids.length} results`);
  }
  console.log(`\nTotal unique email IDs: ${allIds.size}\n`);

  // Also get ALL WF emails to show everything
  const allWfR = await httpsReq(`https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent('from:wellsfargo after:2026/03/10')}&maxResults=100`, { headers: { Authorization: 'Bearer ' + token } });
  const allWfIds = (allWfR.messages || []).map(m => m.id);
  allWfIds.forEach(id => allIds.add(id));
  console.log(`All WF emails since Mar 10 (after last parse): ${allWfIds.length}`);
  console.log(`Total to inspect: ${allIds.size}\n`);

  // Fetch metadata for each
  const results = [];
  for (const id of allIds) {
    const r = await httpsReq(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}?format=metadata&metadataHeaders=Subject&metadataHeaders=From&metadataHeaders=Date`, { headers: { Authorization: 'Bearer ' + token } });
    const headers = (r.payload && r.payload.headers) || [];
    const getH = n => (headers.find(h => h.name.toLowerCase() === n.toLowerCase()) || {}).value || '';
    const subj = getH('Subject');
    const from = getH('From');
    const date = getH('Date');
    if (/wellsfargo/i.test(from)) {
      results.push({ id, date, subject: subj, from });
    }
  }

  results.sort((a, b) => new Date(b.date) - new Date(a.date));

  console.log('=== ALL WF EMAILS FOUND ===\n');
  for (const r of results) {
    const isCheck = /check|deposit|mobile/i.test(r.subject);
    const marker = isCheck ? '🔴 CHECK/DEPOSIT' : '   ';
    console.log(`${marker} ${r.date}`);
    console.log(`    Subject: ${r.subject}`);
    console.log(`    ID: ${r.id}\n`);
  }

  // Now fetch full body of any check/deposit emails
  const checkEmails = results.filter(r => /check|deposit|mobile/i.test(r.subject));
  if (checkEmails.length > 0) {
    console.log('\n=== CHECK/DEPOSIT EMAIL DETAILS ===\n');
    for (const ce of checkEmails) {
      const r = await httpsReq(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${ce.id}?format=full`, { headers: { Authorization: 'Bearer ' + token } });
      let bodyText = '';
      function extractParts(part) {
        if (part.mimeType === 'text/plain' && part.body && part.body.data) {
          try { bodyText += Buffer.from(part.body.data, 'base64').toString('utf8'); } catch {}
        }
        if (part.mimeType === 'text/html' && part.body && part.body.data && !bodyText) {
          try {
            const html = Buffer.from(part.body.data, 'base64').toString('utf8');
            bodyText += html.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
          } catch {}
        }
        if (part.parts) part.parts.forEach(extractParts);
      }
      extractParts(r.payload || {});

      console.log(`Date: ${ce.date}`);
      console.log(`Subject: ${ce.subject}`);
      console.log(`Body (first 800 chars):\n${bodyText.substring(0, 800)}\n`);

      // Try to extract amount
      const amtMatch = bodyText.match(/\$\s*([\d,]+(?:\.\d{2})?)/);
      if (amtMatch) console.log(`  💰 Amount found: $${amtMatch[1]}`);
      const fromMatch = bodyText.match(/(?:from|by)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/i);
      if (fromMatch) console.log(`  👤 From: ${fromMatch[1]}`);
      console.log('---\n');
    }
  } else {
    console.log('\n⚠️ No check/deposit emails found with those subjects');
    console.log('Looking at ALL WF email subjects for any deposit-related content...\n');
    for (const r of results) {
      if (/deposit|check|balance|credit/i.test(r.subject)) {
        console.log(`  📌 ${r.date} | ${r.subject}`);
      }
    }
  }
})().catch(e => { console.error('FATAL:', e.message); console.error(e.stack); });
