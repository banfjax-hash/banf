/**
 * 
 *  BANF MEMBERSHIP DRIVE API  v2.0 (FY2026-27)
 * 
 *  Tiers and fees from:
 *    BANF_FY2026-27_Final_Presentation_UPDATED_A_V3.pptx
 *
 *  7 Categories:
 *    M2 Premium Early Bird (BEST VALUE), M2 Premium (All-Access),
 *    M1 Regular (Add-on eligible), Cultural Special (HIGHEST x),
 *    DP Special-1 (DP+Artist), DP Special-2 (Core DP, Lowest Fee),
 *    M3 Add-On / M4 Guest (a la carte)
 *
 *  4 Household Tiers per Category: Family, Couple, Individual, Student
 * 
 */

import { ok, badRequest, serverError, response as wixResponse } from 'wix-http-functions';
import wixData from 'wix-data';
import { fetch as wixFetch } from 'wix-fetch';
import { isECOnboardComplete, isDriveEnabled } from 'backend/ec-onboarding-gate';

const SA = { suppressAuth: true };
const BANF_EMAIL = 'banfjax@gmail.com';
const BANF_ORG = 'Bengali Association of North Florida (BANF)';
const PRESIDENT_EMAIL = 'ranadhir.ghosh@gmail.com';
const ZELLE_RECIPIENT = 'banfjax@gmail.com';

// TEST MODE: when true, all outbound emails are redirected to PRESIDENT_EMAIL.
// Set to false only when ready for production sends.
const TEST_MODE = true;
const ZELLE_NAME = 'BANF Jacksonville';

const GOOGLE_CLIENT_ID = '1020178199135-3usrl611ara38i7rhu2ub6sn6g1150ml.apps.googleusercontent.com';
const GOOGLE_CLIENT_SECRET = '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';
const GOOGLE_REFRESH_TOKEN = '1//04iXClX5dKpqhCgYIARAAGAQSNwF-L9IrCtEUhuup9COlH5wnvGtozgReO4E5ILylE9Jq4f8vw1YUXDT_ysiHcJ89g-PA96eh8Ko';

const HF_API_TOKEN = 'hf_VRPVFikGfnqfroBKRvbWfESqCYlvUid';
const HF_URL = 'https://router.huggingface.co/featherless-ai/v1/chat/completions';
const HF_MODEL = 'meta-llama/Llama-3.1-8B-Instruct';

const WIX_SITE = 'https://www.jaxbengali.org';

// Event calendar (slide 9)
const ALL_EVENTS = [
    { name: 'Bosonto Utsob',                  date: 'Mar 7',     type: 'Cultural'    },
    { name: 'Noboborsho (Bengali New Year)',   date: 'Apr 14',    type: 'Cultural'    },
    { name: 'Kids Summer Sports Training',     date: 'Jun-Jul',   type: 'Educational' },
    { name: 'Summer Workshops - Kids',         date: 'Jun-Jul',   type: 'Educational' },
    { name: 'Summer Workshops - General',      date: 'Jun-Jul',   type: 'Educational' },
    { name: 'Sports Day',                      date: 'Jul',       type: 'Social'      },
    { name: 'Spondon (Youth Cultural)',        date: 'Aug',       type: 'Cultural'    },
    { name: 'Mahalaya',                        date: 'Oct 17',    type: 'Religious'   },
    { name: 'Durga Puja Day 1 & 2 + Lunch',   date: 'Oct 24-25', type: 'Religious'   },
    { name: 'Lakshmi Puja',                    date: 'Oct 24',    type: 'Religious'   },
    { name: 'Bijoya Sonmiloni',                date: 'Oct 25',    type: 'Social'      },
    { name: 'Artist Program Day 1 + Dinner',  date: 'Oct 24',    type: 'Cultural'    },
    { name: 'Artist Program Day 2 + Dinner',  date: 'Oct 25',    type: 'Cultural'    },
    { name: 'Kali Puja + Lunch',              date: 'Nov 14',    type: 'Religious'   },
    { name: 'Natok (Drama) + Dinner',         date: 'Nov 14',    type: 'Cultural'    },
    { name: 'Winter Picnic',                  date: 'Jan 11/27', type: 'Social'      },
    { name: 'Saraswati Puja',                 date: 'Feb 27',    type: 'Religious'   }
];

// Access matrix: index matches ALL_EVENTS. Values: included / addon-price / not-available
const EVENT_ACCESS = {
    m2_eb:    ['incl','incl','incl','incl','incl','incl','incl','incl','incl','incl','incl','incl','incl','incl','incl','incl','incl'],
    m2:       ['incl','incl','incl','incl','incl','incl','incl','incl','incl','incl','incl','incl','incl','incl','incl','incl','incl'],
    m1:       ['incl','$30', '$45', '$35', '$35', 'incl','incl','incl','incl','incl','incl','$35', '$35', 'incl','incl','incl','incl'],
    cultural: ['incl','incl','$50', '$40', '$40', '$20', 'incl','na',  'na',  'na',  'na',  'na',  'na',  'na',  'incl','incl','na'  ],
    dp1:      ['na',  'na',  'na',  'na',  'na',  'na',  'na',  'incl','incl','incl','incl','incl','incl','na',  'na',  'na',  'na'  ],
    dp2:      ['na',  'na',  'na',  'na',  'na',  'na',  'na',  'incl','incl','incl','incl','na',  'na',  'na',  'na',  'na',  'na'  ]
};

// Membership categories (slides 8, 9, 10)
const MEMBERSHIP_CATEGORIES = [
    {
        id: 'm2_eb',
        name: 'M2 Premium - Early Bird',
        badge: 'BEST VALUE',
        icon: 'trophy',
        tagline: 'All 17 events + priority seating. Best overall value.',
        highlight: '2.64x value',
        color: '#8B0000',
        eventCount: 17,
        multiplier: 2.64,
        pricing: { family: 375, couple: 290, individual: 215, student: 145 },
        features: [
            'All 17 events fully included',
            'Priority seating at all programs',
            'Early Bird: save $35 vs standard M2',
            'Full family access (adults + all children)',
            'Digital magazine & newsletter',
            'Member directory & voting rights'
        ]
    },
    {
        id: 'm2',
        name: 'M2 Premium',
        badge: 'ALL-ACCESS',
        icon: 'star',
        tagline: 'Full access to all 17 events at standard premium pricing.',
        highlight: '2.41x value',
        color: '#C00020',
        eventCount: 17,
        multiplier: 2.41,
        pricing: { family: 410, couple: 330, individual: 240, student: 165 },
        features: [
            'All 17 events fully included',
            'Standard premium membership',
            'Full family access (adults + all children)',
            'Digital magazine & newsletter',
            'Member directory & voting rights'
        ]
    },
    {
        id: 'm1',
        name: 'M1 Regular',
        badge: 'ADD-ON ELIGIBLE',
        icon: 'list-check',
        tagline: '11 core religious & social events. Purchase add-ons for cultural events.',
        highlight: '2.04x value',
        color: '#FF6B35',
        eventCount: 11,
        multiplier: 2.04,
        pricing: { family: 280, couple: 255, individual: 140, student: 100 },
        features: [
            '11 core events (all religious + major social)',
            'Cultural/educational events via M3 add-ons',
            'Full family access for core events',
            'Digital magazine & newsletter',
            'Member directory & voting rights'
        ]
    },
    {
        id: 'cultural',
        name: 'Cultural Special',
        badge: 'HIGHEST VALUE',
        icon: 'masks-theater',
        tagline: '12 cultural, educational & social events. Highest value multiplier at 3.50x.',
        highlight: '3.50x value',
        color: '#D4AF37',
        eventCount: 12,
        multiplier: 3.50,
        pricing: { family: 180, couple: 140, individual: 100, student: 75 },
        features: [
            'Bosonto Utsob, Noboborsho, Spondon',
            'Summer Workshops (Kids + General)',
            'Sports Day, Natok & Winter Picnic',
            'Culture & arts focused package',
            'BANF newsletter included'
        ]
    },
    {
        id: 'dp1',
        name: 'DP Special-1 (with Artist)',
        badge: 'DP + CULTURAL',
        icon: 'flower1',
        tagline: 'Durga Puja + Artist Programs dinner nights (6 events).',
        highlight: '1.76x value',
        color: '#6f42c1',
        eventCount: 6,
        multiplier: 1.76,
        pricing: { family: 210, couple: 175, individual: 130, student: 95 },
        features: [
            'Mahalaya (Oct 17)',
            'Durga Puja Days 1 & 2 + Lunch (Oct 24-25)',
            'Lakshmi Puja (Oct 24)',
            'Bijoya Sonmiloni (Oct 25)',
            'Artist Program Day 1 + Dinner (Oct 24)',
            'Artist Program Day 2 + Dinner (Oct 25)'
        ]
    },
    {
        id: 'dp2',
        name: 'DP Special-2 (Core only)',
        badge: 'LOWEST FEE',
        icon: 'flower3',
        tagline: 'Core Durga Puja only (4 events). Most affordable entry.',
        highlight: '1.67x value',
        color: '#28a745',
        eventCount: 4,
        multiplier: 1.67,
        pricing: { family: 150, couple: 125, individual: 90, student: 65 },
        features: [
            'Mahalaya (Oct 17)',
            'Durga Puja Days 1 & 2 + Lunch (Oct 24-25)',
            'Lakshmi Puja (Oct 24)',
            'Bijoya Sonmiloni (Oct 25)',
            'Most affordable entry to BANF'
        ]
    }
];

// 
// HELPERS
// 
function jsonOk(data) {
    return ok({ body: JSON.stringify({ success: true, ...data }), headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
}
function jsonErr(msg) {
    return badRequest({ body: JSON.stringify({ success: false, error: msg }), headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
}
function jsonServerErr(msg) {
    return serverError({ body: JSON.stringify({ success: false, error: msg }), headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
}
function handleCors() {
    return ok({ body: '', headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type,Authorization,x-user-email' } });
}
async function parseBody(req) {
    try { return await req.body.json(); } catch (_) { return {}; }
}
function genCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = 'BANF-';
    for (let i = 0; i < 8; i++) code += chars[Math.floor(Math.random() * chars.length)];
    return code;
}
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
    // In TEST_MODE redirect every email to PRESIDENT_EMAIL so no real members are spammed.
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
    if (d.error) throw new Error(d.error.message || JSON.stringify(d.error));
    return d.id;
}

// 
// ─── COLLECTION BOOTSTRAP ──────────────────────────────────────────────────
//  Auto-creates MembershipConfig, MembershipUniverse, MembershipDrive
//  on the first request if they don't exist yet.
// ──────────────────────────────────────────────────────────────────────────
let _collectionsBootstrapped = false;

const MEMBERSHIP_COLLECTION_SCHEMAS = {
    MembershipConfig: {
        fields: [
            { _id: 'year',        displayName: 'Year',         type: 'TEXT'    },
            { _id: 'status',      displayName: 'Status',       type: 'TEXT'    }, // draft|active|archived
            { _id: 'categories',  displayName: 'Categories',   type: 'ARRAY'   }, // [{id,name,badge,pricing:{family,couple,individual,student},eventCount,color,tagline}]
            { _id: 'events',      displayName: 'Events',       type: 'ARRAY'   }, // [{name,date,type}]
            { _id: 'eventAccess', displayName: 'Event Access', type: 'OBJECT'  }, // {catId:['incl'|'na'|'$XX',...]}
            { _id: 'createdBy',   displayName: 'Created By',   type: 'TEXT'    },
            { _id: 'parsedAt',    displayName: 'Parsed At',    type: 'TEXT'    },
            { _id: 'notes',       displayName: 'Notes',        type: 'TEXT'    }
        ]
    },
    MembershipUniverse: {
        fields: [
            { _id: 'email',     displayName: 'Email',      type: 'TEXT'    },
            { _id: 'firstName', displayName: 'First Name', type: 'TEXT'    },
            { _id: 'lastName',  displayName: 'Last Name',  type: 'TEXT'    },
            { _id: 'phone',     displayName: 'Phone',      type: 'TEXT'    },
            { _id: 'isActive',  displayName: 'Is Active',  type: 'BOOLEAN' },
            { _id: 'isDemo',    displayName: 'Is Demo',    type: 'BOOLEAN' },
            { _id: 'source',    displayName: 'Source',     type: 'TEXT'    }, // manual|csv_import|crm_sync
            { _id: 'addedBy',   displayName: 'Added By',   type: 'TEXT'    },
            { _id: 'addedAt',   displayName: 'Added At',   type: 'TEXT'    }
        ]
    },
    MembershipDrive: {
        fields: [
            { _id: 'year',             displayName: 'Year',           type: 'TEXT'    },
            { _id: 'mode',             displayName: 'Mode',           type: 'TEXT'    }, // demo|live
            { _id: 'status',           displayName: 'Status',         type: 'TEXT'    }, // idle|running|paused|complete|stopped
            { _id: 'configId',         displayName: 'Config ID',      type: 'TEXT'    },
            { _id: 'launchedBy',       displayName: 'Launched By',    type: 'TEXT'    },
            { _id: 'launchedAt',       displayName: 'Launched At',    type: 'TEXT'    },
            { _id: 'totalTargets',     displayName: 'Total Targets',  type: 'NUMBER'  },
            { _id: 'sentCount',        displayName: 'Sent Count',     type: 'NUMBER'  },
            { _id: 'errorCount',       displayName: 'Error Count',    type: 'NUMBER'  },
            { _id: 'completedAt',      displayName: 'Completed At',   type: 'TEXT'    },
            { _id: 'notes',            displayName: 'Notes',          type: 'TEXT'    },
            { _id: 'lastControlledBy', displayName: 'Controlled By',  type: 'TEXT'    },
            { _id: 'lastControlledAt', displayName: 'Controlled At',  type: 'TEXT'    }
        ]
    }
};

async function ensureMembershipCollections() {
    if (_collectionsBootstrapped) return;
    _collectionsBootstrapped = true; // set immediately to avoid re-entrant calls
    for (const [collId, schema] of Object.entries(MEMBERSHIP_COLLECTION_SCHEMAS)) {
        try {
            // Fast-path: query succeeds → collection exists
            await wixData.query(collId).limit(1).find(SA);
        } catch (e1) {
            if (!e1.message || !e1.message.includes('WDE0025')) continue; // unexpected error — skip
            // Collection missing → try wix-data.v2 createDataCollection
            try {
                const { collections } = await import('wix-data.v2');
                await collections.createDataCollection({
                    _id: collId,
                    displayName: collId,
                    fields: schema.fields,
                    permissions: {
                        read:   { anyoneCanRead:   false, roles: ['ADMIN'] },
                        write:  { anyoneCanWrite:  false, roles: ['ADMIN'] },
                        insert: { anyoneCanInsert: false, roles: ['ADMIN'] },
                        update: { anyoneCanUpdate: false, roles: ['ADMIN'] },
                        remove: { anyoneCanRemove: false, roles: ['ADMIN'] }
                    }
                });
            } catch (e2) {
                // v2 API not available — fall back to bootstrap-insert approach
                try {
                    const sentinel = await wixData.insert(collId, {
                        _placeholder: true, _bootstrapAt: new Date().toISOString()
                    }, SA);
                    await wixData.remove(collId, sentinel._id, SA);
                } catch (e3) {
                    // Collection truly cannot be created at runtime — must use provision script
                    console.error(`[membership-drive] Could not auto-create ${collId}: ${e3.message}`);
                }
            }
        }
    }
}

// 
// 1. GET /membership_tiers
// 
export async function get_membership_tiers(request) {
    await ensureMembershipCollections();
    // Try DB-driven config first (latest active record)
    try {
        const cfgResult = await wixData.query('MembershipConfig')
            .eq('status', 'active')
            .descending('_createdDate')
            .limit(1)
            .find(SA);
        if (cfgResult.items.length > 0) {
            const cfg = cfgResult.items[0];
            return jsonOk({
                categories:    cfg.categories   || MEMBERSHIP_CATEGORIES,
                events:        cfg.events        || ALL_EVENTS,
                eventAccess:   cfg.eventAccess   || EVENT_ACCESS,
                year:          cfg.year          || 'FY2026-27',
                currency:      'USD',
                source:        'db',
                configId:      cfg._id,
                zelleRecipient: ZELLE_RECIPIENT,
                householdTypes: [
                    { id: 'family',     label: 'Family',     desc: '2 adults + children (all ages)' },
                    { id: 'couple',     label: 'Couple',     desc: '2 adults, no children' },
                    { id: 'individual', label: 'Individual', desc: '1 adult' },
                    { id: 'student',    label: 'Student',    desc: 'Full-time student (18-25)' }
                ]
            });
        }
    } catch (e) { /* fall through to hardcoded */ }
    // Fallback: hardcoded constants from PPTX
    return jsonOk({
        categories: MEMBERSHIP_CATEGORIES,
        events: ALL_EVENTS,
        eventAccess: EVENT_ACCESS,
        year: 'FY2026-27',
        currency: 'USD',
        source: 'hardcoded',
        zelleRecipient: ZELLE_RECIPIENT,
        householdTypes: [
            { id: 'family',     label: 'Family',     desc: '2 adults + children (all ages)' },
            { id: 'couple',     label: 'Couple',     desc: '2 adults, no children' },
            { id: 'individual', label: 'Individual', desc: '1 adult' },
            { id: 'student',    label: 'Student',    desc: 'Full-time student (18-25)' }
        ]
    });
}
export function options_membership_tiers(request) { return handleCors(); }

// 
// 2. POST /membership_recommend - AI Advisor
// 
export async function post_membership_recommend(request) {
    const body = await parseBody(request);
    const {
        adults = 1, children = 0, interests = [], budget = null,
        isStudent = false, dpFocused = false,
        previousCategoryId = null, attendedEventNames = []
    } = body;
    let householdType = 'individual';
    if (isStudent) householdType = 'student';
    else if (adults >= 2 && children > 0) householdType = 'family';
    else if (adults >= 2) householdType = 'couple';

    const prevCat = previousCategoryId ? MEMBERSHIP_CATEGORIES.find(c => c.id === previousCategoryId) : null;
    const prevContext = prevCat
        ? `The member's LAST YEAR tier was ${prevCat.name} ($${prevCat.pricing[householdType]}/yr). Recommend whether to renew or switch.`
        : '';

    const tiers = MEMBERSHIP_CATEGORIES.map(c =>
        `${c.name} ($${c.pricing[householdType]}/yr, ${c.eventCount} events, ${c.multiplier}x): ${c.tagline}`
    ).join('\n');

    const prompt = `You are a helpful BANF membership advisor. Recommend one membership category for this household:
Adults: ${adults}, Children: ${children}, Student: ${isStudent}, Household type: ${householdType}
Interests: ${interests.length ? interests.join(', ') : 'general events'}
Budget: ${budget ? '$' + budget + '/yr' : 'flexible'}
Durga Puja focused: ${dpFocused}
${prevContext}

FY2026-27 Options (${householdType} pricing):
${tiers}

Respond in 2 sentences: Start with the category name in **bold**. Optionally mention one alternative.`;

    // Helper to build vsPrevious comparison inline
    function buildVsPrevious(recommendedId, ht) {
        if (!prevCat) return null;
        const recCat       = MEMBERSHIP_CATEGORIES.find(c => c.id === recommendedId) || prevCat;
        const prevPrice    = prevCat.pricing[ht] || prevCat.pricing.individual;
        const recPrice     = recCat.pricing[ht]  || recCat.pricing.individual;
        const prevEquity   = Math.round(prevPrice * prevCat.multiplier);
        const recEquity    = Math.round(recPrice  * recCat.multiplier);
        const prevAccess   = EVENT_ACCESS[prevCat.id] || [];
        const recAccess    = EVENT_ACCESS[recCat.id]  || [];
        let addonCost = 0;
        const addons = [];
        const lost   = [];
        for (let i = 0; i < ALL_EVENTS.length; i++) {
            const ev = ALL_EVENTS[i];
            const waA = prevAccess[i] || 'na';
            const nwA = recAccess[i]  || 'na';
            if (waA === 'incl' && nwA !== 'incl') {
                if (nwA.startsWith('$')) {
                    const fee = parseInt(nwA.slice(1)) || 0;
                    if (attendedEventNames.includes(ev.name)) addonCost += fee;
                    addons.push({ event: ev.name, date: ev.date, fee, attended: attendedEventNames.includes(ev.name) });
                } else lost.push({ event: ev.name, date: ev.date });
            }
        }
        return {
            previousCategoryId: prevCat.id, previousCategoryName: prevCat.name,
            previousPrice: prevPrice, previousEquityValue: prevEquity,
            recommendedCategoryId: recCat.id, recommendedCategoryName: recCat.name,
            recommendedPrice: recPrice,  recommendedEquityValue: recEquity,
            priceDiff: recPrice - prevPrice, equityChange: recEquity - prevEquity,
            estimatedAddonCost: addonCost, totalChangeCost: (recPrice - prevPrice) + addonCost,
            addonDetails: addons, lostEvents: lost,
            isSameTier: prevCat.id === recCat.id,
            verdict: prevCat.id === recCat.id ? 'renewal_same_tier' :
                     (recPrice - prevPrice) + addonCost < -20 ? 'clear_savings' :
                     (recPrice - prevPrice) + addonCost <= 20  ? 'roughly_neutral' : 'change_increases_cost'
        };
    }

    try {
        const res = await wixFetch(HF_URL, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${HF_API_TOKEN}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ model: HF_MODEL, messages: [{ role: 'user', content: prompt }], max_tokens: 150, temperature: 0.4 })
        });
        const data = await res.json();
        const reply = data.choices?.[0]?.message?.content || '';
        let recommendedId = null;
        for (const c of MEMBERSHIP_CATEGORIES) {
            if (reply.toLowerCase().includes(c.name.toLowerCase().split('-')[0].trim())) { recommendedId = c.id; break; }
        }
        if (!recommendedId) recommendedId = fallbackRecommend(isStudent, dpFocused, adults, children, budget, householdType);
        const category = MEMBERSHIP_CATEGORIES.find(c => c.id === recommendedId);
        return jsonOk({
            recommendation: reply, recommendedCategoryId: recommendedId, category,
            householdType, price: category.pricing[householdType],
            vsPrevious: buildVsPrevious(recommendedId, householdType)
        });
    } catch (_) {
        const recommendedId = fallbackRecommend(isStudent, dpFocused, adults, children, budget, householdType);
        const category = MEMBERSHIP_CATEGORIES.find(c => c.id === recommendedId);
        return jsonOk({
            recommendation: `**${category.name}** ($${category.pricing[householdType]}) is the best fit  ${category.tagline}`,
            recommendedCategoryId: recommendedId, category, householdType, price: category.pricing[householdType],
            vsPrevious: buildVsPrevious(recommendedId, householdType)
        });
    }
}
export function options_membership_recommend(request) { return handleCors(); }

function fallbackRecommend(isStudent, dpFocused, adults, children, budget, householdType) {
    if (isStudent) return 'm1';
    if (dpFocused && budget && +budget <= 150) return 'dp2';
    if (dpFocused) return 'dp1';
    if (budget) {
        const max = +budget;
        for (const id of ['dp2', 'cultural', 'dp1', 'm1', 'm2_eb', 'm2']) {
            const c = MEMBERSHIP_CATEGORIES.find(x => x.id === id);
            if (c && c.pricing[householdType] <= max) return id;
        }
    }
    return 'm2_eb';
}

// 
// 2b. GET /membership_history  — returns previous-year membership + family profile for a member
//     Used by the advisor to pre-fill defaults and enable informed upgrade/downgrade analysis.
// 
export async function get_membership_history(request) {
    try {
        const params = request.query || {};
        const { email } = params;
        if (!email) return jsonErr('email parameter required');
        const lc = email.toLowerCase();

        // All registrations for this email, most recent first
        const allRegs = await wixData.query('MembershipRegistrations')
            .eq('email', lc).descending('_createdDate').limit(10).find(SA);

        const currentReg = allRegs.items.find(r => r.membershipYear === 'FY2026-27') || null;
        const prevReg    = allRegs.items.find(r => r.membershipYear !== 'FY2026-27') || null;

        // Members record
        const memRes = await wixData.query('Members').eq('email', lc).find(SA);
        const memberRecord = memRes.items.length ? memRes.items[0] : null;

        // Calculate equity value for previous tier
        let prevEquity = null;
        if (prevReg) {
            const prevCat = MEMBERSHIP_CATEGORIES.find(c => c.id === prevReg.categoryId);
            if (prevCat) {
                const ht = prevReg.householdType || 'individual';
                prevEquity = Math.round((prevCat.pricing[ht] || 0) * prevCat.multiplier);
            }
        }

        return jsonOk({
            hasPreviousMembership: !!prevReg,
            previousRegistration: prevReg ? {
                year:             prevReg.membershipYear,
                categoryId:       prevReg.categoryId,
                categoryName:     prevReg.categoryName,
                householdType:    prevReg.householdType,
                amount:           prevReg.amount,
                equityValue:      prevEquity,
                adultCount:       prevReg.adultCount || 1,
                childCount:       prevReg.childCount || 0,
                childNames:       prevReg.childNames || [],
                spouseName:       prevReg.spouseName || '',
                familyMembers:    prevReg.familyMembers || [],
                familyId:         prevReg.familyId || null,
                attendedEvents:   prevReg.attendedEvents || [],
                registrationCode: prevReg.registrationCode
            } : null,
            currentRegistration: currentReg ? {
                year:             'FY2026-27',
                categoryId:       currentReg.categoryId,
                categoryName:     currentReg.categoryName,
                status:           currentReg.status,
                registrationCode: currentReg.registrationCode
            } : null,
            memberRecord: memberRecord ? {
                firstName:   memberRecord.firstName,
                lastName:    memberRecord.lastName,
                memberSince: memberRecord.joinedAt || memberRecord._createdDate,
                isActive:    memberRecord.isActive
            } : null,
            defaultCategoryId: prevReg ? prevReg.categoryId : null
        });
    } catch (e) { return jsonServerErr(e.message); }
}
export function options_membership_history(request) { return handleCors(); }

// 
// 2c. POST /membership_compare  — compare two tiers for the same household
//     Returns equity delta and projected add-on cost based on event attendance history.
// 
export async function post_membership_compare(request) {
    try {
        const body = await parseBody(request);
        const { currentCategoryId, newCategoryId, householdType = 'individual', attendedEventNames = [] } = body;
        if (!currentCategoryId || !newCategoryId) return jsonErr('currentCategoryId and newCategoryId required');

        const currentCat = MEMBERSHIP_CATEGORIES.find(c => c.id === currentCategoryId);
        const newCat     = MEMBERSHIP_CATEGORIES.find(c => c.id === newCategoryId);
        if (!currentCat || !newCat) return jsonErr('Invalid categoryId');

        const ht         = ['family','couple','individual','student'].includes(householdType) ? householdType : 'individual';
        const currentPrice = currentCat.pricing[ht] || currentCat.pricing.individual;
        const newPrice     = newCat.pricing[ht]     || newCat.pricing.individual;
        const priceDiff    = newPrice - currentPrice;

        // Equity values
        const currentEquity = Math.round(currentPrice * currentCat.multiplier);
        const newEquity     = Math.round(newPrice     * newCat.multiplier);
        const equityChange  = newEquity - currentEquity;

        // Add-on cost projection based on attendance history
        const currentAccess = EVENT_ACCESS[currentCategoryId] || [];
        const newAccess     = EVENT_ACCESS[newCategoryId]     || [];
        let estimatedAddonCost = 0;
        const addonDetails  = [];   // events now requiring add-on fee
        const lostEvents    = [];   // events no longer available at any price
        const newlyIncluded = [];   // events newly included in new tier

        for (let i = 0; i < ALL_EVENTS.length; i++) {
            const ev      = ALL_EVENTS[i];
            const wasAcc  = currentAccess[i] || 'na';
            const nowAcc  = newAccess[i]     || 'na';
            const attended = attendedEventNames.includes(ev.name);

            if (wasAcc === 'incl' && nowAcc !== 'incl') {
                if (nowAcc.startsWith('$')) {
                    const fee = parseInt(nowAcc.slice(1)) || 0;
                    estimatedAddonCost += attended ? fee : 0;
                    addonDetails.push({ event: ev.name, date: ev.date, addonFee: fee, likelyToAttend: attended });
                } else {
                    lostEvents.push({ event: ev.name, date: ev.date });
                }
            } else if (wasAcc !== 'incl' && nowAcc === 'incl') {
                newlyIncluded.push({ event: ev.name, date: ev.date });
            }
        }

        const totalChangeCost = priceDiff + estimatedAddonCost;
        const verdict =
            totalChangeCost < -20  ? 'clear_savings'      :
            totalChangeCost <= 20  ? 'roughly_neutral'    :
            totalChangeCost <= 75  ? 'marginal_increase'  :
                                     'significant_increase';

        return jsonOk({
            comparison: {
                current: {
                    id: currentCat.id, name: currentCat.name, price: currentPrice,
                    equityValue: currentEquity, eventCount: currentCat.eventCount
                },
                new: {
                    id: newCat.id, name: newCat.name, price: newPrice,
                    equityValue: newEquity, eventCount: newCat.eventCount
                },
                priceDiff,
                equityChange,
                estimatedAddonCost,
                totalChangeCost,
                addonDetails,
                lostEvents,
                newlyIncluded,
                verdict,
                summary: `${newCategoryId === currentCategoryId ? 'Same tier.' :
                    priceDiff > 0 ? `Upgrade: $${priceDiff} more per year.` :
                    `Downgrade: save $${-priceDiff}/yr`} Equity ${equityChange >= 0 ? '+' : ''}${equityChange}.`
                    + (estimatedAddonCost > 0 ? ` Est. add-ons based on attendance: +$${estimatedAddonCost}.` : '')
            }
        });
    } catch (e) { return jsonServerErr(e.message); }
}
export function options_membership_compare(request) { return handleCors(); }

// 
// 3. POST /membership_register
// 
export async function post_membership_register(request) {
    try {
        // GATE: Membership drive must be enabled (EC onboarding complete + drive approved)
        const driveOpen = await isDriveEnabled();
        if (!driveOpen) {
            return badRequest({
                body: JSON.stringify({
                    error: 'Membership registration is not open yet. The membership drive has not been launched for the current fiscal year.',
                    gate: 'drive_not_enabled'
                }),
                headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
            });
        }

        const body = await parseBody(request);
        const req = ['firstName', 'lastName', 'email', 'categoryId', 'householdType'];
        for (const f of req) if (!body[f]) return jsonErr('Missing: ' + f);
        const category = MEMBERSHIP_CATEGORIES.find(c => c.id === body.categoryId);
        if (!category) return jsonErr('Invalid categoryId');
        if (!['family','couple','individual','student'].includes(body.householdType)) return jsonErr('Invalid householdType');
        const amount = category.pricing[body.householdType];

        const existing = await wixData.query('MembershipRegistrations')
            .eq('email', body.email.toLowerCase()).eq('membershipYear', 'FY2026-27').find(SA);
        if (existing.items.length > 0) {
            const p = existing.items[0];
            return jsonOk({ alreadyRegistered: true, registrationCode: p.registrationCode, status: p.status, amount: p.amount,
                testPayLink: `https://www.jaxbengali.org/_functions/membership_test_pay?code=${p.registrationCode}`,
                message: 'Already registered for FY2026-27.' });
        }

        let code = genCode();
        for (let i = 0; i < 5; i++) {
            const chk = await wixData.query('MembershipRegistrations').eq('registrationCode', code).find(SA);
            if (!chk.items.length) break;
            code = genCode();
        }

        // Family members: [{name, role:'primary_adult'|'secondary_adult'|'child', included:true/false}]
        // familyId: shared identifier for household (use primaryEmail or explicit ID)
        // previousCategoryId: what they had last year
        // attendedEvents: events attended last year (array of event names)
        const familyMembers    = body.familyMembers    || [];
        const familyId         = body.familyId         || body.email.toLowerCase();
        const previousCatId    = body.previousCategoryId || null;
        const attendedEvents   = body.attendedEvents   || [];

        await wixData.insert('MembershipRegistrations', {
            firstName: body.firstName, lastName: body.lastName,
            email: body.email.toLowerCase(), phone: body.phone || '',
            categoryId: body.categoryId, categoryName: category.name,
            householdType: body.householdType, membershipYear: 'FY2026-27',
            amount, adultCount: body.adultCount || (body.householdType === 'couple' ? 2 : 1),
            childCount: body.childCount || 0, childNames: body.childNames || [],
            spouseName: body.spouseName || '', city: body.city || '',
            address: body.address || '', zip: body.zip || '', state: body.state || 'FL',
            registrationCode: code, status: 'pending_payment',
            paymentMethod: 'zelle', referralSource: body.referralSource || '',
            familyMembers, familyId, previousCategoryId: previousCatId, attendedEvents,
            registeredAt: new Date()
        }, SA);

        // If an excluded secondary adult needs their own membership, create a linked record
        let linkedCode = null;
        const excl = body.excludedAdult;
        if (excl && body.excludedAdultNeedsSeparate && excl.email && excl.firstName && excl.lastName && excl.categoryId) {
            const exclCat = MEMBERSHIP_CATEGORIES.find(c => c.id === excl.categoryId);
            if (exclCat) {
                const exclHT     = excl.householdType || 'individual';
                const exclAmount = exclCat.pricing[exclHT] || exclCat.pricing.individual;
                linkedCode = genCode();
                for (let i = 0; i < 5; i++) {
                    const chk = await wixData.query('MembershipRegistrations').eq('registrationCode', linkedCode).find(SA);
                    if (!chk.items.length) break;
                    linkedCode = genCode();
                }
                await wixData.insert('MembershipRegistrations', {
                    firstName: excl.firstName, lastName: excl.lastName,
                    email: excl.email.toLowerCase(), phone: excl.phone || '',
                    categoryId: excl.categoryId, categoryName: exclCat.name,
                    householdType: exclHT, membershipYear: 'FY2026-27',
                    amount: exclAmount,
                    adultCount: 1, childCount: 0, childNames: [],
                    registrationCode: linkedCode, status: 'pending_payment',
                    paymentMethod: 'zelle',
                    // Link back to the primary family record
                    familyId, linkedToPrimaryCode: code, isSplitFamily: true,
                    registeredAt: new Date()
                }, SA);
                try {
                    await sendGmail(excl.email, `${excl.firstName} ${excl.lastName}`,
                        `BANF FY2026-27 Registration Confirmed - Code: ${linkedCode}`,
                        buildConfirmationEmail(
                            { firstName: excl.firstName, lastName: excl.lastName, email: excl.email, householdType: exclHT, phone: excl.phone || '' },
                            exclCat, exclAmount, linkedCode
                        ));
                } catch (_) {}
            }
        }

        try {
            await sendGmail(body.email, `${body.firstName} ${body.lastName}`,
                `BANF FY2026-27 Registration Confirmed - Code: ${code}`,
                buildConfirmationEmail(body, category, amount, code));
            await sendGmail(PRESIDENT_EMAIL, 'BANF President',
                `New Registration: ${body.firstName} ${body.lastName} - ${category.name} (${body.householdType}) $${amount}`,
                `<p>New BANF FY2026-27 registration:</p><ul>
                <li><b>Name:</b> ${body.firstName} ${body.lastName}</li>
                <li><b>Email:</b> ${body.email}</li>
                <li><b>Category:</b> ${category.name} - ${body.householdType} - $${amount}</li>
                <li><b>Code:</b> ${code}</li>
                ${linkedCode ? `<li><b>Linked (split family) Code:</b> ${linkedCode}</li>` : ''}
                <li><b>Test Payment Link:</b> <a href="https://www.jaxbengali.org/_functions/membership_test_pay?code=${code}">Click to simulate payment</a></li>
                </ul>`);
        } catch (emailErr) { console.error('Email failed:', emailErr.message); }

        return jsonOk({
            registrationCode: code,
            linkedRegistrationCode: linkedCode,
            status: 'pending_payment',
            category, householdType: body.householdType, amount,
            zelleRecipient: ZELLE_RECIPIENT, zelleName: ZELLE_NAME,
            zelleNote: `BANF Membership ${code}`,
            testPayLink: `https://www.jaxbengali.org/_functions/membership_test_pay?code=${code}`,
            message: `Registration confirmed! Zelle $${amount} to ${ZELLE_RECIPIENT} with note: BANF Membership ${code}`
                + (linkedCode ? ` Split family member also registered (code: ${linkedCode}).` : '')
        });
    } catch (e) { return jsonServerErr('Registration failed: ' + e.message); }
}
export function options_membership_register(request) { return handleCors(); }

// 
// 4. GET /membership_status
// 
export async function get_membership_status(request) {
    try {
        const params = request.query || {};
        const { code, email } = params;
        if (!code && !email) return jsonErr('Provide code or email');
        let q = wixData.query('MembershipRegistrations');
        if (code) q = q.eq('registrationCode', code.toUpperCase());
        else q = q.eq('email', email.toLowerCase()).eq('membershipYear', 'FY2026-27');
        const res = await q.find(SA);
        if (!res.items.length) return jsonErr('Registration not found');
        const reg = res.items[0];
        return jsonOk({
            registration: {
                firstName: reg.firstName, lastName: reg.lastName, email: reg.email,
                registrationCode: reg.registrationCode, category: reg.categoryName,
                householdType: reg.householdType, amount: reg.amount,
                status: reg.status, membershipYear: reg.membershipYear, registeredAt: reg.registeredAt
            },
            instructions: reg.status === 'pending_payment'
                ? `Zelle $${reg.amount} to ${ZELLE_RECIPIENT} with note: BANF Membership ${reg.registrationCode}`
                : reg.status === 'active' ? 'Membership active! Welcome to BANF.' : 'Contact banfjax@gmail.com.',
            testPayLink: reg.status === 'pending_payment'
                ? `https://www.jaxbengali.org/_functions/membership_test_pay?code=${reg.registrationCode}` : null
        });
    } catch (e) { return jsonServerErr(e.message); }
}
export function options_membership_status(request) { return handleCors(); }

// 
// 5. GET /membership_test_pay  --  DEMO/TEST MODE
//    Simulates Zelle payment received.
//    Marks registration as active and sends welcome email.
//    Redirects to join.html?paid=1&code=XXX
// 
export async function get_membership_test_pay(request) {
    try {
        const params = request.query || {};
        const code = (params.code || '').toUpperCase().trim();
        if (!code) {
            return wixResponse({ status: 302, headers: { Location: `${WIX_SITE}/_functions/join?error=missing_code` } });
        }

        const q = await wixData.query('MembershipRegistrations').eq('registrationCode', code).find(SA);
        if (!q.items.length) {
            return wixResponse({ status: 302, headers: { Location: `${WIX_SITE}/_functions/join?error=not_found&code=${encodeURIComponent(code)}` } });
        }

        const reg = q.items[0];
        if (reg.status === 'active') {
            return wixResponse({ status: 302, headers: { Location: `${WIX_SITE}/_functions/join?paid=already&code=${encodeURIComponent(code)}&name=${encodeURIComponent(reg.firstName)}` } });
        }

        // Activate registration
        await wixData.update('MembershipRegistrations', {
            ...reg, status: 'active',
            confirmedBy: 'TEST_PAYMENT_DEMO',
            confirmedAt: new Date()
        }, SA);

        // Create/update Members record
        const mc = await wixData.query('Members').eq('email', reg.email).find(SA);
        if (!mc.items.length) {
            await wixData.insert('Members', {
                firstName: reg.firstName, lastName: reg.lastName, email: reg.email,
                phone: reg.phone || '', membershipType: reg.categoryName,
                membershipYear: reg.membershipYear, registrationCode: reg.registrationCode,
                isActive: true, joinedAt: new Date()
            }, SA);
        } else {
            await wixData.update('Members', { ...mc.items[0], membershipType: reg.categoryName, membershipYear: reg.membershipYear, isActive: true }, SA);
        }

        // Send welcome email
        try {
            const cat = MEMBERSHIP_CATEGORIES.find(c => c.id === reg.categoryId) || { name: reg.categoryName, features: [] };
            await sendGmail(reg.email, `${reg.firstName} ${reg.lastName}`,
                `Welcome to BANF FY2026-27! Your Membership is Active`,
                buildWelcomeEmail(reg, cat));
        } catch (_) {}

        return wixResponse({
            status: 302,
            headers: { Location: `${WIX_SITE}/_functions/join?paid=1&code=${encodeURIComponent(code)}&name=${encodeURIComponent(reg.firstName)}` }
        });
    } catch (e) {
        return wixResponse({ status: 302, headers: { Location: `${WIX_SITE}/_functions/join?error=server&msg=${encodeURIComponent(e.message)}` } });
    }
}
export function options_membership_test_pay(request) { return handleCors(); }

// 
// 6. POST /membership_confirm_payment - EC approves real payment
// 
export async function post_membership_confirm_payment(request) {
    try {
        const body = await parseBody(request);
        if (!body.registrationCode) return jsonErr('Missing registrationCode');
        const adminEmail = (request.headers && request.headers['x-user-email']) || '';
        if (!adminEmail) return jsonErr('Admin authentication required');
        const adminRes = await wixData.query('AdminRoles').eq('email', adminEmail.toLowerCase()).eq('isActive', true).find(SA);
        if (!adminRes.items.length) return jsonErr('Forbidden');
        const q = await wixData.query('MembershipRegistrations').eq('registrationCode', body.registrationCode.toUpperCase()).find(SA);
        if (!q.items.length) return jsonErr('Registration not found');
        const reg = q.items[0];
        const updated = await wixData.update('MembershipRegistrations', { ...reg, status: 'active', confirmedBy: adminEmail, confirmedAt: new Date() }, SA);
        const mc = await wixData.query('Members').eq('email', reg.email).find(SA);
        if (!mc.items.length) {
            await wixData.insert('Members', { firstName: reg.firstName, lastName: reg.lastName, email: reg.email, phone: reg.phone || '', membershipType: reg.categoryName, membershipYear: reg.membershipYear, registrationCode: reg.registrationCode, isActive: true, joinedAt: new Date() }, SA);
        } else {
            await wixData.update('Members', { ...mc.items[0], membershipType: reg.categoryName, membershipYear: reg.membershipYear, isActive: true }, SA);
        }
        try {
            const cat = MEMBERSHIP_CATEGORIES.find(c => c.id === reg.categoryId) || { name: reg.categoryName, features: [] };
            await sendGmail(reg.email, `${reg.firstName} ${reg.lastName}`, `Welcome to BANF FY2026-27! Membership Active`, buildWelcomeEmail(reg, cat));
        } catch (_) {}
        return jsonOk({ registration: updated, message: 'Payment confirmed. Member activated.' });
    } catch (e) { return jsonServerErr(e.message); }
}
export function options_membership_confirm_payment(request) { return handleCors(); }

// 
// 7. GET /membership_registrations - Admin list
// 
export async function get_membership_registrations(request) {
    try {
        const adminEmail = (request.headers && request.headers['x-user-email']) || '';
        if (!adminEmail) return jsonErr('Authentication required');
        const adminRes = await wixData.query('AdminRoles').eq('email', adminEmail.toLowerCase()).eq('isActive', true).find(SA);
        if (!adminRes.items.length) return jsonErr('Forbidden');
        const params = request.query || {};
        let q = wixData.query('MembershipRegistrations').eq('membershipYear', 'FY2026-27').descending('_createdDate').limit(200);
        if (params.status) q = q.eq('status', params.status);
        const res = await q.find(SA);
        const stats = {
            total: res.items.length,
            pending: res.items.filter(r => r.status === 'pending_payment').length,
            active: res.items.filter(r => r.status === 'active').length,
            totalRevenue: res.items.filter(r => r.status === 'active').reduce((s, r) => s + (r.amount || 0), 0),
            byCategory: {}
        };
        for (const c of MEMBERSHIP_CATEGORIES) {
            stats.byCategory[c.id] = res.items.filter(r => r.categoryId === c.id).reduce((acc, r) => {
                acc[r.householdType] = (acc[r.householdType] || 0) + 1; return acc;
            }, {});
        }
        return jsonOk({ registrations: res.items, stats });
    } catch (e) { return jsonServerErr(e.message); }
}
export function options_membership_registrations(request) { return handleCors(); }

// 
// 7b. POST /membership_reset_test  — Admin: wipe test-pattern registrations (demo / CI use)
//     Deletes all MembershipRegistrations whose email matches the test suffix pattern
//     (.test@gmail.com) or is explicitly listed in the request body.
// 
export async function post_membership_reset_test(request) {
    try {
        const adminEmail = (request.headers && request.headers['x-user-email']) || '';
        if (!adminEmail) return jsonErr('Authentication required');
        const adminRes = await wixData.query('AdminRoles').eq('email', adminEmail.toLowerCase()).eq('isActive', true).find(SA);
        if (!adminRes.items.length) return jsonErr('Forbidden');

        const body = await parseBody(request);
        // Emails to clean up: provided list + always include the .test@gmail.com pattern
        const explicitEmails = (body.emails || []).map(e => e.toLowerCase());
        const testPattern    = body.testPattern || '.test@gmail.com';

        const all = await wixData.query('MembershipRegistrations').limit(200).find(SA);
        const toDelete = all.items.filter(r => {
            const em = (r.email || '').toLowerCase();
            return em.endsWith(testPattern) || explicitEmails.includes(em);
        });
        for (const r of toDelete) {
            await wixData.remove('MembershipRegistrations', r._id, SA);
        }
        return jsonOk({ deleted: toDelete.length, emails: toDelete.map(r => r.email) });
    } catch (e) { return jsonServerErr(e.message); }
}
export function options_membership_reset_test(request) { return handleCors(); }


function buildConfirmationEmail(body, category, amount, code) {
    const accessMap = EVENT_ACCESS[category.id] || [];
    const eventRows = ALL_EVENTS.map((ev, i) => {
        const acc = accessMap[i] || 'na';
        if (acc === 'na') return '';
        const badge = acc === 'incl' ? 'Included' : `Add-on ${acc}`;
        const color = acc === 'incl' ? '#d4edda' : '#fff3cd';
        return `<tr style="background:${color}"><td style="padding:5px 8px">${ev.name}</td><td style="padding:5px 8px;font-size:.8rem;color:#555">${ev.date}</td><td style="padding:5px 8px;font-size:.8rem;font-weight:600">${badge}</td></tr>`;
    }).filter(Boolean).join('');

    return `<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px">
<div style="background:linear-gradient(135deg,#8B0000,#DC143C);color:#fff;padding:30px;border-radius:12px 12px 0 0;text-align:center">
  <h2 style="margin:0">BANF FY2026-27 Membership Registration</h2>
  <p style="margin:.5rem 0 0;opacity:.85">Bengali Association of North Florida</p>
</div>
<div style="background:#fff;padding:30px;border:1px solid #f0e0e0">
  <p>Dear ${body.firstName},</p>
  <p>Your registration is confirmed. Please complete payment to activate your membership.</p>
  <div style="background:#f8f8f8;border-left:4px solid #FF6B35;padding:16px;border-radius:0 8px 8px 0;margin:20px 0">
    <strong>Registration Code: <span style="color:#8B0000;font-size:1.3em;letter-spacing:1px">${code}</span></strong><br>
    <span>${category.name} &mdash; ${body.householdType} &mdash; <strong>$${amount}</strong></span>
  </div>
  <h3 style="color:#8B0000">Complete Payment via Zelle</h3>
  <div style="background:#e8f5e9;padding:16px;border-radius:8px;margin:16px 0">
    <b>Zelle to:</b> ${ZELLE_RECIPIENT}<br>
    <b>Amount:</b> <strong style="font-size:1.1rem;color:#8B0000">$${amount}</strong><br>
    <b>Memo:</b> <code style="background:#c8e6c9;padding:3px 8px;border-radius:4px">BANF Membership ${code}</code>
  </div>
  <h3 style="color:#8B0000">Events in Your Plan</h3>
  <table style="width:100%;border-collapse:collapse;font-size:.9rem">${eventRows}</table>
  <hr style="border:1px solid #f0e0e0;margin:20px 0">
  <p style="color:#888;font-size:.85em">Questions? <a href="mailto:${BANF_EMAIL}">${BANF_EMAIL}</a></p>
</div></body></html>`;
}

function buildWelcomeEmail(reg, category) {
    const accessMap = EVENT_ACCESS[category.id] || [];
    const eventRows = ALL_EVENTS.map((ev, i) => {
        if ((accessMap[i] || 'na') !== 'incl') return '';
        return `<tr style="background:#d4edda"><td style="padding:5px 8px">&#10003; ${ev.name}</td><td style="padding:5px 8px;font-size:.8rem;color:#555">${ev.date}</td></tr>`;
    }).filter(Boolean).join('');

    return `<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px">
<div style="background:linear-gradient(135deg,#8B0000,#DC143C);color:#fff;padding:30px;border-radius:12px 12px 0 0;text-align:center">
  <h2 style="margin:0">Welcome to BANF FY2026-27!</h2>
  <p style="margin:.5rem 0 0;opacity:.85">Your membership is now <strong>ACTIVE</strong></p>
</div>
<div style="background:#fff;padding:30px;border:1px solid #f0e0e0">
  <p>Dear ${reg.firstName},</p>
  <p>Your BANF FY2026-27 membership has been activated. Welcome to the community!</p>
  <div style="background:#d4edda;border-left:4px solid #28a745;padding:16px;border-radius:0 8px 8px 0;margin:20px 0">
    <strong>${reg.firstName} ${reg.lastName}</strong><br>
    <span>${reg.categoryName} &mdash; ${reg.householdType} &mdash; $${reg.amount}</span><br>
    <span style="font-size:.85rem;color:#555">Year: FY2026-27 | Code: <strong>${reg.registrationCode}</strong></span>
  </div>
  <h3 style="color:#8B0000">Your Included Events</h3>
  <table style="width:100%;border-collapse:collapse;font-size:.9rem">${eventRows}</table>
  <p><a href="${WIX_SITE}/_functions/member_portal" style="color:#8B0000;font-weight:600">Visit Member Portal</a></p>
  <hr style="border:1px solid #f0e0e0;margin:20px 0">
  <p style="color:#888;font-size:.85em">Bengali Association of North Florida | <a href="mailto:${BANF_EMAIL}">${BANF_EMAIL}</a></p>
</div></body></html>`;
}

// =======================================================================
// DYNAMIC CONFIG SYSTEM  v3.0
// Collections: MembershipConfig, MembershipUniverse, MembershipDrive
// =======================================================================

const EC_DEMO_EMAILS = ['ranadhir.ghosh@gmail.com', 'banfjax@gmail.com'];

// LLM prompt for config extraction
function buildParsePrompt(extractedText) {
    return `You are a data extraction assistant. Given the following text extracted from a BANF (Bengali Association of North Florida) membership presentation or spreadsheet, extract the membership configuration.

Return ONLY a valid JSON object (no markdown, no explanation) with this exact schema:
{
  "year": "FY2026-27",
  "categories": [
    {
      "id": "m2_eb",
      "name": "Full category name",
      "badge": "BEST VALUE or similar",
      "tagline": "Short description",
      "eventCount": 17,
      "color": "#hex",
      "pricing": { "family": 375, "couple": 290, "individual": 215, "student": 145 }
    }
  ],
  "events": [
    { "name": "Event Name", "date": "Date string", "type": "Cultural|Religious|Educational|Social" }
  ],
  "eventAccess": {
    "m2_eb": ["incl", "incl", "na", "$30"]
  }
}

Rules:
- Each category.id must be a simple snake_case identifier
- eventAccess arrays must have one entry per event in the same order as the events array
- Values for eventAccess: "incl" (included), "na" (not available), or "$XX" (add-on price)
- If pricing is not found for a category, use reasonable estimates
- If event access matrix is not clear, use "na" as default

EXTRACTED TEXT:
${extractedText.substring(0, 8000)}`;
}

// 8. POST /membership_parse_config  LLM parses extracted file text
export async function post_membership_parse_config(request) {
    try {
        const body = await request.body.json();
        if (!body.extractedText || body.extractedText.trim().length < 50) {
            return badRequest({ body: JSON.stringify({ error: 'extractedText too short or missing' }) });
        }
        const prompt = buildParsePrompt(body.extractedText);
        const hfResp = await wixFetch(HF_URL, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${HF_API_TOKEN}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: HF_MODEL,
                messages: [{ role: 'user', content: prompt }],
                max_tokens: 4000,
                temperature: 0.1
            })
        });
        const hfData = await hfResp.json();
        const raw = (hfData.choices?.[0]?.message?.content || '').trim();
        // Extract JSON block if wrapped in markdown
        const jsonMatch = raw.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            return jsonOk({ success: false, error: 'LLM did not return valid JSON', raw });
        }
        let parsed;
        try { parsed = JSON.parse(jsonMatch[0]); }
        catch(e) { return jsonOk({ success: false, error: 'JSON parse failed: ' + e.message, raw }); }
        return jsonOk({ success: true, config: parsed, raw });
    } catch(e) {
        return serverError({ body: JSON.stringify({ error: e.message }) });
    }
}
export function options_membership_parse_config(request) { return handleCors(); }

// 9. POST /membership_config_save  Admin saves reviewed config to DB
export async function post_membership_config_save(request) {
    try {
        const userEmail = request.headers['x-user-email'];
        if (!userEmail) return badRequest({ body: JSON.stringify({ error: 'x-user-email header required' }) });
        const adminCheck = await wixData.query('AdminRoles').eq('email', userEmail).eq('isActive', true).find(SA);
        if (adminCheck.items.length === 0) {
            return wixResponse({ status: 403, body: JSON.stringify({ error: 'Forbidden' }), headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
        }
        await ensureMembershipCollections();
        const body = await request.body.json();
        if (!body.config || !body.config.categories || !body.config.events) {
            return badRequest({ body: JSON.stringify({ error: 'config must include categories and events' }) });
        }
        // Deactivate previous active config
        if (body.setActive !== false) {
            const prev = await wixData.query('MembershipConfig').eq('status', 'active').find(SA);
            for (const item of prev.items) {
                await wixData.update('MembershipConfig', { ...item, status: 'archived' }, SA);
            }
        }
        const record = {
            year:        body.config.year || 'FY2026-27',
            status:      body.setActive === false ? 'draft' : 'active',
            categories:  body.config.categories,
            events:      body.config.events,
            eventAccess: body.config.eventAccess || {},
            createdBy:   userEmail,
            parsedAt:    new Date().toISOString(),
            notes:       body.notes || ''
        };
        const saved = await wixData.insert('MembershipConfig', record, SA);
        return jsonOk({ success: true, configId: saved._id, status: saved.status });
    } catch(e) {
        return serverError({ body: JSON.stringify({ error: e.message }) });
    }
}
export function options_membership_config_save(request) { return handleCors(); }

// 10. GET /membership_config  Returns latest config (draft or active)
export async function get_membership_config(request) {
    try {
        const userEmail = request.headers['x-user-email'];
        if (!userEmail) return badRequest({ body: JSON.stringify({ error: 'x-user-email header required' }) });
        const adminCheck = await wixData.query('AdminRoles').eq('email', userEmail).eq('isActive', true).find(SA);
        if (adminCheck.items.length === 0) {
            return wixResponse({ status: 403, body: JSON.stringify({ error: 'Forbidden' }), headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
        }
        await ensureMembershipCollections();
        const allCfg = await wixData.query('MembershipConfig')
            .descending('_createdDate')
            .limit(10)
            .find(SA);
        return jsonOk({ configs: allCfg.items, total: allCfg.totalCount });
    } catch(e) {
        return serverError({ body: JSON.stringify({ error: e.message }) });
    }
}
export function options_membership_config(request) { return handleCors(); }

// 11. GET /membership_universe  List member pool (admin)
export async function get_membership_universe(request) {
    try {
        const userEmail = request.headers['x-user-email'];
        if (!userEmail) return badRequest({ body: JSON.stringify({ error: 'x-user-email required' }) });
        const adminCheck = await wixData.query('AdminRoles').eq('email', userEmail).eq('isActive', true).find(SA);
        if (adminCheck.items.length === 0) {
            return wixResponse({ status: 403, body: JSON.stringify({ error: 'Forbidden' }), headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
        }
        await ensureMembershipCollections();
        const q = wixData.query('MembershipUniverse').descending('_createdDate');
        const filter = request.query.filter;
        const result = filter === 'active'   ? await q.eq('isActive', true).limit(500).find(SA)
                     : filter === 'inactive' ? await q.eq('isActive', false).limit(500).find(SA)
                     : filter === 'demo'     ? await q.eq('isDemo', true).limit(500).find(SA)
                     : await q.limit(500).find(SA);
        const stats = {
            total:    result.totalCount,
            active:   result.items.filter(m => m.isActive).length,
            demo:     result.items.filter(m => m.isDemo).length,
            inactive: result.items.filter(m => !m.isActive).length
        };
        return jsonOk({ members: result.items, stats });
    } catch(e) {
        return serverError({ body: JSON.stringify({ error: e.message }) });
    }
}
export function options_membership_universe(request) { return handleCors(); }

// 12. POST /membership_universe_update  Add/remove/bulk import
export async function post_membership_universe_update(request) {
    try {
        const userEmail = request.headers['x-user-email'];
        if (!userEmail) return badRequest({ body: JSON.stringify({ error: 'x-user-email required' }) });
        const adminCheck = await wixData.query('AdminRoles').eq('email', userEmail).eq('isActive', true).find(SA);
        if (adminCheck.items.length === 0) {
            return wixResponse({ status: 403, body: JSON.stringify({ error: 'Forbidden' }), headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
        }
        await ensureMembershipCollections();
        const body = await request.body.json();
        const action = body.action; // 'add' | 'remove' | 'bulkAdd' | 'setDemo' | 'toggle'
        let results = { added: 0, removed: 0, skipped: 0, errors: [] };
        if (action === 'add' || action === 'bulkAdd') {
            const members = action === 'add' ? [body.member] : (body.members || []);
            for (const m of members) {
                if (!m.email) { results.skipped++; continue; }
                const existing = await wixData.query('MembershipUniverse').eq('email', m.email.toLowerCase()).find(SA);
                if (existing.items.length > 0) {
                    // Update existing
                    await wixData.update('MembershipUniverse', {
                        ...existing.items[0],
                        firstName: m.firstName || existing.items[0].firstName,
                        lastName:  m.lastName  || existing.items[0].lastName,
                        phone:     m.phone     || existing.items[0].phone,
                        isActive:  true,
                        source:    m.source    || existing.items[0].source || 'manual',
                        isDemo:    m.isDemo !== undefined ? m.isDemo : existing.items[0].isDemo
                    }, SA);
                    results.added++;
                } else {
                    await wixData.insert('MembershipUniverse', {
                        email:     m.email.toLowerCase(),
                        firstName: m.firstName || '',
                        lastName:  m.lastName  || '',
                        phone:     m.phone     || '',
                        isActive:  true,
                        isDemo:    m.isDemo || false,
                        source:    m.source || 'manual',
                        addedBy:   userEmail,
                        addedAt:   new Date().toISOString()
                    }, SA);
                    results.added++;
                }
            }
        } else if (action === 'remove') {
            const email = (body.email || '').toLowerCase();
            if (!email) return badRequest({ body: JSON.stringify({ error: 'email required for remove' }) });
            const existing = await wixData.query('MembershipUniverse').eq('email', email).find(SA);
            for (const item of existing.items) {
                await wixData.update('MembershipUniverse', { ...item, isActive: false }, SA);
                results.removed++;
            }
        } else if (action === 'setDemo') {
            const email = (body.email || '').toLowerCase();
            const val = body.isDemo !== false;
            const existing = await wixData.query('MembershipUniverse').eq('email', email).find(SA);
            for (const item of existing.items) {
                await wixData.update('MembershipUniverse', { ...item, isDemo: val }, SA);
            }
        } else {
            return badRequest({ body: JSON.stringify({ error: 'Unknown action: ' + action }) });
        }
        return jsonOk({ success: true, results });
    } catch(e) {
        return serverError({ body: JSON.stringify({ error: e.message }) });
    }
}
export function options_membership_universe_update(request) { return handleCors(); }

// 13. POST /membership_drive_init  Create/reset drive record
export async function post_membership_drive_init(request) {
    try {
        // GATE: EC onboarding must be complete before drive can be initialized
        const ecComplete = await isECOnboardComplete();
        if (!ecComplete) {
            return wixResponse({
                status: 403,
                body: JSON.stringify({
                    error: 'Membership drive cannot be started: EC onboarding is not yet complete for the current fiscal year. The super admin must complete EC onboarding first.',
                    gate: 'ec_onboarding_required'
                }),
                headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
            });
        }

        const userEmail = request.headers['x-user-email'];
        if (!userEmail) return badRequest({ body: JSON.stringify({ error: 'x-user-email required' }) });
        const adminCheck = await wixData.query('AdminRoles').eq('email', userEmail).eq('isActive', true).find(SA);
        if (adminCheck.items.length === 0) {
            return wixResponse({ status: 403, body: JSON.stringify({ error: 'Forbidden' }), headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
        }
        const body = await request.body.json();
        await ensureMembershipCollections();
        const year = body.year || 'FY2026-27';
        // Stop any existing running drive
        const running = await wixData.query('MembershipDrive').eq('status', 'running').find(SA);
        for (const r of running.items) {
            await wixData.update('MembershipDrive', { ...r, status: 'stopped' }, SA);
        }
        const drive = await wixData.insert('MembershipDrive', {
            year,
            configId:    body.configId || null,
            mode:        body.mode || 'demo',  // 'demo' | 'live'
            status:      'idle',
            launchedBy:  userEmail,
            launchedAt:  new Date().toISOString(),
            totalTargets: 0,
            sentCount:   0,
            errorCount:  0,
            notes:       body.notes || ''
        }, SA);
        return jsonOk({ success: true, driveId: drive._id, drive });
    } catch(e) {
        return serverError({ body: JSON.stringify({ error: e.message }) });
    }
}
export function options_membership_drive_init(request) { return handleCors(); }

// 14. GET /membership_drive_status  Current drive state
export async function get_membership_drive_status(request) {
    try {
        const userEmail = request.headers['x-user-email'];
        if (!userEmail) return badRequest({ body: JSON.stringify({ error: 'x-user-email required' }) });
        const adminCheck = await wixData.query('AdminRoles').eq('email', userEmail).eq('isActive', true).find(SA);
        if (adminCheck.items.length === 0) {
            return wixResponse({ status: 403, body: JSON.stringify({ error: 'Forbidden' }), headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
        }
        await ensureMembershipCollections();
        const drives = await wixData.query('MembershipDrive')
            .descending('_createdDate')
            .limit(5)
            .find(SA);
        const active = drives.items.find(d => ['running', 'idle', 'paused'].includes(d.status)) || drives.items[0] || null;
        // Registration stats
        const regStats = await wixData.query('MembershipRegistrations').find(SA);
        const paid = regStats.items.filter(r => r.status === 'active').length;
        const pending = regStats.items.filter(r => r.status === 'pending').length;
        return jsonOk({ drive: active, recentDrives: drives.items, stats: { totalRegistrations: regStats.totalCount, paid, pending } });
    } catch(e) {
        return serverError({ body: JSON.stringify({ error: e.message }) });
    }
}
export function options_membership_drive_status(request) { return handleCors(); }

// 15. POST /membership_drive_notify  Send invitations (demo or live batch)
export async function post_membership_drive_notify(request) {
    try {
        // GATE: EC onboarding must be complete before drive notifications
        const ecComplete = await isECOnboardComplete();
        if (!ecComplete) {
            return wixResponse({
                status: 403,
                body: JSON.stringify({
                    error: 'Cannot send membership invitations: EC onboarding is not complete.',
                    gate: 'ec_onboarding_required'
                }),
                headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
            });
        }

        const userEmail = request.headers['x-user-email'];
        if (!userEmail) return badRequest({ body: JSON.stringify({ error: 'x-user-email required' }) });
        const adminCheck = await wixData.query('AdminRoles').eq('email', userEmail).eq('isActive', true).find(SA);
        if (adminCheck.items.length === 0) {
            return wixResponse({ status: 403, body: JSON.stringify({ error: 'Forbidden' }), headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
        }
        await ensureMembershipCollections();
        const body = await request.body.json();
        const driveId = body.driveId;
        if (!driveId) return badRequest({ body: JSON.stringify({ error: 'driveId required' }) });
        const driveResult = await wixData.get('MembershipDrive', driveId, SA);
        if (!driveResult) return badRequest({ body: JSON.stringify({ error: 'Drive not found' }) });

        // Determine targets
        let targets = [];
        if (driveResult.mode === 'demo') {
            // Demo: use EC test emails + universe members with isDemo=true
            const demoUniverse = await wixData.query('MembershipUniverse').eq('isDemo', true).eq('isActive', true).find(SA);
            const demoEmails = [...new Set([...EC_DEMO_EMAILS, ...demoUniverse.items.map(m => m.email)])];
            targets = demoEmails.map(e => {
                const found = demoUniverse.items.find(m => m.email === e);
                return { email: e, firstName: found ? found.firstName : 'Member', lastName: found ? found.lastName : '' };
            });
        } else {
            // Live: all active universe members
            const universe = await wixData.query('MembershipUniverse').eq('isActive', true).limit(500).find(SA);
            targets = universe.items;
        }

        // Update drive status
        await wixData.update('MembershipDrive', {
            ...driveResult,
            status: 'running',
            totalTargets: targets.length
        }, SA);

        // Send emails
        let sentCount = 0, errorCount = 0;
        const joinUrl = `${WIX_SITE}/_functions/join`;
        const accessToken = await getGmailToken();
        for (const t of targets) {
            try {
                const html = buildInviteEmail(t, joinUrl, driveResult.mode);
                await sendGmail(accessToken, t.email, `You're Invited: BANF FY2026-27 Membership Drive`, html);
                sentCount++;
            } catch(e) { errorCount++; }
        }

        // Final update
        await wixData.update('MembershipDrive', {
            ...driveResult,
            status: 'complete',
            sentCount,
            errorCount,
            completedAt: new Date().toISOString()
        }, SA);

        return jsonOk({ success: true, sentCount, errorCount, totalTargets: targets.length, mode: driveResult.mode });
    } catch(e) {
        return serverError({ body: JSON.stringify({ error: e.message }) });
    }
}
export function options_membership_drive_notify(request) { return handleCors(); }

// 16. POST /membership_drive_control  pause / resume / stop
export async function post_membership_drive_control(request) {
    try {
        const userEmail = request.headers['x-user-email'];
        if (!userEmail) return badRequest({ body: JSON.stringify({ error: 'x-user-email required' }) });
        const adminCheck = await wixData.query('AdminRoles').eq('email', userEmail).eq('isActive', true).find(SA);
        if (adminCheck.items.length === 0) {
            return wixResponse({ status: 403, body: JSON.stringify({ error: 'Forbidden' }), headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
        }
        const body = await request.body.json();
        if (!body.driveId || !body.action) {
            return badRequest({ body: JSON.stringify({ error: 'driveId and action required' }) });
        }
        await ensureMembershipCollections();
        const VALID_ACTIONS = ['pause', 'resume', 'stop', 'reset'];
        if (!VALID_ACTIONS.includes(body.action)) {
            return badRequest({ body: JSON.stringify({ error: 'action must be one of: ' + VALID_ACTIONS.join(', ') }) });
        }
        const driveResult = await wixData.get('MembershipDrive', body.driveId, SA);
        if (!driveResult) return badRequest({ body: JSON.stringify({ error: 'Drive not found' }) });
        const newStatus = body.action === 'pause' ? 'paused'
                        : body.action === 'resume' ? 'running'
                        : body.action === 'stop'   ? 'stopped'
                        : 'idle'; // reset
        await wixData.update('MembershipDrive', {
            ...driveResult,
            status: newStatus,
            lastControlledBy: userEmail,
            lastControlledAt: new Date().toISOString()
        }, SA);
        return jsonOk({ success: true, driveId: body.driveId, newStatus });
    } catch(e) {
        return serverError({ body: JSON.stringify({ error: e.message }) });
    }
}
export function options_membership_drive_control(request) { return handleCors(); }

// Helper: build invitation email
function buildInviteEmail(member, joinUrl, mode) {
    const tag = mode === 'demo' ? ' [DEMO TEST]' : '';
    return `<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px">
<div style="background:linear-gradient(135deg,#8B0000,#DC143C);color:#fff;padding:30px;border-radius:12px 12px 0 0;text-align:center">
  <h2 style="margin:0">BANF FY2026-27 Membership Drive${tag}</h2>
  <p style="margin:.5rem 0 0;opacity:.85">Bengali Association of North Florida</p>
</div>
<div style="background:#fff;padding:30px;border:1px solid #f0e0e0">
  <p>Dear ${member.firstName || 'Friend'},</p>
  <p>We warmly invite you to join the <strong>Bengali Association of North Florida (BANF)</strong> for FY2026-27!</p>
  <p>Our membership drive is now open. Choose from 6 membership categories designed to fit every family and budget  including all 17 cultural, religious, educational, and social events throughout the year.</p>
  <div style="text-align:center;margin:30px 0">
    <a href="${joinUrl}" style="background:#8B0000;color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-size:1.1rem;font-weight:600;display:inline-block">
      View Membership Plans &amp; Join Now
    </a>
  </div>
  <p style="color:#666;font-size:.9rem">Highlights this year:</p>
  <ul style="color:#555;font-size:.9em">
    <li>Durga Puja (Oct 24-25)  Grand celebration</li>
    <li>Artist Program  Live performances with dinner</li>
    <li>Kids Summer Programs  Sports, workshops, education</li>
    <li>Bosonto Utsob, Noboborsho, Natok &amp; more!</li>
  </ul>
  <hr style="border:1px solid #f0e0e0;margin:20px 0">
  <p style="color:#888;font-size:.85em">Questions? <a href="mailto:${BANF_EMAIL}">${BANF_EMAIL}</a> | Bengali Association of North Florida</p>
</div></body></html>`;
}
