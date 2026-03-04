/**
 * BANF Archive Document Mapper — v1.0
 * ─────────────────────────────────────────────────────────────
 * Maps all historical banf-data_ingest documents (PDFs, XLSX, PPTX,
 * TXT, HTML) into structured WixData collection entries, organized
 * by accounting year. Admins can verify and correct each mapping
 * via the archive-mapping portal page.
 *
 * Target WixData collection: ArchiveDocuments
 * Fields: filename, originalPath, fileType, category, subCategory,
 *         accountingYear, calendarYear, targetCollection, mappingStatus,
 *         confidence, notes, verifiedBy, verifiedAt, sourceFolder, fileSize
 *
 * Endpoints:
 *   GET  /archive_catalog       — full document catalogue (static)
 *   POST /archive_map           — run mapping for a year → upsert to WixData
 *   GET  /archive_map_report    — fetch saved mappings from WixData
 *   POST /archive_map_update    — admin corrects/verifies a mapping
 */

import wixData from 'wix-data';
import { collections as wixCollections } from 'wix-data.v2';
import { ok, badRequest, serverError } from 'wix-http-functions';
import { fetch as wixFetch } from 'wix-fetch';

const SA = { suppressAuth: true };
const COLLECTION = 'ArchiveDocuments';
const WIX_API_KEY = 'IST.eyJraWQiOiJQb3pIX2FDMiIsImFsZyI6IlJTMjU2In0.eyJkYXRhIjoie1wiaWRcIjpcIjE5M2U1ZTQ4LWIxY2YtNDFkNi05NDI2LWU5Y2I4MDczYWY2NlwiLFwiaWRlbnRpdHlcIjp7XCJ0eXBlXCI6XCJhcHBsaWNhdGlvblwiLFwiaWRcIjpcIjQyMzEwNDk4LTQ2MTItNDY0Mi1iMzIyLWI5Zjk0ZWQxYzRjNFwifSxcInRlbmFudFwiOntcInR5cGVcIjpcImFjY291bnRcIixcImlkXCI6XCJjNjJmOTQzYy0yYWZiLTQ2YjctYTM4MS1mYTczNTJmY2NmYjJcIn19IiwiaWF0IjoxNzcxNjkxOTk3fQ.GVx8jeX6lw2qF3cTWQJX4hWVs_unIkBJAgywR_sbASHyJhs95w6euuWIRW5CfQ_PSZmCKHw6ma5IpQawGhR79hYUi46_49yAg9fCklP60iJJlPLKdLj6NtOVIoYoc-WsG8nOW_9qo1om08YA-Qh_5O-oZv6oRW2gk7C2eOF5E1pjt0CgmVIRK8z5HvVqlXYftO9NtaSfHh9vhSVPkxVU6jp1OJBsR_UdcdL6Rpiv-bJx0hKJJOfNJMc89oEBiCaAJ4No65-FsGouo2yIYUCsDAQTtBk9rWh3cH8_n-ts0WK57kdtXVKRqQ5g7ch5usUdFAUBTSaviGXpExj5VoTVKQ';
const WIX_SITE_ID = 'c13ae8c5-7053-4f2d-9a9a-371869be4395';

// ── CORS / response helpers ─────────────────────────────────────────────────
function jsonOk(data)       { return ok({ body: JSON.stringify({ success: true, ...data }), headers: corsH() }); }
function jsonErr(msg, s=400){ return (s===400?badRequest:serverError)({ body: JSON.stringify({ success: false, message: msg }), headers: corsH() }); }
function corsH()            { return { 'Content-Type':'application/json','Access-Control-Allow-Origin':'*' }; }
export function options_archive_catalog(req)    { return ok({ body:'', headers: { 'Access-Control-Allow-Origin':'*','Access-Control-Allow-Methods':'GET,POST,OPTIONS','Access-Control-Allow-Headers':'Content-Type,x-admin-email,x-admin-token' }}); }
export function options_archive_map(req)        { return options_archive_catalog(req); }
export function options_archive_map_report(req) { return options_archive_catalog(req); }
export function options_archive_map_update(req) { return options_archive_catalog(req); }

// ── Accounting year helpers ─────────────────────────────────────────────────
function fyLabel(startYear) { return `FY${startYear}-${String(startYear+1).slice(2)}`; }

// Maps a calendar year mention to an accounting year (Apr–Mar cycle)
// BANF accounting year runs April–March, e.g. FY2024-25 = Apr 2024–Mar 2025
function calYearToFY(calYear) {
    const y = parseInt(calYear);
    if (!y) return null;
    // A document mentioning "2025" could be FY2024-25 or FY2025-26.
    // We default to FY{y-1}-{y} (year ending) for financial docs,
    // but for events we use the year itself as the start year.
    // The classifier handles this via category-specific rules.
    return fyLabel(y - 1); // default: year-ending convention
}

function fyFromName(name) {
    // Direct FY pattern
    const fyM = name.match(/FY(\d{4})[_-]?(\d{2,4})/i);
    if (fyM) return `FY${fyM[1]}-${fyM[2].slice(-2)}`;

    // Year range like "2022-2023" or "2022_2023"
    const rangeM = name.match(/(\d{4})[_-](\d{4})/);
    if (rangeM) return fyLabel(parseInt(rangeM[1]));

    // Year range like "2025-26"
    const shortM = name.match(/(\d{4})[_-](\d{2})\b/);
    if (shortM) return `FY${shortM[1]}-${shortM[2]}`;

    // Single 4-digit year
    const yearM = name.match(/\b(20\d{2})\b/);
    if (yearM) return fyLabel(parseInt(yearM[1]) - 1); // default: year-ending

    return null;
}

function eventYearFromName(name) {
    // For events, the year in the name IS the event year (start of FY)
    // E.g. DurgaPuja_2025 → event in 2025 → FY2025-26
    const yearM = name.match(/\b(20\d{2})\b/);
    if (yearM) return fyLabel(parseInt(yearM[1]));
    return null;
}

// ── Category & Collection routing ──────────────────────────────────────────
const EVENT_KEYWORDS = [
    'durgapuja','durga puja','durga_puja','holi','kalipuja','kali puja',
    'mahalaya','nabo_borsho','naboborsho','nabo borsho','spandan','sports',
    'summercamp','summer_camp','summer camp','winter picnic','winterpicnic',
    'saraswati puja','saraswatipuja','jagriti','trijoy','april_9th',
    'april 9th','sportsday','picnic','invitation'
];
const FINANCIAL_KEYWORDS = [
    'financial summary','budget','tax-990','tax 990','payment receipt',
    'checkout','financial_summary','financial summary','banf_financial'
];
const MEMBERSHIP_KEYWORDS = [
    'membership','sponsorship','family_universe','family universe',
    'member directory','member_directory','membership fee','membership 202'
];
const GOVERNANCE_KEYWORDS = [
    'gbm','ec transition','legal','grant','transition'
];
const COMM_KEYWORDS = [
    'bengali_school','bengali school','tagore','communication'
];
const VENDOR_KEYWORDS = ['vendor','vendordetails'];

const SUB_CATEGORY_MAP = [
    { pattern:/durgapuja|durga.?puja/i,       sub:'Durga Puja',          col:'Events' },
    { pattern:/holi/i,                         sub:'Holi',                col:'Events' },
    { pattern:/kalipuja|kali.?puja/i,          sub:'Kali Puja',           col:'Events' },
    { pattern:/mahalaya/i,                     sub:'Mahalaya',            col:'Events' },
    { pattern:/nabo.?borsho/i,                 sub:'Nabo Borsho',         col:'Events' },
    { pattern:/spandan/i,                      sub:'Spandan',             col:'Events' },
    { pattern:/sports.?day|sports.?event|sportsday/i, sub:'Sports Event', col:'Events' },
    { pattern:/summer.?camp/i,                 sub:'Summer Camp',         col:'Events' },
    { pattern:/winter.?picnic/i,               sub:'Winter Picnic',       col:'Events' },
    { pattern:/saraswati/i,                    sub:'Saraswati Puja',      col:'Events' },
    { pattern:/jagriti/i,                      sub:'Jagriti',             col:'Events' },
    { pattern:/trijoy/i,                       sub:'Trijoy',              col:'Events' },
    { pattern:/invitation|april.?9/i,          sub:'Invitation',          col:'Events' },
    { pattern:/financial.?summary|budget/i,    sub:'Financial Report',    col:'FinancialEntries' },
    { pattern:/tax.?990/i,                     sub:'Tax Filing 990',      col:'FinancialEntries' },
    { pattern:/payment.?receipt|checkout/i,    sub:'Payment Receipt',     col:'FinancialEntries' },
    { pattern:/membership.*spons|spons.*membership/i, sub:'Membership & Sponsorship', col:'MembershipRegistrations' },
    { pattern:/membership.?fee|fee.?decide/i,  sub:'Membership Fee Structure', col:'MembershipRegistrations' },
    { pattern:/membership.202/i,               sub:'Membership Drive',    col:'MembershipRegistrations' },
    { pattern:/family.?universe/i,             sub:'Family Universe',     col:'Members' },
    { pattern:/member.?director/i,             sub:'Member Directory',    col:'Members' },
    { pattern:/gbm/i,                          sub:'GBM Minutes',         col:'AdminRoles' },
    { pattern:/ec.?transition/i,               sub:'EC Transition',       col:'AdminRoles' },
    { pattern:/legal/i,                        sub:'Legal Guide',         col:'AdminRoles' },
    { pattern:/grant/i,                        sub:'Grant Readiness',     col:'AdminRoles' },
    { pattern:/bengali.?school/i,              sub:'Bengali School',      col:'KnowledgeBase' },
    { pattern:/tagore/i,                       sub:'Tagore Project',      col:'KnowledgeBase' },
    { pattern:/vendor/i,                       sub:'Vendor Details',      col:'Vendors' },
];

function classify(filename, folder) {
    const lf = (filename + ' ' + folder).toLowerCase();
    let category = 'Other', subCategory = filename, targetCollection = 'KnowledgeBase', confidence = 'low';

    // Sub-category match (most specific)
    for (const rule of SUB_CATEGORY_MAP) {
        if (rule.pattern.test(filename)) {
            subCategory     = rule.sub;
            targetCollection= rule.col;
            confidence      = 'high';
            // Set parent category
            if (['Events'].includes(rule.col)) category = 'Events';
            else if (['FinancialEntries'].includes(rule.col)) category = 'Financial';
            else if (['MembershipRegistrations','Members'].includes(rule.col)) category = 'Membership';
            else if (['AdminRoles'].includes(rule.col)) category = 'Governance';
            else if (['KnowledgeBase'].includes(rule.col)) category = 'Communication';
            else if (['Vendors'].includes(rule.col)) category = 'Vendor';
            break;
        }
    }

    // Fallback keyword category
    if (confidence === 'low') {
        if (EVENT_KEYWORDS.some(k => lf.includes(k)))      { category='Events';    targetCollection='Events';    confidence='medium'; }
        else if (FINANCIAL_KEYWORDS.some(k=>lf.includes(k))){ category='Financial'; targetCollection='FinancialEntries'; confidence='medium'; }
        else if (MEMBERSHIP_KEYWORDS.some(k=>lf.includes(k))){ category='Membership';targetCollection='MembershipRegistrations'; confidence='medium'; }
        else if (GOVERNANCE_KEYWORDS.some(k=>lf.includes(k))){ category='Governance';targetCollection='AdminRoles'; confidence='medium'; }
        else if (COMM_KEYWORDS.some(k=>lf.includes(k)))    { category='Communication';targetCollection='KnowledgeBase';confidence='medium'; }
        else if (VENDOR_KEYWORDS.some(k=>lf.includes(k)))  { category='Vendor';    targetCollection='Vendors';   confidence='medium'; }
        else if (lf.includes('output') || lf.includes('presentation') || lf.includes('analysis') || lf.includes('report')) {
            category='Analysis'; targetCollection='KnowledgeBase'; confidence='low';
        }
    }
    return { category, subCategory, targetCollection, confidence };
}

function getFileType(filename) {
    const ext = filename.split('.').pop().toLowerCase();
    return ext;
}

function sourceFolderLabel(path) {
    if (/22-24EC/i.test(path)) return '22-24EC';
    if (/24-26EC/i.test(path)) return '24-26EC';
    if (/presentations/i.test(path)) return 'presentations';
    if (/pptx_agent/i.test(path)) return 'pptx_agent';
    if (/output[/\\]data/i.test(path)) return 'output/data';
    if (/output/i.test(path)) return 'output';
    if (/context/i.test(path)) return 'context';
    if (/data/i.test(path)) return 'data';
    return 'root';
}

// ────────────────────────────────────────────────────────────────────────────
// DOCUMENT CATALOGUE — complete static manifest of all known archive files
// This is the ground truth since Wix backend cannot read local filesystem.
// Organized as: { path, size } where path is relative to banf-data_ingest/
// ────────────────────────────────────────────────────────────────────────────
const DOCUMENT_CATALOGUE = [
    // ── Root level ──────────────────────────────────────────────────────────
    { path: 'BANF Membership 2025 - 26.xlsx',           size:   9768 },
    { path: 'BANF_DATA_INSIGHTS_REPORT.md',             size:  11475 },
    { path: 'BANF_DIGITIZATION_MIGRATION_PLAN.md',      size:  45704 },
    { path: 'BANF_DOCUMENT_CATEGORY_PLANNER.md',        size:  10220 },
    { path: 'BANF_SEMANTIC_SCHEMA_DESIGN.md',           size:  51184 },
    { path: 'BANF-EC Transition-7thFeb2026.pptx',       size:15977083 },
    { path: 'grant_readiness_assessment.html',          size: 116960 },
    { path: 'KaliPuja_2025.xlsx',                       size:  21913 },
    { path: 'legal_guide.txt',                          size:  17749 },
    { path: 'Saraswati Puja.xlsx',                      size:  58641 },
    { path: 'SaraswatiPuja2026.xlsx',                   size:  10744 },
    { path: 'event_analysis_report.html',               size:  38255 },
    { path: 'tier_fee_distribution_analysis.html',      size:  56582 },
    { path: 'Winter Picnic 2026.xlsx',                  size:   6062 },
    { path: 'ADVANCED_INSIGHTS_DESIGN.md',              size:  35727 },
    // ── context/ ────────────────────────────────────────────────────────────
    { path: 'context/BANF- GBM-31st March 2024.pdf',   size:1720167 },
    { path: 'context/bengali_school.txt',               size:  46404 },
    { path: 'context/tagore_project.txt',               size:   1052 },
    // ── data/ root ──────────────────────────────────────────────────────────
    { path: 'data/BANF- GBM-31st March 2024.pdf',      size:1720167 },
    { path: 'data/BANF Membership 2025 - 26.pdf',       size:  65376 },
    { path: 'data/BANF Membership 2025 - 26.xlsx',      size:   9768 },
    { path: 'data/BANF Membership Fee decide.xlsx',     size: 274375 },
    { path: 'data/BANF_Family_Universe_v3.xlsx',        size:  41505 },
    { path: 'data/BANF_Membership_Value_Decomposition_2026_Amit.xlsx', size:31631 },
    { path: 'data/Budget Estimation for Cultural Integration and Social Welfare.pptx', size:229407 },
    { path: 'data/Financial Summary 2020-2021.pptx',    size:  40026 },
    { path: 'data/Financial Summary 2021-2022.pptx',    size:  91533 },
    { path: 'data/Financial Summary 2022-2023.pptx',    size:  91746 },
    { path: 'data/Financial Summary 2023-2024.pptx',    size:  77756 },
    { path: 'data/Financial Summary 2024-2025.pptx',    size: 188286 },
    // ── data/22-24EC/ ────────────────────────────────────────────────────────
    { path: 'data/22-24EC/BANF 2024-2025 Membership and Sponsorship.pdf', size:153174 },
    { path: 'data/22-24EC/BANF Membership 2025 - 26.pdf',                 size: 65376 },
    { path: 'data/22-24EC/DurgaPuja.pdf',               size: 124647 },
    { path: 'data/22-24EC/Holi.pdf',                    size:  35658 },
    { path: 'data/22-24EC/KaliPuja.pdf',                size: 102113 },
    { path: 'data/22-24EC/Mahalaya.pdf',                size:  50549 },
    { path: 'data/22-24EC/Mahalaya_2025.pdf',           size:  29011 },
    { path: 'data/22-24EC/Nabo_Borsho_2024.pdf',        size: 126812 },
    { path: 'data/22-24EC/NaboBorsho2025.pdf',          size:  38125 },
    { path: 'data/22-24EC/Saraswati Puja.pdf',          size:  55457 },
    { path: 'data/22-24EC/Spandan.pdf',                 size: 149248 },
    { path: 'data/22-24EC/Spandan_2025.pdf',            size: 113422 },
    { path: 'data/22-24EC/Sports Event.pdf',            size: 111058 },
    { path: 'data/22-24EC/Summer_Camp.pdf',             size:  58912 },
    { path: 'data/22-24EC/VendorDetails.pdf',           size:  48380 },
    // ── data/24-26EC/ ────────────────────────────────────────────────────────
    { path: 'data/24-26EC/April_9th_Invitation.pdf',    size:  36927 },
    { path: 'data/24-26EC/BANF 2022 Sports Event.pdf',  size: 110716 },
    { path: 'data/24-26EC/BANF 2022-2023 Membership and Sponsorship.pdf', size:155321 },
    { path: 'data/24-26EC/BANF 2023-2024 Membership and Sponsorship.pdf', size:231207 },
    { path: 'data/24-26EC/BANF 2025-2026 Membership and Sponsorship.pdf', size:159622 },
    { path: 'data/24-26EC/BANF Membership 2025 - 26.pdf',                 size: 66103 },
    { path: 'data/24-26EC/Durga Puja 2022 Planning.pdf',size:  55761 },
    { path: 'data/24-26EC/Durga Puja track.pdf',        size:  49913 },
    { path: 'data/24-26EC/DurgaPuja_2025.pdf',          size: 117937 },
    { path: 'data/24-26EC/DurgaPuja-25.pdf',            size: 130190 },
    { path: 'data/24-26EC/Jagriti 2022.xlsx',           size:  16814 },
    { path: 'data/24-26EC/Jagriti 2023.xlsx',           size:  17328 },
    { path: 'data/24-26EC/Mahalaya 09-24-2022 Planning.pdf', size:58244 },
    { path: 'data/24-26EC/SportsDay Picnic (4-10-22) Planning.pdf', size:72457 },
    { path: 'data/24-26EC/Trijoy ticket.pdf',           size:  57042 },
    { path: 'data/24-26EC/Untitled spreadsheet.pdf',    size:  62597 },
    { path: 'data/24-26EC/Winter Picnic 2026.pdf',      size:  58802 },
    // ── pptx_agent/ ──────────────────────────────────────────────────────────
    { path: 'pptx_agent/banf-tax-990-2025.pdf',         size:  73063 },
    { path: 'pptx_agent/Common Checkout Payment Receipt-parttha Sunbiz.pdf', size:86852 },
    // ── presentations/ ───────────────────────────────────────────────────────
    { path: 'presentations/01_BANF_Membership_Categories_FY2026.pptx',  size:37368 },
    { path: 'presentations/02_BANF_Fee_Structure_Changes_FY2026.pptx',  size:36755 },
    { path: 'presentations/03_BANF_Value_Decomposition_FY2026.pptx',    size:37222 },
    { path: 'presentations/04_BANF_Event_Access_Matrix_FY2026.pptx',    size:40158 },
    { path: 'presentations/05_BANF_Financial_Analysis.pptx',            size:44569 },
    { path: 'presentations/06_BANF_Condensed.pptx',                     size:51290 },
    { path: 'presentations/BANF_FY2026-27_Complete_Proposal.pptx',      size:111429 },
    { path: 'presentations/BANF_FY2026-27_Condensed_Proposal.pptx',     size:149796 },
    { path: 'presentations/BANF_FY2026-27_Final_Presentation.pptx',     size:995673 },
    // ── output/ key files ────────────────────────────────────────────────────
    { path: 'output/BANF_Comprehensive_Membership_Report_2026.xlsx',    size:22155 },
    { path: 'output/BANF_Family_Universe_v3.xlsx',                      size:38173 },
    { path: 'output/BANF_FINANCIAL_RECONCILIATION_FINAL.md',            size: 4211 },
    { path: 'output/BANF_FINANCIAL_RECONCILIATION_REPORT.md',           size: 5561 },
    { path: 'output/BANF_Financial_Report_FY2627_LATEST.pptx',          size:48199 },
    { path: 'output/BANF_GBM_EC_2026-28_Budget_Presentation.pptx',      size:47866 },
    { path: 'output/BANF_GBM_Presentation_FY2024-25.pptx',              size:43244 },
    { path: 'output/BANF_Membership_Retention_Analysis.xlsx',           size:40643 },
    { path: 'output/comprehensive_financial_overview.html',             size:49528 },
    { path: 'output/insights_dashboard.html',                           size:76720 },
    { path: 'output/leadership_dashboard.html',                         size:348136 },
    { path: 'output/validated_financial_dashboard.html',                size:61417 },
];

// ── Year-aware mapping ──────────────────────────────────────────────────────
function inferAccountingYear(entry, cls) {
    const filename = entry.path.split('/').pop().split('\\').pop();
    const folder   = sourceFolderLabel(entry.path);

    // For events → year in name IS the event year (start of FY)
    if (cls.category === 'Events') {
        const fy = eventYearFromName(filename) || fyFromName(filename);
        if (fy) return fy;
        // Folder-based fallback
        if (folder === '22-24EC') return 'FY2022-23';
        if (folder === '24-26EC') return 'FY2024-25';
    }

    // Try FY label in path
    const pathFY = fyFromName(entry.path);
    if (pathFY) return pathFY;

    // For financial docs with year range in name
    if (cls.category === 'Financial') {
        const rangeM = filename.match(/(\d{4}).(\d{4})/);
        if (rangeM) return `FY${rangeM[1]}-${rangeM[2].slice(-2)}`;
        const singleM = filename.match(/\b(20\d{2})\b/);
        if (singleM) return fyLabel(parseInt(singleM[1]) - 1);
    }

    // Folder default
    if (folder === '22-24EC') return 'FY2022-23';
    if (folder === '24-26EC') return 'FY2024-25';
    if (folder === 'context') return 'FY2023-24';

    // Generic year extraction
    const yearM = filename.match(/\b(20\d{2})\b/);
    if (yearM) return fyLabel(parseInt(yearM[1]) - 1);

    return 'unknown';
}

function calYear(fy) {
    const m = (fy||'').match(/FY(\d{4})/);
    return m ? parseInt(m[1]) : null;
}

// ── Build full document record ──────────────────────────────────────────────
function buildRecord(entry) {
    const filename = entry.path.split('/').pop().split('\\').pop();
    const folder   = sourceFolderLabel(entry.path);
    const cls      = classify(filename, folder);
    const fy       = inferAccountingYear(entry, cls);
    const cy       = calYear(fy);

    return {
        filename,
        originalPath:    entry.path,
        fileType:        getFileType(filename),
        category:        cls.category,
        subCategory:     cls.subCategory,
        accountingYear:  fy,
        calendarYear:    cy,
        targetCollection:cls.targetCollection,
        mappingStatus:   'auto-mapped',
        confidence:      cls.confidence,
        notes:           '',
        verifiedBy:      '',
        verifiedAt:      null,
        sourceFolder:    folder,
        fileSize:        entry.size,
        // Wix key for upsert
        docKey:          entry.path.replace(/[^a-zA-Z0-9]/g, '_'),
        source:          'catalogue',
    };
}

// ── Ensure ArchiveDocuments collection exists, create it if not ────────────────────
let _collectionReady = false;
async function ensureCollection() {
    if (_collectionReady) return;
    // 1. Check if collection already accessible
    try {
        await wixData.query(COLLECTION).limit(1).find(SA);
        _collectionReady = true; return;
    } catch(_) {}

    // 2. Try wix-data.v2 createCollection (works from live backend context)
    try {
        await wixCollections.createCollection({
            collection: {
                id: COLLECTION,
                displayName: 'Archive Documents',
                permissions: {
                    read:   { roles: ['ADMIN'] },
                    insert: { roles: ['ADMIN'] },
                    update: { roles: ['ADMIN'] },
                    remove: { roles: ['ADMIN'] }
                }
            }
        });
        _collectionReady = true; return;
    } catch(_) {}

    // 3. Try wixData.save() — some Wix environments auto-create on first write
    try {
        const probe = await wixData.save(COLLECTION, { _setupInit: true }, SA);
        if (probe?._id) {
            await wixData.remove(COLLECTION, probe._id, SA).catch(()=>{});
            _collectionReady = true; return;
        }
    } catch(_) {}

    // Mark ready and let actual insert fail loudly if still broken
    _collectionReady = false;
}

// ── Auto-create any named collection via Wix Data REST API ────────────────
const _colsEnsured = {};
async function ensureAnyCollection(name) {
    if (_colsEnsured[name]) return;
    try {
        await wixData.query(name).limit(1).find(SA);
        _colsEnsured[name] = true; return;
    } catch(_) {}
    try {
        const resp = await wixFetch('https://www.wixapis.com/wix-data/v2/collections', {
            method: 'POST',
            headers: { 'Content-Type':'application/json', 'Authorization': WIX_API_KEY, 'wix-site-id': WIX_SITE_ID },
            body: JSON.stringify({ collection: { id: name, displayName: name } })
        });
        if (resp.status >= 200 && resp.status < 300) { _colsEnsured[name] = true; }
    } catch(_) {}
}

// ─────────────────────────────────────────────────────────────────────────────
// SETUP ENDPOINT  (run once to create the WixData collection)
// ─────────────────────────────────────────────────────────────────────────────
const ARCHIVE_FIELDS = [
    { key:'docKey',           type:'TEXT', displayName:'Doc Key (unique)' },
    { key:'filename',         type:'TEXT', displayName:'Filename' },
    { key:'originalPath',     type:'TEXT', displayName:'Original Path / URL' },
    { key:'fileType',         type:'TEXT', displayName:'File Type' },
    { key:'category',         type:'TEXT', displayName:'Category' },
    { key:'subCategory',      type:'TEXT', displayName:'Sub-Category' },
    { key:'accountingYear',   type:'TEXT', displayName:'Accounting Year' },
    { key:'calendarYear',     type:'NUMBER', displayName:'Calendar Year' },
    { key:'targetCollection', type:'TEXT', displayName:'Target Collection' },
    { key:'mappingStatus',    type:'TEXT', displayName:'Mapping Status' },
    { key:'confidence',       type:'TEXT', displayName:'Confidence' },
    { key:'source',           type:'TEXT', displayName:'Data Source' },
    { key:'notes',            type:'TEXT', displayName:'Notes' },
    { key:'verifiedBy',       type:'TEXT', displayName:'Verified By' },
    { key:'verifiedAt',       type:'TEXT', displayName:'Verified At' },
    { key:'sourceFolder',     type:'TEXT', displayName:'Source Folder' },
    { key:'fileSize',         type:'TEXT', displayName:'File Size' },
    { key:'driveFileId',      type:'TEXT', displayName:'Google Drive File ID' },
    { key:'driveLink',        type:'TEXT', displayName:'Google Drive Link' },
    { key:'modifiedTime',     type:'TEXT', displayName:'Modified Time' },
    { key:'gmailMessageId',   type:'TEXT', displayName:'Gmail Message ID' },
    { key:'emailDate',        type:'TEXT', displayName:'Email Date' },
    { key:'emailFrom',        type:'TEXT', displayName:'Email From' },
    { key:'emailSubject',     type:'TEXT', displayName:'Email Subject' },
];

/**
 * POST /archive_setup
 * Creates the ArchiveDocuments Wix CMS collection.
 * Call once via admin panel before running the full scan.
 * Safe to call again — skips if already exists.
 */
export async function post_archive_setup(request) {
    const steps = [];
    let collectionExists = false;

    // Step 1: Check if already exists
    try {
        const test = await wixData.query(COLLECTION).limit(1).find(SA);
        collectionExists = true;
        steps.push({ step: 'check', status: 'exists', message: `${COLLECTION} collection already exists (${test.totalCount} records)` });
    } catch(e) {
        steps.push({ step: 'check', status: 'missing', message: e.message });
    }

    if (!collectionExists) {
        // Step 2a: Try wix-data.v2 createCollection with full field definitions
        try {
            await wixCollections.createCollection({
                collection: {
                    id:          COLLECTION,
                    displayName: 'Archive Documents',
                    permissions: {
                        read:   { roles: ['ADMIN'] },
                        insert: { roles: ['ADMIN'] },
                        update: { roles: ['ADMIN'] },
                        remove: { roles: ['ADMIN'] }
                    },
                    fields: ARCHIVE_FIELDS.map(f => ({
                        key:         f.key,
                        displayName: f.displayName,
                        type:        f.type === 'NUMBER' ? 'NUMBER' : 'TEXT',
                    }))
                }
            });
            collectionExists = true;
            steps.push({ step: 'createCollection-v2', status: 'ok', message: 'Collection created via wix-data.v2' });
        } catch(e2) {
            steps.push({ step: 'createCollection-v2', status: 'error', error: e2.message });

            // Step 2b: Try Wix Data REST API with site API key
            try {
                const restBody = { collection: { id: COLLECTION, displayName: 'Archive Documents' } };
                const resp = await wixFetch(
                    'https://www.wixapis.com/wix-data/v2/collections',
                    { method: 'POST',
                      headers: { 'Content-Type': 'application/json', 'Authorization': WIX_API_KEY, 'wix-site-id': WIX_SITE_ID },
                      body: JSON.stringify(restBody) }
                );
                const data = await resp.json().catch(() => ({}));
                if (resp.status >= 200 && resp.status < 300) {
                    collectionExists = true;
                    steps.push({ step: 'rest-api-create', status: 'ok', message: `Collection created via Wix REST API (${resp.status})` });
                } else {
                    steps.push({ step: 'rest-api-create', status: 'error', error: `HTTP ${resp.status}: ${JSON.stringify(data)}` });
                    // Step 2c: Try wixData.save() to auto-create
                    try {
                        const prb = await wixData.save(COLLECTION, { _setupInit: true, __ts: Date.now() }, SA);
                        if (prb?._id) {
                            await wixData.remove(COLLECTION, prb._id, SA).catch(()=>{});
                            collectionExists = true;
                            steps.push({ step: 'save-probe', status: 'ok', message: 'Collection auto-created via wixData.save()' });
                        }
                    } catch(e3) {
                        steps.push({ step: 'save-probe', status: 'error', error: e3.message });
                    }
                }
            } catch(e3) {
                steps.push({ step: 'rest-api-create', status: 'error', error: e3.message });
            }
        }
    }

    // Step 3: If collection now exists, insert+remove a probe record to instantiate all fields
    if (collectionExists) {
        try {
            const probeDoc = { __fieldProbe: true };
            ARCHIVE_FIELDS.forEach(f => {
                probeDoc[f.key] = f.type === 'NUMBER' ? 0 : '__probe';
            });
            const inserted = await wixData.insert(COLLECTION, probeDoc, SA);
            if (inserted?._id) {
                await wixData.remove(COLLECTION, inserted._id, SA).catch(()=>{});
                steps.push({ step: 'field-probe', status: 'ok', message: `All ${ARCHIVE_FIELDS.length} fields instantiated` });
            }
        } catch(ep) {
            steps.push({ step: 'field-probe', status: 'warn', message: ep.message });
        }
    }

    _collectionReady = collectionExists;
    const overallStatus = collectionExists ? 'ready' : 'failed';
    return jsonOk({
        collection: COLLECTION,
        status: overallStatus,
        steps,
        ready: collectionExists,
        message: collectionExists
            ? `✅ ${COLLECTION} collection is ready. You can now run POST /archive_full_scan.`
            : `❌ Could not create ${COLLECTION}. Please create it manually in the Wix Dashboard CMS.`
    });
}
export function options_archive_setup(req) { return options_archive_catalog(req); }

/**
 * GET /archive_setup
 * Check if ArchiveDocuments collection exists and is accessible.
 */
export async function get_archive_setup(request) {
    try {
        const test = await wixData.query(COLLECTION).limit(1).find(SA);
        return jsonOk({
            collection: COLLECTION, status: 'ready', ready: true,
            recordCount: test.totalCount,
            message: `${COLLECTION} is accessible (${test.totalCount} records in WixData).`
        });
    } catch(e) {
        return jsonErr(`${COLLECTION} not accessible: ${e.message} — Run POST /archive_setup first.`, 404);
    }
}
export function options_archive_setup_get(req) { return options_archive_catalog(req); }

// ────────────────────────────────────────────────────────────────────────────
// ENDPOINTS
// ────────────────────────────────────────────────────────────────────────────

/**
 * GET /archive_catalog
 * Returns the full static document catalogue with classification (no DB needed).
 * Query params:
 *   year=FY2024-25   — filter to a specific accounting year
 *   category=Events  — filter category
 */
export async function get_archive_catalog(request) {
    try {
        const p       = request.query || {};
        const yearFlt = p.year     || null;
        const catFlt  = p.category || null;

        let docs = DOCUMENT_CATALOGUE.map(buildRecord);

        if (yearFlt) docs = docs.filter(d => d.accountingYear === yearFlt);
        if (catFlt)  docs = docs.filter(d => d.category       === catFlt);

        // Summary stats
        const stats = {
            total:       docs.length,
            byCategory:  countBy(docs, 'category'),
            byCollection:countBy(docs, 'targetCollection'),
            byYear:      countBy(docs, 'accountingYear'),
            byConfidence:countBy(docs, 'confidence'),
            byFileType:  countBy(docs, 'fileType'),
        };
        return jsonOk({ docs, stats, filterApplied: { year: yearFlt, category: catFlt } });
    } catch(e) { return jsonErr(e.message, 500); }
}

/**
 * POST /archive_map
 * Runs the mapping and upserts all matching documents into ArchiveDocuments WixData collection.
 * Body: { year: "FY2024-25", overwriteExisting: true }
 */
export async function post_archive_map(request) {
    try {
        const body = await request.body.json().catch(()=>({}));
        const year = body.year || null;

        await ensureCollection();
        let docs = DOCUMENT_CATALOGUE.map(buildRecord);
        if (year) docs = docs.filter(d => d.accountingYear === year);

        const results = { saved: 0, updated: 0, skipped: 0, errors: [] };

        // Upsert in batches of 10 to respect Wix API limits
        for (let i = 0; i < docs.length; i += 10) {
            const batch = docs.slice(i, i + 10);
            for (const doc of batch) {
                try {
                    // Check if already exists
                    const existing = await wixData.query(COLLECTION)
                        .eq('docKey', doc.docKey).find(SA);

                    if (existing.items.length > 0) {
                        if (body.overwriteExisting) {
                            const merged = {
                                ...existing.items[0],
                                // Overwrite computed fields only if not verified
                                ...( existing.items[0].mappingStatus !== 'verified' ? {
                                    category: doc.category, subCategory: doc.subCategory,
                                    accountingYear: doc.accountingYear, targetCollection: doc.targetCollection,
                                    confidence: doc.confidence, fileType: doc.fileType,
                                    sourceFolder: doc.sourceFolder, fileSize: doc.fileSize,
                                } : {}),
                            };
                            await wixData.update(COLLECTION, merged, SA);
                            results.updated++;
                        } else {
                            results.skipped++;
                        }
                    } else {
                        await wixData.insert(COLLECTION, { ...doc, _id: undefined }, SA);
                        results.saved++;
                    }
                } catch(docErr) {
                    results.errors.push({ file: doc.filename, error: docErr.message });
                }
            }
        }

        const stats = {
            total:       docs.length,
            byCategory:  countBy(docs, 'category'),
            byCollection:countBy(docs, 'targetCollection'),
            byYear:      countBy(docs, 'accountingYear'),
        };

        return jsonOk({ year, results, stats, docsProcessed: docs.length });
    } catch(e) { return jsonErr(e.message, 500); }
}

/**
 * GET /archive_map_report
 * Fetches saved mappings from WixData (ArchiveDocuments collection).
 * Query params:
 *   year=FY2024-25
 *   category=Events
 *   collection=Events
 *   status=auto-mapped|verified|corrected
 *   limit=100
 *   skip=0
 */
export async function get_archive_map_report(request) {
    try {
        const p      = request.query || {};
        const year   = p.year       || null;
        const cat    = p.category   || null;
        const col    = p.collection || null;
        const status = p.status     || null;
        const limit  = parseInt(p.limit) || 200;
        const skip   = parseInt(p.skip)  || 0;

        await ensureCollection();
        let q = wixData.query(COLLECTION).limit(limit).skip(skip).ascending('accountingYear').ascending('category').ascending('filename');
        if (year)   q = q.eq('accountingYear',   year);
        if (cat)    q = q.eq('category',         cat);
        if (col)    q = q.eq('targetCollection', col);
        if (status) q = q.eq('mappingStatus',    status);

        const result = await q.find(SA);

        // Also return catalogue docs not yet in DB (pending import)
        const inDB = new Set(result.items.map(r => r.docKey));
        let catalogueDocs = DOCUMENT_CATALOGUE.map(buildRecord);
        if (year) catalogueDocs = catalogueDocs.filter(d => d.accountingYear === year);
        const pendingImport = catalogueDocs.filter(d => !inDB.has(d.docKey));

        const stats = {
            inDB:          result.items.length,
            pendingImport: pendingImport.length,
            byStatus:      countBy(result.items, 'mappingStatus'),
            byCategory:    countBy(result.items, 'category'),
            byCollection:  countBy(result.items, 'targetCollection'),
            byConfidence:  countBy(result.items, 'confidence'),
        };

        return jsonOk({ items: result.items, pendingImport, stats, total: result.totalCount, year, page: { limit, skip } });
    } catch(e) { return jsonErr(e.message, 500); }
}

/**
 * POST /archive_map_update
 * Admin verifies or corrects a mapping for a single document.
 * Body: {
 *   docKey: "data_22-24EC_DurgaPuja_pdf",
 *   accountingYear:   "FY2022-23",      // optional override
 *   category:         "Events",         // optional override
 *   subCategory:      "Durga Puja",     // optional override
 *   targetCollection: "Events",         // optional override
 *   notes:            "Verified by EC",
 *   action:           "verify" | "correct" | "reject",
 *   adminEmail:       "admin@banf.org"
 * }
 */
export async function post_archive_map_update(request) {
    try {
        const body = await request.body.json().catch(()=>({}));
        if (!body.docKey) return jsonErr('docKey is required');

        await ensureCollection();
        const existing = await wixData.query(COLLECTION).eq('docKey', body.docKey).find(SA);

        // If not yet in DB, auto-insert from catalogue first
        let record;
        if (existing.items.length === 0) {
            const template = DOCUMENT_CATALOGUE.map(buildRecord).find(d => d.docKey === body.docKey);
            if (!template) return jsonErr('Document not found in catalogue');
            const inserted = await wixData.insert(COLLECTION, { ...template, _id: undefined }, SA);
            record = inserted;
        } else {
            record = existing.items[0];
        }

        // Apply updates
        const actionMap = { verify:'verified', correct:'corrected', reject:'rejected' };
        const updates = {
            ...record,
            mappingStatus:    actionMap[body.action] || record.mappingStatus,
            notes:            body.notes           ?? record.notes,
            verifiedBy:       body.adminEmail      || record.verifiedBy,
            verifiedAt:       new Date().toISOString(),
        };
        if (body.accountingYear)    updates.accountingYear   = body.accountingYear;
        if (body.category)          updates.category         = body.category;
        if (body.subCategory)       updates.subCategory      = body.subCategory;
        if (body.targetCollection)  updates.targetCollection = body.targetCollection;

        const saved = await wixData.update(COLLECTION, updates, SA);

        // ── Learning: save correction example when category/collection changed ──
        let learned = null;
        if (body.learnFromCorrection && body.category && body.category !== record.category) {
            try {
                const learningEntry = {
                    docKey:           body.docKey,
                    filename:         record.filename || '',
                    fileType:         record.fileType || '',
                    sourceFolder:     record.sourceFolder || '',
                    source:           record.source || 'catalogue',
                    fromCategory:     record.category,
                    toCategory:       body.category,
                    fromCollection:   record.targetCollection,
                    toCollection:     body.targetCollection || record.targetCollection,
                    subCategory:      body.subCategory || record.subCategory || '',
                    correctedBy:      body.adminEmail || 'admin',
                    correctedAt:      new Date().toISOString(),
                    accountingYear:   body.accountingYear || record.accountingYear,
                };
                // Try to upsert ArchiveLearning collection
                await ensureAnyCollection('ArchiveLearning');
                const existing = await wixData.query('ArchiveLearning').eq('docKey', body.docKey).find(SA).catch(()=>({items:[]}));
                if (existing.items.length > 0) {
                    await wixData.update('ArchiveLearning', { ...existing.items[0], ...learningEntry }, SA);
                } else {
                    await wixData.insert('ArchiveLearning', learningEntry, SA);
                }
                learned = { from: record.category, to: body.category };
            } catch(le) {
                // Learning failure is non-fatal
                learned = { error: le.message };
            }
        }

        return jsonOk({ updated: saved, learned });
    } catch(e) { return jsonErr(e.message, 500); }
}

/**
 * POST /archive_doc_delete
 * Remove a document mapping from ArchiveDocuments by docKey.
 */
export async function post_archive_doc_delete(request) {
    try {
        const body = await request.body.json().catch(()=>({}));
        if (!body.docKey) return jsonErr('docKey is required');
        const q = await wixData.query(COLLECTION).eq('docKey', body.docKey).find(SA);
        if (q.items.length === 0) return jsonErr('Document not found in ArchiveDocuments');
        await wixData.remove(COLLECTION, q.items[0]._id, SA);
        // Also remove from learning if present
        const lq = await wixData.query('ArchiveLearning').eq('docKey', body.docKey).find(SA).catch(()=>({items:[]}));
        if (lq.items.length > 0) await wixData.remove('ArchiveLearning', lq.items[0]._id, SA).catch(()=>{});
        return jsonOk({ deleted: body.docKey, message: `Removed ${body.docKey} from ArchiveDocuments` });
    } catch(e) { return jsonErr(e.message, 500); }
}
export function options_archive_doc_delete(req) { return options_archive_catalog(req); }

/**
 * POST /archive_doc_add
 * Manually add a document mapping to ArchiveDocuments.
 */
export async function post_archive_doc_add(request) {
    try {
        const body = await request.body.json().catch(()=>({}));
        if (!body.filename) return jsonErr('filename is required');
        await ensureCollection();
        const docKey = body.docKey || `manual_${(body.filename||'').replace(/[^a-zA-Z0-9]/g,'_').toLowerCase()}_${Date.now()}`;
        // Check for duplicate
        const existing = await wixData.query(COLLECTION).eq('docKey', docKey).find(SA);
        if (existing.items.length > 0) return jsonErr('A document with this key already exists');
        const doc = {
            docKey,
            filename:         body.filename,
            originalPath:     body.originalPath     || '',
            fileType:         body.fileType         || 'unknown',
            source:           body.source           || 'catalogue',
            accountingYear:   body.accountingYear   || 'unknown',
            category:         body.category         || 'Other',
            subCategory:      body.subCategory      || '',
            targetCollection: body.targetCollection || 'KnowledgeBase',
            mappingStatus:    'corrected',
            confidence:       'high',
            notes:            body.notes            || 'Manually added',
            verifiedBy:       body.adminEmail       || 'admin',
            verifiedAt:       new Date().toISOString(),
            sourceFolder:     body.sourceFolder     || 'manual',
        };
        const inserted = await wixData.insert(COLLECTION, doc, SA);
        // Save as learning example so future auto-scans adopt this mapping
        try {
            await ensureAnyCollection('ArchiveLearning');
            await wixData.insert('ArchiveLearning', {
                docKey, filename: body.filename, fileType: body.fileType || '',
                toCategory: body.category || 'Other', toCollection: body.targetCollection || 'KnowledgeBase',
                subCategory: body.subCategory || '', source: body.source || 'catalogue',
                correctedBy: body.adminEmail || 'admin', correctedAt: new Date().toISOString(),
                accountingYear: body.accountingYear || 'unknown', fromCategory: '', fromCollection: '', sourceFolder: ''
            }, SA);
        } catch(_) {}
        return jsonOk({ doc: inserted, docKey, message: `Added ${body.filename} to ArchiveDocuments` });
    } catch(e) { return jsonErr(e.message, 500); }
}
export function options_archive_doc_add(req) { return options_archive_catalog(req); }

// ── Utility ─────────────────────────────────────────────────────────────────
function countBy(arr, key) {
    return arr.reduce((acc, item) => {
        const v = item[key] || 'unknown';
        acc[v] = (acc[v] || 0) + 1;
        return acc;
    }, {});
}

// ─────────────────────────────────────────────────────────────────────────────
// GOOGLE DRIVE + GMAIL LIVE SCANNING
// ─────────────────────────────────────────────────────────────────────────────

const G_CLIENT_ID  = '1020178199135-3usrl611ara38i7rhu2ub6sn6g1150ml.apps.googleusercontent.com';
const G_CLIENT_SEC = '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';
const PG_CLIENT_ID = '407408718192.apps.googleusercontent.com';
const PG_SECRET    = 'kd-_2_AUosoGGTNYyMJiFL3j';

/** Get a Google OAuth access token (drive + gmail scopes). */
async function getGoogleToken() {
    let refresh = null;
    try {
        const r = await wixData.query('GoogleTokens').eq('key','refresh_token').find(SA);
        if (r.items.length > 0) refresh = r.items[0].value;
    } catch(_) {}
    if (!refresh) refresh = '1//04iXClX5dKpqhCgYIARAAGAQSNwF-L9IrCtEUhuup9COlH5wnvGtozgReO4E5ILylE9Jq4f8vw1YUXDT_ysiHcJ89g-PA96eh8Ko';

    for (const [cid, csec] of [[G_CLIENT_ID, G_CLIENT_SEC],[PG_CLIENT_ID, PG_SECRET]]) {
        try {
            const r = await wixFetch('https://oauth2.googleapis.com/token', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: `client_id=${encodeURIComponent(cid)}&client_secret=${encodeURIComponent(csec)}&refresh_token=${encodeURIComponent(refresh)}&grant_type=refresh_token`
            });
            const d = await r.json();
            if (d.access_token) return { accessToken: d.access_token };
        } catch(_) {}
    }
    return { error: 'Google token failed. Visit /_functions/gdrive_auth_url to re-authorize.' };
}

async function gdriveGet(path, at) {
    const r = await wixFetch(`https://www.googleapis.com/drive/v3/${path}`,
        { method:'GET', headers:{ 'Authorization':`Bearer ${at}` } });
    return r.json();
}

async function gmailGet(path, at) {
    const r = await wixFetch(`https://gmail.googleapis.com/gmail/v1/${path}`,
        { method:'GET', headers:{ 'Authorization':`Bearer ${at}` } });
    return r.json();
}

/** Convert FY label (e.g. FY2024-25) → { after, before, startYear, endYear } for date range queries. */
function fyDateRange(fy) {
    const m = fy.match(/FY(\d{4})-(\d{2})/);
    if (!m) return null;
    const sy = parseInt(m[1]);
    return { after:`${sy}/04/01`, before:`${sy+1}/04/01`, startYear:sy, endYear:sy+1 };
}

/**
 * Search Google Drive for all BANF-related files matching a FY year.
 * Uses Drive's name-search API with year keywords plus 'banf'.
 */
async function scanGDriveForYear(fy, accessToken) {
    const dr = fyDateRange(fy);
    if (!dr) return { error: 'Invalid FY label', records: [] };

    const terms = [
        `${dr.startYear}`, `${dr.endYear}`,
        `${dr.startYear}-${String(dr.endYear).slice(-2)}`,
        `${dr.startYear}-${dr.endYear}`,
        'banf', 'BANF'
    ];
    const seen = new Map();
    for (const term of terms) {
        try {
            const q = encodeURIComponent(`name contains '${term}' and trashed=false`);
            const d = await gdriveGet(
                `files?q=${q}&fields=files(id,name,mimeType,size,modifiedTime,webViewLink)&pageSize=100`,
                accessToken
            );
            for (const f of (d.files || [])) {
                if (!seen.has(f.id)) seen.set(f.id, f);
            }
        } catch(_) {}
    }

    const records = [];
    for (const [, f] of seen) {
        const cls   = classify(f.name, 'gdrive');
        const rawFY = cls.category === 'Events'
            ? (eventYearFromName(f.name) || fy)
            : (fyFromName(f.name) || fy);
        const cy = rawFY.match(/FY(\d{4})/)?.[1] ? parseInt(rawFY.match(/FY(\d{4})/)[1]) + 1 : null;
        records.push({
            filename:         f.name,
            originalPath:     f.webViewLink || `gdrive://${f.id}`,
            fileType:         getFileType(f.name),
            category:         cls.category,
            subCategory:      cls.subCategory,
            accountingYear:   rawFY,
            calendarYear:     cy,
            targetCollection: cls.targetCollection,
            mappingStatus:    'auto-mapped',
            confidence:       cls.confidence,
            notes:            '',
            verifiedBy:       '',
            verifiedAt:       null,
            sourceFolder:     'Google Drive',
            fileSize:         f.size ? Math.round(parseInt(f.size)/1024) + ' KB' : '',
            docKey:           'gdrive_' + f.id,
            driveFileId:      f.id,
            driveLink:        f.webViewLink,
            source:           'gdrive',
            modifiedTime:     f.modifiedTime,
        });
    }
    return { records, total: records.length };
}

/**
 * Query Gmail for all messages in the FY date range.
 * Extracts subject/from/date as Communication records.
 */
async function scanGmailForYear(fy, accessToken) {
    const dr = fyDateRange(fy);
    if (!dr) return { error: 'Invalid FY label', records: [] };

    const q = encodeURIComponent(`after:${dr.after} before:${dr.before}`);
    const listData = await gmailGet(`users/me/messages?q=${q}&maxResults=100`, accessToken);
    if (listData.error) return { error: listData.error.message || JSON.stringify(listData.error), records: [] };

    const msgs = listData.messages || [];
    const records = [];

    // Fetch metadata in batches of 5
    for (let i = 0; i < msgs.length; i += 5) {
        await Promise.all(msgs.slice(i, i+5).map(async (msg) => {
            try {
                const d = await gmailGet(
                    `users/me/messages/${msg.id}?format=metadata&metadataHeaders=Subject,From,To,Date`,
                    accessToken
                );
                if (d.error) return;
                const hdr = Object.fromEntries(
                    (d.payload?.headers || []).map(h => [h.name.toLowerCase(), h.value])
                );
                const subject = hdr.subject || '(no subject)';
                const from    = hdr.from  || '';
                const to      = hdr.to    || '';
                const date    = hdr.date  || '';
                const cls     = classify(subject, 'gmail');
                const dateObj = date ? new Date(date) : null;
                records.push({
                    filename:         subject,
                    originalPath:     `https://mail.google.com/mail/u/0/#all/${msg.id}`,
                    fileType:         'email',
                    category:         (cls.category === 'Analysis' ? 'Communication' : cls.category),
                    subCategory:      cls.subCategory || 'Email',
                    accountingYear:   fy,
                    calendarYear:     dateObj ? dateObj.getFullYear() : null,
                    targetCollection: (cls.category === 'Communication' || cls.category === 'Analysis')
                                        ? 'KnowledgeBase'
                                        : cls.targetCollection,
                    mappingStatus:    'auto-mapped',
                    confidence:       cls.confidence === 'high' ? 'medium' : cls.confidence,
                    notes:            `From: ${from} | To: ${to}`,
                    verifiedBy:       '',
                    verifiedAt:       null,
                    sourceFolder:     'Gmail',
                    fileSize:         '',
                    docKey:           'gmail_' + msg.id,
                    gmailMessageId:   msg.id,
                    source:           'gmail',
                    emailDate:        date,
                    emailFrom:        from,
                    emailSubject:     subject,
                });
            } catch(_) {}
        }));
    }
    return { records, total: records.length, totalMessages: msgs.length };
}

/**
 * GET /gdrive_archive_scan
 * Dry-run: preview Google Drive files that would be mapped for a given FY.
 * Query: year=FY2024-25
 */
export async function get_gdrive_archive_scan(request) {
    try {
        const year  = (request.query || {}).year || 'FY2024-25';
        const token = await getGoogleToken();
        if (token.error) return jsonErr(token.error, 503);

        const scan = await scanGDriveForYear(year, token.accessToken);
        if (scan.error) return jsonErr(scan.error, 500);

        const filtered = scan.records.filter(d => d.accountingYear === year);
        return jsonOk({
            year, source: 'gdrive',
            records: filtered,
            stats: {
                total:        filtered.length,
                totalInDrive: scan.total,
                byCategory:   countBy(filtered, 'category'),
                byCollection: countBy(filtered, 'targetCollection'),
                byConfidence: countBy(filtered, 'confidence'),
                byFileType:   countBy(filtered, 'fileType'),
            }
        });
    } catch(e) { return jsonErr(e.message, 500); }
}
export function options_gdrive_archive_scan(req) { return options_archive_catalog(req); }

/**
 * GET /gmail_archive_scan
 * Dry-run: preview Gmail communications for a given FY.
 * Query: year=FY2024-25
 */
export async function get_gmail_archive_scan(request) {
    try {
        const year  = (request.query || {}).year || 'FY2024-25';
        const token = await getGoogleToken();
        if (token.error) return jsonErr(token.error, 503);

        const scan = await scanGmailForYear(year, token.accessToken);
        if (scan.error) return jsonErr(scan.error, 500);

        return jsonOk({
            year, source: 'gmail',
            records: scan.records,
            stats: {
                total:         scan.total,
                totalMessages: scan.totalMessages,
                byCategory:    countBy(scan.records, 'category'),
                byCollection:  countBy(scan.records, 'targetCollection'),
            }
        });
    } catch(e) { return jsonErr(e.message, 500); }
}
export function options_gmail_archive_scan(req) { return options_archive_catalog(req); }

/**
 * Fast Gmail summary: single list API call → one batch record per FY.
 * Used by post_archive_full_scan to avoid Wix 10-second timeout.
 * get_gmail_archive_scan (dry-run) does the full per-message metadata fetch.
 */
async function scanGmailFast(fy, accessToken) {
    const dr = fyDateRange(fy);
    if (!dr) return { error: 'Invalid FY label', records: [] };

    const q        = encodeURIComponent(`after:${dr.after} before:${dr.before}`);
    const listData = await gmailGet(`users/me/messages?q=${q}&maxResults=200`, accessToken);
    if (listData.error) return { error: listData.error.message || JSON.stringify(listData.error), records: [] };

    const msgs = listData.messages || [];
    if (!msgs.length) return { records: [], total: 0, totalMessages: 0 };

    const gmailUrl = `https://mail.google.com/mail/u/0/#search/after%3A${dr.after.replace(/\//g,'%2F')}+before%3A${dr.before.replace(/\//g,'%2F')}`;
    const record = {
        filename:         `Gmail Communications ${fy} (${msgs.length} emails)`,
        originalPath:     gmailUrl,
        fileType:         'email',
        category:         'Communication',
        subCategory:      'Email Archive',
        accountingYear:   fy,
        calendarYear:     dr.endYear,
        targetCollection: 'KnowledgeBase',
        mappingStatus:    'auto-mapped',
        confidence:       'medium',
        notes:            `${msgs.length} emails found in Gmail for ${fy}. Use "Gmail Scan" dry-run for per-message detail.`,
        verifiedBy:       '',
        verifiedAt:       null,
        sourceFolder:     'Gmail',
        fileSize:         `${msgs.length} messages`,
        docKey:           'gmail_batch_' + fy.replace(/[^a-zA-Z0-9]/g, '_'),
        source:           'gmail',
        gmailMessageId:   msgs[0]?.id || '',
        emailFrom:        '',
        emailSubject:     `Gmail batch: ${msgs.length} emails for ${fy}`,
    };
    return { records: [record], total: 1, totalMessages: msgs.length };
}

/**
 * POST /archive_full_scan
 * Runs ALL data sources for a year and upserts into ArchiveDocuments.
 *   1. Local static catalogue (always fast)
 *   2. Google Drive live search (Drive API keyword search)
 *   3. Gmail — fast summary batch record (avoids timeout)
 *      Use GET /gmail_archive_scan for full per-message detail.
 * Body: {
 *   year: "FY2024-25",
 *   sources: ["catalogue","gdrive","gmail"],
 *   overwriteExisting: false
 * }
 */
export async function post_archive_full_scan(request) {
    try {
        const body      = await request.body.json().catch(()=>({}));
        const year      = body.year    || 'FY2024-25';
        const sources   = body.sources || ['catalogue','gdrive','gmail'];
        const overwrite = !!body.overwriteExisting;

        await ensureCollection();
        const allDocs = [];
        const scanLog = {};

        // 1. Local catalogue — always synchronous, no external calls
        if (sources.includes('catalogue')) {
            const docs = DOCUMENT_CATALOGUE.map(buildRecord).filter(d => d.accountingYear === year);
            allDocs.push(...docs);
            scanLog.catalogue = { count: docs.length, status: 'ok' };
        }

        // 2. Google Drive + 3. Gmail — run in parallel to save time
        const needsToken = sources.includes('gdrive') || sources.includes('gmail');
        let accessToken  = null;
        if (needsToken) {
            const tok = await getGoogleToken();
            if (tok.error) {
                if (sources.includes('gdrive')) scanLog.gdrive = { count: 0, status: 'token_error', error: tok.error };
                if (sources.includes('gmail'))  scanLog.gmail  = { count: 0, status: 'token_error', error: tok.error };
            } else {
                accessToken = tok.accessToken;
            }
        }

        if (accessToken) {
            const [driveResult, gmailResult] = await Promise.all([
                sources.includes('gdrive') ? scanGDriveForYear(year, accessToken) : Promise.resolve(null),
                sources.includes('gmail')  ? scanGmailFast(year, accessToken)    : Promise.resolve(null),
            ]);

            if (driveResult) {
                if (driveResult.error) {
                    scanLog.gdrive = { count: 0, status: 'error', error: driveResult.error };
                } else {
                    const filtered = driveResult.records.filter(d => d.accountingYear === year);
                    allDocs.push(...filtered);
                    scanLog.gdrive = { count: filtered.length, totalInDrive: driveResult.total, status: 'ok' };
                }
            }
            if (gmailResult) {
                if (gmailResult.error) {
                    scanLog.gmail = { count: 0, status: 'error', error: gmailResult.error };
                } else {
                    allDocs.push(...gmailResult.records);
                    scanLog.gmail = { count: gmailResult.records.length, totalMessages: gmailResult.totalMessages, status: 'ok' };
                }
            }
        }

        // ── Efficient bulk upsert ──────────────────────────────────────────────
        // 1. Fetch all existing docKeys for this year in one query
        const results = { saved: 0, updated: 0, skipped: 0, errors: [] };
        let existingKeys = new Map(); // docKey → {_id, mappingStatus}
        try {
            const existing = await wixData.query(COLLECTION)
                .eq('accountingYear', year).limit(500).find(SA);
            existing.items.forEach(r => existingKeys.set(r.docKey, { _id: r._id, mappingStatus: r.mappingStatus }));
        } catch(_) {}

        // 2. Split into insert / update / skip lists
        const toInsert = [];
        const toUpdate = [];
        for (const doc of allDocs) {
            const ex = existingKeys.get(doc.docKey);
            if (!ex) {
                toInsert.push({ ...doc, _id: undefined });
            } else if (overwrite && ex.mappingStatus !== 'verified') {
                toUpdate.push({ ...doc, _id: ex._id });
            } else {
                results.skipped++;
            }
        }

        // 3. Bulk insert (Wix allows up to 100 at a time)
        for (let i = 0; i < toInsert.length; i += 50) {
            try {
                const batch  = toInsert.slice(i, i+50);
                const bulkRes = await wixData.bulkInsert(COLLECTION, batch, SA);
                results.saved += bulkRes?.insertedItemIds?.length || batch.length;
            } catch(e) {
                // Fallback: insert one-by-one
                for (const doc of toInsert.slice(i, i+50)) {
                    try {
                        await wixData.insert(COLLECTION, doc, SA);
                        results.saved++;
                    } catch(de) { results.errors.push({ file: doc.filename, error: de.message }); }
                }
            }
        }

        // 4. Sequential updates (Wix bulkUpdate exists but requires exact schema)
        for (const doc of toUpdate) {
            try {
                await wixData.update(COLLECTION, doc, SA);
                results.updated++;
            } catch(ue) { results.errors.push({ file: doc.filename, error: ue.message }); }
        }

        const stats = {
            total:        allDocs.length,
            bySource:     countBy(allDocs, 'source'),
            byCategory:   countBy(allDocs, 'category'),
            byCollection: countBy(allDocs, 'targetCollection'),
            byConfidence: countBy(allDocs, 'confidence'),
            byYear:       countBy(allDocs, 'accountingYear'),
        };
        return jsonOk({ year, scanLog, results, stats, totalDocs: allDocs.length });
    } catch(e) { return jsonErr(e.message, 500); }
}
export function options_archive_full_scan(req) { return options_archive_catalog(req); }
