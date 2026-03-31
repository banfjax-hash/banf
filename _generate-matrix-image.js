/**
 * Generate Event Matrix Image — BANF FY 2026-27
 * 
 * Renders a styled HTML table as a PNG image using Playwright.
 * Dates sourced from the official event_dates_26.jpg calendar.
 * 
 * Run: node _generate-matrix-image.js
 */
const { chromium } = require('playwright');
const path = require('path');

const OUTPUT_PATH = path.join(__dirname, 'docs', 'images', 'event_matrix_26.png');

const MATRIX_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<style>
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=Inter:wght@400;500;600;700&display=swap');
  
  * { margin: 0; padding: 0; box-sizing: border-box; }
  
  body {
    font-family: 'Inter', -apple-system, sans-serif;
    background: linear-gradient(135deg, #1a0a0a 0%, #2d0a0a 30%, #1a0a0a 100%);
    padding: 0;
    margin: 0;
    width: 1100px;
  }

  .container {
    background: linear-gradient(135deg, #8B1A1A 0%, #a52020 30%, #8B1A1A 60%, #6b1515 100%);
    border: 4px solid #C9A84C;
    border-radius: 16px;
    overflow: hidden;
    box-shadow: 0 0 40px rgba(201,168,76,0.3);
    margin: 20px;
  }

  .header {
    text-align: center;
    padding: 28px 24px 20px;
    background: linear-gradient(180deg, rgba(0,0,0,0.25) 0%, transparent 100%);
    border-bottom: 2px solid rgba(201,168,76,0.5);
  }

  .logo-text {
    font-family: 'Playfair Display', serif;
    font-size: 14px;
    color: #C9A84C;
    letter-spacing: 3px;
    text-transform: uppercase;
    margin-bottom: 4px;
  }

  .title {
    font-family: 'Playfair Display', serif;
    font-size: 28px;
    color: #fff;
    font-weight: 700;
    margin-bottom: 4px;
    text-shadow: 0 2px 8px rgba(0,0,0,0.3);
  }

  .subtitle {
    font-size: 13px;
    color: rgba(255,255,255,0.7);
    letter-spacing: 1px;
  }

  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 14px;
  }

  thead th {
    background: linear-gradient(180deg, #1a0a0a, #2d1010);
    color: #C9A84C;
    font-weight: 700;
    font-size: 13px;
    padding: 12px 10px;
    text-align: center;
    border-bottom: 2px solid #C9A84C;
    letter-spacing: 0.5px;
    text-transform: uppercase;
  }

  thead th:first-child {
    text-align: left;
    padding-left: 16px;
    width: 260px;
  }

  thead th:nth-child(2) {
    width: 100px;
  }

  thead th:nth-child(3) {
    width: 60px;
  }

  tbody td {
    padding: 10px 10px;
    text-align: center;
    border-bottom: 1px solid rgba(255,255,255,0.12);
    color: #fff;
    font-size: 13.5px;
  }

  tbody td:first-child {
    text-align: left;
    padding-left: 16px;
    font-weight: 500;
    color: #fff;
  }

  tbody td:nth-child(2) {
    font-weight: 600;
    color: #FFD700;
    font-size: 13px;
  }

  tbody td:nth-child(3) {
    font-size: 11px;
    color: rgba(255,255,255,0.6);
    font-weight: 500;
  }

  tbody tr:hover { background: rgba(255,255,255,0.04); }

  tbody tr:nth-child(even) { background: rgba(0,0,0,0.08); }

  .section-row td {
    background: linear-gradient(90deg, rgba(201,168,76,0.25), rgba(201,168,76,0.08)) !important;
    font-weight: 700 !important;
    font-size: 12px !important;
    color: #C9A84C !important;
    letter-spacing: 1.5px;
    text-transform: uppercase;
    padding: 8px 16px !important;
    border-bottom: 1px solid rgba(201,168,76,0.3) !important;
  }

  .check {
    color: #4CAF50;
    font-size: 18px;
    font-weight: 700;
  }

  .price {
    color: #FF9800;
    font-weight: 600;
    font-size: 12px;
  }

  .na {
    color: rgba(255,255,255,0.25);
    font-size: 16px;
  }

  .flagship td {
    background: rgba(201,168,76,0.12) !important;
  }

  .flagship td:first-child {
    color: #C9A84C !important;
    font-weight: 700 !important;
  }

  .updated-badge {
    display: inline-block;
    background: #FF6B35;
    color: #fff;
    font-size: 8px;
    font-weight: 700;
    padding: 1px 5px;
    border-radius: 3px;
    margin-left: 4px;
    vertical-align: middle;
    letter-spacing: 0.5px;
  }

  .footer {
    padding: 16px 24px;
    border-top: 2px solid rgba(201,168,76,0.5);
    background: linear-gradient(180deg, transparent 0%, rgba(0,0,0,0.25) 100%);
  }

  .legend {
    display: flex;
    gap: 24px;
    justify-content: center;
    flex-wrap: wrap;
    margin-bottom: 10px;
  }

  .legend-item {
    font-size: 12px;
    color: rgba(255,255,255,0.8);
  }

  .legend-item .symbol { margin-right: 4px; }

  .counts {
    text-align: center;
    font-size: 11px;
    color: rgba(255,255,255,0.5);
    line-height: 1.6;
  }

  .counts strong { color: #C9A84C; }
  
  .banf-badge {
    text-align: center;
    margin-top: 8px;
    font-size: 10px;
    color: rgba(255,255,255,0.35);
    letter-spacing: 1px;
  }
</style>
</head>
<body>
<div class="container">
  <div class="header">
    <div class="logo-text">&#9753; BANF &#9753;</div>
    <div class="title">Event Access Matrix — FY 2026-27</div>
    <div class="subtitle">Event Access by Membership Category &bull; Bengali Association of North Florida</div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Event</th>
        <th>Date</th>
        <th>Type</th>
        <th>M2 &#127942;</th>
        <th>M1 &#128203;</th>
        <th>Cultural &#127917;</th>
        <th>DP-1 &#128591;</th>
        <th>DP-2 &#128591;</th>
      </tr>
    </thead>
    <tbody>
      <tr class="section-row"><td colspan="8">Spring Events</td></tr>
      <tr>
        <td>Bosonto Utsob</td><td>Mar 7</td><td>Cult</td>
        <td class="check">&#10003;</td><td class="check">&#10003;</td><td class="check">&#10003;</td><td class="na">&mdash;</td><td class="na">&mdash;</td>
      </tr>
      <tr>
        <td>Noboborsho</td><td>Apr 25</td><td>Cult</td>
        <td class="check">&#10003;</td><td class="price">$30</td><td class="check">&#10003;</td><td class="na">&mdash;</td><td class="na">&mdash;</td>
      </tr>

      <tr class="section-row"><td colspan="8">Summer Events</td></tr>
      <tr>
        <td>Kids Summer Sports Training</td><td>Jun–Jul</td><td>Educ</td>
        <td class="check">&#10003;</td><td class="price">$45</td><td class="price">$50</td><td class="na">&mdash;</td><td class="na">&mdash;</td>
      </tr>
      <tr>
        <td>Summer Workshops – Kids</td><td>Jun–Jul</td><td>Educ</td>
        <td class="check">&#10003;</td><td class="price">$35</td><td class="price">$40</td><td class="na">&mdash;</td><td class="na">&mdash;</td>
      </tr>
      <tr>
        <td>Summer Workshops – General</td><td>Jun–Jul</td><td>Educ</td>
        <td class="check">&#10003;</td><td class="price">$35</td><td class="price">$40</td><td class="na">&mdash;</td><td class="na">&mdash;</td>
      </tr>
      <tr>
        <td>Sports Day</td><td>Jul</td><td>Soci</td>
        <td class="check">&#10003;</td><td class="check">&#10003;</td><td class="price">$20</td><td class="na">&mdash;</td><td class="na">&mdash;</td>
      </tr>
      <tr>
        <td>Spondon</td><td>Aug 8 <span class="updated-badge">UPDATED</span></td><td>Cult</td>
        <td class="check">&#10003;</td><td class="check">&#10003;</td><td class="check">&#10003;</td><td class="na">&mdash;</td><td class="na">&mdash;</td>
      </tr>

      <tr class="section-row"><td colspan="8">Puja Season Celebration</td></tr>
      <tr>
        <td>Mahalaya</td><td>Oct 10 <span class="updated-badge">RESCHEDULED</span></td><td>Reli</td>
        <td class="check">&#10003;</td><td class="check">&#10003;</td><td class="na">&mdash;</td><td class="check">&#10003;</td><td class="check">&#10003;</td>
      </tr>
      <tr class="flagship">
        <td>Durga Puja Day 1&amp;2 + Lunch **</td><td>Oct 24–25</td><td>Reli</td>
        <td class="check">&#10003;</td><td class="check">&#10003;</td><td class="na">&mdash;</td><td class="check">&#10003;</td><td class="check">&#10003;</td>
      </tr>
      <tr>
        <td>Lakshmi Puja</td><td>Oct 25</td><td>Reli</td>
        <td class="check">&#10003;</td><td class="check">&#10003;</td><td class="na">&mdash;</td><td class="check">&#10003;</td><td class="check">&#10003;</td>
      </tr>
      <tr>
        <td>Bijoya Sonmiloni</td><td>Oct 25</td><td>Soci</td>
        <td class="check">&#10003;</td><td class="check">&#10003;</td><td class="na">&mdash;</td><td class="check">&#10003;</td><td class="check">&#10003;</td>
      </tr>
      <tr>
        <td>Artist Program – Day 1 + Dinner</td><td>Oct 24</td><td>Cult</td>
        <td class="check">&#10003;</td><td class="price">$35</td><td class="na">&mdash;</td><td class="check">&#10003;</td><td class="na">&mdash;</td>
      </tr>
      <tr>
        <td>Artist Program – Day 2 + Dinner</td><td>Oct 25</td><td>Cult</td>
        <td class="check">&#10003;</td><td class="price">$35</td><td class="na">&mdash;</td><td class="check">&#10003;</td><td class="na">&mdash;</td>
      </tr>
      <tr>
        <td>Kali Puja + Snacks</td><td>Nov 7</td><td>Reli</td>
        <td class="check">&#10003;</td><td class="check">&#10003;</td><td class="na">&mdash;</td><td class="na">&mdash;</td><td class="na">&mdash;</td>
      </tr>
      <tr>
        <td>Natok (Drama) + Dinner</td><td>Nov 7</td><td>Cult</td>
        <td class="check">&#10003;</td><td class="check">&#10003;</td><td class="check">&#10003;</td><td class="na">&mdash;</td><td class="na">&mdash;</td>
      </tr>

      <tr class="section-row"><td colspan="8">Winter Events</td></tr>
      <tr>
        <td>Winter Picnic</td><td>Jan 11</td><td>Soci</td>
        <td class="check">&#10003;</td><td class="check">&#10003;</td><td class="check">&#10003;</td><td class="na">&mdash;</td><td class="na">&mdash;</td>
      </tr>
      <tr>
        <td>Saraswati Puja</td><td>Feb 27</td><td>Reli</td>
        <td class="check">&#10003;</td><td class="check">&#10003;</td><td class="na">&mdash;</td><td class="na">&mdash;</td><td class="na">&mdash;</td>
      </tr>
    </tbody>
  </table>

  <div class="footer">
    <div class="legend">
      <span class="legend-item"><span class="symbol check">&#10003;</span> = Included</span>
      <span class="legend-item"><span class="symbol price">$XX</span> = Add-on price</span>
      <span class="legend-item"><span class="symbol na">&mdash;</span> = Not available</span>
      <span class="legend-item"><span class="symbol" style="color:#C9A84C;">**</span> = Flagship Event</span>
    </div>
    <div class="counts">
      <strong>M2 Premium:</strong> 17 events &bull; <strong>M1 Regular:</strong> 11 events &bull; <strong>Cultural Special:</strong> 5 events &bull; <strong>DP Special-1:</strong> 6 events &bull; <strong>DP Special-2:</strong> 4 events
    </div>
    <div class="banf-badge">www.jaxbengali.org &bull; BANF Jacksonville &bull; 501(c)(3) Nonprofit</div>
  </div>
</div>
</body>
</html>`;

(async () => {
  console.log('Generating event matrix image...');
  
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    viewport: { width: 1140, height: 1200 },
    deviceScaleFactor: 2,  // High-res output
  });

  await page.setContent(MATRIX_HTML, { waitUntil: 'networkidle' });
  
  // Wait for fonts to load
  await page.waitForTimeout(2000);

  // Get the container bounds for a tight crop
  const container = await page.locator('.container').boundingBox();
  
  await page.screenshot({
    path: OUTPUT_PATH,
    clip: {
      x: container.x - 10,
      y: container.y - 10,
      width: container.width + 20,
      height: container.height + 20,
    },
    type: 'png',
  });

  await browser.close();
  console.log(`Matrix image saved to: ${OUTPUT_PATH}`);
  
  // Show file size
  const fs = require('fs');
  const stats = fs.statSync(OUTPUT_PATH);
  console.log(`File size: ${(stats.size / 1024).toFixed(1)} KB`);
})();
