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
    document.getElementById('ecLoginOverlay').classList.add('show');
    document.getElementById('ecLoginError').style.display = 'none';
    document.getElementById('ecLoginEmail').value = '';
    document.getElementById('ecLoginPassword').value = '';
    document.getElementById('ecLoginEmail').focus();
}
function closeEcLogin() { document.getElementById('ecLoginOverlay').classList.remove('show'); }
function handleEcLogin(e) {
    e.preventDefault();
    var email = document.getElementById('ecLoginEmail').value;
    var password = document.getElementById('ecLoginPassword').value;
    var portalFn = 'https://www.jaxbengali.org/_functions/ec_admin_login';
    fetch(portalFn, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email, password: password })
    }).then(function(r) { return r.json(); }).then(function(data) {
        if (data && data.success) {
            closeEcLogin();
            window.open(data.redirectUrl || 'https://www.jaxbengali.org/_functions/ec_admin_portal', '_blank');
        } else {
            document.getElementById('ecLoginError').style.display = 'block';
            document.getElementById('ecLoginError').textContent = (data && data.message) || 'Invalid credentials. EC members only.';
        }
    }).catch(function() {
        document.getElementById('ecLoginError').style.display = 'block';
        document.getElementById('ecLoginError').textContent = 'Login service temporarily unavailable. Please try again later.';
    });
    return false;
}

// ── Member Login Modal ──
function openMemberLoginModal() {
    document.getElementById('memberLoginOverlay').classList.add('show');
    document.getElementById('memberLoginError').style.display = 'none';
    document.getElementById('memberLoginEmail').value = '';
    document.getElementById('memberLoginPassword').value = '';
    document.getElementById('memberLoginEmail').focus();
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

// ── Close modals on Escape ──
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        closeEcLogin();
        closeMemberLogin();
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
