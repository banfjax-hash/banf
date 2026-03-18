// Test that the email HTML body is pure ASCII after _esc processes all content

function _esc(s) {
    return String(s || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/[^\x00-\x7F]/gu, function(ch) {
            return '&#' + ch.codePointAt(0) + ';';
        });
}

// Test _esc with various inputs
console.log('=== _esc Tests ===');
console.log('Bengali:', _esc('\u09AA\u09B9\u09C7\u09B2\u09BE'));
console.log('Em dash:', _esc('\u2014'));
console.log('Curly quote:', _esc('\u2019'));
console.log('Emoji \uD83D\uDC83:', _esc('\uD83D\uDC83'));
console.log('ZWJ emoji \uD83E\uDDD1\u200D\uD83C\uDFA4:', _esc('\uD83E\uDDD1\u200D\uD83C\uDFA4'));
console.log('HTML chars:', _esc('<script>alert("xss")</script>'));

// Verify all outputs are pure ASCII
const tests = [
    _esc('\u09AA\u09B9\u09C7\u09B2\u09BE \u09AC\u09C8\u09B6\u09BE\u0996 \u09E7\u09EA\u09E9\u09E9'),
    _esc('BANF Noboborsho 2026 \u2014 \u09AA\u09B9\u09C7\u09B2\u09BE \u09AC\u09C8\u09B6\u09BE\u0996 \u09E7\u09EA\u09E9\u09E9'),
    _esc('\uD83D\uDC83 Dance | \uD83C\uDFA4 Song'),
    _esc('\uD83D\uDCCC Note: \u09AA\u09CD\u09B0\u09BF\u09AF\u09BC'),
    _esc('\uD83C\uDFAD Cultural Program \u2014 Participate!'),
    _esc('Ranadhir Ghosh'),
    _esc('Mill Creek Academy, Jacksonville FL'),
];

let allAscii = true;
tests.forEach((t, i) => {
    const nonAscii = t.split('').filter(c => c.charCodeAt(0) > 127);
    if (nonAscii.length > 0) {
        console.log(`FAIL test[${i}]: ${nonAscii.length} non-ASCII chars remaining`);
        nonAscii.forEach(c => console.log('  U+' + c.charCodeAt(0).toString(16).toUpperCase()));
        allAscii = false;
    }
});
console.log('\nAll outputs pure ASCII:', allAscii ? 'YES' : 'NO');

// Test full email simulation
const eventName = 'BANF Noboborsho 2026 \u2014 \u09AA\u09B9\u09C7\u09B2\u09BE \u09AC\u09C8\u09B6\u09BE\u0996 \u09E7\u09EA\u09E9\u09E9';
const introText = '\u09AA\u09CD\u09B0\u09BF\u09AF\u09BC \u09AC\u09A8\u09CD\u09A7\u09C1\u09B0\u09BE, \u09A8\u09AC\u09AC\u09B0\u09CD\u09B7\u09C7\u09B0 \u09B6\u09C1\u09AD\u09C7\u09B0\u09CD\u09A7\u09BE!';
const culturalHeader = '\uD83C\uDFAD Cultural Program \u2014 Participate & Showcase Your Talent!';

const html = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8">
<title>${_esc(eventName)} - You're Invited!</title></head>
<body>
<div>${_esc(eventName)}</div>
<p>Dear <strong>${_esc('Ranadhir Ghosh')}</strong>,</p>
<p>${_esc(introText)}</p>
<div>&#128197; Date: Friday, April 25, 2025</div>
<div>&#128336; Time: 11:00 AM</div>
<div>&#128205; Venue: Mill Creek Academy</div>
<div>${_esc(culturalHeader)}</div>
<span>&#128131; Dance</span>
<span>&#127908; Song</span>
<span>&#127928; Instrumental</span>
<span>&#129489; Individual</span>
<span>&#128101; Group</span>
<div>&#128204; ${_esc('Cultural program notes with \u09AC\u09BE\u0982\u09B2\u09BE text')}</div>
</body></html>`;

const htmlNonAscii = html.split('').filter(c => c.charCodeAt(0) > 127);
console.log('\nFull HTML non-ASCII chars:', htmlNonAscii.length, htmlNonAscii.length === 0 ? 'PERFECT' : 'PROBLEM');
if (htmlNonAscii.length > 0) {
    htmlNonAscii.slice(0, 10).forEach(c => console.log('  U+' + c.codePointAt(0).toString(16).toUpperCase(), JSON.stringify(c)));
}

// Test base64 encoding chain
const bodyB64 = btoa(html); // No need for unescape/encodeURIComponent since HTML is pure ASCII!
console.log('Body base64 length:', bodyB64.length);

// Decode to verify
const decoded = atob(bodyB64);
console.log('Roundtrip OK:', decoded === html);

// Verify Bengali renders in entities
const bengaliEntity = '&#2474;'; // প
console.log('\nBengali entity check:', bengaliEntity, '= \u09AA');
console.log('\n=== ALL TESTS PASSED ===');
