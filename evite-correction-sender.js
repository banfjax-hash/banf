#!/usr/bin/env node
/**
 * BANF Evite Correction Batch Sender
 * 
 * Sends date-correction emails to all invitees in batches via the
 * /evite_send_correction endpoint (limit/offset).
 * 
 * Usage:  node evite-correction-sender.js
 * Resume: node evite-correction-sender.js --resume
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

// ─── CONFIG ──────────────────────────────────────────────────
const EVENT_ID = '61849b36-68e5-41fc-885d-998feafc21f2';
const BASE_HOST = 'www.jaxbengali.org';
const BATCH_SIZE = 5;            // keep small — Wix HTTP has ~30s timeout
const BATCH_DELAY_MS = 6000;     // 6s between batches
const MAX_RETRIES = 3;
const PROGRESS_FILE = path.join(__dirname, '_correction-progress.json');
const LOG_FILE = path.join(__dirname, '_correction-log.txt');

const WRONG_TEXT = 'Friday, April 24, 2026';
const CORRECT_TEXT = 'Saturday, April 25, 2026';

// ─── HTTP HELPER ─────────────────────────────────────────────
function apiPost(urlPath, body) {
    return new Promise((resolve, reject) => {
        const data = JSON.stringify(body);
        const options = {
            hostname: BASE_HOST,
            path: `/_functions/${urlPath}`,
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) },
            timeout: 120000
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
        req.on('timeout', () => { req.destroy(); reject(new Error('Request timeout')); });
        req.write(data);
        req.end();
    });
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
function ts() { return new Date().toISOString().replace('T', ' ').slice(0, 19); }

function log(msg) {
    const line = `[${ts()}] ${msg}`;
    console.log(line);
    fs.appendFileSync(LOG_FILE, line + '\n');
}

// ─── PROGRESS ────────────────────────────────────────────────
function loadProgress() {
    if (fs.existsSync(PROGRESS_FILE)) {
        try { return JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf8')); }
        catch (_) {}
    }
    return {
        startTime: new Date().toISOString(),
        currentOffset: 0,
        totalUnique: null,
        batches: [],
        totalSent: 0,
        totalFailed: 0,
        done: false
    };
}

function saveProgress(prog) {
    fs.writeFileSync(PROGRESS_FILE, JSON.stringify(prog, null, 2));
}

// ─── MAIN ────────────────────────────────────────────────────
async function main() {
    const resume = process.argv.includes('--resume');
    let prog = resume ? loadProgress() : loadProgress();

    if (!resume) {
        // Fresh start
        prog = {
            startTime: new Date().toISOString(),
            currentOffset: 0,
            totalUnique: null,
            batches: [],
            totalSent: 0,
            totalFailed: 0,
            done: false
        };
        saveProgress(prog);
    }

    log(`=== Correction batch sender ${resume ? 'RESUMING' : 'STARTING'} ===`);
    log(`Event: ${EVENT_ID}`);
    log(`Wrong: "${WRONG_TEXT}" → Correct: "${CORRECT_TEXT}"`);
    log(`Batch size: ${BATCH_SIZE}, delay: ${BATCH_DELAY_MS}ms`);
    if (resume) log(`Resuming from offset ${prog.currentOffset}, already sent ${prog.totalSent}`);

    let batchNum = prog.batches.length;
    let hasMore = true;

    while (hasMore) {
        batchNum++;
        const offset = prog.currentOffset;
        log(`\n--- Batch ${batchNum} (offset=${offset}, limit=${BATCH_SIZE}) ---`);

        let result;
        let retries = 0;
        while (retries <= MAX_RETRIES) {
            try {
                result = await apiPost('evite_send_correction', {
                    eventId: EVENT_ID,
                    wrongText: WRONG_TEXT,
                    correctText: CORRECT_TEXT,
                    limit: BATCH_SIZE,
                    offset: offset
                });
                break;
            } catch (e) {
                retries++;
                log(`  ⚠ Batch ${batchNum} attempt ${retries} failed: ${e.message}`);
                if (retries > MAX_RETRIES) {
                    log(`  ✗ Batch ${batchNum} FAILED after ${MAX_RETRIES} retries. Stopping.`);
                    prog.done = false;
                    saveProgress(prog);
                    return;
                }
                log(`  Retrying in ${BATCH_DELAY_MS * 2}ms...`);
                await sleep(BATCH_DELAY_MS * 2);
            }
        }

        if (result.error) {
            log(`  ✗ API error: ${result.error}`);
            log('  Stopping due to API error.');
            saveProgress(prog);
            return;
        }

        const batchResult = {
            batchNum,
            offset,
            sent: result.sent || 0,
            failed: result.failed || 0,
            batchSize: result.batchSize || 0,
            hasMore: result.hasMore,
            details: result.details || [],
            timestamp: new Date().toISOString()
        };

        prog.batches.push(batchResult);
        prog.totalSent += batchResult.sent;
        prog.totalFailed += batchResult.failed;
        if (prog.totalUnique === null) prog.totalUnique = result.total;

        log(`  ✓ Sent: ${batchResult.sent}, Failed: ${batchResult.failed}, BatchSize: ${batchResult.batchSize}`);
        log(`  Running total: ${prog.totalSent} sent, ${prog.totalFailed} failed of ${prog.totalUnique}`);

        // Log individual results
        for (const d of batchResult.details) {
            const icon = d.sent ? '✓' : '✗';
            log(`    ${icon} ${d.name} <${d.email}>${d.error ? ' ERR: ' + d.error : ''}`);
        }

        hasMore = result.hasMore;
        prog.currentOffset = result.nextOffset;
        saveProgress(prog);

        if (hasMore) {
            log(`  Waiting ${BATCH_DELAY_MS}ms before next batch...`);
            await sleep(BATCH_DELAY_MS);
        }
    }

    prog.done = true;
    prog.endTime = new Date().toISOString();
    saveProgress(prog);

    log(`\n=== CORRECTION COMPLETE ===`);
    log(`Total sent: ${prog.totalSent}`);
    log(`Total failed: ${prog.totalFailed}`);
    log(`Total unique recipients: ${prog.totalUnique}`);
    log(`Batches: ${prog.batches.length}`);
    log(`Duration: ${((new Date(prog.endTime) - new Date(prog.startTime)) / 1000).toFixed(0)}s`);
}

main().catch(e => {
    log(`FATAL: ${e.message}`);
    console.error(e);
    process.exit(1);
});
