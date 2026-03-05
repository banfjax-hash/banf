/**
 * BANF RAG API v1.0 — HTTP Function Endpoints
 * Role-based knowledge retrieval + LLM-augmented answering
 * Comm analysis, document catalogue, and contextual insights
 */

import { ok, badRequest, serverError } from 'wix-http-functions';
import {
    searchKnowledge,
    getContextByCategory,
    buildRAGContext,
    analyzeCommHistory,
    classifyCommSubject,
    getKnowledgeStats,
    KNOWLEDGE_BASE,
    DOCUMENT_LIBRARY,
    SENSITIVITY,
    SENSITIVITY_RANK,
    ROLE_MAX_SENSITIVITY,
    COMM_CATEGORIES
} from 'backend/banf-rag-context';
import { checkPermission } from 'backend/rbac';
import wixData from 'wix-data';
import { fetch } from 'wix-fetch';

// ── HuggingFace LLM config ────────────────────────────────
// Token removed from source.  Store it in Wix > Content Management >
// SiteConfig collection with key = "HF_API_TOKEN" and value = hf_...
// (generate a new read-only Inference token at huggingface.co/settings/tokens)
const HF_LLM_URL = 'https://router.huggingface.co/featherless-ai/v1/chat/completions';
const HF_LLM_MDL = 'mistralai/Mistral-7B-Instruct-v0.3';

async function getHFToken() {
    try {
        const r = await wixData.query('SiteConfig').eq('key', 'HF_API_TOKEN').limit(1).find({ suppressAuth: true });
        if (r.items.length && r.items[0].value) return r.items[0].value;
    } catch (_) {}
    return null;
}

// ─── Helper ────────────────────────────────────────────────
function cors(data, status = 200) {
    return ok({
        body: JSON.stringify(data),
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
        }
    });
}
function optionsCors() {
    return ok({
        body: '',
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, x-user-email'
        }
    });
}

function getRoleFromEmail(email) {
    if (!email) return 'guest';
    const adminEmails = ['banfjax@gmail.com'];
    if (adminEmails.includes(email.toLowerCase())) return 'super_admin';
    return 'admin'; // Assume admin for all authenticated users calling these endpoints
}

// ═══════════════════════════════════════════════════════════
// GET /rag_search?q=...&role=...&limit=...
// Keyword-based knowledge search with role-based access control
// ═══════════════════════════════════════════════════════════
export function get_rag_search(request) {
    try {
        const { q, role: roleParam, limit } = request.query || {};
        const email  = request.headers['x-user-email'] || '';
        const role   = roleParam || getRoleFromEmail(email);
        const maxRes = parseInt(limit) || 5;

        if (!q) return cors({ success: false, error: 'q param required' });

        const results = searchKnowledge(q, role, maxRes);
        return cors({
            success: true,
            query: q,
            role,
            count: results.length,
            results
        });
    } catch (e) {
        return cors({ success: false, error: e.message });
    }
}
export function options_rag_search() { return optionsCors(); }

// ═══════════════════════════════════════════════════════════
// GET /rag_context?query=...&role=...
// Returns formatted RAG context string for LLM augmentation
// ═══════════════════════════════════════════════════════════
export function get_rag_context(request) {
    try {
        const { query, role: roleParam, chunks } = request.query || {};
        const email = request.headers['x-user-email'] || '';
        const role  = roleParam || getRoleFromEmail(email);
        const maxChunks = parseInt(chunks) || 4;

        if (!query) return cors({ success: false, error: 'query param required' });

        const context   = buildRAGContext(query, role, maxChunks);
        const rawChunks = searchKnowledge(query, role, maxChunks);
        return cors({ success: true, query, role, context, sourceChunks: rawChunks.map(c => c.chunkId) });
    } catch (e) {
        return cors({ success: false, error: e.message });
    }
}
export function options_rag_context() { return optionsCors(); }

// ═══════════════════════════════════════════════════════════
// GET /rag_knowledge_stats
// Knowledge base statistics
// ═══════════════════════════════════════════════════════════
export function get_rag_knowledge_stats(request) {
    try {
        const stats = getKnowledgeStats();
        return cors({ success: true, stats });
    } catch (e) {
        return cors({ success: false, error: e.message });
    }
}
export function options_rag_knowledge_stats() { return optionsCors(); }

// ═══════════════════════════════════════════════════════════
// GET /rag_categories?role=...
// List all categories with chunk counts (role-filtered)
// ═══════════════════════════════════════════════════════════
export function get_rag_categories(request) {
    try {
        const q     = request.query || {};
        const email = (request.headers || {})['x-user-email'] || '';
        const role  = q.role || getRoleFromEmail(email);
        const roleLevel = SENSITIVITY_RANK[ROLE_MAX_SENSITIVITY[role] || 'public'];

        const cats = {};
        KNOWLEDGE_BASE
            .filter(c => (SENSITIVITY_RANK[c.sensitivity] || 0) <= roleLevel)
            .forEach(c => {
                if (!cats[c.category]) cats[c.category] = { count: 0, chunks: [] };
                cats[c.category].count++;
                cats[c.category].chunks.push(c.chunkId);
            });

        return cors({
            success: true,
            role,
            totalCategories: Object.keys(cats).length,
            categories: cats
        });
    } catch (e) {
        return cors({ success: false, error: e.message });
    }
}
export function options_rag_categories() { return optionsCors(); }

// ═══════════════════════════════════════════════════════════
// GET /rag_documents?role=...&category=...
// List all source documents filtered by role and category
// ═══════════════════════════════════════════════════════════
export function get_rag_documents(request) {
    try {
        const qp       = request.query || {};
        const email    = (request.headers || {})['x-user-email'] || '';
        const role     = qp.role || getRoleFromEmail(email);
        const category = qp.category || null;
        const roleLevel = SENSITIVITY_RANK[ROLE_MAX_SENSITIVITY[role] || 'public'];

        let docs = DOCUMENT_LIBRARY.filter(d => {
            const docLevel = SENSITIVITY_RANK[d.sensitivity] || 0;
            return docLevel <= roleLevel;
        });
        if (category) docs = docs.filter(d => d.category === category);

        const bySensitivity = {};
        const byCategory    = {};
        docs.forEach(d => {
            bySensitivity[d.sensitivity] = (bySensitivity[d.sensitivity] || 0) + 1;
            byCategory[d.category] = (byCategory[d.category] || 0) + 1;
        });

        return cors({
            success: true,
            role,
            totalDocuments: docs.length,
            totalInLibrary: DOCUMENT_LIBRARY.length,
            bySensitivity,
            byCategory,
            documents: docs
        });
    } catch (e) {
        return cors({ success: false, error: e.message });
    }
}
export function options_rag_documents() { return optionsCors(); }

// ═══════════════════════════════════════════════════════════
// GET /rag_chunk?id=...
// Get a specific knowledge chunk by chunkId
// ═══════════════════════════════════════════════════════════
export function get_rag_chunk(request) {
    try {
        const { id } = request.query || {};
        const email  = (request.headers || {})['x-user-email'] || '';
        const role   = getRoleFromEmail(email);
        if (!id) return cors({ success: false, error: 'id param required' });

        const chunk = KNOWLEDGE_BASE.find(c => c.chunkId === id);
        if (!chunk) return cors({ success: false, error: 'Chunk not found' });

        const roleLevel  = SENSITIVITY_RANK[ROLE_MAX_SENSITIVITY[role] || 'public'];
        const chunkLevel = SENSITIVITY_RANK[chunk.sensitivity] || 0;
        if (chunkLevel > roleLevel) return cors({ success: false, error: 'Access denied', required: chunk.sensitivity });

        return cors({ success: true, chunk });
    } catch (e) {
        return cors({ success: false, error: e.message });
    }
}
export function options_rag_chunk() { return optionsCors(); }

// ═══════════════════════════════════════════════════════════
// POST /rag_ask  { question, role }
// Ask a question — RAG-augmented LLM answer
// ═══════════════════════════════════════════════════════════
export async function post_rag_ask(request) {
    try {
        const body     = await request.body.json();
        const { question, role: roleParam } = body;
        const email    = request.headers['x-user-email'] || '';
        const role     = roleParam || getRoleFromEmail(email);

        if (!question) return cors({ success: false, error: 'question required' });

        const context  = buildRAGContext(question, role, 5);
        const chunks   = searchKnowledge(question, role, 5);

        const systemPrompt = `You are the BANF (Bengali Association of North Florida) AI assistant. You have access to BANF's knowledge base about its community, events, membership, governance, finances, and programs. Answer questions accurately and helpfully based on the provided context. If information is not in the context, say so clearly. Keep answers concise and friendly.`;

        const userMessage = context
            ? `${context}\nQuestion: ${question}`
            : `Question: ${question}\n\nNote: No specific context found in BANF knowledge base for this query. Answer based on general knowledge about BANF if available.`;

        const llmRes = await fetch(HF_LLM_URL, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${await getHFToken()}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: HF_LLM_MDL,
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userMessage }
                ],
                max_tokens: 500,
                temperature: 0.3
            })
        });

        let answer = 'I could not retrieve an answer at this time.';
        if (llmRes.ok) {
            const llmData = await llmRes.json();
            answer = llmData.choices?.[0]?.message?.content || answer;
        }

        return cors({
            success: true,
            question,
            answer,
            role,
            contextUsed: chunks.length > 0,
            sourceChunks: chunks.map(c => ({ id: c.chunkId, title: c.title, category: c.category }))
        });
    } catch (e) {
        return cors({ success: false, error: e.message });
    }
}
export function options_rag_ask() { return optionsCors(); }

// ═══════════════════════════════════════════════════════════
// GET /rag_comms_analyze?memberId=...
// Fetch + analyze all comms for a member with categorization
// ═══════════════════════════════════════════════════════════
export async function get_rag_comms_analyze(request) {
    try {
        const { memberId } = request.query || {};
        const email = (request.headers || {})['x-user-email'] || '';
        if (!memberId) return cors({ success: false, error: 'memberId required' });

        // Fetch ALL comms for member from Wix collection
        const result = await wixData.query('MemberCommunications')
            .eq('memberId', memberId)
            .limit(1000)
            .find({ suppressAuth: true });

        const comms    = result.items || [];
        const analysis = analyzeCommHistory(comms);

        return cors({
            success: true,
            memberId,
            analysis
        });
    } catch (e) {
        return cors({ success: false, error: e.message });
    }
}
export function options_rag_comms_analyze() { return optionsCors(); }

// ═══════════════════════════════════════════════════════════
// POST /rag_comms_categorize  { comms: [...] }
// Categorize a batch of comm subjects
// ═══════════════════════════════════════════════════════════
export async function post_rag_comms_categorize(request) {
    try {
        const body = await request.body.json();
        const { comms } = body;
        if (!comms || !Array.isArray(comms)) return cors({ success: false, error: 'comms array required' });

        const categorized = comms.map(c => ({
            ...c,
            derivedCategory: classifyCommSubject(c.subject || c.Subject || '')
        }));

        return cors({ success: true, count: categorized.length, categorized });
    } catch (e) {
        return cors({ success: false, error: e.message });
    }
}
export function options_rag_comms_categorize() { return optionsCors(); }

// ═══════════════════════════════════════════════════════════
// GET /rag_member_insights?memberId=...
// Full member communication insights with RAG enrichment
// ═══════════════════════════════════════════════════════════
export async function get_rag_member_insights(request) {
    try {
        const { memberId } = request.query || {};
        const email = (request.headers || {})['x-user-email'] || '';
        if (!memberId) return cors({ success: false, error: 'memberId required' });

        // Get comms
        const commsResult = await wixData.query('MemberCommunications')
            .eq('memberId', memberId)
            .limit(1000)
            .find({ suppressAuth: true });
        const comms = commsResult.items || [];

        // Get member profile
        const memberResult = await wixData.query('CRMMembers')
            .eq('memberId', memberId)
            .limit(1)
            .find({ suppressAuth: true });
        const member = memberResult.items?.[0] || {};

        // Analyze comms
        const analysis = analyzeCommHistory(comms);

        // Build engagement score
        const inboundWeight  = 2;  // Member-initiated = more engaged
        const outboundWeight = 1;
        const engagementScore = Math.min(100,
            (analysis.inbound * inboundWeight + analysis.outbound * outboundWeight) * 5
        );

        // RAG context for member profile data
        const memberQuery = `${member.firstName} ${member.lastName} ${Object.keys(analysis.categories || {}).join(' ')}`;
        const ragChunks   = searchKnowledge(memberQuery, 'admin', 3);

        return cors({
            success: true,
            memberId,
            member: {
                name:         `${member.firstName || ''} ${member.lastName || ''}`.trim(),
                memberId:     member.memberId,
                familyId:     member.familyId,
                email:        member.email,
                memberSince:  member.memberSince,
                isECMember:   member.isECMember,
                isBOTMember:  member.isBOTMember,
                membershipStatus: member.membershipStatus
            },
            communicationInsights: {
                totalMessages:   analysis.total,
                inbound:         analysis.inbound,
                outbound:        analysis.outbound,
                engagementScore,
                engagementLevel: engagementScore >= 70 ? 'HIGH' : engagementScore >= 40 ? 'MEDIUM' : 'LOW',
                categoryBreakdown: analysis.categories,
                aiInsights:      analysis.insights,
                topCategory:     Object.entries(analysis.categories || {})
                    .filter(([, v]) => v.count > 0)
                    .sort((a, b) => b[1].count - a[1].count)[0]?.[0] || 'none',
                dateRange: analysis.timeline.length > 0 ? {
                    earliest: analysis.timeline[0]?.date,
                    latest:   analysis.timeline[analysis.timeline.length - 1]?.date
                } : null
            },
            ragContext: ragChunks.map(c => ({ id: c.chunkId, title: c.title, relevance: c.category }))
        });
    } catch (e) {
        return cors({ success: false, error: e.message });
    }
}
export function options_rag_member_insights() { return optionsCors(); }

// Alias: test uses member_insights, backend uses rag_member_insights
export async function get_member_insights(request) {
    return get_rag_member_insights(request);
}
export function options_member_insights() { return optionsCors(); }

// ═══════════════════════════════════════════════════════════
// GET /rag_sensitivity_map
// Returns the document + chunk sensitivity classification map
// (admin only)
// ═══════════════════════════════════════════════════════════
export function get_rag_sensitivity_map(request) {
    try {
        const email = (request.headers || {})['x-user-email'] || '';
        const role  = getRoleFromEmail(email);
        if (role !== 'super_admin' && role !== 'admin') {
            return cors({ success: false, error: 'Admin access required' });
        }

        const map = {
            public: {
                description: 'Visible to anyone — general info, events, programs',
                chunks:      KNOWLEDGE_BASE.filter(c => c.sensitivity === SENSITIVITY.PUBLIC).map(c => ({ id: c.chunkId, title: c.title, category: c.category })),
                documents:   DOCUMENT_LIBRARY.filter(d => d.sensitivity === SENSITIVITY.PUBLIC).map(d => d.path)
            },
            member: {
                description: 'Authenticated members — EC roster, community stats, membership benefits',
                chunks:      KNOWLEDGE_BASE.filter(c => c.sensitivity === SENSITIVITY.MEMBER).map(c => ({ id: c.chunkId, title: c.title, category: c.category })),
                documents:   DOCUMENT_LIBRARY.filter(d => d.sensitivity === SENSITIVITY.MEMBER).map(d => d.path)
            },
            admin: {
                description: 'Admins — financial summaries, governance, legal, grant readiness',
                chunks:      KNOWLEDGE_BASE.filter(c => c.sensitivity === SENSITIVITY.ADMIN).map(c => ({ id: c.chunkId, title: c.title, category: c.category })),
                documents:   DOCUMENT_LIBRARY.filter(d => d.sensitivity === SENSITIVITY.ADMIN).map(d => d.path)
            },
            super_admin: {
                description: 'Super Admin only — individual member records, tax documents, payment data',
                chunks:      KNOWLEDGE_BASE.filter(c => c.sensitivity === SENSITIVITY.SUPER_ADMIN).map(c => ({ id: c.chunkId, title: c.title, category: c.category })),
                documents:   DOCUMENT_LIBRARY.filter(d => d.sensitivity === SENSITIVITY.SUPER_ADMIN).map(d => d.path)
            }
        };

        return cors({ success: true, sensitivityMap: map });
    } catch (e) {
        return cors({ success: false, error: e.message });
    }
}
export function options_rag_sensitivity_map() { return optionsCors(); }
