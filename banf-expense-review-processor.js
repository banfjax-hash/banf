#!/usr/bin/env node
/**
 * ═══════════════════════════════════════════════════════════════
 *  BANF — Expense Review Processor
 * ═══════════════════════════════════════════════════════════════
 *
 *  Processes the Treasurer's expense review submission:
 *    1. Reads the submitted review JSON
 *    2. Applies corrections to banf-ledger.json (re-tag events, remove, add)
 *    3. Stores learnings in agent-memory-store.json
 *    4. Regenerates the Bosonto Utsob event ledger
 *    5. Sends updated ledger to VP and President for approval
 *
 *  Usage:
 *    node banf-expense-review-processor.js [path-to-submission.json]
 *
 *  If no path is given, looks for banf-expense-review-submission.json
 * ═══════════════════════════════════════════════════════════════
 */

const fs   = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const LEDGER_FILE   = path.join(__dirname, 'banf-ledger.json');
const MEMORY_FILE   = path.join(__dirname, 'agent-memory-store.json');
const REVIEW_FILE   = process.argv[2] || path.join(__dirname, 'banf-expense-review-submission.json');
const OUT_LEARNINGS = path.join(__dirname, 'banf-expense-review-learnings.json');

function loadJSON(fp) { try { return JSON.parse(fs.readFileSync(fp, 'utf8')); } catch { return null; } }
function saveJSON(fp, data) { fs.writeFileSync(fp, JSON.stringify(data, null, 2)); }
function fmt$(n) { return '$' + n.toFixed(2); }

// ═══════════════════════════════════════════════════════════════
//  PHASE 1: LOAD AND VALIDATE SUBMISSION
// ═══════════════════════════════════════════════════════════════

function loadSubmission() {
    console.log('═══ Phase 1: Loading President\'s Review ═══');
    
    if (!fs.existsSync(REVIEW_FILE)) {
        console.error('ERROR: Review file not found:', REVIEW_FILE);
        console.error('Place banf-expense-review-submission.json in the project root');
        process.exit(1);
    }

    const review = loadJSON(REVIEW_FILE);
    if (!review || !review.items) {
        console.error('ERROR: Invalid review file format');
        process.exit(1);
    }

    console.log(`  Reviewed by: ${review.reviewedBy} (${review.reviewerRole})`);
    console.log(`  Reviewed at: ${review.reviewedAt}`);
    console.log(`  Items: ${review.items.length}`);
    console.log(`  General comments: ${review.generalComments ? 'YES' : 'none'}`);
    
    const changes = review.items.filter(i => 
        i.action !== 'keep' || 
        i.assignedEvent !== i.event || 
        i.presidentComment
    );
    console.log(`  Items with changes/comments: ${changes.length}`);

    return review;
}

// ═══════════════════════════════════════════════════════════════
//  PHASE 2: APPLY CORRECTIONS TO LEDGER
// ═══════════════════════════════════════════════════════════════

function applyCorrections(review) {
    console.log('\n═══ Phase 2: Applying Corrections to Ledger ═══');

    const ledger = loadJSON(LEDGER_FILE);
    if (!ledger) { console.error('ERROR: Cannot load ledger'); process.exit(1); }

    const corrections = [];
    let added = 0, removed = 0, retagged = 0, modified = 0;

    for (const item of review.items) {
        const entry = ledger.entries.find(e => e.id === item.id);

        // ACTION: REMOVE
        if (item.action === 'remove') {
            if (entry) {
                const idx = ledger.entries.indexOf(entry);
                ledger.entries.splice(idx, 1);
                removed++;
                corrections.push({
                    type: 'removed',
                    id: item.id,
                    payee: item.payee,
                    amount: item.amount,
                    reason: item.treasurerComment || item.presidentComment || 'Removed by Treasurer review',
                });
                console.log(`  \u2717 REMOVED: ${item.payee} ${fmt$(item.amount)} \u2014 ${item.treasurerComment || item.presidentComment || 'no comment'}`);
            }
            continue;
        }

        // ACTION: RE-TAG EVENT
        if (entry && item.assignedEvent !== item.event) {
            const oldEvent = entry.event;
            entry.event = item.assignedEvent;
            retagged++;
            corrections.push({
                type: 'retagged',
                id: item.id,
                payee: item.payee,
                amount: item.amount,
                from: oldEvent,
                to: item.assignedEvent,
                reason: item.treasurerComment || item.presidentComment || 'Reassigned by Treasurer',
            });
            console.log(`  ↔ RETAGGED: ${item.payee} ${fmt$(item.amount)}: ${oldEvent} → ${item.assignedEvent}`);
        }

        // ACTION: MODIFY (update category, memo etc based on comment)
        if (item.action === 'modify' && entry) {
            // If comment mentions a category, try to update
            const comment = item.treasurerComment || item.presidentComment || '';
            if (comment) {
                const catMatch = comment.match(/category:\s*(.+?)(?:,|\.|$)/i);
                if (catMatch) entry.category = catMatch[1].trim();
                const memoMatch = comment.match(/memo:\s*(.+?)(?:,|\.|$)/i);
                if (memoMatch) entry.memo = memoMatch[1].trim();
            }
            modified++;
            corrections.push({
                type: 'modified',
                id: item.id,
                payee: item.payee,
                amount: item.amount,
                comment: item.treasurerComment || item.presidentComment,
            });
            console.log(`  \u270e MODIFIED: ${item.payee} \u2014 ${item.treasurerComment || item.presidentComment}`);
        }

        // NEW EXPENSES
        if (item.isNew && item.action !== 'remove') {
            const newEntry = {
                id: item.id,
                type: 'expense',
                to: item.payee,
                amount: item.amount,
                date: item.date,
                memo: item.memo || '',
                confirmation: item.conf || '',
                subj: 'President review — manual entry',
                event: item.assignedEvent || 'Bosonto Utsob 2026',
                category: item.category,
            };
            ledger.entries.push(newEntry);
            added++;
            corrections.push({
                type: 'added',
                id: item.id,
                payee: item.payee,
                amount: item.amount,
                event: newEntry.event,
                category: item.category,
                note: item.memo,
            });
            console.log(`  ➕ ADDED: ${item.payee} ${fmt$(item.amount)} [${item.category}] — ${item.memo}`);
        }
    }

    // Recalculate totals
    ledger.totalIncome = ledger.entries.filter(e => e.type === 'income').reduce((s,e) => s + e.amount, 0);
    ledger.totalExpense = ledger.entries.filter(e => e.type === 'expense').reduce((s,e) => s + e.amount, 0);
    ledger.net = ledger.totalIncome - ledger.totalExpense;
    ledger.lastUpdated = new Date().toISOString();

    saveJSON(LEDGER_FILE, ledger);

    console.log(`\n  Summary: +${added} added, -${removed} removed, ↔${retagged} retagged, ✎${modified} modified`);
    console.log(`  Ledger updated: income=${fmt$(ledger.totalIncome)}, expense=${fmt$(ledger.totalExpense)}, net=${fmt$(ledger.net)}`);

    return { corrections, ledger };
}

// ═══════════════════════════════════════════════════════════════
//  PHASE 3: STORE LEARNINGS
// ═══════════════════════════════════════════════════════════════

function storeLearnings(review, corrections) {
    console.log('\n═══ Phase 3: Storing Learnings ═══');

    const learnings = {
        reviewId: 'REVIEW-' + Date.now(),
        reviewedBy: review.reviewedBy,
        reviewedAt: review.reviewedAt,
        event: review.event,
        corrections,
        generalComments: review.generalComments,
        // Extract learning rules from comments
        rules: extractRules(review),
        createdAt: new Date().toISOString(),
    };

    saveJSON(OUT_LEARNINGS, learnings);
    console.log(`  Learnings saved: ${OUT_LEARNINGS}`);
    console.log(`  Rules extracted: ${learnings.rules.length}`);
    learnings.rules.forEach(r => console.log(`    • ${r.description}`));

    // Also append to agent memory
    try {
        const memory = loadJSON(MEMORY_FILE) || [];
        memory.push({
            id: 'MEM-' + Date.now() + '-review',
            type: 'learning',
            content: `Treasurer review of Bosonto Utsob 2026 expenses: ${corrections.length} corrections applied. ${review.generalComments || 'No general comments.'}`,
            tags: ['expense_review', 'bosonto_utsob_2026', 'treasurer_input'],
            context: {
                event: 'Bosonto Utsob 2026',
                reviewer: review.reviewedBy,
                correctionsCount: corrections.length,
                rules: learnings.rules,
                generalComments: review.generalComments,
            },
            source: 'expense_review_form',
            impact: 'high',
            createdAt: new Date().toISOString(),
            confidence: 1,
        });
        saveJSON(MEMORY_FILE, memory);
        console.log('  Agent memory updated ✓');
    } catch (e) {
        console.log('  Warning: Could not update agent memory:', e.message);
    }

    return learnings;
}

function extractRules(review) {
    const rules = [];
    const comments = review.generalComments || '';

    // Extract learning rules from per-item comments
    for (const item of review.items) {
        const comment = item.treasurerComment || item.presidentComment || '';
        if (!comment) continue;
        const c = comment.toLowerCase();

        if (item.assignedEvent !== item.event) {
            rules.push({
                type: 'event_assignment',
                trigger: { payee: item.payee, dateRange: item.date, category: item.category },
                action: `Assign to ${item.assignedEvent} instead of ${item.event}`,
                description: `${item.payee} expense on ${item.date} belongs to ${item.assignedEvent} (was ${item.event}): ${comment}`,
                confidence: 1.0,
            });
        }
        if (item.action === 'remove') {
            rules.push({
                type: 'exclusion',
                trigger: { payee: item.payee, pattern: item.memo },
                action: 'Exclude from event ledger',
                description: `Exclude ${item.payee}: ${comment}`,
                confidence: 1.0,
            });
        }
        if (/venue|booking|paid.*personal|personal.*account/i.test(comment)) {
            rules.push({
                type: 'venue_payment',
                trigger: { payee: item.payee },
                action: 'Track as venue expense with personal payment note',
                description: `Venue payment context: ${comment}`,
                confidence: 0.9,
            });
        }
    }

    // Extract rules from general comments
    if (comments) {
        if (/suvankar.*personal|personal.*suvankar/i.test(comments)) {
            rules.push({
                type: 'payment_source',
                trigger: { member: 'Suvankar Paul' },
                action: 'Note: Suvankar sometimes pays from personal account — verify source',
                description: `Treasurer noted Suvankar personal payments: ${comments.slice(0, 200)}`,
                confidence: 0.9,
            });
        }
        if (/sanjeev.*venue|venue.*sanjeev/i.test(comments)) {
            rules.push({
                type: 'venue_contact',
                trigger: { contact: 'Sanjeev K. Howlader', venue: 'COJ Parks' },
                action: 'Sanjeev is venue booking contact via COJ Parks & Recreation',
                description: `Venue booking via Sanjeev: ${comments.slice(0, 200)}`,
                confidence: 1.0,
            });
        }
    }

    return rules;
}

// ═══════════════════════════════════════════════════════════════
//  PHASE 4: REGENERATE EVENT LEDGER
// ═══════════════════════════════════════════════════════════════

function regenerateLedger() {
    console.log('\n═══ Phase 4: Regenerating Bosonto Utsob Event Ledger ═══');
    try {
        const output = execSync('node banf-bosonto-utsob-event-ledger.js', { encoding: 'utf8', cwd: __dirname });
        console.log(output);
        return true;
    } catch (e) {
        console.error('  ERROR regenerating ledger:', e.message);
        return false;
    }
}

// ═══════════════════════════════════════════════════════════════
//  PHASE 5: EMAIL UPDATED LEDGER TO VP AND PRESIDENT FOR APPROVAL
// ═══════════════════════════════════════════════════════════════

async function emailForApproval(review, corrections) {
    console.log('\n═══ Phase 5: Emailing Updated Ledger to VP & President for Approval ═══');

    const { getToken, sendEmail, sanitizeSubjectForMIME } = require('./banf-gmail-config');

    const ledgerData = loadJSON(path.join(__dirname, 'banf-bosonto-event-ledger.json'));

    const VP_EMAIL = 'duttasoumyajit86@gmail.com';
    const VP_NAME = 'Soumyajit Dutta';
    const PRESIDENT_EMAIL = 'ranadhir.ghosh@gmail.com';
    const PRESIDENT_NAME = 'Dr. Ranadhir Ghosh';
    const treasurerName = review.reviewedBy;

    const changesHtml = corrections.map(c => {
        switch(c.type) {
            case 'added': return `<li>➕ <strong>Added:</strong> ${c.payee} — ${fmt$(c.amount)} [${c.category}] ${c.procId ? '(Ticket: '+c.procId+')' : ''} ${c.note ? '('+c.note+')' : ''}</li>`;
            case 'removed': return `<li>✗ <strong>Removed:</strong> ${c.payee} — ${fmt$(c.amount)}. Reason: ${c.reason}</li>`;
            case 'retagged': return `<li>↔ <strong>Reassigned:</strong> ${c.payee} — ${fmt$(c.amount)} moved from ${c.from} → ${c.to}. ${c.reason}</li>`;
            case 'modified': return `<li>✎ <strong>Modified:</strong> ${c.payee} — ${c.comment}</li>`;
            default: return '';
        }
    }).join('\n');

    function buildEmailBody(recipientName, recipientRole) {
        return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="font-family:'Segoe UI',system-ui,sans-serif;color:#1e293b;line-height:1.6;max-width:700px;margin:0 auto;padding:20px">
  <div style="background:linear-gradient(135deg,#0a6847,#0d8a5c);color:#fff;padding:20px 24px;border-radius:10px;margin-bottom:20px">
    <h2 style="margin:0;font-size:1.2rem">Bosonto Utsob 2026 - Event Expense Ledger (${recipientRole} Approval)</h2>
    <p style="margin:4px 0 0;opacity:.85;font-size:.85rem">Treasurer's Review Complete - ${recipientRole} Approval Required</p>
  </div>

  <p>Dear <strong>${recipientName}</strong>,</p>
  
  <p>Treasurer <strong>${treasurerName}</strong> has completed the itemized expense review for <strong>Bosonto Utsob 2026</strong>. 
  Please review and approve the event expense ledger below.</p>

  ${corrections.length > 0 ? `
  <div style="background:#f8fafc;border-left:3px solid #0a6847;padding:12px 16px;border-radius:0 6px 6px 0;margin:16px 0">
    <strong>Changes Applied by Treasurer (${corrections.length}):</strong>
    <ul style="margin:8px 0 0;padding-left:20px">${changesHtml}</ul>
  </div>` : '<p><em>No corrections were made - all expenses confirmed as-is by the Treasurer.</em></p>'}

  ${review.generalComments ? `
  <div style="background:#fffbeb;border-left:3px solid #c8a951;padding:12px 16px;border-radius:0 6px 6px 0;margin:16px 0">
    <strong>Treasurer's Comments:</strong><br>
    <em>${review.generalComments.replace(/\n/g, '<br>')}</em>
  </div>` : ''}

  <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:16px;margin:16px 0">
    <h3 style="margin:0 0 8px;color:#166534;font-size:1rem">Financial Summary</h3>
    <table style="border-collapse:collapse;font-size:.9rem">
      <tr><td style="padding:4px 16px 4px 0"><strong>Total Income:</strong></td><td style="color:#16a34a;font-weight:700">${ledgerData ? fmt$(ledgerData.summary.totalIncome) : 'N/A'}</td></tr>
      <tr><td style="padding:4px 16px 4px 0"><strong>Total Expenses:</strong></td><td style="color:#dc2626;font-weight:700">${ledgerData ? fmt$(ledgerData.summary.totalExpense) : 'N/A'}</td></tr>
      <tr><td style="padding:4px 16px 4px 0;border-top:2px solid #e2e8f0"><strong>Net Surplus:</strong></td><td style="color:#2563eb;font-weight:800;border-top:2px solid #e2e8f0">${ledgerData ? fmt$(ledgerData.summary.netSurplus) : 'N/A'}</td></tr>
    </table>
  </div>

  <div style="background:#dbeafe;padding:12px;border-radius:6px;font-size:.88rem;margin:16px 0">
    <strong>Approval Workflow:</strong><br>
    Step 1: Treasurer (Amit Chandak) - Itemized review COMPLETE<br>
    Step 2: Vice President (Soumyajit Dutta) - Approval ${recipientRole === 'Vice President' ? '<-- YOU ARE HERE' : ''}<br>
    Step 3: President (Dr. Ranadhir Ghosh) - Final approval ${recipientRole === 'President' ? '<-- YOU ARE HERE' : ''}<br>
    <em>After all approvals, the ledger becomes the official event expense record.</em>
  </div>

  <p style="background:#f0fdf4;padding:12px;border-radius:6px;font-size:.88rem">
    <strong>Action Required:</strong> Please review the event ledger and reply to this email with <strong>"APPROVED"</strong> 
    or provide specific feedback for correction. The full report is available at: 
    <a href="https://banfjax-hash.github.io/banf/banf-bosonto-event-ledger.html">Event Ledger Report</a>
  </p>

  <p style="color:#64748b;font-size:.82rem;margin-top:20px">
    Thanks and Regards,<br>
    BANF Financial Reconciliation System<br>
    <em>Auto-generated after Treasurer's expense review</em>
  </p>
</body>
</html>`;
    }

    const subject = sanitizeSubjectForMIME('BANF Bosonto Utsob 2026 - Expense Ledger Approval Required');

    try {
        const token = await getToken();

        // Email VP
        const vpResult = await sendEmail(token, VP_EMAIL, null, subject, buildEmailBody(VP_NAME, 'Vice President'));
        if (vpResult.status === 200) {
            console.log(`  ✅ Email sent to VP ${VP_NAME} (${VP_EMAIL}) — Message ID: ${vpResult.data.id || 'sent'}`);
        } else {
            console.error(`  ❌ VP email failed (HTTP ${vpResult.status}):`, JSON.stringify(vpResult.data));
        }

        // Email President
        const presResult = await sendEmail(token, PRESIDENT_EMAIL, null, subject, buildEmailBody(PRESIDENT_NAME, 'President'));
        if (presResult.status === 200) {
            console.log(`  ✅ Email sent to President ${PRESIDENT_NAME} (${PRESIDENT_EMAIL}) — Message ID: ${presResult.data.id || 'sent'}`);
        } else {
            console.error(`  ❌ President email failed (HTTP ${presResult.status}):`, JSON.stringify(presResult.data));
        }

        return (vpResult.status === 200 && presResult.status === 200);
    } catch (e) {
        console.error('  ❌ Failed to email VP/President:', e.message);
        return false;
    }
}

// ═══════════════════════════════════════════════════════════════
//  MAIN
// ═══════════════════════════════════════════════════════════════

(async () => {
    console.log('╔═══════════════════════════════════════════════════╗');
    console.log('║  BANF Expense Review Processor                   ║');
    console.log('║  Bosonto Utsob 2026                              ║');
    console.log('╚═══════════════════════════════════════════════════╝\n');

    // 1. Load submission
    const review = loadSubmission();

    // 2. Apply corrections
    const { corrections, ledger } = applyCorrections(review);

    // 3. Store learnings
    const learnings = storeLearnings(review, corrections);

    // 4. Regenerate event ledger
    const regen = regenerateLedger();

    // 5. Email to VP and President for approval
    const emailed = await emailForApproval(review, corrections);

    console.log('\n╔═══════════════════════════════════════════════════╗');
    console.log('║  Processing Complete                              ║');
    console.log('╠═══════════════════════════════════════════════════╣');
    console.log(`║  Corrections applied: ${corrections.length.toString().padEnd(28)}║`);
    console.log(`║  Rules learned: ${learnings.rules.length.toString().padEnd(33)}║`);
    console.log(`║  Ledger regenerated: ${regen ? 'YES' : 'FAILED'}${' '.repeat(regen ? 28 : 25)}║`);
    console.log(`║  VP notified:        ${emailed ? 'YES' : 'FAILED'}${' '.repeat(emailed ? 28 : 25)}║`);
    console.log(`║  President notified: ${emailed ? 'YES' : 'FAILED'}${' '.repeat(emailed ? 28 : 25)}║`);
    console.log('╚═══════════════════════════════════════════════════╝');
})();
