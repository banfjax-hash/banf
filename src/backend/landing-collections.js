/**
 * BANF Landing Page CRM — Collection Schemas & Seed Data
 * 
 * New collections to be created in Wix:
 *   1. MembershipPlans   — fee tiers (Individual, Family, Senior…)
 *   2. SponsorshipTiers   — tier definitions + benefits
 *   3. ECMembers          — Executive Committee for landing page
 *   4. SiteStats          — headline counters (families, events, years…)
 *   5. BudgetSummary      — FY income/expense/targets
 *   6. SiteContent        — misc key-value content blocks (payment info, footer…)
 *   7. Announcements      — high-priority communication feed for marquee/cards
 * 
 * Run via:  GET /_functions/landing_seed?secret=banf2024seed
 */

// ─────────────────────────────────────────────
// COLLECTION DEFINITIONS (for reference / v2 API)
// ─────────────────────────────────────────────

export const COLLECTIONS = {

    MembershipPlans: {
        displayName: 'Membership Plans',
        fields: {
            slug:        'Text',     // "earlybird-premium", "premium", "regular"
            name:        'Text',     // "Earlybird Premium", "Premium", "Regular"
            subtitle:    'Text',     // "All 17 events included"
            price:       'Number',   // starting/lowest price (Student tier)
            period:      'Text',     // "/year"
            icon:        'Text',     // Font Awesome class "fas fa-bolt"
            isFeatured:  'Boolean',  // true for Earlybird Premium
            badgeText:   'Text',     // "Available until May 31st"
            headerColor: 'Text',     // CSS gradient string
            features:    'Text',     // JSON array: ["All 17 events included", …]
            priceTable:  'Text',     // JSON: {"family":375,"couple":330,"individual":205,"student":145}
            ctaText:     'Text',     // "Select Plan"
            ctaLink:     'Text',     // mailto: or payment link
            order:       'Number',   // display sort
            active:      'Boolean'
        }
    },

    SponsorshipTiers: {
        displayName: 'Sponsorship Tiers',
        fields: {
            slug:        'Text',     // "platinum", "gold", "silver", "bronze"
            name:        'Text',     // "Platinum"
            price:       'Number',   // 2500
            period:      'Text',     // "/year"
            icon:        'Text',     // FA icon class
            iconGradient:'Text',     // CSS gradient for icon bg
            benefits:    'Text',     // JSON array
            ctaLink:     'Text',
            order:       'Number',
            active:      'Boolean'
        }
    },

    ECMembers: {
        displayName: 'EC Members',
        fields: {
            name:        'Text',     // "Dr. Ranadhir Ghosh"
            position:    'Text',     // "President"
            department:  'Text',     // "Strategic Planning"
            bio:         'Text',     // short bio
            photoUrl:    'Text',     // Wix static URL or empty
            initials:    'Text',     // "RG"
            term:        'Text',     // "2025-26"
            order:       'Number',   // 1=president first
            active:      'Boolean'
        }
    },

    SiteStats: {
        displayName: 'Site Stats',
        fields: {
            key:         'Text',     // "activeFamilies", "eventsYearly", etc.
            value:       'Text',     // "80+"
            label:       'Text',     // "Active Families"
            order:       'Number',
            active:      'Boolean'
        }
    },

    BudgetSummary: {
        displayName: 'Budget Summary',
        fields: {
            fiscalYear:      'Text',     // "2026-2027"
            totalBudget:     'Number',   // 50000
            membershipTarget:'Number',   // 80
            sponsorTarget:   'Number',   // 18000
            sponsorPrevYear: 'Text',     // "$15,551 raised from 45 sponsors"
            sponsorPrevFY:   'Text',     // "FY 2024-25"
            notes:           'Text',
            isCurrent:       'Boolean'
        }
    },

    SiteContent: {
        displayName: 'Site Content',
        fields: {
            key:         'Text',     // "paymentZelle", "paymentSquareUrl", "taxNotice", "footerTagline"
            value:       'Text',     // the content
            section:     'Text',     // grouping: "payment", "footer", "hero"
            active:      'Boolean'
        }
    },

    Announcements: {
        displayName: 'Announcements',
        fields: {
            title:       'Text',     // short heading
            message:     'Text',     // detail text
            priority:    'Text',     // high | medium | low
            category:    'Text',     // event | membership | emergency | general
            source:      'Text',     // whatsapp | email | manual | agent
            effectiveOn: 'Date',
            expiresOn:   'Date',
            pinned:      'Boolean',
            order:       'Number',
            active:      'Boolean'
        }
    },

    Events: {
        displayName: 'Events',
        fields: {
            slug:        'Text',     // url-friendly id  e.g. 'bosonto-utsob-2026'
            name:        'Text',     // display name
            description: 'Text',
            date:        'DateTime',
            endDate:     'DateTime',
            venue:       'Text',
            ticketUrl:   'Text',
            imageUrl:    'Text',
            category:    'Text',     // cultural | sports | governance | social
            isPremium:   'Boolean',  // M2-only (excluded from M1 Regular)
            rsvpRequired:'Boolean',
            order:       'Number',
            active:      'Boolean'
        }
    },

    RadioStations: {
        displayName: 'RadioStations',
        fields: {
            name:        'Text',
            streamUrl:   'Text',
            description: 'Text',
            genre:       'Text',
            isPlaying:   'Boolean',
            currentTrack:'Text',
            logoUrl:     'Text',
            active:      'Boolean'
        }
    },

    RadioSchedule: {
        displayName: 'RadioSchedule',
        fields: {
            title:       'Text',
            genre:       'Text',
            day:         'Text',     // 'daily' | 'monday' | 'friday' etc.
            startTime:   'Text',     // '09:00'
            endTime:     'Text',     // '11:00'
            host:        'Text',
            description: 'Text',
            order:       'Number',
            active:      'Boolean'
        }
    }
};


// ─────────────────────────────────────────────
// SEED DATA  (matches current hardcoded values)
// ─────────────────────────────────────────────

export const SEED = {

    SiteStats: [
        { key: 'activeFamilies', value: '80+',  label: 'Active Families',  order: 1, active: true },
        { key: 'eventsYearly',   value: '10+',  label: 'Events Yearly',    order: 2, active: true },
        { key: 'yearsStrong',    value: '17',   label: 'Years Strong',     order: 3, active: true },
        { key: 'totalSponsors',  value: '45+',  label: 'Sponsors',         order: 4, active: true }
    ],

    ECMembers: [
        {
            name: 'Dr. Ranadhir Ghosh', position: 'President', department: 'Strategic Planning',
            bio: 'AI thought leader & educator. Rooted in philosophy, arts & music.',
            photoUrl: 'https://static.wixstatic.com/media/c62f94_9e58db92918340338d8902f14016a55f~mv2.jpg',
            initials: 'RG', term: '2025-26', order: 1, active: true
        },
        {
            name: 'Partha Mukhopadhyay', position: 'Vice President', department: 'Deputy Executive',
            bio: '', photoUrl: '', initials: 'PM', term: '2025-26', order: 2, active: true
        },
        {
            name: 'Amit Chandak', position: 'Treasurer', department: 'Financial Management',
            bio: '', photoUrl: '', initials: 'AC', term: '2025-26', order: 3, active: true
        },
        {
            name: 'Rajanya Ghosh', position: 'General Secretary', department: 'Administration & Coordination',
            bio: 'Classical dancer & hospitality leader with 15 years in Bharatanatyam & Kathak.',
            photoUrl: '', initials: 'RG', term: '2025-26', order: 4, active: true
        },
        {
            name: 'Dr. Moumita Ghosh', position: 'Cultural Secretary', department: 'Cultural Programming',
            bio: '', photoUrl: '', initials: 'MG', term: '2025-26', order: 5, active: true
        },
        {
            name: 'Banty Dutta', position: 'Food Coordinator', department: 'Food & Catering',
            bio: '', photoUrl: '', initials: 'BD', term: '2025-26', order: 6, active: true
        },
        {
            name: 'Dr. Sumanta Ghosh', position: 'Event Coordinator', department: 'Event Planning',
            bio: '', photoUrl: '', initials: 'SG', term: '2025-26', order: 7, active: true
        },
        {
            name: 'Rwiti Choudhury', position: 'Puja Coordinator', department: 'Puja Coordination',
            bio: '', photoUrl: '', initials: 'RC', term: '2025-26', order: 8, active: true
        }
    ],

    MembershipPlans: [
        // ── Row 1: Membership Fees (3 plans) ──
        {
            slug: 'earlybird-premium', name: 'M2 Premium (Early Bird)',
            subtitle: 'All 17 events included',
            price: 145, period: '/year', icon: 'fas fa-bolt', isFeatured: true,
            badgeText: 'Available until May 31st, 2026',
            headerColor: 'var(--gradient-primary)',
            priceTable: JSON.stringify({ family: 375, couple: 290, individual: 215, student: 145 }),
            features: JSON.stringify([
                'All 17 events included',
                'Early Bird — save vs M2 Premium',
                'EB discount valid until May 31st, 2026'
            ]),
            ctaText: 'Select Plan', ctaLink: 'mailto:membership@jaxbengali.org',
            order: 1, active: true
        },
        {
            slug: 'premium', name: 'M2 Premium',
            subtitle: 'All 17 events included',
            price: 175, period: '/year', icon: 'fas fa-crown', isFeatured: false,
            badgeText: '',
            headerColor: 'linear-gradient(135deg, #6f42c1 0%, #5a32a3 100%)',
            priceTable: JSON.stringify({ family: 410, couple: 330, individual: 240, student: 175 }),
            features: JSON.stringify([
                'All 17 events included',
                'Regular price — available after May 31st'
            ]),
            ctaText: 'Select Plan', ctaLink: 'mailto:membership@jaxbengali.org',
            order: 2, active: true
        },
        {
            slug: 'regular', name: 'M1 Regular',
            subtitle: '11 events included',
            price: 100, period: '/year', icon: 'fas fa-id-badge', isFeatured: false,
            badgeText: '',
            headerColor: 'linear-gradient(135deg, #6c757d 0%, #495057 100%)',
            priceTable: JSON.stringify({ family: 280, couple: 255, individual: 140, student: 100 }),
            features: JSON.stringify([
                '11 events included (excludes 6 premium events)',
                'Best value for selective attendees'
            ]),
            ctaText: 'Select Plan', ctaLink: 'mailto:membership@jaxbengali.org',
            order: 3, active: true
        },
        // ── Deactivate old legacy slugs (keeps CMS clean) ──
        { slug: 'individual', name: 'Individual (legacy)', active: false, order: 99 },
        { slug: 'family',     name: 'Family (legacy)',     active: false, order: 99 },
        { slug: 'senior',     name: 'Senior (legacy)',     active: false, order: 99 }
    ],

    SponsorshipTiers: [
        {
            slug: 'platinum', name: 'Platinum', price: 2500, period: '/year',
            icon: 'fas fa-gem', iconGradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            benefits: JSON.stringify([
                'Logo on all event banners',
                'Full-page Jagriti ad',
                'VIP seating (10 seats)',
                'Social media promotion',
                'Website logo + link'
            ]),
            ctaLink: 'mailto:sponsorship@jaxbengali.org', order: 1, active: true
        },
        {
            slug: 'gold', name: 'Gold', price: 1000, period: '/year',
            icon: 'fas fa-medal', iconGradient: 'linear-gradient(135deg, #f7931e 0%, #f5af19 100%)',
            benefits: JSON.stringify([
                'Logo on main banner',
                'Half-page Jagriti ad',
                'VIP seating (6 seats)',
                'Social media mention'
            ]),
            ctaLink: 'mailto:sponsorship@jaxbengali.org', order: 2, active: true
        },
        {
            slug: 'silver', name: 'Silver', price: 500, period: '/year',
            icon: 'fas fa-award', iconGradient: 'linear-gradient(135deg, #6c757d 0%, #adb5bd 100%)',
            benefits: JSON.stringify([
                'Logo on event banner',
                'Quarter-page Jagriti ad',
                'Reserved seating (4 seats)',
                'Website mention'
            ]),
            ctaLink: 'mailto:sponsorship@jaxbengali.org', order: 3, active: true
        },
        {
            slug: 'bronze', name: 'Bronze', price: 250, period: '/year',
            icon: 'fas fa-trophy', iconGradient: 'linear-gradient(135deg, #cd7f32 0%, #b8860b 100%)',
            benefits: JSON.stringify([
                'Name on event banner',
                'Business card ad in Jagriti',
                'Reserved seating (2 seats)',
                'Thank you acknowledgment'
            ]),
            ctaLink: 'mailto:sponsorship@jaxbengali.org', order: 4, active: true
        }
    ],

    BudgetSummary: [
        {
            fiscalYear: '2026-2027',
            totalBudget: 50000,
            membershipTarget: 80,
            sponsorTarget: 18000,
            sponsorPrevYear: '$15,551 raised from 45 sponsors',
            sponsorPrevFY: 'FY 2024-25',
            notes: 'Based on FY 2026-2027 Budget',
            isCurrent: true
        }
    ],

    SiteContent: [
        { key: 'paymentZelle',      value: 'banfjax@gmail.com',                                              section: 'payment', active: true },
        { key: 'paymentSquareUrl',   value: 'https://squareup.com/store/bengali-association-of-north-florida', section: 'payment', active: true },
        { key: 'paymentSquareLabel', value: 'Pay Online',                                                     section: 'payment', active: true },
        { key: 'taxNotice',          value: 'BANF is a 501(c)(3) tax-deductible organization',                section: 'payment', active: true },
        { key: 'footerTagline',      value: 'Bengali Association of North Florida has been serving the Bengali community in Jacksonville since 2008.', section: 'footer', active: true },
        { key: 'footerCopyright',    value: '© 2026 Bengali Association of North Florida (BANF). All rights reserved.', section: 'footer', active: true },
        { key: 'contactEmail',       value: 'info@banfjax.org',                                               section: 'contact', active: true },
        { key: 'contactLocation',    value: 'Jacksonville, FL',                                               section: 'contact', active: true },
        { key: 'contactWebsite',     value: 'www.banfjax.org',                                                section: 'contact', active: true },
        { key: 'facebookUrl',        value: 'https://facebook.com/banfofficial',                              section: 'social',  active: true },
        { key: 'instagramUrl',       value: 'https://instagram.com/banf_jax',                                section: 'social',  active: true },
        { key: 'youtubeUrl',         value: 'https://youtube.com/@banfjacksonville',                         section: 'social',  active: true },
        { key: 'linkedinUrl',        value: 'https://linkedin.com/company/banf-jacksonville',                section: 'social',  active: true },
        { key: 'whatsappNumber',     value: '+19040000000',                                                   section: 'social',  active: true },
        { key: 'whatsappUrl',        value: 'https://wa.me/19040000000',                                      section: 'social',  active: true },
        { key: 'whatsappIngestEnabled', value: 'true',                                                        section: 'automation', active: true },
        { key: 'announcementsRequireApproval', value: 'true',                                                 section: 'automation', active: true },
        { key: 'announcementsAutoPublish', value: 'false',                                                    section: 'automation', active: true },
        { key: 'announcementsMinPriority', value: 'medium',                                                   section: 'automation', active: true },
        { key: 'heroBadge',          value: 'Since 2008 — 17 Years of Heritage',                             section: 'hero',    active: true },
        { key: 'heroTitle',          value: 'Bengali Association of<br>North Florida',                        section: 'hero',    active: true },
        { key: 'heroSubtitle',       value: 'Preserving Bengali culture, traditions, and heritage in Jacksonville — Building bridges between generations through community, celebration, and service.', section: 'hero', active: true },
        { key: 'heroBengali',        value: 'স্বাগতম | আমাদের পরিবারে আপনাকে স্বাগত',                       section: 'hero',    active: true },
        { key: 'membershipSeasonLabel', value: '2026-2027 Season',                                           section: 'membership', active: true }
    ],

    Announcements: [
        {
            title: 'BANF Kids & Youth Engagement Initiative',
            message: '',
            priority: 'high',
            category: 'program',
            source: 'email',
            imageUrl: 'announcement-banner.jpg',
            effectiveOn: '2026-03-03',
            expiresOn: '2026-07-31',
            pinned: true,
            order: 1,
            active: true
        },
        {
            title: 'Young Venture Builder — Registration Open',
            message: 'Dear all, good morning. Registration is now open for the week long game / learning experience program as part of BANF\'s kids and youth engagement initiative. Parents are requested to go through the details and register. This will also be open to all competition as part of our strategic program.',
            priority: 'high',
            category: 'program',
            source: 'email',
            linkUrl: 'https://banf-young-venture-builder.lovable.app/',
            linkText: 'Register — Young Venture Builder',
            effectiveOn: '2026-03-03',
            expiresOn: '2026-07-31',
            pinned: true,
            order: 2,
            active: true
        },
        {
            title: 'Youth Civic Design Lab — Competition for Grade 6-10',
            message: 'Registration link is now open for competition for grade 6 - grade 10 students. This is part of the youth engagement program. Students across Florida will be invited to participate. We are expecting at least 10 groups to participate. Depending on the membership category, the program is free. The actual program will launch in 1st week of July with mentor assigned.',
            priority: 'high',
            category: 'program',
            source: 'email',
            linkUrl: 'https://banf-youth-civ-design-lab.lovable.app/',
            linkText: 'Register — Youth Civic Design Lab',
            effectiveOn: '2026-03-03',
            expiresOn: '2026-07-31',
            pinned: true,
            order: 3,
            active: true
        },
        {
            title: 'Bosonto Utsob 2026 — March 7th',
            message: 'BANF Bosonto Utsob 2026 spring festival is on Saturday, March 7th at Southside Community Center, 10080 Beach Blvd, Jacksonville FL 32246. Enjoy cultural performances, Bengali spring festivities, food, music, and youth programs. M2 Premium members: complimentary entry. Contact banfjax@gmail.com for details.',
            priority: 'high',
            category: 'event',
            source: 'manual',
            effectiveOn: '2026-03-03',
            expiresOn: '2026-03-07',
            pinned: true,
            order: 4,
            active: true
        },
        {
            title: 'Membership Drive 2026-27 — Early Bird Open',
            message: 'BANF 2026-27 membership season is now open. M2 Premium (Early Bird) available until May 31, 2026: Family $375 | Couple $290 | Individual $215 | Student $145. Pay via Zelle to banfjax@gmail.com or online at squareup.com/store/bengali-association-of-north-florida.',
            priority: 'medium',
            category: 'membership',
            source: 'manual',
            linkUrl: 'https://squareup.com/store/bengali-association-of-north-florida',
            linkText: 'Pay Online via Square',
            effectiveOn: '2026-03-03',
            expiresOn: '2026-05-31',
            pinned: false,
            order: 5,
            active: true
        }
    ],

    Events: [
        {
            slug: 'bosonto-utsob-2026',
            name: 'Bosonto Utsob 2026',
            description: 'BANF spring cultural festival celebrating the Bengali new spring season. Features cultural performances, music, dance, youth programs, and traditional Bengali spring cuisine.',
            date: new Date('2026-03-22T17:00:00'),
            endDate: new Date('2026-03-22T22:00:00'),
            venue: 'Jacksonville, FL (TBD — contact banfjax@gmail.com)',
            ticketUrl: 'mailto:banfjax@gmail.com',
            imageUrl: '',
            category: 'cultural',
            isPremium: true,
            rsvpRequired: true,
            order: 1,
            active: true
        },
        {
            slug: 'holi-2026',
            name: 'Holi 2026',
            description: 'Spring festival of colors. Community celebration with color play, food, and music.',
            date: new Date('2026-03-28T15:00:00'),
            endDate: new Date('2026-03-28T19:00:00'),
            venue: 'Jacksonville, FL',
            ticketUrl: 'mailto:banfjax@gmail.com',
            imageUrl: '',
            category: 'cultural',
            isPremium: false,
            rsvpRequired: false,
            order: 2,
            active: true
        },
        {
            slug: 'nabo-borsho-2026',
            name: 'Nabo Borsho / Pohela Boishakh 2026',
            description: 'Bengali New Year 1433 celebration with cultural performances, community feast, and traditional festivities.',
            date: new Date('2026-04-14T17:00:00'),
            endDate: new Date('2026-04-14T21:00:00'),
            venue: 'Jacksonville, FL',
            ticketUrl: 'mailto:banfjax@gmail.com',
            imageUrl: '',
            category: 'cultural',
            isPremium: false,
            rsvpRequired: false,
            order: 3,
            active: true
        },
        {
            slug: 'spandan-2026',
            name: 'Spandan 2026',
            description: 'Annual BANF cultural showcase featuring music, dance, drama and performing arts by community members.',
            date: new Date('2026-05-17T17:00:00'),
            endDate: new Date('2026-05-17T21:00:00'),
            venue: 'Jacksonville, FL',
            ticketUrl: 'mailto:banfjax@gmail.com',
            imageUrl: '',
            category: 'cultural',
            isPremium: true,
            rsvpRequired: true,
            order: 4,
            active: true
        },
        {
            slug: 'sports-day-2026',
            name: 'Sports Day 2026',
            description: 'Annual family sports day and summer picnic with outdoor games, food, and community fellowship.',
            date: new Date('2026-07-12T10:00:00'),
            endDate: new Date('2026-07-12T17:00:00'),
            venue: 'Jacksonville, FL',
            ticketUrl: 'mailto:banfjax@gmail.com',
            imageUrl: '',
            category: 'sports',
            isPremium: false,
            rsvpRequired: false,
            order: 5,
            active: true
        },
        {
            slug: 'mahalaya-2026',
            name: 'Mahalaya 2026',
            description: 'Mahalaya — spiritual ceremony marking the beginning of Durga Puja season. Traditional dawn ceremony with community gathering.',
            date: new Date('2026-09-29T06:00:00'),
            endDate: new Date('2026-09-29T09:00:00'),
            venue: 'Jacksonville, FL',
            ticketUrl: 'mailto:banfjax@gmail.com',
            imageUrl: '',
            category: 'cultural',
            isPremium: true,
            rsvpRequired: false,
            order: 6,
            active: true
        },
        {
            slug: 'durga-puja-2026',
            name: 'Durga Puja 2026',
            description: 'BANF flagship annual event — multi-day Bengali cultural festival with Dhak drumming, cultural performances, Sindur Khela, Arati, authentic Bengali cuisine, and Protimovisarjan. Biggest community gathering of the year.',
            date: new Date('2026-10-09T17:00:00'),
            endDate: new Date('2026-10-12T22:00:00'),
            venue: 'Jacksonville, FL',
            ticketUrl: 'mailto:banfjax@gmail.com',
            imageUrl: '',
            category: 'cultural',
            isPremium: false,
            rsvpRequired: true,
            order: 7,
            active: true
        },
        {
            slug: 'kali-puja-2026',
            name: 'Kali Puja 2026',
            description: 'Annual Kali Puja celebration with traditional rituals, cultural programs, and community dinner.',
            date: new Date('2026-11-01T18:00:00'),
            endDate: new Date('2026-11-01T22:00:00'),
            venue: 'Jacksonville, FL',
            ticketUrl: 'mailto:banfjax@gmail.com',
            imageUrl: '',
            category: 'cultural',
            isPremium: true,
            rsvpRequired: false,
            order: 8,
            active: true
        },
        {
            slug: 'winter-picnic-2026',
            name: 'Winter Picnic 2026',
            description: 'Annual holiday gathering with community food, fun, prize distribution, and year-end celebration.',
            date: new Date('2026-12-13T12:00:00'),
            endDate: new Date('2026-12-13T17:00:00'),
            venue: 'Jacksonville, FL',
            ticketUrl: 'mailto:banfjax@gmail.com',
            imageUrl: '',
            category: 'social',
            isPremium: false,
            rsvpRequired: false,
            order: 9,
            active: true
        },
        {
            slug: 'saraswati-puja-2027',
            name: 'Saraswati Puja 2027',
            description: 'Educational and cultural celebration honoring Saraswati — Goddess of Knowledge. Special focus on BANF Bengali school and youth programs.',
            date: new Date('2027-01-27T17:00:00'),
            endDate: new Date('2027-01-27T21:00:00'),
            venue: 'Jacksonville, FL',
            ticketUrl: 'mailto:banfjax@gmail.com',
            imageUrl: '',
            category: 'cultural',
            isPremium: true,
            rsvpRequired: false,
            order: 10,
            active: true
        }
    ],

    RadioStations: [
        {
            name: 'BANF Radio',
            streamUrl: 'https://stream.jaxbengali.org/radio',
            description: 'BANF Community Radio — Bengali music, Rabindra Sangit, Bangla film songs, folk, and contemporary Bengali music streaming 24/7.',
            genre: 'Bengali Music',
            isPlaying: false,
            currentTrack: null,
            logoUrl: '',
            active: true
        }
    ],

    RadioSchedule: [
        { title: 'Rabindra Sangit Morning', genre: 'Rabindra Sangit', day: 'daily', startTime: '07:00', endTime: '09:00', host: 'BANF Radio', description: 'Start your morning with timeless Tagore songs.', order: 1, active: true },
        { title: 'Bangla Film Songs', genre: 'Bangla Film', day: 'daily', startTime: '09:00', endTime: '12:00', host: 'BANF Radio', description: 'Classic and contemporary Bengali film music.', order: 2, active: true },
        { title: 'Baul & Folk Music', genre: 'Folk', day: 'daily', startTime: '12:00', endTime: '14:00', host: 'BANF Radio', description: 'Traditional Baul, Bhatiali, Kirtan and folk songs of Bengal.', order: 3, active: true },
        { title: 'Contemporary Bangla', genre: 'Modern Bangla', day: 'daily', startTime: '14:00', endTime: '17:00', host: 'BANF Radio', description: 'Modern Bengali pop, indie, and fusion music.', order: 4, active: true },
        { title: 'Adhunik Bangla Gaan', genre: 'Adhunik', day: 'daily', startTime: '17:00', endTime: '20:00', host: 'BANF Radio', description: 'Classic Adhunik songs from legends of Bengali music.', order: 5, active: true },
        { title: 'Rabindra Sangit Evening', genre: 'Rabindra Sangit', day: 'daily', startTime: '20:00', endTime: '22:00', host: 'BANF Radio', description: 'Evening Rabindra Sangit — reflective and devotional songs.', order: 6, active: true },
        { title: 'Kirtan & Devotional', genre: 'Devotional', day: 'daily', startTime: '22:00', endTime: '00:00', host: 'BANF Radio', description: 'Devotional music — Kirtan, Shyama Sangit, bhajans.', order: 7, active: true },
        { title: 'Community Requests', genre: 'Mixed', day: 'sunday', startTime: '15:00', endTime: '18:00', host: 'BANF Community', description: 'Sunday member request hour — submit your favourite Bengali songs.', order: 8, active: true }
    ]
};
