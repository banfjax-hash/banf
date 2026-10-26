// temp_home_page.ivuyv.js — BANF page (jaxbengali.org)
// Redirect to the landing page served by this site's own Wix backend — no GitHub hop
import wixLocation from 'wix-location';

$w.onReady(function () {
    try { $w('#text18').hide(); } catch(_) {}
    try { $w('#text18').collapse(); } catch(_) {}
    wixLocation.to('https://www.jaxbengali.org/_functions/home');
});
