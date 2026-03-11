/**
 * Fetch the newest email from ranadhir.ghosh with attachments (logo + header)
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
    return JSON.parse(res.data).access_token;
}

async function gmailGet(token, path) {
    const res = await httpsRequest(`https://gmail.googleapis.com/gmail/v1/users/me/${path}`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${token}` }
    });
    return JSON.parse(res.data);
}

async function main() {
    const token = await getAccessToken();
    
    // Get newest emails from ranadhir - look for ones with attachments
    console.log('Searching for newest emails from ranadhir.ghosh@gmail.com...');
    const list = await gmailGet(token, 'messages?q=' + encodeURIComponent('from:ranadhir.ghosh@gmail.com newer_than:1d') + '&maxResults=10');
    console.log('Found:', (list.messages || []).length, 'messages\n');
    
    for (const msg of (list.messages || [])) {
        const m = await gmailGet(token, 'messages/' + msg.id + '?format=full');
        const h = m.payload.headers || [];
        const subj = (h.find(x => x.name === 'Subject') || {}).value || '(none)';
        const date = (h.find(x => x.name === 'Date') || {}).value || '';
        
        // Count all parts recursively
        let attachments = [];
        function findParts(part) {
            if (part.body && part.body.attachmentId) {
                attachments.push({
                    filename: part.filename,
                    mimeType: part.mimeType,
                    attachmentId: part.body.attachmentId,
                    size: part.body.size
                });
            }
            if ((part.mimeType || '').startsWith('image/') && part.body && part.body.data && part.body.data.length > 10) {
                attachments.push({
                    filename: part.filename || 'inline',
                    mimeType: part.mimeType,
                    inlineData: part.body.data,
                    size: part.body.size
                });
            }
            if (part.parts) part.parts.forEach(p => findParts(p));
        }
        findParts(m.payload);
        
        console.log(`${msg.id} | ${subj} | ${date} | size:${m.sizeEstimate} | attachments:${attachments.length}`);
        
        if (attachments.length > 0) {
            console.log('  *** HAS ATTACHMENTS - downloading ***');
            for (let i = 0; i < attachments.length; i++) {
                const att = attachments[i];
                let b64Data;
                
                if (att.inlineData) {
                    b64Data = att.inlineData;
                } else {
                    console.log(`  Downloading: ${att.filename} (${att.mimeType}, ${att.size} bytes)...`);
                    const attData = await gmailGet(token, `messages/${msg.id}/attachments/${att.attachmentId}`);
                    b64Data = attData.data;
                }
                
                const base64 = b64Data.replace(/-/g, '+').replace(/_/g, '/');
                const buffer = Buffer.from(base64, 'base64');
                const ext = att.mimeType.includes('png') ? 'png' : (att.mimeType.includes('gif') ? 'gif' : 'jpg');
                const outFile = `banf_email_image_${i}.${ext}`;
                fs.writeFileSync(outFile, buffer);
                console.log(`  SAVED: ${outFile} (${buffer.length} bytes = ${Math.round(buffer.length/1024)}KB)`);
                att.savedAs = outFile;
                att.savedSize = buffer.length;
            }
            
            // Sort by size to identify logo (smaller) vs header (larger)
            attachments.sort((a, b) => (a.savedSize || a.size) - (b.savedSize || b.size));
            console.log('\n  Image identification:');
            console.log(`  LOGO (smaller): ${attachments[0].savedAs || attachments[0].filename} (${Math.round((attachments[0].savedSize || attachments[0].size)/1024)}KB)`);
            if (attachments.length > 1) {
                console.log(`  HEADER (larger): ${attachments[attachments.length-1].savedAs || attachments[attachments.length-1].filename} (${Math.round((attachments[attachments.length-1].savedSize || attachments[attachments.length-1].size)/1024)}KB)`);
            }
            
            // Save metadata
            fs.writeFileSync('email-images-meta.json', JSON.stringify({
                messageId: msg.id,
                subject: subj,
                date,
                attachments: attachments.map(a => ({
                    filename: a.filename,
                    mimeType: a.mimeType,
                    size: a.size,
                    savedAs: a.savedAs,
                    savedSize: a.savedSize
                }))
            }, null, 2));
            
            console.log('\nMetadata saved to email-images-meta.json');
            return; // Found the email with images
        }
    }
    
    console.log('\nNo emails with image attachments found. The images might be embedded differently.');
}

main().catch(err => console.error('Error:', err));
