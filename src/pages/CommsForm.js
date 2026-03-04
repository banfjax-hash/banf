// CommsForm.js  — BANF Communications Correction Form page
//
// REQUIRED Wix Editor setup (one-time, ~3 min):
//   1. Add a new blank page → set URL slug to: comms-form
//   2. In the page, click Add (+) → Embed & Social → HTML iFrame
//      Drag it to fill the full page; set its element ID to: formFrame
//      (click the element → Properties panel → rename ID to "formFrame")
//   3. Save in Editor, then run: npx wix publish --approve-preview
//
// How it works:
//   Email link → comms_correction_form (Wix HTTP fn) → 302 to THIS page
//   THIS page reads ?token=, inserts GitHub-hosted form into the iFrame.
//   Browser address bar always shows www.jaxbengali.org — GitHub is never visible.

import wixLocation from 'wix-location';

const FORM_HOST = 'https://www.jaxbengali.org';

$w.onReady(function () {
    const token = (wixLocation.query && wixLocation.query.token) || '';
    // comms-form.html handles missing/invalid tokens with a proper error page
    $w('#formFrame').src = `${FORM_HOST}/comms-form.html?token=${encodeURIComponent(token)}`;
});
