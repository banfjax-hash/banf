/**
 * BANF Knowledge-Based Chatbot Widget v3.0
 * ──────────────────────────────────────────────────────────────
 *  Architecture:
 *    KB-only → Rule-based keyword/knowledge-base engine
 *              Instant responses, always available, no external API calls
 *
 *  Two personas:
 *    • Member chatbot  (green)  — community info, events, membership, portal guide
 *    • Admin chatbot   (orange) — all of above + EC processes, drive status, admin ops
 *
 *  Features:
 *    • Quick-action keyword buttons for common topics
 *    • BLACKLIST: blocks PII, credentials, system internals, jailbreaks
 *    • Individual EC member search by role
 *
 *  Usage:  <script src="banf-chatbot-widget.js"></script>
 *          Self-injects into <body>.  Portal type auto-detected from page title.
 */
(function () {
    'use strict';

    /* ═══════════════════════════════════════════════════════════════════
     *  0.  CONFIG
     * ═══════════════════════════════════════════════════════════════════*/

    /* ═══════════════════════════════════════════════════════════════════
     *  1.  KNOWLEDGE GRAPH — three sensitivity tiers
     *      PUBLIC (0) : member portal + anyone
     *      MEMBER (1) : auth members — EC roster detail, community stats
     *      ADMIN  (2) : EC admin portal — operations, drive, finance overview
     * ═══════════════════════════════════════════════════════════════════*/

    // ── TIER 0: PUBLIC ────────────────────────────────────────────────
    const KB_PUBLIC = {
        // [ORG-001..004] Organization
        org: {
            name:     'Bengali Association of North Florida (BANF)',
            bengali:  'উত্তর ফ্লোরিডা বাঙালী সংঘ',
            altName:  'JAX Bengali',
            founded:  2008,
            type:     '501(c)(3) nonprofit — tax-deductible',
            location: 'Jacksonville, North Florida (Duval County), FL 32256',
            mission:  'Preserve Bengali language, arts, and traditions; connect Bengali families across North Florida; engage youth; support social welfare; promote civic participation.',
            website:  'https://www.jaxbengali.org',
            email:    'banfjax@gmail.com',
            phone:    '(904) 712-2265',
            social: {
                facebook:  'facebook.com/banfofficial',
                instagram: 'instagram.com/banf_jax',
                youtube:   'youtube.com/@banfjacksonville',
                linkedin:  'linkedin.com/company/banf-jacksonville'
            },
            payment: {
                zelle:  'Zelle to banfjax@gmail.com or (904) 712-2265',
                square: 'squareup.com/store/bengali-association-of-north-florida',
                check:  'Payable to: Bengali Association of North Florida (BANF)'
            },
            stats: { persons: 416, families: 105, eventsYearly: 17, founded: 2008 }
        },

        // [MBR-001, MBR-004] Membership Fees — 2026-27 (AUTHORITATIVE)
        membership: {
            season: '2026-2027',
            earlyBirdDeadline: 'May 31, 2026',
            tiers: [
                {
                    code: 'M2-EB',  name: 'M2 Premium (Early Bird)',
                    note: 'Available until May 31, 2026 — includes ALL 17 events',
                    family: 375, couple: 330, individual: 205, student: 145,
                    events: 'All 17 events, voting rights, Jagriti magazine, member portal'
                },
                {
                    code: 'M2',     name: 'M2 Premium',
                    note: 'After May 31, 2026 — full annual membership',
                    family: 410, couple: 365, individual: 230, student: 165,
                    events: 'All 17 events, voting rights, Jagriti magazine, member portal'
                },
                {
                    code: 'M1',     name: 'M1 Regular',
                    note: 'Covers 11 events; discounted entry for remaining 6',
                    family: 280, couple: 255, individual: 140, student: 100,
                    events: '11 events (excludes Bosonto Utsob, Spandan, Saraswati Puja Gala, Mahalaya Sandhya, Kali Puja Gala, Cultural Gala)'
                }
            ],
            specialPasses: [
                { name: 'Culture Special Pass',      covers: '4 cultural events',  family: 200, couple: 175, individual: 100, student: 75  },
                { name: 'Durga Puja Celebration',    covers: '5 events (puja + artist both days)',  family: 210, couple: 175, individual: 110, student: 80  },
                { name: 'Durga Puja Core',           covers: '3 puja events (no artist programs)', family: 150, couple: 125, individual: 80,  student: 60  }
            ],
            howToJoin: 'Pay via Zelle (banfjax@gmail.com) or Square online, then email banfjax@gmail.com with your name, family size, and plan.',
            benefits: 'All plans include: voting rights at GBM, Jagriti magazine copy, member portal access, community directory listing, cultural program participation, Bengali language school access, BANF Radio.'
        },

        // [EVT-001..005] Events — 2026-27 calendar (17 events)
        events: [
            { name: 'Bosonto Utsob (Spring Festival)',      date: 'March 7, 2026',     type: 'Cultural',     m2Only: true  },
            { name: 'Nabo Borsho / Pohela Boishakh',        date: 'April 25, 2026',    type: 'Cultural',     m2Only: false },
            { name: 'Kids Summer Sports Training',          date: 'Jun–Jul 2026',      type: 'Educational',  m2Only: false },
            { name: 'Summer Workshops — Kids',              date: 'Jun–Jul 2026',      type: 'Educational',  m2Only: false },
            { name: 'Summer Workshops — General',           date: 'Jun–Jul 2026',      type: 'Educational',  m2Only: false },
            { name: 'Sports Day',                           date: 'July 2026',         type: 'Social',       m2Only: false },
            { name: 'Spandan (Cultural Show)',              date: 'August 2026',       type: 'Cultural',     m2Only: true  },
            { name: 'Mahalaya Sandhya',                    date: 'October 17, 2026',  type: 'Religious',    m2Only: true  },
            { name: 'Durga Puja Day 1 & 2 + Lunch',       date: 'Oct 24–25, 2026',   type: 'Religious',    m2Only: false },
            { name: 'Lakshmi Puja',                        date: 'October 25, 2026',  type: 'Religious',    m2Only: false },
            { name: 'Bijoya Sonmiloni',                    date: 'October 25, 2026',  type: 'Social',       m2Only: false },
            { name: 'Artist Program Day 1 + Dinner',       date: 'October 24, 2026',  type: 'Cultural',     m2Only: false },
            { name: 'Artist Program Day 2 + Dinner',       date: 'October 25, 2026',  type: 'Cultural',     m2Only: false },
            { name: 'Kali Puja + Food',                    date: 'November 7, 2026',  type: 'Religious',    m2Only: false },
            { name: 'Natok (Drama) + Dinner',              date: 'November 7, 2026',  type: 'Cultural',     m2Only: false },
            { name: 'Winter Picnic',                       date: 'January 2027',      type: 'Social',       m2Only: false },
            { name: 'Saraswati Puja',                      date: 'February 27, 2027', type: 'Religious',    m2Only: true  }
        ],
        upcomingHighlight: 'Bosonto Utsob — March 7, 2026. Features youth programs, cultural performances, traditional spring activities. Contact banfjax@gmail.com to RSVP.',

        // [PRG-001..003] Programs
        programs: [
            {
                name: 'Bengali Language School',
                desc: 'ACTFL-aligned Bengali language program for K–5 children teaching all 4 skills (listening, speaking, reading, writing). Weekly Sat/Sun sessions. Certificate awarded on completion. Heritage and non-heritage learners welcome. Florida Seal of Biliteracy eligible pathway.'
            },
            {
                name: 'Jagriti — Annual Literary Magazine',
                desc: 'BANF\'s annual Bengali literary and cultural e-magazine. Members submit poetry, short stories, essays, artwork. 2024-25 issue has 46 contributions, 22 advertisements. Submit to banfjax@gmail.com with subject "MAGAZINE".'
            },
            {
                name: 'BANF Radio',
                desc: 'Online Bengali music streaming — Rabindra Sangit, Bangla film songs, folk music (Baul, Kirtan), contemporary Bengali music. Accessible via the member portal at jaxbengali.org. Song requests available.'
            },
            {
                name: 'Tagore Worldwide Project',
                desc: 'Cultural diplomacy initiative spreading Rabindranath Tagore\'s works globally. Outreach to governments and universities in India, Bangladesh, USA, Canada, Europe, Australia.'
            },
            {
                name: 'Young Venture Builder Program',
                desc: 'Youth entrepreneurship and development program. Registration at banf-young-venture-builder.lovable.app.'
            }
        ],

        // [FIN-003] Sponsorship
        sponsorship: {
            tiers: [
                { name: 'Title Sponsor',  amount: '$1,000+', benefits: 'Logo on all materials, social media feature, booth at Durga Puja' },
                { name: 'Gold Sponsor',   amount: '$500',    benefits: 'Logo in event programs, social media posts, recognition at events' },
                { name: 'Silver Sponsor', amount: '$250',    benefits: 'Name in event programs, social media mention' },
                { name: 'Bronze Sponsor', amount: '$100',    benefits: 'Name in Jagriti magazine' }
            ],
            contact: 'banfjax@gmail.com',
            currentSponsors: 'Aha Curry, Gulani Vision, Rod Realty, Synergy, Tikka Bowls, Merrill Lynch and 6 others'
        },

        // [GOV-001] Current EC (PUBLIC subset — roles + names only)
        ec2026: {
            term: '2026–2028',
            electedAt: 'GBM February 22, 2026',
            members: [
                { name: 'Dr. Ranadhir Ghosh',   role: 'President / IT Lead'     },
                { name: 'Partha Mukhopadhyay',  role: 'Vice President'           },
                { name: 'Amit Chandak',         role: 'Treasurer'                },
                { name: 'Rajanya Ghosh',        role: 'General Secretary'        },
                { name: 'Dr. Moumita Ghosh',    role: 'Cultural Secretary'       },
                { name: 'Soumyajit Dutta (Banty)', role: 'Food Coordinator'      },
                { name: 'Dr. Sumanta Ghosh',    role: 'Event Coordinator'        },
                { name: 'Rwiti Choudhury',      role: 'Puja Coordinator'         }
            ]
        },

        // Member portal feature list
        memberPortal: [
            { name: 'Dashboard',            status: 'Live',     desc: 'Overview, stats, quick access to all features' },
            { name: 'BANF Assistant',       status: 'Live',     desc: 'Knowledge-based chatbot — events, fees, contacts, EC info' },
            { name: 'Profile & Family',     status: 'Phase 2',  desc: 'Update personal info, manage family members' },
            { name: 'Payments & Receipts',  status: 'Phase 2',  desc: 'Payment history, download receipts, pay membership' },
            { name: 'Events & RSVP',        status: 'Phase 2',  desc: 'Browse events, register, manage RSVPs' },
            { name: 'Member Directory',     status: 'Phase 3',  desc: 'Search members by name or profession' },
            { name: 'Surveys & Polls',      status: 'Phase 3',  desc: 'Community polls and feedback on BANF initiatives' },
            { name: 'Song Requests',        status: 'Phase 3',  desc: 'Request Bengali songs on BANF Radio' },
            { name: 'Meeting Minutes',      status: 'Phase 3',  desc: 'EC meeting summaries and decisions' },
            { name: 'Budget Reports',       status: 'Phase 4',  desc: 'Financial transparency reports' },
            { name: 'Magazine Submissions', status: 'Phase 4',  desc: 'Submit poems, stories, articles for Jagriti' }
        ]
    };

    // ── TIER 1: MEMBER  (adds community stats, EC email contacts) ─────
    const KB_MEMBER = {
        communityStats: {
            totalPersons: 416,
            families: 105,
            activeMembers: 243,
            membershipRecordsAllYears: 886,
            topFamilies: 'Roy (17), Ghosh (15), Dutta (10), Das (7), Pal (5), Mukherjee (5)',
            note: 'Community spans 2008–present. Strongest enrollment 2022–2026.'
        },
        ecContacts: [
            { name: 'Dr. Ranadhir Ghosh',   role: 'President',         email: 'ranadhir.ghosh@gmail.com'      },
            { name: 'Partha Mukhopadhyay',  role: 'Vice President',    email: 'mukhopadhyay.partha@gmail.com' },
            { name: 'Amit Chandak',         role: 'Treasurer',         email: 'amit.everywhere@gmail.com'        },
            { name: 'Rajanya Ghosh',        role: 'Gen. Secretary',    email: 'rajanya.ghosh@gmail.com'       },
            { name: 'Dr. Moumita Ghosh',    role: 'Cultural Sec.',     email: 'moumita.mukherje@gmail.com'    },
            { name: 'Soumyajit Dutta (Banty)', role: 'Food Coordinator',  email: 'duttasoumyajit86@gmail.com'    },
            { name: 'Dr. Sumanta Ghosh',    role: 'Event Coordinator', email: 'sumo475@gmail.com'             },
            { name: 'Rwiti Choudhury',      role: 'Puja Coordinator',  email: 'rwitichoudhury@gmail.com'      }
        ],
        previousEC: {
            term: '2024–2026',
            president: 'Suvankar Pal', vp: ['Anita Mandal', 'Tanay Bhaduri'],
            secretary: 'Partha Mukhopadhyay', treasurer: 'Sreya Ghosh'
        },
        gbm2026: {
            date: 'February 22, 2026', time: '3pm–6pm EST',
            result: 'New EC 2026–2028 elected. Dr. Ranadhir Ghosh as President.',
            note: 'Annual governance meeting — highest decision-making body'
        }
    };

    // ── TIER 2: ADMIN  (adds EC drive, portal panels, ops context) ────
    const KB_ADMIN = {
        ecDrive: {
            fiscalYear: 'FY2026-27',
            total: 8,
            signedUp: 1,     // Dr. Ranadhir Ghosh — Feb 15, 2026
            pending: 7,
            lastReminderTo: 'Partha Mukhopadhyay (VP) — March 4, 2026',
            signupUrl: 'https://www.jaxbengali.org/ec-signup.html'
        },
        roles: [
            { role: 'super-admin',         access: 'Full platform — all panels, settings, data, analytics' },
            { role: 'admin',               access: 'Operational — members, events, email campaigns, CRM' },
            { role: 'ec-member',           access: 'Drive status, feedback, limited CRM views' },
            { role: 'business-stakeholder',access: 'Stakeholder drive, feedback pipeline, sponsorship portal' },
            { role: 'member',              access: 'Member portal — profile, events, radio, directory' }
        ],
        adminPanels: [
            { name: 'Dashboard',          status: 'Live',     roles: 'all',                          desc: 'KPIs, activity feed, quick actions' },
            { name: 'User Management',    status: 'Phase 2',  roles: 'super-admin, admin',            desc: 'CRM search, role assignment, identity management' },
            { name: 'Role Definitions',   status: 'Phase 2',  roles: 'super-admin',                  desc: 'Define roles, data-view capabilities, permissions' },
            { name: 'EC Drive',           status: 'Phase 2',  roles: 'super-admin, admin',            desc: 'EC year onboarding — 24hr signup links, reminders' },
            { name: 'Stakeholder Drive',  status: 'Phase 2',  roles: 'super-admin, admin, business-stakeholder', desc: 'Sponsor + community partner invitations' },
            { name: 'Drive Status',       status: 'Phase 2',  roles: 'super-admin, admin, ec-member', desc: 'Live dashboard of all drive metrics' },
            { name: 'Feedback Pipeline',  status: 'Phase 3',  roles: 'super-admin, admin, business-stakeholder', desc: 'Feedback → design change → board → tech → dev' },
            { name: 'Identity Engine',    status: 'Phase 3',  roles: 'super-admin',                  desc: 'Multi-dimensional identity resolution (no DOB policy)' },
            { name: 'Dev Board',          status: 'Phase 3',  roles: 'super-admin',                  desc: 'Approved items from feedback pipeline for dev team' },
            { name: 'Activity Log',       status: 'Phase 3',  roles: 'super-admin, admin',            desc: 'All admin actions with timestamp for audit compliance' },
            { name: 'E2E Test Suite',     status: 'Phase 4',  roles: 'super-admin',                  desc: 'End-to-end test of entire workflow' }
        ],
        portals: {
            main:        'https://www.jaxbengali.org',
            memberPortal:'https://www.jaxbengali.org/member-portal.html',
            adminPortal: 'https://www.jaxbengali.org/admin-portal.html',
            ecSignup:    'https://www.jaxbengali.org/ec-signup.html',
            ecLogin:     'https://banfjax-hash.github.io/banf/ec-admin-login.html',
            memberLogin: 'https://banfjax-hash.github.io/banf/member-login.html'
        },
        financeOverview: {
            note: 'ADMIN ONLY — not for general queries',
            revenue2526: '$23,885 from membership fees (80 paid members, 2025-26)',
            totalTransactions: 1085,
            revenueTarget2627: '80+ active families',
            eventBudget2526: '$30,500+ total event allocation'
        }
    };


    /* ═══════════════════════════════════════════════════════════════════
     *  2.  BLACKLIST  — blocks sensitive queries
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
     *  3.  KB ENGINE  — rule-based, instant, always works
     * ═══════════════════════════════════════════════════════════════════*/

    function kbAnswer(query) {
        const q = query.toLowerCase().trim();
        const org = KB_PUBLIC.org;
        const mbr = KB_PUBLIC.membership;

        // ── Blacklist check ──
        if (isBlacklisted(query)) {
            return '🔒 Sorry, I\'m not authorized to share that type of information. I can only help with general BANF community information such as events, membership fees, and public contact details.';
        }

        // ── Empty / very short ──
        if (q.length < 2) return 'Please type a question about BANF — events, membership, fees, or community info!';

        // ── Greetings ──
        if (/^(hi|hello|hey|namaste|namaskar|shubho)\b/.test(q)) {
            return '🙏 Namaskar! Welcome to BANF — the Bengali Association of North Florida. How can I help you? Ask me about events, membership plans, fees, EC team, or our community programs!';
        }

        // ── About BANF ──
        if (/about\s*banf|what\s*is\s*banf|tell\s*me\s*about|who\s*is\s*banf|organization|founded/.test(q)) {
            return `🏛️ **${org.name}** (${org.bengali})\n\nFounded in ${org.founded} in ${org.location}.\n${org.type}\n\n${org.mission}\n\n📊 ${org.stats.persons} persons · ${org.stats.families} families · ${org.stats.eventsYearly} events/year.`;
        }

        // ── Membership Fees ──
        if (/fee|price|cost|membership\s*(plan|tier|rate|price|category)|how\s*much|premium|earlybird|early\s*bird|regular\s*member|special\s*pass|culture\s*pass|puja\s*(pass|celebration|core)|student|family\s*fee|couple\s*fee|individual/.test(q)) {
            // Specific tier query
            for (const t of mbr.tiers) {
                const tk = t.name.toLowerCase();
                if (q.includes('early bird') || q.includes('earlybird') || q.includes('m2-eb')) {
                    if (tk.includes('early')) return `💰 **${t.name}**\n• Family: $${t.family} | Couple: $${t.couple} | Individual: $${t.individual} | Student: $${t.student}\n📋 ${t.events}\n📌 ${t.note}`;
                }
                if ((q.includes('regular') || q.includes('m1')) && tk.includes('regular')) {
                    return `💰 **${t.name}**\n• Family: $${t.family} | Couple: $${t.couple} | Individual: $${t.individual} | Student: $${t.student}\n📋 ${t.events}\n📌 ${t.note}`;
                }
            }
            // Full fee table
            let resp = `💰 **BANF Membership Fees — ${mbr.season}**\n⏰ Early Bird deadline: **${mbr.earlyBirdDeadline}**\n\n`;
            mbr.tiers.forEach(t => {
                resp += `**${t.name}:** Family $${t.family} | Couple $${t.couple} | Individual $${t.individual} | Student $${t.student}\n`;
            });
            resp += `\n**Special Passes:**\n`;
            mbr.specialPasses.forEach(p => {
                resp += `• ${p.name}: Fam $${p.family} | Couple $${p.couple} | Ind $${p.individual} | Student $${p.student} (${p.covers})\n`;
            });
            resp += `\n💡 ${mbr.benefits}`;
            return resp;
        }

        // ── Events ──
        if (/event|program|calendar|what.?s\s*happening|upcoming|schedule|when\s*is|next\s*event|bosonto|nabo\s*borsho|pohela|durga|puja|kali|saraswati|picnic|sports|spandan|spondon|natok|drama|bijoya|lakshmi|mahaloya|mohaloya/.test(q)) {
            const evts = KB_PUBLIC.events;
            for (const ev of evts) {
                const ek = ev.name.toLowerCase();
                if (q.includes(ek) || ek.split(/\s+/).some(w => w.length > 4 && q.includes(w))) {
                    return `📅 **${ev.name}**\n📆 Date: ${ev.date}\n🏷️ Type: ${ev.type}${ev.m2Only ? '\n⭐ M2 Premium plan only' : ''}`;
                }
            }
            let resp = `📅 **BANF Events — ${mbr.season}** (17 events)\n\n🌟 **Upcoming:** ${KB_PUBLIC.upcomingHighlight}\n\n`;
            evts.forEach((ev, i) => {
                resp += `${i + 1}. **${ev.name}** — ${ev.date} [${ev.type}]${ev.m2Only ? ' ⭐' : ''}\n`;
            });
            resp += `\n⭐ = M2 Premium plan only`;
            return resp;
        }

        // ── EC Team ──
        if (/ec\s*team|ec\s*member|executive|committee|president|vice\s*president|treasurer|secretary|who\s*runs|leadership|board|cultural\s*sec|food\s*coord|event\s*coord|puja\s*coord/.test(q)) {
            // Check for individual role queries first
            const roleMap = {
                'president':      m => m.role.toLowerCase().includes('president') && !m.role.toLowerCase().includes('vice'),
                'vice president': m => m.role.toLowerCase().includes('vice president'),
                'treasurer':      m => m.role.toLowerCase().includes('treasurer'),
                'secretary':      m => m.role.toLowerCase().includes('secretary') && !m.role.toLowerCase().includes('cultural'),
                'cultural':       m => m.role.toLowerCase().includes('cultural'),
                'food':           m => m.role.toLowerCase().includes('food'),
                'event coord':    m => m.role.toLowerCase().includes('event'),
                'puja':           m => m.role.toLowerCase().includes('puja')
            };
            for (const [keyword, matcher] of Object.entries(roleMap)) {
                if (q.includes(keyword)) {
                    const found = KB_PUBLIC.ec2026.members.find(matcher);
                    if (found) {
                        const contact = KB_MEMBER.ecContacts.find(c => c.name === found.name);
                        let resp = `👤 **${found.name}** — ${found.role}\n_(EC ${KB_PUBLIC.ec2026.term}, elected ${KB_PUBLIC.ec2026.electedAt})_`;
                        if (contact && contact.email) resp += `\n📧 ${contact.email}`;
                        resp += `\n\n_Ask "EC team" to see the full roster._`;
                        return resp;
                    }
                }
            }
            // Full roster
            let resp = `👥 **BANF Executive Committee ${KB_PUBLIC.ec2026.term}**\n_(${KB_PUBLIC.ec2026.electedAt})_\n\n`;
            KB_PUBLIC.ec2026.members.forEach(m => {
                resp += `• **${m.name}** — ${m.role}\n`;
            });
            return resp;
        }

        // ── Contact ──
        if (/contact|email|reach|phone|call|write\s*to|get\s*in\s*touch/.test(q)) {
            return `📧 **Contact BANF**\n\n• Email: ${org.email}\n• Phone: ${org.phone}\n• Facebook: ${org.social.facebook}\n• Instagram: ${org.social.instagram}\n• YouTube: ${org.social.youtube}\n• Pay (Zelle): ${org.payment.zelle}\n• Pay (Square): ${org.payment.square}`;
        }

        // ── Social Media ──
        if (/facebook|instagram|youtube|linkedin|social\s*media|follow/.test(q)) {
            return `📱 **BANF Social Media**\n\n• Facebook: ${org.social.facebook}\n• Instagram: ${org.social.instagram}\n• YouTube: ${org.social.youtube}\n• LinkedIn: ${org.social.linkedin}`;
        }

        // ── Radio ──
        if (/radio|music|song|listen|stream/.test(q)) {
            const r = KB_PUBLIC.programs.find(p => p.name === 'BANF Radio');
            return `🎵 **BANF Radio**\n\n${r ? r.desc : 'BANF streams Bengali music 24/7 via the member portal at jaxbengali.org.'}\n\nTune in via the Member Portal at www.jaxbengali.org.`;
        }

        // ── Bengali Language School ──
        if (/school|bengali\s*school|language|actfl|class|kids\s*learn|heritage/.test(q)) {
            const s = KB_PUBLIC.programs.find(p => p.name.includes('Language School'));
            return `🎓 **Bengali Language School**\n\n${s ? s.desc : 'BANF runs an ACTFL-aligned Bengali language school for K-5 children.'}`;
        }

        // ── Jagriti Magazine ──
        if (/jagriti|magazine|e-mag|literary|publish|submit\s*article/.test(q)) {
            const s = KB_PUBLIC.programs.find(p => p.name.includes('Jagriti'));
            return `📖 **Jagriti Literary Magazine**\n\n${s ? s.desc : 'BANF\'s annual Bengali literary and cultural magazine.'}`;
        }

        // ── Sponsorship ──
        if (/sponsor|donate|support|contribute|fund|partner/.test(q)) {
            const sp = KB_PUBLIC.sponsorship;
            let resp = `🤝 **BANF Sponsorship Opportunities**\n\n`;
            sp.tiers.forEach(t => { resp += `• **${t.name}** (${t.amount}): ${t.benefits}\n`; });
            resp += `\n📧 Contact: ${sp.contact}\nCurrent sponsors: ${sp.currentSponsors}`;
            return resp;
        }

        // ── Payment / Join ──
        if (/pay|square|zelle|how\s*to\s*(pay|join)|register|sign\s*up|become\s*a\s*member|renew/.test(q)) {
            return `💳 **How to Join / Pay Membership**\n\n${mbr.howToJoin}\n\n• ${org.payment.zelle}\n• Square: ${org.payment.square}\n• ${org.payment.check}\n\n⏰ Early Bird pricing until **${mbr.earlyBirdDeadline}**`;
        }

        // ── Website ──
        if (/website|site|url|link|homepage|portal/.test(q)) {
            return `🌐 **BANF Website**: ${KB_PUBLIC.org.website}\n\nThe website includes membership plans, events calendar, EC team profiles, announcements, radio, and sponsorship information.`;
        }

        // ── Fallback ──
        return '🤔 I can help with:\n• **Events** — all 17 events with dates\n• **Membership fees** — M2 Premium EB/Regular + Special Passes\n• **Contact info** — email, phone, social media, payment\n• **EC Team** — 2026-28 leadership roster\n• **Programs** — Bengali school, Radio, Jagriti magazine, Tagore project\n• **Sponsorship** — tiers and opportunities\n• **Portal features** — what\'s Live vs coming in Phase 2/3/4\n\nPlease ask about any of these!';
    }


    /* ═══════════════════════════════════════════════════════════════════
     *  4.  MAIN ANSWER  — KB-only (instant, no external API)
     * ═══════════════════════════════════════════════════════════════════*/

    function answer(query) {
        const q = query.toLowerCase().trim();

        // Apply blacklist first
        if (isBlacklisted(query)) {
            return '🔒 I\'m not authorized to share that type of information. I can help with BANF events, membership fees, EC team info, and community contacts.';
        }
        if (q.length < 2) return 'Please type a question about BANF!';

        // KB engine
        return kbAnswer(query);
    }


    /* ═══════════════════════════════════════════════════════════════════
     *  5.  CHAT WIDGET UI  — floating bubble with keyword suggestions
     * ═══════════════════════════════════════════════════════════════════*/
    const WIDGET_HTML = `
<div id="banf-chat-widget" style="position:fixed;bottom:20px;right:20px;z-index:99999;font-family:'Segoe UI',system-ui,sans-serif;">
  <!-- Chat Bubble -->
  <div id="banf-chat-bubble" style="width:60px;height:60px;border-radius:50%;background:linear-gradient(135deg,#006A4E,#00856F);color:#fff;display:flex;align-items:center;justify-content:center;cursor:pointer;box-shadow:0 6px 25px rgba(0,106,78,0.4);transition:transform .2s;font-size:1.5rem;" onclick="banfChatToggle()">
    <i class="fas fa-robot"></i>
  </div>
  <!-- Unread dot -->
  <div id="banf-chat-unread" style="position:absolute;top:-2px;right:-2px;width:18px;height:18px;border-radius:50%;background:#ef4444;color:#fff;font-size:10px;display:flex;align-items:center;justify-content:center;font-weight:700;pointer-events:none;">1</div>
  <!-- Chat Panel -->
  <div id="banf-chat-panel" style="display:none;position:absolute;bottom:75px;right:0;width:390px;max-width:calc(100vw - 40px);height:540px;max-height:calc(100vh - 120px);background:#fff;border-radius:16px;box-shadow:0 12px 50px rgba(0,0,0,0.2);overflow:hidden;flex-direction:column;">
    <!-- Header -->
    <div style="background:linear-gradient(135deg,#006A4E,#00856F);color:#fff;padding:14px 18px;display:flex;align-items:center;gap:12px;">
      <div style="width:40px;height:40px;border-radius:50%;background:rgba(255,255,255,0.2);display:flex;align-items:center;justify-content:center;font-size:1.1rem;">
        <i class="fas fa-robot"></i>
      </div>
      <div style="flex:1;">
        <div style="font-weight:700;font-size:.95rem;">BANF Sahayak <span style="font-size:.55rem;opacity:.8">সহায়ক</span> <span style="font-size:.62rem;background:rgba(255,255,255,.25);border-radius:4px;padding:1px 5px;margin-left:4px;letter-spacing:.3px;">KB</span></div>
        <div style="font-size:.72rem;opacity:.85;"><span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:#4ade80;margin-right:4px;vertical-align:middle;"></span>Official BANF Agent · Always available</div>
      </div>
      <div style="cursor:pointer;font-size:1.2rem;opacity:.8;" onclick="banfChatToggle()" title="Close">✕</div>
    </div>
    <!-- Messages -->
    <div id="banf-chat-messages" style="flex:1;overflow-y:auto;padding:16px;display:flex;flex-direction:column;gap:12px;background:#f8fafc;">
      <!-- Welcome message -->
      <div class="banf-msg bot">
        <div style="background:linear-gradient(135deg,#ecfdf5,#d1fae5);border:1px solid #a7f3d0;border-radius:12px 12px 12px 4px;padding:12px 16px;max-width:88%;font-size:.88rem;color:#064e3b;line-height:1.5;">
          🙏 <strong>Namaskar!</strong> Welcome — I’m <strong>BANF Sahayak</strong> (সহায়ক), the official AI assistant of BANF.<br><br>
          I can help you with events, membership fees, EC team info, portal features, contacts, payments, and more.<br><br>
          <em style="font-size:.75rem;color:#059669;">⚡ BANF Sahayak · Application Agent · Always available</em>
        </div>
      </div>
      <!-- Quick-action keyword buttons -->
      <div id="banf-quick-actions" style="display:flex;flex-wrap:wrap;gap:6px;padding:0 2px;">
        <button onclick="banfQuickAsk('membership fees')" style="background:#ecfdf5;border:1px solid #a7f3d0;border-radius:20px;padding:6px 14px;font-size:.78rem;color:#065f46;cursor:pointer;transition:all .2s;font-family:inherit;" onmouseover="this.style.background='#d1fae5'" onmouseout="this.style.background='#ecfdf5'">💰 Membership</button>
        <button onclick="banfQuickAsk('events')" style="background:#ecfdf5;border:1px solid #a7f3d0;border-radius:20px;padding:6px 14px;font-size:.78rem;color:#065f46;cursor:pointer;transition:all .2s;font-family:inherit;" onmouseover="this.style.background='#d1fae5'" onmouseout="this.style.background='#ecfdf5'">📅 Events</button>
        <button onclick="banfQuickAsk('ec team')" style="background:#ecfdf5;border:1px solid #a7f3d0;border-radius:20px;padding:6px 14px;font-size:.78rem;color:#065f46;cursor:pointer;transition:all .2s;font-family:inherit;" onmouseover="this.style.background='#d1fae5'" onmouseout="this.style.background='#ecfdf5'">👥 EC Members</button>
        <button onclick="banfQuickAsk('president')" style="background:#ecfdf5;border:1px solid #a7f3d0;border-radius:20px;padding:6px 14px;font-size:.78rem;color:#065f46;cursor:pointer;transition:all .2s;font-family:inherit;" onmouseover="this.style.background='#d1fae5'" onmouseout="this.style.background='#ecfdf5'">🏛️ President</button>
        <button onclick="banfQuickAsk('contact')" style="background:#ecfdf5;border:1px solid #a7f3d0;border-radius:20px;padding:6px 14px;font-size:.78rem;color:#065f46;cursor:pointer;transition:all .2s;font-family:inherit;" onmouseover="this.style.background='#d1fae5'" onmouseout="this.style.background='#ecfdf5'">📧 Contact</button>
        <button onclick="banfQuickAsk('programs')" style="background:#ecfdf5;border:1px solid #a7f3d0;border-radius:20px;padding:6px 14px;font-size:.78rem;color:#065f46;cursor:pointer;transition:all .2s;font-family:inherit;" onmouseover="this.style.background='#d1fae5'" onmouseout="this.style.background='#ecfdf5'">📚 Programs</button>
        <button onclick="banfQuickAsk('sponsorship')" style="background:#ecfdf5;border:1px solid #a7f3d0;border-radius:20px;padding:6px 14px;font-size:.78rem;color:#065f46;cursor:pointer;transition:all .2s;font-family:inherit;" onmouseover="this.style.background='#d1fae5'" onmouseout="this.style.background='#ecfdf5'">🤝 Sponsorship</button>
        <button onclick="banfQuickAsk('how to pay')" style="background:#ecfdf5;border:1px solid #a7f3d0;border-radius:20px;padding:6px 14px;font-size:.78rem;color:#065f46;cursor:pointer;transition:all .2s;font-family:inherit;" onmouseover="this.style.background='#d1fae5'" onmouseout="this.style.background='#ecfdf5'">💳 Payment</button>
      </div>
    </div>
    <!-- Input -->
    <div style="padding:10px 14px;border-top:1px solid #e5e7eb;background:#fff;display:flex;gap:8px;">
      <input id="banf-chat-input" type="text" placeholder="Ask about events, fees, EC team..." style="flex:1;padding:10px 14px;border:2px solid #e5e7eb;border-radius:25px;font-size:.88rem;outline:none;transition:border .2s;" onfocus="this.style.borderColor='#006A4E'" onblur="this.style.borderColor='#e5e7eb'" onkeydown="if(event.key==='Enter')banfChatSend()">
      <button onclick="banfChatSend()" id="banf-chat-btn" style="width:42px;height:42px;border-radius:50%;background:linear-gradient(135deg,#006A4E,#00856F);color:#fff;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:1rem;flex-shrink:0;" title="Send">
        <i class="fas fa-paper-plane"></i>
      </button>
    </div>
  </div>
</div>`;

    /* ═══════════════════════════════════════════════════════════════════
     *  6.  ADMIN variant — orange theme
     * ═══════════════════════════════════════════════════════════════════*/
    const WIDGET_HTML_ADMIN = WIDGET_HTML
        .replace(/#006A4E/g, '#f97316')
        .replace(/#00856F/g, '#ea580c')
        .replace(/#ecfdf5/g, '#fff7ed')
        .replace(/#d1fae5/g, '#ffedd5')
        .replace(/#a7f3d0/g, '#fed7aa')
        .replace(/#064e3b/g, '#7c2d12')
        .replace(/#065f46/g, '#9a3412')
        .replace(/#059669/g, '#c2410c')
        .replace(/#4ade80/g, '#fb923c')
        .replace(/BANF Sahayak/g, 'BANF Sahayak (Admin)');


    /* ═══════════════════════════════════════════════════════════════════
     *  7.  INJECT + GLOBAL FUNCTIONS
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

        // Quick-action button helper — auto-fills input and sends
        window.banfQuickAsk = function (text) {
            const input = document.getElementById('banf-chat-input');
            if (input) input.value = text;
            // Hide quick-action buttons after first use
            const qa = document.getElementById('banf-quick-actions');
            if (qa) qa.style.display = 'none';
            banfChatSend();
        };

        window.banfChatSend = function () {
            const input  = document.getElementById('banf-chat-input');
            const messages = document.getElementById('banf-chat-messages');
            if (!input || !messages) return;
            const text = input.value.trim();
            if (!text) return;
            input.value = '';

            // Hide quick-action buttons once user starts chatting
            const qa = document.getElementById('banf-quick-actions');
            if (qa) qa.style.display = 'none';

            // User message bubble
            messages.innerHTML += `<div class="banf-msg user" style="display:flex;justify-content:flex-end;"><div style="background:linear-gradient(135deg,${isAdmin ? '#f97316' : '#006A4E'},${isAdmin ? '#ea580c' : '#00856F'});color:#fff;border-radius:12px 12px 4px 12px;padding:10px 16px;max-width:80%;font-size:.88rem;line-height:1.4;">${escHtml(text)}</div></div>`;

            // Get KB response (instant — no loading indicator needed)
            const resp = answer(text);
            const formatted = formatResponse(resp);
            messages.innerHTML += `<div class="banf-msg bot"><div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px 12px 12px 4px;padding:12px 16px;max-width:88%;font-size:.88rem;color:#1e293b;line-height:1.5;">${formatted}</div></div>`;
            messages.scrollTop = messages.scrollHeight;
            input.focus();
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
