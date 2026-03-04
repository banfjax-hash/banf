// masterPage/index.js
// Site-level code: runs on every page
// Handles: mobile navigation, session validation, global header behavior

import wixLocation from 'wix-location';
import wixWindow from 'wix-window';
import { local as wixLocalStorage } from 'wix-storage';

const GH_PAGES_BASE = 'https://banfjax-hash.github.io/banf';

// IMMEDIATE redirect for Home page — runs before onReady to minimize visual flash
(function() {
    try {
        var pagePath = wixLocation.path || [];
        var isHome = (pagePath.length === 0) || (pagePath.length === 1 && pagePath[0] === 'home');
        if (isHome) {
            var portal = '';
            try { portal = wixLocation.query.portal || ''; } catch(e) { portal = ''; }
            if (!portal) {
                // Redirect to GitHub Pages (Wix HTTP functions can't serve HTML)
                wixLocation.to(GH_PAGES_BASE + '/index.html');
                return;
            }
        }
    } catch(_) {}
})();

$w.onReady(function () {
    // Hide stale "redesigning" placeholder text (Velo nickname: text18)
    try { $w('#text18').hide(); } catch(_) {}
    try { $w('#text18').collapse(); } catch(_) {}

    // ── Home-page redirect safety net ──────────────────────
    // Backup redirect in case the immediate one above didn't fire
    try {
        var pagePath = wixLocation.path || [];
        var isHome = (pagePath.length === 0) || (pagePath.length === 1 && pagePath[0] === 'home');
        if (isHome) {
            var portal = '';
            try { portal = wixLocation.query.portal || ''; } catch(e) { portal = ''; }
            if (!portal) {
                wixLocation.to(GH_PAGES_BASE + '/index.html');
                return;
            }
        }
    } catch(_) {}

    const isMobile = wixWindow.formFactor === 'Mobile';

    initNavigation(isMobile);
    initHeaderSession();
});

// ─── Navigation ───────────────────────────────────────────

function initNavigation(isMobile) {
    if (isMobile) {
        // Show hamburger menu, hide desktop nav
        try { $w('#desktopNav').collapse(); }  catch (_) {}
        try { $w('#hamburgerBtn').expand(); }  catch (_) {}
        try { $w('#mobileMenu').collapse(); }  catch (_) {} // starts closed

        // Toggle mobile menu
        let menuOpen = false;
        try {
            $w('#hamburgerBtn').onClick(() => {
                menuOpen = !menuOpen;
                if (menuOpen) {
                    $w('#mobileMenu').expand();
                    $w('#hamburgerBtn').label = '✕';
                } else {
                    $w('#mobileMenu').collapse();
                    $w('#hamburgerBtn').label = '☰';
                }
            });
        } catch (_) {}

        // Wire mobile nav links
        const navLinks = {
            '#mobileNavHome':       '/',
            '#mobileNavMembership': '/membership',
            '#mobileNavEvents':     '/events',
            '#mobileNavRadio':      '/radio',
            '#mobileNavContact':    '/contact',
            '#mobileNavSignIn':     '/member-login',
            '#mobileNavSignUp':     '/member-signup',
        };
        Object.entries(navLinks).forEach(([id, url]) => {
            try {
                $w(id).onClick(() => {
                    try { $w('#mobileMenu').collapse(); menuOpen = false; $w('#hamburgerBtn').label = '☰'; } catch (_) {}
                    wixLocation.to(url);
                });
            } catch (_) {}
        });

    } else {
        // Desktop: ensure desktop nav is visible
        try { $w('#desktopNav').expand(); }  catch (_) {}
        try { $w('#hamburgerBtn').collapse(); } catch (_) {}
    }
}

// ─── Header: Show user name if logged in ─────────────────

function initHeaderSession() {
    try {
        const memberName = wixLocalStorage.getItem('banf_member_name');
        const sessionToken = wixLocalStorage.getItem('banf_session_token');

        if (memberName && sessionToken) {
            // Show logged-in state in header
            try { $w('#headerMemberName').text = memberName.split(' ')[0]; $w('#headerMemberName').show(); } catch (_) {}
            try { $w('#btnHeaderSignIn').hide(); } catch (_) {}
            try { $w('#btnHeaderSignOut').show(); } catch (_) {}
            try {
                $w('#btnHeaderSignOut').onClick(async () => {
                    wixLocalStorage.removeItem('banf_session_token');
                    wixLocalStorage.removeItem('banf_member_email');
                    wixLocalStorage.removeItem('banf_member_name');
                    wixLocation.to('/');
                });
            } catch (_) {}
        } else {
            try { $w('#headerMemberName').hide(); } catch (_) {}
            try { $w('#btnHeaderSignIn').show(); } catch (_) {}
            try { $w('#btnHeaderSignOut').hide(); } catch (_) {}
            try { $w('#btnHeaderSignIn').onClick(() => wixLocation.to('/member-login')); } catch (_) {}
        }
    } catch (_) {}
}
