#!/usr/bin/env node
/**
 * BANF Evite Batch Sender — Reliable batch email delivery with verification
 * 
 * Sends invitation emails to all CRM members in small batches,
 * verifies each batch, retries failures, and generates a live dashboard.
 * 
 * Usage:  node evite-batch-sender.js
 * Resume: node evite-batch-sender.js --resume
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

// ─── CONFIG ──────────────────────────────────────────────────
const EVENT_ID = '61849b36-68e5-41fc-885d-998feafc21f2';
const BASE_HOST = 'www.jaxbengali.org';
const BATCH_SIZE = 10;           // emails per batch (keep small to avoid Wix timeout)
const BATCH_DELAY_MS = 5000;     // 5s between batches
const VERIFY_DELAY_MS = 3000;    // 3s after batch before verification
const MAX_RETRIES = 3;           // max retries per failed email
const PROGRESS_FILE = path.join(__dirname, '_evite-batch-progress.json');
const DASHBOARD_FILE = path.join(__dirname, '_evite-batch-dashboard.html');
const LOG_FILE = path.join(__dirname, '_evite-batch-log.txt');

// ─── HTTP HELPERS ────────────────────────────────────────────
function apiGet(urlPath) {
    return new Promise((resolve, reject) => {
        https.get(`https://${BASE_HOST}/_functions/${urlPath}`, res => {
            let d = '';
            res.on('data', c => d += c);
            res.on('end', () => {
                try { resolve(JSON.parse(d)); }
                catch (e) { reject(new Error(`Parse error: ${d.substring(0, 200)}`)); }
            });
        }).on('error', reject);
    });
}

function apiPost(urlPath, body) {
    return new Promise((resolve, reject) => {
        const data = JSON.stringify(body);
        const options = {
            hostname: BASE_HOST,
            path: `/_functions/${urlPath}`,
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) }
        };
        const req = https.request(options, res => {
            let d = '';
            res.on('data', c => d += c);
            res.on('end', () => {
                try { resolve(JSON.parse(d)); }
                catch (e) { reject(new Error(`Parse error (${res.statusCode}): ${d.substring(0, 300)}`)); }
            });
        });
        req.on('error', reject);
        req.setTimeout(120000, () => { req.destroy(new Error('Request timeout')); });
        req.write(data);
        req.end();
    });
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function log(msg) {
    const ts = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const line = `[${ts}] ${msg}`;
    console.log(line);
    fs.appendFileSync(LOG_FILE, line + '\n');
}

// ─── PROGRESS MANAGEMENT ────────────────────────────────────
function loadProgress() {
    if (fs.existsSync(PROGRESS_FILE)) {
        return JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf-8'));
    }
    return {
        startedAt: new Date().toISOString(),
        eventId: EVENT_ID,
        totalMembers: 0,
        batches: [],
        sent: {},         // email -> { name, sentAt, batchNum, verified }
        failed: {},       // email -> { name, error, retries }
        skipped: {},      // email -> reason
        stats: { totalSent: 0, totalFailed: 0, totalVerified: 0, totalSkipped: 0 }
    };
}

function saveProgress(progress) {
    progress.lastUpdated = new Date().toISOString();
    fs.writeFileSync(PROGRESS_FILE, JSON.stringify(progress, null, 2));
}

// ─── MAIN FLOW ───────────────────────────────────────────────
async function main() {
    const isResume = process.argv.includes('--resume');
    let progress = isResume ? loadProgress() : loadProgress();

    log('═══════════════════════════════════════════════════════════');
    log('  BANF Evite Batch Sender — Starting');
    log(`  Mode: ${isResume && progress.batches.length > 0 ? 'RESUME' : 'NEW'}`);
    log('═══════════════════════════════════════════════════════════');

    // Step 1: Fetch all members
    log('Step 1: Fetching all CRM members...');
    let allMembers;
    try {
        const resp = await apiGet('evite_recipients?type=all_members');
        allMembers = resp.members || [];
        log(`  Found ${allMembers.length} CRM members`);
    } catch (e) {
        log(`  FATAL: Cannot fetch members — ${e.message}`);
        process.exit(1);
    }

    // Fix names: use email prefix if name is missing or is just the email prefix
    allMembers = allMembers.map(m => {
        let name = (m.name || '').trim();
        const emailPrefix = m.email.split('@')[0];
        // If name is empty, same as email prefix, or looks like a username, use the email address
        if (!name || name === emailPrefix || name.includes('_') || name.includes('.') && name.length < 20) {
            name = m.email;
        }
        return { ...m, name, originalName: m.name };
    });

    // Step 2: Fetch already-invited emails
    log('Step 2: Checking already-invited members...');
    let alreadyInvited = new Set();
    try {
        const statusResp = await apiGet(`evite_invite_status?eventId=${EVENT_ID}`);
        const invitations = statusResp.invitations || [];
        invitations.forEach(inv => alreadyInvited.add(inv.recipientEmail.toLowerCase()));
        log(`  Already invited: ${alreadyInvited.size} members`);
    } catch (e) {
        log(`  Warning: Could not fetch invite status — ${e.message}`);
    }

    // Also add any already-sent from progress (for resume)
    Object.keys(progress.sent).forEach(email => alreadyInvited.add(email.toLowerCase()));

    // Step 3: Build the to-send list (exclude already invited)
    const toSend = allMembers.filter(m => !alreadyInvited.has(m.email.toLowerCase()));
    const skipped = allMembers.filter(m => alreadyInvited.has(m.email.toLowerCase()));
    
    skipped.forEach(m => {
        progress.skipped[m.email.toLowerCase()] = 'Already invited';
    });

    progress.totalMembers = allMembers.length;
    progress.stats.totalSkipped = Object.keys(progress.skipped).length;

    log(`  To send: ${toSend.length} | Already done: ${alreadyInvited.size} | Total: ${allMembers.length}`);
    
    if (toSend.length === 0) {
        log('  Nothing to send — all members already invited!');
        generateDashboard(progress, allMembers);
        saveProgress(progress);
        return;
    }

    // Step 4: Send in batches
    const totalBatches = Math.ceil(toSend.length / BATCH_SIZE);
    log(`\nStep 4: Sending ${toSend.length} invitations in ${totalBatches} batches of ${BATCH_SIZE}...`);
    log('');

    for (let batchIdx = 0; batchIdx < totalBatches; batchIdx++) {
        const start = batchIdx * BATCH_SIZE;
        const end = Math.min(start + BATCH_SIZE, toSend.length);
        const batch = toSend.slice(start, end);
        const batchNum = batchIdx + 1;

        log(`─── Batch ${batchNum}/${totalBatches} (${batch.length} recipients) ───`);
        
        const batchRecord = {
            batchNum,
            startedAt: new Date().toISOString(),
            recipients: batch.map(m => m.email),
            sent: [],
            failed: [],
            retried: [],
            verified: false
        };

        // Send the batch
        try {
            const customEmails = batch.map(m => ({
                name: m.name,
                email: m.email,
                role: m.role || 'member'
            }));

            const result = await apiPost('evite_send_invites', {
                eventId: EVENT_ID,
                recipientType: 'custom',
                customEmails
            });

            if (result.details) {
                result.details.forEach(d => {
                    const emailLower = d.email.toLowerCase();
                    if (d.sent) {
                        progress.sent[emailLower] = {
                            name: d.name,
                            email: d.email,
                            sentAt: new Date().toISOString(),
                            batchNum,
                            verified: false
                        };
                        batchRecord.sent.push(d.email);
                        log(`  ✓ ${d.name} <${d.email}>`);
                    } else {
                        batchRecord.failed.push({ email: d.email, error: d.error });
                        log(`  ✗ ${d.name} <${d.email}> — ${d.error}`);
                    }
                });
            }

            log(`  Batch ${batchNum} result: Sent ${result.sent || 0}, Failed ${result.failed || 0}`);

        } catch (e) {
            log(`  ✗ Batch ${batchNum} API error: ${e.message}`);
            batch.forEach(m => {
                batchRecord.failed.push({ email: m.email, error: e.message });
            });
        }

        // Retry failures in this batch
        if (batchRecord.failed.length > 0) {
            log(`  Retrying ${batchRecord.failed.length} failures...`);
            await sleep(2000);
            
            const toRetry = [...batchRecord.failed];
            batchRecord.failed = [];

            for (const failedItem of toRetry) {
                const member = batch.find(m => m.email.toLowerCase() === failedItem.email.toLowerCase());
                if (!member) continue;
                
                let retrySuccess = false;
                for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
                    log(`    Retry ${attempt}/${MAX_RETRIES}: ${member.email}...`);
                    await sleep(2000);
                    try {
                        const retryResult = await apiPost('evite_send_invites', {
                            eventId: EVENT_ID,
                            recipientType: 'custom',
                            customEmails: [{ name: member.name, email: member.email, role: member.role || 'member' }]
                        });
                        if (retryResult.sent > 0) {
                            progress.sent[member.email.toLowerCase()] = {
                                name: member.name,
                                email: member.email,
                                sentAt: new Date().toISOString(),
                                batchNum,
                                verified: false,
                                retriedAt: new Date().toISOString(),
                                retryAttempt: attempt
                            };
                            batchRecord.retried.push(member.email);
                            log(`    ✓ Retry succeeded for ${member.email}`);
                            retrySuccess = true;
                            break;
                        }
                    } catch (retryErr) {
                        log(`    ✗ Retry ${attempt} failed: ${retryErr.message}`);
                    }
                }
                if (!retrySuccess) {
                    batchRecord.failed.push(failedItem);
                    progress.failed[member.email.toLowerCase()] = {
                        name: member.name,
                        email: member.email,
                        error: failedItem.error,
                        retries: MAX_RETRIES,
                        lastAttempt: new Date().toISOString()
                    };
                    log(`    ✗ PERMANENT FAIL: ${member.email} after ${MAX_RETRIES} retries`);
                }
            }
        }

        // Verify batch delivery
        log('  Verifying batch delivery...');
        await sleep(VERIFY_DELAY_MS);
        try {
            const status = await apiGet(`evite_invite_status?eventId=${EVENT_ID}`);
            const allInvited = new Set((status.invitations || []).map(i => i.recipientEmail.toLowerCase()));
            let batchVerified = 0;
            
            batchRecord.sent.concat(batchRecord.retried).forEach(email => {
                if (allInvited.has(email.toLowerCase())) {
                    if (progress.sent[email.toLowerCase()]) {
                        progress.sent[email.toLowerCase()].verified = true;
                    }
                    batchVerified++;
                }
            });
            
            batchRecord.verified = true;
            batchRecord.verifiedCount = batchVerified;
            log(`  ✓ Verified: ${batchVerified}/${batchRecord.sent.length + batchRecord.retried.length} confirmed in DB`);
        } catch (e) {
            log(`  ⚠ Verification check failed: ${e.message}`);
        }

        batchRecord.completedAt = new Date().toISOString();
        progress.batches.push(batchRecord);

        // Update stats
        progress.stats.totalSent = Object.keys(progress.sent).length;
        progress.stats.totalFailed = Object.keys(progress.failed).length;
        progress.stats.totalVerified = Object.values(progress.sent).filter(s => s.verified).length;

        // Save progress and regenerate dashboard after each batch
        saveProgress(progress);
        generateDashboard(progress, allMembers);

        // Progress summary
        const pct = ((progress.stats.totalSent + progress.stats.totalSkipped) / allMembers.length * 100).toFixed(1);
        log(`  Progress: ${progress.stats.totalSent} sent + ${progress.stats.totalSkipped} skipped = ${pct}% of ${allMembers.length}`);

        // Wait between batches
        if (batchIdx < totalBatches - 1) {
            log(`  Waiting ${BATCH_DELAY_MS / 1000}s before next batch...\n`);
            await sleep(BATCH_DELAY_MS);
        }
    }

    // Step 5: Final verification
    log('\n═══ FINAL VERIFICATION ═══');
    await sleep(5000);
    try {
        const finalStatus = await apiGet(`evite_invite_status?eventId=${EVENT_ID}`);
        const finalEmails = new Set((finalStatus.invitations || []).map(i => i.recipientEmail.toLowerCase()));
        
        let finalVerified = 0;
        Object.keys(progress.sent).forEach(email => {
            if (finalEmails.has(email)) {
                progress.sent[email].verified = true;
                finalVerified++;
            }
        });
        
        progress.stats.totalVerified = finalVerified;
        progress.stats.totalInDB = finalStatus.summary ? finalStatus.summary.total : finalEmails.size;
        
        log(`  Total in DB: ${progress.stats.totalInDB}`);
        log(`  Verified sent: ${finalVerified}`);
        log(`  Failed (permanent): ${Object.keys(progress.failed).length}`);
        
        // Check for any unverified sends
        const unverified = Object.entries(progress.sent).filter(([_, v]) => !v.verified);
        if (unverified.length > 0) {
            log(`  ⚠ UNVERIFIED: ${unverified.length} emails sent but not found in DB:`);
            unverified.forEach(([email]) => log(`    - ${email}`));
        }
    } catch (e) {
        log(`  ⚠ Final verification failed: ${e.message}`);
    }

    // Step 6: Cleanup duplicates
    log('\nStep 6: Cleaning up any duplicates...');
    try {
        const cleanup = await apiPost('evite_cleanup_invites', { eventId: EVENT_ID });
        log(`  Duplicates removed: ${cleanup.deleted || 0}, Remaining: ${cleanup.remaining || 'unknown'}`);
    } catch (e) {
        log(`  Cleanup warning: ${e.message}`);
    }

    // Final save and dashboard
    progress.completedAt = new Date().toISOString();
    saveProgress(progress);
    generateDashboard(progress, allMembers);

    log('\n═══════════════════════════════════════════════════════════');
    log('  BATCH SEND COMPLETE');
    log(`  Sent: ${progress.stats.totalSent}`);
    log(`  Failed: ${progress.stats.totalFailed}`);
    log(`  Verified: ${progress.stats.totalVerified}`);
    log(`  Skipped (already invited): ${progress.stats.totalSkipped}`);
    log(`  Dashboard: ${DASHBOARD_FILE}`);
    log(`  Progress: ${PROGRESS_FILE}`);
    log(`  Log: ${LOG_FILE}`);
    log('═══════════════════════════════════════════════════════════');
}

// ─── DASHBOARD GENERATOR ─────────────────────────────────────
function generateDashboard(progress, allMembers) {
    const sentList = Object.entries(progress.sent).map(([email, data]) => ({
        email,
        name: data.name,
        sentAt: data.sentAt,
        batchNum: data.batchNum,
        verified: data.verified,
        retried: !!data.retriedAt
    }));
    const failedList = Object.entries(progress.failed).map(([email, data]) => ({
        email,
        name: data.name,
        error: data.error,
        retries: data.retries
    }));
    const skippedList = Object.entries(progress.skipped).map(([email, reason]) => ({
        email,
        reason
    }));

    const stats = progress.stats;
    const totalProcessed = stats.totalSent + stats.totalFailed + stats.totalSkipped;
    const pctComplete = allMembers.length > 0 ? (totalProcessed / allMembers.length * 100).toFixed(1) : 0;
    const pctSent = allMembers.length > 0 ? (stats.totalSent / allMembers.length * 100).toFixed(1) : 0;

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>BANF Evite Batch Send — Live Dashboard</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family:'Segoe UI',system-ui,sans-serif; background:#0f1117; color:#e1e4e8; min-height:100vh; }
  .header { background:linear-gradient(135deg,#1a1f36,#2d1b4e); padding:24px 32px; border-bottom:1px solid #2d333b; }
  .header h1 { font-size:22px; color:#fff; margin-bottom:4px; }
  .header .sub { font-size:13px; color:#8b949e; }
  .header .ts { font-size:11px; color:#6e7681; margin-top:4px; }
  .container { max-width:1200px; margin:0 auto; padding:20px; }
  
  /* KPI Cards */
  .kpi-row { display:grid; grid-template-columns:repeat(auto-fit,minmax(160px,1fr)); gap:12px; margin-bottom:24px; }
  .kpi { background:#161b22; border:1px solid #30363d; border-radius:10px; padding:16px; text-align:center; }
  .kpi .value { font-size:32px; font-weight:700; line-height:1.2; }
  .kpi .label { font-size:11px; color:#8b949e; text-transform:uppercase; letter-spacing:1px; margin-top:4px; }
  .kpi.green .value { color:#3fb950; }
  .kpi.blue .value { color:#58a6ff; }
  .kpi.red .value { color:#f85149; }
  .kpi.yellow .value { color:#d29922; }
  .kpi.purple .value { color:#bc8cff; }
  .kpi.cyan .value { color:#39d2c0; }
  
  /* Progress bar */
  .progress-wrap { background:#161b22; border:1px solid #30363d; border-radius:10px; padding:16px; margin-bottom:24px; }
  .progress-bar { background:#21262d; border-radius:6px; height:28px; overflow:hidden; position:relative; }
  .progress-fill { height:100%; border-radius:6px; transition:width 0.5s; display:flex; align-items:center; justify-content:center; font-size:12px; font-weight:600; }
  .progress-fill.green { background:linear-gradient(90deg,#238636,#3fb950); }
  .progress-label { font-size:13px; color:#8b949e; margin-top:8px; text-align:center; }
  
  /* Batch timeline */
  .section { background:#161b22; border:1px solid #30363d; border-radius:10px; padding:20px; margin-bottom:20px; }
  .section h2 { font-size:16px; color:#c9d1d9; margin-bottom:12px; border-bottom:1px solid #21262d; padding-bottom:8px; }
  .batch-entry { padding:8px 12px; border-left:3px solid #30363d; margin-bottom:8px; font-size:13px; }
  .batch-entry.ok { border-left-color:#3fb950; }
  .batch-entry.partial { border-left-color:#d29922; }
  .batch-entry.fail { border-left-color:#f85149; }
  .batch-entry .num { font-weight:600; color:#58a6ff; }
  .batch-entry .meta { color:#6e7681; font-size:11px; }
  
  /* Tables */
  .tbl-wrap { max-height:400px; overflow-y:auto; }
  table { width:100%; border-collapse:collapse; font-size:12px; }
  th { background:#21262d; color:#8b949e; text-transform:uppercase; font-size:10px; letter-spacing:.5px; padding:8px 10px; text-align:left; position:sticky; top:0; }
  td { padding:6px 10px; border-bottom:1px solid #21262d; color:#c9d1d9; }
  tr:hover td { background:#1c2128; }
  .badge { display:inline-block; padding:2px 8px; border-radius:10px; font-size:10px; font-weight:600; }
  .badge.sent { background:#0d4429; color:#3fb950; }
  .badge.verified { background:#0a3069; color:#58a6ff; }
  .badge.failed { background:#490c0c; color:#f85149; }
  .badge.skipped { background:#2d2304; color:#d29922; }
  .badge.retried { background:#2a1b3d; color:#bc8cff; }
  
  /* Tabs */
  .tabs { display:flex; gap:4px; margin-bottom:16px; }
  .tab { padding:6px 16px; background:#21262d; border:1px solid #30363d; border-radius:6px; cursor:pointer; font-size:12px; color:#8b949e; }
  .tab.active { background:#58a6ff; color:#fff; border-color:#58a6ff; }
  .tab-content { display:none; }
  .tab-content.active { display:block; }
  
  /* Search/filter */
  .search { width:100%; padding:8px 12px; background:#0d1117; border:1px solid #30363d; border-radius:6px; color:#c9d1d9; font-size:13px; margin-bottom:12px; }
  .search:focus { outline:none; border-color:#58a6ff; }
  
  .status-dot { display:inline-block; width:8px; height:8px; border-radius:50%; margin-right:6px; }
  .status-dot.green { background:#3fb950; }
  .status-dot.red { background:#f85149; }
  .status-dot.yellow { background:#d29922; }
  
  .refresh-note { text-align:center; color:#6e7681; font-size:11px; margin-top:16px; padding:8px; }
</style>
</head>
<body>

<div class="header">
  <h1>📊 BANF Evite Batch Send — Live Dashboard</h1>
  <div class="sub">Noboborsho 2026 — Mass Invitation Delivery Monitor</div>
  <div class="ts">Last updated: ${new Date().toLocaleString()} | Started: ${progress.startedAt ? new Date(progress.startedAt).toLocaleString() : 'N/A'}${progress.completedAt ? ' | Completed: ' + new Date(progress.completedAt).toLocaleString() : ''}</div>
</div>

<div class="container">

  <!-- KPI Cards -->
  <div class="kpi-row">
    <div class="kpi blue"><div class="value">${allMembers.length}</div><div class="label">Total Members</div></div>
    <div class="kpi green"><div class="value">${stats.totalSent}</div><div class="label">Emails Sent</div></div>
    <div class="kpi cyan"><div class="value">${stats.totalVerified}</div><div class="label">Verified in DB</div></div>
    <div class="kpi red"><div class="value">${stats.totalFailed}</div><div class="label">Failed</div></div>
    <div class="kpi yellow"><div class="value">${stats.totalSkipped}</div><div class="label">Already Invited</div></div>
    <div class="kpi purple"><div class="value">${progress.batches.length}</div><div class="label">Batches Done</div></div>
  </div>

  <!-- Progress Bar -->
  <div class="progress-wrap">
    <div class="progress-bar">
      <div class="progress-fill green" style="width:${pctComplete}%">${pctComplete}%</div>
    </div>
    <div class="progress-label">${totalProcessed} of ${allMembers.length} processed (${stats.totalSent} sent, ${stats.totalSkipped} already invited, ${stats.totalFailed} failed)</div>
  </div>

  <!-- Tabs -->
  <div class="tabs">
    <div class="tab active" onclick="showTab('sent')">✅ Sent (${sentList.length})</div>
    <div class="tab" onclick="showTab('failed')">❌ Failed (${failedList.length})</div>
    <div class="tab" onclick="showTab('skipped')">⏭️ Skipped (${skippedList.length})</div>
    <div class="tab" onclick="showTab('batches')">📦 Batches (${progress.batches.length})</div>
    <div class="tab" onclick="showTab('rsvp')">📋 RSVP Status</div>
  </div>

  <!-- Sent Tab -->
  <div id="tab-sent" class="tab-content active">
    <div class="section">
      <h2>Sent Emails</h2>
      <input class="search" placeholder="Search by name or email..." oninput="filterTable('sent-table', this.value)" />
      <div class="tbl-wrap">
        <table id="sent-table">
          <thead><tr><th>#</th><th>Name</th><th>Email</th><th>Batch</th><th>Sent At</th><th>Status</th></tr></thead>
          <tbody>
${sentList.map((s, i) => `            <tr>
              <td>${i + 1}</td>
              <td>${esc(s.name)}</td>
              <td>${esc(s.email)}</td>
              <td>${s.batchNum}</td>
              <td>${new Date(s.sentAt).toLocaleTimeString()}</td>
              <td>${s.verified ? '<span class="badge verified">Verified</span>' : '<span class="badge sent">Sent</span>'}${s.retried ? ' <span class="badge retried">Retried</span>' : ''}</td>
            </tr>`).join('\n')}
          </tbody>
        </table>
      </div>
    </div>
  </div>

  <!-- Failed Tab -->
  <div id="tab-failed" class="tab-content">
    <div class="section">
      <h2>Failed Emails</h2>
      ${failedList.length === 0 ? '<p style="color:#3fb950;padding:20px;text-align:center">🎉 No failures! All emails sent successfully.</p>' : `
      <div class="tbl-wrap">
        <table>
          <thead><tr><th>#</th><th>Name</th><th>Email</th><th>Error</th><th>Retries</th></tr></thead>
          <tbody>
${failedList.map((f, i) => `            <tr>
              <td>${i + 1}</td>
              <td>${esc(f.name)}</td>
              <td>${esc(f.email)}</td>
              <td style="color:#f85149">${esc(f.error || 'Unknown')}</td>
              <td>${f.retries}</td>
            </tr>`).join('\n')}
          </tbody>
        </table>
      </div>`}
    </div>
  </div>

  <!-- Skipped Tab -->
  <div id="tab-skipped" class="tab-content">
    <div class="section">
      <h2>Skipped (Already Invited)</h2>
      <div class="tbl-wrap">
        <table>
          <thead><tr><th>#</th><th>Email</th><th>Reason</th></tr></thead>
          <tbody>
${skippedList.map((s, i) => `            <tr><td>${i + 1}</td><td>${esc(s.email)}</td><td><span class="badge skipped">${esc(s.reason)}</span></td></tr>`).join('\n')}
          </tbody>
        </table>
      </div>
    </div>
  </div>

  <!-- Batches Tab -->
  <div id="tab-batches" class="tab-content">
    <div class="section">
      <h2>Batch Timeline</h2>
${progress.batches.map(b => {
    const cls = b.failed.length === 0 ? 'ok' : b.failed.length === b.recipients.length ? 'fail' : 'partial';
    const time = b.startedAt ? new Date(b.startedAt).toLocaleTimeString() : '';
    return `      <div class="batch-entry ${cls}">
        <span class="num">Batch ${b.batchNum}</span> — 
        <span class="status-dot ${cls === 'ok' ? 'green' : cls === 'fail' ? 'red' : 'yellow'}"></span>
        Sent: ${b.sent.length} | Retried: ${b.retried.length} | Failed: ${b.failed.length} | 
        Verified: ${b.verifiedCount || 0}
        <div class="meta">${time}${b.completedAt ? ' → ' + new Date(b.completedAt).toLocaleTimeString() : ''}</div>
      </div>`;
}).join('\n')}
    </div>
  </div>

  <!-- RSVP Tab (placeholder - loads live) -->
  <div id="tab-rsvp" class="tab-content">
    <div class="section">
      <h2>📋 Live RSVP Status</h2>
      <p style="color:#8b949e;margin-bottom:12px">Click "Load Live Data" to fetch current RSVP responses from the server.</p>
      <button onclick="loadRSVP()" style="padding:8px 20px;background:#238636;border:none;color:#fff;border-radius:6px;cursor:pointer;font-size:13px;margin-bottom:16px">Load Live Data</button>
      <div id="rsvp-data" style="min-height:100px"></div>
    </div>
  </div>

  <div class="refresh-note">Dashboard generated from batch progress file. Re-run script or refresh file to update.</div>
</div>

<script>
function showTab(name) {
  document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.getElementById('tab-' + name).classList.add('active');
  event.target.classList.add('active');
}

function filterTable(tableId, query) {
  const rows = document.getElementById(tableId).querySelectorAll('tbody tr');
  const q = query.toLowerCase();
  rows.forEach(row => {
    row.style.display = row.textContent.toLowerCase().includes(q) ? '' : 'none';
  });
}

function esc(s) { const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }

async function loadRSVP() {
  const container = document.getElementById('rsvp-data');
  container.innerHTML = '<p style="color:#58a6ff">Loading...</p>';
  try {
    const resp = await fetch('https://www.jaxbengali.org/_functions/evite_invite_status?eventId=${EVENT_ID}');
    const data = await resp.json();
    const s = data.summary || {};
    let html = '<div class="kpi-row" style="margin-bottom:16px">';
    html += '<div class="kpi green"><div class="value">' + (s.attending||0) + '</div><div class="label">Attending</div></div>';
    html += '<div class="kpi red"><div class="value">' + (s.declined||0) + '</div><div class="label">Declined</div></div>';
    html += '<div class="kpi yellow"><div class="value">' + (s.maybe||0) + '</div><div class="label">Maybe</div></div>';
    html += '<div class="kpi blue"><div class="value">' + (s.pending||0) + '</div><div class="label">Pending</div></div>';
    html += '<div class="kpi cyan"><div class="value">' + (s.totalGuests||0) + '</div><div class="label">Total Guests</div></div>';
    html += '<div class="kpi purple"><div class="value">' + (s.responded||0) + '/' + (s.total||0) + '</div><div class="label">Responded</div></div>';
    html += '</div>';
    html += '<input class="search" placeholder="Search responses..." oninput="filterTable(\\'rsvp-table\\',this.value)" />';
    html += '<div class="tbl-wrap"><table id="rsvp-table"><thead><tr><th>#</th><th>Name</th><th>Email</th><th>Status</th><th>Adults</th><th>Kids</th><th>Food</th><th>Responded</th></tr></thead><tbody>';
    (data.invitations || []).forEach((inv, i) => {
      const status = inv.rsvpStatus === 'yes' ? '<span class="badge sent">Attending</span>'
        : inv.rsvpStatus === 'no' ? '<span class="badge failed">Declined</span>'
        : inv.rsvpStatus === 'maybe' ? '<span class="badge skipped">Maybe</span>'
        : '<span class="badge" style="background:#21262d;color:#6e7681">Pending</span>';
      html += '<tr><td>' + (i+1) + '</td><td>' + esc(inv.recipientName) + '</td><td>' + esc(inv.recipientEmail) + '</td><td>' + status + '</td><td>' + (inv.adults||0) + '</td><td>' + (inv.kids||0) + '</td><td>' + esc(inv.dietary||'-') + '</td><td>' + (inv.respondedAt ? new Date(inv.respondedAt).toLocaleString() : '-') + '</td></tr>';
    });
    html += '</tbody></table></div>';
    container.innerHTML = html;
  } catch(e) {
    container.innerHTML = '<p style="color:#f85149">Error: ' + e.message + '</p>';
  }
}
</script>
</body>
</html>`;

    fs.writeFileSync(DASHBOARD_FILE, html);
}

function esc(str) {
    return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ─── RUN ─────────────────────────────────────────────────────
main().catch(e => {
    log(`FATAL ERROR: ${e.message}`);
    console.error(e);
    process.exit(1);
});
