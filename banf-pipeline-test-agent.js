#!/usr/bin/env node
/**
 * ═══════════════════════════════════════════════════════════════
 *  BANF PIPELINE TEST AGENT — Full E2E Validation
 *  Tests both EC Member and Stakeholder Admin onboarding flows
 *  Validates input/output at every step, reports pass/fail
 * ═══════════════════════════════════════════════════════════════
 *
 *  Usage:
 *    node banf-pipeline-test-agent.js                 # Run all tests
 *    node banf-pipeline-test-agent.js --ec-only       # EC pipeline only
 *    node banf-pipeline-test-agent.js --admin-only    # Stakeholder admin only
 *    node banf-pipeline-test-agent.js --fix           # Auto-fix mode (iterative)
 */

const https = require('https');
const { execSync } = require('child_process');

// ─── Configuration ────────────────────────────────────────────
const BASE_HOST = 'www.jaxbengali.org';
const BASE_PATH = '/_functions';
const SUPER_ADMIN_EMAIL = 'banfjax@gmail.com';
const GITHUB_REPO = 'banfjax-hash/banf';   // owner/repo for Actions API

// Test accounts (real EC members)
const EC_TEST = {
    email: 'ranadhir.ghosh@gmail.com',
    role: 'ec_member',
    ecTitle: 'President',
    firstName: 'Ranadhir',
    lastName: 'Ghosh',
    password: 'TestPass#2026!',
    phone: '555-0001',
};

const STAKEHOLDER_TEST = {
    email: 'banfjax@gmail.com',  // super_admin already exists
    role: 'super_admin',
    firstName: 'Moumita',
    lastName: 'Ghosh',
};

// ─── HTTP Helpers ─────────────────────────────────────────────
function request(method, path, body = null, headers = {}) {
    return new Promise((resolve, reject) => {
        const data = body ? JSON.stringify(body) : '';
        const opts = {
            hostname: BASE_HOST,
            path: `${BASE_PATH}/${path}`,
            method,
            headers: {
                'Content-Type': 'application/json',
                'x-user-email': SUPER_ADMIN_EMAIL,
                ...(body ? { 'Content-Length': Buffer.byteLength(data) } : {}),
                ...headers,
            },
        };
        const req = https.request(opts, (res) => {
            let buf = '';
            res.on('data', (c) => (buf += c));
            res.on('end', () => {
                let parsed = null;
                try { parsed = JSON.parse(buf); } catch (_) {}
                resolve({
                    status: res.statusCode,
                    raw: buf,
                    json: parsed,
                    headers: res.headers,
                });
            });
        });
        req.on('error', reject);
        if (data) req.write(data);
        req.end();
    });
}

const POST = (path, body, hdrs) => request('POST', path, body, hdrs);
const GET = (path, hdrs) => request('GET', path, null, hdrs);

// ─── Test Framework ───────────────────────────────────────────
const results = [];
let currentSuite = '';

function suite(name) {
    currentSuite = name;
    log(`\n${'═'.repeat(60)}`);
    log(`  SUITE: ${name}`);
    log(`${'═'.repeat(60)}`);
}

function log(msg) {
    const ts = new Date().toISOString().substr(11, 12);
    console.log(`[${ts}] ${msg}`);
}

function assert(testName, condition, actual, expected, details = '') {
    const status = condition ? 'PASS' : 'FAIL';
    const icon = condition ? '✅' : '❌';
    const entry = {
        suite: currentSuite,
        test: testName,
        status,
        actual: typeof actual === 'object' ? JSON.stringify(actual) : String(actual),
        expected: typeof expected === 'object' ? JSON.stringify(expected) : String(expected),
        details,
    };
    results.push(entry);
    log(`  ${icon} ${testName}`);
    if (!condition) {
        log(`     Expected: ${entry.expected}`);
        log(`     Actual:   ${entry.actual}`);
        if (details) log(`     Details:  ${details}`);
    }
    return condition;
}

function assertStatus(testName, res, expectedStatus) {
    return assert(
        `${testName} → HTTP ${expectedStatus}`,
        res.status === expectedStatus,
        res.status,
        expectedStatus,
        res.json?.error || ''
    );
}

function assertField(testName, obj, field, expected) {
    const val = obj?.[field];
    if (expected === undefined) {
        return assert(`${testName} → has '${field}'`, val !== undefined && val !== null, val, 'defined');
    }
    return assert(`${testName} → ${field} = ${expected}`, val === expected, val, expected);
}

function assertFieldContains(testName, obj, field, substring) {
    const val = String(obj?.[field] || '');
    return assert(
        `${testName} → ${field} contains '${substring}'`,
        val.includes(substring),
        val.substring(0, 120),
        `contains '${substring}'`
    );
}

/**
 * Validates that an email subject returned by the API is:
 * 1. Present and non-empty
 * 2. Free of raw non-ASCII bytes (≥ 0x80) — i.e. properly ASCII-safe
 * WHY THIS MATTERS: em-dashes (—), emojis (🎉) in email Subject: headers
 * MUST be RFC 2047 encoded (=?UTF-8?B?...?=) otherwise mail clients render
 * them as junk characters. This assertion catches the gap at the API level.
 * LIMITATION: cannot read actual delivered email — only validates the subject
 * string the API reports it intended to send.
 */
function assertCleanSubject(testPrefix, emailSubject) {
    assert(
        `${testPrefix} → emailSubject present`,
        emailSubject !== undefined && emailSubject !== null && emailSubject !== '',
        emailSubject ?? '(missing)',
        'non-empty string'
    );
    if (emailSubject) {
        const hasRawNonAscii = /[\x80-\xFF]/.test(emailSubject);
        assert(
            `${testPrefix} → emailSubject RFC 2047 clean (no raw non-ASCII)`,
            !hasRawNonAscii,
            hasRawNonAscii ? 'contains raw non-ASCII bytes' : 'clean',
            'clean',
            hasRawNonAscii
                ? 'Subject has unencoded Unicode (em-dash/emoji) — use mimeEncodeHeader() before setting Subject: header'
                : ''
        );
    }
}

// ─── Pipeline Step Definitions ────────────────────────────────

/**
 * Step 0: Cleanup — revoke test user's role to start fresh
 */
async function step0_cleanup(account) {
    log(`\n── Step 0: Cleanup ${account.email} ──`);
    const res = await POST('admin_role_revoke', {
        email: account.email,
        role: account.role,
    });
    // Either 200 (revoked) or error (doesn't exist) — both fine for cleanup
    log(`  Cleanup: ${res.status} — ${res.json?.message || res.json?.error || 'ok'}`);
    return { success: true, res };
}

/**
 * Step 1: admin_role_add — Assign role to user
 * EC members: expect emailSent=false, emailSkipped present
 * Stakeholder: expect emailSent=true
 */
async function step1_addRole(account) {
    log(`\n── Step 1: admin_role_add (${account.role}) ──`);
    const body = {
        email: account.email,
        role: account.role,
        firstName: account.firstName,
        lastName: account.lastName,
    };
    if (account.ecTitle) body.ecTitle = account.ecTitle;

    const res = await POST('admin_role_add', body);
    const j = res.json;

    assertStatus('admin_role_add', res, 200);
    assertField('admin_role_add', j, 'success', true);
    assertField('admin_role_add', j, 'setupToken');
    assertField('admin_role_add', j, 'onboardUrl');

    if (account.role === 'ec_member') {
        // EC: must NOT send generic email
        assertField('admin_role_add[EC]', j, 'emailSent', false);
        assertField('admin_role_add[EC]', j, 'emailSkipped');
        assertFieldContains('admin_role_add[EC]', j, 'emailSkipped', 'ec_send_all_invitations');
        assertFieldContains('admin_role_add[EC]', j, 'message', 'ec_send_all_invitations');
    } else {
        // Non-EC: should send generic welcome email
        assertField('admin_role_add[Admin]', j, 'emailSent', true);
    }

    // URL must point to GitHub Pages
    assertFieldContains('admin_role_add', j, 'onboardUrl', 'banfjax-hash.github.io/banf/');

    return { success: j?.success, setupToken: j?.setupToken, onboardUrl: j?.onboardUrl, res };
}

/**
 * Step 2 (EC only): ec_send_all_invitations — Send EC invitation emails
 */
async function step2_ecInvitations() {
    log(`\n── Step 2: ec_send_all_invitations ──`);
    const res = await POST('ec_send_all_invitations', {});

    assertStatus('ec_send_all_invitations', res, 200);
    assertField('ec_send_all_invitations', res.json, 'success', true);

    const sent = res.json?.sent || 0;
    const failed = res.json?.failed || 0;
    log(`  Sent: ${sent}, Failed: ${failed}`);

    if (res.json?.results) {
        for (const r of res.json.results) {
            assert(
                `ec_invite → ${r.email}`,
                r.status === 'sent',
                r.status,
                'sent',
                r.error || ''
            );
            // Validate email subject is RFC 2047 clean (no raw non-ASCII)
            if (r.status === 'sent') {
                assertCleanSubject(`ec_invite[${r.email}]`, r.emailSubject);
            }
        }
    }
    return { success: res.json?.success, sent, failed, res };
}

/**
 * Step 3: admin_signup_direct — Validate email & get setupToken
 */
async function step3_signupDirect(account) {
    log(`\n── Step 3: admin_signup_direct ──`);
    const res = await POST('admin_signup_direct', { email: account.email }, { 'x-user-email': '' });
    const j = res.json;

    assertStatus('admin_signup_direct', res, 200);
    assertField('admin_signup_direct', j, 'success', true);
    assertField('admin_signup_direct', j, 'setupToken');
    assertField('admin_signup_direct', j, 'role', account.role);

    if (account.ecTitle) {
        assertField('admin_signup_direct', j, 'ecTitle', account.ecTitle);
    }

    return { success: j?.success, setupToken: j?.setupToken, res };
}

/**
 * Step 4: admin_set_password — Set password using setupToken
 */
async function step4_setPassword(account, token) {
    log(`\n── Step 4: admin_set_password ──`);
    const res = await POST('admin_set_password', {
        email: account.email,
        token,
        password: account.password || 'TestPass#2026!',
    }, { 'x-user-email': '' });
    const j = res.json;

    assertStatus('admin_set_password', res, 200);
    assertField('admin_set_password', j, 'success', true);

    return { success: j?.success, res };
}

/**
 * Step 5: admin_save_profile — Save profile data
 */
async function step5_saveProfile(account, token) {
    log(`\n── Step 5: admin_save_profile ──`);
    const res = await POST('admin_save_profile', {
        email: account.email,
        token,
        firstName: account.firstName,
        lastName: account.lastName,
        phone: account.phone || '555-0001',
        address: '123 Test St',
        city: 'Jacksonville',
        state: 'FL',
        zipCode: '32256',
        familyMembers: [],
    }, { 'x-user-email': '' });
    const j = res.json;

    assertStatus('admin_save_profile', res, 200);
    assertField('admin_save_profile', j, 'success', true);

    return { success: j?.success, res };
}

/**
 * Step 6: admin_onboard_complete — Mark onboarding done
 */
async function step6_onboardComplete(account, token) {
    log(`\n── Step 6: admin_onboard_complete ──`);
    const res = await POST('admin_onboard_complete', {
        email: account.email,
        token,
    }, { 'x-user-email': '' });
    const j = res.json;

    assertStatus('admin_onboard_complete', res, 200);
    assertField('admin_onboard_complete', j, 'success', true);
    assertField('admin_onboard_complete', j, 'portalUrl');

    if (j?.portalUrl) {
        assertFieldContains('admin_onboard_complete', j, 'portalUrl', 'banfjax-hash.github.io/banf/');
    }

    return { success: j?.success, portalUrl: j?.portalUrl, res };
}

/**
 * Step 7: admin_verify_login — Verify login with password
 */
async function step7_login(account) {
    log(`\n── Step 7: admin_verify_login ──`);
    const res = await POST('admin_verify_login', {
        email: account.email,
        password: account.password || 'TestPass#2026!',
    }, { 'x-user-email': '' });
    const j = res.json;

    assertStatus('admin_verify_login', res, 200);
    assertField('admin_verify_login', j, 'success', true);
    assertField('admin_verify_login', j, 'adminRole', account.role);

    if (account.ecTitle) {
        assertField('admin_verify_login', j, 'ecTitle', account.ecTitle);
    }

    return { success: j?.success, role: j?.adminRole, res };
}

/**
 * Step 8 (EC only): ec_signup_congratulations — Send congrats email
 */
async function step8_ecCongrats(account) {
    log(`\n── Step 8: ec_signup_congratulations ──`);
    const res = await POST('ec_signup_congratulations', {
        email: account.email,
    });
    const j = res.json;

    assertStatus('ec_signup_congratulations', res, 200);
    assertField('ec_signup_congratulations', j, 'success', true);
    // Validate congratulations email subject encoding
    assertCleanSubject('ec_signup_congratulations', j?.emailSubject);

    return { success: j?.success, res };
}

/**
 * Verification: admin_roles — Validate final state in DB
 */
async function stepV_verifyRoles(account) {
    log(`\n── Verify: admin_roles (DB state) ──`);
    const res = await GET('admin_roles');
    const roles = res.json?.roles || [];
    const entry = roles.find((r) => r.email === account.email.toLowerCase());

    assert('DB: record exists', !!entry, !!entry, true);
    if (entry) {
        assertField('DB', entry, 'role', account.role);
        assertField('DB', entry, 'isActive', true);
        if (account.ecTitle) assertField('DB', entry, 'ecTitle', account.ecTitle);
    }
    return { success: !!entry, entry, res };
}

// ═══════════════════════════════════════════════════════════════
// PIPELINE ORCHESTRATORS
// ═══════════════════════════════════════════════════════════════

async function runECPipeline() {
    suite('EC MEMBER ONBOARDING PIPELINE');

    const account = EC_TEST;

    // Step 0: Cleanup
    await step0_cleanup(account);

    // Step 1: Add EC role (should NOT send generic email)
    const s1 = await step1_addRole(account);
    if (!s1.success) {
        log('  ⚠️  Step 1 failed — aborting EC pipeline');
        return;
    }

    // Step 2: Send EC invitations (dedicated email)
    const s2 = await step2_ecInvitations();

    // Step 3: Signup direct (get fresh setupToken)
    const s3 = await step3_signupDirect(account);
    if (!s3.setupToken) {
        log('  ⚠️  No setupToken from signup_direct — aborting');
        return;
    }

    const token = s3.setupToken;

    // Step 4: Set password
    const s4 = await step4_setPassword(account, token);

    // Step 5: Save profile
    const s5 = await step5_saveProfile(account, token);

    // Step 6: Complete onboarding
    const s6 = await step6_onboardComplete(account, token);

    // Step 7: Verify login
    const s7 = await step7_login(account);

    // Step 8: EC congrats email
    const s8 = await step8_ecCongrats(account);

    // Verify DB state
    await stepV_verifyRoles(account);
}

async function runStakeholderPipeline() {
    suite('STAKEHOLDER ADMIN VERIFICATION PIPELINE');

    // For super_admin (banfjax@gmail.com) — already exists, just verify login works
    const account = STAKEHOLDER_TEST;

    log('\n── Stakeholder: Verify existing super_admin login ──');
    const res = await POST('admin_verify_login', {
        email: account.email,
        password: '',  // Will show needsOnboarding or noPassword
    }, { 'x-user-email': '' });
    const j = res.json;

    assertStatus('stakeholder_login_check', res, 200);
    // Either success=true (can login) or needsOnboarding=true (needs setup) — both valid
    assert(
        'stakeholder: valid response',
        j?.success === true || j?.needsOnboarding === true || j?.noPassword === true,
        { success: j?.success, needsOnboarding: j?.needsOnboarding, noPassword: j?.noPassword },
        'success OR needsOnboarding OR noPassword'
    );

    // Verify admin_roles lists super_admin
    await stepV_verifyRoles(account);
}

async function runCrossContaminationTests() {
    suite('EC ↔ STAKEHOLDER ISOLATION TESTS');

    // Test 1: Adding ec_member should NOT produce stakeholder email fields
    log('\n── Isolation Test 1: ec_member email separation ──');
    
    // First cleanup and re-add as ec_member
    await POST('admin_role_revoke', { email: EC_TEST.email, role: 'ec_member' });
    const addRes = await POST('admin_role_add', {
        email: EC_TEST.email,
        role: 'ec_member',
        ecTitle: EC_TEST.ecTitle,
        firstName: EC_TEST.firstName,
        lastName: EC_TEST.lastName,
    });
    const j = addRes.json;

    // EC must have emailSent=false
    assert(
        'EC isolation: no generic email sent',
        j?.emailSent === false,
        j?.emailSent,
        false,
        'EC members must NOT receive the stakeholder role_welcome email'
    );

    // EC must have emailSkipped field
    assert(
        'EC isolation: emailSkipped present',
        !!j?.emailSkipped,
        j?.emailSkipped || 'missing',
        'present',
    );

    // Message must reference ec_send_all_invitations
    assert(
        'EC isolation: message references EC endpoint',
        (j?.message || '').includes('ec_send_all_invitations'),
        j?.message?.substring(0, 100) || '',
        'contains ec_send_all_invitations'
    );

    // Test 2: URL validation — no www.jaxbengali.org in portal URLs
    log('\n── Isolation Test 2: URL correctness ──');
    const onboardUrl = j?.onboardUrl || '';
    assert(
        'URL: uses GitHub Pages',
        onboardUrl.includes('banfjax-hash.github.io'),
        onboardUrl,
        'contains banfjax-hash.github.io'
    );
    assert(
        'URL: no old jaxbengali.org',
        !onboardUrl.includes('www.jaxbengali.org'),
        onboardUrl,
        'must NOT contain www.jaxbengali.org'
    );

    // Test 3: Verify ec_send_all_invitations endpoint is reachable (not 404)
    log('\n── Isolation Test 3: EC endpoints registered ──');
    const ecInvRes = await POST('ec_send_all_invitations', {});
    assert(
        'ec_send_all_invitations: not 404',
        ecInvRes.status !== 404,
        ecInvRes.status,
        'not 404'
    );

    const ecCongRes = await POST('ec_signup_congratulations', { email: EC_TEST.email });
    assert(
        'ec_signup_congratulations: not 404',
        ecCongRes.status !== 404,
        ecCongRes.status,
        'not 404'
    );
}

async function runEndpointHealthChecks() {
    suite('ENDPOINT HEALTH & REGISTRATION CHECKS');

    const endpoints = [
        { method: 'POST', path: 'admin_role_add', body: {} },
        { method: 'POST', path: 'admin_role_revoke', body: {} },
        { method: 'GET',  path: 'admin_roles' },
        { method: 'POST', path: 'admin_signup_direct', body: {} },
        { method: 'POST', path: 'admin_set_password', body: {} },
        { method: 'POST', path: 'admin_save_profile', body: {} },
        { method: 'POST', path: 'admin_onboard_complete', body: {} },
        { method: 'POST', path: 'admin_verify_login', body: {} },
        { method: 'POST', path: 'admin_onboard_verify', body: {} },
        { method: 'POST', path: 'ec_send_all_invitations', body: {} },
        { method: 'POST', path: 'ec_signup_congratulations', body: {} },
        { method: 'GET',  path: 'admin_dashboard' },
        { method: 'GET',  path: 'seed_system' },
    ];

    for (const ep of endpoints) {
        const res = ep.method === 'GET'
            ? await GET(ep.path)
            : await POST(ep.path, ep.body);
        
        // A 404 means the endpoint isn't registered in http-functions.js
        assert(
            `${ep.path}: registered (not 404)`,
            res.status !== 404,
            res.status,
            '≠404',
            res.status === 404 ? 'ENDPOINT NOT REGISTERED IN http-functions.js' : ''
        );
    }
}

// ═══════════════════════════════════════════════════════════════
// REPORT GENERATION
// ═══════════════════════════════════════════════════════════════

function generateReport() {
    const passed = results.filter((r) => r.status === 'PASS').length;
    const failed = results.filter((r) => r.status === 'FAIL').length;
    const total = results.length;

    log(`\n${'═'.repeat(60)}`);
    log(`  FINAL REPORT`);
    log(`${'═'.repeat(60)}`);
    log(`  Total: ${total}  |  ✅ Passed: ${passed}  |  ❌ Failed: ${failed}`);
    log(`  Pass Rate: ${total > 0 ? ((passed / total) * 100).toFixed(1) : 0}%`);

    if (failed > 0) {
        log(`\n── FAILURES ──────────────────────────────────────`);
        for (const f of results.filter((r) => r.status === 'FAIL')) {
            log(`  ❌ [${f.suite}] ${f.test}`);
            log(`     Expected: ${f.expected}`);
            log(`     Actual:   ${f.actual}`);
            if (f.details) log(`     Details:  ${f.details}`);
        }
    }

    // Structured output for machine consumption
    const report = {
        timestamp: new Date().toISOString(),
        total,
        passed,
        failed,
        passRate: total > 0 ? ((passed / total) * 100).toFixed(1) + '%' : '0%',
        suites: {},
        failures: results.filter((r) => r.status === 'FAIL'),
    };

    // Group by suite
    for (const r of results) {
        if (!report.suites[r.suite]) report.suites[r.suite] = { passed: 0, failed: 0, tests: [] };
        report.suites[r.suite][r.status === 'PASS' ? 'passed' : 'failed']++;
        report.suites[r.suite].tests.push(r);
    }

    return report;
}

function generateDiagnostics(report) {
    const diag = [];

    for (const f of report.failures) {
        // Analyze failure patterns and suggest fixes
        if (f.test.includes('404') || f.details?.includes('NOT REGISTERED')) {
            diag.push({
                issue: `Endpoint not registered: ${f.test}`,
                fix: 'Add import/re-export in http-functions.js',
                severity: 'CRITICAL',
                autoFixable: true,
            });
        }
        if (f.test.includes('emailSent') && f.actual === 'true' && f.expected === 'false') {
            diag.push({
                issue: 'EC member still receiving generic stakeholder email',
                fix: 'admin_role_add EC branching not deployed — republish',
                severity: 'HIGH',
                autoFixable: false,
            });
        }
        if (f.test.includes('jaxbengali.org') || (f.test.includes('URL') && f.details?.includes('jaxbengali'))) {
            diag.push({
                issue: 'Stale URL still pointing to www.jaxbengali.org',
                fix: 'Update URL constants to banfjax-hash.github.io/banf/',
                severity: 'HIGH',
                autoFixable: true,
            });
        }
        if (f.test.includes('Forbidden') || f.actual === '403') {
            diag.push({
                issue: `Auth failure: ${f.test}`,
                fix: 'Check x-user-email header or AdminRoles seeding',
                severity: 'MEDIUM',
                autoFixable: false,
            });
        }
    }

    if (diag.length > 0) {
        log(`\n── DIAGNOSTICS & RECOMMENDED FIXES ──────────────`);
        for (const d of diag) {
            log(`  [${d.severity}] ${d.issue}`);
            log(`    → Fix: ${d.fix}`);
            log(`    → Auto-fixable: ${d.autoFixable ? 'YES' : 'NO (manual)'}`);
        }
    }

    return diag;
}

// ═══════════════════════════════════════════════════════════════
// GITHUB BUILD STATUS CHECK
// Fetches latest GitHub Actions runs via public API and validates
// that Pages deployment and E2E tests are green.
// ═══════════════════════════════════════════════════════════════

function githubGet(path) {
    return new Promise((resolve, reject) => {
        const opts = {
            hostname: 'api.github.com',
            path,
            method: 'GET',
            headers: {
                'User-Agent': 'banf-pipeline-test-agent/1.0',
                'Accept': 'application/vnd.github.v3+json',
            },
        };
        const req = https.request(opts, r => {
            let buf = '';
            r.on('data', d => (buf += d));
            r.on('end', () => {
                let parsed = null;
                try { parsed = JSON.parse(buf); } catch (_) {}
                resolve({ status: r.statusCode, json: parsed });
            });
        });
        req.on('error', reject);
        req.end();
    });
}

async function runGitHubBuildChecks() {
    suite('GITHUB ACTIONS BUILD STATUS');

    let runs = [];
    try {
        const r = await githubGet(`/repos/${GITHUB_REPO}/actions/runs?per_page=20`);
        if (r.status !== 200) {
            log(`  ⚠️  GitHub API returned HTTP ${r.status} — skipping build checks`);
            return;
        }
        runs = (r.json?.workflow_runs || []);
    } catch (e) {
        log(`  ⚠️  GitHub API error: ${e.message} — skipping build checks`);
        return;
    }

    // ── Pages deployment (GitHub Pages serving docs/) ──────────
    const pagesRuns = runs.filter(r => r.name === 'pages build and deployment');
    const latestPages = pagesRuns[0];
    if (latestPages) {
        const ok = latestPages.conclusion === 'success';
        const isPending = latestPages.status !== 'completed';
        const msg = latestPages.head_commit?.message?.split('\n')[0]?.substring(0, 60) || '';
        log(`  Pages deploy: [${latestPages.status}] ${latestPages.conclusion || 'running'}`);
        log(`    Commit : ${latestPages.head_sha?.substring(0,7)} — ${msg}`);
        log(`    At     : ${latestPages.created_at}`);
        log(`    URL    : ${latestPages.html_url}`);
        assert(
            'GitHub Pages build → latest completed',
            isPending || ok,
            isPending ? 'IN_PROGRESS' : latestPages.conclusion,
            isPending ? 'IN_PROGRESS' : 'success',
            isPending
                ? 'Build still running — check back shortly'
                : `Last build ${latestPages.conclusion}. URL: ${latestPages.html_url}`
        );
        if (!isPending) {
            assert(
                'GitHub Pages build → conclusion = success',
                ok,
                latestPages.conclusion,
                'success',
                ok ? '' : `Fix: Visit ${latestPages.html_url} to see failure logs`
            );
        }
    } else {
        log('  ℹ️  No pages build and deployment runs found');
    }

    // ── E2E test workflow (banf-e2e-tests) ──────────────────────
    const e2eRuns = runs.filter(r => r.name === 'BANF E2E Pipeline Tests');
    const latestE2E = e2eRuns[0];
    if (latestE2E) {
        const ok = latestE2E.conclusion === 'success';
        const isPending = latestE2E.status !== 'completed';
        const msg = latestE2E.head_commit?.message?.split('\n')[0]?.substring(0, 60) || '';
        log(`\n  E2E test run: [${latestE2E.status}] ${latestE2E.conclusion || 'running'}`);
        log(`    Commit : ${latestE2E.head_sha?.substring(0,7)} — ${msg}`);
        log(`    At     : ${latestE2E.created_at}`);
        log(`    URL    : ${latestE2E.html_url}`);
        if (!isPending) {
            assert(
                'GitHub E2E tests → conclusion = success',
                ok,
                latestE2E.conclusion,
                'success',
                ok ? '' : `Fix: Visit ${latestE2E.html_url} to see test failure logs`
            );
        } else {
            log('    Status : IN_PROGRESS — check back shortly');
        }
    } else {
        log('\n  ℹ️  No BANF E2E Pipeline Tests workflow runs found yet');
        log('     (Will appear after the first push with .github/workflows/banf-e2e-tests.yml)');
    }

    // ── Last 5 runs summary table ────────────────────────────────
    log('\n  ── Last 5 workflow runs ──');
    log('  ' + ['SHA    ', 'Workflow                       ', 'Status    ', 'Result   ', 'Date               '].join('  '));
    log('  ' + '─'.repeat(95));
    for (const run of runs.slice(0, 5)) {
        const sha = (run.head_sha || '').substring(0, 7).padEnd(7);
        const wf  = (run.name || '').substring(0, 29).padEnd(29);
        const st  = (run.status || '').padEnd(10);
        const co  = (run.conclusion || 'pending').padEnd(9);
        const dt  = (run.created_at || '').substring(0, 19);
        const icon = run.conclusion === 'success' ? '✅'
                   : run.conclusion === 'failure' ? '❌'
                   : run.conclusion === 'cancelled' ? '⏹️'
                   : '⏳';
        log(`  ${icon} ${sha}  ${wf}  ${st}  ${co}  ${dt}`);
    }
}

// ═══════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════

(async () => {
    const args = process.argv.slice(2);
    const ecOnly = args.includes('--ec-only');
    const adminOnly = args.includes('--admin-only');
    const fixMode = args.includes('--fix');

    log('╔══════════════════════════════════════════════════════════╗');
    log('║  BANF PIPELINE TEST AGENT v1.0                         ║');
    log('║  Full E2E Onboarding Validation                        ║');
    log(`║  Mode: ${ecOnly ? 'EC ONLY' : adminOnly ? 'ADMIN ONLY' : 'FULL'}${fixMode ? ' + AUTO-FIX' : ''}                                     ║`);
    log(`║  Target: ${BASE_HOST}                        ║`);
    log('╚══════════════════════════════════════════════════════════╝');

    try {
        // Always run health checks
        await runEndpointHealthChecks();

        if (!adminOnly) {
            await runECPipeline();
        }

        if (!ecOnly) {
            await runStakeholderPipeline();
        }

        // Always run isolation tests
        if (!adminOnly && !ecOnly) {
            await runCrossContaminationTests();
        }

        // GitHub Actions build status
        await runGitHubBuildChecks();

        // Generate report
        const report = generateReport();
        const diag = generateDiagnostics(report);

        // Save JSON report
        const fs = require('fs');
        const reportPath = 'banf-pipeline-test-results.json';
        fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
        log(`\n📄 Report saved: ${reportPath}`);

        // Exit with appropriate code
        if (report.failed > 0) {
            log(`\n⚠️  ${report.failed} test(s) FAILED — review failures above`);
            if (fixMode && diag.some(d => d.autoFixable)) {
                log('\n🔧 AUTO-FIX MODE: would attempt fixes (not yet implemented)');
                log('   Run again after fixing to validate.');
            }
            process.exit(1);
        } else {
            log('\n🎉 ALL TESTS PASSED — Pipeline is healthy!');
            process.exit(0);
        }
    } catch (e) {
        log(`\n💥 FATAL ERROR: ${e.message}`);
        log(e.stack);
        process.exit(2);
    }
})();
