#!/usr/bin/env node
/**
 * Import GBM email recipients into Wix native CRM
 * 
 * 1. Scans Gmail for all GBM-related sent emails
 * 2. Extracts all unique recipients with names
 * 3. Fetches current CRM contacts to avoid duplicates
 * 4. Imports missing contacts via post_import_crm_contacts endpoint
 *    (uses contacts.appendOrCreateContact which handles dedup by email)
 * 5. Sends in batches of 25 to avoid timeouts
 */
const https = require('https');

const GOOGLE_CLIENT_ID = '1020178199135-3usrl611ara38i7rhu2ub6sn6g1150ml.apps.googleusercontent.com';
const GOOGLE_CLIENT_SECRET = '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';
const GOOGLE_REFRESH_TOKEN = require('./banf-gmail-config').REFRESH_TOKEN;
const SITE_API = 'https://www.jaxbengali.org/_functions';

function httpsRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const opts = {
      hostname: u.hostname, port: 443,
      path: u.pathname + u.search,
      method: options.method || 'GET',
      headers: options.headers || {},
      timeout: 60000
    };
    const req = https.request(opts, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => { try { resolve(JSON.parse(d)); } catch { resolve(d); } });
    });
    req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
    req.on('error', reject);
    if (options.body) req.write(options.body);
    req.end();
  });
}

async function getToken() {
  const body = `grant_type=refresh_token&refresh_token=${encodeURIComponent(GOOGLE_REFRESH_TOKEN)}&client_id=${encodeURIComponent(GOOGLE_CLIENT_ID)}&client_secret=${encodeURIComponent(GOOGLE_CLIENT_SECRET)}`;
  const r = await httpsRequest('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Content-Length': Buffer.byteLength(body) },
    body
  });
  if (!r.access_token) throw new Error('Token refresh failed');
  return r.access_token;
}

async function searchGmail(query, token) {
  const allIds = [];
  let pageToken = '';
  while (true) {
    const url = `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(query)}&maxResults=100${pageToken ? '&pageToken=' + pageToken : ''}`;
    const r = await httpsRequest(url, { headers: { Authorization: `Bearer ${token}` } });
    (r.messages || []).forEach(m => allIds.push(m.id));
    if (!r.nextPageToken || allIds.length >= 500) break;
    pageToken = r.nextPageToken;
  }
  return allIds;
}

async function getFullMessage(id, token) {
  const url = `https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}?format=metadata&metadataHeaders=To&metadataHeaders=Subject&metadataHeaders=Date&metadataHeaders=Cc&metadataHeaders=Bcc`;
  const r = await httpsRequest(url, { headers: { Authorization: `Bearer ${token}` } });
  const headers = (r.payload && r.payload.headers) || [];
  const getH = name => headers.filter(h => h.name.toLowerCase() === name.toLowerCase()).map(h => h.value).join(', ');
  return { id, to: getH('To'), cc: getH('Cc'), bcc: getH('Bcc'), subject: getH('Subject'), date: getH('Date') };
}

function extractEmailsWithNames(str) {
  if (!str) return [];
  const results = [];
  const parts = str.split(/,\s*/);
  for (const part of parts) {
    const match = part.match(/"?([^"<]*)"?\s*<([\w.+-]+@[\w.-]+\.\w+)>/i);
    if (match) {
      results.push({ name: match[1].trim(), email: match[2].toLowerCase().trim() });
    } else {
      const emailMatch = part.match(/([\w.+-]+@[\w.-]+\.\w+)/i);
      if (emailMatch) results.push({ name: '', email: emailMatch[1].toLowerCase().trim() });
    }
  }
  return results;
}

function splitName(fullName) {
  if (!fullName) return { firstName: '', lastName: '' };
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) return { firstName: parts[0], lastName: '' };
  return { firstName: parts[0], lastName: parts.slice(1).join(' ') };
}

async function importBatch(contacts, batchNum) {
  const payload = JSON.stringify({ contacts });
  console.log(`   Batch ${batchNum}: sending ${contacts.length} contacts...`);
  try {
    const r = await httpsRequest(`${SITE_API}/import_crm_contacts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) },
      body: payload
    });
    if (r.success) {
      console.log(`   ✅ Batch ${batchNum}: imported=${r.imported}, skipped=${r.skipped}, failed=${r.failed}`);
      if (r.errors && r.errors.length > 0) {
        r.errors.forEach(e => console.log(`      ⚠️ ${e.email}: ${e.error}`));
      }
    } else {
      console.log(`   ❌ Batch ${batchNum} failed: ${r.error || JSON.stringify(r).substring(0, 200)}`);
    }
    return r;
  } catch (e) {
    console.log(`   ❌ Batch ${batchNum} error: ${e.message}`);
    return { success: false, error: e.message, imported: 0, skipped: 0, failed: contacts.length };
  }
}

async function main() {
  console.log('═══════════════════════════════════════════════════');
  console.log('  BANF GBM Email → Wix CRM Import');
  console.log('  ' + new Date().toISOString());
  console.log('═══════════════════════════════════════════════════\n');

  // ── Step 1: Gmail token ──
  const token = await getToken();
  console.log('✅ Gmail token obtained\n');

  // ── Step 2: Search for all GBM-related sent emails ──
  console.log('🔎 Searching for GBM emails...');
  const gbmIds = await searchGmail('in:sent from:banfjax@gmail.com subject:"Invitation to Annual GBM 2026"', token);
  console.log(`   GBM Invitation: ${gbmIds.length}`);

  const gbmLinkIds = await searchGmail('in:sent from:banfjax@gmail.com subject:"GBM Link" after:2026/02/01', token);
  console.log(`   GBM Link: ${gbmLinkIds.length}`);

  const deckIds = await searchGmail('in:sent from:banfjax@gmail.com subject:"Final Presentation Deck" after:2026/03/01', token);
  console.log(`   Presentation Deck: ${deckIds.length}`);

  const allMsgIds = [...new Set([...gbmIds, ...gbmLinkIds, ...deckIds])];
  console.log(`   Total unique messages: ${allMsgIds.length}\n`);

  // ── Step 3: Extract all recipients ──
  console.log('📬 Extracting recipients...');
  const allRecipients = new Map();
  for (let i = 0; i < allMsgIds.length; i++) {
    try {
      const msg = await getFullMessage(allMsgIds[i], token);
      const recipients = [
        ...extractEmailsWithNames(msg.to),
        ...extractEmailsWithNames(msg.cc),
        ...extractEmailsWithNames(msg.bcc)
      ];
      for (const r of recipients) {
        if (r.email === 'banfjax@gmail.com' || r.email === 'botbanf@gmail.com') continue;
        if (!allRecipients.has(r.email)) {
          allRecipients.set(r.email, { names: new Set() });
        }
        if (r.name) allRecipients.get(r.email).names.add(r.name);
      }
    } catch (e) {
      console.log(`   ⚠️ Message ${i} failed: ${e.message}`);
    }
  }
  console.log(`   Found ${allRecipients.size} unique recipients\n`);

  // ── Step 4: Fetch current CRM to see what's already there ──
  console.log('🔗 Checking current CRM contacts...');
  let existingCRM = [];
  try {
    const resp = await httpsRequest(`${SITE_API}/evite_recipients?type=all_members`);
    if (resp.success && resp.members) {
      existingCRM = resp.members;
      console.log(`   Current CRM contacts: ${existingCRM.length}`);
    }
  } catch (e) {
    console.log(`   ⚠️ CRM fetch failed: ${e.message}`);
  }
  const existingEmails = new Set(existingCRM.map(c => c.email.toLowerCase()));

  // ── Step 5: Build import list ──
  const toImport = [];
  let alreadyInCRM = 0;
  for (const [email, data] of allRecipients.entries()) {
    const bestName = [...data.names][0] || '';
    const { firstName, lastName } = splitName(bestName);
    if (existingEmails.has(email)) {
      alreadyInCRM++;
      continue;
    }
    toImport.push({
      email,
      firstName: firstName || email.split('@')[0].split('.')[0],
      lastName: lastName || ''
    });
  }

  console.log(`   Already in CRM: ${alreadyInCRM}`);
  console.log(`   To import: ${toImport.length}\n`);

  if (toImport.length === 0) {
    console.log('✅ All contacts are already in CRM. Nothing to import.');
    return;
  }

  // ── Step 6: Import in batches of 25 ──
  // The Wix endpoint processes contacts sequentially via contacts.appendOrCreateContact
  // which itself deduplicates by email — so even if our "already in CRM" check missed some,
  // the endpoint will handle it gracefully.
  const BATCH_SIZE = 25;
  const batches = [];
  for (let i = 0; i < toImport.length; i += BATCH_SIZE) {
    batches.push(toImport.slice(i, i + BATCH_SIZE));
  }

  console.log(`📥 Importing ${toImport.length} contacts in ${batches.length} batches of up to ${BATCH_SIZE}...\n`);

  let totalImported = 0, totalSkipped = 0, totalFailed = 0;
  for (let i = 0; i < batches.length; i++) {
    const result = await importBatch(batches[i], i + 1);
    if (result.imported) totalImported += result.imported;
    if (result.skipped) totalSkipped += result.skipped;
    if (result.failed) totalFailed += result.failed;

    // Small delay between batches to avoid rate limits
    if (i < batches.length - 1) {
      await new Promise(r => setTimeout(r, 2000));
    }
  }

  console.log('\n═══════════════════════════════════════════════════');
  console.log('  IMPORT COMPLETE');
  console.log('═══════════════════════════════════════════════════');
  console.log(`  GBM recipients found: ${allRecipients.size}`);
  console.log(`  Already in CRM:       ${alreadyInCRM}`);
  console.log(`  Imported:             ${totalImported}`);
  console.log(`  Skipped (no email):   ${totalSkipped}`);
  console.log(`  Failed:               ${totalFailed}`);
  console.log('═══════════════════════════════════════════════════\n');

  // ── Step 7: Verify final count ──
  console.log('🔍 Verifying final CRM count...');
  try {
    const resp = await httpsRequest(`${SITE_API}/evite_recipients?type=all_members`);
    if (resp.success) {
      console.log(`   ✅ CRM now has ${resp.total} contacts (was ${existingCRM.length})\n`);
    }
  } catch (e) {
    console.log(`   Verification failed: ${e.message}`);
  }
}

main().catch(e => { console.error('Fatal:', e.message); process.exit(1); });
