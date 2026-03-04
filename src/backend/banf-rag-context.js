/**
 * BANF RAG Context Engine v1.0
 * Role-based, sensitivity-tiered knowledge base
 * Sources: banf-data_ingest/ + survey/ (170+ documents, 44 digitized)
 *
 * Sensitivity Levels:
 *   PUBLIC       (0) - Anyone: general info, events, programs
 *   MEMBER       (1) - Authenticated members: EC roster, community stats
 *   ADMIN        (2) - Admin/Super-Admin: financials, governance, legal
 *   SUPER_ADMIN  (3) - Super-Admin only: individual records, tax, payments
 */

import wixData from 'wix-data';

// ─────────────────────────────────────────────────────────────
// SENSITIVITY CONSTANTS
// ─────────────────────────────────────────────────────────────
export const SENSITIVITY = {
    PUBLIC:      'public',
    MEMBER:      'member',
    ADMIN:       'admin',
    SUPER_ADMIN: 'super_admin'
};

export const SENSITIVITY_RANK = {
    'public':      0,
    'member':      1,
    'admin':       2,
    'super_admin': 3
};

export const ROLE_MAX_SENSITIVITY = {
    'guest':       SENSITIVITY.PUBLIC,
    'member':      SENSITIVITY.MEMBER,
    'admin':       SENSITIVITY.ADMIN,
    'super_admin': SENSITIVITY.SUPER_ADMIN
};

// ─────────────────────────────────────────────────────────────
// STATIC KNOWLEDGE BASE
// 170+ documents analysed and chunked into structured knowledge
// ─────────────────────────────────────────────────────────────
export const KNOWLEDGE_BASE = [

    // ═══════════════════════════════════════════════
    // CATEGORY: ORGANIZATION (PUBLIC)
    // ═══════════════════════════════════════════════
    {
        chunkId: 'ORG-001',
        category: 'organization',
        sensitivity: SENSITIVITY.PUBLIC,
        title: 'BANF Overview',
        sourceDocument: 'survey/banf_web/wix-embed-landing-v2.html, multiple docs',
        keywords: ['banf', 'bengali association', 'jacksonville', 'florida', 'founded', 'mission'],
        content: `BANF (Bengali Association of North Florida) was established in 2008 and serves the Bengali diaspora community in Jacksonville, Florida and surrounding areas. The organization is a 501(c)(3) tax-exempt nonprofit. Website: www.jaxbengali.org. The organization's formal name is Bengali Association of North Florida. It brings together Bengali families for cultural, social, educational, and charitable activities. The community maintains both Indian and Bangladeshi heritage traditions.`
    },
    {
        chunkId: 'ORG-002',
        category: 'organization',
        sensitivity: SENSITIVITY.PUBLIC,
        title: 'BANF Mission & Values',
        sourceDocument: 'survey/output/banf_complete_static_v3.html',
        keywords: ['mission', 'values', 'cultural', 'heritage', 'community', 'preservation'],
        content: `BANF's mission focuses on: (1) Cultural Preservation — maintaining Bengali language, arts, and traditions; (2) Community Cohesion — connecting Bengali families across North Florida; (3) Youth Engagement — programs for next-generation heritage learners; (4) Social Welfare — supporting community members in need; (5) Education — Bengali language school and scholarship programs; (6) Civic Participation — promoting civic awareness and community service. The organization celebrated its founding by Suvendu Chattopadhyay and early members and has grown to 416+ members across 105+ families.`
    },
    {
        chunkId: 'ORG-003',
        category: 'organization',
        sensitivity: SENSITIVITY.PUBLIC,
        title: 'BANF Contact & Social Media',
        sourceDocument: 'survey/banf1-wix/src/public/banf-landing-preview-v2.html',
        keywords: ['contact', 'email', 'facebook', 'instagram', 'youtube', 'address'],
        content: `BANF Contact Information: Email: banfjax@gmail.com. Social Media: Facebook: facebook.com/banfofficial | Instagram: instagram.com/banf_jax | YouTube: youtube.com/@banfjacksonville. Website: www.jaxbengali.org. Located in Jacksonville, Florida 32256. Zelle payment: banfjax@gmail.com.`
    },
    {
        chunkId: 'ORG-004',
        category: 'organization',
        sensitivity: SENSITIVITY.PUBLIC,
        title: 'BANF 501(c)(3) Status',
        sourceDocument: 'banf-data_ingest/grant_readiness_assessment.html',
        keywords: ['501c3', 'nonprofit', 'tax exempt', 'irs', 'charitable', 'tax deductible'],
        content: `BANF is a registered 501(c)(3) nonprofit organization. Donations are tax-deductible. The organization files IRS Form 990 annually. EIN and tax registration are maintained in compliance with Florida charitable organization regulations. Membership fees, event revenues, and sponsorships constitute the primary income sources. The organization maintains transparency with annual financial reporting available to members.`
    },

    // ═══════════════════════════════════════════════
    // CATEGORY: EVENTS (PUBLIC)
    // ═══════════════════════════════════════════════
    {
        chunkId: 'EVT-001',
        category: 'events',
        sensitivity: SENSITIVITY.PUBLIC,
        title: 'Annual Events Calendar — 2026',
        sourceDocument: 'banf-data_ingest/BANF_DATA_INSIGHTS_REPORT.md + 13 event PDFs + 2026 calendar',
        keywords: ['events', 'calendar', 'durga puja', 'holi', 'kali puja', 'nabo borsho', 'saraswati', 'spandan', 'winter picnic', 'sports', 'bosonto', 'bosonto utsob', '2026'],
        content: `BANF hosts 10+ annual community events (2026 calendar):\n(1) Bosonto Utsob / Boshonto Utsab (March 22, 2026 — spring festival, youth programs, cultural performances);\n(2) Holi (March — spring festival of colors);\n(3) Nabo Borsho / Pohela Boishakh (April — Bengali New Year community celebration);\n(4) Spandan (Spring cultural show — performing arts, music, dance showcase);\n(5) Sports Day / Summer Picnic (Summer — family sports competition);\n(6) Mahalaya (September/October — spiritual ceremony preceding Durga Puja);\n(7) Durga Puja (flagship event, October — largest attendance, 8 documented instances, multi-day festival with Dhak, Sindur Khela, cultural performances, Bengali cuisine);\n(8) Kali Puja (November);\n(9) Saraswati Puja (January/February — education-culture themed);\n(10) Winter Picnic (December — holiday gathering).\nGBM (General Body Meeting) held annually (most recently February 22, 2026, new EC 2026-2028 elected).\nM2 Premium members: all 17 events. M1 Regular members: 11 events.`
    },
    {
        chunkId: 'EVT-002',
        category: 'events',
        sensitivity: SENSITIVITY.PUBLIC,
        title: 'Durga Puja — Flagship Event',
        sourceDocument: 'banf-data_ingest/data/22-24EC/DurgaPuja.pdf, data/24-26EC/DurgaPuja-25.pdf',
        keywords: ['durga puja', 'puja', 'cultural', 'festival', 'october', 'religious'],
        content: `Durga Puja is BANF's annual flagship event held in October. It is the largest community gathering featuring traditional Bengali cultural performances (music, dance, drama), authentic Bengali cuisine, Dhak (traditional percussion), Sindur Khela, and Protimovisarjan (idol immersion). The event spans multiple days. Puja Secretary oversees religious arrangements. Event planning documents span 2022-2025 with detailed logistics, vendor arrangements, and community participation records.`
    },
    {
        chunkId: 'EVT-003',
        category: 'events',
        sensitivity: SENSITIVITY.PUBLIC,
        title: 'GBM 2026 — General Body Meeting',
        sourceDocument: 'banf-data_ingest/data/BANF-GBM-31st March 2024.pdf, GBM_2026_Flyer.png',
        keywords: ['gbm', 'general body meeting', '2026', 'election', 'annual meeting', 'governance'],
        content: `BANF  General Body Meeting (GBM) 2026 was scheduled for Sunday, February 22, 2026, 3pm–6pm EST. The GBM is the annual governance event where members vote on key matters including new EC election, budget approval, and community resolutions. Previous GBM was held March 31, 2024. The GBM is the highest decision-making body of BANF. All active paid members are eligible to vote. Agenda typically includes: President's report, Treasurer's financial report, EC elections (every 2 years), constitutional amendments, and open Q&A.`
    },
    {
        chunkId: 'EVT-005',
        category: 'events',
        sensitivity: SENSITIVITY.PUBLIC,
        title: 'Bosonto Utsob 2026 — Spring Festival',
        sourceDocument: 'banf-crm-reconciliation.json + bosonto-utsob-2026-report.html',
        keywords: ['bosonto', 'boshonto', 'bosonto utsob', 'spring', 'spring festival', 'march 2026', 'youth', 'kids', 'cultural show'],
        content: `Bosonto Utsob 2026 is BANF's spring cultural festival celebrating the Bengali new spring season (Basanta). Scheduled for March 22, 2026, it features: cultural performances (music, dance), youth engagement programs, spring-themed activities for kids and families, traditional Bengali spring cuisine, and community social gathering. The event includes a Kids & Youth Engagement Initiative as part of BANF's 2026 strategic program. Young Venture Builder program registration is open (banf-young-venture-builder.lovable.app). RSVPs tracked via Evite. Attendance tracking via BANF CRM. M2 Premium members receive complimentary entry; M1 Regular members may attend at event rate. Contact banfjax@gmail.com for RSVP details.`
    },
    {
        chunkId: 'EVT-004',
        category: 'events',
        sensitivity: SENSITIVITY.PUBLIC,
        title: 'Jagriti Magazine',
        sourceDocument: 'banf-data_ingest/data/24-26EC/Jagriti 2022.xlsx, Jagriti 2023.xlsx',
        keywords: ['jagriti', 'magazine', 'literary', 'cultural', 'publication', 'annual'],
        content: `Jagriti is BANF's annual Bengali literary and cultural magazine. It features contributions from community members including poetry, short stories, essays, and artwork. Two issues have been digitized (2022 and 2023). The 2024-25 issue has 46 contributions and 22 advertisement sponsors. Top contributors include Prabir Mandal, Chandrani Ghosh, Syna Ghosh, Swatiskha Dutta, Sumana di, Sukanta Dutta, Subrata Chattopadhyay, Shomendu Maitra, Sharmistha Poddar. Submissions are open to all BANF members. Magazine advertisers include local businesses like Aha Curry, Gulani Vision, Tikka Bowls, Synergy, and Rod Realty.`
    },

    // ═══════════════════════════════════════════════
    // CATEGORY: PROGRAMS (PUBLIC)
    // ═══════════════════════════════════════════════
    {
        chunkId: 'PRG-001',
        category: 'programs',
        sensitivity: SENSITIVITY.PUBLIC,
        title: 'Bengali Language School Program',
        sourceDocument: 'banf-data_ingest/context/bengali_school.txt',
        keywords: ['bengali school', 'language', 'ACTFL', 'curriculum', 'youth', 'heritage', 'education', 'certificate'],
        content: `BANF operates the Bengali Club of North Florida Language Education Program following ACTFL (American Council on the Teaching of Foreign Languages) standards. The program teaches Bengali to heritage and non-heritage learners in grades K–5 through scheduled weekly sessions (typically Sat/Sun). Curriculum covers 4 skills: Listening, Speaking, Reading, Writing. Assessment uses ACTFL "Can-Do" statements at Novice Low/Mid/High levels. Students receive a Certificate of Elementary Bengali Language Proficiency upon completion. All instructors hold bachelor's degrees and native/near-native Bengali fluency. Short-term goals: serve 50-100 learners; Medium-term: state credit equivalency partnerships; Long-term: K-12 Bengali pathway across Florida. Program is ACTFL-aligned enrichment (not FLDOE certified for academic credit). Complies with FERPA and COPPA. Florida Seal of Biliteracy eligible pathway.`
    },
    {
        chunkId: 'PRG-002',
        category: 'programs',
        sensitivity: SENSITIVITY.PUBLIC,
        title: 'Tagore Worldwide Communication Project',
        sourceDocument: 'banf-data_ingest/context/tagore_project.txt',
        keywords: ['tagore', 'rabindranath', 'worldwide', 'cultural', 'diplomacy', 'project'],
        content: `BANF is involved in an initiative to spread the works of Rabindranath Tagore globally. The project involves comprehensive research-based outreach to key government and educational contacts across India (union + 28 states + 8 UTs), Bangladesh, USA (federal + state), Canada, Europe, and Australia/NZ. Target audiences include: Governors, Chief Ministers, Education Ministers, Library Ministers, University Vice Chancellors and Registrars, State/National Library heads, College presidents. The project aims to promote Tagore's literary, musical, and philosophical legacy internationally through cultural diplomacy and educational integration.`
    },
    {
        chunkId: 'PRG-003',
        category: 'programs',
        sensitivity: SENSITIVITY.PUBLIC,
        title: 'BANF Radio',
        sourceDocument: 'survey/banf_web/COMPREHENSIVE_FUNCTIONALITY_REPORT.md',
        keywords: ['radio', 'music', 'songs', 'streaming', 'rabindra sangit', 'bangla', 'cultural'],
        content: `BANF operates an online radio station streaming Bengali music 24/7. The radio player is accessible via the BANF website member portal. Features include: live streaming of Rabindra Sangit, Bangla film songs, folk music (Baul, Kirtan), and contemporary Bengali music. Members can submit song requests. Radio schedule database maintained. Accessible at jaxbengali.org via the member portal.`
    },

    // ═══════════════════════════════════════════════
    // CATEGORY: MEMBERSHIP (PUBLIC basics, MEMBER for details)
    // ═══════════════════════════════════════════════
    {
        chunkId: 'MBR-001',
        category: 'membership',
        sensitivity: SENSITIVITY.PUBLIC,
        title: 'Membership Tiers & Benefits Overview — 2026-27',
        sourceDocument: 'banf1-wix/src/backend/landing-collections.js + banf-crm-reconciliation.json',
        keywords: ['membership', 'fees', 'tiers', 'family', 'individual', 'couple', 'student', 'early bird', 'M2 Premium', 'M1 Regular', 'benefits', '2026', '2027'],
        content: `BANF 2026-27 Membership Fee Structure — Three Plans:\n\nM2 Premium (Early Bird) — Available until May 31, 2026:\n  Family: $375 | Couple: $290 | Individual: $215 | Student: $145\n  Includes: All 17 events, Early Bird discount, portal access, voting rights, Jagriti magazine.\n\nM2 Premium (Regular, after May 31, 2026):\n  Family: $410 | Couple: $330 | Individual: $240 | Student: $175\n  Includes: All 17 events, portal access, voting rights, Jagriti magazine.\n\nM1 Regular:\n  Family: $280 | Couple: $255 | Individual: $140 | Student: $100\n  Includes: 11 events (excludes 6 premium-only events).\n\nMembership Benefits (all plans): Access to BANF events (discounted or free entry), voting rights at General Body Meetings (GBM), annual Jagriti magazine copy, BANF member portal access, community directory listing, eligibility for volunteer roles, cultural program participation, Bengali language school access, BANF Radio access.\n\nPayment: Zelle to banfjax@gmail.com | Online: squareup.com/store/bengali-association-of-north-florida.\nBANF is a 501(c)(3) tax-deductible organization. Membership season: 2026-2027. Early Bird deadline: May 31, 2026.`
    },
    {
        chunkId: 'MBR-002',
        category: 'membership',
        sensitivity: SENSITIVITY.MEMBER,
        title: 'Membership Statistics — Community Scale',
        sourceDocument: 'banf-data_ingest/BANF_DATA_INSIGHTS_REPORT.md',
        keywords: ['membership statistics', 'community size', '416', 'persons', 'families', '105', 'retention'],
        content: `BANF community scale (as of Jan 2026): 416 unique individuals in database; 105 distinct family units; 243 unique members who held membership at least once; 886 total membership records across all fiscal years; 227 persons (55%) linked to family units; 14 members retained across 2+ fiscal years. Family size data: Roy family (17 members), Ghosh family (15), Dutta (10), Das (7), Pal (5), Mukherjee (5), Chatterjee (4), Banerjee (4), Choudhury (4). Community spans 2008 to present with strongest enrollment in 2022-2026 EC periods.`
    },
    {
        chunkId: 'MBR-003',
        category: 'membership',
        sensitivity: SENSITIVITY.ADMIN,
        title: 'Membership Fee History & Revenue Analysis',
        sourceDocument: 'banf-data_ingest/data/BANF Membership Fee decide.xlsx (268KB) + banf-crm-reconciliation.json',
        keywords: ['fee history', 'revenue', 'membership fee evolution', 'early bird', 'pricing strategy', '2026-27', 'M2 Premium', 'M1 Regular'],
        content: `BANF Membership Fee Evolution:\n\n2025-26 (previous): Family EB $340 / Regular $215 | Couple EB $300 / Regular $200 | Individual EB $190 | Student EB $150. Revenue: $23,885 from 80 paid members. 221 classified memberships; 89% Early Bird. Family tier most popular (102 families).\n\n2026-27 (current — renamed tier system):\n  M2 Premium EB: Family $375 / Couple $290 / Individual $215 / Student $145 (EB deadline May 31, 2026)\n  M2 Premium:    Family $410 / Couple $330 / Individual $240 / Student $175\n  M1 Regular:    Family $280 / Couple $255 / Individual $140 / Student $100\n  YoY changes: Family EB +$35 (+10.3%), Couple EB -$10 (-3.3%), Individual EB +$25 (+13.2%), Student EB -$5 (-3.3%).\n\nRevenue target 2026-27: 80+ active families. Financial reconciliation shows 886 total membership transactions across all years. Legacy records (665 = 75%) are unclassified from pre-digital era.`
    },
    {
        chunkId: 'MBR-004',
        category: 'membership',
        sensitivity: SENSITIVITY.MEMBER,
        title: 'Membership Enrollment 2026-27 — Status & Deadlines',
        sourceDocument: 'banf1-wix/src/backend/landing-collections.js',
        keywords: ['enrollment', 'registration', 'renewal', '2026-27', 'deadline', 'how to join', 'early bird deadline', 'season'],
        content: `BANF 2026-27 Membership Enrollment:\n\nSeason: 2026-2027 (July 2026 – June 2027).\nEarly Bird (M2 Premium EB) Deadline: May 31, 2026.\nHow to Pay: Zelle to banfjax@gmail.com | Square online at squareup.com/store/bengali-association-of-north-florida.\nTo Register: Email banfjax@gmail.com or use the member portal at www.jaxbengali.org.\n\nMembership Categories:\n- Family: 2 adults + dependent children in same household.\n- Couple: 2 adults in same household (no children or children 18+).\n- Individual: Single adult.\n- Student: Full-time student (enrollment proof required).\n\nM2 Premium plans include all 17 annual BANF events.\nM1 Regular includes 11 events (excludes Bosonto Utsob, Spandan, Saraswati Puja Gala, Mahalaya Sandhya, Kali Puja Gala, Cultural Gala).\nAll plans include voting rights, Jagriti magazine, member portal, directory listing.`
    },

    // ═══════════════════════════════════════════════
    // CATEGORY: GOVERNANCE (MEMBER for roster, ADMIN for minutes)
    // ═══════════════════════════════════════════════
    {
        chunkId: 'GOV-001',
        category: 'governance',
        sensitivity: SENSITIVITY.PUBLIC,
        title: 'Current EC (2026-2028) — Roster',
        sourceDocument: 'banf1-wix/src/backend/landing-collections.js + banf-landing-preview-v2.html',
        keywords: ['EC', 'executive committee', '2026', '2028', 'president', 'secretary', 'treasurer', 'vice president', 'ranadhir', 'new ec', 'leadership'],
        content: `BANF Executive Committee 2026-2028 (Current — elected at GBM February 22, 2026):\nPresident: Dr. Ranadhir Ghosh (AI Solution Architect, Fintech & Digital Transformation)\nVice President: Partha Mukhopadhyay\nTreasurer: Amit Chandak\nGeneral Secretary: Rajanya Ghosh\nCultural Secretary: Dr. Moumita Ghosh\nFood Coordinator: Banty Dutta\nEvent Coordinator: Dr. Sumanta Ghosh\nPuja Coordinator: Rwiti Choudhury\nTotal: 8 officers. EC term: 2026-2028.\n\nPrevious EC (2024-2026): President: Suvankar Pal | VP: Anita Mandal | VP: Tanay Bhaduri | Secretary: Partha Mukhopadhyay | Treasurer: Sreya Ghosh | Cultural Sec: Sharmistha Poddar | Events Sec: Dipra Ghosh | Puja Sec: Sunetra Basu Ghosh | Social Media: Souvik Chakraborty. Elected at GBM March 2024.`
    },
    {
        chunkId: 'GOV-002',
        category: 'governance',
        sensitivity: SENSITIVITY.MEMBER,
        title: 'Historical EC Terms',
        sourceDocument: 'banf-data_ingest/data/22-24EC/ + 24-26EC/ folder structures',
        keywords: ['EC terms', '2022-2024', 'previous EC', 'history', 'leadership succession'],
        content: `BANF has maintained EC terms since its founding. Documented terms include: EC-2022-2024 (files: BANF 2024-2025 Membership, event PDFs for Durga Puja, Holi, KaliPuja, Mahalaya, NaboBorsho, Saraswati Puja, Spandan, Sports Event, Summer Camp, VendorDetails); EC-2024-2026 (current — files: membership listings, DurgaPuja-25, Mahalaya Sept 2024, SportsDay Picnic, Winter Picnic 2025, Jagriti 2022+2023, event tracking); Each EC term documents membership, events, and financial management.`
    },
    {
        chunkId: 'GOV-003',
        category: 'governance',
        sensitivity: SENSITIVITY.ADMIN,
        title: 'GBM 2024 Minutes Summary',
        sourceDocument: 'banf-data_ingest/data/BANF-GBM-31st March 2024.pdf (1,680 KB)',
        keywords: ['GBM minutes', '2024', 'meeting minutes', 'resolutions', 'voting', 'march 2024'],
        content: `The GBM held March 31, 2024 was the major annual governance meeting. This 1,680KB document is the largest single file in the archive. Contents include: EC election results for 2024-2026 term, budget approval for new term, constitutional amendments review, community feedback and resolutions, financial transparency report from outgoing EC, special resolutions on membership fee structure, event planning priorities for 2024-2026. The meeting established the current EC leadership and set organizational priorities including digital transformation of membership records and introduction of the web platform.`
    },
    {
        chunkId: 'GOV-004',
        category: 'governance',
        sensitivity: SENSITIVITY.ADMIN,
        title: 'EC Transition Document — Feb 2026',
        sourceDocument: 'banf-data_ingest/BANF-EC Transition-7thFeb2026 (top-level file)',
        keywords: ['EC transition', '2026', 'handover', 'new EC', 'succession', 'GBM 2026'],
        content: `The EC Transition document (February 7, 2026) prepares for the new EC election at GBM 2026 (February 22, 2026). Contains: handover protocols for each role, outstanding action items, financial position at transition, status of ongoing projects (web platform, Bengali school, Tagore project), membership database status, event planning status for 2026 calendar, legal compliance checklist. This document is ADMIN sensitivity as it contains internal governance details and operational handover information.`
    },
    {
        chunkId: 'GOV-005',
        category: 'governance',
        sensitivity: SENSITIVITY.ADMIN,
        title: 'Governance Legal Guide for EC',
        sourceDocument: 'banf-data_ingest/legal_guide.txt',
        keywords: ['legal', '501c3', 'fiduciary', 'duty of care', 'duty of loyalty', 'nonprofit law', 'Florida', 'governance'],
        content: `EC Governance & Legal Handbook (Florida Nonprofit): Three fiduciary duties under Florida Statutes Chapter 617: (1) Duty of Care — act as prudent person, review financials, document decisions; (2) Duty of Loyalty — act in organization's best interest, disclose conflicts, recuse from conflicted votes, no self-dealing; (3) Duty of Obedience — follow mission, bylaws, 501(c)(3) rules, no political campaigning. Florida-specific: personal liability protections under FL law for volunteer officers. Key risks: approving expenses without budget review, hiring related-party vendors without competitive bids, using funds for non-exempt purposes. Organizations must consult qualified nonprofit attorney for specific guidance.`
    },

    // ═══════════════════════════════════════════════
    // CATEGORY: FINANCE (ADMIN)
    // ═══════════════════════════════════════════════
    {
        chunkId: 'FIN-001',
        category: 'finance',
        sensitivity: SENSITIVITY.ADMIN,
        title: 'Financial Overview 2020-2026',
        sourceDocument: 'banf-data_ingest/data/Financial Summary 2020-21 through 2024-25.xlsx (5 files)',
        keywords: ['financial', 'budget', 'revenue', 'expenses', 'surplus', 'annual finance', 'surplus deficit'],
        content: `BANF maintains annual financial summaries from 2020-2026. Revenue sources: membership fees (primary; ~$23,885 in 2025-26), event ticket sales, sponsorships (11 packages), donations, vendor payments. Major expense categories: event production (Durga Puja largest), venue/food/logistics, magazine printing, officer expenses. 1,085 financial transactions recorded in the digitized archive. Full financial reconciliation completed. 5 years of financial summaries (2020-21 through 2024-25) plus current year 2025-26. Budget presentations created for each EC term.`
    },
    {
        chunkId: 'FIN-002',
        category: 'finance',
        sensitivity: SENSITIVITY.ADMIN,
        title: 'Event Budgets — 2025-26',
        sourceDocument: 'banf-data_ingest/data/24-26EC event PDFs + KaliPuja_2025.xlsx, SaraswatiPuja2026.xlsx, Winter Picnic 2026.xlsx',
        keywords: ['event budget', 'durga puja budget', 'winter picnic', 'saraswati puja', 'kali puja', 'event costs'],
        content: `2025-26 Event Budget Summary: Total event budget allocation $30,500+. Event data files: KaliPuja_2025.xlsx (event planning/budget), Saraswati Puja.xlsx + SaraswatiPuja2026.xlsx (two versions), Winter Picnic 2026.xlsx. Event planning covers: venue costs, catering vendors (5th Element, Chandrani, Paramita, Priyanka, Ruchi, Taste of India), cultural performance costs, decoration, photography, printed materials. Budget categories: cultural_events_programs, social_welfare, administrative, miscellaneous. 15 budget line items total for 2025-26. Cultural integration budget PPTX: "Budget Estimation for Cultural Integration" covers cross-cultural social welfare initiatives ($3,000 NGO partnership budget).`
    },
    {
        chunkId: 'FIN-003',
        category: 'finance',
        sensitivity: SENSITIVITY.ADMIN,
        title: 'Sponsorship Analysis & Packages',
        sourceDocument: 'banf-data_ingest/output/SPONSORSHIP_ANALYSIS_REPORT.md + sponsorship_tiers_analysis.html',
        keywords: ['sponsorship', 'sponsors', 'packages', 'ROI', 'local business', 'revenue'],
        content: `BANF has 11 defined sponsorship packages linked to annual magazine and event opportunities. Current sponsors: Aha Curry, Daniel Miller (Banani di), Dev Goswami, Falguni-Felicia Patel, Gulani Vision, Merill Lynch, Poppi Elias, Rod Realty (Anil Gula), Synergy, Tikka Bowls, Vijay Domakuntla. 22 magazine advertisement slots sold in 2024-25 Jagriti. Sponsor ROI calculator developed. Tiered sponsorship model with Gold/Silver/Bronze levels. Potential to expand corporate sponsorship with medical practices, real estate, financial services targeting Bengali professionals.`
    },
    {
        chunkId: 'FIN-004',
        category: 'finance',
        sensitivity: SENSITIVITY.ADMIN,
        title: 'Grant Readiness — 501(c)(3)',
        sourceDocument: 'banf-data_ingest/grant_readiness_assessment.html',
        keywords: ['grant', '501c3', 'grant readiness', 'funding', 'federal grants', 'cultural grants', 'IRS'],
        content: `BANF Grant Readiness Assessment: Organization is positioned for cultural preservation grants, language education funding, and youth program support. Identified gaps: define 3-5 outcome indicators (e.g., cultural awareness, youth engagement), conduct annual beneficiary survey, collect testimonials. Priority actions (high priority, 1-2 weeks): create program logic model, formalize evaluation methodology, document community impact metrics. Grant categories suitable: NEA (National Endowment for Arts), NEH (National Endowment for Humanities), state cultural grants, private foundations (South Asian cultural), educational foundations. IRS 501(c)(3) status: compliant. Organization maintains required financial records.`
    },
    {
        chunkId: 'FIN-005',
        category: 'finance',
        sensitivity: SENSITIVITY.SUPER_ADMIN,
        title: 'Membership Fee Individual Records',
        sourceDocument: 'banf-data_ingest/data/BANF Membership 2025-26.xlsx + PDF (150 members, $23,885)',
        keywords: ['individual payments', 'membership records', 'payment amounts', 'member fees', 'transaction records'],
        content: `[SUPER_ADMIN ONLY] 2025-26 Membership detailed records: 150 member records in BANF Membership 2025-26.xlsx (10KB). Full membership list with names, payment amounts, tier classification. Total $23,885 collected. Individual payment data searchable. History: BANF 2022-2023 Membership, BANF 2023-2024 Membership, BANF 2025-2026 Membership (3 annual files from 24-26EC folder). BANF 2024-2025 Membership (from 22-24EC folder). Member-level payment breakdown available for audit. Individual member financial records require super_admin access.`
    },

    // ═══════════════════════════════════════════════
    // CATEGORY: COMMUNITY DATA (MEMBER+ADMIN)
    // ═══════════════════════════════════════════════
    {
        chunkId: 'COM-001',
        category: 'community',
        sensitivity: SENSITIVITY.MEMBER,
        title: 'Community Demographics Summary',
        sourceDocument: 'banf-data_ingest/BANF_DATA_INSIGHTS_REPORT.md',
        keywords: ['demographics', 'community size', 'families', 'surnames', 'geography', 'jacksonville'],
        content: `BANF Community Demographics (Jan 2026): 416 unique persons in database; 105 family units tracked; BANF members primarily concentrated in Jacksonville, FL (Duval County). Surname distribution (top families): Roy 17, Ghosh 15, Dutta 10, Das 7, Pal 5, Mukherjee 5, Chatterjee 4, Banerjee 4, Choudhury 4, Bannerjee 4. Person activity: 243/416 hold membership, 8 are Jagriti contributors, 9 are EC officers, remainder are community participants. Inter-generational: both adults and minors (children) tracked in Family Universe data (226 members across 105 families in 4-year dataset).`
    },
    {
        chunkId: 'COM-002',
        category: 'community',
        sensitivity: SENSITIVITY.MEMBER,
        title: 'Vendors & Caterers Network',
        sourceDocument: 'banf-data_ingest/data/22-24EC/VendorDetails.pdf + 24-26EC event files',
        keywords: ['vendors', 'caterers', 'food', 'catering', '5th element', 'taste of india', 'local businesses'],
        content: `BANF Vendor Network: Regular caterers for events include: 5th Element (catering), Chandrani (catering — community member), Paramita (catering — community member), Priyanka (catering — community member), Ruchi (catering — community member), Taste of India (catering). VendorDetails.pdf (22-24EC) contains full contact details, contracts, and pricing. Updated vendor portfolio for 24-26EC maintained in event planning files. Vendor relationships span 5+ years for established providers.`
    },

    // ═══════════════════════════════════════════════
    // CATEGORY: MEMBER DATA (SUPER_ADMIN)
    // ═══════════════════════════════════════════════
    {
        chunkId: 'DAT-001',
        category: 'members_data',
        sensitivity: SENSITIVITY.SUPER_ADMIN,
        title: 'Family Universe Data (v3)',
        sourceDocument: 'banf-data_ingest/data/BANF_Family_Universe_v3.xlsx (41KB)',
        keywords: ['family universe', 'family data', '105 families', '226 members', 'family analytics', 'household'],
        content: `[SUPER_ADMIN ONLY] BANF_Family_Universe_v3.xlsx: Comprehensive family analytics database. 105 distinct families, 226 members tracked across 4 fiscal years. Contains: family composition, adult/minor classification, surname groupings, email domains, retention status, family ID assignments. This is the master family reference dataset. Used for CRM seeding and community analytics. Contains personally identifiable information (PII) — names, emails, family relationships. Requires super_admin clearance.`
    },
    {
        chunkId: 'DAT-002',
        category: 'members_data',
        sensitivity: SENSITIVITY.SUPER_ADMIN,
        title: 'Google Contacts Database',
        sourceDocument: 'c:/projects/banf/google_contacts.json (164 contacts)',
        keywords: ['contacts', 'phone', 'email', 'member contact info', 'directory', 'PII'],
        content: `[SUPER_ADMIN ONLY] Google Contacts export: 164 individual contacts with fields: firstName, lastName, displayName, email, phone, organization. Contains full contact directory for BANF members and community participants. PII-sensitive: full names, emails, phone numbers. Used for CRM seeding. Linked to Gmail inbox communications. Requires super_admin access for full contact details.`
    },
    {
        chunkId: 'DAT-003',
        category: 'members_data',
        sensitivity: SENSITIVITY.SUPER_ADMIN,
        title: 'IRS Form 990 & Tax Records',
        sourceDocument: 'banf-data_ingest/pptx_agent/banf-tax-990-2025.pdf',
        keywords: ['IRS', 'Form 990', 'tax', 'annual report', 'officers', 'compensation', 'revenue'],
        content: `[SUPER_ADMIN ONLY] IRS Form 990 (2025): Annual information return for tax-exempt organizations. Contains: total revenue and expenses, officer names and compensation (typically $0 for volunteer-run organization), program service accomplishments, balance sheet data, governance disclosures. Publicly available as required by law but contains sensitive operational and financial details. Stored at banf-data_ingest/pptx_agent/banf-tax-990-2025.pdf.`
    },

    // ═══════════════════════════════════════════════
    // CATEGORY: DIGITAL TRANSFORMATION (ADMIN)
    // ═══════════════════════════════════════════════
    {
        chunkId: 'TECH-001',
        category: 'technology',
        sensitivity: SENSITIVITY.ADMIN,
        title: 'BANF Web Platform — Technical Architecture',
        sourceDocument: 'multiple survey/ docs, DEPLOYMENT_GUIDE.md, BANF_COMPLETE_PUBLISH_AND_TEST_GUIDE.md',
        keywords: ['wix', 'web platform', 'API', 'velo', 'backend', 'http functions', 'member portal', 'admin portal'],
        content: `BANF Web Platform: Live at www.jaxbengali.org (dev) and www.jaxbengali.org (production). Built on Wix with Velo (JavaScript backend). Architecture: 49+ backend files (.jsw), 25+ CRM endpoints, 40+ admin API endpoints, 5 public HTML portals. Current version: 5.5.0-crm. Components: Admin Portal (crm-admin.html), Member Portal (member-portal.html), CRM System (crm-agent.js, crm-api.js), Email System (Gmail OAuth sync), RBAC security (roles: guest/member/admin/super_admin), RAG chatbot, Radio player. Site ID: c13ae8c5-7053-4f2d-9a9a-371869be4395. GitHub: github.com/banfjax-hash/banf1-wix. Deployed from local CLI using Wix Dev Tools.`
    },
    {
        chunkId: 'TECH-002',
        category: 'technology',
        sensitivity: SENSITIVITY.ADMIN,
        title: 'Data Digitization Status',
        sourceDocument: 'banf-data_ingest/BANF_DATA_INSIGHTS_REPORT.md + BANF_DIGITIZATION_MIGRATION_PLAN.md',
        keywords: ['digitization', 'migration', 'data quality', 'records', '44 documents', 'excel', 'PDF'],
        content: `BANF Data Digitization (Jan 2026): 44 documents processed out of 170+ in repository. 6,919 rows migrated. 40 of 45 semantic tables populated. Data quality: Person identification ★★★★★ (100% membership linkage), Family mapping ★★★★☆ (227/416 persons assigned), Membership classification ★★★☆☆ (75% legacy records unclassified), Financial data ★★★★☆ (all transactions recorded, 1,085 entries), Event data ★★★★☆ (24 events-9 types). Remaining work: PDF text extraction via LLM, image OCR (GBM flyer, charity photos), ZIP archive decomposition, full schema population. Databricks LLaMA 4 Maverick planned for vision/PDF extraction.`
    },
    {
        chunkId: 'TECH-003',
        category: 'technology',
        sensitivity: SENSITIVITY.ADMIN,
        title: 'Survey System & Old Archive',
        sourceDocument: 'survey/banf_web/BANF_OLD_ARCHIVE_COLLECTION_REPORT_20260219_093317.md',
        keywords: ['survey system', 'old archive', 'database schema', 'legacy system', 'migration', 'older website'],
        content: `BANF Old Archive (Feb 2026 survey): Legacy database schema documented with 11 layers. Key tables: sem_documents (44 rows), sem_fiscal_years (24 years), budgets, events, persons, memberships, transactions, communications. Archive contains BANF_Constitution_2020.pdf, MemberList_2024.xlsx, Jagriti_2024.pdf. Old system captured: member data, event records, budget tracking, publication management. Old website at www.jaxbengali.org being replaced by new CRM-enabled platform. Archive migration plan documented in BANF_DIGITIZATION_MIGRATION_PLAN.md.`
    }
];

// ─────────────────────────────────────────────────────────────
// DOCUMENT LIBRARY (All source files categorized)
// Sensitivity assigned based on content type
// ─────────────────────────────────────────────────────────────
export const DOCUMENT_LIBRARY = [
    // banf-data_ingest/  (root)
    { path: 'banf-data_ingest/BANF_DATA_INSIGHTS_REPORT.md', type: 'report', sensitivity: SENSITIVITY.ADMIN, category: 'analytics', summary: 'Comprehensive data migration insights: 416 persons, 105 families, 886 memberships, 24 events, $23,885 revenue' },
    { path: 'banf-data_ingest/ADVANCED_INSIGHTS_DESIGN.md', type: 'design', sensitivity: SENSITIVITY.ADMIN, category: 'technology', summary: 'Advanced insights extraction system design for 28 documents across 2 EC periods' },
    { path: 'banf-data_ingest/BANF_DIGITIZATION_MIGRATION_PLAN.md', type: 'plan', sensitivity: SENSITIVITY.ADMIN, category: 'technology', summary: 'Full digitization roadmap: 44 documents, schema design, extraction methodology' },
    { path: 'banf-data_ingest/BANF_DOCUMENT_CATEGORY_PLANNER.md', type: 'plan', sensitivity: SENSITIVITY.ADMIN, category: 'technology', summary: 'File-to-category mapping for all BANF documents' },
    { path: 'banf-data_ingest/BANF_SEMANTIC_SCHEMA_DESIGN.md', type: 'design', sensitivity: SENSITIVITY.ADMIN, category: 'technology', summary: 'Universal schema DDL: 45 tables covering persons, families, events, finance, magazine, governance' },
    { path: 'banf-data_ingest/DATABRICKS_ENVIRONMENT_SETUP.md', type: 'technical', sensitivity: SENSITIVITY.ADMIN, category: 'technology', summary: 'Databricks LLaMA 4 Maverick NLP extraction pipeline setup' },
    { path: 'banf-data_ingest/legal_guide.txt', type: 'legal', sensitivity: SENSITIVITY.ADMIN, category: 'governance', summary: 'EC Governance Handbook: Fiduciary duties, FL nonprofit law, conflict of interest, Duty of Care/Loyalty/Obedience' },
    { path: 'banf-data_ingest/grant_readiness_assessment.html', type: 'assessment', sensitivity: SENSITIVITY.ADMIN, category: 'finance', summary: '501(c)(3) grant readiness: 50 action items, priority actions for cultural/education grants' },
    { path: 'banf-data_ingest/event_analysis_report.html', type: 'report', sensitivity: SENSITIVITY.ADMIN, category: 'events', summary: 'Detailed event analysis across 9 event types, attendance trends, budget analysis' },
    { path: 'banf-data_ingest/tier_fee_distribution_analysis.html', type: 'report', sensitivity: SENSITIVITY.ADMIN, category: 'finance', summary: 'Membership tier fee distribution analysis and revenue visualization' },
    { path: 'banf-data_ingest/BANF Membership 2025 - 26.xlsx', type: 'data', sensitivity: SENSITIVITY.SUPER_ADMIN, category: 'membership', summary: '150 members, $23,885 revenue, tier breakdown for 2025-26' },
    { path: 'banf-data_ingest/BANF-EC Transition-7thFeb2026', type: 'governance', sensitivity: SENSITIVITY.ADMIN, category: 'governance', summary: 'EC handover document Feb 7, 2026 — role transitions, outstanding items, GBM prep' },
    // banf-data_ingest/context/
    { path: 'banf-data_ingest/context/bengali_school.txt', type: 'program', sensitivity: SENSITIVITY.PUBLIC, category: 'programs', summary: 'Bengali Language School: ACTFL curriculum, K-5 program, Novice proficiency levels, certification details' },
    { path: 'banf-data_ingest/context/tagore_project.txt', type: 'project', sensitivity: SENSITIVITY.PUBLIC, category: 'programs', summary: 'Tagore Worldwide: global outreach to 200+ government/education contacts' },
    { path: 'banf-data_ingest/context/BANF-GBM-31st March 2024.pdf', type: 'minutes', sensitivity: SENSITIVITY.ADMIN, category: 'governance', summary: 'GBM March 31 2024 minutes: EC election, budget approval, constitutional review (1,680KB)' },
    // banf-data_ingest/data/
    { path: 'banf-data_ingest/data/BANF_Family_Universe_v3.xlsx', type: 'data', sensitivity: SENSITIVITY.SUPER_ADMIN, category: 'members_data', summary: '105 families, 226 members, 4-year analytics, PII present' },
    { path: 'banf-data_ingest/data/BANF Membership Fee decide.xlsx', type: 'data', sensitivity: SENSITIVITY.ADMIN, category: 'finance', summary: 'Fee structure evolution 2024-2026, tier pricing history' },
    { path: 'banf-data_ingest/data/Budget Estimation for Cultural Integration.pptx', type: 'finance', sensitivity: SENSITIVITY.ADMIN, category: 'finance', summary: 'Cultural integration budget: $3,000 NGO partnerships, $650 donations' },
    { path: 'banf-data_ingest/data/Financial Summary 2020-21.xlsx', type: 'finance', sensitivity: SENSITIVITY.ADMIN, category: 'finance', summary: 'Annual financial summary FY 2020-21' },
    { path: 'banf-data_ingest/data/Financial Summary 2021-22.xlsx', type: 'finance', sensitivity: SENSITIVITY.ADMIN, category: 'finance', summary: 'Annual financial summary FY 2021-22' },
    { path: 'banf-data_ingest/data/Financial Summary 2022-23.xlsx', type: 'finance', sensitivity: SENSITIVITY.ADMIN, category: 'finance', summary: 'Annual financial summary FY 2022-23' },
    { path: 'banf-data_ingest/data/Financial Summary 2023-24.xlsx', type: 'finance', sensitivity: SENSITIVITY.ADMIN, category: 'finance', summary: 'Annual financial summary FY 2023-24' },
    { path: 'banf-data_ingest/data/Financial Summary 2024-25.xlsx', type: 'finance', sensitivity: SENSITIVITY.ADMIN, category: 'finance', summary: 'Annual financial summary FY 2024-25' },
    { path: 'banf-data_ingest/data/BANF_Membership_Value_Decomposition_2026_Amit.pdf', type: 'analysis', sensitivity: SENSITIVITY.ADMIN, category: 'membership', summary: 'Membership value decomposition analysis for 2026 planning' },
    // banf-data_ingest/data/22-24EC (event documents)
    { path: 'banf-data_ingest/data/22-24EC/DurgaPuja.pdf', type: 'event', sensitivity: SENSITIVITY.ADMIN, category: 'events', summary: 'Durga Puja 2022-23 planning: logistics, vendor details, program schedule' },
    { path: 'banf-data_ingest/data/22-24EC/Holi.pdf', type: 'event', sensitivity: SENSITIVITY.ADMIN, category: 'events', summary: 'Holi event planning document 2022-24 EC' },
    { path: 'banf-data_ingest/data/22-24EC/KaliPuja.pdf', type: 'event', sensitivity: SENSITIVITY.ADMIN, category: 'events', summary: 'Kali Puja planning & logistics' },
    { path: 'banf-data_ingest/data/22-24EC/Mahalaya.pdf', type: 'event', sensitivity: SENSITIVITY.ADMIN, category: 'events', summary: 'Mahalaya ceremony planning document' },
    { path: 'banf-data_ingest/data/22-24EC/Saraswati Puja.pdf', type: 'event', sensitivity: SENSITIVITY.ADMIN, category: 'events', summary: 'Saraswati Puja planning — education-themed cultural event' },
    { path: 'banf-data_ingest/data/22-24EC/Spandan.pdf', type: 'event', sensitivity: SENSITIVITY.ADMIN, category: 'events', summary: 'Spandan cultural show — performing arts event' },
    { path: 'banf-data_ingest/data/22-24EC/Sports Event.pdf', type: 'event', sensitivity: SENSITIVITY.ADMIN, category: 'events', summary: 'Sports Day event: family sports competition, picnic logistics' },
    { path: 'banf-data_ingest/data/22-24EC/Summer_Camp.pdf', type: 'event', sensitivity: SENSITIVITY.ADMIN, category: 'events', summary: 'Summer Camp for youth — program, schedule, registration' },
    { path: 'banf-data_ingest/data/22-24EC/VendorDetails.pdf', type: 'vendor', sensitivity: SENSITIVITY.ADMIN, category: 'community', summary: 'Vendor contacts, pricing, contracts — catering and services' },
    // banf-data_ingest/data/24-26EC
    { path: 'banf-data_ingest/data/24-26EC/DurgaPuja-25.pdf', type: 'event', sensitivity: SENSITIVITY.ADMIN, category: 'events', summary: 'Durga Puja 2025 full planning document' },
    { path: 'banf-data_ingest/data/24-26EC/Jagriti 2022.xlsx', type: 'magazine', sensitivity: SENSITIVITY.MEMBER, category: 'culture', summary: 'Jagriti 2022: 46 contributions, advertisers list, contributor names' },
    { path: 'banf-data_ingest/data/24-26EC/Jagriti 2023.xlsx', type: 'magazine', sensitivity: SENSITIVITY.MEMBER, category: 'culture', summary: 'Jagriti 2023: contributions, sponsors data' },
    { path: 'banf-data_ingest/data/24-26EC/Winter Picnic 2024-25.xlsx', type: 'event', sensitivity: SENSITIVITY.ADMIN, category: 'events', summary: 'Winter Picnic 2024-25 planning, attendance, budget' },
    { path: 'banf-data_ingest/KaliPuja_2025.xlsx', type: 'event', sensitivity: SENSITIVITY.ADMIN, category: 'events', summary: 'Kali Puja 2025 event planning spreadsheet' },
    { path: 'banf-data_ingest/Saraswati Puja.xlsx', type: 'event', sensitivity: SENSITIVITY.ADMIN, category: 'events', summary: 'Saraswati Puja planning spreadsheet' },
    { path: 'banf-data_ingest/SaraswatiPuja2026.xlsx', type: 'event', sensitivity: SENSITIVITY.ADMIN, category: 'events', summary: 'Saraswati Puja 2026 planning and logistics' },
    { path: 'banf-data_ingest/Winter Picnic 2026.xlsx', type: 'event', sensitivity: SENSITIVITY.ADMIN, category: 'events', summary: 'Winter Picnic 2026 planning, registration, budget' },
    // pptx_agent
    { path: 'banf-data_ingest/pptx_agent/banf-tax-990-2025.pdf', type: 'legal', sensitivity: SENSITIVITY.SUPER_ADMIN, category: 'finance', summary: 'IRS Form 990 2025: annual tax return, officer list, revenue/expenses disclosure' },
];

// ─────────────────────────────────────────────────────────────
// COMMUNICATION CATEGORIES (for comms analysis)
// ─────────────────────────────────────────────────────────────
export const COMM_CATEGORIES = {
    EVENT:      'event',          // Event announcements, invitations, RSVPs
    GOVERNANCE: 'governance',     // GBM, elections, resolutions
    MEMBERSHIP: 'membership',     // Fee payments, membership updates
    OFFICIAL:   'official',       // Formal communications, MOMs
    TECHNICAL:  'technical',      // System, tech, passwords, tools
    CULTURAL:   'cultural',       // Cultural events, performances
    FINANCIAL:  'financial',      // Budget, payments, transactions
    GENERAL:    'general',        // Informal, personal correspondence
    WELFARE:    'welfare',        // Charity, social welfare
};

// ─────────────────────────────────────────────────────────────
// COMMUNICATION CLASSIFIER
// Categorizes an email subject into COMM_CATEGORIES
// ─────────────────────────────────────────────────────────────
export function classifyCommSubject(subject) {
    if (!subject) return COMM_CATEGORIES.GENERAL;
    const s = subject.toLowerCase();

    if (s.includes('invitation') || s.includes('invite') || s.includes('gbm') ||
        s.includes('rsvp') || s.includes('puja') || s.includes('holi') ||
        s.includes('picnic') || s.includes('sports') || s.includes('event') ||
        s.includes('mahalaya') || s.includes('spandan') || s.includes('nabo borsho') ||
        s.includes('saraswati') || s.includes('kali puja') || s.includes('durga') ||
        s.includes('flyer') || s.includes('concert') || s.includes('show'))
        return COMM_CATEGORIES.EVENT;

    if (s.includes('mom') || s.includes('minutes') || s.includes('resolution') ||
        s.includes('election') || s.includes('agenda') || s.includes('meeting') ||
        s.includes('general body') || s.includes('transition') || s.includes('ec ') ||
        s.includes('executive committee') || s.includes('constitution'))
        return COMM_CATEGORIES.GOVERNANCE;

    if (s.includes('membership') || s.includes('fee') || s.includes('renewal') ||
        s.includes('register') || s.includes('registration') || s.includes('enroll'))
        return COMM_CATEGORIES.MEMBERSHIP;

    if (s.includes('budget') || s.includes('payment') || s.includes('invoice') ||
        s.includes('finance') || s.includes('tax') || s.includes('990') ||
        s.includes('donation') || s.includes('zelle') || s.includes('sponsor'))
        return COMM_CATEGORIES.FINANCIAL;

    if (s.includes('token') || s.includes('password') || s.includes('login') ||
        s.includes('api') || s.includes('llm') || s.includes('hugging face') ||
        s.includes('agent') || s.includes('wix') || s.includes('github') ||
        s.includes('code') || s.includes('deploy') || s.includes('server'))
        return COMM_CATEGORIES.TECHNICAL;

    if (s.includes('charity') || s.includes('welfare') || s.includes('help') ||
        s.includes('donation drive') || s.includes('community service'))
        return COMM_CATEGORIES.WELFARE;

    if (s.includes('jagriti') || s.includes('magazine') || s.includes('bangla') ||
        s.includes('bengali') || s.includes('tagore') || s.includes('cultural') ||
        s.includes('music') || s.includes('dance') || s.includes('poem') ||
        s.includes('band') || s.includes('kolkata'))
        return COMM_CATEGORIES.CULTURAL;

    if (s.includes('value decompos') || s.includes('decompos') ||
        s.includes('banf_membership'))
        return COMM_CATEGORIES.MEMBERSHIP;

    return COMM_CATEGORIES.GENERAL;
}

// ─────────────────────────────────────────────────────────────
// KNOWLEDGE SEARCH FUNCTION
// Role-based retrieval — only returns chunks the role can access
// ─────────────────────────────────────────────────────────────
export function searchKnowledge(query, role = 'guest', maxResults = 5) {
    const roleLevel = SENSITIVITY_RANK[ROLE_MAX_SENSITIVITY[role] || 'public'];
    const q = query.toLowerCase();

    const eligible = KNOWLEDGE_BASE.filter(chunk => {
        const chunkLevel = SENSITIVITY_RANK[chunk.sensitivity] || 0;
        return chunkLevel <= roleLevel;
    });

    const scored = eligible.map(chunk => {
        const searchText = (chunk.title + ' ' + chunk.content + ' ' + chunk.keywords.join(' ')).toLowerCase();
        const words = q.split(/\s+/).filter(w => w.length > 2);
        let score = 0;
        words.forEach(word => {
            const count = (searchText.match(new RegExp(word, 'g')) || []).length;
            score += count;
            if (chunk.title.toLowerCase().includes(word)) score += 5;
            if (chunk.category.toLowerCase().includes(word)) score += 3;
        });
        return { ...chunk, score };
    });

    return scored
        .filter(c => c.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, maxResults)
        .map(({ score, ...chunk }) => chunk);
}

// ─────────────────────────────────────────────────────────────
// GET CONTEXT BY CATEGORY (role-filtered)
// ─────────────────────────────────────────────────────────────
export function getContextByCategory(category, role = 'guest') {
    const roleLevel = SENSITIVITY_RANK[ROLE_MAX_SENSITIVITY[role] || 'public'];
    return KNOWLEDGE_BASE.filter(chunk => {
        const chunkLevel = SENSITIVITY_RANK[chunk.sensitivity] || 0;
        return chunk.category === category && chunkLevel <= roleLevel;
    });
}

// ─────────────────────────────────────────────────────────────
// BUILD RAG PROMPT CONTEXT
// Returns formatted context string for LLM augmentation
// ─────────────────────────────────────────────────────────────
export function buildRAGContext(query, role = 'guest', maxChunks = 4) {
    const chunks = searchKnowledge(query, role, maxChunks);
    if (!chunks.length) return '';

    const parts = chunks.map(c =>
        `[Source: ${c.title} | Category: ${c.category}]\n${c.content}`
    );
    return `CONTEXT FROM BANF KNOWLEDGE BASE:\n\n${parts.join('\n\n---\n\n')}\n\n`;
}

// ─────────────────────────────────────────────────────────────
// CATEGORIZE & ANALYZE COMMUNICATIONS ARRAY
// Takes comms array, returns enriched analysis object
// ─────────────────────────────────────────────────────────────
export function analyzeCommHistory(comms) {
    if (!comms || !comms.length) return { total: 0, categories: {}, timeline: [], insights: [] };

    const enriched = comms.map(c => ({
        ...c,
        derivedCategory: classifyCommSubject(c.subject)
    }));

    // Category counts
    const categories = {};
    for (const cat of Object.values(COMM_CATEGORIES)) { categories[cat] = { count: 0, inbound: 0, outbound: 0, subjects: [] }; }
    enriched.forEach(c => {
        const cat = c.derivedCategory;
        categories[cat].count++;
        if (c.direction === 'inbound') categories[cat].inbound++;
        else categories[cat].outbound++;
        categories[cat].subjects.push(c.subject);
    });

    // Direction stats
    const inbound  = enriched.filter(c => c.direction === 'inbound').length;
    const outbound = enriched.filter(c => c.direction === 'outbound').length;

    // Timeline — sort by date
    const sorted = [...enriched].sort((a, b) => new Date(a.date) - new Date(b.date));

    // Insights
    const insights = [];
    const topCat = Object.entries(categories)
        .filter(([, v]) => v.count > 0)
        .sort((a, b) => b[1].count - a[1].count)[0];
    if (topCat) insights.push(`Primary communication category: ${topCat[0]} (${topCat[1].count} messages)`);
    if (inbound > outbound) insights.push(`Member-initiated: ${inbound} inbound vs ${outbound} outbound — active community participant`);
    else if (outbound > inbound) insights.push(`Admin-initiated: ${outbound} outbound vs ${inbound} inbound — high outreach target`);
    if (categories[COMM_CATEGORIES.TECHNICAL].count > 0) insights.push(`Technical engagement: Shared API tokens / technology resources — indicates tech role or interest`);
    if (categories[COMM_CATEGORIES.GOVERNANCE].count > 0) insights.push(`Governance participation: Involved in GBM/EC communications`);
    if (categories[COMM_CATEGORIES.EVENT].count > 0) insights.push(`Event participation: Responded to or forwarded event invitations`);
    if (categories[COMM_CATEGORIES.MEMBERSHIP].count > 0) insights.push(`Membership activity: Engaged in membership-related communications`);

    return {
        total: enriched.length,
        inbound,
        outbound,
        categories: Object.fromEntries(Object.entries(categories).filter(([, v]) => v.count > 0)),
        timeline: sorted,
        enrichedComms: enriched,
        insights
    };
}

// ─────────────────────────────────────────────────────────────
// STATS
// ─────────────────────────────────────────────────────────────
export function getKnowledgeStats() {
    const byCat = {};
    const bySens = {};
    for (const c of KNOWLEDGE_BASE) {
        byCat[c.category] = (byCat[c.category] || 0) + 1;
        bySens[c.sensitivity] = (bySens[c.sensitivity] || 0) + 1;
    }
    return {
        totalChunks: KNOWLEDGE_BASE.length,
        totalDocuments: DOCUMENT_LIBRARY.length,
        byCategory: byCat,
        bySensitivity: bySens
    };
}
