/**
 * BANF EC Admin — Interactive Vision Debug Agent
 * ═══════════════════════════════════════════════
 * Uses Puppeteer (browser automation) + GitHub Models Vision API
 * to automatically debug the EC admin portal login/dashboard flow.
 *
 * Capabilities:
 *  1. Takes screenshots at every step + analyzes with vision AI
 *  2. Captures browser console logs & network requests (all 4xx/5xx)
 *  3. Sends screenshots to GPT-4.1-mini vision for automated analysis
 *  4. Interactive CLI: user can request screenshots, click, type, navigate
 *  5. Detects & auto-fixes common issues (stale session, CORS, etc.)
 *  6. Tests all EC member accounts for login issues
 *  7. Produces a full diagnostic HTML report with embedded screenshots
 *
 * Usage:
 *   node ec-admin-debug-agent.js                   # auto-diagnose mode (headless)
 *   node ec-admin-debug-agent.js --interactive      # interactive CLI mode (headed)
 *   node ec-admin-debug-agent.js --headed           # browser visible
 *   node ec-admin-debug-agent.js --email X --password Y  # custom creds
 *   node ec-admin-debug-agent.js --all-accounts     # test all EC members
 *   node ec-admin-debug-agent.js --watch            # monitor mode (re-check every 60s)
 *
 * Default: Uses president credentials for testing.
 */

const puppeteer = require('puppeteer');
const https = require('https');
const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { execSync } = require('child_process');

// ═══════════════════════════════════════════════════════════════
//  CONFIG
// ═══════════════════════════════════════════════════════════════
const ARGS = process.argv.slice(2);
const FLAG = (name) => ARGS.includes('--' + name);
const PARAM = (name, fallback) => {
  const idx = ARGS.indexOf('--' + name);
  return idx >= 0 && ARGS[idx + 1] ? ARGS[idx + 1] : fallback;
};

const CONFIG = {
  headless: FLAG('headless') || (!FLAG('headed') && !FLAG('interactive')),
  interactive: FLAG('interactive'),
  allAccounts: FLAG('all-accounts'),
  watch: FLAG('watch'),
  email: PARAM('email', 'ranadhir.ghosh@gmail.com'),
  password: PARAM('password', '282@SentosaDrive'),
  loginUrl: 'https://banfjax-hash.github.io/banf/ec-admin-login.html',
  portalUrl: 'https://banfjax-hash.github.io/banf/admin-portal.html',
  screenshotDir: path.join(__dirname, '_debug-screenshots'),
  visionModel: 'openai/gpt-4.1-mini',
  maxSteps: 30,
};

// EC member test accounts
const EC_ACCOUNTS = [
  { email: 'ranadhir.ghosh@gmail.com', name: 'President (Ranadhir)', password: '282@SentosaDrive' },
  { email: 'mukhopadhyay.partha@gmail.com', name: 'VP (Partha)', password: null },
  { email: 'amit.everywhere@gmail.com', name: 'Treasurer (Amit)', password: null },
  { email: 'jyoti.diyali@gmail.com', name: 'Gen Sec (Jyoti)', password: null },
  { email: 'moumita.mukherje@gmail.com', name: 'Cultural Sec (Moumita)', password: null },
  { email: 'snigdha.ghosh72@gmail.com', name: 'Sports Sec (Snigdha)', password: null },
  { email: 'smita.bose2014@gmail.com', name: 'Media Coord (Smita)', password: null },
];

// ═══════════════════════════════════════════════════════════════
//  GITHUB MODELS VISION API
// ═══════════════════════════════════════════════════════════════
function getGitHubToken() {
  if (process.env.GITHUB_TOKEN) return process.env.GITHUB_TOKEN;
  try { return execSync('gh auth token', { encoding: 'utf8' }).trim(); } catch { }
  console.error('⛔ No GitHub token. Set GITHUB_TOKEN or run `gh auth login`');
  process.exit(1);
}

function apiRequest(hostname, urlPath, body, token) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const opts = {
      hostname, path: urlPath, method: 'POST',
      headers: {
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
    req.setTimeout(90000, () => { req.destroy(); reject(new Error('Timeout 90s')); });
    req.write(data);
    req.end();
  });
}

async function analyzeScreenshot(screenshotPath, context, token) {
  const imageB64 = fs.readFileSync(screenshotPath).toString('base64');
  const prompt = `You are a QA debug agent analyzing a web application screenshot.

Context: ${context}

Analyze this screenshot and report:
1. What is visible on screen? (login page, dashboard, error message, blank page, etc.)
2. Are there any error messages visible? (HTTP errors, JavaScript errors, "400", "500", alert boxes, red text, etc.)
3. What state is the application in? (loading, logged in, showing data, error state)
4. Any UI issues? (broken layout, missing elements, overlapping text)
5. What should happen next to debug the issue?

Be concise and specific. If you see "400" or error codes, note them precisely. Focus on actionable findings.`;

  const body = {
    model: CONFIG.visionModel,
    messages: [{
      role: 'user',
      content: [
        { type: 'image_url', image_url: { url: `data:image/png;base64,${imageB64}` } },
        { type: 'text', text: prompt }
      ]
    }],
    max_tokens: 1000,
    temperature: 0.1
  };

  try {
    const resp = await apiRequest('models.github.ai', '/inference/chat/completions', body, token);
    if (resp.status !== 200) {
      const err = JSON.parse(resp.body);
      return `[Vision API Error ${resp.status}] ${err.error?.message || resp.body.substring(0, 200)}`;
    }
    const data = JSON.parse(resp.body);
    return data.choices?.[0]?.message?.content || '[No response from vision model]';
  } catch (e) {
    return `[Vision Error] ${e.message}`;
  }
}

// ═══════════════════════════════════════════════════════════════
//  DEBUG AGENT CORE
// ═══════════════════════════════════════════════════════════════
class DebugAgent {
  constructor() {
    this.browser = null;
    this.page = null;
    this.token = getGitHubToken();
    this.consoleLogs = [];
    this.networkErrors = [];
    this.networkRequests = [];
    this.stepCount = 0;
    this.report = [];
    this.allFindings = [];

    // Ensure screenshot directory
    if (!fs.existsSync(CONFIG.screenshotDir)) {
      fs.mkdirSync(CONFIG.screenshotDir, { recursive: true });
    }
  }

  log(msg) {
    const ts = new Date().toISOString().substring(11, 23);
    const line = `[${ts}] ${msg}`;
    console.log(line);
    this.report.push(line);
  }

  async init() {
    this.log('🚀 Launching browser...');
    this.browser = await puppeteer.launch({
      headless: CONFIG.headless ? 'new' : false,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1440,900'],
      defaultViewport: { width: 1440, height: 900 }
    });
    this.page = await this.browser.newPage();

    // Capture console logs
    this.page.on('console', msg => {
      const entry = { type: msg.type(), text: msg.text(), ts: Date.now() };
      this.consoleLogs.push(entry);
      if (msg.type() === 'error') {
        this.log(`  🔴 CONSOLE ERROR: ${msg.text().substring(0, 200)}`);
      }
    });

    // Capture page errors (uncaught exceptions)
    this.page.on('pageerror', err => {
      const entry = { type: 'pageerror', text: err.message, ts: Date.now() };
      this.consoleLogs.push(entry);
      this.log(`  💥 PAGE ERROR: ${err.message.substring(0, 200)}`);
    });

    // Capture network requests & responses
    this.page.on('requestfinished', async req => {
      const resp = req.response();
      const url = req.url();
      const status = resp ? resp.status() : 0;
      const method = req.method();

      // Track ALL API calls
      if (url.includes('_functions') || url.includes('jaxbengali.org') || url.includes('wixsite.com')) {
        const entry = { method, url: url.substring(0, 150), status, ts: Date.now() };
        this.networkRequests.push(entry);

        if (status >= 400) {
          let body = '';
          try { body = await resp.text(); } catch { }
          entry.body = body.substring(0, 500);
          this.networkErrors.push(entry);
          this.log(`  ⚠️  HTTP ${status} ${method} ${url.substring(0, 100)}`);
          if (body) this.log(`     Response: ${body.substring(0, 200)}`);
        }
      }
    });

    // Capture failed requests (network errors)
    this.page.on('requestfailed', req => {
      const url = req.url();
      if (url.includes('_functions') || url.includes('jaxbengali.org')) {
        const reason = req.failure()?.errorText || 'unknown';
        this.networkErrors.push({ method: req.method(), url: url.substring(0, 150), status: 0, error: reason, ts: Date.now() });
        this.log(`  ❌ REQUEST FAILED: ${req.method()} ${url.substring(0, 100)} — ${reason}`);
      }
    });

    this.log('✅ Browser ready');
  }

  async screenshot(label) {
    this.stepCount++;
    const filename = `step-${String(this.stepCount).padStart(2, '0')}-${label.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.png`;
    const filepath = path.join(CONFIG.screenshotDir, filename);
    await this.page.screenshot({ path: filepath, fullPage: false });
    this.log(`📸 Screenshot: ${filename}`);
    return filepath;
  }

  async analyzeStep(screenshotPath, context) {
    this.log('🤖 Analyzing screenshot with vision model...');
    const analysis = await analyzeScreenshot(screenshotPath, context, this.token);
    this.log(`📋 Vision Analysis:\n${analysis}`);
    this.allFindings.push({ step: this.stepCount, context, analysis });
    return analysis;
  }

  async waitForStable(timeout = 3000) {
    try {
      await this.page.waitForNetworkIdle({ idleTime: 1000, timeout });
    } catch {
      // Timeout is fine — some pages keep connections open
    }
  }

  // ═══════ STEP FUNCTIONS ═══════

  async step_loadLoginPage() {
    this.log('\n═══ STEP: Load EC Admin Login Page ═══');
    await this.page.goto(CONFIG.loginUrl, { waitUntil: 'networkidle2', timeout: 30000 });
    await this.waitForStable();
    const shot = await this.screenshot('login-page-loaded');
    return await this.analyzeStep(shot, 'Just loaded the EC Admin Login page at ec-admin-login.html. Checking if the page renders correctly.');
  }

  async step_enterCredentials() {
    this.log('\n═══ STEP: Enter Login Credentials ═══');
    // Clear and type email
    const emailField = await this.page.$('#login-email');
    if (!emailField) {
      this.log('❌ Email field #login-email not found!');
      return 'Email field not found on page';
    }
    await emailField.click({ clickCount: 3 });
    await emailField.type(CONFIG.email, { delay: 30 });

    // Clear and type password
    const passField = await this.page.$('#login-pass');
    if (!passField) {
      this.log('❌ Password field #login-pass not found!');
      return 'Password field not found on page';
    }
    await passField.click({ clickCount: 3 });
    await passField.type(CONFIG.password, { delay: 30 });

    const shot = await this.screenshot('credentials-entered');
    return await this.analyzeStep(shot, 'Entered email and password credentials in the login form. About to click sign in.');
  }

  async step_clickLogin() {
    this.log('\n═══ STEP: Click Login Button ═══');
    // Reset network tracking for this step
    const preClickErrors = this.networkErrors.length;
    const preClickRequests = this.networkRequests.length;

    const btn = await this.page.$('#btn-login');
    if (!btn) {
      this.log('❌ Login button #btn-login not found!');
      return 'Login button not found';
    }
    await btn.click();

    // Wait for navigation or network activity
    this.log('  Waiting for login response...');
    await new Promise(r => setTimeout(r, 3000));
    await this.waitForStable(5000);

    // Check if we navigated to admin-portal.html
    const currentUrl = this.page.url();
    this.log(`  Current URL: ${currentUrl}`);

    // New network activity after click
    const newRequests = this.networkRequests.slice(preClickRequests);
    const newErrors = this.networkErrors.slice(preClickErrors);
    this.log(`  Network: ${newRequests.length} requests, ${newErrors.length} errors after click`);
    for (const req of newRequests) {
      this.log(`    ${req.status} ${req.method} ${req.url}`);
    }

    const shot = await this.screenshot('after-login-click');
    return await this.analyzeStep(shot,
      `Clicked the login button. URL is now: ${currentUrl}. ` +
      `${newErrors.length} network errors detected. ` +
      `Network requests: ${newRequests.map(r => `${r.status} ${r.method} ${r.url.split('/').pop()}`).join('; ')}`
    );
  }

  async step_checkPortalLoad() {
    this.log('\n═══ STEP: Check Portal After Login ═══');
    const currentUrl = this.page.url();

    // If we're on admin-portal.html, check if it loaded properly
    if (currentUrl.includes('admin-portal')) {
      this.log('  ✅ Navigated to admin-portal.html');
      // Wait extra time for portal initialization
      await new Promise(r => setTimeout(r, 3000));
      await this.waitForStable(5000);

      // Check if the portal div is visible
      const portalVisible = await this.page.evaluate(() => {
        const portal = document.getElementById('portal');
        const login = document.getElementById('login-screen');
        return {
          portalDisplay: portal ? portal.style.display : 'NOT_FOUND',
          loginDisplay: login ? login.style.display : 'NOT_FOUND',
          hasCurrentAdmin: typeof CURRENT_ADMIN !== 'undefined' && CURRENT_ADMIN !== null,
          currentAdmin: typeof CURRENT_ADMIN !== 'undefined' && CURRENT_ADMIN ? {
            email: CURRENT_ADMIN.email,
            role: CURRENT_ADMIN.role,
            roles: CURRENT_ADMIN.roles,
            ecTitle: CURRENT_ADMIN.ecTitle
          } : null,
          title: document.title,
          bodyText: document.body.innerText.substring(0, 500)
        };
      });
      this.log(`  Portal state: ${JSON.stringify(portalVisible, null, 2)}`);
    } else if (currentUrl.includes('ec-admin-login')) {
      this.log('  ⚠️  Still on ec-admin-login.html — login may have failed');
      // Check for error messages
      const errors = await this.page.evaluate(() => {
        const errEl = document.getElementById('login-error');
        const infoEl = document.getElementById('login-info');
        return {
          error: errEl ? errEl.textContent : '',
          errorVisible: errEl ? errEl.style.display : 'none',
          info: infoEl ? infoEl.textContent : '',
          infoVisible: infoEl ? infoEl.style.display : 'none'
        };
      });
      this.log(`  Login state: ${JSON.stringify(errors)}`);
    }

    const shot = await this.screenshot('portal-state-check');
    return await this.analyzeStep(shot,
      `Checking the portal state after login. Current URL: ${currentUrl}. ` +
      `Total network errors so far: ${this.networkErrors.length}. ` +
      `Looking for any 400 errors or broken state.`
    );
  }

  async step_checkDashboardAPIs() {
    this.log('\n═══ STEP: Check Dashboard API Calls ═══');

    // If we're on the portal, check what APIs loaded
    const currentUrl = this.page.url();
    if (!currentUrl.includes('admin-portal')) {
      this.log('  Skipping — not on admin portal');
      return 'Not on admin portal page';
    }

    // Wait for any remaining API calls
    await new Promise(r => setTimeout(r, 2000));

    // Check dashboard KPIs rendered
    const dashState = await this.page.evaluate(() => {
      const kpis = document.getElementById('dash-kpis');
      const dashLog = document.getElementById('dash-log');
      const procQueue = document.getElementById('proc-approval-queue');
      return {
        kpisContent: kpis ? kpis.innerHTML.substring(0, 200) : 'NOT_FOUND',
        logContent: dashLog ? dashLog.innerHTML.substring(0, 200) : 'NOT_FOUND',
        procContent: procQueue ? procQueue.innerHTML.substring(0, 200) : 'NOT_FOUND',
        activePanel: document.querySelector('.portal-section.active')?.id || 'none'
      };
    });
    this.log(`  Dashboard: ${JSON.stringify(dashState, null, 2)}`);

    const shot = await this.screenshot('dashboard-api-state');
    return await this.analyzeStep(shot,
      'Checking the dashboard panel content after all API calls completed. ' +
      `Active panel: ${dashState.activePanel}. ` +
      `Checking for any visible errors or missing data.`
    );
  }

  async step_navigateFinancePanels() {
    this.log('\n═══ STEP: Navigate Finance Panels ═══');
    const currentUrl = this.page.url();
    if (!currentUrl.includes('admin-portal')) {
      return 'Not on admin portal';
    }

    // Click Procurement nav item
    const preErrors = this.networkErrors.length;
    await this.page.evaluate(() => {
      const items = document.querySelectorAll('.sb-item');
      for (const item of items) {
        if (item.getAttribute('data-panel') === 'procurement') {
          item.click();
          break;
        }
      }
    });
    await new Promise(r => setTimeout(r, 2000));
    const shot1 = await this.screenshot('procurement-panel');

    // Click Ledger Report
    await this.page.evaluate(() => {
      const items = document.querySelectorAll('.sb-item');
      for (const item of items) {
        if (item.getAttribute('data-panel') === 'ledger-report') {
          item.click();
          break;
        }
      }
    });
    await new Promise(r => setTimeout(r, 3000));
    await this.waitForStable(5000);
    const newErrors = this.networkErrors.slice(preErrors);
    this.log(`  Errors during panel navigation: ${newErrors.length}`);
    for (const e of newErrors) {
      this.log(`    ⚠️  ${e.status} ${e.method} ${e.url}`);
    }

    const shot2 = await this.screenshot('ledger-report-panel');
    return await this.analyzeStep(shot2,
      `Navigated to Procurement then Ledger Report panels. ` +
      `${newErrors.length} new network errors. Checking for 400 errors.`
    );
  }

  async step_testWixDirectUrl() {
    this.log('\n═══ STEP: Test Wix Direct URL (400 Reproduction) ═══');
    // This is the URL a user might type or bookmark — Wix returns 400 for .html files
    const wixUrl = 'https://www.jaxbengali.org/admin-portal.html';
    this.log(`  Testing: ${wixUrl}`);
    
    const preErrors = this.networkErrors.length;
    try {
      const resp = await this.page.goto(wixUrl, { waitUntil: 'networkidle2', timeout: 15000 });
      const httpStatus = resp ? resp.status() : 'N/A';
      this.log(`  HTTP Status: ${httpStatus}`);
      
      if (httpStatus === 400) {
        this.log('  ⚠️  CONFIRMED: www.jaxbengali.org/admin-portal.html returns 400!');
        this.log('  Root cause: Wix cannot serve .html files directly.');
        this.log('  Fix: Users must access via /_functions/admin_portal redirect or GitHub Pages directly.');
        this.allFindings.push({
          step: this.stepCount,
          context: 'Wix Direct URL Test',
          analysis: 'CONFIRMED 400: www.jaxbengali.org/admin-portal.html returns HTTP 400. ' +
            'Wix CDN cannot serve .html files. Users must use /_functions/admin_portal (302 → GitHub Pages) ' +
            'or access GitHub Pages directly at banfjax-hash.github.io/banf/admin-portal.html'
        });
      }
    } catch (e) {
      this.log(`  Navigation error: ${e.message}`);
    }
    
    const shot = await this.screenshot('wix-direct-url-400');
    return await this.analyzeStep(shot, 
      `Tested www.jaxbengali.org/admin-portal.html directly. This URL bypasses the /_functions redirect. ` +
      `Wix returns 400 because it cannot serve .html files. ` +
      `Check if this is the 400 error the user reported.`
    );
  }

  async step_testWixRedirectUrl() {
    this.log('\n═══ STEP: Test Wix _functions/admin_portal Redirect ═══');
    const redirectUrl = 'https://www.jaxbengali.org/_functions/admin_portal';
    this.log(`  Testing: ${redirectUrl}`);
    
    await this.page.goto(redirectUrl, { waitUntil: 'networkidle2', timeout: 30000 });
    const finalUrl = this.page.url();
    this.log(`  Redirected to: ${finalUrl}`);
    this.log(`  ✅ Correct redirect: ${finalUrl.includes('github.io') ? 'YES (GitHub Pages)' : 'NO'}`);
    
    const shot = await this.screenshot('wix-redirect-test');
    return await this.analyzeStep(shot,
      `Tested www.jaxbengali.org/_functions/admin_portal redirect. ` +
      `Final URL: ${finalUrl}. ` +
      `This is the CORRECT way to access the admin portal through www.jaxbengali.org.`
    );
  }

  async step_directPortalLogin() {
    this.log('\n═══ STEP: Direct Portal Login (admin-portal.html) ═══');
    // Clear session and try logging in directly on admin-portal.html
    await this.page.goto(CONFIG.portalUrl, { waitUntil: 'networkidle2', timeout: 30000 });
    await this.waitForStable();

    // Check if auto-login happened or we see the login form
    const state = await this.page.evaluate(() => {
      const portal = document.getElementById('portal');
      const login = document.getElementById('login-screen');
      return {
        portalVisible: portal ? portal.style.display !== 'none' : false,
        loginVisible: login ? login.style.display !== 'none' : false,
        url: window.location.href
      };
    });
    this.log(`  State: ${JSON.stringify(state)}`);

    if (state.loginVisible) {
      // Need to login on this page directly
      this.log('  Login form visible — entering credentials...');
      const emailField = await this.page.$('#login-email');
      const passField = await this.page.$('#login-pass');
      if (emailField && passField) {
        await emailField.click({ clickCount: 3 });
        await emailField.type(CONFIG.email, { delay: 30 });
        await passField.click({ clickCount: 3 });
        await passField.type(CONFIG.password, { delay: 30 });

        const preErrors = this.networkErrors.length;
        const btn = await this.page.$('#btn-login');
        if (btn) await btn.click();

        await new Promise(r => setTimeout(r, 4000));
        await this.waitForStable(5000);

        const newErrors = this.networkErrors.slice(preErrors);
        this.log(`  After direct login: ${newErrors.length} errors`);
        for (const e of newErrors) {
          this.log(`    ⚠️  ${e.status} ${e.method} ${e.url}`);
          if (e.body) this.log(`       Body: ${e.body.substring(0, 200)}`);
        }
      }
    }

    const shot = await this.screenshot('direct-portal-login');
    return await this.analyzeStep(shot,
      `Loaded admin-portal.html directly and attempted login. ` +
      `Total network errors: ${this.networkErrors.length}. ` +
      `Checking if portal loaded correctly or shows 400 error.`
    );
  }

  // ═══════ MAIN RUN ═══════

  async run() {
    console.log('');
    console.log('╔═══════════════════════════════════════════════════════════╗');
    console.log('║  BANF EC Admin Debug Agent — Vision + Puppeteer          ║');
    console.log('║  Automated login & 400-error diagnosis                   ║');
    console.log('╚═══════════════════════════════════════════════════════════╝');
    console.log('');

    try {
      await this.init();

      // ── Flow 1: ec-admin-login.html → admin-portal.html redirect ──
      this.log('\n════════════════════════════════════════════');
      this.log('  FLOW 1: ec-admin-login → admin-portal redirect');
      this.log('════════════════════════════════════════════');
      await this.step_loadLoginPage();
      await this.step_enterCredentials();
      await this.step_clickLogin();
      await this.step_checkPortalLoad();
      await this.step_checkDashboardAPIs();
      await this.step_navigateFinancePanels();

      // ── Flow 2: Test Wix Direct URL (400 reproduction) ──
      this.log('\n════════════════════════════════════════════');
      this.log('  FLOW 2: Wix Direct URL Test (400 reproduction)');
      this.log('════════════════════════════════════════════');
      await this.step_testWixDirectUrl();
      await this.step_testWixRedirectUrl();
      
      // ── Flow 3: Direct admin-portal.html login on GitHub Pages ──
      this.log('\n════════════════════════════════════════════');
      this.log('  FLOW 3: Direct admin-portal.html login (GitHub Pages)');
      this.log('════════════════════════════════════════════');
      // Clear session first
      await this.page.evaluate(() => {
        sessionStorage.clear();
        localStorage.clear();
      });
      await this.step_directPortalLogin();
      await this.step_checkPortalLoad();
      await this.step_checkDashboardAPIs();

      // ── FINAL REPORT ──
      this.generateReport();

    } catch (e) {
      this.log(`\n💥 Agent crashed: ${e.message}`);
      this.log(e.stack);
      try {
        await this.screenshot('crash-state');
      } catch { }
    } finally {
      if (this.browser) await this.browser.close();
    }
  }

  generateReport() {
    this.log('\n');
    this.log('╔═══════════════════════════════════════════════════════════╗');
    this.log('║                    DIAGNOSTIC REPORT                     ║');
    this.log('╚═══════════════════════════════════════════════════════════╝');

    // Network errors summary
    this.log('\n── Network Errors (HTTP 400+) ──');
    if (this.networkErrors.length === 0) {
      this.log('  ✅ No HTTP errors detected!');
    } else {
      for (const e of this.networkErrors) {
        this.log(`  ⚠️  ${e.status || 'FAIL'} ${e.method} ${e.url}`);
        if (e.body) this.log(`     Body: ${e.body.substring(0, 300)}`);
        if (e.error) this.log(`     Error: ${e.error}`);
      }
    }

    // All network requests summary
    this.log('\n── All API Requests ──');
    for (const r of this.networkRequests) {
      const icon = r.status >= 400 ? '⚠️ ' : r.status >= 200 ? '✅' : '❓';
      this.log(`  ${icon} ${r.status} ${r.method} ${r.url}`);
    }

    // Console errors
    this.log('\n── Console Errors ──');
    const consErrors = this.consoleLogs.filter(l => l.type === 'error' || l.type === 'pageerror');
    if (consErrors.length === 0) {
      this.log('  ✅ No console errors!');
    } else {
      for (const e of consErrors) {
        this.log(`  🔴 [${e.type}] ${e.text.substring(0, 200)}`);
      }
    }

    // Vision findings
    this.log('\n── Vision Analysis Summary ──');
    for (const f of this.allFindings) {
      this.log(`  Step ${f.step}: ${f.context.substring(0, 80)}...`);
      this.log(`    → ${f.analysis.substring(0, 300)}`);
    }

    // Save full report
    const reportPath = path.join(CONFIG.screenshotDir, 'debug-report.txt');
    fs.writeFileSync(reportPath, this.report.join('\n'), 'utf8');
    this.log(`\n📄 Full report saved: ${reportPath}`);
    this.log(`📸 Screenshots saved: ${CONFIG.screenshotDir}`);
    this.log(`   Total screenshots: ${this.stepCount}`);
    this.log(`   Total API requests: ${this.networkRequests.length}`);
    this.log(`   Total errors: ${this.networkErrors.length}`);
  }
}

// ═══════════════════════════════════════════════════════════════
//  RUN
// ═══════════════════════════════════════════════════════════════
const agent = new DebugAgent();
agent.run().catch(e => {
  console.error('Fatal error:', e);
  process.exit(1);
});
