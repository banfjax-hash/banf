// ═══════════════════════════════════════════════
//  BANF v2 — Shared JavaScript
//  Common utilities, CRM fetch, login modals,
//  navbar behaviour, footer hydration
// ═══════════════════════════════════════════════

// ── Utility: escape HTML entities ──
function esc(str) {
    if (str == null) return '';
    var s = String(str);
    var div = document.createElement('div');
    div.appendChild(document.createTextNode(s));
    return div.innerHTML;
}

// ── Utility: safe HTML setter ──
function setHTML(id, html) {
    var el = document.getElementById(id);
    if (el) el.innerHTML = html;
}

// ── CRM API Base ──
var API_BASE = window.location.hostname.includes('wixsite.com')
    ? '/_functions'
    : 'https://www.jaxbengali.org/_functions';

// ── Member Portal Navigation ──
function openMemberPortal(section) {
    var portalFn = 'https://www.jaxbengali.org/_functions/member_portal';
    var routeParam = section ? '?route=' + encodeURIComponent(section) : '';
    window.open(portalFn + routeParam, '_blank');
}

// ── EC Admin Login Modal ──
function openEcLoginModal() {
    var overlay = document.getElementById('ecLoginOverlay');
    overlay.classList.add('show');
    document.getElementById('ecLoginError').style.display = 'none';
    document.getElementById('ecLoginEmail').value = '';
    document.getElementById('ecLoginPassword').value = '';
    // Reset to login form view
    var form = overlay.querySelector('form');
    if (form) form.style.display = '';
    var signupMsg = document.getElementById('ecSignupNotice');
    if (signupMsg) signupMsg.style.display = 'none';
    document.getElementById('ecLoginEmail').focus();
}
function closeEcLogin() { document.getElementById('ecLoginOverlay').classList.remove('show'); }
function handleEcLogin(e) {
    e.preventDefault();
    var email = document.getElementById('ecLoginEmail').value.trim();
    var password = document.getElementById('ecLoginPassword').value;
    var errEl = document.getElementById('ecLoginError');
    errEl.style.display = 'none';

    // First try signup-check: if admin_signup_direct returns "already has a password"
    // that means the account exists and is set up — just verify login.
    var portalFn = 'https://www.jaxbengali.org/_functions/admin_verify_login';
    fetch(portalFn, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email, password: password })
    }).then(function(r) { return r.json(); }).then(function(data) {
        if (data && data.success) {
            closeEcLogin();
            window.open('https://www.jaxbengali.org/_functions/ec_admin_portal', '_blank');
        } else if (data && data.needsOnboarding) {
            errEl.style.display = 'block';
            errEl.innerHTML = '<i class="fas fa-info-circle me-1"></i>Your account setup is not yet complete. <a href="../ec-admin-login.html#signup" target="_blank" style="color:var(--gold);text-decoration:underline;">Complete Sign Up</a>';
        } else {
            errEl.style.display = 'block';
            errEl.innerHTML = '<i class="fas fa-exclamation-circle me-1"></i>' + ((data && (data.message || data.error)) || 'Invalid credentials. EC members only.');
        }
    }).catch(function() {
        errEl.style.display = 'block';
        errEl.innerHTML = '<i class="fas fa-exclamation-circle me-1"></i>Login service temporarily unavailable. Please try again later.';
    });
    return false;
}
// EC Signup: check if already signed up, redirect appropriately
function handleEcSignup(e) {
    if (e) e.preventDefault();
    var email = document.getElementById('ecLoginEmail').value.trim();
    var errEl = document.getElementById('ecLoginError');
    if (!email) {
        errEl.style.display = 'block';
        errEl.innerHTML = '<i class="fas fa-exclamation-circle me-1"></i>Please enter your EC email address first.';
        return false;
    }
    errEl.style.display = 'none';
    fetch('https://www.jaxbengali.org/_functions/admin_signup_direct', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email })
    }).then(function(r) { return r.json(); }).then(function(data) {
        if (data && data.success) {
            // Not yet signed up — redirect to onboarding with token
            window.open('../ec-admin-login.html#signup', '_blank');
        } else if (data && data.error && data.error.indexOf('already has a password') !== -1) {
            // Already signed up — show message
            var overlay = document.getElementById('ecLoginOverlay');
            var signupMsg = document.getElementById('ecSignupNotice');
            if (signupMsg) {
                signupMsg.style.display = 'block';
                signupMsg.innerHTML = '<div style="padding:1rem;background:linear-gradient(135deg,#f0fdf4,#dcfce7);border-radius:12px;border:1px solid rgba(34,197,94,0.3);text-align:center;">' +
                    '<i class="fas fa-check-circle" style="color:#16a34a;font-size:1.5rem;"></i>' +
                    '<p style="margin:0.5rem 0 0;color:var(--navy);font-weight:600;">You are already signed up!</p>' +
                    '<p style="margin:0.3rem 0 0;color:#6c757d;font-size:0.85rem;">Please use the login form above with your email and password.</p></div>';
            }
        } else {
            errEl.style.display = 'block';
            errEl.innerHTML = '<i class="fas fa-exclamation-circle me-1"></i>' + ((data && data.error) || 'Sign up failed. Contact the Super Admin.');
        }
    }).catch(function() {
        errEl.style.display = 'block';
        errEl.innerHTML = '<i class="fas fa-exclamation-circle me-1"></i>Service temporarily unavailable.';
    });
    return false;
}

// ── Member Login Modal ──
// Gate: check membership drive status before showing credentials
function openMemberLoginModal() {
    var overlay = document.getElementById('memberLoginOverlay');
    overlay.classList.add('show');
    var errEl = document.getElementById('memberLoginError');
    errEl.style.display = 'none';
    var form = overlay.querySelector('form');
    var driveMsg = document.getElementById('memberDriveNotice');

    // Check drive status
    fetch('https://www.jaxbengali.org/_functions/ec_year_status')
        .then(function(r) { return r.json(); })
        .then(function(data) {
            if (data && data.driveEnabled) {
                // Drive is active — show login form
                if (form) form.style.display = '';
                if (driveMsg) driveMsg.style.display = 'none';
                document.getElementById('memberLoginEmail').value = '';
                document.getElementById('memberLoginPassword').value = '';
                document.getElementById('memberLoginEmail').focus();
            } else {
                // Drive not started — hide form, show notice
                if (form) form.style.display = 'none';
                if (driveMsg) {
                    driveMsg.style.display = 'block';
                    driveMsg.innerHTML = '<div style="padding:1.5rem;background:linear-gradient(135deg,#fffbeb,#fef3c7);border-radius:12px;border:1px solid rgba(245,158,11,0.3);text-align:center;">' +
                        '<i class="fas fa-clock" style="color:#d97706;font-size:2rem;"></i>' +
                        '<h4 style="margin:0.8rem 0 0.4rem;color:var(--navy);">Membership Drive Not Yet Started</h4>' +
                        '<p style="margin:0;color:#6c757d;font-size:0.9rem;">The President has not yet launched the member onboarding drive for the current fiscal year.</p>' +
                        '<p style="margin:0.5rem 0 0;color:#6c757d;font-size:0.85rem;">Please check back later or contact the BANF Executive Committee for updates.</p></div>';
                }
            }
        })
        .catch(function() {
            // Network error — show form anyway as fallback
            if (form) form.style.display = '';
            if (driveMsg) driveMsg.style.display = 'none';
            document.getElementById('memberLoginEmail').value = '';
            document.getElementById('memberLoginPassword').value = '';
            document.getElementById('memberLoginEmail').focus();
        });
}
function closeMemberLogin() { document.getElementById('memberLoginOverlay').classList.remove('show'); }
function handleMemberLogin(e) {
    e.preventDefault();
    var email = document.getElementById('memberLoginEmail').value;
    var password = document.getElementById('memberLoginPassword').value;
    var portalFn = 'https://www.jaxbengali.org/_functions/member_login';
    fetch(portalFn, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email, password: password })
    }).then(function(r) { return r.json(); }).then(function(data) {
        if (data && data.success) {
            closeMemberLogin();
            window.open(data.redirectUrl || 'https://www.jaxbengali.org/_functions/member_portal', '_blank');
        } else {
            var errEl = document.getElementById('memberLoginError');
            errEl.style.display = 'block';
            errEl.innerHTML = '<i class="fas fa-exclamation-circle me-1"></i>' + ((data && data.message) || 'Invalid credentials. Please check your email and password.');
        }
    }).catch(function() {
        var errEl = document.getElementById('memberLoginError');
        errEl.style.display = 'block';
        errEl.innerHTML = '<i class="fas fa-exclamation-circle me-1"></i>Login service temporarily unavailable. Please try again later.';
    });
    return false;
}

// ── Editor Login Modal ──
// Gate: editor signup drive must be started by president first
function openEditorLoginModal() {
    var overlay = document.getElementById('editorLoginOverlay');
    overlay.classList.add('show');
    var form = overlay.querySelector('form');
    var driveMsg = document.getElementById('editorDriveNotice');

    // For now, editor signup drive is never started — always show notice
    if (form) form.style.display = 'none';
    if (driveMsg) {
        driveMsg.style.display = 'block';
        driveMsg.innerHTML = '<div style="padding:1.5rem;background:linear-gradient(135deg,#f0f9ff,#e0f2fe);border-radius:12px;border:1px solid rgba(59,130,246,0.3);text-align:center;">' +
            '<i class="fas fa-pen-nib" style="color:#2563eb;font-size:2rem;"></i>' +
            '<h4 style="margin:0.8rem 0 0.4rem;color:var(--navy);">Editor Sign-Up Drive Not Yet Started</h4>' +
            '<p style="margin:0;color:#6c757d;font-size:0.9rem;">The President has not yet initiated the editor selection and sign-up process.</p>' +
            '<p style="margin:0.5rem 0 0;color:#6c757d;font-size:0.85rem;">Once started, the President will select an editor from the community and send a sign-up invitation via email.</p>' +
            '<p style="margin:0.5rem 0 0;color:#6c757d;font-size:0.8rem;"><i class="fas fa-info-circle me-1"></i>The invitation email will contain your unique sign-up link.</p></div>';
    }
}
function closeEditorLogin() { document.getElementById('editorLoginOverlay').classList.remove('show'); }

// ── Close modals on Escape ──
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        closeEcLogin();
        closeMemberLogin();
        closeEditorLogin();
    }
});

// ── Mobile nav: close on link click ──
document.addEventListener('DOMContentLoaded', function() {
    document.querySelectorAll('#nav-links a').forEach(function(a) {
        a.addEventListener('click', function() {
            document.getElementById('nav-links').classList.remove('show');
        });
    });
});

// ── Navbar hide/show on scroll ──
(function() {
    var lastScroll = 0;
    var nav = document.getElementById('banf-nav');
    if (!nav) return;
    window.addEventListener('scroll', function() {
        var cur = window.scrollY;
        if (cur > 300 && cur > lastScroll) {
            nav.style.transform = 'translateY(-100%)';
        } else {
            nav.style.transform = 'translateY(0)';
        }
        lastScroll = cur;
    });
    nav.style.transition = 'transform 0.3s ease';
})();

// ── Footer CRM Hydration ──
function hydrateFooter(siteContent) {
    if (!siteContent) return;
    var c = siteContent;
    var footerContent = document.getElementById('footer-content');
    if (footerContent) {
        footerContent.innerHTML =
            '<div class="footer-section">' +
                '<h5>About BANF</h5>' +
                '<p>' + esc(c.footerTagline || '') + '</p>' +
                '<div class="social-links">' +
                    (c.facebookUrl  ? '<a href="' + esc(c.facebookUrl) + '" class="social-link"><i class="fab fa-facebook-f"></i></a>' : '') +
                    (c.instagramUrl ? '<a href="' + esc(c.instagramUrl) + '" class="social-link"><i class="fab fa-instagram"></i></a>' : '') +
                    (c.youtubeUrl   ? '<a href="' + esc(c.youtubeUrl) + '" class="social-link"><i class="fab fa-youtube"></i></a>' : '') +
                    (c.linkedinUrl  ? '<a href="' + esc(c.linkedinUrl) + '" class="social-link"><i class="fab fa-linkedin-in"></i></a>' : '') +
                    (c.whatsappUrl  ? '<a href="' + esc(c.whatsappUrl) + '" class="social-link"><i class="fab fa-whatsapp"></i></a>' : '') +
                '</div>' +
            '</div>' +
            '<div class="footer-section">' +
                '<h5>Quick Links</h5>' +
                '<a href="events.html"><i class="fas fa-calendar me-2"></i>Events</a>' +
                '<a href="membership.html"><i class="fas fa-users me-2"></i>Membership</a>' +
                '<a href="leadership.html"><i class="fas fa-user-tie me-2"></i>Leadership</a>' +
                '<a href="gallery.html#contact"><i class="fas fa-envelope me-2"></i>Contact</a>' +
            '</div>' +
            '<div class="footer-section">' +
                '<h5>Members Portal</h5>' +
                '<a href="#" onclick="openMemberLoginModal(); return false;"><i class="fas fa-sign-in-alt me-2"></i>Member Login</a>' +
                '<a href="#" onclick="openEcLoginModal(); return false;"><i class="fas fa-user-shield me-2"></i>EC Admin Login</a>' +
                '<a href="#" onclick="openEditorLoginModal(); return false;"><i class="fas fa-pen-nib me-2"></i>Editor Login</a>' +
            '</div>' +
            '<div class="footer-section">' +
                '<h5>Resources</h5>' +
                '<a href="events.html#radio"><i class="fas fa-radio me-2"></i>BANF Radio</a>' +
                '<a href="jagriti.html"><i class="fas fa-book me-2"></i>Jagriti Magazine</a>' +
                '<a href="gallery.html"><i class="fas fa-images me-2"></i>Photo Gallery</a>' +
            '</div>' +
            '<div class="footer-section">' +
                '<h5>Contact Info</h5>' +
                '<p><i class="fas fa-envelope me-2"></i>' + esc(c.contactEmail || '') + '</p>' +
                '<p><i class="fas fa-map-marker-alt me-2"></i>' + esc(c.contactLocation || '') + '</p>' +
                '<p><i class="fas fa-globe me-2"></i>' + esc(c.contactWebsite || '') + '</p>' +
            '</div>';
    }

    var footerBottom = document.getElementById('footer-bottom');
    if (footerBottom && c.footerCopyright) {
        footerBottom.innerHTML =
            '<div style="margin-bottom: 1rem;">' +
                '<img src="../banf-logo.jpg" alt="BANF Logo" style="height: 60px; width: auto; border-radius: 6px; box-shadow: 0 2px 10px rgba(0,0,0,0.3);">' +
            '</div>' +
            '<p>' + esc(c.footerCopyright) + '</p>';
    }
}

// ── Shared CRM Fetch (runs on every page) ──
document.addEventListener('DOMContentLoaded', async function() {
    try {
        var resp = await fetch(API_BASE + '/landing_data');
        if (!resp.ok) throw new Error('HTTP ' + resp.status);
        var json = await resp.json();
        if (!json.success || !json.data) throw new Error('Invalid response');
        var d = json.data;

        // Footer hydration
        if (d.siteContent) hydrateFooter(d.siteContent);

        // Dispatch event so page-specific scripts can use CRM data
        window.dispatchEvent(new CustomEvent('banf-crm-data', { detail: d }));

        console.log('[BANF v2] CRM data loaded at', json.timestamp);
    } catch (err) {
        console.warn('[BANF v2] CRM fetch failed, using defaults:', err.message);
    }
});
