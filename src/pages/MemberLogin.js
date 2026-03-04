// MemberLogin.js — BANF Member Sign-In Page
// Workflow: Sign In | Forgot Password (secret Q) | Reset Password
// Mobile-responsive: adapts layout for small screens

import wixLocation from 'wix-location';
import wixWindow from 'wix-window';
import { local as wixLocalStorage } from 'wix-storage';

const API_BASE = 'https://www.jaxbengali.org/_functions';

// ─── State ────────────────────────────────────────────────────
let currentStep = 'signin';    // 'signin' | 'forgot_question' | 'reset_password' | 'done'
let forgotEmail = '';
let resetToken  = '';
let isMobile    = false;

// ─── Page Ready ───────────────────────────────────────────────

$w.onReady(async function () {
    isMobile = wixWindow.formFactor === 'Mobile';
    applyMobileLayout();

    // Check if already logged in
    const savedToken = wixLocalStorage.getItem('banf_session_token');
    const savedEmail = wixLocalStorage.getItem('banf_member_email');
    if (savedToken && savedEmail) {
        const valid = await validateSession(savedEmail, savedToken);
        if (valid) {
            wixLocation.to('/member-portal');
            return;
        }
        // Expired session — clear it
        wixLocalStorage.removeItem('banf_session_token');
        wixLocalStorage.removeItem('banf_member_email');
        wixLocalStorage.removeItem('banf_member_name');
    }

    showStep('signin');

    // Wire buttons
    $w('#btnSignIn').onClick(handleSignIn);
    try { $w('#linkForgotPassword').onClick(handleForgotPasswordClick); } catch (_) {}
    try { $w('#linkCreateAccount').onClick(() => wixLocation.to('/member-signup')); } catch (_) {}
    try { $w('#btnVerifySecretAnswer').onClick(handleVerifySecretAnswer); } catch (_) {}
    try { $w('#btnResetPassword').onClick(handleResetPassword); } catch (_) {}
    try { $w('#btnBackToSignin').onClick(() => showStep('signin')); } catch (_) {}

    // Password visibility toggle
    try {
        $w('#btnTogglePassword').onClick(() => {
            const pw = $w('#inputPassword');
            pw.inputType = pw.inputType === 'password' ? 'text' : 'password';
        });
    } catch (_) {}

    console.log('✅ MemberLogin page ready | mobile:', isMobile);
});

// ─── Mobile Layout ────────────────────────────────────────────

function applyMobileLayout() {
    if (!isMobile) return;

    // Compact card layout
    try { $w('#loginContainer').style.padding = '12px'; }  catch (_) {}
    try { $w('#loginTitle').style.fontSize = '22px'; }     catch (_) {}
    try { $w('#loginCard').style.maxWidth = '100%'; }      catch (_) {}

    // Ensure all CTA buttons are tall enough for Apple HIG (44px)
    ['#btnSignIn', '#btnVerifySecretAnswer', '#btnResetPassword'].forEach(id => {
        try {
            $w(id).style.minHeight = '48px';
            $w(id).style.width = '100%';
            $w(id).style.fontSize = '16px';
        } catch (_) {}
    });

    // Password toggle: needs to be a visible target
    try {
        $w('#btnTogglePassword').style.minHeight = '44px';
        $w('#btnTogglePassword').style.minWidth = '44px';
    } catch (_) {}

    // Forgot password link: bigger touch target
    try { $w('#linkForgotPassword').style.padding = '8px 0'; } catch (_) {}
    try { $w('#linkCreateAccount').style.padding = '8px 0';   } catch (_) {}
    try { $w('#linkSignIn').style.padding = '8px 0';          } catch (_) {}

    // Set email input type hint (Wix handles keyboard hint via inputType)
    try { $w('#inputEmail').inputType = 'email'; }    catch (_) {}

    // Ensure inputs are readable size (Wix enforces 16px natively but set explicitly)
    try { $w('#inputEmail').style.fontSize    = '16px'; } catch (_) {}
    try { $w('#inputPassword').style.fontSize = '16px'; } catch (_) {}
}

// ─── Step Manager ─────────────────────────────────────────────

function showStep(step) {
    const steps = ['signin', 'forgot_question', 'reset_password', 'done'];
    steps.forEach(s => {
        try {
            const el = $w('#step_' + s);
            if (s === step) el.show(); else el.hide();
        } catch (_) {}
    });
    currentStep = step;
    clearErrors();
    // Scroll to top on step change — essential on mobile where form is long
    try { wixWindow.scrollTo(0, 0); } catch (_) {}
}

// ─── SIGN IN ──────────────────────────────────────────────────

async function handleSignIn() {
    clearErrors();

    const email    = ($w('#inputEmail').value    || '').trim().toLowerCase();
    const password = ($w('#inputPassword').value || '');

    if (!email || !email.includes('@')) {
        showFieldError('inputEmail', 'Please enter a valid email');
        return;
    }
    if (!password) {
        showFieldError('inputPassword', 'Password is required');
        return;
    }

    setLoading(true, '#btnSignIn', 'Signing in...');

    try {
        const resp = await callApi('POST', '/signin', { email, password });
        setLoading(false, '#btnSignIn', 'Sign In');

        if (!resp.ok) {
            const msg = resp.data?.error || 'Invalid email or password.';
            showGlobalError(msg);
            return;
        }

        const data = resp.data;

        // Persist session
        try {
            wixLocalStorage.setItem('banf_session_token', data.sessionToken);
            wixLocalStorage.setItem('banf_member_email', data.email);
            wixLocalStorage.setItem('banf_member_name', `${data.profile?.firstName || ''} ${data.profile?.lastName || ''}`.trim());
        } catch (_) {}

        // Show welcome flash then redirect
        try { $w('#textWelcomeBack').text = `Welcome back, ${data.profile?.firstName || data.email}!`; $w('#textWelcomeBack').show(); } catch (_) {}
        showStep('done');
        setTimeout(() => wixLocation.to('/member-portal'), 2000);

    } catch (e) {
        setLoading(false, '#btnSignIn', 'Sign In');
        showGlobalError('Network error. Please try again.');
        console.error('SignIn error:', e);
    }
}

// ─── FORGOT PASSWORD ──────────────────────────────────────────

async function handleForgotPasswordClick() {
    const email = ($w('#inputEmail').value || '').trim().toLowerCase();

    if (!email || !email.includes('@')) {
        showFieldError('inputEmail', 'Enter your email first, then click Forgot Password');
        return;
    }

    forgotEmail = email;
    setLoading(true, '#btnSignIn', 'Loading...');

    try {
        const resp = await callApi('GET', `/forgot_password?email=${encodeURIComponent(email)}`);
        setLoading(false, '#btnSignIn', 'Sign In');

        if (!resp.ok) {
            showGlobalError(resp.data?.error || 'No account found for this email.');
            return;
        }

        const data = resp.data;
        if (!data.hasSecretQuestion || !data.secretQuestion) {
            showGlobalError('No secret question set for this account. Please contact admin at banfjax@gmail.com');
            return;
        }

        // Show the secret question step
        try { $w('#textSecretQuestion').text = data.secretQuestion; } catch (_) {}
        try { $w('#textForgotEmail').text = email; } catch (_) {}
        showStep('forgot_question');

    } catch (e) {
        setLoading(false, '#btnSignIn', 'Sign In');
        showGlobalError('Network error. Please try again.');
    }
}

async function handleVerifySecretAnswer() {
    clearErrors();
    const answer = ($w('#inputSecretAnswer').value || '').trim();

    if (!answer) {
        showFieldError('inputSecretAnswer', 'Please enter your answer');
        return;
    }

    setLoading(true, '#btnVerifySecretAnswer', 'Verifying...');

    try {
        const resp = await callApi('POST', '/forgot_password_verify', {
            email: forgotEmail,
            secretAnswer: answer
        });

        setLoading(false, '#btnVerifySecretAnswer', 'Verify Answer');

        if (!resp.ok) {
            showGlobalError(resp.data?.error || 'Incorrect answer. Please try again.');
            return;
        }

        resetToken = resp.data.resetToken;
        try { $w('#textResetEmail').text = forgotEmail; } catch (_) {}
        showStep('reset_password');

    } catch (e) {
        setLoading(false, '#btnVerifySecretAnswer', 'Verify Answer');
        showGlobalError('Network error. Please try again.');
    }
}

async function handleResetPassword() {
    clearErrors();

    const newPass  = ($w('#inputNewPassword').value  || '');
    const newPass2 = ($w('#inputNewPassword2').value || '');

    if (!newPass || newPass.length < 8) {
        showFieldError('inputNewPassword', 'Password must be at least 8 characters');
        return;
    }
    if (newPass !== newPass2) {
        showFieldError('inputNewPassword2', 'Passwords do not match');
        return;
    }

    setLoading(true, '#btnResetPassword', 'Resetting...');

    try {
        const resp = await callApi('POST', '/reset_password', {
            email: forgotEmail,
            resetToken,
            newPassword: newPass
        });

        setLoading(false, '#btnResetPassword', 'Reset Password');

        if (!resp.ok) {
            showGlobalError(resp.data?.error || 'Password reset failed. Please start over.');
            return;
        }

        showGlobalSuccess('Password reset successfully! Redirecting to sign in...');
        setTimeout(() => {
            showStep('signin');
            try { $w('#inputEmail').value = forgotEmail; } catch (_) {}
        }, 2500);

    } catch (e) {
        setLoading(false, '#btnResetPassword', 'Reset Password');
        showGlobalError('Network error. Please try again.');
    }
}

// ─── SESSION VALIDATION ───────────────────────────────────────

async function validateSession(email, token) {
    try {
        const resp = await callApi('GET', `/validate_session?email=${encodeURIComponent(email)}&token=${encodeURIComponent(token)}`);
        return resp.ok && resp.data?.valid === true;
    } catch (_) {
        return false;
    }
}

// ─── HELPERS ──────────────────────────────────────────────────

async function callApi(method, path, body) {
    const options = { method, headers: { 'Content-Type': 'application/json' } };
    if (body) options.body = JSON.stringify(body);
    const resp = await fetch(API_BASE + path, options);
    let data = {};
    try { data = await resp.json(); } catch (_) {}
    return { ok: resp.ok, status: resp.status, data };
}

function setLoading(on, btnId, label) {
    try {
        const btn = $w(btnId);
        if (on) { btn.disable(); btn.label = label; }
        else    { btn.enable();  btn.label = label; }
    } catch (_) {}
}

function clearErrors() {
    try { $w('#textGlobalError').hide();   } catch (_) {}
    try { $w('#textGlobalSuccess').hide(); } catch (_) {}
    ['inputEmail', 'inputPassword', 'inputSecretAnswer', 'inputNewPassword', 'inputNewPassword2'].forEach(id => {
        try { $w(`#error_${id}`).hide(); } catch (_) {}
    });
}

function showFieldError(fieldId, msg) {
    try { $w(`#error_${fieldId}`).text = msg; $w(`#error_${fieldId}`).show(); } catch (_) {}
}

function showGlobalError(msg) {
    try { $w('#textGlobalError').text = msg; $w('#textGlobalError').show(); } catch (_) {}
}

function showGlobalSuccess(msg) {
    try { $w('#textGlobalSuccess').text = msg; $w('#textGlobalSuccess').show(); } catch (_) {}
}
