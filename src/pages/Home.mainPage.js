// Home.mainPage.js — Full-page landing embed
import wixWindow from 'wix-window';

$w.onReady(function () {
    // 1. Hide Wix header and footer so they take no space
    try { $w('HeaderSection').collapse(); } catch(e) {}
    try { $w('FooterSection').collapse(); } catch(e) {}

    // 2. Collapse ALL sections except section1 (kills blank Untitled section below)
    $w('Section').forEach(function (sec) {
        if (sec.id !== 'section1') {
            sec.collapse();
            // Also set height to 0 as a belt-and-suspenders measure
            try { sec.style.height = '0px'; } catch(e) {}
        }
    });

    // 3. Remove section1 padding so the HTML element truly goes edge-to-edge
    try {
        $w('#section1').style.paddingTop    = '0px';
        $w('#section1').style.paddingBottom = '0px';
        $w('#section1').style.paddingLeft   = '0px';
        $w('#section1').style.paddingRight  = '0px';
    } catch(e) {}

    // 4. Set html1 width and initial height
    try {
        const rect = wixWindow.getBoundingRect();
        const vw   = (rect && rect.width)  || 1280;
        const vh   = (rect && rect.height) || 900;
        $w('#html1').width  = vw;
        $w('#html1').height = vh;
    } catch(e) {
        try { $w('#html1').height = 900; } catch(e2) {}
    }

    // 5. Listen for height postMessage from the iframe
    //    landing.html sends: { type: 'wix-resize', height: N }
    $w('#html1').onMessage(function (event) {
        const msg = event.data;
        if (msg && msg.type === 'wix-resize' && msg.height) {
            try { $w('#html1').height = msg.height; } catch(e) {}
        }
    });
});
