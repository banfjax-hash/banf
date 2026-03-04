// Home.mainPage.js — Full-page landing embed
import wixWindow from 'wix-window';

$w.onReady(function () {
    // 1. Hide Wix header and footer chrome
    try { $w('HeaderSection').collapse(); } catch(e) {}
    try { $w('FooterSection').collapse(); } catch(e) {}

    // 2. Collapse every Section that is NOT section1 (removes blank Untitled gap)
    $w('Section').forEach(function (sec) {
        if (sec.id !== 'section1') {
            sec.collapse();
        }
    });

    // 3. Set initial html1 height to viewport height (in pixels)
    try {
        const viewportHeight = wixWindow.getBoundingRect().height || 900;
        $w('#html1').height = viewportHeight;
    } catch(e) {
        try { $w('#html1').height = 900; } catch(e2) {}
    }

    // 4. Listen for height updates sent from the iframe via postMessage
    //    landing.html sends: {type:'wix-resize', height: scrollHeight}
    $w('#html1').onMessage(function (event) {
        const msg = event.data;
        if (msg && msg.type === 'wix-resize' && msg.height) {
            try { $w('#html1').height = msg.height; } catch(e) {}
        }
    });
});
