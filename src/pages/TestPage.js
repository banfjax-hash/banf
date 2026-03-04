// TestPage.js
// Simple test page to verify Wix Velo + CLI pipeline works
// STEP 1: Create this page in Wix Editor with these elements:
//   - Text element with ID: #testTitle
//   - Button element with ID: #testButton
//   - Text element with ID: #testOutput

$w.onReady(function () {
    console.log("🧪 Test page loaded!");

    // Set initial text
    $w('#testTitle').text = 'BANF Wix Velo Test Page';
    $w('#testOutput').text = 'Click the button to test Velo interaction →';

    // Button click handler
    let clickCount = 0;
    $w('#testButton').onClick(() => {
        clickCount++;
        const now = new Date().toLocaleTimeString();
        $w('#testOutput').text = `✅ Velo is working! Click #${clickCount} at ${now}`;
        console.log(`Button clicked: ${clickCount} times`);
    });
});
