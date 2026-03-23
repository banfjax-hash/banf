// Pipeline Technical Documentation Portal
// Accessible via /_functions/pipeline_techdoc (super admin + stakeholders)
// Generated: 2026-03-23
export function getHtml() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>BANF — Pipeline & Architecture Technical Documentation</title>
<link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet">
<link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css" rel="stylesheet">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
<style>
:root{--bg:#060a10;--bg2:#0b1120;--panel:#111827;--card:#0f172a;--line:#1e293b;--line2:#334155;--text:#e2e8f0;--muted:#94a3b8;--dim:#475569;--accent:#3b82f6;--accent2:#2563eb;--red:#ef4444;--green:#22c55e;--yellow:#eab308;--purple:#a855f7;--cyan:#06b6d4;--orange:#f97316;--radius:12px}
*{box-sizing:border-box;scrollbar-width:thin;scrollbar-color:var(--line2) transparent}
body{margin:0;background:var(--bg);color:var(--text);font-family:'Inter','Segoe UI',system-ui,sans-serif;line-height:1.6}

/* Login overlay */
.login-overlay{position:fixed;inset:0;background:#0f1117;z-index:9999;display:flex;align-items:center;justify-content:center}
.login-box{width:440px;max-width:94vw;background:#21242f;border:1px solid #2a2d3a;border-radius:20px;padding:2.5rem 2rem;box-shadow:0 20px 60px rgba(0,0,0,.4);text-align:center;animation:slideUp .5s ease}
@keyframes slideUp{from{opacity:0;transform:translateY(30px)}to{opacity:1;transform:translateY(0)}}
.login-box .logo{width:64px;height:64px;border-radius:16px;background:linear-gradient(135deg,#3b82f6,#60a5fa);display:flex;align-items:center;justify-content:center;font-weight:800;font-size:1.7rem;color:#fff;margin:0 auto 1.2rem}
.login-box h1{font-size:1.15rem;font-weight:700;margin:0 0 4px;color:#e1e4ed}
.login-box .sub{font-size:.78rem;color:#8b8fa3;margin-bottom:1.5rem}
.login-box input{width:100%;background:#1a1d27;border:1px solid #2a2d3a;color:#e1e4ed;padding:11px 14px;border-radius:10px;font-size:.88rem;margin-bottom:10px;outline:none}
.login-box input:focus{border-color:#3b82f6;box-shadow:0 0 0 3px rgba(59,130,246,.12)}
.login-box input::placeholder{color:#555a6e}
.btn-login{width:100%;background:linear-gradient(135deg,#3b82f6,#60a5fa);color:#fff;border:none;padding:12px;border-radius:10px;font-size:.92rem;font-weight:700;cursor:pointer;margin-top:6px}
.btn-login:hover{opacity:.9;transform:translateY(-1px)}
.btn-login:disabled{opacity:.5}
.error-msg{color:var(--red);font-size:.78rem;display:none;margin-top:6px}

/* Layout */
.container-doc{max-width:1200px;margin:0 auto;padding:30px 24px 60px}
.doc-header{background:linear-gradient(135deg,#0f172a 0%,#1e293b 100%);border:1px solid var(--line);border-radius:16px;padding:40px 36px;margin-bottom:32px;position:relative;overflow:hidden}
.doc-header::before{content:'';position:absolute;top:0;right:0;width:300px;height:300px;background:radial-gradient(circle,rgba(59,130,246,.15) 0%,transparent 70%);pointer-events:none}
.doc-header h1{font-size:1.8rem;font-weight:800;margin:0 0 8px;background:linear-gradient(90deg,#60a5fa,#a78bfa);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent}
.doc-header .sub{color:var(--muted);font-size:.95rem}
.doc-header .meta{margin-top:12px;font-size:.78rem;color:var(--dim)}
.doc-header .live-badge{display:inline-flex;align-items:center;gap:6px;background:rgba(34,197,94,.12);color:var(--green);padding:4px 14px;border-radius:20px;font-size:.78rem;font-weight:600;margin-top:12px}
.doc-header .live-badge .dot{width:8px;height:8px;background:var(--green);border-radius:50%;animation:pulse 2s infinite}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}

/* TOC */
.toc{background:var(--card);border:1px solid var(--line);border-radius:var(--radius);padding:20px 24px;margin-bottom:28px}
.toc h3{font-size:.85rem;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:var(--accent);margin:0 0 12px}
.toc-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:8px}
.toc a{display:flex;align-items:center;gap:8px;color:var(--muted);text-decoration:none;font-size:.85rem;padding:6px 10px;border-radius:8px;transition:.15s}
.toc a:hover{background:rgba(59,130,246,.08);color:var(--text)}
.toc a i{width:16px;text-align:center;font-size:.75rem;color:var(--accent)}

/* Section */
.doc-section{background:var(--card);border:1px solid var(--line);border-radius:var(--radius);margin-bottom:20px;overflow:hidden}
.doc-section h2{font-size:1.1rem;font-weight:700;padding:18px 24px;margin:0;border-bottom:1px solid var(--line);display:flex;align-items:center;gap:10px;color:#fff}
.doc-section h2 i{color:var(--accent);font-size:.95rem}
.doc-section .body{padding:20px 24px}
.doc-section h3{font-size:.92rem;font-weight:700;color:var(--cyan);margin:16px 0 8px}
.doc-section h3:first-child{margin-top:0}
.doc-section p,.doc-section li{font-size:.88rem;color:var(--muted);line-height:1.7}
.doc-section ul{padding-left:20px;margin:8px 0}
.doc-section li{margin-bottom:4px}

/* Code block */
.code-block{background:#0a0e17;border:1px solid var(--line);border-radius:10px;padding:16px 18px;font-family:'Cascadia Code','Fira Code',monospace;font-size:.82rem;color:#e2e8f0;overflow-x:auto;margin:12px 0;line-height:1.7;white-space:pre}
.code-block .kw{color:#c084fc}.code-block .str{color:#86efac}.code-block .num{color:#fbbf24}.code-block .cmt{color:#475569;font-style:italic}

/* Architecture diagram */
.arch-diagram{background:#0a0e17;border:1px solid var(--line);border-radius:12px;padding:24px;margin:16px 0;overflow-x:auto}
.arch-row{display:flex;align-items:center;justify-content:center;gap:12px;margin:8px 0;flex-wrap:wrap}
.arch-box{padding:10px 18px;border-radius:10px;font-size:.82rem;font-weight:600;text-align:center;min-width:140px;border:1px solid}
.arch-arrow{color:var(--dim);font-size:1.2rem}
.arch-producer{background:rgba(239,68,68,.12);border-color:rgba(239,68,68,.3);color:#fca5a5}
.arch-queue{background:rgba(234,179,8,.12);border-color:rgba(234,179,8,.3);color:#fde68a}
.arch-consumer{background:rgba(34,197,94,.12);border-color:rgba(34,197,94,.3);color:#86efac}
.arch-scheduled{background:rgba(168,85,247,.12);border-color:rgba(168,85,247,.3);color:#d8b4fe}
.arch-health{background:rgba(6,182,212,.12);border-color:rgba(6,182,212,.3);color:#67e8f9}

/* Table */
table.doc-table{width:100%;border-collapse:collapse;margin:12px 0;font-size:.84rem}
table.doc-table th{background:rgba(59,130,246,.08);color:var(--accent);font-weight:600;text-align:left;padding:10px 14px;border-bottom:1px solid var(--line);font-size:.78rem;text-transform:uppercase;letter-spacing:.5px}
table.doc-table td{padding:10px 14px;border-bottom:1px solid rgba(30,41,59,.5);color:var(--muted)}
table.doc-table tr:hover td{background:rgba(255,255,255,.02)}
.badge-sm{padding:2px 10px;border-radius:12px;font-size:.72rem;font-weight:600}
.badge-green{background:rgba(34,197,94,.15);color:var(--green)}
.badge-yellow{background:rgba(234,179,8,.15);color:var(--yellow)}
.badge-red{background:rgba(239,68,68,.15);color:var(--red)}
.badge-blue{background:rgba(59,130,246,.15);color:var(--accent)}
.badge-purple{background:rgba(168,85,247,.15);color:var(--purple)}
.badge-cyan{background:rgba(6,182,212,.15);color:var(--cyan)}

/* KPI */
.kpi-row{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px;margin:16px 0}
.kpi{background:var(--panel);border:1px solid var(--line);border-radius:10px;padding:16px;text-align:center}
.kpi .val{font-size:1.6rem;font-weight:800;color:#fff}
.kpi .lbl{font-size:.72rem;color:var(--dim);text-transform:uppercase;letter-spacing:.5px;margin-top:4px}

/* Status indicator live refresh */
.status-live{display:inline-flex;align-items:center;gap:6px;padding:3px 12px;border-radius:20px;font-size:.75rem;font-weight:600}
.status-live.healthy{background:rgba(34,197,94,.12);color:var(--green)}
.status-live.degraded{background:rgba(234,179,8,.12);color:var(--yellow)}
.status-live.down{background:rgba(239,68,68,.12);color:var(--red)}

/* Footer */
.doc-footer{text-align:center;padding:30px 0;color:var(--dim);font-size:.78rem}
.doc-footer a{color:var(--accent);text-decoration:none}
.doc-footer a:hover{text-decoration:underline}

/* Responsive */
@media(max-width:768px){
  .container-doc{padding:16px 12px}
  .doc-header{padding:24px 20px}
  .doc-header h1{font-size:1.3rem}
  .toc-grid{grid-template-columns:1fr}
  .kpi-row{grid-template-columns:repeat(2,1fr)}
  .arch-row{flex-direction:column}
}
</style>
</head>
<body>

<!-- LOGIN OVERLAY -->
<div class="login-overlay" id="loginOverlay">
<div class="login-box">
  <div class="logo">B</div>
  <h1>Technical Documentation</h1>
  <div class="sub">Super Admin & Stakeholder Access Required</div>
  <input type="text" id="loginEmail" placeholder="Email address" autocomplete="email">
  <input type="password" id="loginPass" placeholder="Password" autocomplete="current-password">
  <button class="btn-login" id="loginBtn" onclick="doLogin()">
    <i class="fas fa-lock"></i> Sign In
  </button>
  <div class="error-msg" id="loginErr"></div>
</div>
</div>

<!-- DOCUMENTATION CONTENT -->
<div id="docContent" style="display:none">
<div class="container-doc">

<!-- Header -->
<div class="doc-header">
  <h1><i class="fas fa-microchip"></i> BANF Pipeline & Architecture — Technical Documentation</h1>
  <div class="sub">Comprehensive technical reference for the BANF email processing pipeline, message queue, and agent ecosystem</div>
  <div class="meta">
    Version 1.0 &nbsp;|&nbsp; Last Updated: <span id="docDate"></span> &nbsp;|&nbsp; Platform: Wix Velo + Node.js
  </div>
  <div class="live-badge" id="liveBadge">
    <span class="dot"></span>
    <span id="liveStatus">Checking pipeline status...</span>
  </div>
</div>

<!-- Live KPIs -->
<div class="kpi-row" id="liveKpis">
  <div class="kpi"><div class="val" id="kpiUptime">—</div><div class="lbl">Pipeline Uptime</div></div>
  <div class="kpi"><div class="val" id="kpiProcessed">—</div><div class="lbl">Emails Processed</div></div>
  <div class="kpi"><div class="val" id="kpiWorkers">—</div><div class="lbl">Active Workers</div></div>
  <div class="kpi"><div class="val" id="kpiPending">—</div><div class="lbl">Queue Pending</div></div>
  <div class="kpi"><div class="val" id="kpiDLQ">—</div><div class="lbl">Dead Letters</div></div>
  <div class="kpi"><div class="val" id="kpiRSVP">—</div><div class="lbl">Total RSVPs</div></div>
</div>

<!-- Table of Contents -->
<div class="toc">
  <h3><i class="fas fa-list"></i> Table of Contents</h3>
  <div class="toc-grid">
    <a href="#arch"><i class="fas fa-sitemap"></i> System Architecture</a>
    <a href="#pipeline"><i class="fas fa-cogs"></i> Pipeline Supervisor</a>
    <a href="#mq"><i class="fas fa-inbox"></i> Message Queue (MQ)</a>
    <a href="#email-reader"><i class="fas fa-envelope-open-text"></i> Email Reader Agent</a>
    <a href="#consumers"><i class="fas fa-microchip"></i> Consumer Workers</a>
    <a href="#scheduled"><i class="fas fa-clock"></i> Scheduled Agents</a>
    <a href="#health"><i class="fas fa-heartbeat"></i> Health Monitoring</a>
    <a href="#queues"><i class="fas fa-layer-group"></i> Queue Reference</a>
    <a href="#agents"><i class="fas fa-robot"></i> Agent Inventory</a>
    <a href="#config"><i class="fas fa-sliders-h"></i> Configuration</a>
    <a href="#recovery"><i class="fas fa-shield-alt"></i> Recovery & DLQ</a>
    <a href="#ops"><i class="fas fa-terminal"></i> Operations Guide</a>
  </div>
</div>

<!-- 1. SYSTEM ARCHITECTURE -->
<div class="doc-section" id="arch">
  <h2><i class="fas fa-sitemap"></i> System Architecture</h2>
  <div class="body">
    <p>The BANF platform uses a <strong>Kafka-like event-driven architecture</strong> where a single <em>Producer</em> (Email Reader) scans Gmail every 5 minutes and enqueues classified messages into topic-specific queues. Multiple <em>Consumer Workers</em> poll these queues independently, ensuring decoupled, resilient processing across all downstream pipelines.</p>

    <div class="arch-diagram">
      <div style="text-align:center;font-size:.72rem;color:var(--dim);margin-bottom:12px">DATA FLOW ARCHITECTURE</div>
      <div class="arch-row">
        <div class="arch-box arch-producer"><i class="fas fa-envelope"></i><br>Gmail Inbox</div>
        <div class="arch-arrow">→</div>
        <div class="arch-box arch-producer"><i class="fas fa-cog"></i><br>Email Reader<br><small>9 phases</small></div>
        <div class="arch-arrow">→</div>
        <div class="arch-box arch-queue"><i class="fas fa-inbox"></i><br>Message Queue<br><small>8 topics</small></div>
      </div>
      <div class="arch-row" style="margin-top:16px">
        <div class="arch-box arch-consumer"><i class="fas fa-ticket-alt"></i><br>RSVP Consumer</div>
        <div class="arch-box arch-consumer"><i class="fas fa-dollar-sign"></i><br>Payment Consumer</div>
        <div class="arch-box arch-consumer"><i class="fas fa-exclamation-triangle"></i><br>Delivery Failure</div>
        <div class="arch-box arch-consumer"><i class="fas fa-question-circle"></i><br>User Query</div>
        <div class="arch-box arch-consumer"><i class="fas fa-shield-alt"></i><br>Admin Instruction</div>
        <div class="arch-box arch-consumer"><i class="fas fa-layer-group"></i><br>General</div>
      </div>
      <div class="arch-row" style="margin-top:16px">
        <div class="arch-box arch-scheduled"><i class="fas fa-stethoscope"></i><br>CRM Health<br><small>every 6h</small></div>
        <div class="arch-box arch-scheduled"><i class="fas fa-tags"></i><br>Email Grouping<br><small>daily</small></div>
        <div class="arch-box arch-health"><i class="fas fa-heartbeat"></i><br>Health API<br><small>:9876</small></div>
        <div class="arch-box arch-health"><i class="fas fa-chart-line"></i><br>Dashboard<br><small>auto-refresh</small></div>
      </div>
    </div>

    <h3>Key Design Principles</h3>
    <ul>
      <li><strong>Decoupled Processing:</strong> Each consumer is independent — a failure in RSVP doesn't block payment processing</li>
      <li><strong>At-Least-Once Delivery:</strong> Messages are ACK'd only after successful processing; NACK returns them to queue</li>
      <li><strong>Deduplication:</strong> Messages are deduped by emailId to prevent double-processing</li>
      <li><strong>Dead Letter Queue (DLQ):</strong> After 3 failed attempts, messages move to DLQ for manual review</li>
      <li><strong>Exponential Backoff:</strong> Failed workers restart with increasing delays (5s → 10s → 20s → 40s → 80s)</li>
      <li><strong>File-Backed Persistence:</strong> Queue state persisted to JSON files — survives process restarts</li>
    </ul>
  </div>
</div>

<!-- 2. PIPELINE SUPERVISOR -->
<div class="doc-section" id="pipeline">
  <h2><i class="fas fa-cogs"></i> Pipeline Supervisor</h2>
  <div class="body">
    <p>The <strong>Pipeline Supervisor</strong> (<code>banf-pipeline-supervisor.js</code>) is the master orchestrator that manages all workers, monitors health, and ensures continuous operation.</p>

    <h3>Worker Inventory</h3>
    <table class="doc-table">
      <thead><tr><th>Worker ID</th><th>Type</th><th>Queue / Schedule</th><th>Critical</th><th>Description</th></tr></thead>
      <tbody>
        <tr><td><code>email-reader</code></td><td><span class="badge-sm badge-red">Producer</span></td><td>—</td><td>✅ Yes</td><td>Gmail scanner, 9 classification phases, 5-min interval</td></tr>
        <tr><td><code>consumer-rsvp</code></td><td><span class="badge-sm badge-green">Consumer</span></td><td>evite_rsvp</td><td>—</td><td>RSVP response processing</td></tr>
        <tr><td><code>consumer-payment</code></td><td><span class="badge-sm badge-green">Consumer</span></td><td>payment</td><td>—</td><td>Payment classification via purpose engine</td></tr>
        <tr><td><code>consumer-delivery</code></td><td><span class="badge-sm badge-green">Consumer</span></td><td>delivery_failure</td><td>—</td><td>Bounce handling, CRM email flagging</td></tr>
        <tr><td><code>consumer-query</code></td><td><span class="badge-sm badge-green">Consumer</span></td><td>user_query</td><td>—</td><td>Member queries → LLM-powered auto-response</td></tr>
        <tr><td><code>consumer-admin</code></td><td><span class="badge-sm badge-green">Consumer</span></td><td>admin_instruction</td><td>—</td><td>Admin / EC instructions processing</td></tr>
        <tr><td><code>consumer-general</code></td><td><span class="badge-sm badge-green">Consumer</span></td><td>general</td><td>—</td><td>Catch-all for unclassified messages</td></tr>
        <tr><td><code>crm-health-check</code></td><td><span class="badge-sm badge-purple">Scheduled</span></td><td>Every 6 hours</td><td>—</td><td>CRM email health check, flagging bounces</td></tr>
        <tr><td><code>email-grouping</code></td><td><span class="badge-sm badge-purple">Scheduled</span></td><td>Daily</td><td>—</td><td>Gmail label organization (16 labels)</td></tr>
      </tbody>
    </table>

    <h3>Restart Strategy</h3>
    <div class="code-block"><span class="cmt">// Exponential backoff with reset after 30 min stable uptime</span>
Attempt 1: wait  5 seconds
Attempt 2: wait 10 seconds
Attempt 3: wait 20 seconds
Attempt 4: wait 40 seconds
Attempt 5: wait 80 seconds  <span class="cmt">// max — manual intervention required after this</span>

<span class="cmt">// After 30 minutes of healthy operation, restart counter resets to 0</span></div>
  </div>
</div>

<!-- 3. MESSAGE QUEUE -->
<div class="doc-section" id="mq">
  <h2><i class="fas fa-inbox"></i> Message Queue (MQ)</h2>
  <div class="body">
    <p>The <strong>BANF Message Queue</strong> (<code>banf-message-queue.js</code>) is a file-backed FIFO queue with topic partitioning, deduplication, and dead letter handling.</p>

    <h3>Queue API</h3>
    <table class="doc-table">
      <thead><tr><th>Method</th><th>Description</th></tr></thead>
      <tbody>
        <tr><td><code>enqueue(queue, payload)</code></td><td>Add message to named queue. Auto-dedup by emailId.</td></tr>
        <tr><td><code>dequeue(queue)</code></td><td>Pop next pending message. Returns null if empty.</td></tr>
        <tr><td><code>ack(queue, msgId)</code></td><td>Acknowledge successful processing. Marks as processed.</td></tr>
        <tr><td><code>nack(queue, msgId)</code></td><td>Negative ACK. Increments retry count; moves to DLQ after 3 failures.</td></tr>
        <tr><td><code>registerProcessor(queue, fn)</code></td><td>Register async handler for a queue.</td></tr>
        <tr><td><code>processNext(queue)</code></td><td>Dequeue + process + ACK/NACK in one call.</td></tr>
        <tr><td><code>drainAll()</code></td><td>Process all pending messages in all queues.</td></tr>
        <tr><td><code>getStatus()</code></td><td>Returns full queue metrics and pending counts.</td></tr>
        <tr><td><code>getDLQ()</code></td><td>Returns dead letter queue contents.</td></tr>
        <tr><td><code>retryDLQ()</code></td><td>Re-enqueue DLQ messages for retry.</td></tr>
      </tbody>
    </table>

    <h3>Configuration</h3>
    <div class="code-block"><span class="kw">maxRetries</span>:        <span class="num">3</span>           <span class="cmt">// failures before DLQ</span>
<span class="kw">retryBackoffMs</span>:   <span class="num">2000</span>        <span class="cmt">// 2s → 4s → 8s exponential</span>
<span class="kw">concurrency</span>:      <span class="num">1</span>           <span class="cmt">// FIFO single-threaded per queue</span>
<span class="kw">deduplicateBy</span>:    <span class="str">'emailId'</span>   <span class="cmt">// prevents double-processing</span>
<span class="kw">maxQueueSize</span>:     <span class="num">10,000</span>      <span class="cmt">// per queue capacity</span>
<span class="kw">dlqMaxSize</span>:       <span class="num">5,000</span>       <span class="cmt">// dead letter capacity</span></div>

    <h3>File Storage</h3>
    <table class="doc-table">
      <thead><tr><th>File</th><th>Purpose</th></tr></thead>
      <tbody>
        <tr><td><code>queue/messages.json</code></td><td>All queue messages with status (pending / processed / failed)</td></tr>
        <tr><td><code>queue/dead-letters.json</code></td><td>Failed messages after max retries</td></tr>
        <tr><td><code>queue/metrics.json</code></td><td>Enqueue/process/fail counters per queue</td></tr>
      </tbody>
    </table>
  </div>
</div>

<!-- 4. EMAIL READER -->
<div class="doc-section" id="email-reader">
  <h2><i class="fas fa-envelope-open-text"></i> Email Reader Agent</h2>
  <div class="body">
    <p>The <strong>Email Reader</strong> (<code>bosonto-email-reader-agent.js</code>) is the primary producer — it continuously scans the Gmail inbox and classifies emails through 9 distinct phases.</p>

    <h3>Scanning Phases</h3>
    <table class="doc-table">
      <thead><tr><th>#</th><th>Phase</th><th>Queue Destination</th><th>Detection Method</th></tr></thead>
      <tbody>
        <tr><td>1</td><td>RSVP Detection</td><td><code>evite_rsvp</code></td><td>Subject pattern matching for event responses</td></tr>
        <tr><td>2</td><td>Payment Detection</td><td><code>payment</code></td><td>Amount parsing, Zelle/check references</td></tr>
        <tr><td>3</td><td>Admin Instructions</td><td><code>admin_instruction</code></td><td>From EC members with "instruct" keywords</td></tr>
        <tr><td>4</td><td>Dev Instructions</td><td><code>general</code></td><td>Technical/development requests from admin</td></tr>
        <tr><td>5</td><td>User Queries</td><td><code>user_query</code></td><td>Questions from members needing response</td></tr>
        <tr><td>6</td><td>Delivery Failures</td><td><code>delivery_failure</code></td><td>Bounce-back emails, mailer-daemon</td></tr>
        <tr><td>7</td><td>GitHub Failures</td><td><code>general</code></td><td>GitHub Actions failure notifications</td></tr>
        <tr><td>8</td><td>WF Ledger</td><td><code>payment</code></td><td>Wells Fargo transaction alerts</td></tr>
        <tr><td>9</td><td>CRM Sync</td><td>—</td><td>Member data updates for CRM</td></tr>
      </tbody>
    </table>

    <h3>Operational Parameters</h3>
    <div class="code-block"><span class="kw">Poll Interval</span>:    <span class="num">5 minutes</span>
<span class="kw">Gmail API</span>:       OAuth2 (refresh token stored securely)
<span class="kw">Batch Size</span>:      Up to <span class="num">100</span> emails per cycle
<span class="kw">Dedup Window</span>:    Gmail message ID + emailId composite key
<span class="kw">Health Report</span>:   Self-reports to <span class="str">banf-pipeline-status.json</span>
<span class="kw">Supervised Mode</span>: Via BANF_SUPERVISED=1 env var when forked</div>
  </div>
</div>

<!-- 5. CONSUMERS -->
<div class="doc-section" id="consumers">
  <h2><i class="fas fa-microchip"></i> Consumer Workers</h2>
  <div class="body">
    <p>Each consumer runs as an in-process polling loop within the supervisor, checking its queue every 10 seconds and processing up to 5 messages per cycle.</p>

    <table class="doc-table">
      <thead><tr><th>Consumer</th><th>Queue</th><th>Handler Module</th><th>Processing Logic</th></tr></thead>
      <tbody>
        <tr><td>RSVP Consumer</td><td><code>evite_rsvp</code></td><td>Inline</td><td>Passes through (email reader handles RSVPs inline)</td></tr>
        <tr><td>Payment Consumer</td><td><code>payment</code></td><td><code>banf-payment-purpose-engine.js</code></td><td>Classifies payment purpose, amount, source</td></tr>
        <tr><td>Delivery Failure</td><td><code>delivery_failure</code></td><td><code>banf-delivery-failure-agent.js</code></td><td>Flags bounced emails, updates CRM health</td></tr>
        <tr><td>User Query</td><td><code>user_query</code></td><td><code>user-query-agent.js</code></td><td>LLM-powered auto-response to member questions</td></tr>
        <tr><td>Admin Instruction</td><td><code>admin_instruction</code></td><td>Inline</td><td>Logs admin commands for manual review</td></tr>
        <tr><td>General</td><td><code>general</code></td><td>Inline</td><td>Catch-all — logs and acknowledges</td></tr>
      </tbody>
    </table>

    <h3>Consumer Configuration</h3>
    <div class="code-block"><span class="kw">CONSUMER_POLL_MS</span>:    <span class="num">10,000</span>  <span class="cmt">// check queue every 10 seconds</span>
<span class="kw">CONSUMER_BATCH_SIZE</span>: <span class="num">5</span>       <span class="cmt">// process up to 5 messages per cycle</span>
<span class="kw">Error Pause</span>:        <span class="num">10</span> consecutive errors → consumer pauses</div>
  </div>
</div>

<!-- 6. SCHEDULED AGENTS -->
<div class="doc-section" id="scheduled">
  <h2><i class="fas fa-clock"></i> Scheduled Agents</h2>
  <div class="body">
    <table class="doc-table">
      <thead><tr><th>Agent</th><th>Schedule</th><th>Module</th><th>Purpose</th></tr></thead>
      <tbody>
        <tr><td>CRM Health Check</td><td>Every 6 hours</td><td><code>_crm-email-cleanup.js</code></td><td>Cross-reference delivery failures with CRM, flag bad emails, track email health score</td></tr>
        <tr><td>Email Grouping</td><td>Daily (24h)</td><td><code>_email-grouping-agent.js</code></td><td>Organize Gmail inbox into 16 BANF/* labels (Events, Finance, Membership, etc.)</td></tr>
      </tbody>
    </table>
  </div>
</div>

<!-- 7. HEALTH MONITORING -->
<div class="doc-section" id="health">
  <h2><i class="fas fa-heartbeat"></i> Health Monitoring</h2>
  <div class="body">
    <p>The supervisor runs a built-in HTTP health API on port <strong>9876</strong> with real-time status endpoints.</p>

    <h3>API Endpoints</h3>
    <table class="doc-table">
      <thead><tr><th>Endpoint</th><th>Method</th><th>Description</th></tr></thead>
      <tbody>
        <tr><td><code>/health</code></td><td>GET</td><td>Full health report — worker status, MQ metrics, issues</td></tr>
        <tr><td><code>/status</code></td><td>GET</td><td>Quick status summary (healthy/degraded/down)</td></tr>
        <tr><td><code>/events</code></td><td>GET</td><td>Recent event timeline (restarts, errors, stalls)</td></tr>
        <tr><td><code>/restart?worker=ID</code></td><td>GET</td><td>Force restart a specific worker</td></tr>
      </tbody>
    </table>

    <h3>Health Check Logic</h3>
    <ul>
      <li><strong>Heartbeat Interval:</strong> Every 30 seconds, the supervisor checks each worker's last heartbeat</li>
      <li><strong>Stall Detection:</strong> If a worker hasn't sent a heartbeat in 10 minutes → marked as stalled</li>
      <li><strong>Auto-Recovery:</strong> Stalled producers are automatically killed and restarted</li>
      <li><strong>Dashboard:</strong> Auto-generated HTML dashboard with sparkline charts, updated every health check cycle</li>
    </ul>
  </div>
</div>

<!-- 8. QUEUE REFERENCE -->
<div class="doc-section" id="queues">
  <h2><i class="fas fa-layer-group"></i> Queue Reference</h2>
  <div class="body">
    <table class="doc-table">
      <thead><tr><th>Queue Name</th><th>Phase</th><th>Consumer</th><th>Description</th></tr></thead>
      <tbody>
        <tr><td><span class="badge-sm badge-green">evite_rsvp</span></td><td>Phase 1</td><td>RSVP Consumer</td><td>Event RSVP responses (attending, not attending, maybe)</td></tr>
        <tr><td><span class="badge-sm badge-blue">payment</span></td><td>Phases 2, 8</td><td>Payment Consumer</td><td>Membership payments, Zelle, checks, WF alerts</td></tr>
        <tr><td><span class="badge-sm badge-purple">admin_instruction</span></td><td>Phase 3</td><td>Admin Consumer</td><td>EC/Admin directives and instructions</td></tr>
        <tr><td><span class="badge-sm badge-cyan">user_query</span></td><td>Phase 5</td><td>Query Consumer</td><td>Member questions requiring auto-response</td></tr>
        <tr><td><span class="badge-sm badge-red">delivery_failure</span></td><td>Phase 6</td><td>Failure Consumer</td><td>Bounced emails, permanent failures</td></tr>
        <tr><td><span class="badge-sm badge-yellow">change_request</span></td><td>Dev Board</td><td>—</td><td>Change management requests (future)</td></tr>
        <tr><td><span class="badge-sm badge-yellow">architecture_update</span></td><td>Design</td><td>—</td><td>Architecture decision records (future)</td></tr>
        <tr><td><span class="badge-sm badge-yellow">general</span></td><td>Phases 4, 7</td><td>General Consumer</td><td>Catch-all: dev instructions, GitHub failures, misc</td></tr>
      </tbody>
    </table>
  </div>
</div>

<!-- 9. AGENT INVENTORY -->
<div class="doc-section" id="agents">
  <h2><i class="fas fa-robot"></i> Agent Inventory</h2>
  <div class="body">
    <table class="doc-table">
      <thead><tr><th>Agent</th><th>File</th><th>Role</th><th>Integration</th></tr></thead>
      <tbody>
        <tr><td>Email Reader</td><td><code>bosonto-email-reader-agent.js</code></td><td>Producer</td><td>Gmail → MQ</td></tr>
        <tr><td>Payment Engine</td><td><code>banf-payment-purpose-engine.js</code></td><td>Consumer handler</td><td>MQ → Classification</td></tr>
        <tr><td>Delivery Failure</td><td><code>banf-delivery-failure-agent.js</code></td><td>Consumer handler</td><td>MQ → CRM flags</td></tr>
        <tr><td>User Query</td><td><code>user-query-agent.js</code></td><td>Consumer handler</td><td>MQ → LLM → Gmail reply</td></tr>
        <tr><td>CRM Cleanup</td><td><code>_crm-email-cleanup.js</code></td><td>Scheduled</td><td>Runs every 6h</td></tr>
        <tr><td>Email Grouping</td><td><code>_email-grouping-agent.js</code></td><td>Scheduled</td><td>Runs daily</td></tr>
        <tr><td>Agent Orchestrator</td><td><code>agent-orchestrator.js</code></td><td>Wix backend</td><td>LLM routing (7 profiles)</td></tr>
        <tr><td>Pipeline Supervisor</td><td><code>banf-pipeline-supervisor.js</code></td><td>Orchestrator</td><td>All workers</td></tr>
      </tbody>
    </table>
  </div>
</div>

<!-- 10. CONFIGURATION -->
<div class="doc-section" id="config">
  <h2><i class="fas fa-sliders-h"></i> Configuration Reference</h2>
  <div class="body">
    <h3>Supervisor Configuration</h3>
    <div class="code-block"><span class="kw">HEARTBEAT_INTERVAL_MS</span>:   <span class="num">30,000</span>     <span class="cmt">// 30s health check cycle</span>
<span class="kw">STALL_THRESHOLD_MS</span>:      <span class="num">600,000</span>    <span class="cmt">// 10 min = dead worker</span>
<span class="kw">MAX_RESTART_ATTEMPTS</span>:    <span class="num">5</span>          <span class="cmt">// before marking as failed</span>
<span class="kw">RESTART_BACKOFF_BASE_MS</span>: <span class="num">5,000</span>      <span class="cmt">// 5s base, doubles each attempt</span>
<span class="kw">RESTART_RESET_AFTER_MS</span>:  <span class="num">1,800,000</span>  <span class="cmt">// reset backoff after 30min uptime</span>
<span class="kw">HTTP_PORT</span>:              <span class="num">9876</span>       <span class="cmt">// health API port</span>
<span class="kw">CONSUMER_POLL_MS</span>:       <span class="num">10,000</span>     <span class="cmt">// queue poll interval</span>
<span class="kw">CONSUMER_BATCH_SIZE</span>:    <span class="num">5</span>          <span class="cmt">// messages per poll cycle</span></div>
  </div>
</div>

<!-- 11. RECOVERY & DLQ -->
<div class="doc-section" id="recovery">
  <h2><i class="fas fa-shield-alt"></i> Recovery & Dead Letter Queue</h2>
  <div class="body">
    <h3>Message Lifecycle</h3>
    <div class="code-block"><span class="cmt">// Normal flow</span>
<span class="str">enqueued</span> → <span class="str">dequeued</span> → <span class="str">processing</span> → <span class="str">ACK</span> → <span class="str">processed</span> ✅

<span class="cmt">// Failure flow</span>
<span class="str">enqueued</span> → <span class="str">dequeued</span> → <span class="str">processing</span> → <span class="str">NACK</span> → <span class="str">retry</span> (up to 3x)
  → after 3 failures → <span class="str">Dead Letter Queue</span> ⚠️

<span class="cmt">// DLQ recovery</span>
<span class="str">DLQ</span> → manual review → <span class="kw">retryDLQ()</span> → re-enqueued for processing</div>

    <h3>Operational Commands</h3>
    <table class="doc-table">
      <thead><tr><th>Command</th><th>Purpose</th></tr></thead>
      <tbody>
        <tr><td><code>node banf-message-queue.js --status</code></td><td>View queue metrics</td></tr>
        <tr><td><code>node banf-message-queue.js --peek general</code></td><td>Preview next message in a queue</td></tr>
        <tr><td><code>node banf-message-queue.js --dlq</code></td><td>View dead letter queue</td></tr>
        <tr><td><code>node banf-message-queue.js --retry-dlq</code></td><td>Re-enqueue DLQ messages</td></tr>
      </tbody>
    </table>
  </div>
</div>

<!-- 12. OPERATIONS GUIDE -->
<div class="doc-section" id="ops">
  <h2><i class="fas fa-terminal"></i> Operations Guide</h2>
  <div class="body">
    <h3>Starting the Pipeline</h3>
    <div class="code-block"><span class="cmt"># Start supervisor with existing email reader (recommended)</span>
node banf-pipeline-supervisor.js --skip-producer

<span class="cmt"># Start full supervisor (forks its own email reader)</span>
node banf-pipeline-supervisor.js

<span class="cmt"># Drain stuck messages without starting supervisor</span>
node banf-pipeline-supervisor.js --drain

<span class="cmt"># Generate dashboard only</span>
node banf-pipeline-supervisor.js --dashboard

<span class="cmt"># Check supervisor health</span>
node banf-pipeline-supervisor.js --health

<span class="cmt"># Stop supervisor gracefully</span>
node banf-pipeline-supervisor.js --stop</div>

    <h3>Monitoring</h3>
    <div class="code-block"><span class="cmt"># Health API (while supervisor is running)</span>
curl http://127.0.0.1:9876/health     <span class="cmt"># Full status</span>
curl http://127.0.0.1:9876/status     <span class="cmt"># Quick status</span>
curl http://127.0.0.1:9876/events     <span class="cmt"># Event timeline</span>

<span class="cmt"># Force restart a worker</span>
curl http://127.0.0.1:9876/restart?worker=consumer-rsvp

<span class="cmt"># Dashboard</span>
open pipeline-monitor-dashboard.html</div>

    <h3>Troubleshooting</h3>
    <table class="doc-table">
      <thead><tr><th>Symptom</th><th>Cause</th><th>Resolution</th></tr></thead>
      <tbody>
        <tr><td>Messages stuck in queue</td><td>Supervisor not running</td><td><code>node banf-pipeline-supervisor.js --skip-producer</code></td></tr>
        <tr><td>Port 9876 in use</td><td>Previous supervisor process</td><td>Kill old process or use <code>--stop</code></td></tr>
        <tr><td>Worker marked "failed"</td><td>Exceeded 5 restart attempts</td><td>Fix root cause, then restart via health API</td></tr>
        <tr><td>DLQ growing</td><td>Consumer handler errors</td><td>Check handler module, then <code>--retry-dlq</code></td></tr>
        <tr><td>Email reader stalled</td><td>Gmail token expired</td><td>Refresh OAuth token, restart producer</td></tr>
      </tbody>
    </table>
  </div>
</div>

<!-- Footer -->
<div class="doc-footer">
  <p>BANF — Bengali Association of North Florida &nbsp;|&nbsp; <a href="https://www.jaxbengali.org">jaxbengali.org</a></p>
  <p style="margin-top:4px">Pipeline Technical Documentation v1.0 — Confidential</p>
</div>

</div><!-- container -->
</div><!-- docContent -->

<script>
// ── Auth ──
const API_BASE = window.location.origin + '/_functions';
const ALLOWED_ROLES = ['super_admin', 'ec_admin', 'stakeholder'];
let currentUser = null;

async function doLogin() {
  const email = document.getElementById('loginEmail').value.trim();
  const pass = document.getElementById('loginPass').value;
  const errEl = document.getElementById('loginErr');
  const btn = document.getElementById('loginBtn');
  if (!email || !pass) { errEl.textContent = 'Enter email and password'; errEl.style.display = 'block'; return; }
  btn.disabled = true;
  errEl.style.display = 'none';
  try {
    const res = await fetch(API_BASE + '/admin_verify_login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: pass })
    });
    const data = await res.json();
    if (data.success && data.role && ALLOWED_ROLES.includes(data.role)) {
      currentUser = { email, role: data.role, name: data.name || email };
      document.getElementById('loginOverlay').style.display = 'none';
      document.getElementById('docContent').style.display = 'block';
      loadLiveData();
    } else if (data.success && data.role) {
      errEl.textContent = 'Access denied. Super Admin or Stakeholder role required.';
      errEl.style.display = 'block';
    } else {
      errEl.textContent = data.message || 'Invalid credentials';
      errEl.style.display = 'block';
    }
  } catch (e) {
    errEl.textContent = 'Connection error: ' + e.message;
    errEl.style.display = 'block';
  }
  btn.disabled = false;
}

document.getElementById('loginPass').addEventListener('keydown', e => { if (e.key === 'Enter') doLogin(); });

// ── Live Data ──
async function loadLiveData() {
  document.getElementById('docDate').textContent = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  try {
    const res = await fetch('http://127.0.0.1:9876/health');
    const d = await res.json();
    const badge = document.getElementById('liveBadge');
    const statusEl = document.getElementById('liveStatus');
    if (d.status === 'healthy') {
      badge.className = 'live-badge'; statusEl.textContent = 'Pipeline HEALTHY — All systems operational';
    } else {
      badge.style.background = 'rgba(239,68,68,.12)'; badge.style.color = '#ef4444';
      statusEl.textContent = 'Pipeline DEGRADED — ' + (d.issues || []).length + ' issues';
    }
    // Count active workers
    const workers = Object.values(d.workers || {});
    const active = workers.filter(w => w.status === 'running' || w.status === 'scheduled' || w.status === 'external').length;
    document.getElementById('kpiWorkers').textContent = active + '/' + workers.length;
    // MQ
    document.getElementById('kpiPending').textContent = (d.mq && d.mq.totalPending) || '0';
    document.getElementById('kpiDLQ').textContent = (d.mq && d.mq.dlqSize) || '0';
    document.getElementById('kpiProcessed').textContent = (d.mq && d.mq.totals && d.mq.totals.processed) || '—';
  } catch (e) {
    // Health API not reachable — try pipeline status file
    document.getElementById('liveStatus').textContent = 'Health API offline — showing cached data';
  }
  // Also fetch pipeline status
  try {
    const res2 = await fetch(API_BASE + '/pipeline_status');
    const ps = await res2.json();
    if (ps.totals) {
      document.getElementById('kpiProcessed').textContent = ps.totals.processedEmails || '—';
      document.getElementById('kpiRSVP').textContent = ps.totals.totalRsvps || '0';
    }
    if (ps.upSince) {
      const days = Math.floor((Date.now() - new Date(ps.upSince).getTime()) / 86400000);
      document.getElementById('kpiUptime').textContent = days + 'd';
    }
  } catch (e) {}
}

// Smooth scroll for TOC links
document.querySelectorAll('.toc a').forEach(a => {
  a.addEventListener('click', e => {
    e.preventDefault();
    const target = document.querySelector(a.getAttribute('href'));
    if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
});
</script>
</body>
</html>`;
}
