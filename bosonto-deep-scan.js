#!/usr/bin/env node
/**
 * ═══════════════════════════════════════════════════════════════
 *  BOSONTO UTSOB 2026 — DEEP EMAIL SCAN & ANALYSIS
 * ═══════════════════════════════════════════════════════════════
 *  Scans ALL emails after Feb 27, 2026 to find:
 *  1. ALL Evite RSVPs (not just "bosonto" keyword)
 *  2. ALL Wells Fargo Zelle payments
 *  3. Other payment sources
 *  4. Cross-reference with CRM membership
 */
const https = require('https');
const fs = require('fs');

const GOOGLE_CLIENT_ID = '1020178199135-3usrl611ara38i7rhu2ub6sn6g1150ml.apps.googleusercontent.com';
const GOOGLE_CLIENT_SECRET = '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';
const GOOGLE_REFRESH_TOKEN = require('./banf-gmail-config').REFRESH_TOKEN;

const CUTOFF_DATE = new Date('2026-02-27T00:00:00Z');

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

  return { id, from: getH('From'), subject: getH('Subject'), date: getH('Date'), body: bodyText, bodyHtml, internalDate: msg.internalDate };
}

// ═══════════════════════════════════════════════════════════════
// PHASE 1: Full email inventory after Feb 27, 2026
// ═══════════════════════════════════════════════════════════════
async function phase1_emailInventory(token) {
  console.log('\n' + '═'.repeat(70));
  console.log('  PHASE 1: FULL EMAIL INVENTORY — After Feb 27, 2026');
  console.log('═'.repeat(70));

  const queries = {
    'ALL emails after Feb 27': 'after:2026/02/27',
    'Evite emails after Feb 27': 'from:evite.com after:2026/02/27',
    'Evite RSVP emails after Feb 27': 'from:evite.com RSVP after:2026/02/27',
    'Evite ALL (no date limit)': 'from:evite.com',
    'Evite bosonto (no date limit)': 'from:evite.com bosonto',
    'WF alerts after Feb 27': 'from:alerts@notify.wellsfargo.com after:2026/02/27',
    'WF alerts (all)': 'from:alerts@notify.wellsfargo.com',
    'Zelle after Feb 27': 'from:alerts@notify.wellsfargo.com zelle after:2026/02/27',
    'PayPal after Feb 27': 'from:paypal after:2026/02/27',
    'Venmo after Feb 27': 'from:venmo after:2026/02/27',
  };

  const counts = {};
  for (const [label, query] of Object.entries(queries)) {
    const ids = await searchGmail(query, token);
    counts[label] = ids.length;
    console.log(`  ${label}: ${ids.length}`);
  }
  return counts;
}

// ═══════════════════════════════════════════════════════════════
// PHASE 2: Deep Evite scan — ALL Evite emails, parse every one
// ═══════════════════════════════════════════════════════════════
async function phase2_deepEviteScan(token) {
  console.log('\n' + '═'.repeat(70));
  console.log('  PHASE 2: DEEP EVITE SCAN — All Evite emails');
  console.log('═'.repeat(70));

  // Get ALL Evite emails (no date filter to get everything)
  const allEviteIds = await searchGmail('from:evite.com', token, 500);
  console.log(`  Total Evite emails in mailbox: ${allEviteIds.length}`);

  // Also try broader search for Evite/RSVP with different senders
  const rsvpIds = await searchGmail('subject:RSVP evite', token, 500);
  console.log(`  Subject RSVP+evite: ${rsvpIds.length}`);

  // Also search for reply@evite, info@evite, etc.  
  const eviteInfoIds = await searchGmail('from:info@evite.com OR from:reply@evite.com OR from:notifications@evite.com', token, 500);
  console.log(`  From info/reply/notifications@evite: ${eviteInfoIds.length}`);

  // Merge unique
  const uniqueIds = [...new Set([...allEviteIds, ...rsvpIds, ...eviteInfoIds])];
  console.log(`  Total unique Evite-related emails: ${uniqueIds.length}`);

  // Fetch ALL and parse
  const allParsed = [];
  for (let i = 0; i < uniqueIds.length; i++) {
    if (i % 20 === 0) process.stdout.write(`  Fetching ${i}/${uniqueIds.length}...\r`);
    try {
      const msg = await getMessage(uniqueIds[i], token);
      const parsed = parseEviteDeep(msg);
      allParsed.push(parsed);
    } catch (e) {
      console.log(`  ⚠️ Error fetching ${uniqueIds[i]}: ${e.message}`);
    }
  }
  console.log(`  Fetched ${uniqueIds.length}/${uniqueIds.length} emails           `);

  // Categorize by event
  const byEvent = {};
  const noEvent = [];
  for (const p of allParsed) {
    if (p.eventName && p.eventName !== 'Unknown') {
      (byEvent[p.eventName] = byEvent[p.eventName] || []).push(p);
    } else {
      noEvent.push(p);
    }
  }

  console.log('\n  Events detected in Evite emails:');
  for (const [evt, emails] of Object.entries(byEvent)) {
    console.log(`    ${evt}: ${emails.length} emails`);
  }
  if (noEvent.length) console.log(`    (Unclassified): ${noEvent.length} emails`);

  // Focus on Bosonto Utsob
  const bosonto = byEvent['Bosonto Utsob 2026'] || [];
  console.log(`\n  Bosonto Utsob 2026 emails: ${bosonto.length}`);

  // Separate RSVPs from non-RSVPs
  const rsvpEmails = bosonto.filter(p => p.rsvp);
  const nonRsvp = bosonto.filter(p => !p.rsvp);
  console.log(`    With RSVP status: ${rsvpEmails.length}`);
  console.log(`    Non-RSVP (reminders, etc.): ${nonRsvp.length}`);

  // Deduplicate — keep latest RSVP per guest
  const byGuest = {};
  for (const r of rsvpEmails) {
    const key = normalizeGuestKey(r.guestName, r.guestEmail);
    if (!key) continue;
    const msgDate = new Date(r.date);
    if (!byGuest[key] || msgDate > new Date(byGuest[key].date)) {
      byGuest[key] = r;
    }
  }

  const deduped = Object.values(byGuest);
  const yes = deduped.filter(r => r.rsvp === 'yes');
  const no = deduped.filter(r => r.rsvp === 'no');
  const maybe = deduped.filter(r => r.rsvp === 'maybe');

  console.log(`\n  After dedup (latest RSVP per person):`);
  console.log(`    Unique guests: ${deduped.length}`);
  console.log(`    ✅ Yes: ${yes.length}`);
  console.log(`    ❌ No: ${no.length}`);
  console.log(`    🤔 Maybe: ${maybe.length}`);

  let totalAdults = 0, totalKids = 0;
  yes.forEach(r => { totalAdults += r.adults; totalKids += r.kids; });
  console.log(`    Headcount (Yes): ${totalAdults} adults + ${totalKids} kids = ${totalAdults + totalKids}`);

  // Print ALL RSVP-Yes guests
  console.log('\n  ── RSVP YES (Attending Bosonto Utsob 2026) ──');
  yes.sort((a, b) => (a.guestName || '').localeCompare(b.guestName || ''));
  yes.forEach((r, i) => {
    console.log(`    ${String(i + 1).padStart(3)}. ${(r.guestName || '?').padEnd(28)} ${(r.guestEmail || 'no-email').padEnd(35)} A:${r.adults} K:${r.kids}  ${r.date}`);
  });

  // Check for Saraswati Puja who also RSVP'd for Bosonto
  const saraswati = byEvent['Saraswati Puja 2026'] || [];
  const sarRsvps = {};
  for (const r of saraswati.filter(p => p.rsvp)) {
    const key = normalizeGuestKey(r.guestName, r.guestEmail);
    if (!key) continue;
    if (!sarRsvps[key] || new Date(r.date) > new Date(sarRsvps[key].date)) {
      sarRsvps[key] = r;
    }
  }

  // Show unclassified emails for debugging
  if (noEvent.length > 0) {
    console.log('\n  ── UNCLASSIFIED EVITE EMAILS (checking for missed Bosonto RSVPs) ──');
    for (const p of noEvent.slice(0, 20)) {
      console.log(`    subj: ${(p.subject || '').substring(0, 80)}  | guest: ${p.guestName || '?'} | rsvp: ${p.rsvp || '?'}`);
    }
  }

  return { allParsed, byEvent, bosonto: { yes, no, maybe, deduped, totalAdults, totalKids } };
}

function normalizeGuestKey(name, email) {
  if (email) return email.toLowerCase().trim();
  if (name) return name.toLowerCase().replace(/[^a-z]/g, '');
  return null;
}

function parseEviteDeep(msg) {
  const subj = msg.subject || '';
  const body = msg.body || '';
  const html = msg.bodyHtml || '';
  const fullText = subj + '\n' + body;

  let guestName = null, rsvp = null, adults = 0, kids = 0, guestEmail = null;
  let eventName = 'Unknown';

  // ── Detect event name ──
  if (/bosonto/i.test(fullText) || /bosonto/i.test(html)) {
    eventName = 'Bosonto Utsob 2026';
  } else if (/saraswati/i.test(fullText) || /saraswati/i.test(html)) {
    eventName = 'Saraswati Puja 2026';
  } else if (/durga/i.test(fullText)) {
    eventName = 'Durga Puja';
  } else if (/diwali/i.test(fullText)) {
    eventName = 'Diwali';
  }
  // Also check HTML for event name if not found
  if (eventName === 'Unknown' && html) {
    if (/bosonto/i.test(html)) eventName = 'Bosonto Utsob 2026';
    else if (/saraswati/i.test(html)) eventName = 'Saraswati Puja 2026';
  }

  // ── Parse RSVP from subject ──
  // "Evite update | New RSVP from GuestName"
  let match = subj.match(/New\s+RSVP\s+from\s+(.+?)$/i);
  if (match) guestName = match[1].trim();

  // "Evite update | GuestName replied Yes"
  if (!guestName) {
    match = subj.match(/Evite\s+(?:update|reminder)[^|]*\|\s*(.+?)$/i);
    if (match) {
      const afterPipe = match[1].trim();
      // Check if it contains "replied"
      const repliedMatch = afterPipe.match(/^(.+?)\s+replied\s+(Yes|No|Maybe)/i);
      if (repliedMatch) {
        guestName = repliedMatch[1].trim();
        rsvp = repliedMatch[2].toLowerCase();
      } else if (/New\s+RSVP\s+from/i.test(afterPipe)) {
        const nameMatch = afterPipe.match(/New\s+RSVP\s+from\s+(.+?)$/i);
        if (nameMatch) guestName = nameMatch[1].trim();
      }
    }
  }

  // ── Parse RSVP from body ──
  // "Name replied Yes for N adults and N kid(s)"
  match = body.match(/([A-Z][\w\s'.-]+?)\s+replied\s+(Yes|No|Maybe)\s+for\s+(\d+)\s+adult/i);
  if (match) {
    if (!guestName) guestName = match[1].trim();
    rsvp = match[2].toLowerCase();
    adults = parseInt(match[3]) || 0;
    const km = body.match(/(\d+)\s+kid/i);
    if (km) kids = parseInt(km[1]) || 0;
  }

  // "Name replied Yes" (no count)
  if (!rsvp) {
    match = body.match(/([A-Z][\w\s'.-]+?)\s+replied\s+(Yes|No|Maybe)(?:\s|[.,!]|$)/i);
    if (match) {
      if (!guestName) guestName = match[1].trim();
      rsvp = match[2].toLowerCase();
      if (rsvp === 'yes' && adults === 0) adults = 1;
    }
  }

  // "has RSVP'd Yes"
  if (!rsvp) {
    match = subj.match(/(.+?)\s+has\s+RSVP'?d?\s+(Yes|No|Maybe)/i);
    if (match) {
      if (!guestName) guestName = match[1].trim();
      rsvp = match[2].toLowerCase();
    }
  }

  // Also try HTML body for RSVP parsing if text body didn't yield results
  if (!rsvp && html) {
    const cleanHtml = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
    match = cleanHtml.match(/([A-Z][\w\s'.-]+?)\s+replied\s+(Yes|No|Maybe)\s+for\s+(\d+)\s+adult/i);
    if (match) {
      if (!guestName) guestName = match[1].trim();
      rsvp = match[2].toLowerCase();
      adults = parseInt(match[3]) || 0;
      const km = cleanHtml.match(/(\d+)\s+kid/i);
      if (km) kids = parseInt(km[1]) || 0;
    }
    if (!rsvp) {
      match = cleanHtml.match(/([A-Z][\w\s'.-]+?)\s+replied\s+(Yes|No|Maybe)(?:\s|[.,!]|$)/i);
      if (match) {
        if (!guestName) guestName = match[1].trim();
        rsvp = match[2].toLowerCase();
        if (rsvp === 'yes' && adults === 0) adults = 1;
      }
    }
  }

  // ── Extract guest email ──
  const emailMatch = fullText.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
  if (emailMatch && !emailMatch[1].includes('evite') && !emailMatch[1].includes('banfjax') && !emailMatch[1].includes('gmail.com') && !emailMatch[1].includes('jaxbengali')) {
    guestEmail = emailMatch[1].toLowerCase();
  }
  // Also check HTML for email (sometimes in mailto: links)
  if (!guestEmail && html) {
    const mailtoMatch = html.match(/mailto:([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i);
    if (mailtoMatch && !mailtoMatch[1].includes('evite')) {
      guestEmail = mailtoMatch[1].toLowerCase();
    }
  }

  // ── Clean guest name ──
  if (guestName) {
    guestName = guestName.replace(/\d+$/, '').replace(/['"]/g, '').trim();
    // Capitalize properly
    if (guestName.length > 2) {
      guestName = guestName.split(/\s+/).map(w =>
        w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()
      ).join(' ');
    }
  }

  return {
    gmailId: msg.id, from: msg.from, subject: subj, date: msg.date,
    guestName, guestEmail, rsvp, adults, kids, eventName,
    internalDate: msg.internalDate
  };
}

// ═══════════════════════════════════════════════════════════════
// PHASE 3: Wells Fargo Zelle + Payment scan after Feb 27
// ═══════════════════════════════════════════════════════════════
async function phase3_paymentScan(token) {
  console.log('\n' + '═'.repeat(70));
  console.log('  PHASE 3: PAYMENT SCAN — After Feb 27, 2026');
  console.log('═'.repeat(70));

  // WF Zelle
  const wfIds = await searchGmail('from:alerts@notify.wellsfargo.com after:2026/02/27', token, 200);
  console.log(`  WF alert emails after Feb 27: ${wfIds.length}`);

  const payments = [];
  for (let i = 0; i < wfIds.length; i++) {
    if (i % 10 === 0) process.stdout.write(`  Fetching WF ${i}/${wfIds.length}...\r`);
    try {
      const msg = await getMessage(wfIds[i], token);
      const p = parsePayment(msg);
      if (p.amount > 0) payments.push(p);
    } catch (e) {}
  }
  console.log(`  Fetched ${wfIds.length} WF emails                    `);
  console.log(`  Zelle payments found: ${payments.length}`);

  // Also check PayPal, Venmo
  const ppIds = await searchGmail('from:paypal after:2026/02/27', token, 100);
  console.log(`  PayPal emails after Feb 27: ${ppIds.length}`);
  for (const id of ppIds) {
    try {
      const msg = await getMessage(id, token);
      const p = parsePayment(msg);
      if (p.amount > 0) { p.source = 'paypal'; payments.push(p); }
    } catch (e) {}
  }

  // Sort by date
  payments.sort((a, b) => new Date(b.date) - new Date(a.date));

  console.log(`\n  Total payments after Feb 27: ${payments.length}`);
  const totalAmt = payments.reduce((s, p) => s + p.amount, 0);
  console.log(`  Total amount: $${totalAmt.toFixed(2)}`);

  console.log('\n  ── PAYMENT DETAILS ──');
  payments.forEach((p, i) => {
    console.log(`    ${String(i + 1).padStart(3)}. $${String(p.amount).padStart(7)} from ${(p.payerName || '?').padEnd(25)} [${p.source || 'zelle'}] ${p.date}`);
  });

  return payments;
}

function parsePayment(msg) {
  const body = msg.body || '';
  const html = msg.bodyHtml || '';
  const subj = msg.subject || '';
  const result = {
    gmailId: msg.id, from: msg.from, subject: subj, date: msg.date,
    payerName: null, amount: 0, source: 'zelle', memo: null
  };

  // WF Zelle HTML format: "NAME sent you $AMOUNT"
  let match = null;
  const textToSearch = body + ' ' + (html ? html.replace(/<[^>]+>/g, ' ') : '');

  // "sent you $XXX"
  match = textToSearch.match(/([A-Z][A-Z\s]+?)\s+sent\s+you\s+\$?([\d,]+(?:\.\d{2})?)/i);
  if (match) {
    result.payerName = match[1].trim();
    result.amount = parseFloat(match[2].replace(/,/g, ''));
    return result;
  }

  // "You received $XXX from Name"
  match = textToSearch.match(/(?:you\s+)?received?\s+\$?([\d,]+(?:\.\d{2})?)\s+from\s+(.+?)(?:\.|$)/im);
  if (match) {
    result.amount = parseFloat(match[1].replace(/,/g, ''));
    result.payerName = match[2].trim();
    return result;
  }

  // "payment of $XXX"
  match = textToSearch.match(/payment\s+of\s+\$?([\d,]+(?:\.\d{2})?)/i);
  if (match) {
    result.amount = parseFloat(match[1].replace(/,/g, ''));
    result.source = 'paypal';
  }

  // Subject: "$XXX"
  if (result.amount === 0) {
    match = subj.match(/\$?([\d,]+(?:\.\d{2})?)/);
    if (match && parseFloat(match[1].replace(/,/g, '')) > 10) {
      result.amount = parseFloat(match[1].replace(/,/g, ''));
    }
  }

  return result;
}

// ═══════════════════════════════════════════════════════════════
// PHASE 4: CRM Cross-reference & Fix
// ═══════════════════════════════════════════════════════════════
function phase4_crmFix(eviteData, payments) {
  console.log('\n' + '═'.repeat(70));
  console.log('  PHASE 4: CRM CROSS-REFERENCE & FIX');
  console.log('═'.repeat(70));

  // Load existing CRM
  const crmFile = 'banf-crm-reconciliation.json';
  const crm = JSON.parse(fs.readFileSync(crmFile, 'utf8'));
  const members = crm.members || crm;
  console.log(`  Current CRM members: ${members.length}`);

  // Build index of Bosonto attendees from Evite
  const eviteYes = eviteData.bosonto.yes;
  console.log(`  Evite RSVP-Yes for Bosonto: ${eviteYes.length}`);

  // PRICING for 2026-27 (membership year starts Feb 27, 2026)
  const PRICING = {
    m2: { family: 375, couple: 330, individual: 205, student: 145 },
    m1: { family: 280, couple: 255, individual: 140, student: 100 },
    cultural: { family: 180, couple: 140, individual: 100, student: 75 },
    guest: { family: 50, couple: 35, individual: 25, student: 15 }
  };
  const allAmounts = new Set();
  Object.values(PRICING).forEach(tier => Object.values(tier).forEach(v => allAmounts.add(v)));
  
  // Match payments to amounts -> tier
  function guessTier(amount) {
    for (const [tier, prices] of Object.entries(PRICING)) {
      for (const [type, price] of Object.entries(prices)) {
        if (price === amount) return { tier, type, price };
      }
    }
    return null;
  }

  // Index payments by payer name (normalized)
  const paymentsByName = {};
  for (const p of payments) {
    if (!p.payerName) continue;
    const key = p.payerName.toLowerCase().replace(/[^a-z]/g, '');
    if (!paymentsByName[key]) paymentsByName[key] = [];
    paymentsByName[key].push(p);
  }

  // Cross-reference: for each Evite Yes guest, find payment
  let matched = 0, unmatched = 0;
  const attendeeRecords = [];

  for (const guest of eviteYes) {
    const record = {
      name: guest.guestName || 'Unknown',
      email: guest.guestEmail || '',
      rsvp: 'yes',
      adults: guest.adults,
      kids: guest.kids,
      eventName: 'Bosonto Utsob 2026',
      paymentStatus: 'not_paid',
      paymentAmount: 0,
      paymentSource: '',
      membershipTier: 'guest',
      lastRsvpDate: guest.date
    };

    // Find CRM member
    const crmMember = findCrmMember(members, guest.guestName, guest.guestEmail);
    if (crmMember) {
      record.email = record.email || crmMember.email || '';
      record.membershipTier = crmMember.membershipTier || 'guest';
      // Check payment from CRM
      if (crmMember.paymentStatus === 'paid' || crmMember.paymentAmount > 0) {
        // Verify this is a 2026-27 payment by checking payment date
        const payDate = crmMember.paymentDate ? new Date(crmMember.paymentDate) : null;
        if (payDate && payDate >= CUTOFF_DATE) {
          record.paymentStatus = 'paid';
          record.paymentAmount = crmMember.paymentAmount || 0;
          record.paymentSource = 'crm';
        }
      }
    }

    // Find payment in Zelle/PayPal
    if (record.paymentStatus !== 'paid' && guest.guestName) {
      const normName = guest.guestName.toLowerCase().replace(/[^a-z]/g, '');
      // Try exact match
      if (paymentsByName[normName]) {
        const p = paymentsByName[normName][0];
        record.paymentStatus = 'paid';
        record.paymentAmount = p.amount;
        record.paymentSource = p.source || 'zelle';
        const tierInfo = guessTier(p.amount);
        if (tierInfo) record.membershipTier = tierInfo.tier;
      } else {
        // Try partial match (first name or last name)
        const parts = guest.guestName.toLowerCase().split(/\s+/);
        for (const [key, pList] of Object.entries(paymentsByName)) {
          for (const part of parts) {
            if (part.length > 3 && key.includes(part) && pList[0].amount >= 100) {
              record.paymentStatus = 'paid_fuzzy';
              record.paymentAmount = pList[0].amount;
              record.paymentSource = pList[0].source || 'zelle';
              const tierInfo = guessTier(pList[0].amount);
              if (tierInfo) record.membershipTier = tierInfo.tier;
              break;
            }
          }
          if (record.paymentStatus === 'paid_fuzzy') break;
        }
      }
    }

    if (record.paymentStatus === 'paid' || record.paymentStatus === 'paid_fuzzy') matched++;
    else unmatched++;

    attendeeRecords.push(record);
  }

  console.log(`\n  Payment matching:`);
  console.log(`    Paid (exact match): ${attendeeRecords.filter(r => r.paymentStatus === 'paid').length}`);
  console.log(`    Paid (fuzzy match): ${attendeeRecords.filter(r => r.paymentStatus === 'paid_fuzzy').length}`);
  console.log(`    Not paid / Unknown: ${attendeeRecords.filter(r => r.paymentStatus === 'not_paid').length}`);

  // Summary
  console.log('\n  ── ATTENDEE RECORDS WITH PAYMENT STATUS ──');
  attendeeRecords.sort((a, b) => a.name.localeCompare(b.name));
  attendeeRecords.forEach((r, i) => {
    const payStr = r.paymentStatus === 'not_paid' ? '  NOT PAID  ' :
                   r.paymentStatus === 'paid_fuzzy' ? `PAID~$${r.paymentAmount}` :
                   `PAID $${r.paymentAmount}`;
    console.log(`    ${String(i + 1).padStart(3)}. ${r.name.padEnd(28)} ${r.email.padEnd(35)} ${payStr.padEnd(15)} ${r.membershipTier}`);
  });

  return { attendeeRecords, payments };
}

function findCrmMember(members, guestName, guestEmail) {
  if (guestEmail) {
    const m = members.find(m => (m.email || '').toLowerCase() === guestEmail.toLowerCase());
    if (m) return m;
  }
  if (!guestName) return null;
  const normGuest = guestName.toLowerCase().replace(/[^a-z]/g, '');
  for (const m of members) {
    const normMember = (m.displayName || m.fullName || `${m.firstName || ''} ${m.lastName || ''}`.trim()).toLowerCase().replace(/[^a-z]/g, '');
    if (normMember && normMember === normGuest) return m;
  }
  // Partial match
  const parts = guestName.toLowerCase().split(/\s+/).filter(p => p.length > 2);
  for (const m of members) {
    const normMember = (m.displayName || m.fullName || `${m.firstName || ''} ${m.lastName || ''}`.trim()).toLowerCase();
    if (parts.length >= 2 && parts.every(p => normMember.includes(p))) return m;
  }
  return null;
}

// ═══════════════════════════════════════════════════════════════
// PHASE 5: Save updated CRM & generate report
// ═══════════════════════════════════════════════════════════════
function phase5_save(eviteData, paymentData, attendeeRecords) {
  console.log('\n' + '═'.repeat(70));
  console.log('  PHASE 5: SAVE & REPORT');
  console.log('═'.repeat(70));

  // Update CRM file with corrected Bosonto data
  const crmFile = 'banf-crm-reconciliation.json';
  const crm = JSON.parse(fs.readFileSync(crmFile, 'utf8'));
  const members = crm.members || crm;

  // Remove old Bosonto Utsob event data from all members
  for (const m of members) {
    if (m.eventAttendance) {
      m.eventAttendance = m.eventAttendance.filter(e => e.eventName !== 'Bosonto Utsob 2026');
    }
  }

  // Add fresh Bosonto data from scan
  let addedNew = 0, updatedExisting = 0;
  for (const att of attendeeRecords) {
    // Find existing member
    let found = false;
    for (const m of members) {
      const mEmail = (m.email || '').toLowerCase();
      const mName = (m.displayName || m.fullName || `${m.firstName || ''} ${m.lastName || ''}`.trim()).toLowerCase().replace(/[^a-z]/g, '');
      const attName = (att.name || '').toLowerCase().replace(/[^a-z]/g, '');

      if ((att.email && mEmail === att.email.toLowerCase()) || (attName && attName === mName)) {
        // Update existing member
        if (!m.eventAttendance) m.eventAttendance = [];
        m.eventAttendance.push({
          eventName: 'Bosonto Utsob 2026',
          rsvp: att.rsvp,
          adults: att.adults,
          kids: att.kids,
          dietary: 'unknown'
        });
        // Update payment if from fresh scan (2026-27)
        if (att.paymentStatus === 'paid' || att.paymentStatus === 'paid_fuzzy') {
          m.paymentStatus = 'paid';
          m.paymentAmount = att.paymentAmount;
          m.paymentSource = att.paymentSource;
          m.paymentDate = att.lastRsvpDate; // approximate
        } else {
          // Only reset if no valid 2026-27 payment exists
          // Keep existing CRM payment if it's after cutoff
        }
        if (att.email && !m.email) m.email = att.email;
        found = true;
        updatedExisting++;
        break;
      }
    }

    if (!found) {
      // Add as new member
      members.push({
        email: att.email || '',
        displayName: att.name,
        firstName: att.name.split(' ')[0] || '',
        lastName: att.name.split(' ').slice(1).join(' ') || '',
        membershipTier: att.membershipTier || 'guest',
        membershipStatus: 'evite_rsvp',
        paymentStatus: att.paymentStatus === 'paid' || att.paymentStatus === 'paid_fuzzy' ? 'paid' : 'not_paid',
        paymentAmount: att.paymentAmount || 0,
        paymentSource: att.paymentSource || '',
        eventAttendance: [{
          eventName: 'Bosonto Utsob 2026',
          rsvp: att.rsvp,
          adults: att.adults,
          kids: att.kids,
          dietary: 'unknown'
        }]
      });
      addedNew++;
    }
  }

  // Also add RSVP No guests
  const noGuests = eviteData.bosonto.no || [];
  for (const ng of noGuests) {
    const attName = (ng.guestName || '').toLowerCase().replace(/[^a-z]/g, '');
    let found = false;
    for (const m of members) {
      const mName = (m.displayName || m.fullName || `${m.firstName || ''} ${m.lastName || ''}`.trim()).toLowerCase().replace(/[^a-z]/g, '');
      if (attName && attName === mName) {
        if (!m.eventAttendance) m.eventAttendance = [];
        m.eventAttendance.push({ eventName: 'Bosonto Utsob 2026', rsvp: 'no', adults: 0, kids: 0, dietary: 'unknown' });
        found = true; break;
      }
    }
    if (!found) {
      members.push({
        email: ng.guestEmail || '', displayName: ng.guestName || 'Unknown',
        firstName: (ng.guestName || '').split(' ')[0], lastName: (ng.guestName || '').split(' ').slice(1).join(' '),
        membershipTier: 'guest', membershipStatus: 'evite_rsvp', paymentStatus: 'not_paid',
        eventAttendance: [{ eventName: 'Bosonto Utsob 2026', rsvp: 'no', adults: 0, kids: 0 }]
      });
    }
  }

  crm.members = members;
  crm.lastUpdated = new Date().toISOString();
  crm.bosonto_deep_scan = {
    scanDate: new Date().toISOString(),
    totalEviteEmails: eviteData.allParsed.length,
    bosonto_rsvp_yes: eviteData.bosonto.yes.length,
    bosonto_rsvp_no: eviteData.bosonto.no.length,
    headcount: { adults: eviteData.bosonto.totalAdults, kids: eviteData.bosonto.totalKids },
    payments_after_feb27: paymentData.length,
    cutoffDate: '2026-02-27'
  };
  fs.writeFileSync(crmFile, JSON.stringify(crm, null, 2));
  console.log(`  Updated existing: ${updatedExisting}`);
  console.log(`  Added new: ${addedNew}`);
  console.log(`  Total CRM members: ${members.length}`);

  // Save detailed scan results
  const scanResults = {
    scanDate: new Date().toISOString(),
    event: 'Bosonto Utsob 2026',
    cutoffDate: '2026-02-27',
    evite: {
      totalEviteEmails: eviteData.allParsed.length,
      byEvent: Object.fromEntries(Object.entries(eviteData.byEvent).map(([k, v]) => [k, v.length])),
      bosonto: {
        rsvpYes: eviteData.bosonto.yes.length,
        rsvpNo: eviteData.bosonto.no.length,
        rsvpMaybe: eviteData.bosonto.maybe.length,
        headcount: { adults: eviteData.bosonto.totalAdults, kids: eviteData.bosonto.totalKids, total: eviteData.bosonto.totalAdults + eviteData.bosonto.totalKids }
      }
    },
    payments: {
      total: paymentData.length,
      totalAmount: paymentData.reduce((s, p) => s + p.amount, 0),
      details: paymentData.map(p => ({ name: p.payerName, amount: p.amount, source: p.source, date: p.date }))
    },
    attendees: attendeeRecords
  };
  fs.writeFileSync('bosonto-deep-scan-results.json', JSON.stringify(scanResults, null, 2));
  console.log(`  ✅ Detailed results: bosonto-deep-scan-results.json`);
  console.log(`  ✅ CRM updated: banf-crm-reconciliation.json`);
}

// ═══════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════
(async () => {
  console.log('═'.repeat(70));
  console.log('  BOSONTO UTSOB 2026 — DEEP EMAIL SCAN & ANALYSIS');
  console.log('  Cutoff Date: Feb 27, 2026 (2026-27 membership year)');
  console.log('  Scan Date: ' + new Date().toISOString());
  console.log('═'.repeat(70));

  const token = await getToken();

  // Phase 1: Email inventory
  const emailCounts = await phase1_emailInventory(token);

  // Phase 2: Deep Evite scan
  const eviteData = await phase2_deepEviteScan(token);

  // Phase 3: Payment scan
  const payments = await phase3_paymentScan(token);

  // Phase 4: CRM cross-reference
  const { attendeeRecords } = phase4_crmFix(eviteData, payments);

  // Phase 5: Save all
  phase5_save(eviteData, payments, attendeeRecords);

  // Final summary
  console.log('\n' + '═'.repeat(70));
  console.log('  FINAL SUMMARY');
  console.log('═'.repeat(70));
  console.log(`  📧 Total Evite emails scanned: ${eviteData.allParsed.length}`);
  console.log(`  🎉 Bosonto Utsob RSVP-Yes: ${eviteData.bosonto.yes.length}`);
  console.log(`  👥 Headcount: ${eviteData.bosonto.totalAdults}A + ${eviteData.bosonto.totalKids}K = ${eviteData.bosonto.totalAdults + eviteData.bosonto.totalKids}`);
  console.log(`  💰 Payments after Feb 27: ${payments.length} ($${payments.reduce((s, p) => s + p.amount, 0).toFixed(2)})`);
  console.log(`  ✅ Paid attendees: ${attendeeRecords.filter(r => r.paymentStatus === 'paid').length}`);
  console.log(`  ⚠️  Fuzzy-matched payments: ${attendeeRecords.filter(r => r.paymentStatus === 'paid_fuzzy').length}`);
  console.log(`  ❌ Not paid: ${attendeeRecords.filter(r => r.paymentStatus === 'not_paid').length}`);
  console.log('═'.repeat(70));

})().catch(e => { console.error('FATAL:', e.message); console.error(e.stack); });
