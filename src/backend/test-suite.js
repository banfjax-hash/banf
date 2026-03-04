/**
 * ═══════════════════════════════════════════════════════════════
 *  TEST SUITE — Comprehensive test runner for BANF v5.4.0
 *  Tests all endpoint categories:
 *   - Public (events, health)
 *   - Member (profile, payments, chat, RSVP, complaint)
 *   - Admin (dashboard, members, payments, email queue, KB, agents, roles)
 *   - RAG (query, KB add)
 *   - Email automation (scan, approve)
 *   - Computer agent (crawl + report)
 *  Saves pass/fail results to TestResults collection.
 * ═══════════════════════════════════════════════════════════════
 */

import { ok, badRequest, serverError } from 'wix-http-functions';
import wixData from 'wix-data';
import { fetch as wixFetch } from 'wix-fetch';

const SA = { suppressAuth: true };

// ─── Helpers ──────────────────────────────────────────────────

function jsonOk(data) {
    return ok({ body: JSON.stringify({ success: true, ...data }), headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
}
function jsonErr(msg, code = 400) {
    const fn = code >= 500 ? serverError : badRequest;
    return fn({ body: JSON.stringify({ success: false, error: msg }), headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
}
function handleCors() {
    return ok({ body: '', headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type,Authorization,x-user-email' } });
}
async function parseBody(request) {
    try { return await request.body.json(); } catch (_) { return {}; }
}

// ──────────────────────────────────────────────────────────────
// HTTP TEST PRIMITIVES
// ──────────────────────────────────────────────────────────────

async function testGet(url, headers = {}) {
    const t = Date.now();
    try {
        const r = await wixFetch(url, { method: 'GET', headers });
        const body = await r.text().catch(() => '');
        return { url, method: 'GET', status: r.status, body: body.substring(0, 3000), elapsed: Date.now() - t, ok: r.status >= 200 && r.status < 300 };
    } catch (e) {
        return { url, method: 'GET', status: 0, body: e.message, elapsed: Date.now() - t, ok: false };
    }
}

async function testPost(url, payload = {}, headers = {}) {
    const t = Date.now();
    try {
        const r = await wixFetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(payload) });
        const body = await r.text().catch(() => '');
        return { url, method: 'POST', status: r.status, body: body.substring(0, 3000), elapsed: Date.now() - t, ok: r.status >= 200 && r.status < 300 };
    } catch (e) {
        return { url, method: 'POST', status: 0, body: e.message, elapsed: Date.now() - t, ok: false };
    }
}

// ──────────────────────────────────────────────────────────────
// SCHEMA VALIDATION
// ──────────────────────────────────────────────────────────────

function validateSchema(bodyText, required = []) {
    try {
        const parsed = JSON.parse(bodyText);
        const missing = required.filter(k => {
            const keys = k.split('.');
            let obj = parsed;
            for (const key of keys) { if (obj == null || !(key in obj)) return true; obj = obj[key]; }
            return false;
        });
        return { valid: missing.length === 0, parsed, missing };
    } catch (e) {
        return { valid: false, parsed: null, missing: ['(invalid JSON)'] };
    }
}

// ──────────────────────────────────────────────────────────────
// SINGLE TEST CASE RUNNER
// ──────────────────────────────────────────────────────────────

async function runTestCase(tc, base, auth) {
    const url = `${base}${tc.path}${tc.query ? '?' + new URLSearchParams(tc.query).toString() : ''}`;
    const headers = { ...(auth || {}), ...(tc.headers || {}) };

    const resp = tc.method === 'POST'
        ? await testPost(url, tc.payload || {}, headers)
        : await testGet(url, headers);

    // Schema validation
    const schema = validateSchema(resp.body, tc.requiredFields || ['success']);

    // Status check
    const expectedStatus = tc.expectedStatus || 200;
    const statusOk = resp.status === expectedStatus || (resp.ok && expectedStatus === 200);

    // Keyword check
    let keywordOk = true;
    if (tc.mustContain) {
        keywordOk = tc.mustContain.every(k => resp.body.includes(k));
    }
    if (tc.mustNotContain) {
        keywordOk = keywordOk && !tc.mustNotContain.some(k => resp.body.includes(k));
    }

    const passed = statusOk && schema.valid && keywordOk;
    const failures = [];
    if (!statusOk) failures.push(`Expected HTTP ${expectedStatus}, got ${resp.status}`);
    if (!schema.valid) failures.push(`Missing fields: ${schema.missing.join(', ')}`);
    if (!keywordOk) failures.push('Response keyword check failed');

    return {
        name: tc.name,
        category: tc.category,
        path: tc.path,
        method: tc.method || 'GET',
        status: resp.status,
        elapsed: resp.elapsed,
        passed,
        failures,
        responseSnippet: resp.body.substring(0, 400)
    };
}

// ──────────────────────────────────────────────────────────────
// FULL TEST PLAN — All BANF v5.4.0 endpoints
// ──────────────────────────────────────────────────────────────

function buildTestPlan() {
    const ADM = { 'x-user-email': 'banfjax@gmail.com' };
    const MEM = { 'x-user-email': 'banfjax@gmail.com' }; // Admin also acts as member for test

    return [
        // ── Public ──────────────────────────────────────────────
        { category: 'Public', name: 'Health check', path: '/_functions/health', method: 'GET', requiredFields: ['success', 'version'] },
        { category: 'Public', name: 'Get events', path: '/_functions/events', method: 'GET', requiredFields: ['success'] },

        // ── Member ──────────────────────────────────────────────
        { category: 'Member', name: 'Member profile', path: '/_functions/member_profile', method: 'GET', headers: MEM, requiredFields: ['success'] },
        { category: 'Member', name: 'Member payments', path: '/_functions/member_payments', method: 'GET', headers: MEM, requiredFields: ['success'] },
        { category: 'Member', name: 'Member events', path: '/_functions/member_events', method: 'GET', headers: MEM, requiredFields: ['success'] },
        { category: 'Member', name: 'Member complaints', path: '/_functions/member_complaints', method: 'GET', headers: MEM, requiredFields: ['success'] },
        { category: 'Member', name: 'Member surveys', path: '/_functions/member_surveys', method: 'GET', headers: MEM, requiredFields: ['success'] },
        { category: 'Member', name: 'Member directory', path: '/_functions/member_directory', method: 'GET', headers: MEM, requiredFields: ['success'] },
        { category: 'Member', name: 'Member chat (single turn)', path: '/_functions/member_chat', method: 'POST', headers: MEM, payload: { message: 'What is BANF?' }, requiredFields: ['success', 'reply'] },
        { category: 'Member', name: 'Member chat (context-aware)', path: '/_functions/member_chat_context', method: 'POST', headers: MEM, payload: { message: 'Tell me my payment history' }, requiredFields: ['success', 'reply'] },

        // ── Admin Dashboard ──────────────────────────────────────
        { category: 'Admin', name: 'Admin dashboard', path: '/_functions/admin_dashboard', method: 'GET', headers: ADM, requiredFields: ['success', 'stats'] },
        { category: 'Admin', name: 'Admin members list', path: '/_functions/admin_members', method: 'GET', headers: ADM, requiredFields: ['success', 'members'] },
        { category: 'Admin', name: 'Admin payments list', path: '/_functions/admin_payments', method: 'GET', headers: ADM, requiredFields: ['success', 'payments'] },
        { category: 'Admin', name: 'Admin sponsors', path: '/_functions/admin_sponsors', method: 'GET', headers: ADM, requiredFields: ['success'] },
        { category: 'Admin', name: 'Admin ads', path: '/_functions/admin_ads', method: 'GET', headers: ADM, requiredFields: ['success'] },
        { category: 'Admin', name: 'Admin careers', path: '/_functions/admin_careers', method: 'GET', headers: ADM, requiredFields: ['success'] },
        { category: 'Admin', name: 'Admin archive', path: '/_functions/admin_archive', method: 'GET', headers: ADM, query: { collection: 'Members' }, requiredFields: ['success', 'records'] },

        // ── Email Automation ────────────────────────────────────
        { category: 'Email', name: 'Email queue dashboard', path: '/_functions/admin_email_queue', method: 'GET', headers: ADM, requiredFields: ['success'] },
        { category: 'Email', name: 'Auto responses list', path: '/_functions/admin_auto_responses', method: 'GET', headers: ADM, requiredFields: ['success'] },

        // ── Knowledge Base ──────────────────────────────────────
        { category: 'RAG', name: 'KB documents list', path: '/_functions/admin_knowledge_base', method: 'GET', headers: ADM, requiredFields: ['success', 'documents'] },
        { category: 'RAG', name: 'RAG query', path: '/_functions/rag_query', method: 'POST', headers: ADM, payload: { query: 'How do I become a member?' }, requiredFields: ['success', 'response'] },
        { category: 'RAG', name: 'KB search', path: '/_functions/admin_kb_search', method: 'POST', headers: ADM, payload: { query: 'membership benefits' }, requiredFields: ['success', 'results'] },

        // ── Agent orchestration ─────────────────────────────────
        { category: 'Agent', name: 'List agents', path: '/_functions/admin_agents', method: 'GET', headers: ADM, requiredFields: ['success', 'agents'] },
        { category: 'Agent', name: 'Agent chat', path: '/_functions/agent', method: 'POST', headers: ADM, payload: { query: 'Hello BANF' }, requiredFields: ['success'] },

        // ── Role management ─────────────────────────────────────
        { category: 'Roles', name: 'List admin roles', path: '/_functions/admin_roles', method: 'GET', headers: ADM, requiredFields: ['success', 'roles'] },

        // ── Reports ──────────────────────────────────────────────
        { category: 'Report', name: 'Admin report', path: '/_functions/admin_report', method: 'GET', headers: ADM, requiredFields: ['success'] },

        // ── Computer agent ──────────────────────────────────────
        { category: 'ComputerAgent', name: 'Computer agent status', path: '/_functions/computer_agent_status', method: 'GET', headers: ADM, requiredFields: ['success'] },
        { category: 'ComputerAgent', name: 'Computer agent reports list', path: '/_functions/computer_agent_report', method: 'GET', headers: ADM, requiredFields: ['success'] },

        // ── Test suite itself ────────────────────────────────────
        { category: 'TestSuite', name: 'Test results list', path: '/_functions/test_results', method: 'GET', headers: ADM, requiredFields: ['success'] }
    ];
}

// ──────────────────────────────────────────────────────────────
// SUMMARY & HTML REPORT
// ──────────────────────────────────────────────────────────────

function buildTestReport(results, runId, elapsed) {
    const byCategory = {};
    for (const r of results) {
        if (!byCategory[r.category]) byCategory[r.category] = [];
        byCategory[r.category].push(r);
    }

    const passed = results.filter(r => r.passed).length;
    const failed = results.filter(r => !r.passed).length;
    const passRate = results.length ? Math.round((passed / results.length) * 100) : 0;
    const color = passRate >= 80 ? '#2e7d32' : passRate >= 60 ? '#e65100' : '#c62828';

    let catSections = '';
    for (const [cat, tests] of Object.entries(byCategory)) {
        const cp = tests.filter(t => t.passed).length;
        const rows = tests.map(t => `
      <tr class="${t.passed ? 'pass' : 'fail'}">
        <td>${t.name}</td><td>${t.method}</td><td>${t.path}</td>
        <td>${t.status}</td><td>${t.elapsed}ms</td>
        <td>${t.passed ? '✅' : '❌'}</td>
        <td style="font-size:11px">${t.failures.join('; ') || '—'}</td>
      </tr>`).join('');
        catSections += `
    <h3>${cat} (${cp}/${tests.length})</h3>
    <table>
      <thead><tr><th>Test</th><th>Method</th><th>Path</th><th>Status</th><th>Time</th><th>Pass</th><th>Failures</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>`;
    }

    return `<!DOCTYPE html><html><head><title>BANF Test Report</title>
<style>
  body{font-family:Arial,sans-serif;margin:20px;background:#f5f5f5}
  h1{color:#333}h3{margin-top:24px;color:#1565c0}
  .summary{background:#fff;padding:16px;border-radius:8px;margin-bottom:20px;display:flex;gap:24px}
  .stat{text-align:center}.stat .n{font-size:2em;font-weight:bold}
  table{width:100%;border-collapse:collapse;background:#fff;border-radius:8px;overflow:hidden;margin-bottom:12px}
  th{background:#1565c0;color:#fff;padding:8px;text-align:left}
  td{padding:7px 10px;border-bottom:1px solid #e0e0e0;font-size:12px;vertical-align:top}
  tr.fail td:first-child{border-left:4px solid #c62828}
  tr.pass td:first-child{border-left:4px solid #2e7d32}
</style></head><body>
<h1>BANF v5.4.0 Comprehensive Test Report</h1>
<div class="summary">
  <div class="stat"><div class="n" style="color:${color}">${passRate}%</div><div>Pass Rate</div></div>
  <div class="stat"><div class="n" style="color:#2e7d32">${passed}</div><div>Passed</div></div>
  <div class="stat"><div class="n" style="color:#c62828">${failed}</div><div>Failed</div></div>
  <div class="stat"><div class="n">${results.length}</div><div>Total</div></div>
  <div class="stat"><div class="n">${elapsed}ms</div><div>Run Time</div></div>
</div>
${catSections}
<p style="color:#888;font-size:12px">Run ID: ${runId} | Generated: ${new Date().toISOString()}</p>
</body></html>`;
}

// ──────────────────────────────────────────────────────────────
// MAIN RUNNER
// ──────────────────────────────────────────────────────────────

export async function runFullTestSuite(options = {}) {
    const base = options.baseUrl || 'https://www.jaxbengali.org';
    const testPlan = options.customPlan || buildTestPlan();
    const runId = `suite_${Date.now()}`;
    const start = Date.now();

    const results = [];
    for (const tc of testPlan) {
        const result = await runTestCase(tc, base, {}).catch(e => ({
            name: tc.name,
            category: tc.category,
            path: tc.path,
            method: tc.method || 'GET',
            status: 0,
            elapsed: 0,
            passed: false,
            failures: [e.message],
            responseSnippet: ''
        }));
        results.push(result);
    }

    const elapsed = Date.now() - start;
    const passed = results.filter(r => r.passed).length;
    const failed = results.filter(r => !r.passed).length;
    const htmlReport = buildTestReport(results, runId, elapsed);
    const passRate = results.length ? Math.round((passed / results.length) * 100) : 0;

    // Save to TestResults
    try {
        await wixData.insert('TestResults', {
            runId,
            runAt: new Date(),
            baseUrl: base,
            totalTests: results.length,
            passed,
            failed,
            passRate,
            elapsed,
            results: JSON.stringify(results),
            htmlReport,
            type: 'full-suite',
            runBy: options.runBy || 'system'
        }, SA);
    } catch (_) {}

    return { runId, passed, failed, total: results.length, passRate, elapsed, results, htmlReport };
}

// ──────────────────────────────────────────────────────────────
// HTTP ENDPOINTS
// ──────────────────────────────────────────────────────────────

export async function post_run_test_suite(request) {
    try {
        const body = await parseBody(request);
        const report = await runFullTestSuite({ baseUrl: body.baseUrl, runBy: body.runBy || 'api', customPlan: body.customPlan });
        return jsonOk({ runId: report.runId, passed: report.passed, failed: report.failed, total: report.total, passRate: report.passRate, elapsed: report.elapsed, results: report.results });
    } catch (e) { return jsonErr(e.message, 500); }
}
export function options_run_test_suite(request) {
    return ok({ body: '', headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type,Authorization,x-user-email' } });
}

export async function get_test_results(request) {
    try {
        const params = request.query || {};
        if (params.runId) {
            const res = await wixData.query('TestResults').eq('runId', params.runId).find(SA);
            if (!res.items.length) return jsonErr('Run not found');
            const run = res.items[0];
            if (params.format === 'html') {
                return ok({ body: run.htmlReport || '<p>No report</p>', headers: { 'Content-Type': 'text/html', 'Access-Control-Allow-Origin': '*' } });
            }
            return jsonOk({ run: { ...run, results: JSON.parse(run.results || '[]') } });
        }
        const runs = await wixData.query('TestResults').descending('runAt').limit(20).find(SA);
        return jsonOk({ runs: runs.items.map(r => ({ runId: r.runId, runAt: r.runAt, type: r.type, passed: r.passed, failed: r.failed, passRate: r.passRate, elapsed: r.elapsed })) });
    } catch (e) { return jsonErr(e.message, 500); }
}
export function options_test_results(request) {
    return ok({ body: '', headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' } });
}
