#!/usr/bin/env node
/**
 * ΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉ
 *  BANF Reinforcement Learning Feedback Engine
 * ΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉ
 *
 *  Algorithm: Contextual Multi-Armed Bandit (CMAB) with UCB1 exploration
 *
 *  Actions (arms):
 *    DO_NOTHING       ΓÇö Silent drop. No response, no notification. For spam/marketing.
 *    NOTIFY_PRESIDENT ΓÇö No response to sender, but flag for EC admin attention.
 *    ACK_ONLY         ΓÇö Send brief acknowledgment, queue for human followup.
 *    FULL_RESPONSE    ΓÇö Compose and send detailed response (after approval).
 *
 *  Context Features (extracted from each email):
 *    senderType       ΓÇö crm_member | known_org | unknown | automated_system
 *    domainType       ΓÇö member_domain | community_org | marketing | platform_alert | unknown
 *    contentPattern   ΓÇö spam_marketing | system_alert | event_share | member_query | financial | security
 *    hasBANFReference ΓÇö boolean (does email mention BANF, jaxbengali, etc.)
 *    confidenceLevel  ΓÇö low (<0.5) | medium (0.5-0.8) | high (>0.8)
 *    bodyLength       ΓÇö short (<200) | medium (200-1000) | long (>1000)
 *
 *  Learning:
 *    - Rewards: +1 for action matching president feedback, -1 for mismatch
 *    - UCB1 bonus = c * sqrt(ln(N) / n_i) where c=2.0, N=total, n_i=arm pulls
 *    - Context arms tracked per (senderType, domainType, contentPattern) tuple
 *    - Decay: older observations weighted less (halfLife = 60 days)
 *
 *  Usage:
 *    const rl = require('./banf-rl-feedback-engine.js');
 *
 *    // Get action recommendation for an email
 *    const rec = rl.recommend(emailFeatures);
 *    // ΓåÆ { action: 'DO_NOTHING', confidence: 0.92, reasoning: '...' }
 *
 *    // Record feedback (approval/rejection from president)
 *    rl.recordFeedback(emailId, recommendedAction, feedback, correctAction);
 *
 *    // Bulk train from historical data
 *    rl.bulkTrain(trainingExamples);
 *
 *  CLI:
 *    node banf-rl-feedback-engine.js --stats           # Show learning stats
 *    node banf-rl-feedback-engine.js --recommend       # Test recommendation
 *    node banf-rl-feedback-engine.js --train           # Run bulk training from pending approvals
 *    node banf-rl-feedback-engine.js --export          # Export policy as JSON
 *
 * ΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉ
 */

const fs = require('fs');
const path = require('path');

// ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
// CONFIGURATION
// ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

const CONFIG = {
  STATE_FILE: path.join(__dirname, 'rl-feedback-state.json'),
  CRM_FILE: path.join(__dirname, 'banf-crm-reconciliation.json'),

  // UCB1 parameters
  EXPLORATION_CONSTANT: 2.0,       // c in UCB1 formula (higher = more exploration)
  MIN_PULLS_BEFORE_EXPLOIT: 3,     // minimum observations before trusting estimates
  REWARD_DECAY_HALFLIFE_DAYS: 60,  // older observations decay

  // Confidence thresholds
  HIGH_CONFIDENCE_THRESHOLD: 0.85, // above this, act autonomously
  MEDIUM_CONFIDENCE_THRESHOLD: 0.6,// above this, suggest but confirm

  // Actions
  ACTIONS: ['DO_NOTHING', 'NOTIFY_PRESIDENT', 'ACK_ONLY', 'FULL_RESPONSE'],

  // Known domains
  MARKETING_DOMAINS: [
    'e.harborfreight.com', 'signupgenius.com', 'massage-lab.com',
    'ml.spartan.com', 'mail1.fsastore.com', 'riseglobaleducation.com',
    'constantcontact.com', 'mailchimp.com', 'sendgrid.net',
    'hubspot.com', 'drip.com', 'activecampaign.com', 'klaviyo.com',
    'brevo.com', 'sendinblue.com', 'shared1.ccsend.com'
  ],
  PLATFORM_ALERT_DOMAINS: [
    'notifications.wix.com', 'team.wix.com', 'e.wix.com', 'go.wix.com',
    'huggingface.co', 'getgitguardian.com', 'googlemail.com',
    'notify.wellsfargo.com', 'alerts.bankofamerica.com'
  ],
  COMMUNITY_ORG_DOMAINS: [
    'shirdisaisociety.org', 'desiconnectusa.com', 'feedingnefl.org',
    'fscj.edu', 'icsjax.org'
  ],
  // Emails that are BANF-related (members, EC, bots)
  BANF_EMAILS: [
    'banfjax@gmail.com', 'botbanf@gmail.com',
    'ranadhir.ghosh@gmail.com', 'moumita.mukherje@gmail.com',
    'rajanya.ghosh@gmail.com', 'sumo475@gmail.com',
    'amit.everywhere@gmail.com', 'mukhopadhyay.partha@gmail.com',
    'duttasoumyajit86@gmail.com', 'rwitichoudhury@gmail.com'
  ]
};

// ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
// STATE MANAGEMENT
// ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

function loadState() {
  try {
    if (fs.existsSync(CONFIG.STATE_FILE)) {
      return JSON.parse(fs.readFileSync(CONFIG.STATE_FILE, 'utf8'));
    }
  } catch (e) {
    console.error(`[RL] Failed to load state: ${e.message}`);
  }
  return {
    // Per-context arm statistics: { contextKey: { action: { pulls, totalReward, rewards[] } } }
    contextArms: {},
    // Global arm statistics (fallback when context not seen before)
    globalArms: {
      DO_NOTHING: { pulls: 0, totalReward: 0, rewards: [] },
      NOTIFY_PRESIDENT: { pulls: 0, totalReward: 0, rewards: [] },
      ACK_ONLY: { pulls: 0, totalReward: 0, rewards: [] },
      FULL_RESPONSE: { pulls: 0, totalReward: 0, rewards: [] }
    },
    // Training history
    trainingLog: [],
    // Policy rules (deterministic overrides learned from repeated patterns)
    policyRules: [],
    // Statistics
    stats: {
      totalObservations: 0,
      totalCorrectPredictions: 0,
      totalIncorrectPredictions: 0,
      lastTrainedAt: null,
      policyVersion: 1
    },
    createdAt: new Date().toISOString()
  };
}

function saveState(state) {
  state.lastSaved = new Date().toISOString();
  fs.writeFileSync(CONFIG.STATE_FILE, JSON.stringify(state, null, 2));
}

function loadCRM() {
  try {
    const data = JSON.parse(fs.readFileSync(CONFIG.CRM_FILE, 'utf8'));
    return data.members || data;
  } catch {
    return [];
  }
}

// ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
// FEATURE EXTRACTION
// ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

/**
 * Extract context features from an email for CMAB decision-making.
 * @param {object} email - { from, subject, body }
 * @returns {object} Feature vector
 */
function extractFeatures(email) {
  const from = (email.from || '').toLowerCase();
  const subject = (email.subject || '').toLowerCase();
  const body = (email.body || '').toLowerCase();
  const combined = subject + ' ' + body;

  // Extract sender domain
  const domainMatch = from.match(/@([^\s>]+)/);
  const domain = domainMatch ? domainMatch[1] : '';

  // Sender type
  let senderType = 'unknown';
  const members = loadCRM();
  const memberEmails = new Set(members.map(m => (m.email || '').toLowerCase()));
  if (CONFIG.BANF_EMAILS.some(e => from.includes(e))) {
    senderType = 'banf_internal';
  } else if (memberEmails.has(from) || memberEmails.has(from.replace(/.*</, '').replace(/>.*/, ''))) {
    senderType = 'crm_member';
  } else if (CONFIG.COMMUNITY_ORG_DOMAINS.some(d => domain.includes(d))) {
    senderType = 'known_org';
  } else if (CONFIG.PLATFORM_ALERT_DOMAINS.some(d => domain.includes(d))) {
    senderType = 'automated_system';
  } else if (CONFIG.MARKETING_DOMAINS.some(d => domain.includes(d))) {
    senderType = 'marketing';
  }

  // Domain type
  let domainType = 'unknown';
  if (domain.endsWith('gmail.com') || domain.endsWith('aol.com') || domain.endsWith('yahoo.com') || domain.endsWith('hotmail.com') || domain.endsWith('outlook.com')) {
    domainType = 'member_domain';
  } else if (CONFIG.COMMUNITY_ORG_DOMAINS.some(d => domain.includes(d))) {
    domainType = 'community_org';
  } else if (CONFIG.MARKETING_DOMAINS.some(d => domain.includes(d))) {
    domainType = 'marketing';
  } else if (CONFIG.PLATFORM_ALERT_DOMAINS.some(d => domain.includes(d))) {
    domainType = 'platform_alert';
  }

  // Content pattern
  let contentPattern = 'unknown';
  const spamIndicators = ['unsubscribe', 'opt out', 'email preferences', 'free offer', 'limited time',
    'act now', 'coupon', 'promo code', 'discount', 'sale starts', 'clearance',
    'new product alert', 'parking lot sale', 'buy one get', 'early access'];
  const systemIndicators = ['security alert', 'token expired', 'delivery status', 'domain renewal',
    'account update', 'new login', 'verification code', 'monthly stats', 'earning revenue'];
  const eventIndicators = ['event', 'festival', 'celebration', 'puja', 'mela', 'program',
    'workshop', 'conference', 'register', 'volunteer'];
  const queryIndicators = ['question', 'request', 'please', 'help', 'update', 'change',
    'information', 'status', 'membership', 'payment'];
  const financialIndicators = ['deposit', 'payment', 'balance', 'zelle', 'refund', 'invoice',
    'amount', 'transaction'];
  const securityIndicators = ['exposed', 'leak', 'breach', 'oauth', 'credentials', 'vulnerability',
    'security alert'];

  const spamScore = spamIndicators.filter(kw => combined.includes(kw)).length;
  const systemScore = systemIndicators.filter(kw => combined.includes(kw)).length;
  const eventScore = eventIndicators.filter(kw => combined.includes(kw)).length;
  const queryScore = queryIndicators.filter(kw => combined.includes(kw)).length;
  const financialScore = financialIndicators.filter(kw => combined.includes(kw)).length;
  const securityScore = securityIndicators.filter(kw => combined.includes(kw)).length;

  const maxScore = Math.max(spamScore, systemScore, eventScore, queryScore, financialScore, securityScore);
  if (maxScore === 0) contentPattern = 'unknown';
  else if (spamScore === maxScore) contentPattern = 'spam_marketing';
  else if (securityScore === maxScore) contentPattern = 'security';
  else if (systemScore === maxScore) contentPattern = 'system_alert';
  else if (financialScore === maxScore) contentPattern = 'financial';
  else if (eventScore === maxScore && senderType !== 'crm_member') contentPattern = 'event_share';
  else if (queryScore === maxScore) contentPattern = 'member_query';
  else contentPattern = eventScore > 0 ? 'event_share' : 'unknown';

  // BANF reference
  const banfKeywords = ['banf', 'jaxbengali', 'bengali association', 'bosonto', 'durga puja',
    'nabo borsho', 'spandan', 'saraswati puja'];
  const hasBANFReference = banfKeywords.some(kw => combined.includes(kw));

  // Body length category
  const bodyLen = (body || '').length;
  const bodyLength = bodyLen < 200 ? 'short' : bodyLen < 1000 ? 'medium' : 'long';

  return {
    senderType,
    domainType,
    contentPattern,
    hasBANFReference,
    bodyLength,
    // Raw data for policy rule matching
    senderDomain: domain,
    senderEmail: from.replace(/.*</, '').replace(/>.*/, '').trim(),
    isCRMMember: senderType === 'crm_member' || senderType === 'banf_internal'
  };
}

/**
 * Generate a context key from features for the CMAB lookup.
 * Groups similar emails into the same context bucket.
 */
function contextKey(features) {
  return `${features.senderType}|${features.domainType}|${features.contentPattern}|${features.hasBANFReference ? 'banf' : 'nobanf'}`;
}

// ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
// UCB1 ALGORITHM
// ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

/**
 * Compute UCB1 score for an arm.
 * UCB1(a) = Q(a) + c * sqrt(ln(N) / n(a))
 * where Q(a) = average reward, N = total pulls across all arms, n(a) = pulls for this arm
 */
function ucb1Score(arm, totalPulls) {
  if (arm.pulls === 0) return Infinity; // Unpulled arms get infinite priority (explore)
  const avgReward = arm.totalReward / arm.pulls;
  const bonus = CONFIG.EXPLORATION_CONSTANT * Math.sqrt(Math.log(totalPulls) / arm.pulls);
  return avgReward + bonus;
}

/**
 * Select action using UCB1 for a given context.
 * Falls back to global arms if context not seen enough times.
 */
function selectAction(state, features) {
  const key = contextKey(features);
  const contextData = state.contextArms[key];

  // Determine which arm data to use
  let arms;
  let usingContext = false;
  if (contextData) {
    const totalContextPulls = CONFIG.ACTIONS.reduce((sum, a) => sum + (contextData[a]?.pulls || 0), 0);
    if (totalContextPulls >= CONFIG.MIN_PULLS_BEFORE_EXPLOIT) {
      arms = contextData;
      usingContext = true;
    }
  }
  if (!arms) {
    arms = state.globalArms;
  }

  // Compute total pulls
  const totalPulls = CONFIG.ACTIONS.reduce((sum, a) => sum + (arms[a]?.pulls || 0), 0);
  if (totalPulls === 0) {
    // No data at all ΓÇö use deterministic rules
    return applyDeterministicRules(features);
  }

  // Compute UCB1 for each action
  const scores = {};
  let bestAction = CONFIG.ACTIONS[0];
  let bestScore = -Infinity;

  for (const action of CONFIG.ACTIONS) {
    const arm = arms[action] || { pulls: 0, totalReward: 0 };
    scores[action] = ucb1Score(arm, totalPulls);
    if (scores[action] > bestScore) {
      bestScore = scores[action];
      bestAction = action;
    }
  }

  // Compute confidence based on how well-separated the best arm is
  const sortedScores = Object.values(scores).sort((a, b) => b - a);
  const margin = sortedScores.length > 1 ? sortedScores[0] - sortedScores[1] : 0;
  const confidence = Math.min(0.99, 0.5 + margin * 0.3);

  return { action: bestAction, confidence, scores, usingContext, contextKey: key };
}

/**
 * Deterministic rules for when we have NO training data.
 * These are the initial policy before any feedback.
 */
function applyDeterministicRules(features) {
  // Marketing + spam ΓåÆ always DO_NOTHING
  if (features.senderType === 'marketing' || features.contentPattern === 'spam_marketing') {
    return { action: 'DO_NOTHING', confidence: 0.95, reasoning: 'Marketing/spam ΓÇö silent drop' };
  }

  // Automated system alerts
  if (features.senderType === 'automated_system') {
    if (features.contentPattern === 'security') {
      return { action: 'NOTIFY_PRESIDENT', confidence: 0.90, reasoning: 'Security alert from automated system ΓÇö president attention needed' };
    }
    return { action: 'DO_NOTHING', confidence: 0.85, reasoning: 'Automated platform notification ΓÇö no action needed' };
  }

  // CRM member or BANF internal ΓåÆ full response pipeline
  if (features.isCRMMember) {
    if (features.contentPattern === 'member_query') {
      return { action: 'FULL_RESPONSE', confidence: 0.80, reasoning: 'CRM member with a query ΓÇö respond with full information' };
    }
    if (features.contentPattern === 'financial') {
      return { action: 'NOTIFY_PRESIDENT', confidence: 0.85, reasoning: 'Financial matter from member ΓÇö president attention' };
    }
    return { action: 'ACK_ONLY', confidence: 0.70, reasoning: 'CRM member email ΓÇö acknowledge receipt' };
  }

  // Known community organization
  if (features.senderType === 'known_org') {
    if (features.contentPattern === 'event_share') {
      return { action: 'NOTIFY_PRESIDENT', confidence: 0.80, reasoning: 'Community org event sharing ΓÇö president to decide on forwarding' };
    }
    return { action: 'NOTIFY_PRESIDENT', confidence: 0.70, reasoning: 'Known community org ΓÇö president attention' };
  }

  // Unknown sender
  if (features.hasBANFReference) {
    return { action: 'ACK_ONLY', confidence: 0.60, reasoning: 'Unknown sender referencing BANF ΓÇö acknowledge and queue for review' };
  }

  return { action: 'DO_NOTHING', confidence: 0.50, reasoning: 'Unknown sender, no BANF reference ΓÇö likely irrelevant' };
}

// ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
// RECOMMENDATION API
// ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

/**
 * Get an action recommendation for an email.
 * @param {object} email - { from, subject, body }
 * @returns {object} { action, confidence, reasoning, features, contextKey }
 */
function recommend(email) {
  const state = loadState();
  const features = extractFeatures(email);

  // Check deterministic policy rules first (learned hard rules)
  for (const rule of state.policyRules) {
    if (matchesRule(features, rule)) {
      return {
        action: rule.action,
        confidence: rule.confidence,
        reasoning: rule.reasoning,
        features,
        contextKey: contextKey(features),
        source: 'policy_rule',
        ruleId: rule.id
      };
    }
  }

  // Use CMAB selection
  const selection = selectAction(state, features);
  const reasoning = selection.reasoning || generateReasoning(features, selection);

  return {
    action: selection.action,
    confidence: selection.confidence,
    reasoning,
    features,
    contextKey: selection.contextKey || contextKey(features),
    source: selection.usingContext ? 'context_cmab' : 
            (CONFIG.ACTIONS.reduce((s, a) => s + (state.globalArms[a]?.pulls || 0), 0) > 0 ? 'global_cmab' : 'deterministic'),
    scores: selection.scores
  };
}

function matchesRule(features, rule) {
  for (const [key, value] of Object.entries(rule.conditions)) {
    if (features[key] !== value) return false;
  }
  return true;
}

function generateReasoning(features, selection) {
  const parts = [];
  parts.push(`Sender: ${features.senderType}`);
  parts.push(`Domain: ${features.domainType}`);
  parts.push(`Content: ${features.contentPattern}`);
  if (features.hasBANFReference) parts.push('References BANF');
  parts.push(`ΓåÆ ${selection.action} (conf: ${(selection.confidence * 100).toFixed(0)}%)`);
  return parts.join(' | ');
}

// ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
// FEEDBACK / LEARNING API
// ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

/**
 * Record feedback for an action recommendation.
 * @param {string} emailId - Unique email identifier
 * @param {object} email - The original email { from, subject, body }
 * @param {string} recommendedAction - What the agent recommended
 * @param {string} feedback - 'approved' | 'rejected'
 * @param {string} correctAction - The correct action (if rejected, what should have been done)
 * @param {string} reason - Why the feedback was given
 */
function recordFeedback(emailId, email, recommendedAction, feedback, correctAction, reason) {
  const state = loadState();
  const features = extractFeatures(email);
  const key = contextKey(features);

  // Initialize context arms if needed
  if (!state.contextArms[key]) {
    state.contextArms[key] = {};
    CONFIG.ACTIONS.forEach(a => {
      state.contextArms[key][a] = { pulls: 0, totalReward: 0, rewards: [] };
    });
  }

  const isCorrect = feedback === 'approved';
  const actionToReward = isCorrect ? recommendedAction : correctAction;
  const actionToPenalize = isCorrect ? null : recommendedAction;
  const now = new Date().toISOString();

  // Positive reward for the correct action
  if (actionToReward && state.contextArms[key][actionToReward]) {
    const arm = state.contextArms[key][actionToReward];
    arm.pulls++;
    arm.totalReward += 1.0;
    arm.rewards.push({ value: 1.0, timestamp: now, emailId });
  }
  if (actionToReward && state.globalArms[actionToReward]) {
    const gArm = state.globalArms[actionToReward];
    gArm.pulls++;
    gArm.totalReward += 1.0;
    gArm.rewards.push({ value: 1.0, timestamp: now, emailId });
  }

  // Negative reward for the incorrect action
  if (actionToPenalize && actionToPenalize !== actionToReward) {
    if (state.contextArms[key][actionToPenalize]) {
      const arm = state.contextArms[key][actionToPenalize];
      arm.pulls++;
      arm.totalReward -= 0.5; // Penalty is less severe than reward to avoid over-correction
      arm.rewards.push({ value: -0.5, timestamp: now, emailId });
    }
    if (state.globalArms[actionToPenalize]) {
      const gArm = state.globalArms[actionToPenalize];
      gArm.pulls++;
      gArm.totalReward -= 0.5;
      gArm.rewards.push({ value: -0.5, timestamp: now, emailId });
    }
  }

  // Log the training example
  state.trainingLog.push({
    emailId,
    email: { from: email.from, subject: email.subject },
    features,
    contextKey: key,
    recommendedAction,
    feedback,
    correctAction: correctAction || recommendedAction,
    reason: reason || '',
    timestamp: now
  });

  // Update stats
  state.stats.totalObservations++;
  if (isCorrect) state.stats.totalCorrectPredictions++;
  else state.stats.totalIncorrectPredictions++;
  state.stats.lastTrainedAt = now;

  // Check if we should create a deterministic policy rule
  maybeCreatePolicyRule(state, key);

  saveState(state);

  return {
    success: true,
    contextKey: key,
    observation: isCorrect ? 'correct' : 'corrected',
    newAction: correctAction || recommendedAction
  };
}

/**
 * If a context has enough consistent feedback, create a deterministic rule.
 * This "graduates" from CMAB exploration to exploitation.
 */
function maybeCreatePolicyRule(state, key) {
  const arms = state.contextArms[key];
  if (!arms) return;

  const totalPulls = CONFIG.ACTIONS.reduce((sum, a) => sum + (arms[a]?.pulls || 0), 0);
  if (totalPulls < 5) return; // Need at least 5 observations

  // Find dominant action
  let bestAction = null;
  let bestAvg = -Infinity;
  for (const action of CONFIG.ACTIONS) {
    const arm = arms[action] || { pulls: 0, totalReward: 0 };
    if (arm.pulls === 0) continue;
    const avg = arm.totalReward / arm.pulls;
    if (avg > bestAvg) {
      bestAvg = avg;
      bestAction = action;
    }
  }

  if (!bestAction || bestAvg < 0.7) return; // Need strong signal

  // Check if rule already exists
  const existing = state.policyRules.find(r => r.contextKey === key);
  if (existing) {
    existing.action = bestAction;
    existing.confidence = Math.min(0.99, 0.7 + bestAvg * 0.2);
    existing.updatedAt = new Date().toISOString();
    existing.totalObservations = totalPulls;
    return;
  }

  // Parse the context key back into conditions
  const parts = key.split('|');
  const conditions = {};
  if (parts[0]) conditions.senderType = parts[0];
  if (parts[1]) conditions.domainType = parts[1];
  if (parts[2]) conditions.contentPattern = parts[2];
  if (parts[3]) conditions.hasBANFReference = parts[3] === 'banf';

  state.policyRules.push({
    id: `RULE-${Date.now().toString(36)}`,
    contextKey: key,
    conditions,
    action: bestAction,
    confidence: Math.min(0.99, 0.7 + bestAvg * 0.2),
    reasoning: `Learned from ${totalPulls} observations: ${key} ΓåÆ ${bestAction}`,
    createdAt: new Date().toISOString(),
    totalObservations: totalPulls
  });
}

// ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
// BULK TRAINING
// ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

/**
 * Bulk train from an array of labeled examples.
 * @param {Array} examples - [{ email: {from, subject, body}, correctAction, reason }]
 * @returns {object} Training summary
 */
function bulkTrain(examples) {
  let trained = 0;
  let errors = 0;

  for (const ex of examples) {
    try {
      const rec = recommend(ex.email);
      const feedback = rec.action === ex.correctAction ? 'approved' : 'rejected';
      const emailId = `TRAIN-${Date.now().toString(36)}-${trained}`;

      recordFeedback(emailId, ex.email, rec.action, feedback, ex.correctAction, ex.reason);
      trained++;
    } catch (e) {
      errors++;
    }
  }

  // Store in agent memory
  try {
    const memory = require('./agent-memory-rag.js');
    memory.store({
      type: 'DECISION',
      content: `RL bulk training completed: ${trained} examples, ${errors} errors. Actions distribution: ${JSON.stringify(examples.reduce((acc, e) => { acc[e.correctAction] = (acc[e.correctAction]||0)+1; return acc; }, {}))}`,
      tags: ['reinforcement_learning', 'training', 'bulk'],
      context: { trained, errors, timestamp: new Date().toISOString() },
      source: 'rl_feedback_engine',
      impact: 'high'
    });
  } catch { /* memory module optional */ }

  return { trained, errors, total: examples.length };
}

// ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
// STATISTICS
// ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

function getStats() {
  const state = loadState();
  const contextCount = Object.keys(state.contextArms).length;
  const ruleCount = state.policyRules.length;
  const accuracy = state.stats.totalObservations > 0
    ? (state.stats.totalCorrectPredictions / state.stats.totalObservations * 100).toFixed(1) + '%'
    : 'N/A';

  // Per-action stats
  const actionStats = {};
  for (const action of CONFIG.ACTIONS) {
    const gArm = state.globalArms[action] || { pulls: 0, totalReward: 0 };
    actionStats[action] = {
      globalPulls: gArm.pulls,
      avgReward: gArm.pulls > 0 ? (gArm.totalReward / gArm.pulls).toFixed(3) : 'N/A'
    };
  }

  return {
    totalObservations: state.stats.totalObservations,
    accuracy,
    contextBuckets: contextCount,
    policyRules: ruleCount,
    policyVersion: state.stats.policyVersion,
    lastTrainedAt: state.stats.lastTrainedAt,
    actionStats,
    rules: state.policyRules
  };
}

/**
 * Export the current policy as a readable JSON.
 */
function exportPolicy() {
  const state = loadState();
  return {
    version: state.stats.policyVersion,
    exportedAt: new Date().toISOString(),
    rules: state.policyRules,
    contextArms: Object.entries(state.contextArms).map(([key, arms]) => ({
      context: key,
      bestAction: CONFIG.ACTIONS.reduce((best, a) => {
        const arm = arms[a] || { pulls: 0, totalReward: 0 };
        const bestArm = arms[best] || { pulls: 0, totalReward: 0 };
        return arm.pulls > 0 && (bestArm.pulls === 0 || arm.totalReward / arm.pulls > bestArm.totalReward / bestArm.pulls) ? a : best;
      }, CONFIG.ACTIONS[0]),
      observations: CONFIG.ACTIONS.reduce((sum, a) => sum + (arms[a]?.pulls || 0), 0)
    })),
    globalStats: Object.entries(state.globalArms).map(([action, arm]) => ({
      action,
      pulls: arm.pulls,
      avgReward: arm.pulls > 0 ? (arm.totalReward / arm.pulls).toFixed(3) : 'N/A'
    }))
  };
}

// ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
// MODULE EXPORTS
// ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

module.exports = {
  recommend,
  recordFeedback,
  bulkTrain,
  extractFeatures,
  contextKey,
  getStats,
  exportPolicy,
  loadState,
  CONFIG
};

// ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
// CLI
// ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

if (require.main === module) {
  const args = process.argv.slice(2);

  if (args.includes('--stats')) {
    const stats = getStats();
    console.log('\nΓòöΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòù');
    console.log('Γòæ  BANF RL Feedback Engine ΓÇö Statistics                 Γòæ');
    console.log('ΓòÜΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓò¥');
    console.log(`  Total observations: ${stats.totalObservations}`);
    console.log(`  Accuracy: ${stats.accuracy}`);
    console.log(`  Context buckets: ${stats.contextBuckets}`);
    console.log(`  Policy rules: ${stats.policyRules}`);
    console.log(`  Last trained: ${stats.lastTrainedAt || 'Never'}`);
    console.log('\n  Action Stats:');
    for (const [action, s] of Object.entries(stats.actionStats)) {
      console.log(`    ${action}: ${s.globalPulls} pulls, avg reward: ${s.avgReward}`);
    }
    if (stats.rules.length > 0) {
      console.log('\n  Learned Policy Rules:');
      stats.rules.forEach((r, i) => {
        console.log(`    ${i + 1}. ${r.contextKey} ΓåÆ ${r.action} (conf: ${(r.confidence * 100).toFixed(0)}%, obs: ${r.totalObservations})`);
      });
    }
  }

  else if (args.includes('--train')) {
    console.log('\nΓòöΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòù');
    console.log('Γòæ  BANF RL Feedback Engine ΓÇö Bulk Training              Γòæ');
    console.log('ΓòÜΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓò¥');

    // Load pending approvals from user-query-state.json and classify them
    const stateFile = path.join(__dirname, 'user-query-state.json');
    if (!fs.existsSync(stateFile)) {
      console.log('  No user-query-state.json found.');
      process.exit(1);
    }

    const uqState = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
    const pending = uqState.pendingApprovals || [];
    console.log(`  Found ${pending.length} pending approvals for training.`);

    // Auto-classify each pending approval for training
    const examples = pending.map(p => {
      const features = extractFeatures(p.email);
      let correctAction, reason;

      // Classify based on features
      if (features.senderType === 'marketing' || features.contentPattern === 'spam_marketing') {
        correctAction = 'DO_NOTHING';
        reason = 'Marketing/spam ΓÇö no response needed, silent drop';
      } else if (features.senderType === 'automated_system') {
        if (features.contentPattern === 'security') {
          correctAction = 'NOTIFY_PRESIDENT';
          reason = 'Security alert ΓÇö president needs to see this';
        } else {
          correctAction = 'DO_NOTHING';
          reason = 'Automated platform notification ΓÇö ignore';
        }
      } else if (features.senderType === 'known_org' && features.contentPattern === 'event_share') {
        correctAction = 'NOTIFY_PRESIDENT';
        reason = 'Community org event sharing ΓÇö president to decide';
      } else if (features.isCRMMember && features.contentPattern === 'member_query') {
        correctAction = 'FULL_RESPONSE';
        reason = 'CRM member with legitimate query ΓÇö respond';
      } else if (features.isCRMMember) {
        correctAction = 'ACK_ONLY';
        reason = 'CRM member ΓÇö acknowledge receipt';
      } else if (features.contentPattern === 'financial') {
        correctAction = 'NOTIFY_PRESIDENT';
        reason = 'Financial matter ΓÇö president attention';
      } else if (features.hasBANFReference) {
        correctAction = 'NOTIFY_PRESIDENT';
        reason = 'References BANF ΓÇö president should review';
      } else {
        correctAction = 'DO_NOTHING';
        reason = 'Unknown sender, no BANF relevance ΓÇö silent drop';
      }

      return { email: p.email, correctAction, reason, approvalId: p.id };
    });

    // Display classification summary
    const actionCounts = {};
    examples.forEach(e => { actionCounts[e.correctAction] = (actionCounts[e.correctAction] || 0) + 1; });
    console.log('\n  Training classification:');
    for (const [action, count] of Object.entries(actionCounts)) {
      console.log(`    ${action}: ${count}`);
    }

    // Execute bulk training
    console.log('\n  Training...');
    const result = bulkTrain(examples);
    console.log(`  Γ£à Trained: ${result.trained}, Errors: ${result.errors}`);

    // Also reject these in the user-query-state
    let rejected = 0;
    for (const ex of examples) {
      if (ex.correctAction === 'DO_NOTHING') {
        const idx = uqState.pendingApprovals.findIndex(p => p.id === ex.approvalId);
        if (idx !== -1) {
          const approval = uqState.pendingApprovals.splice(idx, 1)[0];
          approval.status = 'rejected';
          approval.rejectedAt = new Date().toISOString();
          approval.rejectionReason = ex.reason;
          approval.rlAction = ex.correctAction;
          uqState.rejectedResponses.push(approval);
          uqState.statistics.totalRejected++;
          rejected++;
        }
      }
    }
    if (rejected > 0) {
      fs.writeFileSync(stateFile, JSON.stringify(uqState, null, 2));
      console.log(`  ≡ƒôï Rejected ${rejected} spam/marketing items from pending queue.`);
      console.log(`  ≡ƒôï Remaining pending: ${uqState.pendingApprovals.length}`);
    }

    // Show final stats
    const stats = getStats();
    console.log(`\n  ≡ƒôè Post-training: ${stats.totalObservations} observations, ${stats.contextBuckets} contexts, ${stats.policyRules} rules`);
  }

  else if (args.includes('--export')) {
    const policy = exportPolicy();
    const exportFile = path.join(__dirname, 'rl-policy-export.json');
    fs.writeFileSync(exportFile, JSON.stringify(policy, null, 2));
    console.log(`Policy exported to ${exportFile}`);
  }

  else if (args.includes('--recommend')) {
    // Quick test recommendation
    const testEmail = {
      from: args[args.indexOf('--recommend') + 1] || 'unknown@test.com',
      subject: args[args.indexOf('--recommend') + 2] || 'Test subject',
      body: 'Test body'
    };
    const rec = recommend(testEmail);
    console.log('\nRecommendation:');
    console.log(JSON.stringify(rec, null, 2));
  }

  else {
    console.log('Usage: node banf-rl-feedback-engine.js [options]');
    console.log('  --stats       Show learning statistics');
    console.log('  --train       Bulk train from pending approvals');
    console.log('  --export      Export policy as JSON');
    console.log('  --recommend   Test recommendation (--recommend from@email.com "subject")');
  }
}
