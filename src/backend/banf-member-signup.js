/**
 * ═══════════════════════════════════════════════════════════════
 *  BANF MEMBER SIGNUP / SIGNIN / AUTH API
 *  Handles: Registration, Login, Forgot-Password, Zelle Payment
 *
 *  Workflow:
 *  1. POST /signup_initiate      → check existing → gen reg code → save pending
 *  2. GET  /signup_status        → poll payment status
 *  3. POST /signup_complete      → after payment confirmed → create Member record
 *  4. POST /signin               → verify credentials → return session token
 *  5. POST /signup_resend_code   → resend reg code / Zelle instructions
 *  6. POST /forgot_password      → secret question flow
 *  7. POST /reset_password       → set new password via temp token
 *  8. POST /signup_set_secret_qa → set secret Q&A at first login
 *  9. POST /payment_confirm_agent→ called by email agent when payment email seen
 * ═══════════════════════════════════════════════════════════════
 */

import { ok, badRequest, serverError, forbidden } from 'wix-http-functions';
import wixData from 'wix-data';
import { isMemberOnboarded } from 'backend/ec-onboarding-gate';

const SA = { suppressAuth: true };
const BANF_ZELLE_EMAIL = 'banfjax@gmail.com';
const MEMBERSHIP_AMOUNT = 50; // $50 per family

// ─────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────

function jsonOk(data) {
    return ok({
        body: JSON.stringify({ success: true, ...data }),
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
}
function jsonErr(msg, code = 400) {
    const fn = code === 403 ? forbidden : (code >= 500 ? serverError : badRequest);
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
async function parseBody(request) {
    try { return await request.body.json(); } catch (_) { return {}; }
}

// ─────────────────────────────────────────
// REGISTRATION CODE ALGORITHM
// Format: BANF-{TYPE}-{II}{YYYYMMDD}-{RAND4}
//  TYPE:  NM = New Member | RN = Renewal | EC = EC Member
//  II:    First char of firstName + first char of lastName (uppercase)
//  YYYYMMDD: date of registration
//  RAND4: 4-char alphanumeric random
// Example: BANF-NM-AB20250623-X7K2
// ─────────────────────────────────────────

export function generateRegCode(firstName, lastName, type = 'NM') {
    const initials = (
        (firstName && firstName.length > 0 ? firstName[0] : 'X') +
        (lastName  && lastName.length  > 0 ? lastName[0]  : 'X')
    ).toUpperCase();

    const now = new Date();
    const yyyy = now.getFullYear();
    const mm   = String(now.getMonth() + 1).padStart(2, '0');
    const dd   = String(now.getDate()).padStart(2, '0');
    const dateStr = `${yyyy}${mm}${dd}`;

    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no confusing chars
    let rand = '';
    for (let i = 0; i < 4; i++) {
        rand += chars[Math.floor(Math.random() * chars.length)];
    }

    return `BANF-${type}-${initials}${dateStr}-${rand}`;
}

// ─────────────────────────────────────────
// SIMPLE PASSWORD HASH (no crypto module needed)
// Uses a manual djb2-style hash with salt then base64-ish encode
// ─────────────────────────────────────────

export function hashPassword(password, salt) {
    const combined = salt + ':' + password + ':BANF-SECRET-2025';
    let hash = 5381;
    for (let i = 0; i < combined.length; i++) {
        hash = ((hash << 5) + hash) + combined.charCodeAt(i);
        hash |= 0; // force 32-bit integer
    }
    const unsigned = hash >>> 0;
    return unsigned.toString(36) + '_' + btoa(salt + password.length).replace(/=/g, '');
}

export function generateSalt() {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let s = '';
    for (let i = 0; i < 16; i++) s += chars[Math.floor(Math.random() * chars.length)];
    return s;
}

export function verifyPassword(password, salt, expectedHash) {
    return hashPassword(password, salt) === expectedHash;
}

// ─────────────────────────────────────────
// GENERATE SESSION TOKEN (simple, 32-char hex-like)
// ─────────────────────────────────────────

function generateSessionToken(email) {
    const ts = Date.now().toString(36);
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let rand = '';
    for (let i = 0; i < 20; i++) rand += chars[Math.floor(Math.random() * chars.length)];
    return `ST-${ts}-${rand}`;
}

// ─────────────────────────────────────────
// ZELLE PAYMENT INSTRUCTION BUILDER
// ─────────────────────────────────────────

export function buildZelleInstructions(regCode, firstName, lastName, amount = MEMBERSHIP_AMOUNT) {
    const displayName = `${firstName} ${lastName}`.trim();
    const zelleLink = `zelle://send?recipient=${encodeURIComponent(BANF_ZELLE_EMAIL)}&amount=${amount}&memo=${encodeURIComponent('BANF ' + regCode)}`;
    return {
        zelleEmail: BANF_ZELLE_EMAIL,
        amount,
        regCode,
        displayName,
        subject: `BANF Membership Payment ${regCode}`,
        memo: `BANF ${regCode}`,
        instructions: [
            `1. Open your Zelle app or bank's Zelle feature`,
            `2. Send $${amount} to: ${BANF_ZELLE_EMAIL}`,
            `3. In the memo/note field, enter exactly: BANF ${regCode}`,
            `4. Take a screenshot and send it to banfjax@gmail.com with subject: ${`BANF Membership Payment ${regCode}`}`,
            `5. Your account will be activated within 24 hours after payment is verified`
        ],
        zelleDeepLink: zelleLink,
        qrData: JSON.stringify({ type: 'zelle', to: BANF_ZELLE_EMAIL, amount, memo: `BANF ${regCode}` })
    };
}

// ─────────────────────────────────────────
// STEP 1: INITIATE SIGNUP
// POST /signup_initiate
// Body: { firstName, lastName, email, phone, membershipType, workflowType }
// ─────────────────────────────────────────

export async function post_signup_initiate(request) {
    try {
        const body = await parseBody(request);
        const { firstName, lastName, email, phone, membershipType = 'family', workflowType = 'NM' } = body;

        if (!firstName || !lastName || !email) {
            return jsonErr('Missing required fields: firstName, lastName, email');
        }

        const emailLc = email.toLowerCase().trim();

        // Check if already an active Member
        const existingMember = await wixData.query('CRMMembers')
            .eq('email', emailLc)
            .find(SA)
            .catch(() => ({ items: [] }));

        if (existingMember.items.length > 0) {
            return jsonErr('An account already exists with this email. Please sign in.', 409);
        }

        // Check if pending registration already exists
        const existingReg = await wixData.query('MemberRegistrations')
            .eq('email', emailLc)
            .eq('status', 'pending_payment')
            .find(SA)
            .catch(() => ({ items: [] }));

        if (existingReg.items.length > 0) {
            // Return existing pending reg
            const pending = existingReg.items[0];
            const zelleInfo = buildZelleInstructions(pending.regCode, firstName, lastName);
            return jsonOk({
                message: 'Pending registration found. Complete your payment.',
                regCode: pending.regCode,
                status: 'pending_payment',
                zelle: zelleInfo,
                existingReg: true
            });
        }

        // Generate unique registration code
        const regCode = generateRegCode(firstName, lastName, workflowType === 'renewal' ? 'RN' : 'NM');

        // Save to MemberRegistrations collection
        const regRecord = await wixData.insert('MemberRegistrations', {
            regCode,
            firstName: firstName.trim(),
            lastName: lastName.trim(),
            email: emailLc,
            phone: (phone || '').trim(),
            membershipType,
            workflowType,
            status: 'pending_payment',
            amount: MEMBERSHIP_AMOUNT,
            createdAt: new Date(),
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
            paymentConfirmed: false,
            paymentConfirmedAt: null,
            paymentConfirmedBy: null,
            secretQuestion: null,
            secretAnswerHash: null
        }, SA);

        const zelleInfo = buildZelleInstructions(regCode, firstName, lastName);

        return jsonOk({
            message: 'Registration initiated. Complete Zelle payment to activate your account.',
            regCode,
            status: 'pending_payment',
            zelle: zelleInfo,
            registrationId: regRecord._id,
            expiresAt: regRecord.expiresAt
        });

    } catch (e) {
        return jsonErr('Signup initiation failed: ' + e.message, 500);
    }
}
export function options_signup_initiate(request) { return handleCors(); }

// ─────────────────────────────────────────
// CHECK SIGNUP STATUS
// GET /signup_status?regCode=BANF-NM-...
// ─────────────────────────────────────────

export async function get_signup_status(request) {
    try {
        const params = request.query || {};
        const regCode = params.regCode || params.reg_code;
        if (!regCode) return jsonErr('Missing regCode');

        const result = await wixData.query('MemberRegistrations')
            .eq('regCode', regCode.trim().toUpperCase())
            .find(SA)
            .catch(() => ({ items: [] }));

        if (!result.items.length) {
            return jsonErr('Registration code not found');
        }

        const reg = result.items[0];
        const zelleInfo = reg.status === 'pending_payment'
            ? buildZelleInstructions(reg.regCode, reg.firstName, reg.lastName, reg.amount)
            : null;

        return jsonOk({
            regCode: reg.regCode,
            firstName: reg.firstName,
            lastName: reg.lastName,
            email: reg.email,
            status: reg.status,
            membershipType: reg.membershipType,
            paymentConfirmed: reg.paymentConfirmed,
            paymentConfirmedAt: reg.paymentConfirmedAt,
            createdAt: reg.createdAt,
            expiresAt: reg.expiresAt,
            zelle: zelleInfo
        });

    } catch (e) {
        return jsonErr(e.message, 500);
    }
}
export function options_signup_status(request) { return handleCors(); }

// ─────────────────────────────────────────
// COMPLETE SIGNUP (after payment confirmed)
// POST /signup_complete
// Body: { regCode, password, secretQuestion, secretAnswer }
// ─────────────────────────────────────────

export async function post_signup_complete(request) {
    try {
        const body = await parseBody(request);
        const { regCode, password, secretQuestion, secretAnswer } = body;

        if (!regCode || !password) return jsonErr('Missing regCode and password');

        const result = await wixData.query('MemberRegistrations')
            .eq('regCode', (regCode || '').trim().toUpperCase())
            .find(SA)
            .catch(() => ({ items: [] }));

        if (!result.items.length) return jsonErr('Registration code not found');

        const reg = result.items[0];

        if (reg.status === 'completed') {
            return jsonErr('This registration is already complete. Please sign in.');
        }
        if (!reg.paymentConfirmed) {
            return jsonErr('Payment not yet confirmed. Please complete your Zelle payment and allow up to 24 hours for verification.');
        }

        const salt = generateSalt();
        const passwordHash = hashPassword(password, salt);

        // Hash secret answer if provided
        let secretAnswerHash = null;
        if (secretAnswer) {
            const ansSalt = generateSalt();
            secretAnswerHash = hashPassword(secretAnswer.toLowerCase().trim(), ansSalt) + ':' + ansSalt;
        }

        // 1. Create MemberAuth record
        await wixData.insert('MemberAuth', {
            email: reg.email,
            regCode: reg.regCode,
            passwordHash,
            passwordSalt: salt,
            secretQuestion: secretQuestion || null,
            secretAnswerHash,
            createdAt: new Date(),
            lastLoginAt: null,
            failedAttempts: 0,
            isLocked: false
        }, SA).catch(() => {});

        // 2. Create or link CRMMembers record
        const existingCRM = await wixData.query('CRMMembers')
            .eq('email', reg.email)
            .find(SA)
            .catch(() => ({ items: [] }));

        let memberId;
        if (existingCRM.items.length === 0) {
            const newMember = await wixData.insert('CRMMembers', {
                firstName: reg.firstName,
                lastName: reg.lastName,
                email: reg.email,
                phone: reg.phone || '',
                membershipType: reg.membershipType || 'family',
                membershipStatus: 'active',
                isActive: true,
                registeredVia: 'web-signup',
                regCode: reg.regCode,
                joinedAt: new Date(),
                lastUpdatedAt: new Date()
            }, SA);
            memberId = newMember._id;
        } else {
            memberId = existingCRM.items[0]._id;
        }

        // 3. Mark registration as completed
        await wixData.update('MemberRegistrations', {
            ...reg,
            status: 'completed',
            completedAt: new Date(),
            memberId
        }, SA);

        const sessionToken = generateSessionToken(reg.email);

        // 4. Save session
        await wixData.insert('MemberSessions', {
            email: reg.email,
            sessionToken,
            createdAt: new Date(),
            expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            isActive: true
        }, SA).catch(() => {});

        return jsonOk({
            message: 'Welcome to BANF! Your account is now active.',
            email: reg.email,
            firstName: reg.firstName,
            lastName: reg.lastName,
            regCode: reg.regCode,
            memberId,
            sessionToken
        });

    } catch (e) {
        return jsonErr('Signup completion failed: ' + e.message, 500);
    }
}
export function options_signup_complete(request) { return handleCors(); }

// ─────────────────────────────────────────
// SIGN IN
// POST /signin
// Body: { email, password }
// ─────────────────────────────────────────

export async function post_signin(request) {
    try {
        const body = await parseBody(request);
        const { email, password } = body;
        if (!email || !password) return jsonErr('Missing email or password');

        const emailLc = email.toLowerCase().trim();

        const authResult = await wixData.query('MemberAuth')
            .eq('email', emailLc)
            .find(SA)
            .catch(() => ({ items: [] }));

        if (!authResult.items.length) {
            return jsonErr('No account found for this email. Please sign up first.', 401);
        }

        const auth = authResult.items[0];

        if (auth.isLocked) {
            return jsonErr('Account locked after too many failed attempts. Use Forgot Password to unlock.', 403);
        }

        const valid = verifyPassword(password, auth.passwordSalt, auth.passwordHash);

        if (!valid) {
            // Increment failed attempts
            const attempts = (auth.failedAttempts || 0) + 1;
            await wixData.update('MemberAuth', {
                ...auth,
                failedAttempts: attempts,
                isLocked: attempts >= 5
            }, SA).catch(() => {});
            return jsonErr('Invalid password. ' + (5 - attempts) + ' attempts remaining.', 401);
        }

        // GATE: Check if member is onboarded via membership drive
        // EC members and super_admin bypass this check
        const onboardStatus = await isMemberOnboarded(emailLc);
        if (!onboardStatus.onboarded) {
            return jsonErr(
                onboardStatus.reason || 'Your account has not been activated through the membership drive. Please complete your membership registration first.',
                403
            );
        }

        // Reset failed attempts on success
        const sessionToken = generateSessionToken(emailLc);
        await wixData.update('MemberAuth', {
            ...auth,
            failedAttempts: 0,
            lastLoginAt: new Date()
        }, SA).catch(() => {});

        await wixData.insert('MemberSessions', {
            email: emailLc,
            sessionToken,
            createdAt: new Date(),
            expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            isActive: true
        }, SA).catch(() => {});

        // Fetch member profile
        const memberResult = await wixData.query('CRMMembers')
            .eq('email', emailLc)
            .find(SA)
            .catch(() => ({ items: [] }));
        const member = memberResult.items[0] || {};

        return jsonOk({
            message: 'Welcome back!',
            email: emailLc,
            sessionToken,
            profile: {
                firstName: member.firstName || '',
                lastName: member.lastName || '',
                membershipType: member.membershipType || '',
                membershipStatus: member.membershipStatus || 'active',
                regCode: member.regCode || ''
            }
        });

    } catch (e) {
        return jsonErr('Sign in failed: ' + e.message, 500);
    }
}
export function options_signin(request) { return handleCors(); }

// ─────────────────────────────────────────
// FORGOT PASSWORD — Get Secret Question
// GET /forgot_password?email=xxx
// ─────────────────────────────────────────

export async function get_forgot_password(request) {
    try {
        const params = request.query || {};
        const email = (params.email || '').toLowerCase().trim();
        if (!email) return jsonErr('Missing email');

        const authResult = await wixData.query('MemberAuth')
            .eq('email', email)
            .find(SA)
            .catch(() => ({ items: [] }));

        if (!authResult.items.length) return jsonErr('No account found for this email.', 404);

        const auth = authResult.items[0];
        return jsonOk({
            email,
            hasSecretQuestion: !!auth.secretQuestion,
            secretQuestion: auth.secretQuestion || null
        });
    } catch (e) {
        return jsonErr(e.message, 500);
    }
}
export function options_forgot_password(request) { return handleCors(); }

// ─────────────────────────────────────────
// FORGOT PASSWORD — Verify Secret Answer
// POST /forgot_password_verify
// Body: { email, secretAnswer }
// ─────────────────────────────────────────

export async function post_forgot_password_verify(request) {
    try {
        const body = await parseBody(request);
        const { email, secretAnswer } = body;
        if (!email || !secretAnswer) return jsonErr('Missing email or secretAnswer');

        const emailLc = email.toLowerCase().trim();
        const authResult = await wixData.query('MemberAuth')
            .eq('email', emailLc)
            .find(SA)
            .catch(() => ({ items: [] }));

        if (!authResult.items.length) return jsonErr('No account found.', 404);

        const auth = authResult.items[0];
        if (!auth.secretAnswerHash) return jsonErr('No secret question set. Please contact admin.', 400);

        const [expectedHash, salt] = auth.secretAnswerHash.split(':');
        const valid = hashPassword(secretAnswer.toLowerCase().trim(), salt) === expectedHash;

        if (!valid) return jsonErr('Incorrect answer.', 401);

        // Generate a temporary reset token valid for 1 hour
        const resetToken = generateSessionToken(emailLc) + '-RESET';
        await wixData.insert('MemberSessions', {
            email: emailLc,
            sessionToken: resetToken,
            createdAt: new Date(),
            expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
            isActive: true,
            isResetToken: true
        }, SA).catch(() => {});

        return jsonOk({
            message: 'Secret answer verified. Use the resetToken to set a new password.',
            email: emailLc,
            resetToken
        });
    } catch (e) {
        return jsonErr(e.message, 500);
    }
}
export function options_forgot_password_verify(request) { return handleCors(); }

// ─────────────────────────────────────────
// RESET PASSWORD
// POST /reset_password
// Body: { email, resetToken, newPassword }
// ─────────────────────────────────────────

export async function post_reset_password(request) {
    try {
        const body = await parseBody(request);
        const { email, resetToken, newPassword } = body;
        if (!email || !resetToken || !newPassword) return jsonErr('Missing email, resetToken, or newPassword');

        const emailLc = email.toLowerCase().trim();

        // Validate reset token
        const sessionResult = await wixData.query('MemberSessions')
            .eq('email', emailLc)
            .eq('sessionToken', resetToken)
            .eq('isResetToken', true)
            .eq('isActive', true)
            .find(SA)
            .catch(() => ({ items: [] }));

        if (!sessionResult.items.length) return jsonErr('Invalid or expired reset token.', 401);

        const session = sessionResult.items[0];
        if (new Date(session.expiresAt) < new Date()) {
            return jsonErr('Reset token has expired. Please start over.', 401);
        }

        const authResult = await wixData.query('MemberAuth')
            .eq('email', emailLc)
            .find(SA)
            .catch(() => ({ items: [] }));

        if (!authResult.items.length) return jsonErr('Account not found.', 404);

        const auth = authResult.items[0];
        const newSalt = generateSalt();
        const newHash = hashPassword(newPassword, newSalt);

        await wixData.update('MemberAuth', {
            ...auth,
            passwordHash: newHash,
            passwordSalt: newSalt,
            failedAttempts: 0,
            isLocked: false,
            lastUpdatedAt: new Date()
        }, SA);

        // Expire the reset token
        await wixData.update('MemberSessions', { ...session, isActive: false }, SA).catch(() => {});

        return jsonOk({ message: 'Password reset successfully. You can now sign in.' });
    } catch (e) {
        return jsonErr(e.message, 500);
    }
}
export function options_reset_password(request) { return handleCors(); }

// ─────────────────────────────────────────
// SET SECRET Q&A (called after first login or during signup)
// POST /signup_set_secret_qa
// Body: { email, sessionToken, secretQuestion, secretAnswer }
// ─────────────────────────────────────────

export async function post_signup_set_secret_qa(request) {
    try {
        const body = await parseBody(request);
        const { email, sessionToken, secretQuestion, secretAnswer } = body;
        if (!email || !secretQuestion || !secretAnswer) return jsonErr('Missing fields');

        const emailLc = email.toLowerCase().trim();

        // Validate session if provided
        if (sessionToken) {
            const sess = await wixData.query('MemberSessions')
                .eq('email', emailLc)
                .eq('sessionToken', sessionToken)
                .eq('isActive', true)
                .find(SA)
                .catch(() => ({ items: [] }));
            if (!sess.items.length) return jsonErr('Invalid session', 401);
        }

        const authResult = await wixData.query('MemberAuth')
            .eq('email', emailLc)
            .find(SA)
            .catch(() => ({ items: [] }));

        if (!authResult.items.length) return jsonErr('Account not found.', 404);

        const auth = authResult.items[0];
        const ansSalt = generateSalt();
        const ansHash = hashPassword(secretAnswer.toLowerCase().trim(), ansSalt) + ':' + ansSalt;

        await wixData.update('MemberAuth', {
            ...auth,
            secretQuestion,
            secretAnswerHash: ansHash
        }, SA);

        return jsonOk({ message: 'Secret question set successfully.' });
    } catch (e) {
        return jsonErr(e.message, 500);
    }
}
export function options_signup_set_secret_qa(request) { return handleCors(); }

// ─────────────────────────────────────────
// PAYMENT CONFIRMATION AGENT ENDPOINT
// Called by email automation when a payment email with reg code is detected
// POST /payment_confirm_agent
// Body: { regCode, confirmedBy, emailGmailId, amount }
// ─────────────────────────────────────────

export async function post_payment_confirm_agent(request) {
    try {
        const body = await parseBody(request);
        const { regCode, confirmedBy = 'email_agent', emailGmailId, amount } = body;
        if (!regCode) return jsonErr('Missing regCode');

        const codeCleaned = regCode.trim().toUpperCase();

        const result = await wixData.query('MemberRegistrations')
            .eq('regCode', codeCleaned)
            .find(SA)
            .catch(() => ({ items: [] }));

        if (!result.items.length) {
            return jsonErr(`Registration code not found: ${codeCleaned}`);
        }

        const reg = result.items[0];

        if (reg.paymentConfirmed) {
            return jsonOk({ message: 'Payment already confirmed', regCode: codeCleaned, alreadyConfirmed: true });
        }

        await wixData.update('MemberRegistrations', {
            ...reg,
            paymentConfirmed: true,
            paymentConfirmedAt: new Date(),
            paymentConfirmedBy: confirmedBy,
            paymentGmailId: emailGmailId || null,
            paymentAmount: amount || reg.amount,
            status: 'payment_confirmed'
        }, SA);

        // Also log in Payments collection if it exists
        await wixData.insert('Payments', {
            email: reg.email,
            firstName: reg.firstName,
            lastName: reg.lastName,
            amount: amount || reg.amount,
            purpose: 'Membership Renewal',
            method: 'Zelle',
            status: 'paid',
            regCode: codeCleaned,
            confirmedBy,
            confirmedAt: new Date(),
            notes: emailGmailId ? `Gmail ID: ${emailGmailId}` : 'Confirmed by agent'
        }, SA).catch(() => {});

        return jsonOk({
            message: `Payment confirmed for ${reg.firstName} ${reg.lastName} (${reg.email})`,
            regCode: codeCleaned,
            email: reg.email,
            paymentConfirmed: true
        });

    } catch (e) {
        return jsonErr('Payment confirmation failed: ' + e.message, 500);
    }
}
export function options_payment_confirm_agent(request) { return handleCors(); }

// ─────────────────────────────────────────
// RESEND REG CODE / ZELLE INSTRUCTIONS
// POST /signup_resend_code
// Body: { email }
// ─────────────────────────────────────────

export async function post_signup_resend_code(request) {
    try {
        const body = await parseBody(request);
        const email = (body.email || '').toLowerCase().trim();
        if (!email) return jsonErr('Missing email');

        const result = await wixData.query('MemberRegistrations')
            .eq('email', email)
            .eq('status', 'pending_payment')
            .find(SA)
            .catch(() => ({ items: [] }));

        if (!result.items.length) return jsonErr('No pending registration found for this email.');

        const reg = result.items[0];
        const zelleInfo = buildZelleInstructions(reg.regCode, reg.firstName, reg.lastName, reg.amount);

        return jsonOk({
            message: 'Here is your registration code and payment instructions.',
            regCode: reg.regCode,
            zelle: zelleInfo,
            status: reg.status,
            expiresAt: reg.expiresAt
        });
    } catch (e) {
        return jsonErr(e.message, 500);
    }
}
export function options_signup_resend_code(request) { return handleCors(); }

// ─────────────────────────────────────────
// SIGN OUT
// POST /signout
// Body: { email, sessionToken }
// ─────────────────────────────────────────

export async function post_signout(request) {
    try {
        const body = await parseBody(request);
        const { email, sessionToken } = body;
        if (!email || !sessionToken) return jsonErr('Missing email or sessionToken');

        const result = await wixData.query('MemberSessions')
            .eq('email', email.toLowerCase())
            .eq('sessionToken', sessionToken)
            .find(SA)
            .catch(() => ({ items: [] }));

        if (result.items.length > 0) {
            await wixData.update('MemberSessions', { ...result.items[0], isActive: false }, SA).catch(() => {});
        }

        return jsonOk({ message: 'Signed out successfully.' });
    } catch (e) {
        return jsonErr(e.message, 500);
    }
}
export function options_signout(request) { return handleCors(); }

// ─────────────────────────────────────────
// VALIDATE SESSION (utility for other APIs or page loads)
// GET /validate_session?email=xxx&token=yyy
// ─────────────────────────────────────────

export async function get_validate_session(request) {
    try {
        const params = request.query || {};
        const email = (params.email || '').toLowerCase().trim();
        const token = params.token || params.sessionToken;
        if (!email || !token) return jsonErr('Missing email or token');

        const result = await wixData.query('MemberSessions')
            .eq('email', email)
            .eq('sessionToken', token)
            .eq('isActive', true)
            .find(SA)
            .catch(() => ({ items: [] }));

        if (!result.items.length) return jsonOk({ valid: false });

        const session = result.items[0];
        if (new Date(session.expiresAt) < new Date()) {
            await wixData.update('MemberSessions', { ...session, isActive: false }, SA).catch(() => {});
            return jsonOk({ valid: false, reason: 'expired' });
        }

        const memberResult = await wixData.query('CRMMembers')
            .eq('email', email)
            .find(SA)
            .catch(() => ({ items: [] }));

        const member = memberResult.items[0] || {};

        return jsonOk({
            valid: true,
            email,
            profile: {
                firstName: member.firstName || '',
                lastName: member.lastName || '',
                membershipType: member.membershipType || '',
                membershipStatus: member.membershipStatus || 'active'
            }
        });
    } catch (e) {
        return jsonErr(e.message, 500);
    }
}
export function options_validate_session(request) { return handleCors(); }
