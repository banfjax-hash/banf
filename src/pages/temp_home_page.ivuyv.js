// temp_home_page.ivuyv.js — BANF page (jaxbengali.org)
// Direct redirect to GitHub Pages v2 landing — no intermediate hops
import wixLocation from 'wix-location';

$w.onReady(function () {
    try { $w('#text18').hide(); } catch(_) {}
    try { $w('#text18').collapse(); } catch(_) {}
    wixLocation.to('https://banfjax-hash.github.io/banf/v2/');
});
