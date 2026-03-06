#!/usr/bin/env node
/**
 * Fix EC member backend state — finalize onboarding for members stuck
 * in onboardingComplete=false state in Wix AdminRoles collection.
 *
 * Flow:
 *   1. admin_verify_login  → get setupToken (returned when needsOnboarding=true)
 *   2. admin_set_password  → set password (if not already set)
 *   3. admin_onboard_complete → mark onboarding done
 */

const https = require('https');

const API_HOST = 'www.jaxbengali.org';
const API_PATH = '/_functions';
const SA_EMAIL = 'banfjax@gmail.com';

function httpsPost(endpoint, body, headers = {}) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const opts = {
      hostname: API_HOST, port: 443,
      path: `${API_PATH}/${endpoint}`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
        'x-user-email': SA_EMAIL,
        ...headers,
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

const MEMBERS_TO_FIX = [
  { email: 'ranadhir.ghosh@gmail.com', name: 'Dr. Ranadhir Ghosh', password: 'banf-super-2026' },
  { email: 'rajanya.ghosh@gmail.com', name: 'Rajanya Ghosh', password: 'banf-ec-2026' },
];

async function main() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  🔧 FIX EC BACKEND ONBOARDING STATE');
  console.log('  📅 ' + new Date().toLocaleDateString());
  console.log('═══════════════════════════════════════════════════════════\n');

  for (const member of MEMBERS_TO_FIX) {
    console.log(`\n── ${member.name} <${member.email}> ──`);

    // Step 1: Check current state
    console.log('  [1] Checking current state...');
    const loginCheck = await httpsPost('admin_verify_login', { email: member.email });
    console.log('      Status:', loginCheck.status);
    console.log('      Response:', JSON.stringify(loginCheck.data, null, 2));

    if (loginCheck.data?.success && !loginCheck.data?.needsOnboarding) {
      console.log('  ✅ Already active — no fix needed.');
      continue;
    }

    // Step 2: Get setup token (from needsOnboarding response or admin_signup_direct)
    let token = loginCheck.data?.setupToken;
    
    if (!token) {
      console.log('  [2] Getting setup token via admin_signup_direct...');
      const signupRes = await httpsPost('admin_signup_direct', { email: member.email });
      console.log('      Status:', signupRes.status);
      console.log('      Response:', JSON.stringify(signupRes.data, null, 2));
      token = signupRes.data?.setupToken;
    } else {
      console.log('  [2] Setup token from login response: ' + token.substring(0, 20) + '...');
    }

    if (!token) {
      console.log('  ❌ Cannot get setup token — manual DB fix required.');
      continue;
    }

    // Step 3: Set password
    console.log('  [3] Setting password...');
    const pwRes = await httpsPost('admin_set_password', {
      email: member.email,
      token: token,
      password: member.password,
    });
    console.log('      Status:', pwRes.status);
    console.log('      Response:', JSON.stringify(pwRes.data, null, 2));

    if (!pwRes.data?.success && !pwRes.data?.error?.includes('already')) {
      console.log('  ⚠️ Password set failed — continuing to onboard_complete anyway...');
    }

    // Step 4: Complete onboarding
    console.log('  [4] Marking onboarding complete...');
    const onboardRes = await httpsPost('admin_onboard_complete', {
      email: member.email,
      token: token,
    });
    console.log('      Status:', onboardRes.status);
    console.log('      Response:', JSON.stringify(onboardRes.data, null, 2));

    if (onboardRes.data?.success) {
      console.log('  ✅ Onboarding completed successfully!');
    } else {
      console.log('  ❌ Onboarding completion failed: ' + (onboardRes.data?.error || 'unknown'));
    }

    // Step 5: Verify login now works
    console.log('  [5] Verifying login...');
    const verifyRes = await httpsPost('admin_verify_login', {
      email: member.email,
      password: member.password,
    });
    console.log('      Status:', verifyRes.status);
    console.log('      Response:', JSON.stringify(verifyRes.data, null, 2));

    if (verifyRes.data?.success) {
      console.log('  ✅ LOGIN VERIFIED — ' + member.name + ' can now sign in!');
    } else {
      console.log('  ❌ LOGIN STILL FAILING: ' + (verifyRes.data?.error || 'unknown'));
    }

    await new Promise(r => setTimeout(r, 1000));
  }

  // Also check Partha's state (password mismatch)
  console.log('\n\n── Partha Mukhopadhyay <mukhopadhyay.partha@gmail.com> ──');
  console.log('  [!] Password mismatch — checking if account is functional...');
  
  const parthaCheck = await httpsPost('admin_verify_login', { email: 'mukhopadhyay.partha@gmail.com' });
  console.log('      Status:', parthaCheck.status);
  console.log('      Response:', JSON.stringify(parthaCheck.data, null, 2));

  if (parthaCheck.data?.needsOnboarding) {
    console.log('  ⚠️ ALSO needs onboarding finalization!');
    // Try the same fix flow
    let token = parthaCheck.data?.setupToken;
    if (!token) {
      const signupRes = await httpsPost('admin_signup_direct', { email: 'mukhopadhyay.partha@gmail.com' });
      token = signupRes.data?.setupToken;
    }
    if (token) {
      console.log('  [Fix] Setting password and completing onboarding...');
      await httpsPost('admin_set_password', { email: 'mukhopadhyay.partha@gmail.com', token, password: 'banf-ec-2026' });
      const onboardRes = await httpsPost('admin_onboard_complete', { email: 'mukhopadhyay.partha@gmail.com', token });
      console.log('      Onboard result:', JSON.stringify(onboardRes.data));
      
      const verifyRes = await httpsPost('admin_verify_login', { email: 'mukhopadhyay.partha@gmail.com', password: 'banf-ec-2026' });
      console.log('      Login verify:', JSON.stringify(verifyRes.data));
      if (verifyRes.data?.success) console.log('  ✅ Partha can now log in!');
    }
  } else if (parthaCheck.data?.noPassword) {
    console.log('  ℹ️ Legacy account without password — login allowed with noPassword flag');
  } else {
    console.log('  ℹ️ Account has password set — user needs to use the password they set during signup.');
    console.log('     If they forgot it, use "Forgot Password" flow on the login page.');
  }

  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('  DONE');
  console.log('═══════════════════════════════════════════════════════════\n');
}

main().catch(err => {
  console.error('[FATAL]', err);
  process.exit(1);
});
