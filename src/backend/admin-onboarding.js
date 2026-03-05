/**
 * ═══════════════════════════════════════════════════════════════
 *  ADMIN ONBOARDING MODULE v1.0
 *  Handles the first-login flow for newly granted EC/admin roles:
 *  1. One-time setup token generated on role grant (via email link)
 *  2. Password setup (hashed with salt, stored in AdminRoles)
 *  3. Member profile completion (phone, address, family members)
 *  4. Mark onboardingComplete — unlocks the admin portal
 *
 *  AdminRoles extra fields managed here:
 *    setupToken, setupTokenExpiry, passwordHash, passwordSalt,
 *    passwordSet (bool), onboardingComplete (bool)
 * ═══════════════════════════════════════════════════════════════
 */

import wixData from 'wix-data';
import { createHmac } from 'node:crypto';

const SA = { suppressAuth: true };
const ONBOARD_URL = 'https://banfjax-hash.github.io/banf/admin-portal.html';
const PORTAL_URL  = 'https://banfjax-hash.github.io/banf/admin-portal.html';
const TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

// ─────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────

/** Generate a random alphanumeric token */
function generateRawToken() {
    const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    let token = '';
    for (let i = 0; i < 36; i++) {
        token += chars[Math.floor(Math.random() * chars.length)];
    }
    return token;
}

/** Random salt string */
function generateSalt() {
    return Math.random().toString(36).slice(2) + Date.now().toString(36) +
           Math.random().toString(36).slice(2);
}

/**
 * Password hash using HMAC-SHA256 (Node.js crypto — available in Wix Velo backend).
 * 1000 iterations of HMAC with salt and a pepper constant for key stretching.
 * Returns a 64-char hex string.
 */
function hashPwd(password, salt) {
    const pepper = 'BANF_NE_FLORIDA_ADM_2026';
    // Round 0 — initial HMAC
    let h = createHmac('sha256', salt + ':' + pepper).update(password).digest('hex');
    // Key-stretching rounds
    for (let i = 0; i < 999; i++) {
        h = createHmac('sha256', salt + ':' + i + ':' + pepper).update(h + ':' + password).digest('hex');
    }
    return h; // 64-char hex
}

/** Exported alias for diagnostics only */
export function hashPwdDebug(password, salt) { return hashPwd(password, salt); }

/** Build the onboarding URL with email + token params */
export function buildOnboardUrl(email, token) {
    return `${ONBOARD_URL}?email=${encodeURIComponent(email)}&token=${encodeURIComponent(token)}`;
}

/** Build the portal URL (post-onboarding) */
export function buildPortalUrl(email) {
    return `${PORTAL_URL}?email=${encodeURIComponent(email)}`;
}

// ─────────────────────────────────────────
// SETUP TOKEN
// ─────────────────────────────────────────

/**
 * Generate a new setup token for an admin email and persist it.
 * Called in post_admin_role_add.
 */
export async function generateAndStoreSetupToken(email) {
    const token = generateRawToken();
    const expiry = Date.now() + TOKEN_TTL_MS;

    const res = await wixData.query('AdminRoles')
        .eq('email', email.toLowerCase().trim()).limit(1).find(SA);

    if (res.items.length > 0) {
        await wixData.update('AdminRoles', {
            ...res.items[0],
            setupToken: token,
            setupTokenExpiry: expiry,
            passwordSet: res.items[0].passwordSet || false,
            onboardingComplete: res.items[0].onboardingComplete === true ? true : false
        }, SA);
    }
    return token;
}

/**
 * Verify a setup token for an email.
 * Returns the AdminRoles document if valid, null otherwise.
 */
export async function verifySetupToken(email, token) {
    if (!email || !token) return null;
    const res = await wixData.query('AdminRoles')
        .eq('email', email.toLowerCase().trim()).limit(1).find(SA);
    if (!res.items.length) return null;

    const rec = res.items[0];
    if (rec.setupToken !== token) return null;
    if (rec.setupTokenExpiry && Date.now() > rec.setupTokenExpiry) return null;
    return rec;
}

// ─────────────────────────────────────────
// PASSWORD MANAGEMENT
// ─────────────────────────────────────────

/**
 * Set (or change) the admin password.
 * Requires a valid setup token.
 * Returns {success, portalUrl} on success.
 */
export async function setAdminPassword(email, password, token) {
    const rec = await verifySetupToken(email, token);
    if (!rec) return { success: false, error: 'Invalid or expired setup link' };
    if (!password || password.length < 8) {
        return { success: false, error: 'Password must be at least 8 characters' };
    }

    const salt = generateSalt();
    const passwordHash = hashPwd(password, salt);

    await wixData.update('AdminRoles', {
        ...rec,
        passwordHash,
        passwordSalt: salt,
        passwordSet: true
    }, SA);

    return { success: true, portalUrl: buildPortalUrl(email) };
}

/**
 * Verify a login attempt (email + password).
 * Returns {valid, role, firstName, lastName, ecTitle, onboardingComplete, needsOnboarding}
 */
export async function verifyAdminLogin(email, password) {
    if (!email) return { valid: false, error: 'Email required' };

    const res = await wixData.query('AdminRoles')
        .eq('email', email.toLowerCase().trim()).limit(1).find(SA);
    if (!res.items.length) return { valid: false, error: 'Email not found in admin roles' };

    const rec = res.items[0];

    if (!rec.isActive) return { valid: false, error: 'Account is inactive' };

    // Not yet through onboarding — only redirect when it was explicitly triggered
    // (generateAndStoreSetupToken sets onboardingComplete = false explicitly)
    // Legacy super_admin seeded without onboarding has onboardingComplete = undefined → fall through
    if (rec.onboardingComplete === false) {
        return {
            valid: false,
            needsOnboarding: true,
            email: rec.email,
            setupToken: rec.setupToken || null,
            message: 'Please complete your account setup first'
        };
    }

    // Password not set — treat as legacy admin (super_admin seeded without onboarding)
    if (!rec.passwordSet) {
        return {
            valid: true,
            noPassword: true,
            role: rec.role,
            firstName: rec.firstName || '',
            lastName: rec.lastName || '',
            ecTitle: rec.ecTitle || '',
            onboardingComplete: true
        };
    }

    // Verify password
    if (!password) return { valid: false, error: 'Password required', needsPassword: true };
    const check = hashPwd(password, rec.passwordSalt || '');
    if (check !== rec.passwordHash) {
        return { valid: false, error: 'Incorrect password' };
    }

    // Update last login
    wixData.update('AdminRoles', { ...rec, lastLogin: new Date() }, SA).catch(() => {});

    return {
        valid: true,
        role: rec.role,
        firstName: rec.firstName || '',
        lastName: rec.lastName || '',
        ecTitle: rec.ecTitle || '',
        onboardingComplete: true
    };
}

// ─────────────────────────────────────────
// PROFILE FUNCTIONS
// ─────────────────────────────────────────

/**
 * Get the onboarding profile for the user: personal info + family data.
 * Token must be valid, OR passwordSet=true (then no token needed if password auth happened).
 */
export async function getOnboardProfile(email, token) {
    const rec = await verifySetupToken(email, token);
    if (!rec) return { success: false, error: 'Invalid or expired setup link' };

    const profile = await _getMemberData(email);
    const family = await _getFamilyData(email);

    return {
        success: true,
        adminRole: {
            role: rec.role,
            ecTitle: rec.ecTitle || '',
            firstName: rec.firstName || '',
            lastName: rec.lastName || '',
            addedBy: rec.addedBy || '',
            passwordSet: rec.passwordSet || false,
            onboardingComplete: rec.onboardingComplete || false
        },
        profile,
        family
    };
}

/**
 * Save profile changes (personal + family members).
 */
export async function saveOnboardProfile(email, data, token) {
    const rec = await verifySetupToken(email, token);
    if (!rec) return { success: false, error: 'Invalid or expired setup link' };
    if (!data.phone) return { success: false, error: 'Phone number is required' };

    // Save to AdminRoles (firstName, lastName)
    await wixData.update('AdminRoles', {
        ...rec,
        firstName: data.firstName || rec.firstName || '',
        lastName: data.lastName || rec.lastName || '',
        ...(data.securityQuestion ? { securityQuestion: data.securityQuestion } : {}),
        ...(data.securityAnswer ? { securityAnswer: data.securityAnswer.toLowerCase() } : {})
    }, SA);

    // Upsert into CRMMembers by email (skip if collection doesn't exist)
    try {
        const crmRes = await wixData.query('CRMMembers')
            .eq('email', email.toLowerCase().trim()).limit(1).find(SA);

        const crmPayload = {
            email: email.toLowerCase().trim(),
            firstName: data.firstName || rec.firstName || '',
            lastName: data.lastName || rec.lastName || '',
            phone: data.phone || '',
            phone2: data.phone2 || '',
            address: data.address || '',
            city: data.city || '',
            state: data.state || '',
            zipCode: data.zipCode || '',
            isActive: true
        };

        if (crmRes.items.length > 0) {
            await wixData.update('CRMMembers', { ...crmRes.items[0], ...crmPayload }, SA);
        } else {
            const memberId = 'mbr_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 6);
            await wixData.insert('CRMMembers', { ...crmPayload, memberId, isECMember: true }, SA);
        }
    } catch (crmErr) {
        // CRMMembers collection may not exist yet — continue without it
        console.log('CRMMembers upsert skipped:', crmErr.message);
    }

    // Also upsert into Members collection (used by email-templates getMemberProfile)
    try {
        const mbrRes = await wixData.query('Members')
            .eq('email', email.toLowerCase().trim()).limit(1).find(SA);
        const memberPayload = {
            email: email.toLowerCase().trim(),
            firstName: data.firstName || rec.firstName || '',
            lastName: data.lastName || rec.lastName || '',
            phone: data.phone || '',
            address: [data.address, data.city, data.state, data.zipCode].filter(Boolean).join(', ')
        };
        if (mbrRes.items.length > 0) {
            await wixData.update('Members', { ...mbrRes.items[0], ...memberPayload }, SA).catch(() => {});
        } else {
            await wixData.insert('Members', memberPayload, SA).catch(() => {});
        }
    } catch (mbrErr) {
        console.log('Members upsert skipped:', mbrErr.message);
    }

    // Save family member updates if provided
    if (Array.isArray(data.familyMembers) && data.familyMembers.length > 0) {
        try {
            for (const fm of data.familyMembers) {
                if (!fm.memberId) continue;
                const fmRes = await wixData.query('CRMMembers')
                    .eq('memberId', fm.memberId).limit(1).find(SA);
                if (fmRes.items.length > 0) {
                    const updated = { ...fmRes.items[0] };
                    if (fm.phone !== undefined) updated.phone = fm.phone;
                    if (fm.email !== undefined) updated.email = fm.email;
                    if (fm.firstName !== undefined) updated.firstName = fm.firstName;
                    if (fm.lastName !== undefined) updated.lastName = fm.lastName;
                    await wixData.update('CRMMembers', updated, SA).catch(() => {});
                }
            }
        } catch (fmErr) {
            console.log('Family updates skipped:', fmErr.message);
        }
    }

    return { success: true };
}

/**
 * Mark onboarding as complete. Invalidates the setup token.
 */
export async function markOnboardingComplete(email, token) {
    const rec = await verifySetupToken(email, token);
    if (!rec) return { success: false, error: 'Invalid or expired setup link' };

    await wixData.update('AdminRoles', {
        ...rec,
        onboardingComplete: true,
        setupToken: null,        // invalidate token
        setupTokenExpiry: null,
        lastLogin: new Date()
    }, SA);

    return { success: true, portalUrl: buildPortalUrl(email) };
}

/**
 * Get onboarding status for an email (no token required — used for portal login check).
 */
export async function getOnboardStatus(email) {
    if (!email) return null;
    const res = await wixData.query('AdminRoles')
        .eq('email', email.toLowerCase().trim()).limit(1).find(SA);
    if (!res.items.length) return null;
    const r = res.items[0];
    return {
        email: r.email,
        role: r.role,
        firstName: r.firstName || '',
        lastName: r.lastName || '',
        ecTitle: r.ecTitle || '',
        passwordSet: r.passwordSet || false,
        onboardingComplete: r.onboardingComplete === true,
        isActive: r.isActive !== false,
        setupToken: r.setupToken || null
    };
}

// ─────────────────────────────────────────
// PRIVATE HELPERS
// ─────────────────────────────────────────

async function _getMemberData(email) {
    try {
        const emailLc = email.toLowerCase().trim();
        // Try CRMMembers first (richer data), then Members fallback
        const crmRes = await wixData.query('CRMMembers').eq('email', emailLc).limit(1).find(SA);
        if (crmRes.items.length > 0) return crmRes.items[0];

        const mbrRes = await wixData.query('Members').eq('email', emailLc).limit(1).find(SA);
        return mbrRes.items[0] || null;
    } catch (e) {
        return null;
    }
}

async function _getFamilyData(email) {
    try {
        const emailLc = email.toLowerCase().trim();
        // Find this person's memberId in CRMMembers
        const selfRes = await wixData.query('CRMMembers').eq('email', emailLc).limit(1).find(SA);
        if (!selfRes.items.length) return null;

        const self = selfRes.items[0];
        const memberId = self.memberId;
        if (!memberId) return null;

        // Find the family group that contains this memberId
        const famGroups = await wixData.query('FamilyGroups')
            .hasSome('adultMemberIds', [memberId])
            .limit(1).find(SA).catch(async () => {
                // hasSome might not work with stored JSON arrays; try a broader search
                return await wixData.query('FamilyGroups').limit(200).find(SA)
                    .then(all => ({
                        items: all.items.filter(fg => {
                            const adults = (() => { try { return JSON.parse(fg.adultMemberIds || '[]'); } catch(_) { return []; } })();
                            const minors = (() => { try { return JSON.parse(fg.minorMemberIds || '[]'); } catch(_) { return []; } })();
                            return adults.includes(memberId) || minors.includes(memberId);
                        })
                    }));
            });

        if (!famGroups.items.length) return null;
        const family = famGroups.items[0];

        // Collect all member IDs in the family
        let adultIds = [], minorIds = [];
        try { adultIds = JSON.parse(family.adultMemberIds || '[]'); } catch(_) {}
        try { minorIds = JSON.parse(family.minorMemberIds || '[]'); } catch(_) {}

        // Fetch all members
        const allIds = [...adultIds, ...minorIds].filter(id => id !== memberId);
        const members = [];
        for (const mid of allIds) {
            const res = await wixData.query('CRMMembers').eq('memberId', mid).limit(1).find(SA);
            if (res.items.length > 0) {
                members.push({
                    ...res.items[0],
                    relationshipType: adultIds.includes(mid) ? 'adult' : 'minor'
                });
            }
        }

        return {
            familyId: family.familyId,
            familyName: family.familyName || '',
            headName: family.headName || '',
            members
        };
    } catch (e) {
        console.warn('[admin-onboarding] _getFamilyData error:', e.message);
        return null;
    }
}

// ─────────────────────────────────────────
// SECURITY QUESTION & PASSWORD RESET
// ─────────────────────────────────────────

/**
 * Get the security question for an admin email (does NOT reveal the answer).
 */
export async function getAdminSecurityQuestion(email) {
    if (!email) return { success: false, error: 'Email required' };
    const res = await wixData.query('AdminRoles')
        .eq('email', email.toLowerCase().trim()).limit(1).find(SA);
    if (!res.items.length) return { success: false, error: 'Account not found' };
    const rec = res.items[0];
    if (!rec.securityQuestion) return { success: false, error: 'No security question set' };
    return { success: true, question: rec.securityQuestion, firstName: rec.firstName || '', lastName: rec.lastName || '' };
}

/**
 * Verify security answer and generate a one-time reset token.
 */
export async function verifySecurityAnswer(email, answer) {
    if (!email || !answer) return { success: false, error: 'Email and answer required' };
    const res = await wixData.query('AdminRoles')
        .eq('email', email.toLowerCase().trim()).limit(1).find(SA);
    if (!res.items.length) return { success: false, error: 'Account not found' };
    const rec = res.items[0];
    if (!rec.securityAnswer) return { success: false, error: 'No security answer configured' };
    if (rec.securityAnswer.toLowerCase().trim() !== answer.toLowerCase().trim()) {
        return { success: false, error: 'Incorrect answer' };
    }
    // Generate a one-time reset token
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let resetToken = '';
    for (let i = 0; i < 32; i++) resetToken += chars[Math.floor(Math.random() * chars.length)];
    await wixData.update('AdminRoles', {
        ...rec,
        resetToken,
        resetTokenExpiry: new Date(Date.now() + 15 * 60 * 1000) // 15 min
    }, SA);
    return { success: true, resetToken };
}

/**
 * Force-reset any admin's password — SUPER ADMIN ONLY (no token required).
 * Used by Super Admin to unblock EC members who can't use forgot-password.
 */
export async function forceResetAdminPassword(email, newPassword) {
    if (!email || !newPassword) return { success: false, error: 'Email and new password required' };
    if (newPassword.length < 8) return { success: false, error: 'Password must be at least 8 characters' };
    const res = await wixData.query('AdminRoles')
        .eq('email', email.toLowerCase().trim()).limit(1).find(SA);
    if (!res.items.length) return { success: false, error: 'Account not found' };
    const rec = res.items[0];

    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let salt = '';
    for (let i = 0; i < 24; i++) salt += chars[Math.floor(Math.random() * chars.length)];
    const passwordHash = hashPwd(newPassword, salt);

    await wixData.update('AdminRoles', {
        ...rec,
        passwordHash,
        passwordSalt: salt,
        passwordSet: true,
        resetToken: null,
        resetTokenExpiry: null
    }, SA);

    return { success: true, email: rec.email, firstName: rec.firstName || '', lastName: rec.lastName || '' };
}

/**
 * Reset admin password using a reset token.
 */
export async function resetAdminPassword(email, token, newPassword) {
    if (!email || !token || !newPassword) return { success: false, error: 'Email, token and password required' };
    if (newPassword.length < 8) return { success: false, error: 'Password must be at least 8 characters' };
    const res = await wixData.query('AdminRoles')
        .eq('email', email.toLowerCase().trim()).limit(1).find(SA);
    if (!res.items.length) return { success: false, error: 'Account not found' };
    const rec = res.items[0];
    if (!rec.resetToken || rec.resetToken !== token) return { success: false, error: 'Invalid or expired reset token' };
    if (rec.resetTokenExpiry && new Date(rec.resetTokenExpiry) < new Date()) return { success: false, error: 'Reset token has expired. Please start over.' };

    // Hash new password
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let salt = '';
    for (let i = 0; i < 24; i++) salt += chars[Math.floor(Math.random() * chars.length)];
    const passwordHash = hashPwd(newPassword, salt);

    await wixData.update('AdminRoles', {
        ...rec,
        passwordHash,
        passwordSalt: salt,
        passwordSet: true,
        resetToken: null,
        resetTokenExpiry: null,
        lastLogin: new Date()
    }, SA);

    return { success: true };
}

// ─────────────────────────────────────────
// SIGNUP EMAIL VERIFICATION CODE
// ─────────────────────────────────────────

/**
 * Generate a 6-digit signup verification code, store it in AdminRoles.
 * Returns the code so the API layer can email it.
 */
export async function generateSignupCode(email) {
    if (!email) return { success: false, error: 'Email required' };
    const res = await wixData.query('AdminRoles')
        .eq('email', email.toLowerCase().trim()).limit(1).find(SA);
    if (!res.items.length) return { success: false, error: 'Email not found in AdminRoles. Contact the Super Admin to get access.' };
    const rec = res.items[0];
    if (rec.passwordSet) return { success: false, error: 'This account already has a password. Please sign in instead.' };

    // Generate 6-digit code
    const code = String(Math.floor(100000 + Math.random() * 900000));
    await wixData.update('AdminRoles', {
        ...rec,
        signupCode: code,
        signupCodeExpiry: new Date(Date.now() + 10 * 60 * 1000) // 10 minutes
    }, SA);

    return {
        success: true,
        code,
        firstName: rec.firstName || '',
        lastName: rec.lastName || '',
        role: rec.role || 'admin'
    };
}

/**
 * Verify the 6-digit signup code and return a setup token.
 */
export async function verifySignupCode(email, code) {
    if (!email || !code) return { success: false, error: 'Email and code required' };
    const res = await wixData.query('AdminRoles')
        .eq('email', email.toLowerCase().trim()).limit(1).find(SA);
    if (!res.items.length) return { success: false, error: 'Account not found' };
    const rec = res.items[0];

    if (!rec.signupCode || rec.signupCode !== code.trim()) {
        return { success: false, error: 'Invalid verification code. Please check and try again.' };
    }
    if (rec.signupCodeExpiry && new Date(rec.signupCodeExpiry) < new Date()) {
        return { success: false, error: 'Verification code has expired. Please request a new one.' };
    }

    // Code verified — generate a setup token for password creation
    const token = generateRawToken();
    const expiry = Date.now() + TOKEN_TTL_MS;
    await wixData.update('AdminRoles', {
        ...rec,
        setupToken: token,
        setupTokenExpiry: expiry,
        signupCode: null,
        signupCodeExpiry: null
    }, SA);

    return { success: true, setupToken: token };
}
