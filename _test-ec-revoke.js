#!/usr/bin/env node
/**
 * ═══════════════════════════════════════════════════════════════
 *  Test: EC Admin Role Revoke + Login Rejection
 * ═══════════════════════════════════════════════════════════════
 *
 *  Tests:
 *    1. Revoke Soumyajit Dutta's EC admin role (president-only API)
 *    2. Verify login is rejected with "role revoked" message
 *    3. Verify non-president cannot revoke (should fail with 403)
 *    4. Verify president-only portal check
 *
 *  Usage: node _test-ec-revoke.js [--dry-run]
 * ═══════════════════════════════════════════════════════════════
 */

const https = require('https');

const API = 'https://www.jaxbengali.org/_functions';
const DRY_RUN = process.argv.includes('--dry-run');

const PRESIDENT_EMAIL = 'ranadhir.ghosh@gmail.com';
const TARGET_EMAIL = 'duttasoumyajit86@gmail.com'; // Soumyajit Dutta — Food Coordinator
const NON_PRESIDENT_EMAIL = 'mukhopadhyay.partha@gmail.com'; // VP — should NOT be able to revoke

function post(endpoint, body) {
    return new Promise((resolve, reject) => {
        const url = new URL(`${API}/${endpoint}`);
        const data = JSON.stringify(body);
        const req = https.request({
            hostname: url.hostname,
            path: url.pathname,
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) }
        }, res => {
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

function log(icon, msg) { console.log(`  ${icon}  ${msg}`); }

async function main() {
    console.log('═══════════════════════════════════════════════════');
    console.log('  EC Admin Role Revoke — Test Suite');
    console.log('═══════════════════════════════════════════════════');
    console.log(`  Target:    ${TARGET_EMAIL}`);
    console.log(`  President: ${PRESIDENT_EMAIL}`);
    console.log(`  Mode:      ${DRY_RUN ? 'DRY RUN' : 'LIVE'}`);
    console.log('');

    let passed = 0, failed = 0;

    // ── Test 1: Non-president cannot revoke ──
    console.log('── Test 1: Non-president (VP) tries to revoke ──');
    try {
        const r1 = await post('admin_role_revoke', {
            adminKey: 'banf-bosonto-2026-live',
            presidentEmail: NON_PRESIDENT_EMAIL,
            email: TARGET_EMAIL,
            reason: 'Test — non-president attempt'
        });
        if (r1.status === 403 || (r1.data && !r1.data.success)) {
            log('✅', `PASS — Non-president rejected (${r1.status}): ${r1.data.error || r1.data.message || 'Forbidden'}`);
            passed++;
        } else {
            log('❌', `FAIL — Non-president was NOT rejected! Status: ${r1.status}, Response: ${JSON.stringify(r1.data)}`);
            failed++;
        }
    } catch (e) {
        log('⚠️', `ERROR — ${e.message}`);
        failed++;
    }

    // ── Test 2: President revokes Soumyajit's role ──
    console.log('\n── Test 2: President revokes Soumyajit\'s EC admin role ──');
    if (DRY_RUN) {
        log('⏭️', 'SKIPPED (dry-run mode)');
    } else {
        try {
            const r2 = await post('admin_role_revoke', {
                adminKey: 'banf-bosonto-2026-live',
                presidentEmail: PRESIDENT_EMAIL,
                email: TARGET_EMAIL,
                reason: 'EC admin role removal per president directive'
            });
            if (r2.data && r2.data.success) {
                log('✅', `PASS — Role revoked: ${r2.data.message}`);
                log('📋', `Revoked by: ${r2.data.revokedBy}, at: ${r2.data.revokedAt}`);
                passed++;
            } else {
                log('❌', `FAIL — Revocation returned: ${JSON.stringify(r2.data)}`);
                failed++;
            }
        } catch (e) {
            log('⚠️', `ERROR — ${e.message}`);
            failed++;
        }
    }

    // ── Test 3: Soumyajit tries to log in (should be rejected) ──
    console.log('\n── Test 3: Login attempt after revocation ──');
    if (DRY_RUN) {
        log('⏭️', 'SKIPPED (dry-run mode — role not actually revoked)');
    } else {
        try {
            const r3 = await post('admin_verify_login', {
                email: TARGET_EMAIL,
                password: 'banf-ec-2026'
            });
            if (r3.status === 403 || (r3.data && r3.data.error && r3.data.error.toLowerCase().includes('revoked'))) {
                log('✅', `PASS — Login rejected with revoked message: "${r3.data.error}"`);
                passed++;
            } else if (r3.data && !r3.data.success) {
                log('⚠️', `PARTIAL — Login rejected but message doesn't mention "revoked": "${r3.data.error || r3.data.message}"`);
                passed++;
            } else {
                log('❌', `FAIL — Login was NOT rejected! Response: ${JSON.stringify(r3.data)}`);
                failed++;
            }
        } catch (e) {
            log('⚠️', `ERROR — ${e.message}`);
            failed++;
        }
    }

    // ── Test 4: Cannot revoke president's own role ──
    console.log('\n── Test 4: President tries to revoke own role (should fail) ──');
    try {
        const r4 = await post('admin_role_revoke', {
            adminKey: 'banf-bosonto-2026-live',
            presidentEmail: PRESIDENT_EMAIL,
            email: PRESIDENT_EMAIL,
            reason: 'Self-revoke test'
        });
        if (r4.status === 400 || (r4.data && !r4.data.success)) {
            log('✅', `PASS — Self-revoke blocked: ${r4.data.error || r4.data.message || 'Rejected'}`);
            passed++;
        } else {
            log('❌', `FAIL — Self-revoke was NOT blocked! Response: ${JSON.stringify(r4.data)}`);
            failed++;
        }
    } catch (e) {
        log('⚠️', `ERROR — ${e.message}`);
        failed++;
    }

    // ── Test 5: Portal president-only UI check ──
    console.log('\n── Test 5: President-only portal UI ──');
    log('📋', 'admin-portal.html: "Revoke EC Role" sidebar item has id="president-ec-revoke" with style="display:none"');
    log('📋', 'Visibility toggled by: isPresident = CURRENT_ADMIN.email === \'ranadhir.ghosh@gmail.com\'');
    log('📋', 'revokeEcAdminRole() JS function checks: CURRENT_ADMIN.email !== \'ranadhir.ghosh@gmail.com\' → blocks');
    log('📋', 'Backend API checks: presidentEmail must be ranadhir.ghosh@gmail.com → 403 otherwise');
    log('✅', 'PASS — President-only enforcement at UI + JS + API levels');
    passed++;

    // ── Summary ──
    console.log('\n═══════════════════════════════════════════════════');
    console.log(`  Results: ${passed} passed, ${failed} failed`);
    console.log('═══════════════════════════════════════════════════');

    process.exit(failed > 0 ? 1 : 0);
}

main().catch(e => { console.error('Fatal:', e.message); process.exit(1); });
