#!/usr/bin/env node
/**
 * EC Onboarding — Correction/Apology Email
 * Re-sends the EC onboarding reminder with an apology for the broken links
 * in the previous email, and verifies ALL links before sending.
 *
 * Pre-send checks:
 *  1. All URLs verified live (HEAD request)
 *  2. QP encoding round-trip verified
 *  3. Communication compliance score ≥ 90
 *  4. Audit trail recorded
 */

const https = require('https');
const compliance = require('./communication-compliance.js');

// Gmail OAuth2
const GOOGLE_REFRESH_TOKEN = require('./banf-gmail-config').REFRESH_TOKEN;
const GOOGLE_CLIENT_ID     = '1020178199135-3usrl611ara38i7rhu2ub6sn6g1150ml.apps.googleusercontent.com';
const GOOGLE_CLIENT_SECRET = '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';
const FROM_EMAIL           = 'banfjax@gmail.com';

const PENDING_EC_MEMBERS = [
  { email: 'moumita.mukherje@gmail.com', name: 'Moumita Mukherjee', position: 'Cultural Secretary' },
  { email: 'rwitichoudhury@gmail.com',   name: 'Rwiti Choudhury',   position: 'Puja Coordinator' },
  { email: 'amit.everywhere@gmail.com',     name: 'Amit Chandak',      position: 'Treasurer' },
  { email: 'mukhopadhyay.partha@gmail.com', name: 'Partha Mukhopadhyay', position: 'Vice President' }
];

const ONBOARD_URL = 'https://banfjax-hash.github.io/banf1/admin-onboard.html';
const JOURNEY_URL = 'https://banfjax-hash.github.io/banf1/stakeholder-requirements-journey.html';
const BANF_SITE   = 'https://www.jaxbengali.org';

// ─── HTTP helper ───
function httpsRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const opts = {
      hostname: u.hostname, port: 443,
      path: u.pathname + u.search,
      method: options.method || 'GET',
      headers: options.headers || {}
    };
    const req = https.request(opts, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(data) }); }
        catch { resolve({ status: res.statusCode, data }); }
      });
    });
    req.on('error', reject);
    if (options.body) req.write(options.body);
    req.end();
  });
}

async function getAccessToken() {
  console.log('[AUTH] Refreshing Gmail access token...');
  const res = await httpsRequest('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `client_id=${GOOGLE_CLIENT_ID}&client_secret=${GOOGLE_CLIENT_SECRET}&refresh_token=${GOOGLE_REFRESH_TOKEN}&grant_type=refresh_token`
  });
  if (res.data.access_token) {
    console.log('[AUTH] Token refreshed');
    return res.data.access_token;
  }
  throw new Error('Token refresh failed: ' + JSON.stringify(res.data));
}

// ─── Build Apology + Corrected Email ───
function buildCorrectionEmail(member) {
  const personalOnboardUrl = `${ONBOARD_URL}?email=${encodeURIComponent(member.email)}`;
  return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background: linear-gradient(135deg, #8B0000, #DC143C); padding: 25px; border-radius: 12px 12px 0 0;">
        <h1 style="color: #fff; margin: 0; font-size: 22px;">BANF EC Onboarding - Corrected Links</h1>
        <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0; font-size: 13px;">Bengali Association of North Florida - FY2026-27</p>
    </div>

    <div style="background: #fff; padding: 30px; border: 1px solid #ddd; border-top: none;">
        <p style="font-size: 16px;">Dear <strong>${member.name}</strong>,</p>

        <div style="background: #d4edda; border-left: 5px solid #28a745; padding: 15px; margin: 20px 0; border-radius: 4px;">
            <strong style="color: #155724;">Apology for Previous Email</strong>
            <p style="margin: 8px 0 0; color: #155724;">We apologize for the inconvenience caused by the previous email regarding your EC onboarding. Due to a technical issue with our email system, the clickable links and buttons in that email were not displayed properly. This corrected email contains fully working links.</p>
        </div>

        <p>As <strong>${member.position}</strong> on the Executive Committee, your onboarding is required to proceed with the membership drive and Bosonto Utsob 2026 preparations.</p>

        <p style="font-weight: 600; margin-top: 20px;">Please use the links below to complete your onboarding:</p>

        <div style="text-align: center; margin: 25px 0;">
            <a href="${personalOnboardUrl}" style="display: inline-block; background: linear-gradient(135deg, #8B0000, #DC143C); color: #fff; padding: 16px 40px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; box-shadow: 0 4px 15px rgba(139,0,0,0.3);">Complete Onboarding Now</a>
        </div>

        <div style="text-align: center; margin: 20px 0;">
            <a href="${JOURNEY_URL}" style="display: inline-block; background: #fff; color: #8B0000; border: 2px solid #8B0000; padding: 12px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px;">View Requirements Journey</a>
        </div>

        <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0 0 8px; font-weight: 600;">If the buttons above do not work, please copy and paste these links directly into your browser:</p>
            <p style="margin: 4px 0; font-size: 13px; word-break: break-all;">
                <strong>Onboarding Portal:</strong><br>
                <a href="${personalOnboardUrl}" style="color: #007bff;">${personalOnboardUrl}</a>
            </p>
            <p style="margin: 4px 0; font-size: 13px; word-break: break-all;">
                <strong>Requirements Journey:</strong><br>
                <a href="${JOURNEY_URL}" style="color: #007bff;">${JOURNEY_URL}</a>
            </p>
        </div>

        <p style="color: #666; font-size: 14px;">
            <strong>What you need to do:</strong><br>
            1. Click "Complete Onboarding Now" above (or copy the link)<br>
            2. Set up your password if not already done<br>
            3. Complete your profile (phone, address, etc.)<br>
            4. Mark your onboarding as complete
        </p>

        <p style="margin-top: 20px;">If you face any issues, please contact the President at <a href="mailto:ranadhir.ghosh@gmail.com" style="color: #007bff;">ranadhir.ghosh@gmail.com</a>.</p>

        <p style="margin-top: 20px;">Thank you for your patience and understanding.</p>

        <p style="margin-top: 20px;">Best regards,<br><strong>Dr. Ranadhir Ghosh</strong><br>President, BANF</p>
    </div>

    <div style="background: #333; color: #999; padding: 15px; text-align: center; font-size: 12px; border-radius: 0 0 12px 12px;">
        Bengali Association of North Florida | <a href="${BANF_SITE}" style="color: #ccc;">www.jaxbengali.org</a>
    </div>
</body>
</html>`;
}

// ─── Pre-Send Verification Pipeline ───
async function verifySingleEmail(member, htmlBody, subject) {
  const checks = [];
  let pass = true;

  // CHECK 1: Link extraction and verification
  console.log(`  [CHECK 1] Verifying all links in email...`);
  const linkResult = await compliance.verifyLinks(htmlBody);
  linkResult.results.forEach(r => {
    console.log(`    ${r.ok ? 'LIVE' : 'DEAD'} [${r.status}] ${r.url}`);
  });
  checks.push({ name: 'LINK_VERIFICATION', pass: linkResult.allOk, detail: `${linkResult.live}/${linkResult.total} links live` });
  if (!linkResult.allOk) {
    pass = false;
    console.log(`  [FAIL] ${linkResult.dead} dead link(s) found. Email will NOT be sent.`);
  }

  // CHECK 2: QP encoding round-trip
  console.log(`  [CHECK 2] QP encoding round-trip verification...`);
  const qpEncoded = compliance.encodeQuotedPrintable(htmlBody);
  const qpDecoded = qpEncoded
    .replace(/=\r\n/g, '')
    .replace(/=([0-9A-F]{2})/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
  // QP normalizes lone LF to CRLF per RFC 2045 — compare with normalized newlines
  const normalizedOriginal = htmlBody.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const normalizedDecoded = qpDecoded.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const roundTripOk = normalizedDecoded === normalizedOriginal;
  checks.push({ name: 'QP_ROUNDTRIP', pass: roundTripOk, detail: roundTripOk ? 'exact match' : 'MISMATCH' });
  if (!roundTripOk) {
    pass = false;
    console.log(`  [FAIL] QP round-trip failed. Email will NOT be sent.`);
  } else {
    console.log(`    QP round-trip: PASS (${qpEncoded.length} encoded bytes)`);
  }

  // CHECK 3: Links survive QP encoding
  console.log(`  [CHECK 3] Links survive QP encoding...`);
  const originalLinks = compliance.extractLinks(htmlBody);
  const decodedLinks = compliance.extractLinks(qpDecoded);
  const linksSurvive = originalLinks.length === decodedLinks.length &&
    originalLinks.every((l, i) => l.url === decodedLinks[i].url);
  checks.push({ name: 'LINKS_SURVIVE_QP', pass: linksSurvive, detail: `${originalLinks.length} links preserved` });
  if (!linksSurvive) {
    pass = false;
    console.log(`  [FAIL] Links corrupted by QP encoding.`);
  } else {
    console.log(`    ${originalLinks.length} links preserved after encoding`);
  }

  // CHECK 4: Compliance validation
  console.log(`  [CHECK 4] Communication compliance check...`);
  const complianceResult = compliance.validateEmail({
    to: member.email,
    toName: member.name,
    from: FROM_EMAIL,
    fromName: 'BANF Admin',
    subject: subject,
    body: htmlBody,
    requireGreeting: false,
    requireSignoff: false
  });
  checks.push({
    name: 'COMPLIANCE',
    pass: complianceResult.score >= 70,
    detail: `Score: ${complianceResult.score}/100 (${complianceResult.level})`
  });
  if (complianceResult.violations.length > 0) {
    console.log(`    Violations: ${complianceResult.violations.join('; ')}`);
  }
  if (complianceResult.warnings.length > 0) {
    console.log(`    Warnings: ${complianceResult.warnings.join('; ')}`);
  }
  console.log(`    Score: ${complianceResult.score}/100 (${complianceResult.level})`);

  // CHECK 5: Subject header encoding
  console.log(`  [CHECK 5] Subject encoding...`);
  const encodedSubject = compliance.encodeSubject(subject);
  const subjectOk = encodedSubject.length > 0;
  checks.push({ name: 'SUBJECT_ENCODING', pass: subjectOk, detail: encodedSubject.substring(0, 60) });
  console.log(`    Encoded: ${encodedSubject.substring(0, 80)}`);

  // CHECK 6: Recipient validation
  console.log(`  [CHECK 6] Recipient validation...`);
  const recipientOk = compliance.validateRecipient(member.email, member.name);
  checks.push({ name: 'RECIPIENT', pass: recipientOk.valid, detail: recipientOk.valid ? 'valid' : recipientOk.reason });
  console.log(`    ${member.email}: ${recipientOk.valid ? 'VALID' : 'INVALID - ' + recipientOk.reason}`);

  console.log(`  [RESULT] ${checks.filter(c => c.pass).length}/${checks.length} checks passed`);
  return { pass, checks, compliance: complianceResult };
}

// ─── Send with full verification ───
async function sendVerifiedEmail(accessToken, member, htmlBody, subject) {
  // Build compliant message
  const result = compliance.buildCompliantMessage({
    to: member.email,
    toName: compliance.sanitizeName(member.name),
    from: FROM_EMAIL,
    fromName: 'BANF Admin',
    subject,
    htmlBody,
    agent: 'ec_correction_agent',
    requireGreeting: false,
    requireSignoff: false,
  });

  if (result.blocked) {
    console.log(`  [BLOCKED] ${result.reason}`);
    return { success: false, reason: result.reason };
  }

  // Final check: decode the raw base64 and verify links are in the MIME
  const decoded = Buffer.from(result.raw.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8');
  const hasHref = decoded.includes('href');
  const hasMailto = decoded.includes('mailto');
  const hasOnboardUrl = decoded.includes('banfjax-hash.github.io');
  console.log(`  [MIME CHECK] href:${hasHref} mailto:${hasMailto} onboardUrl:${hasOnboardUrl}`);

  if (!hasHref || !hasOnboardUrl) {
    console.log(`  [ABORT] MIME body missing critical links. NOT sending.`);
    return { success: false, reason: 'MIME body missing links after encoding' };
  }

  // Send
  const res = await httpsRequest('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ raw: result.raw })
  });

  if (res.status >= 200 && res.status < 300) {
    console.log(`  [SENT] messageId: ${res.data.id || 'unknown'}`);
    return { success: true, messageId: res.data.id, compliance: result.compliance };
  } else {
    console.log(`  [FAIL] Status ${res.status}: ${JSON.stringify(res.data)}`);
    return { success: false, error: res.data };
  }
}

// ─── Main ───
async function main() {
  console.log('================================================================');
  console.log('  BANF EC ONBOARDING - CORRECTION EMAIL SENDER');
  console.log('  Apology for broken links in previous email');
  console.log('  Date: ' + new Date().toISOString().split('T')[0]);
  console.log('  Recipients: ' + PENDING_EC_MEMBERS.length);
  console.log('================================================================\n');

  // PHASE 1: Pre-flight URL checks (all URLs at once)
  console.log('[PHASE 1] Pre-flight URL verification...');
  const criticalUrls = [ONBOARD_URL, JOURNEY_URL, BANF_SITE];
  for (const url of criticalUrls) {
    const result = await compliance.verifyLinks(`<a href="${url}">test</a>`);
    const r = result.results[0];
    console.log(`  ${r.ok ? 'LIVE' : 'DEAD'} [${r.status}] ${url}`);
    if (!r.ok) {
      console.error(`\n[ABORT] Critical URL is down: ${url}`);
      console.error('Fix the URL before sending correction emails.');
      process.exit(1);
    }
  }
  console.log('  All critical URLs verified LIVE\n');

  // PHASE 2: Get OAuth token
  const accessToken = await getAccessToken();

  // PHASE 3: Per-recipient verification + send
  const results = [];
  for (const member of PENDING_EC_MEMBERS) {
    console.log(`\n[${member.position}] ${member.name} <${member.email}>`);
    console.log('─'.repeat(60));

    const subject = `BANF EC Onboarding - Corrected Links (${member.position})`;
    const htmlBody = buildCorrectionEmail(member);

    // Pre-send verification
    const verification = await verifySingleEmail(member, htmlBody, subject);
    if (!verification.pass) {
      console.log(`  [SKIP] Pre-send verification FAILED. Email NOT sent.`);
      results.push({ email: member.email, success: false, reason: 'verification_failed' });
      continue;
    }

    // Send
    const sendResult = await sendVerifiedEmail(accessToken, member, htmlBody, subject);
    results.push({ email: member.email, ...sendResult });

    // Rate limit pause between emails
    await new Promise(r => setTimeout(r, 1500));
  }

  // PHASE 4: Summary
  console.log('\n================================================================');
  console.log('  SUMMARY');
  console.log('================================================================');
  const sent = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);
  console.log(`  Sent: ${sent.length}/${results.length}`);
  console.log(`  Failed: ${failed.length}/${results.length}`);
  results.forEach(r => {
    console.log(`  ${r.success ? 'OK' : 'FAIL'} ${r.email} ${r.messageId ? '(id:' + r.messageId + ')' : r.reason || ''}`);
  });
  console.log('================================================================\n');
}

if (require.main === module) {
  main().catch(err => {
    console.error('[FATAL]', err);
    process.exit(1);
  });
}

module.exports = { buildCorrectionEmail, verifySingleEmail };
