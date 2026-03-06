#!/usr/bin/env node
/**
 * BANF CRM Analyzer CLI v1.0
 * ──────────────────────────────────────────────────────────────
 *  AI-powered CRM analysis tool that can:
 *    1. Analyze Google Drive folder structure for EC/member records
 *    2. Parse email communication history (exported CSV/MBOX)
 *    3. Reconcile CRM data against known records
 *    4. Generate enrichment reports
 *
 *  Prerequisites:
 *    • Node.js 18+
 *    • ANTHROPIC_API_KEY environment variable (Claude API)
 *    • Optional: GOOGLE_DRIVE_FOLDER_ID for Drive integration
 *
 *  Usage:
 *    node banf-crm-analyzer.js --analyze-drive <folder-path>
 *    node banf-crm-analyzer.js --analyze-emails <csv-path>
 *    node banf-crm-analyzer.js --reconcile
 *    node banf-crm-analyzer.js --report
 *    node banf-crm-analyzer.js --help
 */

const fs = require('fs');
const path = require('path');

/* ═══════════════════════════════════════════════════════════════════
 *  CONFIG
 * ═══════════════════════════════════════════════════════════════════*/
const CONFIG = {
    claudeApiKey: process.env.ANTHROPIC_API_KEY || null,
    claudeModel: 'claude-sonnet-4-20250514',
    maxTokens: 4096,
    crmDataPath: path.join(__dirname, 'docs', 'admin-portal.html'),
    knowledgeBasePath: path.join(__dirname, 'docs', 'banf-knowledge-base.js'),
    outputDir: path.join(__dirname, 'crm-reports'),
};

/* ═══════════════════════════════════════════════════════════════════
 *  KNOWN EC MEMBERS (ground truth)
 * ═══════════════════════════════════════════════════════════════════*/
const KNOWN_EC_2026 = [
    { id: 'MBR-001', name: 'Dr. Ranadhir Ghosh',        role: 'President / IT Lead',    email: 'ranadhir.ghosh@gmail.com' },
    { id: 'MBR-002', name: 'Partha Mukhopadhyay',       role: 'Vice President',          email: 'mukhopadhyay.partha@gmail.com' },
    { id: 'MBR-003', name: 'Amit Chandak',              role: 'Treasurer',               email: 'amit.everywhere@gmail.com' },
    { id: 'MBR-004', name: 'Rajanya Ghosh',             role: 'General Secretary',       email: 'rajanya.ghosh@gmail.com' },
    { id: 'MBR-005', name: 'Dr. Moumita Ghosh',         role: 'Cultural Secretary',      email: 'moumita.mukherje@gmail.com' },
    { id: 'MBR-006', name: 'Soumyajit Dutta (Banty)',   role: 'Food Coordinator',        email: 'duttasoumyajit86@gmail.com' },
    { id: 'MBR-007', name: 'Dr. Sumanta Ghosh',         role: 'Event Coordinator',       email: 'sumo475@gmail.com' },
    { id: null,      name: 'Rwiti Choudhury',           role: 'Puja Coordinator',        email: 'rwitichoudhury@gmail.com', note: 'Not yet in CRM — needs MBR-008 entry' }
];

/* ═══════════════════════════════════════════════════════════════════
 *  UTILITY FUNCTIONS
 * ═══════════════════════════════════════════════════════════════════*/

function log(msg, level = 'info') {
    const colors = { info: '\x1b[36m', warn: '\x1b[33m', error: '\x1b[31m', success: '\x1b[32m' };
    const reset = '\x1b[0m';
    const ts = new Date().toISOString().slice(11, 19);
    console.log(`${colors[level] || ''}[${ts}] ${msg}${reset}`);
}

function ensureOutputDir() {
    if (!fs.existsSync(CONFIG.outputDir)) {
        fs.mkdirSync(CONFIG.outputDir, { recursive: true });
        log(`Created output directory: ${CONFIG.outputDir}`, 'info');
    }
}

/* ═══════════════════════════════════════════════════════════════════
 *  CLAUDE API INTEGRATION
 * ═══════════════════════════════════════════════════════════════════*/

async function callClaude(systemPrompt, userMessage) {
    if (!CONFIG.claudeApiKey) {
        log('ANTHROPIC_API_KEY not set — running in offline mode', 'warn');
        return null;
    }

    try {
        const res = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': CONFIG.claudeApiKey,
                'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify({
                model: CONFIG.claudeModel,
                max_tokens: CONFIG.maxTokens,
                system: systemPrompt,
                messages: [{ role: 'user', content: userMessage }]
            })
        });

        if (!res.ok) {
            log(`Claude API error: ${res.status} ${res.statusText}`, 'error');
            return null;
        }

        const data = await res.json();
        return data?.content?.[0]?.text || null;
    } catch (err) {
        log(`Claude API call failed: ${err.message}`, 'error');
        return null;
    }
}

/* ═══════════════════════════════════════════════════════════════════
 *  ANALYZE GOOGLE DRIVE FOLDER
 * ═══════════════════════════════════════════════════════════════════*/

async function analyzeDrive(folderPath) {
    log('Analyzing Google Drive folder structure...', 'info');

    if (!fs.existsSync(folderPath)) {
        log(`Folder not found: ${folderPath}`, 'error');
        log('Usage: node banf-crm-analyzer.js --analyze-drive <path-to-exported-drive-folder>', 'info');
        log('Export your Google Drive BANF folder locally first, then point to the extracted folder.', 'info');
        return;
    }

    // Recursively scan folder structure
    const files = [];
    function scan(dir, depth = 0) {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);
            if (entry.isDirectory()) {
                files.push({ type: 'dir', name: entry.name, path: fullPath, depth });
                if (depth < 4) scan(fullPath, depth + 1);
            } else {
                const ext = path.extname(entry.name).toLowerCase();
                const size = fs.statSync(fullPath).size;
                files.push({ type: 'file', name: entry.name, path: fullPath, ext, size, depth });
            }
        }
    }
    scan(folderPath);

    log(`Found ${files.length} items (${files.filter(f => f.type === 'dir').length} folders, ${files.filter(f => f.type === 'file').length} files)`, 'info');

    // Categorize files
    const categories = {
        spreadsheets: files.filter(f => ['.xlsx', '.csv', '.xls', '.gsheet'].includes(f.ext)),
        documents: files.filter(f => ['.docx', '.doc', '.pdf', '.gdoc'].includes(f.ext)),
        images: files.filter(f => ['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(f.ext)),
        presentations: files.filter(f => ['.pptx', '.ppt', '.gslides'].includes(f.ext)),
        other: files.filter(f => f.type === 'file' && !['.xlsx', '.csv', '.xls', '.gsheet', '.docx', '.doc', '.pdf', '.gdoc', '.jpg', '.jpeg', '.png', '.gif', '.webp', '.pptx', '.ppt', '.gslides'].includes(f.ext))
    };

    // Look for member/CRM-related files
    const crmRelated = files.filter(f =>
        /member|crm|roster|directory|payment|fee|receipt|registr/i.test(f.name)
    );

    const ecRelated = files.filter(f =>
        /ec\b|executive|committee|election|gbm|meeting/i.test(f.name)
    );

    const eventRelated = files.filter(f =>
        /event|puja|durga|kali|bosonto|nabo.*borsho|picnic|sports|spandan/i.test(f.name)
    );

    // Generate report
    const report = {
        timestamp: new Date().toISOString(),
        folderPath,
        summary: {
            totalItems: files.length,
            folders: files.filter(f => f.type === 'dir').length,
            files: files.filter(f => f.type === 'file').length
        },
        categories: Object.fromEntries(Object.entries(categories).map(([k, v]) => [k, v.length])),
        crmRelatedFiles: crmRelated.map(f => ({ name: f.name, path: f.path })),
        ecRelatedFiles: ecRelated.map(f => ({ name: f.name, path: f.path })),
        eventRelatedFiles: eventRelated.map(f => ({ name: f.name, path: f.path }))
    };

    // If Claude available, get AI analysis
    if (CONFIG.claudeApiKey) {
        const fileList = files.filter(f => f.type === 'file').map(f => f.name).join('\n');
        const aiAnalysis = await callClaude(
            'You are a CRM data analyst for BANF (Bengali Association of North Florida). Analyze the Google Drive file listing and identify which files likely contain member data, payment records, EC information, event attendance, and other CRM-relevant data. Provide specific recommendations for which files to process first.',
            `Here is the list of files from BANF's Google Drive:\n\n${fileList}\n\nCRM-related files found: ${crmRelated.map(f => f.name).join(', ')}\nEC-related files found: ${ecRelated.map(f => f.name).join(', ')}\nEvent-related files found: ${eventRelated.map(f => f.name).join(', ')}`
        );
        if (aiAnalysis) report.aiAnalysis = aiAnalysis;
    }

    ensureOutputDir();
    const reportPath = path.join(CONFIG.outputDir, `drive-analysis-${Date.now()}.json`);
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    log(`Drive analysis report saved: ${reportPath}`, 'success');

    // Print summary
    console.log('\n📁 Drive Analysis Summary:');
    console.log(`   Total: ${report.summary.totalItems} items (${report.summary.folders} folders, ${report.summary.files} files)`);
    console.log(`   Spreadsheets: ${categories.spreadsheets.length} | Docs: ${categories.documents.length} | Images: ${categories.images.length}`);
    console.log(`   CRM-related: ${crmRelated.length} | EC-related: ${ecRelated.length} | Event-related: ${eventRelated.length}`);
    if (report.aiAnalysis) console.log(`\n🤖 AI Analysis:\n${report.aiAnalysis}`);
}

/* ═══════════════════════════════════════════════════════════════════
 *  ANALYZE EMAIL HISTORY
 * ═══════════════════════════════════════════════════════════════════*/

async function analyzeEmails(csvPath) {
    log('Analyzing email communication history...', 'info');

    if (!fs.existsSync(csvPath)) {
        log(`File not found: ${csvPath}`, 'error');
        log('Usage: node banf-crm-analyzer.js --analyze-emails <path-to-email-export.csv>', 'info');
        log('Export email from Gmail using Google Takeout, convert MBOX to CSV, or export from your email client.', 'info');
        return;
    }

    const content = fs.readFileSync(csvPath, 'utf-8');
    const lines = content.split('\n').filter(l => l.trim());
    log(`Loaded ${lines.length} lines from email export`, 'info');

    // Try to parse CSV headers
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    const fromIdx = headers.findIndex(h => /from|sender/.test(h));
    const toIdx = headers.findIndex(h => /^to$|recipient/.test(h));
    const subjectIdx = headers.findIndex(h => /subject/.test(h));
    const dateIdx = headers.findIndex(h => /date|sent/.test(h));

    if (fromIdx === -1 && toIdx === -1) {
        log('Could not detect email CSV columns. Expected headers: from, to, subject, date', 'warn');
    }

    // Extract unique senders/recipients for CRM matching
    const uniqueEmails = new Set();
    const emailCounts = {};

    for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(',');
        const from = fromIdx >= 0 ? (cols[fromIdx] || '').trim() : '';
        const to = toIdx >= 0 ? (cols[toIdx] || '').trim() : '';

        [from, to].forEach(email => {
            const match = email.match(/[\w.-]+@[\w.-]+\.\w+/);
            if (match) {
                const addr = match[0].toLowerCase();
                uniqueEmails.add(addr);
                emailCounts[addr] = (emailCounts[addr] || 0) + 1;
            }
        });
    }

    // Match against known EC members
    const matched = [];
    const unmatched = [];
    for (const email of uniqueEmails) {
        const ecMatch = KNOWN_EC_2026.find(m => m.email.toLowerCase() === email);
        if (ecMatch) {
            matched.push({ email, name: ecMatch.name, role: ecMatch.role, count: emailCounts[email] });
        } else {
            unmatched.push({ email, count: emailCounts[email] });
        }
    }

    // Sort unmatched by frequency (most active first)
    unmatched.sort((a, b) => b.count - a.count);

    const report = {
        timestamp: new Date().toISOString(),
        source: csvPath,
        totalEmails: lines.length - 1,
        uniqueAddresses: uniqueEmails.size,
        matchedECMembers: matched,
        topUnmatchedAddresses: unmatched.slice(0, 50),
        potentialNewMembers: unmatched.filter(u => u.count >= 3).length
    };

    ensureOutputDir();
    const reportPath = path.join(CONFIG.outputDir, `email-analysis-${Date.now()}.json`);
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    log(`Email analysis report saved: ${reportPath}`, 'success');

    console.log('\n📧 Email Analysis Summary:');
    console.log(`   Total emails: ${report.totalEmails}`);
    console.log(`   Unique addresses: ${report.uniqueAddresses}`);
    console.log(`   Matched EC members: ${matched.length}/${KNOWN_EC_2026.length}`);
    console.log(`   Potential new members (3+ emails): ${report.potentialNewMembers}`);
    matched.forEach(m => console.log(`   ✅ ${m.name} (${m.role}) — ${m.count} emails`));
}

/* ═══════════════════════════════════════════════════════════════════
 *  RECONCILE CRM DATA
 * ═══════════════════════════════════════════════════════════════════*/

async function reconcileCRM() {
    log('Reconciling CRM data against ground truth...', 'info');

    // Extract CRM data from admin-portal.html
    const portalPath = path.resolve(__dirname, 'docs', 'admin-portal.html');
    if (!fs.existsSync(portalPath)) {
        log(`Admin portal not found at: ${portalPath}`, 'error');
        return;
    }

    const html = fs.readFileSync(portalPath, 'utf-8');

    // Extract CRM array from HTML
    const crmMatch = html.match(/const\s+CRM\s*=\s*\[([\s\S]*?)\];/);
    if (!crmMatch) {
        log('Could not find CRM array in admin-portal.html', 'error');
        return;
    }

    // Count members in CRM
    const memberIds = (crmMatch[1].match(/memberId:\s*'(MBR-\d+)'/g) || []).map(m => m.match(/'(MBR-\d+)'/)[1]);
    log(`Found ${memberIds.length} members in CRM: ${memberIds.join(', ')}`, 'info');

    // Check against ground truth
    const issues = [];
    const knownIds = KNOWN_EC_2026.filter(m => m.id).map(m => m.id);

    // Check for missing EC members
    for (const ec of KNOWN_EC_2026) {
        if (ec.id && !memberIds.includes(ec.id)) {
            issues.push({ type: 'MISSING', id: ec.id, name: ec.name, msg: `EC member ${ec.name} (${ec.id}) not found in CRM` });
        } else if (!ec.id) {
            issues.push({ type: 'NO_CRM_ENTRY', name: ec.name, msg: `EC member ${ec.name} (${ec.role}) has no CRM entry — needs to be added` });
        }
    }

    // Check for unknown/mock members
    for (const id of memberIds) {
        if (!knownIds.includes(id)) {
            issues.push({ type: 'UNKNOWN', id, msg: `CRM contains unknown member ${id} — may be mock/seed data` });
        }
    }

    // Check for name consistency
    const namePatterns = [
        { wrong: /Banty\s+Dutta/i, correct: 'Soumyajit Dutta (Banty)', field: 'Food Coordinator name' },
        { wrong: /Kali\s+Puja\s*\+\s*Lunch/i, correct: 'Kali Puja + Food', field: 'Event name' }
    ];

    for (const pattern of namePatterns) {
        if (pattern.wrong.test(html)) {
            issues.push({ type: 'NAME_ISSUE', msg: `Found "${pattern.wrong.source}" — should be "${pattern.correct}" (${pattern.field})` });
        }
    }

    const report = {
        timestamp: new Date().toISOString(),
        crmMembers: memberIds.length,
        expectedMembers: KNOWN_EC_2026.length,
        issues,
        status: issues.length === 0 ? 'CLEAN' : 'ISSUES_FOUND'
    };

    ensureOutputDir();
    const reportPath = path.join(CONFIG.outputDir, `crm-reconciliation-${Date.now()}.json`);
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    console.log(`\n🔍 CRM Reconciliation Results:`);
    console.log(`   CRM members: ${memberIds.length} | Expected: ${KNOWN_EC_2026.length}`);
    if (issues.length === 0) {
        log('✅ CRM is clean — no issues found', 'success');
    } else {
        log(`⚠ Found ${issues.length} issue(s):`, 'warn');
        issues.forEach(i => console.log(`   ${i.type}: ${i.msg}`));
    }
    log(`Report saved: ${reportPath}`, 'info');
}

/* ═══════════════════════════════════════════════════════════════════
 *  GENERATE COMPREHENSIVE REPORT
 * ═══════════════════════════════════════════════════════════════════*/

async function generateReport() {
    log('Generating comprehensive CRM report...', 'info');

    const report = {
        timestamp: new Date().toISOString(),
        title: 'BANF CRM Comprehensive Report',
        ecMembers2026: KNOWN_EC_2026,
        communityStats: {
            totalPersons: 416,
            families: 105,
            activeMembers: 243,
            membershipRecordsAllYears: 886,
            topFamilies: 'Roy (17), Ghosh (15), Dutta (10), Das (7), Pal (5), Mukherjee (5)'
        },
        dataSources: {
            adminPortal: 'docs/admin-portal.html — primary CRM store',
            chatbotKB: 'docs/banf-chatbot-widget.js — chatbot knowledge base',
            knowledgeBase: 'docs/banf-knowledge-base.js — global knowledge base',
            loginPages: [
                'docs/ec-admin-login.html',
                'docs/admin-login.html',
                'docs/stakeholder-login.html',
                'docs/member-login.html'
            ]
        },
        recommendations: [
            'Export Google Drive BANF folder and run --analyze-drive to discover additional member data',
            'Export Gmail communications as CSV and run --analyze-emails to find active community contacts',
            'Run --reconcile periodically to ensure CRM data matches ground truth',
            'Consider migrating CRM from HTML-embedded arrays to a proper Wix collection or database',
            'Set up ANTHROPIC_API_KEY for AI-powered data analysis and enrichment'
        ]
    };

    // If Claude is available, get enrichment suggestions
    if (CONFIG.claudeApiKey) {
        const aiSuggestions = await callClaude(
            'You are a CRM data analyst for BANF (Bengali Association of North Florida), a 501(c)(3) nonprofit with 416 persons and 105 families. Provide specific, actionable CRM improvement recommendations.',
            `Current EC Members:\n${JSON.stringify(KNOWN_EC_2026, null, 2)}\n\nCommunity Stats: ${JSON.stringify(report.communityStats)}\n\nProvide 5 specific recommendations for CRM data quality improvement.`
        );
        if (aiSuggestions) report.aiRecommendations = aiSuggestions;
    }

    ensureOutputDir();

    // JSON report
    const jsonPath = path.join(CONFIG.outputDir, `comprehensive-report-${Date.now()}.json`);
    fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2));

    // HTML report
    const htmlReport = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>BANF CRM Report</title>
    <style>
        * { margin:0; padding:0; box-sizing:border-box; }
        body { font-family:'Segoe UI',system-ui,sans-serif; background:#f8fafc; color:#1e293b; padding:40px; }
        .container { max-width:900px; margin:0 auto; }
        h1 { color:#006A4E; margin-bottom:8px; }
        h2 { color:#334155; margin:24px 0 12px; border-bottom:2px solid #e2e8f0; padding-bottom:6px; }
        .meta { color:#64748b; font-size:.85rem; margin-bottom:24px; }
        table { width:100%; border-collapse:collapse; margin:12px 0; }
        th, td { padding:10px 14px; border:1px solid #e2e8f0; text-align:left; font-size:.88rem; }
        th { background:#006A4E; color:#fff; }
        tr:nth-child(even) { background:#f1f5f9; }
        .stat { display:inline-block; background:#ecfdf5; border:1px solid #a7f3d0; border-radius:8px; padding:12px 20px; margin:6px; }
        .stat strong { display:block; font-size:1.3rem; color:#006A4E; }
        .rec { background:#fffbeb; border-left:4px solid #f59e0b; padding:10px 16px; margin:8px 0; border-radius:0 8px 8px 0; }
    </style>
</head>
<body>
<div class="container">
    <h1>🏛 BANF CRM Comprehensive Report</h1>
    <p class="meta">Generated: ${report.timestamp}</p>

    <h2>📊 Community Statistics</h2>
    <div>
        <div class="stat"><strong>${report.communityStats.totalPersons}</strong>Total Persons</div>
        <div class="stat"><strong>${report.communityStats.families}</strong>Families</div>
        <div class="stat"><strong>${report.communityStats.activeMembers}</strong>Active Members</div>
        <div class="stat"><strong>${report.communityStats.membershipRecordsAllYears}</strong>All-time Records</div>
    </div>

    <h2>👥 EC Members 2026–2028</h2>
    <table>
        <tr><th>ID</th><th>Name</th><th>Role</th><th>Email</th></tr>
        ${report.ecMembers2026.map(m => `<tr><td>${m.id}</td><td>${m.name}</td><td>${m.role}</td><td>${m.email}</td></tr>`).join('\n        ')}
    </table>

    <h2>📋 Recommendations</h2>
    ${report.recommendations.map(r => `<div class="rec">• ${r}</div>`).join('\n    ')}

    ${report.aiRecommendations ? `<h2>🤖 AI-Powered Recommendations</h2><pre style="background:#f1f5f9;padding:16px;border-radius:8px;white-space:pre-wrap;">${report.aiRecommendations}</pre>` : ''}
</div>
</body>
</html>`;

    const htmlPath = path.join(CONFIG.outputDir, `comprehensive-report-${Date.now()}.html`);
    fs.writeFileSync(htmlPath, htmlReport);

    log(`Reports saved:`, 'success');
    log(`  JSON: ${jsonPath}`, 'info');
    log(`  HTML: ${htmlPath}`, 'info');
}

/* ═══════════════════════════════════════════════════════════════════
 *  CLI ENTRY POINT
 * ═══════════════════════════════════════════════════════════════════*/

function showHelp() {
    console.log(`
╔═══════════════════════════════════════════════════════════════╗
║  BANF CRM Analyzer CLI v1.0                                  ║
║  AI-powered CRM analysis for Bengali Association of NF        ║
╚═══════════════════════════════════════════════════════════════╝

Usage:
  node banf-crm-analyzer.js <command> [options]

Commands:
  --analyze-drive <path>    Analyze exported Google Drive folder structure
  --analyze-emails <csv>    Analyze email communication export (CSV format)
  --reconcile               Reconcile CRM data against known EC members
  --report                  Generate comprehensive CRM report (JSON + HTML)
  --help                    Show this help message

Environment Variables:
  ANTHROPIC_API_KEY         Claude API key for AI-powered analysis (optional)

Examples:
  node banf-crm-analyzer.js --reconcile
  node banf-crm-analyzer.js --analyze-drive ./banf-drive-export
  node banf-crm-analyzer.js --analyze-emails ./gmail-export.csv
  node banf-crm-analyzer.js --report

Notes:
  • Export Google Drive: Go to drive.google.com → BANF folder → Download
  • Export Gmail: Use Google Takeout → select Gmail → MBOX → convert to CSV
  • Reports are saved to ./crm-reports/ directory
`);
}

async function main() {
    const args = process.argv.slice(2);

    if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
        showHelp();
        return;
    }

    console.log('🏛 BANF CRM Analyzer v1.0\n');

    if (args.includes('--analyze-drive')) {
        const idx = args.indexOf('--analyze-drive');
        const folderPath = args[idx + 1];
        if (!folderPath) {
            log('Please specify a folder path: --analyze-drive <path>', 'error');
            return;
        }
        await analyzeDrive(path.resolve(folderPath));
    }
    else if (args.includes('--analyze-emails')) {
        const idx = args.indexOf('--analyze-emails');
        const csvPath = args[idx + 1];
        if (!csvPath) {
            log('Please specify a CSV path: --analyze-emails <csv-path>', 'error');
            return;
        }
        await analyzeEmails(path.resolve(csvPath));
    }
    else if (args.includes('--reconcile')) {
        await reconcileCRM();
    }
    else if (args.includes('--report')) {
        await generateReport();
    }
    else {
        log(`Unknown command: ${args[0]}`, 'error');
        showHelp();
    }
}

main().catch(err => {
    log(`Fatal error: ${err.message}`, 'error');
    process.exit(1);
});
