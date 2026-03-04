/**
 * ===============================================================
 *  BANF SURVEY MODULE   -   v1.0
 * ===============================================================
 *
 *  Collections used:
 *    BanfSurveys        -  survey definitions + questions
 *    SurveyRecipients   -  who was sent (token tracking; NOT linked to responses)
 *    SurveyResponses    -  fully anonymised responses
 *    SurveyAggregates   -  LLM-processed aggregated results
 *    SurveyEscalations  -  flagged content -> escalated to president
 *
 *  Anonymity model:
 *    * Each recipient gets a 1-time token in their email link
 *    * Token hash stored in SurveyRecipients (to track who responded)
 *    * SurveyResponses stores ONLY an anonymous UUID  -  NO member ID / email
 *    * Admin can see WHO has/hasn't responded but CANNOT correlate
 *      a specific response back to a specific person
 *
 *  LLM Processing (text answers):
 *    * Sentiment score (-1 to +1), normalised to 0-1
 *    * Escalation detection: member name mentions, abusive language,
 *      confidential/defamatory content -> flagged to president
 *
 *  EC Test Members (confirm emails before sending):
 *    Ranadhir Ghosh, Moumita Ghosh, Partha Mukhopadhyay,
 *    Rajanya Ghosh, Sumanta Ghosh, Amit Chandak,
 *    Rwiti Chowdhury, Soumyajit Dutta
 * ===============================================================
 */

import { ok, badRequest, serverError, forbidden } from 'wix-http-functions';
import wixData from 'wix-data';
import { collections as wixCollections } from 'wix-data.v2';
import { fetch as wixFetch } from 'wix-fetch';

const SA = { suppressAuth: true };
const HF_API_TOKEN = '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';
const HF_MODEL = 'meta-llama/Llama-3.1-8B-Instruct';
const HF_URL = 'https://router.huggingface.co/featherless-ai/v1/chat/completions';
const BANF_EMAIL = 'banfjax@gmail.com';
const BANF_ORG = 'Bengali Association of North Florida (BANF)';
// President receives all escalations
const PRESIDENT_EMAIL = 'ranadhir.ghosh@gmail.com';
const PRESIDENT_NAME = 'Ranadhir Ghosh';
// Base URL for survey form (served by get_survey_form endpoint)
const SURVEY_FORM_URL = 'https://www.jaxbengali.org/survey.html';

// -------------------------------------------------------------
// GMAIL OAuth (mirrors evite module)
// -------------------------------------------------------------
const GOOGLE_CLIENT_ID = '1020178199135-3usrl611ara38i7rhu2ub6sn6g1150ml.apps.googleusercontent.com';
const GOOGLE_CLIENT_SECRET = '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';
const GOOGLE_REFRESH_TOKEN = '1//04iXClX5dKpqhCgYIARAAGAQSNwF-L9IrCtEUhuup9COlH5wnvGtozgReO4E5ILylE9Jq4f8vw1YUXDT_ysiHcJ89g-PA96eh8Ko';

async function getGmailToken() {
    // Use hardcoded refresh token directly (verified to have gmail.send scope)
    // Matches the proven pattern from comms-correction.js
    const resp = await wixFetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `client_id=${GOOGLE_CLIENT_ID}&client_secret=${GOOGLE_CLIENT_SECRET}&refresh_token=${GOOGLE_REFRESH_TOKEN}&grant_type=refresh_token`
    });
    const data = await resp.json();
    if (data.access_token) return data.access_token;
    // Fallback to alternate client credentials
    const resp2 = await wixFetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `client_id=407408718192.apps.googleusercontent.com&client_secret=kd-_2_AUosoGGTNYyMJiFL3j&refresh_token=${GOOGLE_REFRESH_TOKEN}&grant_type=refresh_token`
    });
    const data2 = await resp2.json();
    if (data2.access_token) return data2.access_token;
    throw new Error('Gmail token failed: ' + (data.error_description || data.error || 'unknown'));
}

// GET /survey_gmail_check  -  diagnostic: check Gmail token scopes
export async function get_survey_gmail_check(request) {
    try {
        const token = await getGmailToken();
        const infoResp = await wixFetch(`https://oauth2.googleapis.com/tokeninfo?access_token=${encodeURIComponent(token)}`);
        const info = await infoResp.json();
        return jsonOk({
            hasToken: true,
            scopes: info.scope || 'unknown',
            hasSendScope: (info.scope || '').includes('gmail.send') || (info.scope || '').includes('mail.google.com'),
            email: info.email || 'unknown',
            expiresIn: info.expires_in
        });
    } catch (e) {
        return jsonOk({ hasToken: false, error: e.message });
    }
}

function mimeEncodeSubject(s) {
    // RFC 2047 encoded-word for non-ASCII subjects
    if (/[^\x20-\x7E]/.test(s)) {
        const encoded = unescape(encodeURIComponent(s));
        let b64 = '';
        for (let i = 0; i < encoded.length; i++) b64 += String.fromCharCode(encoded.charCodeAt(i));
        return '=?UTF-8?B?' + btoa(b64) + '?=';
    }
    return s;
}

function makeRawEmail(to, toName, subject, bodyText) {
    const raw = [
        `From: ${BANF_ORG} <${BANF_EMAIL}>`,
        `To: ${toName} <${to}>`,
        `Subject: ${mimeEncodeSubject(subject)}`,
        `MIME-Version: 1.0`,
        `Content-Type: text/html; charset=UTF-8`,
        '',
        bodyText
    ].join('\r\n');
    return btoa(unescape(encodeURIComponent(raw)))
        .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function sendGmail(to, toName, subject, htmlBody, gmailToken) {
    const raw = makeRawEmail(to, toName, subject, htmlBody);
    const r = await wixFetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${gmailToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ raw })
    });
    const d = await r.json();
    if (d.error) throw new Error('Gmail send error: ' + (d.error.message || JSON.stringify(d.error)));
    return d.id;
}

// -------------------------------------------------------------
// EC TEST MEMBERS
// Update emails before first live send
// -------------------------------------------------------------
const EC_TEST_MEMBERS = [
    { name: 'Ranadhir Ghosh',       email: 'ranadhir.ghosh@gmail.com',       role: 'President',         confirmed: true  },
    { name: 'Moumita Ghosh',        email: 'banfjax@gmail.com',               role: 'Vice President',    confirmed: true  },
    { name: 'Partha Mukhopadhyay',  email: 'partha.bhdm@gmail.com',           role: 'Secretary',         confirmed: true  },
    { name: 'Rajanya Ghosh',        email: 'rajanya.ghosh@gmail.com',         role: 'Joint Secretary',   confirmed: true  },
    { name: 'Sumanta Ghosh',        email: 'sumanta.ghosh@gmail.com',         role: 'Cultural Secretary',confirmed: true  },
    { name: 'Amit Chandak',         email: 'amit.chandak@gmail.com',          role: 'Treasurer',         confirmed: true  },
    { name: 'Rwiti Chowdhury',      email: 'rwiti.chowdhury@gmail.com',       role: 'EC Member',         confirmed: true  },
    { name: 'Soumyajit Dutta',      email: 'soumyajit.dutta@gmail.com',       role: 'EC Member',         confirmed: true  },
];

// -------------------------------------------------------------
// SIMPLE DETERMINISTIC HASH (no crypto module in Wix)
// -------------------------------------------------------------
function simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const c = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + c;
        hash |= 0;
    }
    return Math.abs(hash).toString(36).padStart(8, '0');
}

function makeToken(surveyId, email, salt) {
    return simpleHash(surveyId + email + salt + Date.now().toString(36));
}

function hashToken(token) {
    return 'th_' + simpleHash(token + 'banf_survey_2026');
}

function makeAnonId() {
    return 'anon_' + Math.random().toString(36).substring(2, 10) + '_' + Date.now().toString(36);
}

// -------------------------------------------------------------
// HTTP helpers
// -------------------------------------------------------------
function jsonOk(data) {
    return ok({
        body: JSON.stringify({ success: true, ...data }),
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
}
function jsonErr(msg, code = 400) {
    const fn = code >= 500 ? serverError : (code === 403 ? forbidden : badRequest);
    return fn({
        body: JSON.stringify({ success: false, error: msg }),
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
}
function htmlOk(html) {
    return ok({
        body: Buffer.from(html, 'utf-8'),
        headers: {
            'Content-Type': 'text/html; charset=UTF-8',
            'Access-Control-Allow-Origin': '*'
        }
    });
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
function getQP(req, key) {
    return (req.query && req.query[key]) || '';
}

// -------------------------------------------------------------
// LLM SENTIMENT + ESCALATION ANALYSIS
// -------------------------------------------------------------
const EC_MEMBER_NAMES = EC_TEST_MEMBERS.map(m => m.name.split(' ')[0].toLowerCase());

async function llmAnalyzeText(questionText, answerText) {
    if (!answerText || answerText.trim().length < 3) {
        return { sentiment: 0.5, sentimentLabel: 'neutral', escalate: false, escalateReason: '', normalized: 0.5 };
    }

    const prompt = `You are an anonymous survey response analyzer for a non-profit community organization (BANF).
Analyze the following survey response and return ONLY a JSON object.

Survey question: "${questionText}"
Response text: "${answerText}"

Return ONLY this JSON (no prose, no markdown):
{
  "sentiment": <float -1.0 (very negative) to 1.0 (very positive)>,
  "sentimentLabel": "positive" | "neutral" | "negative",
  "escalate": <boolean  -  true if response contains: specific member name accusations, personal attacks, abusive language, defamatory statements, harassment, or highly confidential allegations about individuals>,
  "escalateReason": "<brief reason if escalate=true, else empty string>",
  "themes": ["<1-3 short theme keywords>"],
  "normalized": <float 0.0 to 1.0, where 0=most negative, 0.5=neutral, 1=most positive>
}

Escalation triggers (must be true to set escalate=true):
- Names any specific individual with accusations or defamatory claims
- Contains abusive, threatening, or harassing language
- Makes serious unverified allegations about a named person`;

    try {
        const resp = await wixFetch(HF_URL, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${HF_API_TOKEN}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: HF_MODEL,
                messages: [{ role: 'user', content: prompt }],
                max_tokens: 200,
                temperature: 0.1
            })
        });
        const result = await resp.json();
        const raw = (result.choices?.[0]?.message?.content || '').trim()
            .replace(/^```json?\s*/i, '').replace(/```\s*$/i, '').trim();
        const parsed = JSON.parse(raw);
        return {
            sentiment: Math.max(-1, Math.min(1, parseFloat(parsed.sentiment) || 0)),
            sentimentLabel: parsed.sentimentLabel || 'neutral',
            escalate: !!parsed.escalate,
            escalateReason: String(parsed.escalateReason || '').substring(0, 200),
            themes: Array.isArray(parsed.themes) ? parsed.themes.slice(0, 3) : [],
            normalized: Math.max(0, Math.min(1, parseFloat(parsed.normalized) || 0.5))
        };
    } catch (e) {
        // Fallback: simple keyword check
        const lower = answerText.toLowerCase();
        const abusiveWords = ['stupid', 'idiot', 'hate', 'damn', 'corrupt', 'liar', 'cheat', 'useless', 'terrible', 'horrible'];
        const hasAbusive = abusiveWords.some(w => lower.includes(w));
        const hasName = EC_MEMBER_NAMES.some(n => lower.includes(n));
        const negative = lower.includes('bad') || lower.includes('poor') || lower.includes('worst') || hasAbusive;
        const positive = lower.includes('great') || lower.includes('excellent') || lower.includes('good') || lower.includes('wonderful');
        const sentiment = positive ? 0.6 : negative ? -0.5 : 0;
        return {
            sentiment,
            sentimentLabel: sentiment > 0.2 ? 'positive' : sentiment < -0.2 ? 'negative' : 'neutral',
            escalate: hasAbusive && hasName,
            escalateReason: hasAbusive && hasName ? 'Contains abusive language with member name' : '',
            themes: [],
            normalized: (sentiment + 1) / 2
        };
    }
}

// -------------------------------------------------------------
// AGGREGATE COMPUTATION
// -------------------------------------------------------------
function computeNumericAggregate(values) {
    if (!values.length) return { avg: 0, min: 0, max: 0, count: 0, distribution: {} };
    const nums = values.map(Number).filter(v => !isNaN(v));
    if (!nums.length) return { avg: 0, min: 0, max: 0, count: 0, distribution: {} };
    const sum = nums.reduce((a, b) => a + b, 0);
    const distribution = {};
    nums.forEach(v => { distribution[v] = (distribution[v] || 0) + 1; });
    return {
        avg: Math.round((sum / nums.length) * 100) / 100,
        min: Math.min(...nums),
        max: Math.max(...nums),
        count: nums.length,
        distribution
    };
}

// -------------------------------------------------------------
// ESCALATION HANDLER
// -------------------------------------------------------------
async function handleEscalation(surveyId, surveyTitle, questionText, answerText, reason, gmailToken) {
    // Store escalation record (anonymised  -  no member ID)
    const escRecord = await safeInsert('SurveyEscalations', {
        surveyId,
        surveyTitle,
        questionText: questionText.substring(0, 200),
        flaggedContent: answerText.substring(0, 500),
        escalationReason: reason,
        status: 'pending_review',
        escalatedAt: new Date(),
        reviewedBy: '',
        reviewedAt: null,
        resolution: ''
    }).catch(() => null);

    // Email president
    try {
        const subject = `[BANF Survey Alert] Escalation Required  -  ${surveyTitle}`;
        const html = `
<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px">
  <div style="background:#c0392b;color:white;padding:15px;border-radius:4px 4px 0 0">
    <h2 style="margin:0">[!] Survey Escalation Alert</h2>
    <p style="margin:5px 0 0">Requires President Review</p>
  </div>
  <div style="background:#fff;border:1px solid #ddd;border-top:none;padding:20px;border-radius:0 0 4px 4px">
    <p>Dear ${PRESIDENT_NAME},</p>
    <p>A survey response has been automatically flagged for escalation and requires your review.</p>
    <table style="width:100%;border-collapse:collapse;margin:15px 0">
      <tr style="background:#f5f5f5"><td style="padding:8px;font-weight:bold;width:35%">Survey</td><td style="padding:8px">${surveyTitle}</td></tr>
      <tr><td style="padding:8px;font-weight:bold">Question</td><td style="padding:8px">${questionText}</td></tr>
      <tr style="background:#fff3cd"><td style="padding:8px;font-weight:bold">Reason Flagged</td><td style="padding:8px;color:#856404">${reason}</td></tr>
    </table>
    <div style="background:#fee;border:1px solid #f5c6cb;padding:15px;border-radius:4px;margin:15px 0">
      <strong>Flagged Content (anonymised response):</strong>
      <p style="margin:10px 0 0;font-style:italic">"${answerText.substring(0, 300)}"</p>
    </div>
    <p style="font-size:12px;color:#666">
      This response has been stored anonymously. The identity of the respondent is protected by the survey 
      anonymisation system. Please review and take appropriate action through the BANF Survey Admin Panel.
    </p>
    <p>Reference ID: ${escRecord ? escRecord._id : 'unknown'}</p>
    <p>Warm regards,<br><strong>BANF Survey System</strong></p>
  </div>
</div>`;
        await sendGmail(PRESIDENT_EMAIL, PRESIDENT_NAME, subject, html, gmailToken);
    } catch (_) {}

    return escRecord;
}

// -------------------------------------------------------------
// COLLECTION AUTO-PROVISIONING
// ensureCollections() is called automatically before any write.
// Uses the same multi-strategy pattern as banf-finance-api.js:
//   1. probe with query (already exists?) -> skip
//   2. wix-data.v2 createCollection (SDK  -  live context)
//   3. wixData.save  (some envs auto-create on save)
//   4. wixData.insert (auto-create on insert)
//   5. Wix REST API fallback
// After creation, a short yield allows Wix to register the schema.
// -------------------------------------------------------------
const SURVEY_COLLECTIONS = [
    'BanfSurveys', 'SurveyRecipients',
    'SurveyResponses', 'SurveyAggregates', 'SurveyEscalations'
];
const WIX_ADMIN_TOKEN = 'IST.eyJraWQiOiJQb3pIX2FDMiIsImFsZyI6IlJTMjU2In0.eyJkYXRhIjoie1wiaWRcIjpcIjE5M2U1ZTQ4LWIxY2YtNDFkNi05NDI2LWU5Y2I4MDczYWY2NlwiLFwiaWRlbnRpdHlcIjp7XCJ0eXBlXCI6XCJhcHBsaWNhdGlvblwiLFwiaWRcIjpcIjQyMzEwNDk4LTQ2MTItNDY0Mi1iMzIyLWI5Zjk0ZWQxYzRjNFwifSxcInRlbmFudFwiOntcInR5cGVcIjpcImFjY291bnRcIixcImlkXCI6XCJjNjJmOTQzYy0yYWZiLTQ2YjctYTM4MS1mYTczNTJmY2NmYjJcIn19IiwiaWF0IjoxNzcxNjkxOTk3fQ.GVx8jeX6lw2qF3cTWQJX4hWVs_unIkBJAgywR_sbASHyJhs95w6euuWIRW5CfQ_PSZmCKHw6ma5IpQawGhR79hYUi46_49yAg9fCklP60iJJlPLKdLj6NtOVIoYoc-WsG8nOW_9qo1om08YA-Qh_5O-oZv6oRW2gk7C2eOF5E1pjt0CgmVIRK8z5HvVqlXYftO9NtaSfHh9vhSVPkxVU6jp1OJBsR_UdcdL6Rpiv-bJx0hKJJOfNJMc89oEBiCaAJ4No65-FsGouo2yIYUCsDAQTtBk9rWh3cH8_n-ts0WK57kdtXVKRqQ5g7ch5usUdFAUBTSaviGXpExj5VoTVKQ';

let _collectionsEnsured = false;

async function ensureCollections() {
    if (_collectionsEnsured) return;
    const status = {};
    for (const col of SURVEY_COLLECTIONS) {
        // 1. Already exists?
        try {
            await wixData.query(col).limit(1).find(SA);
            status[col] = 'exists'; continue;
        } catch (e) {
            if (!e.message || !e.message.includes('WDE0025')) {
                status[col] = 'probe-error:' + e.message; continue;
            }
        }
        let lastErr = '';
        // 2. wix-data.v2 SDK  -  if available in this Wix context
        try {
            if (typeof wixCollections.createCollection === 'function') {
                await wixCollections.createCollection({
                    collection: {
                        id: col, displayName: col,
                        permissions: {
                            read:   { roles: ['ADMIN'] },
                            insert: { roles: ['ADMIN'] },
                            update: { roles: ['ADMIN'] },
                            remove: { roles: ['ADMIN'] }
                        }
                    }
                });
                status[col] = 'created-v2'; continue;
            } else { lastErr = 'v2:createCollection not available'; }
        } catch (e2) { lastErr = 'v2:' + e2.message; }
        // 3. wixData.save (some Wix environments auto-create on save)
        try {
            const saved = await wixData.save(col, { _init: true, ts: new Date() }, SA);
            if (saved && saved._id) {
                await wixData.remove(col, saved._id, SA).catch(() => {});
                status[col] = 'created-save'; continue;
            }
        } catch (e3) { lastErr += '|save:' + e3.message; }
        // 4. wixData.insert
        try {
            const ins = await wixData.insert(col, { _init: true, ts: new Date() }, SA);
            if (ins && ins._id) {
                await wixData.remove(col, ins._id, SA).catch(() => {});
                status[col] = 'created-insert'; continue;
            }
        } catch (e4) { lastErr += '|insert:' + e4.message; }
        status[col] = 'failed:' + lastErr;
    }
    // Brief yield so Wix can register newly-created schemas before first write
    await new Promise(r => setTimeout(r, 800));
    _collectionsEnsured = Object.values(status).every(s => s.startsWith('exists') || s.startsWith('created'));
    return status;
}

// Helper: insert with auto-provision-and-retry
async function safeInsert(collection, data) {
    try {
        return await wixData.insert(collection, data, SA);
    } catch (e) {
        if (e.message && e.message.includes('WDE0025')) {
            _collectionsEnsured = false;
            await ensureCollections();
            return await wixData.insert(collection, data, SA);
        }
        throw e;
    }
}

// POST /survey_setup  -  manual trigger; also called automatically on first use
export async function post_survey_setup(request) {
    _collectionsEnsured = false; // force re-probe
    const status = await ensureCollections();
    const allReady = status && Object.values(status).every(s => s.startsWith('exists') || s.startsWith('created'));
    return jsonOk({ message: allReady ? '[OK] All survey collections ready.' : '[!] Some collections could not be provisioned.', collections: status });
}
export function options_survey_setup(request) { return handleCors(); }

// -------------------------------------------------------------
// 1. CREATE SURVEY
// POST /survey_create
// Body: { title, description, questions[], targetGroup? }
// questions[]: { questionText, answerType, options?, required?, order? }
// answerType: rating_1_5 | rating_1_10 | nps | yes_no | multiple_choice | text | number
// -------------------------------------------------------------
export async function post_survey_create(request) {
    try {
        const body = await parseBody(request);
        const { title, description = '', questions = [], targetGroup = 'ec_members' } = body;
        if (!title) return jsonErr('Missing title');
        if (!questions.length) return jsonErr('At least one question required');

        // Validate + normalise questions
        const validTypes = ['rating_1_5', 'rating_1_10', 'nps', 'yes_no', 'multiple_choice', 'text', 'number'];
        const normQ = questions.map((q, i) => ({
            questionId: 'q_' + (i + 1),
            questionText: String(q.questionText || '').trim(),
            answerType: validTypes.includes(q.answerType) ? q.answerType : 'text',
            options: q.answerType === 'multiple_choice' ? (q.options || []) : [],
            required: !!q.required,
            order: q.order !== undefined ? q.order : i + 1
        }));

        const invalidQ = normQ.find(q => !q.questionText);
        if (invalidQ) return jsonErr('Question at position ' + normQ.indexOf(invalidQ) + ' has empty text');

        await ensureCollections();
        const survey = await safeInsert('BanfSurveys', {
            title: title.trim(),
            description,
            questions: normQ,
            targetGroup,
            status: 'draft',
            createdAt: new Date(),
            createdBy: (request.headers && request.headers['x-user-email']) || 'admin',
            recipientCount: 0,
            responseCount: 0,
            sentAt: null,
            closedAt: null
        }, SA);

        return jsonOk({ message: 'Survey created', surveyId: survey._id, title: survey.title, questionCount: normQ.length });
    } catch (e) {
        return jsonErr('survey_create failed: ' + e.message, 500);
    }
}
export function options_survey_create(request) { return handleCors(); }

// -------------------------------------------------------------
// 2. LIST SURVEYS
// GET /survey_list
// -------------------------------------------------------------
export async function get_survey_list(request) {
    try {
        const res = await wixData.query('BanfSurveys').descending('createdAt').limit(50).find(SA).catch(() => ({ items: [] }));
        return jsonOk({ surveys: res.items.map(s => ({
            surveyId: s._id,
            title: s.title,
            status: s.status,
            questionCount: (s.questions || []).length,
            recipientCount: s.recipientCount || 0,
            responseCount: s.responseCount || 0,
            createdAt: s.createdAt,
            sentAt: s.sentAt,
            closedAt: s.closedAt
        })), total: res.items.length });
    } catch (e) {
        return jsonErr(e.message, 500);
    }
}
export function options_survey_list(request) { return handleCors(); }

// -------------------------------------------------------------
// 3. GET SURVEY DETAIL (admin)
// GET /survey_detail?surveyId=xxx
// -------------------------------------------------------------
export async function get_survey_detail(request) {
    try {
        const surveyId = getQP(request, 'surveyId');
        if (!surveyId) return jsonErr('Missing surveyId');
        const survey = await wixData.get('BanfSurveys', surveyId, SA).catch(() => null);
        if (!survey) return jsonErr('Survey not found');
        return jsonOk({ survey });
    } catch (e) {
        return jsonErr(e.message, 500);
    }
}
export function options_survey_detail(request) { return handleCors(); }

// -------------------------------------------------------------
// 4. GET EC TEST MEMBERS LIST
// GET /survey_test_members
// -------------------------------------------------------------
export async function get_survey_test_members(request) {
    return jsonOk({ members: EC_TEST_MEMBERS });
}
export function options_survey_test_members(request) { return handleCors(); }

// -------------------------------------------------------------
// 5. SEND SURVEY
// POST /survey_send
// Body: { surveyId, recipientType?, customEmails? }
// recipientType: 'ec_members' | 'confirmed_ec' | 'custom'
// customEmails: [{ name, email }]
// -------------------------------------------------------------
export async function post_survey_send(request) {
    try {
        const body = await parseBody(request);
        const { surveyId, recipientType = 'ec_members', customEmails = [] } = body;
        if (!surveyId) return jsonErr('Missing surveyId');

        const survey = await wixData.get('BanfSurveys', surveyId, SA).catch(() => null);
        if (!survey) return jsonErr('Survey not found');
        if (survey.status === 'closed') return jsonErr('Survey is closed');

        // Determine recipients
        let recipients = [];
        if (recipientType === 'confirmed_ec') {
            recipients = EC_TEST_MEMBERS.filter(m => m.confirmed);
        } else if (recipientType === 'custom' && customEmails.length) {
            recipients = customEmails;
        } else {
            recipients = EC_TEST_MEMBERS;
        }

        const gmailToken = await getGmailToken();
        const salt = Date.now().toString(36);
        const sent = [], failed = [];

        for (const member of recipients) {
            try {
                const token = makeToken(surveyId, member.email, salt);
                const tokenHash = hashToken(token);
                const surveyLink = `${SURVEY_FORM_URL}?token=${token}&sid=${surveyId}`;

                // Check if already sent
                const existing = await wixData.query('SurveyRecipients')
                    .eq('surveyId', surveyId).eq('email', member.email)
                    .find(SA).catch(() => ({ items: [] }));
                if (existing.items.length > 0) {
                    sent.push({ name: member.name, email: member.email, status: 'already_sent' });
                    continue;
                }

                // Build email HTML
                const html = buildSurveyInviteEmail(member.name, survey.title, survey.description, surveyLink);

                await sendGmail(member.email, member.name, `[BANF] ${survey.title}  -  Survey Invitation`, html, gmailToken);

                // Store recipient with tokenHash ONLY (not the token itself)
                await safeInsert('SurveyRecipients', {
                    surveyId,
                    surveyTitle: survey.title,
                    name: member.name,
                    email: member.email,
                    role: member.role || '',
                    tokenHash,
                    sentAt: new Date(),
                    opened: false,
                    submitted: false,
                    submittedAt: null
                });

                sent.push({ name: member.name, email: member.email, status: 'sent' });
            } catch (e) {
                failed.push({ name: member.name, email: member.email, error: e.message });
            }
        }

        // Update survey status
        await wixData.update('BanfSurveys', {
            ...survey,
            status: 'active',
            sentAt: new Date(),
            recipientCount: (survey.recipientCount || 0) + sent.filter(s => s.status === 'sent').length
        }, SA).catch(() => {});

        return jsonOk({ message: 'Survey sent', sent: sent.length, failed: failed.length, details: { sent, failed } });
    } catch (e) {
        return jsonErr('survey_send failed: ' + e.message, 500);
    }
}
export function options_survey_send(request) { return handleCors(); }

// -------------------------------------------------------------
// 6. GET SURVEY FORM (HTML  -  served to member via link)
// GET /survey_form?token=xxx&sid=surveyId
// Returns a full HTML page with the survey form
// -------------------------------------------------------------
export async function get_survey_form(request) {
    try {
        const token = getQP(request, 'token');
        const surveyId = getQP(request, 'sid');

        if (!token || !surveyId) return htmlOk(errorPage('Invalid survey link. The link may be missing required parameters.'));

        const survey = await wixData.get('BanfSurveys', surveyId, SA).catch(() => null);
        if (!survey) return htmlOk(errorPage('Survey not found. It may have been deleted.'));
        if (survey.status === 'closed') return htmlOk(errorPage('This survey is now closed. Thank you for your interest!'));

        // Check if already submitted (by tokenHash)
        const th = hashToken(token);
        const recipientR = await wixData.query('SurveyRecipients')
            .eq('tokenHash', th).eq('surveyId', surveyId)
            .find(SA).catch(() => ({ items: [] }));

        if (recipientR.items.length > 0 && recipientR.items[0].submitted) {
            return htmlOk(alreadySubmittedPage(survey.title));
        }

        // Mark as opened
        if (recipientR.items.length > 0) {
            await wixData.update('SurveyRecipients', { ...recipientR.items[0], opened: true }, SA).catch(() => {});
        }

        return htmlOk(buildSurveyFormPage(survey, token));
    } catch (e) {
        return htmlOk(errorPage('An error occurred loading the survey: ' + e.message));
    }
}
export function options_survey_form(request) { return handleCors(); }

// -- 6b. GET SURVEY FORM DATA (JSON)  -  for GitHub Pages SPA client ----------
// GET /survey_form_data?token=...&sid=...
// Returns JSON with survey title, description, questions + token validation.
// Used by survey.html (GitHub Pages) since Wix forces application/json anyway.
export async function get_survey_form_data(request) {
    try {
        const token   = getQP(request, 'token');
        const surveyId = getQP(request, 'sid');
        if (!token || !surveyId) return jsonErr('Missing token or sid');

        const survey = await wixData.get('BanfSurveys', surveyId, SA).catch(() => null);
        if (!survey) return jsonErr('Survey not found', 404);
        if (survey.status === 'closed') return jsonErr('Survey is closed');

        const tokenHash = hashToken(token);
        const recipR = await wixData.query('SurveyRecipients')
            .eq('surveyId', surveyId).eq('tokenHash', tokenHash).limit(1).find(SA).catch(() => ({ items: [] }));
        if (recipR.items.length === 0) return jsonErr('Invalid or expired survey link', 403);
        const recip = recipR.items[0];
        if (recip.submitted) return jsonErr('Already submitted');

        // Mark opened
        if (!recip.opened) {
            await wixData.update('SurveyRecipients', { ...recip, opened: true, openedAt: new Date() }, SA).catch(() => {});
        }

        return jsonOk({
            survey: { id: survey._id, title: survey.title, description: survey.description, status: survey.status },
            questions: survey.questions || survey.generatedQuestions || [],
            recipient: { name: recip.name, role: recip.role }
        });
    } catch (e) {
        return jsonErr(e.message, 500);
    }
}
export function options_survey_form_data(request) { return handleCors(); }

// -------------------------------------------------------------
// 7. SUBMIT SURVEY RESPONSE
// POST /survey_submit
// Body: { token, surveyId, answers: [{ questionId, answer }] }
// -------------------------------------------------------------
export async function post_survey_submit(request) {
    try {
        const body = await parseBody(request);
        const { token, surveyId, answers = [] } = body;
        if (!token || !surveyId) return jsonErr('Missing token or surveyId');
        if (!answers.length) return jsonErr('No answers provided');

        const survey = await wixData.get('BanfSurveys', surveyId, SA).catch(() => null);
        if (!survey) return jsonErr('Survey not found');
        if (survey.status === 'closed') return jsonErr('Survey is closed');

        // Validate token (find recipient by tokenHash)
        const th = hashToken(token);
        const recipientR = await wixData.query('SurveyRecipients')
            .eq('tokenHash', th).eq('surveyId', surveyId)
            .find(SA).catch(() => ({ items: [] }));

        if (recipientR.items.length === 0) return jsonErr('Invalid or expired survey token', 403);
        if (recipientR.items[0].submitted) return jsonErr('You have already submitted this survey', 400);

        const recipient = recipientR.items[0];

        // Process each answer  -  LLM analysis for text questions
        const gmailToken = await getGmailToken().catch(() => null);
        const processedAnswers = [];
        const escalations = [];

        for (const ans of answers) {
            const question = (survey.questions || []).find(q => q.questionId === ans.questionId);
            if (!question) continue;

            let processed = {
                questionId: ans.questionId,
                questionText: question.questionText,
                answerType: question.answerType,
                answer: ans.answer,
                sentiment: null,
                sentimentLabel: null,
                normalized: null,
                themes: []
            };

            // LLM text analysis
            if (question.answerType === 'text' && ans.answer && String(ans.answer).trim().length > 5) {
                const analysis = await llmAnalyzeText(question.questionText, String(ans.answer));
                processed.sentiment = analysis.sentiment;
                processed.sentimentLabel = analysis.sentimentLabel;
                processed.normalized = analysis.normalized;
                processed.themes = analysis.themes;

                if (analysis.escalate && analysis.escalateReason) {
                    escalations.push({ question, answer: String(ans.answer), reason: analysis.escalateReason });
                }
            }
            processedAnswers.push(processed);
        }

        // Store FULLY ANONYMISED response (NO member ID, NO email, NO name)
        const anonId = makeAnonId();
        const responseRecord = await safeInsert('SurveyResponses', {
            surveyId,
            anonymousId: anonId,
            submittedAt: new Date(),
            answers: processedAnswers,
            hasEscalation: escalations.length > 0
        });

        // Mark recipient as submitted (only the recipient record knows who submitted)
        await wixData.update('SurveyRecipients', {
            ...recipient, submitted: true, submittedAt: new Date()
        }, SA).catch(() => {});

        // Update survey response count
        await wixData.update('BanfSurveys', {
            ...survey,
            responseCount: (survey.responseCount || 0) + 1
        }, SA).catch(() => {});

        // Handle escalations
        for (const esc of escalations) {
            await handleEscalation(
                surveyId, survey.title, esc.question.questionText, esc.answer, esc.reason, gmailToken
            ).catch(() => {});
        }

        // Trigger aggregate update
        await recomputeAggregates(surveyId, survey).catch(() => {});

        return jsonOk({
            message: 'Thank you! Your response has been recorded anonymously.',
            responseId: responseRecord._id,
            escalationTriggered: escalations.length > 0
        });
    } catch (e) {
        return jsonErr('survey_submit failed: ' + e.message, 500);
    }
}
export function options_survey_submit(request) { return handleCors(); }

// -------------------------------------------------------------
// 8. PROCESS RESPONSES (trigger aggregate recompute manually)
// POST /survey_process
// Body: { surveyId }
// -------------------------------------------------------------
export async function post_survey_process(request) {
    try {
        const body = await parseBody(request);
        const { surveyId } = body;
        if (!surveyId) return jsonErr('Missing surveyId');

        const survey = await wixData.get('BanfSurveys', surveyId, SA).catch(() => null);
        if (!survey) return jsonErr('Survey not found');

        const result = await recomputeAggregates(surveyId, survey);
        return jsonOk({ message: 'Aggregates recomputed', ...result });
    } catch (e) {
        return jsonErr('survey_process failed: ' + e.message, 500);
    }
}
export function options_survey_process(request) { return handleCors(); }

// -------------------------------------------------------------
// CORE AGGREGATE RECOMPUTE
// -------------------------------------------------------------
async function recomputeAggregates(surveyId, survey) {
    // Fetch all responses
    const respR = await wixData.query('SurveyResponses')
        .eq('surveyId', surveyId).limit(500).find(SA).catch(() => ({ items: [] }));
    const responses = respR.items;
    const totalResponses = responses.length;
    if (!totalResponses) return { totalResponses: 0, questions: [] };

    const questions = survey.questions || [];
    const questionSummaries = [];

    for (const q of questions) {
        const allAnswers = [];
        responses.forEach(r => {
            const a = (r.answers || []).find(x => x.questionId === q.questionId);
            if (a && a.answer !== undefined && a.answer !== null && a.answer !== '') {
                allAnswers.push(a);
            }
        });

        let aggData = { questionId: q.questionId, questionText: q.questionText, answerType: q.answerType, totalAnswered: allAnswers.length };

        if (['rating_1_5', 'rating_1_10', 'nps', 'number'].includes(q.answerType)) {
            const nums = allAnswers.map(a => parseFloat(a.answer)).filter(n => !isNaN(n));
            const numAgg = computeNumericAggregate(nums);
            aggData = { ...aggData, ...numAgg };
            // NPS calculation
            if (q.answerType === 'nps' && nums.length) {
                const promoters = nums.filter(n => n >= 9).length;
                const detractors = nums.filter(n => n <= 6).length;
                aggData.npsScore = Math.round(((promoters - detractors) / nums.length) * 100);
            }
        } else if (q.answerType === 'yes_no') {
            const yes = allAnswers.filter(a => String(a.answer).toLowerCase() === 'yes').length;
            const no = allAnswers.filter(a => String(a.answer).toLowerCase() === 'no').length;
            aggData.yesCount = yes;
            aggData.noCount = no;
            aggData.yesPercent = allAnswers.length ? Math.round((yes / allAnswers.length) * 100) : 0;
        } else if (q.answerType === 'multiple_choice') {
            const tally = {};
            allAnswers.forEach(a => { tally[a.answer] = (tally[a.answer] || 0) + 1; });
            aggData.tally = tally;
        } else if (q.answerType === 'text') {
            // Aggregate sentiment scores
            const sentiments = allAnswers.filter(a => a.normalized !== null).map(a => a.normalized || 0.5);
            if (sentiments.length) {
                const avgSentiment = sentiments.reduce((s, v) => s + v, 0) / sentiments.length;
                aggData.avgSentiment = Math.round(avgSentiment * 100) / 100;
                aggData.sentimentLabel = avgSentiment > 0.65 ? 'positive' : avgSentiment < 0.35 ? 'negative' : 'neutral';
                // Collect themes (anonymised)
                const allThemes = [];
                allAnswers.forEach(a => { if (a.themes) allThemes.push(...a.themes); });
                const themeTally = {};
                allThemes.forEach(t => { themeTally[t] = (themeTally[t] || 0) + 1; });
                aggData.topThemes = Object.entries(themeTally).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([t, c]) => ({ theme: t, count: c }));
            }
        }

        questionSummaries.push(aggData);

        // Upsert SurveyAggregates record
        const existingAgg = await wixData.query('SurveyAggregates')
            .eq('surveyId', surveyId).eq('questionId', q.questionId)
            .find(SA).catch(() => ({ items: [] }));

        const aggRecord = { surveyId, questionId: q.questionId, totalResponses, updatedAt: new Date(), ...aggData };
        if (existingAgg.items.length > 0) {
            await wixData.update('SurveyAggregates', { ...existingAgg.items[0], ...aggRecord }, SA).catch(() => {});
        } else {
            await safeInsert('SurveyAggregates', aggRecord).catch(() => {});
        }
    }

    return { totalResponses, questions: questionSummaries };
}

// -------------------------------------------------------------
// 9. GET SURVEY REPORT (aggregated, anonymised)
// GET /survey_report?surveyId=xxx
// -------------------------------------------------------------
export async function get_survey_report(request) {
    try {
        const surveyId = getQP(request, 'surveyId');
        if (!surveyId) return jsonErr('Missing surveyId');

        const survey = await wixData.get('BanfSurveys', surveyId, SA).catch(() => null);
        if (!survey) return jsonErr('Survey not found');

        const aggR = await wixData.query('SurveyAggregates').eq('surveyId', surveyId).find(SA).catch(() => ({ items: [] }));
        const recR = await wixData.query('SurveyRecipients').eq('surveyId', surveyId).limit(100).find(SA).catch(() => ({ items: [] }));
        const escR = await wixData.query('SurveyEscalations').eq('surveyId', surveyId).find(SA).catch(() => ({ items: [] }));

        const totalSent = recR.items.length;
        const totalSubmitted = recR.items.filter(r => r.submitted).length;
        const totalOpened = recR.items.filter(r => r.opened).length;

        // Recipient tracking (WHO responded)  -  shown as names only, not linked to answers
        const recipientStatus = recR.items.map(r => ({
            name: r.name, role: r.role, opened: r.opened, submitted: r.submitted,
            sentAt: r.sentAt, submittedAt: r.submittedAt
        }));

        return jsonOk({
            survey: { id: survey._id, title: survey.title, description: survey.description, status: survey.status, createdAt: survey.createdAt, sentAt: survey.sentAt },
            participation: { totalSent, totalOpened, totalSubmitted, responseRate: totalSent ? Math.round((totalSubmitted / totalSent) * 100) : 0 },
            aggregates: aggR.items,
            escalationCount: escR.items.length,
            pendingEscalations: escR.items.filter(e => e.status === 'pending_review').length,
            recipientStatus
        });
    } catch (e) {
        return jsonErr(e.message, 500);
    }
}
export function options_survey_report(request) { return handleCors(); }

// -------------------------------------------------------------
// 10. GET ESCALATIONS (president only)
// GET /survey_escalations?surveyId=xxx  (omit surveyId for all)
// -------------------------------------------------------------
export async function get_survey_escalations(request) {
    try {
        const surveyId = getQP(request, 'surveyId');
        let q = wixData.query('SurveyEscalations').descending('escalatedAt').limit(100);
        if (surveyId) q = q.eq('surveyId', surveyId);
        const res = await q.find(SA).catch(() => ({ items: [] }));
        return jsonOk({ escalations: res.items, total: res.items.length });
    } catch (e) {
        return jsonErr(e.message, 500);
    }
}
export function options_survey_escalations(request) { return handleCors(); }

// -------------------------------------------------------------
// 11. RESOLVE ESCALATION
// POST /survey_resolve_escalation
// Body: { escalationId, resolution, reviewedBy }
// -------------------------------------------------------------
export async function post_survey_resolve_escalation(request) {
    try {
        const body = await parseBody(request);
        const { escalationId, resolution = '', reviewedBy = '' } = body;
        if (!escalationId) return jsonErr('Missing escalationId');
        const esc = await wixData.get('SurveyEscalations', escalationId, SA).catch(() => null);
        if (!esc) return jsonErr('Escalation not found');
        await wixData.update('SurveyEscalations', {
            ...esc, status: 'resolved', resolution, reviewedBy, reviewedAt: new Date()
        }, SA);
        return jsonOk({ message: 'Escalation marked resolved' });
    } catch (e) {
        return jsonErr(e.message, 500);
    }
}
export function options_survey_resolve_escalation(request) { return handleCors(); }

// -------------------------------------------------------------
// 12. CLOSE SURVEY
// POST /survey_close
// Body: { surveyId }
// -------------------------------------------------------------
export async function post_survey_close(request) {
    try {
        const body = await parseBody(request);
        const { surveyId } = body;
        if (!surveyId) return jsonErr('Missing surveyId');
        const survey = await wixData.get('BanfSurveys', surveyId, SA).catch(() => null);
        if (!survey) return jsonErr('Survey not found');
        await wixData.update('BanfSurveys', { ...survey, status: 'closed', closedAt: new Date() }, SA);

        // Final aggregate compute
        const result = await recomputeAggregates(surveyId, survey).catch(() => ({}));
        return jsonOk({ message: 'Survey closed', finalStats: result });
    } catch (e) {
        return jsonErr(e.message, 500);
    }
}
export function options_survey_close(request) { return handleCors(); }

// -------------------------------------------------------------
// 13. EMAIL-TRIGGER: Process incoming email survey response
// POST /survey_process_email
// Body: { from, subject, body, receivedAt }
// Scans email for survey token in body, extracts answers from text
// -------------------------------------------------------------
export async function post_survey_process_email(request) {
    try {
        const body = await parseBody(request);
        const { from, subject: emailSubject, body: emailBody, receivedAt } = body;
        if (!from || !emailBody) return jsonErr('Missing from or body');

        // Look for survey token pattern in body: [BANF-SURVEY-TOKEN: xxxxx]
        const tokenMatch = emailBody.match(/\[BANF-SURVEY-TOKEN:\s*([A-Za-z0-9_-]+)\]/i);
        const surveyMatch = emailBody.match(/\[BANF-SURVEY-ID:\s*([A-Za-z0-9_-]+)\]/i);
        if (!tokenMatch || !surveyMatch) {
            return jsonOk({ message: 'No survey token found in email  -  not a survey response', processed: false });
        }

        const token = tokenMatch[1];
        const surveyId = surveyMatch[1];
        const survey = await wixData.get('BanfSurveys', surveyId, SA).catch(() => null);
        if (!survey) return jsonOk({ message: 'Survey not found', processed: false });

        // Use LLM to extract answers from free-form email text
        const questions = survey.questions || [];
        const extractedAnswers = await llmExtractEmailAnswers(emailBody, questions);
        if (!extractedAnswers.length) return jsonOk({ message: 'Could not extract answers from email', processed: false });

        // Submit via standard flow
        const fakeRequest = { body: { json: async () => ({ token, surveyId, answers: extractedAnswers }) } };
        return await post_survey_submit(fakeRequest);
    } catch (e) {
        return jsonErr('survey_process_email failed: ' + e.message, 500);
    }
}
export function options_survey_process_email(request) { return handleCors(); }

async function llmExtractEmailAnswers(emailText, questions) {
    if (!questions.length) return [];
    const qList = questions.map((q, i) => `${i + 1}. [${q.questionId}] ${q.questionText} (type: ${q.answerType})`).join('\n');
    const prompt = `Extract survey answers from this email text.

Survey questions:
${qList}

Email text:
"${emailText.substring(0, 1500)}"

Return ONLY a JSON array:
[{"questionId": "q_1", "answer": "<extracted or inferred answer>"}, ...]

Rules:
- For rating/number questions: extract the number mentioned
- For yes_no: return "yes" or "no"
- For text: extract the relevant text passage
- Return empty array [] if no answers can be found`;

    try {
        const resp = await wixFetch(HF_URL, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${HF_API_TOKEN}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ model: HF_MODEL, messages: [{ role: 'user', content: prompt }], max_tokens: 300, temperature: 0.1 })
        });
        const result = await resp.json();
        const raw = (result.choices?.[0]?.message?.content || '').trim()
            .replace(/^```json?\s*/i, '').replace(/```\s*$/i, '').trim();
        return JSON.parse(raw) || [];
    } catch (_) { return []; }
}

// -------------------------------------------------------------
// 14. SURVEY AGENT  -  Auto-generate sample event feedback survey
// POST /survey_agent_sample
// Body: { eventName?, eventDate?, eventType?, autoCreate? }
// Uses LLM to generate 5 diverse questions, then creates survey
// -------------------------------------------------------------

const ANSWER_TYPES_GUIDE = `
Answer type options:
  "rating_1_5"       -  1 to 5 star rating
  "rating_1_10"      -  1 to 10 numeric rating
  "nps"              -  Net Promoter Score 0-10 (likelihood to recommend)
  "yes_no"           -  Yes or No
  "multiple_choice"  -  Pick one from a list (include options[])
  "text"             -  Free-form text response
`;

async function llmGenerateEventQuestions(eventName, eventType, eventDate) {
    const prompt = `You are a survey designer for a Bengali community non-profit organization (BANF  -  Bengali Association of North Florida).

Create exactly 5 survey questions to collect feedback about the following event:
  Event Name: ${eventName}
  Event Type: ${eventType}
  Event Date: ${eventDate}
${ANSWER_TYPES_GUIDE}

Rules:
- Use a VARIETY of answer types (do not repeat the same type more than twice)
- Include at least one text (open-ended) question
- Include at least one rating question
- Include at least one yes_no or nps question
- Keep questions specific to the event context
- For multiple_choice questions, provide 4-5 relevant options[]

Return ONLY a JSON array of exactly 5 objects:
[
  {
    "questionText": "<question>",
    "answerType": "<type>",
    "options": [],
    "required": true,
    "order": 1
  },
  ...
]`;

    const resp = await wixFetch(HF_URL, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${HF_API_TOKEN}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
            model: HF_MODEL,
            messages: [{ role: 'user', content: prompt }],
            max_tokens: 800,
            temperature: 0.7
        })
    });
    const result = await resp.json();
    const raw = (result.choices?.[0]?.message?.content || '').trim()
        .replace(/^```json?\s*/i, '').replace(/```\s*$/i, '').trim();
    const questions = JSON.parse(raw);
    if (!Array.isArray(questions) || questions.length === 0) throw new Error('LLM returned no questions');
    return questions.slice(0, 5).map((q, i) => ({
        questionId: 'q_' + (i + 1),
        questionText: String(q.questionText || '').trim(),
        answerType: q.answerType || 'text',
        options: Array.isArray(q.options) ? q.options : [],
        required: q.required !== false,
        order: i + 1
    }));
}

// Fallback: 5 hard-coded event feedback questions if LLM fails
function fallbackEventQuestions(eventName) {
    return [
        { questionId: 'q_1', questionText: `Overall, how would you rate the ${eventName} event?`, answerType: 'rating_1_5', options: [], required: true, order: 1 },
        { questionId: 'q_2', questionText: 'How would you rate the event organisation and logistics?', answerType: 'rating_1_10', options: [], required: true, order: 2 },
        { questionId: 'q_3', questionText: 'Would you attend this event again next year?', answerType: 'yes_no', options: [], required: true, order: 3 },
        { questionId: 'q_4', questionText: 'Which aspect did you enjoy the most?', answerType: 'multiple_choice', options: ['Cultural Performances', 'Food & Refreshments', 'Community Networking', 'Children\'s Activities', 'Music & Entertainment'], required: false, order: 4 },
        { questionId: 'q_5', questionText: `Please share any suggestions to improve future ${eventName} events:`, answerType: 'text', options: [], required: false, order: 5 }
    ];
}

export async function post_survey_agent_sample(request) {
    try {
        const body = await parseBody(request);
        const {
            eventName = 'BANF Annual Event',
            eventDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
            eventType = 'Cultural Festival',
            autoCreate = true
        } = body;

        let questions;
        let generatedByLLM = true;

        try {
            questions = await llmGenerateEventQuestions(eventName, eventType, eventDate);
        } catch (llmErr) {
            // Silently fall back to preset questions
            questions = fallbackEventQuestions(eventName);
            generatedByLLM = false;
        }

        if (!autoCreate) {
            // Just return the generated questions without creating
            return jsonOk({
                message: 'Questions generated. Pass autoCreate:true to also create the survey.',
                generatedByLLM,
                eventName,
                questions
            });
        }

        // Auto-create the survey
        const title = `${eventName}  -  Feedback Survey`;
        const description = `Share your feedback about ${eventName} (${eventDate}). Your responses are completely anonymous.`;

        await ensureCollections();
        const survey = await safeInsert('BanfSurveys', {
            title,
            description,
            questions,
            targetGroup: 'ec_members',
            status: 'draft',
            createdAt: new Date(),
            createdBy: 'survey-agent',
            recipientCount: 0,
            responseCount: 0,
            sentAt: null,
            closedAt: null,
            _meta: { generatedByLLM, eventName, eventType, eventDate }
        });

        return jsonOk({
            message: generatedByLLM
                ? '[OK] Agent generated 5 questions using LLM and created the survey.'
                : '[OK] Agent created the survey with preset fallback questions (LLM unavailable).',
            generatedByLLM,
            surveyId: survey._id,
            title,
            description,
            questionCount: questions.length,
            questions,
            nextSteps: {
                sendToEC: `POST /survey_send  body: { surveyId: "${survey._id}", recipientType: "confirmed_ec" }`,
                viewForm: `GET  /survey_form?token=<token>&sid=${survey._id}`,
                viewReport: `GET  /survey_report?surveyId=${survey._id}`
            }
        });
    } catch (e) {
        return jsonErr('survey_agent_sample failed: ' + e.message, 500);
    }
}
export function options_survey_agent_sample(request) { return handleCors(); }

// -------------------------------------------------------------
// HTML BUILDERS
// -------------------------------------------------------------

function buildSurveyInviteEmail(memberName, surveyTitle, description, surveyLink) {
    return `<!DOCTYPE html>
<html><head><meta charset="UTF-8"></head>
<body style="font-family:Arial,sans-serif;background:#f5f5f5;margin:0;padding:20px">
<div style="max-width:600px;margin:0 auto;background:white;border-radius:8px;overflow:hidden;box-shadow:0 2px 10px rgba(0,0,0,0.1)">
  <div style="background:linear-gradient(135deg,#e74c3c,#c0392b);color:white;padding:30px;text-align:center">
    <div style="font-size:36px;margin-bottom:10px"></div>
    <h1 style="margin:0;font-size:24px">Survey Invitation</h1>
    <p style="margin:5px 0 0;opacity:0.9">${BANF_ORG}</p>
  </div>
  <div style="padding:30px">
    <p style="font-size:18px">Dear <strong>${memberName}</strong>,</p>
    <p>You are invited to participate in our survey:</p>
    <div style="background:#f8f4ff;border-left:4px solid #9b59b6;padding:15px;margin:20px 0;border-radius:0 4px 4px 0">
      <h2 style="margin:0 0 10px;color:#9b59b6;font-size:20px">${surveyTitle}</h2>
      ${description ? `<p style="margin:0;color:#555">${description}</p>` : ''}
    </div>
    <p>Your responses are <strong>completely anonymous</strong>. Once submitted, they cannot be linked back to you.</p>
    <div style="text-align:center;margin:30px 0">
      <a href="${surveyLink}" style="background:#e74c3c;color:white;padding:15px 40px;text-decoration:none;border-radius:25px;font-size:18px;font-weight:bold;display:inline-block">
        Take Survey ->
      </a>
    </div>
    <p style="font-size:12px;color:#888;text-align:center">
      This link is unique to you and can only be used once.<br>
      Please do not forward this email.
    </p>
  </div>
  <div style="background:#f5f5f5;padding:15px;text-align:center;font-size:12px;color:#888">
    ${BANF_ORG} | banfjax@gmail.com
  </div>
</div>
</body></html>`;
}

function buildSurveyFormPage(survey, token) {
    const questions = survey.questions || [];
    const submitUrl = 'https://www.jaxbengali.org/_functions/survey_submit';

    const questionBlocks = questions.map(q => {
        let inputHtml = '';
        const req = q.required ? 'required' : '';
        if (q.answerType === 'text') {
            inputHtml = `<textarea name="${q.questionId}" ${req} rows="4" inputmode="text" autocomplete="off" style="width:100%;padding:12px;border:1px solid #ddd;border-radius:4px;font-size:16px;box-sizing:border-box;resize:vertical;touch-action:manipulation" placeholder="Your answer..."></textarea>`;
        } else if (q.answerType === 'rating_1_5') {
            inputHtml = `<div class="rating-group" style="display:flex;gap:10px;flex-wrap:wrap">` +
                [1,2,3,4,5].map(n => `<label style="cursor:pointer;min-height:44px;display:inline-flex;align-items:center;padding:4px 8px;touch-action:manipulation"><input type="radio" name="${q.questionId}" value="${n}" ${req} style="margin-right:4px">${n} ${'*'.repeat(n)}</label>`).join('') + `</div>`;
        } else if (q.answerType === 'rating_1_10') {
            inputHtml = `<div class="rating-group" style="display:flex;gap:8px;flex-wrap:wrap">` +
                [1,2,3,4,5,6,7,8,9,10].map(n => `<label style="cursor:pointer;background:#f0f0f0;padding:10px 14px;border-radius:20px;border:2px solid transparent;min-height:44px;display:inline-flex;align-items:center;justify-content:center;touch-action:manipulation" class="rating-btn"><input type="radio" name="${q.questionId}" value="${n}" ${req} style="display:none">${n}</label>`).join('') + `</div>`;
        } else if (q.answerType === 'nps') {
            inputHtml = `<p style="font-size:12px;color:#666;margin-bottom:8px">0 = Not at all likely, 10 = Extremely likely</p>
<div class="rating-group" style="display:flex;gap:6px;flex-wrap:wrap">` +
                [0,1,2,3,4,5,6,7,8,9,10].map(n => `<label style="cursor:pointer;min-height:44px;min-width:44px;display:inline-flex;align-items:center;justify-content:center;background:#f0f0f0;border-radius:22px;padding:0 10px;touch-action:manipulation"><input type="radio" name="${q.questionId}" value="${n}" ${req} style="display:none">${n}</label>`).join('') + `</div>`;
        } else if (q.answerType === 'yes_no') {
            inputHtml = `<div style="display:flex;gap:20px">
<label style="cursor:pointer;font-size:16px;min-height:44px;display:inline-flex;align-items:center;touch-action:manipulation"><input type="radio" name="${q.questionId}" value="yes" ${req} style="margin-right:6px">[OK] Yes</label>
<label style="cursor:pointer;font-size:16px;min-height:44px;display:inline-flex;align-items:center;touch-action:manipulation"><input type="radio" name="${q.questionId}" value="no" ${req} style="margin-right:6px">[X] No</label>
</div>`;
        } else if (q.answerType === 'multiple_choice' && q.options && q.options.length) {
            inputHtml = q.options.map(opt => `<label style="display:block;cursor:pointer;padding:12px 16px;margin:6px 0;background:#f9f9f9;border-radius:4px;min-height:44px;display:flex;align-items:center;touch-action:manipulation"><input type="radio" name="${q.questionId}" value="${opt}" ${req} style="margin-right:12px">${opt}</label>`).join('');
        } else if (q.answerType === 'number') {
            inputHtml = `<input type="number" name="${q.questionId}" ${req} inputmode="numeric" autocomplete="off" style="width:120px;padding:12px;border:1px solid #ddd;border-radius:4px;font-size:16px;min-height:44px;touch-action:manipulation" placeholder="0">`;
        }

        return `<div class="question-card" style="background:white;border:1px solid #e0e0e0;padding:24px;margin-bottom:16px;border-radius:8px;box-shadow:0 1px 4px rgba(0,0,0,0.05)">
  <p style="font-weight:600;font-size:16px;margin:0 0 4px;color:#2c3e50">
    ${q.order || ''}.&nbsp;${q.questionText}
    ${q.required ? '<span style="color:#e74c3c;margin-left:4px">*</span>' : ''}
  </p>
  <p style="font-size:12px;color:#888;margin:0 0 14px;text-transform:uppercase;letter-spacing:0.5px">${q.answerType.replace(/_/g, ' ')}</p>
  ${inputHtml}
</div>`;
    }).join('');

    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${survey.title}  -  BANF Survey</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: Arial, sans-serif; background: #f0f4f8; margin: 0; padding: 20px; }
  .container { max-width: 700px; margin: 0 auto; }
  .header { background: linear-gradient(135deg, #9b59b6, #8e44ad); color: white; padding: 30px; border-radius: 8px 8px 0 0; text-align: center; }
  .header h1 { margin: 0; font-size: 24px; }
  .header p { margin: 8px 0 0; opacity: 0.85; }
  .anon-badge { background: rgba(255,255,255,0.2); display: inline-block; padding: 6px 16px; border-radius: 20px; font-size: 12px; margin-top: 12px; }
  .body-wrap { background: #f8f8f8; padding: 24px; border: 1px solid #ddd; border-top: none; border-radius: 0 0 8px 8px; }
  .submit-btn { background: #27ae60; color: white; border: none; padding: 16px 50px; font-size: 18px; font-weight: bold; border-radius: 25px; cursor: pointer; width: 100%; margin-top: 20px; min-height: 44px; touch-action: manipulation; -webkit-tap-highlight-color: transparent; }
  .submit-btn:hover, .submit-btn:active { background: #219a52; }
  .spinner { display: none; text-align: center; padding: 20px; font-size: 18px; }
  .success-msg { display: none; background: #d4edda; border: 1px solid #c3e6cb; padding: 20px; border-radius: 8px; text-align: center; color: #155724; font-size: 18px; }
  .error-msg { display: none; background: #f8d7da; border: 1px solid #f5c6cb; padding: 15px; border-radius: 8px; color: #721c24; margin-top: 15px; }
</style>
</head>
<body>
<div class="container">
  <div class="header">
    <div style="font-size:40px;margin-bottom:8px"></div>
    <h1>${survey.title}</h1>
    ${survey.description ? `<p>${survey.description}</p>` : ''}
    <span class="anon-badge"> Your responses are fully anonymous</span>
  </div>
  <div class="body-wrap">
    <form id="surveyForm">
      ${questionBlocks}
      <button type="submit" class="submit-btn">Submit My Responses -></button>
    </form>
    <div class="spinner" id="spinner">... Submitting your response...</div>
    <div class="success-msg" id="successMsg">
      [OK] <strong>Thank you!</strong><br><br>
      Your response has been recorded anonymously.<br>
      <small style="color:#555">You can now close this window.</small>
    </div>
    <div class="error-msg" id="errorMsg"></div>
    <p style="font-size:11px;color:#aaa;text-align:center;margin-top:20px">
      ${BANF_ORG} | Responses are anonymous and cannot be linked to you
    </p>
  </div>
</div>
<script>
const SUBMIT_URL = '${submitUrl}';
const TOKEN = '${token}';
const SURVEY_ID = '${survey._id}';

document.getElementById('surveyForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const form = e.target;
  const formData = new FormData(form);
  const answers = [];
  for (const [k, v] of formData.entries()) {
    if (k !== 'token' && k !== 'surveyId') answers.push({ questionId: k, answer: v });
  }
  // Textareas
  document.querySelectorAll('textarea').forEach(ta => {
    if (ta.value.trim()) {
      const existing = answers.find(a => a.questionId === ta.name);
      if (!existing) answers.push({ questionId: ta.name, answer: ta.value.trim() });
    }
  });

  form.style.display = 'none';
  document.getElementById('spinner').style.display = 'block';

  try {
    const resp = await fetch(SUBMIT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: TOKEN, surveyId: SURVEY_ID, answers })
    });
    const data = await resp.json();
    document.getElementById('spinner').style.display = 'none';
    if (data.success) {
      document.getElementById('successMsg').style.display = 'block';
    } else {
      document.getElementById('errorMsg').textContent = 'Error: ' + (data.error || 'Submission failed');
      document.getElementById('errorMsg').style.display = 'block';
      form.style.display = 'block';
    }
  } catch (err) {
    document.getElementById('spinner').style.display = 'none';
    document.getElementById('errorMsg').textContent = 'Network error. Please try again.';
    document.getElementById('errorMsg').style.display = 'block';
    form.style.display = 'block';
  }
});

// Rating button highlight
document.querySelectorAll('.rating-btn input').forEach(inp => {
  inp.addEventListener('change', () => {
    document.querySelectorAll('input[name="' + inp.name + '"]').forEach(x => {
      x.closest('label').style.background = '#f0f0f0';
      x.closest('label').style.borderColor = 'transparent';
      x.closest('label').style.color = '#333';
    });
    inp.closest('label').style.background = '#9b59b6';
    inp.closest('label').style.borderColor = '#9b59b6';
    inp.closest('label').style.color = 'white';
  });
});
</script>
</body></html>`;
}

function errorPage(msg) {
    return `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Survey Error</title></head>
<body style="font-family:Arial;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#f0f4f8">
<div style="text-align:center;padding:40px;background:white;border-radius:8px;box-shadow:0 2px 20px rgba(0,0,0,0.1);max-width:500px">
<div style="font-size:64px">[!]</div>
<h2 style="color:#e74c3c">${msg}</h2>
<p style="color:#888">If you believe this is an error, please contact banfjax@gmail.com</p>
</div></body></html>`;
}

function alreadySubmittedPage(surveyTitle) {
    return `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Already Submitted</title></head>
<body style="font-family:Arial;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#f0f4f8">
<div style="text-align:center;padding:40px;background:white;border-radius:8px;box-shadow:0 2px 20px rgba(0,0,0,0.1);max-width:500px">
<div style="font-size:64px">[OK]</div>
<h2 style="color:#27ae60">Already Submitted!</h2>
<p style="color:#555">You have already submitted your response to <strong>${surveyTitle}</strong>.</p>
<p style="color:#888">Each survey link can only be used once to protect anonymity.</p>
</div></body></html>`;
}
