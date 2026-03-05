/**
 * ═══════════════════════════════════════════════════════════════
 *  ADMIN API — All admin management endpoints
 *  Covers: members, payments, vendors, sponsors, ads, careers,
 *          KB management, email automation, agent management,
 *          role management, archive data management
 *  All endpoints require admin+ role
 * ═══════════════════════════════════════════════════════════════
 */

import { ok, badRequest, serverError, forbidden } from 'wix-http-functions';
import wixData from 'wix-data';
import { fetch as wixFetch } from 'wix-fetch';
import { checkPermission, addAdminRole, revokeAdminRole, listAdminRoles, applyDataFilters } from 'backend/rbac';
import { runEmailAutomationScan, approveAndSendResponse, getEmailQueueDashboard, sendDirectEmail } from 'backend/email-automation';
import { getEmailTemplate, listEmailTemplates, saveEmailTemplate, renderTemplate, getMemberProfile, buildJourneyUrl } from 'backend/email-templates';
import { generateAndStoreSetupToken, verifyAdminLogin, setAdminPassword, getOnboardProfile, saveOnboardProfile, markOnboardingComplete, getOnboardStatus, buildOnboardUrl, buildPortalUrl, hashPwdDebug, getAdminSecurityQuestion, verifySecurityAnswer, resetAdminPassword, generateSignupCode, verifySignupCode } from 'backend/admin-onboarding';
import { seedAgentProfiles, getAllAgentProfiles, updateAgentProfile } from 'backend/agent-orchestrator';
import { seedDefaultKnowledge, addKnowledgeDocument, retrieveTopK, processDocumentUpload } from 'backend/rag-engine';
import { seedAdminRoles } from 'backend/rbac';

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
    return ok({ body: '', headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type,Authorization,x-user-email' } });
}

// ─────────────────────────────────────────
// ADMIN DASHBOARD
// ─────────────────────────────────────────

export async function get_admin_dashboard(request) {
    const perm = await checkPermission(request, 'admin:view');
    if (!perm.allowed) return jsonErr('Forbidden: ' + perm.reason, 403);
    try {
        const [members, payments, complaints, events, emailQueue, kbDocs] = await Promise.all([
            wixData.query('Members').count(SA).catch(() => 0),
            wixData.query('Payments').count(SA).catch(() => 0),
            wixData.query('Complaints').count(SA).catch(() => 0),
            wixData.query('Events').count(SA).catch(() => 0),
            wixData.query('EmailQueue').eq('status', 'pending-review').count(SA).catch(() => 0),
            wixData.query('KnowledgeBase').count(SA).catch(() => 0)
        ]);
        const recentPayments = await wixData.query('Payments').descending('_createdDate').limit(5).find(SA).catch(() => ({ items: [] }));
        const pendingQueue = await wixData.query('EmailQueue').eq('status', 'pending-review').descending('receivedAt').limit(10).find(SA).catch(() => ({ items: [] }));
        return jsonOk({
            stats: { members, payments, complaints, events, emailQueuePending: emailQueue, knowledgeBaseDocs: kbDocs },
            recentPayments: recentPayments.items,
            pendingEmailQueue: pendingQueue.items,
            adminEmail: perm.email,
            adminRole: perm.role
        });
    } catch (e) {
        return jsonErr('Dashboard error: ' + e.message, 500);
    }
}
export function options_admin_dashboard(request) { return handleCors(); }

// ─────────────────────────────────────────
// MEMBER MANAGEMENT
// ─────────────────────────────────────────

export async function get_admin_members(request) {
    const perm = await checkPermission(request, 'admin:manage_members');
    if (!perm.allowed) return jsonErr('Forbidden', 403);
    try {
        const params = request.query || {};
        const limit = parseInt(params.limit) || 50;
        const skip = parseInt(params.skip) || 0;
        const search = params.search || '';
        let q = wixData.query('Members').skip(skip).limit(limit).ascending('lastName');
        // Note: wix-data doesn't support full-text search natively; we filter in JS for small sets
        const result = await q.find(SA);
        let items = result.items;
        if (search) {
            const s = search.toLowerCase();
            items = items.filter(m => (`${m.firstName} ${m.lastName} ${m.email}`).toLowerCase().includes(s));
        }
        const total = await wixData.query('Members').count(SA);
        return jsonOk({ members: items, total, limit, skip });
    } catch (e) { return jsonErr(e.message, 500); }
}
export function options_admin_members(request) { return handleCors(); }

export async function post_admin_member_update(request) {
    const perm = await checkPermission(request, 'admin:manage_members');
    if (!perm.allowed) return jsonErr('Forbidden', 403);
    try {
        const body = await parseBody(request);
        if (!body._id) return jsonErr('Missing _id');
        const existing = await wixData.get('Members', body._id, SA);
        if (!existing) return jsonErr('Member not found');
        const updated = await wixData.update('Members', { ...existing, ...body }, SA);
        return jsonOk({ member: updated });
    } catch (e) { return jsonErr(e.message, 500); }
}
export function options_admin_member_update(request) { return handleCors(); }

export async function post_admin_member_deactivate(request) {
    const perm = await checkPermission(request, 'admin:manage_members');
    if (!perm.allowed) return jsonErr('Forbidden', 403);
    try {
        const body = await parseBody(request);
        if (!body.memberId) return jsonErr('Missing memberId');
        const existing = await wixData.get('Members', body.memberId, SA);
        if (!existing) return jsonErr('Member not found');
        const updated = await wixData.update('Members', { ...existing, isActive: false, deactivatedBy: perm.email, deactivatedAt: new Date() }, SA);
        return jsonOk({ member: updated, message: 'Member deactivated' });
    } catch (e) { return jsonErr(e.message, 500); }
}
export function options_admin_member_deactivate(request) { return handleCors(); }

// ─────────────────────────────────────────
// PAYMENT MANAGEMENT
// ─────────────────────────────────────────

export async function get_admin_payments(request) {
    const perm = await checkPermission(request, 'admin:manage_payments');
    if (!perm.allowed) return jsonErr('Forbidden', 403);
    try {
        const params = request.query || {};
        const limit = parseInt(params.limit) || 50;
        const skip = parseInt(params.skip) || 0;
        const status = params.status;
        let q = wixData.query('Payments').skip(skip).limit(limit).descending('_createdDate');
        if (status) q = q.eq('status', status);
        const result = await q.find(SA);
        const total = await wixData.query('Payments').count(SA);
        const totalAmount = result.items.reduce((sum, p) => sum + (p.amount || 0), 0);
        return jsonOk({ payments: result.items, total, totalAmount, limit, skip });
    } catch (e) { return jsonErr(e.message, 500); }
}
export function options_admin_payments(request) { return handleCors(); }

export async function post_admin_payment_update(request) {
    const perm = await checkPermission(request, 'admin:manage_payments');
    if (!perm.allowed) return jsonErr('Forbidden', 403);
    try {
        const body = await parseBody(request);
        if (!body._id) return jsonErr('Missing _id');
        const existing = await wixData.get('Payments', body._id, SA);
        if (!existing) return jsonErr('Payment not found');
        const updated = await wixData.update('Payments', { ...existing, ...body, updatedBy: perm.email, updatedAt: new Date() }, SA);
        return jsonOk({ payment: updated });
    } catch (e) { return jsonErr(e.message, 500); }
}
export function options_admin_payment_update(request) { return handleCors(); }

export async function post_admin_payment_record(request) {
    const perm = await checkPermission(request, 'admin:manage_payments');
    if (!perm.allowed) return jsonErr('Forbidden', 403);
    try {
        const body = await parseBody(request);
        const required = ['memberName', 'email', 'amount', 'purpose'];
        for (const f of required) if (!body[f]) return jsonErr(`Missing field: ${f}`);
        const payment = await wixData.insert('Payments', {
            memberName: body.memberName,
            email: body.email,
            amount: parseFloat(body.amount),
            purpose: body.purpose,
            method: body.method || 'manual',
            status: body.status || 'completed',
            notes: body.notes || '',
            recordedBy: perm.email,
            recordedAt: new Date()
        }, SA);
        return jsonOk({ payment, message: 'Payment recorded' });
    } catch (e) { return jsonErr(e.message, 500); }
}
export function options_admin_payment_record(request) { return handleCors(); }

// ─────────────────────────────────────────
// VENDOR MANAGEMENT
// ─────────────────────────────────────────

export async function get_admin_vendors(request) {
    const perm = await checkPermission(request, 'admin:manage_vendors');
    if (!perm.allowed) return jsonErr('Forbidden', 403);
    try {
        const result = await wixData.query('Vendors').find(SA).catch(() => ({ items: [] }));
        return jsonOk({ vendors: result.items, total: result.items.length });
    } catch (e) { return jsonErr(e.message, 500); }
}
export function options_admin_vendors(request) { return handleCors(); }

export async function post_admin_vendor(request) {
    const perm = await checkPermission(request, 'admin:manage_vendors');
    if (!perm.allowed) return jsonErr('Forbidden', 403);
    try {
        const body = await parseBody(request);
        if (!body.name) return jsonErr('Missing vendor name');
        const vendor = await wixData.insert('Vendors', { ...body, addedBy: perm.email, addedAt: new Date() }, SA);
        return jsonOk({ vendor });
    } catch (e) { return jsonErr(e.message, 500); }
}
export function options_admin_vendor(request) { return handleCors(); }

// ─────────────────────────────────────────
// SPONSOR MANAGEMENT
// ─────────────────────────────────────────

export async function get_admin_sponsors(request) {
    const perm = await checkPermission(request, 'admin:manage_sponsors');
    if (!perm.allowed) return jsonErr('Forbidden', 403);
    try {
        const result = await wixData.query('Sponsors').find(SA).catch(() => ({ items: [] }));
        return jsonOk({ sponsors: result.items, total: result.items.length });
    } catch (e) { return jsonErr(e.message, 500); }
}
export function options_admin_sponsors(request) { return handleCors(); }

export async function post_admin_sponsor(request) {
    const perm = await checkPermission(request, 'admin:manage_sponsors');
    if (!perm.allowed) return jsonErr('Forbidden', 403);
    try {
        const body = await parseBody(request);
        if (!body.companyName && !body.name) return jsonErr('Missing sponsor name');
        body.addedBy = perm.email;
        body.addedAt = new Date();
        const sponsor = await wixData.insert('Sponsors', body, SA);
        return jsonOk({ sponsor });
    } catch (e) { return jsonErr(e.message, 500); }
}
export function options_admin_sponsor(request) { return handleCors(); }

// ─────────────────────────────────────────
// AD MANAGEMENT
// ─────────────────────────────────────────

export async function get_admin_ads(request) {
    const perm = await checkPermission(request, 'admin:manage_ads');
    if (!perm.allowed) return jsonErr('Forbidden', 403);
    try {
        const result = await wixData.query('Advertisements').find(SA).catch(() => ({ items: [] }));
        return jsonOk({ ads: result.items, total: result.items.length });
    } catch (e) { return jsonErr(e.message, 500); }
}
export function options_admin_ads(request) { return handleCors(); }

export async function post_admin_ad(request) {
    const perm = await checkPermission(request, 'admin:manage_ads');
    if (!perm.allowed) return jsonErr('Forbidden', 403);
    try {
        const body = await parseBody(request);
        if (!body.title) return jsonErr('Missing ad title');
        const ad = await wixData.insert('Advertisements', { ...body, addedBy: perm.email, addedAt: new Date(), status: body.status || 'active' }, SA);
        return jsonOk({ ad });
    } catch (e) { return jsonErr(e.message, 500); }
}
export function options_admin_ad(request) { return handleCors(); }

// ─────────────────────────────────────────
// CAREER MANAGEMENT
// ─────────────────────────────────────────

export async function get_admin_careers(request) {
    const perm = await checkPermission(request, 'admin:view');
    if (!perm.allowed) return jsonErr('Forbidden', 403);
    try {
        const [sessions, registrations] = await Promise.all([
            wixData.query('CareerGuidanceSessions').find(SA).catch(() => ({ items: [] })),
            wixData.query('CareerSessionRegistrations').find(SA).catch(() => ({ items: [] }))
        ]);
        return jsonOk({ sessions: sessions.items, registrations: registrations.items });
    } catch (e) { return jsonErr(e.message, 500); }
}
export function options_admin_careers(request) { return handleCors(); }

export async function post_admin_career_session(request) {
    const perm = await checkPermission(request, 'admin:manage_members');
    if (!perm.allowed) return jsonErr('Forbidden', 403);
    try {
        const body = await parseBody(request);
        if (!body.title) return jsonErr('Missing session title');
        const session = await wixData.insert('CareerGuidanceSessions', { ...body, createdBy: perm.email, createdAt: new Date() }, SA);
        return jsonOk({ session });
    } catch (e) { return jsonErr(e.message, 500); }
}
export function options_admin_career_session(request) { return handleCors(); }

// ─────────────────────────────────────────
// ARCHIVE / OLD DATA MANAGEMENT
// ─────────────────────────────────────────

export async function get_admin_archive(request) {
    const perm = await checkPermission(request, 'admin:view_reports');
    if (!perm.allowed) return jsonErr('Forbidden', 403);
    try {
        const params = request.query || {};
        const collection = params.collection || 'Members';
        const year = params.year ? parseInt(params.year) : null;
        const ARCHIVABLE = ['Members', 'Payments', 'Events', 'Surveys', 'Complaints', 'SentEmails', 'InboxMessages'];
        if (!ARCHIVABLE.includes(collection)) return jsonErr('Collection not archivable');
        let q = wixData.query(collection).descending('_createdDate').limit(100);
        if (year) {
            const start = new Date(year, 0, 1);
            const end = new Date(year, 11, 31, 23, 59, 59);
            q = q.ge('_createdDate', start).le('_createdDate', end);
        }
        const result = await q.find(SA);
        return jsonOk({ collection, year, records: result.items, total: result.items.length });
    } catch (e) { return jsonErr(e.message, 500); }
}
export function options_admin_archive(request) { return handleCors(); }

// ─────────────────────────────────────────
// EMAIL AUTOMATION MANAGEMENT
// ─────────────────────────────────────────

export async function get_admin_email_queue(request) {
    const perm = await checkPermission(request, 'admin:email_automation');
    if (!perm.allowed) return jsonErr('Forbidden', 403);
    try {
        const params = request.query || {};
        const dashboard = await getEmailQueueDashboard({
            status: params.status,
            category: params.category,
            limit: parseInt(params.limit) || 50,
            skip: parseInt(params.skip) || 0
        });
        return jsonOk(dashboard);
    } catch (e) { return jsonErr(e.message, 500); }
}
export function options_admin_email_queue(request) { return handleCors(); }

export async function post_admin_email_scan(request) {
    const perm = await checkPermission(request, 'admin:email_automation');
    if (!perm.allowed) return jsonErr('Forbidden', 403);
    try {
        const body = await parseBody(request);
        const results = await runEmailAutomationScan(body.maxMessages || 50);
        return jsonOk({ scanResults: results });
    } catch (e) { return jsonErr(e.message, 500); }
}
export function options_admin_email_scan(request) { return handleCors(); }

// GET variant: same as POST but reads params from query string
export async function get_admin_email_scan(request) {
    const perm = await checkPermission(request, 'admin:email_automation');
    if (!perm.allowed) return jsonErr('Forbidden', 403);
    try {
        const { maxMessages } = request.query || {};
        const results = await runEmailAutomationScan(parseInt(maxMessages) || 50);
        return jsonOk({ scanResults: results });
    } catch (e) { return jsonErr(e.message, 500); }
}

export async function post_admin_approve_response(request) {
    const perm = await checkPermission(request, 'admin:approve_responses');
    if (!perm.allowed) return jsonErr('Forbidden', 403);
    try {
        const body = await parseBody(request);
        if (!body.responseId) return jsonErr('Missing responseId');
        const result = await approveAndSendResponse(body.responseId, perm.email);
        return jsonOk({ result });
    } catch (e) { return jsonErr(e.message, 500); }
}
export function options_admin_approve_response(request) { return handleCors(); }

export async function get_admin_auto_responses(request) {
    const perm = await checkPermission(request, 'admin:approve_responses');
    if (!perm.allowed) return jsonErr('Forbidden', 403);
    try {
        const params = request.query || {};
        const sent = params.sent === 'true' ? true : params.sent === 'false' ? false : undefined;
        let q = wixData.query('AutoResponses').descending('_createdDate').limit(50);
        if (sent !== undefined) q = q.eq('sent', sent);
        const result = await q.find(SA);
        return jsonOk({ responses: result.items, total: result.totalCount });
    } catch (e) { return jsonErr(e.message, 500); }
}
export function options_admin_auto_responses(request) { return handleCors(); }

// ─────────────────────────────────────────
// KNOWLEDGE BASE MANAGEMENT
// ─────────────────────────────────────────

export async function get_admin_knowledge_base(request) {
    const perm = await checkPermission(request, 'admin:manage_kb');
    if (!perm.allowed) return jsonErr('Forbidden', 403);
    try {
        const params = request.query || {};
        let q = wixData.query('KnowledgeBase').descending('_createdDate').limit(100);
        if (params.category) q = q.eq('category', params.category);
        const result = await q.find(SA);
        return jsonOk({
            documents: result.items.map(d => ({ _id: d._id, title: d.title, category: d.category, tags: d.tags, source: d.source, sourceType: d.sourceType, isActive: d.isActive, hasEmbedding: !!d.embedding && d.embedding.length > 2 })),
            total: result.totalCount
        });
    } catch (e) { return jsonErr(e.message, 500); }
}
export function options_admin_knowledge_base(request) { return handleCors(); }

export async function post_admin_kb_add(request) {
    const perm = await checkPermission(request, 'admin:manage_kb');
    if (!perm.allowed) return jsonErr('Forbidden', 403);
    try {
        const body = await parseBody(request);
        if (!body.title || !body.content) return jsonErr('Missing title or content');
        const doc = await addKnowledgeDocument({ ...body, uploadedBy: perm.email });
        return jsonOk({ document: { _id: doc._id, title: doc.title, category: doc.category } });
    } catch (e) { return jsonErr(e.message, 500); }
}
export function options_admin_kb_add(request) { return handleCors(); }

export async function post_admin_kb_upload(request) {
    const perm = await checkPermission(request, 'admin:manage_kb');
    if (!perm.allowed) return jsonErr('Forbidden', 403);
    try {
        const body = await parseBody(request);
        if (!body.text) return jsonErr('Missing text content');
        const result = await processDocumentUpload(body.text, { ...body, uploadedBy: perm.email });
        return jsonOk({ uploadResult: result });
    } catch (e) { return jsonErr(e.message, 500); }
}
export function options_admin_kb_upload(request) { return handleCors(); }

export async function post_admin_kb_search(request) {
    const perm = await checkPermission(request, 'admin:manage_kb');
    if (!perm.allowed) return jsonErr('Forbidden', 403);
    try {
        const body = await parseBody(request);
        if (!body.query) return jsonErr('Missing query');
        const results = await retrieveTopK(body.query, { topK: body.topK || 5, category: body.category, minScore: body.minScore || 0.1 });
        return jsonOk({ results, query: body.query });
    } catch (e) { return jsonErr(e.message, 500); }
}
export function options_admin_kb_search(request) { return handleCors(); }

// GET variant: same as POST but reads query from query string
export async function get_admin_kb_search(request) {
    const perm = await checkPermission(request, 'admin:manage_kb');
    if (!perm.allowed) return jsonErr('Forbidden', 403);
    try {
        const { query, limit, category } = request.query || {};
        if (!query) return jsonErr('Missing query');
        const results = await retrieveTopK(query, { topK: parseInt(limit) || 5, category, minScore: 0.1 });
        return jsonOk({ results, query });
    } catch (e) { return jsonErr(e.message, 500); }
}

// ─────────────────────────────────────────
// AGENT MANAGEMENT
// ─────────────────────────────────────────

export async function get_admin_agents(request) {
    const perm = await checkPermission(request, 'admin:manage_agents');
    if (!perm.allowed) return jsonErr('Forbidden', 403);
    try {
        const agents = await getAllAgentProfiles();
        return jsonOk({ agents });
    } catch (e) { return jsonErr(e.message, 500); }
}
export function options_admin_agents(request) { return handleCors(); }

export async function post_admin_agent_update(request) {
    const perm = await checkPermission(request, 'admin:manage_agents');
    if (!perm.allowed) return jsonErr('Forbidden', 403);
    try {
        const body = await parseBody(request);
        if (!body.agentId) return jsonErr('Missing agentId');
        const updated = await updateAgentProfile(body.agentId, body);
        return jsonOk({ agent: updated });
    } catch (e) { return jsonErr(e.message, 500); }
}
export function options_admin_agent_update(request) { return handleCors(); }

// ─────────────────────────────────────────
// ROLE MANAGEMENT
// ─────────────────────────────────────────

export async function get_admin_roles(request) {
    const perm = await checkPermission(request, 'admin:manage_roles');
    if (!perm.allowed) return jsonErr('Forbidden', 403);
    try {
        const roles = await listAdminRoles();
        return jsonOk({ roles });
    } catch (e) { return jsonErr(e.message, 500); }
}
export function options_admin_roles(request) { return handleCors(); }

export async function post_admin_role_add(request) {
    const perm = await checkPermission(request, 'admin:manage_roles');
    if (!perm.allowed) return jsonErr('Forbidden', 403);
    try {
        const body = await parseBody(request);
        if (!body.email || !body.role) return jsonErr('Missing email or role');
        const extras = { ecTitle: body.ecTitle || '', firstName: body.firstName || '', lastName: body.lastName || '' };
        await addAdminRole(body.email, body.role, perm.email, extras);

        // ── Generate one-time setup token stored in AdminRoles ────────
        const setupToken = await generateAndStoreSetupToken(body.email);

        // ── Fetch member profile for personalisation ──────────────────
        const memberProfile = await getMemberProfile(body.email);
        const firstName = memberProfile?.firstName || body.firstName || body.email.split('@')[0];
        const lastName = memberProfile?.lastName || body.lastName || '';
        const displayName = [firstName, lastName].filter(Boolean).join(' ');
        const phone = memberProfile?.phone || '';
        const membershipType = memberProfile?.membershipType || memberProfile?.membership_type || '';

        // ── Build template variables ──────────────────────────────────
        const roleLabel = { super_admin: 'Super Admin', admin: 'Admin', ec_member: 'EC Member', member: 'Member' }[body.role] || body.role;
        // portalUrl points to the onboarding wizard (first-time setup)
        const portalUrl = buildOnboardUrl(body.email, setupToken);
        const journeyUrl = buildJourneyUrl();
        const templateVars = {
            firstName,
            lastName,
            email: body.email,
            phone,
            membershipType,
            roleLabel,
            ecTitle: body.ecTitle || extras.ecTitle || '',
            portalUrl,
            journeyUrl,
            grantedBy: perm.email,
            grantedAt: new Date().toUTCString()
        };

        // ── Load template from DB (falls back to default if not found) ─
        const tmpl = await getEmailTemplate('role_welcome');
        const subject = tmpl ? renderTemplate(tmpl.subject, templateVars)
            : `BANF: You have been granted ${roleLabel} access`;
        const welcomeHtml = tmpl ? renderTemplate(tmpl.bodyHtml, templateVars)
            : `<p>You have been granted <strong>${roleLabel}</strong> access.</p>
               <p><a href="${portalUrl}">Complete your onboarding</a></p>
               <p><a href="${journeyUrl}">Open Requirements Journey</a></p>`;

        // ── Send email ────────────────────────────────────────────────
        const emailResult = await sendDirectEmail(body.email, displayName, subject, welcomeHtml);

        return jsonOk({
            message: `Role ${body.role} assigned to ${body.email}`,
            emailSent: emailResult.success,
            emailError: emailResult.error || undefined,
            onboardUrl: portalUrl, // the setup wizard link (for super_admin if email fails)
            setupToken            // returned so super_admin can trigger password reset manually
        });
    } catch (e) { return jsonErr(e.message, 500); }
}
export function options_admin_role_add(request) { return handleCors(); }

export async function post_admin_role_revoke(request) {
    const perm = await checkPermission(request, 'admin:manage_roles');
    if (!perm.allowed) return jsonErr('Forbidden', 403);
    try {
        const body = await parseBody(request);
        if (!body.email) return jsonErr('Missing email');
        await revokeAdminRole(body.email);
        return jsonOk({ message: `Role revoked for ${body.email}` });
    } catch (e) { return jsonErr(e.message, 500); }
}
export function options_admin_role_revoke(request) { return handleCors(); }

/**
 * POST /admin_pwdebug  — TEMP diagnostic: shows password fields for an admin
 * Body: { email, adminKey } where adminKey is hard-coded super_admin gate
 */
export async function post_admin_pwdebug(request) {
    try {
        const body = await parseBody(request);
        if (body.adminKey !== 'BANF_DEBUG_2026') return jsonErr('Forbidden', 403);
        const res = await wixData.query('AdminRoles').eq('email', (body.email || '').toLowerCase()).limit(1).find({ suppressAuth: true });
        if (!res.items.length) return jsonOk({ found: false });
        const r = res.items[0];
        let hashTest = null;
        if (body.testPw1 && body.testPw2 && r.passwordSalt) {
            const h1 = hashPwdDebug(body.testPw1, r.passwordSalt);
            const h2 = hashPwdDebug(body.testPw2, r.passwordSalt);
            hashTest = { h1prefix: h1.substring(0,16), h2prefix: h2.substring(0,16), same: h1 === h2, h1len: h1.length };
        }
        return jsonOk({
            found: true,
            passwordSet:       r.passwordSet,
            passwordHash:      r.passwordHash ? r.passwordHash.substring(0, 16) + '...' : null,
            passwordHashLen:   r.passwordHash ? r.passwordHash.length : 0,
            passwordSalt:      r.passwordSalt ? r.passwordSalt.substring(0, 8) + '...' : null,
            onboardingComplete:r.onboardingComplete,
            hashTest
        });
    } catch(e) { return jsonErr(e.message, 500); }
}
export function options_admin_pwdebug(request) { return handleCors(); }

// ─────────────────────────────────────────
// ONBOARDING ENDPOINTS
// ─────────────────────────────────────────

/**
 * POST /admin_onboard_verify
 * Validate a setup token from the welcome email link.
 * Body: { email, token }
 */
export async function post_admin_onboard_verify(request) {
    try {
        const body = await parseBody(request);
        if (!body.email || !body.token) return jsonErr('email and token required');
        const data = await getOnboardProfile(body.email, body.token);
        if (!data.success) return jsonErr(data.error || 'Invalid setup link', 401);
        return jsonOk(data);
    } catch (e) { return jsonErr(e.message, 500); }
}
export function options_admin_onboard_verify(request) { return handleCors(); }

/**
 * POST /admin_set_password
 * Set the admin password using a valid setup token.
 * Body: { email, token, password }
 */
export async function post_admin_set_password(request) {
    try {
        const body = await parseBody(request);
        if (!body.email || !body.token || !body.password) return jsonErr('email, token and password required');
        const result = await setAdminPassword(body.email, body.password, body.token);
        if (!result.success) return jsonErr(result.error || 'Failed to set password', 400);
        return jsonOk({ message: 'Password set successfully' });
    } catch (e) { return jsonErr(e.message, 500); }
}
export function options_admin_set_password(request) { return handleCors(); }

/**
 * POST /admin_save_profile
 * Save profile data during onboarding.
 * Body: { email, token, firstName, lastName, phone, phone2, address, city, state, zipCode, familyMembers[] }
 */
export async function post_admin_save_profile(request) {
    try {
        const body = await parseBody(request);
        if (!body.email || !body.token) return jsonErr('email and token required');
        if (!body.phone) return jsonErr('Phone number is required');
        const result = await saveOnboardProfile(body.email, body, body.token);
        if (!result.success) return jsonErr(result.error || 'Failed to save profile', 400);
        return jsonOk({ message: 'Profile saved' });
    } catch (e) { return jsonErr(e.message, 500); }
}
export function options_admin_save_profile(request) { return handleCors(); }

/**
 * POST /admin_onboard_complete
 * Mark onboarding as done. Invalidates token, unlocks portal access.
 * Body: { email, token }
 */
export async function post_admin_onboard_complete(request) {
    try {
        const body = await parseBody(request);
        if (!body.email || !body.token) return jsonErr('email and token required');
        const result = await markOnboardingComplete(body.email, body.token);
        if (!result.success) return jsonErr(result.error || 'Failed to complete onboarding', 400);
        return jsonOk({ message: 'Onboarding complete', portalUrl: result.portalUrl });
    } catch (e) { return jsonErr(e.message, 500); }
}
export function options_admin_onboard_complete(request) { return handleCors(); }

/**
 * POST /admin_verify_login
 * Unified login endpoint: verifies email + password, checks onboarding status.
 * Body: { email, password? }
 * Returns: { success, adminRole, firstName, needsOnboarding?, needsPassword?, setupToken? }
 */
export async function post_admin_verify_login(request) {
    try {
        const body = await parseBody(request);
        if (!body.email) return jsonErr('email required');
        const result = await verifyAdminLogin(body.email, body.password || '');
        if (result.needsOnboarding) {
            return jsonOk({ success: false, needsOnboarding: true,
                setupToken: result.setupToken, email: result.email,
                message: result.error });
        }
        if (!result.valid) return jsonErr(result.error || 'Login failed', 401);
        return jsonOk({
            success: true, adminRole: result.role,
            firstName: result.firstName, lastName: result.lastName,
            ecTitle: result.ecTitle, noPassword: result.noPassword || false
        });
    } catch (e) { return jsonErr(e.message, 500); }
}
export function options_admin_verify_login(request) { return handleCors(); }

// ─────────────────────────────────────────
// DIRECT SIGNUP (NO EMAIL VERIFICATION CODE)
// ─────────────────────────────────────────

/**
 * POST /admin_signup_direct
 * Validate email exists in AdminRoles and is not yet password-set.
 * Returns a setupToken directly — no email verification code needed.
 * Body: { email }
 */
export async function post_admin_signup_direct(request) {
    try {
        const body = await parseBody(request);
        if (!body.email) return jsonErr('email required');
        const emailLc = body.email.toLowerCase().trim();

        const res = await wixData.query('AdminRoles')
            .eq('email', emailLc).limit(1).find(SA);
        if (!res.items.length) return jsonErr('Email not found in AdminRoles. Contact the Super Admin to get access.');
        const rec = res.items[0];
        if (rec.passwordSet) return jsonErr('This account already has a password. Please sign in instead.');

        // Generate setup token directly (skip email verification code)
        const token = await generateAndStoreSetupToken(emailLc);

        return jsonOk({
            success: true,
            setupToken: token,
            firstName: rec.firstName || '',
            lastName: rec.lastName || '',
            ecTitle: rec.ecTitle || '',
            role: rec.role || 'admin',
            message: 'Email validated. Please set your password and security question.'
        });
    } catch (e) { return jsonErr(e.message, 500); }
}
export function options_admin_signup_direct(request) { return handleCors(); }

// ─────────────────────────────────────────
// SIGNUP EMAIL VERIFICATION (LEGACY — kept for backward compatibility)
// ─────────────────────────────────────────

/**
 * POST /admin_signup_send_code
 * Generate a 6-digit verification code and email it to the admin.
 * Body: { email }
 */
export async function post_admin_signup_send_code(request) {
    try {
        const body = await parseBody(request);
        if (!body.email) return jsonErr('email required');
        const result = await generateSignupCode(body.email);
        if (!result.success) return jsonErr(result.error || 'Failed', 400);

        // Send the code via email
        const displayName = [result.firstName, result.lastName].filter(Boolean).join(' ') || body.email.split('@')[0];
        const subject = 'BANF Admin Sign-Up Verification Code';
        const htmlBody = `
            <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:24px">
                <h2 style="color:#1a73e8;margin-bottom:8px">BANF Admin Verification</h2>
                <p>Hello ${displayName},</p>
                <p>Your sign-up verification code is:</p>
                <div style="background:#f0f4ff;border:2px solid #1a73e8;border-radius:8px;padding:20px;text-align:center;margin:20px 0">
                    <span style="font-size:32px;font-weight:bold;letter-spacing:8px;color:#1a73e8">${result.code}</span>
                </div>
                <p style="color:#666;font-size:14px">This code expires in <strong>10 minutes</strong>.</p>
                <p style="color:#666;font-size:14px">If you did not request this, please ignore this email.</p>
                <hr style="border:none;border-top:1px solid #e0e0e0;margin:24px 0">
                <p style="color:#999;font-size:12px">Bengali Association of North Florida (BANF)<br>Admin Portal Security</p>
            </div>`;

        const emailResult = await sendDirectEmail(body.email, displayName, subject, htmlBody);

        return jsonOk({
            success: true,
            message: 'Verification code sent to your email.',
            emailSent: emailResult.success,
            emailError: emailResult.error || undefined,
            // Include code in response ONLY for development/testing — remove in production
            firstName: result.firstName,
            lastName: result.lastName
        });
    } catch (e) { return jsonErr(e.message, 500); }
}
export function options_admin_signup_send_code(request) { return handleCors(); }

/**
 * POST /admin_signup_verify_code
 * Verify the 6-digit code and return a setup token for password creation.
 * Body: { email, code }
 */
export async function post_admin_signup_verify_code(request) {
    try {
        const body = await parseBody(request);
        if (!body.email || !body.code) return jsonErr('email and code required');
        const result = await verifySignupCode(body.email, body.code);
        if (!result.success) return jsonErr(result.error || 'Verification failed', 401);
        return jsonOk({ success: true, setupToken: result.setupToken });
    } catch (e) { return jsonErr(e.message, 500); }
}
export function options_admin_signup_verify_code(request) { return handleCors(); }

// ─────────────────────────────────────────
// SECURITY QUESTION & PASSWORD RESET
// ─────────────────────────────────────────

/**
 * POST /admin_get_security_question
 * Retrieve the security question for an admin account (no answer revealed).
 * Body: { email }
 */
export async function post_admin_get_security_question(request) {
    try {
        const body = await parseBody(request);
        if (!body.email) return jsonErr('email required');
        const result = await getAdminSecurityQuestion(body.email);
        if (!result.success) return jsonErr(result.error || 'Not found', 404);
        return jsonOk({ question: result.question, firstName: result.firstName, lastName: result.lastName });
    } catch (e) { return jsonErr(e.message, 500); }
}
export function options_admin_get_security_question(request) { return handleCors(); }

/**
 * POST /admin_verify_security_answer
 * Verify the security answer and return a reset token.
 * Body: { email, answer }
 */
export async function post_admin_verify_security_answer(request) {
    try {
        const body = await parseBody(request);
        if (!body.email || !body.answer) return jsonErr('email and answer required');
        const result = await verifySecurityAnswer(body.email, body.answer);
        if (!result.success) return jsonErr(result.error || 'Verification failed', 401);
        return jsonOk({ resetToken: result.resetToken });
    } catch (e) { return jsonErr(e.message, 500); }
}
export function options_admin_verify_security_answer(request) { return handleCors(); }

/**
 * POST /admin_reset_password
 * Reset admin password using a reset token from security answer verification.
 * Body: { email, token, password }
 */
export async function post_admin_reset_password(request) {
    try {
        const body = await parseBody(request);
        if (!body.email || !body.token || !body.password) return jsonErr('email, token, and password required');
        const result = await resetAdminPassword(body.email, body.token, body.password);
        if (!result.success) return jsonErr(result.error || 'Reset failed', 400);
        return jsonOk({ message: 'Password reset successfully' });
    } catch (e) { return jsonErr(e.message, 500); }
}
export function options_admin_reset_password(request) { return handleCors(); }

// ─────────────────────────────────────────
// EMAIL TEMPLATES (super_admin managed)
// ─────────────────────────────────────────

/**
 * GET /email_templates
 * Returns all email templates from DB. Seeds defaults if empty.
 * Requires admin:manage_roles permission (super_admin).
 */
export async function get_email_templates(request) {
    const perm = await checkPermission(request, 'admin:manage_roles');
    if (!perm.allowed) return jsonErr('Forbidden', 403);
    try {
        const templates = await listEmailTemplates();
        return jsonOk({ templates });
    } catch (e) { return jsonErr(e.message, 500); }
}
export function options_email_templates(request) { return handleCors(); }

/**
 * POST /email_template_save
 * Create or update an email template.
 * Body: { templateId, name, subject, bodyHtml, description, variables[], isActive }
 * Requires admin:manage_roles permission (super_admin).
 */
export async function post_email_template_save(request) {
    const perm = await checkPermission(request, 'admin:manage_roles');
    if (!perm.allowed) return jsonErr('Forbidden', 403);
    try {
        const body = await parseBody(request);
        if (!body.templateId) return jsonErr('templateId is required');
        if (!body.subject) return jsonErr('subject is required');
        if (!body.bodyHtml) return jsonErr('bodyHtml is required');
        const saved = await saveEmailTemplate(body, perm.email);
        return jsonOk({ template: saved, message: 'Template saved successfully' });
    } catch (e) { return jsonErr(e.message, 500); }
}
export function options_email_template_save(request) { return handleCors(); }



export async function post_admin_bootstrap(request) {
    const perm = await checkPermission(request, 'admin:manage_kb');
    if (!perm.allowed) return jsonErr('Forbidden', 403);
    try {
        const [kb, agents, roles] = await Promise.all([
            seedDefaultKnowledge(),
            seedAgentProfiles(),
            seedAdminRoles()
        ]);
        return jsonOk({ bootstrapResults: { knowledgeBase: kb, agents, roles } });
    } catch (e) { return jsonErr(e.message, 500); }
}
export function options_admin_bootstrap(request) { return handleCors(); }

// ─────────────────────────────────────────
// EC ONBOARDING DASHBOARD  (super_admin only)
// ─────────────────────────────────────────

/**
 * The master list of portal features/sections that can be delegated to EC members.
 * Each feature maps to its RBAC permission(s) and a human label.
 */
const EC_ASSIGNABLE_FEATURES = [
    { id: 'dashboard',          label: 'Dashboard',                 icon: 'fa-tachometer-alt', description: 'View KPI stats, recent payments, pending queue',  permissions: ['admin:view'] },
    { id: 'events',             label: 'Events (Evite)',            icon: 'fa-calendar-alt',   description: 'Create & manage events, send invitations',        permissions: ['admin:view'] },
    { id: 'rsvps',              label: 'RSVPs & Attendance',        icon: 'fa-ticket-alt',     description: 'Track RSVPs, QR scan check-in, attendance reports',permissions: ['admin:view'] },
    { id: 'members',            label: 'Members',                   icon: 'fa-users',          description: 'Search, view & update member records',            permissions: ['admin:manage_members'] },
    { id: 'payments',           label: 'Payments',                  icon: 'fa-money-bill-wave',description: 'Record, confirm & track payments',                permissions: ['admin:manage_payments'] },
    { id: 'surveys',            label: 'Surveys',                   icon: 'fa-poll',           description: 'Create & analyze member surveys',                 permissions: ['admin:view'] },
    { id: 'automation',         label: 'Process Automation',        icon: 'fa-robot',          description: 'Email queue, Gmail scan, auto-response rules',    permissions: ['admin:email_automation'] },
    { id: 'crm',                label: 'CRM / Families',            icon: 'fa-sitemap',        description: 'Family units, contacts, demographics',            permissions: ['admin:manage_crm'] },
    { id: 'vendors',            label: 'Vendors & Sponsors',        icon: 'fa-store',          description: 'Manage vendors, sponsors & ads',                  permissions: ['admin:manage_vendors'] },
    { id: 'kb',                 label: 'Knowledge Base',            icon: 'fa-book',           description: 'Bylaws, policies, documents',                     permissions: ['admin:manage_kb'] },
    { id: 'agents',             label: 'AI Agents',                 icon: 'fa-brain',          description: 'Smart automation, recommendations',               permissions: ['admin:manage_agents'] },
    { id: 'roles',              label: 'Roles & Access',            icon: 'fa-user-shield',    description: 'Grant/revoke EC roles, onboard',                  permissions: ['admin:manage_roles'] },
    { id: 'email_templates',    label: 'Email Templates',           icon: 'fa-envelope-open-text', description: 'Customize all outgoing emails',               permissions: ['admin:manage_roles'] },
    { id: 'reports',            label: 'Reports',                   icon: 'fa-chart-bar',      description: 'Membership, finance, events CSV reports',         permissions: ['admin:view_reports'] },
    { id: 'tools',              label: 'System Tools',              icon: 'fa-tools',          description: 'Bootstrap, archive, test suite',                  permissions: ['admin:run_tests'] },
    { id: 'workflows',          label: 'Workflow Hub',              icon: 'fa-project-diagram',description: 'Membership drive, reconciliation workflows',      permissions: ['admin:view'] },
    { id: 'comms',              label: 'Communications',            icon: 'fa-paper-plane',    description: 'Staged email campaigns (comms-correction)',        permissions: ['admin:email_automation'] },
    { id: 'gmail_sync',         label: 'Gmail Sync',                icon: 'fa-inbox',          description: 'Sync and scan Gmail inbox',                       permissions: ['admin:sync_gmail'] },
];

/**
 * GET /ec_onboard_dashboard
 * Returns every AdminRoles record with full onboarding status for the president to monitor.
 * Also returns the feature config (which features are assigned to whom).
 * Requires super_admin role (admin:manage_roles).
 */
export async function get_ec_onboard_dashboard(request) {
    const perm = await checkPermission(request, 'admin:manage_roles');
    if (!perm.allowed) return jsonErr('Forbidden — super_admin only', 403);
    try {
        // Get all AdminRoles records
        const allRoles = await wixData.query('AdminRoles').limit(200).find(SA);
        const members = allRoles.items.map(r => ({
            _id: r._id,
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
            assignedFeatures: r.assignedFeatures || null   // JSON array or null
        }));

        // Compute summary stats
        const total = members.length;
        const active = members.filter(m => m.isActive).length;
        const onboarded = members.filter(m => m.onboardingComplete).length;
        const passwordDone = members.filter(m => m.passwordSet).length;
        const pending = members.filter(m => m.isActive && !m.onboardingComplete).length;

        // Get feature config collection (if exists)
        let featureConfigs = [];
        try {
            const fcRes = await wixData.query('ECFeatureConfig').limit(200).find(SA);
            featureConfigs = fcRes.items;
        } catch (_) { /* collection may not exist yet */ }

        return jsonOk({
            summary: { total, active, onboarded, passwordDone, pending },
            members,
            featureConfigs,
            availableFeatures: EC_ASSIGNABLE_FEATURES
        });
    } catch (e) { return jsonErr(e.message, 500); }
}
export function options_ec_onboard_dashboard(request) { return handleCors(); }

/**
 * POST /ec_feature_config
 * Save feature assignments for a specific EC member.
 * Body: { email, features: ['dashboard','events','rsvps',...] }
 * Requires super_admin role.
 */
export async function post_ec_feature_config(request) {
    const perm = await checkPermission(request, 'admin:manage_roles');
    if (!perm.allowed) return jsonErr('Forbidden — super_admin only', 403);
    try {
        const body = await parseBody(request);
        if (!body.email) return jsonErr('email is required');
        if (!Array.isArray(body.features)) return jsonErr('features must be an array');

        const emailLc = body.email.toLowerCase().trim();

        // Validate features against master list
        const validIds = EC_ASSIGNABLE_FEATURES.map(f => f.id);
        const features = body.features.filter(f => validIds.includes(f));

        // Update AdminRoles record with assigned features
        const roleRes = await wixData.query('AdminRoles').eq('email', emailLc).limit(1).find(SA);
        if (roleRes.items.length > 0) {
            await wixData.update('AdminRoles', {
                ...roleRes.items[0],
                assignedFeatures: JSON.stringify(features)
            }, SA);
        }

        // Upsert into ECFeatureConfig collection for audit trail
        const existing = await wixData.query('ECFeatureConfig').eq('email', emailLc).limit(1).find(SA).catch(() => ({ items: [] }));
        const configRecord = {
            email: emailLc,
            features: JSON.stringify(features),
            featureCount: features.length,
            assignedBy: perm.email,
            assignedAt: new Date().toISOString()
        };
        if (existing.items.length > 0) {
            await wixData.update('ECFeatureConfig', { ...existing.items[0], ...configRecord }, SA);
        } else {
            await wixData.insert('ECFeatureConfig', configRecord, SA);
        }

        return jsonOk({
            message: `${features.length} features assigned to ${emailLc}`,
            email: emailLc,
            features
        });
    } catch (e) { return jsonErr(e.message, 500); }
}
export function options_ec_feature_config(request) { return handleCors(); }

/**
 * GET /ec_feature_config
 * Returns the current feature config for a specific admin email, or all if no email.
 * Query: ?email=someone@gmail.com (optional)
 */
export async function get_ec_feature_config(request) {
    const perm = await checkPermission(request, 'admin:view');
    if (!perm.allowed) return jsonErr('Forbidden', 403);
    try {
        const params = request.query || {};
        if (params.email) {
            const emailLc = params.email.toLowerCase().trim();
            // If requesting own config (EC member checking their own features)
            if (emailLc === perm.email.toLowerCase() || perm.role === 'super_admin' || perm.role === 'admin') {
                const roleRes = await wixData.query('AdminRoles').eq('email', emailLc).limit(1).find(SA);
                if (!roleRes.items.length) return jsonOk({ features: [], availableFeatures: EC_ASSIGNABLE_FEATURES });
                const r = roleRes.items[0];
                let features = [];
                try { features = JSON.parse(r.assignedFeatures || '[]'); } catch(_) {}
                // super_admin gets all features always
                if (r.role === 'super_admin') features = EC_ASSIGNABLE_FEATURES.map(f => f.id);
                return jsonOk({ email: emailLc, features, role: r.role, availableFeatures: EC_ASSIGNABLE_FEATURES });
            }
            return jsonErr('Forbidden — can only view own config', 403);
        }
        // No email → return all (super_admin only)
        if (perm.role !== 'super_admin') return jsonErr('Forbidden', 403);
        const allRoles = await wixData.query('AdminRoles').eq('isActive', true).limit(200).find(SA);
        const configs = allRoles.items.map(r => {
            let features = [];
            try { features = JSON.parse(r.assignedFeatures || '[]'); } catch(_) {}
            if (r.role === 'super_admin') features = EC_ASSIGNABLE_FEATURES.map(f => f.id);
            return { email: r.email, role: r.role, ecTitle: r.ecTitle || '', firstName: r.firstName || '', lastName: r.lastName || '', features };
        });
        return jsonOk({ configs, availableFeatures: EC_ASSIGNABLE_FEATURES });
    } catch (e) { return jsonErr(e.message, 500); }
}
