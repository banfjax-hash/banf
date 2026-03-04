// Home.mainPage.js — Load landing page content
// NOTE: Custom domain (jaxbengali.org) DNS points to Wix, so redirect to GitHub Pages causes loop
// Instead, display welcome message and direct users to member/event pages

$w.onReady(function () {
    // No redirect - landing page is served directly by Wix or via custom element
    console.log("BANF Home Page loaded");
});
