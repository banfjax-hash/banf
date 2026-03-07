#!/usr/bin/env node
/**
 * ═══════════════════════════════════════════════════════════════════════
 *  BANF USER MEMBERSHIP ACCEPTANCE DRIVE
 * ═══════════════════════════════════════════════════════════════════════
 *
 *  Comprehensive agent that:
 *  1. Maps payments → membership categories based on:
 *     • Payment amount
 *     • Evite party size (adults + kids)
 *     • Last year's membership history
 *     • Early Bird / Premium tier matching
 *
 *  2. For PAID members:
 *     • Auto-maps membership if payment = tier price (100% match)
 *     • Sends acknowledgement email with recommended mapping
 *     • Member selects/verifies correct tier → agent approves
 *     • If payment < tier → advises additional payment needed
 *     • If payment > tier → credits noted
 *
 *  3. For UNPAID members:
 *     • Sends membership request with tier choices + pricing
 *     • Includes Zelle payment instructions
 *     • Future payment date option (before Early Bird deadline May 31, 2026)
 *
 *  4. For PARTIAL payments:
 *     • Shows balance remaining
 *     • Option to complete payment before deadline
 *
 *  5. CRM updated with all membership mappings
 *
 *  Usage:
 *    node banf-membership-acceptance-agent.js --dry-run     (preview all mappings)
 *    node banf-membership-acceptance-agent.js --send-paid   (send to paid members)
 *    node banf-membership-acceptance-agent.js --send-unpaid (send to unpaid members)
 *    node banf-membership-acceptance-agent.js --send-all    (send to everyone)
 *    node banf-membership-acceptance-agent.js --status      (show drive status)
 *    node banf-membership-acceptance-agent.js --report      (generate HTML report)
 *
 *  Author: BANF Agentic Platform
 *  Date: March 2026
 * ═══════════════════════════════════════════════════════════════════════
 */

const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');

// ═══════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════

const CONFIG = {
  BANF_EMAIL: 'banfjax@gmail.com',
  BANF_ORG: 'Bengali Association of North Florida (BANF)',
  EVENT_NAME: 'Bosonto Utsob 2026',
  EVENT_DATE: 'Saturday, March 7, 2026',
  SEASON: '2026-2027',
  EARLY_BIRD_DEADLINE: 'May 31, 2026',
  ZELLE_EMAIL: 'banfjax@gmail.com',
  ZELLE_PHONE: '',
  PORTAL_URL: 'https://www.jaxbengali.org/admin-portal',
  WEBSITE: 'https://www.jaxbengali.org',
  DEFAULT_DELAY: 5000,
  DEFAULT_BATCH: 10
};

const GMAIL = {
  CLIENT_ID: '1020178199135-3usrl611ara38i7rhu2ub6sn6g1150ml.apps.googleusercontent.com',
  CLIENT_SECRET: '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',
  REFRESH_TOKEN: '1//043SvrPmUfXwUCgYIARAAGAQSNwF-L9IrmO-MD0-4ult4fEofYmx_TDhjylHHdxZ-N3Yqo_-2lIhsmvyiYqhuJJGrZ3JAyZAgLuk'
};

const CRM_PATH = path.join(__dirname, 'banf-crm-reconciliation.json');
const KB_PATH = path.join(__dirname, 'banf-kb-2026-27.json');
const LOCK_FILE = path.join(__dirname, 'banf-membership-drive-lock.json');
const STATUS_FILE = path.join(__dirname, 'banf-membership-drive-status.json');
const REPORT_FILE = path.join(__dirname, 'banf-membership-acceptance-report.html');

// ═══════════════════════════════════════════════════════════════════
// MEMBERSHIP PRICING — Source of truth from banf-kb-2026-27.json
// ═══════════════════════════════════════════════════════════════════

const MEMBERSHIP_PRICING = {
  M2_EarlyBird: {
    code: 'M2-EB', name: 'M2 Premium (Early Bird)',
    description: 'All 17 events covered. Pay by May 31, 2026.',
    family: 375, couple: 330, individual: 205, student: 145
  },
  M2_Premium: {
    code: 'M2', name: 'M2 Premium',
    description: 'All 17 events covered. After May 31, 2026.',
    family: 410, couple: 365, individual: 230, student: 165
  },
  M1_Regular: {
    code: 'M1', name: 'M1 Regular',
    description: '11 events covered. Discounted entry for remaining events.',
    family: 280, couple: 255, individual: 140, student: 100
  }
};

// ═══════════════════════════════════════════════════════════════════
// HOUSEHOLD TYPE DETERMINATION
// Uses evite party size (adults + kids) to determine household type
// ═══════════════════════════════════════════════════════════════════

function determineHouseholdType(member) {
  const adults = parseInt(member.adults) || 1;
  const kids = parseInt(member.kids) || 0;
  const total = adults + kids;

  // Student detection — based on last year or known student status
  if (member.householdType === 'student' || member.membership === 'student') {
    return 'student';
  }

  // Family: 3+ people, OR 2 adults + any kids, OR marked as family
  if (total >= 3 || (adults >= 2 && kids >= 1)) return 'family';

  // Couple: exactly 2 adults, 0 kids
  if (adults === 2 && kids === 0) return 'couple';

  // Individual: 1 person
  if (adults === 1 && kids === 0) return 'individual';

  // Default: if 2+ people, family; otherwise individual
  return total >= 2 ? 'couple' : 'individual';
}

// ═══════════════════════════════════════════════════════════════════
// PAYMENT → MEMBERSHIP MAPPING ENGINE
// Maps payment amount to the best-matching membership tier
// ═══════════════════════════════════════════════════════════════════

function mapPaymentToMembership(member) {
  const amount = parseFloat(member.amount) || 0;
  const paid = member.paymentStatus === 'paid' || member.paid;
  const partial = member.paymentStatus === 'partial';
  const householdType = determineHouseholdType(member);
  const adults = parseInt(member.adults) || 1;
  const kids = parseInt(member.kids) || 0;

  // Result object
  const result = {
    email: member.email,
    name: member.name,
    adults, kids,
    householdType,
    amountPaid: amount,
    isPaid: paid || partial,
    isPartial: partial,
    isUnpaid: !paid && !partial,

    // Mapping results (filled below)
    exactMatch: null,          // Exact tier+household match
    possibleMatches: [],       // All possible matches (ranked)
    recommendedTier: null,     // Best recommendation
    recommendedHousehold: null,
    recommendedPrice: 0,
    balanceDue: 0,
    overpayment: 0,
    confidence: 0,             // 0-100%
    mappingNote: '',
    lastYearTier: member.membership || null,
    lastYearHousehold: member.householdType || null
  };

  if (result.isUnpaid) {
    // No payment — recommend based on household type and history
    result.recommendedTier = 'M2_EarlyBird';
    result.recommendedHousehold = householdType;
    result.recommendedPrice = MEMBERSHIP_PRICING.M2_EarlyBird[householdType] || 0;
    result.balanceDue = result.recommendedPrice;
    result.confidence = 0;
    result.mappingNote = 'No payment received. Recommended M2 Early Bird based on evite party size (' + adults + 'A+' + kids + 'K → ' + householdType + ').';
    return result;
  }

  // ── Try to find exact price match across all tiers ──
  const matches = [];
  for (const [tierKey, tierData] of Object.entries(MEMBERSHIP_PRICING)) {
    for (const hhType of ['family', 'couple', 'individual', 'student']) {
      const price = tierData[hhType];
      if (!price) continue;

      const diff = amount - price;
      const isExact = diff === 0;
      const isOver = diff > 0;
      const isUnder = diff < 0;

      // Score: exact match = 100, close match with household alignment = 80, etc.
      let score = 0;
      if (isExact) score = 100;
      else if (Math.abs(diff) <= 10) score = 90;
      else if (Math.abs(diff) <= 30) score = 70;
      else if (Math.abs(diff) <= 50) score = 50;
      else score = 20;

      // Bonus for household type alignment with evite party size
      if (hhType === householdType) score += 15;

      // Bonus for matching last year's membership
      if (member.membership) {
        const lastTier = member.membership.toLowerCase();
        if (lastTier.includes('m2') && tierKey.includes('M2')) score += 10;
        if (lastTier.includes('m1') && tierKey.includes('M1')) score += 10;
        if (lastTier === hhType) score += 5;
        if (lastTier === 'family' && hhType === 'family') score += 5;
        if (lastTier === 'couple' && hhType === 'couple') score += 5;
      }

      // Penalty for household mismatch
      if (hhType !== householdType) score -= 10;

      matches.push({
        tierKey, tierName: tierData.name, tierCode: tierData.code,
        householdType: hhType, price,
        diff, isExact, isOver, isUnder,
        score: Math.min(score, 100)
      });
    }
  }

  // Sort by score descending
  matches.sort((a, b) => b.score - a.score);
  result.possibleMatches = matches.slice(0, 6);

  // Best match
  const best = matches[0];
  if (best) {
    result.recommendedTier = best.tierKey;
    result.recommendedHousehold = best.householdType;
    result.recommendedPrice = best.price;
    result.confidence = best.score;

    if (best.isExact) {
      result.exactMatch = best;
      result.mappingNote = `✅ EXACT MATCH: $${amount} = ${best.tierName} (${best.householdType}) — 100% confidence.`;
    } else if (best.isOver) {
      result.overpayment = best.diff;
      result.mappingNote = `💰 Overpayment: $${amount} paid, ${best.tierName} (${best.householdType}) costs $${best.price}. Credit of $${best.diff}.`;
    } else {
      result.balanceDue = Math.abs(best.diff);
      result.mappingNote = `⚠️ Underpayment: $${amount} paid, ${best.tierName} (${best.householdType}) costs $${best.price}. Balance due: $${Math.abs(best.diff)}.`;
    }
  }

  return result;
}

// ═══════════════════════════════════════════════════════════════════
// LOAD CRM DATA
// ═══════════════════════════════════════════════════════════════════

function loadCRMData() {
  // Primary: banf-crm-reconciliation.json
  let members = [];
  try {
    const raw = fs.readFileSync(CRM_PATH, 'utf8');
    const data = JSON.parse(raw);
    members = Array.isArray(data) ? data : (data.members || data.data || []);
    console.log(`📋 Loaded ${members.length} members from CRM`);
  } catch (e) {
    console.error('❌ Cannot load CRM data:', e.message);
    process.exit(1);
  }

  // Also load BOSONTO_CRM_DATA (the 47 RSVP-Yes members from the admin portal build)
  // This is the definitive event-specific list
  const bosontoCRM = [
    {name:'Sunetra Basu Ghosh',email:'sunetra.basu@gmail.com',adults:2,kids:0,dietary:'Not specified',paid:true,amount:330,paymentStatus:'paid',expectedAmount:330,remainingBalance:0,membership:'m2',householdType:'couple',isEC:false,memberSince:'2025',paymentMethod:'Zelle'},
    {name:'Kapil Sadhu',email:'kapil.sadhu@gmail.com',adults:2,kids:1,dietary:'Not specified',paid:false,amount:0,paymentStatus:'not_paid',expectedAmount:375,remainingBalance:375,membership:'family',householdType:'family',isEC:false,memberSince:'2025',paymentMethod:''},
    {name:'Paulami Guha',email:'drpaulami@gmail.com',adults:2,kids:0,dietary:'Not specified',paid:false,amount:0,paymentStatus:'not_paid',expectedAmount:330,remainingBalance:330,membership:'couple',householdType:'couple',isEC:false,memberSince:'2025',paymentMethod:''},
    {name:'Ranadhir Ghosh',email:'ranadhir.ghosh@gmail.com',adults:5,kids:0,dietary:'Not specified',paid:true,amount:375,paymentStatus:'paid',expectedAmount:375,remainingBalance:0,membership:'family',householdType:'family',isEC:true,memberSince:'2025',paymentMethod:'Zelle'},
    {name:'Mita Dhar',email:'mdhar79@yahoo.com',adults:1,kids:0,dietary:'Not specified',paid:false,amount:0,paymentStatus:'not_paid',expectedAmount:215,remainingBalance:215,membership:'couple',householdType:'individual',isEC:false,memberSince:'2025',paymentMethod:''},
    {name:'Asok Chaudhuri',email:'asokchaudhuri@gmail.com',adults:2,kids:0,dietary:'Not specified',paid:true,amount:330,paymentStatus:'paid',expectedAmount:330,remainingBalance:0,membership:'couple',householdType:'couple',isEC:false,memberSince:'2025',paymentMethod:'Zelle',paymentNote:'$130 on Mar 2 + $200 on Mar 6 = $330 (couple M2 EB exact)'},
    {name:'Rwiti Choudhury',email:'rwitichoudhury@gmail.com',adults:1,kids:0,dietary:'Not specified',paid:false,amount:0,paymentStatus:'not_paid',expectedAmount:375,remainingBalance:375,membership:'family',householdType:'family',isEC:true,memberSince:'2025',paymentMethod:''},
    {name:'Soma Choudhury',email:'soma1979p@yahoo.com',adults:3,kids:0,dietary:'Not specified',paid:true,amount:375,paymentStatus:'paid',expectedAmount:375,remainingBalance:0,membership:'family',householdType:'family',isEC:false,memberSince:'2025',paymentMethod:'Zelle',paymentNote:'$375 on Mar 6 — Zelle from PARTHA CHOWDHURY (spouse) — M2 EB family exact'},
    {name:'Paramita Pal',email:'runaparamita@gmail.com',adults:3,kids:0,dietary:'Not specified',paid:false,amount:0,paymentStatus:'not_paid',expectedAmount:375,remainingBalance:375,membership:'family',householdType:'family',isEC:false,memberSince:'2025',paymentMethod:''},
    {name:'Suvankar Paul',email:'suvankar.paul@gmail.com',adults:2,kids:0,dietary:'non_veg',paid:true,amount:330,paymentStatus:'paid',expectedAmount:330,remainingBalance:0,membership:'m2',householdType:'couple',isEC:false,memberSince:'2025',paymentMethod:'Zelle'},
    {name:'Rita Bhattacharjee',email:'ritabhattacharjee@gmail.com',adults:2,kids:0,dietary:'Not specified',paid:false,amount:0,paymentStatus:'not_paid',expectedAmount:330,remainingBalance:330,membership:'individual',householdType:'couple',isEC:false,memberSince:'2025',paymentMethod:''},
    {name:'Sanchari Bhattacharyya',email:'tosanchari@gmail.com',adults:1,kids:0,dietary:'Not specified',paid:false,amount:0,paymentStatus:'not_paid',expectedAmount:375,remainingBalance:375,membership:'family',householdType:'family',isEC:false,memberSince:'2025',paymentMethod:''},
    {name:'Jiniya Chandra',email:'jiniya.chandra@gmail.com',adults:4,kids:0,dietary:'Not specified',paid:false,amount:0,paymentStatus:'not_paid',expectedAmount:375,remainingBalance:375,membership:'individual',householdType:'family',isEC:false,memberSince:'2025',paymentMethod:''},
    {name:'Amit Saha',email:'asahaech@yahoo.com',adults:2,kids:0,dietary:'Not specified',paid:true,amount:330,paymentStatus:'paid',expectedAmount:330,remainingBalance:0,membership:'couple',householdType:'couple',isEC:false,memberSince:'2025',paymentMethod:'Zelle',paymentNote:'$330 on Mar 1 — Zelle from Amit Kumar Saha — M2 EB couple exact'},
    {name:'Sunanda Banerjee',email:'sunanda.banerjee@gmail.com',adults:2,kids:0,dietary:'Not specified',paid:false,amount:0,paymentStatus:'not_paid',expectedAmount:330,remainingBalance:330,membership:'couple',householdType:'couple',isEC:false,memberSince:'2025',paymentMethod:''},
    {name:'Barnali Mondal',email:'hibarnali@gmail.com',adults:2,kids:2,dietary:'Not specified',paid:false,amount:0,paymentStatus:'not_paid',expectedAmount:375,remainingBalance:375,membership:'m2',householdType:'individual',isEC:false,memberSince:'2025',paymentMethod:''},
    {name:'Anita Mandal',email:'amandalamandal@yahoo.com',adults:2,kids:0,dietary:'Not specified',paid:false,amount:0,paymentStatus:'not_paid',expectedAmount:330,remainingBalance:330,membership:'couple',householdType:'couple',isEC:false,memberSince:'2025',paymentMethod:''},
    {name:'Chandra Ganguly',email:'chandra.ganguly6@gmail.com',adults:2,kids:2,dietary:'Not specified',paid:false,amount:0,paymentStatus:'not_paid',expectedAmount:375,remainingBalance:375,membership:'individual',householdType:'individual',isEC:false,memberSince:'2025',paymentMethod:''},
    {name:'Latika Mukherjee',email:'lmukhe@yahoo.com',adults:2,kids:0,dietary:'non_veg',paid:true,amount:205,paymentStatus:'paid',expectedAmount:205,remainingBalance:0,membership:'m2',householdType:'individual',isEC:false,memberSince:'',paymentMethod:'Zelle',paymentNote:'$205 on Mar 6 — M2 EB individual exact'},
    {name:'Aparna Chakravarty',email:'chakfam5@yahoo.com',adults:2,kids:0,dietary:'Not specified',paid:false,amount:0,paymentStatus:'not_paid',expectedAmount:375,remainingBalance:375,membership:'family',householdType:'family',isEC:false,memberSince:'2025',paymentMethod:''},
    {name:'Kalyan Chakrabarti',email:'kalyan32258@yahoo.com',adults:1,kids:0,dietary:'Not specified',paid:false,amount:0,paymentStatus:'not_paid',expectedAmount:215,remainingBalance:215,membership:'individual',householdType:'couple',isEC:false,memberSince:'2025',paymentMethod:''},
    {name:'Prianka Natta',email:'priyanka16587@gmail.com',adults:3,kids:0,dietary:'Not specified',paid:false,amount:0,paymentStatus:'not_paid',expectedAmount:215,remainingBalance:215,membership:'individual',householdType:'individual',isEC:false,memberSince:'2025',paymentMethod:''},
    {name:'Atmadeep Mazumdar',email:'atmadeep.mazumdar@gmail.com',adults:2,kids:1,dietary:'Not specified',paid:true,amount:375,paymentStatus:'paid',expectedAmount:375,remainingBalance:0,membership:'family',householdType:'family',isEC:false,memberSince:'',paymentMethod:'Zelle',paymentNote:'$375 on Mar 6 — M2 EB family exact'},
    {name:'Reshma Das',email:'reshmabhadra@gmail.com',adults:1,kids:0,dietary:'Not specified',paid:false,amount:0,paymentStatus:'not_paid',expectedAmount:375,remainingBalance:375,membership:'family',householdType:'family',isEC:false,memberSince:'2025',paymentMethod:''},
    {name:'Nandini Dutta',email:'dutta.nandini47@gmail.com',adults:2,kids:0,dietary:'Not specified',paid:false,amount:0,paymentStatus:'not_paid',expectedAmount:330,remainingBalance:330,membership:'couple',householdType:'individual',isEC:false,memberSince:'2025',paymentMethod:''},
    {name:'Soumyajit Dutta',email:'duttasoumyajit86@gmail.com',adults:1,kids:0,dietary:'Not specified',paid:false,amount:0,paymentStatus:'not_paid',expectedAmount:330,remainingBalance:330,membership:'couple',householdType:'couple',isEC:true,memberSince:'2025',paymentMethod:''},
    {name:'Indrani Dutta',email:'dindrani74@gmail.com',adults:2,kids:0,dietary:'Not specified',paid:false,amount:0,paymentStatus:'not_paid',expectedAmount:330,remainingBalance:330,membership:'couple',householdType:'couple',isEC:false,memberSince:'2025',paymentMethod:''},
    {name:'Chandra Ghosh',email:'ghosh.chandra47@gmail.com',adults:4,kids:0,dietary:'Not specified',paid:false,amount:0,paymentStatus:'not_paid',expectedAmount:375,remainingBalance:375,membership:'individual',householdType:'individual',isEC:false,memberSince:'2025',paymentMethod:''},
    {name:'Rajanya Ghosh',email:'rajanya.ghosh1993@gmail.com',adults:2,kids:1,dietary:'Not specified',paid:false,amount:0,paymentStatus:'not_paid',expectedAmount:330,remainingBalance:330,membership:'m2',householdType:'couple',isEC:true,memberSince:'2025',paymentMethod:''},
    {name:'Dipra Ghosh',email:'ghosh.dipra@gmail.com',adults:2,kids:1,dietary:'Not specified',paid:true,amount:530,paymentStatus:'paid',expectedAmount:375,remainingBalance:0,membership:'m2',householdType:'family',isEC:false,memberSince:'',paymentMethod:'Zelle',paymentNote:'$200 on Feb 5 + $330 on Mar 6 = $530 (family M2 EB $375 + $155 credit)'},
    {name:'Sumon Ghosh',email:'suman.ghosh12@gmail.com',adults:4,kids:0,dietary:'Not specified',paid:true,amount:280,paymentStatus:'paid',expectedAmount:280,remainingBalance:0,membership:'m1',householdType:'family',isEC:false,memberSince:'',paymentMethod:'Zelle',paymentNote:'$280 on Mar 6 — Zelle from SUMAN GHOSH — M1 Regular family exact'},
    {name:'Sreya Ghosh',email:'sreya.ghosh1510@gmail.com',adults:3,kids:0,dietary:'Not specified',paid:false,amount:0,paymentStatus:'not_paid',expectedAmount:375,remainingBalance:375,membership:'individual',householdType:'family',isEC:false,memberSince:'2025',paymentMethod:''},
    {name:'Sonu Roy',email:'sonuroy123@gmail.com',adults:4,kids:0,dietary:'Not specified',paid:false,amount:0,paymentStatus:'not_paid',expectedAmount:375,remainingBalance:375,membership:'family',householdType:'family',isEC:false,memberSince:'2025',paymentMethod:''},
    {name:'Bithika Roy',email:'bithikaroy96@gmail.com',adults:2,kids:0,dietary:'Not specified',paid:false,amount:0,paymentStatus:'not_paid',expectedAmount:330,remainingBalance:330,membership:'couple',householdType:'couple',isEC:false,memberSince:'2025',paymentMethod:''},
    {name:'Padmoja Roy',email:'poddojaroy@gmail.com',adults:4,kids:0,dietary:'Not specified',paid:false,amount:0,paymentStatus:'not_paid',expectedAmount:375,remainingBalance:375,membership:'individual',householdType:'family',isEC:false,memberSince:'2025',paymentMethod:''},
    {name:'Sanhita Roy',email:'sanhitadas_2000@yahoo.com',adults:1,kids:0,dietary:'Not specified',paid:false,amount:0,paymentStatus:'not_paid',expectedAmount:330,remainingBalance:330,membership:'couple',householdType:'couple',isEC:false,memberSince:'2025',paymentMethod:''},
    {name:'Ipshita Roy',email:'sudipshita@yahoo.com',adults:2,kids:2,dietary:'Not specified',paid:false,amount:0,paymentStatus:'not_paid',expectedAmount:375,remainingBalance:375,membership:'family',householdType:'family',isEC:false,memberSince:'2025',paymentMethod:''},
    {name:'Amit Chandak',email:'amit.everywhere@gmail.com',adults:3,kids:0,dietary:'veg',paid:true,amount:375,paymentStatus:'paid',expectedAmount:375,remainingBalance:0,membership:'m2',householdType:'couple',isEC:true,memberSince:'',paymentMethod:'Zelle'},
    {name:'Bidhan Sarkar',email:'bidhan138@gmail.com',adults:4,kids:0,dietary:'Not specified',paid:false,amount:0,paymentStatus:'not_paid',expectedAmount:375,remainingBalance:375,membership:'individual',householdType:'individual',isEC:false,memberSince:'',paymentMethod:''},
    {name:'Tanmoy Banerjee',email:'tanmoy.banerjee2009@gmail.com',adults:3,kids:0,dietary:'non_veg',paid:false,amount:0,paymentStatus:'not_paid',expectedAmount:375,remainingBalance:375,membership:'individual',householdType:'individual',isEC:false,memberSince:'',paymentMethod:''},
    {name:'Papri Saha',email:'saha.papri@ymail.com',adults:2,kids:0,dietary:'Not specified',paid:false,amount:0,paymentStatus:'not_paid',expectedAmount:330,remainingBalance:330,membership:'m2',householdType:'student',isEC:false,memberSince:'',paymentMethod:''},
    {name:'Indrani Sindhuvalli',email:'isindhu7@gmail.com',adults:2,kids:0,dietary:'Not specified',paid:false,amount:0,paymentStatus:'not_paid',expectedAmount:330,remainingBalance:330,membership:'guest',householdType:'individual',isEC:false,memberSince:'',paymentMethod:''},
    {name:'Srabasti Sengupta',email:'mailsrabasti@gmail.com',adults:1,kids:0,dietary:'Not specified',paid:false,amount:0,paymentStatus:'not_paid',expectedAmount:215,remainingBalance:215,membership:'guest',householdType:'individual',isEC:false,memberSince:'',paymentMethod:''},
    {name:'Kaushiki',email:'kaushiki0011@gmail.com',adults:2,kids:1,dietary:'Not specified',paid:false,amount:0,paymentStatus:'not_paid',expectedAmount:375,remainingBalance:375,membership:'guest',householdType:'individual',isEC:false,memberSince:'',paymentMethod:''},
    {name:'Ishita Saha',email:'saha.ishita@mayo.edu',adults:1,kids:0,dietary:'Not specified',paid:true,amount:145,paymentStatus:'paid',expectedAmount:145,remainingBalance:0,membership:'m2',householdType:'student',isEC:false,memberSince:'',paymentMethod:'Zelle'},
    {name:'Sourav Pal',email:'palsourav30@gmail.com',adults:2,kids:0,dietary:'Not specified',paid:false,amount:0,paymentStatus:'not_paid',expectedAmount:330,remainingBalance:330,membership:'guest',householdType:'individual',isEC:false,memberSince:'',paymentMethod:''},
    {name:'Tarit Mondal',email:'trt.mondal@gmail.com',adults:1,kids:0,dietary:'Not specified',paid:true,amount:205,paymentStatus:'paid',expectedAmount:205,remainingBalance:0,membership:'m2',householdType:'individual',isEC:false,memberSince:'',paymentMethod:'Zelle',paymentNote:'$205 on Mar 2 — M2 EB individual exact'},
    {name:'Suvendu Maitra',email:'slmaitra@gmail.com',adults:2,kids:0,dietary:'Not specified',paid:true,amount:280,paymentStatus:'paid',expectedAmount:280,remainingBalance:0,membership:'m1',householdType:'family',isEC:false,memberSince:'2025',paymentMethod:'Zelle',paymentNote:'$280 on Mar 5 — M1 Regular family exact'},
    {name:'Amrita Mukhopadhyay',email:'amrriita@gmail.com',adults:2,kids:1,dietary:'Not specified',paid:true,amount:375,paymentStatus:'paid',expectedAmount:375,remainingBalance:0,membership:'family',householdType:'family',isEC:false,memberSince:'',paymentMethod:'Zelle',paymentNote:'$375 on Mar 2 — Zelle from FNU AMRITA — M2 EB family exact'}
  ];

  // Merge / prefer bosonto event-specific data
  const crmByEmail = {};
  members.forEach(m => { if (m.email) crmByEmail[m.email.toLowerCase()] = m; });

  const merged = [];
  const seen = new Set();
  bosontoCRM.forEach(b => {
    const base = crmByEmail[b.email.toLowerCase()] || {};
    merged.push({
      ...base, ...b,
      // Preserve CRM history fields if available
      lastYearMembership: base.membership || base.lastYearMembership || b.membership || '',
      lastYearHousehold: base.householdType || base.lastYearHousehold || b.householdType || '',
      memberSince: base.memberSince || b.memberSince || ''
    });
    seen.add(b.email.toLowerCase());
  });

  console.log(`  → ${merged.length} event attendees (merged with CRM history)`);
  return merged;
}

// ═══════════════════════════════════════════════════════════════════
// EMAIL TEMPLATES
// ═══════════════════════════════════════════════════════════════════

function buildPaidAcknowledgementHTML(member, mapping) {
  const firstName = (member.name || '').split(' ')[0] || 'Member';
  const tierData = MEMBERSHIP_PRICING[mapping.recommendedTier] || {};
  const tierName = tierData.name || mapping.recommendedTier;
  const hhType = mapping.recommendedHousehold || mapping.householdType;
  const price = mapping.recommendedPrice;
  const amount = mapping.amountPaid;

  let statusBlock = '';
  if (mapping.exactMatch) {
    statusBlock = `
      <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:16px;margin:16px 0">
        <div style="font-size:1.1rem;font-weight:700;color:#166534">✅ Payment Received — Exact Match!</div>
        <div style="font-size:.9rem;color:#15803d;margin-top:8px">Your payment of <strong>$${amount}</strong> matches <strong>${tierName} (${hhType})</strong> perfectly.</div>
      </div>`;
  } else if (mapping.balanceDue > 0) {
    statusBlock = `
      <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:12px;padding:16px;margin:16px 0">
        <div style="font-size:1.1rem;font-weight:700;color:#92400e">⚠️ Payment Received — Balance Due</div>
        <div style="font-size:.9rem;color:#a16207;margin-top:8px">Payment received: <strong>$${amount}</strong>. For <strong>${tierName} (${hhType})</strong>, the total is <strong>$${price}</strong>.</div>
        <div style="font-size:1rem;font-weight:700;color:#dc2626;margin-top:8px">Remaining Balance: $${mapping.balanceDue}</div>
        <div style="font-size:.8rem;color:#78716c;margin-top:8px">Please send the remaining amount via Zelle to <strong>${CONFIG.ZELLE_EMAIL}</strong> before the Early Bird deadline (${CONFIG.EARLY_BIRD_DEADLINE}).</div>
      </div>`;
  } else if (mapping.overpayment > 0) {
    statusBlock = `
      <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:16px;margin:16px 0">
        <div style="font-size:1.1rem;font-weight:700;color:#166534">✅ Payment Received — Thank You!</div>
        <div style="font-size:.9rem;color:#15803d;margin-top:8px">Payment received: <strong>$${amount}</strong>. ${tierName} (${hhType}) is <strong>$${price}</strong>. A credit of <strong>$${mapping.overpayment}</strong> has been noted.</div>
      </div>`;
  }

  // Build alternative tiers table
  let altRows = '';
  const alternatives = mapping.possibleMatches.slice(0, 5);
  alternatives.forEach(alt => {
    const isRec = alt.tierKey === mapping.recommendedTier && alt.householdType === mapping.recommendedHousehold;
    const matchIcon = alt.isExact ? '✅ Exact' : alt.isOver ? '💰 +$' + alt.diff : '⚠️ -$' + Math.abs(alt.diff);
    altRows += `<tr style="background:${isRec ? '#f0fdf4' : 'transparent'}">
      <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb">${isRec ? '⭐ ' : ''}${alt.tierName}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb">${alt.householdType}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;font-weight:700">$${alt.price}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb">${matchIcon}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb">${alt.score}%</td>
    </tr>`;
  });

  return `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
<div style="max-width:640px;margin:20px auto;background:#fff;border-radius:16px;box-shadow:0 4px 24px rgba(0,0,0,.08);overflow:hidden">
  <!-- Header -->
  <div style="background:linear-gradient(135deg,#1e3a5f,#2d5a8e);padding:24px;text-align:center">
    <div style="font-size:2rem">🌸</div>
    <div style="font-size:1.3rem;font-weight:700;color:#fff;margin-top:8px">BANF Membership Acceptance</div>
    <div style="font-size:.85rem;color:rgba(255,255,255,.8);margin-top:4px">${CONFIG.SEASON} Season</div>
  </div>

  <!-- Body -->
  <div style="padding:24px">
    <p style="font-size:1rem;color:#1e293b">Dear <strong>${firstName}</strong>,</p>
    <p style="font-size:.9rem;color:#475569">Thank you for your payment for the BANF ${CONFIG.SEASON} season membership. Below is your recommended membership mapping based on your payment and evite registration.</p>

    ${statusBlock}

    <!-- Member Details -->
    <div style="background:#f8fafc;border-radius:12px;padding:16px;margin:16px 0;border:1px solid #e2e8f0">
      <div style="font-weight:700;color:#1e293b;margin-bottom:8px">📋 Your Details</div>
      <table style="width:100%;font-size:.85rem;border-collapse:collapse">
        <tr><td style="padding:4px 0;color:#64748b;width:40%">Name:</td><td style="font-weight:600">${member.name}</td></tr>
        <tr><td style="padding:4px 0;color:#64748b">Email:</td><td>${member.email}</td></tr>
        <tr><td style="padding:4px 0;color:#64748b">Party Size (Evite):</td><td>${mapping.adults} Adults + ${mapping.kids} Kids</td></tr>
        <tr><td style="padding:4px 0;color:#64748b">Household Type:</td><td style="text-transform:capitalize;font-weight:600">${hhType}</td></tr>
        <tr><td style="padding:4px 0;color:#64748b">Payment Amount:</td><td style="font-weight:700;color:#166534">$${amount}</td></tr>
        <tr><td style="padding:4px 0;color:#64748b">Payment Method:</td><td>${member.paymentMethod || 'Zelle'}</td></tr>
        ${member.memberSince ? `<tr><td style="padding:4px 0;color:#64748b">Member Since:</td><td>${member.memberSince}</td></tr>` : ''}
      </table>
    </div>

    <!-- Recommended Membership -->
    <div style="background:#eff6ff;border-radius:12px;padding:16px;margin:16px 0;border:1px solid #bfdbfe">
      <div style="font-weight:700;color:#1e3a5f;margin-bottom:8px">⭐ Recommended Membership</div>
      <div style="font-size:1.2rem;font-weight:700;color:#1e3a5f">${tierName} — ${hhType}</div>
      <div style="font-size:.9rem;color:#3b82f6;margin-top:4px">$${price} / season</div>
      <div style="font-size:.8rem;color:#64748b;margin-top:4px">${tierData.description || ''}</div>
    </div>

    <!-- Possible Matches -->
    <div style="margin:16px 0">
      <div style="font-weight:700;color:#1e293b;margin-bottom:8px">📊 All Matching Options (select one to confirm)</div>
      <table style="width:100%;font-size:.8rem;border-collapse:collapse;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden">
        <thead><tr style="background:#f1f5f9">
          <th style="padding:8px 12px;text-align:left;font-weight:600">Tier</th>
          <th style="padding:8px 12px;text-align:left;font-weight:600">Household</th>
          <th style="padding:8px 12px;text-align:left;font-weight:600">Price</th>
          <th style="padding:8px 12px;text-align:left;font-weight:600">Match</th>
          <th style="padding:8px 12px;text-align:left;font-weight:600">Score</th>
        </tr></thead>
        <tbody>${altRows}</tbody>
      </table>
    </div>

    <!-- Call to Action -->
    <div style="text-align:center;margin:24px 0">
      <p style="font-size:.9rem;color:#475569;margin-bottom:12px">Please reply to this email to <strong>confirm your membership selection</strong> or let us know if you'd like a different tier.</p>
      <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:12px;font-size:.85rem;color:#166534">
        <strong>To confirm:</strong> Simply reply "CONFIRM" or let us know your preferred tier.
      </div>
    </div>

    ${mapping.balanceDue > 0 ? `
    <!-- Payment Instructions -->
    <div style="background:#fefce8;border:1px solid #fde68a;border-radius:12px;padding:16px;margin:16px 0">
      <div style="font-weight:700;color:#92400e;margin-bottom:8px">💳 Complete Your Payment</div>
      <p style="font-size:.85rem;color:#a16207">To complete your membership, please send the remaining <strong>$${mapping.balanceDue}</strong> via Zelle:</p>
      <div style="background:#fff;border-radius:8px;padding:12px;margin:8px 0;font-size:.85rem">
        <strong>Zelle to:</strong> ${CONFIG.ZELLE_EMAIL}<br>
        <strong>Amount:</strong> $${mapping.balanceDue}<br>
        <strong>Memo:</strong> BANF ${CONFIG.SEASON} Membership - ${member.name}
      </div>
      <p style="font-size:.8rem;color:#78716c">Early Bird deadline: <strong>${CONFIG.EARLY_BIRD_DEADLINE}</strong></p>
    </div>` : ''}
  </div>

  <!-- Footer -->
  <div style="background:#f8fafc;padding:16px 24px;text-align:center;border-top:1px solid #e5e7eb">
    <p style="font-size:.8rem;color:#94a3b8;margin:0">${CONFIG.BANF_ORG}</p>
    <p style="font-size:.75rem;color:#cbd5e1;margin:4px 0 0"><a href="${CONFIG.WEBSITE}" style="color:#3b82f6">jaxbengali.org</a> · User Membership Acceptance Drive</p>
  </div>
</div></body></html>`;
}

function buildUnpaidRequestHTML(member, mapping) {
  const firstName = (member.name || '').split(' ')[0] || 'Member';
  const hhType = mapping.recommendedHousehold || mapping.householdType;

  // Build pricing table for all tiers
  let pricingRows = '';
  for (const [tierKey, tierData] of Object.entries(MEMBERSHIP_PRICING)) {
    const isRec = tierKey === mapping.recommendedTier;
    for (const hhK of ['family', 'couple', 'individual', 'student']) {
      const price = tierData[hhK];
      if (!price) continue;
      const isMatch = isRec && hhK === hhType;
      pricingRows += `<tr style="background:${isMatch ? '#f0fdf4' : 'transparent'}">
        <td style="padding:6px 10px;border-bottom:1px solid #e5e7eb">${isMatch ? '⭐ ' : ''}${tierData.name}</td>
        <td style="padding:6px 10px;border-bottom:1px solid #e5e7eb;text-transform:capitalize">${hhK}</td>
        <td style="padding:6px 10px;border-bottom:1px solid #e5e7eb;font-weight:700;color:#1e3a5f">$${price}</td>
        <td style="padding:6px 10px;border-bottom:1px solid #e5e7eb">${tierData.description}</td>
      </tr>`;
    }
  }

  return `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
<div style="max-width:640px;margin:20px auto;background:#fff;border-radius:16px;box-shadow:0 4px 24px rgba(0,0,0,.08);overflow:hidden">
  <!-- Header -->
  <div style="background:linear-gradient(135deg,#7c3aed,#6366f1);padding:24px;text-align:center">
    <div style="font-size:2rem">🌸</div>
    <div style="font-size:1.3rem;font-weight:700;color:#fff;margin-top:8px">BANF Membership Invitation</div>
    <div style="font-size:.85rem;color:rgba(255,255,255,.8);margin-top:4px">${CONFIG.SEASON} Season — Join Today!</div>
  </div>

  <!-- Body -->
  <div style="padding:24px">
    <p style="font-size:1rem;color:#1e293b">Dear <strong>${firstName}</strong>,</p>
    <p style="font-size:.9rem;color:#475569">Thank you for your RSVP to <strong>${CONFIG.EVENT_NAME}</strong> (${CONFIG.EVENT_DATE}). We'd love to have you as a BANF member for the ${CONFIG.SEASON} season!</p>

    <p style="font-size:.9rem;color:#475569">Based on your evite registration (${mapping.adults} Adults + ${mapping.kids} Kids), we recommend the following membership:</p>

    <!-- Recommended -->
    <div style="background:linear-gradient(135deg,#eff6ff,#f0f9ff);border:2px solid #bfdbfe;border-radius:12px;padding:20px;margin:16px 0;text-align:center">
      <div style="font-size:.8rem;color:#3b82f6;font-weight:600;text-transform:uppercase;letter-spacing:1px">Recommended For You</div>
      <div style="font-size:1.3rem;font-weight:700;color:#1e3a5f;margin-top:8px">${MEMBERSHIP_PRICING[mapping.recommendedTier]?.name || 'M2 Premium Early Bird'}</div>
      <div style="font-size:.9rem;color:#64748b;margin-top:4px;text-transform:capitalize">${hhType} Membership</div>
      <div style="font-size:2rem;font-weight:800;color:#1e3a5f;margin-top:8px">$${mapping.recommendedPrice}</div>
      <div style="font-size:.8rem;color:#94a3b8;margin-top:4px">Early Bird rate — valid until ${CONFIG.EARLY_BIRD_DEADLINE}</div>
    </div>

    <!-- All Options -->
    <div style="margin:20px 0">
      <div style="font-weight:700;color:#1e293b;margin-bottom:8px">📋 All Membership Options</div>
      <table style="width:100%;font-size:.78rem;border-collapse:collapse;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden">
        <thead><tr style="background:#f1f5f9">
          <th style="padding:8px 10px;text-align:left;font-weight:600">Tier</th>
          <th style="padding:8px 10px;text-align:left;font-weight:600">Type</th>
          <th style="padding:8px 10px;text-align:left;font-weight:600">Price</th>
          <th style="padding:8px 10px;text-align:left;font-weight:600;max-width:180px">Includes</th>
        </tr></thead>
        <tbody>${pricingRows}</tbody>
      </table>
    </div>

    <!-- Payment Instructions -->
    <div style="background:#fefce8;border:1px solid #fde68a;border-radius:12px;padding:20px;margin:20px 0">
      <div style="font-weight:700;color:#92400e;margin-bottom:12px;font-size:1.1rem">💳 How to Pay</div>
      <div style="background:#fff;border-radius:8px;padding:16px;border:1px solid #f5f5f4">
        <div style="font-size:.9rem;color:#1c1917">
          <strong>Zelle Payment:</strong><br>
          Send to: <strong style="color:#166534">${CONFIG.ZELLE_EMAIL}</strong><br>
          Memo: <span style="color:#3b82f6">BANF ${CONFIG.SEASON} Membership - ${member.name}</span>
        </div>
      </div>
      <p style="font-size:.8rem;color:#78716c;margin-top:12px">
        🕐 <strong>Future Payment Option:</strong> If you'd like to pay later, reply with your preferred payment date (before ${CONFIG.EARLY_BIRD_DEADLINE} to lock in Early Bird rates).
      </p>
    </div>

    <!-- CTA -->
    <div style="text-align:center;margin:24px 0">
      <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:16px">
        <p style="font-size:.9rem;color:#1e3a5f;margin:0 0 8px">
          <strong>To select your membership:</strong>
        </p>
        <p style="font-size:.85rem;color:#475569;margin:0">
          Reply to this email with your preferred tier (e.g., "M2 Early Bird Family $375") or simply reply "CONFIRM" to accept the recommended option above.
        </p>
      </div>
    </div>
  </div>

  <!-- Footer -->
  <div style="background:#f8fafc;padding:16px 24px;text-align:center;border-top:1px solid #e5e7eb">
    <p style="font-size:.8rem;color:#94a3b8;margin:0">${CONFIG.BANF_ORG}</p>
    <p style="font-size:.75rem;color:#cbd5e1;margin:4px 0 0"><a href="${CONFIG.WEBSITE}" style="color:#3b82f6">jaxbengali.org</a> · User Membership Acceptance Drive</p>
  </div>
</div></body></html>`;
}

// ═══════════════════════════════════════════════════════════════════
// NO-DUPLICATE LOCK FILE
// ═══════════════════════════════════════════════════════════════════

function loadLock() {
  try { return JSON.parse(fs.readFileSync(LOCK_FILE, 'utf8')); } catch (e) { return { sent: {}, driveId: null }; }
}
function saveLock(lock) { fs.writeFileSync(LOCK_FILE, JSON.stringify(lock, null, 2)); }
function isAlreadySent(email, lock) { return !!(lock.sent && lock.sent[email.toLowerCase()]); }
function markSent(email, lock, result) {
  lock.sent[email.toLowerCase()] = {
    sentAt: new Date().toISOString(),
    messageId: result.messageId || '',
    subject: result.subject || '',
    type: result.type || 'unknown'
  };
  saveLock(lock);
}

// ═══════════════════════════════════════════════════════════════════
// CRM UPDATE
// ═══════════════════════════════════════════════════════════════════

function updateCRM(members, mappings) {
  // Load existing CRM
  let crmData = [];
  try {
    const raw = fs.readFileSync(CRM_PATH, 'utf8');
    crmData = JSON.parse(raw);
    if (!Array.isArray(crmData)) crmData = crmData.members || crmData.data || [];
  } catch (e) {
    crmData = [];
  }

  // Create email → mapping lookup
  const mapByEmail = {};
  mappings.forEach(m => { mapByEmail[m.email.toLowerCase()] = m; });

  // Update CRM records
  let updated = 0;
  crmData.forEach(record => {
    const map = mapByEmail[(record.email || '').toLowerCase()];
    if (map) {
      record.membershipDriveStatus = map.isPaid ? (map.exactMatch ? 'auto_approved' : 'pending_confirmation') : 'invitation_sent';
      record.recommendedTier = map.recommendedTier;
      record.recommendedHousehold = map.recommendedHousehold;
      record.recommendedPrice = map.recommendedPrice;
      record.mappingConfidence = map.confidence;
      record.balanceDue = map.balanceDue;
      record.overpayment = map.overpayment;
      record.mappingNote = map.mappingNote;
      record.membershipDriveUpdatedAt = new Date().toISOString();
      updated++;
    }
  });

  // Write back
  fs.writeFileSync(CRM_PATH, JSON.stringify(crmData, null, 2));
  console.log(`  📝 CRM updated: ${updated} records`);
  return updated;
}

// ═══════════════════════════════════════════════════════════════════
// EMAIL TRANSPORT
// ═══════════════════════════════════════════════════════════════════

let _transport = null;
async function getTransport() {
  if (_transport) return _transport;
  _transport = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      type: 'OAuth2',
      user: CONFIG.BANF_EMAIL,
      clientId: GMAIL.CLIENT_ID,
      clientSecret: GMAIL.CLIENT_SECRET,
      refreshToken: GMAIL.REFRESH_TOKEN
    }
  });
  return _transport;
}

async function sendEmail(to, subject, html, type) {
  const transport = await getTransport();
  const info = await transport.sendMail({
    from: `"BANF Membership" <${CONFIG.BANF_EMAIL}>`,
    to: to,
    subject: subject,
    html: html,
    headers: {
      'X-BANF-Drive': 'User-Membership-Acceptance-Drive',
      'X-BANF-Type': type,
      'X-BANF-Season': CONFIG.SEASON,
      'X-BANF-NoDup': 'strict'
    }
  });
  return info;
}

// ═══════════════════════════════════════════════════════════════════
// HTML REPORT GENERATOR
// ═══════════════════════════════════════════════════════════════════

function generateReport(members, mappings) {
  const paid = mappings.filter(m => m.isPaid && !m.isPartial);
  const partial = mappings.filter(m => m.isPartial);
  const unpaid = mappings.filter(m => m.isUnpaid);
  const exact = paid.filter(m => m.exactMatch);
  const totalRevenue = mappings.reduce((s, m) => s + m.amountPaid, 0);

  let rows = '';
  mappings.forEach((m, i) => {
    const tier = MEMBERSHIP_PRICING[m.recommendedTier] || {};
    const statusBadge = m.exactMatch
      ? '<span style="background:#dcfce7;color:#166534;padding:2px 6px;border-radius:4px;font-size:.72rem">✅ Exact Match</span>'
      : m.isPaid && m.balanceDue > 0
        ? '<span style="background:#fef3c7;color:#92400e;padding:2px 6px;border-radius:4px;font-size:.72rem">⚠️ Balance $' + m.balanceDue + '</span>'
        : m.isPaid && m.overpayment > 0
          ? '<span style="background:#dbeafe;color:#1e40af;padding:2px 6px;border-radius:4px;font-size:.72rem">💰 Credit $' + m.overpayment + '</span>'
          : m.isPartial
            ? '<span style="background:#fef3c7;color:#92400e;padding:2px 6px;border-radius:4px;font-size:.72rem">⏳ Partial</span>'
            : '<span style="background:#fee2e2;color:#991b1b;padding:2px 6px;border-radius:4px;font-size:.72rem">❌ Unpaid</span>';

    rows += `<tr>
      <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb">${i + 1}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb"><strong>${m.name}</strong><br><span style="font-size:.72rem;color:#64748b">${m.email}</span></td>
      <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb">${m.adults}A + ${m.kids}K</td>
      <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-transform:capitalize">${m.householdType}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;font-weight:700">${m.amountPaid > 0 ? '$' + m.amountPaid : '—'}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb">${tier.name || m.recommendedTier || '—'}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-transform:capitalize">${m.recommendedHousehold || '—'}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb">$${m.recommendedPrice || 0}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb">${m.confidence}%</td>
      <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb">${statusBadge}</td>
    </tr>`;
  });

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>BANF Membership Acceptance Drive Report</title>
<style>body{margin:0;padding:20px;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif}
.card{background:#fff;border-radius:16px;box-shadow:0 4px 24px rgba(0,0,0,.06);padding:24px;margin-bottom:20px}
.kpi-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:12px;margin:16px 0}
.kpi{background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:16px;text-align:center}
.kpi .num{font-size:2rem;font-weight:800} .kpi .label{font-size:.75rem;color:#64748b}
table{width:100%;border-collapse:collapse;font-size:.82rem}
th{text-align:left;padding:10px 12px;background:#f1f5f9;font-weight:600;font-size:.78rem}
</style></head><body>
<div class="card">
  <h1 style="margin:0;color:#1e293b">🌸 BANF User Membership Acceptance Drive</h1>
  <p style="color:#64748b;margin:8px 0">Season ${CONFIG.SEASON} · Generated ${new Date().toLocaleString()}</p>
  <div class="kpi-grid">
    <div class="kpi"><div class="num" style="color:#1e3a5f">${mappings.length}</div><div class="label">Total Members</div></div>
    <div class="kpi"><div class="num" style="color:#166534">${paid.length}</div><div class="label">Fully Paid</div></div>
    <div class="kpi"><div class="num" style="color:#ca8a04">${partial.length}</div><div class="label">Partial</div></div>
    <div class="kpi"><div class="num" style="color:#dc2626">${unpaid.length}</div><div class="label">Unpaid</div></div>
    <div class="kpi"><div class="num" style="color:#166534">${exact.length}</div><div class="label">Exact Matches</div></div>
    <div class="kpi"><div class="num" style="color:#1e40af">$${totalRevenue}</div><div class="label">Revenue Collected</div></div>
  </div>
</div>

<div class="card">
  <h2 style="margin:0 0 16px">📊 Membership Mapping Details</h2>
  <div style="overflow-x:auto">
    <table>
      <thead><tr>
        <th>#</th><th>Member</th><th>Party</th><th>HH Type</th><th>Paid</th>
        <th>Recommended Tier</th><th>Rec. HH</th><th>Tier Price</th><th>Score</th><th>Status</th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>
  </div>
</div>

<div class="card" style="text-align:center;color:#94a3b8;font-size:.8rem">
  ${CONFIG.BANF_ORG} · User Membership Acceptance Drive · ${new Date().toISOString()}
</div>
</body></html>`;

  fs.writeFileSync(REPORT_FILE, html);
  console.log(`\n📊 Report saved: ${REPORT_FILE}`);
}

// ═══════════════════════════════════════════════════════════════════
// MAIN EXECUTION
// ═══════════════════════════════════════════════════════════════════

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const sendPaid = args.includes('--send-paid');
  const sendUnpaid = args.includes('--send-unpaid');
  const sendAll = args.includes('--send-all');
  const showStatus = args.includes('--status');
  const genReport = args.includes('--report');
  const batchIdx = args.indexOf('--batch');
  const delayIdx = args.indexOf('--delay');
  const batchSize = batchIdx >= 0 ? parseInt(args[batchIdx + 1]) : CONFIG.DEFAULT_BATCH;
  const delay = delayIdx >= 0 ? parseInt(args[delayIdx + 1]) : CONFIG.DEFAULT_DELAY;
  // --target email1,email2,email3  (send ONLY to these addresses)
  const targetIdx = args.indexOf('--target');
  const targetEmails = targetIdx >= 0 ? args[targetIdx + 1].split(',').map(e => e.trim().toLowerCase()) : null;

  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  🌸 BANF USER MEMBERSHIP ACCEPTANCE DRIVE');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`  Season:     ${CONFIG.SEASON}`);
  console.log(`  EB Deadline: ${CONFIG.EARLY_BIRD_DEADLINE}`);
  console.log(`  Mode:       ${dryRun ? '🧪 DRY RUN' : sendAll ? '📬 SEND ALL' : sendPaid ? '📬 SEND PAID' : sendUnpaid ? '📬 SEND UNPAID' : showStatus ? '📊 STATUS' : genReport ? '📊 REPORT' : '🧪 DRY RUN (default)'}`);
  console.log('═══════════════════════════════════════════════════════════════\n');

  // Load members
  const members = loadCRMData();

  // Map all payments to memberships
  console.log('\n🔄 Running payment → membership mapping engine...\n');
  const mappings = members.map(m => mapPaymentToMembership(m));

  // Statistics
  const paid = mappings.filter(m => m.isPaid && !m.isPartial);
  const partial = mappings.filter(m => m.isPartial);
  const unpaid = mappings.filter(m => m.isUnpaid);
  const exact = paid.filter(m => m.exactMatch);

  console.log('  ─── MAPPING RESULTS ─────────────────────────');
  console.log(`  Total Members:    ${mappings.length}`);
  console.log(`  Fully Paid:       ${paid.length}`);
  console.log(`    Exact Match:    ${exact.length} (100% confidence)`);
  console.log(`    Near Match:     ${paid.length - exact.length}`);
  console.log(`  Partial Payment:  ${partial.length}`);
  console.log(`  Unpaid:           ${unpaid.length}`);
  console.log(`  Revenue:          $${mappings.reduce((s, m) => s + m.amountPaid, 0)}`);
  console.log('  ──────────────────────────────────────────────\n');

  // Show all mappings
  console.log('  ─── DETAILED MAPPINGS ──────────────────────────\n');
  mappings.forEach((m, i) => {
    const tier = MEMBERSHIP_PRICING[m.recommendedTier] || {};
    const status = m.exactMatch ? '✅' : m.isPaid && m.balanceDue > 0 ? '⚠️' : m.isPaid ? '💰' : m.isPartial ? '⏳' : '❌';
    console.log(`  ${String(i + 1).padStart(2)}. ${status} ${m.name.padEnd(25)} | ${m.adults}A+${m.kids}K → ${(m.householdType || '').padEnd(10)} | Paid: $${String(m.amountPaid).padStart(5)} | → ${(tier.name || '').padEnd(24)} (${m.recommendedHousehold || ''}) $${m.recommendedPrice} | ${m.confidence}% | ${m.balanceDue > 0 ? 'Due: $' + m.balanceDue : m.overpayment > 0 ? 'Credit: $' + m.overpayment : m.exactMatch ? 'EXACT' : m.isUnpaid ? 'UNPAID' : 'OK'}`);
  });
  console.log('');

  // Generate report if requested or dry-run
  if (genReport || dryRun) {
    generateReport(members, mappings);
  }

  // Show status
  if (showStatus) {
    const lock = loadLock();
    const sentEmails = Object.keys(lock.sent || {});
    console.log(`\n📊 Drive Status:`);
    console.log(`  Emails sent: ${sentEmails.length}`);
    sentEmails.forEach((email, i) => {
      const info = lock.sent[email];
      console.log(`   ${i + 1}. ${email} — ${info.type} at ${info.sentAt}`);
    });
    return;
  }

  // Send emails
  if (dryRun) {
    console.log('\n🧪 DRY RUN — No emails sent. Use --send-paid, --send-unpaid, or --send-all to send.\n');

    // Update CRM with mapping data even in dry run
    updateCRM(members, mappings);
    console.log('\n✅ CRM updated with membership mapping data (dry-run mode).');
    return;
  }

  const lock = loadLock();
  lock.driveId = lock.driveId || ('MAD-' + Date.now().toString(36).toUpperCase());

  // Determine which emails to send
  let toSend = [];
  if (sendAll) {
    toSend = mappings;
  } else if (sendPaid) {
    toSend = mappings.filter(m => m.isPaid);
  } else if (sendUnpaid) {
    toSend = mappings.filter(m => m.isUnpaid);
  }

  // Filter already-sent
  toSend = toSend.filter(m => !isAlreadySent(m.email, lock));

  // Apply --target filter (send ONLY to specific emails)
  if (targetEmails) {
    toSend = toSend.filter(m => targetEmails.includes(m.email.toLowerCase()));
    console.log(`\n🎯 Target filter active: sending to ${targetEmails.join(', ')} only`);
  }

  if (toSend.length === 0) {
    console.log('✅ All targeted emails have already been sent (no-duplicate check passed).');
    return;
  }

  console.log(`\n📬 Sending ${toSend.length} emails (batch: ${batchSize}, delay: ${delay}ms)...\n`);

  let sentCount = 0;
  let failCount = 0;

  for (let i = 0; i < toSend.length; i++) {
    const mapping = toSend[i];
    const member = members.find(m => m.email.toLowerCase() === mapping.email.toLowerCase()) || mapping;

    // Double-check lock
    if (isAlreadySent(mapping.email, lock)) {
      console.log(`  ⏭️ ${mapping.email} — already sent (skipping)`);
      continue;
    }

    try {
      let subject, html, type;
      if (mapping.isPaid || mapping.isPartial) {
        type = mapping.exactMatch ? 'acknowledgement_exact' : mapping.balanceDue > 0 ? 'acknowledgement_balance_due' : 'acknowledgement_overpay';
        subject = `🌸 BANF Membership ${CONFIG.SEASON} — Payment Received${mapping.exactMatch ? ' ✅' : mapping.balanceDue > 0 ? ' — Balance Due' : ''}`;
        html = buildPaidAcknowledgementHTML(member, mapping);
      } else {
        type = 'membership_invitation';
        subject = `🌸 BANF ${CONFIG.SEASON} Membership — Choose Your Plan & Pay Today!`;
        html = buildUnpaidRequestHTML(member, mapping);
      }

      const info = await sendEmail(mapping.email, subject, html, type);
      markSent(mapping.email, lock, { messageId: info.messageId, subject, type });
      sentCount++;
      console.log(`  ✅ ${String(sentCount).padStart(2)}/${toSend.length} ${mapping.email} — ${type}`);

      // Batch delay
      if (i < toSend.length - 1 && (sentCount % batchSize === 0)) {
        console.log(`  ⏸️ Batch pause (${delay}ms)...`);
        await new Promise(r => setTimeout(r, delay));
      } else if (i < toSend.length - 1) {
        await new Promise(r => setTimeout(r, 1500)); // Inter-email delay
      }
    } catch (err) {
      failCount++;
      console.error(`  ❌ ${mapping.email} — FAILED: ${err.message}`);
    }
  }

  // Update CRM
  updateCRM(members, mappings);

  // Generate report
  generateReport(members, mappings);

  // Save status
  const status = {
    driveId: lock.driveId,
    completedAt: new Date().toISOString(),
    totalMembers: mappings.length,
    emailsSent: sentCount,
    emailsFailed: failCount,
    paid: paid.length,
    partial: partial.length,
    unpaid: unpaid.length,
    exactMatches: exact.length,
    revenue: mappings.reduce((s, m) => s + m.amountPaid, 0)
  };
  fs.writeFileSync(STATUS_FILE, JSON.stringify(status, null, 2));

  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('  ✅ MEMBERSHIP ACCEPTANCE DRIVE COMPLETE');
  console.log(`  Sent: ${sentCount} | Failed: ${failCount} | Total: ${mappings.length}`);
  console.log(`  Report: ${REPORT_FILE}`);
  console.log('═══════════════════════════════════════════════════════════════\n');
}

main().catch(err => {
  console.error('❌ Drive failed:', err);
  process.exit(1);
});
