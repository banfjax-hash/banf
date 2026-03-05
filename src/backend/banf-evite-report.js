/**
 * ═══════════════════════════════════════════════════════════════
 *  BANF EVITE RESPONSE REPORT ENGINE  —  v2.0
 * ═══════════════════════════════════════════════════════════════
 *
 *  Flow:
 *    1. Admin calls POST /evite_create_event  → register an event keyword
 *    2. POST /evite_scan                       → scan InboxMessages for that
 *       event keyword, LLM-parse every matching email body into structured
 *       RSVP data (rsvp/adults/kids/veg/nonVeg/notes), save to EviteRSVPs
 *    3. GET  /evite_attendance_report?eventId  → return full attendance
 *       worksheet (all RSVPs grouped, totals, dietary breakdown)
 *    4. GET  /evite_events                     → list all tracked events
 *    5. POST /evite_parse_single               → LLM parse one email (debug)
 *    6. POST /evite_rsvp_override             → manual admin RSVP edit
 *
 *  LLM used:  meta-llama/Llama-3.1-8B-Instruct via HuggingFace router
 *  JSON mode: explicit prompt engineering — model must respond ONLY with JSON
 * ═══════════════════════════════════════════════════════════════
 */

import { ok, badRequest, serverError, forbidden } from 'wix-http-functions';
import wixData from 'wix-data';
import { fetch as wixFetch } from 'wix-fetch';

const SA = { suppressAuth: true };

// Token removed from source.  Store it in Wix > Content Management >
// SiteConfig collection with key = "HF_API_TOKEN" and value = hf_...
// (generate a new read-only Inference token at huggingface.co/settings/tokens)
const HF_MODEL = 'meta-llama/Llama-3.1-8B-Instruct';
const HF_URL = 'https://router.huggingface.co/featherless-ai/v1/chat/completions';

async function getHFToken() {
    try {
        const r = await wixData.query('SiteConfig').eq('key', 'HF_API_TOKEN').limit(1).find(SA);
        if (r.items.length && r.items[0].value) return r.items[0].value;
    } catch (_) {}
    return null;
}

// ─────────────────────────────────────────────────────────────
// Gmail OAuth — direct API access (same credentials as email-automation.js)
// ─────────────────────────────────────────────────────────────
const GOOGLE_CLIENT_ID = '1020178199135-3usrl611ara38i7rhu2ub6sn6g1150ml.apps.googleusercontent.com';
const GOOGLE_CLIENT_SECRET = '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';
const GOOGLE_REFRESH_TOKEN = '1//04iXClX5dKpqhCgYIARAAGAQSNwF-L9IrCtEUhuup9COlH5wnvGtozgReO4E5ILylE9Jq4f8vw1YUXDT_ysiHcJ89g-PA96eh8Ko';

// Try DB-stored refresh token first (same token flow as http-functions.js)
async function getStoredRefreshTokenEvite() {
    try {
        const r = await wixData.query('GoogleTokens').eq('key', 'refresh_token').limit(1).find(SA);
        if (r.items.length > 0 && r.items[0].value) return r.items[0].value;
    } catch (_) {}
    return GOOGLE_REFRESH_TOKEN; // fallback to hardcoded
}

async function getGmailToken() {
    const refreshToken = await getStoredRefreshTokenEvite();
    // Try primary credentials
    let resp = await wixFetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `grant_type=refresh_token&refresh_token=${encodeURIComponent(refreshToken)}&client_id=${encodeURIComponent(GOOGLE_CLIENT_ID)}&client_secret=${encodeURIComponent(GOOGLE_CLIENT_SECRET)}`
    });
    let data = await resp.json();
    if (data.error) {
        // Fallback: OAuth Playground credentials (token may have been obtained there)
        resp = await wixFetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: `grant_type=refresh_token&refresh_token=${encodeURIComponent(refreshToken)}&client_id=407408718192.apps.googleusercontent.com&client_secret=kd-_2_AUosoGGTNYyMJiFL3j`
        });
        data = await resp.json();
    }
    if (data.error) throw new Error('Gmail token error: ' + (data.error_description || data.error));
    return data.access_token;
}

function buildGmailQuery(event) {
    const kws = (event.keywords || [event.eventName]).map(k => {
        const t = k.trim();
        return t.includes(' ') ? `"${t}"` : t;
    });
    return kws.join(' OR ');
}

async function searchGmailMessages(maxResults, token) {
    // No labelIds restriction — scan ALL mail (inbox + archived/read)
    // q= text search not supported; we filter keywords client-side after body fetch
    const url = `https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=${Math.min(maxResults, 500)}`;
    const r = await wixFetch(url, { headers: { 'Authorization': `Bearer ${token}` } });
    const d = await r.json();
    if (d.error) throw new Error('Gmail list error: ' + (d.error.message || JSON.stringify(d.error)));
    return (d.messages || []).map(m => m.id);
}

async function fetchGmailMessage(id, token) {
    const r = await wixFetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}?format=full`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    const msg = await r.json();
    if (msg.error) throw new Error('Gmail fetch error: ' + (msg.error.message || JSON.stringify(msg.error)));
    const headers = (msg.payload && msg.payload.headers) || [];
    const getH = name => (headers.find(h => h.name.toLowerCase() === name.toLowerCase()) || {}).value || '';
    let bodyText = '';
    function extractBody(part) {
        if (part.mimeType === 'text/plain' && part.body && part.body.data) {
            try { bodyText += atob(part.body.data.replace(/-/g, '+').replace(/_/g, '/')); } catch (_) {}
        }
        if (part.parts) part.parts.forEach(extractBody);
    }
    extractBody(msg.payload || {});
    // Fallback: if no text/plain found, strip HTML from text/html
    if (!bodyText) {
        function extractHtml(part) {
            if (part.mimeType === 'text/html' && part.body && part.body.data) {
                try {
                    const html = atob(part.body.data.replace(/-/g, '+').replace(/_/g, '/'));
                    bodyText += html.replace(/<[^>]+>/g, ' ');
                } catch (_) {}
            }
            if (part.parts) part.parts.forEach(extractHtml);
        }
        extractHtml(msg.payload || {});
    }
    return {
        gmailId: id,
        from: getH('From'),
        subject: getH('Subject'),
        body: bodyText.trim(),
        receivedAt: new Date(parseInt(msg.internalDate || Date.now()))
    };
}

// ─────────────────────────────────────────────────────────────
// CRM & FAMILY INTELLIGENCE HELPERS
// ─────────────────────────────────────────────────────────────

// Extract clean email address from "Name <email>" or plain format
function extractEmailAddress(from) {
    const match = (from || '').match(/<([^>]+)>/);
    return (match ? match[1] : (from || '')).trim().toLowerCase();
}

// Find a CRM member record by email (tries primary then alternate email)
async function findMemberByEmail(from) {
    const email = extractEmailAddress(from);
    if (!email) return null;
    let r = await wixData.query('CRMMembers').eq('email', email).limit(1).find(SA).catch(() => ({ items: [] }));
    if (r.items.length > 0) return r.items[0];
    r = await wixData.query('CRMMembers').eq('alternateEmail', email).limit(1).find(SA).catch(() => ({ items: [] }));
    return r.items.length > 0 ? r.items[0] : null;
}

// Find a CRM member by full name (fallback for Evite platform emails)
async function findMemberByName(fullName) {
    if (!fullName || fullName.length < 2) return null;
    const parts = fullName.trim().split(/\s+/);
    const firstName = parts[0] || '';
    const lastName = parts.slice(1).join(' ') || '';
    try {
        // Try first+last exact match
        let r = await wixData.query('CRMMembers')
            .eq('firstName', firstName)
            .eq('lastName', lastName)
            .limit(1).find(SA).catch(() => ({ items: [] }));
        if (r.items.length > 0) return r.items[0];
        // Try displayName contains
        r = await wixData.query('CRMMembers')
            .contains('displayName', firstName)
            .limit(5).find(SA).catch(() => ({ items: [] }));
        const match = r.items.find(m =>
            (m.displayName || '').toLowerCase().includes(fullName.toLowerCase()) ||
            (m.firstName + ' ' + m.lastName).toLowerCase().includes(fullName.toLowerCase())
        );
        return match || null;
    } catch (_) { return null; }
}

// Get the FamilyGroups record for a given familyId
async function getFamilyGroup(familyId) {
    if (!familyId) return null;
    const r = await wixData.query('FamilyGroups').eq('familyId', familyId).limit(1).find(SA).catch(() => ({ items: [] }));
    return r.items.length > 0 ? r.items[0] : null;
}

// Get any existing EviteRSVPs for this family+event (family-level dedup)
async function getFamilyExistingRSVP(familyId, eventId) {
    if (!familyId) return [];
    const r = await wixData.query('EviteRSVPs')
        .eq('familyId', familyId)
        .eq('eventId', eventId)
        .find(SA).catch(() => ({ items: [] }));
    return r.items;
}

// Determine how many adults are covered by the membership (threshold for "additional guest" flag)
function getAdultThreshold(membershipType) {
    const t = (membershipType || '').toLowerCase();
    if (t === 'family') return 2;    // family membership covers 2 adults
    if (t === 'couple') return 2;    // couple covers 2 adults
    if (t === 'individual' || t === 'senior' || t === 'life') return 1;
    if (t === 'student') return 1;
    return 2; // default: assume family
}

// Analyze food notes to extract a clean pattern (deduplicated, day-tagged)
function analyzeFoodPattern(existingNotes, newNote, dayOfWeek) {
    if (!newNote || newNote === 'unknown' || newNote.length < 3) return existingNotes || '';
    const dayTag = `[${dayOfWeek}]`;
    const newLine = `${dayTag} ${newNote.trim()}`;
    const existing = existingNotes || '';
    // Avoid duplicate entries: check if same note already recorded
    if (existing.toLowerCase().includes(newNote.toLowerCase().substring(0, 15))) return existing;
    return existing ? existing + '\n' + newLine : newLine;
}

// Update the FamilyGroups record with evite-responder intel + food pattern
async function updateFamilyEvitePattern(family, responderEmail, responderName, dietaryNote, receivedAt) {
    if (!family) return;
    try {
        const dayOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][(receivedAt || new Date()).getDay()];
        const updates = {
            ...family,
            eviteResponder: responderEmail,
            eviteResponderName: responderName || '',
            eviteResponderUpdatedAt: new Date()
        };
        // Food preference pattern — note if dietary info present
        if (dietaryNote && dietaryNote !== 'unknown') {
            updates.foodPreferenceNotes = analyzeFoodPattern(
                family.foodPreferenceNotes || '', dietaryNote, dayOfWeek
            );
        }
        await wixData.update('FamilyGroups', updates, SA);
    } catch (_) {}
}

// Build a base64url-encoded raw Gmail message for sending via API
function makeGmailRawMessage(from, to, subject, body) {
    const raw = [
        `From: Bengali Association of North Florida <${from}>`,
        `To: ${to}`,
        `Subject: ${subject}`,
        `MIME-Version: 1.0`,
        `Content-Type: text/plain; charset=UTF-8`,
        '',
        body
    ].join('\r\n');
    return btoa(unescape(encodeURIComponent(raw)))
        .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

// Send clarification email for additional adults + log to CRMCommunications
async function sendAdditionalAdultCommunication(rsvpRecord, member, family, event, extraAdults, token) {
    const recipientEmail = extractEmailAddress(rsvpRecord.from);
    const recipientName = rsvpRecord.senderName || 'Member';
    const eventName = event.eventName || 'BANF Event';
    const eventDate = event.eventDate ? new Date(event.eventDate).toDateString() : 'TBD';
    const membershipType = rsvpRecord.membershipType || 'member';
    const threshold = getAdultThreshold(membershipType);

    const subject = `${eventName} RSVP — Additional Guest Clarification Needed`;
    const body =
`Dear ${recipientName},

Thank you for your RSVP for ${eventName} on ${eventDate}!

We noticed your response includes ${rsvpRecord.adults} adult(s). Your ${membershipType} membership covers up to ${threshold} adult(s).

You have ${extraAdults} additional adult guest(s) beyond your membership coverage. Could you please clarify:

  Are the additional guests your parents?
  → Parents of BANF members attend events FREE of charge!

  Are they other adult guests?
  → A guest charge applies. We will send a payment link once confirmed.
  → Payment options at the venue: Cash, Zelle (banfjax@gmail.com), or Card.

Please reply to this email with:
  1) Names of the additional adult guest(s)
  2) Whether they are your parent(s) or other guests

We look forward to seeing you at ${eventName}!

Warm regards,
BANF Executive Committee
Bengali Association of North Florida
banfjax@gmail.com`;

    // Send via Gmail API
    let emailSent = false;
    try {
        const raw = makeGmailRawMessage('banfjax@gmail.com', recipientEmail, subject, body);
        const sendResp = await wixFetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ raw })
        });
        const sendData = await sendResp.json();
        emailSent = !sendData.error;
    } catch (_) {}

    // Log to CRMCommunications collection
    try {
        await wixData.insert('CRMCommunications', {
            memberId: member ? (member.memberId || '') : '',
            familyId: family ? (family.familyId || '') : '',
            memberEmail: recipientEmail,
            memberName: recipientName,
            membershipType: rsvpRecord.membershipType || '',
            subject,
            body,
            communicationType: 'evite_additional_adult_clarification',
            eventId: rsvpRecord.eventId,
            eventName,
            extraAdults,
            totalAdults: rsvpRecord.adults,
            adultThreshold: threshold,
            sentAt: new Date(),
            sentBy: 'evite-system',
            emailSent,
            status: 'sent',
            requiresResponse: true,
            responseReceived: false
        }, SA).catch(() => {});
    } catch (_) {}

    return emailSent;
}

// ─────────────────────────────────────────────────────────────
// HTTP helpers
// ─────────────────────────────────────────────────────────────

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
export function handleCors() {
    return ok({
        body: '',
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type,Authorization,x-user-email'
        }
    });
}
async function parseBody(req) {
    try { return await req.body.json(); } catch (_) { return {}; }
}

// ─────────────────────────────────────────────────────────────
// LLM RSVP PARSER
// Takes one email (subject + body) and returns structured JSON.
// We instruct the model to ONLY output a JSON object — no prose.
// ─────────────────────────────────────────────────────────────

const RSVP_SYSTEM_PROMPT = `You are an RSVP data extraction assistant for BANF (Bengali Association of Northeast Florida).
Your ONLY job is to read an email and extract RSVP information as a strict JSON object.

You MUST respond with ONLY a JSON object, no explanations, no markdown fences, no extra text.

The JSON must have exactly these fields:
{
  "rsvp": "yes" | "no" | "maybe" | "unclear",
  "senderName": "<full name from email signature or from address, or empty string>",
  "adults": <integer, 0 if unknown>,
  "kids": <integer 0-17 year olds, 0 if unknown>,
  "vegCount": <integer vegetarians/vegans, 0 if unknown>,
  "nonVegCount": <integer non-vegetarians, 0 if unknown>,
  "dietary": "vegetarian" | "non_vegetarian" | "mixed" | "vegan" | "unknown",
  "notes": "<any extra notes, allergies, requests, or empty string>",
  "confidence": <0.0 to 1.0, how confident you are in the extraction>
}

Rules:
- If someone says "coming", "will attend", "yes", "count us in", "we will be there", set rsvp="yes"
- If someone says "can't make it", "won't be able", "no", "not attending", set rsvp="no"
- If someone says "maybe", "trying", "hope to", "not sure", set rsvp="maybe"
- adults and kids default to 0 when not mentioned explicitly
- If they say "family of 4" with no breakdown, set adults=2 kids=2 as a guess, confidence=0.6
- If they mention "vegetarian" and give no count, set vegCount equal to their total headcount
- dietary="mixed" when the party has both veg and non-veg people
- Keep notes brief (under 100 chars)`;

/**
 * Call HuggingFace LLM and extract JSON from the response.
 * Returns a parsed RSVP object or a default "unclear" skeleton on failure.
 */
export async function llmParseRSVP(subject, body, fromEmail) {
    const userPrompt = `EMAIL FROM: ${fromEmail}
SUBJECT: ${subject}

EMAIL BODY:
${(body || '').substring(0, 1500)}

Extract the RSVP information and return ONLY the JSON object.`;

    try {
        const resp = await wixFetch(HF_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${await getHFToken()}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: HF_MODEL,
                messages: [
                    { role: 'system', content: RSVP_SYSTEM_PROMPT },
                    { role: 'user', content: userPrompt }
                ],
                max_tokens: 300,
                temperature: 0.1,   // very low temp for deterministic JSON
                response_format: { type: 'json_object' }  // force JSON on models that support it
            })
        });

        const data = await resp.json();
        const raw = data.choices?.[0]?.message?.content?.trim() || '';

        // Strip any accidental markdown fences
        const cleaned = raw.replace(/^```json?\s*/i, '').replace(/```\s*$/i, '').trim();

        const parsed = JSON.parse(cleaned);

        // Validate and normalise
        return {
            rsvp: ['yes', 'no', 'maybe', 'unclear'].includes(parsed.rsvp) ? parsed.rsvp : 'unclear',
            senderName: String(parsed.senderName || '').substring(0, 80),
            adults: Math.max(0, parseInt(parsed.adults) || 0),
            kids: Math.max(0, parseInt(parsed.kids) || 0),
            vegCount: Math.max(0, parseInt(parsed.vegCount) || 0),
            nonVegCount: Math.max(0, parseInt(parsed.nonVegCount) || 0),
            dietary: ['vegetarian', 'non_vegetarian', 'mixed', 'vegan', 'unknown'].includes(parsed.dietary)
                ? parsed.dietary : 'unknown',
            notes: String(parsed.notes || '').substring(0, 200),
            confidence: Math.min(1, Math.max(0, parseFloat(parsed.confidence) || 0.5)),
            llmRaw: cleaned.substring(0, 500)
        };

    } catch (e) {
        // Return a safe default so the scan never crashes on one bad email
        return {
            rsvp: 'unclear',
            senderName: '',
            adults: 0,
            kids: 0,
            vegCount: 0,
            nonVegCount: 0,
            dietary: 'unknown',
            notes: '',
            confidence: 0,
            llmError: e.message
        };
    }
}

// ─────────────────────────────────────────────────────────────
// EVENT MATCHING — checks if an InboxMessage is related to an event
// ─────────────────────────────────────────────────────────────

function isRelatedToEvent(msg, event) {
    const keywords = [
        ...(event.keywords || []),
        event.eventName
    ].map(k => k.toLowerCase());

    const haystack = `${msg.subject || ''} ${msg.body || ''}`.toLowerCase();
    return keywords.some(kw => kw && haystack.includes(kw));
}

// ─────────────────────────────────────────────────────────────
// 1. REGISTER AN EVENT FOR TRACKING
// POST /evite_create_event
// Body: { eventName, eventDate, venue, keywords[], capacity }
// ─────────────────────────────────────────────────────────────

export async function post_evite_create_event(request) {
    try {
        const body = await parseBody(request);
        const { eventName, eventDate, venue, keywords = [], capacity = 0, notes = '',
                eventTime = '', description = '', highlights = '' } = body;
        if (!eventName) return jsonErr('Missing eventName');

        // Dedup: check if event already exists by name
        const existing = await wixData.query('EviteEvents')
            .eq('eventName', eventName.trim())
            .find(SA)
            .catch(() => ({ items: [] }));

        if (existing.items.length > 0) {
            return jsonOk({
                message: 'Event already registered',
                eventId: existing.items[0]._id,
                existing: true
            });
        }

        const record = await wixData.insert('EviteEvents', {
            eventName: eventName.trim(),
            eventDate: eventDate ? new Date(eventDate) : null,
            eventTime: eventTime || '',
            venue: venue || '',
            description: description || '',
            highlights: highlights || '',
            keywords: [eventName.trim().toLowerCase(), ...keywords.map(k => k.toLowerCase())],
            capacity: parseInt(capacity) || 0,
            notes,
            status: 'active',
            totalScanned: 0,
            totalRSVPs: 0,
            totalInvitesSent: 0,
            createdAt: new Date()
        }, SA);

        return jsonOk({
            message: 'Event registered for evite tracking',
            eventId: record._id,
            eventName: record.eventName,
            keywords: record.keywords
        });

    } catch (e) {
        return jsonErr('create_event failed: ' + e.message, 500);
    }
}
export function options_evite_create_event(request) { return handleCors(); }

// ─────────────────────────────────────────────────────────────
// 2. LIST ALL TRACKED EVENTS
// GET /evite_events
// ─────────────────────────────────────────────────────────────

export async function get_evite_events(request) {
    try {
        const result = await wixData.query('EviteEvents')
            .descending('createdAt')
            .limit(50)
            .find(SA)
            .catch(() => ({ items: [] }));

        return jsonOk({ events: result.items, total: result.items.length });
    } catch (e) {
        return jsonErr(e.message, 500);
    }
}
export function options_evite_events(request) { return handleCors(); }

// ─────────────────────────────────────────────────────────────
// 3. SCAN INBOX — group + LLM-parse all matching emails
// POST /evite_scan
// Body: { eventId } OR { eventName, keywords[] }
// Options: { rescanAll: true } to re-parse already scanned emails
// ─────────────────────────────────────────────────────────────

export async function post_evite_scan(request) {
    try {
        const body = await parseBody(request);
        const { eventId, rescanAll = false, maxEmails = 200 } = body;

        if (!eventId) return jsonErr('Missing eventId');

        // Load event definition
        let event;
        try {
            event = await wixData.get('EviteEvents', eventId, SA);
        } catch (_) {}
        if (!event) return jsonErr('Event not found: ' + eventId);

        // List Gmail INBOX messages then filter by event keywords client-side
        // (q= text search not supported; labelIds=INBOX listing works fine)
        const token = await getGmailToken();
        const messageIds = await searchGmailMessages(maxEmails, token);

        let totalScanned = 0;
        const matched = [];
        for (const id of messageIds) {
            try {
                totalScanned++;
                const msg = await fetchGmailMessage(id, token);
                if (!isRelatedToEvent(msg, event)) continue;
                matched.push(msg);
                // Save to InboxMessages for record-keeping (best-effort)
                await wixData.query('InboxMessages').eq('gmailId', id).find(SA)
                    .then(r => {
                        if (r.items.length === 0) {
                            return wixData.insert('InboxMessages', {
                                gmailId: id,
                                from: msg.from,
                                subject: msg.subject,
                                body: msg.body,
                                folder: 'inbox',
                                receivedAt: msg.receivedAt,
                                source: 'evite-scan'
                            }, SA);
                        }
                    })
                    .catch(() => {});
            } catch (fetchErr) {
                // If a single message fails, skip and continue
            }
        }

        // Load already-parsed RSVPs for dedup
        const existingRSVPs = await wixData.query('EviteRSVPs')
            .eq('eventId', eventId)
            .limit(500)
            .find(SA)
            .catch(() => ({ items: [] }));

        const alreadyScannedIds = new Set(
            existingRSVPs.items
                .filter(r => !rescanAll)
                .map(r => r.gmailId)
        );

        const toProcess = matched.filter(m => !alreadyScannedIds.has(m.gmailId || m._id));

        const results = {
            eventId,
            eventName: event.eventName,
            totalInbox: totalScanned,
            matched: matched.length,
            alreadyParsed: existingRSVPs.items.length,
            newlyParsed: 0,
            skipped: 0,
            duplicatesFlagged: 0,
            additionalAdultsFlagged: 0,
            communicationsSent: 0,
            errors: [],
            rsvps: []
        };

        // LLM parse each new matching email
        for (const msg of toProcess) {
            try {
                const parsed = await llmParseRSVP(
                    msg.subject || '',
                    msg.body || msg.bodyHtml || '',
                    msg.from || ''
                );

                const gmailId = msg.gmailId || msg._id;

                // ── CRM + Family intelligence ──────────────────────────────
                // Emails may come from Evite platform (info@mailva.evite.com)
                // so also try matching by LLM-extracted senderName as fallback
                let member = await findMemberByEmail(msg.from);
                if (!member && parsed.senderName && parsed.senderName.length > 2) {
                    member = await findMemberByName(parsed.senderName);
                }
                const family = member && member.familyId ? await getFamilyGroup(member.familyId) : null;

                // Family-level dedup: check if another family member already responded
                const familyExistingRSVPs = family ? await getFamilyExistingRSVP(family.familyId, eventId) : [];
                const isDuplicate = familyExistingRSVPs.length > 0;
                const duplicateOf = isDuplicate ? familyExistingRSVPs[0]._id : '';
                const duplicateOfFrom = isDuplicate ? familyExistingRSVPs[0].from : '';

                // Determine membership type + adult threshold
                const membershipType = (family ? family.membershipType : member ? member.membershipType : '') || 'family';
                const adultThreshold = getAdultThreshold(membershipType);
                const extraAdults = Math.max(0, (parsed.adults || 0) - adultThreshold);
                const requiresCommunication = parsed.adults > adultThreshold;

                // Build the RSVP record
                const rsvpRecord = {
                    eventId,
                    eventName: event.eventName,
                    gmailId,
                    messageId: msg._id,
                    from: msg.from || '',
                    subject: msg.subject || '',
                    receivedAt: msg.receivedAt || new Date(),
                    // LLM extracted fields
                    rsvpStatus: parsed.rsvp,
                    senderName: parsed.senderName || extractNameFromEmail(msg.from || ''),
                    adults: parsed.adults,
                    kids: parsed.kids,
                    totalAttendees: (parsed.adults || 0) + (parsed.kids || 0),
                    vegCount: parsed.vegCount,
                    nonVegCount: parsed.nonVegCount,
                    dietary: parsed.dietary,
                    notes: parsed.notes,
                    llmConfidence: parsed.confidence,
                    llmRaw: parsed.llmRaw || '',
                    llmError: parsed.llmError || null,
                    parsedAt: new Date(),
                    manualOverride: false,
                    // CRM linkage
                    memberId: member ? (member.memberId || member._id || '') : '',
                    familyId: family ? (family.familyId || '') : '',
                    membershipType,
                    // Family dedup intelligence
                    isDuplicate,
                    duplicateOf,
                    dedupeNote: isDuplicate
                        ? `Family already responded via ${duplicateOfFrom}. Possible double-count — evite system uses ${duplicateOfFrom} as primary responder.`
                        : '',
                    // Additional adult flag
                    requiresCommunication,
                    extraAdults,
                    communicationNote: requiresCommunication
                        ? `${extraAdults} additional adult(s) beyond ${membershipType} membership coverage (threshold=${adultThreshold}). Clarification email sent: are they parents (free) or guests (charge applies)?`
                        : ''
                };

                // ── Update family profile: evite responder + food pattern ──
                if (!isDuplicate && family) {
                    const dietaryInfo = (parsed.dietary && parsed.dietary !== 'unknown') ? parsed.dietary : '';
                    const foodNote = dietaryInfo
                        ? `${dietaryInfo}${parsed.notes ? ' — ' + parsed.notes : ''}`
                        : (parsed.notes && parsed.notes.length > 2 ? parsed.notes : '');
                    await updateFamilyEvitePattern(
                        family,
                        extractEmailAddress(msg.from),
                        rsvpRecord.senderName,
                        foodNote,
                        msg.receivedAt || new Date()
                    );
                } else if (isDuplicate && family) {
                    // Check if this responder is different from stored evite responder
                    const thisEmail = extractEmailAddress(msg.from);
                    const storedResponder = family.eviteResponder || '';
                    if (storedResponder && storedResponder !== thisEmail) {
                        // Log responder conflict note on existing RSVP
                        try {
                            await wixData.update('FamilyGroups', {
                                ...family,
                                eviteResponderConflict: `Both ${storedResponder} and ${thisEmail} responded for this family (event: ${event.eventName}). Primary responder: ${storedResponder}.`
                            }, SA);
                        } catch (_) {}
                    }
                }

                // ── Send additional adult clarification if needed ────────
                let additionalAdultCommSent = false;
                if (requiresCommunication) {
                    try {
                        additionalAdultCommSent = await sendAdditionalAdultCommunication(
                            rsvpRecord, member, family, event, extraAdults, token
                        );
                    } catch (_) {}
                    rsvpRecord.communicationSentAt = new Date();
                    rsvpRecord.communicationEmailSent = additionalAdultCommSent;
                }

                // ── Upsert EviteRSVPs record ───────────────────────────────
                const existingById = await wixData.query('EviteRSVPs')
                    .eq('gmailId', gmailId)
                    .eq('eventId', eventId)
                    .find(SA)
                    .catch(() => ({ items: [] }));

                if (existingById.items.length > 0 && rescanAll) {
                    await wixData.update('EviteRSVPs', { ...existingById.items[0], ...rsvpRecord }, SA);
                } else if (existingById.items.length === 0) {
                    await wixData.insert('EviteRSVPs', rsvpRecord, SA);
                }

                results.newlyParsed++;
                if (isDuplicate) results.duplicatesFlagged++;
                if (requiresCommunication) results.additionalAdultsFlagged++;
                if (additionalAdultCommSent) results.communicationsSent++;
                results.rsvps.push({
                    from: msg.from,
                    subject: msg.subject,
                    rsvpStatus: parsed.rsvp,
                    senderName: rsvpRecord.senderName,
                    adults: parsed.adults,
                    kids: parsed.kids,
                    dietary: parsed.dietary,
                    vegCount: parsed.vegCount,
                    nonVegCount: parsed.nonVegCount,
                    confidence: parsed.confidence,
                    notes: parsed.notes,
                    // Intelligence fields
                    memberFound: !!member,
                    familyFound: !!family,
                    membershipType,
                    isDuplicate,
                    requiresCommunication,
                    extraAdults: extraAdults > 0 ? extraAdults : undefined,
                    communicationSent: additionalAdultCommSent || undefined
                });

            } catch (e) {
                results.errors.push({ from: msg.from, error: e.message });
            }
        }

        // Update event stats
        const allRSVPs = await wixData.query('EviteRSVPs')
            .eq('eventId', eventId)
            .limit(500)
            .find(SA)
            .catch(() => ({ items: [] }));

        await wixData.update('EviteEvents', {
            ...event,
            totalScanned: totalScanned,
            totalMatched: matched.length,
            totalRSVPs: allRSVPs.items.length,
            lastScannedAt: new Date(),
            lastScanStats: JSON.stringify({
                newlyParsed: results.newlyParsed,
                duplicatesFlagged: results.duplicatesFlagged,
                additionalAdultsFlagged: results.additionalAdultsFlagged,
                communicationsSent: results.communicationsSent,
                errors: results.errors.length
            })
        }, SA).catch(() => {});

        return jsonOk(results);

    } catch (e) {
        return jsonErr('evite_scan failed: ' + e.message, 500);
    }
}
export function options_evite_scan(request) { return handleCors(); }

// ─────────────────────────────────────────────────────────────
// 4. ATTENDANCE WORKSHEET REPORT
// GET /evite_attendance_report?eventId=xxx
// Returns full structured worksheet ready for rendering
// ─────────────────────────────────────────────────────────────

export async function get_evite_attendance_report(request) {
    try {
        const params = request.query || {};
        const eventId = params.eventId || params.event_id;
        if (!eventId) return jsonErr('Missing eventId');

        // Load event
        let event;
        try { event = await wixData.get('EviteEvents', eventId, SA); } catch (_) {}
        if (!event) return jsonErr('Event not found');

        // Load all RSVPs for this event
        const rsvpResult = await wixData.query('EviteRSVPs')
            .eq('eventId', eventId)
            .ascending('senderName')
            .limit(500)
            .find(SA)
            .catch(() => ({ items: [] }));

        const all = rsvpResult.items;

        const attending    = all.filter(r => r.rsvpStatus === 'yes');
        const notAttending = all.filter(r => r.rsvpStatus === 'no');
        const maybe        = all.filter(r => r.rsvpStatus === 'maybe');
        const unclear      = all.filter(r => r.rsvpStatus === 'unclear');

        // Aggregate totals from confirmed attending
        const totals = attending.reduce((acc, r) => {
            acc.adults       += (r.adults || 0);
            acc.kids         += (r.kids || 0);
            acc.vegCount     += (r.vegCount || 0);
            acc.nonVegCount  += (r.nonVegCount || 0);
            acc.totalHeads   += (r.totalAttendees || (r.adults || 0) + (r.kids || 0));
            return acc;
        }, { adults: 0, kids: 0, vegCount: 0, nonVegCount: 0, totalHeads: 0 });

        // Dietary breakdown across all confirmed
        const dietaryCounts = {};
        attending.forEach(r => {
            const d = r.dietary || 'unknown';
            dietaryCounts[d] = (dietaryCounts[d] || 0) + 1;
        });

        // Notes collection (non-empty)
        const allNotes = all
            .filter(r => r.notes && r.notes.trim())
            .map(r => ({ name: r.senderName || r.from, note: r.notes, rsvp: r.rsvpStatus }));

        // Low-confidence items that may need manual review
        const needsReview = all.filter(r => (r.llmConfidence || 0) < 0.55 && !r.manualOverride);

        const worksheet = {
            event: {
                _id: event._id,
                eventName: event.eventName,
                eventDate: event.eventDate,
                venue: event.venue,
                capacity: event.capacity,
                lastScannedAt: event.lastScannedAt
            },
            summary: {
                totalEmailsScanned: event.totalScanned || 0,
                totalResponses: all.length,
                attending: attending.length,
                notAttending: notAttending.length,
                maybe: maybe.length,
                unclear: unclear.length,
                responseRate: event.totalScanned > 0
                    ? Math.round((all.length / event.totalScanned) * 100)
                    : 0
            },
            headcount: {
                ...totals,
                capacityRemaining: event.capacity > 0 ? event.capacity - totals.totalHeads : null
            },
            dietary: {
                breakdown: dietaryCounts,
                vegTotal: totals.vegCount,
                nonVegTotal: totals.nonVegCount,
                unknownDietTotal: attending.length - Object.values(dietaryCounts)
                    .filter((_, i) => Object.keys(dietaryCounts)[i] !== 'unknown')
                    .reduce((s, v) => s + v, 0)
            },
            rows: {
                attending: attending.map(r => formatRow(r)),
                notAttending: notAttending.map(r => formatRow(r)),
                maybe: maybe.map(r => formatRow(r)),
                unclear: unclear.map(r => formatRow(r))
            },
            notes: allNotes,
            needsReview,
            generatedAt: new Date().toISOString()
        };

        return jsonOk({ worksheet });

    } catch (e) {
        return jsonErr('attendance_report failed: ' + e.message, 500);
    }
}
export function options_evite_attendance_report(request) { return handleCors(); }

function formatRow(r) {
    return {
        _id: r._id,
        senderName: r.senderName || '',
        email: r.from || '',
        subject: r.subject || '',
        rsvpStatus: r.rsvpStatus,
        adults: r.adults || 0,
        kids: r.kids || 0,
        totalAttendees: r.totalAttendees || (r.adults || 0) + (r.kids || 0),
        dietary: r.dietary || 'unknown',
        vegCount: r.vegCount || 0,
        nonVegCount: r.nonVegCount || 0,
        notes: r.notes || '',
        llmConfidence: Math.round((r.llmConfidence || 0) * 100),
        manualOverride: r.manualOverride || false,
        receivedAt: r.receivedAt,
        parsedAt: r.parsedAt
    };
}

// ─────────────────────────────────────────────────────────────
// 5. PARSE ONE EMAIL VIA LLM (debug / preview)
// POST /evite_parse_single
// Body: { subject, body, from }
// ─────────────────────────────────────────────────────────────

export async function post_evite_parse_single(request) {
    try {
        const body = await parseBody(request);
        const { subject = '', body: emailBody = '', from = '' } = body;

        if (!emailBody && !subject) return jsonErr('Missing subject and body');

        const parsed = await llmParseRSVP(subject, emailBody, from);
        return jsonOk({ parsed, input: { subject, from, bodyLength: emailBody.length } });

    } catch (e) {
        return jsonErr(e.message, 500);
    }
}
export function options_evite_parse_single(request) { return handleCors(); }

// ─────────────────────────────────────────────────────────────
// 6. MANUAL RSVP OVERRIDE
// POST /evite_rsvp_override
// Body: { rsvpId, rsvpStatus, adults, kids, vegCount, nonVegCount, dietary, notes }
// ─────────────────────────────────────────────────────────────

export async function post_evite_rsvp_override(request) {
    try {
        const body = await parseBody(request);
        const { rsvpId, ...updates } = body;
        if (!rsvpId) return jsonErr('Missing rsvpId');

        const existing = await wixData.get('EviteRSVPs', rsvpId, SA);
        if (!existing) return jsonErr('RSVP not found');

        const allowed = ['rsvpStatus', 'adults', 'kids', 'vegCount', 'nonVegCount', 'dietary', 'notes', 'senderName'];
        const patch = {};
        allowed.forEach(k => { if (k in updates) patch[k] = updates[k]; });
        if ('adults' in patch || 'kids' in patch) {
            patch.totalAttendees = (patch.adults ?? existing.adults ?? 0) + (patch.kids ?? existing.kids ?? 0);
        }

        const updated = await wixData.update('EviteRSVPs', {
            ...existing,
            ...patch,
            manualOverride: true,
            overrideAt: new Date()
        }, SA);

        return jsonOk({ message: 'RSVP updated', rsvp: formatRow(updated) });

    } catch (e) {
        return jsonErr(e.message, 500);
    }
}
export function options_evite_rsvp_override(request) { return handleCors(); }

// ─────────────────────────────────────────────────────────────
// 7. GET ALL RSVPs FOR AN EVENT (raw list)
// GET /evite_rsvps?eventId=xxx&status=yes
// ─────────────────────────────────────────────────────────────

export async function get_evite_rsvps(request) {
    try {
        const params = request.query || {};
        const eventId = params.eventId || params.event_id;
        if (!eventId) return jsonErr('Missing eventId');
        const status = params.status || null;

        let q = wixData.query('EviteRSVPs').eq('eventId', eventId).ascending('senderName').limit(500);
        if (status) q = q.eq('rsvpStatus', status);

        const result = await q.find(SA).catch(() => ({ items: [] }));
        return jsonOk({ rsvps: result.items.map(formatRow), total: result.items.length });

    } catch (e) {
        return jsonErr(e.message, 500);
    }
}
export function options_evite_rsvps(request) { return handleCors(); }

// ═══════════════════════════════════════════════════════════════
//  EVITE INVITATION MANAGEMENT  -  v3.0
//  Send branded HTML invitation emails, track per-recipient,
//  serve RSVP form, process submissions
// ═══════════════════════════════════════════════════════════════

const BANF_ORG        = 'Bengali Association of North Florida';
const BANF_EMAIL      = 'banfjax@gmail.com';
const RSVP_FORM_URL   = 'https://www.jaxbengali.org/rsvp.html';
const EVITE_COLLECTION = 'EviteInvitations';

// Collection auto-provision
let _eviteCollEnsured = false;
async function ensureEviteInvitations() {
    if (_eviteCollEnsured) return;
    try {
        await wixData.query(EVITE_COLLECTION).limit(1).find(SA);
        _eviteCollEnsured = true; return;
    } catch (e) {
        if (!e.message || !e.message.includes('WDE0025')) { _eviteCollEnsured = true; return; }
    }
    try {
        await wixData.save(EVITE_COLLECTION, { _init: true, ts: new Date() }, SA)
            .then(r => r && r._id ? wixData.remove(EVITE_COLLECTION, r._id, SA).catch(() => {}) : null);
        await new Promise(r => setTimeout(r, 400));
    } catch (_) {}
    _eviteCollEnsured = true;
}

function generateToken() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let t = '';
    for (let i = 0; i < 32; i++) t += chars.charAt(Math.floor(Math.random() * chars.length));
    return t;
}

// ── Simplified Gmail token (same as banf-survey.js) ──
async function getGmailTokenDirect() {
    const resp = await wixFetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `client_id=${GOOGLE_CLIENT_ID}&client_secret=${GOOGLE_CLIENT_SECRET}&refresh_token=${GOOGLE_REFRESH_TOKEN}&grant_type=refresh_token`
    });
    const data = await resp.json();
    if (data.access_token) return data.access_token;
    const resp2 = await wixFetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `client_id=407408718192.apps.googleusercontent.com&client_secret=kd-_2_AUosoGGTNYyMJiFL3j&refresh_token=${GOOGLE_REFRESH_TOKEN}&grant_type=refresh_token`
    });
    const data2 = await resp2.json();
    if (data2.access_token) return data2.access_token;
    throw new Error('Gmail token failed: ' + (data.error_description || data.error || 'unknown'));
}

// ── Build branded HTML invitation email ──
function buildInvitationEmail(recipientName, event, rsvpUrl) {
    const eventDate = event.eventDate ? new Date(event.eventDate) : null;
    const dateStr = eventDate
        ? eventDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
        : 'TBD';
    const timeStr = event.eventTime || '';
    const venue = event.venue || 'TBD';
    const description = event.description || '';

    return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${event.eventName} - You're Invited!</title></head>
<body style="margin:0;padding:0;background:#f4f0ed;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f0ed;padding:20px 0">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.08)">

<!-- Header -->
<tr><td style="background:linear-gradient(135deg,#8B0000,#DC143C);padding:32px 40px;text-align:center">
  <div style="font-size:14px;color:rgba(255,255,255,.8);letter-spacing:1px;text-transform:uppercase;margin-bottom:8px">You're Invited!</div>
  <div style="font-size:26px;font-weight:700;color:#fff;line-height:1.3">${event.eventName}</div>
  <div style="font-size:13px;color:rgba(255,255,255,.7);margin-top:8px">${BANF_ORG}</div>
</td></tr>

<!-- Event Details -->
<tr><td style="padding:32px 40px">
  <p style="font-size:16px;color:#333;margin:0 0 20px">Dear <strong>${recipientName}</strong>,</p>
  <p style="font-size:15px;color:#555;margin:0 0 24px;line-height:1.6">
    We are delighted to invite you and your family to our upcoming event. Your presence will make this celebration truly special!
  </p>

  <!-- Event Info Card -->
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#fdf6f0;border-radius:12px;border-left:4px solid #FF6B35;margin-bottom:24px">
  <tr><td style="padding:20px 24px">
    <div style="font-size:13px;color:#888;text-transform:uppercase;letter-spacing:.5px;margin-bottom:12px">Event Details</div>
    <table cellpadding="0" cellspacing="0" style="font-size:14px;color:#333">
      <tr><td style="padding:4px 16px 4px 0;font-weight:600;color:#8B0000;vertical-align:top">&#128197; Date</td><td style="padding:4px 0">${dateStr}</td></tr>
      ${timeStr ? `<tr><td style="padding:4px 16px 4px 0;font-weight:600;color:#8B0000;vertical-align:top">&#128336; Time</td><td style="padding:4px 0">${timeStr}</td></tr>` : ''}
      <tr><td style="padding:4px 16px 4px 0;font-weight:600;color:#8B0000;vertical-align:top">&#128205; Venue</td><td style="padding:4px 0">${venue}</td></tr>
    </table>
    ${description ? `<div style="margin-top:12px;font-size:14px;color:#555;line-height:1.5">${description}</div>` : ''}
  </td></tr></table>

  <!-- What we will ask -->
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f7ff;border-radius:12px;border-left:4px solid #3498db;margin-bottom:24px">
  <tr><td style="padding:16px 20px">
    <div style="font-size:13px;color:#2c3e50;font-weight:600;margin-bottom:8px">When you RSVP, we will ask for:</div>
    <table cellpadding="0" cellspacing="0" style="font-size:13px;color:#555">
      <tr><td style="padding:3px 10px 3px 0">&#9679;</td><td style="padding:3px 0">Number of <strong>adults</strong> attending</td></tr>
      <tr><td style="padding:3px 10px 3px 0">&#9679;</td><td style="padding:3px 0">Number of <strong>kids</strong> (under 18) attending</td></tr>
      <tr><td style="padding:3px 10px 3px 0">&#9679;</td><td style="padding:3px 0">How many prefer <strong>vegetarian</strong> vs <strong>non-vegetarian</strong> food</td></tr>
      <tr><td style="padding:3px 10px 3px 0">&#9679;</td><td style="padding:3px 0">Any <strong>allergies or dietary restrictions</strong></td></tr>
    </table>
  </td></tr></table>

  <!-- RSVP Button -->
  <table width="100%" cellpadding="0" cellspacing="0">
  <tr><td align="center" style="padding:12px 0 24px">
    <a href="${rsvpUrl}" style="display:inline-block;background:linear-gradient(135deg,#8B0000,#DC143C);color:#fff;font-size:16px;font-weight:700;text-decoration:none;padding:14px 40px;border-radius:30px;letter-spacing:.5px;box-shadow:0 4px 16px rgba(139,0,0,.3)">
      RSVP Now
    </a>
  </td></tr></table>

  <p style="font-size:13px;color:#888;text-align:center;margin:0 0 8px">
    Please respond by clicking the button above so we can plan accordingly.
  </p>

  <!-- What to Expect -->
  ${event.highlights ? `
  <div style="background:#f9f7f5;border-radius:12px;padding:16px 20px;margin-top:20px">
    <div style="font-size:13px;color:#8B0000;font-weight:600;margin-bottom:8px">What to Expect</div>
    <div style="font-size:14px;color:#555;line-height:1.6">${event.highlights}</div>
  </div>` : ''}

  <!-- Special Food Note -->
  <div style="background:#fff8f0;border-radius:12px;padding:14px 18px;margin-top:16px;border:1px solid #f0dcc8">
    <div style="font-size:12px;color:#8B6914;line-height:1.6">
      <strong>A Note on Special Dietary Requests:</strong> We sincerely apologize, but we may not always be able to accommodate every special food request due to logistical constraints. Our team will try our very best, and you will be informed closer to the event date whether your specific request can be fulfilled. We appreciate your understanding and patience!
    </div>
  </div>
</td></tr>

<!-- Footer -->
<tr><td style="background:#f9f7f5;padding:24px 40px;text-align:center;border-top:1px solid #eee">
  <div style="font-size:12px;color:#999;line-height:1.6">
    ${BANF_ORG}<br>
    Jacksonville, Florida<br>
    <a href="mailto:${BANF_EMAIL}" style="color:#8B0000;text-decoration:none">${BANF_EMAIL}</a>
  </div>
</td></tr>

</table>
</td></tr></table>
</body></html>`;
}

// ── Send one invitation email via Gmail API ──
async function sendInviteEmail(to, toName, subject, html, accessToken) {
    const message = [
        `To: ${toName} <${to}>`,
        `From: ${BANF_ORG} <${BANF_EMAIL}>`,
        `Subject: ${subject}`,
        `Content-Type: text/html; charset=utf-8`,
        `MIME-Version: 1.0`,
        '',
        html
    ].join('\r\n');
    const raw = btoa(unescape(encodeURIComponent(message)))
        .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

    const res = await wixFetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ raw })
    });
    const data = await res.json();
    return { ok: !!data.id, messageId: data.id, error: data.error ? JSON.stringify(data.error) : null };
}

// ─────────────────────────────────────────────────────────────
// 8. SEND INVITATION EMAILS
// POST /evite_send_invites
// Body: { eventId, recipients: [{name, email, role?}], customEmails?: [{name,email}] }
// ─────────────────────────────────────────────────────────────

export async function post_evite_send_invites(request) {
    try {
        await ensureEviteInvitations();
        const body = await parseBody(request);
        const { eventId, recipientType = 'ec', customEmails = [] } = body;

        if (!eventId) return jsonErr('Missing eventId');

        let event;
        try { event = await wixData.get('EviteEvents', eventId, SA); } catch (_) {}
        if (!event) return jsonErr('Event not found: ' + eventId);

        // Determine recipient list
        let recipients = [];
        if (recipientType === 'custom' && customEmails.length > 0) {
            recipients = customEmails;
        } else if (recipientType === 'ec' || recipientType === 'all_ec') {
            // Load EC members from AdminRoles
            const adminResult = await wixData.query('AdminRoles')
                .eq('isActive', true)
                .limit(50)
                .find(SA)
                .catch(() => ({ items: [] }));
            recipients = adminResult.items.map(a => ({
                name: a.name || a.email.split('@')[0],
                email: a.email,
                role: a.role || 'ec_member'
            }));
            // Always include president
            if (!recipients.some(r => r.email.toLowerCase() === 'ranadhir.ghosh@gmail.com')) {
                recipients.push({ name: 'Ranadhir Ghosh', email: 'ranadhir.ghosh@gmail.com', role: 'president' });
            }
        } else if (recipientType === 'all_members') {
            const membersResult = await wixData.query('CRMMembers')
                .eq('status', 'active')
                .limit(500)
                .find(SA)
                .catch(() => ({ items: [] }));
            recipients = membersResult.items
                .filter(m => m.email)
                .map(m => ({
                    name: m.displayName || (m.firstName + ' ' + m.lastName).trim(),
                    email: m.email,
                    role: 'member'
                }));
        }

        if (recipients.length === 0) return jsonErr('No recipients found');

        const accessToken = await getGmailTokenDirect();
        const subject = `You're Invited: ${event.eventName}`;
        const results = { sent: 0, failed: 0, total: recipients.length, details: [] };

        for (const recip of recipients) {
            try {
                // Generate unique token for RSVP tracking
                const token = generateToken();
                const rsvpUrl = `${RSVP_FORM_URL}?token=${token}&eventId=${eventId}`;

                // Build personalized email
                const html = buildInvitationEmail(recip.name, event, rsvpUrl);

                // Send
                const sendResult = await sendInviteEmail(recip.email, recip.name, subject, html, accessToken);

                // Save invitation record
                await wixData.insert(EVITE_COLLECTION, {
                    eventId,
                    eventName: event.eventName,
                    token,
                    recipientName: recip.name,
                    recipientEmail: recip.email.toLowerCase(),
                    recipientRole: recip.role || '',
                    sentAt: new Date(),
                    emailSent: sendResult.ok,
                    gmailMessageId: sendResult.messageId || '',
                    opened: false,
                    responded: false,
                    rsvpStatus: null,
                    adults: 0,
                    kids: 0,
                    dietary: '',
                    notes: '',
                    respondedAt: null
                }, SA);

                results.details.push({
                    name: recip.name,
                    email: recip.email,
                    sent: sendResult.ok,
                    error: sendResult.error
                });
                if (sendResult.ok) results.sent++;
                else results.failed++;

            } catch (e) {
                results.details.push({ name: recip.name, email: recip.email, sent: false, error: e.message });
                results.failed++;
            }
        }

        // Update event with send count
        try {
            await wixData.update('EviteEvents', {
                ...event,
                totalInvitesSent: (event.totalInvitesSent || 0) + results.sent,
                lastInviteSentAt: new Date()
            }, SA);
        } catch (_) {}

        return jsonOk(results);

    } catch (e) {
        return jsonErr('evite_send_invites failed: ' + e.message, 500);
    }
}
export function options_evite_send_invites(request) { return handleCors(); }

// ─────────────────────────────────────────────────────────────
// 9. RSVP FORM DATA — return event + invitation details for token
// GET /evite_rsvp_form_data?token=xxx
// ─────────────────────────────────────────────────────────────

export async function get_evite_rsvp_form_data(request) {
    try {
        const params = request.query || {};
        const token = params.token;
        if (!token) return jsonErr('Missing token');

        // Find invitation by token
        const invResult = await wixData.query(EVITE_COLLECTION)
            .eq('token', token)
            .limit(1)
            .find(SA)
            .catch(() => ({ items: [] }));

        if (invResult.items.length === 0) return jsonErr('Invalid or expired invitation token');
        const invitation = invResult.items[0];

        // Mark as opened
        if (!invitation.opened) {
            await wixData.update(EVITE_COLLECTION, {
                ...invitation,
                opened: true,
                openedAt: new Date()
            }, SA).catch(() => {});
        }

        // Load event
        let event = null;
        try { event = await wixData.get('EviteEvents', invitation.eventId, SA); } catch (_) {}

        return jsonOk({
            invitation: {
                recipientName: invitation.recipientName,
                recipientEmail: invitation.recipientEmail,
                responded: invitation.responded,
                rsvpStatus: invitation.rsvpStatus,
                respondedAt: invitation.respondedAt
            },
            event: event ? {
                eventName: event.eventName,
                eventDate: event.eventDate,
                eventTime: event.eventTime || '',
                venue: event.venue || '',
                description: event.description || '',
                highlights: event.highlights || '',
                capacity: event.capacity || 0
            } : null
        });

    } catch (e) {
        return jsonErr('rsvp_form_data failed: ' + e.message, 500);
    }
}
export function options_evite_rsvp_form_data(request) { return handleCors(); }

// ─────────────────────────────────────────────────────────────
// 10. RSVP SUBMIT — process RSVP form submission
// POST /evite_rsvp_submit
// Body: { token, rsvpStatus, adults, kids, vegCount, nonVegCount, dietary, notes }
// ─────────────────────────────────────────────────────────────

export async function post_evite_rsvp_submit(request) {
    try {
        const body = await parseBody(request);
        const { token, rsvpStatus, adults = 0, kids = 0, vegCount = 0, nonVegCount = 0, dietary = '', notes = '' } = body;

        if (!token) return jsonErr('Missing token');
        if (!rsvpStatus || !['yes', 'no', 'maybe'].includes(rsvpStatus)) {
            return jsonErr('Invalid rsvpStatus. Must be: yes, no, or maybe');
        }

        const invResult = await wixData.query(EVITE_COLLECTION)
            .eq('token', token)
            .limit(1)
            .find(SA)
            .catch(() => ({ items: [] }));

        if (invResult.items.length === 0) return jsonErr('Invalid or expired token');
        const invitation = invResult.items[0];

        // Update invitation with RSVP response
        const updated = await wixData.update(EVITE_COLLECTION, {
            ...invitation,
            responded: true,
            rsvpStatus,
            adults: parseInt(adults) || 0,
            kids: parseInt(kids) || 0,
            totalAttendees: (parseInt(adults) || 0) + (parseInt(kids) || 0),
            dietary: dietary || '',
            vegCount: parseInt(vegCount) || 0,
            nonVegCount: parseInt(nonVegCount) || 0,
            notes: (notes || '').substring(0, 500),
            respondedAt: new Date(),
            opened: true
        }, SA);

        // Also upsert into EviteRSVPs for compatibility with attendance report
        try {
            const existingRsvp = await wixData.query('EviteRSVPs')
                .eq('eventId', invitation.eventId)
                .eq('from', invitation.recipientEmail)
                .limit(1)
                .find(SA)
                .catch(() => ({ items: [] }));

            const rsvpData = {
                eventId: invitation.eventId,
                eventName: invitation.eventName,
                from: invitation.recipientEmail,
                subject: 'RSVP Form Submission',
                rsvpStatus,
                senderName: invitation.recipientName,
                adults: parseInt(adults) || 0,
                kids: parseInt(kids) || 0,
                totalAttendees: (parseInt(adults) || 0) + (parseInt(kids) || 0),
                dietary: dietary || 'unknown',
                vegCount: parseInt(vegCount) || 0,
                nonVegCount: parseInt(nonVegCount) || 0,
                notes: (notes || '').substring(0, 500),
                llmConfidence: 1.0,
                parsedAt: new Date(),
                manualOverride: false,
                receivedAt: new Date(),
                source: 'rsvp_form'
            };

            if (existingRsvp.items.length > 0) {
                await wixData.update('EviteRSVPs', { ...existingRsvp.items[0], ...rsvpData }, SA);
            } else {
                await wixData.insert('EviteRSVPs', rsvpData, SA);
            }
        } catch (_) {}

        // Update event RSVP count
        try {
            const event = await wixData.get('EviteEvents', invitation.eventId, SA);
            const rsvpCount = await wixData.query('EviteRSVPs')
                .eq('eventId', invitation.eventId)
                .count()
                .catch(() => 0);
            await wixData.update('EviteEvents', {
                ...event,
                totalRSVPs: rsvpCount
            }, SA);
        } catch (_) {}

        return jsonOk({
            message: rsvpStatus === 'yes'
                ? 'Thank you! We look forward to seeing you!'
                : rsvpStatus === 'no'
                ? 'Thank you for letting us know. We hope to see you at future events!'
                : 'Thank you! We hope you can make it!',
            rsvpStatus,
            respondedAt: updated.respondedAt
        });

    } catch (e) {
        return jsonErr('rsvp_submit failed: ' + e.message, 500);
    }
}
export function options_evite_rsvp_submit(request) { return handleCors(); }

// ─────────────────────────────────────────────────────────────
// 11. INVITATION STATUS — track who opened/responded
// GET /evite_invite_status?eventId=xxx
// ─────────────────────────────────────────────────────────────

export async function get_evite_invite_status(request) {
    try {
        const params = request.query || {};
        const eventId = params.eventId || params.event_id;
        if (!eventId) return jsonErr('Missing eventId');

        const invResult = await wixData.query(EVITE_COLLECTION)
            .eq('eventId', eventId)
            .ascending('recipientName')
            .limit(500)
            .find(SA)
            .catch(() => ({ items: [] }));

        const invitations = invResult.items;
        const summary = {
            total: invitations.length,
            sent: invitations.filter(i => i.emailSent).length,
            opened: invitations.filter(i => i.opened).length,
            responded: invitations.filter(i => i.responded).length,
            attending: invitations.filter(i => i.rsvpStatus === 'yes').length,
            declined: invitations.filter(i => i.rsvpStatus === 'no').length,
            maybe: invitations.filter(i => i.rsvpStatus === 'maybe').length,
            totalAdults: invitations.filter(i => i.rsvpStatus === 'yes').reduce((s, i) => s + (i.adults || 0), 0),
            totalKids: invitations.filter(i => i.rsvpStatus === 'yes').reduce((s, i) => s + (i.kids || 0), 0)
        };

        return jsonOk({
            summary,
            invitations: invitations.map(inv => ({
                recipientName: inv.recipientName,
                recipientEmail: inv.recipientEmail,
                recipientRole: inv.recipientRole,
                sentAt: inv.sentAt,
                emailSent: inv.emailSent,
                opened: inv.opened,
                openedAt: inv.openedAt,
                responded: inv.responded,
                rsvpStatus: inv.rsvpStatus,
                adults: inv.adults || 0,
                kids: inv.kids || 0,
                dietary: inv.dietary || '',
                notes: inv.notes || '',
                respondedAt: inv.respondedAt
            }))
        });

    } catch (e) {
        return jsonErr('invite_status failed: ' + e.message, 500);
    }
}
export function options_evite_invite_status(request) { return handleCors(); }

// ─────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────

function extractNameFromEmail(fromStr) {
    // "John Doe <john@example.com>" -> "John Doe"
    const m = fromStr.match(/^([^<]+)<[^>]+>/);
    if (m) return m[1].trim();
    // "john@example.com" -> "john"
    const parts = fromStr.split('@');
    return parts[0].replace(/[._+]/g, ' ').trim();
}
