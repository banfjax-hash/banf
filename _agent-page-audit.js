/**
 * Agent-Guided Page Audit: Screenshot + Vision Analysis
 * 
 * Takes screenshots of jaxbengali.org at multiple stages:
 *   1. Immediately on load (what user sees first)
 *   2. After 1 second (mid-redirect)
 *   3. After 5 seconds (final destination)
 * 
 * Then sends each to GitHub Models vision API for analysis.
 * 
 * Run: node _agent-page-audit.js
 */

const puppeteer = require('puppeteer');
const https = require('https');
const fs = require('fs');
const { execSync } = require('child_process');
const path = require('path');

// ── Config ──
const TARGET_URL = 'https://www.jaxbengali.org';
const EXPECTED_URL = 'https://banfjax-hash.github.io/banf/v2/';
const SCREENSHOT_DIR = path.join(__dirname, '_audit-screenshots');
const VISION_MODEL = 'openai/gpt-4.1-mini';

// ── GitHub Token ──
function getGitHubToken() {
    if (process.env.GITHUB_TOKEN) return process.env.GITHUB_TOKEN;
    try { return execSync('gh auth token', { encoding: 'utf8' }).trim(); } catch { }
    console.error('No GitHub token. Set GITHUB_TOKEN or run `gh auth login`');
    process.exit(1);
}

// ── HTTPS helper ──
function apiRequest(hostname, reqPath, body, token) {
    return new Promise((resolve, reject) => {
        const data = JSON.stringify(body);
        const opts = {
            hostname, path: reqPath, method: 'POST', headers: {
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

// ── Vision Analysis ──
async function analyzeScreenshot(imagePath, context, token) {
    const imageB64 = fs.readFileSync(imagePath).toString('base64');
    const prompt = `You are a web development expert analyzing a screenshot of a website.

Context: ${context}

Analyze this screenshot and report:
1. What page/content is visible? Describe everything you see.
2. Is this the expected content for a modern community website?
3. Are there any visual issues (old design, flash of wrong content, blank page, etc.)?
4. What URL or page title is shown in the browser?
5. Rate the user experience from 1-10.

Return a JSON object:
{
  "pageTitle": "what title/heading is shown",
  "visibleContent": "brief description of ALL visible elements",
  "isExpectedContent": true/false,
  "issues": ["list of issues found"],
  "uxRating": 7,
  "recommendation": "what should be done to fix issues"
}`;

    const body = {
        model: VISION_MODEL,
        messages: [{
            role: 'user',
            content: [
                { type: 'image_url', image_url: { url: `data:image/png;base64,${imageB64}` } },
                { type: 'text', text: prompt }
            ]
        }],
        max_tokens: 1500,
        temperature: 0.1
    };

    const resp = await apiRequest('models.github.ai', '/inference/chat/completions', body, token);
    if (resp.status !== 200) {
        return { error: `HTTP ${resp.status}: ${resp.body.substring(0, 200)}` };
    }
    const data = JSON.parse(resp.body);
    const content = data.choices?.[0]?.message?.content || '';
    try {
        const cleaned = content.replace(/```json\s*/gi, '').replace(/```\s*/gi, '').trim();
        return JSON.parse(cleaned);
    } catch {
        return { raw: content };
    }
}

// ── Main Agent Flow ──
async function main() {
    const token = getGitHubToken();
    console.log('GitHub token: OK');
    
    if (!fs.existsSync(SCREENSHOT_DIR)) fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

    console.log('\n=== PHASE 1: Browser Screenshots ===\n');
    
    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
        defaultViewport: { width: 1400, height: 900 }
    });
    
    const page = await browser.newPage();
    
    // Track all navigations
    const navigationLog = [];
    page.on('framenavigated', frame => {
        if (frame === page.mainFrame()) {
            navigationLog.push({ url: frame.url(), time: Date.now() });
        }
    });
    
    // Screenshot 1: Capture IMMEDIATELY on first response (before JS runs)
    console.log(`[1] Navigating to ${TARGET_URL} ...`);
    
    // Use waitUntil: 'domcontentloaded' for earliest possible visible state
    const startTime = Date.now();
    await page.goto(TARGET_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
    const commitTime = Date.now() - startTime;
    console.log(`    First response received in ${commitTime}ms`);
    
    const ss1 = path.join(SCREENSHOT_DIR, '01_first_response.png');
    await page.screenshot({ path: ss1, fullPage: false });
    const url1 = page.url();
    console.log(`    URL: ${url1}`);
    console.log(`    Screenshot saved: ${ss1}`);
    
    // Screenshot 2: After DOM loaded
    console.log('\n[2] Waiting for DOM content loaded ...');
    await page.waitForFunction(() => document.readyState === 'interactive' || document.readyState === 'complete', { timeout: 10000 }).catch(() => {});
    const domTime = Date.now() - startTime;
    
    const ss2 = path.join(SCREENSHOT_DIR, '02_dom_loaded.png');
    await page.screenshot({ path: ss2, fullPage: false });
    const url2 = page.url();
    console.log(`    DOM ready in ${domTime}ms`);
    console.log(`    URL: ${url2}`);
    console.log(`    Screenshot saved: ${ss2}`);
    
    // Screenshot 3: After 2 seconds (mid-redirect)
    console.log('\n[3] Waiting 2 seconds ...');
    await new Promise(r => setTimeout(r, 2000));
    
    const ss3 = path.join(SCREENSHOT_DIR, '03_after_2s.png');
    await page.screenshot({ path: ss3, fullPage: false });
    const url3 = page.url();
    const time3 = Date.now() - startTime;
    console.log(`    At ${time3}ms`);
    console.log(`    URL: ${url3}`);
    console.log(`    Screenshot saved: ${ss3}`);
    
    // Screenshot 4: After 6 seconds (should be at final destination)
    console.log('\n[4] Waiting 4 more seconds ...');
    await new Promise(r => setTimeout(r, 4000));
    
    const ss4 = path.join(SCREENSHOT_DIR, '04_final_6s.png');
    await page.screenshot({ path: ss4, fullPage: false });
    const url4 = page.url();
    const time4 = Date.now() - startTime;
    console.log(`    At ${time4}ms`);
    console.log(`    URL: ${url4}`);
    console.log(`    Screenshot saved: ${ss4}`);
    
    // Navigation log
    console.log('\n=== Navigation Log ===');
    navigationLog.forEach((nav, i) => {
        console.log(`  [${i + 1}] ${nav.url} (at +${nav.time - startTime}ms)`);
    });
    
    await browser.close();
    
    // ── PHASE 2: Vision Analysis ──
    console.log('\n=== PHASE 2: Vision Model Analysis ===\n');
    
    const screenshots = [
        { file: ss1, context: `First response from ${TARGET_URL}. Captured at commit (${commitTime}ms). URL was: ${url1}. This is what renders before any JavaScript executes.` },
        { file: ss2, context: `DOM content loaded on ${TARGET_URL}. Captured at ${domTime}ms. URL was: ${url2}. JavaScript may have started executing.` },
        { file: ss3, context: `2 seconds after navigation to ${TARGET_URL}. URL is now: ${url3}. Expected destination: ${EXPECTED_URL}. Time: ${time3}ms.` },
        { file: ss4, context: `6 seconds after navigation to ${TARGET_URL}. URL is now: ${url4}. Expected destination: ${EXPECTED_URL}. Time: ${time4}ms. This should be the final state.` }
    ];
    
    const analyses = [];
    for (const ss of screenshots) {
        const label = path.basename(ss.file, '.png');
        console.log(`Analyzing: ${label} ...`);
        const result = await analyzeScreenshot(ss.file, ss.context, token);
        analyses.push({ label, url: ss.context.match(/URL (?:was|is now): ([^\s.]+)/)?.[1], ...result });
        console.log(`  Done: ${result.visibleContent?.substring(0, 100) || result.raw?.substring(0, 100) || JSON.stringify(result).substring(0, 100)}`);
    }
    
    // ── PHASE 3: Summary Report ──
    console.log('\n=== PHASE 3: AGENT AUDIT REPORT ===\n');
    
    const report = {
        auditDate: new Date().toISOString(),
        targetUrl: TARGET_URL,
        expectedDestination: EXPECTED_URL,
        navigationChain: navigationLog.map(n => ({ url: n.url, relativeMs: n.time - startTime })),
        totalRedirectTime: time4,
        finalUrl: url4,
        reachedExpected: url4.startsWith(EXPECTED_URL),
        screenshots: analyses,
        overallAssessment: null
    };
    
    // Determine overall issues
    const issues = [];
    if (url1 !== EXPECTED_URL) issues.push(`Initial URL is ${url1}, not ${EXPECTED_URL} — shows intermediate page`);
    if (navigationLog.length > 2) issues.push(`${navigationLog.length} navigation hops detected — too many redirects`);
    if (commitTime > 500) issues.push(`First response took ${commitTime}ms — slow server response`);
    if (!report.reachedExpected) issues.push(`Final URL ${url4} doesn't match expected ${EXPECTED_URL}`);
    
    const flashAnalysis = analyses[0];
    if (flashAnalysis && flashAnalysis.uxRating && flashAnalysis.uxRating < 5) {
        issues.push(`Initial page UX rated ${flashAnalysis.uxRating}/10 by vision model — visible flash of wrong content`);
    }
    
    report.overallAssessment = {
        issueCount: issues.length,
        issues,
        redirectHops: navigationLog.length,
        hasVisibleFlash: analyses.some(a => a.issues && a.issues.length > 0)
    };
    
    // Save report
    const reportPath = path.join(SCREENSHOT_DIR, 'audit-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    console.log('Target URL:', TARGET_URL);
    console.log('Final URL:', url4);
    console.log('Reached expected:', report.reachedExpected);
    console.log('Navigation hops:', navigationLog.length);
    console.log('Total time:', time4 + 'ms');
    console.log('\nIssues found:', issues.length);
    issues.forEach(i => console.log('  -', i));
    
    console.log('\nVision Analysis per screenshot:');
    analyses.forEach(a => {
        console.log(`\n  [${a.label}]`);
        console.log(`    Content: ${a.visibleContent || 'N/A'}`);
        console.log(`    Expected: ${a.isExpectedContent}`);
        console.log(`    UX Rating: ${a.uxRating || 'N/A'}/10`);
        if (a.issues) a.issues.forEach(i => console.log(`    Issue: ${i}`));
        if (a.recommendation) console.log(`    Fix: ${a.recommendation}`);
    });
    
    console.log('\nFull report saved:', reportPath);
    console.log('Screenshots:', SCREENSHOT_DIR);
}

main().catch(err => {
    console.error('Agent error:', err);
    process.exit(1);
});
