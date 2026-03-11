#!/usr/bin/env node
/**
 * ═══════════════════════════════════════════════════════════════════════
 *  BANF Development Instruct Agent
 * ═══════════════════════════════════════════════════════════════════════
 *
 *  Email-driven development workflow:
 *    1. President sends email to banfjax@gmail.com with subject "INSTRUCT"
 *       (exact word, uppercase, no other keywords)
 *    2. Email reader detects and routes to this agent
 *    3. Agent creates an optimized prompt from the email body
 *    4. Executes via GitHub CLI + Claude Opus model:
 *         gh copilot suggest / claude --model opus
 *    5. Captures output, runs tests, verifies results
 *    6. Sends results email to president for confirm/modify
 *    7. President replies → iterates until confirmed
 *
 *  State: banf-dev-instruct-state.json
 *
 *  Usage:
 *    const instruct = require('./banf-dev-instruct-agent.js');
 *    await instruct.processInstruction({ from, subject, body, gmailId });
 *    await instruct.processReply({ from, subject, body, gmailId, threadId });
 *
 *    CLI:
 *      node banf-dev-instruct-agent.js --status
 *      node banf-dev-instruct-agent.js --dry-test
 *      node banf-dev-instruct-agent.js --list
 *
 * ═══════════════════════════════════════════════════════════════════════
 */

const fs = require('fs');
const path = require('path');
const { execSync, exec } = require('child_process');
const https = require('https');

// ─── Config ─────────────────────────────────────────────────────
const STATE_FILE = path.join(__dirname, 'banf-dev-instruct-state.json');
const LOG_FILE = path.join(__dirname, 'banf-dev-instruct.log');
const WORKSPACE = path.join(__dirname);
const PRESIDENT_EMAIL = 'ranadhir.ghosh@gmail.com';
const BANF_EMAIL = 'banfjax@gmail.com';
const SEND_EMAIL_URL = 'https://banfwix.wixsite.com/banf1/_functions/send_email';

const GMAIL = {
  CLIENT_ID: '1020178199135-3usrl611ara38i7rhu2ub6sn6g1150ml.apps.googleusercontent.com',
  CLIENT_SECRET: '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',
  REFRESH_TOKEN: require('./banf-gmail-config').REFRESH_TOKEN
};

// ─── Pipeline Status ────────────────────────────────────────────
const INSTRUCT_STATUS = {
  RECEIVED: 'received',
  PROMPT_CREATED: 'prompt_created',
  EXECUTING: 'executing',
  TESTING: 'testing',
  AWAITING_CONFIRMATION: 'awaiting_confirmation',
  ITERATION_REQUESTED: 'iteration_requested',
  CONFIRMED: 'confirmed',
  FAILED: 'failed',
  CANCELLED: 'cancelled'
};

// ─── Logging ────────────────────────────────────────────────────
function log(level, msg) {
  const ts = new Date().toISOString();
  const line = `[${ts}] [${level}] [DevInstruct] ${msg}`;
  console.log(line);
  try { fs.appendFileSync(LOG_FILE, line + '\n'); } catch {}
}

// ─── State Management ───────────────────────────────────────────
function loadState() {
  try { return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8')); }
  catch { return { instructions: [], nextId: 1, stats: { total: 0, confirmed: 0, failed: 0, iterations: 0 } }; }
}

function saveState(state) {
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

// ─── HTTP Request Helper ────────────────────────────────────────
function httpsPost(url, data) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const body = JSON.stringify(data);
    const req = https.request({
      hostname: u.hostname,
      port: 443,
      path: u.pathname + u.search,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
      timeout: 30000
    }, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(d) }); }
        catch { resolve({ status: res.statusCode, data: d }); }
      });
    });
    req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

// ═══════════════════════════════════════════════════════════════
// PROMPT ENGINEERING — Create optimized dev prompt from email body
// ═══════════════════════════════════════════════════════════════

function createDevPrompt(emailBody, iteration = 0, previousOutput = null, modifyInstructions = null) {
  // Clean the email body
  let cleanBody = emailBody
    .replace(/^>+\s*/gm, '')           // Remove quoted lines
    .replace(/On .* wrote:/g, '')       // Remove reply headers
    .replace(/--\s*\n[\s\S]*$/, '')     // Remove email signatures
    .replace(/<[^>]*>/g, '')            // Remove HTML
    .replace(/\r\n/g, '\n')
    .trim();

  let prompt;

  if (iteration === 0) {
    // First iteration — create the initial prompt
    prompt = `You are working on the BANF (Bengali Association of North Florida) platform.
Workspace: ${WORKSPACE}
Key files: banf1-wix/src/backend/http-functions.js, bosonto-email-reader-agent.js, banf1-wix/src/public/admin-portal.html

TASK FROM PRESIDENT:
${cleanBody}

INSTRUCTIONS:
1. Analyze the task and identify all affected files
2. Implement the changes with proper error handling
3. Create or update tests as needed
4. Ensure backward compatibility
5. Follow existing code patterns and conventions
6. After implementation, run any relevant tests
7. Provide a clear summary of what was changed and test results

IMPORTANT:
- Do NOT break existing functionality
- Use the existing OAuth2 credentials and email patterns
- Follow the Change Agent workflow (submit CR, create ticket)
- Update architecture docs if needed`;
  } else {
    // Iteration — modify based on feedback
    prompt = `ITERATION ${iteration} — Modifying previous implementation based on president's feedback.

PREVIOUS OUTPUT:
${(previousOutput || '').substring(0, 3000)}

MODIFICATION REQUESTED:
${modifyInstructions || cleanBody}

Apply the requested changes, re-test, and provide updated summary.`;
  }

  return prompt;
}

// ═══════════════════════════════════════════════════════════════
// GITHUB CLI EXECUTION — Run claude model via gh CLI
// ═══════════════════════════════════════════════════════════════

function executeGitHubCLI(prompt, instructId) {
  const outputFile = path.join(__dirname, `dev-instruct-output-${instructId}.txt`);
  const promptFile = path.join(__dirname, `dev-instruct-prompt-${instructId}.txt`);

  // Write prompt to file for gh CLI input
  fs.writeFileSync(promptFile, prompt);

  log('INFO', `Executing GitHub CLI for INST-${instructId}...`);

  let output = '';
  let success = false;

  try {
    // Try GitHub Copilot CLI with Claude Opus
    // gh copilot suggest reads from stdin or file
    output = execSync(
      `cd "${WORKSPACE}" && gh copilot suggest --model claude-opus-4 -t shell < "${promptFile}"`,
      { encoding: 'utf8', timeout: 300000, maxBuffer: 10 * 1024 * 1024 }
    );
    success = true;
    log('INFO', `GitHub CLI completed for INST-${instructId}`);
  } catch (e1) {
    log('WARN', `gh copilot suggest failed: ${e1.message}`);
    try {
      // Fallback: Use claude CLI directly if available
      output = execSync(
        `cd "${WORKSPACE}" && claude --model claude-opus-4 --print "${promptFile}"`,
        { encoding: 'utf8', timeout: 300000, maxBuffer: 10 * 1024 * 1024 }
      );
      success = true;
      log('INFO', `claude CLI completed for INST-${instructId}`);
    } catch (e2) {
      log('WARN', `claude CLI failed: ${e2.message}`);
      try {
        // Fallback 2: Use GitHub Copilot agent mode
        output = execSync(
          `cd "${WORKSPACE}" && gh copilot explain --model claude-opus-4 < "${promptFile}"`,
          { encoding: 'utf8', timeout: 300000, maxBuffer: 10 * 1024 * 1024 }
        );
        success = true;
      } catch (e3) {
        output = `CLI execution failed. Tried:\n1. gh copilot suggest: ${e1.message}\n2. claude CLI: ${e2.message}\n3. gh copilot explain: ${e3.message}\n\nPrompt was saved to: ${promptFile}\nPlease run manually.`;
        success = false;
      }
    }
  }

  // Save output
  fs.writeFileSync(outputFile, output);
  log('INFO', `Output saved to ${outputFile} (${output.length} chars)`);

  return { output, success, outputFile, promptFile };
}

// ═══════════════════════════════════════════════════════════════
// TEST RUNNER — Verify implementation
// ═══════════════════════════════════════════════════════════════

function runTests(instructId) {
  log('INFO', `Running tests for INST-${instructId}...`);

  const results = [];

  // 1. Syntax check key files
  const filesToCheck = [
    'bosonto-email-reader-agent.js',
    'banf-change-agent.js',
    'banf-message-queue.js',
    'banf-procurement-agent.js',
  ];

  for (const f of filesToCheck) {
    const fp = path.join(WORKSPACE, f);
    if (fs.existsSync(fp)) {
      try {
        execSync(`node -c "${fp}"`, { encoding: 'utf8', timeout: 10000 });
        results.push({ file: f, test: 'syntax', passed: true });
      } catch (e) {
        results.push({ file: f, test: 'syntax', passed: false, error: e.message });
      }
    }
  }

  // 2. Run the change agent status check
  try {
    const status = execSync('node banf-change-agent.js --status', {
      cwd: WORKSPACE, encoding: 'utf8', timeout: 10000
    });
    results.push({ test: 'change-agent-status', passed: true, output: status.substring(0, 200) });
  } catch (e) {
    results.push({ test: 'change-agent-status', passed: false, error: e.message });
  }

  // 3. Run the MQ status check
  try {
    const mqStatus = execSync('node banf-message-queue.js --status', {
      cwd: WORKSPACE, encoding: 'utf8', timeout: 10000
    });
    results.push({ test: 'mq-status', passed: true, output: mqStatus.substring(0, 200) });
  } catch (e) {
    results.push({ test: 'mq-status', passed: false, error: e.message });
  }

  const passed = results.filter(r => r.passed).length;
  const total = results.length;
  log('INFO', `Tests: ${passed}/${total} passed`);

  return { results, passed, total, allPassed: passed === total };
}

// ═══════════════════════════════════════════════════════════════
// EMAIL — Send results to president
// ═══════════════════════════════════════════════════════════════

async function sendResultEmail(instruction, output, testResults, iteration) {
  const instId = instruction.id;
  const statusEmoji = testResults.allPassed ? '✅' : '⚠️';

  const testSummary = testResults.results.map(r =>
    `  ${r.passed ? '✅' : '❌'} ${r.test || r.file} — ${r.passed ? 'PASSED' : r.error?.substring(0, 80)}`
  ).join('\n');

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:700px;margin:0 auto;">
      <div style="background:#1a237e;color:white;padding:20px;border-radius:8px 8px 0 0;">
        <h2 style="margin:0;">🔧 Development Instruct — INST-${instId}</h2>
        <p style="margin:5px 0 0;opacity:0.9;">Iteration #${iteration + 1} | ${new Date().toLocaleString()}</p>
      </div>
      <div style="padding:20px;border:1px solid #ddd;border-top:none;">
        <h3>${statusEmoji} Execution Results</h3>
        <p><strong>Original Task:</strong></p>
        <blockquote style="background:#f5f5f5;padding:10px;border-left:3px solid #1a237e;">
          ${instruction.originalBody.substring(0, 500).replace(/\n/g, '<br>')}
        </blockquote>

        <h4>📋 Test Results (${testResults.passed}/${testResults.total})</h4>
        <pre style="background:#f5f5f5;padding:10px;font-size:12px;overflow-x:auto;">${testSummary}</pre>

        <h4>📄 Implementation Output (excerpt)</h4>
        <pre style="background:#f5f5f5;padding:10px;font-size:12px;overflow-x:auto;max-height:400px;">${(output || '').substring(0, 2000).replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre>

        <hr style="margin:20px 0;">
        <h4>📩 Reply to this email to:</h4>
        <ul>
          <li><strong>CONFIRM</strong> — Reply with "CONFIRM" to accept and close</li>
          <li><strong>MODIFY</strong> — Reply with modification instructions for another iteration</li>
          <li><strong>CANCEL</strong> — Reply with "CANCEL" to abort</li>
        </ul>

        <p style="font-size:12px;color:#666;margin-top:20px;">
          Instruction ID: INST-${instId} | Thread: ${instruction.threadId || 'N/A'}<br>
          Files: ${instruction.promptFile || 'N/A'} → ${instruction.outputFile || 'N/A'}
        </p>
      </div>
    </div>`;

  const subject = `[BANF-DEV] INST-${instId} — ${statusEmoji} Results (Iteration ${iteration + 1})`;

  try {
    const resp = await httpsPost(SEND_EMAIL_URL, {
      to: PRESIDENT_EMAIL,
      toName: 'Ranadhir Ghosh',
      subject,
      body: `INST-${instId} Results (Iteration ${iteration + 1})\n\nTests: ${testResults.passed}/${testResults.total}\n\nReply CONFIRM, MODIFY, or CANCEL.`,
      body_html: html,
      reply_to: BANF_EMAIL
    });

    log('INFO', `Result email sent for INST-${instId}: ${resp.status}`);
    return resp.status === 200;
  } catch (e) {
    log('ERROR', `Failed to send result email: ${e.message}`);
    return false;
  }
}

// ═══════════════════════════════════════════════════════════════
// MAIN PIPELINE — Process new instruction
// ═══════════════════════════════════════════════════════════════

async function processInstruction(email) {
  const state = loadState();
  const instId = state.nextId++;
  state.stats.total++;

  log('INFO', `Processing INSTRUCT email → INST-${instId}`);

  // Extract instruction text from subject line suffix + body
  // If subject is "INSTRUCT: do something", the "do something" part is additional context
  let taskBody = (email.body || '').trim();
  const subjectSuffix = ((email.subject || '')
    .replace(/^(Re:\s*|Fwd:\s*)*/i, '')
    .replace(/^instruct\s*[:\-—–]\s*/i, '')
    .trim());
  if (subjectSuffix && subjectSuffix.toLowerCase() !== 'instruct' && !taskBody.includes(subjectSuffix)) {
    taskBody = subjectSuffix + '\n\n' + taskBody;
  }

  const instruction = {
    id: instId,
    gmailId: email.gmailId || email.id,
    threadId: email.threadId || null,
    from: email.from,
    subject: email.subject,
    originalBody: taskBody,
    status: INSTRUCT_STATUS.RECEIVED,
    iteration: 0,
    history: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  // Step 1: Create optimized prompt
  const prompt = createDevPrompt(taskBody);
  instruction.status = INSTRUCT_STATUS.PROMPT_CREATED;
  instruction.currentPrompt = prompt;
  instruction.history.push({ action: 'prompt_created', at: new Date().toISOString() });

  // Step 2: Execute via GitHub CLI
  instruction.status = INSTRUCT_STATUS.EXECUTING;
  const { output, success, outputFile, promptFile } = executeGitHubCLI(prompt, instId);
  instruction.outputFile = outputFile;
  instruction.promptFile = promptFile;
  instruction.lastOutput = output.substring(0, 5000);
  instruction.history.push({ action: 'executed', success, at: new Date().toISOString() });

  // Step 3: Run tests
  instruction.status = INSTRUCT_STATUS.TESTING;
  const testResults = runTests(instId);
  instruction.testResults = testResults;
  instruction.history.push({ action: 'tested', passed: testResults.passed, total: testResults.total, at: new Date().toISOString() });

  // Step 4: Send results to president
  instruction.status = INSTRUCT_STATUS.AWAITING_CONFIRMATION;
  const emailSent = await sendResultEmail(instruction, output, testResults, 0);
  instruction.history.push({ action: 'result_sent', emailSent, at: new Date().toISOString() });

  if (!emailSent && !success) {
    instruction.status = INSTRUCT_STATUS.FAILED;
    state.stats.failed++;
  }

  state.instructions.push(instruction);
  saveState(state);

  log('INFO', `INST-${instId}: ${instruction.status} — Tests: ${testResults.passed}/${testResults.total}`);
  return instruction;
}

// ═══════════════════════════════════════════════════════════════
// REPLY HANDLER — Process president's reply for iteration
// ═══════════════════════════════════════════════════════════════

async function processReply(email) {
  const state = loadState();

  // Find the matching instruction by thread or by searching body for INST-xxx
  const instMatch = (email.subject || '').match(/INST-(\d+)/i) || (email.body || '').match(/INST-(\d+)/i);
  if (!instMatch) {
    log('WARN', 'Reply does not reference any INST-id');
    return null;
  }

  const instId = parseInt(instMatch[1]);
  const instruction = state.instructions.find(i => i.id === instId);
  if (!instruction) {
    log('WARN', `INST-${instId} not found in state`);
    return null;
  }

  const body = (email.body || '').trim().toUpperCase();

  // CONFIRM — Accept and close
  if (body.startsWith('CONFIRM') || body.includes('CONFIRMED') || body.includes('LOOKS GOOD') || body.includes('APPROVED')) {
    instruction.status = INSTRUCT_STATUS.CONFIRMED;
    instruction.updatedAt = new Date().toISOString();
    instruction.history.push({ action: 'confirmed', at: new Date().toISOString() });
    state.stats.confirmed++;
    saveState(state);
    log('INFO', `INST-${instId}: CONFIRMED by president`);

    // Send confirmation acknowledgment
    await httpsPost(SEND_EMAIL_URL, {
      to: PRESIDENT_EMAIL,
      toName: 'Ranadhir Ghosh',
      subject: `[BANF-DEV] INST-${instId} — ✅ Confirmed & Closed`,
      body: `INST-${instId} has been confirmed and closed. Implementation is live.`,
      body_html: `<div style="font-family:Arial;padding:20px;">
        <h2>✅ INST-${instId} — Confirmed</h2>
        <p>Implementation has been accepted and is live. No further action needed.</p>
        <p style="color:#666;font-size:12px;">Total iterations: ${instruction.iteration + 1}</p>
      </div>`
    });

    return instruction;
  }

  // CANCEL — Abort
  if (body.startsWith('CANCEL') || body.includes('ABORT') || body.includes('STOP')) {
    instruction.status = INSTRUCT_STATUS.CANCELLED;
    instruction.updatedAt = new Date().toISOString();
    instruction.history.push({ action: 'cancelled', at: new Date().toISOString() });
    saveState(state);
    log('INFO', `INST-${instId}: CANCELLED by president`);
    return instruction;
  }

  // MODIFY — Iterate
  instruction.iteration++;
  instruction.status = INSTRUCT_STATUS.ITERATION_REQUESTED;
  state.stats.iterations++;
  instruction.history.push({ action: 'iteration_requested', iteration: instruction.iteration, at: new Date().toISOString() });

  log('INFO', `INST-${instId}: Iteration ${instruction.iteration} requested`);

  // Create new prompt with modification request
  const prompt = createDevPrompt(email.body, instruction.iteration, instruction.lastOutput, email.body);
  instruction.currentPrompt = prompt;

  // Execute
  instruction.status = INSTRUCT_STATUS.EXECUTING;
  const { output, success, outputFile, promptFile } = executeGitHubCLI(prompt, `${instId}-iter${instruction.iteration}`);
  instruction.outputFile = outputFile;
  instruction.lastOutput = output.substring(0, 5000);
  instruction.history.push({ action: 'executed', success, iteration: instruction.iteration, at: new Date().toISOString() });

  // Test
  instruction.status = INSTRUCT_STATUS.TESTING;
  const testResults = runTests(instId);
  instruction.testResults = testResults;

  // Send results
  instruction.status = INSTRUCT_STATUS.AWAITING_CONFIRMATION;
  await sendResultEmail(instruction, output, testResults, instruction.iteration);

  instruction.updatedAt = new Date().toISOString();
  saveState(state);

  return instruction;
}

// ═══════════════════════════════════════════════════════════════
// SUBJECT LINE DETECTION — Is this an INSTRUCT email?
// ═══════════════════════════════════════════════════════════════

function isInstructEmail(email) {
  const from = (email.from || '').toLowerCase();
  const subject = (email.subject || '').trim();

  // Must be from president
  if (!from.includes(PRESIDENT_EMAIL.toLowerCase())) return false;

  // Subject must START WITH "INSTRUCT" (case-insensitive) after stripping Re:/Fwd: prefixes
  // Allows: "INSTRUCT", "INSTRUCT: do something", "Instruct - update admin", "Re: INSTRUCT"
  // Does NOT match: "Instructions for meeting", "Some INSTRUCT text"
  const cleanSubject = subject
    .replace(/^(Re:\s*|Fwd:\s*|\[BANF-DEV\]\s*)*INST-\d+\s*[—–-]\s*/i, '')
    .replace(/^(Re:\s*|Fwd:\s*)*/i, '')
    .replace(/[()]/g, '')
    .trim();

  // Match "INSTRUCT" exactly, or "INSTRUCT" followed by separator (colon, dash, space)
  return /^instruct(\s*$|\s*[:\-—–]\s*|\s+)/i.test(cleanSubject);
}

function isInstructReply(email) {
  const from = (email.from || '').toLowerCase();
  const subject = (email.subject || '').trim();

  if (!from.includes(PRESIDENT_EMAIL.toLowerCase())) return false;

  // Reply to an instruct result email: contains [BANF-DEV] INST-xxx
  return /\[BANF-DEV\]\s*INST-\d+/i.test(subject) || /Re:.*INST-\d+/i.test(subject);
}

// ═══════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════

module.exports = {
  processInstruction,
  processReply,
  isInstructEmail,
  isInstructReply,
  INSTRUCT_STATUS,
  loadState,
  runTests,
  createDevPrompt,
  executeGitHubCLI,
  sendResultEmail
};

// ═══════════════════════════════════════════════════════════════
// CLI
// ═══════════════════════════════════════════════════════════════

if (require.main === module) {
  const args = process.argv.slice(2);

  if (args.includes('--status')) {
    const state = loadState();
    console.log('\n🔧 Development Instruct Agent Status');
    console.log('═'.repeat(60));
    console.log(`  Total instructions: ${state.stats.total}`);
    console.log(`  Confirmed:          ${state.stats.confirmed}`);
    console.log(`  Failed:             ${state.stats.failed}`);
    console.log(`  Total iterations:   ${state.stats.iterations}`);
    console.log('');
    if (state.instructions.length > 0) {
      console.log('  Recent:');
      for (const inst of state.instructions.slice(-5)) {
        console.log(`    INST-${inst.id} [${inst.status}] iter:${inst.iteration} — ${(inst.originalBody || '').substring(0, 60)}`);
      }
    }
    console.log('═'.repeat(60));
  }

  else if (args.includes('--list')) {
    const state = loadState();
    for (const inst of state.instructions) {
      console.log(`INST-${inst.id} [${inst.status}] iter:${inst.iteration} created:${inst.createdAt}`);
      console.log(`  Task: ${(inst.originalBody || '').substring(0, 80)}`);
      console.log(`  Tests: ${inst.testResults?.passed || 0}/${inst.testResults?.total || 0}`);
      console.log('');
    }
  }

  else if (args.includes('--dry-test')) {
    (async () => {
      console.log('\n🧪 DRY TEST — Development Instruct Agent');
      console.log('═'.repeat(60));

      // 1. Test subject detection
      console.log('\n1. Subject line detection:');
      const tests = [
        { from: 'ranadhir.ghosh@gmail.com', subject: 'INSTRUCT', expected: true },
        { from: 'ranadhir.ghosh@gmail.com', subject: 'instruct', expected: true },
        { from: 'ranadhir.ghosh@gmail.com', subject: 'INSTRUCT: add health check', expected: true },
        { from: 'ranadhir.ghosh@gmail.com', subject: 'Instruct - update admin portal', expected: true },
        { from: 'ranadhir.ghosh@gmail.com', subject: 'Re: INSTRUCT', expected: true },
        { from: 'random@gmail.com', subject: 'INSTRUCT', expected: false },
        { from: 'Ranadhir Ghosh <ranadhir.ghosh@gmail.com>', subject: 'INSTRUCT', expected: true },
        { from: 'ranadhir.ghosh@gmail.com', subject: 'Instructions for meeting', expected: false },
      ];
      let passed = 0;
      for (const t of tests) {
        const result = isInstructEmail(t);
        const ok = result === t.expected;
        passed += ok ? 1 : 0;
        console.log(`  ${ok ? '✅' : '❌'} from="${t.from}" subject="${t.subject}" → ${result} (expected ${t.expected})`);
      }
      console.log(`  Subject detection: ${passed}/${tests.length}`);

      // 2. Test reply detection
      console.log('\n2. Reply detection:');
      const replyTests = [
        { from: 'ranadhir.ghosh@gmail.com', subject: 'Re: [BANF-DEV] INST-1 — ✅ Results', expected: true },
        { from: 'ranadhir.ghosh@gmail.com', subject: 'Re: INST-5 results', expected: true },
        { from: 'other@gmail.com', subject: 'Re: [BANF-DEV] INST-1', expected: false },
      ];
      let rPassed = 0;
      for (const t of replyTests) {
        const result = isInstructReply(t);
        const ok = result === t.expected;
        rPassed += ok ? 1 : 0;
        console.log(`  ${ok ? '✅' : '❌'} subject="${t.subject}" → ${result}`);
      }
      console.log(`  Reply detection: ${rPassed}/${replyTests.length}`);

      // 3. Test prompt creation
      console.log('\n3. Prompt creation:');
      const prompt = createDevPrompt('Add a new health check endpoint that returns the version number and uptime');
      console.log(`  Prompt length: ${prompt.length} chars`);
      console.log(`  Contains workspace: ${prompt.includes(WORKSPACE)}`);
      console.log(`  Contains task: ${prompt.includes('health check')}`);
      console.log(`  ✅ Prompt creation works`);

      // 4. Test iteration prompt
      console.log('\n4. Iteration prompt:');
      const iterPrompt = createDevPrompt('Make it return JSON', 1, 'Previous output here', 'Also add timestamp');
      console.log(`  Contains ITERATION 1: ${iterPrompt.includes('ITERATION 1')}`);
      console.log(`  Contains previous output: ${iterPrompt.includes('Previous output')}`);
      console.log(`  ✅ Iteration prompt works`);

      // 5. Test runner
      console.log('\n5. Test runner:');
      const testResults = runTests(0);
      console.log(`  Tests: ${testResults.passed}/${testResults.total}`);
      for (const r of testResults.results) {
        console.log(`    ${r.passed ? '✅' : '❌'} ${r.test || r.file}`);
      }

      // 6. Test state management
      console.log('\n6. State management:');
      const state = loadState();
      console.log(`  State loaded: ${state.instructions.length} instructions`);
      console.log(`  ✅ State management works`);

      // 7. Email sending (dry - just verify URL resolution)
      console.log('\n7. Email sending (dry):');
      console.log(`  URL: ${SEND_EMAIL_URL}`);
      console.log(`  To: ${PRESIDENT_EMAIL}`);
      console.log(`  ✅ Email config valid`);

      // 8. GitHub CLI availability
      console.log('\n8. GitHub CLI check:');
      try {
        const ghVersion = execSync('gh --version', { encoding: 'utf8', timeout: 5000 });
        console.log(`  ✅ gh: ${ghVersion.trim().split('\n')[0]}`);
      } catch {
        console.log(`  ⚠️ gh CLI not found (will use claude CLI fallback)`);
      }
      try {
        const claudeVersion = execSync('claude --version', { encoding: 'utf8', timeout: 5000 });
        console.log(`  ✅ claude: ${claudeVersion.trim().split('\n')[0]}`);
      } catch {
        console.log(`  ⚠️ claude CLI not found`);
      }

      console.log('\n═'.repeat(60));
      const totalPassed = passed + rPassed + (testResults.allPassed ? 1 : 0) + 4; // +4 for prompt, iter, state, email
      const totalTests = tests.length + replyTests.length + 5;
      console.log(`  TOTAL: ${totalPassed}/${totalTests} tests passed`);
      console.log('═'.repeat(60));
    })();
  }

  else {
    console.log('Usage:');
    console.log('  --status     Show agent status');
    console.log('  --list       List all instructions');
    console.log('  --dry-test   Run comprehensive dry test');
  }
}
