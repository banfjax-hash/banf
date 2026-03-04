/**
 * ═══════════════════════════════════════════════════════════════
 *  AGENT ORCHESTRATOR
 *  Manages agent profiles, routes requests to specialist agents,
 *  maintains agent state, and coordinates multi-agent workflows.
 * ═══════════════════════════════════════════════════════════════
 */

import wixData from 'wix-data';
import { fetch as wixFetch } from 'wix-fetch';
import { buildRAGContext } from 'backend/rag-engine';
import { classifyEmailIntent } from 'backend/email-automation';

const SA = { suppressAuth: true };
const HF_API_TOKEN = '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';

// ─────────────────────────────────────────
// DEFAULT AGENT PROFILE DEFINITIONS
// ─────────────────────────────────────────

export const DEFAULT_AGENT_PROFILES = [
    {
        agentId: 'events-agent',
        name: 'Events Coordinator Agent',
        category: 'event_inquiry',
        systemPrompt: 'You are the BANF events coordinator AI. You have comprehensive knowledge of all BANF events including Durga Puja, Saraswati Puja, annual picnic, and cultural programs. Help people register, get event details, payment info, and RSVP. Be warm and welcoming.',
        contextCategories: 'events,organization',
        autoReply: true,
        replyTemplate: 'Thank you for your interest in BANF events!',
        isActive: true,
        config: JSON.stringify({ maxTokens: 400, temperature: 0.3, ragTopK: 5 })
    },
    {
        agentId: 'membership-agent',
        name: 'Membership Services Agent',
        category: 'membership',
        systemPrompt: 'You are the BANF membership coordinator AI. Help people join BANF, explain benefits (access to all events, voting rights, newsletter), dues ($50/family/year), and the registration process. Be welcoming and encouraging for new members.',
        contextCategories: 'membership,payment,organization',
        autoReply: true,
        replyTemplate: 'Welcome to the BANF community!',
        isActive: true,
        config: JSON.stringify({ maxTokens: 350, temperature: 0.3, ragTopK: 3 })
    },
    {
        agentId: 'payment-agent',
        name: 'Treasurer / Payment Agent',
        category: 'payment',
        systemPrompt: 'You are the BANF treasurer AI. Answer payment questions accurately. Accepted methods: Zelle (banfjax@gmail.com), Venmo (@banfjax), personal check (payable to BANF), cash at events. Always confirm: "Please include your name and purpose (e.g., Durga Puja registration, Khan family)".',
        contextCategories: 'payment,membership',
        autoReply: false,
        replyTemplate: 'Thank you for your payment inquiry.',
        isActive: true,
        config: JSON.stringify({ maxTokens: 350, temperature: 0.2, ragTopK: 3 })
    },
    {
        agentId: 'complaint-agent',
        name: 'Complaint Resolution Agent',
        category: 'complaint',
        systemPrompt: 'You are the BANF Executive Committee liaison AI. When someone submits a complaint, acknowledge it professionally, express genuine concern, confirm it is logged with a reference number, and state it will be reviewed by the EC within 7 days. Never be defensive. Be empathetic.',
        contextCategories: 'complaint,organization',
        autoReply: false,
        replyTemplate: 'We have received your complaint and take it seriously.',
        isActive: true,
        config: JSON.stringify({ maxTokens: 300, temperature: 0.2, ragTopK: 2 })
    },
    {
        agentId: 'sponsorship-agent',
        name: 'Sponsorship Coordinator Agent',
        category: 'sponsorship',
        systemPrompt: 'You are the BANF sponsorship coordinator AI. Promote BANF sponsorship tiers enthusiastically: Title ($1000+, event naming rights, top logo), Gold ($500, premium placement), Silver ($250, program listing), Bronze ($100, website mention). Customize offerings for each business.',
        contextCategories: 'sponsorship,events,organization',
        autoReply: true,
        replyTemplate: 'Thank you for your interest in sponsoring BANF!',
        isActive: true,
        config: JSON.stringify({ maxTokens: 400, temperature: 0.4, ragTopK: 4 })
    },
    {
        agentId: 'career-agent',
        name: 'Career Services Agent',
        category: 'career',
        systemPrompt: 'You are the BANF career services AI coordinator. Help members with career guidance sessions, resume reviews, job referrals, and professional networking within the Bengali community. Be supportive and encouraging.',
        contextCategories: 'career,organization',
        autoReply: true,
        replyTemplate: 'We are happy to help with your career journey!',
        isActive: true,
        config: JSON.stringify({ maxTokens: 350, temperature: 0.4, ragTopK: 3 })
    },
    {
        agentId: 'general-agent',
        name: 'General Information Agent',
        category: 'general_inquiry',
        systemPrompt: 'You are a helpful and friendly BANF community information assistant. Answer general questions about BANF using available knowledge. For specific matters (payments, complaints), direct the person to the appropriate process.',
        contextCategories: 'organization,events,membership,contact',
        autoReply: true,
        replyTemplate: 'Thank you for reaching out to BANF!',
        isActive: true,
        config: JSON.stringify({ maxTokens: 400, temperature: 0.5, ragTopK: 5 })
    }
];

// ─────────────────────────────────────────
// AGENT PROFILE CRUD
// ─────────────────────────────────────────

export async function seedAgentProfiles() {
    const results = [];
    for (const profile of DEFAULT_AGENT_PROFILES) {
        try {
            const existing = await wixData.query('AgentProfiles').eq('agentId', profile.agentId).find(SA);
            if (existing.items.length > 0) {
                results.push({ agentId: profile.agentId, status: 'exists' });
                continue;
            }
            await wixData.insert('AgentProfiles', profile, SA);
            results.push({ agentId: profile.agentId, status: 'seeded' });
        } catch (e) {
            results.push({ agentId: profile.agentId, status: 'error', error: e.message });
        }
    }
    return results;
}

export async function getAgentProfile(agentId) {
    const result = await wixData.query('AgentProfiles').eq('agentId', agentId).find(SA);
    if (result.items.length > 0) return result.items[0];
    // Fallback to default
    return DEFAULT_AGENT_PROFILES.find(p => p.agentId === agentId) || DEFAULT_AGENT_PROFILES.find(p => p.agentId === 'general-agent');
}

export async function getAllAgentProfiles() {
    const result = await wixData.query('AgentProfiles').eq('isActive', true).find(SA);
    return result.items;
}

export async function updateAgentProfile(agentId, updates) {
    const existing = await wixData.query('AgentProfiles').eq('agentId', agentId).find(SA);
    if (existing.items.length === 0) throw new Error('Agent not found: ' + agentId);
    return await wixData.update('AgentProfiles', { ...existing.items[0], ...updates }, SA);
}

// ─────────────────────────────────────────
// ORCHESTRATOR — Main dispatch
// ─────────────────────────────────────────

/**
 * Route a query to the appropriate agent using intent classification
 * and execute it with RAG context
 */
export async function orchestrate(query, options = {}) {
    const { context: extraContext, userId, sessionId, saveHistory = true, fastMode = true } = options;

    // 1. Classify intent
    const { intent, category } = classifyEmailIntent(query, '');

    // 2. Load agent profile
    const agentCategoryMap = {
        event_inquiry: 'events-agent',
        membership: 'membership-agent',
        payment: 'payment-agent',
        complaint: 'complaint-agent',
        sponsorship: 'sponsorship-agent',
        career: 'career-agent',
        volunteer: 'general-agent',
        publication: 'general-agent',
        contact: 'general-agent',
        general_inquiry: 'general-agent'
    };

    const agentId = agentCategoryMap[intent] || 'general-agent';
    const profile = await getAgentProfile(agentId);
    const config = JSON.parse(profile.config || '{}');

    // 3. Build RAG context (skip in fastMode to avoid Wix 14s timeout)
    let ragCtx = '';
    let sources = [];
    if (!fastMode) {
        const ragResult = await buildRAGContext(query, {
            topK: config.ragTopK || 5,
            minScore: 0.15
        });
        ragCtx = ragResult.context;
        sources = ragResult.sources;
    }

    // 4. Build prompt
    const prompt = `${ragCtx ? 'CONTEXT FROM KNOWLEDGE BASE:\n' + ragCtx + '\n\n---\n\n' : ''}USER QUERY: ${query}${extraContext ? '\n\nADDITIONAL CONTEXT: ' + extraContext : ''}`;

    // 5. Call LLM
    let responseText = '';
    try {
        const resp = await wixFetch('https://router.huggingface.co/featherless-ai/v1/chat/completions', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${HF_API_TOKEN}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: 'meta-llama/Llama-3.1-8B-Instruct',
                messages: [
                    { role: 'system', content: profile.systemPrompt },
                    { role: 'user', content: prompt }
                ],
                max_tokens: fastMode ? 200 : (config.maxTokens || 500),
                temperature: config.temperature || 0.4
            })
        });
        const data = await resp.json();
        responseText = data.choices?.[0]?.message?.content?.trim() || 'I apologize, I could not generate a response at this time.';
    } catch (e) {
        responseText = 'I apologize, I encountered an error. Please contact banfjax@gmail.com directly.';
    }

    // 6. Save to AgentHistory (fire-and-forget, don't await)
    if (saveHistory) {
        wixData.insert('AgentHistory', {
            query,
            response: responseText,
            intent,
            agentId,
            ragSources: JSON.stringify(sources.map(s => s.title)),
            userId: userId || 'anonymous',
            sessionId: sessionId || `sess-${Date.now()}`,
            timestamp: new Date()
        }, SA).catch(() => {});
    }

    return {
        response: responseText,
        agent: agentId,
        agentName: profile.name,
        intent,
        category,
        ragSources: sources
    };
}

/**
 * Multi-turn conversation with memory (last N turns)
 */
export async function orchestrateConversation(messages, options = {}) {
    const { userId, sessionId } = options;
    if (!messages || messages.length === 0) return { error: 'No messages provided' };

    const lastMessage = messages[messages.length - 1].content;
    const { intent, category } = classifyEmailIntent(lastMessage, '');
    const agentCategoryMap = {
        event_inquiry: 'events-agent', membership: 'membership-agent',
        payment: 'payment-agent', complaint: 'complaint-agent',
        sponsorship: 'sponsorship-agent', career: 'career-agent',
        general_inquiry: 'general-agent'
    };
    const agentId = agentCategoryMap[intent] || 'general-agent';
    const profile = await getAgentProfile(agentId);
    const config = JSON.parse(profile.config || '{}');

    // RAG on the last user message
    const { context: ragCtx, sources } = await buildRAGContext(lastMessage, { topK: 3, minScore: 0.15 });

    const systemMessage = ragCtx
        ? `${profile.systemPrompt}\n\nKNOWLEDGE BASE CONTEXT:\n${ragCtx}`
        : profile.systemPrompt;

    const llmMessages = [
        { role: 'system', content: systemMessage },
        ...messages.slice(-6) // last 6 turns for context window
    ];

    let responseText = '';
    try {
        const resp = await wixFetch('https://router.huggingface.co/featherless-ai/v1/chat/completions', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${HF_API_TOKEN}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: 'meta-llama/Llama-3.1-8B-Instruct',
                messages: llmMessages,
                max_tokens: config.maxTokens || 500,
                temperature: config.temperature || 0.5
            })
        });
        const data = await resp.json();
        responseText = data.choices?.[0]?.message?.content?.trim() || 'I apologize, I could not respond.';
    } catch (e) {
        responseText = 'I apologize, there was an error. Please try again or email banfjax@gmail.com.';
    }

    return {
        response: responseText,
        agent: agentId,
        agentName: profile.name,
        intent,
        ragSources: sources,
        sessionId
    };
}
