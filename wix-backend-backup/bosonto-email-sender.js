/**
 * ═══════════════════════════════════════════════════════════════════════
 *  BANF Bosonto Utsob 2026 — Live Email Sender (Wix Backend)
 * ═══════════════════════════════════════════════════════════════════════
 *
 *  Deploy to: backend/bosonto-email-sender.js
 *
 *  Sends real emails to ranadhir.ghosh@gmail.com (TEST MODE)
 *  on behalf of all pipeline members for verification.
 *
 *  Uses Gmail API via OAuth2 (same credentials as membership-drive.js)
 *  Supports multipart MIME with CID image attachments.
 *
 *  Email types:
 *    - payment_reminder   → Evite-Yes unpaid members (with ⭐ recommendation)
 *    - contact_verify     → Paid members (with current plan + images)
 *    - signup_invite      → Paid members (with account setup + images)
 *
 *  HTTP Endpoint:
 *    POST /_functions/bosonto_pipeline
 *    Body: { adminKey, members, images? }
 *
 * @module backend/bosonto-email-sender
 */

import { ok, badRequest, serverError } from 'wix-http-functions';
import { fetch as wixFetch } from 'wix-fetch';
import wixData from 'wix-data';

// ── Constants ───────────────────────────────────────────────────
const SA = { suppressAuth: true };
const BANF_EMAIL = 'banfjax@gmail.com';
const BANF_ORG = 'Bengali Association of North Florida (BANF)';
const PRESIDENT_EMAIL = 'ranadhir.ghosh@gmail.com';
const TEST_MODE = false;
const ADMIN_KEY = 'banf-bosonto-2026-live';

const GOOGLE_CLIENT_ID = '1020178199135-3usrl611ara38i7rhu2ub6sn6g1150ml.apps.googleusercontent.com';
const GOOGLE_CLIENT_SECRET = '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';
const GOOGLE_REFRESH_TOKEN = require('../banf-gmail-config').REFRESH_TOKEN;
const PLAYGROUND_CLIENT_ID = '407408718192.apps.googleusercontent.com';
const PLAYGROUND_SECRET = 'kd-_2_AUosoGGTNYyMJiFL3j';

const CONFIG = {
  EVENT_NAME: 'Bosonto Utsob 2026',
  EVENT_DATE: 'Saturday, March 21, 2026',
  PAYMENT_DEADLINE: 'April 30, 2026',
  MEMBERSHIP_YEAR: '2026-27',
  ZELLE_EMAIL: 'banfjax@gmail.com',
  RSVP_DEADLINE: 'March 4, 2026',
  NEXT_EVENT_NAME: 'Noboborsho 2026',
  NEXT_EVENT_DATE: 'Saturday, April 25, 2026'
};

const PRICING = {
  m2:       { family: 375, couple: 330, individual: 205, student: 145, name: 'M2 Premium',       desc: 'All 17 events included' },
  m1:       { family: 280, couple: 255, individual: 140, student: 100, name: 'M1 Regular',       desc: '4 events included + add-on options' },
  cultural: { family: 180, couple: 140, individual: 100, student:  75, name: 'Cultural Special', desc: 'Cultural events included' },
  guest:    { family:  50, couple:  35, individual:  25, student:  15, name: 'Guest Pass',       desc: 'Per-event entry' }
};

const GH_BASE = 'https://www.jaxbengali.org';
const WIX_SITE = 'https://www.jaxbengali.org';
const COMMS_TOKENS = 'CommsCorrectionTokens';

const SPOUSE_OVERRIDES = {
  'ranadhir.ghosh@gmail.com': { spouseName: 'Moumita Mukherjee (Ghosh)', spouseEmail: 'moumita.mukherje@gmail.com' }
};

// ── Comm Verification Token Helpers ────────────────────────────────
function generateCommToken() {
  const ts = Date.now().toString(36).toUpperCase();
  const rnd = Math.random().toString(36).substring(2, 10).toUpperCase();
  return `CCT-${ts}-${rnd}`;
}

async function createCommVerificationToken(member) {
  const email = (member.email || '').toLowerCase();
  // Check if there's already a pending/corrected token for this member
  const existing = await wixData.query(COMMS_TOKENS)
    .eq('email', email)
    .ne('status', 'expired')
    .descending('sentAt')
    .limit(1)
    .find(SA);
  if (existing.items.length > 0) {
    const item = existing.items[0];
    // Already corrected → skip (member already verified)
    if (item.status === 'corrected' || item.status === 'declined') {
      return { token: item.token, alreadyVerified: true };
    }
    // Re-use existing pending token
    return { token: item.token, alreadyVerified: false };
  }
  // Generate new token
  const token = generateCommToken();
  await wixData.insert(COMMS_TOKENS, {
    token,
    email,
    memberId: member.memberId || member._id || '',
    familyId: member.familyId || '',
    stage: 99, // bosonto pipeline
    status: 'pending',
    sentAt: new Date().toISOString(),
    correctedOn: null,
    declinedOn: null,
    isTestMode: TEST_MODE
  }, SA);
  return { token, alreadyVerified: false };
}

// ── Gmail OAuth2 — resilient with DB-stored token + dual credentials ────
async function getStoredRefreshToken() {
  try {
    const r = await wixData.query('GoogleTokens').eq('key', 'refresh_token').limit(1).find(SA);
    if (r.items.length > 0 && r.items[0].value) return r.items[0].value;
  } catch (_) {}
  return GOOGLE_REFRESH_TOKEN; // fallback to hardcoded
}

async function getGmailToken() {
  const refreshToken = await getStoredRefreshToken();
  // Try primary app credentials first
  const credentials = [
    [GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET],
    [PLAYGROUND_CLIENT_ID, PLAYGROUND_SECRET]
  ];
  let lastError = null;
  for (const [cid, csec] of credentials) {
    const resp = await wixFetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `grant_type=refresh_token&refresh_token=${encodeURIComponent(refreshToken)}&client_id=${encodeURIComponent(cid)}&client_secret=${encodeURIComponent(csec)}`
    });
    const d = await resp.json();
    if (d.access_token) return d.access_token;
    lastError = d.error_description || d.error || 'Unknown error';
  }
  throw new Error('Gmail token: ' + lastError + ' (tried both app + playground credentials)');
}

// ── Send Gmail — multipart MIME with optional CID images ────────
async function sendGmail(to, toName, subject, html, images) {
  // TEST MODE: redirect to president
  let actualTo = to;
  let actualName = toName;
  let actualSubject = subject;
  if (TEST_MODE && to.toLowerCase() !== PRESIDENT_EMAIL.toLowerCase()) {
    actualTo = PRESIDENT_EMAIL;
    actualName = 'BANF President (TEST)';
    actualSubject = `[TEST -> ${to}] ${subject}`;
  }

  const token = await getGmailToken();
  let raw;

  if (images && (images.events || images.fees)) {
    // Multipart MIME with CID image attachments
    const boundary = 'BANF_BOUNDARY_' + Date.now();
    const parts = [
      `From: ${BANF_ORG} <${BANF_EMAIL}>`,
      `To: ${actualName} <${actualTo}>`,
      `Subject: ${mimeEncodeSubject(actualSubject)}`,
      'MIME-Version: 1.0',
      `Content-Type: multipart/related; boundary="${boundary}"`,
      '',
      `--${boundary}`,
      'Content-Type: text/html; charset=UTF-8',
      'Content-Transfer-Encoding: 7bit',
      '',
      html
    ];

    if (images.events) {
      parts.push(`--${boundary}`);
      parts.push('Content-Type: image/jpeg');
      parts.push('Content-Transfer-Encoding: base64');
      parts.push('Content-ID: <membership_events>');
      parts.push('Content-Disposition: inline; filename="membership_events.jpg"');
      parts.push('');
      // Wrap base64 at 76 chars per line for MIME compliance
      const evB64 = images.events.replace(/\s/g, '');
      for (let i = 0; i < evB64.length; i += 76) {
        parts.push(evB64.substring(i, i + 76));
      }
    }

    if (images.fees) {
      parts.push(`--${boundary}`);
      parts.push('Content-Type: image/jpeg');
      parts.push('Content-Transfer-Encoding: base64');
      parts.push('Content-ID: <membership_fees>');
      parts.push('Content-Disposition: inline; filename="membership_fees.jpg"');
      parts.push('');
      const feesB64 = images.fees.replace(/\s/g, '');
      for (let i = 0; i < feesB64.length; i += 76) {
        parts.push(feesB64.substring(i, i + 76));
      }
    }

    parts.push(`--${boundary}--`);
    raw = parts.join('\r\n');
  } else {
    // Simple HTML MIME (no images)
    raw = [
      `From: ${BANF_ORG} <${BANF_EMAIL}>`,
      `To: ${actualName} <${actualTo}>`,
      `Subject: ${mimeEncodeSubject(actualSubject)}`,
      'MIME-Version: 1.0',
      'Content-Type: text/html; charset=UTF-8',
      '',
      html
    ].join('\r\n');
  }

  // Base64url-encode the raw MIME for Gmail API
  const encoded = btoa(unescape(encodeURIComponent(raw)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  const r = await wixFetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ raw: encoded })
  });
  const d = await r.json();
  if (d.error) throw new Error(d.error.message || JSON.stringify(d.error));
  return { messageId: d.id, to: actualTo, originalTo: to, subject: actualSubject };
}

// ── Helpers ─────────────────────────────────────────────────────
function esc(s) { return (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }

// RFC 2047 encode subject if it contains non-ASCII chars
function mimeEncodeSubject(s) {
  // Check if subject is pure ASCII
  if (/^[\x20-\x7E]*$/.test(s)) return s;
  // Encode as UTF-8 Base64 per RFC 2047
  const b64 = btoa(unescape(encodeURIComponent(s)));
  return '=?UTF-8?B?' + b64 + '?=';
}
function capitalize(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : ''; }

// ── Family Detection ────────────────────────────────────────────
function detectFamily(m) {
  const result = { spouseName: null, spouseEmail: null, childrenCount: m.inferredKids || 0, familyLabel: null, confidence: 'none', allMembers: [] };
  const emailKey = (m.email || '').toLowerCase();
  if (SPOUSE_OVERRIDES[emailKey]) {
    const ov = SPOUSE_OVERRIDES[emailKey];
    result.spouseName = ov.spouseName; result.spouseEmail = ov.spouseEmail;
    result.confidence = 'confirmed';
    result.allMembers.push({ name: ov.spouseName, relationship: 'spouse', email: ov.spouseEmail });
  }
  if (!result.spouseName && (m.householdMembers || []).length > 0) {
    const hm = m.householdMembers[0];
    result.spouseName = hm.displayName || `${hm.firstName || ''} ${hm.lastName || ''}`.trim();
    result.spouseEmail = hm.email; result.confidence = 'high';
    result.allMembers.push({ name: result.spouseName, relationship: 'spouse', email: hm.email });
  }
  if (!result.spouseName && m.householdDisplayName) {
    const match = m.householdDisplayName.match(/^(.+?)\s*&\s*(.+)/);
    if (match) {
      const memberFirst = (m.firstName || '').toLowerCase();
      const spouse = match[1].toLowerCase().includes(memberFirst) ? match[2].trim() : match[1].trim();
      if (spouse) { result.spouseName = spouse; result.confidence = 'medium'; result.allMembers.push({ name: spouse, relationship: 'spouse', email: null }); }
    }
  }
  if (!result.spouseName) {
    for (const pay of (m.paymentRecords || [])) {
      if (!pay.rawName) continue;
      const slashMatch = pay.rawName.match(/^(.+?)\s*(?:Da\s*)?\/\s*(.+?)(?:\s*Di)?$/i);
      if (slashMatch) {
        const n1 = slashMatch[1].replace(/\s*Da\s*$/i, '').trim();
        const n2 = slashMatch[2].replace(/\s*Di\s*$/i, '').trim();
        const memberFirst = (m.firstName || '').toLowerCase();
        const spouse = n1.toLowerCase().includes(memberFirst) ? n2 : n1;
        if (spouse && spouse.length > 1) { result.spouseName = spouse; result.confidence = 'medium'; result.allMembers.push({ name: spouse, relationship: 'spouse', email: null }); break; }
      }
    }
  }
  for (const fm of (m.familyMembers || [])) {
    if (!result.allMembers.some(x => x.email === fm.email || x.name === fm.displayName))
      result.allMembers.push({ name: fm.displayName, relationship: 'family member', email: fm.email });
  }
  if (result.spouseName && m.householdType === 'family') {
    const kids = result.childrenCount;
    result.familyLabel = `${m.firstName} & ${result.spouseName.split(' ')[0]} ${m.lastName} Family${kids > 0 ? ` (+${kids} child${kids > 1 ? 'ren' : ''})` : ''}`;
  } else if (result.spouseName && m.householdType === 'couple') {
    result.familyLabel = `${m.firstName} & ${result.spouseName.split(' ')[0]} ${m.lastName}`;
  } else {
    result.familyLabel = m.displayName || `${m.firstName} ${m.lastName}`;
  }
  return result;
}

function getPreviousYearAmount(m) {
  const hhAmt = m.householdMembershipAmount;
  const prevPay = (m.paymentRecords || []).find(p => p.year === '2025-26');
  if (hhAmt && hhAmt > 0) return { amount: hhAmt, category: m.householdMembershipCategory || 'Previous Plan', source: 'household_record' };
  if (prevPay) {
    const kh = { 170: 340, 150: 300, 107.5: 215, 125: 250 };
    return { amount: kh[prevPay.amount] || prevPay.amount, category: prevPay.category, source: kh[prevPay.amount] ? 'corrected_halved' : 'payment_record' };
  }
  return null;
}

function guessCategoryFromAmount(amount, hhType) {
  const tier = hhType === 'family' ? 'family' : hhType === 'couple' ? 'couple' : 'individual';
  for (const [catId, cat] of Object.entries(PRICING)) { if (cat[tier] === amount) return catId; }
  for (const [catId, cat] of Object.entries(PRICING)) { for (const [t, p] of Object.entries(cat)) { if (t !== 'name' && t !== 'desc' && p === amount) return catId; } }
  return null;
}

// ── Smart Tier Resolution ───────────────────────────────────────
// If member RSVPs as 1 adult but has payment history as family/couple, use historical tier
// Also checks spouse/family member payment records for relationship detection
function resolveSmartTier(m) {
  // 1. If householdType is already family/couple, use it
  const ht = (m.householdType || 'individual').toLowerCase();
  if (ht === 'family' || ht === 'couple') return ht;

  // 2. Check householdMembershipCategory for historical tier
  const hhCat = (m.householdMembershipCategory || '').toLowerCase();
  if (hhCat.includes('family')) return 'family';
  if (hhCat.includes('couple')) return 'couple';

  // 3. Check householdMembershipAmount against pricing tiers
  const hhAmt = m.householdMembershipAmount || 0;
  if (hhAmt > 0) {
    for (const [, cat] of Object.entries(PRICING)) {
      if (cat.family === hhAmt) return 'family';
      if (cat.couple === hhAmt) return 'couple';
    }
  }

  // 4. Check previous payment amounts (member's own records)
  for (const pay of (m.paymentRecords || [])) {
    const amt = pay.amount || 0;
    const cat = (pay.category || '').toLowerCase();
    if (cat.includes('family')) return 'family';
    if (cat.includes('couple')) return 'couple';
    for (const [, pricing] of Object.entries(PRICING)) {
      if (pricing.family === amt) return 'family';
      if (pricing.couple === amt) return 'couple';
    }
  }

  // 5. RELATIONSHIP AGENT: Check familyMembers for spouse relationship
  // If member has familyMembers, they're at least a couple
  if ((m.familyMembers || []).length > 0) {
    // Check if any family member has payment records indicating tier
    for (const fm of m.familyMembers) {
      if (fm.paymentRecords) {
        for (const pay of fm.paymentRecords) {
          const cat = (pay.category || '').toLowerCase();
          if (cat.includes('family')) return 'family';
          if (cat.includes('couple')) return 'couple';
        }
      }
    }
    // Has family members but no payment info → infer at least couple
    return m.inferredKids > 0 ? 'family' : 'couple';
  }

  // 6. Check householdMembers (CRM household linkage)
  if ((m.householdMembers || []).length > 0) {
    for (const hm of m.householdMembers) {
      if (hm.paymentRecords) {
        for (const pay of hm.paymentRecords) {
          const cat = (pay.category || '').toLowerCase();
          if (cat.includes('family')) return 'family';
          if (cat.includes('couple')) return 'couple';
        }
      }
    }
    return m.inferredKids > 0 ? 'family' : 'couple';
  }

  // 7. Check householdDisplayName for "&" (indicates couple/family)
  if (m.householdDisplayName && m.householdDisplayName.includes('&')) {
    return m.inferredKids > 0 ? 'family' : 'couple';
  }

  return ht === 'student' ? 'student' : 'individual';
}

// ── Recommendation Engine ───────────────────────────────────────
function buildRecommendation(m) {
  const tier = m.membershipTier;
  const prevYear = m.previousYear;
  const rec = {
    preferred: 'm2',
    preferredPrice: PRICING.m2[tier],
    tier,
    prevCategory: null, prevAmount: null, prevTier: null,
    reasoning: '',
    allOptions: []
  };

  if (prevYear) {
    rec.prevCategory = prevYear.category;
    rec.prevAmount = prevYear.amount;
    rec.prevTier = tier;
    if (prevYear.category && (prevYear.category.toLowerCase().includes('m2') || prevYear.category.toLowerCase().includes('premium') || prevYear.category.toLowerCase().includes('eb'))) {
      rec.reasoning = `You had ${prevYear.category} ($${prevYear.amount}) last year. M2 Premium at $${rec.preferredPrice} gives you access to all 17 events!`;
    } else if (prevYear.category && prevYear.category.toLowerCase().includes('m1')) {
      rec.reasoning = `You had ${prevYear.category} ($${prevYear.amount}) last year. We recommend M2 Premium at $${rec.preferredPrice} for access to all 17 events!`;
    } else {
      rec.reasoning = `Based on your ${capitalize(tier)} membership, we recommend M2 Premium at $${rec.preferredPrice} for the best value - all 17 events included.`;
    }
  } else {
    rec.reasoning = `As a ${capitalize(tier)} member, M2 Premium at $${rec.preferredPrice} gives you access to all 17 events!`;
  }

  for (const [catId, cat] of Object.entries(PRICING)) {
    if (catId === 'guest') continue;
    rec.allOptions.push({ id: catId, name: cat.name, price: cat[tier], desc: cat.desc, isPreferred: catId === 'm2' });
  }
  return rec;
}

// ═══════════════════════════════════════════════════════════════════════
// EMAIL TEMPLATES — v4.0 Clean text, thank-you flow, events-only benefits
// ═══════════════════════════════════════════════════════════════════════

function generatePaymentReminderEmail(m, images) {
  const tier = m.membershipTier;
  const fam = m.family || detectFamily(m);
  const prevYear = m.previousYear || getPreviousYearAmount(m);
  const rec = buildRecommendation(m);
  const familyGreeting = fam.spouseName
    ? `Dear <strong>${esc(m.firstName)}</strong> &amp; <strong>${esc(fam.spouseName.split(' ')[0])}</strong>,`
    : `Dear <strong>${esc(m.firstName)}</strong>,`;
  const prevContext = prevYear
    ? `<p style="color:#555;font-size:.88rem;margin:8px 0">Last year you had <strong>${prevYear.category}</strong> at <strong>$${prevYear.amount}</strong> (${capitalize(tier)}).</p>`
    : '';

  const otherRows = rec.allOptions.filter(o => !o.isPreferred).map(o => {
    const hl = o.isRegular ? 'background:#f5f5f5;' : '';
    return `<tr style="${hl}"><td style="padding:8px 14px;border-bottom:1px solid #eee">${o.name}</td><td style="padding:8px 14px;border-bottom:1px solid #eee;text-align:right;font-weight:600">$${o.price}</td><td style="padding:8px 14px;border-bottom:1px solid #eee;font-size:.8rem;color:#777">${o.desc}</td></tr>`;
  }).join('');

  const eventsImg = images && images.events ? '<img src="cid:membership_events" alt="BANF Membership Events" style="width:100%;max-width:580px;border-radius:8px;margin:12px 0;border:1px solid #e0e0e0">' : '';
  const feesImg = images && images.fees ? '<img src="cid:membership_fees" alt="BANF Membership Fees" style="width:100%;max-width:580px;border-radius:8px;margin:12px 0;border:1px solid #e0e0e0">' : '';

  return `
<div style="font-family:'Segoe UI',Arial,sans-serif;max-width:620px;margin:0 auto;background:#fff">
  <div style="background:linear-gradient(135deg,#e65100,#f57c00);color:#fff;padding:20px 24px;border-radius:10px 10px 0 0">
    <h2 style="margin:0;font-size:1.2rem">Bosonto Utsob 2026 - Complete Your Membership</h2>
    <p style="margin:6px 0 0;opacity:.9;font-size:.85rem">${CONFIG.EVENT_DATE}</p>
  </div>
  <div style="padding:20px 24px;border:1px solid #e0e0e0;border-top:none;border-radius:0 0 10px 10px">
    <p>${familyGreeting}</p>
    <p>Thank you for your RSVP to <strong>Bosonto Utsob 2026</strong>${m.eviteAdults > 0 ? ` (${m.eviteAdults} adult${m.eviteAdults > 1 ? 's' : ''}${m.eviteKids > 0 ? `, ${m.eviteKids} child${m.eviteKids > 1 ? 'ren' : ''}` : ''})` : ''}! We are excited to have you join us.</p>
    <p>To secure your spot, please complete your BANF membership payment. Once payment is confirmed, you will receive a follow-up email to set up your member account and complete your onboarding.</p>
    ${prevContext}

    <!-- RECOMMENDED: M2 Premium -->
    <div style="background:linear-gradient(135deg,#e8f5e9,#f1f8e9);border:2px solid #4caf50;border-radius:12px;padding:18px;margin:18px 0;position:relative">
      <div style="position:absolute;top:-12px;left:18px;background:#4caf50;color:#fff;font-size:.68rem;font-weight:700;padding:3px 12px;border-radius:12px;letter-spacing:.5px">RECOMMENDED</div>
      <h3 style="margin:8px 0 6px;color:#2e7d32;font-size:1.1rem">M2 Premium - ${capitalize(tier)}</h3>
      <div style="display:flex;align-items:baseline;gap:8px;margin:6px 0">
        <span style="font-size:1.8rem;font-weight:800;color:#2e7d32">$${rec.preferredPrice}</span>
      </div>
      <p style="margin:8px 0 4px;font-size:.88rem;color:#333">${rec.reasoning}</p>
      <p style="margin:4px 0;font-size:.82rem;color:#555">All 17 events included for the year</p>
    </div>

    <!-- Other Options -->
    <div style="margin:18px 0">
      <h4 style="font-size:.82rem;color:#555;margin:0 0 8px;text-transform:uppercase;letter-spacing:.5px">Other Membership Options (${capitalize(tier)} Tier)</h4>
      <table style="width:100%;border-collapse:collapse;border:1px solid #eee;border-radius:8px;overflow:hidden">
        <thead><tr style="background:#f5f5f5"><th style="padding:8px 14px;text-align:left;font-size:.72rem;color:#777">Plan</th><th style="padding:8px 14px;text-align:right;font-size:.72rem;color:#777">Price</th><th style="padding:8px 14px;text-align:left;font-size:.72rem;color:#777">Includes</th></tr></thead>
        <tbody>${otherRows}</tbody>
      </table>
    </div>

    <!-- Membership Guide Images -->
    ${(eventsImg || feesImg) ? `<div style="margin:18px 0">
      <h4 style="font-size:.82rem;color:#555;margin:0 0 8px;text-transform:uppercase;letter-spacing:.5px">Membership Guide</h4>
      ${eventsImg}
      ${feesImg}
    </div>` : ''}

    <!-- How to Pay -->
    <div style="background:#e8eaf6;border:1px solid #c5cae9;border-radius:8px;padding:16px;margin:16px 0">
      <strong>How to Pay:</strong>
      <ul style="margin:8px 0 0;padding-left:18px">
        <li>Send via <strong>Zelle</strong> to: <strong>${CONFIG.ZELLE_EMAIL}</strong></li>
        <li>Memo: <strong>"BANF Membership - ${m.firstName || ''} ${m.lastName || ''}"</strong></li>
        <li>Amount: <strong>$${rec.preferredPrice}</strong> for M2 Premium (${capitalize(tier)})</li>
      </ul>
      <p style="margin:8px 0 0;font-size:.9rem"><strong>Payment Deadline:</strong> ${CONFIG.PAYMENT_DEADLINE}</p>
    </div>

    <!-- What happens next -->
    <div style="background:#e3f2fd;border:1px solid #bbdefb;border-radius:8px;padding:14px;margin:16px 0">
      <strong>What happens after payment?</strong>
      <ol style="margin:8px 0 0;padding-left:18px;color:#555">
        <li>We verify your payment</li>
        <li>You receive an email to set up your BANF member account</li>
        <li>Complete your membership onboarding and verify your family information</li>
      </ol>
    </div>

    ${(fam.spouseName && fam.confidence !== 'confirmed') || fam.childrenCount > 0 ? `<div style="background:#fff8e1;border:1px solid #ffecb3;border-radius:8px;padding:14px;margin:16px 0">
      <strong>Family Information on File:</strong>
      <ul style="margin:8px 0 0;padding-left:18px">
        ${fam.spouseName && fam.confidence !== 'confirmed' ? `<li>Spouse: <strong>${esc(fam.spouseName)}</strong> - please verify</li>` : ''}
        ${fam.childrenCount > 0 ? `<li><strong>${fam.childrenCount} child(ren)</strong> on file - please verify</li>` : ''}
        <li>Reply with any corrections</li>
      </ul>
    </div>` : ''}

    <p style="color:#777;font-size:.82rem;margin-top:20px;border-top:1px solid #eee;padding-top:12px">Bengali Association of North Florida (BANF) | ${BANF_EMAIL}</p>
  </div>
</div>`;
}

function generateContactVerifyEmail(m, images, verifyToken) {
  const fam = m.family || detectFamily(m);
  const rec = buildRecommendation(m);
  const tier = m.membershipTier;
  const paidCat = m.membershipCategory ? PRICING[m.membershipCategory] : null;
  const verifyUrl = verifyToken ? `${WIX_SITE}/_functions/comms_correction_form?token=${verifyToken}` : '';

  const eventsImg = images && images.events ? '<img src="cid:membership_events" alt="BANF Membership Events" style="width:100%;max-width:580px;border-radius:8px;margin:8px 0;border:1px solid #e0e0e0">' : '';
  const feesImg = images && images.fees ? '<img src="cid:membership_fees" alt="BANF Membership Fees" style="width:100%;max-width:580px;border-radius:8px;margin:8px 0;border:1px solid #e0e0e0">' : '';

  return `
<div style="font-family:'Segoe UI',Arial,sans-serif;max-width:620px;margin:0 auto;background:#fff">
  <div style="background:linear-gradient(135deg,#1565c0,#1976d2);color:#fff;padding:20px 24px;border-radius:10px 10px 0 0">
    <h2 style="margin:0;font-size:1.2rem">Thank You for Your Payment!</h2>
    <p style="margin:6px 0 0;opacity:.9;font-size:.85rem">BANF ${CONFIG.MEMBERSHIP_YEAR} Membership</p>
  </div>
  <div style="padding:20px 24px;border:1px solid #e0e0e0;border-top:none;border-radius:0 0 10px 10px">
    <p>Dear <strong>${esc(m.firstName)}</strong>,</p>
    <p>We have received your payment${paidCat ? ` of <strong>$${m.paymentAmount}</strong> for <strong>${paidCat.name} (${capitalize(tier)})</strong>` : ''}. Thank you for being a valued BANF member!</p>

    ${paidCat ? `<div style="background:linear-gradient(135deg,#e8f5e9,#f1f8e9);border:2px solid #4caf50;border-radius:12px;padding:16px;margin:16px 0">
      <div style="display:flex;align-items:center;gap:10px">
        <span style="font-size:1.4rem;color:#2e7d32;font-weight:bold">&#10003;</span>
        <div>
          <div style="font-size:1rem;font-weight:700;color:#2e7d32">Payment Confirmed - ${paidCat.name} (${capitalize(tier)})</div>
          <div style="font-size:.86rem;color:#555">$${m.paymentAmount} received | ${paidCat.desc}</div>
        </div>
      </div>
      ${m.membershipCategory === 'm2' ? `<div style="margin-top:8px;font-size:.82rem;color:#2e7d32;font-weight:600">M2 Premium - all 17 events included!</div>` : ''}
    </div>` : ''}

    <p>Please take a moment to review and verify the information we have on file for you:</p>

    <table style="width:100%;border-collapse:collapse;margin:16px 0;background:#fafafa;border-radius:8px;overflow:hidden">
      <tr><td style="padding:8px 14px;border-bottom:1px solid #eee;color:#555;width:35%">Name</td><td style="padding:8px 14px;border-bottom:1px solid #eee">${esc(m.displayName)}</td></tr>
      <tr><td style="padding:8px 14px;border-bottom:1px solid #eee;color:#555">Email</td><td style="padding:8px 14px;border-bottom:1px solid #eee">${esc(m.email)}</td></tr>
      <tr><td style="padding:8px 14px;border-bottom:1px solid #eee;color:#555">Phone</td><td style="padding:8px 14px;border-bottom:1px solid #eee">${m.phone ? esc(m.phone) : '<span style="color:#d32f2f"><strong>Missing</strong> - please provide</span>'}</td></tr>
      <tr><td style="padding:8px 14px;border-bottom:1px solid #eee;color:#555">Membership Type</td><td style="padding:8px 14px;border-bottom:1px solid #eee">${capitalize(m.householdType)}</td></tr>
      ${paidCat ? `<tr><td style="padding:8px 14px;border-bottom:1px solid #eee;color:#555">Current Plan</td><td style="padding:8px 14px;border-bottom:1px solid #eee"><strong style="color:#2e7d32">${paidCat.name}</strong> - $${m.paymentAmount}</td></tr>` : ''}
      ${fam.spouseName ? `<tr><td style="padding:8px 14px;border-bottom:1px solid #eee;color:#555">Spouse</td><td style="padding:8px 14px;border-bottom:1px solid #eee">${esc(fam.spouseName)}${fam.confidence !== 'confirmed' ? ' <em style="color:#b71c1c;font-size:.85em">- is this correct?</em>' : ''}</td></tr>` : ''}
      ${fam.childrenCount > 0 ? `<tr><td style="padding:8px 14px;border-bottom:1px solid #eee;color:#555">Children</td><td style="padding:8px 14px;border-bottom:1px solid #eee">${fam.childrenCount} on file <em style="color:#b71c1c;font-size:.85em">- please verify names/ages</em></td></tr>` : ''}
    </table>

    <!-- Verification Button -->
    ${verifyUrl ? `<div style="text-align:center;margin:20px 0">
      <a href="${verifyUrl}" style="display:inline-block;background:linear-gradient(135deg,#1565c0,#1976d2);color:#fff;text-decoration:none;padding:14px 36px;border-radius:8px;font-size:1rem;font-weight:700;letter-spacing:.3px">Verify Your Family &amp; Contact Information</a>
      <p style="margin:8px 0 0;font-size:.78rem;color:#999">Click the button above to review and update your details online</p>
    </div>` : ''}

    ${(eventsImg || feesImg) ? `<div style="margin:16px 0">
      <h4 style="font-size:.82rem;color:#555;margin:0 0 8px;text-transform:uppercase;letter-spacing:.5px">Membership Events &amp; Fees Reference</h4>
      ${eventsImg}
      ${feesImg}
    </div>` : ''}

    <!-- What happens next -->
    <div style="background:#e3f2fd;border:1px solid #bbdefb;border-radius:8px;padding:14px;margin:16px 0">
      <strong>Next Steps:</strong>
      <ol style="margin:8px 0 0;padding-left:18px;color:#555">
        <li>${verifyUrl ? `<a href="${verifyUrl}" style="color:#1565c0;font-weight:600">Verify your family &amp; contact information</a>` : 'Verify your details - reply with any corrections'}</li>
        <li>You will receive a separate email to set up your BANF member account</li>
        <li>Complete your onboarding and enjoy all BANF events!</li>
      </ol>
    </div>

    <p style="color:#777;font-size:.82rem;margin-top:20px;border-top:1px solid #eee;padding-top:12px">Bengali Association of North Florida (BANF) | ${BANF_EMAIL}</p>
  </div>
</div>`;
}

function generateSignupInviteEmail(m, images) {
  const cat = PRICING[m.membershipCategory] || {};
  const fam = m.family || detectFamily(m);
  const rec = buildRecommendation(m);
  const tier = m.membershipTier;
  const paidLabel = cat.name || 'BANF Membership';
  const joinUrl = `${GH_BASE}/join.html`;

  const eventsImg = images && images.events ? '<img src="cid:membership_events" alt="BANF Membership Events" style="width:100%;max-width:580px;border-radius:8px;margin:8px 0;border:1px solid #e0e0e0">' : '';
  const feesImg = images && images.fees ? '<img src="cid:membership_fees" alt="BANF Membership Fees" style="width:100%;max-width:580px;border-radius:8px;margin:8px 0;border:1px solid #e0e0e0">' : '';

  return `
<div style="font-family:'Segoe UI',Arial,sans-serif;max-width:620px;margin:0 auto;background:#fff">
  <div style="background:linear-gradient(135deg,#7b1fa2,#9c27b0);color:#fff;padding:20px 24px;border-radius:10px 10px 0 0">
    <h2 style="margin:0;font-size:1.3rem">Set Up Your BANF Member Account</h2>
    <p style="margin:6px 0 0;opacity:.9;font-size:.9rem">${CONFIG.MEMBERSHIP_YEAR} Membership</p>
  </div>
  <div style="padding:20px 24px;border:1px solid #e0e0e0;border-top:none;border-radius:0 0 10px 10px">
    <p>Dear <strong>${esc(m.firstName)}</strong>,</p>
    <p>Your payment of <strong>$${m.paymentAmount}</strong> for <strong>${paidLabel} (${capitalize(tier)})</strong> has been confirmed. Thank you!</p>
    <p>Please complete your membership onboarding by setting up your BANF member account.</p>

    <div style="background:linear-gradient(135deg,#e8f5e9,#f1f8e9);border:2px solid #4caf50;border-radius:12px;padding:16px;margin:16px 0">
      <div style="display:flex;align-items:center;gap:10px">
        <span style="font-size:1.4rem;color:#2e7d32;font-weight:bold">&#10003;</span>
        <div>
          <div style="font-size:1rem;font-weight:700;color:#2e7d32">${paidLabel} - ${capitalize(tier)}</div>
          <div style="font-size:.86rem;color:#555">$${m.paymentAmount} paid | ${cat.desc || 'Full access'}</div>
        </div>
      </div>
      ${m.membershipCategory === 'm2' ? `<div style="margin-top:8px;font-size:.82rem;color:#2e7d32;font-weight:600">M2 Premium - all 17 events included!</div>` : ''}
    </div>

    <!-- Set Up Account Button -->
    <div style="text-align:center;margin:24px 0">
      <a href="${joinUrl}" style="display:inline-block;background:linear-gradient(135deg,#7b1fa2,#9c27b0);color:#fff;text-decoration:none;padding:14px 36px;border-radius:8px;font-size:1rem;font-weight:700;letter-spacing:.3px">Set Up Your Member Account</a>
      <p style="margin:8px 0 0;font-size:.78rem;color:#999">Click to create your username, password, and security question</p>
    </div>

    <div style="background:#f3e5f5;border:1px solid #ce93d8;border-radius:8px;padding:16px;margin:16px 0;text-align:center">
      <p style="margin:0 0 8px;font-weight:600">Your account will be registered as:</p>
      <p style="margin:0;font-size:1.1rem;font-weight:700;color:#7b1fa2">${esc(m.displayName)}</p>
      <p style="margin:4px 0 0;color:#555">${esc(m.email)}</p>
    </div>

    <p>During sign-up, you will:</p>
    <ol style="padding-left:20px;color:#555">
      <li>Create a secure password for your account</li>
      <li>Set a <strong>security question</strong> for account recovery</li>
      <li>Verify your contact and family information</li>
    </ol>

    <div style="background:#e8f5e9;border:1px solid #c8e6c9;border-radius:8px;padding:14px;margin:16px 0">
      <strong>Account Security Features:</strong>
      <ul style="margin:8px 0 0;padding-left:18px;color:#555">
        <li><strong>Security Question</strong> - Used to recover your account if you forget your password</li>
        <li><strong>Forgot Password</strong> - Answer your security question to reset</li>
        <li><strong>Forgot Username</strong> - Look up your email using your name or phone number</li>
        <li><strong>Account Lockout Protection</strong> - 5 failed login attempts locks the account (unlocked via security question)</li>
      </ul>
    </div>

    ${fam.spouseName ? `<div style="background:#fff3e0;border:1px solid #ffcc80;border-radius:8px;padding:14px;margin:16px 0">
      <strong>Family Information:</strong> This account is for <strong>${esc(m.firstName)}</strong> only.${fam.spouseName ? ` Your spouse <strong>${esc(fam.spouseName)}</strong> will have their own account if needed.` : ''}
      ${fam.confidence !== 'confirmed' ? '<br><em style="color:#b71c1c;font-size:.85em">Please verify your spouse name is correct by replying to this email.</em>' : ''}
    </div>` : ''}

    ${(eventsImg || feesImg) ? `<div style="margin:16px 0">
      <h4 style="font-size:.82rem;color:#555;margin:0 0 8px;text-transform:uppercase;letter-spacing:.5px">Membership Events &amp; Fees Guide</h4>
      ${eventsImg}
      ${feesImg}
    </div>` : ''}

    <div style="background:#e3f2fd;border:1px solid #bbdefb;border-radius:8px;padding:14px;margin:16px 0">
      <strong>Quick Link:</strong> <a href="${joinUrl}" style="color:#7b1fa2;font-weight:600">Click here to set up your account</a>
    </div>
    <p style="color:#777;font-size:.82rem;margin-top:20px;border-top:1px solid #eee;padding-top:12px">Bengali Association of North Florida (BANF) | ${BANF_EMAIL}</p>
  </div>
</div>`;
}

// ═══════════════════════════════════════════════════════════════════════
// DECLINED RSVP EMAIL — Appreciation + Noboborsho + Membership Reminder
// ═══════════════════════════════════════════════════════════════════════

function generateDeclinedRsvpEmail(m, images) {
  const fam = m.family || detectFamily(m);
  const rec = buildRecommendation(m);
  const tier = m.membershipTier;
  const prevYear = m.previousYear || getPreviousYearAmount(m);

  const familyGreeting = fam.spouseName
    ? `Dear <strong>${esc(m.firstName)}</strong> &amp; <strong>${esc(fam.spouseName.split(' ')[0])}</strong>,`
    : `Dear <strong>${esc(m.firstName)}</strong>,`;

  const prevContext = prevYear
    ? `<p style="color:#555;font-size:.88rem;margin:4px 0">Last year you had <strong>${prevYear.category}</strong> at <strong>$${prevYear.amount}</strong>.</p>`
    : '';

  const eventsImg = images && images.events ? '<img src="cid:membership_events" alt="BANF Events" style="width:100%;max-width:580px;border-radius:8px;margin:12px 0;border:1px solid #e0e0e0">' : '';
  const feesImg = images && images.fees ? '<img src="cid:membership_fees" alt="BANF Membership Fees" style="width:100%;max-width:580px;border-radius:8px;margin:12px 0;border:1px solid #e0e0e0">' : '';

  return `
<div style="font-family:'Segoe UI',Arial,sans-serif;max-width:620px;margin:0 auto;background:#fff">
  <div style="background:linear-gradient(135deg,#5c6bc0,#7986cb);color:#fff;padding:20px 24px;border-radius:10px 10px 0 0">
    <h2 style="margin:0;font-size:1.2rem">BANF - We'll Miss You at Bosonto Utsob 2026!</h2>
    <p style="margin:6px 0 0;opacity:.9;font-size:.85rem">${CONFIG.EVENT_DATE}</p>
  </div>
  <div style="padding:20px 24px;border:1px solid #e0e0e0;border-top:none;border-radius:0 0 10px 10px">
    <p>${familyGreeting}</p>
    <p>Thank you for letting us know about <strong>Bosonto Utsob 2026</strong>. We are sorry to hear that you won't be able to attend this time. We will truly miss you at the event!</p>

    <!-- RSVP Deadline Reminder -->
    <div style="background:#fff8e1;border:1px solid #ffecb3;border-radius:8px;padding:14px;margin:16px 0">
      <strong>Changed your mind?</strong>
      <p style="margin:8px 0 0;color:#555">The last date to update your RSVP is <strong>${CONFIG.RSVP_DEADLINE}</strong>. If your plans change, you're always welcome! Simply update your response on Evite or reply to this email and we'll be happy to include you.</p>
    </div>

    <!-- Next Event: Noboborsho -->
    <div style="background:linear-gradient(135deg,#e8f5e9,#f1f8e9);border:2px solid #4caf50;border-radius:12px;padding:18px;margin:18px 0;position:relative">
      <div style="position:absolute;top:-12px;left:18px;background:#4caf50;color:#fff;font-size:.68rem;font-weight:700;padding:3px 12px;border-radius:12px;letter-spacing:.5px">UPCOMING EVENT</div>
      <h3 style="margin:8px 0 6px;color:#2e7d32;font-size:1.1rem">${CONFIG.NEXT_EVENT_NAME}</h3>
      <p style="margin:4px 0;font-size:.95rem;color:#333"><strong>${CONFIG.NEXT_EVENT_DATE}</strong></p>
      <p style="margin:8px 0 4px;font-size:.88rem;color:#555">Celebrate the Bengali New Year with BANF! We hope to see you there for an evening of culture, music, food and community.</p>
    </div>

    <!-- Membership Reminder -->
    <div style="background:#f3e5f5;border:1px solid #ce93d8;border-radius:8px;padding:16px;margin:16px 0">
      <strong>BANF Membership ${CONFIG.MEMBERSHIP_YEAR}</strong>
      <p style="margin:8px 0 4px;font-size:.9rem;color:#555">Even if you can't make it to Bosonto Utsob, your BANF membership gives you access to all our events throughout the year, including ${CONFIG.NEXT_EVENT_NAME} and many more!</p>
      ${prevContext}
      <p style="margin:8px 0;font-size:.9rem">We recommend <strong>M2 Premium (${capitalize(tier)})</strong> at <strong>$${rec.preferredPrice}</strong> - all 17 events included for the year.</p>
      <p style="margin:8px 0 0;font-size:.85rem;color:#555"><strong>Pay via Zelle:</strong> ${CONFIG.ZELLE_EMAIL}<br><strong>Memo:</strong> "BANF Membership - ${m.firstName || ''} ${m.lastName || ''}"</p>
    </div>

    <!-- Membership Guide Images -->
    ${(eventsImg || feesImg) ? `<div style="margin:18px 0">
      <h4 style="font-size:.82rem;color:#555;margin:0 0 8px;text-transform:uppercase;letter-spacing:.5px">Membership Guide</h4>
      ${eventsImg}
      ${feesImg}
    </div>` : ''}

    <!-- Family Verification -->
    <div style="background:#e3f2fd;border:1px solid #bbdefb;border-radius:8px;padding:14px;margin:16px 0">
      <strong>Help us stay connected!</strong>
      <p style="margin:8px 0 0;color:#555;font-size:.9rem">Please help us keep our records up to date. If you have any updates to your contact information, family details, or communication preferences, simply reply to this email and we'll update our records.</p>
      ${fam.spouseName ? `<p style="margin:8px 0 0;font-size:.85rem;color:#555">We have on file: <strong>${esc(fam.spouseName)}</strong> as your spouse${fam.childrenCount > 0 ? ` and <strong>${fam.childrenCount} child(ren)</strong>` : ''}. Please confirm or correct.</p>` : ''}
    </div>

    <p style="margin:18px 0 8px;color:#333">We value your presence in our BANF community and look forward to seeing you soon!</p>
    <p style="margin:4px 0">Warm regards,<br><strong>BANF Team</strong></p>
    <p style="color:#777;font-size:.82rem;margin-top:20px;border-top:1px solid #eee;padding-top:12px">Bengali Association of North Florida (BANF) | ${BANF_EMAIL}</p>
  </div>
</div>`;
}

// ═══════════════════════════════════════════════════════════════════════
// PAYMENT FOLLOWUP EMAIL — For members who paid after receiving payment_reminder
// ═══════════════════════════════════════════════════════════════════════

function generatePaymentFollowupEmail(m, images, verifyToken, alreadyVerified) {
  const fam = m.family || detectFamily(m);
  const tier = m.membershipTier || resolveSmartTier(m);
  const prevYear = m.previousYear || getPreviousYearAmount(m);
  const paidAmount = m.amountPaid || m.newPaymentAmount || m.paymentAmount || 0;
  const totalPaidSoFar = m.totalPaidSoFar || paidAmount; // Cumulative if multiple payments
  
  // Determine payment status: full, partial, or overpaid
  let paymentCategory = guessCategoryFromAmount(totalPaidSoFar, tier);
  let isPartialPayment = false;
  let isFullPayment = false;
  let recommendedTier = 'm2'; // Default recommendation
  let recommendedAmount = PRICING.m2[tier];
  let remainingBalance = 0;
  
  // Determine recommended tier based on previous year or default to M2
  if (prevYear && prevYear.category) {
    const prevCatLower = prevYear.category.toLowerCase();
    if (prevCatLower.includes('m2') || prevCatLower.includes('premium') || prevCatLower.includes('eb')) {
      recommendedTier = 'm2';
    } else if (prevCatLower.includes('m1') || prevCatLower.includes('regular')) {
      recommendedTier = 'm1';
    } else if (prevCatLower.includes('cultural')) {
      recommendedTier = 'cultural';
    }
  }
  recommendedAmount = PRICING[recommendedTier][tier];
  
  // Check if payment matches any tier
  if (paymentCategory && PRICING[paymentCategory]) {
    isFullPayment = true;
  } else {
    // Partial payment - calculate remaining for each tier
    isPartialPayment = totalPaidSoFar < PRICING.cultural[tier]; // Even less than lowest tier
    remainingBalance = recommendedAmount - totalPaidSoFar;
  }

  const familyGreeting = fam.spouseName
    ? `Dear <strong>${esc(m.firstName)}</strong> &amp; <strong>${esc(fam.spouseName.split(' ')[0])}</strong>,`
    : `Dear <strong>${esc(m.firstName)}</strong>,`;

  const eventsImg = images && images.events ? '<img src="cid:membership_events" alt="BANF Events" style="width:100%;max-width:580px;border-radius:8px;margin:12px 0;border:1px solid #e0e0e0">' : '';
  const feesImg = images && images.fees ? '<img src="cid:membership_fees" alt="BANF Membership Fees" style="width:100%;max-width:580px;border-radius:8px;margin:12px 0;border:1px solid #e0e0e0">' : '';

  // Verification section - only show if NOT already verified
  const verifyUrl = verifyToken && !alreadyVerified ? `${WIX_SITE}/_functions/comms_correction_form?token=${verifyToken}` : '';

  // Calculate remaining amounts for each membership option
  const m2Remaining = Math.max(0, PRICING.m2[tier] - totalPaidSoFar);
  const m1Remaining = Math.max(0, PRICING.m1[tier] - totalPaidSoFar);
  const culturalRemaining = Math.max(0, PRICING.cultural[tier] - totalPaidSoFar);

  // Previous year context
  const prevYearNote = prevYear 
    ? `Based on your previous membership (<strong>${prevYear.category}</strong> at $${prevYear.amount}), we recommend the <strong>${PRICING[recommendedTier].name}</strong> plan.`
    : `We recommend the <strong>M2 Premium</strong> plan for access to all 17 BANF events.`;

  // Build the appropriate content section based on payment status
  let paymentSection;
  
  if (isFullPayment) {
    // Full payment received - Thank you!
    const catInfo = PRICING[paymentCategory];
    paymentSection = `
    <div style="background:linear-gradient(135deg,#e8f5e9,#f1f8e9);border:2px solid #4caf50;border-radius:12px;padding:16px;margin:16px 0">
      <div style="display:flex;align-items:center;gap:10px">
        <span style="font-size:1.4rem;color:#2e7d32;font-weight:bold">&#10003;</span>
        <div>
          <div style="font-size:1rem;font-weight:700;color:#2e7d32">Payment Complete - ${catInfo.name} (${capitalize(tier)})</div>
          <div style="font-size:.86rem;color:#555">$${totalPaidSoFar} received | ${catInfo.desc}</div>
        </div>
      </div>
      ${paymentCategory === 'm2' ? '<div style="margin-top:8px;font-size:.82rem;color:#2e7d32;font-weight:600">All 17 BANF events included!</div>' : ''}
    </div>
    `;
  } else {
    // Partial payment - polite request for remaining balance
    paymentSection = `
    <div style="background:#e3f2fd;border:2px solid #64b5f6;border-radius:12px;padding:16px;margin:16px 0">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px">
        <span style="font-size:1.2rem;color:#1565c0">&#128077;</span>
        <div style="font-size:1rem;font-weight:700;color:#1565c0">Payment Received - $${totalPaidSoFar}</div>
      </div>
      <p style="margin:0 0 12px;color:#333">Thank you so much for your payment! We truly appreciate your support of BANF.</p>
      <p style="margin:0 0 12px;color:#555">${prevYearNote}</p>
      
      <div style="background:#fff;border:1px solid #e0e0e0;border-radius:8px;padding:12px;margin:12px 0">
        <p style="margin:0 0 8px;font-weight:600;color:#333">Membership Options (${capitalize(tier)} Tier):</p>
        <table style="width:100%;border-collapse:collapse">
          <thead>
            <tr style="background:#f5f5f5">
              <th style="padding:6px 10px;text-align:left;font-size:.8rem;color:#555">Plan</th>
              <th style="padding:6px 10px;text-align:right;font-size:.8rem;color:#555">Full Price</th>
              <th style="padding:6px 10px;text-align:right;font-size:.8rem;color:#555">Your Balance</th>
            </tr>
          </thead>
          <tbody>
            <tr style="${recommendedTier === 'm2' ? 'background:#e8f5e9;' : ''}">
              <td style="padding:6px 10px;border-bottom:1px solid #eee">
                ${recommendedTier === 'm2' ? '<span style="color:#4caf50;font-weight:600">&#9733; </span>' : ''}
                <strong>M2 Premium</strong> <span style="color:#777;font-size:.8rem">(All 17 events)</span>
              </td>
              <td style="padding:6px 10px;border-bottom:1px solid #eee;text-align:right">$${PRICING.m2[tier]}</td>
              <td style="padding:6px 10px;border-bottom:1px solid #eee;text-align:right;font-weight:600;color:${m2Remaining > 0 ? '#f57c00' : '#4caf50'}">
                ${m2Remaining > 0 ? '$' + m2Remaining + ' remaining' : '&#10003; Paid'}
              </td>
            </tr>
            <tr style="${recommendedTier === 'm1' ? 'background:#e8f5e9;' : ''}">
              <td style="padding:6px 10px;border-bottom:1px solid #eee">
                ${recommendedTier === 'm1' ? '<span style="color:#4caf50;font-weight:600">&#9733; </span>' : ''}
                <strong>M1 Regular</strong> <span style="color:#777;font-size:.8rem">(4 events + add-ons)</span>
              </td>
              <td style="padding:6px 10px;border-bottom:1px solid #eee;text-align:right">$${PRICING.m1[tier]}</td>
              <td style="padding:6px 10px;border-bottom:1px solid #eee;text-align:right;font-weight:600;color:${m1Remaining > 0 ? '#f57c00' : '#4caf50'}">
                ${m1Remaining > 0 ? '$' + m1Remaining + ' remaining' : '&#10003; Paid'}
              </td>
            </tr>
            <tr>
              <td style="padding:6px 10px">
                <strong>Cultural Special</strong> <span style="color:#777;font-size:.8rem">(Cultural events)</span>
              </td>
              <td style="padding:6px 10px;text-align:right">$${PRICING.cultural[tier]}</td>
              <td style="padding:6px 10px;text-align:right;font-weight:600;color:${culturalRemaining > 0 ? '#f57c00' : '#4caf50'}">
                ${culturalRemaining > 0 ? '$' + culturalRemaining + ' remaining' : '&#10003; Paid'}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      
      <p style="margin:12px 0 0;color:#555;font-size:.9rem">
        To complete your <strong>${PRICING[recommendedTier].name}</strong> membership, please send the remaining <strong style="color:#f57c00">$${recommendedAmount - totalPaidSoFar}</strong> via Zelle to <strong>${CONFIG.ZELLE_EMAIL}</strong>.
      </p>
      <p style="margin:8px 0 0;color:#777;font-size:.85rem">
        <em>Alternatively, if you'd prefer a different plan, just reply to this email and let us know!</em>
      </p>
    </div>
    `;
  }

  // Family verification section
  const familyVerificationSection = alreadyVerified ? `
    <div style="background:#e8f5e9;border:1px solid #c8e6c9;border-radius:8px;padding:14px;margin:16px 0">
      <div style="display:flex;align-items:center;gap:10px">
        <span style="font-size:1.2rem;color:#2e7d32">&#10003;</span>
        <div>
          <strong style="color:#2e7d32">Contact Information Already Verified</strong>
          <p style="margin:4px 0 0;color:#555;font-size:.88rem">Thank you for verifying your family and contact details previously!</p>
        </div>
      </div>
    </div>
  ` : (verifyUrl && isFullPayment ? `
    <div style="text-align:center;margin:20px 0">
      <a href="${verifyUrl}" style="display:inline-block;background:linear-gradient(135deg,#1565c0,#1976d2);color:#fff;text-decoration:none;padding:14px 36px;border-radius:8px;font-size:1rem;font-weight:700">Verify Your Family &amp; Contact Info</a>
      <p style="margin:8px 0 0;font-size:.78rem;color:#999">Click to review/update your details</p>
    </div>
  ` : '');

  // Family members section (only show for full payments or verified)
  const familyOnBoard = (isFullPayment && (fam.spouseName || fam.childrenCount > 0)) ? `
    <div style="background:#f3e5f5;border:1px solid #ce93d8;border-radius:8px;padding:14px;margin:16px 0">
      <strong>Family Members on This Membership:</strong>
      <ul style="margin:8px 0 0;padding-left:18px;color:#555">
        <li><strong>${esc(m.displayName)}</strong> (Primary)</li>
        ${fam.spouseName ? `<li><strong>${esc(fam.spouseName)}</strong> (Spouse)</li>` : ''}
        ${fam.childrenCount > 0 ? `<li>${fam.childrenCount} child(ren) on file</li>` : ''}
      </ul>
    </div>
  ` : '';

  // Next steps
  const nextSteps = isFullPayment ? `
    <div style="background:#f5f5f5;border:1px solid #e0e0e0;border-radius:8px;padding:14px;margin:16px 0">
      <strong>What's Next:</strong>
      <ol style="margin:8px 0 0;padding-left:18px;color:#555">
        ${!alreadyVerified ? '<li>Verify your family & contact information (link above)</li>' : ''}
        <li>You'll receive an email to set up your BANF member account</li>
        <li>Attend Bosonto Utsob 2026 on ${CONFIG.EVENT_DATE}!</li>
      </ol>
    </div>
  ` : `
    <div style="background:#fff8e1;border:1px solid #ffecb3;border-radius:8px;padding:14px;margin:16px 0">
      <strong>How to Complete Your Membership:</strong>
      <ul style="margin:8px 0 0;padding-left:18px;color:#555">
        <li>Send remaining balance via <strong>Zelle</strong> to: <strong>${CONFIG.ZELLE_EMAIL}</strong></li>
        <li>Memo: <strong>"BANF Membership - ${m.firstName} ${m.lastName}"</strong></li>
        <li>Once we receive your payment, we'll send confirmation + account setup</li>
      </ul>
    </div>
  `;

  return `
<div style="font-family:'Segoe UI',Arial,sans-serif;max-width:620px;margin:0 auto;background:#fff">
  <div style="background:linear-gradient(135deg,#1565c0,#1976d2);color:#fff;padding:20px 24px;border-radius:10px 10px 0 0">
    <h2 style="margin:0;font-size:1.2rem">${isFullPayment ? 'Thank You! Your Membership is Complete' : 'Thank You for Your Payment!'}</h2>
    <p style="margin:6px 0 0;opacity:.9;font-size:.85rem">BANF ${CONFIG.MEMBERSHIP_YEAR} Membership</p>
  </div>
  <div style="padding:20px 24px;border:1px solid #e0e0e0;border-top:none;border-radius:0 0 10px 10px">
    ${familyGreeting}
    <p>We have received your Zelle payment of <strong>$${paidAmount}</strong>. Thank you so much for your continued support of BANF and our Bengali community!</p>
    
    ${paymentSection}
    
    ${isFullPayment ? `<p>We are thrilled to have you join us at <strong>Bosonto Utsob 2026</strong> on <strong>${CONFIG.EVENT_DATE}</strong>${m.eviteAdults > 0 ? ` (RSVP: ${m.eviteAdults} adult${m.eviteAdults > 1 ? 's' : ''}${m.eviteKids > 0 ? `, ${m.eviteKids} child${m.eviteKids > 1 ? 'ren' : ''}` : ''})` : ''}!</p>` : ''}
    
    ${familyOnBoard}
    
    ${familyVerificationSection}
    
    ${nextSteps}
    
    ${(eventsImg || feesImg) ? `<div style="margin:16px 0">
      <h4 style="font-size:.82rem;color:#555;margin:0 0 8px;text-transform:uppercase;letter-spacing:.5px">Membership Events Reference</h4>
      ${eventsImg}
      ${feesImg}
    </div>` : ''}
    
    <p style="margin:18px 0 8px;color:#333">We truly appreciate your support and look forward to seeing you at our events!</p>
    <p style="margin:4px 0">Warm regards,<br><strong>BANF Team</strong></p>
    <p style="color:#777;font-size:.82rem;margin-top:20px;border-top:1px solid #eee;padding-top:12px">Bengali Association of North Florida (BANF) | ${BANF_EMAIL}</p>
  </div>
</div>`;
}

// ═══════════════════════════════════════════════════════════════════════
// PIPELINE EXECUTION — Processes all members, sends emails
// ═══════════════════════════════════════════════════════════════════════

export async function sendBosontoPipelineEmails(members, images) {
  const results = [];
  const errors = [];
  let emailCount = 0;

  for (const m of members) {
    try {
      // Hydrate family and previous year if not already present
      if (!m.family) m.family = detectFamily(m);
      if (!m.previousYear) m.previousYear = getPreviousYearAmount(m);
      if (!m.membershipTier) {
        m.membershipTier = resolveSmartTier(m);
      }

      const memberResult = { email: m.email, displayName: m.displayName, status: m.paymentStatus, emails: [] };

      // Payment Followup action (explicit override for partial/full payment followup)
      if (m.action === 'payment_followup') {
        // Generate comm verification token if not already verified
        let verifyToken = null;
        let alreadyVerified = m.alreadyVerified || false;
        if (!alreadyVerified) {
          try {
            const tokenResult = await createCommVerificationToken(m);
            verifyToken = tokenResult.token;
            alreadyVerified = tokenResult.alreadyVerified;
          } catch (tokenErr) {
            console.log('Token generation failed for ' + m.email + ': ' + tokenErr.message);
          }
        }

        // Payment followup email
        const followupHtml = generatePaymentFollowupEmail(m, images, verifyToken, alreadyVerified);
        const fRes = await sendGmail(m.email, m.displayName, `BANF - Thank You for Your Payment!`, followupHtml, images);
        memberResult.emails.push({ 
          type: 'payment_followup', 
          ...fRes, 
          amountPaid: m.amountPaid || 0,
          isPartialPayment: m.isPartialPayment || false,
          verifyToken: alreadyVerified ? 'already_verified' : verifyToken
        });
        emailCount++;

        // 300ms delay
        await new Promise(r => setTimeout(r, 300));

        results.push(memberResult);
        continue; // Skip other logic since action was handled
      }

      if (m.paymentStatus === 'paid') {
        // Generate comm verification token (reuse existing if pending, skip if already verified)
        let verifyToken = null;
        let alreadyVerified = false;
        try {
          const tokenResult = await createCommVerificationToken(m);
          verifyToken = tokenResult.token;
          alreadyVerified = tokenResult.alreadyVerified;
        } catch (tokenErr) {
          // Non-fatal: send emails without verification link if token creation fails
          console.log('Token generation failed for ' + m.email + ': ' + tokenErr.message);
        }

        // 1. Thank You + Verify email (skip verification link if already verified)
        const verifyHtml = generateContactVerifyEmail(m, images, alreadyVerified ? null : verifyToken);
        const vRes = await sendGmail(m.email, m.displayName, `BANF ${CONFIG.MEMBERSHIP_YEAR} - Thank You! Please Verify Your Details`, verifyHtml, images);
        memberResult.emails.push({ type: 'contact_verify', ...vRes, verifyToken: alreadyVerified ? 'already_verified' : verifyToken });
        emailCount++;

        // 300ms delay between emails
        await new Promise(r => setTimeout(r, 300));

        // 2. Signup Invite email
        const signupHtml = generateSignupInviteEmail(m, images);
        const sRes = await sendGmail(m.email, m.displayName, `BANF ${CONFIG.MEMBERSHIP_YEAR} - Set Up Your Member Account`, signupHtml, images);
        memberResult.emails.push({ type: 'signup_invite', ...sRes });
        emailCount++;

        // 300ms delay
        await new Promise(r => setTimeout(r, 300));

      } else if (m.eviteResponse === 'yes') {
        // Payment Reminder email
        const reminderHtml = generatePaymentReminderEmail(m, images);
        const rRes = await sendGmail(m.email, m.displayName, `BANF Bosonto Utsob 2026 - Complete Your Membership`, reminderHtml, images);
        memberResult.emails.push({ type: 'payment_reminder', ...rRes });
        emailCount++;

        // 300ms delay
        await new Promise(r => setTimeout(r, 300));

      } else if (m.eviteResponse === 'no') {
        // Declined RSVP — send appreciation + next event reminder
        const declinedHtml = generateDeclinedRsvpEmail(m, images);
        const dRes = await sendGmail(m.email, m.displayName, `BANF - We'll Miss You at Bosonto Utsob 2026! See You at Noboborsho?`, declinedHtml, images);
        memberResult.emails.push({ type: 'declined_rsvp', ...dRes });
        emailCount++;

        // 300ms delay
        await new Promise(r => setTimeout(r, 300));

      } else {
        // No response or unclear — no email
        memberResult.emails.push({ type: 'none', reason: `eviteResponse=${m.eviteResponse}, paymentStatus=${m.paymentStatus}` });
      }

      results.push(memberResult);
    } catch (e) {
      errors.push({ email: m.email, displayName: m.displayName, error: e.message });
    }
  }

  return {
    success: true,
    testMode: TEST_MODE,
    totalMembers: members.length,
    emailsSent: emailCount,
    results,
    errors,
    timestamp: new Date().toISOString()
  };
}

// ═══════════════════════════════════════════════════════════════════════
// HTTP ENDPOINT — POST /_functions/bosonto_pipeline
// ═══════════════════════════════════════════════════════════════════════

export async function post_bosonto_pipeline(request) {
  try {
    const bodyText = await request.body.text();
    const body = JSON.parse(bodyText);

    // Auth check
    if (body.adminKey !== ADMIN_KEY) {
      return badRequest({
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ success: false, error: 'Invalid admin key' })
      });
    }

    if (!body.members || !Array.isArray(body.members) || body.members.length === 0) {
      return badRequest({
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ success: false, error: 'No members provided' })
      });
    }

    const images = body.images || null;
    const result = await sendBosontoPipelineEmails(body.members, images);

    return ok({
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      },
      body: JSON.stringify(result)
    });
  } catch (e) {
    return serverError({
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ success: false, error: e.message, stack: e.stack })
    });
  }
}

export function options_bosonto_pipeline(request) {
  return ok({
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400'
    },
    body: ''
  });
}
