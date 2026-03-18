#!/usr/bin/env node
/**
 * Smart inbox analysis using Gmail search queries for category counts + samples.
 * Instead of fetching all 11K+ messages, uses targeted searches.
 */
const https = require('https');
const fs = require('fs');
const path = require('path');

const secrets = JSON.parse(fs.readFileSync(path.join(__dirname, '.banf-secrets.json'), 'utf8'));

function httpsReq(url, opts = {}) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const o = {
      hostname: u.hostname, port: 443,
      path: u.pathname + u.search,
      method: opts.method || 'GET',
      headers: opts.headers || {},
      timeout: 30000
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
  const body = `grant_type=refresh_token&refresh_token=${encodeURIComponent(secrets.REFRESH_TOKEN)}&client_id=${encodeURIComponent(secrets.CLIENT_ID)}&client_secret=${encodeURIComponent(secrets.CLIENT_SECRET)}`;
  const r = await httpsReq('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Content-Length': Buffer.byteLength(body) },
    body
  });
  return r.access_token;
}

async function searchCount(token, query) {
  // Get message count for a query using resultSizeEstimate
  const url = `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(query)}&maxResults=1`;
  const r = await httpsReq(url, { headers: { Authorization: 'Bearer ' + token } });
  return r.resultSizeEstimate || 0;
}

async function searchSamples(token, query, max = 5) {
  const url = `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(query)}&maxResults=${max}`;
  const r = await httpsReq(url, { headers: { Authorization: 'Bearer ' + token } });
  if (!r.messages) return [];
  const samples = [];
  for (const m of r.messages) {
    const msg = await httpsReq(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${m.id}?format=metadata&metadataHeaders=From&metadataHeaders=Subject&metadataHeaders=Date`, {
      headers: { Authorization: 'Bearer ' + token }
    });
    const headers = (msg.payload && msg.payload.headers) || [];
    const getH = n => (headers.find(h => h.name.toLowerCase() === n.toLowerCase()) || {}).value || '';
    samples.push({ id: m.id, from: getH('From'), subject: getH('Subject'), date: getH('Date'), labels: msg.labelIds || [] });
  }
  return samples;
}

// Define the proposed categories with Gmail search queries
const CATEGORIES = [
  {
    label: 'Wells Fargo',
    icon: '🏦',
    description: 'All Wells Fargo bank emails - statements, Zelle notifications, alerts, security',
    queries: { inbox: 'in:inbox from:wellsfargo.com OR from:notify.wellsfargo.com OR from:alerts@notify.wellsfargo.com' },
    pipeline: 'payment/financial',
    color: '#d71e28'
  },
  {
    label: 'Dev',
    icon: '💻',
    description: 'GitHub notifications, CI/CD, Wix deploy, domain/SSL alerts',
    queries: { inbox: 'in:inbox (from:github.com OR from:wix.com OR from:netlify.com OR from:vercel.com OR from:npmjs.com OR from:sentry.io OR from:cloudflare.com OR subject:"github actions" OR subject:"workflow run" OR subject:dependabot OR subject:"domain renewal" OR subject:"domain expir")' },
    pipeline: 'dev-ops',
    color: '#238636'
  },
  {
    label: 'Evite/RSVP',
    icon: '🎉',
    description: 'Evite notifications, RSVPs, event responses',
    queries: { inbox: 'in:inbox (from:evite.com OR subject:RSVP OR subject:evite)' },
    pipeline: 'bosonto/event',
    color: '#e91e63'
  },
  {
    label: 'Payments',
    icon: '💰',
    description: 'Zelle, PayPal, Venmo payment notifications (non-WF)',
    queries: { inbox: 'in:inbox (from:paypal.com OR from:venmo.com OR subject:"you received" OR subject:"payment received" OR subject:"money sent") -from:wellsfargo.com' },
    pipeline: 'payment-purpose-engine',
    color: '#00bcd4'
  },
  {
    label: 'Membership',
    icon: '🪪',
    description: 'Membership inquiries, renewal requests, fee questions from members',
    queries: { inbox: 'in:inbox (subject:membership OR subject:"member fee" OR subject:"annual dues" OR subject:renewal OR subject:"membership drive")' },
    pipeline: 'membership-drive',
    color: '#ff9800'
  },
  {
    label: 'Schools/Venue',
    icon: '🏫',
    description: 'School district, venue booking, facility use correspondence',
    queries: { inbox: 'in:inbox (from:stjohns.k12.fl.us OR from:facilitron.com OR subject:"facility use" OR subject:"venue" OR subject:"Mill Creek" OR subject:"cafeteria")' },
    pipeline: 'venue-booking',
    color: '#4caf50'
  },
  {
    label: 'Google/Admin',
    icon: '🔧',
    description: 'Google Workspace, Google Alerts, admin notifications',
    queries: { inbox: 'in:inbox (from:no-reply@accounts.google.com OR from:noreply@google.com OR from:google-workspace OR from:admin@google.com OR subject:"Google Alert" OR subject:"security alert")' },
    pipeline: 'admin',
    color: '#4285f4'
  },
  {
    label: 'Social/Promo',
    icon: '📣',
    description: 'Social media, marketing, newsletters, promotional emails',
    queries: { inbox: 'in:inbox (from:facebookmail.com OR from:linkedin.com OR from:nextdoor.com OR from:meetup.com OR from:eventbrite.com OR from:mailchimp.com OR from:constantcontact.com OR category:promotions OR category:social)' },
    pipeline: 'archive',
    color: '#9c27b0'
  },
  {
    label: 'Insurance/Services',
    icon: '📋',
    description: 'Insurance, utilities, services, government correspondence',
    queries: { inbox: 'in:inbox (from:geico.com OR from:progressive.com OR from:statefarm.com OR from:allstate.com OR from:fpl.com OR from:jea.com OR subject:insurance OR subject:policy)' },
    pipeline: 'admin',
    color: '#795548'
  },
  {
    label: 'EC Members',
    icon: '👥',
    description: 'Emails from known EC members and active BANF volunteers',
    queries: { inbox: 'in:inbox (from:ranadhir.ghosh@gmail.com OR from:partha OR from:amitchandak OR from:rajanya OR from:moumita OR from:soumyajit OR from:sumantaghosh OR from:rwiti)' },
    pipeline: 'ec-priority',
    color: '#f44336'
  },
];

(async () => {
  console.log('═'.repeat(70));
  console.log('  BANF Inbox Smart Analysis — Category Planning');
  console.log('═'.repeat(70));

  const token = await getToken();
  console.log('  Authenticated ✓\n');

  // Get total inbox count
  const totalInbox = await searchCount(token, 'in:inbox');
  console.log(`  Total inbox messages: ${totalInbox}\n`);

  // History cutoff counts
  const preCutoff = await searchCount(token, 'in:inbox before:2026/02/20');
  const postCutoff = await searchCount(token, 'in:inbox after:2026/02/20');
  console.log(`  Pre Feb 20, 2026 (→ History): ${preCutoff}`);
  console.log(`  Post Feb 20, 2026 (→ Active):  ${postCutoff}\n`);

  const results = [];

  for (const cat of CATEGORIES) {
    process.stdout.write(`  Scanning ${cat.icon} ${cat.label}...`);
    const count = await searchCount(token, cat.queries.inbox);
    const preCutCount = await searchCount(token, cat.queries.inbox + ' before:2026/02/20');
    const postCutCount = count - preCutCount;
    const samples = await searchSamples(token, cat.queries.inbox, 5);
    results.push({ ...cat, count, preCutoff: preCutCount, postCutoff: postCutCount, samples });
    console.log(` ${count} (${preCutCount} history / ${postCutCount} active)`);
  }

  // Get uncategorized estimate
  const catQueries = CATEGORIES.map(c => `(${c.queries.inbox.replace('in:inbox ', '')})`).join(' OR ');
  // Can't easily negate all, but get an approximation
  console.log(`\n  Approximate coverage: ${results.reduce((s, r) => s + r.count, 0)} matches (some overlap expected)`);

  // Sort by count
  results.sort((a, b) => b.count - a.count);

  console.log('\n── Category Summary ────────────────────────────────────');
  for (const r of results) {
    console.log(`  ${r.icon} ${r.label.padEnd(20)} ${String(r.count).padStart(5)} total | ${String(r.preCutoff).padStart(5)} → History | ${String(r.postCutoff).padStart(4)} active`);
    // Print first 3 samples
    for (const s of r.samples.slice(0, 3)) {
      const name = s.from.replace(/<[^>]+>/, '').replace(/"/g, '').trim().substring(0, 25);
      console.log(`     └ ${name.padEnd(26)} ${(s.subject || '(no subject)').substring(0, 50)}`);
    }
  }

  // Save for HTML generation
  const output = {
    scanDate: new Date().toISOString(),
    totalInbox, preCutoff, postCutoff,
    categories: results
  };
  fs.writeFileSync(path.join(__dirname, '_inbox-scan-results.json'), JSON.stringify(output, null, 2));
  console.log('\n  Results saved to _inbox-scan-results.json');
  console.log('═'.repeat(70));
})().catch(e => console.error('FATAL:', e.message));
