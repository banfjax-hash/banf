#!/usr/bin/env node
/**
 * ═══════════════════════════════════════════════════════════════════════
 *  BANF Procurement & Reimbursement Agent
 * ═══════════════════════════════════════════════════════════════════════
 *
 *  Complete procurement lifecycle agent for BANF EC operations.
 *
 *  ██ WORKFLOW ██
 *  1. EC Admin submits procurement/budget approval request
 *  2. Approval routing based on amount:
 *       < $500  → Treasurer only
 *       $500–$999 → Treasurer + VP
 *       $1000+  → Treasurer + VP + President
 *  3. Approval email sent to required approvers
 *  4. Once approved → approval response email to requester
 *  5. Requester purchases + uploads receipt + actual expense
 *  6. If actual > 110% of approved → re-approval required (same tiers)
 *     If actual ≤ 110% of approved → auto-proceeds to reimbursement
 *  7. Payment task created for Treasurer (manual Zelle)
 *  8. Treasurer sends Zelle → email reader confirms → marks complete
 *
 *  ██ STATUS TRACKING ██
 *  Every stage is tracked in banf-procurement-status.json
 *  Portal reads this for real-time visibility
 *
 *  Usage:
 *    node banf-procurement-agent.js --dry-test       Full E2E dry test
 *    node banf-procurement-agent.js --status          Show all requests
 *    node banf-procurement-agent.js --send-approvals  Send pending approval emails
 *    node banf-procurement-agent.js --process-payments Process reimbursement queue
 *
 * ═══════════════════════════════════════════════════════════════════════
 */

const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');
const crypto = require('crypto');

// ─── Config ─────────────────────────────────────────────────────────
const CONFIG = {
  BANF_EMAIL: 'banfjax@gmail.com',
  BANF_ORG: 'Bengali Association of North Florida (BANF)',
  PORTAL_URL: 'https://www.jaxbengali.org/admin-portal',
  ZELLE_EMAIL: 'banfjax@gmail.com'
};

const GMAIL = {
  CLIENT_ID: '1020178199135-3usrl611ara38i7rhu2ub6sn6g1150ml.apps.googleusercontent.com',
  CLIENT_SECRET: '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',
  REFRESH_TOKEN: require('./banf-gmail-config').REFRESH_TOKEN
};

const STATUS_FILE = path.join(__dirname, 'banf-procurement-status.json');

// ─── EC Role Definitions ────────────────────────────────────────────
const EC_MEMBERS = {
  'ranadhir.ghosh@gmail.com':       { name: 'Ranadhir Ghosh', role: 'President', approvalLevel: 3 },
  'mukhopadhyay.partha@gmail.com':  { name: 'Partha Mukhopadhyay', role: 'Vice President', approvalLevel: 2 },
  'amit.everywhere@gmail.com':      { name: 'Amit Chandak', role: 'Treasurer', approvalLevel: 1 },
  'rajanya.ghosh@gmail.com':    { name: 'Rajanya Ghosh', role: 'General Secretary', approvalLevel: 0 },
  'moumitamukherjee2002@yahoo.com': { name: 'Moumita Mukherjee', role: 'Cultural Secretary', approvalLevel: 0 },
  'duttasoumyajit86@gmail.com':     { name: 'Soumyajit Dutta', role: 'Food Coordinator', approvalLevel: 0 },
  'sumantadatta07@gmail.com':       { name: 'Sumanta Datta', role: 'Event Coordinator', approvalLevel: 0 },
  'rwitichoudhury@gmail.com':       { name: 'Rwiti Choudhury', role: 'Puja Coordinator', approvalLevel: 0 }
};

// ─── Approval Thresholds ────────────────────────────────────────────
const APPROVAL_TIERS = {
  TIER_1: { maxAmount: 499.99, requiredApprovers: ['Treasurer'], label: 'Treasurer Only (<$500)' },
  TIER_2: { maxAmount: 999.99, requiredApprovers: ['Treasurer', 'Vice President'], label: 'Treasurer + VP ($500–$999)' },
  TIER_3: { maxAmount: Infinity, requiredApprovers: ['Treasurer', 'Vice President', 'President'], label: 'Treasurer + VP + President ($1000+)' }
};

const VARIANCE_THRESHOLD = 0.10; // 10% — if actual exceeds approved by more than this, re-approval needed

// ═══════════════════════════════════════════════════════════════════
// STATUS FILE MANAGEMENT
// ═══════════════════════════════════════════════════════════════════

function loadStatus() {
  try {
    return JSON.parse(fs.readFileSync(STATUS_FILE, 'utf8'));
  } catch (e) {
    return { requests: [], nextId: 1, log: [] };
  }
}

function saveStatus(data) {
  data.updatedAt = new Date().toISOString();
  const tmp = STATUS_FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2));
  fs.renameSync(tmp, STATUS_FILE);
}

function addLog(data, message, level = 'info') {
  data.log = data.log || [];
  data.log.push({ time: new Date().toISOString(), level, message });
  if (data.log.length > 200) data.log = data.log.slice(-200);
}

// ═══════════════════════════════════════════════════════════════════
// APPROVAL TIER DETERMINATION
// ═══════════════════════════════════════════════════════════════════

function getApprovalTier(amount) {
  if (amount < 500) return APPROVAL_TIERS.TIER_1;
  if (amount < 1000) return APPROVAL_TIERS.TIER_2;
  return APPROVAL_TIERS.TIER_3;
}

function getApproverEmails(tier) {
  const emails = [];
  for (const role of tier.requiredApprovers) {
    const entry = Object.entries(EC_MEMBERS).find(([_, m]) => m.role === role);
    if (entry) emails.push({ email: entry[0], name: entry[1].name, role: entry[1].role });
  }
  return emails;
}

function getNextPendingApprover(request) {
  // Returns the next approver who hasn't approved yet
  const tier = getApprovalTier(request.amount);
  for (const role of tier.requiredApprovers) {
    if (!request.approvals[role]) {
      const entry = Object.entries(EC_MEMBERS).find(([_, m]) => m.role === role);
      if (entry) return { email: entry[0], name: entry[1].name, role };
    }
  }
  return null; // All approved
}

function isFullyApproved(request) {
  const tier = getApprovalTier(request.amount);
  return tier.requiredApprovers.every(role => request.approvals[role]);
}

// ═══════════════════════════════════════════════════════════════════
// REQUEST CREATION
// ═══════════════════════════════════════════════════════════════════

function createProcurementRequest(data, submitterEmail, submitterName) {
  const status = loadStatus();
  const id = 'PROC-' + String(status.nextId++).padStart(3, '0');
  const tier = getApprovalTier(data.amount);

  const request = {
    id,
    description: data.description,
    amount: data.amount,
    category: data.category || 'general',
    neededBy: data.neededBy || '',
    justification: data.justification || '',
    event: data.event || 'Bosonto Utsob 2026',

    // Submitter info
    submitterEmail,
    submitterName,
    submittedAt: new Date().toISOString(),

    // Approval routing
    approvalTier: tier.label,
    requiredApprovers: tier.requiredApprovers,
    approvals: {},        // { 'Treasurer': { by, email, at, decision } }
    currentApprover: tier.requiredApprovers[0],
    
    // Status tracking
    status: 'pending_approval',  // pending_approval | approved | purchase_pending | receipt_uploaded | 
                                  // variance_review | reimbursement_pending | payment_initiated |
                                  // payment_sent | completed | rejected
    
    // Receipt & reimbursement
    actualAmount: null,
    receiptFile: null,
    receiptNotes: null,
    receiptUploadedAt: null,
    variancePercent: null,
    varianceApproved: false,

    // Payment
    paymentMethod: null,
    paymentReference: null,
    paymentInitiatedAt: null,
    paymentConfirmedAt: null,
    reimbursedAt: null,

    // History
    history: [
      { ts: new Date().toISOString(), action: 'SUBMITTED', by: submitterEmail, detail: `Request created. Amount: $${data.amount.toFixed(2)}. Tier: ${tier.label}` }
    ]
  };

  status.requests.push(request);
  addLog(status, `New request ${id} by ${submitterName}: $${data.amount.toFixed(2)} — ${tier.label}`);
  saveStatus(status);
  return request;
}

// ═══════════════════════════════════════════════════════════════════
// APPROVAL PROCESSING
// ═══════════════════════════════════════════════════════════════════

function approveRequest(procId, approverEmail, decision = 'approved', comment = '') {
  const status = loadStatus();
  const req = status.requests.find(r => r.id === procId);
  if (!req) throw new Error(`Request ${procId} not found`);
  if (req.status === 'rejected' || req.status === 'completed') throw new Error(`Request ${procId} is ${req.status}`);

  const member = EC_MEMBERS[approverEmail];
  if (!member) throw new Error(`${approverEmail} is not a recognized EC member`);

  const role = member.role;
  if (!req.requiredApprovers.includes(role)) throw new Error(`${role} is not required to approve this request`);

  if (decision === 'rejected') {
    req.status = 'rejected';
    req.approvals[role] = { by: member.name, email: approverEmail, at: new Date().toISOString(), decision: 'rejected', comment };
    req.history.push({ ts: new Date().toISOString(), action: 'REJECTED', by: approverEmail, detail: `Rejected by ${member.name} (${role}). ${comment}` });
    addLog(status, `${procId} REJECTED by ${member.name} (${role})`);
    saveStatus(status);
    return { status: 'rejected', request: req };
  }

  // Record approval
  req.approvals[role] = { by: member.name, email: approverEmail, at: new Date().toISOString(), decision: 'approved', comment };
  req.history.push({ ts: new Date().toISOString(), action: 'APPROVED', by: approverEmail, detail: `Approved by ${member.name} (${role}). ${comment}` });

  if (isFullyApproved(req)) {
    req.status = 'approved';
    req.currentApprover = null;
    req.history.push({ ts: new Date().toISOString(), action: 'FULLY_APPROVED', by: 'system', detail: `All required approvals received. Requester may proceed with purchase.` });
    addLog(status, `${procId} FULLY APPROVED — all ${req.requiredApprovers.join(', ')} approved`);
  } else {
    const next = getNextPendingApprover(req);
    req.currentApprover = next ? next.role : null;
    addLog(status, `${procId} approved by ${role}, next: ${req.currentApprover}`);
  }

  saveStatus(status);
  return { status: req.status, request: req };
}

// ═══════════════════════════════════════════════════════════════════
// RECEIPT & VARIANCE CHECK
// ═══════════════════════════════════════════════════════════════════

function submitReceipt(procId, actualAmount, receiptFile, notes) {
  const status = loadStatus();
  const req = status.requests.find(r => r.id === procId);
  if (!req) throw new Error(`Request ${procId} not found`);

  req.actualAmount = actualAmount;
  req.receiptFile = receiptFile;
  req.receiptNotes = notes;
  req.receiptUploadedAt = new Date().toISOString();
  
  // Calculate variance
  const variance = (actualAmount - req.amount) / req.amount;
  req.variancePercent = Math.round(variance * 10000) / 100; // e.g., 12.34%

  req.history.push({ ts: new Date().toISOString(), action: 'RECEIPT_UPLOADED', by: req.submitterEmail, 
    detail: `Receipt: ${receiptFile}. Actual: $${actualAmount.toFixed(2)} (${req.variancePercent > 0 ? '+' : ''}${req.variancePercent}% vs approved $${req.amount.toFixed(2)})` });

  if (actualAmount > req.amount * (1 + VARIANCE_THRESHOLD)) {
    // Actual exceeds approved by more than 10% → needs re-approval
    req.status = 'variance_review';
    req.varianceApproved = false;
    // Reset approvals for re-approval of the variance
    req.varianceApprovals = {};
    const tier = getApprovalTier(actualAmount);
    req.varianceRequiredApprovers = tier.requiredApprovers;
    req.currentApprover = tier.requiredApprovers[0];
    req.history.push({ ts: new Date().toISOString(), action: 'VARIANCE_FLAGGED', by: 'system', 
      detail: `Actual ($${actualAmount.toFixed(2)}) exceeds approved ($${req.amount.toFixed(2)}) by ${req.variancePercent}% (>${VARIANCE_THRESHOLD*100}% threshold). Re-approval required.` });
    addLog(status, `${procId} VARIANCE FLAGGED: $${actualAmount.toFixed(2)} vs $${req.amount.toFixed(2)} (+${req.variancePercent}%)`);
  } else {
    // Within tolerance → proceed to reimbursement
    req.status = 'reimbursement_pending';
    req.varianceApproved = true;
    req.history.push({ ts: new Date().toISOString(), action: 'VARIANCE_OK', by: 'system', 
      detail: `Actual within ${VARIANCE_THRESHOLD*100}% tolerance. Proceeding to reimbursement queue.` });
    addLog(status, `${procId} variance OK → reimbursement queue: $${actualAmount.toFixed(2)}`);
  }

  saveStatus(status);
  return req;
}

// ═══════════════════════════════════════════════════════════════════
// VARIANCE RE-APPROVAL
// ═══════════════════════════════════════════════════════════════════

function approveVariance(procId, approverEmail, decision = 'approved', comment = '') {
  const status = loadStatus();
  const req = status.requests.find(r => r.id === procId);
  if (!req || req.status !== 'variance_review') throw new Error(`${procId} not in variance review`);

  const member = EC_MEMBERS[approverEmail];
  if (!member) throw new Error(`${approverEmail} is not a recognized EC member`);

  const role = member.role;
  req.varianceApprovals = req.varianceApprovals || {};

  if (decision === 'rejected') {
    req.status = 'rejected';
    req.varianceApprovals[role] = { by: member.name, email: approverEmail, at: new Date().toISOString(), decision: 'rejected', comment };
    req.history.push({ ts: new Date().toISOString(), action: 'VARIANCE_REJECTED', by: approverEmail, detail: `Variance rejected by ${member.name} (${role}). ${comment}` });
    addLog(status, `${procId} variance REJECTED by ${member.name} (${role})`);
    saveStatus(status);
    return req;
  }

  req.varianceApprovals[role] = { by: member.name, email: approverEmail, at: new Date().toISOString(), decision: 'approved', comment };
  req.history.push({ ts: new Date().toISOString(), action: 'VARIANCE_APPROVED', by: approverEmail, detail: `Variance approved by ${member.name} (${role}). ${comment}` });

  const allVarianceApproved = (req.varianceRequiredApprovers || []).every(r => req.varianceApprovals[r]);
  if (allVarianceApproved) {
    req.status = 'reimbursement_pending';
    req.varianceApproved = true;
    req.currentApprover = null;
    req.history.push({ ts: new Date().toISOString(), action: 'VARIANCE_FULLY_APPROVED', by: 'system', detail: 'All variance approvals received. Proceeding to reimbursement.' });
    addLog(status, `${procId} variance fully approved → reimbursement queue`);
  } else {
    const nextRole = (req.varianceRequiredApprovers || []).find(r => !req.varianceApprovals[r]);
    req.currentApprover = nextRole;
    addLog(status, `${procId} variance approved by ${role}, next: ${nextRole}`);
  }

  saveStatus(status);
  return req;
}

// ═══════════════════════════════════════════════════════════════════
// PAYMENT / REIMBURSEMENT
// ═══════════════════════════════════════════════════════════════════

function initiatePayment(procId) {
  const status = loadStatus();
  const req = status.requests.find(r => r.id === procId);
  if (!req) throw new Error(`${procId} not found`);
  if (req.status !== 'reimbursement_pending') throw new Error(`${procId} not in reimbursement queue`);

  req.status = 'payment_initiated';
  req.paymentMethod = 'Zelle';
  req.paymentInitiatedAt = new Date().toISOString();
  req.history.push({ ts: new Date().toISOString(), action: 'PAYMENT_INITIATED', by: 'Treasurer', 
    detail: `Zelle payment task created: $${(req.actualAmount || req.amount).toFixed(2)} to ${req.submitterName}` });
  addLog(status, `${procId} payment initiated via Zelle: $${(req.actualAmount || req.amount).toFixed(2)}`);
  saveStatus(status);
  return req;
}

function confirmPayment(procId, reference = '') {
  const status = loadStatus();
  const req = status.requests.find(r => r.id === procId);
  if (!req) throw new Error(`${procId} not found`);

  req.status = 'completed';
  req.paymentReference = reference;
  req.paymentConfirmedAt = new Date().toISOString();
  req.reimbursedAt = new Date().toISOString();
  req.history.push({ ts: new Date().toISOString(), action: 'PAYMENT_CONFIRMED', by: 'system', 
    detail: `Zelle payment confirmed. Ref: ${reference || 'N/A'}. Reimbursement complete.` });
  addLog(status, `${procId} COMPLETED — reimbursed $${(req.actualAmount || req.amount).toFixed(2)} via Zelle`);
  saveStatus(status);
  return req;
}

// ═══════════════════════════════════════════════════════════════════
// EMAIL TRANSPORT
// ═══════════════════════════════════════════════════════════════════

let _transport = null;
async function getTransport() {
  if (_transport) return _transport;
  _transport = nodemailer.createTransport({
    service: 'gmail',
    auth: { type: 'OAuth2', user: CONFIG.BANF_EMAIL, clientId: GMAIL.CLIENT_ID, clientSecret: GMAIL.CLIENT_SECRET, refreshToken: GMAIL.REFRESH_TOKEN }
  });
  return _transport;
}

function buildApprovalRequestEmail(request, approver) {
  const tier = getApprovalTier(request.amount);
  return {
    subject: `🔔 BANF Approval Required: ${request.id} — $${request.amount.toFixed(2)} (${request.category})`,
    html: `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#f0f4f8;font-family:'Segoe UI',system-ui,sans-serif">
<div style="max-width:600px;margin:20px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.08)">
  <div style="background:linear-gradient(135deg,#1e3a5f,#d4a843);padding:24px;text-align:center">
    <h1 style="color:#fff;font-size:18px;margin:0">📋 Procurement Approval Required</h1>
    <p style="color:rgba(255,255,255,.8);font-size:12px;margin:4px 0 0">${CONFIG.BANF_ORG}</p>
  </div>
  <div style="padding:24px">
    <p style="font-size:14px;color:#1a1a1a">Hello <strong>${approver.name}</strong>,</p>
    <p style="font-size:13px;color:#4a4a4a;line-height:1.6">A procurement request requires your approval as <strong>${approver.role}</strong>:</p>
    <div style="background:#f0f7ff;border-radius:12px;padding:16px;margin:16px 0;border-left:4px solid #2d5a8e">
      <table style="width:100%;font-size:13px;color:#333" cellpadding="4">
        <tr><td style="font-weight:600;width:140px">Request ID:</td><td>${request.id}</td></tr>
        <tr><td style="font-weight:600">Amount:</td><td style="font-size:16px;font-weight:700;color:#1e3a5f">$${request.amount.toFixed(2)}</td></tr>
        <tr><td style="font-weight:600">Category:</td><td>${request.category}</td></tr>
        <tr><td style="font-weight:600">Description:</td><td>${request.description}</td></tr>
        <tr><td style="font-weight:600">Requested by:</td><td>${request.submitterName}</td></tr>
        <tr><td style="font-weight:600">Needed by:</td><td>${request.neededBy || 'ASAP'}</td></tr>
        <tr><td style="font-weight:600">Justification:</td><td>${request.justification || '—'}</td></tr>
        <tr><td style="font-weight:600">Approval Tier:</td><td>${tier.label}</td></tr>
      </table>
    </div>
    <p style="font-size:13px;color:#4a4a4a">Please review and approve/reject from the <a href="${CONFIG.PORTAL_URL}#procurement" style="color:#2d5a8e;font-weight:600">Admin Portal → Procurement</a>.</p>
    <div style="background:#fef2f2;border-radius:12px;padding:12px;margin:16px 0;border-left:4px solid #ef4444">
      <p style="font-size:12px;color:#991b1b;margin:0">⏰ Auto-escalation: If not acted upon within 24 hours, this will automatically escalate to the next approver.</p>
    </div>
  </div>
  <div style="background:#f8fafc;padding:12px 24px;text-align:center;border-top:1px solid #e5e7eb">
    <p style="font-size:10px;color:#999;margin:0">${CONFIG.BANF_ORG}</p>
  </div>
</div></body></html>`
  };
}

function buildApprovalResponseEmail(request) {
  const isApproved = request.status === 'approved';
  return {
    subject: isApproved 
      ? `✅ BANF Procurement Approved: ${request.id} — $${request.amount.toFixed(2)}`
      : `❌ BANF Procurement Rejected: ${request.id}`,
    html: `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#f0f4f8;font-family:'Segoe UI',system-ui,sans-serif">
<div style="max-width:600px;margin:20px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.08)">
  <div style="background:linear-gradient(135deg,${isApproved ? '#15803d,#22c55e' : '#991b1b,#ef4444'});padding:24px;text-align:center">
    <h1 style="color:#fff;font-size:18px;margin:0">${isApproved ? '✅ Procurement Approved!' : '❌ Procurement Rejected'}</h1>
  </div>
  <div style="padding:24px">
    <p style="font-size:14px;color:#1a1a1a">Hello <strong>${request.submitterName}</strong>,</p>
    <p style="font-size:13px;color:#4a4a4a;line-height:1.6">${isApproved
      ? `Your procurement request <strong>${request.id}</strong> has been <strong style="color:#15803d">approved</strong> by all required approvers. You may now proceed with the purchase.`
      : `Your procurement request <strong>${request.id}</strong> has been <strong style="color:#ef4444">rejected</strong>.`}</p>
    <div style="background:${isApproved ? '#f0fdf4' : '#fef2f2'};border-radius:12px;padding:16px;margin:16px 0;border-left:4px solid ${isApproved ? '#22c55e' : '#ef4444'}">
      <table style="width:100%;font-size:13px;color:#333" cellpadding="4">
        <tr><td style="font-weight:600;width:140px">Request ID:</td><td>${request.id}</td></tr>
        <tr><td style="font-weight:600">Approved Amount:</td><td style="font-weight:700">$${request.amount.toFixed(2)}</td></tr>
        <tr><td style="font-weight:600">Category:</td><td>${request.category}</td></tr>
        <tr><td style="font-weight:600">Description:</td><td>${request.description}</td></tr>
        ${Object.entries(request.approvals).map(([role, a]) => 
          `<tr><td style="font-weight:600">${role}:</td><td>${a.decision === 'approved' ? '✅' : '❌'} ${a.by} (${new Date(a.at).toLocaleDateString()})</td></tr>`
        ).join('')}
      </table>
    </div>
    ${isApproved ? `
    <div style="background:#fffbeb;border-radius:12px;padding:14px;margin:16px 0;border-left:4px solid #eab308">
      <h3 style="font-size:13px;color:#92400e;margin:0 0 6px">📝 Next Steps</h3>
      <ol style="font-size:12px;color:#78350f;line-height:1.8;margin:0;padding-left:18px">
        <li>Make the purchase (within approved budget of $${request.amount.toFixed(2)})</li>
        <li>Save all receipts</li>
        <li>Go to <a href="${CONFIG.PORTAL_URL}#procurement" style="color:#2d5a8e">Admin Portal → Procurement</a></li>
        <li>Click "Upload Receipt" on your request and enter actual amount</li>
        <li>Reimbursement will be processed via Zelle within 24 hours</li>
      </ol>
      <p style="font-size:11px;color:#b45309;margin:8px 0 0">⚠️ If actual cost exceeds approved amount by more than 10%, re-approval will be required.</p>
    </div>` : ''}
  </div>
  <div style="background:#f8fafc;padding:12px 24px;text-align:center;border-top:1px solid #e5e7eb">
    <p style="font-size:10px;color:#999;margin:0">${CONFIG.BANF_ORG}</p>
  </div>
</div></body></html>`
  };
}

function buildReimbursementConfirmEmail(request) {
  return {
    subject: `💰 BANF Reimbursement Complete: ${request.id} — $${(request.actualAmount || request.amount).toFixed(2)}`,
    html: `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#f0f4f8;font-family:'Segoe UI',system-ui,sans-serif">
<div style="max-width:600px;margin:20px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.08)">
  <div style="background:linear-gradient(135deg,#15803d,#22c55e);padding:24px;text-align:center">
    <h1 style="color:#fff;font-size:18px;margin:0">💰 Reimbursement Complete!</h1>
  </div>
  <div style="padding:24px">
    <p style="font-size:14px;color:#1a1a1a">Hello <strong>${request.submitterName}</strong>,</p>
    <p style="font-size:13px;color:#4a4a4a;line-height:1.6">Your reimbursement for <strong>${request.id}</strong> has been processed.</p>
    <div style="background:#f0fdf4;border-radius:12px;padding:16px;margin:16px 0;border-left:4px solid #22c55e">
      <table style="width:100%;font-size:13px;color:#333" cellpadding="4">
        <tr><td style="font-weight:600;width:140px">Amount Reimbursed:</td><td style="font-weight:700;font-size:16px;color:#15803d">$${(request.actualAmount || request.amount).toFixed(2)}</td></tr>
        <tr><td style="font-weight:600">Payment Method:</td><td>${request.paymentMethod || 'Zelle'}</td></tr>
        <tr><td style="font-weight:600">Reference:</td><td>${request.paymentReference || '—'}</td></tr>
        <tr><td style="font-weight:600">Description:</td><td>${request.description}</td></tr>
      </table>
    </div>
    <p style="font-size:12px;color:#888;text-align:center">Thank you for your contribution to BANF events! 🌸</p>
  </div>
</div></body></html>`
  };
}

function buildPaymentTaskEmail(request) {
  return {
    subject: `🏦 BANF Payment Task: Reimburse ${request.submitterName} — $${(request.actualAmount || request.amount).toFixed(2)} via Zelle`,
    html: `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#f0f4f8;font-family:'Segoe UI',system-ui,sans-serif">
<div style="max-width:600px;margin:20px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.08)">
  <div style="background:linear-gradient(135deg,#1e3a5f,#3b82f6);padding:24px;text-align:center">
    <h1 style="color:#fff;font-size:18px;margin:0">🏦 Reimbursement Payment Task</h1>
  </div>
  <div style="padding:24px">
    <p style="font-size:14px;color:#1a1a1a">Hello <strong>Amit</strong> (Treasurer),</p>
    <p style="font-size:13px;color:#4a4a4a;line-height:1.6">A reimbursement payment needs to be sent:</p>
    <div style="background:#f0f7ff;border-radius:12px;padding:16px;margin:16px 0;border-left:4px solid #3b82f6">
      <table style="width:100%;font-size:13px;color:#333" cellpadding="4">
        <tr><td style="font-weight:600;width:140px">Pay To:</td><td style="font-weight:700">${request.submitterName}</td></tr>
        <tr><td style="font-weight:600">Email:</td><td>${request.submitterEmail}</td></tr>
        <tr><td style="font-weight:600">Amount:</td><td style="font-weight:700;font-size:16px;color:#1e3a5f">$${(request.actualAmount || request.amount).toFixed(2)}</td></tr>
        <tr><td style="font-weight:600">Method:</td><td>Zelle</td></tr>
        <tr><td style="font-weight:600">Request ID:</td><td>${request.id}</td></tr>
        <tr><td style="font-weight:600">Description:</td><td>${request.description}</td></tr>
        <tr><td style="font-weight:600">Receipt:</td><td>${request.receiptFile || 'Uploaded in portal'}</td></tr>
      </table>
    </div>
    <div style="background:#fffbeb;border-radius:12px;padding:12px;margin:16px 0;border-left:4px solid #eab308">
      <p style="font-size:12px;color:#92400e;margin:0"><strong>Zelle Memo:</strong> BANF ${request.id} Reimbursement</p>
      <p style="font-size:11px;color:#b45309;margin:4px 0 0">The email reader agent will automatically detect the Zelle payment notification and mark this reimbursement as complete.</p>
    </div>
  </div>
</div></body></html>`
  };
}

async function sendEmail(to, emailContent) {
  const transport = await getTransport();
  const info = await transport.sendMail({
    from: `"BANF Procurement" <${CONFIG.BANF_EMAIL}>`,
    to,
    subject: emailContent.subject,
    html: emailContent.html
  });
  return info;
}

// ═══════════════════════════════════════════════════════════════════
// DRY TEST — Full End-to-End Simulation
// ═══════════════════════════════════════════════════════════════════

async function dryTestE2E() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  🧪 BANF Procurement Agent — E2E Dry Test');
  console.log('═══════════════════════════════════════════════════════════\n');

  // Reset status for clean test
  saveStatus({ requests: [], nextId: 1, log: [] });

  const tests = [
    { name: 'Tier 1: Under $500 (Treasurer only)', amount: 350 },
    { name: 'Tier 2: $500–$999 (Treasurer + VP)', amount: 750 },
    { name: 'Tier 3: $1000+ (Treasurer + VP + President)', amount: 1500 },
    { name: 'Variance trigger: actual > 10% of approved', amount: 200, actualOverride: 250 },
  ];

  let passed = 0, failed = 0;

  for (const test of tests) {
    console.log(`\n${'─'.repeat(60)}`);
    console.log(`  📋 TEST: ${test.name}`);
    console.log(`${'─'.repeat(60)}`);

    try {
      // 1. SUBMIT
      console.log(`  [1] Submit request: $${test.amount.toFixed(2)}`);
      const req = createProcurementRequest({
        description: `Test: ${test.name}`,
        amount: test.amount,
        category: 'Event Supplies',
        neededBy: '2026-03-07',
        justification: 'Bosonto Utsob 2026 preparations',
        event: 'Bosonto Utsob 2026'
      }, 'duttasoumyajit86@gmail.com', 'Soumyajit Dutta');
      console.log(`      ✅ Created: ${req.id}, Tier: ${req.approvalTier}`);
      console.log(`      Required approvers: ${req.requiredApprovers.join(', ')}`);

      // 2. APPROVAL CHAIN
      const tier = getApprovalTier(test.amount);
      for (const role of tier.requiredApprovers) {
        const approverEntry = Object.entries(EC_MEMBERS).find(([_, m]) => m.role === role);
        if (!approverEntry) throw new Error(`No approver for role ${role}`);

        console.log(`  [2] ${role} approval by ${approverEntry[1].name}...`);
        const result = approveRequest(req.id, approverEntry[0], 'approved', `Approved for Bosonto`);
        console.log(`      ✅ ${role}: approved. Status: ${result.status}`);
      }

      // Verify fully approved
      const statusData = loadStatus();
      const updatedReq = statusData.requests.find(r => r.id === req.id);
      if (updatedReq.status !== 'approved') throw new Error(`Expected 'approved', got '${updatedReq.status}'`);
      console.log(`      ✅ FULLY APPROVED`);

      // 3. RECEIPT UPLOAD
      const actualAmount = test.actualOverride || test.amount * 0.95; // 5% under unless overridden
      console.log(`  [3] Upload receipt: actual $${actualAmount.toFixed(2)} (approved: $${test.amount.toFixed(2)})`);
      const afterReceipt = submitReceipt(req.id, actualAmount, 'receipt_test.pdf', 'Test receipt');
      console.log(`      Variance: ${afterReceipt.variancePercent}%`);
      console.log(`      Status after receipt: ${afterReceipt.status}`);

      if (afterReceipt.status === 'variance_review') {
        console.log(`  [3b] VARIANCE REVIEW — actual > 10% → re-approval needed`);
        const varTier = getApprovalTier(actualAmount);
        for (const role of varTier.requiredApprovers) {
          const approverEntry = Object.entries(EC_MEMBERS).find(([_, m]) => m.role === role);
          console.log(`      ${role} variance approval...`);
          approveVariance(req.id, approverEntry[0], 'approved', 'Variance acceptable');
        }
        const afterVariance = loadStatus().requests.find(r => r.id === req.id);
        console.log(`      ✅ Variance approved. Status: ${afterVariance.status}`);
      }

      // 4. PAYMENT
      console.log(`  [4] Initiate payment (Zelle)...`);
      initiatePayment(req.id);
      console.log(`      ✅ Payment task created for Treasurer`);

      // 5. CONFIRM PAYMENT
      console.log(`  [5] Confirm Zelle payment...`);
      confirmPayment(req.id, `ZELLE-${crypto.randomBytes(4).toString('hex').toUpperCase()}`);
      
      const finalReq = loadStatus().requests.find(r => r.id === req.id);
      if (finalReq.status !== 'completed') throw new Error(`Expected 'completed', got '${finalReq.status}'`);
      console.log(`      ✅ COMPLETED — Full lifecycle done`);
      console.log(`      History: ${finalReq.history.length} events`);

      passed++;
    } catch (err) {
      console.error(`      ❌ FAILED: ${err.message}`);
      failed++;
    }
  }

  // 5. TEST REJECTION
  console.log(`\n${'─'.repeat(60)}`);
  console.log(`  📋 TEST: Rejection flow`);
  console.log(`${'─'.repeat(60)}`);
  try {
    const rejReq = createProcurementRequest({
      description: 'Should be rejected', amount: 600, category: 'Other',
      justification: 'Test rejection', event: 'Bosonto Utsob 2026'
    }, 'rwitichoudhury@gmail.com', 'Rwiti Choudhury');
    console.log(`  [1] Submitted: ${rejReq.id}`);
    
    console.log(`  [2] Treasurer rejects...`);
    approveRequest(rejReq.id, 'amit.everywhere@gmail.com', 'rejected', 'Budget exceeded for this year');
    const rejFinal = loadStatus().requests.find(r => r.id === rejReq.id);
    if (rejFinal.status !== 'rejected') throw new Error(`Expected 'rejected', got '${rejFinal.status}'`);
    console.log(`      ✅ Rejected correctly. Status: ${rejFinal.status}`);
    passed++;
  } catch (err) {
    console.error(`      ❌ FAILED: ${err.message}`);
    failed++;
  }

  console.log(`\n${'═'.repeat(60)}`);
  console.log(`  🧪 DRY TEST RESULTS: ${passed} passed, ${failed} failed (${passed+failed} total)`);
  console.log(`${'═'.repeat(60)}`);

  // Show final status
  const finalStatus = loadStatus();
  console.log(`\n  📊 Final status file: ${finalStatus.requests.length} requests`);
  finalStatus.requests.forEach(r => {
    console.log(`    ${r.id}: $${r.amount.toFixed(2)} → ${r.status} (${r.history.length} events)`);
  });

  return { passed, failed };
}

// ═══════════════════════════════════════════════════════════════════
// DISPLAY STATUS
// ═══════════════════════════════════════════════════════════════════

function showStatus() {
  const data = loadStatus();
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  📊 BANF Procurement Status');
  console.log('═══════════════════════════════════════════════════════════\n');

  if (data.requests.length === 0) {
    console.log('  No procurement requests found.\n');
    return;
  }

  const statusColors = {
    'pending_approval': '⏳', 'approved': '✅', 'purchase_pending': '🛒',
    'receipt_uploaded': '📄', 'variance_review': '⚠️', 'reimbursement_pending': '💰',
    'payment_initiated': '🏦', 'completed': '✅✅', 'rejected': '❌'
  };

  data.requests.forEach(r => {
    const icon = statusColors[r.status] || '❓';
    console.log(`  ${icon} ${r.id}: $${r.amount.toFixed(2)} — ${r.status}`);
    console.log(`     ${r.description.substring(0, 60)}`);
    console.log(`     By: ${r.submitterName} | Tier: ${r.approvalTier}`);
    if (r.actualAmount) console.log(`     Actual: $${r.actualAmount.toFixed(2)} (variance: ${r.variancePercent}%)`);
    console.log(`     History: ${r.history.length} events | ${r.currentApprover ? 'Waiting: ' + r.currentApprover : ''}`);
    console.log('');
  });
}

// ═══════════════════════════════════════════════════════════════════
// MODULE EXPORTS — For portal integration and email reader pipeline
// ═══════════════════════════════════════════════════════════════════

module.exports = {
  createProcurementRequest,
  approveRequest,
  submitReceipt,
  approveVariance,
  initiatePayment,
  confirmPayment,
  loadStatus,
  saveStatus,
  showStatus,
  dryTestE2E,
  getApprovalTier,
  getApproverEmails,
  getNextPendingApprover,
  isFullyApproved,
  sendEmail,
  buildApprovalRequestEmail,
  buildApprovalResponseEmail,
  buildReimbursementConfirmEmail,
  buildPaymentTaskEmail,
  EC_MEMBERS,
  APPROVAL_TIERS,
  CONFIG,
  VARIANCE_THRESHOLD
};

// ═══════════════════════════════════════════════════════════════════
// MAIN CLI
// ═══════════════════════════════════════════════════════════════════

if (require.main === module) {
async function main() {
  const args = process.argv.slice(2);

  console.log('╔═══════════════════════════════════════════════════════╗');
  console.log('║  BANF Procurement & Reimbursement Agent              ║');
  console.log('╚═══════════════════════════════════════════════════════╝\n');

  if (args.includes('--dry-test')) {
    return await dryTestE2E();
  }

  if (args.includes('--status')) {
    return showStatus();
  }

  if (args.includes('--send-approvals')) {
    console.log('📧 Sending pending approval emails...\n');
    const data = loadStatus();
    let sent = 0;
    for (const req of data.requests) {
      if (req.status !== 'pending_approval' || !req.currentApprover) continue;
      const approverEntry = Object.entries(EC_MEMBERS).find(([_, m]) => m.role === req.currentApprover);
      if (!approverEntry) continue;
      const email = buildApprovalRequestEmail(req, { name: approverEntry[1].name, role: approverEntry[1].role });
      try {
        await sendEmail(approverEntry[0], email);
        console.log(`  ✅ Sent approval request to ${approverEntry[1].name} (${approverEntry[1].role}) for ${req.id}`);
        sent++;
      } catch (err) {
        console.error(`  ❌ Failed to send to ${approverEntry[1].role}: ${err.message.slice(0, 100)}`);
      }
    }
    console.log(`\n  📧 ${sent} approval emails sent.`);
    return;
  }

  if (args.includes('--process-payments')) {
    console.log('🏦 Processing reimbursement queue...\n');
    const data = loadStatus();
    let processed = 0;
    for (const req of data.requests) {
      if (req.status === 'reimbursement_pending') {
        initiatePayment(req.id);
        const email = buildPaymentTaskEmail(req);
        try {
          await sendEmail('amit.everywhere@gmail.com', email);
          console.log(`  ✅ Payment task created for ${req.id}: $${(req.actualAmount || req.amount).toFixed(2)} → ${req.submitterName}`);
          processed++;
        } catch (err) {
          console.error(`  ❌ Failed to send payment task for ${req.id}: ${err.message.slice(0, 100)}`);
        }
      }
    }
    console.log(`\n  🏦 ${processed} payment tasks created.`);
    return;
  }

  console.log('Usage:');
  console.log('  --dry-test          Full E2E dry test');
  console.log('  --status            Show all requests');
  console.log('  --send-approvals    Send pending approval emails');
  console.log('  --process-payments  Process reimbursement queue');
}

main().catch(err => { console.error('Fatal:', err.message); process.exit(1); });
}
