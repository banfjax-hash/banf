/**
 * â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
 *  EC ONBOARDING GATE MODULE  v1.0
 *  
 *  Enforces the operational chain:
 *    1. Super Admin completes EC onboarding for the fiscal year
 *    2. Only then can the President launch the membership drive
 *    3. Only members onboarded through the drive can log in
 *
 *  Collection: ECYearStatus
 *    - fiscalYear        (string)  "FY2026-27"
 *    - ecOnboardComplete (bool)    true when all EC onboarded
 *    - driveEnabled      (bool)    auto-set when ecOnboardComplete
 *    - completedBy       (string)  super admin email
 *    - completedAt       (date)    when EC onboarding was marked done
 *    - ecSnapshot        (string)  JSON snapshot of EC roles at time
 *    - notes             (string)
 *
 *  Endpoints:
 *    GET  /ec_year_status          â†’ current fiscal year gate status
 *    POST /ec_year_complete        â†’ super admin marks EC onboarding done
 *    POST /ec_year_reset           â†’ super admin resets (re-opens) EC onboarding
 *    GET  /ec_onboard_progress     â†’ detailed progress dashboard data
 *    GET  /membership_gate_check   â†’ used by drive & login to check gates
 * â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
 */

import { ok, badRequest, serverError, forbidden } from 'wix-http-functions';
import wixData from 'wix-data';
import { fetch as wixFetch } from 'wix-fetch';
import { checkPermission } from 'backend/rbac';

const SA = { suppressAuth: true };
const CURRENT_FY = 'FY2026-27';

// Email configuration
const BANF_EMAIL = 'banfjax@gmail.com';
const BANF_ORG = 'Bengali Association of North Florida (BANF)';
const PRESIDENT_EMAIL = 'ranadhir.ghosh@gmail.com';
const TEST_MODE = true; // When true, emails go to PRESIDENT_EMAIL only

const GOOGLE_CLIENT_ID = '1020178199135-3usrl611ara38i7rhu2ub6sn6g1150ml.apps.googleusercontent.com';
const GOOGLE_CLIENT_SECRET = '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';
const GOOGLE_REFRESH_TOKEN = '1//04iXClX5dKpqhCgYIARAAGAQSNwF-L9IrCtEUhuup9COlH5wnvGtozgReO4E5ILylE9Jq4f8vw1YUXDT_ysiHcJ89g-PA96eh8Ko';

const ONBOARD_URL = 'https://www.jaxbengali.org/_functions/admin_portal';
const JOURNEY_URL = 'https://www.jaxbengali.org/stakeholder-requirements-journey.html';

// â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function jsonOk(data) {
    return ok({
        body: JSON.stringify({ success: true, ...data }),
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-user-email'
        }
    });
}

function jsonErr(msg, code = 400) {
    const fn = code === 403 ? forbidden : (code >= 500 ? serverError : badRequest);
    return fn({
        body: JSON.stringify({ success: false, error: msg }),
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-user-email'
        }
    });
}

function handleCors() {
    return ok({
        body: '',
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-user-email',
            'Access-Control-Max-Age': '86400'
        }
    });
}

async function parseBody(request) {
    try { return await request.body.json(); } catch (_) { return {}; }
}

// â”€â”€ Shared: Get or create ECYearStatus for fiscal year â”€â”€
async function getYearStatus(fy) {
    const fiscalYear = fy || CURRENT_FY;
    try {
        const res = await wixData.query('ECYearStatus')
            .eq('fiscalYear', fiscalYear)
            .limit(1)
            .find(SA);
        if (res.items.length > 0) return res.items[0];
    } catch (_) {
        // Collection doesn't exist â€” try creating record which will auto-create in some Wix setups
    }
    // Not found â€” return default (not yet complete)
    return {
        fiscalYear,
        ecOnboardComplete: false,
        driveEnabled: false,
        completedBy: null,
        completedAt: null,
        ecSnapshot: null,
        notes: ''
    };
}

/** 
 * EXPORTED: Check if EC onboarding is complete for a fiscal year.
 * Used by membership-drive and signin modules.
 */
export async function isECOnboardComplete(fy) {
    const status = await getYearStatus(fy || CURRENT_FY);
    return status.ecOnboardComplete === true;
}

/**
 * EXPORTED: Check if membership drive is enabled for a fiscal year.
 */
export async function isDriveEnabled(fy) {
    const status = await getYearStatus(fy || CURRENT_FY);
    return status.driveEnabled === true;
}

/**
 * EXPORTED: Check if a member is onboarded (has active membership via drive).
 * Used by signin module to gate login.
 */
export async function isMemberOnboarded(email) {
    if (!email) return { onboarded: false, reason: 'No email provided' };
    const emailLc = email.toLowerCase().trim();

    // Check MembershipRegistrations for current FY with active status
    try {
        const regResult = await wixData.query('MembershipRegistrations')
            .eq('email', emailLc)
            .eq('membershipYear', CURRENT_FY)
            .eq('status', 'active')
            .limit(1)
            .find(SA);

        if (regResult.items.length > 0) {
            return {
                onboarded: true,
                registrationCode: regResult.items[0].registrationCode,
                categoryName: regResult.items[0].categoryName,
                membershipYear: CURRENT_FY
            };
        }
    } catch (_) {
        // Collection doesn't exist yet â€” members can't be onboarded
    }

    // Check if member is an EC member (AdminRoles) â€” EC members bypass drive requirement
    try {
        const adminResult = await wixData.query('AdminRoles')
            .eq('email', emailLc)
            .eq('isActive', true)
            .limit(1)
            .find(SA);
        
        if (adminResult.items.length > 0) {
            const role = adminResult.items[0];
            // EC members with completed onboarding can always log in
            if (role.onboardingComplete === true || role.role === 'super_admin') {
                return {
                    onboarded: true,
                    isECMember: true,
                    role: role.role,
                    ecTitle: role.ecTitle || '',
                    membershipYear: CURRENT_FY
                };
            }
        }
    } catch (_) {}

    // Check membership drive status â€” if drive hasn't started, give a better message
    const driveEnabled = await isDriveEnabled();
    if (!driveEnabled) {
        return {
            onboarded: false,
            reason: 'Membership drive has not been opened yet for ' + CURRENT_FY + '. EC onboarding must be completed first.'
        };
    }

    // Check if they have a pending registration
    try {
        const pendingResult = await wixData.query('MembershipRegistrations')
            .eq('email', emailLc)
            .eq('membershipYear', CURRENT_FY)
            .limit(1)
            .find(SA);

        if (pendingResult.items.length > 0) {
            const reg = pendingResult.items[0];
            return {
                onboarded: false,
                reason: `Your ${CURRENT_FY} membership is ${reg.status}. Please complete payment to activate your account.`,
                registrationCode: reg.registrationCode,
                status: reg.status
            };
        }
    } catch (_) {}

    return {
        onboarded: false,
        reason: `You have not registered for ${CURRENT_FY} membership. Please register through the membership drive first.`
    };
}


// â•”â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•—
// â•‘  GET /ec_year_status                                        â•‘
// â•‘  Returns current FY EC onboarding gate status                â•‘
// â•šâ•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

export async function get_ec_year_status(request) {
    try {
        const params = request.query || {};
        const fy = params.fy || CURRENT_FY;
        const status = await getYearStatus(fy);

        return jsonOk({
            fiscalYear: status.fiscalYear,
            ecOnboardComplete: status.ecOnboardComplete === true,
            driveEnabled: status.driveEnabled === true,
            completedBy: status.completedBy || null,
            completedAt: status.completedAt || null,
            notes: status.notes || ''
        });
    } catch (e) {
        return jsonErr('Failed to get status: ' + e.message, 500);
    }
}
export function options_ec_year_status(request) { return handleCors(); }


// â•”â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•—
// â•‘  POST /ec_year_complete                                      â•‘
// â•‘  Super admin marks EC onboarding as complete for the year    â•‘
// â•‘  This unlocks the membership drive                           â•‘
// â•šâ•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

export async function post_ec_year_complete(request) {
    const perm = await checkPermission(request, 'admin:manage_roles');
    if (!perm.allowed) return jsonErr('Forbidden â€” super_admin only', 403);

    try {
        const body = await parseBody(request);
        const fy = body.fiscalYear || CURRENT_FY;

        // Get current EC roster snapshot
        const allRoles = await wixData.query('AdminRoles')
            .eq('isActive', true)
            .limit(200)
            .find(SA);

        const ecMembers = allRoles.items.filter(r => r.role !== 'super_admin');
        const total = ecMembers.length;
        const onboarded = ecMembers.filter(r => r.onboardingComplete === true).length;
        const passwordSet = ecMembers.filter(r => r.passwordSet === true).length;

        // Validate: all active EC members must have completed onboarding
        const notOnboarded = ecMembers.filter(r => r.onboardingComplete !== true);
        if (notOnboarded.length > 0 && !body.force) {
            const pending = notOnboarded.map(r => ({
                email: r.email,
                ecTitle: r.ecTitle || '',
                name: `${r.firstName || ''} ${r.lastName || ''}`.trim(),
                passwordSet: r.passwordSet || false,
                onboardingComplete: r.onboardingComplete === true
            }));
            return jsonErr(
                `Cannot complete EC onboarding: ${notOnboarded.length} member(s) not yet onboarded. ` +
                `Use force:true to override. Pending: ${pending.map(p => p.email).join(', ')}`,
                400
            );
        }

        // Build EC snapshot
        const snapshot = allRoles.items.map(r => ({
            email: r.email,
            role: r.role,
            ecTitle: r.ecTitle || '',
            name: `${r.firstName || ''} ${r.lastName || ''}`.trim(),
            passwordSet: r.passwordSet || false,
            onboardingComplete: r.onboardingComplete === true
        }));

        // Upsert ECYearStatus
        const existing = await wixData.query('ECYearStatus')
            .eq('fiscalYear', fy)
            .limit(1)
            .find(SA)
            .catch(() => ({ items: [] }));

        const record = {
            fiscalYear: fy,
            ecOnboardComplete: true,
            driveEnabled: true,
            completedBy: perm.email,
            completedAt: new Date().toISOString(),
            ecSnapshot: JSON.stringify(snapshot),
            notes: body.notes || (body.force ? 'Force-completed with pending members' : ''),
            ecTotal: total,
            ecOnboarded: onboarded,
            ecPasswordSet: passwordSet,
            forced: body.force === true
        };

        if (existing.items.length > 0) {
            await wixData.update('ECYearStatus', { ...existing.items[0], ...record }, SA);
        } else {
            await wixData.insert('ECYearStatus', record, SA);
        }

        return jsonOk({
            message: `EC onboarding marked complete for ${fy}. Membership drive is now ENABLED.`,
            fiscalYear: fy,
            ecOnboardComplete: true,
            driveEnabled: true,
            ecSummary: { total, onboarded, passwordSet },
            forced: body.force === true,
            pendingCount: notOnboarded.length
        });
    } catch (e) {
        return jsonErr('Failed: ' + e.message, 500);
    }
}
export function options_ec_year_complete(request) { return handleCors(); }


// â•”â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•—
// â•‘  POST /ec_year_reset                                         â•‘
// â•‘  Super admin resets EC onboarding status (re-opens it)       â•‘
// â•šâ•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

export async function post_ec_year_reset(request) {
    const perm = await checkPermission(request, 'admin:manage_roles');
    if (!perm.allowed) return jsonErr('Forbidden â€” super_admin only', 403);

    try {
        const body = await parseBody(request);
        const fy = body.fiscalYear || CURRENT_FY;

        const existing = await wixData.query('ECYearStatus')
            .eq('fiscalYear', fy)
            .limit(1)
            .find(SA)
            .catch(() => ({ items: [] }));

        if (existing.items.length > 0) {
            await wixData.update('ECYearStatus', {
                ...existing.items[0],
                ecOnboardComplete: false,
                driveEnabled: false,
                resetBy: perm.email,
                resetAt: new Date().toISOString(),
                notes: body.notes || 'Reset by ' + perm.email
            }, SA);
        }

        return jsonOk({
            message: `EC onboarding reset for ${fy}. Membership drive is now DISABLED.`,
            fiscalYear: fy,
            ecOnboardComplete: false,
            driveEnabled: false
        });
    } catch (e) {
        return jsonErr('Failed: ' + e.message, 500);
    }
}
export function options_ec_year_reset(request) { return handleCors(); }


// â•”â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•—
// â•‘  GET /ec_onboard_progress                                    â•‘
// â•‘  Full EC onboarding progress dashboard data                  â•‘
// â•‘  Shows: year status, each EC member status, gate status      â•‘
// â•šâ•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

export async function get_ec_onboard_progress(request) {
    const perm = await checkPermission(request, 'admin:view');
    if (!perm.allowed) return jsonErr('Forbidden', 403);

    try {
        const params = request.query || {};
        const fy = params.fy || CURRENT_FY;

        // 1. Year status
        const yearStatus = await getYearStatus(fy);

        // 2. All EC roles
        const allRoles = await wixData.query('AdminRoles').limit(200).find(SA);
        const ecMembers = allRoles.items.map(r => ({
            email: r.email,
            role: r.role,
            ecTitle: r.ecTitle || '',
            firstName: r.firstName || '',
            lastName: r.lastName || '',
            isActive: r.isActive !== false,
            passwordSet: r.passwordSet || false,
            onboardingComplete: r.onboardingComplete === true,
            lastLogin: r.lastLogin || null,
            addedBy: r.addedBy || '',
            _createdDate: r._createdDate,
            // Compute step status
            steps: {
                roleAssigned: true,
                passwordSet: r.passwordSet || false,
                profileComplete: r.onboardingComplete === true,
                featureAssigned: !!(r.assignedFeatures && r.assignedFeatures !== '[]')
            }
        }));

        // 3. Summary
        const active = ecMembers.filter(m => m.isActive);
        const nonSuperAdmin = active.filter(m => m.role !== 'super_admin');
        const summary = {
            totalEC: active.length,
            nonSuperAdmin: nonSuperAdmin.length,
            passwordDone: nonSuperAdmin.filter(m => m.passwordSet).length,
            onboarded: nonSuperAdmin.filter(m => m.onboardingComplete).length,
            featureAssigned: nonSuperAdmin.filter(m => m.steps.featureAssigned).length,
            pendingOnboarding: nonSuperAdmin.filter(m => !m.onboardingComplete).length
        };
        summary.completionPercent = nonSuperAdmin.length > 0
            ? Math.round((summary.onboarded / nonSuperAdmin.length) * 100)
            : 0;

        // 4. Drive status
        let driveStatus = null;
        try {
            const drives = await wixData.query('MembershipDrive')
                .descending('_createdDate')
                .limit(1)
                .find(SA);
            if (drives.items.length > 0) {
                const d = drives.items[0];
                driveStatus = {
                    id: d._id,
                    year: d.year,
                    status: d.status,
                    mode: d.mode,
                    launchedBy: d.launchedBy,
                    sentCount: d.sentCount || 0,
                    totalTargets: d.totalTargets || 0
                };
            }
        } catch (_) {}

        // 5. Registration stats (if drive is active)
        let registrationStats = null;
        try {
            const regs = await wixData.query('MembershipRegistrations')
                .eq('membershipYear', fy)
                .limit(500)
                .find(SA);
            registrationStats = {
                total: regs.totalCount,
                active: regs.items.filter(r => r.status === 'active').length,
                pendingPayment: regs.items.filter(r => r.status === 'pending_payment').length,
                totalRevenue: regs.items.filter(r => r.status === 'active')
                    .reduce((s, r) => s + (r.amount || 0), 0)
            };
        } catch (_) {}

        // 6. Gate chain status (the operational flow)
        const gates = {
            step1_ecOnboarding: {
                label: 'EC Onboarding',
                description: 'Super Admin onboards all EC members (password + profile)',
                status: yearStatus.ecOnboardComplete ? 'complete' : 'in-progress',
                completedAt: yearStatus.completedAt || null,
                completedBy: yearStatus.completedBy || null,
                progress: summary.completionPercent
            },
            step2_membershipDrive: {
                label: 'Membership Drive',
                description: 'President launches membership drive (gated on Step 1)',
                status: yearStatus.driveEnabled
                    ? (driveStatus && driveStatus.status === 'complete' ? 'complete'
                       : driveStatus ? 'in-progress' : 'ready')
                    : 'locked',
                driveStatus: driveStatus
            },
            step3_memberLogin: {
                label: 'Member Login',
                description: 'Members can log in after onboarding via drive (gated on Step 2)',
                status: registrationStats && registrationStats.active > 0 ? 'active' : 'waiting',
                activeMembers: registrationStats ? registrationStats.active : 0
            }
        };

        return jsonOk({
            fiscalYear: fy,
            yearStatus: {
                ecOnboardComplete: yearStatus.ecOnboardComplete === true,
                driveEnabled: yearStatus.driveEnabled === true,
                completedBy: yearStatus.completedBy || null,
                completedAt: yearStatus.completedAt || null,
                forced: yearStatus.forced || false,
                notes: yearStatus.notes || ''
            },
            summary,
            ecMembers,
            gates,
            driveStatus,
            registrationStats
        });
    } catch (e) {
        return jsonErr('Failed: ' + e.message, 500);
    }
}
export function options_ec_onboard_progress(request) { return handleCors(); }


// â•”â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•—
// â•‘  GET /membership_gate_check                                  â•‘
// â•‘  Public check: member login gate (used by signin page)       â•‘
// â•šâ•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

export async function get_membership_gate_check(request) {
    try {
        const params = request.query || {};
        const email = (params.email || '').toLowerCase().trim();
        if (!email) return jsonErr('email parameter required');

        const result = await isMemberOnboarded(email);
        return jsonOk(result);
    } catch (e) {
        return jsonErr('Gate check failed: ' + e.message, 500);
    }
}
export function options_membership_gate_check(request) { return handleCors(); }

// ╔══════════════════════════════════════════════════════════════╗
// ║  EMAIL REMINDER FUNCTIONS                                    ║
// ╚══════════════════════════════════════════════════════════════╝

async function getGmailToken() {
    const resp = await wixFetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `grant_type=refresh_token&refresh_token=${encodeURIComponent(GOOGLE_REFRESH_TOKEN)}&client_id=${encodeURIComponent(GOOGLE_CLIENT_ID)}&client_secret=${encodeURIComponent(GOOGLE_CLIENT_SECRET)}`
    });
    const d = await resp.json();
    if (d.error) throw new Error('Gmail token: ' + d.error);
    return d.access_token;
}

async function sendGmail(to, toName, subject, html) {
    let actualTo = to;
    let actualName = toName;
    let actualSubject = subject;
    if (TEST_MODE && to.toLowerCase() !== PRESIDENT_EMAIL.toLowerCase()) {
        actualTo = PRESIDENT_EMAIL;
        actualName = 'BANF President (TEST)';
        actualSubject = `[TEST → ${to}] ${subject}`;
    }
    const token = await getGmailToken();
    const raw = [
        `From: ${BANF_ORG} <${BANF_EMAIL}>`,
        `To: ${actualName} <${actualTo}>`,
        `Subject: ${actualSubject}`,
        'MIME-Version: 1.0',
        'Content-Type: text/html; charset=UTF-8',
        '',
        html
    ].join('\r\n');
    const encoded = btoa(unescape(encodeURIComponent(raw))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    const r = await wixFetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ raw: encoded })
    });
    const d = await r.json();
    if (d.error) throw new Error('Gmail send: ' + (d.error.message || JSON.stringify(d.error)));
    return d;
}

function buildReminderEmail(ecMember, steps) {
    const firstName = ecMember.firstName || 'EC Member';
    const ecTitle = ecMember.ecTitle || ecMember.role || 'EC Member';
    const pendingSteps = [];
    if (!steps.passwordSet) pendingSteps.push('Set your password');
    if (!steps.profileComplete) pendingSteps.push('Complete your profile');
    
    const stepsList = pendingSteps.map(s => `<li style="margin-bottom:8px;">${s}</li>`).join('');
    
    return `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background: linear-gradient(135deg, #8B0000, #DC143C); padding: 20px; border-radius: 8px 8px 0 0;">
        <h1 style="color: #fff; margin: 0; font-size: 24px;">🔔 EC Onboarding Reminder</h1>
        <p style="color: rgba(255,255,255,0.8); margin: 8px 0 0 0;">Bengali Association of North Florida</p>
    </div>
    
    <div style="background: #f9f9f9; padding: 25px; border: 1px solid #ddd; border-top: none;">
        <p style="font-size: 16px;">Dear <strong>${firstName}</strong>,</p>
        
        <p>This is a friendly reminder that your EC onboarding for <strong>${CURRENT_FY}</strong> as <strong>${ecTitle}</strong> is not yet complete.</p>
        
        <p><strong>Please complete the following step(s):</strong></p>
        <ul style="background: #fff; padding: 15px 15px 15px 35px; border-radius: 8px; border-left: 4px solid #FF6B35;">
            ${stepsList}
        </ul>
        
        <div style="text-align: center; margin: 25px 0;">
            <a href="${ONBOARD_URL}" style="display: inline-block; background: linear-gradient(135deg, #8B0000, #DC143C); color: #fff; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">Complete Onboarding Now →</a>
            <a href="${JOURNEY_URL}" style="display: inline-block; background: #fff; color: #8B0000; border: 2px solid #8B0000; padding: 12px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 15px; margin-left: 10px;">Open Requirements Journey</a>
        </div>
        
        <p style="color: #666; font-size: 14px;">The membership drive cannot begin until all EC members complete their onboarding. Your prompt action helps the entire team!</p>
        
        <p style="margin-top: 20px;">If you have any questions, please contact the Super Admin.</p>
        
        <p style="margin-top: 20px;">Best regards,<br><strong>BANF Admin Team</strong></p>
    </div>
    
    <div style="background: #333; color: #888; padding: 15px; text-align: center; font-size: 12px; border-radius: 0 0 8px 8px;">
        Bengali Association of North Florida | <a href="https://www.jaxbengali.org" style="color: #aaa;">www.jaxbengali.org</a>
    </div>
</body>
</html>`;
}

// ╔══════════════════════════════════════════════════════════════╗
// ║  POST /ec_send_reminder                                      ║
// ║  Super admin: send reminder to pending EC members            ║
// ╚══════════════════════════════════════════════════════════════╝

export async function post_ec_send_reminder(request) {
    try {
        const userEmail = (request.headers['x-user-email'] || '').toLowerCase().trim();
        if (!userEmail) return jsonErr('x-user-email header required', 401);

        const perm = await checkPermission(userEmail, 'ec_manage');
        if (!perm.allowed) return jsonErr('Only super admin can send reminders', 403);

        const body = await parseBody(request);
        const targetEmails = body.emails; // optional: specific emails to send to
        const sendAll = body.sendAll === true; // send to all pending
        
        // Get all EC members
        const ecRes = await wixData.query('AdminRoles')
            .eq('isActive', true)
            .find(SA);
        
        const ecMembers = ecRes.items.filter(m => m.role !== 'super_admin');
        
        // Find pending members
        const pending = ecMembers.filter(m => !m.passwordSet || !m.onboardingComplete);
        
        if (pending.length === 0) {
            return jsonOk({ message: 'All EC members have completed onboarding!', sent: 0 });
        }
        
        // Filter by targetEmails if specified
        let toSend = pending;
        if (targetEmails && Array.isArray(targetEmails) && targetEmails.length > 0) {
            const targetSet = new Set(targetEmails.map(e => e.toLowerCase().trim()));
            toSend = pending.filter(m => targetSet.has(m.email.toLowerCase()));
        } else if (!sendAll) {
            return jsonErr('Specify emails array or set sendAll:true', 400);
        }
        
        if (toSend.length === 0) {
            return jsonOk({ message: 'No matching pending members found', sent: 0 });
        }
        
        const results = [];
        for (const member of toSend) {
            const steps = {
                passwordSet: !!member.passwordSet,
                profileComplete: !!member.onboardingComplete
            };
            const html = buildReminderEmail(member, steps);
            const name = [member.firstName, member.lastName].filter(Boolean).join(' ') || member.email;
            
            try {
                await sendGmail(member.email, name, `BANF EC Onboarding Reminder - ${CURRENT_FY}`, html);
                results.push({ email: member.email, status: 'sent' });
                
                // Log the reminder in AdminRoles
                await wixData.update('AdminRoles', {
                    ...member,
                    lastReminderSent: new Date(),
                    reminderCount: (member.reminderCount || 0) + 1
                }, SA);
            } catch (err) {
                results.push({ email: member.email, status: 'failed', error: err.message });
            }
        }
        
        const sent = results.filter(r => r.status === 'sent').length;
        const failed = results.filter(r => r.status === 'failed').length;
        
        return jsonOk({
            message: `Sent ${sent} reminder(s)${failed > 0 ? `, ${failed} failed` : ''}`,
            sent,
            failed,
            results,
            testMode: TEST_MODE
        });
    } catch (e) {
        return jsonErr('Send reminder failed: ' + e.message, 500);
    }
}
export function options_ec_send_reminder(request) { return handleCors(); }

// ╔══════════════════════════════════════════════════════════════╗
// ║  GET /ec_pending_members                                     ║
// ║  Get list of EC members pending onboarding (for dashboard)   ║
// ╚══════════════════════════════════════════════════════════════╝

export async function get_ec_pending_members(request) {
    try {
        const userEmail = (request.headers['x-user-email'] || '').toLowerCase().trim();
        if (!userEmail) return jsonErr('x-user-email header required', 401);

        const perm = await checkPermission(userEmail, 'ec_view');
        if (!perm.allowed) return jsonErr('EC role required', 403);

        const ecRes = await wixData.query('AdminRoles')
            .eq('isActive', true)
            .find(SA);
        
        const pending = ecRes.items
            .filter(m => m.role !== 'super_admin' && (!m.passwordSet || !m.onboardingComplete))
            .map(m => ({
                email: m.email,
                firstName: m.firstName || '',
                lastName: m.lastName || '',
                ecTitle: m.ecTitle || m.role,
                passwordSet: !!m.passwordSet,
                onboardingComplete: !!m.onboardingComplete,
                lastReminderSent: m.lastReminderSent || null,
                reminderCount: m.reminderCount || 0
            }));
        
        return jsonOk({
            fiscalYear: CURRENT_FY,
            pendingCount: pending.length,
            members: pending
        });
    } catch (e) {
        return jsonErr('Get pending failed: ' + e.message, 500);
    }
}
export function options_ec_pending_members(request) { return handleCors(); }
