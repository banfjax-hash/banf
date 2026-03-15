// Home.mainPage.js — Redirect to full-screen GitHub Pages landing
// The embed approach has unavoidable Wix section padding.
// Instead, redirect the entire browser window to the GitHub Pages site.
import wixLocation from 'wix-location';

$w.onReady(function () {
    // Immediate redirect — user sees the full GitHub Pages landing, no Wix chrome
    wixLocation.to("https://banfjax-hash.github.io/banf/v2/");
});
