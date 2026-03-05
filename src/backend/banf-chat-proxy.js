/**
 * BANF Chat LLM Proxy — v1.0
 * ════════════════════════════════════════════════════════════════
 *  Routes HuggingFace Inference API calls from the browser-side
 *  chatbot widget through this Wix backend so the API token is
 *  NEVER exposed in any client-side / GitHub-hosted file.
 *
 *  Endpoint:  POST /_functions/chat_llm
 *
 *  Token storage:
 *    Add a record to the private SiteConfig Wix collection:
 *      key   = "HF_API_TOKEN"
 *      value = "hf_..."   (new token from huggingface.co/settings/tokens)
 *
 *    The old tokens hf_NIlq... and hf_VRPV... have been REVOKED.
 *    Generate a new read-only Inference token at HuggingFace and set it
 *    in SiteConfig.  The widget falls back to the rule-based KB if no
 *    token is found (graceful degradation).
 */

import { ok, badRequest, serverError } from 'wix-http-functions';
import wixData from 'wix-data';
import { fetch as wixFetch } from 'wix-fetch';

const SA = { suppressAuth: true };
const HF_LLM_URL = 'https://router.huggingface.co/featherless-ai/v1/chat/completions';

// ── CORS headers ────────────────────────────────────────────────────────────
function corsHeaders() {
    return {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Content-Type': 'application/json'
    };
}

// ── Token lookup: stored in SiteConfig (private Wix collection) ─────────────
async function getHFToken() {
    try {
        const r = await wixData.query('SiteConfig')
            .eq('key', 'HF_API_TOKEN')
            .limit(1)
            .find(SA);
        if (r.items.length > 0 && r.items[0].value) {
            return r.items[0].value;
        }
    } catch (_) {}
    return null; // not configured — widget will fall back to rule-based KB
}

// ── POST /_functions/chat_llm ───────────────────────────────────────────────
export async function post_chat_llm(request) {
    try {
        // Parse body
        let body;
        try {
            body = await request.body.json();
        } catch (_) {
            return badRequest({
                body: JSON.stringify({ error: 'Invalid JSON body' }),
                headers: corsHeaders()
            });
        }

        // Validate
        if (!body.model || !body.messages) {
            return badRequest({
                body: JSON.stringify({ error: 'Missing model or messages' }),
                headers: corsHeaders()
            });
        }

        // Retrieve token
        const token = await getHFToken();
        if (!token) {
            // Graceful: return a signal the widget understands (null response → KB fallback)
            return serverError({
                body: JSON.stringify({ error: 'LLM proxy not configured — falling back to KB' }),
                headers: corsHeaders()
            });
        }

        // Hard-cap token output to prevent runaway usage
        const payload = {
            model:       body.model,
            messages:    body.messages,
            max_tokens:  Math.min(body.max_tokens || 450, 600),
            temperature: body.temperature !== undefined ? body.temperature : 0.6,
            stream:      false
        };

        const hfResp = await wixFetch(HF_LLM_URL, {
            method: 'POST',
            headers: {
                'Authorization': 'Bearer ' + token,
                'Content-Type':  'application/json'
            },
            body: JSON.stringify(payload)
        });

        const data = await hfResp.json();

        if (!hfResp.ok) {
            console.error('[chat_llm proxy] HF error', hfResp.status, JSON.stringify(data));
            return serverError({
                body: JSON.stringify({ error: 'Upstream LLM error ' + hfResp.status }),
                headers: corsHeaders()
            });
        }

        return ok({ body: JSON.stringify(data), headers: corsHeaders() });

    } catch (err) {
        console.error('[chat_llm proxy] unexpected error:', err.message);
        return serverError({
            body: JSON.stringify({ error: 'LLM proxy error: ' + (err.message || 'unknown') }),
            headers: corsHeaders()
        });
    }
}

// ── OPTIONS /_functions/chat_llm  (preflight) ───────────────────────────────
export function options_chat_llm(request) {
    return ok({ body: '', headers: corsHeaders() });
}
