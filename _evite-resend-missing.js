#!/usr/bin/env node
/**
 * Resend RSVP invitations to 31 members who were never included in the original batch.
 * Event: Nabo Borsho (Noboborsho) 2026 - Saturday April 25, 2026
 * EVENT_ID: 61849b36-68e5-41fc-885d-998feafc21f2
 * 
 * All 254 original batch recipients were confirmed delivered (batches 9-16 retried successfully).
 * These 31 people were simply missing from the invitation list.
 */

const https = require('https');
const fs = require('fs');

const EVENT_ID = '61849b36-68e5-41fc-885d-998feafc21f2';
const WIX_BASE = 'https://www.jaxbengali.org/_functions';
const BATCH_SIZE = 2;           // tiny batches to avoid rate limit
const BATCH_DELAY_MS = 15000;   // 15s between batches
const RATE_LIMIT_WAIT_MS = 3600000; // 1 hour wait on rate limit (stop triggering new windows)
const LOG_FILE = '_evite-resend-log.txt';
const PROGRESS_FILE = '_evite-resend-progress.json';

// 31 people who were never sent the RSVP invitation
const MISSING_RECIPIENTS = [
    { name: 'AB Ghosh', email: 'abghosh.88@gmail.com', role: 'member' },
    { name: 'Ananya Das', email: 'ananyadas999@gmail.com', role: 'ec' },
    { name: 'Anita Mandal', email: 'amandalamandal@yahoo.com', role: 'ec' },
    { name: 'Antara Das', email: 'maildasantara@gmail.com', role: 'member' },
    { name: 'Arnab Sikdar', email: 'callarnabsikdar@gmail.com', role: 'ec' },
    { name: 'Chirajyoti Deb', email: 'drchiradeb@gmail.com', role: 'member' },
    { name: 'Chrissy Das', email: 'chrissy.m.das@gmail.com', role: 'ec' },
    { name: 'Debanjan Mitra', email: 'debanjanmtr@gmail.com', role: 'ec' },
    { name: 'Debkumar Ghosh', email: 'ghoshdebkumar31@gmail.com', role: 'member' },
    { name: 'Irene Sen', email: 'irenesen28@gmail.com', role: 'ec' },
    { name: 'Gourab K', email: 'kgourab90@gmail.com', role: 'member' },
    { name: 'Madhu SN', email: 'madhusn@gmail.com', role: 'member' },
    { name: 'Moumita Mukherjee', email: 'moumita.mukherje@gmail.com', role: 'ec' },
    { name: 'Krishnendu Pal', email: 'pal.krishnendu@mayo.edu', role: 'member' },
    { name: 'Pallavi S', email: 'pallavi.solaiappan@gmail.com', role: 'member' },
    { name: 'Partha Mukhopadhyay', email: 'mukhopadhyay.partha@gmail.com', role: 'ec' },
    { name: 'Prabir Mandal', email: 'prabirmandal@yahoo.com', role: 'member' },
    { name: 'Raghunath Mukherjee', email: 'rnm205@hotmail.com', role: 'ec' },
    { name: 'Ranadhir Ghosh', email: 'ranadhir.ghosh@gmail.com', role: 'ec' },
    { name: 'Ratan Royin', email: 'ratan.royin@gmail.com', role: 'ec' },
    { name: 'Rwiti Choudhury', email: 'rwitichoudhury@gmail.com', role: 'ec' },
    { name: 'Sanjeev', email: 'sanjeev04@gmail.com', role: 'member' },
    { name: 'Sankalan Hazra', email: 'sankalanhazra@gmail.com', role: 'ec' },
    { name: 'Sayani Maitra', email: 'maitra.sayani@gmail.com', role: 'ec' },
    { name: 'Shamit Dutta', email: 'dutta.shamit@mayo.edu', role: 'ec' },
    { name: 'Souvik Chakraborty', email: 'souvikcha@gmail.com', role: 'member' },
    { name: 'Sumanta Ghosh', email: 'sumo475@gmail.com', role: 'ec' },
    { name: 'Supriya', email: 'supriya.lnct2@gmail.com', role: 'ec' },
    { name: 'Tanay Bhaduri', email: 'tanay.bhaduri@gmail.com', role: 'member' },
    { name: 'Tanmay Das', email: 'tanmay0562017@gmail.com', role: 'ec' },
    { name: 'Tanmoy Banerjee', email: 'tanmoy.banerjee2009@gmail.com', role: 'member' }
];

const logLines = [];
function log(msg) {
    const ts = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const line = `[${ts}] ${msg}`;
    console.log(line);
    logLines.push(line);
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function apiPost(endpoint, payload) {
    return new Promise((resolve, reject) => {
        const url = `${WIX_BASE}/${endpoint}`;
        const body = JSON.stringify(payload);
        const u = new URL(url);
        const opts = {
            hostname: u.hostname, port: 443,
            path: u.pathname + u.search,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(body)
            }
        };
        const req = https.request(opts, res => {
            let d = '';
            res.on('data', c => d += c);
            res.on('end', () => {
                try { resolve(JSON.parse(d)); }
                catch { reject(new Error(`Parse error (${res.statusCode}): ${d.substring(0, 200)}`)); }
            });
        });
        req.setTimeout(120000, () => req.destroy(new Error('Request timeout')));
        req.on('error', reject);
        req.write(body);
        req.end();
    });
}

async function main() {
    log('=== RSVP RESEND: 31 Missing Recipients ===');
    log(`Event ID: ${EVENT_ID}`);
    log(`Total recipients: ${MISSING_RECIPIENTS.length}`);
    log(`Batch size: ${BATCH_SIZE}`);
    log('');

    const progress = { sent: {}, failed: {}, batches: [], startedAt: new Date().toISOString() };

    // Check if already partially done
    if (fs.existsSync(PROGRESS_FILE)) {
        try {
            const prev = JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf8'));
            if (prev.sent) {
                Object.assign(progress.sent, prev.sent);
                log(`Resuming: ${Object.keys(prev.sent).length} already sent`);
            }
        } catch { /* ignore */ }
    }

    // Filter out already-sent
    let toSend = MISSING_RECIPIENTS.filter(r => !progress.sent[r.email.toLowerCase()]);
    log(`Sending to ${toSend.length} recipients (${MISSING_RECIPIENTS.length - toSend.length} already sent)`);
    log('');

    // Check for rate limit — if first attempt hits 429, wait and retry
    let rateLimitRetries = 0;
    const MAX_RATE_RETRIES = 5;

    while (toSend.length > 0 && rateLimitRetries < MAX_RATE_RETRIES) {
        const totalBatches = Math.ceil(toSend.length / BATCH_SIZE);
        let hitRateLimit = false;

        for (let b = 0; b < totalBatches; b++) {
            const batch = toSend.slice(b * BATCH_SIZE, (b + 1) * BATCH_SIZE);
            const batchNum = progress.batches.length + 1;

            log(`─── Batch ${batchNum} (${batch.length} recipients) ───`);

            const batchRecord = {
                batchNum, startedAt: new Date().toISOString(),
                recipients: batch.map(m => m.email), sent: [], failed: []
            };

            try {
                const customEmails = batch.map(m => ({
                    name: m.name, email: m.email, role: m.role || 'member'
                }));

                const result = await apiPost('evite_send_invites', {
                    eventId: EVENT_ID,
                    recipientType: 'custom',
                    customEmails
                });

                if (result.details) {
                    let batchRateLimited = false;
                    result.details.forEach(d => {
                        const el = d.email.toLowerCase();
                        const errStr = typeof d.error === 'object' ? JSON.stringify(d.error) : String(d.error || '');
                        if (d.sent) {
                            progress.sent[el] = {
                                name: d.name, email: d.email,
                                sentAt: new Date().toISOString(), batchNum
                            };
                            batchRecord.sent.push(d.email);
                            log(`  ✓ ${d.name} <${d.email}>`);
                        } else if (errStr.includes('429') || errStr.includes('rateLimitExceeded')) {
                            batchRateLimited = true;
                            log(`  ⏳ ${d.name} <${d.email}> — rate limited`);
                        } else {
                            batchRecord.failed.push({ email: d.email, error: d.error });
                            progress.failed[el] = { name: d.name, email: d.email, error: errStr };
                            log(`  ✗ ${d.name} <${d.email}> — ${errStr}`);
                        }
                    });

                    if (batchRateLimited) {
                        hitRateLimit = true;
                        log(`  ⏳ Rate limit hit. Waiting 1 hour to let rate limit window fully expire...`);
                        progress.batches.push(batchRecord);
                        fs.writeFileSync(PROGRESS_FILE, JSON.stringify(progress, null, 2));
                        await sleep(RATE_LIMIT_WAIT_MS);
                        break; // restart from unsent
                    }
                }

                log(`  Batch result: Sent ${result.sent || 0}, Failed ${result.failed || 0}`);

            } catch (e) {
                log(`  ✗ Batch API error: ${e.message}`);
                if (e.message.includes('429') || e.message.includes('rateLimitExceeded')) {
                    hitRateLimit = true;
                    log('  ⏳ Rate limit on API level. Waiting 5 minutes...');
                    progress.batches.push(batchRecord);
                    fs.writeFileSync(PROGRESS_FILE, JSON.stringify(progress, null, 2));
                    await sleep(300000);
                    break;
                }
                // Individual retries for non-rate-limit errors
                for (const member of batch) {
                    log(`    Retrying: ${member.email}...`);
                    await sleep(2000);
                    try {
                        const retryResult = await apiPost('evite_send_invites', {
                            eventId: EVENT_ID,
                            recipientType: 'custom',
                            customEmails: [{ name: member.name, email: member.email, role: member.role || 'member' }]
                        });
                        if (retryResult.sent > 0) {
                            progress.sent[member.email.toLowerCase()] = {
                                name: member.name, email: member.email,
                                sentAt: new Date().toISOString(), batchNum, retried: true
                            };
                            batchRecord.sent.push(member.email);
                            log(`    ✓ Retry OK: ${member.email}`);
                        }
                    } catch (retryErr) {
                        batchRecord.failed.push({ email: member.email, error: retryErr.message });
                        progress.failed[member.email.toLowerCase()] = {
                            name: member.name, email: member.email, error: retryErr.message
                        };
                        log(`    ✗ Retry failed: ${member.email}`);
                    }
                }
            }

            progress.batches.push(batchRecord);
            fs.writeFileSync(PROGRESS_FILE, JSON.stringify(progress, null, 2));

            if (b < totalBatches - 1 && !hitRateLimit) {
                log(`  Waiting ${BATCH_DELAY_MS / 1000}s...`);
                await sleep(BATCH_DELAY_MS);
            }
        }

        // Refresh unsent list
        toSend = MISSING_RECIPIENTS.filter(r => !progress.sent[r.email.toLowerCase()]);
        if (hitRateLimit && toSend.length > 0) {
            rateLimitRetries++;
            log(`\n⏳ Rate limit retry ${rateLimitRetries}/${MAX_RATE_RETRIES}: ${toSend.length} remaining\n`);
        } else {
            break;
        }
    }

    // Summary
    const sentCount = Object.keys(progress.sent).length;
    const failCount = Object.keys(progress.failed).length;
    log('');
    log('=== RESEND SUMMARY ===');
    log(`Total sent:   ${sentCount}/${MISSING_RECIPIENTS.length}`);
    log(`Total failed: ${failCount}`);
    if (failCount > 0) {
        log('Failed emails:');
        Object.values(progress.failed).forEach(f => log(`  ✗ ${f.name} <${f.email}> — ${f.error}`));
    }
    log('');
    log('NOTE: Payel Banerjee has no email address in CRM/contacts/Google — contact via Tanmoy Banerjee (tanmoy.banerjee2009@gmail.com)');

    // Save final state
    fs.writeFileSync(PROGRESS_FILE, JSON.stringify(progress, null, 2));
    fs.writeFileSync(LOG_FILE, logLines.join('\n'));
    log(`Log saved to ${LOG_FILE}`);
    log(`Progress saved to ${PROGRESS_FILE}`);
}

main().catch(e => { log('FATAL: ' + e.message); process.exit(1); });
