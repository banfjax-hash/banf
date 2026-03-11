#!/usr/bin/env node
/**
 * Scan Gmail for ALL Evite RSVP emails for Bosonto Utsob 2026
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
  if (!r.data.access_token) throw new Error('Token failed: ' + JSON.stringify(r.data));
  return r.data.access_token;
}

async function searchGmail(query, token) {
  const allIds = [];
  let pageToken = '';
  while (true) {
    const url = `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(query)}&maxResults=100${pageToken ? '&pageToken=' + pageToken : ''}`;
    const r = await httpsRequest(url, { headers: { Authorization: `Bearer ${token}` } });
    if (r.data.error) throw new Error(JSON.stringify(r.data.error));
    const msgs = r.data.messages || [];
    allIds.push(...msgs.map(m => m.id));
    if (!r.data.nextPageToken || allIds.length >= 500) break;
    pageToken = r.data.nextPageToken;
  }
  return allIds;
}

async function getMessage(id, token) {
  const url = `https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}?format=full`;
  const r = await httpsRequest(url, { headers: { Authorization: `Bearer ${token}` } });
  const msg = r.data;
  const headers = (msg.payload && msg.payload.headers) || [];
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
  extractParts(msg.payload || {});

  if (!bodyText && bodyHtml) {
    bodyText = bodyHtml
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&#\d+;/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  return { id, from: getH('From'), subject: getH('Subject'), date: getH('Date'), body: bodyText, bodyHtml };
}

function parseEviteRsvp(msg) {
  const subj = msg.subject || '';
  const body = msg.body || '';
  const fullText = subj + '\n' + body;

  let guestName = null, rsvp = null, adults = 0, kids = 0, email = null;

  // Subject: "New RSVP from GuestName"
  let match = subj.match(/New\s+RSVP\s+from\s+(.+?)$/i);
  if (match) guestName = match[1].trim();

  // Alt subject
  if (!guestName) {
    match = subj.match(/Evite\s+(?:update|reminder)[^|]*\|\s*(?:New\s+RSVP\s+from\s+)?(.+?)$/i);
    if (match) guestName = match[1].trim();
  }

  // Body: "Name replied Yes for N adults and N kids"
  match = body.match(/([A-Z][\w\s'-]+?)\s+replied\s+(Yes|No|Maybe)\s+for\s+(\d+)\s+adult/i);
  if (match) {
    if (!guestName) guestName = match[1].trim();
    rsvp = match[2].toLowerCase();
    adults = parseInt(match[3]) || 0;
    const km = body.match(/(\d+)\s+kid/i);
    if (km) kids = parseInt(km[1]) || 0;
  }

  // Body: "Name replied Yes"
  if (!rsvp) {
    match = body.match(/([A-Z][\w\s'-]+?)\s+replied\s+(Yes|No|Maybe)(?:\s|$)/i);
    if (match) {
      if (!guestName) guestName = match[1].trim();
      rsvp = match[2].toLowerCase();
      if (rsvp === 'yes' && adults === 0) adults = 1;
    }
  }

  // Subject: "Name has RSVP'd Yes"
  if (!rsvp) {
    match = subj.match(/(.+?)\s+has\s+RSVP'?d?\s+(Yes|No|Maybe)/i);
    if (match) {
      if (!guestName) guestName = match[1].trim();
      rsvp = match[2].toLowerCase();
    }
  }

  // Extract email from body (not evite.com)
  const emailMatch = fullText.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
  if (emailMatch && !emailMatch[1].includes('evite') && !emailMatch[1].includes('banfjax')) {
    email = emailMatch[1].toLowerCase();
  }

  // Clean guest name
  if (guestName) {
    guestName = guestName.replace(/\d+$/, '').trim();
  }

  // Detect event name
  let eventName = 'Unknown';
  if (/bosonto/i.test(fullText)) eventName = 'Bosonto Utsob 2026';
  else if (/saraswati/i.test(fullText)) eventName = 'Saraswati Puja 2026';

  return { guestName, email, rsvp, adults, kids, eventName, subject: subj.substring(0, 100), date: msg.date, gmailId: msg.id };
}

(async () => {
  console.log('🔍 Scanning Gmail for Bosonto Utsob 2026 Evite RSVPs...\n');
  const token = await getToken();

  // Multiple searches to capture all Evite emails
  console.log('Searching with multiple queries...');
  const queries = [
    'from:evite.com bosonto',
    'from:evite.com utsob',
    'from:evite.com subject:RSVP bosonto OR utsob',
    'from:evite.com "Bosonto Utsob"',
  ];

  const allIds = new Set();
  for (const q of queries) {
    const ids = await searchGmail(q, token);
    console.log(`  "${q}" → ${ids.length} emails`);
    ids.forEach(id => allIds.add(id));
  }
  console.log(`\nTotal unique Evite emails: ${allIds.size}`);

  // Fetch and parse all
  const rsvps = [];
  const idArray = [...allIds];
  for (let i = 0; i < idArray.length; i++) {
    if (i % 10 === 0 && i > 0) process.stdout.write(`  Fetched ${i}/${idArray.length}...\r`);
    const msg = await getMessage(idArray[i], token);
    rsvps.push(parseEviteRsvp(msg));
  }
  console.log(`  Fetched ${idArray.length}/${idArray.length} emails`);

  // Filter Bosonto Utsob only
  const bosonto = rsvps.filter(r => r.eventName === 'Bosonto Utsob 2026');
  const others = rsvps.filter(r => r.eventName !== 'Bosonto Utsob 2026');

  console.log('\n' + '═'.repeat(60));
  console.log('  BOSONTO UTSOB 2026 — EVITE RSVP SCAN');
  console.log('═'.repeat(60));
  console.log(`Total Evite emails for Bosonto: ${bosonto.length}`);

  // Deduplicate — keep LATEST RSVP per guest (name or email)
  const byGuest = {};
  for (const r of bosonto) {
    const key = (r.email || (r.guestName || 'unknown').toLowerCase().replace(/\s+/g, '')).toLowerCase();
    if (!byGuest[key] || new Date(r.date) > new Date(byGuest[key].date)) {
      byGuest[key] = r;
    }
  }

  const deduped = Object.values(byGuest);
  const yesGuests = deduped.filter(r => r.rsvp === 'yes');
  const noGuests = deduped.filter(r => r.rsvp === 'no');
  const maybeGuests = deduped.filter(r => r.rsvp === 'maybe');
  const unknownGuests = deduped.filter(r => !r.rsvp);

  console.log(`\nAfter dedup (latest RSVP per person):`);
  console.log(`  Unique guests: ${deduped.length}`);
  console.log(`  ✅ Yes:    ${yesGuests.length}`);
  console.log(`  ❌ No:     ${noGuests.length}`);
  console.log(`  🤔 Maybe:  ${maybeGuests.length}`);
  console.log(`  ❓ Unknown: ${unknownGuests.length}`);

  let totalAdults = 0, totalKids = 0;
  yesGuests.forEach(r => { totalAdults += r.adults; totalKids += r.kids; });
  console.log(`\n  Total headcount (Yes only): ${totalAdults} adults + ${totalKids} kids = ${totalAdults + totalKids} total`);

  console.log('\n── RSVP YES (Attending) ──');
  yesGuests.sort((a, b) => (a.guestName || '').localeCompare(b.guestName || ''));
  yesGuests.forEach((r, i) => {
    console.log(`  ${(i + 1 + '.').padEnd(4)} ${(r.guestName || '?').padEnd(25)} ${(r.email || 'no-email').padEnd(35)} A:${r.adults} K:${r.kids}  ${r.date}`);
  });

  if (noGuests.length) {
    console.log('\n── RSVP NO ──');
    noGuests.sort((a, b) => (a.guestName || '').localeCompare(b.guestName || ''));
    noGuests.forEach(r => console.log(`  ${(r.guestName || '?').padEnd(25)} ${(r.email || '').padEnd(35)} ${r.date}`));
  }

  if (maybeGuests.length) {
    console.log('\n── RSVP MAYBE ──');
    maybeGuests.sort((a, b) => (a.guestName || '').localeCompare(b.guestName || ''));
    maybeGuests.forEach(r => console.log(`  ${(r.guestName || '?').padEnd(25)} ${(r.email || '').padEnd(35)} ${r.date}`));
  }

  if (unknownGuests.length) {
    console.log('\n── UNKNOWN RSVP ──');
    unknownGuests.forEach(r => console.log(`  ${(r.guestName || '?').padEnd(25)} subj: ${r.subject}`));
  }

  // Show other event emails found
  if (others.length) {
    const byEvt = {};
    others.forEach(r => { byEvt[r.eventName] = (byEvt[r.eventName] || 0) + 1; });
    console.log('\nOther events in same search:', JSON.stringify(byEvt));
  }

  // Save results to JSON for CRM update
  const output = {
    scanDate: new Date().toISOString(),
    event: 'Bosonto Utsob 2026',
    totalEviteEmails: bosonto.length,
    uniqueGuests: deduped.length,
    rsvpYes: yesGuests.length,
    rsvpNo: noGuests.length,
    rsvpMaybe: maybeGuests.length,
    headcount: { adults: totalAdults, kids: totalKids, total: totalAdults + totalKids },
    attendees: yesGuests.map(r => ({
      name: r.guestName,
      email: r.email,
      rsvp: 'yes',
      adults: r.adults,
      kids: r.kids,
      lastRsvpDate: r.date
    })),
    allGuests: deduped.map(r => ({
      name: r.guestName,
      email: r.email,
      rsvp: r.rsvp,
      adults: r.adults,
      kids: r.kids,
      lastRsvpDate: r.date
    }))
  };
  require('fs').writeFileSync('bosonto-utsob-evite-rsvps.json', JSON.stringify(output, null, 2));
  console.log('\n✅ Results saved to bosonto-utsob-evite-rsvps.json');

})().catch(e => console.error('Error:', e.message, e.stack));
