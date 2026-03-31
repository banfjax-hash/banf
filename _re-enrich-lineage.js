#!/usr/bin/env node
/**
 * One-shot re-enrichment: run analyzeCardPurchase() for existing expense entries
 * and POST updated notes with [LINEAGE] JSON back to the ledger.
 */
'use strict';

const https = require('https');
const fs = require('fs');
const path = require('path');

const API = 'https://www.jaxbengali.org/_functions';
const KEY = 'banf-bosonto-2026-live';

// ─── Copy of BANF_EVENTS_CALENDAR and MERCHANT_INTELLIGENCE from email reader ───
const BANF_EVENTS_CALENDAR = [
  { id: 'bosonto-utsob-2026', name: 'Bosonto Utsob', date: '2026-03-07', type: 'Cultural' },
  { id: 'noboborsho-2026', name: 'Noboborsho', date: '2026-04-25', type: 'Cultural' },
  { id: 'kids-summer-sports-2026', name: 'Kids Summer Sports Training', date: '2026-06-01', type: 'Educational' },
  { id: 'sports-day-2026', name: 'Sports Day', date: '2026-07-01', type: 'Social' },
  { id: 'spondon-2026', name: 'Spondon', date: '2026-08-01', type: 'Cultural' },
  { id: 'mahalaya-2026', name: 'Mahalaya', date: '2026-10-17', type: 'Religious' },
  { id: 'durga-puja-2026', name: 'Durga Puja Day 1 & 2 + Lunch', date: '2026-10-24', type: 'Religious' },
  { id: 'lakshmi-puja-2026', name: 'Lakshmi Puja', date: '2026-10-25', type: 'Religious' },
  { id: 'kali-puja-2026', name: 'Kali Puja + Snacks', date: '2026-11-07', type: 'Religious' },
  { id: 'winter-picnic-2027', name: 'Winter Picnic', date: '2027-01-11', type: 'Social' },
  { id: 'saraswati-puja-2027', name: 'Saraswati Puja', date: '2027-02-27', type: 'Religious' },
];

const MERCHANT_INTELLIGENCE = [
  { pattern: /notarize|proof\.com/i, service: 'notary', category: 'admin',
    folderPatterns: ['SJCSD', 'Facility', 'Request', 'notari'],
    purposeKeywords: ['venue', 'facility', 'booking', 'permit'],
    description: 'Online notarization service — likely notarizing venue/facility booking forms' },
  { pattern: /eventsured|event\s*insur/i, service: 'event_insurance', category: 'insurance',
    folderPatterns: ['insurance', 'policy', 'certificate', 'liability'],
    purposeKeywords: ['liability', 'insurance', 'coverage', 'event'],
    description: 'Event liability insurance — coverage required by venue for event hosting' },
  { pattern: /facilitron/i, service: 'venue_booking', category: 'venue',
    folderPatterns: ['facilitron', 'venue', 'booking'],
    purposeKeywords: ['venue', 'hall', 'rental', 'booking'],
    description: 'Facilitron venue booking/rental platform' },
  { pattern: /publix|walmart|costco|aldi|winn.?dixie|sam.?s\s*club|apna\s*bazar/i, service: 'grocery', category: 'food_grocery',
    folderPatterns: [],
    purposeKeywords: ['food', 'grocery', 'catering', 'supplies'],
    description: 'Grocery/food purchase for event catering or supplies' },
];

function log(lvl, msg) { console.log(`[${lvl}] ${msg}`); }

function analyzeCardPurchase(txn) {
  const merchant = (txn.payerOrPayee || txn.description || '').trim();
  const purchaseDate = txn.date || new Date().toISOString().slice(0, 10);
  const enrichment = { category: 'debit_card', eventId: '', eventName: '', notes: '', confidence: 'low', linkedDocuments: [] };

  const matched = MERCHANT_INTELLIGENCE.find(m => m.pattern.test(merchant));
  if (matched) {
    enrichment.category = matched.category;
    enrichment.notes = matched.description;
    log('INFO', `  Merchant "${merchant}" → ${matched.service} (${matched.category})`);

    // Document/folder scanning
    if (matched.folderPatterns.length > 0) {
      try {
        const baseDir = process.cwd();
        const entries = fs.readdirSync(baseDir, { withFileTypes: true });
        for (const entry of entries) {
          const name = entry.name.toLowerCase();
          const matchesFolder = matched.folderPatterns.some(fp => name.includes(fp.toLowerCase()));
          if (matchesFolder) {
            if (entry.isDirectory()) {
              const subFiles = fs.readdirSync(path.join(baseDir, entry.name));
              for (const sf of subFiles) {
                enrichment.linkedDocuments.push({ folder: entry.name, file: sf, path: path.join(entry.name, sf) });
              }
              log('INFO', `  Found related folder: ${entry.name}/ (${subFiles.length} files)`);
            } else if (entry.isFile()) {
              enrichment.linkedDocuments.push({ folder: '.', file: entry.name, path: entry.name });
              log('INFO', `  Found related file: ${entry.name}`);
            }
          }
        }
      } catch (e) { log('WARN', `  Folder scan error: ${e.message}`); }
    }

    // Extract event clues from linked documents
    let docEventClue = '';
    for (const doc of enrichment.linkedDocuments) {
      const docName = (doc.folder + ' ' + doc.file).toLowerCase();
      for (const ev of BANF_EVENTS_CALENDAR) {
        const evKeywords = ev.name.toLowerCase().split(/[\s\-–]+/);
        if (evKeywords.some(kw => kw.length > 3 && docName.includes(kw))) { docEventClue = ev.id; break; }
      }
      if (!docEventClue && /facility.?use.?request|venue.?booking|mill\s*creek/i.test(docName)) {
        try {
          const scripts = fs.readdirSync(process.cwd()).filter(f =>
            /send.*facility|send.*venue|send.*booking|facilitron/i.test(f) && f.endsWith('.js'));
          for (const script of scripts) {
            const content = fs.readFileSync(path.join(process.cwd(), script), 'utf8');
            for (const ev of BANF_EVENTS_CALENDAR) {
              if (content.includes(ev.date) || content.toLowerCase().includes(ev.name.toLowerCase())) {
                docEventClue = ev.id;
                log('INFO', `  Script ${script} references event: ${ev.name}`);
                break;
              }
            }
            if (docEventClue) break;
          }
        } catch (e) {}
      }
      if (docEventClue) break;
    }

    if (docEventClue) {
      const ev = BANF_EVENTS_CALENDAR.find(e => e.id === docEventClue);
      if (ev) {
        enrichment.eventId = ev.id; enrichment.eventName = ev.name; enrichment.confidence = 'high';
        enrichment.notes += ` | Linked to ${ev.name} (${ev.date}) via document correlation`;
      }
    }
  }

  // Date-proximity
  if (!enrichment.eventId) {
    const pDate = new Date(purchaseDate);
    if (!isNaN(pDate.getTime())) {
      let bestUpcoming = null, bestUpcomingDays = Infinity;
      for (const ev of BANF_EVENTS_CALENDAR) {
        const evDate = new Date(ev.date);
        const diffDays = (evDate - pDate) / 86400000;
        if (diffDays >= 0 && diffDays < bestUpcomingDays) { bestUpcoming = ev; bestUpcomingDays = diffDays; }
      }
      if (bestUpcoming && bestUpcomingDays <= 60) {
        enrichment.eventId = bestUpcoming.id; enrichment.eventName = bestUpcoming.name;
        enrichment.confidence = bestUpcomingDays <= 30 ? 'medium' : 'low';
        const reason = matched
          ? `${matched.service} purchase ${Math.round(bestUpcomingDays)}d before ${bestUpcoming.name}`
          : `${Math.round(bestUpcomingDays)}d before ${bestUpcoming.name}`;
        enrichment.notes += (enrichment.notes ? ' | ' : '') + `Hypothesis: ${reason}`;

        if (matched && matched.purposeKeywords.length > 0) {
          const isVenueRelated = matched.purposeKeywords.some(kw => ['venue', 'facility', 'booking', 'permit'].includes(kw));
          const isInsurance = matched.service === 'event_insurance';
          const isFood = matched.service === 'grocery';
          if (isVenueRelated && bestUpcomingDays <= 45) { enrichment.confidence = 'high'; enrichment.notes += ' | Venue-related expense aligns with event preparation timeline'; }
          else if (isInsurance && bestUpcomingDays <= 45) { enrichment.confidence = 'high'; enrichment.notes += ' | Event insurance typically purchased during event preparation'; }
          else if (isFood && bestUpcomingDays <= 7) { enrichment.confidence = 'high'; enrichment.notes += ' | Food purchase within 7 days of event — likely event catering'; }
        }
      }
    }
  }

  if (enrichment.linkedDocuments.length > 0) {
    const docList = enrichment.linkedDocuments.map(d => d.path).join(', ');
    enrichment.notes += ` | Documents: ${docList}`;
  }

  // Build lineage
  const lineage = {
    engine: 'ExpenseIQ', version: '1.0', analyzedAt: new Date().toISOString(), merchant,
    steps: [],
    documents: enrichment.linkedDocuments.map(d => ({
      folder: d.folder, file: d.file, path: d.path,
      type: /\.(pdf|doc|docx)$/i.test(d.file) ? 'document' :
            /\.(js)$/i.test(d.file) ? 'script' :
            /\.(xlsx?|csv)$/i.test(d.file) ? 'spreadsheet' :
            /\.(jpg|jpeg|png|gif)$/i.test(d.file) ? 'image' : 'file'
    })),
    confidence: enrichment.confidence,
    eventMatch: enrichment.eventId ? {
      eventId: enrichment.eventId, eventName: enrichment.eventName,
      method: enrichment.linkedDocuments.length > 0 ? 'document_correlation' : 'date_proximity'
    } : null
  };

  const segments = enrichment.notes.split(' | ').filter(Boolean);
  for (const seg of segments) {
    if (seg.startsWith('Hypothesis:')) lineage.steps.push({ step: 'date_proximity', detail: seg.replace('Hypothesis: ', ''), icon: 'calendar-alt' });
    else if (seg.includes('via document correlation')) lineage.steps.push({ step: 'document_verification', detail: seg, icon: 'file-alt' });
    else if (seg.includes('aligns with event') || seg.includes('typically purchased') || seg.includes('within 7 days')) lineage.steps.push({ step: 'purpose_verification', detail: seg, icon: 'check-double' });
    else if (seg.startsWith('Documents:')) lineage.steps.push({ step: 'document_scan', detail: seg, icon: 'folder-open' });
    else lineage.steps.push({ step: 'merchant_id', detail: seg, icon: 'search' });
  }

  if (matched) {
    lineage.steps.unshift({
      step: 'merchant_id',
      detail: `"${merchant}" identified as ${matched.service} (${matched.category})`,
      icon: 'store', source: 'MERCHANT_INTELLIGENCE knowledge base'
    });
  }

  enrichment.lineage = lineage;
  return enrichment;
}

function httpsRequest(url, opts) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || 443,
      path: urlObj.pathname + urlObj.search,
      method: opts.method || 'GET',
      headers: opts.headers || {},
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); } catch (_) { resolve(data); }
      });
    });
    req.on('error', reject);
    if (opts.body) req.write(opts.body);
    req.end();
  });
}

async function main() {
  // The 4 entries to re-enrich
  const entries = [
    { id: 'db6e3da0-ce2d-4543-9e3c-09e73f3beaae', payerOrPayee: 'NOTARIZE DBA PROOF.COM', amount: 25, date: '2026-03-17', description: 'NOTARIZE DBA PROOF.COM' },
    { id: '986632cd-0d99-4b26-95fc-70d8ed8c2922', payerOrPayee: 'Eventsured', amount: 121.92, date: '2026-03-16', description: 'Eventsured' },
    { id: '8ce49ee4-a1af-4dd8-b398-cffb0a581d26', payerOrPayee: 'PUBLIX', amount: 1, date: '2026-03-06', description: 'PUBLIX' },
    { id: '7e4166b9-c76e-4c28-a2f8-7f17ec9fb1a3', payerOrPayee: 'APNA BAZAR in JACKSONVILLE UNITED STATES', amount: 1, date: '2026-03-06', description: 'APNA BAZAR' },
  ];

  const updates = [];
  for (const entry of entries) {
    console.log(`\n── Analyzing: ${entry.payerOrPayee} ($${entry.amount}) ──`);
    const txn = { description: entry.description, amount: entry.amount, date: entry.date, payerOrPayee: entry.payerOrPayee };
    const iq = analyzeCardPurchase(txn);
    console.log(`  Category: ${iq.category}`);
    console.log(`  Event: ${iq.eventName || '(none)'}`);
    console.log(`  Confidence: ${iq.confidence}`);
    console.log(`  Linked docs: ${iq.linkedDocuments.length}`);
    console.log(`  Lineage steps: ${iq.lineage.steps.length}`);

    // Build the note: AI-enriched summary + [LINEAGE] JSON
    let noteParts = [];
    noteParts.push(`AI-enriched: ${iq.notes.split(' | ')[0]}`);
    noteParts.push(`${iq.confidence.toUpperCase()} confidence match to ${iq.eventName} (${iq.lineage.eventMatch ? iq.lineage.eventMatch.method.replace('_', ' ') : 'date proximity'}).`);

    let notes = noteParts.join('. ').replace(/\.\./g, '.');
    notes += '\n[LINEAGE]' + JSON.stringify(iq.lineage);

    updates.push({
      id: entry.id,
      description: entry.description,
      amount: entry.amount,
      category: iq.category,
      eventName: iq.eventName,
      eventId: iq.eventId,
      notes,
    });
  }

  console.log(`\n── Posting ${updates.length} updates to ledger ──`);
  const resp = await httpsRequest(API + '/ledger_update', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ adminKey: KEY, updates }),
  });

  console.log('Response:', JSON.stringify(resp, null, 2));
}

main().catch(e => { console.error('FATAL:', e); process.exit(1); });
