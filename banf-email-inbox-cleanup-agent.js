#!/usr/bin/env node
/**
 * ═══════════════════════════════════════════════════════════════════════
 *  BANF Email Inbox Cleanup Agent — Dev Folder Organizer
 * ═══════════════════════════════════════════════════════════════════════
 *
 *  PURPOSE:
 *    Scans the banfjax@gmail.com inbox and moves all dev-related emails
 *    to a "Dev" label/folder. Dev emails include:
 *      - GitHub notifications (commits, PRs, issues, actions)
 *      - CI/CD alerts (Netlify, Vercel, Wix deploy)
 *      - Error/exception alerts (Sentry, LogRocket)
 *      - NPM / package update notifications
 *      - Domain / DNS / SSL notifications
 *      - Automated system emails (cron, monitoring)
 *
 *  USAGE:
 *    node banf-email-inbox-cleanup-agent.js                    (live run)
 *    node banf-email-inbox-cleanup-agent.js --dry-run          (preview only)
 *    node banf-email-inbox-cleanup-agent.js --max 50           (limit messages)
 *    node banf-email-inbox-cleanup-agent.js --days 30          (last N days only)
 *
 * ═══════════════════════════════════════════════════════════════════════
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

// ── Config ───────────────────────────────────────────────────────────
const secrets = JSON.parse(fs.readFileSync(path.join(__dirname, '.banf-secrets.json'), 'utf8'));

const CREDENTIALS = [
    { id: secrets.CLIENT_ID, secret: secrets.CLIENT_SECRET }
];
const REFRESH_TOKEN = secrets.REFRESH_TOKEN;

const DEV_LABEL_NAME = 'Dev';

// Parse CLI args
const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const maxIdx = args.indexOf('--max');
const MAX_MESSAGES = maxIdx >= 0 && args[maxIdx + 1] ? parseInt(args[maxIdx + 1], 10) : 200;
const daysIdx = args.indexOf('--days');
const DAYS_BACK = daysIdx >= 0 && args[daysIdx + 1] ? parseInt(args[daysIdx + 1], 10) : 0;

// ── Dev Email Classification Rules ──────────────────────────────────
const DEV_SENDER_PATTERNS = [
    /noreply@github\.com/i,
    /notifications@github\.com/i,
    /@github\.com$/i,
    /no-reply@wix\.com/i,
    /deploy@netlify\.com/i,
    /notifications@vercel\.com/i,
    /noreply@npmjs\.com/i,
    /noreply@sentry\.io/i,
    /noreply@cloudflare\.com/i,
    /team@render\.com/i,
    /no-reply@google-cloud\.com/i,
    /noreply@heroku\.com/i,
    /notify@launchdarkly\.com/i,
    /@circleci\.com/i,
    /@travis-ci\.com/i,
    /@snyk\.io/i,
    /alerts?@(datadog|pagerduty|opsgenie)/i,
];

const DEV_SUBJECT_PATTERNS = [
    /\[GitHub\]/i,
    /pull request/i,
    /\bcommit\b/i,
    /\bmerge\b.*\bbranch\b/i,
    /ci\/cd|pipeline|build\s+(failed|passed|succeeded)/i,
    /deploy(ment|ed|ing)/i,
    /\berror\b.*\bproduction\b/i,
    /exception|stack\s?trace|crash\s?report/i,
    /npm\s+(update|audit|advisory)/i,
    /security\s+(advisory|vulnerability|patch)/i,
    /\[security\]\s+alert/i,
    /ssl\s+certificate/i,
    /dns\s+(update|change|record)/i,
    /domain\s+(expir|renew)/i,
    /github\s+actions/i,
    /workflow\s+run/i,
    /dependabot/i,
    /code\s+scanning/i,
    /\bwix\b.*\b(publish|deploy|update)\b/i,
];

// ── HTTPS Helper ────────────────────────────────────────────────────
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

// ── Gmail OAuth2 Token ──────────────────────────────────────────────
async function getGmailToken() {
    let lastErr = '';
    for (const cred of CREDENTIALS) {
        const body = `grant_type=refresh_token&refresh_token=${encodeURIComponent(REFRESH_TOKEN)}&client_id=${encodeURIComponent(cred.id)}&client_secret=${encodeURIComponent(cred.secret)}`;
        const r = await httpsReq('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Content-Length': String(Buffer.byteLength(body)) },
            body
        });
        if (r.data && r.data.access_token) return r.data.access_token;
        lastErr = (r.data && (r.data.error_description || r.data.error)) || 'Unknown';
    }
    throw new Error('Gmail auth failed: ' + lastErr);
}

// ── Gmail Label Management ──────────────────────────────────────────
async function listLabels(token) {
    const r = await httpsReq('https://gmail.googleapis.com/gmail/v1/users/me/labels', {
        headers: { Authorization: 'Bearer ' + token }
    });
    if (r.data && r.data.labels) return r.data.labels;
    throw new Error('Failed to list labels: ' + JSON.stringify(r.data));
}

async function createLabel(token, name) {
    const r = await httpsReq('https://gmail.googleapis.com/gmail/v1/users/me/labels', {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
        body: JSON.stringify({
            name: name,
            labelListVisibility: 'labelShow',
            messageListVisibility: 'show'
        })
    });
    if (r.data && r.data.id) return r.data;
    throw new Error('Failed to create label: ' + JSON.stringify(r.data));
}

async function getOrCreateDevLabel(token) {
    const labels = await listLabels(token);
    const existing = labels.find(l => l.name === DEV_LABEL_NAME);
    if (existing) {
        log('INFO', `Label "${DEV_LABEL_NAME}" already exists (id: ${existing.id})`);
        return existing.id;
    }
    log('INFO', `Creating label "${DEV_LABEL_NAME}"...`);
    const created = await createLabel(token, DEV_LABEL_NAME);
    log('INFO', `Label created (id: ${created.id})`);
    return created.id;
}

// ── Gmail Search & Message Operations ───────────────────────────────
async function searchInbox(token, maxResults) {
    let query = 'in:inbox';
    if (DAYS_BACK > 0) {
        const d = new Date();
        d.setDate(d.getDate() - DAYS_BACK);
        query += ` after:${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`;
    }
    const url = `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(query)}&maxResults=${maxResults}`;
    const r = await httpsReq(url, { headers: { Authorization: 'Bearer ' + token } });
    if (r.data && r.data.error) throw new Error('Search: ' + (r.data.error.message || JSON.stringify(r.data.error)));
    return (r.data && r.data.messages) ? r.data.messages.map(m => m.id) : [];
}

async function getMessageHeaders(token, msgId) {
    const url = `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msgId}?format=metadata&metadataHeaders=From&metadataHeaders=Subject&metadataHeaders=Date`;
    const r = await httpsReq(url, { headers: { Authorization: 'Bearer ' + token } });
    if (r.data && r.data.error) return null;
    const headers = (r.data.payload && r.data.payload.headers) || [];
    const getH = name => (headers.find(h => h.name.toLowerCase() === name.toLowerCase()) || {}).value || '';
    return {
        id: msgId,
        from: getH('From'),
        subject: getH('Subject'),
        date: getH('Date'),
        labelIds: r.data.labelIds || []
    };
}

async function moveToLabel(token, msgId, labelId) {
    const url = `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msgId}/modify`;
    const r = await httpsReq(url, {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
        body: JSON.stringify({
            addLabelIds: [labelId],
            removeLabelIds: ['INBOX']
        })
    });
    return r.status === 200;
}

// ── Classification ──────────────────────────────────────────────────
function isDevEmail(msg) {
    const from = msg.from || '';
    const subject = msg.subject || '';

    for (const pat of DEV_SENDER_PATTERNS) {
        if (pat.test(from)) return { match: true, reason: `sender: ${from.substring(0, 60)}`, rule: pat.source };
    }
    for (const pat of DEV_SUBJECT_PATTERNS) {
        if (pat.test(subject)) return { match: true, reason: `subject: ${subject.substring(0, 60)}`, rule: pat.source };
    }
    return { match: false };
}

// ── Logging ─────────────────────────────────────────────────────────
function log(level, msg) {
    const ts = new Date().toISOString().substring(11, 19);
    console.log(`  [${ts}] ${level.padEnd(5)} ${msg}`);
}

// ── Main ────────────────────────────────────────────────────────────
async function main() {
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('  BANF Email Inbox Cleanup Agent — Dev Folder Organizer');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log(`  Mode:         ${DRY_RUN ? 'DRY RUN (preview only)' : 'LIVE (will move emails)'}`);
    console.log(`  Max messages: ${MAX_MESSAGES}`);
    console.log(`  Days back:    ${DAYS_BACK || 'all'}`);
    console.log(`  Dev label:    ${DEV_LABEL_NAME}`);
    console.log('');

    // Step 1: Authenticate
    log('INFO', 'Authenticating with Gmail...');
    const token = await getGmailToken();
    log('INFO', '✅ Gmail authenticated');

    // Step 2: Ensure Dev label exists
    let devLabelId = null;
    if (!DRY_RUN) {
        devLabelId = await getOrCreateDevLabel(token);
    } else {
        const labels = await listLabels(token);
        const existing = labels.find(l => l.name === DEV_LABEL_NAME);
        devLabelId = existing ? existing.id : '(will be created)';
        log('INFO', `Label "${DEV_LABEL_NAME}": ${existing ? 'exists (id: ' + existing.id + ')' : 'will be created on live run'}`);
    }

    // Step 3: Search inbox
    log('INFO', 'Searching inbox...');
    const msgIds = await searchInbox(token, MAX_MESSAGES);
    log('INFO', `Found ${msgIds.length} messages in inbox`);

    if (msgIds.length === 0) {
        log('INFO', 'No messages to process. Done.');
        return;
    }

    // Step 4: Classify each message
    log('INFO', 'Classifying messages...');
    const devEmails = [];
    const nonDevEmails = [];
    let processed = 0;

    // Process in batches of 10 to avoid rate limits
    for (let i = 0; i < msgIds.length; i += 10) {
        const batch = msgIds.slice(i, i + 10);
        const results = await Promise.all(batch.map(id => getMessageHeaders(token, id)));

        for (const msg of results) {
            if (!msg) continue;
            processed++;
            const check = isDevEmail(msg);
            if (check.match) {
                devEmails.push({ ...msg, matchRule: check.rule, matchReason: check.reason });
            } else {
                nonDevEmails.push(msg);
            }
        }

        if (i + 10 < msgIds.length) {
            // Small delay between batches
            await new Promise(r => setTimeout(r, 200));
        }
    }

    log('INFO', `Classified ${processed} messages: ${devEmails.length} dev, ${nonDevEmails.length} non-dev`);

    // Step 5: Show dev emails
    if (devEmails.length > 0) {
        console.log('');
        console.log('── Dev Emails to Move ─────────────────────────────────────────');
        for (const e of devEmails) {
            console.log(`  📧 ${e.date || '?'}`);
            console.log(`     From:    ${e.from.substring(0, 80)}`);
            console.log(`     Subject: ${e.subject.substring(0, 80)}`);
            console.log(`     Rule:    ${e.matchRule}`);
            console.log('');
        }
    }

    // Step 6: Move emails (or dry-run)
    if (DRY_RUN) {
        console.log('═══════════════════════════════════════════════════════════════');
        console.log(`  DRY RUN COMPLETE — ${devEmails.length} emails would be moved to "${DEV_LABEL_NAME}"`);
        console.log(`  Run without --dry-run to actually move them.`);
        console.log('═══════════════════════════════════════════════════════════════');
        return;
    }

    if (devEmails.length === 0) {
        log('INFO', 'No dev emails found. Inbox is clean!');
        return;
    }

    log('INFO', `Moving ${devEmails.length} emails to "${DEV_LABEL_NAME}" label...`);
    let moved = 0, errors = 0;

    for (let i = 0; i < devEmails.length; i++) {
        const e = devEmails[i];
        try {
            const ok = await moveToLabel(token, e.id, devLabelId);
            if (ok) {
                moved++;
            } else {
                log('WARN', `Failed to move: ${e.subject.substring(0, 50)}`);
                errors++;
            }
        } catch (err) {
            log('WARN', `Error moving ${e.id}: ${err.message}`);
            errors++;
        }

        // Rate limit: small delay every 5 messages
        if ((i + 1) % 5 === 0 && i + 1 < devEmails.length) {
            await new Promise(r => setTimeout(r, 300));
        }
    }

    // Step 7: Summary
    console.log('');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log(`  ✅ Cleanup Complete`);
    console.log(`     Total inbox messages scanned: ${processed}`);
    console.log(`     Dev emails moved to "${DEV_LABEL_NAME}": ${moved}`);
    console.log(`     Errors: ${errors}`);
    console.log(`     Non-dev emails left in inbox: ${nonDevEmails.length}`);
    console.log('═══════════════════════════════════════════════════════════════');

    // Save run log
    const logEntry = {
        timestamp: new Date().toISOString(),
        mode: 'live',
        scanned: processed,
        moved,
        errors,
        nonDev: nonDevEmails.length
    };
    const logFile = path.join(__dirname, 'banf-email-cleanup-log.json');
    let logs = [];
    try { logs = JSON.parse(fs.readFileSync(logFile, 'utf8')); } catch {}
    logs.push(logEntry);
    // Keep last 50 runs
    if (logs.length > 50) logs = logs.slice(-50);
    fs.writeFileSync(logFile, JSON.stringify(logs, null, 2));
    log('INFO', `Run log saved to banf-email-cleanup-log.json`);
}

main().catch(e => {
    console.error('❌ Fatal error:', e.message);
    process.exit(1);
});
