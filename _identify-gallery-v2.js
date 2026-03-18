/**
 * Identify remaining gallery photos with delays to avoid rate limiting
 */
const https = require('https');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function getGitHubToken() {
    if (process.env.GITHUB_TOKEN) return process.env.GITHUB_TOKEN;
    try { return execSync('gh auth token', { encoding: 'utf8' }).trim(); } catch { }
    process.exit(1);
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

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function identifyPhoto(filePath, token) {
    const base64 = fs.readFileSync(filePath).toString('base64');
    const body = {
        model: 'openai/gpt-4o-mini',
        messages: [{
            role: 'user',
            content: [
                {
                    type: 'text',
                    text: 'This is a photo from BANF (Bengali Association of North Florida). In one brief sentence: is this a real event PHOTO or a FLYER/POSTER? What event or activity does it show? Indoor or outdoor?'
                },
                {
                    type: 'image_url',
                    image_url: { url: `data:image/jpeg;base64,${base64}` }
                }
            ]
        }],
        max_tokens: 80
    };

    const resp = await apiRequest('models.github.ai', '/inference/chat/completions', body, token);
    if (resp.status === 200) {
        const parsed = JSON.parse(resp.body);
        return parsed.choices?.[0]?.message?.content || 'No response';
    }
    if (resp.status === 429) return 'RATE_LIMITED';
    return `Error ${resp.status}`;
}

async function main() {
    const token = getGitHubToken();
    const galleryDir = path.join(__dirname, 'docs/gallery');
    
    // Load previous results
    let existing = {};
    const resultsFile = path.join(galleryDir, '_photo-descriptions.json');
    if (fs.existsSync(resultsFile)) {
        const prev = JSON.parse(fs.readFileSync(resultsFile, 'utf8'));
        for (const r of prev) {
            if (!r.description.startsWith('Error') && r.description !== 'RATE_LIMITED') {
                existing[r.file] = r.description;
            }
        }
    }
    
    const files = fs.readdirSync(galleryDir).filter(f => f.endsWith('.jpg'));
    const toIdentify = files.filter(f => !existing[f]);
    
    console.log('Already identified:', Object.keys(existing).length);
    console.log('Still need:', toIdentify.length);
    
    const results = files.map(f => ({
        file: f,
        description: existing[f] || 'pending',
        size: Math.round(fs.statSync(path.join(galleryDir, f)).size / 1024)
    }));
    
    for (const f of toIdentify) {
        const filePath = path.join(galleryDir, f);
        process.stdout.write(f + '... ');
        
        const desc = await identifyPhoto(filePath, token);
        if (desc === 'RATE_LIMITED') {
            console.log('Rate limited, waiting 15s...');
            await sleep(15000);
            const retry = await identifyPhoto(filePath, token);
            const entry = results.find(r => r.file === f);
            entry.description = retry;
            console.log(retry);
        } else {
            const entry = results.find(r => r.file === f);
            entry.description = desc;
            console.log(desc);
        }
        
        // Wait 12s between requests
        await sleep(12000);
    }
    
    fs.writeFileSync(resultsFile, JSON.stringify(results, null, 2));
    
    console.log('\n=== SUMMARY ===');
    for (const r of results) {
        const type = r.description.toLowerCase().includes('flyer') || r.description.toLowerCase().includes('poster') 
            ? 'FLYER' : 'PHOTO';
        console.log(`[${type}] ${r.file}: ${r.description}`);
    }
}

main().catch(e => console.error(e));
