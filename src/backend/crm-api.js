/**
 * ═══════════════════════════════════════════════════════════════
 *  CRM API — HTTP function endpoints for the CRM system
 *  All admin-facing endpoints require admin:manage_crm permission
 *  Member-facing endpoints require member:view_own
 * ═══════════════════════════════════════════════════════════════
 */

import { ok, badRequest, serverError, forbidden } from 'wix-http-functions';
import wixData from 'wix-data';
import { checkPermission } from 'backend/rbac';
import {
    createFamily, addMinorToFamily, removeAdultFromFamily, addAdultToFamily,
    updateMemberInfo, seedFromFamilyMapping, seedFromGoogleContacts,
    linkEmailsToMembers, addOrgRole, addAward, addVolunteerRecord,
    getFamilyDetails, getMemberFullProfile, getCRMDashboard
} from 'backend/crm-agent';

const SA = { suppressAuth: true };

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
    return ok({ body: '', headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type,x-user-email'
    }});
}

// ─────────────────────────────────────────
// CRM DASHBOARD
// ─────────────────────────────────────────

export async function get_crm_dashboard(request) {
    const perm = await checkPermission(request, 'admin:view');
    if (!perm.allowed) return jsonErr('Forbidden', 403);
    try {
        const stats = await getCRMDashboard();
        return jsonOk({ stats });
    } catch (e) { return jsonErr('CRM dashboard error: ' + e.message, 500); }
}
export function options_crm_dashboard(request) { return handleCors(); }

// ─────────────────────────────────────────
// FAMILY GROUPS
// ─────────────────────────────────────────

export async function get_crm_families(request) {
    const perm = await checkPermission(request, 'admin:view');
    if (!perm.allowed) return jsonErr('Forbidden', 403);
    try {
        const params = request.query || {};
        const page = parseInt(params.page) || 1;
        const limit = parseInt(params.limit) || 50;
        const search = params.search || '';
        const status = params.status || ''; // 'active'|'inactive'|''
        const skip = (page - 1) * limit;

        let q = wixData.query('FamilyGroups');
        if (status === 'active') q = q.eq('isActive', true);
        else if (status === 'inactive') q = q.eq('isActive', false);
        if (search) q = q.contains('displayName', search);
        q = q.descending('_createdDate').skip(skip).limit(limit);
        const res = await q.find(SA);
        const total = await wixData.query('FamilyGroups').count(SA);
        return jsonOk({ families: res.items, total, page, pages: Math.ceil(total / limit) });
    } catch (e) { return jsonErr('Get families error: ' + e.message, 500); }
}
export function options_crm_families(request) { return handleCors(); }

export async function get_crm_family(request) {
    const perm = await checkPermission(request, 'admin:view');
    if (!perm.allowed) return jsonErr('Forbidden', 403);
    try {
        const { familyId } = request.query || {};
        if (!familyId) return jsonErr('familyId required');
        const family = await getFamilyDetails(familyId);
        if (!family) return jsonErr('Family not found', 404);
        return jsonOk({ family });
    } catch (e) { return jsonErr('Get family error: ' + e.message, 500); }
}
export function options_crm_family(request) { return handleCors(); }

export async function post_crm_family_create(request) {
    const perm = await checkPermission(request, 'admin:manage_members');
    if (!perm.allowed) return jsonErr('Forbidden', 403);
    try {
        const body = await parseBody(request);
        const result = await createFamily({ ...body, createdBy: perm.email });
        return jsonOk({ result });
    } catch (e) { return jsonErr('Create family error: ' + e.message, 500); }
}
export function options_crm_family_create(request) { return handleCors(); }

export async function post_crm_family_update(request) {
    const perm = await checkPermission(request, 'admin:manage_members');
    if (!perm.allowed) return jsonErr('Forbidden', 403);
    try {
        const body = await parseBody(request);
        const { familyId, ...updates } = body;
        if (!familyId) return jsonErr('familyId required');
        const res = await wixData.query('FamilyGroups').eq('familyId', familyId).find(SA);
        if (!res.items.length) return jsonErr('Family not found', 404);
        const allowedFields = ['displayName','primarySurname','membershipType','membershipYear','membershipStatus','familyType','notes'];
        const record = { ...res.items[0] };
        for (const f of allowedFields) {
            if (updates[f] !== undefined) record[f] = updates[f];
        }
        await wixData.update('FamilyGroups', record, SA);
        return jsonOk({ familyId, updated: true });
    } catch (e) { return jsonErr('Update family error: ' + e.message, 500); }
}
export function options_crm_family_update(request) { return handleCors(); }

export async function get_crm_family_history(request) {
    const perm = await checkPermission(request, 'admin:view');
    if (!perm.allowed) return jsonErr('Forbidden', 403);
    try {
        const { familyId } = request.query || {};
        if (!familyId) return jsonErr('familyId required');
        const hist = await wixData.query('FamilyHistory')
            .eq('familyId', familyId).descending('changedAt').limit(100).find(SA);
        // Also get events where oldFamilyId = familyId
        const hist2 = await wixData.query('FamilyHistory')
            .eq('oldFamilyId', familyId).descending('changedAt').limit(100).find(SA);
        const all = [...hist.items, ...hist2.items].sort((a, b) =>
            new Date(b.changedAt) - new Date(a.changedAt));
        return jsonOk({ familyId, history: all });
    } catch (e) { return jsonErr('Family history error: ' + e.message, 500); }
}
export function options_crm_family_history(request) { return handleCors(); }

// ─────────────────────────────────────────
// ADULT / MINOR MANAGEMENT
// ─────────────────────────────────────────

export async function post_crm_adult_add(request) {
    const perm = await checkPermission(request, 'admin:manage_members');
    if (!perm.allowed) return jsonErr('Forbidden', 403);
    try {
        const body = await parseBody(request);
        const { familyId, adult } = body;
        if (!familyId || !adult) return jsonErr('familyId and adult required');
        const result = await addAdultToFamily(familyId, adult, perm.email);
        return jsonOk({ result });
    } catch (e) { return jsonErr('Add adult error: ' + e.message, 500); }
}
export function options_crm_adult_add(request) { return handleCors(); }

export async function post_crm_adult_remove(request) {
    const perm = await checkPermission(request, 'admin:manage_members');
    if (!perm.allowed) return jsonErr('Forbidden', 403);
    try {
        const body = await parseBody(request);
        const { familyId, memberId, reason } = body;
        if (!familyId || !memberId) return jsonErr('familyId and memberId required');
        const result = await removeAdultFromFamily(familyId, memberId, reason || 'Left family', perm.email);
        return jsonOk({ result });
    } catch (e) { return jsonErr('Remove adult error: ' + e.message, 500); }
}
export function options_crm_adult_remove(request) { return handleCors(); }

export async function post_crm_minor_add(request) {
    const perm = await checkPermission(request, 'admin:manage_members');
    if (!perm.allowed) return jsonErr('Forbidden', 403);
    try {
        const body = await parseBody(request);
        const { familyId, minor } = body;
        if (!familyId || !minor) return jsonErr('familyId and minor required');
        const result = await addMinorToFamily(familyId, minor, perm.email);
        return jsonOk({ result });
    } catch (e) { return jsonErr('Add minor error: ' + e.message, 500); }
}
export function options_crm_minor_add(request) { return handleCors(); }

export async function post_crm_minor_remove(request) {
    const perm = await checkPermission(request, 'admin:manage_members');
    if (!perm.allowed) return jsonErr('Forbidden', 403);
    try {
        const body = await parseBody(request);
        const { familyId, memberId } = body;
        if (!familyId || !memberId) return jsonErr('familyId and memberId required');

        const famRes = await wixData.query('FamilyGroups').eq('familyId', familyId).find(SA);
        if (!famRes.items.length) return jsonErr('Family not found', 404);
        const family = famRes.items[0];
        const minors = JSON.parse(family.minorMemberIds || '[]').filter(id => id !== memberId);

        const mRes = await wixData.query('CRMMembers').eq('memberId', memberId).find(SA);
        if (mRes.items.length) {
            await wixData.update('CRMMembers', { ...mRes.items[0], isActive: false, familyId: '' }, SA);
        }
        await wixData.update('FamilyGroups', {
            ...family,
            minorMemberIds: JSON.stringify(minors),
            totalMembers: Math.max(0, (family.totalMembers || 1) - 1)
        }, SA);

        return jsonOk({ memberId, familyId, removed: true });
    } catch (e) { return jsonErr('Remove minor error: ' + e.message, 500); }
}
export function options_crm_minor_remove(request) { return handleCors(); }

// ─────────────────────────────────────────
// MEMBER PROFILE
// ─────────────────────────────────────────

export async function get_crm_member(request) {
    const perm = await checkPermission(request, 'admin:view');
    if (!perm.allowed) return jsonErr('Forbidden', 403);
    try {
        const { memberId } = request.query || {};
        if (!memberId) return jsonErr('memberId required');
        const profile = await getMemberFullProfile(memberId);
        if (!profile) return jsonErr('Member not found', 404);
        return jsonOk({ member: profile });
    } catch (e) { return jsonErr('Get member error: ' + e.message, 500); }
}
export function options_crm_member(request) { return handleCors(); }

export async function get_crm_member_search(request) {
    const perm = await checkPermission(request, 'admin:view');
    if (!perm.allowed) return jsonErr('Forbidden', 403);
    try {
        const params = request.query || {};
        const q = params.q || '';
        const limit = parseInt(params.limit) || 20;
        if (!q) return jsonErr('q (search query) required');

        const [byName, byEmail] = await Promise.all([
            wixData.query('CRMMembers').contains('displayName', q).limit(limit).find(SA),
            wixData.query('CRMMembers').contains('email', q).limit(limit).find(SA)
        ]);
        const seen = new Set();
        const results = [];
        for (const m of [...byName.items, ...byEmail.items]) {
            if (!seen.has(m._id)) { seen.add(m._id); results.push(m); }
        }
        return jsonOk({ members: results.slice(0, limit) });
    } catch (e) { return jsonErr('Search error: ' + e.message, 500); }
}
export function options_crm_member_search(request) { return handleCors(); }

export async function post_crm_member_update(request) {
    const perm = await checkPermission(request, 'admin:manage_members');
    if (!perm.allowed) return jsonErr('Forbidden', 403);
    try {
        const body = await parseBody(request);
        const { memberId, ...updateData } = body;
        if (!memberId) return jsonErr('memberId required');
        const result = await updateMemberInfo(memberId, updateData, perm.email);
        return jsonOk({ result });
    } catch (e) { return jsonErr('Update member error: ' + e.message, 500); }
}
export function options_crm_member_update(request) { return handleCors(); }

export async function get_crm_member_report(request) {
    const perm = await checkPermission(request, 'admin:view');
    if (!perm.allowed) return jsonErr('Forbidden', 403);
    try {
        const { memberId } = request.query || {};
        if (!memberId) return jsonErr('memberId required');
        const profile = await getMemberFullProfile(memberId);
        if (!profile) return jsonErr('Member not found', 404);

        // Format as comprehensive report
        const report = {
            reportDate: new Date().toISOString(),
            member: {
                name: profile.displayName,
                memberId: profile.memberId,
                familyId: profile.familyId,
                email: profile.email,
                phone: profile.phone,
                memberSince: profile.memberSince,
                isLifeMember: profile.isLifeMember,
                isActive: profile.isActive
            },
            professional: {
                profession: profile.profession,
                employer: profile.employer,
                education: profile.education,
                skills: profile.skills
            },
            personal: {
                gender: profile.gender,
                dateOfBirth: profile.dateOfBirth,
                city: profile.city,
                state: profile.state
            },
            orgInvolvement: {
                isECMember: profile.isECMember,
                isBOTMember: profile.isBOTMember,
                roles: profile.orgRoles,
                totalRoles: profile.orgRoles.length
            },
            recognition: {
                awards: profile.awards,
                totalAwards: profile.awards.length
            },
            volunteer: {
                records: profile.volunteerHistory,
                totalHours: profile.volunteerHistory.reduce((s, v) => s + (v.hoursServed || 0), 0)
            },
            communications: {
                recentCount: profile.recentCommunications.length,
                recent: profile.recentCommunications.slice(0, 5)
            },
            payments: {
                count: profile.payments.length,
                records: profile.payments.slice(0, 10)
            }
        };

        return jsonOk({ report });
    } catch (e) { return jsonErr('Member report error: ' + e.message, 500); }
}
export function options_crm_member_report(request) { return handleCors(); }

export async function get_crm_members(request) {
    const perm = await checkPermission(request, 'admin:view');
    if (!perm.allowed) return jsonErr('Forbidden', 403);
    try {
        const params = request.query || {};
        const page = parseInt(params.page) || 1;
        const limit = parseInt(params.limit) || 50;
        const skip = (page - 1) * limit;
        const isActive = params.active !== 'false';

        let q = wixData.query('CRMMembers').eq('isActive', isActive);
        if (params.familyId) q = q.eq('familyId', params.familyId);
        if (params.memberType) q = q.eq('memberType', params.memberType);
        q = q.descending('_createdDate').skip(skip).limit(limit);
        const res = await q.find(SA);
        const total = await wixData.query('CRMMembers').eq('isActive', isActive).count(SA);
        return jsonOk({ members: res.items, total, page, pages: Math.ceil(total / limit) });
    } catch (e) { return jsonErr('Get members error: ' + e.message, 500); }
}
export function options_crm_members(request) { return handleCors(); }

// ─────────────────────────────────────────
// ORG ROLES / AWARDS / VOLUNTEER
// ─────────────────────────────────────────

export async function post_crm_org_role_add(request) {
    const perm = await checkPermission(request, 'admin:manage_members');
    if (!perm.allowed) return jsonErr('Forbidden', 403);
    try {
        const body = await parseBody(request);
        const result = await addOrgRole(body);
        return jsonOk({ result });
    } catch (e) { return jsonErr('Add org role error: ' + e.message, 500); }
}
export function options_crm_org_role_add(request) { return handleCors(); }

export async function get_crm_org_roles(request) {
    const perm = await checkPermission(request, 'admin:view');
    if (!perm.allowed) return jsonErr('Forbidden', 403);
    try {
        const params = request.query || {};
        let q = wixData.query('MemberOrgRoles');
        if (params.memberId) q = q.eq('memberId', params.memberId);
        if (params.term) q = q.eq('term', params.term);
        if (params.roleType) q = q.eq('roleType', params.roleType);
        if (params.currentOnly === 'true') q = q.eq('isCurrentRole', true);
        const res = await q.limit(200).find(SA);
        return jsonOk({ roles: res.items });
    } catch (e) { return jsonErr('Get org roles error: ' + e.message, 500); }
}
export function options_crm_org_roles(request) { return handleCors(); }

export async function post_crm_award_add(request) {
    const perm = await checkPermission(request, 'admin:manage_members');
    if (!perm.allowed) return jsonErr('Forbidden', 403);
    try {
        const body = await parseBody(request);
        const result = await addAward(body);
        return jsonOk({ result });
    } catch (e) { return jsonErr('Add award error: ' + e.message, 500); }
}
export function options_crm_award_add(request) { return handleCors(); }

export async function get_crm_awards(request) {
    const perm = await checkPermission(request, 'admin:view');
    if (!perm.allowed) return jsonErr('Forbidden', 403);
    try {
        const params = request.query || {};
        let q = wixData.query('MemberAwards');
        if (params.memberId) q = q.eq('memberId', params.memberId);
        if (params.year) q = q.eq('year', params.year);
        const res = await q.descending('year').limit(200).find(SA);
        return jsonOk({ awards: res.items });
    } catch (e) { return jsonErr('Get awards error: ' + e.message, 500); }
}
export function options_crm_awards(request) { return handleCors(); }

export async function post_crm_volunteer_add(request) {
    const perm = await checkPermission(request, 'admin:manage_members');
    if (!perm.allowed) return jsonErr('Forbidden', 403);
    try {
        const body = await parseBody(request);
        const result = await addVolunteerRecord(body);
        return jsonOk({ result });
    } catch (e) { return jsonErr('Add volunteer error: ' + e.message, 500); }
}
export function options_crm_volunteer_add(request) { return handleCors(); }

export async function get_crm_volunteer(request) {
    const perm = await checkPermission(request, 'admin:view');
    if (!perm.allowed) return jsonErr('Forbidden', 403);
    try {
        const params = request.query || {};
        let q = wixData.query('MemberVolunteer');
        if (params.memberId) q = q.eq('memberId', params.memberId);
        if (params.eventId) q = q.eq('eventId', params.eventId);
        const res = await q.descending('date').limit(200).find(SA);
        return jsonOk({ volunteer: res.items });
    } catch (e) { return jsonErr('Get volunteer error: ' + e.message, 500); }
}
export function options_crm_volunteer(request) { return handleCors(); }

// ─────────────────────────────────────────
// COMMUNICATIONS
// ─────────────────────────────────────────

export async function get_crm_member_comms(request) {
    const perm = await checkPermission(request, 'admin:view');
    if (!perm.allowed) return jsonErr('Forbidden', 403);
    try {
        const params = request.query || {};
        const { memberId } = params;
        if (!memberId) return jsonErr('memberId required');
        const page = parseInt(params.page) || 1;
        const limit = parseInt(params.limit) || 50;
        const skip = (page - 1) * limit;
        const res = await wixData.query('MemberCommunications')
            .eq('memberId', memberId).descending('date').skip(skip).limit(limit).find(SA);
        const total = await wixData.query('MemberCommunications').eq('memberId', memberId).count(SA);
        return jsonOk({ communications: res.items, total, page });
    } catch (e) { return jsonErr('Get comms error: ' + e.message, 500); }
}
export function options_crm_member_comms(request) { return handleCors(); }

export async function get_crm_member_payments(request) {
    const perm = await checkPermission(request, 'admin:view');
    if (!perm.allowed) return jsonErr('Forbidden', 403);
    try {
        const { memberId } = request.query || {};
        if (!memberId) return jsonErr('memberId required');
        const mRes = await wixData.query('CRMMembers').eq('memberId', memberId).find(SA);
        if (!mRes.items.length) return jsonErr('Member not found', 404);
        const member = mRes.items[0];
        // Look up payments by email
        const payments = await wixData.query('Payments')
            .eq('email', member.email).descending('_createdDate').limit(100).find(SA);
        return jsonOk({ memberId, email: member.email, payments: payments.items });
    } catch (e) { return jsonErr('Get member payments error: ' + e.message, 500); }
}
export function options_crm_member_payments(request) { return handleCors(); }

// ─────────────────────────────────────────
// CRM SEED
// ─────────────────────────────────────────

export async function post_crm_seed(request) {
    const perm = await checkPermission(request, 'admin:manage_members');
    if (!perm.allowed) return jsonErr('Forbidden', 403);
    try {
        const body = await parseBody(request);
        const { source = 'all', familyMapping, googleContacts } = body;

        const results = {};

        if ((source === 'all' || source === 'family_mapping') && familyMapping) {
            results.familyMapping = await seedFromFamilyMapping(familyMapping, perm.email);
        }

        if ((source === 'all' || source === 'google_contacts') && googleContacts) {
            results.googleContacts = await seedFromGoogleContacts(googleContacts, perm.email);
        }

        if (source === 'all' || source === 'link_emails') {
            results.emailLinks = await linkEmailsToMembers();
        }

        return jsonOk({ results });
    } catch (e) { return jsonErr('CRM seed error: ' + e.message, 500); }
}
export function options_crm_seed(request) { return handleCors(); }

// ─────────────────────────────────────────
// LINK EMAILS (standalone trigger)
// ─────────────────────────────────────────

export async function post_crm_link_emails(request) {
    const perm = await checkPermission(request, 'admin:manage_members');
    if (!perm.allowed) return jsonErr('Forbidden', 403);
    try {
        const result = await linkEmailsToMembers();
        return jsonOk({ result });
    } catch (e) { return jsonErr('Link emails error: ' + e.message, 500); }
}
export function options_crm_link_emails(request) { return handleCors(); }

// GET variant: trigger email linking via GET
export async function get_crm_link_emails(request) {
    const perm = await checkPermission(request, 'admin:manage_members');
    if (!perm.allowed) return jsonErr('Forbidden', 403);
    try {
        const result = await linkEmailsToMembers();
        return jsonOk({ result });
    } catch (e) { return jsonErr('Link emails error: ' + e.message, 500); }
}
