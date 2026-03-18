#!/usr/bin/env node
/**
 * Scan banfjax@gmail.com inbox to analyze sender/subject patterns
 * for smart categorization planning.
 * Fetches ALL inbox messages (paginated) and groups by sender domain + subject patterns.
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const secrets = JSON.parse(fs.readFileSync(path.join(__dirname, '.banf-secrets.json'), 'utf8'));
const CLIENT_ID = secrets.CLIENT_ID;
const CLIENT_SECRET = secrets.CLIENT_SECRET;
const REFRESH_TOKEN = secrets.REFRESH_TOKEN;

function httpsReq(url, opts = {}) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const o = {
      hostname: u.hostname, port: 443,
      path: u.pathname + u.search,
      method: opts.method || 'GET',
      headers: opts.headers || {},
      timeout: 60000
    };
    const req = https.request(o, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => { try { resolve(JSON.parse(d)); } catch { resolve(d); } });
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

async function listAllInboxMsgIds(token) {
  const all = [];
  let pageToken = '';
  while (true) {
    let url = `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=in:inbox&maxResults=500`;
    if (pageToken) url += `&pageToken=${pageToken}`;
    const r = await httpsReq(url, { headers: { Authorization: 'Bearer ' + token } });
    if (r.messages) all.push(...r.messages.map(m => m.id));
    if (r.nextPageToken) { pageToken = r.nextPageToken; } else break;
  }
  return all;
}

async function getMsgMetadata(token, id) {
  const r = await httpsReq(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}?format=metadata&metadataHeaders=From&metadataHeaders=Subject&metadataHeaders=Date`, {
    headers: { Authorization: 'Bearer ' + token }
  });
  const headers = (r.payload && r.payload.headers) || [];
  const getH = n => (headers.find(h => h.name.toLowerCase() === n.toLowerCase()) || {}).value || '';
  return {
    id, from: getH('From'), subject: getH('Subject'), date: getH('Date'),
    labelIds: r.labelIds || [], internalDate: r.internalDate || '0'
  };
}

(async () => {
  console.log('Scanning banfjax@gmail.com inbox...\n');
  const token = await getToken();

  // Also scan Dev label and Sent to see full picture
  console.log('[1] Fetching all inbox message IDs...');
  const ids = await listAllInboxMsgIds(token);
  console.log(`    Found ${ids.length} messages in inbox\n`);

  console.log('[2] Fetching metadata for each message (this may take a moment)...');
  const msgs = [];
  const BATCH = 10;
  for (let i = 0; i < ids.length; i += BATCH) {
    const batch = ids.slice(i, i + BATCH);
    const results = await Promise.all(batch.map(id => getMsgMetadata(token, id)));
    msgs.push(...results);
    if ((i + BATCH) % 100 === 0 || i + BATCH >= ids.length)
      process.stdout.write(`    ${Math.min(i + BATCH, ids.length)}/${ids.length}\r`);
  }
  console.log(`\n    Fetched ${msgs.length} messages\n`);

  // Parse and group
  const cutoffDate = new Date('2026-02-20T00:00:00Z').getTime();
  const senderGroups = {};
  const preHistory = [];
  const postCutoff = [];

  for (const m of msgs) {
    const ts = parseInt(m.internalDate, 10);
    const fromRaw = m.from || '';
    // Extract email from "Name <email>" format
    const emailMatch = fromRaw.match(/<([^>]+)>/);
    const email = emailMatch ? emailMatch[1].toLowerCase() : fromRaw.toLowerCase().trim();
    const domain = email.includes('@') ? email.split('@')[1] : email;
    const name = fromRaw.replace(/<[^>]+>/, '').replace(/"/g, '').trim();

    const entry = {
      id: m.id, from: fromRaw, email, domain, name,
      subject: m.subject, date: m.date, ts, labelIds: m.labelIds,
      isPreCutoff: ts < cutoffDate
    };

    if (ts < cutoffDate) preHistory.push(entry);
    else postCutoff.push(entry);

    // Group by domain
    if (!senderGroups[domain]) senderGroups[domain] = { domain, count: 0, emails: [], senders: new Set(), subjects: [] };
    senderGroups[domain].count++;
    senderGroups[domain].senders.add(email);
    senderGroups[domain].subjects.push(m.subject);
    senderGroups[domain].emails.push(entry);
  }

  // Sort groups by count
  const sorted = Object.values(senderGroups).sort((a, b) => b.count - a.count);

  // Print summary
  console.log('=' .repeat(80));
  console.log('  INBOX ANALYSIS REPORT');
  console.log('=' .repeat(80));
  console.log(`  Total inbox messages: ${msgs.length}`);
  console.log(`  Pre Feb 20, 2026 (→ History): ${preHistory.length}`);
  console.log(`  Post Feb 20, 2026 (→ Categorize): ${postCutoff.length}`);
  console.log();

  console.log('── Top Sender Domains ──────────────────────────────────────');
  for (const g of sorted.slice(0, 30)) {
    const senders = [...g.senders].join(', ');
    console.log(`  ${String(g.count).padStart(4)} | ${g.domain.padEnd(35)} | ${senders.substring(0, 80)}`);
    // Show a couple sample subjects
    const unique = [...new Set(g.subjects)].slice(0, 3);
    for (const s of unique) {
      console.log(`       |   └ ${s ? s.substring(0, 75) : '(no subject)'}`);
    }
  }

  // Classify by proposed categories
  console.log('\n── Proposed Category Breakdown ─────────────────────────────');

  const categories = {
    'Wells Fargo': { pattern: m => /wellsfargo|wells\s*fargo/i.test(m.domain) || /wellsfargo/i.test(m.email), msgs: [] },
    'Payments/Zelle': { pattern: m => /zelle|venmo|paypal|cashapp|cash\.app/i.test(m.from + ' ' + m.subject), msgs: [] },
    'Wix': { pattern: m => /wix\.com/i.test(m.domain), msgs: [] },
    'Google': { pattern: m => /google\.com|googleapis\.com|googlemail/i.test(m.domain) && !/gmail/i.test(m.domain), msgs: [] },
    'Dev/GitHub': { pattern: m => /github\.com|netlify|vercel|npmjs|sentry|cloudflare|circleci|travis|snyk|heroku|render\.com/i.test(m.domain), msgs: [] },
    'Social/Promo': { pattern: m => /facebook|instagram|twitter|linkedin|youtube|tiktok|nextdoor|meetup|eventbrite|mailchimp|constantcontact/i.test(m.domain), msgs: [] },
    'Evite/RSVP': { pattern: m => /evite\.com/i.test(m.domain) || /rsvp/i.test(m.subject), msgs: [] },
    'Insurance/Finance': { pattern: m => /insurance|geico|progressive|allstate|statefarm|bankof|chase\.com|citi|amex|mastercard|visa/i.test(m.domain), msgs: [] },
    'BANF Members': { pattern: m => /gmail\.com|yahoo\.com|hotmail\.com|outlook\.com|aol\.com|icloud\.com/i.test(m.domain), msgs: [] },
    'Schools/Govt': { pattern: m => /\.edu$|\.gov$|k12\.fl\.us|\.k12\./i.test(m.domain), msgs: [] },
    'News/Subscription': { pattern: m => /substack|medium\.com|newsletter|digest|nytimes|washingtonpost/i.test(m.domain + ' ' + m.subject), msgs: [] },
  };

  // Apply categories in priority order
  const uncategorized = [];
  for (const m of msgs) {
    let found = false;
    for (const [cat, def] of Object.entries(categories)) {
      if (def.pattern(m)) {
        def.msgs.push(m);
        found = true;
        break;
      }
    }
    if (!found) uncategorized.push(m);
  }

  for (const [cat, def] of Object.entries(categories)) {
    if (def.msgs.length === 0) continue;
    const preCutoff = def.msgs.filter(m => m.isPreCutoff).length;
    console.log(`  ${cat.padEnd(20)} : ${String(def.msgs.length).padStart(4)} total  (${preCutoff} pre-Feb20 → History)`);
    // Sample 3
    for (const s of def.msgs.slice(0, 3)) {
      console.log(`    └ ${s.name.substring(0, 25).padEnd(25)} | ${(s.subject || '').substring(0, 55)} | ${s.date ? s.date.substring(0, 16) : ''}`);
    }
  }
  if (uncategorized.length > 0) {
    console.log(`  ${'Uncategorized'.padEnd(20)} : ${String(uncategorized.length).padStart(4)} total`);
    for (const s of uncategorized.slice(0, 5)) {
      console.log(`    └ ${s.email.substring(0, 35).padEnd(35)} | ${(s.subject || '').substring(0, 50)} | ${s.date ? s.date.substring(0, 16) : ''}`);
    }
  }

  // Save full data to JSON for the HTML generator
  const output = {
    scanDate: new Date().toISOString(),
    totalMessages: msgs.length,
    preCutoffCount: preHistory.length,
    postCutoffCount: postCutoff.length,
    cutoffDate: '2026-02-20',
    senderDomains: sorted.map(g => ({
      domain: g.domain, count: g.count,
      senders: [...g.senders],
      sampleSubjects: [...new Set(g.subjects)].slice(0, 5)
    })),
    categories: Object.entries(categories).map(([name, def]) => ({
      name, count: def.msgs.length,
      preCutoff: def.msgs.filter(m => m.isPreCutoff).length,
      postCutoff: def.msgs.filter(m => !m.isPreCutoff).length,
      samples: def.msgs.slice(0, 8).map(m => ({
        from: m.from, email: m.email, subject: m.subject, date: m.date, isPreCutoff: m.isPreCutoff
      }))
    })),
    uncategorized: {
      count: uncategorized.length,
      samples: uncategorized.slice(0, 15).map(m => ({
        from: m.from, email: m.email, domain: m.domain, subject: m.subject, date: m.date, isPreCutoff: m.isPreCutoff
      }))
    },
    allMessages: msgs.map(m => ({
      id: m.id, from: m.from, email: m.email, domain: m.domain,
      subject: m.subject, date: m.date, isPreCutoff: m.isPreCutoff
    }))
  };

  fs.writeFileSync(path.join(__dirname, '_inbox-scan-results.json'), JSON.stringify(output, null, 2));
  console.log('\n  Full scan data saved to _inbox-scan-results.json');
  console.log('=' .repeat(80));
})().catch(e => console.error('FATAL:', e.message));
