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
const HF_API_TOKEN = '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';
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
            title: 'BANF Organization Overview',
            content: 'BANF (Bengali Association of Northeast Florida) is a community organization serving Bengali-speaking families in the Jacksonville, Florida area. We organize cultural events, Durga Puja, Saraswati Puja, picnics, and community gatherings. Membership is open to all Bengali families.',
            category: 'organization',
            tags: 'about,banf,organization,overview',
            sourceType: 'seed'
        },
        {
            title: 'Membership Information and Dues',
            content: 'Annual membership dues are $50 per family. Membership includes access to all BANF events at member pricing, voting rights, and community newsletter. To join, pay dues and complete the membership form. Contact banfjax@gmail.com for questions.',
            category: 'membership',
            tags: 'membership,dues,join,register,pay',
            sourceType: 'seed'
        },
        {
            title: 'Event Registration Process',
            content: 'To register for BANF events, visit the events page on our website or email banfjax@gmail.com with your name, family size, and the event name. Payment can be made via Zelle, Venmo, or check. Members receive discounted pricing. RSVPs are required by the deadline.',
            category: 'events',
            tags: 'event,register,rsvp,ticket,attend',
            sourceType: 'seed'
        },
        {
            title: 'Contact and Communication',
            content: 'Email: banfjax@gmail.com. For urgent matters, contact the Executive Committee. General inquiries are responded to within 2-3 business days. For complaints or suggestions, use the feedback form on our website.',
            category: 'contact',
            tags: 'contact,email,phone,reach,communicate',
            sourceType: 'seed'
        },
        {
            title: 'Durga Puja Information',
            content: 'BANF celebrates Durga Puja annually, typically in October. This is our biggest event of the year. It includes traditional puja ceremonies, cultural programs, food, and community gathering. Registration is required. Members get priority registration.',
            category: 'events',
            tags: 'durga puja,puja,festival,october,cultural',
            sourceType: 'seed'
        },
        {
            title: 'Payment Methods Accepted',
            content: 'BANF accepts payments via Zelle (banfjax@gmail.com), Venmo (@banfjax), personal check made out to BANF, and cash at events. Online credit card payments are not currently available. Always include your name and purpose (e.g., "Durga Puja registration, Khan family")',
            category: 'payment',
            tags: 'payment,zelle,venmo,check,cash,pay,dues',
            sourceType: 'seed'
        },
        {
            title: 'Sponsorship Opportunities',
            content: 'BANF offers sponsorship tiers: Title Sponsor ($1000+), Gold Sponsor ($500), Silver Sponsor ($250), Bronze Sponsor ($100). Benefits include logo placement in event programs, social media recognition, and booth space at major events. Email banfjax@gmail.com for sponsorship packages.',
            category: 'sponsorship',
            tags: 'sponsor,sponsorship,donate,advertise,business',
            sourceType: 'seed'
        },
        {
            title: 'Volunteer and Career Help',
            content: 'BANF connects community members seeking jobs or career help with experienced professionals. We organize career guidance sessions, resume reviews, and networking events. Contact banfjax@gmail.com to sign up as a mentor or mentee.',
            category: 'career',
            tags: 'career,job,volunteer,help,mentor,professional,resume',
            sourceType: 'seed'
        },
        {
            title: 'Complaint and Feedback Process',
            content: 'BANF takes all complaints seriously. Submit complaints to banfjax@gmail.com with Subject: COMPLAINT. The EC (Executive Committee) reviews all complaints within 7 days. Anonymous complaints are also accepted. All complaints are logged and tracked for resolution.',
            category: 'complaint',
            tags: 'complaint,feedback,issue,problem,resolution,grievance',
            sourceType: 'seed'
        },
        {
            title: 'Newsletter and E-Magazine',
            content: 'BANF publishes a quarterly e-magazine and monthly newsletter. Members can submit articles, photos, and community updates. Contact the media team at banfjax@gmail.com with Subject: MAGAZINE. Past issues are available on our website.',
            category: 'publication',
            tags: 'newsletter,magazine,publication,article,submit',
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
