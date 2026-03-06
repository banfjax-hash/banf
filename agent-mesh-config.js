/**
 * BANF Agentic Platform — Agent Mesh Configuration
 * ==================================================
 * v1.0.0 — February 27, 2026
 *
 * Central configuration for the 7 lifecycle agents + orchestrator.
 * Import this from any backend module that needs agent metadata.
 *
 * Usage:
 *   import { AGENTS, getAgent, LIFECYCLE_ORDER } from 'backend/agent-mesh-config';
 */

// ─── LLM Defaults ───────────────────────────────────────────────────────────

const LLM_DEFAULTS = {
  provider: 'huggingface',
  model: 'Qwen/Qwen2.5-72B-Instruct',
  fallbackModel: 'meta-llama/Llama-3.3-70B-Instruct',
  maxTokens: 1024,
  temperature: 0.3,
  topP: 0.9,
  retries: 2,
  dailyTokenBudget: 50000
};

// ─── Agent Definitions ──────────────────────────────────────────────────────

const AGENTS = {

  // ── Requirements Agent ─────────────────────────────────────────────────
  'req-agent': {
    id: 'req-agent',
    name: 'Requirements Agent',
    stage: 'requirements',
    color: '#3b82f6',
    llm: { ...LLM_DEFAULTS, temperature: 0.3 },
    capabilities: [
      'intake_classify',
      'priority_score',
      'decompose_stories',
      'generate_acceptance_criteria',
      'detect_gaps',
      'trace_link'
    ],
    automations: [
      { trigger: 'feedback_submitted',  action: 'classify_and_prioritize' },
      { trigger: 'requirement_created', action: 'decompose_into_stories' },
      { trigger: 'story_approved',      action: 'link_to_design' }
    ],
    humanGate: {
      description: 'Product Owner approves priority ranking',
      requiredRole: 'product_owner'
    },
    systemPrompt: `You are the BANF Requirements Agent. Given a raw requirement or user 
feedback, classify it (feature / bug / improvement / compliance), assign a priority 
score (P0-P3) using MoSCoW, decompose into ≤ 5 user stories with acceptance criteria, 
and check for gaps against the existing backlog in WorkLedger. Output structured JSON 
with fields: classification, priority, stories[], gaps[].`
  },

  // ── Design Agent ───────────────────────────────────────────────────────
  'des-agent': {
    id: 'des-agent',
    name: 'Design Agent',
    stage: 'design',
    color: '#a855f7',
    llm: { ...LLM_DEFAULTS, temperature: 0.3 },
    capabilities: [
      'generate_api_contract',
      'schema_design',
      'adr_draft',
      'impact_analysis',
      'design_review_checklist'
    ],
    automations: [
      { trigger: 'story_linked',         action: 'generate_api_contract' },
      { trigger: 'api_contract_ready',   action: 'generate_schema_diff' },
      { trigger: 'design_ready',         action: 'notify_architect_review' }
    ],
    humanGate: {
      description: 'Architect reviews and approves API contracts + schema',
      requiredRole: 'architect'
    },
    systemPrompt: `You are the BANF Design Agent. Given user stories and acceptance criteria, 
produce: (1) API endpoint contracts (path, method, request/response schemas, error codes), 
(2) Wix collection schema diffs, (3) Architecture Decision Records (ADRs) where needed. 
Also flag any breaking changes or migration requirements. Output structured JSON with 
apiContracts[], schemaDiffs[], adrs[], breakingChanges[].`
  },

  // ── Development Agent ──────────────────────────────────────────────────
  'dev-agent': {
    id: 'dev-agent',
    name: 'Development Agent',
    stage: 'development',
    color: '#22c55e',
    llm: { ...LLM_DEFAULTS, temperature: 0.2 },
    capabilities: [
      'scaffold_code',
      'pr_review',
      'dependency_check',
      'refactor_suggest',
      'lint_check',
      'complexity_score'
    ],
    automations: [
      { trigger: 'design_approved',  action: 'scaffold_module' },
      { trigger: 'code_committed',   action: 'run_lint_and_review' },
      { trigger: 'pr_opened',        action: 'automated_code_review' }
    ],
    humanGate: {
      description: 'PR reviewer approves merge',
      requiredRole: 'senior_developer'
    },
    systemPrompt: `You are the BANF Development Agent. Given approved API contracts and schemas, 
scaffold Wix Velo backend code following project conventions (JSDoc, permission checks, 
try/catch, wixData usage). For code reviews, check for: missing error handling, RBAC 
bypass, hardcoded secrets, excessive complexity. Output structured JSON with 
scaffoldedFiles[], reviewFindings[], refactorSuggestions[].`
  },

  // ── Testing Agent ──────────────────────────────────────────────────────
  'tst-agent': {
    id: 'tst-agent',
    name: 'Testing Agent',
    stage: 'testing',
    color: '#eab308',
    llm: { ...LLM_DEFAULTS, temperature: 0.2 },
    capabilities: [
      'generate_test_plan',
      'execute_tests',
      'regression_detect',
      'coverage_map',
      'flaky_test_detect',
      'gate_readiness'
    ],
    automations: [
      { trigger: 'code_merged',       action: 'generate_test_plan' },
      { trigger: 'test_plan_ready',   action: 'execute_tests' },
      { trigger: 'tests_complete',    action: 'evaluate_gate_readiness' }
    ],
    humanGate: {
      description: 'QA lead signs off on test results',
      requiredRole: 'qa_lead'
    },
    systemPrompt: `You are the BANF Testing Agent. Given a story and its API contracts, 
generate a test plan covering: positive, negative, boundary, auth (RBAC), and 
regression scenarios. Execute HTTP endpoint tests, record results, compute coverage, 
and flag flaky tests. Output JSON: testPlan[], results[], coverageScore, 
regressions[], flakyTests[], gateReady: bool.`
  },

  // ── Deployment Agent ───────────────────────────────────────────────────
  'dpl-agent': {
    id: 'dpl-agent',
    name: 'Deployment Agent',
    stage: 'deployment',
    color: '#f97316',
    llm: null, // Config-driven, no LLM needed
    capabilities: [
      'pre_deploy_gate_check',
      'wix_publish',
      'health_verify',
      'rollback',
      'changelog_generate',
      'version_tag'
    ],
    automations: [
      { trigger: 'gate_ready',       action: 'pre_deploy_checks' },
      { trigger: 'checks_passed',    action: 'request_deploy_approval' },
      { trigger: 'deploy_approved',  action: 'publish_and_verify' },
      { trigger: 'health_failed',    action: 'auto_rollback' }
    ],
    humanGate: {
      description: 'DevOps engineer approves production deployment',
      requiredRole: 'devops'
    },
    systemPrompt: null, // Uses wix-agent.js execution engine
    executionEngine: 'wix-agent'
  },

  // ── Operations / SRE Agent ─────────────────────────────────────────────
  'ops-agent': {
    id: 'ops-agent',
    name: 'Operations Agent',
    stage: 'operations',
    color: '#dc2626',
    llm: null, // Config-driven
    capabilities: [
      'health_monitor',
      'incident_detect',
      'incident_respond',
      'slo_track',
      'feedback_loop',
      'runbook_execute'
    ],
    automations: [
      { trigger: 'cron_5min',          action: 'health_check_all_endpoints' },
      { trigger: 'health_degraded',    action: 'create_incident' },
      { trigger: 'incident_created',   action: 'execute_runbook' },
      { trigger: 'incident_resolved',  action: 'post_mortem_and_feedback' }
    ],
    humanGate: {
      description: 'SRE escalation for severity >= P1',
      requiredRole: 'sre'
    },
    systemPrompt: null,
    executionEngine: 'ops-monitor'
  },

  // ── MLOps Agent ────────────────────────────────────────────────────────
  'mlo-agent': {
    id: 'mlo-agent',
    name: 'MLOps Agent',
    stage: 'mlops',
    color: '#06b6d4',
    llm: { ...LLM_DEFAULTS, temperature: 0.3 },
    capabilities: [
      'model_eval',
      'prompt_version',
      'rag_drift_detect',
      'guardrail_enforce',
      'ab_test',
      'token_budget_track'
    ],
    automations: [
      { trigger: 'cron_daily',          action: 'evaluate_all_models' },
      { trigger: 'prompt_updated',      action: 'shadow_test_vs_baseline' },
      { trigger: 'drift_detected',      action: 'alert_ml_engineer' },
      { trigger: 'guardrail_triggered', action: 'log_and_escalate' }
    ],
    humanGate: {
      description: 'ML engineer reviews model/prompt changes before production',
      requiredRole: 'ml_engineer'
    },
    systemPrompt: `You are the BANF MLOps Agent. Monitor AI agent performance metrics: 
accuracy, relevance, latency, token usage. Detect RAG knowledge drift by comparing 
current answers against known-good baselines. Enforce guardrails (content safety, 
PII filtering, hallucination check). Manage prompt versions with shadow evaluation. 
Output JSON: evalResults[], driftScore, guardrailEvents[], promptComparison{}.`
  }
};

// ─── Orchestrator (Meta-Agent) ──────────────────────────────────────────────

const ORCHESTRATOR = {
  id: 'orchestrator',
  name: 'Platform Orchestrator',
  description: 'Meta-agent that monitors the full lifecycle pipeline',
  capabilities: [
    'route_events',
    'detect_stuck_items',
    'escalate_overdue',
    'arbitrate_conflicts',
    'generate_status_digest'
  ],
  rules: {
    stuckThresholdHours: 24,
    escalationChain: ['assignee', 'team_lead', 'product_owner', 'super_admin'],
    statusDigestCron: '0 9 * * 1-5', // Weekdays 9am
    maxRetries: 3
  }
};

// ─── Lifecycle Order ────────────────────────────────────────────────────────

const LIFECYCLE_ORDER = [
  'requirements',
  'design',
  'development',
  'testing',
  'deployment',
  'operations',
  'mlops'
];

// ─── Event Types ────────────────────────────────────────────────────────────

const EVENT_TYPES = {
  // Requirements
  FEEDBACK_SUBMITTED:    'feedback_submitted',
  REQUIREMENT_CREATED:   'requirement_created',
  STORY_APPROVED:        'story_approved',
  // Design
  STORY_LINKED:          'story_linked',
  API_CONTRACT_READY:    'api_contract_ready',
  DESIGN_APPROVED:       'design_approved',
  // Development
  CODE_COMMITTED:        'code_committed',
  PR_OPENED:             'pr_opened',
  CODE_MERGED:           'code_merged',
  // Testing
  TEST_PLAN_READY:       'test_plan_ready',
  TESTS_COMPLETE:        'tests_complete',
  GATE_READY:            'gate_ready',
  // Deployment
  CHECKS_PASSED:         'checks_passed',
  DEPLOY_APPROVED:       'deploy_approved',
  DEPLOY_SUCCESS:        'deploy_success',
  DEPLOY_FAILED:         'deploy_failed',
  HEALTH_FAILED:         'health_failed',
  // Operations
  HEALTH_DEGRADED:       'health_degraded',
  INCIDENT_CREATED:      'incident_created',
  INCIDENT_RESOLVED:     'incident_resolved',
  // MLOps
  PROMPT_UPDATED:        'prompt_updated',
  DRIFT_DETECTED:        'drift_detected',
  GUARDRAIL_TRIGGERED:   'guardrail_triggered'
};

// ─── Dashboard Role Mapping ─────────────────────────────────────────────────

const DASHBOARD_ROLES = {
  stakeholder: {
    viewName: 'Stakeholder View',
    visibleEvents: [
      'requirement_created', 'test_passed', 'deploy_success',
      'incident_created', 'incident_resolved'
    ],
    widgets: [
      'requirements_board', 'release_timeline', 'kpi_scoreboard',
      'feedback_inbox', 'risk_register', 'notifications'
    ]
  },
  developer: {
    viewName: 'Developer View',
    visibleEvents: [
      'requirement_created', 'design_approved', 'code_merged',
      'test_passed', 'deploy_success'
    ],
    widgets: [
      'sprint_board', 'pr_activity', 'quality_trends',
      'build_status', 'my_items', 'traceability'
    ]
  },
  tester: {
    viewName: 'Tester View',
    visibleEvents: [
      'design_approved', 'code_merged', 'tests_complete',
      'gate_ready', 'deploy_success'
    ],
    widgets: [
      'test_run_results', 'coverage_matrix', 'defect_board',
      'regression_trend', 'flaky_watch', 'release_gate'
    ]
  },
  devops: {
    viewName: 'DevOps View',
    visibleEvents: [
      'code_merged', 'gate_ready', 'deploy_success',
      'deploy_failed', 'health_degraded', 'incident_created',
      'guardrail_triggered'
    ],
    widgets: [
      'pipeline_status', 'endpoint_health', 'deploy_history',
      'incident_board', 'slo_tracker', 'rollback_control'
    ]
  },
  mlops: {
    viewName: 'MLOps View',
    visibleEvents: [
      'deploy_success', 'prompt_updated', 'drift_detected',
      'guardrail_triggered'
    ],
    widgets: [
      'model_performance', 'prompt_registry', 'rag_drift',
      'guardrail_log', 'token_budget', 'shadow_eval'
    ]
  }
};

// ─── Helper Functions ───────────────────────────────────────────────────────

/**
 * Get agent config by ID.
 * @param {string} agentId - e.g. 'req-agent'
 * @returns {object|null}
 */
function getAgent(agentId) {
  return AGENTS[agentId] || null;
}

/**
 * Get agent for a given lifecycle stage.
 * @param {string} stage - e.g. 'testing'
 * @returns {object|null}
 */
function getAgentByStage(stage) {
  return Object.values(AGENTS).find(a => a.stage === stage) || null;
}

/**
 * Get dashboard config for a role.
 * @param {string} role - e.g. 'developer'
 * @returns {object|null}
 */
function getDashboardConfig(role) {
  return DASHBOARD_ROLES[role] || null;
}

/**
 * Check if an event should be visible to a given role.
 * @param {string} eventType
 * @param {string} role
 * @returns {boolean}
 */
function isEventVisibleToRole(eventType, role) {
  const config = DASHBOARD_ROLES[role];
  return config ? config.visibleEvents.includes(eventType) : false;
}

/**
 * Get the next stage in the lifecycle.
 * @param {string} currentStage
 * @returns {string|null}
 */
function getNextStage(currentStage) {
  const idx = LIFECYCLE_ORDER.indexOf(currentStage);
  return idx >= 0 && idx < LIFECYCLE_ORDER.length - 1
    ? LIFECYCLE_ORDER[idx + 1]
    : null;
}

// ─── Exports ────────────────────────────────────────────────────────────────

export {
  LLM_DEFAULTS,
  AGENTS,
  ORCHESTRATOR,
  LIFECYCLE_ORDER,
  EVENT_TYPES,
  DASHBOARD_ROLES,
  getAgent,
  getAgentByStage,
  getDashboardConfig,
  isEventVisibleToRole,
  getNextStage
};
