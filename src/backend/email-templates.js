/**
 * ═══════════════════════════════════════════════════════════════
 *  EMAIL TEMPLATES MODULE v1.0
 *  DB-driven email templates stored in EmailTemplates collection.
 *  Super admin can view and edit templates via the admin portal.
 *
 *  Template variables use {{varName}} syntax.
 *  Conditional blocks: {{#if varName}}...{{/if varName}}
 *
 *  Available variables:
 *    {{firstName}}, {{lastName}}, {{email}}, {{phone}},
 *    {{roleLabel}}, {{ecTitle}}, {{portalUrl}},
 *    {{journeyUrl}},
 *    {{grantedBy}}, {{grantedAt}},
 *    {{membershipType}}, {{eventName}}, {{eventDate}},
 *    {{eventVenue}}, {{eventDescription}},
 *    {{amount}}, {{paymentDescription}}, {{paymentDate}}, {{paymentMethod}},
 *    {{membershipYear}}, {{renewalDeadline}}
 * ═══════════════════════════════════════════════════════════════
 */

import wixData from 'wix-data';

const SA = { suppressAuth: true };
const PORTAL_URL = 'https://www.jaxbengali.org/admin-portal.html';
const JOURNEY_URL = 'https://www.jaxbengali.org/stakeholder-requirements-journey.html';

// ─────────────────────────────────────────
// DEFAULT SEED TEMPLATES
// ─────────────────────────────────────────

const DEFAULT_TEMPLATES = [
    {
        templateId: 'role_welcome',
        name: 'Role Grant Welcome Email',
        description: 'Sent when a role is granted to an EC member, admin, or super admin',
        subject: 'BANF: You have been granted {{roleLabel}} access',
        bodyHtml: `<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,Helvetica,sans-serif">
<div style="max-width:580px;margin:32px auto;background:#fff;border-radius:10px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.1)">
  <div style="background:linear-gradient(135deg,#b91c1c,#7f1d1d);padding:28px 32px">
    <h1 style="color:#fff;margin:0;font-size:22px">&#x1F331; Bengali Association of NE Florida</h1>
    <p style="color:rgba(255,255,255,.75);margin:4px 0 0;font-size:13px">jaxbengali.org &nbsp;|&nbsp; banfjax@gmail.com</p>
  </div>
  <div style="padding:28px 32px">
    <h2 style="color:#1f2937;margin:0 0 16px">Welcome, {{firstName}}!</h2>
    <p style="color:#374151;margin:0 0 12px">You have been granted <strong>{{roleLabel}}</strong> access to the BANF Management Portal.</p>
    {{#if ecTitle}}<p style="margin:8px 0">Your designation: <strong style="color:#b91c1c">{{ecTitle}}</strong></p>{{/if ecTitle}}
    <p style="color:#374151;margin:12px 0">Click the button below to sign in with your email address&nbsp;<strong>{{email}}</strong>:</p>
    <div style="text-align:center;margin:24px 0">
      <a href="{{portalUrl}}"
         style="background:#b91c1c;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:15px;display:inline-block">
        Open Admin Portal &#x2192;
      </a>
            <a href="{{journeyUrl}}"
                 style="background:#fff;color:#b91c1c;border:2px solid #b91c1c;padding:10px 24px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:14px;display:inline-block;margin-left:10px">
                Open Requirements Journey
            </a>
    </div>
    <hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0">
    <p style="color:#9ca3af;font-size:12px;margin:0">Granted by: {{grantedBy}} &nbsp;&bull;&nbsp; {{grantedAt}}</p>
    <p style="color:#9ca3af;font-size:12px;margin:4px 0 0">If you did not expect this email, please contact banfjax@gmail.com</p>
  </div>
</div>
</body>
</html>`,
        variables: ['firstName', 'lastName', 'email', 'roleLabel', 'ecTitle', 'portalUrl', 'journeyUrl', 'grantedBy', 'grantedAt'],
        isActive: true
    },
    {
        templateId: 'member_welcome',
        name: 'New Member Welcome Email',
        description: 'Sent when a new member registers',
        subject: 'Welcome to BANF, {{firstName}}!',
        bodyHtml: `<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,Helvetica,sans-serif">
<div style="max-width:580px;margin:32px auto;background:#fff;border-radius:10px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.1)">
  <div style="background:linear-gradient(135deg,#b91c1c,#7f1d1d);padding:28px 32px">
    <h1 style="color:#fff;margin:0;font-size:22px">&#x1F331; Bengali Association of NE Florida</h1>
    <p style="color:rgba(255,255,255,.75);margin:4px 0 0;font-size:13px">jaxbengali.org &nbsp;|&nbsp; banfjax@gmail.com</p>
  </div>
  <div style="padding:28px 32px">
    <h2 style="color:#1f2937;margin:0 0 16px">Welcome to BANF, {{firstName}}!</h2>
    <p style="color:#374151;margin:0 0 12px">Thank you for joining the Bengali Association of North Florida. We are delighted to have you as a <strong>{{membershipType}}</strong> member.</p>
    <p style="color:#374151;margin:12px 0">Your membership grants you access to all BANF events, cultural programs, and community resources.</p>
    <hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0">
    <p style="color:#9ca3af;font-size:12px;margin:0">If you have any questions, contact us at banfjax@gmail.com</p>
  </div>
</div>
</body>
</html>`,
        variables: ['firstName', 'lastName', 'email', 'membershipType'],
        isActive: true
    },
    {
        templateId: 'event_invite',
        name: 'Event Invitation Email',
        description: 'Sent to invite members to an event',
        subject: 'BANF Invitation: {{eventName}} on {{eventDate}}',
        bodyHtml: `<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,Helvetica,sans-serif">
<div style="max-width:580px;margin:32px auto;background:#fff;border-radius:10px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.1)">
  <div style="background:linear-gradient(135deg,#b91c1c,#7f1d1d);padding:28px 32px">
    <h1 style="color:#fff;margin:0;font-size:22px">&#x1F331; Bengali Association of NE Florida</h1>
    <p style="color:rgba(255,255,255,.75);margin:4px 0 0;font-size:13px">jaxbengali.org &nbsp;|&nbsp; banfjax@gmail.com</p>
  </div>
  <div style="padding:28px 32px">
    <h2 style="color:#1f2937;margin:0 0 16px">You are invited, {{firstName}}!</h2>
    <p style="color:#374151;margin:0 0 12px">We cordially invite you to <strong>{{eventName}}</strong>.</p>
    <p style="color:#374151">&#x1F4C5; Date: <strong>{{eventDate}}</strong></p>
    <p style="color:#374151">&#x1F4CD; Venue: <strong>{{eventVenue}}</strong></p>
    <p style="color:#374151;margin-top:12px">{{eventDescription}}</p>
    <hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0">
    <p style="color:#9ca3af;font-size:12px;margin:0">Bengali Association of North Florida &bull; banfjax@gmail.com</p>
  </div>
</div>
</body>
</html>`,
        variables: ['firstName', 'lastName', 'email', 'eventName', 'eventDate', 'eventVenue', 'eventDescription'],
        isActive: true
    },
    {
        templateId: 'payment_receipt',
        name: 'Payment Receipt Email',
        description: 'Sent when a payment is confirmed',
        subject: 'BANF Payment Receipt — ${{amount}}',
        bodyHtml: `<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,Helvetica,sans-serif">
<div style="max-width:580px;margin:32px auto;background:#fff;border-radius:10px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.1)">
  <div style="background:linear-gradient(135deg,#b91c1c,#7f1d1d);padding:28px 32px">
    <h1 style="color:#fff;margin:0;font-size:22px">&#x1F331; Bengali Association of NE Florida</h1>
    <p style="color:rgba(255,255,255,.75);margin:4px 0 0;font-size:13px">jaxbengali.org &nbsp;|&nbsp; banfjax@gmail.com</p>
  </div>
  <div style="padding:28px 32px">
    <h2 style="color:#1f2937;margin:0 0 16px">Payment Confirmed!</h2>
    <p style="color:#374151;margin:0 0 12px">Dear {{firstName}}, your payment has been received and confirmed.</p>
    <table style="width:100%;border-collapse:collapse;margin:16px 0">
      <tr style="background:#f9fafb">
        <td style="padding:8px 12px;font-weight:bold;color:#6b7280;border:1px solid #e5e7eb">Amount</td>
        <td style="padding:8px 12px;font-weight:bold;color:#1f2937;border:1px solid #e5e7eb">\${{amount}}</td>
      </tr>
      <tr>
        <td style="padding:8px 12px;font-weight:bold;color:#6b7280;border:1px solid #e5e7eb">Description</td>
        <td style="padding:8px 12px;color:#1f2937;border:1px solid #e5e7eb">{{paymentDescription}}</td>
      </tr>
      <tr style="background:#f9fafb">
        <td style="padding:8px 12px;font-weight:bold;color:#6b7280;border:1px solid #e5e7eb">Date</td>
        <td style="padding:8px 12px;color:#1f2937;border:1px solid #e5e7eb">{{paymentDate}}</td>
      </tr>
      <tr>
        <td style="padding:8px 12px;font-weight:bold;color:#6b7280;border:1px solid #e5e7eb">Method</td>
        <td style="padding:8px 12px;color:#1f2937;border:1px solid #e5e7eb">{{paymentMethod}}</td>
      </tr>
    </table>
    <hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0">
    <p style="color:#9ca3af;font-size:12px;margin:0">Bengali Association of North Florida &bull; banfjax@gmail.com</p>
  </div>
</div>
</body>
</html>`,
        variables: ['firstName', 'lastName', 'email', 'amount', 'paymentDescription', 'paymentDate', 'paymentMethod'],
        isActive: true
    },
    {
        templateId: 'membership_renewal',
        name: 'Membership Renewal Reminder',
        description: 'Sent to remind members about upcoming membership renewal',
        subject: 'BANF Membership Renewal Reminder — {{membershipYear}}',
        bodyHtml: `<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,Helvetica,sans-serif">
<div style="max-width:580px;margin:32px auto;background:#fff;border-radius:10px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.1)">
  <div style="background:linear-gradient(135deg,#b91c1c,#7f1d1d);padding:28px 32px">
    <h1 style="color:#fff;margin:0;font-size:22px">&#x1F331; Bengali Association of NE Florida</h1>
    <p style="color:rgba(255,255,255,.75);margin:4px 0 0;font-size:13px">jaxbengali.org &nbsp;|&nbsp; banfjax@gmail.com</p>
  </div>
  <div style="padding:28px 32px">
    <h2 style="color:#1f2937;margin:0 0 16px">It is time to renew, {{firstName}}!</h2>
    <p style="color:#374151;margin:0 0 12px">Your BANF membership for <strong>{{membershipYear}}</strong> is due for renewal.</p>
    <p style="color:#374151;margin:12px 0">Current membership type: <strong>{{membershipType}}</strong></p>
    <p style="color:#374151;margin:12px 0">Renewal deadline: <strong>{{renewalDeadline}}</strong></p>
    <p style="color:#374151;margin:12px 0">We value your continued support of our community.</p>
    <hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0">
    <p style="color:#9ca3af;font-size:12px;margin:0">Bengali Association of North Florida &bull; banfjax@gmail.com</p>
  </div>
</div>
</body>
</html>`,
        variables: ['firstName', 'lastName', 'email', 'membershipType', 'membershipYear', 'renewalDeadline'],
        isActive: true
    }
];

// ─────────────────────────────────────────
// TEMPLATE RENDERING ENGINE
// ─────────────────────────────────────────

/**
 * Render a template string by substituting {{varName}} placeholders.
 * Supports {{#if varName}}content{{/if varName}} conditional blocks.
 * @param {string} template - HTML or subject string with {{varName}} placeholders
 * @param {Object} vars - Key-value map of variable values
 * @returns {string} - Rendered string
 */
export function renderTemplate(template, vars) {
    if (!template) return '';
    let result = template;

    // Process conditional blocks: {{#if varName}}content{{/if varName}}
    result = result.replace(/\{\{#if (\w+)\}\}([\s\S]*?)\{\{\/if \1\}\}/g, (match, varName, content) => {
        return (vars[varName] && vars[varName].toString().trim()) ? content : '';
    });

    // Process {{varName}} substitutions
    Object.keys(vars).forEach(key => {
        const re = new RegExp('\\{\\{' + key + '\\}\\}', 'g');
        result = result.replace(re, (vars[key] !== undefined && vars[key] !== null) ? String(vars[key]) : '');
    });

    // Remove any remaining unresolved placeholders (optional — keeps output clean)
    result = result.replace(/\{\{#if \w+\}\}[\s\S]*?\{\{\/if \w+\}\}/g, '');
    result = result.replace(/\{\{\w+\}\}/g, '');

    return result;
}

// ─────────────────────────────────────────
// MEMBER PROFILE LOOKUP
// ─────────────────────────────────────────

/**
 * Fetch member profile from the Members collection by email.
 * Falls back gracefully if the collection doesn't exist or member not found.
 * @param {string} email
 * @returns {Object|null} - Member document or null
 */
export async function getMemberProfile(email) {
    if (!email) return null;
    try {
        const lower = email.toLowerCase().trim();
        // Try lowercase match first
        const res = await wixData.query('Members').eq('email', lower).limit(1).find(SA);
        if (res.items && res.items.length > 0) return res.items[0];
        // Try exact match (in case stored with original casing)
        if (lower !== email.trim()) {
            const res2 = await wixData.query('Members').eq('email', email.trim()).limit(1).find(SA);
            if (res2.items && res2.items.length > 0) return res2.items[0];
        }
        return null;
    } catch (e) {
        console.warn('[email-templates] getMemberProfile error:', e.message);
        return null;
    }
}

// ─────────────────────────────────────────
// EMAIL TEMPLATES CRUD
// ─────────────────────────────────────────

/**
 * Ensure the EmailTemplates collection is seeded with all defaults.
 * Called lazily when needed.
 */
async function seedDefaultsIfEmpty() {
    try {
        for (const def of DEFAULT_TEMPLATES) {
            const existing = await wixData.query('EmailTemplates')
                .eq('templateId', def.templateId).limit(1).find(SA);
            if (!existing.items || existing.items.length === 0) {
                await wixData.insert('EmailTemplates', {
                    ...def,
                    variables: JSON.stringify(def.variables),
                    isActive: true
                }, SA);
            }
        }
    } catch (e) {
        console.warn('[email-templates] seedDefaultsIfEmpty error:', e.message);
    }
}

/**
 * List all email templates from DB, seeding defaults if none exist.
 * @returns {Array} - Array of template documents
 */
export async function listEmailTemplates() {
    try {
        const res = await wixData.query('EmailTemplates').ascending('templateId').limit(100).find(SA);
        if (res.items && res.items.length > 0) {
            return res.items.map(normalizeTemplate);
        }
        // None in DB — seed and return defaults
        await seedDefaultsIfEmpty();
        const res2 = await wixData.query('EmailTemplates').ascending('templateId').limit(100).find(SA);
        if (res2.items && res2.items.length > 0) return res2.items.map(normalizeTemplate);
        // Still empty (e.g. collection doesn't exist) — return defaults
        return DEFAULT_TEMPLATES;
    } catch (e) {
        console.warn('[email-templates] listEmailTemplates error:', e.message);
        return DEFAULT_TEMPLATES;
    }
}

/**
 * Get a single email template by templateId.
 * Falls back to the seeded default if DB doesn't have it.
 * @param {string} templateId
 * @returns {Object|null}
 */
export async function getEmailTemplate(templateId) {
    try {
        const res = await wixData.query('EmailTemplates')
            .eq('templateId', templateId).limit(1).find(SA);
        if (res.items && res.items.length > 0) return normalizeTemplate(res.items[0]);

        // Not in DB — seed it and return
        const def = DEFAULT_TEMPLATES.find(t => t.templateId === templateId);
        if (def) {
            try {
                await wixData.insert('EmailTemplates', {
                    ...def,
                    variables: JSON.stringify(def.variables),
                    isActive: true
                }, SA);
            } catch (_) {}
            return def;
        }
        return null;
    } catch (e) {
        console.warn('[email-templates] getEmailTemplate error:', e.message);
        // Return hard-coded default as ultimate fallback
        return DEFAULT_TEMPLATES.find(t => t.templateId === templateId) || null;
    }
}

/**
 * Save (upsert) an email template. Creates if new, updates if existing.
 * @param {Object} templateData - Must include templateId
 * @param {string} modifiedBy - Email of the admin saving the template
 */
export async function saveEmailTemplate(templateData, modifiedBy) {
    const { templateId } = templateData;
    if (!templateId) throw new Error('templateId is required');

    const variables = Array.isArray(templateData.variables)
        ? JSON.stringify(templateData.variables)
        : (typeof templateData.variables === 'string' ? templateData.variables : '[]');

    const payload = {
        ...templateData,
        variables,
        lastModifiedBy: modifiedBy || 'system',
        lastModified: new Date()
    };

    try {
        const res = await wixData.query('EmailTemplates')
            .eq('templateId', templateId).limit(1).find(SA);

        if (res.items && res.items.length > 0) {
            return normalizeTemplate(
                await wixData.update('EmailTemplates', { ...res.items[0], ...payload }, SA)
            );
        } else {
            return normalizeTemplate(
                await wixData.insert('EmailTemplates', payload, SA)
            );
        }
    } catch (e) {
        throw new Error('[email-templates] saveEmailTemplate: ' + e.message);
    }
}

// ─────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────

/**
 * Normalize a DB template document: parse variables JSON string back to array.
 */
function normalizeTemplate(doc) {
    if (!doc) return doc;
    let variables = doc.variables;
    if (typeof variables === 'string') {
        try { variables = JSON.parse(variables); } catch (_) { variables = []; }
    }
    return { ...doc, variables: variables || [] };
}

/**
 * Build a portal URL that pre-fills the recipient's email.
 * The admin-portal.html reads the ?email= query param on load.
 */
export function buildPortalUrl(email) {
    const base = PORTAL_URL;
    if (!email) return base;
    return `${base}?email=${encodeURIComponent(email)}`;
}

export function buildJourneyUrl() {
    return JOURNEY_URL;
}
