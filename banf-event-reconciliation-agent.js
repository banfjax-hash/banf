#!/usr/bin/env node
/**
 * ═══════════════════════════════════════════════════════════════════════
 *  BANF Event-wise Expense/Cost Reconciliation Agent  (v1.0)
 * ═══════════════════════════════════════════════════════════════════════
 *
 *  Connected to all income & expense pipelines, this agent:
 *    1. Aggregates event-wise income (RSVPs, ticket sales, sponsorships)
 *    2. Aggregates event-wise expenses (procurement, venue, food, supplies)
 *    3. Provides real-time event reconciliation status
 *    4. Supports manual add/modify by Treasurer, VP, President
 *    5. Event Final Reconciliation Submit:
 *       - Treasurer, VP, President can view current status
 *       - Modify / add items manually
 *       - Submit final version for approval
 *       - Requires approval from Treasurer + VP + President
 *       - Marked "Ready for Audit" once all three approve
 *
 *  Data Sources:
 *    - banf-event-manager.js → event definitions & stats
 *    - bosonto-full-pipeline.json → RSVP & payment data
 *    - banf-ledger.json → financial ledger
 *    - banf-expenses.json → manual expense entries
 *    - banf-procurement-agent.js → approved procurement requests
 *    - banf-crm-reconciliation.json → CRM member data
 *
 *  Output:
 *    - banf-event-reconciliation.json — Event reconciliation state
 *    - banf-event-reconciliation-report.html — HTML dashboard
 *
 *  Usage:
 *    node banf-event-reconciliation-agent.js                    # Generate report for all events
 *    node banf-event-reconciliation-agent.js --event=bosonto_utsob_2026  # Single event
 *    node banf-event-reconciliation-agent.js --add-expense      # Add expense: --event=X --amount=Y --desc=Z --category=W
 *    node banf-event-reconciliation-agent.js --submit=bosonto_utsob_2026  # Submit for final reconciliation
 *    node banf-event-reconciliation-agent.js --approve=bosonto_utsob_2026 --role=treasurer --by=email@example.com
 *    node banf-event-reconciliation-agent.js --status           # Show all event statuses
 *    node banf-event-reconciliation-agent.js --report           # Generate HTML report
 *
 * ═══════════════════════════════════════════════════════════════════════
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

// ── Dependencies ────────────────────────────────────────────
let eventManager;
try { eventManager = require('./banf-event-manager.js'); } catch { eventManager = null; }

let paymentEngine;
try { paymentEngine = require('./banf-payment-purpose-engine.js'); } catch { paymentEngine = null; }

// ── Files ────────────────────────────────────────────────────
const STATE_FILE = path.join(__dirname, 'banf-event-reconciliation.json');
const REPORT_FILE = path.join(__dirname, 'banf-event-reconciliation-report.html');
const LEDGER_FILE = path.join(__dirname, 'banf-ledger.json');
const EXPENSE_FILE = path.join(__dirname, 'banf-expenses.json');
const PIPELINE_FILE = path.join(__dirname, 'bosonto-full-pipeline.json');
const CRM_FILE = path.join(__dirname, 'banf-crm-reconciliation.json');
const LOG_FILE = path.join(__dirname, 'banf-event-reconciliation.log');

// ── Gmail OAuth2 (for email notifications) ──────────────────
const GOOGLE_CLIENT_ID = '1020178199135-3usrl611ara38i7rhu2ub6sn6g1150ml.apps.googleusercontent.com';
const GOOGLE_CLIENT_SECRET = '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';
const GOOGLE_REFRESH_TOKEN = require('./banf-gmail-config').REFRESH_TOKEN;

// ── EC Roles authorized for reconciliation ──────────────────
const RECONCILIATION_ROLES = {
  treasurer: {
    title: 'Treasurer',
    canEdit: true,
    canSubmit: true,
    canApprove: true,
    approvalWeight: 1
  },
  vp: {
    title: 'Vice President',
    canEdit: true,
    canSubmit: true,
    canApprove: true,
    approvalWeight: 1
  },
  president: {
    title: 'President',
    canEdit: true,
    canSubmit: true,
    canApprove: true,
    approvalWeight: 1
  }
};

const APPROVAL_THRESHOLD = 3; // All three must approve

// ── Reconciliation Statuses ─────────────────────────────────
const RECON_STATUS = {
  DRAFT: 'draft',               // Event reconciliation is being built
  IN_PROGRESS: 'in_progress',   // Expenses/income actively being updated
  SUBMITTED: 'submitted',       // Submitted for final approval
  PARTIALLY_APPROVED: 'partially_approved', // Some approvals received
  APPROVED: 'approved',         // All 3 approvals received
  AUDIT_READY: 'audit_ready',   // Final version locked, ready for audit
  REOPENED: 'reopened'          // Reopened for modification after submission
};

// ── Expense Categories ──────────────────────────────────────
const EXPENSE_CATEGORIES = [
  'venue_rental', 'food_catering', 'decorations', 'sound_av',
  'printing_stationery', 'gifts_prizes', 'transportation',
  'entertainment_performers', 'puja_supplies', 'photography_video',
  'insurance', 'permits_licenses', 'marketing_flyers',
  'equipment_rental', 'miscellaneous', 'reimbursement'
];

// ── Income Categories ───────────────────────────────────────
const INCOME_CATEGORIES = [
  'membership_dues', 'event_ticket', 'sponsorship', 'donation',
  'food_sale', 'raffle', 'auction', 'advertising', 'miscellaneous'
];

// ── CLI ─────────────────────────────────────────────────────
const args = process.argv.slice(2);
const eventArg = args.find(a => a.startsWith('--event='));
const EVENT_FILTER = eventArg ? eventArg.split('=')[1] : null;
const submitArg = args.find(a => a.startsWith('--submit='));
const SUBMIT_EVENT = submitArg ? submitArg.split('=')[1] : null;
const approveArg = args.find(a => a.startsWith('--approve='));
const APPROVE_EVENT = approveArg ? approveArg.split('=')[1] : null;
const roleArg = args.find(a => a.startsWith('--role='));
const ROLE = roleArg ? roleArg.split('=')[1] : null;
const byArg = args.find(a => a.startsWith('--by='));
const BY_EMAIL = byArg ? byArg.split('=')[1] : null;
const ADD_EXPENSE = args.includes('--add-expense');
const amountArg = args.find(a => a.startsWith('--amount='));
const descArg = args.find(a => a.startsWith('--desc='));
const categoryArg = args.find(a => a.startsWith('--category='));
const SHOW_STATUS = args.includes('--status');
const GEN_REPORT = args.includes('--report') || (!SUBMIT_EVENT && !APPROVE_EVENT && !ADD_EXPENSE && !SHOW_STATUS);

// ═══════════════════════════════════════════════════════════════
// LOGGING
// ═══════════════════════════════════════════════════════════════

function log(level, msg) {
  const ts = new Date().toISOString();
  const line = `[${ts}] [${level}] [EventRecon] ${msg}`;
  console.log(line);
  try { fs.appendFileSync(LOG_FILE, line + '\n'); } catch {}
}

// ═══════════════════════════════════════════════════════════════
// STATE MANAGEMENT
// ═══════════════════════════════════════════════════════════════

function loadState() {
  try {
    if (fs.existsSync(STATE_FILE)) {
      return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
    }
  } catch (e) {
    log('WARN', `Failed to load state: ${e.message}`);
  }
  return {
    events: {},
    lastUpdated: null,
    createdAt: new Date().toISOString(),
    version: '1.0'
  };
}

function saveState(state) {
  state.lastUpdated = new Date().toISOString();
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

// ═══════════════════════════════════════════════════════════════
// DATA LOADERS
// ═══════════════════════════════════════════════════════════════

function loadLedger() {
  try {
    if (fs.existsSync(LEDGER_FILE)) return JSON.parse(fs.readFileSync(LEDGER_FILE, 'utf8'));
  } catch {}
  return { entries: [] };
}

function loadExpenses() {
  try {
    if (fs.existsSync(EXPENSE_FILE)) return JSON.parse(fs.readFileSync(EXPENSE_FILE, 'utf8'));
  } catch {}
  return { expenses: [] };
}

function loadPipeline() {
  try {
    if (fs.existsSync(PIPELINE_FILE)) return JSON.parse(fs.readFileSync(PIPELINE_FILE, 'utf8'));
  } catch {}
  return { all: [], sendable: [] };
}

function loadCRM() {
  try {
    if (fs.existsSync(CRM_FILE)) {
      const data = JSON.parse(fs.readFileSync(CRM_FILE, 'utf8'));
      return data.members || data;
    }
  } catch {}
  return [];
}

function getEvents() {
  if (eventManager) {
    try { return eventManager.getEvents(); } catch {}
  }
  // Fallback: minimal event list
  return [
    { eventId: 'bosonto_utsob_2026', name: 'Bosonto Utsob (Spring Festival)', date: '2026-03-07', type: 'Cultural', status: 'completed' },
    { eventId: 'anandabazar_2026', name: 'Anandabazar', date: '2026-03-14', type: 'Cultural', status: 'completed' },
    { eventId: 'nabo_borsho_2026', name: 'Nabo Borsho / Pohela Boishakh', date: '2026-04-25', type: 'Cultural', status: 'dormant' }
  ];
}

// ═══════════════════════════════════════════════════════════════
// EVENT RECONCILIATION — Build/Update
// ═══════════════════════════════════════════════════════════════

function initEventRecon(eventId, eventInfo) {
  return {
    eventId,
    eventName: eventInfo.name || eventId,
    eventDate: eventInfo.date || null,
    eventType: eventInfo.type || 'Unknown',
    status: RECON_STATUS.DRAFT,
    income: {
      items: [],
      total: 0,
      byCategory: {}
    },
    expenses: {
      items: [],
      total: 0,
      byCategory: {}
    },
    netResult: 0,  // income - expenses
    manualAdjustments: [],
    approvals: {
      treasurer: null,
      vp: null,
      president: null
    },
    submittedAt: null,
    submittedBy: null,
    approvedAt: null,
    auditReadyAt: null,
    auditNotes: '',
    history: [{
      action: 'created',
      by: 'system',
      at: new Date().toISOString(),
      detail: `Event reconciliation created for ${eventInfo.name || eventId}`
    }],
    createdAt: new Date().toISOString(),
    lastUpdated: new Date().toISOString()
  };
}

/**
 * Aggregate income for a specific event from all income pipelines
 */
function aggregateEventIncome(eventId, eventInfo, pipeline, ledger) {
  const items = [];

  // 1. From pipeline RSVP data — membership payments linked to event
  const pipelineMembers = pipeline.all || pipeline.sendable || [];
  const eventDate = eventInfo.date ? new Date(eventInfo.date) : null;

  for (const member of pipelineMembers) {
    if (member.amountPaid && member.amountPaid > 0) {
      // Check if payment is associated with this event
      const paymentDate = member.paymentDate ? new Date(member.paymentDate) : null;

      // Associate payment with event if:
      // 1. Explicit eventId match
      // 2. Payment date is within 30 days before the event
      const isForEvent = member.eventId === eventId ||
        (eventDate && paymentDate && paymentDate >= new Date(eventDate.getTime() - 30 * 86400000) && paymentDate <= new Date(eventDate.getTime() + 7 * 86400000));

      if (isForEvent || (!member.eventId && eventInfo.status === 'completed')) {
        items.push({
          id: `INC-PIPE-${member.email || member.displayName}-${eventId}`,
          category: member.membershipTier ? 'membership_dues' : 'event_ticket',
          description: `${member.displayName || member.firstName || 'Member'} — ${member.membershipTier || 'payment'}`,
          amount: member.amountPaid,
          payerName: member.displayName || `${member.firstName || ''} ${member.lastName || ''}`.trim(),
          payerEmail: member.email || '',
          date: member.paymentDate || eventInfo.date,
          source: 'pipeline',
          verified: true
        });
      }
    }
  }

  // 2. From ledger entries tagged with this event
  for (const entry of (ledger.entries || [])) {
    if (entry.type === 'income') {
      const isForEvent = entry.eventId === eventId ||
        (entry.purpose === 'event_fee' && entry.memo && entry.memo.toLowerCase().includes(eventId.replace(/_/g, ' ')));

      if (isForEvent) {
        // Avoid duplicates from pipeline
        const isDuplicate = items.some(i =>
          i.payerEmail === entry.payerEmail && Math.abs(i.amount - entry.amount) < 0.01
        );
        if (!isDuplicate) {
          items.push({
            id: `INC-LEDGER-${entry.id}`,
            category: entry.purpose || 'miscellaneous',
            description: `${entry.payerName || entry.memberName || 'Payment'} — ${entry.purpose || 'income'}`,
            amount: entry.amount,
            payerName: entry.payerName || entry.memberName || '',
            payerEmail: entry.payerEmail || entry.memberEmail || '',
            date: entry.date,
            source: 'ledger',
            verified: !!entry.gmailId
          });
        }
      }
    }
  }

  // 3. From event stats (if available from event manager)
  if (eventInfo.stats && eventInfo.stats.totalPaymentAmount && items.length === 0) {
    items.push({
      id: `INC-STATS-${eventId}`,
      category: 'membership_dues',
      description: `Event income (${eventInfo.stats.paymentsReceived || 0} payments)`,
      amount: eventInfo.stats.totalPaymentAmount,
      payerName: 'Aggregated',
      payerEmail: '',
      date: eventInfo.date,
      source: 'event_stats',
      verified: false
    });
  }

  const total = items.reduce((sum, i) => sum + i.amount, 0);
  const byCategory = {};
  items.forEach(i => {
    byCategory[i.category] = (byCategory[i.category] || 0) + i.amount;
  });

  return { items, total, byCategory };
}

/**
 * Aggregate expenses for a specific event from all expense pipelines
 */
function aggregateEventExpenses(eventId, eventInfo, expenseData, ledger) {
  const items = [];

  // 1. From manual expense entries
  for (const expense of (expenseData.expenses || [])) {
    const isForEvent = expense.eventId === eventId ||
      (expense.description && expense.description.toLowerCase().includes(eventId.replace(/_/g, ' '))) ||
      (expense.event && expense.event.toLowerCase().includes(eventId.replace(/_/g, ' ')));

    if (isForEvent) {
      items.push({
        id: expense.id || `EXP-MANUAL-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        category: expense.category || expense.purpose || 'miscellaneous',
        description: expense.description || expense.memo || 'Expense',
        amount: parseFloat(expense.amount) || 0,
        vendor: expense.vendor || expense.payee || '',
        receiptRef: expense.receiptRef || expense.receipt || '',
        date: expense.date || eventInfo.date,
        source: 'manual',
        approvedBy: expense.approvedBy || '',
        verified: !!expense.receiptRef
      });
    }
  }

  // 2. From ledger expense entries tagged with this event
  for (const entry of (ledger.entries || [])) {
    if (entry.type === 'expense') {
      const isForEvent = entry.eventId === eventId ||
        (entry.memo && entry.memo.toLowerCase().includes(eventId.replace(/_/g, ' ')));

      if (isForEvent) {
        const isDuplicate = items.some(i =>
          i.description === entry.memo && Math.abs(i.amount - entry.amount) < 0.01
        );
        if (!isDuplicate) {
          items.push({
            id: `EXP-LEDGER-${entry.id}`,
            category: entry.purpose || 'miscellaneous',
            description: entry.memo || entry.comments || 'Expense',
            amount: entry.amount,
            vendor: entry.payerName || '',
            receiptRef: entry.receiptRef || '',
            date: entry.date,
            source: 'ledger',
            approvedBy: entry.approvedBy || '',
            verified: !!entry.receiptRef
          });
        }
      }
    }
  }

  const total = items.reduce((sum, i) => sum + i.amount, 0);
  const byCategory = {};
  items.forEach(i => {
    byCategory[i.category] = (byCategory[i.category] || 0) + i.amount;
  });

  return { items, total, byCategory };
}

/**
 * Build or update event reconciliation from all data sources
 */
function buildEventReconciliation(state, eventId, eventInfo) {
  const pipeline = loadPipeline();
  const ledger = loadLedger();
  const expenseData = loadExpenses();

  let recon = state.events[eventId];
  if (!recon) {
    recon = initEventRecon(eventId, eventInfo);
    state.events[eventId] = recon;
  }

  // Don't rebuild if audit-ready or approved (frozen)
  if (recon.status === RECON_STATUS.AUDIT_READY) {
    log('INFO', `  Event ${eventId}: AUDIT_READY — skipping rebuild`);
    return recon;
  }

  // Aggregate from pipelines
  recon.income = aggregateEventIncome(eventId, eventInfo, pipeline, ledger);
  recon.expenses = aggregateEventExpenses(eventId, eventInfo, expenseData, ledger);

  // Apply manual adjustments
  for (const adj of (recon.manualAdjustments || [])) {
    if (adj.type === 'income') {
      recon.income.items.push({
        id: adj.id,
        category: adj.category || 'miscellaneous',
        description: `[Manual] ${adj.description}`,
        amount: adj.amount,
        payerName: adj.payerName || '',
        date: adj.date || new Date().toISOString(),
        source: 'manual_adjustment',
        verified: false,
        addedBy: adj.addedBy,
        addedAt: adj.addedAt
      });
      recon.income.total += adj.amount;
      recon.income.byCategory[adj.category] = (recon.income.byCategory[adj.category] || 0) + adj.amount;
    } else if (adj.type === 'expense') {
      recon.expenses.items.push({
        id: adj.id,
        category: adj.category || 'miscellaneous',
        description: `[Manual] ${adj.description}`,
        amount: adj.amount,
        vendor: adj.vendor || '',
        date: adj.date || new Date().toISOString(),
        source: 'manual_adjustment',
        verified: false,
        addedBy: adj.addedBy,
        addedAt: adj.addedAt
      });
      recon.expenses.total += adj.amount;
      recon.expenses.byCategory[adj.category] = (recon.expenses.byCategory[adj.category] || 0) + adj.amount;
    }
  }

  recon.netResult = recon.income.total - recon.expenses.total;
  recon.lastUpdated = new Date().toISOString();

  // Set status based on event state
  if (recon.status === RECON_STATUS.DRAFT || recon.status === RECON_STATUS.REOPENED) {
    if (recon.income.items.length > 0 || recon.expenses.items.length > 0) {
      recon.status = RECON_STATUS.IN_PROGRESS;
    }
  }

  return recon;
}

// ═══════════════════════════════════════════════════════════════
// MANUAL ADJUSTMENT — Add/modify entries
// ═══════════════════════════════════════════════════════════════

function addManualAdjustment(state, eventId, adjustment) {
  const recon = state.events[eventId];
  if (!recon) {
    throw new Error(`Event ${eventId} not found in reconciliation state`);
  }

  if (recon.status === RECON_STATUS.AUDIT_READY) {
    throw new Error(`Event ${eventId} is AUDIT_READY — cannot modify. Reopen first.`);
  }

  if (recon.status === RECON_STATUS.APPROVED) {
    throw new Error(`Event ${eventId} is APPROVED — cannot modify. Reopen first.`);
  }

  const adj = {
    id: `ADJ-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    type: adjustment.type || 'expense',
    category: adjustment.category || 'miscellaneous',
    description: adjustment.description || 'Manual adjustment',
    amount: parseFloat(adjustment.amount) || 0,
    vendor: adjustment.vendor || '',
    payerName: adjustment.payerName || '',
    date: adjustment.date || new Date().toISOString(),
    addedBy: adjustment.addedBy || 'unknown',
    addedAt: new Date().toISOString(),
    notes: adjustment.notes || ''
  };

  recon.manualAdjustments.push(adj);
  recon.history.push({
    action: 'manual_adjustment',
    by: adj.addedBy,
    at: adj.addedAt,
    detail: `Added ${adj.type}: $${adj.amount} — ${adj.description} [${adj.category}]`
  });

  // Reset submission if it was submitted
  if (recon.status === RECON_STATUS.SUBMITTED || recon.status === RECON_STATUS.PARTIALLY_APPROVED) {
    recon.status = RECON_STATUS.IN_PROGRESS;
    recon.approvals = { treasurer: null, vp: null, president: null };
    recon.submittedAt = null;
    recon.submittedBy = null;
    recon.history.push({
      action: 'reset_to_in_progress',
      by: 'system',
      at: new Date().toISOString(),
      detail: 'Manual adjustment made after submission — approvals reset'
    });
  }

  log('INFO', `Manual adjustment added to ${eventId}: ${adj.type} $${adj.amount} — ${adj.description}`);
  return adj;
}

// ═══════════════════════════════════════════════════════════════
// FINAL RECONCILIATION SUBMIT
// ═══════════════════════════════════════════════════════════════

function submitForApproval(state, eventId, submittedBy) {
  const recon = state.events[eventId];
  if (!recon) throw new Error(`Event ${eventId} not found`);

  if (recon.status === RECON_STATUS.AUDIT_READY) {
    throw new Error(`Event ${eventId} is already AUDIT_READY`);
  }

  // Reset approvals
  recon.approvals = { treasurer: null, vp: null, president: null };
  recon.status = RECON_STATUS.SUBMITTED;
  recon.submittedAt = new Date().toISOString();
  recon.submittedBy = submittedBy;

  recon.history.push({
    action: 'submitted_for_approval',
    by: submittedBy,
    at: recon.submittedAt,
    detail: `Final reconciliation submitted. Income: $${recon.income.total.toFixed(2)}, Expenses: $${recon.expenses.total.toFixed(2)}, Net: $${recon.netResult.toFixed(2)}`
  });

  log('INFO', `Event ${eventId} submitted for final reconciliation approval by ${submittedBy}`);
  return recon;
}

function approveReconciliation(state, eventId, role, approverEmail, notes) {
  const recon = state.events[eventId];
  if (!recon) throw new Error(`Event ${eventId} not found`);

  if (!RECONCILIATION_ROLES[role]) {
    throw new Error(`Invalid role: ${role}. Must be one of: ${Object.keys(RECONCILIATION_ROLES).join(', ')}`);
  }

  if (recon.status !== RECON_STATUS.SUBMITTED && recon.status !== RECON_STATUS.PARTIALLY_APPROVED) {
    throw new Error(`Event ${eventId} status is ${recon.status} — must be submitted first`);
  }

  if (recon.approvals[role]) {
    throw new Error(`${RECONCILIATION_ROLES[role].title} has already approved (${recon.approvals[role].at})`);
  }

  recon.approvals[role] = {
    by: approverEmail,
    at: new Date().toISOString(),
    notes: notes || ''
  };

  recon.history.push({
    action: 'approved',
    by: approverEmail,
    at: new Date().toISOString(),
    detail: `Approved by ${RECONCILIATION_ROLES[role].title} (${approverEmail})${notes ? ': ' + notes : ''}`
  });

  // Check if all required approvals are in
  const approvalCount = Object.values(recon.approvals).filter(a => a !== null).length;
  log('INFO', `Event ${eventId}: Approved by ${role} (${approverEmail}). Approvals: ${approvalCount}/${APPROVAL_THRESHOLD}`);

  if (approvalCount >= APPROVAL_THRESHOLD) {
    recon.status = RECON_STATUS.APPROVED;
    recon.approvedAt = new Date().toISOString();

    // Auto-transition to AUDIT_READY
    recon.status = RECON_STATUS.AUDIT_READY;
    recon.auditReadyAt = new Date().toISOString();

    recon.history.push({
      action: 'audit_ready',
      by: 'system',
      at: recon.auditReadyAt,
      detail: `All ${APPROVAL_THRESHOLD} approvals received. Reconciliation locked and ready for audit.`
    });

    log('INFO', `✅ Event ${eventId}: ALL APPROVED — marked AUDIT_READY`);
  } else {
    recon.status = RECON_STATUS.PARTIALLY_APPROVED;
  }

  return recon;
}

function reopenReconciliation(state, eventId, requestedBy, reason) {
  const recon = state.events[eventId];
  if (!recon) throw new Error(`Event ${eventId} not found`);

  recon.status = RECON_STATUS.REOPENED;
  recon.approvals = { treasurer: null, vp: null, president: null };
  recon.submittedAt = null;
  recon.submittedBy = null;

  recon.history.push({
    action: 'reopened',
    by: requestedBy,
    at: new Date().toISOString(),
    detail: `Reconciliation reopened for modification. Reason: ${reason || 'N/A'}`
  });

  log('INFO', `Event ${eventId} reopened by ${requestedBy}`);
  return recon;
}

// ═══════════════════════════════════════════════════════════════
// HTML REPORT GENERATION
// ═══════════════════════════════════════════════════════════════

function generateReport(state) {
  log('INFO', 'Generating event reconciliation HTML report...');

  const events = Object.values(state.events).sort((a, b) =>
    new Date(a.eventDate || '2099-01-01') - new Date(b.eventDate || '2099-01-01')
  );

  const now = new Date();
  const fy = paymentEngine ? paymentEngine.getFiscalYear(now) : now.getFullYear();

  const totalIncome = events.reduce((s, e) => s + e.income.total, 0);
  const totalExpense = events.reduce((s, e) => s + e.expenses.total, 0);
  const totalNet = totalIncome - totalExpense;

  function statusBadge(status) {
    const colors = {
      draft: '#6b7280',
      in_progress: '#3b82f6',
      submitted: '#eab308',
      partially_approved: '#f97316',
      approved: '#22c55e',
      audit_ready: '#10b981',
      reopened: '#ef4444'
    };
    const color = colors[status] || '#6b7280';
    return `<span style="display:inline-block;padding:3px 10px;border-radius:999px;font-size:.75rem;font-weight:600;background:${color}22;color:${color};border:1px solid ${color}44">${status.replace(/_/g, ' ').toUpperCase()}</span>`;
  }

  function approvalBadge(approval) {
    if (!approval) return '<span style="color:#6b7280">⏳ Pending</span>';
    return `<span style="color:#22c55e">✅ ${approval.by.split('@')[0]} (${new Date(approval.at).toLocaleDateString()})</span>`;
  }

  const eventRows = events.map(ev => {
    const incomeItems = ev.income.items.map(i => `
      <tr>
        <td style="color:#22c55e">+</td>
        <td>${i.description}</td>
        <td>${i.category.replace(/_/g, ' ')}</td>
        <td style="color:#22c55e">$${i.amount.toLocaleString()}</td>
        <td>${i.source}</td>
        <td>${i.date ? new Date(i.date).toLocaleDateString() : '—'}</td>
      </tr>
    `).join('');

    const expenseItems = ev.expenses.items.map(i => `
      <tr>
        <td style="color:#ef4444">−</td>
        <td>${i.description}</td>
        <td>${i.category.replace(/_/g, ' ')}</td>
        <td style="color:#ef4444">$${i.amount.toLocaleString()}</td>
        <td>${i.source}</td>
        <td>${i.date ? new Date(i.date).toLocaleDateString() : '—'}</td>
      </tr>
    `).join('');

    return `
    <div class="event-card">
      <div class="event-header">
        <div>
          <h3 style="margin:0">${ev.eventName}</h3>
          <span style="color:var(--muted);font-size:.85rem">${ev.eventDate || 'TBD'} | ${ev.eventType}</span>
        </div>
        <div style="text-align:right">
          ${statusBadge(ev.status)}
          <div style="margin-top:8px;font-size:.85rem;color:var(--muted)">
            Net: <strong style="color:${ev.netResult >= 0 ? 'var(--green)' : 'var(--red)'}">$${ev.netResult.toLocaleString()}</strong>
          </div>
        </div>
      </div>

      <div class="stats-row">
        <div class="mini-stat">
          <div class="mini-label">Income</div>
          <div class="mini-value" style="color:var(--green)">$${ev.income.total.toLocaleString()}</div>
          <div class="mini-sub">${ev.income.items.length} items</div>
        </div>
        <div class="mini-stat">
          <div class="mini-label">Expenses</div>
          <div class="mini-value" style="color:var(--red)">$${ev.expenses.total.toLocaleString()}</div>
          <div class="mini-sub">${ev.expenses.items.length} items</div>
        </div>
        <div class="mini-stat">
          <div class="mini-label">Net Result</div>
          <div class="mini-value" style="color:${ev.netResult >= 0 ? 'var(--green)' : 'var(--red)'}">$${ev.netResult.toLocaleString()}</div>
          <div class="mini-sub">${ev.netResult >= 0 ? 'Surplus' : 'Deficit'}</div>
        </div>
        <div class="mini-stat">
          <div class="mini-label">Manual Adj.</div>
          <div class="mini-value">${ev.manualAdjustments.length}</div>
          <div class="mini-sub">entries</div>
        </div>
      </div>

      ${(incomeItems || expenseItems) ? `
      <details style="margin-top:12px">
        <summary style="cursor:pointer;color:var(--blue);font-weight:600;font-size:.9rem">📋 View Line Items (${ev.income.items.length + ev.expenses.items.length})</summary>
        <table style="margin-top:8px">
          <thead><tr><th></th><th>Description</th><th>Category</th><th>Amount</th><th>Source</th><th>Date</th></tr></thead>
          <tbody>
            ${incomeItems}
            ${expenseItems}
          </tbody>
        </table>
      </details>
      ` : '<p style="color:var(--muted);font-size:.85rem;margin-top:12px">No income or expenses recorded yet.</p>'}

      <div class="approval-section">
        <h4 style="margin:0 0 8px;font-size:.9rem">Approval Status</h4>
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px">
          <div class="approval-box">
            <div class="approval-role">Treasurer</div>
            ${approvalBadge(ev.approvals.treasurer)}
          </div>
          <div class="approval-box">
            <div class="approval-role">Vice President</div>
            ${approvalBadge(ev.approvals.vp)}
          </div>
          <div class="approval-box">
            <div class="approval-role">President</div>
            ${approvalBadge(ev.approvals.president)}
          </div>
        </div>
      </div>

      ${ev.history.length > 0 ? `
      <details style="margin-top:12px">
        <summary style="cursor:pointer;color:var(--muted);font-size:.8rem">📝 History (${ev.history.length} entries)</summary>
        <div style="margin-top:8px;font-size:.8rem">
          ${ev.history.slice(-10).reverse().map(h => `
            <div style="padding:4px 0;border-bottom:1px solid rgba(255,255,255,.05)">
              <span style="color:var(--muted)">${new Date(h.at).toLocaleString()}</span> —
              <strong>${h.action.replace(/_/g, ' ')}</strong> by ${h.by}
              ${h.detail ? `<br><span style="color:var(--muted);margin-left:16px">${h.detail}</span>` : ''}
            </div>
          `).join('')}
        </div>
      </details>
      ` : ''}
    </div>
    `;
  }).join('');

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>BANF Event Reconciliation Dashboard — FY${fy}-${fy + 1}</title>
<style>
:root { --bg: #0a0e17; --card: #111827; --border: #1f2937; --text: #e5e7eb; --muted: #9ca3af;
        --green: #22c55e; --red: #ef4444; --blue: #3b82f6; --yellow: #eab308; --purple: #a855f7; }
* { margin: 0; padding: 0; box-sizing: border-box; }
body { background: var(--bg); color: var(--text); font-family: 'Segoe UI', system-ui, sans-serif; padding: 24px; }
.header { text-align: center; padding: 32px 0; border-bottom: 1px solid var(--border); margin-bottom: 24px; }
.header h1 { font-size: 1.8rem; background: linear-gradient(135deg, var(--purple), var(--blue)); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
.header .subtitle { color: var(--muted); margin-top: 8px; }
.totals-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 16px; margin-bottom: 24px; }
.total-card { background: var(--card); border: 1px solid var(--border); border-radius: 12px; padding: 20px; text-align: center; }
.total-card .value { font-size: 1.6rem; font-weight: 700; margin: 8px 0; }
.total-card .label { color: var(--muted); font-size: .82rem; text-transform: uppercase; letter-spacing: .05em; }
.event-card { background: var(--card); border: 1px solid var(--border); border-radius: 12px; padding: 20px; margin-bottom: 20px; }
.event-header { display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 12px; border-bottom: 1px solid var(--border); }
.stats-row { display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 12px; margin-top: 16px; }
.mini-stat { background: rgba(255,255,255,.03); border-radius: 8px; padding: 12px; text-align: center; }
.mini-label { color: var(--muted); font-size: .75rem; text-transform: uppercase; letter-spacing: .05em; }
.mini-value { font-size: 1.2rem; font-weight: 700; margin: 4px 0; }
.mini-sub { color: var(--muted); font-size: .75rem; }
table { width: 100%; border-collapse: collapse; font-size: .82rem; }
th { background: rgba(255,255,255,.03); padding: 8px 10px; text-align: left; color: var(--muted); font-weight: 600; border-bottom: 1px solid var(--border); }
td { padding: 8px 10px; border-bottom: 1px solid rgba(255,255,255,.05); }
tr:hover { background: rgba(255,255,255,.02); }
.approval-section { margin-top: 16px; padding-top: 12px; border-top: 1px solid var(--border); }
.approval-box { background: rgba(255,255,255,.03); border-radius: 8px; padding: 10px; text-align: center; }
.approval-role { color: var(--muted); font-size: .75rem; text-transform: uppercase; letter-spacing: .05em; margin-bottom: 6px; }
details summary { list-style: none; }
details summary::-webkit-details-marker { display: none; }
details summary::before { content: '▸ '; }
details[open] summary::before { content: '▾ '; }
.footer { text-align: center; color: var(--muted); font-size: .75rem; padding: 24px 0; border-top: 1px solid var(--border); margin-top: 24px; }
</style>
</head>
<body>

<div class="header">
  <h1>📊 BANF Event Reconciliation Dashboard</h1>
  <div class="subtitle">Fiscal Year ${fy}-${fy + 1} | Generated: ${now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
</div>

<div class="totals-grid">
  <div class="total-card">
    <div class="label">Total Events</div>
    <div class="value">${events.length}</div>
  </div>
  <div class="total-card">
    <div class="label">Total Income</div>
    <div class="value" style="color:var(--green)">$${totalIncome.toLocaleString()}</div>
  </div>
  <div class="total-card">
    <div class="label">Total Expenses</div>
    <div class="value" style="color:var(--red)">$${totalExpense.toLocaleString()}</div>
  </div>
  <div class="total-card">
    <div class="label">Net Result</div>
    <div class="value" style="color:${totalNet >= 0 ? 'var(--green)' : 'var(--red)'}">$${totalNet.toLocaleString()}</div>
  </div>
  <div class="total-card">
    <div class="label">Audit Ready</div>
    <div class="value" style="color:var(--purple)">${events.filter(e => e.status === RECON_STATUS.AUDIT_READY).length}/${events.length}</div>
  </div>
</div>

${eventRows}

<div class="footer">
  BANF Event Reconciliation Agent v1.0 | ${events.length} events | Last updated: ${state.lastUpdated || 'N/A'}
  <br>Usage: <code>node banf-event-reconciliation-agent.js --help</code>
</div>
</body>
</html>`;

  fs.writeFileSync(REPORT_FILE, html);
  log('INFO', `Report saved → ${REPORT_FILE}`);
  return REPORT_FILE;
}

// ═══════════════════════════════════════════════════════════════
// STATUS DISPLAY
// ═══════════════════════════════════════════════════════════════

function showStatus(state) {
  const events = Object.values(state.events);

  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('  📊 BANF Event Reconciliation Status');
  console.log(`  ${events.length} events tracked`);
  console.log('═══════════════════════════════════════════════════════════════\n');

  for (const ev of events.sort((a, b) => (a.eventDate || '').localeCompare(b.eventDate || ''))) {
    const approvals = Object.entries(ev.approvals).filter(([, v]) => v !== null).length;
    const statusIcon = {
      draft: '📝', in_progress: '🔄', submitted: '📤', partially_approved: '⏳',
      approved: '✅', audit_ready: '🔒', reopened: '🔓'
    }[ev.status] || '❓';

    console.log(`  ${statusIcon} ${ev.eventName}`);
    console.log(`     Date: ${ev.eventDate || 'TBD'} | Type: ${ev.eventType} | Status: ${ev.status.toUpperCase()}`);
    console.log(`     Income: $${ev.income.total.toLocaleString()} (${ev.income.items.length} items)`);
    console.log(`     Expenses: $${ev.expenses.total.toLocaleString()} (${ev.expenses.items.length} items)`);
    console.log(`     Net: $${ev.netResult.toLocaleString()} | Approvals: ${approvals}/${APPROVAL_THRESHOLD}`);
    console.log();
  }

  const totalIncome = events.reduce((s, e) => s + e.income.total, 0);
  const totalExpense = events.reduce((s, e) => s + e.expenses.total, 0);
  console.log('  ─────────────────────────────────────────');
  console.log(`  TOTAL: Income $${totalIncome.toLocaleString()} | Expenses $${totalExpense.toLocaleString()} | Net $${(totalIncome - totalExpense).toLocaleString()}`);
  console.log(`  Audit Ready: ${events.filter(e => e.status === RECON_STATUS.AUDIT_READY).length}/${events.length}`);
  console.log('═══════════════════════════════════════════════════════════════\n');
}

// ═══════════════════════════════════════════════════════════════
// GMAIL HELPER (for sending notifications)
// ═══════════════════════════════════════════════════════════════

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

async function getGmailToken() {
  const body = `grant_type=refresh_token&refresh_token=${encodeURIComponent(GOOGLE_REFRESH_TOKEN)}&client_id=${encodeURIComponent(GOOGLE_CLIENT_ID)}&client_secret=${encodeURIComponent(GOOGLE_CLIENT_SECRET)}`;
  const resp = await httpsRequest('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Content-Length': Buffer.byteLength(body) },
    body
  });
  if (resp.data.access_token) return resp.data.access_token;
  throw new Error('Token refresh failed: ' + (resp.data.error_description || resp.data.error || 'unknown'));
}

// ═══════════════════════════════════════════════════════════════
// MODULE EXPORTS (for integration with email reader)
// ═══════════════════════════════════════════════════════════════

module.exports = {
  loadState,
  saveState,
  buildEventReconciliation,
  addManualAdjustment,
  submitForApproval,
  approveReconciliation,
  reopenReconciliation,
  generateReport,
  showStatus,
  RECON_STATUS,
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
  RECONCILIATION_ROLES
};

// ═══════════════════════════════════════════════════════════════
// MAIN CLI
// ═══════════════════════════════════════════════════════════════

async function main() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  📊 BANF Event Expense/Cost Reconciliation Agent v1.0');
  console.log('═══════════════════════════════════════════════════════════════\n');

  const state = loadState();
  const allEvents = getEvents();

  // Build/refresh reconciliation for all events (or filtered)
  const targetEvents = EVENT_FILTER
    ? allEvents.filter(e => e.eventId === EVENT_FILTER)
    : allEvents;

  if (targetEvents.length === 0 && EVENT_FILTER) {
    console.log(`❌ Event not found: ${EVENT_FILTER}`);
    console.log(`Available: ${allEvents.map(e => e.eventId).join(', ')}`);
    process.exit(1);
  }

  // Rebuild reconciliation from all data sources
  for (const event of targetEvents) {
    buildEventReconciliation(state, event.eventId, event);
    log('INFO', `Built reconciliation for ${event.eventId}: Income $${state.events[event.eventId].income.total}, Expenses $${state.events[event.eventId].expenses.total}`);
  }

  // Handle CLI commands
  if (ADD_EXPENSE && EVENT_FILTER) {
    const amount = amountArg ? parseFloat(amountArg.split('=')[1]) : 0;
    const desc = descArg ? descArg.split('=').slice(1).join('=') : 'Manual expense';
    const category = categoryArg ? categoryArg.split('=')[1] : 'miscellaneous';

    if (!amount) {
      console.log('❌ --amount is required. Usage: --add-expense --event=X --amount=Y --desc=Z --category=W');
      process.exit(1);
    }

    addManualAdjustment(state, EVENT_FILTER, {
      type: 'expense',
      amount,
      description: desc,
      category,
      addedBy: BY_EMAIL || 'cli'
    });

    // Rebuild after adjustment
    const ev = allEvents.find(e => e.eventId === EVENT_FILTER);
    if (ev) buildEventReconciliation(state, EVENT_FILTER, ev);

    console.log(`✅ Added expense: $${amount} — ${desc} [${category}] to ${EVENT_FILTER}`);
  }

  if (SUBMIT_EVENT) {
    const submitter = BY_EMAIL || 'cli-user';
    submitForApproval(state, SUBMIT_EVENT, submitter);
    console.log(`✅ Event ${SUBMIT_EVENT} submitted for final reconciliation approval by ${submitter}`);
  }

  if (APPROVE_EVENT && ROLE) {
    const approver = BY_EMAIL || 'cli-user';
    approveReconciliation(state, APPROVE_EVENT, ROLE, approver, '');
    const recon = state.events[APPROVE_EVENT];
    const approvals = Object.values(recon.approvals).filter(a => a !== null).length;
    console.log(`✅ ${RECONCILIATION_ROLES[ROLE].title} (${approver}) approved ${APPROVE_EVENT}. (${approvals}/${APPROVAL_THRESHOLD})`);
    if (recon.status === RECON_STATUS.AUDIT_READY) {
      console.log(`🔒 Event ${APPROVE_EVENT} is now AUDIT_READY!`);
    }
  }

  // Save state
  saveState(state);

  // Show status
  if (SHOW_STATUS) {
    showStatus(state);
  }

  // Generate report
  if (GEN_REPORT) {
    const reportPath = generateReport(state);
    console.log(`\n✅ Report: ${reportPath}`);
    console.log(`✅ State: ${STATE_FILE}`);
  }

  // Help
  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
Usage:
  node banf-event-reconciliation-agent.js                                  # Build & report all events
  node banf-event-reconciliation-agent.js --event=EVENT_ID                 # Single event
  node banf-event-reconciliation-agent.js --status                         # Show status summary
  node banf-event-reconciliation-agent.js --add-expense --event=EVENT_ID --amount=100 --desc="Food" --category=food_catering
  node banf-event-reconciliation-agent.js --submit=EVENT_ID --by=email     # Submit for approval
  node banf-event-reconciliation-agent.js --approve=EVENT_ID --role=treasurer --by=email  # Approve

Expense categories: ${EXPENSE_CATEGORIES.join(', ')}
Income categories: ${INCOME_CATEGORIES.join(', ')}
Roles: ${Object.keys(RECONCILIATION_ROLES).join(', ')}
    `);
  }
}

main().catch(e => {
  log('ERROR', `Fatal: ${e.message}`);
  console.error(e.stack);
  process.exit(1);
});
