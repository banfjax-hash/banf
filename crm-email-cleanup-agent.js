#!/usr/bin/env node
/**
 * ═══════════════════════════════════════════════════════════════
 *  BANF CRM Email Cleanup Agent v2.0
 * ═══════════════════════════════════════════════════════════════
 *
 *  Phase 1: Scan Gmail for delivery failures (bounces)
 *    - address_not_found → deactivate in CRM
 *    - mailbox_full → keep in CRM, flag as temporary
 *    - rejected/blocked → deactivate in CRM
 *
 *  Phase 2: Scan Gmail for corporate/auto-reply responses to evite
 *    - Out-of-office, business auto-replies → move to CorporateRecipients
 *    - Detect patterns: "out of office", "auto-reply", "automatic reply",
 *      corporate signatures, business disclaimers
 *
 *  Phase 3: Call Wix backend endpoints to apply changes
 *    - POST /crm_email_cleanup   (bounces)
 *    - POST /crm_corporate_filter (corporate/auto-reply)
 *
 *  Phase 4: Generate HTML dashboard report
 *
 *  Usage:
 *    node crm-email-cleanup-agent.js --dry-run     Scan & analyze only
 *    node crm-email-cleanup-agent.js --send        Scan, analyze, and apply
 *    node crm-email-cleanup-agent.js --report       Report from existing state
 *
 * ═══════════════════════════════════════════════════════════════
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

// ── Config ──────────────────────────────────────────────────
const CONFIG = {
    BASE_HOST: 'www.jaxbengali.org',
    GMAIL: {
        CLIENT_ID: '1020178199135-3usrl611ara38i7rhu2ub6sn6g1150ml.apps.googleusercontent.com',
        CLIENT_SECRET: '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',
        REFRESH_TOKEN: require('./banf-gmail-config').REFRESH_TOKEN,
    },
    SCAN_SINCE: '2026/03/01',
    STATE_FILE: path.join(__dirname, 'crm-cleanup-state.json'),
    LOG_FILE: path.join(__dirname, 'crm-cleanup-agent.log'),
    REPORT_FILE: path.join(__dirname, 'crm-cleanup-report.html'),
};

const ARGS = process.argv.slice(2);
const DRY_RUN = ARGS.includes('--dry-run');
const DO_SEND = ARGS.includes('--send');
const REPORT_ONLY = ARGS.includes('--report');

if (!DRY_RUN && !DO_SEND && !REPORT_ONLY) {
    console.log('Usage: node crm-email-cleanup-agent.js [--dry-run | --send | --report]');
    process.exit(0);
}

// ── Logging ─────────────────────────────────────────────────
function log(level, msg) {
    const ts = new Date().toISOString();
    const line = `[${ts}] [${level}] ${msg}`;
    console.log(line);
    try { fs.appendFileSync(CONFIG.LOG_FILE, line + '\n'); } catch {}
}

// ── State ───────────────────────────────────────────────────
function loadState() {
    try {
        if (fs.existsSync(CONFIG.STATE_FILE))
            return JSON.parse(fs.readFileSync(CONFIG.STATE_FILE, 'utf8'));
    } catch {}
    return {
        processedBounceIds: [],
        processedAutoReplyIds: [],
        bounces: [],
        corporateEmails: [],
        stats: { totalScanned: 0, totalBounces: 0, totalAutoReplies: 0, totalDeactivated: 0, totalCorporateMoved: 0 },
        createdAt: new Date().toISOString()
    };
}
function saveState(state) {
    state.lastSaved = new Date().toISOString();
    fs.writeFileSync(CONFIG.STATE_FILE, JSON.stringify(state, null, 2));
}

// ── HTTP Helpers ────────────────────────────────────────────
function httpsRequest(url, options = {}) {
    return new Promise((resolve, reject) => {
        const u = new URL(url);
        const opts = {
            hostname: u.hostname, port: 443,
            path: u.pathname + u.search,
            method: options.method || 'GET',
            headers: options.headers || {},
            timeout: 60000
        };
        const req = https.request(opts, res => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try { resolve({ status: res.statusCode, data: JSON.parse(data) }); }
                catch { resolve({ status: res.statusCode, data }); }
            });
        });
        req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
        req.on('error', reject);
        if (options.body) req.write(options.body);
        req.end();
    });
}

function apiPost(endpoint, body) {
    const data = JSON.stringify(body);
    return httpsRequest(`https://${CONFIG.BASE_HOST}/_functions/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) },
        body: data
    });
}

async function getGmailToken() {
    const body = `grant_type=refresh_token&refresh_token=${encodeURIComponent(CONFIG.GMAIL.REFRESH_TOKEN)}&client_id=${encodeURIComponent(CONFIG.GMAIL.CLIENT_ID)}&client_secret=${encodeURIComponent(CONFIG.GMAIL.CLIENT_SECRET)}`;
    const resp = await httpsRequest('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Content-Length': Buffer.byteLength(body) },
        body
    });
    if (!resp.data.access_token) throw new Error('Gmail token failed');
    return resp.data.access_token;
}

async function gmailSearch(query, token, max = 100) {
    const url = `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(query)}&maxResults=${max}`;
    const resp = await httpsRequest(url, { headers: { Authorization: `Bearer ${token}` } });
    return (resp.data.messages || []).map(m => m.id);
}

async function gmailGetMessage(id, token) {
    const url = `https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}?format=full`;
    const resp = await httpsRequest(url, { headers: { Authorization: `Bearer ${token}` } });
    const msg = resp.data;
    const headers = (msg.payload?.headers || []);
    const getH = name => (headers.find(h => h.name.toLowerCase() === name.toLowerCase()) || {}).value || '';

    let bodyText = '';
    function extractParts(part) {
        if (part.mimeType === 'text/plain' && part.body?.data) {
            try { bodyText += Buffer.from(part.body.data, 'base64').toString('utf8'); } catch {}
        }
        if (part.parts) part.parts.forEach(extractParts);
    }
    extractParts(msg.payload || {});

    return {
        id,
        from: getH('From'),
        to: getH('To'),
        subject: getH('Subject'),
        date: getH('Date'),
        body: bodyText.trim(),
        autoSubmitted: getH('Auto-Submitted'),
        precedence: getH('Precedence'),
        xAutoResponseSuppress: getH('X-Auto-Response-Suppress')
    };
}

// ── Bounce Detection ────────────────────────────────────────
function isBounceEmail(from, subject) {
    const f = (from || '').toLowerCase();
    const s = (subject || '').toLowerCase();
    return f.includes('mailer-daemon') || f.includes('postmaster') ||
        s.includes('delivery status notification') || s.includes('undeliverable') ||
        s.includes('mail delivery') || s.includes('delivery failure');
}

function parseBounceEmail(msg) {
    const body = msg.body || '';
    const bodyLower = body.toLowerCase();

    // Extract failed recipient
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    const allEmails = [...new Set((body.match(emailRegex) || []))];
    const failedEmail = allEmails.find(e => {
        const el = e.toLowerCase();
        return !el.includes('mailer-daemon') && !el.includes('postmaster') &&
            !el.includes('banfjax') && !el.includes('google.com') && !el.includes('googlemail.com');
    });

    let reasonCode = 'unknown';
    let isTemporary = false;
    let details = 'Unknown delivery failure';

    if (bodyLower.includes('out of storage') || bodyLower.includes('over quota') || bodyLower.includes('mailbox full')) {
        reasonCode = 'mailbox_full'; isTemporary = true;
        details = 'Recipient mailbox is full / over quota';
    } else if (bodyLower.includes('does not exist') || bodyLower.includes('user unknown') ||
        bodyLower.includes('no such user') || bodyLower.includes('account not found') ||
        bodyLower.includes('invalid recipient') || bodyLower.includes('address rejected')) {
        reasonCode = 'address_not_found'; isTemporary = false;
        details = 'Email address does not exist';
    } else if (bodyLower.includes('rejected') || bodyLower.includes('blocked') ||
        bodyLower.includes('spam') || bodyLower.includes('denied')) {
        reasonCode = 'rejected'; isTemporary = false;
        details = 'Email was rejected by recipient server';
    } else if (bodyLower.includes('connection timed out') || bodyLower.includes('temporarily') ||
        bodyLower.includes('try again') || bodyLower.includes('delay')) {
        reasonCode = 'temporary_failure'; isTemporary = true;
        details = 'Temporary delivery failure — will retry';
    }

    return { failedEmail: failedEmail ? failedEmail.toLowerCase() : null, reasonCode, isTemporary, details, gmailId: msg.id };
}

// ── Auto-Reply / Corporate Detection ────────────────────────
function isAutoReply(msg) {
    // RFC 3834 headers
    if (msg.autoSubmitted && msg.autoSubmitted !== 'no') return true;
    if ((msg.precedence || '').toLowerCase() === 'auto_reply') return true;
    if (msg.xAutoResponseSuppress) return true;

    const s = (msg.subject || '').toLowerCase();
    const b = (msg.body || '').toLowerCase();
    const f = (msg.from || '').toLowerCase();

    // Subject patterns
    const autoSubjectPatterns = [
        'out of office', 'out of the office', 'automatic reply', 'auto-reply',
        'auto reply', 'autoreply', 'away from office', 'on vacation',
        'i am currently out', 'this is an auto', 'do not reply',
        'delivery status', 'read receipt', 'returned mail'
    ];
    if (autoSubjectPatterns.some(p => s.includes(p))) return true;

    // Body patterns indicating corporate/auto-reply
    const autoBodyPatterns = [
        'i am currently out of the office',
        'i am out of the office',
        'this is an automated response',
        'this is an automatic reply',
        'this mailbox is not monitored',
        'do-not-reply',
        'noreply@',
        'i will be out of the office',
        'i will respond to your email',
        'i am away from',
        'limited access to email',
        'please contact my colleague',
        'for immediate assistance',
        'this email address is not monitored'
    ];
    if (autoBodyPatterns.some(p => b.includes(p))) return true;

    // From patterns — role accounts / no-reply
    const noReplyPatterns = ['noreply', 'no-reply', 'do-not-reply', 'donotreply', 'auto@', 'system@', 'notification@'];
    if (noReplyPatterns.some(p => f.includes(p))) return true;

    return false;
}

function isCorporateEmail(msg) {
    const b = (msg.body || '').toLowerCase();
    const f = (msg.from || '').toLowerCase();

    // Corporate disclaimer patterns
    const corporatePatterns = [
        'this email and any attachments are confidential',
        'this message is intended only for',
        'if you are not the intended recipient',
        'this communication is privileged',
        'this e-mail is confidential',
        'legal disclaimer',
        'notice of confidentiality',
        'privileged and confidential'
    ];

    // Corporate domain indicators from the evite response
    const corporateDomains = [
        'buzzcms.net', 'occamsadvisory.com', 'sagirealty.com', 'britbanglacovid.com',
        'tohfabd.com', 'janprojacksonville.com', 'capitalcitycleanguild.com'
    ];

    const domain = f.match(/@([a-z0-9.-]+)/)?.[1] || '';

    // Check body for corporate disclaimers
    if (corporatePatterns.some(p => b.includes(p))) return { isCorporate: true, reason: 'corporate_disclaimer' };

    // Check if from a known corporate domain
    if (corporateDomains.some(d => domain.includes(d))) return { isCorporate: true, reason: 'corporate_domain' };

    return { isCorporate: false };
}

function extractSenderEmail(fromStr) {
    const match = fromStr.match(/<([^>]+)>/);
    return match ? match[1].toLowerCase() : fromStr.toLowerCase().trim();
}

function extractSenderName(fromStr) {
    const match = fromStr.match(/^([^<]+)</);
    return match ? match[1].trim().replace(/"/g, '') : fromStr.split('@')[0];
}

// ── Main ────────────────────────────────────────────────────
async function main() {
    log('INFO', '═══════════════════════════════════════════════════════');
    log('INFO', '  BANF CRM Email Cleanup Agent v2.0');
    log('INFO', `  Mode: ${DO_SEND ? 'LIVE SEND' : DRY_RUN ? 'DRY RUN' : 'REPORT ONLY'}`);
    log('INFO', '═══════════════════════════════════════════════════════');

    const state = loadState();

    if (REPORT_ONLY) {
        generateReport(state);
        return;
    }

    const token = await getGmailToken();
    log('INFO', 'Gmail authenticated');

    const processedBounceIds = new Set(state.processedBounceIds);
    const processedAutoReplyIds = new Set(state.processedAutoReplyIds);

    // ═══ PHASE 1: Scan for Bounce Emails ═══
    log('INFO', '');
    log('INFO', '── Phase 1: Scanning delivery failures ──');

    const bounceQueries = [
        `from:mailer-daemon@googlemail.com after:${CONFIG.SCAN_SINCE}`,
        `from:postmaster after:${CONFIG.SCAN_SINCE}`,
        `subject:"Delivery Status Notification" after:${CONFIG.SCAN_SINCE}`,
    ];

    const allBounceIds = new Set();
    for (const q of bounceQueries) {
        try {
            const ids = await gmailSearch(q, token, 100);
            ids.forEach(id => allBounceIds.add(id));
        } catch (e) {
            log('WARN', `Bounce query failed: ${e.message}`);
        }
    }

    const newBounceIds = [...allBounceIds].filter(id => !processedBounceIds.has(id));
    log('INFO', `Bounce emails: ${allBounceIds.size} total, ${newBounceIds.length} new`);

    const bounces = [];
    for (const id of newBounceIds) {
        try {
            const msg = await gmailGetMessage(id, token);
            if (!isBounceEmail(msg.from, msg.subject)) {
                processedBounceIds.add(id);
                continue;
            }
            const bounce = parseBounceEmail(msg);
            if (bounce.failedEmail) {
                bounces.push(bounce);
                log('INFO', `  📧 Bounce: ${bounce.failedEmail} — ${bounce.reasonCode} (${bounce.isTemporary ? 'temp' : 'perm'})`);
            }
            processedBounceIds.add(id);
        } catch (e) {
            log('WARN', `Failed to fetch bounce ${id}: ${e.message}`);
        }
    }

    // ═══ PHASE 2: Scan for Auto-Reply / Corporate Emails ═══
    log('INFO', '');
    log('INFO', '── Phase 2: Scanning auto-replies & corporate emails ──');

    // Search for responses to our evite/BANF emails
    const autoReplyQueries = [
        `to:banfjax@gmail.com subject:"automatic reply" after:${CONFIG.SCAN_SINCE}`,
        `to:banfjax@gmail.com subject:"out of office" after:${CONFIG.SCAN_SINCE}`,
        `to:banfjax@gmail.com subject:"auto-reply" after:${CONFIG.SCAN_SINCE}`,
        `to:banfjax@gmail.com subject:"autoreply" after:${CONFIG.SCAN_SINCE}`,
        `to:banfjax@gmail.com subject:"away from office" after:${CONFIG.SCAN_SINCE}`,
        `to:banfjax@gmail.com "this is an automated response" after:${CONFIG.SCAN_SINCE}`,
        `to:banfjax@gmail.com "this mailbox is not monitored" after:${CONFIG.SCAN_SINCE}`,
    ];

    const allAutoReplyIds = new Set();
    for (const q of autoReplyQueries) {
        try {
            const ids = await gmailSearch(q, token, 50);
            ids.forEach(id => allAutoReplyIds.add(id));
        } catch (e) {
            log('WARN', `Auto-reply query failed: ${e.message}`);
        }
    }

    // Also scan recent replies to BANF emails for corporate patterns
    try {
        const recentIds = await gmailSearch(
            `to:banfjax@gmail.com -from:banfjax@gmail.com after:${CONFIG.SCAN_SINCE} -from:mailer-daemon -from:postmaster`,
            token, 200
        );
        recentIds.forEach(id => allAutoReplyIds.add(id));
    } catch (e) {
        log('WARN', `Recent reply scan failed: ${e.message}`);
    }

    const newAutoReplyIds = [...allAutoReplyIds].filter(id => !processedAutoReplyIds.has(id));
    log('INFO', `Potential auto-reply/corporate: ${allAutoReplyIds.size} total, ${newAutoReplyIds.length} new`);

    const corporateEmails = [];
    for (const id of newAutoReplyIds) {
        try {
            const msg = await gmailGetMessage(id, token);

            // Skip bounces (already handled)
            if (isBounceEmail(msg.from, msg.subject)) {
                processedAutoReplyIds.add(id);
                continue;
            }

            const senderEmail = extractSenderEmail(msg.from);
            const senderName = extractSenderName(msg.from);

            // Check for auto-reply
            if (isAutoReply(msg)) {
                corporateEmails.push({
                    email: senderEmail,
                    name: senderName,
                    reason: 'auto_reply',
                    autoReplyContent: (msg.subject + '\n' + msg.body).substring(0, 500),
                    gmailId: id
                });
                log('INFO', `  🏢 Auto-reply: ${senderName} <${senderEmail}> — "${msg.subject.substring(0, 60)}"`);
            } else {
                // Check for corporate patterns
                const corpCheck = isCorporateEmail(msg);
                if (corpCheck.isCorporate) {
                    corporateEmails.push({
                        email: senderEmail,
                        name: senderName,
                        reason: corpCheck.reason,
                        autoReplyContent: (msg.subject + '\n' + msg.body).substring(0, 500),
                        gmailId: id
                    });
                    log('INFO', `  🏢 Corporate: ${senderName} <${senderEmail}> — ${corpCheck.reason}`);
                }
            }

            processedAutoReplyIds.add(id);
        } catch (e) {
            log('WARN', `Failed to fetch reply ${id}: ${e.message}`);
        }
    }

    // Deduplicate corporate emails by email address
    const seenCorp = new Set();
    const uniqueCorporate = corporateEmails.filter(c => {
        if (seenCorp.has(c.email)) return false;
        seenCorp.add(c.email);
        return true;
    });

    log('INFO', '');
    log('INFO', `── Summary ──`);
    log('INFO', `  Bounces: ${bounces.length} (permanent: ${bounces.filter(b => !b.isTemporary).length}, temporary: ${bounces.filter(b => b.isTemporary).length})`);
    log('INFO', `  Corporate/Auto-reply: ${uniqueCorporate.length}`);

    // ═══ PHASE 3: Apply to Wix CRM ═══
    if (DO_SEND && (bounces.length > 0 || uniqueCorporate.length > 0)) {
        log('INFO', '');
        log('INFO', '── Phase 3: Applying to Wix CRM ──');

        // Process bounces
        if (bounces.length > 0) {
            log('INFO', `  Sending ${bounces.length} bounces to crm_email_cleanup...`);
            try {
                const resp = await apiPost('crm_email_cleanup', {
                    bounces: bounces.map(b => ({
                        email: b.failedEmail,
                        reasonCode: b.reasonCode,
                        isTemporary: b.isTemporary,
                        details: b.details
                    })),
                    dryRun: false
                });
                if (resp.data.success) {
                    const r = resp.data;
                    log('INFO', `  ✓ Cleanup result: ${r.deactivated?.length || 0} deactivated, ${r.kept?.length || 0} kept (temp), ${r.notFound?.length || 0} not found`);
                    state.stats.totalDeactivated += (r.deactivated?.length || 0);
                } else {
                    log('ERROR', `  ✗ Cleanup failed: ${resp.data.error}`);
                }
            } catch (e) {
                log('ERROR', `  ✗ Cleanup API error: ${e.message}`);
            }
        }

        // Process corporate emails
        if (uniqueCorporate.length > 0) {
            log('INFO', `  Sending ${uniqueCorporate.length} corporate emails to crm_corporate_filter...`);
            try {
                const resp = await apiPost('crm_corporate_filter', {
                    emails: uniqueCorporate.map(c => ({
                        email: c.email,
                        name: c.name,
                        reason: c.reason,
                        autoReplyContent: c.autoReplyContent
                    })),
                    dryRun: false
                });
                if (resp.data.success) {
                    const r = resp.data;
                    log('INFO', `  ✓ Corporate filter: ${r.moved?.length || 0} moved, ${r.alreadyMoved?.length || 0} already moved`);
                    state.stats.totalCorporateMoved += (r.moved?.length || 0);
                } else {
                    log('ERROR', `  ✗ Corporate filter failed: ${resp.data.error}`);
                }
            } catch (e) {
                log('ERROR', `  ✗ Corporate filter API error: ${e.message}`);
            }
        }
    } else if (DRY_RUN) {
        log('INFO', '');
        log('INFO', '── DRY RUN — no changes applied ──');
        for (const b of bounces) {
            log('INFO', `  [WOULD ${b.isTemporary ? 'FLAG' : 'DEACTIVATE'}] ${b.failedEmail} — ${b.reasonCode}`);
        }
        for (const c of uniqueCorporate) {
            log('INFO', `  [WOULD MOVE TO CORPORATE] ${c.email} — ${c.reason}`);
        }
    }

    // Update state
    state.processedBounceIds = [...processedBounceIds];
    state.processedAutoReplyIds = [...processedAutoReplyIds];
    state.bounces = [...(state.bounces || []), ...bounces];
    state.corporateEmails = [...(state.corporateEmails || []), ...uniqueCorporate];
    state.stats.totalScanned += newBounceIds.length + newAutoReplyIds.length;
    state.stats.totalBounces += bounces.length;
    state.stats.totalAutoReplies += uniqueCorporate.length;
    saveState(state);

    // ═══ PHASE 4: Generate Report ═══
    generateReport(state, { bounces, corporateEmails: uniqueCorporate });

    log('INFO', '');
    log('INFO', '═══ CRM Email Cleanup Complete ═══');
}

// ── Report Generation ───────────────────────────────────────
function generateReport(state, latest = {}) {
    const bounces = latest.bounces || state.bounces || [];
    const corporate = latest.corporateEmails || state.corporateEmails || [];
    const ts = new Date().toISOString();

    let bounceRows = bounces.map(b => `
        <tr class="${b.isTemporary ? 'temp' : 'perm'}">
            <td>${b.failedEmail || 'N/A'}</td>
            <td><span class="badge ${b.reasonCode}">${b.reasonCode}</span></td>
            <td>${b.isTemporary ? '⏳ Temporary' : '❌ Permanent'}</td>
            <td>${b.details || ''}</td>
            <td>${b.isTemporary ? 'Keep (flagged)' : 'Deactivated'}</td>
        </tr>`).join('');

    let corpRows = corporate.map(c => `
        <tr>
            <td>${c.email}</td>
            <td>${c.name || ''}</td>
            <td><span class="badge ${c.reason}">${c.reason}</span></td>
            <td>${(c.autoReplyContent || '').substring(0, 100).replace(/</g, '&lt;')}...</td>
        </tr>`).join('');

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>BANF CRM Email Cleanup Report</title>
<style>
* { margin:0; padding:0; box-sizing:border-box; }
body { font-family:'Segoe UI',Tahoma,sans-serif; background:#0a0a1a; color:#e0e0e0; padding:24px; }
.header { background:linear-gradient(135deg,#1a1a3e,#4a0e0e); border-radius:16px; padding:32px; margin-bottom:24px; }
.header h1 { font-size:26px; color:#fff; margin-bottom:6px; }
.header .sub { color:#aaa; font-size:13px; }
.kpi-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(160px,1fr)); gap:16px; margin-bottom:24px; }
.kpi { background:#1a1a2e; border-radius:12px; padding:20px; text-align:center; border:1px solid #333; }
.kpi .num { font-size:32px; font-weight:700; }
.kpi .lbl { font-size:11px; color:#888; text-transform:uppercase; letter-spacing:1px; margin-top:4px; }
.num.green { color:#00e676; } .num.red { color:#ff5252; } .num.amber { color:#ff9800; } .num.blue { color:#42a5f5; }
.section { background:#1a1a2e; border-radius:12px; margin-bottom:20px; border:1px solid #333; overflow:hidden; }
.section-hdr { background:#222244; padding:14px 20px; font-size:15px; font-weight:600; border-bottom:1px solid #333; }
table { width:100%; border-collapse:collapse; font-size:13px; }
th { background:#16163a; padding:10px 12px; text-align:left; font-size:11px; text-transform:uppercase; letter-spacing:0.5px; color:#888; }
td { padding:10px 12px; border-bottom:1px solid #1a1a2e; }
tr:hover { background:#222240; }
tr.perm td:first-child { color:#ff5252; }
tr.temp td:first-child { color:#ff9800; }
.badge { padding:3px 8px; border-radius:4px; font-size:11px; font-weight:600; }
.badge.address_not_found { background:#5c1515; color:#ff8a80; }
.badge.mailbox_full { background:#4a3000; color:#ffb74d; }
.badge.rejected { background:#4a0000; color:#ff5252; }
.badge.temporary_failure { background:#1a237e; color:#82b1ff; }
.badge.unknown { background:#333; color:#999; }
.badge.auto_reply { background:#1a237e; color:#82b1ff; }
.badge.corporate_disclaimer { background:#4a3000; color:#ffb74d; }
.badge.corporate_domain { background:#1b5e20; color:#a5d6a7; }
.footer { text-align:center; padding:20px; color:#555; font-size:12px; margin-top:20px; }
</style>
</head>
<body>
<div class="header">
    <h1>📧 BANF CRM Email Cleanup Report</h1>
    <div class="sub">Generated: ${ts} | Agent v2.0 | Scan since: ${CONFIG.SCAN_SINCE}</div>
</div>

<div class="kpi-grid">
    <div class="kpi"><div class="num">${state.stats.totalScanned}</div><div class="lbl">Emails Scanned</div></div>
    <div class="kpi"><div class="num red">${state.stats.totalBounces}</div><div class="lbl">Bounces Found</div></div>
    <div class="kpi"><div class="num amber">${bounces.filter(b => !b.isTemporary).length}</div><div class="lbl">Permanent Bounces</div></div>
    <div class="kpi"><div class="num blue">${bounces.filter(b => b.isTemporary).length}</div><div class="lbl">Temporary Bounces</div></div>
    <div class="kpi"><div class="num red">${state.stats.totalDeactivated}</div><div class="lbl">CRM Deactivated</div></div>
    <div class="kpi"><div class="num amber">${state.stats.totalAutoReplies}</div><div class="lbl">Auto-Replies</div></div>
    <div class="kpi"><div class="num green">${state.stats.totalCorporateMoved}</div><div class="lbl">Corporate Moved</div></div>
</div>

<div class="section">
    <div class="section-hdr">📬 Delivery Failures (${bounces.length})</div>
    <table>
        <tr><th>Email</th><th>Reason</th><th>Type</th><th>Details</th><th>Action</th></tr>
        ${bounceRows || '<tr><td colspan="5" style="color:#66bb6a;text-align:center;padding:20px">No delivery failures found ✓</td></tr>'}
    </table>
</div>

<div class="section">
    <div class="section-hdr">🏢 Corporate / Auto-Reply Emails (${corporate.length})</div>
    <table>
        <tr><th>Email</th><th>Name</th><th>Reason</th><th>Preview</th></tr>
        ${corpRows || '<tr><td colspan="4" style="color:#66bb6a;text-align:center;padding:20px">No corporate/auto-reply emails detected ✓</td></tr>'}
    </table>
</div>

<div class="section">
    <div class="section-hdr">📋 CRM Cleanup Rules</div>
    <table>
        <tr><th>Bounce Type</th><th>Action</th><th>Rationale</th></tr>
        <tr><td>address_not_found</td><td style="color:#ff5252">❌ Deactivate in CRM</td><td>Email doesn't exist — permanent failure</td></tr>
        <tr><td>rejected / blocked</td><td style="color:#ff5252">❌ Deactivate in CRM</td><td>Server permanently rejected — cannot deliver</td></tr>
        <tr><td>mailbox_full</td><td style="color:#ff9800">⏳ Keep, flag in CRM</td><td>Temporary — mailbox may be cleared later</td></tr>
        <tr><td>temporary_failure</td><td style="color:#42a5f5">⏳ Keep, flag in CRM</td><td>Transient issue — auto-retry on next send</td></tr>
        <tr><td>auto_reply</td><td style="color:#ff9800">→ Move to Corporate</td><td>Automated response — likely not personal inbox</td></tr>
        <tr><td>corporate_disclaimer</td><td style="color:#ff9800">→ Move to Corporate</td><td>Business email with legal disclaimer</td></tr>
    </table>
</div>

<div class="footer">BANF CRM Email Cleanup Agent v2.0 | ${ts}</div>
</body></html>`;

    fs.writeFileSync(CONFIG.REPORT_FILE, html);
    log('INFO', `Report saved: ${CONFIG.REPORT_FILE}`);
}

main().catch(e => {
    log('ERROR', `Fatal: ${e.message}`);
    console.error(e);
    process.exit(1);
});
