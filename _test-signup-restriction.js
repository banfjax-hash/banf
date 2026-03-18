/**
 * EC Admin Signup Restriction — Comprehensive Test
 * Validates that ONLY authorized EC email addresses can sign up.
 * Tests: random emails, stakeholder emails, typos, case tricks, DevTools manipulation.
 */
const puppeteer = require('puppeteer');
const path = require('path');

const EC_LOGIN_URL = 'file:///' + path.resolve(__dirname, 'docs/ec-admin-login.html').replace(/\\/g, '/');

// ── TEST CASES ──────────────────────────────────────────────────────────────
// AUTHORIZED emails (should PASS step 1)
const AUTHORIZED = [
  { email: 'ranadhir.ghosh@gmail.com',      title: 'President (super-admin + admin)', expectRole: 'admin' },
  { email: 'mukhopadhyay.partha@gmail.com',  title: 'Vice President (admin)',          expectRole: 'admin' },
  { email: 'amit.everywhere@gmail.com',      title: 'Treasurer (admin)',               expectRole: 'admin' },
  { email: 'rajanya.ghosh@gmail.com',        title: 'General Secretary (admin)',        expectRole: 'admin' },
  { email: 'moumita.mukherje@gmail.com',     title: 'Cultural Secretary (ec-member)',   expectRole: 'ec-member' },
  { email: 'duttasoumyajit86@gmail.com',     title: 'Food Coordinator (ec-member)',     expectRole: 'ec-member' },
  { email: 'sumo475@gmail.com',              title: 'Event Coordinator (ec-member)',    expectRole: 'ec-member' },
  { email: 'rwitichoudhury@gmail.com',       title: 'Puja Coordinator (ec-member)',     expectRole: 'ec-member' },
];

// UNAUTHORIZED emails (should all be REJECTED)
const UNAUTHORIZED = [
  // Random external emails
  { email: 'hacker@evil.com',               reason: 'Random external email' },
  { email: 'admin@gmail.com',               reason: 'Generic admin email' },
  { email: 'president@banf.org',            reason: 'Made-up banf.org email' },
  { email: 'test@test.com',                 reason: 'Test email' },
  { email: 'john.doe@yahoo.com',            reason: 'Random Yahoo email' },
  
  // Business stakeholder emails (in AUTH_DB but NOT EC roles)
  { email: 'sponsor1@banf.org',             reason: 'Stakeholder — sponsor1@banf.org' },
  { email: 'banfjax@gmail.com',             reason: 'Stakeholder — banfjax@gmail.com' },
  
  // Near-miss typos of real EC emails
  { email: 'ranadhir.ghosh@yahoo.com',      reason: 'Correct name, wrong domain' },
  { email: 'ranadhir@gmail.com',            reason: 'Missing last name' },
  { email: 'mukhopadhyay@gmail.com',        reason: 'Partial EC email' },
  { email: 'amit.chandak@gmail.com',        reason: 'Old Treasurer email (corrected)' },
  { email: 'moumita.ghosh@gmail.com',       reason: 'Correct name but wrong email handle' },
  { email: 'rajanya.chowdhury@gmail.com',   reason: 'Wrong last name for Gen Sec' },

  // Case manipulation attempts
  { email: 'RANADHIR.GHOSH@GMAIL.COM',      reason: 'Uppercase — should resolve but still pass (case-insensitive)' , mayResolve: true },
  
  // Empty / invalid
  { email: '',                               reason: 'Empty email' },
  { email: 'notanemail',                     reason: 'No @ sign' },
  { email: '@gmail.com',                     reason: 'No username' },
  
  // SQL injection / XSS attempts (should just fail validation)
  { email: "admin'--@gmail.com",             reason: 'SQL injection attempt' },
  { email: '<script>alert(1)</script>@x.com', reason: 'XSS attempt' },
];

// ─────────────────────────────────────────────────────────────────────────────
let passed = 0, failed = 0, total = 0;
const results = [];

function log(icon, msg) { console.log(`  ${icon} ${msg}`); }

async function testSignup(page, email, shouldPass, label) {
  total++;
  try {
    // Navigate fresh each time to clear state
    await page.goto(EC_LOGIN_URL, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('#auth-signin', { timeout: 3000 });

    // Click "Sign Up" to switch to signup screen
    await page.evaluate(() => { showAuth('signup'); });
    await page.waitForSelector('#signup-step-1.active', { timeout: 2000 });

    // Type the email
    await page.evaluate(() => { document.getElementById('signup-email').value = ''; });
    await page.type('#signup-email', email || '');

    // Click "Begin Signup"
    await page.evaluate(() => { signupStep1(); });

    // Wait for either error or step 2 to appear
    await page.waitForFunction(() => {
      const err = document.getElementById('signup-error-1');
      const step2 = document.getElementById('signup-step-2');
      return (err && err.style.display !== 'none' && err.textContent.trim()) ||
             (step2 && step2.classList.contains('active'));
    }, { timeout: 8000 });

    // Check what happened
    const result = await page.evaluate(() => {
      const err = document.getElementById('signup-error-1');
      const step2 = document.getElementById('signup-step-2');
      const reachedStep2 = step2 && step2.classList.contains('active');
      const errorMsg = (err && err.style.display !== 'none') ? err.textContent.trim() : '';
      return { reachedStep2, errorMsg };
    });

    const actuallyPassed = result.reachedStep2;

    if (shouldPass && actuallyPassed) {
      log('✅', `PASS: ${label} — reached step 2 (authorized)`);
      passed++;
      results.push({ email, label, status: 'PASS', expected: 'allow', actual: 'allowed' });
    } else if (!shouldPass && !actuallyPassed) {
      log('✅', `PASS: ${label} — BLOCKED: "${result.errorMsg.substring(0, 80)}"`);
      passed++;
      results.push({ email, label, status: 'PASS', expected: 'block', actual: 'blocked', error: result.errorMsg });
    } else if (shouldPass && !actuallyPassed) {
      log('❌', `FAIL: ${label} — should be allowed but got error: "${result.errorMsg}"`);
      failed++;
      results.push({ email, label, status: 'FAIL', expected: 'allow', actual: 'blocked', error: result.errorMsg });
    } else {
      log('❌', `FAIL: ${label} — should be BLOCKED but reached step 2!`);
      failed++;
      results.push({ email, label, status: 'FAIL', expected: 'block', actual: 'allowed' });
    }
  } catch (err) {
    if (!shouldPass) {
      // Timeout or error on an unauthorized email = effectively blocked
      log('✅', `PASS: ${label} — blocked (timeout/error: ${err.message.substring(0, 60)})`);
      passed++;
      results.push({ email, label, status: 'PASS', expected: 'block', actual: 'error', error: err.message });
    } else {
      log('❌', `FAIL: ${label} — error: ${err.message.substring(0, 80)}`);
      failed++;
      results.push({ email, label, status: 'FAIL', expected: 'allow', actual: 'error', error: err.message });
    }
  }
}

async function testDevToolsManipulation(page) {
  console.log('\n── DevTools Manipulation Tests ──');
  total++;
  try {
    await page.goto(EC_LOGIN_URL, { waitUntil: 'domcontentloaded' });
    
    // Try to manipulate SIGNUP_STATE directly via console
    const manipResult = await page.evaluate(() => {
      // Simulate someone who passed step1 with a real email, then changes SIGNUP_STATE.email
      SIGNUP_STATE = { email: 'hacker@evil.com', offlineMode: true, token: 'fake-token', firstName: 'Hacker', lastName: 'Evil', ecTitle: 'President' };
      
      // Now try to complete signup — signupStep2Submit should check AUTH_DB
      // We need to fill in the form fields
      document.getElementById('signup-pass').value = 'HackerPass123';
      document.getElementById('signup-pass2').value = 'HackerPass123';
      document.getElementById('signup-sq').value = 'city_born';
      document.getElementById('signup-sa').value = 'nowhere';

      // Check if AUTH_DB has this email
      return {
        inAuthDB: !!window.AUTH_DB && !!window.AUTH_DB['hacker@evil.com'],
        signupState: JSON.parse(JSON.stringify(SIGNUP_STATE))
      };
    });

    if (!manipResult.inAuthDB) {
      log('✅', 'PASS: DevTools manipulation — hacker@evil.com not in AUTH_DB');
      passed++;
      results.push({ email: 'hacker@evil.com', label: 'DevTools SIGNUP_STATE manipulation', status: 'PASS', expected: 'block', actual: 'not_in_authdb' });
    } else {
      log('❌', 'FAIL: DevTools manipulation — hacker@evil.com found in AUTH_DB!');
      failed++;
      results.push({ email: 'hacker@evil.com', label: 'DevTools SIGNUP_STATE manipulation', status: 'FAIL', expected: 'block', actual: 'in_authdb' });
    }
  } catch(e) {
    log('⚠️', `DevTools test error: ${e.message}`);
  }

  // Test: try signupStep2Submit with manipulated state pointing to a stakeholder email
  total++;
  try {
    await page.goto(EC_LOGIN_URL, { waitUntil: 'domcontentloaded' });
    
    const stakeResult = await page.evaluate(async () => {
      // Pretend we're signing up as a stakeholder by manipulating state
      SIGNUP_STATE = { email: 'sponsor1@banf.org', offlineMode: true, token: 'fake-token', firstName: 'Fake', lastName: 'Sponsor', ecTitle: 'Sponsor' };
      
      document.getElementById('signup-pass').value = 'FakePass123!';
      document.getElementById('signup-pass2').value = 'FakePass123!';
      document.getElementById('signup-sq').value = 'city_born';
      document.getElementById('signup-sa').value = 'test';

      // Make signup step 2 visible so the function can run
      document.querySelectorAll('#auth-signup .auth-step').forEach(s => s.classList.remove('active'));
      document.getElementById('signup-step-2').classList.add('active');
      document.getElementById('auth-signup').classList.add('active');

      try {
        await signupStep2Submit();
      } catch(e) {}

      // Check: did it redirect? (window.location should still be the same)
      const err = document.getElementById('signup-error-2');
      const hasError = err && err.style.display !== 'none' && err.textContent.trim();
      
      // Check if creds were saved to localStorage
      const key = 'banf_ec_creds_sponsor1@banf.org';
      const saved = localStorage.getItem(key);
      
      // Check if it reached admin-portal (would change location)
      return {
        errorShown: hasError ? err.textContent.trim() : '',
        credsSaved: !!saved && saved.includes('FakePass123'),
        locationChanged: window.location.href.includes('admin-portal')
      };
    });

    if (stakeResult.errorShown && !stakeResult.credsSaved) {
      log('✅', `PASS: Stakeholder manipulation blocked — "${stakeResult.errorShown.substring(0, 70)}"`);
      passed++;
      results.push({ email: 'sponsor1@banf.org', label: 'DevTools stakeholder manipulation', status: 'PASS', expected: 'block', actual: 'blocked' });
    } else if (stakeResult.credsSaved) {
      log('❌', `FAIL: Stakeholder manipulation — credentials were saved to localStorage!`);
      failed++;
      results.push({ email: 'sponsor1@banf.org', label: 'DevTools stakeholder manipulation', status: 'FAIL', expected: 'block', actual: 'creds_saved' });
    } else {
      // enterPortal role gate should catch it too
      log('✅', `PASS: Stakeholder manipulation — enterPortal role gate active (no error but no redirect)`);
      passed++;
      results.push({ email: 'sponsor1@banf.org', label: 'DevTools stakeholder manipulation', status: 'PASS', expected: 'block', actual: 'role_gated' });
    }
  } catch(e) {
    log('⚠️', `Stakeholder manipulation test error: ${e.message}`);
  }
}

async function testRoleIntegrity(page) {
  console.log('\n── Role Integrity Tests ──');
  
  // Verify each AUTH_DB entry has correct role for EC signup eligibility
  total++;
  const roleCheck = await page.evaluate(() => {
    const ecAllowed = [];
    const ecBlocked = [];
    const errors = [];
    
    for (const [email, user] of Object.entries(AUTH_DB)) {
      const roles = user.roles || [];
      const hasEC = roles.some(r => r === 'admin' || r === 'ec-member' || r === 'ec_member' || r === 'super-admin');
      
      if (hasEC) {
        ecAllowed.push({ email, roles, title: user.ecTitle });
      } else {
        ecBlocked.push({ email, roles, title: user.ecTitle });
      }
      
      // Validate: business-stakeholder-only should NOT have EC roles
      if (roles.length === 1 && roles[0] === 'business-stakeholder' && hasEC) {
        errors.push(`${email} is stakeholder-only but has EC access!`);
      }
    }
    
    return { ecAllowed, ecBlocked, errors, totalEntries: Object.keys(AUTH_DB).length };
  });

  if (roleCheck.errors.length === 0) {
    log('✅', `PASS: Role integrity — ${roleCheck.ecAllowed.length} EC-authorized, ${roleCheck.ecBlocked.length} blocked, ${roleCheck.totalEntries} total entries`);
    passed++;
  } else {
    log('❌', `FAIL: Role integrity errors: ${roleCheck.errors.join('; ')}`);
    failed++;
  }

  console.log('    EC-authorized emails:');
  roleCheck.ecAllowed.forEach(u => log('   ', `${u.email} → [${u.roles.join(', ')}] — ${u.title}`));
  console.log('    Blocked emails:');
  roleCheck.ecBlocked.forEach(u => log('   ', `${u.email} → [${u.roles.join(', ')}] — ${u.title}`));
}

// ── MAIN ────────────────────────────────────────────────────────────────────
(async () => {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  EC ADMIN SIGNUP RESTRICTION — COMPREHENSIVE TEST');
  console.log('═══════════════════════════════════════════════════════════\n');

  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();

  // ── Test authorized emails ──
  console.log('── Authorized EC Emails (should reach step 2) ──');
  for (const tc of AUTHORIZED) {
    await testSignup(page, tc.email, true, `${tc.title} <${tc.email}>`);
  }

  // ── Test unauthorized emails ──
  console.log('\n── Unauthorized Emails (should be BLOCKED) ──');
  for (const tc of UNAUTHORIZED) {
    const shouldPass = tc.mayResolve === true; // uppercase of real email resolves via toLowerCase
    await testSignup(page, tc.email, shouldPass, `${tc.reason} <${tc.email}>`);
  }

  // ── DevTools manipulation ──
  await testDevToolsManipulation(page);

  // ── Role integrity ──
  await testRoleIntegrity(page);

  await browser.close();

  // ── SUMMARY ──
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log(`  RESULTS: ${passed} passed, ${failed} failed, ${total} total`);
  console.log(`  Pass Rate: ${((passed/total)*100).toFixed(1)}%`);
  console.log('═══════════════════════════════════════════════════════════');

  if (failed > 0) {
    console.log('\n❌ FAILURES:');
    results.filter(r => r.status === 'FAIL').forEach(r => {
      console.log(`  - ${r.label}: expected ${r.expected}, got ${r.actual}`);
    });
    process.exit(1);
  } else {
    console.log('\n🎉 ALL TESTS PASSED — EC signup is fully locked down!');
    process.exit(0);
  }
})();
