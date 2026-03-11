#!/usr/bin/env node
/**
 * ═══════════════════════════════════════════════════════════════════════════════════
 *  BANF USER QUERY AGENT v1.0
 *  Intelligent email processing for user queries outside standard drives
 * ═══════════════════════════════════════════════════════════════════════════════════
 *
 *  Architecture:
 *    1. CLASSIFIER — Categorizes incoming emails (drive vs query, safe vs human-required)
 *    2. PLANNER    — Creates execution plan for multi-step responses
 *    3. REASONER   — Determines confidence level and response strategy
 *    4. EXECUTOR   — Executes the plan (data lookup, agent coordination, email drafting)
 *    5. APPROVER   — Human-in-the-loop approval workflow for learning
 *
 *  Safe Categories (auto-respond after training):
 *    - Event information requests
 *    - Membership status inquiries
 *    - Family/profile update confirmations
 *    - General BANF information
 *    - RSVP confirmations
 *
 *  Human-Required Categories (always route to human):
 *    - Payment/monetary requests
 *    - Cultural performance requests
 *    - Asset rental requests
 *    - Complaints/grievances
 *    - Sponsorship inquiries
 *    - Policy/bylaws questions
 *    - EC role requests
 *
 *  Usage:
 *    node user-query-agent.js --process          # Process new query emails
 *    node user-query-agent.js --pending          # Show pending approvals
 *    node user-query-agent.js --approve <id>     # Approve a response
 *    node user-query-agent.js --reject <id>      # Reject with learning note  
 *    node user-query-agent.js --stats            # Show approval statistics
 *    node user-query-agent.js --train            # Retrain from feedback
 *
 * ═══════════════════════════════════════════════════════════════════════════════════
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

// Agent Memory — Vector RAG for long-term learning
const memory = require('./agent-memory-rag.js');

// Communication Compliance — header encoding, content validation, audit
const compliance = require('./communication-compliance.js');

// Reinforcement Learning Feedback Engine — action recommendation from feedback
let rlEngine;
try {
  rlEngine = require('./banf-rl-feedback-engine.js');
} catch { rlEngine = null; }

// ─────────────────────────────────────────────────────────────────────────────────
// CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────────

const CONFIG = {
  // Gmail OAuth2
  GOOGLE_CLIENT_ID: '1020178199135-3usrl611ara38i7rhu2ub6sn6g1150ml.apps.googleusercontent.com',
  GOOGLE_CLIENT_SECRET: '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',
  GOOGLE_REFRESH_TOKEN: require('./banf-gmail-config').REFRESH_TOKEN,
  
  // Emails
  BANF_EMAIL: 'banfjax@gmail.com',
  PRESIDENT_EMAIL: 'ranadhir.ghosh@gmail.com',
  
  // API
  WIX_ENDPOINT: 'https://banfwix.wixsite.com/banf1/_functions',
  
  // Local state files
  STATE_FILE: path.join(__dirname, 'user-query-state.json'),
  LEARNING_FILE: path.join(__dirname, 'user-query-learning.json'),
  CRM_FILE: path.join(__dirname, 'banf-crm-reconciliation.json'),
  
  // Thresholds
  AUTO_APPROVE_THRESHOLD: 0.85,  // 85% approval rate needed for auto-mode
  MIN_TRAINING_SAMPLES: 20,      // Min approved samples before auto-mode
  CONFIDENCE_THRESHOLD: 0.90,    // 90% confidence needed for auto-response
  TRAINING_PERIOD_DAYS: 60,      // 2 months training period
  
  // Approval portal (will be created)
  APPROVAL_PORTAL_URL: 'https://banfjax-hash.github.io/banf1/query-approval.html'
};

// ─────────────────────────────────────────────────────────────────────────────────
// CATEGORY DEFINITIONS
// ─────────────────────────────────────────────────────────────────────────────────

const CATEGORIES = {
  // SAFE categories (can auto-respond after training)
  SAFE: {
    EVENT_INFO: {
      id: 'event_info',
      name: 'Event Information Request',
      keywords: ['event', 'when', 'where', 'time', 'location', 'venue', 'date', 'schedule', 'program'],
      autoRespond: true,
      priority: 'normal'
    },
    MEMBERSHIP_STATUS: {
      id: 'membership_status',
      name: 'Membership Status Inquiry',
      keywords: ['membership', 'status', 'active', 'renew', 'expire', 'member', 'joined'],
      autoRespond: true,
      priority: 'normal'
    },
    PROFILE_UPDATE: {
      id: 'profile_update',
      name: 'Profile/Family Update',
      keywords: ['update', 'change', 'correct', 'address', 'phone', 'email', 'family', 'child', 'spouse', 'add member'],
      autoRespond: true,
      priority: 'normal'
    },
    GENERAL_INFO: {
      id: 'general_info',
      name: 'General BANF Information',
      keywords: ['about', 'information', 'what is', 'how to', 'contact', 'office', 'website'],
      autoRespond: true,
      priority: 'low'
    },
    RSVP_CONFIRM: {
      id: 'rsvp_confirm',
      name: 'RSVP Confirmation',
      keywords: ['rsvp', 'attending', 'coming', 'yes', 'confirm', 'register', 'signup'],
      autoRespond: true,
      priority: 'normal'
    },
    THANK_YOU: {
      id: 'thank_you',
      name: 'Thank You / Appreciation',
      keywords: ['thank', 'thanks', 'appreciate', 'grateful', 'wonderful', 'great event'],
      autoRespond: true,
      priority: 'low'
    }
  },
  
  // HUMAN-REQUIRED categories (always route to human)
  HUMAN_REQUIRED: {
    PAYMENT_REQUEST: {
      id: 'payment_request',
      name: 'Payment/Monetary Request',
      keywords: ['payment', 'refund', 'money', 'pay', 'paid', 'receipt', 'invoice', 'charge', 'fee', 'zelle', 'venmo', 'check'],
      autoRespond: false,
      priority: 'high',
      reason: 'Financial matters require human verification'
    },
    CULTURAL_PERFORMANCE: {
      id: 'cultural_performance',
      name: 'Cultural Performance Request',
      keywords: ['perform', 'performance', 'dance', 'song', 'drama', 'skit', 'recitation', 'stage', 'talent'],
      autoRespond: false,
      priority: 'high',
      reason: 'Performance slots are limited and require EC coordination'
    },
    ASSET_RENTAL: {
      id: 'asset_rental',
      name: 'Asset Rental Request',
      keywords: ['rent', 'borrow', 'reserve', 'book', 'venue', 'equipment', 'projector', 'sound', 'tent', 'chairs'],
      autoRespond: false,
      priority: 'medium',
      reason: 'Asset availability requires manual verification'
    },
    COMPLAINT: {
      id: 'complaint',
      name: 'Complaint/Grievance',
      keywords: ['complaint', 'issue', 'problem', 'unhappy', 'disappointed', 'upset', 'grievance', 'concern'],
      autoRespond: false,
      priority: 'high',
      reason: 'Complaints need personal attention from EC'
    },
    SPONSORSHIP: {
      id: 'sponsorship',
      name: 'Sponsorship Inquiry',
      keywords: ['sponsor', 'sponsorship', 'advertise', 'ad', 'promote', 'partnership', 'donate', 'donation'],
      autoRespond: false,
      priority: 'high',
      reason: 'Sponsorship deals require EC negotiation'
    },
    POLICY_BYLAWS: {
      id: 'policy_bylaws',
      name: 'Policy/Bylaws Question',
      keywords: ['policy', 'bylaws', 'constitution', 'rule', 'regulation', 'governance', 'election', 'voting'],
      autoRespond: false,
      priority: 'medium',
      reason: 'Policy matters require official EC response'
    },
    EC_ROLE: {
      id: 'ec_role',
      name: 'EC Role Request',
      keywords: ['volunteer', 'ec', 'committee', 'position', 'role', 'join ec', 'help organize'],
      autoRespond: false,
      priority: 'medium',
      reason: 'EC involvement decisions require board approval'
    }
  },
  
  // Drive categories (skip - handled by other agents)
  DRIVE: {
    MEMBERSHIP_DRIVE: { id: 'membership_drive', keywords: ['membership drive', 'join banf', 'new member'] },
    PAYMENT_DRIVE: { id: 'payment_drive', keywords: ['payment confirmation', 'payment received'] },
    EVITE_DRIVE: { id: 'evite_drive', keywords: ['evite', 'bosonto', 'rsvp'] },
    VERIFICATION_DRIVE: { id: 'verification_drive', keywords: ['verify', 'verification', 'confirm details'] }
  }
};

// ─────────────────────────────────────────────────────────────────────────────────
// STATE MANAGEMENT
// ─────────────────────────────────────────────────────────────────────────────────

function loadState() {
  try {
    if (fs.existsSync(CONFIG.STATE_FILE)) {
      return JSON.parse(fs.readFileSync(CONFIG.STATE_FILE, 'utf8'));
    }
  } catch (e) {}
  return {
    processedEmails: {},      // messageId -> processing record
    pendingApprovals: [],     // queries awaiting approval
    approvedResponses: [],    // successfully sent responses
    rejectedResponses: [],    // rejected with learning notes
    statistics: {
      totalProcessed: 0,
      totalApproved: 0,
      totalRejected: 0,
      totalAutoResponded: 0,
      categoryStats: {}
    },
    trainingStartDate: new Date().toISOString(),
    autoModeEnabled: false
  };
}

function saveState(state) {
  fs.writeFileSync(CONFIG.STATE_FILE, JSON.stringify(state, null, 2));
}

function loadLearning() {
  try {
    if (fs.existsSync(CONFIG.LEARNING_FILE)) {
      return JSON.parse(fs.readFileSync(CONFIG.LEARNING_FILE, 'utf8'));
    }
  } catch (e) {}
  return {
    patterns: [],           // Learned response patterns
    rejectionNotes: [],     // Why responses were rejected
    approvalPatterns: [],   // Patterns from approved responses
    categoryLearning: {}    // Per-category learning data
  };
}

function saveLearning(learning) {
  fs.writeFileSync(CONFIG.LEARNING_FILE, JSON.stringify(learning, null, 2));
}

function loadCRM() {
  try {
    const data = JSON.parse(fs.readFileSync(CONFIG.CRM_FILE, 'utf8'));
    return data.members || data;
  } catch (e) {
    console.error('[CRM] Failed to load:', e.message);
    return [];
  }
}

// ─────────────────────────────────────────────────────────────────────────────────
// HTTP HELPERS
// ─────────────────────────────────────────────────────────────────────────────────

function httpsRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const opts = {
      hostname: u.hostname,
      port: 443,
      path: u.pathname + u.search,
      method: options.method || 'GET',
      headers: options.headers || {}
    };
    const req = https.request(opts, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, data });
        }
      });
    });
    req.on('error', reject);
    if (options.body) req.write(options.body);
    req.end();
  });
}

async function getAccessToken() {
  const res = await httpsRequest('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `client_id=${CONFIG.GOOGLE_CLIENT_ID}&client_secret=${CONFIG.GOOGLE_CLIENT_SECRET}&refresh_token=${CONFIG.GOOGLE_REFRESH_TOKEN}&grant_type=refresh_token`
  });
  if (res.data.access_token) return res.data.access_token;
  throw new Error('Token refresh failed: ' + JSON.stringify(res.data));
}

// ─────────────────────────────────────────────────────────────────────────────────
// CLASSIFIER AGENT
// ─────────────────────────────────────────────────────────────────────────────────

class ClassifierAgent {
  constructor() {
    this.learning = loadLearning();
  }
  
  /**
   * Classify an email into a category
   * Returns: { category, categoryType, confidence, isDrive, needsHuman, reason }
   */
  classify(email) {
    const subject = (email.subject || '').toLowerCase();
    const body = (email.body || email.snippet || '').toLowerCase();
    const combined = subject + ' ' + body;
    
    // First check if this is a drive email (skip)
    for (const [key, cat] of Object.entries(CATEGORIES.DRIVE)) {
      const matches = cat.keywords.filter(kw => combined.includes(kw)).length;
      if (matches >= 1) {
        return {
          category: cat.id,
          categoryType: 'drive',
          confidence: 0.9,
          isDrive: true,
          needsHuman: false,
          reason: `Part of ${key} - handled by drive agents`
        };
      }
    }
    
    // Check human-required categories first (higher priority)
    let bestHumanMatch = null;
    let bestHumanScore = 0;
    
    for (const [key, cat] of Object.entries(CATEGORIES.HUMAN_REQUIRED)) {
      const matches = cat.keywords.filter(kw => combined.includes(kw)).length;
      const score = matches / cat.keywords.length;
      if (score > bestHumanScore && matches >= 2) {
        bestHumanScore = score;
        bestHumanMatch = { ...cat, key };
      }
    }
    
    // Check safe categories
    let bestSafeMatch = null;
    let bestSafeScore = 0;
    
    for (const [key, cat] of Object.entries(CATEGORIES.SAFE)) {
      const matches = cat.keywords.filter(kw => combined.includes(kw)).length;
      const score = matches / cat.keywords.length;
      if (score > bestSafeScore && matches >= 2) {
        bestSafeScore = score;
        bestSafeMatch = { ...cat, key };
      }
    }
    
    // If human-required match is strong, use it
    if (bestHumanMatch && bestHumanScore >= 0.3) {
      return {
        category: bestHumanMatch.id,
        categoryType: 'human_required',
        confidence: Math.min(bestHumanScore + 0.3, 0.95),
        isDrive: false,
        needsHuman: true,
        reason: bestHumanMatch.reason,
        priority: bestHumanMatch.priority
      };
    }
    
    // Otherwise use safe match
    if (bestSafeMatch && bestSafeScore >= 0.2) {
      return {
        category: bestSafeMatch.id,
        categoryType: 'safe',
        confidence: Math.min(bestSafeScore + 0.4, 0.95),
        isDrive: false,
        needsHuman: !this.canAutoRespond(bestSafeMatch.id),
        reason: this.canAutoRespond(bestSafeMatch.id) 
          ? 'Safe category with sufficient training' 
          : 'Safe category but needs more training samples',
        priority: bestSafeMatch.priority
      };
    }
    
    // Unknown category - needs human
    return {
      category: 'unknown',
      categoryType: 'unknown',
      confidence: 0.3,
      isDrive: false,
      needsHuman: true,
      reason: 'Could not confidently classify this query',
      priority: 'medium'
    };
  }
  
  canAutoRespond(categoryId) {
    const state = loadState();
    const stats = state.statistics.categoryStats[categoryId] || { approved: 0, rejected: 0 };
    const total = stats.approved + stats.rejected;
    
    if (total < CONFIG.MIN_TRAINING_SAMPLES) return false;
    
    const approvalRate = stats.approved / total;
    return approvalRate >= CONFIG.AUTO_APPROVE_THRESHOLD;
  }
}

// ─────────────────────────────────────────────────────────────────────────────────
// PLANNER AGENT
// ─────────────────────────────────────────────────────────────────────────────────

class PlannerAgent {
  constructor(crm) {
    this.crm = crm;
  }
  
  /**
   * Create an execution plan for responding to a query
   * Returns: { steps: [], requiresAgentCoordination: bool, estimatedConfidence: number }
   */
  createPlan(email, classification) {
    const steps = [];
    const senderEmail = (email.from || '').toLowerCase();
    
    // Step 1: Always look up sender in CRM
    steps.push({
      id: 'lookup_sender',
      action: 'CRM_LOOKUP',
      params: { email: senderEmail },
      description: 'Look up sender in CRM database'
    });
    
    // Step 2: Based on category, add specific steps
    switch (classification.category) {
      case 'event_info':
        steps.push({
          id: 'fetch_events',
          action: 'FETCH_EVENTS',
          params: {},
          description: 'Fetch upcoming events from database'
        });
        steps.push({
          id: 'compose_event_info',
          action: 'COMPOSE_RESPONSE',
          params: { template: 'event_info' },
          description: 'Compose event information response'
        });
        break;
        
      case 'membership_status':
        steps.push({
          id: 'check_membership',
          action: 'CHECK_MEMBERSHIP',
          params: { email: senderEmail },
          description: 'Check membership status and history'
        });
        steps.push({
          id: 'compose_membership',
          action: 'COMPOSE_RESPONSE',
          params: { template: 'membership_status' },
          description: 'Compose membership status response'
        });
        break;
        
      case 'profile_update':
        steps.push({
          id: 'parse_update_request',
          action: 'PARSE_UPDATE',
          params: { body: email.body },
          description: 'Parse the update request from email body'
        });
        steps.push({
          id: 'validate_update',
          action: 'VALIDATE_UPDATE',
          params: {},
          description: 'Validate the requested update'
        });
        steps.push({
          id: 'apply_update',
          action: 'APPLY_UPDATE',
          params: {},
          description: 'Apply update to CRM (pending confirmation)'
        });
        steps.push({
          id: 'compose_confirmation',
          action: 'COMPOSE_RESPONSE',
          params: { template: 'profile_update_confirm' },
          description: 'Compose update confirmation response'
        });
        break;
        
      case 'rsvp_confirm':
        steps.push({
          id: 'process_rsvp',
          action: 'PROCESS_RSVP',
          params: { body: email.body },
          description: 'Process RSVP from email content'
        });
        steps.push({
          id: 'update_attendance',
          action: 'UPDATE_ATTENDANCE',
          params: {},
          description: 'Update event attendance record'
        });
        steps.push({
          id: 'compose_rsvp_confirm',
          action: 'COMPOSE_RESPONSE',
          params: { template: 'rsvp_confirmation' },
          description: 'Compose RSVP confirmation response'
        });
        break;
        
      case 'thank_you':
        steps.push({
          id: 'compose_thank_you',
          action: 'COMPOSE_RESPONSE',
          params: { template: 'thank_you_reply' },
          description: 'Compose appreciation acknowledgment'
        });
        break;
        
      case 'general_info':
        steps.push({
          id: 'search_kb',
          action: 'SEARCH_KNOWLEDGE_BASE',
          params: { query: email.subject + ' ' + email.body },
          description: 'Search knowledge base for relevant information'
        });
        steps.push({
          id: 'compose_info',
          action: 'COMPOSE_RESPONSE',
          params: { template: 'general_info' },
          description: 'Compose informational response'
        });
        break;
        
      default:
        // Human-required or unknown
        steps.push({
          id: 'route_to_human',
          action: 'ROUTE_TO_HUMAN',
          params: { reason: classification.reason },
          description: 'Route to human for manual handling'
        });
    }
    
    // Final step: Send response (or send for approval)
    steps.push({
      id: 'send_response',
      action: classification.needsHuman ? 'QUEUE_FOR_APPROVAL' : 'SEND_RESPONSE',
      params: {},
      description: classification.needsHuman 
        ? 'Queue response for human approval' 
        : 'Send response to user'
    });
    
    return {
      steps,
      requiresAgentCoordination: ['profile_update', 'rsvp_confirm'].includes(classification.category),
      estimatedConfidence: classification.confidence
    };
  }
}

// ─────────────────────────────────────────────────────────────────────────────────
// REASONER AGENT
// ─────────────────────────────────────────────────────────────────────────────────

class ReasonerAgent {
  constructor(learning) {
    this.learning = learning;
  }
  
  /**
   * Reason about the response based on context
   * Returns: { shouldRespond: bool, confidence: number, reasoning: string, suggestedResponse: string }
   */
  reason(email, classification, planResults, memberData) {
    const reasoning = [];
    let confidence = classification.confidence;
    
    // Factor 1: Do we have member data?
    if (memberData) {
      reasoning.push(`Sender is a known member: ${memberData.displayName}`);
      confidence += 0.1;
    } else {
      reasoning.push('Sender is not in our CRM - may be prospective member');
      confidence -= 0.1;
    }
    
    // Factor 2: Is the request clear?
    const body = (email.body || '').toLowerCase();
    const hasQuestion = body.includes('?') || body.includes('please') || body.includes('could you');
    if (hasQuestion) {
      reasoning.push('Email contains clear request/question');
      confidence += 0.05;
    }
    
    // Factor 3: Similar past responses?
    const similarResponses = this.findSimilarResponses(email, classification.category);
    if (similarResponses.length > 0) {
      reasoning.push(`Found ${similarResponses.length} similar past approved responses`);
      confidence += 0.1;
    }
    
    // Factor 4: Category-specific confidence adjustments
    if (['thank_you', 'general_info'].includes(classification.category)) {
      reasoning.push('Low-risk category - safe to auto-respond');
      confidence += 0.1;
    }
    
    // Cap confidence
    confidence = Math.min(Math.max(confidence, 0.1), 0.99);
    
    const shouldRespond = confidence >= CONFIG.CONFIDENCE_THRESHOLD && !classification.needsHuman;
    
    return {
      shouldRespond,
      confidence,
      reasoning: reasoning.join('. '),
      suggestedResponse: this.generateResponse(email, classification, planResults, memberData)
    };
  }
  
  findSimilarResponses(email, category) {
    // Look for approved responses in same category
    const state = loadState();
    return state.approvedResponses.filter(r => r.category === category).slice(0, 5);
  }
  
  generateResponse(email, classification, planResults, memberData) {
    // ── SMART NAME RESOLUTION ──
    // Don't blindly use CRM name — check if email body indicates a different person
    let resolvedName = memberData?.displayName || memberData?.firstName || 'there';
    let firstName = resolvedName.split(' ')[0];
    
    // Check RAG memory for known identity mismatches on this email
    const senderEmail = (email.from || '').toLowerCase();
    const identityMemories = memory.search(`identity ${senderEmail}`, { type: 'identity', limit: 3 });
    if (identityMemories.length > 0) {
      const topIdentity = identityMemories[0].memory;
      if (topIdentity.context?.actualName) {
        resolvedName = topIdentity.context.actualName;
        firstName = resolvedName.split(' ')[0];
        console.log(`  [MEMORY] Using remembered name: ${resolvedName} (not CRM: ${memberData?.displayName})`);
      }
    }
    
    // Check if THIS email contains a name change request — use the new name
    if (planResults?.parse_update_request?.updates) {
      const nameUpdate = planResults.parse_update_request.updates.find(u => u.field === 'name');
      if (nameUpdate?.newValue) {
        resolvedName = nameUpdate.newValue;
        firstName = resolvedName.split(' ')[0];
        console.log(`  [NAME] Using requested name from email: ${resolvedName}`);
        
        // Store identity learning in RAG memory
        memory.recordIdentity(
          senderEmail,
          memberData?.displayName || 'unknown',
          nameUpdate.newValue,
          `Email explicitly requested name change: "${nameUpdate.rawMatch}"`,
          { oldName: nameUpdate.oldValue, source: 'user_query_agent' }
        );
      }
    }
    
    // Also extract sender name from email From header (e.g. "Subrata Chattopadhyay <robchatto@aol.com>")
    const fromNameMatch = (email.from || '').match(/^([^<]+?)\s*</);
    if (fromNameMatch) {
      const fromName = fromNameMatch[1].trim();
      // If CRM name and From header name differ significantly, trust From header
      if (memberData?.displayName && fromName && 
          !memberData.displayName.toLowerCase().includes(fromName.split(' ')[0].toLowerCase()) &&
          fromName.length > 2 && !fromName.includes('@')) {
        resolvedName = fromName;
        firstName = resolvedName.split(' ')[0];
        console.log(`  [FROM] Using From header name: ${fromName} (CRM has: ${memberData?.displayName})`);
        
        // Record this mismatch as a pattern
        memory.recordPattern(
          `Email ${senderEmail}: From header says "${fromName}" but CRM has "${memberData.displayName}". Possible shared email or name update needed.`,
          `From header: ${email.from}`,
          { tags: ['name_mismatch', 'from_header'], email: senderEmail, source: 'user_query_agent' }
        );
      }
    }
    
    switch (classification.category) {
      case 'event_info':
        return this.templateEventInfo(firstName, planResults);
      case 'membership_status':
        return this.templateMembershipStatus(firstName, memberData);
      case 'profile_update':
        return this.templateProfileUpdate(firstName, planResults);
      case 'rsvp_confirm':
        return this.templateRsvpConfirm(firstName, planResults);
      case 'thank_you':
        return this.templateThankYou(firstName);
      case 'general_info':
        return this.templateGeneralInfo(firstName, email);
      default:
        return this.templateHumanRequired(firstName, classification);
    }
  }
  
  templateEventInfo(name, results) {
    return `Dear ${name},

Thank you for your interest in BANF events!

Our upcoming event is **Bosonto Utsob 2026** (Spring Festival):
- **Date:** Saturday, March 7, 2026
- **Location:** Southside Community Center, 10080 Beach Blvd, Jacksonville FL 32246
- **Time:** 11:00 AM EST onwards

For more details and to RSVP, please visit www.jaxbengali.org or check your Evite invitation.

Best regards,
BANF Team`;
  }
  
  templateMembershipStatus(name, member) {
    if (!member) {
      return `Dear ${name},

We couldn't find your email in our membership records. If you believe this is an error, please reply with your registered email address.

To become a BANF member, please visit www.jaxbengali.org/membership.

Best regards,
BANF Team`;
    }
    
    const years = member.membershipYears || [];
    const isCurrent = years.includes('2026-27');
    
    return `Dear ${name},

Here is your BANF membership status:
- **Member Since:** ${years[0] || 'N/A'}
- **Membership Years:** ${years.join(', ') || 'None'}
- **Current Status:** ${isCurrent ? '✅ Active for FY2026-27' : '❌ Not active for FY2026-27'}
- **Household Type:** ${member.householdType || 'N/A'}

${!isCurrent ? 'To renew your membership, please visit www.jaxbengali.org/membership.' : ''}

Best regards,
BANF Team`;
  }
  
  templateProfileUpdate(name, results) {
    // Build specific change details from parsed updates
    let changesText = '';
    const updates = results?.parse_update_request?.updates || [];
    
    if (updates.length > 0) {
      changesText = updates.map(u => {
        if (u.field === 'name' && u.action === 'change') {
          return `- **Name Update:** ${u.oldValue ? `${u.oldValue} → ` : ''}${u.newValue}`;
        } else if (u.field === 'phone') {
          return `- **Phone:** Updated to ${u.value}`;
        } else if (u.field === 'phone2') {
          return `- **Phone 2:** Updated to ${u.value}`;
        } else if (u.field === 'address') {
          return `- **Address:** Noted (pending verification)`;
        } else if (u.field === 'email') {
          return `- **Email:** Updated to ${u.value}`;
        } else if (u.field === 'children') {
          return `- **Family:** Child addition noted`;
        }
        return `- **${u.field}:** ${u.value || u.action || 'Updated'}`;
      }).join('\n');
    } else {
      changesText = '- Changes noted from your email (will be reviewed by our team)';
    }
    
    return `Dear ${name},

Thank you for your update request. We have noted the following changes:

${changesText}

These changes will be reviewed and applied to your profile. If you need to make additional changes, please visit the member portal or reply to this email.

Best regards,
BANF Team`;
  }
  
  templateRsvpConfirm(name, results) {
    return `Dear ${name},

Thank you for your RSVP! We have recorded your attendance confirmation.

We look forward to seeing you at the event!

Best regards,
BANF Team`;
  }
  
  templateThankYou(name) {
    return `Dear ${name},

Thank you so much for your kind words! We truly appreciate your support and engagement with BANF.

It is members like you who make our community special. We look forward to continuing to serve you.

Warm regards,
BANF Team`;
  }
  
  templateGeneralInfo(name, email) {
    return `Dear ${name},

Thank you for reaching out to BANF.

For general information about our organization:
- **Website:** www.jaxbengali.org
- **Email:** banfjax@gmail.com
- **Facebook:** facebook.com/jaxbengali

If you have specific questions, please don't hesitate to reply to this email.

Best regards,
BANF Team`;
  }
  
  templateHumanRequired(name, classification) {
    return `[DRAFT - NEEDS HUMAN REVIEW]

Dear ${name},

Thank you for contacting BANF regarding ${classification.category.replace(/_/g, ' ')}.

This matter requires attention from our Executive Committee. A team member will review your request and respond shortly.

Best regards,
BANF Team

---
Note to EC: ${classification.reason}`;
  }
}

// ─────────────────────────────────────────────────────────────────────────────────
// EXECUTOR AGENT
// ─────────────────────────────────────────────────────────────────────────────────

class ExecutorAgent {
  constructor(crm) {
    this.crm = crm;
  }
  
  async execute(plan, email) {
    const results = {};
    
    for (const step of plan.steps) {
      console.log(`  [EXECUTE] ${step.id}: ${step.description}`);
      
      switch (step.action) {
        case 'CRM_LOOKUP':
          results[step.id] = this.crmLookup(step.params.email);
          break;
        case 'FETCH_EVENTS':
          results[step.id] = this.fetchEvents();
          break;
        case 'CHECK_MEMBERSHIP':
          results[step.id] = this.checkMembership(step.params.email);
          break;
        case 'PARSE_UPDATE':
          results[step.id] = this.parseUpdate(step.params.body);
          break;
        case 'VALIDATE_UPDATE':
          results[step.id] = { valid: true }; // Simplified
          break;
        case 'APPLY_UPDATE':
          results[step.id] = { applied: false, reason: 'Pending approval' };
          break;
        case 'PROCESS_RSVP':
          results[step.id] = this.processRsvp(step.params.body);
          break;
        case 'UPDATE_ATTENDANCE':
          results[step.id] = { updated: false, reason: 'Pending approval' };
          break;
        case 'SEARCH_KNOWLEDGE_BASE':
          results[step.id] = this.searchKnowledgeBase(step.params.query);
          break;
        case 'COMPOSE_RESPONSE':
          // Handled by Reasoner
          results[step.id] = { status: 'deferred_to_reasoner' };
          break;
        case 'ROUTE_TO_HUMAN':
          results[step.id] = { routed: true, reason: step.params.reason };
          break;
        case 'QUEUE_FOR_APPROVAL':
        case 'SEND_RESPONSE':
          results[step.id] = { status: 'pending' };
          break;
      }
    }
    
    return results;
  }
  
  crmLookup(email) {
    const member = this.crm.find(m => 
      (m.email || '').toLowerCase() === email.toLowerCase()
    );
    return member || null;
  }
  
  fetchEvents() {
    return {
      events: [
        { name: 'Bosonto Utsob 2026', date: '2026-03-07', status: 'upcoming' }
      ]
    };
  }
  
  checkMembership(email) {
    const member = this.crmLookup(email);
    if (!member) return { found: false };
    
    return {
      found: true,
      years: member.membershipYears || [],
      currentYear: (member.membershipYears || []).includes('2026-27'),
      householdType: member.householdType,
      totalPaid: member.totalPaid
    };
  }
  
  parseUpdate(body) {
    // Comprehensive extraction of update patterns from email body
    const updates = [];
    const bodyLower = (body || '').toLowerCase();
    
    // ── NAME CHANGE DETECTION ──
    // Pattern: "change name from X to Y", "name should be X not Y", etc.
    const nameChangePatterns = [
      /change\s+(?:the\s+)?name\s+from\s+([\w\s]+?)\s+to\s+([\w\s]+?)(?:\.|,|$|\n)/i,
      /name\s+(?:should|needs to)\s+be\s+([\w\s]+?)\s+(?:not|instead of)\s+([\w\s]+?)(?:\.|,|$|\n)/i,
      /please\s+(?:change|update)\s+(?:it|name)\s+to\s+([\w\s]+?)(?:\.|,|$|\n)/i,
      /(?:my|the)\s+name\s+is\s+([\w\s]+?)\s*(?:not|,\s*not)\s+([\w\s]+?)(?:\.|,|$|\n)/i,
      /(?:rename|replace)\s+([\w\s]+?)\s+(?:with|to)\s+([\w\s]+?)(?:\.|,|$|\n)/i,
    ];
    
    for (const pattern of nameChangePatterns) {
      const match = body.match(pattern);
      if (match) {
        if (match.length >= 3) {
          // Pattern with "from X to Y"
          updates.push({
            field: 'name',
            action: 'change',
            oldValue: match[1].trim(),
            newValue: match[2].trim(),
            rawMatch: match[0]
          });
        } else if (match.length >= 2) {
          // Pattern with just "change to Y"
          updates.push({
            field: 'name',
            action: 'change',
            newValue: match[1].trim(),
            rawMatch: match[0]
          });
        }
        break; // Only take first name change match
      }
    }
    
    // ── PHONE CHANGE ──
    if (/phone|mobile|cell/i.test(body)) {
      const phones = body.match(/\d{3}[-.\s]?\d{3}[-.\s]?\d{4}/g) || [];
      if (phones.length > 0) {
        updates.push({ field: 'phone', value: phones[0] });
        if (phones.length > 1) {
          updates.push({ field: 'phone2', value: phones[1] });
        }
      }
    }
    
    // ── ADDRESS CHANGE ──
    if (/address/i.test(body)) {
      updates.push({ field: 'address', value: '[ADDRESS_FROM_EMAIL]' });
    }
    
    // ── CHILD ADDITION ──
    if (/add.*child|new.*child/i.test(body)) {
      updates.push({ field: 'children', action: 'add' });
    }
    
    // ── EMAIL CHANGE ──
    if (/change.*email|new.*email|update.*email/i.test(body)) {
      const emailMatch = body.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
      if (emailMatch) {
        updates.push({ field: 'email', value: emailMatch[0] });
      }
    }
    
    return { updates };
  }
  
  processRsvp(body) {
    const lower = body.toLowerCase();
    let rsvp = 'yes';
    if (/no|cannot|can't|won't|unable/i.test(lower)) {
      rsvp = 'no';
    } else if (/maybe|possibly|might/i.test(lower)) {
      rsvp = 'maybe';
    }
    
    // Try to extract counts
    const adultMatch = body.match(/(\d+)\s*adult/i);
    const kidMatch = body.match(/(\d+)\s*(kid|child|children)/i);
    
    return {
      rsvp,
      adults: adultMatch ? parseInt(adultMatch[1]) : 2,
      kids: kidMatch ? parseInt(kidMatch[1]) : 0
    };
  }
  
  searchKnowledgeBase(query) {
    // Simple keyword-based KB search
    const kb = {
      'membership': 'BANF membership is $100/year for families. Visit www.jaxbengali.org for details.',
      'event': 'Our main events are Durga Puja (Fall) and Bosonto Utsob (Spring).',
      'contact': 'Contact us at banfjax@gmail.com or visit www.jaxbengali.org.'
    };
    
    const results = [];
    for (const [key, value] of Object.entries(kb)) {
      if (query.toLowerCase().includes(key)) {
        results.push({ key, content: value });
      }
    }
    
    return { results };
  }
}

// ─────────────────────────────────────────────────────────────────────────────────
// APPROVAL WORKFLOW
// ─────────────────────────────────────────────────────────────────────────────────

class ApprovalWorkflow {
  constructor() {
    this.state = loadState();
  }
  
  queueForApproval(email, classification, reasoning, suggestedResponse) {
    const approvalId = `QA-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    
    const approval = {
      id: approvalId,
      timestamp: new Date().toISOString(),
      email: {
        from: email.from,
        subject: email.subject,
        body: (email.body || email.snippet || '').substring(0, 1000),
        messageId: email.id
      },
      classification,
      reasoning,
      suggestedResponse,
      status: 'pending',
      approvalUrl: `${CONFIG.APPROVAL_PORTAL_URL}?id=${approvalId}&action=approve`,
      rejectUrl: `${CONFIG.APPROVAL_PORTAL_URL}?id=${approvalId}&action=reject`
    };
    
    this.state.pendingApprovals.push(approval);
    this.state.statistics.totalProcessed++;
    saveState(this.state);
    
    return approval;
  }
  
  async sendApprovalEmail(approval, accessToken) {
    const html = this.buildApprovalEmailHtml(approval);
    const subject = `🔍 Query Response Approval: ${approval.classification.category} [${approval.id}]`;
    
    await this.sendEmail(
      accessToken,
      CONFIG.PRESIDENT_EMAIL,
      'Dr. Ranadhir Ghosh',
      subject,
      html
    );
    
    console.log(`  [APPROVAL] Sent approval request to ${CONFIG.PRESIDENT_EMAIL}`);
  }
  
  buildApprovalEmailHtml(approval) {
    return `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 700px; margin: 0 auto; padding: 20px;">
    <div style="background: linear-gradient(135deg, #8B0000, #DC143C); padding: 20px; border-radius: 12px 12px 0 0;">
        <h1 style="color: #fff; margin: 0; font-size: 22px;">🤖 User Query Agent — Approval Request</h1>
        <p style="color: rgba(255,255,255,0.85); margin: 8px 0 0 0;">ID: ${approval.id}</p>
    </div>
    
    <div style="background: #f5f5f5; padding: 25px; border: 1px solid #ddd; border-top: none;">
        
        <!-- Original Email -->
        <div style="background: #fff; padding: 20px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #007bff;">
            <h3 style="margin: 0 0 10px 0; color: #007bff;">📧 Original Email</h3>
            <p><strong>From:</strong> ${approval.email.from}</p>
            <p><strong>Subject:</strong> ${approval.email.subject}</p>
            <div style="background: #f9f9f9; padding: 15px; border-radius: 4px; white-space: pre-wrap; font-size: 14px;">${approval.email.body}</div>
        </div>
        
        <!-- Classification -->
        <div style="background: #fff; padding: 20px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #ffc107;">
            <h3 style="margin: 0 0 10px 0; color: #856404;">🏷️ Classification</h3>
            <p><strong>Category:</strong> ${approval.classification.category.replace(/_/g, ' ').toUpperCase()}</p>
            <p><strong>Type:</strong> ${approval.classification.categoryType}</p>
            <p><strong>Confidence:</strong> ${Math.round(approval.classification.confidence * 100)}%</p>
            <p><strong>Needs Human:</strong> ${approval.classification.needsHuman ? 'Yes' : 'No'}</p>
        </div>
        
        <!-- Reasoning -->
        <div style="background: #fff; padding: 20px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #17a2b8;">
            <h3 style="margin: 0 0 10px 0; color: #117a8b;">🧠 Agent Reasoning</h3>
            <p>${approval.reasoning}</p>
        </div>
        
        <!-- Suggested Response -->
        <div style="background: #fff; padding: 20px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #28a745;">
            <h3 style="margin: 0 0 10px 0; color: #155724;">📝 Suggested Response</h3>
            <div style="background: #f9f9f9; padding: 15px; border-radius: 4px; white-space: pre-wrap; font-size: 14px;">${approval.suggestedResponse}</div>
        </div>
        
        <!-- Action Buttons -->
        <div style="text-align: center; margin: 30px 0;">
            <a href="mailto:${CONFIG.BANF_EMAIL}?subject=APPROVE:${approval.id}&body=Approved" 
               style="display: inline-block; background: #28a745; color: #fff; padding: 15px 35px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; margin-right: 15px;">
               ✅ APPROVE
            </a>
            <a href="mailto:${CONFIG.BANF_EMAIL}?subject=REJECT:${approval.id}&body=Rejection reason: " 
               style="display: inline-block; background: #dc3545; color: #fff; padding: 15px 35px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
               ❌ REJECT
            </a>
        </div>
        
        <p style="color: #666; font-size: 13px; text-align: center;">
            Reply to this email with "APPROVE" or "REJECT: [reason]" to process this request.<br>
            Your feedback helps train the agent for better future responses.
        </p>
        
    </div>
    
    <div style="background: #333; color: #999; padding: 15px; text-align: center; font-size: 12px; border-radius: 0 0 12px 12px;">
        User Query Agent v1.0 | BANF Intelligent Email System
    </div>
</body>
</html>`;
  }
  
  async sendEmail(accessToken, to, toName, subject, htmlBody) {
    // Compliance validation + RFC 2047 header encoding
    const result = compliance.buildCompliantMessage({
      to,
      toName: compliance.sanitizeName(toName),
      from: CONFIG.BANF_EMAIL,
      fromName: 'BANF Query Agent',
      subject,
      htmlBody,
      agent: 'user_query_agent',
      requireGreeting: false,  // Templates handle greeting
      requireSignoff: false,   // Templates handle sign-off
    });
    
    if (result.blocked) {
      console.log(`  [COMPLIANCE] Email blocked: ${result.reason}`);
      return { status: 429, data: { error: result.reason } };
    }
    
    if (result.compliance.warnings.length > 0) {
      console.log(`  [COMPLIANCE] Warnings: ${result.compliance.warnings.join('; ')}`);
    }
    
    const res = await httpsRequest('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ raw: result.raw })
    });
    
    return res;
  }
  
  approve(approvalId, note = '') {
    const idx = this.state.pendingApprovals.findIndex(a => a.id === approvalId);
    if (idx === -1) return { success: false, error: 'Approval not found' };
    
    const approval = this.state.pendingApprovals.splice(idx, 1)[0];
    approval.status = 'approved';
    approval.approvedAt = new Date().toISOString();
    approval.note = note;
    
    this.state.approvedResponses.push(approval);
    this.state.statistics.totalApproved++;
    
    // Update category stats
    const cat = approval.classification.category;
    if (!this.state.statistics.categoryStats[cat]) {
      this.state.statistics.categoryStats[cat] = { approved: 0, rejected: 0 };
    }
    this.state.statistics.categoryStats[cat].approved++;
    
    // Save learning
    const learning = loadLearning();
    learning.approvalPatterns.push({
      category: cat,
      originalEmail: approval.email,
      response: approval.suggestedResponse,
      timestamp: new Date().toISOString()
    });
    saveLearning(learning);
    
    saveState(this.state);
    return { success: true, approval };
  }
  
  reject(approvalId, reason) {
    const idx = this.state.pendingApprovals.findIndex(a => a.id === approvalId);
    if (idx === -1) return { success: false, error: 'Approval not found' };
    
    const approval = this.state.pendingApprovals.splice(idx, 1)[0];
    approval.status = 'rejected';
    approval.rejectedAt = new Date().toISOString();
    approval.rejectionReason = reason;
    
    this.state.rejectedResponses.push(approval);
    this.state.statistics.totalRejected++;
    
    // Update category stats
    const cat = approval.classification.category;
    if (!this.state.statistics.categoryStats[cat]) {
      this.state.statistics.categoryStats[cat] = { approved: 0, rejected: 0 };
    }
    this.state.statistics.categoryStats[cat].rejected++;
    
    // Save learning - rejection notes are valuable
    const learning = loadLearning();
    learning.rejectionNotes.push({
      category: cat,
      originalEmail: approval.email,
      suggestedResponse: approval.suggestedResponse,
      reason,
      timestamp: new Date().toISOString()
    });
    saveLearning(learning);
    
    saveState(this.state);
    return { success: true, approval };
  }
}

// ─────────────────────────────────────────────────────────────────────────────────
// MAIN ORCHESTRATOR
// ─────────────────────────────────────────────────────────────────────────────────

async function processQueryEmail(email, overrideClassification) {
  console.log(`\n[PROCESS] Email from: ${email.from}`);
  console.log(`  Subject: ${email.subject}`);
  
  const crm = loadCRM();
  
  // Step 0: Query RAG memory for sender context
  const senderEmail = (email.from || '').match(/[\w.+-]+@[\w.-]+/)?.[0]?.toLowerCase() || '';
  let memoryContext = null;
  if (senderEmail) {
    const priorMemories = memory.search(`${senderEmail} ${email.subject}`, { limit: 5 });
    const identityInsights = memory.getPersonInsights(senderEmail);
    if (priorMemories.length > 0 || identityInsights.length > 0) {
      memoryContext = { priorMemories, identityInsights };
      console.log(`  [MEMORY] Found ${priorMemories.length} memories + ${identityInsights.length} identity insights for ${senderEmail}`);
    }
  }
  
  // Step 1: Classify (use override if provided, e.g. for member replies)
  let classification;
  if (overrideClassification && !overrideClassification.isDrive) {
    classification = overrideClassification;
    console.log(`  [CLASSIFY] Override: ${classification.category} (${Math.round(classification.confidence * 100)}%)`);
  } else {
    const classifier = new ClassifierAgent();
    classification = classifier.classify(email);
    console.log(`  [CLASSIFY] Category: ${classification.category} (${Math.round(classification.confidence * 100)}%)`);
  }
  
  if (classification.isDrive) {
    console.log(`  [SKIP] This is a drive email - handled by other agents`);
    return { skipped: true, reason: 'drive_email' };
  }
  
  // Step 2: Plan
  const planner = new PlannerAgent(crm);
  const plan = planner.createPlan(email, classification);
  console.log(`  [PLAN] Created ${plan.steps.length} step plan`);
  
  // Step 3: Execute
  const executor = new ExecutorAgent(crm);
  const results = await executor.execute(plan, email);
  const memberData = results.lookup_sender;
  
  // Step 4: Reason
  const learning = loadLearning();
  const reasoner = new ReasonerAgent(learning);
  const reasoning = reasoner.reason(email, classification, results, memberData);
  console.log(`  [REASON] Confidence: ${Math.round(reasoning.confidence * 100)}%, Should auto-respond: ${reasoning.shouldRespond}`);
  
  // Step 5: Approval workflow (always for now)
  const workflow = new ApprovalWorkflow();
  const approval = workflow.queueForApproval(email, classification, reasoning.reasoning, reasoning.suggestedResponse);
  
  // Send approval email to president
  const accessToken = await getAccessToken();
  await workflow.sendApprovalEmail(approval, accessToken);
  
  // Step 6: Store experience in RAG memory for future learning
  try {
    memory.store({
      type: 'experience',
      content: `Processed email from ${senderEmail}: subject="${email.subject}", category=${classification.category}, confidence=${classification.confidence}, needsHuman=${classification.needsHuman}, approvalId=${approval.id}`,
      context: {
        email: senderEmail,
        subject: email.subject,
        category: classification.category,
        confidence: classification.confidence,
        approvalId: approval.id,
        memberName: memberData?.displayName || 'unknown',
        source: 'user_query_agent'
      },
      impact: classification.needsHuman ? 'high' : 'medium',
      tags: [classification.category, 'email_processed']
    });
    console.log(`  [MEMORY] Stored experience in RAG memory`);
  } catch (err) {
    console.log(`  [MEMORY] Warning: Failed to store: ${err.message}`);
  }
  
  return {
    success: true,
    approvalId: approval.id,
    classification,
    needsHuman: classification.needsHuman,
    memoryContext
  };
}

// ─────────────────────────────────────────────────────────────────────────────────
// CLI COMMANDS
// ─────────────────────────────────────────────────────────────────────────────────

async function cmdProcess() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  🤖 USER QUERY AGENT — Processing New Queries');
  console.log('═══════════════════════════════════════════════════════════════\n');
  
  // For testing, process a sample email
  const testEmail = {
    id: 'test-' + Date.now(),
    from: 'test@example.com',
    subject: 'Question about Bosonto Utsob',
    body: 'Hi, I wanted to know when is the Bosonto Utsob event this year and where will it be held? Thanks!'
  };
  
  await processQueryEmail(testEmail);
}

async function cmdPending() {
  const state = loadState();
  
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  📋 PENDING APPROVALS');
  console.log('═══════════════════════════════════════════════════════════════\n');
  
  if (state.pendingApprovals.length === 0) {
    console.log('  No pending approvals.\n');
    return;
  }
  
  state.pendingApprovals.forEach((a, i) => {
    console.log(`${i + 1}. [${a.id}]`);
    console.log(`   From: ${a.email.from}`);
    console.log(`   Subject: ${a.email.subject}`);
    console.log(`   Category: ${a.classification.category}`);
    console.log(`   Confidence: ${Math.round(a.classification.confidence * 100)}%`);
    console.log(`   Queued: ${a.timestamp}\n`);
  });
}

async function cmdApprove(id) {
  const workflow = new ApprovalWorkflow();
  const result = workflow.approve(id);
  
  if (result.success) {
    console.log(`✅ Approved: ${id}`);
    console.log(`   Now sending response to: ${result.approval.email.from}`);
    // TODO: Actually send the response
  } else {
    console.log(`❌ Failed: ${result.error}`);
  }
}

async function cmdReject(id, reason) {
  const workflow = new ApprovalWorkflow();
  const result = workflow.reject(id, reason || 'No reason provided');
  
  if (result.success) {
    console.log(`❌ Rejected: ${id}`);
    console.log(`   Reason recorded for learning`);
  } else {
    console.log(`❌ Failed: ${result.error}`);
  }
}

async function cmdStats() {
  const state = loadState();
  const stats = state.statistics;
  
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  📊 USER QUERY AGENT STATISTICS');
  console.log('═══════════════════════════════════════════════════════════════\n');
  
  console.log(`  Total Processed:     ${stats.totalProcessed}`);
  console.log(`  Total Approved:      ${stats.totalApproved}`);
  console.log(`  Total Rejected:      ${stats.totalRejected}`);
  console.log(`  Pending Approvals:   ${state.pendingApprovals.length}`);
  console.log(`  Auto-Mode Enabled:   ${state.autoModeEnabled ? 'Yes' : 'No'}`);
  
  if (stats.totalApproved + stats.totalRejected > 0) {
    const rate = (stats.totalApproved / (stats.totalApproved + stats.totalRejected) * 100).toFixed(1);
    console.log(`\n  Approval Rate:       ${rate}%`);
  }
  
  console.log('\n  Category Breakdown:');
  for (const [cat, data] of Object.entries(stats.categoryStats)) {
    const total = data.approved + data.rejected;
    const rate = total > 0 ? (data.approved / total * 100).toFixed(0) : 0;
    const autoReady = rate >= 85 && total >= 20 ? '✅' : '⏳';
    console.log(`    ${cat}: ${data.approved}/${total} (${rate}%) ${autoReady}`);
  }
  
  console.log('');
}

function cmdHelp() {
  console.log(`
═══════════════════════════════════════════════════════════════════════════════════
  BANF USER QUERY AGENT v1.0
  Intelligent email processing for user queries
═══════════════════════════════════════════════════════════════════════════════════

COMMANDS:

  node user-query-agent.js --process
    Process new query emails and send for approval

  node user-query-agent.js --pending
    Show all pending approvals

  node user-query-agent.js --approve <id>
    Approve a response and send to user

  node user-query-agent.js --reject <id> [reason]
    Reject a response with learning note

  node user-query-agent.js --stats
    Show approval statistics and category breakdown

  node user-query-agent.js --train
    Retrain agent from accumulated feedback

  node user-query-agent.js --help
    Show this help message

CATEGORIES:

  SAFE (can auto-respond after training):
    - event_info          Event dates, times, locations
    - membership_status   Membership inquiries
    - profile_update      Family/profile changes
    - general_info        General BANF information
    - rsvp_confirm        RSVP confirmations
    - thank_you           Appreciation messages

  HUMAN-REQUIRED (always route to EC):
    - payment_request     Payment/refund requests
    - cultural_performance  Performance slot requests
    - asset_rental        Asset/venue rental
    - complaint           Complaints/grievances
    - sponsorship         Sponsorship inquiries
    - policy_bylaws       Policy questions
    - ec_role             EC volunteer requests

APPROVAL WORKFLOW:
  1. Agent processes email and drafts response
  2. Response sent to President for approval
  3. President approves or rejects with notes
  4. Feedback used to improve future responses
  5. After 85%+ approval rate over 20+ samples, category goes auto

═══════════════════════════════════════════════════════════════════════════════════
`);
}

// ─────────────────────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--help') || args.length === 0) {
    cmdHelp();
    return;
  }
  
  if (args.includes('--process')) {
    await cmdProcess();
  } else if (args.includes('--pending')) {
    await cmdPending();
  } else if (args.includes('--approve')) {
    const idx = args.indexOf('--approve');
    const id = args[idx + 1];
    if (!id) {
      console.log('Usage: --approve <id>');
      return;
    }
    await cmdApprove(id);
  } else if (args.includes('--reject')) {
    const idx = args.indexOf('--reject');
    const id = args[idx + 1];
    const reason = args.slice(idx + 2).join(' ');
    if (!id) {
      console.log('Usage: --reject <id> [reason]');
      return;
    }
    await cmdReject(id, reason);
  } else if (args.includes('--stats')) {
    await cmdStats();
  } else if (args.includes('--train')) {
    console.log('Training from feedback... (not implemented yet)');
  } else {
    cmdHelp();
  }
}

// Only run main if executed directly (not when required as module)
if (require.main === module) {
  main().catch(err => {
    console.error('[FATAL]', err);
    process.exit(1);
  });
}

// Export for use by email reader agent
module.exports = {
  processQueryEmail,
  ClassifierAgent,
  PlannerAgent,
  ReasonerAgent,
  ExecutorAgent,
  ApprovalWorkflow,
  CATEGORIES
};
