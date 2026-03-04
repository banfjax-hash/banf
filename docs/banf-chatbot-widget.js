/**
 * BANF Secure RAG Chatbot Widget
 * ─────────────────────────────
 * Strictly implements a BLACKLIST policy:
 *   - Only answers queries using pre-loaded context from the BANF landing page
 *   - Blocks any request for personal member data, financials, admin credentials, etc.
 *   - Context: events, membership fees, website info, social media, EC contacts (public only)
 *
 * Usage:  <script src="banf-chatbot-widget.js"></script>
 *         It self-injects into <body> and renders a floating chat bubble.
 */
(function () {
    'use strict';

    /* ═══════════════════════════════════════════════════════════════════
     *  1.  KNOWLEDGE BASE  — extracted from the official landing page
     * ═══════════════════════════════════════════════════════════════════*/
    const KB = {
        organization: {
            name: 'Bengali Association of North Florida (BANF)',
            bengali: 'উত্তর ফ্লোরিডা বাঙালী সংঘ',
            founded: 2008,
            location: 'Jacksonville, North Florida',
            mission: 'Preserving Bengali culture, traditions, and heritage in Jacksonville — Building bridges between generations through community, celebration, and service.',
            website: 'https://www.jaxbengali.org',
            email: 'membership@jaxbengali.org',
            sponsorshipEmail: 'sponsorship@jaxbengali.org',
            facebook: 'https://facebook.com/banfofficial',
            instagram: 'https://instagram.com/banf_jax',
            youtube: 'https://youtube.com/@banfjacksonville',
            linkedin: 'https://linkedin.com/company/banf-jacksonville',
            paymentSquare: 'https://squareup.com/store/bengali-association-of-north-florida',
            stats: { families: '80+', eventsYearly: '17', yearsFounded: '17+' }
        },

        membershipFees: {
            season: '2026-2027',
            earlyBirdDeadline: 'May 31, 2026',
            categories: [
                {
                    name: 'Earlybird Premium',
                    events: 'All 17 events',
                    note: 'Available until May 31, 2026',
                    family: 375, couple: 330, individual: 205, student: 145
                },
                {
                    name: 'Premium',
                    events: 'All 17 events',
                    note: 'Full access to every event',
                    family: 410, couple: 365, individual: 230, student: 165
                },
                {
                    name: 'Regular',
                    events: '11 events (pay discounted rate for other events)',
                    note: 'Covers 11 events, discounted rate for remaining 6',
                    family: 280, couple: 255, individual: 140, student: 100
                },
                {
                    name: 'Culture Special Pass',
                    events: '4 cultural events',
                    note: 'Covers cultural events only',
                    family: 200, couple: 175, individual: 100, student: 75
                },
                {
                    name: 'Durga Puja Celebration Pass',
                    events: '5 events (Puja + Artist performances both days)',
                    note: 'Covers Durga Puja and artist performances for both days',
                    family: 210, couple: 175, individual: 110, student: 80
                },
                {
                    name: 'Durga Puja Core Pass',
                    events: '3 Puja events (No artist programs)',
                    note: 'Covers Durga Puja events only — no artist performances',
                    family: 150, couple: 125, individual: 80, student: 60
                }
            ]
        },

        events: [
            { name: 'Bosonto Utsob', date: 'March 7, 2026', type: 'Cultural' },
            { name: 'Noboborsho', date: 'April 25, 2026', type: 'Cultural' },
            { name: 'Kids Summer Sports Training', date: 'Jun-Jul 2026', type: 'Educational' },
            { name: 'Summer Workshops - Kids', date: 'Jun-Jul 2026', type: 'Educational' },
            { name: 'Summer Workshops - General', date: 'Jun-Jul 2026', type: 'Educational' },
            { name: 'Sports Day', date: 'July 2026', type: 'Social' },
            { name: 'Spondon', date: 'August 2026', type: 'Cultural' },
            { name: 'Mohaloya', date: 'October 17, 2026', type: 'Religious' },
            { name: 'Durga Puja Day 1 & 2 + Lunch', date: 'October 24-25, 2026', type: 'Religious' },
            { name: 'Lakshmi Puja', date: 'October 25, 2026', type: 'Religious' },
            { name: 'Bijoya Sonmiloni', date: 'October 25, 2026', type: 'Social' },
            { name: 'Artist Program - Day 1 + Dinner', date: 'October 24, 2026', type: 'Cultural' },
            { name: 'Artist Program - Day 2 + Dinner', date: 'October 25, 2026', type: 'Cultural' },
            { name: 'Kali Puja + Lunch', date: 'November 7, 2026', type: 'Religious' },
            { name: 'Natok (Drama) + Dinner', date: 'November 7, 2026', type: 'Cultural' },
            { name: 'Winter Picnic', date: 'January 2027', type: 'Social' },
            { name: 'Saraswati Puja', date: 'February 27, 2027', type: 'Religious' }
        ],

        ecTeam: [
            { name: 'Ranadhir Ghosh', role: 'President' },
            { name: 'Sumanta Ghosh', role: 'Vice President' },
            { name: 'Amit Chandak', role: 'Treasurer' },
            { name: 'Rajanya Ghosh', role: 'Secretary' },
            { name: 'Moumita Bhattacharya', role: 'Cultural Secretary' },
            { name: 'Rwiti Shankar', role: 'Communication Head' },
            { name: 'Partha Chakraborty', role: 'Community Outreach' },
            { name: 'Banty Khan', role: 'Youth Coordinator' }
        ],

        radioInfo: 'BANF Radio offers 24/7 Bengali music, news, and cultural programs.',

        sponsorshipTiers: [
            { name: 'Title Sponsor', amount: '$5,000+' },
            { name: 'Gold Sponsor', amount: '$2,500' },
            { name: 'Silver Sponsor', amount: '$1,000' },
            { name: 'Community Supporter', amount: '$500' }
        ],

        footerNote: 'Early bird discount will be available to all members till 31st May, 2026. Celebrate our culture, strengthen our community, and preserve our heritage! Join us to keep our Bengali roots alive, to connect, and to celebrate together!'
    };


    /* ═══════════════════════════════════════════════════════════════════
     *  2.  BLACKLIST  — topics / patterns that MUST be rejected
     * ═══════════════════════════════════════════════════════════════════*/
    const BLACKLIST_PATTERNS = [
        // Personal data
        /\b(ssn|social\s*security|tax\s*id|ein|passport|driver.*license|date\s*of\s*birth|dob)\b/i,
        /\b(personal\s*(data|info|details|record)|private\s*info)\b/i,
        /\b(home\s*address|street\s*address|zip\s*code|phone\s*number|cell\s*number)\b/i,
        // Financial data
        /\b(bank\s*account|routing\s*number|credit\s*card|debit\s*card|account\s*number)\b/i,
        /\b(salary|income|compensation|net\s*worth)\b/i,
        /\b(transaction\s*history|payment\s*history|financial\s*record|bank\s*statement)\b/i,
        // Member private data
        /\b(member.*email|member.*phone|member.*address|member.*list|contact\s*list)\b/i,
        /\b(who\s*(paid|hasn.?t\s*paid)|payment\s*status\s*of|dues\s*of)\b/i,
        /\b(family\s*member.*of|children\s*of|spouse\s*of|kids\s*of)\b/i,
        // Credentials & access
        /\b(password|credential|api\s*key|secret|token|login\s*info)\b/i,
        /\b(admin\s*(access|password|credentials)|hack|exploit|bypass|inject)\b/i,
        // System internals
        /\b(database|sql|mongo|firebase|backend\s*code|source\s*code|server\s*config)\b/i,
        /\b(crm\s*data|raw\s*data|dump|export\s*all|scrape)\b/i,
        // Harmful
        /\b(ignore\s*(previous|above)|system\s*prompt|jailbreak|pretend\s*you|act\s*as)\b/i,
        /\b(bypass\s*restriction|override\s*policy|forget\s*instructions)\b/i,
    ];

    function isBlacklisted(query) {
        return BLACKLIST_PATTERNS.some(rx => rx.test(query));
    }


    /* ═══════════════════════════════════════════════════════════════════
     *  3.  RAG ANSWER ENGINE  — simple keyword + fuzzy matching
     * ═══════════════════════════════════════════════════════════════════*/
    function answer(query) {
        const q = query.toLowerCase().trim();

        // ── Blacklist check ──
        if (isBlacklisted(query)) {
            return '🔒 Sorry, I\'m not authorized to share that type of information. I can only help with general BANF community information such as events, membership fees, and public contact details.';
        }

        // ── Empty / very short ──
        if (q.length < 2) return 'Please type a question about BANF — events, membership, fees, or community info!';

        // ── Greetings ──
        if (/^(hi|hello|hey|namaste|namaskar|shubho)\b/.test(q)) {
            return '🙏 Namaskar! Welcome to BANF — the Bengali Association of North Florida. How can I help you? Ask me about events, membership plans, fees, or our community!';
        }

        // ── About BANF ──
        if (/about\s*banf|what\s*is\s*banf|tell\s*me\s*about|who\s*is\s*banf|organization/.test(q)) {
            return `🏛️ **${KB.organization.name}** (${KB.organization.bengali})\n\nFounded in ${KB.organization.founded} in ${KB.organization.location}.\n\n${KB.organization.mission}\n\n📊 ${KB.organization.stats.families} active families • ${KB.organization.stats.eventsYearly} events/year • ${KB.organization.stats.yearsFounded} years of heritage.`;
        }

        // ── Membership Fees ──
        if (/fee|price|cost|membership\s*(plan|tier|rate|price|category)|how\s*much|premium|earlybird|early\s*bird|regular\s*member|special\s*pass|culture\s*pass|puja\s*(pass|celebration|core)|student\s*fee|family\s*fee|couple\s*fee|individual\s*fee/.test(q)) {
            let resp = `💰 **BANF Membership Fees — ${KB.membershipFees.season}**\n\n⏰ Early Bird Deadline: ${KB.membershipFees.earlyBirdDeadline}\n\n`;

            // Check if asking about a specific category
            for (const cat of KB.membershipFees.categories) {
                const catKey = cat.name.toLowerCase();
                if (q.includes(catKey) || (q.includes('earlybird') && catKey.includes('earlybird')) || (q.includes('early bird') && catKey.includes('earlybird'))) {
                    return `💰 **${cat.name}** (${KB.membershipFees.season})\n• Family: $${cat.family}\n• Couple: $${cat.couple}\n• Individual: $${cat.individual}\n• Student: $${cat.student}\n\n📋 ${cat.events}\n📌 ${cat.note}`;
                }
            }

            // General fee overview
            KB.membershipFees.categories.forEach(cat => {
                resp += `**${cat.name}:** Family $${cat.family} | Couple $${cat.couple} | Individual $${cat.individual} | Student $${cat.student}\n`;
            });
            resp += `\n💡 ${KB.footerNote}`;
            return resp;
        }

        // ── Events ──
        if (/event|program|calendar|what.?s\s*happening|upcoming|schedule|when\s*is|next\s*event|bosonto|noboborsho|durga|puja|kali|saraswati|picnic|sports|spondon|natok|drama|bijoya|lakshmi|mohaloya/.test(q)) {
            // Check for a specific event
            for (const ev of KB.events) {
                if (q.includes(ev.name.toLowerCase()) || ev.name.toLowerCase().split(' ').some(w => w.length > 3 && q.includes(w))) {
                    return `📅 **${ev.name}**\n📆 Date: ${ev.date}\n🏷️ Type: ${ev.type}`;
                }
            }

            // List all events
            let resp = `📅 **BANF Events — ${KB.membershipFees.season}**\n\n`;
            KB.events.forEach((ev, i) => {
                resp += `${i + 1}. **${ev.name}** — ${ev.date} (${ev.type})\n`;
            });
            resp += `\nTotal: 17 events across cultural, religious, educational, and social categories.`;
            return resp;
        }

        // ── EC Team ──
        if (/ec\s*team|executive|committee|president|vice\s*president|treasurer|secretary|who\s*runs|leadership|board|cultural\s*secretary|communication|outreach|youth\s*coordinator/.test(q)) {
            let resp = '👥 **BANF Executive Committee (EC) 2026-27**\n\n';
            KB.ecTeam.forEach(m => {
                resp += `• **${m.name}** — ${m.role}\n`;
            });
            return resp;
        }

        // ── Contact ──
        if (/contact|email|reach|phone|call|write\s*to|get\s*in\s*touch/.test(q)) {
            return `📧 **Contact BANF**\n\n• Membership: ${KB.organization.email}\n• Sponsorship: ${KB.organization.sponsorshipEmail}\n• Facebook: ${KB.organization.facebook}\n• Instagram: ${KB.organization.instagram}\n• YouTube: ${KB.organization.youtube}\n• Payment: ${KB.organization.paymentSquare}`;
        }

        // ── Social Media ──
        if (/facebook|instagram|youtube|linkedin|social\s*media|whatsapp|follow/.test(q)) {
            return `📱 **BANF Social Media**\n\n• Facebook: ${KB.organization.facebook}\n• Instagram: ${KB.organization.instagram}\n• YouTube: ${KB.organization.youtube}\n• LinkedIn: ${KB.organization.linkedin}`;
        }

        // ── Radio ──
        if (/radio|music|song|listen|stream/.test(q)) {
            return `🎵 **BANF Radio**\n\n${KB.radioInfo}\nTune in 24/7 for Bengali music, Rabindra Sangeet, and cultural programs.`;
        }

        // ── Sponsorship ──
        if (/sponsor|donate|support|contribute|fund|partner/.test(q)) {
            let resp = '🤝 **Become a BANF Sponsor — ' + KB.membershipFees.season + '**\n\n';
            KB.sponsorshipTiers.forEach(t => {
                resp += `• **${t.name}**: ${t.amount}\n`;
            });
            resp += `\n📧 Contact: ${KB.organization.sponsorshipEmail}`;
            return resp;
        }

        // ── Payment ──
        if (/pay|square|how\s*to\s*(pay|join)|register|sign\s*up|become\s*a\s*member/.test(q)) {
            return `💳 **How to Join / Pay**\n\n1. Visit our payment page: ${KB.organization.paymentSquare}\n2. Email: ${KB.organization.email}\n3. Choose from 6 membership categories (Earlybird Premium, Premium, Regular, or Special Passes)\n\n⏰ Early Bird pricing available until ${KB.membershipFees.earlyBirdDeadline}!`;
        }

        // ── Website ──
        if (/website|site|url|link|homepage|portal/.test(q)) {
            return `🌐 **BANF Website**: ${KB.organization.website}\n\nThe website includes membership plans, events calendar, EC team profiles, announcements, radio, and sponsorship information.`;
        }

        // ── Fallback ──
        return '🤔 I can help with:\n• **Events** — dates, details, coverage\n• **Membership fees** — all 6 categories with prices\n• **Contact info** — email, social media\n• **EC Team** — leadership profiles\n• **Sponsorship** — tiers and contact\n• **Radio** — BANF 24/7 stream\n\nPlease ask about any of these topics!';
    }


    /* ═══════════════════════════════════════════════════════════════════
     *  4.  CHAT WIDGET UI  — self-injecting floating bubble
     * ═══════════════════════════════════════════════════════════════════*/
    const WIDGET_HTML = `
<div id="banf-chat-widget" style="position:fixed;bottom:20px;right:20px;z-index:99999;font-family:'Segoe UI',system-ui,sans-serif;">
  <!-- Chat Bubble -->
  <div id="banf-chat-bubble" style="width:60px;height:60px;border-radius:50%;background:linear-gradient(135deg,#006A4E,#00856F);color:#fff;display:flex;align-items:center;justify-content:center;cursor:pointer;box-shadow:0 6px 25px rgba(0,106,78,0.4);transition:transform .2s;font-size:1.5rem;" onclick="banfChatToggle()">
    <i class="fas fa-comment-dots"></i>
  </div>
  <!-- Unread dot -->
  <div id="banf-chat-unread" style="position:absolute;top:-2px;right:-2px;width:18px;height:18px;border-radius:50%;background:#ef4444;color:#fff;font-size:10px;display:flex;align-items:center;justify-content:center;font-weight:700;pointer-events:none;">1</div>
  <!-- Chat Panel -->
  <div id="banf-chat-panel" style="display:none;position:absolute;bottom:75px;right:0;width:380px;max-width:calc(100vw - 40px);height:520px;max-height:calc(100vh - 120px);background:#fff;border-radius:16px;box-shadow:0 12px 50px rgba(0,0,0,0.2);overflow:hidden;flex-direction:column;">
    <!-- Header -->
    <div style="background:linear-gradient(135deg,#006A4E,#00856F);color:#fff;padding:16px 18px;display:flex;align-items:center;gap:12px;">
      <div style="width:40px;height:40px;border-radius:50%;background:rgba(255,255,255,0.2);display:flex;align-items:center;justify-content:center;font-size:1.1rem;">
        <i class="fas fa-robot"></i>
      </div>
      <div style="flex:1;">
        <div style="font-weight:700;font-size:.95rem;">BANF Assistant</div>
        <div style="font-size:.72rem;opacity:.85;"><span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:#4ade80;margin-right:4px;vertical-align:middle;"></span>Online — Ask me about BANF!</div>
      </div>
      <div style="cursor:pointer;font-size:1.2rem;opacity:.8;" onclick="banfChatToggle()" title="Close">✕</div>
    </div>
    <!-- Messages -->
    <div id="banf-chat-messages" style="flex:1;overflow-y:auto;padding:16px;display:flex;flex-direction:column;gap:12px;background:#f8fafc;">
      <!-- Welcome message -->
      <div class="banf-msg bot">
        <div style="background:linear-gradient(135deg,#ecfdf5,#d1fae5);border:1px solid #a7f3d0;border-radius:12px 12px 12px 4px;padding:12px 16px;max-width:85%;font-size:.88rem;color:#064e3b;line-height:1.5;">
          🙏 <strong>Namaskar!</strong> Welcome to BANF Assistant.<br><br>
          I can help you with:<br>
          • Events & schedule<br>
          • Membership fees & plans<br>
          • Contact & social media<br>
          • EC team info<br>
          • Sponsorship details<br><br>
          <em style="font-size:.78rem;color:#059669;">🔒 I only share publicly available BANF community information.</em>
        </div>
      </div>
    </div>
    <!-- Input -->
    <div style="padding:12px 16px;border-top:1px solid #e5e7eb;background:#fff;display:flex;gap:8px;">
      <input id="banf-chat-input" type="text" placeholder="Ask about events, fees, contacts..." style="flex:1;padding:10px 14px;border:2px solid #e5e7eb;border-radius:25px;font-size:.88rem;outline:none;transition:border .2s;" onfocus="this.style.borderColor='#006A4E'" onblur="this.style.borderColor='#e5e7eb'" onkeydown="if(event.key==='Enter')banfChatSend()">
      <button onclick="banfChatSend()" style="width:42px;height:42px;border-radius:50%;background:linear-gradient(135deg,#006A4E,#00856F);color:#fff;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:1rem;transition:transform .15s;" onmouseenter="this.style.transform='scale(1.08)'" onmouseleave="this.style.transform='scale(1)'">
        <i class="fas fa-paper-plane"></i>
      </button>
    </div>
  </div>
</div>`;

    /* ═══════════════════════════════════════════════════════════════════
     *  5.  ADMIN variant — orange theme
     * ═══════════════════════════════════════════════════════════════════*/
    const WIDGET_HTML_ADMIN = WIDGET_HTML
        .replace(/#006A4E/g, '#f97316')
        .replace(/#00856F/g, '#ea580c')
        .replace(/#ecfdf5/g, '#fff7ed')
        .replace(/#d1fae5/g, '#ffedd5')
        .replace(/#a7f3d0/g, '#fed7aa')
        .replace(/#064e3b/g, '#7c2d12')
        .replace(/#059669/g, '#c2410c')
        .replace(/#4ade80/g, '#fb923c')
        .replace(/BANF Assistant/g, 'BANF Admin Assistant');


    /* ═══════════════════════════════════════════════════════════════════
     *  6.  INJECT + GLOBAL FUNCTIONS
     * ═══════════════════════════════════════════════════════════════════*/
    function init() {
        const isAdmin = document.title.toLowerCase().includes('admin') || document.body.classList.contains('admin-portal');
        const div = document.createElement('div');
        div.innerHTML = isAdmin ? WIDGET_HTML_ADMIN : WIDGET_HTML;
        document.body.appendChild(div);

        // Make panel flex after first toggle
        window.banfChatToggle = function () {
            const panel = document.getElementById('banf-chat-panel');
            const unread = document.getElementById('banf-chat-unread');
            if (!panel) return;
            if (panel.style.display === 'none' || panel.style.display === '') {
                panel.style.display = 'flex';
                if (unread) unread.style.display = 'none';
                setTimeout(() => {
                    const inp = document.getElementById('banf-chat-input');
                    if (inp) inp.focus();
                }, 100);
            } else {
                panel.style.display = 'none';
            }
        };

        window.banfChatSend = function () {
            const input = document.getElementById('banf-chat-input');
            const messages = document.getElementById('banf-chat-messages');
            if (!input || !messages) return;
            const text = input.value.trim();
            if (!text) return;
            input.value = '';

            // User message
            messages.innerHTML += `<div class="banf-msg user" style="display:flex;justify-content:flex-end;"><div style="background:linear-gradient(135deg,${isAdmin ? '#f97316' : '#006A4E'},${isAdmin ? '#ea580c' : '#00856F'});color:#fff;border-radius:12px 12px 4px 12px;padding:10px 16px;max-width:80%;font-size:.88rem;line-height:1.4;">${escHtml(text)}</div></div>`;

            // Typing indicator
            const typingId = 'typing-' + Date.now();
            messages.innerHTML += `<div id="${typingId}" class="banf-msg bot"><div style="background:#f1f5f9;border-radius:12px;padding:10px 16px;max-width:60px;display:flex;gap:4px;"><span style="width:6px;height:6px;border-radius:50%;background:#94a3b8;animation:banfDot .8s infinite .0s;">·</span><span style="width:6px;height:6px;border-radius:50%;background:#94a3b8;animation:banfDot .8s infinite .2s;">·</span><span style="width:6px;height:6px;border-radius:50%;background:#94a3b8;animation:banfDot .8s infinite .4s;">·</span></div></div>`;
            messages.scrollTop = messages.scrollHeight;

            // Delayed response for natural feel
            setTimeout(() => {
                const typingEl = document.getElementById(typingId);
                if (typingEl) typingEl.remove();

                const resp = answer(text);
                const formatted = formatResponse(resp);
                messages.innerHTML += `<div class="banf-msg bot"><div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px 12px 12px 4px;padding:12px 16px;max-width:85%;font-size:.88rem;color:#1e293b;line-height:1.5;">${formatted}</div></div>`;
                messages.scrollTop = messages.scrollHeight;
            }, 400 + Math.random() * 400);
        };
    }

    function escHtml(str) {
        const d = document.createElement('div');
        d.appendChild(document.createTextNode(str));
        return d.innerHTML;
    }

    function formatResponse(text) {
        // Simple markdown-like formatting
        return text
            .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
            .replace(/\n/g, '<br>')
            .replace(/•/g, '&bull;')
            .replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" rel="noopener" style="color:#006A4E;word-break:break-all;">$1</a>');
    }

    // Add typing animation CSS
    const style = document.createElement('style');
    style.textContent = `
        @keyframes banfDot { 0%,80%,100%{opacity:.3} 40%{opacity:1} }
        #banf-chat-messages::-webkit-scrollbar { width: 4px; }
        #banf-chat-messages::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
        #banf-chat-bubble:hover { transform: scale(1.1); }
    `;
    document.head.appendChild(style);

    // Init on DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
