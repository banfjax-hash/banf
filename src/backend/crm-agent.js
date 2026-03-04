/**
 * ═══════════════════════════════════════════════════════════════
 *  CRM AGENT — Family Groups, Member Profiles, Org Roles,
 *              Awards, Volunteer, Communications
 *
 *  Family ID Business Rules:
 *  ─ A "family unit" is identified by a unique family ID
 *  ─ Types: family / couple / individual / student
 *  ─ Two adults together → one family ID
 *  ─ Any info change (name/email/phone) on any member → OK, no new ID
 *  ─ Adult LEAVES a family → create new family ID for remaining adults
 *  ─ Adult JOINS an existing family that already has 2 adults → create new family ID
 *  ─ Minors (non-adult) can be added/removed freely, no new family ID
 *  ─ All changes logged in FamilyHistory (audit trail)
 * ═══════════════════════════════════════════════════════════════
 */

import wixData from 'wix-data';

const SA = { suppressAuth: true };

// ─────────────────────────────────────────
// UTILITY HELPERS
// ─────────────────────────────────────────

function generateFamilyId(year) {
    const y = year || new Date().getFullYear();
    const suffix = Math.random().toString(36).substring(2, 7).toUpperCase();
    return `FAM-${y}-${suffix}`;
}

function generateMemberId() {
    const ts = Date.now().toString(36).toUpperCase();
    const rnd = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `MBR-${ts}-${rnd}`;
}

function nowISO() { return new Date().toISOString(); }

async function logFamilyHistory(record) {
    const data = {
        familyId: record.familyId || '',
        oldFamilyId: record.oldFamilyId || '',
        changeType: record.changeType || 'info_update',
        changedMemberId: record.changedMemberId || '',
        changedMemberName: record.changedMemberName || '',
        changeReason: record.changeReason || '',
        changedAt: nowISO(),
        changedBy: record.changedBy || 'system',
        previousData: typeof record.previousData === 'object' ? JSON.stringify(record.previousData) : (record.previousData || ''),
        newFamilyId: record.newFamilyId || ''
    };
    try {
        await wixData.insert('FamilyHistory', data, SA);
    } catch (e) {
        console.error('[CRM] FamilyHistory log failed:', e.message);
    }
}

// ─────────────────────────────────────────
// FAMILY GROUP CRUD
// ─────────────────────────────────────────

/**
 * createFamily — creates FamilyGroups record + CRMMembers for each adult/minor
 * @param {Object} opts
 * @param {Array}  opts.adults   — [{firstName,lastName,email,phone,...}]
 * @param {Array}  opts.minors   — [{firstName,lastName,email?,...}]
 * @param {string} opts.familyType — 'family'|'couple'|'individual'|'student'
 * @param {string} opts.membershipType — 'annual'|'life'|'student'|'sponsor'
 * @param {string} opts.membershipYear
 * @param {string} opts.createdBy
 */
export async function createFamily(opts = {}) {
    const {
        adults = [],
        minors = [],
        familyType = 'individual',
        membershipType = 'annual',
        membershipYear = String(new Date().getFullYear()),
        createdBy = 'system',
        notes = ''
    } = opts;

    const familyId = generateFamilyId();
    const now = nowISO();

    // Determine display name
    const primaryAdult = adults[0] || {};
    const primarySurname = primaryAdult.lastName || '';
    let displayName = '';
    if (adults.length >= 2) {
        displayName = `${adults[0].firstName || ''} & ${adults[1].firstName || ''} ${primarySurname}`.trim();
    } else if (adults.length === 1) {
        displayName = `${primaryAdult.firstName || ''} ${primarySurname}`.trim();
    } else {
        displayName = 'Unknown Family';
    }

    // Insert CRMMembers for each adult
    const adultMemberIds = [];
    for (const a of adults) {
        const memberId = generateMemberId();
        const memberRecord = {
            memberId,
            familyId,
            memberType: 'adult',
            isAdult: true,
            firstName: a.firstName || '',
            lastName: a.lastName || '',
            displayName: `${a.firstName || ''} ${a.lastName || ''}`.trim(),
            email: a.email || '',
            phone: a.phone || '',
            alternateEmail: a.alternateEmail || '',
            alternatePhone: a.alternatePhone || '',
            dateOfBirth: a.dateOfBirth || '',
            gender: a.gender || '',
            profession: a.profession || '',
            employer: a.employer || '',
            education: a.education || '',
            skills: a.skills || '',
            address: a.address || '',
            city: a.city || 'Jacksonville',
            state: a.state || 'FL',
            zipCode: a.zipCode || '',
            membershipStartDate: now,
            memberSince: membershipYear,
            isLifeMember: false,
            isECMember: false,
            isBOTMember: false,
            emailOptIn: true,
            smsOptIn: false,
            sourceContactId: a.sourceContactId || '',
            isActive: true,
            notes: a.notes || '',
            familyType
        };
        await wixData.insert('CRMMembers', memberRecord, SA);
        adultMemberIds.push(memberId);
    }

    // Insert CRMMembers for each minor
    const minorMemberIds = [];
    for (const m of minors) {
        const memberId = generateMemberId();
        const memberRecord = {
            memberId,
            familyId,
            memberType: 'minor',
            isAdult: false,
            firstName: m.firstName || '',
            lastName: m.lastName || '',
            displayName: `${m.firstName || ''} ${m.lastName || ''}`.trim(),
            email: m.email || '',
            phone: m.phone || '',
            alternateEmail: '',
            alternatePhone: '',
            dateOfBirth: m.dateOfBirth || '',
            gender: m.gender || '',
            profession: '',
            employer: '',
            education: m.education || '',
            skills: '',
            address: '',
            city: 'Jacksonville',
            state: 'FL',
            zipCode: '',
            membershipStartDate: now,
            memberSince: membershipYear,
            isLifeMember: false,
            isECMember: false,
            isBOTMember: false,
            emailOptIn: false,
            smsOptIn: false,
            sourceContactId: m.sourceContactId || '',
            isActive: true,
            notes: m.notes || '',
            familyType
        };
        await wixData.insert('CRMMembers', memberRecord, SA);
        minorMemberIds.push(memberId);
    }

    // Insert FamilyGroups record
    const familyRecord = {
        familyId,
        familyType,
        displayName,
        primarySurname,
        adultMemberIds: JSON.stringify(adultMemberIds),
        minorMemberIds: JSON.stringify(minorMemberIds),
        membershipType,
        membershipYear,
        membershipStatus: 'active',
        totalMembers: adults.length + minors.length,
        isActive: true,
        notes,
        createdBy,
        createdAt: now
    };
    const inserted = await wixData.insert('FamilyGroups', familyRecord, SA);

    // Log history
    await logFamilyHistory({
        familyId,
        changeType: 'family_created',
        changedMemberName: displayName,
        changeReason: 'New family created',
        changedBy: createdBy
    });

    return { familyId, members: adultMemberIds.concat(minorMemberIds), inserted };
}

/**
 * addMinorToFamily — add a non-adult member to an existing family
 * No family ID change needed.
 */
export async function addMinorToFamily(familyId, minorData, changedBy = 'system') {
    const fam = await wixData.query('FamilyGroups').eq('familyId', familyId).find(SA);
    if (!fam.items.length) throw new Error(`Family ${familyId} not found`);
    const family = fam.items[0];

    const memberId = generateMemberId();
    const memberRecord = {
        memberId,
        familyId,
        memberType: 'minor',
        isAdult: false,
        firstName: minorData.firstName || '',
        lastName: minorData.lastName || family.primarySurname || '',
        displayName: `${minorData.firstName || ''} ${minorData.lastName || family.primarySurname || ''}`.trim(),
        email: minorData.email || '',
        phone: minorData.phone || '',
        alternateEmail: '',
        alternatePhone: '',
        dateOfBirth: minorData.dateOfBirth || '',
        gender: minorData.gender || '',
        profession: '',
        employer: '',
        education: minorData.education || '',
        skills: '',
        address: '',
        city: 'Jacksonville',
        state: 'FL',
        zipCode: '',
        membershipStartDate: nowISO(),
        memberSince: String(new Date().getFullYear()),
        isLifeMember: false,
        isECMember: false,
        isBOTMember: false,
        emailOptIn: false,
        smsOptIn: false,
        sourceContactId: minorData.sourceContactId || '',
        isActive: true,
        notes: minorData.notes || '',
        familyType: family.familyType || 'family'
    };

    await wixData.insert('CRMMembers', memberRecord, SA);

    // Update family minorMemberIds
    const existingMinors = JSON.parse(family.minorMemberIds || '[]');
    existingMinors.push(memberId);
    await wixData.update('FamilyGroups', {
        ...family,
        minorMemberIds: JSON.stringify(existingMinors),
        totalMembers: (family.totalMembers || 1) + 1
    }, SA);

    await logFamilyHistory({
        familyId,
        changeType: 'minor_add',
        changedMemberId: memberId,
        changedMemberName: memberRecord.displayName,
        changeReason: 'Minor added to family',
        changedBy
    });

    return { memberId, familyId };
}

/**
 * removeAdultFromFamily — removes an adult and triggers NEW family ID for remaining adults
 * Business rule: when an adult leaves, the family composition changes, so a new family ID
 * is required for the remaining unit.
 */
export async function removeAdultFromFamily(familyId, memberId, reason = 'Adult left', changedBy = 'system') {
    const [famRes, memberRes] = await Promise.all([
        wixData.query('FamilyGroups').eq('familyId', familyId).find(SA),
        wixData.query('CRMMembers').eq('memberId', memberId).find(SA)
    ]);
    if (!famRes.items.length) throw new Error(`Family ${familyId} not found`);
    if (!memberRes.items.length) throw new Error(`Member ${memberId} not found`);

    const family = famRes.items[0];
    const member = memberRes.items[0];
    const adults = JSON.parse(family.adultMemberIds || '[]');
    const remainingAdults = adults.filter(id => id !== memberId);

    // Mark leaving member as inactive (keep data, just deactivate)
    await wixData.update('CRMMembers', { ...member, isActive: false, familyId: '' }, SA);

    if (remainingAdults.length === 0) {
        // No adults left — deactivate the family
        await wixData.update('FamilyGroups', { ...family, adultMemberIds: '[]', isActive: false, membershipStatus: 'inactive', totalMembers: 0 }, SA);
        await logFamilyHistory({
            familyId, oldFamilyId: familyId,
            changeType: 'adult_leave',
            changedMemberId: memberId, changedMemberName: member.displayName,
            changeReason: reason, changedBy,
            previousData: { adultMemberIds: adults }
        });
        return { oldFamilyId: familyId, newFamilyId: null, action: 'family_deactivated' };
    }

    // Create NEW family ID for remaining members (business rule)
    const newFamilyId = generateFamilyId();
    const minors = JSON.parse(family.minorMemberIds || '[]');

    // Update remaining adult members to new familyId
    for (const aid of remainingAdults) {
        const res = await wixData.query('CRMMembers').eq('memberId', aid).find(SA);
        if (res.items.length) {
            await wixData.update('CRMMembers', { ...res.items[0], familyId: newFamilyId }, SA);
        }
    }
    // Update minors to new familyId
    for (const mid of minors) {
        const res = await wixData.query('CRMMembers').eq('memberId', mid).find(SA);
        if (res.items.length) {
            await wixData.update('CRMMembers', { ...res.items[0], familyId: newFamilyId }, SA);
        }
    }

    // Deactivate old family record
    await wixData.update('FamilyGroups', { ...family, isActive: false, membershipStatus: 'superseded' }, SA);

    // Create new family record
    const newFamily = {
        ...family,
        _id: undefined,
        familyId: newFamilyId,
        adultMemberIds: JSON.stringify(remainingAdults),
        totalMembers: remainingAdults.length + minors.length,
        isActive: true,
        membershipStatus: 'active',
        createdAt: nowISO()
    };
    delete newFamily._id;
    await wixData.insert('FamilyGroups', newFamily, SA);

    await logFamilyHistory({
        familyId: newFamilyId, oldFamilyId: familyId,
        changeType: 'adult_leave',
        changedMemberId: memberId, changedMemberName: member.displayName,
        changeReason: reason, changedBy,
        previousData: { adultMemberIds: adults },
        newFamilyId
    });

    return { oldFamilyId: familyId, newFamilyId, action: 'new_family_id_created' };
}

/**
 * addAdultToFamily — add an adult to an existing family.
 * If family already has 2 adults, a NEW family ID is created.
 */
export async function addAdultToFamily(familyId, adultData, changedBy = 'system') {
    const famRes = await wixData.query('FamilyGroups').eq('familyId', familyId).find(SA);
    if (!famRes.items.length) throw new Error(`Family ${familyId} not found`);
    const family = famRes.items[0];
    const existingAdults = JSON.parse(family.adultMemberIds || '[]');

    let targetFamilyId = familyId;
    let action = 'adult_added';

    if (existingAdults.length >= 2) {
        // Business rule: new family ID required
        targetFamilyId = generateFamilyId();
        action = 'new_family_id_created';

        const minors = JSON.parse(family.minorMemberIds || '[]');
        // Deactivate old family
        await wixData.update('FamilyGroups', { ...family, isActive: false, membershipStatus: 'superseded' }, SA);

        // Create new family with all existing adults + new adult
        const newFamilyRec = {
            ...family,
            _id: undefined,
            familyId: targetFamilyId,
            adultMemberIds: JSON.stringify([...existingAdults]),
            minorMemberIds: JSON.stringify(minors),
            isActive: true,
            membershipStatus: 'active',
            createdAt: nowISO()
        };
        delete newFamilyRec._id;
        await wixData.insert('FamilyGroups', newFamilyRec, SA);

        // Update existing members
        for (const aid of existingAdults) {
            const res = await wixData.query('CRMMembers').eq('memberId', aid).find(SA);
            if (res.items.length) await wixData.update('CRMMembers', { ...res.items[0], familyId: targetFamilyId }, SA);
        }
        for (const mid of minors) {
            const res = await wixData.query('CRMMembers').eq('memberId', mid).find(SA);
            if (res.items.length) await wixData.update('CRMMembers', { ...res.items[0], familyId: targetFamilyId }, SA);
        }
    }

    // Insert new adult
    const memberId = generateMemberId();
    await wixData.insert('CRMMembers', {
        memberId,
        familyId: targetFamilyId,
        memberType: 'adult',
        isAdult: true,
        firstName: adultData.firstName || '',
        lastName: adultData.lastName || '',
        displayName: `${adultData.firstName || ''} ${adultData.lastName || ''}`.trim(),
        email: adultData.email || '',
        phone: adultData.phone || '',
        alternateEmail: adultData.alternateEmail || '',
        alternatePhone: adultData.alternatePhone || '',
        dateOfBirth: adultData.dateOfBirth || '',
        gender: adultData.gender || '',
        profession: adultData.profession || '',
        employer: adultData.employer || '',
        education: adultData.education || '',
        skills: adultData.skills || '',
        address: adultData.address || '',
        city: adultData.city || 'Jacksonville',
        state: adultData.state || 'FL',
        zipCode: adultData.zipCode || '',
        membershipStartDate: nowISO(),
        memberSince: String(new Date().getFullYear()),
        isLifeMember: false, isECMember: false, isBOTMember: false,
        emailOptIn: true, smsOptIn: false,
        sourceContactId: adultData.sourceContactId || '',
        isActive: true,
        notes: adultData.notes || '',
        familyType: family.familyType || 'family'
    }, SA);

    // Update family adultsIds
    const updatedFam = await wixData.query('FamilyGroups').eq('familyId', targetFamilyId).find(SA);
    if (updatedFam.items.length) {
        const fam2 = updatedFam.items[0];
        const adults2 = JSON.parse(fam2.adultMemberIds || '[]');
        adults2.push(memberId);
        await wixData.update('FamilyGroups', {
            ...fam2,
            adultMemberIds: JSON.stringify(adults2),
            totalMembers: (fam2.totalMembers || 0) + 1
        }, SA);
    }

    await logFamilyHistory({
        familyId: targetFamilyId, oldFamilyId: familyId,
        changeType: 'adult_join',
        changedMemberId: memberId,
        changedMemberName: `${adultData.firstName || ''} ${adultData.lastName || ''}`.trim(),
        changeReason: 'Adult joined family',
        changedBy,
        newFamilyId: action === 'new_family_id_created' ? targetFamilyId : ''
    });

    return { memberId, familyId: targetFamilyId, action };
}

/**
 * updateMemberInfo — Update any info fields for a member (name, phone, email, etc.)
 * No family ID change is triggered.
 */
export async function updateMemberInfo(memberId, updateData, changedBy = 'system') {
    const res = await wixData.query('CRMMembers').eq('memberId', memberId).find(SA);
    if (!res.items.length) throw new Error(`Member ${memberId} not found`);
    const member = res.items[0];
    const prev = { ...member };

    const allowed = ['firstName','lastName','displayName','email','phone','alternateEmail','alternatePhone',
        'dateOfBirth','gender','profession','employer','education','skills','address','city','state',
        'zipCode','emailOptIn','smsOptIn','isLifeMember','notes','profilePhoto',
        // Extended fields — membership, family, status
        'memberSince','familyType','membershipType','membershipYear','membershipStatus',
        'isActive','isECMember','isBOTMember','importSource','country','memberType',
        'membershipStartDate','membershipEndDate','lastUpdated','lastPaymentYear'];

    for (const key of allowed) {
        if (updateData[key] !== undefined) member[key] = updateData[key];
    }
    member.lastUpdated = new Date().toISOString();

    await wixData.update('CRMMembers', member, SA);

    await logFamilyHistory({
        familyId: member.familyId,
        changeType: 'info_update',
        changedMemberId: memberId,
        changedMemberName: member.displayName,
        changeReason: 'Member info updated',
        changedBy,
        previousData: prev
    });

    return { memberId, updated: true };
}

// ─────────────────────────────────────────
// SEED FROM EXISTING DATA
// ─────────────────────────────────────────

/**
 * seedFromFamilyMapping — imports families from the report_25-26_family_mapping data
 * which is passed in as a JSON array.
 */
export async function seedFromFamilyMapping(familyMapping, createdBy = 'seed-agent') {
    const results = { created: 0, skipped: 0, errors: [] };

    for (const group of familyMapping) {
        try {
            // Check if family already exists
            const existing = await wixData.query('FamilyGroups').eq('familyId', group.family_id).find(SA);
            if (existing.items.length) { results.skipped++; continue; }

            const adults = (group.members || []).map(m => ({
                firstName: m.firstName || (m.name || '').split(' ')[0] || '',
                lastName: m.lastName || (m.name || '').split(' ').slice(1).join(' ') || group.primary_surname || '',
                email: m.email || '',
                phone: m.phone || '',
                sourceContactId: m.contactId || ''
            }));

            const now = nowISO();
            const adultIds = [];
            for (const a of adults) {
                const memberId = generateMemberId();
                await wixData.insert('CRMMembers', {
                    memberId,
                    familyId: group.family_id,
                    memberType: 'adult', isAdult: true,
                    firstName: a.firstName, lastName: a.lastName,
                    displayName: `${a.firstName} ${a.lastName}`.trim(),
                    email: a.email, phone: a.phone || '',
                    alternateEmail: '', alternatePhone: '',
                    dateOfBirth: '', gender: '',
                    profession: '', employer: '', education: '', skills: '',
                    address: '', city: 'Jacksonville', state: 'FL', zipCode: '',
                    membershipStartDate: now, memberSince: '2025',
                    isLifeMember: false, isECMember: false, isBOTMember: false,
                    emailOptIn: true, smsOptIn: false,
                    sourceContactId: a.sourceContactId,
                    isActive: group.retention_status !== 'lapsed',
                    notes: '', familyType: group.members?.length >= 2 ? 'family' : 'individual',
                    membershipStatus: group.retention_status || 'active'
                }, SA);
                adultIds.push(memberId);
            }

            await wixData.insert('FamilyGroups', {
                familyId: group.family_id,
                familyType: (adults.length >= 2 ? 'family' : 'individual'),
                displayName: group.display_name || `${group.primary_surname} Family`,
                primarySurname: group.primary_surname || '',
                adultMemberIds: JSON.stringify(adultIds),
                minorMemberIds: '[]',
                membershipType: 'annual',
                membershipYear: '2025',
                membershipStatus: group.retention_status || 'active',
                totalMembers: adultIds.length,
                isActive: group.retention_status !== 'lapsed',
                notes: `Seeds from family mapping. Alt surnames: ${(group.alt_surnames || []).join(', ')}`,
                createdBy, createdAt: now
            }, SA);

            results.created++;
        } catch (e) {
            results.errors.push({ familyId: group.family_id, error: e.message });
        }
    }

    return results;
}

/**
 * seedFromGoogleContacts — imports Google contacts as individual/couple members
 * Tries to match couples by shared surname in same domain.
 */
export async function seedFromGoogleContacts(contacts, createdBy = 'seed-agent') {
    const results = { created: 0, skipped: 0, errors: [] };

    for (const c of contacts) {
        try {
            const email = c.email || '';
            if (!email) { results.skipped++; continue; }

            // Check if member already exists with this email
            const existing = await wixData.query('CRMMembers').eq('email', email).find(SA);
            if (existing.items.length) { results.skipped++; continue; }

            // This is a standalone contact — check if family mapping already covered it
            const famCheck = await wixData.query('CRMMembers').eq('email', email).find(SA);
            if (famCheck.items.length) { results.skipped++; continue; }

            await createFamily({
                adults: [{
                    firstName: c.firstName || '',
                    lastName: c.lastName || '',
                    email: c.email || '',
                    phone: c.phone || '',
                    employer: c.organization || '',
                    sourceContactId: c.resourceName || ''
                }],
                minors: [],
                familyType: 'individual',
                membershipType: 'annual',
                membershipYear: '2025',
                createdBy
            });
            results.created++;
        } catch (e) {
            results.errors.push({ email: c.email, error: e.message });
        }
    }

    return results;
}

/**
 * linkEmailsToMembers — scans InboxMessages and SentEmails,
 * creates MemberCommunications records joining emails to CRMMembers.
 */
export async function linkEmailsToMembers() {
    const results = { linked: 0, errors: [] };

    try {
        // Build email → memberId map
        const memRes = await wixData.query('CRMMembers').limit(1000).find(SA);
        const emailMap = {};
        for (const m of memRes.items) {
            if (m.email) emailMap[m.email.toLowerCase()] = m;
            if (m.alternateEmail) emailMap[m.alternateEmail.toLowerCase()] = m;
        }

        // Process inbox
        const inbox = await wixData.query('InboxMessages').limit(500).find(SA).catch(() => ({ items: [] }));
        for (const msg of inbox.items) {
            const fromEmail = (msg.from || '').toLowerCase();
            const member = emailMap[fromEmail];
            if (!member) continue;
            try {
                const exists = await wixData.query('MemberCommunications')
                    .eq('messageId', msg._id).eq('memberId', member.memberId).find(SA);
                if (exists.items.length) continue;
                await wixData.insert('MemberCommunications', {
                    memberId: member.memberId,
                    familyId: member.familyId || '',
                    messageId: msg._id || '',
                    direction: 'inbound',
                    subject: (msg.subject || '').substring(0, 200),
                    body: (msg.body || msg.snippet || '').substring(0, 500),
                    date: msg.date || msg._createdDate || '',
                    from: msg.from || '',
                    to: msg.to || '',
                    category: classifyEmailCategory(msg.subject || ''),
                    isRead: true
                }, SA);
                results.linked++;
            } catch (e) { results.errors.push(e.message); }
        }

        // Process sent
        const sent = await wixData.query('SentEmails').limit(500).find(SA).catch(() => ({ items: [] }));
        for (const msg of sent.items) {
            const toEmail = (msg.to || '').toLowerCase();
            const member = emailMap[toEmail];
            if (!member) continue;
            try {
                const exists = await wixData.query('MemberCommunications')
                    .eq('messageId', msg._id).eq('memberId', member.memberId).find(SA);
                if (exists.items.length) continue;
                await wixData.insert('MemberCommunications', {
                    memberId: member.memberId,
                    familyId: member.familyId || '',
                    messageId: msg._id || '',
                    direction: 'outbound',
                    subject: (msg.subject || '').substring(0, 200),
                    body: (msg.body || msg.snippet || '').substring(0, 500),
                    date: msg.date || msg._createdDate || '',
                    from: msg.from || '',
                    to: msg.to || '',
                    category: classifyEmailCategory(msg.subject || ''),
                    isRead: true
                }, SA);
                results.linked++;
            } catch (e) { results.errors.push(e.message); }
        }
    } catch (e) {
        results.errors.push('linkEmailsToMembers fatal: ' + e.message);
    }

    return results;
}

function classifyEmailCategory(subject) {
    const s = subject.toLowerCase();
    if (s.includes('pay') || s.includes('fee') || s.includes('dues') || s.includes('invoice')) return 'payment';
    if (s.includes('event') || s.includes('puja') || s.includes('festival') || s.includes('picnic')) return 'event';
    if (s.includes('member') || s.includes('join') || s.includes('renew')) return 'membership';
    if (s.includes('complaint') || s.includes('concern') || s.includes('issue')) return 'complaint';
    if (s.includes('volunteer') || s.includes('help needed')) return 'volunteer';
    return 'general';
}

// ─────────────────────────────────────────
// ORG ROLES / AWARDS / VOLUNTEER
// ─────────────────────────────────────────

export async function addOrgRole(data) {
    const record = {
        memberId: data.memberId || '',
        memberName: data.memberName || '',
        email: data.email || '',
        roleType: data.roleType || 'EC',
        roleName: data.roleName || '',
        term: data.term || '',
        startDate: data.startDate || '',
        endDate: data.endDate || '',
        isCurrentRole: data.isCurrentRole !== false,
        description: data.description || '',
        appointedBy: data.appointedBy || ''
    };
    const inserted = await wixData.insert('MemberOrgRoles', record, SA);
    // Update isECMember / isBOTMember on CRMMembers
    const mRes = await wixData.query('CRMMembers').eq('memberId', data.memberId).find(SA);
    if (mRes.items.length) {
        const m = mRes.items[0];
        const update = { ...m };
        if (['EC', 'President', 'Secretary', 'Treasurer', 'Vice President'].includes(data.roleType) || data.roleType === 'EC') update.isECMember = true;
        if (data.roleType === 'BOT') update.isBOTMember = true;
        await wixData.update('CRMMembers', update, SA);
    }
    return inserted;
}

export async function addAward(data) {
    const record = {
        memberId: data.memberId || '',
        memberName: data.memberName || '',
        awardName: data.awardName || '',
        awardCategory: data.awardCategory || 'Community',
        year: data.year || String(new Date().getFullYear()),
        presentedAt: data.presentedAt || '',
        description: data.description || '',
        awardedBy: data.awardedBy || 'BANF EC'
    };
    return await wixData.insert('MemberAwards', record, SA);
}

export async function addVolunteerRecord(data) {
    const record = {
        memberId: data.memberId || '',
        memberName: data.memberName || '',
        eventId: data.eventId || '',
        eventName: data.eventName || '',
        role: data.role || '',
        hoursServed: parseFloat(data.hoursServed) || 0,
        date: data.date || '',
        category: data.category || 'event',
        notes: data.notes || '',
        recordedBy: data.recordedBy || 'system'
    };
    return await wixData.insert('MemberVolunteer', record, SA);
}

// ─────────────────────────────────────────
// QUERY HELPERS
// ─────────────────────────────────────────

export async function getFamilyDetails(familyId) {
    const famRes = await wixData.query('FamilyGroups').eq('familyId', familyId).find(SA);
    if (!famRes.items.length) return null;
    const family = famRes.items[0];

    const allMemberIds = [
        ...JSON.parse(family.adultMemberIds || '[]'),
        ...JSON.parse(family.minorMemberIds || '[]')
    ];

    const members = [];
    for (const mid of allMemberIds) {
        const res = await wixData.query('CRMMembers').eq('memberId', mid).find(SA);
        if (res.items.length) members.push(res.items[0]);
    }

    return { ...family, members };
}

export async function getMemberFullProfile(memberId) {
    const mRes = await wixData.query('CRMMembers').eq('memberId', memberId).find(SA);
    if (!mRes.items.length) return null;
    const member = mRes.items[0];

    const [roles, awards, volunteer, comms, payments] = await Promise.all([
        wixData.query('MemberOrgRoles').eq('memberId', memberId).find(SA).catch(() => ({ items: [] })),
        wixData.query('MemberAwards').eq('memberId', memberId).find(SA).catch(() => ({ items: [] })),
        wixData.query('MemberVolunteer').eq('memberId', memberId).find(SA).catch(() => ({ items: [] })),
        wixData.query('MemberCommunications').eq('memberId', memberId).descending('date').limit(20).find(SA).catch(() => ({ items: [] })),
        wixData.query('Payments').eq('email', member.email).find(SA).catch(() => ({ items: [] }))
    ]);

    return {
        ...member,
        orgRoles: roles.items,
        awards: awards.items,
        volunteerHistory: volunteer.items,
        recentCommunications: comms.items,
        payments: payments.items
    };
}

export async function getCRMDashboard() {
    const [
        totalFamilies, activeFamilies,
        totalMembers, activeMembers,
        ecMembers, botMembers,
        orgRoles, awards, volunteer, comms,
        familyTypes
    ] = await Promise.all([
        wixData.query('FamilyGroups').count(SA).catch(() => 0),
        wixData.query('FamilyGroups').eq('isActive', true).count(SA).catch(() => 0),
        wixData.query('CRMMembers').count(SA).catch(() => 0),
        wixData.query('CRMMembers').eq('isActive', true).count(SA).catch(() => 0),
        wixData.query('CRMMembers').eq('isECMember', true).count(SA).catch(() => 0),
        wixData.query('CRMMembers').eq('isBOTMember', true).count(SA).catch(() => 0),
        wixData.query('MemberOrgRoles').count(SA).catch(() => 0),
        wixData.query('MemberAwards').count(SA).catch(() => 0),
        wixData.query('MemberVolunteer').count(SA).catch(() => 0),
        wixData.query('MemberCommunications').count(SA).catch(() => 0),
        wixData.query('FamilyGroups').distinct('familyType', SA).catch(() => ({ items: [] }))
    ]);

    return {
        families: { total: totalFamilies, active: activeFamilies },
        members: { total: totalMembers, active: activeMembers, ecMembers, botMembers },
        engagement: { orgRoles, awards, volunteer, communications: comms },
        familyTypes: familyTypes.items || []
    };
}
