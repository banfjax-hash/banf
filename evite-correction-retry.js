#!/usr/bin/env node
/**
 * BANF Evite Correction Retry Sender
 * 
 * Retries sending correction emails to recipients that failed (429 rate limit).
 * Reads failed emails from _correction-progress.json and sends via the
 * evite_send_correction endpoint using the 'emails' filter.
 * 
 * Usage:  node evite-correction-retry.js
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

// ─── CONFIG ──────────────────────────────────────────────────
const EVENT_ID = '61849b36-68e5-41fc-885d-998feafc21f2';
const BASE_HOST = 'www.jaxbengali.org';
const BATCH_SIZE = 5;
const BATCH_DELAY_MS = 8000;     // 8s between batches (conservative after rate limit)
const MAX_RETRIES = 3;
const PROGRESS_FILE = path.join(__dirname, '_correction-progress.json');
const RETRY_PROGRESS_FILE = path.join(__dirname, '_correction-retry-progress.json');
const LOG_FILE = path.join(__dirname, '_correction-retry-log.txt');

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
    try { fs.appendFileSync(LOG_FILE, line + '\n'); } catch (_) {}
}

// ─── MAIN ────────────────────────────────────────────────────
async function main() {
    // Extract failed emails from original progress
    const origProgress = JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf8'));
    const failedEmails = [];
    origProgress.batches.forEach(b => {
        b.details.forEach(d => {
            if (!d.sent) failedEmails.push(d.email);
        });
    });

    if (failedEmails.length === 0) {
        log('No failed emails to retry!');
        return;
    }

    // Check for existing retry progress
    let retryProg;
    if (fs.existsSync(RETRY_PROGRESS_FILE)) {
        retryProg = JSON.parse(fs.readFileSync(RETRY_PROGRESS_FILE, 'utf8'));
        // Remove already-sent emails from retry list
        const sentSet = new Set(retryProg.sentEmails || []);
        const remaining = failedEmails.filter(e => !sentSet.has(e.toLowerCase()));
        log(`Resuming: ${retryProg.sentEmails.length} already sent, ${remaining.length} remaining`);
        retryProg.remaining = remaining;
    } else {
        retryProg = {
            startTime: new Date().toISOString(),
            totalToRetry: failedEmails.length,
            sentEmails: [],
            failedEmails: [],
            batches: [],
            remaining: [...failedEmails]
        };
    }

    log(`=== Correction RETRY starting ===`);
    log(`Total to retry: ${retryProg.remaining.length} of ${failedEmails.length}`);
    log(`Batch size: ${BATCH_SIZE}, delay: ${BATCH_DELAY_MS}ms`);

    let batchNum = retryProg.batches.length;

    while (retryProg.remaining.length > 0) {
        batchNum++;
        const batchEmails = retryProg.remaining.slice(0, BATCH_SIZE);
        log(`\n--- Retry Batch ${batchNum} (${batchEmails.length} emails) ---`);

        let result;
        let retries = 0;
        while (retries <= MAX_RETRIES) {
            try {
                result = await apiPost('evite_send_correction', {
                    eventId: EVENT_ID,
                    wrongText: WRONG_TEXT,
                    correctText: CORRECT_TEXT,
                    emails: batchEmails,
                    limit: BATCH_SIZE,
                    offset: 0
                });
                break;
            } catch (e) {
                retries++;
                log(`  ⚠ Attempt ${retries} failed: ${e.message}`);
                if (retries > MAX_RETRIES) {
                    log(`  ✗ FAILED after ${MAX_RETRIES} retries. Stopping.`);
                    retryProg.endTime = new Date().toISOString();
                    fs.writeFileSync(RETRY_PROGRESS_FILE, JSON.stringify(retryProg, null, 2));
                    return;
                }
                // Check if it's a rate limit - wait longer
                if (e.message.includes('429') || e.message.includes('rate')) {
                    log(`  Rate limit detected, waiting 60s...`);
                    await sleep(60000);
                } else {
                    await sleep(BATCH_DELAY_MS * 2);
                }
            }
        }

        if (result.error) {
            log(`  ✗ API error: ${result.error}`);
            // Check for rate limit in error
            if (String(result.error).includes('429') || String(result.error).includes('rate')) {
                log('  Rate limit in API response, waiting 60s...');
                await sleep(60000);
                continue; // retry same batch
            }
            log('  Stopping due to API error.');
            fs.writeFileSync(RETRY_PROGRESS_FILE, JSON.stringify(retryProg, null, 2));
            return;
        }

        const batchResult = {
            batchNum,
            sent: result.sent || 0,
            failed: result.failed || 0,
            details: result.details || [],
            timestamp: new Date().toISOString()
        };
        retryProg.batches.push(batchResult);

        // Track results
        let batchSentCount = 0;
        let batchFailedCount = 0;
        let hitRateLimit = false;
        for (const d of batchResult.details) {
            const icon = d.sent ? '✓' : '✗';
            log(`    ${icon} ${d.name} <${d.email}>${d.error ? ' ERR: ' + d.error : ''}`);
            if (d.sent) {
                retryProg.sentEmails.push(d.email.toLowerCase());
                retryProg.remaining = retryProg.remaining.filter(e => e.toLowerCase() !== d.email.toLowerCase());
                batchSentCount++;
            } else {
                if (d.error && (d.error.includes('429') || d.error.includes('rate'))) {
                    hitRateLimit = true;
                }
                batchFailedCount++;
            }
        }

        log(`  ✓ Batch: ${batchSentCount} sent, ${batchFailedCount} failed | Remaining: ${retryProg.remaining.length}`);
        fs.writeFileSync(RETRY_PROGRESS_FILE, JSON.stringify(retryProg, null, 2));

        if (hitRateLimit) {
            // Parse the "Retry after" timestamp from the error to calculate exact wait
            let waitMs = 900000; // default 15 min
            for (const d of batchResult.details) {
                if (d.error) {
                    const m = d.error.match(/Retry after (\d{4}-\d{2}-\d{2}T[\d:.]+Z)/);
                    if (m) {
                        const retryAt = new Date(m[1]).getTime();
                        const nowMs = Date.now();
                        const diff = retryAt - nowMs + 30000; // add 30s buffer
                        if (diff > 0 && diff < 3600000) waitMs = Math.max(waitMs, diff);
                    }
                }
            }
            log(`  Rate limit hit! Waiting ${Math.ceil(waitMs/60000)} minutes until rate limit clears...`);
            await sleep(waitMs);
            continue;
        }

        // Remove successfully sent from remaining (already done above)
        // Remove permanently failed (non-rate-limit) from remaining too
        for (const d of batchResult.details) {
            if (!d.sent && d.error && !d.error.includes('429') && !d.error.includes('rate')) {
                retryProg.failedEmails.push(d.email.toLowerCase());
                retryProg.remaining = retryProg.remaining.filter(e => e.toLowerCase() !== d.email.toLowerCase());
            }
        }

        if (retryProg.remaining.length > 0) {
            log(`  Waiting ${BATCH_DELAY_MS}ms before next batch...`);
            await sleep(BATCH_DELAY_MS);
        }
    }

    retryProg.endTime = new Date().toISOString();
    fs.writeFileSync(RETRY_PROGRESS_FILE, JSON.stringify(retryProg, null, 2));

    log(`\n=== RETRY COMPLETE ===`);
    log(`Sent: ${retryProg.sentEmails.length}`);
    log(`Permanently failed: ${retryProg.failedEmails.length}`);
    log(`Remaining: ${retryProg.remaining.length}`);
}

main().catch(e => {
    log(`FATAL: ${e.message}`);
    console.error(e);
    process.exit(1);
});
