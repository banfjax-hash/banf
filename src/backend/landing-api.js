/**
 * BANF Landing Page API — v1.1 (Hybrid Mode)
 * ==========================================
 * Public, read-only endpoints that feed the landing page.
 *
 * HYBRID APPROACH:
 *   1. Try querying CRM collections first
 *   2. If collections don't exist yet, fall back to SEED data from
 *      landing-collections.js (identical to the hardcoded values)
 *   3. When collections are eventually created (via Wix CMS Dashboard),
 *      CRM data automatically takes precedence
 *
 * Endpoints:
 *   GET /_functions/landing_data   → all landing-page data in one call
 *   GET /_functions/landing_seed?secret=banf2024seed → populate collections
 *
 * Security:
 *   • landing_data is public & read-only — only returns safe fields
 *   • landing_seed requires shared secret
 *   • No collection names, internal IDs, or owner info exposed
 */

import { ok, badRequest, serverError, forbidden } from 'wix-http-functions';
import wixData from 'wix-data';
import { collections as wixCollections } from 'wix-data.v2';
import { elevate } from 'wix-auth';
import { fetch as wixFetch } from 'wix-fetch';
import { SEED, COLLECTIONS as COLLECTIONS_SCHEMA } from 'backend/landing-collections';

// Elevated version — needed for collection creation (admin-only operation)
const createDataCollectionElevated = elevate(wixCollections.createDataCollection);

const SA = { suppressAuth: true };

// ── Helpers ─────────────────────────────────────
function jsonResponse(data) {
    return ok({
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With'
        },
        body: JSON.stringify(data)
    });
}

function errorResponse(message, code = 500) {
    const resp = {
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With'
        },
        body: JSON.stringify({ success: false, error: message })
    };
    if (code === 400) return badRequest(resp);
    if (code === 403) return forbidden(resp);
    return serverError(resp);
}

function handleCors() {
    return ok({
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
            'Access-Control-Max-Age': '86400'
        },
        body: ''
    });
}

/** Strip internal Wix fields from items before returning */
function sanitize(items) {
    return items.map(item => {
        const clean = { ...item };
        delete clean._owner;
        delete clean._updatedDate;
        delete clean._createdDate;
        delete clean._id;
        return clean;
    });
}

/**
 * Query a CRM collection; if it doesn't exist, return SEED fallback data.
 * This is the KEY hybrid pattern — CRM overrides seed when available.
 */
async function queryOrFallback(collection, sortField = 'order') {
    try {
        let q = wixData.query(collection).limit(200);
        if (sortField) q = q.ascending(sortField);
        const res = await q.find(SA);
        if (res.items.length > 0) {
            return { items: res.items, source: 'crm' };
        }
        // Collection exists but is empty — use seed
        return { items: SEED[collection] || [], source: 'seed-empty' };
    } catch (e) {
        // Collection doesn't exist — use seed data directly
        return { items: SEED[collection] || [], source: 'seed' };
    }
}


// ── Auto-create a CMS collection ─────────────────────────────────────────────
/**
 * Creates a Wix CMS collection using wix-data.v2 createDataCollection with elevation.
 * Correct param format: { id, displayName } flat object (not wrapped)
 * Requires wix-auth elevate() since HTTP function context doesn't have admin rights by default.
 */
async function ensureCollection(cName) {
    const schema = COLLECTIONS_SCHEMA[cName] || {};
    const displayName = schema.displayName || cName;

    try {
        await createDataCollectionElevated({ id: cName, displayName });
        return { created: true, method: 'wix-data.v2.createDataCollection+elevate' };
    } catch (e) {
        return { created: false, method: 'wix-data.v2.createDataCollection+elevate', error: e.message };
    }
}

// ╔══════════════════════════════════════════════╗
// ║  GET /_functions/landing_data                 ║
// ║  Public read-only — all landing-page sections ║
// ╚══════════════════════════════════════════════╝

export async function get_landing_data(request) {
    const debug = (request.query || {}).debug === '1';

    try {
        // Fire all queries in parallel — each falls back to SEED if collection missing
        const [
            statsResult,
            ecResult,
            plansResult,
            tiersResult,
            budgetResult,
            contentResult,
            announcementsResult,
            eventsRaw
        ] = await Promise.all([
            queryOrFallback('SiteStats', 'order'),
            queryOrFallback('ECMembers', 'order'),
            queryOrFallback('MembershipPlans', 'order'),
            queryOrFallback('SponsorshipTiers', 'order'),
            queryOrFallback('BudgetSummary', null),
            queryOrFallback('SiteContent', 'key'),
            queryOrFallback('Announcements', 'order'),
            // Also pull upcoming Events from the existing Events collection
            (async () => {
                try {
                    const r = await wixData.query('Events')
                        .ge('date', new Date())
                        .ascending('date')
                        .limit(6)
                        .find(SA);
                    return r.items;
                } catch (_) { return []; }
            })()
        ]);

        // Build debug sources map
        const sources = debug ? {
            stats: statsResult.source,
            ecMembers: ecResult.source,
            membershipPlans: plansResult.source,
            sponsorshipTiers: tiersResult.source,
            budget: budgetResult.source,
            siteContent: contentResult.source,
            announcements: announcementsResult.source
        } : null;

        // Filter active-only and sanitize
        const stats = sanitize(statsResult.items.filter(s => s.active !== false));
        const ecMembers = sanitize(ecResult.items.filter(m => m.active !== false));
        const membershipPlans = sanitize(plansResult.items.filter(p => p.active !== false)).map(p => {
            // Parse JSON feature arrays for frontend (seed data has pre-stringified JSON)
            if (typeof p.features === 'string') {
                try { p.features = JSON.parse(p.features); } catch (_) {}
            }
            // Parse per-member-type price table
            if (typeof p.priceTable === 'string') {
                try { p.priceTable = JSON.parse(p.priceTable); } catch (_) {}
            }
            return p;
        });
        const sponsorshipTiers = sanitize(tiersResult.items.filter(t => t.active !== false)).map(t => {
            if (typeof t.benefits === 'string') {
                try { t.benefits = JSON.parse(t.benefits); } catch (_) {}
            }
            return t;
        });
        const budgetItems = budgetResult.items;
        const budget = budgetItems.length > 0
            ? sanitize([budgetItems.find(b => b.isCurrent) || budgetItems[0]])[0]
            : null;
        const now = new Date();
        const announcements = sanitize(announcementsResult.items.filter(a => {
            if (a.active === false) return false;
            // Filter out expired records (support both field names used in different records)
            const expiry = a.expiresOn || a.expiryDate;
            if (expiry && new Date(expiry) < now) return false;
            return true;
        }));

        // Convert SiteContent to a key→value map for easy frontend access
        const siteContent = {};
        for (const item of contentResult.items.filter(c => c.active !== false)) {
            siteContent[item.key] = item.value;
        }

        // Sanitize events (only expose public fields)
        const events = eventsRaw.map(ev => ({
            title:       ev.title || ev.name || '',
            date:        ev.date || null,
            location:    ev.location || '',
            description: ev.description || ev.subtitle || '',
            emoji:       ev.emoji || '',
            gradient:    ev.gradient || ''
        }));

        return jsonResponse({
            success: true,
            timestamp: new Date().toISOString(),
            ...(debug ? { _debug: { sources } } : {}),
            data: {
                stats,
                ecMembers,
                membershipPlans,
                sponsorshipTiers,
                budget,
                siteContent,
                announcements,
                events
            }
        });
    } catch (e) {
        return errorResponse('Failed to load landing data: ' + e.message);
    }
}
export function options_landing_data(request) { return handleCors(); }


// ╔══════════════════════════════════════════════╗
// ║  GET /_functions/landing_seed                 ║
// ║  Admin-only — populate landing collections    ║
// ║  (requires collections to exist in Wix CMS)   ║
// ╚══════════════════════════════════════════════╝

export async function get_landing_seed(request) {
    const params = request.query || {};
    if (params.secret !== 'banf2024seed') {
        return errorResponse('Forbidden', 403);
    }

    const report = {};

    // Optional: ?col=CollectionName to seed a single collection (avoids 504 timeout)
    const targetCol = params.col ? String(params.col).trim() : null;

    try {
        // Determine identifier field per collection (for dedup upserts)
        const IDENTIFIER_MAP = {
            SiteStats: 'key', MembershipPlans: 'slug', SponsorshipTiers: 'slug',
            ECMembers: 'name', BudgetSummary: 'fiscalYear', SiteContent: 'key',
            Announcements: 'title', Events: 'slug', RadioStations: 'name',
            RadioSchedule: 'title'
        };

        const allCollections = Object.keys(SEED);
        const collectionNames = targetCol
            ? (allCollections.includes(targetCol) ? [targetCol] : [])
            : allCollections;

        if (targetCol && collectionNames.length === 0) {
            return errorResponse(`Unknown collection: ${targetCol}. Valid: ${allCollections.join(', ')}`, 400);
        }

        for (const cName of collectionNames) {
            // Check if collection exists
            let exists = false;
            try {
                await wixData.query(cName).limit(1).find(SA);
                exists = true;
            } catch (_) {}

            if (!exists) {
                // Auto-create the collection using wix-data.v2 SDK
                const creation = await ensureCollection(cName);
                if (!creation.created) {
                    report[cName] = {
                        status: 'skipped',
                        reason: `Could not auto-create collection: ${creation.error}. Please create it manually in Wix CMS Dashboard.`,
                        total: SEED[cName].length,
                        createAttempt: creation
                    };
                    continue;
                }
                // Give Wix a moment to register the new collection before inserting
                await new Promise(r => setTimeout(r, 2000));
                exists = true;
                report[cName] = report[cName] || {};
                report[cName]._created = true;
                report[cName]._createMethod = creation.method;
            }

            const rows = SEED[cName];
            let inserted = 0, updated = 0, errors = 0;
            const rowErrors = [];

            const idField = IDENTIFIER_MAP[cName] || 'slug';

            for (const row of rows) {
                try {
                    const identifier = row[idField];

                    if (identifier) {
                        const existing = await wixData.query(cName)
                            .eq(idField, identifier)
                            .limit(1)
                            .find(SA);
                        if (existing.items.length > 0) {
                            const updatedItem = { ...existing.items[0], ...row };
                            await wixData.update(cName, updatedItem, SA);
                            updated++;
                            continue;
                        }
                    }

                    await wixData.insert(cName, { ...row }, SA);
                    inserted++;
                } catch (rowErr) {
                    errors++;
                    if (rowErrors.length < 3) rowErrors.push(rowErr.message);
                }
            }
            report[cName] = { total: rows.length, inserted, updated, errors, ...(rowErrors.length ? { sampleErrors: rowErrors } : {}) };
        }

        return jsonResponse({
            success: true,
            message: targetCol ? `Seeded: ${targetCol}` : 'Landing page seed complete',
            note: 'Collections marked "skipped" could not be auto-created — create them manually in Wix CMS Dashboard, then re-run seed.',
            report
        });
    } catch (e) {
        return errorResponse('Seed error: ' + e.message);
    }
}
export function options_landing_seed(request) { return handleCors(); }

// ── Diagnostic: raw query test ──
export async function get_landing_test(request) {
    const results = {};
    const collections = ['SiteStats', 'ECMembers', 'MembershipPlans', 'SponsorshipTiers', 'BudgetSummary', 'SiteContent', 'Announcements'];
    
    for (const col of collections) {
        try {
            const r = await wixData.query(col).limit(200).find(SA);
            results[col] = { status: 'exists', count: r.items.length, total: r.totalCount };
        } catch (e) {
            // Check if it's a not-found or other error
            const notFound = e.message && e.message.includes('WDE0025');
            results[col] = {
                status: notFound ? 'not-created' : 'error',
                message: e.message,
                fallback: SEED[col] ? `${SEED[col].length} seed records available` : 'no seed'
            };
        }
    }
    return jsonResponse({ success: true, mode: 'hybrid', results });
}
export function options_landing_test(request) { return handleCors(); }

// ── GET /_functions/landing_create_collection  ─────────────────────────────
// Debug / admin: create a specific collection and dump wixCollections method list
// Usage: GET /_functions/landing_create_collection?secret=banf2024seed&col=Announcements
export async function get_landing_create_collection(request) {
    const params = request.query || {};
    if (params.secret !== 'banf2024seed') return errorResponse('Forbidden', 403);
    const colName = (params.col || 'Announcements').trim();

    // Introspect wixCollections namespace
    const colsKeys = Object.keys(wixCollections || {});
    const colsTypes = {};
    for (const k of colsKeys) { colsTypes[k] = typeof wixCollections[k]; }

    const steps = [];

    // Step 0: Check if already exists
    let alreadyExists = false;
    try {
        const probe = await wixData.query(colName).limit(1).find(SA);
        alreadyExists = true;
        steps.push({ step: 0, action: 'query-check', status: 'exists', count: probe.totalCount });
    } catch (e0) {
        steps.push({ step: 0, action: 'query-check', status: 'missing', error: e0.message });
    }

    if (!alreadyExists) {
        // Step 1: Try createDataCollection with elevation + flat param (correct format)
        try {
            await createDataCollectionElevated({ id: colName, displayName: colName });
            steps.push({ step: 1, action: 'createDataCollectionElevated [flat]', status: 'ok' });
            alreadyExists = true;
        } catch (e1) {
            steps.push({ step: 1, action: 'createDataCollectionElevated [flat]', status: 'error', error: e1.message?.slice(0, 300) });
        }

        // Step 2: Wix REST API via wixFetch
        if (!alreadyExists) {
            try {
                const resp = await wixFetch('https://www.wixapis.com/wix-data/v2/collections', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ collection: { id: colName, displayName: colName } })
                });
                const body = await resp.text().catch(() => '');
                steps.push({ step: 2, action: 'rest-api', status: resp.status, body: body.slice(0, 300) });
                if (resp.status >= 200 && resp.status < 300) alreadyExists = true;
            } catch (e2) {
                steps.push({ step: 2, action: 'rest-api', status: 'fetch-error', error: e2.message });
            }
        }
    }

    return jsonResponse({
        success: alreadyExists,
        collection: colName,
        wixCollectionsKeys: colsKeys,
        wixCollectionsTypes: colsTypes,
        steps
    });
}
export function options_landing_create_collection(request) { return handleCors(); }
