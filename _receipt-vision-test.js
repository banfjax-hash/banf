/**
 * Receipt Vision Test — Analyze receipt_check.jpg with GitHub Models vision API
 * and generate an HTML report showing: image, model name, line items, total.
 *
 * Run: node _receipt-vision-test.js
 */
const https = require('https');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function getGitHubToken() {
    if (process.env.GITHUB_TOKEN) return process.env.GITHUB_TOKEN;
    try { return execSync('gh auth token', { encoding: 'utf8' }).trim(); } catch { }
    console.error('ERROR: No GitHub token. Set GITHUB_TOKEN or run `gh auth login`');
    process.exit(1);
}

function apiRequest(hostname, apiPath, body, token) {
    return new Promise((resolve, reject) => {
        const data = JSON.stringify(body);
        const opts = {
            hostname, path: apiPath, method: 'POST', headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/vnd.github+json',
                'Authorization': `Bearer ${token}`,
                'X-GitHub-Api-Version': '2022-11-28',
                'Content-Length': Buffer.byteLength(data)
            }
        };
        const req = https.request(opts, res => {
            let buf = '';
            res.on('data', c => buf += c);
            res.on('end', () => resolve({ status: res.statusCode, body: buf }));
        });
        req.on('error', reject);
        req.setTimeout(120000, () => { req.destroy(); reject(new Error('Timeout 120s')); });
        req.write(data);
        req.end();
    });
}

const RECEIPT_PROMPT = `Analyze this receipt image carefully. Extract ALL visible information and return ONLY valid JSON with no markdown formatting, no backticks, no explanation — just the raw JSON object:

{
  "storeName": "store or vendor name",
  "storeAddress": "full address if visible",
  "date": "date in MM/DD/YYYY format",
  "lineItems": [
    {"item": "item description", "qty": 1, "cost": 12.99}
  ],
  "subtotal": 0.00,
  "tax": 0.00,
  "tip": 0.00,
  "totalCost": 45.67,
  "paymentMethod": "cash/card/etc if visible",
  "confidence": "high"
}

Rules:
- Include EVERY line item visible on the receipt
- For totalCost use the receipt TOTAL or GRAND TOTAL amount
- If subtotal/tax/tip are visible, include them
- Date format must be MM/DD/YYYY
- confidence: "high" if receipt is clear, "medium" if partially readable, "low" if poor quality
- cost values must be numbers not strings
- qty defaults to 1 if not shown`;

const MODELS_TO_TEST = [
    { id: 'openai/gpt-4.1-mini', name: 'GPT-4.1 Mini' },
    { id: 'openai/gpt-4.1-nano', name: 'GPT-4.1 Nano' },
];

async function testModel(model, imageB64, token) {
    console.log(`\n— Testing: ${model.name} (${model.id}) —`);
    const start = Date.now();
    const body = {
        model: model.id,
        messages: [{
            role: 'user',
            content: [
                { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${imageB64}` } },
                { type: 'text', text: RECEIPT_PROMPT }
            ]
        }],
        max_tokens: 3000,
        temperature: 0.1,
        stream: false
    };

    try {
        const resp = await apiRequest('models.github.ai', '/inference/chat/completions', body, token);
        const elapsed = ((Date.now() - start) / 1000).toFixed(1);

        if (resp.status !== 200) {
            const errData = JSON.parse(resp.body);
            const errMsg = errData.error?.message || errData.message || resp.body.substring(0, 200);
            console.log(`  FAIL HTTP ${resp.status}: ${errMsg}`);
            return { model: model.name, modelId: model.id, success: false, error: `HTTP ${resp.status}: ${errMsg}`, elapsed };
        }

        const data = JSON.parse(resp.body);
        const content = data.choices?.[0]?.message?.content || '';
        console.log(`  OK — ${elapsed}s (${content.length} chars)`);

        let parsed = null;
        try {
            const cleaned = content.replace(/```json\s*/gi, '').replace(/```\s*/gi, '').trim();
            parsed = JSON.parse(cleaned);
            console.log(`  Store: ${parsed.storeName}`);
            console.log(`  Date:  ${parsed.date}`);
            console.log(`  Total: $${parsed.totalCost}`);
            console.log(`  Items: ${(parsed.lineItems || []).length}`);
        } catch {
            console.log(`  JSON parse failed — raw: ${content.substring(0, 200)}`);
        }

        return { model: model.name, modelId: model.id, success: true, parsed, elapsed, raw: content,
                 usage: data.usage || null };
    } catch (e) {
        const elapsed = ((Date.now() - start) / 1000).toFixed(1);
        console.log(`  ERROR: ${e.message}`);
        return { model: model.name, modelId: model.id, success: false, error: e.message, elapsed };
    }
}

function generateHTML(results, imageB64) {
    const now = new Date().toLocaleString();
    let cardsHtml = '';

    for (const r of results) {
        if (!r.success) {
            cardsHtml += `
            <div class="card error">
                <h2>${r.model}</h2>
                <p class="model-id">${r.modelId}</p>
                <p class="elapsed">${r.elapsed}s</p>
                <p class="error-msg">Error: ${r.error}</p>
            </div>`;
            continue;
        }

        const p = r.parsed || {};
        const items = (p.lineItems || []);
        let itemsHtml = items.map(it =>
            `<tr><td>${it.item || '—'}</td><td class="num">${it.qty || 1}</td><td class="num">$${(it.cost || 0).toFixed(2)}</td></tr>`
        ).join('');

        cardsHtml += `
        <div class="card">
            <h2>${r.model}</h2>
            <p class="model-id">${r.modelId}</p>
            <div class="meta">
                <span>Time: ${r.elapsed}s</span>
                <span>Confidence: <strong>${p.confidence || '—'}</strong></span>
                ${r.usage ? `<span>Tokens: ${r.usage.total_tokens || '—'}</span>` : ''}
            </div>
            <div class="store-info">
                <p><strong>${p.storeName || '—'}</strong></p>
                ${p.storeAddress ? `<p class="addr">${p.storeAddress}</p>` : ''}
                <p>Date: ${p.date || '—'}</p>
                ${p.paymentMethod ? `<p>Payment: ${p.paymentMethod}</p>` : ''}
            </div>
            <table>
                <thead><tr><th>Item</th><th>Qty</th><th>Cost</th></tr></thead>
                <tbody>
                    ${itemsHtml}
                </tbody>
                <tfoot>
                    ${p.subtotal ? `<tr><td colspan="2">Subtotal</td><td class="num">$${p.subtotal.toFixed(2)}</td></tr>` : ''}
                    ${p.tax ? `<tr><td colspan="2">Tax</td><td class="num">$${p.tax.toFixed(2)}</td></tr>` : ''}
                    ${p.tip ? `<tr><td colspan="2">Tip</td><td class="num">$${p.tip.toFixed(2)}</td></tr>` : ''}
                    <tr class="total"><td colspan="2"><strong>TOTAL</strong></td><td class="num"><strong>$${(p.totalCost || 0).toFixed(2)}</strong></td></tr>
                </tfoot>
            </table>
        </div>`;
    }

    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>BANF Receipt Vision Test Report</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Segoe UI', system-ui, sans-serif; background: #f0f2f5; color: #1a1a2e; padding: 24px; }
  h1 { text-align: center; margin-bottom: 4px; color: #16213e; }
  .subtitle { text-align: center; color: #666; margin-bottom: 24px; font-size: 14px; }
  .container { display: flex; gap: 24px; flex-wrap: wrap; justify-content: center; max-width: 1400px; margin: 0 auto; }
  .receipt-img { text-align: center; margin-bottom: 24px; }
  .receipt-img img { max-height: 500px; border-radius: 8px; box-shadow: 0 4px 20px rgba(0,0,0,0.15); }
  .receipt-img p { margin-top: 8px; font-size: 13px; color: #888; }
  .card { background: #fff; border-radius: 12px; box-shadow: 0 2px 12px rgba(0,0,0,0.08); padding: 20px; width: 420px; }
  .card.error { border-left: 4px solid #e74c3c; }
  .card h2 { color: #16213e; margin-bottom: 4px; font-size: 20px; }
  .model-id { font-size: 12px; color: #999; font-family: monospace; margin-bottom: 12px; }
  .meta { display: flex; gap: 16px; flex-wrap: wrap; font-size: 13px; color: #555; margin-bottom: 14px;
          padding-bottom: 10px; border-bottom: 1px solid #eee; }
  .store-info { margin-bottom: 14px; }
  .store-info p { margin-bottom: 3px; }
  .store-info .addr { font-size: 13px; color: #666; }
  table { width: 100%; border-collapse: collapse; font-size: 14px; }
  th { background: #f8f9fa; text-align: left; padding: 8px 10px; border-bottom: 2px solid #dee2e6; }
  td { padding: 6px 10px; border-bottom: 1px solid #eee; }
  .num { text-align: right; font-family: 'Consolas', monospace; }
  tfoot td { border-bottom: none; padding-top: 8px; }
  tfoot .total td { border-top: 2px solid #333; font-size: 16px; }
  .error-msg { color: #e74c3c; font-weight: 600; }
  .elapsed { font-size: 13px; color: #888; margin-bottom: 12px; }
  .summary { text-align: center; max-width: 800px; margin: 0 auto 24px; padding: 16px;
             background: #e8f5e9; border-radius: 8px; }
  .summary.fail { background: #fce4ec; }
</style>
</head>
<body>
<h1>BANF Receipt Vision Test Report</h1>
<p class="subtitle">Generated: ${now} | Models tested: ${results.length}</p>

<div class="receipt-img">
    <img src="data:image/jpeg;base64,${imageB64}" alt="Receipt Image" />
    <p>Source: receipt_check.jpg</p>
</div>

<div class="container">
${cardsHtml}
</div>
</body>
</html>`;
}

async function main() {
    const receiptPath = path.join(__dirname, 'receipt_check.jpg');
    if (!fs.existsSync(receiptPath)) {
        console.error('ERROR: receipt_check.jpg not found at', receiptPath);
        process.exit(1);
    }

    const imageB64 = fs.readFileSync(receiptPath).toString('base64');
    console.log(`Receipt: ${(imageB64.length / 1024).toFixed(0)} KB base64`);

    const token = getGitHubToken();
    console.log(`Token: ${token.substring(0, 4)}****`);

    const results = [];
    for (const model of MODELS_TO_TEST) {
        const result = await testModel(model, imageB64, token);
        results.push(result);
    }

    // Generate HTML report
    const html = generateHTML(results, imageB64);
    const outPath = path.join(__dirname, 'receipt-vision-test-report.html');
    fs.writeFileSync(outPath, html);
    console.log(`\nReport saved: ${outPath}`);
}

main().catch(console.error);
