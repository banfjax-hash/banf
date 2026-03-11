/**
 * Fetch full email bodies for logo & header emails - extract inline images
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

function decodeBase64Url(data) {
    return Buffer.from(data.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf-8');
}

function extractAllParts(part, results = { html: [], plain: [], images: [] }) {
    const mime = (part.mimeType || '').toLowerCase();
    
    if (mime === 'text/html' && part.body && part.body.data) {
        results.html.push(decodeBase64Url(part.body.data));
    }
    if (mime === 'text/plain' && part.body && part.body.data) {
        results.plain.push(decodeBase64Url(part.body.data));
    }
    if (mime.startsWith('image/') && part.body) {
        if (part.body.data) {
            results.images.push({
                filename: part.filename || 'inline',
                mimeType: mime,
                data: part.body.data,
                size: part.body.size,
                contentId: (part.headers || []).find(h => h.name.toLowerCase() === 'content-id')?.value
            });
        } else if (part.body.attachmentId) {
            results.images.push({
                filename: part.filename || 'attachment',
                mimeType: mime,
                attachmentId: part.body.attachmentId,
                size: part.body.size,
                contentId: (part.headers || []).find(h => h.name.toLowerCase() === 'content-id')?.value
            });
        }
    }
    
    if (part.parts) part.parts.forEach(p => extractAllParts(p, results));
    return results;
}

async function main() {
    const token = await getAccessToken();
    
    const msgIds = ['19cb4c4697b1da19', '19cb4c2c220cbf53']; // header, logo
    
    for (const msgId of msgIds) {
        console.log(`\n=============== Message: ${msgId} ===============`);
        const full = await gmailGet(token, `messages/${msgId}?format=full`);
        const headers = full.payload.headers || [];
        const subject = (headers.find(h => h.name.toLowerCase() === 'subject') || {}).value || '';
        console.log(`Subject: ${subject}`);
        
        // Dump full payload structure
        function dumpStructure(part, indent = '') {
            console.log(`${indent}${part.mimeType} ${part.filename ? '('+part.filename+')' : ''} body:${part.body ? (part.body.attachmentId ? 'ATT:'+part.body.attachmentId.substring(0,20) : 'data:'+((part.body.data||'').length)+' size:'+part.body.size) : 'none'}`);
            if (part.headers) {
                part.headers.forEach(h => {
                    if (['content-id', 'content-disposition', 'content-transfer-encoding'].includes(h.name.toLowerCase())) {
                        console.log(`${indent}  ${h.name}: ${h.value}`);
                    }
                });
            }
            if (part.parts) part.parts.forEach(p => dumpStructure(p, indent + '  '));
        }
        dumpStructure(full.payload);
        
        const parts = extractAllParts(full.payload);
        console.log(`\nHTML parts: ${parts.html.length}, Plain: ${parts.plain.length}, Images: ${parts.images.length}`);
        
        // Save HTML body
        if (parts.html.length > 0) {
            const htmlFile = `email_${subject.toLowerCase()}_body.html`;
            fs.writeFileSync(htmlFile, parts.html.join('\n'));
            console.log(`Saved HTML body: ${htmlFile} (${parts.html[0].length} chars)`);
            
            // Extract image URLs from HTML
            const imgMatches = parts.html[0].match(/<img[^>]+src="([^"]+)"/gi) || [];
            console.log(`\nImage references in HTML: ${imgMatches.length}`);
            imgMatches.forEach((m, i) => {
                const src = m.match(/src="([^"]+)"/)?.[1] || '';
                console.log(`  ${i}: ${src.substring(0, 120)}...`);
            });
        }
        
        if (parts.plain.length > 0) {
            console.log(`\nPlain text: ${parts.plain[0].substring(0, 200)}`);
        }
        
        // Download attachment images
        for (let i = 0; i < parts.images.length; i++) {
            const img = parts.images[i];
            if (img.attachmentId) {
                console.log(`\nDownloading attachment: ${img.filename} (${img.mimeType})...`);
                const attData = await gmailGet(token, `messages/${msgId}/attachments/${img.attachmentId}`);
                const base64 = attData.data.replace(/-/g, '+').replace(/_/g, '/');
                const buffer = Buffer.from(base64, 'base64');
                const ext = img.mimeType.includes('png') ? 'png' : 'jpg';
                const outFile = `email_${subject.toLowerCase()}_img${i}.${ext}`;
                fs.writeFileSync(outFile, buffer);
                console.log(`Saved: ${outFile} (${buffer.length} bytes)`);
            } else if (img.data) {
                const base64 = img.data.replace(/-/g, '+').replace(/_/g, '/');
                const buffer = Buffer.from(base64, 'base64');
                const ext = img.mimeType.includes('png') ? 'png' : 'jpg';
                const outFile = `email_${subject.toLowerCase()}_img${i}.${ext}`;
                fs.writeFileSync(outFile, buffer);
                console.log(`Saved inline image: ${outFile} (${buffer.length} bytes)`);
            }
        }
    }
    
    console.log('\nDone!');
}

main().catch(err => console.error('Error:', err));
