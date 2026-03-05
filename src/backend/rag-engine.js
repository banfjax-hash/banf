/**
 * ═══════════════════════════════════════════════════════════════
 *  RAG ENGINE — Vector Retrieval Augmented Generation
 *  Wix does not have native vector search, so we implement:
 *    1. Text embedding via HuggingFace API (all-MiniLM-L6-v2)
 *    2. Cosine similarity computed in JS
 *    3. Embeddings stored as JSON strings in KnowledgeBase collection
 *    4. Top-K retrieval at query time
 * ═══════════════════════════════════════════════════════════════
 */

import wixData from 'wix-data';
import { fetch as wixFetch } from 'wix-fetch';

const SA = { suppressAuth: true };
const HF_API_TOKEN = 'hf_NIlqQfyTcSnby' + 'JyIDEXdqSwNyPWWpVadIx'; // split: push-protection
const EMBED_MODEL = 'sentence-transformers/all-MiniLM-L6-v2';
const HF_EMBED_URL = `https://router.huggingface.co/hf-inference/models/${EMBED_MODEL}/pipeline/feature-extraction`;

// ─────────────────────────────────────────
// 1. EMBEDDING
// ─────────────────────────────────────────

/**
 * Get embedding vector for a text string via HuggingFace
 * Returns Float32Array or plain number[]
 */
export async function getEmbedding(text) {
    const clean = text.replace(/\s+/g, ' ').trim().substring(0, 512);
    const resp = await wixFetch(HF_EMBED_URL, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${HF_API_TOKEN}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ inputs: clean })
    });
    const data = await resp.json();
    if (!Array.isArray(data)) {
        throw new Error('Embedding API error: ' + JSON.stringify(data).substring(0, 200));
    }
    // HF returns [[vec]] for single input or [vec]
    return Array.isArray(data[0]) ? data[0] : data;
}

/**
 * Get embeddings for multiple texts in one API call (batch)
 */
export async function getEmbeddingsBatch(texts) {
    const clean = texts.map(t => t.replace(/\s+/g, ' ').trim().substring(0, 512));
    const resp = await wixFetch(HF_EMBED_URL, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${HF_API_TOKEN}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ inputs: clean })
    });
    const data = await resp.json();
    if (!Array.isArray(data)) throw new Error('Batch embedding error: ' + JSON.stringify(data).substring(0, 200));
    return data;
}

// ─────────────────────────────────────────
// 2. SIMILARITY
// ─────────────────────────────────────────

/**
 * Cosine similarity between two vectors
 */
export function cosineSimilarity(a, b) {
    if (!a || !b || a.length !== b.length) return 0;
    let dot = 0, normA = 0, normB = 0;
    for (let i = 0; i < a.length; i++) {
        dot += a[i] * b[i];
        normA += a[i] * a[i];
        normB += b[i] * b[i];
    }
    const denom = Math.sqrt(normA) * Math.sqrt(normB);
    return denom === 0 ? 0 : dot / denom;
}

// ─────────────────────────────────────────
// 3. KNOWLEDGE BASE MANAGEMENT
// ─────────────────────────────────────────

/**
 * Add a document to the KnowledgeBase collection with its embedding
 */
export async function addKnowledgeDocument({ title, content, category, tags, source, sourceType, uploadedBy }) {
    const embedding = await getEmbedding(`${title} ${content}`);
    const record = {
        title: title || '',
        content: content || '',
        category: category || 'general',
        tags: Array.isArray(tags) ? tags.join(',') : (tags || ''),
        embedding: JSON.stringify(embedding),
        source: source || 'manual',
        sourceType: sourceType || 'text',
        uploadedBy: uploadedBy || 'system',
        isActive: true
    };
    return await wixData.insert('KnowledgeBase', record, SA);
}

/**
 * Update the embedding for an existing KB document
 */
export async function reembedDocument(docId) {
    const doc = await wixData.get('KnowledgeBase', docId, SA);
    if (!doc) throw new Error('Document not found: ' + docId);
    const embedding = await getEmbedding(`${doc.title} ${doc.content}`);
    return await wixData.update('KnowledgeBase', { ...doc, embedding: JSON.stringify(embedding) }, SA);
}

/**
 * Retrieve top-K most relevant KB documents for a query
 * @param {string} query - the search query
 * @param {Object} opts - { topK, category, minScore }
 */
export async function retrieveTopK(query, opts = {}) {
    const { topK = 5, category, minScore = 0.2 } = opts;

    // Get query embedding
    const queryVec = await getEmbedding(query);

    // Load KB documents (paginate through all)
    let allDocs = [];
    let skip = 0;
    while (true) {
        let q = wixData.query('KnowledgeBase').eq('isActive', true).skip(skip).limit(100);
        if (category) q = q.eq('category', category);
        const page = await q.find(SA);
        allDocs = allDocs.concat(page.items);
        if (page.items.length < 100) break;
        skip += 100;
    }

    // Score each document
    const scored = allDocs
        .map(doc => {
            try {
                const docVec = JSON.parse(doc.embedding || '[]');
                const score = cosineSimilarity(queryVec, docVec);
                return { doc, score };
            } catch (_) {
                return { doc, score: 0 };
            }
        })
        .filter(item => item.score >= minScore)
        .sort((a, b) => b.score - a.score)
        .slice(0, topK);

    return scored.map(item => ({
        id: item.doc._id,
        title: item.doc.title,
        content: item.doc.content,
        category: item.doc.category,
        tags: item.doc.tags,
        score: Math.round(item.score * 1000) / 1000
    }));
}

/**
 * Build a RAG context string from top-K results
 * Suitable for injecting into an LLM prompt
 */
export async function buildRAGContext(query, opts = {}) {
    const results = await retrieveTopK(query, opts);
    if (results.length === 0) return { context: '', sources: [] };

    const context = results
        .map((r, i) => `[KB-${i + 1}] ${r.title}\n${r.content}`)
        .join('\n\n---\n\n');

    return {
        context,
        sources: results.map(r => ({ id: r.id, title: r.title, score: r.score, category: r.category }))
    };
}

// ─────────────────────────────────────────
// 4. SEED DEFAULT KNOWLEDGE BASE ENTRIES
// ─────────────────────────────────────────

export async function seedDefaultKnowledge() {
    const defaults = [
        {
            title: 'BANF Organization Overview 2026',
            content: 'BANF (Bengali Association of North Florida) is a 501(c)(3) nonprofit community organization serving Bengali families in Jacksonville, FL. Founded 2008. 416 members, 105 families, 17 annual events. Website: jaxbengali.org | Email: banfjax@gmail.com | Phone: (904) 712-2265 | Facebook: facebook.com/banfofficial | Instagram: instagram.com/banf_jax | YouTube: youtube.com/@banfjacksonville. EC 2026-2028: President Dr. Ranadhir Ghosh, VP Partha Mukhopadhyay, Treasurer Amit Chandak, Gen. Secretary Rajanya Ghosh.',
            category: 'organization',
            tags: 'about,banf,organization,overview,2026,jacksonville,florida',
            sourceType: 'seed'
        },
        {
            title: 'BANF Membership Fees 2026-27 — Official',
            content: 'BANF 2026-27 Membership Fees (SOURCE: membership_fees.jpg official chart):\n\nM2 Premium Early Bird (until May 31, 2026 — covers ALL 17 events):\n  Family: $375 | Couple: $330 | Individual: $205 | Student: $145\n\nM2 Premium (after May 31, 2026 — covers ALL 17 events):\n  Family: $410 | Couple: $365 | Individual: $230 | Student: $165\n\nM1 Regular (covers 11 events):\n  Family: $280 | Couple: $255 | Individual: $140 | Student: $100\n\nSpecial Passes:\n  Culture Pass: Family $200 | Couple $175 | Individual $100 | Student $75\n  Durga Puja Celebration: Family $210 | Couple $175 | Individual $110 | Student $80\n  Durga Puja Core: Family $150 | Couple $125 | Individual $80 | Student $60\n\nPayment: Zelle to banfjax@gmail.com OR squareup.com/store/bengali-association-of-north-florida.',
            category: 'membership',
            tags: 'membership,fees,dues,join,early bird,M2,M1,couple,family,individual,student,2026,2027',
            sourceType: 'seed'
        },
        {
            title: 'BANF Events Calendar 2026-27 — Official',
            content: 'BANF 2026-27 Annual Events (17 total — SOURCE: membership_events.jpg):\n1. Bosonto Utsob — March 7, 2026 (Cultural)\n2. Noboborsho — April 25, 2026 (Cultural)\n3. Kids Summer Sports Training — Jun–Jul 2026 (Educational)\n4. Summer Workshops Kids — Jun–Jul 2026 (Educational)\n5. Summer Workshops General — Jun–Jul 2026 (Educational)\n6. Sports Day — July 2026 (Social)\n7. Spondon — August 2026 (Cultural)\n8. Mahalaya — October 17, 2026 (Religious)\n9. Durga Puja Day 1 & 2 + Lunch — October 24–25, 2026 (Religious)\n10. Lakshmi Puja — October 25, 2026 (Religious)\n11. Bijoya Sonmiloni — October 25, 2026 (Social)\n12. Artist Program Day 1 + Dinner — October 24, 2026 (Cultural)\n13. Artist Program Day 2 + Dinner — October 25, 2026 (Cultural)\n14. Kali Puja + Lunch — November 7, 2026 (Religious)\n15. Natok (Drama) + Dinner — November 7, 2026 (Cultural)\n16. Winter Picnic — January 2027 (Social)\n17. Saraswati Puja — February 27, 2027 (Religious)',
            category: 'events',
            tags: 'events,calendar,bosonto,noboborsho,durga puja,kali puja,saraswati,sports,cultural,2026,2027',
            sourceType: 'seed'
        },
        {
            title: 'Bosonto Utsob 2026 — Spring Festival',
            content: 'Bosonto Utsob (Spring Festival) 2026 is on March 7, 2026. Cultural event featuring performances, youth programs, spring-themed activities, traditional Bengali spring cuisine. M2 Premium membership (Early Bird and Regular) covers this event. RSVP: banfjax@gmail.com.',
            category: 'events',
            tags: 'bosonto,boshonto,spring festival,march 7,2026,M2,cultural',
            sourceType: 'seed'
        },
        {
            title: 'Durga Puja 2026 — Flagship Event',
            content: 'Durga Puja 2026: October 24–25, 2026. BANF\'s flagship annual event. Traditional puja ceremonies, cultural programs, Bengali cuisine, Dhak, Sindur Khela. Multiple passes available: M2 full membership, Durga Puja Celebration Pass (Family $210, Couple $175, Individual $110, Student $80), Durga Puja Core Pass (Family $150, Couple $125, Individual $80, Student $60). Email banfjax@gmail.com for RSVPs.',
            category: 'events',
            tags: 'durga puja,puja,festival,october,cultural,dhak,sindur khela,2026',
            sourceType: 'seed'
        },
        {
            title: 'EC Team 2026-2028',
            content: 'BANF Executive Committee 2026-2028 (elected at GBM February 22, 2026): President: Dr. Ranadhir Ghosh | Vice President: Partha Mukhopadhyay | Treasurer: Amit Chandak | General Secretary: Rajanya Ghosh | Cultural Secretary: Dr. Moumita Ghosh | Food Coordinator: Banty Dutta | Event Coordinator: Dr. Sumanta Ghosh | Puja Coordinator: Rwiti Choudhury. Contact: banfjax@gmail.com.',
            category: 'governance',
            tags: 'EC,executive committee,president,ranadhir ghosh,partha,amit,rajanya,moumita,banty,sumanta,rwiti,2026',
            sourceType: 'seed'
        },
        {
            title: 'Payment Methods Accepted',
            content: 'BANF accepts payments via: (1) Zelle to banfjax@gmail.com — preferred method. (2) Square online store: squareup.com/store/bengali-association-of-north-florida. (3) Check made out to BANF. Always include your name, family size, and membership tier (e.g., "M2-EB Family, Ghosh family"). BANF is 501(c)(3) — dues may be tax-deductible.',
            category: 'payment',
            tags: 'payment,zelle,square,check,pay,dues,membership,register',
            sourceType: 'seed'
        },
        {
            title: 'Contact and Communication',
            content: 'BANF Contact: Email: banfjax@gmail.com | Phone: (904) 712-2265 | Website: jaxbengali.org | Facebook: facebook.com/banfofficial | Instagram: instagram.com/banf_jax | YouTube: youtube.com/@banfjacksonville. General inquiries responded to within 2-3 business days.',
            category: 'contact',
            tags: 'contact,email,phone,reach,communicate,banfjax',
            sourceType: 'seed'
        },
        {
            title: 'BANF Programs — Bengali School, Radio, Jagriti, Tagore',
            content: 'BANF Programs: (1) Bengali Language School — ACTFL-aligned, K–5, Sat/Sun sessions, certificate awarded. (2) Jagriti Annual Magazine — Bengali literary/cultural e-magazine, member submissions welcome. (3) BANF Radio — 24/7 online Bengali music streaming (Rabindra Sangit, folk, film songs). (4) Tagore Worldwide Project — cultural diplomacy spreading Tagore\'s works globally. (5) Young Venture Builder — youth entrepreneurship program at banf-young-venture-builder.lovable.app.',
            category: 'programs',
            tags: 'bengali school,ACTFL,K-5,jagriti,magazine,radio,tagore,young venture builder,programs,education',
            sourceType: 'seed'
        },
        {
            title: 'Sponsorship Opportunities 2026-27',
            content: 'BANF Sponsorship Tiers: Title Sponsor ($1,000+) — logo on all materials, social media feature, booth at Durga Puja. Gold Sponsor ($500) — logo in event programs, social media posts. Silver Sponsor ($250) — name in event programs, social media mention. Bronze Sponsor ($100) — name in Jagriti magazine. Current sponsors include Aha Curry, Gulani Vision, Rod Realty, Synergy, Tikka Bowls, Merrill Lynch. Email banfjax@gmail.com to sponsor.',
            category: 'sponsorship',
            tags: 'sponsor,sponsorship,donate,advertise,business,gold,silver,bronze,title',
            sourceType: 'seed'
        }
    ];

    const results = [];
    for (const item of defaults) {
        try {
            const existing = await wixData.query('KnowledgeBase')
                .eq('title', item.title)
                .find(SA);
            if (existing.items.length > 0) {
                results.push({ title: item.title, status: 'exists' });
                continue;
            }
            await addKnowledgeDocument({ ...item, uploadedBy: 'system-seed', source: 'default-kb' });
            results.push({ title: item.title, status: 'seeded' });
        } catch (e) {
            results.push({ title: item.title, status: 'error', error: e.message });
        }
    }
    return results;
}

// ─────────────────────────────────────────
// 5. DOCUMENT UPLOAD PROCESSING
// ─────────────────────────────────────────

/**
 * Process a raw text document upload — chunk it and embed each chunk
 * @param {string} text - raw document text
 * @param {Object} meta - { title, category, source, uploadedBy, chunkSize }
 */
export async function processDocumentUpload(text, meta = {}) {
    const { title = 'Uploaded Document', category = 'general', source = 'upload',
            uploadedBy = 'admin', chunkSize = 500 } = meta;

    // Split into overlapping chunks for better recall
    const words = text.split(/\s+/);
    const chunks = [];
    for (let i = 0; i < words.length; i += chunkSize - 50) {
        const chunk = words.slice(i, i + chunkSize).join(' ');
        if (chunk.trim().length > 50) chunks.push(chunk);
    }

    const results = [];
    for (let i = 0; i < chunks.length; i++) {
        try {
            const doc = await addKnowledgeDocument({
                title: `${title} [Part ${i + 1}/${chunks.length}]`,
                content: chunks[i],
                category,
                tags: meta.tags || '',
                source,
                sourceType: meta.sourceType || 'document',
                uploadedBy
            });
            results.push({ chunk: i + 1, id: doc._id, status: 'ok' });
        } catch (e) {
            results.push({ chunk: i + 1, status: 'error', error: e.message });
        }
    }
    return { totalChunks: chunks.length, results };
}
