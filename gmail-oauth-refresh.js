#!/usr/bin/env node
/**
 * gmail-oauth-refresh.js — Generate a new Gmail OAuth2 refresh token
 * 
 * The BANF email reader agent's refresh token expires every 7 days because
 * the Google Cloud project consent screen is in Testing mode.
 * 
 * TWO MODES:
 *   Mode A (default): Google OAuth Playground approach — opens playground
 *     in browser, user authorizes, pastes the auth code back here.
 *   Mode B (--manual): Manual URL approach — generates an auth URL,
 *     user copies the code from the redirect URL's query string.
 *   Mode C (--code=XXXX): Direct code exchange — skip browser entirely,
 *     just exchange a pre-obtained authorization code.
 * 
 * Usage:
 *   node gmail-oauth-refresh.js              (Playground mode — recommended)
 *   node gmail-oauth-refresh.js --manual     (Manual URL + code paste)
 *   node gmail-oauth-refresh.js --code=4/xxx (Exchange a code directly)
 *   node gmail-oauth-refresh.js --no-update  (Don't auto-update the agent file)
 * 
 * Requirements:
 *   - Must log in as banfjax@gmail.com in the browser
 */

const https = require('https');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

// ── Config (same as bosonto-email-reader-agent.js) ──
const CLIENT_ID = '1020178199135-3usrl611ara38i7rhu2ub6sn6g1150ml.apps.googleusercontent.com';
const CLIENT_SECRET = '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';
// Google OAuth Playground Client (used as fallback)
const PLAYGROUND_CLIENT_ID = '407408718192.apps.googleusercontent.com';
const PLAYGROUND_SECRET = 'kd-_2_AUosoGGTNYyMJiFL3j';

const SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/gmail.modify'
].join(' ');

const AGENT_FILE = path.join(__dirname, 'bosonto-email-reader-agent.js');

// The Google OAuth Playground has a fixed redirect URI that is always registered
const PLAYGROUND_REDIRECT = 'https://developers.google.com/oauthplayground';

// ── CLI Args ──
const args = process.argv.slice(2);
const NO_UPDATE = args.includes('--no-update');
const MANUAL = args.includes('--manual');
const codeArg = args.find(a => a.startsWith('--code='));
const DIRECT_CODE = codeArg ? codeArg.split('=').slice(1).join('=') : null;

// ── HTTPS helper ──
function httpsRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const opts = {
      hostname: u.hostname, port: 443,
      path: u.pathname + u.search,
      method: options.method || 'GET',
      headers: options.headers || {},
      timeout: 30000
    };
    const req = https.request(opts, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(data) }); }
        catch { resolve({ status: res.statusCode, data }); }
      });
    });
    req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
    req.on('error', reject);
    if (options.body) req.write(options.body);
    req.end();
  });
}

// ── Prompt user for input ──
function prompt(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => {
    rl.question(question, answer => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

// ── Exchange auth code for tokens ──
async function exchangeCode(code, clientId, clientSecret, redirectUri) {
  const body = new URLSearchParams({
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
    grant_type: 'authorization_code'
  }).toString();

  const resp = await httpsRequest('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Content-Length': Buffer.byteLength(body)
    },
    body
  });

  return resp.data;
}

// ── Update agent file with new refresh token ──
function updateAgentFile(newRefreshToken) {
  if (!fs.existsSync(AGENT_FILE)) {
    console.log(`\n⚠️  Agent file not found: ${AGENT_FILE}`);
    return false;
  }

  let content = fs.readFileSync(AGENT_FILE, 'utf8');
  const pattern = /const GOOGLE_REFRESH_TOKEN = '[^']+'/;
  if (!pattern.test(content)) {
    console.log('\n⚠️  Could not find GOOGLE_REFRESH_TOKEN in agent file');
    return false;
  }

  content = content.replace(pattern, `const GOOGLE_REFRESH_TOKEN = '${newRefreshToken}'`);
  fs.writeFileSync(AGENT_FILE, content);
  console.log(`\n✅ Updated ${path.basename(AGENT_FILE)} with new refresh token`);
  return true;
}

// ── Test the new token ──
async function testToken(accessToken) {
  try {
    const resp = await httpsRequest(
      'https://gmail.googleapis.com/gmail/v1/users/me/profile',
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    if (resp.data.emailAddress) {
      console.log(`✅ Token works! Connected as: ${resp.data.emailAddress}`);
      console.log(`   Total messages: ${resp.data.messagesTotal}`);
      return true;
    } else {
      console.log(`❌ Token test failed: ${JSON.stringify(resp.data).substring(0, 200)}`);
    }
  } catch (e) {
    console.log(`❌ Token test failed: ${e.message}`);
  }
  return false;
}

// ── Open URL in default browser (cross-platform) ──
function openBrowser(url) {
  const plat = process.platform;
  if (plat === 'win32') exec(`start "" "${url}"`);
  else if (plat === 'darwin') exec(`open "${url}"`);
  else exec(`xdg-open "${url}"`);
}

// ── Process tokens result ──
async function processTokens(tokens) {
  console.log('\n═══════════════════════════════════════════');
  console.log('  TOKEN DETAILS');
  console.log('═══════════════════════════════════════════');
  console.log(`  Access token:  ${tokens.access_token ? tokens.access_token.substring(0, 30) + '...' : 'MISSING'}`);
  console.log(`  Refresh token: ${tokens.refresh_token ? tokens.refresh_token.substring(0, 30) + '...' : 'MISSING'}`);
  console.log(`  Expires in:    ${tokens.expires_in}s`);
  console.log(`  Scope:         ${tokens.scope || 'N/A'}`);
  console.log('═══════════════════════════════════════════');

  if (!tokens.refresh_token) {
    console.log('\n⚠️  No refresh token returned! This happens if consent was not re-prompted.');
    console.log('   Try revoking access at https://myaccount.google.com/permissions');
    console.log('   Then run this script again.');
    return false;
  }

  // Verify the token works
  if (tokens.access_token) {
    await testToken(tokens.access_token);
  }

  // Full refresh token for the user to copy
  console.log(`\n🔑 FULL REFRESH TOKEN:\n   ${tokens.refresh_token}`);

  // Update agent file
  if (!NO_UPDATE) {
    updateAgentFile(tokens.refresh_token);

    // Also save to a backup file
    const backup = {
      refreshToken: tokens.refresh_token,
      createdAt: new Date().toISOString(),
      expiresNote: 'Refresh tokens in Testing mode expire after 7 days. Run this script again to refresh.',
      clientId: CLIENT_ID
    };
    fs.writeFileSync(path.join(__dirname, 'gmail-oauth-token-backup.json'), JSON.stringify(backup, null, 2));
    console.log('📄 Token backup saved to gmail-oauth-token-backup.json');
  } else {
    console.log('\n⚠️  --no-update flag set. Agent file NOT updated.');
    console.log('   Manually update GOOGLE_REFRESH_TOKEN in bosonto-email-reader-agent.js');
  }

  console.log('\n✅ Done! The email reader agent can now access Gmail.');
  console.log('   Restart the agent: node bosonto-email-reader-agent.js --poll');
  console.log('');
  console.log('   ⏰ REMINDER: Token expires in ~7 days (Testing mode).');
  console.log('   To avoid this, publish the Google Cloud consent screen to "Production".');
  return true;
}

// ═══════════════════════════════════════════════════════════════
// PLAYGROUND MODE (default) — Uses Google OAuth Playground
// ═══════════════════════════════════════════════════════════════

async function playgroundMode() {
  console.log('📋 MODE: Google OAuth Playground\n');
  console.log('This uses the OAuth Playground (developers.google.com/oauthplayground)');
  console.log('to generate a new refresh token.\n');
  console.log('STEPS:');
  console.log('  1. A browser will open to the OAuth Playground');
  console.log('  2. Click the ⚙️ gear icon (top-right) → check "Use your own OAuth credentials"');
  console.log(`     Client ID:     ${CLIENT_ID}`);
  console.log(`     Client Secret: ${CLIENT_SECRET}`);
  console.log('  3. In the left panel, find "Gmail API v1" and select:');
  console.log('     • https://mail.google.com/');
  console.log('     (or type the scope URL in the input box)');
  console.log('  4. Click "Authorize APIs" → Sign in as banfjax@gmail.com → Allow');
  console.log('  5. You\'ll be redirected back to the Playground with an "Authorization Code"');
  console.log('  6. Click "Exchange authorization code for tokens"');
  console.log('  7. Copy the REFRESH TOKEN from the response\n');

  openBrowser('https://developers.google.com/oauthplayground');

  const refreshToken = await prompt('🔑 Paste the REFRESH TOKEN here: ');

  if (!refreshToken) {
    console.log('\n❌ No token provided.');
    return false;
  }

  // Test the refresh token by trying to get an access token
  console.log('\n🔄 Verifying refresh token...');
  
  // Try with project credentials first, then playground credentials
  const credSets = [
    ['Project', CLIENT_ID, CLIENT_SECRET],
    ['Playground', PLAYGROUND_CLIENT_ID, PLAYGROUND_SECRET]
  ];

  for (const [name, cid, csec] of credSets) {
    const body = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: cid,
      client_secret: csec
    }).toString();

    const resp = await httpsRequest('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Content-Length': Buffer.byteLength(body) },
      body
    });

    if (resp.data.access_token) {
      console.log(`✅ Refresh token valid (using ${name} credentials)`);
      
      // Synthesize a tokens object for processTokens
      return processTokens({
        access_token: resp.data.access_token,
        refresh_token: refreshToken,
        expires_in: resp.data.expires_in,
        scope: resp.data.scope
      });
    }
  }

  console.log('❌ Could not verify the refresh token with either credential set.');
  console.log('   Make sure you used the correct Client ID/Secret in the Playground settings.');

  // Still offer to save it
  const save = await prompt('Save it anyway? (y/N): ');
  if (save.toLowerCase() === 'y') {
    return processTokens({ refresh_token: refreshToken });
  }
  return false;
}

// ═══════════════════════════════════════════════════════════════
// MANUAL MODE — Generate auth URL, user copies code from redirect
// ═══════════════════════════════════════════════════════════════

async function manualMode() {
  console.log('📋 MODE: Manual Authorization Code\n');

  // Use playground redirect URI since it's always registered
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    redirect_uri: PLAYGROUND_REDIRECT,
    response_type: 'code',
    scope: SCOPES,
    access_type: 'offline',
    prompt: 'consent',
    login_hint: 'banfjax@gmail.com'
  });
  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;

  console.log('STEPS:');
  console.log('  1. Open this URL in your browser:');
  console.log(`     ${authUrl}\n`);
  console.log('  2. Sign in as banfjax@gmail.com and allow access');
  console.log('  3. You\'ll be redirected to the OAuth Playground');
  console.log('  4. Copy the "code" parameter from the URL bar:');
  console.log('     https://developers.google.com/oauthplayground?code=4/XXXX...\n');

  openBrowser(authUrl);

  const code = await prompt('📥 Paste the authorization code here: ');

  if (!code) {
    console.log('\n❌ No code provided.');
    return false;
  }

  console.log('\n🔄 Exchanging code for tokens...');
  const tokens = await exchangeCode(code, CLIENT_ID, CLIENT_SECRET, PLAYGROUND_REDIRECT);

  if (tokens.error) {
    console.log(`\n❌ Token exchange failed: ${tokens.error_description || tokens.error}`);
    return false;
  }

  return processTokens(tokens);
}

// ═══════════════════════════════════════════════════════════════
// DIRECT CODE MODE — Exchange pre-obtained code
// ═══════════════════════════════════════════════════════════════

async function directCodeMode(code) {
  console.log('📋 MODE: Direct Code Exchange\n');
  console.log('🔄 Exchanging code for tokens...');

  // Try with playground redirect URI
  let tokens = await exchangeCode(code, CLIENT_ID, CLIENT_SECRET, PLAYGROUND_REDIRECT);

  if (tokens.error) {
    console.log(`   Playground redirect failed: ${tokens.error_description || tokens.error}`);
    console.log('   Trying other redirect URIs...');
    
    // Try common redirect URIs
    const uris = [
      'http://localhost',
      'http://localhost:3847/oauth/callback',
      'urn:ietf:wg:oauth:2.0:oob'
    ];
    for (const uri of uris) {
      tokens = await exchangeCode(code, CLIENT_ID, CLIENT_SECRET, uri);
      if (!tokens.error) break;
    }
  }

  if (tokens.error) {
    console.log(`\n❌ Token exchange failed: ${tokens.error_description || tokens.error}`);
    return false;
  }

  return processTokens(tokens);
}

// ── Main ──
async function main() {
  console.log('╔══════════════════════════════════════════════════════╗');
  console.log('║   BANF Gmail OAuth2 Token Refresh                   ║');
  console.log('╚══════════════════════════════════════════════════════╝');
  console.log('');

  if (DIRECT_CODE) {
    return directCodeMode(DIRECT_CODE);
  } else if (MANUAL) {
    return manualMode();
  } else {
    return playgroundMode();
  }
}

main().then(success => {
  process.exit(success ? 0 : 1);
}).catch(e => {
  console.error(`\n❌ Fatal error: ${e.message}`);
  process.exit(1);
});
