#!/usr/bin/env node
/**
 * GBM → CRM Audit + Family Grouping Excel Report
 * 
 * 1. Scans Gmail SENT for GBM invitation emails (~175 recipients)
 * 2. Fetches all Wix native CRM contacts via live API
 * 3. Cross-references: who's in CRM, who's missing
 * 4. Groups into family units by last-name + domain heuristics
 * 5. Generates Excel (.xlsx) with sheets: Individual Emails, Family Groups, Missing from CRM
 * 6. Emails the Excel to president (ranadhir.ghosh@gmail.com)
 */
const https = require('https');
const fs = require('fs');
const path = require('path');
const ExcelJS = require('exceljs');

const GOOGLE_CLIENT_ID = '1020178199135-3usrl611ara38i7rhu2ub6sn6g1150ml.apps.googleusercontent.com';
const GOOGLE_CLIENT_SECRET = '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';
const GOOGLE_REFRESH_TOKEN = require('./banf-gmail-config').REFRESH_TOKEN;

const FROM_EMAIL = 'banfjax@gmail.com';
const PRESIDENT_EMAIL = 'ranadhir.ghosh@gmail.com';
const SITE_API = 'https://www.jaxbengali.org/_functions';

// ── HTTP helpers ──
function httpsRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const opts = {
      hostname: u.hostname, port: 443,
      path: u.pathname + u.search,
      method: options.method || 'GET',
      headers: options.headers || {},
      timeout: 30000
    };
    const req = https.request(opts, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => { try { resolve(JSON.parse(d)); } catch { resolve(d); } });
    });
    req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
    req.on('error', reject);
    if (options.body) req.write(options.body);
    req.end();
  });
}

// ── Gmail Auth ──
async function getToken() {
  const body = `grant_type=refresh_token&refresh_token=${encodeURIComponent(GOOGLE_REFRESH_TOKEN)}&client_id=${encodeURIComponent(GOOGLE_CLIENT_ID)}&client_secret=${encodeURIComponent(GOOGLE_CLIENT_SECRET)}`;
  const r = await httpsRequest('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Content-Length': Buffer.byteLength(body) },
    body
  });
  if (!r.access_token) throw new Error('Token refresh failed');
  return r.access_token;
}

// ── Gmail Search ──
async function searchGmail(query, token) {
  const allIds = [];
  let pageToken = '';
  while (true) {
    const url = `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(query)}&maxResults=100${pageToken ? '&pageToken=' + pageToken : ''}`;
    const r = await httpsRequest(url, { headers: { Authorization: `Bearer ${token}` } });
    (r.messages || []).forEach(m => allIds.push(m.id));
    if (!r.nextPageToken || allIds.length >= 500) break;
    pageToken = r.nextPageToken;
  }
  return allIds;
}

// ── Gmail Get Message ──
async function getFullMessage(id, token) {
  const url = `https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}?format=metadata&metadataHeaders=To&metadataHeaders=Subject&metadataHeaders=Date&metadataHeaders=Cc&metadataHeaders=Bcc`;
  const r = await httpsRequest(url, { headers: { Authorization: `Bearer ${token}` } });
  const headers = (r.payload && r.payload.headers) || [];
  const getH = name => headers.filter(h => h.name.toLowerCase() === name.toLowerCase()).map(h => h.value).join(', ');
  return { id, to: getH('To'), cc: getH('Cc'), bcc: getH('Bcc'), subject: getH('Subject'), date: getH('Date') };
}

// ── Extract emails with names ──
function extractEmailsWithNames(str) {
  if (!str) return [];
  const results = [];
  const parts = str.split(/,\s*/);
  for (const part of parts) {
    const match = part.match(/"?([^"<]*)"?\s*<([\w.+-]+@[\w.-]+\.\w+)>/i);
    if (match) {
      results.push({ name: match[1].trim(), email: match[2].toLowerCase().trim() });
    } else {
      const emailMatch = part.match(/([\w.+-]+@[\w.-]+\.\w+)/i);
      if (emailMatch) results.push({ name: '', email: emailMatch[1].toLowerCase().trim() });
    }
  }
  return results;
}

// ── Infer last name from name string ──
function inferLastName(name) {
  if (!name) return '';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return parts[parts.length - 1].toLowerCase();
  return parts[0].toLowerCase();
}

// ── Infer last name from email ──
function inferLastNameFromEmail(email) {
  const local = email.split('@')[0];
  // Common patterns: firstname.lastname, firstlast, first_last
  const dotParts = local.split('.');
  if (dotParts.length >= 2) return dotParts[dotParts.length - 1].replace(/\d+/g, '').toLowerCase();
  const underParts = local.split('_');
  if (underParts.length >= 2) return underParts[underParts.length - 1].replace(/\d+/g, '').toLowerCase();
  return '';
}

// ── Send email with Excel attachment via Gmail API ──
async function sendEmailWithAttachment(token, to, subject, htmlBody, plainText, filePath, fileName) {
  const boundary = 'boundary_banf_' + Date.now();
  const fileData = fs.readFileSync(filePath);
  const fileBase64 = fileData.toString('base64');

  const raw = [
    `From: BANF Jacksonville <${FROM_EMAIL}>`,
    `To: ${to}`,
    `Subject: ${subject}`,
    'MIME-Version: 1.0',
    `Content-Type: multipart/mixed; boundary="${boundary}"`,
    '',
    `--${boundary}`,
    'Content-Type: multipart/alternative; boundary="alt_boundary"',
    '',
    '--alt_boundary',
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: base64',
    '',
    Buffer.from(plainText).toString('base64'),
    '',
    '--alt_boundary',
    'Content-Type: text/html; charset=UTF-8',
    'Content-Transfer-Encoding: base64',
    '',
    Buffer.from(htmlBody).toString('base64'),
    '',
    '--alt_boundary--',
    '',
    `--${boundary}`,
    `Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet; name="${fileName}"`,
    'Content-Transfer-Encoding: base64',
    `Content-Disposition: attachment; filename="${fileName}"`,
    '',
    ...fileBase64.match(/.{1,76}/g),
    '',
    `--${boundary}--`
  ].join('\r\n');

  const encoded = Buffer.from(raw).toString('base64')
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

  const url = 'https://gmail.googleapis.com/gmail/v1/users/me/messages/send';
  const jsonBody = JSON.stringify({ raw: encoded });
  const r = await httpsRequest(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(jsonBody) },
    body: jsonBody
  });
  if (r.id) return r;
  throw new Error('Send failed: ' + JSON.stringify(r));
}

// ══════════════════════════════════════════════
//  MAIN
// ══════════════════════════════════════════════
async function main() {
  console.log('═══════════════════════════════════════════');
  console.log('  BANF GBM → CRM Audit + Family Report');
  console.log('  ' + new Date().toISOString());
  console.log('═══════════════════════════════════════════\n');

  // ── Step 1: Get Gmail token ──
  const token = await getToken();
  console.log('✅ Gmail token obtained\n');

  // ── Step 2: Search for GBM emails ──
  console.log('🔎 Searching for GBM invitation emails...');
  const gbmIds = await searchGmail('in:sent from:banfjax@gmail.com subject:"Invitation to Annual GBM 2026"', token);
  console.log(`   GBM Invitation emails: ${gbmIds.length}`);

  const gbmLinkIds = await searchGmail('in:sent from:banfjax@gmail.com subject:"GBM Link" after:2026/02/01', token);
  console.log(`   GBM Link emails: ${gbmLinkIds.length}`);

  const deckIds = await searchGmail('in:sent from:banfjax@gmail.com subject:"Final Presentation Deck" after:2026/03/01', token);
  console.log(`   Final Presentation Deck emails: ${deckIds.length}`);

  const allMsgIds = [...new Set([...gbmIds, ...gbmLinkIds, ...deckIds])];
  console.log(`   Total unique messages: ${allMsgIds.length}\n`);

  // ── Step 3: Extract all recipients ──
  console.log('📬 Extracting recipients from all messages...');
  const allRecipients = new Map(); // email -> { names, subjects }
  for (let i = 0; i < allMsgIds.length; i++) {
    try {
      const msg = await getFullMessage(allMsgIds[i], token);
      const recipients = [
        ...extractEmailsWithNames(msg.to),
        ...extractEmailsWithNames(msg.cc),
        ...extractEmailsWithNames(msg.bcc)
      ];
      for (const r of recipients) {
        if (r.email === FROM_EMAIL || r.email === 'botbanf@gmail.com') continue;
        if (!allRecipients.has(r.email)) {
          allRecipients.set(r.email, { names: new Set(), subjects: new Set() });
        }
        if (r.name) allRecipients.get(r.email).names.add(r.name);
        allRecipients.get(r.email).subjects.add(msg.subject.substring(0, 60));
      }
    } catch (e) {
      console.log(`   ⚠️ Failed message ${i}: ${e.message}`);
    }
  }
  console.log(`   Found ${allRecipients.size} unique GBM email recipients\n`);

  // ── Step 4: Fetch CRM contacts via live API ──
  console.log('🔗 Fetching CRM contacts from live site...');
  let crmContacts = [];
  try {
    const resp = await httpsRequest(`${SITE_API}/evite_recipients?type=all_members`);
    if (resp.success && resp.members) {
      crmContacts = resp.members;
      console.log(`   CRM contacts: ${crmContacts.length}\n`);
    } else {
      console.log(`   ⚠️ CRM API returned: ${JSON.stringify(resp).substring(0, 200)}\n`);
    }
  } catch (e) {
    console.log(`   ⚠️ CRM fetch failed: ${e.message}\n`);
  }

  const crmEmailSet = new Set(crmContacts.map(c => c.email.toLowerCase()));

  // ── Step 5: Cross-reference ──
  const individualRows = [];
  const missingFromCRM = [];
  const inCRM = [];

  const sortedRecipients = [...allRecipients.entries()].sort((a, b) => a[0].localeCompare(b[0]));

  for (const [email, data] of sortedRecipients) {
    const name = [...data.names].join(' / ') || '';
    const foundInCRM = crmEmailSet.has(email);
    const crmEntry = crmContacts.find(c => c.email.toLowerCase() === email);
    const crmName = crmEntry ? crmEntry.name : '';
    const subjects = [...data.subjects].join('; ');

    individualRows.push({
      email,
      nameFromEmail: name,
      nameFromCRM: crmName,
      inCRM: foundInCRM ? 'YES' : 'NO',
      emailSources: subjects
    });

    if (foundInCRM) {
      inCRM.push({ email, name: crmName || name });
    } else {
      missingFromCRM.push({ email, name });
    }
  }

  console.log(`📊 Cross-reference results:`);
  console.log(`   In CRM: ${inCRM.length}`);
  console.log(`   Missing from CRM: ${missingFromCRM.length}`);
  console.log(`   Total GBM recipients: ${individualRows.length}\n`);

  // ── Step 6: Build family groupings ──
  console.log('👨‍👩‍👧 Building family groupings...');

  // Known Bengali last names for better grouping
  const knownLastNames = new Set([
    'ghosh', 'mukherjee', 'mukherje', 'banerjee', 'chatterjee', 'chattopadhyay',
    'das', 'dutta', 'roy', 'saha', 'mondal', 'chakraborty', 'chakravarty',
    'ganguly', 'sanyal', 'mitra', 'guha', 'mazumdar', 'majumdar', 'sarkar',
    'bose', 'bhattacharjee', 'bhattacharyya', 'pal', 'sen', 'natta', 'mandal',
    'roychoudhury', 'choudhury', 'raychaudhuri', 'chandra', 'dhar', 'hazra',
    'kar', 'karmakar', 'paul', 'poddar', 'sinha', 'tripathy', 'maitra',
    'bagchi', 'goswami', 'sadhu', 'neogi', 'mistry', 'chaudhuri', 'mehta'
  ]);

  // Group all contacts (GBM + CRM merged) by last name
  const allPeople = new Map(); // email -> { name, lastName, inGBM, inCRM }
  for (const [email, data] of allRecipients.entries()) {
    const name = [...data.names][0] || '';
    const lastName = inferLastName(name) || inferLastNameFromEmail(email);
    allPeople.set(email, { name, lastName, inGBM: true, inCRM: crmEmailSet.has(email) });
  }
  // Add CRM-only entries
  for (const c of crmContacts) {
    const email = c.email.toLowerCase();
    if (!allPeople.has(email)) {
      const lastName = inferLastName(c.name) || inferLastNameFromEmail(email);
      allPeople.set(email, { name: c.name, lastName, inGBM: false, inCRM: true });
    }
  }

  // Group by last name
  const familyMap = new Map(); // lastName -> [{email, name, inGBM, inCRM}]
  for (const [email, info] of allPeople.entries()) {
    const key = info.lastName || 'unknown';
    if (!familyMap.has(key)) familyMap.set(key, []);
    familyMap.get(key).push({ email, ...info });
  }

  // Build family rows
  const familyRows = [];
  let familyId = 1;
  const sortedFamilies = [...familyMap.entries()].sort((a, b) => a[0].localeCompare(b[0]));

  for (const [lastName, members] of sortedFamilies) {
    const isRealFamily = members.length >= 2 && knownLastNames.has(lastName);
    const groupLabel = isRealFamily
      ? `${lastName.charAt(0).toUpperCase() + lastName.slice(1)} Family`
      : (members.length >= 2 ? `${lastName.charAt(0).toUpperCase() + lastName.slice(1)} (possible family)` : 'Individual');

    for (const m of members) {
      familyRows.push({
        familyId: members.length >= 2 ? familyId : '',
        familyGroup: groupLabel,
        memberCount: members.length,
        email: m.email,
        name: m.name,
        inGBM: m.inGBM ? 'YES' : 'NO',
        inCRM: m.inCRM ? 'YES' : 'NO'
      });
    }
    if (members.length >= 2) familyId++;
  }

  console.log(`   Family groups (2+ members): ${familyId - 1}`);
  console.log(`   Total entries: ${familyRows.length}\n`);

  // ── Step 7: Generate Excel ──
  console.log('📝 Generating Excel file...');
  const wb = new ExcelJS.Workbook();
  wb.creator = 'BANF System';
  wb.created = new Date();

  // --- Sheet 1: All Individual Emails ---
  const ws1 = wb.addWorksheet('Individual Emails');
  ws1.columns = [
    { header: '#', key: 'num', width: 5 },
    { header: 'Email', key: 'email', width: 35 },
    { header: 'Name (from email)', key: 'nameFromEmail', width: 30 },
    { header: 'Name (from CRM)', key: 'nameFromCRM', width: 30 },
    { header: 'In CRM?', key: 'inCRM', width: 10 },
    { header: 'GBM Email Sources', key: 'emailSources', width: 50 }
  ];

  // Style header
  ws1.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  ws1.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1565C0' } };

  individualRows.forEach((r, i) => {
    const row = ws1.addRow({ num: i + 1, ...r });
    // Highlight missing CRM entries in red
    if (r.inCRM === 'NO') {
      row.getCell('inCRM').font = { bold: true, color: { argb: 'FFFF0000' } };
      row.getCell('inCRM').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF0F0' } };
    } else {
      row.getCell('inCRM').font = { bold: true, color: { argb: 'FF2E7D32' } };
    }
  });

  // Auto-filter
  ws1.autoFilter = 'A1:F1';

  // --- Sheet 2: Family Groups ---
  const ws2 = wb.addWorksheet('Family Groups');
  ws2.columns = [
    { header: 'Family ID', key: 'familyId', width: 10 },
    { header: 'Family Group', key: 'familyGroup', width: 30 },
    { header: 'Members', key: 'memberCount', width: 10 },
    { header: 'Email', key: 'email', width: 35 },
    { header: 'Name', key: 'name', width: 30 },
    { header: 'In GBM List?', key: 'inGBM', width: 12 },
    { header: 'In CRM?', key: 'inCRM', width: 10 }
  ];

  ws2.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  ws2.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF7B1FA2' } };

  let prevFamilyId = null;
  familyRows.forEach(r => {
    const row = ws2.addRow(r);
    // Alternate family group colors
    if (r.familyId && r.familyId !== prevFamilyId && r.familyId !== '') {
      prevFamilyId = r.familyId;
    }
    if (r.familyGroup === 'Individual') {
      row.getCell('familyGroup').font = { italic: true, color: { argb: 'FF888888' } };
    }
    if (r.inCRM === 'NO') {
      row.getCell('inCRM').font = { bold: true, color: { argb: 'FFFF0000' } };
    }
  });
  ws2.autoFilter = 'A1:G1';

  // --- Sheet 3: Missing from CRM ---
  const ws3 = wb.addWorksheet('Missing from CRM');
  ws3.columns = [
    { header: '#', key: 'num', width: 5 },
    { header: 'Email', key: 'email', width: 35 },
    { header: 'Name (from GBM email)', key: 'name', width: 35 },
    { header: 'Action Needed', key: 'action', width: 30 }
  ];

  ws3.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  ws3.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD32F2F' } };

  missingFromCRM.forEach((m, i) => {
    ws3.addRow({ num: i + 1, email: m.email, name: m.name, action: 'Add to CRM' });
  });
  ws3.autoFilter = 'A1:D1';

  // --- Sheet 4: Summary ---
  const ws4 = wb.addWorksheet('Summary');
  ws4.columns = [
    { header: 'Metric', key: 'metric', width: 40 },
    { header: 'Value', key: 'value', width: 20 }
  ];
  ws4.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  ws4.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF333333' } };

  const summaryData = [
    { metric: 'Report Generated', value: new Date().toLocaleDateString() },
    { metric: 'GBM Email Recipients (unique)', value: allRecipients.size },
    { metric: 'CRM Contacts (from native Wix CRM)', value: crmContacts.length },
    { metric: 'GBM Recipients IN CRM', value: inCRM.length },
    { metric: 'GBM Recipients MISSING from CRM', value: missingFromCRM.length },
    { metric: 'Family Groups (2+ members)', value: familyId - 1 },
    { metric: 'Total People (GBM + CRM merged)', value: allPeople.size },
    { metric: 'GBM Email Subjects Searched', value: 'Invitation to Annual GBM 2026; GBM Link; Final Presentation Deck' },
    { metric: 'GBM Messages Found', value: allMsgIds.length },
  ];
  summaryData.forEach(d => ws4.addRow(d));

  // Save
  const outputPath = path.join(__dirname, 'BANF_GBM_CRM_Audit_Report.xlsx');
  await wb.xlsx.writeFile(outputPath);
  console.log(`✅ Excel saved: ${outputPath}\n`);

  // ── Step 8: Email to president ──
  console.log(`📧 Emailing report to ${PRESIDENT_EMAIL}...`);
  const subject = 'BANF GBM → CRM Audit Report — ' + new Date().toLocaleDateString();
  const plainText = [
    'BANF GBM → CRM Audit Report',
    '============================',
    '',
    `GBM Email Recipients: ${allRecipients.size}`,
    `CRM Contacts: ${crmContacts.length}`,
    `In CRM: ${inCRM.length}`,
    `Missing from CRM: ${missingFromCRM.length}`,
    `Family Groups: ${familyId - 1}`,
    '',
    'Please find the detailed Excel report attached.',
    '',
    '— BANF System'
  ].join('\n');

  const htmlBody = `<div style="font-family:'Segoe UI',Arial,sans-serif;max-width:620px;margin:0 auto">
  <div style="background:linear-gradient(135deg,#1565c0,#1976d2);color:#fff;padding:20px 24px;border-radius:10px 10px 0 0">
    <h2 style="margin:0;font-size:1.2rem">BANF GBM &rarr; CRM Audit Report</h2>
    <p style="margin:6px 0 0;opacity:.9;font-size:.85rem">${new Date().toLocaleDateString()}</p>
  </div>
  <div style="padding:20px 24px;border:1px solid #e0e0e0;border-top:none;border-radius:0 0 10px 10px">
    <table style="width:100%;border-collapse:collapse;margin:16px 0">
      <tr style="background:#f5f5f5"><td style="padding:10px 14px;border-bottom:1px solid #eee"><strong>GBM Email Recipients</strong></td><td style="padding:10px 14px;border-bottom:1px solid #eee;text-align:right;font-size:1.2rem;font-weight:700">${allRecipients.size}</td></tr>
      <tr><td style="padding:10px 14px;border-bottom:1px solid #eee"><strong>CRM Contacts</strong></td><td style="padding:10px 14px;border-bottom:1px solid #eee;text-align:right;font-size:1.2rem;font-weight:700">${crmContacts.length}</td></tr>
      <tr style="background:#e8f5e9"><td style="padding:10px 14px;border-bottom:1px solid #eee;color:#2e7d32"><strong>In CRM</strong></td><td style="padding:10px 14px;border-bottom:1px solid #eee;text-align:right;font-size:1.2rem;font-weight:700;color:#2e7d32">${inCRM.length}</td></tr>
      <tr style="background:#fff0f0"><td style="padding:10px 14px;border-bottom:1px solid #eee;color:#d32f2f"><strong>Missing from CRM</strong></td><td style="padding:10px 14px;border-bottom:1px solid #eee;text-align:right;font-size:1.2rem;font-weight:700;color:#d32f2f">${missingFromCRM.length}</td></tr>
      <tr><td style="padding:10px 14px;border-bottom:1px solid #eee"><strong>Family Groups</strong></td><td style="padding:10px 14px;border-bottom:1px solid #eee;text-align:right;font-size:1.2rem;font-weight:700">${familyId - 1}</td></tr>
    </table>
    <p>The attached Excel file contains 4 sheets:</p>
    <ol>
      <li><strong>Individual Emails</strong> — All ${allRecipients.size} GBM recipients with CRM cross-reference</li>
      <li><strong>Family Groups</strong> — Members grouped by family (last name matching)</li>
      <li><strong>Missing from CRM</strong> — ${missingFromCRM.length} emails that need to be added to the CRM</li>
      <li><strong>Summary</strong> — Overall audit statistics</li>
    </ol>
    <p style="color:#777;font-size:.82rem;margin-top:20px;border-top:1px solid #eee;padding-top:12px">Bengali Association of North Florida (BANF) | banfjax@gmail.com</p>
  </div>
</div>`;

  try {
    const result = await sendEmailWithAttachment(
      token, PRESIDENT_EMAIL, subject, htmlBody, plainText,
      outputPath, 'BANF_GBM_CRM_Audit_Report.xlsx'
    );
    console.log(`✅ Email sent! Message ID: ${result.id}\n`);
  } catch (e) {
    console.log(`❌ Email send failed: ${e.message}`);
    console.log('   The Excel file is saved locally at:', outputPath);
  }

  console.log('═══════════════════════════════════════════');
  console.log('  DONE');
  console.log('═══════════════════════════════════════════');
}

main().catch(e => { console.error('Fatal:', e.message); process.exit(1); });
