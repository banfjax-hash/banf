#!/usr/bin/env node
/**
 * ═══════════════════════════════════════════════════════════════════════
 *  BANF Email Inbox Cleanup Agent v2 — Smart Multi-Category Organizer
 * ═══════════════════════════════════════════════════════════════════════
 *
 *  PURPOSE:
 *    Scans the banfjax@gmail.com inbox and classifies ALL emails into
 *    14 Gmail labels. Emails before Feb 20, 2026 also get "History".
 *    Priority categories (EC Members, Schools/Venue, Compliance) stay
 *    in inbox; all others are archived out of inbox.
 *
 *  LABELS:
 *    Wells Fargo, Evite/RSVP, EC Members, Schools/Venue, Members,
 *    Payments, Wix, Community Orgs, Social/Promo, Google/Admin,
 *    Insurance, Zoom, Dev, Compliance, History
 *
 *  USAGE:
 *    node banf-email-inbox-cleanup-agent-v2.js --dry-run        (preview)
 *    node banf-email-inbox-cleanup-agent-v2.js                  (live run)
 *    node banf-email-inbox-cleanup-agent-v2.js --max 500        (limit)
 *    node banf-email-inbox-cleanup-agent-v2.js --batch 50       (batch sz)
 *
 * ═══════════════════════════════════════════════════════════════════════
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const secrets = JSON.parse(fs.readFileSync(path.join(__dirname, '.banf-secrets.json'), 'utf8'));
const CLIENT_ID = secrets.CLIENT_ID;
const CLIENT_SECRET = secrets.CLIENT_SECRET;
const REFRESH_TOKEN = secrets.REFRESH_TOKEN;

// ── CLI Args ────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const argVal = (flag) => { const i = args.indexOf(flag); return i >= 0 && args[i + 1] ? parseInt(args[i + 1], 10) : null; };
const MAX_MESSAGES = argVal('--max') || 0; // 0 = all
const BATCH_SIZE = argVal('--batch') || 10;

// ── History cutoff: Feb 20, 2026 00:00 UTC ──────────────────────────
const HISTORY_CUTOFF = new Date('2026-02-20T00:00:00Z');

// ═══════════════════════════════════════════════════════════════════
//  CATEGORY DEFINITIONS
// ═══════════════════════════════════════════════════════════════════
// Order matters: first match wins. More specific categories come first.

const CATEGORIES = [
  // ── 1. EC Members (PRIORITY — stays in inbox) ──
  {
    name: 'EC Members',
    priority: true, // do NOT remove from inbox
    senders: [
      /ranadhir\.ghosh@gmail\.com/i,
      /ranadhir\.ghosh@.*\.com/i,
      /parthamukho/i,
      /amitchandak/i,
      /rajanyaghosh/i,
      /dr\.moumita/i, /moumita.*ghosh/i,
      /soumyajit.*dutta/i, /soumyajitdutta/i,
      /sumanta.*ghosh/i, /sumantaghosh/i,
      /rwiti/i, /rwitichoudhury/i,
    ],
    subjects: []
  },

  // ── 2. Schools/Venue (PRIORITY — stays in inbox) ──
  {
    name: 'Schools/Venue',
    priority: true,
    senders: [
      /@stjohns\.k12\.fl\.us/i,
      /@facilitron\.com/i,
      /ottosen/i,
      /goodwin.*kenneth/i, /kenneth.*goodwin/i,
    ],
    subjects: [
      /facility\s+use/i,
      /venue\s+(book|rent|request|inquiry)/i,
      /mill\s+creek\s+academy/i,
      /cafeteria\s+(avail|book|rent)/i,
    ]
  },

  // ── 3. Compliance/Legal (PRIORITY — stays in inbox) ──
  {
    name: 'Compliance',
    priority: true,
    senders: [
      /501c3center/i, /my501c3/i,
      /fileflorida/i,
      /irs\.gov/i,
      /sunbiz\.org/i,
    ],
    subjects: [
      /tax.?exempt/i,
      /annual\s+report/i,
      /501\(c\)\(3\)/i, /501c3/i,
      /non.?profit\s+(status|filing|report)/i,
      /florida\s+annual/i,
    ]
  },

  // ── 4. Wells Fargo ──
  {
    name: 'Wells Fargo',
    priority: false,
    senders: [
      /@wellsfargo\.com/i,
      /@notify\.wellsfargo\.com/i,
      /wells\s*fargo/i,
    ],
    subjects: [
      /wells\s*fargo/i,
    ]
  },

  // ── 5. Dev ──
  {
    name: 'Dev',
    priority: false,
    senders: [
      /noreply@github\.com/i,
      /notifications@github\.com/i,
      /@github\.com$/i,
      /deploy@netlify\.com/i,
      /notifications@vercel\.com/i,
      /noreply@npmjs\.com/i,
      /noreply@sentry\.io/i,
      /noreply@cloudflare\.com/i,
      /@circleci\.com/i,
      /@snyk\.io/i,
    ],
    subjects: [
      /\[GitHub\]/i,
      /\bgithub\s+actions\b/i,
      /\bworkflow\s+run\b/i,
      /\bdependabot\b/i,
      /\bci\/cd\b|pipeline|build\s+(failed|passed|succeeded)/i,
      /\bwix\b.*\b(publish|deploy)\b/i,
      /\bcode\s+scanning\b/i,
    ]
  },

  // ── 6. Payments (non-WF) ──
  {
    name: 'Payments',
    priority: false,
    senders: [
      /@paypal\.com/i,
      /service@paypal/i,
      /@venmo\.com/i,
      /@square\.com/i,
      /@cash\.app/i,
      /@stripe\.com/i,
    ],
    subjects: [
      /you\s+received\s+\$/i,
      /payment\s+of\s+\$/i,
      /\binvoice\b.*\$/i,
      /receipt\s+(for|from)/i,
      /refund\s+(of|for)\s+\$/i,
    ]
  },

  // ── 7. Insurance/Services ──
  {
    name: 'Insurance',
    priority: false,
    senders: [
      /eventsured/i,
      /eventhelper/i,
      /geico/i,
      /statefarm/i,
    ],
    subjects: [
      /event\s+insurance/i,
      /\bpolicy\b.*\b(renew|certificate|number)\b/i,
      /\bcertificate\s+of\s+(insurance|liability)\b/i,
    ]
  },

  // ── 8. Zoom/Meetings ──
  {
    name: 'Zoom',
    priority: false,
    senders: [
      /@zoom\.us/i,
      /@zoom\.com/i,
      /no-reply@zoom/i,
    ],
    subjects: [
      /zoom\s+(meeting|webinar|recording)/i,
    ]
  },

  // ── 9. Google/Admin ──
  {
    name: 'Google/Admin',
    priority: false,
    senders: [
      /@accounts\.google\.com/i,
      /no-reply@google\.com/i,
      /noreply@google\.com/i,
      /googlecommunityteam/i,
    ],
    subjects: [
      /security\s+alert/i,
      /sign-in\s+(attempt|notification)/i,
      /verification\s+code/i,
      /google\s+account/i,
    ]
  },

  // ── 10. Wix Platform ──
  {
    name: 'Wix',
    priority: false,
    senders: [
      /@wix\.com/i,
      /@notifications\.wix\.com/i,
      /@wixsite\.com/i,
      /@wixforms\.com/i,
      /wix-team@/i,
      /wix\.studio/i,
    ],
    subjects: [
      /wix\s+(studio|login|confirmation|stats|premium)/i,
      /domain\s+(expir|renew)/i,
    ]
  },

  // ── 11. Evite/RSVP ──
  {
    name: 'Evite/RSVP',
    priority: false,
    senders: [
      /@evite\.com/i,
      /@mailva\.evite\.com/i,
      /@e\.evite\.com/i,
      /evite/i,
    ],
    subjects: [
      /\brsvp\b/i,
      /evite\s+update/i,
      /new\s+rsvp\s+from/i,
      /you.*(invited|invitation)/i,
    ]
  },

  // ── 12. Community Organizations ──
  {
    name: 'Community Orgs',
    priority: false,
    senders: [
      /nabc/i,
      /desiconnect/i,
      /aauc/i,
      /heartfulness/i,
      /asamunity/i,
      /mea\.gov\.in/i,
      /indianembassy/i,
      /pragati/i,
      /fscs\.org/i,
    ],
    subjects: [
      /\bnabc\b/i,
      /desi\s*connect/i,
    ]
  },

  // ── 13. Social/Promo (catch-all for marketing) ──
  {
    name: 'Social/Promo',
    priority: false,
    senders: [
      /instagram/i,
      /facebook/i, /facebookmail\.com/i,
      /linkedin/i,
      /twitter/i, /x\.com/i,
      /youtube/i,
      /harborfreight/i,
      /bartesian/i,
      /neven/i,
      /costco/i,
      /amazon/i,
      /groupon/i,
      /yelp/i,
      /doordash/i,
      /uber/i,
      /nextdoor/i,
      /reddit/i,
      /quora/i,
      /medium\.com/i,
      /substack/i,
      /unsubscribe/i,
    ],
    subjects: [
      /\bunsubscribe\b/i,
      /\bnewsletter\b/i,
      /\d+%\s*off\b/i,
      /\bsale\b.*\b(today|ends|limited)\b/i,
      /\bcoupon\b/i,
      /\bpromotion\b/i,
      /\bfree\s+(shipping|trial|delivery)\b/i,
    ]
  },

  // ── 14. Members/Personal (catch-all for personal emails) ──
  {
    name: 'Members',
    priority: false,
    senders: [
      /@gmail\.com/i,
      /@yahoo\.com/i,
      /@hotmail\.com/i,
      /@outlook\.com/i,
      /@aol\.com/i,
      /@icloud\.com/i,
      /@live\.com/i,
      /@msn\.com/i,
      /@comcast\.net/i,
      /@att\.net/i,
      /@verizon\.net/i,
    ],
    subjects: []
  },
];

// ═══════════════════════════════════════════════════════════════════
//  HTTPS HELPER
// ═══════════════════════════════════════════════════════════════════

function httpsReq(url, opts = {}) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const req = https.request({
      hostname: u.hostname, path: u.pathname + u.search,
      method: opts.method || 'GET',
      headers: opts.headers || {},
      timeout: 30000
    }, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(d) }); }
        catch { resolve({ status: res.statusCode, data: d }); }
      });
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
    if (opts.body) req.write(typeof opts.body === 'string' ? opts.body : JSON.stringify(opts.body));
    req.end();
  });
}

// ═══════════════════════════════════════════════════════════════════
//  GMAIL AUTH
// ═══════════════════════════════════════════════════════════════════

async function getGmailToken() {
  const body = `grant_type=refresh_token&refresh_token=${encodeURIComponent(REFRESH_TOKEN)}&client_id=${encodeURIComponent(CLIENT_ID)}&client_secret=${encodeURIComponent(CLIENT_SECRET)}`;
  const r = await httpsReq('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Content-Length': String(Buffer.byteLength(body)) },
    body
  });
  if (r.data && r.data.access_token) return r.data.access_token;
  throw new Error('Gmail auth failed: ' + ((r.data && r.data.error_description) || JSON.stringify(r.data)));
}

// ═══════════════════════════════════════════════════════════════════
//  GMAIL LABEL MANAGEMENT
// ═══════════════════════════════════════════════════════════════════

async function listLabels(token) {
  const r = await httpsReq('https://gmail.googleapis.com/gmail/v1/users/me/labels', {
    headers: { Authorization: 'Bearer ' + token }
  });
  if (r.data && r.data.labels) return r.data.labels;
  throw new Error('Failed to list labels: ' + JSON.stringify(r.data));
}

async function getOrCreateLabel(token, name, existingLabels) {
  const match = existingLabels.find(l => l.name.toLowerCase() === name.toLowerCase());
  if (match) return match.id;

  // Create it
  const r = await httpsReq('https://gmail.googleapis.com/gmail/v1/users/me/labels', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, labelListVisibility: 'labelShow', messageListVisibility: 'show' })
  });
  if (r.data && r.data.id) return r.data.id;
  // 409 conflict — re-fetch
  if (r.status === 409 || (r.data && r.data.error && r.data.error.code === 409)) {
    const fresh = await listLabels(token);
    const m2 = fresh.find(l => l.name.toLowerCase() === name.toLowerCase());
    if (m2) return m2.id;
  }
  throw new Error(`Failed to create label "${name}": ${JSON.stringify(r.data)}`);
}

// ═══════════════════════════════════════════════════════════════════
//  GMAIL INBOX SEARCH (with pagination)
// ═══════════════════════════════════════════════════════════════════

async function fetchAllInboxIds(token, limit) {
  const allIds = [];
  let pageToken = null;
  const perPage = 500; // Gmail max per page

  while (true) {
    let url = `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent('in:inbox')}&maxResults=${perPage}`;
    if (pageToken) url += `&pageToken=${pageToken}`;

    const r = await httpsReq(url, { headers: { Authorization: 'Bearer ' + token } });
    if (r.data && r.data.error) throw new Error('Search: ' + (r.data.error.message || JSON.stringify(r.data.error)));

    const msgs = (r.data && r.data.messages) || [];
    for (const m of msgs) allIds.push(m.id);

    if (limit > 0 && allIds.length >= limit) {
      return allIds.slice(0, limit);
    }

    pageToken = r.data && r.data.nextPageToken;
    if (!pageToken || msgs.length === 0) break;

    log('INFO', `  ... fetched ${allIds.length} message IDs so far`);
  }

  return allIds;
}

// ═══════════════════════════════════════════════════════════════════
//  MESSAGE METADATA
// ═══════════════════════════════════════════════════════════════════

async function getMessageHeaders(token, msgId) {
  const url = `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msgId}?format=metadata&metadataHeaders=From&metadataHeaders=Subject&metadataHeaders=Date`;
  const r = await httpsReq(url, { headers: { Authorization: 'Bearer ' + token } });
  if (!r.data || r.data.error) return null;
  const headers = (r.data.payload && r.data.payload.headers) || [];
  const getH = name => (headers.find(h => h.name.toLowerCase() === name.toLowerCase()) || {}).value || '';
  return {
    id: msgId,
    from: getH('From'),
    subject: getH('Subject'),
    date: getH('Date'),
    labelIds: r.data.labelIds || [],
    internalDate: r.data.internalDate ? parseInt(r.data.internalDate, 10) : 0,
  };
}

// ═══════════════════════════════════════════════════════════════════
//  MODIFY MESSAGE LABELS
// ═══════════════════════════════════════════════════════════════════

async function modifyMessage(token, msgId, addLabelIds, removeLabelIds) {
  const url = `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msgId}/modify`;
  const r = await httpsReq(url, {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
    body: JSON.stringify({ addLabelIds, removeLabelIds })
  });
  return r.status === 200;
}

// ═══════════════════════════════════════════════════════════════════
//  CLASSIFIER — first match wins
// ═══════════════════════════════════════════════════════════════════

function classifyEmail(msg) {
  const from = msg.from || '';
  const subject = msg.subject || '';

  for (const cat of CATEGORIES) {
    for (const pat of cat.senders) {
      if (pat.test(from)) return { category: cat.name, priority: cat.priority, rule: `sender:${pat.source}` };
    }
    for (const pat of cat.subjects) {
      if (pat.test(subject)) return { category: cat.name, priority: cat.priority, rule: `subject:${pat.source}` };
    }
  }
  return { category: null, priority: false, rule: null };
}

function isHistory(msg) {
  if (msg.internalDate > 0) {
    return new Date(msg.internalDate) < HISTORY_CUTOFF;
  }
  // Fallback: parse the Date header
  const d = new Date(msg.date);
  return !isNaN(d.getTime()) && d < HISTORY_CUTOFF;
}

// ═══════════════════════════════════════════════════════════════════
//  LOGGING
// ═══════════════════════════════════════════════════════════════════

function log(level, msg) {
  const ts = new Date().toISOString().substring(11, 19);
  console.log(`  [${ts}] ${level.padEnd(5)} ${msg}`);
}

// ═══════════════════════════════════════════════════════════════════
//  MAIN
// ═══════════════════════════════════════════════════════════════════

async function main() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  BANF Email Inbox Cleanup Agent v2 — Smart Multi-Category');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`  Mode:       ${DRY_RUN ? 'DRY RUN (preview only)' : 'LIVE (will move emails)'}`);
  console.log(`  Max:        ${MAX_MESSAGES || 'ALL'}`);
  console.log(`  Batch size: ${BATCH_SIZE}`);
  console.log(`  History:    before ${HISTORY_CUTOFF.toISOString().substring(0, 10)}`);
  console.log(`  Categories: ${CATEGORIES.length}`);
  console.log('');

  // ── Step 1: Auth ──
  log('INFO', 'Authenticating with Gmail...');
  const token = await getGmailToken();
  log('INFO', '✅ Gmail authenticated');

  // ── Step 2: Ensure all labels exist ──
  log('INFO', 'Loading existing labels...');
  let labels = await listLabels(token);

  const labelNames = [...new Set(CATEGORIES.map(c => c.name))];
  labelNames.push('History'); // special label

  const labelIdMap = {}; // name → id

  for (const name of labelNames) {
    if (DRY_RUN) {
      const existing = labels.find(l => l.name.toLowerCase() === name.toLowerCase());
      labelIdMap[name] = existing ? existing.id : '(will create)';
      log('INFO', `  Label "${name}": ${existing ? '✅ exists' : '🆕 will be created'}`);
    } else {
      labelIdMap[name] = await getOrCreateLabel(token, name, labels);
      log('INFO', `  Label "${name}": ${labelIdMap[name]}`);
      // Refresh labels list after creation to avoid conflicts
      labels = await listLabels(token);
    }
  }

  // ── Step 3: Fetch inbox message IDs ──
  log('INFO', 'Fetching inbox message IDs (paginating through all)...');
  const msgIds = await fetchAllInboxIds(token, MAX_MESSAGES);
  log('INFO', `Found ${msgIds.length} messages in inbox`);

  if (msgIds.length === 0) {
    log('INFO', 'Inbox empty. Done!');
    return;
  }

  // ── Step 4: Classify each message ──
  log('INFO', `Classifying messages in batches of ${BATCH_SIZE}...`);

  const results = {}; // category → [{ msg, rule, history }]
  results['Uncategorized'] = [];
  for (const cat of CATEGORIES) results[cat.name] = [];

  let processed = 0, historyCount = 0, errorCount = 0;
  const startTime = Date.now();

  for (let i = 0; i < msgIds.length; i += BATCH_SIZE) {
    const batch = msgIds.slice(i, i + BATCH_SIZE);
    const msgs = await Promise.all(batch.map(id => getMessageHeaders(token, id)));

    for (const msg of msgs) {
      if (!msg) { errorCount++; continue; }
      processed++;

      const cls = classifyEmail(msg);
      const hist = isHistory(msg);
      if (hist) historyCount++;

      const entry = {
        id: msg.id,
        from: msg.from,
        subject: msg.subject,
        date: msg.date,
        rule: cls.rule,
        history: hist,
        priority: cls.priority,
        labelIds: msg.labelIds
      };

      if (cls.category) {
        results[cls.category].push(entry);
      } else {
        results['Uncategorized'].push(entry);
      }
    }

    // Progress every 200 messages
    if (processed % 200 === 0 || i + BATCH_SIZE >= msgIds.length) {
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      log('INFO', `  ... classified ${processed}/${msgIds.length} (${elapsed}s)`);
    }

    // Small delay between batches to avoid rate limits
    if (i + BATCH_SIZE < msgIds.length) {
      await new Promise(r => setTimeout(r, 100));
    }
  }

  // ── Step 5: Print summary ──
  console.log('');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  CLASSIFICATION SUMMARY');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('');

  let totalToMove = 0;
  const categoryOrder = [...CATEGORIES.map(c => c.name), 'Uncategorized'];

  for (const cat of categoryOrder) {
    const items = results[cat] || [];
    if (items.length === 0) continue;

    const activeCount = items.filter(e => !e.history).length;
    const histCount = items.filter(e => e.history).length;
    const isPriority = items[0] && items[0].priority;
    const icon = isPriority ? '⚡' : '📂';

    console.log(`  ${icon} ${cat.padEnd(18)} ${String(items.length).padStart(6)} emails  (${activeCount} active, ${histCount} history)${isPriority ? '  [STAYS IN INBOX]' : ''}`);
    totalToMove += items.length;

    // Show up to 3 sample emails per category
    const samples = items.slice(0, 3);
    for (const s of samples) {
      const tag = s.history ? '📜' : '🟢';
      console.log(`     ${tag} ${(s.from || '?').substring(0, 35).padEnd(35)} ${(s.subject || '?').substring(0, 50)}`);
    }
    if (items.length > 3) {
      console.log(`     ... and ${items.length - 3} more`);
    }
    console.log('');
  }

  console.log(`  ─────────────────────────────────────────────────────────`);
  console.log(`  Total classified:  ${processed}`);
  console.log(`  History (pre-Feb-20): ${historyCount}`);
  console.log(`  Uncategorized:     ${(results['Uncategorized'] || []).length}`);
  console.log(`  Metadata errors:   ${errorCount}`);
  console.log('');

  // ── Step 6: Dry-run exit ──
  if (DRY_RUN) {
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('  DRY RUN COMPLETE — No emails were moved.');
    console.log('  Run without --dry-run to apply changes.');
    console.log('═══════════════════════════════════════════════════════════════');

    // Save dry-run report
    const report = { timestamp: new Date().toISOString(), mode: 'dry-run', processed, historyCount, errorCount };
    for (const cat of categoryOrder) {
      report[cat] = { total: (results[cat] || []).length, active: (results[cat] || []).filter(e => !e.history).length };
    }
    fs.writeFileSync(path.join(__dirname, 'banf-email-cleanup-v2-dryrun.json'), JSON.stringify(report, null, 2));
    log('INFO', 'Dry-run report saved to banf-email-cleanup-v2-dryrun.json');
    return;
  }

  // ── Step 7: Apply labels ──
  log('INFO', 'Applying labels to all classified emails...');
  let moved = 0, moveErrors = 0;

  for (const cat of categoryOrder) {
    if (cat === 'Uncategorized') continue; // leave uncategorized alone
    const items = results[cat] || [];
    if (items.length === 0) continue;

    const catLabelId = labelIdMap[cat];
    if (!catLabelId || catLabelId === '(will create)') continue;

    const historyLabelId = labelIdMap['History'];

    log('INFO', `Labeling ${items.length} emails as "${cat}"...`);

    for (let j = 0; j < items.length; j++) {
      const e = items[j];
      try {
        const addIds = [catLabelId];
        const removeIds = [];

        // Add History label if before cutoff
        if (e.history && historyLabelId) {
          addIds.push(historyLabelId);
        }

        // Remove from inbox UNLESS priority category AND active (not history)
        if (e.priority && !e.history) {
          // Priority + active: keep in inbox, just add category label
        } else {
          removeIds.push('INBOX');
        }

        const ok = await modifyMessage(token, e.id, addIds, removeIds);
        if (ok) {
          moved++;
        } else {
          moveErrors++;
        }
      } catch (err) {
        moveErrors++;
        if (moveErrors <= 5) log('WARN', `  Error: ${err.message}`);
      }

      // Rate limit: pause every 20 messages
      if ((j + 1) % 20 === 0 && j + 1 < items.length) {
        await new Promise(r => setTimeout(r, 300));
      }
    }

    log('INFO', `  ✅ "${cat}" done`);
  }

  // ── Step 8: Final summary ──
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log('');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  ✅ INBOX CLEANUP COMPLETE');
  console.log(`     Total scanned:     ${processed}`);
  console.log(`     Labels applied:    ${moved}`);
  console.log(`     History tagged:    ${historyCount}`);
  console.log(`     Errors:            ${moveErrors}`);
  console.log(`     Uncategorized:     ${(results['Uncategorized'] || []).length} (left in inbox)`);
  console.log(`     Time:              ${elapsed}s`);
  console.log('═══════════════════════════════════════════════════════════════');

  // Save run log
  const logEntry = {
    timestamp: new Date().toISOString(),
    mode: 'live',
    scanned: processed,
    moved,
    errors: moveErrors,
    historyCount,
    uncategorized: (results['Uncategorized'] || []).length,
    elapsed: parseFloat(elapsed),
    categories: {}
  };
  for (const cat of categoryOrder) {
    logEntry.categories[cat] = (results[cat] || []).length;
  }

  const logFile = path.join(__dirname, 'banf-email-cleanup-v2-log.json');
  let logs = [];
  try { logs = JSON.parse(fs.readFileSync(logFile, 'utf8')); } catch {}
  logs.push(logEntry);
  if (logs.length > 50) logs = logs.slice(-50);
  fs.writeFileSync(logFile, JSON.stringify(logs, null, 2));
  log('INFO', 'Run log saved to banf-email-cleanup-v2-log.json');
}

main().catch(e => {
  console.error('❌ Fatal error:', e.message);
  process.exit(1);
});
