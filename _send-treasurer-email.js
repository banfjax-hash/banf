#!/usr/bin/env node
/**
 * One-off: Send treasurer instruction email about new reimbursement rules
 * Usage: node _send-treasurer-email.js
 */
const https = require('https');
const secrets = require('./.banf-secrets.json');

function httpsReq(url, opts) {
  return new Promise((resolve, reject) => {
    const req = https.request(url, opts, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(d) }); }
        catch { resolve({ status: res.statusCode, data: d }); }
      });
    });
    req.on('error', reject);
    if (opts.body) req.write(opts.body);
    req.end();
  });
}

async function main() {
  // 1. Get access token
  const tokenRes = await httpsReq('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `client_id=${secrets.CLIENT_ID}&client_secret=${secrets.CLIENT_SECRET}&refresh_token=${secrets.REFRESH_TOKEN}&grant_type=refresh_token`
  });
  if (!tokenRes.data.access_token) {
    console.error('TOKEN FAIL:', JSON.stringify(tokenRes.data));
    process.exit(1);
  }
  console.log('✅ Token refreshed');
  const token = tokenRes.data.access_token;

  // 2. Build email
  const to = 'amit.everywhere@gmail.com';
  const toName = 'Amit Chandak';
  const from = 'banfjax@gmail.com';
  const subject = 'BANF Reimbursement System Update - New Rules & Treasurer Instructions';

  const html = `
<div style="font-family:Segoe UI,Arial,sans-serif;max-width:680px;margin:0 auto;padding:24px;color:#1a1a2e">
  <div style="background:linear-gradient(135deg,#0f3460,#16213e);padding:20px 28px;border-radius:12px 12px 0 0;color:#fff">
    <h2 style="margin:0;font-size:22px">BANF Reimbursement System &mdash; New Rules &amp; Instructions</h2>
    <p style="margin:6px 0 0;font-size:13px;opacity:.85">Phase 17 Update &bull; Effective Immediately</p>
  </div>
  <div style="background:#fff;border:1px solid #e0e0e0;border-top:none;padding:24px 28px;border-radius:0 0 12px 12px">
    <p>Dear Amit,</p>
    <p>The BANF reimbursement system has been updated with important new rules and capabilities. Please review the following instructions carefully.</p>

    <h3 style="color:#e94560;border-bottom:2px solid #e94560;padding-bottom:6px">&#9888; Procurement-First Rule (NEW)</h3>
    <ul>
      <li><strong>Regular EC members</strong> (Secretary, Cultural Secretary, etc.) can <strong>NO longer</strong> submit reimbursements without an approved procurement ticket.</li>
      <li>They must first submit a procurement request, get it approved (PROC-XXXX), and reference that ticket when requesting reimbursement.</li>
      <li><strong>You (Treasurer), VP, and President</strong> can still submit manual reimbursements without procurement &mdash; but a <strong>warning notification</strong> will be triggered and logged for audit.</li>
    </ul>

    <h3 style="color:#0f3460;border-bottom:2px solid #0f3460;padding-bottom:6px">&#128196; Prior-EC Events Excluded</h3>
    <ul>
      <li><strong>Saraswati Puja 2026</strong> and <strong>Sri Lankan Rental</strong> belong to the prior EC term and are <strong>excluded from current reimbursement approval</strong>.</li>
      <li>These events will be automatically flagged if someone tries to submit them.</li>
      <li>If there are pending expenses from these events, they require special handling outside the normal workflow.</li>
    </ul>

    <h3 style="color:#e94560;border-bottom:2px solid #e94560;padding-bottom:6px">&#127991; Model-Suggested Categorizations &mdash; VERIFY!</h3>
    <ul>
      <li>All receipt item categorizations are <strong>suggested by the AI model</strong> and may not be 100% accurate.</li>
      <li><strong>As Treasurer, you should verify and update each categorization</strong> as required.</li>
      <li>Items flagged as <code>model-suggested</code> need your review before final approval.</li>
    </ul>

    <h3 style="color:#0f3460;border-bottom:2px solid #0f3460;padding-bottom:6px">&#9999; Re-Label Capability (NEW &mdash; Treasurer Only)</h3>
    <ul>
      <li>You can now <strong>re-label any receipt item</strong> with a note stating exactly what the item is for.</li>
      <li>Use the <strong>Re-Label</strong> action on any reimbursement ticket to correct AI-suggested categories.</li>
      <li>When you re-label an item, the <code>modelSuggested</code> flag is cleared and your label becomes the verified record.</li>
      <li>All re-labels are <strong>audit-logged</strong> with your name, timestamp, and notes.</li>
    </ul>

    <h3 style="color:#0f3460;border-bottom:2px solid #0f3460;padding-bottom:6px">&#128101; Approval Chain</h3>
    <p>Reimbursement approvals follow a <strong>sequential chain</strong>:</p>
    <ol>
      <li><strong>Treasurer (You)</strong> &mdash; first approver</li>
      <li><strong>Vice President (Partha)</strong> &mdash; approves after Treasurer</li>
      <li><strong>President (Ranadhir)</strong> &mdash; final approval</li>
    </ol>
    <p>Each approver must approve before the next can act.</p>

    <h3 style="color:#0f3460;border-bottom:2px solid #0f3460;padding-bottom:6px">&#128214; Updated User Guide</h3>
    <p>The EC Finance User Guide has been updated with all these changes. Access it from the Admin Portal sidebar or directly at:</p>
    <p><a href="https://banfjax-hash.github.io/banf/v2/docs/ec-finance-user-guide.html" style="color:#0f3460;font-weight:bold">EC Finance User Guide</a></p>

    <div style="background:#fff3cd;border-left:4px solid #ffc107;padding:12px 16px;margin:20px 0;border-radius:0 8px 8px 0">
      <strong>&#128221; Action Items for You:</strong>
      <ol style="margin:8px 0 0;padding-left:20px">
        <li>Review any pending reimbursement tickets for model-suggested categorizations</li>
        <li>Re-label items that are incorrectly categorized using the new Re-Label feature</li>
        <li>Inform other EC members that reimbursements now require an approved procurement ticket</li>
        <li>Flag any Saraswati Puja 2026 or Sri Lankan Rental expenses for special handling</li>
      </ol>
    </div>

    <p style="margin-top:24px;color:#666;font-size:13px">This is an automated notification from the BANF Finance System.<br>For questions, reply to this email or contact the development team.</p>
  </div>
</div>`;

  // Build raw MIME
  const mime = [
    'MIME-Version: 1.0',
    `From: BANF Admin <${from}>`,
    `To: ${toName} <${to}>`,
    `Subject: ${subject}`,
    'Content-Type: text/html; charset=utf-8',
    '',
    html
  ].join('\r\n');

  const raw = Buffer.from(mime).toString('base64url');

  // 3. Send via Gmail API
  const sendRes = await httpsReq('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ raw })
  });

  if (sendRes.status === 200) {
    console.log('✅ Email sent successfully! Message ID:', sendRes.data.id);
  } else {
    console.error('❌ Send failed:', sendRes.status, JSON.stringify(sendRes.data));
  }
}

main().catch(e => console.error('ERROR:', e.message));
