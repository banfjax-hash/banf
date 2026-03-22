#!/usr/bin/env node
// Generate BANF Membership Tiers Dashboard HTML
const fs = require('fs');
const households = require('./_membership_households.json');

// FY 2026-27 Tier Structure (EC Term: Feb 2026 - Mid Feb 2027)
// SIMPLE RULE: Any payment made after Feb 2026 = FY 2026-27
// Categories kept as-is from CRM payment records
const tierConfig = {
  'M2 Premium EB - Family': { color: '#7c3aed', bg: '#faf5ff', border: '#e9d5ff', badge: 'M2 PREMIUM', icon: 'P', desc: 'M2 Premium Early Bird - All 17 events | Family', rate: 375 },
  'M2 Premium - Couple': { color: '#6d28d9', bg: '#faf5ff', border: '#e9d5ff', badge: 'M2 PREMIUM', icon: 'P', desc: 'M2 Premium - All 17 events | Couple', rate: 330 },
  'EB - Family': { color: '#1d4ed8', bg: '#eff6ff', border: '#bfdbfe', badge: 'EARLY BIRD', icon: 'F', desc: 'Early Bird - Family Membership | FY 2026-27', rate: 340 },
  'EB - Couple': { color: '#0891b2', bg: '#ecfeff', border: '#a5f3fc', badge: 'EARLY BIRD', icon: 'C', desc: 'Early Bird - Couple Membership | FY 2026-27', rate: 230 },
  'EB - Individual': { color: '#059669', bg: '#f0fdf4', border: '#bbf7d0', badge: 'EARLY BIRD', icon: 'I', desc: 'Early Bird - Individual Membership | FY 2026-27', rate: 190 },
  'Reg - Family': { color: '#d97706', bg: '#fffbeb', border: '#fde68a', badge: 'REGULAR', icon: 'F', desc: 'Regular - Family Membership | FY 2026-27', rate: 280 },
  'Reg - Couple': { color: '#ea580c', bg: '#fff7ed', border: '#fed7aa', badge: 'REGULAR', icon: 'C', desc: 'Regular - Couple Membership | FY 2026-27', rate: 255 },
};

const tierOrder = [
  'M2 Premium EB - Family',
  'M2 Premium - Couple',
  'EB - Family',
  'EB - Couple',
  'EB - Individual',
  'Reg - Family',
  'Reg - Couple',
];

const byTier = {};
households.forEach(h => {
  if (!byTier[h.category]) byTier[h.category] = [];
  byTier[h.category].push(h);
});

const totalRev = households.reduce((a, h) => a + h.amount, 0);
const stats = {
  total: households.length,
  revenue: totalRev,
  ebCount: households.filter(h => h.category && h.category.startsWith('EB')).length,
  m2Count: households.filter(h => h.category && h.category.includes('M2')).length,
  tierCount: Object.keys(byTier).length,
  avg: Math.round(totalRev / households.length)
};

function escId(t) { return t.replace(/[^a-z0-9]/gi, '_'); }

function buildTierRows(hs) {
  return hs.map((h, idx) => {
    const isSantanu = h.primaryEmail === 'tosantanu@gmail.com';
    const rowBg = isSantanu ? 'background:#fef9c3;' : (idx % 2 === 0 ? 'background:#fff;' : 'background:#f8fafc;');
    const familyLabel = h.familyDisplayName || h.familyId || '';
    const memberNames = (h.members || []).map(m =>
      '<span style="font-size:10px;color:#64748b;margin-right:4px">' + m.name + (m.isEC ? ' <b style="color:#7c3aed">[EC]</b>' : '') + '</span>'
    ).join('');
    const ackBadge = isSantanu ? ' <span style="background:#fbbf24;color:#78350f;padding:1px 6px;border-radius:4px;font-size:10px;font-weight:700">RECENTLY ACK\'D</span>' : '';
    return '<tr style="' + rowBg + 'border-bottom:1px solid #f1f5f9"' + (isSantanu ? ' id="santanu-row"' : '') + '>'
      + '<td style="padding:10px 16px;font-size:12px;color:#94a3b8">' + (idx + 1) + '</td>'
      + '<td style="padding:10px 16px"><div style="font-size:14px;font-weight:600;color:#1e293b">' + h.primaryName + ackBadge + '</div>'
      + (memberNames ? '<div style="margin-top:3px">' + memberNames + '</div>' : '') + '</td>'
      + '<td style="padding:10px 16px;font-size:13px"><a href="mailto:' + h.primaryEmail + '" style="color:#1d4ed8;text-decoration:none">' + h.primaryEmail + '</a></td>'
      + '<td style="padding:10px 16px;font-size:12px;color:#64748b"><div>' + familyLabel + '</div><div style="font-family:monospace;font-size:10px;color:#94a3b8">' + (h.memberId || '') + '</div></td>'
      + '<td style="padding:10px 16px;font-size:14px;font-weight:700;color:#166534;text-align:right">$' + h.amount + '</td>'
      + '<td style="padding:10px 16px;font-size:12px;color:#475569">' + h.year + '</td>'
      + '<td style="padding:10px 16px;font-size:12px;color:#475569">' + (h.city || 'Jacksonville') + ', ' + (h.state || 'FL') + '</td>'
      + '</tr>';
  }).join('');
}

function buildTierSections() {
  return tierOrder.map(tierName => {
    const hs = byTier[tierName] || [];
    if (!hs.length) return '';
    const cfg = tierConfig[tierName] || { color: '#475569', bg: '#f8fafc', border: '#e2e8f0', badge: '', icon: 'M', desc: tierName };
    const revenue = hs.reduce((a, h) => a + h.amount, 0);
    const tid = escId(tierName);
    return '<div class="tier-card" style="border:1px solid ' + cfg.border + ';border-radius:10px;margin-bottom:28px;overflow:hidden;background:#fff;box-shadow:0 1px 4px rgba(0,0,0,0.06)">'
      + '<div class="tier-header" style="background:' + cfg.bg + ';border-bottom:1px solid ' + cfg.border + ';padding:16px 24px;display:flex;align-items:center;gap:12px;cursor:pointer" onclick="toggleTier(\'' + tid + '\')">'
      + '<div style="width:40px;height:40px;border-radius:50%;background:' + cfg.color + ';color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:16px;flex-shrink:0">' + cfg.icon + '</div>'
      + '<div style="flex:1"><div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">'
      + '<h3 style="margin:0;color:' + cfg.color + ';font-size:16px;font-weight:700">' + tierName + '</h3>'
      + '<span style="background:' + cfg.color + ';color:#fff;padding:2px 8px;border-radius:4px;font-size:10px;font-weight:700;letter-spacing:0.5px">' + cfg.badge + '</span>'
      + '</div><p style="margin:4px 0 0;color:#64748b;font-size:12px">' + cfg.desc + '</p></div>'
      + '<div style="text-align:right;flex-shrink:0">'
      + '<div style="font-size:20px;font-weight:700;color:' + cfg.color + '">' + hs.length + '</div>'
      + '<div style="font-size:11px;color:#64748b">households</div>'
      + '<div style="font-size:13px;font-weight:600;color:#166534;margin-top:2px">$' + revenue.toLocaleString() + '</div>'
      + '</div>'
      + '<span style="color:#94a3b8;font-size:18px;margin-left:8px" id="arrow-' + tid + '">&#9660;</span>'
      + '</div>'
      + '<div id="tier-' + tid + '">'
      + '<table style="width:100%;border-collapse:collapse">'
      + '<thead><tr style="background:#f8fafc">'
      + '<th style="padding:10px 16px;text-align:left;font-size:11px;color:#64748b;font-weight:600;border-bottom:1px solid #e2e8f0">#</th>'
      + '<th style="padding:10px 16px;text-align:left;font-size:11px;color:#64748b;font-weight:600;border-bottom:1px solid #e2e8f0">NAME / HOUSEHOLD</th>'
      + '<th style="padding:10px 16px;text-align:left;font-size:11px;color:#64748b;font-weight:600;border-bottom:1px solid #e2e8f0">EMAIL (PRIMARY)</th>'
      + '<th style="padding:10px 16px;text-align:left;font-size:11px;color:#64748b;font-weight:600;border-bottom:1px solid #e2e8f0">FAMILY / CRM ID</th>'
      + '<th style="padding:10px 16px;text-align:right;font-size:11px;color:#64748b;font-weight:600;border-bottom:1px solid #e2e8f0">AMOUNT</th>'
      + '<th style="padding:10px 16px;text-align:left;font-size:11px;color:#64748b;font-weight:600;border-bottom:1px solid #e2e8f0">YEAR</th>'
      + '<th style="padding:10px 16px;text-align:left;font-size:11px;color:#64748b;font-weight:600;border-bottom:1px solid #e2e8f0">LOCATION</th>'
      + '</tr></thead>'
      + '<tbody>' + buildTierRows(hs) + '</tbody>'
      + '</table></div></div>';
  }).join('');
}

function buildSummaryRows() {
  return tierOrder.filter(t => byTier[t] && byTier[t].length).map((t, i) => {
    const hs = byTier[t];
    const rev = hs.reduce((a, h) => a + h.amount, 0);
    const pct = Math.round(rev * 100 / stats.revenue);
    const cfg = tierConfig[t] || { color: '#475569' };
    const rowBg = i % 2 === 0 ? '#fff' : '#f8fafc';
    return '<tr style="border-bottom:1px solid #f1f5f9;background:' + rowBg + '">'
      + '<td style="padding:10px 12px;font-weight:600;color:' + cfg.color + '">' + t + '</td>'
      + '<td style="padding:10px 12px;text-align:center;color:#334155">' + hs.length + '</td>'
      + '<td style="padding:10px 12px;text-align:right;font-weight:600;color:#166534">$' + rev.toLocaleString() + '</td>'
      + '<td style="padding:10px 12px;text-align:right;color:#475569">$' + Math.round(rev / hs.length) + '</td>'
      + '<td style="padding:10px 12px"><div style="display:flex;align-items:center;gap:8px">'
      + '<div style="height:8px;width:' + Math.min(pct * 2, 120) + 'px;background:' + cfg.color + ';border-radius:4px"></div>'
      + '<span style="color:#64748b">' + pct + '%</span></div></td>'
      + '</tr>';
  }).join('');
}

const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>BANF Membership Tiers Dashboard - FY 2026-27</title>
<style>
  * { box-sizing: border-box; }
  body { margin: 0; padding: 0; background: #f1f5f9; font-family: Arial, Helvetica, sans-serif; }
  .container { max-width: 1100px; margin: 0 auto; padding: 24px 16px; }
  .header { background: linear-gradient(135deg, #b91c1c, #7f1d1d); color: #fff; padding: 28px 32px; border-radius: 10px; margin-bottom: 24px; }
  .header h1 { margin: 0; font-size: 24px; }
  .header p { margin: 6px 0 0; opacity: 0.75; font-size: 13px; }
  .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 14px; margin-bottom: 24px; }
  .stat-card { background: #fff; border-radius: 8px; padding: 16px 20px; border: 1px solid #e2e8f0; box-shadow: 0 1px 3px rgba(0,0,0,0.04); }
  .stat-label { font-size: 11px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px; }
  .stat-value { font-size: 28px; font-weight: 700; }
  .filter-bar { background: #fff; border-radius: 8px; padding: 12px 20px; margin-bottom: 20px; border: 1px solid #e2e8f0; display: flex; gap: 12px; align-items: center; flex-wrap: wrap; }
  .filter-bar input { flex: 1; min-width: 200px; padding: 8px 12px; border: 1px solid #e2e8f0; border-radius: 6px; font-size: 14px; outline: none; }
  .filter-bar input:focus { border-color: #b91c1c; }
  .legend { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 20px; }
  .legend-item { display: flex; align-items: center; gap: 6px; font-size: 12px; color: #475569; background: #fff; border: 1px solid #e2e8f0; padding: 4px 10px; border-radius: 20px; }
  .legend-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
  .timestamp { font-size: 11px; color: #94a3b8; text-align: right; margin-top: 16px; }
  #santanu-row { outline: 2px solid #f59e0b; }
  @media (max-width: 700px) { .header h1 { font-size: 18px; } .stat-value { font-size: 22px; } }
</style>
</head>
<body>
<div class="container">

  <div class="header">
    <h1>BANF Membership Tiers Dashboard - FY 2026-27</h1>
    <p>Bengali Association of NE Florida &mdash; EC Term: Feb 2026 - Mid Feb 2027 &mdash; CRM-linked data</p>
    <div style="margin-top:12px;font-size:12px;background:rgba(255,255,255,0.15);padding:10px 14px;border-radius:6px;display:inline-block">
      <strong>Latest Acknowledgement Sent:</strong> Santanu Bhattacharya (tosantanu@gmail.com) &mdash; EB-Family $340, FY 2026-27
    </div>
  </div>

  <div class="stats-grid">
    <div class="stat-card">
      <div class="stat-label">Total Households</div>
      <div class="stat-value" style="color:#1d4ed8">${stats.total}</div>
      <div style="font-size:12px;color:#64748b;margin-top:4px">Active membership units</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Total Revenue</div>
      <div class="stat-value" style="color:#166534">$${stats.revenue.toLocaleString()}</div>
      <div style="font-size:12px;color:#64748b;margin-top:4px">FY 2026-27 (at current tier rates)</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Early Bird (EB)</div>
      <div class="stat-value" style="color:#7c3aed">${stats.ebCount}</div>
      <div style="font-size:12px;color:#64748b;margin-top:4px">Early Bird tier members</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">M2 Premium</div>
      <div class="stat-value" style="color:#b91c1c">${stats.m2Count}</div>
      <div style="font-size:12px;color:#64748b;margin-top:4px">M2 Premium members</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Tiers Active</div>
      <div class="stat-value" style="color:#475569">${stats.tierCount}</div>
      <div style="font-size:12px;color:#64748b;margin-top:4px">Membership categories</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Avg / Household</div>
      <div class="stat-value" style="color:#0891b2">$${stats.avg}</div>
      <div style="font-size:12px;color:#64748b;margin-top:4px">Average payment</div>
    </div>
  </div>

  <div class="filter-bar">
    <input type="text" id="searchInput" placeholder="Search by name, email, family ID, member ID..." oninput="filterTable()">
    <span style="font-size:12px;color:#94a3b8;white-space:nowrap">${stats.total} households &middot; ${stats.tierCount} tiers</span>
    <button onclick="expandAll()" style="padding:6px 14px;background:#f1f5f9;border:1px solid #e2e8f0;border-radius:6px;font-size:12px;cursor:pointer">Expand All</button>
    <button onclick="collapseAll()" style="padding:6px 14px;background:#f1f5f9;border:1px solid #e2e8f0;border-radius:6px;font-size:12px;cursor:pointer">Collapse All</button>
  </div>

  <div class="legend">
    <div class="legend-item"><div class="legend-dot" style="background:#7c3aed"></div>M2 Premium</div>
    <div class="legend-item"><div class="legend-dot" style="background:#1d4ed8"></div>EB Family</div>
    <div class="legend-item"><div class="legend-dot" style="background:#0891b2"></div>EB Couple</div>
    <div class="legend-item"><div class="legend-dot" style="background:#059669"></div>EB Individual</div>
    <div class="legend-item"><div class="legend-dot" style="background:#d97706"></div>Reg Family</div>
    <div class="legend-item"><div class="legend-dot" style="background:#ea580c"></div>Reg Couple</div>
    <div class="legend-item" style="background:#fef9c3;border-color:#fbbf24"><div class="legend-dot" style="background:#f59e0b"></div>Recently Acknowledged</div>
    <div class="legend-item"><b style="color:#7c3aed">[EC]</b>&nbsp;Executive Committee</div>
  </div>

  ${buildTierSections()}

  <div style="background:#fff;border-radius:10px;padding:20px 24px;margin-top:8px;border:1px solid #e2e8f0">
    <h3 style="margin:0 0 16px;color:#1e293b;font-size:16px">FY 2026-27 Tier Summary &mdash; Revenue Breakdown (EC Term: Feb 2026 - Mid Feb 2027)</h3>
    <table style="width:100%;border-collapse:collapse;font-size:13px">
      <thead>
        <tr style="background:#f8fafc;border-bottom:2px solid #e2e8f0">
          <th style="padding:10px 12px;text-align:left;color:#64748b">Tier / Category</th>
          <th style="padding:10px 12px;text-align:center;color:#64748b">Households</th>
          <th style="padding:10px 12px;text-align:right;color:#64748b">Revenue</th>
          <th style="padding:10px 12px;text-align:right;color:#64748b">Avg/Unit</th>
          <th style="padding:10px 12px;text-align:left;color:#64748b">Share</th>
        </tr>
      </thead>
      <tbody>
        ${buildSummaryRows()}
        <tr style="background:#f0fdf4;border-top:2px solid #bbf7d0;font-weight:700">
          <td style="padding:10px 12px;color:#166534">TOTAL</td>
          <td style="padding:10px 12px;text-align:center;color:#166534">${stats.total}</td>
          <td style="padding:10px 12px;text-align:right;color:#166534">$${stats.revenue.toLocaleString()}</td>
          <td style="padding:10px 12px;text-align:right;color:#166534">$${stats.avg}</td>
          <td style="padding:10px 12px;color:#166534">100%</td>
        </tr>
      </tbody>
    </table>
  </div>

  <div class="timestamp">
    Generated: ${new Date().toLocaleString()} &nbsp;|&nbsp;
    Source: BANF CRM Master &amp; Universe &nbsp;|&nbsp;
    Member Portal: <a href="https://www.jaxbengali.org/member-portal.html" style="color:#64748b">jaxbengali.org/member-portal.html</a>
  </div>
</div>

<script>
function toggleTier(id) {
  const el = document.getElementById('tier-' + id);
  const arrow = document.getElementById('arrow-' + id);
  if (!el) return;
  const open = el.style.display !== 'none';
  el.style.display = open ? 'none' : 'block';
  if (arrow) arrow.innerHTML = open ? '&#9654;' : '&#9660;';
}

function expandAll() {
  document.querySelectorAll('[id^="tier-"]').forEach(el => { el.style.display = 'block'; });
  document.querySelectorAll('[id^="arrow-"]').forEach(el => { el.innerHTML = '&#9660;'; });
}

function collapseAll() {
  document.querySelectorAll('[id^="tier-"]').forEach(el => { el.style.display = 'none'; });
  document.querySelectorAll('[id^="arrow-"]').forEach(el => { el.innerHTML = '&#9654;'; });
}

function filterTable() {
  const q = document.getElementById('searchInput').value.toLowerCase();
  if (!q) { expandAll(); return; }
  expandAll();
  document.querySelectorAll('tbody tr').forEach(row => {
    row.style.display = row.textContent.toLowerCase().includes(q) ? '' : 'none';
  });
}

// Scroll to Santanu row on load
setTimeout(() => {
  const el = document.getElementById('santanu-row');
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
}, 600);
</script>
</body>
</html>`;

fs.writeFileSync('BANF_MEMBERSHIP_TIERS_DASHBOARD.html', html);
console.log('Dashboard written:', html.length, 'chars');
console.log('Stats:', JSON.stringify(stats, null, 2));
