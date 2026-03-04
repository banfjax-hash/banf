/**
 * ═══════════════════════════════════════════════════════════════
 *  RBAC — Role-Based Access Control
 *  Roles: super_admin > admin > ec_member > member > guest
 *  Every API request must go through checkPermission()
 * ═══════════════════════════════════════════════════════════════
 */

import wixData from 'wix-data';
import { fetch as wixFetch } from 'wix-fetch';

const SA = { suppressAuth: true };
const WIX_API_KEY = 'IST.eyJraWQiOiJQb3pIX2FDMiIsImFsZyI6IlJTMjU2In0.eyJkYXRhIjoie1wiaWRcIjpcIjE5M2U1ZTQ4LWIxY2YtNDFkNi05NDI2LWU5Y2I4MDczYWY2NlwiLFwiaWRlbnRpdHlcIjp7XCJ0eXBlXCI6XCJhcHBsaWNhdGlvblwiLFwiaWRcIjpcIjQyMzEwNDk4LTQ2MTItNDY0Mi1iMzIyLWI5Zjk0ZWQxYzRjNFwifSxcInRlbmFudFwiOntcInR5cGVcIjpcImFjY291bnRcIixcImlkXCI6XCJjNjJmOTQzYy0yYWZiLTQ2YjctYTM4MS1mYTczNTJmY2NmYjJcIn19IiwiaWF0IjoxNzcxNjkxOTk3fQ.GVx8jeX6lw2qF3cTWQJX4hWVs_unIkBJAgywR_sbASHyJhs95w6euuWIRW5CfQ_PSZmCKHw6ma5IpQawGhR79hYUi46_49yAg9fCklP60iJJlPLKdLj6NtOVIoYoc-WsG8nOW_9qo1om08YA-Qh_5O-oZv6oRW2gk7C2eOF5E1pjt0CgmVIRK8z5HvVqlXYftO9NtaSfHh9vhSVPkxVU6jp1OJBsR_UdcdL6Rpiv-bJx0hKJJOfNJMc89oEBiCaAJ4No65-FsGouo2yIYUCsDAQTtBk9rWh3cH8_n-ts0WK57kdtXVKRqQ5g7ch5usUdFAUBTSaviGXpExj5VoTVKQ';
const BANF_EMAIL = 'banfjax@gmail.com';

// ─────────────────────────────────────────
// ROLE DEFINITIONS
// ─────────────────────────────────────────

export const ROLES = {
    SUPER_ADMIN: 'super_admin',
    ADMIN: 'admin',
    EC_MEMBER: 'ec_member',
    MEMBER: 'member',
    GUEST: 'guest'
};

// Permission matrix: each permission → minimum role required
export const PERMISSIONS = {
    // Admin-only operations
    'admin:view':              [ROLES.EC_MEMBER, ROLES.ADMIN, ROLES.SUPER_ADMIN],
    'admin:manage_members':    [ROLES.ADMIN, ROLES.SUPER_ADMIN],
    'admin:manage_payments':   [ROLES.ADMIN, ROLES.SUPER_ADMIN],
    'admin:manage_vendors':    [ROLES.ADMIN, ROLES.SUPER_ADMIN],
    'admin:manage_sponsors':   [ROLES.ADMIN, ROLES.SUPER_ADMIN],
    'admin:manage_ads':        [ROLES.ADMIN, ROLES.SUPER_ADMIN],
    'admin:email_automation':  [ROLES.ADMIN, ROLES.SUPER_ADMIN],
    'admin:approve_responses': [ROLES.EC_MEMBER, ROLES.ADMIN, ROLES.SUPER_ADMIN],
    'admin:view_reports':      [ROLES.EC_MEMBER, ROLES.ADMIN, ROLES.SUPER_ADMIN],
    'admin:manage_kb':         [ROLES.ADMIN, ROLES.SUPER_ADMIN],
    'admin:manage_agents':     [ROLES.ADMIN, ROLES.SUPER_ADMIN],
    'admin:run_tests':         [ROLES.ADMIN, ROLES.SUPER_ADMIN],
    'admin:computer_agent':    [ROLES.SUPER_ADMIN],
    'admin:manage_roles':      [ROLES.SUPER_ADMIN],
    'admin:sync_gmail':        [ROLES.ADMIN, ROLES.SUPER_ADMIN],
    'admin:delete_data':       [ROLES.SUPER_ADMIN],

    // Member operations
    'member:view_own':         [ROLES.MEMBER, ROLES.EC_MEMBER, ROLES.ADMIN, ROLES.SUPER_ADMIN],
    'member:update_own':       [ROLES.MEMBER, ROLES.EC_MEMBER, ROLES.ADMIN, ROLES.SUPER_ADMIN],
    'member:chat':             [ROLES.MEMBER, ROLES.EC_MEMBER, ROLES.ADMIN, ROLES.SUPER_ADMIN],
    'member:rsvp':             [ROLES.MEMBER, ROLES.EC_MEMBER, ROLES.ADMIN, ROLES.SUPER_ADMIN],
    'member:view_events':      [ROLES.GUEST, ROLES.MEMBER, ROLES.EC_MEMBER, ROLES.ADMIN, ROLES.SUPER_ADMIN],
    'member:submit_complaint': [ROLES.MEMBER, ROLES.EC_MEMBER, ROLES.ADMIN, ROLES.SUPER_ADMIN],

    // Data access permissions per collection
    'data:Members:read':       [ROLES.EC_MEMBER, ROLES.ADMIN, ROLES.SUPER_ADMIN],
    'data:Members:write':      [ROLES.ADMIN, ROLES.SUPER_ADMIN],
    'data:Payments:read':      [ROLES.EC_MEMBER, ROLES.ADMIN, ROLES.SUPER_ADMIN],
    'data:Payments:write':     [ROLES.ADMIN, ROLES.SUPER_ADMIN],

    // CRM permissions
    'admin:manage_crm':        [ROLES.ADMIN, ROLES.SUPER_ADMIN],
    'admin:manage_families':   [ROLES.ADMIN, ROLES.SUPER_ADMIN],
    'data:Complaints:read':    [ROLES.EC_MEMBER, ROLES.ADMIN, ROLES.SUPER_ADMIN],
    'data:Complaints:write':   [ROLES.MEMBER, ROLES.EC_MEMBER, ROLES.ADMIN, ROLES.SUPER_ADMIN],
    'data:SentEmails:read':    [ROLES.ADMIN, ROLES.SUPER_ADMIN],
    'data:InboxMessages:read': [ROLES.ADMIN, ROLES.SUPER_ADMIN],
    'data:EmailQueue:read':    [ROLES.EC_MEMBER, ROLES.ADMIN, ROLES.SUPER_ADMIN],
    'data:AutoResponses:read': [ROLES.EC_MEMBER, ROLES.ADMIN, ROLES.SUPER_ADMIN],
    'data:AutoResponses:write':[ROLES.ADMIN, ROLES.SUPER_ADMIN],
    'data:KnowledgeBase:read': [ROLES.EC_MEMBER, ROLES.ADMIN, ROLES.SUPER_ADMIN],
    'data:KnowledgeBase:write':[ROLES.ADMIN, ROLES.SUPER_ADMIN],
    'data:AgentProfiles:read': [ROLES.EC_MEMBER, ROLES.ADMIN, ROLES.SUPER_ADMIN],
    'data:AgentProfiles:write':[ROLES.ADMIN, ROLES.SUPER_ADMIN],
    'data:AdminRoles:read':    [ROLES.ADMIN, ROLES.SUPER_ADMIN],
    'data:AdminRoles:write':   [ROLES.SUPER_ADMIN]
};

// ─────────────────────────────────────────
// ADMIN SEED DATA
// ─────────────────────────────────────────

export const DEFAULT_ADMINS = [
    { email: BANF_EMAIL, role: ROLES.SUPER_ADMIN, permissions: 'all', isActive: true,
      firstName: 'BANF', lastName: 'Admin', ecTitle: 'VP / System Administrator',
      onboardingComplete: true, passwordSet: false }
];

// ─────────────────────────────────────────
// ROLE LOOKUP
// ─────────────────────────────────────────

// In-memory cache to reduce DB hits
const _roleCache = {};
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Get the role for an email address
 */
export async function getUserRole(email) {
    if (!email) return ROLES.GUEST;
    const emailLc = email.toLowerCase().trim();

    // Check cache
    if (_roleCache[emailLc] && Date.now() - _roleCache[emailLc].ts < CACHE_TTL) {
        return _roleCache[emailLc].role;
    }

    try {
        // Check AdminRoles collection first
        const adminResult = await wixData.query('AdminRoles')
            .eq('email', emailLc)
            .eq('isActive', true)
            .find(SA);

        if (adminResult.items.length > 0) {
            const role = adminResult.items[0].role;
            _roleCache[emailLc] = { role, ts: Date.now() };
            return role;
        }

        // Check Members collection — active members get MEMBER role
        const memberResult = await wixData.query('Members')
            .eq('email', emailLc)
            .find(SA);

        if (memberResult.items.length > 0) {
            const member = memberResult.items[0];
            const role = member.isActive ? ROLES.MEMBER : ROLES.GUEST;
            _roleCache[emailLc] = { role, ts: Date.now() };
            return role;
        }
    } catch (_) {}

    return ROLES.GUEST;
}

/**
 * Check if a role has a specific permission
 */
export function hasPermission(role, permission) {
    const allowedRoles = PERMISSIONS[permission];
    if (!allowedRoles) return false;
    return allowedRoles.includes(role);
}

/**
 * Extract email from a request object
 * Supports: Authorization header (token), x-user-email header, query param email
 */
export async function extractRequestEmail(request) {
    try {
        const params = request.query || {};
        if (params.admin_key === WIX_API_KEY) return BANF_EMAIL; // internal calls

        const emailHeader = (request.headers && request.headers['x-user-email']) || '';
        if (emailHeader) return emailHeader.toLowerCase().trim();

        // Try Authorization Bearer token decode (base64 email:token)
        const authHeader = (request.headers && request.headers.authorization) || '';
        if (authHeader.startsWith('Bearer ')) {
            const token = authHeader.substring(7);
            try {
                const decoded = atob(token);
                const [email] = decoded.split(':');
                if (email && email.includes('@')) return email.toLowerCase().trim();
            } catch (_) {}
        }

        // Query param fallback (for testing)
        if (params.user_email) return params.user_email.toLowerCase().trim();
    } catch (_) {}
    return null;
}

/**
 * Main permission check — use at start of every protected endpoint
 * Returns { allowed, email, role, reason }
 */
export async function checkPermission(request, permission) {
    const email = await extractRequestEmail(request);
    const role = await getUserRole(email);
    const allowed = hasPermission(role, permission);
    return {
        allowed,
        email: email || 'anonymous',
        role,
        reason: allowed ? 'ok' : `Role '${role}' does not have permission '${permission}'`
    };
}

/**
 * Filter a data result set to only return items a user is allowed to see
 * For members: only their own records. For admins: all records.
 */
export function applyDataFilters(items, email, role, ownerField = 'email') {
    if ([ROLES.ADMIN, ROLES.SUPER_ADMIN, ROLES.EC_MEMBER].includes(role)) {
        return items; // admins see everything
    }
    if (role === ROLES.MEMBER && email) {
        return items.filter(item => {
            const owner = (item[ownerField] || '').toLowerCase();
            return owner === email.toLowerCase();
        });
    }
    return []; // guests see nothing
}

// ─────────────────────────────────────────
// ADMIN ROLE MANAGEMENT
// ─────────────────────────────────────────

export async function seedAdminRoles() {
    const results = [];
    for (const admin of DEFAULT_ADMINS) {
        try {
            const existing = await wixData.query('AdminRoles').eq('email', admin.email).find(SA);
            if (existing.items.length > 0) {
                results.push({ email: admin.email, status: 'exists' });
                continue;
            }
            await wixData.insert('AdminRoles', admin, SA);
            results.push({ email: admin.email, status: 'seeded' });
        } catch (e) {
            results.push({ email: admin.email, status: 'error', error: e.message });
        }
    }
    return results;
}

export async function addAdminRole(email, role, addedBy, extras = {}) {
    const { ecTitle = '', firstName = '', lastName = '' } = extras;
    const existing = await wixData.query('AdminRoles').eq('email', email.toLowerCase()).find(SA);
    const record = {
        email: email.toLowerCase(),
        role,
        permissions: role === ROLES.SUPER_ADMIN ? 'all' : role,
        isActive: true,
        lastLogin: new Date(),
        ...(addedBy ? { addedBy } : {}),
        ...(ecTitle ? { ecTitle } : {}),
        ...(firstName ? { firstName } : {}),
        ...(lastName ? { lastName } : {})
    };
    if (existing.items.length > 0) {
        return await wixData.update('AdminRoles', { ...existing.items[0], ...record }, SA);
    }
    return await wixData.insert('AdminRoles', record, SA);
}

export async function revokeAdminRole(email) {
    const existing = await wixData.query('AdminRoles').eq('email', email.toLowerCase()).find(SA);
    if (existing.items.length > 0) {
        return await wixData.update('AdminRoles', { ...existing.items[0], isActive: false }, SA);
    }
    throw new Error('Admin not found: ' + email);
}

export async function listAdminRoles() {
    const result = await wixData.query('AdminRoles').find(SA);
    return result.items.map(item => ({
        _id: item._id,
        _createdDate: item._createdDate,
        email: item.email,
        role: item.role,
        isActive: item.isActive,
        lastLogin: item.lastLogin,
        addedBy: item.addedBy || '',
        ecTitle: item.ecTitle || '',
        firstName: item.firstName || '',
        lastName: item.lastName || ''
    }));
}

/**
 * Generate a simple session token (base64 encoded email:timestamp:role)
 * For use with x-user-email header or Bearer token in test scenarios
 */
export function generateSessionToken(email, role) {
    return btoa(`${email}:${Date.now()}:${role}`);
}

/**
 * Standard forbidden response
 */
export function forbiddenResponse(reason) {
    return {
        statusCode: 403,
        body: JSON.stringify({ success: false, error: 'Forbidden', reason }),
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    };
}
