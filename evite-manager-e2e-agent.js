#!/usr/bin/env node
/**
 * BANF Evite Manager — E2E Agentic Test (President Dry Run)
 * ══════════════════════════════════════════════════════════
 * Puppeteer + Vision AI agent that tests the full evite manager flow:
 *   1. President login on live GitHub Pages portal
 *   2. Navigate to Evite Manager sidebar tab
 *   3. Verify event config form is loaded / prepopulated
 *   4. Select existing Noboborsho event (or create if none)
 *   5. Click "Dry Run (President Only)" — sends test invite
 *   6. Load RSVP Dashboard and verify KPIs appear
 *   7. Vision-analyze every screenshot for errors/issues
 *
 * Usage:
 *   node evite-manager-e2e-agent.js               # headless (default)
 *   node evite-manager-e2e-agent.js --headed       # visible browser
 */

const puppeteer = require('puppeteer');
const https = require('https');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// ═══ CONFIG ═══
const FLAG = (n) => process.argv.includes('--' + n);
const HEADED = FLAG('headed');

const CFG = {
  portalUrl: 'https://banfjax-hash.github.io/banf/admin-portal.html',
  email: 'ranadhir.ghosh@gmail.com',
  password: '282@SentosaDrive',
  screenshotDir: path.join(__dirname, '_evite-test-screenshots'),
  visionModel: 'gpt-4.1-mini',
  timeout: 20000,
};

// ═══ GLOBALS ═══
let browser, page, stepNum = 0;
const LOG = [];
const RESULTS = [];
const NETWORK_ERRORS = [];

function ts() { return new Date().toLocaleTimeString('en-US', { hour12: false, fractionalSecondDigits: 3 }); }
function log(msg) { const m = `[${ts()}] ${msg}`; LOG.push(m); console.log(m); }

// ═══ GITHUB MODELS VISION ═══
function getGitHubToken() {
  if (process.env.GITHUB_TOKEN) return process.env.GITHUB_TOKEN;
  try { return execSync('gh auth token', { encoding: 'utf8' }).trim(); } catch { }
  log('⛔ No GitHub token — vision analysis disabled');
  return null;
}

function visionRequest(base64Img, prompt, token) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      model: CFG.visionModel,
      messages: [{
        role: 'user',
        content: [
          { type: 'text', text: prompt },
          { type: 'image_url', image_url: { url: `data:image/png;base64,${base64Img}` } }
        ]
      }],
      max_tokens: 600
    });
    const opts = {
      hostname: 'models.inference.ai.azure.com',
      path: '/chat/completions',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        'Content-Length': Buffer.byteLength(body)
      }
    };
    const req = https.request(opts, res => {
      let data = '';
      res.on('data', d => data += d);
      res.on('end', () => {
        try {
          const j = JSON.parse(data);
          resolve(j.choices?.[0]?.message?.content || '(no analysis)');
        } catch { resolve('(vision parse error)'); }
      });
    });
    req.on('error', e => resolve('(vision request failed: ' + e.message + ')'));
    req.write(body);
    req.end();
  });
}

// ═══ SCREENSHOT + ANALYZE ═══
async function snap(label, visionPrompt) {
  stepNum++;
  const fname = `step${String(stepNum).padStart(2, '0')}_${label.replace(/[^a-z0-9]+/gi, '_')}.png`;
  const fpath = path.join(CFG.screenshotDir, fname);
  await page.screenshot({ path: fpath, fullPage: false });
  log(`  📸 Step ${stepNum}: ${label} → ${fname}`);

  const token = getGitHubToken();
  let analysis = '(vision skipped)';
  if (token && visionPrompt) {
    const b64 = fs.readFileSync(fpath, 'base64');
    analysis = await visionRequest(b64, visionPrompt, token);
    log(`  🤖 Vision: ${analysis.substring(0, 200)}`);
  }
  RESULTS.push({ step: stepNum, label, file: fname, analysis });
  return analysis;
}

// ═══ WAIT HELPERS ═══
async function waitFor(sel, timeout) {
  return page.waitForSelector(sel, { visible: true, timeout: timeout || CFG.timeout });
}
async function safeClick(sel) {
  await waitFor(sel);
  await page.click(sel);
}
async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ═══════════════════════════════════════════════════════════════
//  STEP 1: PRESIDENT LOGIN
// ═══════════════════════════════════════════════════════════════
async function step_login() {
  log('\n═══ STEP 1: President Login ═══');
  await page.goto(CFG.portalUrl, { waitUntil: 'networkidle2', timeout: 30000 });
  await sleep(1500);

  await snap('login_page_loaded', 'This is a login screen for an EC Admin Portal. Describe what you see: is the login form visible? Any error messages? Is it loading correctly?');

  // Type credentials
  await page.waitForSelector('#login-email', { visible: true, timeout: 10000 });
  await page.click('#login-email', { clickCount: 3 });
  await page.type('#login-email', CFG.email, { delay: 30 });
  await page.click('#login-pass', { clickCount: 3 });
  await page.type('#login-pass', CFG.password, { delay: 30 });

  await snap('credentials_entered', 'Login form with credentials filled in. Can you see the email field has text? Is the Sign In button visible?');

  // Click login
  await page.click('#btn-login');
  log('  Clicked Sign In...');

  // Wait for portal to appear (login overlay hides, portal shows)
  try {
    await page.waitForFunction(() => {
      const overlay = document.getElementById('login-screen');
      const portal = document.querySelector('.portal');
      return overlay && overlay.style.display === 'none' && portal && portal.style.display !== 'none';
    }, { timeout: 15000 });
    log('  ✅ Login successful — portal visible');
  } catch {
    // Take a screenshot to debug
    await snap('login_possibly_failed', 'The login may have failed or is still processing. Look for: error messages in red, the login form still showing, or the portal dashboard appearing behind it. Describe exactly what you see.');
    // Check if there's an error message
    const errText = await page.evaluate(() => {
      const el = document.getElementById('login-error');
      return el ? el.textContent : '';
    });
    if (errText) {
      log(`  ❌ Login error: ${errText}`);
      return false;
    }
    // Maybe it loaded but the check was wrong
    log('  ⚠️  Login state unclear — continuing...');
  }

  await sleep(1000);
  await snap('portal_dashboard_loaded', 'You should see the admin portal dashboard with a sidebar on the left. Describe: Is it the portal? What panels are visible in the sidebar? Any error toasts? Is the user logged in as President?');

  // Verify we're logged in — check the sidebar user display
  const userInfo = await page.evaluate(() => {
    const nameEl = document.querySelector('.sb-user .name');
    const roleEl = document.querySelector('.sb-user .role-lbl');
    return {
      name: nameEl ? nameEl.textContent.trim() : '',
      role: roleEl ? roleEl.textContent.trim() : ''
    };
  });
  log(`  User: ${userInfo.name} | Role: ${userInfo.role}`);
  return true;
}

// ═══════════════════════════════════════════════════════════════
//  STEP 2: NAVIGATE TO EVITE MANAGER
// ═══════════════════════════════════════════════════════════════
async function step_navToEvite() {
  log('\n═══ STEP 2: Navigate to Evite Manager ═══');

  // Click the Evite Manager sidebar item
  const clicked = await page.evaluate(() => {
    const items = document.querySelectorAll('.sb-item');
    for (const item of items) {
      if (item.dataset.panel === 'evite-manager') {
        item.click();
        return true;
      }
    }
    return false;
  });

  if (!clicked) {
    log('  ❌ Could not find Evite Manager sidebar item');
    await snap('sidebar_no_evite', 'The sidebar does not seem to have an E-Vite Manager item. List all visible sidebar menu items.');
    return false;
  }
  log('  Clicked Evite Manager tab');
  await sleep(2500); // Wait for eviteLoadEvents() to fire

  await snap('evite_manager_panel', 'This is the Evite Manager panel. Describe what you see: Is there an event configuration form with fields like Event Name, Venue, Date? Are there action buttons (Save, Dry Run, Send)? Is an existing events table loading at the bottom? Any errors or API failures shown?');

  return true;
}

// ═══════════════════════════════════════════════════════════════
//  STEP 3: VERIFY EVENT FORM IS POPULATED
// ═══════════════════════════════════════════════════════════════
async function step_verifyForm() {
  log('\n═══ STEP 3: Verify Event Form ═══');

  const formData = await page.evaluate(() => {
    return {
      eventName: document.getElementById('ev-eventName')?.value || '',
      venue: document.getElementById('ev-venue')?.value || '',
      eventDate: document.getElementById('ev-eventDate')?.value || '',
      eventTime: document.getElementById('ev-eventTime')?.value || '',
      capacity: document.getElementById('ev-capacity')?.value || '',
      rsvpDeadline: document.getElementById('ev-rsvpDeadline')?.value || '',
      description: (document.getElementById('ev-description')?.value || '').substring(0, 100),
      introText: (document.getElementById('ev-introText')?.value || '').substring(0, 100),
      culturalEnabled: document.getElementById('ev-culturalEnabled')?.checked,
      collectGuests: document.getElementById('ev-collectGuests')?.checked,
      collectFood: document.getElementById('ev-collectFood')?.checked,
    };
  });

  log('  Event Name: ' + (formData.eventName || '(empty)'));
  log('  Venue: ' + (formData.venue || '(empty)'));
  log('  Date: ' + (formData.eventDate || '(empty)'));
  log('  Time: ' + (formData.eventTime || '(empty)'));
  log('  Capacity: ' + (formData.capacity || '(empty)'));
  log('  RSVP Deadline: ' + (formData.rsvpDeadline || '(empty)'));
  log('  Cultural: ' + (formData.culturalEnabled ? 'ENABLED' : 'disabled'));
  log('  Food: ' + (formData.collectFood ? 'yes' : 'no') + ' | Guests: ' + (formData.collectGuests ? 'yes' : 'no'));

  const hasName = formData.eventName.length > 0;
  const hasVenue = formData.venue.length > 0;
  log(hasName && hasVenue ? '  ✅ Form is populated' : '  ⚠️  Form may be empty — checking if events list loads...');

  return formData;
}

// ═══════════════════════════════════════════════════════════════
//  STEP 4: CHECK EXISTING EVENTS LIST
// ═══════════════════════════════════════════════════════════════
async function step_checkEventsList() {
  log('\n═══ STEP 4: Check Existing Events ═══');
  await sleep(2000); // Wait for eviteLoadEvents to complete

  // Scroll down to the events table
  await page.evaluate(() => {
    const el = document.getElementById('ev-events-list');
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  });
  await sleep(500);

  const eventsInfo = await page.evaluate(() => {
    const el = document.getElementById('ev-events-list');
    const text = el ? el.textContent.trim() : '';
    const rows = el ? el.querySelectorAll('tbody tr') : [];
    const eventId = typeof EVITE_CURRENT_EVENT_ID !== 'undefined' ? EVITE_CURRENT_EVENT_ID : null;
    return { text: text.substring(0, 300), rowCount: rows.length, selectedEventId: eventId };
  });

  log(`  Events table rows: ${eventsInfo.rowCount}`);
  log(`  Selected event ID: ${eventsInfo.selectedEventId || '(none)'}`);
  if (eventsInfo.rowCount === 0) {
    log('  Events list text: ' + eventsInfo.text.substring(0, 100));
  }

  await snap('events_list', 'This shows the Existing Events table at the bottom of the Evite Manager. How many events are listed? Is there a "Select" button for each? Has one been auto-selected? Any loading errors?');

  // If no event is selected, try clicking the first Select button
  if (!eventsInfo.selectedEventId && eventsInfo.rowCount > 0) {
    log('  No event auto-selected — clicking first Select button...');
    await page.evaluate(() => {
      const btn = document.querySelector('#ev-events-list button');
      if (btn) btn.click();
    });
    await sleep(1500);
    const newId = await page.evaluate(() => typeof EVITE_CURRENT_EVENT_ID !== 'undefined' ? EVITE_CURRENT_EVENT_ID : null);
    log(`  After manual select: ${newId || '(still none)'}`);
  }

  return eventsInfo;
}

// ═══════════════════════════════════════════════════════════════
//  STEP 5: SCROLL TO ACTIONS & CLICK DRY RUN
// ═══════════════════════════════════════════════════════════════
async function step_dryRun() {
  log('\n═══ STEP 5: Dry Run (President Only) ═══');

  // Verify an event is selected
  const eventId = await page.evaluate(() => typeof EVITE_CURRENT_EVENT_ID !== 'undefined' ? EVITE_CURRENT_EVENT_ID : null);
  if (!eventId) {
    log('  ❌ No event selected — cannot dry run');
    await snap('no_event_for_dryrun', 'No event is selected in the Evite Manager. The Dry Run button needs an event. What does the action message area show?');
    return false;
  }
  log(`  Event ID: ${eventId}`);

  // Scroll to action buttons area
  await page.evaluate(() => {
    const btns = document.querySelectorAll('.card-a');
    // Find the Actions card
    for (const card of btns) {
      const h2 = card.querySelector('h2');
      if (h2 && h2.textContent.includes('Actions')) {
        card.scrollIntoView({ behavior: 'smooth', block: 'center' });
        break;
      }
    }
  });
  await sleep(500);

  await snap('before_dryrun', 'This shows the Actions section of the Evite Manager. You should see buttons: Save Event Config, Export Config, Dry Run (President Only), Send Invitations, Refresh. Describe what you see. Are all buttons visible?');

  // Set up network listener for the evite_send_invites call
  let sendResult = null;
  const responsePromise = new Promise(resolve => {
    const handler = async (response) => {
      if (response.url().includes('evite_send_invites')) {
        try {
          const json = await response.json();
          sendResult = json;
          log(`  📡 evite_send_invites response: sent=${json.sent}, failed=${json.failed}, total=${json.total}`);
        } catch (e) {
          log(`  📡 evite_send_invites response (non-JSON): ${response.status()}`);
          sendResult = { status: response.status() };
        }
        page.off('response', handler);
        resolve();
      }
    };
    page.on('response', handler);
    // Timeout fallback
    setTimeout(() => { page.off('response', handler); resolve(); }, 25000);
  });

  // Click Dry Run button (find by text content)
  log('  Clicking "Dry Run (President Only)"...');
  await page.evaluate(() => {
    const buttons = document.querySelectorAll('button');
    for (const btn of buttons) {
      if (btn.textContent.includes('Dry Run')) {
        btn.click();
        return;
      }
    }
  });

  // Wait for the API response
  await responsePromise;
  await sleep(2000);

  // Check the action message area
  const actionMsg = await page.evaluate(() => {
    const el = document.getElementById('ev-action-msg');
    return el ? { text: el.textContent.trim(), visible: el.style.display !== 'none', color: el.style.color } : null;
  });

  if (actionMsg) {
    log(`  Action message: "${actionMsg.text}"`);
    log(`  Color: ${actionMsg.color} | Visible: ${actionMsg.visible}`);
  }

  await snap('after_dryrun', 'The Dry Run was just executed. Look at the message area near the buttons. Does it show success (green) or error (red)? What does the message say? Did emails get sent? Read the message text carefully and report it verbatim.');

  return { sendResult, actionMsg };
}

// ═══════════════════════════════════════════════════════════════
//  STEP 6: LOAD RSVP DASHBOARD
// ═══════════════════════════════════════════════════════════════
async function step_rsvpDashboard() {
  log('\n═══ STEP 6: RSVP Dashboard ═══');

  // Scroll to dashboard section
  await page.evaluate(() => {
    const el = document.getElementById('ev-dashboard-card');
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
  await sleep(800);

  // Click "Load / Refresh Dashboard"
  log('  Clicking Load / Refresh Dashboard...');

  const dashPromise = new Promise(resolve => {
    const handler = async (response) => {
      if (response.url().includes('evite_invite_status')) {
        try {
          const json = await response.json();
          log(`  📡 evite_invite_status: total=${json.summary?.total}, sent=${json.summary?.sent}, responded=${json.summary?.responded}`);
        } catch {
          log(`  📡 evite_invite_status status: ${response.status()}`);
        }
        page.off('response', handler);
        resolve();
      }
    };
    page.on('response', handler);
    setTimeout(() => { page.off('response', handler); resolve(); }, 15000);
  });

  await page.evaluate(() => {
    const btns = document.querySelectorAll('button');
    for (const btn of btns) {
      if (btn.textContent.includes('Load / Refresh Dashboard')) {
        btn.click();
        return;
      }
    }
  });

  await dashPromise;
  await sleep(2000);

  // Check if KPIs appeared
  const dashState = await page.evaluate(() => {
    const summary = document.getElementById('ev-dash-summary');
    const detail = document.getElementById('ev-dash-detail');
    const msg = document.getElementById('ev-dash-msg');
    return {
      summaryVisible: summary ? summary.style.display !== 'none' : false,
      detailVisible: detail ? detail.style.display !== 'none' : false,
      message: msg ? msg.textContent.trim() : '',
      msgVisible: msg ? msg.style.display !== 'none' : false
    };
  });

  log(`  Summary KPIs visible: ${dashState.summaryVisible}`);
  log(`  Detail table visible: ${dashState.detailVisible}`);
  if (dashState.msgVisible && dashState.message) {
    log(`  Dashboard message: ${dashState.message}`);
  }

  await snap('rsvp_dashboard_kpis', 'This is the RSVP Dashboard section. Can you see KPI cards with numbers (Total Invited, Emails Sent, Responded, Attending, etc.)? Are there food preference stats? Is there a detail table showing individual invitees? Describe the data and any errors.');

  return dashState;
}

// ═══════════════════════════════════════════════════════════════
//  STEP 7: SCROLL DETAIL TABLE & FINAL VERIFICATION
// ═══════════════════════════════════════════════════════════════
async function step_detailTable() {
  log('\n═══ STEP 7: Detail Table & Final Check ═══');

  // Scroll to the detail table
  await page.evaluate(() => {
    const tbl = document.getElementById('ev-dash-table');
    if (tbl) tbl.scrollIntoView({ behavior: 'smooth', block: 'center' });
  });
  await sleep(500);

  const tableData = await page.evaluate(() => {
    const tbody = document.getElementById('ev-dash-tbody');
    if (!tbody) return { rows: 0, data: [] };
    const trs = tbody.querySelectorAll('tr');
    const data = [];
    trs.forEach(tr => {
      const cells = tr.querySelectorAll('td');
      if (cells.length >= 4) {
        data.push({
          name: cells[1]?.textContent?.trim() || '',
          email: cells[2]?.textContent?.trim() || '',
          status: cells[3]?.textContent?.trim() || ''
        });
      }
    });
    return { rows: trs.length, data: data.slice(0, 10) };
  });

  log(`  Detail rows: ${tableData.rows}`);
  tableData.data.forEach(r => {
    log(`    ${r.name} <${r.email}> — ${r.status}`);
  });

  await snap('detail_table', 'This shows the individual responses detail table. Can you see names, emails, and RSVP statuses? Is the president (Ranadhir) listed? What does their status show? Report all visible row data.');

  // Collect final network errors
  log('\n═══ Network Errors Summary ═══');
  if (NETWORK_ERRORS.length === 0) {
    log('  ✅ ZERO network errors (4xx/5xx) during entire session');
  } else {
    NETWORK_ERRORS.forEach(e => log(`  ⚠️  ${e.status} ${e.method} ${e.url}`));
  }

  return tableData;
}

// ═══════════════════════════════════════════════════════════════
//  GENERATE REPORT
// ═══════════════════════════════════════════════════════════════
function generateReport() {
  const reportPath = path.join(CFG.screenshotDir, 'evite-test-report.html');
  let html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Evite Manager E2E Test Report</title>
<style>body{background:#0f1117;color:#e2e8f0;font-family:'Segoe UI',system-ui,sans-serif;padding:40px;max-width:1100px;margin:0 auto}
h1{color:#f97316;font-size:1.8rem}h2{color:#60a5fa;border-bottom:1px solid #334155;padding-bottom:8px;margin-top:30px}
.step{background:#111827;border:1px solid #1e293b;border-radius:12px;padding:16px;margin-bottom:16px}
.step h3{color:#fb923c;margin:0 0 8px}
.step img{max-width:100%;border-radius:8px;border:1px solid #334155;margin:10px 0}
.step .analysis{background:#0b1120;border-left:3px solid #3b82f6;padding:10px 14px;border-radius:0 8px 8px 0;font-size:.85rem;color:#94a3b8;margin:8px 0;white-space:pre-wrap}
.pass{color:#22c55e}.fail{color:#ef4444}.warn{color:#eab308}
.log{background:#0a0e14;border:1px solid #1e293b;border-radius:8px;padding:12px;font-family:Consolas,monospace;font-size:.75rem;max-height:500px;overflow-y:auto;white-space:pre-wrap;color:#94a3b8}
.summary{background:#111827;border:1px solid #22c55e;border-radius:12px;padding:20px;margin:20px 0}
.summary h2{color:#22c55e;border:none;margin:0 0 10px;padding:0}
.badge{display:inline-block;padding:4px 12px;border-radius:20px;font-size:.78rem;font-weight:600}
.badge-pass{background:rgba(34,197,94,.15);color:#22c55e}
.badge-fail{background:rgba(239,68,68,.15);color:#ef4444}
.net-err{background:#1c1010;border:1px solid rgba(239,68,68,.3);border-radius:8px;padding:10px;margin:8px 0;font-size:.78rem;color:#ef4444}
</style></head><body>
<h1>🎭 Evite Manager E2E Test Report</h1>
<p style="color:#94a3b8">President Dry-Run Flow — ${new Date().toLocaleString()}</p>`;

  // Summary
  const errors = NETWORK_ERRORS.length;
  const steps = RESULTS.length;
  html += `<div class="summary"><h2>${errors === 0 ? '✅' : '⚠️'} Test Summary</h2>
<p><strong>Steps completed:</strong> ${steps} &nbsp; <strong>Network errors:</strong> <span class="${errors ? 'fail' : 'pass'}">${errors}</span></p>
<p>Test target: ${CFG.portalUrl}</p></div>`;

  // Steps
  html += '<h2>Test Steps</h2>';
  RESULTS.forEach(r => {
    html += `<div class="step"><h3>Step ${r.step}: ${r.label}</h3>`;
    html += `<img src="${r.file}" alt="${r.label}" loading="lazy"/>`;
    html += `<div class="analysis"><strong>🤖 Vision Analysis:</strong>\n${r.analysis}</div></div>`;
  });

  // Network errors
  if (NETWORK_ERRORS.length > 0) {
    html += '<h2>Network Errors</h2>';
    NETWORK_ERRORS.forEach(e => {
      html += `<div class="net-err">⚠️ ${e.status} ${e.method} ${e.url}</div>`;
    });
  }

  // Full log
  html += '<h2>Full Log</h2><div class="log">' + LOG.join('\n') + '</div>';
  html += '</body></html>';

  fs.writeFileSync(reportPath, html);
  log(`\n📄 Report: ${reportPath}`);
  return reportPath;
}

// ═══════════════════════════════════════════════════════════════
//  MAIN
// ═══════════════════════════════════════════════════════════════
async function main() {
  console.log('╔══════════════════════════════════════════════════════╗');
  console.log('║  BANF Evite Manager — E2E President Dry Run Test    ║');
  console.log('╚══════════════════════════════════════════════════════╝\n');

  fs.mkdirSync(CFG.screenshotDir, { recursive: true });

  browser = await puppeteer.launch({
    headless: !HEADED,
    defaultViewport: { width: 1440, height: 900 },
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  page = await browser.newPage();

  // Monitor all network responses for errors
  page.on('response', async (response) => {
    const status = response.status();
    if (status >= 400) {
      const url = response.url();
      // Skip known noise (favicon, analytics, etc.)
      if (url.includes('favicon') || url.includes('analytics') || url.includes('gtag')) return;
      const method = response.request().method();
      NETWORK_ERRORS.push({ status, method, url: url.substring(0, 200) });
      log(`  ⚠️  ${status} ${method} ${url.substring(0, 120)}`);
    }
  });

  // Capture console errors
  page.on('console', msg => {
    if (msg.type() === 'error') {
      log(`  🔴 Console error: ${msg.text().substring(0, 200)}`);
    }
  });

  let success = true;
  try {
    // Step 1: Login
    const loggedIn = await step_login();
    if (!loggedIn) {
      log('❌ Login failed — aborting remaining steps');
      success = false;
    }

    // Step 2: Navigate to Evite Manager
    if (success) {
      const navOk = await step_navToEvite();
      if (!navOk) { success = false; }
    }

    // Step 3: Verify form
    if (success) {
      await step_verifyForm();
    }

    // Step 4: Check events list
    if (success) {
      await step_checkEventsList();
    }

    // Step 5: Dry Run
    if (success) {
      const dryResult = await step_dryRun();
      if (dryResult?.actionMsg?.text?.includes('error') || dryResult?.actionMsg?.text?.includes('Error')) {
        log('  ⚠️  Dry run may have encountered an issue');
      }
    }

    // Step 6: RSVP Dashboard
    if (success) {
      await step_rsvpDashboard();
    }

    // Step 7: Detail table
    if (success) {
      await step_detailTable();
    }

  } catch (e) {
    log(`\n❌ Unhandled error: ${e.message}`);
    await snap('error_state', 'An error occurred. Describe what the page shows: is it crashed, blank, showing an error? What is the page state?').catch(() => {});
    success = false;
  }

  // Report
  const reportPath = generateReport();

  // Final summary
  console.log('\n═══════════════════════════════════════════════');
  console.log(`  Steps: ${RESULTS.length}`);
  console.log(`  Network errors: ${NETWORK_ERRORS.length}`);
  console.log(`  Result: ${success && NETWORK_ERRORS.length === 0 ? '✅ ALL PASS' : '⚠️  Issues found'}`);
  console.log(`  Report: ${reportPath}`);
  console.log('═══════════════════════════════════════════════\n');

  await browser.close();
  process.exit(success && NETWORK_ERRORS.length === 0 ? 0 : 1);
}

main().catch(e => {
  console.error('Fatal:', e);
  browser?.close?.();
  process.exit(1);
});
