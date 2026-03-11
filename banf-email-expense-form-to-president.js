#!/usr/bin/env node
/**
 * ═══════════════════════════════════════════════════════════════
 *  BANF — Email Expense Review Form Link to President
 * ═══════════════════════════════════════════════════════════════
 *
 *  Sends an email to Dr. Ranadhir Ghosh (President) with the link
 *  to the expense review form on GitHub Pages.
 *
 *  Usage:  node banf-email-expense-form-to-president.js
 * ═══════════════════════════════════════════════════════════════
 */

const { getToken, sendEmail, sanitizeSubjectForMIME } = require('./banf-gmail-config');

const PRESIDENT_EMAIL = 'ranadhir.ghosh@gmail.com';
const PRESIDENT_NAME  = 'Dr. Ranadhir Ghosh';
const FORM_URL        = 'https://banfjax-hash.github.io/banf/banf-expense-review-form.html';

const htmlBody = `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="font-family:'Segoe UI',system-ui,sans-serif;color:#1e293b;line-height:1.6;max-width:700px;margin:0 auto;padding:20px">
  <div style="background:linear-gradient(135deg,#0a6847,#0d8a5c);color:#fff;padding:20px 24px;border-radius:10px;margin-bottom:20px">
    <h2 style="margin:0;font-size:1.2rem">Bosonto Utsob 2026 - Expense Review Required</h2>
    <p style="margin:4px 0 0;opacity:.85;font-size:.85rem">Action Required: Presidential Expense Review</p>
  </div>

  <p>Dear <strong>${PRESIDENT_NAME}</strong>,</p>

  <p>The BANF Financial Reconciliation System has prepared the expense report for 
  <strong>Bosonto Utsob 2026</strong> and requires your review before it is forwarded 
  to the Treasurer for final processing.</p>

  <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:16px;margin:16px 0;text-align:center">
    <p style="margin:0 0 12px;font-weight:600;color:#166534">Please review all expenses using the form below:</p>
    <a href="${FORM_URL}" style="display:inline-block;background:#0a6847;color:#fff;padding:12px 32px;border-radius:6px;text-decoration:none;font-weight:600;font-size:1rem">
      Open Expense Review Form
    </a>
  </div>

  <div style="background:#f8fafc;border-left:3px solid #0a6847;padding:12px 16px;border-radius:0 6px 6px 0;margin:16px 0">
    <strong>What You'll Review:</strong>
    <ul style="margin:8px 0 0;padding-left:20px;font-size:.9rem">
      <li><strong>9 expenses</strong> across Bosonto Utsob and Saraswati Puja 2026</li>
      <li>Event assignment for each expense (reassign if needed)</li>
      <li>Venue booking investigation — Suvankar to Sanjeev payment status</li>
      <li>Option to add missing expenses not yet in the system</li>
      <li>Comment box for each expense and a general comments section</li>
    </ul>
  </div>

  <div style="background:#fffbeb;border-left:3px solid #c8a951;padding:12px 16px;border-radius:0 6px 6px 0;margin:16px 0">
    <strong>Venue Investigation Note:</strong><br>
    <span style="font-size:.9rem">We could not find a Zelle payment from the BANF Wells Fargo account to Sanjeev K. Howlader 
    (COJ Parks & Recreation) for the venue booking. If this payment was made from a personal account 
    (e.g., Suvankar Paul), please note this in the form so we can record it properly.</span>
  </div>

  <p style="background:#dbeafe;padding:12px;border-radius:6px;font-size:.88rem">
    <strong>After You Submit:</strong> The form will download a JSON file. Please email that file 
    back to <a href="mailto:banfjax@gmail.com">banfjax@gmail.com</a>, and the system will automatically 
    apply your corrections, regenerate the event ledger, and forward it to Treasurer Amit Chandak.
  </p>

  <p style="font-size:.88rem">
    <strong>Direct link:</strong><br>
    <a href="${FORM_URL}">${FORM_URL}</a>
  </p>

  <p style="color:#64748b;font-size:.82rem;margin-top:24px">
    Thanks and Regards,<br>
    BANF Financial Reconciliation System<br>
    <em>Bengali Association of North Florida</em>
  </p>
</body>
</html>`;

(async () => {
    try {
        console.log('Sending expense review form link to President...');
        const token = await getToken();
        const subject = sanitizeSubjectForMIME('BANF Bosonto Utsob 2026 - Expense Review Form (Action Required)');
        const result = await sendEmail(token, PRESIDENT_EMAIL, null, subject, htmlBody);
        
        if (result.status === 200) {
            console.log(`✅ Email sent to ${PRESIDENT_NAME} (${PRESIDENT_EMAIL})`);
            console.log(`   Message ID: ${result.data.id}`);
        } else {
            console.error(`❌ Failed (HTTP ${result.status}):`, JSON.stringify(result.data));
        }
    } catch (e) {
        console.error('❌ Error:', e.message);
    }
})();
