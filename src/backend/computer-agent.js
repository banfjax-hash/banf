/**
 * ═══════════════════════════════════════════════════════════════
 *  COMPUTER USER AGENT — Automated website interaction agent
 *  Uses HTTP requests to crawl pages/endpoints.
 *  LLM validates responses AND suggests fixes for failures.
 *  Runs like a human tester: GET/POST endpoints, check output,
 *  record pass/fail, generate HTML report saved to TestResults.
 * ═══════════════════════════════════════════════════════════════
 */

import { ok, badRequest, serverError } from 'wix-http-functions';
import wixData from 'wix-data';
import { fetch as wixFetch } from 'wix-fetch';

const SA = { suppressAuth: true };
const HF_TOKEN = 'REVOKED_SEE_SITECONFIG_HF_API_TOKEN';
const HF_LLM   = 'https://router.huggingface.co/featherless-ai/v1/chat/completions';

// ─── Helpers ──────────────────────────────────────────────────

function jsonOk(data) {
    return ok({
        body: JSON.stringify({ success: true, ...data }),
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
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
// CORE HTTP ACTIONS — fetch a URL and record the result
// ──────────────────────────────────────────────────────────────

async function httpGet(url, headers = {}) {
    const start = Date.now();
    try {
        const res = await wixFetch(url, { method: 'GET', headers });
        const bodyText = await res.text().catch(() => '');
        return { url, method: 'GET', status: res.status, body: bodyText.substring(0, 2000), elapsed: Date.now() - start, error: null };
    } catch (e) {
        return { url, method: 'GET', status: 0, body: '', elapsed: Date.now() - start, error: e.message };
    }
}

async function httpPost(url, payload = {}, headers = {}) {
    const start = Date.now();
    try {
        const res = await wixFetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...headers },
            body: JSON.stringify(payload)
        });
        const bodyText = await res.text().catch(() => '');
        return { url, method: 'POST', status: res.status, body: bodyText.substring(0, 2000), elapsed: Date.now() - start, error: null };
    } catch (e) {
        return { url, method: 'POST', status: 0, body: '', elapsed: Date.now() - start, error: e.message };
    }
}

// ──────────────────────────────────────────────────────────────
// LLM RESPONSE VALIDATOR
// ──────────────────────────────────────────────────────────────

async function llmValidateResponse(testName, url, method, status, body, expectedSchema) {
    const schemaStr = expectedSchema ? JSON.stringify(expectedSchema) : 'any valid JSON with success field';
    const prompt = `You are an API test validator. Given the HTTP response below, determine if it is correct.

Test: ${testName}
URL: ${url}
Method: ${method}
HTTP Status: ${status}
Response Body (first 1000 chars): ${body.substring(0, 1000)}
Expected schema: ${schemaStr}

Reply with JSON only:
{
  "passed": true/false,
  "reason": "short explanation",
  "suggestion": "fix suggestion if failed, else null"
}`;

    try {
        const res = await wixFetch(HF_LLM, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${HF_TOKEN}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: 'meta-llama/Llama-3.1-8B-Instruct',
                messages: [{ role: 'user', content: prompt }],
                max_tokens: 200, temperature: 0.1
            })
        });
        const json = await res.json();
        const text = json.choices?.[0]?.message?.content || '{}';
        const match = text.match(/\{[\s\S]*\}/);
        if (match) return JSON.parse(match[0]);
    } catch (_) {}
    // Fallback — simple heuristic validation
    const passed = status >= 200 && status < 300 && body.includes('"success":true');
    return { passed, reason: passed ? 'HTTP 2xx + success=true found' : `HTTP ${status} or missing success field`, suggestion: passed ? null : 'Check endpoint logic or auth' };
}

// ──────────────────────────────────────────────────────────────
// TEST STEP RUNNER
// ──────────────────────────────────────────────────────────────

async function runStep(step, baseUrl, authHeaders) {
    let result;
    if (step.method === 'POST') {
        result = await httpPost(`${baseUrl}${step.path}`, step.payload || {}, { ...authHeaders, ...(step.headers || {}) });
    } else {
        const qs = step.query ? '?' + new URLSearchParams(step.query).toString() : '';
        result = await httpGet(`${baseUrl}${step.path}${qs}`, { ...authHeaders, ...(step.headers || {}) });
    }

    const validation = await llmValidateResponse(step.name, result.url, result.method, result.status, result.body, step.expectedSchema);

    return {
        name: step.name,
        path: step.path,
        method: step.method || 'GET',
        status: result.status,
        elapsed: result.elapsed,
        passed: validation.passed,
        reason: validation.reason,
        suggestion: validation.suggestion,
        responseSnippet: result.body.substring(0, 500),
        error: result.error
    };
}

// ──────────────────────────────────────────────────────────────
// DEFAULT TEST PLAN — all BANF v5.4 endpoints
// ──────────────────────────────────────────────────────────────

function buildDefaultTestPlan(adminKey) {
    const authHeaders = { 'x-user-email': 'banfjax@gmail.com' };
    const withKey = { admin_key: adminKey };

    return [
        // Health & Public
        { name: 'Health Check', path: '/_functions/health', method: 'GET', expectedSchema: { version: 'string', status: 'string' } },
        { name: 'Get Events', path: '/_functions/events', method: 'GET' },

        // Member endpoints
        { name: 'Member Profile', path: '/_functions/member_profile', method: 'GET', headers: authHeaders },
        { name: 'Member Payments', path: '/_functions/member_payments', method: 'GET', headers: authHeaders },
        { name: 'Member Events', path: '/_functions/member_events', method: 'GET', headers: authHeaders },
        { name: 'Member Chat (single turn)', path: '/_functions/member_chat', method: 'POST', headers: authHeaders, payload: { message: 'What events are coming up for BANF?' } },

        // Admin dashboard
        { name: 'Admin Dashboard', path: '/_functions/admin_dashboard', method: 'GET', headers: authHeaders },
        { name: 'Admin Members', path: '/_functions/admin_members', method: 'GET', headers: authHeaders },
        { name: 'Admin Payments', path: '/_functions/admin_payments', method: 'GET', headers: authHeaders },
        { name: 'Admin Email Queue', path: '/_functions/admin_email_queue', method: 'GET', headers: authHeaders },
        { name: 'Admin KB List', path: '/_functions/admin_knowledge_base', method: 'GET', headers: authHeaders },
        { name: 'Admin Agents', path: '/_functions/admin_agents', method: 'GET', headers: authHeaders },
        { name: 'Admin Roles', path: '/_functions/admin_roles', method: 'GET', headers: authHeaders },

        // RAG
        { name: 'RAG Query', path: '/_functions/rag_query', method: 'POST', headers: authHeaders, payload: { query: 'How do I become a BANF member?' } },

        // Agent
        { name: 'Agent Chat', path: '/_functions/agent', method: 'POST', headers: authHeaders, payload: { query: 'Tell me about BANF events' } },

        // Report
        { name: 'Admin Report', path: '/_functions/admin_report', method: 'GET', headers: authHeaders },

        // Computer agent test
        { name: 'Computer Agent Status', path: '/_functions/computer_agent_status', method: 'GET', headers: authHeaders }
    ];
}

// ──────────────────────────────────────────────────────────────
// HTML REPORT GENERATOR
// ──────────────────────────────────────────────────────────────

function buildHtmlReport(results, baseUrl, runId, elapsed) {
    const passed = results.filter(r => r.passed).length;
    const failed = results.filter(r => !r.passed).length;
    const total = results.length;
    const passRate = total > 0 ? Math.round((passed / total) * 100) : 0;

    const rows = results.map(r => `
    <tr class="${r.passed ? 'pass' : 'fail'}">
      <td>${r.name}</td>
      <td>${r.method}</td>
      <td>${r.path}</td>
      <td>${r.status}</td>
      <td>${r.elapsed}ms</td>
      <td>${r.passed ? '✅' : '❌'}</td>
      <td>${r.reason || ''}</td>
      <td>${r.suggestion || ''}</td>
    </tr>`).join('');

    return `<!DOCTYPE html>
<html>
<head>
<title>BANF Computer Agent Test Report</title>
<style>
  body{font-family:Arial,sans-serif;margin:20px;background:#f5f5f5}
  h1{color:#333}
  .summary{background:#fff;padding:16px;border-radius:8px;margin-bottom:20px;display:flex;gap:24px}
  .stat{text-align:center}
  .stat .n{font-size:2em;font-weight:bold}
  .pass-rate{color:${passRate>=80?'#2e7d32':'#c62828'}}
  table{width:100%;border-collapse:collapse;background:#fff;border-radius:8px;overflow:hidden}
  th{background:#1565c0;color:#fff;padding:10px;text-align:left}
  td{padding:8px 10px;border-bottom:1px solid #e0e0e0;font-size:13px;vertical-align:top}
  tr.fail td:first-child{border-left:4px solid #c62828}
  tr.pass td:first-child{border-left:4px solid #2e7d32}
  tr:hover{background:#f0f4ff}
</style>
</head>
<body>
<h1>BANF Computer Agent Test Report</h1>
<div class="summary">
  <div class="stat"><div class="n pass-rate">${passRate}%</div><div>Pass Rate</div></div>
  <div class="stat"><div class="n" style="color:#2e7d32">${passed}</div><div>Passed</div></div>
  <div class="stat"><div class="n" style="color:#c62828">${failed}</div><div>Failed</div></div>
  <div class="stat"><div class="n">${total}</div><div>Total</div></div>
  <div class="stat"><div class="n">${elapsed}ms</div><div>Run Time</div></div>
  <div class="stat"><div class="n" style="font-size:0.9em">${runId}</div><div>Run ID</div></div>
</div>
<table>
<thead><tr><th>Test</th><th>Method</th><th>Path</th><th>Status</th><th>Time</th><th>Pass</th><th>Reason</th><th>Suggestion</th></tr></thead>
<tbody>${rows}</tbody>
</table>
<p style="color:#888;font-size:12px">Base URL: ${baseUrl} | Generated: ${new Date().toISOString()}</p>
</body></html>`;
}

// ──────────────────────────────────────────────────────────────
// MAIN CRAWL RUNNER
// ──────────────────────────────────────────────────────────────

export async function runComputerAgentTest(options = {}) {
    const baseUrl = options.baseUrl || 'https://www.jaxbengali.org';
    const adminKey = options.adminKey || '';
    const testPlan = options.customSteps || buildDefaultTestPlan(adminKey);
    const runId = `run_${Date.now()}`;
    const start = Date.now();

    const results = [];
    // Run sequentially to avoid rate-limiting; can batch if needed
    for (const step of testPlan) {
        const stepResult = await runStep(step, baseUrl, {});
        results.push(stepResult);
    }

    const elapsed = Date.now() - start;
    const passed = results.filter(r => r.passed).length;
    const failed = results.filter(r => !r.passed).length;
    const htmlReport = buildHtmlReport(results, baseUrl, runId, elapsed);

    // Persist to TestResults collection
    try {
        await wixData.insert('TestResults', {
            runId,
            runAt: new Date(),
            baseUrl,
            totalTests: results.length,
            passed,
            failed,
            passRate: Math.round((passed / results.length) * 100),
            elapsed,
            results: JSON.stringify(results),
            htmlReport,
            runBy: options.runBy || 'system'
        }, SA);
    } catch (_) {}

    return { runId, passed, failed, total: results.length, passRate: Math.round((passed / results.length) * 100), elapsed, results, htmlReport };
}

// ──────────────────────────────────────────────────────────────
// HTTP ENDPOINTS (wired into http-functions.js)
// ──────────────────────────────────────────────────────────────

export async function post_computer_agent_test(request) {
    try {
        const body = await parseBody(request);
        const report = await runComputerAgentTest({
            baseUrl: body.baseUrl,
            adminKey: body.adminKey,
            customSteps: body.customSteps,
            runBy: body.runBy || 'api'
        });
        return jsonOk({ runId: report.runId, passed: report.passed, failed: report.failed, total: report.total, passRate: report.passRate, elapsed: report.elapsed, results: report.results });
    } catch (e) { return jsonErr(e.message, 500); }
}
export function options_computer_agent_test(request) { return handleCors(); }

export async function get_computer_agent_report(request) {
    try {
        const params = request.query || {};
        const runId = params.runId;
        if (runId) {
            const result = await wixData.query('TestResults').eq('runId', runId).find(SA);
            if (!result.items.length) return jsonErr('Run not found');
            const run = result.items[0];
            // Return HTML if format=html
            if (params.format === 'html') {
                return ok({ body: run.htmlReport || '<p>No HTML report</p>', headers: { 'Content-Type': 'text/html', 'Access-Control-Allow-Origin': '*' } });
            }
            return jsonOk({ run: { ...run, results: JSON.parse(run.results || '[]') } });
        }
        // List recent runs
        const runs = await wixData.query('TestResults').descending('runAt').limit(20).find(SA);
        return jsonOk({ runs: runs.items.map(r => ({ runId: r.runId, runAt: r.runAt, passed: r.passed, failed: r.failed, passRate: r.passRate, elapsed: r.elapsed })) });
    } catch (e) { return jsonErr(e.message, 500); }
}
export function options_computer_agent_report(request) { return handleCors(); }

export async function get_computer_agent_status(request) {
    try {
        const lastRun = await wixData.query('TestResults').descending('runAt').limit(1).find(SA);
        const status = lastRun.items.length ? lastRun.items[0] : null;
        return jsonOk({ status: status ? { runId: status.runId, runAt: status.runAt, passed: status.passed, failed: status.failed, passRate: status.passRate } : 'no_runs_yet' });
    } catch (e) { return jsonErr(e.message, 500); }
}
export function options_computer_agent_status(request) { return handleCors(); }
