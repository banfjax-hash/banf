/**
 * Fetch RAW email format to find images
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
    
    // Get RAW format for both messages
    const msgIds = { '19cb4c4697b1da19': 'header', '19cb4c2c220cbf53': 'logo' };
    
    for (const [msgId, label] of Object.entries(msgIds)) {
        console.log(`\n=== ${label} email (${msgId}) ===`);
        
        // Get RAW format
        const raw = await gmailGet(token, `messages/${msgId}?format=raw`);
        const rawStr = Buffer.from(raw.raw.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf-8');
        fs.writeFileSync(`email_${label}_raw.eml`, rawStr);
        console.log(`Saved raw: email_${label}_raw.eml (${rawStr.length} chars)`);
        
        // Check for image content types in raw
        const contentTypes = rawStr.match(/Content-Type:\s*image\/[^\r\n]+/gi) || [];
        console.log(`Image content-type headers found: ${contentTypes.length}`);
        contentTypes.forEach(ct => console.log(`  ${ct}`));
        
        // Check for base64 encoded content
        const base64Markers = rawStr.match(/Content-Transfer-Encoding:\s*base64/gi) || [];
        console.log(`Base64 transfer encoding markers: ${base64Markers.length}`);
        
        // Check for Google Photos / Drive links
        const googleLinks = rawStr.match(/https:\/\/[^\s"<>]*google[^\s"<>]*/gi) || [];
        console.log(`Google links: ${googleLinks.length}`);
        googleLinks.forEach(l => console.log(`  ${l.substring(0, 150)}`));
        
        // Check for any image URLs
        const imgUrls = rawStr.match(/https?:\/\/[^\s"<>]*\.(jpg|jpeg|png|gif|webp|bmp)/gi) || [];
        console.log(`Image URLs: ${imgUrls.length}`);
        imgUrls.forEach(l => console.log(`  ${l.substring(0, 150)}`));
        
        // Show first 2000 chars to understand structure
        console.log(`\nFirst 2000 chars:`);
        console.log(rawStr.substring(0, 2000));
        console.log('---');
    }
}

main().catch(err => console.error('Error:', err));
