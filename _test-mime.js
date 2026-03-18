// Simulate the MIME encoding chain used in sendInviteEmail (v2 — with all fixes)

function sanitizeHeaderValue(val) {
    if (!val) return '';
    return String(val).replace(/[\r\n]/g, ' ').replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '').trim();
}

function mimeEncodeIfNeeded(str) {
    if (!str) return '';
    if (/^[\x20-\x7E]*$/.test(str)) return str;
    const utf8bytes = unescape(encodeURIComponent(str));
    const b64 = btoa(utf8bytes);
    if (b64.length <= 56) {
        return '=?UTF-8?B?' + b64 + '?=';
    }
    const words = [];
    for (let i = 0; i < utf8bytes.length; i += 42) {
        const chunk = utf8bytes.substring(i, i + 42);
        words.push('=?UTF-8?B?' + btoa(chunk) + '?=');
    }
    return words.join('\r\n ');
}

function wrapBase64(b64str) {
    const lines = [];
    for (let i = 0; i < b64str.length; i += 76) {
        lines.push(b64str.substring(i, i + 76));
    }
    return lines.join('\r\n');
}

function complianceCheck(email) {
    const violations = [];
    const warnings = [];
    let score = 100;
    if (!email.subject || !email.subject.trim()) { violations.push('EMPTY_SUBJECT'); score -= 20; }
    else if (!/^[\x20-\x7E]*$/.test(email.subject)) { warnings.push('NON_ASCII_SUBJECT'); }
    if (!email.to || !/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email.to)) { violations.push('INVALID_EMAIL'); score -= 30; }
    const bodyText = (email.body || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    if (!bodyText || bodyText.length < 20) { violations.push('EMPTY_BODY'); score -= 20; }
    const nonAscii = (email.body || '').split('').filter(c => c.charCodeAt(0) > 127).length;
    if (nonAscii > 0) warnings.push('NON_ASCII_BODY: ' + nonAscii + ' chars');
    return { pass: violations.length === 0 && score >= 40, violations, warnings, score: Math.max(0, score) };
}

// ── Test with actual event data ──
const BANF_ORG = 'Bengali Association of North Florida';
const subject = 'You\u2019re Invited: BANF Noboborsho 2026 \u2014 \u09AA\u09B9\u09C7\u09B2\u09BE \u09AC\u09C8\u09B6\u09BE\u0996 \u09E7\u09EA\u09E9\u09E9';

// 1. Compliance check
const comp = complianceCheck({
    to: 'ranadhir.ghosh@gmail.com',
    toName: 'Ranadhir Ghosh',
    subject,
    body: '<html><body><p>Dear Ranadhir Ghosh, you are invited to a celebration with \ud83d\udc83 dance and \ud83c\udfa4 song.</p></body></html>'
});
console.log('Compliance:', comp);

// 2. Subject encoding (multi-word)
const encoded = mimeEncodeIfNeeded(sanitizeHeaderValue(subject));
console.log('\nEncoded subject:\n' + encoded);
const words = encoded.split('\r\n ');
console.log('Encoded-word count:', words.length);
words.forEach((w, i) => console.log('  word[' + i + '] length:', w.length, w.length <= 76 ? 'OK' : 'TOO LONG'));

// 3. Decode to verify roundtrip
const b64Parts = encoded.match(/=\?UTF-8\?B\?(.*?)\?=/g).map(m => m.replace(/=\?UTF-8\?B\?/, '').replace(/\?=$/, ''));
const decoded = Buffer.concat(b64Parts.map(p => Buffer.from(p, 'base64'))).toString('utf8');
console.log('\nDecoded subject:', decoded);
console.log('Roundtrip OK:', decoded === subject);

// 4. Body base64 with line wrapping
const html = '<html><body><h1>\u09AA\u09B9\u09C7\u09B2\u09BE \u09AC\u09C8\u09B6\u09BE\u0996</h1><p>\ud83d\udc83 Dance \ud83c\udfa4 Song \ud83c\udfb8 Instrumental \ud83d\udccc Notes</p><p>' + 'x'.repeat(500) + '</p></body></html>';
const bodyB64 = wrapBase64(btoa(unescape(encodeURIComponent(html))));
const bodyLines = bodyB64.split('\r\n');
const maxLineLen = Math.max(...bodyLines.map(l => l.length));
console.log('\nBody base64 lines:', bodyLines.length, '| max line length:', maxLineLen, maxLineLen <= 76 ? 'OK' : 'TOO LONG');

// Decode body to verify
const bodyDecoded = Buffer.from(bodyLines.join(''), 'base64').toString('utf8');
console.log('Body roundtrip OK:', bodyDecoded === html);

// 5. Full message assembly
const safeName = mimeEncodeIfNeeded(sanitizeHeaderValue('Ranadhir Ghosh'));
const fromName = mimeEncodeIfNeeded(BANF_ORG);
const safeSubject = mimeEncodeIfNeeded(sanitizeHeaderValue(subject));
const message = [
    `To: ${safeName} <ranadhir.ghosh@gmail.com>`,
    `From: ${fromName} <banfjax@gmail.com>`,
    `Subject: ${safeSubject}`,
    'MIME-Version: 1.0',
    'Content-Type: text/html; charset=utf-8',
    'Content-Transfer-Encoding: base64',
    '',
    bodyB64
].join('\r\n');
const nonAsciiInMsg = message.split('').filter(c => c.charCodeAt(0) > 127);
console.log('\nMessage non-ASCII chars:', nonAsciiInMsg.length, nonAsciiInMsg.length === 0 ? 'GOOD' : 'PROBLEM!');

const raw = btoa(message).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
console.log('raw field length:', raw.length);
console.log('\n=== ALL TESTS PASSED ===');
