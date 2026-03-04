// MemberSignup.js — BANF Member Signup Page
// Full workflow: Form → Reg Code → Zelle Payment → Password Setup → Welcome
// Mobile-responsive: uses wixWindow.formFactor to adjust layout

import wixLocation from 'wix-location';
import wixWindow from 'wix-window';
import { local as wixLocalStorage } from 'wix-storage';

const API_BASE = 'https://www.jaxbengali.org/_functions';

// ─── State ────────────────────────────────────────────────────
let currentStep = 'form';          // 'form' | 'payment' | 'complete' | 'done'
let currentRegCode = '';
let currentEmail = '';
let paymentPollInterval = null;
let isMobile = false;

// ─── Page Ready ───────────────────────────────────────────────

$w.onReady(async function () {
    isMobile = wixWindow.formFactor === 'Mobile';
    applyMobileLayout();

    // Show only the signup form step initially
    showStep('form');

    // Wire form submit button
    $w('#btnSubmitSignup').onClick(handleSignupSubmit);

    // Wire the "Already have an account?" link
    try { $w('#linkSignIn').onClick(() => wixLocation.to('/member-login')); } catch (_) {}

    // Wire resend code link on payment screen
    try { $w('#linkResendCode').onClick(handleResendCode); } catch (_) {}

    // Wire copy button for reg code
    try { $w('#btnCopyRegCode').onClick(handleCopyRegCode); } catch (_) {}

    // Wire complete-signup form submit
    try { $w('#btnCompleteSignup').onClick(handleCompleteSignup); } catch (_) {}

    // Wire password visibility toggle
    try {
        $w('#btnTogglePassword').onClick(() => {
            const pw = $w('#inputPassword');
            pw.inputType = pw.inputType === 'password' ? 'text' : 'password';
        });
    } catch (_) {}

    // If URL has regCode param (e.g., returning user with payment pending)
    const query = wixLocation.query || {};
    if (query.regCode) {
        currentRegCode = query.regCode;
        currentEmail = query.email || '';
        await checkAndLoadPendingPayment(query.regCode);
    }

    console.log('✅ MemberSignup page ready | mobile:', isMobile);
});

// ─── Mobile Layout ────────────────────────────────────────────

function applyMobileLayout() {
    if (!isMobile) return;

    // Compact header
    try { $w('#signupContainer').style.paddingTop = '12px'; } catch (_) {}
    try { $w('#signupTitle').style.fontSize = '20px'; }      catch (_) {}

    // Stack columns vertically on mobile (Wix responsive may override this)
    try { $w('#formColumns').style.flexDirection = 'column'; } catch (_) {}

    // Ensure main CTA buttons have Apple HIG 44px minimum
    ['#btnSubmitSignup', '#btnCompleteSignup', '#btnCopyRegCode',
     '#btnTogglePassword', '#linkResendCode'].forEach(id => {
        try {
            $w(id).style.minHeight = '44px';
            $w(id).style.width = '100%';
            $w(id).style.fontSize = '16px';
        } catch (_) {}
    });

    // Link buttons just need minimum height
    try { $w('#linkSignIn').style.padding = '8px 0'; }     catch (_) {}
    try { $w('#linkResendCode').style.padding = '8px 0'; } catch (_) {}

    // Input type hints for virtual keyboard
    try { $w('#inputFirstName').inputType = 'text'; }  catch (_) {}
    try { $w('#inputLastName').inputType  = 'text'; }  catch (_) {}
    try { $w('#inputEmail').inputType     = 'email'; } catch (_) {}
    // Note: Wix phone inputs natively use tel type; reinforcing:
    try { $w('#inputPhone').inputType     = 'tel'; }   catch (_) {}
    try { $w('#inputPassword').inputType  = 'password'; } catch (_) {}
    try { $w('#inputPassword2').inputType = 'password'; } catch (_) {}

    // Set readable font sizes on inputs
    ['#inputFirstName', '#inputLastName', '#inputEmail', '#inputPhone',
     '#inputPassword', '#inputPassword2', '#inputSecretAnswer'].forEach(id => {
        try { $w(id).style.fontSize = '16px'; } catch (_) {}
    });
}

// ─── Step Manager ─────────────────────────────────────────────

function showStep(step) {
    const steps = ['form', 'payment', 'complete', 'done'];
    steps.forEach(s => {
        try {
            const el = $w('#step_' + s);
            if (s === step) el.show(); else el.hide();
        } catch (_) {}
    });
    currentStep = step;

    // Scroll to top on step change
    try { wixWindow.scrollTo(0, 0); } catch (_) {
        // Fallback for non-Wix environments
        try { window.scrollTo(0, 0); } catch (_) {}
    }
}

// ─── STEP 1: Submit Signup Form ───────────────────────────────

async function handleSignupSubmit() {
    clearErrors();

    const firstName = ($w('#inputFirstName').value || '').trim();
    const lastName  = ($w('#inputLastName').value  || '').trim();
    const email     = ($w('#inputEmail').value     || '').trim().toLowerCase();
    const phone     = ($w('#inputPhone').value     || '').trim();
    const planEl    = $w('#dropdownPlan');
    const membershipType = planEl ? (planEl.value || 'family') : 'family';

    // Validate
    if (!firstName) { showFieldError('inputFirstName', 'First name is required'); return; }
    if (!lastName)  { showFieldError('inputLastName',  'Last name is required');  return; }
    if (!email || !email.includes('@')) { showFieldError('inputEmail', 'Valid email is required'); return; }

    setLoading(true, 'Checking registration...');

    try {
        const resp = await callApi('POST', '/signup_initiate', {
            firstName, lastName, email, phone, membershipType, workflowType: 'NM'
        });

        setLoading(false);

        if (!resp.ok) {
            if (resp.status === 409) {
                showGlobalError('An account already exists with this email. <a href="/member-login">Sign in instead →</a>');
            } else {
                showGlobalError(resp.data?.error || 'Registration failed. Please try again.');
            }
            return;
        }

        const data = resp.data;
        currentRegCode = data.regCode;
        currentEmail   = email;

        // Populate payment screen
        populatePaymentScreen(data, firstName, lastName);
        showStep('payment');

        // Start polling for payment confirmation
        startPaymentPolling(data.regCode);

    } catch (e) {
        setLoading(false);
        showGlobalError('Network error. Please check your connection and try again.');
        console.error('Signup initiate error:', e);
    }
}

// ─── STEP 2: Payment Screen ───────────────────────────────────

function populatePaymentScreen(data, firstName, lastName) {
    const z = data.zelle;
    if (!z) return;

    try { $w('#textRegCode').text      = data.regCode; }         catch (_) {}
    try { $w('#textZelleEmail').text   = z.zelleEmail; }         catch (_) {}
    try { $w('#textPayAmount').text    = `$${z.amount}.00`; }    catch (_) {}
    try { $w('#textMemberName').text   = `${firstName} ${lastName}`; } catch (_) {}
    try { $w('#textZelloMemo').text    = z.memo; }               catch (_) {}
    try { $w('#textEmailSubject').text = z.subject; }            catch (_) {}

    // Instructions list
    const instrText = (z.instructions || []).join('\n');
    try { $w('#textInstructions').text = instrText; } catch (_) {}

    // QR code: use a QR image element if available
    try {
        const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(z.zelleDeepLink || z.zelleEmail)}`;
        $w('#imageQRCode').src = qrUrl;
    } catch (_) {}

    // Timer display
    if (data.expiresAt) {
        try {
            const exp = new Date(data.expiresAt);
            $w('#textExpiry').text = `Registration expires: ${exp.toLocaleDateString()} ${exp.toLocaleTimeString()}`;
        } catch (_) {}
    }
}

function startPaymentPolling(regCode) {
    if (paymentPollInterval) clearInterval(paymentPollInterval);
    let pollCount = 0;

    paymentPollInterval = setInterval(async () => {
        pollCount++;
        try {
            const resp = await callApi('GET', `/signup_status?regCode=${encodeURIComponent(regCode)}`);
            if (resp.ok && resp.data?.status === 'payment_confirmed') {
                clearInterval(paymentPollInterval);
                showStep('complete');
                populateCompleteForm();
            }
        } catch (_) {}

        // Stop polling after 24 hours worth of 30s polls (2880 attempts)
        if (pollCount > 2880) clearInterval(paymentPollInterval);
    }, 30000); // poll every 30 seconds
}

async function handleResendCode() {
    if (!currentEmail) return;
    try {
        const resp = await callApi('POST', '/signup_resend_code', { email: currentEmail });
        if (resp.ok && resp.data?.regCode) {
            populatePaymentScreen(resp.data, '', '');
        }
    } catch (_) {}
}

function handleCopyRegCode() {
    try {
        const code = $w('#textRegCode').text;
        if (navigator.clipboard) {
            navigator.clipboard.writeText(code).then(() => {
                try { $w('#btnCopyRegCode').label = '✅ Copied!'; } catch (_) {}
                setTimeout(() => {
                    try { $w('#btnCopyRegCode').label = '📋 Copy Code'; } catch (_) {}
                }, 2000);
            });
        }
    } catch (_) {}
}

// ─── STEP 3: Complete Signup (after payment confirmed) ────────

function populateCompleteForm() {
    try { $w('#textCompleteEmail').text = currentEmail; } catch (_) {}
    try { $w('#textCompleteRegCode').text = currentRegCode; } catch (_) {}

    // Populate secret question options
    const questions = [
        "What was the name of your first pet?",
        "What city were you born in?",
        "What is your mother's maiden name?",
        "What was the name of your elementary school?",
        "What was your childhood nickname?"
    ];
    try {
        $w('#dropdownSecretQuestion').options = questions.map(q => ({ label: q, value: q }));
    } catch (_) {}
}

async function handleCompleteSignup() {
    clearErrors();

    const password  = ($w('#inputPassword').value   || '').trim();
    const password2 = ($w('#inputPassword2').value  || '').trim();
    const secretQ   = (() => { try { return $w('#dropdownSecretQuestion').value; } catch (_) { return ''; } })();
    const secretA   = ($w('#inputSecretAnswer').value  || '').trim();

    if (!password || password.length < 8) {
        showFieldError('inputPassword', 'Password must be at least 8 characters');
        return;
    }
    if (password !== password2) {
        showFieldError('inputPassword2', 'Passwords do not match');
        return;
    }
    if (!secretQ) {
        showGlobalError('Please select a secret question');
        return;
    }
    if (!secretA) {
        showFieldError('inputSecretAnswer', 'Please provide an answer');
        return;
    }

    setLoading(true, 'Completing your registration...');

    try {
        const resp = await callApi('POST', '/signup_complete', {
            regCode: currentRegCode,
            password,
            secretQuestion: secretQ,
            secretAnswer: secretA
        });

        setLoading(false);

        if (!resp.ok) {
            showGlobalError(resp.data?.error || 'Could not complete signup. Please try again.');
            return;
        }

        const data = resp.data;

        // Save session to local storage
        try {
            wixLocalStorage.setItem('banf_session_token', data.sessionToken);
            wixLocalStorage.setItem('banf_member_email', data.email);
            wixLocalStorage.setItem('banf_member_name', `${data.firstName} ${data.lastName}`);
        } catch (_) {}

        // Show welcome screen
        try { $w('#textWelcomeName').text = `Welcome, ${data.firstName}!`; } catch (_) {}
        try { $w('#textWelcomeEmail').text = data.email; } catch (_) {}
        showStep('done');

        // Redirect to member portal after 3 seconds
        setTimeout(() => wixLocation.to('/member-portal'), 3000);

    } catch (e) {
        setLoading(false);
        showGlobalError('Network error. Please try again.');
        console.error('Complete signup error:', e);
    }
}

// ─── PRE-LOAD PENDING PAYMENT (deep link with regCode) ────────

async function checkAndLoadPendingPayment(regCode) {
    try {
        const resp = await callApi('GET', `/signup_status?regCode=${encodeURIComponent(regCode)}`);
        if (!resp.ok) return;

        const data = resp.data;
        if (data.status === 'completed') {
            showGlobalError('This registration is already complete. Please sign in.');
            setTimeout(() => wixLocation.to('/member-login'), 2500);
            return;
        }
        if (data.status === 'payment_confirmed') {
            showStep('complete');
            currentEmail = data.email;
            populateCompleteForm();
            return;
        }
        if (data.status === 'pending_payment') {
            // Reconstruct payment screen
            populatePaymentScreen(data, data.firstName, data.lastName);
            showStep('payment');
            startPaymentPolling(regCode);
        }
    } catch (_) {}
}

// ─── HELPERS ──────────────────────────────────────────────────

async function callApi(method, path, body) {
    const options = {
        method,
        headers: { 'Content-Type': 'application/json' }
    };
    if (body) options.body = JSON.stringify(body);

    const resp = await fetch(API_BASE + path, options);
    let data = {};
    try { data = await resp.json(); } catch (_) {}
    return { ok: resp.ok, status: resp.status, data };
}

function setLoading(on, msg = '') {
    try {
        if (on) {
            $w('#btnSubmitSignup').disable();
            $w('#textStatusMsg').text = msg;
            $w('#textStatusMsg').show();
        } else {
            $w('#btnSubmitSignup').enable();
            $w('#textStatusMsg').text = '';
            $w('#textStatusMsg').hide();
        }
    } catch (_) {}
}

function clearErrors() {
    try { $w('#textGlobalError').hide(); } catch (_) {}
    ['inputFirstName', 'inputLastName', 'inputEmail', 'inputPhone',
     'inputPassword', 'inputPassword2', 'inputSecretAnswer'].forEach(id => {
        try { $w(`#error_${id}`).hide(); } catch (_) {}
    });
}

function showFieldError(fieldId, msg) {
    try { $w(`#error_${fieldId}`).text = msg; $w(`#error_${fieldId}`).show(); } catch (_) {}
}

function showGlobalError(htmlMsg) {
    try {
        const el = $w('#textGlobalError');
        el.html = htmlMsg;
        el.show();
    } catch (_) {
        try { $w('#textGlobalError').text = htmlMsg; $w('#textGlobalError').show(); } catch (_) {}
    }
}
