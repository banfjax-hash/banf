#!/usr/bin/env node
/**
 * Inbox analysis v2: Fetch actual message metadata (500 recent + 200 oldest)
 * and classify each one to get real distribution numbers.
 */
const https = require('https');
const fs = require('fs');
const path = require('path');
const secrets = JSON.parse(fs.readFileSync(path.join(__dirname, '.banf-secrets.json'), 'utf8'));

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
  const body = `grant_type=refresh_token&refresh_token=${encodeURIComponent(secrets.REFRESH_TOKEN)}&client_id=${encodeURIComponent(secrets.CLIENT_ID)}&client_secret=${encodeURIComponent(secrets.CLIENT_SECRET)}`;
  const r = await httpsReq('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Content-Length': Buffer.byteLength(body) }, body });
  return r.access_token;
}

// Fetch message IDs with pagination
async function fetchMsgIds(token, query, maxPages = 10) {
  const ids = [];
  let pageToken = '';
  for (let page = 0; page < maxPages; page++) {
    let url = `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(query)}&maxResults=500`;
    if (pageToken) url += `&pageToken=${pageToken}`;
    const r = await httpsReq(url, { headers: { Authorization: 'Bearer ' + token } });
    if (r.messages) ids.push(...r.messages.map(m => m.id));
    if (r.nextPageToken) { pageToken = r.nextPageToken; } else break;
  }
  return ids;
}

// Batch metadata fetch
async function fetchMetadata(token, ids) {
  const msgs = [];
  for (let i = 0; i < ids.length; i += 20) {
    const batch = ids.slice(i, i + 20);
    const results = await Promise.all(batch.map(async id => {
      const msg = await httpsReq(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}?format=metadata&metadataHeaders=From&metadataHeaders=Subject&metadataHeaders=Date`, {
        headers: { Authorization: 'Bearer ' + token }
      });
      const headers = (msg.payload && msg.payload.headers) || [];
      const getH = n => (headers.find(h => h.name.toLowerCase() === n.toLowerCase()) || {}).value || '';
      return { id, from: getH('From'), subject: getH('Subject'), date: getH('Date'), ts: parseInt(msg.internalDate || '0', 10), labels: msg.labelIds || [] };
    }));
    msgs.push(...results);
    process.stdout.write(`\r    ${msgs.length}/${ids.length}`);
  }
  return msgs;
}

// Classification rules (priority order)
function classify(msg) {
  const from = (msg.from || '').toLowerCase();
  const subj = (msg.subject || '').toLowerCase();
  const email = (from.match(/<([^>]+)>/) || [, from])[1].trim();
  const domain = email.includes('@') ? email.split('@')[1] : '';

  // Wells Fargo
  if (/wellsfargo|wells-fargo|notify\.wellsfargo/.test(domain) || /wellsfargo/.test(email))
    return 'Wells Fargo';

  // Dev / GitHub / CI/CD
  if (/github\.com|netlify\.com|vercel\.com|npmjs\.com|sentry\.io|cloudflare\.com|circleci|travis-ci|snyk\.io|heroku\.com|render\.com/.test(domain))
    return 'Dev';
  if (/\[github\]|pull request|github actions|workflow run|dependabot|deploy(ment|ed)|ci\/cd|pipeline|build (failed|passed)|code scanning/.test(subj))
    return 'Dev';
  if (/wix\.com|wixsite/.test(domain) && /deploy|publish|stats|studio|update|domain|renew/.test(subj))
    return 'Dev';

  // Evite / RSVP
  if (/evite\.com/.test(domain) || /new rsvp from|evite update/.test(subj))
    return 'Evite/RSVP';

  // Schools / Venue
  if (/k12\.fl\.us|\.edu$|facilitron\.com/.test(domain) || /facility use|venue rental|mill creek|cafeteria/.test(subj))
    return 'Schools/Venue';

  // Payments (non-WF)
  if (/paypal\.com|venmo\.com|zelle|cashapp|cash\.app|square\.com|stripe\.com/.test(domain))
    return 'Payments';
  if (/you received \$|payment of \$|money sent|received.*zelle|paid.*\$/.test(subj))
    return 'Payments';
  if (/invoice|receipt|payment confirmation/.test(subj) && !/evite|rsvp/.test(subj))
    return 'Payments';

  // Insurance
  if (/eventsured|insurance|geico|progressive|statefarm|allstate/.test(domain) || /insurance|policy|certificate/.test(subj))
    return 'Insurance/Services';

  // Google Admin
  if (/accounts\.google\.com|no-reply@google\.com|noreply@google\.com|google\.com/.test(email) && /security alert|sign-in|verification|google alert/.test(subj))
    return 'Google/Admin';

  // Wix (non-dev: member notifications, CRM, etc.)
  if (/wix\.com|wixsite/.test(domain))
    return 'Wix Platform';

  // Social / Promo
  if (/facebookmail|instagram|linkedin|twitter|x\.com|youtube|tiktok|nextdoor|meetup|eventbrite|mailchimp|constantcontact|substack|medium\.com/.test(domain))
    return 'Social/Promo';
  if (/unsubscribe|newsletter|digest|weekly update|promotion|offer|sale|discount/.test(subj))
    return 'Social/Promo';

  // Zoom / Meeting tools
  if (/zoom\.us|zoom\.com|teams\.microsoft|webex/.test(domain) || /zoom meeting|join.*meeting/.test(subj))
    return 'Zoom/Meetings';

  // Known EC Members (personal emails)
  const ecEmails = ['ranadhir.ghosh', 'partha', 'amitchandak', 'rajanya', 'moumita', 'soumyajit', 'sumantaghosh', 'rwiti', 'suvankar.paul'];
  if (ecEmails.some(e => email.includes(e)))
    return 'EC Members';

  // Personal / Member emails (gmail, yahoo, outlook etc.)
  if (/gmail\.com|yahoo\.com|hotmail\.com|outlook\.com|aol\.com|icloud\.com|live\.com|msn\.com|comcast\.net|att\.net/.test(domain))
    return 'Members/Personal';

  return 'Other';
}

(async () => {
  console.log('═'.repeat(70));
  console.log('  BANF Inbox Analysis v2 — Real Classification');
  console.log('═'.repeat(70));
  const token = await getToken();
  console.log('  ✓ Authenticated\n');

  // Get ALL inbox message IDs (paginate)
  console.log('  [1] Fetching all inbox message IDs...');
  const allIds = await fetchMsgIds(token, 'in:inbox', 30);
  console.log(`      Total inbox: ${allIds.length}\n`);

  // Fetch metadata for ALL of them (in batches of 20)
  console.log('  [2] Fetching message metadata...');
  const msgs = await fetchMetadata(token, allIds);
  console.log(`\n      Fetched ${msgs.length} messages\n`);

  // Classify
  const cutoff = new Date('2026-02-20T00:00:00Z').getTime();
  const categories = {};

  for (const m of msgs) {
    const cat = classify(m);
    const isOld = m.ts < cutoff;
    if (!categories[cat]) categories[cat] = { total: 0, old: 0, recent: 0, samples: [] };
    categories[cat].total++;
    if (isOld) categories[cat].old++; else categories[cat].recent++;
    if (categories[cat].samples.length < 8) {
      categories[cat].samples.push({
        from: m.from, subject: m.subject, date: m.date,
        isOld, email: ((m.from || '').match(/<([^>]+)>/) || [, m.from])[1]
      });
    }
  }

  // Pre/post cutoff totals
  const totalOld = msgs.filter(m => m.ts < cutoff).length;
  const totalRecent = msgs.length - totalOld;

  console.log('  [3] Classification Results');
  console.log('─'.repeat(70));
  console.log(`  Total: ${msgs.length}  |  Pre Feb-20 → History: ${totalOld}  |  Post Feb-20 → Active: ${totalRecent}`);
  console.log('─'.repeat(70));

  // Sort by total desc
  const sorted = Object.entries(categories).sort((a, b) => b[1].total - a[1].total);

  for (const [name, data] of sorted) {
    console.log(`\n  📂 ${name.padEnd(22)} ${String(data.total).padStart(5)} total  │ ${String(data.old).padStart(5)} → History │ ${String(data.recent).padStart(4)} active`);
    for (const s of data.samples.slice(0, 3)) {
      const who = s.from.replace(/<[^>]+>/, '').replace(/"/g, '').trim().substring(0, 25);
      const flag = s.isOld ? '📜' : '🟢';
      console.log(`     ${flag} ${who.padEnd(26)} ${(s.subject || '').substring(0, 48)}`);
    }
  }

  // Save full results
  const output = {
    scanDate: new Date().toISOString(), totalMessages: msgs.length,
    totalOld, totalRecent, cutoffDate: '2026-02-20',
    categories: sorted.map(([name, d]) => ({ name, ...d })),
    allMessages: msgs.map(m => ({ ...m, category: classify(m), isOld: m.ts < cutoff }))
  };

  fs.writeFileSync(path.join(__dirname, '_inbox-scan-results.json'), JSON.stringify(output, null, 2));
  console.log('\n\n  ✓ Results saved to _inbox-scan-results.json');
  console.log('═'.repeat(70));
})().catch(e => console.error('FATAL:', e.message));
