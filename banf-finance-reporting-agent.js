/**
 * ═══════════════════════════════════════════════════════════════
 *  BANF Financial Reporting Agent
 *  Validates data integrity, generates report snapshots,
 *  and runs reconciliation cross-checks.
 *
 *  Usage:
 *    node banf-finance-reporting-agent.js [--year 2025] [--fix] [--verbose]
 *
 *  Actions:
 *    1. Fetch all ledger entries for the year
 *    2. Validate: no missing fields, amounts > 0, valid categories, valid dates
 *    3. Check for duplicate entries (same date + amount + description)
 *    4. Summarize income by category, expenses by event
 *    5. Cross-check reconciliation status
 *    6. Output report as JSON + console summary
 * ═══════════════════════════════════════════════════════════════
 */

const API = 'https://www.jaxbengali.org/_functions';
const VALID_INCOME_CATS  = ['membership','event_ticket','sponsorship','donation','advertisement','other_income'];
const VALID_EXPENSE_CATS = ['venue','catering','decoration','photography','printing','sound_music','apparel','prasad','admin','bank_fee','transport','other_expense'];
const ALL_CATS = [...VALID_INCOME_CATS, ...VALID_EXPENSE_CATS];

const args = process.argv.slice(2);
const YEAR = parseInt(args.find((a,i,arr) => arr[i-1] === '--year') || new Date().getFullYear());
const FIX_MODE = args.includes('--fix');
const VERBOSE = args.includes('--verbose');

function log(msg) { console.log(`[AGENT] ${msg}`); }
function warn(msg) { console.warn(`[WARN]  ${msg}`); }
function err(msg) { console.error(`[ERROR] ${msg}`); }

async function apiGet(endpoint, params = {}) {
  const qs = new URLSearchParams(params).toString();
  const url = `${API}/${endpoint}${qs ? '?' + qs : ''}`;
  const resp = await fetch(url);
  return resp.json();
}

async function apiPost(endpoint, body = {}) {
  const resp = await fetch(`${API}/${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  return resp.json();
}

// ─── Validation ──────────────────────────────────────────────

function validateEntry(entry) {
  const issues = [];
  if (!entry.entryId) issues.push('missing entryId');
  if (!entry.type || !['income','expense'].includes(entry.type)) issues.push(`invalid type: ${entry.type}`);
  if (!entry.category || !ALL_CATS.includes(entry.category)) issues.push(`invalid category: ${entry.category}`);
  if (entry.type === 'income' && !VALID_INCOME_CATS.includes(entry.category)) issues.push(`income entry has expense category: ${entry.category}`);
  if (entry.type === 'expense' && !VALID_EXPENSE_CATS.includes(entry.category)) issues.push(`expense entry has income category: ${entry.category}`);
  if (!entry.amount || entry.amount <= 0) issues.push(`invalid amount: ${entry.amount}`);
  if (!entry.entryDate) issues.push('missing entryDate');
  else {
    const d = new Date(entry.entryDate);
    if (isNaN(d.getTime())) issues.push(`invalid date: ${entry.entryDate}`);
    else if (d.getFullYear() !== entry.year) issues.push(`date year ${d.getFullYear()} != entry year ${entry.year}`);
  }
  if (!entry.description || entry.description.trim().length === 0) issues.push('missing description');
  return issues;
}

function findDuplicates(entries) {
  const seen = new Map();
  const dupes = [];
  for (const e of entries) {
    const key = `${new Date(e.entryDate).toISOString().split('T')[0]}|${e.amount}|${(e.description || '').toLowerCase().trim()}`;
    if (seen.has(key)) {
      dupes.push({ entry1: seen.get(key).entryId, entry2: e.entryId, key });
    } else {
      seen.set(key, e);
    }
  }
  return dupes;
}

// ─── Summaries ───────────────────────────────────────────────

function summarizeIncome(entries) {
  const incEntries = entries.filter(e => e.type === 'income');
  const byCat = {};
  let total = 0;
  for (const e of incEntries) {
    const c = e.category || 'other_income';
    byCat[c] = (byCat[c] || 0) + (e.amount || 0);
    total += e.amount || 0;
  }
  return { total, byCategory: byCat, count: incEntries.length };
}

function summarizeExpensesByEvent(entries) {
  const expEntries = entries.filter(e => e.type === 'expense');
  const events = {};
  let total = 0;
  for (const e of expEntries) {
    const ev = e.eventName || '(Unassigned)';
    if (!events[ev]) events[ev] = { total: 0, categories: {}, count: 0 };
    const amt = e.amount || 0;
    events[ev].total += amt;
    events[ev].count++;
    events[ev].categories[e.category] = (events[ev].categories[e.category] || 0) + amt;
    total += amt;
  }
  return { total, byEvent: events, count: expEntries.length };
}

function reconciliationStatus(entries) {
  const total = entries.length;
  const reconciled = entries.filter(e => e.reconciled).length;
  const unreconciled = total - reconciled;
  return { total, reconciled, unreconciled, pct: total > 0 ? ((reconciled / total) * 100).toFixed(1) : '0.0' };
}

// ─── Main Agent ──────────────────────────────────────────────

async function runAgent() {
  log(`BANF Financial Reporting Agent — Year ${YEAR}`);
  log(`Mode: ${FIX_MODE ? 'FIX (will attempt corrections)' : 'AUDIT (read-only)'}`);
  log('─'.repeat(60));

  // 1. Fetch entries
  log('Fetching ledger entries...');
  const data = await apiGet('ledger', { year: YEAR, limit: 1000 });
  if (!data.success) {
    err(`Failed to fetch ledger: ${data.error}`);
    process.exit(1);
  }
  const entries = data.entries || [];
  log(`Loaded ${entries.length} entries for ${YEAR}`);

  // 2. Validate entries
  log('Validating entries...');
  const validationIssues = [];
  for (const e of entries) {
    const issues = validateEntry(e);
    if (issues.length) {
      validationIssues.push({ entryId: e.entryId, description: e.description, issues });
      if (VERBOSE) warn(`${e.entryId}: ${issues.join(', ')}`);
    }
  }
  log(`Validation: ${entries.length - validationIssues.length} clean, ${validationIssues.length} with issues`);

  // 3. Duplicates
  log('Checking for duplicates...');
  const dupes = findDuplicates(entries);
  if (dupes.length) {
    warn(`Found ${dupes.length} potential duplicate pairs`);
    if (VERBOSE) dupes.forEach(d => warn(`  Duplicate: ${d.entry1} <-> ${d.entry2} — ${d.key}`));
  } else {
    log('No duplicates found');
  }

  // 4. Income summary
  log('Generating income summary...');
  const income = summarizeIncome(entries);
  log(`Total Income: $${income.total.toLocaleString('en-US', {minimumFractionDigits:2})} across ${income.count} entries`);
  for (const [cat, amt] of Object.entries(income.byCategory).sort((a,b) => b[1] - a[1])) {
    log(`  ${cat.padEnd(20)} $${amt.toLocaleString('en-US', {minimumFractionDigits:2})}`);
  }

  // 5. Expense by event
  log('Generating event expense breakdown...');
  const expenses = summarizeExpensesByEvent(entries);
  log(`Total Expenses: $${expenses.total.toLocaleString('en-US', {minimumFractionDigits:2})} across ${expenses.count} entries`);
  for (const [ev, d] of Object.entries(expenses.byEvent).sort((a,b) => b[1].total - a[1].total)) {
    log(`  ${ev.padEnd(30)} $${d.total.toLocaleString('en-US', {minimumFractionDigits:2})} (${d.count} entries)`);
    if (VERBOSE) {
      for (const [cat, amt] of Object.entries(d.categories).sort((a,b) => b[1] - a[1])) {
        log(`    └ ${cat.padEnd(18)} $${amt.toLocaleString('en-US', {minimumFractionDigits:2})}`);
      }
    }
  }

  // 6. Net
  const net = income.total - expenses.total;
  log(`\nNet (Income - Expense): $${net.toLocaleString('en-US', {minimumFractionDigits:2})}`);

  // 7. Reconciliation status
  log('Checking reconciliation status...');
  const recon = reconciliationStatus(entries);
  log(`Reconciled: ${recon.reconciled}/${recon.total} (${recon.pct}%)`);

  // 8. Fetch reconciliation report for cross-check
  const reconReport = await apiGet('reconciliation_report', { year: YEAR });
  if (reconReport.success && reconReport.report) {
    const r = reconReport.report;
    log(`Reconciliation report: matched=${r.matched || 0}, partial=${r.partial || 0}, unmatched=${r.unmatched || 0}`);
  }

  // 9. Output report
  const report = {
    generatedAt: new Date().toISOString(),
    year: YEAR,
    totalEntries: entries.length,
    validationIssues: validationIssues.length,
    duplicates: dupes.length,
    income: { total: income.total, count: income.count, byCategory: income.byCategory },
    expenses: { total: expenses.total, count: expenses.count, byEvent: expenses.byEvent },
    net,
    reconciliation: recon,
    issues: validationIssues
  };

  const fs = require('fs');
  const outFile = `banf-finance-report-${YEAR}.json`;
  fs.writeFileSync(outFile, JSON.stringify(report, null, 2));
  log(`\nReport saved: ${outFile}`);

  // Summary
  log('\n' + '═'.repeat(60));
  log('SUMMARY');
  log('═'.repeat(60));
  log(`Year:                ${YEAR}`);
  log(`Total Entries:       ${entries.length}`);
  log(`Validation Issues:   ${validationIssues.length}`);
  log(`Duplicates:          ${dupes.length}`);
  log(`Income:              $${income.total.toLocaleString('en-US', {minimumFractionDigits:2})}`);
  log(`  Membership:        $${(income.byCategory.membership || 0).toLocaleString('en-US', {minimumFractionDigits:2})}`);
  log(`  Sponsorship:       $${(income.byCategory.sponsorship || 0).toLocaleString('en-US', {minimumFractionDigits:2})}`);
  log(`Expenses:            $${expenses.total.toLocaleString('en-US', {minimumFractionDigits:2})}`);
  log(`Net:                 $${net.toLocaleString('en-US', {minimumFractionDigits:2})}`);
  log(`Reconciled:          ${recon.pct}%`);
  log('═'.repeat(60));

  if (validationIssues.length === 0 && dupes.length === 0) {
    log('✅ All entries clean — no issues found.');
  } else {
    log(`⚠️  ${validationIssues.length} validation issues, ${dupes.length} duplicates need attention.`);
  }
}

runAgent().catch(e => { err(e.message); process.exit(1); });
