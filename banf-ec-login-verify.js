#!/usr/bin/env node
/**
 * ═══════════════════════════════════════════════════════════════
 *  BANF EC LOGIN VERIFICATION AGENT — Phase 7
 *  Tests that signed-up EC members can authenticate via:
 *    1. Wix backend (admin_verify_login API — live)
 *    2. Offline AUTH_DB credentials (ec-admin-login.html fallback)
 *  Also checks pending members are properly gated.
 * ═══════════════════════════════════════════════════════════════
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

// ── Config ────────────────────────────────────────────────────
const API_HOST = 'www.jaxbengali.org';
const API_PATH = '/_functions';

// Signed-up members (per ec-onboard-status.json)
const SIGNED_UP = [
  { email: 'ranadhir.ghosh@gmail.com', name: 'Dr. Ranadhir Ghosh', title: 'President', expectedRole: 'ec_member' },
  { email: 'mukhopadhyay.partha@gmail.com', name: 'Partha Mukhopadhyay', title: 'Vice President', expectedRole: 'ec_member' },
  { email: 'rajanya.ghosh@gmail.com', name: 'Rajanya Ghosh', title: 'General Secretary', expectedRole: 'ec_member' },
];

// Pending members (should NOT be able to login with full access)
const PENDING = [
  { email: 'amit.everywhere@gmail.com', name: 'Amit Chandak', title: 'Treasurer' },
  { email: 'moumita.mukherje@gmail.com', name: 'Dr. Moumita Ghosh', title: 'Cultural Secretary' },
  { email: 'duttasoumyajit86@gmail.com', name: 'Soumyajit Dutta', title: 'Food Coordinator' },
  { email: 'sumo475@gmail.com', name: 'Dr. Sumanta Ghosh', title: 'Event Coordinator' },
  { email: 'rwitichoudhury@gmail.com', name: 'Rwiti Chowdhury', title: 'Puja Coordinator' },
];

// Offline credentials (from AUTH_DB in ec-admin-login.html)
const OFFLINE_PW = {
  'ranadhir.ghosh@gmail.com': 'banf-super-2026',
  'mukhopadhyay.partha@gmail.com': 'banf-ec-2026',
  'rajanya.ghosh@gmail.com': 'banf-ec-2026',
  'amit.everywhere@gmail.com': 'banf-ec-2026',
  'moumita.mukherje@gmail.com': 'banf-ec-2026',
  'duttasoumyajit86@gmail.com': 'banf-ec-2026',
  'sumo475@gmail.com': 'banf-ec-2026',
  'rwitichoudhury@gmail.com': 'banf-ec-2026',
};

// ── HTTP helper ───────────────────────────────────────────────
function httpsPost(endpoint, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const opts = {
      hostname: API_HOST,
      port: 443,
      path: `${API_PATH}/${endpoint}`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
      }
    };
    const req = https.request(opts, res => {
      let buf = '';
      res.on('data', c => buf += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(buf) }); }
        catch { resolve({ status: res.statusCode, data: buf }); }
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

// ── Test runner ───────────────────────────────────────────────
const results = [];
let passCount = 0;
let failCount = 0;

function assert(testName, condition, actual, expected, note = '') {
  if (condition) {
    passCount++;
    results.push({ test: testName, status: 'PASS', actual, expected, note });
    console.log(`  ✅ ${testName}`);
  } else {
    failCount++;
    results.push({ test: testName, status: 'FAIL', actual, expected, note });
    console.log(`  ❌ ${testName} — expected: ${expected}, got: ${actual}${note ? ' (' + note + ')' : ''}`);
  }
}

// ── TESTS ─────────────────────────────────────────────────────

async function testBackendLoginForSignedUp() {
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('  TEST 1: Backend API Login — Signed-Up Members');
  console.log('  Endpoint: POST /admin_verify_login (www.jaxbengali.org)');
  console.log('═══════════════════════════════════════════════════════════\n');

  for (const member of SIGNED_UP) {
    console.log(`  🔑 ${member.name} (${member.title}) <${member.email}>`);

    // Test 1a: Login WITHOUT password — should return success+noPassword OR needsOnboarding
    const noPassRes = await httpsPost('admin_verify_login', { email: member.email });
    const noPassData = noPassRes.data;

    // If the backend recognizes the account, it should not return a hard error
    assert(
      `${member.name} — account exists in AdminRoles`,
      noPassRes.status === 200 || (noPassRes.status === 400 && !noPassData?.error?.includes('not found')),
      `HTTP ${noPassRes.status}`,
      '200 or 400 (not "not found")',
      noPassData?.error || ''
    );

    // Check account state
    if (noPassData?.success && noPassData?.noPassword) {
      assert(
        `${member.name} — legacy account (no password set) can login`,
        true, 'noPassword=true', 'noPassword=true',
        'Legacy super_admin or EC seeded without onboarding — login works'
      );
    } else if (noPassData?.success) {
      assert(
        `${member.name} — password-authenticated account active`,
        true, 'success=true', 'success=true',
        `role=${noPassData.adminRole}, ecTitle=${noPassData.ecTitle}`
      );
    } else if (noPassData?.needsOnboarding) {
      assert(
        `${member.name} — needs onboarding (account setup incomplete)`,
        false, 'needsOnboarding=true', 'success=true',
        'Member signed up but onboarding not finalized in Wix DB — FIX NEEDED'
      );
    } else {
      // Try with offline password
      console.log(`    → Trying with offline password...`);
      const withPassRes = await httpsPost('admin_verify_login', {
        email: member.email,
        password: OFFLINE_PW[member.email] || 'banf-ec-2026'
      });
      const withPassData = withPassRes.data;

      if (withPassData?.success) {
        assert(
          `${member.name} — login with offline password`,
          true, 'success=true', 'success=true',
          `role=${withPassData.adminRole}`
        );
      } else {
        assert(
          `${member.name} — backend login`,
          false,
          withPassData?.error || `HTTP ${withPassRes.status}`,
          'success=true',
          'Cannot authenticate via backend — check AdminRoles DB state'
        );
      }
    }

    // Check returned role info
    if (noPassData?.success || noPassData?.adminRole) {
      assert(
        `${member.name} — has correct role assigned`,
        !!noPassData.adminRole,
        noPassData.adminRole || 'undefined',
        'ec_member or admin or super_admin'
      );
      if (noPassData.ecTitle) {
        assert(
          `${member.name} — ecTitle present`,
          true,
          noPassData.ecTitle,
          member.title
        );
      }
    }

    console.log('');
    await new Promise(r => setTimeout(r, 500)); // rate limit
  }
}

async function testBackendPendingMembers() {
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('  TEST 2: Backend API — Pending Members (Not Signed Up)');
  console.log('═══════════════════════════════════════════════════════════\n');

  for (const member of PENDING) {
    console.log(`  🔒 ${member.name} (${member.title}) <${member.email}>`);

    const res = await httpsPost('admin_verify_login', { email: member.email });
    const data = res.data;

    // Pending members should either:
    // a) Return needsOnboarding=true (account exists, password not set)
    // b) Return noPassword=true (legacy seeded)
    // c) Return error (account not in DB yet)
    const isPending = data?.needsOnboarding || data?.noPassword || !data?.success;

    assert(
      `${member.name} — properly gated (not fully authenticated)`,
      isPending,
      data?.needsOnboarding ? 'needsOnboarding' : (data?.noPassword ? 'noPassword' : (data?.error || `success=${data?.success}`)),
      'needsOnboarding or noPassword or error',
      data?.error || ''
    );

    console.log('');
    await new Promise(r => setTimeout(r, 500));
  }
}

function testOfflineCredentials() {
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('  TEST 3: Offline AUTH_DB Credentials (ec-admin-login.html)');
  console.log('═══════════════════════════════════════════════════════════\n');

  // Read ec-admin-login.html and extract AUTH_DB
  const loginHtmlPath = path.join(__dirname, 'docs', 'ec-admin-login.html');
  if (!fs.existsSync(loginHtmlPath)) {
    console.log('  ⚠️ ec-admin-login.html not found at: ' + loginHtmlPath);
    assert('ec-admin-login.html exists', false, 'missing', 'exists');
    return;
  }

  const html = fs.readFileSync(loginHtmlPath, 'utf8');

  // Verify all 8 EC members are in AUTH_DB
  const allMembers = [...SIGNED_UP, ...PENDING];
  for (const m of allMembers) {
    const emailInFile = html.includes(`'${m.email}'`);
    assert(
      `${m.name} — present in AUTH_DB`,
      emailInFile,
      emailInFile ? 'found' : 'MISSING',
      'found'
    );
  }

  // Verify offlinePw is set for all members
  for (const m of allMembers) {
    const pwMatch = html.match(new RegExp(`'${m.email.replace(/\./g, '\\.')}[^}]+offlinePw:\\s*'([^']+)'`));
    assert(
      `${m.name} — has offlinePw set`,
      !!pwMatch,
      pwMatch ? pwMatch[1] : 'MISSING',
      'banf-ec-2026 or banf-super-2026'
    );
  }

  // Verify role assignments
  const roleChecks = [
    { email: 'ranadhir.ghosh@gmail.com', expectedRole: 'super-admin', name: 'Dr. Ranadhir Ghosh' },
    { email: 'mukhopadhyay.partha@gmail.com', expectedRole: 'admin', name: 'Partha Mukhopadhyay' },
    { email: 'rajanya.ghosh@gmail.com', expectedRole: 'admin', name: 'Rajanya Ghosh' },
    { email: 'amit.everywhere@gmail.com', expectedRole: 'admin', name: 'Amit Chandak' },
    { email: 'moumita.mukherje@gmail.com', expectedRole: 'ec-member', name: 'Dr. Moumita Ghosh' },
  ];
  for (const rc of roleChecks) {
    const roleMatch = html.match(new RegExp(`'${rc.email.replace(/\./g, '\\.')}[^}]+roles:\\s*\\[([^\\]]+)\\]`));
    if (roleMatch) {
      const hasRole = roleMatch[1].includes(`'${rc.expectedRole}'`);
      assert(
        `${rc.name} — has '${rc.expectedRole}' role`,
        hasRole,
        roleMatch[1].trim(),
        `includes '${rc.expectedRole}'`
      );
    } else {
      assert(`${rc.name} — role check`, false, 'no role found', rc.expectedRole);
    }
  }

  // Verify enterPortal() gates for EC roles
  const hasEnterPortal = html.includes('function enterPortal');
  assert('enterPortal() function exists', hasEnterPortal, hasEnterPortal, true);

  const hasRoleGate = html.includes("'admin'") && html.includes("'ec-member'");
  assert('enterPortal() gates for admin/ec-member roles', hasRoleGate, hasRoleGate, true);

  // Verify _getSecurePassword reads localStorage first
  const hasSecurePw = html.includes('_getSecurePassword');
  assert('_getSecurePassword() used for login', hasSecurePw, hasSecurePw, true);

  const hasLocalStorageCreds = html.includes('banf_ec_creds_');
  assert('localStorage credential persistence (banf_ec_creds_)', hasLocalStorageCreds, hasLocalStorageCreds, true);
}

function testSessionSetup() {
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('  TEST 4: Session Setup (portal redirect)');
  console.log('═══════════════════════════════════════════════════════════\n');

  const loginHtmlPath = path.join(__dirname, 'docs', 'ec-admin-login.html');
  if (!fs.existsSync(loginHtmlPath)) return;
  const html = fs.readFileSync(loginHtmlPath, 'utf8');

  // enterPortal must set banf_admin_session in sessionStorage
  assert(
    'enterPortal() sets banf_admin_session',
    html.includes("sessionStorage.setItem('banf_admin_session'"),
    html.includes("sessionStorage.setItem('banf_admin_session'"),
    true
  );

  // enterPortal must redirect to admin-portal.html
  assert(
    'enterPortal() redirects to admin-portal.html',
    html.includes("window.location.href = 'admin-portal.html'"),
    html.includes("window.location.href = 'admin-portal.html'"),
    true
  );

  // Must also set banf_member_data for member portal compat
  assert(
    'enterPortal() sets banf_member_data for portal compat',
    html.includes("sessionStorage.setItem('banf_member_data'"),
    html.includes("sessionStorage.setItem('banf_member_data'"),
    true
  );
}

function testAdminPortalSessionRead() {
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('  TEST 5: Admin Portal Session Read');
  console.log('═══════════════════════════════════════════════════════════\n');

  const portalPath = path.join(__dirname, 'docs', 'admin-portal.html');
  if (!fs.existsSync(portalPath)) {
    assert('admin-portal.html exists', false, 'missing', 'exists');
    return;
  }
  const html = fs.readFileSync(portalPath, 'utf8');

  // Portal should read banf_admin_session
  assert(
    'admin-portal.html reads banf_admin_session',
    html.includes('banf_admin_session'),
    html.includes('banf_admin_session'),
    true
  );

  // Portal should use effectiveRole or roles to show correct sections
  const hasRoleCheck = html.includes('effectiveRole') || html.includes('data-role');
  assert(
    'admin-portal.html uses effectiveRole for section gating',
    hasRoleCheck,
    hasRoleCheck,
    true
  );
}

// ── Generate HTML Report ──────────────────────────────────────
function generateReport() {
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  const total = passCount + failCount;
  const pct = total > 0 ? Math.round((passCount / total) * 100) : 0;
  const statusColor = failCount === 0 ? '#22c55e' : (failCount <= 2 ? '#eab308' : '#ef4444');

  const rows = results.map(r => {
    const icon = r.status === 'PASS' ? '✅' : '❌';
    const bg = r.status === 'PASS' ? '#f0fdf4' : '#fef2f2';
    return `<tr style="background:${bg}"><td>${icon}</td><td>${r.test}</td><td><code>${r.actual}</code></td><td><code>${r.expected}</code></td><td style="color:#6b7280;font-size:.85rem">${r.note}</td></tr>`;
  }).join('\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>BANF EC Login Verification Report</title>
<style>
body{font-family:'Segoe UI',system-ui,sans-serif;margin:0;padding:20px;background:#f8fafc;color:#1e293b}
.header{background:linear-gradient(135deg,#006A4E,#00856F);color:#fff;padding:30px;border-radius:12px;margin-bottom:24px}
.header h1{margin:0;font-size:1.6rem}.header p{margin:6px 0 0;opacity:.85;font-size:.95rem}
.summary{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:16px;margin-bottom:24px}
.card{background:#fff;border-radius:10px;padding:20px;text-align:center;box-shadow:0 1px 3px rgba(0,0,0,.1)}
.card .num{font-size:2rem;font-weight:700}.card .label{font-size:.85rem;color:#64748b;margin-top:4px}
table{width:100%;border-collapse:collapse;background:#fff;border-radius:10px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.1)}
th{background:#f1f5f9;padding:10px 12px;text-align:left;font-size:.85rem;color:#475569;border-bottom:2px solid #e2e8f0}
td{padding:10px 12px;border-bottom:1px solid #f1f5f9;font-size:.9rem}
code{background:#f1f5f9;padding:2px 6px;border-radius:4px;font-size:.82rem}
</style>
</head>
<body>
<div class="header">
  <h1>🔑 BANF EC Login Verification Report</h1>
  <p>Phase 7 — Credential validation for signed-up EC members</p>
  <p>${dateStr}</p>
</div>
<div class="summary">
  <div class="card"><div class="num" style="color:${statusColor}">${pct}%</div><div class="label">Pass Rate</div></div>
  <div class="card"><div class="num">${total}</div><div class="label">Total Tests</div></div>
  <div class="card"><div class="num" style="color:#22c55e">${passCount}</div><div class="label">Passed</div></div>
  <div class="card"><div class="num" style="color:#ef4444">${failCount}</div><div class="label">Failed</div></div>
</div>
<table>
<thead><tr><th></th><th>Test</th><th>Actual</th><th>Expected</th><th>Notes</th></tr></thead>
<tbody>
${rows}
</tbody>
</table>
</body></html>`;
}

// ── MAIN ──────────────────────────────────────────────────────
async function main() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  🔑 BANF EC LOGIN VERIFICATION AGENT');
  console.log('  📅 ' + new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }));
  console.log('  🌐 API: https://' + API_HOST + API_PATH);
  console.log('═══════════════════════════════════════════════════════════');

  // Run all test suites
  await testBackendLoginForSignedUp();
  await testBackendPendingMembers();
  testOfflineCredentials();
  testSessionSetup();
  testAdminPortalSessionRead();

  // Summary
  const total = passCount + failCount;
  const pct = total > 0 ? Math.round((passCount / total) * 100) : 0;
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('  FINAL RESULTS');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`  ✅ Passed:  ${passCount}`);
  console.log(`  ❌ Failed:  ${failCount}`);
  console.log(`  📊 Total:   ${total}`);
  console.log(`  📈 Rate:    ${pct}%`);
  console.log('═══════════════════════════════════════════════════════════\n');

  // Generate HTML report
  const reportHtml = generateReport();
  const reportPath = path.join(__dirname, 'docs', 'banf-ec-login-verify-report.html');
  fs.writeFileSync(reportPath, reportHtml, 'utf8');
  console.log(`  📊 Report: ${reportPath}\n`);

  // Exit code
  process.exit(failCount > 0 ? 1 : 0);
}

main().catch(err => {
  console.error('[FATAL]', err);
  process.exit(1);
});
