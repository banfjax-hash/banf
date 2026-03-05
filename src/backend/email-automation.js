/**
 * ═══════════════════════════════════════════════════════════════
 *  EMAIL AUTOMATION PIPELINE
 *  Flow: New Gmail → Classify Intent → Queue → Route to Agent →
 *        RAG Context → LLM Response → Auto-Send or Queue for Review
 * ═══════════════════════════════════════════════════════════════
 */

import wixData from 'wix-data';
import { fetch as wixFetch } from 'wix-fetch';
import { buildRAGContext } from 'backend/rag-engine';

const SA = { suppressAuth: true };
const HF_API_TOKEN = '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';
const BANF_EMAIL = 'banfjax@gmail.com';
const GOOGLE_CLIENT_ID = '1020178199135-3usrl611ara38i7rhu2ub6sn6g1150ml.apps.googleusercontent.com';
const GOOGLE_CLIENT_SECRET = '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';
const GOOGLE_REFRESH_TOKEN = '1//043SvrPmUfXwUCgYIARAAGAQSNwF-L9IrmO-MD0-4ult4fEofYmx_TDhjylHHdxZ-N3Yqo_-2lIhsmvyiYqhuJJGrZ3JAyZAgLuk';

// ─────────────────────────────────────────
// INTENT CLASSIFICATION (keyword-first, LLM fallback)
// ─────────────────────────────────────────

const INTENT_PATTERNS = [
    { intent: 'event_inquiry',   category: 'events',      patterns: /event|puja|festival|program|function|celebrate|party|gathering|picnic|rsvp|register|ticket/i },
    { intent: 'membership',      category: 'membership',  patterns: /member|membership|join|dues|fee|annual|register|enroll|sign.?up/i },
    { intent: 'payment',         category: 'payment',     patterns: /pay|payment|paid|invoice|receipt|zelle|venmo|check|refund|due|amount|charge/i },
    { intent: 'complaint',       category: 'complaint',   patterns: /complain|complaint|issue|problem|concern|grievance|dissatisfied|unhappy|wrong|mistake|error/i },
    { intent: 'sponsorship',     category: 'sponsorship', patterns: /sponsor|sponsorship|advertis|business|partner|logo|booth|brand/i },
    { intent: 'volunteer',       category: 'volunteer',   patterns: /volunteer|help|assist|support|contribute|serve|committee/i },
    { intent: 'career',          category: 'career',      patterns: /career|job|work|employment|resume|cv|profession|mentor|internship/i },
    { intent: 'publication',     category: 'publication', patterns: /magazine|newsletter|article|publish|write|author|submit|magazine/i },
    { intent: 'contact',         category: 'contact',     patterns: /contact|reach|address|phone|location|where|who/i },
    { intent: 'general_inquiry', category: 'general',     patterns: /question|query|info|information|know|learn|about|what|when|how|why/i }
];

/**
 * Classify an email's intent from subject + body
 */
export function classifyEmailIntent(subject, body) {
    const text = `${subject} ${body}`.toLowerCase();

    for (const { intent, category, patterns } of INTENT_PATTERNS) {
        if (patterns.test(text)) {
            return { intent, category, confidence: 'keyword' };
        }
    }
    return { intent: 'general_inquiry', category: 'general', confidence: 'default' };
}

/**
 * Determine priority: urgent > high > normal > low
 */
export function classifyPriority(subject, body) {
    const text = `${subject} ${body}`.toLowerCase();
    if (/urgent|emergency|asap|immediately|critical|deadline today/i.test(text)) return 'urgent';
    if (/complaint|payment|membership|overdue|cancel/i.test(text)) return 'high';
    if (/question|inquiry|rsvp|register/i.test(text)) return 'normal';
    return 'low';
}

// ─────────────────────────────────────────
// GMAIL ACCESS TOKEN
// ─────────────────────────────────────────

async function getGmailToken() {
    const resp = await wixFetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `grant_type=refresh_token&refresh_token=${GOOGLE_REFRESH_TOKEN}&client_id=${GOOGLE_CLIENT_ID}&client_secret=${GOOGLE_CLIENT_SECRET}`
    });
    const data = await resp.json();
    if (data.error) throw new Error('Gmail token error: ' + data.error_description);
    return data.access_token;
}

// ─────────────────────────────────────────
// GMAIL SEND
// ─────────────────────────────────────────

async function sendGmailReply(to, subject, body, accessToken) {
    const replySubject = subject.startsWith('Re:') ? subject : `Re: ${subject}`;
    const mimeMessage = [
        'From: ' + BANF_EMAIL,
        'To: ' + to,
        'Subject: ' + replySubject,
        'Content-Type: text/plain; charset=utf-8',
        '',
        body
    ].join('\r\n');

    const encoded = btoa(mimeMessage)
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');

    const resp = await wixFetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/send`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ raw: encoded })
    });
    return await resp.json();
}

// ─────────────────────────────────────────
// LLM RESPONSE GENERATION WITH RAG
// ─────────────────────────────────────────

const AGENT_SYSTEM_PROMPTS = {
    event_inquiry: `You are the BANF events coordinator. Answer questions about BANF events, Durga Puja, picnics, and cultural programs. Be helpful, warm, and professional. Provide specific event details from context. If you don't know specific dates, say "please check our website or reply to confirm."`,
    membership: `You are the BANF membership coordinator. Help people join BANF, understand dues ($50/family/year), membership benefits, and registration process. Be welcoming and encouraging.`,
    payment: `You are the BANF treasurer. Help with payment questions, accepted methods (Zelle: banfjax@gmail.com, Venmo: @banfjax, check), receipts, and dues. Be accurate and helpful.`,
    complaint: `You are the BANF Executive Committee liaison. Acknowledge complaints professionally, express that you take feedback seriously, confirm the complaint is logged and will be reviewed within 7 days. Be empathetic but professional.`,
    sponsorship: `You are the BANF sponsorship coordinator. Explain sponsorship tiers (Title $1000+, Gold $500, Silver $250, Bronze $100) and benefits. Be enthusiastic about partnerships.`,
    volunteer: `You are the BANF volunteer coordinator. Help people get involved with BANF committees and events. Explain volunteer opportunities and how to sign up.`,
    career: `You are the BANF career help coordinator. Explain career guidance sessions, mentorship program, and how to get or provide career help.`,
    publication: `You are the BANF media coordinator. Help with newsletter/e-magazine submissions, past issues, and publication schedule.`,
    general: `You are a helpful BANF community assistant. Answer questions about Bengali Association of Northeast Florida using the provided context.`
};

/**
 * Generate an LLM response for an email using RAG context
 */
export async function generateEmailResponse(emailData, agentType) {
    const { from, subject, body } = emailData;
    const { context, sources } = await buildRAGContext(`${subject} ${body}`, { topK: 3, category: agentType !== 'general' ? agentType : undefined });

    const systemPrompt = AGENT_SYSTEM_PROMPTS[agentType] || AGENT_SYSTEM_PROMPTS.general;
    const userPrompt = `${context ? 'KNOWLEDGE BASE CONTEXT:\n' + context + '\n\n---\n\n' : ''}EMAIL FROM: ${from}\nSUBJECT: ${subject}\n\nEMAIL CONTENT:\n${body}\n\nWrite a helpful, professional email response. Sign it as "BANF Team". Keep it under 200 words.`;

    try {
        const resp = await wixFetch('https://router.huggingface.co/featherless-ai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${HF_API_TOKEN}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'meta-llama/Llama-3.1-8B-Instruct',
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userPrompt }
                ],
                max_tokens: 400,
                temperature: 0.3
            })
        });
        const data = await resp.json();
        const responseText = data.choices?.[0]?.message?.content?.trim() || '';
        return { responseText, sources, ragUsed: sources.length > 0 };
    } catch (e) {
        return { responseText: '', sources: [], ragUsed: false, error: e.message };
    }
}

// ─────────────────────────────────────────
// BANF REG CODE EXTRACTOR
// Detects BANF-NM-XX20250623-XXXX pattern in email subject / body
// ─────────────────────────────────────────

const REG_CODE_REGEX = /BANF-(?:NM|RN|EC)-[A-Z]{2}\d{8}-[A-Z0-9]{4}/gi;

export function extractRegCodes(subject, body) {
    const text = `${subject || ''} ${body || ''}`;
    const matches = text.match(REG_CODE_REGEX);
    if (!matches) return [];
    // Deduplicate and uppercase
    return [...new Set(matches.map(m => m.toUpperCase()))];
}

/**
 * Auto-confirm payment for a reg code found in an email
 * Returns { confirmed, regCode, error }
 */
async function autoConfirmPaymentFromEmail(regCode, gmailId, fromEmail) {
    try {
        const result = await wixData.query('MemberRegistrations')
            .eq('regCode', regCode)
            .find({ suppressAuth: true });

        if (!result.items.length) return { confirmed: false, error: 'reg_not_found' };

        const reg = result.items[0];
        if (reg.paymentConfirmed) return { confirmed: false, alreadyConfirmed: true, regCode };

        // Parse amount from email if possible (look for $50 or similar)
        await wixData.update('MemberRegistrations', {
            ...reg,
            paymentConfirmed: true,
            paymentConfirmedAt: new Date(),
            paymentConfirmedBy: 'email_agent',
            paymentGmailId: gmailId || null,
            paymentFrom: fromEmail || null,
            status: 'payment_confirmed'
        }, { suppressAuth: true });

        // Log to Payments collection
        await wixData.insert('Payments', {
            email: reg.email,
            firstName: reg.firstName,
            lastName: reg.lastName,
            amount: reg.amount || 50,
            purpose: 'Membership Renewal',
            method: 'Zelle',
            status: 'paid',
            regCode,
            confirmedBy: 'email_agent',
            confirmedAt: new Date(),
            notes: `Auto-confirmed from email (Gmail ID: ${gmailId || 'N/A'})`
        }, { suppressAuth: true }).catch(() => {});

        return { confirmed: true, regCode, email: reg.email, name: `${reg.firstName} ${reg.lastName}` };
    } catch (e) {
        return { confirmed: false, error: e.message, regCode };
    }
}

// ─────────────────────────────────────────
// MAIN EMAIL PIPELINE
// ─────────────────────────────────────────

/**
 * Process a single inbox email through the automation pipeline
 * 1. Classify intent
 * 2. Check if already in EmailQueue (dedup)
 * 3. Detect BANF reg codes → auto-confirm payment if present
 * 4. Queue it with metadata
 * 5. Generate RAG-powered response
 * 6. Save AutoResponse (pending approval unless flagged autoSend)
 */
export async function processIncomingEmail(inboxMsg) {
    const { gmailId, from, subject, body, receivedAt } = inboxMsg;

    // 1. Dedup check
    try {
        const existing = await wixData.query('EmailQueue').eq('gmailId', gmailId).find(SA);
        if (existing.items.length > 0) return { skipped: true, reason: 'already-queued', gmailId };
    } catch (_) {}

    // 2. Classify
    const { intent, category } = classifyEmailIntent(subject, body || '');
    const priority = classifyPriority(subject, body || '');

    // 2b. BANF Payment Detection — scan for reg codes embedded in the email
    let paymentConfirmResults = [];
    if (intent === 'payment' || /BANF-/i.test(`${subject} ${body}`)) {
        const regCodes = extractRegCodes(subject, body);
        if (regCodes.length > 0) {
            for (const code of regCodes) {
                const confirmResult = await autoConfirmPaymentFromEmail(code, gmailId, from);
                paymentConfirmResults.push(confirmResult);
            }
        }
    }

    // 3. Add to queue
    let queueItem;
    try {
        queueItem = await wixData.insert('EmailQueue', {
            emailId: `EQ-${Date.now()}`,
            gmailId,
            from: from || '',
            subject: subject || '',
            body: (body || '').substring(0, 2000),
            category,
            intent,
            priority,
            status: 'queued',
            agentAssigned: category,
            receivedAt: receivedAt || new Date()
        }, SA);
    } catch (e) {
        return { error: 'Queue insert failed: ' + e.message, gmailId };
    }

    // 4. Generate RAG-powered response
    const { responseText, sources, ragUsed, error: genError } = await generateEmailResponse(
        { from, subject, body: body || '' },
        intent
    );

    if (!responseText || genError) {
        await wixData.update('EmailQueue', { ...queueItem, status: 'generation-failed' }, SA);
        return { queued: true, queueId: queueItem._id, responseGenerated: false, error: genError };
    }

    // 5. Save AutoResponse (pending review by default)
    let autoResponse;
    try {
        autoResponse = await wixData.insert('AutoResponses', {
            emailQueueId: queueItem._id,
            to: from,
            subject: `Re: ${subject}`,
            body: responseText,
            category,
            agentId: intent,
            ragContextUsed: JSON.stringify(sources.map(s => s.title)),
            sent: false,
            approved: false
        }, SA);
    } catch (e) {
        return { queued: true, queueId: queueItem._id, responseGenerated: true, approved: false, saveError: e.message };
    }

    await wixData.update('EmailQueue', { ...queueItem, status: 'pending-review', responseId: autoResponse._id, processedAt: new Date() }, SA);

    return {
        queued: true,
        queueId: queueItem._id,
        intent,
        category,
        priority,
        responseGenerated: true,
        responseId: autoResponse._id,
        ragSources: sources.length,
        ragUsed,
        paymentConfirmResults: paymentConfirmResults.length > 0 ? paymentConfirmResults : undefined
    };
}

/**
 * Scan recent inbox messages and queue unprocessed ones
 * Called by the polling trigger or admin manually
 */
export async function runEmailAutomationScan(maxMessages = 50) {
    const results = { scanned: 0, queued: 0, skipped: 0, errors: [] };

    let processed;
    try {
        const inboxItems = await wixData.query('InboxMessages')
            .descending('receivedAt')
            .limit(maxMessages)
            .find(SA);

        for (const msg of inboxItems.items) {
            results.scanned++;
            try {
                const r = await processIncomingEmail(msg);
                if (r.skipped) results.skipped++;
                else if (r.queued) results.queued++;
                else if (r.error) results.errors.push(r.error);
            } catch (e) {
                results.errors.push(`msg ${msg.gmailId}: ${e.message}`);
            }
        }
    } catch (e) {
        results.errors.push('Scan failed: ' + e.message);
    }

    return results;
}

/**
 * Approve and send a pending AutoResponse
 */
export async function approveAndSendResponse(responseId, approvedBy = 'admin') {
    const response = await wixData.get('AutoResponses', responseId, SA);
    if (!response) throw new Error('AutoResponse not found: ' + responseId);
    if (response.sent) return { alreadySent: true };

    // Send via Gmail
    const accessToken = await getGmailToken();
    const sendResult = await sendGmailReply(response.to, response.subject, response.body, accessToken);

    if (sendResult.id) {
        await wixData.update('AutoResponses', {
            ...response,
            sent: true,
            sentAt: new Date(),
            approved: true,
            approvedBy
        }, SA);

        // Update queue item status
        const queueItems = await wixData.query('EmailQueue').eq('responseId', responseId).find(SA);
        for (const qi of queueItems.items) {
            await wixData.update('EmailQueue', { ...qi, status: 'responded' }, SA);
        }

        return { sent: true, gmailSentId: sendResult.id };
    } else {
        return { sent: false, error: sendResult };
    }
}

/**
 * Get email queue dashboard data
 */
export async function getEmailQueueDashboard(filters = {}) {
    const { status, category, limit = 50, skip = 0 } = filters;

    let q = wixData.query('EmailQueue').descending('receivedAt').skip(skip).limit(limit);
    if (status) q = q.eq('status', status);
    if (category) q = q.eq('category', category);

    const result = await q.find(SA);

    // Count by status
    const allItems = await wixData.query('EmailQueue').find(SA);
    const statusCounts = {};
    for (const item of allItems.items) {
        statusCounts[item.status] = (statusCounts[item.status] || 0) + 1;
    }

    return {
        items: result.items,
        total: result.totalCount,
        statusCounts,
        pendingReview: statusCounts['pending-review'] || 0
    };
}

// ─────────────────────────────────────────
// DIRECT GMAIL SEND  (bypasses Wix Triggered Emails)
// Use for system notifications, welcome emails, role grants, etc.
// ─────────────────────────────────────────

/**
 * Send an HTML email via Gmail API directly.
 * Does NOT require a Wix Triggered Email template.
 * @param {string} to - Recipient email address
 * @param {string} toName - Recipient display name (ASCII chars only for MIME headers)
 * @param {string} subject - Email subject
 * @param {string} htmlBody - HTML body (should be ASCII-safe; use HTML entities for non-ASCII)
 * @returns {{ success: boolean, gmailId?: string, error?: string }}
 */
export async function sendDirectEmail(to, toName, subject, htmlBody) {
    try {
        const accessToken = await getGmailToken();

        // Build RFC 2822 MIME message (keep headers ASCII-safe)
        const safeName = (toName || '').replace(/[^\x20-\x7E]/g, '');
        const toHeader = safeName ? `${safeName} <${to}>` : to;
        const safeSubject = (subject || '').replace(/[^\x20-\x7E]/g, '');

        // Encode htmlBody into quoted-printable-friendly base64
        // For ASCII-only HTML this is fine; non-ASCII in body is encoded as HTML entities by caller
        const mimeLines = [
            `From: BANF <${BANF_EMAIL}>`,
            `To: ${toHeader}`,
            `Subject: ${safeSubject}`,
            'MIME-Version: 1.0',
            'Content-Type: text/html; charset=utf-8',
            'Content-Transfer-Encoding: base64',
            '',
            btoa(unescape(encodeURIComponent(htmlBody)))
        ];
        const mimeMessage = mimeLines.join('\r\n');
        const encoded = btoa(mimeMessage)
            .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

        const resp = await wixFetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ raw: encoded })
        });
        const data = await resp.json();
        if (data.error) throw new Error(data.error.message || JSON.stringify(data.error));

        // Log to SentEmails (best effort)
        await wixData.insert('SentEmails', {
            to, subject: safeSubject,
            body: htmlBody.replace(/<[^>]+>/g, '').substring(0, 500),
            sentAt: new Date(), sentBy: BANF_EMAIL,
            type: 'gmail-direct', status: 'sent', gmailId: data.id
        }, SA).catch(() => {});

        return { success: true, gmailId: data.id };
    } catch (e) {
        // Log failure
        await wixData.insert('SentEmails', {
            to, subject: (subject || ''), body: '',
            sentAt: new Date(), sentBy: BANF_EMAIL,
            type: 'gmail-direct', status: 'failed', error: e.message
        }, SA).catch(() => {});
        return { success: false, error: e.message };
    }
}
