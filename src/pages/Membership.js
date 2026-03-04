// Membership.js
// BANF Membership & Benefits page

import wixLocation from 'wix-location';
import wixWindow from 'wix-window';
import { getMembershipPlans, registerMember } from 'backend/members.jsw';
import { processPayment } from 'backend/finance.jsw';

$w.onReady(async function () {
    console.log("💳 Membership page loading...");

    const isMobile = wixWindow.formFactor === 'Mobile';
    try { applyMobileLayout(isMobile); } catch (_) {}

    // Load membership plans
    await loadPlans();

    // Initialize buttons
    try { initMemberPortal(); } catch (_) {}
    try { initPlanSelection(); } catch (_) {}

    console.log("✅ Membership page ready | mobile:", isMobile);
});

async function loadPlans() {
    try {
        const plans = await getMembershipPlans();
        if (plans.student) $w('#studentPrice').text = `$${plans.student.price}/year`;
        if (plans.regular) $w('#regularPrice').text = `$${plans.regular.price}/year`;
        if (plans.couple)  $w('#couplePrice').text  = `$${plans.couple.price}/year`;
        if (plans.family) {
            $w('#familyPrice').text = `$${plans.family.price}/year`;
            if (plans.family.earlyBird) {
                $w('#earlyBirdBanner').text =
                    `⏰ Early Bird Pricing! Family Premium $${plans.family.earlyBirdPrice} ` +
                    `(save $${plans.family.price - plans.family.earlyBirdPrice}) — Register by March 31, 2026`;
                $w('#earlyBirdBanner').show();
            }
        }
    } catch (err) {
        console.error("Plans load error:", err);
    }
}

function initMemberPortal() {
    try { $w('#btnLogin').onClick(() => { wixLocation.to('/member-login'); }); } catch (_) {}
    try { $w('#btnSignUp').onClick(() => { wixLocation.to('/member-signup'); }); } catch (_) {}
}

function initPlanSelection() {
    const plans = ['#studentPlan', '#regularPlan', '#couplePlan', '#familyPlan'];
    plans.forEach(planId => {
        try {
            $w(planId).onClick(() => {
                const planName = planId.replace('#', '').replace('Plan', '');
                wixLocation.to(`/member-signup?plan=${planName}`);
            });
        } catch (e) {}
    });
}

// ─── Mobile Layout ────────────────────────────────────────

function applyMobileLayout(isMobile) {
    // Ensure plan content is visible regardless of editor defaults
    try { $w('#plansColumns').expand();    $w('#plansColumns').show();    } catch (_) {}
    try { $w('#benefitsTable').expand();   $w('#benefitsTable').show();   } catch (_) {}

    if (!isMobile) return;

    // Stack plan cards vertically on mobile
    try { $w('#plansColumns').collapse(); } catch (_) {}
    try { $w('#plansMobileStack').expand(); } catch (_) {}

    // Full-width CTA buttons
    ['#btnSignUp', '#btnLogin'].forEach(id => {
        try {
            $w(id).style.width = '100%';
            $w(id).style.height = '52px';
            $w(id).style.fontSize = '16px';
            $w(id).style.marginBottom = '12px';
        } catch (_) {}
    });

    // Compact header
    try { $w('#membershipHero').style.paddingTop = '20px'; } catch (_) {}
    try { $w('#membershipTitle').style.fontSize = '24px'; } catch (_) {}

    // Collapse benefits comparison table on mobile (too wide)
    try { $w('#benefitsTable').collapse(); } catch (_) {}
    try { $w('#benefitsMobileList').expand(); } catch (_) {}

    // Increase plan card tap target
    ['#studentPlan', '#regularPlan', '#couplePlan', '#familyPlan'].forEach(id => {
        try {
            $w(id).style.padding = '20px';
            $w(id).style.marginBottom = '16px';
        } catch (_) {}
    });
}
