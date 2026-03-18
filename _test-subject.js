const name = 'BANF Noboborsho 2026 \u2014 \u09AA\u09B9\u09C7\u09B2\u09BE \u09AC\u09C8\u09B6\u09BE\u0996 \u09E7\u09EA\u09E9\u09E9';
const safe = name
    .replace(/[\u2018\u2019\u201A]/g, "'")
    .replace(/[\u201C\u201D\u201E]/g, '"')
    .replace(/[\u2013\u2014]/g, ' - ')
    .replace(/\u2026/g, '...')
    .replace(/[^\x20-\x7E]/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
const subj = "You're Invited: " + safe;
console.log('Subject:', JSON.stringify(subj));
console.log('Pure ASCII:', /^[\x20-\x7E]*$/.test(subj));
