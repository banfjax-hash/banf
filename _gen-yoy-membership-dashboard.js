/**
 * BANF Master Year-on-Year Membership Dashboard Generator
 * Generates a comprehensive multi-year membership dashboard
 * with per-year original categories, household grouping, and CRM links.
 */
const fs = require('fs');

// Load data
const crm = JSON.parse(fs.readFileSync('banf-crm-master.json', 'utf8'));
const membersByYear = JSON.parse(fs.readFileSync('_yoy_members_by_year.json', 'utf8'));

// ---- EC Term to Membership Year mapping ----
// Each EC term = 2 consecutive membership years with same fee structure
// Membership year starts after Saraswati Puja (late Jan / early Feb)
const EC_TERMS = {
  '20-22': { label: 'EC 2020-22', years: ['2021-22', '2022-23'] },
  '22-24': { label: 'EC 2022-24', years: ['2023-24', '2024-25'] },
  '24-26': { label: 'EC 2024-26', years: ['2025-26', '2026-27'] },
};
function getECTerm(membershipYear) {
  for (const [key, term] of Object.entries(EC_TERMS)) {
    if (term.years.includes(membershipYear)) return term.label;
  }
  return '';
}

// ---- Build payment data per year (household level) ----
const paymentsByYear = {};
(crm.members || []).forEach(m => {
  (m.paymentRecords || []).forEach(p => {
    // Keep year as-is from CRM — no remapping
    const year = p.year;
    if (!paymentsByYear[year]) paymentsByYear[year] = {};
    const fid = m.familyId || m.email;
    if (!paymentsByYear[year][fid]) {
      paymentsByYear[year][fid] = {
        familyId: fid,
        familyDisplayName: m.familyDisplayName || m.displayName,
        members: [],
        payments: [],
        totalAmount: 0,
        categories: new Set(),
        isEC: false,
        city: m.city,
        state: m.state,
        notes: []
      };
    }
    const hh = paymentsByYear[year][fid];
    if (!hh.members.find(x => x.email === m.email)) {
      hh.members.push({ name: m.displayName, email: m.email, phone: m.phone });
    }
    hh.payments.push({ category: p.category, amount: p.amount, source: p.source, rawName: p.rawName });
    hh.totalAmount += p.amount;
    hh.categories.add(p.category);
    if (m.isECMember) hh.isEC = true;
  });
});

// Convert Sets to arrays
Object.keys(paymentsByYear).forEach(y => {
  Object.values(paymentsByYear[y]).forEach(hh => {
    hh.categories = [...hh.categories];
  });
});

// ---- Apply corrections ----
// Santanu: Zelle payment for 2026-27 confirmed
const y2627 = paymentsByYear['2026-27'] || {};
if (y2627['RFAM-088']) {
  y2627['RFAM-088'].notes.push('Zelle payment for FY 2026-27 confirmed by user');
  y2627['RFAM-088'].familyDisplayName = 'Santanu & Sanchari Bhattacharya';
  if (!y2627['RFAM-088'].members.find(m => m.email === 'tosanchari@gmail.com')) {
    y2627['RFAM-088'].members.push({ name: 'Sanchari Bhattacharyya', email: 'tosanchari@gmail.com', phone: '' });
  }
}

// Sharmistha Poddar / Suvankar Paul — XLSX payment for 2025-26
const y2526 = paymentsByYear['2025-26'] || {};
if (y2526['RFAM-006']) {
  y2526['RFAM-006'].notes.push('Sharmistha Poddar = spouse of Suvankar Paul (maiden name Poddar, listed as "Sharmistha Paul" in evite)');
}
if (y2526['RFAM-074']) {
  y2526['RFAM-074'].notes.push('Spouse: Sharmistha Poddar (sharmi.p09@gmail.com) — see RFAM-006');
  if (!y2526['RFAM-074'].members.find(m => m.email === 'sharmi.p09@gmail.com')) {
    y2526['RFAM-074'].members.push({ name: 'Sharmistha Poddar (Paul)', email: 'sharmi.p09@gmail.com', phone: '' });
  }
}

// Prabir Mandal — check payment, unknown year
if (y2526['RFAM-026']) {
  y2526['RFAM-026'].notes.push('User reported Anita/Prabir Mandal paid by check — no digital record found. Current payments: $300 EB-Couple + $100 Reg-Couple');
}
if (y2526['RFAM-023']) {
  y2526['RFAM-023'].notes.push('Prabir Mandal — no payment record found in CRM. User reports check payment.');
} else if (!y2627['RFAM-023']) {
  // Add Prabir as a note-only household under 2025-26 (pending verification)
  if (!paymentsByYear['2025-26']) paymentsByYear['2025-26'] = {};
  paymentsByYear['2025-26']['RFAM-023'] = {
    familyId: 'RFAM-023',
    familyDisplayName: 'Prabir Mandal',
    members: [{ name: 'Prabir Mandal', email: 'prabirmandal@yahoo.com', phone: '' }],
    payments: [],
    totalAmount: 0,
    categories: [],
    isEC: false,
    city: 'Jacksonville',
    state: 'FL',
    notes: ['User reports check payment — year unconfirmed. Needs manual verification.']
  };
}

// ---- No year remapping needed — CRM data has correct years ----

// ---- Build yearly summary stats ----
function getYearStats(year) {
  const hhs = paymentsByYear[year] ? Object.values(paymentsByYear[year]) : [];
  const members = membersByYear[year] || [];
  const totalRev = hhs.reduce((a, h) => a + h.totalAmount, 0);
  const cats = {};
  hhs.forEach(h => h.payments.forEach(p => {
    if (!cats[p.category]) cats[p.category] = { count: 0, total: 0 };
    cats[p.category].count++;
    cats[p.category].total += p.amount;
  }));
  return {
    year,
    householdCount: hhs.filter(h => h.totalAmount > 0).length,
    memberCount: members.length,
    totalRevenue: totalRev,
    categories: cats,
    hasPaymentData: hhs.length > 0
  };
}

// ---- Years to display ----
const allYears = ['2022-23', '2023-24', '2024-25', '2025-26', '2026-27'];
const yearStats = allYears.map(getYearStats);

// ---- Color scheme per year ----
const yearColors = {
  '2022-23': { primary: '#6B7280', bg: '#F9FAFB', border: '#D1D5DB', badge: '#E5E7EB' },
  '2023-24': { primary: '#8B5CF6', bg: '#F5F3FF', border: '#C4B5FD', badge: '#EDE9FE' },
  '2024-25': { primary: '#0EA5E9', bg: '#F0F9FF', border: '#7DD3FC', badge: '#E0F2FE' },
  '2025-26': { primary: '#F59E0B', bg: '#FFFBEB', border: '#FCD34D', badge: '#FEF3C7' },
  '2026-27': { primary: '#059669', bg: '#ECFDF5', border: '#6EE7B7', badge: '#D1FAE5' }
};

// ---- Category color map ----
const catColors = [
  '#059669', '#0EA5E9', '#8B5CF6', '#F59E0B', '#EF4444', '#EC4899', '#6366F1',
  '#14B8A6', '#84CC16', '#F97316', '#06B6D4', '#A855F7'
];
function getCatColor(idx) { return catColors[idx % catColors.length]; }

// ---- Generate HTML ----
function esc(s) { return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
function fmt$(n) { return '$' + Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }

let html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>BANF Master Membership Dashboard - Year on Year</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Segoe UI', system-ui, -apple-system, sans-serif; background: #f0f2f5; color: #1a1a2e; line-height: 1.5; }
  .container { max-width: 1400px; margin: 0 auto; padding: 20px; }
  
  /* Header */
  .header { background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%); color: white; padding: 40px 30px; border-radius: 16px; margin-bottom: 30px; text-align: center; }
  .header h1 { font-size: 2.2em; margin-bottom: 8px; font-weight: 700; }
  .header .subtitle { font-size: 1.1em; opacity: 0.85; }
  .header .gen-date { font-size: 0.85em; opacity: 0.6; margin-top: 10px; }
  
  /* Global Search */
  .search-bar { background: white; padding: 16px 24px; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.06); margin-bottom: 24px; display: flex; gap: 12px; align-items: center; }
  .search-bar input { flex: 1; padding: 10px 16px; border: 2px solid #e2e8f0; border-radius: 8px; font-size: 15px; outline: none; transition: border-color 0.2s; }
  .search-bar input:focus { border-color: #059669; }
  .search-bar .search-label { font-weight: 600; color: #374151; white-space: nowrap; }
  
  /* Summary Grid */
  .summary-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 16px; margin-bottom: 30px; }
  .summary-card { background: white; border-radius: 12px; padding: 24px; box-shadow: 0 2px 8px rgba(0,0,0,0.06); border-left: 4px solid; transition: transform 0.15s; cursor: pointer; }
  .summary-card:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
  .summary-card h3 { font-size: 1.4em; margin-bottom: 4px; }
  .summary-card .label { font-size: 0.85em; color: #6B7280; text-transform: uppercase; letter-spacing: 0.5px; }
  .summary-card .big-number { font-size: 2em; font-weight: 700; margin: 8px 0; }
  .summary-card .meta { font-size: 0.85em; color: #6B7280; }
  .summary-card .tag { display: inline-block; padding: 2px 8px; border-radius: 12px; font-size: 0.75em; font-weight: 600; margin-left: 6px; }
  .current-tag { background: #D1FAE5; color: #059669; }
  
  /* Year Section */
  .year-section { background: white; border-radius: 16px; margin-bottom: 24px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.06); }
  .year-header { padding: 20px 24px; cursor: pointer; display: flex; justify-content: space-between; align-items: center; border-left: 5px solid; transition: background 0.15s; }
  .year-header:hover { filter: brightness(0.97); }
  .year-header h2 { font-size: 1.5em; display: flex; align-items: center; gap: 10px; }
  .year-header .arrow { font-size: 1.2em; transition: transform 0.3s; }
  .year-header .arrow.open { transform: rotate(180deg); }
  .year-header .stats { display: flex; gap: 20px; font-size: 0.9em; }
  .year-header .stat { display: flex; flex-direction: column; align-items: center; }
  .year-header .stat-val { font-weight: 700; font-size: 1.3em; }
  .year-header .stat-lbl { font-size: 0.8em; color: #6B7280; }
  
  .year-body { display: none; padding: 0 24px 24px; }
  .year-body.open { display: block; }
  
  /* Category breakdown */
  .cat-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px; margin-bottom: 20px; }
  .cat-card { padding: 14px 16px; border-radius: 10px; border: 1px solid #e2e8f0; }
  .cat-card .cat-name { font-weight: 600; font-size: 0.95em; margin-bottom: 4px; }
  .cat-card .cat-stats { font-size: 0.85em; color: #6B7280; }
  .cat-card .cat-amount { font-weight: 700; font-size: 1.1em; }
  
  /* Revenue bar */
  .rev-bar-container { margin: 16px 0; }
  .rev-bar { height: 24px; border-radius: 12px; display: flex; overflow: hidden; }
  .rev-segment { height: 100%; transition: width 0.3s; position: relative; }
  .rev-segment:hover::after { content: attr(data-label); position: absolute; top: -30px; left: 50%; transform: translateX(-50%); background: #1a1a2e; color: white; padding: 2px 8px; border-radius: 4px; font-size: 0.75em; white-space: nowrap; z-index: 10; }
  
  /* Household table */
  .hh-table { width: 100%; border-collapse: collapse; font-size: 0.9em; }
  .hh-table th { background: #f8fafc; padding: 10px 12px; text-align: left; font-weight: 600; border-bottom: 2px solid #e2e8f0; position: sticky; top: 0; }
  .hh-table td { padding: 10px 12px; border-bottom: 1px solid #f1f5f9; vertical-align: top; }
  .hh-table tr:hover td { background: #f0fdf4; }
  .hh-table tr.highlight td { background: #fef3c7; }
  .member-list { list-style: none; padding: 0; }
  .member-list li { padding: 2px 0; }
  .member-list .email { color: #6B7280; font-size: 0.85em; }
  .badge { display: inline-block; padding: 2px 8px; border-radius: 10px; font-size: 0.75em; font-weight: 600; margin-left: 4px; }
  .badge-ec { background: #FEF3C7; color: #92400E; }
  .badge-ack { background: #D1FAE5; color: #065F46; }
  .badge-note { background: #FEE2E2; color: #991B1B; }
  .badge-check { background: #DBEAFE; color: #1E40AF; }
  .note-text { font-size: 0.8em; color: #DC2626; font-style: italic; margin-top: 4px; }
  
  /* Member-only table (historical years) */
  .member-table { width: 100%; border-collapse: collapse; font-size: 0.9em; }
  .member-table th { background: #f8fafc; padding: 8px 12px; text-align: left; font-weight: 600; border-bottom: 2px solid #e2e8f0; }
  .member-table td { padding: 8px 12px; border-bottom: 1px solid #f1f5f9; }
  .member-table tr:hover td { background: #f0fdf4; }
  
  /* Investigation Panel */
  .investigation-panel { background: #FFFBEB; border: 2px solid #FCD34D; border-radius: 12px; padding: 20px 24px; margin-bottom: 24px; }
  .investigation-panel h3 { color: #92400E; margin-bottom: 12px; display: flex; align-items: center; gap: 8px; }
  .investigation-item { padding: 10px 0; border-bottom: 1px solid #FDE68A; }
  .investigation-item:last-child { border-bottom: none; }
  .investigation-item .status { font-weight: 600; }
  .status-resolved { color: #059669; }
  .status-pending { color: #DC2626; }
  .status-info { color: #0EA5E9; }
  
  /* Footer */
  .footer { text-align: center; padding: 20px; color: #9CA3AF; font-size: 0.85em; }
  
  @media (max-width: 768px) {
    .summary-grid { grid-template-columns: 1fr 1fr; }
    .year-header { flex-direction: column; gap: 12px; }
    .year-header .stats { flex-wrap: wrap; }
    .cat-grid { grid-template-columns: 1fr 1fr; }
    .hh-table { font-size: 0.8em; }
    .hh-table th, .hh-table td { padding: 6px 8px; }
  }
</style>
</head>
<body>
<div class="container">

<!-- Header -->
<div class="header">
  <h1>BANF Membership Dashboard</h1>
  <div class="subtitle">Year-on-Year Master View &bull; All Membership Terms</div>
  <div class="gen-date">Generated: ${new Date().toLocaleString('en-US', { dateStyle: 'long', timeStyle: 'short' })} &bull; Source: CRM Master Database</div>
</div>

<!-- Global Search -->
<div class="search-bar">
  <span class="search-label">&#128269; Search All Years:</span>
  <input type="text" id="globalSearch" placeholder="Search by name, email, family ID, category..." oninput="filterAll(this.value)">
</div>

<!-- Summary Cards -->
<div class="summary-grid">`;

// Summary cards for each year (reverse order - current first)
[...yearStats].reverse().forEach(s => {
  const c = yearColors[s.year] || yearColors['2022-23'];
  const isCurrent = s.year === '2026-27';
  const ecTerm = getECTerm(s.year);
  html += `
  <div class="summary-card" style="border-left-color:${c.primary}" onclick="toggleYear('${s.year}')">
    <div class="label">Membership Year${ecTerm ? ' &bull; ' + ecTerm : ''}</div>
    <h3>${s.year}${isCurrent ? '<span class="tag current-tag">CURRENT</span>' : ''}</h3>
    <div class="big-number" style="color:${c.primary}">${s.hasPaymentData ? fmt$(s.totalRevenue) : s.memberCount + ' members'}</div>
    <div class="meta">${s.hasPaymentData ? s.householdCount + ' paying households &bull; ' + Object.keys(s.categories).length + ' tiers' : 'Member roster only (no payment data)'}</div>
  </div>`;
});

html += `</div>

<!-- Investigation Panel -->
<div class="investigation-panel">
  <h3>&#128270; Investigation Notes</h3>
  <div class="investigation-item">
    <span class="status status-resolved">&#10004; RESOLVED</span> &mdash; 
    <strong>Sharmistha Poddar / Suvankar Paul:</strong> Confirmed as Suvankar Paul's spouse (maiden name Poddar). 
    In evite listed as "Sharmistha Paul" (sharmi.p09@gmail.com). CRM has her under RFAM-006 with payment rawName "Surojit Da/ Sharmistha Di" from a different family context. 
    Linked to Suvankar's household RFAM-074 in this dashboard.
  </div>
  <div class="investigation-item">
    <span class="status status-resolved">&#10004; CONFIRMED</span> &mdash;
    <strong>Santanu Bhattacharya (FY 2026-27):</strong> Zelle payment for M2 Premium confirmed by user. 
    CRM shows XLSX payment ($340 EB-Family) for FY 2025-26 and Zelle payment ($375 M2 Premium) for FY 2026-27.
  </div>
  <div class="investigation-item">
    <span class="status status-pending">&#9888; UNVERIFIED</span> &mdash;
    <strong>Anita Mandal / Prabir Mandal (Check Payment):</strong> 
    User reported payment by check. No digital record found in Wells Fargo statements, Zelle, or CRM. 
    Anita (RFAM-026) has existing $300 EB-Couple + $100 Reg-Couple payments on record. 
    Prabir (RFAM-023) has no payment record. Year unconfirmed. Needs manual check deposit verification.
  </div>
  <div class="investigation-item">
    <span class="status status-info">&#9432; NOTE</span> &mdash;
    <strong>EC Term / Year Mapping:</strong> Years are grouped by EC term. 
    EC 22-24 covers FY 2022-23 &amp; 2023-24. EC 24-26 covers FY 2024-25 &amp; 2025-26. EC 26-28 covers FY 2026-27+.
    Fees remain the same within each EC term. Payment source: XLSX = 2025-26, Zelle = 2026-27.
  </div>
  <div class="investigation-item">
    <span class="status status-info">&#9432; NOTE</span> &mdash;
    <strong>Historical Years (2022-25):</strong> Only member roster data available (no detailed payment/tier breakdown). 
    Category terminology varies by year and is preserved as-is.
  </div>
</div>
`;

// ---- Year Sections (reverse chronological) ----
[...allYears].reverse().forEach((year, idx) => {
  const c = yearColors[year] || yearColors['2022-23'];
  const stats = yearStats.find(s => s.year === year);
  const isCurrent = year === '2026-27';
  const isOpen = isCurrent; // auto-open current year
  const households = paymentsByYear[year] ? Object.values(paymentsByYear[year]).sort((a, b) => b.totalAmount - a.totalAmount) : [];
  const members = membersByYear[year] || [];
  const ecTermLabel = getECTerm(year);

  html += `
<div class="year-section" id="section-${year}">
  <div class="year-header" style="background:${c.bg}; border-left-color:${c.primary}" onclick="toggleYear('${year}')">
    <h2 style="color:${c.primary}">
      FY ${year}${ecTermLabel ? ' <span style="font-size:0.6em;opacity:0.7">(' + ecTermLabel + ')</span>' : ''}${isCurrent ? ' <span class="tag current-tag">CURRENT</span>' : ''}
    </h2>
    <div class="stats">
      ${stats.hasPaymentData ? `
        <div class="stat"><span class="stat-val" style="color:${c.primary}">${stats.householdCount}</span><span class="stat-lbl">Households</span></div>
        <div class="stat"><span class="stat-val" style="color:${c.primary}">${fmt$(stats.totalRevenue)}</span><span class="stat-lbl">Revenue</span></div>
        <div class="stat"><span class="stat-val" style="color:${c.primary}">${Object.keys(stats.categories).length}</span><span class="stat-lbl">Tiers</span></div>
      ` : `
        <div class="stat"><span class="stat-val" style="color:${c.primary}">${stats.memberCount}</span><span class="stat-lbl">Members</span></div>
      `}
    </div>
    <span class="arrow ${isOpen ? 'open' : ''}" id="arrow-${year}">&#9660;</span>
  </div>
  <div class="year-body ${isOpen ? 'open' : ''}" id="body-${year}">`;

  if (stats.hasPaymentData && Object.keys(stats.categories).length > 0) {
    // Category breakdown cards
    const sortedCats = Object.entries(stats.categories).sort((a, b) => b[1].total - a[1].total);
    html += `<h3 style="margin: 16px 0 12px; color:${c.primary}">Membership Tiers / Categories</h3>
    <div class="cat-grid">`;
    sortedCats.forEach(([catName, catData], ci) => {
      const color = getCatColor(ci);
      html += `
      <div class="cat-card" style="border-left: 3px solid ${color}">
        <div class="cat-name" style="color:${color}">${esc(catName)}</div>
        <div class="cat-amount" style="color:${color}">${fmt$(catData.total)}</div>
        <div class="cat-stats">${catData.count} payment records</div>
      </div>`;
    });
    html += '</div>';

    // Revenue bar visualization
    if (stats.totalRevenue > 0) {
      html += `<div class="rev-bar-container"><div class="rev-bar">`;
      sortedCats.forEach(([catName, catData], ci) => {
        const pct = (catData.total / stats.totalRevenue * 100).toFixed(1);
        html += `<div class="rev-segment" style="width:${pct}%; background:${getCatColor(ci)}" data-label="${esc(catName)}: ${fmt$(catData.total)} (${pct}%)"></div>`;
      });
      html += '</div></div>';
    }

    // Household table
    html += `
    <h3 style="margin: 20px 0 12px; color:${c.primary}">Household Details (${households.length} households)</h3>
    <div style="overflow-x:auto">
    <table class="hh-table" id="table-${year}">
      <thead>
        <tr>
          <th>#</th>
          <th>Household / Family</th>
          <th>Members</th>
          <th>Category / Tier</th>
          <th>Amount</th>
          <th>Source</th>
          <th>Notes</th>
        </tr>
      </thead>
      <tbody>`;

    households.forEach((hh, i) => {
      const isHighlight = hh.notes && hh.notes.length > 0;
      const santanuHL = hh.familyId === 'RFAM-088';
      html += `
        <tr class="${isHighlight || santanuHL ? 'highlight' : ''}" data-search="${esc((hh.familyDisplayName + ' ' + hh.members.map(m => m.name + ' ' + m.email).join(' ') + ' ' + hh.categories.join(' ') + ' ' + hh.familyId).toLowerCase())}">
          <td>${i + 1}</td>
          <td>
            <strong>${esc(hh.familyDisplayName)}</strong>
            <div style="font-size:0.8em;color:#9CA3AF">${esc(hh.familyId)}</div>
            ${hh.isEC ? '<span class="badge badge-ec">EC</span>' : ''}
            ${santanuHL ? '<span class="badge badge-ack">ACK PENDING</span>' : ''}
          </td>
          <td>
            <ul class="member-list">
              ${hh.members.map(m => `<li>${esc(m.name)} <span class="email">${esc(m.email)}</span></li>`).join('')}
            </ul>
          </td>
          <td>${hh.categories.map(c => `<span style="display:inline-block;padding:2px 6px;border-radius:6px;background:${yearColors[year].badge};font-size:0.85em;margin:1px 0">${esc(c)}</span>`).join('<br>')}</td>
          <td style="font-weight:700;white-space:nowrap">${hh.totalAmount > 0 ? fmt$(hh.totalAmount) : '<span class="badge badge-check">CHECK?</span>'}</td>
          <td style="font-size:0.85em">${[...new Set(hh.payments.map(p => p.source))].join(', ') || '-'}</td>
          <td>${(hh.notes || []).map(n => `<div class="note-text">${esc(n)}</div>`).join('') || '-'}</td>
        </tr>`;
    });

    html += `</tbody></table></div>`;
  } else {
    // Historical year - member roster only
    html += `
    <div style="padding:12px 0;color:#6B7280;font-style:italic">
      No detailed payment/tier data available for this year. Showing member roster (${members.length} members).
    </div>
    <div style="overflow-x:auto">
    <table class="member-table" id="table-${year}">
      <thead>
        <tr>
          <th>#</th>
          <th>Name</th>
          <th>Email</th>
          <th>Family ID</th>
          <th>EC Member</th>
          <th>City</th>
        </tr>
      </thead>
      <tbody>`;

    members.sort((a, b) => (a.name || '').localeCompare(b.name || '')).forEach((m, i) => {
      html += `
        <tr data-search="${esc((m.name + ' ' + m.email + ' ' + m.familyId).toLowerCase())}">
          <td>${i + 1}</td>
          <td><strong>${esc(m.name)}</strong></td>
          <td style="color:#6B7280;font-size:0.9em">${esc(m.email)}</td>
          <td style="font-size:0.85em">${esc(m.familyId)}</td>
          <td>${m.isEC ? '<span class="badge badge-ec">EC</span>' : ''}</td>
          <td style="font-size:0.85em">${esc(m.city || '')}</td>
        </tr>`;
    });

    html += `</tbody></table></div>`;
  }

  html += `</div></div>`;
});

// ---- Comparison Chart (summary table) ----
html += `
<div class="year-section">
  <div class="year-header" style="background:#F8FAFC; border-left-color:#1a1a2e" onclick="toggleYear('comparison')">
    <h2 style="color:#1a1a2e">&#128202; Year-on-Year Comparison</h2>
    <span class="arrow" id="arrow-comparison">&#9660;</span>
  </div>
  <div class="year-body" id="body-comparison">
    <table class="hh-table" style="margin-top:12px">
      <thead>
        <tr>
          <th>Metric</th>
          ${allYears.map(y => `<th style="text-align:center;color:${(yearColors[y]||{}).primary||'#333'}">${y}<br><span style="font-size:0.7em;opacity:0.6">${getECTerm(y)}</span></th>`).join('')}
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><strong>Total Members</strong></td>
          ${allYears.map(y => {
            const s = yearStats.find(x => x.year === y);
            return `<td style="text-align:center;font-weight:700">${s.memberCount || '-'}</td>`;
          }).join('')}
        </tr>
        <tr>
          <td><strong>Paying Households</strong></td>
          ${allYears.map(y => {
            const s = yearStats.find(x => x.year === y);
            return `<td style="text-align:center;font-weight:700">${s.hasPaymentData ? s.householdCount : '-'}</td>`;
          }).join('')}
        </tr>
        <tr>
          <td><strong>Total Revenue</strong></td>
          ${allYears.map(y => {
            const s = yearStats.find(x => x.year === y);
            return `<td style="text-align:center;font-weight:700;color:${(yearColors[y]||{}).primary||'#333'}">${s.hasPaymentData ? fmt$(s.totalRevenue) : '-'}</td>`;
          }).join('')}
        </tr>
        <tr>
          <td><strong>Tiers / Categories</strong></td>
          ${allYears.map(y => {
            const s = yearStats.find(x => x.year === y);
            return `<td style="text-align:center">${s.hasPaymentData ? Object.keys(s.categories).length : '-'}</td>`;
          }).join('')}
        </tr>
      </tbody>
    </table>
    <div style="margin-top:12px;font-size:0.85em;color:#6B7280">
      EC Terms: EC 20-22 → FY 2021-22 &amp; 2022-23 | EC 22-24 → FY 2023-24 &amp; 2024-25 | EC 24-26 → FY 2025-26 &amp; 2026-27<br>
      FY 2025-26 data sourced from Membership XLSX. FY 2026-27 data from Zelle payments.<br>
      Historical years (2022-25) show member counts only &mdash; no payment/tier data available in CRM.
    </div>
  </div>
</div>
`;

// Footer & Script
html += `
<div class="footer">
  BANF Master Membership Dashboard &bull; Generated ${new Date().toISOString().split('T')[0]} &bull; 
  Data: banf-crm-master.json (${crm.members.length} members) &bull; 
  Linked to CRM Family IDs
</div>
</div>

<script>
function toggleYear(year) {
  const body = document.getElementById('body-' + year);
  const arrow = document.getElementById('arrow-' + year);
  if (body) { body.classList.toggle('open'); }
  if (arrow) { arrow.classList.toggle('open'); }
}

function filterAll(query) {
  const q = query.toLowerCase().trim();
  document.querySelectorAll('[data-search]').forEach(row => {
    if (!q) { row.style.display = ''; return; }
    row.style.display = row.getAttribute('data-search').includes(q) ? '' : 'none';
  });
  // Auto-open all year sections when searching
  if (q) {
    document.querySelectorAll('.year-body').forEach(b => b.classList.add('open'));
    document.querySelectorAll('.arrow').forEach(a => a.classList.add('open'));
  }
}
</script>
</body>
</html>`;

fs.writeFileSync('BANF_MEMBERSHIP_YOY_DASHBOARD.html', html);
console.log('Dashboard generated: BANF_MEMBERSHIP_YOY_DASHBOARD.html');
console.log('Size:', (html.length / 1024).toFixed(1), 'KB');
console.log('Years:', allYears.join(', '));
allYears.forEach(y => {
  const hhs = paymentsByYear[y] ? Object.values(paymentsByYear[y]).length : 0;
  const mems = (membersByYear[y] || []).length;
  console.log(`  ${y} (${getECTerm(y)}): ${hhs} households, ${mems} members`);
});
