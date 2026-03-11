#!/usr/bin/env node
/**
 * ═══════════════════════════════════════════════════════════════════════
 *  BANF Daily Account Reconciliation & Ledger Agent  (v1.0)
 * ═══════════════════════════════════════════════════════════════════════
 *
 *  Runs daily to:
 *    1. Scan Gmail for ALL Zelle/payment notifications
 *    2. Cross-reference with CRM membership data
 *    3. Classify each payment's purpose using Payment Purpose Engine
 *    4. Track expenses (manual entries from CSV/admin)
 *    5. Generate date-wise ledger with running balance
 *    6. Produce reconciliation report (HTML + JSON)
 *
 *  Data Sources:
 *    - Gmail Zelle notifications (Wells Fargo: alerts@notify.wellsfargo.com)
 *    - Gmail PayPal notifications
 *    - CRM reconciliation data (banf-crm-reconciliation.json)
 *    - Manual expense entries (banf-expenses.json)
 *    - Pipeline payment data (bosonto-full-pipeline.json)
 *
 *  Output:
 *    - banf-ledger.json          — Complete ledger data
 *    - banf-ledger-report.html   — HTML dashboard report
 *    - banf-daily-reconciliation.json — Daily reconciliation state
 *
 *  Usage:
 *    node banf-daily-reconciliation-agent.js                 # Full reconciliation
 *    node banf-daily-reconciliation-agent.js --since=7       # Last 7 days
 *    node banf-daily-reconciliation-agent.js --report-only   # Regenerate report from existing data
 *    node banf-daily-reconciliation-agent.js --add-expense   # Interactive add expense
 *
 * ═══════════════════════════════════════════════════════════════════════
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const { classifyPayment, generatePaymentAcknowledgment, MEMBERSHIP_PRICING, getFiscalYear }
    = require('./banf-payment-purpose-engine');

// ── Files ────────────────────────────────────────────────────
const CRM_FILE = path.join(__dirname, 'banf-crm-reconciliation.json');
const PIPELINE_FILE = path.join(__dirname, 'bosonto-full-pipeline.json');
const LEDGER_FILE = path.join(__dirname, 'banf-ledger.json');
const EXPENSE_FILE = path.join(__dirname, 'banf-expenses.json');
const RECON_STATE_FILE = path.join(__dirname, 'banf-daily-reconciliation.json');
const REPORT_FILE = path.join(__dirname, 'banf-ledger-report.html');
const LOG_FILE = path.join(__dirname, 'banf-reconciliation.log');

// ── Gmail OAuth2 ────────────────────────────────────────────
const GOOGLE_CLIENT_ID = '1020178199135-3usrl611ara38i7rhu2ub6sn6g1150ml.apps.googleusercontent.com';
const GOOGLE_CLIENT_SECRET = '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';
const PLAYGROUND_CLIENT_ID = '407408718192.apps.googleusercontent.com';
const PLAYGROUND_SECRET = 'kd-_2_AUosoGGTNYyMJiFL3j';
const GOOGLE_REFRESH_TOKEN = require('./banf-gmail-config').REFRESH_TOKEN;

// ── CLI ─────────────────────────────────────────────────────
const args = process.argv.slice(2);
const sinceArg = args.find(a => a.startsWith('--since='));
const sinceDateArg = args.find(a => a.startsWith('--since-date='));
const emailToArg = args.find(a => a.startsWith('--email-to='));
const SINCE_DAYS = sinceDateArg
    ? Math.ceil((Date.now() - new Date(sinceDateArg.split('=')[1]).getTime()) / 86400000)
    : sinceArg ? parseInt(sinceArg.split('=')[1]) : 365;
const SINCE_DATE_LABEL = sinceDateArg ? sinceDateArg.split('=')[1] : null;
const EMAIL_TO = emailToArg ? emailToArg.split('=')[1] : null;
const REPORT_ONLY = args.includes('--report-only');
const ADD_EXPENSE = args.includes('--add-expense');
const DRY_RUN = args.includes('--dry-run');

// ═══════════════════════════════════════════════════════════════
// LOGGING
// ═══════════════════════════════════════════════════════════════

function log(level, msg) {
    const ts = new Date().toISOString();
    const line = `[${ts}] [${level}] ${msg}`;
    console.log(line);
    try { fs.appendFileSync(LOG_FILE, line + '\n'); } catch { }
}

// ═══════════════════════════════════════════════════════════════
// HTTP + GMAIL HELPERS
// ═══════════════════════════════════════════════════════════════

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
        if (options.body) opts.headers['Content-Length'] = Buffer.byteLength(options.body);
        const req = https.request(opts, res => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try { resolve({ status: res.statusCode, data: JSON.parse(data) }); }
                catch { resolve({ status: res.statusCode, data }); }
            });
        });
        req.on('error', reject);
        req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
        if (options.body) req.write(options.body);
        req.end();
    });
}

async function getGmailToken() {
    // Try primary credentials first
    const creds = [
        { clientId: GOOGLE_CLIENT_ID, clientSecret: GOOGLE_CLIENT_SECRET },
        { clientId: PLAYGROUND_CLIENT_ID, clientSecret: PLAYGROUND_SECRET }
    ];

    for (const cred of creds) {
        try {
            const body = new URLSearchParams({
                client_id: cred.clientId,
                client_secret: cred.clientSecret,
                refresh_token: GOOGLE_REFRESH_TOKEN,
                grant_type: 'refresh_token'
            }).toString();

            const resp = await httpsRequest('https://oauth2.googleapis.com/token', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body
            });

            if (resp.data?.access_token) return resp.data.access_token;
        } catch (e) {
            log('WARN', `Token attempt failed: ${e.message}`);
        }
    }
    throw new Error('Failed to obtain Gmail token with all credentials');
}

async function gmailSearch(query, token, maxResults = 500) {
    const q = encodeURIComponent(query);
    const url = `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${q}&maxResults=${maxResults}`;
    const resp = await httpsRequest(url, {
        headers: { Authorization: `Bearer ${token}` }
    });
    return (resp.data?.messages || []).map(m => m.id);
}

async function gmailGetMessage(id, token) {
    const url = `https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}?format=full`;
    const resp = await httpsRequest(url, {
        headers: { Authorization: `Bearer ${token}` }
    });
    const msg = resp.data;
    if (!msg || !msg.payload) return null;

    const headers = msg.payload.headers || [];
    const getHeader = (name) => (headers.find(h => h.name.toLowerCase() === name.toLowerCase()) || {}).value || '';

    // Decode body — prefer HTML (WF Zelle emails are HTML-only), then text/plain
    let bodyHtml = '';
    let bodyPlain = '';
    function extractParts(part) {
        if (part.mimeType === 'text/html' && part.body?.data) {
            bodyHtml += Buffer.from(part.body.data, 'base64url').toString('utf-8');
        } else if (part.mimeType === 'text/plain' && part.body?.data) {
            bodyPlain += Buffer.from(part.body.data, 'base64url').toString('utf-8');
        } else if (part.body?.data && !part.mimeType?.startsWith('image')) {
            bodyPlain += Buffer.from(part.body.data, 'base64url').toString('utf-8');
        }
        if (part.parts) part.parts.forEach(extractParts);
    }
    extractParts(msg.payload);

    // Convert HTML to text for parsing
    let bodyText = bodyPlain;
    if (bodyHtml) {
        bodyText = bodyHtml
            .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
            .replace(/<[^>]+>/g, ' ')
            .replace(/&nbsp;/g, ' ')
            .replace(/&amp;/g, '&')
            .replace(/&#(\d+);/g, (m, n) => String.fromCharCode(n))
            .replace(/\s+/g, ' ')
            .trim();
    }

    return {
        id: msg.id,
        from: getHeader('From'),
        to: getHeader('To'),
        subject: getHeader('Subject'),
        date: getHeader('Date'),
        body: bodyText,
        internalDate: msg.internalDate
    };
}

// ═══════════════════════════════════════════════════════════════
// PAYMENT EMAIL PARSER (same as email reader)
// ═══════════════════════════════════════════════════════════════

function parsePaymentEmail(msg) {
    const body = (msg.body || '');
    const subj = (msg.subject || '');
    const result = {
        gmailId: msg.id, from: msg.from, subject: subj, date: msg.date,
        payerName: null, payerEmail: null, amount: 0, source: null,
        memo: null, parsed: false
    };

    // Wells Fargo Zelle: "NAME sent you $AMOUNT Date: MM/DD/YYYY Confirmation: XXX Memo: ..."
    let match = body.match(/([A-Za-z][A-Za-z.\s]+?)\s+sent you \$(\d[\d,]*(?:\.\d{2})?)(?:\s+Date:\s*(\d{2}\/\d{2}\/\d{4}))?/i);
    if (match) {
        result.amount = parseFloat(match[2].replace(',', ''));
        result.payerName = match[1].trim();
        result.source = 'zelle_wf';
        result.parsed = true;
        if (match[3]) result.txDate = match[3];
        // Extract confirmation
        const confMatch = body.match(/Confirmation:\s*(\S+)/i);
        if (confMatch) result.confirmation = confMatch[1];
    }

    // Zelle generic: "You received $XXX from Name"
    if (!result.parsed) {
        match = body.match(/(?:you\s+)?received?\s+\$?([\d,]+(?:\.\d{2})?)\s+from\s+(.+?)(?:\.|Date|$)/i);
        if (match) {
            result.amount = parseFloat(match[1].replace(',', ''));
            result.payerName = match[2].trim();
            result.source = 'zelle';
            result.parsed = true;
        }
    }

    // Zelle subject: "You received money with Zelle" — extract amount from body
    if (!result.parsed && /received money.*zelle/i.test(subj)) {
        match = body.match(/\$(\d[\d,]*(?:\.\d{2})?)/i);
        if (match) {
            result.amount = parseFloat(match[1].replace(',', ''));
            result.source = 'zelle_subject';
            result.parsed = true;
            // Try name from body: "96 NAME sent you"
            const nameMatch = body.match(/\d+\s+([A-Za-z][A-Za-z.\s]+?)\s+sent you/i);
            if (nameMatch) result.payerName = nameMatch[1].trim();
        }
    }

    // PayPal: "payment of $XXX from Name"
    if (!result.parsed) {
        match = body.match(/payment\s+of\s+\$?([\d,]+(?:\.\d{2})?)\s+from\s+(.+?)(?:\.|$)/i);
        if (match) {
            result.amount = parseFloat(match[1].replace(',', ''));
            result.payerName = match[2].trim();
            result.source = 'paypal';
            result.parsed = true;
        }
    }

    // Check: "check.*$XXX" or "deposit.*$XXX"
    if (!result.parsed) {
        match = body.match(/(?:check|deposit)[:\s]+\$?([\d,]+(?:\.\d{2})?)/i);
        if (match) {
            result.amount = parseFloat(match[1].replace(',', ''));
            result.source = 'check';
            result.parsed = true;
        }
    }

    // Memo/note — WF format: "Memo: ... We deposited"
    match = body.match(/Memo:\s*(.+?)(?:\s+We deposited|\n|$)/i);
    if (match) result.memo = match[1].trim();
    if (!result.memo) {
        match = body.match(/(?:note|message|description)[:\s]+(.+?)(?:\n|$)/i);
        if (match) result.memo = match[1].trim();
    }

    // BANF-related?
    result.isBanf = /banf|bosonto|membership|dues|bengali|jaxbengali/i.test(body + subj);

    return result;
}

// ═══════════════════════════════════════════════════════════════
// CRM HELPERS
// ═══════════════════════════════════════════════════════════════

function loadCRM() {
    try {
        const data = JSON.parse(fs.readFileSync(CRM_FILE, 'utf8'));
        return data.members || data;
    } catch (e) {
        log('WARN', `Failed to load CRM: ${e.message}`);
        return [];
    }
}

function normalize(s) {
    return (s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

function findCRMMember(members, name, email) {
    if (email) {
        const byEmail = members.find(m => (m.email || '').toLowerCase() === email.toLowerCase());
        if (byEmail) return byEmail;
    }
    if (!name) return null;
    const normName = normalize(name);
    const parts = name.toLowerCase().split(/\s+/).filter(p => p.length > 1);

    // Exact display name
    for (const m of members) {
        if (normalize(m.displayName) === normName) return m;
        if (normalize(`${m.firstName || ''} ${m.lastName || ''}`.trim()) === normName) return m;
    }
    // Part match
    if (parts.length >= 2) {
        for (const m of members) {
            const f = (m.firstName || '').toLowerCase();
            const l = (m.lastName || '').toLowerCase();
            if (parts.includes(f) && parts.includes(l)) return m;
        }
    }
    // First name unique
    if (parts.length >= 1) {
        const matches = members.filter(m => (m.firstName || '').toLowerCase() === parts[0]);
        if (matches.length === 1) return matches[0];
    }
    // Household member match
    for (const m of members) {
        for (const hm of (m.householdMembers || m.familyMembers || [])) {
            const hmn = normalize(`${hm.firstName || ''} ${hm.lastName || ''}`);
            if (hmn && hmn === normName) return m;
        }
    }
    return null;
}

// ═══════════════════════════════════════════════════════════════
// LEDGER DATA STRUCTURES
// ═══════════════════════════════════════════════════════════════

function loadLedger() {
    try {
        if (fs.existsSync(LEDGER_FILE)) {
            return JSON.parse(fs.readFileSync(LEDGER_FILE, 'utf8'));
        }
    } catch { }
    return {
        entries: [],
        lastScanDate: null,
        processedEmailIds: [],
        totalIncome: 0,
        totalExpense: 0,
        balance: 0,
        createdAt: new Date().toISOString()
    };
}

function saveLedger(ledger) {
    ledger.lastUpdated = new Date().toISOString();
    ledger.totalIncome = ledger.entries.filter(e => e.type === 'income').reduce((s, e) => s + e.amount, 0);
    ledger.totalExpense = ledger.entries.filter(e => e.type === 'expense').reduce((s, e) => s + e.amount, 0);
    ledger.balance = ledger.totalIncome - ledger.totalExpense;
    fs.writeFileSync(LEDGER_FILE, JSON.stringify(ledger, null, 2));
    log('INFO', `Ledger saved: ${ledger.entries.length} entries, balance: $${ledger.balance.toFixed(2)}`);
}

function loadExpenses() {
    try {
        if (fs.existsSync(EXPENSE_FILE)) {
            return JSON.parse(fs.readFileSync(EXPENSE_FILE, 'utf8'));
        }
    } catch { }
    return { expenses: [], lastUpdated: null };
}

function loadReconState() {
    try {
        if (fs.existsSync(RECON_STATE_FILE)) {
            return JSON.parse(fs.readFileSync(RECON_STATE_FILE, 'utf8'));
        }
    } catch { }
    return {
        lastRunDate: null,
        processedPaymentEmailIds: [],
        dailySummaries: [],
        lastFiscalYear: null
    };
}

function saveReconState(state) {
    state.lastUpdated = new Date().toISOString();
    fs.writeFileSync(RECON_STATE_FILE, JSON.stringify(state, null, 2));
}

// ═══════════════════════════════════════════════════════════════
// PHASE 1: SCAN ALL PAYMENT EMAILS
// ═══════════════════════════════════════════════════════════════

async function scanAllPaymentEmails(state) {
    log('INFO', '═══ Phase 1: Scanning Gmail for ALL payment emails ═══');

    const token = await getGmailToken();
    const sinceDate = new Date(Date.now() - SINCE_DAYS * 86400000);
    const sinceStr = sinceDate.toISOString().slice(0, 10).replace(/-/g, '/');

    const queries = [
        `from:alerts@notify.wellsfargo.com "received" after:${sinceStr}`,
        `subject:"You received" Zelle after:${sinceStr}`,
        `subject:"payment received" after:${sinceStr}`,
        `subject:BANF payment after:${sinceStr}`,
        `subject:membership payment after:${sinceStr}`,
        `from:paypal subject:received after:${sinceStr}`
    ];

    const allIds = new Set();
    for (const q of queries) {
        try {
            const ids = await gmailSearch(q, token, 500);
            ids.forEach(id => allIds.add(id));
        } catch (e) {
            log('WARN', `Query failed: ${q} — ${e.message}`);
        }
    }

    const processedIds = new Set(state.processedPaymentEmailIds || []);
    const newIds = [...allIds].filter(id => !processedIds.has(id));

    log('INFO', `  Total payment emails: ${allIds.size}, already processed: ${processedIds.size}, new: ${newIds.length}`);

    const payments = [];
    for (const id of newIds) {
        try {
            const msg = await gmailGetMessage(id, token);
            if (!msg) continue;
            const payment = parsePaymentEmail(msg);
            if (payment.parsed && payment.amount > 0) {
                payments.push(payment);
                log('INFO', `  💰 $${payment.amount} from ${payment.payerName || 'unknown'} via ${payment.source} (${payment.date})`);
            }
            processedIds.add(id);
        } catch (e) {
            log('WARN', `  Failed to fetch email ${id}: ${e.message}`);
        }
    }

    state.processedPaymentEmailIds = [...processedIds];
    log('INFO', `  Phase 1 complete: ${payments.length} new payments detected`);
    return payments;
}

// ═══════════════════════════════════════════════════════════════
// PHASE 2: CLASSIFY PAYMENTS & BUILD LEDGER ENTRIES
// ═══════════════════════════════════════════════════════════════

function classifyAndBuildEntries(payments, members) {
    log('INFO', '═══ Phase 2: Classifying payments & building ledger ═══');

    const context = {
        membershipDriveActive: true,  // FY2026-27 drive active
        upcomingEvent: 'Anandabazar March 14, 2026',
        currentDate: new Date()
    };

    const entries = [];
    const classifications = { membership: 0, sponsorship: 0, donation: 0, event_fee: 0, unknown: 0, other: 0 };

    for (const payment of payments) {
        // Find CRM member
        const member = findCRMMember(members, payment.payerName, payment.payerEmail);

        // Classify purpose
        const classification = classifyPayment(payment, member, context);

        // Build ledger entry
        const entry = {
            id: `PAY-${payment.gmailId || Date.now()}-${Math.random().toString(36).slice(2,6)}`,
            type: 'income',
            date: payment.date || new Date().toISOString(),
            amount: payment.amount,
            source: payment.source || 'unknown',
            purpose: classification.purpose,
            purposeConfidence: classification.confidence,
            payerName: payment.payerName || 'Unknown',
            payerEmail: payment.payerEmail || (member ? member.email : ''),
            memberEmail: member ? member.email : null,
            memberName: member ? (member.displayName || `${member.firstName} ${member.lastName}`) : null,
            memo: payment.memo || '',
            tierMatch: classification.tierMatch ? {
                tier: classification.tierMatch.tierName,
                household: classification.tierMatch.hhType,
                price: classification.tierMatch.price,
                diff: classification.tierMatch.diff
            } : null,
            acknowledged: false,
            acknowledgmentSent: false,
            comments: generatePaymentAcknowledgment(classification),
            gmailId: payment.gmailId,
            classification // full detail
        };

        entries.push(entry);
        classifications[classification.purpose] = (classifications[classification.purpose] || 0) + 1;
    }

    log('INFO', `  Classification summary:`);
    for (const [purpose, count] of Object.entries(classifications)) {
        if (count > 0) log('INFO', `    ${purpose}: ${count}`);
    }

    return entries;
}

// ═══════════════════════════════════════════════════════════════
// AUTO-TAG: Map expenses to events and categories
// ═══════════════════════════════════════════════════════════════

const BANF_EVENTS = [
    { name: 'Saraswati Puja 2026',  date: '2026-01-31', windowBefore: 30, windowAfter: 15, keywords: ['saraswati','puja'] },
    { name: 'Bosonto Utsob 2026',   date: '2026-03-07', windowBefore: 35, windowAfter: 7,  keywords: ['bosonto','utsob','spring'] },
    { name: 'Noboborsho 2026',      date: '2026-04-25', windowBefore: 30, windowAfter: 7,  keywords: ['noboborsho','nabo borsho','new year','poila'] },
];

// Current EC members (2025-26 term) — they actively purchase for upcoming events
// Non-EC / previous-EC members typically get reimbursed for the JUST-FINISHED event
const CURRENT_EC = [
    'RANADHIR GHOSH',        // President
    'SOUMYAJIT DUTTA',       // Vice President
    'AMIT CHANDAK',          // Treasurer
    'RWITI CHOUDHURY',       // General Secretary
    'RAJANYA GHOSH',         // Cultural Secretary
    'SUVANKAR PAUL',         // Joint Secretary
    'PARTHA MUKHOPADHYAY',   // EC Member
];

/**
 * Automatically assign event and category to an expense entry based on:
 *   1. Explicit fields already present (expense.event, expense.eventId)
 *   2. Date proximity to known BANF events
 *   3. Merchant/memo keyword matching for category
 */
function autoTagExpense(expense) {
    const result = { event: '', category: '' };

    // ── Explicit event already set ──
    if (expense.event)   result.event = expense.event;
    if (expense.eventId) {
        const match = BANF_EVENTS.find(e =>
            e.name.toLowerCase().replace(/\s+/g,'_') === expense.eventId ||
            e.name.toLowerCase().includes(expense.eventId.replace(/_/g,' '))
        );
        if (match) result.event = match.name;
    }

    // ── 1. Event-name keyword match in memo/description ──
    //    If the Zelle memo explicitly mentions an event name, use that.
    if (!result.event) {
        const memoText = ((expense.memo || '') + ' ' + (expense.description || '')).toLowerCase();
        for (const ev of BANF_EVENTS) {
            if (ev.keywords && ev.keywords.some(kw => memoText.includes(kw))) {
                result.event = ev.name;
                break;
            }
        }
    }

    // ── 2. EC-aware date-proximity event matching ──
    //    Key intelligence:
    //    - Current EC members actively purchase for the UPCOMING/CURRENT event
    //    - Non-EC / previous-EC members who get paid AFTER an event closed
    //      → that payment is a reimbursement for the JUST-FINISHED event
    //    - At event boundaries (when one event just ended and the next hasn't started),
    //      non-EC post-event payments go to the completed event, not the next one
    if (!result.event && expense.date) {
        const expDate = new Date(expense.date);
        if (!isNaN(expDate.getTime())) {
            const payeeName = ((expense.to || expense.payee || expense.payerName || '')).toUpperCase();
            const isCurrentEC = CURRENT_EC.some(ec => payeeName.includes(ec) || ec.includes(payeeName.split(' ')[0]));

            // Find all candidate events with their distance scores
            const candidates = [];
            for (const ev of BANF_EVENTS) {
                const evDate = new Date(ev.date);
                const daysBefore = (evDate - expDate) / 86400000;  // positive = expense is before event
                const daysAfter  = (expDate - evDate) / 86400000;  // positive = expense is after event

                if (daysBefore >= 0 && daysBefore <= ev.windowBefore) {
                    candidates.push({ ev, dist: daysBefore, position: 'before' });
                }
                if (daysAfter >= 0 && daysAfter <= ev.windowAfter) {
                    candidates.push({ ev, dist: daysAfter, position: 'after' });
                }
            }

            if (candidates.length === 1) {
                result.event = candidates[0].ev.name;
            } else if (candidates.length > 1) {
                // Multiple events overlap at this date — use EC intelligence
                if (isCurrentEC) {
                    // EC members: prefer the UPCOMING event (they're prepping)
                    const upcoming = candidates.filter(c => c.position === 'before');
                    result.event = (upcoming.length ? upcoming.sort((a,b) => a.dist - b.dist)[0] : candidates[0]).ev.name;
                } else {
                    // Non-EC / previous EC: prefer the JUST-FINISHED event
                    // (reimbursement for completed event)
                    const past = candidates.filter(c => c.position === 'after');
                    result.event = (past.length ? past.sort((a,b) => a.dist - b.dist)[0] : candidates[0]).ev.name;
                }
            }
        }
    }

    // ── Explicit category already set ──
    if (expense.category) { result.category = expense.category; return result; }

    // ── Category from memo / merchant keywords ──
    const memo   = (expense.description || expense.memo || '').toLowerCase();
    const vendor = (expense.vendor || expense.payee || expense.payerName || expense.to || '').toLowerCase();
    const text   = `${memo} ${vendor}`;

    if (/publix|walmart|apna\s*bazar|grocery|food|costco|aldi|winn.?dixie|sam.?s club/i.test(text)) {
        result.category = 'Food & Grocery';
    } else if (/supplies|water|cards|plates|cups|napkins|decoration/i.test(text)) {
        result.category = 'Supplies';
    } else if (/venue|hall|rental|lakeside|booking/i.test(text)) {
        result.category = 'Venue';
    } else if (/dj|sound|music|speaker|audio/i.test(text)) {
        result.category = 'Entertainment';
    } else if (/print|flyer|banner|poster|design/i.test(text)) {
        result.category = 'Printing';
    } else if (/reimburse/i.test(text)) {
        result.category = 'Reimbursement';
    } else if (memo === '' && expense.type === 'expense' && /zelle/i.test(expense.subj || expense.source || '')) {
        // Zelle sent with no memo → likely reimbursement
        result.category = 'Reimbursement';
    } else if (/picnic|event|festival/i.test(text)) {
        result.category = 'Event Expense';
    } else {
        result.category = 'Other';
    }

    return result;
}

// ═══════════════════════════════════════════════════════════════
// PHASE 3: MERGE WITH EXISTING LEDGER + EXPENSES
// ═══════════════════════════════════════════════════════════════

function mergeAndReconcile(newEntries, ledger) {
    log('INFO', '═══ Phase 3: Merging with existing ledger ═══');

    // Add new income entries (dedup by gmailId)
    const existingGmailIds = new Set(ledger.entries.filter(e => e.gmailId).map(e => e.gmailId));
    let added = 0;
    for (const entry of newEntries) {
        if (entry.gmailId && existingGmailIds.has(entry.gmailId)) {
            continue; // Already in ledger
        }
        ledger.entries.push(entry);
        added++;
    }

    // Load expenses
    const expenseData = loadExpenses();
    const existingExpenseIds = new Set(ledger.entries.filter(e => e.type === 'expense').map(e => e.id));
    let expensesAdded = 0;
    for (const expense of (expenseData.expenses || [])) {
        if (!existingExpenseIds.has(expense.id)) {
            const tags = autoTagExpense(expense);
            ledger.entries.push({
                id: expense.id || `EXP-${Date.now()}-${Math.random().toString(36).slice(2,6)}`,
                type: 'expense',
                date: expense.date,
                amount: parseFloat(expense.amount) || 0,
                source: expense.source || 'manual',
                purpose: expense.purpose || expense.category || 'general',
                payerName: expense.vendor || expense.payee || '',
                memo: expense.description || expense.memo || '',
                comments: expense.comments || '',
                approvedBy: expense.approvedBy || 'EC',
                event: expense.event || tags.event,
                category: expense.category || tags.category
            });
            expensesAdded++;
        }
    }

    // Sort by date
    ledger.entries.sort((a, b) => new Date(a.date) - new Date(b.date));

    log('INFO', `  Added ${added} new income entries, ${expensesAdded} new expense entries`);
    log('INFO', `  Total ledger entries: ${ledger.entries.length}`);

    return ledger;
}

// ═══════════════════════════════════════════════════════════════
// PHASE 4: GENERATE DAILY SUMMARIES
// ═══════════════════════════════════════════════════════════════

function generateDailySummaries(ledger) {
    log('INFO', '═══ Phase 4: Generating daily summaries ═══');

    const byDate = {};
    let runningBalance = 0;

    for (const entry of ledger.entries) {
        const dateKey = entry.date ? new Date(entry.date).toISOString().slice(0, 10) : 'unknown';
        if (!byDate[dateKey]) {
            byDate[dateKey] = {
                date: dateKey,
                income: 0,
                expense: 0,
                entries: [],
                incomeByPurpose: {},
                expenseByPurpose: {},
                openingBalance: runningBalance
            };
        }
        const day = byDate[dateKey];

        if (entry.type === 'income') {
            day.income += entry.amount;
            day.incomeByPurpose[entry.purpose] = (day.incomeByPurpose[entry.purpose] || 0) + entry.amount;
        } else {
            day.expense += entry.amount;
            day.expenseByPurpose[entry.purpose] = (day.expenseByPurpose[entry.purpose] || 0) + entry.amount;
        }
        day.entries.push({
            id: entry.id,
            type: entry.type,
            amount: entry.amount,
            source: entry.source,
            purpose: entry.purpose,
            name: entry.payerName || entry.memberName || '',
            memo: entry.memo,
            comments: entry.comments
        });

        runningBalance += entry.type === 'income' ? entry.amount : -entry.amount;
    }

    // Calculate closing balances
    const dailySummaries = Object.values(byDate).sort((a, b) => a.date.localeCompare(b.date));
    let cumBalance = 0;
    for (const day of dailySummaries) {
        day.netChange = day.income - day.expense;
        cumBalance += day.netChange;
        day.closingBalance = cumBalance;
    }

    return dailySummaries;
}

// ═══════════════════════════════════════════════════════════════
// PHASE 5: GENERATE HTML REPORT
// ═══════════════════════════════════════════════════════════════

function generateReport(ledger, dailySummaries, members) {
    log('INFO', '═══ Phase 5: Generating HTML report ═══');

    const now = new Date();
    const fy = getFiscalYear(now);
    const totalIncome = ledger.entries.filter(e => e.type === 'income').reduce((s, e) => s + e.amount, 0);
    const totalExpense = ledger.entries.filter(e => e.type === 'expense').reduce((s, e) => s + e.amount, 0);
    const balance = totalIncome - totalExpense;

    // Income by purpose
    const incomeByPurpose = {};
    ledger.entries.filter(e => e.type === 'income').forEach(e => {
        incomeByPurpose[e.purpose] = (incomeByPurpose[e.purpose] || 0) + e.amount;
    });

    // Top payers
    const payerTotals = {};
    ledger.entries.filter(e => e.type === 'income').forEach(e => {
        const key = e.memberEmail || e.payerName || 'Unknown';
        payerTotals[key] = (payerTotals[key] || { name: e.payerName || e.memberName || key, amount: 0, count: 0 });
        payerTotals[key].amount += e.amount;
        payerTotals[key].count++;
    });
    const topPayers = Object.values(payerTotals).sort((a, b) => b.amount - a.amount).slice(0, 20);

    // Unacknowledged payments
    const unacked = ledger.entries.filter(e => e.type === 'income' && !e.acknowledged);

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>BANF Account Ledger — FY${fy}-${fy + 1}</title>
<style>
:root { --bg: #0a0e17; --card: #111827; --border: #1f2937; --text: #e5e7eb; --muted: #9ca3af;
        --green: #22c55e; --red: #ef4444; --blue: #3b82f6; --yellow: #eab308; --purple: #a855f7; }
* { margin: 0; padding: 0; box-sizing: border-box; }
body { background: var(--bg); color: var(--text); font-family: 'Segoe UI', system-ui, sans-serif; padding: 24px; }
.header { text-align: center; padding: 32px 0; border-bottom: 1px solid var(--border); margin-bottom: 24px; }
.header h1 { font-size: 1.8rem; background: linear-gradient(135deg, var(--green), var(--blue)); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
.header .subtitle { color: var(--muted); margin-top: 8px; }
.stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin-bottom: 24px; }
.stat-card { background: var(--card); border: 1px solid var(--border); border-radius: 12px; padding: 20px; text-align: center; }
.stat-card .value { font-size: 1.8rem; font-weight: 700; margin: 8px 0; }
.stat-card .label { color: var(--muted); font-size: .85rem; text-transform: uppercase; letter-spacing: .05em; }
.income { color: var(--green); }
.expense { color: var(--red); }
.balance { color: var(--blue); }
.section { background: var(--card); border: 1px solid var(--border); border-radius: 12px; padding: 20px; margin-bottom: 24px; }
.section h2 { font-size: 1.2rem; margin-bottom: 16px; display: flex; align-items: center; gap: 8px; }
table { width: 100%; border-collapse: collapse; font-size: .85rem; }
th { background: rgba(255,255,255,.03); padding: 10px 12px; text-align: left; color: var(--muted); font-weight: 600; border-bottom: 1px solid var(--border); }
td { padding: 10px 12px; border-bottom: 1px solid rgba(255,255,255,.05); }
tr:hover { background: rgba(255,255,255,.02); }
.badge { display: inline-block; padding: 2px 8px; border-radius: 999px; font-size: .75rem; font-weight: 600; }
.badge-membership { background: rgba(34,197,94,.15); color: var(--green); }
.badge-sponsorship { background: rgba(168,85,247,.15); color: var(--purple); }
.badge-donation { background: rgba(59,130,246,.15); color: var(--blue); }
.badge-event_fee { background: rgba(234,179,8,.15); color: var(--yellow); }
.badge-unknown { background: rgba(156,163,175,.15); color: var(--muted); }
.purpose-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px; }
.purpose-card { background: rgba(255,255,255,.03); border-radius: 8px; padding: 16px; text-align: center; }
.purpose-card .amount { font-size: 1.4rem; font-weight: 700; }
.purpose-card .name { color: var(--muted); font-size: .85rem; margin-top: 4px; }
.alert { background: rgba(239,68,68,.1); border: 1px solid rgba(239,68,68,.3); border-radius: 8px; padding: 16px; margin-bottom: 16px; }
.alert .count { font-size: 1.5rem; font-weight: 700; color: var(--yellow); }
.footer { text-align: center; color: var(--muted); font-size: .75rem; padding: 24px 0; border-top: 1px solid var(--border); margin-top: 24px; }
</style>
</head>
<body>

<div class="header">
  <h1>📊 BANF Account Ledger</h1>
  <div class="subtitle">Fiscal Year ${fy}-${fy + 1} | Generated: ${now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
</div>

<div class="stats-grid">
  <div class="stat-card">
    <div class="label">Total Income</div>
    <div class="value income">$${totalIncome.toLocaleString()}</div>
  </div>
  <div class="stat-card">
    <div class="label">Total Expenses</div>
    <div class="value expense">$${totalExpense.toLocaleString()}</div>
  </div>
  <div class="stat-card">
    <div class="label">Net Balance</div>
    <div class="value balance">$${balance.toLocaleString()}</div>
  </div>
  <div class="stat-card">
    <div class="label">Transactions</div>
    <div class="value">${ledger.entries.length}</div>
  </div>
</div>

${unacked.length > 0 ? `
<div class="alert">
  <strong>⚠️ Unacknowledged Payments</strong>
  <div class="count">${unacked.length}</div>
  <div style="color: var(--muted); font-size: .85rem; margin-top: 4px;">
    Payments received but not yet acknowledged to the payer.
    Total: $${unacked.reduce((s, e) => s + e.amount, 0).toLocaleString()}
  </div>
</div>
` : ''}

<div class="section">
  <h2>💰 Income by Purpose</h2>
  <div class="purpose-grid">
    ${Object.entries(incomeByPurpose).sort(([, a], [, b]) => b - a).map(([purpose, amount]) => `
    <div class="purpose-card">
      <div class="amount income">$${amount.toLocaleString()}</div>
      <div class="name">${purpose.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</div>
      <div style="color: var(--muted); font-size: .75rem;">${ledger.entries.filter(e => e.purpose === purpose && e.type === 'income').length} transactions</div>
    </div>
    `).join('')}
  </div>
</div>

<div class="section">
  <h2>📅 Daily Ledger</h2>
  <table>
    <thead>
      <tr><th>Date</th><th>Income</th><th>Expense</th><th>Net</th><th>Balance</th><th>Entries</th></tr>
    </thead>
    <tbody>
      ${dailySummaries.slice(-30).reverse().map(d => `
      <tr>
        <td>${d.date}</td>
        <td class="income">$${d.income.toLocaleString()}</td>
        <td class="expense">$${d.expense.toLocaleString()}</td>
        <td style="color: ${d.netChange >= 0 ? 'var(--green)' : 'var(--red)'}">$${d.netChange.toLocaleString()}</td>
        <td class="balance">$${d.closingBalance.toLocaleString()}</td>
        <td>${d.entries.length}</td>
      </tr>
      `).join('')}
    </tbody>
  </table>
</div>

<div class="section">
  <h2>🔍 All Transactions</h2>
  <table>
    <thead>
      <tr><th>Date</th><th>Type</th><th>Amount</th><th>From/To</th><th>Purpose</th><th>Source</th><th>Memo</th></tr>
    </thead>
    <tbody>
      ${ledger.entries.slice(-100).reverse().map(e => `
      <tr>
        <td>${e.date ? new Date(e.date).toLocaleDateString() : '—'}</td>
        <td><span class="badge badge-${e.type === 'income' ? 'membership' : 'unknown'}">${e.type}</span></td>
        <td style="color: ${e.type === 'income' ? 'var(--green)' : 'var(--red)'}">$${e.amount.toLocaleString()}</td>
        <td>${e.memberName || e.payerName || '—'}</td>
        <td><span class="badge badge-${e.purpose}">${e.purpose.replace(/_/g, ' ')}</span></td>
        <td>${e.source || '—'}</td>
        <td style="max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${e.memo || e.comments || '—'}</td>
      </tr>
      `).join('')}
    </tbody>
  </table>
</div>

<div class="section">
  <h2>🏆 Top Payers</h2>
  <table>
    <thead><tr><th>#</th><th>Name</th><th>Total</th><th>Transactions</th></tr></thead>
    <tbody>
      ${topPayers.map((p, i) => `
      <tr>
        <td>${i + 1}</td>
        <td>${p.name}</td>
        <td class="income">$${p.amount.toLocaleString()}</td>
        <td>${p.count}</td>
      </tr>
      `).join('')}
    </tbody>
  </table>
</div>

<div class="footer">
  BANF Account Reconciliation Agent v1.0 | ${ledger.entries.length} entries | Last scan: ${ledger.lastScanDate || 'N/A'}
</div>
</body>
</html>`;

    fs.writeFileSync(REPORT_FILE, html);
    log('INFO', `  Report saved → ${REPORT_FILE}`);
}

// ═══════════════════════════════════════════════════════════════
// MAIN ORCHESTRATOR
// ═══════════════════════════════════════════════════════════════

async function main() {
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('  📊 BANF Daily Account Reconciliation & Ledger Agent');
    console.log(`  📅 Scope: Last ${SINCE_DAYS} days`);
    console.log(`  ${REPORT_ONLY ? '📄 Report-only mode' : DRY_RUN ? '🔍 Dry-run mode' : '🔄 Full reconciliation'}`);
    console.log('═══════════════════════════════════════════════════════════════\n');

    // Load existing data
    const ledger = loadLedger();
    const reconState = loadReconState();
    const members = loadCRM();

    log('INFO', `Loaded ${members.length} CRM members, ${ledger.entries.length} existing ledger entries`);

    if (!REPORT_ONLY) {
        // Phase 1: Scan all payment emails
        const newPayments = await scanAllPaymentEmails(reconState);

        // Phase 2: Classify and build entries
        const newEntries = classifyAndBuildEntries(newPayments, members);

        // Phase 3: Merge with existing ledger
        mergeAndReconcile(newEntries, ledger);

        // Save
        ledger.lastScanDate = new Date().toISOString();
        if (!DRY_RUN) {
            saveLedger(ledger);
            saveReconState(reconState);
        }
    }

    // Phase 4: Generate daily summaries
    const dailySummaries = generateDailySummaries(ledger);

    // Phase 5: Generate HTML report
    generateReport(ledger, dailySummaries, members);

    // Summary
    const income = ledger.entries.filter(e => e.type === 'income');
    const expense = ledger.entries.filter(e => e.type === 'expense');
    const totalIncome = income.reduce((s, e) => s + e.amount, 0);
    const totalExpense = expense.reduce((s, e) => s + e.amount, 0);

    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('  RECONCILIATION SUMMARY');
    console.log('───────────────────────────────────────────────────────────────');
    console.log(`  Total Income:    $${totalIncome.toLocaleString()}  (${income.length} transactions)`);
    console.log(`  Total Expense:   $${totalExpense.toLocaleString()}  (${expense.length} transactions)`);
    console.log(`  Net Balance:     $${(totalIncome - totalExpense).toLocaleString()}`);
    console.log(`  Unacknowledged:  ${income.filter(e => !e.acknowledged).length} payments`);
    console.log(`  Daily summaries: ${dailySummaries.length} days`);
    console.log('───────────────────────────────────────────────────────────────');

    // Purpose breakdown
    const byPurpose = {};
    income.forEach(e => { byPurpose[e.purpose] = (byPurpose[e.purpose] || 0) + e.amount; });
    console.log('  Income by Purpose:');
    for (const [p, a] of Object.entries(byPurpose).sort(([, x], [, y]) => y - x)) {
        console.log(`    ${p.padEnd(15)} $${a.toLocaleString()}`);
    }

    console.log('═══════════════════════════════════════════════════════════════');
    console.log(`\n✅ Report: ${REPORT_FILE}`);
    console.log(`✅ Ledger: ${LEDGER_FILE}`);

    // Phase 6: Email report to recipient if --email-to specified
    if (EMAIL_TO) {
        log('INFO', `Emailing report to ${EMAIL_TO}...`);
        try {
            const reportHtml = fs.readFileSync(REPORT_FILE, 'utf8');
            const token = await getGmailToken();
            const dateRange = SINCE_DATE_LABEL
                ? `${SINCE_DATE_LABEL} to ${new Date().toISOString().slice(0,10)}`
                : `Last ${SINCE_DAYS} days`;
            const subject = `BANF Reconciled Ledger Report — ${dateRange}`;

            const emailBody = `<!DOCTYPE html>
<html><head><meta charset="utf-8"></head><body>
<p>Dear President,</p>
<p>Please find below the <strong>BANF Reconciled Ledger Report</strong> for the period <strong>${dateRange}</strong>.</p>
<p><strong>Summary:</strong></p>
<ul>
<li>Total Income: <strong>$${totalIncome.toLocaleString()}</strong> (${income.length} transactions)</li>
<li>Total Expenses: <strong>$${totalExpense.toLocaleString()}</strong> (${expense.length} transactions)</li>
<li>Net Balance: <strong>$${(totalIncome - totalExpense).toLocaleString()}</strong></li>
<li>Unacknowledged: ${income.filter(e => !e.acknowledged).length} payments</li>
</ul>
<hr>
${reportHtml}
<hr>
<p style="font-size:0.8em;color:#888;">This report was auto-generated by the BANF Daily Reconciliation Agent on ${new Date().toLocaleString()}</p>
</body></html>`;

            // Build MIME message
            const raw = [
                `From: BANF Platform <banfjax@gmail.com>`,
                `To: ${EMAIL_TO}`,
                `Subject: ${subject}`,
                'MIME-Version: 1.0',
                'Content-Type: text/html; charset=UTF-8',
                '',
                emailBody
            ].join('\r\n');
            const encoded = Buffer.from(raw).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

            const sendResp = await httpsRequest('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ raw: encoded })
            });

            if (sendResp.status >= 200 && sendResp.status < 300) {
                log('INFO', `✅ Report emailed to ${EMAIL_TO} (ID: ${sendResp.data?.id || 'ok'})`);
                console.log(`\n📧 Report emailed to: ${EMAIL_TO}`);
            } else {
                log('ERROR', `Failed to email report: ${JSON.stringify(sendResp.data)}`);
                console.log(`\n❌ Failed to email report: ${sendResp.status}`);
            }
        } catch (e) {
            log('ERROR', `Email send failed: ${e.message}`);
            console.log(`\n❌ Email send failed: ${e.message}`);
        }
    }
}

main().catch(e => {
    log('ERROR', `Fatal: ${e.message}`);
    console.error(e.stack);
    process.exit(1);
});
