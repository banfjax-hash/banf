#!/usr/bin/env node
/**
 * ΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉ
 *  BANF Change Agent ΓÇö Technical Validation & Stakeholder Approval
 * ΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉ
 *
 *  Ownership: Manages the change request lifecycle for the BANF platform.
 *
 *  Pipeline:
 *    1. INTAKE ΓÇö New change request received (from user, agent, or code review)
 *    2. TECHNICAL_REVIEW ΓÇö Change Agent validates feasibility, risk, affected modules
 *    3. STAKEHOLDER_APPROVAL ΓÇö (optional, toggled by super admin) routes to president/EC
 *    4. ARCHITECTURE_UPDATE ΓÇö Sends to Design-Architecture Agent for doc update
 *    5. DEV_TICKET ΓÇö Creates development ticket on the board
 *    6. IMPLEMENTATION ΓÇö Tracks development progress
 *
 *  Stakeholder approval pipeline can be activated/deactivated by super admin.
 *  When inactive, changes flow directly from TECHNICAL_REVIEW ΓåÆ ARCHITECTURE_UPDATE.
 *
 *  State: dev-board-state.json
 *
 *  Usage:
 *    const changeAgent = require('./banf-change-agent.js');
 *    changeAgent.submitChange({ title, description, requestedBy, type });
 *    changeAgent.reviewChange(changeId);
 *    changeAgent.approveChange(changeId, approver);
 *    changeAgent.rejectChange(changeId, approver, reason);
 *
 *    CLI:
 *      node banf-change-agent.js --submit "Title" --desc "Description" --by "Name" --type feature
 *      node banf-change-agent.js --review CR-001
 *      node banf-change-agent.js --approve CR-001 --approver "Ranadhir Ghosh"
 *      node banf-change-agent.js --board
 *      node banf-change-agent.js --toggle-stakeholder   (enable/disable stakeholder approval)
 *      node banf-change-agent.js --status
 *
 * ΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉ
 */

const fs = require('fs');
const path = require('path');

// ΓöÇΓöÇ Config ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
const STATE_FILE = path.join(__dirname, 'dev-board-state.json');
const ARCH_AGENT_FILE = path.join(__dirname, 'banf-design-architecture-agent.js');

const CHANGE_TYPES = ['feature', 'bugfix', 'refactor', 'security', 'performance', 'documentation', 'infrastructure'];
const PRIORITY_LEVELS = ['critical', 'high', 'medium', 'low'];
const RISK_LEVELS = ['high', 'medium', 'low'];

const STATUS_FLOW = [
  'intake',             // 1. Request received
  'technical_review',   // 2. Change Agent analyzing
  'stakeholder_pending',// 3. Awaiting stakeholder approval (optional)
  'stakeholder_approved',// 3b. Stakeholder approved
  'architecture_update',// 4. Design doc being updated
  'ticket_created',     // 5. Dev ticket on board
  'in_progress',        // 6. Development started
  'testing',            // 7. In testing
  'deployed',           // 8. Deployed to production
  'closed',             // 9. Done
  'rejected',           // X. Rejected at any stage
];

// ΓöÇΓöÇ Module Registry ΓÇö known modules and their risk profiles ΓöÇΓöÇΓöÇΓöÇΓöÇ
const MODULE_REGISTRY = {
  'http-functions.js':       { risk: 'high', type: 'backend', owner: 'Platform Lead', dependencies: ['admin-portal', 'member-portal'] },
  'admin-portal.html':       { risk: 'medium', type: 'frontend', owner: 'Frontend Agent', dependencies: ['http-functions'] },
  'member-portal.html':      { risk: 'medium', type: 'frontend', owner: 'Frontend Agent', dependencies: ['http-functions'] },
  'bosonto-email-reader-agent.js': { risk: 'high', type: 'agent', owner: 'Email Agent', dependencies: ['gmail-oauth', 'user-query-agent'] },
  'user-query-agent.js':     { risk: 'medium', type: 'agent', owner: 'Classifier Agent', dependencies: ['banf-rl-feedback-engine'] },
  'banf-rl-feedback-engine.js': { risk: 'medium', type: 'ml', owner: 'ML Agent', dependencies: ['user-query-state'] },
  'banf-event-manager.js':   { risk: 'medium', type: 'agent', owner: 'Event Manager', dependencies: ['banf-drives.yaml'] },
  'banf-drives.yaml':        { risk: 'low', type: 'config', owner: 'Event Manager', dependencies: [] },
  'banf-message-queue.js':   { risk: 'medium', type: 'infrastructure', owner: 'Platform Lead', dependencies: [] },
  'agent-memory-rag.js':     { risk: 'medium', type: 'ml', owner: 'Memory Agent', dependencies: ['agent-memory-store'] },
  'communication-compliance.js': { risk: 'high', type: 'compliance', owner: 'Compliance Agent', dependencies: [] },
  'banf-payment-purpose-engine.js': { risk: 'high', type: 'finance', owner: 'Payment Agent', dependencies: ['crm'] },
  'banf-delivery-failure-agent.js': { risk: 'medium', type: 'agent', owner: 'Recovery Agent', dependencies: ['gmail-oauth'] },
  'collections/*.json':      { risk: 'high', type: 'data-model', owner: 'Backend Agent', dependencies: ['http-functions'] },
};

// ΓöÇΓöÇ Logging ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
function log(level, msg) {
  const ts = new Date().toISOString();
  console.log(`[${ts}] [${level}] [ChangeAgent] ${msg}`);
}

// ΓöÇΓöÇ State Management ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
function loadState() {
  try {
    if (fs.existsSync(STATE_FILE)) return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
  } catch (e) { log('WARN', `State corrupted, creating fresh: ${e.message}`); }
  return createFreshState();
}

function createFreshState() {
  return {
    version: '1.0.0',
    settings: {
      stakeholderApprovalActive: false,  // Inactive by default per user requirement
      superAdminEmail: 'ranadhir.ghosh@gmail.com',
      autoCreateTicket: true,
      ticketPrefix: 'TK',
      changePrefix: 'CR',
      sprintPrefix: 'S',
    },
    changeRequests: [],
    devTickets: [],
    sprints: [],
    activityLog: [],
    counters: {
      changeRequests: 0,
      devTickets: 0,
      sprints: 0,
    },
    createdAt: new Date().toISOString(),
    lastUpdated: new Date().toISOString(),
  };
}

function saveState(state) {
  state.lastUpdated = new Date().toISOString();
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

function addLog(state, action, message, actor = 'ChangeAgent') {
  state.activityLog.unshift({
    ts: new Date().toISOString(),
    action,
    message,
    actor,
  });
  // Keep last 500 entries
  if (state.activityLog.length > 500) state.activityLog = state.activityLog.slice(0, 500);
}

// ΓöÇΓöÇ Technical Review Engine ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

/**
 * Analyze a change request for technical feasibility, risk, and affected modules.
 */
function performTechnicalReview(changeRequest) {
  const description = `${changeRequest.title} ${changeRequest.description}`.toLowerCase();

  // Identify affected modules
  const affectedModules = [];
  for (const [moduleName, info] of Object.entries(MODULE_REGISTRY)) {
    const keywords = moduleName.replace(/[-_.]/g, ' ').toLowerCase().split(' ');
    if (keywords.some(kw => kw.length > 2 && description.includes(kw))) {
      affectedModules.push({ name: moduleName, ...info });
    }
  }

  // Additional keyword-based module detection
  const keywordModuleMap = {
    'email':     ['bosonto-email-reader-agent.js', 'user-query-agent.js'],
    'payment':   ['banf-payment-purpose-engine.js', 'http-functions.js'],
    'member':    ['collections/*.json', 'http-functions.js'],
    'portal':    ['admin-portal.html', 'member-portal.html'],
    'queue':     ['banf-message-queue.js'],
    'drive':     ['banf-event-manager.js', 'banf-drives.yaml'],
    'rl':        ['banf-rl-feedback-engine.js'],
    'memory':    ['agent-memory-rag.js'],
    'compliance':['communication-compliance.js'],
    'security':  ['http-functions.js', 'communication-compliance.js'],
    'collection':['collections/*.json', 'http-functions.js'],
    'api':       ['http-functions.js'],
    'attendance':['collections/*.json'],
    'event':     ['banf-event-manager.js', 'banf-drives.yaml'],
  };

  for (const [keyword, modules] of Object.entries(keywordModuleMap)) {
    if (description.includes(keyword)) {
      for (const mod of modules) {
        if (!affectedModules.find(m => m.name === mod) && MODULE_REGISTRY[mod]) {
          affectedModules.push({ name: mod, ...MODULE_REGISTRY[mod] });
        }
      }
    }
  }

  // Calculate overall risk
  const riskScores = { high: 3, medium: 2, low: 1 };
  const maxRisk = affectedModules.reduce((max, m) => Math.max(max, riskScores[m.risk] || 1), 1);
  const overallRisk = maxRisk >= 3 ? 'high' : maxRisk >= 2 ? 'medium' : 'low';

  // Estimate effort (rough heuristic)
  const complexity = affectedModules.length;
  const effortEstimate =
    complexity <= 1 ? '0.5-1 day' :
    complexity <= 3 ? '1-3 days' :
    complexity <= 5 ? '3-5 days' : '1-2 weeks';

  // Determine if stakeholder approval needed (high risk or affects data model)
  const needsStakeholder = overallRisk === 'high' ||
    affectedModules.some(m => m.type === 'data-model' || m.type === 'finance' || m.type === 'compliance');

  // Technical verdict
  const verdict = {
    feasible: true,
    risk: overallRisk,
    affectedModules: affectedModules.map(m => ({ name: m.name, type: m.type, risk: m.risk, owner: m.owner })),
    modulesAffected: affectedModules.length,
    effortEstimate,
    needsStakeholder,
    dependencies: [...new Set(affectedModules.flatMap(m => m.dependencies))],
    recommendations: [],
    reviewedAt: new Date().toISOString(),
  };

  // Add recommendations based on type
  if (changeRequest.type === 'security') {
    verdict.recommendations.push('Requires security review before deployment');
    verdict.recommendations.push('Update security audit trail collection');
  }
  if (affectedModules.some(m => m.type === 'data-model')) {
    verdict.recommendations.push('Schema migration needed ΓÇö coordinate with Wix CMS');
    verdict.recommendations.push('Backup existing collection data before changes');
  }
  if (affectedModules.some(m => m.type === 'agent')) {
    verdict.recommendations.push('Run agent integration tests after changes');
    verdict.recommendations.push('Verify email reader scheduler compatibility');
  }
  if (overallRisk === 'high') {
    verdict.recommendations.push('Deploy during low-traffic window');
    verdict.recommendations.push('Prepare rollback plan');
  }

  return verdict;
}

// ΓöÇΓöÇ Change Request Operations ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

/**
 * Submit a new change request.
 * @param {object} params - { title, description, requestedBy, type, priority }
 * @returns {{ changeId, status }}
 */
function submitChange({ title, description, requestedBy, type = 'feature', priority = 'medium' }) {
  if (!title || !description) throw new Error('title and description are required');
  if (!CHANGE_TYPES.includes(type)) throw new Error(`Invalid type. Must be one of: ${CHANGE_TYPES.join(', ')}`);
  if (!PRIORITY_LEVELS.includes(priority)) throw new Error(`Invalid priority. Must be one of: ${PRIORITY_LEVELS.join(', ')}`);

  const state = loadState();
  state.counters.changeRequests++;
  const changeId = `${state.settings.changePrefix}-${String(state.counters.changeRequests).padStart(3, '0')}`;

  const cr = {
    id: changeId,
    title,
    description,
    requestedBy: requestedBy || 'System',
    type,
    priority,
    status: 'intake',
    technicalReview: null,
    stakeholderApproval: null,
    architectureUpdateStatus: null,
    devTicketId: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    history: [{ status: 'intake', at: new Date().toISOString(), by: requestedBy || 'System' }],
  };

  state.changeRequests.push(cr);
  addLog(state, 'CHANGE_SUBMIT', `${changeId}: "${title}" submitted by ${requestedBy || 'System'} [${type}/${priority}]`, requestedBy || 'System');
  saveState(state);

  log('INFO', `Change request submitted: ${changeId} ΓÇö "${title}"`);
  return { changeId, status: 'intake' };
}

/**
 * Perform technical review of a change request.
 * @param {string} changeId
 * @returns {object} Technical review result
 */
function reviewChange(changeId) {
  const state = loadState();
  const cr = state.changeRequests.find(c => c.id === changeId);
  if (!cr) throw new Error(`Change request ${changeId} not found`);
  if (cr.status !== 'intake') throw new Error(`${changeId} is in "${cr.status}" ΓÇö expected "intake"`);

  // Perform technical analysis
  const review = performTechnicalReview(cr);
  cr.technicalReview = review;
  cr.updatedAt = new Date().toISOString();

  // Determine next state
  if (state.settings.stakeholderApprovalActive && review.needsStakeholder) {
    cr.status = 'stakeholder_pending';
    cr.history.push({ status: 'stakeholder_pending', at: new Date().toISOString(), by: 'ChangeAgent', reason: 'High risk or sensitive area ΓÇö stakeholder approval required' });
    addLog(state, 'TECH_REVIEW', `${changeId}: Technical review complete ΓÇö RISK:${review.risk} ΓÇö ${review.modulesAffected} modules affected ΓÇö routed to stakeholder approval`, 'ChangeAgent');
  } else {
    cr.status = 'architecture_update';
    cr.history.push({ status: 'architecture_update', at: new Date().toISOString(), by: 'ChangeAgent', reason: review.needsStakeholder ? 'Stakeholder pipeline inactive ΓÇö auto-progressed' : 'Low/medium risk ΓÇö no stakeholder approval needed' });
    addLog(state, 'TECH_REVIEW', `${changeId}: Technical review complete ΓÇö RISK:${review.risk} ΓÇö ${review.modulesAffected} modules ΓÇö sent to architecture update`, 'ChangeAgent');
  }

  saveState(state);
  log('INFO', `Technical review for ${changeId}: risk=${review.risk}, modules=${review.modulesAffected}, effort=${review.effortEstimate}`);
  return review;
}

/**
 * Stakeholder approves a change request.
 */
function approveChange(changeId, approver) {
  const state = loadState();
  const cr = state.changeRequests.find(c => c.id === changeId);
  if (!cr) throw new Error(`Change request ${changeId} not found`);
  if (cr.status !== 'stakeholder_pending') throw new Error(`${changeId} is in "${cr.status}" ΓÇö not pending stakeholder approval`);

  cr.stakeholderApproval = { approved: true, approver, at: new Date().toISOString() };
  cr.status = 'architecture_update';
  cr.updatedAt = new Date().toISOString();
  cr.history.push({ status: 'architecture_update', at: new Date().toISOString(), by: approver, reason: 'Stakeholder approved' });

  addLog(state, 'STAKEHOLDER_APPROVE', `${changeId}: Approved by ${approver}`, approver);
  saveState(state);
  log('INFO', `${changeId} approved by stakeholder: ${approver}`);
  return { changeId, status: 'architecture_update' };
}

/**
 * Stakeholder rejects a change request.
 */
function rejectChange(changeId, approver, reason) {
  const state = loadState();
  const cr = state.changeRequests.find(c => c.id === changeId);
  if (!cr) throw new Error(`Change request ${changeId} not found`);

  cr.stakeholderApproval = { approved: false, approver, reason, at: new Date().toISOString() };
  cr.status = 'rejected';
  cr.updatedAt = new Date().toISOString();
  cr.history.push({ status: 'rejected', at: new Date().toISOString(), by: approver, reason });

  addLog(state, 'STAKEHOLDER_REJECT', `${changeId}: Rejected by ${approver} ΓÇö ${reason}`, approver);
  saveState(state);
  log('INFO', `${changeId} rejected by ${approver}: ${reason}`);
  return { changeId, status: 'rejected' };
}

/**
 * Mark architecture update complete and create dev ticket.
 */
function completeArchitectureUpdate(changeId) {
  const state = loadState();
  const cr = state.changeRequests.find(c => c.id === changeId);
  if (!cr) throw new Error(`Change request ${changeId} not found`);
  if (cr.status !== 'architecture_update') throw new Error(`${changeId} is in "${cr.status}" ΓÇö expected "architecture_update"`);

  cr.architectureUpdateStatus = 'complete';
  cr.updatedAt = new Date().toISOString();

  // Auto-create dev ticket if enabled
  if (state.settings.autoCreateTicket) {
    const ticket = createDevTicket(state, cr);
    cr.devTicketId = ticket.id;
    cr.status = 'ticket_created';
    cr.history.push({ status: 'ticket_created', at: new Date().toISOString(), by: 'ChangeAgent', reason: `Auto-created ticket ${ticket.id}` });
    addLog(state, 'TICKET_CREATE', `${cr.id} ΓåÆ ${ticket.id}: "${cr.title}" assigned to ${ticket.assignee} [${ticket.sprint}]`, 'ChangeAgent');
  } else {
    cr.status = 'architecture_update';
    cr.history.push({ status: 'architecture_update', at: new Date().toISOString(), by: 'DesignAgent', reason: 'Architecture document updated' });
  }

  saveState(state);
  log('INFO', `Architecture update complete for ${changeId} ΓÇö ticket: ${cr.devTicketId || 'pending manual creation'}`);
  return { changeId, ticketId: cr.devTicketId };
}

// ΓöÇΓöÇ Dev Ticket Management ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

function createDevTicket(state, changeRequest) {
  state.counters.devTickets++;
  const ticketId = `${state.settings.ticketPrefix}-${String(state.counters.devTickets).padStart(3, '0')}`;

  // Determine assignee from affected modules
  const review = changeRequest.technicalReview;
  const primaryModule = review && review.affectedModules[0];
  const assignee = primaryModule ? primaryModule.owner : 'Platform Lead';

  // Determine sprint
  const currentSprint = getCurrentSprint(state);

  const ticket = {
    id: ticketId,
    changeRequestId: changeRequest.id,
    title: changeRequest.title,
    description: changeRequest.description,
    type: changeRequest.type,
    priority: changeRequest.priority,
    assignee,
    sprint: currentSprint,
    status: 'todo',
    risk: review ? review.risk : 'medium',
    effortEstimate: review ? review.effortEstimate : 'unknown',
    affectedModules: review ? review.affectedModules.map(m => m.name) : [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    completedAt: null,
  };

  state.devTickets.push(ticket);
  return ticket;
}

function getCurrentSprint(state) {
  // Find active sprint or create first one
  let active = state.sprints.find(s => s.status === 'active');
  if (!active) {
    state.counters.sprints++;
    active = {
      id: `${state.settings.sprintPrefix}${state.counters.sprints}`,
      name: `Sprint ${state.counters.sprints}`,
      status: 'active',
      startDate: new Date().toISOString(),
      endDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(), // 2 weeks
      goals: [],
      createdAt: new Date().toISOString(),
    };
    state.sprints.push(active);
    addLog(state, 'SPRINT_CREATE', `Sprint ${active.id} started (${active.startDate.split('T')[0]} ΓåÆ ${active.endDate.split('T')[0]})`, 'ChangeAgent');
  }
  return active.id;
}

/**
 * Update ticket status.
 */
function updateTicketStatus(ticketId, newStatus, updatedBy = 'System') {
  const validStatuses = ['todo', 'in_progress', 'testing', 'deployed', 'done', 'blocked'];
  if (!validStatuses.includes(newStatus)) throw new Error(`Invalid status: ${newStatus}`);

  const state = loadState();
  const ticket = state.devTickets.find(t => t.id === ticketId);
  if (!ticket) throw new Error(`Ticket ${ticketId} not found`);

  const oldStatus = ticket.status;
  ticket.status = newStatus;
  ticket.updatedAt = new Date().toISOString();
  if (newStatus === 'done') ticket.completedAt = new Date().toISOString();

  // Also update the linked change request
  if (ticket.changeRequestId) {
    const cr = state.changeRequests.find(c => c.id === ticket.changeRequestId);
    if (cr) {
      const crStatusMap = { in_progress: 'in_progress', testing: 'testing', deployed: 'deployed', done: 'closed' };
      if (crStatusMap[newStatus]) {
        cr.status = crStatusMap[newStatus];
        cr.updatedAt = new Date().toISOString();
        cr.history.push({ status: cr.status, at: new Date().toISOString(), by: updatedBy });
      }
    }
  }

  addLog(state, 'TICKET_UPDATE', `${ticketId}: ${oldStatus} ΓåÆ ${newStatus} (by ${updatedBy})`, updatedBy);
  saveState(state);
  log('INFO', `${ticketId}: ${oldStatus} ΓåÆ ${newStatus}`);
  return ticket;
}

// ΓöÇΓöÇ Settings ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

function toggleStakeholderApproval() {
  const state = loadState();
  state.settings.stakeholderApprovalActive = !state.settings.stakeholderApprovalActive;
  const status = state.settings.stakeholderApprovalActive ? 'ACTIVATED' : 'DEACTIVATED';
  addLog(state, 'SETTINGS', `Stakeholder approval pipeline ${status}`, 'SuperAdmin');
  saveState(state);
  log('INFO', `Stakeholder approval pipeline: ${status}`);
  return state.settings.stakeholderApprovalActive;
}

function getSettings() {
  return loadState().settings;
}

// ΓöÇΓöÇ Quick Submit + Auto-Review (full pipeline in one call) ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

/**
 * Submit a change, perform technical review, and optionally route through
 * the full pipeline ΓÇö ideal for agent-initiated changes.
 */
function submitAndReview({ title, description, requestedBy, type = 'feature', priority = 'medium' }) {
  const { changeId } = submitChange({ title, description, requestedBy, type, priority });
  const review = reviewChange(changeId);
  return { changeId, review };
}

// ΓöÇΓöÇ Board View ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

function getBoard() {
  const state = loadState();
  return {
    settings: state.settings,
    changeRequests: state.changeRequests,
    devTickets: state.devTickets,
    sprints: state.sprints,
    summary: {
      totalChanges: state.changeRequests.length,
      pending: state.changeRequests.filter(c => ['intake', 'technical_review', 'stakeholder_pending', 'architecture_update'].includes(c.status)).length,
      inProgress: state.changeRequests.filter(c => c.status === 'in_progress').length,
      deployed: state.changeRequests.filter(c => c.status === 'deployed' || c.status === 'closed').length,
      rejected: state.changeRequests.filter(c => c.status === 'rejected').length,
      totalTickets: state.devTickets.length,
      ticketsByStatus: {
        todo: state.devTickets.filter(t => t.status === 'todo').length,
        in_progress: state.devTickets.filter(t => t.status === 'in_progress').length,
        testing: state.devTickets.filter(t => t.status === 'testing').length,
        done: state.devTickets.filter(t => t.status === 'done').length,
        blocked: state.devTickets.filter(t => t.status === 'blocked').length,
      },
    },
    activityLog: state.activityLog.slice(0, 20),
  };
}

function getDevTickets() {
  return loadState().devTickets;
}

function getChangeRequests() {
  return loadState().changeRequests;
}

function getActivityLog(limit = 50) {
  return loadState().activityLog.slice(0, limit);
}

// ΓöÇΓöÇ Exports ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
module.exports = {
  submitChange,
  reviewChange,
  approveChange,
  rejectChange,
  completeArchitectureUpdate,
  submitAndReview,
  updateTicketStatus,
  createDevTicket: (cr) => { const state = loadState(); const t = createDevTicket(state, cr); saveState(state); return t; },
  toggleStakeholderApproval,
  getSettings,
  getBoard,
  getDevTickets,
  getChangeRequests,
  getActivityLog,
  STATUS_FLOW,
  CHANGE_TYPES,
  PRIORITY_LEVELS,
};

// ΓöÇΓöÇ CLI ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
if (require.main === module) {
  const args = process.argv.slice(2);

  if (args.includes('--status')) {
    const board = getBoard();
    console.log('\n≡ƒôï BANF Development Board Status');
    console.log('ΓòÉ'.repeat(60));
    console.log(`  Stakeholder Approval: ${board.settings.stakeholderApprovalActive ? '≡ƒƒó ACTIVE' : '≡ƒö┤ INACTIVE'}`);
    console.log(`  Auto-create tickets:  ${board.settings.autoCreateTicket ? 'Yes' : 'No'}`);
    console.log('');
    console.log('  Change Requests:');
    console.log(`    Total:       ${board.summary.totalChanges}`);
    console.log(`    Pending:     ${board.summary.pending}`);
    console.log(`    In Progress: ${board.summary.inProgress}`);
    console.log(`    Deployed:    ${board.summary.deployed}`);
    console.log(`    Rejected:    ${board.summary.rejected}`);
    console.log('');
    console.log('  Dev Tickets:');
    console.log(`    Total:       ${board.summary.totalTickets}`);
    console.log(`    Todo:        ${board.summary.ticketsByStatus.todo}`);
    console.log(`    In Progress: ${board.summary.ticketsByStatus.in_progress}`);
    console.log(`    Testing:     ${board.summary.ticketsByStatus.testing}`);
    console.log(`    Done:        ${board.summary.ticketsByStatus.done}`);
    console.log(`    Blocked:     ${board.summary.ticketsByStatus.blocked}`);
    console.log('');
    if (board.sprints.length > 0) {
      const active = board.sprints.find(s => s.status === 'active');
      if (active) console.log(`  Active Sprint: ${active.id} (${active.startDate.split('T')[0]} ΓåÆ ${active.endDate.split('T')[0]})`);
    }
    console.log('');
    console.log('  Recent Activity:');
    for (const entry of board.activityLog.slice(0, 10)) {
      const ts = new Date(entry.ts).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
      console.log(`    [${ts}] ${entry.action}: ${entry.message}`);
    }
    console.log('ΓòÉ'.repeat(60));
  }

  else if (args.includes('--board')) {
    const board = getBoard();
    console.log('\n≡ƒôï Dev Board ΓÇö Tickets');
    console.log('ΓöÇ'.repeat(100));
    console.log('  ID       | Type       | Priority | Status      | Assignee          | Sprint | Title');
    console.log('  ' + 'ΓöÇ'.repeat(96));
    for (const t of board.devTickets) {
      const id = t.id.padEnd(8);
      const type = t.type.padEnd(10);
      const prio = t.priority.padEnd(8);
      const status = t.status.padEnd(11);
      const assignee = (t.assignee || '').padEnd(17);
      const sprint = (t.sprint || '').padEnd(6);
      console.log(`  ${id} | ${type} | ${prio} | ${status} | ${assignee} | ${sprint} | ${t.title}`);
    }
    console.log('');
    console.log(`  Total: ${board.devTickets.length} tickets`);
    console.log('ΓöÇ'.repeat(100));
  }

  else if (args.includes('--changes')) {
    const changes = getChangeRequests();
    console.log('\n≡ƒô¥ Change Requests');
    console.log('ΓöÇ'.repeat(100));
    for (const cr of changes) {
      const risk = cr.technicalReview ? cr.technicalReview.risk : 'ΓÇö';
      const modules = cr.technicalReview ? cr.technicalReview.modulesAffected : 0;
      const ticket = cr.devTicketId || 'ΓÇö';
      console.log(`  ${cr.id} [${cr.status}] ${cr.title}`);
      console.log(`    Type: ${cr.type} | Priority: ${cr.priority} | Risk: ${risk} | Modules: ${modules} | Ticket: ${ticket}`);
      console.log(`    By: ${cr.requestedBy} | ${cr.createdAt.split('T')[0]}`);
      console.log('');
    }
  }

  else if (args.includes('--toggle-stakeholder')) {
    const active = toggleStakeholderApproval();
    console.log(`\n≡ƒöº Stakeholder Approval Pipeline: ${active ? '≡ƒƒó ACTIVATED' : '≡ƒö┤ DEACTIVATED'}`);
  }

  else if (args.includes('--submit')) {
    const titleIdx = args.indexOf('--submit');
    const title = args[titleIdx + 1];
    const descIdx = args.indexOf('--desc');
    const description = descIdx >= 0 ? args[descIdx + 1] : title;
    const byIdx = args.indexOf('--by');
    const requestedBy = byIdx >= 0 ? args[byIdx + 1] : 'CLI User';
    const typeIdx = args.indexOf('--type');
    const type = typeIdx >= 0 ? args[typeIdx + 1] : 'feature';
    const prioIdx = args.indexOf('--priority');
    const priority = prioIdx >= 0 ? args[prioIdx + 1] : 'medium';

    if (!title) { console.log('Usage: --submit "Title" --desc "Description" --by "Name" --type feature'); process.exit(1); }

    const { changeId, review } = submitAndReview({ title, description, requestedBy, type, priority });
    console.log(`\nΓ£à Change Request: ${changeId}`);
    console.log(`   Status: ${review ? 'Technical review complete' : 'Submitted'}`);
    if (review) {
      console.log(`   Risk: ${review.risk} | Modules: ${review.modulesAffected} | Effort: ${review.effortEstimate}`);
      console.log(`   Needs Stakeholder: ${review.needsStakeholder}`);
      if (review.recommendations.length > 0) {
        console.log('   Recommendations:');
        review.recommendations.forEach(r => console.log(`     ΓÇó ${r}`));
      }
    }
  }

  else if (args.includes('--init-real-board')) {
    // Initialize the board with REAL current work items ΓÇö no mock data
    const state = createFreshState();
    const now = new Date().toISOString();

    // Sprint 1: Current sprint (started March 2026)
    state.counters.sprints = 1;
    state.sprints.push({
      id: 'S1',
      name: 'Sprint 1 ΓÇö Platform Hardening & Agent Infrastructure',
      status: 'active',
      startDate: '2026-03-09T00:00:00.000Z',
      endDate: '2026-03-23T00:00:00.000Z',
      goals: [
        'Message queue implementation',
        'RL feedback engine deployment',
        'Event Manager Agent activation',
        'Development board rebuild (this sprint)',
      ],
      createdAt: now,
    });

    // Real change requests from this development session
    const realChanges = [
      {
        title: 'Implement message queue for email processing pipeline',
        description: 'Replace manual JSON state tracking with proper file-backed message queue (better-queue pattern). Adds dedup, DLQ, retry with backoff, FIFO ordering. Phase 1 uses local files, Phase 2 migrates to BullMQ + Upstash Redis.',
        requestedBy: 'Ranadhir Ghosh',
        type: 'infrastructure',
        priority: 'high',
      },
      {
        title: 'RL feedback learning engine for email classifier',
        description: 'Contextual Multi-Armed Bandit with UCB1 exploration. Learns from rejected auto-responses to improve DO_NOTHING/NOTIFY_PRESIDENT/ACK_ONLY/FULL_RESPONSE action selection. 55 examples trained, 4 policy rules created.',
        requestedBy: 'Ranadhir Ghosh',
        type: 'feature',
        priority: 'high',
      },
      {
        title: 'YAML-driven event/drive lifecycle management',
        description: 'Central YAML configuration for all 11 pipeline drives (ALWAYS_ON, EVENT_BOUND, TRIGGERED). Event Manager Agent controls activation/deactivation based on events calendar. 11 events configured from Bosonto 2026 to Saraswati Puja 2027.',
        requestedBy: 'Ranadhir Ghosh',
        type: 'feature',
        priority: 'high',
      },
      {
        title: 'Change Agent + Design-Architecture Agent system',
        description: 'Formal change request pipeline with technical review, stakeholder approval (toggleable), architecture doc updates, and auto-ticket creation. Replaces mock dev board data with real persistent state.',
        requestedBy: 'Ranadhir Ghosh',
        type: 'infrastructure',
        priority: 'high',
      },
      {
        title: 'Delivery failure recovery agent (bounced emails)',
        description: 'Detects bounced/failed email deliveries, attempts spouse email recovery from CRM, escalates unrecoverable to admin. Integrated as Phase 2d of email reader pipeline.',
        requestedBy: 'Ranadhir Ghosh',
        type: 'feature',
        priority: 'medium',
      },
      {
        title: 'Knowledge base update ΓÇö 12 session-2 learnings',
        description: 'Stored 12 new memories in agent-memory-store covering: Bosonto post-event status, payment ack v2.0, delivery failure agent, E2E test results, Rajanya Ghosh identity, compliance module, payment purpose engine, memory RAG patterns, email reader architecture, drive system architecture, classifier spam problem, RL feedback architecture.',
        requestedBy: 'Ranadhir Ghosh',
        type: 'documentation',
        priority: 'medium',
      },
    ];

    for (const rc of realChanges) {
      state.counters.changeRequests++;
      const changeId = `CR-${String(state.counters.changeRequests).padStart(3, '0')}`;
      const review = performTechnicalReview(rc);

      const cr = {
        id: changeId,
        ...rc,
        status: 'closed',  // These are all deployed
        technicalReview: review,
        stakeholderApproval: null,
        architectureUpdateStatus: 'complete',
        devTicketId: null,
        createdAt: now,
        updatedAt: now,
        history: [
          { status: 'intake', at: now, by: rc.requestedBy },
          { status: 'architecture_update', at: now, by: 'ChangeAgent' },
          { status: 'closed', at: now, by: 'ChangeAgent', reason: 'Implemented and deployed' },
        ],
      };

      // Create ticket
      state.counters.devTickets++;
      const ticketId = `TK-${String(state.counters.devTickets).padStart(3, '0')}`;
      const primaryModule = review.affectedModules[0];

      const ticket = {
        id: ticketId,
        changeRequestId: changeId,
        title: rc.title,
        description: rc.description,
        type: rc.type,
        priority: rc.priority,
        assignee: primaryModule ? primaryModule.owner : 'Platform Lead',
        sprint: 'S1',
        status: 'done',
        risk: review.risk,
        effortEstimate: review.effortEstimate,
        affectedModules: review.affectedModules.map(m => m.name),
        createdAt: now,
        updatedAt: now,
        completedAt: now,
      };

      cr.devTicketId = ticketId;
      state.changeRequests.push(cr);
      state.devTickets.push(ticket);

      addLog(state, 'CHANGE_CLOSED', `${changeId} ΓåÆ ${ticketId}: "${rc.title}" ΓÇö implemented and deployed`, 'ChangeAgent');
    }

    // Add initialization log
    addLog(state, 'BOARD_INIT', 'Development board initialized with real data ΓÇö 6 change requests, 6 dev tickets from current session', 'SuperAdmin');
    addLog(state, 'SPRINT_CREATE', 'Sprint S1 started: Platform Hardening & Agent Infrastructure (Mar 9 ΓåÆ Mar 23)', 'ChangeAgent');

    saveState(state);
    console.log('\nΓ£à Development Board Initialized (Real Data)');
    console.log(`   Change Requests: ${state.changeRequests.length}`);
    console.log(`   Dev Tickets:     ${state.devTickets.length}`);
    console.log(`   Sprints:         ${state.sprints.length}`);
    console.log(`   Activity Log:    ${state.activityLog.length} entries`);
    console.log('   Stakeholder Approval: INACTIVE (toggle with --toggle-stakeholder)');
  }

  else if (args.includes('--push')) {
    // Push board state to Wix CMS via /_functions/dev_board_state endpoint
    (async () => {
      const state = loadState();
      const url = 'https://banfwix.wixsite.com/banf1/_functions/dev_board_state';
      const payload = {
        adminKey: 'banf-bosonto-2026-live',
        state: {
          changeRequests: state.changeRequests,
          devTickets: state.devTickets,
          sprints: state.sprints,
          activityLog: state.activityLog,
          settings: state.settings,
        }
      };
      try {
        const resp = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const result = await resp.json();
        if (result.success) {
          console.log(`\nΓ£à Board state pushed to Wix CMS`);
          console.log(`   Updated: ${result.updatedAt}`);
          console.log(`   CRs: ${state.changeRequests.length} | Tickets: ${state.devTickets.length} | Log: ${state.activityLog.length}`);
        } else {
          console.log(`\nΓ¥î Push failed: ${JSON.stringify(result)}`);
        }
      } catch(e) {
        console.log(`\nΓ¥î Push failed: ${e.message}`);
        console.log('   Ensure the Wix site is deployed with the dev_board_state endpoint.');
      }
    })();
  }

  else {
    console.log('Usage:');
    console.log('  --status                    Show board status');
    console.log('  --board                     Show dev tickets table');
    console.log('  --changes                   Show change requests');
    console.log('  --submit "Title" [opts]     Submit new change request');
    console.log('  --toggle-stakeholder        Enable/disable stakeholder approval');
    console.log('  --init-real-board           Initialize board with real data (CLEARS MOCK)');
    console.log('  --push                      Push board state to Wix CMS (requires deploy)');
  }
}
