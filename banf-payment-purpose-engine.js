#!/usr/bin/env node
/**
 * ═══════════════════════════════════════════════════════════════════════
 *  BANF Payment Purpose Detection Engine  (v1.0)
 * ═══════════════════════════════════════════════════════════════════════
 *
 *  Intelligent payment purpose classification from email/payment data.
 *  Detects whether a payment is for: membership, sponsorship, donation,
 *  event fee, ad placement, vendor registration, or other purpose.
 *
 *  Uses multi-signal confidence scoring:
 *    1. Amount → membership tier price matching
 *    2. Memo/note keyword analysis
 *    3. Sender history (past memberships, sponsorships)
 *    4. Timing context (membership drive active? event upcoming?)
 *    5. Amount pattern analysis (round numbers → donation?)
 *
 *  Usage:
 *    const { classifyPayment } = require('./banf-payment-purpose-engine');
 *    const result = classifyPayment(payment, memberData, context);
 *
 * ═══════════════════════════════════════════════════════════════════════
 */

const fs = require('fs');
const path = require('path');

// ── Membership Pricing Matrix (FY2026-27) ─────────────────────
const MEMBERSHIP_PRICING = {
    M2_EarlyBird: {
        name: 'M2 Premium Early Bird', code: 'M2EB',
        family: 375, couple: 290, individual: 215, student: 145
    },
    M2_Premium: {
        name: 'M2 Premium', code: 'M2P',
        family: 410, couple: 330, individual: 240, student: 165
    },
    M1_Regular: {
        name: 'M1 Regular', code: 'M1R',
        family: 280, couple: 255, individual: 140, student: 100
    },
    Cultural_Special: {
        name: 'Cultural Special', code: 'CS',
        family: 180, couple: 140, individual: 100, student: 75
    },
    Guest_Pass: {
        name: 'Guest Pass', code: 'GP',
        family: 50, couple: 35, individual: 25, student: 15
    }
};

// ── Known Sponsorship Tiers ──────────────────────────────────
const SPONSORSHIP_TIERS = {
    platinum: { min: 2000, max: Infinity, name: 'Platinum' },
    gold:     { min: 1000, max: 1999, name: 'Gold' },
    silver:   { min: 500, max: 999, name: 'Silver' },
    bronze:   { min: 250, max: 499, name: 'Bronze' },
    friend:   { min: 100, max: 249, name: 'Friend of BANF' }
};

// ── Event Fee Ranges ────────────────────────────────────────
const EVENT_FEE_RANGES = {
    picnic:  { min: 10, max: 50, per: 'person' },
    puja:    { min: 21, max: 151, per: 'family' },
    concert: { min: 15, max: 75, per: 'person' }
};

// ── Keyword Patterns ────────────────────────────────────────
const PURPOSE_KEYWORDS = {
    membership: [
        /member(?:ship)?/i, /\bm[12]\b/i, /annual\s*(?:due|fee)/i,
        /renewal/i, /\bdues?\b/i, /yearly\s*(?:fee|membership)/i,
        /premium\s*(?:early)?/i, /regular\s*member/i, /cultural\s*special/i,
        /\bbanf\s*member/i, /family\s*member/i, /couple\s*member/i,
        /\bfy\s*20\d{2}/i
    ],
    sponsorship: [
        /sponsor(?:ship)?/i, /\bplatinum\b/i, /\bgold\b/i, /\bsilver\b/i,
        /\bbronze\b/i, /corporate/i, /business\s*(?:sponsor|support)/i,
        /\bad\s*sponsor/i, /event\s*sponsor/i
    ],
    donation: [
        /donat(?:e|ion)/i, /\bgift\b/i, /contribut(?:e|ion)/i,
        /\bcharity\b/i, /\bfund\b/i, /\bsupport\b/i, /\bhelp\b/i,
        /\btax\s*deductible/i, /philanthropi/i
    ],
    event_fee: [
        /(?:event|picnic|puja|concert)\s*(?:fee|ticket|entry)/i,
        /\bticket/i, /\bentry\s*fee/i, /\bregistration\s*fee/i,
        /\bbosonto\b/i, /\bdurga\b/i, /\bsaraswati\b/i, /\bkali\b/i,
        /\bpicnic\b/i, /\bconcert\b/i
    ],
    ad_placement: [
        /\bad\b.*\b(?:place|book|reserve)/i, /magazine\s*ad/i,
        /souvenir\s*(?:book|ad|page)/i, /advertisement/i,
        /\bfull\s*page\b/i, /\bhalf\s*page\b/i, /\bquarter\s*page\b/i
    ],
    vendor: [
        /vendor/i, /stall/i, /booth/i, /food\s*vendor/i,
        /vendor\s*(?:fee|registration|deposit)/i
    ]
};

// ═══════════════════════════════════════════════════════════════
// PAYMENT PURPOSE CLASSIFIER
// ═══════════════════════════════════════════════════════════════

/**
 * Classify a payment's purpose with confidence scoring
 *
 * @param {Object} payment - { amount, payerName, payerEmail, memo, source, date }
 * @param {Object} memberData - CRM member record (or null if not matched)
 * @param {Object} context - { membershipDriveActive, upcomingEvent, currentDate }
 * @returns {Object} { purpose, confidence, tier, tierMatch, signals, alternatives }
 */
function classifyPayment(payment, memberData = null, context = {}) {
    const amount = parseFloat(payment.amount) || 0;
    const memo = (payment.memo || '').trim();
    const payerName = payment.payerName || '';
    const payerEmail = payment.payerEmail || '';
    const source = (payment.source || '').toLowerCase();
    const date = payment.date ? new Date(payment.date) : new Date();

    const signals = [];
    const scores = {
        membership: 0,
        sponsorship: 0,
        donation: 0,
        event_fee: 0,
        ad_placement: 0,
        vendor: 0,
        unknown: 0
    };

    // ──────────────────────────────────────────────────────────
    // Signal 1: MEMO KEYWORD ANALYSIS (weight: 40)
    // ──────────────────────────────────────────────────────────
    if (memo) {
        for (const [purpose, patterns] of Object.entries(PURPOSE_KEYWORDS)) {
            for (const pattern of patterns) {
                if (pattern.test(memo)) {
                    scores[purpose] += 40;
                    signals.push({
                        type: 'memo_keyword',
                        purpose,
                        weight: 40,
                        detail: `Memo "${memo}" matches ${purpose} pattern: ${pattern}`
                    });
                    break; // Only count one match per purpose
                }
            }
        }
    }

    // ──────────────────────────────────────────────────────────
    // Signal 2: AMOUNT → MEMBERSHIP TIER MATCHING (weight: 35)
    // ──────────────────────────────────────────────────────────
    const tierMatches = [];
    for (const [tierKey, tier] of Object.entries(MEMBERSHIP_PRICING)) {
        for (const hhType of ['family', 'couple', 'individual', 'student']) {
            const price = tier[hhType];
            if (!price) continue;
            const diff = Math.abs(amount - price);
            if (diff === 0) {
                tierMatches.push({ tierKey, tierName: tier.name, hhType, price, diff: 0, score: 35 });
            } else if (diff <= 10) {
                tierMatches.push({ tierKey, tierName: tier.name, hhType, price, diff, score: 25 });
            } else if (diff <= 25) {
                tierMatches.push({ tierKey, tierName: tier.name, hhType, price, diff, score: 15 });
            }
        }
    }

    if (tierMatches.length > 0) {
        tierMatches.sort((a, b) => b.score - a.score);
        const bestTier = tierMatches[0];
        scores.membership += bestTier.score;

        // Extra boost if household type matches member data
        if (memberData) {
            const memberHH = (memberData.householdType || '').toLowerCase();
            if (memberHH === bestTier.hhType) {
                scores.membership += 10;
                signals.push({
                    type: 'household_match',
                    purpose: 'membership',
                    weight: 10,
                    detail: `Household type "${memberHH}" matches tier ${bestTier.tierName} (${bestTier.hhType})`
                });
            }
        }

        signals.push({
            type: 'amount_tier_match',
            purpose: 'membership',
            weight: bestTier.score,
            detail: `$${amount} ${bestTier.diff === 0 ? 'EXACT match' : `within $${bestTier.diff}`} of ${bestTier.tierName} (${bestTier.hhType}): $${bestTier.price}`
        });
    }

    // ──────────────────────────────────────────────────────────
    // Signal 3: SPONSORSHIP AMOUNT RANGE (weight: 30)
    // ──────────────────────────────────────────────────────────
    for (const [tierKey, tier] of Object.entries(SPONSORSHIP_TIERS)) {
        if (amount >= tier.min && amount <= tier.max) {
            scores.sponsorship += 30;
            signals.push({
                type: 'sponsorship_range',
                purpose: 'sponsorship',
                weight: 30,
                detail: `$${amount} falls in ${tier.name} sponsorship range ($${tier.min}-$${tier.max === Infinity ? '∞' : tier.max})`
            });
            break;
        }
    }

    // ──────────────────────────────────────────────────────────
    // Signal 4: MEMBER HISTORY (weight: 25)
    // ──────────────────────────────────────────────────────────
    if (memberData) {
        // Check if membership already paid this fiscal year
        const fy = getFiscalYear(date);
        const membershipPaid = isMembershipPaidForFY(memberData, fy);

        if (membershipPaid) {
            // Already paid membership → likely sponsorship or donation
            scores.membership -= 20;
            scores.sponsorship += 15;
            scores.donation += 15;
            signals.push({
                type: 'membership_already_paid',
                purpose: 'not_membership',
                weight: 20,
                detail: `Member already has membership for FY${fy} → likely sponsorship or donation`
            });
        } else {
            // No membership this FY → boost membership score
            scores.membership += 15;
            signals.push({
                type: 'membership_unpaid',
                purpose: 'membership',
                weight: 15,
                detail: `No membership recorded for FY${fy} → likely membership payment`
            });
        }

        // Check last year's tier for continuity
        const lastTier = memberData.membershipTier || memberData.membership || '';
        const lastAmount = memberData.lastPaymentAmount || 0;
        if (lastTier && amount > 0) {
            const lastTierKey = findTierKeyByName(lastTier);
            if (lastTierKey) {
                const lastHH = (memberData.householdType || 'individual').toLowerCase();
                const expectedPrice = MEMBERSHIP_PRICING[lastTierKey]?.[lastHH];
                if (expectedPrice && Math.abs(amount - expectedPrice) <= 30) {
                    scores.membership += 10;
                    signals.push({
                        type: 'tier_continuity',
                        purpose: 'membership',
                        weight: 10,
                        detail: `Amount $${amount} close to last year's tier ${lastTier} (${lastHH}): $${expectedPrice}`
                    });
                }
            }
        }

        // Check previous payment amounts
        const prevPayments = memberData.paymentRecords || [];
        const prevMembershipAmounts = prevPayments
            .filter(p => (p.purpose || p.category || '').toLowerCase().includes('member'))
            .map(p => p.amount);
        if (prevMembershipAmounts.includes(amount)) {
            scores.membership += 10;
            signals.push({
                type: 'prev_amount_match',
                purpose: 'membership',
                weight: 10,
                detail: `$${amount} matches a previous membership payment`
            });
        }

        // Check if member is a known sponsor
        const prevSponsor = prevPayments.some(p => (p.purpose || p.category || '').toLowerCase().includes('sponsor'));
        if (prevSponsor && amount >= 100) {
            scores.sponsorship += 10;
            signals.push({
                type: 'known_sponsor',
                purpose: 'sponsorship',
                weight: 10,
                detail: `Member has prior sponsorship history`
            });
        }
    }

    // ──────────────────────────────────────────────────────────
    // Signal 5: TIMING CONTEXT (weight: 15)
    // ──────────────────────────────────────────────────────────
    if (context.membershipDriveActive) {
        scores.membership += 15;
        signals.push({
            type: 'membership_drive_active',
            purpose: 'membership',
            weight: 15,
            detail: 'Membership drive is currently active'
        });
    }

    if (context.upcomingEvent) {
        scores.event_fee += 10;
        signals.push({
            type: 'upcoming_event',
            purpose: 'event_fee',
            weight: 10,
            detail: `Upcoming event: ${context.upcomingEvent}`
        });
    }

    // ──────────────────────────────────────────────────────────
    // Signal 6: AMOUNT PATTERN ANALYSIS (weight: 10)
    // ──────────────────────────────────────────────────────────
    // Round numbers (100, 200, 500, 1000) → more likely donation
    if (amount >= 50 && amount % 50 === 0 && !tierMatches.some(t => t.diff === 0)) {
        scores.donation += 8;
        signals.push({
            type: 'round_amount',
            purpose: 'donation',
            weight: 8,
            detail: `$${amount} is a round number — possibly a donation`
        });
    }

    // Very small amounts → event fee or guest pass
    if (amount > 0 && amount <= 50) {
        scores.event_fee += 5;
        signals.push({
            type: 'small_amount',
            purpose: 'event_fee',
            weight: 5,
            detail: `$${amount} is small — possibly event fee or guest pass`
        });
    }

    // Very large amounts → sponsorship
    if (amount >= 500 && !tierMatches.some(t => t.diff === 0)) {
        scores.sponsorship += 15;
        signals.push({
            type: 'large_amount',
            purpose: 'sponsorship',
            weight: 15,
            detail: `$${amount} is high — likely sponsorship`
        });
    }

    // ──────────────────────────────────────────────────────────
    // Signal 7: SOURCE CONTEXT (weight: 5)
    // ──────────────────────────────────────────────────────────
    if (source === 'zelle' || source === 'zelle_subject') {
        // Zelle is common for membership + sponsorship
        if (amount >= 100 && amount <= 500) {
            scores.membership += 5;
        }
    }

    // ──────────────────────────────────────────────────────────
    // RESOLVE: Pick highest-scoring purpose
    // ──────────────────────────────────────────────────────────
    const sorted = Object.entries(scores)
        .filter(([k]) => k !== 'unknown')
        .sort(([, a], [, b]) => b - a);

    const bestPurpose = sorted[0]?.[1] > 0 ? sorted[0][0] : 'unknown';
    const bestScore = sorted[0]?.[1] || 0;
    const totalSignalWeight = signals.reduce((s, sig) => s + Math.abs(sig.weight), 0);
    const confidence = totalSignalWeight > 0
        ? Math.min(Math.round((bestScore / Math.max(totalSignalWeight, 1)) * 100), 99)
        : 0;

    // Build alternatives (other purposes with scores > 0)
    const alternatives = sorted
        .filter(([k, v]) => k !== bestPurpose && v > 0)
        .map(([purpose, score]) => ({
            purpose,
            score,
            confidence: totalSignalWeight > 0
                ? Math.min(Math.round((score / Math.max(totalSignalWeight, 1)) * 100), 99)
                : 0
        }));

    // Best tier match (for membership)
    const bestTierMatch = tierMatches.length > 0 ? tierMatches[0] : null;

    return {
        purpose: bestPurpose,
        confidence,
        amount,
        payerName,
        payerEmail,
        memo,
        source,
        date: date.toISOString(),
        tierMatch: bestTierMatch,
        allTierMatches: tierMatches.slice(0, 5),
        signals,
        scores,
        alternatives,
        membershipAlreadyPaid: memberData ? isMembershipPaidForFY(memberData, getFiscalYear(date)) : null,
        memberData: memberData ? {
            email: memberData.email,
            name: memberData.displayName || `${memberData.firstName} ${memberData.lastName}`,
            householdType: memberData.householdType,
            lastTier: memberData.membershipTier || memberData.membership,
            familyId: memberData.familyId
        } : null
    };
}

// ═══════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════

function getFiscalYear(date) {
    // BANF fiscal year: April 1 – March 31
    const d = date instanceof Date ? date : new Date(date);
    const month = d.getMonth(); // 0-indexed
    const year = d.getFullYear();
    return month >= 3 ? year : year - 1; // April(3) onwards = current FY
}

function isMembershipPaidForFY(memberData, fy) {
    // Check membershipYears array
    const years = memberData.membershipYears || [];
    if (years.includes(fy) || years.includes(String(fy))) return true;

    // Check payment records
    const payments = memberData.paymentRecords || [];
    return payments.some(p => {
        const pPurpose = (p.purpose || p.category || '').toLowerCase();
        if (!pPurpose.includes('member')) return false;
        const pDate = p.date || p.paymentDate;
        if (!pDate) return false;
        return getFiscalYear(new Date(pDate)) === fy;
    });
}

function findTierKeyByName(tierName) {
    const tn = (tierName || '').toLowerCase();
    if (tn.includes('m2') && tn.includes('early')) return 'M2_EarlyBird';
    if (tn.includes('m2') || tn.includes('premium')) return 'M2_Premium';
    if (tn.includes('m1') || tn.includes('regular')) return 'M1_Regular';
    if (tn.includes('cultural')) return 'Cultural_Special';
    if (tn.includes('guest')) return 'Guest_Pass';
    return null;
}

/**
 * Generate a human-readable payment acknowledgment message
 */
function generatePaymentAcknowledgment(classification) {
    const { purpose, confidence, amount, tierMatch } = classification;
    const payer = classification.payerName || classification.payerEmail || 'Member';

    if (purpose === 'membership' && tierMatch) {
        const matchNote = tierMatch.diff === 0
            ? `exact match for ${tierMatch.tierName} (${tierMatch.hhType})`
            : `close to ${tierMatch.tierName} (${tierMatch.hhType}): $${tierMatch.price}`;
        return `Payment of $${amount} received from ${payer}. ` +
               `Classified as: MEMBERSHIP — ${matchNote} (${confidence}% confidence).`;
    }

    if (purpose === 'sponsorship') {
        const tier = Object.entries(SPONSORSHIP_TIERS).find(([, t]) => amount >= t.min && amount <= t.max);
        const tierName = tier ? tier[1].name : 'Custom';
        return `Payment of $${amount} received from ${payer}. ` +
               `Classified as: SPONSORSHIP (${tierName}) — ${confidence}% confidence.`;
    }

    if (purpose === 'donation') {
        return `Payment of $${amount} received from ${payer}. ` +
               `Classified as: DONATION — ${confidence}% confidence.`;
    }

    return `Payment of $${amount} received from ${payer}. ` +
           `Classified as: ${purpose.toUpperCase()} — ${confidence}% confidence.`;
}

// ═══════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════

module.exports = {
    classifyPayment,
    generatePaymentAcknowledgment,
    MEMBERSHIP_PRICING,
    SPONSORSHIP_TIERS,
    PURPOSE_KEYWORDS,
    getFiscalYear,
    isMembershipPaidForFY,
    findTierKeyByName
};
