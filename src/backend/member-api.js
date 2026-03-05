/**
 * ═══════════════════════════════════════════════════════════════
 *  MEMBER API — Member portal + LLM chatbot endpoints
 *  All data is RBAC-filtered: members see only their own records
 * ═══════════════════════════════════════════════════════════════
 */

import { ok, badRequest, serverError, forbidden } from 'wix-http-functions';
import wixData from 'wix-data';
import { checkPermission, applyDataFilters } from 'backend/rbac';
import { orchestrateConversation, orchestrate } from 'backend/agent-orchestrator';

const SA = { suppressAuth: true };

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
    return ok({ body: '', headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type,Authorization,x-user-email' } });
}

// ─────────────────────────────────────────
// MEMBER PROFILE
// ─────────────────────────────────────────

export async function get_member_profile(request) {
    const perm = await checkPermission(request, 'member:view_own');
    if (!perm.allowed) return jsonErr('Forbidden', 403);
    try {
        const result = await wixData.query('Members').eq('email', perm.email).find(SA);
        if (!result.items.length) return jsonErr('Member not found');
        const member = result.items[0];
        // Redact sensitive fields for non-admin
        if (perm.role === 'member' || perm.role === 'guest') {
            delete member.internalNotes;
            delete member.adminFlags;
        }
        return jsonOk({ profile: member });
    } catch (e) { return jsonErr(e.message, 500); }
}
export function options_member_profile(request) { return handleCors(); }

export async function post_member_profile_update(request) {
    const perm = await checkPermission(request, 'member:update_own');
    if (!perm.allowed) return jsonErr('Forbidden', 403);
    try {
        const body = await parseBody(request);
        const result = await wixData.query('Members').eq('email', perm.email).find(SA);
        if (!result.items.length) return jsonErr('Member not found');
        const existing = result.items[0];
        // Members cannot update protected fields
        const PROTECTED = ['_id', 'email', 'role', 'isActive', 'internalNotes', 'adminFlags', 'membershipStatus'];
        PROTECTED.forEach(f => delete body[f]);
        const updated = await wixData.update('Members', { ...existing, ...body, lastUpdatedAt: new Date() }, SA);
        return jsonOk({ profile: updated });
    } catch (e) { return jsonErr(e.message, 500); }
}
export function options_member_profile_update(request) { return handleCors(); }

// ─────────────────────────────────────────
// MEMBER PAYMENTS
// ─────────────────────────────────────────

export async function get_member_payments(request) {
    const perm = await checkPermission(request, 'member:view_own');
    if (!perm.allowed) return jsonErr('Forbidden', 403);
    try {
        const params = request.query || {};
        const limit = parseInt(params.limit) || 20;
        const result = await wixData.query('Payments').eq('email', perm.email).descending('_createdDate').limit(limit).find(SA);
        const total = result.items.reduce((sum, p) => sum + (p.amount || 0), 0);
        // Admins can see all, members see only own
        let items = applyDataFilters(result.items, perm.email, perm.role, 'email');
        return jsonOk({ payments: items, totalPaid: total, count: items.length });
    } catch (e) { return jsonErr(e.message, 500); }
}
export function options_member_payments(request) { return handleCors(); }

// ─────────────────────────────────────────
// MEMBER EVENTS & RSVP
// ─────────────────────────────────────────

export async function get_member_events(request) {
    const perm = await checkPermission(request, 'member:view_events');
    if (!perm.allowed) return jsonErr('Forbidden', 403);
    try {
        const upcoming = await wixData.query('Events').ge('eventDate', new Date()).ascending('eventDate').limit(20).find(SA).catch(() => ({ items: [] }));
        // RSVPs for this member
        const rsvps = await wixData.query('EventRSVPs').eq('email', perm.email).find(SA).catch(() => ({ items: [] }));
        const myRsvpEventIds = new Set(rsvps.items.map(r => r.eventId));
        const eventsWithRsvp = upcoming.items.map(e => ({ ...e, hasRsvp: myRsvpEventIds.has(e._id) }));
        return jsonOk({ events: eventsWithRsvp, myRsvps: rsvps.items });
    } catch (e) { return jsonErr(e.message, 500); }
}
export function options_member_events(request) { return handleCors(); }

export async function post_member_rsvp(request) {
    const perm = await checkPermission(request, 'member:rsvp');
    if (!perm.allowed) return jsonErr('Forbidden', 403);
    try {
        const body = await parseBody(request);
        if (!body.eventId) return jsonErr('Missing eventId');
        // Check if already RSVP'd
        const existing = await wixData.query('EventRSVPs').eq('eventId', body.eventId).eq('email', perm.email).find(SA);
        if (existing.items.length > 0) return jsonOk({ message: 'Already RSVP\'d', rsvp: existing.items[0] });
        const rsvp = await wixData.insert('EventRSVPs', { eventId: body.eventId, email: perm.email, guestCount: body.guestCount || 1, notes: body.notes || '', rsvpAt: new Date() }, SA);
        return jsonOk({ rsvp, message: 'RSVP confirmed' });
    } catch (e) { return jsonErr(e.message, 500); }
}
export function options_member_rsvp(request) { return handleCors(); }

// ─────────────────────────────────────────
// MEMBER COMPLAINTS
// ─────────────────────────────────────────

export async function get_member_complaints(request) {
    const perm = await checkPermission(request, 'member:submit_complaint');
    if (!perm.allowed) return jsonErr('Forbidden', 403);
    try {
        const result = await wixData.query('Complaints').eq('submittedEmail', perm.email).descending('_createdDate').find(SA);
        return jsonOk({ complaints: result.items });
    } catch (e) { return jsonErr(e.message, 500); }
}
export function options_member_complaints(request) { return handleCors(); }

export async function post_member_complaint_submit(request) {
    const perm = await checkPermission(request, 'member:submit_complaint');
    if (!perm.allowed) return jsonErr('Forbidden', 403);
    try {
        const body = await parseBody(request);
        if (!body.subject || !body.description) return jsonErr('Missing subject or description');
        const complaint = await wixData.insert('Complaints', {
            subject: body.subject,
            description: body.description,
            category: body.category || 'general',
            submittedEmail: perm.email,
            status: 'open',
            priority: body.priority || 'normal',
            submittedAt: new Date()
        }, SA);
        return jsonOk({ complaint, message: 'Complaint submitted successfully' });
    } catch (e) { return jsonErr(e.message, 500); }
}
export function options_member_complaint_submit(request) { return handleCors(); }

// ─────────────────────────────────────────
// MEMBER SURVEYS
// ─────────────────────────────────────────

export async function get_member_surveys(request) {
    const perm = await checkPermission(request, 'member:view_events');
    if (!perm.allowed) return jsonErr('Forbidden', 403);
    try {
        const active = await wixData.query('Surveys').eq('isActive', true).find(SA).catch(() => ({ items: [] }));
        const myResponses = await wixData.query('SurveyResponses').eq('respondentEmail', perm.email).find(SA).catch(() => ({ items: [] }));
        const completedIds = new Set(myResponses.items.map(r => r.surveyId));
        return jsonOk({ surveys: active.items.map(s => ({ ...s, completed: completedIds.has(s._id) })), myResponses: myResponses.items });
    } catch (e) { return jsonErr(e.message, 500); }
}
export function options_member_surveys(request) { return handleCors(); }

// ─────────────────────────────────────────
// LLM CHATBOT
// ─────────────────────────────────────────

export async function post_member_chat(request) {
    const perm = await checkPermission(request, 'member:chat');
    if (!perm.allowed) return jsonErr('Forbidden', 403);
    try {
        const body = await parseBody(request);
        if (!body.message && !body.messages) return jsonErr('Missing message or messages');

        // Single-turn mode: { message, agentType }
        if (body.message && !body.messages) {
            const result = await orchestrate(body.message, {
                userId: perm.email,
                agentType: body.agentType,
                contextEmail: perm.email
            });
            return jsonOk({
                reply: result.response,
                agentName: result.agentName,
                intent: result.intent,
                ragSources: result.ragSources || []
            });
        }

        // Multi-turn mode: { messages: [{role, content}], agentType }
        const result = await orchestrateConversation(body.messages, {
            userId: perm.email,
            agentType: body.agentType,
            contextEmail: perm.email
        });
        return jsonOk({
            reply: result.response,
            agentName: result.agentName,
            intent: result.intent,
            ragSources: result.ragSources || []
        });
    } catch (e) { return jsonErr(e.message, 500); }
}
export function options_member_chat(request) { return handleCors(); }

// Chat with context-aware suggestions about payment, events, etc.
export async function post_member_chat_context(request) {
    const perm = await checkPermission(request, 'member:chat');
    if (!perm.allowed) return jsonErr('Forbidden', 403);
    try {
        const body = await parseBody(request);
        if (!body.message) return jsonErr('Missing message');

        // Load member's own context to inject into chat
        const [profileRes, paymentsRes, rsvpsRes] = await Promise.all([
            wixData.query('Members').eq('email', perm.email).find(SA).catch(() => ({ items: [] })),
            wixData.query('Payments').eq('email', perm.email).descending('_createdDate').limit(5).find(SA).catch(() => ({ items: [] })),
            wixData.query('EventRSVPs').eq('email', perm.email).limit(5).find(SA).catch(() => ({ items: [] }))
        ]);

        const profile = profileRes.items[0] || {};
        const payments = paymentsRes.items;
        const rsvps = rsvpsRes.items;

        const memberContext = [
            `Member: ${profile.firstName || ''} ${profile.lastName || ''} (${perm.email})`,
            `Membership: ${profile.membershipType || 'standard'}, Status: ${profile.membershipStatus || 'active'}`,
            payments.length ? `Recent payments: ${payments.map(p => `${p.purpose} $${p.amount}`).join('; ')}` : '',
            rsvps.length ? `Recent RSVPs: ${rsvps.length} event(s)` : ''
        ].filter(Boolean).join('\n');

        const result = await orchestrate(body.message, {
            userId: perm.email,
            agentType: body.agentType,
            contextEmail: perm.email,
            extraContext: memberContext
        });

        return jsonOk({
            reply: result.response,
            agentName: result.agentName,
            intent: result.intent,
            ragSources: result.ragSources || []
        });
    } catch (e) { return jsonErr(e.message, 500); }
}
export function options_member_chat_context(request) { return handleCors(); }

// GET variant: returns member context data for AI chat (no message required)
export async function get_member_chat_context(request) {
    const perm = await checkPermission(request, 'member:chat');
    if (!perm.allowed) return jsonErr('Forbidden', 403);
    try {
        const email = perm.email || (request.query || {}).member_email;
        if (!email) return jsonErr('Missing member email');
        const [profileRes, paymentsRes] = await Promise.all([
            wixData.query('Members').eq('email', email).find(SA).catch(() => ({ items: [] })),
            wixData.query('Payments').eq('email', email).limit(10).find(SA).catch(() => ({ items: [] }))
        ]);
        const profile = profileRes.items[0] || null;
        const payments = paymentsRes.items || [];
        return jsonOk({ context: { email, profile, recentPayments: payments, contextType: 'member_chat_context' } });
    } catch (e) { return jsonErr(e.message, 500); }
}

// ─────────────────────────────────────────
// MEMBER DIRECTORY (limited view)
// ─────────────────────────────────────────

export async function get_member_directory(request) {
    const perm = await checkPermission(request, 'member:view_events');
    if (!perm.allowed) return jsonErr('Forbidden', 403);
    try {
        const result = await wixData.query('Members').eq('isActive', true).eq('showInDirectory', true).find(SA);
        // Members see limited public fields only
        const publicFields = result.items.map(m => ({
            _id: m._id,
            firstName: m.firstName,
            lastName: m.lastName,
            profession: m.profession,
            city: m.city,
            membershipType: m.membershipType
        }));
        return jsonOk({ members: publicFields, total: publicFields.length });
    } catch (e) { return jsonErr(e.message, 500); }
}
export function options_member_directory(request) { return handleCors(); }
// ─────────────────────────────────────────
// FAMILY MEMBERS CRUD
// Members can view/add/update/delete their own family records.
// Family member fields: firstName, lastName, relationship, dateOfBirth,
//   phone, email, dietaryPreference, specialDietary, medicalNotes
// Age is calculated at query-time from dateOfBirth vs today (March 4, 2026+).
// ─────────────────────────────────────────

function calcAge(dob) {
    if (!dob) return null;
    const birth = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    return age;
}

export async function get_member_family(request) {
    const perm = await checkPermission(request, 'member:view_own');
    if (!perm.allowed) return jsonErr('Forbidden', 403);
    try {
        // Admins can query by ?member_email=xxx; members only see own
        const targetEmail = (perm.role === 'admin' || perm.role === 'super-admin' || perm.role === 'ec-member')
            ? ((request.query || {}).member_email || perm.email)
            : perm.email;

        const memberRes = await wixData.query('Members').eq('email', targetEmail).find(SA);
        if (!memberRes.items.length) return jsonErr('Member not found');
        const memberId = memberRes.items[0]._id;
        // Get family members + calculate age
        const familyRes = await wixData.query('FamilyMembers')
            .eq('memberId', memberId)
            .eq('isActive', true)
            .ascending('relationship')
            .find(SA);
        const family = familyRes.items.map(f => ({
            ...f,
            ageAsOfToday: calcAge(f.dateOfBirth)
        }));
        return jsonOk({ family, memberEmail: targetEmail });
    } catch (e) { return jsonErr(e.message, 500); }
}
export function options_member_family(request) { return handleCors(); }

export async function post_add_family_member(request) {
    const perm = await checkPermission(request, 'member:update_own');
    if (!perm.allowed) return jsonErr('Forbidden', 403);
    try {
        const body = await parseBody(request);
        if (!body.firstName || !body.lastName || !body.relationship)
            return jsonErr('Required: firstName, lastName, relationship');

        // Find the primary member record
        const targetEmail = (perm.role === 'admin' || perm.role === 'super-admin')
            ? (body.memberEmail || perm.email)
            : perm.email;
        const memberRes = await wixData.query('Members').eq('email', targetEmail).find(SA);
        if (!memberRes.items.length) return jsonErr('Member not found');
        const memberId = memberRes.items[0]._id;

        // If relationship = spouse, update the primary member's spouseName field too
        if (body.relationship === 'spouse') {
            await wixData.update('Members', {
                ...memberRes.items[0],
                spouseName: `${body.firstName} ${body.lastName}`,
                lastUpdatedAt: new Date()
            }, SA);
        }

        const newMember = await wixData.insert('FamilyMembers', {
            memberId,
            memberEmail:        targetEmail,
            firstName:          body.firstName,
            lastName:           body.lastName,
            relationship:       body.relationship,          // spouse | child | parent | sibling | other
            dateOfBirth:        body.dateOfBirth || null,
            phone:              body.phone || '',
            email:              body.email || '',
            dietaryPreference:  body.dietaryPreference || 'non-veg',  // veg | non-veg
            specialDietary:     body.specialDietary || '',
            medicalNotes:       body.medicalNotes || '',
            isActive:           true,
            addedAt:            new Date()
        }, SA);

        return jsonOk({ familyMember: { ...newMember, ageAsOfToday: calcAge(newMember.dateOfBirth) }, message: 'Family member added' });
    } catch (e) { return jsonErr(e.message, 500); }
}
export function options_add_family_member(request) { return handleCors(); }

export async function post_update_family_member(request) {
    const perm = await checkPermission(request, 'member:update_own');
    if (!perm.allowed) return jsonErr('Forbidden', 403);
    try {
        const body = await parseBody(request);
        if (!body.familyMemberId) return jsonErr('Missing familyMemberId');

        // Confirm ownership
        const existing = await wixData.get('FamilyMembers', body.familyMemberId, SA);
        if (!existing) return jsonErr('Family member not found');
        if (perm.role === 'member' && existing.memberEmail !== perm.email)
            return jsonErr('Forbidden: not your family member', 403);

        const IMMUTABLE = ['_id', 'memberId', 'memberEmail', 'addedAt'];
        IMMUTABLE.forEach(f => delete body[f]);

        const updated = await wixData.update('FamilyMembers', {
            ...existing, ...body,
            familyMemberId: undefined,
            lastUpdatedAt: new Date()
        }, SA);

        // Sync spouseName on primary member if relationship is spouse
        if ((body.relationship || existing.relationship) === 'spouse') {
            const memberRes = await wixData.query('Members').eq('email', existing.memberEmail).find(SA);
            if (memberRes.items.length) {
                await wixData.update('Members', {
                    ...memberRes.items[0],
                    spouseName: `${updated.firstName} ${updated.lastName}`,
                    lastUpdatedAt: new Date()
                }, SA);
            }
        }

        return jsonOk({ familyMember: { ...updated, ageAsOfToday: calcAge(updated.dateOfBirth) }, message: 'Updated' });
    } catch (e) { return jsonErr(e.message, 500); }
}
export function options_update_family_member(request) { return handleCors(); }

export async function post_delete_family_member(request) {
    const perm = await checkPermission(request, 'member:update_own');
    if (!perm.allowed) return jsonErr('Forbidden', 403);
    try {
        const body = await parseBody(request);
        if (!body.familyMemberId) return jsonErr('Missing familyMemberId');

        const existing = await wixData.get('FamilyMembers', body.familyMemberId, SA);
        if (!existing) return jsonErr('Family member not found');
        if (perm.role === 'member' && existing.memberEmail !== perm.email)
            return jsonErr('Forbidden', 403);

        // Soft-delete: set isActive = false
        await wixData.update('FamilyMembers', { ...existing, isActive: false, deletedAt: new Date() }, SA);
        return jsonOk({ message: 'Family member removed' });
    } catch (e) { return jsonErr(e.message, 500); }
}
export function options_delete_family_member(request) { return handleCors(); }