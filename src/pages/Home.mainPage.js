// Home.mainPage.js — Redirect to GitHub Pages landing page
import wixLocation from 'wix-location';

$w.onReady(function () {
    // Redirect to GitHub Pages landing page (CNAME removed, no loop)
    wixLocation.to("https://banfjax-hash.github.io/banf/index.html");
});
