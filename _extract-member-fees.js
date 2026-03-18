#!/usr/bin/env node
/**
 * Extract membership fees from member_fees.png using GitHub Models Vision API
 * Outputs JSON to stdout
 * Run: node _extract-member-fees.js
 */
const https = require('https');
const fs = require('fs');
const { execSync } = require('child_process');
const path = require('path');

function getGitHubToken() {
    if (process.env.GITHUB_TOKEN) return process.env.GITHUB_TOKEN;
    try { return execSync('gh auth token', { encoding: 'utf8' }).trim(); } catch {}
    console.error('No GitHub token. Set GITHUB_TOKEN or run `gh auth login`');
    process.exit(1);
}

function apiRequest(hostname, reqPath, body, token) {
    return new Promise((resolve, reject) => {
        const data = JSON.stringify(body);
        const opts = {
            hostname, path: reqPath, method: 'POST', headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/vnd.github+json',
                'Authorization': `Bearer ${token}`,
                'X-GitHub-Api-Version': '2022-11-28',
                'Content-Length': Buffer.byteLength(data)
            }
        };
        const req = https.request(opts, res => {
            let buf = '';
            res.on('data', c => buf += c);
            res.on('end', () => resolve({ status: res.statusCode, body: buf }));
        });
        req.on('error', reject);
        req.setTimeout(120000, () => { req.destroy(); reject(new Error('Timeout')); });
        req.write(data);
        req.end();
    });
}

const PROMPT = `Analyze this membership fees image carefully. Extract ALL membership fee information visible.

Return ONLY valid JSON (no markdown, no backticks):
{
  "tiers": [
    {
      "tierName": "e.g. Family, Individual, Student, Senior etc.",
      "annualFee": 100,
      "description": "brief description if visible",
      "benefits": ["list of benefits if visible"]
    }
  ],
  "notes": ["any additional fee notes, discounts, or special conditions visible"],
  "currency": "USD",
  "confidence": "high"
}

Rules:
- Extract EVERY tier/category visible in the image
- annualFee must be a number
- Include any early bird, multi-year, or promotional pricing if shown
- Include senior, student, or family pricing variants
- confidence: "high" if image is clear, "medium" if partially readable`;

async function main() {
    const imgPath = path.join(__dirname, 'member_fees.png');
    if (!fs.existsSync(imgPath)) {
        console.error('member_fees.png not found');
        process.exit(1);
    }

    const imageB64 = fs.readFileSync(imgPath).toString('base64');
    const token = getGitHubToken();

    console.error('Analyzing member_fees.png with GPT-4.1-mini vision...');

    const body = {
        model: 'openai/gpt-4.1-mini',
        messages: [{
            role: 'user',
            content: [
                { type: 'image_url', image_url: { url: `data:image/png;base64,${imageB64}` } },
                { type: 'text', text: PROMPT }
            ]
        }],
        max_tokens: 3000,
        temperature: 0.1,
        stream: false
    };

    const resp = await apiRequest('models.github.ai', '/inference/chat/completions', body, token);

    if (resp.status !== 200) {
        console.error('API Error:', resp.status, resp.body.substring(0, 300));
        process.exit(1);
    }

    const data = JSON.parse(resp.body);
    const content = data.choices?.[0]?.message?.content || '';
    const cleaned = content.replace(/```json\s*/gi, '').replace(/```\s*/gi, '').trim();

    try {
        const parsed = JSON.parse(cleaned);
        console.log(JSON.stringify(parsed, null, 2));
    } catch {
        console.error('Raw response (could not parse JSON):');
        console.error(content);
        process.exit(1);
    }
}

main().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
