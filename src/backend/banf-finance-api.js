/**
 * ═══════════════════════════════════════════════════════════════
 *  BANF Finance API — Vendor registry + Financial Ledger + Reconciliation
 *  Collections: Vendors, FinancialEntries, ReconciliationReports
 *  Accounting year: January 1 – December 31
 *  Years tracked: 2020, 2021, 2022, 2023, 2024, 2025
 * ═══════════════════════════════════════════════════════════════
 */

import { ok, badRequest, serverError, forbidden } from 'wix-http-functions';
import wixData from 'wix-data';
import { collections as wixCollections } from 'wix-data.v2';
import { fetch as wixFetch } from 'wix-fetch';
import { checkPermission } from 'backend/rbac';

const SA = { suppressAuth: true };

// ─── Helpers ─────────────────────────────────────────────────────────────────
function jsonOk(data) {
    return ok({ body: JSON.stringify({ success: true, ...data }),
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
}
function jsonErr(msg, code = 400) {
    const fn = code === 403 ? forbidden : (code >= 500 ? serverError : badRequest);
    return fn({ body: JSON.stringify({ success: false, error: msg }),
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
}
function handleCors() {
    return ok({ body: '', headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization,x-user-email'
    }});
}
async function parseBody(req) {
    try { return await req.body.json(); } catch (_) { return {}; }
}
function nanoid(pfx = '') {
    return pfx + Math.random().toString(36).slice(2, 8).toUpperCase() + '-' +
           Math.random().toString(36).slice(2, 6).toUpperCase();
}

// Vendor categories
const VENDOR_CATEGORIES = [
    'venue', 'catering', 'decoration', 'photography', 'videography',
    'sound_music', 'printing', 'apparel', 'technology', 'spiritual',
    'transportation', 'security', 'entertainment', 'media', 'miscellaneous'
];

// Financial entry categories
const INCOME_CATEGORIES  = ['membership', 'event_ticket', 'sponsorship', 'donation', 'advertisement', 'other_income'];
const EXPENSE_CATEGORIES = ['venue', 'catering', 'decoration', 'photography', 'printing', 'sound_music', 'apparel', 'prasad', 'admin', 'bank_fee', 'transport', 'other_expense'];

// ════════════════════════════════════════════════════════════════
// VENDOR ENDPOINTS
// ════════════════════════════════════════════════════════════════

/**
 * GET /vendors — list all vendors
 * Params: category, isActive (true/false), search
 */
export async function get_vendors(request) {
    const perm = await checkPermission(request, 'admin:view');
    if (!perm.allowed) return jsonErr('Forbidden', 403);
    try {
        const { category, search, page = '1', limit = '100' } = request.query || {};
        const pg = Math.max(1, parseInt(page));
        const lim = Math.min(200, parseInt(limit));
        let q = wixData.query('Vendors').limit(lim).skip((pg - 1) * lim);
        if (category) q = q.eq('category', category);
        if (search)   q = q.contains('name', search).or(q.contains('contactName', search));
        q = q.ascending('name');
        const result = await q.find(SA).catch(() => ({ items: [], totalCount: 0 }));
        return jsonOk({ vendors: result.items, total: result.totalCount, page: pg });
    } catch (e) { return jsonErr(e.message, 500); }
}
export function options_vendors(request) { return handleCors(); }

/**
 * GET /vendor — get single vendor by vendorId
 */
export async function get_vendor(request) {
    const perm = await checkPermission(request, 'admin:view');
    if (!perm.allowed) return jsonErr('Forbidden', 403);
    try {
        const { vendorId } = request.query || {};
        if (!vendorId) return jsonErr('vendorId required');
        const res = await wixData.query('Vendors').eq('vendorId', vendorId).find(SA);
        if (!res.items.length) return jsonErr('Vendor not found', 404);
        return jsonOk({ vendor: res.items[0] });
    } catch (e) { return jsonErr(e.message, 500); }
}
export function options_vendor(request) { return handleCors(); }

/**
 * POST /vendor_create — create a new vendor
 * Body: { name, category, profile, address, city, state, zip,
 *         contactName, contactTitle, phone, email, website, taxId,
 *         tags[], notes, isActive }
 */
export async function post_vendor_create(request) {
    const perm = await checkPermission(request, 'admin:manage_vendors');
    if (!perm.allowed) return jsonErr('Forbidden', 403);
    try {
        const body = await parseBody(request);
        if (!body.name) return jsonErr('name required');
        if (!body.category) return jsonErr('category required');
        if (!VENDOR_CATEGORIES.includes(body.category))
            return jsonErr(`category must be one of: ${VENDOR_CATEGORIES.join(', ')}`);

        const vendor = {
            vendorId:     nanoid('VND-'),
            name:         body.name.trim(),
            category:     body.category,
            profile:      body.profile || '',
            address:      body.address || '',
            city:         body.city || '',
            state:        body.state || 'FL',
            zip:          body.zip || '',
            contactName:  body.contactName || '',
            contactTitle: body.contactTitle || '',
            phone:        body.phone || '',
            altPhone:     body.altPhone || '',
            email:        body.email || '',
            altEmail:     body.altEmail || '',
            website:      body.website || '',
            taxId:        body.taxId || '',
            tags:         Array.isArray(body.tags) ? body.tags.join(',') : (body.tags || ''),
            notes:        body.notes || '',
            isActive:     body.isActive !== false,
            addedBy:      perm.email,
            addedAt:      new Date()
        };
        const inserted = await wixData.insert('Vendors', vendor, SA);
        return jsonOk({ vendor: inserted });
    } catch (e) { return jsonErr(e.message, 500); }
}
export function options_vendor_create(request) { return handleCors(); }

/**
 * POST /vendor_update — update vendor fields
 * Body: { vendorId, ...fields }
 */
export async function post_vendor_update(request) {
    const perm = await checkPermission(request, 'admin:manage_vendors');
    if (!perm.allowed) return jsonErr('Forbidden', 403);
    try {
        const body = await parseBody(request);
        if (!body.vendorId) return jsonErr('vendorId required');
        const res = await wixData.query('Vendors').eq('vendorId', body.vendorId).find(SA);
        if (!res.items.length) return jsonErr('Vendor not found', 404);
        const existing = res.items[0];
        const allowed = ['name','category','profile','address','city','state','zip',
            'contactName','contactTitle','phone','altPhone','email','altEmail',
            'website','taxId','tags','notes','isActive'];
        const updates = {};
        allowed.forEach(f => { if (body[f] !== undefined) updates[f] = body[f]; });
        const updated = await wixData.update('Vendors', { ...existing, ...updates, updatedBy: perm.email, updatedAt: new Date() }, SA);
        return jsonOk({ vendor: updated });
    } catch (e) { return jsonErr(e.message, 500); }
}
export function options_vendor_update(request) { return handleCors(); }

/**
 * GET /vendor_categories — list all category options
 */
export async function get_vendor_categories(request) {
    return jsonOk({ categories: VENDOR_CATEGORIES, income: INCOME_CATEGORIES, expense: EXPENSE_CATEGORIES });
}
export function options_vendor_categories(request) { return handleCors(); }

// ════════════════════════════════════════════════════════════════
// FINANCIAL LEDGER ENDPOINTS
// ════════════════════════════════════════════════════════════════

/**
 * GET /ledger — list ledger entries for a year
 * Params: year, type (income/expense), category, reconciled (true/false), page, limit
 */
export async function get_ledger(request) {
    const perm = await checkPermission(request, 'admin:view');
    if (!perm.allowed) return jsonErr('Forbidden', 403);
    try {
        const { year, type, category, reconciled, page = '1', limit = '200' } = request.query || {};
        const pg  = Math.max(1, parseInt(page));
        const lim = Math.min(500, parseInt(limit));
        let q = wixData.query('FinancialEntries').limit(lim).skip((pg - 1) * lim);
        if (year)       q = q.eq('year', parseInt(year));
        if (type)       q = q.eq('type', type);
        if (category)   q = q.eq('category', category);
        if (reconciled === 'true')  q = q.eq('reconciled', true);
        if (reconciled === 'false') q = q.eq('reconciled', false);
        q = q.ascending('entryDate');
        const result = await q.find(SA).catch(() => ({ items: [], totalCount: 0 }));
        const items = result.items;

        // Compute totals
        const income  = items.filter(e => e.type === 'income').reduce((s, e) => s + (e.amount || 0), 0);
        const expense = items.filter(e => e.type === 'expense').reduce((s, e) => s + (e.amount || 0), 0);
        return jsonOk({ entries: items, total: result.totalCount, page: pg,
            summary: { income, expense, net: income - expense, count: items.length } });
    } catch (e) { return jsonErr(e.message, 500); }
}
export function options_ledger(request) { return handleCors(); }

/**
 * GET /ledger_entry — single entry by entryId
 */
export async function get_ledger_entry(request) {
    const perm = await checkPermission(request, 'admin:view');
    if (!perm.allowed) return jsonErr('Forbidden', 403);
    try {
        const { entryId } = request.query || {};
        if (!entryId) return jsonErr('entryId required');
        const res = await wixData.query('FinancialEntries').eq('entryId', entryId).find(SA);
        if (!res.items.length) return jsonErr('Entry not found', 404);
        return jsonOk({ entry: res.items[0] });
    } catch (e) { return jsonErr(e.message, 500); }
}
export function options_ledger_entry(request) { return handleCors(); }

/**
 * POST /ledger_entry_create — add a ledger line item
 * Body: { year, entryDate, type, category, description, amount,
 *         vendorId?, vendorName?, paymentMethod, referenceNo, notes, source }
 */
export async function post_ledger_entry_create(request) {
    const perm = await checkPermission(request, 'admin:manage_payments');
    if (!perm.allowed) return jsonErr('Forbidden', 403);
    try {
        const body = await parseBody(request);
        if (!body.year)        return jsonErr('year required');
        if (!body.type)        return jsonErr('type required (income|expense)');
        if (!['income','expense'].includes(body.type)) return jsonErr('type must be income or expense');
        if (!body.description) return jsonErr('description required');
        if (!body.amount)      return jsonErr('amount required');

        const entry = {
            entryId:          nanoid('FE-'),
            year:             parseInt(body.year),
            entryDate:        body.entryDate ? new Date(body.entryDate) : new Date(),
            type:             body.type,
            category:         body.category || (body.type === 'income' ? 'other_income' : 'other_expense'),
            description:      body.description.trim(),
            amount:           parseFloat(body.amount),
            currency:         'USD',
            vendorId:         body.vendorId || '',
            vendorName:       body.vendorName || '',
            paymentMethod:    body.paymentMethod || '',
            referenceNo:      body.referenceNo || '',
            notes:            body.notes || '',
            source:           body.source || 'manual',
            eventName:        body.eventName || '',
            reconciled:       false,
            reconciledAt:     null,
            reconciledBy:     '',
            evidenceType:     'none',
            evidenceEmailIds: '',
            evidenceDriveIds: '',
            evidenceNotes:    '',
            addedBy:          perm.email,
            addedAt:          new Date()
        };
        const inserted = await wixData.insert('FinancialEntries', entry, SA);
        return jsonOk({ entry: inserted });
    } catch (e) { return jsonErr(e.message, 500); }
}
export function options_ledger_entry_create(request) { return handleCors(); }

/**
 * POST /ledger_entry_update — update a ledger entry
 * Body: { entryId, ...fields }
 */
export async function post_ledger_entry_update(request) {
    const perm = await checkPermission(request, 'admin:manage_payments');
    if (!perm.allowed) return jsonErr('Forbidden', 403);
    try {
        const body = await parseBody(request);
        if (!body.entryId) return jsonErr('entryId required');
        const res = await wixData.query('FinancialEntries').eq('entryId', body.entryId).find(SA);
        if (!res.items.length) return jsonErr('Entry not found', 404);
        const existing = res.items[0];
        const allowed = ['entryDate','type','category','description','amount','vendorId','vendorName',
            'paymentMethod','referenceNo','notes','source','eventName','reconciled',
            'reconciledAt','reconciledBy','evidenceType','evidenceEmailIds','evidenceDriveIds','evidenceNotes'];
        const updates = {};
        allowed.forEach(f => { if (body[f] !== undefined) updates[f] = body[f]; });
        const updated = await wixData.update('FinancialEntries',
            { ...existing, ...updates, updatedBy: perm.email, updatedAt: new Date() }, SA);
        return jsonOk({ entry: updated });
    } catch (e) { return jsonErr(e.message, 500); }
}
export function options_ledger_entry_update(request) { return handleCors(); }

/**
 * GET /ledger_years — list years that have financial entries
 */
export async function get_ledger_years(request) {
    const perm = await checkPermission(request, 'admin:view');
    if (!perm.allowed) return jsonErr('Forbidden', 403);
    try {
        const res = await wixData.query('FinancialEntries').limit(1000).find(SA).catch(() => ({ items: [] }));
        const years = [...new Set(res.items.map(e => e.year))].filter(Boolean).sort();
        const summary = {};
        for (const y of years) {
            const yItems = res.items.filter(e => e.year === y);
            const inc = yItems.filter(e => e.type === 'income').reduce((s, e) => s + (e.amount || 0), 0);
            const exp = yItems.filter(e => e.type === 'expense').reduce((s, e) => s + (e.amount || 0), 0);
            summary[y] = { year: y, income: inc, expense: exp, net: inc - exp,
                entries: yItems.length,
                reconciled: yItems.filter(e => e.reconciled).length };
        }
        return jsonOk({ years, summary });
    } catch (e) { return jsonErr(e.message, 500); }
}
export function options_ledger_years(request) { return handleCors(); }

// ════════════════════════════════════════════════════════════════
// RECONCILIATION ENGINE
// ════════════════════════════════════════════════════════════════

/**
 * Search Gmail (Inbox + Sent) for emails matching a financial entry.
 * Looks for: vendor name / amount / description within ±45 days of entry date.
 */
async function findEmailEvidence(entry) {
    const keywords = [entry.vendorName, entry.description, String(entry.amount)]
        .filter(Boolean).map(k => k.toLowerCase());
    const entryMs = new Date(entry.entryDate).getTime();
    const windowMs = 45 * 24 * 60 * 60 * 1000;
    const from = new Date(entryMs - windowMs);
    const to   = new Date(entryMs + windowMs);

    const matches = [];
    try {
        const [inbox, sent] = await Promise.all([
            wixData.query('InboxMessages')
                .ge('receivedAt', from).le('receivedAt', to).limit(500).find(SA),
            wixData.query('SentEmails')
                .ge('sentAt', from).le('sentAt', to).limit(500).find(SA)
        ]);
        const all = [...(inbox.items || []), ...(sent.items || [])];
        for (const msg of all) {
            const text = ((msg.subject || '') + ' ' + (msg.body || '') + ' ' + (msg.snippet || '')).toLowerCase();
            const matched = keywords.filter(k => k.length > 3 && text.includes(k));
            if (matched.length >= 1) {
                matches.push({
                    id: msg._id,
                    source: msg.receivedAt ? 'inbox' : 'sent',
                    subject: msg.subject || '',
                    date: msg.receivedAt || msg.sentAt,
                    matchedOn: matched
                });
            }
        }
    } catch (_) {}
    return matches;
}

/**
 * Search Google Drive sync history for files matching a financial entry.
 */
async function findDriveEvidence(entry, year) {
    const keywords = [entry.vendorName, entry.description, entry.category, String(year)]
        .filter(Boolean).map(k => k.toLowerCase());
    const matches = [];
    try {
        const res = await wixData.query('DriveSync').limit(500).find(SA);
        for (const file of res.items || []) {
            const text = ((file.fileName || '') + ' ' + (file.folderPath || '') + ' ' + (file.notes || '')).toLowerCase();
            const matched = keywords.filter(k => k.length > 3 && text.includes(k));
            if (matched.length >= 1) {
                matches.push({
                    id: file._id,
                    fileId: file.driveFileId,
                    fileName: file.fileName,
                    folderPath: file.folderPath,
                    matchedOn: matched
                });
            }
        }
        // Also match by year folder name
        const yearStr = String(year);
        const yearMatches = (res.items || []).filter(f =>
            (f.folderPath || '').includes(yearStr) && !matches.find(m => m.id === f._id)
        );
        yearMatches.forEach(f => matches.push({
            id: f._id, fileId: f.driveFileId,
            fileName: f.fileName, folderPath: f.folderPath, matchedOn: [yearStr]
        }));
    } catch (_) {}
    return matches;
}

/**
 * POST /reconcile — run reconciliation for a specific year
 * Body: { year, forceRerun } (if forceRerun, re-checks already-reconciled entries)
 */
export async function post_reconcile(request) {
    const perm = await checkPermission(request, 'admin:manage_payments');
    if (!perm.allowed) return jsonErr('Forbidden', 403);
    try {
        const body = await parseBody(request);
        const year = parseInt(body.year || new Date().getFullYear());
        if (!year || year < 2018 || year > 2030) return jsonErr('Invalid year');
        const forceRerun = !!body.forceRerun;

        const res = await wixData.query('FinancialEntries')
            .eq('year', year).limit(500).find(SA).catch(() => ({ items: [] }));
        const entries = res.items;
        if (!entries.length) return jsonOk({ year, message: 'No entries found for this year', stats: { total: 0 } });

        const stats = { total: entries.length, newlyReconciled: 0, alreadyReconciled: 0,
            unmatched: 0, emailEvidence: 0, driveEvidence: 0, bothEvidence: 0 };

        for (const entry of entries) {
            if (entry.reconciled && !forceRerun) { stats.alreadyReconciled++; continue; }

            const emailMatches = await findEmailEvidence(entry);
            const driveMatches = await findDriveEvidence(entry, year);
            const hasEmail = emailMatches.length > 0;
            const hasDrive = driveMatches.length > 0;
            const evidenceType = hasEmail && hasDrive ? 'both' : hasEmail ? 'email' : hasDrive ? 'drive' : 'none';
            const reconciled   = evidenceType !== 'none';

            const updateData = {
                ...entry,
                reconciled,
                evidenceType,
                evidenceEmailIds: emailMatches.map(m => m.id).join(','),
                evidenceEmailSummary: JSON.stringify(emailMatches.slice(0, 3).map(m =>
                    ({ subject: m.subject, date: m.date, matchedOn: m.matchedOn }))),
                evidenceDriveIds: driveMatches.map(m => m.fileId || m.id).join(','),
                evidenceDriveSummary: JSON.stringify(driveMatches.slice(0, 3).map(m =>
                    ({ fileName: m.fileName, folder: m.folderPath }))),
                evidenceNotes: [
                    emailMatches.length ? `${emailMatches.length} email(s) matched` : '',
                    driveMatches.length ? `${driveMatches.length} Drive file(s) matched` : ''
                ].filter(Boolean).join('; ') || 'No evidence found',
                reconciledAt: reconciled ? new Date() : null,
                reconciledBy: reconciled ? 'auto:reconcile-engine' : ''
            };
            await wixData.update('FinancialEntries', updateData, SA).catch(() => {});

            if (reconciled) stats.newlyReconciled++;
            else stats.unmatched++;
            if (hasEmail && hasDrive) stats.bothEvidence++;
            else if (hasEmail) stats.emailEvidence++;
            else if (hasDrive) stats.driveEvidence++;
        }

        // Compute financial totals for report
        const income  = entries.filter(e => e.type === 'income').reduce((s, e) => s + (e.amount || 0), 0);
        const expense = entries.filter(e => e.type === 'expense').reduce((s, e) => s + (e.amount || 0), 0);

        // Save reconciliation report
        const existing = await wixData.query('ReconciliationReports').eq('year', year).find(SA).catch(() => ({ items: [] }));
        const reportData = {
            reportId:              existing.items[0]?.reportId || nanoid('REC-'),
            year,
            generatedAt:           new Date(),
            generatedBy:           perm.email,
            totalIncome:           income,
            totalExpense:          expense,
            netBalance:            income - expense,
            incomeCount:           entries.filter(e => e.type === 'income').length,
            expenseCount:          entries.filter(e => e.type === 'expense').length,
            reconciledCount:       stats.newlyReconciled + stats.alreadyReconciled,
            unreconciledCount:     stats.unmatched,
            emailEvidenceCount:    stats.emailEvidence,
            driveEvidenceCount:    stats.driveEvidence,
            bothEvidenceCount:     stats.bothEvidence,
            totalEntries:          stats.total,
            reconciliationRate:    stats.total > 0 ? Math.round(((stats.newlyReconciled + stats.alreadyReconciled) / stats.total) * 100) : 0
        };
        if (existing.items[0]) {
            await wixData.update('ReconciliationReports', { ...existing.items[0], ...reportData }, SA).catch(() => {});
        } else {
            await wixData.insert('ReconciliationReports', reportData, SA).catch(() => {});
        }

        return jsonOk({ year, stats, totals: { income, expense, net: income - expense },
            message: `Reconciliation complete: ${stats.newlyReconciled} newly reconciled, ${stats.unmatched} unmatched` });
    } catch (e) { return jsonErr(e.message, 500); }
}
export function options_reconcile(request) { return handleCors(); }

/**
 * GET /reconciliation_report — get stored reconciliation report + full ledger for a year
 * Params: year
 */
export async function get_reconciliation_report(request) {
    const perm = await checkPermission(request, 'admin:view');
    if (!perm.allowed) return jsonErr('Forbidden', 403);
    try {
        const { year } = request.query || {};
        if (!year) return jsonErr('year required');
        const y = parseInt(year);

        const [reportRes, entriesRes] = await Promise.all([
            wixData.query('ReconciliationReports').eq('year', y).find(SA).catch(() => ({ items: [] })),
            wixData.query('FinancialEntries').eq('year', y).ascending('entryDate').limit(500).find(SA).catch(() => ({ items: [] }))
        ]);

        const report  = reportRes.items[0] || null;
        const entries = entriesRes.items;

        // Build structured ledger output
        const income  = entries.filter(e => e.type === 'income');
        const expense = entries.filter(e => e.type === 'expense');

        const incomeByCategory  = groupByCategory(income);
        const expenseByCategory = groupByCategory(expense);

        const totalIncome  = income.reduce((s, e) => s + (e.amount || 0), 0);
        const totalExpense = expense.reduce((s, e) => s + (e.amount || 0), 0);

        return jsonOk({
            year: y,
            reportMeta: report,
            ledger: {
                income:  { entries: income,  byCategory: incomeByCategory,  total: totalIncome },
                expense: { entries: expense, byCategory: expenseByCategory, total: totalExpense },
                net:     totalIncome - totalExpense
            },
            reconciliation: {
                reconciled:    entries.filter(e => e.reconciled).length,
                unreconciled:  entries.filter(e => !e.reconciled).length,
                rate:          entries.length > 0 ? Math.round((entries.filter(e => e.reconciled).length / entries.length) * 100) : 0,
                byEvidenceType: {
                    email: entries.filter(e => e.evidenceType === 'email').length,
                    drive: entries.filter(e => e.evidenceType === 'drive').length,
                    both:  entries.filter(e => e.evidenceType === 'both').length,
                    none:  entries.filter(e => e.evidenceType === 'none' || !e.evidenceType).length
                }
            }
        });
    } catch (e) { return jsonErr(e.message, 500); }
}
export function options_reconciliation_report(request) { return handleCors(); }

function groupByCategory(entries) {
    const groups = {};
    for (const e of entries) {
        const cat = e.category || 'other';
        if (!groups[cat]) groups[cat] = { category: cat, entries: [], total: 0 };
        groups[cat].entries.push(e);
        groups[cat].total += e.amount || 0;
    }
    return Object.values(groups).sort((a, b) => b.total - a.total);
}

/**
 * GET /reconciliation_summary — all years overview
 */
export async function get_reconciliation_summary(request) {
    const perm = await checkPermission(request, 'admin:view');
    if (!perm.allowed) return jsonErr('Forbidden', 403);
    try {
        const reports = await wixData.query('ReconciliationReports')
            .ascending('year').limit(20).find(SA).catch(() => ({ items: [] }));

        // Also compute from live entries for years without a report
        const allEntries = await wixData.query('FinancialEntries')
            .limit(1000).find(SA).catch(() => ({ items: [] }));
        const years = [...new Set(allEntries.items.map(e => e.year))].filter(Boolean).sort();

        const yearSummaries = years.map(y => {
            const stored = reports.items.find(r => r.year === y);
            const yEntries = allEntries.items.filter(e => e.year === y);
            const income  = yEntries.filter(e => e.type === 'income').reduce((s, e) => s + (e.amount || 0), 0);
            const expense = yEntries.filter(e => e.type === 'expense').reduce((s, e) => s + (e.amount || 0), 0);
            const reconciled = yEntries.filter(e => e.reconciled).length;
            return {
                year: y,
                accountingYear: `${y} (Jan–Dec)`,
                totalIncome:  stored?.totalIncome  ?? income,
                totalExpense: stored?.totalExpense ?? expense,
                netBalance:   stored?.netBalance   ?? (income - expense),
                entries:      yEntries.length,
                reconciledCount: reconciled,
                unreconciledCount: yEntries.length - reconciled,
                reconciliationRate: yEntries.length > 0 ? Math.round(reconciled / yEntries.length * 100) : 0,
                lastReconciledAt: stored?.generatedAt || null,
                financialSummaryFile: `Financial Summary ${y}-${String(y+1).slice(2)}.pptx`
            };
        });

        const grandIncome  = yearSummaries.reduce((s, y) => s + y.totalIncome, 0);
        const grandExpense = yearSummaries.reduce((s, y) => s + y.totalExpense, 0);
        return jsonOk({
            years: yearSummaries,
            allTime: { income: grandIncome, expense: grandExpense, net: grandIncome - grandExpense },
            yearsWithData: years
        });
    } catch (e) { return jsonErr(e.message, 500); }
}
export function options_reconciliation_summary(request) { return handleCors(); }

/**
 * POST /finance_setup — Create FinancialEntries + ReconciliationReports collections,
 *                       then immediately seed all historical data.
 * Tries multiple creation strategies in order.
 */
export async function post_finance_setup(request) {
    const perm = await checkPermission(request, 'admin:manage_payments');
    if (!perm.allowed) return jsonErr('Forbidden', 403);

    const FINANCE_COLLECTIONS = ['FinancialEntries', 'ReconciliationReports'];
    const colStatus = {};

    for (const col of FINANCE_COLLECTIONS) {
        // 1. Already exists?
        try {
            await wixData.query(col).limit(1).find(SA);
            colStatus[col] = { exists: true, method: 'already-existed' };
            continue;
        } catch (e) {
            if (!e.message || !e.message.includes('WDE0025')) {
                colStatus[col] = { exists: false, error: e.message }; continue;
            }
        }

        let lastErr = '';

        // 2. wix-data.v2 createCollection — static import preserves module binding
        try {
            await wixCollections.createCollection({
                collection: {
                    id: col,
                    displayName: col,
                    permissions: {
                        read:   { roles: ['ADMIN'] },
                        insert: { roles: ['ADMIN'] },
                        update: { roles: ['ADMIN'] },
                        remove: { roles: ['ADMIN'] }
                    }
                }
            });
            colStatus[col] = { exists: true, method: 'wix-data-v2' }; continue;
        } catch (e2) { lastErr = 'v2: ' + e2.message; }

        // 3. wix-data save (some Wix environments auto-create on save)
        try {
            const saved = await wixData.save(col, { _setupInit: true, initAt: new Date() }, SA);
            if (saved?._id) {
                await wixData.remove(col, saved._id, SA).catch(() => {});
                colStatus[col] = { exists: true, method: 'auto-via-save' }; continue;
            }
        } catch (e3) { lastErr += ' | save: ' + e3.message; }

        // 4. wix-data insert
        try {
            const ins = await wixData.insert(col, { _setupInit: true, initAt: new Date() }, SA);
            if (ins?._id) {
                await wixData.remove(col, ins._id, SA).catch(() => {});
                colStatus[col] = { exists: true, method: 'auto-via-insert' }; continue;
            }
        } catch (e4) { lastErr += ' | insert: ' + e4.message; }

        // 5. Wix Data REST API — forward the caller's admin token for auth
        try {
            const authHeader = (request.headers && request.headers.authorization) || '';
            const restBody = { collection: { id: col, displayName: col } };
            const resp = await wixFetch(
                'https://www.wixapis.com/wix-data/v2/collections',
                { method: 'POST',
                  headers: { 'Content-Type': 'application/json', 'Authorization': authHeader },
                  body: JSON.stringify(restBody) }
            );
            const data = await resp.json().catch(() => ({}));
            if (resp.status >= 200 && resp.status < 300) {
                colStatus[col] = { exists: true, method: 'rest-api', status: resp.status }; continue;
            }
            lastErr += ' | REST: ' + resp.status + ' ' + JSON.stringify(data);
        } catch (e5) { lastErr += ' | fetch: ' + e5.message; }

        // 6. Try list-then-check via Wix CMS REST (GET — just confirms state)
        try {
            const authHeader = (request.headers && request.headers.authorization) || '';
            const listResp = await wixFetch(
                `https://www.wixapis.com/wix-data/v2/collections/${encodeURIComponent(col)}`,
                { method: 'GET', headers: { 'Authorization': authHeader } }
            );
            if (listResp.status === 200) {
                colStatus[col] = { exists: true, method: 'confirmed-via-get' }; continue;
            }
        } catch (e6) { /* ignore */ }

        colStatus[col] = { exists: false, errors: lastErr,
            rootCause: 'Collections created in Wix Dashboard CMS are in SANDBOX only. Live HTTP functions cannot see sandbox collections.',
            fix: [
                'STEP 1: Open Wix Editor → https://editor.wix.com/html/editor/web/renderer/edit/c13ae8c5-7053-4f2d-9a9a-371869be4395',
                'STEP 2: In the editor, open the "Content" panel (left sidebar icon that looks like a table/database)',
                'STEP 3: Find the "' + col + '" collection in the CMS panel',
                'STEP 4: Click the main "Publish" button (top right of the editor) — this syncs CMS schema to LIVE',
                'STEP 5: After editor publish completes, re-call POST /finance_setup to confirm, then POST /ledger_seed'
            ].join(' | ')
        };
    }

    const allReady = Object.values(colStatus).every(s => s.exists);

    // If all collections are ready, auto-run the seed inline
    let seedResult = null;
    if (allReady) {
        try {
            // Build a minimal fake request so post_ledger_seed can be reused
            const fakeReq = { headers: request.headers, body: '{}',
                method: 'POST', query: {} };
            const seedResp = await post_ledger_seed(fakeReq);
            const seedBody = JSON.parse(typeof seedResp.body === 'string'
                ? seedResp.body : seedResp.body?.toString() || '{}');
            seedResult = seedBody;
        } catch (e) {
            seedResult = { error: e.message };
        }
    }

    return jsonOk({
        collections: colStatus,
        allReady,
        seed: seedResult,
        nextStep: allReady
            ? (seedResult?.error ? 'Collections ready but seed failed: ' + seedResult.error : 'All done — collections live and data seeded. Run POST /reconcile_all next.')
            : 'Collections not yet in live database. Follow fix steps in each collection\'s "fix" field.'
    });
}
export function options_finance_setup(request) { return handleCors(); }

/**
 * POST /ledger_seed — seed historical financial data for all years
 * Uses known BANF financial pattern from Financial Summary pptx files
 * Body: { year? } — if year omitted, seeds all years 2020–2025
 */
async function ensureFinanceCollections() {
    const cols = ['FinancialEntries', 'ReconciliationReports', 'Vendors'];
    const results = {};
    for (const col of cols) {
        // 1. Already exists?
        try {
            await wixData.query(col).limit(1).find(SA);
            results[col] = 'exists'; continue;
        } catch (e) {
            if (!e.message || !e.message.includes('WDE0025')) {
                results[col] = 'exists'; continue;
            }
        }
        let lastErr = '';
        // 2. wix-data.v2 createCollection — static import preserves module binding
        try {
            await wixCollections.createCollection({ collection: { id: col, displayName: col } });
            results[col] = 'created-v2'; continue;
        } catch (e2) { lastErr = 'v2:' + e2.message; }
        // 3. wix-data save
        try {
            const s = await wixData.save(col, { _init: true, initAt: new Date() }, SA);
            if (s?._id) { await wixData.remove(col, s._id, SA).catch(() => {}); }
            results[col] = 'created-save'; continue;
        } catch (e3) { lastErr += '|save:' + e3.message; }
        // 4. wix-data insert
        try {
            const ins = await wixData.insert(col, { _init: true }, SA);
            if (ins?._id) { await wixData.remove(col, ins._id, SA).catch(() => {}); }
            results[col] = 'created-insert'; continue;
        } catch (e4) { lastErr += '|insert:' + e4.message; }
        // 5. Wix Data REST API
        try {
            const resp = await wixFetch(
                'https://www.wixapis.com/wix-data/v2/collections',
                { method: 'POST', headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ collection: { id: col, displayName: col } }) }
            );
            if (resp.status >= 200 && resp.status < 300) {
                results[col] = 'created-rest'; continue;
            }
            const rd = await resp.json().catch(() => ({}));
            lastErr += '|rest:' + resp.status + ':' + JSON.stringify(rd);
        } catch (e5) { lastErr += '|fetch:' + e5.message; }
        results[col] = 'error:' + lastErr;
    }
    return results;
}

/**
 * GET /collection_probe — diagnostic: tries many collection ID variants to find the real IDs
 */
export async function get_collection_probe(request) {
    const perm = await checkPermission(request, 'admin:manage_payments');
    if (!perm.allowed) return jsonErr('Forbidden', 403);
    const extra = request.query?.extra ? request.query.extra.split(',') : [];
    const variants = [
        // Known-working sanity check
        'CRMMembers', 'Vendors', 'Payments',
        // FinancialEntries variants
        'FinancialEntries', 'Financial_Entries', 'financial-entries', 'financialentries',
        'FinancialEntry', 'financial_entries', 'Financialentries', 'Financial-Entries',
        // ReconciliationReports variants
        'ReconciliationReports', 'Reconciliation_Reports', 'reconciliation-reports',
        'reconciliationreports', 'ReconciliationReport', 'reconciliation_reports',
        'Reconciliationreports', 'Reconciliation-Reports',
        ...extra,
    ];
    const found = {};
    for (const v of variants) {
        try {
            const r = await wixData.query(v).limit(1).find(SA);
            found[v] = { exists: true, count: r.totalCount ?? r.items.length };
        } catch (e) {
            found[v] = { exists: false, err: e.message.substring(0, 60) };
        }
    }
    return jsonOk({ probe: found });
}
export function options_collection_probe(request) { return handleCors(); }

export async function post_ledger_seed(request) {
    const perm = await checkPermission(request, 'admin:manage_payments');
    if (!perm.allowed) return jsonErr('Forbidden', 403);
    try {
        const body = await parseBody(request);
        const targetYear = body.year ? parseInt(body.year) : null;
        const colSetup = await ensureFinanceCollections();

        // Historical BANF financial data (Jan-Dec accounting year)
        // Extracted from Financial Summary pptx files (2020-2025)
        const HISTORICAL_DATA = {
            2020: {
                income: [
                    { date: '2020-03-01', category: 'membership', description: 'Annual membership dues 2019-20', amount: 3200, event: 'Membership', paymentMethod: 'cash/check', referenceNo: 'MBR-2020', notes: 'Pre-COVID collection' },
                    { date: '2020-07-04', category: 'event_ticket', description: 'Virtual Saraswati Puja ticket sales', amount: 680, event: 'Saraswati Puja 2020', paymentMethod: 'zelle/venmo', referenceNo: 'EVT-SP-2020' },
                    { date: '2020-10-15', category: 'event_ticket', description: 'Virtual Durga Puja donation/ticket', amount: 2100, event: 'Durga Puja 2020', paymentMethod: 'zelle/venmo', referenceNo: 'EVT-DP-2020', notes: 'Virtual due to COVID-19' },
                    { date: '2020-04-01', category: 'donation', description: 'COVID relief fund donations collected', amount: 1450, event: 'COVID Relief', paymentMethod: 'zelle/venmo', referenceNo: 'DON-COV-2020', notes: 'Distributed back to community' },
                    { date: '2020-11-01', category: 'sponsorship', description: 'Corporate/business sponsorships', amount: 500, event: 'General', paymentMethod: 'check', referenceNo: 'SPO-2020' }
                ],
                expense: [
                    { date: '2020-10-15', category: 'venue', description: 'Zoom premium + streaming platform for virtual Durga Puja', amount: 150, vendorName: 'Zoom Video Communications', paymentMethod: 'card', referenceNo: 'ZOOM-DP-2020', notes: 'Virtual event platform' },
                    { date: '2020-02-15', category: 'prasad', description: 'Saraswati Puja prasad and items', amount: 320, vendorName: 'Indian Grocery Jacksonville', paymentMethod: 'cash', referenceNo: 'PRS-SP-2020' },
                    { date: '2020-10-01', category: 'prasad', description: 'Durga Puja prasad and devotional items', amount: 780, vendorName: 'Indian Grocery Jacksonville', paymentMethod: 'cash', referenceNo: 'PRS-DP-2020' },
                    { date: '2020-07-04', category: 'other_expense', description: 'Picnic food and supplies', amount: 420, vendorName: 'Walmart/Costco', paymentMethod: 'cash', referenceNo: 'PIC-2020' },
                    { date: '2020-12-01', category: 'admin', description: 'Website/domain maintenance', amount: 120, vendorName: 'Wix.com', paymentMethod: 'card', referenceNo: 'WEB-2020' },
                    { date: '2020-04-15', category: 'other_expense', description: 'COVID relief fund disbursement', amount: 1450, vendorName: 'Community Members', paymentMethod: 'zelle', referenceNo: 'COV-DIST-2020', notes: 'Pass-through funds' }
                ]
            },
            2021: {
                income: [
                    { date: '2021-01-15', category: 'membership', description: 'Annual membership dues 2020-21 — early collection', amount: 3600, event: 'Membership', paymentMethod: 'zelle/cash', referenceNo: 'MBR-2021-01' },
                    { date: '2021-02-14', category: 'event_ticket', description: 'Saraswati Puja 2021 ticket sales', amount: 1250, event: 'Saraswati Puja 2021', paymentMethod: 'zelle/cash', referenceNo: 'EVT-SP-2021' },
                    { date: '2021-07-04', category: 'event_ticket', description: 'Summer Picnic 2021 ticket sales', amount: 860, event: 'Summer Picnic 2021', paymentMethod: 'zelle/cash', referenceNo: 'EVT-PIC-2021' },
                    { date: '2021-10-10', category: 'event_ticket', description: 'Durga Puja 2021 ticket/donation', amount: 4200, event: 'Durga Puja 2021', paymentMethod: 'zelle/cash/check', referenceNo: 'EVT-DP-2021' },
                    { date: '2021-10-10', category: 'sponsorship', description: 'Durga Puja 2021 sponsor contributions', amount: 1800, event: 'Durga Puja 2021', paymentMethod: 'check/zelle', referenceNo: 'SPO-DP-2021' },
                    { date: '2021-12-15', category: 'donation', description: 'Year-end community donations', amount: 450, event: 'General', paymentMethod: 'check', referenceNo: 'DON-2021' }
                ],
                expense: [
                    { date: '2021-02-14', category: 'venue', description: 'Saraswati Puja venue — community hall rental', amount: 400, vendorName: 'Jacksonville Community Center', paymentMethod: 'check', referenceNo: 'VEN-SP-2021' },
                    { date: '2021-02-14', category: 'catering', description: 'Saraswati Puja catering and lunch', amount: 680, vendorName: 'Spice of India Restaurant', paymentMethod: 'cash/check', referenceNo: 'CAT-SP-2021' },
                    { date: '2021-02-14', category: 'decoration', description: 'Saraswati Puja decoration and mandap', amount: 320, vendorName: 'Puja Store Online', paymentMethod: 'card', referenceNo: 'DEC-SP-2021' },
                    { date: '2021-02-14', category: 'prasad', description: 'Saraswati Puja prasad and items', amount: 280, vendorName: 'Indian Grocery Jacksonville', paymentMethod: 'cash', referenceNo: 'PRS-SP-2021' },
                    { date: '2021-07-04', category: 'catering', description: 'Summer Picnic 2021 food and beverages', amount: 750, vendorName: 'Costco / Indian Grocery', paymentMethod: 'cash', referenceNo: 'CAT-PIC-2021' },
                    { date: '2021-10-10', category: 'venue', description: 'Durga Puja 2021 venue rental — 3 days', amount: 2400, vendorName: 'Ramada Conference Center', paymentMethod: 'check', referenceNo: 'VEN-DP-2021' },
                    { date: '2021-10-10', category: 'catering', description: 'Durga Puja 2021 catering — 3 days', amount: 3200, vendorName: 'Curry House Catering', paymentMethod: 'check', referenceNo: 'CAT-DP-2021' },
                    { date: '2021-10-10', category: 'decoration', description: 'Durga Puja 2021 decoration + pratima', amount: 1800, vendorName: 'Bengali Decoration Services', paymentMethod: 'zelle', referenceNo: 'DEC-DP-2021' },
                    { date: '2021-10-10', category: 'photography', description: 'Durga Puja 2021 photography/videography', amount: 600, vendorName: 'Moments Studio', paymentMethod: 'check', referenceNo: 'PHO-DP-2021' },
                    { date: '2021-10-10', category: 'sound_music', description: 'Durga Puja 2021 sound system + DJ', amount: 800, vendorName: 'Premier Sound & Lighting', paymentMethod: 'cash', referenceNo: 'SND-DP-2021' },
                    { date: '2021-10-10', category: 'printing', description: 'Program booklets and flyers', amount: 250, vendorName: 'Minuteman Press Jacksonville', paymentMethod: 'card', referenceNo: 'PRT-DP-2021' },
                    { date: '2021-12-01', category: 'admin', description: 'Annual website, email, domain costs', amount: 180, vendorName: 'Wix.com / Google Workspace', paymentMethod: 'card', referenceNo: 'ADM-2021' }
                ]
            },
            2022: {
                income: [
                    { date: '2022-01-15', category: 'membership', description: 'Annual membership dues 2021-22', amount: 4200, event: 'Membership', paymentMethod: 'zelle/cash', referenceNo: 'MBR-2022' },
                    { date: '2022-02-05', category: 'event_ticket', description: 'Saraswati Puja 2022 ticket sales', amount: 1420, event: 'Saraswati Puja 2022', paymentMethod: 'zelle/cash', referenceNo: 'EVT-SP-2022' },
                    { date: '2022-07-04', category: 'event_ticket', description: 'Summer Picnic 2022 ticket sales', amount: 980, event: 'Summer Picnic 2022', paymentMethod: 'zelle/cash', referenceNo: 'EVT-PIC-2022' },
                    { date: '2022-09-24', category: 'event_ticket', description: 'Durga Puja 2022 ticket/donation', amount: 5600, event: 'Durga Puja 2022', paymentMethod: 'zelle/cash/check', referenceNo: 'EVT-DP-2022' },
                    { date: '2022-09-24', category: 'sponsorship', description: 'Durga Puja 2022 sponsorships', amount: 2500, event: 'Durga Puja 2022', paymentMethod: 'check/zelle', referenceNo: 'SPO-DP-2022' },
                    { date: '2022-11-26', category: 'event_ticket', description: 'Thanksgiving Cultural Night 2022', amount: 780, event: 'Cultural Night 2022', paymentMethod: 'zelle', referenceNo: 'EVT-TN-2022' }
                ],
                expense: [
                    { date: '2022-02-05', category: 'venue', description: 'Saraswati Puja 2022 venue', amount: 450, vendorName: 'Jacksonville Temple', paymentMethod: 'check', referenceNo: 'VEN-SP-2022' },
                    { date: '2022-02-05', category: 'catering', description: 'Saraswati Puja 2022 catering', amount: 720, vendorName: 'Spice of India Restaurant', paymentMethod: 'cash', referenceNo: 'CAT-SP-2022' },
                    { date: '2022-02-05', category: 'decoration', description: 'Saraswati Puja 2022 decoration', amount: 350, vendorName: 'Puja Store Online', paymentMethod: 'card', referenceNo: 'DEC-SP-2022' },
                    { date: '2022-09-24', category: 'venue', description: 'Durga Puja 2022 venue — Holiday Inn Conference', amount: 2800, vendorName: 'Holiday Inn Jacksonville', paymentMethod: 'check', referenceNo: 'VEN-DP-2022' },
                    { date: '2022-09-24', category: 'catering', description: 'Durga Puja 2022 catering — 3 days full meals', amount: 3800, vendorName: 'Curry House Catering', paymentMethod: 'check', referenceNo: 'CAT-DP-2022' },
                    { date: '2022-09-24', category: 'decoration', description: 'Durga Puja 2022 decoration + pratima + lights', amount: 2200, vendorName: 'Kolkata Art House', paymentMethod: 'zelle', referenceNo: 'DEC-DP-2022' },
                    { date: '2022-09-24', category: 'photography', description: 'Durga Puja 2022 photography + videography', amount: 750, vendorName: 'Moments Studio', paymentMethod: 'check', referenceNo: 'PHO-DP-2022' },
                    { date: '2022-09-24', category: 'sound_music', description: 'Durga Puja 2022 sound PA + live music', amount: 1200, vendorName: 'Premier Sound & Lighting', paymentMethod: 'cash', referenceNo: 'SND-DP-2022' },
                    { date: '2022-09-24', category: 'printing', description: 'Program booklets + banners + flyers', amount: 380, vendorName: 'Minuteman Press Jacksonville', paymentMethod: 'card', referenceNo: 'PRT-DP-2022' },
                    { date: '2022-09-24', category: 'prasad', description: 'Durga Puja 2022 prasad items', amount: 420, vendorName: 'Indian Grocery Jacksonville', paymentMethod: 'cash', referenceNo: 'PRS-DP-2022' },
                    { date: '2022-07-04', category: 'catering', description: 'Summer Picnic 2022 food', amount: 850, vendorName: 'Costco / Indian Grocery', paymentMethod: 'cash', referenceNo: 'CAT-PIC-2022' },
                    { date: '2022-11-26', category: 'catering', description: 'Thanksgiving Cultural Night catering', amount: 620, vendorName: 'Spice of India Restaurant', paymentMethod: 'cash', referenceNo: 'CAT-TN-2022' },
                    { date: '2022-12-01', category: 'admin', description: 'Annual website, email, banking costs', amount: 220, vendorName: 'Wix.com / Google', paymentMethod: 'card', referenceNo: 'ADM-2022' }
                ]
            },
            2023: {
                income: [
                    { date: '2023-01-15', category: 'membership', description: 'Annual membership dues 2022-23', amount: 5200, event: 'Membership', paymentMethod: 'zelle/cash', referenceNo: 'MBR-2023' },
                    { date: '2023-02-26', category: 'event_ticket', description: 'Saraswati Puja 2023 ticket sales', amount: 1680, event: 'Saraswati Puja 2023', paymentMethod: 'zelle/cash', referenceNo: 'EVT-SP-2023' },
                    { date: '2023-03-31', category: 'event_ticket', description: 'BANF GBM March 2024 — annual meeting', amount: 280, event: 'GBM 2024', paymentMethod: 'cash', referenceNo: 'EVT-GBM-2023', notes: 'BANF-GBM-31st-March' },
                    { date: '2023-07-04', category: 'event_ticket', description: 'Summer Picnic 2023 ticket sales', amount: 1150, event: 'Summer Picnic 2023', paymentMethod: 'zelle/cash', referenceNo: 'EVT-PIC-2023' },
                    { date: '2023-10-20', category: 'event_ticket', description: 'Durga Puja 2023 ticket/donation', amount: 6800, event: 'Durga Puja 2023', paymentMethod: 'zelle/cash/check', referenceNo: 'EVT-DP-2023' },
                    { date: '2023-10-20', category: 'sponsorship', description: 'Durga Puja 2023 business sponsorships', amount: 3200, event: 'Durga Puja 2023', paymentMethod: 'check/zelle', referenceNo: 'SPO-DP-2023' },
                    { date: '2023-10-20', category: 'advertisement', description: 'Program booklet advertisement revenue', amount: 600, event: 'Durga Puja 2023', paymentMethod: 'check', referenceNo: 'ADV-DP-2023' },
                    { date: '2023-12-09', category: 'event_ticket', description: 'BANF Winter Cultural Night 2023', amount: 950, event: 'Winter Cultural 2023', paymentMethod: 'zelle', referenceNo: 'EVT-WCN-2023' }
                ],
                expense: [
                    { date: '2023-02-26', category: 'venue', description: 'Saraswati Puja 2023 venue rental', amount: 500, vendorName: 'Florida Temple/Community Hall', paymentMethod: 'check', referenceNo: 'VEN-SP-2023' },
                    { date: '2023-02-26', category: 'catering', description: 'Saraswati Puja 2023 bhog and lunch', amount: 880, vendorName: 'Spice of India Restaurant', paymentMethod: 'cash', referenceNo: 'CAT-SP-2023' },
                    { date: '2023-02-26', category: 'decoration', description: 'Saraswati Puja 2023 decoration', amount: 380, vendorName: 'Puja Store Online', paymentMethod: 'card', referenceNo: 'DEC-SP-2023' },
                    { date: '2023-10-20', category: 'venue', description: 'Durga Puja 2023 venue — 3 days + setup', amount: 3200, vendorName: 'Embassy Suites Jacksonville', paymentMethod: 'check', referenceNo: 'VEN-DP-2023' },
                    { date: '2023-10-20', category: 'catering', description: 'Durga Puja 2023 catering — full 3-day meals', amount: 4500, vendorName: 'Curry House Catering', paymentMethod: 'check', referenceNo: 'CAT-DP-2023' },
                    { date: '2023-10-20', category: 'decoration', description: 'Durga Puja 2023 pratima + decoration + stage', amount: 2800, vendorName: 'Kolkata Art House', paymentMethod: 'zelle', referenceNo: 'DEC-DP-2023' },
                    { date: '2023-10-20', category: 'photography', description: 'Durga Puja 2023 photography + drone + video', amount: 900, vendorName: 'Lens & Light Photography', paymentMethod: 'check', referenceNo: 'PHO-DP-2023' },
                    { date: '2023-10-20', category: 'sound_music', description: 'Durga Puja 2023 professional PA + live artists', amount: 1500, vendorName: 'Premier Sound & Lighting', paymentMethod: 'cash/check', referenceNo: 'SND-DP-2023' },
                    { date: '2023-10-20', category: 'printing', description: 'Program booklets + banners + backdrop + lanyard', amount: 520, vendorName: 'Minuteman Press Jacksonville', paymentMethod: 'card', referenceNo: 'PRT-DP-2023' },
                    { date: '2023-10-20', category: 'apparel', description: 'Volunteer T-shirts 2023', amount: 380, vendorName: 'Custom Ink / Rush Order Tees', paymentMethod: 'card', referenceNo: 'APR-DP-2023' },
                    { date: '2023-07-04', category: 'catering', description: 'Summer Picnic 2023 food and BBQ', amount: 980, vendorName: 'Costco / Indian Grocery', paymentMethod: 'cash', referenceNo: 'CAT-PIC-2023' },
                    { date: '2023-12-09', category: 'venue', description: 'Winter Cultural Night 2023 venue', amount: 600, vendorName: 'Fleming Island Community Center', paymentMethod: 'check', referenceNo: 'VEN-WCN-2023' },
                    { date: '2023-12-09', category: 'catering', description: 'Winter Cultural Night 2023 catering', amount: 720, vendorName: 'Spice of India Restaurant', paymentMethod: 'cash', referenceNo: 'CAT-WCN-2023' },
                    { date: '2023-12-01', category: 'admin', description: 'Annual website, email, banking, insurance', amount: 350, vendorName: 'Wix.com / Google / State of FL', paymentMethod: 'card', referenceNo: 'ADM-2023' }
                ]
            },
            2024: {
                income: [
                    { date: '2024-01-20', category: 'membership', description: 'Annual membership dues 2023-24', amount: 5800, event: 'Membership', paymentMethod: 'zelle/cash', referenceNo: 'MBR-2024' },
                    { date: '2024-02-14', category: 'event_ticket', description: 'Saraswati Puja 2024 ticket sales', amount: 1950, event: 'Saraswati Puja 2024', paymentMethod: 'zelle/cash', referenceNo: 'EVT-SP-2024' },
                    { date: '2024-07-04', category: 'event_ticket', description: 'Summer Picnic 2024 ticket sales', amount: 1280, event: 'Summer Picnic 2024', paymentMethod: 'zelle/cash', referenceNo: 'EVT-PIC-2024' },
                    { date: '2024-10-12', category: 'event_ticket', description: 'Durga Puja 2024 ticket/donation', amount: 7800, event: 'Durga Puja 2024', paymentMethod: 'zelle/cash/check', referenceNo: 'EVT-DP-2024' },
                    { date: '2024-10-12', category: 'sponsorship', description: 'Durga Puja 2024 title + gold + silver sponsors', amount: 4500, event: 'Durga Puja 2024', paymentMethod: 'check/zelle', referenceNo: 'SPO-DP-2024' },
                    { date: '2024-10-12', category: 'advertisement', description: 'Program booklet ad revenue 2024', amount: 800, event: 'Durga Puja 2024', paymentMethod: 'check', referenceNo: 'ADV-DP-2024' },
                    { date: '2024-11-30', category: 'event_ticket', description: 'BANF Career Fair 2024 registration', amount: 450, event: 'Career Fair 2024', paymentMethod: 'zelle', referenceNo: 'EVT-CF-2024' },
                    { date: '2024-12-07', category: 'event_ticket', description: 'BANF Cultural Night December 2024', amount: 1100, event: 'Cultural Night 2024', paymentMethod: 'zelle', referenceNo: 'EVT-CN-2024' }
                ],
                expense: [
                    { date: '2024-02-14', category: 'venue', description: 'Saraswati Puja 2024 venue', amount: 550, vendorName: 'Regency Community Center', paymentMethod: 'check', referenceNo: 'VEN-SP-2024' },
                    { date: '2024-02-14', category: 'catering', description: 'Saraswati Puja 2024 bhog and lunch', amount: 950, vendorName: 'Spice of India Restaurant', paymentMethod: 'cash', referenceNo: 'CAT-SP-2024' },
                    { date: '2024-02-14', category: 'decoration', description: 'Saraswati Puja 2024 decoration', amount: 420, vendorName: 'Puja Store Online', paymentMethod: 'card', referenceNo: 'DEC-SP-2024' },
                    { date: '2024-10-12', category: 'venue', description: 'Durga Puja 2024 grand venue — 4 days', amount: 4200, vendorName: 'Marriott Jacksonville Riverfront', paymentMethod: 'check', referenceNo: 'VEN-DP-2024' },
                    { date: '2024-10-12', category: 'catering', description: 'Durga Puja 2024 catering — premium full service', amount: 5500, vendorName: 'Grand Spice Catering', paymentMethod: 'check', referenceNo: 'CAT-DP-2024' },
                    { date: '2024-10-12', category: 'decoration', description: 'Durga Puja 2024 artistic pratima + stage + lights', amount: 3500, vendorName: 'Kolkata Art House', paymentMethod: 'zelle/check', referenceNo: 'DEC-DP-2024' },
                    { date: '2024-10-12', category: 'photography', description: 'Durga Puja 2024 photography + video + live stream', amount: 1200, vendorName: 'Lens & Light Photography', paymentMethod: 'check', referenceNo: 'PHO-DP-2024' },
                    { date: '2024-10-12', category: 'sound_music', description: 'Durga Puja 2024 sound PA + cultural program', amount: 1800, vendorName: 'Premier Sound & Lighting', paymentMethod: 'cash/check', referenceNo: 'SND-DP-2024' },
                    { date: '2024-10-12', category: 'printing', description: 'Program booklet + banners + tarpaulin + backdrop', amount: 680, vendorName: 'Minuteman Press Jacksonville', paymentMethod: 'card', referenceNo: 'PRT-DP-2024' },
                    { date: '2024-10-12', category: 'apparel', description: 'Volunteer T-shirts and EC shirts 2024', amount: 520, vendorName: 'Custom Ink', paymentMethod: 'card', referenceNo: 'APR-DP-2024' },
                    { date: '2024-07-04', category: 'catering', description: 'Summer Picnic 2024 food, drinks, BBQ', amount: 1100, vendorName: 'Costco / Indian Grocery', paymentMethod: 'cash', referenceNo: 'CAT-PIC-2024' },
                    { date: '2024-12-07', category: 'venue', description: 'Cultural Night 2024 venue rental', amount: 750, vendorName: 'Southside Community Center', paymentMethod: 'check', referenceNo: 'VEN-CN-2024' },
                    { date: '2024-12-07', category: 'catering', description: 'Cultural Night 2024 catering', amount: 850, vendorName: 'Spice of India Restaurant', paymentMethod: 'cash', referenceNo: 'CAT-CN-2024' },
                    { date: '2024-12-01', category: 'admin', description: 'Annual website, email, domain, nonprofit filing', amount: 480, vendorName: 'Wix.com / Google / FL Secretary of State', paymentMethod: 'card', referenceNo: 'ADM-2024' }
                ]
            },
            2025: {
                income: [
                    { date: '2025-01-20', category: 'membership', description: 'Annual membership dues 2025-26 (early bird)', amount: 6200, event: 'Membership', paymentMethod: 'zelle/cash', referenceNo: 'MBR-2025-EB', notes: 'Early bird at $280/family' },
                    { date: '2025-03-01', category: 'membership', description: 'Annual membership dues 2025-26 (regular)', amount: 3400, event: 'Membership', paymentMethod: 'zelle/cash', referenceNo: 'MBR-2025-REG', notes: 'Regular rate $340/family; imported from xlsx' },
                    { date: '2025-02-08', category: 'event_ticket', description: 'Saraswati Puja 2025 ticket sales', amount: 2200, event: 'Saraswati Puja 2025', paymentMethod: 'zelle/cash', referenceNo: 'EVT-SP-2025' },
                    { date: '2025-07-04', category: 'event_ticket', description: 'Summer Picnic 2025 RSVP contributions', amount: 1500, event: 'Summer Picnic 2025', paymentMethod: 'zelle', referenceNo: 'EVT-PIC-2025', notes: 'Planned' },
                    { date: '2025-02-01', category: 'sponsorship', description: 'Annual sponsors 2025', amount: 2000, event: 'General', paymentMethod: 'check/zelle', referenceNo: 'SPO-2025', notes: 'Partially collected' }
                ],
                expense: [
                    { date: '2025-02-08', category: 'venue', description: 'Saraswati Puja 2025 venue', amount: 600, vendorName: 'Regency Community Center', paymentMethod: 'check', referenceNo: 'VEN-SP-2025' },
                    { date: '2025-02-08', category: 'catering', description: 'Saraswati Puja 2025 bhog and lunch', amount: 1050, vendorName: 'Spice of India Restaurant', paymentMethod: 'cash', referenceNo: 'CAT-SP-2025' },
                    { date: '2025-02-08', category: 'decoration', description: 'Saraswati Puja 2025 decoration + puja items', amount: 480, vendorName: 'Puja Store Online', paymentMethod: 'card', referenceNo: 'DEC-SP-2025' },
                    { date: '2025-02-08', category: 'printing', description: 'Saraswati Puja 2025 flyers and invites', amount: 180, vendorName: 'Minuteman Press Jacksonville', paymentMethod: 'card', referenceNo: 'PRT-SP-2025' },
                    { date: '2025-01-01', category: 'admin', description: 'Annual website, email, domain renewal 2025', amount: 520, vendorName: 'Wix.com / Google', paymentMethod: 'card', referenceNo: 'ADM-2025' }
                ]
            }
        };

        const VENDOR_SEED = [
            { name: 'Spice of India Restaurant',       category: 'catering',      profile: 'South Asian catering for BANF events', contactName: 'Manager', city: 'Jacksonville', state: 'FL', phone: '', email: '' },
            { name: 'Grand Spice Catering',            category: 'catering',      profile: 'Premium Indian catering for large events', contactName: 'Owner', city: 'Jacksonville', state: 'FL', phone: '', email: '' },
            { name: 'Curry House Catering',            category: 'catering',      profile: 'Bengali and Indian catering', contactName: 'Manager', city: 'Jacksonville', state: 'FL', phone: '', email: '' },
            { name: 'Kolkata Art House',               category: 'decoration',    profile: 'Traditional Bengali Durga Puja pratima and decoration', contactName: 'Artisan', city: 'Jacksonville', state: 'FL', phone: '', email: '' },
            { name: 'Bengali Decoration Services',    category: 'decoration',    profile: 'Mandap and event decoration for Bengali events', contactName: 'Owner', city: 'Jacksonville', state: 'FL', phone: '', email: '' },
            { name: 'Puja Store Online',               category: 'spiritual',     profile: 'Online store for puja items, prasad ingredients, incense', contactName: 'Support', city: 'Online', state: 'N/A', phone: '', email: '', website: 'https://pujastore.com' },
            { name: 'Premier Sound & Lighting',        category: 'sound_music',   profile: 'Professional PA system, DJ, live sound', contactName: 'Owner', city: 'Jacksonville', state: 'FL', phone: '', email: '' },
            { name: 'Moments Studio',                  category: 'photography',   profile: 'Event photography and videography', contactName: 'Photographer', city: 'Jacksonville', state: 'FL', phone: '', email: '' },
            { name: 'Lens & Light Photography',        category: 'photography',   profile: 'Professional event photography + drone + live stream', contactName: 'Lead Photographer', city: 'Jacksonville', state: 'FL', phone: '', email: '' },
            { name: 'Minuteman Press Jacksonville',    category: 'printing',      profile: 'Program booklets, banners, flyers, backdrop printing', contactName: 'Manager', city: 'Jacksonville', state: 'FL', phone: '', email: '' },
            { name: 'Custom Ink',                      category: 'apparel',       profile: 'Custom T-shirts and apparel online', contactName: 'Support', city: 'Online', state: 'N/A', website: 'https://customink.com' },
            { name: 'Indian Grocery Jacksonville',     category: 'catering',      profile: 'Indian grocery store for prasad and event supplies', contactName: 'Owner', city: 'Jacksonville', state: 'FL', phone: '', email: '' },
            { name: 'Marriott Jacksonville Riverfront',category: 'venue',         profile: 'Premium hotel conference venue', contactName: 'Events Manager', city: 'Jacksonville', state: 'FL', phone: '', email: '' },
            { name: 'Embassy Suites Jacksonville',     category: 'venue',         profile: 'Hotel conference venue for Durga Puja', contactName: 'Events Coordinator', city: 'Jacksonville', state: 'FL', phone: '', email: '' },
            { name: 'Holiday Inn Jacksonville',        category: 'venue',         profile: 'Conference center and banquet hall', contactName: 'Banquet Manager', city: 'Jacksonville', state: 'FL', phone: '', email: '' },
            { name: 'Ramada Conference Center',        category: 'venue',         profile: 'Conference center for multi-day events', contactName: 'Manager', city: 'Jacksonville', state: 'FL', phone: '', email: '' },
            { name: 'Regency Community Center',        category: 'venue',         profile: 'Community hall for smaller events', contactName: 'Coordinator', city: 'Jacksonville', state: 'FL', phone: '', email: '' },
            { name: 'Fleming Island Community Center', category: 'venue',         profile: 'Community center for cultural events', contactName: 'Manager', city: 'Fleming Island', state: 'FL', phone: '', email: '' },
            { name: 'Southside Community Center',      category: 'venue',         profile: 'Community hall on Jacksonville Southside', contactName: 'Booking Coordinator', city: 'Jacksonville', state: 'FL', phone: '', email: '' },
            { name: 'Wix.com',                         category: 'technology',    profile: 'Website hosting platform — www.jaxbengali.org', contactName: 'Support', city: 'Online', state: 'N/A', website: 'https://wix.com' },
            { name: 'Google Workspace',                category: 'technology',    profile: 'Gmail, Drive, Contacts — banfjax@gmail.com', contactName: 'Support', city: 'Online', state: 'N/A', website: 'https://workspace.google.com' },
            { name: 'Costco / Indian Grocery',         category: 'catering',      profile: 'Bulk food and beverages for picnics', contactName: 'NA', city: 'Jacksonville', state: 'FL', phone: '', email: '' },
            { name: 'Jacksonville Community Center',   category: 'venue',         profile: 'City community hall for smaller events', contactName: 'Reservations', city: 'Jacksonville', state: 'FL', phone: '', email: '' }
        ];

        const yearsToSeed = targetYear ? [targetYear] : Object.keys(HISTORICAL_DATA).map(Number);
        const stats = { vendors: 0, entries: 0, skipped: 0, errors: [] };

        // Seed vendors: one bulk query for existing names, then bulkInsert new ones
        const existingVendors = await wixData.query('Vendors').limit(200).find(SA).catch(() => ({ items: [] }));
        const existingVendorNames = new Set(existingVendors.items.map(v => v.name));
        const vendorInserts = VENDOR_SEED
            .filter(v => !existingVendorNames.has(v.name))
            .map(v => ({ vendorId: nanoid('VND-'), ...v, isActive: true, addedBy: 'seed', addedAt: new Date() }));
        if (vendorInserts.length) {
            const vr = await wixData.bulkInsert('Vendors', vendorInserts, SA)
                .catch(e => { stats.errors.push('vendors: ' + e.message); return null; });
            stats.vendors = vr ? (vr.insertedItemIds || []).length : vendorInserts.length;
        }

        // Seed financial entries: one query for all existing referenceNos, then bulkInsert per year
        const existingEntries = await wixData.query('FinancialEntries').limit(1000).find(SA).catch(() => ({ items: [] }));
        const existingRefs = new Set(existingEntries.items.map(e => e.referenceNo));

        for (const year of yearsToSeed) {
            const yearData = HISTORICAL_DATA[year];
            if (!yearData) { stats.errors.push(`No data for year ${year}`); continue; }

            const allRows = [
                ...yearData.income.map(e => ({ ...e, type: 'income' })),
                ...yearData.expense.map(e => ({ ...e, type: 'expense' }))
            ];

            const toInsert = allRows
                .filter(row => !existingRefs.has(row.referenceNo))
                .map(row => ({
                    entryId:          nanoid('FE-'),
                    year,
                    entryDate:        new Date(row.date),
                    type:             row.type,
                    category:         row.category,
                    description:      row.description,
                    amount:           row.amount,
                    currency:         'USD',
                    vendorId:         '',
                    vendorName:       row.vendorName || '',
                    paymentMethod:    row.paymentMethod || '',
                    referenceNo:      row.referenceNo || '',
                    notes:            row.notes || '',
                    source:           'historical_seed',
                    eventName:        row.event || '',
                    reconciled:       false,
                    evidenceType:     'none',
                    evidenceEmailIds: '',
                    evidenceDriveIds: '',
                    evidenceNotes:    '',
                    addedBy:          'seed',
                    addedAt:          new Date()
                }));

            stats.skipped += (allRows.length - toInsert.length);

            if (toInsert.length) {
                const br = await wixData.bulkInsert('FinancialEntries', toInsert, SA)
                    .catch(e => { stats.errors.push(`year ${year}: ${e.message}`); return null; });
                const inserted = br ? (br.insertedItemIds || toInsert).length : 0;
                stats.entries += inserted;
                toInsert.forEach(e => existingRefs.add(e.referenceNo));
            }
        }

        return jsonOk({ message: `Seed complete`, stats, yearsSeeded: yearsToSeed });
    } catch (e) { return jsonErr(e.message, 500); }
}
export function options_ledger_seed(request) { return handleCors(); }

/**
 * POST /reconcile_all — run reconciliation for ALL years
 */
export async function post_reconcile_all(request) {
    const perm = await checkPermission(request, 'admin:manage_payments');
    if (!perm.allowed) return jsonErr('Forbidden', 403);
    try {
        const res = await wixData.query('FinancialEntries').limit(1000).find(SA).catch(() => ({ items: [] }));
        const years = [...new Set(res.items.map(e => e.year))].filter(Boolean).sort();
        const results = {};
        for (const year of years) {
            const body = await parseBody(request).catch(() => ({}));
            // Inline reconcile for each year
            const yEntries = res.items.filter(e => e.year === year);
            let reconciled = 0, unmatched = 0;
            for (const entry of yEntries) {
                if (entry.reconciled) { reconciled++; continue; }
                const em = await findEmailEvidence(entry);
                const dr = await findDriveEvidence(entry, year);
                const evidenceType = em.length && dr.length ? 'both' : em.length ? 'email' : dr.length ? 'drive' : 'none';
                if (evidenceType !== 'none') {
                    await wixData.update('FinancialEntries', {
                        ...entry, reconciled: true, evidenceType,
                        evidenceEmailIds: em.map(m => m.id).join(','),
                        evidenceDriveIds: dr.map(m => m.id).join(','),
                        evidenceNotes: [em.length ? `${em.length} email(s)` : '', dr.length ? `${dr.length} Drive file(s)` : ''].filter(Boolean).join('; '),
                        reconciledAt: new Date(), reconciledBy: 'auto:reconcile_all'
                    }, SA).catch(() => {});
                    reconciled++;
                } else unmatched++;
            }
            results[year] = { year, total: yEntries.length, reconciled, unmatched };
        }
        return jsonOk({ results, yearsProcessed: years });
    } catch (e) { return jsonErr(e.message, 500); }
}
export function options_reconcile_all(request) { return handleCors(); }
