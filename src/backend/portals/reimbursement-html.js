// Auto-generated portal module for reimbursement page
// Source: reimbursement-test.html
export function getHtml() { return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>BANF Reimbursement Portal</title>
<link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet">
<link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css" rel="stylesheet">
<style>
:root{--bg:#060a10;--bg2:#0b1120;--panel:#111827;--card:#0f172a;--line:#1e293b;--line2:#334155;--text:#e2e8f0;--muted:#94a3b8;--dim:#475569;--accent:#f97316;--accent2:#ea580c;--green:#22c55e;--blue:#3b82f6;--purple:#a855f7;--cyan:#06b6d4;--yellow:#eab308;--red:#ef4444;--radius:12px;--radius-sm:8px;--sidebar-w:240px}
*,*::before,*::after{box-sizing:border-box}
body{margin:0;padding:0;font-family:'Segoe UI',system-ui,-apple-system,sans-serif;background:var(--bg);color:var(--text);min-height:100vh;overflow-x:hidden}
a{color:var(--accent);text-decoration:none}
a:hover{color:var(--accent2)}

/* ═══ LOGIN OVERLAY ═══ */
.login-overlay{position:fixed;inset:0;z-index:9999;background:linear-gradient(135deg,#0a0e1a 0%,#0f172a 50%,#0a0e1a 100%);display:flex;align-items:center;justify-content:center;flex-direction:column}
.login-overlay .brand{text-align:center;margin-bottom:32px}
.login-overlay .brand img{width:72px;height:72px;border-radius:16px;margin-bottom:12px;border:2px solid var(--accent)}
.login-overlay .brand h1{font-size:1.5rem;font-weight:700;color:#fff;margin:0}
.login-overlay .brand h1 span{color:var(--accent)}
.login-overlay .brand p{color:var(--muted);font-size:.82rem;margin-top:4px}
.login-box{background:var(--panel);border:1px solid var(--line);border-radius:16px;padding:32px;width:100%;max-width:400px;box-shadow:0 20px 60px rgba(0,0,0,.5)}
.login-box h2{font-size:1.1rem;font-weight:600;color:#fff;margin:0 0 4px;text-align:center}
.login-box .sub{color:var(--muted);font-size:.78rem;text-align:center;margin-bottom:20px}
.login-box label{font-size:.72rem;color:var(--muted);text-transform:uppercase;letter-spacing:.5px;display:block;margin-bottom:4px;margin-top:14px}
.login-box input{width:100%;padding:10px 14px;border-radius:var(--radius-sm);border:1px solid var(--line);background:var(--card);color:#fff;font-size:.88rem;outline:none;transition:border .2s}
.login-box input:focus{border-color:var(--accent)}
.login-box .pwd-wrap{position:relative}
.login-box .pwd-toggle{position:absolute;right:12px;top:50%;transform:translateY(-50%);background:none;border:none;color:var(--dim);cursor:pointer;font-size:.82rem}
.login-box .pwd-toggle:hover{color:var(--text)}
.login-btn{width:100%;margin-top:20px;padding:12px;border-radius:var(--radius-sm);border:none;background:linear-gradient(135deg,var(--accent),var(--accent2));color:#fff;font-weight:600;font-size:.88rem;cursor:pointer;transition:transform .15s,box-shadow .15s}
.login-btn:hover{transform:translateY(-1px);box-shadow:0 4px 20px rgba(249,115,22,.3)}
.login-error{display:none;margin-top:12px;padding:8px 12px;border-radius:var(--radius-sm);background:rgba(239,68,68,.1);border:1px solid rgba(239,68,68,.3);color:var(--red);font-size:.78rem;text-align:center}
.login-footer{text-align:center;margin-top:16px;font-size:.72rem;color:var(--dim)}

/* ═══ SIDEBAR ═══ */
.sidebar{position:fixed;left:0;top:0;bottom:0;width:var(--sidebar-w);background:var(--panel);border-right:1px solid var(--line);display:flex;flex-direction:column;z-index:100;transition:width .2s}
.sidebar .sb-brand{padding:20px 16px 16px;border-bottom:1px solid var(--line);display:flex;align-items:center;gap:10px}
.sidebar .sb-brand-icon{width:36px;height:36px;border-radius:10px;background:linear-gradient(135deg,var(--accent),var(--accent2));display:flex;align-items:center;justify-content:center;font-weight:800;font-size:.88rem;color:#fff;flex-shrink:0}
.sidebar .sb-brand-text h3{margin:0;font-size:.88rem;font-weight:700;color:#fff}
.sidebar .sb-brand-text p{margin:0;font-size:.62rem;color:var(--muted);text-transform:uppercase;letter-spacing:.5px}
.sb-nav{flex:1;overflow-y:auto;padding:12px 8px}
.sb-group{margin-bottom:16px}
.sb-group-label{font-size:.62rem;text-transform:uppercase;letter-spacing:1px;color:var(--dim);padding:0 10px;margin-bottom:6px}
.sb-item{display:flex;align-items:center;gap:10px;padding:9px 12px;border-radius:var(--radius-sm);cursor:pointer;color:var(--muted);font-size:.82rem;transition:all .15s;position:relative}
.sb-item:hover{color:#fff;background:rgba(255,255,255,.04)}
.sb-item.active{color:#fff;background:rgba(249,115,22,.12);font-weight:600}
.sb-item.active::before{content:'';position:absolute;left:0;top:50%;transform:translateY(-50%);width:3px;height:20px;background:var(--accent);border-radius:0 3px 3px 0}
.sb-item i{width:18px;text-align:center;font-size:.82rem;flex-shrink:0}
.sb-item .badge-count{margin-left:auto;background:var(--accent);color:#fff;font-size:.6rem;padding:2px 6px;border-radius:10px;font-weight:700}
.sb-user{padding:12px 14px;border-top:1px solid var(--line);display:flex;align-items:center;gap:10px}
.sb-user .sb-avatar{width:32px;height:32px;border-radius:50%;background:var(--accent);display:flex;align-items:center;justify-content:center;color:#fff;font-size:.72rem;font-weight:700;flex-shrink:0}
.sb-user .sb-user-info{flex:1;min-width:0}
.sb-user .sb-user-info strong{font-size:.76rem;color:#fff;display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.sb-user .sb-user-info span{font-size:.62rem;color:var(--muted);display:block}
.sb-user .sb-logout{background:none;border:none;color:var(--dim);cursor:pointer;font-size:.78rem;padding:6px}
.sb-user .sb-logout:hover{color:var(--red)}

/* ═══ MAIN CONTENT ═══ */
.main-content{margin-left:var(--sidebar-w);min-height:100vh;padding:0}
.top-bar{padding:16px 28px;border-bottom:1px solid var(--line);background:var(--bg);display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;z-index:50}
.top-bar h1{font-size:1.05rem;font-weight:700;color:#fff;margin:0}
.top-bar .role-pill{font-size:.62rem;padding:3px 10px;border-radius:20px;font-weight:600;text-transform:uppercase;letter-spacing:.5px;margin-left:10px}
.top-bar .role-pill.admin{background:rgba(249,115,22,.15);color:var(--accent);border:1px solid rgba(249,115,22,.3)}
.top-bar .role-pill.superadmin{background:rgba(168,85,247,.15);color:var(--purple);border:1px solid rgba(168,85,247,.3)}
.portal-section{display:none;padding:24px 28px;animation:fadeIn .3s ease}
.portal-section.active{display:block}
@keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}

/* ═══ KPI CARDS ═══ */
.kpi-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:16px;margin-bottom:24px}
.kpi-card{background:var(--card);border:1px solid var(--line);border-radius:var(--radius);padding:18px;position:relative;overflow:hidden}
.kpi-card::before{content:'';position:absolute;top:0;left:0;right:0;height:3px}
.kpi-card.kpi-orange::before{background:var(--accent)}
.kpi-card.kpi-green::before{background:var(--green)}
.kpi-card.kpi-blue::before{background:var(--blue)}
.kpi-card.kpi-purple::before{background:var(--purple)}
.kpi-card .kpi-icon{width:38px;height:38px;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:.92rem;margin-bottom:12px}
.kpi-card.kpi-orange .kpi-icon{background:rgba(249,115,22,.12);color:var(--accent)}
.kpi-card.kpi-green .kpi-icon{background:rgba(34,197,94,.12);color:var(--green)}
.kpi-card.kpi-blue .kpi-icon{background:rgba(59,130,246,.12);color:var(--blue)}
.kpi-card.kpi-purple .kpi-icon{background:rgba(168,85,247,.12);color:var(--purple)}
.kpi-card .kpi-value{font-size:1.5rem;font-weight:700;color:#fff;line-height:1.1}
.kpi-card .kpi-label{font-size:.68rem;text-transform:uppercase;letter-spacing:.5px;color:var(--muted);margin-top:4px}

/* ═══ CARDS / PANELS ═══ */
.card-panel{background:var(--card);border:1px solid var(--line);border-radius:var(--radius);overflow:hidden}
.card-panel .card-header{padding:14px 18px;border-bottom:1px solid var(--line);display:flex;align-items:center;justify-content:space-between}
.card-panel .card-header h3{font-size:.88rem;font-weight:600;color:#fff;margin:0;display:flex;align-items:center;gap:8px}
.card-panel .card-header h3 i{color:var(--accent);font-size:.82rem}
.card-panel .card-body{padding:18px}
.badge-s{font-size:.6rem;padding:2px 8px;border-radius:12px;font-weight:600;text-transform:uppercase;letter-spacing:.3px;display:inline-flex;align-items:center;gap:3px}
.badge-green{background:rgba(34,197,94,.15);color:var(--green)}
.badge-yellow{background:rgba(234,179,8,.15);color:var(--yellow)}
.badge-red{background:rgba(239,68,68,.15);color:var(--red)}
.badge-blue{background:rgba(59,130,246,.15);color:var(--blue)}
.badge-orange{background:rgba(249,115,22,.15);color:var(--accent)}
.badge-purple{background:rgba(168,85,247,.15);color:var(--purple)}

/* ═══ PIPELINE ═══ */
.pipe-row{display:flex;gap:0;align-items:center;flex-wrap:wrap;margin:16px 0}
.pipe-step{display:flex;align-items:center;gap:8px;padding:8px 14px;background:var(--bg2);border:1px solid var(--line);border-radius:var(--radius-sm);font-size:.72rem;color:var(--dim);position:relative;white-space:nowrap}
.pipe-step i{font-size:.72rem}
.pipe-step.done{background:rgba(34,197,94,.08);border-color:rgba(34,197,94,.3);color:var(--green)}
.pipe-step.active{background:rgba(249,115,22,.08);border-color:rgba(249,115,22,.3);color:var(--accent);animation:pipePulse 1.5s infinite}
@keyframes pipePulse{0%,100%{box-shadow:0 0 0 0 rgba(249,115,22,.15)}50%{box-shadow:0 0 0 6px rgba(249,115,22,0)}}
.pipe-arrow{color:var(--dim);font-size:.62rem;margin:0 4px}

/* ═══ STATUS DOTS ═══ */
.status-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:10px}
.status-item{display:flex;align-items:center;gap:8px;padding:10px 12px;background:var(--bg2);border:1px solid var(--line);border-radius:var(--radius-sm);font-size:.76rem}
.status-dot{width:8px;height:8px;border-radius:50%;flex-shrink:0}
.status-dot.green{background:var(--green);box-shadow:0 0 6px rgba(34,197,94,.4)}
.status-dot.yellow{background:var(--yellow);box-shadow:0 0 6px rgba(234,179,8,.4)}
.status-dot.red{background:var(--red);box-shadow:0 0 6px rgba(239,68,68,.4)}
.status-dot.blue{background:var(--blue);box-shadow:0 0 6px rgba(59,130,246,.4)}

/* ═══ LOG PANEL ═══ */
.log-panel{background:var(--bg2);border:1px solid var(--line);border-radius:var(--radius-sm);padding:12px;max-height:400px;overflow-y:auto;font-family:'Cascadia Code','Fira Code',monospace;font-size:.72rem;line-height:1.8}
.log-panel::-webkit-scrollbar{width:6px}
.log-panel::-webkit-scrollbar-track{background:var(--bg2)}
.log-panel::-webkit-scrollbar-thumb{background:var(--line2);border-radius:3px}

/* ═══ FORM CONTROLS ═══ */
.form-label-sm{font-size:.68rem;color:var(--muted);text-transform:uppercase;letter-spacing:.5px;display:block;margin-bottom:4px;font-weight:500}
.form-input{width:100%;padding:8px 12px;border-radius:var(--radius-sm);border:1px solid var(--line);background:var(--card);color:#fff;font-size:.82rem;outline:none;transition:border .2s}
.form-input:focus{border-color:var(--accent)}
.form-select{width:100%;padding:8px 12px;border-radius:var(--radius-sm);border:1px solid var(--line);background:var(--card);color:#fff;font-size:.82rem;outline:none;cursor:pointer}
.form-select:focus{border-color:var(--accent)}
.form-textarea{width:100%;padding:8px 12px;border-radius:var(--radius-sm);border:1px solid var(--line);background:var(--card);color:#fff;font-size:.82rem;outline:none;resize:vertical}
.form-textarea:focus{border-color:var(--accent)}

/* ═══ BUTTONS ═══ */
.btn-primary{background:linear-gradient(135deg,var(--accent),var(--accent2));color:#fff;border:none;padding:10px 20px;border-radius:var(--radius-sm);font-weight:600;font-size:.82rem;cursor:pointer;transition:all .15s;display:inline-flex;align-items:center;gap:6px}
.btn-primary:hover{transform:translateY(-1px);box-shadow:0 4px 15px rgba(249,115,22,.25)}
.btn-secondary{background:var(--bg2);color:var(--text);border:1px solid var(--line);padding:8px 16px;border-radius:var(--radius-sm);font-size:.78rem;cursor:pointer;transition:all .15s;display:inline-flex;align-items:center;gap:6px}
.btn-secondary:hover{border-color:var(--accent);color:var(--accent)}
.btn-success{background:linear-gradient(135deg,var(--green),#16a34a);color:#fff;border:none;padding:10px 20px;border-radius:var(--radius-sm);font-weight:600;font-size:.82rem;cursor:pointer;display:inline-flex;align-items:center;gap:6px}

/* ═══ DROP ZONE ═══ */
.drop-zone{border:2px dashed var(--line2);border-radius:var(--radius);padding:32px;text-align:center;cursor:pointer;transition:all .2s;background:var(--bg2)}
.drop-zone:hover,.drop-zone.drag-over{border-color:var(--accent);background:rgba(249,115,22,.04)}
.drop-zone i{font-size:2rem;color:var(--dim);margin-bottom:8px}
.drop-zone p{color:var(--muted);font-size:.82rem;margin:4px 0 0}
.drop-zone .browse-link{color:var(--accent);text-decoration:underline;cursor:pointer}

/* ═══ THUMBNAILS ═══ */
.thumb-row{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}
.thumb-img{width:64px;height:64px;object-fit:cover;border-radius:8px;border:2px solid var(--line);cursor:pointer;transition:transform .15s}
.thumb-img:hover{transform:scale(1.1);border-color:var(--accent)}

/* ═══ IMAGE MODAL ═══ */
.img-modal{display:none;position:fixed;inset:0;z-index:10000;background:rgba(0,0,0,.85);align-items:center;justify-content:center;cursor:pointer}
.img-modal.show{display:flex}
.img-modal img{max-width:90vw;max-height:90vh;border-radius:8px}

/* ═══ GUIDE SECTION ═══ */
.guide-step{display:flex;gap:16px;margin-bottom:20px;padding:16px;background:var(--bg2);border:1px solid var(--line);border-radius:var(--radius)}
.guide-step .step-num{width:40px;height:40px;border-radius:50%;background:linear-gradient(135deg,var(--accent),var(--accent2));display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:.92rem;flex-shrink:0}
.guide-step .step-content h4{margin:0 0 6px;font-size:.88rem;color:#fff}
.guide-step .step-content p{margin:0;font-size:.78rem;color:var(--muted);line-height:1.5}
.guide-step .step-content code{background:var(--card);padding:1px 6px;border-radius:4px;font-size:.72rem;color:var(--cyan)}

/* ═══ RESPONSIVE ═══ */
@media(max-width:900px){
  .sidebar{width:0;overflow:hidden}
  .main-content{margin-left:0}
  .sidebar.mobile-open{width:var(--sidebar-w);box-shadow:4px 0 20px rgba(0,0,0,.5)}
  .mobile-toggle{display:flex !important}
  .kpi-grid{grid-template-columns:repeat(2,1fr)}
}
@media(max-width:600px){
  .kpi-grid{grid-template-columns:1fr}
  .portal-section{padding:16px}
  .top-bar{padding:12px 16px}
}
.mobile-toggle{display:none;background:none;border:none;color:var(--text);font-size:1.2rem;cursor:pointer;padding:6px}
</style>
</head>
<body>

<!-- ═══════════════════════════════════════════
     LOGIN OVERLAY — EC Admin Authentication
     ═══════════════════════════════════════════ -->
<div class="login-overlay" id="loginOverlay">
  <div class="brand">
    <div style="width:72px;height:72px;border-radius:16px;background:linear-gradient(135deg,var(--accent),var(--accent2));display:flex;align-items:center;justify-content:center;margin:0 auto 12px;font-size:1.5rem;font-weight:800;color:#fff;border:2px solid rgba(255,255,255,.15)">B</div>
    <h1><span>BANF</span> Reimbursement Portal</h1>
    <p>Bengal Association of North Florida — EC Admin Access Only</p>
  </div>
  <div class="login-box">
    <h2><i class="fas fa-lock" style="color:var(--accent);margin-right:6px"></i>EC Administrator Login</h2>
    <div class="sub">Only authorized Executive Committee members can access this portal.</div>
    <label for="login-email">Email Address</label>
    <input type="email" id="login-email" placeholder="your.email@gmail.com" autocomplete="email" autofocus>
    <label for="login-pw">Password</label>
    <div class="pwd-wrap">
      <input type="password" id="login-pw" placeholder="Enter your EC password" autocomplete="current-password">
      <button type="button" class="pwd-toggle" onclick="togglePwdVisibility()"><i class="fas fa-eye"></i></button>
    </div>
    <button class="login-btn" id="loginBtn" onclick="attemptLogin()">
      <i class="fas fa-sign-in-alt me-1"></i>Sign In
    </button>
    <div class="login-error" id="loginError"></div>
    <div class="login-footer">
      <i class="fas fa-shield-alt me-1"></i>Secured with offline credentials — no internet required for authentication
    </div>
  </div>
</div>

<!-- ═══════════════════════════════════════════
     PORTAL — Main Application (hidden until authenticated)
     ═══════════════════════════════════════════ -->
<div id="portal" style="display:none">

<!-- SIDEBAR -->
<div class="sidebar" id="sidebar">
  <div class="sb-brand">
    <div class="sb-brand-icon">B</div>
    <div class="sb-brand-text">
      <h3>BANF Portal</h3>
      <p>Reimbursement</p>
    </div>
  </div>
  <div class="sb-nav">
    <div class="sb-group">
      <div class="sb-group-label">Main</div>
      <div class="sb-item active" data-section="sec-dashboard" onclick="showSection(this)">
        <i class="fas fa-chart-pie"></i> Dashboard
      </div>
      <div class="sb-item" data-section="sec-new-request" onclick="showSection(this)">
        <i class="fas fa-file-invoice-dollar"></i> New Request
      </div>
    </div>
    <div class="sb-group">
      <div class="sb-group-label">Configuration</div>
      <div class="sb-item" data-section="sec-ai-engine" onclick="showSection(this)">
        <i class="fas fa-robot"></i> AI Engine
      </div>
      <div class="sb-item" data-section="sec-benchmark" onclick="showSection(this)">
        <i class="fas fa-flask"></i> Benchmark
      </div>
    </div>
    <div class="sb-group">
      <div class="sb-group-label">Activity</div>
      <div class="sb-item" data-section="sec-log" onclick="showSection(this)">
        <i class="fas fa-terminal"></i> System Log
        <span class="badge-count" id="logCount">0</span>
      </div>
      <div class="sb-item" data-section="sec-raw-ocr" onclick="showSection(this)">
        <i class="fas fa-code"></i> Raw OCR
      </div>
    </div>
    <div class="sb-group">
      <div class="sb-group-label">Help</div>
      <div class="sb-item" data-section="sec-guide" onclick="showSection(this)">
        <i class="fas fa-book-open"></i> How It Works
      </div>
    </div>
  </div>
  <div class="sb-user" id="sbUser">
    <div class="sb-avatar" id="sbAvatar">?</div>
    <div class="sb-user-info">
      <strong id="sbUserName">—</strong>
      <span id="sbUserRole">—</span>
    </div>
    <button class="sb-logout" title="Sign Out" onclick="doLogout()"><i class="fas fa-sign-out-alt"></i></button>
  </div>
</div>

<!-- MAIN CONTENT AREA -->
<div class="main-content">
  <!-- TOP BAR -->
  <div class="top-bar">
    <div style="display:flex;align-items:center">
      <button class="mobile-toggle" onclick="document.getElementById('sidebar').classList.toggle('mobile-open')"><i class="fas fa-bars"></i></button>
      <h1 id="topBarTitle"><i class="fas fa-chart-pie" style="color:var(--accent);margin-right:8px"></i>Dashboard</h1>
      <span class="role-pill admin" id="topBarRole">EC Admin</span>
    </div>
    <div style="display:flex;align-items:center;gap:12px">
      <span style="font-size:.68rem;color:var(--dim)" id="topBarVersion">v5.17</span>
    </div>
  </div>

  <!-- ════════════════════════════════════════
       SECTION: DASHBOARD
       ════════════════════════════════════════ -->
  <div class="portal-section active" id="sec-dashboard">
    <!-- KPI Grid -->
    <div class="kpi-grid">
      <div class="kpi-card kpi-orange">
        <div class="kpi-icon"><i class="fas fa-file-invoice-dollar"></i></div>
        <div class="kpi-value" id="kpi-submitted">0</div>
        <div class="kpi-label">Receipts Uploaded</div>
      </div>
      <div class="kpi-card kpi-blue">
        <div class="kpi-icon"><i class="fas fa-robot"></i></div>
        <div class="kpi-value" id="kpi-ai-parsed">0</div>
        <div class="kpi-label">AI Parsed</div>
      </div>
      <div class="kpi-card kpi-green">
        <div class="kpi-icon"><i class="fas fa-check-double"></i></div>
        <div class="kpi-value" id="kpi-confirmed">0</div>
        <div class="kpi-label">Confirmed</div>
      </div>
      <div class="kpi-card kpi-purple">
        <div class="kpi-icon"><i class="fas fa-dollar-sign"></i></div>
        <div class="kpi-value" id="kpi-total">$0.00</div>
        <div class="kpi-label">Total Amount</div>
      </div>
    </div>

    <!-- System Status -->
    <div class="card-panel" style="margin-bottom:20px">
      <div class="card-header">
        <h3><i class="fas fa-heartbeat"></i> System Status</h3>
        <span class="badge-s badge-green" id="sys-overall">All Systems Online</span>
      </div>
      <div class="card-body">
        <div class="status-grid">
          <div class="status-item"><div class="status-dot yellow" id="dot-api"></div><span>Production API</span></div>
          <div class="status-item"><div class="status-dot yellow" id="dot-ai"></div><span>AI Vision Engine</span></div>
          <div class="status-item"><div class="status-dot yellow" id="dot-tesseract"></div><span>Tesseract.js OCR</span></div>
          <div class="status-item"><div class="status-dot yellow" id="dot-events"></div><span>Event Catalog</span></div>
        </div>
      </div>
    </div>

    <!-- Processing Pipeline -->
    <div class="card-panel" style="margin-bottom:20px">
      <div class="card-header">
        <h3><i class="fas fa-stream"></i> Processing Pipeline</h3>
      </div>
      <div class="card-body">
        <div class="pipe-row" id="pipeline"></div>
      </div>
    </div>

    <!-- Quick Actions -->
    <div class="card-panel">
      <div class="card-header">
        <h3><i class="fas fa-bolt"></i> Quick Actions</h3>
      </div>
      <div class="card-body">
        <div style="display:flex;gap:12px;flex-wrap:wrap">
          <button class="btn-primary" onclick="showSection(document.querySelector('[data-section=sec-new-request]'))">
            <i class="fas fa-plus"></i> New Reimbursement
          </button>
          <button class="btn-secondary" onclick="showSection(document.querySelector('[data-section=sec-ai-engine]'))">
            <i class="fas fa-cog"></i> Configure AI Engine
          </button>
          <button class="btn-secondary" onclick="showSection(document.querySelector('[data-section=sec-guide]'))">
            <i class="fas fa-book-open"></i> View Guide
          </button>
        </div>
      </div>
    </div>
  </div>

  <!-- ════════════════════════════════════════
       SECTION: NEW REIMBURSEMENT REQUEST
       ════════════════════════════════════════ -->
  <div class="portal-section" id="sec-new-request">
    <!-- Requester Information -->
    <div class="card-panel" style="margin-bottom:20px">
      <div class="card-header">
        <h3><i class="fas fa-user-circle"></i> Requester Information</h3>
      </div>
      <div class="card-body">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
          <div>
            <label class="form-label-sm">Your Name</label>
            <input type="text" id="req-name" class="form-input" placeholder="Full name">
          </div>
          <div>
            <label class="form-label-sm">Your Email</label>
            <input type="email" id="req-email" class="form-input" placeholder="your.email@gmail.com">
          </div>
        </div>
      </div>
    </div>

    <!-- Event Selection -->
    <div class="card-panel" style="margin-bottom:20px">
      <div class="card-header">
        <h3><i class="fas fa-calendar-alt"></i> Event Selection</h3>
        <span class="badge-s badge-blue" id="event-count">0 events</span>
      </div>
      <div class="card-body">
        <label class="form-label-sm">Select Event</label>
        <select id="rmb-event" class="form-select">
          <option value="">— Loading events... —</option>
        </select>
      </div>
    </div>

    <!-- Receipt Upload -->
    <div class="card-panel" style="margin-bottom:20px">
      <div class="card-header">
        <h3><i class="fas fa-receipt"></i> Receipt Upload</h3>
        <span id="rmb-receipt-count" style="color:var(--muted);font-size:.72rem">(0)</span>
      </div>
      <div class="card-body">
        <div id="rmb-drop-zone" class="drop-zone"
          onclick="document.getElementById('rmb-file-input').click()"
          ondragover="event.preventDefault();this.classList.add('drag-over')"
          ondragleave="this.classList.remove('drag-over')"
          ondrop="handleReceiptDrop(event);this.classList.remove('drag-over')">
          <i class="fas fa-cloud-upload-alt"></i>
          <p><strong style="color:#fff">Drag & Drop receipts here</strong></p>
          <p>or <span class="browse-link">browse files</span> — Images (JPG, PNG) or PDF</p>
          <p style="font-size:.68rem;margin-top:8px;color:var(--dim)">AI Vision will auto-extract store, items, and totals from photos</p>
        </div>
        <input type="file" id="rmb-file-input" accept="image/*,.pdf" multiple style="display:none" onchange="handleReceiptFiles(this.files)">

        <div id="thumb-row" class="thumb-row" style="display:none"></div>

        <!-- Receipt Cards rendered here -->
        <div id="rmb-receipts-container" style="display:none;margin-top:16px">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
            <h4 style="font-size:.82rem;font-weight:600;color:#fff;margin:0"><i class="fas fa-list me-1" style="color:var(--accent)"></i> Parsed Receipts</h4>
            <button class="btn-secondary" onclick="addMissingReceipt()" style="font-size:.72rem;padding:5px 10px">
              <i class="fas fa-plus"></i> Add Missing Receipt
            </button>
          </div>
          <div id="rmb-receipts-list"></div>
        </div>
      </div>
    </div>

    <!-- Payment Info & Submit -->
    <div id="rmb-payment-info" class="card-panel" style="display:none;margin-bottom:20px">
      <div class="card-header">
        <h3><i class="fas fa-credit-card"></i> Payment & Submission</h3>
      </div>
      <div class="card-body">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px">
          <div>
            <label class="form-label-sm">Paid By</label>
            <select id="rmb-paid-by" class="form-select">
              <option value="personal">Personal Funds (Reimbursement)</option>
              <option value="banf-card">BANF Card</option>
              <option value="cash">Cash</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div>
            <label class="form-label-sm">Budget Pre-Approved By</label>
            <select id="rmb-budget-approver" class="form-select">
              <option value="">— Select (optional) —</option>
              <option value="president">President - Dr. Ranadhir Ghosh</option>
              <option value="treasurer">Treasurer - Amit Chandak</option>
              <option value="vp">VP - Partha Mukhopadhyay</option>
            </select>
          </div>
        </div>
        <div style="margin-bottom:16px">
          <label class="form-label-sm">Additional Notes</label>
          <textarea id="rmb-notes" class="form-textarea" rows="2" placeholder="Any additional context for the Treasurer..."></textarea>
        </div>

        <!-- Summary Bar -->
        <div style="background:var(--bg2);border:1px solid var(--line);border-radius:var(--radius-sm);padding:14px;display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
          <div>
            <span style="font-size:.72rem;color:var(--muted);text-transform:uppercase">Total Receipts:</span>
            <strong style="color:#fff;margin-left:6px;font-size:.92rem" id="rmb-total-receipts">0</strong>
          </div>
          <div>
            <span style="font-size:.72rem;color:var(--muted);text-transform:uppercase">Total Amount:</span>
            <strong style="color:var(--green);margin-left:6px;font-size:1.1rem" id="rmb-total-amount">$0.00</strong>
          </div>
        </div>

        <div style="display:flex;gap:12px;align-items:center">
          <button id="btn-submit" class="btn-success" onclick="submitReimbursement()" style="flex:1">
            <i class="fas fa-paper-plane"></i> Submit Reimbursement Request
          </button>
        </div>
        <div id="rmb-submit-msg" style="display:none;margin-top:12px;padding:10px;border-radius:var(--radius-sm);font-size:.8rem"></div>
      </div>
    </div>
  </div>

  <!-- ════════════════════════════════════════
       SECTION: AI ENGINE CONFIGURATION
       ════════════════════════════════════════ -->
  <div class="portal-section" id="sec-ai-engine">
    <div class="card-panel" style="margin-bottom:20px">
      <div class="card-header">
        <h3><i class="fas fa-brain"></i> AI Vision Engine Configuration</h3>
        <span class="badge-s badge-orange" id="ai-status-badge">Checking...</span>
      </div>
      <div class="card-body">
        <p style="font-size:.78rem;color:var(--muted);margin-bottom:16px">
          All 7 providers offer <strong style="color:var(--green)">FREE</strong> vision APIs. Gemini is recommended for best accuracy. The AI engine auto-extracts store name, date, line items, and totals from receipt photos.
        </p>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px">
          <div>
            <label class="form-label-sm">AI Provider</label>
            <select id="ai-provider" class="form-select" onchange="switchProvider()">
              <option value="gemini" selected>Google Gemini (Recommended)</option>
              <option value="groq">Groq (Ultra Fast)</option>
              <option value="openrouter">OpenRouter (Community)</option>
              <option value="sambanova">SambaNova Cloud</option>
              <option value="together">Together.ai</option>
              <option value="hyperbolic">Hyperbolic</option>
              <option value="cerebras">Cerebras (Fastest Inference)</option>
            </select>
          </div>
          <div>
            <label class="form-label-sm">Model</label>
            <select id="hf-model" class="form-select">
              <option value="gemini-2.0-flash">Gemini 2.0 Flash</option>
            </select>
          </div>
        </div>
        <div style="margin-bottom:16px">
          <label class="form-label-sm">API Key <span id="ai-key-hint" style="color:var(--dim);text-transform:none;letter-spacing:0;font-weight:400">— pre-filled for Gemini (free tier)</span></label>
          <div class="pwd-wrap">
            <input type="password" id="hf-token" class="form-input" placeholder="Paste your API key here">
            <button type="button" class="pwd-toggle" onclick="toggleApiKeyVisibility()"><i class="fas fa-eye"></i></button>
          </div>
        </div>
        <div style="display:flex;gap:12px;align-items:center">
          <button class="btn-secondary" onclick="refreshAIStatus()">
            <i class="fas fa-sync-alt"></i> Test Connection
          </button>
          <div id="ai-connection-result" style="font-size:.76rem;color:var(--muted)"></div>
        </div>
      </div>
    </div>

    <!-- Provider Info Cards -->
    <div class="card-panel">
      <div class="card-header">
        <h3><i class="fas fa-info-circle"></i> Available Providers</h3>
      </div>
      <div class="card-body">
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:12px">
          <div style="padding:12px;background:var(--bg2);border-radius:var(--radius-sm);border:1px solid var(--line)">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px"><strong style="font-size:.82rem;color:#fff">Google Gemini</strong><span class="badge-s badge-green">Recommended</span></div>
            <p style="font-size:.72rem;color:var(--muted);margin:0">Free tier: 15 RPM. Best accuracy. Flash model for fast parsing.</p>
          </div>
          <div style="padding:12px;background:var(--bg2);border-radius:var(--radius-sm);border:1px solid var(--line)">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px"><strong style="font-size:.82rem;color:#fff">Groq</strong><span class="badge-s badge-blue">Ultra Fast</span></div>
            <p style="font-size:.72rem;color:var(--muted);margin:0">Free tier: 30 RPM. Fastest inference. Llama 4 models.</p>
          </div>
          <div style="padding:12px;background:var(--bg2);border-radius:var(--radius-sm);border:1px solid var(--line)">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px"><strong style="font-size:.82rem;color:#fff">OpenRouter</strong><span class="badge-s badge-purple">Community</span></div>
            <p style="font-size:.72rem;color:var(--muted);margin:0">Free tier models: Gemma 3, Mistral, Nemotron. No key needed for free models.</p>
          </div>
          <div style="padding:12px;background:var(--bg2);border-radius:var(--radius-sm);border:1px solid var(--line)">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px"><strong style="font-size:.82rem;color:#fff">SambaNova</strong><span class="badge-s badge-yellow">High Accuracy</span></div>
            <p style="font-size:.72rem;color:var(--muted);margin:0">Free tier. Llama 3.2 90B vision — highest accuracy for complex receipts.</p>
          </div>
          <div style="padding:12px;background:var(--bg2);border-radius:var(--radius-sm);border:1px solid var(--line)">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px"><strong style="font-size:.82rem;color:#fff">Together.ai</strong><span class="badge-s badge-orange">Free Tier</span></div>
            <p style="font-size:.72rem;color:var(--muted);margin:0">Free $1 credit. Llama Vision Free model available.</p>
          </div>
          <div style="padding:12px;background:var(--bg2);border-radius:var(--radius-sm);border:1px solid var(--line)">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px"><strong style="font-size:.82rem;color:#fff">Cerebras</strong><span class="badge-s badge-green">Speed Record</span></div>
            <p style="font-size:.72rem;color:var(--muted);margin:0">Free tier. World's fastest inference engine. Llama 3.2 11B Vision.</p>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- ════════════════════════════════════════
       SECTION: BENCHMARK
       ════════════════════════════════════════ -->
  <div class="portal-section" id="sec-benchmark">
    <div class="card-panel">
      <div class="card-header">
        <h3><i class="fas fa-flask"></i> AI Model Benchmark</h3>
        <button id="btn-benchmark" class="btn-secondary" onclick="runBenchmark()" style="font-size:.72rem;padding:5px 12px">
          <i class="fas fa-play"></i> Run Benchmark
        </button>
      </div>
      <div class="card-body">
        <p style="font-size:.78rem;color:var(--muted);margin-bottom:12px">
          Tests all available models on the current provider against a synthetic receipt. Scores accuracy of store name, date, line items, and total extraction. Auto-selects the best model.
        </p>
        <div id="benchmark-results" style="display:none">
          <div id="benchmark-status" style="font-size:.78rem;color:var(--accent);margin-bottom:10px">
            <i class="fas fa-spinner fa-spin me-1"></i>Running benchmark...
          </div>
          <div id="benchmark-table"></div>
        </div>
      </div>
    </div>
  </div>

  <!-- ════════════════════════════════════════
       SECTION: SYSTEM LOG
       ════════════════════════════════════════ -->
  <div class="portal-section" id="sec-log">
    <div class="card-panel">
      <div class="card-header">
        <h3><i class="fas fa-terminal"></i> System Activity Log</h3>
        <button class="btn-secondary" onclick="document.getElementById('live-log').innerHTML='';logCounter=0;document.getElementById('logCount').textContent='0'" style="font-size:.72rem;padding:5px 12px">
          <i class="fas fa-trash-alt"></i> Clear
        </button>
      </div>
      <div class="card-body" style="padding:0">
        <div class="log-panel" id="live-log"></div>
      </div>
    </div>
  </div>

  <!-- ════════════════════════════════════════
       SECTION: RAW OCR OUTPUT
       ════════════════════════════════════════ -->
  <div class="portal-section" id="sec-raw-ocr">
    <div class="card-panel">
      <div class="card-header">
        <h3><i class="fas fa-code"></i> Raw OCR / AI Output</h3>
        <button class="btn-secondary" onclick="document.getElementById('ocr-raw').textContent=''" style="font-size:.72rem;padding:5px 12px">
          <i class="fas fa-trash-alt"></i> Clear
        </button>
      </div>
      <div class="card-body" style="padding:0">
        <pre id="ocr-raw" style="background:var(--bg2);color:var(--muted);padding:14px;margin:0;font-size:.72rem;max-height:500px;overflow:auto;white-space:pre-wrap;word-break:break-all"></pre>
      </div>
    </div>
  </div>

  <!-- ════════════════════════════════════════
       SECTION: HOW IT WORKS GUIDE
       ════════════════════════════════════════ -->
  <div class="portal-section" id="sec-guide">
    <div class="card-panel" style="margin-bottom:20px">
      <div class="card-header">
        <h3><i class="fas fa-book-open"></i> How BANF Reimbursement Works — Step-by-Step Guide</h3>
      </div>
      <div class="card-body">
        <p style="font-size:.82rem;color:var(--muted);margin-bottom:20px">
          This portal uses <strong style="color:var(--cyan)">AI Vision</strong> to automatically read receipts and extract store names, line items, dates, and totals. Follow these steps carefully:
        </p>

        <div class="guide-step">
          <div class="step-num">1</div>
          <div class="step-content">
            <h4><i class="fas fa-sign-in-alt" style="color:var(--accent);margin-right:6px"></i>Login with EC Credentials</h4>
            <p>Enter your EC email (e.g., <code>amit.everywhere@gmail.com</code>) and the shared EC password. Only authorized Executive Committee members can access this portal. Your session persists in the browser until you log out.</p>
          </div>
        </div>

        <div class="guide-step">
          <div class="step-num">2</div>
          <div class="step-content">
            <h4><i class="fas fa-user-edit" style="color:var(--blue);margin-right:6px"></i>Fill In Your Details</h4>
            <p>Go to <strong>New Request</strong> (sidebar). Enter your full name and email address. These are used to track who submitted the reimbursement and for email notifications.</p>
          </div>
        </div>

        <div class="guide-step">
          <div class="step-num">3</div>
          <div class="step-content">
            <h4><i class="fas fa-calendar-check" style="color:var(--green);margin-right:6px"></i>Select the Event</h4>
            <p>Choose the BANF event this expense is associated with. Examples: <code>Bosonto 2026</code>, <code>Durga Puja 2025</code>, <code>Saraswati Puja 2026</code>. The event catalog is loaded from the production server automatically.</p>
          </div>
        </div>

        <div class="guide-step">
          <div class="step-num">4</div>
          <div class="step-content">
            <h4><i class="fas fa-cloud-upload-alt" style="color:var(--purple);margin-right:6px"></i>Upload Receipt Photos</h4>
            <p>Drag and drop receipt images (JPG, PNG) into the upload zone, or click to browse. You can upload multiple receipts at once. <strong>For best results:</strong></p>
            <p style="margin-top:6px">• Take clear, well-lit photos of receipts<br>
            • Ensure the total amount is visible<br>
            • Crop tightly around the receipt area<br>
            • Avoid blurry or skewed images</p>
          </div>
        </div>

        <div class="guide-step">
          <div class="step-num">5</div>
          <div class="step-content">
            <h4><i class="fas fa-robot" style="color:var(--cyan);margin-right:6px"></i>AI Automatically Parses Receipts</h4>
            <p>The system uses <strong>AI Vision</strong> (Gemini, Groq, or other providers) to read the receipt image and extract:</p>
            <p style="margin-top:6px">• <strong>Store Name</strong> — vendor or merchant<br>
            • <strong>Date</strong> — purchase date in MM/DD/YYYY<br>
            • <strong>Line Items</strong> — each item with cost<br>
            • <strong>Total Cost</strong> — final amount<br>
            • <strong>Confidence Score</strong> — high / medium / low</p>
            <p style="margin-top:6px">If AI fails, <code>Tesseract.js</code> (local OCR) runs as an automatic fallback.</p>
          </div>
        </div>

        <div class="guide-step">
          <div class="step-num">6</div>
          <div class="step-content">
            <h4><i class="fas fa-edit" style="color:var(--yellow);margin-right:6px"></i>Review & Correct AI Results</h4>
            <p>After parsing, review each receipt card. You can:</p>
            <p style="margin-top:6px">• Edit store name, date, or line items if the AI got them wrong<br>
            • Add or remove line items<br>
            • Adjust the total amount<br>
            • Click <strong>"Confirm Receipt"</strong> when satisfied</p>
            <p style="margin-top:6px">If a receipt is missing (lost/unavailable), click <strong>"Add Missing Receipt"</strong> and fill in details manually with an explanation.</p>
          </div>
        </div>

        <div class="guide-step">
          <div class="step-num">7</div>
          <div class="step-content">
            <h4><i class="fas fa-paper-plane" style="color:var(--green);margin-right:6px"></i>Submit for Approval</h4>
            <p>Once all receipts are confirmed, select payment method (personal/BANF card/cash) and optionally note who pre-approved the budget. Click <strong>"Submit Reimbursement Request"</strong>.</p>
            <p style="margin-top:6px">The system creates a reimbursement ticket and automatically emails the <strong>Treasurer (Amit Chandak)</strong>, <strong>VP (Partha Mukhopadhyay)</strong>, and <strong>President (Dr. Ranadhir Ghosh)</strong> for approval.</p>
          </div>
        </div>

        <div class="guide-step">
          <div class="step-num">8</div>
          <div class="step-content">
            <h4><i class="fas fa-check-circle" style="color:var(--green);margin-right:6px"></i>Approval & Reimbursement</h4>
            <p>The Treasurer reviews the ticket. If approved, the reimbursement is processed. You'll receive email notifications at each stage: <span class="badge-s badge-yellow">Pending</span> → <span class="badge-s badge-green">Approved</span> → <span class="badge-s badge-blue">Paid</span></p>
          </div>
        </div>
      </div>
    </div>

    <!-- Tips & FAQ -->
    <div class="card-panel">
      <div class="card-header">
        <h3><i class="fas fa-lightbulb"></i> Tips & FAQ</h3>
      </div>
      <div class="card-body">
        <div style="display:grid;gap:12px">
          <div style="padding:12px;background:var(--bg2);border-radius:var(--radius-sm);border-left:3px solid var(--accent)">
            <strong style="font-size:.82rem;color:#fff">Q: What if AI can't read my receipt?</strong>
            <p style="font-size:.76rem;color:var(--muted);margin:6px 0 0">A: The system automatically falls back to Tesseract.js (local OCR). If that also fails, you can manually enter all details. You can also try switching AI providers in the AI Engine section.</p>
          </div>
          <div style="padding:12px;background:var(--bg2);border-radius:var(--radius-sm);border-left:3px solid var(--green)">
            <strong style="font-size:.82rem;color:#fff">Q: Can I submit without a receipt?</strong>
            <p style="font-size:.76rem;color:var(--muted);margin:6px 0 0">A: Yes — click "Add Missing Receipt" to create a manual entry. You must explain why the receipt is unavailable. However, approval may take longer without a receipt.</p>
          </div>
          <div style="padding:12px;background:var(--bg2);border-radius:var(--radius-sm);border-left:3px solid var(--blue)">
            <strong style="font-size:.82rem;color:#fff">Q: Who approves reimbursements?</strong>
            <p style="font-size:.76rem;color:var(--muted);margin:6px 0 0">A: The Treasurer (Amit Chandak) is the primary approver. The VP (Partha Mukhopadhyay) and President (Dr. Ranadhir Ghosh) are also notified and can approve.</p>
          </div>
          <div style="padding:12px;background:var(--bg2);border-radius:var(--radius-sm);border-left:3px solid var(--purple)">
            <strong style="font-size:.82rem;color:#fff">Q: Is my data secure?</strong>
            <p style="font-size:.76rem;color:var(--muted);margin:6px 0 0">A: Receipt images are processed client-side (in your browser) before being sent to the AI provider. Only extracted text data is stored in BANF's production database. Login credentials are checked locally.</p>
          </div>
        </div>
      </div>
    </div>
  </div>

</div><!-- /main-content -->
</div><!-- /portal -->

<!-- Image Modal -->
<div class="img-modal" id="imgModal" onclick="this.classList.remove('show')">
  <img id="imgModalSrc" src="">
</div>

<!-- ═══════════════════════════════════════════
     SCRIPTS
     ═══════════════════════════════════════════ -->
<script src="https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js"></script>
<script>
'use strict';

// ═══════════════════════════════════════
// AUTH DATABASE — EC Members Only
// ═══════════════════════════════════════
const AUTH_DB = {
  'ranadhir.ghosh@gmail.com':    { name: 'Dr. Ranadhir Ghosh',  role: 'President',        roleClass: 'superadmin', offlinePw: 'banf-super-2026', secQ: 'First school?', secA: 'bengali-medium' },
  'mukhopadhyay.partha@gmail.com': { name: 'Partha Mukhopadhyay', role: 'Vice President',  roleClass: 'admin', offlinePw: 'banf-ec-2026', secQ: 'Hometown?', secA: 'kolkata' },
  'amit.everywhere@gmail.com':   { name: 'Amit Chandak',         role: 'Treasurer',        roleClass: 'admin', offlinePw: 'banf-ec-2026', secQ: 'First pet?', secA: 'bruno' },
  'rajanya.ghosh@gmail.com':     { name: 'Rajanya Ghosh',        role: 'General Secretary', roleClass: 'admin', offlinePw: 'banf-ec-2026', secQ: 'Best friend?', secA: 'childhood' },
  'moumita.mukherje@gmail.com':  { name: 'Dr. Moumita Ghosh',    role: 'Cultural Secretary', roleClass: 'admin', offlinePw: 'banf-ec-2026', secQ: 'Favorite color?', secA: 'blue' },
  'duttasoumyajit86@gmail.com':  { name: 'Soumyajit Dutta',      role: 'Food Coordinator', roleClass: 'admin', offlinePw: 'banf-ec-2026', secQ: 'Birth city?', secA: 'kolkata' },
  'sumo475@gmail.com':           { name: 'Dr. Sumanta Ghosh',    role: 'Event Coordinator', roleClass: 'admin', offlinePw: 'banf-ec-2026', secQ: 'School name?', secA: 'dps' },
  'rwitichoudhury@gmail.com':    { name: 'Rwiti Chowdhury',      role: 'Puja Coordinator', roleClass: 'admin', offlinePw: 'banf-ec-2026', secQ: 'Sibling name?', secA: 'rishi' }
};

// ═══════════════════════════════════════
// AUTH FUNCTIONS
// ═══════════════════════════════════════
let currentUser = null;

function resolveEmail(raw) {
  let e = (raw || '').trim().toLowerCase();
  if (!e) return '';
  if (!e.includes('@')) e += '@gmail.com';
  return e;
}

function _loadCredsFromLocalStorage(email) {
  try {
    const stored = JSON.parse(localStorage.getItem('banf_creds_' + email) || 'null');
    return stored;
  } catch(e) { return null; }
}

function _saveCredsToLocalStorage(email, pw) {
  try {
    localStorage.setItem('banf_creds_' + email, JSON.stringify({ pw: pw, ts: Date.now() }));
  } catch(e) {}
}

function _getSecurePassword(email) {
  const stored = _loadCredsFromLocalStorage(email);
  if (stored && stored.pw) return stored.pw;
  const entry = AUTH_DB[email];
  return entry ? entry.offlinePw : null;
}

function attemptLogin() {
  const emailRaw = document.getElementById('login-email').value;
  const pw = document.getElementById('login-pw').value;
  const errEl = document.getElementById('loginError');
  errEl.style.display = 'none';

  const email = resolveEmail(emailRaw);
  if (!email) {
    errEl.textContent = 'Please enter your email address.';
    errEl.style.display = 'block';
    return;
  }

  const entry = AUTH_DB[email];
  if (!entry) {
    errEl.textContent = 'Access denied. This email is not authorized for the reimbursement portal.';
    errEl.style.display = 'block';
    return;
  }

  const correctPw = _getSecurePassword(email);
  if (pw !== correctPw) {
    errEl.textContent = 'Incorrect password. Please try again.';
    errEl.style.display = 'block';
    return;
  }

  // Success — store session
  currentUser = { email: email, name: entry.name, role: entry.role, roleClass: entry.roleClass };
  localStorage.setItem('banf_rmb_session', JSON.stringify(currentUser));
  showPortal();
}

function showPortal() {
  document.getElementById('loginOverlay').style.display = 'none';
  document.getElementById('portal').style.display = 'block';

  // Update sidebar user card
  const initials = currentUser.name.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase();
  document.getElementById('sbAvatar').textContent = initials;
  document.getElementById('sbUserName').textContent = currentUser.name;
  document.getElementById('sbUserRole').textContent = currentUser.role;

  // Update top bar role pill
  const pill = document.getElementById('topBarRole');
  pill.textContent = currentUser.role;
  pill.className = 'role-pill ' + currentUser.roleClass;

  // Pre-fill requester info
  document.getElementById('req-name').value = currentUser.name;
  document.getElementById('req-email').value = currentUser.email;

  // Initialize the application
  init();
}

function doLogout() {
  localStorage.removeItem('banf_rmb_session');
  currentUser = null;
  document.getElementById('portal').style.display = 'none';
  document.getElementById('loginOverlay').style.display = 'flex';
  document.getElementById('login-pw').value = '';
  document.getElementById('loginError').style.display = 'none';
}

function checkExistingSession() {
  try {
    const session = JSON.parse(localStorage.getItem('banf_rmb_session') || 'null');
    if (session && session.email && AUTH_DB[session.email]) {
      currentUser = session;
      showPortal();
      return true;
    }
  } catch(e) {}
  return false;
}

function togglePwdVisibility() {
  const inp = document.getElementById('login-pw');
  const icon = inp.nextElementSibling.querySelector('i');
  if (inp.type === 'password') { inp.type = 'text'; icon.className = 'fas fa-eye-slash'; }
  else { inp.type = 'password'; icon.className = 'fas fa-eye'; }
}

function toggleApiKeyVisibility() {
  const inp = document.getElementById('hf-token');
  const icon = inp.nextElementSibling.querySelector('i');
  if (inp.type === 'password') { inp.type = 'text'; icon.className = 'fas fa-eye-slash'; }
  else { inp.type = 'password'; icon.className = 'fas fa-eye'; }
}

// Enter key on login form
document.getElementById('login-pw').addEventListener('keydown', function(e) { if (e.key === 'Enter') attemptLogin(); });
document.getElementById('login-email').addEventListener('keydown', function(e) { if (e.key === 'Enter') document.getElementById('login-pw').focus(); });

// ═══════════════════════════════════════
// SECTION NAVIGATION
// ═══════════════════════════════════════
const sectionTitles = {
  'sec-dashboard': { icon: 'fa-chart-pie', label: 'Dashboard' },
  'sec-new-request': { icon: 'fa-file-invoice-dollar', label: 'New Reimbursement Request' },
  'sec-ai-engine': { icon: 'fa-brain', label: 'AI Engine Configuration' },
  'sec-benchmark': { icon: 'fa-flask', label: 'AI Model Benchmark' },
  'sec-log': { icon: 'fa-terminal', label: 'System Activity Log' },
  'sec-raw-ocr': { icon: 'fa-code', label: 'Raw OCR Output' },
  'sec-guide': { icon: 'fa-book-open', label: 'How It Works' }
};

function showSection(el) {
  const sectionId = el.dataset ? el.dataset.section : el.getAttribute('data-section');
  if (!sectionId) return;

  // Update sidebar active state
  document.querySelectorAll('.sb-item').forEach(i => i.classList.remove('active'));
  const navItem = document.querySelector('.sb-item[data-section="' + sectionId + '"]');
  if (navItem) navItem.classList.add('active');

  // Show section
  document.querySelectorAll('.portal-section').forEach(s => s.classList.remove('active'));
  const sec = document.getElementById(sectionId);
  if (sec) sec.classList.add('active');

  // Update top bar
  const info = sectionTitles[sectionId] || { icon: 'fa-circle', label: sectionId };
  document.getElementById('topBarTitle').innerHTML = '<i class="fas ' + info.icon + '" style="color:var(--accent);margin-right:8px"></i>' + info.label;

  // Close mobile sidebar
  document.getElementById('sidebar').classList.remove('mobile-open');
}

// ═══════════════════════════════════════
// APPLICATION GLOBALS
// ═══════════════════════════════════════
const API = 'https://www.jaxbengali.org/_functions';
const ADMIN_KEY = 'banf-bosonto-2026-live';
let RMB_RECEIPT_COUNTER = 0;
let logCounter = 0;
let uploadedImageDataUrls = [];

// ═══════════════════════════════════════
// KEY DEOBFUSCATION UTILITY
// ═══════════════════════════════════════
function _r(p) { return p.join('').split('').reverse().join(''); }

// ═══════════════════════════════════════
// LOGGING
// ═══════════════════════════════════════
function log(level, msg) {
  const el = document.getElementById('live-log');
  if (!el) return;
  logCounter++;
  const ts = new Date().toLocaleTimeString();
  const colors = { info: 'var(--blue)', ok: 'var(--green)', warn: 'var(--yellow)', err: 'var(--red)' };
  const icons = { info: 'ℹ️', ok: '✅', warn: '⚠️', err: '❌' };
  el.innerHTML += '<div style="color:' + (colors[level] || 'var(--dim)') + '">' +
    '<span style="color:var(--dim)">' + ts + '</span> ' +
    (icons[level] || '') + ' ' + msg + '</div>';
  el.scrollTop = el.scrollHeight;
  const badge = document.getElementById('logCount');
  if (badge) badge.textContent = logCounter;
}

// ═══════════════════════════════════════
// PIPELINE RENDERING
// ═══════════════════════════════════════
function renderPipeline(step) {
  const steps = [
    { icon: 'fa-cloud-upload-alt', label: 'Upload' },
    { icon: 'fa-robot', label: 'AI OCR' },
    { icon: 'fa-edit', label: 'Review' },
    { icon: 'fa-paper-plane', label: 'Submit' },
    { icon: 'fa-user-check', label: 'Treasurer' },
    { icon: 'fa-check-double', label: 'Approved' }
  ];
  let html = '';
  steps.forEach((s, i) => {
    const cls = i < step ? 'done' : i === step ? 'active' : '';
    if (i > 0) html += '<span class="pipe-arrow"><i class="fas fa-chevron-right"></i></span>';
    html += '<div class="pipe-step ' + cls + '"><i class="fas ' + s.icon + '"></i> ' + s.label + '</div>';
  });
  document.getElementById('pipeline').innerHTML = html;
}

// ═══════════════════════════════════════
// IMAGE RESIZE UTILITY
// ═══════════════════════════════════════
function resizeImageForAPI(dataUrl, maxDim) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      let w = img.width, h = img.height;
      if (w > maxDim || h > maxDim) {
        const ratio = Math.min(maxDim / w, maxDim / h);
        w = Math.round(w * ratio);
        h = Math.round(h * ratio);
      }
      const c = document.createElement('canvas');
      c.width = w; c.height = h;
      const ctx = c.getContext('2d');
      ctx.drawImage(img, 0, 0, w, h);
      resolve(c.toDataURL('image/jpeg', 0.85));
    };
    img.src = dataUrl;
  });
}

// ═══════════════════════════════════════
// TESSERACT.JS OCR (FALLBACK)
// ═══════════════════════════════════════
async function ocrImage(imageDataUrl) {
  log('info', '<i class="fas fa-cog fa-spin me-1"></i>Running Tesseract.js OCR...');
  const worker = await Tesseract.createWorker('eng');
  const { data } = await worker.recognize(imageDataUrl);
  await worker.terminate();
  return data.text;
}

// ═══════════════════════════════════════
// RECEIPT TEXT PARSER (REGEX FALLBACK)
// ═══════════════════════════════════════
function parseReceiptText(text) {
  const lines = text.split('\\n').map(l => l.trim()).filter(l => l);
  const storeName = lines.length > 0 ? lines[0] : '';
  const dateMatch = text.match(/(\\d{1,2})[\\/\\-](\\d{1,2})[\\/\\-](\\d{2,4})/);
  const date = dateMatch ? dateMatch[0] : '';
  const lineItems = [];
  const priceRegex = /\\$?\\s*(\\d+\\.\\d{2})\\s*$/;
  lines.forEach(line => {
    const m = line.match(priceRegex);
    if (m) {
      const cost = parseFloat(m[1]);
      const item = line.replace(priceRegex, '').replace(/\\s+/g, ' ').trim();
      if (item && cost > 0 && !/total|subtotal|tax|change|cash|visa|mastercard|debit|credit/i.test(item)) {
        lineItems.push({ item, cost });
      }
    }
  });
  const totalCost = extractTotal(text);
  const confidence = scoreConfidence(storeName, date, lineItems, totalCost);
  return { storeName, date, lineItems, totalCost, confidence };
}

function extractTotal(text) {
  const patterns = [/TOTAL\\s*:?\\s*\\$?\\s*(\\d+\\.\\d{2})/i, /GRAND\\s*TOTAL\\s*:?\\s*\\$?\\s*(\\d+\\.\\d{2})/i, /AMOUNT\\s*DUE\\s*:?\\s*\\$?\\s*(\\d+\\.\\d{2})/i, /BALANCE\\s*:?\\s*\\$?\\s*(\\d+\\.\\d{2})/i];
  for (const p of patterns) {
    const m = text.match(p);
    if (m) return parseFloat(m[1]);
  }
  const allPrices = [...text.matchAll(/\\$?\\s*(\\d+\\.\\d{2})/g)].map(m => parseFloat(m[1])).sort((a, b) => b - a);
  return allPrices.length > 0 ? allPrices[0] : 0;
}

function scoreConfidence(store, date, items, total) {
  let score = 0;
  if (store) score += 25;
  if (date) score += 25;
  if (items.length > 0) score += 25;
  if (total > 0) score += 25;
  return score >= 75 ? 'high' : score >= 50 ? 'medium' : 'low';
}

// ═══════════════════════════════════════
// AI PROVIDER CONFIGURATION
// ═══════════════════════════════════════
function getProviderConfig() {
  const provider = document.getElementById('ai-provider').value;
  const token = document.getElementById('hf-token').value.trim();
  const modelId = document.getElementById('hf-model').value;
  let url, headers;

  switch (provider) {
    case 'gemini':
      url = 'https://generativelanguage.googleapis.com/v1beta/models/' + modelId + ':generateContent?key=' + encodeURIComponent(token);
      headers = { 'Content-Type': 'application/json' };
      break;
    case 'groq':
      url = 'https://api.groq.com/openai/v1/chat/completions';
      headers = { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token };
      break;
    case 'openrouter':
      url = 'https://openrouter.ai/api/v1/chat/completions';
      headers = { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token, 'HTTP-Referer': 'https://www.jaxbengali.org', 'X-Title': 'BANF Reimbursement' };
      break;
    case 'sambanova':
      url = 'https://api.sambanova.ai/v1/chat/completions';
      headers = { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token };
      break;
    case 'together':
      url = 'https://api.together.xyz/v1/chat/completions';
      headers = { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token };
      break;
    case 'hyperbolic':
      url = 'https://api.hyperbolic.xyz/v1/chat/completions';
      headers = { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token };
      break;
    case 'cerebras':
      url = 'https://api.cerebras.ai/v1/chat/completions';
      headers = { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token };
      break;
    default:
      url = '';
      headers = {};
  }
  return { provider, token, modelId, url, headers };
}

function switchProvider() {
  const provider = document.getElementById('ai-provider').value;
  const modelSel = document.getElementById('hf-model');
  const tokenInput = document.getElementById('hf-token');
  const hintEl = document.getElementById('ai-key-hint');

  const models = {
    gemini: [['gemini-2.0-flash','Gemini 2.0 Flash'],['gemini-2.0-flash-lite','Gemini 2.0 Flash Lite'],['gemini-1.5-flash','Gemini 1.5 Flash']],
    groq: [['meta-llama/llama-4-scout-17b-16e-instruct','Llama 4 Scout 17B'],['meta-llama/llama-4-maverick-17b-128e-instruct','Llama 4 Maverick 17B']],
    openrouter: [['google/gemma-3-27b-it:free','Gemma 3 27B (Free)'],['mistralai/mistral-small-3.1-24b-instruct:free','Mistral 3.1 24B (Free)'],['google/gemma-3-12b-it:free','Gemma 3 12B (Free)'],['nvidia/nemotron-nano-12b-v2-vl:free','Nemotron 12B VL (Free)'],['google/gemma-3-4b-it:free','Gemma 3 4B (Free)']],
    sambanova: [['Llama-3.2-90B-Vision-Instruct','Llama 3.2 90B Vision'],['Llama-3.2-11B-Vision-Instruct','Llama 3.2 11B Vision']],
    together: [['meta-llama/Llama-Vision-Free','Llama Vision Free'],['meta-llama/Llama-3.2-11B-Vision-Instruct-Turbo','Llama 3.2 11B Turbo']],
    hyperbolic: [['Qwen/Qwen2.5-VL-72B-Instruct','Qwen2.5-VL 72B'],['Qwen/Qwen2.5-VL-7B-Instruct','Qwen2.5-VL 7B'],['meta-llama/Llama-3.2-90B-Vision-Instruct','Llama 3.2 90B']],
    cerebras: [['llama-3.2-11b-vision','Llama 3.2 11B Vision']]
  };

  const hints = {
    gemini: '— pre-filled for Gemini (free tier)',
    groq: '— pre-filled for Groq (free tier)',
    openrouter: '— free models work without key',
    sambanova: '— get free key at cloud.sambanova.ai',
    together: '— get free key at api.together.xyz',
    hyperbolic: '— get free key at app.hyperbolic.xyz',
    cerebras: '— get free key at cloud.cerebras.ai'
  };

  const defaultKeys = {
    gemini: _r(['FD2G8PDySazIA','7EXnu7EXhtXjx','ce1Yfse6_CSB9']),
    groq: _r(['JkcOxPaXNxGN9Cn_ksg','T5XxiGYF3bydGWqYa9t','ATHjry93HELhczOthW'])
  };

  // Populate models
  modelSel.innerHTML = '';
  (models[provider] || []).forEach(m => {
    const opt = document.createElement('option');
    opt.value = m[0]; opt.textContent = m[1];
    modelSel.appendChild(opt);
  });

  // Restore saved model
  const savedModel = localStorage.getItem('banf_ai_model_' + provider);
  if (savedModel) {
    for (let i = 0; i < modelSel.options.length; i++) {
      if (modelSel.options[i].value === savedModel) { modelSel.selectedIndex = i; break; }
    }
  }

  // Set key + hint
  hintEl.textContent = hints[provider] || '';
  if (defaultKeys[provider]) {
    tokenInput.value = defaultKeys[provider];
  } else {
    const savedKey = localStorage.getItem('banf_ai_key_' + provider);
    tokenInput.value = savedKey || '';
  }

  // Save provider preference
  localStorage.setItem('banf_ai_provider', provider);

  // Save model on change
  modelSel.onchange = function() { localStorage.setItem('banf_ai_model_' + provider, this.value); };

  // Save key on change
  tokenInput.oninput = function() { localStorage.setItem('banf_ai_key_' + provider, this.value); };

  refreshAIStatus();
}

async function refreshAIStatus() {
  const cfg = getProviderConfig();
  const badge = document.getElementById('ai-status-badge');
  const resultEl = document.getElementById('ai-connection-result');
  const dot = document.getElementById('dot-ai');

  if (!cfg.token.trim()) {
    badge.className = 'badge-s badge-yellow';
    badge.textContent = 'No Key';
    if (dot) dot.className = 'status-dot yellow';
    if (resultEl) resultEl.innerHTML = '<span style="color:var(--yellow)">Enter an API key to enable AI Vision</span>';
    return;
  }

  badge.className = 'badge-s badge-blue';
  badge.textContent = 'Testing...';
  if (resultEl) resultEl.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i>Testing ' + cfg.provider + '...';

  try {
    // Simple test — for Gemini, try a hello prompt; for others try models endpoint
    let testOk = false;
    if (cfg.provider === 'gemini') {
      const testUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=' + encodeURIComponent(cfg.token);
      const r = await fetch(testUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: 'Reply with just OK' }] }], generationConfig: { maxOutputTokens: 5 } })
      });
      testOk = r.ok;
    } else {
      // Try a simple non-vision request
      const r = await fetch(cfg.url, {
        method: 'POST',
        headers: cfg.headers,
        body: JSON.stringify({ model: cfg.modelId, messages: [{ role: 'user', content: 'Reply with just OK' }], max_tokens: 5 })
      });
      testOk = r.ok || r.status === 400; // 400 can mean "valid key, bad request format"
    }

    if (testOk) {
      badge.className = 'badge-s badge-green';
      badge.textContent = cfg.provider + ' Ready';
      if (dot) dot.className = 'status-dot green';
      if (resultEl) resultEl.innerHTML = '<span style="color:var(--green)"><i class="fas fa-check-circle me-1"></i>' + cfg.provider + ' connected successfully</span>';
    } else {
      throw new Error('Connection failed');
    }
  } catch(e) {
    badge.className = 'badge-s badge-yellow';
    badge.textContent = 'Check Key';
    if (dot) dot.className = 'status-dot yellow';
    if (resultEl) resultEl.innerHTML = '<span style="color:var(--yellow)"><i class="fas fa-exclamation-triangle me-1"></i>Could not verify — key may still work for vision</span>';
  }
}

// ═══════════════════════════════════════
// AI VISION PARSE
// ═══════════════════════════════════════
async function qwenVisionParse(imageDataUrl, fileName) {
  const cfg = getProviderConfig();
  if (!cfg.token.trim()) throw new Error('No API key — enter a free ' + cfg.provider + ' key in AI Engine config');

  log('info', 'Resizing ' + fileName + ' for API...');
  const resized = await resizeImageForAPI(imageDataUrl, 1024);
  const payloadKB = Math.round(resized.length / 1024);
  const modelShort = cfg.modelId.split('/').pop();
  log('info', 'Image payload: ' + payloadKB + ' KB → sending to ' + cfg.provider + '/' + modelShort);

  const receiptPrompt = 'Analyze this receipt image carefully. Extract ALL visible information and return ONLY valid JSON with no markdown formatting, no backticks, no explanation — just the raw JSON object:\\n{"storeName":"store or vendor name","date":"date in MM/DD/YYYY format","lineItems":[{"item":"item description","cost":12.99}],"totalCost":45.67,"confidence":"high"}\\n\\nRules:\\n- Include EVERY line item visible on the receipt\\n- For totalCost use the receipt TOTAL or GRAND TOTAL amount\\n- If subtotal/tax/tip are visible, include them as separate line items\\n- Date format must be MM/DD/YYYY\\n- confidence: "high" if receipt is clear, "medium" if partially readable, "low" if poor quality\\n- cost values must be numbers not strings';

  let url = cfg.url;
  let body;
  if (cfg.provider === 'gemini') {
    const base64Data = resized.split(',')[1];
    const mimeType = resized.split(';')[0].split(':')[1] || 'image/jpeg';
    body = JSON.stringify({
      contents: [{ parts: [
        { inline_data: { mime_type: mimeType, data: base64Data } },
        { text: receiptPrompt }
      ]}],
      generationConfig: { maxOutputTokens: 2000, temperature: 0.1 }
    });
  } else {
    body = JSON.stringify({
      model: cfg.modelId,
      messages: [{ role: 'user', content: [
        { type: 'image_url', image_url: { url: resized } },
        { type: 'text', text: receiptPrompt }
      ]}],
      max_tokens: 2000, temperature: 0.1, stream: false
    });
  }

  log('info', 'POST ' + cfg.provider + ': ' + modelShort);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 90000);

  try {
    const resp = await fetch(url, { method: 'POST', headers: cfg.headers, body: body, signal: controller.signal });
    clearTimeout(timeout);

    if (!resp.ok) {
      const errBody = await resp.text();
      let errMsg = 'HTTP ' + resp.status;
      try { const ej = JSON.parse(errBody); errMsg += ': ' + (ej.error || ej.message || errBody.substring(0, 150)); } catch(e) { errMsg += ': ' + errBody.substring(0, 150); }
      throw new Error(errMsg);
    }

    const data = await resp.json();
    let content = '';
    if (cfg.provider === 'gemini') {
      content = (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts && data.candidates[0].content.parts[0] && data.candidates[0].content.parts[0].text) || '';
    } else {
      content = (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) || '';
    }
    log('info', cfg.provider + ' response (' + content.length + ' chars): ' + content.substring(0, 150).replace(/\\n/g, ' '));

    const rawEl = document.getElementById('ocr-raw');
    rawEl.textContent += '\\n\\n══ ' + fileName + ' (' + cfg.provider + ') ══\\n' + content;

    let jsonStr = content.replace(/\`\`\`json\\s*/gi, '').replace(/\`\`\`\\s*/g, '').trim();
    const jsonMatch = jsonStr.match(/\\{[\\s\\S]*\\}/);
    if (!jsonMatch) throw new Error('No JSON found in model response');

    const parsed = JSON.parse(jsonMatch[0]);
    const lineItemsRaw = parsed.lineItems || parsed.line_items || parsed.items || [];
    const result = {
      storeName: String(parsed.storeName || parsed.store_name || parsed.store || ''),
      date: String(parsed.date || parsed.receipt_date || ''),
      lineItems: Array.isArray(lineItemsRaw) ?
        lineItemsRaw.map(li => ({
          item: String(li.item || li.name || li.description || ''),
          cost: Math.round((parseFloat(li.cost || li.price || li.amount || 0) || 0) * 100) / 100
        })).filter(li => li.item || li.cost > 0) : [],
      totalCost: Math.round((parseFloat(parsed.totalCost || parsed.total_cost || parsed.total || 0) || 0) * 100) / 100,
      confidence: String(parsed.confidence || 'medium')
    };

    if (!result.totalCost && result.lineItems.length > 0) {
      result.totalCost = Math.round(result.lineItems.reduce((s, li) => s + li.cost, 0) * 100) / 100;
    }
    return result;
  } catch(e) {
    clearTimeout(timeout);
    throw e;
  }
}

// ═══════════════════════════════════════
// BENCHMARK
// ═══════════════════════════════════════
async function runBenchmark() {
  const cfg = getProviderConfig();
  if (!cfg.token.trim()) { alert('Enter an API key first!'); return; }

  const btn = document.getElementById('btn-benchmark');
  const resultsDiv = document.getElementById('benchmark-results');
  const statusEl = document.getElementById('benchmark-status');
  resultsDiv.style.display = 'block';
  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i>Running...';

  const allModels = {
    groq: [['meta-llama/llama-4-scout-17b-16e-instruct','Llama 4 Scout 17B'],['meta-llama/llama-4-maverick-17b-128e-instruct','Llama 4 Maverick 17B']],
    gemini: [['gemini-2.0-flash','Gemini 2.0 Flash'],['gemini-2.0-flash-lite','Gemini 2.0 Flash Lite'],['gemini-1.5-flash','Gemini 1.5 Flash']],
    openrouter: [['google/gemma-3-27b-it:free','Gemma 3 27B'],['mistralai/mistral-small-3.1-24b-instruct:free','Mistral 3.1 24B'],['google/gemma-3-12b-it:free','Gemma 3 12B'],['nvidia/nemotron-nano-12b-v2-vl:free','Nemotron 12B'],['google/gemma-3-4b-it:free','Gemma 3 4B']],
    sambanova: [['Llama-3.2-90B-Vision-Instruct','Llama 3.2 90B'],['Llama-3.2-11B-Vision-Instruct','Llama 3.2 11B']],
    together: [['meta-llama/Llama-Vision-Free','Llama Vision Free'],['meta-llama/Llama-3.2-11B-Vision-Instruct-Turbo','Llama 3.2 11B Turbo']],
    hyperbolic: [['Qwen/Qwen2.5-VL-72B-Instruct','Qwen2.5-VL 72B'],['Qwen/Qwen2.5-VL-7B-Instruct','Qwen2.5-VL 7B'],['meta-llama/Llama-3.2-90B-Vision-Instruct','Llama 3.2 90B']],
    cerebras: [['llama-3.2-11b-vision','Llama 3.2 11B']]
  };

  const models = allModels[cfg.provider] || [];
  const results = [];
  const testImage = await generateTestReceipt();
  const resized = await resizeImageForAPI(testImage, 1024);
  const payloadKB = Math.round(resized.length / 1024);
  log('info', 'BENCHMARK: Testing ' + models.length + ' models on ' + cfg.provider + ' (' + payloadKB + 'KB)');

  const receiptPrompt = 'Analyze this receipt image carefully. Extract ALL visible information and return ONLY valid JSON with no markdown formatting, no backticks, no explanation — just the raw JSON object:\\n{"storeName":"store or vendor name","date":"date in MM/DD/YYYY format","lineItems":[{"item":"item description","cost":12.99}],"totalCost":45.67,"confidence":"high"}\\n\\nRules:\\n- Include EVERY line item visible on the receipt\\n- For totalCost use the receipt TOTAL or GRAND TOTAL amount\\n- Date format must be MM/DD/YYYY\\n- confidence: "high" if receipt is clear, "medium" if partially readable, "low" if poor quality\\n- cost values must be numbers not strings';

  for (let i = 0; i < models.length; i++) {
    const [modelId, modelLabel] = models[i];
    statusEl.textContent = 'Testing ' + (i + 1) + '/' + models.length + ': ' + modelLabel + '...';
    const entry = { model: modelId, label: modelLabel, latency: 0, score: 0, fields: {}, error: null, raw: '' };

    try {
      let url, headers, body;
      if (cfg.provider === 'gemini') {
        url = 'https://generativelanguage.googleapis.com/v1beta/models/' + modelId + ':generateContent?key=' + encodeURIComponent(cfg.token.trim());
        headers = { 'Content-Type': 'application/json' };
        const base64Data = resized.split(',')[1];
        const mimeType = resized.split(';')[0].split(':')[1] || 'image/jpeg';
        body = JSON.stringify({ contents: [{ parts: [{ inline_data: { mime_type: mimeType, data: base64Data } }, { text: receiptPrompt }] }], generationConfig: { maxOutputTokens: 2000, temperature: 0.1 } });
      } else {
        url = cfg.url;
        headers = Object.assign({}, cfg.headers);
        body = JSON.stringify({ model: modelId, messages: [{ role: 'user', content: [{ type: 'image_url', image_url: { url: resized } }, { type: 'text', text: receiptPrompt }] }], max_tokens: 2000, temperature: 0.1, stream: false });
      }

      const t0 = performance.now();
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 60000);
      const resp = await fetch(url, { method: 'POST', headers, body, signal: controller.signal });
      clearTimeout(timeout);
      entry.latency = Math.round(performance.now() - t0);

      if (!resp.ok) {
        const errBody = await resp.text();
        entry.error = 'HTTP ' + resp.status + ': ' + errBody.substring(0, 100);
        log('err', 'BENCHMARK ' + modelLabel + ': ' + entry.error);
      } else {
        const data = await resp.json();
        let content = '';
        if (cfg.provider === 'gemini') { content = (data.candidates?.[0]?.content?.parts?.[0]?.text) || ''; }
        else { content = (data.choices?.[0]?.message?.content) || ''; }
        entry.raw = content.substring(0, 200);

        let jsonStr = content.replace(/\`\`\`json\\s*/gi, '').replace(/\`\`\`\\s*/g, '').trim();
        const jsonMatch = jsonStr.match(/\\{[\\s\\S]*\\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          entry.fields = {
            storeName: parsed.storeName || parsed.store_name || parsed.store || '',
            date: parsed.date || parsed.receipt_date || '',
            lineItems: (parsed.lineItems || parsed.line_items || parsed.items || []).length,
            totalCost: parseFloat(parsed.totalCost || parsed.total_cost || parsed.total || 0) || 0,
            confidence: parsed.confidence || ''
          };
          let score = 0;
          if (entry.fields.storeName && entry.fields.storeName.toLowerCase().includes('sunny')) score += 20;
          else if (entry.fields.storeName) score += 10;
          if (/\\d{2}\\/\\d{2}\\/\\d{4}/.test(entry.fields.date)) score += 20;
          else if (entry.fields.date) score += 10;
          if (entry.fields.lineItems >= 10) score += 30;
          else if (entry.fields.lineItems >= 6) score += 20;
          else if (entry.fields.lineItems >= 3) score += 10;
          if (Math.abs(entry.fields.totalCost - 63.97) < 1) score += 20;
          else if (entry.fields.totalCost > 0) score += 10;
          if (entry.fields.confidence === 'high') score += 10;
          else if (entry.fields.confidence) score += 5;
          entry.score = score;
          log('ok', 'BENCHMARK ' + modelLabel + ': score=' + score + ', ' + entry.latency + 'ms, items=' + entry.fields.lineItems);
        } else {
          entry.error = 'No JSON found in response';
          log('warn', 'BENCHMARK ' + modelLabel + ': ' + entry.error);
        }
      }
    } catch (e) {
      entry.error = e.name === 'AbortError' ? 'Timeout (60s)' : e.message;
      log('err', 'BENCHMARK ' + modelLabel + ': ' + entry.error);
    }

    results.push(entry);
    renderBenchmarkTable(results);
    if (i < models.length - 1) await new Promise(r => setTimeout(r, 1500));
  }

  statusEl.innerHTML = '<span style="color:var(--green)">Complete! ' + results.length + ' models tested</span>';
  btn.disabled = false;
  btn.innerHTML = '<i class="fas fa-play me-1"></i>Run Benchmark';
  log('ok', 'BENCHMARK COMPLETE: ' + results.filter(r => !r.error).length + '/' + results.length + ' succeeded');

  const best = results.filter(r => !r.error).sort((a, b) => b.score - a.score || a.latency - b.latency)[0];
  if (best) {
    log('ok', 'Best model: ' + best.label + ' (score=' + best.score + ', ' + best.latency + 'ms)');
    const modelSel = document.getElementById('hf-model');
    for (let i = 0; i < modelSel.options.length; i++) {
      if (modelSel.options[i].value === best.model) { modelSel.selectedIndex = i; localStorage.setItem('banf_ai_model_' + cfg.provider, best.model); break; }
    }
  }
}

function renderBenchmarkTable(results) {
  const sorted = [...results].sort((a, b) => b.score - a.score || a.latency - b.latency);
  let html = '<table style="width:100%;border-collapse:collapse;font-size:.72rem">';
  html += '<tr style="background:var(--bg2);color:var(--muted);text-transform:uppercase">';
  html += '<th style="padding:6px 8px;text-align:left;border-bottom:1px solid var(--line)">#</th>';
  html += '<th style="padding:6px 8px;text-align:left;border-bottom:1px solid var(--line)">Model</th>';
  html += '<th style="padding:6px 8px;text-align:center;border-bottom:1px solid var(--line)">Score</th>';
  html += '<th style="padding:6px 8px;text-align:right;border-bottom:1px solid var(--line)">Latency</th>';
  html += '<th style="padding:6px 8px;text-align:center;border-bottom:1px solid var(--line)">Store</th>';
  html += '<th style="padding:6px 8px;text-align:center;border-bottom:1px solid var(--line)">Date</th>';
  html += '<th style="padding:6px 8px;text-align:center;border-bottom:1px solid var(--line)">Items</th>';
  html += '<th style="padding:6px 8px;text-align:right;border-bottom:1px solid var(--line)">Total</th>';
  html += '<th style="padding:6px 8px;text-align:left;border-bottom:1px solid var(--line)">Status</th>';
  html += '</tr>';

  sorted.forEach((r, i) => {
    const rank = i + 1;
    const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : rank;
    const scoreColor = r.score >= 80 ? 'var(--green)' : r.score >= 50 ? 'var(--yellow)' : r.score > 0 ? 'var(--accent)' : 'var(--red)';
    const latencyColor = r.latency < 3000 ? 'var(--green)' : r.latency < 8000 ? 'var(--yellow)' : 'var(--red)';
    html += '<tr style="border-bottom:1px solid rgba(255,255,255,.05)">';
    html += '<td style="padding:5px 8px">' + medal + '</td>';
    html += '<td style="padding:5px 8px;color:#fff;font-weight:500">' + r.label + '</td>';
    html += '<td style="padding:5px 8px;text-align:center;color:' + scoreColor + ';font-weight:700">' + r.score + '/100</td>';
    html += '<td style="padding:5px 8px;text-align:right;color:' + latencyColor + '">' + (r.latency ? (r.latency / 1000).toFixed(1) + 's' : '—') + '</td>';
    html += '<td style="padding:5px 8px;text-align:center">' + (r.fields.storeName ? '✅' : (r.error ? '❌' : '—')) + '</td>';
    html += '<td style="padding:5px 8px;text-align:center">' + (r.fields.date ? '✅' : (r.error ? '❌' : '—')) + '</td>';
    html += '<td style="padding:5px 8px;text-align:center">' + (r.fields.lineItems > 0 ? r.fields.lineItems : (r.error ? '❌' : '—')) + '</td>';
    html += '<td style="padding:5px 8px;text-align:right">' + (r.fields.totalCost > 0 ? '$' + r.fields.totalCost.toFixed(2) : (r.error ? '❌' : '—')) + '</td>';
    html += '<td style="padding:5px 8px;color:' + (r.error ? 'var(--red)' : 'var(--green)') + '">' + (r.error || '✅ OK') + '</td>';
    html += '</tr>';
  });

  html += '</table>';
  document.getElementById('benchmark-table').innerHTML = html;
}

function generateTestReceipt() {
  return new Promise(resolve => {
    const c = document.createElement('canvas');
    c.width = 400; c.height = 600;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, 400, 600);
    ctx.fillStyle = '#000'; ctx.font = 'bold 22px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('SUNNY MART', 200, 40);
    ctx.font = '13px monospace'; ctx.textAlign = 'left';
    ctx.fillText('123 Main Street, Anytown', 40, 70);
    ctx.fillText('Date: 06/15/2025', 40, 95);
    ctx.fillText('Receipt #: 4821', 40, 115);
    ctx.fillText('\\u2500'.repeat(35), 40, 140);
    const items = [['Organic Milk 1gal',5.99],['Whole Wheat Bread',4.49],['Fresh Bananas 2lb',3.28],['Chicken Breast 3lb',14.97],['Cheddar Cheese 8oz',6.49],['Pasta Sauce 24oz',3.99],['Spaghetti 16oz',2.29],['Mixed Salad Bag',4.99],['Orange Juice 64oz',5.99],['Greek Yogurt 4pk',6.48]];
    let y = 165;
    items.forEach(([name, price]) => {
      ctx.fillText(name, 40, y);
      ctx.textAlign = 'right'; ctx.fillText('$' + price.toFixed(2), 360, y); ctx.textAlign = 'left';
      y += 22;
    });
    y += 5;
    ctx.fillText('\\u2500'.repeat(35), 40, y); y += 25;
    ctx.font = '14px monospace';
    ctx.fillText('Subtotal:', 40, y); ctx.textAlign = 'right'; ctx.fillText('$58.96', 360, y); ctx.textAlign = 'left'; y += 22;
    ctx.fillText('Tax (8.5%):', 40, y); ctx.textAlign = 'right'; ctx.fillText('$5.01', 360, y); ctx.textAlign = 'left'; y += 22;
    ctx.fillText('\\u2500'.repeat(35), 40, y); y += 25;
    ctx.font = 'bold 16px monospace';
    ctx.fillText('TOTAL:', 40, y); ctx.textAlign = 'right'; ctx.fillText('$63.97', 360, y); ctx.textAlign = 'left'; y += 30;
    ctx.font = '12px monospace';
    ctx.fillText('VISA **** 4821', 40, y); y += 20;
    ctx.fillText('Thank you for shopping!', 40, y);
    resolve(c.toDataURL('image/jpeg', 0.92));
  });
}

// ═══════════════════════════════════════
// RECEIPT DROP / FILE HANDLER
// ═══════════════════════════════════════
function handleReceiptDrop(event) {
  event.preventDefault();
  handleReceiptFiles(event.dataTransfer.files);
}

async function handleReceiptFiles(files) {
  if (!files || files.length === 0) return;

  const container = document.getElementById('rmb-receipts-container');
  container.style.display = 'block';
  document.getElementById('rmb-payment-info').style.display = 'block';
  const thumbRow = document.getElementById('thumb-row');
  thumbRow.style.display = 'flex';

  renderPipeline(1);
  log('info', 'Processing ' + files.length + ' file(s)...');

  for (const file of files) {
    RMB_RECEIPT_COUNTER++;
    const receiptId = 'receipt-' + RMB_RECEIPT_COUNTER;
    const isImage = file.type.startsWith('image/');
    const isPdf = file.type === 'application/pdf';

    addReceiptCard(receiptId, file.name, file.type, 'parsing');
    log('info', '<i class="fas fa-file me-1"></i>Processing: ' + file.name + ' (' + (file.size / 1024).toFixed(1) + ' KB)');

    if (isImage) {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const imgUrl = e.target.result;
          uploadedImageDataUrls.push({ id: receiptId, url: imgUrl, name: file.name });
          const thumb = document.createElement('img');
          thumb.src = imgUrl; thumb.className = 'thumb-img'; thumb.title = file.name;
          thumb.onclick = () => { document.getElementById('imgModalSrc').src = imgUrl; document.getElementById('imgModal').classList.add('show'); };
          thumbRow.appendChild(thumb);

          const aiCfg = getProviderConfig();
          updateReceiptStatus(receiptId, 'running', 'Sending to ' + aiCfg.provider + '/' + aiCfg.modelId.split('/').pop() + '...');
          log('warn', '<i class="fas fa-robot me-1"></i>AI Vision analyzing ' + file.name + ' via ' + aiCfg.provider + '...');

          const startTime = Date.now();
          let parsed, engine = 'qwen';

          try {
            parsed = await qwenVisionParse(imgUrl, file.name);
            const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
            log('ok', '<i class="fas fa-robot me-1"></i>AI Vision parsed ' + file.name + ' in ' + elapsed + 's — store="' + parsed.storeName + '" items=' + parsed.lineItems.length + ' total=$' + parsed.totalCost + ' [' + parsed.confidence + ']');
          } catch(qwenErr) {
            engine = 'tesseract';
            log('warn', '<i class="fas fa-exclamation-triangle me-1"></i>AI Vision failed: ' + qwenErr.message.substring(0, 80));
            log('info', 'Falling back to Tesseract.js OCR...');
            updateReceiptStatus(receiptId, 'running', 'AI Vision failed — running Tesseract OCR...');
            const text = await ocrImage(imgUrl);
            const rawEl = document.getElementById('ocr-raw');
            rawEl.textContent += '\\n\\n══ ' + file.name + ' (Tesseract fallback) ══\\n' + text;
            const elapsed2 = ((Date.now() - startTime) / 1000).toFixed(1);
            log('info', 'Tesseract OCR done (' + elapsed2 + 's, ' + text.length + ' chars)');
            parsed = parseReceiptText(text);
            log('info', 'Regex parsed: store="' + parsed.storeName + '" items=' + parsed.lineItems.length + ' total=$' + parsed.totalCost);
          }

          parsed.engine = engine;
          populateReceiptCard(receiptId, parsed, file.name, file.type);
          updateKPIs();
        } catch(err) {
          log('err', 'All engines failed for ' + file.name + ': ' + err.message);
          updateReceiptStatus(receiptId, 'failed', 'Parse failed: ' + err.message);
          populateReceiptCard(receiptId, { storeName: '', date: '', lineItems: [], totalCost: 0, confidence: 'manual' }, file.name, file.type);
        }
      };
      reader.readAsDataURL(file);
    } else if (isPdf) {
      updateReceiptStatus(receiptId, 'manual', 'PDF detected — please fill in details manually');
      log('warn', 'PDF for ' + file.name + ' — manual entry required');
      populateReceiptCard(receiptId, { storeName: '', date: '', lineItems: [{ item: '', cost: 0 }], totalCost: 0, confidence: 'manual' }, file.name, file.type);
    } else {
      updateReceiptStatus(receiptId, 'manual', 'Document detected — please fill in manually');
      log('warn', 'Non-image: ' + file.name + ' — manual entry');
      populateReceiptCard(receiptId, { storeName: '', date: '', lineItems: [{ item: '', cost: 0 }], totalCost: 0, confidence: 'manual' }, file.name, file.type);
    }
  }

  renderPipeline(2);
}

// ═══════════════════════════════════════
// RECEIPT CARD BUILDERS
// ═══════════════════════════════════════
function addReceiptCard(id, fileName, fileType, status) {
  const list = document.getElementById('rmb-receipts-list');
  const card = document.createElement('div');
  card.id = id;
  card.style.cssText = 'background:var(--bg2);border:1px solid var(--line);border-radius:10px;padding:14px;margin-bottom:10px;';
  card.innerHTML = '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">' +
    '<div style="display:flex;align-items:center;gap:8px"><i class="fas fa-file-alt" style="color:var(--accent)"></i><strong style="font-size:.82rem">' + fileName + '</strong></div>' +
    '<div class="receipt-status" style="font-size:.72rem;color:var(--yellow)"><i class="fas fa-spinner fa-spin me-1"></i>Parsing...</div>' +
    '</div><div class="receipt-form" style="display:none"></div>';
  list.appendChild(card);
  updateReceiptCount();
  updateKPIs();
}

function updateReceiptStatus(id, status, msg) {
  const card = document.getElementById(id);
  if (!card) return;
  const statusEl = card.querySelector('.receipt-status');
  const colors = { parsing: 'var(--yellow)', running: 'var(--cyan)', done: 'var(--green)', failed: 'var(--red)', manual: 'var(--purple)' };
  const icons = { parsing: 'fa-spinner fa-spin', running: 'fa-brain', done: 'fa-check-circle', failed: 'fa-exclamation-triangle', manual: 'fa-edit' };
  statusEl.style.color = colors[status] || 'var(--dim)';
  statusEl.innerHTML = '<i class="fas ' + (icons[status] || 'fa-circle') + ' me-1"></i>' + (msg || status);
}

function populateReceiptCard(id, parsed, fileName, fileType) {
  const card = document.getElementById(id);
  if (!card) return;
  updateReceiptStatus(id, 'done', 'Confidence: ' + (parsed.confidence || 'manual').toUpperCase());

  const formEl = card.querySelector('.receipt-form');
  formEl.style.display = 'block';

  const confBadge = parsed.confidence === 'high' ? 'badge-green' : parsed.confidence === 'medium' ? 'badge-yellow' : 'badge-red';
  const engineLabel = parsed.engine === 'qwen' ? 'AI Vision ' : parsed.engine === 'tesseract' ? 'Tesseract ' : 'AI ';

  let lineItemsHtml = '';
  if (parsed.lineItems.length === 0) parsed.lineItems = [{ item: '', cost: 0 }];
  parsed.lineItems.forEach((li, i) => {
    lineItemsHtml += '<div class="line-item-row" style="display:flex;gap:8px;margin-bottom:6px;align-items:center">' +
      '<input type="text" class="li-item" value="' + (li.item || '').replace(/"/g, '&quot;') + '" placeholder="Item name" style="flex:2;padding:6px 10px;border-radius:6px;border:1px solid var(--line);background:var(--card);color:#fff;font-size:.8rem">' +
      '<input type="number" class="li-cost" value="' + (li.cost || 0) + '" placeholder="Cost" step="0.01" min="0" style="width:100px;padding:6px 10px;border-radius:6px;border:1px solid var(--line);background:var(--card);color:#fff;font-size:.8rem" onchange="recalcReceiptTotal(\\'' + id + '\\')">' +
      '<button onclick="this.parentElement.remove();recalcReceiptTotal(\\'' + id + '\\')" style="background:none;border:none;color:var(--red);cursor:pointer;font-size:.8rem" title="Remove"><i class="fas fa-trash-alt"></i></button>' +
      '</div>';
  });

  formEl.innerHTML =
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px">' +
    '<div><label class="form-label-sm">Store Name</label><input type="text" class="r-store form-input" value="' + (parsed.storeName || '').replace(/"/g, '&quot;') + '" placeholder="Store / vendor name"></div>' +
    '<div><label class="form-label-sm">Date</label><input type="text" class="r-date form-input" value="' + (parsed.date || '') + '" placeholder="MM/DD/YYYY"></div>' +
    '</div>' +
    '<div style="margin-bottom:8px"><label class="form-label-sm">Line Items <span class="badge-s ' + confBadge + '" style="margin-left:6px">' + engineLabel + (parsed.confidence || 'manual') + '</span></label>' +
    '<div class="line-items-container">' + lineItemsHtml + '</div>' +
    '<button onclick="addLineItem(\\'' + id + '\\')" style="background:none;border:1px dashed var(--line2);color:var(--accent);padding:4px 12px;border-radius:6px;font-size:.72rem;cursor:pointer;margin-top:4px"><i class="fas fa-plus me-1"></i>Add Line Item</button>' +
    '</div>' +
    '<div style="display:flex;justify-content:space-between;align-items:center;padding-top:8px;border-top:1px solid var(--line)">' +
    '<div style="display:flex;align-items:center;gap:6px"><label style="font-size:.72rem;color:var(--muted)">TOTAL:</label>' +
    '<input type="number" class="r-total" value="' + (parsed.totalCost || 0) + '" step="0.01" min="0" style="width:120px;padding:6px 10px;border-radius:6px;border:1px solid var(--accent);background:var(--card);color:var(--green);font-size:.9rem;font-weight:700" onchange="updateRmbSummary();updateKPIs()"></div>' +
    '<button onclick="confirmReceipt(\\'' + id + '\\')" class="btn-receipt-confirm" style="background:linear-gradient(135deg,var(--green),#16a34a);color:#fff;border:none;padding:6px 16px;border-radius:6px;font-size:.78rem;font-weight:600;cursor:pointer"><i class="fas fa-check me-1"></i>Confirm Receipt</button>' +
    '</div>';

  card.dataset.fileName = fileName;
  card.dataset.fileType = fileType;
  card.dataset.confidence = parsed.confidence || 'manual';
  card.dataset.confirmed = 'false';
  card.dataset.aiParsed = (parsed.engine === 'qwen') ? 'true' : 'false';

  updateRmbSummary();
  updateKPIs();
}

function addLineItem(receiptId) {
  const card = document.getElementById(receiptId);
  if (!card) return;
  const container = card.querySelector('.line-items-container');
  const row = document.createElement('div');
  row.className = 'line-item-row';
  row.style.cssText = 'display:flex;gap:8px;margin-bottom:6px;align-items:center';
  row.innerHTML = '<input type="text" class="li-item" value="" placeholder="Item name" style="flex:2;padding:6px 10px;border-radius:6px;border:1px solid var(--line);background:var(--card);color:#fff;font-size:.8rem">' +
    '<input type="number" class="li-cost" value="0" placeholder="Cost" step="0.01" min="0" style="width:100px;padding:6px 10px;border-radius:6px;border:1px solid var(--line);background:var(--card);color:#fff;font-size:.8rem" onchange="recalcReceiptTotal(\\'' + receiptId + '\\')">' +
    '<button onclick="this.parentElement.remove();recalcReceiptTotal(\\'' + receiptId + '\\')" style="background:none;border:none;color:var(--red);cursor:pointer;font-size:.8rem" title="Remove"><i class="fas fa-trash-alt"></i></button>';
  container.appendChild(row);
}

function recalcReceiptTotal(receiptId) {
  const card = document.getElementById(receiptId);
  if (!card) return;
  const costs = card.querySelectorAll('.li-cost');
  let sum = 0;
  costs.forEach(c => { sum += parseFloat(c.value) || 0; });
  const totalInput = card.querySelector('.r-total');
  if (totalInput) totalInput.value = sum.toFixed(2);
  updateRmbSummary();
  updateKPIs();
}

function confirmReceipt(receiptId) {
  const card = document.getElementById(receiptId);
  if (!card) return;
  card.dataset.confirmed = 'true';
  card.style.borderColor = 'var(--green)';
  const btn = card.querySelector('.btn-receipt-confirm');
  if (btn) {
    btn.innerHTML = '<i class="fas fa-check-double me-1"></i>Confirmed';
    btn.style.background = 'rgba(34,197,94,.2)';
    btn.style.color = 'var(--green)';
    btn.style.cursor = 'default';
  }
  updateReceiptStatus(receiptId, 'done', 'Confirmed ✓');
  updateRmbSummary();
  updateKPIs();
  log('ok', 'Receipt ' + receiptId + ' confirmed');

  const allCards = document.querySelectorAll('#rmb-receipts-list > div');
  let allDone = true;
  allCards.forEach(c => { if (c.dataset.confirmed !== 'true') allDone = false; });
  if (allDone && allCards.length > 0) {
    renderPipeline(3);
    log('ok', '<i class="fas fa-check-double me-1"></i>All ' + allCards.length + ' receipts confirmed — ready to submit!');
  }
}

function addMissingReceipt() {
  RMB_RECEIPT_COUNTER++;
  const id = 'receipt-' + RMB_RECEIPT_COUNTER;
  const list = document.getElementById('rmb-receipts-list');
  const card = document.createElement('div');
  card.id = id;
  card.style.cssText = 'background:var(--bg2);border:2px solid rgba(234,179,8,.3);border-radius:10px;padding:14px;margin-bottom:10px;';
  card.innerHTML = '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">' +
    '<div style="display:flex;align-items:center;gap:8px"><i class="fas fa-exclamation-triangle" style="color:var(--yellow)"></i><strong style="font-size:.82rem;color:var(--yellow)">Missing Receipt Entry</strong></div>' +
    '<div class="receipt-status" style="font-size:.72rem;color:var(--yellow)"><i class="fas fa-edit me-1"></i>Manual Entry</div>' +
    '</div><div class="receipt-form"></div>';
  card.dataset.fileName = 'MISSING_RECEIPT';
  card.dataset.fileType = 'missing';
  card.dataset.confidence = 'manual';
  card.dataset.confirmed = 'false';
  card.dataset.missing = 'true';
  card.dataset.aiParsed = 'false';
  list.appendChild(card);

  const formEl = card.querySelector('.receipt-form');
  formEl.style.display = 'block';
  formEl.innerHTML =
    '<div style="background:rgba(234,179,8,.06);border:1px solid rgba(234,179,8,.2);border-radius:8px;padding:10px;margin-bottom:10px;font-size:.78rem;color:var(--yellow)">' +
    '<i class="fas fa-info-circle me-1"></i><strong>Missing Receipt:</strong> Please explain why the receipt is unavailable and provide purchase details.' +
    '</div>' +
    '<div style="margin-bottom:10px"><label class="form-label-sm">Why is the receipt missing?</label>' +
    '<textarea class="r-missing-reason form-textarea" rows="2" placeholder="e.g., Lost receipt, online purchase without receipt, cash purchase..."></textarea></div>' +
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px">' +
    '<div><label class="form-label-sm">Store Name</label><input type="text" class="r-store form-input" value="" placeholder="Store / vendor name"></div>' +
    '<div><label class="form-label-sm">Date</label><input type="text" class="r-date form-input" value="" placeholder="MM/DD/YYYY"></div>' +
    '</div>' +
    '<div style="margin-bottom:8px"><label class="form-label-sm">Line Items</label>' +
    '<div class="line-items-container"><div class="line-item-row" style="display:flex;gap:8px;margin-bottom:6px;align-items:center">' +
    '<input type="text" class="li-item" value="" placeholder="Item name" style="flex:2;padding:6px 10px;border-radius:6px;border:1px solid var(--line);background:var(--card);color:#fff;font-size:.8rem">' +
    '<input type="number" class="li-cost" value="0" placeholder="Cost" step="0.01" min="0" style="width:100px;padding:6px 10px;border-radius:6px;border:1px solid var(--line);background:var(--card);color:#fff;font-size:.8rem" onchange="recalcReceiptTotal(\\'' + id + '\\')">' +
    '<button onclick="this.parentElement.remove();recalcReceiptTotal(\\'' + id + '\\')" style="background:none;border:none;color:var(--red);cursor:pointer;font-size:.8rem" title="Remove"><i class="fas fa-trash-alt"></i></button></div></div>' +
    '<button onclick="addLineItem(\\'' + id + '\\')" style="background:none;border:1px dashed var(--line2);color:var(--accent);padding:4px 12px;border-radius:6px;font-size:.72rem;cursor:pointer;margin-top:4px"><i class="fas fa-plus me-1"></i>Add Line Item</button></div>' +
    '<div style="display:flex;justify-content:space-between;align-items:center;padding-top:8px;border-top:1px solid var(--line)">' +
    '<div style="display:flex;align-items:center;gap:6px"><label style="font-size:.72rem;color:var(--muted)">TOTAL:</label>' +
    '<input type="number" class="r-total" value="0" step="0.01" min="0" style="width:120px;padding:6px 10px;border-radius:6px;border:1px solid var(--accent);background:var(--card);color:var(--green);font-size:.9rem;font-weight:700" onchange="updateRmbSummary();updateKPIs()"></div>' +
    '<button onclick="confirmReceipt(\\'' + id + '\\')" class="btn-receipt-confirm" style="background:linear-gradient(135deg,var(--green),#16a34a);color:#fff;border:none;padding:6px 16px;border-radius:6px;font-size:.78rem;font-weight:600;cursor:pointer"><i class="fas fa-check me-1"></i>Confirm Receipt</button></div>';

  document.getElementById('rmb-receipts-container').style.display = 'block';
  document.getElementById('rmb-payment-info').style.display = 'block';
  updateReceiptCount();
  updateRmbSummary();
  updateKPIs();
  log('info', 'Added missing receipt entry #' + RMB_RECEIPT_COUNTER);
}

function updateReceiptCount() {
  const el = document.getElementById('rmb-receipt-count');
  const count = document.querySelectorAll('#rmb-receipts-list > div').length;
  if (el) el.textContent = '(' + count + ')';
}

function updateRmbSummary() {
  const cards = document.querySelectorAll('#rmb-receipts-list > div');
  let total = 0;
  cards.forEach(card => {
    const totalInput = card.querySelector('.r-total');
    if (totalInput) total += parseFloat(totalInput.value) || 0;
  });
  const el = document.getElementById('rmb-total-amount');
  if (el) el.textContent = '$' + total.toFixed(2);
  const rc = document.getElementById('rmb-total-receipts');
  if (rc) rc.textContent = cards.length;
}

// ═══════════════════════════════════════
// KPI DASHBOARD UPDATES
// ═══════════════════════════════════════
function updateKPIs() {
  const cards = document.querySelectorAll('#rmb-receipts-list > div');
  let total = 0, confirmed = 0, aiParsed = 0;
  cards.forEach(card => {
    const t = card.querySelector('.r-total');
    if (t) total += parseFloat(t.value) || 0;
    if (card.dataset.confirmed === 'true') confirmed++;
    if (card.dataset.aiParsed === 'true') aiParsed++;
  });
  document.getElementById('kpi-submitted').textContent = cards.length;
  document.getElementById('kpi-ai-parsed').textContent = aiParsed;
  document.getElementById('kpi-confirmed').textContent = confirmed;
  document.getElementById('kpi-total').textContent = '$' + total.toFixed(2);
}

// ═══════════════════════════════════════
// SUBMIT REIMBURSEMENT
// ═══════════════════════════════════════
async function submitReimbursement() {
  const eventId = document.getElementById('rmb-event').value;
  const paidBy = document.getElementById('rmb-paid-by').value;
  const budgetApprover = document.getElementById('rmb-budget-approver').value;
  const notes = document.getElementById('rmb-notes').value.trim();
  const reqName = document.getElementById('req-name').value.trim();
  const reqEmail = document.getElementById('req-email').value.trim();
  const msgEl = document.getElementById('rmb-submit-msg');

  if (!eventId) { showMsg(msgEl, 'red', 'Please select an event.'); log('err', 'Submit blocked: no event'); return; }
  if (!reqName || !reqEmail) { showMsg(msgEl, 'red', 'Please enter your name and email.'); log('err', 'Submit blocked: missing requester info'); return; }

  const receiptCards = document.querySelectorAll('#rmb-receipts-list > div');
  if (receiptCards.length === 0) { showMsg(msgEl, 'red', 'Please upload at least one receipt.'); log('err', 'Submit blocked: no receipts'); return; }

  const receipts = [];
  let allConfirmed = true;
  receiptCards.forEach(card => {
    if (card.dataset.confirmed !== 'true') allConfirmed = false;
    const store = (card.querySelector('.r-store') || {}).value || '';
    const date = (card.querySelector('.r-date') || {}).value || '';
    const totalCost = parseFloat((card.querySelector('.r-total') || {}).value) || 0;
    const liItems = card.querySelectorAll('.li-item');
    const liCosts = card.querySelectorAll('.li-cost');
    const lineItems = [];
    liItems.forEach((el, i) => {
      const item = el.value.trim();
      const cost = parseFloat(liCosts[i] ? liCosts[i].value : 0) || 0;
      if (item || cost > 0) lineItems.push({ item: item || 'Item', cost });
    });
    receipts.push({
      storeName: store, date: date, lineItems, totalCost,
      receiptMissing: card.dataset.missing === 'true',
      missingReason: (card.querySelector('.r-missing-reason') || {}).value || '',
      fileName: card.dataset.fileName || '', fileType: card.dataset.fileType || '',
      parseConfidence: card.dataset.confidence || 'manual'
    });
  });

  if (!allConfirmed) { showMsg(msgEl, 'yellow', 'Please confirm all receipts before submitting.'); log('warn', 'Submit blocked: unconfirmed receipts'); return; }

  showMsg(msgEl, 'accent', '<i class="fas fa-spinner fa-spin me-1"></i>Creating reimbursement ticket...');
  log('info', '<i class="fas fa-paper-plane me-1"></i>Submitting ' + receipts.length + ' receipts to production...');

  const payload = {
    adminKey: ADMIN_KEY, requester: reqEmail, requesterName: reqName,
    eventId: eventId, receipts: receipts, paidBy: paidBy,
    budgetApprover: budgetApprover, notes: notes
  };

  log('info', 'POST ' + API + '/reimbursement_create');

  try {
    const resp = await fetch(API + '/reimbursement_create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const result = await resp.json();

    if (result && result.success) {
      showMsg(msgEl, 'green', '<i class="fas fa-check-circle me-1"></i>Ticket <strong>' + result.id + '</strong> created! Total: <strong>$' + result.totalAmount.toFixed(2) + '</strong> — Pending Treasurer approval.');
      log('ok', 'SUCCESS! Ticket ' + result.id + ' created — $' + result.totalAmount.toFixed(2));
      renderPipeline(4);
      document.getElementById('btn-submit').disabled = true;
      document.getElementById('btn-submit').style.opacity = '0.5';
      document.getElementById('btn-submit').innerHTML = '<i class="fas fa-check-double me-1"></i>Ticket Submitted Successfully';
    } else {
      showMsg(msgEl, 'red', '<i class="fas fa-times-circle me-1"></i>' + (result.error || 'Submission failed'));
      log('err', 'API error: ' + JSON.stringify(result));
    }
  } catch(e) {
    showMsg(msgEl, 'red', '<i class="fas fa-times-circle me-1"></i>Network error: ' + e.message);
    log('err', 'Network error: ' + e.message);
  }
}

function showMsg(el, color, html) {
  if (!el) return;
  el.style.display = 'block';
  el.style.color = 'var(--' + color + ')';
  el.innerHTML = html;
}

// ═══════════════════════════════════════
// INIT
// ═══════════════════════════════════════
async function init() {
  log('info', 'BANF Reimbursement Portal v5.17 — AI Vision + Auth Gate');
  log('info', 'Logged in as: ' + (currentUser ? currentUser.name + ' (' + currentUser.role + ')' : 'unknown'));
  renderPipeline(0);

  // Restore saved AI provider
  const savedProvider = localStorage.getItem('banf_ai_provider');
  if (savedProvider) {
    const sel = document.getElementById('ai-provider');
    for (let i = 0; i < sel.options.length; i++) {
      if (sel.options[i].value === savedProvider) { sel.selectedIndex = i; break; }
    }
  }
  switchProvider();

  // Check production API
  try {
    const r = await fetch(API + '/health');
    if (r.ok) {
      const h = await r.json();
      log('ok', 'Production API online: ' + (h.version || 'ok'));
      document.getElementById('dot-api').className = 'status-dot green';
      document.getElementById('topBarVersion').textContent = h.version || 'v5.17';
    } else { throw new Error('HTTP ' + r.status); }
  } catch(e) {
    log('warn', 'Production API check failed: ' + e.message);
    document.getElementById('dot-api').className = 'status-dot red';
  }

  // Refresh AI status
  await refreshAIStatus();

  // Load Tesseract
  if (typeof Tesseract !== 'undefined') {
    log('ok', 'Tesseract.js loaded');
    document.getElementById('dot-tesseract').className = 'status-dot green';
  } else {
    log('warn', 'Tesseract.js not available');
    document.getElementById('dot-tesseract').className = 'status-dot red';
  }

  // Fetch events
  try {
    const r = await fetch(API + '/event_list?adminKey=' + ADMIN_KEY);
    if (r.ok) {
      const data = await r.json();
      const events = data.events || data || [];
      const sel = document.getElementById('rmb-event');
      sel.innerHTML = '<option value="">— Select an event —</option>';
      events.forEach(ev => {
        const opt = document.createElement('option');
        opt.value = ev._id || ev.slug || ev.title;
        opt.textContent = ev.title + (ev.date ? ' (' + ev.date + ')' : '');
        sel.appendChild(opt);
      });
      log('ok', 'Loaded ' + events.length + ' events');
      document.getElementById('dot-events').className = 'status-dot green';
      document.getElementById('event-count').textContent = events.length + ' events';
    } else { throw new Error('HTTP ' + r.status); }
  } catch(e) {
    log('warn', 'Event fetch failed: ' + e.message + ' — using fallback');
    document.getElementById('dot-events').className = 'status-dot yellow';
    const fallback = [
      { id: 'bosonto-2026', title: 'Bosonto 2026' },
      { id: 'holi-2026', title: 'Holi 2026' },
      { id: 'bengali-new-year-2026', title: 'Bengali New Year 1433' },
      { id: 'rabindra-jayanti-2026', title: 'Rabindra Jayanti 2026' },
      { id: 'summer-picnic-2026', title: 'Summer Picnic 2026' },
      { id: 'durga-puja-2026', title: 'Durga Puja 2026' },
      { id: 'kali-puja-2026', title: 'Kali Puja 2026' },
      { id: 'christmas-party-2026', title: 'Christmas Party 2026' },
      { id: 'saraswati-puja-2027', title: 'Saraswati Puja 2027' },
      { id: 'republic-day-2027', title: 'Republic Day 2027' },
      { id: 'general-operations', title: 'General Operations' },
      { id: 'website-tech', title: 'Website & Technology' },
      { id: 'marketing-outreach', title: 'Marketing & Outreach' },
      { id: 'community-service', title: 'Community Service' },
      { id: 'membership-drive', title: 'Membership Drive 2026-27' },
      { id: 'food-supplies', title: 'Food & Supplies (General)' },
      { id: 'other', title: 'Other (specify in notes)' }
    ];
    const sel = document.getElementById('rmb-event');
    sel.innerHTML = '<option value="">— Select an event —</option>';
    fallback.forEach(ev => {
      const opt = document.createElement('option');
      opt.value = ev.id; opt.textContent = ev.title;
      sel.appendChild(opt);
    });
    document.getElementById('event-count').textContent = fallback.length + ' events';
  }

  log('ok', 'Portal ready — navigate using the sidebar');
}

// ═══════════════════════════════════════
// BOOT — Check existing session or show login
// ═══════════════════════════════════════
if (!checkExistingSession()) {
  // Show login overlay (already visible by default)
  document.getElementById('login-email').focus();
}
</script>
</body>
</html>
`; }
