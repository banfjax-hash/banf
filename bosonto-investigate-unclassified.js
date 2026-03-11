#!/usr/bin/env node
/**
 * Investigate the 389 unclassified Evite emails to find missed Bosonto Utsob RSVPs.
 * Problem: Evite emails may not always contain the event name "Bosonto" in text body.
 * Need to check HTML body, subject patterns, and timestamps to classify them.
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

async function searchGmail(query, token, maxResults = 500) {
  const allIds = [];
  let pageToken = '';
  while (true) {
    const url = `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(query)}&maxResults=100${pageToken ? '&pageToken=' + pageToken : ''}`;
    const r = await httpsRequest(url, { headers: { Authorization: `Bearer ${token}` } });
    if (r.data.error) throw new Error(JSON.stringify(r.data.error));
    const msgs = r.data.messages || [];
    allIds.push(...msgs.map(m => m.id));
    if (!r.data.nextPageToken || allIds.length >= maxResults) break;
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
    if (part.mimeType === 'text/plain' && part.body && part.body.data)
      try { bodyText += Buffer.from(part.body.data, 'base64').toString('utf8'); } catch {}
    if (part.mimeType === 'text/html' && part.body && part.body.data)
      try { bodyHtml += Buffer.from(part.body.data, 'base64').toString('utf8'); } catch {}
    if (part.parts) part.parts.forEach(extractParts);
  }
  extractParts(msg.payload || {});

  if (!bodyText && bodyHtml) {
    bodyText = bodyHtml.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '').replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
  }

  return { id, from: getH('From'), subject: getH('Subject'), date: getH('Date'), body: bodyText, bodyHtml, threadId: msg.threadId, internalDate: msg.internalDate };
}

(async () => {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  INVESTIGATING UNCLASSIFIED EVITE EMAILS');
  console.log('═══════════════════════════════════════════════════════════════\n');

  const token = await getToken();

  // Get ALL Evite emails
  const eviteIds = await searchGmail('from:evite.com', token, 600);
  console.log(`Total Evite emails: ${eviteIds.length}`);

  // Also get "subject:RSVP evite" that may have different from
  const rsvpIds = await searchGmail('subject:RSVP evite', token, 600);
  const allIds = [...new Set([...eviteIds, ...rsvpIds])];
  console.log(`Unique Evite-related: ${allIds.length}`);

  // Fetch ALL and do deep classification
  const classified = { bosonto: [], saraswati: [], other_events: [], marketing: [], unknown_rsvp: [], unknown_other: [] };
  
  // Track threads — if any email in a thread mentions "bosonto", the whole thread is Bosonto
  const threadEvents = {};

  console.log('Fetching and classifying all emails...');
  const allMsgs = [];
  for (let i = 0; i < allIds.length; i++) {
    if (i % 50 === 0) process.stdout.write(`  ${i}/${allIds.length}...\r`);
    try {
      const msg = await getMessage(allIds[i], token);
      allMsgs.push(msg);
      
      // Classify by content
      const fullContent = (msg.subject + ' ' + msg.body + ' ' + (msg.bodyHtml || '')).toLowerCase();
      
      if (/bosonto|utsob/.test(fullContent)) {
        threadEvents[msg.threadId] = 'Bosonto Utsob 2026';
      } else if (/saraswati/.test(fullContent)) {
        threadEvents[msg.threadId] = 'Saraswati Puja 2026';
      }
    } catch (e) {}
  }
  console.log(`Fetched ${allMsgs.length} emails                    `);

  // Now classify using thread info too
  const bosonto_rsvps = {};
  const saraswati_rsvps = {};
  let marketing_count = 0;
  const unclassified_rsvps = [];

  // Also try: Evite invitation was sent around Feb 19-20, 2026 for Bosonto.
  // RSVPs within a certain time window after the invitation are likely Bosonto.
  // The Bosonto Utsob invite was sent Feb 19/20, 2026. Saraswati Puja was earlier.
  
  for (const msg of allMsgs) {
    const subj = msg.subject || '';
    const body = msg.body || '';
    const html = msg.bodyHtml || '';
    const fullText = (subj + ' ' + body + ' ' + html).toLowerCase();
    const msgDate = new Date(msg.date);

    // Is this an RSVP email?
    let isRsvp = false;
    let guestName = null, rsvp = null, adults = 0, kids = 0;

    // Subject: "New RSVP from Name"
    let match = subj.match(/New\s+RSVP\s+from\s+(.+?)$/i);
    if (match) { guestName = match[1].trim(); isRsvp = true; }

    // Subject: "Evite update | Name replied Yes"
    if (!guestName) {
      match = subj.match(/\|\s*(?:New\s+RSVP\s+from\s+)?(.+?)\s+replied\s+(Yes|No|Maybe)/i);
      if (match) { guestName = match[1].trim(); rsvp = match[2].toLowerCase(); isRsvp = true; }
    }
    if (!guestName) {
      match = subj.match(/\|\s*New\s+RSVP\s+from\s+(.+?)$/i);
      if (match) { guestName = match[1].trim(); isRsvp = true; }
    }

    // Body: "Name replied Yes for N adults"
    match = body.match(/([A-Z][\w\s'.-]+?)\s+replied\s+(Yes|No|Maybe)\s+for\s+(\d+)\s+adult/i);
    if (match) {
      if (!guestName) guestName = match[1].trim();
      rsvp = match[2].toLowerCase();
      adults = parseInt(match[3]) || 0;
      const km = body.match(/(\d+)\s+kid/i);
      if (km) kids = parseInt(km[1]) || 0;
      isRsvp = true;
    }
    if (!rsvp) {
      match = body.match(/([A-Z][\w\s'.-]+?)\s+replied\s+(Yes|No|Maybe)(?:\s|[.,!]|$)/i);
      if (match) {
        if (!guestName) guestName = match[1].trim();
        rsvp = match[2].toLowerCase();
        if (rsvp === 'yes' && adults === 0) adults = 1;
        isRsvp = true;
      }
    }
    // Also try HTML
    if (!rsvp && html) {
      const cleanHtml = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
      match = cleanHtml.match(/([A-Z][\w\s'.-]+?)\s+replied\s+(Yes|No|Maybe)\s+for\s+(\d+)\s+adult/i);
      if (match) {
        if (!guestName) guestName = match[1].trim();
        rsvp = match[2].toLowerCase();
        adults = parseInt(match[3]) || 0;
        const km = cleanHtml.match(/(\d+)\s+kid/i);
        if (km) kids = parseInt(km[1]) || 0;
        isRsvp = true;
      }
      if (!rsvp) {
        match = cleanHtml.match(/([A-Z][\w\s'.-]+?)\s+replied\s+(Yes|No|Maybe)(?:\s|[.,!]|$)/i);
        if (match) {
          if (!guestName) guestName = match[1].trim();
          rsvp = match[2].toLowerCase();
          if (rsvp === 'yes' && adults === 0) adults = 1;
          isRsvp = true;
        }
      }
    }

    // Clean guest name
    if (guestName) guestName = guestName.replace(/\d+$/, '').replace(/['"]/g, '').trim();

    if (!isRsvp) {
      // Marketing, reminders, etc.
      if (/marketing|promo|sponsor|sale|offer|deal|coupon|template/i.test(fullText)) {
        marketing_count++;
      }
      continue;
    }

    // Determine event
    let eventName = 'Unknown';
    
    // Method 1: Direct text match
    if (/bosonto|utsob/i.test(fullText)) {
      eventName = 'Bosonto Utsob 2026';
    } else if (/saraswati/i.test(fullText)) {
      eventName = 'Saraswati Puja 2026';
    }
    
    // Method 2: Thread-based classification
    if (eventName === 'Unknown' && threadEvents[msg.threadId]) {
      eventName = threadEvents[msg.threadId];
    }
    
    // Method 3: Date-based classification
    // Bosonto Utsob invites went out ~Feb 19-20, 2026
    // Saraswati Puja invites went out earlier (~Jan 2026)
    if (eventName === 'Unknown') {
      if (msgDate >= new Date('2026-02-19') && msgDate <= new Date('2026-03-10')) {
        // Most likely Bosonto Utsob (event is March 8, 2026)
        eventName = 'Bosonto Utsob 2026 (inferred)';
      } else if (msgDate >= new Date('2026-01-01') && msgDate < new Date('2026-02-19')) {
        // Likely Saraswati Puja
        eventName = 'Saraswati Puja 2026 (inferred)';
      }
    }

    const record = { guestName, rsvp, adults, kids, date: msg.date, eventName, threadId: msg.threadId, gmailId: msg.id, subject: subj.substring(0, 80) };

    if (eventName.includes('Bosonto')) {
      const key = (guestName || '').toLowerCase().replace(/[^a-z]/g, '');
      if (!bosonto_rsvps[key] || new Date(msg.date) > new Date(bosonto_rsvps[key].date)) {
        bosonto_rsvps[key] = record;
      }
    } else if (eventName.includes('Saraswati')) {
      const key = (guestName || '').toLowerCase().replace(/[^a-z]/g, '');
      if (!saraswati_rsvps[key] || new Date(msg.date) > new Date(saraswati_rsvps[key].date)) {
        saraswati_rsvps[key] = record;
      }
    } else {
      unclassified_rsvps.push(record);
    }
  }

  // Results
  const bosonto_all = Object.values(bosonto_rsvps);
  const bosonto_yes = bosonto_all.filter(r => r.rsvp === 'yes');
  const bosonto_no = bosonto_all.filter(r => r.rsvp === 'no');
  const bosonto_maybe = bosonto_all.filter(r => r.rsvp === 'maybe');
  const bosonto_unknown = bosonto_all.filter(r => !r.rsvp);

  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('  CLASSIFICATION RESULTS');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`  Bosonto Utsob 2026 unique guests: ${bosonto_all.length}`);
  console.log(`    ✅ Yes: ${bosonto_yes.length} (headcount: ${bosonto_yes.reduce((s,r) => s + r.adults, 0)}A + ${bosonto_yes.reduce((s,r) => s + r.kids, 0)}K)`);
  console.log(`    ❌ No: ${bosonto_no.length}`);
  console.log(`    ❓ Unknown RSVP: ${bosonto_unknown.length}`);
  console.log(`  Saraswati Puja 2026 unique guests: ${Object.keys(saraswati_rsvps).length}`);
  console.log(`  Marketing/Promo: ${marketing_count}`);
  console.log(`  Still unclassified RSVPs: ${unclassified_rsvps.length}`);

  // Breakdown by classification method
  const direct = bosonto_all.filter(r => r.eventName === 'Bosonto Utsob 2026');
  const inferred = bosonto_all.filter(r => r.eventName.includes('inferred'));
  console.log(`\n  Classification method:`);
  console.log(`    Direct (text match): ${direct.length}`);
  console.log(`    Inferred (thread + date): ${inferred.length}`);

  console.log('\n  ── ALL BOSONTO UTSOB RSVP-YES ──');
  bosonto_yes.sort((a, b) => (a.guestName || '').localeCompare(b.guestName || ''));
  bosonto_yes.forEach((r, i) => {
    const method = r.eventName.includes('inferred') ? ' [INFERRED]' : '';
    console.log(`    ${String(i + 1).padStart(3)}. ${(r.guestName || '?').padEnd(28)} A:${r.adults} K:${r.kids}  ${r.date.substring(0, 30)}${method}`);
  });

  if (bosonto_no.length) {
    console.log('\n  ── BOSONTO UTSOB RSVP-NO ──');
    bosonto_no.sort((a, b) => (a.guestName || '').localeCompare(b.guestName || ''));
    bosonto_no.forEach(r => {
      const method = r.eventName.includes('inferred') ? ' [INFERRED]' : '';
      console.log(`    ${(r.guestName || '?').padEnd(28)} ${r.date.substring(0, 30)}${method}`);
    });
  }

  if (unclassified_rsvps.length) {
    console.log('\n  ── STILL UNCLASSIFIED RSVPs ──');
    unclassified_rsvps.slice(0, 30).forEach(r => {
      console.log(`    ${(r.guestName || '?').padEnd(20)} rsvp:${(r.rsvp || '?').padEnd(5)} ${r.date.substring(0, 30)}  subj: ${r.subject.substring(0, 50)}`);
    });
  }

  // Save enriched results
  const output = {
    scanDate: new Date().toISOString(),
    event: 'Bosonto Utsob 2026',
    totalEviteEmailsScanned: allMsgs.length,
    bosonto: {
      uniqueGuests: bosonto_all.length,
      rsvpYes: bosonto_yes.length,
      rsvpNo: bosonto_no.length,
      rsvpMaybe: bosonto_maybe.length,
      headcount: {
        adults: bosonto_yes.reduce((s, r) => s + r.adults, 0),
        kids: bosonto_yes.reduce((s, r) => s + r.kids, 0),
        total: bosonto_yes.reduce((s, r) => s + r.adults + r.kids, 0)
      },
      attendeesYes: bosonto_yes.map(r => ({
        name: r.guestName, rsvp: 'yes', adults: r.adults, kids: r.kids,
        lastRsvpDate: r.date, classificationMethod: r.eventName
      })),
      attendeesNo: bosonto_no.map(r => ({
        name: r.guestName, rsvp: 'no', lastRsvpDate: r.date
      })),
      attendeesMaybe: bosonto_maybe.map(r => ({
        name: r.guestName, rsvp: 'maybe', lastRsvpDate: r.date
      })),
      unknownRsvp: bosonto_unknown.map(r => ({
        name: r.guestName, rsvp: null, lastRsvpDate: r.date, subject: r.subject
      }))
    },
    unclassified: unclassified_rsvps.map(r => ({
      name: r.guestName, rsvp: r.rsvp, date: r.date, subject: r.subject
    }))
  };
  fs.writeFileSync('bosonto-deep-scan-v2.json', JSON.stringify(output, null, 2));
  console.log('\n✅ Saved to bosonto-deep-scan-v2.json');

})().catch(e => { console.error('FATAL:', e.message, e.stack); });
