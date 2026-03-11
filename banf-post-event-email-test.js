#!/usr/bin/env node
/**
 * ═══════════════════════════════════════════════════════════════════════
 *  BANF Post-Event Email — SCENARIO TEST HARNESS
 * ═══════════════════════════════════════════════════════════════════════
 *
 *  Sends ALL possible post-event email template variants to a single
 *  test recipient (ranadhir.ghosh@gmail.com) using REAL member names
 *  from actual CRM data for each scenario.
 *
 *  Scenarios tested:
 *    1. THANK-YOU: Attended + Paid + Payment NOT Acknowledged
 *    2. THANK-YOU: Attended + Paid + Payment Already Acknowledged
 *    3. THANK-YOU: Attended + NOT Paid (no payment section)
 *    4. THANK-YOU: Attended + Paid (large sponsorship amount)
 *    5. MISSED-YOU: RSVP'd Yes + Did NOT Attend (no payment)
 *    6. MISSED-YOU: RSVP'd Yes + Did NOT Attend + Had Paid
 *
 *  All 6 emails sent to: ranadhir.ghosh@gmail.com
 *  Each with unique subject line identifying the scenario.
 *
 *  Usage:
 *    node banf-post-event-email-test.js
 * ═══════════════════════════════════════════════════════════════════════
 */

const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');

// Payment Purpose Engine
let classifyPayment, generatePaymentAcknowledgment;
try {
  ({ classifyPayment, generatePaymentAcknowledgment } = require('./banf-payment-purpose-engine'));
} catch (e) {
  console.log('  ⚠️  Payment Purpose Engine not available');
}

// ── Config ─────────────────────────────────────────────────────────
const TEST_RECIPIENT = 'ranadhir.ghosh@gmail.com';
const CONFIG = {
  BANF_EMAIL: 'banfjax@gmail.com',
  BANF_NAME: 'Bengali Association of North Florida (BANF)',
  EVENT_NAME: 'Bosonto Utsob 2026',
  EVENT_DATE: 'Saturday, March 7, 2026',
  NEXT_EVENT: 'Anandabazar',
  NEXT_EVENT_DATE: 'Saturday, March 14, 2026',
};

const GMAIL = {
  CLIENT_ID: '1020178199135-3usrl611ara38i7rhu2ub6sn6g1150ml.apps.googleusercontent.com',
  CLIENT_SECRET: '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',
  REFRESH_TOKEN: require('./banf-gmail-config').REFRESH_TOKEN
};

// ═══════════════════════════════════════════════════════════════════
// LOAD REAL MEMBER DATA FOR SCENARIOS
// ═══════════════════════════════════════════════════════════════════

function loadScenarioMembers() {
  const crm = JSON.parse(fs.readFileSync(path.join(__dirname, 'banf-crm-reconciliation.json'), 'utf8'));
  const all = Array.isArray(crm) ? crm : (crm.members || []);

  const rsvpYes = all.filter(m => (m.eventAttendance || []).some(e =>
    e.eventName && e.eventName.toLowerCase().includes('bosonto') &&
    (e.rsvp || '').toLowerCase() === 'yes'
  ));

  const withPayment = rsvpYes.filter(m => (m.paymentRecords || []).some(p => p.amount > 0));
  const noPayment = rsvpYes.filter(m => !(m.paymentRecords || []).some(p => p.amount > 0));

  // Pick specific members for each scenario
  const scenarios = {};

  // Scenario 1: Attended + Paid + NOT acknowledged (most common case)
  // Use Sunetra Basu Ghosh ($330 — couple membership)
  const s1member = withPayment.find(m => (m.email || '').toLowerCase() === 'sunetra.basu@gmail.com')
                || withPayment[0];
  scenarios.attendedPaidUnacked = {
    member: s1member,
    label: 'Attended + Paid $330 + Payment NOT Acknowledged',
    firstName: (s1member.displayName || '').split(' ')[0] || 'Sunetra',
    name: s1member.displayName || 'Sunetra Basu Ghosh',
    totalPaid: (s1member.paymentRecords || []).reduce((s, p) => s + (p.amount || 0), 0),
    acknowledged: false,
    purpose: 'membership'
  };

  // Scenario 2: Attended + Paid + Already acknowledged
  // Use Rwiti Choudhury ($215 — individual membership)
  const s2member = withPayment.find(m => (m.email || '').toLowerCase() === 'rwitichoudhury@gmail.com')
                || withPayment[1];
  scenarios.attendedPaidAcked = {
    member: s2member,
    label: 'Attended + Paid $215 + Payment Already Acknowledged',
    firstName: (s2member.displayName || '').split(' ')[0] || 'Rwiti',
    name: s2member.displayName || 'Rwiti Choudhury',
    totalPaid: (s2member.paymentRecords || []).reduce((s, p) => s + (p.amount || 0), 0),
    acknowledged: true,
    purpose: 'membership'
  };

  // Scenario 3: Attended + NOT Paid (no payment section shows)
  // Use Paulami Guha (RSVP'd yes, no payment records)
  const s3member = noPayment.find(m => (m.email || '').toLowerCase() === 'drpaulami@gmail.com')
                || noPayment[0];
  scenarios.attendedNoPay = {
    member: s3member,
    label: 'Attended + NO Payment on Record',
    firstName: (s3member.displayName || '').split(' ')[0] || 'Paulami',
    name: s3member.displayName || 'Paulami Guha',
    totalPaid: 0,
    acknowledged: false,
    purpose: null
  };

  // Scenario 4: Attended + Large payment (sponsorship level $480)
  // Use Amit Saha ($480 — sponsorship range)
  const s4member = withPayment.find(m => (m.email || '').toLowerCase() === 'asahaech@yahoo.com')
                || withPayment.find(m => (m.paymentRecords || []).reduce((s, p) => s + (p.amount || 0), 0) >= 400)
                || withPayment[2];
  scenarios.attendedSponsor = {
    member: s4member,
    label: 'Attended + Large Payment $480 (Sponsorship Level)',
    firstName: (s4member.displayName || '').split(' ')[0] || 'Amit',
    name: s4member.displayName || 'Amit Saha',
    totalPaid: (s4member.paymentRecords || []).reduce((s, p) => s + (p.amount || 0), 0),
    acknowledged: false,
    purpose: 'sponsorship'
  };

  // Scenario 5: Missed (did NOT attend) + No Payment
  // Use Mita Dhar (RSVP'd yes, no payment)
  const s5member = noPayment.find(m => (m.email || '').toLowerCase() === 'mdhar79@yahoo.com')
                || noPayment[1];
  scenarios.missedNoPay = {
    member: s5member,
    label: 'RSVP Yes + Did NOT Attend + No Payment',
    firstName: (s5member.displayName || '').split(' ')[0] || 'Mita',
    name: s5member.displayName || 'MITA DHAR',
    totalPaid: 0,
    acknowledged: false,
    purpose: null
  };

  // Scenario 6: Missed + Had paid (RSVP'd yes, paid but didn't show up)
  // Use Anita Mandal ($400 — she paid but this scenario simulates no-show)
  const s6member = withPayment.find(m => (m.email || '').toLowerCase() === 'amandalamandal@yahoo.com')
                || withPayment[3];
  scenarios.missedWithPay = {
    member: s6member,
    label: 'RSVP Yes + Did NOT Attend + Had Paid $400',
    firstName: (s6member.displayName || '').split(' ')[0] || 'Anita',
    name: s6member.displayName || 'Anita Mandal',
    totalPaid: (s6member.paymentRecords || []).reduce((s, p) => s + (p.amount || 0), 0),
    acknowledged: false,
    purpose: 'membership'
  };

  return scenarios;
}

// ═══════════════════════════════════════════════════════════════════
// EMAIL TEMPLATES (from main agent, adapted for test)
// ═══════════════════════════════════════════════════════════════════

function buildThankYouEmail(firstName, aggregateData) {
  const sentDate = new Date().toLocaleDateString('en-US', {
    timeZone: 'America/New_York', weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });

  const agg = aggregateData || {};
  let paymentSection = '';
  if (agg.unacknowledgedAmount > 0) {
    const purpose = (agg.paymentPurpose || 'membership').replace(/_/g, ' ');
    paymentSection = `
    <!-- Payment Acknowledgment (Auto-aggregated) -->
    <div style="background:linear-gradient(135deg,#f3e5f5,#ede7f6);border:2px solid #9c27b0;border-radius:12px;padding:20px;margin:20px 0">
      <p style="font-size:.92rem;color:#4a148c;line-height:1.75;margin:0 0 12px">
        <strong>💜 Payment Received — Thank You!</strong>
      </p>
      <p style="font-size:.9rem;color:#4a148c;line-height:1.75;margin:0">
        We also want to <strong>acknowledge your payment of $${agg.unacknowledgedAmount}</strong>
        for <strong>${purpose}</strong>.
        We sincerely appreciate your generosity and financial support for BANF.
        ${agg.paymentNote ? '<br><span style="font-size:.82rem;color:#6a1b9a">' + agg.paymentNote + '</span>' : ''}
      </p>
    </div>
    `;
  }

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Thank You — Bosonto Utsob 2026</title></head>
<body style="margin:0;padding:0;background:#f5f7fa;font-family:'Segoe UI',Arial,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f7fa;padding:30px 0">
<tr><td align="center">
<table width="620" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.1)">

  <!-- Header -->
  <tr><td style="background:linear-gradient(135deg,#006A4E,#2E8B57);padding:32px 40px;text-align:center">
    <h1 style="color:#fff;margin:0;font-size:1.5rem;font-weight:700">ধন্যবাদ / Thank You!</h1>
    <p style="color:rgba(255,255,255,.9);margin:10px 0 0;font-size:1rem;letter-spacing:.3px">
      Bosonto Utsob 2026 — A Heartfelt Note
    </p>
  </td></tr>

  <!-- Body -->
  <tr><td style="padding:36px 40px 16px">

    <p style="font-size:1rem;color:#333;line-height:1.7;margin:0 0 16px">
      Dear ${firstName},
    </p>

    <p style="font-size:.95rem;color:#444;line-height:1.75;margin:0 0 16px">
      On behalf of the entire Executive Committee of the <strong>Bengali Association of North Florida (BANF)</strong>,
      we want to sincerely <strong>thank you</strong> for attending <strong>Bosonto Utsob 2026</strong> on ${CONFIG.EVENT_DATE}.
    </p>

    <!-- Apology Box -->
    <div style="background:#fff8e1;border:1px solid #ffecb3;border-radius:12px;padding:20px;margin:20px 0">
      <p style="font-size:.92rem;color:#5d4037;line-height:1.75;margin:0 0 12px">
        <strong>🙏 Sincere Apologies</strong>
      </p>
      <p style="font-size:.9rem;color:#5d4037;line-height:1.75;margin:0 0 10px">
        We sincerely apologise for the <strong>last-moment venue change</strong> and the inconvenience it caused.
        We understand this was unexpected and may have disrupted your plans. We take full responsibility and deeply regret the confusion.
      </p>
      <p style="font-size:.9rem;color:#5d4037;line-height:1.75;margin:0">
        We also want to express our regret that we <strong>could not celebrate Holi</strong> as originally planned, 
        due to the change in venue. Playing Holi together has always been a cherished highlight of Bosonto,
        and we are truly sorry that this year's celebration missed that joyful tradition.
      </p>
    </div>

    <!-- Thank You Box -->
    <div style="background:linear-gradient(135deg,#e8f5e9,#f1f8e9);border:2px solid #4caf50;border-radius:12px;padding:20px;margin:20px 0">
      <p style="font-size:.92rem;color:#2e7d32;line-height:1.75;margin:0 0 12px">
        <strong>💚 Your Spirit Made the Difference</strong>
      </p>
      <p style="font-size:.9rem;color:#33691e;line-height:1.75;margin:0">
        Despite the challenges, we were deeply moved by your <strong>cooperation, warmth, and positive spirit</strong>.
        Seeing the <strong>smiles and enjoyment on your faces</strong> — especially under the circumstances — 
        gave us immense motivation and strength. Your grace and understanding will drive us to do better,
        and we are committed to correcting and improving things going forward.
      </p>
    </div>

    <p style="font-size:.95rem;color:#444;line-height:1.75;margin:16px 0">
      Your continued support is what makes BANF a true community. Thank you for standing with us.
    </p>

    ${paymentSection}

    <!-- Next Event Box -->
    <div style="background:#e3f2fd;border:1px solid #bbdefb;border-radius:12px;padding:20px;margin:20px 0">
      <p style="font-size:.92rem;color:#1565c0;line-height:1.75;margin:0 0 8px">
        <strong>📅 Coming Up Next — ${CONFIG.NEXT_EVENT}</strong>
      </p>
      <p style="font-size:.9rem;color:#1976d2;line-height:1.75;margin:0">
        We look forward to seeing you at <strong>${CONFIG.NEXT_EVENT}</strong> on <strong>${CONFIG.NEXT_EVENT_DATE}</strong>!
        More details will follow soon. Let's make this one even more special together.
      </p>
    </div>

    <p style="font-size:.95rem;color:#444;line-height:1.75;margin:16px 0 4px">
      With heartfelt gratitude,
    </p>
    <p style="font-size:.95rem;color:#333;line-height:1.6;margin:0 0 4px">
      <strong>The BANF Executive Committee</strong><br>
      <span style="font-size:.85rem;color:#666">Bengali Association of North Florida</span>
    </p>

  </td></tr>

  <!-- Privacy Notice -->
  <tr><td style="background:#f0f4f8;border-top:1px solid #dde3ea;padding:18px 40px">
    <p style="margin:0;font-size:.78rem;color:#888;line-height:1.7">
      🔒 This email was sent to BANF community members who attended Bosonto Utsob 2026. 
      Your information is used solely for BANF community communications. 
      You may <a href="mailto:banfjax@gmail.com?subject=Unsubscribe" style="color:#006A4E">unsubscribe</a> or request data erasure at any time.
    </p>
  </td></tr>

  <!-- Footer -->
  <tr><td style="background:#f9f9f9;border-top:1px solid #eee;padding:14px 40px;text-align:center">
    <p style="margin:0 0 4px;font-size:.75rem;color:#999">
      <a href="mailto:banfjax@gmail.com?subject=Unsubscribe" style="color:#006A4E;text-decoration:underline">Unsubscribe</a>
       &nbsp;|&nbsp; Sent on ${sentDate}
    </p>
    <p style="margin:0;font-size:.73rem;color:#bbb">&copy; 2026 Bengali Association of North Florida (BANF). All rights reserved.</p>
    <p style="margin:4px 0 0;font-size:.7rem;color:#ccc">jaxbengali.org &nbsp;|&nbsp; banfjax@gmail.com &nbsp;|&nbsp; Jacksonville, FL</p>
  </td></tr>

</table></td></tr></table></body></html>`;
}


function buildMissedEmail(firstName) {
  const sentDate = new Date().toLocaleDateString('en-US', {
    timeZone: 'America/New_York', weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>We Missed You — Bosonto Utsob 2026</title></head>
<body style="margin:0;padding:0;background:#f5f7fa;font-family:'Segoe UI',Arial,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f7fa;padding:30px 0">
<tr><td align="center">
<table width="620" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.1)">

  <!-- Header -->
  <tr><td style="background:linear-gradient(135deg,#5c6bc0,#7986cb);padding:32px 40px;text-align:center">
    <h1 style="color:#fff;margin:0;font-size:1.5rem;font-weight:700">আমরা আপনাকে মিস করেছি / We Missed You</h1>
    <p style="color:rgba(255,255,255,.9);margin:10px 0 0;font-size:1rem;letter-spacing:.3px">
      Bosonto Utsob 2026 — A Note from BANF
    </p>
  </td></tr>

  <!-- Body -->
  <tr><td style="padding:36px 40px 16px">

    <p style="font-size:1rem;color:#333;line-height:1.7;margin:0 0 16px">
      Dear ${firstName},
    </p>

    <p style="font-size:.95rem;color:#444;line-height:1.75;margin:0 0 16px">
      On behalf of the <strong>Bengali Association of North Florida (BANF)</strong> Executive Committee,
      we wanted to reach out regarding <strong>Bosonto Utsob 2026</strong> held on ${CONFIG.EVENT_DATE}.
    </p>

    <p style="font-size:.95rem;color:#444;line-height:1.75;margin:0 0 16px">
      We noticed that you were unable to join us, and we completely <strong>understand</strong>.
      We know that circumstances arise and things don't always go as planned — and that's perfectly okay.
    </p>

    <!-- Apology Box -->
    <div style="background:#fff8e1;border:1px solid #ffecb3;border-radius:12px;padding:20px;margin:20px 0">
      <p style="font-size:.92rem;color:#5d4037;line-height:1.75;margin:0 0 12px">
        <strong>🙏 Our Sincere Apologies</strong>
      </p>
      <p style="font-size:.9rem;color:#5d4037;line-height:1.75;margin:0 0 10px">
        We want to sincerely apologise for the <strong>last-moment venue change</strong> that happened. 
        We understand this may have been a contributing factor, and we take full responsibility for the 
        inconvenience and confusion it caused. This should not have happened, and we deeply regret it.
      </p>
      <p style="font-size:.9rem;color:#5d4037;line-height:1.75;margin:0">
        The venue change also meant we <strong>could not celebrate Holi</strong> as originally planned,
        which was a disappointment for everyone. We are truly sorry for this missed tradition.
      </p>
    </div>

    <!-- Commitment Box -->
    <div style="background:linear-gradient(135deg,#e8eaf6,#ede7f6);border:2px solid #7986cb;border-radius:12px;padding:20px;margin:20px 0">
      <p style="font-size:.92rem;color:#283593;line-height:1.75;margin:0 0 12px">
        <strong>🤝 Our Commitment to You</strong>
      </p>
      <p style="font-size:.9rem;color:#303f9f;line-height:1.75;margin:0">
        We are committed to <strong>rectifying these issues going forward</strong>. Your trust in our community
        matters deeply to us. We will work harder to ensure future events run smoothly, with better planning,
        timely communication, and no last-minute surprises. You deserve better, and we will deliver.
      </p>
    </div>

    <!-- Next Event Box -->
    <div style="background:#e3f2fd;border:1px solid #bbdefb;border-radius:12px;padding:20px;margin:20px 0">
      <p style="font-size:.92rem;color:#1565c0;line-height:1.75;margin:0 0 8px">
        <strong>📅 Coming Up Next — ${CONFIG.NEXT_EVENT}</strong>
      </p>
      <p style="font-size:.9rem;color:#1976d2;line-height:1.75;margin:0">
        We would love to see you at <strong>${CONFIG.NEXT_EVENT}</strong> on <strong>${CONFIG.NEXT_EVENT_DATE}</strong>!
        More details will follow soon. Let's start fresh and make this one a wonderful experience together.
      </p>
    </div>

    <p style="font-size:.95rem;color:#444;line-height:1.75;margin:16px 0 4px">
      Warmly,
    </p>
    <p style="font-size:.95rem;color:#333;line-height:1.6;margin:0 0 4px">
      <strong>The BANF Executive Committee</strong><br>
      <span style="font-size:.85rem;color:#666">Bengali Association of North Florida</span>
    </p>

  </td></tr>

  <!-- Privacy Notice -->
  <tr><td style="background:#f0f4f8;border-top:1px solid #dde3ea;padding:18px 40px">
    <p style="margin:0;font-size:.78rem;color:#888;line-height:1.7">
      🔒 This email was sent to BANF community members who were registered for Bosonto Utsob 2026. 
      Your information is used solely for BANF community communications. 
      You may <a href="mailto:banfjax@gmail.com?subject=Unsubscribe" style="color:#5c6bc0">unsubscribe</a> or request data erasure at any time.
    </p>
  </td></tr>

  <!-- Footer -->
  <tr><td style="background:#f9f9f9;border-top:1px solid #eee;padding:14px 40px;text-align:center">
    <p style="margin:0 0 4px;font-size:.75rem;color:#999">
      <a href="mailto:banfjax@gmail.com?subject=Unsubscribe" style="color:#5c6bc0;text-decoration:underline">Unsubscribe</a>
       &nbsp;|&nbsp; Sent on ${sentDate}
    </p>
    <p style="margin:0;font-size:.73rem;color:#bbb">&copy; 2026 Bengali Association of North Florida (BANF). All rights reserved.</p>
    <p style="margin:4px 0 0;font-size:.7rem;color:#ccc">jaxbengali.org &nbsp;|&nbsp; banfjax@gmail.com &nbsp;|&nbsp; Jacksonville, FL</p>
  </td></tr>

</table></td></tr></table></body></html>`;
}


// ═══════════════════════════════════════════════════════════════════
// GMAIL TRANSPORT
// ═══════════════════════════════════════════════════════════════════

async function createTransporter() {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      type: 'OAuth2',
      user: CONFIG.BANF_EMAIL,
      clientId: GMAIL.CLIENT_ID,
      clientSecret: GMAIL.CLIENT_SECRET,
      refreshToken: GMAIL.REFRESH_TOKEN
    }
  });
  await transporter.verify();
  return transporter;
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }


// ═══════════════════════════════════════════════════════════════════
// MAIN — Build & Send All 6 Scenario Emails
// ═══════════════════════════════════════════════════════════════════

async function main() {
  console.log('');
  console.log('  ╔═══════════════════════════════════════════════════════════╗');
  console.log('  ║  BANF Post-Event Email — SCENARIO TEST HARNESS           ║');
  console.log('  ║  Sending ALL 6 scenario templates to Ranadhir            ║');
  console.log('  ╚═══════════════════════════════════════════════════════════╝');
  console.log('');

  // 1. Load real member data
  console.log('  📊 Loading real CRM member data for scenarios...');
  const scenarios = loadScenarioMembers();

  // 2. Show scenario plan
  const testEmails = [
    {
      scenario: 1,
      label: scenarios.attendedPaidUnacked.label,
      realName: scenarios.attendedPaidUnacked.name,
      type: 'thankyou',
      subject: `[TEST 1/6] THANK-YOU — ${scenarios.attendedPaidUnacked.name}: ${scenarios.attendedPaidUnacked.label}`,
      firstName: scenarios.attendedPaidUnacked.firstName,
      aggregate: {
        unacknowledgedAmount: scenarios.attendedPaidUnacked.totalPaid,
        paymentPurpose: 'membership',
        paymentNote: `Classified as M2 Premium membership — $${scenarios.attendedPaidUnacked.totalPaid} via Zelle. This payment has been recorded in the BANF ledger.`
      }
    },
    {
      scenario: 2,
      label: scenarios.attendedPaidAcked.label,
      realName: scenarios.attendedPaidAcked.name,
      type: 'thankyou',
      subject: `[TEST 2/6] THANK-YOU — ${scenarios.attendedPaidAcked.name}: ${scenarios.attendedPaidAcked.label}`,
      firstName: scenarios.attendedPaidAcked.firstName,
      aggregate: {
        unacknowledgedAmount: 0,  // Already acknowledged — no payment section
        paymentPurpose: null,
        paymentNote: null
      }
    },
    {
      scenario: 3,
      label: scenarios.attendedNoPay.label,
      realName: scenarios.attendedNoPay.name,
      type: 'thankyou',
      subject: `[TEST 3/6] THANK-YOU — ${scenarios.attendedNoPay.name}: ${scenarios.attendedNoPay.label}`,
      firstName: scenarios.attendedNoPay.firstName,
      aggregate: {
        unacknowledgedAmount: 0,
        paymentPurpose: null,
        paymentNote: null
      }
    },
    {
      scenario: 4,
      label: scenarios.attendedSponsor.label,
      realName: scenarios.attendedSponsor.name,
      type: 'thankyou',
      subject: `[TEST 4/6] THANK-YOU — ${scenarios.attendedSponsor.name}: ${scenarios.attendedSponsor.label}`,
      firstName: scenarios.attendedSponsor.firstName,
      aggregate: {
        unacknowledgedAmount: scenarios.attendedSponsor.totalPaid,
        paymentPurpose: 'sponsorship',
        paymentNote: `$${scenarios.attendedSponsor.totalPaid} classified as Bronze-level sponsorship. Your generous sponsorship helps fund BANF events and cultural programming. Thank you!`
      }
    },
    {
      scenario: 5,
      label: scenarios.missedNoPay.label,
      realName: scenarios.missedNoPay.name,
      type: 'missed',
      subject: `[TEST 5/6] MISSED-YOU — ${scenarios.missedNoPay.name}: ${scenarios.missedNoPay.label}`,
      firstName: scenarios.missedNoPay.firstName,
      aggregate: null
    },
    {
      scenario: 6,
      label: scenarios.missedWithPay.label,
      realName: scenarios.missedWithPay.name,
      type: 'missed',
      subject: `[TEST 6/6] MISSED-YOU — ${scenarios.missedWithPay.name}: ${scenarios.missedWithPay.label}`,
      firstName: scenarios.missedWithPay.firstName,
      aggregate: null  // Missed email doesn't show payment — but this tests the scenario
    }
  ];

  console.log('\n  📋 Test Plan (6 emails → ranadhir.ghosh@gmail.com):');
  console.log('  ─────────────────────────────────────────────────────');
  testEmails.forEach(t => {
    const icon = t.type === 'thankyou' ? '💚' : '💜';
    console.log(`    ${icon} ${t.scenario}. [${t.type.toUpperCase()}] ${t.realName}`);
    console.log(`       ${t.label}`);
    if (t.aggregate && t.aggregate.unacknowledgedAmount > 0) {
      console.log(`       💰 Payment section: $${t.aggregate.unacknowledgedAmount} (${t.aggregate.paymentPurpose})`);
    }
  });

  // 3. Create transporter
  console.log('\n  🔑 Creating Gmail OAuth2 transporter...');
  const transporter = await createTransporter();
  console.log('  ✅ Transporter verified.\n');

  // 4. Send each scenario email
  const results = [];
  for (const t of testEmails) {
    const html = t.type === 'thankyou'
      ? buildThankYouEmail(t.firstName, t.aggregate)
      : buildMissedEmail(t.firstName);

    try {
      const info = await transporter.sendMail({
        from: `"${CONFIG.BANF_NAME}" <${CONFIG.BANF_EMAIL}>`,
        to: `"RANADHIR GHOSH" <${TEST_RECIPIENT}>`,
        subject: t.subject,
        html: html,
      });

      const icon = t.type === 'thankyou' ? '💚' : '💜';
      console.log(`  ${icon} [${t.scenario}/6] ✅ Sent → ${t.subject.substring(0, 80)}...`);
      console.log(`       Real member: ${t.realName} | MessageID: ${info.messageId}`);
      results.push({ scenario: t.scenario, status: 'sent', messageId: info.messageId, label: t.label });
    } catch (err) {
      console.log(`  ❌ [${t.scenario}/6] FAILED: ${err.message}`);
      results.push({ scenario: t.scenario, status: 'failed', error: err.message, label: t.label });
    }

    // Brief delay between emails (avoid rate limiting)
    if (t.scenario < 6) {
      await sleep(3000);
    }
  }

  // 5. Summary
  const sent = results.filter(r => r.status === 'sent').length;
  const failed = results.filter(r => r.status === 'failed').length;

  console.log('\n  ═══════════════════════════════════════════════════════');
  console.log('   TEST SUMMARY');
  console.log('  ─────────────────────────────────────────────────────');
  console.log(`   Total scenarios:  6`);
  console.log(`   ✅ Sent:          ${sent}`);
  console.log(`   ❌ Failed:        ${failed}`);
  console.log(`   📬 Recipient:     ${TEST_RECIPIENT}`);
  console.log('  ─────────────────────────────────────────────────────');
  console.log('   Scenario Breakdown:');
  results.forEach(r => {
    console.log(`     ${r.status === 'sent' ? '✅' : '❌'} ${r.scenario}. ${r.label}`);
  });
  console.log('  ═══════════════════════════════════════════════════════');
  console.log('');
  console.log('  📧 Check ranadhir.ghosh@gmail.com inbox for all 6 test emails.');
  console.log('  Each subject line identifies the scenario number and member name.');
  console.log('');

  // Save results
  fs.writeFileSync(path.join(__dirname, 'banf-post-event-test-results.json'), JSON.stringify({
    timestamp: new Date().toISOString(),
    testRecipient: TEST_RECIPIENT,
    scenarios: results
  }, null, 2));
}

main().catch(err => {
  console.error('\n  ❌ Fatal error:', err.message);
  process.exit(1);
});
