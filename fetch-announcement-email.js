/**
 * Search Gmail for Ranadhir Ghosh's "announcement" email and extract content
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
    const parsed = JSON.parse(res.data);
    if (!parsed.access_token) { console.error('Auth failed:', parsed); process.exit(1); }
    return parsed.access_token;
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
    if (mime === 'text/html' && part.body && part.body.data) results.html.push(decodeBase64Url(part.body.data));
    if (mime === 'text/plain' && part.body && part.body.data) results.plain.push(decodeBase64Url(part.body.data));
    if (mime.startsWith('image/') && part.body) {
        if (part.body.attachmentId) {
            results.images.push({ filename: part.filename || 'attachment', mimeType: mime, attachmentId: part.body.attachmentId, size: part.body.size });
        } else if (part.body.data) {
            results.images.push({ filename: part.filename || 'inline', mimeType: mime, data: part.body.data, size: part.body.size });
        }
    }
    if (part.parts) part.parts.forEach(p => extractAllParts(p, results));
    return results;
}

async function main() {
    console.log('Authenticating with Gmail API...');
    const token = await getAccessToken();
    console.log('Authenticated OK\n');

    // Search for the announcement email from ranadhir
    const query = encodeURIComponent('from:ranadhir subject:announcement');
    console.log(`Searching: from:ranadhir subject:announcement`);
    const search = await gmailGet(token, `messages?q=${query}&maxResults=5`);
    
    if (!search.messages || search.messages.length === 0) {
        console.log('No messages found. Trying broader search...');
        const query2 = encodeURIComponent('subject:announcement');
        const search2 = await gmailGet(token, `messages?q=${query2}&maxResults=10`);
        if (!search2.messages || search2.messages.length === 0) {
            console.log('Still no results. Trying from:ranadhir...');
            const query3 = encodeURIComponent('from:ranadhir');
            const search3 = await gmailGet(token, `messages?q=${query3}&maxResults=10`);
            if (search3.messages) {
                console.log(`Found ${search3.messages.length} emails from ranadhir:`);
                for (const m of search3.messages) {
                    const msg = await gmailGet(token, `messages/${m.id}?format=metadata&metadataHeaders=Subject&metadataHeaders=From&metadataHeaders=Date`);
                    const h = msg.payload.headers || [];
                    console.log(`  ID: ${m.id} | Subject: ${(h.find(x=>x.name==='Subject')||{}).value} | Date: ${(h.find(x=>x.name==='Date')||{}).value}`);
                }
            }
            return;
        }
        search.messages = search2.messages;
    }

    console.log(`Found ${search.messages.length} message(s)\n`);

    for (const m of search.messages) {
        console.log(`\n========== Message ID: ${m.id} ==========`);
        const full = await gmailGet(token, `messages/${m.id}?format=full`);
        const headers = full.payload.headers || [];
        const subject = (headers.find(h => h.name.toLowerCase() === 'subject') || {}).value || '';
        const from = (headers.find(h => h.name.toLowerCase() === 'from') || {}).value || '';
        const date = (headers.find(h => h.name.toLowerCase() === 'date') || {}).value || '';
        
        console.log(`From: ${from}`);
        console.log(`Subject: ${subject}`);
        console.log(`Date: ${date}`);
        
        const parts = extractAllParts(full.payload);
        console.log(`HTML parts: ${parts.html.length}, Plain parts: ${parts.plain.length}, Images: ${parts.images.length}`);
        
        // Show plain text content
        if (parts.plain.length > 0) {
            console.log(`\n--- PLAIN TEXT ---`);
            console.log(parts.plain.join('\n'));
        }
        
        // Show HTML content (extract text and links)
        if (parts.html.length > 0) {
            const html = parts.html.join('\n');
            fs.writeFileSync(`announcement_email_body.html`, html);
            console.log(`\nSaved HTML body to announcement_email_body.html (${html.length} chars)`);
            
            // Extract all links
            const links = [...html.matchAll(/<a[^>]+href="([^"]+)"[^>]*>(.*?)<\/a>/gi)];
            console.log(`\n--- LINKS FOUND (${links.length}) ---`);
            links.forEach((l, i) => {
                const text = l[2].replace(/<[^>]+>/g, '').trim();
                console.log(`  ${i+1}. Text: "${text}" => URL: ${l[1]}`);
            });
            
            // Extract all images
            const imgs = [...html.matchAll(/<img[^>]+src="([^"]+)"[^>]*>/gi)];
            console.log(`\n--- IMAGES IN HTML (${imgs.length}) ---`);
            imgs.forEach((img, i) => {
                const alt = img[0].match(/alt="([^"]*)"/i)?.[1] || '';
                console.log(`  ${i+1}. src: ${img[1].substring(0, 200)}`);
                if (alt) console.log(`     alt: "${alt}"`);
            });
        }
        
        // Download attachment images
        for (let i = 0; i < parts.images.length; i++) {
            const img = parts.images[i];
            if (img.attachmentId) {
                console.log(`\nDownloading attachment: ${img.filename} (${img.mimeType}, ${img.size} bytes)...`);
                const attData = await gmailGet(token, `messages/${m.id}/attachments/${img.attachmentId}`);
                const base64 = attData.data.replace(/-/g, '+').replace(/_/g, '/');
                const buffer = Buffer.from(base64, 'base64');
                const ext = img.mimeType.includes('png') ? 'png' : 'jpg';
                const outFile = `announcement_email_img${i}.${ext}`;
                fs.writeFileSync(outFile, buffer);
                console.log(`Saved: ${outFile} (${buffer.length} bytes)`);
            }
        }
    }
    
    console.log('\n\nDone!');
}

main().catch(err => console.error('Error:', err));
