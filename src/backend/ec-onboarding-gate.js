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
const TEST_MODE = false; // Emails sent directly to EC members (live mode)

const GOOGLE_CLIENT_ID = '1020178199135-3usrl611ara38i7rhu2ub6sn6g1150ml.apps.googleusercontent.com';
const GOOGLE_CLIENT_SECRET = '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';
const GOOGLE_REFRESH_TOKEN = '1//04iXClX5dKpqhCgYIARAAGAQSNwF-L9IrCtEUhuup9COlH5wnvGtozgReO4E5ILylE9Jq4f8vw1YUXDT_ysiHcJ89g-PA96eh8Ko';

const ONBOARD_URL = 'https://www.jaxbengali.org/_functions/admin_portal';
const JOURNEY_URL = 'https://www.jaxbengali.org/stakeholder-requirements-journey.html';
const MEMBER_PORTAL_URL = 'https://www.jaxbengali.org/member-portal.html';
const MEMBER_LOGIN_URL  = 'https://www.jaxbengali.org/member-login.html';
const EC_ADMIN_URL      = 'https://www.jaxbengali.org/admin-portal.html';

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

// ╔══════════════════════════════════════════════════════════════╗
// ║  POST /ec_signup_congratulations                             ║
// ║  Called after EC member completes signup.                    ║
// ║  Sends congratulation email with prod URLs + test checklist  ║
// ╚══════════════════════════════════════════════════════════════╝

function buildCongratsEmail(member, role) {
    const name = member.firstName || member.name || 'EC Member';
    const roleTitle = role || member.ecTitle || member.role || 'EC Member';
    return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><title>Welcome to BANF!</title></head>
<body style="margin:0;padding:0;background:#f5f7fa;font-family:'Poppins',Arial,sans-serif;">
  <div style="max-width:620px;margin:30px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.10);">
    <div style="background:linear-gradient(135deg,#006A4E,#00856F);padding:32px 40px;text-align:center;">
      <h1 style="color:#fff;margin:0;font-size:26px;font-weight:700;">&#x1F389; Welcome to BANF, ${name}!</h1>
      <p style="color:rgba(255,255,255,0.9);margin:8px 0 0;font-size:16px;">${roleTitle} — FY 2026-2028</p>
    </div>
    <div style="padding:32px 40px;">
      <p style="font-size:16px;color:#333;">Congratulations on completing your signup! You are now officially onboarded as an Executive Committee member of the Bengali Association of North Florida.</p>

      <div style="background:#f0faf6;border-left:4px solid #006A4E;padding:16px 20px;border-radius:6px;margin:24px 0;">
        <h3 style="margin:0 0 12px;color:#006A4E;font-size:16px;">&#x1F517; Production Links</h3>
        <table style="width:100%;border-collapse:collapse;">
          <tr>
            <td style="padding:6px 0;font-size:14px;color:#555;width:140px;">&#x1F30D; Website</td>
            <td><a href="https://www.jaxbengali.org" style="color:#006A4E;font-weight:600;">www.jaxbengali.org</a></td>
          </tr>
          <tr>
            <td style="padding:6px 0;font-size:14px;color:#555;">&#x1F464; Member Login</td>
            <td><a href="${MEMBER_LOGIN_URL}" style="color:#006A4E;font-weight:600;">member-login.html</a></td>
          </tr>
          <tr>
            <td style="padding:6px 0;font-size:14px;color:#555;">&#x1F6E1; EC Admin Portal</td>
            <td><a href="${EC_ADMIN_URL}" style="color:#DC143C;font-weight:600;">admin-portal.html</a></td>
          </tr>
          <tr>
            <td style="padding:6px 0;font-size:14px;color:#555;">&#x1F4CA; Requirements</td>
            <td><a href="${JOURNEY_URL}" style="color:#006A4E;font-weight:600;">Stakeholder Journey</a></td>
          </tr>
        </table>
      </div>

      <div style="background:#fff8f0;border-left:4px solid #FF6B35;padding:16px 20px;border-radius:6px;margin:24px 0;">
        <h3 style="margin:0 0 12px;color:#FF6B35;font-size:16px;">&#x2705; Testing Checklist</h3>
        <p style="margin:0 0 8px;font-size:13px;color:#666;">Please verify the following on the production site:</p>
        <ol style="margin:0;padding-left:20px;font-size:14px;color:#444;line-height:1.8;">
          <li>Sign in at <a href="${MEMBER_LOGIN_URL}" style="color:#006A4E;">member-login.html</a> with your email + password</li>
          <li>Verify your role is displayed correctly in the member portal</li>
          <li>Check that your name appears in <strong>My Profile</strong></li>
          <li>Navigate to <strong>Family Members</strong> — add/edit/remove a test member</li>
          <li>Open the <a href="${EC_ADMIN_URL}" style="color:#DC143C;">EC Admin Portal</a> and verify access to EC features</li>
          <li>Check EC onboarding progress shows your status as complete</li>
          <li>Test the <a href="${JOURNEY_URL}" style="color:#006A4E;">Stakeholder Requirements Journey</a></li>
          <li>Try the BANF chatbot widget — ask about membership fees and upcoming events</li>
        </ol>
      </div>

      <div style="background:#f5f5f5;border-radius:8px;padding:16px 20px;margin:24px 0;">
        <h3 style="margin:0 0 8px;color:#333;font-size:15px;">&#x1F4CB; Your Role &amp; Responsibilities</h3>
        <p style="margin:0;font-size:14px;color:#555;">As <strong>${roleTitle}</strong>, you have access to role-specific features in both the member portal and EC admin portal. If anything doesn't look right or you can't access a feature you should have, please reply to this email or contact <a href="mailto:banfjax@gmail.com" style="color:#006A4E;">banfjax@gmail.com</a>.</p>
      </div>

      <p style="font-size:14px;color:#888;margin-top:24px;">The FY2026-28 membership drive will begin once all EC members are onboarded. Thank you for your prompt action!</p>
      <p style="font-size:15px;color:#333;margin-top:16px;">Best regards,<br><strong style="color:#006A4E;">BANF Super Admin</strong></p>
    </div>
    <div style="background:#333;color:#888;padding:14px;text-align:center;font-size:12px;">
      Bengali Association of North Florida &bull; <a href="https://www.jaxbengali.org" style="color:#aaa;">jaxbengali.org</a> &bull; banfjax@gmail.com
    </div>
  </div>
</body>
</html>`;
}

export async function post_ec_signup_congratulations(request) {
    try {
        const body = await parseBody(request);
        const { email, firstName, lastName, role } = body;
        if (!email) return jsonErr('email required', 400);

        // Find the EC member record  
        const res = await wixData.query('AdminRoles')
            .eq('email', email.toLowerCase().trim())
            .limit(1)
            .find(SA)
            .catch(() => ({ items: [] }));

        const member = res.items[0] || { email, firstName, lastName };
        const roleTitle = role || member.ecTitle || member.role || 'EC Member';

        // Send congratulations to the member
        const html = buildCongratsEmail({ ...member, firstName: firstName || member.firstName, lastName: lastName || member.lastName }, roleTitle);
        const name = [firstName || member.firstName, lastName || member.lastName].filter(Boolean).join(' ') || email;

        await sendGmail(email, name, `Welcome to BANF EC, ${firstName || name}! Your signup is complete 🎉`, html);

        // Also notify the President
        const presHtml = `<div style="font-family:Arial,sans-serif;padding:24px;">
            <h2 style="color:#006A4E;">EC Member Signup Complete ✅</h2>
            <p><strong>${name}</strong> (${roleTitle}) has completed their EC signup for FY2026-28.</p>
            <p>Email: ${email}</p>
            <p>Time: ${new Date().toLocaleString('en-US', { timeZone: 'America/New_York' })} ET</p>
            <p>Check EC progress: <a href="${ONBOARD_URL}">Admin Portal</a></p>
        </div>`;
        await sendGmail(PRESIDENT_EMAIL, 'Dr. Ranadhir Ghosh', `EC Signup Alert: ${name} just signed up`, presHtml).catch(() => {});

        // Mark congratulations sent in AdminRoles
        if (res.items[0]) {
            await wixData.update('AdminRoles', { ...res.items[0], congratsSent: true, congratsSentAt: new Date() }, SA).catch(() => {});
        }

        return jsonOk({ message: `Congratulations email sent to ${email}`, name, role: roleTitle });
    } catch (e) {
        return jsonErr('Congratulations send failed: ' + e.message, 500);
    }
}
export function options_ec_signup_congratulations(request) { return handleCors(); }

// ╔══════════════════════════════════════════════════════════════╗
// ║  POST /ec_send_all_invitations                               ║
// ║  Send signup invitation to all pending EC members directly   ║
// ║  (bypasses TEST_MODE — always sends to actual members)       ║
// ╚══════════════════════════════════════════════════════════════╝

function buildInviteEmail(member) {
    const name = [member.firstName, member.lastName].filter(Boolean).join(' ') || 'EC Member';
    const role = member.ecTitle || member.role || 'EC Member';
    const loginUrl = 'https://www.jaxbengali.org/admin-portal.html';
    return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><title>BANF EC Signup Invitation</title></head>
<body style="margin:0;padding:0;background:#f5f7fa;font-family:'Poppins',Arial,sans-serif;">
  <div style="max-width:620px;margin:30px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.10);">
    <div style="background:linear-gradient(135deg,#8B0000,#DC143C);padding:32px 40px;text-align:center;">
      <h1 style="color:#fff;margin:0;font-size:24px;font-weight:700;">BANF EC Onboarding Invitation</h1>
      <p style="color:rgba(255,255,255,0.9);margin:8px 0 0;font-size:15px;">FY 2026-2028 &bull; Executive Committee</p>
    </div>
    <div style="padding:32px 40px;">
      <p style="font-size:16px;color:#333;">Dear <strong>${name}</strong>,</p>
      <p style="font-size:15px;color:#444;line-height:1.7;">You have been selected as <strong>${role}</strong> of the Bengali Association of North Florida (BANF) for the fiscal year 2026-2028. Please complete your EC onboarding to activate your access to the member and admin portals.</p>

      <div style="text-align:center;margin:30px 0;">
        <a href="${loginUrl}" style="display:inline-block;background:linear-gradient(135deg,#8B0000,#DC143C);color:#fff;padding:15px 36px;text-decoration:none;border-radius:8px;font-weight:bold;font-size:16px;">Complete EC Signup →</a>
      </div>

      <div style="background:#f9f9f9;border-radius:8px;padding:16px 20px;margin:20px 0;">
        <h3 style="margin:0 0 10px;font-size:15px;color:#333;">What you'll need to do:</h3>
        <ol style="margin:0;padding-left:20px;font-size:14px;color:#555;line-height:1.8;">
          <li>Click the button above to open the EC Admin Portal</li>
          <li>Click <strong>"Sign Up"</strong> and enter your email: <strong>${member.email || 'your email'}</strong></li>
          <li>Set your password and choose a security question</li>
          <li>Your account will be created instantly — no verification code needed!</li>
          <li>Test the member portal at <a href="${MEMBER_LOGIN_URL}" style="color:#8B0000;">member-login.html</a></li>
          <li>You'll receive a congratulation email once signup is complete</li>
        </ol>
      </div>

      <p style="font-size:14px;color:#666;">The FY2026-28 membership drive will launch once all 8 EC members complete onboarding. Please act promptly!</p>
      <p style="font-size:15px;">Best regards,<br><strong style="color:#8B0000;">BANF Super Admin</strong></p>
    </div>
    <div style="background:#333;color:#888;padding:14px;text-align:center;font-size:12px;">
      Bengali Association of North Florida &bull; <a href="https://www.jaxbengali.org" style="color:#aaa;">jaxbengali.org</a> &bull; banfjax@gmail.com
    </div>
  </div>
</body>
</html>`;
}

export async function post_ec_send_all_invitations(request) {
    try {
        const perm = await checkPermission(request, 'admin:manage_roles');
        if (!perm.allowed) return jsonErr('Forbidden — super_admin only', 403);

        const ecRes = await wixData.query('AdminRoles')
            .eq('isActive', true)
            .find(SA);

        const pending = ecRes.items.filter(m =>
            m.role !== 'super_admin' &&
            (!m.passwordSet || !m.onboardingComplete) &&
            !m.congratsSent
        );

        if (pending.length === 0) {
            return jsonOk({ message: 'All EC members are already onboarded or invited!', sent: 0 });
        }

        const results = [];
        for (const member of pending) {
            const name = [member.firstName, member.lastName].filter(Boolean).join(' ') || member.email;
            try {
                const html = buildInviteEmail(member);
                // Always send to actual email (ignore TEST_MODE)
                const token = await getGmailToken();
                const subject = `BANF EC Onboarding Invitation — ${member.ecTitle || member.role || 'EC Member'} (FY2026-28)`;
                const raw = [
                    `From: ${BANF_ORG} <${BANF_EMAIL}>`,
                    `To: ${name} <${member.email}>`,
                    `Subject: ${subject}`,
                    'MIME-Version: 1.0',
                    'Content-Type: text/html; charset=UTF-8',
                    '',
                    html
                ].join('\r\n');
                const encoded = btoa(unescape(encodeURIComponent(raw))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
                await wixFetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                    body: JSON.stringify({ raw: encoded })
                });
                await wixData.update('AdminRoles', { ...member, invitationSent: true, invitationSentAt: new Date() }, SA);
                results.push({ email: member.email, name, status: 'sent' });
            } catch (err) {
                results.push({ email: member.email, name, status: 'failed', error: err.message });
            }
        }

        const sent = results.filter(r => r.status === 'sent').length;
        const failed = results.filter(r => r.status === 'failed').length;

        return jsonOk({ message: `Sent ${sent} invitation(s)${failed > 0 ? `, ${failed} failed` : ''}`, sent, failed, results });
    } catch (e) {
        return jsonErr('Send invitations failed: ' + e.message, 500);
    }
}
export function options_ec_send_all_invitations(request) { return handleCors(); }
