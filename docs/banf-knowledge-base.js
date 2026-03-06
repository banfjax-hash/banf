/**
 * BANF Global Knowledge Base v1.0
 * ──────────────────────────────────────────────────────────────
 *  Centralized historical data for the Bengali Association of North Florida (BANF).
 *  Contains: EC members by year, events by year, membership fees by year,
 *  attendance data, payment history, and community statistics.
 *
 *  This data can be consumed by:
 *    • banf-chatbot-widget.js (knowledge engine)
 *    • admin-portal.html (analytics & dashboards)
 *    • member-portal.html (community info pages)
 *    • CRM reconciliation tools
 *
 *  Usage:  <script src="banf-knowledge-base.js"></script>
 *          Access via window.BANF_KB global object.
 */
(function () {
    'use strict';

    const BANF_KB = {

        /* ═══════════════════════════════════════════════════════════════════
         *  1.  EC MEMBERS BY YEAR
         * ═══════════════════════════════════════════════════════════════════*/
        ecByYear: {
            '2026-2028': {
                electedAt: 'GBM February 22, 2026',
                term: '2026–2028',
                members: [
                    { name: 'Dr. Ranadhir Ghosh',        role: 'President / IT Lead',    email: 'ranadhir.ghosh@gmail.com' },
                    { name: 'Partha Mukhopadhyay',       role: 'Vice President',          email: 'mukhopadhyay.partha@gmail.com' },
                    { name: 'Amit Chandak',              role: 'Treasurer',               email: 'amit.everywhere@gmail.com' },
                    { name: 'Rajanya Ghosh',             role: 'General Secretary',       email: 'rajanya.ghosh@gmail.com' },
                    { name: 'Dr. Moumita Ghosh',         role: 'Cultural Secretary',      email: 'moumita.mukherje@gmail.com' },
                    { name: 'Soumyajit Dutta (Banty)',   role: 'Food Coordinator',        email: 'duttasoumyajit86@gmail.com' },
                    { name: 'Dr. Sumanta Ghosh',         role: 'Event Coordinator',       email: 'sumo475@gmail.com' },
                    { name: 'Rwiti Choudhury',           role: 'Puja Coordinator',        email: 'rwitichoudhury@gmail.com' }
                ]
            },
            '2024-2026': {
                electedAt: 'GBM 2024',
                term: '2024–2026',
                members: [
                    { name: 'Suvankar Pal',              role: 'President' },
                    { name: 'Anita Mandal',              role: 'Vice President' },
                    { name: 'Tanay Bhaduri',             role: 'Vice President' },
                    { name: 'Partha Mukhopadhyay',       role: 'General Secretary' },
                    { name: 'Sreya Ghosh',               role: 'Treasurer' }
                ]
            },
            '2022-2024': {
                term: '2022–2024',
                members: [
                    { name: 'Suvankar Pal',              role: 'President' },
                    { name: 'Dr. Ranadhir Ghosh',        role: 'Vice President' }
                    // Additional members to be populated from Google Drive records
                ]
            }
        },

        /* ═══════════════════════════════════════════════════════════════════
         *  2.  EVENTS BY YEAR
         * ═══════════════════════════════════════════════════════════════════*/
        eventsByYear: {
            '2026-2027': {
                season: '2026-2027',
                totalEvents: 17,
                events: [
                    { name: 'Bosonto Utsob (Spring Festival)',      date: 'March 7, 2026',     type: 'Cultural',     m2Only: true },
                    { name: 'Nabo Borsho / Pohela Boishakh',        date: 'April 25, 2026',    type: 'Cultural',     m2Only: false },
                    { name: 'Kids Summer Sports Training',          date: 'Jun–Jul 2026',      type: 'Educational',  m2Only: false },
                    { name: 'Summer Workshops — Kids',              date: 'Jun–Jul 2026',      type: 'Educational',  m2Only: false },
                    { name: 'Summer Workshops — General',           date: 'Jun–Jul 2026',      type: 'Educational',  m2Only: false },
                    { name: 'Sports Day',                           date: 'July 2026',         type: 'Social',       m2Only: false },
                    { name: 'Spandan (Cultural Show)',              date: 'August 2026',       type: 'Cultural',     m2Only: true },
                    { name: 'Mahalaya Sandhya',                     date: 'October 17, 2026',  type: 'Religious',    m2Only: true },
                    { name: 'Durga Puja Day 1 & 2 + Lunch',        date: 'Oct 24–25, 2026',   type: 'Religious',    m2Only: false },
                    { name: 'Lakshmi Puja',                         date: 'October 25, 2026',  type: 'Religious',    m2Only: false },
                    { name: 'Bijoya Sonmiloni',                     date: 'October 25, 2026',  type: 'Social',       m2Only: false },
                    { name: 'Artist Program Day 1 + Dinner',        date: 'October 24, 2026',  type: 'Cultural',     m2Only: false },
                    { name: 'Artist Program Day 2 + Dinner',        date: 'October 25, 2026',  type: 'Cultural',     m2Only: false },
                    { name: 'Kali Puja + Food',                     date: 'November 7, 2026',  type: 'Religious',    m2Only: false },
                    { name: 'Natok (Drama) + Dinner',               date: 'November 7, 2026',  type: 'Cultural',     m2Only: false },
                    { name: 'Winter Picnic',                        date: 'January 2027',      type: 'Social',       m2Only: false },
                    { name: 'Saraswati Puja',                       date: 'February 27, 2027', type: 'Religious',    m2Only: true }
                ]
            },
            '2025-2026': {
                season: '2025-2026',
                totalEvents: 17,
                events: [
                    { name: 'Bosonto Utsob',                        date: 'March 2025',        type: 'Cultural' },
                    { name: 'Nabo Borsho / Pohela Boishakh',        date: 'April 2025',        type: 'Cultural' },
                    { name: 'Summer Programs',                      date: 'Jun–Jul 2025',      type: 'Educational' },
                    { name: 'Sports Day',                           date: 'July 2025',         type: 'Social' },
                    { name: 'Spandan (Cultural Show)',              date: 'August 2025',       type: 'Cultural' },
                    { name: 'Mahalaya Sandhya',                     date: 'October 2025',      type: 'Religious' },
                    { name: 'Durga Puja',                           date: 'October 2025',      type: 'Religious' },
                    { name: 'Kali Puja + Food',                     date: 'November 2025',     type: 'Religious' },
                    { name: 'Natok (Drama)',                         date: 'November 2025',     type: 'Cultural' },
                    { name: 'Winter Picnic',                        date: 'January 2026',      type: 'Social' },
                    { name: 'Saraswati Puja',                       date: 'February 2026',     type: 'Religious' }
                    // Additional events to be populated from records
                ]
            },
            '2024-2025': {
                season: '2024-2025',
                note: 'Major events — detailed attendance from Google Drive records',
                events: [
                    { name: 'Bosonto Utsob',                        date: 'March 2024',        type: 'Cultural' },
                    { name: 'Nabo Borsho',                          date: 'April 2024',        type: 'Cultural' },
                    { name: 'Durga Puja',                           date: 'October 2024',      type: 'Religious' },
                    { name: 'Kali Puja',                            date: 'November 2024',     type: 'Religious' },
                    { name: 'Winter Picnic',                        date: 'January 2025',      type: 'Social' },
                    { name: 'Saraswati Puja',                       date: 'February 2025',     type: 'Religious' }
                ]
            }
        },

        /* ═══════════════════════════════════════════════════════════════════
         *  3.  MEMBERSHIP FEES BY YEAR
         * ═══════════════════════════════════════════════════════════════════*/
        feesByYear: {
            '2026-2027': {
                season: '2026-2027',
                earlyBirdDeadline: 'May 31, 2026',
                tiers: [
                    {
                        code: 'M2-EB', name: 'M2 Premium (Early Bird)',
                        family: 375, couple: 330, individual: 205, student: 145,
                        events: 'All 17 events',
                        note: 'Available until May 31, 2026'
                    },
                    {
                        code: 'M2', name: 'M2 Premium',
                        family: 410, couple: 365, individual: 230, student: 165,
                        events: 'All 17 events',
                        note: 'After May 31, 2026'
                    },
                    {
                        code: 'M1', name: 'M1 Regular',
                        family: 280, couple: 255, individual: 140, student: 100,
                        events: '11 events (excludes 6 premium events)',
                        note: 'Discounted entry for remaining 6'
                    }
                ],
                specialPasses: [
                    { name: 'Culture Special Pass',   family: 200, couple: 175, individual: 100, student: 75, covers: '4 cultural events' },
                    { name: 'Durga Puja Celebration', family: 210, couple: 175, individual: 110, student: 80, covers: '5 puja events' },
                    { name: 'Durga Puja Core',        family: 150, couple: 125, individual: 80,  student: 60, covers: '3 puja events' }
                ]
            },
            '2025-2026': {
                season: '2025-2026',
                note: 'Previous year fees — from membership records',
                tiers: [
                    { code: 'M2', name: 'M2 Premium', family: 380, couple: 340, individual: 210, student: 150 },
                    { code: 'M1', name: 'M1 Regular', family: 260, couple: 240, individual: 130, student: 95 }
                ]
            },
            '2024-2025': {
                season: '2024-2025',
                note: 'Historical fees — approximate from records',
                tiers: [
                    { code: 'Full', name: 'Full Membership', family: 350, couple: 310, individual: 200, student: 140 }
                ]
            }
        },

        /* ═══════════════════════════════════════════════════════════════════
         *  4.  COMMUNITY STATISTICS BY YEAR
         * ═══════════════════════════════════════════════════════════════════*/
        statsByYear: {
            '2026': {
                totalPersons: 416,
                families: 105,
                activeMembers: 243,
                membershipRecords: 886,
                note: 'As of March 2026 — strongest enrollment period'
            },
            '2025': {
                paidMembers: 80,
                membershipRevenue: '$23,885',
                totalTransactions: 1085,
                eventBudget: '$30,500+',
                note: 'FY 2025-26 financials'
            },
            '2024': {
                note: 'To be populated from Google Drive financial records'
            }
        },

        /* ═══════════════════════════════════════════════════════════════════
         *  5.  ATTENDANCE DATA
         * ═══════════════════════════════════════════════════════════════════*/
        attendance: {
            note: 'Attendance data will be populated from event check-in records and Google Drive',
            '2025-2026': {
                'Bosonto Utsob 2026': { registered: null, attended: null, date: 'March 7, 2026' },
                'Durga Puja 2025': { registered: null, attended: null, date: 'October 2025' }
                // To be filled from event records
            }
        },

        /* ═══════════════════════════════════════════════════════════════════
         *  6.  PAYMENT SUMMARY BY YEAR
         * ═══════════════════════════════════════════════════════════════════*/
        paymentsByYear: {
            '2025-2026': {
                totalRevenue: '$23,885',
                paidFamilies: 80,
                paymentMethods: {
                    zelle: 'banfjax@gmail.com or (904) 712-2265',
                    square: 'squareup.com/store/bengali-association-of-north-florida',
                    check: 'Payable to: Bengali Association of North Florida (BANF)'
                },
                note: 'Membership revenue only — does not include sponsorship or event-specific fees'
            },
            '2024-2025': {
                note: 'To be populated from Square + Zelle transaction records'
            }
        },

        /* ═══════════════════════════════════════════════════════════════════
         *  7.  PROGRAMS & INITIATIVES
         * ═══════════════════════════════════════════════════════════════════*/
        programs: {
            bengaliSchool: {
                name: 'Bengali Language School',
                type: 'Educational',
                established: 2018,
                desc: 'ACTFL-aligned Bengali language program for K–5. Weekly Sat/Sun sessions. Florida Seal of Biliteracy eligible.',
                schedule: 'Saturdays/Sundays during school year'
            },
            jagriti: {
                name: 'Jagriti — Annual Literary Magazine',
                type: 'Cultural',
                latest: '2024-25 issue — 46 contributions, 22 advertisements',
                submitTo: 'banfjax@gmail.com with subject "MAGAZINE"'
            },
            radio: {
                name: 'BANF Radio',
                type: 'Cultural',
                desc: 'Online Bengali music streaming — Rabindra Sangit, Bangla film songs, folk, contemporary',
                access: 'Member portal at jaxbengali.org'
            },
            tagoreProject: {
                name: 'Tagore Worldwide Project',
                type: 'Cultural Diplomacy',
                desc: 'Spreading Rabindranath Tagore\'s works globally — outreach to governments and universities'
            },
            youngVenture: {
                name: 'Young Venture Builder Program',
                type: 'Youth Development',
                url: 'banf-young-venture-builder.lovable.app'
            }
        },

        /* ═══════════════════════════════════════════════════════════════════
         *  8.  SPONSORSHIP DATA
         * ═══════════════════════════════════════════════════════════════════*/
        sponsorship: {
            tiers: [
                { name: 'Title Sponsor',  amount: '$1,000+', benefits: 'Logo on all materials, social media feature, booth at Durga Puja' },
                { name: 'Gold Sponsor',   amount: '$500',    benefits: 'Logo in event programs, social media posts, recognition at events' },
                { name: 'Silver Sponsor', amount: '$250',    benefits: 'Name in event programs, social media mention' },
                { name: 'Bronze Sponsor', amount: '$100',    benefits: 'Name in Jagriti magazine' }
            ],
            currentSponsors: [
                'Aha Curry', 'Gulani Vision', 'Rod Realty', 'Synergy',
                'Tikka Bowls', 'Merrill Lynch'
                // Additional sponsors from records
            ],
            contact: 'banfjax@gmail.com'
        },

        /* ═══════════════════════════════════════════════════════════════════
         *  9.  ORGANIZATION INFO
         * ═══════════════════════════════════════════════════════════════════*/
        org: {
            name: 'Bengali Association of North Florida (BANF)',
            bengali: 'উত্তর ফ্লোরিডা বাঙালী সংঘ',
            altName: 'JAX Bengali',
            founded: 2008,
            type: '501(c)(3) nonprofit — tax-deductible',
            location: 'Jacksonville, North Florida (Duval County), FL 32256',
            mission: 'Preserve Bengali language, arts, and traditions; connect Bengali families across North Florida; engage youth; support social welfare; promote civic participation.',
            website: 'https://www.jaxbengali.org',
            email: 'banfjax@gmail.com',
            phone: '(904) 712-2265',
            social: {
                facebook: 'facebook.com/banfofficial',
                instagram: 'instagram.com/banf_jax',
                youtube: 'youtube.com/@banfjacksonville',
                linkedin: 'linkedin.com/company/banf-jacksonville'
            },
            portals: {
                main: 'https://www.jaxbengali.org',
                memberPortal: 'https://www.jaxbengali.org/member-portal.html',
                adminPortal: 'https://www.jaxbengali.org/admin-portal.html',
                ecSignup: 'https://www.jaxbengali.org/ec-signup.html',
                ecLogin: 'https://banfjax-hash.github.io/banf/ec-admin-login.html',
                memberLogin: 'https://banfjax-hash.github.io/banf/member-login.html'
            }
        }
    };

    // Expose globally
    window.BANF_KB = BANF_KB;

    console.log('[BANF KB] Global Knowledge Base v1.0 loaded —', Object.keys(BANF_KB).length, 'data sections');
})();
