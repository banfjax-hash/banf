// Radio.js
// BANF Radio 24/7 - Bengali & English Music

import wixLocation from 'wix-location';
import wixWindow from 'wix-window';
import { getRadioSchedule, getNowPlaying } from 'backend/radio.jsw';

let isPlaying = false;

$w.onReady(async function () {
    console.log("📻 Radio page loading...");

    const isMobile = wixWindow.formFactor === 'Mobile';
    try { applyMobileLayout(isMobile); } catch (_) {}

    // Load schedule
    await loadSchedule();

    // Initialize player controls
    try { initPlayerControls(); } catch (_) {}

    // Start now-playing updates
    try { await startNowPlayingUpdates(); } catch (_) {}

    console.log("✅ Radio page ready | mobile:", isMobile);
});

function initPlayerControls() {
    try { $w('#btnPlayPause').onClick(() => {
        isPlaying = !isPlaying;
        try { $w('#btnPlayPause').label = isPlaying ? '⏸ Pause' : '▶️ Play'; } catch (_) {}
    }); } catch (_) {}
    try { $w('#btnLiveRadio').onClick(() => {}); } catch (_) {}
    try { $w('#btnArchive').onClick(() => {}); } catch (_) {}
    try { $w('#btnYouTube').onClick(() => { wixLocation.to('https://youtube.com/@banfjacksonville'); }); } catch (_) {}
    try { $w('#btnSpotify').onClick(() => { wixLocation.to('https://open.spotify.com/show/banf'); }); } catch (_) {}
}

async function loadSchedule() {
    try {
        const schedule = await getRadioSchedule();
        // Populate schedule grid
    } catch (err) {
        console.error("Schedule load error:", err);
    }
}

async function startNowPlayingUpdates() {
    try {
        const current = await getNowPlaying();
        $w('#nowPlaying').text = current.title || 'BANF Radio - Live';
    } catch (err) {
        console.error("Now playing error:", err);
    }
}

// ─── Mobile Layout ─────────────────────────────────────────

function applyMobileLayout(isMobile) {
    // Ensure radio content is visible regardless of editor defaults
    try { $w('#socialButtonsRow').expand(); $w('#socialButtonsRow').show(); } catch (_) {}
    try { $w('#scheduleGrid').expand();     $w('#scheduleGrid').show();     } catch (_) {}

    if (!isMobile) return;

    // Make player controls larger for touch
    ['#btnPlayPause', '#btnLiveRadio', '#btnArchive'].forEach(id => {
        try {
            $w(id).style.height = '52px';
            $w(id).style.fontSize = '18px';
            $w(id).style.width = '100%';
        } catch (_) {}
    });

    // Stack social buttons vertically on mobile
    try { $w('#socialButtonsRow').collapse(); } catch (_) {}
    try { $w('#socialButtonsStack').expand(); } catch (_) {}

    // Collapse the schedule grid on mobile; show it as a list
    try { $w('#scheduleGrid').collapse(); } catch (_) {}
    try { $w('#scheduleList').expand(); } catch (_) {}

    // Larger now-playing text
    try { $w('#nowPlaying').style.fontSize = '16px'; } catch (_) {}
    try { $w('#playerContainer').style.padding = '12px'; } catch (_) {}
}
