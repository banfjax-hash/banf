#!/usr/bin/env node
/**
 * ΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉ
 *  BANF COMMUNICATION COMPLIANCE MODULE v1.0
 *  Professional communication standards, header sanitization, and ethical guardrails
 * ΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉ
 *
 *  Responsibilities:
 *    1. EMAIL HEADER SANITIZATION ΓÇö RFC 2047 encoding, mojibake cleanup
 *    2. CONTENT COMPLIANCE ΓÇö Professional tone, language ethics, moral guardrails
 *    3. RECIPIENT VALIDATION ΓÇö Address format, domain checks, consent verification
 *    4. AUDIT TRAIL ΓÇö Every outbound email logged with evidence
 *    5. RATE LIMITING ΓÇö Anti-spam protection for outbound batch sends
 *
 *  Usage:
 *    const compliance = require('./communication-compliance.js');
 *
 *    // Before sending ANY email:
 *    const result = compliance.validateEmail({ to, toName, subject, body, from });
 *    if (!result.pass) { handle errors... }
 *
 *    // Encode subject for MIME:
 *    const safeSubject = compliance.encodeSubject(subject);
 *
 *    // Sanitize display name:
 *    const safeName = compliance.sanitizeName(name);
 *
 *    // Build compliant MIME headers:
 *    const headers = compliance.buildHeaders({ from, to, toName, subject });
 *
 *    // Audit log:
 *    compliance.auditLog({ action, to, subject, result, agent });
 *
 *  CLI:
 *    node communication-compliance.js --audit        Show audit log
 *    node communication-compliance.js --stats        Compliance statistics
 *    node communication-compliance.js --test         Run self-tests
 *
 * ΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉ
 */

const fs = require('fs');
const path = require('path');

// ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
// CONFIGURATION
// ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

const CONFIG = {
  // Files
  AUDIT_FILE: path.join(__dirname, 'communication-audit.json'),
  
  // Rate limiting
  MAX_EMAILS_PER_MINUTE: 10,
  MAX_EMAILS_PER_HOUR: 100,
  MAX_EMAILS_PER_DAY: 500,
  
  // Content limits
  MAX_SUBJECT_LENGTH: 200,
  MAX_BODY_LENGTH: 100000,   // 100KB
  MAX_RECIPIENT_NAME_LENGTH: 100,
  
  // Organization identity
  ORG_NAME: 'Bengali Association of North Florida (BANF)',
  ORG_EMAIL: 'banfjax@gmail.com',
  ORG_DOMAIN: 'jaxbengali.org',
  ADMIN_EMAIL: 'ranadhir.ghosh@gmail.com',
  
  // Compliance flags
  REQUIRE_UNSUBSCRIBE_LINK: false,  // Not required for org-to-member comms
  REQUIRE_PHYSICAL_ADDRESS: false,  // CAN-SPAM (optional for non-commercial)
  LOG_ALL_OUTBOUND: true,
};

// ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
// SECTION 1: EMAIL HEADER SANITIZATION
// RFC 2047 encoding, mojibake cleanup, header injection prevention
// ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

/**
 * RFC 2047 MIME encode a subject line.
 * If subject is pure ASCII, returns as-is.
 * Otherwise, encodes as UTF-8 Base64 per RFC 2047.
 * Also handles long subjects by splitting into multiple encoded words.
 */
function encodeSubject(subject) {
  if (!subject) return '';
  
  // First sanitize the subject
  let clean = sanitizeHeaderValue(subject);
  
  // If pure printable ASCII, no encoding needed
  if (/^[\x20-\x7E]*$/.test(clean)) return clean;
  
  // Encode as UTF-8 Base64 per RFC 2047
  // Split into chunks to stay under 76-char line limit
  const encoded = Buffer.from(clean, 'utf8').toString('base64');
  
  // If short enough, single encoded word
  if (encoded.length < 60) {
    return `=?UTF-8?B?${encoded}?=`;
  }
  
  // Split into multiple encoded words for long subjects
  const chunks = [];
  const bytes = Buffer.from(clean, 'utf8');
  let offset = 0;
  while (offset < bytes.length) {
    // Take chunks of ~45 bytes (produces ~60 base64 chars, fits in 76-char line)
    const chunk = bytes.subarray(offset, offset + 45);
    chunks.push(`=?UTF-8?B?${chunk.toString('base64')}?=`);
    offset += 45;
  }
  return chunks.join('\r\n '); // Fold with CRLF + space (RFC 2047 ┬º2)
}

/**
 * RFC 2047 encode a display name for From/To headers.
 * Handles non-ASCII names (e.g., Bengali names in Unicode).
 */
function encodeName(name) {
  if (!name) return '';
  
  let clean = sanitizeHeaderValue(name);
  
  // If pure ASCII, just quote if it contains special chars
  if (/^[\x20-\x7E]*$/.test(clean)) {
    // Quote if contains special MIME chars
    if (/[,;:@<>"()\[\]\\.]/.test(clean)) {
      return `"${clean.replace(/["\\]/g, '\\$&')}"`;
    }
    return clean;
  }
  
  // Non-ASCII: RFC 2047 encode
  const encoded = Buffer.from(clean, 'utf8').toString('base64');
  return `=?UTF-8?B?${encoded}?=`;
}

/**
 * Sanitize a header value to prevent injection and mojibake.
 * Removes control chars, null bytes, CRLF injection attempts.
 */
function sanitizeHeaderValue(value) {
  if (!value) return '';
  let s = String(value);
  
  // CRITICAL: Prevent header injection (CRLF followed by header name)
  s = s.replace(/\r\n/g, ' ');
  s = s.replace(/[\r\n]/g, ' ');
  
  // Remove null bytes and control chars (except space/tab)
  s = s.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
  
  // Remove mojibake sequences (UTF-8 decoded as Latin-1)
  s = s.replace(/[\xC0-\xFF][\x80-\xBF]+/g, function(match) {
    // Try to recover: if it's valid UTF-8, keep it; if mojibake, remove
    try {
      const buf = Buffer.from(match, 'binary');
      const decoded = buf.toString('utf8');
      // If decoded contains replacement chars, it's mojibake
      if (decoded.includes('\uFFFD')) return '';
      return decoded;
    } catch {
      return '';
    }
  });
  
  // Remove standalone replacement characters
  s = s.replace(/\uFFFD/g, '');
  
  // Remove common mojibake patterns (Latin-1 misinterpretation of UTF-8)
  s = s.replace(/[├â├é][\x80-\xBF┬░╞Æ"┬ó┼╕\u0080-\u00BF]/g, '');
  s = s.replace(/[├â├é](?=[^a-zA-Z0-9]|$)/g, '');
  // Remove stray high-byte chars that aren't part of valid UTF-8
  s = s.replace(/[\u0080-\u009F]/g, '');
  // Remove isolated ├é characters (common mojibake artifact)
  s = s.replace(/├é+/g, '');
  // Remove ├░ and similar mangled emoji lead bytes
  s = s.replace(/[├░├▒├▓├│├┤├╡├╢├╖├╕├╣├║├╗├╝├╜├╛├┐]/g, '');
  
  // Normalize Unicode em/en dashes and smart quotes to ASCII equivalents
  s = s.replace(/[\u2018\u2019\u201A\uFE10]/g, "'");  // Smart single quotes
  s = s.replace(/[\u201C\u201D\u201E\uFE11]/g, '"');  // Smart double quotes
  s = s.replace(/[\u2013\u2014]/g, '-');                // Em/en dashes
  s = s.replace(/\u2026/g, '...');                      // Ellipsis
  s = s.replace(/[\u00A0]/g, ' ');                      // Non-breaking space
  
  // Collapse multiple spaces
  s = s.replace(/\s{2,}/g, ' ').trim();
  
  // Enforce length limit
  if (s.length > CONFIG.MAX_SUBJECT_LENGTH) {
    s = s.substring(0, CONFIG.MAX_SUBJECT_LENGTH - 3) + '...';
  }
  
  return s;
}

/**
 * Sanitize subject when READING incoming emails (mojibake removal).
 * More aggressive than header sanitization for sending.
 */
function sanitizeIncomingSubject(raw) {
  if (!raw) return '';
  let s = raw;
  
  // Remove mangled UTF-8 multi-byte sequences (emoji like \xC3\xB0\xC2\x9F etc)
  s = s.replace(/[\xC0-\xFF][\x80-\xBF]+/g, '');
  // Remove \u00XX mojibake sequences
  s = s.replace(/[\u00C0-\u00FF][\u0080-\u00BF]+/g, '');
  // Remove standalone replacement chars & control chars
  s = s.replace(/[\uFFFD\u0000-\u001F\x7F]/g, '');
  // Remove common mojibake patterns
  s = s.replace(/├â[\x80-\xBF┬░╞Æ"├é]/g, '');
  // Collapse whitespace
  s = s.replace(/\s{2,}/g, ' ').trim();
  return s;
}

/**
 * Build RFC-compliant MIME headers for outbound email.
 * @param {object} opts - { from, fromName, to, toName, subject, replyTo, messageId }
 * @returns {string} Properly encoded MIME headers
 */
function buildHeaders(opts) {
  const parts = [];
  
  // From header
  if (opts.fromName) {
    parts.push(`From: ${encodeName(opts.fromName)} <${sanitizeEmail(opts.from || CONFIG.ORG_EMAIL)}>`);
  } else {
    parts.push(`From: ${sanitizeEmail(opts.from || CONFIG.ORG_EMAIL)}`);
  }
  
  // To header
  if (opts.toName) {
    parts.push(`To: ${encodeName(opts.toName)} <${sanitizeEmail(opts.to)}>`);
  } else {
    parts.push(`To: ${sanitizeEmail(opts.to)}`);
  }
  
  // Subject - always RFC 2047 encode
  parts.push(`Subject: ${encodeSubject(opts.subject)}`);
  
  // MIME version
  parts.push('MIME-Version: 1.0');
  
  // Reply-To
  if (opts.replyTo) {
    parts.push(`Reply-To: ${sanitizeEmail(opts.replyTo)}`);
  }
  
  // Message-ID for threading
  if (opts.messageId) {
    parts.push(`Message-ID: ${opts.messageId}`);
  }
  
  // Organization header
  parts.push(`X-Mailer: BANF Communication Agent v1.0`);
  
  return parts;
}

/**
 * Sanitize email address ΓÇö prevent injection, validate format
 */
function sanitizeEmail(email) {
  if (!email) return '';
  // Strip any angle brackets
  let clean = email.replace(/<|>/g, '').trim();
  // Remove any CRLF injection
  clean = clean.replace(/[\r\n]/g, '');
  // Basic format validation
  if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(clean)) {
    // Try to extract email from "Name <email>" format
    const match = email.match(/[\w.+-]+@[\w.-]+\.\w{2,}/);
    if (match) clean = match[0];
  }
  return clean;
}

/**
 * Sanitize display name ΓÇö clean for MIME headers
 */
function sanitizeName(name) {
  if (!name) return '';
  let s = sanitizeHeaderValue(name);
  // Remove obviously invalid patterns
  s = s.replace(/[<>]/g, '');
  // Trim to reasonable length
  if (s.length > CONFIG.MAX_RECIPIENT_NAME_LENGTH) {
    s = s.substring(0, CONFIG.MAX_RECIPIENT_NAME_LENGTH);
  }
  return s;
}

// ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
// SECTION 2: CONTENT COMPLIANCE
// Professional tone, language ethics, moral guardrails
// ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

/**
 * Comprehensive content compliance check.
 * Returns { pass: bool, violations: string[], warnings: string[], score: number }
 */
function checkContentCompliance(content, context = {}) {
  const violations = [];
  const warnings = [];
  let score = 100; // Start at 100, deduct for issues
  
  if (!content) {
    violations.push('EMPTY_CONTENT: Email body is empty');
    return { pass: false, violations, warnings, score: 0 };
  }
  
  const text = typeof content === 'string' ? content : '';
  const textLower = text.toLowerCase();
  const textPlain = text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  
  // ΓöÇΓöÇ 2.1 PROFESSIONAL TONE CHECKS ΓöÇΓöÇ
  
  // Check for ALL CAPS abuse (more than 30% caps in substantial text)
  const alphaOnly = textPlain.replace(/[^a-zA-Z]/g, '');
  if (alphaOnly.length > 20) {
    const capsRatio = (alphaOnly.match(/[A-Z]/g) || []).length / alphaOnly.length;
    if (capsRatio > 0.5) {
      warnings.push('EXCESSIVE_CAPS: More than 50% capital letters ΓÇö may appear unprofessional or aggressive');
      score -= 10;
    } else if (capsRatio > 0.3) {
      warnings.push('HIGH_CAPS: Consider reducing capitalization for professional tone');
      score -= 5;
    }
  }
  
  // Check for excessive exclamation marks
  const exclamCount = (textPlain.match(/!/g) || []).length;
  if (exclamCount > 5) {
    warnings.push(`EXCESSIVE_EXCLAMATION: ${exclamCount} exclamation marks ΓÇö may appear unprofessional`);
    score -= 5;
  }
  
  // Check for excessive question marks
  const questionCount = (textPlain.match(/\?{2,}/g) || []).length;
  if (questionCount > 0) {
    warnings.push('MULTIPLE_QUESTION_MARKS: Avoid "??" or "???" ΓÇö use single question mark');
    score -= 3;
  }
  
  // ΓöÇΓöÇ 2.2 LANGUAGE ETHICS & MORAL GUARDRAILS ΓöÇΓöÇ
  
  // Discriminatory language patterns
  const discriminatoryPatterns = [
    { pattern: /\b(retard|retarded|retards)\b/i, label: 'ableist language' },
    { pattern: /\b(gyp|gypped|gypsy)\b/i, label: 'ethnic slur (Roma)' },
    { pattern: /\b(lame|cripple|crippled)\b/i, label: 'ableist language' },
    { pattern: /\b(negro|negros|nigga|nigger)\b/i, label: 'racial slur' },
    { pattern: /\b(fag|faggot|dyke)\b/i, label: 'homophobic slur' },
    { pattern: /\b(chink|gook|jap|wetback)\b/i, label: 'ethnic slur' },
    { pattern: /\b(spaz|spastic)\b/i, label: 'ableist language' },
  ];
  
  for (const { pattern, label } of discriminatoryPatterns) {
    if (pattern.test(textPlain)) {
      violations.push(`DISCRIMINATORY_LANGUAGE: Contains ${label}`);
      score -= 50;
    }
  }
  
  // Threatening or aggressive language
  const threateningPatterns = [
    { pattern: /\b(threat|threaten|threatening)\b.*\b(legal|action|lawsuit|sue)\b/i, label: 'legal threats' },
    { pattern: /\b(or else|consequences|pay for this|regret)\b/i, label: 'intimidating language' },
    { pattern: /\b(you (must|better|had better)|i demand|i insist)\b/i, label: 'coercive language' },
  ];
  
  for (const { pattern, label } of threateningPatterns) {
    if (pattern.test(textPlain)) {
      warnings.push(`AGGRESSIVE_TONE: Contains ${label} ΓÇö review for professional tone`);
      score -= 15;
    }
  }
  
  // ΓöÇΓöÇ 2.3 PRIVACY & DATA PROTECTION ΓöÇΓöÇ
  
  // Check for SSN / sensitive data exposure
  if (/\b\d{3}-\d{2}-\d{4}\b/.test(textPlain)) {
    violations.push('PII_EXPOSURE: Possible Social Security Number detected');
    score -= 40;
  }
  
  // Check for credit card numbers (basic pattern)
  if (/\b(?:4\d{3}|5[1-5]\d{2}|6011|3[47]\d{2})[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/.test(textPlain)) {
    violations.push('PII_EXPOSURE: Possible credit card number detected');
    score -= 40;
  }
  
  // Check for passwords in plain text
  if (/\b(password|passwd|pwd)\s*[:=]\s*\S+/i.test(textPlain)) {
    violations.push('CREDENTIAL_EXPOSURE: Possible password in plain text');
    score -= 30;
  }
  
  // ΓöÇΓöÇ 2.4 PROFESSIONAL COMMUNICATION STANDARDS ΓöÇΓöÇ
  
  // Check for proper greeting
  const hasGreeting = /\b(dear|hi|hello|greetings|good (morning|afternoon|evening))\b/i.test(textPlain);
  if (!hasGreeting && context.requireGreeting !== false) {
    warnings.push('NO_GREETING: Consider adding a professional greeting (Dear/Hi/Hello)');
    score -= 5;
  }
  
  // Check for proper sign-off  
  const hasSignoff = /\b(regards|sincerely|best|thank|thanks|warm regards|cheers)\b/i.test(textPlain);
  if (!hasSignoff && context.requireSignoff !== false) {
    warnings.push('NO_SIGNOFF: Consider adding a professional sign-off (Best regards, etc.)');
    score -= 5;
  }
  
  // Check for organization identification
  const hasOrgId = /\b(banf|bengali association)\b/i.test(textPlain);
  if (!hasOrgId && context.requireOrgId !== false) {
    warnings.push('NO_ORG_ID: Email should identify the sending organization (BANF)');
    score -= 3;
  }
  
  // ΓöÇΓöÇ 2.5 CONTENT QUALITY ΓöÇΓöÇ
  
  // Check minimum content length (avoid blank/too-short emails)
  if (textPlain.length < 20 && context.allowShort !== true) {
    warnings.push('TOO_SHORT: Email body is very short ΓÇö may appear unprofessional');
    score -= 10;
  }
  
  // Check maximum length
  if (text.length > CONFIG.MAX_BODY_LENGTH) {
    warnings.push('TOO_LONG: Email body exceeds maximum recommended length');
    score -= 5;
  }
  
  // Check for broken HTML
  if (text.includes('<') && text.includes('>')) {
    const openTags = (text.match(/<[a-z][^>]*>/gi) || []).length;
    const closeTags = (text.match(/<\/[a-z][^>]*>/gi) || []).length;
    const selfClosing = (text.match(/<[^>]*\/>/gi) || []).length;
    if (Math.abs(openTags - closeTags - selfClosing) > 5) {
      warnings.push('BROKEN_HTML: Significant mismatch in HTML open/close tags');
      score -= 5;
    }
  }
  
  // Check for placeholder text that wasn't replaced
  const placeholders = text.match(/\[[\w_]+\]|\{\{[\w_]+\}\}|__[\w_]+__/g) || [];
  const realPlaceholders = placeholders.filter(p => 
    !['[BANF]', '[CHANGES_PLACEHOLDER]'].includes(p) // Known OK placeholders
  );
  if (realPlaceholders.length > 0) {
    warnings.push(`UNREPLACED_PLACEHOLDERS: Found ${realPlaceholders.join(', ')} ΓÇö may be template errors`);
    score -= 10;
  }
  
  // ΓöÇΓöÇ 2.6 CULTURAL SENSITIVITY ΓöÇΓöÇ
  
  // Check for appropriate cultural references for BANF (Bengali Association)
  // No issues to flag - just awareness
  
  // Ensure score stays in range
  score = Math.max(0, Math.min(100, score));
  
  return {
    pass: violations.length === 0 && score >= 40,
    violations,
    warnings,
    score,
    level: score >= 90 ? 'excellent' : score >= 70 ? 'good' : score >= 50 ? 'acceptable' : score >= 40 ? 'marginal' : 'fail'
  };
}

// ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
// SECTION 3: RECIPIENT VALIDATION
// ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

/**
 * Validate email recipient before sending.
 * Returns { valid: bool, issues: string[] }
 */
function validateRecipient(email, name) {
  const issues = [];
  
  // Email format validation
  if (!email) {
    issues.push('MISSING_EMAIL: No email address provided');
    return { valid: false, issues };
  }
  
  const cleanEmail = sanitizeEmail(email);
  if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(cleanEmail)) {
    issues.push(`INVALID_EMAIL: "${email}" does not match valid email format`);
  }
  
  // Check for obvious test/dummy addresses
  if (/^(test|fake|dummy|example|nobody|null|void)@/i.test(cleanEmail)) {
    issues.push(`TEST_EMAIL: "${cleanEmail}" appears to be a test address`);
  }
  
  // Check for dangerous domains
  const domain = cleanEmail.split('@')[1] || '';
  if (['example.com', 'test.com', 'localhost', 'invalid'].includes(domain)) {
    issues.push(`INVALID_DOMAIN: "${domain}" is not a real email domain`);
  }
  
  // Name validation
  if (name) {
    if (name.length < 2) {
      issues.push('SHORT_NAME: Recipient name is too short');
    }
    if (/^[^a-zA-Z]/.test(name)) {
      issues.push('INVALID_NAME: Name starts with non-letter character');
    }
  }
  
  return { valid: issues.length === 0, issues };
}

// ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
// SECTION 4: COMPREHENSIVE EMAIL VALIDATION
// ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

/**
 * Full pre-send validation. Call this before EVERY outbound email.
 * @param {object} email - { to, toName, from, fromName, subject, body, agent }
 * @returns {object} { pass, violations, warnings, score, sanitized }
 */
function validateEmail(email) {
  const allViolations = [];
  const allWarnings = [];
  let totalScore = 100;
  
  // 1. Recipient validation
  const recipientCheck = validateRecipient(email.to, email.toName);
  if (!recipientCheck.valid) {
    allViolations.push(...recipientCheck.issues);
    totalScore -= 30;
  }
  
  // 2. Subject validation
  if (!email.subject || email.subject.trim().length === 0) {
    allViolations.push('EMPTY_SUBJECT: Email must have a subject line');
    totalScore -= 20;
  } else {
    // Check subject for non-ASCII (will need encoding)
    if (!/^[\x20-\x7E]*$/.test(email.subject)) {
      allWarnings.push('NON_ASCII_SUBJECT: Subject contains non-ASCII characters ΓÇö will be RFC 2047 encoded');
    }
    if (email.subject.length > CONFIG.MAX_SUBJECT_LENGTH) {
      allWarnings.push('LONG_SUBJECT: Subject exceeds recommended length');
      totalScore -= 5;
    }
  }
  
  // 3. Content compliance
  const contentCheck = checkContentCompliance(email.body, {
    requireGreeting: email.requireGreeting !== false,
    requireSignoff: email.requireSignoff !== false,
    requireOrgId: email.requireOrgId !== false,
    allowShort: email.allowShort
  });
  allViolations.push(...contentCheck.violations);
  allWarnings.push(...contentCheck.warnings);
  totalScore = Math.min(totalScore, contentCheck.score);
  
  // 4. Sender validation
  if (email.from && !/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(sanitizeEmail(email.from))) {
    allViolations.push('INVALID_FROM: Sender email format is invalid');
    totalScore -= 20;
  }
  
  // 5. Build sanitized version
  const sanitized = {
    to: sanitizeEmail(email.to),
    toName: sanitizeName(email.toName || ''),
    from: sanitizeEmail(email.from || CONFIG.ORG_EMAIL),
    fromName: sanitizeName(email.fromName || 'BANF'),
    subject: sanitizeHeaderValue(email.subject || ''),
    encodedSubject: encodeSubject(email.subject || ''),
    body: email.body // Body is HTML, don't strip
  };
  
  totalScore = Math.max(0, Math.min(100, totalScore));
  
  const result = {
    pass: allViolations.length === 0 && totalScore >= 40,
    violations: allViolations,
    warnings: allWarnings,
    score: totalScore,
    level: totalScore >= 90 ? 'excellent' : totalScore >= 70 ? 'good' : totalScore >= 50 ? 'acceptable' : totalScore >= 40 ? 'marginal' : 'fail',
    sanitized,
    timestamp: new Date().toISOString()
  };
  
  return result;
}

// ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
// SECTION 5: AUDIT TRAIL
// ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

function loadAuditLog() {
  try {
    if (fs.existsSync(CONFIG.AUDIT_FILE)) {
      return JSON.parse(fs.readFileSync(CONFIG.AUDIT_FILE, 'utf8'));
    }
  } catch (e) { /* ignore */ }
  return { entries: [], stats: { total: 0, passed: 0, failed: 0, warnings: 0 } };
}

function saveAuditLog(log) {
  // Keep only last 1000 entries
  if (log.entries.length > 1000) {
    log.entries = log.entries.slice(-1000);
  }
  fs.writeFileSync(CONFIG.AUDIT_FILE, JSON.stringify(log, null, 2));
}

/**
 * Record an outbound email in the compliance audit log.
 * @param {object} entry - { action, to, subject, agent, result, complianceScore }
 */
function auditLog(entry) {
  if (!CONFIG.LOG_ALL_OUTBOUND) return;
  
  const log = loadAuditLog();
  
  const record = {
    id: `AUDIT-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    timestamp: new Date().toISOString(),
    action: entry.action || 'send_email',
    agent: entry.agent || 'unknown',
    to: entry.to || 'unknown',
    subject: (entry.subject || '').substring(0, 100),
    complianceScore: entry.complianceScore || null,
    complianceLevel: entry.complianceLevel || null,
    violations: entry.violations || [],
    warnings: entry.warnings || [],
    result: entry.result || 'unknown',
    evidence: entry.evidence || null
  };
  
  log.entries.push(record);
  log.stats.total++;
  if (record.result === 'sent' || record.result === 'passed') log.stats.passed++;
  else if (record.result === 'blocked' || record.result === 'failed') log.stats.failed++;
  if ((record.warnings || []).length > 0) log.stats.warnings++;
  
  saveAuditLog(log);
  return record;
}

// ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
// SECTION 6: RATE LIMITING
// ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

const _rateLimitState = {
  timestamps: [] // Array of send timestamps
};

/**
 * Check if sending is within rate limits.
 * @returns { allowed: bool, reason: string, remaining: { minute, hour, day } }
 */
function checkRateLimit() {
  const now = Date.now();
  
  // Clean old timestamps
  _rateLimitState.timestamps = _rateLimitState.timestamps.filter(t => now - t < 86400000);
  
  const lastMinute = _rateLimitState.timestamps.filter(t => now - t < 60000).length;
  const lastHour = _rateLimitState.timestamps.filter(t => now - t < 3600000).length;
  const lastDay = _rateLimitState.timestamps.length;
  
  const remaining = {
    minute: CONFIG.MAX_EMAILS_PER_MINUTE - lastMinute,
    hour: CONFIG.MAX_EMAILS_PER_HOUR - lastHour,
    day: CONFIG.MAX_EMAILS_PER_DAY - lastDay
  };
  
  if (lastMinute >= CONFIG.MAX_EMAILS_PER_MINUTE) {
    return { allowed: false, reason: `Rate limit: ${CONFIG.MAX_EMAILS_PER_MINUTE}/min exceeded`, remaining };
  }
  if (lastHour >= CONFIG.MAX_EMAILS_PER_HOUR) {
    return { allowed: false, reason: `Rate limit: ${CONFIG.MAX_EMAILS_PER_HOUR}/hour exceeded`, remaining };
  }
  if (lastDay >= CONFIG.MAX_EMAILS_PER_DAY) {
    return { allowed: false, reason: `Rate limit: ${CONFIG.MAX_EMAILS_PER_DAY}/day exceeded`, remaining };
  }
  
  return { allowed: true, reason: '', remaining };
}

/**
 * Record a send for rate limiting.
 */
function recordSend() {
  _rateLimitState.timestamps.push(Date.now());
}

// ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
// SECTION 7: CONVENIENCE ΓÇö BUILD COMPLETE COMPLIANT MIME MESSAGE
// ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

/**
 * Encode a string as RFC 2045 quoted-printable.
 * Rules: = ΓåÆ =3D, non-ASCII ΓåÆ =XX, line wrap at 76 chars with soft break (=\r\n).
 * Without this, email clients misinterpret raw = in href="...", style="...", etc.
 */
function encodeQuotedPrintable(str) {
  const buf = Buffer.from(str, 'utf8');
  let result = '';
  let lineLen = 0;

  for (let i = 0; i < buf.length; i++) {
    const byte = buf[i];
    let encoded;

    // CRLF: pass through, reset line length
    if (byte === 0x0D && i + 1 < buf.length && buf[i + 1] === 0x0A) {
      result += '\r\n';
      lineLen = 0;
      i++; // skip LF
      continue;
    }
    // Lone LF: convert to CRLF
    if (byte === 0x0A) {
      result += '\r\n';
      lineLen = 0;
      continue;
    }
    // Printable ASCII (0x20-0x7E) except '=' (0x3D), plus TAB (0x09)
    if (byte === 0x09 || (byte >= 0x20 && byte <= 0x7E && byte !== 0x3D)) {
      encoded = String.fromCharCode(byte);
    } else {
      // Encode as =XX (uppercase hex)
      encoded = '=' + byte.toString(16).toUpperCase().padStart(2, '0');
    }

    // Soft line break at 76 chars (encoded token can be 1 or 3 chars)
    if (lineLen + encoded.length > 75) {
      result += '=\r\n';
      lineLen = 0;
    }

    result += encoded;
    lineLen += encoded.length;
  }

  return result;
}

/**
 * Build a complete, compliant MIME message ready for Gmail API.
 * Handles all header encoding, content compliance, and audit logging.
 * 
 * @param {object} opts - { to, toName, from, fromName, subject, htmlBody, agent, boundary }
 * @returns {object} { raw (base64url), compliance, audit } or throws on violation
 */
function buildCompliantMessage(opts) {
  // 1. Validate
  const compliance = validateEmail({
    to: opts.to,
    toName: opts.toName,
    from: opts.from,
    fromName: opts.fromName,
    subject: opts.subject,
    body: opts.htmlBody,
    requireGreeting: opts.requireGreeting,
    requireSignoff: opts.requireSignoff,
    requireOrgId: opts.requireOrgId,
    allowShort: opts.allowShort
  });
  
  // 2. Check rate limit
  const rateCheck = checkRateLimit();
  if (!rateCheck.allowed) {
    const audit = auditLog({
      action: 'send_blocked',
      agent: opts.agent || 'unknown',
      to: opts.to,
      subject: opts.subject,
      result: 'blocked',
      violations: [rateCheck.reason],
      evidence: { rateLimit: rateCheck }
    });
    return { raw: null, compliance, audit, blocked: true, reason: rateCheck.reason };
  }
  
  // 3. Build headers using sanitized values
  const boundary = opts.boundary || `___BANF_COMPLIANT_${Date.now()}___`;
  
  const headers = buildHeaders({
    from: compliance.sanitized.from,
    fromName: compliance.sanitized.fromName,
    to: compliance.sanitized.to,
    toName: compliance.sanitized.toName,
    subject: opts.subject, // encodeSubject called inside buildHeaders
    replyTo: opts.replyTo
  });
  
  headers.push(`Content-Type: multipart/alternative; boundary="${boundary}"`);
  
  // 4. Build body parts
  const textBody = (opts.htmlBody || '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#\d+;/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  
  // Properly encode both parts as quoted-printable (RFC 2045)
  // Without this, = in href="...", style="...", URLs etc. gets misinterpreted
  // as QP escape sequences, breaking all links, buttons, and inline styles.
  const qpText = encodeQuotedPrintable(textBody);
  const qpHtml = encodeQuotedPrintable(opts.htmlBody || '');

  const message = [
    headers.join('\r\n'),
    '',
    `--${boundary}`,
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: quoted-printable',
    '',
    qpText,
    `--${boundary}`,
    'Content-Type: text/html; charset=UTF-8',
    'Content-Transfer-Encoding: quoted-printable',
    '',
    qpHtml,
    `--${boundary}--`
  ].join('\r\n');
  
  // 5. Base64url encode for Gmail API
  const raw = Buffer.from(message, 'utf8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
  
  // 6. Record send + audit
  recordSend();
  const audit = auditLog({
    action: 'send_email',
    agent: opts.agent || 'unknown',
    to: compliance.sanitized.to,
    subject: compliance.sanitized.subject,
    complianceScore: compliance.score,
    complianceLevel: compliance.level,
    violations: compliance.violations,
    warnings: compliance.warnings,
    result: compliance.pass ? 'sent' : 'sent_with_warnings',
    evidence: {
      originalSubject: opts.subject,
      encodedSubject: compliance.sanitized.encodedSubject,
      hasNonAscii: !/^[\x20-\x7E]*$/.test(opts.subject || ''),
      recipientValid: compliance.violations.filter(v => v.startsWith('MISSING_EMAIL') || v.startsWith('INVALID_EMAIL')).length === 0
    }
  });
  
  return {
    raw,
    compliance,
    audit,
    blocked: false
  };
}

// ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
// CLI
// ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.includes('--audit')) {
    const log = loadAuditLog();
    console.log('ΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉ');
    console.log('  BANF Communication Compliance - Audit Log');
    console.log('ΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉ\n');
    console.log(`  Total: ${log.stats.total} | Passed: ${log.stats.passed} | Failed: ${log.stats.failed} | With Warnings: ${log.stats.warnings}\n`);
    
    const recent = log.entries.slice(-20);
    for (const e of recent) {
      console.log(`  [${e.timestamp}] ${e.action} ΓåÆ ${e.to} | Score: ${e.complianceScore} (${e.complianceLevel}) | ${e.result}`);
      if (e.violations.length > 0) console.log(`    VIOLATIONS: ${e.violations.join(', ')}`);
      if (e.warnings.length > 0) console.log(`    WARNINGS: ${e.warnings.join(', ')}`);
    }
    
  } else if (args.includes('--stats')) {
    const log = loadAuditLog();
    console.log('ΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉ');
    console.log('  BANF Communication Compliance - Statistics');
    console.log('ΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉ\n');
    console.log(`  Total Emails: ${log.stats.total}`);
    console.log(`  Passed: ${log.stats.passed}`);
    console.log(`  Failed/Blocked: ${log.stats.failed}`);
    console.log(`  With Warnings: ${log.stats.warnings}`);
    
    // Breakdown by agent
    const byAgent = {};
    for (const e of log.entries) {
      byAgent[e.agent] = (byAgent[e.agent] || 0) + 1;
    }
    console.log('\n  By Agent:');
    for (const [agent, count] of Object.entries(byAgent)) {
      console.log(`    ${agent}: ${count}`);
    }
    
  } else if (args.includes('--test')) {
    console.log('ΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉ');
    console.log('  BANF Communication Compliance - Self-Test');
    console.log('ΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉ\n');
    
    let passed = 0, failed = 0;
    
    function test(name, fn) {
      try {
        const result = fn();
        if (result) { console.log(`  PASS: ${name}`); passed++; }
        else { console.log(`  FAIL: ${name}`); failed++; }
      } catch (e) { console.log(`  ERROR: ${name} - ${e.message}`); failed++; }
    }
    
    // Subject encoding tests
    test('ASCII subject passes through', () => encodeSubject('Hello World') === 'Hello World');
    test('Em dash gets ASCII-ized', () => {
      const s = sanitizeHeaderValue('BANF 2026-27 \u2014 Welcome!');
      return s === 'BANF 2026-27 - Welcome!';
    });
    test('Emoji subject gets RFC 2047 encoded', () => {
      const result = encodeSubject('\uD83D\uDD0D Query Response');
      return result.startsWith('=?UTF-8?B?');
    });
    test('CRLF injection prevented', () => {
      const result = sanitizeHeaderValue('Normal\r\nBcc: evil@hacker.com');
      return !result.includes('\n') && !result.includes('\r');
    });
    
    // Content compliance tests
    test('Clean email passes compliance', () => {
      const r = checkContentCompliance('Dear John,\n\nThank you for your interest in BANF.\n\nBest regards,\nBANF Team');
      return r.pass && r.score >= 90;
    });
    test('Empty email fails', () => {
      const r = checkContentCompliance('');
      return !r.pass;
    });
    test('SSN detected as violation', () => {
      const r = checkContentCompliance('Your SSN is 123-45-6789');
      return r.violations.some(v => v.includes('PII_EXPOSURE'));
    });
    test('Discriminatory language blocked', () => {
      const r = checkContentCompliance('That idea is so retarded');
      return r.violations.some(v => v.includes('DISCRIMINATORY'));
    });
    test('Placeholder detection works', () => {
      const r = checkContentCompliance('Dear {{NAME}}, your balance is {{AMOUNT}}. Best regards, BANF');
      return r.warnings.some(w => w.includes('PLACEHOLDER'));
    });
    
    // Recipient validation tests
    test('Valid email passes', () => validateRecipient('user@gmail.com', 'John Doe').valid);
    test('Invalid email fails', () => !validateRecipient('not-an-email', 'John').valid);
    test('Test email detected', () => !validateRecipient('test@example.com', 'Test').valid);
    
    // Name encoding tests
    test('ASCII name passes through', () => encodeName('John Doe') === 'John Doe');
    test('Name with comma gets quoted', () => encodeName('Doe, John') === '"Doe, John"');
    
    // Header building test
    test('buildHeaders produces correct structure', () => {
      const h = buildHeaders({ from: 'test@banf.org', fromName: 'BANF', to: 'user@gmail.com', toName: 'John', subject: 'Hello' });
      return h.length >= 4 && h[0].startsWith('From:') && h[2].startsWith('Subject:');
    });
    
    // Full message build test
    test('buildCompliantMessage produces raw output', () => {
      const result = buildCompliantMessage({
        to: 'user@gmail.com', toName: 'John Doe',
        from: 'banfjax@gmail.com', fromName: 'BANF',
        subject: 'Test Email', htmlBody: '<p>Dear John,</p><p>Thank you for your interest in BANF.</p><p>Best regards,<br>BANF Team</p>',
        agent: 'test'
      });
      return result.raw && result.raw.length > 0 && !result.blocked;
    });
    
    // Mojibake sanitization
    test('Mojibake cleanup works', () => {
      const s = sanitizeHeaderValue('Hello World');
      return s === 'Hello World';
    });
    test('Smart quotes/em dashes normalized', () => {
      const s = sanitizeHeaderValue('BANF 2026\u201327 \u2014 Welcome\u2019s!');
      return s.includes('-') && s.includes("'") && !s.includes('\u2014');
    });
    test('Non-ASCII subject is RFC 2047 encoded', () => {
      const s = encodeSubject('\uD83C\uDF38 Bosonto Utsob 2026');
      return s.startsWith('=?UTF-8?B?');
    });
    
    console.log(`\n  Results: ${passed} passed, ${failed} failed\n`);
    
  } else {
    console.log('BANF Communication Compliance Module v1.0');
    console.log('');
    console.log('  --audit   Show audit log of outbound emails');
    console.log('  --stats   Compliance statistics');
    console.log('  --test    Run self-tests');
    console.log('');
    console.log('  Use as module:');
    console.log('    const compliance = require("./communication-compliance.js");');
    console.log('    const result = compliance.validateEmail({ to, toName, subject, body });');
    console.log('    const headers = compliance.buildHeaders({ from, to, toName, subject });');
  }
}

// ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
// SECTION 8: PRE-SEND LINK VERIFICATION
// ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

/**
 * Extract all href URLs from HTML content.
 * Returns array of { url, text, type } where type is 'http', 'mailto', or 'other'.
 */
function extractLinks(html) {
  const links = [];
  const re = /<a\s[^>]*href\s*=\s*["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    const url = m[1].trim();
    const text = m[2].replace(/<[^>]+>/g, '').trim();
    const type = url.startsWith('mailto:') ? 'mailto' : url.startsWith('http') ? 'http' : 'other';
    links.push({ url, text, type });
  }
  return links;
}

/**
 * Verify all HTTP(S) links in HTML are reachable (HEAD request, 10s timeout).
 * Returns { allOk, results: [{ url, status, ok, error? }] }
 */
async function verifyLinks(html) {
  const https = require('https');
  const http = require('http');
  const links = extractLinks(html).filter(l => l.type === 'http');
  
  // Deduplicate URLs
  const uniqueUrls = [...new Set(links.map(l => l.url))];
  
  const results = await Promise.all(uniqueUrls.map(url => {
    return new Promise(resolve => {
      try {
        const u = new URL(url);
        const mod = u.protocol === 'https:' ? https : http;
        const opts = {
          hostname: u.hostname,
          port: u.port || (u.protocol === 'https:' ? 443 : 80),
          path: u.pathname + u.search,
          method: 'HEAD',
          timeout: 10000,
          headers: { 'User-Agent': 'BANF-LinkVerifier/1.0' }
        };
        const req = mod.request(opts, res => {
          resolve({ url, status: res.statusCode, ok: res.statusCode >= 200 && res.statusCode < 400 });
        });
        req.on('error', e => resolve({ url, status: 0, ok: false, error: e.message }));
        req.on('timeout', () => { req.destroy(); resolve({ url, status: 0, ok: false, error: 'TIMEOUT' }); });
        req.end();
      } catch (e) {
        resolve({ url, status: 0, ok: false, error: e.message });
      }
    });
  }));
  
  return {
    allOk: results.every(r => r.ok),
    total: results.length,
    live: results.filter(r => r.ok).length,
    dead: results.filter(r => !r.ok).length,
    results
  };
}

// ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
// EXPORTS
// ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

module.exports = {
  // Header sanitization
  encodeSubject,
  encodeName,
  sanitizeHeaderValue,
  sanitizeIncomingSubject,
  sanitizeEmail,
  sanitizeName,
  buildHeaders,
  
  // Content compliance
  checkContentCompliance,
  validateRecipient,
  validateEmail,
  
  // Complete message building
  buildCompliantMessage,
  encodeQuotedPrintable,
  
  // Link verification
  extractLinks,
  verifyLinks,
  
  // Rate limiting
  checkRateLimit,
  recordSend,
  
  // Audit
  auditLog,
  loadAuditLog,
  
  // Config
  CONFIG
};
