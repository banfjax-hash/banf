/**
 * Broader search for all recent emails to banfjax@gmail.com with images
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
    
    // Search 1: All emails from ranadhir in last 7 days
    console.log('=== All recent emails from ranadhir.ghosh@gmail.com ===');
    const list1 = await gmailGet(token, 'messages?q=' + encodeURIComponent('from:ranadhir.ghosh@gmail.com newer_than:7d') + '&maxResults=20');
    console.log('Messages:', (list1.messages || []).length);
    
    for (const msg of (list1.messages || [])) {
        const m = await gmailGet(token, 'messages/' + msg.id + '?format=metadata&metadataHeaders=Subject&metadataHeaders=Date&metadataHeaders=From');
        const h = m.payload.headers || [];
        const subj = (h.find(x => x.name === 'Subject') || {}).value || '(none)';
        const date = (h.find(x => x.name === 'Date') || {}).value || '';
        const hasAttach = (m.payload.parts || []).some(p => p.body && p.body.attachmentId) || m.labelIds.includes('HAS_ATTACHMENT');
        console.log(`  ${msg.id} | ${subj} | ${date} | labels:${m.labelIds.join(',')} | size:${m.sizeEstimate}`);
    }
    
    // Search 2: Emails with subject logo or header that have attachments
    console.log('\n=== Emails with has:attachment from ranadhir ===');
    const list2 = await gmailGet(token, 'messages?q=' + encodeURIComponent('from:ranadhir.ghosh@gmail.com has:attachment newer_than:7d') + '&maxResults=10');
    console.log('Messages:', (list2.messages || []).length);
    
    for (const msg of (list2.messages || [])) {
        const m = await gmailGet(token, 'messages/' + msg.id + '?format=full');
        const h = m.payload.headers || [];
        const subj = (h.find(x => x.name === 'Subject') || {}).value || '(none)';
        const date = (h.find(x => x.name === 'Date') || {}).value || '';
        console.log(`\n  ${msg.id} | ${subj} | ${date} | size:${m.sizeEstimate}`);
        
        // Dump all parts structure
        function dumpParts(part, indent = '    ') {
            const attachId = part.body && part.body.attachmentId ? ' ATT:' + part.body.attachmentId.substring(0, 30) + '...' : '';
            const dataLen = part.body && part.body.data ? ' data:' + part.body.data.length : '';
            console.log(`${indent}${part.mimeType}${part.filename ? ' [' + part.filename + ']' : ''}${attachId}${dataLen} size:${part.body ? part.body.size : 0}`);
            if (part.parts) part.parts.forEach(p => dumpParts(p, indent + '  '));
        }
        dumpParts(m.payload);
    }
    
    // Search 3: Thread-based - check if the logo/header messages have threads with attachments
    console.log('\n=== Checking threads for logo/header emails ===');
    const logoId = '19cb4c2c220cbf53';
    const headerId = '19cb4c4697b1da19';
    
    for (const [id, label] of [[logoId, 'logo'], [headerId, 'header']]) {
        const msg = await gmailGet(token, 'messages/' + id + '?format=metadata&metadataHeaders=Subject');
        const threadId = msg.threadId;
        console.log(`\n${label}: threadId=${threadId}`);
        
        const thread = await gmailGet(token, 'threads/' + threadId + '?format=full');
        console.log(`  Messages in thread: ${thread.messages.length}`);
        
        for (const tmsg of thread.messages) {
            const h = tmsg.payload.headers || [];
            const subj = (h.find(x => x.name === 'Subject') || {}).value || '(none)';
            const date = (h.find(x => x.name === 'Date') || {}).value || '';
            console.log(`  ${tmsg.id} | ${subj} | ${date} | size:${tmsg.sizeEstimate}`);
            
            function findAttachments(part) {
                let found = [];
                if (part.body && part.body.attachmentId) {
                    found.push({filename: part.filename, mime: part.mimeType, id: part.body.attachmentId, size: part.body.size});
                }
                if ((part.mimeType || '').startsWith('image/') && part.body && part.body.data) {
                    found.push({filename: part.filename || 'inline', mime: part.mimeType, inline: true, size: part.body.size});
                }
                if (part.parts) part.parts.forEach(p => found.push(...findAttachments(p)));
                return found;
            }
            const atts = findAttachments(tmsg.payload);
            if (atts.length) {
                console.log(`    Attachments: ${atts.length}`);
                atts.forEach(a => console.log(`      ${a.filename} (${a.mime}) ${a.inline ? 'INLINE' : 'ATT:' + a.id.substring(0,20)} size:${a.size}`));
            }
        }
    }
    
    // Search 4: All emails with images in last 2 days
    console.log('\n=== All emails with attachment in last 2 days ===');
    const list3 = await gmailGet(token, 'messages?q=' + encodeURIComponent('has:attachment newer_than:2d') + '&maxResults=10');
    console.log('Messages:', (list3.messages || []).length);
    for (const msg of (list3.messages || [])) {
        const m = await gmailGet(token, 'messages/' + msg.id + '?format=metadata&metadataHeaders=Subject&metadataHeaders=From&metadataHeaders=Date');
        const h = m.payload.headers || [];
        const subj = (h.find(x => x.name === 'Subject') || {}).value || '(none)';
        const from = (h.find(x => x.name === 'From') || {}).value || '';
        const date = (h.find(x => x.name === 'Date') || {}).value || '';
        console.log(`  ${msg.id} | ${subj} | ${from} | ${date} | size:${m.sizeEstimate}`);
    }
}

main().catch(err => console.error('Error:', err));
