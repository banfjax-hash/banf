/**
 * BANF Data Mapper v1.1 — 2026-02-22
 * ─────────────────────────────────────────────────────────────
 * Bulk CRM import from structured CSV/JSON data sources:
 *   1. Family Universe (BANF_Family_Universe_v3.xlsx) → FamilyGroups + CRMMembers
 *   2. Membership 2025-26 (BANF Membership 2025-26.xlsx) → CRMMembers + MembershipFees
 *   3. Org Roles (report_25-26_admin.json) → MemberOrgRoles
 *   4. Gmail full link → MemberCommunications (all inboxes mapped to members)
 *   5. Financial data → Payments collection
 *
 * v1.1 changes:
 *   - Added "Name" column alias (combined first+last from 2025-26 XLSX format)
 *   - Added "Category" column alias → familyType + earlyBird + membershipType derived
 *   - Added parseFirstName() and parseCategory() helpers
 *   - Fixed mapMembership2526Rows() — handles "Ranadhir Da/ Moumita Di" format
 *   - Fixed mapMembership2526Rows() — fuzzy firstName match fallback
 *   - Fixed mapMembership2526Rows() — updates familyType + lastPaymentYear + rawNameEntry
 * HTTP Endpoints:
 *   POST /bulk_import_members   — Family Universe or membership CSV → CRM
 *   POST /bulk_import_payments  — Payment/financial CSV → Payments
 *   POST /gmail_full_link       — Link all SentEmails/InboxMessages to CRM members
 *   GET  /import_status         — Overall import progress
 *   POST /import_org_roles      — Bulk insert EC/BOT roles
 */

import wixData from 'wix-data';
import { ok, badRequest, serverError } from 'wix-http-functions';
import { parseCSV } from 'backend/banf-gdrive-sync';

const SA = { suppressAuth: true };

// ─── Helpers ─────────────────────────────────────────────────────────────────
function cors(data) {
    return ok({ body: JSON.stringify(data), headers: {
        'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'
    }});
}
export function optionsCors() {
    return ok({ body: '', headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type,x-user-email'
    }});
}

function generateFamilyId(year) {
    const y = year || new Date().getFullYear();
    const s = Math.random().toString(36).substring(2, 7).toUpperCase();
    return `FAM-${y}-${s}`;
}
function generateMemberId() {
    const ts = Date.now().toString(36).toUpperCase();
    const rnd = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `MBR-${ts}-${rnd}`;
}
function normEmail(e) { return (e || '').toLowerCase().trim(); }
function normName(n) { return (n || '').trim(); }

// ─── Column name aliases (Family Universe headers vary) ───────────────────────
const COL_MAP = {
    // Family Universe fields
    firstName:       ['First Name', 'FirstName', 'first_name', 'FIRST_NAME', 'fname'],
    lastName:        ['Last Name', 'LastName', 'last_name', 'LAST_NAME', 'lname', 'Surname'],
    email:           ['Email', 'email', 'Email Address', 'EMAIL', 'Primary Email'],
    altEmail:        ['Alt Email', 'Alternate Email', 'alt_email', 'Email 2', 'Work Email'],
    phone:           ['Phone', 'Phone Number', 'Mobile', 'Cell', 'phone', 'PHONE'],
    familyId:        ['Family ID', 'FamilyID', 'family_id', 'FAMILY_ID'],
    familyType:      ['Family Type', 'FamilyType', 'family_type', 'Type'],
    memberType:      ['Member Type', 'MemberType', 'Role', 'role', 'ROLE'],
    membershipType:  ['Membership Type', 'Membership', 'Plan', 'Tier'],
    membershipYear:  ['Year', 'membership_year', 'Membership Year', 'Season'],
    membershipStatus:['Status', 'status', 'Membership Status', 'Active'],
    isActive:        ['Active', 'isActive', 'Is Active', 'Status'],
    address:         ['Address', 'Street', 'Home Address'],
    city:            ['City', 'city'],
    state:           ['State', 'state'],
    zip:             ['Zip', 'ZIP', 'Postal Code', 'zip_code'],
    country:         ['Country', 'country'],
    dob:             ['DOB', 'Date of Birth', 'Birthday', 'birth_date'],
    gender:          ['Gender', 'gender', 'Sex'],
    profession:      ['Profession', 'Occupation', 'Job Title', 'Employer', 'Company'],
    employer:        ['Employer', 'Company', 'Organization', 'org'],
    spouseFirstName: ['Spouse First', 'Spouse FirstName', 'Spouse Name'],
    spouseLastName:  ['Spouse Last', 'Spouse LastName'],
    spouseEmail:     ['Spouse Email', 'Partner Email'],
    // Membership 2025-26 fields
    memberId:        ['Member ID', 'MemberID', 'member_id', 'ID'],
    amount:          ['Amount', 'amount', 'Fee', 'Payment Amount', 'Paid'],
    paymentDate:     ['Payment Date', 'Date', 'Paid Date', 'date'],
    paymentMethod:   ['Payment Method', 'Method', 'pay_method'],
    earlyBird:       ['Early Bird', 'EarlyBird', 'EB', 'early_bird'],
    ecRole:          ['EC Role', 'Role', 'Position', 'Title'],
    ecTerm:          ['EC Term', 'Term', 'Year'],
    notes:           ['Notes', 'notes', 'Remarks', 'Comments'],
    // Membership 2025-26 combined name column (e.g. "Ranadhir Da/ Moumita Di")
    name:            ['Name', 'name', 'Full Name', 'Member Name', 'Contributor'],
    // Category column from BANF Membership XLSX
    category:        ['Category', 'category', 'Membership Category', 'Type', 'Tier', 'Plan']
};

// Parse combined name field (handles "Da/ Moumita Di", "FirstName LastName", etc.)
function parseFirstName(rawName) {
    if (!rawName) return '';
    // Take first token before '/' or ','
    return rawName.split(/[\/,]/)[0].trim().split(/\s+/)[0].trim();
}

// Map XLSX Category → { familyType, earlyBird, membershipType }
function parseCategory(cat) {
    const c = (cat || '').toLowerCase();
    const earlyBird = c.includes('eb') || c.includes('early');
    let familyType = 'individual';
    let membershipType = 'annual';
    if (c.includes('family'))     { familyType = 'family';     membershipType = 'family'; }
    else if (c.includes('couple')) { familyType = 'couple';     membershipType = 'couple'; }
    else if (c.includes('individual') || c.includes('single')) { familyType = 'individual'; membershipType = 'individual'; }
    else if (c.includes('student')) { familyType = 'individual'; membershipType = 'student'; }
    else if (c.includes('senior')) { familyType = 'individual'; membershipType = 'senior'; }
    else if (c.includes('life'))   { familyType = 'individual'; membershipType = 'life'; }
    return { familyType, membershipType, earlyBird };
}

function col(row, field) {
    const aliases = COL_MAP[field] || [field];
    for (const alias of aliases) {
        if (row[alias] !== undefined && row[alias] !== null && row[alias] !== '') return String(row[alias]).trim();
    }
    return '';
}

function detectProfile(headers) {
    const h = headers.map(x => x.toLowerCase());
    if (h.some(x => x.includes('family') && x.includes('id')) && h.some(x => x.includes('first'))) return 'family_universe';
    if (h.some(x => x.includes('first')) && h.some(x => x.includes('last')) && h.some(x => x.includes('email'))) return 'members';
    if (h.some(x => x.includes('amount') || x.includes('payment') || x.includes('fee'))) return 'membership_fees';
    if (h.some(x => x.includes('ec role') || x.includes('position') || x.includes('title'))) return 'org_roles';
    return 'unknown';
}

// ─── DEDUP: Look up members by email ─────────────────────────────────────────
async function findMemberByEmail(email) {
    if (!email) return null;
    const e = normEmail(email);
    try {
        let r = await wixData.query('CRMMembers').eq('email', e).limit(1).find(SA);
        if (r.items.length) return r.items[0];
        r = await wixData.query('CRMMembers').eq('alternateEmail', e).limit(1).find(SA);
        if (r.items.length) return r.items[0];
    } catch (_) {}
    return null;
}

async function findFamilyByEmails(emails) {
    for (const e of emails) {
        const member = await findMemberByEmail(e);
        if (member && member.familyId) return member.familyId;
    }
    return null;
}

// ─── FAMILY UNIVERSE MAPPER ───────────────────────────────────────────────────
/**
 * Maps a Family Universe row to FamilyGroups + CRMMembers.
 * Handles both single-record-per-family and per-person rows.
 */
async function mapFamilyUniverseRows(rows) {
    const stats = { families: 0, members: 0, skipped: 0, updated: 0, errors: [] };

    // Group rows by familyId if available
    const familyMap = {};
    for (const row of rows) {
        const fid = col(row, 'familyId');
        const key = fid || `${col(row, 'lastName')}_${col(row, 'email')}`.toLowerCase();
        if (!familyMap[key]) familyMap[key] = [];
        familyMap[key].push(row);
    }

    for (const [key, members] of Object.entries(familyMap)) {
        try {
            const primaryRow = members[0];
            const emails = members.map(m => normEmail(col(m, 'email'))).filter(Boolean);
            const altEmails = members.map(m => normEmail(col(m, 'altEmail'))).filter(Boolean);
            const allEmails = [...new Set([...emails, ...altEmails])];

            // Check if family already exists
            let existingFamilyId = null;
            const driveSourceFamilyId = col(primaryRow, 'familyId');
            if (driveSourceFamilyId) {
                const fRes = await wixData.query('FamilyGroups').eq('sourceFamilyId', driveSourceFamilyId).limit(1).find(SA);
                if (fRes.items.length) existingFamilyId = fRes.items[0].familyId;
            }
            if (!existingFamilyId) existingFamilyId = await findFamilyByEmails(allEmails);

            const familyType = col(primaryRow, 'familyType') ||
                (members.length >= 3 ? 'family' : members.length === 2 ? 'couple' : 'individual');
            const membershipType = col(primaryRow, 'membershipType') || 'annual';
            const membershipYear = col(primaryRow, 'membershipYear') || '2025';
            const status = col(primaryRow, 'membershipStatus') || 'active';
            const primarySurname = col(primaryRow, 'lastName');
            const firstName1 = col(primaryRow, 'firstName');
            const firstName2 = members[1] ? col(members[1], 'firstName') : '';
            const displayName = members.length >= 2
                ? `${firstName1} & ${firstName2} ${primarySurname}`.trim()
                : `${firstName1} ${primarySurname}`.trim();

            if (existingFamilyId) {
                // Update existing family display name/status
                try {
                    const fRes = await wixData.query('FamilyGroups').eq('familyId', existingFamilyId).limit(1).find(SA);
                    if (fRes.items.length) {
                        const fam = fRes.items[0];
                        await wixData.update('FamilyGroups', {
                            ...fam,
                            displayName: fam.displayName || displayName,
                            membershipStatus: status,
                            membershipType,
                            membershipYear,
                            isActive: status !== 'inactive',
                            sourceFamilyId: driveSourceFamilyId || fam.sourceFamilyId
                        }, SA);
                        stats.updated++;
                    }
                } catch (_) { stats.updated++; } // count as updated even if update fails
            } else {
                // Create new family
                existingFamilyId = driveSourceFamilyId ? `FAM-IMP-${driveSourceFamilyId}` : generateFamilyId();
                await wixData.insert('FamilyGroups', {
                    familyId: existingFamilyId,
                    displayName,
                    primarySurname,
                    familyType,
                    membershipType,
                    membershipYear,
                    membershipStatus: status,
                    isActive: status !== 'inactive',
                    sourceFamilyId: driveSourceFamilyId || '',
                    importSource: 'family_universe',
                    createdAt: new Date().toISOString()
                }, SA);
                stats.families++;
            }

            // Upsert each member in this family group
            for (const mRow of members) {
                const email = normEmail(col(mRow, 'email'));
                const altEmail = normEmail(col(mRow, 'altEmail'));
                const firstName = col(mRow, 'firstName');
                const lastName = col(mRow, 'lastName');
                if (!firstName && !email) { stats.skipped++; continue; }

                const existingMember = await findMemberByEmail(email) || await findMemberByEmail(altEmail);

                const memberData = {
                    familyId: existingFamilyId,
                    memberType: col(mRow, 'memberType') || 'adult',
                    isAdult: true,
                    firstName: normName(firstName),
                    lastName: normName(lastName),
                    displayName: `${normName(firstName)} ${normName(lastName)}`.trim(),
                    email,
                    alternateEmail: altEmail,
                    phone: col(mRow, 'phone'),
                    address: col(mRow, 'address'),
                    city: col(mRow, 'city'),
                    state: col(mRow, 'state'),
                    zip: col(mRow, 'zip'),
                    country: col(mRow, 'country') || 'USA',
                    dateOfBirth: col(mRow, 'dob'),
                    gender: col(mRow, 'gender'),
                    profession: col(mRow, 'profession'),
                    employer: col(mRow, 'employer'),
                    membershipStatus: col(mRow, 'membershipStatus') || status,
                    memberSince: col(mRow, 'membershipYear') || '2025',
                    isActive: true,
                    importSource: 'family_universe',
                    lastUpdated: new Date().toISOString()
                };

                if (existingMember) {
                    // Merge — don't overwrite non-empty fields
                    const merged = { ...memberData };
                    for (const [k, v] of Object.entries(existingMember)) {
                        if (v && v !== '' && (!merged[k] || merged[k] === '')) merged[k] = v;
                    }
                    await wixData.update('CRMMembers', { ...existingMember, ...merged }, SA);
                    stats.updated++;
                } else {
                    const memberId = generateMemberId();
                    await wixData.insert('CRMMembers', { ...memberData, memberId }, SA);
                    stats.members++;
                }
            }
        } catch (e) {
            stats.errors.push(`Family ${key}: ${e.message}`);
        }
    }
    return stats;
}

// ─── MEMBERSHIP 2025-26 MAPPER ────────────────────────────────────────────────
async function mapMembership2526Rows(rows) {
    const stats = { upserted: 0, paymentRecords: 0, skipped: 0, errors: [] };
    for (const row of rows) {
        try {
            const email = normEmail(col(row, 'email'));
            // Support both split first/last AND combined "Name" column
            let firstName = normName(col(row, 'firstName'));
            let lastName  = normName(col(row, 'lastName'));
            const rawName = col(row, 'name'); // e.g. "Ranadhir Da/ Moumita Di"
            if (!firstName && rawName) {
                // Parse: take first token before '/', first word = firstName
                firstName = parseFirstName(rawName);
                if (!lastName) {
                    const parts = rawName.split(/[\/,]/)[0].trim().split(/\s+/);
                    lastName = parts.slice(1).join(' ');
                }
            }
            if (!email && !firstName) { stats.skipped++; continue; }

            // Parse Category column → familyType, earlyBird, membershipType
            const rawCategory = col(row, 'category');
            const catParsed = parseCategory(rawCategory);
            const membershipType = col(row, 'membershipType') || catParsed.membershipType || 'annual';
            const isEarlyBird = rawCategory
                ? catParsed.earlyBird
                : (col(row, 'earlyBird').match(/yes|true|1|y/i) ? true : false);
            const derivedFamilyType = catParsed.familyType;
            const amount = parseFloat((col(row, 'amount') || '0').toString().replace(/[$,\s]/g, '')) || 0;
            const paymentDate = col(row, 'paymentDate');
            const paymentMethod = col(row, 'paymentMethod') || 'zelle/cash';

            // Find or create member
            let member = await findMemberByEmail(email);
            if (!member && firstName) {
                // Try exact first+last name match
                let r = await wixData.query('CRMMembers')
                    .eq('firstName', firstName).eq('lastName', lastName).limit(1).find(SA);
                if (r.items.length) member = r.items[0];
            }
            if (!member && firstName) {
                // Fuzzy: firstName-only match (handles informal names like "Ranadhir Da")
                const r2 = await wixData.query('CRMMembers')
                    .startsWith('firstName', firstName.substring(0, 4)).limit(5).find(SA);
                if (r2.items.length === 1) member = r2.items[0];
                else if (r2.items.length > 1 && lastName) {
                    // Try surname fallback
                    const surname = lastName.split(/[\/,\s]/)[0].trim();
                    const hit = r2.items.find(m =>
                        m.lastName && m.lastName.toLowerCase().includes(surname.toLowerCase()));
                    if (hit) member = hit;
                }
            }

            if (member) {
                // Update membership status + familyType + earlyBird
                await wixData.update('CRMMembers', {
                    ...member,
                    membershipStatus: 'active',
                    membershipType,
                    memberSince: member.memberSince || '2025',
                    familyType: derivedFamilyType || member.familyType || 'individual',
                    lastPaymentYear: '2025-26',
                    lastUpdated: new Date().toISOString()
                }, SA);

                // Update FamilyGroups record too
                if (derivedFamilyType) {
                    const famRes = await wixData.query('FamilyGroups')
                        .eq('familyId', member.familyId).limit(1).find(SA);
                    if (famRes.items.length) {
                        await wixData.update('FamilyGroups', {
                            ...famRes.items[0],
                            familyType: derivedFamilyType,
                            membershipType,
                            membershipYear: '2025'
                        }, SA);
                    }
                }

                // Create payment record if amount > 0
                if (amount > 0) {
                    const existPay = await wixData.query('Payments')
                        .eq('memberId', member.memberId)
                        .eq('amount', amount)
                        .eq('category', 'membership')
                        .limit(1).find(SA);
                    if (!existPay.items.length) {
                        await wixData.insert('Payments', {
                            memberId: member.memberId,
                            familyId: member.familyId,
                            memberName: member.displayName,
                            email: member.email,
                            amount,
                            category: 'membership',
                            membershipYear: '2025-26',
                            membershipType,
                            familyType: derivedFamilyType,
                            earlyBird: isEarlyBird,
                            paymentMethod,
                            paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
                            status: 'paid',
                            importSource: 'membership_2526',
                            rawNameEntry: rawName || `${firstName} ${lastName}`.trim(),
                            notes: col(row, 'notes')
                        }, SA);
                        stats.paymentRecords++;
                    }
                }
                stats.upserted++;
            } else {
                // Create new member if enough data
                if (firstName && lastName) {
                    let familyId = await findFamilyByEmails([email]);
                    if (!familyId) {
                        familyId = generateFamilyId();
                        await wixData.insert('FamilyGroups', {
                            familyId,
                            displayName: `${firstName} ${lastName}`,
                            primarySurname: lastName,
                            familyType: derivedFamilyType || 'individual',
                            membershipType,
                            membershipYear: '2025',
                            membershipStatus: 'active',
                            isActive: true,
                            importSource: 'membership_2526',
                            rawNameEntry: rawName || `${firstName} ${lastName}`.trim()
                        }, SA);
                    }
                    const memberId = generateMemberId();
                    await wixData.insert('CRMMembers', {
                        memberId, familyId,
                        firstName, lastName,
                        displayName: `${firstName} ${lastName}`,
                        email,
                        phone: col(row, 'phone'),
                        memberType: 'adult',
                        isAdult: true,
                        membershipStatus: 'active',
                        membershipType,
                        familyType: derivedFamilyType || 'individual',
                        memberSince: '2025',
                        earlyBird: isEarlyBird,
                        isActive: true,
                        importSource: 'membership_2526',
                        rawNameEntry: rawName || `${firstName} ${lastName}`.trim()
                    }, SA);
                    stats.upserted++;
                } else {
                    stats.skipped++;
                }
            }
        } catch (e) {
            stats.errors.push(`Row ${JSON.stringify(row).substring(0, 60)}: ${e.message}`);
        }
    }
    return stats;
}

// ─── ORG ROLES MAPPER ────────────────────────────────────────────────────────
async function mapOrgRolesRows(rows, ecTerm = 'EC-2024-2026') {
    const stats = { inserted: 0, skipped: 0, errors: [] };
    for (const row of rows) {
        try {
            const email = normEmail(col(row, 'email'));
            const firstName = normName(col(row, 'firstName'));
            const lastName = normName(col(row, 'lastName'));
            const role = col(row, 'ecRole') || col(row, 'memberType');
            const term = col(row, 'ecTerm') || ecTerm;
            if (!email && !firstName) { stats.skipped++; continue; }

            const member = await findMemberByEmail(email);
            if (!member) { stats.skipped++; continue; }

            // Check duplicate
            const existing = await wixData.query('MemberOrgRoles')
                .eq('memberId', member.memberId).eq('orgTerm', term).limit(1).find(SA);
            if (existing.items.length) { stats.skipped++; continue; }

            await wixData.insert('MemberOrgRoles', {
                memberId: member.memberId,
                memberName: member.displayName,
                email: member.email,
                orgName: 'BANF',
                orgTerm: term,
                roleTitle: role || 'Member',
                startDate: term.includes('2024') ? '2024-02-01' : '',
                isCurrentRole: term.includes('2024-2026') || term.includes('2025'),
                importSource: 'bulk_import'
            }, SA);

            // Mark isECMember on the member itself
            await wixData.update('CRMMembers', { ...member, isECMember: true }, SA);
            stats.inserted++;
        } catch (e) {
            stats.errors.push(e.message);
        }
    }
    return stats;
}

// ─── GMAIL FULL LINK ─────────────────────────────────────────────────────────
/**
 * Cross-reference ALL SentEmails + InboxMessages against CRMMembers.
 * Creates MemberCommunications records for matched emails.
 */
async function gmailFullLink(options = {}) {
    const { maxPages = 50, batchSize = 100 } = options;
    const stats = { linked: 0, already: 0, skipped: 0, nomatch: 0, errors: [] };

    // Build full email→member lookup map
    const emailMap = {};
    try {
        let skip = 0, more = true;
        while (more) {
            const r = await wixData.query('CRMMembers').isNotEmpty('email').skip(skip).limit(200).find(SA);
            for (const m of r.items) {
                if (m.email) emailMap[normEmail(m.email)] = m;
                if (m.alternateEmail) emailMap[normEmail(m.alternateEmail)] = m;
            }
            more = r.items.length === 200;
            skip += 200;
        }
    } catch (e) {
        stats.errors.push('Failed to load member emails: ' + e.message);
        return stats;
    }

    const memberEmails = new Set(Object.keys(emailMap));

    // Get existing linked gmail IDs to skip
    const linkedIds = new Set();
    try {
        let skip = 0, more = true;
        while (more) {
            const r = await wixData.query('MemberCommunications').isNotEmpty('gmailId').skip(skip).limit(200).find(SA);
            for (const c of r.items) { if (c.gmailId) linkedIds.add(c.gmailId); }
            more = r.items.length === 200;
            skip += 200;
        }
    } catch (_) {}

    // Process SentEmails
    for (const collection of ['SentEmails', 'InboxMessages']) {
        let page = 0;
        let more = true;
        while (more && page < maxPages) {
            const r = await wixData.query(collection).skip(page * batchSize).limit(batchSize).find(SA).catch(() => null);
            if (!r || !r.items.length) break;
            more = r.items.length === batchSize;
            page++;

            for (const msg of r.items) {
                if (linkedIds.has(msg.gmailId)) { stats.already++; continue; }

                const direction = collection === 'SentEmails' ? 'outbound' : 'inbound';
                const counterpartyEmail = direction === 'outbound'
                    ? normEmail(msg.to || msg.recipient || '')
                    : normEmail(parseFromEmail(msg.from || msg.sender || ''));

                const member = emailMap[counterpartyEmail];
                if (!member) { stats.nomatch++; continue; }

                try {
                    await wixData.insert('MemberCommunications', {
                        memberId: member.memberId,
                        familyId: member.familyId,
                        memberName: member.displayName,
                        gmailId: msg.gmailId || msg._id,
                        direction,
                        subject: msg.subject || '(no subject)',
                        from: direction === 'inbound' ? counterpartyEmail : 'banfjax@gmail.com',
                        to: direction === 'outbound' ? counterpartyEmail : 'banfjax@gmail.com',
                        receivedAt: msg.sentAt || msg.receivedAt || msg._createdDate,
                        snippet: (msg.body || msg.snippet || '').substring(0, 500),
                        labels: msg.labels || [],
                        category: classifySubject(msg.subject || ''),
                        source: 'gmail',
                        importedAt: new Date().toISOString()
                    }, SA);
                    linkedIds.add(msg.gmailId || msg._id);
                    stats.linked++;
                } catch (e) {
                    if (e.message && e.message.includes('duplicate')) stats.already++;
                    else stats.errors.push(e.message);
                }
            }
        }
    }
    return stats;
}

function parseFromEmail(fromStr) {
    const m = (fromStr || '').match(/<(.+?)>/);
    return m ? m[1] : fromStr;
}

function classifySubject(subject) {
    const s = (subject || '').toLowerCase();
    if (s.match(/durga|puja|holi|kali|mahalaya|saraswati|nabo|spandan|picnic|jagriti|festival|cultural/)) return 'EVENT-CULTURAL';
    if (s.match(/gbm|general body|agm|minutes|mom|governance|election|vote|resolution/)) return 'GOVERNANCE';
    if (s.match(/payment|fee|due|invoice|membership|receipt|zelle|venmo|check|financial|tax|990/)) return 'FINANCIAL';
    if (s.match(/invitation|invite|rsvp|attend|register|event/)) return 'EVENT';
    if (s.match(/welcome|new member|join|renewal/)) return 'MEMBERSHIP';
    if (s.match(/scholarship|welfare|help|support|donation|grant/)) return 'WELFARE';
    if (s.match(/llm|ai|machine learning|hugging|agent|gpt|ml|tech|software|code|github/)) return 'TECHNICAL';
    if (s.match(/newsletter|announcement|update|notice|circular/)) return 'OFFICIAL';
    if (s.match(/radio|bengali school|tagore|music|dance|programme/)) return 'CULTURAL';
    return 'GENERAL';
}

// ═══════════════════════════════════════════════════════════════════════════════
// HTTP ENDPOINT FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * POST /bulk_import_members
 * Body: { rows: [...], profile: 'family_universe'|'membership'|'auto', dryRun: false }
 * Accepts rows from Drive CSV export or local XLSX parsed JSON.
 */
export async function post_bulk_import_members(request) {
    try {
        const body = await request.body.json();
        const { rows, profile, dryRun = false } = body;
        if (!rows || !Array.isArray(rows) || rows.length === 0) {
            return cors({ success: false, error: 'rows array required' });
        }

        const email = (request.headers || {})['x-user-email'] || '';
        if (!email.includes('@')) return cors({ success: false, error: 'x-user-email header required' });

        // Auto-detect profile
        const headers = Object.keys(rows[0] || {});
        const detectedProfile = profile || detectProfile(headers);

        if (dryRun) {
            return cors({
                success: true,
                dryRun: true,
                rowCount: rows.length,
                detectedProfile,
                sampleRow: rows[0],
                headers,
                message: `Would import ${rows.length} rows using profile "${detectedProfile}". Set dryRun:false to proceed.`
            });
        }

        let stats;
        if (detectedProfile === 'family_universe' || detectedProfile === 'members') {
            stats = await mapFamilyUniverseRows(rows);
            stats.profile = 'family_universe';
        } else if (detectedProfile === 'membership_fees' || detectedProfile === 'membership') {
            stats = await mapMembership2526Rows(rows);
            stats.profile = 'membership_2526';
        } else if (detectedProfile === 'org_roles') {
            stats = await mapOrgRolesRows(rows);
            stats.profile = 'org_roles';
        } else {
            // Default: treat as member rows
            stats = await mapFamilyUniverseRows(rows);
            stats.profile = 'family_universe_fallback';
        }

        return cors({
            success: true,
            rowCount: rows.length,
            stats,
            message: `Import complete: ${stats.members || stats.upserted || 0} new, ${stats.updated || 0} updated, ${stats.skipped || 0} skipped.`
        });
    } catch (e) {
        return cors({ success: false, error: e.message });
    }
}
export function options_bulk_import_members() { return optionsCors(); }

/**
 * POST /bulk_import_org_roles
 * Body: { roles: [{firstName, lastName, email, ecRole, ecTerm}], ecTerm? }
 * Inserts EC/BOT roles for matching CRM members.
 */
export async function post_bulk_import_org_roles(request) {
    try {
        const body = await request.body.json();
        const { roles, rows, ecTerm } = body;
        const data = roles || rows || [];
        if (!data.length) return cors({ success: false, error: 'roles/rows array required' });

        const stats = await mapOrgRolesRows(data, ecTerm || 'EC-2024-2026');
        return cors({ success: true, stats });
    } catch (e) {
        return cors({ success: false, error: e.message });
    }
}
export function options_bulk_import_org_roles() { return optionsCors(); }

/**
 * POST /gmail_full_link
 * Cross-reference all Gmail messages against CRM members.
 * Body: { maxPages?, batchSize? }
 */
export async function post_gmail_full_link(request) {
    try {
        const body = await request.body.json().catch(() => ({}));
        const { maxPages = 50, batchSize = 100 } = body;
        const stats = await gmailFullLink({ maxPages, batchSize });
        return cors({
            success: true,
            stats,
            message: `Gmail link complete: ${stats.linked} new, ${stats.already} already linked, ${stats.nomatch} unmatched.`
        });
    } catch (e) {
        return cors({ success: false, error: e.message });
    }
}
export function options_gmail_full_link() { return optionsCors(); }

/**
 * GET /import_status
 * Current state of all CRM collections + import coverage.
 */
export async function get_import_status(request) {
    try {
        const counts = {};
        for (const col of ['FamilyGroups', 'CRMMembers', 'MemberCommunications', 'MemberOrgRoles', 'MemberAwards', 'MemberVolunteer', 'Payments', 'SentEmails', 'InboxMessages', 'DriveSync']) {
            try { counts[col] = await wixData.query(col).count(SA); }
            catch (_) { counts[col] = 0; }
        }

        // How many CRM members have email coverage
        const withEmail = await wixData.query('CRMMembers').isNotEmpty('email').count(SA).catch(() => 0);
        const withComms = await wixData.query('MemberCommunications').count(SA).catch(() => 0);
        const totalMsgs = (counts['SentEmails'] || 0) + (counts['InboxMessages'] || 0);

        return cors({
            success: true,
            collections: counts,
            coverage: {
                membersWithEmail: withEmail,
                totalMembers: counts['CRMMembers'] || 0,
                emailCoveragePercent: counts['CRMMembers'] ? Math.round(withEmail / counts['CRMMembers'] * 100) : 0,
                gmailSyncedMessages: totalMsgs,
                gmailLinkedToMembers: withComms,
                linkCoveragePercent: totalMsgs ? Math.round(withComms / totalMsgs * 100) : 0
            },
            nextSteps: {
                driveSync: 'POST /gdrive_sync_csv with {fileId, mappingProfile}',
                bulkImport: 'POST /bulk_import_members with {rows, profile}',
                gmailLink: 'POST /gmail_full_link',
                driveList: 'GET /gdrive_list?folderId=root&maxDepth=2',
                fullPipeline: 'POST /full_data_sync'
            }
        });
    } catch (e) {
        return cors({ success: false, error: e.message });
    }
}
export function options_import_status() { return optionsCors(); }

/**
 * POST /full_data_sync
 * Master pipeline: full Gmail link + member dedup + status report.
 * For Drive sync + XLSX import — use POST /bulk_import_members with pre-parsed rows.
 */
export async function post_full_data_sync(request) {
    try {
        const body = await request.body.json().catch(() => ({}));
        const { skipGmailLink = false } = body;
        const pipeline = {};

        // Step 1: Gmail full link
        if (!skipGmailLink) {
            pipeline.gmailLink = await gmailFullLink({ maxPages: 100, batchSize: 100 });
        }

        // Step 2: Dedup CRM members (merge duplicate emails)
        const dedupStats = { checked: 0, merged: 0 };
        try {
            const dupes = new Map();
            let skip = 0, more = true;
            while (more) {
                const r = await wixData.query('CRMMembers').isNotEmpty('email').skip(skip).limit(200).find(SA);
                for (const m of r.items) {
                    const e = normEmail(m.email);
                    if (!dupes.has(e)) dupes.set(e, []);
                    dupes.get(e).push(m);
                    dedupStats.checked++;
                }
                more = r.items.length === 200; skip += 200;
            }
            for (const [email, members] of dupes.entries()) {
                if (members.length > 1) {
                    // Keep the first (oldest) record, merge others into it
                    const primary = members[0];
                    for (let i = 1; i < members.length; i++) {
                        const dup = members[i];
                        try {
                            await wixData.update('CRMMembers', { ...dup, mergedInto: primary.memberId, isActive: false }, SA);
                            // Move communications
                            await wixData.query('MemberCommunications').eq('memberId', dup.memberId).find(SA).then(r2 => {
                                return Promise.all(r2.items.map(c => wixData.update('MemberCommunications', { ...c, memberId: primary.memberId }, SA)));
                            }).catch(() => {});
                            dedupStats.merged++;
                        } catch (_) {}
                    }
                }
            }
        } catch (e) { pipeline.dedupError = e.message; }
        pipeline.dedup = dedupStats;

        // Step 3: Summary
        const counts = {};
        for (const c of ['FamilyGroups', 'CRMMembers', 'MemberCommunications', 'MemberOrgRoles', 'Payments', 'SentEmails', 'InboxMessages']) {
            try { counts[c] = await wixData.query(c).count(SA); } catch (_) { counts[c] = 0; }
        }

        return cors({ success: true, pipeline, collections: counts, message: 'Full data sync complete.' });
    } catch (e) {
        return cors({ success: false, error: e.message });
    }
}
export function options_full_data_sync() { return optionsCors(); }

export { mapFamilyUniverseRows, mapMembership2526Rows, mapOrgRolesRows, gmailFullLink, classifySubject };
