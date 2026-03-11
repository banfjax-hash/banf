#!/usr/bin/env node
/**
 * BANF Bosonto Utsob 2026 — Attendance Excel Report & Email Sender
 * ─────────────────────────────────────────────────────────────────
 * Generates a comprehensive Excel (.xlsx) with ALL attendees:
 *   - CRM RSVP-Yes members (from banf-crm-reconciliation.json)
 *   - QR code sent log (from banf-qr-drive-lock.json)
 *   - Manual additions (Suvendu, Amrita, etc.)
 * Then emails to ranadhir.ghosh@gmail.com as backup for manual check-in.
 *
 * Usage:
 *   node banf-attendance-excel-report.js              # Generate + send
 *   node banf-attendance-excel-report.js --no-send    # Generate only
 *   node banf-attendance-excel-report.js --dry-run    # Dry run (no email)
 */

const ExcelJS    = require('exceljs');
const nodemailer = require('nodemailer');
const path       = require('path');
const fs         = require('fs');

// ── Config ─────────────────────────────────────────────────────
const CONFIG = {
  BANF_EMAIL: 'banfjax@gmail.com',
  EVENT_NAME: 'Bosonto Utsob 2026',
  EVENT_DATE: 'Saturday, March 7, 2026 — 11:00 AM ET',
  EVENT_VENUE: 'Jacksonville, FL',
  RECIPIENT: 'ranadhir.ghosh@gmail.com',
  RECIPIENT_NAME: 'Dr. Ranadhir Ghosh (President)',
};

const GMAIL = {
  CLIENT_ID:     '1020178199135-3usrl611ara38i7rhu2ub6sn6g1150ml.apps.googleusercontent.com',
  CLIENT_SECRET: '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',
  REFRESH_TOKEN: require('./banf-gmail-config').REFRESH_TOKEN
};

const ARGS = process.argv.slice(2);
const NO_SEND = ARGS.includes('--no-send');
const DRY_RUN = ARGS.includes('--dry-run');

// ── Membership Pricing (M2 Premium Early Bird) ──────────────────
const PRICING = { family: 375, couple: 330, individual: 215, student: 145 };

function getExpectedAmount(ht) {
  const h = (ht || 'individual').toLowerCase();
  if (h.includes('family')) return PRICING.family;
  if (h.includes('couple')) return PRICING.couple;
  if (h.includes('student')) return PRICING.student;
  return PRICING.individual;
}

// ── Load Data ──────────────────────────────────────────────────
function loadAttendees() {
  const CRM_FILE  = path.join(__dirname, 'banf-crm-reconciliation.json');
  const LOCK_FILE = path.join(__dirname, 'banf-qr-drive-lock.json');

  // 1. Load CRM
  const crmRaw = JSON.parse(fs.readFileSync(CRM_FILE, 'utf8'));
  const allMembers = Array.isArray(crmRaw) ? crmRaw : (crmRaw.members || []);
  console.log(`  CRM loaded: ${allMembers.length} total members`);

  // 2. Load QR sent log
  const lockRaw = JSON.parse(fs.readFileSync(LOCK_FILE, 'utf8'));
  const sentMap = lockRaw.sentEmails || {};
  const sentEmails = Object.keys(sentMap);
  console.log(`  QR lock loaded: ${sentEmails.length} QR codes sent`);

  // 3. Build unified attendee list
  const attendees = [];
  const seen = new Set();

  // Pass 1: CRM members with Bosonto RSVP=Yes
  for (const m of allMembers) {
    const events = m.eventAttendance || [];
    const bosonto = events.find(e =>
      e.eventName && e.eventName.toLowerCase().includes('bosonto') &&
      (e.rsvp || '').toLowerCase() === 'yes'
    );
    if (!bosonto) continue;

    const email = (m.email || '').toLowerCase();
    if (seen.has(email)) continue;
    seen.add(email);

    const qr = sentMap[email] || sentMap[m.email] || null;
    const adults = parseInt(bosonto.adults) || parseInt(bosonto.partySize) || 1;
    const kids = parseInt(bosonto.kids) || 0;
    const paidAmt = m.totalPaid || m.paymentAmount || 0;
    const expectedAmt = m.expectedAmount || getExpectedAmount(m.householdType);

    attendees.push({
      name: m.displayName || `${m.firstName || ''} ${m.lastName || ''}`.trim(),
      email: m.email || '',
      phone: m.phone || '',
      adults,
      kids,
      total: adults + kids,
      dietary: bosonto.dietary || 'Not specified',
      householdType: m.householdType || 'individual',
      householdDisplay: m.householdDisplayName || '',
      paid: paidAmt > 0,
      amountPaid: paidAmt,
      expectedAmount: expectedAmt,
      remaining: Math.max(0, expectedAmt - paidAmt),
      paymentStatus: paidAmt >= expectedAmt ? 'PAID' : (paidAmt > 0 ? 'PARTIAL' : 'UNPAID'),
      paymentSource: m.paymentSource || '',
      isEC: m.isECMember || false,
      memberSince: m.memberSince || '',
      qrSent: !!qr,
      qrSentAt: qr ? (qr.sentAt || '') : '',
      qrPhase: qr ? (qr.phase || '') : '',
      source: 'CRM RSVP',
    });
  }

  // Pass 2: QR recipients NOT already in the list (manual additions, late adds)
  for (const email of sentEmails) {
    if (seen.has(email.toLowerCase())) continue;
    seen.add(email.toLowerCase());

    const qr = sentMap[email];
    // Try to find in CRM for extra details
    const crmMember = allMembers.find(m => (m.email || '').toLowerCase() === email.toLowerCase());

    attendees.push({
      name: qr.name || qr.recipientName || (crmMember ? crmMember.displayName : email),
      email: email,
      phone: crmMember ? (crmMember.phone || '') : '',
      adults: crmMember ? (parseInt((crmMember.eventAttendance || [{}])[0].adults) || 1) : 1,
      kids: crmMember ? (parseInt((crmMember.eventAttendance || [{}])[0].kids) || 0) : 0,
      total: 0, // computed below
      dietary: 'Not specified',
      householdType: crmMember ? (crmMember.householdType || 'individual') : 'individual',
      householdDisplay: crmMember ? (crmMember.householdDisplayName || '') : '',
      paid: crmMember ? ((crmMember.totalPaid || 0) > 0) : false,
      amountPaid: crmMember ? (crmMember.totalPaid || 0) : 0,
      expectedAmount: crmMember ? getExpectedAmount(crmMember.householdType) : 215,
      remaining: 0,
      paymentStatus: 'UNKNOWN',
      paymentSource: '',
      isEC: crmMember ? (crmMember.isECMember || false) : false,
      memberSince: crmMember ? (crmMember.memberSince || '') : '',
      qrSent: true,
      qrSentAt: qr.sentAt || '',
      qrPhase: qr.phase || '',
      source: 'QR Drive (no RSVP)',
    });
    const last = attendees[attendees.length - 1];
    last.total = last.adults + last.kids;
    last.remaining = Math.max(0, last.expectedAmount - last.amountPaid);
    if (last.amountPaid > 0) last.paymentStatus = last.amountPaid >= last.expectedAmount ? 'PAID' : 'PARTIAL';
  }

  // Sort: EC members first, then alphabetically
  attendees.sort((a, b) => {
    if (a.isEC && !b.isEC) return -1;
    if (!a.isEC && b.isEC) return 1;
    return a.name.localeCompare(b.name);
  });

  return attendees;
}

// ── Build Excel ─────────────────────────────────────────────────
async function buildExcel(attendees) {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'BANF Attendance Report Generator';
  wb.created = new Date();

  // ═══════ Sheet 1: Full Attendance List ═══════
  const ws = wb.addWorksheet('Attendance List', {
    pageSetup: { paperSize: 9, orientation: 'landscape', fitToPage: true }
  });

  // BANF green & red
  const BANF_GREEN = 'FF006A4E';
  const BANF_RED   = 'FF8B0000';

  // ── Row 1: Title
  ws.mergeCells('A1:P1');
  const title = ws.getCell('A1');
  title.value = `BANF — ${CONFIG.EVENT_NAME} — Complete Attendance List (Manual Backup)`;
  title.font = { name: 'Calibri', size: 16, bold: true, color: { argb: 'FFFFFFFF' } };
  title.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BANF_GREEN } };
  title.alignment = { horizontal: 'center', vertical: 'middle' };
  ws.getRow(1).height = 34;

  // ── Row 2: Subtitle
  ws.mergeCells('A2:P2');
  const sub = ws.getCell('A2');
  sub.value = `Event: ${CONFIG.EVENT_DATE}  |  Generated: ${new Date().toLocaleString('en-US', { timeZone: 'America/New_York' })} ET  |  For: ${CONFIG.RECIPIENT_NAME}  |  BACKUP for manual check-in if system is down`;
  sub.font = { name: 'Calibri', size: 10, italic: true, color: { argb: 'FF666666' } };
  sub.alignment = { horizontal: 'center', vertical: 'middle' };
  ws.getRow(2).height = 20;

  // ── Row 3: Instructions
  ws.mergeCells('A3:P3');
  const instr = ws.getCell('A3');
  instr.value = '⚠️ MANUAL BACKUP — Use this sheet if QR scanner / portal is unavailable. Mark "Attended" column (N) with ✓ and note food served in column O.';
  instr.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF8B0000' } };
  instr.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF3CD' } };
  instr.alignment = { horizontal: 'center', vertical: 'middle' };
  ws.getRow(3).height = 22;

  ws.addRow([]); // spacer

  // ── Row 5: Headers
  const HEADERS = [
    '#', 'Name', 'Email', 'Phone', 'Adults', 'Kids', 'Total',
    'Dietary', 'Household', 'Paid?', 'Amount', 'Expected', 'QR Sent?',
    'Attended ✓', 'Food Served', 'Notes'
  ];
  const headerRow = ws.addRow(HEADERS);
  headerRow.height = 28;
  headerRow.eachCell((cell, col) => {
    cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BANF_RED } };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.border = { bottom: { style: 'medium', color: { argb: 'FFDC143C' } } };
  });

  // ── Column widths
  ws.columns = [
    { key: 'seq',       width: 5  },
    { key: 'name',      width: 26 },
    { key: 'email',     width: 30 },
    { key: 'phone',     width: 16 },
    { key: 'adults',    width: 8  },
    { key: 'kids',      width: 7  },
    { key: 'total',     width: 7  },
    { key: 'dietary',   width: 14 },
    { key: 'household', width: 12 },
    { key: 'paid',      width: 8  },
    { key: 'amount',    width: 10 },
    { key: 'expected',  width: 10 },
    { key: 'qr',        width: 10 },
    { key: 'attended',  width: 12 },  // blank for manual entry
    { key: 'food',      width: 14 },  // blank for manual entry
    { key: 'notes',     width: 28 },  // blank for manual entry
  ];

  // ── Data rows
  let totAdults = 0, totKids = 0, totPaid = 0, totAmount = 0;
  let qrSentCount = 0;

  attendees.forEach((a, i) => {
    totAdults += a.adults;
    totKids += a.kids;
    if (a.paid) { totPaid++; totAmount += a.amountPaid; }
    if (a.qrSent) qrSentCount++;

    const row = ws.addRow([
      i + 1,
      a.name,
      a.email,
      a.phone || '',
      a.adults,
      a.kids,
      a.total,
      a.dietary === 'Not specified' ? '' : a.dietary,
      a.householdType || '',
      a.paymentStatus,
      a.amountPaid > 0 ? `$${a.amountPaid}` : '',
      `$${a.expectedAmount}`,
      a.qrSent ? '✅ Yes' : '❌ No',
      '',   // Attended — blank for manual entry
      '',   // Food Served — blank
      a.isEC ? 'EC Member' : (a.source !== 'CRM RSVP' ? a.source : ''),
    ]);

    row.height = 22;
    const stripe = i % 2 === 0 ? 'FFF7FAF8' : 'FFFFFFFF';
    row.eachCell((cell, col) => {
      cell.font = { name: 'Calibri', size: 10 };
      cell.alignment = { vertical: 'middle', horizontal: col <= 1 || col >= 8 ? 'center' : 'left', wrapText: col === 16 };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: stripe } };
      cell.border = { bottom: { style: 'thin', color: { argb: 'FFE0E0E0' } } };
    });

    // Highlight payment status
    const paidCell = row.getCell(10);
    if (a.paymentStatus === 'PAID') {
      paidCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD4EDDA' } };
      paidCell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF155724' } };
    } else if (a.paymentStatus === 'PARTIAL') {
      paidCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF3CD' } };
      paidCell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF856404' } };
    } else if (a.paymentStatus === 'UNPAID') {
      paidCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8D7DA' } };
      paidCell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF721C24' } };
    }

    // Highlight "Attended" column with yellow for easy marking
    const attendedCell = row.getCell(14);
    attendedCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF9C4' } };
    attendedCell.border = {
      top: { style: 'thin', color: { argb: 'FFE0E0E0' } },
      bottom: { style: 'thin', color: { argb: 'FFE0E0E0' } },
      left: { style: 'medium', color: { argb: 'FF8B0000' } },
      right: { style: 'medium', color: { argb: 'FF8B0000' } },
    };

    // Highlight EC members
    if (a.isEC) {
      row.getCell(2).font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF006A4E' } };
    }
  });

  // ── Summary row
  ws.addRow([]);
  const sumRow = ws.addRow([
    '', 'TOTALS',
    `${attendees.length} attendees`,
    '',
    totAdults,
    totKids,
    totAdults + totKids,
    '',
    '',
    `${totPaid} paid`,
    `$${totAmount}`,
    '',
    `${qrSentCount} sent`,
    '', '', ''
  ]);
  sumRow.height = 26;
  sumRow.eachCell(cell => {
    cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BANF_GREEN } };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
  });

  // ═══════ Sheet 2: Summary Stats ═══════
  const ws2 = wb.addWorksheet('Summary');
  ws2.addRow([`BANF ${CONFIG.EVENT_NAME} — Attendance Summary`]).font = { size: 14, bold: true };
  ws2.addRow([`Generated: ${new Date().toLocaleString('en-US', { timeZone: 'America/New_York' })} ET`]);
  ws2.addRow([`Event: ${CONFIG.EVENT_DATE}`]);
  ws2.addRow([]);
  ws2.addRow(['Metric', 'Value']).font = { bold: true };

  const stats = [
    ['Total Attendees', attendees.length],
    ['Total Adults', totAdults],
    ['Total Kids', totKids],
    ['Total Headcount', totAdults + totKids],
    ['QR Codes Sent', qrSentCount],
    ['QR Codes NOT Sent', attendees.length - qrSentCount],
    ['Members Paid', totPaid],
    ['Total $ Collected', `$${totAmount}`],
    ['Members Unpaid', attendees.length - totPaid],
    ['EC Members', attendees.filter(a => a.isEC).length],
    ['Families', attendees.filter(a => a.householdType === 'family').length],
    ['Couples', attendees.filter(a => a.householdType === 'couple').length],
    ['Individuals', attendees.filter(a => a.householdType === 'individual').length],
    ['Students', attendees.filter(a => a.householdType === 'student').length],
    ['Source: CRM RSVP', attendees.filter(a => a.source === 'CRM RSVP').length],
    ['Source: QR Drive Only', attendees.filter(a => a.source !== 'CRM RSVP').length],
  ];
  stats.forEach(([label, val]) => {
    const row = ws2.addRow([label, val]);
    row.getCell(1).font = { bold: true };
    row.getCell(1).alignment = { horizontal: 'left' };
    row.getCell(2).alignment = { horizontal: 'center' };
  });
  ws2.columns = [{ width: 28 }, { width: 16 }];

  // ═══════ Sheet 3: Manual Check-In Template ═══════
  const ws3 = wb.addWorksheet('Manual Check-In');
  ws3.mergeCells('A1:F1');
  const t3 = ws3.getCell('A1');
  t3.value = 'MANUAL CHECK-IN SHEET — Print This Page';
  t3.font = { name: 'Calibri', size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
  t3.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BANF_RED } };
  t3.alignment = { horizontal: 'center', vertical: 'middle' };
  ws3.getRow(1).height = 30;

  ws3.mergeCells('A2:F2');
  ws3.getCell('A2').value = `${CONFIG.EVENT_NAME} — ${CONFIG.EVENT_DATE}`;
  ws3.getCell('A2').font = { size: 11, italic: true };
  ws3.getCell('A2').alignment = { horizontal: 'center' };

  ws3.addRow([]);
  const h3 = ws3.addRow(['#', 'Name', 'Adults', 'Kids', 'Check-In ✓', 'Notes']);
  h3.height = 24;
  h3.eachCell(cell => {
    cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BANF_GREEN } };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.border = { bottom: { style: 'medium', color: { argb: 'FF006A4E' } } };
  });

  attendees.forEach((a, i) => {
    const row = ws3.addRow([i + 1, a.name, a.adults, a.kids, '', '']);
    row.height = 24;
    row.eachCell((cell, col) => {
      cell.font = { name: 'Calibri', size: 11 };
      cell.alignment = { vertical: 'middle', horizontal: col <= 1 ? 'center' : (col === 2 ? 'left' : 'center') };
      cell.border = { bottom: { style: 'thin', color: { argb: 'FFE0E0E0' } } };
    });
    // Big check-in column
    row.getCell(5).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF9C4' } };
    row.getCell(5).border = {
      top: { style: 'thin', color: { argb: 'FFE0E0E0' } },
      bottom: { style: 'thin', color: { argb: 'FFE0E0E0' } },
      left: { style: 'medium', color: { argb: 'FF8B0000' } },
      right: { style: 'medium', color: { argb: 'FF8B0000' } },
    };
  });

  // Summary at bottom
  ws3.addRow([]);
  const sum3 = ws3.addRow(['', `Total: ${attendees.length}`, totAdults, totKids, '', '']);
  sum3.eachCell(cell => {
    cell.font = { name: 'Calibri', size: 11, bold: true };
  });

  ws3.columns = [{ width: 5 }, { width: 28 }, { width: 10 }, { width: 10 }, { width: 14 }, { width: 30 }];

  // ═══════ Sheet 4: Payment Summary ═══════
  const ws4 = wb.addWorksheet('Payment Summary');
  ws4.addRow([`Payment Summary — ${CONFIG.EVENT_NAME}`]).font = { size: 14, bold: true };
  ws4.addRow([]);
  const h4 = ws4.addRow(['#', 'Name', 'Email', 'Household', 'Expected', 'Paid', 'Remaining', 'Status', 'Source']);
  h4.eachCell(cell => {
    cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BANF_GREEN } };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
  });

  attendees.forEach((a, i) => {
    ws4.addRow([
      i + 1, a.name, a.email, a.householdType,
      `$${a.expectedAmount}`,
      a.amountPaid > 0 ? `$${a.amountPaid}` : '$0',
      `$${a.remaining}`,
      a.paymentStatus,
      a.paymentSource || ''
    ]);
  });

  ws4.addRow([]);
  ws4.addRow(['', 'TOTALS', '', '',
    `$${attendees.reduce((s, a) => s + a.expectedAmount, 0)}`,
    `$${totAmount}`,
    `$${attendees.reduce((s, a) => s + a.remaining, 0)}`,
    `${totPaid}/${attendees.length} paid`, ''
  ]).font = { bold: true };

  ws4.columns = [
    { width: 5 }, { width: 26 }, { width: 30 }, { width: 12 },
    { width: 12 }, { width: 10 }, { width: 12 }, { width: 10 }, { width: 14 }
  ];

  return wb;
}

// ── Email Sender ────────────────────────────────────────────────
async function sendEmail(filePath, attendeeCount, headcount) {
  const transport = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      type: 'OAuth2',
      user: CONFIG.BANF_EMAIL,
      clientId: GMAIL.CLIENT_ID,
      clientSecret: GMAIL.CLIENT_SECRET,
      refreshToken: GMAIL.REFRESH_TOKEN,
    }
  });

  const fileName = path.basename(filePath);
  const now = new Date().toLocaleString('en-US', { timeZone: 'America/New_York' });

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family:Calibri,Arial,sans-serif;color:#333;max-width:600px;margin:0 auto">
  <div style="background:#006A4E;color:#fff;padding:18px 24px;border-radius:8px 8px 0 0">
    <h1 style="margin:0;font-size:20px">🌸 ${CONFIG.EVENT_NAME} — Attendance Backup</h1>
  </div>
  <div style="padding:20px 24px;border:1px solid #e0e0e0;border-top:none;border-radius:0 0 8px 8px">
    <p>Dear ${CONFIG.RECIPIENT_NAME.split('(')[0].trim()},</p>
    <p>Please find attached the <strong>complete attendance Excel report</strong> for today's Bosonto Utsob event. This is your <strong>manual backup</strong> in case the QR scanner or admin portal is unavailable.</p>
    
    <table style="border-collapse:collapse;margin:16px 0;width:100%">
      <tr style="background:#f7faf8">
        <td style="padding:8px 12px;border:1px solid #e0e0e0;font-weight:bold">Total Attendees</td>
        <td style="padding:8px 12px;border:1px solid #e0e0e0;text-align:center">${attendeeCount}</td>
      </tr>
      <tr>
        <td style="padding:8px 12px;border:1px solid #e0e0e0;font-weight:bold">Total Headcount (Adults + Kids)</td>
        <td style="padding:8px 12px;border:1px solid #e0e0e0;text-align:center">${headcount}</td>
      </tr>
      <tr style="background:#f7faf8">
        <td style="padding:8px 12px;border:1px solid #e0e0e0;font-weight:bold">Report Generated</td>
        <td style="padding:8px 12px;border:1px solid #e0e0e0;text-align:center">${now} ET</td>
      </tr>
    </table>

    <p><strong>The Excel has 4 sheets:</strong></p>
    <ol>
      <li><strong>Attendance List</strong> — Full details (name, email, phone, dietary, payment, QR status) with blank "Attended" column</li>
      <li><strong>Summary</strong> — Key metrics (headcount, paid vs unpaid, household breakdown)</li>
      <li><strong>Manual Check-In</strong> — Print-friendly sheet with name, party size, and check-in box</li>
      <li><strong>Payment Summary</strong> — Who paid, how much, remaining balance</li>
    </ol>

    <p style="background:#fff3cd;padding:10px 14px;border-radius:6px;border-left:4px solid #ffc107">
      <strong>⚠️ How to use:</strong> If the system is down, print the "Manual Check-In" sheet and mark attendance with a pen. After the event, data can be entered back into the portal.
    </p>

    <p style="color:#888;font-size:12px;margin-top:24px">
      Generated by BANF Agentic Platform · ${now}
    </p>
  </div>
</body>
</html>`;

  const info = await transport.sendMail({
    from: `"BANF System" <${CONFIG.BANF_EMAIL}>`,
    to: CONFIG.RECIPIENT,
    subject: `📋 ${CONFIG.EVENT_NAME} — Complete Attendance List (Manual Backup) — ${attendeeCount} attendees`,
    html,
    attachments: [{
      filename: fileName,
      path: filePath,
      contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    }],
    headers: {
      'X-BANF-Report': 'Attendance-Backup',
      'X-BANF-Event': CONFIG.EVENT_NAME,
    }
  });

  return info;
}

// ── Main ────────────────────────────────────────────────────────
async function main() {
  console.log('╔═══════════════════════════════════════════════════════╗');
  console.log('║  BANF Bosonto Utsob 2026 — Attendance Excel Report   ║');
  console.log('╚═══════════════════════════════════════════════════════╝\n');

  // Load data
  console.log('📂 Loading data...');
  const attendees = loadAttendees();
  const totalHeadcount = attendees.reduce((s, a) => s + a.total, 0);
  console.log(`\n✅ ${attendees.length} attendees loaded (${totalHeadcount} headcount)`);
  console.log(`   EC Members: ${attendees.filter(a => a.isEC).length}`);
  console.log(`   QR Sent: ${attendees.filter(a => a.qrSent).length}`);
  console.log(`   Paid: ${attendees.filter(a => a.paid).length}`);

  // Build Excel
  console.log('\n📊 Building Excel workbook (4 sheets)...');
  const wb = await buildExcel(attendees);

  const dateStr = new Date().toISOString().slice(0, 10);
  const timeStr = new Date().toISOString().slice(11, 16).replace(':', '');
  const outFile = `banf-bosonto-attendance-backup-${dateStr}-${timeStr}.xlsx`;
  const outPath = path.resolve(__dirname, outFile);

  await wb.xlsx.writeFile(outPath);
  const size = (fs.statSync(outPath).size / 1024).toFixed(1);
  console.log(`\n✅ Excel saved: ${outFile} (${size} KB)`);

  // Send email
  if (NO_SEND) {
    console.log('\n⏭️  --no-send flag: Skipping email.');
  } else if (DRY_RUN) {
    console.log(`\n🔍 DRY RUN — Would send to: ${CONFIG.RECIPIENT}`);
    console.log(`   Subject: 📋 ${CONFIG.EVENT_NAME} — Complete Attendance List (Manual Backup)`);
    console.log(`   Attachment: ${outFile} (${size} KB)`);
  } else {
    console.log(`\n📧 Sending to ${CONFIG.RECIPIENT}...`);
    try {
      const info = await sendEmail(outPath, attendees.length, totalHeadcount);
      console.log(`✅ Email sent! Message ID: ${info.messageId}`);
    } catch (e) {
      console.error(`❌ Email failed: ${e.message}`);
      console.log(`   File saved locally: ${outFile} — please send manually.`);
    }
  }

  console.log('\n══════════════════════════════════════════════════════');
  console.log('   DONE. Attendance backup ready for Bosonto Utsob.');
  console.log('══════════════════════════════════════════════════════');
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });
