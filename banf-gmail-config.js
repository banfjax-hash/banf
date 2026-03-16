/**
 * BANF Gmail OAuth Config — centralized secrets loader + send utility
 * Reads from .banf-secrets.json (gitignored) or environment variables.
 * All agent scripts should require this instead of hardcoding tokens.
 *
 * IMPORTANT: Use sendEmail() from this module for all outgoing emails.
 * It includes the MIME subject sanitizer that normalizes non-ASCII characters
 * (em dashes, smart quotes, ellipsis, NBSP) to safe ASCII equivalents.
 */
const fs = require('fs');
const path = require('path');
const https = require('https');

let _secrets = {};
const secretsPath = path.join(__dirname, '.banf-secrets.json');
try {
  _secrets = JSON.parse(fs.readFileSync(secretsPath, 'utf8'));
} catch (e) {
  // Secrets file not found — fall back to env vars
}

const CLIENT_ID = process.env.BANF_GMAIL_CLIENT_ID || _secrets.CLIENT_ID || '';
const CLIENT_SECRET = process.env.BANF_GMAIL_CLIENT_SECRET || _secrets.CLIENT_SECRET || '';
const REFRESH_TOKEN = process.env.BANF_GMAIL_REFRESH_TOKEN || _secrets.REFRESH_TOKEN || '';

// ─────────────────────────────────────────────────────────────────────────────
// MIME SUBJECT SANITIZER — prevents non-ASCII in email headers (RFC 2822)
// ─────────────────────────────────────────────────────────────────────────────
/**
 * Sanitize email subject for MIME headers.
 * Replaces common non-ASCII characters with ASCII equivalents.
 * Called automatically by sendEmail() — also exported for direct use.
 */
function sanitizeSubjectForMIME(subject) {
  if (!subject) return '';
  let s = String(subject);
  s = s.replace(/[\u2018\u2019\u201A\uFE10]/g, "'");   // Smart single quotes → '
  s = s.replace(/[\u201C\u201D\u201E\uFE11]/g, '"');    // Smart double quotes → "
  s = s.replace(/[\u2013\u2014]/g, '-');                 // Em/en dashes → -
  s = s.replace(/\u2026/g, '...');                       // Ellipsis → ...
  s = s.replace(/[\u00A0]/g, ' ');                       // Non-breaking space → space
  s = s.replace(/[\u2010\u2011\u2012\u2015]/g, '-');     // Other dash variants → -
  s = s.replace(/[\u00AB\u00BB\u2039\u203A]/g, '"');     // Guillemets → "
  s = s.replace(/[\u00B7\u2022\u2023\u25E6]/g, '-');     // Bullets → -
  // Log remaining non-ASCII for compliance visibility
  if (/[^\x20-\x7E]/.test(s)) {
    const chars = s.replace(/[\x20-\x7E]/g, '').split('').map(c => `U+${c.charCodeAt(0).toString(16).toUpperCase().padStart(4, '0')}`);
    console.warn(`⚠️  COMPLIANCE: Subject still contains non-ASCII after sanitization: ${chars.join(', ')}`);
  }
  return s;
}

// ─────────────────────────────────────────────────────────────────────────────
// SHARED getToken() — OAuth2 token refresh
// ─────────────────────────────────────────────────────────────────────────────
function getToken() {
  return new Promise((resolve, reject) => {
    const data = `client_id=${CLIENT_ID}&client_secret=${CLIENT_SECRET}&refresh_token=${REFRESH_TOKEN}&grant_type=refresh_token`;
    const req = https.request({
      hostname: 'oauth2.googleapis.com', path: '/token', method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    }, res => {
      let b = '';
      res.on('data', c => b += c);
      res.on('end', () => {
        try { resolve(JSON.parse(b).access_token); }
        catch { reject(new Error('Token parse error: ' + b)); }
      });
    });
    req.on('error', reject);
    req.write(data); req.end();
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// SHARED sendEmail() — MIME builder with automatic subject sanitization
// ─────────────────────────────────────────────────────────────────────────────
/**
 * Send an email via Gmail API with automatic non-ASCII subject sanitization.
 * @param {string} token - OAuth2 access token
 * @param {string} to - Recipient (e.g. "Name <email>")
 * @param {string|null} cc - CC recipient(s) or null
 * @param {string} subject - Subject line (auto-sanitized for MIME safety)
 * @param {string} htmlBody - HTML email body
 * @returns {Promise<{status: number, data: object}>}
 */
function sendEmail(token, to, cc, subject, htmlBody) {
  return new Promise((resolve, reject) => {
    const safeSubject = sanitizeSubjectForMIME(subject);
    const rawParts = [
      `From: Bengali Association of North Florida <banfjax@gmail.com>`,
      `To: ${to}`,
      cc ? `Cc: ${cc}` : null,
      `Subject: ${safeSubject}`,
      `MIME-Version: 1.0`,
      `Content-Type: text/html; charset=UTF-8`,
      ``,
      htmlBody
    ].filter(Boolean).join('\r\n');

    const encoded = Buffer.from(rawParts).toString('base64')
      .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

    const body = JSON.stringify({ raw: encoded });
    const req = https.request({
      hostname: 'gmail.googleapis.com',
      path: '/gmail/v1/users/me/messages/send',
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + token,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body)
      }
    }, res => {
      let d = ''; res.on('data', c => d += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(d) }); }
        catch { resolve({ status: res.statusCode, data: { raw: d } }); }
      });
    });
    req.on('error', reject);
    req.write(body); req.end();
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// SHARED sendThreadedEmail() — reply-in-thread with In-Reply-To / References
// ─────────────────────────────────────────────────────────────────────────────
/**
 * Send a threaded reply via Gmail API (appears in same conversation).
 * @param {string} token          - OAuth2 access token
 * @param {object} opts
 * @param {string} opts.to        - Recipient(s)
 * @param {string|null} opts.cc   - CC recipient(s) or null
 * @param {string} opts.subject   - Subject (should start with "Re:")
 * @param {string} opts.htmlBody  - HTML email body
 * @param {string} opts.threadId  - Gmail thread ID to reply into
 * @param {string} opts.inReplyTo - Message-ID of the message being replied to
 * @param {string} [opts.references] - Full References header chain (space-separated)
 * @returns {Promise<{status: number, data: object}>}
 */
function sendThreadedEmail(token, opts) {
  return new Promise((resolve, reject) => {
    const { to, cc, subject, htmlBody, threadId, inReplyTo, references } = opts;
    const safeSubject = sanitizeSubjectForMIME(subject);
    const refs = references ? references : inReplyTo;

    const rawParts = [
      `From: Bengali Association of North Florida <banfjax@gmail.com>`,
      `To: ${to}`,
      cc ? `Cc: ${cc}` : null,
      `Subject: ${safeSubject}`,
      `In-Reply-To: ${inReplyTo}`,
      `References: ${refs}`,
      `MIME-Version: 1.0`,
      `Content-Type: text/html; charset=UTF-8`,
      ``,
      htmlBody
    ].filter(Boolean).join('\r\n');

    const encoded = Buffer.from(rawParts).toString('base64')
      .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

    const body = JSON.stringify({ raw: encoded, threadId });
    const req = https.request({
      hostname: 'gmail.googleapis.com',
      path: '/gmail/v1/users/me/messages/send',
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + token,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body)
      }
    }, res => {
      let d = ''; res.on('data', c => d += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(d) }); }
        catch { resolve({ status: res.statusCode, data: { raw: d } }); }
      });
    });
    req.on('error', reject);
    req.write(body); req.end();
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// SHARED searchGmail() — list messages matching a query
// ─────────────────────────────────────────────────────────────────────────────
/**
 * Search Gmail for messages matching a query string.
 * @param {string} token  - OAuth2 access token
 * @param {string} query  - Gmail search query (same syntax as Gmail search box)
 * @param {number} [maxResults=20] - Maximum results to return
 * @returns {Promise<Array<{id: string, threadId: string}>>}
 */
function searchGmail(token, query, maxResults = 20) {
  return new Promise((resolve, reject) => {
    const q = encodeURIComponent(query);
    const req = https.request({
      hostname: 'gmail.googleapis.com',
      path: `/gmail/v1/users/me/messages?q=${q}&maxResults=${maxResults}`,
      method: 'GET',
      headers: { 'Authorization': 'Bearer ' + token }
    }, res => {
      let d = ''; res.on('data', c => d += c);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(d);
          resolve(parsed.messages || []);
        } catch { resolve([]); }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

/**
 * Fetch full message metadata for a Gmail message ID.
 * @param {string} token  - OAuth2 access token
 * @param {string} msgId  - Gmail message ID
 * @returns {Promise<object>} - Message metadata (headers, snippet, etc.)
 */
function getMessageMeta(token, msgId) {
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'gmail.googleapis.com',
      path: `/gmail/v1/users/me/messages/${msgId}?format=metadata&metadataHeaders=From&metadataHeaders=To&metadataHeaders=Cc&metadataHeaders=Subject&metadataHeaders=Date&metadataHeaders=Message-ID&metadataHeaders=In-Reply-To&metadataHeaders=References`,
      method: 'GET',
      headers: { 'Authorization': 'Bearer ' + token }
    }, res => {
      let d = ''; res.on('data', c => d += c);
      res.on('end', () => {
        try { resolve(JSON.parse(d)); }
        catch { resolve({}); }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

module.exports = {
  CLIENT_ID,
  CLIENT_SECRET,
  REFRESH_TOKEN,
  // Shared utilities — use these instead of inline implementations
  getToken,
  sendEmail,
  sendThreadedEmail,
  searchGmail,
  getMessageMeta,
  sanitizeSubjectForMIME,
};
