#!/usr/bin/env node
/**
 * One-time backfill: Process recent WF emails (since Mar 10) that were missed
 * because WF was blocked in the email reader.
 */
const https = require('https');
const gmailConfig = require('./banf-gmail-config');

function httpsReq(url, opts = {}) {
  return new Promise((res, rej) => {
    const u = new URL(url);
    const o = { hostname: u.hostname, port: 443, path: u.pathname + u.search, method: opts.method || 'GET', headers: opts.headers || {}, timeout: 60000 };
    const req = https.request(o, r => { let d = ''; r.on('data', c => d += c); r.on('end', () => { try { res(JSON.parse(d)); } catch { res(d); } }); });
    req.on('error', rej);
    if (opts.body) req.write(opts.body);
    req.end();
  });
}

function parseWFEmail(body, subj, emailDate) {
  // Zelle received
  if (/received money.*zelle|you received.*zelle/i.test(subj)) {
    const amtMatch = body.match(/\$\s*([\d,]+(?:\.\d{2})?)/);
    const fromMatch = body.match(/([A-Z][A-Za-z.\s'-]+?)\s+sent you/i);
    const confMatch = body.match(/Confirmation:\s*(\S+)/i);
    if (amtMatch) {
      return [{
        date: emailDate, description: 'Zelle payment received' + (fromMatch ? ' from ' + fromMatch[1].trim() : ''),
        amount: parseFloat(amtMatch[1].replace(/,/g, '')), direction: 'credit',
        category: 'zelle_income', paymentMethod: 'zelle',
        payerOrPayee: fromMatch ? fromMatch[1].trim() : '', confirmation: confMatch ? confMatch[1] : ''
      }];
    }
  }
  // Card purchase
  if (/card.*purchase|card.*used/i.test(subj)) {
    const amtMatch = body.match(/\$\s*([\d,]+(?:\.\d{2})?)/);
    const merchantMatch = body.match(/(?:at|merchant|from)\s+([A-Z0-9][A-Za-z0-9 &'.\-]{2,40})/i);
    if (amtMatch) {
      return [{
        date: emailDate, description: 'Card purchase' + (merchantMatch ? ' at ' + merchantMatch[1].trim() : ''),
        amount: parseFloat(amtMatch[1].replace(/,/g, '')), direction: 'debit',
        category: 'debit_card', paymentMethod: 'debit_card',
        payerOrPayee: merchantMatch ? merchantMatch[1].trim() : ''
      }];
    }
  }
  // Account update - balance only, skip
  if (/account update|verification code|security/i.test(subj)) return [];
  return null;
}

(async () => {
  console.log('=== WF Backfill: Processing missed emails since Mar 10, 2026 ===\n');
  
  const token = await gmailConfig.getToken();
  console.log('Token OK\n');

  // Get all WF emails since last parse
  const r = await httpsReq(`https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent('from:wellsfargo after:2026/03/10')}&maxResults=100`, {
    headers: { Authorization: 'Bearer ' + token }
  });
  const ids = (r.messages || []).map(m => m.id);
  console.log(`Found ${ids.length} WF emails since Mar 10\n`);

  const entries = [];
  for (const id of ids) {
    const msg = await httpsReq(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}?format=full`, {
      headers: { Authorization: 'Bearer ' + token }
    });
    const headers = (msg.payload && msg.payload.headers) || [];
    const getH = n => (headers.find(h => h.name.toLowerCase() === n.toLowerCase()) || {}).value || '';
    const subj = getH('Subject');
    const date = getH('Date');
    const emailDate = date ? new Date(date).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10);

    let bodyText = '';
    function extractParts(part) {
      if (part.mimeType === 'text/plain' && part.body && part.body.data) {
        try { bodyText += Buffer.from(part.body.data, 'base64').toString('utf8'); } catch {}
      }
      if (part.mimeType === 'text/html' && part.body && part.body.data && !bodyText) {
        try { const h = Buffer.from(part.body.data, 'base64').toString('utf8'); bodyText += h.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim(); } catch {}
      }
      if (part.parts) part.parts.forEach(extractParts);
    }
    extractParts(msg.payload || {});

    const txns = parseWFEmail(bodyText, subj, emailDate);
    if (txns && txns.length > 0) {
      for (const t of txns) {
        entries.push({
          entryDate: t.date, entryType: t.direction === 'credit' ? 'income' : 'expense',
          category: t.category, description: t.description, amount: t.amount,
          direction: t.direction, eventId: '', eventName: '',
          payerOrPayee: t.payerOrPayee || '', paymentMethod: t.paymentMethod || 'other',
          reference: t.confirmation || '', source: 'bank_statement', sourceId: id,
          bankDate: t.date, bankDescription: t.description, bankBalance: null,
          notes: 'Backfill: WF email from ' + date
        });
        const arrow = t.direction === 'credit' ? '+' : '-';
        console.log(`  ${arrow}$${t.amount.toFixed(2)} | ${t.description} | ${emailDate}`);
      }
    } else if (txns === null) {
      console.log(`  ? Unknown: ${subj.substring(0, 60)} | ${emailDate}`);
    } else {
      console.log(`  - Skip: ${subj.substring(0, 60)} | ${emailDate}`);
    }
  }

  if (entries.length === 0) {
    console.log('\nNo new financial transactions to post.');
    return;
  }

  console.log(`\nPosting ${entries.length} entries to FinancialLedger...`);
  const result = await httpsReq('https://www.jaxbengali.org/_functions/ledger_add', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ adminKey: 'banf-bosonto-2026-live', entries })
  });
  console.log('Result:', JSON.stringify(result, null, 2));
})().catch(e => { console.error('FATAL:', e.message); });
