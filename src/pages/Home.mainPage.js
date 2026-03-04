// Home.mainPage.js — Full-page landing via GitHub Pages embed
import wixLocation from 'wix-location';

$w.onReady(function () {
    // Collapse every section that is NOT section1 (removes blank "Untitled" gap)
    $w('Section').forEach(function (sec) {
        if (sec.id !== 'section1') {
            sec.collapse();
        }
    });

    // Stretch section1's HTML element to fill the full viewport
    try {
        const htmlEl = $w('#html1');
        if (htmlEl) {
            htmlEl.style.height = '100vh';
        }
    } catch (e) {}
});
