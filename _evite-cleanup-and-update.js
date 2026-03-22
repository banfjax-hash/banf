#!/usr/bin/env node
/**
 * BANF Evite — Cleanup Duplicates + Update Highlights + Dry Run
 * =============================================================
 * 1. Queries all EviteInvitations for the Noboborsho event
 * 2. Deduplicates — keeps only the best record per email (responded > latest)
 * 3. Deletes extras via Wix Data REST API
 * 4. Updates event highlights with pricing info
 * 5. Saves updated eviteConfig to Wix DB
 * 6. Sends a fresh dry-run invite to president
 *
 * Usage:
 *   node _evite-cleanup-and-update.js                # full run
 *   node _evite-cleanup-and-update.js --cleanup-only # just cleanup
 *   node _evite-cleanup-and-update.js --update-only  # just update highlights + dry run
 *   node _evite-cleanup-and-update.js --dry-run-only # just send dry run
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const secrets = require('./.banf-secrets.json');
const EVENT_ID = '61849b36-68e5-41fc-885d-998feafc21f2';
const WIX_META_SITE_ID = '6a4f0362-0394-4e28-8559-f6145dd414e0';
const WIX_SITE_ID = '7c1629de-1358-490b-b768-f99fae428170';
const API_BASE = 'https://www.jaxbengali.org/_functions';

const FLAG = (n) => process.argv.includes('--' + n);

// ── Pricing text for highlights ──
const PRICING_HIGHLIGHTS = `This event is free for all inclusive premium membership (early bird or non early bird). For regular members cost is $30 per adult (Kids 6 years and over upto 17 years $15), and for guests (Adult $40, Kids 6 years and over upto 17 years $20). Guest performers will pay regular membership payment — however no option for non-inclusion of food. All are requested to avail the early premium membership opportunity.`;

// ── Helpers ──
function httpsRequest(options, body) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const opts = { ...options, headers: { ...options.headers, ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}) } };
    const req = https.request(opts, res => {
      let d = '';
      res.on('data', chunk => d += chunk);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(d) }); }
        catch (e) { resolve({ status: res.statusCode, data: d }); }
      });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

function httpsGet(url) {
  return new Promise((resolve, reject) => {
    https.get(url, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => { try { resolve(JSON.parse(d)); } catch { resolve(d); } });
    }).on('error', reject);
  });
}

function getWixAuth() {
  const authFile = `C:/Users/moumi/.wix/auth/${WIX_META_SITE_ID}.json`;
  if (!fs.existsSync(authFile)) throw new Error('Wix auth not found. Run: npx wix login');
  return JSON.parse(fs.readFileSync(authFile, 'utf8'));
}

async function wixQuery(collectionId, filter, limit = 500) {
  const auth = getWixAuth();
  return httpsRequest({
    hostname: 'www.wixapis.com',
    path: '/wix-data/v2/items/query',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': auth.accessToken,
      'wix-site-id': WIX_SITE_ID
    }
  }, {
    dataCollectionId: collectionId,
    query: { filter, paging: { limit } }
  });
}

async function wixDelete(collectionId, itemId) {
  const auth = getWixAuth();
  return httpsRequest({
    hostname: 'www.wixapis.com',
    path: `/wix-data/v2/items/${encodeURIComponent(itemId)}?dataCollectionId=${encodeURIComponent(collectionId)}`,
    method: 'DELETE',
    headers: {
      'Authorization': auth.accessToken,
      'wix-site-id': WIX_SITE_ID
    }
  });
}

async function wixDataGet(collectionId, itemId) {
  const auth = getWixAuth();
  return httpsRequest({
    hostname: 'www.wixapis.com',
    path: `/wix-data/v2/items/${encodeURIComponent(itemId)}?dataCollectionId=${encodeURIComponent(collectionId)}`,
    method: 'GET',
    headers: {
      'Authorization': auth.accessToken,
      'wix-site-id': WIX_SITE_ID
    }
  });
}

async function wixDataUpdate(collectionId, itemId, data) {
  const auth = getWixAuth();
  return httpsRequest({
    hostname: 'www.wixapis.com',
    path: '/wix-data/v2/items/' + encodeURIComponent(itemId),
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': auth.accessToken,
      'wix-site-id': WIX_SITE_ID
    }
  }, {
    dataCollectionId: collectionId,
    dataItem: { _id: itemId, data }
  });
}

// ═══════════════════════════════════════════════════════════════
//  STEP 1: CLEANUP DUPLICATE INVITATIONS
// ═══════════════════════════════════════════════════════════════
async function cleanupDuplicates() {
  console.log('\n╔═══════════════════════════════════════════════╗');
  console.log('║  Step 1: Cleanup Duplicate Invitations        ║');
  console.log('╚═══════════════════════════════════════════════╝\n');

  // Query all invitations for this event
  const result = await wixQuery('EviteInvitations', { eventId: EVENT_ID });
  if (result.status !== 200 || !result.data?.dataItems) {
    console.log('  ❌ Failed to query invitations:', result.status);
    console.log('  Response:', JSON.stringify(result.data).substring(0, 300));
    return;
  }

  const allInvites = result.data.dataItems.map(item => ({
    id: item._id || item.data?._id,
    email: (item.data?.recipientEmail || '').toLowerCase(),
    name: item.data?.recipientName || '',
    responded: item.data?.responded || false,
    rsvpStatus: item.data?.rsvpStatus || null,
    sentAt: item.data?.sentAt || item.data?._createdDate || '',
    emailSent: item.data?.emailSent || false,
    token: item.data?.token || ''
  }));

  console.log(`  Total invitation records: ${allInvites.length}`);

  // Group by email
  const byEmail = {};
  allInvites.forEach(inv => {
    const key = inv.email;
    if (!byEmail[key]) byEmail[key] = [];
    byEmail[key].push(inv);
  });

  const duplicateEmails = Object.entries(byEmail).filter(([, arr]) => arr.length > 1);
  console.log(`  Unique emails: ${Object.keys(byEmail).length}`);
  console.log(`  Emails with duplicates: ${duplicateEmails.length}`);

  if (duplicateEmails.length === 0) {
    console.log('  ✅ No duplicates found!');
    return;
  }

  // For each email with dupes, pick the best one to keep
  const toDelete = [];
  duplicateEmails.forEach(([email, invites]) => {
    // Strategy: keep the one that responded (rsvpStatus !== null), else the most recent
    invites.sort((a, b) => {
      // Responded wins
      if (a.responded && !b.responded) return -1;
      if (!a.responded && b.responded) return 1;
      // Most recent sentAt wins
      return (b.sentAt || '').localeCompare(a.sentAt || '');
    });

    const kept = invites[0];
    const dupes = invites.slice(1);
    console.log(`  📧 ${email}: ${invites.length} records → keeping ${kept.responded ? '(responded: ' + kept.rsvpStatus + ')' : '(latest)'}, deleting ${dupes.length}`);
    dupes.forEach(d => toDelete.push(d));
  });

  console.log(`\n  🗑️  Deleting ${toDelete.length} duplicate records...`);

  let deleted = 0, failed = 0;
  for (const inv of toDelete) {
    try {
      const result = await wixDelete('EviteInvitations', inv.id);
      if (result.status === 200 || result.status === 204) {
        deleted++;
      } else {
        failed++;
        console.log(`    ❌ Delete failed for ${inv.email} (${inv.id}): ${result.status}`);
      }
    } catch (e) {
      failed++;
      console.log(`    ❌ Error deleting ${inv.id}: ${e.message}`);
    }
  }

  console.log(`\n  ✅ Deleted: ${deleted} | Failed: ${failed}`);

  // Update event totalInvitesSent
  const remaining = allInvites.length - deleted;
  try {
    const evResult = await wixDataGet('EviteEvents', EVENT_ID);
    if (evResult.status === 200) {
      const evData = evResult.data.dataItem?.data || {};
      evData.totalInvitesSent = remaining;
      await wixDataUpdate('EviteEvents', EVENT_ID, evData);
      console.log(`  ✅ Updated totalInvitesSent to ${remaining}`);
    }
  } catch (e) {
    console.log(`  ⚠️  Could not update event count: ${e.message}`);
  }
}

// ═══════════════════════════════════════════════════════════════
//  STEP 2: UPDATE EVENT HIGHLIGHTS WITH PRICING
// ═══════════════════════════════════════════════════════════════
async function updateHighlights() {
  console.log('\n╔═══════════════════════════════════════════════╗');
  console.log('║  Step 2: Update Event Highlights (Pricing)    ║');
  console.log('╚═══════════════════════════════════════════════╝\n');

  // Get current event
  const evResult = await wixDataGet('EviteEvents', EVENT_ID);
  if (evResult.status !== 200) {
    console.log('  ❌ Failed to read event:', evResult.status);
    return false;
  }

  const evData = evResult.data.dataItem?.data || {};
  console.log('  Current highlights: ' + (evData.highlights || '(empty)').substring(0, 100) + '...');

  // Update highlights
  const newHighlights = `Traditional alpona, cultural performances by our members and their families, authentic Bengali cuisine, kids activities, and Rabindra-Nazrul sangeet performances.\n\n${PRICING_HIGHLIGHTS}`;
  evData.highlights = newHighlights;

  // Also update eviteConfig if it exists
  let eviteConfig = null;
  try {
    eviteConfig = evData.eviteConfig ? JSON.parse(evData.eviteConfig) : null;
  } catch {}

  if (eviteConfig) {
    eviteConfig.event = eviteConfig.event || {};
    eviteConfig.event.highlights = newHighlights;
    evData.eviteConfig = JSON.stringify(eviteConfig);
    console.log('  ✅ Updated eviteConfig.event.highlights');
  }

  // Save
  const updateResult = await wixDataUpdate('EviteEvents', EVENT_ID, evData);
  if (updateResult.status === 200 || updateResult.status === 201) {
    console.log('  ✅ Highlights updated in Wix DB!');
    console.log('  New highlights:\n    ' + newHighlights.replace(/\n/g, '\n    '));
    return true;
  } else {
    console.log('  ❌ Update failed:', updateResult.status, JSON.stringify(updateResult.data).substring(0, 200));
    return false;
  }
}

// ═══════════════════════════════════════════════════════════════
//  STEP 3: DRY RUN — SEND FRESH INVITE TO PRESIDENT
// ═══════════════════════════════════════════════════════════════
async function dryRunPresident() {
  console.log('\n╔═══════════════════════════════════════════════╗');
  console.log('║  Step 3: Dry Run — Send to President          ║');
  console.log('╚═══════════════════════════════════════════════╝\n');

  const result = await httpsRequest({
    hostname: 'www.jaxbengali.org',
    path: '/_functions/evite_send_invites',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, {
    eventId: EVENT_ID,
    recipientType: 'custom',
    customEmails: [{ name: 'Ranadhir Ghosh', email: 'ranadhir.ghosh@gmail.com', role: 'president' }]
  });

  console.log(`  Status: ${result.status}`);
  if (result.data?.sent !== undefined) {
    console.log(`  ✅ Sent: ${result.data.sent} | Failed: ${result.data.failed} | Total: ${result.data.total}`);
    if (result.data.details) {
      result.data.details.forEach(d => {
        console.log(`    ${d.sent ? '✅' : '❌'} ${d.name} <${d.email}>${d.error ? ' — ' + d.error : ''}`);
      });
    }
  } else {
    console.log('  Response:', JSON.stringify(result.data).substring(0, 300));
  }

  return result;
}

// ═══════════════════════════════════════════════════════════════
//  MAIN
// ═══════════════════════════════════════════════════════════════
async function main() {
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║  BANF Evite — Cleanup + Update + Dry Run               ║');
  console.log('╚══════════════════════════════════════════════════════════╝');
  console.log(`  Event: ${EVENT_ID}`);
  console.log(`  Date: ${new Date().toLocaleString()}\n`);

  const cleanupOnly = FLAG('cleanup-only');
  const updateOnly = FLAG('update-only');
  const dryRunOnly = FLAG('dry-run-only');
  const specificMode = cleanupOnly || updateOnly || dryRunOnly;

  if (!specificMode || cleanupOnly) {
    await cleanupDuplicates();
  }
  if (!specificMode || updateOnly) {
    await updateHighlights();
  }
  if (!specificMode || updateOnly || dryRunOnly) {
    await dryRunPresident();
  }

  console.log('\n═══════════════════════════════════════════════');
  console.log('  ✅ Done! Check president email for the updated invite.');
  console.log('  Once confirmed, run the E2E test agent:');
  console.log('    node evite-manager-e2e-agent.js --headed');
  console.log('═══════════════════════════════════════════════\n');
}

main().catch(e => { console.error('Fatal:', e.message); process.exit(1); });
