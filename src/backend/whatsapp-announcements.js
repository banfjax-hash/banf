/**
 * WhatsApp → Announcement Ingestion API
 *
 * Endpoints:
 *  - GET  /_functions/whatsapp_webhook         (Meta webhook verification)
 *  - POST /_functions/whatsapp_webhook         (Inbound WhatsApp messages)
 *  - POST /_functions/whatsapp_announcement_approve (Approve/reject queued announcement)
 *
 * Behavior:
 *  - Reads inbound WhatsApp Business payloads
 *  - Extracts important announcement candidates
 *  - Auto-publishes or queues pending approval based on SiteContent toggles
 */

import { ok, badRequest, forbidden, serverError } from 'wix-http-functions';
import wixData from 'wix-data';

const SA = { suppressAuth: true };

function jsonOk(data = {}) {
    return ok({
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, x-admin-secret'
        },
        body: JSON.stringify({ success: true, ...data })
    });
}

function jsonErr(message, code = 500) {
    const payload = {
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, x-admin-secret'
        },
        body: JSON.stringify({ success: false, error: message })
    };
    if (code === 400) return badRequest(payload);
    if (code === 403) return forbidden(payload);
    return serverError(payload);
}

export function options_whatsapp_webhook() {
    return ok({
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, x-admin-secret',
            'Access-Control-Max-Age': '86400'
        },
        body: ''
    });
}

export function options_whatsapp_announcement_approve() {
    return options_whatsapp_webhook();
}

export function options_whatsapp_announcements() {
    return options_whatsapp_webhook();
}

async function parseBody(request) {
    try { return await request.body.json(); } catch (_) { return {}; }
}

async function getSiteContentMap() {
    const map = {};
    try {
        const res = await wixData.query('SiteContent').limit(500).find(SA);
        for (const item of res.items || []) {
            if (item && item.active !== false && item.key) map[item.key] = item.value;
        }
    } catch (_) {}
    return map;
}

function toBool(value, defaultValue = false) {
    if (value == null) return defaultValue;
    const s = String(value).trim().toLowerCase();
    if (['1', 'true', 'yes', 'y', 'on'].includes(s)) return true;
    if (['0', 'false', 'no', 'n', 'off'].includes(s)) return false;
    return defaultValue;
}

function normalizePriority(priority) {
    const p = String(priority || '').toLowerCase();
    if (p === 'high' || p === 'urgent') return 'high';
    if (p === 'low') return 'low';
    return 'medium';
}

function priorityRank(priority) {
    const p = normalizePriority(priority);
    if (p === 'high') return 3;
    if (p === 'medium') return 2;
    return 1;
}

function cleanText(input) {
    return String(input || '')
        .replace(/\s+/g, ' ')
        .replace(/[\u0000-\u001f]+/g, ' ')
        .trim();
}

function parseDateHint(text) {
    const m = text.match(/\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\s+\d{1,2}(?:,\s*\d{4})?/i)
        || text.match(/\b\d{1,2}[\/\-]\d{1,2}(?:[\/\-]\d{2,4})?\b/);
    return m ? m[0] : '';
}

function classifyCategory(text) {
    const t = text.toLowerCase();
    if (/\b(membership|renewal|member fee|zelle|payment|dues)\b/.test(t)) return 'membership';
    if (/\b(emergency|urgent|alert|cancel|closure|weather|storm|safety)\b/.test(t)) return 'emergency';
    if (/\b(kids?|children|youth|teen|engagement program|summer program|registration)\b/.test(t)) return 'event';
    if (/\b(puja|utsob|event|program|rehearsal|picnic|noboborsho|bosonto)\b/.test(t)) return 'event';
    return 'general';
}

function detectPriority(text) {
    const t = text.toLowerCase();
    if (/\b(urgent|emergency|immediate|asap|today|now|cancelled|canceled|closure|storm|safety)\b/.test(t)) return 'high';
    if (/\b(registration open|last date|deadline|limited seats|kids|youth|engagement program)\b/.test(t)) return 'high';
    if (/\b(important|deadline|tomorrow|this week|reminder|please note)\b/.test(t)) return 'medium';
    return 'low';
}

function isAnnouncementCandidate(text) {
    const t = text.toLowerCase();
    if (text.length < 25) return false;
    return /\b(announce|announcement|important|update|reminder|event|membership|payment|deadline|register|registration|volunteer|meeting|program|urgent|alert|kids|youth|engagement)\b/.test(t);
}

function makeTitle(text, category) {
    const firstSentence = text.split(/[.!?\n]/).map(s => s.trim()).find(Boolean) || text;
    const short = firstSentence.length > 90 ? firstSentence.slice(0, 87) + '...' : firstSentence;
    if (/announcement/i.test(short)) return short;
    const prefix = category === 'membership' ? 'Membership Update' : category === 'event' ? 'Event Update' : category === 'emergency' ? 'Emergency Alert' : 'Community Update';
    return `${prefix}: ${short}`;
}

function extractCandidatesFromMessage(message) {
    const candidates = [];
    const text = cleanText(message?.text?.body || message?.button?.text || message?.interactive?.button_reply?.title || '');
    if (!text) return candidates;
    if (!isAnnouncementCandidate(text)) return candidates;

    const category = classifyCategory(text);
    const priority = detectPriority(text);
    const dateHint = parseDateHint(text);
    const title = makeTitle(text, category);

    candidates.push({
        title,
        message: text,
        priority,
        category,
        source: 'whatsapp',
        sourceMessageId: message?.id || '',
        sourceSender: message?.from || '',
        detectedDate: dateHint,
        effectiveOn: new Date().toISOString().slice(0, 10),
        pinned: priority === 'high'
    });

    return candidates;
}

async function getNextOrder() {
    try {
        const r = await wixData.query('Announcements').descending('order').limit(1).find(SA);
        const max = r.items?.[0]?.order;
        return Number.isFinite(max) ? max + 1 : 1;
    } catch (_) {
        return 1;
    }
}

async function alreadyIngested(sourceMessageId) {
    if (!sourceMessageId) return false;
    try {
        const r = await wixData.query('Announcements').eq('sourceMessageId', sourceMessageId).limit(1).find(SA);
        return (r.items || []).length > 0;
    } catch (_) {
        return false;
    }
}

async function persistInboundMessage(rawMessage) {
    try {
        await wixData.insert('WhatsAppMessages', {
            provider: 'meta',
            messageId: rawMessage?.id || '',
            from: rawMessage?.from || '',
            type: rawMessage?.type || '',
            text: cleanText(rawMessage?.text?.body || ''),
            payload: JSON.stringify(rawMessage || {}),
            receivedAt: new Date(),
            active: true
        }, SA);
    } catch (_) {
        // Optional collection; ignore if not created.
    }
}

async function loadApprovalConfig(siteContent) {
    const approvalRequired = toBool(siteContent.announcementsRequireApproval, true);
    const autoPublish = toBool(siteContent.announcementsAutoPublish, false);
    const ingestEnabled = toBool(siteContent.whatsappIngestEnabled, true);
    const minPriority = normalizePriority(siteContent.announcementsMinPriority || 'medium');

    return { approvalRequired, autoPublish, ingestEnabled, minPriority };
}

function shouldPublishNow(priority, config) {
    if (!config.ingestEnabled) return false;
    if (priorityRank(priority) < priorityRank(config.minPriority)) return false;
    if (config.approvalRequired) return false;
    return config.autoPublish;
}

async function ingestWhatsAppPayload(payload, siteContent) {
    const config = await loadApprovalConfig(siteContent);
    const entries = Array.isArray(payload?.entry) ? payload.entry : [];

    let scanned = 0;
    let extracted = 0;
    let published = 0;
    let queued = 0;

    for (const entry of entries) {
        const changes = Array.isArray(entry?.changes) ? entry.changes : [];
        for (const change of changes) {
            const messages = Array.isArray(change?.value?.messages) ? change.value.messages : [];
            for (const msg of messages) {
                scanned += 1;
                await persistInboundMessage(msg);

                const candidates = extractCandidatesFromMessage(msg);
                for (const c of candidates) {
                    if (await alreadyIngested(c.sourceMessageId)) continue;
                    extracted += 1;

                    const active = shouldPublishNow(c.priority, config);
                    const status = active ? 'published' : 'pending_approval';
                    const order = await getNextOrder();

                    await wixData.insert('Announcements', {
                        title: c.title,
                        message: c.message,
                        priority: c.priority,
                        category: c.category,
                        source: c.source,
                        sourceMessageId: c.sourceMessageId,
                        sourceSender: c.sourceSender,
                        detectedDate: c.detectedDate,
                        effectiveOn: c.effectiveOn,
                        expiresOn: null,
                        pinned: c.pinned,
                        status,
                        active,
                        order,
                        approvedAt: active ? new Date() : null,
                        approvedBy: active ? 'auto' : null
                    }, SA);

                    if (active) published += 1;
                    else queued += 1;
                }
            }
        }
    }

    return { scanned, extracted, published, queued, config };
}

async function getWebhookVerifyToken(siteContent) {
    if (siteContent.whatsappWebhookVerifyToken) return String(siteContent.whatsappWebhookVerifyToken);
    try {
        const { getSecret } = await import('wix-secrets-backend');
        const secret = await getSecret('WHATSAPP_WEBHOOK_VERIFY_TOKEN').catch(() => null);
        if (secret) return String(secret);
    } catch (_) {}
    return '';
}

export async function get_whatsapp_webhook(request) {
    try {
        const q = request.query || {};
        const mode = q['hub.mode'];
        const token = q['hub.verify_token'];
        const challenge = q['hub.challenge'];

        const siteContent = await getSiteContentMap();
        const expected = await getWebhookVerifyToken(siteContent);

        if (mode === 'subscribe' && challenge && expected && token === expected) {
            return ok({
                headers: { 'Content-Type': 'text/plain', 'Access-Control-Allow-Origin': '*' },
                body: String(challenge)
            });
        }

        return forbidden({
            headers: { 'Content-Type': 'text/plain', 'Access-Control-Allow-Origin': '*' },
            body: 'Verification failed'
        });
    } catch (e) {
        return jsonErr('Webhook verification failed: ' + e.message, 500);
    }
}

export async function post_whatsapp_webhook(request) {
    try {
        const body = await parseBody(request);
        const siteContent = await getSiteContentMap();
        const result = await ingestWhatsAppPayload(body, siteContent);

        return jsonOk({
            message: 'Webhook processed',
            data: result
        });
    } catch (e) {
        return jsonErr('Webhook ingestion failed: ' + e.message, 500);
    }
}

async function getAdminApprovalSecret() {
    try {
        const { getSecret } = await import('wix-secrets-backend');
        const secret = await getSecret('ANNOUNCEMENTS_ADMIN_SECRET').catch(() => null);
        return secret ? String(secret) : '';
    } catch (_) {
        return '';
    }
}

export async function post_whatsapp_announcement_approve(request) {
    try {
        const body = await parseBody(request);
        const announcementId = String(body.announcementId || '').trim();
        const approve = body.approve !== false;
        const approver = String(body.approver || 'admin');

        if (!announcementId) return jsonErr('announcementId is required', 400);

        const expectedSecret = await getAdminApprovalSecret();
        if (expectedSecret) {
            const provided = (request.headers && (request.headers['x-admin-secret'] || request.headers['X-Admin-Secret'])) || '';
            if (String(provided) !== expectedSecret) return jsonErr('Forbidden', 403);
        }

        const found = await wixData.get('Announcements', announcementId, SA).catch(() => null);
        if (!found) return jsonErr('Announcement not found', 400);

        const updated = {
            ...found,
            active: !!approve,
            status: approve ? 'published' : 'rejected',
            approvedAt: new Date(),
            approvedBy: approver
        };

        await wixData.update('Announcements', updated, SA);

        return jsonOk({
            message: approve ? 'Announcement published' : 'Announcement rejected',
            data: { announcementId, status: updated.status }
        });
    } catch (e) {
        return jsonErr('Approval update failed: ' + e.message, 500);
    }
}

export async function get_whatsapp_announcements(request) {
    try {
        const q = request.query || {};
        const status = String(q.status || '').trim().toLowerCase();
        const limit = Math.min(200, Math.max(1, Number(q.limit || 50)));

        let query = wixData.query('Announcements')
            .eq('source', 'whatsapp')
            .descending('order')
            .limit(limit);

        if (status) query = query.eq('status', status);

        const res = await query.find(SA);
        const items = (res.items || []).map(item => ({
            _id: item._id,
            title: item.title,
            message: item.message,
            priority: item.priority,
            category: item.category,
            source: item.source,
            sourceSender: item.sourceSender || '',
            sourceMessageId: item.sourceMessageId || '',
            status: item.status || (item.active ? 'published' : 'pending_approval'),
            active: item.active !== false,
            pinned: !!item.pinned,
            effectiveOn: item.effectiveOn || null,
            approvedAt: item.approvedAt || null,
            approvedBy: item.approvedBy || null,
            order: item.order || 0
        }));

        return jsonOk({ count: items.length, items });
    } catch (e) {
        return jsonErr('Failed to load WhatsApp announcements: ' + e.message, 500);
    }
}
