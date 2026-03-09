/**
 * ═══════════════════════════════════════════════════════════════
 *  EVENT ATTENDANCE — Server-side attendance management (v1.0)
 *  
 *  Replaces localStorage-only attendance tracking with proper
 *  Wix backend persistence via EventAttendance collection.
 *
 *  Endpoints:
 *    POST /admin_approve_attendance    — Record attendance approval
 *    GET  /admin_attendance            — Get all attendance records
 *    POST /admin_attendance_bulk       — Bulk import attendance records
 *    POST /admin_checkin               — Check-in (serve) a member
 *    GET  /admin_attendance_stats      — Event attendance statistics
 *
 *  Collection: EventAttendance
 *    Fields: email, name, event, adults, kids, totalHeadcount,
 *            dietary, paid, amount, paymentStatus, expectedAmount,
 *            remainingBalance, membership, householdType,
 *            membershipRecommendation, verificationStatus, comments,
 *            approvedAt, approvedBy, regCode, checkedIn, checkedInAt,
 *            checkedInBy, crmSynced
 * ═══════════════════════════════════════════════════════════════
 */

import { ok, badRequest, serverError, forbidden } from 'wix-http-functions';
import wixData from 'wix-data';

const SA = { suppressAuth: true };
const ADMIN_KEY = 'banf-bosonto-2026-live';
const COLLECTION = 'EventAttendance';

// ─── Shared helpers ───────────────────────────────────────────

function jsonOk(data) {
    return ok({
        body: JSON.stringify({ success: true, ...data }),
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
}

function jsonErr(msg, code = 400) {
    const fn = code === 403 ? forbidden : (code >= 500 ? serverError : badRequest);
    return fn({
        body: JSON.stringify({ success: false, error: msg }),
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
}

async function parseBody(request) {
    try { return await request.body.json(); } catch (_) { return {}; }
}

function handleCors() {
    return ok({
        body: '',
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type,Authorization,x-user-email'
        }
    });
}

function getQueryParam(request, key) {
    try {
        const url = request.url;
        const params = new URLSearchParams(url.query || '');
        return params.get(key) || request.query?.[key] || null;
    } catch {
        return null;
    }
}

// ─── Ensure collection exists ─────────────────────────────────

async function ensureCollection() {
    try {
        await wixData.query(COLLECTION).limit(1).find(SA);
        return true;
    } catch (e) {
        // Collection doesn't exist yet — first insert will auto-create on Wix
        return false;
    }
}

// ═══════════════════════════════════════════════════════════════
// POST /admin_approve_attendance
// Records an attendance approval from admin
// ═══════════════════════════════════════════════════════════════

export async function post_admin_approve_attendance(request) {
    try {
        const body = await parseBody(request);

        // Auth check
        if (body.adminKey !== ADMIN_KEY) {
            return jsonErr('Unauthorized', 403);
        }

        const record = body.record;
        if (!record || !record.email) {
            return jsonErr('Missing record or email');
        }

        const email = (record.email || '').toLowerCase().trim();
        const event = record.event || '';
        const compositeKey = `${email}|${event}`;

        // Check for existing record (dedup)
        let existing = null;
        try {
            const results = await wixData.query(COLLECTION)
                .eq('compositeKey', compositeKey)
                .limit(1)
                .find(SA);
            if (results.items.length > 0) {
                existing = results.items[0];
            }
        } catch (_) { /* collection may not exist yet */ }

        const now = new Date().toISOString();
        const attendanceRecord = {
            compositeKey,
            email,
            name: record.name || '',
            event: event,
            adults: parseInt(record.adults) || 0,
            kids: parseInt(record.kids) || 0,
            totalHeadcount: parseInt(record.totalHeadcount) || (parseInt(record.adults) || 0) + (parseInt(record.kids) || 0),
            dietary: record.dietary || 'Not specified',
            paid: !!record.paid,
            amount: parseFloat(record.amount) || 0,
            paymentStatus: record.paymentStatus || 'unpaid',
            expectedAmount: parseFloat(record.expectedAmount) || 0,
            remainingBalance: parseFloat(record.remainingBalance) || 0,
            membership: record.membership || '',
            householdType: record.householdType || '',
            membershipRecommendation: record.membershipRecommendation || '',
            verificationStatus: record.verificationStatus || '',
            comments: record.comments || '',
            approvedAt: record.approvedAt || now,
            approvedBy: record.approvedBy || 'Admin',
            regCode: record.regCode || '',
            approved: true,
            checkedIn: true,
            checkedInAt: record.checkedInAt || now,
            checkedInBy: record.approvedBy || 'Admin',
            crmSynced: true,
            crmSyncedAt: now,
            lastUpdated: now
        };

        let saved;
        if (existing) {
            // Update existing record
            saved = await wixData.update(COLLECTION, {
                ...existing,
                ...attendanceRecord,
                _id: existing._id
            }, SA);
        } else {
            // Insert new record
            saved = await wixData.insert(COLLECTION, attendanceRecord, SA);
        }

        return jsonOk({
            message: existing ? 'Attendance record updated' : 'Attendance recorded',
            record: {
                _id: saved._id,
                email: saved.email,
                name: saved.name,
                event: saved.event,
                approved: saved.approved,
                approvedAt: saved.approvedAt
            }
        });
    } catch (e) {
        return jsonErr('Failed to record attendance: ' + e.message, 500);
    }
}
export function options_admin_approve_attendance(request) { return handleCors(); }

// ═══════════════════════════════════════════════════════════════
// GET /admin_attendance — Get all attendance records for an event
// Query params: ?event=Bosonto+Utsob+2026&status=approved
// ═══════════════════════════════════════════════════════════════

export async function get_admin_attendance(request) {
    try {
        const event = getQueryParam(request, 'event');
        const status = getQueryParam(request, 'status');

        let query = wixData.query(COLLECTION);

        if (event) {
            query = query.eq('event', event);
        }
        if (status === 'approved') {
            query = query.eq('approved', true);
        } else if (status === 'checkedin') {
            query = query.eq('checkedIn', true);
        }

        const results = await query
            .descending('approvedAt')
            .limit(500)
            .find(SA);

        // Build stats
        const records = results.items;
        const totalAttendees = records.length;
        const totalAdults = records.reduce((s, r) => s + (r.adults || 0), 0);
        const totalKids = records.reduce((s, r) => s + (r.kids || 0), 0);
        const totalHeadcount = records.reduce((s, r) => s + (r.totalHeadcount || 0), 0);
        const paidCount = records.filter(r => r.paid).length;
        const totalRevenue = records.reduce((s, r) => s + (r.amount || 0), 0);
        const totalExpected = records.reduce((s, r) => s + (r.expectedAmount || 0), 0);

        return jsonOk({
            records,
            stats: {
                totalAttendees,
                totalAdults,
                totalKids,
                totalHeadcount,
                paidCount,
                unpaidCount: totalAttendees - paidCount,
                totalRevenue,
                totalExpected,
                shortfall: totalExpected - totalRevenue
            },
            total: results.totalCount
        });
    } catch (e) {
        // Collection might not exist yet
        if (e.message && e.message.includes('not found')) {
            return jsonOk({ records: [], stats: {}, total: 0, message: 'No attendance records yet' });
        }
        return jsonErr('Failed to fetch attendance: ' + e.message, 500);
    }
}
export function options_admin_attendance(request) { return handleCors(); }

// ═══════════════════════════════════════════════════════════════
// POST /admin_attendance_bulk — Bulk import from localStorage
// Allows syncing all local records to server at once
// ═══════════════════════════════════════════════════════════════

export async function post_admin_attendance_bulk(request) {
    try {
        const body = await parseBody(request);
        if (body.adminKey !== ADMIN_KEY) {
            return jsonErr('Unauthorized', 403);
        }

        const records = body.records || [];
        if (!Array.isArray(records) || records.length === 0) {
            return jsonErr('No records provided');
        }

        const results = { inserted: 0, updated: 0, failed: 0, errors: [] };

        for (const record of records) {
            try {
                const email = (record.email || '').toLowerCase().trim();
                const event = record.event || '';
                const compositeKey = `${email}|${event}`;

                // Check existing
                let existing = null;
                try {
                    const q = await wixData.query(COLLECTION)
                        .eq('compositeKey', compositeKey)
                        .limit(1)
                        .find(SA);
                    if (q.items.length > 0) existing = q.items[0];
                } catch (_) { }

                const doc = {
                    compositeKey,
                    email,
                    name: record.name || '',
                    event,
                    adults: parseInt(record.adults) || 0,
                    kids: parseInt(record.kids) || 0,
                    totalHeadcount: parseInt(record.totalHeadcount) || 0,
                    dietary: record.dietary || '',
                    paid: !!record.paid,
                    amount: parseFloat(record.amount) || 0,
                    paymentStatus: record.paymentStatus || 'unpaid',
                    expectedAmount: parseFloat(record.expectedAmount) || 0,
                    remainingBalance: parseFloat(record.remainingBalance) || 0,
                    membership: record.membership || '',
                    householdType: record.householdType || '',
                    membershipRecommendation: record.membershipRecommendation || '',
                    verificationStatus: record.verificationStatus || '',
                    comments: record.comments || '',
                    approved: !!record.approved,
                    approvedAt: record.approvedAt || new Date().toISOString(),
                    approvedBy: record.approvedBy || 'Admin',
                    regCode: record.regCode || '',
                    checkedIn: record.checkedIn !== undefined ? !!record.checkedIn : !!record.approved,
                    checkedInAt: record.checkedInAt || record.approvedAt || new Date().toISOString(),
                    checkedInBy: record.checkedInBy || record.approvedBy || 'Admin',
                    crmSynced: true,
                    crmSyncedAt: new Date().toISOString(),
                    lastUpdated: new Date().toISOString()
                };

                if (existing) {
                    await wixData.update(COLLECTION, { ...existing, ...doc, _id: existing._id }, SA);
                    results.updated++;
                } else {
                    await wixData.insert(COLLECTION, doc, SA);
                    results.inserted++;
                }
            } catch (e) {
                results.failed++;
                if (results.errors.length < 5) {
                    results.errors.push({ email: record.email, error: e.message });
                }
            }
        }

        return jsonOk({
            message: `Bulk sync complete: ${results.inserted} inserted, ${results.updated} updated, ${results.failed} failed`,
            results
        });
    } catch (e) {
        return jsonErr('Bulk sync failed: ' + e.message, 500);
    }
}
export function options_admin_attendance_bulk(request) { return handleCors(); }

// ═══════════════════════════════════════════════════════════════
// POST /admin_checkin — Simple check-in without full approval
// For QR scan → mark as served
// ═══════════════════════════════════════════════════════════════

export async function post_admin_checkin(request) {
    try {
        const body = await parseBody(request);
        if (body.adminKey !== ADMIN_KEY) {
            return jsonErr('Unauthorized', 403);
        }

        const email = (body.email || '').toLowerCase().trim();
        const event = body.event || '';
        if (!email) return jsonErr('Missing email');

        const compositeKey = `${email}|${event}`;

        // Find existing
        let existing = null;
        try {
            const q = await wixData.query(COLLECTION)
                .eq('compositeKey', compositeKey)
                .limit(1)
                .find(SA);
            if (q.items.length > 0) existing = q.items[0];
        } catch (_) { }

        const now = new Date().toISOString();
        const checkinData = {
            compositeKey,
            email,
            name: body.name || (existing ? existing.name : ''),
            event,
            checkedIn: true,
            checkedInAt: now,
            checkedInBy: body.adminName || 'Admin',
            adults: body.adults || (existing ? existing.adults : 0),
            kids: body.kids || (existing ? existing.kids : 0),
            totalHeadcount: body.totalHeadcount || (existing ? existing.totalHeadcount : 0),
            lastUpdated: now,
            crmSynced: true
        };

        let saved;
        if (existing) {
            saved = await wixData.update(COLLECTION, { ...existing, ...checkinData, _id: existing._id }, SA);
        } else {
            saved = await wixData.insert(COLLECTION, checkinData, SA);
        }

        return jsonOk({
            message: `Check-in recorded for ${email}`,
            record: { _id: saved._id, email: saved.email, checkedIn: true, checkedInAt: now }
        });
    } catch (e) {
        return jsonErr('Check-in failed: ' + e.message, 500);
    }
}
export function options_admin_checkin(request) { return handleCors(); }

// ═══════════════════════════════════════════════════════════════
// GET /admin_attendance_stats — Quick stats endpoint
// ═══════════════════════════════════════════════════════════════

export async function get_admin_attendance_stats(request) {
    try {
        const event = getQueryParam(request, 'event');
        let query = wixData.query(COLLECTION);
        if (event) query = query.eq('event', event);

        const results = await query.limit(500).find(SA);
        const records = results.items;

        const approved = records.filter(r => r.approved);
        const checkedIn = records.filter(r => r.checkedIn);
        const paid = records.filter(r => r.paid);

        // Dietary breakdown
        const dietaryBreakdown = {};
        records.forEach(r => {
            const d = r.dietary || 'Not specified';
            dietaryBreakdown[d] = (dietaryBreakdown[d] || 0) + 1;
        });

        // Membership tier breakdown
        const membershipBreakdown = {};
        records.forEach(r => {
            const m = r.membership || 'Unknown';
            membershipBreakdown[m] = (membershipBreakdown[m] || 0) + 1;
        });

        // Payment status breakdown
        const paymentBreakdown = {};
        records.forEach(r => {
            const p = r.paymentStatus || 'unknown';
            paymentBreakdown[p] = (paymentBreakdown[p] || 0) + 1;
        });

        return jsonOk({
            event: event || 'all',
            totalRecords: records.length,
            approved: approved.length,
            checkedIn: checkedIn.length,
            paid: paid.length,
            totalAdults: records.reduce((s, r) => s + (r.adults || 0), 0),
            totalKids: records.reduce((s, r) => s + (r.kids || 0), 0),
            totalHeadcount: records.reduce((s, r) => s + (r.totalHeadcount || 0), 0),
            totalRevenue: records.reduce((s, r) => s + (r.amount || 0), 0),
            totalExpected: records.reduce((s, r) => s + (r.expectedAmount || 0), 0),
            dietaryBreakdown,
            membershipBreakdown,
            paymentBreakdown,
            lastUpdated: records.length > 0 ? records[0].lastUpdated : null
        });
    } catch (e) {
        if (e.message && e.message.includes('not found')) {
            return jsonOk({ totalRecords: 0, message: 'No attendance data yet' });
        }
        return jsonErr('Stats error: ' + e.message, 500);
    }
}
export function options_admin_attendance_stats(request) { return handleCors(); }
