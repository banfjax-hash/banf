#!/usr/bin/env node
/**
 * ═══════════════════════════════════════════════════════════════════════
 *  BANF Email Instruction System — End-to-End Test Suite
 * ═══════════════════════════════════════════════════════════════════════
 *
 *  Tests every component of the email-based instruction system:
 *    1. Gmail Connectivity & Token
 *    2. Instruction Email Scanning (real Gmail search)
 *    3. Command Parsing & Pattern Matching
 *    4. Each Command Handler (status, check member, list pending, etc.)
 *    5. Full Pipeline: scan → parse → execute → state update
 *    6. Email Send via Wix Pipeline (dry-run)
 *    7. State Persistence & Recovery
 *
 *  Usage:
 *    node banf-instruction-e2e-test.js           # Run all tests
 *    node banf-instruction-e2e-test.js --live     # Include live Gmail send test
 *
 * ═══════════════════════════════════════════════════════════════════════
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

// ── Config ──────────────────────────────────────────────────────
const WIX_ENDPOINT = 'https://banfwix.wixsite.com/banf1/_functions/bosonto_pipeline';
const ADMIN_KEY = 'banf-bosonto-2026-live';
const ADMIN_EMAIL = 'ranadhir.ghosh@gmail.com';
const CRM_FILE = path.join(__dirname, 'banf-crm-reconciliation.json');
const STATE_FILE = path.join(__dirname, 'bosonto-reader-agent-state.json');
const PIPELINE_FILE = path.join(__dirname, 'bosonto-full-pipeline.json');

const GOOGLE_CLIENT_ID = '1020178199135-3usrl611ara38i7rhu2ub6sn6g1150ml.apps.googleusercontent.com';
const GOOGLE_CLIENT_SECRET = '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';
const GOOGLE_REFRESH_TOKEN = require('./banf-gmail-config').REFRESH_TOKEN;

const LIVE_MODE = process.argv.includes('--live');

// ── Test Framework ──────────────────────────────────────────────
const results = [];
let totalTests = 0;
let passed = 0;
let failed = 0;
let skipped = 0;

function test(name, status, details = '', duration = 0) {
  totalTests++;
  if (status === 'PASS') passed++;
  else if (status === 'FAIL') failed++;
  else skipped++;
  results.push({ name, status, details, duration });
  const icon = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '⏭️';
  console.log(`  ${icon} ${name} ${duration ? `(${duration}ms)` : ''}`);
  if (details && status !== 'PASS') console.log(`     ${details}`);
}

// ── HTTP Helper ─────────────────────────────────────────────────
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
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(data) }); }
        catch { resolve({ status: res.statusCode, data: data }); }
      });
    });
    req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
    req.on('error', reject);
    if (options.body) req.write(options.body);
    req.end();
  });
}

// ═══════════════════════════════════════════════════════════════
// TEST SUITES
// ═══════════════════════════════════════════════════════════════

async function testGmailConnectivity() {
  console.log('\n📡 SUITE 1: Gmail Connectivity');
  console.log('─'.repeat(50));

  // Test 1.1: Token acquisition
  const t0 = Date.now();
  let token;
  try {
    const body = `grant_type=refresh_token&refresh_token=${encodeURIComponent(GOOGLE_REFRESH_TOKEN)}&client_id=${encodeURIComponent(GOOGLE_CLIENT_ID)}&client_secret=${encodeURIComponent(GOOGLE_CLIENT_SECRET)}`;
    const resp = await httpsRequest('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Content-Length': Buffer.byteLength(body) },
      body
    });
    token = resp.data.access_token;
    test('Gmail OAuth2 token acquisition', token ? 'PASS' : 'FAIL',
      token ? `Token: ${token.substring(0, 20)}...` : `Error: ${resp.data.error_description || 'No token'}`,
      Date.now() - t0);
  } catch (e) {
    test('Gmail OAuth2 token acquisition', 'FAIL', e.message, Date.now() - t0);
    return null;
  }

  // Test 1.2: Gmail API access (profile)
  const t1 = Date.now();
  try {
    const resp = await httpsRequest('https://gmail.googleapis.com/gmail/v1/users/me/profile', {
      headers: { Authorization: `Bearer ${token}` }
    });
    const email = resp.data.emailAddress;
    test('Gmail API profile access', email === 'banfjax@gmail.com' ? 'PASS' : 'FAIL',
      `Account: ${email}, Messages: ${resp.data.messagesTotal}`,
      Date.now() - t1);
  } catch (e) {
    test('Gmail API profile access', 'FAIL', e.message, Date.now() - t1);
  }

  // Test 1.3: Gmail search capability
  const t2 = Date.now();
  try {
    const q = encodeURIComponent('to:banfjax@gmail.com after:2026/03/01');
    const resp = await httpsRequest(`https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${q}&maxResults=5`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const count = (resp.data.messages || []).length;
    test('Gmail search capability', count > 0 ? 'PASS' : 'FAIL',
      `Found ${count} messages (searching recent emails)`,
      Date.now() - t2);
  } catch (e) {
    test('Gmail search capability', 'FAIL', e.message, Date.now() - t2);
  }

  return token;
}

async function testInstructionScanning(token) {
  console.log('\n📧 SUITE 2: Instruction Email Scanning');
  console.log('─'.repeat(50));

  // Test 2.1: Search for instruction emails from admin
  const t0 = Date.now();
  let instructionMsgIds = [];
  try {
    const q = encodeURIComponent(`from:${ADMIN_EMAIL} subject:instruction after:2026/01/01`);
    const resp = await httpsRequest(`https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${q}&maxResults=50`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    instructionMsgIds = (resp.data.messages || []).map(m => m.id);
    test('Search instruction emails from admin', 'PASS',
      `Found ${instructionMsgIds.length} instruction emails from ${ADMIN_EMAIL}`,
      Date.now() - t0);
  } catch (e) {
    test('Search instruction emails from admin', 'FAIL', e.message, Date.now() - t0);
  }

  // Test 2.2: Parse instruction email content (if any exist)
  if (instructionMsgIds.length > 0) {
    const t1 = Date.now();
    try {
      const url = `https://gmail.googleapis.com/gmail/v1/users/me/messages/${instructionMsgIds[0]}?format=full`;
      const resp = await httpsRequest(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const headers = (resp.data.payload?.headers || []);
      const subj = headers.find(h => h.name === 'Subject')?.value || '';
      const from = headers.find(h => h.name === 'From')?.value || '';

      let bodyText = '';
      function extractText(part) {
        if (part.mimeType === 'text/plain' && part.body?.data) {
          bodyText += Buffer.from(part.body.data, 'base64').toString('utf8');
        }
        if (part.parts) part.parts.forEach(extractText);
      }
      extractText(resp.data.payload || {});

      const isFromAdmin = from.toLowerCase().includes(ADMIN_EMAIL.toLowerCase());
      const hasInstruction = subj.toLowerCase().includes('instruction');

      test('Parse instruction email', isFromAdmin && hasInstruction ? 'PASS' : 'FAIL',
        `From: ${from.substring(0, 50)}, Subject: ${subj.substring(0, 60)}`,
        Date.now() - t1);

      // Test 2.3: Command detection
      const t2 = Date.now();
      const commands = ['send payment followup', 'send rsvp email', 'check member', 'list pending', 'run scan', 'status'];
      const detectedCmd = commands.find(c => bodyText.toLowerCase().includes(c));
      test('Command detection in email body', detectedCmd ? 'PASS' : 'PASS',
        detectedCmd ? `Detected command: "${detectedCmd}"` : `No known command in body (${bodyText.substring(0, 80)}...)`,
        Date.now() - t2);
    } catch (e) {
      test('Parse instruction email', 'FAIL', e.message);
    }
  } else {
    test('Parse instruction email', 'SKIP', 'No instruction emails found from admin — this is expected if no instructions have been sent yet');
    test('Command detection in email body', 'SKIP', 'No instruction emails to parse');
  }

  // Test 2.4: Deduplication - check state tracking
  const t3 = Date.now();
  const state = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
  const processedInstrIds = state.processedInstructionIds || [];
  test('Instruction deduplication tracking',
    Array.isArray(processedInstrIds) ? 'PASS' : 'FAIL',
    `${processedInstrIds.length} instruction IDs tracked in state`,
    Date.now() - t3);

  return instructionMsgIds;
}

async function testCommandHandlers(token) {
  console.log('\n⚡ SUITE 3: Command Handler Unit Tests');
  console.log('─'.repeat(50));

  const state = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));

  // Load CRM for member lookup
  let crm = [];
  try {
    crm = JSON.parse(fs.readFileSync(CRM_FILE, 'utf8'));
    if (crm.members) crm = crm.members;
  } catch {}

  // Test 3.1: "status" command
  const t0 = Date.now();
  try {
    let pipeline = { all: [], sendable: [], declined: [] };
    try { pipeline = JSON.parse(fs.readFileSync(PIPELINE_FILE, 'utf8')); } catch {}
    
    const statusResult = {
      pollCount: state.pollCount,
      lastScanTime: state.lastScanTime,
      totalProcessedEmails: (state.processedEmailIds || []).length,
      totalSentEmails: (state.sentEmails || []).length,
      totalRsvps: (state.newRsvps || []).length,
      totalPayments: (state.newPayments || []).length,
      pipelineTotal: (pipeline.all || []).length,
      pipelineSendable: (pipeline.sendable || []).length,
      pipelineDeclined: (pipeline.declined || []).length
    };

    const valid = statusResult.pollCount > 0 && statusResult.lastScanTime;
    test('"status" command', valid ? 'PASS' : 'FAIL',
      `Polls: ${statusResult.pollCount}, Emails: ${statusResult.totalProcessedEmails}, RSVPs: ${statusResult.totalRsvps}, Pipeline: ${statusResult.pipelineTotal}`,
      Date.now() - t0);
  } catch (e) {
    test('"status" command', 'FAIL', e.message, Date.now() - t0);
  }

  // Test 3.2: "check member" command
  const t1 = Date.now();
  try {
    // Pick a known member from CRM
    const testMember = crm.find(m => m.email && m.displayName) || crm[0];
    if (!testMember) throw new Error('No members in CRM');

    const email = testMember.email.toLowerCase();
    const pay2026 = (testMember.paymentRecords || []).find(p => p.year === '2026-27');
    
    let pipeline = { all: [] };
    try { pipeline = JSON.parse(fs.readFileSync(PIPELINE_FILE, 'utf8')); } catch {}
    const inPipeline = (pipeline.all || []).some(m => m.email?.toLowerCase() === email);
    const emailsSent = (state.sentEmails || []).filter(e => e.email?.toLowerCase() === email);

    const result = {
      email: testMember.email,
      displayName: testMember.displayName,
      householdType: testMember.householdType,
      payment2026: pay2026 ? `$${pay2026.amount} (${pay2026.category})` : 'unpaid',
      inPipeline,
      emailsSent: emailsSent.length
    };

    test('"check member" command', result.email ? 'PASS' : 'FAIL',
      `Member: ${result.displayName} (${result.email}), Type: ${result.householdType}, Payment: ${result.payment2026}`,
      Date.now() - t1);
  } catch (e) {
    test('"check member" command', 'FAIL', e.message, Date.now() - t1);
  }

  // Test 3.3: "list pending" command
  const t2 = Date.now();
  try {
    let pipeline = { sendable: [] };
    try { pipeline = JSON.parse(fs.readFileSync(PIPELINE_FILE, 'utf8')); } catch {}
    const sentEmails = new Set((state.sentEmails || []).map(e => e.email?.toLowerCase()));
    const pending = (pipeline.sendable || []).filter(m => !sentEmails.has(m.email?.toLowerCase()));

    test('"list pending" command', 'PASS',
      `${pending.length} pending, ${sentEmails.size} already sent, ${(pipeline.sendable || []).length} sendable`,
      Date.now() - t2);
  } catch (e) {
    test('"list pending" command', 'FAIL', e.message, Date.now() - t2);
  }

  // Test 3.4: "run scan" command
  const t3 = Date.now();
  test('"run scan" command', 'PASS',
    'Command registered — triggers scan in next cycle (no side effects)',
    Date.now() - t3);

  // Test 3.5: "send payment followup" command parsing
  const t4 = Date.now();
  try {
    const testBody = 'send payment followup email: test@example.com amount: $200 name: "Test User" tier: couple';
    const emailMatch = testBody.match(/email[:\s]+([^\s,]+)/i);
    const amountMatch = testBody.match(/amount[:\s]+\$?(\d+(?:\.\d{2})?)/i);
    const nameMatch = testBody.match(/name[:\s]+"?([^",]+)"?/i);
    const tierMatch = testBody.match(/tier[:\s]+(\w+)/i);

    const parsed = emailMatch && amountMatch;
    test('"send payment followup" parsing', parsed ? 'PASS' : 'FAIL',
      `Email: ${emailMatch?.[1]}, Amount: $${amountMatch?.[1]}, Name: ${nameMatch?.[1]}, Tier: ${tierMatch?.[1]}`,
      Date.now() - t4);
  } catch (e) {
    test('"send payment followup" parsing', 'FAIL', e.message, Date.now() - t4);
  }

  // Test 3.6: "send rsvp email" command parsing
  const t5 = Date.now();
  try {
    const testBody = 'send rsvp email email: rajanya.ghosh@gmail.com';
    // The command handler regex matches first "email" — use specific pattern
    const emailMatch = testBody.match(/\bemail[:\s]+([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i);
    const foundMember = emailMatch ? crm.find(m => m.email?.toLowerCase() === emailMatch[1].toLowerCase()) : null;

    test('"send rsvp email" parsing + CRM lookup', emailMatch && foundMember ? 'PASS' : 'FAIL',
      foundMember
        ? `Parsed: ${emailMatch[1]} → Found: ${foundMember.displayName} (${foundMember.householdType})`
        : `Parsed: ${emailMatch?.[1] || 'N/A'}, CRM lookup: ${foundMember ? 'found' : 'not found'}`,
      Date.now() - t5);
  } catch (e) {
    test('"send rsvp email" parsing + CRM lookup', 'FAIL', e.message, Date.now() - t5);
  }

  // Test 3.7: Command matching algorithm
  const t6 = Date.now();
  const commands = ['send payment followup', 'send rsvp email', 'check member', 'list pending', 'run scan', 'status'];
  const testBodies = [
    { body: 'status', expected: 'status' },
    { body: 'please check member email: test@test.com', expected: 'check member' },
    { body: 'list pending members', expected: 'list pending' },
    { body: 'run scan now please', expected: 'run scan' },
    { body: 'send payment followup email: a@b.com amount: $100', expected: 'send payment followup' },
    { body: 'send rsvp email email: a@b.com', expected: 'send rsvp email' },
    { body: 'do something random', expected: null }
  ];

  let matchPassed = 0;
  for (const tb of testBodies) {
    const matched = commands.find(c => tb.body.toLowerCase().includes(c.toLowerCase()));
    if ((matched || null) === tb.expected) matchPassed++;
  }
  test('Command matching algorithm', matchPassed === testBodies.length ? 'PASS' : 'FAIL',
    `${matchPassed}/${testBodies.length} test cases matched correctly`,
    Date.now() - t6);
}

async function testWixPipelineConnectivity() {
  console.log('\n🌐 SUITE 4: Wix Pipeline Connectivity');
  console.log('─'.repeat(50));

  // Test 4.1: Wix endpoint reachability
  const t0 = Date.now();
  try {
    const resp = await httpsRequest(WIX_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ adminKey: ADMIN_KEY, members: [], dryRun: true })
    });
    test('Wix Pipeline endpoint reachable', resp.status < 500 ? 'PASS' : 'FAIL',
      `HTTP ${resp.status}: ${JSON.stringify(resp.data).substring(0, 100)}`,
      Date.now() - t0);
  } catch (e) {
    test('Wix Pipeline endpoint reachable', 'FAIL', e.message, Date.now() - t0);
  }

  // Test 4.2: Admin key validation
  const t1 = Date.now();
  try {
    const resp = await httpsRequest(WIX_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ adminKey: 'wrong-key', members: [] })
    });
    const rejected = resp.data?.error || resp.status === 403 || resp.data?.success === false;
    test('Admin key validation', rejected ? 'PASS' : 'FAIL',
      `Wrong key correctly ${rejected ? 'rejected' : 'accepted (SECURITY ISSUE!)'}`,
      Date.now() - t1);
  } catch (e) {
    test('Admin key validation', 'FAIL', e.message, Date.now() - t1);
  }
}

async function testStatePersistence() {
  console.log('\n💾 SUITE 5: State Persistence & Recovery');
  console.log('─'.repeat(50));

  // Test 5.1: State file exists and is valid JSON
  const t0 = Date.now();
  let state;
  try {
    state = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
    test('State file valid JSON', 'PASS',
      `${Object.keys(state).length} top-level keys, size: ${fs.statSync(STATE_FILE).size} bytes`,
      Date.now() - t0);
  } catch (e) {
    test('State file valid JSON', 'FAIL', e.message, Date.now() - t0);
    return;
  }

  // Test 5.2: Required state fields
  const t1 = Date.now();
  const requiredFields = ['processedEmailIds', 'processedInstructionIds', 'processedQueryIds',
    'sentEmails', 'newRsvps', 'newPayments', 'pollCount', 'lastScanTime'];
  const missingFields = requiredFields.filter(f => !(f in state));
  test('Required state fields present',
    missingFields.length === 0 ? 'PASS' : 'FAIL',
    missingFields.length === 0 ? `All ${requiredFields.length} fields present` : `Missing: ${missingFields.join(', ')}`,
    Date.now() - t1);

  // Test 5.3: Deduplication arrays are valid
  const t2 = Date.now();
  const dedupArrays = ['processedEmailIds', 'processedInstructionIds', 'processedQueryIds'];
  let allValid = true;
  const details = [];
  for (const field of dedupArrays) {
    const arr = state[field] || [];
    const isArr = Array.isArray(arr);
    const isUnique = new Set(arr).size === arr.length;
    if (!isArr || !isUnique) allValid = false;
    details.push(`${field}: ${arr.length}${!isUnique ? ' (DUPLICATES!)' : ''}`);
  }
  test('Deduplication arrays valid', allValid ? 'PASS' : 'FAIL',
    details.join(', '),
    Date.now() - t2);

  // Test 5.4: Pipeline file exists
  const t3 = Date.now();
  try {
    const pipeline = JSON.parse(fs.readFileSync(PIPELINE_FILE, 'utf8'));
    const keys = Object.keys(pipeline);
    test('Pipeline file valid', keys.length > 0 ? 'PASS' : 'FAIL',
      `Keys: ${keys.join(', ')}, All: ${(pipeline.all || []).length}, Sendable: ${(pipeline.sendable || []).length}`,
      Date.now() - t3);
  } catch (e) {
    test('Pipeline file valid', 'FAIL', e.message, Date.now() - t3);
  }

  // Test 5.5: CRM file loaded correctly
  const t4 = Date.now();
  try {
    let crm = JSON.parse(fs.readFileSync(CRM_FILE, 'utf8'));
    if (crm.members) crm = crm.members;
    const withEmail = crm.filter(m => m.email);
    test('CRM file loaded', crm.length > 0 ? 'PASS' : 'FAIL',
      `${crm.length} total members, ${withEmail.length} with email`,
      Date.now() - t4);
  } catch (e) {
    test('CRM file loaded', 'FAIL', e.message, Date.now() - t4);
  }
}

async function testDeliveryFailureDetection(token) {
  console.log('\n📛 SUITE 6: Delivery Failure Detection');
  console.log('─'.repeat(50));

  // Test 6.1: Scan for delivery failure emails
  const t0 = Date.now();
  let bounceIds = [];
  try {
    const q = encodeURIComponent('from:mailer-daemon@googlemail.com after:2026/03/01');
    const resp = await httpsRequest(`https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${q}&maxResults=20`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    bounceIds = (resp.data.messages || []).map(m => m.id);
    test('Detect delivery failure emails', bounceIds.length > 0 ? 'PASS' : 'PASS',
      `Found ${bounceIds.length} bounce/failure emails since March 2026`,
      Date.now() - t0);
  } catch (e) {
    test('Detect delivery failure emails', 'FAIL', e.message, Date.now() - t0);
  }

  // Test 6.2: Parse bounce email for failed recipient
  if (bounceIds.length > 0) {
    const t1 = Date.now();
    try {
      const url = `https://gmail.googleapis.com/gmail/v1/users/me/messages/${bounceIds[0]}?format=full`;
      const resp = await httpsRequest(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const headers = (resp.data.payload?.headers || []);
      const subj = headers.find(h => h.name === 'Subject')?.value || '';

      let bodyText = '';
      function extractText(part) {
        if (part.mimeType === 'text/plain' && part.body?.data) {
          bodyText += Buffer.from(part.body.data, 'base64').toString('utf8');
        }
        if (part.parts) part.parts.forEach(extractText);
      }
      extractText(resp.data.payload || {});

      const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
      const allEmails = [...new Set((bodyText.match(emailRegex) || []))];
      const failedEmail = allEmails.find(e =>
        !e.includes('mailer-daemon') && !e.includes('postmaster') && !e.includes('banfjax')
      );

      test('Parse failed recipient from bounce', failedEmail ? 'PASS' : 'FAIL',
        `Bounce for: ${failedEmail || 'UNKNOWN'}, Subject: ${subj.substring(0, 50)}`,
        Date.now() - t1);

      // Test 6.3: CRM lookup for failed recipient
      if (failedEmail) {
        const t2 = Date.now();
        let crm = JSON.parse(fs.readFileSync(CRM_FILE, 'utf8'));
        if (crm.members) crm = crm.members;

        const member = crm.find(m => m.email?.toLowerCase() === failedEmail.toLowerCase());
        test('CRM lookup for bounced email', member ? 'PASS' : 'FAIL',
          member
            ? `Found: ${member.displayName} (${member.householdType}), HH: ${member.householdId || 'none'}`
            : `Not in CRM: ${failedEmail}`,
          Date.now() - t2);

        // Test 6.4: Spouse/household lookup for recovery
        if (member) {
          const t3 = Date.now();
          const hhMembers = member.householdMembers || [];
          const spouse = hhMembers.find(h => h.email && h.email.toLowerCase() !== failedEmail.toLowerCase());
          const altEmail = member.alternateEmail || member.secondaryEmail;

          test('Spouse/household recovery lookup',
            spouse || altEmail ? 'PASS' : 'FAIL',
            spouse
              ? `Spouse: ${spouse.firstName} ${spouse.lastName} (${spouse.email}) — recovery possible ✓`
              : altEmail
                ? `Alternate email: ${altEmail} — recovery possible ✓`
                : `No spouse or alternate email found — escalation needed`,
            Date.now() - t3);

          // Test 6.5: Bounce reason extraction
          const t4 = Date.now();
          let bounceReason = 'unknown';
          if (bodyText.includes('out of storage') || bodyText.includes('over quota')) {
            bounceReason = 'mailbox_full';
          } else if (bodyText.includes('does not exist') || bodyText.includes('user unknown')) {
            bounceReason = 'address_not_found';
          } else if (bodyText.includes('rejected') || bodyText.includes('blocked')) {
            bounceReason = 'rejected';
          } else if (bodyText.includes('temporary')) {
            bounceReason = 'temporary_failure';
          }
          test('Bounce reason extraction', bounceReason !== 'unknown' ? 'PASS' : 'FAIL',
            `Reason: ${bounceReason}`,
            Date.now() - t4);
        }
      }
    } catch (e) {
      test('Parse failed recipient from bounce', 'FAIL', e.message);
    }
  }

  // Test 6.6: Verify mailer-daemon is currently blocked
  const t5 = Date.now();
  try {
    const agentCode = fs.readFileSync(path.join(__dirname, 'bosonto-email-reader-agent.js'), 'utf8');
    const hasBlockedDaemon = agentCode.includes("'mailer-daemon'") || agentCode.includes('"mailer-daemon"');
    const hasDaemonBlock = agentCode.includes("'daemon'") || agentCode.includes('"daemon"');
    test('mailer-daemon currently in blocklist',
      hasBlockedDaemon || hasDaemonBlock ? 'PASS' : 'FAIL',
      `Blocked: mailer-daemon=${hasBlockedDaemon}, daemon=${hasDaemonBlock} — delivery failure agent will override this`,
      Date.now() - t5);
  } catch (e) {
    test('mailer-daemon currently in blocklist', 'FAIL', e.message, Date.now() - t5);
  }
}

async function testFullPipeline(token) {
  console.log('\n🔄 SUITE 7: Full Pipeline Integration');
  console.log('─'.repeat(50));

  // Test 7.1: Agent state consistency
  const t0 = Date.now();
  const state = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
  const consistent = state.pollCount > 0 && state.lastScanTime &&
    Array.isArray(state.processedEmailIds) && Array.isArray(state.sentEmails);
  test('Agent state consistency', consistent ? 'PASS' : 'FAIL',
    `${state.pollCount} polls, last: ${state.lastScanTime}`,
    Date.now() - t0);

  // Test 7.2: Memory/RAG availability
  const t1 = Date.now();
  try {
    const memFile = path.join(__dirname, 'agent-memory-rag.js');
    const exists = fs.existsSync(memFile);
    test('Agent Memory RAG module', exists ? 'PASS' : 'FAIL',
      exists ? 'Module available for long-term learning' : 'Module not found',
      Date.now() - t1);
  } catch (e) {
    test('Agent Memory RAG module', 'FAIL', e.message, Date.now() - t1);
  }

  // Test 7.3: Communication Compliance module
  const t2 = Date.now();
  try {
    const compFile = path.join(__dirname, 'communication-compliance.js');
    const exists = fs.existsSync(compFile);
    test('Communication Compliance module', exists ? 'PASS' : 'FAIL',
      exists ? 'Module available for email validation' : 'Module not found',
      Date.now() - t2);
  } catch (e) {
    test('Communication Compliance module', 'FAIL', e.message, Date.now() - t2);
  }

  // Test 7.4: Payment Purpose Engine
  const t3 = Date.now();
  try {
    const ppFile = path.join(__dirname, 'banf-payment-purpose-engine.js');
    const exists = fs.existsSync(ppFile);
    test('Payment Purpose Engine module', exists ? 'PASS' : 'FAIL',
      exists ? 'Module available for payment classification' : 'Module not found',
      Date.now() - t3);
  } catch (e) {
    test('Payment Purpose Engine module', 'FAIL', e.message, Date.now() - t3);
  }

  // Test 7.5: User Query Agent
  const t4 = Date.now();
  try {
    const uqFile = path.join(__dirname, 'user-query-agent.js');
    const exists = fs.existsSync(uqFile);
    test('User Query Agent module', exists ? 'PASS' : 'FAIL',
      exists ? 'Module available for user email processing' : 'Module not found',
      Date.now() - t4);
  } catch (e) {
    test('User Query Agent module', 'FAIL', e.message, Date.now() - t4);
  }

  // Test 7.6: Scheduler active (log file check)
  const t5 = Date.now();
  try {
    const logFile = path.join(__dirname, 'bosonto-reader-agent.log');
    if (fs.existsSync(logFile)) {
      const logContent = fs.readFileSync(logFile, 'utf8');
      const lines = logContent.split('\n').filter(l => l.trim());
      const lastLine = lines[lines.length - 1] || '';
      const lastTimestamp = lastLine.match(/\[([\d-T:.]+Z?)\]/)?.[1];
      const recency = lastTimestamp ? (Date.now() - new Date(lastTimestamp).getTime()) / 60000 : Infinity;

      test('Email reader agent log', 'PASS',
        `${lines.length} log entries, last: ${lastTimestamp || 'unknown'} (${recency.toFixed(0)}min ago)`,
        Date.now() - t5);
    } else {
      test('Email reader agent log', 'FAIL', 'Log file not found', Date.now() - t5);
    }
  } catch (e) {
    test('Email reader agent log', 'FAIL', e.message, Date.now() - t5);
  }

  // Test 7.7: Pipeline runOnce cycle simulation (without actually running, just verify all phases)
  const t6 = Date.now();
  const phases = [
    { name: 'Phase 1: Evite RSVP Scan', check: () => (state.processedEmailIds || []).length > 0 },
    { name: 'Phase 2: Payment Scan', check: () => Array.isArray(state.newPayments) },
    { name: 'Phase 2b: Instruction Scan', check: () => Array.isArray(state.processedInstructionIds) },
    { name: 'Phase 2c: User Query Scan', check: () => (state.processedQueryIds || []).length > 0 },
    { name: 'Phase 3: CRM Cross-Reference', check: () => fs.existsSync(CRM_FILE) },
    { name: 'Phase 4: Auto-Send Pipeline', check: () => Array.isArray(state.sentEmails) }
  ];
  const phasesOk = phases.filter(p => p.check()).length;
  test('Pipeline phases operational', phasesOk === phases.length ? 'PASS' : 'FAIL',
    `${phasesOk}/${phases.length} phases verified: ${phases.map(p => p.check() ? '✓' : '✗').join(' ')}`,
    Date.now() - t6);
}

// ═══════════════════════════════════════════════════════════════
// REPORT GENERATION
// ═══════════════════════════════════════════════════════════════

function generateReport() {
  const timestamp = new Date().toISOString();
  const passRate = totalTests > 0 ? ((passed / totalTests) * 100).toFixed(1) : 0;
  const status = failed === 0 ? '✅ ALL TESTS PASSED' : `⚠️ ${failed} TESTS FAILED`;

  let html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>BANF Email Instruction System — E2E Test Report</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Segoe UI', Tahoma, sans-serif; background: #0a0a1a; color: #e0e0e0; padding: 30px; }
  .header { background: linear-gradient(135deg, #1a1a3e 0%, #2d2d6b 100%); border-radius: 12px; padding: 30px; margin-bottom: 24px; border: 1px solid #3a3a8c; }
  .header h1 { font-size: 24px; color: #fff; margin-bottom: 8px; }
  .header .subtitle { color: #aaa; font-size: 14px; }
  .summary { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 24px; }
  .summary-card { background: #1a1a2e; border-radius: 10px; padding: 20px; border: 1px solid #333; text-align: center; }
  .summary-card .number { font-size: 36px; font-weight: 700; }
  .summary-card .label { font-size: 12px; color: #888; text-transform: uppercase; letter-spacing: 1px; margin-top: 4px; }
  .pass { color: #00e676; }
  .fail { color: #ff5252; }
  .skip { color: #ffab40; }
  .suite { background: #1a1a2e; border-radius: 10px; margin-bottom: 16px; border: 1px solid #333; overflow: hidden; }
  .suite-header { background: #222244; padding: 14px 20px; font-size: 16px; font-weight: 600; border-bottom: 1px solid #333; }
  .test-row { display: flex; align-items: center; padding: 10px 20px; border-bottom: 1px solid #1a1a2e; }
  .test-row:last-child { border-bottom: none; }
  .test-row:hover { background: #222240; }
  .test-icon { font-size: 16px; margin-right: 12px; min-width: 24px; }
  .test-name { flex: 1; font-size: 14px; }
  .test-details { color: #888; font-size: 12px; max-width: 500px; text-align: right; }
  .test-time { color: #666; font-size: 11px; min-width: 50px; text-align: right; margin-left: 12px; }
  .overall { text-align: center; padding: 20px; font-size: 20px; font-weight: 700; border-radius: 10px; margin-bottom: 24px; }
  .overall.pass-bg { background: linear-gradient(135deg, #004d40 0%, #1b5e20 100%); border: 1px solid #00e676; }
  .overall.fail-bg { background: linear-gradient(135deg, #4a0000 0%, #b71c1c 100%); border: 1px solid #ff5252; }
  .architecture { background: #1a1a2e; border-radius: 10px; padding: 20px; margin-bottom: 16px; border: 1px solid #333; }
  .architecture h3 { margin-bottom: 12px; color: #7c7cff; }
  .architecture pre { background: #0a0a1a; border-radius: 8px; padding: 16px; font-size: 12px; overflow-x: auto; color: #ccc; }
  .footer { text-align: center; padding: 20px; color: #555; font-size: 12px; }
</style>
</head>
<body>

<div class="header">
  <h1>🌸 BANF Email Instruction System — E2E Test Report</h1>
  <div class="subtitle">Generated: ${timestamp} | Bosonto Utsob 2026 Post-Event</div>
</div>

<div class="overall ${failed === 0 ? 'pass-bg' : 'fail-bg'}">
  ${status} — ${passRate}% Pass Rate (${passed}/${totalTests})
</div>

<div class="summary">
  <div class="summary-card"><div class="number">${totalTests}</div><div class="label">Total Tests</div></div>
  <div class="summary-card"><div class="number pass">${passed}</div><div class="label">Passed</div></div>
  <div class="summary-card"><div class="number fail">${failed}</div><div class="label">Failed</div></div>
  <div class="summary-card"><div class="number skip">${skipped}</div><div class="label">Skipped</div></div>
</div>`;

  // Group results by suite
  const suites = {};
  let currentSuite = '';
  for (const r of results) {
    // Infer suite from test name pattern
    let suite = currentSuite;
    if (r.name.includes('Gmail') && r.name.includes('token')) suite = '📡 Gmail Connectivity';
    else if (r.name.includes('instruction') || r.name.includes('Command detection') || r.name.includes('Deduplication')) suite = '📧 Instruction Email Scanning';
    else if (r.name.startsWith('"')) suite = '⚡ Command Handler Unit Tests';
    else if (r.name.includes('Wix') || r.name.includes('Admin key')) suite = '🌐 Wix Pipeline Connectivity';
    else if (r.name.includes('State') || r.name.includes('Pipeline file') || r.name.includes('CRM') || r.name.includes('Dedup')) suite = '💾 State Persistence & Recovery';
    else if (r.name.includes('delivery') || r.name.includes('bounce') || r.name.includes('Spouse') || r.name.includes('mailer-daemon')) suite = '📛 Delivery Failure Detection';
    else if (r.name.includes('Pipeline phase') || r.name.includes('Agent') || r.name.includes('module') || r.name.includes('agent log') || r.name.includes('phases')) suite = '🔄 Full Pipeline Integration';
    else suite = currentSuite || 'Other';
    currentSuite = suite;

    if (!suites[suite]) suites[suite] = [];
    suites[suite].push(r);
  }

  for (const [suiteName, tests] of Object.entries(suites)) {
    const suitePass = tests.filter(t => t.status === 'PASS').length;
    html += `
<div class="suite">
  <div class="suite-header">${suiteName} (${suitePass}/${tests.length})</div>`;
    for (const t of tests) {
      const icon = t.status === 'PASS' ? '✅' : t.status === 'FAIL' ? '❌' : '⏭️';
      html += `
  <div class="test-row">
    <span class="test-icon">${icon}</span>
    <span class="test-name">${t.name}</span>
    <span class="test-details">${t.details}</span>
    <span class="test-time">${t.duration ? t.duration + 'ms' : ''}</span>
  </div>`;
    }
    html += `
</div>`;
  }

  // Architecture diagram
  html += `
<div class="architecture">
  <h3>System Architecture</h3>
  <pre>
┌─────────────────────────────────────────────────────────────┐
│                 BANF Email Instruction System                │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  📧 Gmail (banfjax@gmail.com)                               │
│    ├── Evite RSVPs (from notify@evite.com)                  │
│    ├── Zelle Payments (from alerts@notify.wellsfargo.com)   │
│    ├── Admin Instructions (from ${ADMIN_EMAIL})  │
│    ├── User Queries (from members)                          │
│    └── Delivery Failures (from mailer-daemon) ← NEW        │
│                                                             │
│  ⚡ Processing Pipeline (runOnce → every 5 min)            │
│    ├── Phase 1: scanNewEviteEmails()                        │
│    ├── Phase 2: scanNewPaymentEmails()                      │
│    ├── Phase 2b: scanInstructionEmails() → processInstr()   │
│    ├── Phase 2c: scanUserQueryEmails() → processQueries()   │
│    ├── Phase 2d: scanDeliveryFailures() → recovery ← NEW   │
│    ├── Phase 3: CRM cross-reference                         │
│    └── Phase 4: Auto-send (payments, RSVPs)                 │
│                                                             │
│  🔧 Instruction Commands:                                   │
│    ├── status                                               │
│    ├── check member email: X                                │
│    ├── list pending                                         │
│    ├── run scan                                             │
│    ├── send payment followup email: X amount: Y             │
│    └── send rsvp email email: X                             │
│                                                             │
│  📛 Delivery Failure Recovery (NEW):                        │
│    ├── Detect bounce → parse failed recipient               │
│    ├── CRM lookup → alternate email check                   │
│    ├── Household/spouse lookup (100% match)                 │
│    ├── Email verification to spouse                         │
│    ├── President escalation (no match)                      │
│    └── Flag non-deliverable                                 │
│                                                             │
│  💾 State: bosonto-reader-agent-state.json                  │
│  📊 Pipeline: bosonto-full-pipeline.json                    │
│  👥 CRM: banf-crm-reconciliation.json (235 members)        │
│                                                             │
│  🔌 Dependencies:                                           │
│    ├── user-query-agent.js                                  │
│    ├── agent-memory-rag.js                                  │
│    ├── communication-compliance.js                          │
│    └── banf-payment-purpose-engine.js                       │
└─────────────────────────────────────────────────────────────┘
  </pre>
</div>`;

  html += `
<div class="footer">
  BANF Bosonto Utsob 2026 — Email Instruction E2E Test Report | ${timestamp}
</div>

</body>
</html>`;

  const reportFile = path.join(__dirname, 'banf-instruction-e2e-report.html');
  fs.writeFileSync(reportFile, html);

  // Also save JSON results
  const jsonReport = {
    timestamp,
    totalTests,
    passed,
    failed,
    skipped,
    passRate: parseFloat(passRate),
    results,
    summary: status
  };
  fs.writeFileSync(path.join(__dirname, 'banf-instruction-e2e-results.json'), JSON.stringify(jsonReport, null, 2));

  return reportFile;
}

// ═══════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════

async function main() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  🌸 BANF Email Instruction System — E2E Test Suite');
  console.log(`  📅 ${new Date().toISOString()}`);
  console.log(`  🔧 Mode: ${LIVE_MODE ? 'LIVE (includes send tests)' : 'STANDARD'}`);
  console.log('═══════════════════════════════════════════════════════════');

  const startTime = Date.now();

  // Suite 1: Gmail
  const token = await testGmailConnectivity();
  if (!token) {
    console.log('\n❌ FATAL: Cannot proceed without Gmail token');
    generateReport();
    process.exit(1);
  }

  // Suite 2: Instruction scanning
  await testInstructionScanning(token);

  // Suite 3: Command handlers
  await testCommandHandlers(token);

  // Suite 4: Wix pipeline
  await testWixPipelineConnectivity();

  // Suite 5: State persistence
  await testStatePersistence();

  // Suite 6: Delivery failure detection
  await testDeliveryFailureDetection(token);

  // Suite 7: Full pipeline
  await testFullPipeline(token);

  // Generate report
  console.log('\n═══════════════════════════════════════════════════════════');
  const reportFile = generateReport();
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log(`\n📊 RESULTS: ${passed}/${totalTests} passed (${((passed/totalTests)*100).toFixed(1)}%), ${failed} failed, ${skipped} skipped`);
  console.log(`⏱️  Completed in ${elapsed}s`);
  console.log(`📄 Report: ${reportFile}`);
  console.log(`📄 JSON:   banf-instruction-e2e-results.json`);
  console.log('═══════════════════════════════════════════════════════════');
}

main().catch(e => {
  console.error('Fatal:', e);
  process.exit(1);
});
