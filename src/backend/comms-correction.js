/**
 * ═══════════════════════════════════════════════════════════════
 *  BANF COMMUNICATIONS DETAILS CORRECTION WORKFLOW  v1.0
 *  Super-admin activates a staged email campaign asking members
 *  to verify / correct their contact details.
 *
 *  Fields collected:
 *    - First name, last name
 *    - Phone number
 *    - Preferred email
 *    - Kids (name + age as of today)
 *    - Other adults in family (name + relationship)
 *    - Email opt-in preference
 *    - Option to decline modification
 *
 *  Stages:
 *    1 — Super-admin only  (ranadhir.ghosh@gmail.com)
 *    2 — All AdminRoles (EC members)
 *    3 — CRMMembers not already covered by stages 1-2
 *
 *  Skip rule: if correctedOn == today → already verified, skip.
 *  TEST_MODE: all outbound emails redirect to PRESIDENT_EMAIL.
 * ═══════════════════════════════════════════════════════════════
 */

import { ok, badRequest, serverError, forbidden, response as httpResponse } from 'wix-http-functions';
import wixData from 'wix-data';
import { collections as wixCollections } from 'wix-data.v2';
import { fetch as wixFetch } from 'wix-fetch';

const SA = { suppressAuth: true };
const PRESIDENT_EMAIL   = 'ranadhir.ghosh@gmail.com';
const BANF_ORG          = 'Bengali Association of North Florida (BANF)';
const BANF_EMAIL        = 'banfjax@gmail.com';
const WIX_SITE          = 'https://www.jaxbengali.org';
const TEST_MODE         = false;     // false = emails go to actual recipients
const COMMS_LAUNCHED    = true;      // set true when campaign is officially launched
const COLLECTION        = 'CommsCorrectionTokens';
const WIX_API_KEY       = 'IST.eyJraWQiOiJQb3pIX2FDMiIsImFsZyI6IlJTMjU2In0.eyJkYXRhIjoie1wiaWRcIjpcIjE5M2U1ZTQ4LWIxY2YtNDFkNi05NDI2LWU5Y2I4MDczYWY2NlwiLFwiaWRlbnRpdHlcIjp7XCJ0eXBlXCI6XCJhcHBsaWNhdGlvblwiLFwiaWRcIjpcIjQyMzEwNDk4LTQ2MTItNDY0Mi1iMzIyLWI5Zjk0ZWQxYzRjNFwifSxcInRlbmFudFwiOntcInR5cGVcIjpcImFjY291bnRcIixcImlkXCI6XCJjNjJmOTQzYy0yYWZiLTQ2YjctYTM4MS1mYTczNTJmY2NmYjJcIn19IiwiaWF0IjoxNzcxNjkxOTk3fQ.GVx8jeX6lw2qF3cTWQJX4hWVs_unIkBJAgywR_sbASHyJhs95w6euuWIRW5CfQ_PSZmCKHw6ma5IpQawGhR79hYUi46_49yAg9fCklP60iJJlPLKdLj6NtOVIoYoc-WsG8nOW_9qo1om08YA-Qh_5O-oZv6oRW2gk7C2eOF5E1pjt0CgmVIRK8z5HvVqlXYftO9NtaSfHh9vhSVPkxVU6jp1OJBsR_UdcdL6Rpiv-bJx0hKJJOfNJMc89oEBiCaAJ4No65-FsGouo2yIYUCsDAQTtBk9rWh3cH8_n-ts0WK57kdtXVKRqQ5g7ch5usUdFAUBTSaviGXpExj5VoTVKQ';
const WIX_SITE_ID       = 'c13ae8c5-7053-4f2d-9a9a-371869be4395';

const GOOGLE_CLIENT_ID     = '1020178199135-3usrl611ara38i7rhu2ub6sn6g1150ml.apps.googleusercontent.com';
const GOOGLE_CLIENT_SECRET = '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';
const GOOGLE_REFRESH_TOKEN = '1//04iXClX5dKpqhCgYIARAAGAQSNwF-L9IrCtEUhuup9COlH5wnvGtozgReO4E5ILylE9Jq4f8vw1YUXDT_ysiHcJ89g-PA96eh8Ko';

// ─────────────────────────────────────────
// COLLECTION AUTO-PROVISIONING
// Same multi-strategy pattern used by banf-survey.js / archive-mapper.js:
//   1. Probe query — already exists? skip.
//   2. wix-data.v2 createCollection (works in Wix live backend context)
//   3. wixData.save  — some envs auto-create on first save
//   4. wixData.insert — last resort auto-create
// ─────────────────────────────────────────
let _collectionEnsured = false;

async function ensureCollection() {
    if (_collectionEnsured) return;
    // 1. Already exists?
    try {
        await wixData.query(COLLECTION).limit(1).find(SA);
        _collectionEnsured = true;
        return;
    } catch (e) {
        if (!e.message || !e.message.includes('WDE0025')) {
            _collectionEnsured = true; return;
        }
    }
    // 2. wix-data.v2 SDK (works in some Wix live backend contexts)
    try {
        if (typeof wixCollections.createCollection === 'function') {
            await wixCollections.createCollection({
                collection: {
                    id: COLLECTION, displayName: COLLECTION,
                    permissions: {
                        read:   { roles: ['ADMIN'] },
                        insert: { roles: ['ADMIN'] },
                        update: { roles: ['ADMIN'] },
                        remove: { roles: ['ADMIN'] }
                    }
                }
            });
            await new Promise(r => setTimeout(r, 800));
            _collectionEnsured = true; return;
        }
    } catch (_) {}
    // 3. Wix Data REST API (most reliable in HTTP function context)
    try {
        const resp = await wixFetch('https://www.wixapis.com/wix-data/v2/collections', {
            method: 'POST',
            headers: {
                'Content-Type':  'application/json',
                'Authorization': WIX_API_KEY,
                'wix-site-id':   WIX_SITE_ID
            },
            body: JSON.stringify({ collection: { id: COLLECTION, displayName: COLLECTION } })
        });
        if (resp.status >= 200 && resp.status < 300) {
            await new Promise(r => setTimeout(r, 1000));
            _collectionEnsured = true; return;
        }
    } catch (_) {}
    // 4. wixData.save() — some envs auto-create on first write
    try {
        const probe = await wixData.save(COLLECTION, { _init: true, ts: new Date() }, SA);
        if (probe && probe._id) {
            await wixData.remove(COLLECTION, probe._id, SA).catch(() => {});
            await new Promise(r => setTimeout(r, 400));
        }
    } catch (_) {}
    _collectionEnsured = true;
}

// ─────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────

function jsonOk(data) {
    return ok({ body: JSON.stringify({ success: true, ...data }),
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
}
function jsonErr(msg, code = 400) {
    const fn = code === 403 ? forbidden : (code >= 500 ? serverError : badRequest);
    return fn({ body: JSON.stringify({ success: false, error: msg }),
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
}
function handleCors() {
    return ok({ body: '', headers: {
        'Access-Control-Allow-Origin':  '*',
        'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type,x-user-email'
    }});
}
async function parseBody(request) {
    try { return await request.body.json(); } catch (_) { return {}; }
}
function todayStr() {
    return new Date().toISOString().slice(0, 10); // 'YYYY-MM-DD'
}
function generateToken() {
    const ts  = Date.now().toString(36).toUpperCase();
    const rnd = Math.random().toString(36).substring(2, 10).toUpperCase();
    return `CCT-${ts}-${rnd}`;
}
function ageFromDob(dobStr) {
    if (!dobStr) return null;
    try {
        const dob  = new Date(dobStr);
        const today = new Date();
        let age = today.getFullYear() - dob.getFullYear();
        const m = today.getMonth() - dob.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
        return age >= 0 ? age : null;
    } catch (_) { return null; }
}

// ─────────────────────────────────────────
// PERMISSION CHECK (uses AdminRoles collection)
// ─────────────────────────────────────────
// PRESIDENT_EMAIL always has full super-admin + president access regardless
// of the role value stored in AdminRoles.
async function requireSuperAdmin(request) {
    const email = (request.headers && request.headers['x-user-email']) || '';
    if (!email) return { allowed: false, email: null };
    const lc = email.toLowerCase();
    // President email is implicitly both super_admin and president
    if (lc === PRESIDENT_EMAIL.toLowerCase()) {
        return { allowed: true, email: lc, role: 'super_admin' };
    }
    const res = await wixData.query('AdminRoles')
        .eq('email', lc).eq('isActive', true).find(SA);
    if (!res.items.length) return { allowed: false, email: lc };
    const role = (res.items[0].role || '').toLowerCase();
    const allowed = ['super_admin', 'admin', 'president'].includes(role);
    return { allowed, email: lc, role, record: res.items[0] };
}

async function requireAdmin(request) {
    const email = (request.headers && request.headers['x-user-email']) || '';
    if (!email) return { allowed: false, email: null };
    const lc = email.toLowerCase();
    // President email always has admin access
    if (lc === PRESIDENT_EMAIL.toLowerCase()) {
        return { allowed: true, email: lc, role: 'super_admin' };
    }
    const res = await wixData.query('AdminRoles')
        .eq('email', lc).eq('isActive', true).find(SA);
    if (!res.items.length) return { allowed: false, email: lc };
    const role = (res.items[0].role || '').toLowerCase();
    const allowed = ['super_admin', 'admin', 'president', 'ec_member'].includes(role);
    return { allowed, email: lc, role, record: res.items[0] };
}

// ─────────────────────────────────────────
// GMAIL SEND
// ─────────────────────────────────────────
async function sendGmail(to, toName, subject, html) {
    let actualTo = to, actualName = toName, actualSubject = subject;
    if (TEST_MODE && to.toLowerCase() !== PRESIDENT_EMAIL.toLowerCase()) {
        actualTo      = PRESIDENT_EMAIL;
        actualName    = 'BANF President (TEST)';
        actualSubject = `[TEST → ${to}] ${subject}`;
    }
    try {
        const tokenRes = await wixFetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: `client_id=${GOOGLE_CLIENT_ID}&client_secret=${GOOGLE_CLIENT_SECRET}&refresh_token=${GOOGLE_REFRESH_TOKEN}&grant_type=refresh_token`
        });
        const tokenData = await tokenRes.json();
        const accessToken = tokenData.access_token;
        if (!accessToken) throw new Error('No access token returned from OAuth');

        const message = [
            `To: ${actualName} <${actualTo}>`,
            `From: ${BANF_ORG} <${BANF_EMAIL}>`,
            `Subject: ${actualSubject}`,
            `Content-Type: text/html; charset=utf-8`,
            `MIME-Version: 1.0`,
            '',
            html
        ].join('\r\n');
        const encodedMessage = btoa(unescape(encodeURIComponent(message)))
            .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

        const gmailRes = await wixFetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ raw: encodedMessage })
        });
        const gmailData = await gmailRes.json();
        return { ok: !!gmailData.id, messageId: gmailData.id, redirected: actualTo !== to };
    } catch (e) {
        console.error('[comms-correction] sendGmail error:', e.message);
        return { ok: false, error: e.message };
    }
}

// ─────────────────────────────────────────
// EMAIL TEMPLATE
// ─────────────────────────────────────────
function buildCorrectionEmail(recipientName, formUrl, extraNotes = '') {
    return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>BANF - Please Review Your Contact Details</title></head>
<body style="margin:0;padding:0;background:#f5f7fa;font-family:'Segoe UI',Arial,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f7fa;padding:30px 0">
<tr><td align="center">
<table width="620" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.1)">

  <!-- Header -->
  <tr><td style="background:linear-gradient(135deg,#8B0000,#DC143C);padding:32px 40px;text-align:center">
    <h1 style="color:#fff;margin:0;font-size:1.6rem;font-weight:700">Bengali Association of North Florida</h1>
    <p style="color:rgba(255,255,255,.85);margin:8px 0 0;font-size:.95rem;letter-spacing:.3px">
      Action Required &mdash; Please Review Your Contact Details
    </p>
  </td></tr>

  <!-- Greeting & Purpose -->
  <tr><td style="padding:36px 40px 4px">
    <p style="font-size:1.05rem;color:#333;margin:0 0 18px">Dear <strong>${recipientName}</strong>,</p>

    <p style="color:#444;line-height:1.75;margin:0 0 14px">
      BANF regularly communicates with its members and the wider Bengali community of North Florida across
      a broad range of activities and event categories, including:
    </p>

    <!-- Event categories grid -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 18px">
      <tr>
        <td width="50%" style="padding:4px 8px 4px 0;vertical-align:top">
          <table cellpadding="0" cellspacing="0">
            <tr><td style="padding:4px 0;color:#444;font-size:.9rem">&#127941;&nbsp; <strong>Sports &amp; Recreation</strong> &mdash; Sports Day, tournaments, outdoor activities</td></tr>
            <tr><td style="padding:4px 0;color:#444;font-size:.9rem">&#127878;&nbsp; <strong>Cultural Events</strong> &mdash; Durga Puja, Pohela Boishakh, performances</td></tr>
            <tr><td style="padding:4px 0;color:#444;font-size:.9rem">&#128335;&nbsp; <strong>Religious &amp; Spiritual</strong> &mdash; Puja utsabs, prayers, festivals</td></tr>
            <tr><td style="padding:4px 0;color:#444;font-size:.9rem">&#127970;&nbsp; <strong>Social Gatherings</strong> &mdash; picnics, dinners, family meetups</td></tr>
          </table>
        </td>
        <td width="50%" style="padding:4px 0 4px 8px;vertical-align:top">
          <table cellpadding="0" cellspacing="0">
            <tr><td style="padding:4px 0;color:#444;font-size:.9rem">&#128101;&nbsp; <strong>Community Outreach</strong> &mdash; volunteering, welfare drives</td></tr>
            <tr><td style="padding:4px 0;color:#444;font-size:.9rem">&#127979;&nbsp; <strong>Education</strong> &mdash; scholarships, workshops, youth programs</td></tr>
            <tr><td style="padding:4px 0;color:#444;font-size:.9rem">&#128226;&nbsp; <strong>General Information</strong> &mdash; newsletters, announcements, updates</td></tr>
            <tr><td style="padding:4px 0;color:#444;font-size:.9rem">&#128209;&nbsp; <strong>Special Interest</strong> &mdash; health camps, seminars, awareness</td></tr>
          </table>
        </td>
      </tr>
    </table>

    <p style="color:#444;line-height:1.75;margin:0 0 14px">
      We send these communications to <em>both members and non-members</em> to keep our entire community
      connected and informed. To ensure our records are accurate, we are requesting everyone in our address
      book to <strong>review and verify their current details on file</strong>.
    </p>
  </td></tr>

  <!-- What to verify -->
  <tr><td style="padding:4px 40px 4px">
    <div style="background:#fff8e1;border-left:4px solid #D4AF37;border-radius:0 10px 10px 0;padding:16px 20px;margin:8px 0 18px">
      <p style="margin:0 0 8px;font-weight:700;color:#7B5800;font-size:.95rem">&#128203; Please check the following details currently held in our system and update them if needed:</p>
      <ul style="margin:0;padding-left:20px;color:#5a4000;line-height:2">
        <li>Your <strong>first name and last name</strong></li>
        <li>Your <strong>nickname</strong> (if any &mdash; what friends and family call you)</li>
        <li>Your <strong>phone number</strong></li>
        <li>Your <strong>preferred email address</strong> for BANF communications</li>
        <li><strong>Spouse and other adults in your household</strong> &mdash; names and relationship</li>
        <li><strong>Children in your household</strong> &mdash; names and current ages</li>
        <li>Your <strong>email communication preference</strong> &mdash; opt in or opt out</li>
      </ul>
    </div>
  </td></tr>

  <!-- Opt-out notice -->
  <tr><td style="padding:4px 40px 4px">
    <div style="background:#fef2f2;border-left:4px solid #DC143C;border-radius:0 10px 10px 0;padding:14px 20px;margin:0 0 18px">
      <p style="margin:0;color:#7f1d1d;font-size:.92rem;line-height:1.7">
        <strong>Want to stop receiving BANF emails entirely?</strong><br>
        The form also includes an option to <strong>unsubscribe from all future BANF email communications</strong>.
        Selecting this will immediately flag your record and no further emails of any category will be sent to you.
        You can change this preference at any time by contacting us at
        <a href="mailto:${BANF_EMAIL}" style="color:#DC143C">${BANF_EMAIL}</a>.
      </p>
    </div>
  </td></tr>

  <!-- CTA Button -->
  <tr><td style="padding:8px 40px 32px;text-align:center">
    <p style="color:#444;line-height:1.7;margin:0 0 20px;font-size:.95rem">
      <strong>You are not required to make any changes.</strong> Simply open the form, review what we have
      on file, and click <em>"Confirm &amp; Save"</em> &mdash; even if everything looks correct.
      You may also decline this request entirely if you prefer not to participate.
    </p>
    <a href="${formUrl}"
       style="display:inline-block;background:linear-gradient(135deg,#8B0000,#DC143C);color:#fff;text-decoration:none;
              padding:15px 44px;border-radius:30px;font-size:1.05rem;font-weight:700;letter-spacing:.5px;
              box-shadow:0 4px 18px rgba(139,0,0,.35)">
      &#9998;&nbsp;&nbsp;Open My Details Form
    </a>
    <p style="margin:14px 0 4px;font-size:.8rem;color:#888">This link is personal and unique to you &mdash; please do not share or forward it.</p>
    <p style="margin:0;font-size:.75rem;color:#aaa">Link expires in 14 days from the date this email was sent.</p>
    ${extraNotes ? `<p style="margin:14px 0 0;font-size:.85rem;color:#666;line-height:1.6">${extraNotes}</p>` : ''}
  </td></tr>

  <!-- Data Privacy -->
  <tr><td style="background:#f0f4f8;border-top:1px solid #dde3ea;padding:22px 40px">
    <p style="margin:0 0 8px;font-size:.82rem;font-weight:700;color:#555;letter-spacing:.3px">&#128274; DATA PRIVACY NOTICE</p>
    <p style="margin:0;font-size:.8rem;color:#666;line-height:1.75">
      The information you provide is collected <strong>solely for internal BANF communication and community management purposes</strong>.
      This data is used exclusively to send you relevant communications about BANF events and activities as described above.
    </p>
    <ul style="margin:8px 0 0;padding-left:18px;font-size:.79rem;color:#666;line-height:1.9">
      <li><strong>No third-party sharing:</strong> Your personal details will never be sold, rented, or shared with any external organisation, advertiser, or third party.</li>
      <li><strong>Purpose limitation:</strong> Data collected through this form is used only for the communication purposes stated above and for no other purpose.</li>
      <li><strong>Data security:</strong> Your information is stored securely within the BANF member management system with access restricted to authorised BANF committee members only.</li>
      <li><strong>Right to opt out:</strong> You may withdraw consent and unsubscribe from all communications at any time by contacting <a href="mailto:${BANF_EMAIL}" style="color:#8B0000">${BANF_EMAIL}</a> or by using the unsubscribe option in the form.</li>
      <li><strong>Right to erasure:</strong> You may request deletion of your personal data from BANF records at any time by contacting us directly.</li>
    </ul>
    <p style="margin:10px 0 0;font-size:.78rem;color:#888;line-height:1.6">
      BANF is committed to responsible and transparent handling of personal data in line with applicable privacy standards.
      If you believe you received this email in error or have any concerns, please write to us at
      <a href="mailto:${BANF_EMAIL}" style="color:#8B0000">${BANF_EMAIL}</a>.
    </p>
  </td></tr>

  <!-- Footer -->
  <tr><td style="background:#f9f9f9;border-top:1px solid #eee;padding:14px 40px;text-align:center">
    <p style="margin:0;font-size:.77rem;color:#aaa">&copy; ${new Date().getFullYear()} Bengali Association of North Florida (BANF). All rights reserved.</p>
  </td></tr>

</table>
</td></tr>
</table>
</body>
</html>`;
}

// ─────────────────────────────────────────
// FORM HTML
// ─────────────────────────────────────────
function buildFormHtml(tokenData, memberData, familyAdults, familyKids) {
    const BASE = `${WIX_SITE}/_functions`;
    const token = tokenData.token;
    const today = new Date().toISOString().slice(0, 10);

    const kidsJson = JSON.stringify(familyKids.map(k => ({
        memberId: k.memberId || '',
        name: (k.firstName + ' ' + k.lastName).trim(),
        dob: k.dateOfBirth || '',
        age: ageFromDob(k.dateOfBirth)
    })));
    const adultsJson = JSON.stringify(familyAdults.map(a => ({
        memberId: a.memberId || '',
        name: (a.firstName + ' ' + a.lastName).trim(),
        email: a.email || '',
        relationship: a.relationship || 'Spouse/Partner'
    })));

    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>BANF — Verify Your Details</title>
<style>
  :root {
    --red: #8B0000; --crimson: #DC143C; --gold: #D4AF37;
    --bg: #f5f7fa; --card: #fff; --border: #e0e0e0;
    --text: #2D2D2D; --muted: #666;
  }
  * { box-sizing: border-box; font-family: 'Segoe UI', Arial, sans-serif; }
  body { background: var(--bg); margin: 0; padding: 20px 16px 60px; color: var(--text); }
  .card { background: var(--card); border-radius: 16px; box-shadow: 0 4px 20px rgba(0,0,0,.08); max-width: 680px; margin: 0 auto; overflow: hidden; }
  .header { background: linear-gradient(135deg, var(--red), var(--crimson)); color: #fff; padding: 28px 32px; text-align: center; }
  .header h1 { margin: 0; font-size: 1.4rem; font-weight: 700; }
  .header p { margin: 6px 0 0; opacity: .85; font-size: .9rem; }
  .body { padding: 28px 32px; }
  .notice { background: #fff8e1; border-left: 4px solid var(--gold); border-radius: 0 8px 8px 0; padding: 12px 16px; margin: 0 0 24px; font-size: .9rem; color: #7B5800; line-height: 1.6; }
  .section-title { font-size: 1rem; font-weight: 700; color: var(--red); margin: 24px 0 12px; display: flex; align-items: center; gap: 8px; }
  .section-title::after { content: ''; flex: 1; height: 1px; background: #eee; }
  .row2 { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
  @media(max-width:500px){ .row2 { grid-template-columns: 1fr; } }
  label { display: block; font-size: .88rem; font-weight: 600; margin-bottom: 5px; color: var(--text); }
  input[type=text], input[type=email], input[type=tel], input[type=number], input[type=date], select {
    width: 100%; padding: 10px 14px; border: 2px solid var(--border); border-radius: 10px;
    font-size: .95rem; transition: border .2s; }
  input:focus, select:focus { outline: none; border-color: var(--crimson); box-shadow: 0 0 0 3px rgba(220,20,60,.12); }
  .mb { margin-bottom: 16px; }
  .opt-row { display: flex; align-items: center; gap: 12px; background: #f8f8ff; border-radius: 10px; padding: 14px; border: 2px solid var(--border); }
  .opt-row input[type=checkbox] { width: 20px; height: 20px; accent-color: var(--crimson); cursor: pointer; flex-shrink: 0; }
  .opt-row label { margin: 0; font-size: .93rem; cursor: pointer; }
  /* Dynamic rows */
  .dyn-row { display: flex; gap: 8px; align-items: flex-end; margin-bottom: 10px; }
  .dyn-row > * { flex: 1; }
  .btn-remove { flex: 0 0 36px; height: 38px; background: #ffeaea; border: 1px solid #ffb3b3; border-radius: 8px; cursor: pointer; color: #c00; font-size: 1.1rem; }
  .btn-add { display: inline-flex; align-items: center; gap: 6px; background: #f0f0f0; border: 1px solid #ccc; border-radius: 8px; padding: 8px 14px; font-size: .87rem; cursor: pointer; transition: background .2s; color: var(--text); margin-top: 4px; }
  .btn-add:hover { background: #e4e4e4; }
  /* Buttons */
  .actions { display: flex; gap: 12px; margin-top: 28px; flex-wrap: wrap; }
  .btn-save { flex: 2; min-width: 160px; padding: 14px 20px; background: linear-gradient(135deg,var(--red),var(--crimson)); color: #fff; border: none; border-radius: 30px; font-size: 1rem; font-weight: 700; cursor: pointer; transition: opacity .2s; }
  .btn-save:hover { opacity: .9; }
  .btn-save:disabled { opacity: .5; cursor: not-allowed; }
  .btn-decline { flex: 1; min-width: 120px; padding: 14px 20px; background: #f0f0f0; color: var(--muted); border: 1px solid #ccc; border-radius: 30px; font-size: .95rem; cursor: pointer; transition: background .2s; }
  .btn-decline:hover { background: #e4e4e4; }
  /* Result screens */
  .result { text-align: center; padding: 40px 32px; display: none; }
  .result.show { display: block; }
  .result .icon { font-size: 3.5rem; margin-bottom: 16px; }
  .result h2 { margin: 0 0 12px; color: var(--text); }
  .result p { color: var(--muted); line-height: 1.7; }
  .spinner { display: none; justify-content: center; margin: 8px 0 0; }
  .spinner.show { display: flex; }
  @keyframes spin { to { transform: rotate(360deg); } }
  .spin-circle { width: 22px; height: 22px; border: 3px solid #eee; border-top-color: var(--crimson); border-radius: 50%; animation: spin .7s linear infinite; }
</style>
</head>
<body>
<div class="card">
  <div class="header">
    <h1>Bengali Association of North Florida</h1>
    <p>Communication Details Verification</p>
  </div>

  <!-- MAIN FORM -->
  <div id="mainForm" class="body">
    <div class="notice">
      Please review your details below. You can update any information or simply confirm it as-is.
      All fields are optional — only correct what needs updating. You may also choose to decline this request.
    </div>

    <!-- Name -->
    <div class="section-title"><span>👤 Your Name</span></div>
    <div class="row2 mb">
      <div>
        <label for="firstName">First Name</label>
        <input type="text" id="firstName" value="${(memberData.firstName || '').replace(/"/g,'&quot;')}" placeholder="First name">
      </div>
      <div>
        <label for="lastName">Last Name</label>
        <input type="text" id="lastName" value="${(memberData.lastName || '').replace(/"/g,'&quot;')}" placeholder="Last name">
      </div>
    </div>

    <!-- Contact -->
    <div class="section-title"><span>📞 Contact Details</span></div>
    <div class="row2 mb">
      <div>
        <label for="phone">Phone Number</label>
        <input type="tel" id="phone" value="${(memberData.phone || '').replace(/"/g,'&quot;')}" placeholder="e.g. 904-555-0100">
      </div>
      <div>
        <label for="preferredEmail">Preferred Email for BANF</label>
        <input type="email" id="preferredEmail" value="${(memberData.alternateEmail || memberData.email || '').replace(/"/g,'&quot;')}" placeholder="your@email.com">
      </div>
    </div>

    <!-- Email opt-in / opt-out -->
    <div class="section-title"><span>&#128231; Email Communication Preferences</span></div>
    <p style="font-size:.88rem;color:var(--muted);margin:0 0 14px;line-height:1.6">
      Please choose your email communication preference. This applies to <strong>all future BANF emails</strong>
      including event invitations, cultural programs, sports days, religious observances, community updates,
      education programs, and general announcements.
    </p>
    <!-- Opt-in -->
    <div class="opt-row mb" id="optInRow" style="border-color:#22c55e;background:#f0fdf4;cursor:pointer">
      <input type="radio" name="emailPref" id="optIn" value="in" ${memberData.emailOptIn !== false ? 'checked' : ''} style="width:18px;height:18px;accent-color:#16a34a;flex-shrink:0;cursor:pointer">
      <label for="optIn" style="cursor:pointer">
        <strong style="color:#15803d">&#10003;&nbsp; Yes, I want to receive BANF emails</strong>
        <span style="color:#555;font-size:.85rem;display:block;margin-top:3px;line-height:1.5">
          I am happy to receive invitations and updates about BANF events: sports days, cultural festivals,
          religious celebrations, social gatherings, community initiatives, educational programs, and general announcements.
        </span>
      </label>
    </div>
    <!-- Opt-out -->
    <div class="opt-row mb" id="optOutRow" style="border-color:#ef4444;background:#fff5f5;cursor:pointer">
      <input type="radio" name="emailPref" id="optOut" value="out" ${memberData.emailOptIn === false ? 'checked' : ''} style="width:18px;height:18px;accent-color:#dc2626;flex-shrink:0;cursor:pointer">
      <label for="optOut" style="cursor:pointer">
        <strong style="color:#dc2626">&#128683;&nbsp; No, please stop all BANF email communications</strong>
        <span style="color:#666;font-size:.85rem;display:block;margin-top:3px;line-height:1.5">
          I do not wish to receive any future emails from BANF. My record will be flagged immediately
          and no further communications of any kind will be sent to this email address.
          You can change this decision at any time by contacting <strong>banfjax@gmail.com</strong>.
        </span>
      </label>
    </div>
    <p style="font-size:.78rem;color:#888;margin:-4px 0 0;line-height:1.6">
      &#128274; Your preference is stored securely. BANF does not share your contact details with any third party.
    </p>

    <!-- Other adults -->
    <div class="section-title"><span>🏠 Other Adults in Household</span></div>
    <p style="font-size:.88rem;color:var(--muted);margin:0 0 12px;line-height:1.6">
      Please list all other adults currently in your household and their relationship to you.
    </p>
    <div id="adultsContainer"></div>
    <button type="button" id="btnAddAdult" class="btn-add">＋ Add adult</button>

    <!-- Kids -->
    <div class="section-title" style="margin-top:28px"><span>👶 Children in Household</span></div>
    <p style="font-size:.88rem;color:var(--muted);margin:0 0 12px;line-height:1.6">
      Please list children's full names and ages <em>as of today (${today})</em>.
    </p>
    <div id="kidsContainer"></div>
    <button type="button" id="btnAddKid" class="btn-add">＋ Add child</button>

    <!-- Actions -->
    <div class="actions">
      <button class="btn-save" id="btnSave">✔ Confirm &amp; Save</button>
      <button class="btn-decline" id="btnDecline">Skip / Decline to modify</button>
    </div>
    <div class="spinner" id="spinner"><div class="spin-circle"></div></div>
    <p id="errMsg" style="color:#c00;font-size:.88rem;margin-top:8px;display:none"></p>
  </div>

  <!-- SUCCESS SCREEN -->
  <div id="successScreen" class="result">
    <div class="icon" id="successIcon">&#10003;</div>
    <h2 id="successTitle">Details Saved!</h2>
    <p id="successMsg">Thank you for taking the time to verify your information.<br>
       BANF will use these details for all future communications.</p>
    <p style="font-size:.85rem;color:#aaa;margin-top:20px">You may close this window.</p>
  </div>

  <!-- DECLINED SCREEN -->
  <div id="declineScreen" class="result">
    <div class="icon">🙏</div>
    <h2>No problem!</h2>
    <p>We have recorded that you declined to modify your details at this time.<br>
       Our existing records for you remain unchanged.</p>
    <p style="font-size:.85rem;color:#aaa;margin-top:20px">You may close this window.</p>
  </div>
</div>

<script>
const BASE    = '${BASE}';
const TOKEN   = '${token}';
const TODAY   = '${today}';

// ── Initial data from server ──────────────────────────────────
const initialAdults = ${adultsJson};
const initialKids   = ${kidsJson};

// ── Adult rows ────────────────────────────────────────────────
let adultCount = 0;
function addAdult(data = {}) {
  const i = adultCount++;
  const id = 'adult_' + i;
  const name = data.name || '';
  const mid  = data.memberId || '';
  const rel  = data.relationship || 'Spouse/Partner';
  const rels = ['Spouse/Partner','Parent','Sibling','Friend','Other'];
  const opts = rels.map(r => '<option' + (r===rel?' selected':'')+'>'+r+'</option>').join('');
  const html = '<div class="dyn-row" id="'+id+'">'
    + '<input type="hidden" data-field="memberid" value="'+mid+'">'
    + '<div><label style="font-size:.82rem">Full name</label>'
    + '<input type="text" placeholder="Full name" value="'+name.replace(/"/g,'&quot;')+'" data-field="name">'
    + '</div><div style="flex:0 0 160px"><label style="font-size:.82rem">Relationship</label>'
    + '<select data-field="rel">'+opts+'</select>'
    + '</div><button type="button" class="btn-remove" data-remove="'+id+'" title="Remove">✕</button></div>';
  document.getElementById('adultsContainer').insertAdjacentHTML('beforeend', html);
}
initialAdults.forEach(a => addAdult(a));

// ── Kid rows ──────────────────────────────────────────────────
let kidCount = 0;
function addKid(data = {}) {
  const i = kidCount++;
  const id = 'kid_' + i;
  const name = data.name || '';
  const mid  = data.memberId || '';
  const age  = data.age != null ? String(data.age) : '';
  const html = '<div class="dyn-row" id="'+id+'">'
    + '<input type="hidden" data-field="memberid" value="'+mid+'">'
    + '<div><label style="font-size:.82rem">Child\'s full name</label>'
    + '<input type="text" placeholder="Full name" value="'+name.replace(/"/g,'&quot;')+'" data-field="name">'
    + '</div><div style="flex:0 0 100px"><label style="font-size:.82rem">Age (years)</label>'
    + '<input type="number" min="0" max="20" placeholder="Age" value="'+age+'" data-field="age">'
    + '</div><button type="button" class="btn-remove" data-remove="'+id+'" title="Remove">✕</button></div>';
  document.getElementById('kidsContainer').insertAdjacentHTML('beforeend', html);
}
initialKids.forEach(k => addKid(k));

// ── Email preference radio helpers ───────────────────────────
function selectOptIn(val) {
  document.getElementById(val ? 'optIn' : 'optOut').checked = true;
  document.getElementById('optInRow').style.borderColor  = val ? '#22c55e' : '#e5e7eb';
  document.getElementById('optInRow').style.background   = val ? '#f0fdf4' : '#f9f9f9';
  document.getElementById('optOutRow').style.borderColor = val ? '#e5e7eb' : '#ef4444';
  document.getElementById('optOutRow').style.background  = val ? '#f9f9f9' : '#fff5f5';
}

// ── Collect form data ─────────────────────────────────────────
function collectAdults() {
  return Array.from(document.querySelectorAll('#adultsContainer .dyn-row')).map(row => ({
    memberId:     (row.querySelector('[data-field="memberid"]') || {value:''}).value || '',
    name:         row.querySelector('[data-field="name"]').value.trim(),
    relationship: row.querySelector('[data-field="rel"]').value
  })).filter(a => a.name);
}
function collectKids() {
  return Array.from(document.querySelectorAll('#kidsContainer .dyn-row')).map(row => ({
    memberId: (row.querySelector('[data-field="memberid"]') || {value:''}).value || '',
    name:     row.querySelector('[data-field="name"]').value.trim(),
    age:      parseInt(row.querySelector('[data-field="age"]').value) || null
  })).filter(k => k.name);
}

// ── Submit ────────────────────────────────────────────────────
async function submitForm() {
  const btn = document.getElementById('btnSave');
  const sp  = document.getElementById('spinner');
  const err = document.getElementById('errMsg');
  err.style.display = 'none';
  btn.disabled = true; sp.classList.add('show');
  const payload = {
    token: TOKEN,
    firstName:      document.getElementById('firstName').value.trim(),
    lastName:       document.getElementById('lastName').value.trim(),
    phone:          document.getElementById('phone').value.trim(),
    preferredEmail: document.getElementById('preferredEmail').value.trim(),
    emailOptIn:     document.getElementById('optIn').checked,
    noFutureEmail:  document.getElementById('optOut').checked,
    otherAdults:    collectAdults(),
    kids:           collectKids()
  };
  try {
    const res  = await fetch(BASE + '/comms_correction_submit', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (data.success) {
      document.getElementById('mainForm').style.display = 'none';
      if (payload.noFutureEmail) {
        document.getElementById('successIcon').textContent = '\u2709\ufe0f';
        document.getElementById('successTitle').textContent = 'Unsubscribed Successfully';
        document.getElementById('successMsg').innerHTML =
          'You have been removed from all future BANF email communications.<br>' +
          'Your preference has been saved immediately. We respect your decision.<br>' +
          '<span style="font-size:.85rem;color:#888">To re-subscribe in the future, please contact us at <strong>banfjax@gmail.com</strong>.</span>';
      } else {
        document.getElementById('successIcon').textContent = '\u2705';
        document.getElementById('successTitle').textContent = 'Details Saved!';
        document.getElementById('successMsg').innerHTML =
          'Thank you for taking the time to verify your information.<br>' +
          'BANF will use these updated details for all future communications.';
      }
      document.getElementById('successScreen').classList.add('show');
    } else {
      err.textContent = data.error || 'An error occurred. Please try again.';
      err.style.display = 'block';
      btn.disabled = false; sp.classList.remove('show');
    }
  } catch(e) {
    err.textContent = 'Network error. Please check your connection and try again.';
    err.style.display = 'block';
    btn.disabled = false; sp.classList.remove('show');
  }
}

// ── Wire up all button event listeners (no onclick attributes) ──
document.getElementById('btnAddAdult').addEventListener('click', function() { addAdult(); });
document.getElementById('btnAddKid').addEventListener('click', function() { addKid(); });
document.getElementById('btnSave').addEventListener('click', submitForm);
document.getElementById('btnDecline').addEventListener('click', declineForm);
document.getElementById('optInRow').addEventListener('click', function() { selectOptIn(true); });
document.getElementById('optOutRow').addEventListener('click', function() { selectOptIn(false); });
document.getElementById('adultsContainer').addEventListener('click', function(e) {
  var btn = e.target.closest('[data-remove]');
  if (btn) { var el = document.getElementById(btn.dataset.remove); if (el) el.remove(); }
});
document.getElementById('kidsContainer').addEventListener('click', function(e) {
  var btn = e.target.closest('[data-remove]');
  if (btn) { var el = document.getElementById(btn.dataset.remove); if (el) el.remove(); }
});

// ── Decline ───────────────────────────────────────────────────
async function declineForm() {
  if (!confirm('Are you sure you want to skip this update? No changes will be made to your record.')) return;
  document.getElementById('btnDecline').disabled = true;
  try {
    const res  = await fetch(BASE + '/comms_correction_decline', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: TOKEN })
    });
    const data = await res.json();
    document.getElementById('mainForm').style.display = 'none';
    document.getElementById('declineScreen').classList.add('show');
  } catch(e) {
    document.getElementById('mainForm').style.display = 'none';
    document.getElementById('declineScreen').classList.add('show');
  }
}
</script>
</body>
</html>`;
}

// ─────────────────────────────────────────
// TOKEN LOOKUP HELPER
// ─────────────────────────────────────────
async function findToken(token) {
    const res = await wixData.query(COLLECTION).eq('token', token).limit(1).find(SA);
    return res.items.length ? res.items[0] : null;
}

async function getMemberAndFamily(email) {
    const lc = email.toLowerCase();
    // Primary member record
    const mRes = await wixData.query('CRMMembers')
        .eq('email', lc).eq('isAdult', true).eq('isActive', true).limit(1).find(SA);
    const member = mRes.items[0] || null;
    if (!member) return { member: null, familyAdults: [], familyKids: [] };

    // Family members
    const famRes = await wixData.query('CRMMembers')
        .eq('familyId', member.familyId).eq('isActive', true).find(SA);
    const familyAdults = famRes.items.filter(m =>
        m.isAdult && m.email.toLowerCase() !== lc);
    const familyKids   = famRes.items.filter(m => !m.isAdult);
    return { member, familyAdults, familyKids };
}

// ─────────────────────────────────────────
// ENDPOINT: POST /comms_correction_launch
// Super-admin: send correction emails for a given stage
// Body: { stage: 1|2|3 }
// ─────────────────────────────────────────
export async function post_comms_correction_launch(request) {
    try {
        await ensureCollection();
        const perm = await requireSuperAdmin(request);
        if (!perm.allowed) return jsonErr('Super-admin access required', 403);

        const body  = await parseBody(request);
        const stage = parseInt(body.stage) || 1;
        if (![1, 2, 3].includes(stage)) return jsonErr('stage must be 1, 2, or 3');

        // Batch support: limit emails per call to stay within Wix timeout
        const batchSize   = Math.min(parseInt(body.batchSize) || 10, 15);  // max 15 per call
        const batchOffset = parseInt(body.batchOffset) || 0;

        const today = todayStr();

        // ── Build target email list for this stage ──────────────
        let targetEmails = [];

        if (stage === 1) {
            // Stage 1: super-admin / president only (for email template review)
            targetEmails = [PRESIDENT_EMAIL];

        } else if (stage === 2) {
            // Stage 2: all active AdminRoles (EC members)
            const rolesRes = await wixData.query('AdminRoles').eq('isActive', true).limit(200).find(SA);
            targetEmails = rolesRes.items.map(r => r.email.toLowerCase()).filter(Boolean);
            // Deduplicate
            targetEmails = [...new Set(targetEmails)];

        } else if (stage === 3) {
            // Stage 3: all CRMMembers not covered by stages 1-2
            const rolesRes  = await wixData.query('AdminRoles').eq('isActive', true).limit(200).find(SA);
            const adminSet  = new Set(rolesRes.items.map(r => r.email.toLowerCase()));

            // Paginate CRMMembers to get ALL active adults (not just first 500)
            // Do NOT filter emailOptIn in Wix query — Wix .ne() does not match
            // records where the field is undefined/missing.  Filter in JS instead.
            let allMembers = [];
            let skip = 0;
            while (true) {
                const batch = await wixData.query('CRMMembers')
                    .eq('isAdult', true).eq('isActive', true)
                    .skip(skip).limit(500).find(SA);
                allMembers = allMembers.concat(batch.items);
                if (batch.items.length < 500) break;
                skip += 500;
            }
            // Exclude members who explicitly opted out (emailOptIn === false)
            allMembers = allMembers.filter(m => m.emailOptIn !== false);
            const nonAdminEmails = allMembers
                .map(m => (m.email || '').toLowerCase())
                .filter(e => e && !adminSet.has(e));
            targetEmails = [...new Set(nonAdminEmails)];
        }

        // ── Filter out: already sent (pending/corrected/declined) ─────
        // Fetch ALL existing tokens to avoid duplicate sends
        let allTokenItems = [];
        let tokenSkip = 0;
        while (true) {
            const batch = await wixData.query(COLLECTION).skip(tokenSkip).limit(1000).find(SA);
            allTokenItems = allTokenItems.concat(batch.items);
            if (batch.items.length < 1000) break;
            tokenSkip += 1000;
        }
        const alreadySentEmails = new Set(allTokenItems
            .filter(i => i.status === 'pending' || i.status === 'corrected' || i.status === 'declined')
            .map(i => (i.email || '').toLowerCase()));

        // Remove already-sent from targets BEFORE batching
        const filteredTargets = targetEmails.filter(e => !alreadySentEmails.has(e));
        const totalEligible   = filteredTargets.length;
        const skippedDupes    = targetEmails.length - totalEligible;

        // Apply batch window
        const batchTargets = filteredTargets.slice(batchOffset, batchOffset + batchSize);

        const results = { sent: 0, skipped_already_sent: skippedDupes, skipped_opted_out: 0, failed: 0, emails: [] };

        for (const email of batchTargets) {

            // Get member display name
            const { member, familyAdults, familyKids } = await getMemberAndFamily(email);
            const displayName = member
                ? `${member.firstName} ${member.lastName}`.trim()
                : email.split('@')[0];

            // Check email opt-in (for stage 3 only)
            if (stage === 3 && member && member.emailOptIn === false) {
                results.skipped_opted_out++;
                results.emails.push({ email, status: 'skipped_opted_out' });
                continue;
            }

            // Generate token and store
            const token = generateToken();
            const tokenRecord = {
                token,
                email,
                memberId:  member ? member.memberId : '',
                familyId:  member ? member.familyId : '',
                stage,
                status:    'pending',
                sentAt:    new Date().toISOString(),
                correctedOn: null,
                declinedOn:  null,
                isTestMode: TEST_MODE
            };
            await wixData.insert(COLLECTION, tokenRecord, SA);

            // Build form URL and send email
            // User sees this Wix URL in the email. The function redirects to
            // GitHub Pages which fetches comms_form_html and renders the form.
            const formUrl = `${WIX_SITE}/_functions/comms_correction_form?token=${token}`;
            const html    = buildCorrectionEmail(displayName, formUrl);
            const sendRes = await sendGmail(
                email, displayName,
                `[BANF] Please verify your communication details`,
                html
            );

            if (sendRes.ok) {
                results.sent++;
                results.emails.push({
                    email,
                    status: 'sent',
                    token,
                    formUrl,
                    redirected: sendRes.redirected,
                    testMode: TEST_MODE
                });
            } else {
                results.failed++;
                results.emails.push({ email, status: 'failed', error: sendRes.error });
                // Clean up the token we just created if email failed
                try {
                    const cleanup = await wixData.query(COLLECTION).eq('token', token).find(SA);
                    if (cleanup.items.length) {
                        await wixData.remove(COLLECTION, cleanup.items[0]._id, SA);
                    }
                } catch (_) {}
            }
        }

        return jsonOk({
            stage,
            targetCount: targetEmails.length,
            totalEligible,
            batchOffset,
            batchSize,
            batchSent: batchTargets.length,
            hasMore: (batchOffset + batchSize) < totalEligible,
            nextOffset: batchOffset + batchSize,
            results
        });
    } catch (e) { return jsonErr(`Launch error: ${e.message}`, 500); }
}
export function options_comms_correction_launch(request) { return handleCors(); }

// ─────────────────────────────────────────
// ENDPOINT: GET /comms_correction_status
// Admin: summary of sent / corrected / pending
// ─────────────────────────────────────────
export async function get_comms_correction_status(request) {
    try {
        await ensureCollection();
        const perm = await requireAdmin(request);
        if (!perm.allowed) return jsonErr('Admin access required', 403);

        const all    = await wixData.query(COLLECTION).limit(500).find(SA);
        const items  = all.items;
        const today  = todayStr();

        const stats = {
            total:           items.length,
            pending:         items.filter(i => i.status === 'pending').length,
            corrected:       items.filter(i => i.status === 'corrected').length,
            declined:        items.filter(i => i.status === 'declined').length,
            correctedToday:  items.filter(i => i.correctedOn === today).length,
            byStage: { 1: 0, 2: 0, 3: 0 }
        };
        items.forEach(i => { if (i.stage >= 1 && i.stage <= 3) stats.byStage[i.stage]++; });

        const recent = items
            .sort((a, b) => new Date(b.sentAt) - new Date(a.sentAt))
            .slice(0, 20)
            .map(i => ({
                email: i.email, stage: i.stage, status: i.status,
                sentAt: i.sentAt, correctedOn: i.correctedOn, declinedOn: i.declinedOn
            }));

        return jsonOk({ stats, recent });
    } catch (e) { return jsonErr(`Status error: ${e.message}`, 500); }
}
export function options_comms_correction_status(request) { return handleCors(); }

// ─────────────────────────────────────────
// ENDPOINT: GET /comms_correction_form?token=XYZ
// Public: 302 redirect to GitHub Pages loader which fetches the form HTML.
// ─────────────────────────────────────────
export function get_comms_correction_form(request) {
    if (!COMMS_LAUNCHED) {
        return httpResponse({ status: 302, headers: { 'Location': WIX_SITE, 'Cache-Control': 'no-store' }, body: '' });
    }
    const params = request.query || {};
    const token  = params.token || '';
    const dest   = `https://www.jaxbengali.org/comms-form.html${token ? '?token=' + encodeURIComponent(token) : ''}`;
    return httpResponse({
        status: 302,
        headers: { 'Location': dest, 'Cache-Control': 'no-store', 'Access-Control-Allow-Origin': '*' },
        body: ''
    });
}
export function options_comms_correction_form(request) { return handleCors(); }

// ─────────────────────────────────────────
// ENDPOINT: GET /comms_form_html?token=XYZ
// Called by comms-form.html JS (not by users directly).
// Serves the actual form HTML body.  Tracks form opens.
// ─────────────────────────────────────────
export async function get_comms_form_html(request) {
    try {
        await ensureCollection();
        const params = request.query || {};
        const token  = params.token || '';
        const cors   = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' };
        const htmlOk = (body) => httpResponse({ status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8', ...cors }, body });

        if (!COMMS_LAUNCHED) return htmlOk(errorHtml('Not available', 'This feature is not yet available. Please check back later.'));
        if (!token) return htmlOk(errorHtml('Missing token', 'The link you followed is invalid or incomplete.'));

        const tokenData = await findToken(token);
        if (!tokenData) return htmlOk(errorHtml('Invalid link', 'This verification link is invalid or has expired. Please contact BANF at ' + BANF_EMAIL));

        if (tokenData.status === 'corrected') return htmlOk(alreadyDoneHtml('Already verified', 'Your details have already been updated. Thank you!'));
        if (tokenData.status === 'declined')  return htmlOk(alreadyDoneHtml('Already responded', 'You have already declined this request. No changes were made to your record.'));

        const sentAt   = new Date(tokenData.sentAt);
        const diffDays = (Date.now() - sentAt.getTime()) / 86400000;
        if (diffDays > 14) return htmlOk(errorHtml('Link expired', 'This verification link expired 14 days after it was sent. Please contact BANF if you still need to update your details.'));

        // ── Track form open ─────────────────────────────────────
        const openUpdate = {
            ...tokenData,
            formOpenedAt:    tokenData.formOpenedAt || new Date().toISOString(),
            formOpenedCount: (tokenData.formOpenedCount || 0) + 1
        };
        wixData.update(COLLECTION, openUpdate, SA).catch(() => {});

        const { member, familyAdults, familyKids } = await getMemberAndFamily(tokenData.email);
        const memberData = member || { firstName: '', lastName: '', phone: '', email: tokenData.email, alternateEmail: '', emailOptIn: true };
        const html = buildFormHtml(tokenData, memberData, familyAdults, familyKids);
        return htmlOk(html);
    } catch (e) {
        return httpResponse({ status: 500, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Access-Control-Allow-Origin': '*' }, body: errorHtml('Server error', e.message) });
    }
}
export function options_comms_form_html(request) { return handleCors(); }

// ─────────────────────────────────────────
// ENDPOINT: GET /comms_form_data?token=XYZ
// Called by comms-form.html JS. Returns JSON data only (no HTML).
// Wix correctly serves JSON — no Content-Type issues.
// ─────────────────────────────────────────
export async function get_comms_form_data(request) {
    try {
        await ensureCollection();
        const params = request.query || {};
        const token  = params.token || '';

        if (!COMMS_LAUNCHED) return jsonErr('This feature is not yet available. Please check back later.');
        if (!token) return jsonErr('The link you followed is invalid or incomplete.');

        const tokenData = await findToken(token);
        if (!tokenData) return jsonErr('This verification link is invalid or has expired.');

        if (tokenData.status === 'corrected') return jsonOk({ screen: 'done', title: 'Already verified', msg: 'Your details have already been updated. Thank you!' });
        if (tokenData.status === 'declined')  return jsonOk({ screen: 'done', title: 'Already responded', msg: 'You have already declined this request. No changes were made.' });

        const sentAt   = new Date(tokenData.sentAt);
        const diffDays = (Date.now() - sentAt.getTime()) / 86400000;
        if (diffDays > 14) return jsonErr('This verification link expired 14 days after it was sent.');

        // Track form open
        const openUpdate = {
            ...tokenData,
            formOpenedAt:    tokenData.formOpenedAt || new Date().toISOString(),
            formOpenedCount: (tokenData.formOpenedCount || 0) + 1
        };
        wixData.update(COLLECTION, openUpdate, SA).catch(() => {});

        const { member } = await getMemberAndFamily(tokenData.email);
        const m = member || { firstName: '', lastName: '', phone: '', email: tokenData.email, alternateEmail: '', emailOptIn: true, nickname: '' };

        // Don't pre-populate family members — CRM data is unreliable.
        // Let users provide their own spouse/kids from scratch.
        return jsonOk({
            screen: 'form',
            token: tokenData.token,
            member: {
                firstName:  m.firstName || '',
                lastName:   m.lastName || '',
                nickname:   m.nickname || '',
                phone:      m.phone || '',
                email:      m.alternateEmail || m.email || '',
                emailOptIn: m.emailOptIn !== false
            },
            adults: [],   // intentionally empty — user adds their own
            kids:   []    // intentionally empty — user adds their own
        });
    } catch (e) { return jsonErr(`Server error: ${e.message}`, 500); }
}
export function options_comms_form_data(request) { return handleCors(); }

// ─────────────────────────────────────────
// ENDPOINT: POST /comms_correction_submit
// Public: save the corrected data
// Body: { token, firstName, lastName, phone, preferredEmail, emailOptIn, otherAdults[], kids[] }
// ─────────────────────────────────────────
export async function post_comms_correction_submit(request) {
    try {
        await ensureCollection();
        const body  = await parseBody(request);
        const { token } = body;
        if (!token) return jsonErr('token required');

        const tokenData = await findToken(token);
        if (!tokenData) return jsonErr('Invalid or expired token');
        if (tokenData.status === 'corrected') return jsonOk({ alreadyCorrected: true });
        if (tokenData.status === 'declined')  return jsonErr('This token has been declined');

        const today = todayStr();

        // ── Update CRMMembers record ────────────────────────────
        const { member, familyKids, familyAdults } = await getMemberAndFamily(tokenData.email);
        // noFutureEmail overrides emailOptIn — user wants no email of any kind ever
        const effectiveOptIn = body.noFutureEmail === true ? false
            : (body.emailOptIn !== undefined ? body.emailOptIn : (member ? member.emailOptIn : true));
        if (member && member._id) {
            const update = {
                ...member,
                firstName:      body.firstName || member.firstName,
                lastName:       body.lastName  || member.lastName,
                displayName:    `${body.firstName || member.firstName} ${body.lastName || member.lastName}`.trim(),
                nickname:       body.nickname !== undefined ? body.nickname : (member.nickname || ''),
                phone:          body.phone          !== undefined ? body.phone          : member.phone,
                alternateEmail: body.preferredEmail !== undefined ? body.preferredEmail : member.alternateEmail,
                emailOptIn:     effectiveOptIn,
                noFutureEmail:  body.noFutureEmail === true,
                detailsCorrectedOn: today,
                lastUpdated:    new Date().toISOString()
            };
            await wixData.update('CRMMembers', update, SA);
        }

        // ── Helper: find best match in list by memberId then first-name fallback ──
        const findMatch = (submitted, list) => {
            if (submitted.memberId) {
                const byId = list.find(x => x._id === submitted.memberId || x.memberId === submitted.memberId);
                if (byId) return byId;
            }
            const fn = (submitted.name || '').trim().split(' ')[0].toLowerCase();
            return fn ? list.find(x => (x.firstName || '').toLowerCase() === fn) || null : null;
        };

        // ── Update / track other adults ────────────────────────
        const pendingNewAdults     = [];
        const pendingRemovedAdults = [];
        let   familyDataChanged    = false;
        if (member) {
            const submittedAdults = body.otherAdults || [];
            for (const submitted of submittedAdults) {
                if (!submitted.name) continue;
                const nameParts = submitted.name.trim().split(' ');
                const firstName = nameParts[0] || '';
                const lastName  = nameParts.slice(1).join(' ') || member.lastName || '';
                const existing  = findMatch(submitted, familyAdults);
                if (existing && existing._id) {
                    const nameChanged = firstName !== existing.firstName || lastName !== existing.lastName;
                    const relChanged  = submitted.relationship && submitted.relationship !== existing.relationship;
                    if (nameChanged || relChanged) familyDataChanged = true;
                    await wixData.update('CRMMembers', {
                        ...existing,
                        firstName,
                        lastName,
                        displayName:        submitted.name.trim(),
                        relationship:       submitted.relationship || existing.relationship,
                        detailsCorrectedOn: today
                    }, SA);
                } else {
                    pendingNewAdults.push(submitted);
                }
            }
            // Detect removed adults
            for (const existing of familyAdults) {
                const existingName = (existing.firstName + ' ' + existing.lastName).trim().toLowerCase();
                const stillPresent = submittedAdults.some(a =>
                    (a.memberId && (a.memberId === existing._id || a.memberId === existing.memberId)) ||
                    (a.name || '').trim().toLowerCase() === existingName);
                if (!stillPresent) pendingRemovedAdults.push({ memberId: existing._id, name: existingName });
            }
        }

        // ── Update / track kids ────────────────────────────────
        const pendingNewKids     = [];
        const pendingRemovedKids = [];
        if (body.kids && member) {
            const submittedKids = body.kids;
            for (const kid of submittedKids) {
                if (!kid.name) continue;
                const nameParts = kid.name.trim().split(' ');
                const firstName = nameParts[0] || '';
                const lastName  = nameParts.slice(1).join(' ') || member.lastName || '';
                const existing  = findMatch(kid, familyKids);
                if (existing && existing._id) {
                    const nameChanged = firstName !== existing.firstName || lastName !== existing.lastName;
                    const ageChanged  = kid.age != null && kid.age !== existing.reportedAge;
                    if (nameChanged || ageChanged) familyDataChanged = true;
                    await wixData.update('CRMMembers', {
                        ...existing,
                        firstName,
                        lastName,
                        displayName:        kid.name.trim(),
                        reportedAge:        kid.age || null,
                        reportedAgeAsOf:    today,
                        detailsCorrectedOn: today
                    }, SA);
                } else {
                    pendingNewKids.push(kid);
                }
            }
            // Detect removed kids
            for (const existing of familyKids) {
                const existingName = (existing.firstName + ' ' + existing.lastName).trim().toLowerCase();
                const stillPresent = submittedKids.some(k =>
                    (k.memberId && (k.memberId === existing._id || k.memberId === existing.memberId)) ||
                    (k.name || '').trim().toLowerCase() === existingName);
                if (!stillPresent) pendingRemovedKids.push({ memberId: existing._id, name: existingName });
            }
        }

        // ── Detect whether any fields were changed ───────────────
        let hasChanges = false;
        if (member) {
            if ((body.firstName   || '') !== (member.firstName   || '')) hasChanges = true;
            if ((body.lastName    || '') !== (member.lastName    || '')) hasChanges = true;
            if ((body.phone       || '') !== (member.phone       || '')) hasChanges = true;
            if ((body.nickname    || '') !== (member.nickname    || '')) hasChanges = true;
            const origEmail = member.alternateEmail || member.email || '';
            if ((body.preferredEmail || '') !== origEmail)              hasChanges = true;
            if (effectiveOptIn !== (member.emailOptIn !== false))       hasChanges = true;
            if (body.noFutureEmail === true)                            hasChanges = true;
        }

        // Also flag hasChanges if family data was amended
        if (familyDataChanged ||
            pendingNewAdults.length || pendingRemovedAdults.length ||
            pendingNewKids.length   || pendingRemovedKids.length)   hasChanges = true;

        // ── Mark token as corrected ─────────────────────────────
        const tokenUpdate = {
            ...tokenData,
            status:      'corrected',
            correctedOn: today,
            hasChanges,
            submittedData: JSON.stringify({
                firstName:      body.firstName,
                lastName:       body.lastName,
                nickname:       body.nickname || '',
                phone:          body.phone,
                preferredEmail: body.preferredEmail,
                emailOptIn:     effectiveOptIn,
                noFutureEmail:  body.noFutureEmail === true,
                hasChanges,
                otherAdults:    body.otherAdults || [],
                kids:           body.kids || []
            }),
            // Admin-review queues — items requiring human verification before DB changes
            pendingNewAdults:     pendingNewAdults.length     ? JSON.stringify(pendingNewAdults)     : null,
            pendingRemovedAdults: pendingRemovedAdults.length ? JSON.stringify(pendingRemovedAdults) : null,
            pendingNewKids:       pendingNewKids.length       ? JSON.stringify(pendingNewKids)       : null,
            pendingRemovedKids:   pendingRemovedKids.length   ? JSON.stringify(pendingRemovedKids)   : null
        };
        await wixData.update(COLLECTION, tokenUpdate, SA);

        return jsonOk({ corrected: true, correctedOn: today, noFutureEmail: body.noFutureEmail === true, hasChanges });
    } catch (e) { return jsonErr(`Submit error: ${e.message}`, 500); }
}
export function options_comms_correction_submit(request) { return handleCors(); }

// ─────────────────────────────────────────
// ENDPOINT: POST /comms_correction_decline
// Public: member declines to modify
// Body: { token }
// ─────────────────────────────────────────
export async function post_comms_correction_decline(request) {
    try {
        await ensureCollection();
        const body      = await parseBody(request);
        const { token } = body;
        if (!token) return jsonErr('token required');

        const tokenData = await findToken(token);
        if (!tokenData) return jsonErr('Invalid or expired token');
        if (tokenData.status === 'declined')  return jsonOk({ alreadyDeclined: true });
        if (tokenData.status === 'corrected') return jsonErr('Token already corrected');

        const tokenUpdate = {
            ...tokenData,
            status:     'declined',
            declinedOn: todayStr()
        };
        await wixData.update(COLLECTION, tokenUpdate, SA);
        return jsonOk({ declined: true });
    } catch (e) { return jsonErr(`Decline error: ${e.message}`, 500); }
}
export function options_comms_correction_decline(request) { return handleCors(); }

// ─────────────────────────────────────────
// ENDPOINT: POST /comms_correction_reset_test
// Super-admin: wipe test tokens
// Body: { emails?: [], deleteAll?: bool }
// ─────────────────────────────────────────
export async function post_comms_correction_reset_test(request) {
    try {
        await ensureCollection();
        const perm = await requireSuperAdmin(request);
        if (!perm.allowed) return jsonErr('Super-admin access required', 403);

        const body           = await parseBody(request);
        const emails         = (body.emails || []).map(e => e.toLowerCase());
        const testPattern    = body.testPattern || '.test@gmail.com';
        const deleteAll      = body.deleteAll === true;

        const all = await wixData.query(COLLECTION).limit(500).find(SA);
        const toDelete = all.items.filter(r => {
            if (deleteAll) return true;
            const em = (r.email || '').toLowerCase();
            return em.endsWith(testPattern) || emails.includes(em);
        });
        for (const r of toDelete) {
            await wixData.remove(COLLECTION, r._id, SA);
        }
        return jsonOk({ deleted: toDelete.length, emails: toDelete.map(r => r.email) });
    } catch (e) { return jsonErr(`Reset error: ${e.message}`, 500); }
}
export function options_comms_correction_reset_test(request) { return handleCors(); }

// ─────────────────────────────────────────
// ENDPOINT: GET /comms_correction_dashboard
// Admin: 302 redirect to the live dashboard on GitHub Pages
// ─────────────────────────────────────────
export function get_comms_correction_dashboard(request) {
    return httpResponse({
        status: 302,
        headers: { 'Location': 'https://www.jaxbengali.org/comms-dashboard.html', 'Cache-Control': 'no-store', 'Access-Control-Allow-Origin': '*' },
        body: ''
    });
}
export function options_comms_correction_dashboard(request) { return handleCors(); }

// ─────────────────────────────────────────
// ENDPOINT: GET /comms_dashboard_data
// Admin: full drill-down data for the dashboard
// ─────────────────────────────────────────
export async function get_comms_dashboard_data(request) {
    try {
        await ensureCollection();
        const perm = await requireAdmin(request);
        if (!perm.allowed) return jsonErr('Admin access required', 403);

        const all   = await wixData.query(COLLECTION).limit(1000).find(SA);
        const items = all.items;
        const today = todayStr();

        // ── Summary stats ───────────────────────────────────────
        const totalSent      = items.length;
        const pending        = items.filter(i => i.status === 'pending');
        const corrected      = items.filter(i => i.status === 'corrected');
        const declined       = items.filter(i => i.status === 'declined');
        const opened         = items.filter(i => i.formOpenedAt);
        const approvedNoChg  = corrected.filter(i => i.hasChanges === false);
        const approvedWithChg= corrected.filter(i => i.hasChanges === true);
        const optedOut       = items.filter(i => { try { const d = JSON.parse(i.submittedData || '{}'); return d.noFutureEmail; } catch (_) { return false; } });

        const stats = {
            totalSent,
            pending:          pending.length,
            corrected:        corrected.length,
            declined:         declined.length,
            formOpened:       opened.length,
            approvedNoChange: approvedNoChg.length,
            approvedWithChange: approvedWithChg.length,
            optedOut:         optedOut.length,
            byStage: { 1: items.filter(i=>i.stage===1).length, 2: items.filter(i=>i.stage===2).length, 3: items.filter(i=>i.stage===3).length },
            responseRate: totalSent ? Math.round(((corrected.length + declined.length) / totalSent) * 100) : 0,
            lastUpdated: new Date().toISOString()
        };

        // ── Drill-down rows ─────────────────────────────────────
        const drillDown = items
            .sort((a, b) => new Date(b.sentAt) - new Date(a.sentAt))
            .map(i => {
                let submitted = {};
                try { submitted = JSON.parse(i.submittedData || '{}'); } catch (_) {}
                return {
                    email:         i.email,
                    stage:         i.stage,
                    status:        i.status,
                    sentAt:        i.sentAt,
                    formOpenedAt:  i.formOpenedAt || null,
                    formOpenedCount: i.formOpenedCount || 0,
                    correctedOn:   i.correctedOn   || null,
                    declinedOn:    i.declinedOn    || null,
                    hasChanges:    i.hasChanges    !== undefined ? i.hasChanges : null,
                    noFutureEmail: submitted.noFutureEmail || false,
                    firstName:     submitted.firstName  || '',
                    lastName:      submitted.lastName   || '',
                    phone:         submitted.phone      || '',
                    preferredEmail: submitted.preferredEmail || ''
                };
            });

        return jsonOk({ stats, drillDown });
    } catch (e) { return jsonErr(`Dashboard data error: ${e.message}`, 500); }
}
export function options_comms_dashboard_data(request) { return handleCors(); }

// ═══════════════════════════════════════════════════════════════
// FAMILY UNIVERSE: Gmail Sent-Item Scan + CRM Cross-Reference
// ═══════════════════════════════════════════════════════════════

/**
 * GET /comms_family_universe
 * Super-admin endpoint.
 * Scans Gmail sent items for mass emails (≥minRecipients), extracts unique
 * email addresses, cross-references each with CRMMembers + FamilyGroups,
 * and returns a comprehensive JSON payload for Excel generation.
 *
 * Query params:
 *   minRecipients  — minimum # of recipients for a sent email to count (default 5)
 *   maxMessages    — max Gmail messages to scan (default 200)
 *   mode           — 'gmail' (scan Gmail sent) | 'crm' (all CRM adults) | 'both' (union)
 */
export async function get_comms_family_universe(request) {
    try {
        const perm = await requireSuperAdmin(request);
        if (!perm.allowed) return jsonErr('Super-admin access required', 403);

        const params         = request.query || {};
        const minRecipients  = parseInt(params.minRecipients) || 5;
        const maxMessages    = parseInt(params.maxMessages)   || 200;
        const mode           = (params.mode || 'both').toLowerCase();

        const allEmails = new Set();

        // ── PART A: Scan Gmail sent items ────────────────────────
        let gmailStats = { messagesScanned: 0, massEmails: 0, error: null };
        if (mode === 'gmail' || mode === 'both') {
            try {
                const accessToken = await getGmailAccessToken();
                // Search for sent messages
                let pageToken = null;
                let scanned = 0;
                const messageIds = [];

                while (scanned < maxMessages) {
                    const fetchSize = Math.min(100, maxMessages - scanned);
                    let url = `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=in:sent&maxResults=${fetchSize}`;
                    if (pageToken) url += `&pageToken=${pageToken}`;

                    const listRes = await wixFetch(url, {
                        method: 'GET',
                        headers: { 'Authorization': `Bearer ${accessToken}` }
                    });
                    const listData = await listRes.json();
                    if (!listData.messages || !listData.messages.length) break;

                    messageIds.push(...listData.messages.map(m => m.id));
                    scanned += listData.messages.length;
                    pageToken = listData.nextPageToken;
                    if (!pageToken) break;
                }
                gmailStats.messagesScanned = messageIds.length;

                // Fetch each message's headers (To, CC, BCC) — batch in groups of 10
                for (let i = 0; i < messageIds.length; i += 10) {
                    const batch = messageIds.slice(i, i + 10);
                    const fetches = batch.map(id =>
                        wixFetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}?format=metadata&metadataHeaders=To&metadataHeaders=Cc&metadataHeaders=Bcc`, {
                            method: 'GET',
                            headers: { 'Authorization': `Bearer ${accessToken}` }
                        }).then(r => r.json()).catch(() => null)
                    );
                    const msgs = await Promise.all(fetches);

                    for (const msg of msgs) {
                        if (!msg || !msg.payload || !msg.payload.headers) continue;
                        const recipientEmails = [];
                        for (const h of msg.payload.headers) {
                            if (['to', 'cc', 'bcc'].includes(h.name.toLowerCase())) {
                                recipientEmails.push(...extractEmails(h.value));
                            }
                        }
                        if (recipientEmails.length >= minRecipients) {
                            gmailStats.massEmails++;
                            for (const e of recipientEmails) allEmails.add(e);
                        }
                    }
                }
            } catch (gmailErr) {
                gmailStats.error = gmailErr.message;
            }
        }

        // ── PART B: All CRM adult members ────────────────────────
        let crmAdultCount = 0;
        if (mode === 'crm' || mode === 'both') {
            let skip = 0;
            const PAGE = 500;
            while (true) {
                const res = await wixData.query('CRMMembers')
                    .eq('isAdult', true).eq('isActive', true)
                    .limit(PAGE).skip(skip).find(SA);
                for (const m of res.items) {
                    if (m.email) allEmails.add(m.email.toLowerCase().trim());
                }
                crmAdultCount += res.items.length;
                if (res.items.length < PAGE) break;
                skip += PAGE;
            }
        }

        // ── PART C: Cross-reference each email with CRM ─────────
        const familyCache = {};   // familyId → { familyGroup, members[] }
        const universe    = [];

        for (const email of allEmails) {
            // Find member record
            const mRes = await wixData.query('CRMMembers')
                .eq('email', email).eq('isActive', true).limit(1).find(SA);
            const member = mRes.items[0] || null;

            const row = {
                email,
                inCRM:          !!member,
                memberId:       member ? (member.memberId || member._id) : '',
                firstName:      member ? (member.firstName || '') : '',
                lastName:       member ? (member.lastName || '') : '',
                displayName:    member ? (member.displayName || '') : '',
                phone:          member ? (member.phone || '') : '',
                gender:         member ? (member.gender || '') : '',
                dateOfBirth:    member ? (member.dateOfBirth || '') : '',
                isAdult:        member ? (member.isAdult !== false) : true,
                isECMember:     member ? (member.isECMember || false) : false,
                emailOptIn:     member ? (member.emailOptIn !== false) : true,
                familyId:       member ? (member.familyId || '') : '',
                relationship:   member ? (member.relationship || '') : '',
                city:           member ? (member.city || '') : '',
                state:          member ? (member.state || '') : '',
                address:        member ? (member.address || '') : '',
                correctionStatus: 'not_checked',
                // Family details filled below
                spouseName:     '',
                spouseEmail:    '',
                spousePhone:    '',
                child1Name:     '', child1Age: '',
                child2Name:     '', child2Age: '',
                child3Name:     '', child3Age: '',
                child4Name:     '', child4Age: '',
                otherAdults:    ''   // comma-separated "Name (relationship)"
            };

            // Get family details if member has a familyId
            if (member && member.familyId) {
                let famData = familyCache[member.familyId];
                if (!famData) {
                    const fRes = await wixData.query('FamilyGroups')
                        .eq('familyId', member.familyId).limit(1).find(SA);
                    const famMembers = await wixData.query('CRMMembers')
                        .eq('familyId', member.familyId).eq('isActive', true).limit(50).find(SA);
                    famData = {
                        familyGroup: fRes.items[0] || null,
                        members: famMembers.items
                    };
                    familyCache[member.familyId] = famData;
                }

                const meId = (member.memberId || member._id || '').toLowerCase();
                const adults = famData.members.filter(m =>
                    m.isAdult && (m.memberId || m._id || '').toLowerCase() !== meId);
                const kids   = famData.members.filter(m => !m.isAdult);

                // spouse = first adult with relationship containing spouse/partner/husband/wife, else first other adult
                const spouse = adults.find(a =>
                    /spouse|partner|husband|wife/i.test(a.relationship || '')) || adults[0];
                if (spouse) {
                    row.spouseName  = ((spouse.firstName || '') + ' ' + (spouse.lastName || '')).trim();
                    row.spouseEmail = spouse.email || '';
                    row.spousePhone = spouse.phone || '';
                }

                // Other adults (non-spouse)
                const otherAdults = adults.filter(a => a !== spouse);
                row.otherAdults = otherAdults
                    .map(a => `${(a.firstName || '')} ${(a.lastName || '')}`.trim() + (a.relationship ? ` (${a.relationship})` : ''))
                    .join('; ');

                // Kids (up to 4)
                for (let ki = 0; ki < Math.min(kids.length, 4); ki++) {
                    const k = kids[ki];
                    const kName = ((k.firstName || '') + ' ' + (k.lastName || '')).trim();
                    const kAge  = ageFromDob(k.dateOfBirth);
                    row[`child${ki + 1}Name`] = kName;
                    row[`child${ki + 1}Age`]  = kAge !== null ? kAge : '';
                }

                // Family group metadata
                if (famData.familyGroup) {
                    row.familyDisplayName  = famData.familyGroup.displayName || '';
                    row.familyType         = famData.familyGroup.familyType || '';
                    row.membershipStatus   = famData.familyGroup.membershipStatus || '';
                    row.membershipYear     = famData.familyGroup.membershipYear || '';
                    row.totalFamilyMembers = famData.familyGroup.totalMembers || famData.members.length;
                }
            }

            // Check correction status
            const corrRes = await wixData.query(COLLECTION)
                .eq('email', email).descending('sentAt').limit(1).find(SA);
            if (corrRes.items.length) {
                const ct = corrRes.items[0];
                row.correctionStatus = ct.status || 'pending';
                row.correctionSentAt = ct.sentAt || '';
                row.correctedOn      = ct.correctedOn || '';
            }

            universe.push(row);
        }

        // Sort: CRM members first, then by lastName
        universe.sort((a, b) => {
            if (a.inCRM !== b.inCRM) return a.inCRM ? -1 : 1;
            return (a.lastName || '').localeCompare(b.lastName || '') || (a.firstName || '').localeCompare(b.firstName || '');
        });

        return jsonOk({
            stats: {
                totalUniqueEmails: allEmails.size,
                inCRM:             universe.filter(r => r.inCRM).length,
                notInCRM:          universe.filter(r => !r.inCRM).length,
                gmailStats,
                crmAdultCount,
                mode
            },
            universe
        });
    } catch (e) {
        return jsonErr(`Family universe error: ${e.message}`, 500);
    }
}
export function options_comms_family_universe(request) { return handleCors(); }

/**
 * Helper: Get fresh Gmail access token via OAuth2 refresh token
 */
async function getGmailAccessToken() {
    const tokenRes = await wixFetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `client_id=${GOOGLE_CLIENT_ID}&client_secret=${GOOGLE_CLIENT_SECRET}&refresh_token=${GOOGLE_REFRESH_TOKEN}&grant_type=refresh_token`
    });
    const tokenData = await tokenRes.json();
    if (!tokenData.access_token) throw new Error('Gmail OAuth failed: ' + JSON.stringify(tokenData));
    return tokenData.access_token;
}

/**
 * Helper: Extract email addresses from a header value like
 *   "Foo Bar <foo@bar.com>, baz@test.com, \"Name\" <n@m.com>"
 */
function extractEmails(headerValue) {
    if (!headerValue) return [];
    const emails = [];
    // Match email patterns: either <email> or bare email
    const regex = /<?([a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,})>?/g;
    let match;
    while ((match = regex.exec(headerValue)) !== null) {
        emails.push(match[1].toLowerCase().trim());
    }
    return emails;
}

/**
 * POST /comms_family_universe_update
 * Super-admin endpoint.
 * Accepts corrected family data from an Excel verification pass.
 * Body: { rows: [ { email, firstName, lastName, phone, gender, relationship,
 *                    spouseName, spouseEmail, spousePhone,
 *                    child1Name, child1Age, ..., action: 'update'|'skip'|'deactivate' } ] }
 */
export async function post_comms_family_universe_update(request) {
    try {
        const perm = await requireSuperAdmin(request);
        if (!perm.allowed) return jsonErr('Super-admin access required', 403);

        const body = await parseBody(request);
        const rows = body.rows || [];
        if (!rows.length) return jsonErr('No rows supplied');

        const results = { updated: 0, skipped: 0, deactivated: 0, errors: [], total: rows.length };

        for (const row of rows) {
            try {
                const action = (row.action || 'update').toLowerCase();
                if (action === 'skip') { results.skipped++; continue; }

                const email = (row.email || '').toLowerCase().trim();
                if (!email) { results.skipped++; continue; }

                // Find existing CRM record
                const mRes = await wixData.query('CRMMembers')
                    .eq('email', email).eq('isActive', true).limit(1).find(SA);
                const member = mRes.items[0];

                if (action === 'deactivate' && member) {
                    await wixData.update('CRMMembers', { ...member, isActive: false }, SA);
                    results.deactivated++;
                    continue;
                }

                if (!member) {
                    // Member not in CRM — skip for now (could auto-create later)
                    results.skipped++;
                    results.errors.push({ email, error: 'Not in CRM — skipped' });
                    continue;
                }

                // Build update object — only update fields that have values
                const update = { ...member };
                const fields = ['firstName', 'lastName', 'phone', 'gender', 'relationship',
                                'city', 'state', 'address', 'emailOptIn', 'dateOfBirth'];
                for (const f of fields) {
                    if (row[f] !== undefined && row[f] !== '') {
                        if (f === 'emailOptIn') {
                            update[f] = String(row[f]).toLowerCase() !== 'false' && row[f] !== false;
                        } else {
                            update[f] = row[f];
                        }
                    }
                }

                // Update displayName if first/last changed
                if (row.firstName || row.lastName) {
                    update.displayName = `${update.firstName || ''} ${update.lastName || ''}`.trim();
                }

                await wixData.update('CRMMembers', update, SA);
                results.updated++;

                // ── Handle spouse updates ────────────────────────
                if (row.spouseEmail && member.familyId) {
                    const spouseRes = await wixData.query('CRMMembers')
                        .eq('email', row.spouseEmail.toLowerCase().trim())
                        .eq('isActive', true).limit(1).find(SA);
                    if (spouseRes.items[0]) {
                        const sp = spouseRes.items[0];
                        const spUpdate = { ...sp };
                        if (row.spouseName) {
                            const parts = row.spouseName.trim().split(/\s+/);
                            spUpdate.firstName = parts[0] || sp.firstName;
                            spUpdate.lastName  = parts.slice(1).join(' ') || sp.lastName;
                            spUpdate.displayName = row.spouseName.trim();
                        }
                        if (row.spousePhone) spUpdate.phone = row.spousePhone;
                        await wixData.update('CRMMembers', spUpdate, SA);
                    }
                }

                // ── Handle child updates (up to 4) ──────────────
                if (member.familyId) {
                    const famRes = await wixData.query('CRMMembers')
                        .eq('familyId', member.familyId).eq('isAdult', false).eq('isActive', true).limit(20).find(SA);
                    const existingKids = famRes.items;

                    for (let ki = 1; ki <= 4; ki++) {
                        const childName = row[`child${ki}Name`];
                        const childAge  = row[`child${ki}Age`];
                        if (!childName) continue;

                        // Try to match to existing kid by first name
                        const nameParts  = childName.trim().split(/\s+/);
                        const childFirst = nameParts[0] || '';
                        const childLast  = nameParts.slice(1).join(' ') || member.lastName || '';

                        const existingKid = existingKids.find(k =>
                            (k.firstName || '').toLowerCase() === childFirst.toLowerCase());

                        if (existingKid) {
                            // Update existing kid
                            const kidUpdate = { ...existingKid };
                            kidUpdate.firstName   = childFirst;
                            kidUpdate.lastName    = childLast;
                            kidUpdate.displayName = childName.trim();
                            if (childAge !== '' && childAge !== undefined) {
                                // Convert age to approximate DOB
                                const approxYear = new Date().getFullYear() - parseInt(childAge);
                                kidUpdate.dateOfBirth = `${approxYear}-01-01`;
                            }
                            await wixData.update('CRMMembers', kidUpdate, SA);
                        }
                        // Note: not auto-creating new kids from Excel — that requires more care
                    }
                }
            } catch (rowErr) {
                results.errors.push({ email: row.email, error: rowErr.message });
            }
        }

        return jsonOk({ results });
    } catch (e) {
        return jsonErr(`Universe update error: ${e.message}`, 500);
    }
}
export function options_comms_family_universe_update(request) { return handleCors(); }

// ─────────────────────────────────────────
// SMALL HTML HELPERS
// ─────────────────────────────────────────
function errorHtml(title, msg) {
    return `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>BANF — ${title}</title>
<style>body{font-family:Arial,sans-serif;background:#f5f7fa;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0}
.box{background:#fff;border-radius:16px;padding:40px;max-width:480px;text-align:center;box-shadow:0 4px 20px rgba(0,0,0,.1)}
.icon{font-size:3rem;margin-bottom:16px}.h{color:#8B0000;margin:0 0 12px}.p{color:#666;line-height:1.7}</style></head>
<body><div class="box"><div class="icon">⚠️</div><h2 class="h">${title}</h2><p class="p">${msg}</p>
<p class="p"><small>Contact: <a href="mailto:banfjax@gmail.com" style="color:#DC143C">banfjax@gmail.com</a></small></p></div></body></html>`;
}
function alreadyDoneHtml(title, msg) {
    return `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>BANF — ${title}</title>
<style>body{font-family:Arial,sans-serif;background:#f5f7fa;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0}
.box{background:#fff;border-radius:16px;padding:40px;max-width:480px;text-align:center;box-shadow:0 4px 20px rgba(0,0,0,.1)}
.icon{font-size:3rem;margin-bottom:16px}.h{color:#2D2D2D;margin:0 0 12px}.p{color:#666;line-height:1.7}</style></head>
<body><div class="box"><div class="icon">✅</div><h2 class="h">${title}</h2><p class="p">${msg}</p>
<p class="p"><small>You may close this window.</small></p></div></body></html>`;
}
