/**
 * BANF RAG Chatbot — Comprehensive Test Harness
 * Tests 25+ queries across payment, attendance, events, membership, 
 * year-wise comparisons, EC, finance, CRM, procurement, and email policies.
 * Generates a detailed HTML validation report.
 *
 * Run: node banf-rag-chatbot-test.js
 */

const fs = require('fs');
const path = require('path');

// ═══════════════════════════════════════════════════════
//  1. REPLICATE THE RAG KNOWLEDGE BASE (from banf-portal-features.js)
// ═══════════════════════════════════════════════════════

const documents = [];

// 2024-25 History
documents.push({id:'kb-2024-history',year:'2024-25',category:'history',title:'BANF 2024-25 Activities',
  text:'Bengali Association of North Florida (BANF) 2024-25 year. Events held: Durga Puja (Oct 2024), Kali Puja + Food (Nov 2024), Saraswati Puja (Feb 2025), Holi (Mar 2025), Pohela Boishakh (Apr 2025). EC members for 2024-25 included founding members. Membership categories: EB-Family ($340), EB-Single ($175), EB-Student ($50), NB-Event ($30). Total active members: approximately 120.'});

documents.push({id:'kb-2024-holi',year:'2024-25',category:'event',title:'Holi 2025 Event Report',
  text:'Holi 2025 was held March 15, 2025 at JCCL Community Center, Jacksonville FL. Attendance: 85 adults, 32 kids (117 total). 65 families attended. New member signups at event: 12. Membership paid at event: 8 families. Food: Indian buffet catered by Swad Restaurant. Budget: $2,800. Revenue from event tickets: $3,200. Net surplus: $400. Activities: Color play, music, dance, potluck contributions.'});

documents.push({id:'kb-2024-durga',year:'2024-25',category:'event',title:'Durga Puja 2024 Report',
  text:'Durga Puja 2024 held October 12-13, 2024 at JCCL Community Center. 2-day event. Day 1: Saptami Puja + Cultural Program. Day 2: Ashtami Puja + Pushpanjali + Sandhi Puja + Dhunuchi Nach. Attendance: 150 adults, 65 kids (215 total). 92 families. Priest: Pandit Subhabrata. Budget: $8,500. Sponsorship collected: $4,200. Member contributions: $5,800. Net: +$1,500. Largest BANF event of the year.'});

// 2025-26 Year
documents.push({id:'kb-2025-membership',year:'2025-26',category:'membership',title:'BANF Membership 2025-26',
  text:'BANF Membership 2025-26. Total registered members: 168 (Wix CRM). Active paid members: 74. Membership tiers: M1 Standard EB-Family ($340 - early bird family), M1 Standard EB-Single ($175), M2 Premium EB-Family ($375 - includes all events), M2 Premium EB-Single ($200), Student ($50), NB-Event Only ($30/event). Payment methods: Zelle (primary), PayPal, cash at events. Membership year: July 1 to June 30. Early bird deadline: August 31.'});

documents.push({id:'kb-2025-ec',year:'2025-26',category:'organization',title:'EC Members 2026-2028',
  text:'BANF Executive Committee 2026-2028 (elected). President: Dr. Ranadhir Ghosh (ranadhir.ghosh@gmail.com, IT Lead). Vice President: Partha Mukhopadhyay (mukhopadhyay.partha@gmail.com). Treasurer: Amit Chandak (amit.everywhere@gmail.com). General Secretary: Rajanya Ghosh (rajanya.ghosh@gmail.com). Cultural Secretary: Dr. Moumita Ghosh (moumita.mukherje@gmail.com). Food Coordinator: Soumyajit Dutta/Banty (duttasoumyajit86@gmail.com). Event Coordinator: Dr. Sumanta Ghosh (sumo475@gmail.com). Puja Coordinator: Rwiti Chowdhury (rwitichoudhury@gmail.com). Term: 2 years (2026-2028).'});

documents.push({id:'kb-2025-kali',year:'2025-26',category:'event',title:'Kali Puja + Food 2025',
  text:'Kali Puja + Food event held November 2025 at JCCL Community Center. Combined religious puja with community dinner. Attendance: 95 adults, 38 kids (133 total). 72 families participated. Puja arrangements by Rwiti Chowdhury. Food coordinated by Soumyajit Dutta (Banty). Menu: Traditional Bengali thali with khichuri, begun bhaja, chutney, payesh. Budget: $3,200.'});

// 2026-27 Year
documents.push({id:'kb-2026-bosonto',year:'2026-27',category:'event',title:'Bosonto Utsob 2026',
  text:'Bosonto Utsob 2026 (Spring Festival). Date: March 22, 2026. Venue: JCCL Community Center, Jacksonville FL. Type: Membership + Cultural Event. Evite responses: 71 total — 45 Yes (adults), 22 kids, 4 No. Pipeline: 56 members processed, 6 paid ($2,490 via Zelle), 29 unpaid-yes (RSVP but no payment), 22 declined. Expected attendance: 120-150. Membership category for Bosonto: M2 Premium EB-Family $375, M2 Premium EB-Single $200. This is the first event of FY2026-27. Catering: TBD by Food Coordinator. Cultural program: TBD by Cultural Secretary.'});

documents.push({id:'kb-2026-membership',year:'2026-27',category:'membership',title:'BANF Membership 2026-27',
  text:'BANF Membership 2026-27 (current year). Total members in CRM: 182 across 129 families. Membership tiers for 2026-27: M1 Standard EB-Family ($350), M1 Standard EB-Single ($185), M2 Premium EB-Family ($375 - all events included), M2 Premium EB-Single ($200), M3 Lifetime Family ($1,500), Student ($60), NB-Event Only ($35/event). Early bird discount: $25 off if paid by Aug 31, 2026. Payment: Zelle to banf.treasurer@gmail.com, PayPal, or cash at events. 6 members already paid for 2026-27 via Bosonto collection.'});

documents.push({id:'kb-2026-upcoming',year:'2026-27',category:'events',title:'BANF Upcoming Events 2026-27',
  text:'BANF Event Calendar 2026-27: 1) Bosonto Utsob (Mar 22, 2026) - Spring Festival, 2) Pohela Boishakh (Apr 14, 2026) - Bengali New Year, 3) Rabindra-Nazrul Jayanti (May 2026), 4) Summer Picnic (Jun 2026), 5) Durga Puja (Oct 2026) - Biggest event, 6) Kali Puja + Food (Nov 2026), 7) Saraswati Puja (Feb 2027), 8) Holi (Mar 2027), 9) AGM - Annual General Meeting (Jan 2027). Each event requires: procurement budget approval, venue booking, food coordination, cultural program, puja arrangements (if applicable), attendance tracking via QR codes.'});

documents.push({id:'kb-2026-finance',year:'2026-27',category:'finance',title:'BANF Financial Summary',
  text:'BANF Financial Overview. Total revenue tracked (all years): $17,372.50. 2025-26 membership dues collected: approximately $12,000. Bosonto 2026 collections so far: $2,490 (6 families). Payment methods accepted: Zelle (preferred), PayPal, cash. Treasurer: Amit Chandak. Budget approval workflow: Submit request → Treasurer review (24h) → VP escalation → President escalation → Purchase → Receipt upload → Reimbursement. Average event budget: $2,500-$8,500 depending on event size.'});

documents.push({id:'kb-2026-crm',year:'2026-27',category:'data',title:'CRM Data Overview',
  text:'BANF CRM contains 182 unique members from 5 reconciled data sources: Wix CRM (168), Google Contacts (165), membership XLSX (74 with payments), Bosonto pipeline (56), email audit (167). 129 family groups identified. Data quality: 36 members have phone numbers (20%), 74 have payment records (41%), 172 have family groupings. 1064 data issues flagged: 286 membership, 218 payment, 167 profile, 155 family, 141 communication. EC members verified: 8 of 8 in CRM.'});

documents.push({id:'kb-procurement',year:'general',category:'process',title:'Procurement & Reimbursement Process',
  text:'BANF Procurement Workflow: 1) Any EC member can submit a purchase request with description, budget amount, category, and needed-by date. 2) Treasurer reviews within 24 hours. 3) If not approved in 24h, escalates to VP. 4) If VP does not approve, escalates to President. 5) Once approved, requester makes the purchase and uploads receipt (photo/PDF). 6) Treasurer processes reimbursement via Zelle. Categories: Event Supplies, Food/Catering, Venue Rental, Decorations, Technology, Marketing/Printing, Cultural Program, Administrative, Other. All requests tracked with full audit trail.'});

documents.push({id:'kb-email-dedup-policy',year:'general',category:'process',title:'Communication Agent Email Dedup Policy',
  text:'BANF Communication Agent Email Guard Policy (mandatory for all outbound emails). RULE 1: Every outbound email is logged to persistent localStorage (EMAIL_SENT_LOG key: banf_email_sent_log, 90-day retention). RULE 2: Before sending ANY email, the system checks if the SAME recipient + SAME purpose email was already sent within the cooldown window. If duplicate detected, the email is BLOCKED unless an explicit override is provided. RULE 3: Cooldown periods — EC reminders: 48 hours, EC batch reminders: 48 hours, Drive invitations: 7 days, Role invitations: 7 days, Payment reminders: 72 hours, General emails: 24 hours. RULE 4: Override requires the workflow originator to provide a written reason (minimum 10 characters) explaining why the duplicate send is needed. RULE 5: All blocking decisions, overrides, sends, and failures are logged for full audit transparency. RULE 6: Email log entries include recipient, purpose, subject, timestamp, operator identity, and override reason if applicable. RULE 7: Data privacy — emails only sent to members with emailOptIn=true. All emails include unsubscribe link, data privacy notice, purpose limitation disclosure, and right to erasure notice. The communicationAgentSend() function is the SINGLE entry point for all email sends. No email path may bypass the guard.'});

// ═══════════════════════════════════════════════════════
//  2. REPLICATE THE TF-IDF RETRIEVAL ENGINE
// ═══════════════════════════════════════════════════════

let vectors = [];

function buildIndex() {
  vectors = documents.map(function(doc) {
    const text = (doc.title + ' ' + doc.text).toLowerCase();
    const words = text.split(/\W+/).filter(w => w.length > 2);
    const tf = {};
    words.forEach(w => { tf[w] = (tf[w]||0) + 1; });
    const max = Math.max(...Object.values(tf));
    Object.keys(tf).forEach(k => { tf[k] /= max; });
    return { docId: doc.id, tf, wordCount: words.length };
  });
}

function retrieve(query, topK = 5) {
  const stopwords = {the:1,and:1,for:1,are:1,but:1,not:1,you:1,all:1,can:1,her:1,was:1,one:1,our:1,out:1,has:1,had:1,hot:1,how:1,its:1,let:1,may:1,who:1,did:1,get:1,got:1,him:1,his:1,she:1,too:1,use:1,what:1,when:1,where:1,which:1,with:1,will:1,from:1,this:1,that:1,they:1,been:1,have:1,many:1,some:1,them:1,than:1,each:1,make:1,does:1,into:1,also:1,about:1,these:1,there:1,their:1,other:1,after:1,most:1,very:1,just:1,over:1,such:1,much:1,only:1};
  const qWords = query.toLowerCase().split(/\W+/).filter(w => w.length > 2 && !stopwords[w]);
  const scores = vectors.map((v, idx) => {
    let score = 0;
    qWords.forEach(qw => {
      if (v.tf[qw]) score += v.tf[qw] * 3;
      if (qw.length >= 4) {
        Object.keys(v.tf).forEach(dw => {
          if (dw !== qw && dw.length >= 4 && (dw.indexOf(qw) >= 0 || qw.indexOf(dw) >= 0)) score += v.tf[dw] * 0.3;
        });
      }
    });
    return { idx, score };
  });
  scores.sort((a, b) => b.score - a.score);
  const results = [];
  for (let i = 0; i < Math.min(topK, scores.length); i++) {
    if (scores[i].score > 0) {
      results.push({ document: documents[scores[i].idx], score: scores[i].score });
    }
  }
  return results;
}

function localFallback(query, retrieved) {
  if (retrieved.length === 0) return 'I don\'t have enough information to answer that question. Please try asking about BANF events, membership, EC members, or finances.';
  let ans = 'Based on BANF records:\n\n';
  retrieved.forEach(r => {
    ans += '**' + r.document.title + '** (' + r.document.year + '):\n' + r.document.text.substring(0, 300) + '...\n\n';
  });
  return ans;
}

// ═══════════════════════════════════════════════════════
//  3. VALIDATION ENGINE — check factual accuracy
// ═══════════════════════════════════════════════════════

/**
 * Each test query has:
 *  - query: the natural language question
 *  - category: topic grouping for the report
 *  - complexity: simple | moderate | complex
 *  - expectedKeywords: terms that MUST appear in the retrieved context or answer
 *  - expectedDocIds: KB doc IDs that should rank in top results
 *  - factCheck: a function(answer, sources) => {pass, detail}
 */
const TEST_QUERIES = [
  // ──── CATEGORY 1: PAYMENT & MEMBERSHIP DUES ────
  {
    id: 'Q01',
    query: 'How much is the EB-Family membership for 2025-26?',
    category: 'Payment',
    complexity: 'simple',
    expectedDocIds: ['kb-2025-membership'],
    expectedKeywords: ['340', 'family'],
    factCheck: (ans, srcs) => {
      const has340 = ans.includes('340') || ans.includes('$340');
      const has375 = ans.includes('375') || ans.includes('$375');
      return { pass: has340 || has375, detail: has340 ? 'Correctly retrieves $340 EB-Family standard' : (has375 ? 'Shows $375 M2 Premium variant' : 'Missing price info') };
    }
  },
  {
    id: 'Q02',
    query: 'What membership tiers are available for 2026-27 and what are their prices?',
    category: 'Payment',
    complexity: 'moderate',
    expectedDocIds: ['kb-2026-membership'],
    expectedKeywords: ['350', '185', '375', '200', '1500', '60', '35'],
    factCheck: (ans, srcs) => {
      const prices = ['350', '185', '375', '200', '1500'];
      const found = prices.filter(p => ans.includes(p));
      return { pass: found.length >= 3, detail: `Found ${found.length}/5 tier prices: ${found.join(', ')}` };
    }
  },
  {
    id: 'Q03',
    query: 'How many members have paid for Bosonto Utsob 2026 and how much was collected?',
    category: 'Payment',
    complexity: 'moderate',
    expectedDocIds: ['kb-2026-bosonto', 'kb-2026-finance'],
    expectedKeywords: ['2490', '6', 'zelle'],
    factCheck: (ans, srcs) => {
      const has6 = ans.includes('6 paid') || ans.includes('6 families') || ans.includes('6 members');
      const has2490 = ans.includes('2,490') || ans.includes('2490');
      return { pass: has6 || has2490, detail: `6 paid: ${has6}, $2490: ${has2490}` };
    }
  },
  {
    id: 'Q04',
    query: 'What is the early bird discount and deadline for 2026-27 membership?',
    category: 'Payment',
    complexity: 'simple',
    expectedDocIds: ['kb-2026-membership'],
    expectedKeywords: ['25', 'aug', '31'],
    factCheck: (ans, srcs) => {
      const has25 = ans.includes('25');
      const hasAug = ans.toLowerCase().includes('aug') || ans.toLowerCase().includes('august');
      return { pass: has25 && hasAug, detail: `$25 discount: ${has25}, August deadline: ${hasAug}` };
    }
  },
  {
    id: 'Q05',
    query: 'What payment methods does BANF accept?',
    category: 'Payment',
    complexity: 'simple',
    expectedDocIds: ['kb-2026-membership', 'kb-2026-finance'],
    expectedKeywords: ['zelle', 'paypal', 'cash'],
    factCheck: (ans, srcs) => {
      const al = ans.toLowerCase();
      const methods = ['zelle', 'paypal', 'cash'].filter(m => al.includes(m));
      return { pass: methods.length >= 2, detail: `Found ${methods.length}/3 payment methods: ${methods.join(', ')}` };
    }
  },

  // ──── CATEGORY 2: EVENT ATTENDANCE ────
  {
    id: 'Q06',
    query: 'How many people attended Durga Puja 2024?',
    category: 'Attendance',
    complexity: 'simple',
    expectedDocIds: ['kb-2024-durga'],
    expectedKeywords: ['150', '65', '215', '92'],
    factCheck: (ans, srcs) => {
      const has215 = ans.includes('215');
      const has150 = ans.includes('150');
      return { pass: has215 || has150, detail: `215 total: ${has215}, 150 adults: ${has150}` };
    }
  },
  {
    id: 'Q07',
    query: 'What was the attendance at Holi 2025 event?',
    category: 'Attendance',
    complexity: 'simple',
    expectedDocIds: ['kb-2024-holi'],
    expectedKeywords: ['85', '32', '117', '65'],
    factCheck: (ans, srcs) => {
      const has117 = ans.includes('117');
      const has85 = ans.includes('85');
      return { pass: has117 || has85, detail: `117 total: ${has117}, 85 adults: ${has85}` };
    }
  },
  {
    id: 'Q08',
    query: 'How many families attended the Kali Puja 2025?',
    category: 'Attendance',
    complexity: 'simple',
    expectedDocIds: ['kb-2025-kali'],
    expectedKeywords: ['72', 'families'],
    factCheck: (ans, srcs) => {
      const has72 = ans.includes('72');
      return { pass: has72, detail: `72 families: ${has72}` };
    }
  },
  {
    id: 'Q09',
    query: 'How many new members signed up at Holi 2025?',
    category: 'Attendance',
    complexity: 'moderate',
    expectedDocIds: ['kb-2024-holi'],
    expectedKeywords: ['12', 'new', 'signups'],
    factCheck: (ans, srcs) => {
      const has12 = ans.includes('12');
      return { pass: has12, detail: `12 new signups: ${has12}` };
    }
  },
  {
    id: 'Q10',
    query: 'What is the expected attendance for Bosonto Utsob 2026?',
    category: 'Attendance',
    complexity: 'moderate',
    expectedDocIds: ['kb-2026-bosonto'],
    expectedKeywords: ['120', '150'],
    factCheck: (ans, srcs) => {
      const has120 = ans.includes('120');
      const has150 = ans.includes('150');
      return { pass: has120 || has150, detail: `120-150 expected: 120=${has120}, 150=${has150}` };
    }
  },

  // ──── CATEGORY 3: YEAR-WISE COMPARISON ────
  {
    id: 'Q11',
    query: 'Compare the membership count between 2025-26 and 2026-27',
    category: 'Year Comparison',
    complexity: 'complex',
    expectedDocIds: ['kb-2025-membership', 'kb-2026-membership'],
    expectedKeywords: ['168', '182'],
    factCheck: (ans, srcs) => {
      const docIds = srcs.map(s => s.document.id);
      const hasBoth = docIds.includes('kb-2025-membership') && docIds.includes('kb-2026-membership');
      const has168 = ans.includes('168');
      const has182 = ans.includes('182');
      return { pass: hasBoth || (has168 && has182), detail: `Both years retrieved: ${hasBoth}, 168: ${has168}, 182: ${has182}` };
    }
  },
  {
    id: 'Q12',
    query: 'How did membership prices change from 2024-25 to 2026-27?',
    category: 'Year Comparison',
    complexity: 'complex',
    expectedDocIds: ['kb-2024-history', 'kb-2026-membership'],
    expectedKeywords: ['340', '350'],
    factCheck: (ans, srcs) => {
      const has340 = ans.includes('340');
      const has350 = ans.includes('350');
      return { pass: has340 || has350, detail: `2024-25 $340: ${has340}, 2026-27 $350: ${has350}` };
    }
  },
  {
    id: 'Q13',
    query: 'Compare Durga Puja 2024 attendance with Kali Puja 2025 attendance',
    category: 'Year Comparison',
    complexity: 'complex',
    expectedDocIds: ['kb-2024-durga', 'kb-2025-kali'],
    expectedKeywords: ['215', '133', 'durga', 'kali'],
    factCheck: (ans, srcs) => {
      const docIds = srcs.map(s => s.document.id);
      const hasDurga = docIds.includes('kb-2024-durga');
      const hasKali = docIds.includes('kb-2025-kali');
      return { pass: hasDurga && hasKali, detail: `Durga doc: ${hasDurga}, Kali doc: ${hasKali}` };
    }
  },
  {
    id: 'Q14',
    query: 'What events happened in 2024-25 vs what is planned for 2026-27?',
    category: 'Year Comparison',
    complexity: 'complex',
    expectedDocIds: ['kb-2024-history', 'kb-2026-upcoming'],
    expectedKeywords: ['durga', 'holi', 'bosonto'],
    factCheck: (ans, srcs) => {
      const docIds = srcs.map(s => s.document.id);
      const hasHistory = docIds.includes('kb-2024-history');
      const hasUpcoming = docIds.includes('kb-2026-upcoming');
      return { pass: hasHistory && hasUpcoming, detail: `2024-25 history: ${hasHistory}, 2026-27 calendar: ${hasUpcoming}` };
    }
  },
  {
    id: 'Q15',
    query: 'How did the budget and revenue compare between Holi 2025 and Durga Puja 2024?',
    category: 'Year Comparison',
    complexity: 'complex',
    expectedDocIds: ['kb-2024-holi', 'kb-2024-durga'],
    expectedKeywords: ['2800', '8500'],
    factCheck: (ans, srcs) => {
      const docIds = srcs.map(s => s.document.id);
      const hasHoli = docIds.includes('kb-2024-holi');
      const hasDurga = docIds.includes('kb-2024-durga');
      return { pass: hasHoli && hasDurga, detail: `Holi doc: ${hasHoli}, Durga doc: ${hasDurga}` };
    }
  },

  // ──── CATEGORY 4: PROGRAMS & EVENTS ────
  {
    id: 'Q16',
    query: 'What cultural programs were held during Durga Puja 2024?',
    category: 'Programs',
    complexity: 'moderate',
    expectedDocIds: ['kb-2024-durga'],
    expectedKeywords: ['saptami', 'ashtami', 'pushpanjali', 'dhunuchi'],
    factCheck: (ans, srcs) => {
      const al = ans.toLowerCase();
      const terms = ['saptami', 'ashtami', 'pushpanjali', 'dhunuchi'].filter(t => al.includes(t));
      return { pass: terms.length >= 2, detail: `Found ${terms.length}/4 puja elements: ${terms.join(', ')}` };
    }
  },
  {
    id: 'Q17',
    query: 'What food was served at Kali Puja 2025?',
    category: 'Programs',
    complexity: 'simple',
    expectedDocIds: ['kb-2025-kali'],
    expectedKeywords: ['khichuri', 'begun', 'payesh'],
    factCheck: (ans, srcs) => {
      const al = ans.toLowerCase();
      const items = ['khichuri', 'begun', 'payesh', 'chutney'].filter(t => al.includes(t));
      return { pass: items.length >= 2, detail: `Found ${items.length}/4 food items: ${items.join(', ')}` };
    }
  },
  {
    id: 'Q18',
    query: 'When is Durga Puja 2026 and what events come after it?',
    category: 'Programs',
    complexity: 'moderate',
    expectedDocIds: ['kb-2026-upcoming'],
    expectedKeywords: ['oct', '2026', 'kali', 'saraswati'],
    factCheck: (ans, srcs) => {
      const al = ans.toLowerCase();
      const hasDurga = al.includes('oct') || al.includes('october');
      const hasKali = al.includes('kali') || al.includes('november') || al.includes('nov');
      return { pass: hasDurga, detail: `Durga Oct date: ${hasDurga}, Kali after: ${hasKali}` };
    }
  },
  {
    id: 'Q19',
    query: 'Where is JCCL Community Center where BANF holds Durga Puja and Holi events?',
    category: 'Programs',
    complexity: 'simple',
    expectedDocIds: ['kb-2024-holi', 'kb-2024-durga', 'kb-2026-bosonto'],
    expectedKeywords: ['jccl', 'community', 'jacksonville'],
    factCheck: (ans, srcs) => {
      const al = ans.toLowerCase();
      return { pass: al.includes('jccl') || al.includes('community center') || al.includes('jacksonville'), detail: `JCCL: ${al.includes('jccl')}, Community Center: ${al.includes('community center')}, Jacksonville: ${al.includes('jacksonville')}` };
    }
  },

  // ──── CATEGORY 5: EC MEMBERS & ORGANIZATION ────
  {
    id: 'Q20',
    query: 'Who is the BANF EC President and Vice President for 2026-2028?',
    category: 'EC / Organization',
    complexity: 'simple',
    expectedDocIds: ['kb-2025-ec'],
    expectedKeywords: ['ranadhir', 'ghosh', 'president'],
    factCheck: (ans, srcs) => {
      const al = ans.toLowerCase();
      return { pass: al.includes('ranadhir') || al.includes('president'), detail: `Dr. Ranadhir Ghosh: ${al.includes('ranadhir')}, President mention: ${al.includes('president')}` };
    }
  },
  {
    id: 'Q21',
    query: 'Who is the BANF EC Treasurer Amit Chandak and what is the email for payments?',
    category: 'EC / Organization',
    complexity: 'simple',
    expectedDocIds: ['kb-2025-ec', 'kb-2026-finance'],
    expectedKeywords: ['amit', 'chandak', 'treasurer'],
    factCheck: (ans, srcs) => {
      const al = ans.toLowerCase();
      return { pass: al.includes('amit') || al.includes('treasurer'), detail: `Amit mention: ${al.includes('amit')}, Treasurer: ${al.includes('treasurer')}, Chandak: ${al.includes('chandak')}` };
    }
  },
  {
    id: 'Q22',
    query: 'List all EC members and their roles for 2026-2028',
    category: 'EC / Organization',
    complexity: 'moderate',
    expectedDocIds: ['kb-2025-ec'],
    expectedKeywords: ['president', 'vice', 'treasurer', 'secretary', 'coordinator'],
    factCheck: (ans, srcs) => {
      const al = ans.toLowerCase();
      const roles = ['president', 'treasurer', 'secretary', 'coordinator'].filter(r => al.includes(r));
      return { pass: roles.length >= 3, detail: `Found ${roles.length}/4 role mentions: ${roles.join(', ')}` };
    }
  },

  // ──── CATEGORY 6: FINANCE & BUDGET ────
  {
    id: 'Q23',
    query: 'What is the total revenue BANF has tracked across all years?',
    category: 'Finance',
    complexity: 'simple',
    expectedDocIds: ['kb-2026-finance'],
    expectedKeywords: ['17372', '17,372'],
    factCheck: (ans, srcs) => {
      const has = ans.includes('17,372') || ans.includes('17372');
      return { pass: has, detail: `$17,372.50 total: ${has}` };
    }
  },
  {
    id: 'Q24',
    query: 'What was the budget for Durga Puja 2024 and what was the net surplus?',
    category: 'Finance',
    complexity: 'moderate',
    expectedDocIds: ['kb-2024-durga'],
    expectedKeywords: ['8500', '8,500', '1500', '1,500'],
    factCheck: (ans, srcs) => {
      const hasBudget = ans.includes('8,500') || ans.includes('8500');
      const hasNet = ans.includes('1,500') || ans.includes('1500');
      return { pass: hasBudget, detail: `$8,500 budget: ${hasBudget}, $1,500 net: ${hasNet}` };
    }
  },
  {
    id: 'Q25',
    query: 'How does the budget approval workflow work for procurement?',
    category: 'Finance',
    complexity: 'moderate',
    expectedDocIds: ['kb-procurement'],
    expectedKeywords: ['treasurer', 'escalat', 'receipt', 'reimburse'],
    factCheck: (ans, srcs) => {
      const al = ans.toLowerCase();
      const steps = ['treasurer', 'receipt', 'reimburse'].filter(s => al.includes(s));
      return { pass: steps.length >= 2, detail: `Found ${steps.length}/3 workflow steps: ${steps.join(', ')}` };
    }
  },

  // ──── CATEGORY 7: CRM & DATA ────
  {
    id: 'Q26',
    query: 'How many data sources feed into the BANF CRM?',
    category: 'CRM / Data',
    complexity: 'moderate',
    expectedDocIds: ['kb-2026-crm'],
    expectedKeywords: ['5', 'wix', 'google', 'xlsx', 'bosonto'],
    factCheck: (ans, srcs) => {
      const al = ans.toLowerCase();
      const sources = ['wix', 'google', 'xlsx', 'bosonto', 'email audit'].filter(s => al.includes(s));
      return { pass: sources.length >= 3, detail: `Found ${sources.length}/5 data sources: ${sources.join(', ')}` };
    }
  },
  {
    id: 'Q27',
    query: 'How many data issues were flagged in the CRM and what categories?',
    category: 'CRM / Data',
    complexity: 'complex',
    expectedDocIds: ['kb-2026-crm'],
    expectedKeywords: ['1064', '286', '218', '167', '155', '141'],
    factCheck: (ans, srcs) => {
      const has1064 = ans.includes('1064') || ans.includes('1,064');
      return { pass: has1064, detail: `1064 total issues: ${has1064}` };
    }
  },

  // ──── CATEGORY 8: EMAIL & COMMUNICATION POLICY ────
  {
    id: 'Q28',
    query: 'What is the email cooldown period for EC reminders?',
    category: 'Email Policy',
    complexity: 'simple',
    expectedDocIds: ['kb-email-dedup-policy'],
    expectedKeywords: ['48', 'hours', 'cooldown'],
    factCheck: (ans, srcs) => {
      const al = ans.toLowerCase();
      return { pass: al.includes('48') && al.includes('hours'), detail: `48 hours: ${al.includes('48') && al.includes('hours')}` };
    }
  },
  {
    id: 'Q29',
    query: 'What happens if someone tries to send a duplicate email?',
    category: 'Email Policy',
    complexity: 'moderate',
    expectedDocIds: ['kb-email-dedup-policy'],
    expectedKeywords: ['blocked', 'override', 'reason'],
    factCheck: (ans, srcs) => {
      const al = ans.toLowerCase();
      const has = al.includes('block') || al.includes('override') || al.includes('reason');
      return { pass: has, detail: `Mentions blocking/override: ${has}` };
    }
  },
  {
    id: 'Q30',
    query: 'What privacy requirements must all BANF emails comply with?',
    category: 'Email Policy',
    complexity: 'moderate',
    expectedDocIds: ['kb-email-dedup-policy'],
    expectedKeywords: ['unsubscribe', 'privacy', 'optin', 'erasure'],
    factCheck: (ans, srcs) => {
      const al = ans.toLowerCase();
      const reqs = ['unsubscribe', 'privacy', 'erasure', 'opt'].filter(r => al.includes(r));
      return { pass: reqs.length >= 2, detail: `Found ${reqs.length}/4 privacy reqs: ${reqs.join(', ')}` };
    }
  },

  // ──── CATEGORY 9: CROSS-DOMAIN / COMPLEX ────
  {
    id: 'Q31',
    query: 'Who coordinates the food for BANF events and what food was served previously?',
    category: 'Cross-Domain',
    complexity: 'complex',
    expectedDocIds: ['kb-2025-ec', 'kb-2025-kali', 'kb-2024-holi'],
    expectedKeywords: ['soumyajit', 'banty', 'khichuri', 'swad'],
    factCheck: (ans, srcs) => {
      const al = ans.toLowerCase();
      const hasBanty = al.includes('banty') || al.includes('soumyajit');
      const hasFood = al.includes('khichuri') || al.includes('swad') || al.includes('thali');
      return { pass: hasBanty || hasFood, detail: `Food coordinator: ${hasBanty}, food details: ${hasFood}` };
    }
  },
  {
    id: 'Q32',
    query: 'How many total members across all years and what is the growth trend?',
    category: 'Cross-Domain',
    complexity: 'complex',
    expectedDocIds: ['kb-2024-history', 'kb-2025-membership', 'kb-2026-membership'],
    expectedKeywords: ['120', '168', '182'],
    factCheck: (ans, srcs) => {
      const counts = ['120', '168', '182'].filter(n => ans.includes(n));
      return { pass: counts.length >= 2, detail: `Found ${counts.length}/3 member counts: ${counts.join(', ')}` };
    }
  },
  {
    id: 'Q33',
    query: 'What was the Durga Puja 2024 budget and how does it compare to other event budgets?',
    category: 'Cross-Domain',
    complexity: 'moderate',
    expectedDocIds: ['kb-2024-durga', 'kb-2024-holi'],
    expectedKeywords: ['durga', '8500', 'budget'],
    factCheck: (ans, srcs) => {
      const al = ans.toLowerCase();
      return { pass: al.includes('durga') || al.includes('8,500') || al.includes('8500'), detail: `Durga Puja: ${al.includes('durga')}, budget $8500: ${ans.includes('8,500') || ans.includes('8500')}` };
    }
  },
  {
    id: 'Q34',
    query: 'How many unpaid RSVPs are there for Bosonto 2026 and what is the follow-up plan?',
    category: 'Cross-Domain',
    complexity: 'complex',
    expectedDocIds: ['kb-2026-bosonto'],
    expectedKeywords: ['29', 'unpaid', 'rsvp'],
    factCheck: (ans, srcs) => {
      const has29 = ans.includes('29');
      return { pass: has29, detail: `29 unpaid-yes: ${has29}` };
    }
  },
  {
    id: 'Q35',
    query: 'What is the Holi 2025 net surplus and how does it compare to Durga Puja 2024 surplus?',
    category: 'Cross-Domain',
    complexity: 'complex',
    expectedDocIds: ['kb-2024-holi', 'kb-2024-durga'],
    expectedKeywords: ['400', '1500'],
    factCheck: (ans, srcs) => {
      const docIds = srcs.map(s => s.document.id);
      const hasHoli = docIds.includes('kb-2024-holi');
      const hasDurga = docIds.includes('kb-2024-durga');
      return { pass: hasHoli && hasDurga, detail: `Holi doc: ${hasHoli}, Durga doc: ${hasDurga}` };
    }
  },
];

// ═══════════════════════════════════════════════════════
//  4. RUN ALL TESTS
// ═══════════════════════════════════════════════════════

function runAllTests() {
  buildIndex();
  console.log(`\n[BANF-RAG-TEST] Knowledge base: ${documents.length} documents, ${vectors.length} vectors`);
  console.log(`[BANF-RAG-TEST] Running ${TEST_QUERIES.length} test queries...\n`);

  const results = [];
  let passed = 0, failed = 0;

  for (const tq of TEST_QUERIES) {
    const startMs = Date.now();
    const retrieved = retrieve(tq.query, 5);
    const answer = localFallback(tq.query, retrieved);
    const elapsed = Date.now() - startMs;

    // Check expected doc IDs appear in top results
    const retrievedIds = retrieved.map(r => r.document.id);
    const expectedHits = tq.expectedDocIds.filter(id => retrievedIds.includes(id));
    const docIdMatch = expectedHits.length === tq.expectedDocIds.length;
    const docIdPartial = expectedHits.length > 0;

    // Check expected keywords in full context (answer + sources text)
    const fullContext = answer + ' ' + retrieved.map(r => r.document.text).join(' ');
    const kwHits = tq.expectedKeywords.filter(kw => fullContext.toLowerCase().includes(kw.toLowerCase()));
    const kwMatch = kwHits.length >= Math.ceil(tq.expectedKeywords.length * 0.5);

    // Factual validation
    const factResult = tq.factCheck(fullContext, retrieved);

    // Overall pass
    const testPassed = factResult.pass && docIdPartial;
    if (testPassed) passed++; else failed++;

    const status = testPassed ? 'PASS' : 'FAIL';
    console.log(`  ${status}  ${tq.id} [${tq.category}] ${tq.query.substring(0, 60)}...`);

    results.push({
      ...tq,
      retrieved,
      answer,
      elapsed,
      retrievedIds,
      expectedHits,
      docIdMatch,
      docIdPartial,
      kwHits,
      kwTotal: tq.expectedKeywords.length,
      kwMatch,
      factResult,
      testPassed,
      topScore: retrieved.length > 0 ? retrieved[0].score.toFixed(2) : '0',
    });
  }

  console.log(`\n[BANF-RAG-TEST] Results: ${passed} PASSED, ${failed} FAILED out of ${TEST_QUERIES.length}`);
  console.log(`[BANF-RAG-TEST] Pass rate: ${(passed / TEST_QUERIES.length * 100).toFixed(1)}%\n`);

  return { results, passed, failed, total: TEST_QUERIES.length };
}

// ═══════════════════════════════════════════════════════
//  5. GENERATE HTML REPORT
// ═══════════════════════════════════════════════════════

function generateHTMLReport(testData) {
  const { results, passed, failed, total } = testData;
  const passRate = (passed / total * 100).toFixed(1);
  const now = new Date().toISOString().replace('T', ' ').split('.')[0];

  // Group by category
  const categories = {};
  results.forEach(r => {
    if (!categories[r.category]) categories[r.category] = [];
    categories[r.category].push(r);
  });

  // Complexity stats
  const byComplexity = { simple: { p: 0, t: 0 }, moderate: { p: 0, t: 0 }, complex: { p: 0, t: 0 } };
  results.forEach(r => {
    byComplexity[r.complexity].t++;
    if (r.testPassed) byComplexity[r.complexity].p++;
  });

  // Category stats
  const catStats = {};
  Object.keys(categories).forEach(cat => {
    const items = categories[cat];
    catStats[cat] = { total: items.length, passed: items.filter(r => r.testPassed).length };
  });

  let html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>BANF RAG Chatbot — Test & Validation Report</title>
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">
<style>
*{margin:0;padding:0;box-sizing:border-box}
:root{--bg:#0a0f1a;--surface:#111827;--card:#1e293b;--border:#334155;--text:#e2e8f0;--dim:#94a3b8;--green:#4ade80;--red:#f87171;--yellow:#fbbf24;--blue:#60a5fa;--purple:#a78bfa;--cyan:#22d3ee;--orange:#fb923c;--banf:#006A4E;--banf-light:#00856F}
body{font-family:'Segoe UI',system-ui,-apple-system,sans-serif;background:var(--bg);color:var(--text);line-height:1.6;padding:20px}
.container{max-width:1400px;margin:0 auto}

/* Header */
.header{background:linear-gradient(135deg,var(--banf),var(--banf-light));padding:36px 40px;border-radius:16px;margin-bottom:24px;position:relative;overflow:hidden}
.header::before{content:'';position:absolute;top:-50%;right:-30%;width:60%;height:200%;background:radial-gradient(circle,rgba(255,255,255,.08),transparent 70%);pointer-events:none}
.header h1{font-size:1.8rem;color:#fff;font-weight:800;letter-spacing:-.5px}
.header .subtitle{color:rgba(255,255,255,.85);font-size:.88rem;margin-top:4px}
.header .meta{color:rgba(255,255,255,.6);font-size:.72rem;margin-top:8px;display:flex;gap:20px}

/* KPI Row */
.kpi-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:14px;margin-bottom:24px}
.kpi{background:var(--card);border:1px solid var(--border);border-radius:12px;padding:20px;text-align:center;transition:transform .15s,border-color .15s}
.kpi:hover{transform:translateY(-2px);border-color:rgba(99,102,241,.3)}
.kpi .value{font-size:2rem;font-weight:800;line-height:1}
.kpi .value.green{color:var(--green)}.kpi .value.red{color:var(--red)}.kpi .value.blue{color:var(--blue)}.kpi .value.purple{color:var(--purple)}.kpi .value.cyan{color:var(--cyan)}
.kpi .label{font-size:.68rem;color:var(--dim);text-transform:uppercase;letter-spacing:.6px;margin-top:6px}

/* Progress Bar */
.progress-bar{height:8px;background:var(--border);border-radius:4px;margin:8px 0;overflow:hidden}
.progress-bar .fill{height:100%;border-radius:4px;transition:width .5s}
.progress-bar .fill.green{background:var(--green)}.progress-bar .fill.red{background:var(--red)}.progress-bar .fill.yellow{background:var(--yellow)}

/* Category Navigation */
.cat-nav{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:20px}
.cat-btn{padding:6px 14px;border-radius:8px;font-size:.75rem;font-weight:600;border:1px solid var(--border);background:var(--surface);color:var(--dim);cursor:pointer;transition:all .15s}
.cat-btn:hover,.cat-btn.active{background:var(--banf);color:#fff;border-color:var(--banf)}
.cat-btn .count{display:inline-block;background:rgba(255,255,255,.15);padding:0 6px;border-radius:4px;font-size:.65rem;margin-left:4px}

/* Cards */
.section{margin-bottom:28px}
.section-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:14px}
.section-title{font-size:1.1rem;font-weight:700;color:var(--text)}
.section-badge{font-size:.68rem;padding:3px 10px;border-radius:6px;font-weight:600}

/* Test Result Cards */
.test-card{background:var(--card);border:1px solid var(--border);border-radius:12px;margin-bottom:12px;overflow:hidden;transition:border-color .15s}
.test-card:hover{border-color:rgba(99,102,241,.25)}
.test-card.pass{border-left:4px solid var(--green)}
.test-card.fail{border-left:4px solid var(--red)}
.tc-header{display:flex;justify-content:space-between;align-items:center;padding:14px 18px;cursor:pointer;user-select:none}
.tc-header:hover{background:rgba(255,255,255,.02)}
.tc-id{font-family:'Cascadia Code','Fira Code',monospace;font-size:.72rem;color:var(--cyan);font-weight:700;min-width:36px}
.tc-query{flex:1;margin:0 14px;font-size:.84rem;font-weight:600}
.tc-badges{display:flex;gap:6px;align-items:center;flex-shrink:0}
.badge{display:inline-block;padding:2px 8px;border-radius:5px;font-size:.66rem;font-weight:700;letter-spacing:.2px}
.badge-pass{background:#064e3b;color:#6ee7b7}.badge-fail{background:#7f1d1d;color:#fca5a5}
.badge-simple{background:#1e3a5f;color:#93c5fd}.badge-moderate{background:#78350f;color:#fcd34d}.badge-complex{background:#4c1d95;color:#c4b5fd}
.badge-cat{background:rgba(99,102,241,.12);color:#818cf8}

/* Expandable Detail */
.tc-detail{display:none;padding:0 18px 16px;border-top:1px solid rgba(51,65,85,.5)}
.tc-detail.open{display:block}
.detail-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-top:12px}
.detail-block{background:var(--surface);border:1px solid var(--border);border-radius:8px;padding:12px}
.detail-block h4{font-size:.74rem;color:var(--dim);text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px}
.detail-block .content{font-size:.78rem;line-height:1.7;color:var(--text)}
.src-list{list-style:none;padding:0}
.src-list li{padding:4px 0;border-bottom:1px solid rgba(51,65,85,.3);font-size:.74rem}
.src-list li:last-child{border:0}
.src-score{font-family:monospace;color:var(--cyan);font-size:.68rem;margin-left:6px}
.src-year{color:var(--purple);font-size:.64rem}
.check-row{display:flex;align-items:center;gap:8px;padding:3px 0;font-size:.76rem}
.check-icon{width:18px;text-align:center}
.check-icon.ok{color:var(--green)}.check-icon.ng{color:var(--red)}

/* Answer Block */
.answer-block{background:rgba(6,78,59,.1);border:1px solid rgba(74,222,128,.15);border-radius:8px;padding:12px;margin-top:10px;font-size:.78rem;line-height:1.7;white-space:pre-wrap;max-height:300px;overflow-y:auto}

/* Summary Tables */
table{width:100%;border-collapse:collapse;font-size:.8rem}
th{background:var(--surface);color:var(--dim);padding:10px 12px;text-align:left;font-size:.7rem;text-transform:uppercase;letter-spacing:.5px;border-bottom:2px solid var(--border)}
td{padding:8px 12px;border-bottom:1px solid rgba(51,65,85,.4)}
tr:hover{background:rgba(255,255,255,.015)}

/* Footer */
footer{text-align:center;color:#475569;font-size:.7rem;margin-top:40px;padding:20px 0;border-top:1px solid var(--border)}

/* Print */
@media print{
  body{background:#fff;color:#000;padding:10px}
  .header{background:var(--banf)!important;-webkit-print-color-adjust:exact;print-color-adjust:exact}
  .kpi,.test-card,.detail-block{border:1px solid #ddd}
  .tc-detail{display:block!important}
  .no-print{display:none!important}
}
@media(max-width:768px){
  .detail-grid{grid-template-columns:1fr}
  .kpi-grid{grid-template-columns:repeat(2,1fr)}
}
</style>
</head>
<body>
<div class="container">

<!-- HEADER -->
<div class="header">
  <h1><i class="fas fa-robot" style="margin-right:10px"></i>BANF RAG Chatbot — Test & Validation Report</h1>
  <div class="subtitle">Comprehensive query testing across ${Object.keys(categories).length} categories with factual validation</div>
  <div class="meta">
    <span><i class="fas fa-calendar me-1"></i> ${now}</span>
    <span><i class="fas fa-database me-1"></i> ${documents.length} KB Documents</span>
    <span><i class="fas fa-vial me-1"></i> ${total} Test Queries</span>
    <span><i class="fas fa-cog me-1"></i> TF-IDF Retrieval + Local KB Fallback</span>
  </div>
</div>

<!-- KPI ROW -->
<div class="kpi-grid">
  <div class="kpi">
    <div class="value green">${passed}</div>
    <div class="label">Tests Passed</div>
  </div>
  <div class="kpi">
    <div class="value red">${failed}</div>
    <div class="label">Tests Failed</div>
  </div>
  <div class="kpi">
    <div class="value ${parseFloat(passRate) >= 80 ? 'green' : parseFloat(passRate) >= 60 ? 'yellow' : 'red'}">${passRate}%</div>
    <div class="label">Pass Rate</div>
    <div class="progress-bar"><div class="fill ${parseFloat(passRate) >= 80 ? 'green' : parseFloat(passRate) >= 60 ? 'yellow' : 'red'}" style="width:${passRate}%"></div></div>
  </div>
  <div class="kpi">
    <div class="value blue">${byComplexity.simple.p}/${byComplexity.simple.t}</div>
    <div class="label">Simple Queries</div>
  </div>
  <div class="kpi">
    <div class="value purple">${byComplexity.moderate.p}/${byComplexity.moderate.t}</div>
    <div class="label">Moderate Queries</div>
  </div>
  <div class="kpi">
    <div class="value cyan">${byComplexity.complex.p}/${byComplexity.complex.t}</div>
    <div class="label">Complex Queries</div>
  </div>
  <div class="kpi">
    <div class="value" style="color:var(--orange)">${documents.length}</div>
    <div class="label">KB Documents</div>
  </div>
  <div class="kpi">
    <div class="value" style="color:var(--dim)">${(results.reduce((s,r)=>s+r.elapsed,0)/results.length).toFixed(0)}ms</div>
    <div class="label">Avg Retrieval</div>
  </div>
</div>

<!-- CATEGORY SUMMARY TABLE -->
<div class="section">
  <div class="section-header">
    <div class="section-title"><i class="fas fa-chart-bar" style="color:var(--purple);margin-right:8px"></i>Category Breakdown</div>
  </div>
  <div style="background:var(--card);border:1px solid var(--border);border-radius:12px;overflow:hidden">
    <table>
      <thead><tr><th>Category</th><th>Total</th><th>Passed</th><th>Failed</th><th>Pass Rate</th><th>Bar</th></tr></thead>
      <tbody>
      ${Object.keys(catStats).map(cat => {
        const s = catStats[cat];
        const rate = (s.passed / s.total * 100).toFixed(0);
        return `<tr>
          <td><strong>${cat}</strong></td>
          <td>${s.total}</td>
          <td style="color:var(--green)">${s.passed}</td>
          <td style="color:${s.total - s.passed > 0 ? 'var(--red)' : 'var(--dim)'}">${s.total - s.passed}</td>
          <td><strong>${rate}%</strong></td>
          <td style="width:200px"><div class="progress-bar"><div class="fill ${parseInt(rate) >= 80 ? 'green' : parseInt(rate) >= 60 ? 'yellow' : 'red'}" style="width:${rate}%"></div></div></td>
        </tr>`;
      }).join('')}
      </tbody>
    </table>
  </div>
</div>

<!-- CATEGORY NAV -->
<div class="cat-nav no-print">
  <button class="cat-btn active" onclick="filterCat('all')">All <span class="count">${total}</span></button>
  ${Object.keys(categories).map(cat => 
    `<button class="cat-btn" onclick="filterCat('${cat.replace(/[^a-zA-Z0-9]/g,'-')}')">${cat} <span class="count">${categories[cat].length}</span></button>`
  ).join('')}
  <button class="cat-btn" onclick="filterCat('pass')" style="border-color:var(--green);color:var(--green)"><i class="fas fa-check"></i> Passed <span class="count">${passed}</span></button>
  <button class="cat-btn" onclick="filterCat('fail')" style="border-color:var(--red);color:var(--red)"><i class="fas fa-times"></i> Failed <span class="count">${failed}</span></button>
</div>

<!-- ALL TEST RESULTS -->
<div class="section">
  <div class="section-header">
    <div class="section-title"><i class="fas fa-list-check" style="color:var(--green);margin-right:8px"></i>Test Results (${total} Queries)</div>
  </div>

${results.map(r => `
  <div class="test-card ${r.testPassed ? 'pass' : 'fail'}" data-cat="${r.category.replace(/[^a-zA-Z0-9]/g,'-')}" data-status="${r.testPassed ? 'pass' : 'fail'}">
    <div class="tc-header" onclick="this.nextElementSibling.classList.toggle('open')">
      <span class="tc-id">${r.id}</span>
      <span class="tc-query">${escapeHtml(r.query)}</span>
      <div class="tc-badges">
        <span class="badge badge-cat">${r.category}</span>
        <span class="badge badge-${r.complexity}">${r.complexity}</span>
        <span class="badge ${r.testPassed ? 'badge-pass' : 'badge-fail'}">${r.testPassed ? 'PASS' : 'FAIL'}</span>
      </div>
    </div>
    <div class="tc-detail">
      <div class="detail-grid">
        <div class="detail-block">
          <h4><i class="fas fa-search" style="margin-right:4px"></i>Retrieved Documents (Top ${r.retrieved.length})</h4>
          <ul class="src-list">
            ${r.retrieved.slice(0, 5).map((s, i) => 
              `<li>${i === 0 ? '<strong>' : ''}${s.document.title} <span class="src-year">(${s.document.year})</span>${i === 0 ? '</strong>' : ''} <span class="src-score">score: ${s.score.toFixed(2)}</span>${r.expectedDocIds.includes(s.document.id) ? ' <i class="fas fa-check" style="color:var(--green);font-size:.65rem"></i>' : ''}</li>`
            ).join('')}
          </ul>
        </div>
        <div class="detail-block">
          <h4><i class="fas fa-clipboard-check" style="margin-right:4px"></i>Validation Checks</h4>
          <div class="check-row"><span class="check-icon ${r.docIdPartial ? 'ok' : 'ng'}"><i class="fas fa-${r.docIdPartial ? 'check' : 'times'}"></i></span> Expected docs retrieved: ${r.expectedHits.length}/${r.expectedDocIds.length}${r.docIdMatch ? ' (all found)' : ''}</div>
          <div class="check-row"><span class="check-icon ${r.kwMatch ? 'ok' : 'ng'}"><i class="fas fa-${r.kwMatch ? 'check' : 'times'}"></i></span> Keywords matched: ${r.kwHits.length}/${r.kwTotal} (${r.kwHits.join(', ') || 'none'})</div>
          <div class="check-row"><span class="check-icon ${r.factResult.pass ? 'ok' : 'ng'}"><i class="fas fa-${r.factResult.pass ? 'check' : 'times'}"></i></span> Fact check: ${escapeHtml(r.factResult.detail)}</div>
          <div class="check-row"><span class="check-icon ok"><i class="fas fa-clock"></i></span> Retrieval time: ${r.elapsed}ms | Top score: ${r.topScore}</div>
        </div>
      </div>
      <div class="answer-block">${escapeHtml(r.answer)}</div>
    </div>
  </div>
`).join('')}

</div>

<!-- KNOWLEDGE BASE INDEX -->
<div class="section">
  <div class="section-header">
    <div class="section-title"><i class="fas fa-book" style="color:var(--cyan);margin-right:8px"></i>Knowledge Base Documents (${documents.length})</div>
  </div>
  <div style="background:var(--card);border:1px solid var(--border);border-radius:12px;overflow:hidden">
    <table>
      <thead><tr><th>Doc ID</th><th>Year</th><th>Category</th><th>Title</th><th>Words</th><th>Queries Hitting</th></tr></thead>
      <tbody>
      ${documents.map(doc => {
        const hitCount = results.filter(r => r.retrievedIds.includes(doc.id)).length;
        const wc = doc.text.split(/\s+/).length;
        return `<tr>
          <td style="font-family:monospace;font-size:.72rem;color:var(--cyan)">${doc.id}</td>
          <td>${doc.year}</td>
          <td><span class="badge badge-cat">${doc.category}</span></td>
          <td>${doc.title}</td>
          <td>${wc}</td>
          <td><strong style="color:${hitCount > 0 ? 'var(--green)' : 'var(--red)'}">${hitCount}</strong> / ${total}</td>
        </tr>`;
      }).join('')}
      </tbody>
    </table>
  </div>
</div>

<!-- FOOTER -->
<footer>
  <div style="margin-bottom:6px"><strong>Bengali Association of North Florida</strong> · www.jaxbengali.org</div>
  <div>RAG Chatbot Test Report · Generated ${now} · ${total} queries tested across ${Object.keys(categories).length} categories</div>
  <div style="margin-top:4px">Engine: TF-IDF Vector Index + Local KB Fallback (no external API required)</div>
</footer>

</div>

<script>
// Toggle category filter
function filterCat(cat) {
  document.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));
  event.target.closest('.cat-btn').classList.add('active');
  document.querySelectorAll('.test-card').forEach(card => {
    if (cat === 'all') { card.style.display = ''; return; }
    if (cat === 'pass' || cat === 'fail') {
      card.style.display = card.dataset.status === cat ? '' : 'none';
      return;
    }
    card.style.display = card.dataset.cat === cat ? '' : 'none';
  });
}
// Expand all for print
window.addEventListener('beforeprint', () => {
  document.querySelectorAll('.tc-detail').forEach(d => d.classList.add('open'));
});
</script>
</body>
</html>`;

  return html;
}

function escapeHtml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ═══════════════════════════════════════════════════════
//  6. MAIN
// ═══════════════════════════════════════════════════════

const testData = runAllTests();
const html = generateHTMLReport(testData);

const outPath = path.join(__dirname, 'docs', 'banf-rag-chatbot-test-report.html');
fs.writeFileSync(outPath, html, 'utf-8');
console.log(`[BANF-RAG-TEST] HTML report written to: ${outPath}`);
console.log(`[BANF-RAG-TEST] Open in browser to view results.\n`);
