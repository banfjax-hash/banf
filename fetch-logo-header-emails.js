/**
 * Fetch recent emails from ranadhir.ghosh@gmail.com to banfjax@gmail.com
 * looking for logo and header images.
 */
const https = require('https');
const fs = require('fs');

const GOOGLE_CLIENT_ID = '1020178199135-3usrl611ara38i7rhu2ub6sn6g1150ml.apps.googleusercontent.com';
const GOOGLE_CLIENT_SECRET = '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';
const GOOGLE_REFRESH_TOKEN = require('./banf-gmail-config').REFRESH_TOKEN;

function httpsRequest(url, options = {}) {
    return new Promise((resolve, reject) => {
        const req = https.request(url, options, res => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve({ status: res.statusCode, data }));
        });
        req.on('error', reject);
        if (options.body) req.write(options.body);
        req.end();
    });
}

async function getAccessToken() {
    const body = `grant_type=refresh_token&refresh_token=${encodeURIComponent(GOOGLE_REFRESH_TOKEN)}&client_id=${encodeURIComponent(GOOGLE_CLIENT_ID)}&client_secret=${encodeURIComponent(GOOGLE_CLIENT_SECRET)}`;
    const res = await httpsRequest('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Content-Length': Buffer.byteLength(body) },
        body
    });
    const d = JSON.parse(res.data);
    if (!d.access_token) throw new Error('Token error: ' + JSON.stringify(d));
    return d.access_token;
}

async function gmailGet(token, path) {
    const res = await httpsRequest(`https://gmail.googleapis.com/gmail/v1/users/me/${path}`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${token}` }
    });
    return JSON.parse(res.data);
}

async function main() {
    console.log('Getting access token...');
    const token = await getAccessToken();
    console.log('Token obtained.');

    // Search for recent emails from ranadhir.ghosh@gmail.com 
    const query = 'from:ranadhir.ghosh@gmail.com newer_than:2d';
    console.log(`\nSearching: ${query}`);
    const list = await gmailGet(token, `messages?q=${encodeURIComponent(query)}&maxResults=10`);
    
    if (!list.messages || list.messages.length === 0) {
        console.log('No recent emails found. Trying broader search...');
        const list2 = await gmailGet(token, `messages?q=${encodeURIComponent('from:ranadhir.ghosh@gmail.com newer_than:7d')}&maxResults=10`);
        if (!list2.messages) { console.log('No emails found at all.'); return; }
        list.messages = list2.messages;
    }
    
    console.log(`Found ${list.messages.length} message(s)\n`);

    const results = [];
    
    for (const msg of list.messages) {
        const full = await gmailGet(token, `messages/${msg.id}?format=full`);
        const headers = full.payload.headers || [];
        const subject = (headers.find(h => h.name.toLowerCase() === 'subject') || {}).value || '(no subject)';
        const from = (headers.find(h => h.name.toLowerCase() === 'from') || {}).value || '';
        const date = (headers.find(h => h.name.toLowerCase() === 'date') || {}).value || '';
        
        console.log(`--- Message: ${msg.id} ---`);
        console.log(`  Subject: ${subject}`);
        console.log(`  From: ${from}`);
        console.log(`  Date: ${date}`);
        
        // Find all parts with attachments or inline images
        const attachments = [];
        function findParts(part, depth = 0) {
            if (part.filename && part.body && part.body.attachmentId) {
                attachments.push({
                    filename: part.filename,
                    mimeType: part.mimeType,
                    attachmentId: part.body.attachmentId,
                    size: part.body.size
                });
            }
            // Also check for inline base64 data
            if (part.body && part.body.data && (part.mimeType || '').startsWith('image/')) {
                const ext = part.mimeType.includes('png') ? 'png' : 'jpg';
                attachments.push({
                    filename: part.filename || `inline_image.${ext}`,
                    mimeType: part.mimeType,
                    inlineData: part.body.data,
                    size: part.body.size
                });
            }
            if (part.parts) part.parts.forEach(p => findParts(p, depth + 1));
        }
        findParts(full.payload);
        
        console.log(`  Attachments: ${attachments.length}`);
        attachments.forEach(a => console.log(`    - ${a.filename} (${a.mimeType}, ${a.size} bytes)`));
        
        results.push({ id: msg.id, subject, from, date, attachments });
    }
    
    // Download attachments
    console.log('\n\n=== Downloading attachments ===');
    for (const msg of results) {
        const subjectClean = msg.subject.toLowerCase().replace(/[^a-z0-9]/g, '_').substring(0, 30);
        for (let i = 0; i < msg.attachments.length; i++) {
            const att = msg.attachments[i];
            let b64Data;
            
            if (att.inlineData) {
                b64Data = att.inlineData;
            } else if (att.attachmentId) {
                console.log(`  Downloading: ${att.filename} from "${msg.subject}"...`);
                const attData = await gmailGet(token, `messages/${msg.id}/attachments/${att.attachmentId}`);
                b64Data = attData.data;
            }
            
            if (b64Data) {
                // Gmail uses URL-safe base64
                const base64 = b64Data.replace(/-/g, '+').replace(/_/g, '/');
                const buffer = Buffer.from(base64, 'base64');
                const ext = att.mimeType.includes('png') ? 'png' : (att.mimeType.includes('gif') ? 'gif' : 'jpg');
                const outFile = `email_${subjectClean}_${i}.${ext}`;
                fs.writeFileSync(outFile, buffer);
                console.log(`  Saved: ${outFile} (${buffer.length} bytes)`);
                att.savedAs = outFile;
            }
        }
    }
    
    // Save metadata
    fs.writeFileSync('email-logo-header-meta.json', JSON.stringify(results, null, 2));
    console.log('\nMetadata saved to email-logo-header-meta.json');
    console.log('\nDone!');
}

main().catch(err => console.error('Error:', err));
