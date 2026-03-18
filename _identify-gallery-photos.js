/**
 * Use GitHub Models Vision API to identify all gallery photos
 */
const https = require('https');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function getGitHubToken() {
    if (process.env.GITHUB_TOKEN) return process.env.GITHUB_TOKEN;
    try { return execSync('gh auth token', { encoding: 'utf8' }).trim(); } catch { }
    console.error('No GitHub token found'); process.exit(1);
}

function apiRequest(hostname, apiPath, body, token) {
    return new Promise((resolve, reject) => {
        const data = JSON.stringify(body);
        const opts = {
            hostname, path: apiPath, method: 'POST', headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
                'Content-Length': Buffer.byteLength(data)
            }
        };
        const req = https.request(opts, res => {
            let buf = '';
            res.on('data', c => buf += c);
            res.on('end', () => resolve({ status: res.statusCode, body: buf }));
        });
        req.on('error', reject);
        req.setTimeout(60000, () => { req.destroy(); reject(new Error('Timeout')); });
        req.write(data);
        req.end();
    });
}

async function identifyPhoto(filePath, token) {
    const base64 = fs.readFileSync(filePath).toString('base64');
    const body = {
        model: 'openai/gpt-4o-mini',
        messages: [{
            role: 'user',
            content: [
                {
                    type: 'text',
                    text: 'This is a photo from BANF (Bengali Association of North Florida) in Jacksonville, FL. Describe what you see in 1-2 sentences: what type of event or activity, approximate number of people, setting (indoor/outdoor), and any visible text or banners. If it looks like a flyer/poster rather than a photo, say so.'
                },
                {
                    type: 'image_url',
                    image_url: { url: `data:image/jpeg;base64,${base64}` }
                }
            ]
        }],
        max_tokens: 150
    };

    const resp = await apiRequest('models.github.ai', '/inference/chat/completions', body, token);
    if (resp.status === 200) {
        const parsed = JSON.parse(resp.body);
        return parsed.choices?.[0]?.message?.content || 'No response';
    }
    return `Error ${resp.status}: ${resp.body.substring(0, 100)}`;
}

async function main() {
    const token = getGitHubToken();
    const galleryDir = path.join(__dirname, 'docs/gallery');
    const files = fs.readdirSync(galleryDir).filter(f => f.endsWith('.jpg'));
    
    console.log('Identifying ' + files.length + ' gallery photos...\n');
    
    const results = [];
    for (const f of files) {
        const filePath = path.join(galleryDir, f);
        const size = Math.round(fs.statSync(filePath).size / 1024);
        process.stdout.write(f + ' (' + size + 'KB)... ');
        
        try {
            const desc = await identifyPhoto(filePath, token);
            console.log(desc);
            results.push({ file: f, description: desc, size });
        } catch (e) {
            console.log('ERROR: ' + e.message);
            results.push({ file: f, description: 'Error: ' + e.message, size });
        }
    }
    
    // Write results
    fs.writeFileSync(path.join(galleryDir, '_photo-descriptions.json'), JSON.stringify(results, null, 2));
    console.log('\nResults saved to docs/gallery/_photo-descriptions.json');
}

main().catch(e => console.error(e));
