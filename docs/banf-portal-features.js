/**
 * ══════════════════════════════════════════════════════════════════════
 *  BANF Portal Features v1.0 — Event Reports, RAG Chat, Enhanced Alerts
 * ══════════════════════════════════════════════════════════════════════
 *
 *  Companion module for admin-portal.html providing:
 *    1. Enhanced Alert System (common + per-EC member targeting)
 *    2. RAG Chatbot with Vector Store (using HF Inference API)
 *    3. Event Attendance & Insight Reports (HTML/PDF download)
 *    4. Procurement/Reimbursement enhancements
 *
 *  Loaded AFTER admin-portal.html's inline <script> so all globals
 *  (CRM, EC_MEMBERS, BANF_CHANGELOG, etc.) are available.
 *
 *  © 2026 Bengali Association of North Florida
 * ══════════════════════════════════════════════════════════════════════
 */

(function(){
'use strict';

// ══════════════════════════════════════════════════════════════
//  1. ENHANCED ALERT SYSTEM — Common + Per-EC Member Alerts
// ══════════════════════════════════════════════════════════════

/**
 * Alert categories:
 *   - COMMON: visible to all EC members (org-wide announcements)
 *   - ROLE:   visible to specific roles
 *   - MEMBER: visible only to specific email/member
 */
window.BANF_ALERTS = [
  // ── Common alerts for ALL EC members ──
  {id:'ALT-001',type:'common',severity:'info',icon:'fa-bullhorn',
   title:'Bosonto Utsob 2026 — Event Planning Active',
   detail:'Event date: March 22, 2026. Venue: JCCL Community Center. 56 members in pipeline, 6 paid ($2,490). All EC members should review their assigned tasks.',
   date:'2026-03-05',dismissible:true,targetRoles:['ec-member','admin','super-admin']},
  {id:'ALT-002',type:'common',severity:'warning',icon:'fa-user-clock',
   title:'3 EC Members Pending Portal Signup',
   detail:'Dr. Moumita Ghosh, Soumyajit Dutta (Banty), and Rwiti Chowdhury have not completed portal signup. Please remind them directly.',
   date:'2026-03-05',dismissible:true,targetRoles:['ec-member','admin','super-admin']},
  {id:'ALT-003',type:'common',severity:'info',icon:'fa-database',
   title:'CRM Data Update: 182 Members Loaded',
   detail:'Full CRM reconciliation completed. 182 members from 5 data sources, 129 families, $17,372 revenue tracked. All event/payment data enriched.',
   date:'2026-03-06',dismissible:true,targetRoles:['ec-member','admin','super-admin']},

  // ── Per-Member targeted alerts ──
  {id:'ALT-M01',type:'member',severity:'warning',icon:'fa-wallet',
   title:'Treasurer Action: 29 Unpaid Bosonto RSVPs',
   detail:'29 members responded "Yes" to Bosonto but have not paid. Please initiate payment follow-up via Zelle/payment drive.',
   date:'2026-03-05',dismissible:true,targetEmail:'amit.everywhere@gmail.com',targetRoles:['ec-member']},
  {id:'ALT-M02',type:'member',severity:'info',icon:'fa-utensils',
   title:'Food Coordinator: Bosonto Meal Count Required',
   detail:'Based on evite responses: 45 adults, 22 kids confirmed. Please finalize catering order by March 15.',
   date:'2026-03-05',dismissible:true,targetEmail:'duttasoumyajit86@gmail.com',targetRoles:['ec-member']},
  {id:'ALT-M03',type:'member',severity:'info',icon:'fa-music',
   title:'Cultural Secretary: Program Schedule Due',
   detail:'Please submit the Bosonto cultural program schedule (performances, emcee, sound check times) by March 12.',
   date:'2026-03-05',dismissible:true,targetEmail:'moumita.mukherje@gmail.com',targetRoles:['ec-member']},
  {id:'ALT-M04',type:'member',severity:'info',icon:'fa-calendar-check',
   title:'Event Coordinator: Venue Logistics',
   detail:'Confirm venue setup time, AV equipment, table/chair arrangement for Bosonto. Deadline: March 18.',
   date:'2026-03-05',dismissible:true,targetEmail:'sumo475@gmail.com',targetRoles:['ec-member']},
  {id:'ALT-M05',type:'member',severity:'info',icon:'fa-clipboard-list',
   title:'General Secretary: Meeting Minutes Pending',
   detail:'EC meeting minutes from Feb 28 session need to be circulated. Please upload to Drive.',
   date:'2026-03-05',dismissible:true,targetEmail:'rajanya.ghosh@gmail.com',targetRoles:['ec-member']},
  {id:'ALT-M06',type:'member',severity:'info',icon:'fa-om',
   title:'Puja Coordinator: Bosonto Puja Arrangements',
   detail:'Confirm puja samagri list, priest availability, and puja timing for Bosonto Utsob.',
   date:'2026-03-05',dismissible:true,targetEmail:'rwitichoudhury@gmail.com',targetRoles:['ec-member']},
];

// Re-render alerts with enhanced targeting
window.renderEnhancedAlerts = function(containerId){
  var el = document.getElementById(containerId);
  if(!el) return;
  var session = null;
  try { session = JSON.parse(sessionStorage.getItem('banf_admin_session')); } catch(e){}
  var userEmail = session ? (session.email || '').toLowerCase() : '';
  var userRoles = (session ? (session.roles || ['super-admin']) : ['super-admin']).map(function(r){return r.toLowerCase().replace(/_/g,'-');});

  // Dismissed alerts from localStorage
  var dismissed = {};
  try { dismissed = JSON.parse(localStorage.getItem('banf_dismissed_alerts') || '{}'); } catch(e){}

  // Filter alerts visible to this user
  var visible = window.BANF_ALERTS.filter(function(a){
    if(dismissed[a.id]) return false;
    // Role check
    var roleMatch = a.targetRoles.some(function(r){ return userRoles.indexOf(r) >= 0; });
    if(!roleMatch) return false;
    // Member-specific check
    if(a.type === 'member' && a.targetEmail && a.targetEmail !== userEmail){
      // Super-admin sees all
      if(userRoles.indexOf('super-admin') < 0) return false;
    }
    return true;
  });

  // Also include changelog alerts
  var changelogAlerts = (typeof BANF_CHANGELOG !== 'undefined' ? BANF_CHANGELOG : []).filter(function(c){
    return c.affectedRoles.some(function(r){ return userRoles.indexOf(r) >= 0; });
  }).slice(0, 3);

  if(visible.length === 0 && changelogAlerts.length === 0){
    el.style.display = 'none'; return;
  }

  var icons = {critical:'fa-exclamation-triangle',warning:'fa-exclamation-circle',info:'fa-info-circle'};

  // Separate common vs member-specific
  var commonAlerts = visible.filter(function(a){return a.type==='common';});
  var memberAlerts = visible.filter(function(a){return a.type==='member';});

  var html = '<div class="banf-alerts-section">';

  // Common alerts header
  if(commonAlerts.length > 0){
    html += '<div style="display:flex;align-items:center;gap:8px;margin-bottom:10px">' +
      '<i class="fas fa-bell" style="color:var(--yellow)"></i>' +
      '<span style="font-size:.88rem;font-weight:700">Organization Alerts</span>' +
      '<span class="badge-s badge-blue" style="font-size:.6rem">' + commonAlerts.length + ' for all EC</span>' +
    '</div>';
    html += commonAlerts.map(function(a){
      return '<div class="banf-alert-item ' + a.severity + '" data-alert-id="' + a.id + '">' +
        '<i class="fas ' + (a.icon || icons[a.severity] || 'fa-info-circle') + ' alert-icon"></i>' +
        '<div class="alert-body">' +
          '<div class="alert-title">' + a.title + '</div>' +
          '<div class="alert-detail">' + a.detail + '</div>' +
          '<div class="alert-meta">COMMON &middot; ' + a.date + '</div>' +
        '</div>' +
        (a.dismissible ? '<button onclick="dismissAlert(\'' + a.id + '\',this)" style="border:0;background:transparent;color:var(--muted);cursor:pointer;font-size:.82rem;padding:4px 8px" title="Dismiss"><i class="fas fa-times"></i></button>' : '') +
      '</div>';
    }).join('');
  }

  // Member-specific alerts
  if(memberAlerts.length > 0){
    html += '<div style="display:flex;align-items:center;gap:8px;margin:14px 0 10px">' +
      '<i class="fas fa-user-tag" style="color:var(--accent)"></i>' +
      '<span style="font-size:.88rem;font-weight:700">Your Action Items</span>' +
      '<span class="badge-s badge-orange" style="font-size:.6rem">' + memberAlerts.length + ' for you</span>' +
    '</div>';
    html += memberAlerts.map(function(a){
      var memberTag = a.targetEmail && a.targetEmail !== userEmail ? '<span class="badge-s badge-dim" style="font-size:.58rem;margin-left:6px">→ ' + a.targetEmail + '</span>' : '';
      return '<div class="banf-alert-item ' + a.severity + '" data-alert-id="' + a.id + '" style="border-left-color:var(--accent)">' +
        '<i class="fas ' + (a.icon || icons[a.severity] || 'fa-info-circle') + ' alert-icon" style="color:var(--accent)"></i>' +
        '<div class="alert-body">' +
          '<div class="alert-title">' + a.title + memberTag + '</div>' +
          '<div class="alert-detail">' + a.detail + '</div>' +
          '<div class="alert-meta">PERSONAL &middot; ' + a.date + '</div>' +
        '</div>' +
        (a.dismissible ? '<button onclick="dismissAlert(\'' + a.id + '\',this)" style="border:0;background:transparent;color:var(--muted);cursor:pointer;font-size:.82rem;padding:4px 8px" title="Dismiss"><i class="fas fa-times"></i></button>' : '') +
      '</div>';
    }).join('');
  }

  // Changelog alerts (existing functionality preserved)
  if(changelogAlerts.length > 0){
    html += '<div style="display:flex;align-items:center;gap:8px;margin:14px 0 10px">' +
      '<i class="fas fa-code-branch" style="color:var(--cyan)"></i>' +
      '<span style="font-size:.88rem;font-weight:700">Platform Updates</span>' +
      '<span class="badge-s badge-cyan" style="font-size:.6rem">' + changelogAlerts.length + '</span>' +
    '</div>';
    html += changelogAlerts.map(function(c){
      return '<div class="banf-alert-item ' + c.severity + '">' +
        '<i class="fas ' + (icons[c.severity]||'fa-info-circle') + ' alert-icon"></i>' +
        '<div class="alert-body">' +
          '<div class="alert-title">' + c.title + '</div>' +
          '<div class="alert-detail">' + c.detail + '</div>' +
          '<div class="alert-meta">' + c.type.toUpperCase() + ' &middot; v' + c.ver + ' &middot; ' + c.date + '</div>' +
        '</div></div>';
    }).join('');
  }

  html += '</div>';
  el.innerHTML = html;
};

window.dismissAlert = function(alertId, btn){
  var dismissed = {};
  try { dismissed = JSON.parse(localStorage.getItem('banf_dismissed_alerts') || '{}'); } catch(e){}
  dismissed[alertId] = Date.now();
  localStorage.setItem('banf_dismissed_alerts', JSON.stringify(dismissed));
  var item = btn.closest('.banf-alert-item');
  if(item) item.style.display = 'none';
  if(typeof showToast === 'function') showToast('Alert dismissed', 'var(--dim)');
};


// ══════════════════════════════════════════════════════════════
//  2. RAG CHATBOT WITH VECTOR STORE
// ══════════════════════════════════════════════════════════════
//
//  Architecture:
//    - Vector store: client-side TF-IDF / cosine similarity over
//      chunked BANF knowledge base documents (yearwise)
//    - LLM: Hugging Face Inference API
//
//  Best Open-Source Models for RAG Chat (2025-2026 research):
//  ┌──────────────────────────────────────────────────────────┐
//  │ MODEL              │ SIZE  │ CONTEXT │ STRENGTHS         │
//  ├──────────────────────────────────────────────────────────┤
//  │ Mistral-7B-v0.3    │  7B   │  32K    │ Fast, great RAG   │
//  │ Mixtral-8x7B       │ 47B   │  32K    │ Best OS agent     │
//  │ Llama-3.1-8B-Inst  │  8B   │ 128K    │ Long context RAG  │
//  │ Qwen2.5-7B-Inst    │  7B   │ 128K    │ Multilingual RAG  │
//  │ Phi-3.5-mini-Inst  │ 3.8B  │ 128K    │ Small + accurate  │
//  │ Gemma-2-9B-it      │  9B   │  8K     │ Strong reasoning  │
//  │ DeepSeek-R1-8B     │  8B   │ 128K    │ Math / reasoning  │
//  └──────────────────────────────────────────────────────────┘
//
//  RECOMMENDATION:  Qwen2.5-7B-Instruct
//    - 128K context window (excellent for RAG retrieval)
//    - Strong multilingual (handles Bengali terms)
//    - Free via HF Inference API
//    - Outperforms Mistral-7B on MMLU, HellaSwag, GSM8K
//    - Best balance of size, speed, and accuracy for our use case
//
//  Fallback: Mistral-7B-Instruct-v0.3 (faster, 32K context)
//  Embedding: all-MiniLM-L6-v2 (384-dim, fastest for similarity)
//
// ══════════════════════════════════════════════════════════════

window.BANF_RAG = {
  // ── Vector Store: Yearwise Knowledge Documents ──
  documents: [],
  vectors: [],
  model: 'Qwen/Qwen2.5-7B-Instruct',
  embeddingModel: 'sentence-transformers/all-MiniLM-L6-v2',
  fallbackModel: 'mistralai/Mistral-7B-Instruct-v0.3',
  hfToken: null,  // Set via RAG settings panel
  maxChunkSize: 500,
  topK: 5,
  conversationHistory: [],

  // ── Knowledge Base Documents (yearwise) ──
  initKnowledgeBase: function(){
    var docs = [];

    // 2024-25 History
    docs.push({id:'kb-2024-history',year:'2024-25',category:'history',title:'BANF 2024-25 Activities',
      text:'Bengali Association of North Florida (BANF) 2024-25 year. Events held: Durga Puja (Oct 2024), Kali Puja + Food (Nov 2024), Saraswati Puja (Feb 2025), Holi (Mar 2025), Pohela Boishakh (Apr 2025). EC members for 2024-25 included founding members. Membership categories: EB-Family ($340), EB-Single ($175), EB-Student ($50), NB-Event ($30). Total active members: approximately 120.'});

    docs.push({id:'kb-2024-holi',year:'2024-25',category:'event',title:'Holi 2025 Event Report',
      text:'Holi 2025 was held March 15, 2025 at JCCL Community Center, Jacksonville FL. Attendance: 85 adults, 32 kids (117 total). 65 families attended. New member signups at event: 12. Membership paid at event: 8 families. Food: Indian buffet catered by Swad Restaurant. Budget: $2,800. Revenue from event tickets: $3,200. Net surplus: $400. Activities: Color play, music, dance, potluck contributions.'});

    docs.push({id:'kb-2024-durga',year:'2024-25',category:'event',title:'Durga Puja 2024 Report',
      text:'Durga Puja 2024 held October 12-13, 2024 at JCCL Community Center. 2-day event. Day 1: Saptami Puja + Cultural Program. Day 2: Ashtami Puja + Pushpanjali + Sandhi Puja + Dhunuchi Nach. Attendance: 150 adults, 65 kids (215 total). 92 families. Priest: Pandit Subhabrata. Budget: $8,500. Sponsorship collected: $4,200. Member contributions: $5,800. Net: +$1,500. Largest BANF event of the year.'});

    // 2025-26 Year
    docs.push({id:'kb-2025-membership',year:'2025-26',category:'membership',title:'BANF Membership 2025-26',
      text:'BANF Membership 2025-26. Total registered members: 168 (Wix CRM). Active paid members: 74. Membership tiers: M1 Standard EB-Family ($340 - early bird family), M1 Standard EB-Single ($175), M2 Premium EB-Family ($375 - includes all events), M2 Premium EB-Single ($200), Student ($50), NB-Event Only ($30/event). Payment methods: Zelle (primary), PayPal, cash at events. Membership year: July 1 to June 30. Early bird deadline: August 31.'});

    docs.push({id:'kb-2025-ec',year:'2025-26',category:'organization',title:'EC Members 2026-2028',
      text:'BANF Executive Committee 2026-2028 (elected). President: Dr. Ranadhir Ghosh (ranadhir.ghosh@gmail.com, IT Lead). Vice President: Partha Mukhopadhyay (mukhopadhyay.partha@gmail.com). Treasurer: Amit Chandak (amit.everywhere@gmail.com). General Secretary: Rajanya Ghosh (rajanya.ghosh@gmail.com). Cultural Secretary: Dr. Moumita Ghosh (moumita.mukherje@gmail.com). Food Coordinator: Soumyajit Dutta/Banty (duttasoumyajit86@gmail.com). Event Coordinator: Dr. Sumanta Ghosh (sumo475@gmail.com). Puja Coordinator: Rwiti Chowdhury (rwitichoudhury@gmail.com). Term: 2 years (2026-2028).'});

    docs.push({id:'kb-2025-kali',year:'2025-26',category:'event',title:'Kali Puja + Food 2025',
      text:'Kali Puja + Food event held November 2025 at JCCL Community Center. Combined religious puja with community dinner. Attendance: 95 adults, 38 kids (133 total). 72 families participated. Puja arrangements by Rwiti Chowdhury. Food coordinated by Soumyajit Dutta (Banty). Menu: Traditional Bengali thali with khichuri, begun bhaja, chutney, payesh. Budget: $3,200.'});

    // 2026-27 Year
    docs.push({id:'kb-2026-bosonto',year:'2026-27',category:'event',title:'Bosonto Utsob 2026',
      text:'Bosonto Utsob 2026 (Spring Festival). Date: March 22, 2026. Venue: JCCL Community Center, Jacksonville FL. Type: Membership + Cultural Event. Evite responses: 71 total — 45 Yes (adults), 22 kids, 4 No. Pipeline: 56 members processed, 6 paid ($2,490 via Zelle), 29 unpaid-yes (RSVP but no payment), 22 declined. Expected attendance: 120-150. Membership category for Bosonto: M2 Premium EB-Family $375, M2 Premium EB-Single $200. This is the first event of FY2026-27. Catering: TBD by Food Coordinator. Cultural program: TBD by Cultural Secretary.'});

    docs.push({id:'kb-2026-membership',year:'2026-27',category:'membership',title:'BANF Membership 2026-27',
      text:'BANF Membership 2026-27 (current year). Total members in CRM: 182 across 129 families. Membership tiers for 2026-27: M1 Standard EB-Family ($350), M1 Standard EB-Single ($185), M2 Premium EB-Family ($375 - all events included), M2 Premium EB-Single ($200), M3 Lifetime Family ($1,500), Student ($60), NB-Event Only ($35/event). Early bird discount: $25 off if paid by Aug 31, 2026. Payment: Zelle to banf.treasurer@gmail.com, PayPal, or cash at events. 6 members already paid for 2026-27 via Bosonto collection.'});

    docs.push({id:'kb-2026-upcoming',year:'2026-27',category:'events',title:'BANF Upcoming Events 2026-27',
      text:'BANF Event Calendar 2026-27: 1) Bosonto Utsob (Mar 22, 2026) - Spring Festival, 2) Pohela Boishakh (Apr 14, 2026) - Bengali New Year, 3) Rabindra-Nazrul Jayanti (May 2026), 4) Summer Picnic (Jun 2026), 5) Durga Puja (Oct 2026) - Biggest event, 6) Kali Puja + Food (Nov 2026), 7) Saraswati Puja (Feb 2027), 8) Holi (Mar 2027), 9) AGM - Annual General Meeting (Jan 2027). Each event requires: procurement budget approval, venue booking, food coordination, cultural program, puja arrangements (if applicable), attendance tracking via QR codes.'});

    docs.push({id:'kb-2026-finance',year:'2026-27',category:'finance',title:'BANF Financial Summary',
      text:'BANF Financial Overview. Total revenue tracked (all years): $17,372.50. 2025-26 membership dues collected: approximately $12,000. Bosonto 2026 collections so far: $2,490 (6 families). Payment methods accepted: Zelle (preferred), PayPal, cash. Treasurer: Amit Chandak. Budget approval workflow: Submit request → Treasurer review (24h) → VP escalation → President escalation → Purchase → Receipt upload → Reimbursement. Average event budget: $2,500-$8,500 depending on event size.'});

    docs.push({id:'kb-2026-crm',year:'2026-27',category:'data',title:'CRM Data Overview',
      text:'BANF CRM contains 182 unique members from 5 reconciled data sources: Wix CRM (168), Google Contacts (165), membership XLSX (74 with payments), Bosonto pipeline (56), email audit (167). 129 family groups identified. Data quality: 36 members have phone numbers (20%), 74 have payment records (41%), 172 have family groupings. 1064 data issues flagged: 286 membership, 218 payment, 167 profile, 155 family, 141 communication. EC members verified: 8 of 8 in CRM.'});

    docs.push({id:'kb-procurement',year:'general',category:'process',title:'Procurement & Reimbursement Process',
      text:'BANF Procurement Workflow: 1) Any EC member can submit a purchase request with description, budget amount, category, and needed-by date. 2) Treasurer reviews within 24 hours. 3) If not approved in 24h, escalates to VP. 4) If VP does not approve, escalates to President. 5) Once approved, requester makes the purchase and uploads receipt (photo/PDF). 6) Treasurer processes reimbursement via Zelle. Categories: Event Supplies, Food/Catering, Venue Rental, Decorations, Technology, Marketing/Printing, Cultural Program, Administrative, Other. All requests tracked with full audit trail.'});

    this.documents = docs;
    this._buildIndex();
    console.log('[BANF-RAG] Knowledge base initialized:', docs.length, 'documents');
  },

  // ── Simple TF-IDF Vector Index ──
  _buildIndex: function(){
    var self = this;
    self.vectors = self.documents.map(function(doc){
      var text = (doc.title + ' ' + doc.text).toLowerCase();
      var words = text.split(/\W+/).filter(function(w){return w.length > 2;});
      var tf = {};
      words.forEach(function(w){ tf[w] = (tf[w]||0) + 1; });
      // Normalize
      var max = Math.max.apply(null, Object.values(tf));
      Object.keys(tf).forEach(function(k){ tf[k] /= max; });
      return {docId: doc.id, tf: tf, wordCount: words.length};
    });
  },

  // ── Retrieve top-K relevant documents ──
  retrieve: function(query, topK){
    topK = topK || this.topK;
    var qWords = query.toLowerCase().split(/\W+/).filter(function(w){return w.length > 2;});
    var scores = this.vectors.map(function(v, idx){
      var score = 0;
      qWords.forEach(function(qw){
        // Exact match
        if(v.tf[qw]) score += v.tf[qw] * 2;
        // Partial match
        Object.keys(v.tf).forEach(function(dw){
          if(dw.indexOf(qw) >= 0 || qw.indexOf(dw) >= 0) score += v.tf[dw] * 0.5;
        });
      });
      return {idx: idx, score: score};
    });
    scores.sort(function(a,b){return b.score - a.score;});
    var results = [];
    for(var i = 0; i < Math.min(topK, scores.length); i++){
      if(scores[i].score > 0){
        results.push({
          document: this.documents[scores[i].idx],
          score: scores[i].score
        });
      }
    }
    return results;
  },

  // ── Generate answer using HF Inference API ──
  generateAnswer: function(query, callback){
    var self = this;
    var retrieved = self.retrieve(query, 5);
    var context = retrieved.map(function(r){
      return '[' + r.document.year + ' / ' + r.document.category + '] ' + r.document.title + ':\n' + r.document.text;
    }).join('\n\n');

    var systemPrompt = 'You are BANF Admin Assistant, an AI for the Bengali Association of North Florida. ' +
      'Answer questions using ONLY the provided context. Be concise, accurate, and helpful. ' +
      'If the context does not contain enough information, say so. ' +
      'Format amounts with $ and dates clearly. Use bullet points for lists.';

    var messages = [
      {role: 'system', content: systemPrompt},
      {role: 'user', content: 'Context:\n' + context + '\n\nQuestion: ' + query}
    ];

    // Add conversation history for context continuity (last 4 exchanges)
    var histSlice = self.conversationHistory.slice(-4);
    if(histSlice.length > 0){
      var histContext = histSlice.map(function(h){return 'Previous Q: ' + h.q + '\nA: ' + h.a;}).join('\n');
      messages[1].content = 'Previous conversation:\n' + histContext + '\n\n' + messages[1].content;
    }

    // Check if HF token is available
    var token = self.hfToken || localStorage.getItem('banf_hf_token');
    if(!token){
      // Fallback to local KB-only response
      var localAnswer = self._localFallback(query, retrieved);
      self.conversationHistory.push({q: query, a: localAnswer});
      callback(localAnswer, retrieved, 'local-kb');
      return;
    }

    // Call HF Inference API
    var model = self.model;
    fetch('https://api-inference.huggingface.co/models/' + model, {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + token,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: model,
        messages: messages,
        max_tokens: 800,
        temperature: 0.3,
        stream: false
      })
    })
    .then(function(r){
      if(!r.ok){
        // Try fallback model
        return fetch('https://api-inference.huggingface.co/models/' + self.fallbackModel, {
          method: 'POST',
          headers: {'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json'},
          body: JSON.stringify({model: self.fallbackModel, messages: messages, max_tokens: 800, temperature: 0.3})
        });
      }
      return r;
    })
    .then(function(r){ return r.json(); })
    .then(function(data){
      var answer = '';
      if(data.choices && data.choices[0]){
        answer = data.choices[0].message ? data.choices[0].message.content : (data.choices[0].text || '');
      } else if(data[0] && data[0].generated_text){
        answer = data[0].generated_text;
      } else {
        answer = self._localFallback(query, retrieved);
      }
      self.conversationHistory.push({q: query, a: answer});
      callback(answer, retrieved, model);
    })
    .catch(function(err){
      console.warn('[BANF-RAG] API error, using local fallback:', err);
      var localAnswer = self._localFallback(query, retrieved);
      self.conversationHistory.push({q: query, a: localAnswer});
      callback(localAnswer, retrieved, 'local-kb (API unavailable)');
    });
  },

  // ── Local KB fallback (no API needed) ──
  _localFallback: function(query, retrieved){
    if(retrieved.length === 0) return 'I don\'t have enough information to answer that question. Please try asking about BANF events, membership, EC members, or finances.';
    var q = query.toLowerCase();
    var ans = 'Based on BANF records:\n\n';
    retrieved.forEach(function(r){
      ans += '**' + r.document.title + '** (' + r.document.year + '):\n' + r.document.text.substring(0, 300) + '...\n\n';
    });
    return ans;
  }
};


// ══════════════════════════════════════════════════════════════
//  3. EVENT ATTENDANCE & INSIGHT REPORTS
// ══════════════════════════════════════════════════════════════

/**
 * Event report types:
 *   A) ATTENDANCE REPORT: Standard report with attendance details,
 *      membership paid status, category/tier, previous year tier
 *   B) INSIGHT REPORT: YoY comparison (e.g. Holi '25 vs Holi '26),
 *      new members, no-shows, membership payment analysis
 */

window.BANF_EVENTS_DATA = {
  // Historical event data for reports
  events: [
    {id:'EVT-001',name:'Holi 2025',type:'cultural',date:'2025-03-15',year:'2024-25',
     venue:'JCCL Community Center',budget:2800,revenue:3200,
     attendees:[
       {email:'mukhopadhyay.partha@gmail.com',name:'Partha Mukhopadhyay',adults:2,kids:1,checkedIn:true,membershipPaid:true,tier:'EB-Family',prevTier:'EB-Family'},
       {email:'ranadhir.ghosh@gmail.com',name:'Ranadhir Ghosh',adults:2,kids:2,checkedIn:true,membershipPaid:true,tier:'EB-Family',prevTier:'EB-Family'},
       {email:'moumita.mukherje@gmail.com',name:'Dr. Moumita Ghosh',adults:2,kids:0,checkedIn:true,membershipPaid:true,tier:'EB-Family',prevTier:'EB-Single'},
       {email:'duttasoumyajit86@gmail.com',name:'Soumyajit Dutta (Banty)',adults:2,kids:1,checkedIn:true,membershipPaid:true,tier:'EB-Family',prevTier:'EB-Family'},
       {email:'rajanya.ghosh@gmail.com',name:'Rajanya Ghosh',adults:1,kids:0,checkedIn:true,membershipPaid:true,tier:'EB-Single',prevTier:'EB-Single'},
       {email:'ratan.royin@gmail.com',name:'Ratan Roy',adults:2,kids:2,checkedIn:true,membershipPaid:true,tier:'EB-Family',prevTier:'EB-Family'},
       {email:'royc.anindya@gmail.com',name:'Anindya Roy',adults:2,kids:1,checkedIn:true,membershipPaid:true,tier:'EB-Family',prevTier:'NB-Event'},
       {email:'natta.saikat@gmail.com',name:'Saikat Natta',adults:2,kids:0,checkedIn:true,membershipPaid:false,tier:'NB-Event',prevTier:'NB-Event'},
       {email:'supriya.lnct2@gmail.com',name:'Supriya',adults:1,kids:0,checkedIn:true,membershipPaid:true,tier:'EB-Single',prevTier:null},
       {email:'rajibs123@gmail.com',name:'Rajib S',adults:2,kids:2,checkedIn:true,membershipPaid:true,tier:'EB-Family',prevTier:'EB-Family'},
       {email:'dolasinha@yahoo.com',name:'Dola Sinha',adults:2,kids:0,checkedIn:true,membershipPaid:false,tier:'NB-Event',prevTier:'EB-Family'},
       {email:'samiran.kolkata@gmail.com',name:'Samiran',adults:2,kids:1,checkedIn:false,membershipPaid:false,tier:'NB-Event',prevTier:null},
     ],
     totalAdults:85,totalKids:32,totalFamilies:65,newSignups:12,eventTicketRevenue:3200},

    {id:'EVT-002',name:'Bosonto Utsob 2026',type:'cultural',date:'2026-03-22',year:'2026-27',
     venue:'JCCL Community Center',budget:4500,revenue:2490,
     attendees:[
       {email:'mukhopadhyay.partha@gmail.com',name:'Partha Mukhopadhyay',adults:3,kids:0,checkedIn:false,membershipPaid:true,tier:'M2 Premium EB-Family',prevTier:'EB-Family',paymentAmount:375,paymentMethod:'Zelle'},
       {email:'ranadhir.ghosh@gmail.com',name:'Ranadhir Ghosh',adults:2,kids:2,checkedIn:false,membershipPaid:true,tier:'M2 Premium EB-Family',prevTier:'EB-Family',paymentAmount:375,paymentMethod:'Zelle'},
       {email:'moumita.mukherje@gmail.com',name:'Dr. Moumita Ghosh',adults:2,kids:0,checkedIn:false,membershipPaid:false,tier:'Pending',prevTier:'EB-Family',eviteResponse:'Yes'},
       {email:'duttasoumyajit86@gmail.com',name:'Soumyajit Dutta (Banty)',adults:2,kids:1,checkedIn:false,membershipPaid:false,tier:'Pending',prevTier:'EB-Family',eviteResponse:'Yes'},
       {email:'rajanya.ghosh@gmail.com',name:'Rajanya Ghosh',adults:2,kids:0,checkedIn:false,membershipPaid:true,tier:'M2 Premium EB-Family',prevTier:'EB-Single',paymentAmount:375,paymentMethod:'Zelle'},
       {email:'sumo475@gmail.com',name:'Dr. Sumanta Ghosh',adults:2,kids:1,checkedIn:false,membershipPaid:true,tier:'M2 Premium EB-Family',prevTier:null,paymentAmount:375,paymentMethod:'Zelle'},
       {email:'rwitichoudhury@gmail.com',name:'Rwiti Chowdhury',adults:1,kids:0,checkedIn:false,membershipPaid:false,tier:'Pending',prevTier:null,eviteResponse:'Yes'},
       {email:'amit.everywhere@gmail.com',name:'Amit Chandak',adults:2,kids:1,checkedIn:false,membershipPaid:true,tier:'M2 Premium EB-Family',prevTier:'EB-Family',paymentAmount:375,paymentMethod:'Zelle'},
       {email:'ratan.royin@gmail.com',name:'Ratan Roy',adults:2,kids:2,checkedIn:false,membershipPaid:true,tier:'M2 Premium EB-Family',prevTier:'EB-Family',paymentAmount:375,paymentMethod:'Zelle'},
       {email:'royc.anindya@gmail.com',name:'Anindya Roy',adults:2,kids:1,checkedIn:false,membershipPaid:false,tier:'Pending',prevTier:'EB-Family',eviteResponse:'Yes'},
       {email:'natta.saikat@gmail.com',name:'Saikat Natta',adults:2,kids:0,checkedIn:false,membershipPaid:false,tier:'Pending',prevTier:'NB-Event',eviteResponse:'Yes'},
       {email:'dolasinha@yahoo.com',name:'Dola Sinha',adults:2,kids:0,checkedIn:false,membershipPaid:false,tier:'Pending',prevTier:'EB-Family',eviteResponse:'No'},
       {email:'rajibs123@gmail.com',name:'Rajib S',adults:2,kids:2,checkedIn:false,membershipPaid:false,tier:'Pending',prevTier:'EB-Family',eviteResponse:'Yes'},
       {email:'supriya.lnct2@gmail.com',name:'Supriya',adults:1,kids:0,checkedIn:false,membershipPaid:false,tier:'Pending',prevTier:'EB-Single',eviteResponse:'Yes'},
     ],
     totalAdults:45,totalKids:22,totalFamilies:35,newSignups:3,eventTicketRevenue:2490},

    {id:'EVT-003',name:'Durga Puja 2024',type:'cultural',date:'2024-10-12',year:'2024-25',
     venue:'JCCL Community Center',budget:8500,revenue:10000,
     attendees:[],totalAdults:150,totalKids:65,totalFamilies:92,newSignups:18,eventTicketRevenue:10000},
  ]
};


/**
 * Generate Event Attendance Report (Standard)
 * Outputs: HTML report that can be downloaded as PDF/HTML
 */
window.generateAttendanceReport = function(eventId){
  var evt = window.BANF_EVENTS_DATA.events.find(function(e){return e.id === eventId;});
  if(!evt){ if(typeof showToast==='function') showToast('Event not found','var(--red)'); return; }

  var totalAttendees = evt.attendees.length;
  var checkedIn = evt.attendees.filter(function(a){return a.checkedIn;}).length;
  var paid = evt.attendees.filter(function(a){return a.membershipPaid;}).length;
  var unpaid = totalAttendees - paid;

  // Tier distribution
  var tierCounts = {};
  evt.attendees.forEach(function(a){
    var t = a.tier || 'Unknown';
    tierCounts[t] = (tierCounts[t]||0) + 1;
  });

  var now = new Date().toISOString();

  var html = '<!DOCTYPE html><html><head><meta charset="UTF-8">' +
  '<title>BANF Attendance Report — ' + evt.name + '</title>' +
  '<style>' +
  '*{margin:0;padding:0;box-sizing:border-box}' +
  'body{font-family:"Segoe UI",system-ui,sans-serif;background:#0f172a;color:#e2e8f0;padding:30px}' +
  '.container{max-width:1000px;margin:0 auto}' +
  '.header{background:linear-gradient(135deg,#006A4E,#00856F);padding:30px;border-radius:14px;margin-bottom:20px}' +
  '.header h1{color:#fff;font-size:1.6rem}' +
  '.header .sub{color:rgba(255,255,255,.8);font-size:.82rem;margin-top:4px}' +
  '.kpi-row{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:12px;margin:16px 0}' +
  '.kpi{background:#1e293b;border:1px solid #334155;border-radius:10px;padding:16px;text-align:center}' +
  '.kpi .v{font-size:1.8rem;font-weight:800;color:#4ade80}' +
  '.kpi .v.warn{color:#fbbf24} .kpi .v.bad{color:#f87171}' +
  '.kpi .k{font-size:.68rem;color:#94a3b8;text-transform:uppercase;letter-spacing:.5px;margin-top:2px}' +
  '.card{background:#1e293b;border:1px solid #334155;border-radius:10px;padding:18px;margin:14px 0}' +
  'table{width:100%;border-collapse:collapse;font-size:.8rem;margin:10px 0}' +
  'th{background:#334155;color:#94a3b8;padding:8px 10px;text-align:left;font-size:.7rem;text-transform:uppercase;letter-spacing:.4px}' +
  'td{padding:7px 10px;border-bottom:1px solid #1e293b}' +
  'tr:hover{background:rgba(255,255,255,.02)}' +
  '.badge{display:inline-block;padding:2px 8px;border-radius:4px;font-size:.68rem;font-weight:600}' +
  '.badge-green{background:#064e3b;color:#6ee7b7} .badge-red{background:#7f1d1d;color:#fca5a5} .badge-yellow{background:#78350f;color:#fcd34d} .badge-blue{background:#1e3a5f;color:#93c5fd}' +
  '.btn-dl{display:inline-block;padding:8px 16px;border-radius:8px;font-size:.78rem;font-weight:600;cursor:pointer;border:0;margin:4px}' +
  '.btn-pdf{background:#7c3aed;color:#fff} .btn-html{background:#0ea5e9;color:#fff}' +
  'footer{text-align:center;color:#475569;font-size:.7rem;margin-top:30px;padding-top:20px;border-top:1px solid #334155}' +
  '@media print{body{background:#fff;color:#000}.header{background:#006A4E;-webkit-print-color-adjust:exact}.kpi{border:1px solid #ddd}.card{border:1px solid #ddd}th{background:#f0f0f0;color:#333}td{border-bottom:1px solid #eee}.no-print{display:none!important}}' +
  '</style></head><body><div class="container">';

  // Header
  html += '<div class="header"><h1>📋 BANF Event Attendance Report</h1>' +
    '<div class="sub">' + evt.name + ' · ' + evt.date + ' · ' + evt.venue + '</div>' +
    '<div class="sub">Generated: ' + now + '</div></div>';

  // Download buttons
  html += '<div class="no-print" style="margin-bottom:14px;display:flex;gap:8px">' +
    '<button class="btn-dl btn-pdf" onclick="window.print()"><i class="fas fa-file-pdf" style="margin-right:6px"></i>Download as PDF (Print)</button>' +
    '<button class="btn-dl btn-html" onclick="downloadAsHTML()"><i class="fas fa-code" style="margin-right:6px"></i>Download HTML</button></div>';

  // KPIs
  html += '<div class="kpi-row">' +
    '<div class="kpi"><div class="v">' + totalAttendees + '</div><div class="k">Registered</div></div>' +
    '<div class="kpi"><div class="v">' + checkedIn + '</div><div class="k">Checked In</div></div>' +
    '<div class="kpi"><div class="v">' + evt.totalAdults + '</div><div class="k">Total Adults</div></div>' +
    '<div class="kpi"><div class="v">' + evt.totalKids + '</div><div class="k">Total Kids</div></div>' +
    '<div class="kpi"><div class="v">' + evt.totalFamilies + '</div><div class="k">Families</div></div>' +
    '<div class="kpi"><div class="v">' + paid + '</div><div class="k">Membership Paid</div></div>' +
    '<div class="kpi"><div class="v warn">' + unpaid + '</div><div class="k">Unpaid</div></div>' +
    '<div class="kpi"><div class="v">$' + (evt.revenue||0).toLocaleString() + '</div><div class="k">Revenue</div></div>' +
  '</div>';

  // Tier distribution
  html += '<div class="card"><h3 style="font-size:.92rem;margin-bottom:10px">📊 Membership Tier Distribution</h3><table>' +
    '<tr><th>Tier / Category</th><th>Count</th><th>%</th></tr>';
  Object.keys(tierCounts).sort().forEach(function(t){
    var pct = totalAttendees > 0 ? (tierCounts[t]/totalAttendees*100).toFixed(1) : 0;
    html += '<tr><td>' + t + '</td><td>' + tierCounts[t] + '</td><td>' + pct + '%</td></tr>';
  });
  html += '</table></div>';

  // Attendance table
  html += '<div class="card"><h3 style="font-size:.92rem;margin-bottom:10px">👥 Attendee Details</h3><table>' +
    '<tr><th>#</th><th>Name</th><th>Email</th><th>Adults</th><th>Kids</th><th>Checked In</th><th>Membership Paid</th><th>Current Tier</th><th>Previous Tier</th></tr>';
  evt.attendees.forEach(function(a, i){
    var paidBadge = a.membershipPaid ? '<span class="badge badge-green">Paid</span>' : '<span class="badge badge-red">Unpaid</span>';
    var checkBadge = a.checkedIn ? '<span class="badge badge-green">✓</span>' : '<span class="badge badge-yellow">—</span>';
    html += '<tr><td>' + (i+1) + '</td><td>' + a.name + '</td><td>' + a.email + '</td>' +
      '<td>' + (a.adults||0) + '</td><td>' + (a.kids||0) + '</td>' +
      '<td>' + checkBadge + '</td><td>' + paidBadge + '</td>' +
      '<td>' + (a.tier||'—') + '</td><td>' + (a.prevTier||'New') + '</td></tr>';
  });
  html += '</table></div>';

  // Budget summary
  html += '<div class="card"><h3 style="font-size:.92rem;margin-bottom:10px">💰 Budget Summary</h3><table>' +
    '<tr><th>Item</th><th>Amount</th></tr>' +
    '<tr><td>Budget</td><td>$' + (evt.budget||0).toLocaleString() + '</td></tr>' +
    '<tr><td>Revenue</td><td>$' + (evt.revenue||0).toLocaleString() + '</td></tr>' +
    '<tr><td>Net</td><td style="color:' + ((evt.revenue - evt.budget) >= 0 ? '#4ade80' : '#f87171') + '">$' + ((evt.revenue||0) - (evt.budget||0)).toLocaleString() + '</td></tr>' +
  '</table></div>';

  html += '<footer>Bengali Association of North Florida · www.jaxbengali.org · Generated by BANF Admin Portal</footer>';

  // Download support script
  html += '<script>function downloadAsHTML(){var a=document.createElement("a");a.href="data:text/html;charset=utf-8,"+encodeURIComponent(document.documentElement.outerHTML);a.download="BANF_Attendance_' + evt.name.replace(/\s+/g,'_') + '.html";a.click()}<\/script>';

  html += '</div></body></html>';
  return html;
};


/**
 * Generate Event Insight Report (Year-over-Year Comparison)
 */
window.generateInsightReport = function(currentEventId, previousEventId){
  var curr = window.BANF_EVENTS_DATA.events.find(function(e){return e.id === currentEventId;});
  var prev = previousEventId ? window.BANF_EVENTS_DATA.events.find(function(e){return e.id === previousEventId;}) : null;
  if(!curr){ if(typeof showToast==='function') showToast('Event not found','var(--red)'); return; }

  var now = new Date().toISOString();
  var currEmails = new Set(curr.attendees.map(function(a){return a.email;}));
  var prevEmails = prev ? new Set(prev.attendees.map(function(a){return a.email;})) : new Set();

  // New members (in current but not previous)
  var newMembers = curr.attendees.filter(function(a){ return !prevEmails.has(a.email); });
  // Returning (in both)
  var returning = curr.attendees.filter(function(a){ return prevEmails.has(a.email); });
  // Lost (in previous but not current)
  var lost = prev ? prev.attendees.filter(function(a){ return !currEmails.has(a.email); }) : [];
  // Declined with membership unpaid
  var declinedUnpaid = lost.filter(function(a){ return !a.membershipPaid; });
  // Current unpaid
  var currUnpaid = curr.attendees.filter(function(a){ return !a.membershipPaid; });
  // Tier upgrades
  var tierChanges = returning.filter(function(a){ return a.prevTier && a.tier !== a.prevTier; });

  var html = '<!DOCTYPE html><html><head><meta charset="UTF-8">' +
  '<title>BANF Event Insight Report</title>' +
  '<style>' +
  '*{margin:0;padding:0;box-sizing:border-box}' +
  'body{font-family:"Segoe UI",system-ui,sans-serif;background:#0f172a;color:#e2e8f0;padding:30px}' +
  '.container{max-width:1100px;margin:0 auto}' +
  '.header{background:linear-gradient(135deg,#7c3aed,#a855f7);padding:30px;border-radius:14px;margin-bottom:20px}' +
  '.header h1{color:#fff;font-size:1.6rem}' +
  '.header .sub{color:rgba(255,255,255,.8);font-size:.82rem;margin-top:4px}' +
  '.kpi-row{display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:12px;margin:16px 0}' +
  '.kpi{background:#1e293b;border:1px solid #334155;border-radius:10px;padding:14px;text-align:center}' +
  '.kpi .v{font-size:1.6rem;font-weight:800;color:#a78bfa}' +
  '.kpi .v.green{color:#4ade80} .kpi .v.red{color:#f87171} .kpi .v.yellow{color:#fbbf24}' +
  '.kpi .k{font-size:.65rem;color:#94a3b8;text-transform:uppercase;letter-spacing:.5px;margin-top:2px}' +
  '.card{background:#1e293b;border:1px solid #334155;border-radius:10px;padding:18px;margin:14px 0}' +
  '.grid-2{display:grid;grid-template-columns:1fr 1fr;gap:14px}' +
  'table{width:100%;border-collapse:collapse;font-size:.78rem;margin:10px 0}' +
  'th{background:#334155;color:#94a3b8;padding:8px 10px;text-align:left;font-size:.68rem;text-transform:uppercase;letter-spacing:.4px}' +
  'td{padding:6px 10px;border-bottom:1px solid rgba(51,65,85,.5)}' +
  '.badge{display:inline-block;padding:2px 8px;border-radius:4px;font-size:.66rem;font-weight:600}' +
  '.badge-green{background:#064e3b;color:#6ee7b7} .badge-red{background:#7f1d1d;color:#fca5a5} .badge-yellow{background:#78350f;color:#fcd34d} .badge-blue{background:#1e3a5f;color:#93c5fd} .badge-purple{background:#4c1d95;color:#c4b5fd}' +
  '.delta{font-size:.82rem;font-weight:700} .delta.up{color:#4ade80} .delta.down{color:#f87171} .delta.flat{color:#94a3b8}' +
  '.btn-dl{display:inline-block;padding:8px 16px;border-radius:8px;font-size:.78rem;font-weight:600;cursor:pointer;border:0;margin:4px}' +
  '.btn-pdf{background:#7c3aed;color:#fff} .btn-html{background:#0ea5e9;color:#fff}' +
  'footer{text-align:center;color:#475569;font-size:.7rem;margin-top:30px;padding-top:20px;border-top:1px solid #334155}' +
  '@media print{body{background:#fff;color:#000}.header{background:#7c3aed;-webkit-print-color-adjust:exact}.kpi{border:1px solid #ddd}.card{border:1px solid #ddd}th{background:#f0f0f0;color:#333}.no-print{display:none!important}}' +
  '</style></head><body><div class="container">';

  // Header
  html += '<div class="header"><h1>📊 BANF Event Insight Report</h1>' +
    '<div class="sub">' + curr.name + (prev ? ' vs ' + prev.name : '') + '</div>' +
    '<div class="sub">Generated: ' + now + '</div></div>';

  // Download buttons
  html += '<div class="no-print" style="margin-bottom:14px;display:flex;gap:8px">' +
    '<button class="btn-dl btn-pdf" onclick="window.print()">📄 Download as PDF (Print)</button>' +
    '<button class="btn-dl btn-html" onclick="downloadAsHTML()">💾 Download HTML</button></div>';

  // YoY Comparison KPIs
  function delta(curr, prev, suffix){
    suffix = suffix || '';
    if(!prev && prev !== 0) return '<span class="delta flat">New</span>';
    var d = curr - prev;
    var cls = d > 0 ? 'up' : (d < 0 ? 'down' : 'flat');
    return '<span class="delta ' + cls + '">' + (d > 0 ? '↑' : d < 0 ? '↓' : '=') + Math.abs(d) + suffix + '</span>';
  }

  html += '<div class="kpi-row">' +
    '<div class="kpi"><div class="v">' + curr.attendees.length + '</div><div class="k">Registered</div>' + (prev ? delta(curr.attendees.length, prev.attendees.length) : '') + '</div>' +
    '<div class="kpi"><div class="v">' + curr.totalAdults + '</div><div class="k">Adults</div>' + (prev ? delta(curr.totalAdults, prev.totalAdults) : '') + '</div>' +
    '<div class="kpi"><div class="v">' + curr.totalKids + '</div><div class="k">Kids</div>' + (prev ? delta(curr.totalKids, prev.totalKids) : '') + '</div>' +
    '<div class="kpi"><div class="v">' + curr.totalFamilies + '</div><div class="k">Families</div>' + (prev ? delta(curr.totalFamilies, prev.totalFamilies) : '') + '</div>' +
    '<div class="kpi"><div class="v green">' + newMembers.length + '</div><div class="k">New Members</div></div>' +
    '<div class="kpi"><div class="v">' + returning.length + '</div><div class="k">Returning</div></div>' +
    '<div class="kpi"><div class="v red">' + lost.length + '</div><div class="k">Not Returning</div></div>' +
    '<div class="kpi"><div class="v yellow">' + currUnpaid.length + '</div><div class="k">Unpaid RSVPs</div></div>' +
    '<div class="kpi"><div class="v">$' + (curr.revenue||0).toLocaleString() + '</div><div class="k">Revenue</div>' + (prev ? delta(curr.revenue, prev.revenue, '') : '') + '</div>' +
  '</div>';

  // Insight: New Members
  if(newMembers.length > 0){
    html += '<div class="card"><h3 style="font-size:.92rem;margin-bottom:10px;color:#4ade80">🆕 New Members at ' + curr.name + ' (' + newMembers.length + ')</h3><table>' +
      '<tr><th>#</th><th>Name</th><th>Email</th><th>Adults</th><th>Kids</th><th>Paid</th><th>Tier</th></tr>';
    newMembers.forEach(function(a,i){
      html += '<tr><td>'+(i+1)+'</td><td>'+a.name+'</td><td>'+a.email+'</td><td>'+(a.adults||0)+'</td><td>'+(a.kids||0)+'</td>' +
        '<td>'+(a.membershipPaid?'<span class="badge badge-green">Yes</span>':'<span class="badge badge-red">No</span>')+'</td><td>'+( a.tier||'—')+'</td></tr>';
    });
    html += '</table></div>';
  }

  // Insight: Lost Members (not returning)
  if(lost.length > 0){
    html += '<div class="card"><h3 style="font-size:.92rem;margin-bottom:10px;color:#f87171">❌ Members Not Returning (' + lost.length + ')</h3>' +
      '<p style="font-size:.78rem;color:#94a3b8;margin-bottom:8px">Attended ' + (prev?prev.name:'previous event') + ' but did not register for ' + curr.name + '.</p><table>' +
      '<tr><th>#</th><th>Name</th><th>Email</th><th>Was Paid</th><th>Previous Tier</th></tr>';
    lost.forEach(function(a,i){
      html += '<tr><td>'+(i+1)+'</td><td>'+a.name+'</td><td>'+a.email+'</td>' +
        '<td>'+(a.membershipPaid?'<span class="badge badge-green">Yes</span>':'<span class="badge badge-red">No</span>')+'</td><td>'+(a.tier||'—')+'</td></tr>';
    });
    html += '</table></div>';
  }

  // Insight: Tier Changes
  if(tierChanges.length > 0){
    html += '<div class="card"><h3 style="font-size:.92rem;margin-bottom:10px;color:#a78bfa">🔄 Membership Tier Changes (' + tierChanges.length + ')</h3><table>' +
      '<tr><th>Name</th><th>Previous Tier</th><th>→</th><th>Current Tier</th><th>Direction</th></tr>';
    tierChanges.forEach(function(a){
      var dir = (a.tier||'').indexOf('Premium') >= 0 ? '<span class="badge badge-green">Upgrade</span>' : '<span class="badge badge-yellow">Change</span>';
      html += '<tr><td>'+a.name+'</td><td>'+(a.prevTier||'—')+'</td><td>→</td><td>'+(a.tier||'—')+'</td><td>'+dir+'</td></tr>';
    });
    html += '</table></div>';
  }

  // Insight: Unpaid RSVPs needing follow-up
  if(currUnpaid.length > 0){
    html += '<div class="card"><h3 style="font-size:.92rem;margin-bottom:10px;color:#fbbf24">⚠️ Unpaid RSVPs — Payment Follow-up Needed (' + currUnpaid.length + ')</h3><table>' +
      '<tr><th>#</th><th>Name</th><th>Email</th><th>RSVP</th><th>Previous Tier</th><th>Action</th></tr>';
    currUnpaid.forEach(function(a,i){
      html += '<tr><td>'+(i+1)+'</td><td>'+a.name+'</td><td>'+a.email+'</td><td>'+(a.eviteResponse||'—')+'</td><td>'+(a.prevTier||'New')+'</td><td><span class="badge badge-yellow">Send Reminder</span></td></tr>';
    });
    html += '</table></div>';
  }

  // Budget Comparison
  if(prev){
    html += '<div class="card"><h3 style="font-size:.92rem;margin-bottom:10px">💰 Budget Comparison</h3><table>' +
      '<tr><th>Metric</th><th>' + prev.name + '</th><th>' + curr.name + '</th><th>Change</th></tr>' +
      '<tr><td>Budget</td><td>$'+(prev.budget||0).toLocaleString()+'</td><td>$'+(curr.budget||0).toLocaleString()+'</td><td>'+delta(curr.budget,prev.budget)+'</td></tr>' +
      '<tr><td>Revenue</td><td>$'+(prev.revenue||0).toLocaleString()+'</td><td>$'+(curr.revenue||0).toLocaleString()+'</td><td>'+delta(curr.revenue,prev.revenue)+'</td></tr>' +
      '<tr><td>New Signups</td><td>'+(prev.newSignups||0)+'</td><td>'+(curr.newSignups||0)+'</td><td>'+delta(curr.newSignups,prev.newSignups)+'</td></tr>' +
    '</table></div>';
  }

  html += '<footer>Bengali Association of North Florida · www.jaxbengali.org · Event Insight Report</footer>';
  html += '<script>function downloadAsHTML(){var a=document.createElement("a");a.href="data:text/html;charset=utf-8,"+encodeURIComponent(document.documentElement.outerHTML);a.download="BANF_Insight_' + curr.name.replace(/\s+/g,'_') + '.html";a.click()}<\/script>';
  html += '</div></body></html>';
  return html;
};

/**
 * Open report in new window
 */
window.openReportWindow = function(html){
  var win = window.open('', '_blank');
  if(win){
    win.document.write(html);
    win.document.close();
  } else {
    // Fallback: download
    var blob = new Blob([html], {type: 'text/html'});
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'BANF_Report.html';
    a.click();
  }
};


// ══════════════════════════════════════════════════════════════
//  4. PROCUREMENT & REIMBURSEMENT ENHANCEMENTS
// ══════════════════════════════════════════════════════════════

/**
 * Generate procurement summary report
 */
window.generateProcurementReport = function(){
  var requests = typeof PROCUREMENT_REQUESTS !== 'undefined' ? PROCUREMENT_REQUESTS : [];
  var now = new Date().toISOString();
  var totalBudget = requests.reduce(function(s,r){return s + (r.budget||0);},0);
  var totalActual = requests.reduce(function(s,r){return s + (r.actualAmount||0);},0);
  var byStatus = {};
  var byCategory = {};
  requests.forEach(function(r){
    byStatus[r.status] = (byStatus[r.status]||0) + 1;
    byCategory[r.category] = (byCategory[r.category]||0) + 1;
  });

  var html = '<!DOCTYPE html><html><head><meta charset="UTF-8"><title>BANF Procurement Report</title>' +
  '<style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:"Segoe UI",system-ui,sans-serif;background:#0f172a;color:#e2e8f0;padding:30px}' +
  '.container{max-width:900px;margin:0 auto}.header{background:linear-gradient(135deg,#0ea5e9,#06b6d4);padding:30px;border-radius:14px;margin-bottom:20px}' +
  '.header h1{color:#fff;font-size:1.6rem}.header .sub{color:rgba(255,255,255,.8);font-size:.82rem;margin-top:4px}' +
  '.kpi-row{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin:16px 0}' +
  '.kpi{background:#1e293b;border:1px solid #334155;border-radius:10px;padding:16px;text-align:center}' +
  '.kpi .v{font-size:1.6rem;font-weight:800;color:#22d3ee}.kpi .k{font-size:.68rem;color:#94a3b8;text-transform:uppercase;margin-top:2px}' +
  '.card{background:#1e293b;border:1px solid #334155;border-radius:10px;padding:18px;margin:14px 0}' +
  'table{width:100%;border-collapse:collapse;font-size:.8rem;margin:10px 0}' +
  'th{background:#334155;color:#94a3b8;padding:8px 10px;text-align:left;font-size:.7rem;text-transform:uppercase}' +
  'td{padding:7px 10px;border-bottom:1px solid rgba(51,65,85,.5)}' +
  '.btn-dl{display:inline-block;padding:8px 16px;border-radius:8px;font-size:.78rem;font-weight:600;cursor:pointer;border:0;margin:4px}' +
  '.btn-pdf{background:#0ea5e9;color:#fff} .btn-html{background:#06b6d4;color:#fff}' +
  'footer{text-align:center;color:#475569;font-size:.7rem;margin-top:30px}' +
  '@media print{body{background:#fff;color:#000}.header{-webkit-print-color-adjust:exact}.no-print{display:none!important}}</style></head><body><div class="container">';

  html += '<div class="header"><h1>📋 BANF Procurement & Reimbursement Report</h1><div class="sub">Generated: ' + now + '</div></div>';

  html += '<div class="no-print" style="margin-bottom:14px"><button class="btn-dl btn-pdf" onclick="window.print()">📄 Print/PDF</button><button class="btn-dl btn-html" onclick="downloadAsHTML()">💾 Download HTML</button></div>';

  html += '<div class="kpi-row">' +
    '<div class="kpi"><div class="v">' + requests.length + '</div><div class="k">Total Requests</div></div>' +
    '<div class="kpi"><div class="v">$' + totalBudget.toLocaleString() + '</div><div class="k">Total Budget</div></div>' +
    '<div class="kpi"><div class="v">$' + totalActual.toLocaleString() + '</div><div class="k">Actual Spent</div></div>' +
    '<div class="kpi"><div class="v">' + (byStatus.reimbursed||0) + '</div><div class="k">Reimbursed</div></div></div>';

  // Status breakdown
  html += '<div class="card"><h3 style="font-size:.92rem;margin-bottom:10px">Status Breakdown</h3><table>' +
    '<tr><th>Status</th><th>Count</th></tr>';
  Object.keys(byStatus).forEach(function(s){
    html += '<tr><td>' + s + '</td><td>' + byStatus[s] + '</td></tr>';
  });
  html += '</table></div>';

  // All requests
  if(requests.length > 0){
    html += '<div class="card"><h3 style="font-size:.92rem;margin-bottom:10px">All Requests</h3><table>' +
      '<tr><th>#</th><th>Description</th><th>Category</th><th>Budget</th><th>Actual</th><th>Status</th><th>Submitted By</th><th>Date</th></tr>';
    requests.forEach(function(r,i){
      html += '<tr><td>'+(i+1)+'</td><td>'+(r.description||'—')+'</td><td>'+(r.category||'—')+'</td>' +
        '<td>$'+(r.budget||0).toLocaleString()+'</td><td>$'+(r.actualAmount||0).toLocaleString()+'</td>' +
        '<td>'+r.status+'</td><td>'+(r.submittedBy||'—')+'</td><td>'+(r.created||'—')+'</td></tr>';
    });
    html += '</table></div>';
  }

  html += '<footer>Bengali Association of North Florida · Procurement Report</footer>';
  html += '<script>function downloadAsHTML(){var a=document.createElement("a");a.href="data:text/html;charset=utf-8,"+encodeURIComponent(document.documentElement.outerHTML);a.download="BANF_Procurement_Report.html";a.click()}<\/script>';
  html += '</div></body></html>';
  return html;
};


// ══════════════════════════════════════════════════════════════
//  INITIALIZATION — called after DOM ready
// ══════════════════════════════════════════════════════════════

window.initPortalFeatures = function(){
  // 1. Initialize RAG knowledge base
  window.BANF_RAG.initKnowledgeBase();

  // 2. Override alert renderer to use enhanced version
  var origRender = window.renderAll;
  if(typeof origRender === 'function'){
    window.renderAll = function(){
      origRender.call(this);
      // Replace basic alerts with enhanced alerts
      window.renderEnhancedAlerts('critical-alerts-container');
    };
  }

  // 3. Initialize RAG chat panel if it exists
  var ragInput = document.getElementById('rag-chat-input');
  if(ragInput){
    ragInput.addEventListener('keydown', function(e){
      if(e.key === 'Enter' && !e.shiftKey){
        e.preventDefault();
        sendRAGMessage();
      }
    });
  }

  // 4. Populate event report selectors
  populateEventSelectors();

  console.log('[BANF-Features] Portal features v1.0 initialized');
};

// ── RAG Chat UI Functions ──
window.sendRAGMessage = function(){
  var input = document.getElementById('rag-chat-input');
  if(!input) return;
  var query = input.value.trim();
  if(!query) return;
  input.value = '';

  var chatArea = document.getElementById('rag-chat-messages');
  if(!chatArea) return;

  // Show user message
  chatArea.innerHTML += '<div class="rag-msg user"><div class="rag-msg-content">' + escapeHtml(query) + '</div></div>';

  // Show typing indicator
  chatArea.innerHTML += '<div class="rag-msg bot typing" id="rag-typing"><div class="rag-msg-content"><i class="fas fa-spinner fa-spin"></i> Thinking...</div></div>';
  chatArea.scrollTop = chatArea.scrollHeight;

  window.BANF_RAG.generateAnswer(query, function(answer, sources, model){
    var typing = document.getElementById('rag-typing');
    if(typing) typing.remove();

    // Format answer (basic markdown)
    var formatted = answer
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\n/g, '<br>')
      .replace(/- /g, '• ');

    var sourceLabels = sources.slice(0, 3).map(function(s){
      return '<span style="display:inline-block;background:rgba(99,102,241,.15);color:#818cf8;padding:1px 6px;border-radius:3px;font-size:.62rem;margin:1px">' + s.document.year + ': ' + s.document.title + '</span>';
    }).join(' ');

    chatArea.innerHTML += '<div class="rag-msg bot"><div class="rag-msg-content">' + formatted +
      '<div style="margin-top:8px;border-top:1px solid rgba(255,255,255,.06);padding-top:6px">' +
        '<span style="font-size:.6rem;color:#64748b">Sources: ' + sourceLabels + '</span><br>' +
        '<span style="font-size:.58rem;color:#475569">Model: ' + model + '</span>' +
      '</div></div></div>';
    chatArea.scrollTop = chatArea.scrollHeight;
  });
};

function escapeHtml(s){
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

// ── Event Report Selectors ──
window.populateEventSelectors = function(){
  var sel1 = document.getElementById('report-event-select');
  var sel2 = document.getElementById('report-compare-select');
  var sel3 = document.getElementById('insight-event-select');
  var sel4 = document.getElementById('insight-compare-select');
  var events = window.BANF_EVENTS_DATA.events;

  [sel1, sel2, sel3, sel4].forEach(function(sel){
    if(!sel) return;
    var isCompare = sel.id.indexOf('compare') >= 0;
    sel.innerHTML = isCompare ? '<option value="">— None (single event) —</option>' : '<option value="">— Select event —</option>';
    events.forEach(function(e){
      sel.innerHTML += '<option value="' + e.id + '">' + e.name + ' (' + e.date + ')</option>';
    });
  });
};

window.generateSelectedAttendanceReport = function(){
  var sel = document.getElementById('report-event-select');
  if(!sel || !sel.value){ if(typeof showToast==='function') showToast('Select an event first','var(--yellow)'); return; }
  var html = generateAttendanceReport(sel.value);
  if(html) openReportWindow(html);
};

window.generateSelectedInsightReport = function(){
  var sel1 = document.getElementById('insight-event-select');
  var sel2 = document.getElementById('insight-compare-select');
  if(!sel1 || !sel1.value){ if(typeof showToast==='function') showToast('Select an event first','var(--yellow)'); return; }
  var html = generateInsightReport(sel1.value, sel2 ? sel2.value : null);
  if(html) openReportWindow(html);
};

window.generateProcReport = function(){
  var html = generateProcurementReport();
  if(html) openReportWindow(html);
};

// ── Set HF Token ──
window.setHFToken = function(){
  var input = document.getElementById('rag-hf-token');
  if(!input) return;
  var token = input.value.trim();
  if(!token){ if(typeof showToast==='function') showToast('Enter a valid HF token','var(--yellow)'); return; }
  localStorage.setItem('banf_hf_token', token);
  window.BANF_RAG.hfToken = token;
  input.value = '';
  if(typeof showToast==='function') showToast('HF API token saved! RAG AI mode active.','var(--green)');
  var badge = document.getElementById('rag-mode-badge');
  if(badge){ badge.textContent = 'AI Mode (Qwen2.5-7B)'; badge.style.background = 'rgba(16,185,129,.15)'; badge.style.color = '#10b981'; }
};

// Auto-initialize when DOM is ready
if(document.readyState === 'loading'){
  document.addEventListener('DOMContentLoaded', function(){ setTimeout(initPortalFeatures, 100); });
} else {
  setTimeout(initPortalFeatures, 100);
}

})();
