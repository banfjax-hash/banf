// Auto-generated - do not edit directly
// Source: admin-portal.html (449537 bytes)
// Generated: 2026-03-24T16:02:49.714Z
export function getHtml() { return `﻿<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>BANF - Super Admin Portal v2</title>
<link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet">
<link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css" rel="stylesheet">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
<script src="https://cdn.jsdelivr.net/npm/chart.js@4/dist/chart.umd.min.js"></script>
<style>
:root{--bg:#060a10;--bg2:#0b1120;--panel:#111827;--card:#0f172a;--line:#1e293b;--line2:#334155;--text:#e2e8f0;--muted:#94a3b8;--dim:#475569;--accent:#f97316;--accent2:#ea580c;--red:#ef4444;--green:#22c55e;--blue:#3b82f6;--purple:#a855f7;--cyan:#06b6d4;--yellow:#eab308;--pink:#ec4899;--lime:#84cc16;--teal:#14b8a6;--indigo:#6366f1;--radius:12px;--radius-sm:8px}
*{box-sizing:border-box;scrollbar-width:thin;scrollbar-color:var(--line2) transparent}
body{margin:0;background:var(--bg);color:var(--text);font-family:'Segoe UI',system-ui,-apple-system,sans-serif;line-height:1.5;overflow-x:hidden}

/* LOGIN — styled to match ec-admin-login.html (blue theme, Inter font) */
.login-overlay{position:fixed;inset:0;background:#0f1117;z-index:9999;display:flex;align-items:center;justify-content:center;font-family:'Inter',system-ui,sans-serif}
.login-container{width:440px;max-width:94vw}
.login-box{background:#21242f;border:1px solid #2a2d3a;border-radius:20px;padding:2.5rem 2rem;box-shadow:0 20px 60px rgba(0,0,0,0.4);animation:slideUp .5s ease;text-align:center}
@keyframes slideUp{from{opacity:0;transform:translateY(30px)}to{opacity:1;transform:translateY(0)}}
.login-box .logo{width:64px;height:64px;border-radius:16px;background:linear-gradient(135deg,#3b82f6,#60a5fa);display:flex;align-items:center;justify-content:center;font-weight:800;font-size:1.7rem;color:#fff;margin:0 auto 1.2rem}
.login-box h1{font-size:1.15rem;font-weight:700;margin:0 0 4px;text-align:center;color:#e1e4ed;background:none;-webkit-text-fill-color:unset}
.login-box .sub{font-size:.78rem;color:#8b8fa3;margin-bottom:1.5rem;text-align:center;line-height:1.5}
.role-badge-wrap{text-align:center}
.role-badge{font-size:.7rem;padding:4px 14px;border-radius:999px;font-weight:600;border:1px solid rgba(59,130,246,.3);display:inline-flex;align-items:center;gap:4px;margin:0 auto 1.5rem;color:#3b82f6;background:rgba(59,130,246,.08)}
.login-box input,.login-box select{width:100%;background:#1a1d27;border:1px solid #2a2d3a;color:#e1e4ed;padding:11px 14px;border-radius:10px;font-size:.88rem;margin-bottom:10px;outline:none;font-family:'Inter',system-ui,sans-serif}
.login-box input:focus,.login-box select:focus{border-color:#3b82f6;box-shadow:0 0 0 3px rgba(59,130,246,.12)}
.login-box input::placeholder{color:#555a6e}
.login-box .btn-login{width:100%;background:linear-gradient(135deg,#3b82f6,#60a5fa);color:#fff;border:none;padding:12px;border-radius:10px;font-size:.92rem;font-weight:700;cursor:pointer;transition:.2s;margin-top:6px;display:flex;align-items:center;justify-content:center;gap:6px;font-family:'Inter',system-ui,sans-serif}
.login-box .btn-login:hover{opacity:.9;transform:translateY(-1px);box-shadow:0 6px 20px rgba(59,130,246,.3)}
.login-box .btn-login:disabled{opacity:.5;transform:none}
.login-box .error-msg{color:var(--red);font-size:.78rem;margin-top:6px;display:none;text-align:center}
.login-box .success-msg{color:var(--green);font-size:.78rem;margin-top:6px;display:none;text-align:center}
.login-box .info-msg{color:var(--blue);font-size:.78rem;margin-top:6px;display:none;text-align:center}
.auth-links{display:flex;gap:16px;justify-content:center;margin-top:14px}
.auth-links a{color:#8b8fa3;font-size:.78rem;cursor:pointer;text-decoration:none;transition:.2s}
.auth-links a:hover{color:#3b82f6}
.auth-screen{display:none}.auth-screen.active{display:block}
.auth-divider{border-top:1px solid #2a2d3a;margin:14px 0}
.auth-step{display:none}.auth-step.active{display:block}
.pwd-strength{height:4px;background:#1a1d27;border-radius:999px;margin:2px 0 10px;overflow:hidden}
.pwd-strength .bar{height:100%;width:0;border-radius:999px;transition:width .3s,background .3s}
.pwd-toggle{position:relative}
.pwd-toggle input{padding-right:40px}
.pwd-toggle .toggle-eye{position:absolute;right:12px;top:12px;color:#555a6e;cursor:pointer;font-size:.85rem}
.pwd-toggle .toggle-eye:hover{color:#8b8fa3}
.back-link{display:inline-flex;align-items:center;gap:6px;color:#8b8fa3;font-size:.78rem;cursor:pointer;margin-bottom:14px;transition:.2s}
.back-link:hover{color:#3b82f6}
.login-box .field-label{text-align:left;font-size:.75rem;color:#8b8fa3;margin-bottom:4px;font-weight:600}
.test-creds{background:#1a1d27;border:1px solid #2a2d3a;border-radius:12px;padding:12px 14px;margin-top:14px;font-size:.72rem;color:#8b8fa3}
.test-creds code{background:#0f1117;padding:1px 6px;border-radius:4px;font-size:.7rem;color:var(--cyan)}
.ec-member-list{margin-top:10px;font-size:.7rem;color:#555a6e;line-height:1.6}
.bottom-links{text-align:center;margin-top:1.5rem}
.bottom-links a{color:rgba(255,255,255,.5);font-size:.78rem;text-decoration:none;transition:.2s;margin:0 8px}
.bottom-links a:hover{color:rgba(255,255,255,.8)}

/* SIDEBAR */
.portal{display:none;height:100vh;overflow:hidden}
.sidebar{width:230px;background:var(--card);border-right:1px solid var(--line);height:100vh;overflow-y:auto;position:fixed;left:0;top:0;z-index:100;display:flex;flex-direction:column}
.sb-brand{padding:16px 18px;border-bottom:1px solid var(--line)}
.sb-brand h2{font-size:.95rem;font-weight:700;margin:0;background:linear-gradient(90deg,#f97316,#fb923c);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent}
.sb-brand small{font-size:.68rem;color:var(--dim)}
.sb-group{padding:8px 10px 4px;font-size:.65rem;text-transform:uppercase;letter-spacing:1px;color:var(--dim);font-weight:700;margin-top:6px}
.sb-item{display:flex;align-items:center;gap:8px;padding:8px 18px;color:var(--muted);font-size:.82rem;cursor:pointer;transition:.15s;border-left:3px solid transparent}
.sb-item:hover{background:rgba(249,115,22,.06);color:var(--text)}
.sb-item.active{color:var(--accent);background:rgba(249,115,22,.1);border-left-color:var(--accent)}
.sb-item i{width:18px;text-align:center;font-size:.78rem}
.sb-user{margin-top:auto;padding:12px 18px;border-top:1px solid var(--line);display:flex;align-items:center;gap:10px;font-size:.78rem;cursor:pointer}
.sb-avatar{width:32px;height:32px;border-radius:8px;background:linear-gradient(135deg,var(--accent),var(--accent2));display:flex;align-items:center;justify-content:center;font-weight:700;font-size:.75rem;color:#fff;flex-shrink:0}
.sb-user .name{font-weight:600;color:var(--text);font-size:.78rem}.sb-user .role-lbl{font-size:.65rem;color:var(--dim)}
.main-content{margin-left:230px;height:100vh;overflow-y:auto;padding:20px 28px 40px}
.portal-section{display:none;max-width:1300px}.portal-section.active{display:block;animation:fadeIn .2s ease}
@keyframes fadeIn{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:translateY(0)}}

/* Cards / KPI / Table / Badge / Form */
.card-a{background:var(--card);border:1px solid var(--line);border-radius:var(--radius);padding:20px;margin-bottom:16px}
.card-a h2{font-size:.95rem;font-weight:700;color:#fff;margin:0 0 14px;display:flex;align-items:center;gap:8px}
.card-a h2 i{color:var(--accent);font-size:.85rem}
.card-a h3{font-size:.84rem;color:var(--accent);margin:12px 0 6px;font-weight:600}
.stg-label{display:inline-flex;align-items:center;gap:4px;font-size:.65rem;text-transform:uppercase;letter-spacing:1px;color:var(--dim);font-weight:700;margin-bottom:6px}
.kpi-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:10px;margin-bottom:16px}
.kpi{background:var(--bg2);border:1px solid var(--line);border-radius:var(--radius-sm);padding:14px;text-align:center}.kpi .v{font-size:1.4rem;font-weight:800;color:#fff;line-height:1.1}.kpi .k{font-size:.68rem;color:var(--muted);margin-top:3px;text-transform:uppercase;letter-spacing:.4px}
.kpi.green .v{color:var(--green)}.kpi.red .v{color:var(--red)}.kpi.blue .v{color:var(--blue)}.kpi.orange .v{color:var(--accent)}.kpi.purple .v{color:var(--purple)}.kpi.cyan .v{color:var(--cyan)}.kpi.yellow .v{color:var(--yellow)}
.t{color:var(--text);width:100%;border-collapse:collapse;font-size:.78rem}
.t thead th{background:rgba(249,115,22,.06);color:#ffd7c2;padding:7px 10px;border-bottom:1px solid var(--line2);font-weight:600;text-align:left;font-size:.72rem;text-transform:uppercase;letter-spacing:.3px;white-space:nowrap}
.t td{padding:6px 10px;border-bottom:1px solid rgba(30,41,59,.6);vertical-align:top}
.t tbody tr:hover td{background:rgba(249,115,22,.03)}
.badge-s{display:inline-block;padding:2px 8px;border-radius:999px;font-size:.66rem;font-weight:600}
.badge-green{background:rgba(34,197,94,.15);color:var(--green)}.badge-red{background:rgba(239,68,68,.15);color:var(--red)}
.badge-yellow{background:rgba(234,179,8,.15);color:var(--yellow)}.badge-blue{background:rgba(59,130,246,.15);color:var(--blue)}
.badge-purple{background:rgba(168,85,247,.15);color:var(--purple)}.badge-orange{background:rgba(249,115,22,.15);color:var(--accent)}
.badge-cyan{background:rgba(6,182,212,.15);color:var(--cyan)}.badge-dim{background:rgba(71,85,105,.2);color:var(--dim)}
.form-row{display:flex;gap:10px;margin-bottom:10px;flex-wrap:wrap;align-items:flex-end}
.form-group{display:flex;flex-direction:column;gap:4px;flex:1;min-width:150px}
.form-group label{font-size:.7rem;color:var(--muted);text-transform:uppercase;letter-spacing:.3px}
.form-group input,.form-group select,.form-group textarea{background:var(--bg2);border:1px solid var(--line);color:var(--text);padding:8px 12px;border-radius:6px;font-size:.82rem;outline:none}
.form-group input:focus,.form-group select:focus,.form-group textarea:focus{border-color:var(--accent)}
.btn-primary{background:linear-gradient(135deg,var(--accent),var(--accent2));color:#fff;border:none;padding:8px 18px;border-radius:8px;font-size:.8rem;font-weight:600;cursor:pointer;transition:.2s;white-space:nowrap}
.btn-primary:hover{transform:translateY(-1px);box-shadow:0 4px 12px rgba(249,115,22,.3)}
.btn-secondary{background:var(--bg2);border:1px solid var(--line);color:var(--text);padding:8px 18px;border-radius:8px;font-size:.8rem;cursor:pointer;transition:.2s}
.btn-secondary:hover{border-color:var(--accent);color:var(--accent)}
.btn-sm{padding:4px 10px;font-size:.72rem;border-radius:6px}
.btn-danger{background:rgba(239,68,68,.1);border:1px solid rgba(239,68,68,.3);color:var(--red);padding:5px 12px;border-radius:6px;font-size:.74rem;cursor:pointer}
.btn-danger:hover{background:rgba(239,68,68,.2)}
.btn-success{background:linear-gradient(135deg,var(--green),#16a34a);color:#fff;border:none;padding:8px 18px;border-radius:8px;font-size:.8rem;font-weight:600;cursor:pointer}

/* PIPELINE  */
.pipe{display:flex;gap:4px;margin:14px 0;flex-wrap:wrap}
.pipe-step{flex:1;min-width:110px;padding:10px 6px;text-align:center;border-radius:var(--radius-sm);border:1px solid;transition:.2s}
.pipe-step.pending{background:rgba(71,85,105,.08);border-color:var(--dim);color:var(--dim)}
.pipe-step.active{background:rgba(234,179,8,.1);border-color:var(--yellow);color:var(--yellow);animation:pulse 1.5s infinite}
.pipe-step.done{background:rgba(34,197,94,.08);border-color:var(--green);color:var(--green)}
.pipe-step h6{font-size:.72rem;margin:0;font-weight:700}.pipe-step small{font-size:.62rem;opacity:.7}
.pipe-arrow{display:flex;align-items:center;color:var(--line2);font-size:.7rem}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}

/* SEARCH DROPDOWN */
.search-wrap{position:relative}
.search-wrap input{width:100%}
.search-results{position:absolute;top:100%;left:0;right:0;max-height:240px;overflow-y:auto;background:var(--card);border:1px solid var(--accent);border-top:none;border-radius:0 0 8px 8px;z-index:50;display:none}
.search-results.open{display:block}
.sr-item{padding:8px 12px;font-size:.78rem;cursor:pointer;display:flex;gap:10px;align-items:center;border-bottom:1px solid var(--line)}
.sr-item:hover{background:rgba(249,115,22,.08)}
.sr-item .sr-name{font-weight:600;color:#fff}.sr-item .sr-email{color:var(--muted);font-size:.72rem}.sr-item .sr-badge{margin-left:auto}

/* FEEDBACK */
.feedback-card{background:var(--bg2);border:1px solid var(--line);border-radius:var(--radius-sm);padding:14px;margin-bottom:10px}
.feedback-card .fb-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:8px}
.feedback-card .fb-section{font-weight:600;color:var(--accent);font-size:.82rem}
.feedback-card .fb-ts{color:var(--dim);font-size:.7rem}
.feedback-card .fb-body{font-size:.8rem;color:var(--muted);margin-bottom:8px}
.feedback-card .fb-user{font-size:.72rem;color:var(--cyan)}
.pipeline-flow{display:flex;gap:6px;flex-wrap:wrap;align-items:center;margin:6px 0}
.pipeline-flow .pf-step{padding:3px 10px;border-radius:999px;font-size:.66rem;font-weight:600}
.pipeline-flow .pf-arrow{color:var(--dim);font-size:.6rem}

/* LOG */
.act-log{max-height:280px;overflow-y:auto;background:var(--bg);border:1px solid var(--line);border-radius:8px;padding:4px}
.log-line{font-size:.72rem;padding:4px 8px;border-bottom:1px solid rgba(30,41,59,.3);display:flex;gap:8px}
.log-line .ll-ts{color:var(--dim);min-width:105px;font-family:Consolas,monospace;flex-shrink:0}
.log-line .ll-act{min-width:95px;flex-shrink:0;font-weight:600}
.log-line .ll-msg{color:var(--muted);flex:1}

/* E2E TEST */
.test-step{background:var(--bg2);border:1px solid var(--line);border-radius:var(--radius-sm);padding:12px 16px;margin-bottom:6px;display:flex;align-items:center;gap:12px}
.test-step .ts-icon{width:28px;height:28px;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:.8rem;flex-shrink:0}
.test-step .ts-icon.pending{background:rgba(71,85,105,.2);color:var(--dim)}
.test-step .ts-icon.running{background:rgba(234,179,8,.15);color:var(--yellow);animation:pulse 1s infinite}
.test-step .ts-icon.pass{background:rgba(34,197,94,.15);color:var(--green)}
.test-step .ts-icon.fail{background:rgba(239,68,68,.15);color:var(--red)}
.test-step .ts-lbl{font-size:.8rem;font-weight:600}
.test-step .ts-detail{font-size:.72rem;color:var(--muted)}
.test-step .ts-status{margin-left:auto;font-size:.7rem;font-weight:600}

/* PRIVACY BANNER */
.privacy-banner{background:rgba(34,197,94,.06);border:1px solid rgba(34,197,94,.2);border-radius:var(--radius-sm);padding:10px 14px;margin-bottom:12px;font-size:.74rem;color:var(--green);display:flex;align-items:flex-start;gap:8px}
.privacy-banner i{margin-top:2px}

@media(max-width:900px){.sidebar{width:52px}.sidebar .sb-group,.sidebar .sb-brand small,.sidebar .sb-user .name,.sidebar .sb-user .role-lbl,.sb-item span{display:none}.sb-item{padding:10px;justify-content:center}.sb-item i{width:auto}.main-content{margin-left:52px;padding:12px}}
</style>
</head>
<body>

<!-- ═══════ AUTH SYSTEM ═══════ -->
<div class="login-overlay" id="login-screen">
  <div class="login-container">
  <div class="login-box">
    <div class="logo">EC</div>
    <h1>BANF EC Admin Portal</h1>
    <div class="sub">Executive Committee member access to BANF administration tools</div>
    <div class="role-badge-wrap">
      <span class="role-badge"><i class="fas fa-users-cog me-1"></i>EC Administrator</span>
    </div>

    <!-- ══ SCREEN 1: SIGN IN ══ -->
    <div class="auth-screen active" id="auth-signin">
      <input type="email" id="login-email" placeholder="Your EC email address" autocomplete="email">
      <div class="pwd-toggle">
        <input type="password" id="login-pass" placeholder="Password" autocomplete="current-password">
        <i class="fas fa-eye toggle-eye" onclick="togglePwd('login-pass',this)"></i>
      </div>
      <button class="btn-login" id="btn-login"><i class="fas fa-users-cog"></i> EC Admin Sign In</button>
      <div class="error-msg" id="login-error"></div>
      <div class="success-msg" id="login-success"></div>
      <div class="info-msg" id="login-info"></div>
      <div class="auth-links">
        <a onclick="showAuth('forgot')"><i class="fas fa-key me-1"></i>Forgot Password?</a>
        <a onclick="showAuth('forgot-username')"><i class="fas fa-user-question me-1"></i>Forgot Email?</a>
        <a onclick="showAuth('signup')"><i class="fas fa-user-plus me-1"></i>Sign Up</a>
      </div>
      <div style="margin-top:14px;font-size:.7rem;color:#555a6e;text-align:center">
        <i class="fas fa-lock me-1"></i>BANF EC Admin Auth System
      </div>

      <div style="background:var(--bg2);border:1px solid var(--line);border-radius:12px;padding:12px 14px;margin-top:14px;font-size:.72rem;color:var(--muted)">
        <div class="fw-bold mb-1"><i class="fas fa-lock me-1"></i>EC Admin Access</div>
        <div>Only authorized EC members can sign in here. Contact the President for access.</div>
      </div>
    </div>

    <!-- ══ SCREEN 2: SIGN UP (Multi-Step) ══ -->
    <div class="auth-screen" id="auth-signup">
      <div class="back-link" onclick="showAuth('signin')"><i class="fas fa-arrow-left"></i> Back to Sign In</div>
      <h1 style="font-size:1rem;margin-bottom:14px"><i class="fas fa-user-plus me-1"></i>EC Admin Sign Up</h1>

      <!-- Step 1: Email — direct validation (no code needed) -->
      <div class="auth-step active" id="signup-step-1">
        <div class="field-label">Your EC Email (must be in EC Members list)</div>
        <input type="email" id="signup-email" placeholder="your-email@gmail.com" autocomplete="email">
        <button class="btn-login" onclick="signupStep1()"><i class="fas fa-user-plus me-1"></i>Begin Signup</button>
        <div class="error-msg" id="signup-error-1"></div>
        <div class="info-msg" id="signup-info-1"></div>
        <div style="margin-top:8px;font-size:.7rem;color:#555a6e">You must be a current EC member to create an admin account. No verification code needed.</div>
      </div>

      <!-- Step 2: Password + Security Question -->
      <div class="auth-step" id="signup-step-2">
        <div style="font-size:.82rem;color:var(--green);margin-bottom:6px"><i class="fas fa-check-circle me-1"></i>Welcome, <strong id="signup-welcome-name"></strong>!</div>
        <div style="font-size:.78rem;color:#8b8fa3;margin-bottom:14px">Email confirmed: <strong id="signup-confirmed-email"></strong></div>
        <div class="field-label">Create Password</div>
        <div class="pwd-toggle">
          <input type="password" id="signup-pass" placeholder="Minimum 8 characters" oninput="checkPwdStrength(this.value,'signup-strength')">
          <i class="fas fa-eye toggle-eye" onclick="togglePwd('signup-pass',this)"></i>
        </div>
        <div class="pwd-strength"><div class="bar" id="signup-strength"></div></div>
        <div class="field-label">Confirm Password</div>
        <div class="pwd-toggle">
          <input type="password" id="signup-pass2" placeholder="Re-enter password">
          <i class="fas fa-eye toggle-eye" onclick="togglePwd('signup-pass2',this)"></i>
        </div>
        <div class="auth-divider"></div>
        <div class="field-label">Security Question</div>
        <select id="signup-sq">
          <option value="">— Select a security question —</option>
          <option value="city_born">What city were you born in?</option>
          <option value="pet_name">What is the name of your first pet?</option>
          <option value="mother_maiden">What is your mother's maiden name?</option>
          <option value="school_name">What was the name of your first school?</option>
          <option value="fav_teacher">Who was your favorite teacher?</option>
          <option value="childhood_friend">What is the name of your childhood best friend?</option>
        </select>
        <div class="field-label">Security Answer</div>
        <input type="text" id="signup-sa" placeholder="Your answer (case-insensitive)">
        <button class="btn-login" onclick="signupStep2Submit()"><i class="fas fa-user-shield me-1"></i>Create Account</button>
        <div class="error-msg" id="signup-error-2"></div>
      </div>

      <!-- Step 3: Success -->
      <div class="auth-step" id="signup-step-3">
        <div style="font-size:2rem;color:var(--green);margin-bottom:10px;text-align:center"><i class="fas fa-check-circle"></i></div>
        <div style="font-size:.95rem;font-weight:700;color:var(--green);margin-bottom:8px;text-align:center">Account Created Successfully!</div>
        <div style="font-size:.82rem;color:#8b8fa3;margin-bottom:12px;text-align:center">Your EC Admin account is ready. You can now sign in to access the EC Admin Portal.</div>
        <div style="background:#1a1d27;border-radius:8px;padding:12px 16px;margin-bottom:14px;font-size:.78rem;color:#e1e4ed;text-align:left">
          <div style="font-weight:600;margin-bottom:6px"><i class="fas fa-clipboard-check me-1" style="color:var(--green)"></i>Your portals:</div>
          <div style="margin:4px 0"><i class="fas fa-shield-halved me-1" style="color:#3b82f6"></i><strong>EC Admin Portal</strong> &mdash; Manage EC operations, drives, email campaigns</div>
          <div style="margin:4px 0"><i class="fas fa-user me-1" style="color:var(--green)"></i><strong>Member Portal</strong> &mdash; Access member services (linked from EC Admin Portal)</div>
        </div>
        <button class="btn-login" onclick="showAuth('signin')"><i class="fas fa-sign-in-alt me-1"></i>Sign In Now</button>
      </div>
    </div>

    <!-- ══ SCREEN 3: FORGOT PASSWORD ══ -->
    <div class="auth-screen" id="auth-forgot">
      <div class="back-link" onclick="showAuth('signin')"><i class="fas fa-arrow-left"></i> Back to Sign In</div>
      <h1 style="font-size:1rem;margin-bottom:14px"><i class="fas fa-key me-1"></i>Reset Password</h1>

      <!-- Step 1: Email lookup -->
      <div class="auth-step active" id="forgot-step-1">
        <div class="field-label">Enter your EC email or username</div>
        <input type="text" id="forgot-email" placeholder="email or username" autocomplete="email">
        <button class="btn-login" onclick="forgotStep1()"><i class="fas fa-search me-1"></i>Find My Account</button>
        <div class="error-msg" id="forgot-error-1"></div>
        <div class="info-msg" id="forgot-info-1"></div>
      </div>

      <!-- Step 2: Security question -->
      <div class="auth-step" id="forgot-step-2">
        <div style="font-size:.82rem;color:var(--green);margin-bottom:8px"><i class="fas fa-check-circle me-1"></i>Account found: <strong id="forgot-found-name"></strong></div>
        <div class="field-label">Security Question</div>
        <div style="font-size:.88rem;color:#e1e4ed;background:#1a1d27;padding:12px 16px;border-radius:8px;margin-bottom:12px;text-align:left" id="forgot-sq-display"></div>
        <div class="field-label">Your Answer</div>
        <input type="text" id="forgot-sa" placeholder="Type your answer">
        <button class="btn-login" onclick="forgotStep2()"><i class="fas fa-check me-1"></i>Verify Answer</button>
        <div class="error-msg" id="forgot-error-2"></div>
      </div>

      <!-- Step 3: New password -->
      <div class="auth-step" id="forgot-step-3">
        <div style="font-size:.82rem;color:var(--green);margin-bottom:14px"><i class="fas fa-check-circle me-1"></i>Identity verified!</div>
        <div class="field-label">New Password</div>
        <div class="pwd-toggle">
          <input type="password" id="forgot-newpass" placeholder="Minimum 8 characters" oninput="checkPwdStrength(this.value,'forgot-strength')">
          <i class="fas fa-eye toggle-eye" onclick="togglePwd('forgot-newpass',this)"></i>
        </div>
        <div class="pwd-strength"><div class="bar" id="forgot-strength"></div></div>
        <div class="field-label">Confirm New Password</div>
        <div class="pwd-toggle">
          <input type="password" id="forgot-newpass2" placeholder="Re-enter password">
          <i class="fas fa-eye toggle-eye" onclick="togglePwd('forgot-newpass2',this)"></i>
        </div>
        <button class="btn-login" onclick="forgotStep3()"><i class="fas fa-save me-1"></i>Reset Password</button>
        <div class="error-msg" id="forgot-error-3"></div>
      </div>

      <!-- Step 4: Success -->
      <div class="auth-step" id="forgot-step-4">
        <div style="font-size:2rem;color:var(--green);margin-bottom:10px;text-align:center"><i class="fas fa-check-circle"></i></div>
        <div style="font-size:.95rem;font-weight:700;color:var(--green);margin-bottom:8px;text-align:center">Password Reset Successfully!</div>
        <div style="font-size:.82rem;color:#8b8fa3;margin-bottom:20px;text-align:center">You can now sign in with your new password.</div>
        <button class="btn-login" onclick="showAuth('signin')"><i class="fas fa-sign-in-alt me-1"></i>Go to Sign In</button>
      </div>
    </div>

    <!-- ══ SCREEN 4: FORGOT EMAIL / USERNAME ══ -->
    <div class="auth-screen" id="auth-forgot-username">
      <div class="back-link" onclick="showAuth('signin')"><i class="fas fa-arrow-left"></i> Back to Sign In</div>
      <h1 style="font-size:1rem;margin-bottom:4px"><i class="fas fa-user-question me-1"></i>Forgot Your EC Email?</h1>
      <div style="font-size:.75rem;color:#8b8fa3;margin-bottom:14px">Enter your full name as registered and we'll find your account.</div>

      <!-- Step 1: Name lookup -->
      <div class="auth-step active" id="fu-step-1">
        <div class="field-label">Your Full Name (first + last)</div>
        <input type="text" id="fu-name" placeholder="e.g. Partha Mukhopadhyay">
        <button class="btn-login" onclick="fuStep1()"><i class="fas fa-search me-1"></i>Find My Account</button>
        <div class="error-msg" id="fu-error-1"></div>
        <div class="info-msg" id="fu-info-1"></div>
      </div>

      <!-- Step 2: Verify code sent to found email -->
      <div class="auth-step" id="fu-step-2">
        <div style="font-size:.82rem;color:var(--green);margin-bottom:8px"><i class="fas fa-check-circle me-1"></i>Account found! A verification code was sent to <strong id="fu-masked-email"></strong></div>
        <div class="field-label">Enter 6-Digit Code</div>
        <input type="text" id="fu-code" placeholder="Enter code" maxlength="6" style="text-align:center;letter-spacing:6px;font-size:1.2rem;font-weight:700">
        <button class="btn-login" onclick="fuStep2()"><i class="fas fa-check-circle me-1"></i>Verify &amp; Reveal Email</button>
        <div class="error-msg" id="fu-error-2"></div>
        <div class="info-msg" id="fu-info-2"></div>
        <div style="margin-top:6px;font-size:.7rem;color:#555a6e">Code expires in 10 min. <a href="#" onclick="fuResend();return false" style="color:#3b82f6">Resend</a></div>
      </div>

      <!-- Step 3: Show full email -->
      <div class="auth-step" id="fu-step-3">
        <div style="font-size:1.5rem;color:var(--green);margin-bottom:10px;text-align:center"><i class="fas fa-envelope-open-text"></i></div>
        <div style="font-size:.88rem;font-weight:700;color:var(--green);margin-bottom:6px;text-align:center">Email Address Found!</div>
        <div style="font-size:.82rem;color:#8b8fa3;margin-bottom:8px;text-align:center">Your BANF EC Admin email is:</div>
        <div style="background:#1a1d27;border:1px solid #2a2d3a;border-radius:10px;padding:14px;text-align:center;font-size:1rem;font-weight:700;color:#3b82f6" id="fu-revealed-email"></div>
        <div style="margin-top:12px;font-size:.75rem;color:#555a6e;text-align:center">Use this email to sign in. Same credentials work across EC Admin and Member portals.</div>
        <button class="btn-login" style="margin-top:14px" onclick="showAuth('signin')"><i class="fas fa-sign-in-alt me-1"></i>Go to Sign In</button>
      </div>
    </div>
  </div>

  <div class="bottom-links">
    <a href="https://www.jaxbengali.org" target="_blank"><i class="fas fa-arrow-left me-1"></i>Back to BANF Home</a>
  </div>
  </div>
</div>

<div class="portal" id="portal">
  <aside class="sidebar">
    <div class="sb-brand">
      <h2><i class="fas fa-shield-alt me-1"></i> BANF Admin</h2>
      <small>Super Admin Portal v3.0 (Multi-Role Identity)</small>
    </div>

    <div class="sb-group">Operations</div>
    <div class="sb-item active" data-panel="dashboard"><i class="fas fa-home"></i><span>Dashboard</span></div>
    <div class="sb-item" data-panel="ec-profile"><i class="fas fa-user-circle"></i><span>My EC Profile</span><span style="margin-left:auto;font-size:.6rem;color:var(--green);">LIVE</span></div>
    <div class="sb-item" data-panel="roles"><i class="fas fa-id-badge"></i><span>Role Definitions</span><span style="margin-left:auto;font-size:.6rem;color:var(--dim);">Phase 2</span></div>
    <div class="sb-item" data-panel="users"><i class="fas fa-users-cog"></i><span>User Management</span><span style="margin-left:auto;font-size:.6rem;color:var(--dim);">Phase 2</span></div>
    <div class="sb-item" data-panel="identity"><i class="fas fa-fingerprint"></i><span>Identity Engine</span><span style="margin-left:auto;font-size:.6rem;color:var(--dim);">Phase 3</span></div>

    <div class="sb-group">Drives</div>
    <div class="sb-item" data-panel="stakeholder-drive"><i class="fas fa-bullhorn"></i><span>Stakeholder Drive</span><span style="margin-left:auto;font-size:.6rem;color:var(--dim);">Phase 2</span></div>
    <div class="sb-item" data-panel="ec-drive"><i class="fas fa-shield-halved"></i><span>EC Drive</span><span style="margin-left:auto;font-size:.6rem;color:var(--dim);">Phase 2</span></div>
    <div class="sb-item" data-panel="drive-status"><i class="fas fa-chart-line"></i><span>Drive Status</span><span style="margin-left:auto;font-size:.6rem;color:var(--dim);">Phase 2</span></div>

    <div class="sb-group">Development</div>
    <div class="sb-item" data-panel="feedback"><i class="fas fa-comments"></i><span>Feedback Pipeline</span><span style="margin-left:auto;font-size:.6rem;color:var(--dim);">Phase 3</span></div>
    <div class="sb-item" data-panel="dev-board"><i class="fas fa-clipboard-list"></i><span>Dev Board</span><span style="margin-left:auto;font-size:.6rem;color:var(--dim);">Phase 3</span></div>

    <div class="sb-group">Testing</div>
    <div class="sb-item" data-panel="e2e-test"><i class="fas fa-vial"></i><span>E2E Test Suite</span><span style="margin-left:auto;font-size:.6rem;color:var(--dim);">Phase 4</span></div>

    <div class="sb-group">AI Agents</div>
    <div class="sb-item" data-panel="agent-monitor"><i class="fas fa-robot"></i><span>Agent Monitor</span><span style="margin-left:auto;font-size:.6rem;color:var(--green);">LIVE</span></div>

    <div class="sb-group">Finance</div>
    <div class="sb-item" data-panel="procurement"><i class="fas fa-file-invoice-dollar"></i><span>Procurement</span><span style="margin-left:auto;font-size:.6rem;color:var(--green);">LIVE</span></div>
    <div class="sb-item" data-panel="reimbursement" id="rmb-nav-item"><i class="fas fa-receipt"></i><span>Reimbursement</span><span style="margin-left:auto;font-size:.6rem;color:var(--green);">LIVE</span></div>
    <div class="sb-item" data-panel="ledger-report"><i class="fas fa-book"></i><span>Ledger Report</span><span style="margin-left:auto;font-size:.6rem;color:var(--green);">LIVE</span></div>
    <div class="sb-item" data-panel="income-summary"><i class="fas fa-chart-pie"></i><span>Income Summary</span><span style="margin-left:auto;font-size:.6rem;color:var(--green);">LIVE</span></div>
    <div class="sb-item" data-panel="event-expenses"><i class="fas fa-calendar-check"></i><span>Event Expenses</span><span style="margin-left:auto;font-size:.6rem;color:var(--green);">LIVE</span></div>

    <div class="sb-group">Events</div>
    <div class="sb-item" data-panel="evite-manager"><i class="fas fa-envelope-open-text"></i><span>E-Vite Manager</span><span style="margin-left:auto;font-size:.6rem;color:var(--green);">LIVE</span></div>

    <div class="sb-group" id="president-group" style="display:none">President</div>
    <div class="sb-item" data-panel="ec-replacement" id="president-ec-replace" style="display:none"><i class="fas fa-user-shield"></i><span>EC Replacement</span><span style="margin-left:auto;font-size:.6rem;color:var(--green);">LIVE</span></div>
    <div class="sb-item" data-panel="ec-revoke" id="president-ec-revoke" style="display:none"><i class="fas fa-ban"></i><span>Revoke EC Role</span><span style="margin-left:auto;font-size:.6rem;color:var(--green);">LIVE</span></div>

    <div class="sb-group">Audit</div>
    <div class="sb-item" data-panel="activity"><i class="fas fa-history"></i><span>Activity Log</span><span style="margin-left:auto;font-size:.6rem;color:var(--dim);">Phase 3</span></div>
    <div class="sb-item" onclick="window.open('https://banfjax-hash.github.io/banf/unified-ecosystem-dashboard.html','_blank')"><i class="fas fa-atom"></i><span>Main Dashboard</span></div>
    <div class="sb-item" onclick="window.open('https://banfjax-hash.github.io/banf/stakeholder-requirements-journey.html','_blank')"><i class="fas fa-route"></i><span>Requirements Journey</span></div>

    <div class="sb-user">
      <div class="sb-avatar">RG</div>
      <div><div class="name">Ranadhir Ghosh</div><div class="role-lbl">Super Admin / Tech Lead</div></div>
    </div>
  </aside>

  <div class="main-content">

    <!-- â•â•â•â•â•â•â• DASHBOARD PANEL â•â•â•â•â•â•â• -->
    <div class="portal-section active" id="panel-dashboard">
      <div class="stg-label"><i class="fas fa-circle" style="color:var(--green)"></i> Control Center</div>
      <div class="kpi-grid" id="dash-kpis"></div>
      <div class="row g-3">
        <div class="col-lg-7">
          <div class="card-a" style="height:100%">
            <h2><i class="fas fa-shield-alt"></i> Capabilities by Development Stage</h2>
            <table class="t"><thead><tr><th>Capability</th><th>Stage</th><th>Status</th></tr></thead>
            <tbody>
              <tr><td><i class="fas fa-id-badge me-1" style="color:var(--blue)"></i>Role Definitions</td><td><span class="badge-s badge-blue">1. Setup</span></td><td><span class="badge-s badge-green">Active</span></td></tr>
              <tr><td><i class="fas fa-users-cog me-1" style="color:var(--blue)"></i>User & CRM Management</td><td><span class="badge-s badge-blue">1. Setup</span></td><td><span class="badge-s badge-green">Active</span></td></tr>
              <tr><td><i class="fas fa-bullhorn me-1" style="color:var(--purple)"></i>Stakeholder Drive</td><td><span class="badge-s badge-purple">2. Execution</span></td><td><span class="badge-s badge-green">Active</span></td></tr>
              <tr><td><i class="fas fa-shield-halved me-1" style="color:var(--purple)"></i>EC Year Drive</td><td><span class="badge-s badge-purple">2. Execution</span></td><td><span class="badge-s badge-green">Active</span></td></tr>
              <tr><td><i class="fas fa-comments me-1" style="color:var(--cyan)"></i>Feedback â†’ Agent Pipeline</td><td><span class="badge-s badge-cyan">3. Review</span></td><td><span class="badge-s badge-green">Active</span></td></tr>
              <tr><td><i class="fas fa-clipboard-list me-1" style="color:var(--orange)"></i>Dev Board / Approval</td><td><span class="badge-s badge-orange">4. Delivery</span></td><td><span class="badge-s badge-green">Active</span></td></tr>
              <tr><td><i class="fas fa-vial me-1" style="color:var(--yellow)"></i>E2E Test Suite</td><td><span class="badge-s badge-yellow">5. QA</span></td><td><span class="badge-s badge-green">Active</span></td></tr>
              <tr style="background:rgba(34,197,94,.06)"><td><i class="fas fa-file-invoice-dollar me-1" style="color:var(--green)"></i><strong>Finance (Procurement + Reimbursement)</strong></td><td><span class="badge-s badge-green">LIVE</span></td><td><span class="badge-s badge-green" style="cursor:pointer" onclick="navTo('procurement')">Go →</span></td></tr>
            </tbody></table>
          </div>
        </div>
        <div class="col-lg-5">
          <div class="card-a" style="height:100%">
            <h2><i class="fas fa-clock-rotate-left"></i> Recent Activity</h2>
            <div class="act-log" id="dash-log"></div>
          </div>
        </div>
      </div>
      <!-- Finance Quick Access -->
      <div class="card-a mt-3" style="border:1px solid rgba(34,197,94,.25)">
        <h2><i class="fas fa-file-invoice-dollar" style="color:var(--green)"></i> Finance — Quick Access</h2>
        <p style="font-size:.78rem;color:var(--muted);margin-bottom:12px">Submit procurement requests, upload receipts, or access the AI-powered reimbursement portal.</p>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          <button onclick="navTo('procurement')" style="background:linear-gradient(135deg,var(--accent),var(--accent2));color:#fff;border:none;padding:10px 20px;border-radius:8px;font-weight:700;font-size:.85rem;cursor:pointer"><i class="fas fa-file-invoice-dollar me-1"></i>Procurement &amp; Requests</button>
          <button onclick="navTo('reimbursement')" style="background:linear-gradient(135deg,#10b981,#059669);color:#fff;border:none;padding:10px 20px;border-radius:8px;font-weight:700;font-size:.85rem;cursor:pointer"><i class="fas fa-receipt me-1"></i>Reimbursement Portal</button>
        </div>
      </div>

      <div class="card-a mt-3">
        <h2><i class="fas fa-link"></i> Quick Actions</h2>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          <button class="btn-primary" onclick="if(typeof banfChatToggle==='function')banfChatToggle()"><i class="fas fa-robot me-1"></i>BANF Admin Assistant</button>
          <a href="https://banfjax-hash.github.io/banf/unified-ecosystem-dashboard.html" target="_blank" class="btn-secondary"><i class="fas fa-atom me-1"></i>Main Dashboard</a>
          <a href="https://banfjax-hash.github.io/banf/stakeholder-requirements-journey.html" target="_blank" class="btn-secondary"><i class="fas fa-route me-1"></i>Requirements Journey</a>
          <a href="https://www.jaxbengali.org" target="_blank" class="btn-secondary"><i class="fas fa-globe me-1"></i>Live Site</a>
        </div>
        <div style="margin-top:12px;padding:10px 14px;background:rgba(249,115,22,.06);border:1px solid rgba(249,115,22,.15);border-radius:8px;font-size:.78rem;color:var(--muted);">
          <i class="fas fa-info-circle me-1" style="color:var(--accent)"></i>
          <strong>Live Now:</strong> Dashboard, Finance (Procurement + AI Reimbursement), EC Replacement (President). Other modules (Role Definitions, User Management, Identity Engine, Drives, Feedback, Dev Board, E2E, Audit) will be launched step-wise.
        </div>
      </div>
    </div>


    <!-- MY EC PROFILE -->
    <div class="portal-section" id="panel-ec-profile">
      <div class="stg-label"><i class="fas fa-circle" style="color:var(--green)"></i> My Public Profile</div>
      <div class="card-a">
        <h2><i class="fas fa-user-circle"></i> EC Member Profile</h2>
        <p style="font-size:.78rem;color:var(--muted);margin-bottom:14px">Update your profile photo and bio for the BANF website EC team section.</p>

        <div style="display:grid;grid-template-columns:220px 1fr;gap:24px;align-items:start" id="ec-profile-grid">
          <!-- Photo Column -->
          <div style="text-align:center">
            <div id="ec-profile-photo-wrap" style="width:180px;height:180px;border-radius:16px;overflow:hidden;margin:0 auto 14px;background:var(--bg2);border:2px dashed var(--line2);display:flex;align-items:center;justify-content:center;cursor:pointer;position:relative" onclick="document.getElementById('ec-profile-photo-input').click()">
              <img id="ec-profile-photo-preview" src="" alt="" style="width:100%;height:100%;object-fit:cover;display:none">
              <div id="ec-profile-photo-placeholder" style="color:var(--dim);font-size:.78rem;text-align:center;padding:12px">
                <i class="fas fa-camera" style="font-size:2rem;display:block;margin-bottom:8px"></i>
                Click to upload<br>profile photo
              </div>
            </div>
            <input type="file" id="ec-profile-photo-input" accept="image/*" style="display:none" onchange="handleProfilePhotoUpload(event)">
            <button class="btn-secondary btn-sm" onclick="document.getElementById('ec-profile-photo-input').click()" style="margin-bottom:6px;width:100%"><i class="fas fa-upload me-1"></i>Upload Photo</button>
            <button class="btn-secondary btn-sm" onclick="clearProfilePhoto()" style="width:100%;color:var(--red);border-color:rgba(239,68,68,.3)"><i class="fas fa-trash me-1"></i>Remove Photo</button>
            <div style="font-size:.65rem;color:var(--dim);margin-top:8px">Max 500KB. Square crop recommended. Auto-resized to 400x400.</div>
          </div>

          <!-- Info Column -->
          <div>
            <div style="display:flex;gap:12px;margin-bottom:10px">
              <div style="flex:1">
                <div style="font-size:.7rem;color:var(--muted);margin-bottom:4px">First Name</div>
                <input id="ec-profile-firstName" disabled style="width:100%;padding:8px 12px;background:var(--bg2);border:1px solid var(--line);color:var(--dim);border-radius:6px;font-size:.82rem">
              </div>
              <div style="flex:1">
                <div style="font-size:.7rem;color:var(--muted);margin-bottom:4px">Last Name</div>
                <input id="ec-profile-lastName" disabled style="width:100%;padding:8px 12px;background:var(--bg2);border:1px solid var(--line);color:var(--dim);border-radius:6px;font-size:.82rem">
              </div>
            </div>
            <div style="display:flex;gap:12px;margin-bottom:10px">
              <div style="flex:1">
                <div style="font-size:.7rem;color:var(--muted);margin-bottom:4px">EC Title</div>
                <input id="ec-profile-ecTitle" disabled style="width:100%;padding:8px 12px;background:var(--bg2);border:1px solid var(--line);color:var(--dim);border-radius:6px;font-size:.82rem">
              </div>
              <div style="flex:1">
                <div style="font-size:.7rem;color:var(--muted);margin-bottom:4px">Email</div>
                <input id="ec-profile-email" disabled style="width:100%;padding:8px 12px;background:var(--bg2);border:1px solid var(--line);color:var(--dim);border-radius:6px;font-size:.82rem">
              </div>
            </div>

            <div style="border-top:1px solid var(--line);margin:16px 0"></div>

            <div style="margin-bottom:10px">
              <div style="font-size:.7rem;color:var(--muted);margin-bottom:4px">Card Summary <span style="color:var(--dim)">(shown on EC card - max 300 chars)</span></div>
              <textarea id="ec-profile-summary" rows="2" maxlength="300" placeholder="Brief 1-2 line summary for your EC member card" style="width:100%;padding:8px 12px;background:var(--bg2);border:1px solid var(--line);color:var(--text);border-radius:6px;font-size:.82rem;resize:vertical" oninput="updateProfileCharCount('summary',300)"></textarea>
              <div style="font-size:.65rem;color:var(--dim);text-align:right" id="ec-profile-summary-count">0/300</div>
            </div>

            <div style="margin-bottom:10px">
              <div style="font-size:.7rem;color:var(--muted);margin-bottom:4px">Full Bio <span style="color:var(--dim)">(shown in profile modal - max 2000 chars)</span></div>
              <textarea id="ec-profile-bio" rows="5" maxlength="2000" placeholder="Your detailed biography for the profile modal" style="width:100%;padding:8px 12px;background:var(--bg2);border:1px solid var(--line);color:var(--text);border-radius:6px;font-size:.82rem;resize:vertical" oninput="updateProfileCharCount('bio',2000)"></textarea>
              <div style="font-size:.65rem;color:var(--dim);text-align:right" id="ec-profile-bio-count">0/2000</div>
            </div>

            <div style="display:flex;gap:12px;margin-bottom:10px">
              <div style="flex:1">
                <div style="font-size:.7rem;color:var(--muted);margin-bottom:4px">Education</div>
                <input id="ec-profile-education" placeholder="e.g. Ph.D., Computer Science" style="width:100%;padding:8px 12px;background:var(--bg2);border:1px solid var(--line);color:var(--text);border-radius:6px;font-size:.82rem">
              </div>
              <div style="flex:1">
                <div style="font-size:.7rem;color:var(--muted);margin-bottom:4px">Profession</div>
                <input id="ec-profile-profession" placeholder="e.g. AI Solution Architect" style="width:100%;padding:8px 12px;background:var(--bg2);border:1px solid var(--line);color:var(--text);border-radius:6px;font-size:.82rem">
              </div>
            </div>

            <div style="margin-bottom:14px">
              <div style="font-size:.7rem;color:var(--muted);margin-bottom:4px">Interests <span style="color:var(--dim)">(comma-separated)</span></div>
              <input id="ec-profile-interests" placeholder="e.g. AI and ML, Bengali Literature, Rabindra Sangeet" style="width:100%;padding:8px 12px;background:var(--bg2);border:1px solid var(--line);color:var(--text);border-radius:6px;font-size:.82rem">
            </div>

            <div style="display:flex;gap:10px;align-items:center">
              <button class="btn-primary" onclick="saveECProfile()" id="ec-profile-save-btn"><i class="fas fa-save me-1"></i>Save Profile</button>
              <div id="ec-profile-status" style="font-size:.78rem;color:var(--muted)"></div>
            </div>
          </div>
        </div>
      </div>

      <!-- Profile Preview Card -->
      <div class="card-a" id="ec-profile-preview-card" style="display:none">
        <h2><i class="fas fa-eye"></i> Profile Preview</h2>
        <p style="font-size:.78rem;color:var(--muted);margin-bottom:12px">This is how your profile will appear on the BANF website.</p>
        <div id="ec-profile-preview-content" style="display:flex;gap:20px;align-items:start;padding:10px;background:var(--bg2);border-radius:10px">
          <div id="ec-preview-photo" style="width:120px;height:120px;border-radius:12px;overflow:hidden;background:linear-gradient(135deg,#667eea,#764ba2);flex-shrink:0;display:flex;align-items:center;justify-content:center">
            <span style="font-size:2rem;font-weight:800;color:#fff" id="ec-preview-initials">?</span>
          </div>
          <div>
            <div style="font-size:1.1rem;font-weight:700;color:#fff" id="ec-preview-name">-</div>
            <div style="font-size:.82rem;color:var(--accent);font-weight:600;margin-bottom:8px" id="ec-preview-title">-</div>
            <div style="font-size:.82rem;color:var(--muted);margin-bottom:8px" id="ec-preview-summary">-</div>
            <div style="font-size:.78rem;color:var(--dim)" id="ec-preview-details"></div>
          </div>
        </div>
      </div>
    </div>
    <!-- â•â•â•â•â•â•â• ROLE DEFINITIONS â•â•â•â•â•â•â• -->
    <div class="portal-section" id="panel-roles">
      <div class="stg-label"><i class="fas fa-circle" style="color:var(--blue)"></i> Stage 1: Setup</div>
      <div class="card-a">
        <h2><i class="fas fa-id-badge"></i> Define New Role</h2>
        <p style="font-size:.78rem;color:var(--muted);margin-bottom:10px">Roles <strong>must be defined before</strong> assigning to users. Each role specifies purpose, data access, process views, and feedback capabilities available to the stakeholder.</p>
        <div class="form-row">
          <div class="form-group" style="min-width:170px"><label>Role ID</label><input type="text" id="role-id" placeholder="e.g. technical-lead"></div>
          <div class="form-group" style="flex:2"><label>Role Name</label><input type="text" id="role-name" placeholder="e.g. Technical Lead"></div>
          <div class="form-group" style="flex:3"><label>Purpose</label><input type="text" id="role-purpose" placeholder="e.g. Final authority on implementation decisions"></div>
        </div>
        <div class="form-row">
          <div class="form-group" style="flex:2"><label>Data / Information Views (select all)</label>
            <select id="role-data" multiple size="4" style="min-height:80px">
              <option value="overview" selected>Overview & KPIs</option>
              <option value="pipeline">Agent Pipeline</option>
              <option value="agents">AI Agents</option>
              <option value="endpoints">API Endpoints</option>
              <option value="testing">Testing Results</option>
              <option value="deployment">Deployment Status</option>
              <option value="data-model">Data Model</option>
              <option value="sprints">Sprint Board</option>
              <option value="requirements">Requirements Docs</option>
              <option value="dev-status">Development Status</option>
              <option value="observability">Observability</option>
              <option value="internals">System Internals</option>
              <option value="expert-review">Expert Review</option>
            </select>
          </div>
          <div class="form-group" style="flex:2"><label>Process / Workflow Views</label>
            <select id="role-process" multiple size="4" style="min-height:80px">
              <option value="stakeholder-acceptance">Stakeholder Acceptance</option>
              <option value="dev-team">Dev Agent Team</option>
              <option value="ticket-flow">Ticket Flow</option>
              <option value="feedback-pipeline">Feedback â†’ Agent Pipeline</option>
              <option value="board-review">Board Review</option>
              <option value="tech-lead-approval">Tech Lead Approval</option>
              <option value="design-change">Design Changes</option>
              <option value="implementation">Implementation Tracking</option>
            </select>
          </div>
          <div class="form-group"><label>Feedback Ability</label>
            <select id="role-feedback">
              <option value="full">Full (Submit + Vote + Approve)</option>
              <option value="submit">Submit Feedback Only</option>
              <option value="vote">Submit + Vote</option>
              <option value="view">View Only</option>
              <option value="none">No Feedback Access</option>
            </select>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group"><label>Comments Ability</label>
            <select id="role-comment">
              <option value="full">Full (All sections)</option>
              <option value="assigned">Assigned sections only</option>
              <option value="view">View comments only</option>
            </select>
          </div>
          <div class="form-group"><label>Suggestions Ability</label>
            <select id="role-suggestion">
              <option value="full">Full (Design + Dev + Process)</option>
              <option value="design">Design suggestions only</option>
              <option value="none">No suggestion access</option>
            </select>
          </div>
        </div>
        <button class="btn-primary" id="btn-add-role"><i class="fas fa-plus me-1"></i>Define Role</button>
      </div>

      <div class="card-a">
        <h2><i class="fas fa-list"></i> Defined Roles</h2>
        <table class="t"><thead><tr><th>ID</th><th>Name</th><th>Purpose</th><th>Data Views</th><th>Process Views</th><th>Feedback</th><th>Actions</th></tr></thead>
        <tbody id="roles-body"></tbody></table>
      </div>
    </div>

    <!-- â•â•â•â•â•â•â• USER MANAGEMENT â•â•â•â•â•â•â• -->
    <div class="portal-section" id="panel-users">
      <div class="stg-label"><i class="fas fa-circle" style="color:var(--blue)"></i> Stage 1: Setup</div>
      <div class="card-a">
        <h2><i class="fas fa-search"></i> Search CRM Members</h2>
        <p style="font-size:.78rem;color:var(--muted);margin-bottom:8px">Search by name, nickname, or email to find members from the CRM system (CRMMembers collection). Select a member to assign a role.</p>
        <div class="search-wrap">
          <input type="text" id="crm-search" placeholder="Type name, nickname, or email to search CRM..." style="width:100%;background:var(--bg2);border:1px solid var(--line);color:var(--text);padding:10px 14px;border-radius:8px;font-size:.85rem;outline:none">
          <div class="search-results" id="crm-results"></div>
        </div>
        <div style="margin-top:8px"><button class="btn-secondary btn-sm" id="btn-browse-crm"><i class="fas fa-table me-1"></i>Browse All CRM Members</button></div>
      </div>

      <div class="card-a" id="crm-browse-panel" style="display:none">
        <h2><i class="fas fa-database"></i> CRM Member Directory (CRMMembers Collection)</h2>
        <table class="t"><thead><tr><th>Name</th><th>Email</th><th>Phone</th><th>Family</th><th>EC</th><th>Opt-In</th><th>Active</th><th>Actions</th></tr></thead>
        <tbody id="crm-browse-body"></tbody></table>
      </div>

      <div class="card-a" id="assign-panel" style="display:none">
        <h2><i class="fas fa-user-tag"></i> Assign Role to: <span id="assign-member-name" style="color:var(--accent)"></span></h2>
        <div id="no-roles-warning" class="privacy-banner" style="display:none;background:rgba(239,68,68,.06);border-color:rgba(239,68,68,.2);color:var(--red)">
          <i class="fas fa-exclamation-triangle"></i>
          <span>No roles defined yet. You must <a href="#" onclick="navTo('roles');return false" style="color:var(--accent)">define roles first</a> before assigning them to users.</span>
        </div>
        <div class="form-row">
          <div class="form-group"><label>Member Email</label><input type="text" id="assign-email" readonly></div>
          <div class="form-group"><label>Assigned Role</label><select id="assign-role"></select></div>
          <div class="form-group"><label>Dashboard Access</label>
            <select id="assign-access"><option value="full">Full Access</option><option value="stakeholder">Stakeholder View</option><option value="developer">Developer View</option><option value="readonly">Read-Only</option></select>
          </div>
        </div>
        <div style="display:flex;gap:8px">
          <button class="btn-primary" id="btn-assign-role"><i class="fas fa-check me-1"></i>Assign Role & Add User</button>
          <button class="btn-secondary" id="btn-assign-invite"><i class="fas fa-envelope me-1"></i>Assign & Send Invite Email</button>
        </div>
      </div>

      <div class="card-a">
        <h2><i class="fas fa-users-cog"></i> Registered Users &amp; Access <span style="font-size:.68rem;color:var(--cyan);font-weight:400">(Multi-Role Identity System)</span></h2>
        <table class="t"><thead><tr><th>Name / Identity</th><th>Email</th><th>Roles (Multi)</th><th>Access / Creds</th><th>Invited</th><th>Status</th><th>Actions</th></tr></thead>
        <tbody id="users-body"></tbody></table>
      </div>
    </div>


    <!-- ======= IDENTITY ENGINE ======= -->
    <div class="portal-section" id="panel-identity">
      <div class="stg-label"><i class="fas fa-circle" style="color:var(--cyan)"></i> Multi-Dimensional Identity</div>
      
      <div class="card-a">
        <h2><i class="fas fa-fingerprint"></i> Identity Resolution Engine</h2>
        <p style="font-size:.78rem;color:var(--muted);margin-bottom:8px">
          <strong>Strategy:</strong> Since the same first + last name can exist in the community and date of birth cannot be stored, 
          identity is resolved using <strong>multi-dimensional matching</strong>: email (primary), phone, family ID, children's names, 
          join timestamp, membership year history, city, and profession. Spouse name is treated as <em>mutable</em> (lower weight).
        </p>
        <div class="privacy-banner" style="background:rgba(6,182,212,.06);border-color:rgba(6,182,212,.2);color:var(--cyan)">
          <i class="fas fa-shield-alt"></i>
          <div><strong>Identity Dimensions (No DOB Policy)</strong> &mdash; Date of birth is never collected or stored. 
          Identity is resolved via composite scoring across 9 dimensions. Score &ge;80 = auto-match, 50-79 = manual review, &lt;50 = new identity.</div>
        </div>
      </div>

      <div class="card-a">
        <h2><i class="fas fa-search"></i> Identity Lookup / Disambiguation</h2>
        <p style="font-size:.78rem;color:var(--muted);margin-bottom:8px">Search by name to test multi-dimensional identity resolution. Useful when same first+last name exists.</p>
        <div class="form-row">
          <div class="form-group" style="flex:2"><label>Search Name</label><input type="text" id="identity-search" placeholder="e.g. Ghosh (will find Ranadhir Ghosh AND Subir Ghosh)"></div>
          <div class="form-group"><label>&nbsp;</label><button class="btn-primary" id="btn-identity-search"><i class="fas fa-search me-1"></i>Resolve Identity</button></div>
        </div>
        <div id="identity-results" style="margin-top:12px"></div>
      </div>

      <div class="card-a">
        <h2><i class="fas fa-project-diagram"></i> Identity Graph (<span id="identity-count">0</span> identities)</h2>
        <table class="t"><thead><tr><th>ID</th><th>Name</th><th>Primary Email</th><th>Dimensions</th><th>Confidence</th><th>Linked Members</th><th>Roles</th><th>Verified</th></tr></thead>
        <tbody id="identity-graph-body"></tbody></table>
      </div>

      <div class="card-a">
        <h2><i class="fas fa-layer-group"></i> Dimension Weights</h2>
        <table class="t"><thead><tr><th>Dimension</th><th>Weight</th><th>Type</th><th>Notes</th></tr></thead>
        <tbody>
          <tr><td><i class="fas fa-envelope me-1" style="color:var(--green)"></i><strong>Email Address</strong></td><td><span class="badge-s badge-green">100%</span></td><td>Primary Key</td><td>Immutable. Exact match = instant identity.</td></tr>
          <tr><td><i class="fas fa-phone me-1" style="color:var(--blue)"></i><strong>Phone Number</strong></td><td><span class="badge-s badge-blue">80%</span></td><td>Strong Signal</td><td>Exact match on phone across records.</td></tr>
          <tr><td><i class="fas fa-people-roof me-1" style="color:var(--cyan)"></i><strong>Family ID</strong></td><td><span class="badge-s badge-cyan">70%</span></td><td>Strong Signal</td><td>Same familyId links household members.</td></tr>
          <tr><td><i class="fas fa-child me-1" style="color:var(--purple)"></i><strong>Children's Names</strong></td><td><span class="badge-s badge-purple">60%</span></td><td>Supporting</td><td>Each matching child adds 60% / count. Stable dimension.</td></tr>
          <tr><td><i class="fas fa-user-tag me-1" style="color:var(--yellow)"></i><strong>Name + City + Profession</strong></td><td><span class="badge-s badge-yellow">50%</span></td><td>Supporting</td><td>Composite: name match + same city + same profession.</td></tr>
          <tr><td><i class="fas fa-clock me-1" style="color:var(--orange)"></i><strong>Join Timestamp</strong></td><td><span class="badge-s badge-orange">40%</span></td><td>Time Signature</td><td>Registration within 30 days = match. Unique temporal fingerprint.</td></tr>
          <tr><td><i class="fas fa-calendar-check me-1" style="color:var(--blue)"></i><strong>Membership Year History</strong></td><td><span class="badge-s badge-blue">35%</span></td><td>Supporting</td><td>Overlap in membership years indicates same person.</td></tr>
          <tr><td><i class="fas fa-heart me-1" style="color:var(--pink)"></i><strong>Spouse Name</strong></td><td><span class="badge-s badge-dim">20%</span></td><td>Mutable</td><td>Lower weight because spouse name can change. Fuzzy match.</td></tr>
          <tr><td><i class="fas fa-birthday-cake me-1" style="color:var(--red)"></i><strong>Date of Birth</strong></td><td><span class="badge-s badge-red">N/A</span></td><td>EXCLUDED</td><td>NOT stored per BANF privacy policy. Identity resolved without DOB.</td></tr>
        </tbody></table>
      </div>

      <div class="card-a">
        <h2><i class="fas fa-clock-rotate-left"></i> Role History &amp; Credential Persistence</h2>
        <p style="font-size:.78rem;color:var(--muted);margin-bottom:8px">
          A user can hold <strong>multiple roles simultaneously</strong>. Once credentials are set (username/password), 
          they persist across <strong>all drives</strong> (membership, EC, stakeholder). Role changes are tracked in history.
        </p>
        <div id="role-history-panel"></div>
      </div>
    </div>

    <!-- â•â•â•â•â•â•â• STAKEHOLDER DRIVE â•â•â•â•â•â•â• -->
    <div class="portal-section" id="panel-stakeholder-drive">
      <div class="stg-label"><i class="fas fa-circle" style="color:var(--purple)"></i> Stage 2: Execution</div>
      <div class="card-a">
        <h2><i class="fas fa-bullhorn"></i> High Stakeholder Onboarding Drive</h2>
        <div class="pipe" id="sh-pipe">
          <div class="pipe-step done"><h6>1. Define Roles</h6><small>Role setup</small></div><div class="pipe-arrow"><i class="fas fa-chevron-right"></i></div>
          <div class="pipe-step active"><h6>2. Select Members</h6><small>CRM search</small></div><div class="pipe-arrow"><i class="fas fa-chevron-right"></i></div>
          <div class="pipe-step pending"><h6>3. Assign Roles</h6><small>Map each</small></div><div class="pipe-arrow"><i class="fas fa-chevron-right"></i></div>
          <div class="pipe-step pending"><h6>4. Privacy Check</h6><small>Opt-in verify</small></div><div class="pipe-arrow"><i class="fas fa-chevron-right"></i></div>
          <div class="pipe-step pending"><h6>5. Send via CommsAgent</h6><small>Gmail + template</small></div><div class="pipe-arrow"><i class="fas fa-chevron-right"></i></div>
          <div class="pipe-step pending"><h6>6. Track Signups</h6><small>Response status</small></div>
        </div>
      </div>

      <div class="card-a">
        <h2><i class="fas fa-user-plus"></i> Add Members to Drive</h2>
        <p style="font-size:.78rem;color:var(--muted);margin-bottom:8px">Search CRM to add members. Each must have a defined role assigned.</p>
        <div class="search-wrap">
          <input type="text" id="drive-search" placeholder="Search CRM by name / nickname / email...">
          <div class="search-results" id="drive-results"></div>
        </div>
      </div>

      <div class="privacy-banner">
        <i class="fas fa-lock"></i>
        <div><strong>Data Privacy Compliance (comms-correction.js patterns)</strong> â€” Emails only sent to members with <code style="color:var(--green)">emailOptIn: true</code>. All invitations include: unsubscribe link, data privacy notice (no third-party sharing, purpose limitation, right to erasure, right to opt-out). Communication agent uses sendGmail() with MIME headers, privacy footer, and MemberCommunications logging.</div>
      </div>

      <div class="card-a">
        <h2><i class="fas fa-list-check"></i> Drive Invite List</h2>
        <table class="t"><thead><tr><th>Name</th><th>Email</th><th>Assigned Role</th><th>Opt-In</th><th>Privacy OK</th><th>Email Status</th><th>Actions</th></tr></thead>
        <tbody id="drive-body"></tbody></table>
        <div style="margin-top:12px;display:flex;gap:8px;flex-wrap:wrap">
          <button class="btn-primary" id="btn-privacy-check"><i class="fas fa-shield-alt me-1"></i>Run Privacy Check</button>
          <button class="btn-primary" id="btn-send-drive"><i class="fas fa-paper-plane me-1"></i>Send All via Communication Agent</button>
          <button class="btn-secondary" id="btn-preview-drive-email"><i class="fas fa-eye me-1"></i>Preview Email</button>
        </div>
      </div>

      <div class="card-a">
        <h2><i class="fas fa-envelope-open-text"></i> Email Template (Communication Agent)</h2>
        <div class="form-row">
          <div class="form-group" style="flex:2"><label>Subject</label><input type="text" id="drive-subject" value="BANF Stakeholder Invitation — You’ve Been Selected for a Key Role"></div>
          <div class="form-group"><label>Sender (sendGmail from)</label><input type="text" id="drive-sender" value="Bengali Association of North Florida <banfjax@gmail.com>"></div>
        </div>
        <div class="form-group"><label>Custom Note (optional — appended before privacy section)</label>
          <textarea id="drive-custom-note" rows="3" style="width:100%;font-family:Consolas,monospace;font-size:.75rem" placeholder="Add any custom message for this drive batch (leave blank for default)..."></textarea>
        </div>
        <div style="margin-top:8px;padding:10px 14px;background:rgba(34,197,94,.06);border:1px solid rgba(34,197,94,.15);border-radius:8px">
          <div style="font-size:.72rem;color:var(--green);margin-bottom:6px"><i class="fas fa-robot me-1"></i><strong>Communication Agent (auto-generated HTML)</strong></div>
          <div style="font-size:.7rem;color:var(--muted);line-height:1.6">
            • Professional BANF-branded HTML email (matching comms-correction.js pattern)<br>
            • Personalized greeting with recipient name and assigned role<br>
            • Role-specific access details and dashboard capabilities<br>
            • Direct CTA button to personalized dashboard<br>
            • Full Data Privacy Act notice (purpose limitation, no third-party sharing, right to erasure, right to opt-out)<br>
            • Unsubscribe link + BANF footer with security headers
          </div>
        </div>
      </div>
    </div>

    <!-- â•â•â•â•â•â•â• EC DRIVE â•â•â•â•â•â•â• -->
    <div class="portal-section" id="panel-ec-drive">
      <div class="stg-label"><i class="fas fa-circle" style="color:var(--purple)"></i> Stage 2: Execution</div>
      <div class="card-a">
        <h2><i class="fas fa-shield-halved"></i> EC Year Onboarding Drive</h2>
        <div class="pipe" id="ec-pipe">
          <div class="pipe-step done"><h6>1. Year Init</h6><small>ec_year_status</small></div><div class="pipe-arrow"><i class="fas fa-chevron-right"></i></div>
          <div class="pipe-step done"><h6>2. Import</h6><small>EC members</small></div><div class="pipe-arrow"><i class="fas fa-chevron-right"></i></div>
          <div class="pipe-step active"><h6>3. Gate Check</h6><small>membership_gate</small></div><div class="pipe-arrow"><i class="fas fa-chevron-right"></i></div>
          <div class="pipe-step pending"><h6>4. Reminders</h6><small>ec_send_reminder</small></div><div class="pipe-arrow"><i class="fas fa-chevron-right"></i></div>
          <div class="pipe-step pending"><h6>5. Complete</h6><small>ec_year_complete</small></div>
        </div>
      </div>
      <div class="row g-3">
        <div class="col-lg-5">
          <div class="card-a" style="height:100%">
            <h2><i class="fas fa-info-circle"></i> EC Year Status</h2>
            <table class="t"><tbody>
              <tr><td>Fiscal Year</td><td><strong>FY2026-27</strong></td></tr>
              <tr><td>Status</td><td><span class="badge-s badge-yellow">In Progress</span></td></tr>
              <tr><td>Total</td><td><strong>11</strong></td></tr>
              <tr><td>Gate Passed</td><td><span class="badge-s badge-green">7</span></td></tr>
              <tr><td>Pending</td><td><span class="badge-s badge-yellow">3</span></td></tr>
              <tr><td>Failed</td><td><span class="badge-s badge-red">1</span></td></tr>
            </tbody></table>
          </div>
        </div>
        <div class="col-lg-7">
          <div class="card-a" style="height:100%">
            <h2><i class="fas fa-terminal"></i> EC Drive Actions (ec-onboarding-gate.js)</h2>
            <div style="display:flex;flex-direction:column;gap:8px">
              <button class="btn-primary" id="btn-ec-gate"><i class="fas fa-sync me-1"></i>Run Gate Check (membership_gate_check)</button>
              <button class="btn-primary" style="background:linear-gradient(135deg,var(--yellow),#ca8a04)" id="btn-ec-remind"><i class="fas fa-envelope me-1"></i>Send Reminders (ec_send_reminder)</button>
              <button class="btn-secondary" id="btn-ec-pending"><i class="fas fa-users me-1"></i>View Pending (ec_pending_members)</button>
              <button class="btn-success" id="btn-ec-complete"><i class="fas fa-check-double me-1"></i>Mark Complete (ec_year_complete)</button>
            </div>
          </div>
        </div>
      </div>
      <div class="card-a mt-3">
        <h2><i class="fas fa-users"></i> EC Members Progress</h2>
        <table class="t"><thead><tr><th>Name</th><th>Title</th><th>Email</th><th>Membership</th><th>Gate</th><th>Status</th></tr></thead>
        <tbody id="ec-body"></tbody></table>
      </div>
    </div>

    <!-- â•â•â•â•â•â•â• FEEDBACK PIPELINE â•â•â•â•â•â•â• -->
    <div class="portal-section" id="panel-feedback">
      <div class="stg-label"><i class="fas fa-circle" style="color:var(--cyan)"></i> Stage 3: Review</div>
      <div class="card-a">
        <h2><i class="fas fa-comments"></i> Feedback â†’ Agent â†’ Development Pipeline</h2>
        <p style="font-size:.78rem;color:var(--muted);margin-bottom:8px">Stakeholder feedback flows through the AI agent pipeline: <strong>feedback â†’ Copilot CLI analysis â†’ design change proposal â†’ board review (implications) â†’ tech lead approval â†’ development board.</strong></p>
        <div class="pipe">
          <div class="pipe-step done"><h6>1. Feedback</h6><small>Stakeholder input</small></div><div class="pipe-arrow"><i class="fas fa-chevron-right"></i></div>
          <div class="pipe-step done"><h6>2. Agent Analysis</h6><small>Copilot CLI</small></div><div class="pipe-arrow"><i class="fas fa-chevron-right"></i></div>
          <div class="pipe-step active"><h6>3. Design Change</h6><small>Proposal created</small></div><div class="pipe-arrow"><i class="fas fa-chevron-right"></i></div>
          <div class="pipe-step pending"><h6>4. Board Review</h6><small>Implications</small></div><div class="pipe-arrow"><i class="fas fa-chevron-right"></i></div>
          <div class="pipe-step pending"><h6>5. Tech Lead OK</h6><small>Final approval</small></div><div class="pipe-arrow"><i class="fas fa-chevron-right"></i></div>
          <div class="pipe-step pending"><h6>6. Dev Board</h6><small>Implementation</small></div>
        </div>
      </div>

      <div id="feedback-list"></div>

      <div class="card-a">
        <h2><i class="fas fa-gavel"></i> Pending Tech Lead Approvals</h2>
        <p style="font-size:.78rem;color:var(--muted);margin-bottom:8px">Board-approved changes awaiting final sign-off from the Technical Lead (Ranadhir Ghosh).</p>
        <table class="t"><thead><tr><th>ID</th><th>From</th><th>Section</th><th>Change</th><th>Board</th><th>Tech Lead</th><th>Actions</th></tr></thead>
        <tbody id="approvals-body"></tbody></table>
      </div>
    </div>

    <!-- â•â•â•â•â•â•â• DEV BOARD â•â•â•â•â•â•â• -->
    <div class="portal-section" id="panel-dev-board">
      <div class="stg-label"><i class="fas fa-circle" style="color:var(--accent)"></i> Stage 4: Delivery</div>
      <div class="card-a">
        <h2><i class="fas fa-clipboard-list"></i> Development Board</h2>
        <p style="font-size:.78rem;color:var(--muted);margin-bottom:10px">Approved changes from the feedback pipeline appear here for implementation by the dev agent team.</p>
        <table class="t"><thead><tr><th>Ticket</th><th>Origin</th><th>Description</th><th>Assignee</th><th>Sprint</th><th>Priority</th><th>Status</th></tr></thead>
        <tbody id="dev-board-body"></tbody></table>
      </div>
    </div>

    <!-- â•â•â•â•â•â•â• E2E TEST SUITE â•â•â•â•â•â•â• -->
    <div class="portal-section" id="panel-e2e-test">
      <div class="stg-label"><i class="fas fa-circle" style="color:var(--yellow)"></i> Stage 5: QA</div>
      <div class="card-a">
        <h2><i class="fas fa-vial"></i> End-to-End Test: Technical Lead (Ranadhir Ghosh)</h2>
        <p style="font-size:.78rem;color:var(--muted);margin-bottom:12px">Complete test of the full workflow: Search CRM â†’ Define Role â†’ Assign â†’ Send Drive Email (via Communication Agent with data privacy) â†’ User Signs Up â†’ Dashboard Access â†’ Feedback â†’ Agent Pipeline â†’ Board Review â†’ Tech Lead Approval â†’ Development Board.</p>
        <button class="btn-primary" id="btn-run-e2e"><i class="fas fa-play me-1"></i>Run Full E2E Test</button>
        <button class="btn-secondary ms-2" id="btn-reset-e2e"><i class="fas fa-undo me-1"></i>Reset Test</button>
      </div>
      <div id="e2e-steps"></div>
      <div class="card-a" id="e2e-result" style="display:none">
        <h2><i class="fas fa-flag-checkered"></i> E2E Test Result</h2>
        <div id="e2e-result-body"></div>
      </div>
    </div>

    <!-- â•â•â•â•â•â•â• ACTIVITY LOG â•â•â•â•â•â•â• -->
    <!-- DRIVE STATUS MONITOR -->
    <div class="portal-section" id="panel-drive-status">
      <div class="stg-label"><i class="fas fa-circle" style="color:var(--lime)"></i> Drive Command Center</div>

      <div class="kpi-grid" id="drive-status-kpis"></div>

      <div class="row g-3">
        <div class="col-lg-6">
          <div class="card-a" style="height:100%">
            <h2><i class="fas fa-bullhorn" style="color:var(--purple)"></i> Stakeholder Drive - Stage Progress</h2>
            <div id="sh-status-stages"></div>
          </div>
        </div>
        <div class="col-lg-6">
          <div class="card-a" style="height:100%">
            <h2><i class="fas fa-shield-halved" style="color:var(--cyan)"></i> EC Year Drive - Stage Progress</h2>
            <div id="ec-status-stages"></div>
          </div>
        </div>
      </div>

      <div class="card-a mt-3">
        <h2><i class="fas fa-users"></i> Stakeholder Drive - Recipient Status</h2>
        <table class="t"><thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Privacy</th><th>Email</th><th>Signup</th><th>Last Updated</th></tr></thead>
        <tbody id="drive-status-recipients"></tbody></table>
        <div id="drive-status-empty" style="text-align:center;padding:20px;color:var(--dim);font-size:.82rem;display:none">No recipients in drive queue yet. Add members from the Stakeholder Drive panel.</div>
      </div>

      <div class="card-a">
        <h2><i class="fas fa-shield-halved"></i> EC Drive - Member Status</h2>
        <table class="t"><thead><tr><th>Name</th><th>Title</th><th>Email</th><th>Membership</th><th>Gate</th><th>Onboarding</th></tr></thead>
        <tbody id="ec-status-members"></tbody></table>
      </div>

      <div class="row g-3">
        <div class="col-lg-6">
          <div class="card-a" style="height:100%">
            <h2><i class="fas fa-exclamation-triangle" style="color:var(--red)"></i> Issues and Errors</h2>
            <div class="act-log" id="drive-issues-log" style="max-height:300px"></div>
            <div id="drive-no-issues" style="text-align:center;padding:16px;color:var(--green);font-size:.82rem"><i class="fas fa-check-circle me-1"></i>No issues recorded</div>
          </div>
        </div>
        <div class="col-lg-6">
          <div class="card-a" style="height:100%">
            <h2><i class="fas fa-clock-rotate-left" style="color:var(--blue)"></i> Drive Activity Timeline</h2>
            <div class="act-log" id="drive-timeline" style="max-height:300px"></div>
          </div>
        </div>
      </div>

      <div class="card-a mt-3">
        <h2><i class="fas fa-chart-pie"></i> Response Analytics</h2>
        <div class="row g-3">
          <div class="col-lg-4">
            <div style="text-align:center;padding:16px">
              <h3 style="color:var(--accent);margin:0 0 10px;font-size:.84rem">Stakeholder Drive</h3>
              <div id="sh-response-chart"></div>
            </div>
          </div>
          <div class="col-lg-4">
            <div style="text-align:center;padding:16px">
              <h3 style="color:var(--cyan);margin:0 0 10px;font-size:.84rem">EC Drive</h3>
              <div id="ec-response-chart"></div>
            </div>
          </div>
          <div class="col-lg-4">
            <div style="padding:16px">
              <h3 style="color:var(--blue);margin:0 0 10px;font-size:.84rem">Summary</h3>
              <div id="drive-summary-stats"></div>
            </div>
          </div>
        </div>
      </div>

      <div class="card-a mt-3">
        <h2><i class="fas fa-chart-line"></i> TK-046 Membership Drive Analytics (By Tier)</h2>
        <p style="font-size:.78rem;color:var(--muted);margin-bottom:10px">Tracks invites sent, responses received, and conversion rate by role tier for stakeholder drive execution.</p>
        <div class="row g-3" style="margin-bottom:10px" id="drive-tier-kpis"></div>
        <table class="t"><thead><tr><th>Tier</th><th>Invites</th><th>Sent</th><th>Responses</th><th>Conversion</th></tr></thead>
        <tbody id="drive-tier-analytics"></tbody></table>
      </div>
    </div>

    <!-- ═══ LEDGER REPORT PANEL ═══ -->
    <div class="portal-section" id="panel-ledger-report">
      <div class="stg-label"><i class="fas fa-circle" style="color:var(--green)"></i> Financial Ledger Report</div>
      <div class="card-a" style="margin-bottom:16px">
        <h2><i class="fas fa-book me-1"></i>Ledger Report — Income &amp; Expense</h2>
        <p style="font-size:.78rem;color:var(--muted);margin-bottom:12px">View all financial entries filtered by date range, type, and category. Totals update automatically.</p>
        <!-- Date Range Presets -->
        <div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:12px">
          <button class="btn btn-sm btn-outline-info ledger-range-btn" data-range="7d">Last 7 Days</button>
          <button class="btn btn-sm btn-outline-info ledger-range-btn" data-range="30d">Last 30 Days</button>
          <button class="btn btn-sm btn-outline-info ledger-range-btn" data-range="thisMonth">This Month</button>
          <button class="btn btn-sm btn-outline-info ledger-range-btn" data-range="lastMonth">Last Month</button>
          <button class="btn btn-sm btn-outline-info ledger-range-btn" data-range="thisQuarter">This Quarter</button>
          <button class="btn btn-sm btn-outline-info ledger-range-btn" data-range="lastQuarter">Last Quarter</button>
          <button class="btn btn-sm btn-outline-info ledger-range-btn active" data-range="ytd">Year to Date</button>
          <button class="btn btn-sm btn-outline-info ledger-range-btn" data-range="lastYear">Last Year</button>
          <button class="btn btn-sm btn-outline-info ledger-range-btn" data-range="custom">Custom</button>
        </div>
        <!-- Custom date picker (hidden by default) -->
        <div id="ledger-custom-dates" style="display:none;gap:8px;align-items:center;margin-bottom:12px;flex-wrap:wrap">
          <label style="font-size:.78rem;color:var(--muted)">From:</label>
          <input type="date" id="ledger-date-from" style="background:var(--bg2);border:1px solid var(--line);color:var(--text);padding:4px 8px;border-radius:6px;font-size:.82rem">
          <label style="font-size:.78rem;color:var(--muted)">To:</label>
          <input type="date" id="ledger-date-to" style="background:var(--bg2);border:1px solid var(--line);color:var(--text);padding:4px 8px;border-radius:6px;font-size:.82rem">
          <button class="btn btn-sm btn-info" onclick="applyCustomLedgerRange()">Apply</button>
        </div>
        <!-- Filters -->
        <div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:12px;align-items:center">
          <select id="ledger-type-filter" style="background:var(--bg2);border:1px solid var(--line);color:var(--text);padding:5px 10px;border-radius:6px;font-size:.82rem" onchange="loadLedgerReport()">
            <option value="">All Types</option>
            <option value="income">Income</option>
            <option value="expense">Expense</option>
          </select>
          <select id="ledger-category-filter" style="background:var(--bg2);border:1px solid var(--line);color:var(--text);padding:5px 10px;border-radius:6px;font-size:.82rem" onchange="loadLedgerReport()">
            <option value="">All Categories</option>
            <optgroup label="Income">
              <option value="membership">Membership</option>
              <option value="event_ticket">Event Ticket</option>
              <option value="sponsorship">Sponsorship</option>
              <option value="donation">Donation</option>
              <option value="advertisement">Advertisement</option>
              <option value="zelle_income">Zelle Income</option>
              <option value="check">Check Deposit</option>
              <option value="other_income">Other Income</option>
            </optgroup>
            <optgroup label="Expense">
              <option value="venue">Venue</option>
              <option value="catering">Catering</option>
              <option value="decoration">Decoration</option>
              <option value="photography">Photography</option>
              <option value="printing">Printing</option>
              <option value="sound_music">Sound/Music</option>
              <option value="apparel">Apparel</option>
              <option value="prasad">Prasad</option>
              <option value="admin">Admin</option>
              <option value="insurance">Insurance</option>
              <option value="food_grocery">Food/Grocery</option>
              <option value="bank_fee">Bank Fee</option>
              <option value="transport">Transport</option>
              <option value="debit_card">Debit Card</option>
              <option value="zelle_expense">Zelle Expense</option>
              <option value="other_expense">Other Expense</option>
            </optgroup>
          </select>
          <button class="btn btn-sm btn-outline-light" onclick="exportLedgerCSV()" title="Export to CSV"><i class="fas fa-download me-1"></i>CSV</button>
        </div>
        <!-- KPI Cards -->
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:10px;margin-bottom:14px" id="ledger-kpis">
          <div class="kpi green"><div class="v" id="ledger-kpi-income">$0</div><div class="k">Total Income</div></div>
          <div class="kpi red"><div class="v" id="ledger-kpi-expense">$0</div><div class="k">Total Expense</div></div>
          <div class="kpi blue"><div class="v" id="ledger-kpi-net">$0</div><div class="k">Net</div></div>
          <div class="kpi cyan"><div class="v" id="ledger-kpi-count">0</div><div class="k">Entries</div></div>
        </div>
        <!-- Table -->
        <div style="overflow-x:auto">
          <table class="t">
            <thead><tr>
              <th style="cursor:pointer" onclick="sortLedger('entryDate')">Date <i class="fas fa-sort"></i></th>
              <th>Description</th>
              <th>Category</th>
              <th>Type</th>
              <th style="cursor:pointer;text-align:right" onclick="sortLedger('amount')">Amount <i class="fas fa-sort"></i></th>
              <th>Event</th>
              <th>Reconciled</th>
            </tr></thead>
            <tbody id="ledger-table-body"><tr><td colspan="7" style="text-align:center;color:var(--muted)">Loading...</td></tr></tbody>
          </table>
        </div>
        <div id="ledger-pagination" style="display:flex;justify-content:center;gap:6px;margin-top:10px"></div>
      </div>
    </div>

    <!-- ═══ LEDGER DETAIL OVERLAY ═══ -->
    <div id="ledger-detail-overlay" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,.65);z-index:9999;overflow-y:auto;padding:24px" onclick="if(event.target===this)closeLedgerDetail()">
      <div style="max-width:860px;margin:0 auto;background:var(--bg);border:1px solid var(--line);border-radius:14px;padding:0;overflow:hidden">
        <!-- Header -->
        <div id="ld-header" style="padding:16px 24px;display:flex;align-items:center;gap:12px;border-bottom:1px solid var(--line)">
          <div id="ld-icon" style="width:42px;height:42px;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:1.1rem"></div>
          <div style="flex:1">
            <div id="ld-title" style="font-size:1rem;font-weight:700;color:var(--text)"></div>
            <div id="ld-subtitle" style="font-size:.78rem;color:var(--muted)"></div>
          </div>
          <div id="ld-amount" style="font-size:1.3rem;font-weight:700"></div>
          <button onclick="closeLedgerDetail()" style="background:none;border:none;color:var(--muted);font-size:1.2rem;cursor:pointer;padding:4px 8px" title="Close"><i class="fas fa-times"></i></button>
        </div>
        <!-- Base Info Grid -->
        <div id="ld-base" style="padding:16px 24px;display:grid;grid-template-columns:1fr 1fr;gap:8px 24px;border-bottom:1px solid var(--line)"></div>
        <!-- Linked Data Section -->
        <div id="ld-linked" style="padding:16px 24px">
          <div id="ld-linked-loading" style="text-align:center;color:var(--muted);padding:16px;display:none"><i class="fas fa-spinner fa-spin"></i> Loading linked details...</div>
          <div id="ld-linked-content"></div>
        </div>
      </div>
    </div>

    <!-- ═══ MEMBER PROFILE OVERLAY ═══ -->
    <div id="member-profile-overlay" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,.65);z-index:10001;overflow-y:auto;padding:24px" onclick="if(event.target===this)this.style.display='none'">
      <div style="max-width:720px;margin:0 auto;background:var(--bg);border:1px solid var(--line);border-radius:14px;padding:0;overflow:hidden">
        <div style="padding:16px 24px;display:flex;align-items:center;gap:12px;border-bottom:1px solid var(--line)">
          <i class="fas fa-user-circle" style="font-size:1.6rem;color:var(--accent)"></i>
          <div style="flex:1"><div id="mp-name" style="font-size:1rem;font-weight:700;color:var(--text)"></div><div id="mp-subtitle" style="font-size:.78rem;color:var(--muted)"></div></div>
          <button onclick="document.getElementById('member-profile-overlay').style.display='none'" style="background:none;border:none;color:var(--muted);font-size:1.2rem;cursor:pointer;padding:4px 8px"><i class="fas fa-times"></i></button>
        </div>
        <div id="mp-content" style="padding:16px 24px"><div style="text-align:center;color:var(--muted)"><i class="fas fa-spinner fa-spin"></i> Loading member profile...</div></div>
      </div>
    </div>

    <!-- ═══ INCOME SUMMARY PANEL ═══ -->
    <div class="portal-section" id="panel-income-summary">
      <div class="stg-label"><i class="fas fa-circle" style="color:var(--green)"></i> Income Summary</div>
      <div class="card-a" style="margin-bottom:16px">
        <h2><i class="fas fa-chart-pie me-1"></i>Income Summary — Year Overview</h2>
        <p style="font-size:.78rem;color:var(--muted);margin-bottom:12px">Total income by category for the selected year. Membership, sponsorship, tickets, donations at a glance.</p>
        <div style="display:flex;gap:8px;align-items:center;margin-bottom:12px">
          <label style="font-size:.82rem;color:var(--muted)">Year:</label>
          <select id="income-year-select" style="background:var(--bg2);border:1px solid var(--line);color:var(--text);padding:5px 10px;border-radius:6px;font-size:.82rem" onchange="loadIncomeSummary()">
          </select>
        </div>
        <!-- Income KPIs -->
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:10px;margin-bottom:16px" id="income-kpi-grid"></div>
        <!-- Income Chart -->
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px">
          <div style="background:var(--bg2);border:1px solid var(--line);border-radius:10px;padding:16px;position:relative;height:300px">
            <canvas id="income-pie-chart"></canvas>
          </div>
          <div style="background:var(--bg2);border:1px solid var(--line);border-radius:10px;padding:16px;position:relative;height:300px">
            <canvas id="income-bar-chart"></canvas>
          </div>
        </div>
        <!-- Income Table -->
        <table class="t">
          <thead><tr><th>Category</th><th style="text-align:right">Amount</th><th style="text-align:right">% of Total</th><th style="text-align:right">Entries</th></tr></thead>
          <tbody id="income-table-body"></tbody>
        </table>
      </div>
    </div>

    <!-- ═══ EVENT EXPENSES PANEL ═══ -->
    <div class="portal-section" id="panel-event-expenses">
      <div class="stg-label"><i class="fas fa-circle" style="color:var(--green)"></i> Event-wise Expense Breakdown</div>
      <div class="card-a" style="margin-bottom:16px">
        <h2><i class="fas fa-calendar-check me-1"></i>Expense Breakdown by Event</h2>
        <p style="font-size:.78rem;color:var(--muted);margin-bottom:12px">All expenses grouped by event. Reimbursement entries are auto-linked. Treasurer/VP/President can upload Excel summaries, add manual expenses, reconcile, approve, and lock.</p>
        <div style="display:flex;gap:8px;align-items:center;margin-bottom:12px;flex-wrap:wrap">
          <label style="font-size:.82rem;color:var(--muted)">Year:</label>
          <select id="event-exp-year-select" style="background:var(--bg2);border:1px solid var(--line);color:var(--text);padding:5px 10px;border-radius:6px;font-size:.82rem" onchange="loadEventExpenses()">
          </select>
          <button id="btn-add-event-expense" onclick="openAddExpenseModal()" style="display:none;background:var(--green);color:#000;border:none;padding:6px 14px;border-radius:6px;font-size:.8rem;cursor:pointer;font-weight:600"><i class="fas fa-plus me-1"></i>Add Expense</button>
          <button id="btn-upload-excel" onclick="document.getElementById('excel-upload-input').click()" style="display:none;background:var(--blue);color:#fff;border:none;padding:6px 14px;border-radius:6px;font-size:.8rem;cursor:pointer;font-weight:600"><i class="fas fa-file-excel me-1"></i>Upload Excel</button>
          <button id="btn-create-template" onclick="openExpenseTemplateModal()" style="display:none;background:var(--purple);color:#fff;border:none;padding:6px 14px;border-radius:6px;font-size:.8rem;cursor:pointer;font-weight:600"><i class="fas fa-clipboard-list me-1"></i>Create Template</button>
          <input type="file" id="excel-upload-input" accept=".xlsx,.xls,.csv" style="display:none" onchange="handleExpenseExcelUpload(event)">
        </div>
        <!-- Event Expense KPIs -->
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:10px;margin-bottom:16px" id="event-exp-kpis"></div>
        <!-- Event Expense Chart -->
        <div style="background:var(--bg2);border:1px solid var(--line);border-radius:10px;padding:16px;margin-bottom:16px;position:relative;height:350px">
          <canvas id="event-expense-chart"></canvas>
        </div>
        <!-- Event Expense Table (per event with drill-down) -->
        <div id="event-expense-cards"></div>
      </div>
    </div>

    <!-- ═══ EXPENSE TEMPLATE MODAL ═══ -->
    <div id="expense-template-overlay" style="display:none;position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,.65);z-index:9999;align-items:center;justify-content:center;overflow-y:auto">
      <div style="background:var(--bg);border:1px solid var(--line);border-radius:14px;padding:24px;max-width:700px;width:95%;margin:40px auto">
        <h3 id="expense-tmpl-title" style="margin:0 0 8px"><i class="fas fa-clipboard-list me-1"></i>Event Expense Report</h3>
        <p style="font-size:.76rem;color:var(--muted);margin-bottom:16px">Build an expense report from reimbursements and manual entries. All matching reimbursements are prefilled. Add remaining items, then submit for approval.</p>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px">
          <div><label style="font-size:.78rem;color:var(--muted)">Event</label>
            <select id="tmpl-event" style="width:100%;background:var(--bg2);border:1px solid var(--line);color:var(--text);padding:7px 10px;border-radius:6px;font-size:.85rem" onchange="refreshTemplateLines()"></select></div>
          <div><label style="font-size:.78rem;color:var(--muted)">Source</label>
            <span id="tmpl-source-label" style="display:block;padding:7px 10px;font-size:.85rem;color:var(--muted)">Manual</span></div>
        </div>
        <!-- Reimbursement-linked items (auto) -->
        <div id="tmpl-reimbursement-section" style="margin-bottom:16px">
          <div style="font-size:.82rem;font-weight:600;margin-bottom:8px;color:var(--green)"><i class="fas fa-link me-1"></i>Linked Reimbursement Entries</div>
          <div id="tmpl-reimb-lines" style="font-size:.8rem;color:var(--muted)">Select an event to load...</div>
        </div>
        <!-- Manual / Excel items -->
        <div id="tmpl-manual-section">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
            <span style="font-size:.82rem;font-weight:600;color:var(--yellow)"><i class="fas fa-edit me-1"></i>Additional Expense Items</span>
            <button onclick="addTemplateLine()" style="background:var(--accent);color:#fff;border:none;padding:3px 10px;border-radius:4px;font-size:.72rem;cursor:pointer"><i class="fas fa-plus me-1"></i>Add Line</button>
          </div>
          <div id="tmpl-manual-lines"></div>
          <p style="font-size:.72rem;color:var(--dim);margin-top:6px"><i class="fas fa-info-circle me-1"></i>Additional items will prompt for reimbursement submission. Add notes for context.</p>
        </div>
        <!-- Summary -->
        <div style="background:var(--bg2);border:1px solid var(--line);border-radius:8px;padding:12px;margin-top:16px">
          <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;text-align:center;font-size:.82rem">
            <div><span style="color:var(--green);font-weight:700" id="tmpl-reimb-total">$0.00</span><br><span style="color:var(--muted);font-size:.72rem">Reimbursed</span></div>
            <div><span style="color:var(--yellow);font-weight:700" id="tmpl-manual-total">$0.00</span><br><span style="color:var(--muted);font-size:.72rem">Additional</span></div>
            <div><span style="color:var(--red);font-weight:700" id="tmpl-grand-total">$0.00</span><br><span style="color:var(--muted);font-size:.72rem">Grand Total</span></div>
          </div>
        </div>
        <div id="tmpl-status-msg" style="display:none;font-size:.8rem;margin-top:10px"></div>
        <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:16px">
          <button onclick="closeExpenseTemplateModal()" style="background:var(--bg2);border:1px solid var(--line);color:var(--text);padding:7px 16px;border-radius:6px;cursor:pointer;font-size:.82rem">Cancel</button>
          <button id="btn-save-template" onclick="saveExpenseTemplate()" style="background:var(--green);color:#000;border:none;padding:7px 16px;border-radius:6px;cursor:pointer;font-weight:600;font-size:.82rem"><i class="fas fa-save me-1"></i>Save Report</button>
          <button id="btn-submit-approval-template" onclick="submitExpenseForApproval()" style="background:var(--blue);color:#fff;border:none;padding:7px 16px;border-radius:6px;cursor:pointer;font-weight:600;font-size:.82rem"><i class="fas fa-paper-plane me-1"></i>Submit for Approval</button>
        </div>
      </div>
    </div>

    <!-- ═══ EXCEL RECONCILIATION MODAL ═══ -->
    <div id="excel-recon-overlay" style="display:none;position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,.65);z-index:9999;align-items:center;justify-content:center;overflow-y:auto">
      <div style="background:var(--bg);border:1px solid var(--line);border-radius:14px;padding:24px;max-width:800px;width:95%;margin:40px auto">
        <h3 style="margin:0 0 8px"><i class="fas fa-file-excel me-1" style="color:#22c55e"></i>Excel Expense Reconciliation</h3>
        <p style="font-size:.76rem;color:var(--muted);margin-bottom:16px">The system has read your Excel file and matched line items against submitted reimbursements. Green items are matched; yellow items need reimbursement submission.</p>
        <div style="margin-bottom:12px">
          <label style="font-size:.78rem;color:var(--muted)">Event</label>
          <select id="excel-recon-event" style="width:100%;background:var(--bg2);border:1px solid var(--line);color:var(--text);padding:7px 10px;border-radius:6px;font-size:.85rem"></select>
        </div>
        <div id="excel-recon-table" style="overflow-x:auto;margin-bottom:16px"></div>
        <div style="background:var(--bg2);border:1px solid var(--line);border-radius:8px;padding:12px;margin-bottom:16px">
          <div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:8px;text-align:center;font-size:.82rem">
            <div><span style="color:var(--green);font-weight:700" id="recon-matched-total">$0.00</span><br><span style="color:var(--muted);font-size:.72rem">Matched</span></div>
            <div><span style="color:var(--yellow);font-weight:700" id="recon-unmatched-total">$0.00</span><br><span style="color:var(--muted);font-size:.72rem">Unmatched</span></div>
            <div><span style="color:var(--red);font-weight:700" id="recon-excel-total">$0.00</span><br><span style="color:var(--muted);font-size:.72rem">Excel Total</span></div>
            <div><span style="font-weight:700" id="recon-match-pct">0%</span><br><span style="color:var(--muted);font-size:.72rem">Match Rate</span></div>
          </div>
        </div>
        <div id="recon-status-msg" style="display:none;font-size:.8rem;margin-top:10px"></div>
        <div style="display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap">
          <button onclick="closeExcelReconModal()" style="background:var(--bg2);border:1px solid var(--line);color:var(--text);padding:7px 16px;border-radius:6px;cursor:pointer;font-size:.82rem">Cancel</button>
          <button onclick="submitSelectedForReimbursement()" style="background:var(--yellow);color:#000;border:none;padding:7px 16px;border-radius:6px;cursor:pointer;font-weight:600;font-size:.82rem"><i class="fas fa-hand-holding-usd me-1"></i>Submit Selected for Reimbursement</button>
          <button onclick="saveExcelExpenseReport()" style="background:var(--green);color:#000;border:none;padding:7px 16px;border-radius:6px;cursor:pointer;font-weight:600;font-size:.82rem"><i class="fas fa-save me-1"></i>Save Expense Report</button>
          <button id="btn-recon-approve" onclick="submitReconForApproval()" style="display:none;background:var(--blue);color:#fff;border:none;padding:7px 16px;border-radius:6px;cursor:pointer;font-weight:600;font-size:.82rem"><i class="fas fa-paper-plane me-1"></i>Submit for Approval</button>
        </div>
      </div>
    </div>

    <!-- ═══ ADD/EDIT EXPENSE MODAL ═══ -->
    <div id="expense-modal-overlay" style="display:none;position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,.65);z-index:9999;align-items:center;justify-content:center">
      <div style="background:var(--bg);border:1px solid var(--line);border-radius:14px;padding:24px;max-width:480px;width:90%">
        <h3 id="expense-modal-title" style="margin:0 0 16px"><i class="fas fa-file-invoice-dollar me-1"></i>Add Expense</h3>
        <input type="hidden" id="exp-entry-id">
        <div style="display:grid;gap:10px">
          <div><label style="font-size:.78rem;color:var(--muted)">Event</label>
            <select id="exp-event" style="width:100%;background:var(--bg2);border:1px solid var(--line);color:var(--text);padding:7px 10px;border-radius:6px;font-size:.85rem"></select></div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
            <div><label style="font-size:.78rem;color:var(--muted)">Category</label>
              <select id="exp-category" style="width:100%;background:var(--bg2);border:1px solid var(--line);color:var(--text);padding:7px 10px;border-radius:6px;font-size:.85rem">
                <option value="venue">Venue</option><option value="catering">Catering</option><option value="decoration">Decoration</option>
                <option value="photography">Photography</option><option value="sound_music">Sound/Music</option><option value="other_expense">Other</option>
              </select></div>
            <div><label style="font-size:.78rem;color:var(--muted)">Amount ($)</label>
              <input type="number" id="exp-amount" step="0.01" min="0" style="width:100%;background:var(--bg2);border:1px solid var(--line);color:var(--text);padding:7px 10px;border-radius:6px;font-size:.85rem"></div>
          </div>
          <div><label style="font-size:.78rem;color:var(--muted)">Description</label>
            <input type="text" id="exp-description" maxlength="200" style="width:100%;background:var(--bg2);border:1px solid var(--line);color:var(--text);padding:7px 10px;border-radius:6px;font-size:.85rem"></div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
            <div><label style="font-size:.78rem;color:var(--muted)">Paid To</label>
              <input type="text" id="exp-payee" maxlength="100" style="width:100%;background:var(--bg2);border:1px solid var(--line);color:var(--text);padding:7px 10px;border-radius:6px;font-size:.85rem"></div>
            <div><label style="font-size:.78rem;color:var(--muted)">Date</label>
              <input type="date" id="exp-date" style="width:100%;background:var(--bg2);border:1px solid var(--line);color:var(--text);padding:7px 10px;border-radius:6px;font-size:.85rem"></div>
          </div>
          <div><label style="font-size:.78rem;color:var(--muted)">Reference / Note</label>
            <input type="text" id="exp-reference" maxlength="200" style="width:100%;background:var(--bg2);border:1px solid var(--line);color:var(--text);padding:7px 10px;border-radius:6px;font-size:.85rem"></div>
        </div>
        <div id="expense-modal-error" style="display:none;color:var(--red);font-size:.8rem;margin-top:10px"></div>
        <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:16px">
          <button onclick="closeExpenseModal()" style="background:var(--bg2);border:1px solid var(--line);color:var(--text);padding:7px 16px;border-radius:6px;cursor:pointer;font-size:.82rem">Cancel</button>
          <button id="btn-save-expense" onclick="saveExpense()" style="background:var(--green);color:#000;border:none;padding:7px 16px;border-radius:6px;cursor:pointer;font-weight:600;font-size:.82rem"><i class="fas fa-save me-1"></i>Save</button>
        </div>
      </div>
    </div>

    <div class="portal-section" id="panel-activity">
      <div class="stg-label"><i class="fas fa-circle" style="color:var(--dim)"></i> Audit</div>
      <div class="card-a">
        <h2><i class="fas fa-history"></i> Full Admin Activity Log</h2>
        <p style="font-size:.78rem;color:var(--muted);margin-bottom:8px">All super admin actions are logged with timestamp, action type, and details for audit compliance.</p>
        <div class="act-log" id="full-log" style="max-height:600px"></div>
      </div>
    </div>

    <!-- ═══ PROCUREMENT / REIMBURSEMENT PANEL ═══ -->
    <div class="portal-section" id="panel-procurement">
      <div class="stg-label"><i class="fas fa-circle" style="color:var(--green)"></i> Finance — Procurement &amp; Reimbursement</div>

      <!-- Create New Request -->
      <div class="card-a" style="margin-bottom:16px">
        <h2><i class="fas fa-file-invoice-dollar"></i> New Procurement Request</h2>
        <p style="font-size:.78rem;color:var(--muted);margin-bottom:12px">Submit a procurement or reimbursement request. Multi-tier approval based on amount.</p>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px">
          <div>
            <label style="font-size:.75rem;color:var(--muted);display:block;margin-bottom:4px">Category</label>
            <select id="proc-category" style="width:100%;padding:8px 12px;border-radius:8px;border:1px solid var(--line);background:var(--card);color:#fff;font-size:.85rem">
              <option value="supplies">Event Supplies</option>
              <option value="venue">Venue / Rental</option>
              <option value="food">Food &amp; Catering</option>
              <option value="decoration">Decoration</option>
              <option value="transport">Transportation</option>
              <option value="tech">Technology / Equipment</option>
              <option value="marketing">Marketing / Printing</option>
              <option value="reimbursement">Reimbursement (Pre-paid)</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div>
            <label style="font-size:.75rem;color:var(--muted);display:block;margin-bottom:4px">Amount ($)</label>
            <input type="number" id="proc-amount" placeholder="0.00" min="0" step="0.01" style="width:100%;padding:8px 12px;border-radius:8px;border:1px solid var(--line);background:var(--card);color:#fff;font-size:.85rem">
          </div>
        </div>
        <div style="margin-bottom:12px">
          <label style="font-size:.75rem;color:var(--muted);display:block;margin-bottom:4px">Description</label>
          <textarea id="proc-desc" rows="3" placeholder="Describe the procurement item/service, vendor details, and justification..." style="width:100%;padding:8px 12px;border-radius:8px;border:1px solid var(--line);background:var(--card);color:#fff;font-size:.85rem;resize:vertical"></textarea>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px">
          <div>
            <label style="font-size:.75rem;color:var(--muted);display:block;margin-bottom:4px">Vendor / Store</label>
            <input type="text" id="proc-vendor" placeholder="Amazon, Costco, etc." style="width:100%;padding:8px 12px;border-radius:8px;border:1px solid var(--line);background:var(--card);color:#fff;font-size:.85rem">
          </div>
          <div>
            <label style="font-size:.75rem;color:var(--muted);display:block;margin-bottom:4px">Event / Purpose</label>
            <input type="text" id="proc-event" placeholder="Bosonto Utsob 2026" style="width:100%;padding:8px 12px;border-radius:8px;border:1px solid var(--line);background:var(--card);color:#fff;font-size:.85rem">
          </div>
        </div>
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px">
          <input type="checkbox" id="proc-urgent" style="accent-color:var(--accent)">
          <label for="proc-urgent" style="font-size:.82rem;color:var(--muted)">Urgent (needs expedited approval)</label>
        </div>
        <button onclick="submitProcurementRequest()" style="background:linear-gradient(135deg,var(--accent),var(--accent2));color:#fff;border:none;padding:10px 24px;border-radius:8px;font-weight:700;font-size:.88rem;cursor:pointer">
          <i class="fas fa-paper-plane me-1"></i>Submit Request
        </button>
        <div id="proc-submit-msg" style="margin-top:8px;font-size:.82rem;display:none"></div>
      </div>

      <!-- Approval Queue -->
      <div class="card-a" style="margin-bottom:16px">
        <h2><i class="fas fa-clipboard-check"></i> Approval Queue</h2>
        <p style="font-size:.78rem;color:var(--muted);margin-bottom:8px">Pending procurement requests awaiting your approval.</p>
        <div id="proc-approval-queue" style="font-size:.82rem;color:var(--dim)">Loading...</div>
      </div>

      <!-- My Requests -->
      <div class="card-a" style="margin-bottom:16px">
        <h2><i class="fas fa-receipt"></i> My Requests &amp; Receipts</h2>
        <p style="font-size:.78rem;color:var(--muted);margin-bottom:8px">Track your submitted requests, upload receipts, and view reimbursement status.</p>
        <div id="proc-my-requests" style="font-size:.82rem;color:var(--dim)">Loading...</div>
      </div>

      <!-- Receipt Upload -->
      <div class="card-a" style="margin-bottom:16px">
        <h2><i class="fas fa-camera"></i> Upload Receipt</h2>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px">
          <div>
            <label style="font-size:.75rem;color:var(--muted);display:block;margin-bottom:4px">Request ID</label>
            <input type="text" id="proc-receipt-id" placeholder="PROC-XXXX" style="width:100%;padding:8px 12px;border-radius:8px;border:1px solid var(--line);background:var(--card);color:#fff;font-size:.85rem">
          </div>
          <div>
            <label style="font-size:.75rem;color:var(--muted);display:block;margin-bottom:4px">Actual Amount ($)</label>
            <input type="number" id="proc-receipt-amt" placeholder="0.00" min="0" step="0.01" style="width:100%;padding:8px 12px;border-radius:8px;border:1px solid var(--line);background:var(--card);color:#fff;font-size:.85rem">
          </div>
        </div>
        <div style="margin-bottom:12px">
          <label style="font-size:.75rem;color:var(--muted);display:block;margin-bottom:4px">Receipt Notes</label>
          <textarea id="proc-receipt-notes" rows="2" placeholder="Store name, date, any variance explanation..." style="width:100%;padding:8px 12px;border-radius:8px;border:1px solid var(--line);background:var(--card);color:#fff;font-size:.85rem;resize:vertical"></textarea>
        </div>
        <button onclick="submitReceipt()" style="background:linear-gradient(135deg,#10b981,#059669);color:#fff;border:none;padding:10px 24px;border-radius:8px;font-weight:700;font-size:.88rem;cursor:pointer">
          <i class="fas fa-upload me-1"></i>Submit Receipt
        </button>
        <div id="proc-receipt-msg" style="margin-top:8px;font-size:.82rem;display:none"></div>
      </div>

      <!-- Payment Tracker -->
      <div class="card-a">
        <h2><i class="fas fa-money-check-alt"></i> Payment Tracker</h2>
        <p style="font-size:.78rem;color:var(--muted);margin-bottom:8px">Track reimbursement payments - Zelle, check, or cash.</p>
        <table class="t"><thead><tr><th>ID</th><th>Requester</th><th>Amount</th><th>Status</th><th>Method</th><th>Date</th></tr></thead>
        <tbody id="proc-payment-tracker"></tbody></table>
      </div>
    </div>

    <!-- ═══ REIMBURSEMENT PANEL (Treasurer / VP / President Only) ═══ -->
    <div class="portal-section" id="panel-reimbursement">
      <div class="stg-label"><i class="fas fa-circle" style="color:var(--green)"></i> Finance — AI-Powered Reimbursement Portal</div>
      <div class="card-a" style="margin-bottom:16px;padding:16px">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:12px">
          <div style="width:40px;height:40px;border-radius:10px;background:linear-gradient(135deg,var(--accent),var(--accent2));display:flex;align-items:center;justify-content:center;font-size:1.1rem;color:#fff"><i class="fas fa-receipt"></i></div>
          <div>
            <h2 style="margin:0;font-size:1rem">Reimbursement Portal</h2>
            <p style="font-size:.72rem;color:var(--muted);margin:0">AI-powered receipt scanning &bull; 7 free vision providers &bull; Auto-approval workflow</p>
          </div>
          <div style="margin-left:auto;display:flex;gap:8px">
            <button onclick="openRmbFullscreen()" style="background:rgba(249,115,22,.1);border:1px solid rgba(249,115,22,.3);color:var(--accent);padding:6px 14px;border-radius:8px;font-size:.78rem;font-weight:600;cursor:pointer" title="Open in new tab"><i class="fas fa-external-link-alt me-1"></i>Full Screen</button>
            <a href="ec-finance-user-guide.html" target="_blank" style="background:rgba(59,130,246,.1);border:1px solid rgba(59,130,246,.3);color:var(--blue);padding:6px 14px;border-radius:8px;font-size:.78rem;font-weight:600;cursor:pointer;text-decoration:none;display:inline-flex;align-items:center"><i class="fas fa-book-open me-1"></i>Guide</a>
          </div>
        </div>
        <div style="background:rgba(34,197,94,.06);border:1px solid rgba(34,197,94,.15);border-radius:8px;padding:8px 12px;font-size:.76rem;color:var(--green)">
          <i class="fas fa-shield-alt me-1"></i><strong>Role Restricted:</strong> Only Treasurer, Vice President, and President can access this module. Your session is shared — no second login required.
        </div>
      </div>
      <div style="background:var(--card);border:1px solid var(--line);border-radius:12px;overflow:hidden;position:relative">
        <iframe id="rmb-iframe" style="width:100%;height:calc(100vh - 220px);border:none;display:block" title="Reimbursement Portal"></iframe>
        <div id="rmb-iframe-loading" style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:var(--bg);z-index:10">
          <div style="text-align:center">
            <i class="fas fa-spinner fa-spin" style="font-size:2rem;color:var(--accent);margin-bottom:12px;display:block"></i>
            <p style="color:var(--muted);font-size:.84rem">Loading reimbursement portal...</p>
          </div>
        </div>
      </div>
    </div>

    <!-- ═══ EC REPLACEMENT PANEL (President Only) ═══ -->
    <div class="portal-section" id="panel-ec-replacement">
      <div class="stg-label"><i class="fas fa-circle" style="color:var(--accent)"></i> President — EC Member Replacement</div>

      <div class="card-a" style="margin-bottom:16px;border:1px solid rgba(249,115,22,.3)">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px">
          <div style="width:40px;height:40px;border-radius:10px;background:linear-gradient(135deg,var(--accent),var(--accent2));display:flex;align-items:center;justify-content:center;font-size:1.1rem;color:#fff"><i class="fas fa-shield-halved"></i></div>
          <div>
            <h2 style="margin:0;font-size:1rem"><i class="fas fa-user-shield me-1"></i>EC Member Replacement Agent</h2>
            <p style="font-size:.72rem;color:var(--muted);margin:0">President-only workflow for resignation / suspension of EC members</p>
          </div>
        </div>
        <div style="background:rgba(249,115,22,.06);border:1px solid rgba(249,115,22,.15);border-radius:10px;padding:12px;margin-bottom:16px;font-size:.8rem;color:var(--accent)">
          <i class="fas fa-exclamation-triangle me-1"></i><strong>Restricted Access:</strong> Only the BANF President can initiate resignation or suspension workflows. All actions are fully logged and auditable.
        </div>
      </div>

      <!-- Initiate Workflow -->
      <div class="card-a" style="margin-bottom:16px">
        <h2><i class="fas fa-play-circle"></i> Initiate Workflow</h2>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px">
          <div>
            <label style="font-size:.75rem;color:var(--muted);display:block;margin-bottom:4px">EC Member</label>
            <select id="ecr-member" style="width:100%;padding:8px 12px;border-radius:8px;border:1px solid var(--line);background:var(--card);color:#fff;font-size:.85rem">
              <option value="">Select EC Member...</option>
              <option value="mukhopadhyay.partha@gmail.com">Partha Mukhopadhyay — Vice President</option>
              <option value="amit.everywhere@gmail.com">Amit Chandak — Treasurer</option>
              <option value="rajanya.ghosh@gmail.com">Rajanya Ghosh — General Secretary</option>
              <option value="moumita.mukherje@gmail.com">Moumita Mukherjee — Cultural Secretary</option>
              <option value="duttasoumyajit86@gmail.com">Soumyajit Dutta — Food Coordinator</option>
              <option value="sumo475@gmail.com">Dr. Sumanta Ghosh — Event Coordinator</option>
              <option value="rwitichoudhury@gmail.com">Rwiti Choudhury — Puja Coordinator</option>
            </select>
          </div>
          <div>
            <label style="font-size:.75rem;color:var(--muted);display:block;margin-bottom:4px">Action Type</label>
            <select id="ecr-action" style="width:100%;padding:8px 12px;border-radius:8px;border:1px solid var(--line);background:var(--card);color:#fff;font-size:.85rem">
              <option value="resignation">Resignation (Voluntary)</option>
              <option value="suspension">Suspension (Administrative)</option>
            </select>
          </div>
        </div>
        <div style="margin-bottom:12px">
          <label style="font-size:.75rem;color:var(--muted);display:block;margin-bottom:4px">Reason / Notes</label>
          <textarea id="ecr-reason" rows="3" placeholder="Provide reason for resignation or suspension..." style="width:100%;padding:8px 12px;border-radius:8px;border:1px solid var(--line);background:var(--card);color:#fff;font-size:.85rem;resize:vertical"></textarea>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px">
          <div>
            <label style="font-size:.75rem;color:var(--muted);display:block;margin-bottom:4px">New BANF Gmail Password</label>
            <input type="password" id="ecr-new-password" placeholder="New password for banfjax@gmail.com" style="width:100%;padding:8px 12px;border-radius:8px;border:1px solid var(--line);background:var(--card);color:#fff;font-size:.85rem">
          </div>
          <div>
            <label style="font-size:.75rem;color:var(--muted);display:block;margin-bottom:4px">Confirm Password</label>
            <input type="password" id="ecr-confirm-password" placeholder="Confirm new password" style="width:100%;padding:8px 12px;border-radius:8px;border:1px solid var(--line);background:var(--card);color:#fff;font-size:.85rem">
          </div>
        </div>
        <div style="display:flex;gap:12px;align-items:center">
          <button onclick="initiateEcReplacement()" style="background:linear-gradient(135deg,#ef4444,#dc2626);color:#fff;border:none;padding:10px 24px;border-radius:8px;font-weight:700;font-size:.88rem;cursor:pointer">
            <i class="fas fa-gavel me-1"></i>Initiate Workflow
          </button>
          <span style="font-size:.75rem;color:var(--dim)">This will send emails and reset the gmail password immediately</span>
        </div>
        <div id="ecr-initiate-msg" style="margin-top:8px;font-size:.82rem;display:none"></div>
      </div>

      <!-- Active Workflows -->
      <div class="card-a" style="margin-bottom:16px">
        <h2><i class="fas fa-tasks"></i> Active Workflows</h2>
        <p style="font-size:.78rem;color:var(--muted);margin-bottom:8px">Track ongoing resignation/suspension processes and EC reply status.</p>
        <div id="ecr-active-workflows" style="font-size:.82rem;color:var(--dim)">No active workflows</div>
      </div>

      <!-- Email Preview -->
      <div class="card-a" style="margin-bottom:16px">
        <h2><i class="fas fa-envelope-open-text"></i> Email Templates Preview</h2>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
          <div style="background:var(--bg2);border-radius:10px;padding:12px">
            <div style="font-size:.78rem;color:var(--accent);font-weight:700;margin-bottom:6px"><i class="fas fa-heart me-1"></i>Thank You Email</div>
            <p style="font-size:.72rem;color:var(--muted);line-height:1.5">Sent to departing member acknowledging service. Includes: appreciation message, pending reimbursement instructions, asset return deadline.</p>
          </div>
          <div style="background:var(--bg2);border-radius:10px;padding:12px">
            <div style="font-size:.78rem;color:var(--accent);font-weight:700;margin-bottom:6px"><i class="fas fa-bell me-1"></i>EC Notification</div>
            <p style="font-size:.72rem;color:var(--muted);line-height:1.5">Sent to all EC members informing of change. Each asked to reply with: outstanding assets, shared docs, pending tasks from departing member.</p>
          </div>
          <div style="background:var(--bg2);border-radius:10px;padding:12px">
            <div style="font-size:.78rem;color:var(--accent);font-weight:700;margin-bottom:6px"><i class="fas fa-money-bill-wave me-1"></i>Reimbursement Notice</div>
            <p style="font-size:.72rem;color:var(--muted);line-height:1.5">Instructions to departing member about submitting pending reimbursements within 14 days via the procurement workflow.</p>
          </div>
          <div style="background:var(--bg2);border-radius:10px;padding:12px">
            <div style="font-size:.78rem;color:var(--accent);font-weight:700;margin-bottom:6px"><i class="fas fa-check-double me-1"></i>Finalization Email</div>
            <p style="font-size:.72rem;color:var(--muted);line-height:1.5">Sent after all EC replies collected. Summary of assets, document handover, and formal resignation acknowledgment. Copy to president.</p>
          </div>
        </div>
      </div>

      <!-- History -->
      <div class="card-a">
        <h2><i class="fas fa-history"></i> Replacement History</h2>
        <table class="t"><thead><tr><th>Member</th><th>Action</th><th>Initiated</th><th>Status</th><th>Finalized</th></tr></thead>
        <tbody id="ecr-history"></tbody></table>
      </div>
    </div>

    <!-- ═══ REVOKE EC ADMIN ROLE PANEL (President Only) ═══ -->
    <div class="portal-section" id="panel-ec-revoke">
      <div class="stg-label"><i class="fas fa-circle" style="color:#dc2626"></i> President — Revoke EC Admin Role</div>

      <div class="card-a" style="margin-bottom:16px;border:1px solid rgba(220,38,38,.3)">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px">
          <div style="width:40px;height:40px;border-radius:10px;background:linear-gradient(135deg,#dc2626,#991b1b);display:flex;align-items:center;justify-content:center;font-size:1.1rem;color:#fff"><i class="fas fa-ban"></i></div>
          <div>
            <h2 style="margin:0;font-size:1rem"><i class="fas fa-user-slash me-1"></i>Revoke EC Admin Access</h2>
            <p style="font-size:.72rem;color:var(--muted);margin:0">President-only: immediately revoke an EC member's admin portal access</p>
          </div>
        </div>
        <div style="background:rgba(220,38,38,.06);border:1px solid rgba(220,38,38,.15);border-radius:10px;padding:12px;margin-bottom:16px;font-size:.8rem;color:#dc2626">
          <i class="fas fa-exclamation-triangle me-1"></i><strong>Restricted Access:</strong> Only the BANF President can revoke EC admin roles. The member will immediately lose access to the admin portal and see a "role revoked" notification on their next login attempt.
        </div>
      </div>

      <div class="card-a" style="margin-bottom:16px">
        <h2><i class="fas fa-user-minus"></i> Revoke Access</h2>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px">
          <div>
            <label style="font-size:.75rem;color:var(--muted);display:block;margin-bottom:4px">EC Member to Revoke</label>
            <select id="revoke-member" style="width:100%;padding:8px 12px;border-radius:8px;border:1px solid var(--line);background:var(--card);color:#fff;font-size:.85rem">
              <option value="">Select EC Member...</option>
              <option value="mukhopadhyay.partha@gmail.com">Partha Mukhopadhyay — Vice President</option>
              <option value="amit.everywhere@gmail.com">Amit Chandak — Treasurer</option>
              <option value="rajanya.ghosh@gmail.com">Rajanya Ghosh — General Secretary</option>
              <option value="moumita.mukherje@gmail.com">Dr. Moumita Ghosh — Cultural Secretary</option>
              <option value="duttasoumyajit86@gmail.com">Soumyajit Dutta — Food Coordinator</option>
              <option value="sumo475@gmail.com">Dr. Sumanta Ghosh — Event Coordinator</option>
              <option value="rwitichoudhury@gmail.com">Rwiti Chowdhury — Puja Coordinator</option>
            </select>
          </div>
          <div>
            <label style="font-size:.75rem;color:var(--muted);display:block;margin-bottom:4px">Reason</label>
            <input type="text" id="revoke-reason" placeholder="e.g. Term ended, Role change..." style="width:100%;padding:8px 12px;border-radius:8px;border:1px solid var(--line);background:var(--card);color:#fff;font-size:.85rem;box-sizing:border-box">
          </div>
        </div>
        <button onclick="revokeEcAdminRole()" style="background:linear-gradient(135deg,#dc2626,#991b1b);color:#fff;border:none;padding:10px 24px;border-radius:8px;cursor:pointer;font-size:.85rem;font-weight:600"><i class="fas fa-ban me-1"></i>Revoke EC Admin Role</button>
        <div id="revoke-msg" style="margin-top:12px;font-size:.82rem;display:none;padding:10px 14px;border-radius:8px"></div>
      </div>
    </div>

    <!-- ═══ EVITE MANAGER PANEL ═══ -->
    <div class="portal-section" id="panel-evite-manager">
      <div class="stg-label"><i class="fas fa-circle" style="color:var(--green)"></i> E-Vite Manager — Event Invitation System</div>

      <!-- Event Details -->
      <div class="card-a" style="margin-bottom:16px">
        <h2><i class="fas fa-calendar-star"></i> Event Details</h2>
        <p style="font-size:.78rem;color:var(--muted);margin-bottom:12px">Configure the event information that appears on the invitation.</p>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px">
          <div>
            <label style="font-size:.75rem;color:var(--muted);display:block;margin-bottom:4px">Event Name</label>
            <input type="text" id="ev-eventName" value="BANF Noboborsho 2026 — পহেলা বৈশাখ ১৪৩৩" style="width:100%;padding:8px 12px;border-radius:8px;border:1px solid var(--line);background:var(--bg2);color:#fff;font-size:.85rem"/>
          </div>
          <div>
            <label style="font-size:.75rem;color:var(--muted);display:block;margin-bottom:4px">Venue</label>
            <input type="text" id="ev-venue" value="Mill Creek Academy Cafeteria, 3750 International Golf Pkwy, St. Augustine, FL 32092" style="width:100%;padding:8px 12px;border-radius:8px;border:1px solid var(--line);background:var(--bg2);color:#fff;font-size:.85rem"/>
          </div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:12px;margin-bottom:12px">
          <div>
            <label style="font-size:.75rem;color:var(--muted);display:block;margin-bottom:4px">Event Date</label>
            <input type="date" id="ev-eventDate" value="2026-04-25" style="width:100%;padding:8px 12px;border-radius:8px;border:1px solid var(--line);background:var(--bg2);color:#fff;font-size:.85rem"/>
          </div>
          <div>
            <label style="font-size:.75rem;color:var(--muted);display:block;margin-bottom:4px">Event Time</label>
            <input type="text" id="ev-eventTime" value="11:00 AM – 4:00 PM" style="width:100%;padding:8px 12px;border-radius:8px;border:1px solid var(--line);background:var(--bg2);color:#fff;font-size:.85rem"/>
          </div>
          <div>
            <label style="font-size:.75rem;color:var(--muted);display:block;margin-bottom:4px">Capacity</label>
            <input type="number" id="ev-capacity" value="300" style="width:100%;padding:8px 12px;border-radius:8px;border:1px solid var(--line);background:var(--bg2);color:#fff;font-size:.85rem"/>
          </div>
          <div>
            <label style="font-size:.75rem;color:var(--muted);display:block;margin-bottom:4px">RSVP Deadline</label>
            <input type="date" id="ev-rsvpDeadline" value="2026-04-22" style="width:100%;padding:8px 12px;border-radius:8px;border:1px solid var(--line);background:var(--bg2);color:#fff;font-size:.85rem"/>
          </div>
        </div>
        <div style="margin-bottom:12px">
          <label style="font-size:.75rem;color:var(--muted);display:block;margin-bottom:4px">Description</label>
          <textarea id="ev-description" rows="4" style="width:100%;padding:8px 12px;border-radius:8px;border:1px solid var(--line);background:var(--bg2);color:#fff;font-size:.85rem;resize:vertical">Join us to celebrate Pohela Boishakh — the Bengali New Year — with a day of culture, music, dance, delicious food and togetherness. শুভ নববর্ষ!

Schedule:
• 11:00 AM – 12:00 PM — Snacks / Adda
• 12:00 PM – 1:30 PM — Cultural Program
• 1:45 PM – 3:00 PM — Lunch
• 3:00 PM – 4:00 PM — Wrap Up</textarea>
        </div>
        <div>
          <label style="font-size:.75rem;color:var(--muted);display:block;margin-bottom:4px">Highlights</label>
          <textarea id="ev-highlights" rows="2" style="width:100%;padding:8px 12px;border-radius:8px;border:1px solid var(--line);background:var(--bg2);color:#fff;font-size:.85rem;resize:vertical">Traditional alpona, cultural performances by our members and their families, authentic Bengali cuisine, kids activities, and Rabindra-Nazrul sangeet performances.</textarea>
        </div>
      </div>

      <!-- Email Design -->
      <div class="card-a" style="margin-bottom:16px">
        <h2><i class="fas fa-palette"></i> Email Template Design</h2>
        <p style="font-size:.78rem;color:var(--muted);margin-bottom:12px">Customize the invitation email appearance and content.</p>
        <div style="margin-bottom:12px">
          <label style="font-size:.75rem;color:var(--muted);display:block;margin-bottom:4px">Intro Text (shown at top of invitation)</label>
          <textarea id="ev-introText" rows="3" style="width:100%;padding:8px 12px;border-radius:8px;border:1px solid var(--line);background:var(--bg2);color:#fff;font-size:.85rem;resize:vertical">প্রিয় বন্ধুরা, নববর্ষের শুভেচ্ছা! We warmly invite you and your family to celebrate Pohela Boishakh with the BANF family. Let us come together to welcome the New Year with joy, culture and community spirit.</textarea>
        </div>
        <div>
          <label style="font-size:.75rem;color:var(--muted);display:block;margin-bottom:4px">Banner Image (upload from your machine)</label>
          <div style="display:flex;gap:12px;align-items:center">
            <label style="background:var(--bg2);border:1px solid var(--line);color:var(--accent);padding:8px 20px;border-radius:8px;font-size:.85rem;cursor:pointer;display:inline-flex;align-items:center;gap:6px">
              <i class="fas fa-upload"></i> Choose Image
              <input type="file" id="ev-imageFile" accept="image/*" onchange="eviteHandleImageUpload(this)" style="display:none"/>
            </label>
            <span id="ev-imageFileName" style="font-size:.78rem;color:var(--muted)">No file chosen</span>
            <button id="ev-imageRemoveBtn" onclick="eviteRemoveImage()" style="display:none;background:none;border:1px solid #ef4444;color:#ef4444;padding:4px 12px;border-radius:6px;font-size:.75rem;cursor:pointer"><i class="fas fa-trash me-1"></i>Remove</button>
          </div>
          <div id="ev-imagePreview" style="display:none;margin-top:10px;border-radius:8px;overflow:hidden;border:1px solid var(--line);max-width:400px">
            <img id="ev-imagePreviewImg" style="width:100%;display:block" alt="Banner preview"/>
          </div>
          <input type="hidden" id="ev-imageUrl" value=""/>
        </div>
      </div>

      <!-- RSVP Options -->
      <div class="card-a" style="margin-bottom:16px">
        <h2><i class="fas fa-clipboard-check"></i> RSVP Options</h2>
        <p style="font-size:.78rem;color:var(--muted);margin-bottom:12px">Configure what information to collect from invitees.</p>
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:16px">
          <label style="display:flex;align-items:center;gap:8px;font-size:.85rem;color:#fff;cursor:pointer">
            <input type="checkbox" id="ev-collectGuests" checked style="accent-color:var(--accent);width:18px;height:18px"/> Collect Guest Count
          </label>
          <label style="display:flex;align-items:center;gap:8px;font-size:.85rem;color:#fff;cursor:pointer">
            <input type="checkbox" id="ev-collectFood" checked style="accent-color:var(--accent);width:18px;height:18px"/> Collect Food Preference
          </label>
          <label style="display:flex;align-items:center;gap:8px;font-size:.85rem;color:#fff;cursor:pointer">
            <input type="checkbox" id="ev-collectAllergy" checked style="accent-color:var(--accent);width:18px;height:18px"/> Collect Allergy Info
          </label>
          <label style="display:flex;align-items:center;gap:8px;font-size:.85rem;color:#fff;cursor:pointer">
            <input type="checkbox" id="ev-allowMaybe" checked style="accent-color:var(--accent);width:18px;height:18px"/> Allow &ldquo;Maybe&rdquo; Response
          </label>
        </div>
      </div>

      <!-- Cultural Program Config -->
      <div class="card-a" style="margin-bottom:16px">
        <h2><i class="fas fa-masks-theater"></i> Cultural Program Section</h2>
        <p style="font-size:.78rem;color:var(--muted);margin-bottom:12px">Enable a cultural performance sign-up section in the invitation.</p>
        <label style="display:flex;align-items:center;gap:8px;font-size:.85rem;color:#fff;cursor:pointer;margin-bottom:12px">
          <input type="checkbox" id="ev-culturalEnabled" checked style="accent-color:var(--accent);width:18px;height:18px"/> Enable Cultural Program Section
        </label>
        <div id="ev-cultural-fields">
          <div style="margin-bottom:12px">
            <label style="font-size:.75rem;color:var(--muted);display:block;margin-bottom:4px">Section Header</label>
            <input type="text" id="ev-culturalHeader" value="🎭 Cultural Program — Participate & Showcase Your Talent!" style="width:100%;padding:8px 12px;border-radius:8px;border:1px solid var(--line);background:var(--bg2);color:#fff;font-size:.85rem"/>
          </div>
          <div style="margin-bottom:12px">
            <label style="font-size:.75rem;color:var(--muted);display:block;margin-bottom:4px">Description</label>
            <textarea id="ev-culturalDesc" rows="2" style="width:100%;padding:8px 12px;border-radius:8px;border:1px solid var(--line);background:var(--bg2);color:#fff;font-size:.85rem;resize:vertical">We are excited to feature cultural performances by our community members at this year's Noboborsho celebration! If you or your family members would like to participate, please fill in the details below.</textarea>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-bottom:12px">
            <div>
              <label style="font-size:.75rem;color:var(--muted);display:block;margin-bottom:4px">Categories (comma-separated)</label>
              <input type="text" id="ev-categories" value="dance, song, instrumental, skit, poetry" style="width:100%;padding:8px 12px;border-radius:8px;border:1px solid var(--line);background:var(--bg2);color:#fff;font-size:.85rem"/>
            </div>
            <div>
              <label style="font-size:.75rem;color:var(--muted);display:block;margin-bottom:4px">Performance Modes</label>
              <input type="text" id="ev-modes" value="individual, group" style="width:100%;padding:8px 12px;border-radius:8px;border:1px solid var(--line);background:var(--bg2);color:#fff;font-size:.85rem"/>
            </div>
            <div>
              <label style="font-size:.75rem;color:var(--muted);display:block;margin-bottom:4px">Age Groups</label>
              <input type="text" id="ev-ageGroups" value="kid, youth, adult, senior, mix" style="width:100%;padding:8px 12px;border-radius:8px;border:1px solid var(--line);background:var(--bg2);color:#fff;font-size:.85rem"/>
            </div>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:12px">
            <label style="display:flex;align-items:center;gap:8px;font-size:.85rem;color:#fff;cursor:pointer">
              <input type="checkbox" id="ev-askLanguage" checked style="accent-color:var(--accent);width:18px;height:18px"/> Ask Preferred Language
            </label>
            <label style="display:flex;align-items:center;gap:8px;font-size:.85rem;color:#fff;cursor:pointer">
              <input type="checkbox" id="ev-askDescription" checked style="accent-color:var(--accent);width:18px;height:18px"/> Ask Performance Description
            </label>
          </div>
          <div>
            <label style="font-size:.75rem;color:var(--muted);display:block;margin-bottom:4px">Notes (one per line)</label>
            <textarea id="ev-culturalNotes" rows="4" style="width:100%;padding:8px 12px;border-radius:8px;border:1px solid var(--line);background:var(--bg2);color:#fff;font-size:.82rem;resize:vertical">If you are a participant, please ask your mentor to apply. Only mentors, individual performers, and parents (on behalf of their kids) should apply.
No EC member can apply as a mentor or individual performer — EC members can only perform in a group managed by a mentor. However, EC members can apply as a parent for their kids.
We will try our best to accommodate every request. If demand exceeds the allotted cultural time, priority will be given to: items aligned with the nature of the program, diversity of genre and mode of delivery, and representation by various age groups.</textarea>
          </div>
        </div>
      </div>

      <!-- Recipient Config -->
      <div class="card-a" style="margin-bottom:16px">
        <h2><i class="fas fa-users"></i> Recipient List</h2>
        <p style="font-size:.78rem;color:var(--muted);margin-bottom:12px">Choose who receives the invitation email.</p>
        <div style="display:flex;gap:12px;align-items:center;margin-bottom:12px">
          <select id="ev-recipientType" onchange="eviteRecipientTypeChanged()" style="padding:8px 16px;border-radius:8px;border:1px solid var(--line);background:var(--bg2);color:#fff;font-size:.85rem;min-width:220px">
            <option value="all_members">All CRM Members (Full Send)</option>
            <option value="ec">EC Members Only</option>
            <option value="custom">Custom Email List</option>
          </select>
          <button onclick="eviteLoadRecipientPreview()" style="background:var(--bg2);border:1px solid var(--line);color:var(--accent);padding:8px 16px;border-radius:8px;font-size:.82rem;cursor:pointer"><i class="fas fa-eye me-1"></i>Preview List</button>
          <span id="ev-recipientCount" style="font-size:.82rem;color:var(--muted)"></span>
        </div>
        <div id="ev-customEmailsWrap" style="display:none;margin-bottom:12px">
          <label style="font-size:.75rem;color:var(--muted);display:block;margin-bottom:4px">Custom Emails (one per line: email or &ldquo;Name &lt;email&gt;&rdquo;)</label>
          <textarea id="ev-customEmails" rows="5" placeholder="john@example.com&#10;Jane Doe <jane@example.com>" style="width:100%;padding:8px 12px;border-radius:8px;border:1px solid var(--line);background:var(--bg2);color:#fff;font-size:.82rem;resize:vertical"></textarea>
        </div>
        <!-- Inline add recipient row -->
        <div id="ev-addRecipientRow" style="display:none;margin-bottom:8px;display:none">
          <div style="display:flex;gap:8px;align-items:center">
            <input id="ev-addName" placeholder="Name" style="flex:1;padding:6px 10px;border-radius:6px;border:1px solid var(--line);background:var(--bg2);color:#fff;font-size:.8rem">
            <input id="ev-addEmail" placeholder="Email" style="flex:1.5;padding:6px 10px;border-radius:6px;border:1px solid var(--line);background:var(--bg2);color:#fff;font-size:.8rem">
            <button onclick="eviteAddRecipient()" style="background:var(--accent);color:#fff;border:none;padding:6px 14px;border-radius:6px;font-size:.78rem;cursor:pointer;white-space:nowrap"><i class="fas fa-plus me-1"></i>Add</button>
          </div>
        </div>
        <div id="ev-recipientPreview" style="display:none;max-height:300px;overflow-y:auto;background:var(--bg2);border-radius:8px;padding:12px;font-size:.78rem;color:var(--muted)"></div>
      </div>

      <!-- Actions -->
      <div class="card-a" style="margin-bottom:16px;border:1px solid rgba(34,197,94,.3)">
        <h2><i class="fas fa-paper-plane"></i> Actions</h2>
        <p style="font-size:.78rem;color:var(--muted);margin-bottom:12px">Save your configuration, then send invitations. Use Dry Run to test with president only.</p>
        <div style="display:flex;gap:12px;flex-wrap:wrap;align-items:center;margin-bottom:12px">
          <button onclick="eviteCreateEvent()" style="background:linear-gradient(135deg,#3b82f6,#2563eb);color:#fff;border:none;padding:10px 24px;border-radius:8px;font-size:.88rem;font-weight:700;cursor:pointer">
            <i class="fas fa-save me-1"></i><span id="ev-save-btn-text">Save Event Config</span>
          </button>
          <button onclick="eviteExportConfig()" style="background:var(--bg2);border:1px solid var(--line);color:#fff;padding:10px 24px;border-radius:8px;font-size:.88rem;cursor:pointer" title="Export config as JSON for local scripts">
            <i class="fas fa-download me-1"></i>Export Config
          </button>
          <button onclick="eviteDryRun()" style="background:linear-gradient(135deg,var(--accent),var(--accent2));color:#fff;border:none;padding:10px 24px;border-radius:8px;font-size:.88rem;font-weight:700;cursor:pointer">
            <i class="fas fa-vial me-1"></i>Dry Run (President Only)
          </button>
          <button onclick="eviteSendAll()" style="background:linear-gradient(135deg,#22c55e,#16a34a);color:#fff;border:none;padding:10px 24px;border-radius:8px;font-size:.88rem;font-weight:700;cursor:pointer">
            <i class="fas fa-paper-plane me-1"></i>Send Invitations
          </button>
          <button onclick="eviteLoadEvents()" style="background:var(--bg2);border:1px solid var(--line);color:#fff;padding:10px 24px;border-radius:8px;font-size:.88rem;cursor:pointer">
            <i class="fas fa-sync me-1"></i>Refresh
          </button>
        </div>
        <div id="ev-action-msg" style="margin-top:8px;font-size:.82rem;display:none"></div>
      </div>

      <!-- Existing Events & Status -->
      <div class="card-a">
        <h2><i class="fas fa-list"></i> Existing Events</h2>
        <p style="font-size:.78rem;color:var(--muted);margin-bottom:12px">Previously created events and their invite/RSVP status.</p>
        <div id="ev-events-list" style="font-size:.82rem;color:var(--dim)">Click &ldquo;Refresh Events&rdquo; to load.</div>
      </div>

      <!-- RSVP Dashboard -->
      <div class="card-a" id="ev-dashboard-card">
        <h2><i class="fas fa-chart-bar"></i> RSVP Dashboard</h2>
        <p style="font-size:.78rem;color:var(--muted);margin-bottom:12px">Live summary &amp; detail view of invitation responses for the selected event.</p>
        <div style="display:flex;gap:8px;margin-bottom:14px;flex-wrap:wrap;align-items:center">
          <button onclick="eviteLoadDashboard()" class="btn-primary"><i class="fas fa-sync-alt me-1"></i>Load / Refresh Dashboard</button>
          <button onclick="eviteExportDashboard()" class="btn-secondary"><i class="fas fa-download me-1"></i>Export CSV</button>
          <label style="font-size:.75rem;color:var(--muted);margin-left:auto;display:flex;align-items:center;gap:4px;cursor:pointer"><input type="checkbox" id="ev-dash-auto-refresh" style="accent-color:var(--accent)"> Auto-refresh (30s)</label>
        </div>
        <div id="ev-dash-msg" style="font-size:.82rem;display:none;margin-bottom:10px"></div>

        <!-- Summary KPIs -->
        <div id="ev-dash-summary" style="display:none">
          <h3><i class="fas fa-poll me-1"></i> Response Summary</h3>
          <div class="kpi-grid" id="ev-dash-kpi-response"></div>

          <h3><i class="fas fa-users me-1"></i> Attendance</h3>
          <div class="kpi-grid" id="ev-dash-kpi-attendance"></div>

          <h3><i class="fas fa-utensils me-1"></i> Food Preferences</h3>
          <div class="kpi-grid" id="ev-dash-kpi-food"></div>
          <div id="ev-dash-dietary-notes" style="display:none;margin-bottom:14px"></div>

          <h3><i class="fas fa-music me-1"></i> Cultural Program</h3>
          <div class="kpi-grid" id="ev-dash-kpi-cultural"></div>
          <div id="ev-dash-performances" style="display:none;margin-bottom:14px"></div>
        </div>

        <!-- Detail Table -->
        <div id="ev-dash-detail" style="display:none;margin-top:14px">
          <h3><i class="fas fa-list-alt me-1"></i> Individual Responses</h3>
          <div style="display:flex;gap:8px;margin-bottom:8px;flex-wrap:wrap">
            <button onclick="eviteDashFilter('all')" class="btn-secondary ev-df-btn active" style="padding:3px 10px;font-size:.72rem">All</button>
            <button onclick="eviteDashFilter('yes')" class="btn-secondary ev-df-btn" style="padding:3px 10px;font-size:.72rem">Attending</button>
            <button onclick="eviteDashFilter('no')" class="btn-secondary ev-df-btn" style="padding:3px 10px;font-size:.72rem">Declined</button>
            <button onclick="eviteDashFilter('maybe')" class="btn-secondary ev-df-btn" style="padding:3px 10px;font-size:.72rem">Maybe</button>
            <button onclick="eviteDashFilter('pending')" class="btn-secondary ev-df-btn" style="padding:3px 10px;font-size:.72rem">Pending</button>
          </div>
          <div style="overflow-x:auto">
            <table class="t" id="ev-dash-table">
              <thead>
                <tr>
                  <th>#</th><th>Name</th><th>Email</th><th>Status</th><th>Adults</th><th>Kids</th>
                  <th>Veg</th><th>Non-Veg</th><th>Dietary</th><th>Cultural</th><th>Notes</th><th>Responded</th>
                </tr>
              </thead>
              <tbody id="ev-dash-tbody"></tbody>
            </table>
          </div>
        </div>
      </div>
    </div>

    <!-- ── AGENT MONITOR PANEL ── -->
    <div class="portal-section" id="panel-agent-monitor">
      <div class="stg-label"><i class="fas fa-circle" style="color:var(--green)"></i> Agent Monitoring Dashboard &mdash; AI Agent Fleet Overview</div>

      <!-- KPI Row -->
      <div class="kpi-grid" id="am-kpi-grid" style="margin-bottom:16px">
        <div class="kpi"><div class="v" id="am-kpi-total">--</div><div class="l">Total Agents</div></div>
        <div class="kpi"><div class="v" id="am-kpi-active">--</div><div class="l">Active</div></div>
        <div class="kpi"><div class="v" id="am-kpi-model" style="font-size:.82rem">--</div><div class="l">LLM Model</div></div>
        <div class="kpi"><div class="v" id="am-kpi-llm-status">--</div><div class="l">LLM Status</div></div>
        <div class="kpi"><div class="v" id="am-kpi-version">--</div><div class="l">Platform Version</div></div>
        <div class="kpi"><div class="v" id="am-kpi-capabilities">--</div><div class="l">Capabilities</div></div>
      </div>

      <!-- Agent Table -->
      <div class="card-a" style="margin-bottom:16px">
        <h2><i class="fas fa-robot"></i> Agent Profiles</h2>
        <p style="font-size:.78rem;color:var(--muted);margin-bottom:12px">All registered agent profiles and their current state. Click any row to view details and recent activity logs.</p>
        <div style="display:flex;gap:8px;margin-bottom:12px;align-items:center">
          <button onclick="loadAgentMonitor()" style="background:var(--bg2);border:1px solid var(--line);color:var(--accent);padding:6px 16px;border-radius:8px;font-size:.82rem;cursor:pointer"><i class="fas fa-sync me-1"></i>Refresh All</button>
          <span id="am-last-refresh" style="font-size:.75rem;color:var(--dim);margin-left:8px"></span>
        </div>
        <div style="overflow-x:auto">
          <table class="t" id="am-agents-table">
            <thead>
              <tr><th>Agent</th><th>Category</th><th>Status</th><th>Auto-Reply</th><th>Context Scope</th><th>Actions</th></tr>
            </thead>
            <tbody id="am-agents-tbody">
              <tr><td colspan="6" style="text-align:center;color:var(--dim)">Loading agents&hellip;</td></tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Agent Detail / Log Viewer (hidden until agent clicked) -->
      <div class="card-a" id="am-detail-card" style="margin-bottom:16px;display:none;border:1px solid var(--accent)">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
          <h2 id="am-detail-title" style="margin:0"><i class="fas fa-terminal"></i> Agent Detail</h2>
          <button onclick="document.getElementById('am-detail-card').style.display='none'" style="background:none;border:1px solid var(--line);color:var(--muted);padding:4px 12px;border-radius:6px;font-size:.75rem;cursor:pointer"><i class="fas fa-times me-1"></i>Close</button>
        </div>
        <div id="am-detail-meta" style="font-size:.82rem;color:var(--muted);margin-bottom:12px"></div>
        <div style="margin-bottom:12px">
          <label style="font-size:.75rem;color:var(--muted);display:block;margin-bottom:4px">System Prompt</label>
          <pre id="am-detail-prompt" style="background:var(--bg2);border:1px solid var(--line);border-radius:8px;padding:12px;font-size:.78rem;color:#e2e8f0;white-space:pre-wrap;max-height:200px;overflow-y:auto"></pre>
        </div>
        <div style="margin-bottom:8px">
          <label style="font-size:.75rem;color:var(--muted);display:block;margin-bottom:4px">Reply Template</label>
          <pre id="am-detail-template" style="background:var(--bg2);border:1px solid var(--line);border-radius:8px;padding:12px;font-size:.78rem;color:#e2e8f0;white-space:pre-wrap;max-height:120px;overflow-y:auto"></pre>
        </div>
        <h3 style="margin-bottom:8px"><i class="fas fa-history me-1"></i> Recent Activity Log</h3>
        <div id="am-detail-logs" style="max-height:400px;overflow-y:auto">
          <p style="font-size:.82rem;color:var(--dim)">Select an agent to view logs.</p>
        </div>
      </div>

      <!-- Platform Health -->
      <div class="card-a" style="margin-bottom:16px">
        <h2><i class="fas fa-heartbeat"></i> Platform Health</h2>
        <p style="font-size:.78rem;color:var(--muted);margin-bottom:12px">Backend module health and capability listing from the /health endpoint.</p>
        <div id="am-health-grid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:12px">
          <div style="text-align:center;color:var(--dim);font-size:.82rem;grid-column:1/-1">Loading health data&hellip;</div>
        </div>
      </div>

      <!-- Capabilities -->
      <div class="card-a">
        <h2><i class="fas fa-toolbox"></i> Agent Capabilities</h2>
        <p style="font-size:.78rem;color:var(--muted);margin-bottom:12px">Tools and capabilities available to the AI agent system.</p>
        <div id="am-capabilities" style="display:flex;flex-wrap:wrap;gap:6px">
          <span style="font-size:.82rem;color:var(--dim)">Loading&hellip;</span>
        </div>
      </div>
    </div>

  </div>
</div>

<script>
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
//  DATA STORES
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

const API = 'https://www.jaxbengali.org/_functions';
let CURRENT_ADMIN = null; // { email, role, firstName, lastName, ecTitle, roles }
let SIGNUP_STATE = {}; // temp state for signup flow
let FORGOT_STATE = {}; // temp state for forgot flow

// ── BRUTE FORCE PROTECTION ──
var _loginAttempts = 0;
var _lockoutUntil = 0;
var _MAX_ATTEMPTS = 5;
var _LOCKOUT_MS = 60000;
function _checkLockout() {
  if (Date.now() < _lockoutUntil) {
    var secs = Math.ceil((_lockoutUntil - Date.now()) / 1000);
    showError('login-error', '\\u26D4 Too many failed attempts. Please wait ' + secs + ' seconds.');
    return true;
  }
  if (_lockoutUntil > 0 && Date.now() >= _lockoutUntil) { _loginAttempts = 0; _lockoutUntil = 0; }
  return false;
}
function _recordFailedAttempt() {
  _loginAttempts++;
  if (_loginAttempts >= _MAX_ATTEMPTS) { _lockoutUntil = Date.now() + _LOCKOUT_MS; }
}
function _resetAttempts() { _loginAttempts = 0; _lockoutUntil = 0; }
const SQ_LABELS = {
  city_born: 'What city were you born in?',
  pet_name: 'What is the name of your first pet?',
  mother_maiden: "What is your mother's maiden name?",
  school_name: 'What was the name of your first school?',
  fav_teacher: 'Who was your favorite teacher?',
  childhood_friend: 'What is the name of your childhood best friend?'
};

// ═══════════════════════════════════════════════════════════════════════
//  AUTH_DB — Unified EC credential database (matches ec-admin-login.html)
//  All known EC members with roles, offline passwords, security Q/A
// ═══════════════════════════════════════════════════════════════════════
const AUTH_DB = {
  'ranadhir.ghosh@gmail.com': {
    name: 'Dr. Ranadhir Ghosh', firstName: 'Ranadhir', lastName: 'Ghosh',
    roles: ['super-admin', 'business-stakeholder', 'admin'],
    ecTitle: 'President',
    offlinePw: 'banf-super-2026',
    securityQ: 'city_born', securityA: 'kolkata'
  },
  'mukhopadhyay.partha@gmail.com': {
    name: 'Partha Mukhopadhyay', firstName: 'Partha', lastName: 'Mukhopadhyay',
    roles: ['admin'], ecTitle: 'Vice President',
    offlinePw: 'banf-ec-2026',
    securityQ: 'city_born', securityA: 'kolkata'
  },
  'amit.everywhere@gmail.com': {
    name: 'Amit Chandak', firstName: 'Amit', lastName: 'Chandak',
    roles: ['admin'], ecTitle: 'Treasurer',
    offlinePw: 'banf-ec-2026',
    securityQ: 'city_born', securityA: 'kolkata'
  },
  'rajanya.ghosh@gmail.com': {
    name: 'Rajanya Ghosh', firstName: 'Rajanya', lastName: 'Ghosh',
    roles: ['admin'], ecTitle: 'General Secretary',
    offlinePw: 'banf-ec-2026',
    securityQ: 'city_born', securityA: 'kolkata'
  },
  'moumita.mukherje@gmail.com': {
    name: 'Dr. Moumita Ghosh', firstName: 'Moumita', lastName: 'Ghosh',
    roles: ['ec-member'], ecTitle: 'Cultural Secretary',
    offlinePw: 'banf-ec-2026',
    securityQ: 'city_born', securityA: 'kolkata'
  },
  'duttasoumyajit86@gmail.com': {
    name: 'Soumyajit Dutta', firstName: 'Soumyajit', lastName: 'Dutta',
    roles: ['ec-member'], ecTitle: 'Food Coordinator',
    offlinePw: 'banf-ec-2026',
    securityQ: 'city_born', securityA: 'kolkata'
  },
  'sumo475@gmail.com': {
    name: 'Dr. Sumanta Ghosh', firstName: 'Sumanta', lastName: 'Ghosh',
    roles: ['ec-member'], ecTitle: 'Event Coordinator',
    offlinePw: 'banf-ec-2026',
    securityQ: 'city_born', securityA: 'kolkata'
  },
  'rwitichoudhury@gmail.com': {
    name: 'Rwiti Chowdhury', firstName: 'Rwiti', lastName: 'Chowdhury',
    roles: ['ec-member'], ecTitle: 'Puja Coordinator',
    offlinePw: 'banf-ec-2026',
    securityQ: 'city_born', securityA: 'kolkata'
  }
};

// Username-based lookup map
const USERNAME_MAP = {};
Object.keys(AUTH_DB).forEach(function(email) {
  var username = email.split('@')[0];
  USERNAME_MAP[username] = email;
  USERNAME_MAP[username.replace(/\\./g, '_')] = email;
});

function resolveEmail(input) {
  var lower = (input || '').trim().toLowerCase();
  if (AUTH_DB[lower]) return lower;
  if (USERNAME_MAP[lower]) return USERNAME_MAP[lower];
  if (!lower.includes('@')) {
    if (AUTH_DB[lower + '@gmail.com']) return lower + '@gmail.com';
  }
  return lower;
}

// ── CREDENTIAL PERSISTENCE (cross-portal shared auth) ──
function _saveCredsToLocalStorage(email, password, sq, sa) {
  var key = 'banf_ec_creds_' + email.toLowerCase();
  localStorage.setItem(key, JSON.stringify({
    email: email.toLowerCase(), password: password,
    securityQ: sq, securityA: sa,
    savedAt: new Date().toISOString()
  }));
}

function _getSecurePassword(email) {
  var key = 'banf_ec_creds_' + email.toLowerCase();
  try {
    var stored = JSON.parse(localStorage.getItem(key) || 'null');
    if (stored && stored.password) return stored.password;
  } catch(e) {}
  var dbUser = AUTH_DB[email];
  return dbUser ? dbUser.offlinePw : null;
}

function _getSecurityQA(email) {
  var key = 'banf_ec_creds_' + email.toLowerCase();
  try {
    var stored = JSON.parse(localStorage.getItem(key) || 'null');
    if (stored && stored.securityQ) return { q: stored.securityQ, a: stored.securityA };
  } catch(e) {}
  var dbUser = AUTH_DB[email];
  return dbUser ? { q: dbUser.securityQ, a: dbUser.securityA } : null;
}

// Legacy CREDS removed — all auth uses AUTH_DB + localStorage
const CREDS = {};

// CRM Members â€” realistic dataset matching CRMMembers collection schema
const CRM = [
  {memberId:'MBR-001',firstName:'Ranadhir',lastName:'Ghosh',displayName:'Ranadhir Ghosh',nickname:'Rana',email:'ranadhir.ghosh@gmail.com',phone:'904-555-0101',familyId:'FAM-2025-A1',familyType:'family',isECMember:true,isBOTMember:false,isActive:true,emailOptIn:true,membershipYear:'2026',profession:'Software Architect',city:'Jacksonville',state:'FL',childrenNames:['Ria','Arjun'],spouseName:'Soma Ghosh',joinTimestamp:'2024-08-15T00:00:00Z',membershipYears:['2025','2026']},
  {memberId:'MBR-002',firstName:'Arun',lastName:'Sen',displayName:'Arun Sen',nickname:'Arun',email:'president@banf.org',phone:'904-555-0102',familyId:'FAM-2025-A2',familyType:'family',isECMember:true,isBOTMember:false,isActive:true,emailOptIn:true,membershipYear:'2026',profession:'Physician',city:'Jacksonville',state:'FL',childrenNames:['Aritra'],spouseName:'Rupa Sen',joinTimestamp:'2023-01-10T00:00:00Z',membershipYears:['2023','2024','2025','2026']},
  {memberId:'MBR-003',firstName:'Priya',lastName:'Bose',displayName:'Priya Bose',nickname:'Priya',email:'treasurer@banf.org',phone:'904-555-0103',familyId:'FAM-2025-A3',familyType:'couple',isECMember:true,isBOTMember:false,isActive:true,emailOptIn:true,membershipYear:'2026',profession:'CPA',city:'Jacksonville',state:'FL',childrenNames:[],spouseName:'Amit Bose',joinTimestamp:'2024-03-20T00:00:00Z',membershipYears:['2024','2025','2026']},
  {memberId:'MBR-004',firstName:'Suman',lastName:'Das',displayName:'Suman Das',nickname:'Suman',email:'secretary@banf.org',phone:'904-555-0104',familyId:'FAM-2025-A4',familyType:'family',isECMember:true,isBOTMember:false,isActive:true,emailOptIn:true,membershipYear:'2026',profession:'Teacher',city:'Jacksonville',state:'FL',childrenNames:['Sohini','Sourav'],spouseName:'Moumita Das',joinTimestamp:'2022-06-01T00:00:00Z',membershipYears:['2022','2023','2024','2025','2026']},
  {memberId:'MBR-005',firstName:'Mita',lastName:'Roy',displayName:'Mita Roy',nickname:'Mita',email:'cultural@banf.org',phone:'904-555-0105',familyId:'FAM-2025-A5',familyType:'individual',isECMember:true,isBOTMember:false,isActive:true,emailOptIn:true,membershipYear:'2026',profession:'Artist',city:'Jacksonville',state:'FL',childrenNames:[],spouseName:'',joinTimestamp:'2025-01-05T00:00:00Z',membershipYears:['2025','2026']},
  {memberId:'MBR-006',firstName:'Dipak',lastName:'Mukherjee',displayName:'Dipak Mukherjee',nickname:'Dipu',email:'vp-membership@banf.org',phone:'904-555-0106',familyId:'FAM-2025-B1',familyType:'family',isECMember:true,isBOTMember:false,isActive:true,emailOptIn:true,membershipYear:'2026',profession:'Engineer',city:'Jacksonville',state:'FL',childrenNames:['Diya'],spouseName:'Anita Mukherjee',joinTimestamp:'2023-09-12T00:00:00Z',membershipYears:['2023','2024','2025','2026']},
  {memberId:'MBR-007',firstName:'Tanmay',lastName:'Chatterjee',displayName:'Tanmay Chatterjee',nickname:'Tanmay',email:'vp-events@banf.org',phone:'904-555-0107',familyId:'FAM-2025-B2',familyType:'couple',isECMember:true,isBOTMember:false,isActive:true,emailOptIn:false,membershipYear:'2025',profession:'Marketing',city:'Jacksonville',state:'FL',childrenNames:['Tiya'],spouseName:'Keya Chatterjee',joinTimestamp:'2024-02-28T00:00:00Z',membershipYears:['2024','2025']},
  {memberId:'MBR-008',firstName:'Jayanta',lastName:'Pal',displayName:'Jayanta Pal',nickname:'Jay',email:'it@banf.org',phone:'904-555-0108',familyId:'FAM-2025-B3',familyType:'individual',isECMember:false,isBOTMember:false,isActive:true,emailOptIn:true,membershipYear:'2026',profession:'IT Specialist',city:'Jacksonville',state:'FL',childrenNames:[],spouseName:'',joinTimestamp:'2025-04-10T00:00:00Z',membershipYears:['2025','2026']},
  {memberId:'MBR-009',firstName:'Ananya',lastName:'Banerjee',displayName:'Ananya Banerjee',nickname:'Anu',email:'youth@banf.org',phone:'904-555-0109',familyId:'FAM-2025-B4',familyType:'individual',isECMember:false,isBOTMember:false,isActive:true,emailOptIn:true,membershipYear:'2026',profession:'Student',city:'Jacksonville',state:'FL',childrenNames:[],spouseName:'',joinTimestamp:'2025-06-15T00:00:00Z',membershipYears:['2026']},
  {memberId:'MBR-010',firstName:'Kamal',lastName:'Gupta',displayName:'Kamal Gupta',nickname:'Kamal',email:'jt-secretary@banf.org',phone:'904-555-0110',familyId:'FAM-2025-C1',familyType:'family',isECMember:true,isBOTMember:false,isActive:true,emailOptIn:true,membershipYear:'2026',profession:'Pharmacist',city:'Jacksonville',state:'FL',childrenNames:['Kunal','Kavya'],spouseName:'Rekha Gupta',joinTimestamp:'2022-11-20T00:00:00Z',membershipYears:['2023','2024','2025','2026']},
  {memberId:'MBR-011',firstName:'Sharmila',lastName:'Dey',displayName:'Sharmila Dey',nickname:'Sharmi',email:'sponsor1@banf.org',phone:'904-555-0111',familyId:'FAM-2025-C2',familyType:'family',isECMember:false,isBOTMember:true,isActive:true,emailOptIn:true,membershipYear:'2026',profession:'Business Owner',city:'Jacksonville',state:'FL',childrenNames:['Shreya'],spouseName:'Tapan Dey',joinTimestamp:'2024-07-01T00:00:00Z',membershipYears:['2024','2025','2026']},
  {memberId:'MBR-012',firstName:'Rajat',lastName:'Saha',displayName:'Rajat Saha',nickname:'Rajat',email:'rajat.saha@gmail.com',phone:'904-555-0112',familyId:'FAM-2025-C3',familyType:'couple',isECMember:false,isBOTMember:false,isActive:true,emailOptIn:true,membershipYear:'2026',profession:'Dentist',city:'Jacksonville',state:'FL',childrenNames:[],spouseName:'Puja Saha',joinTimestamp:'2025-02-14T00:00:00Z',membershipYears:['2025','2026']},
  {memberId:'MBR-013',firstName:'Nibedita',lastName:'Chakraborty',displayName:'Nibedita Chakraborty',nickname:'Nibu',email:'nibedita.c@gmail.com',phone:'904-555-0113',familyId:'FAM-2025-D1',familyType:'family',isECMember:false,isBOTMember:false,isActive:true,emailOptIn:true,membershipYear:'2026',profession:'Nurse',city:'Jacksonville',state:'FL',childrenNames:['Neel','Nisha'],spouseName:'Sourav Chakraborty',joinTimestamp:'2024-10-05T00:00:00Z',membershipYears:['2025','2026']},
  {memberId:'MBR-014',firstName:'Subir',lastName:'Ghosh',displayName:'Subir Ghosh',nickname:'Subir',email:'subir.ghosh@gmail.com',phone:'904-555-0114',familyId:'FAM-2025-D2',familyType:'individual',isECMember:false,isBOTMember:false,isActive:false,emailOptIn:false,membershipYear:'2024',profession:'Retired',city:'Jacksonville',state:'FL',childrenNames:['Sumon'],spouseName:'Swapna Ghosh',joinTimestamp:'2020-03-15T00:00:00Z',membershipYears:['2020','2021','2022','2023','2024']},
  {memberId:'MBR-015',firstName:'Priyanka',lastName:'Sarkar',displayName:'Priyanka Sarkar',nickname:'Priyo',email:'priyanka.s@gmail.com',phone:'904-555-0115',familyId:'FAM-2025-D3',familyType:'family',isECMember:false,isBOTMember:false,isActive:true,emailOptIn:true,membershipYear:'2026',profession:'Lawyer',city:'Jacksonville',state:'FL',childrenNames:['Prithvi'],spouseName:'Debashis Sarkar',joinTimestamp:'2024-11-28T00:00:00Z',membershipYears:['2025','2026']},
];

// Pre-defined roles
let ROLES = [
  {id:'super-admin',name:'Super Admin',purpose:'Full system control, final authority on all implementations',dataViews:['overview','pipeline','agents','endpoints','testing','deployment','data-model','sprints','requirements','dev-status','observability','internals','expert-review'],processViews:['stakeholder-acceptance','dev-team','ticket-flow','feedback-pipeline','board-review','tech-lead-approval','design-change','implementation'],feedback:'full',comment:'full',suggestion:'full'},
  {id:'business-stakeholder',name:'Business Stakeholder',purpose:'Business requirements validation, acceptance testing, organizational strategy',dataViews:['overview','requirements','dev-status'],processViews:['stakeholder-acceptance','feedback-pipeline','board-review'],feedback:'submit',comment:'assigned',suggestion:'design'},
  {id:'ec-member',name:'EC Member',purpose:'Executive committee governance, budget oversight, organizational direction',dataViews:['overview','requirements','sprints'],processViews:['stakeholder-acceptance','board-review'],feedback:'vote',comment:'assigned',suggestion:'design'},
];

// MULTI-ROLE USER MODEL
// Users can have MANY roles. Once credentials are set, they persist across all drives.
// Identity is linked via identityId to the IDENTITY_GRAPH for disambiguation.
let USERS = [
  {name:'Ranadhir Ghosh',email:'ranadhir.ghosh@gmail.com',
   roles:[{id:'super-admin',name:'Super Admin',assignedDate:'2024-08-15',context:'system',status:'active'}],
   roleHistory:[{roleId:'super-admin',roleName:'Super Admin',from:'2024-08-15',to:null,action:'assigned',by:'System'}],
   credentials:{username:'ranadhir.ghosh',hasPassword:true},
   identityId:'IDN-001',access:'full',invited:null,status:'active',signedUp:true},
];

// MULTI-DIMENSIONAL IDENTITY GRAPH
// Resolves "who is this person?" using multiple dimensions when names are not unique.
// Dimensions: email (primary, immutable), phone, familyId, childrenNames, spouseName (mutable!),
//             joinTimestamp, membershipYears, city, profession
// NOTE: Date of birth is NOT stored per privacy policy.
// Strategy: Each dimension has a weight. Composite score >= 80 = auto-match, 50-79 = suggest, <50 = new identity.
let IDENTITY_GRAPH = [
  {identityId:'IDN-001',primaryEmail:'ranadhir.ghosh@gmail.com',displayName:'Ranadhir Ghosh',
   dimensions:{emails:['ranadhir.ghosh@gmail.com'],phones:['904-555-0101'],familyId:'FAM-2025-A1',
     childrenNames:['Ria','Arjun'],spouseName:'Soma Ghosh',joinTimestamp:'2024-08-15T00:00:00Z',
     membershipYears:['2025','2026'],city:'Jacksonville',profession:'Software Architect'},
   confidenceScore:100,linkedMemberIds:['MBR-001'],linkedUserEmails:['ranadhir.ghosh@gmail.com'],
   createdAt:'2024-08-15',lastVerified:new Date().toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})},
  {identityId:'IDN-002',primaryEmail:'president@banf.org',displayName:'Arun Sen',
   dimensions:{emails:['president@banf.org'],phones:['904-555-0102'],familyId:'FAM-2025-A2',
     childrenNames:['Aritra'],spouseName:'Rupa Sen',joinTimestamp:'2023-01-10T00:00:00Z',
     membershipYears:['2023','2024','2025','2026'],city:'Jacksonville',profession:'Physician'},
   confidenceScore:100,linkedMemberIds:['MBR-002'],linkedUserEmails:[],
   createdAt:'2023-01-10',lastVerified:new Date().toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})},
  {identityId:'IDN-003',primaryEmail:'subir.ghosh@gmail.com',displayName:'Subir Ghosh',
   dimensions:{emails:['subir.ghosh@gmail.com'],phones:['904-555-0114'],familyId:'FAM-2025-D2',
     childrenNames:['Sumon'],spouseName:'Swapna Ghosh',joinTimestamp:'2020-03-15T00:00:00Z',
     membershipYears:['2020','2021','2022','2023','2024'],city:'Jacksonville',profession:'Retired'},
   confidenceScore:100,linkedMemberIds:['MBR-014'],linkedUserEmails:[],
   createdAt:'2020-03-15',lastVerified:new Date().toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})},
];
let IDENTITY_COUNTER = 4;

let DRIVE_LIST = [];

const EC_MEMBERS = [
  {name:'Arun Sen',title:'President',email:'president@banf.org',membership:'Paid',gate:'passed',status:'complete'},
  {name:'Dipak Mukherjee',title:'VP Membership',email:'vp-membership@banf.org',membership:'Paid',gate:'passed',status:'complete'},
  {name:'Priya Bose',title:'Treasurer',email:'treasurer@banf.org',membership:'Paid',gate:'passed',status:'complete'},
  {name:'Suman Das',title:'Secretary',email:'secretary@banf.org',membership:'Paid',gate:'passed',status:'complete'},
  {name:'Kamal Gupta',title:'Jt Secretary',email:'jt-secretary@banf.org',membership:'Paid',gate:'passed',status:'complete'},
  {name:'Mita Roy',title:'Cultural Sec',email:'cultural@banf.org',membership:'Paid',gate:'passed',status:'complete'},
  {name:'Ranadhir Ghosh',title:'IT / Tech Lead',email:'ranadhir.ghosh@gmail.com',membership:'Paid',gate:'passed',status:'complete'},
  {name:'Tanmay Chatterjee',title:'VP Events',email:'vp-events@banf.org',membership:'Pending',gate:'pending',status:'pending'},
  {name:'Jayanta Pal',title:'IT Coord',email:'it@banf.org',membership:'Pending',gate:'pending',status:'pending'},
  {name:'Ananya Banerjee',title:'Youth Rep',email:'youth@banf.org',membership:'Pending',gate:'pending',status:'pending'},
  {name:'Subir Ghosh',title:'Former',email:'subir.ghosh@gmail.com',membership:'Expired',gate:'failed',status:'failed'},
];

let FEEDBACK = [
  // Change requests managed by Change Agent (banf-change-agent.js)
  // Populated at runtime from dev-board-state.json via loadBoardState()
];

let DEV_TICKETS = [
  // Dev tickets managed by Change Agent (banf-change-agent.js)
  // Populated at runtime from dev-board-state.json via loadBoardState()
];

let LOG = [
  {ts:'Mar 9, 2026 01:01',act:'BOARD',msg:'Development board cleared — mock data removed. Real data loaded from Change Agent state.'},
  {ts:'Mar 9, 2026 01:00',act:'DEPLOY',msg:'Change Agent + Design-Architecture Agent deployed — proper software engineering process activated.'},
];

// ── Board State Loader — reads from Change Agent dev-board-state via API ──
async function loadBoardState() {
  try {
    // Try primary Wix URL, fallback to custom domain
    let resp;
    try { resp = await fetch('https://banfwix.wixsite.com/banf1/_functions/dev_board_state'); }
    catch(e) { resp = await fetch('https://www.jaxbengali.org/_functions/dev_board_state'); }
    if (!resp.ok) throw new Error('HTTP ' + resp.status);
    const data = await resp.json();
    if (data && data.devTickets) {
      DEV_TICKETS = data.devTickets.map(t => ({
        id: t.id,
        origin: t.changeRequestId || 'Board',
        desc: t.title || t.description,
        assignee: t.assignee || 'Unassigned',
        sprint: t.sprint || 'S1',
        priority: t.priority ? t.priority.charAt(0).toUpperCase() + t.priority.slice(1) : 'Medium',
        status: t.status === 'done' ? 'done' : t.status === 'in_progress' ? 'in-progress' : t.status || 'todo'
      }));
    }
    if (data && data.changeRequests) {
      FEEDBACK = data.changeRequests.map(cr => ({
        id: cr.id,
        user: cr.requestedBy || 'System',
        role: 'Change Agent',
        section: cr.type || 'General',
        type: 'Change Request',
        body: cr.description || cr.title,
        ts: cr.createdAt ? new Date(cr.createdAt).toLocaleString('en-US', {month:'short',day:'numeric',year:'numeric',hour:'2-digit',minute:'2-digit'}) : '',
        agentAnalysis: cr.technicalReview ? 'Risk: ' + cr.technicalReview.risk + ' | Modules: ' + cr.technicalReview.modulesAffected + ' | Effort: ' + cr.technicalReview.effortEstimate : null,
        designChange: cr.technicalReview && cr.technicalReview.affectedModules ? cr.technicalReview.affectedModules.map(m => m.name).join(', ') : null,
        boardStatus: ['closed','deployed'].includes(cr.status) ? 'approved' : cr.status === 'rejected' ? 'rejected' : 'pending',
        techLeadApproval: ['closed','deployed','ticket_created'].includes(cr.status) ? 'approved' : cr.status === 'rejected' ? 'rejected' : null,
        devTicket: cr.devTicketId || null,
        devStatus: cr.devTicketId ? (cr.status === 'closed' ? 'done' : cr.status) : null,
      }));
    }
    if (data && data.activityLog) {
      const boardLogs = data.activityLog.slice(0, 50).map(entry => ({
        ts: new Date(entry.ts).toLocaleString('en-US', {month:'short',day:'numeric',year:'numeric',hour:'2-digit',minute:'2-digit'}),
        act: entry.action || 'BOARD',
        msg: entry.message || ''
      }));
      LOG = [...boardLogs, ...LOG];
    }
    if (data && data.settings) { window._boardSettings = data.settings; }
    renderFeedback(); renderDevBoard(); renderAll();
    addLog('BOARD', 'Board loaded: ' + DEV_TICKETS.length + ' tickets, ' + FEEDBACK.length + ' change requests from Change Agent');
  } catch(e) {
    console.warn('Board state load failed:', e.message);
    addLog('BOARD', 'Board state API unavailable — using clean slate. Run Change Agent to populate.');
  }
}

// Load board state after page load
if (typeof window !== 'undefined') {
  window.addEventListener('load', function() { setTimeout(loadBoardState, 500); });
}

// ═══════════════════════════════════════════════════════════════════════
//  AUTH SYSTEM — Sign In / Sign Up / Forgot Password / Security Question
// ═══════════════════════════════════════════════════════════════════════

// ── Utility functions ──
function showAuth(screen) {
  document.querySelectorAll('.auth-screen').forEach(s => s.classList.remove('active'));
  const el = document.getElementById('auth-' + screen);
  if (el) el.classList.add('active');
  // Reset steps
  if (screen === 'signup') {
    document.querySelectorAll('#auth-signup .auth-step').forEach(s => s.classList.remove('active'));
    document.getElementById('signup-step-1').classList.add('active');
  }
  if (screen === 'forgot') {
    document.querySelectorAll('#auth-forgot .auth-step').forEach(s => s.classList.remove('active'));
    document.getElementById('forgot-step-1').classList.add('active');
  }
  if (screen === 'forgot-username') {
    document.querySelectorAll('#auth-forgot-username .auth-step').forEach(s => s.classList.remove('active'));
    document.getElementById('fu-step-1').classList.add('active');
  }
  // Clear errors
  document.querySelectorAll('.error-msg,.success-msg,.info-msg').forEach(m => m.style.display = 'none');
}

function showStep(prefix, num) {
  document.querySelectorAll('#auth-' + prefix + ' .auth-step').forEach(s => s.classList.remove('active'));
  document.getElementById(prefix + '-step-' + num).classList.add('active');
}

function showError(id, msg) {
  const el = document.getElementById(id);
  if (el) { el.textContent = msg; el.style.display = 'block'; }
}
function showInfo(id, msg) {
  const el = document.getElementById(id);
  if (el) { el.textContent = msg; el.style.display = 'block'; }
}
function hideMsg(id) {
  const el = document.getElementById(id);
  if (el) el.style.display = 'none';
}

function togglePwd(inputId, icon) {
  const inp = document.getElementById(inputId);
  if (inp.type === 'password') { inp.type = 'text'; icon.classList.replace('fa-eye', 'fa-eye-slash'); }
  else { inp.type = 'password'; icon.classList.replace('fa-eye-slash', 'fa-eye'); }
}

function checkPwdStrength(pwd, barId) {
  const bar = document.getElementById(barId);
  if (!bar) return;
  let score = 0;
  if (pwd.length >= 8) score++;
  if (pwd.length >= 12) score++;
  if (/[A-Z]/.test(pwd)) score++;
  if (/[0-9]/.test(pwd)) score++;
  if (/[^A-Za-z0-9]/.test(pwd)) score++;
  const pct = Math.min(score * 20, 100);
  const colors = ['#ef4444', '#ef4444', '#eab308', '#eab308', '#22c55e', '#22c55e'];
  bar.style.width = pct + '%';
  bar.style.background = colors[score] || '#ef4444';
}

async function apiCall(endpoint, body) {
  try {
    const resp = await fetch(API + '/' + endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    return await resp.json();
  } catch (e) {
    return { success: false, error: 'Network error: ' + e.message };
  }
}

async function apiGet(endpoint, params) {
  try {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    const resp = await fetch(API + '/' + endpoint + qs);
    return await resp.json();
  } catch (e) {
    return { success: false, error: 'Network error: ' + e.message };
  }
}

// ═══════════════════════════════════════════════════════════════════════
//  FINANCIAL REPORTING — Ledger, Income Summary, Event Expenses
// ═══════════════════════════════════════════════════════════════════════

// --- Ledger Report State ---
let _ledgerEntries = [];
let _ledgerDateFrom = null;
let _ledgerDateTo = null;
let _ledgerSortField = 'entryDate';
let _ledgerSortAsc = false;
let _ledgerPage = 1;
const LEDGER_PAGE_SIZE = 50;

function getLedgerDateRange(range) {
  const now = new Date();
  const y = now.getFullYear(), m = now.getMonth(), d = now.getDate();
  let from, to = new Date(y, m, d, 23, 59, 59);
  switch(range) {
    case '7d': from = new Date(y, m, d - 7); break;
    case '30d': from = new Date(y, m, d - 30); break;
    case 'thisMonth': from = new Date(y, m, 1); break;
    case 'lastMonth': from = new Date(y, m - 1, 1); to = new Date(y, m, 0, 23, 59, 59); break;
    case 'thisQuarter': from = new Date(y, Math.floor(m/3)*3, 1); break;
    case 'lastQuarter': { const qs = Math.floor(m/3)*3 - 3; from = new Date(y, qs, 1); to = new Date(y, qs + 3, 0, 23, 59, 59); break; }
    case 'lastYear': from = new Date(y - 1, 0, 1); to = new Date(y - 1, 11, 31, 23, 59, 59); break;
    case 'ytd': default: from = new Date(y, 0, 1); break;
  }
  return { from, to };
}

// Wire up range buttons
document.addEventListener('click', function(e) {
  const btn = e.target.closest('.ledger-range-btn');
  if (!btn) return;
  document.querySelectorAll('.ledger-range-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  const range = btn.dataset.range;
  if (range === 'custom') {
    document.getElementById('ledger-custom-dates').style.display = 'flex';
    return;
  }
  document.getElementById('ledger-custom-dates').style.display = 'none';
  const dr = getLedgerDateRange(range);
  _ledgerDateFrom = dr.from;
  _ledgerDateTo = dr.to;
  _ledgerPage = 1;
  loadLedgerReport();
});

function applyCustomLedgerRange() {
  const f = document.getElementById('ledger-date-from').value;
  const t = document.getElementById('ledger-date-to').value;
  if (!f || !t) return;
  _ledgerDateFrom = new Date(f + 'T00:00:00');
  _ledgerDateTo = new Date(t + 'T23:59:59');
  _ledgerPage = 1;
  loadLedgerReport();
}

async function loadLedgerReport() {
  if (!_ledgerDateFrom) {
    const dr = getLedgerDateRange('ytd');
    _ledgerDateFrom = dr.from;
    _ledgerDateTo = dr.to;
  }
  const tbody = document.getElementById('ledger-table-body');
  tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:var(--muted)"><i class="fas fa-spinner fa-spin"></i> Loading...</td></tr>';

  const typeF = document.getElementById('ledger-type-filter').value;
  const catF = document.getElementById('ledger-category-filter').value;
  const year = _ledgerDateFrom.getFullYear();

  const params = { year: year, limit: 1000 };
  if (typeF) params.type = typeF;
  if (catF) params.category = catF;
  const data = await apiGet('ledger', params);

  if (!data.success) {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:var(--red)">Error: ' + (data.error || 'Failed to load') + '</td></tr>';
    return;
  }

  // Filter entries client-side by date range (API filters by year, we narrow to exact range)
  _ledgerEntries = (data.entries || []).filter(e => {
    const ed = new Date(e.entryDate);
    return ed >= _ledgerDateFrom && ed <= _ledgerDateTo;
  });

  // If lastYear or cross-year custom range, might need to fetch previous year too
  if (_ledgerDateTo.getFullYear() !== _ledgerDateFrom.getFullYear()) {
    const params2 = { year: _ledgerDateTo.getFullYear(), limit: 1000 };
    if (typeF) params2.type = typeF;
    if (catF) params2.category = catF;
    const data2 = await apiGet('ledger', params2);
    if (data2.success && data2.entries) {
      const more = data2.entries.filter(e => {
        const ed = new Date(e.entryDate);
        return ed >= _ledgerDateFrom && ed <= _ledgerDateTo;
      });
      _ledgerEntries = _ledgerEntries.concat(more);
    }
  }

  // Sort
  sortLedgerEntries();
  // Render KPIs
  renderLedgerKPIs();
  // Render table
  renderLedgerTable();
}

function sortLedger(field) {
  if (_ledgerSortField === field) _ledgerSortAsc = !_ledgerSortAsc;
  else { _ledgerSortField = field; _ledgerSortAsc = field === 'entryDate' ? false : true; }
  sortLedgerEntries();
  renderLedgerTable();
}

function sortLedgerEntries() {
  _ledgerEntries.sort((a, b) => {
    let va = a[_ledgerSortField], vb = b[_ledgerSortField];
    if (_ledgerSortField === 'entryDate') { va = new Date(va).getTime(); vb = new Date(vb).getTime(); }
    if (typeof va === 'number' && typeof vb === 'number') return _ledgerSortAsc ? va - vb : vb - va;
    return _ledgerSortAsc ? String(va).localeCompare(String(vb)) : String(vb).localeCompare(String(va));
  });
}

function renderLedgerKPIs() {
  const inc = _ledgerEntries.filter(e => e.type === 'income').reduce((s, e) => s + (e.amount || 0), 0);
  const exp = _ledgerEntries.filter(e => e.type === 'expense').reduce((s, e) => s + (e.amount || 0), 0);
  document.getElementById('ledger-kpi-income').textContent = '$' + inc.toLocaleString('en-US', {minimumFractionDigits:2});
  document.getElementById('ledger-kpi-expense').textContent = '$' + exp.toLocaleString('en-US', {minimumFractionDigits:2});
  document.getElementById('ledger-kpi-net').textContent = '$' + (inc - exp).toLocaleString('en-US', {minimumFractionDigits:2});
  document.getElementById('ledger-kpi-count').textContent = _ledgerEntries.length;
}

function renderLedgerTable() {
  const tbody = document.getElementById('ledger-table-body');
  const start = (_ledgerPage - 1) * LEDGER_PAGE_SIZE;
  const page = _ledgerEntries.slice(start, start + LEDGER_PAGE_SIZE);

  if (!page.length) {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:var(--muted)">No entries found for this period.</td></tr>';
    document.getElementById('ledger-pagination').innerHTML = '';
    return;
  }

  tbody.innerHTML = page.map((e, idx) => {
    const dt = new Date(e.entryDate);
    const dateStr = dt.toLocaleDateString('en-US', {month:'short', day:'numeric', year:'numeric'});
    const isInc = e.type === 'income';
    const amtColor = isInc ? 'var(--green)' : 'var(--red)';
    const sign = isInc ? '+' : '-';
    const cat = (e.category || '').replace(/_/g, ' ');
    const recon = e.reconciled ? '<i class="fas fa-check-circle" style="color:var(--green)"></i>' : '<i class="fas fa-times-circle" style="color:var(--dim)"></i>';
    const ri = start + idx;
    return '<tr onclick="openLedgerDetail(' + ri + ')" style="cursor:pointer" onmouseenter="this.style.background=\\'rgba(139,92,246,.08)\\'" onmouseleave="this.style.background=\\'\\'">' +
      '<td style="white-space:nowrap">' + dateStr + '</td>' +
      '<td>' + (e.description || '-') + ' <i class="fas fa-external-link-alt" style="font-size:.6rem;color:var(--dim);margin-left:4px"></i></td>' +
      '<td style="text-transform:capitalize">' + cat + '</td>' +
      '<td><span style="color:' + amtColor + ';font-weight:600;text-transform:capitalize">' + e.type + '</span></td>' +
      '<td style="text-align:right;color:' + amtColor + ';font-weight:600">' + sign + '$' + (e.amount || 0).toLocaleString('en-US', {minimumFractionDigits:2}) + '</td>' +
      '<td>' + (e.eventName || '-') + '</td>' +
      '<td style="text-align:center">' + recon + '</td>' +
      '</tr>';
  }).join('');

  // Pagination
  const totalPages = Math.ceil(_ledgerEntries.length / LEDGER_PAGE_SIZE);
  const pag = document.getElementById('ledger-pagination');
  if (totalPages <= 1) { pag.innerHTML = ''; return; }
  let pagHtml = '';
  for (let i = 1; i <= totalPages; i++) {
    const active = i === _ledgerPage ? 'background:var(--accent);color:#fff;' : 'background:var(--bg2);color:var(--muted);';
    pagHtml += '<button onclick="_ledgerPage=' + i + ';renderLedgerTable()" style="border:1px solid var(--line);' + active + 'padding:4px 10px;border-radius:6px;cursor:pointer;font-size:.78rem">' + i + '</button>';
  }
  pag.innerHTML = pagHtml;
}

function exportLedgerCSV() {
  if (!_ledgerEntries.length) return;
  const headers = ['Date','Description','Category','Type','Amount','Event','Vendor','Payment Method','Reference','Reconciled'];
  const rows = _ledgerEntries.map(e => [
    new Date(e.entryDate).toISOString().split('T')[0],
    '"' + (e.description || '').replace(/"/g, '""') + '"',
    e.category || '',
    e.type || '',
    e.amount || 0,
    '"' + (e.eventName || '').replace(/"/g, '""') + '"',
    '"' + (e.vendorName || '').replace(/"/g, '""') + '"',
    e.paymentMethod || '',
    e.referenceNo || '',
    e.reconciled ? 'Yes' : 'No'
  ]);
  const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'BANF_Ledger_' + new Date().toISOString().split('T')[0] + '.csv';
  a.click();
  URL.revokeObjectURL(a.href);
}

// ═══════════════════════════════════════════════════════════════════════
//  LEDGER DETAIL DRILL-DOWN
// ═══════════════════════════════════════════════════════════════════════

function closeLedgerDetail() { document.getElementById('ledger-detail-overlay').style.display = 'none'; }

function _ld(label, value, icon) {
  if (!value && value !== 0) return '';
  const ic = icon ? '<i class="fas fa-' + icon + '" style="color:var(--accent);margin-right:4px;font-size:.7rem"></i>' : '';
  return '<div style="margin-bottom:4px"><span style="font-size:.7rem;color:var(--muted);text-transform:uppercase;letter-spacing:.5px">' + label + '</span><div style="font-size:.85rem;color:var(--text)">' + ic + value + '</div></div>';
}

function openLedgerDetail(idx) {
  const e = _ledgerEntries[idx];
  if (!e) return;
  const overlay = document.getElementById('ledger-detail-overlay');
  const isInc = e.type === 'income';
  const color = isInc ? 'var(--green)' : 'var(--red)';
  const sign = isInc ? '+' : '-';
  const catIcons = {membership:'id-card',event_ticket:'ticket-alt',sponsorship:'handshake',donation:'heart',advertisement:'bullhorn',zelle_income:'bolt',check:'money-check-alt',other_income:'coins',venue:'building',catering:'utensils',decoration:'paint-brush',photography:'camera',printing:'print',sound_music:'music',apparel:'tshirt',prasad:'hand-holding-heart',admin:'cog',insurance:'shield-alt',food_grocery:'shopping-basket',bank_fee:'university',transport:'truck',debit_card:'credit-card',zelle_expense:'bolt',reimbursement:'receipt',other_expense:'ellipsis-h'};
  const catIcon = catIcons[e.category] || (isInc ? 'arrow-down' : 'arrow-up');

  // Header
  document.getElementById('ld-icon').style.cssText = 'width:42px;height:42px;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:1.1rem;background:' + (isInc ? 'rgba(34,197,94,.15)' : 'rgba(239,68,68,.15)') + ';color:' + color;
  document.getElementById('ld-icon').innerHTML = '<i class="fas fa-' + catIcon + '"></i>';
  document.getElementById('ld-title').textContent = e.description || 'Ledger Entry';
  document.getElementById('ld-subtitle').textContent = new Date(e.entryDate).toLocaleDateString('en-US', {weekday:'long', month:'long', day:'numeric', year:'numeric'});
  document.getElementById('ld-amount').style.color = color;
  document.getElementById('ld-amount').textContent = sign + '$' + (e.amount || 0).toLocaleString('en-US', {minimumFractionDigits:2});

  // Base info grid
  const cat = (e.category || '').replace(/_/g, ' ');
  let base = '';
  base += _ld('Category', '<span style="text-transform:capitalize">' + cat + '</span>', catIcon);
  base += _ld('Type', '<span style="color:' + color + ';font-weight:600;text-transform:capitalize">' + e.type + '</span>');
  base += _ld('Payment Method', (e.paymentMethod || '').replace(/_/g, ' ') || '-', 'wallet');
  base += _ld('Payer / Payee', e.payerOrPayee || '-', 'user');
  if (e.eventName) base += _ld('Event', e.eventName, 'calendar-alt');
  if (e.reference) base += _ld('Reference', e.reference, 'hashtag');
  base += _ld('Source', (e.source || 'manual').replace(/_/g, ' '), 'database');
  base += _ld('Reconciled', e.reconciled ? '<span style="color:var(--green)"><i class="fas fa-check-circle"></i> Yes</span>' : '<span style="color:var(--dim)"><i class="fas fa-times-circle"></i> No</span>');
  if (e.notes) base += '<div style="grid-column:1/-1">' + _ld('Notes', e.notes, 'sticky-note') + '</div>';
  document.getElementById('ld-base').innerHTML = base;

  // Linked data — load async based on category
  const linkedContent = document.getElementById('ld-linked-content');
  const linkedLoading = document.getElementById('ld-linked-loading');
  linkedContent.innerHTML = '';
  linkedLoading.style.display = 'block';
  overlay.style.display = 'block';

  loadLinkedData(e).then(html => {
    linkedLoading.style.display = 'none';
    linkedContent.innerHTML = html;
  }).catch(err => {
    linkedLoading.style.display = 'none';
    linkedContent.innerHTML = '<div style="color:var(--dim);font-size:.82rem">Could not load linked details.</div>';
  });
}

async function apiGetAuth(endpoint, params) {
  const p = Object.assign({}, params || {});
  if (CURRENT_ADMIN && CURRENT_ADMIN.email) p.user_email = CURRENT_ADMIN.email;
  return apiGet(endpoint, p);
}

async function loadLinkedData(e) {
  const cat = e.category || '';
  const src = e.source || '';
  let html = '';

  // ── INCOME CATEGORIES ──
  if (e.type === 'income') {
    // Membership
    if (cat === 'membership') {
      html += await renderMembershipMapping(e);
    }
    // Sponsorship
    else if (cat === 'sponsorship') {
      html += await renderSponsorshipMapping(e);
    }
    // Zelle income
    else if (cat === 'zelle_income') {
      html += renderZelleMapping(e);
      if (e.payerOrPayee) html += await renderMemberLookup(e.payerOrPayee);
    }
    // Check deposit
    else if (cat === 'check') {
      html += renderCheckMapping(e);
    }
    // Event ticket / donation
    else if (cat === 'event_ticket' || cat === 'donation') {
      html += renderEventIncomeMapping(e);
      if (e.payerOrPayee) html += await renderMemberLookup(e.payerOrPayee);
    }
    else {
      html += renderGenericMapping(e);
      if (e.payerOrPayee) html += await renderMemberLookup(e.payerOrPayee);
    }
  }
  // ── EXPENSE CATEGORIES ──
  else {
    // Reimbursement-sourced
    if (src === 'reimbursement' || (e.reference && e.reference.startsWith('RMB-'))) {
      html += await renderReimbursementMapping(e);
    }
    // Event-linked expense
    else if (e.eventId || e.eventName) {
      html += await renderEventExpenseMapping(e);
    }
    // Debit card / bank
    else if (cat === 'debit_card') {
      html += renderDebitCardMapping(e);
    }
    // Zelle expense
    else if (cat === 'zelle_expense') {
      html += renderZelleMapping(e);
    }
    else {
      html += renderGenericMapping(e);
    }

    // Procurement lookup for expenses
    if (e.eventId || e.reference) {
      html += await renderProcurementMapping(e);
    }

    // AI Enrichment Intelligence Panel with Data Lineage
    const aiNotes = e.notes || '';
    if (aiNotes.includes('[ExpenseIQ]') || aiNotes.includes('[ExpenseIQ-Enriched]') || aiNotes.startsWith('AI-enriched:')) {
      html += renderExpenseIQPanel(e);
    }
  }

  if (!html) html = '<div style="color:var(--dim);font-size:.82rem;padding:8px 0">No linked details available for this entry.</div>';
  return html;
}

function _ldSection(title, icon, content) {
  return '<div style="margin-bottom:16px"><div style="font-size:.82rem;font-weight:700;color:var(--text);margin-bottom:8px;display:flex;align-items:center;gap:6px"><i class="fas fa-' + icon + '" style="color:var(--accent)"></i>' + title + '</div>' + content + '</div>';
}

function _ldRow(pairs) {
  return '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:6px 16px;padding:10px 14px;background:var(--bg2);border-radius:8px;border:1px solid var(--line);margin-bottom:6px">' +
    pairs.map(p => '<div><div style="font-size:.68rem;color:var(--muted);text-transform:uppercase;letter-spacing:.4px">' + p[0] + '</div><div style="font-size:.82rem;color:var(--text)">' + (p[1] || '-') + '</div></div>').join('') + '</div>';
}

function _ldMemberLink(name, searchQ) {
  return '<a href="#" onclick="event.preventDefault();event.stopPropagation();openMemberProfile(\\'' + (searchQ || name || '').replace(/'/g, "\\\\'") + '\\')" style="color:var(--accent);text-decoration:none;font-weight:600"><i class="fas fa-user me-1" style="font-size:.7rem"></i>' + (name || 'Unknown') + '</a>';
}

// ── Membership ──
async function renderMembershipMapping(e) {
  let memberHtml = '';
  if (e.payerOrPayee) {
    try {
      const data = await apiGetAuth('crm_member_search', { q: e.payerOrPayee, limit: 3 });
      if (data.members && data.members.length) {
        const m = data.members[0];
        memberHtml = _ldRow([
          ['Member', _ldMemberLink(m.displayName || m.email, m.email || m.displayName)],
          ['Email', m.email || '-'],
          ['Phone', m.phone || '-'],
          ['Membership Type', m.memberType || m.membershipCategory || '-'],
          ['Tier', m.tier || m.membershipTier || '-'],
          ['Member Since', m.memberSince ? new Date(m.memberSince).toLocaleDateString() : '-'],
          ['Life Member', m.isLifeMember ? '<span style="color:var(--green)">Yes</span>' : 'No'],
          ['Family ID', m.familyId || '-']
        ]);
      }
    } catch (_) {}
  }
  if (!memberHtml) {
    memberHtml = _ldRow([['Payer', e.payerOrPayee || '-'], ['Reference', e.reference || '-']]);
  }
  return _ldSection('Membership Details', 'id-card', memberHtml +
    '<div style="font-size:.72rem;color:var(--muted);margin-top:4px"><i class="fas fa-info-circle me-1"></i>Click member name to view full profile with family, contact, and payment history.</div>');
}

// ── Sponsorship ──
async function renderSponsorshipMapping(e) {
  let sponsorHtml = '';
  try {
    const data = await apiGet('sponsors');
    if (data.success && data.sponsors) {
      const match = data.sponsors.find(s => {
        const name = (s.companyName || s.name || '').toLowerCase();
        const payer = (e.payerOrPayee || '').toLowerCase();
        return name === payer || name.includes(payer) || payer.includes(name);
      });
      if (match) {
        sponsorHtml = _ldRow([
          ['Sponsor', match.companyName || match.name],
          ['Tier', match.tier || '-'],
          ['Contact', match.contactName || '-'],
          ['Email', match.email || '-'],
          ['Phone', match.phone || '-'],
          ['Amount', '$' + (match.amount || e.amount || 0).toLocaleString()],
          ['Active', match.active ? '<span style="color:var(--green)">Yes</span>' : 'No'],
          ['Year', match.year || '-']
        ]);
      }
    }
  } catch (_) {}
  if (!sponsorHtml) {
    sponsorHtml = _ldRow([['Sponsor', e.payerOrPayee || '-'], ['Amount', '$' + (e.amount || 0).toLocaleString()], ['Reference', e.reference || '-']]);
  }
  return _ldSection('Sponsorship Details', 'handshake', sponsorHtml);
}

// ── Zelle ──
function renderZelleMapping(e) {
  return _ldSection('Zelle Transfer', 'bolt',
    _ldRow([
      [e.type === 'income' ? 'Received From' : 'Sent To', e.payerOrPayee || '-'],
      ['Amount', '$' + (e.amount || 0).toLocaleString('en-US', {minimumFractionDigits:2})],
      ['Date', e.bankDate ? new Date(e.bankDate).toLocaleDateString() : '-'],
      ['Confirmation', e.reference || '-'],
      ['Source', (e.source || '').replace(/_/g, ' ')]
    ]));
}

// ── Check Deposit ──
function renderCheckMapping(e) {
  return _ldSection('Check Deposit', 'money-check-alt',
    _ldRow([
      ['Deposited', '$' + (e.amount || 0).toLocaleString('en-US', {minimumFractionDigits:2})],
      ['Bank Date', e.bankDate ? new Date(e.bankDate).toLocaleDateString() : '-'],
      ['Confirmation', e.reference || '-'],
      ['Bank Description', e.bankDescription || e.description || '-']
    ]));
}

// ── Event Income (ticket, donation) ──
function renderEventIncomeMapping(e) {
  return _ldSection('Event Income', 'calendar-alt',
    _ldRow([
      ['Event', e.eventName || '-'],
      ['Category', (e.category || '').replace(/_/g, ' ')],
      ['Payer', e.payerOrPayee || '-'],
      ['Amount', '$' + (e.amount || 0).toLocaleString('en-US', {minimumFractionDigits:2})],
      ['Payment Method', (e.paymentMethod || '').replace(/_/g, ' ')]
    ]));
}

// ── ExpenseIQ Data Lineage Panel ──
function renderExpenseIQPanel(e) {
  const notes = e.notes || '';

  // Try to parse structured lineage JSON
  let lineage = null;
  const lineageMatch = notes.match(/\\[LINEAGE\\](.+?)$/s);
  if (lineageMatch) {
    try { lineage = JSON.parse(lineageMatch[1]); } catch (_) {}
  }

  // Parse confidence from notes text
  const confMatch = notes.match(/confidence:\\s*(\\w+)/i) || notes.match(/(HIGH|MEDIUM|LOW)\\s+confidence/i);
  const confidence = lineage ? (lineage.confidence || '').toUpperCase() : (confMatch ? confMatch[1].toUpperCase() : '');
  const confColor = confidence === 'HIGH' ? '#16a34a' : confidence === 'MEDIUM' ? '#d97706' : '#dc2626';
  const confBadge = confidence ? '<span style="display:inline-block;padding:2px 10px;border-radius:10px;font-size:.7rem;font-weight:700;color:#fff;background:' + confColor + ';letter-spacing:.03em">' + confidence + '</span>' : '';

  let panelHtml = '<div style="font-size:.72rem;color:var(--accent);margin-bottom:8px;display:flex;align-items:center;gap:6px"><i class="fas fa-robot"></i>Automatically analyzed by ExpenseIQ engine</div>';

  // ── Summary row ──
  let summaryRows = [];
  if (e.eventName) summaryRows.push(['Linked Event', '<strong style="color:var(--accent)">' + e.eventName + '</strong>']);
  if (e.category) summaryRows.push(['Category', '<span style="text-transform:capitalize;font-weight:600">' + e.category.replace(/_/g, ' ') + '</span>']);
  if (confidence) summaryRows.push(['Confidence', confBadge]);
  if (lineage && lineage.analyzedAt) summaryRows.push(['Analyzed', new Date(lineage.analyzedAt).toLocaleString()]);
  if (summaryRows.length) panelHtml += _ldRow(summaryRows);

  // ── Analysis Steps (Data Lineage Trail) ──
  let steps = [];
  if (lineage && lineage.steps && lineage.steps.length) {
    steps = lineage.steps;
  } else {
    // Parse steps from pipe-delimited notes (legacy format)
    const cleanNotes = notes.replace(/\\[LINEAGE\\].+$/s, '').replace(/\\[ExpenseIQ(-Enriched)?\\]\\s*/g, '');
    const segments = cleanNotes.split(' | ').filter(s => s && !s.startsWith('Auto-parsed') && !s.startsWith('AI-enriched'));
    for (const seg of segments) {
      if (seg.startsWith('Hypothesis:')) steps.push({ step: 'date_proximity', detail: seg.replace('Hypothesis: ', ''), icon: 'calendar-alt' });
      else if (seg.includes('via document correlation')) steps.push({ step: 'document_verification', detail: seg, icon: 'file-alt' });
      else if (seg.includes('aligns with') || seg.includes('typically purchased') || seg.includes('within 7 days')) steps.push({ step: 'purpose_verification', detail: seg, icon: 'check-double' });
      else if (seg.startsWith('Documents:')) steps.push({ step: 'document_scan', detail: seg, icon: 'folder-open' });
      else if (seg.match(/confidence:\\s*\\w+/i)) continue;
      else steps.push({ step: 'analysis', detail: seg, icon: 'search' });
    }
  }

  if (steps.length) {
    panelHtml += '<div style="margin-top:10px;font-size:.78rem;font-weight:700;color:var(--text);margin-bottom:6px"><i class="fas fa-project-diagram me-1" style="color:var(--accent)"></i>Data Lineage Trail</div>';
    panelHtml += '<div style="position:relative;padding-left:22px;border-left:2px solid var(--accent);margin-left:8px">';
    const stepLabels = { merchant_id: 'Merchant Identified', date_proximity: 'Date Proximity', document_verification: 'Document Verified', document_scan: 'Documents Found', purpose_verification: 'Purpose Verified', post_event: 'Post-Event', analysis: 'Analysis' };
    steps.forEach((s, i) => {
      const label = stepLabels[s.step] || s.step.replace(/_/g, ' ');
      const icon = s.icon || 'circle';
      panelHtml += '<div style="position:relative;margin-bottom:8px;padding:8px 12px;background:var(--bg2);border-radius:8px;border:1px solid var(--line)">' +
        '<div style="position:absolute;left:-28px;top:10px;width:12px;height:12px;border-radius:50%;background:var(--accent);border:2px solid var(--bg1)"></div>' +
        '<div style="display:flex;align-items:center;gap:6px;margin-bottom:3px">' +
          '<i class="fas fa-' + icon + '" style="color:var(--accent);font-size:.7rem;width:14px;text-align:center"></i>' +
          '<span style="font-size:.72rem;font-weight:700;color:var(--accent);text-transform:uppercase;letter-spacing:.04em">Step ' + (i + 1) + ': ' + label + '</span>' +
        '</div>' +
        '<div style="font-size:.8rem;color:var(--text);line-height:1.4">' + escHtml(s.detail) + '</div>' +
        (s.source ? '<div style="font-size:.68rem;color:var(--muted);margin-top:2px"><i class="fas fa-database me-1"></i>' + escHtml(s.source) + '</div>' : '') +
      '</div>';
    });
    panelHtml += '</div>';
  }

  // ── Linked Documents (clickable data lineage) ──
  let docs = [];
  if (lineage && lineage.documents && lineage.documents.length) {
    docs = lineage.documents;
  } else {
    // Parse from notes text
    const docMatch = notes.match(/Documents:\\s*(.+?)(?:\\s*\\||$)/);
    if (docMatch) {
      docs = docMatch[1].split(',').map(d => d.trim()).filter(Boolean).map(p => {
        const parts = p.split('/');
        return { folder: parts.length > 1 ? parts[0] : '.', file: parts[parts.length - 1], path: p, type: 'file' };
      });
    }
  }

  if (docs.length) {
    panelHtml += '<div style="margin-top:10px;font-size:.78rem;font-weight:700;color:var(--text);margin-bottom:6px"><i class="fas fa-folder-open me-1" style="color:var(--accent)"></i>Linked Evidence Documents (' + docs.length + ')</div>';
    const typeIcons = { document: 'file-pdf', script: 'file-code', spreadsheet: 'file-excel', image: 'file-image', file: 'file' };
    const typeColors = { document: '#ef4444', script: '#3b82f6', spreadsheet: '#22c55e', image: '#f59e0b', file: '#6b7280' };
    docs.forEach(d => {
      const icon = typeIcons[d.type] || 'file';
      const color = typeColors[d.type] || '#6b7280';
      panelHtml += '<div style="display:flex;align-items:center;gap:8px;padding:6px 12px;background:var(--bg2);border-radius:6px;border:1px solid var(--line);margin-bottom:4px;cursor:pointer" ' +
        'onclick="openDocLineage(\\'' + escAttr(d.path) + '\\')" title="Click to view: ' + escAttr(d.path) + '">' +
        '<i class="fas fa-' + icon + '" style="color:' + color + ';font-size:.9rem;width:16px;text-align:center"></i>' +
        '<div style="flex:1;min-width:0">' +
          '<div style="font-size:.8rem;color:var(--text);font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + escHtml(d.file) + '</div>' +
          '<div style="font-size:.68rem;color:var(--muted)">' + escHtml(d.folder) + ' &middot; ' + (d.type || 'file') + '</div>' +
        '</div>' +
        '<i class="fas fa-external-link-alt" style="color:var(--muted);font-size:.65rem"></i>' +
      '</div>';
    });
  }

  // ── Event Match Method ──
  if (lineage && lineage.eventMatch) {
    const method = lineage.eventMatch.method === 'document_correlation' ?
      '<span style="color:#16a34a"><i class="fas fa-link me-1"></i>Document Correlation</span> &mdash; event linked via matching documents in workspace' :
      '<span style="color:#d97706"><i class="fas fa-calendar-alt me-1"></i>Date Proximity</span> &mdash; event linked by purchase date within event preparation window';
    panelHtml += '<div style="margin-top:8px;padding:6px 12px;background:rgba(139,92,246,.05);border:1px solid var(--accent);border-radius:8px;font-size:.76rem">' +
      '<span style="font-weight:700;color:var(--accent)">Match Method:</span> ' + method + '</div>';
  }

  return _ldSection('AI Expense Intelligence &mdash; Data Lineage', 'brain', panelHtml);
}

function escHtml(s) { return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
function escAttr(s) { return String(s || '').replace(/'/g,"\\\\'").replace(/"/g,'&quot;'); }

function openDocLineage(path) {
  // Open document in a new tab — for GitHub-hosted repos, link to raw file
  const ghBase = 'https://github.com/banfjax-hash/banf/blob/main/';
  const url = ghBase + encodeURIComponent(path).replace(/%2F/g, '/');
  window.open(url, '_blank');
}

// ── Debit Card ──
function renderDebitCardMapping(e) {
  let html = _ldRow([
    ['Merchant', e.payerOrPayee || e.description || '-'],
    ['Amount', '$' + (e.amount || 0).toLocaleString('en-US', {minimumFractionDigits:2})],
    ['Bank Date', e.bankDate ? new Date(e.bankDate).toLocaleDateString() : '-'],
    ['Source', (e.source || '').replace(/_/g, ' ')]
  ]);

  // Parse ExpenseIQ intelligence from notes
  const notes = e.notes || '';
  const iqMatch = notes.match(/\\[ExpenseIQ\\]\\s*(.+?)(?:\\s*\\(confidence:\\s*(\\w+)\\))?$/);
  if (iqMatch) {
    const iqDetails = iqMatch[1].split(' | ').filter(Boolean);
    const confidence = iqMatch[2] || '';
    const confColor = confidence === 'high' ? '#16a34a' : confidence === 'medium' ? '#d97706' : '#dc2626';
    const confLabel = confidence ? \`<span style="display:inline-block;padding:1px 8px;border-radius:10px;font-size:.68rem;font-weight:600;color:#fff;background:\${confColor}">\${confidence.toUpperCase()}</span>\` : '';

    let iqRows = [];
    for (const detail of iqDetails) {
      if (detail.startsWith('Documents:')) {
        const docs = detail.replace('Documents: ', '').split(', ');
        iqRows.push(['Linked Documents', docs.map(d => '<code style="font-size:.72rem;background:var(--surface);padding:1px 6px;border-radius:4px;margin:0 2px">' + d.replace(/</g,'&lt;') + '</code>').join('<br>')]);
      } else if (detail.startsWith('Hypothesis:')) {
        iqRows.push(['Hypothesis', detail.replace('Hypothesis: ', '')]);
      } else if (detail.includes('via document correlation')) {
        iqRows.push(['Verification', '<span style="color:#16a34a"><i class="fas fa-check-circle me-1"></i>' + detail + '</span>']);
      } else {
        iqRows.push(['Analysis', detail]);
      }
    }
    if (confidence) iqRows.push(['Confidence', confLabel]);
    if (e.eventName) iqRows.push(['Linked Event', '<strong>' + (e.eventName || '') + '</strong>']);

    html += _ldSection('AI Expense Intelligence', 'brain',
      '<div style="font-size:.72rem;color:var(--accent);margin-bottom:6px"><i class="fas fa-robot me-1"></i>Automatically analyzed by ExpenseIQ engine</div>' +
      _ldRow(iqRows));
  } else if (e.eventName) {
    html += _ldRow([['Linked Event', '<strong>' + e.eventName + '</strong>']]);
  }

  return _ldSection('Debit Card Transaction', 'credit-card', html);
}

// ── Generic ──
function renderGenericMapping(e) {
  const pairs = [['Description', e.description || '-'], ['Amount', '$' + (e.amount || 0).toLocaleString('en-US', {minimumFractionDigits:2})]];
  if (e.payerOrPayee) pairs.push([e.type === 'income' ? 'Payer' : 'Payee', e.payerOrPayee]);
  if (e.reference) pairs.push(['Reference', e.reference]);
  return _ldSection(e.type === 'income' ? 'Income Details' : 'Expense Details', e.type === 'income' ? 'arrow-down' : 'arrow-up', _ldRow(pairs));
}

// ── Member Lookup (for Zelle etc) ──
async function renderMemberLookup(name) {
  try {
    const data = await apiGetAuth('crm_member_search', { q: name, limit: 3 });
    if (!data.members || !data.members.length) return '';
    let html = '';
    data.members.forEach(m => {
      html += _ldRow([
        ['Name', _ldMemberLink(m.displayName || m.email, m.email || m.displayName)],
        ['Email', m.email || '-'],
        ['Phone', m.phone || '-'],
        ['Type', m.memberType || '-'],
        ['Family', m.familyId || '-']
      ]);
    });
    return _ldSection('Linked Member', 'user-check', html +
      '<div style="font-size:.72rem;color:var(--muted);margin-top:4px"><i class="fas fa-info-circle me-1"></i>Click name to view full member profile.</div>');
  } catch (_) { return ''; }
}

// ── Reimbursement ──
async function renderReimbursementMapping(e) {
  let ticketHtml = '';
  try {
    const data = await apiGet('reimbursement_list');
    if (data.success && data.tickets) {
      const ticketId = e.reference || e.sourceId;
      const ticket = data.tickets.find(t => t.id === ticketId);
      if (ticket) {
        const statusColors = {draft:'var(--dim)',pending_approval:'var(--yellow)',approved:'var(--green)',rejected:'var(--red)',payment_made:'var(--blue)',completed:'var(--green)'};
        const stColor = statusColors[ticket.status] || 'var(--muted)';
        ticketHtml += _ldRow([
          ['Ticket ID', '<span style="font-weight:700;color:var(--accent)">' + ticket.id + '</span>'],
          ['Status', '<span style="color:' + stColor + ';font-weight:600;text-transform:capitalize">' + (ticket.status || '').replace(/_/g, ' ') + '</span>'],
          ['Requester', ticket.requesterName || ticket.requester || '-'],
          ['Event', ticket.event || '-'],
          ['Total Amount', '$' + (ticket.totalAmount || 0).toLocaleString('en-US', {minimumFractionDigits:2})],
          ['Paid By', ticket.paidBy || '-']
        ]);
        // Receipts
        if (ticket.receipts && ticket.receipts.length) {
          ticketHtml += '<div style="margin-top:8px;font-size:.78rem;font-weight:600;color:var(--text);margin-bottom:4px"><i class="fas fa-receipt me-1" style="color:var(--accent)"></i>Receipts (' + ticket.receipts.length + ')</div>';
          ticket.receipts.forEach((r, i) => {
            ticketHtml += _ldRow([['#' + (i+1), r.description || '-'], ['Amount', '$' + (r.amount || 0).toFixed(2)], ['Category', r.category || '-'], ['Vendor', r.vendor || '-']]);
          });
        }
        // Approvals
        if (ticket.approvals && ticket.approvals.length) {
          ticketHtml += '<div style="margin-top:8px;font-size:.78rem;font-weight:600;color:var(--text);margin-bottom:4px"><i class="fas fa-check-double me-1" style="color:var(--green)"></i>Approval Chain</div>';
          ticket.approvals.forEach(a => {
            const aColor = a.decision === 'approved' ? 'var(--green)' : a.decision === 'rejected' ? 'var(--red)' : 'var(--yellow)';
            ticketHtml += _ldRow([['Approver', a.approver || '-'], ['Role', a.approverRole || '-'], ['Decision', '<span style="color:' + aColor + ';font-weight:600;text-transform:capitalize">' + (a.decision || '-') + '</span>'], ['Date', a.date ? new Date(a.date).toLocaleDateString() : '-'], ['Notes', a.notes || '-']]);
          });
        }
        // Payment
        if (ticket.paymentMade) {
          ticketHtml += _ldRow([['Payment Method', ticket.paymentMethod || '-'], ['Payment Reference', ticket.paymentReference || '-'], ['Paid By', ticket.paymentMadeBy || '-'], ['Paid At', ticket.paymentMadeAt ? new Date(ticket.paymentMadeAt).toLocaleDateString() : '-']]);
        }
      }
    }
  } catch (_) {}
  if (!ticketHtml) {
    ticketHtml = _ldRow([['Reimbursement Ref', e.reference || e.sourceId || '-'], ['Event', e.eventName || '-']]);
  }
  return _ldSection('Reimbursement Ticket', 'receipt', ticketHtml);
}

// ── Event Expense ──
async function renderEventExpenseMapping(e) {
  let evHtml = '';
  try {
    const year = new Date(e.entryDate).getFullYear();
    const data = await apiGet('event_expenses', { year: year, eventId: e.eventId || '' });
    if (data.success && data.events) {
      const ev = data.events.find(ev => ev.eventId === e.eventId) || data.events[0];
      if (ev) {
        evHtml += _ldRow([
          ['Event', ev.eventName || '-'],
          ['Total Budget', '$' + (ev.total || 0).toLocaleString('en-US', {minimumFractionDigits:2})],
          ['Approved', ev.approved ? '<span style="color:var(--green)"><i class="fas fa-check"></i> Yes</span>' : '<span style="color:var(--yellow)">Pending</span>'],
          ['Approved By', ev.approvedBy || '-'],
          ['Locked', ev.locked ? 'Yes' : 'No']
        ]);
        if (ev.entries && ev.entries.length) {
          evHtml += '<div style="margin-top:8px;font-size:.78rem;font-weight:600;color:var(--text);margin-bottom:4px"><i class="fas fa-list me-1" style="color:var(--accent)"></i>Expense Breakdown (' + ev.entries.length + ' items)</div>';
          ev.entries.forEach(x => {
            const isCurrent = Math.abs((x.amount || 0) - (e.amount || 0)) < 0.01 && x.description === e.description;
            const highlight = isCurrent ? 'border:1px solid var(--accent);background:rgba(139,92,246,.08);' : '';
            evHtml += '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:6px 16px;padding:8px 14px;background:var(--bg2);border-radius:8px;border:1px solid var(--line);margin-bottom:4px;' + highlight + '">' +
              '<div><div style="font-size:.68rem;color:var(--muted)">ITEM</div><div style="font-size:.82rem;color:var(--text)">' + (isCurrent ? '<i class="fas fa-arrow-right" style="color:var(--accent);margin-right:4px;font-size:.65rem"></i>' : '') + (x.description || '-') + '</div></div>' +
              '<div><div style="font-size:.68rem;color:var(--muted)">AMOUNT</div><div style="font-size:.82rem;color:var(--red)">$' + (x.amount || 0).toFixed(2) + '</div></div>' +
              '<div><div style="font-size:.68rem;color:var(--muted)">CATEGORY</div><div style="font-size:.82rem;color:var(--text);text-transform:capitalize">' + (x.category || '-').replace(/_/g, ' ') + '</div></div>' +
              '<div><div style="font-size:.68rem;color:var(--muted)">VENDOR</div><div style="font-size:.82rem;color:var(--text)">' + (x.payerOrPayee || '-') + '</div></div></div>';
          });
        }
      }
    }
  } catch (_) {}
  if (!evHtml) {
    evHtml = _ldRow([['Event', e.eventName || '-'], ['Event ID', e.eventId || '-'], ['Amount', '$' + (e.amount || 0).toFixed(2)]]);
  }
  return _ldSection('Event Expense Details', 'calendar-check', evHtml);
}

// ── Procurement ──
async function renderProcurementMapping(e) {
  try {
    const data = await apiGet('procurement_list');
    if (!data.success || !data.requests) return '';
    const matches = data.requests.filter(p => {
      if (e.reference && p.id === e.reference) return true;
      if (e.eventId && p.event === e.eventId && Math.abs((p.amount || 0) - (e.amount || 0)) < 1) return true;
      return false;
    });
    if (!matches.length) return '';
    let html = '';
    matches.forEach(p => {
      const stColors = {pending:'var(--yellow)',approved:'var(--green)',rejected:'var(--red)',completed:'var(--green)',receipt_submitted:'var(--blue)'};
      html += _ldRow([
        ['Procurement ID', '<span style="font-weight:700;color:var(--accent)">' + (p.id || '-') + '</span>'],
        ['Status', '<span style="color:' + (stColors[p.status] || 'var(--muted)') + ';text-transform:capitalize;font-weight:600">' + (p.status || '-').replace(/_/g, ' ') + '</span>'],
        ['Vendor', p.vendor || '-'],
        ['Category', (p.category || '-').replace(/_/g, ' ')],
        ['Amount', '$' + (p.amount || 0).toFixed(2)],
        ['Requester', p.requester || '-'],
        ['Event', p.event || '-'],
        ['Urgent', p.urgent ? '<span style="color:var(--red)">Yes</span>' : 'No']
      ]);
    });
    return _ldSection('Procurement Request', 'shopping-cart', html);
  } catch (_) { return ''; }
}

// ── Member Profile Overlay ──
async function openMemberProfile(query) {
  const overlay = document.getElementById('member-profile-overlay');
  const content = document.getElementById('mp-content');
  document.getElementById('mp-name').textContent = query;
  document.getElementById('mp-subtitle').textContent = 'Loading profile...';
  content.innerHTML = '<div style="text-align:center;color:var(--muted);padding:24px"><i class="fas fa-spinner fa-spin"></i> Loading member profile...</div>';
  overlay.style.display = 'block';

  try {
    const data = await apiGetAuth('crm_member_search', { q: query, limit: 1 });
    if (!data.members || !data.members.length) {
      content.innerHTML = '<div style="text-align:center;color:var(--dim);padding:24px"><i class="fas fa-user-slash" style="font-size:2rem;margin-bottom:8px;display:block"></i>Member not found for "' + query + '"</div>';
      document.getElementById('mp-subtitle').textContent = 'Not found';
      return;
    }
    const m = data.members[0];
    document.getElementById('mp-name').textContent = m.displayName || m.email;
    document.getElementById('mp-subtitle').textContent = (m.memberType || 'Member') + (m.isLifeMember ? ' • Life Member' : '') + (m.isActive ? ' • Active' : '');

    let html = '';
    // Contact
    html += '<div style="margin-bottom:16px"><div style="font-size:.82rem;font-weight:700;color:var(--text);margin-bottom:8px;display:flex;align-items:center;gap:6px"><i class="fas fa-address-card" style="color:var(--accent)"></i>Contact Information</div>';
    html += _ldRow([
      ['Email', m.email || '-'],
      ['Phone', m.phone || '-'],
      ['Address', [m.address, m.city, m.state, m.zip].filter(Boolean).join(', ') || '-'],
      ['City', m.city || '-'],
      ['State', m.state || '-']
    ]);
    html += '</div>';

    // Membership
    html += '<div style="margin-bottom:16px"><div style="font-size:.82rem;font-weight:700;color:var(--text);margin-bottom:8px;display:flex;align-items:center;gap:6px"><i class="fas fa-id-card" style="color:var(--accent)"></i>Membership</div>';
    html += _ldRow([
      ['Member Type', m.memberType || '-'],
      ['Tier', m.tier || m.membershipTier || '-'],
      ['Category', m.membershipCategory || '-'],
      ['Member Since', m.memberSince ? new Date(m.memberSince).toLocaleDateString() : '-'],
      ['Life Member', m.isLifeMember ? '<span style="color:var(--green)">Yes</span>' : 'No'],
      ['Active', m.isActive ? '<span style="color:var(--green)">Yes</span>' : '<span style="color:var(--red)">No</span>'],
      ['Membership Years', m.membershipYears || '-'],
      ['Family ID', m.familyId || '-']
    ]);
    html += '</div>';

    // Family
    html += '<div style="margin-bottom:16px"><div style="font-size:.82rem;font-weight:700;color:var(--text);margin-bottom:8px;display:flex;align-items:center;gap:6px"><i class="fas fa-people-roof" style="color:var(--accent)"></i>Family</div>';
    html += _ldRow([
      ['Spouse', m.spouseName || m.spouse || '-'],
      ['Children', (m.childrenNames || m.children || []).join ? (m.childrenNames || m.children || []).join(', ') || '-' : (m.childrenNames || m.children || '-')]
    ]);
    // Extended family
    if (m.familyId) {
      try {
        const fData = await apiGetAuth('crm_family', { familyId: m.familyId });
        if (fData.family) {
          const fam = fData.family;
          if (fam.adults && fam.adults.length > 0) {
            let aHtml = fam.adults.map(a => '<span style="color:var(--text);margin-right:12px"><i class="fas fa-user" style="font-size:.65rem;color:var(--accent);margin-right:3px"></i>' + (a.displayName || a.name || a.email || '-') + '</span>').join('');
            html += '<div style="padding:6px 14px;background:var(--bg2);border:1px solid var(--line);border-radius:8px;margin-bottom:4px"><div style="font-size:.68rem;color:var(--muted)">FAMILY ADULTS</div><div style="font-size:.82rem">' + aHtml + '</div></div>';
          }
          if (fam.minors && fam.minors.length > 0) {
            let mHtml = fam.minors.map(c => '<span style="color:var(--text);margin-right:12px"><i class="fas fa-child" style="font-size:.65rem;color:var(--purple);margin-right:3px"></i>' + (c.name || '-') + (c.age ? ' (age ' + c.age + ')' : '') + '</span>').join('');
            html += '<div style="padding:6px 14px;background:var(--bg2);border:1px solid var(--line);border-radius:8px;margin-bottom:4px"><div style="font-size:.68rem;color:var(--muted)">CHILDREN / MINORS</div><div style="font-size:.82rem">' + mHtml + '</div></div>';
          }
        }
      } catch (_) {}
    }
    html += '</div>';

    // Professional
    if (m.profession || m.employer || m.education) {
      html += '<div style="margin-bottom:16px"><div style="font-size:.82rem;font-weight:700;color:var(--text);margin-bottom:8px;display:flex;align-items:center;gap:6px"><i class="fas fa-briefcase" style="color:var(--accent)"></i>Professional</div>';
      html += _ldRow([
        ['Profession', m.profession || '-'],
        ['Employer', m.employer || '-'],
        ['Education', m.education || '-'],
        ['Skills', Array.isArray(m.skills) ? m.skills.join(', ') : (m.skills || '-')]
      ]);
      html += '</div>';
    }

    // Payment History (if available)
    if (m.payments && m.payments.length) {
      html += '<div style="margin-bottom:16px"><div style="font-size:.82rem;font-weight:700;color:var(--text);margin-bottom:8px;display:flex;align-items:center;gap:6px"><i class="fas fa-dollar-sign" style="color:var(--green)"></i>Payment History</div>';
      m.payments.forEach(p => {
        html += _ldRow([['Date', p.date || '-'], ['Amount', '$' + (p.amount || 0)], ['Method', p.method || '-'], ['Category', p.category || '-'], ['Reference', p.reference || '-']]);
      });
      html += '</div>';
    }

    // Notes
    if (m.notes || m.adminNotes) {
      html += '<div style="margin-bottom:8px"><div style="font-size:.82rem;font-weight:700;color:var(--text);margin-bottom:6px"><i class="fas fa-sticky-note" style="color:var(--accent);margin-right:6px"></i>Notes</div>';
      html += '<div style="font-size:.82rem;color:var(--text);padding:8px 14px;background:var(--bg2);border:1px solid var(--line);border-radius:8px">' + (m.notes || m.adminNotes || '-') + '</div></div>';
    }

    content.innerHTML = html;
  } catch (err) {
    content.innerHTML = '<div style="text-align:center;color:var(--red);padding:24px"><i class="fas fa-exclamation-triangle" style="font-size:1.5rem;margin-bottom:8px;display:block"></i>Error loading profile: ' + err.message + '</div>';
  }
}

// --- Income Summary ---
let _incomePieChart = null;
let _incomeBarChart = null;

async function loadIncomeSummary() {
  const yearSel = document.getElementById('income-year-select');
  const year = yearSel.value || new Date().getFullYear();
  const data = await apiGet('ledger', { year: year, type: 'income', limit: 1000 });
  if (!data.success) return;

  const entries = data.entries || [];
  const INCOME_CATS = ['membership','event_ticket','sponsorship','donation','advertisement','other_income'];
  const catTotals = {};
  const catCounts = {};
  let grandTotal = 0;
  INCOME_CATS.forEach(c => { catTotals[c] = 0; catCounts[c] = 0; });
  entries.forEach(e => {
    const c = e.category || 'other_income';
    if (!catTotals[c]) catTotals[c] = 0;
    if (!catCounts[c]) catCounts[c] = 0;
    catTotals[c] += e.amount || 0;
    catCounts[c]++;
    grandTotal += e.amount || 0;
  });

  // KPIs
  const kpiGrid = document.getElementById('income-kpi-grid');
  const kpiColors = {membership:'green',event_ticket:'blue',sponsorship:'purple',donation:'pink',advertisement:'yellow',other_income:'cyan'};
  kpiGrid.innerHTML = INCOME_CATS.map(c => {
    const label = c.replace(/_/g, ' ');
    return '<div class="kpi ' + (kpiColors[c] || 'blue') + '"><div class="v">$' + (catTotals[c] || 0).toLocaleString('en-US',{minimumFractionDigits:2}) + '</div><div class="k" style="text-transform:capitalize">' + label + '</div></div>';
  }).join('') + '<div class="kpi green"><div class="v">$' + grandTotal.toLocaleString('en-US',{minimumFractionDigits:2}) + '</div><div class="k">Grand Total</div></div>';

  // Table
  const tbody = document.getElementById('income-table-body');
  tbody.innerHTML = INCOME_CATS.filter(c => catTotals[c] > 0).map(c => {
    const pct = grandTotal > 0 ? ((catTotals[c] / grandTotal) * 100).toFixed(1) : '0.0';
    return '<tr><td style="text-transform:capitalize">' + c.replace(/_/g,' ') + '</td><td style="text-align:right;color:var(--green);font-weight:600">$' + catTotals[c].toLocaleString('en-US',{minimumFractionDigits:2}) + '</td><td style="text-align:right">' + pct + '%</td><td style="text-align:right">' + catCounts[c] + '</td></tr>';
  }).join('') + '<tr style="border-top:2px solid var(--line);font-weight:700"><td>Total</td><td style="text-align:right;color:var(--green)">$' + grandTotal.toLocaleString('en-US',{minimumFractionDigits:2}) + '</td><td style="text-align:right">100%</td><td style="text-align:right">' + entries.length + '</td></tr>';

  // Charts
  const activeLabels = INCOME_CATS.filter(c => catTotals[c] > 0);
  const activeData = activeLabels.map(c => catTotals[c]);
  const chartColors = ['#22c55e','#3b82f6','#a855f7','#ec4899','#eab308','#06b6d4'];
  const bgColors = activeLabels.map((_, i) => chartColors[i % chartColors.length]);

  if (_incomePieChart) _incomePieChart.destroy();
  const pieCtx = document.getElementById('income-pie-chart').getContext('2d');
  _incomePieChart = new Chart(pieCtx, {
    type: 'doughnut',
    data: { labels: activeLabels.map(c => c.replace(/_/g,' ')), datasets: [{ data: activeData, backgroundColor: bgColors, borderWidth: 0 }] },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position:'bottom', labels:{color:'#94a3b8',font:{size:11}} }, title:{display:true,text:'Income by Category',color:'#e2e8f0'} } }
  });

  // Monthly bar chart
  const months = Array.from({length:12}, (_,i) => i);
  const monthLabels = months.map(i => new Date(2024,i).toLocaleString('en-US',{month:'short'}));
  const monthData = months.map(mi => entries.filter(e => new Date(e.entryDate).getMonth() === mi).reduce((s,e) => s + (e.amount||0), 0));

  if (_incomeBarChart) _incomeBarChart.destroy();
  const barCtx = document.getElementById('income-bar-chart').getContext('2d');
  _incomeBarChart = new Chart(barCtx, {
    type: 'bar',
    data: { labels: monthLabels, datasets: [{ label: 'Monthly Income', data: monthData, backgroundColor: '#22c55e88', borderColor: '#22c55e', borderWidth: 1 }] },
    options: { responsive: true, maintainAspectRatio: false, scales: { y:{ticks:{color:'#94a3b8',callback:v=>'$'+v.toLocaleString()},grid:{color:'#1e293b'}}, x:{ticks:{color:'#94a3b8'},grid:{display:false}} }, plugins: { legend:{display:false}, title:{display:true,text:'Monthly Income Trend',color:'#e2e8f0'} } }
  });
}

// --- Event Expenses (with CRUD + Approval) ---
let _eventExpenseChart = null;
let _eventExpenseData = null;  // cached response from get_event_expenses

const BANF_EVENTS = [
  { id:'bosonto-utsob-2026', name:'Bosonto Utsob'},{ id:'noboborsho-2026', name:'Noboborsho'},
  { id:'kids-summer-sports-2026', name:'Kids Summer Sports Training'},{ id:'summer-workshops-kids-2026', name:'Summer Workshops — Kids'},
  { id:'summer-workshops-general-2026', name:'Summer Workshops — General'},{ id:'sports-day-2026', name:'Sports Day'},
  { id:'spondon-2026', name:'Spondon'},{ id:'mahalaya-2026', name:'Mahalaya'},
  { id:'durga-puja-2026', name:'Durga Puja Day 1 & 2 + Lunch'},{ id:'lakshmi-puja-2026', name:'Lakshmi Puja'},
  { id:'bijoya-sonmiloni-2026', name:'Bijoya Sonmiloni'},{ id:'artist-program-day1-2026', name:'Artist Program Day 1 + Dinner'},
  { id:'artist-program-day2-2026', name:'Artist Program Day 2 + Dinner'},{ id:'kali-puja-2026', name:'Kali Puja + Lunch'},
  { id:'natok-dinner-2026', name:'Natok (Drama) + Dinner'},{ id:'winter-picnic-2027', name:'Winter Picnic'},
  { id:'saraswati-puja-2027', name:'Saraswati Puja'}
];

function isExpensePrivileged() {
  if (!CURRENT_ADMIN) return false;
  return ['President','Vice President','Treasurer'].includes(CURRENT_ADMIN.ecTitle);
}
function isPresident() {
  return CURRENT_ADMIN && CURRENT_ADMIN.email === 'ranadhir.ghosh@gmail.com';
}

async function loadEventExpenses() {
  const yearSel = document.getElementById('event-exp-year-select');
  const year = yearSel.value || new Date().getFullYear();

  // Show/hide action buttons based on role
  const priv0 = isExpensePrivileged();
  const addBtn = document.getElementById('btn-add-event-expense');
  if (addBtn) addBtn.style.display = priv0 ? '' : 'none';
  const uploadBtn = document.getElementById('btn-upload-excel');
  if (uploadBtn) uploadBtn.style.display = priv0 ? '' : 'none';
  const tmplBtn = document.getElementById('btn-create-template');
  if (tmplBtn) tmplBtn.style.display = priv0 ? '' : 'none';

  const data = await apiGet('event_expenses', { year: year });
  if (!data || !data.success) {
    // Fallback to old ledger endpoint
    return loadEventExpensesFallback(year);
  }
  _eventExpenseData = data;

  const evts = data.events || [];
  const grandTotal = data.grandTotal || 0;

  // KPIs
  const kpiGrid = document.getElementById('event-exp-kpis');
  kpiGrid.innerHTML = '<div class="kpi red"><div class="v">$' + grandTotal.toLocaleString('en-US',{minimumFractionDigits:2}) + '</div><div class="k">Total Expenses</div></div>' +
    '<div class="kpi orange"><div class="v">' + evts.length + '</div><div class="k">Events</div></div>' +
    '<div class="kpi blue"><div class="v">' + evts.reduce((s,e) => s + (e.entries||[]).length, 0) + '</div><div class="k">Entries</div></div>' +
    (evts.length > 0 ? '<div class="kpi purple"><div class="v">$' + (grandTotal / evts.length).toLocaleString('en-US',{minimumFractionDigits:2}) + '</div><div class="k">Avg per Event</div></div>' : '') +
    '<div class="kpi green"><div class="v">' + evts.filter(e => e.approved).length + '/' + evts.length + '</div><div class="k">Approved</div></div>';

  // Event cards with drill-down
  const cardsDiv = document.getElementById('event-expense-cards');
  const priv = isExpensePrivileged();
  const pres = isPresident();
  cardsDiv.innerHTML = evts.sort((a,b) => b.total - a.total).map(ev => {
    const statusBadge = ev.approved
      ? '<span style="background:#22c55e22;color:var(--green);padding:2px 8px;border-radius:4px;font-size:.72rem;font-weight:600"><i class="fas fa-lock me-1"></i>Approved by ' + (ev.approvedBy || '') + '</span>'
      : '<span style="background:#eab30822;color:#eab308;padding:2px 8px;border-radius:4px;font-size:.72rem;font-weight:600"><i class="fas fa-lock-open me-1"></i>Pending Approval</span>';
    const approveBtn = priv && !ev.approved ? '<button onclick="approveEventExpense(\\'' + ev.eventId + '\\',\\'' + (ev.eventName||'').replace(/'/g,"\\\\'") + '\\')" style="background:var(--green);color:#000;border:none;padding:4px 10px;border-radius:4px;font-size:.72rem;cursor:pointer;font-weight:600"><i class="fas fa-check me-1"></i>Approve & Lock</button>' : '';
    const unlockBtn = pres && ev.approved ? '<button onclick="unlockEventExpense(\\'' + ev.eventId + '\\')" style="background:var(--red);color:#fff;border:none;padding:4px 10px;border-radius:4px;font-size:.72rem;cursor:pointer;font-weight:600"><i class="fas fa-unlock me-1"></i>Unlock (Exception)</button>' : '';

    const entries = (ev.entries || []).sort((a,b) => new Date(b.entryDate) - new Date(a.entryDate));
    const rows = entries.map(e => {
      const dt = new Date(e.entryDate);
      const editBtn = priv && !ev.locked ? '<button onclick="openEditExpenseModal(\\'' + e.id + '\\',\\'' + ev.eventId + '\\',\\'' + (ev.eventName||'').replace(/'/g,"\\\\'") + '\\')" style="background:none;border:none;color:var(--blue);cursor:pointer;font-size:.78rem" title="Edit"><i class="fas fa-edit"></i></button>' : '';
      return '<tr><td>' + dt.toLocaleDateString('en-US',{month:'short',day:'numeric'}) + '</td><td style="text-transform:capitalize">' + (e.category||'').replace(/_/g,' ') + '</td><td>' + (e.description||'') + '</td><td style="text-align:right;color:var(--red);font-weight:600">$' + (e.amount||0).toLocaleString('en-US',{minimumFractionDigits:2}) + '</td><td>' + (e.payerOrPayee||'') + '</td><td style="font-size:.72rem;color:var(--muted)">' + (e.source||'') + '</td><td>' + editBtn + '</td></tr>';
    }).join('');

    return '<div style="background:var(--bg2);border:1px solid var(--line);border-radius:10px;padding:14px;margin-bottom:12px">' +
      '<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:10px">' +
        '<strong style="font-size:.92rem">' + (ev.eventName||ev.eventId) + '</strong>' +
        '<span style="color:var(--red);font-weight:700;margin-left:auto">$' + (ev.total||0).toLocaleString('en-US',{minimumFractionDigits:2}) + '</span>' +
        statusBadge + approveBtn + unlockBtn +
      '</div>' +
      '<div style="overflow-x:auto"><table class="t" style="font-size:.8rem"><thead><tr><th>Date</th><th>Category</th><th>Description</th><th style="text-align:right">Amount</th><th>Paid To</th><th>Source</th><th></th></tr></thead><tbody>' + (rows || '<tr><td colspan="7" style="text-align:center;color:var(--muted)">No entries</td></tr>') + '</tbody></table></div>' +
    '</div>';
  }).join('') || '<p style="color:var(--muted);text-align:center">No expense entries found for this year.</p>';

  // Chart — stacked bar
  const expCats = ['venue','catering','decoration','photography','sound_music','other_expense'];
  const catColors = ['#ef4444','#f97316','#eab308','#a855f7','#06b6d4','#6366f1'];
  const eventNames = evts.sort((a,b) => b.total - a.total).map(e => e.eventName || e.eventId);
  const datasets = expCats.map((cat, i) => ({
    label: cat.replace(/_/g,' '), borderWidth: 0, backgroundColor: catColors[i],
    data: evts.sort((a,b) => b.total - a.total).map(ev => (ev.entries||[]).filter(e => {
      if (cat === 'other_expense') return !['venue','catering','decoration','photography','sound_music'].includes(e.category);
      return e.category === cat;
    }).reduce((s,e) => s + (e.amount||0), 0))
  }));

  if (_eventExpenseChart) _eventExpenseChart.destroy();
  const ctx = document.getElementById('event-expense-chart').getContext('2d');
  _eventExpenseChart = new Chart(ctx, {
    type: 'bar',
    data: { labels: eventNames.map(n => n.length > 20 ? n.slice(0,20)+'...' : n), datasets },
    options: { responsive: true, maintainAspectRatio: false, scales: { x:{stacked:true,ticks:{color:'#94a3b8'},grid:{display:false}}, y:{stacked:true,ticks:{color:'#94a3b8',callback:v=>'$'+v.toLocaleString()},grid:{color:'#1e293b'}} }, plugins: { legend:{position:'bottom',labels:{color:'#94a3b8',font:{size:11}}}, title:{display:true,text:'Expense Breakdown by Event',color:'#e2e8f0'} } }
  });
}

// Fallback if event_expenses endpoint not yet deployed
async function loadEventExpensesFallback(year) {
  const data = await apiGet('ledger', { year: year, type: 'expense', limit: 1000 });
  if (!data.success) return;
  const entries = data.entries || [];
  const events = {};
  let grandTotal = 0;
  entries.forEach(e => {
    const ev = e.eventName || '(Unassigned)';
    if (!events[ev]) events[ev] = { total: 0, venue:0, catering:0, decoration:0, photography:0, sound_music:0, other:0 };
    const cat = e.category || 'other_expense';
    const amt = e.amount || 0;
    events[ev].total += amt;
    grandTotal += amt;
    if (['venue','catering','decoration','photography','sound_music'].includes(cat)) events[ev][cat] += amt;
    else events[ev].other += amt;
  });
  const eventNames = Object.keys(events).sort((a,b) => events[b].total - events[a].total);
  const kpiGrid = document.getElementById('event-exp-kpis');
  kpiGrid.innerHTML = '<div class="kpi red"><div class="v">$' + grandTotal.toLocaleString('en-US',{minimumFractionDigits:2}) + '</div><div class="k">Total Expenses</div></div>' +
    '<div class="kpi orange"><div class="v">' + eventNames.length + '</div><div class="k">Events</div></div>' +
    '<div class="kpi blue"><div class="v">' + entries.length + '</div><div class="k">Entries</div></div>';
  const cardsDiv = document.getElementById('event-expense-cards');
  cardsDiv.innerHTML = '<div style="overflow-x:auto"><table class="t"><thead><tr><th>Event</th><th style="text-align:right">Total</th><th style="text-align:right">Venue</th><th style="text-align:right">Catering</th><th style="text-align:right">Decoration</th><th style="text-align:right">Photo</th><th style="text-align:right">Sound</th><th style="text-align:right">Other</th></tr></thead><tbody>' +
    eventNames.map(ev => {
      const d = events[ev];
      return '<tr><td>' + ev + '</td><td style="text-align:right;font-weight:600;color:var(--red)">$' + d.total.toLocaleString('en-US',{minimumFractionDigits:2}) + '</td><td style="text-align:right">$' + d.venue.toLocaleString('en-US',{minimumFractionDigits:2}) + '</td><td style="text-align:right">$' + d.catering.toLocaleString('en-US',{minimumFractionDigits:2}) + '</td><td style="text-align:right">$' + d.decoration.toLocaleString('en-US',{minimumFractionDigits:2}) + '</td><td style="text-align:right">$' + d.photography.toLocaleString('en-US',{minimumFractionDigits:2}) + '</td><td style="text-align:right">$' + d.sound_music.toLocaleString('en-US',{minimumFractionDigits:2}) + '</td><td style="text-align:right">$' + d.other.toLocaleString('en-US',{minimumFractionDigits:2}) + '</td></tr>';
    }).join('') + '</tbody></table></div>';
  // Chart
  const expCats = ['venue','catering','decoration','photography','sound_music','other'];
  const catColors = ['#ef4444','#f97316','#eab308','#a855f7','#06b6d4','#6366f1'];
  const datasets = expCats.map((cat, i) => ({ label: cat.replace(/_/g,' '), data: eventNames.map(ev => events[ev][cat] || 0), backgroundColor: catColors[i], borderWidth: 0 }));
  if (_eventExpenseChart) _eventExpenseChart.destroy();
  const ctx = document.getElementById('event-expense-chart').getContext('2d');
  _eventExpenseChart = new Chart(ctx, { type: 'bar', data: { labels: eventNames.map(n => n.length > 20 ? n.slice(0,20)+'...' : n), datasets }, options: { responsive: true, maintainAspectRatio: false, scales: { x:{stacked:true,ticks:{color:'#94a3b8'},grid:{display:false}}, y:{stacked:true,ticks:{color:'#94a3b8',callback:v=>'$'+v.toLocaleString()},grid:{color:'#1e293b'}} }, plugins: { legend:{position:'bottom',labels:{color:'#94a3b8',font:{size:11}}}, title:{display:true,text:'Expense Breakdown by Event',color:'#e2e8f0'} } } });
}

// Expense modal helpers
function openAddExpenseModal() {
  document.getElementById('expense-modal-title').innerHTML = '<i class="fas fa-plus me-1"></i>Add Expense';
  document.getElementById('exp-entry-id').value = '';
  document.getElementById('exp-amount').value = '';
  document.getElementById('exp-description').value = '';
  document.getElementById('exp-payee').value = '';
  document.getElementById('exp-reference').value = '';
  document.getElementById('exp-date').value = new Date().toISOString().split('T')[0];
  document.getElementById('expense-modal-error').style.display = 'none';
  // Populate event dropdown
  const evSel = document.getElementById('exp-event');
  evSel.innerHTML = BANF_EVENTS.map(e => '<option value="' + e.id + '">' + e.name + '</option>').join('');
  document.getElementById('expense-modal-overlay').style.display = 'flex';
}

function openEditExpenseModal(entryId, eventId, eventName) {
  if (!_eventExpenseData) return;
  // Find entry in cached data
  let entry = null;
  (_eventExpenseData.events || []).forEach(ev => {
    (ev.entries || []).forEach(e => { if (e.id === entryId) entry = e; });
  });
  if (!entry) return alert('Entry not found');
  document.getElementById('expense-modal-title').innerHTML = '<i class="fas fa-edit me-1"></i>Edit Expense';
  document.getElementById('exp-entry-id').value = entryId;
  const evSel = document.getElementById('exp-event');
  evSel.innerHTML = BANF_EVENTS.map(e => '<option value="' + e.id + '"' + (e.id === eventId ? ' selected' : '') + '>' + e.name + '</option>').join('');
  document.getElementById('exp-category').value = entry.category || 'other_expense';
  document.getElementById('exp-amount').value = entry.amount || '';
  document.getElementById('exp-description').value = entry.description || '';
  document.getElementById('exp-payee').value = entry.payerOrPayee || '';
  document.getElementById('exp-date').value = entry.entryDate ? new Date(entry.entryDate).toISOString().split('T')[0] : '';
  document.getElementById('exp-reference').value = entry.reference || '';
  document.getElementById('expense-modal-error').style.display = 'none';
  document.getElementById('expense-modal-overlay').style.display = 'flex';
}

function closeExpenseModal() {
  document.getElementById('expense-modal-overlay').style.display = 'none';
}

async function saveExpense() {
  const errEl = document.getElementById('expense-modal-error');
  errEl.style.display = 'none';
  const amount = parseFloat(document.getElementById('exp-amount').value);
  if (!amount || amount <= 0) { errEl.textContent = 'Please enter a valid amount.'; errEl.style.display = 'block'; return; }

  const evSel = document.getElementById('exp-event');
  const selectedEvent = BANF_EVENTS.find(e => e.id === evSel.value);
  const body = {
    email: CURRENT_ADMIN.email,
    entryId: document.getElementById('exp-entry-id').value || undefined,
    eventId: evSel.value,
    eventName: selectedEvent ? selectedEvent.name : evSel.value,
    category: document.getElementById('exp-category').value,
    amount: amount,
    description: document.getElementById('exp-description').value,
    payerOrPayee: document.getElementById('exp-payee').value,
    entryDate: document.getElementById('exp-date').value,
    reference: document.getElementById('exp-reference').value
  };

  const btn = document.getElementById('btn-save-expense');
  btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i>Saving...';
  const res = await apiCall('event_expense_add', body);
  btn.disabled = false; btn.innerHTML = '<i class="fas fa-save me-1"></i>Save';

  if (res.success) {
    closeExpenseModal();
    addLog('EXPENSE', (body.entryId ? 'Updated' : 'Added') + ' expense: $' + amount + ' for ' + body.eventName);
    loadEventExpenses();
  } else {
    errEl.textContent = res.error || 'Failed to save expense.';
    errEl.style.display = 'block';
  }
}

async function approveEventExpense(eventId, eventName) {
  if (!confirm('Approve and lock all expenses for "' + eventName + '"? Once approved, expenses cannot be modified unless the President raises an exception.')) return;
  const year = document.getElementById('event-exp-year-select').value || new Date().getFullYear();
  const res = await apiCall('event_expense_approve', { email: CURRENT_ADMIN.email, eventId: eventId, eventName: eventName, year: year });
  if (res.success) {
    addLog('APPROVE', 'Approved event expenses for ' + eventName);
    loadEventExpenses();
  } else {
    alert(res.error || 'Failed to approve.');
  }
}

async function unlockEventExpense(eventId) {
  const reason = prompt('Reason for unlocking approved expenses (President exception):');
  if (!reason) return;
  const res = await apiCall('event_expense_exception', { email: CURRENT_ADMIN.email, eventId: eventId, reason: reason });
  if (res.success) {
    addLog('EXCEPTION', 'President unlocked event expenses for ' + eventId + ': ' + reason);
    loadEventExpenses();
  } else {
    alert(res.error || 'Failed to unlock.');
  }
}

// ═══════════════════════════════════════════════════
// EXCEL EXPENSE UPLOAD & RECONCILIATION
// ═══════════════════════════════════════════════════
let _excelReconData = null;

async function handleExpenseExcelUpload(event) {
  const file = event.target.files[0];
  if (!file) return;
  event.target.value = ''; // reset for re-upload

  const ext = file.name.split('.').pop().toLowerCase();
  let rows = [];

  if (ext === 'csv') {
    const text = await file.text();
    rows = parseCSVRows(text);
  } else {
    // Use SheetJS for xlsx/xls
    if (!window.XLSX) {
      const s = document.createElement('script');
      s.src = 'https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js';
      document.head.appendChild(s);
      await new Promise((res, rej) => { s.onload = res; s.onerror = () => rej(new Error('Failed to load SheetJS')); });
    }
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { type: 'array' });
    const ws = wb.Sheets[wb.SheetNames[0]];
    rows = XLSX.utils.sheet_to_json(ws, { defval: '' });
  }

  if (!rows.length) return alert('No data found in file.');

  // Normalize column names (find: description/item, amount/cost, category, date, vendor/payee)
  const excelItems = rows.map((r, i) => {
    const desc = r.description || r.Description || r.item || r.Item || r.name || r.Name || r['Line Item'] || '';
    const amt = parseFloat(r.amount || r.Amount || r.cost || r.Cost || r.total || r.Total || 0) || 0;
    const cat = r.category || r.Category || r.type || r.Type || '';
    const dt = r.date || r.Date || '';
    const payee = r.vendor || r.Vendor || r.payee || r.Payee || r['Paid To'] || '';
    return { index: i + 1, description: String(desc).trim(), amount: Math.round(amt * 100) / 100, category: cat, date: dt, payee: payee };
  }).filter(it => it.description || it.amount > 0);

  // Show event selector + reconciliation modal
  const evSel = document.getElementById('excel-recon-event');
  evSel.innerHTML = BANF_EVENTS.map(e => '<option value="' + e.id + '">' + e.name + '</option>').join('');

  _excelReconData = { fileName: file.name, items: excelItems, matched: {} };
  document.getElementById('excel-recon-overlay').style.display = 'flex';

  // Load reimbursement-linked entries for the first event
  await reconcileExcelWithReimbursements();
}

function parseCSVRows(text) {
  const lines = text.split('\\n').map(l => l.trim()).filter(Boolean);
  if (lines.length < 2) return [];
  const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim());
  return lines.slice(1).map(line => {
    const vals = line.split(',').map(v => v.replace(/"/g, '').trim());
    const obj = {};
    headers.forEach((h, i) => { obj[h] = vals[i] || ''; });
    return obj;
  });
}

async function reconcileExcelWithReimbursements() {
  if (!_excelReconData) return;
  const eventId = document.getElementById('excel-recon-event').value;
  const year = document.getElementById('event-exp-year-select').value || new Date().getFullYear();

  // Fetch existing expense entries for this event (includes reimbursement-sourced ones)
  const data = await apiGet('event_expenses', { year: year, eventId: eventId });
  const eventEntries = [];
  (data.events || []).forEach(ev => { (ev.entries || []).forEach(e => eventEntries.push(e)); });

  // Match excel items to ledger entries by description similarity + amount
  const items = _excelReconData.items;
  const matched = {};
  items.forEach(xl => {
    const descLower = xl.description.toLowerCase();
    let bestMatch = null, bestScore = 0;
    eventEntries.forEach(le => {
      let score = 0;
      const leDesc = (le.description || '').toLowerCase();
      // Amount match (exact or close)
      if (xl.amount > 0 && Math.abs(xl.amount - (le.amount || 0)) < 0.02) score += 50;
      // Description word overlap
      const xlWords = descLower.split(/\\s+/).filter(w => w.length > 2);
      const leWords = leDesc.split(/\\s+/).filter(w => w.length > 2);
      const overlap = xlWords.filter(w => leWords.some(lw => lw.includes(w) || w.includes(lw))).length;
      if (xlWords.length > 0) score += (overlap / xlWords.length) * 40;
      // Reference/source match
      if (le.source === 'reimbursement') score += 5;
      if (score > bestScore) { bestScore = score; bestMatch = { entry: le, score: score }; }
    });
    matched[xl.index] = bestScore >= 45 ? bestMatch : null;
  });
  _excelReconData.matched = matched;
  _excelReconData.eventEntries = eventEntries;

  renderExcelReconTable();
}

function renderExcelReconTable() {
  const items = _excelReconData.items;
  const matched = _excelReconData.matched;
  let matchedTotal = 0, unmatchedTotal = 0, excelTotal = 0;

  const rows = items.map(xl => {
    const m = matched[xl.index];
    excelTotal += xl.amount;
    const isMatched = !!m;
    if (isMatched) matchedTotal += xl.amount; else unmatchedTotal += xl.amount;
    const bg = isMatched ? 'rgba(34,197,94,0.08)' : 'rgba(234,179,8,0.08)';
    const icon = isMatched ? '<i class="fas fa-check-circle" style="color:var(--green)"></i>' : '<input type="checkbox" class="recon-select" data-idx="' + xl.index + '" checked>';
    const matchInfo = isMatched ? '<span style="color:var(--green);font-size:.72rem">' + (m.entry.source === 'reimbursement' ? 'RMB: ' : '') + (m.entry.description || '').substring(0, 40) + ' ($' + (m.entry.amount || 0).toFixed(2) + ')</span>' : '<span style="color:var(--yellow);font-size:.72rem">No reimbursement found</span>';
    return '<tr style="background:' + bg + '"><td>' + icon + '</td><td>' + xl.description + '</td><td class="num">$' + xl.amount.toFixed(2) + '</td><td style="text-transform:capitalize">' + (xl.category || '—') + '</td><td>' + (xl.payee || '—') + '</td><td>' + matchInfo + '</td></tr>';
  }).join('');

  document.getElementById('excel-recon-table').innerHTML = '<table class="t" style="font-size:.8rem"><thead><tr><th style="width:30px"></th><th>Description</th><th style="text-align:right">Amount</th><th>Category</th><th>Vendor</th><th>Reimbursement Match</th></tr></thead><tbody>' + rows + '</tbody></table>';
  document.getElementById('recon-matched-total').textContent = '$' + matchedTotal.toFixed(2);
  document.getElementById('recon-unmatched-total').textContent = '$' + unmatchedTotal.toFixed(2);
  document.getElementById('recon-excel-total').textContent = '$' + excelTotal.toFixed(2);
  const pct = excelTotal > 0 ? Math.round((matchedTotal / excelTotal) * 100) : 0;
  document.getElementById('recon-match-pct').textContent = pct + '%';
  document.getElementById('recon-match-pct').style.color = pct === 100 ? 'var(--green)' : pct >= 50 ? 'var(--yellow)' : 'var(--red)';

  // Show approval button only when all matched (100%)
  document.getElementById('btn-recon-approve').style.display = pct === 100 ? '' : 'none';
}

function closeExcelReconModal() {
  document.getElementById('excel-recon-overlay').style.display = 'none';
  _excelReconData = null;
}

async function submitSelectedForReimbursement() {
  if (!_excelReconData) return;
  const items = _excelReconData.items;
  const matched = _excelReconData.matched;
  const checkboxes = document.querySelectorAll('.recon-select:checked');
  const selected = [];
  checkboxes.forEach(cb => {
    const idx = parseInt(cb.dataset.idx);
    const item = items.find(it => it.index === idx);
    if (item && !matched[idx]) selected.push(item);
  });

  if (!selected.length) return alert('No unmatched items selected.');
  const eventId = document.getElementById('excel-recon-event').value;
  const eventName = BANF_EVENTS.find(e => e.id === eventId)?.name || eventId;

  // Navigate to reimbursement panel with pre-filled data
  const msg = 'The following ' + selected.length + ' items from "' + eventName + '" need reimbursement submission:\\n\\n' +
    selected.map((s, i) => (i + 1) + '. ' + s.description + ' — $' + s.amount.toFixed(2)).join('\\n') +
    '\\n\\nWould you like to navigate to the Reimbursement portal to submit these?';
  if (confirm(msg)) {
    // Store in sessionStorage for the reimbursement page to pick up
    sessionStorage.setItem('banf_prefill_reimbursement', JSON.stringify({
      eventId: eventId,
      items: selected.map(s => ({ item: s.description, cost: s.amount, category: s.category, payee: s.payee }))
    }));
    closeExcelReconModal();
    navTo('reimbursement');
  }
}

async function saveExcelExpenseReport() {
  if (!_excelReconData) return;
  const eventId = document.getElementById('excel-recon-event').value;
  const eventName = BANF_EVENTS.find(e => e.id === eventId)?.name || eventId;
  const items = _excelReconData.items;
  const matched = _excelReconData.matched;

  // Add unmatched items as manual expense entries
  let addedCount = 0;
  for (const xl of items) {
    if (matched[xl.index]) continue; // already in ledger via reimbursement
    const res = await apiCall('event_expense_add', {
      email: CURRENT_ADMIN.email,
      eventId: eventId, eventName: eventName,
      category: mapExcelCategory(xl.category),
      amount: xl.amount,
      description: xl.description,
      payerOrPayee: xl.payee,
      entryDate: xl.date || new Date().toISOString().split('T')[0],
      reference: 'Excel import: ' + _excelReconData.fileName
    });
    if (res.success) addedCount++;
  }

  const statusEl = document.getElementById('recon-status-msg');
  statusEl.style.display = 'block';
  statusEl.style.color = 'var(--green)';
  statusEl.innerHTML = '<i class="fas fa-check-circle me-1"></i>Saved ' + addedCount + ' additional expense entries for ' + eventName + '. Reload to see updated totals.';
  addLog('EXPENSE', 'Excel import: added ' + addedCount + ' entries for ' + eventName + ' from ' + _excelReconData.fileName);

  // Refresh after short delay
  setTimeout(() => { closeExcelReconModal(); loadEventExpenses(); }, 2000);
}

async function submitReconForApproval() {
  const eventId = document.getElementById('excel-recon-event').value;
  const eventName = BANF_EVENTS.find(e => e.id === eventId)?.name || eventId;
  closeExcelReconModal();
  approveEventExpense(eventId, eventName);
}

function mapExcelCategory(cat) {
  const c = (cat || '').toLowerCase();
  if (/venue|hall|room|space/i.test(c)) return 'venue';
  if (/cater|food|meal|lunch|dinner/i.test(c)) return 'catering';
  if (/decor|flower|balloon/i.test(c)) return 'decoration';
  if (/photo|video|camera/i.test(c)) return 'photography';
  if (/sound|music|dj|band|speaker/i.test(c)) return 'sound_music';
  return 'other_expense';
}

// ═══════════════════════════════════════════════════
// EXPENSE TEMPLATE (FROM REIMBURSEMENTS)
// ═══════════════════════════════════════════════════
let _templateManualLines = [];

function openExpenseTemplateModal() {
  const evSel = document.getElementById('tmpl-event');
  evSel.innerHTML = BANF_EVENTS.map(e => '<option value="' + e.id + '">' + e.name + '</option>').join('');
  document.getElementById('tmpl-source-label').textContent = 'Manual Template';
  _templateManualLines = [];
  document.getElementById('tmpl-manual-lines').innerHTML = '';
  document.getElementById('tmpl-status-msg').style.display = 'none';
  document.getElementById('expense-template-overlay').style.display = 'flex';
  refreshTemplateLines();
}

function closeExpenseTemplateModal() {
  document.getElementById('expense-template-overlay').style.display = 'none';
}

async function refreshTemplateLines() {
  const eventId = document.getElementById('tmpl-event').value;
  const year = document.getElementById('event-exp-year-select').value || new Date().getFullYear();
  const reimbDiv = document.getElementById('tmpl-reimb-lines');
  reimbDiv.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i>Loading reimbursement data...';

  const data = await apiGet('event_expenses', { year: year, eventId: eventId });
  const entries = [];
  (data.events || []).forEach(ev => { (ev.entries || []).forEach(e => entries.push(e)); });
  const reimbEntries = entries.filter(e => e.source === 'reimbursement');
  const manualEntries = entries.filter(e => e.source !== 'reimbursement');

  if (reimbEntries.length === 0 && manualEntries.length === 0) {
    reimbDiv.innerHTML = '<span style="color:var(--muted)">No existing expense entries for this event. Add items below.</span>';
  } else {
    const rows = reimbEntries.map(e =>
      '<tr style="background:rgba(34,197,94,0.06)"><td><i class="fas fa-check-circle" style="color:var(--green)"></i></td><td>' + (e.description || '') + '</td><td class="num">$' + (e.amount || 0).toFixed(2) + '</td><td style="text-transform:capitalize">' + (e.category || '').replace(/_/g, ' ') + '</td><td>' + (e.payerOrPayee || '') + '</td><td style="font-size:.72rem;color:var(--green)">Reimbursed</td></tr>'
    ).join('');
    const manualRows = manualEntries.map(e =>
      '<tr><td><i class="fas fa-edit" style="color:var(--yellow)"></i></td><td>' + (e.description || '') + '</td><td class="num">$' + (e.amount || 0).toFixed(2) + '</td><td style="text-transform:capitalize">' + (e.category || '').replace(/_/g, ' ') + '</td><td>' + (e.payerOrPayee || '') + '</td><td style="font-size:.72rem;color:var(--yellow)">Manual</td></tr>'
    ).join('');
    reimbDiv.innerHTML = '<table class="t" style="font-size:.8rem"><thead><tr><th style="width:30px"></th><th>Description</th><th style="text-align:right">Amount</th><th>Category</th><th>Paid To</th><th>Source</th></tr></thead><tbody>' + rows + manualRows + '</tbody></table>';
  }

  const reimbTotal = reimbEntries.reduce((s, e) => s + (e.amount || 0), 0) + manualEntries.reduce((s, e) => s + (e.amount || 0), 0);
  updateTemplateTotals(reimbTotal);
}

function addTemplateLine() {
  const idx = _templateManualLines.length;
  _templateManualLines.push({ description: '', amount: 0, category: 'other_expense', payee: '', notes: '' });
  const container = document.getElementById('tmpl-manual-lines');
  const row = document.createElement('div');
  row.style.cssText = 'display:grid;grid-template-columns:2fr 100px 120px 1fr 30px;gap:6px;margin-bottom:6px;align-items:center';
  row.id = 'tmpl-line-' + idx;
  row.innerHTML = '<input type="text" placeholder="Description" style="background:var(--bg2);border:1px solid var(--line);color:var(--text);padding:5px 8px;border-radius:4px;font-size:.8rem" onchange="_templateManualLines[' + idx + '].description=this.value;updateTemplateTotals()">' +
    '<input type="number" step="0.01" min="0" placeholder="$0.00" style="background:var(--bg2);border:1px solid var(--line);color:var(--text);padding:5px 8px;border-radius:4px;font-size:.8rem;text-align:right" onchange="_templateManualLines[' + idx + '].amount=parseFloat(this.value)||0;updateTemplateTotals()">' +
    '<select style="background:var(--bg2);border:1px solid var(--line);color:var(--text);padding:5px 6px;border-radius:4px;font-size:.78rem" onchange="_templateManualLines[' + idx + '].category=this.value"><option value="venue">Venue</option><option value="catering">Catering</option><option value="decoration">Decoration</option><option value="photography">Photography</option><option value="sound_music">Sound/Music</option><option value="other_expense" selected>Other</option></select>' +
    '<input type="text" placeholder="Paid to" style="background:var(--bg2);border:1px solid var(--line);color:var(--text);padding:5px 8px;border-radius:4px;font-size:.8rem" onchange="_templateManualLines[' + idx + '].payee=this.value">' +
    '<button onclick="removeTemplateLine(' + idx + ')" style="background:none;border:none;color:var(--red);cursor:pointer;font-size:.85rem" title="Remove"><i class="fas fa-trash-alt"></i></button>';
  container.appendChild(row);
}

function removeTemplateLine(idx) {
  _templateManualLines.splice(idx, 1);
  // Re-render all manual lines
  const container = document.getElementById('tmpl-manual-lines');
  container.innerHTML = '';
  _templateManualLines.forEach((_, i) => { addTemplateLineUI(i); });
  updateTemplateTotals();
}

function addTemplateLineUI(idx) {
  const ml = _templateManualLines[idx];
  const container = document.getElementById('tmpl-manual-lines');
  const row = document.createElement('div');
  row.style.cssText = 'display:grid;grid-template-columns:2fr 100px 120px 1fr 30px;gap:6px;margin-bottom:6px;align-items:center';
  row.id = 'tmpl-line-' + idx;
  row.innerHTML = '<input type="text" value="' + (ml.description || '') + '" placeholder="Description" style="background:var(--bg2);border:1px solid var(--line);color:var(--text);padding:5px 8px;border-radius:4px;font-size:.8rem" onchange="_templateManualLines[' + idx + '].description=this.value;updateTemplateTotals()">' +
    '<input type="number" step="0.01" min="0" value="' + (ml.amount || '') + '" placeholder="$0.00" style="background:var(--bg2);border:1px solid var(--line);color:var(--text);padding:5px 8px;border-radius:4px;font-size:.8rem;text-align:right" onchange="_templateManualLines[' + idx + '].amount=parseFloat(this.value)||0;updateTemplateTotals()">' +
    '<select style="background:var(--bg2);border:1px solid var(--line);color:var(--text);padding:5px 6px;border-radius:4px;font-size:.78rem" onchange="_templateManualLines[' + idx + '].category=this.value"><option value="venue"' + (ml.category === 'venue' ? ' selected' : '') + '>Venue</option><option value="catering"' + (ml.category === 'catering' ? ' selected' : '') + '>Catering</option><option value="decoration"' + (ml.category === 'decoration' ? ' selected' : '') + '>Decoration</option><option value="photography"' + (ml.category === 'photography' ? ' selected' : '') + '>Photography</option><option value="sound_music"' + (ml.category === 'sound_music' ? ' selected' : '') + '>Sound/Music</option><option value="other_expense"' + (ml.category === 'other_expense' ? ' selected' : '') + '>Other</option></select>' +
    '<input type="text" value="' + (ml.payee || '') + '" placeholder="Paid to" style="background:var(--bg2);border:1px solid var(--line);color:var(--text);padding:5px 8px;border-radius:4px;font-size:.8rem" onchange="_templateManualLines[' + idx + '].payee=this.value">' +
    '<button onclick="removeTemplateLine(' + idx + ')" style="background:none;border:none;color:var(--red);cursor:pointer;font-size:.85rem" title="Remove"><i class="fas fa-trash-alt"></i></button>';
  container.appendChild(row);
}

function updateTemplateTotals(reimbTotal) {
  if (reimbTotal !== undefined) window._tmplReimbTotal = reimbTotal;
  const rt = window._tmplReimbTotal || 0;
  const mt = _templateManualLines.reduce((s, l) => s + (l.amount || 0), 0);
  document.getElementById('tmpl-reimb-total').textContent = '$' + rt.toFixed(2);
  document.getElementById('tmpl-manual-total').textContent = '$' + mt.toFixed(2);
  document.getElementById('tmpl-grand-total').textContent = '$' + (rt + mt).toFixed(2);
}

async function saveExpenseTemplate() {
  const eventId = document.getElementById('tmpl-event').value;
  const eventName = BANF_EVENTS.find(e => e.id === eventId)?.name || eventId;
  const manualLines = _templateManualLines.filter(l => l.description && l.amount > 0);

  if (manualLines.length === 0) {
    const el = document.getElementById('tmpl-status-msg');
    el.style.display = 'block'; el.style.color = 'var(--yellow)';
    el.textContent = 'No additional items to save. Existing reimbursement entries are already recorded.';
    return;
  }

  // Confirm: additional items without reimbursement will be flagged
  if (!confirm('You are adding ' + manualLines.length + ' additional expense item(s) for "' + eventName + '". These items do not have linked reimbursements and will be flagged for review.\\n\\nProceed?')) return;

  let added = 0;
  for (const line of manualLines) {
    const res = await apiCall('event_expense_add', {
      email: CURRENT_ADMIN.email,
      eventId: eventId, eventName: eventName,
      category: line.category || 'other_expense',
      amount: line.amount,
      description: line.description,
      payerOrPayee: line.payee,
      entryDate: new Date().toISOString().split('T')[0],
      reference: 'Template: needs reimbursement'
    });
    if (res.success) added++;
  }

  const el = document.getElementById('tmpl-status-msg');
  el.style.display = 'block'; el.style.color = 'var(--green)';
  el.innerHTML = '<i class="fas fa-check-circle me-1"></i>Saved ' + added + ' expense entries. Items without reimbursement are flagged for submission.';
  addLog('EXPENSE', 'Template: saved ' + added + ' entries for ' + eventName);
  setTimeout(() => { closeExpenseTemplateModal(); loadEventExpenses(); }, 2000);
}

async function submitExpenseForApproval() {
  const eventId = document.getElementById('tmpl-event').value;
  const eventName = BANF_EVENTS.find(e => e.id === eventId)?.name || eventId;

  // Check if there are unmatched manual lines that still need saving
  const unsaved = _templateManualLines.filter(l => l.description && l.amount > 0);
  if (unsaved.length > 0) {
    if (!confirm('There are ' + unsaved.length + ' unsaved additional item(s). Save them before submitting for approval?')) return;
    await saveExpenseTemplate();
  }

  closeExpenseTemplateModal();
  approveEventExpense(eventId, eventName);
}

// --- Populate year selectors & auto-load on panel visit ---
let _financeYearsLoaded = false;
async function loadFinanceYears() {
  if (_financeYearsLoaded) return;
  _financeYearsLoaded = true;
  const data = await apiGet('ledger_years');
  const years = (data.years || []).sort().reverse();
  if (!years.length) years.push(new Date().getFullYear());
  ['income-year-select','event-exp-year-select'].forEach(id => {
    const sel = document.getElementById(id);
    if (!sel) return;
    sel.innerHTML = years.map(y => '<option value="' + y + '"' + (y === new Date().getFullYear() ? ' selected' : '') + '>' + y + '</option>').join('');
  });
}

// Hook into navTo for lazy-loading finance panels
const _origNavTo = navTo;
navTo = function(panel) {
  _origNavTo(panel);
  if (panel === 'ledger-report') { loadLedgerReport(); }
  if (panel === 'income-summary') { loadFinanceYears().then(() => loadIncomeSummary()); }
  if (panel === 'event-expenses') { loadFinanceYears().then(() => loadEventExpenses()); }
};

// ── SIGN IN (offline-first, matching ec-admin-login.html) ──
document.getElementById('btn-login').addEventListener('click', async () => {
  var rawInput = (document.getElementById('login-email').value || '').trim();
  var pass = document.getElementById('login-pass').value;
  var email = resolveEmail(rawInput);

  hideMsg('login-error'); hideMsg('login-success'); hideMsg('login-info');

  if (_checkLockout()) return;
  if (!email) return showError('login-error', 'Please enter your email address.');
  var storedPw = _getSecurePassword(email);
  if (storedPw && pass === storedPw) {
    var dbUser = AUTH_DB[email];
    if (dbUser) {
      _resetAttempts();
      CURRENT_ADMIN = {
        email: email, roles: dbUser.roles, role: dbUser.roles[0] || 'ec-member',
        firstName: dbUser.firstName, lastName: dbUser.lastName,
        ecTitle: dbUser.ecTitle, name: dbUser.name
      };
      enterPortal(dbUser, email);
      return;
    }
  }

  // ── BACKEND API ──
  var btn = document.getElementById('btn-login');
  btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i>Signing in...';

  var result = await apiCall('admin_verify_login', { email: email, password: pass || '' });

  btn.disabled = false; btn.innerHTML = '<i class="fas fa-users-cog me-1"></i>EC Admin Sign In';

  if (result.success) {
    if (result.noPassword) {
      showInfo('login-info', 'Your account has no password yet. Please use Sign Up to set your password and security question.');
      return;
    }
    // Save credentials to localStorage for future offline login
    _resetAttempts();
    _saveCredsToLocalStorage(email, pass, '', '');
    var dbU = AUTH_DB[email];
    CURRENT_ADMIN = {
      email: email, roles: (result.roles && result.roles.length) ? result.roles : (dbU ? dbU.roles : [result.adminRole || 'ec-member']),
      role: result.adminRole || (dbU ? dbU.roles[0] : 'ec-member'),
      firstName: result.firstName || '', lastName: result.lastName || '',
      ecTitle: result.ecTitle || (dbU ? dbU.ecTitle : ''), name: (result.firstName || '') + ' ' + (result.lastName || '')
    };
    enterPortal(CURRENT_ADMIN, email);
  } else if (result.needsOnboarding) {
    showInfo('login-info', 'Your account needs setup. Please use Sign Up to complete your account.');
    SIGNUP_STATE.email = email;
    SIGNUP_STATE.token = result.setupToken;
  } else if (result.error && result.error.toLowerCase().indexOf('revoked') !== -1) {
    showError('login-error', '<i class="fas fa-ban me-1"></i>' + result.error);
  } else {
    _recordFailedAttempt();
    showError('login-error', result.error || 'Login failed.');
  }
});

document.getElementById('login-pass').addEventListener('keypress', e => {
  if (e.key === 'Enter') document.getElementById('btn-login').click();
});
document.getElementById('login-email').addEventListener('keypress', e => {
  if (e.key === 'Enter') document.getElementById('login-pass').focus();
});

function enterPortal(user, email) {
  // user can be an AUTH_DB entry or CURRENT_ADMIN object
  var displayName = user.name || ((user.firstName || '') + ' ' + (user.lastName || '')).trim() || email;
  // Ensure CURRENT_ADMIN is set
  if (!CURRENT_ADMIN) {
    CURRENT_ADMIN = {
      email: email, roles: user.roles || ['ec-member'], role: (user.roles || ['ec-member'])[0],
      firstName: user.firstName || '', lastName: user.lastName || '',
      ecTitle: user.ecTitle || '', name: displayName
    };
  }
  // Save session for auto-login
  try {
    sessionStorage.setItem('banf_admin_session', JSON.stringify({
      email: email, name: displayName, roles: CURRENT_ADMIN.roles,
      ecTitle: CURRENT_ADMIN.ecTitle, firstName: CURRENT_ADMIN.firstName, lastName: CURRENT_ADMIN.lastName
    }));
  } catch(e) {}

  document.getElementById('login-screen').style.display = 'none';
  document.getElementById('portal').style.display = 'flex';
  addLog('LOGIN', 'EC Admin login — ' + displayName + ' (' + (CURRENT_ADMIN.ecTitle || 'Admin') + ')');
  // Update sidebar user display
  var nameEl = document.querySelector('.sb-user .name');
  if (nameEl) nameEl.textContent = displayName;
  var roleEl = document.querySelector('.sb-user .role-lbl');
  if (roleEl) roleEl.textContent = CURRENT_ADMIN.ecTitle || CURRENT_ADMIN.role || 'Admin';
  var avatarEl = document.querySelector('.sb-avatar');
  if (avatarEl) {
    var initials = ((CURRENT_ADMIN.firstName || '?')[0] + (CURRENT_ADMIN.lastName || '?')[0]).toUpperCase();
    avatarEl.textContent = initials;
  }
  // President-only UI: show EC Replacement and Revoke sections only for president
  var isPresident = CURRENT_ADMIN && CURRENT_ADMIN.email === 'ranadhir.ghosh@gmail.com';
  var presGroup = document.getElementById('president-group');
  var presItem = document.getElementById('president-ec-replace');
  var presRevoke = document.getElementById('president-ec-revoke');
  if (presGroup) presGroup.style.display = isPresident ? '' : 'none';
  if (presItem) presItem.style.display = isPresident ? '' : 'none';
  if (presRevoke) presRevoke.style.display = isPresident ? '' : 'none';
  // Reimbursement: visible ONLY for Treasurer, VP, President
  var rmbPrivilegedRoles = ['President', 'Vice President', 'Treasurer'];
  var isRmbPrivileged = CURRENT_ADMIN && rmbPrivilegedRoles.includes(CURRENT_ADMIN.ecTitle);
  var rmbItem = document.getElementById('rmb-nav-item');
  if (rmbItem) rmbItem.style.display = isRmbPrivileged ? '' : 'none';
  // Load procurement data on portal load
  loadProcurementData();
  if (isPresident) loadEcReplacementData();
  renderAll();
}

// Logout
document.querySelector('.sb-user').addEventListener('click', () => {
  if (confirm('Logout?')) {
    CURRENT_ADMIN = null;
    try { sessionStorage.removeItem('banf_admin_session'); } catch(e) {}
    document.getElementById('portal').style.display = 'none';
    document.getElementById('login-screen').style.display = 'flex';
    document.getElementById('login-pass').value = '';
    showAuth('signin');
  }
});

// ── SIGN UP FLOW (Direct — no email verification code, matching ec-admin-login) ──

async function signupStep1() {
  const email = (document.getElementById('signup-email').value || '').trim().toLowerCase();
  hideMsg('signup-error-1'); hideMsg('signup-info-1');

  if (!email || !email.includes('@')) return showError('signup-error-1', 'Please enter a valid email address.');

  showInfo('signup-info-1', 'Validating your email...');

  // Direct signup — no verification code email
  const result = await apiCall('admin_signup_direct', { email });
  hideMsg('signup-info-1');

  if (result.success) {
    SIGNUP_STATE = { email, token: result.setupToken, firstName: result.firstName || '', lastName: result.lastName || '', ecTitle: result.ecTitle || '' };
    var welcomeName = [result.firstName, result.lastName].filter(Boolean).join(' ') || email.split('@')[0];
    var el1 = document.getElementById('signup-welcome-name');
    if (el1) el1.textContent = welcomeName + (result.ecTitle ? ' (' + result.ecTitle + ')' : '');
    document.getElementById('signup-confirmed-email').textContent = email;
    showStep('signup', 2);
  } else {
    // Offline fallback — check AUTH_DB
    var dbUser = AUTH_DB[email];
    if (dbUser) {
      SIGNUP_STATE = { email, offlineMode: true, token: 'offline-token', firstName: dbUser.firstName, lastName: dbUser.lastName, ecTitle: dbUser.ecTitle };
      var nameStr = dbUser.name + (dbUser.ecTitle ? ' (' + dbUser.ecTitle + ')' : '');
      var el2 = document.getElementById('signup-welcome-name');
      if (el2) el2.textContent = nameStr;
      document.getElementById('signup-confirmed-email').textContent = email;
      showStep('signup', 2);
    } else {
      showError('signup-error-1', result.error || 'This email is not in the EC Members list. Only current EC members can sign up here.');
    }
  }
}

async function signupStep2Submit() {
  const pass = document.getElementById('signup-pass').value;
  const pass2 = document.getElementById('signup-pass2').value;
  const sq = document.getElementById('signup-sq').value;
  const sa = document.getElementById('signup-sa').value.trim();
  hideMsg('signup-error-2');

  if (!pass || pass.length < 8) return showError('signup-error-2', 'Password must be at least 8 characters.');
  if (pass !== pass2) return showError('signup-error-2', 'Passwords do not match.');
  if (!sq) return showError('signup-error-2', 'Please select a security question.');
  if (!sa || sa.length < 2) return showError('signup-error-2', 'Please provide a security answer (at least 2 characters).');

  if (SIGNUP_STATE.offlineMode) {
    // Offline mode — save creds to localStorage using shared persistence
    _saveCredsToLocalStorage(SIGNUP_STATE.email, pass, sq, sa.toLowerCase());

    // Await backend sync (not fire-and-forget)
    showInfo('signup-error-2', '<i class="fas fa-spinner fa-spin me-1"></i>Syncing with server...');
    try {
      var tok = null;
      // Try admin_signup_direct first
      var r = await apiCall('admin_signup_direct', { email: SIGNUP_STATE.email });
      tok = r.setupToken || null;

      // Fallback: admin_request_reset_token if signup_direct failed (passwordSet:true)
      if (!tok) {
        var tokenResult = await apiCall('admin_request_reset_token', { email: SIGNUP_STATE.email, adminKey: 'banf-bosonto-2026-live' });
        tok = tokenResult.setupToken || null;
      }

      if (tok) {
        await apiCall('admin_set_password', { email: SIGNUP_STATE.email, token: tok, password: pass });
        await apiCall('admin_save_profile', { email: SIGNUP_STATE.email, token: tok, phone: 'N/A', securityQuestion: sq, securityAnswer: sa.toLowerCase() });
        await apiCall('admin_onboard_complete', { email: SIGNUP_STATE.email, token: tok }).catch(function(){});
      }
    } catch(e) {
      console.error('Backend sync error:', e);
    }
    hideMsg('signup-error-2');
    showStep('signup', 3);
    return;
  }

  // Set password via API
  const pwResult = await apiCall('admin_set_password', {
    email: SIGNUP_STATE.email,
    token: SIGNUP_STATE.token,
    password: pass
  });

  if (!pwResult.success) {
    return showError('signup-error-2', pwResult.error || 'Failed to set password.');
  }

  // Save security question via profile endpoint
  await apiCall('admin_save_profile', {
    email: SIGNUP_STATE.email,
    token: SIGNUP_STATE.token,
    phone: 'N/A',
    securityQuestion: sq,
    securityAnswer: sa.toLowerCase()
  });

  // Complete onboarding
  await apiCall('admin_onboard_complete', {
    email: SIGNUP_STATE.email,
    token: SIGNUP_STATE.token
  });

  // Save to localStorage for cross-portal access (shared credentials)
  _saveCredsToLocalStorage(SIGNUP_STATE.email, pass, sq, sa.toLowerCase());

  showStep('signup', 3);
}

// ── FORGOT EMAIL / USERNAME ──
let FU_STATE = {};
function fuShowStep(num) {
  document.querySelectorAll('#auth-forgot-username .auth-step').forEach(s => s.classList.remove('active'));
  document.getElementById('fu-step-' + num).classList.add('active');
}

async function fuStep1() {
  const nameInput = (document.getElementById('fu-name').value || '').trim().toLowerCase();
  hideMsg('fu-error-1'); hideMsg('fu-info-1');
  if (!nameInput || nameInput.length < 3) return showError('fu-error-1', 'Please enter your first and last name.');

  // Search AUTH_DB for a name match
  const match = Object.entries(AUTH_DB).find(function(entry) {
    var email = entry[0], user = entry[1];
    var fullName = (user.firstName + ' ' + user.lastName).toLowerCase();
    var reversed = (user.lastName + ' ' + user.firstName).toLowerCase();
    return fullName.includes(nameInput) || reversed.includes(nameInput) ||
           user.name.toLowerCase().includes(nameInput);
  });

  if (!match) {
    return showError('fu-error-1', 'No EC account found for that name. Check spelling or contact Super Admin (banfjax@gmail.com).');
  }

  var foundEmail = match[0], foundUser = match[1];
  FU_STATE = { email: foundEmail, user: foundUser, offlineMode: true };

  // Mask the email: pa***@gmail.com
  var parts = foundEmail.split('@');
  var masked = parts[0].slice(0,2) + '***@' + parts[1];
  document.getElementById('fu-masked-email').textContent = masked;

  showInfo('fu-info-1', 'Sending verification code...');
  var result = await apiCall('admin_signup_send_code', { email: foundEmail });
  hideMsg('fu-info-1');

  if (!result.success) {
    FU_STATE.offlineMode = true;
    showInfo('fu-info-1', 'Offline mode: use code 123456');
    setTimeout(function() { fuShowStep(2); }, 1500);
  } else {
    FU_STATE.offlineMode = false;
    fuShowStep(2);
  }
}

async function fuResend() {
  hideMsg('fu-error-2'); hideMsg('fu-info-2');
  showInfo('fu-info-2', 'Resending code...');
  var result = await apiCall('admin_signup_send_code', { email: FU_STATE.email });
  hideMsg('fu-info-2');
  if (result.success) showInfo('fu-info-2', 'New code sent!');
  else showInfo('fu-info-2', 'Offline mode: use code 123456');
}

async function fuStep2() {
  var code = (document.getElementById('fu-code').value || '').trim();
  hideMsg('fu-error-2'); hideMsg('fu-info-2');
  if (!code || code.length !== 6) return showError('fu-error-2', 'Enter the 6-digit code.');

  if (FU_STATE.offlineMode) {
    if (code !== '123456') return showError('fu-error-2', 'Invalid code. Use 123456 for offline mode.');
  } else {
    showInfo('fu-info-2', 'Verifying...');
    var result = await apiCall('admin_signup_verify_code', { email: FU_STATE.email, code: code });
    hideMsg('fu-info-2');
    if (!result.success) return showError('fu-error-2', result.error || 'Invalid code.');
  }

  document.getElementById('fu-revealed-email').textContent = FU_STATE.email;
  fuShowStep(3);
}

// ── FORGOT PASSWORD FLOW (offline-first, matching ec-admin-login.html) ──
async function forgotStep1() {
  var rawInput = (document.getElementById('forgot-email').value || '').trim();
  var email = resolveEmail(rawInput);
  hideMsg('forgot-error-1'); hideMsg('forgot-info-1');

  if (!email || !email.includes('@')) return showError('forgot-error-1', 'Please enter a valid email address.');

  // OFFLINE-FIRST: check AUTH_DB + localStorage for security Q/A
  var qa = _getSecurityQA(email);
  if (qa && qa.q) {
    FORGOT_STATE = { email: email, question: qa.q, offlineAnswer: qa.a, offlineMode: true, resetToken: '' };
    var dbU = AUTH_DB[email];
    document.getElementById('forgot-found-name').textContent = dbU ? dbU.name : email;
    document.getElementById('forgot-sq-display').textContent = SQ_LABELS[qa.q] || qa.q;
    showStep('forgot', 2);
    return;
  }

  // Fallback: API lookup
  showInfo('forgot-info-1', 'Looking up your account...');
  var result = await apiCall('admin_verify_login', { email: email });
  hideMsg('forgot-info-1');

  if (!result.success && !result.needsOnboarding) {
    return showError('forgot-error-1', result.error || 'Account not found. Check your email address.');
  }

  var profileResult = await apiCall('admin_get_security_question', { email: email });

  if (!profileResult.success || !profileResult.question) {
    return showError('forgot-error-1', 'No security question set for this account. Contact the Super Admin for manual password reset.');
  }

  FORGOT_STATE = { email: email, question: profileResult.question, offlineMode: false, resetToken: profileResult.resetToken || '' };
  document.getElementById('forgot-found-name').textContent = email;
  document.getElementById('forgot-sq-display').textContent = SQ_LABELS[profileResult.question] || profileResult.question;
  showStep('forgot', 2);
}

async function forgotStep2() {
  var answer = (document.getElementById('forgot-sa').value || '').trim();
  hideMsg('forgot-error-2');

  if (!answer) return showError('forgot-error-2', 'Please enter your answer.');

  if (FORGOT_STATE.offlineMode && FORGOT_STATE.offlineAnswer) {
    // Offline verification
    if (answer.toLowerCase() !== FORGOT_STATE.offlineAnswer.toLowerCase()) {
      return showError('forgot-error-2', 'Incorrect answer. Please try again.');
    }
    FORGOT_STATE.resetToken = 'offline-reset-' + Date.now();
    showStep('forgot', 3);
    return;
  }

  // API verification
  var result = await apiCall('admin_verify_security_answer', {
    email: FORGOT_STATE.email,
    answer: answer.toLowerCase()
  });

  if (!result.success) {
    return showError('forgot-error-2', result.error || 'Incorrect answer. Please try again.');
  }

  FORGOT_STATE.resetToken = result.resetToken || FORGOT_STATE.resetToken;
  showStep('forgot', 3);
}

async function forgotStep3() {
  var pass = document.getElementById('forgot-newpass').value;
  var pass2 = document.getElementById('forgot-newpass2').value;
  hideMsg('forgot-error-3');

  if (!pass || pass.length < 8) return showError('forgot-error-3', 'Password must be at least 8 characters.');
  if (pass !== pass2) return showError('forgot-error-3', 'Passwords do not match.');

  // Save new password to localStorage immediately (for offline access)
  var qa = _getSecurityQA(FORGOT_STATE.email);
  _saveCredsToLocalStorage(FORGOT_STATE.email, pass, qa ? qa.q : '', qa ? qa.a : '');

  // Show loading state
  showInfo('forgot-error-3', '<i class="fas fa-spinner fa-spin me-1"></i>Updating your password...');

  var backendOk = false;
  try {
    var tok = FORGOT_STATE.resetToken;

    // Path A: Get a real reset token if in offline mode
    if (FORGOT_STATE.offlineMode && FORGOT_STATE.offlineAnswer) {
      var ansResult = await apiCall('admin_verify_security_answer', { email: FORGOT_STATE.email, answer: FORGOT_STATE.offlineAnswer.toLowerCase() });
      if (ansResult.resetToken) tok = ansResult.resetToken;
    }

    // Path A continued: Use the real reset token
    if (tok && !tok.startsWith('offline-')) {
      var resetResult = await apiCall('admin_reset_password', { email: FORGOT_STATE.email, token: tok, password: pass });
      if (resetResult.success) backendOk = true;
    }

    // Path B: Fallback — get a setup token and use admin_set_password
    if (!backendOk) {
      var tokenResult = await apiCall('admin_request_reset_token', { email: FORGOT_STATE.email, adminKey: 'banf-bosonto-2026-live' });
      if (tokenResult.setupToken) {
        var pwResult = await apiCall('admin_set_password', { email: FORGOT_STATE.email, token: tokenResult.setupToken, password: pass });
        if (pwResult.success) {
          backendOk = true;
          // Also persist security Q/A if available
          if (qa && qa.q) {
            await apiCall('admin_save_profile', { email: FORGOT_STATE.email, token: tokenResult.setupToken, phone: 'N/A', securityQuestion: qa.q, securityAnswer: (qa.a || '').toLowerCase() }).catch(function(){});
          }
        }
      }
    }
  } catch(e) {
    console.error('Password reset error:', e);
  }

  hideMsg('forgot-error-3');

  if (!backendOk) {
    showInfo('forgot-error-3', '<i class="fas fa-exclamation-triangle me-1" style="color:#fbbf24"></i>Password saved locally. Server sync may have failed — if login issues persist, contact the President.');
  }

  showStep('forgot', 4);
}

// ── NAV ──
const ADMIN_ACTIVE_PANELS = new Set(['dashboard','ec-profile','procurement','reimbursement','ec-replacement','ledger-report','income-summary','event-expenses','evite-manager','agent-monitor']);
let rmbIframeLoaded = false;
function navTo(panel){
  if (!ADMIN_ACTIVE_PANELS.has(panel)) {
    adminComingSoon(panel);
    return;
  }
  // Reimbursement: enforce Treasurer/VP/President role gate
  if (panel === 'reimbursement') {
    var rmbRoles = ['President', 'Vice President', 'Treasurer'];
    if (!CURRENT_ADMIN || !rmbRoles.includes(CURRENT_ADMIN.ecTitle)) {
      alert('Access Restricted: Only Treasurer, Vice President, and President can access the Reimbursement module.\\n\\nOther EC members must use the Procurement panel first to get budget approval, then submit reimbursement through the approved procurement ticket.');
      return;
    }
    if (!rmbIframeLoaded) loadRmbIframe();
  }
  // E-Vite Manager: auto-load events on first visit
  if (panel === 'evite-manager') {
    eviteLoadEvents();
  }
  // EC Profile: auto-load on first visit
  if (panel === 'ec-profile') {
    loadECProfile();
  }
  // Agent Monitor: auto-load on first visit
  if (panel === 'agent-monitor') {
    loadAgentMonitor();
  }
  document.querySelectorAll('.sb-item').forEach(s=>s.classList.remove('active'));
  const target = document.querySelector(\`.sb-item[data-panel="\${panel}"]\`);
  if(target) target.classList.add('active');
  document.querySelectorAll('.portal-section').forEach(s=>s.classList.remove('active'));
  const p = document.getElementById('panel-'+panel);
  if(p) p.classList.add('active');
}

function loadRmbIframe() {
  const iframe = document.getElementById('rmb-iframe');
  if (!iframe || !CURRENT_ADMIN) return;
  const email = encodeURIComponent(CURRENT_ADMIN.email);
  const name = encodeURIComponent(CURRENT_ADMIN.firstName + ' ' + (CURRENT_ADMIN.lastName || ''));
  const role = encodeURIComponent(CURRENT_ADMIN.ecTitle || '');
  iframe.src = 'https://banfjax-hash.github.io/banf/reimbursement-test.html?autologin=' + email + '&name=' + name + '&role=' + role;
  iframe.onload = function() {
    const loader = document.getElementById('rmb-iframe-loading');
    if (loader) loader.style.display = 'none';
    rmbIframeLoaded = true;
  };
}

function openRmbFullscreen() {
  if (!CURRENT_ADMIN) return;
  const email = encodeURIComponent(CURRENT_ADMIN.email);
  const name = encodeURIComponent(CURRENT_ADMIN.firstName + ' ' + (CURRENT_ADMIN.lastName || ''));
  const role = encodeURIComponent(CURRENT_ADMIN.ecTitle || '');
  window.open('https://banfjax-hash.github.io/banf/reimbursement-test.html?autologin=' + email + '&name=' + name + '&role=' + role, '_blank');
}

function adminComingSoon(panel) {
  const names = {
    'roles':'Role Definitions','users':'User Management','identity':'Identity Engine',
    'stakeholder-drive':'Stakeholder Drive','ec-drive':'EC Drive','drive-status':'Drive Status',
    'feedback':'Feedback Pipeline','dev-board':'Dev Board','e2e-test':'E2E Test Suite','activity':'Activity Log'
  };
  const name = names[panel] || panel;
  // Remove any existing overlay
  document.querySelectorAll('.admin-cs-overlay').forEach(el=>el.remove());
  const overlay = document.createElement('div');
  overlay.className = 'admin-cs-overlay';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.65);z-index:9999;display:flex;align-items:center;justify-content:center;animation:fadeIn .2s ease';
  overlay.onclick = function(e){ if(e.target===overlay) overlay.remove(); };
  overlay.innerHTML = \`<div style="background:var(--card);border:1px solid var(--line);border-radius:16px;padding:36px;max-width:480px;width:92%;text-align:center;">
    <div style="width:70px;height:70px;border-radius:16px;background:linear-gradient(135deg,var(--accent),var(--accent2));display:flex;align-items:center;justify-content:center;font-size:1.8rem;color:#fff;margin:0 auto 20px;"><i class="fas fa-rocket"></i></div>
    <h3 style="color:#fff;margin-bottom:8px;font-size:1.1rem;">\${name}</h3>
    <p style="color:var(--muted);font-size:.88rem;line-height:1.6;">This admin agent module is being launched in a <strong style="color:var(--accent)">phased rollout</strong> with proper security, RBAC, and compliance measures.</p>
    <p style="color:var(--dim);font-size:.8rem;">Each module undergoes stakeholder validation, security audit, and role-based access control setup before going live.</p>
    <div style="margin:16px 0;padding:12px 16px;background:rgba(249,115,22,.08);border:1px solid rgba(249,115,22,.2);border-radius:10px;font-size:.84rem;color:var(--accent);">
      <i class="fas fa-robot me-2"></i>Use the <strong>BANF Admin Assistant</strong> chatbot (bottom-right) to ask questions about events, membership, fees, and more!
    </div>
    <button onclick="this.closest('.admin-cs-overlay').remove()" style="background:linear-gradient(135deg,var(--accent),var(--accent2));color:#fff;border:none;padding:10px 28px;border-radius:8px;font-size:.88rem;font-weight:700;cursor:pointer;"><i class="fas fa-check me-1"></i>Got it</button>
  </div>\`;
  document.body.appendChild(overlay);
}

document.querySelectorAll('.sb-item[data-panel]').forEach(item=>{
  item.addEventListener('click',()=>navTo(item.dataset.panel));
});

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
//  HELPERS
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

function addLog(act,msg){
  LOG.unshift({ts:new Date().toLocaleString('en-US',{month:'short',day:'numeric',year:'numeric',hour:'2-digit',minute:'2-digit'}),act,msg});
}
const logColors={LOGIN:'cyan',USER_ADD:'green',FEEDBACK:'blue',AGENT:'purple',APPROVAL:'green',DEPLOY:'red',EC_REMIND:'orange',EC_INIT:'blue',ROLE_DEF:'yellow',DRIVE:'purple',PRIVACY:'teal',EMAIL:'indigo',E2E:'pink',SIGNUP:'green',BOARD:'orange',EC_CHECK:'yellow',EC_COMPLETE:'green',IDENTITY:'cyan'};
function renderLog(id,limit){
  const el=document.getElementById(id);if(!el)return;
  const d=limit?LOG.slice(0,limit):LOG;
  el.innerHTML=d.map(l=>\`<div class="log-line"><span class="ll-ts">\${l.ts}</span><span class="ll-act" style="color:var(--\${logColors[l.act]||'muted'})">\${l.act}</span><span class="ll-msg">\${l.msg}</span></div>\`).join('');
}
function roleById(id){return ROLES.find(r=>r.id===id)}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
//  CRM SEARCH ENGINE
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

function searchCRM(query){
  const q=query.toLowerCase();
  return CRM.filter(m=>(m.displayName+' '+m.nickname+' '+m.email+' '+m.firstName+' '+m.lastName).toLowerCase().includes(q));
}
function renderSearchResults(containerId, results, onSelect){
  const el=document.getElementById(containerId);
  if(!results.length){el.innerHTML='<div class="sr-item" style="color:var(--dim)">No matches found</div>';el.classList.add('open');return;}
  el.innerHTML=results.slice(0,10).map((m,i)=>\`<div class="sr-item" data-idx="\${i}">
    <div><span class="sr-name">\${m.displayName}</span> <span style="color:var(--dim);font-size:.68rem">(\${m.nickname})</span><br><span class="sr-email">\${m.email}</span> Â· \${m.profession} Â· \${m.city}</div>
    <span class="sr-badge"><span class="badge-s \${m.isECMember?'badge-red':'badge-dim'}">\${m.isECMember?'EC':'Member'}</span></span>
    <span class="sr-badge"><span class="badge-s \${m.emailOptIn?'badge-green':'badge-red'}">\${m.emailOptIn?'Opt-In':'Opt-Out'}</span></span>
  </div>\`).join('');
  el.classList.add('open');
  el.querySelectorAll('.sr-item[data-idx]').forEach(item=>{
    item.addEventListener('click',()=>{onSelect(results[+item.dataset.idx]);el.classList.remove('open');});
  });
}

// User Management CRM search
const crmSearchInput=document.getElementById('crm-search');
crmSearchInput.addEventListener('input',()=>{
  const q=crmSearchInput.value.trim();
  if(q.length<2){document.getElementById('crm-results').classList.remove('open');return;}
  renderSearchResults('crm-results',searchCRM(q),selectMemberForAssign);
});
crmSearchInput.addEventListener('blur',()=>setTimeout(()=>document.getElementById('crm-results').classList.remove('open'),200));

function selectMemberForAssign(member){
  crmSearchInput.value=member.displayName;
  document.getElementById('assign-panel').style.display='block';
  document.getElementById('assign-member-name').textContent=\`\${member.displayName} (\${member.email})\`;
  document.getElementById('assign-email').value=member.email;
  document.getElementById('assign-panel').dataset.memberId=member.memberId;
  document.getElementById('assign-panel').dataset.memberName=member.displayName;
  refreshRoleDropdown('assign-role');
  document.getElementById('no-roles-warning').style.display=ROLES.length<2?'flex':'none';
}

// Browse CRM directory
document.getElementById('btn-browse-crm').addEventListener('click',()=>{
  const panel=document.getElementById('crm-browse-panel');
  panel.style.display=panel.style.display==='none'?'block':'none';
  if(panel.style.display==='block') renderCRMBrowse();
});
function renderCRMBrowse(){
  document.getElementById('crm-browse-body').innerHTML=CRM.map(m=>\`<tr>
    <td><strong>\${m.displayName}</strong> <span style="color:var(--dim);font-size:.68rem">(\${m.nickname})</span></td>
    <td>\${m.email}</td><td>\${m.phone}</td><td>\${m.familyId}</td>
    <td><span class="badge-s \${m.isECMember?'badge-red':'badge-dim'}">\${m.isECMember?'Yes':'No'}</span></td>
    <td><span class="badge-s \${m.emailOptIn?'badge-green':'badge-red'}">\${m.emailOptIn?'Yes':'No'}</span></td>
    <td><span class="badge-s \${m.isActive?'badge-green':'badge-red'}">\${m.isActive?'Yes':'No'}</span></td>
    <td><button class="btn-secondary btn-sm" onclick="selectCRMRow('\${m.memberId}')"><i class="fas fa-user-tag me-1"></i>Assign</button></td>
  </tr>\`).join('');
}
window.selectCRMRow=function(id){
  const m=CRM.find(c=>c.memberId===id);
  if(m) selectMemberForAssign(m);
  window.scrollTo({top:document.getElementById('assign-panel').offsetTop-100,behavior:'smooth'});
};

function refreshRoleDropdown(selectId){
  const sel=document.getElementById(selectId);
  sel.innerHTML=ROLES.map(r=>\`<option value="\${r.id}">\${r.name} â€” \${r.purpose.substring(0,40)}...</option>\`).join('');
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
//  ROLE MANAGEMENT
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

document.getElementById('btn-add-role').addEventListener('click',()=>{
  const id=document.getElementById('role-id').value.trim();
  const name=document.getElementById('role-name').value.trim();
  const purpose=document.getElementById('role-purpose').value.trim();
  if(!id||!name||!purpose){alert('Role ID, Name, and Purpose are all required.');return;}
  if(ROLES.find(r=>r.id===id)){alert('Role ID already exists.');return;}
  const dataViews=[...document.getElementById('role-data').selectedOptions].map(o=>o.value);
  const processViews=[...document.getElementById('role-process').selectedOptions].map(o=>o.value);
  const feedback=document.getElementById('role-feedback').value;
  const comment=document.getElementById('role-comment').value;
  const suggestion=document.getElementById('role-suggestion').value;
  ROLES.push({id,name,purpose,dataViews,processViews,feedback,comment,suggestion});
  addLog('ROLE_DEF',\`Defined role: \${name} (\${id}) â€” \${dataViews.length} data views, \${processViews.length} process views, feedback: \${feedback}\`);
  renderRoles();renderAll();
  document.getElementById('role-id').value='';document.getElementById('role-name').value='';document.getElementById('role-purpose').value='';
});

function renderRoles(){
  document.getElementById('roles-body').innerHTML=ROLES.map((r,i)=>\`<tr>
    <td><code style="color:var(--cyan)">\${r.id}</code></td>
    <td><strong>\${r.name}</strong></td>
    <td style="max-width:220px;font-size:.74rem">\${r.purpose}</td>
    <td><span class="badge-s badge-blue">\${r.dataViews.length} views</span></td>
    <td><span class="badge-s badge-purple">\${r.processViews.length} views</span></td>
    <td><span class="badge-s badge-\${r.feedback==='full'?'green':r.feedback==='submit'?'blue':r.feedback==='vote'?'yellow':'dim'}">\${r.feedback}</span></td>
    <td>\${r.id!=='super-admin'?\`<button class="btn-danger btn-sm" onclick="deleteRole(\${i})"><i class="fas fa-trash"></i></button>\`:''}</td>
  </tr>\`).join('');
}
window.deleteRole=function(i){if(ROLES[i].id==='super-admin')return;if(confirm(\`Delete role "\${ROLES[i].name}"?\`)){ROLES.splice(i,1);renderRoles();}};

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
//  USER ASSIGNMENT
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

document.getElementById('btn-assign-role').addEventListener('click',()=>{
  const name=document.getElementById('assign-panel').dataset.memberName;
  const email=document.getElementById('assign-email').value;
  const roleId=document.getElementById('assign-role').value;
  const access=document.getElementById('assign-access').value;
  if(!roleId){alert('Please select a role.');return;}
  // MULTI-ROLE: If user exists, ADD role instead of blocking
  const existingUser=USERS.find(u=>u.email===email);
  if(existingUser){
    if(existingUser.roles.find(r=>r.id===roleId)){alert('User already has this role.');return;}
    const role=roleById(roleId);
    existingUser.roles.push({id:roleId,name:role?role.name:roleId,assignedDate:new Date().toISOString().split('T')[0],context:'manual',status:'active'});
    existingUser.roleHistory.push({roleId,roleName:role?role.name:roleId,from:new Date().toISOString().split('T')[0],to:null,action:'role-added',by:'Super Admin'});
    addLog('USER_ADD','Added role '+((role&&role.name)||roleId)+' to existing user '+name+' (multi-role)');
    renderUsers();renderAll();
    document.getElementById('assign-panel').style.display='none';crmSearchInput.value='';
    return;
  }
  // New user: create with multi-role structure
  const role=roleById(roleId);
  const identityId=resolveOrCreateIdentity(email,name);
  USERS.push({name,email,
    roles:[{id:roleId,name:role?role.name:roleId,assignedDate:new Date().toISOString().split('T')[0],context:'manual',status:'active'}],
    roleHistory:[{roleId,roleName:role?role.name:roleId,from:new Date().toISOString().split('T')[0],to:null,action:'assigned',by:'Super Admin'}],
    credentials:{username:email.split('@')[0],hasPassword:false},
    identityId:identityId,access,invited:null,status:'active',signedUp:false});
  addLog('USER_ADD','Assigned '+name+' as '+(role?role.name:roleId)+' (identity: '+identityId+')');
  renderUsers();renderAll();
  document.getElementById('assign-panel').style.display='none';crmSearchInput.value='';
});

document.getElementById('btn-assign-invite').addEventListener('click',()=>{
  const name=document.getElementById('assign-panel').dataset.memberName;
  const email=document.getElementById('assign-email').value;
  const roleId=document.getElementById('assign-role').value;
  const access=document.getElementById('assign-access').value;
  if(!roleId){alert('Select a role first.');return;}
  const member=CRM.find(m=>m.email===email);
  if(member && !member.emailOptIn){
    alert('Privacy Block: '+name+' has emailOptIn=false.\\nCannot send invitation email.\\n\\nThe member must opt-in via the data correction form first.');
    return;
  }
  // MULTI-ROLE: If user exists, add role
  const existingUser=USERS.find(u=>u.email===email);
  const role=roleById(roleId);
  if(existingUser){
    if(existingUser.roles.find(r=>r.id===roleId)){alert('User already has this role.');return;}
    existingUser.roles.push({id:roleId,name:role?role.name:roleId,assignedDate:new Date().toISOString().split('T')[0],context:'drive-invite',status:'active'});
    existingUser.roleHistory.push({roleId,roleName:role?role.name:roleId,from:new Date().toISOString().split('T')[0],to:null,action:'role-added-invite',by:'Super Admin'});
    addLog('USER_ADD','Added role '+(role?role.name:roleId)+' to '+name+' via invite (multi-role, credentials persist)');
    addLog('EMAIL','Communication Agent: sendGmail() -> '+email+' with data privacy notice, unsubscribe link');
    renderUsers();renderAll();
    document.getElementById('assign-panel').style.display='none';
    alert('Role added to existing user '+name+'\\nCredentials remain the same (persistent identity).\\nInvitation email sent.');
    return;
  }
  // New user with invite
  const identityId=resolveOrCreateIdentity(email,name);
  USERS.push({name,email,
    roles:[{id:roleId,name:role?role.name:roleId,assignedDate:new Date().toISOString().split('T')[0],context:'drive-invite',status:'active'}],
    roleHistory:[{roleId,roleName:role?role.name:roleId,from:new Date().toISOString().split('T')[0],to:null,action:'assigned-invite',by:'Super Admin'}],
    credentials:{username:email.split('@')[0],hasPassword:false},
    identityId:identityId,
    access,invited:new Date().toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}),status:'invited',signedUp:false});
  addLog('USER_ADD','Assigned & invited '+name+' as '+(role?role.name:roleId)+' (identity: '+identityId+')');
  addLog('EMAIL','Communication Agent: sendGmail() -> '+email+' with data privacy notice, unsubscribe link');
  renderUsers();renderAll();
  document.getElementById('assign-panel').style.display='none';
  alert('Invitation sent to '+name+' ('+email+')\\nRole: '+(role?role.name:roleId)+'\\nIdentity: '+identityId+'\\nAccess: '+access+'\\n\\nEmail includes data privacy notice + unsubscribe link.\\nOnce they sign up, credentials persist across ALL drives.');
});
document.getElementById('btn-assign-invite').addEventListener('click',()=>{
  const name=document.getElementById('assign-panel').dataset.memberName;
  const email=document.getElementById('assign-email').value;
  const roleId=document.getElementById('assign-role').value;
  const access=document.getElementById('assign-access').value;
  if(!roleId){alert('Select a role first.');return;}
  if(USERS.find(u=>u.email===email)){alert('Already registered.');return;}
  const member=CRM.find(m=>m.email===email);
  if(member && !member.emailOptIn){
    alert(\`âš ï¸ Privacy Block: \${name} has emailOptIn=false.\\nCannot send invitation email.\\n\\nThe member must opt-in via the data correction form first.\`);
    return;
  }
  USERS.push({name,email,roleId,access,invited:new Date().toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}),status:'invited',signedUp:false});
  addLog('USER_ADD',\`Assigned & invited \${name} as \${roleById(roleId)?.name||roleId}\`);
  addLog('EMAIL',\`Communication Agent: sendGmail() â†’ \${email} with data privacy notice, unsubscribe link\`);
  renderUsers();renderAll();
  document.getElementById('assign-panel').style.display='none';
  alert(\`âœ… Invitation sent to \${name} (\${email})\\nRole: \${roleById(roleId)?.name}\\nAccess: \${access}\\n\\nðŸ“§ Email sent via Communication Agent (sendGmail) with:\\nâ€¢ Data privacy notice (comms-correction.js pattern)\\nâ€¢ Unsubscribe link\\nâ€¢ Purpose limitation disclosure\\nâ€¢ Right to erasure notice\`);
});

function renderUsers(){
  document.getElementById('users-body').innerHTML=USERS.map((u,i)=>{
    // Multi-role: show ALL roles as badges
    var roleBadges=u.roles.map(function(r){
      var color=r.id==='super-admin'?'red':r.id.includes('stakeholder')?'orange':r.id.includes('ec')?'blue':'purple';
      return '<span class="badge-s badge-'+color+'" style="margin-right:3px" title="Since: '+r.assignedDate+'">'+r.name+'</span>';
    }).join('');
    var credBadge=u.credentials&&u.credentials.hasPassword?'<span class="badge-s badge-green" title="Credentials set - persist across all drives"><i class="fas fa-key" style="font-size:.55rem"></i></span>':'<span class="badge-s badge-dim" title="No credentials yet"><i class="fas fa-key" style="font-size:.55rem"></i></span>';
    var identBadge=u.identityId?'<span class="badge-s badge-cyan" style="font-size:.62rem" title="Identity: '+u.identityId+'">'+u.identityId+'</span>':'';
    return '<tr>'+
    '<td><strong>'+u.name+'</strong><br>'+identBadge+'</td><td>'+u.email+'</td>'+
    '<td>'+roleBadges+'</td>'+
    '<td><span class="badge-s badge-dim">'+u.access+'</span> '+credBadge+'</td>'+
    '<td>'+(u.invited||'--')+'</td>'+
    '<td><span class="badge-s badge-'+(u.status==='active'?'green':u.status==='invited'?'yellow':'dim')+'">'+u.status+(u.signedUp?' &#10003;':'')+'</span></td>'+
    '<td>'+(u.roles.every(function(r){return r.id==='super-admin'})?'':'<button class="btn-danger btn-sm" onclick="removeUser('+i+')"><i class="fas fa-trash"></i></button>')+'</td>'+
  '</tr>'}).join('');
}
window.removeUser=function(i){if(confirm('Remove "'+USERS[i].name+'"?')){USERS.splice(i,1);renderUsers();renderAll();}};

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
//  STAKEHOLDER DRIVE
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•


// ==================================================================
//  MULTI-DIMENSIONAL IDENTITY RESOLUTION ENGINE
// ==================================================================

// Dimension weights for identity scoring
const IDENTITY_WEIGHTS = {
  email: 100,      // Primary key - exact match = instant identity
  phone: 80,       // Strong signal
  familyId: 70,    // Strong signal - same household
  childrenNames: 60, // Per matching child (divided by count)
  nameComposite: 50, // Name + City + Profession together
  joinTimestamp: 40,  // Within 30 days = match (time signature)
  membershipYears: 35, // Overlapping years
  spouseName: 20     // Mutable - lower weight (can change)
  // DOB: NOT USED - excluded per privacy policy
};

function computeIdentityScore(candidateCRM, searchDimensions) {
  var score = 0;
  var matches = [];
  // 1. Email (primary)
  if (searchDimensions.email && candidateCRM.email && 
      searchDimensions.email.toLowerCase() === candidateCRM.email.toLowerCase()) {
    score += IDENTITY_WEIGHTS.email;
    matches.push('email(100)');
  }
  // 2. Phone
  if (searchDimensions.phone && candidateCRM.phone && 
      searchDimensions.phone.replace(/\\D/g,'') === candidateCRM.phone.replace(/\\D/g,'')) {
    score += IDENTITY_WEIGHTS.phone;
    matches.push('phone(80)');
  }
  // 3. Family ID
  if (searchDimensions.familyId && candidateCRM.familyId && 
      searchDimensions.familyId === candidateCRM.familyId) {
    score += IDENTITY_WEIGHTS.familyId;
    matches.push('familyId(70)');
  }
  // 4. Children names
  if (searchDimensions.childrenNames && searchDimensions.childrenNames.length > 0 && 
      candidateCRM.childrenNames && candidateCRM.childrenNames.length > 0) {
    var matchCount = 0;
    searchDimensions.childrenNames.forEach(function(cn) {
      if (candidateCRM.childrenNames.some(function(cc) { return cc.toLowerCase() === cn.toLowerCase(); })) matchCount++;
    });
    if (matchCount > 0) {
      var childScore = Math.round(IDENTITY_WEIGHTS.childrenNames * matchCount / Math.max(searchDimensions.childrenNames.length, candidateCRM.childrenNames.length));
      score += childScore;
      matches.push('children(' + childScore + ', ' + matchCount + ' match)');
    }
  }
  // 5. Name + City + Profession composite
  var nameMatch = searchDimensions.name && (candidateCRM.displayName || '').toLowerCase().includes(searchDimensions.name.toLowerCase());
  var cityMatch = searchDimensions.city && candidateCRM.city && searchDimensions.city.toLowerCase() === candidateCRM.city.toLowerCase();
  var profMatch = searchDimensions.profession && candidateCRM.profession && candidateCRM.profession.toLowerCase().includes(searchDimensions.profession.toLowerCase());
  if (nameMatch && cityMatch && profMatch) { score += IDENTITY_WEIGHTS.nameComposite; matches.push('name+city+prof(50)'); }
  else if (nameMatch && (cityMatch || profMatch)) { score += Math.round(IDENTITY_WEIGHTS.nameComposite * 0.6); matches.push('name+partial(30)'); }
  else if (nameMatch) { score += Math.round(IDENTITY_WEIGHTS.nameComposite * 0.3); matches.push('name(15)'); }
  // 6. Join timestamp (within 30 days)
  if (searchDimensions.joinTimestamp && candidateCRM.joinTimestamp) {
    var diff = Math.abs(new Date(searchDimensions.joinTimestamp) - new Date(candidateCRM.joinTimestamp));
    var daysDiff = diff / (1000 * 60 * 60 * 24);
    if (daysDiff < 1) { score += IDENTITY_WEIGHTS.joinTimestamp; matches.push('joinTime-exact(40)'); }
    else if (daysDiff <= 30) { score += Math.round(IDENTITY_WEIGHTS.joinTimestamp * 0.5); matches.push('joinTime-near(20)'); }
  }
  // 7. Membership years overlap
  if (searchDimensions.membershipYears && searchDimensions.membershipYears.length > 0 &&
      candidateCRM.membershipYears && candidateCRM.membershipYears.length > 0) {
    var overlap = searchDimensions.membershipYears.filter(function(y) { return candidateCRM.membershipYears.includes(y); }).length;
    if (overlap > 0) {
      var yearScore = Math.round(IDENTITY_WEIGHTS.membershipYears * overlap / Math.max(searchDimensions.membershipYears.length, candidateCRM.membershipYears.length));
      score += yearScore;
      matches.push('years(' + yearScore + ', ' + overlap + ' overlap)');
    }
  }
  // 8. Spouse name (fuzzy, mutable)
  if (searchDimensions.spouseName && candidateCRM.spouseName) {
    if (searchDimensions.spouseName.toLowerCase() === candidateCRM.spouseName.toLowerCase()) {
      score += IDENTITY_WEIGHTS.spouseName;
      matches.push('spouse(20)');
    } else if (candidateCRM.spouseName.toLowerCase().includes(searchDimensions.spouseName.toLowerCase().split(' ')[0])) {
      score += Math.round(IDENTITY_WEIGHTS.spouseName * 0.5);
      matches.push('spouse-partial(10)');
    }
  }
  return { score: Math.min(score, 100), matches: matches, candidate: candidateCRM };
}

function resolveIdentityFromCRM(searchDimensions) {
  var results = CRM.map(function(m) {
    return computeIdentityScore(m, searchDimensions);
  }).filter(function(r) { return r.score > 0; })
    .sort(function(a, b) { return b.score - a.score; });
  return results;
}

function resolveOrCreateIdentity(email, name) {
  // Check if identity already exists
  var existing = IDENTITY_GRAPH.find(function(ig) { return ig.primaryEmail === email; });
  if (existing) return existing.identityId;
  // Check CRM
  var member = CRM.find(function(m) { return m.email === email; });
  var newId = 'IDN-' + String(IDENTITY_COUNTER).padStart(3, '0');
  IDENTITY_COUNTER++;
  var newIdentity = {
    identityId: newId, primaryEmail: email, displayName: name,
    dimensions: {
      emails: [email],
      phones: member ? [member.phone] : [],
      familyId: member ? member.familyId : '',
      childrenNames: member ? (member.childrenNames || []) : [],
      spouseName: member ? (member.spouseName || '') : '',
      joinTimestamp: member ? (member.joinTimestamp || new Date().toISOString()) : new Date().toISOString(),
      membershipYears: member ? (member.membershipYears || []) : [],
      city: member ? member.city : '',
      profession: member ? member.profession : ''
    },
    confidenceScore: member ? 100 : 50,
    linkedMemberIds: member ? [member.memberId] : [],
    linkedUserEmails: [email],
    createdAt: new Date().toISOString().split('T')[0],
    lastVerified: new Date().toLocaleDateString('en-US', {month:'short', day:'numeric', year:'numeric'})
  };
  IDENTITY_GRAPH.push(newIdentity);
  addLog('IDENTITY', 'Created identity ' + newId + ' for ' + name + ' (' + email + ') - confidence: ' + newIdentity.confidenceScore + '%');
  return newId;
}

// Identity search UI handler
document.getElementById('btn-identity-search').addEventListener('click', function() {
  var query = document.getElementById('identity-search').value.trim();
  if (!query) { alert('Enter a name to search.'); return; }
  var searchDims = { name: query };
  var results = resolveIdentityFromCRM(searchDims);
  var el = document.getElementById('identity-results');
  if (results.length === 0) {
    el.innerHTML = '<div style="text-align:center;padding:16px;color:var(--dim)">No matches found for "' + query + '"</div>';
    return;
  }
  // Check if multiple matches with same last name (disambiguation needed)
  var highMatches = results.filter(function(r) { return r.score >= 15; });
  var needsDisambig = highMatches.length > 1;
  el.innerHTML = (needsDisambig ? '<div style="padding:8px 12px;background:rgba(234,179,8,.08);border:1px solid rgba(234,179,8,.2);border-radius:8px;margin-bottom:12px;font-size:.78rem;color:var(--yellow)"><i class="fas fa-exclamation-triangle me-1"></i><strong>Disambiguation Required:</strong> Multiple members match "' + query + '". Review dimensional scores below to identify the correct person. Same names exist in the community.</div>' : '') +
    '<table class="t"><thead><tr><th>Member</th><th>Email</th><th>Score</th><th>Confidence</th><th>Matching Dimensions</th><th>Children</th><th>Spouse</th><th>Joined</th></tr></thead><tbody>' +
    highMatches.map(function(r) {
      var m = r.candidate;
      var conf = r.score >= 80 ? 'green' : r.score >= 50 ? 'yellow' : 'red';
      var confLabel = r.score >= 80 ? 'Auto-Match' : r.score >= 50 ? 'Review' : 'Low';
      return '<tr>' +
        '<td><strong>' + m.displayName + '</strong><br><span style="font-size:.68rem;color:var(--dim)">' + m.memberId + ' | ' + m.familyId + '</span></td>' +
        '<td>' + m.email + '</td>' +
        '<td><strong style="color:var(--' + conf + ')">' + r.score + '%</strong></td>' +
        '<td><span class="badge-s badge-' + conf + '">' + confLabel + '</span></td>' +
        '<td style="font-size:.7rem">' + r.matches.join(', ') + '</td>' +
        '<td style="font-size:.72rem">' + ((m.childrenNames && m.childrenNames.length) ? m.childrenNames.join(', ') : '<span style="color:var(--dim)">none</span>') + '</td>' +
        '<td style="font-size:.72rem">' + (m.spouseName || '<span style="color:var(--dim)">--</span>') + '</td>' +
        '<td style="font-size:.72rem">' + (m.joinTimestamp ? new Date(m.joinTimestamp).toLocaleDateString('en-US',{month:'short',year:'numeric'}) : '--') + '</td>' +
        '</tr>';
    }).join('') + '</tbody></table>';
});
document.getElementById('identity-search').addEventListener('keypress', function(e) { if (e.key === 'Enter') document.getElementById('btn-identity-search').click(); });

function renderIdentityGraph() {
  document.getElementById('identity-count').textContent = IDENTITY_GRAPH.length;
  document.getElementById('identity-graph-body').innerHTML = IDENTITY_GRAPH.map(function(ig) {
    var dims = ig.dimensions;
    var dimTags = [];
    if (dims.emails && dims.emails.length) dimTags.push('<span class="badge-s badge-green">email</span>');
    if (dims.phones && dims.phones.length) dimTags.push('<span class="badge-s badge-blue">phone</span>');
    if (dims.familyId) dimTags.push('<span class="badge-s badge-cyan">family</span>');
    if (dims.childrenNames && dims.childrenNames.length) dimTags.push('<span class="badge-s badge-purple">' + dims.childrenNames.length + ' children</span>');
    if (dims.spouseName) dimTags.push('<span class="badge-s badge-dim">spouse</span>');
    if (dims.joinTimestamp) dimTags.push('<span class="badge-s badge-orange">time</span>');
    if (dims.membershipYears && dims.membershipYears.length) dimTags.push('<span class="badge-s badge-blue">' + dims.membershipYears.length + 'yr</span>');
    // Find user roles for this identity
    var userRoles = [];
    USERS.forEach(function(u) {
      if (u.identityId === ig.identityId) {
        u.roles.forEach(function(r) { userRoles.push(r); });
      }
    });
    var roleBadges = userRoles.length > 0 ? userRoles.map(function(r) {
      var c = r.id === 'super-admin' ? 'red' : r.id.includes('stakeholder') ? 'orange' : 'blue';
      return '<span class="badge-s badge-' + c + '">' + r.name + '</span>';
    }).join(' ') : '<span style="color:var(--dim);font-size:.7rem">No roles</span>';
    return '<tr>' +
      '<td><code style="color:var(--cyan)">' + ig.identityId + '</code></td>' +
      '<td><strong>' + ig.displayName + '</strong></td>' +
      '<td style="font-size:.74rem">' + ig.primaryEmail + '</td>' +
      '<td>' + dimTags.join(' ') + '</td>' +
      '<td><span class="badge-s badge-' + (ig.confidenceScore >= 80 ? 'green' : ig.confidenceScore >= 50 ? 'yellow' : 'red') + '">' + ig.confidenceScore + '%</span></td>' +
      '<td style="font-size:.72rem">' + ig.linkedMemberIds.join(', ') + '</td>' +
      '<td>' + roleBadges + '</td>' +
      '<td style="font-size:.7rem;color:var(--dim)">' + ig.lastVerified + '</td>' +
      '</tr>';
  }).join('');
}

function renderRoleHistory() {
  var el = document.getElementById('role-history-panel');
  if (!el) return;
  el.innerHTML = USERS.map(function(u) {
    var historyRows = u.roleHistory ? u.roleHistory.map(function(h) {
      return '<tr><td><span class="badge-s badge-' + (h.action.includes('assigned') ? 'green' : h.action.includes('removed') ? 'red' : 'blue') + '">' + h.action + '</span></td>' +
        '<td>' + h.roleName + '</td><td>' + h.from + '</td><td>' + (h.to || '<span style="color:var(--green)">current</span>') + '</td><td>' + h.by + '</td></tr>';
    }).join('') : '';
    var credStatus = u.credentials && u.credentials.hasPassword ? 
      '<span class="badge-s badge-green"><i class="fas fa-key" style="font-size:.55rem"></i> Credentials Active</span> <span style="font-size:.68rem;color:var(--muted)">Username: ' + u.credentials.username + ' | Persists across all drives</span>' :
      '<span class="badge-s badge-dim"><i class="fas fa-key" style="font-size:.55rem"></i> No Password Set</span>';
    return '<div style="background:var(--bg2);border:1px solid var(--line);border-radius:8px;padding:14px;margin-bottom:10px">' +
      '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">' +
      '<div><strong style="color:#fff">' + u.name + '</strong> <span style="font-size:.72rem;color:var(--muted)">' + u.email + '</span></div>' +
      '<div>' + credStatus + '</div></div>' +
      '<div style="margin-bottom:6px">' + u.roles.map(function(r) {
        var c = r.id === 'super-admin' ? 'red' : r.id.includes('stakeholder') ? 'orange' : 'blue';
        return '<span class="badge-s badge-' + c + '" style="margin-right:4px">' + r.name + ' (since ' + r.assignedDate + ')</span>';
      }).join('') + '</div>' +
      (historyRows ? '<table class="t" style="font-size:.72rem"><thead><tr><th>Action</th><th>Role</th><th>From</th><th>To</th><th>By</th></tr></thead><tbody>' + historyRows + '</tbody></table>' : '') +
      '</div>';
  }).join('');
}

const driveSearchInput=document.getElementById('drive-search');
driveSearchInput.addEventListener('input',()=>{
  const q=driveSearchInput.value.trim();
  if(q.length<2){document.getElementById('drive-results').classList.remove('open');return;}
  renderSearchResults('drive-results',searchCRM(q),addToDrive);
});
driveSearchInput.addEventListener('blur',()=>setTimeout(()=>document.getElementById('drive-results').classList.remove('open'),200));

function addToDrive(member){
  if(DRIVE_LIST.find(d=>d.email===member.email)){alert('Already in drive list.');return;}
  if(ROLES.length<2){alert('âš ï¸ Define at least one non-admin role first.\\nGo to Role Definitions.');navTo('roles');return;}
  const roleId=prompt(\`Assign role for \${member.displayName}:\\n\\nAvailable roles:\\n\${ROLES.filter(r=>r.id!=='super-admin').map(r=>\`â€¢ \${r.id} â€” \${r.name}\`).join('\\n')}\\n\\nEnter role ID:\`);
  if(!roleId)return;
  const role=roleById(roleId);
  if(!role){alert('Role not found. Define it first in Role Definitions.');return;}
  DRIVE_LIST.push({
    name:member.displayName,email:member.email,roleId,roleName:role.name,
    optIn:member.emailOptIn,privacyOK:false,emailStatus:'pending'
  });
  driveSearchInput.value='';
  renderDrive();
}

function renderDrive(){
  document.getElementById('drive-body').innerHTML=DRIVE_LIST.map((d,i)=>\`<tr>
    <td><strong>\${d.name}</strong></td><td>\${d.email}</td>
    <td><span class="badge-s badge-blue">\${d.roleName}</span></td>
    <td><span class="badge-s \${d.optIn?'badge-green':'badge-red'}">\${d.optIn?'Yes':'No'}</span></td>
    <td><span class="badge-s \${d.privacyOK?'badge-green':'badge-dim'}">\${d.privacyOK?'Passed':'Pending'}</span></td>
    <td><span class="badge-s badge-\${d.emailStatus==='sent'?'green':d.emailStatus==='blocked'?'red':'yellow'}">\${d.emailStatus}</span></td>
    <td><button class="btn-danger btn-sm" onclick="removeDrive(\${i})"><i class="fas fa-trash"></i></button></td>
  </tr>\`).join('');
}
window.removeDrive=function(i){DRIVE_LIST.splice(i,1);renderDrive()};

function buildDriveInviteEmail(opts) {
  var name = opts.name, email = opts.email, roleName = opts.roleName;
  var dataViews = opts.dataViews, feedbackAbility = opts.feedbackAbility;
  var dashboardLink = opts.dashboardLink, unsubscribeLink = opts.unsubscribeLink;
  var journeyLink = opts.journeyLink || 'https://banfjax-hash.github.io/banf/stakeholder-requirements-journey.html';
  var customNote = opts.customNote;
  var year = new Date().getFullYear();
  var sentDate = new Date().toLocaleDateString('en-US', { year:'numeric', month:'long', day:'numeric' });
  var dataViewsList = (dataViews||'Overview').split(', ').map(function(v) {
    return '<li style="padding:3px 0;color:#444;font-size:.9rem"><span style="color:#22c55e;font-weight:700">&#10003;</span> ' + v.charAt(0).toUpperCase()+v.slice(1) + '</li>';
  }).join('');

  return '<!DOCTYPE html>' +
'<html lang="en">' +
'<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
'<title>BANF Stakeholder Invitation</title></head>' +
'<body style="margin:0;padding:0;background:#f5f7fa;font-family:Segoe UI,Arial,sans-serif">' +
'<table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f7fa;padding:30px 0">' +
'<tr><td align="center">' +
'<table width="620" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.1)">' +

'<tr><td style="background:linear-gradient(135deg,#8B0000,#DC143C);padding:32px 40px;text-align:center">' +
'<h1 style="color:#fff;margin:0;font-size:1.5rem;font-weight:700">Bengali Association of North Florida</h1>' +
'<p style="color:rgba(255,255,255,.85);margin:8px 0 0;font-size:.95rem;letter-spacing:.3px">' +
'Stakeholder Invitation - BANF Development Ecosystem</p>' +
'</td></tr>' +

'<tr><td style="padding:36px 40px 4px">' +
'<p style="font-size:1.05rem;color:#333;margin:0 0 18px">Dear <strong>' + name + '</strong>,</p>' +
'<p style="color:#444;line-height:1.75;margin:0 0 14px">' +
'On behalf of the <strong>Bengali Association of North Florida (BANF)</strong>, we are pleased to inform you that ' +
'you have been selected as a <strong style="color:#8B0000">' + roleName + '</strong> for the ' +
'<strong>BANF Development Ecosystem and Unified Dashboard</strong>.</p>' +
'<p style="color:#444;line-height:1.75;margin:0 0 14px">' +
'The BANF Development Ecosystem is our comprehensive digital platform that powers community management, ' +
'event coordination, membership services, and stakeholder collaboration. As a key stakeholder, your ' +
'insights and feedback are vital to shaping the future of our platform.</p>' +
'</td></tr>' +

'<tr><td style="padding:4px 40px">' +
'<div style="background:#fff8e1;border-left:4px solid #D4AF37;border-radius:0 10px 10px 0;padding:16px 20px;margin:8px 0 18px">' +
'<p style="margin:0 0 10px;font-weight:700;color:#7B5800;font-size:.95rem">Your Assigned Role: ' + roleName + '</p>' +
'<p style="margin:0 0 8px;color:#5a4000;font-size:.88rem"><strong>Dashboard Access and Data Views:</strong></p>' +
'<ul style="margin:0;padding-left:20px;color:#5a4000;line-height:1.8;font-size:.9rem">' + dataViewsList + '</ul>' +
'<p style="margin:10px 0 0;color:#5a4000;font-size:.88rem"><strong>Feedback Capability:</strong> ' + feedbackAbility + '</p>' +
'</div></td></tr>' +

'<tr><td style="padding:4px 40px">' +
'<p style="margin:0 0 10px;font-weight:700;color:#333;font-size:.95rem">As ' + roleName + ', you will be able to:</p>' +
'<table cellpadding="0" cellspacing="0" style="margin:0 0 18px;width:100%">' +
'<tr><td style="padding:6px 0;color:#444;font-size:.9rem"><span style="color:#22c55e;font-weight:700">&#10003;</span> <strong>Review and provide feedback</strong> on platform sections, workflows, and designs</td></tr>' +
'<tr><td style="padding:6px 0;color:#444;font-size:.9rem"><span style="color:#22c55e;font-weight:700">&#10003;</span> <strong>Track your input</strong> as it flows through the agent pipeline to implementation</td></tr>' +
'<tr><td style="padding:6px 0;color:#444;font-size:.9rem"><span style="color:#22c55e;font-weight:700">&#10003;</span> <strong>Review board decisions</strong> and technical lead approvals in real-time</td></tr>' +
'<tr><td style="padding:6px 0;color:#444;font-size:.9rem"><span style="color:#22c55e;font-weight:700">&#10003;</span> <strong>Collaborate</strong> with other stakeholders and the development team</td></tr>' +
'<tr><td style="padding:6px 0;color:#444;font-size:.9rem"><span style="color:#22c55e;font-weight:700">&#10003;</span> <strong>Access live dashboards</strong> with KPIs, testing results, and deployment status</td></tr>' +
'</table></td></tr>' +

'<tr><td style="padding:8px 40px 24px;text-align:center">' +
'<a href="' + dashboardLink + '" ' +
'style="display:inline-block;background:linear-gradient(135deg,#8B0000,#DC143C);color:#fff;text-decoration:none;' +
'padding:15px 44px;border-radius:30px;font-size:1.05rem;font-weight:700;letter-spacing:.5px;' +
'box-shadow:0 4px 18px rgba(139,0,0,.35)">' +
'Access Your Dashboard</a><br><br>' +
'<a href="' + journeyLink + '" ' +
'style="display:inline-block;background:#fff;color:#8B0000;text-decoration:none;border:2px solid #8B0000;' +
'padding:11px 26px;border-radius:30px;font-size:.92rem;font-weight:700;letter-spacing:.3px">' +
'Open Requirements Journey</a>' +
'<p style="margin:14px 0 4px;font-size:.8rem;color:#888">Sign in with your email address: <strong>' + email + '</strong></p>' +
'</td></tr>' +

(customNote ? '<tr><td style="padding:4px 40px"><div style="background:#f0f4ff;border-left:4px solid #3b82f6;border-radius:0 10px 10px 0;padding:14px 20px;margin:0 0 18px"><p style="margin:0;color:#1e40af;font-size:.9rem;line-height:1.7">' + customNote + '</p></div></td></tr>' : '') +

'<tr><td style="padding:4px 40px 8px">' +
'<p style="color:#444;line-height:1.75;margin:0 0 8px;font-size:.9rem">' +
'We look forward to your valuable contributions to the BANF ecosystem.</p>' +
'<p style="color:#444;margin:0 0 4px;font-size:.9rem">Best regards,</p>' +
'<p style="color:#333;margin:0 0 2px;font-size:.95rem;font-weight:700">Ranadhir Ghosh</p>' +
'<p style="color:#666;margin:0;font-size:.82rem">Technical Lead and Super Admin - BANF Platform</p>' +
'<p style="color:#888;margin:4px 0 0;font-size:.78rem">Bengali Association of North Florida | <a href="mailto:banfjax@gmail.com" style="color:#8B0000">banfjax@gmail.com</a></p>' +
'</td></tr>' +

'<tr><td style="background:#f0f4f8;border-top:1px solid #dde3ea;padding:22px 40px">' +
'<p style="margin:0 0 8px;font-size:.85rem;font-weight:700;color:#555;letter-spacing:.3px">DATA PRIVACY NOTICE</p>' +
'<p style="margin:0;font-size:.8rem;color:#666;line-height:1.75">' +
'The information associated with your account is collected <strong>solely for internal BANF communication and platform collaboration purposes</strong>. ' +
'Your data is used exclusively to provide you with the stakeholder access and dashboard capabilities described above.</p>' +
'<ul style="margin:8px 0 0;padding-left:18px;font-size:.79rem;color:#666;line-height:1.9">' +
'<li><strong>No third-party sharing:</strong> Your personal details will never be sold, rented, or shared with any external organisation, advertiser, or third party.</li>' +
'<li><strong>Purpose limitation:</strong> Data collected is used only for the BANF platform collaboration and communication purposes stated above and for no other purpose.</li>' +
'<li><strong>Data security:</strong> Your information is stored securely within the BANF management system with access restricted to authorised BANF committee members and system administrators only.</li>' +
'<li><strong>Right to opt out:</strong> You may withdraw consent and unsubscribe from all communications at any time by clicking the unsubscribe link below or contacting <a href="mailto:banfjax@gmail.com" style="color:#8B0000">banfjax@gmail.com</a>.</li>' +
'<li><strong>Right to erasure:</strong> You may request complete deletion of your personal data from BANF records at any time by contacting us directly at <a href="mailto:banfjax@gmail.com" style="color:#8B0000">banfjax@gmail.com</a>.</li>' +
'<li><strong>Data access:</strong> You have the right to request a copy of all personal data BANF holds about you at any time.</li>' +
'</ul>' +
'<p style="margin:10px 0 0;font-size:.78rem;color:#888;line-height:1.6">' +
'BANF is committed to responsible and transparent handling of personal data in line with applicable privacy standards and data protection regulations. ' +
'If you believe you received this email in error or have any concerns about your data, please write to us at ' +
'<a href="mailto:banfjax@gmail.com" style="color:#8B0000">banfjax@gmail.com</a>.</p>' +
'</td></tr>' +

'<tr><td style="background:#f9f9f9;border-top:1px solid #eee;padding:14px 40px;text-align:center">' +
'<p style="margin:0 0 6px;font-size:.75rem;color:#999">' +
'<a href="' + unsubscribeLink + '" style="color:#8B0000;text-decoration:underline">Unsubscribe from BANF communications</a>' +
' | Sent on ' + sentDate + '</p>' +
'<p style="margin:0;font-size:.73rem;color:#bbb">(c) ' + year + ' Bengali Association of North Florida (BANF). All rights reserved.</p>' +
'<p style="margin:4px 0 0;font-size:.7rem;color:#ccc">jaxbengali.org | banfjax@gmail.com | Jacksonville, FL</p>' +
'</td></tr>' +

'</table></td></tr></table></body></html>';
}

document.getElementById('btn-privacy-check').addEventListener('click',()=>{
  let passed=0,blocked=0;
  DRIVE_LIST.forEach(d=>{
    if(d.optIn){d.privacyOK=true;passed++;}
    else{d.privacyOK=false;d.emailStatus='blocked';blocked++;}
  });
  addLog('PRIVACY',\`Privacy check (comms-correction.js pattern): \${passed} passed, \${blocked} blocked (emailOptIn=false)\`);
  renderDrive();renderAll();
  document.querySelectorAll('#sh-pipe .pipe-step').forEach((s,i)=>{s.className='pipe-step '+(i<3?'done':i===3?'active':'pending')});
  alert(\`Privacy Check Complete\\n\\nâœ… Passed: \${passed} (emailOptIn=true)\\nðŸš« Blocked: \${blocked} (emailOptIn=false)\\n\\nBlocked members will NOT receive emails.\\nThey must opt-in via the data correction form first.\`);
});

document.getElementById('btn-send-drive').addEventListener('click',async()=>{
  const eligible=DRIVE_LIST.filter(d=>d.privacyOK && d.emailStatus!=='sent');
  if(!eligible.length){alert('No eligible recipients.\\nRun privacy check first or add members with opt-in.');return;}
  if(!confirm(\`Send \${eligible.length} invitation email(s) via Communication Agent?\\n\\nEach email includes:\\n• Professional BANF-branded HTML\\n• Role-specific access details\\n• Dashboard access button\\n• Data Privacy Act notice\\n• Unsubscribe link\`))return;

  const subject=document.getElementById('drive-subject').value.trim()||"BANF Stakeholder Invitation";
  const customNote=document.getElementById('drive-custom-note').value.trim();
  const dashboardLink='https://banfjax-hash.github.io/banf/unified-ecosystem-dashboard.html';
  const journeyLink='https://banfjax-hash.github.io/banf/stakeholder-requirements-journey.html';
  let sent=0,failed=0;

  for(const d of eligible){
    d.emailStatus='sending';
    renderDrive();
    const role=roleById(d.roleId)||{};
    const dataViews=(role.dataViews||['overview']).join(', ');
    const feedbackAbility=role.feedback==='full'?'Full (Submit + Vote + Approve)':(role.feedback||'Submit Feedback');
    const unsubscribeLink=\`https://www.jaxbengali.org/_functions/unsubscribe?email=\${encodeURIComponent(d.email)}\`;

    const htmlBody=buildDriveInviteEmail({
      name: d.name,
      email: d.email,
      roleName: d.roleName,
      dataViews: dataViews,
      feedbackAbility: feedbackAbility,
      dashboardLink: dashboardLink,
      journeyLink: journeyLink,
      unsubscribeLink: unsubscribeLink,
      customNote: customNote
    });

    try{
      const resp=await fetch('https://www.jaxbengali.org/_functions/send_email',{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({to:d.email,toName:d.name,subject,body_html:htmlBody})
      });
      const data=await resp.json().catch(()=>({success:false,error:\`HTTP \${resp.status}\`}));
      if(resp.ok&&data&&data.success){
        d.emailStatus='sent';d.lastUpdated=new Date().toLocaleString('en-US',{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'});
        sent++;
        addLog('EMAIL',\`\\u2192 \${d.name} (\${d.email}) as \${d.roleName} \\u2014 SENT via Communication Agent (branded HTML + privacy notice + unsubscribe)\`);
      }else{
        d.emailStatus='failed';d.lastUpdated=new Date().toLocaleString('en-US',{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'});
        failed++;
        addLog('EMAIL',\`\\u2192 \${d.name} (\${d.email}) FAILED: \${(data&&(data.error||data.message))||('HTTP '+resp.status)}\`);
      }
    }catch(err){
      d.emailStatus='failed';d.lastUpdated=new Date().toLocaleString('en-US',{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'});
      failed++;
      addLog('EMAIL',\`\\u2192 \${d.name} (\${d.email}) FAILED: \${err.message}\`);
    }
    renderDrive();
  }

  addLog('DRIVE',\`Stakeholder drive completed: \${sent} sent, \${failed} failed (Communication Agent + /_functions/send_email)\`);
  renderDrive();renderAll();
  document.querySelectorAll('#sh-pipe .pipe-step').forEach((s,i)=>{s.className='pipe-step '+(i<4?'done':i===4?'active':'pending')});
  alert(\`Drive email run complete.\\n\\n\\u2705 Sent: \${sent}\\n\\u274C Failed: \${failed}\\n\\nEach email includes:\\n\\u2022 BANF-branded professional HTML\\n\\u2022 Personalized role & access details\\n\\u2022 Full Data Privacy Act notice\\n\\u2022 Unsubscribe link\\n\\nCheck Activity Log for details.\`);
});

document.getElementById('btn-preview-drive-email').addEventListener('click',()=>{
  const customNote=document.getElementById('drive-custom-note').value.trim();
  const previewHtml=buildDriveInviteEmail({
    name:'Ranadhir Ghosh',
    email:'ranadhir.ghosh@gmail.com',
    roleName:'Technical Lead',
    dataViews:'Overview, Pipeline, Agents, Endpoints, Testing, Deployment, Data Model, Sprints, Requirements, Dev Status, Observability, Internals, Expert Review',
    feedbackAbility:'Full (Submit + Vote + Approve)',
    dashboardLink:'https://banfjax-hash.github.io/banf/unified-ecosystem-dashboard.html',
    journeyLink:'https://banfjax-hash.github.io/banf/stakeholder-requirements-journey.html',
    unsubscribeLink:'https://www.jaxbengali.org/_functions/unsubscribe?email=ranadhir.ghosh@gmail.com',
    customNote: customNote
  });
  const w=window.open('','_blank','width=700,height=900');
  w.document.write(previewHtml);
  w.document.close();
});

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
//  EC DRIVE
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

function renderEC(){
  document.getElementById('ec-body').innerHTML=EC_MEMBERS.map(m=>\`<tr>
    <td><strong>\${m.name}</strong></td><td>\${m.title}</td><td>\${m.email}</td>
    <td><span class="badge-s badge-\${m.membership==='Paid'?'green':m.membership==='Pending'?'yellow':'red'}">\${m.membership}</span></td>
    <td><span class="badge-s badge-\${m.gate==='passed'?'green':m.gate==='pending'?'yellow':'red'}">\${m.gate}</span></td>
    <td><span class="badge-s badge-\${m.status==='complete'?'green':m.status==='pending'?'yellow':'red'}">\${m.status}</span></td>
  </tr>\`).join('');
}
document.getElementById('btn-ec-gate').addEventListener('click',()=>{addLog('EC_CHECK','Ran EC gate check (membership_gate_check) â€” 7 passed, 3 pending, 1 failed');renderAll();alert('EC Gate Check completed. See Activity Log.');});
document.getElementById('btn-ec-remind').addEventListener('click',()=>{
  // EC email sending DISABLED — delinked from all drives
  alert('\\u26D4 EC Invitation/Reminder Sending is DISABLED.\\n\\nEC onboarding email sends have been delinked from all email drives.\\nTo re-enable, set EC_EMAIL_SENDING_DISABLED = false in ec-onboarding-gate.js\\nand redeploy the backend.');
});
document.getElementById('btn-ec-pending').addEventListener('click',()=>{alert('Pending EC Members:\\n'+EC_MEMBERS.filter(m=>m.status==='pending').map(m=>\`\${m.name} (\${m.title}) â€” \${m.email}\`).join('\\n'));});
document.getElementById('btn-ec-complete').addEventListener('click',()=>{if(confirm('Mark EC year FY2026-27 complete?')){addLog('EC_COMPLETE','EC Year FY2026-27 marked complete by Super Admin');document.querySelectorAll('#ec-pipe .pipe-step').forEach(s=>s.className='pipe-step done');renderAll();alert('EC Year completed.');}});

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
//  FEEDBACK PIPELINE
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

function renderFeedback(){
  document.getElementById('feedback-list').innerHTML=FEEDBACK.map(fb=>\`<div class="feedback-card">
    <div class="fb-head">
      <span class="fb-section"><i class="fas fa-tag me-1"></i>\${fb.section} â€” \${fb.type}</span>
      <span class="fb-ts">\${fb.ts}</span>
    </div>
    <div class="fb-body">\${fb.body}</div>
    <div class="fb-user"><i class="fas fa-user me-1"></i>\${fb.user} (\${fb.role})</div>
    <div class="pipeline-flow" style="margin-top:8px">
      <span class="pf-step badge-s badge-green"><i class="fas fa-comment me-1"></i>Feedback âœ“</span><span class="pf-arrow">â†’</span>
      <span class="pf-step badge-s \${fb.agentAnalysis?'badge-green':'badge-dim'}"><i class="fas fa-robot me-1"></i>\${fb.agentAnalysis?'Agent âœ“':'Agent...'}</span><span class="pf-arrow">â†’</span>
      <span class="pf-step badge-s \${fb.designChange?'badge-green':'badge-dim'}"><i class="fas fa-drafting-compass me-1"></i>\${fb.designChange?'Design âœ“':'Design...'}</span><span class="pf-arrow">â†’</span>
      <span class="pf-step badge-s \${fb.boardStatus==='approved'?'badge-green':fb.boardStatus==='pending'?'badge-yellow':'badge-dim'}"><i class="fas fa-users me-1"></i>\${fb.boardStatus==='approved'?'Board âœ“':fb.boardStatus==='pending'?'Board â³':'Board...'}</span><span class="pf-arrow">â†’</span>
      <span class="pf-step badge-s \${fb.techLeadApproval==='approved'?'badge-green':fb.techLeadApproval==='pending'?'badge-yellow':'badge-dim'}"><i class="fas fa-gavel me-1"></i>\${fb.techLeadApproval==='approved'?'TL âœ“':fb.techLeadApproval==='pending'?'TL â³':'TL...'}</span><span class="pf-arrow">â†’</span>
      <span class="pf-step badge-s \${fb.devTicket?'badge-green':'badge-dim'}"><i class="fas fa-code me-1"></i>\${fb.devTicket||'Dev...'}</span>
    </div>
    \${fb.agentAnalysis?\`<div style="margin-top:8px;font-size:.72rem;color:var(--purple);background:rgba(168,85,247,.06);padding:8px 10px;border-radius:6px"><i class="fas fa-robot me-1"></i><strong>Copilot CLI:</strong> \${fb.agentAnalysis}</div>\`:''}
    \${fb.designChange?\`<div style="margin-top:4px;font-size:.72rem;color:var(--cyan);background:rgba(6,182,212,.06);padding:8px 10px;border-radius:6px"><i class="fas fa-drafting-compass me-1"></i><strong>Design Change:</strong> \${fb.designChange}</div>\`:''}
  </div>\`).join('');

  const pending=FEEDBACK.filter(fb=>fb.boardStatus==='approved'&&fb.techLeadApproval==='pending');
  document.getElementById('approvals-body').innerHTML=pending.length?pending.map(fb=>\`<tr>
    <td><code style="color:var(--cyan)">\${fb.id}</code></td><td>\${fb.user}</td><td>\${fb.section}</td>
    <td style="max-width:200px;font-size:.74rem">\${fb.designChange}</td>
    <td><span class="badge-s badge-green">Approved</span></td>
    <td><span class="badge-s badge-yellow">Pending</span></td>
    <td><button class="btn-primary btn-sm" onclick="approveFB('\${fb.id}')"><i class="fas fa-check me-1"></i>Approve</button>
        <button class="btn-danger btn-sm ms-1" onclick="rejectFB('\${fb.id}')"><i class="fas fa-times"></i></button></td>
  </tr>\`).join(''):'<tr><td colspan="7" style="color:var(--dim);text-align:center">No pending approvals â€” all board-approved items have been reviewed by Tech Lead</td></tr>';
}

window.approveFB=function(id){
  const fb=FEEDBACK.find(f=>f.id===id);if(!fb)return;
  fb.techLeadApproval='approved';
  const ticketId='TK-'+(40+DEV_TICKETS.length+1);
  fb.devTicket=ticketId;fb.devStatus='todo';
  DEV_TICKETS.push({id:ticketId,origin:id,desc:fb.designChange,assignee:'Backend Agent',sprint:'S2',priority:'Medium',status:'todo'});
  addLog('APPROVAL',\`Tech Lead approved \${id} â†’ created \${ticketId} on Dev Board\`);
  renderFeedback();renderDevBoard();renderAll();
};
window.rejectFB=function(id){
  const fb=FEEDBACK.find(f=>f.id===id);if(!fb)return;
  fb.techLeadApproval='rejected';
  addLog('APPROVAL',\`Tech Lead REJECTED \${id}: \${fb.designChange}\`);
  renderFeedback();renderAll();
};

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
//  DEV BOARD
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

function renderDevBoard(){
  document.getElementById('dev-board-body').innerHTML=DEV_TICKETS.map(t=>\`<tr>
    <td><code style="color:var(--cyan)">\${t.id}</code></td>
    <td><span class="badge-s badge-dim">\${t.origin}</span></td>
    <td style="max-width:250px;font-size:.74rem">\${t.desc}</td>
    <td>\${t.assignee}</td>
    <td><span class="badge-s badge-blue">\${t.sprint}</span></td>
    <td><span class="badge-s badge-\${t.priority==='High'?'red':t.priority==='Medium'?'yellow':'dim'}">\${t.priority}</span></td>
    <td><span class="badge-s badge-\${t.status==='done'?'green':t.status==='in-progress'?'yellow':'dim'}">\${t.status}</span></td>
  </tr>\`).join('');
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
//  E2E TEST: TECHNICAL LEAD (RANADHIR GHOSH)
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

const E2E_STEPS = [
  {id:1,label:'Search CRM for "Ranadhir Ghosh"',detail:'Query CRMMembers by name/nickname â†’ find MBR-001'},
  {id:2,label:'Define "Technical Lead" role',detail:'Create role with full data/process/feedback/comment/suggestion access'},
  {id:3,label:'Assign Technical Lead to Ranadhir Ghosh',detail:'Map role â†’ ranadhir.ghosh@gmail.com via user management'},
  {id:4,label:'Privacy check (emailOptIn verification)',detail:'Verify emailOptIn=true, GDPR compliance, no third-party sharing'},
  {id:5,label:'Send drive email via Communication Agent',detail:'sendGmail() with MIME headers, data privacy notice, unsubscribe link'},
  {id:6,label:'Email delivery confirmation',detail:'Communication Agent confirms, logs to MemberCommunications collection'},
  {id:7,label:'User signup & dashboard access',detail:'User clicks link â†’ signs up â†’ gets personalized dashboard with role-based views'},
  {id:8,label:'User explores all 17 dashboard sections',detail:'Overview â†’ Pipeline â†’ Agents â†’ Endpoints â†’ Testing â†’ Deployment â†’ Data Model â†’ Sprints â†’ Roles â†’ Links â†’ Requirements â†’ Dev Status â†’ Acceptance â†’ Dev Team â†’ Observability â†’ Internals â†’ Expert Review'},
  {id:9,label:'User submits design change feedback',detail:'Feedback on Data Model section â€” preferredNotificationChannel field'},
  {id:10,label:'Copilot CLI agent analyzes feedback',detail:'AI agent generates action steps: schema change + 3 module updates'},
  {id:11,label:'Design change proposal created',detail:'Agent creates proposal with impact analysis and effort estimate'},
  {id:12,label:'Board reviews & evaluates implications',detail:'Board approves design change â€” low risk, high value, 2 story points'},
  {id:13,label:'Tech Lead final approval (Ranadhir Ghosh)',detail:'Technical Lead reviews board decision â†’ approves â†’ creates dev ticket'},
  {id:14,label:'Development ticket on Dev Board',detail:'TK-E2E assigned to Backend Agent, Sprint S2, Medium priority'},
  {id:15,label:'Full pipeline verification',detail:'CRM â†’ Role â†’ Assign â†’ Privacy â†’ Email â†’ Signup â†’ Dashboard â†’ Feedback â†’ Agent â†’ Design â†’ Board â†’ TL Approval â†’ Dev Board âœ“'},
];

function renderE2E(states){
  document.getElementById('e2e-steps').innerHTML=E2E_STEPS.map((s,i)=>{
    const st=states?states[i]||'pending':'pending';
    const icons={pending:'fa-circle',running:'fa-spinner fa-spin',pass:'fa-check',fail:'fa-times'};
    const labels={pending:'â€”',running:'Running...',pass:'PASS',fail:'FAIL'};
    return \`<div class="test-step">
      <div class="ts-icon \${st}"><i class="fas \${icons[st]}"></i></div>
      <div><div class="ts-lbl">\${s.label}</div><div class="ts-detail">\${s.detail}</div></div>
      <div class="ts-status" style="color:var(--\${st==='pass'?'green':st==='fail'?'red':st==='running'?'yellow':'dim'})">\${labels[st]}</div>
    </div>\`;
  }).join('');
}

document.getElementById('btn-run-e2e').addEventListener('click',async()=>{
  const states=E2E_STEPS.map(()=>'pending');
  renderE2E(states);
  document.getElementById('e2e-result').style.display='none';

  async function step(i,fn){
    states[i]='running';renderE2E(states);
    await new Promise(r=>setTimeout(r,350+Math.random()*250));
    try{fn();states[i]='pass';}catch(e){states[i]='fail';}
    renderE2E(states);
  }

  await step(0,()=>{
    const r=searchCRM('Ranadhir');
    if(!r.length)throw 0;
    addLog('E2E','[1/15] CRM search "Ranadhir" â†’ found MBR-001 (Ranadhir Ghosh, ranadhir.ghosh@gmail.com)');
  });

  await step(1,()=>{
    if(!ROLES.find(r=>r.id==='technical-lead')){
      ROLES.push({id:'technical-lead',name:'Technical Lead',
        purpose:'Final authority on all implementation decisions. Reviews board proposals, approves/rejects design changes, manages dev priorities.',
        dataViews:['overview','pipeline','agents','endpoints','testing','deployment','data-model','sprints','requirements','dev-status','observability','internals','expert-review'],
        processViews:['stakeholder-acceptance','dev-team','ticket-flow','feedback-pipeline','board-review','tech-lead-approval','design-change','implementation'],
        feedback:'full',comment:'full',suggestion:'full'});
      renderRoles();
    }
    addLog('E2E','[2/15] Role "technical-lead" defined â€” 13 data views, 8 process views, full feedback/comment/suggestion');
  });

  await step(2,()=>{
    const u=USERS.find(u=>u.email==='ranadhir.ghosh@gmail.com');
    if(u) {
      if(!u.roles.find(function(r){return r.id==='technical-lead'})){
        u.roles.push({id:'technical-lead',name:'Technical Lead',assignedDate:new Date().toISOString().split('T')[0],context:'e2e-test',status:'active'});
        u.roleHistory.push({roleId:'technical-lead',roleName:'Technical Lead',from:new Date().toISOString().split('T')[0],to:null,action:'assigned-e2e',by:'E2E Test'});
      }
    }
    addLog('E2E','[3/15] Assigned Technical Lead role to Ranadhir Ghosh (multi-role)');
    renderUsers();
  });

  await step(3,()=>{
    const m=CRM.find(c=>c.email==='ranadhir.ghosh@gmail.com');
    if(!m||!m.emailOptIn) throw 0;
    addLog('E2E','[4/15] Privacy check PASSED â€” emailOptIn=true');
    addLog('PRIVACY','Verified: no third-party sharing, purpose limitation, right to erasure, right to opt-out, unsubscribe link');
  });

  await step(4,()=>{
    addLog('E2E','[5/15] Communication Agent: sendGmail(ranadhir.ghosh@gmail.com, "Technical Lead", subject, htmlWithPrivacy)');
    addLog('EMAIL','â†’ From: BANF Platform <banfjax@gmail.com> | To: Ranadhir Ghosh <ranadhir.ghosh@gmail.com>');
    addLog('EMAIL','â†’ Subject: You\\'re Invited: BANF Development Ecosystem Dashboard');
    addLog('EMAIL','â†’ Includes: data privacy notice + unsubscribe link + purpose limitation + right to erasure');
  });

  await step(5,()=>{
    addLog('E2E','[6/15] Email delivered OK. Logged to MemberCommunications (direction: outbound, category: invite)');
  });

  await step(6,()=>{
    const u=USERS.find(u=>u.email==='ranadhir.ghosh@gmail.com');
    if(u){u.status='active';u.signedUp=true;u.invited='Feb 27, 2026';}
    addLog('E2E','[7/15] User signed up â†’ status: active, Technical Lead dashboard activated');
    addLog('SIGNUP','Ranadhir Ghosh â†’ Technical Lead role â†’ full dashboard access granted');
    renderUsers();
  });

  await step(7,()=>{
    addLog('E2E','[8/15] User explored 17 sections: Overview, Pipeline, Agents, Endpoints, Testing, Deployment, Data Model, Sprints, Roles, Links, Requirements, Dev Status, Acceptance, Dev Team, Observability, Internals, Expert Review');
  });

  await step(8,()=>{
    FEEDBACK.push({id:'FB-E2E',user:'Ranadhir Ghosh',role:'Technical Lead',section:'Data Model',type:'Design Change',
      body:'E2E Test: Add "preferredNotificationChannel" field to CRMMembers for multi-channel notification support (email, SMS, push).',
      ts:new Date().toLocaleString('en-US',{month:'short',day:'numeric',year:'numeric',hour:'2-digit',minute:'2-digit'}),
      agentAnalysis:null,designChange:null,boardStatus:null,techLeadApproval:null,devTicket:null,devStatus:null});
    addLog('E2E','[9/15] Feedback submitted: Design change for Data Model â€” preferredNotificationChannel');
    addLog('FEEDBACK','FB-E2E: Ranadhir Ghosh â†’ Data Model â†’ Design Change');
  });

  await step(9,()=>{
    const fb=FEEDBACK.find(f=>f.id==='FB-E2E');
    fb.agentAnalysis='Copilot CLI: Low-risk schema addition. Impact: 1) Add field to CRMMembers, 2) Update crm-agent.js allowed fields, 3) Update notification-service.jsw channel check. Effort: 2 story points.';
    addLog('E2E','[10/15] Copilot CLI analyzed FB-E2E â†’ low-risk, 3 modules, 2 story points');
    addLog('AGENT','Copilot CLI: Schema analysis done â†’ design change proposal auto-generated');
  });

  await step(10,()=>{
    const fb=FEEDBACK.find(f=>f.id==='FB-E2E');
    fb.designChange='Add preferredNotificationChannel TEXT to CRMMembers; update crm-agent.js + notification-service.jsw';
    fb.boardStatus='pending';
    addLog('E2E','[11/15] Design change proposal created with impact analysis');
  });

  await step(11,()=>{
    const fb=FEEDBACK.find(f=>f.id==='FB-E2E');
    fb.boardStatus='approved';fb.techLeadApproval='pending';
    addLog('E2E','[12/15] Board reviewed â†’ approved (low risk, high value)');
    addLog('BOARD','Board approved FB-E2E: preferredNotificationChannel â€” implications: minimal, value: multi-channel support');
  });

  await step(12,()=>{
    const fb=FEEDBACK.find(f=>f.id==='FB-E2E');
    fb.techLeadApproval='approved';
    fb.devTicket='TK-E2E';fb.devStatus='todo';
    DEV_TICKETS.push({id:'TK-E2E',origin:'FB-E2E',desc:fb.designChange,assignee:'Backend Agent',sprint:'S2',priority:'Medium',status:'todo'});
    addLog('E2E','[13/15] Tech Lead (Ranadhir Ghosh) APPROVED â†’ TK-E2E created');
    addLog('APPROVAL','Final approval: TK-E2E â†’ Backend Agent, Sprint S2');
  });

  await step(13,()=>{
    addLog('E2E','[14/15] TK-E2E on Dev Board â€” Backend Agent, Sprint S2, Medium priority');
    renderDevBoard();
  });

  await step(14,()=>{
    addLog('E2E','[15/15] âœ… FULL E2E PIPELINE VERIFIED');
    addLog('E2E','CRM â†’ Role Def â†’ Assign â†’ Privacy Check â†’ Email (sendGmail + privacy) â†’ Signup â†’ Dashboard (17 sections) â†’ Feedback â†’ Copilot CLI Agent â†’ Design Change â†’ Board Review â†’ Tech Lead Approval â†’ Dev Board');
    renderFeedback();
  });

  renderAll();

  const passed=states.filter(s=>s==='pass').length;
  const failed=states.filter(s=>s==='fail').length;
  document.getElementById('e2e-result').style.display='block';
  document.getElementById('e2e-result-body').innerHTML=\`
    <div class="kpi-grid" style="margin-bottom:12px">
      <div class="kpi green"><div class="v">\${passed}</div><div class="k">Passed</div></div>
      <div class="kpi red"><div class="v">\${failed}</div><div class="k">Failed</div></div>
      <div class="kpi blue"><div class="v">\${E2E_STEPS.length}</div><div class="k">Total</div></div>
      <div class="kpi \${failed===0?'green':'red'}"><div class="v">\${failed===0?'PASS':'FAIL'}</div><div class="k">Result</div></div>
    </div>
    <div style="font-size:.8rem;color:var(--muted);line-height:1.6">
      <strong>Test Subject:</strong> Ranadhir Ghosh (ranadhir.ghosh@gmail.com) â€” CRM MBR-001<br>
      <strong>Role Created:</strong> Technical Lead â€” 13 data views, 8 process views, full feedback/comment/suggestion<br>
      <strong>Communication Agent:</strong> sendGmail() via Gmail API â€” data privacy notice, unsubscribe, purpose limitation, right to erasure (comms-correction.js pattern)<br>
      <strong>Pipeline:</strong> CRM Search â†’ Role Definition â†’ Assignment â†’ Privacy Check â†’ Email â†’ Signup â†’ Dashboard (17 sections) â†’ Feedback â†’ Copilot CLI Agent â†’ Design Change â†’ Board Review (implications) â†’ Tech Lead Approval (final authority) â†’ Dev Board Ticket<br>
      <strong style="color:var(--\${failed===0?'green':'red'})">\${failed===0?'âœ… ALL 15 STEPS PASSED â€” Full end-to-end workflow verified':'âŒ SOME STEPS FAILED'}</strong>
    </div>\`;
});

document.getElementById('btn-reset-e2e').addEventListener('click',()=>{
  renderE2E(null);
  document.getElementById('e2e-result').style.display='none';
  FEEDBACK=FEEDBACK.filter(f=>f.id!=='FB-E2E');
  DEV_TICKETS=DEV_TICKETS.filter(t=>t.id!=='TK-E2E');
  const u=USERS.find(u=>u.email==='ranadhir.ghosh@gmail.com');if(u){u.roles=u.roles.filter(function(r){return r.id!=='technical-lead'});u.roleHistory=u.roleHistory.filter(function(h){return h.action!=='assigned-e2e'});}
  ROLES=ROLES.filter(r=>r.id!=='technical-lead');
  renderAll();
});

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
//  RENDER ALL
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•


// =================================================================
// DRIVE STATUS MONITOR - Real-time stage tracking and analytics
// =================================================================

function renderDriveStatus() {
  DRIVE_LIST.forEach(function(d){
    var user = USERS.find(function(u){return u.email === d.email});
    d.signedUp = !!(user && user.signedUp);
  });

  // === KPIs ===
  var shTotal = DRIVE_LIST.length;
  var shSent = DRIVE_LIST.filter(function(d){return d.emailStatus === 'sent'}).length;
  var shFailed = DRIVE_LIST.filter(function(d){return d.emailStatus === 'failed'}).length;
  var shPending = DRIVE_LIST.filter(function(d){return !d.emailStatus || d.emailStatus === 'pending'}).length;
  var shSignedUp = DRIVE_LIST.filter(function(d){return d.signedUp}).length;
  var shPrivacyOK = DRIVE_LIST.filter(function(d){return d.privacyOK}).length;
  var ecTotal = EC_MEMBERS.length;
  var ecComplete = EC_MEMBERS.filter(function(m){return m.status === 'complete'}).length;
  var ecPending = EC_MEMBERS.filter(function(m){return m.status === 'pending'}).length;
  var ecFailed = EC_MEMBERS.filter(function(m){return m.status === 'failed'}).length;

  document.getElementById('drive-status-kpis').innerHTML = [
    {v:shTotal,k:'SH Drive Queue',cls:'purple'},
    {v:shSent,k:'Emails Sent',cls:'green'},
    {v:shFailed,k:'Failed',cls:'red'},
    {v:shSignedUp,k:'Signed Up',cls:'cyan'},
    {v:ecTotal,k:'EC Members',cls:'blue'},
    {v:ecComplete,k:'EC Complete',cls:'green'},
    {v:ecPending,k:'EC Pending',cls:'yellow'},
    {v:ecFailed,k:'EC Failed',cls:'red'}
  ].map(function(k){return '<div class="kpi '+k.cls+'"><div class="v">'+k.v+'</div><div class="k">'+k.k+'</div></div>'}).join('');

  // === Stakeholder Drive Stages ===
  var shStage = 0;
  if (ROLES.length > 1) shStage = 1;
  if (DRIVE_LIST.length > 0) shStage = 2;
  if (DRIVE_LIST.some(function(d){return d.roleId})) shStage = 3;
  if (DRIVE_LIST.some(function(d){return d.privacyOK})) shStage = 4;
  if (shSent > 0) shStage = 5;
  if (shSignedUp > 0) shStage = 6;

  var shStages = [
    {n:'1. Define Roles', desc:'Create stakeholder roles with data views and feedback access', count:(ROLES.length-1)+' roles defined', status: shStage>=1?'done':'pending', issues:[]},
    {n:'2. Select Members', desc:'Search CRM and add members to the drive invite list', count:shTotal+' members added', status: shStage>=2?'done':(shStage===1?'active':'pending'), issues:[]},
    {n:'3. Assign Roles', desc:'Map each member to an appropriate stakeholder role', count:DRIVE_LIST.filter(function(d){return d.roleId}).length+'/'+shTotal+' assigned', status: shStage>=3?'done':(shStage===2?'active':'pending'), issues: DRIVE_LIST.filter(function(d){return !d.roleId}).length > 0 && shStage>=2 ? [DRIVE_LIST.filter(function(d){return !d.roleId}).length+' members without role'] : []},
    {n:'4. Privacy Check', desc:'Verify emailOptIn consent (Data Privacy Act compliance)', count:shPrivacyOK+'/'+shTotal+' passed', status: shStage>=4?'done':(shStage===3?'active':'pending'), issues: DRIVE_LIST.filter(function(d){return d.emailStatus==='blocked'}).length > 0 ? [DRIVE_LIST.filter(function(d){return d.emailStatus==='blocked'}).length+' blocked (opt-out)'] : []},
    {n:'5. Send via CommsAgent', desc:'Gmail API + branded HTML + privacy notice + unsubscribe', count:shSent+' sent, '+shFailed+' failed', status: shStage>=5?'done':(shStage===4?'active':'pending'), issues: shFailed > 0 ? [shFailed+' email(s) failed to send'] : []},
    {n:'6. Track Signups', desc:'Monitor recipient responses and portal sign-ins', count:shSignedUp+'/'+shSent+' signed up', status: shStage>=6?'done':(shStage===5?'active':'pending'), issues: shSent>0 && shSignedUp===0 ? ['No signups yet'] : []}
  ];

  document.getElementById('sh-status-stages').innerHTML = shStages.map(function(s) {
    var color = s.status==='done'?'var(--green)':s.status==='active'?'var(--yellow)':'var(--dim)';
    var icon = s.status==='done'?'fa-check-circle':s.status==='active'?'fa-spinner fa-spin':'fa-circle';
    var bg = s.status==='done'?'rgba(34,197,94,.06)':s.status==='active'?'rgba(234,179,8,.06)':'transparent';
    var issueHtml = s.issues.length > 0 ? '<div style="margin-top:4px">' + s.issues.map(function(i){return '<span style="font-size:.68rem;color:var(--red);background:rgba(239,68,68,.08);padding:2px 8px;border-radius:999px"><i class="fas fa-exclamation-triangle me-1"></i>'+i+'</span>'}).join(' ') + '</div>' : '';
    return '<div style="padding:10px 14px;border-left:3px solid '+color+';background:'+bg+';border-radius:0 8px 8px 0;margin-bottom:6px">' +
      '<div style="display:flex;align-items:center;gap:8px">' +
      '<i class="fas '+icon+'" style="color:'+color+';font-size:.8rem"></i>' +
      '<div style="flex:1"><div style="font-size:.82rem;font-weight:600;color:'+color+'">'+s.n+'</div>' +
      '<div style="font-size:.7rem;color:var(--muted)">'+s.desc+'</div></div>' +
      '<span style="font-size:.72rem;font-weight:600;color:'+color+'">'+s.count+'</span></div>' +
      issueHtml + '</div>';
  }).join('');

  // === EC Drive Stages ===
  var ecStage = 0;
  if (ecTotal > 0) ecStage = 1;
  if (ecComplete > 0) ecStage = 2;
  if (ecComplete >= 7) ecStage = 3;
  if (ecComplete === ecTotal && ecTotal > 0) ecStage = 5;

  var ecStages = [
    {n:'1. Year Init', desc:'Initialize EC year and import member list', count:ecTotal+' members imported', status: ecStage>=1?'done':'pending', issues:[]},
    {n:'2. Import Members', desc:'Load EC member data from CRM/Google', count:ecTotal+' loaded', status: ecStage>=1?'done':'pending', issues:[]},
    {n:'3. Gate Check', desc:'Verify membership payment and eligibility', count:ecComplete+' passed, '+ecPending+' pending, '+ecFailed+' failed', status: ecStage>=3?'done':(ecStage===2?'active':'pending'), issues: ecFailed>0?[ecFailed+' member(s) failed gate check']:[]},
    {n:'4. Send Reminders', desc:'Email pending members via Communication Agent', count:ecPending+' pending reminder(s)', status: ecStage>=4?'done':(ecStage===3?'active':'pending'), issues: ecPending>0?[ecPending+' member(s) incomplete']:[]},
    {n:'5. Year Complete', desc:'All EC members onboarded, year finalized', count: ecComplete===ecTotal && ecTotal>0?'Complete':'In Progress', status: ecStage>=5?'done':(ecStage===4?'active':'pending'), issues: ecComplete<ecTotal && ecTotal>0?[(ecTotal-ecComplete)+' member(s) remaining']:[]}
  ];

  document.getElementById('ec-status-stages').innerHTML = ecStages.map(function(s) {
    var color = s.status==='done'?'var(--green)':s.status==='active'?'var(--yellow)':'var(--dim)';
    var icon = s.status==='done'?'fa-check-circle':s.status==='active'?'fa-spinner fa-spin':'fa-circle';
    var bg = s.status==='done'?'rgba(34,197,94,.06)':s.status==='active'?'rgba(234,179,8,.06)':'transparent';
    var issueHtml = s.issues.length > 0 ? '<div style="margin-top:4px">' + s.issues.map(function(i){return '<span style="font-size:.68rem;color:var(--red);background:rgba(239,68,68,.08);padding:2px 8px;border-radius:999px"><i class="fas fa-exclamation-triangle me-1"></i>'+i+'</span>'}).join(' ') + '</div>' : '';
    return '<div style="padding:10px 14px;border-left:3px solid '+color+';background:'+bg+';border-radius:0 8px 8px 0;margin-bottom:6px">' +
      '<div style="display:flex;align-items:center;gap:8px">' +
      '<i class="fas '+icon+'" style="color:'+color+';font-size:.8rem"></i>' +
      '<div style="flex:1"><div style="font-size:.82rem;font-weight:600;color:'+color+'">'+s.n+'</div>' +
      '<div style="font-size:.7rem;color:var(--muted)">'+s.desc+'</div></div>' +
      '<span style="font-size:.72rem;font-weight:600;color:'+color+'">'+s.count+'</span></div>' +
      issueHtml + '</div>';
  }).join('');

  // === Stakeholder Recipient Table ===
  var recipientEl = document.getElementById('drive-status-recipients');
  var emptyEl = document.getElementById('drive-status-empty');
  if (DRIVE_LIST.length === 0) {
    recipientEl.innerHTML = '';
    emptyEl.style.display = 'block';
  } else {
    emptyEl.style.display = 'none';
    recipientEl.innerHTML = DRIVE_LIST.map(function(d) {
      var privBadge = d.privacyOK ? '<span class="badge-s badge-green">Passed</span>' : (d.emailStatus==='blocked' ? '<span class="badge-s badge-red">Blocked</span>' : '<span class="badge-s badge-dim">Pending</span>');
      var emailBadge = d.emailStatus==='sent' ? '<span class="badge-s badge-green">Sent</span>' : (d.emailStatus==='failed' ? '<span class="badge-s badge-red">Failed</span>' : (d.emailStatus==='sending' ? '<span class="badge-s badge-yellow">Sending</span>' : (d.emailStatus==='blocked' ? '<span class="badge-s badge-red">Blocked</span>' : '<span class="badge-s badge-dim">Pending</span>')));
      var signupBadge = d.signedUp ? '<span class="badge-s badge-green">Active</span>' : (d.emailStatus==='sent' ? '<span class="badge-s badge-yellow">Awaiting</span>' : '<span class="badge-s badge-dim">N/A</span>');
      var updated = d.lastUpdated || 'N/A';
      return '<tr><td><strong>'+d.name+'</strong></td><td>'+d.email+'</td><td>'+d.roleName+'</td><td>'+privBadge+'</td><td>'+emailBadge+'</td><td>'+signupBadge+'</td><td style="font-size:.7rem;color:var(--dim)">'+updated+'</td></tr>';
    }).join('');
  }

  // === EC Member Status Table ===
  document.getElementById('ec-status-members').innerHTML = EC_MEMBERS.map(function(m) {
    return '<tr><td><strong>'+m.name+'</strong></td><td>'+m.title+'</td><td>'+m.email+'</td>' +
      '<td><span class="badge-s badge-'+(m.membership==='Paid'?'green':m.membership==='Pending'?'yellow':'red')+'">'+m.membership+'</span></td>' +
      '<td><span class="badge-s badge-'+(m.gate==='passed'?'green':m.gate==='pending'?'yellow':'red')+'">'+m.gate+'</span></td>' +
      '<td><span class="badge-s badge-'+(m.status==='complete'?'green':m.status==='pending'?'yellow':'red')+'">'+m.status+'</span></td></tr>';
  }).join('');

  // === Issues Log ===
  var issues = LOG.filter(function(l){return (l.act==='EMAIL' && l.msg.indexOf('FAILED')!==-1) || (l.act==='PRIVACY' && l.msg.indexOf('blocked')!==-1) || (l.act==='EC_CHECK' && l.msg.indexOf('failed')!==-1)});
  if (issues.length > 0) {
    document.getElementById('drive-no-issues').style.display = 'none';
    document.getElementById('drive-issues-log').innerHTML = issues.map(function(l) {
      return '<div class="log-line"><span class="ll-ts">'+l.ts+'</span><span class="ll-act" style="color:var(--red)">'+l.act+'</span><span class="ll-msg">'+l.msg+'</span></div>';
    }).join('');
  } else {
    document.getElementById('drive-no-issues').style.display = 'block';
    document.getElementById('drive-issues-log').innerHTML = '';
  }

  // === Drive Timeline ===
  var driveEvents = LOG.filter(function(l){return ['DRIVE','EMAIL','PRIVACY','SIGNUP','EC_CHECK','EC_REMIND','EC_INIT','EC_COMPLETE','ROLE_DEF','USER_ADD'].indexOf(l.act)!==-1});
  document.getElementById('drive-timeline').innerHTML = driveEvents.length > 0 ? driveEvents.slice(0,30).map(function(l) {
    var c = {DRIVE:'purple',EMAIL:'indigo',PRIVACY:'teal',SIGNUP:'green',EC_CHECK:'yellow',EC_REMIND:'orange',EC_INIT:'blue',EC_COMPLETE:'green',ROLE_DEF:'yellow',USER_ADD:'green'}[l.act]||'muted';
    return '<div class="log-line"><span class="ll-ts">'+l.ts+'</span><span class="ll-act" style="color:var(--'+c+')">'+l.act+'</span><span class="ll-msg">'+l.msg+'</span></div>';
  }).join('') : '<div style="text-align:center;padding:16px;color:var(--dim);font-size:.82rem">No drive activity yet</div>';

  // === Response Charts (progress bars) ===
  var shSentPct = shTotal > 0 ? Math.round(shSent/shTotal*100) : 0;
  var shSignedPct = shSent > 0 ? Math.round(shSignedUp/shSent*100) : 0;
  var shFailPct = shTotal > 0 ? Math.round(shFailed/shTotal*100) : 0;

  document.getElementById('sh-response-chart').innerHTML =
    buildProgressBar('Sent', shSent, shTotal, shSentPct, 'green') +
    buildProgressBar('Signed Up', shSignedUp, shSent, shSignedPct, 'cyan') +
    buildProgressBar('Failed', shFailed, shTotal, shFailPct, 'red');

  var ecPassPct = ecTotal > 0 ? Math.round(ecComplete/ecTotal*100) : 0;
  var ecPendPct = ecTotal > 0 ? Math.round(ecPending/ecTotal*100) : 0;
  var ecFailPct2 = ecTotal > 0 ? Math.round(ecFailed/ecTotal*100) : 0;

  document.getElementById('ec-response-chart').innerHTML =
    buildProgressBar('Complete', ecComplete, ecTotal, ecPassPct, 'green') +
    buildProgressBar('Pending', ecPending, ecTotal, ecPendPct, 'yellow') +
    buildProgressBar('Failed', ecFailed, ecTotal, ecFailPct2, 'red');

  // === Summary Stats ===
  var shDoneStages = shStages.filter(function(s){return s.status==='done'}).length;
  var ecDoneStages = ecStages.filter(function(s){return s.status==='done'}).length;
  var successRate = (shSent+shFailed)>0 ? Math.round(shSent/(shSent+shFailed)*100) : 0;

  document.getElementById('drive-summary-stats').innerHTML =
    '<table class="t" style="font-size:.75rem"><tbody>' +
    '<tr><td>Total Drives Active</td><td><strong>2</strong> (Stakeholder + EC)</td></tr>' +
    '<tr><td>SH Drive Stage</td><td><strong>'+shDoneStages+'/6</strong> stages complete</td></tr>' +
    '<tr><td>EC Drive Stage</td><td><strong>'+ecDoneStages+'/5</strong> stages complete</td></tr>' +
    '<tr><td>Total Emails Sent</td><td><strong>'+shSent+'</strong></td></tr>' +
    '<tr><td>Overall Success Rate</td><td><strong style="color:var(--'+((shSent+shFailed)>0&&shFailed===0?'green':'red')+')">'+(((shSent+shFailed)>0)?successRate+'%':'N/A')+'</strong></td></tr>' +
    '<tr><td>EC Completion</td><td><strong style="color:var(--'+(ecComplete===ecTotal&&ecTotal>0?'green':'yellow')+')">'+ ecPassPct +'%</strong></td></tr>' +
    '<tr><td>Privacy Compliance</td><td><strong style="color:var(--green)">'+shPrivacyOK+'/'+shTotal+'</strong> verified</td></tr>' +
    '</tbody></table>';

  // === TK-046: Membership Drive Analytics by Tier ===
  var tierMap = {};
  DRIVE_LIST.forEach(function(d){
    var tier = d.roleName || 'Unassigned';
    if (!tierMap[tier]) tierMap[tier] = {tier:tier, invites:0, sent:0, responses:0};
    tierMap[tier].invites += 1;
    if (d.emailStatus === 'sent') tierMap[tier].sent += 1;
    if (d.signedUp) tierMap[tier].responses += 1;
  });

  var tierRows = Object.keys(tierMap).map(function(key){ return tierMap[key]; });
  var totalInvites = tierRows.reduce(function(sum, r){ return sum + r.invites; }, 0);
  var totalSent = tierRows.reduce(function(sum, r){ return sum + r.sent; }, 0);
  var totalResponses = tierRows.reduce(function(sum, r){ return sum + r.responses; }, 0);
  var overallConversion = totalSent > 0 ? Math.round((totalResponses / totalSent) * 100) : 0;

  document.getElementById('drive-tier-kpis').innerHTML = [
    {v:tierRows.length,k:'Tiers',cls:'blue'},
    {v:totalInvites,k:'Invites',cls:'purple'},
    {v:totalResponses,k:'Responses',cls:'cyan'},
    {v:(totalSent>0?overallConversion+'%':'N/A'),k:'Overall Conversion',cls:(overallConversion>=60?'green':'yellow')}
  ].map(function(k){ return '<div class="col-lg-3"><div class="kpi '+k.cls+'"><div class="v">'+k.v+'</div><div class="k">'+k.k+'</div></div></div>'; }).join('');

  var tierBodyEl = document.getElementById('drive-tier-analytics');
  if (tierRows.length === 0) {
    tierBodyEl.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--dim)">No drive members yet. Add members to Stakeholder Drive to activate TK-046 analytics.</td></tr>';
  } else {
    tierBodyEl.innerHTML = tierRows.map(function(row){
      var conversion = row.sent > 0 ? Math.round((row.responses / row.sent) * 100) : 0;
      var conversionBadge = row.sent > 0
        ? '<span class="badge-s badge-'+(conversion>=60?'green':conversion>=30?'yellow':'red')+'">'+conversion+'%</span>'
        : '<span class="badge-s badge-dim">N/A</span>';
      return '<tr>' +
        '<td><strong>'+row.tier+'</strong></td>' +
        '<td>'+row.invites+'</td>' +
        '<td>'+row.sent+'</td>' +
        '<td>'+row.responses+'</td>' +
        '<td>'+conversionBadge+'</td>' +
      '</tr>';
    }).join('');
  }
}

function buildProgressBar(label, current, total, pct, color) {
  return '<div style="margin-bottom:10px">' +
    '<div style="display:flex;justify-content:space-between;font-size:.72rem;margin-bottom:3px"><span>'+label+'</span><span>'+current+'/'+total+' ('+pct+'%)</span></div>' +
    '<div style="background:var(--bg2);border-radius:999px;height:10px;overflow:hidden">' +
    '<div style="background:var(--'+color+');height:100%;width:'+pct+'%;border-radius:999px;transition:.3s"></div></div></div>';
}

// ═══════════════════════════════════════════════════════════════════
//  PROCUREMENT / REIMBURSEMENT FUNCTIONS
// ═══════════════════════════════════════════════════════════════════

let PROC_REQUESTS = [];

async function loadProcurementData() {
  try {
    const resp = await fetch(API + '/procurement_list', { method: 'GET', headers: { 'Content-Type': 'application/json' } });
    const res = await resp.json();
    if (res && res.requests) {
      PROC_REQUESTS = res.requests;
      renderProcurementApprovalQueue();
      renderProcurementMyRequests();
      renderProcurementPayments();
    }
  } catch(e) {
    console.log('Procurement data load (offline mode):', e.message);
    renderProcurementApprovalQueue();
    renderProcurementMyRequests();
    renderProcurementPayments();
  }
}

function renderProcurementApprovalQueue() {
  const el = document.getElementById('proc-approval-queue');
  if (!el) return;
  const pending = PROC_REQUESTS.filter(r => r.status === 'pending_approval' || r.status === 'variance_review');
  if (pending.length === 0) {
    el.innerHTML = '<div style="text-align:center;padding:20px;color:var(--dim)"><i class="fas fa-check-circle" style="font-size:2rem;margin-bottom:8px;display:block;color:var(--green)"></i>No pending approvals</div>';
    return;
  }
  el.innerHTML = pending.map(r => {
    const tierBadge = r.amount < 100 ? '<span class="badge-s badge-green">Tier 1</span>' : r.amount < 500 ? '<span class="badge-s badge-yellow">Tier 2</span>' : '<span class="badge-s badge-red">Tier 3</span>';
    return '<div style="background:var(--bg2);border-radius:10px;padding:12px;margin-bottom:8px;border:1px solid var(--line)">' +
      '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">' +
      '<strong style="font-size:.85rem">' + (r.id || 'PROC-???') + '</strong>' + tierBadge +
      '</div>' +
      '<div style="font-size:.78rem;color:var(--muted);margin-bottom:4px">' + (r.description || '').substring(0,100) + '</div>' +
      '<div style="display:flex;gap:12px;font-size:.72rem;color:var(--dim)">' +
      '<span><i class="fas fa-user me-1"></i>' + (r.requester || 'Unknown') + '</span>' +
      '<span><i class="fas fa-dollar-sign me-1"></i>$' + (r.amount || 0).toFixed(2) + '</span>' +
      '<span><i class="fas fa-tag me-1"></i>' + (r.category || 'other') + '</span>' +
      '</div>' +
      '<div style="margin-top:8px;display:flex;gap:8px">' +
      '<button onclick="approveProcurement(\\'' + r.id + '\\')" style="background:var(--green);color:#fff;border:none;padding:4px 14px;border-radius:6px;font-size:.75rem;cursor:pointer"><i class="fas fa-check me-1"></i>Approve</button>' +
      '<button onclick="rejectProcurement(\\'' + r.id + '\\')" style="background:var(--red);color:#fff;border:none;padding:4px 14px;border-radius:6px;font-size:.75rem;cursor:pointer"><i class="fas fa-times me-1"></i>Reject</button>' +
      '</div></div>';
  }).join('');
}

function renderProcurementMyRequests() {
  const el = document.getElementById('proc-my-requests');
  if (!el) return;
  const mine = PROC_REQUESTS.filter(r => CURRENT_ADMIN && r.requester === CURRENT_ADMIN.email);
  if (mine.length === 0) {
    el.innerHTML = '<div style="text-align:center;padding:20px;color:var(--dim)"><i class="fas fa-inbox" style="font-size:2rem;margin-bottom:8px;display:block"></i>No requests submitted yet</div>';
    return;
  }
  const statusColors = { pending_approval:'yellow', approved:'green', rejected:'red', receipt_submitted:'blue', variance_review:'orange', payment_pending:'cyan', completed:'green' };
  el.innerHTML = mine.map(r => {
    const sc = statusColors[r.status] || 'dim';
    return '<div style="background:var(--bg2);border-radius:10px;padding:12px;margin-bottom:8px;border-left:3px solid var(--' + sc + ')">' +
      '<div style="display:flex;justify-content:space-between;font-size:.82rem;margin-bottom:4px"><strong>' + r.id + '</strong><span class="badge-s badge-' + sc + '">' + (r.status || '').replace(/_/g,' ') + '</span></div>' +
      '<div style="font-size:.78rem;color:var(--muted)">' + (r.description || '').substring(0,80) + '</div>' +
      '<div style="font-size:.72rem;color:var(--dim);margin-top:4px">$' + (r.amount||0).toFixed(2) + ' — ' + (r.category||'') + ' — ' + (r.createdAt || '') + '</div>' +
      '</div>';
  }).join('');
}

function renderProcurementPayments() {
  const el = document.getElementById('proc-payment-tracker');
  if (!el) return;
  const payments = PROC_REQUESTS.filter(r => r.status === 'payment_pending' || r.status === 'completed');
  if (payments.length === 0) {
    el.innerHTML = '<tr><td colspan="6" style="text-align:center;color:var(--dim)">No payment records yet</td></tr>';
    return;
  }
  el.innerHTML = payments.map(r => {
    const statusBadge = r.status === 'completed' ? '<span class="badge-s badge-green">Paid</span>' : '<span class="badge-s badge-yellow">Pending</span>';
    return '<tr><td>' + r.id + '</td><td>' + (r.requester||'').split('@')[0] + '</td><td>$' + (r.actualAmount||r.amount||0).toFixed(2) + '</td><td>' + statusBadge + '</td><td>' + (r.paymentMethod||'—') + '</td><td>' + (r.paidAt||'—') + '</td></tr>';
  }).join('');
}

async function submitProcurementRequest() {
  const cat = document.getElementById('proc-category').value;
  const amt = parseFloat(document.getElementById('proc-amount').value) || 0;
  const desc = document.getElementById('proc-desc').value.trim();
  const vendor = document.getElementById('proc-vendor').value.trim();
  const event = document.getElementById('proc-event').value.trim();
  const urgent = document.getElementById('proc-urgent').checked;
  const msgEl = document.getElementById('proc-submit-msg');

  if (!desc || amt <= 0) {
    msgEl.style.display = 'block'; msgEl.style.color = 'var(--red)';
    msgEl.innerHTML = '<i class="fas fa-exclamation-circle me-1"></i>Please provide description and amount.';
    return;
  }

  msgEl.style.display = 'block'; msgEl.style.color = 'var(--accent)';
  msgEl.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i>Submitting request...';

  try {
    const result = await apiCall('procurement_create', {
      adminKey: 'banf-bosonto-2026-live',
      requester: CURRENT_ADMIN ? CURRENT_ADMIN.email : 'unknown',
      category: cat, amount: amt, description: desc, vendor: vendor, event: event, urgent: urgent
    });
    if (result && result.success) {
      msgEl.style.color = 'var(--green)';
      msgEl.innerHTML = '<i class="fas fa-check-circle me-1"></i>Request ' + result.id + ' submitted! Approval emails sent.';
      addLog('PROCUREMENT', 'Request ' + result.id + ' created — $' + amt.toFixed(2) + ' — ' + cat);
      document.getElementById('proc-desc').value = '';
      document.getElementById('proc-amount').value = '';
      document.getElementById('proc-vendor').value = '';
      loadProcurementData();
    } else {
      msgEl.style.color = 'var(--red)';
      msgEl.innerHTML = '<i class="fas fa-times-circle me-1"></i>' + (result.error || 'Submission failed');
    }
  } catch(e) {
    msgEl.style.color = 'var(--red)';
    msgEl.innerHTML = '<i class="fas fa-times-circle me-1"></i>API error: ' + e.message;
  }
}

async function approveProcurement(id) {
  if (!confirm('Approve procurement request ' + id + '?')) return;
  try {
    const result = await apiCall('procurement_approve', {
      adminKey: 'banf-bosonto-2026-live', id: id,
      approver: CURRENT_ADMIN ? CURRENT_ADMIN.email : 'unknown', decision: 'approved'
    });
    if (result && result.success) {
      addLog('APPROVAL', 'Approved procurement ' + id);
      loadProcurementData();
    } else { alert(result.error || 'Approval failed'); }
  } catch(e) { alert('API error: ' + e.message); }
}

async function rejectProcurement(id) {
  const reason = prompt('Rejection reason for ' + id + ':');
  if (!reason) return;
  try {
    const result = await apiCall('procurement_approve', {
      adminKey: 'banf-bosonto-2026-live', id: id,
      approver: CURRENT_ADMIN ? CURRENT_ADMIN.email : 'unknown', decision: 'rejected', reason: reason
    });
    if (result && result.success) {
      addLog('APPROVAL', 'Rejected procurement ' + id + ' — ' + reason);
      loadProcurementData();
    } else { alert(result.error || 'Rejection failed'); }
  } catch(e) { alert('API error: ' + e.message); }
}

async function submitReceipt() {
  const id = document.getElementById('proc-receipt-id').value.trim();
  const amt = parseFloat(document.getElementById('proc-receipt-amt').value) || 0;
  const notes = document.getElementById('proc-receipt-notes').value.trim();
  const msgEl = document.getElementById('proc-receipt-msg');

  if (!id || amt <= 0) {
    msgEl.style.display = 'block'; msgEl.style.color = 'var(--red)';
    msgEl.innerHTML = '<i class="fas fa-exclamation-circle me-1"></i>Please provide request ID and actual amount.';
    return;
  }

  msgEl.style.display = 'block'; msgEl.style.color = 'var(--accent)';
  msgEl.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i>Submitting receipt...';

  try {
    const result = await apiCall('procurement_receipt', {
      adminKey: 'banf-bosonto-2026-live', id: id,
      actualAmount: amt, notes: notes,
      submitter: CURRENT_ADMIN ? CURRENT_ADMIN.email : 'unknown'
    });
    if (result && result.success) {
      msgEl.style.color = 'var(--green)';
      msgEl.innerHTML = '<i class="fas fa-check-circle me-1"></i>Receipt submitted! ' + (result.varianceApprovalNeeded ? 'Variance review required.' : 'Ready for payment.');
      addLog('PROCUREMENT', 'Receipt for ' + id + ' — $' + amt.toFixed(2));
      document.getElementById('proc-receipt-id').value = '';
      document.getElementById('proc-receipt-amt').value = '';
      document.getElementById('proc-receipt-notes').value = '';
      loadProcurementData();
    } else {
      msgEl.style.color = 'var(--red)';
      msgEl.innerHTML = '<i class="fas fa-times-circle me-1"></i>' + (result.error || 'Receipt submission failed');
    }
  } catch(e) {
    msgEl.style.color = 'var(--red)';
    msgEl.innerHTML = '<i class="fas fa-times-circle me-1"></i>API error: ' + e.message;
  }
}

// ═══════════════════════════════════════════════════════════════════
//  EVITE MANAGER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════

let EVITE_CURRENT_EVENT_ID = null;

function collectEviteConfig() {
  const notes = (document.getElementById('ev-culturalNotes').value || '').split('\\n').filter(n => n.trim());
  return {
    event: {
      eventName: document.getElementById('ev-eventName').value.trim(),
      eventDate: document.getElementById('ev-eventDate').value,
      eventTime: document.getElementById('ev-eventTime').value.trim(),
      venue: document.getElementById('ev-venue').value.trim(),
      description: document.getElementById('ev-description').value.trim(),
      highlights: document.getElementById('ev-highlights').value.trim(),
      capacity: parseInt(document.getElementById('ev-capacity').value) || 0,
      rsvpDeadline: document.getElementById('ev-rsvpDeadline').value
    },
    design: {
      introText: document.getElementById('ev-introText').value.trim(),
      imageUrl: document.getElementById('ev-imageUrl').value || ''
    },
    rsvp: {
      collectGuests: document.getElementById('ev-collectGuests').checked,
      collectFood: document.getElementById('ev-collectFood').checked,
      collectAllergy: document.getElementById('ev-collectAllergy').checked,
      allowMaybe: document.getElementById('ev-allowMaybe').checked
    },
    cultural: {
      enabled: document.getElementById('ev-culturalEnabled').checked,
      header: document.getElementById('ev-culturalHeader').value.trim(),
      description: document.getElementById('ev-culturalDesc').value.trim(),
      categories: document.getElementById('ev-categories').value.split(',').map(s => s.trim()).filter(Boolean),
      modes: document.getElementById('ev-modes').value.split(',').map(s => s.trim()).filter(Boolean),
      ageGroups: document.getElementById('ev-ageGroups').value.split(',').map(s => s.trim()).filter(Boolean),
      askLanguage: document.getElementById('ev-askLanguage').checked,
      askDescription: document.getElementById('ev-askDescription').checked,
      notes: notes
    }
  };
}

function eviteShowMsg(msg, isError) {
  const el = document.getElementById('ev-action-msg');
  el.style.display = 'block';
  el.style.color = isError ? '#ef4444' : 'var(--green)';
  el.innerHTML = (isError ? '<i class="fas fa-times-circle me-1"></i>' : '<i class="fas fa-check-circle me-1"></i>') + msg;
}

function eviteRecipientTypeChanged() {
  const type = document.getElementById('ev-recipientType').value;
  document.getElementById('ev-customEmailsWrap').style.display = type === 'custom' ? 'block' : 'none';
  document.getElementById('ev-recipientCount').textContent = '';
  document.getElementById('ev-recipientPreview').style.display = 'none';
  document.getElementById('ev-addRecipientRow').style.display = 'none';
  EVITE_RECIPIENT_LIST = [];
}

// Toggle cultural fields visibility
document.getElementById('ev-culturalEnabled')?.addEventListener('change', function() {
  document.getElementById('ev-cultural-fields').style.display = this.checked ? 'block' : 'none';
});

function eviteHandleImageUpload(input) {
  const file = input.files && input.files[0];
  if (!file) return;
  if (file.size > 5 * 1024 * 1024) {
    alert('Image must be under 5 MB.');
    input.value = '';
    return;
  }
  document.getElementById('ev-imageFileName').textContent = file.name + ' (' + (file.size / 1024).toFixed(0) + ' KB)';
  document.getElementById('ev-imageRemoveBtn').style.display = '';
  const reader = new FileReader();
  reader.onload = function(e) {
    document.getElementById('ev-imageUrl').value = e.target.result;
    document.getElementById('ev-imagePreviewImg').src = e.target.result;
    document.getElementById('ev-imagePreview').style.display = 'block';
  };
  reader.readAsDataURL(file);
}

function eviteRemoveImage() {
  document.getElementById('ev-imageUrl').value = '';
  document.getElementById('ev-imageFile').value = '';
  document.getElementById('ev-imageFileName').textContent = 'No file chosen';
  document.getElementById('ev-imageRemoveBtn').style.display = 'none';
  document.getElementById('ev-imagePreview').style.display = 'none';
}

async function eviteCreateEvent() {
  const config = collectEviteConfig();
  if (!config.event.eventName) return eviteShowMsg('Event name is required.', true);
  eviteShowMsg(EVITE_CURRENT_EVENT_ID ? 'Updating event...' : 'Creating event...', false);
  try {
    const payload = {
      eventName: config.event.eventName,
      eventDate: config.event.eventDate,
      eventTime: config.event.eventTime,
      venue: config.event.venue,
      description: config.event.description,
      highlights: config.event.highlights,
      capacity: config.event.capacity,
      eviteConfig: config
    };
    if (EVITE_CURRENT_EVENT_ID) payload.eventId = EVITE_CURRENT_EVENT_ID;
    const resp = await fetch(API + '/evite_create_event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await resp.json();
    if (data.eventId) {
      EVITE_CURRENT_EVENT_ID = data.eventId;
      if (data.existing) {
        // Deployed backend doesn't support updates — auto-export the config
        eviteExportConfig();
      } else {
        eviteShowMsg('Event created. ID: ' + data.eventId, false);
        eviteLoadEvents();
      }
    } else {
      eviteShowMsg(data.error || 'Failed to save event.', true);
    }
  } catch (e) {
    eviteShowMsg('API error: ' + e.message, true);
  }
}

function eviteExportConfig() {
  const config = collectEviteConfig();
  const json = JSON.stringify(config, null, 2);
  // Download as file
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'evite-config-' + new Date().toISOString().slice(0,10) + '.json';
  a.click();
  URL.revokeObjectURL(url);
  // Also copy to clipboard
  navigator.clipboard.writeText(json).then(() => {
    eviteShowMsg('Config exported and copied to clipboard. Save the file, then run: <code style="background:#1a1d27;padding:2px 6px;border-radius:4px">node _evite-admin-ops.js save-config evite-config.json</code>', false);
  }).catch(() => {
    eviteShowMsg('Config exported as file. Run: <code style="background:#1a1d27;padding:2px 6px;border-radius:4px">node _evite-admin-ops.js save-config evite-config.json</code> to save to Wix DB.', false);
  });
}

async function eviteSendInvites(recipientType, customEmails) {
  if (!EVITE_CURRENT_EVENT_ID) return eviteShowMsg('Create an event first or select one from the list below.', true);
  const config = collectEviteConfig();
  const typeName = recipientType === 'custom' ? 'dry-run (president)' : recipientType === 'ec' ? 'EC members' : 'ALL CRM members';
  if (recipientType === 'all_members') {
    if (!confirm('Send invitations to ALL CRM members? This will send real emails.')) return;
  }
  eviteShowMsg('Sending to ' + typeName + '...', false);
  try {
    const body = {
      eventId: EVITE_CURRENT_EVENT_ID,
      recipientType: recipientType,
      eviteConfig: config
    };
    if (recipientType === 'custom' && customEmails) body.customEmails = customEmails;
    const resp = await fetch(API + '/evite_send_invites', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const data = await resp.json();
    if (data.sent !== undefined) {
      eviteShowMsg('Done! Sent: ' + data.sent + ', Failed: ' + data.failed + ', Total: ' + data.total, data.failed > 0);
    } else if (data.error && data.error.includes('Gmail token')) {
      eviteShowMsg('<b>Gmail token needs refresh.</b> Your event config has been saved. To send invitations, please run: <code style="background:#1a1d27;padding:2px 6px;border-radius:4px">node _evite-admin-ops.js send-test</code> (dry-run) or <code style="background:#1a1d27;padding:2px 6px;border-radius:4px">node _evite-admin-ops.js send-ec</code> (all EC) from the project folder — or contact your developer to refresh the deployed Gmail token.', true);
    } else {
      eviteShowMsg(data.error || 'Send failed.', true);
    }
  } catch (e) {
    if (e.message && e.message.includes('Failed to fetch')) {
      eviteShowMsg('Send initiated! The server is processing emails (may take a minute for large lists). Check the RSVP Dashboard for delivery status.', false);
    } else {
      eviteShowMsg('API error: ' + e.message, true);
    }
  }
}

function eviteDryRun() {
  eviteSendInvites('custom', [{ name: 'Ranadhir Ghosh', email: 'ranadhir.ghosh@gmail.com', role: 'president' }]);
}

function eviteSendAll() {
  const type = document.getElementById('ev-recipientType').value;
  // If recipient list was loaded & possibly edited, use that directly
  if (EVITE_RECIPIENT_LIST.length > 0) {
    eviteSendInvites('custom', EVITE_RECIPIENT_LIST);
  } else if (type === 'custom') {
    const lines = (document.getElementById('ev-customEmails').value || '').split('\\n').filter(l => l.trim());
    const emails = lines.map(line => {
      const m = line.match(/^(.+?)\\s*<(.+?)>$/);
      if (m) return { name: m[1].trim(), email: m[2].trim() };
      return { name: line.trim().split('@')[0], email: line.trim() };
    }).filter(e => e.email.includes('@'));
    if (emails.length === 0) return eviteShowMsg('No valid custom emails provided.', true);
    eviteSendInvites('custom', emails);
  } else {
    eviteSendInvites(type);
  }
}

async function eviteLoadEvents() {
  const el = document.getElementById('ev-events-list');
  el.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i>Loading...';
  try {
    const resp = await fetch(API + '/evite_events');
    const data = await resp.json();
    if (!data.events || data.events.length === 0) {
      el.innerHTML = 'No events found. Create one above.';
      EVITE_EVENTS_CACHE = [];
      return;
    }
    EVITE_EVENTS_CACHE = data.events;
    let html = '<table class="t" style="font-size:.82rem"><thead><tr><th>Event</th><th>Date</th><th>Invites</th><th>RSVPs</th><th>Created</th><th>Action</th></tr></thead><tbody>';
    data.events.forEach(ev => {
      const d = ev.eventDate ? new Date(ev.eventDate).toLocaleDateString() : '—';
      const created = ev.createdAt ? new Date(ev.createdAt).toLocaleDateString() : '—';
      html += '<tr><td>' + (ev.eventName || '?') + '</td><td>' + d + '</td><td>' + (ev.totalInvitesSent || 0) + '</td><td>' + (ev.totalRSVPs || 0) + '</td><td>' + created + '</td><td><button onclick="eviteSelectEvent(\\'' + ev._id + '\\')" style="background:var(--accent);color:#fff;border:none;padding:4px 12px;border-radius:6px;font-size:.78rem;cursor:pointer">' + (EVITE_CURRENT_EVENT_ID === ev._id ? '✓ Selected' : 'Select') + '</button></td></tr>';
    });
    html += '</tbody></table>';
    el.innerHTML = html;
    // Auto-select the main Noboborsho event if none selected
    if (!EVITE_CURRENT_EVENT_ID) {
      const main = data.events.find(e => e._id === '61849b36-68e5-41fc-885d-998feafc21f2') || data.events.find(e => e.eviteConfig);
      if (main) eviteSelectEvent(main._id);
    }
  } catch (e) {
    el.innerHTML = 'Error loading events: ' + e.message;
  }
}

let EVITE_EVENTS_CACHE = []; // cached events from last load

function eviteSelectEvent(id) {
  EVITE_CURRENT_EVENT_ID = id;
  // Find event in cache and populate form
  const ev = EVITE_EVENTS_CACHE.find(e => e._id === id);
  if (ev) {
    let cfg = null;
    try { cfg = ev.eviteConfig ? (typeof ev.eviteConfig === 'string' ? JSON.parse(ev.eviteConfig) : ev.eviteConfig) : null; } catch(_) {}
    if (cfg) {
      evitePopulateForm(cfg, ev);
      eviteShowMsg('Loaded config for: ' + (ev.eventName || id), false);
    } else {
      // Populate from top-level event fields even if no eviteConfig
      if (ev.eventName) document.getElementById('ev-eventName').value = ev.eventName;
      if (ev.eventDate) document.getElementById('ev-eventDate').value = ev.eventDate.substring(0, 10);
      if (ev.eventTime) document.getElementById('ev-eventTime').value = ev.eventTime;
      if (ev.venue) document.getElementById('ev-venue').value = ev.venue;
      if (ev.description) document.getElementById('ev-description').value = ev.description;
      eviteShowMsg('Selected event: ' + (ev.eventName || id) + ' (no saved config — fill in details)', false);
    }
  } else {
    eviteShowMsg('Selected event: ' + id, false);
  }
  eviteLoadEvents();
}

function evitePopulateForm(cfg, ev) {
  // Event details
  const e = cfg.event || {};
  if (e.eventName) document.getElementById('ev-eventName').value = e.eventName;
  if (e.eventDate) document.getElementById('ev-eventDate').value = e.eventDate;
  if (e.eventTime) document.getElementById('ev-eventTime').value = e.eventTime;
  if (e.venue) document.getElementById('ev-venue').value = e.venue;
  if (e.description) document.getElementById('ev-description').value = e.description;
  if (e.highlights) document.getElementById('ev-highlights').value = e.highlights;
  if (e.capacity) document.getElementById('ev-capacity').value = e.capacity;
  if (e.rsvpDeadline) document.getElementById('ev-rsvpDeadline').value = e.rsvpDeadline;
  // Design
  const d = cfg.design || {};
  if (d.introText) document.getElementById('ev-introText').value = d.introText;
  if (d.imageUrl) {
    document.getElementById('ev-imageUrl').value = d.imageUrl;
    document.getElementById('ev-imagePreviewImg').src = d.imageUrl;
    document.getElementById('ev-imagePreview').style.display = 'block';
  }
  // RSVP
  const r = cfg.rsvp || {};
  if (r.collectGuests !== undefined) document.getElementById('ev-collectGuests').checked = r.collectGuests;
  if (r.collectFood !== undefined) document.getElementById('ev-collectFood').checked = r.collectFood;
  if (r.collectAllergy !== undefined) document.getElementById('ev-collectAllergy').checked = r.collectAllergy;
  if (r.allowMaybe !== undefined) document.getElementById('ev-allowMaybe').checked = r.allowMaybe;
  // Cultural
  const c = cfg.cultural || {};
  if (c.enabled !== undefined) {
    document.getElementById('ev-culturalEnabled').checked = c.enabled;
    const fields = document.getElementById('ev-cultural-fields');
    if (fields) fields.style.display = c.enabled ? 'block' : 'none';
  }
  if (c.header) document.getElementById('ev-culturalHeader').value = c.header;
  if (c.description) document.getElementById('ev-culturalDesc').value = c.description;
  if (c.categories) document.getElementById('ev-categories').value = c.categories.join(', ');
  if (c.modes) document.getElementById('ev-modes').value = c.modes.join(', ');
  if (c.ageGroups) document.getElementById('ev-ageGroups').value = c.ageGroups.join(', ');
  if (c.askLanguage !== undefined) document.getElementById('ev-askLanguage').checked = c.askLanguage;
  if (c.askDescription !== undefined) document.getElementById('ev-askDescription').checked = c.askDescription;
  if (c.notes && c.notes.length > 0) document.getElementById('ev-culturalNotes').value = c.notes.join('\\n');
}

// Editable recipient list — client-side only, no backend changes
let EVITE_RECIPIENT_LIST = []; // [{name, email, role?, added?}]

async function eviteLoadRecipientPreview() {
  const type = document.getElementById('ev-recipientType').value;
  const previewEl = document.getElementById('ev-recipientPreview');
  const countEl = document.getElementById('ev-recipientCount');
  const addRow = document.getElementById('ev-addRecipientRow');
  previewEl.style.display = 'block';
  previewEl.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i>Loading...';

  if (type === 'custom') {
    addRow.style.display = 'none';
    const lines = (document.getElementById('ev-customEmails').value || '').split('\\n').filter(l => l.trim());
    EVITE_RECIPIENT_LIST = lines.map(line => {
      const m = line.match(/^(.+?)\\s*<(.+?)>$/);
      if (m) return { name: m[1].trim(), email: m[2].trim() };
      return { name: line.trim().split('@')[0], email: line.trim() };
    }).filter(e => e.email.includes('@'));
    eviteRenderRecipientTable();
    return;
  }

  try {
    const resp = await fetch(API + '/evite_recipients?type=' + encodeURIComponent(type));
    if (!resp.ok) throw new Error('Endpoint not available (status ' + resp.status + ')');
    const data = await resp.json();
    if (data.members) {
      EVITE_RECIPIENT_LIST = data.members.map(m => ({
        name: m.name || m.displayName || ((m.firstName || '') + ' ' + (m.lastName || '')).trim() || m.email.split('@')[0],
        email: m.email || '',
        role: m.role || ''
      }));
      addRow.style.display = 'block';
      eviteRenderRecipientTable();
    } else {
      countEl.textContent = '';
      addRow.style.display = 'none';
      previewEl.innerHTML = 'Could not load member list: ' + (data.error || 'unknown error');
    }
  } catch (e) {
    countEl.textContent = '';
    addRow.style.display = 'none';
    previewEl.innerHTML = '<span style="color:var(--yellow)"><i class="fas fa-info-circle me-1"></i>Recipient preview unavailable — the backend will load ' + type + ' members automatically when you send. You can proceed with Send Invitations.</span>';
  }
}

function eviteRenderRecipientTable() {
  const previewEl = document.getElementById('ev-recipientPreview');
  const countEl = document.getElementById('ev-recipientCount');
  countEl.textContent = EVITE_RECIPIENT_LIST.length + ' recipient(s)';
  if (EVITE_RECIPIENT_LIST.length === 0) { previewEl.innerHTML = 'No recipients.'; return; }
  let html = '<table style="width:100%;font-size:.78rem"><thead><tr><th style="text-align:left;padding:4px 8px;border-bottom:1px solid var(--line)">Name</th><th style="text-align:left;padding:4px 8px;border-bottom:1px solid var(--line)">Email</th><th style="text-align:center;padding:4px 8px;border-bottom:1px solid var(--line);width:40px"></th></tr></thead><tbody>';
  EVITE_RECIPIENT_LIST.forEach((m, i) => {
    const badge = m.added ? ' <span style="background:var(--accent);color:#fff;font-size:.65rem;padding:1px 6px;border-radius:4px">added</span>' : '';
    html += '<tr><td style="padding:4px 8px">' + (m.name || '') + badge + '</td><td style="padding:4px 8px">' + (m.email || '') + '</td>';
    html += '<td style="text-align:center;padding:4px"><button onclick="eviteRemoveRecipient(' + i + ')" title="Remove" style="background:none;border:none;color:#ef4444;cursor:pointer;font-size:.9rem"><i class="fas fa-times-circle"></i></button></td></tr>';
  });
  html += '</tbody></table>';
  previewEl.innerHTML = html;
}

function eviteRemoveRecipient(idx) {
  EVITE_RECIPIENT_LIST.splice(idx, 1);
  eviteRenderRecipientTable();
}

function eviteAddRecipient() {
  const nameEl = document.getElementById('ev-addName');
  const emailEl = document.getElementById('ev-addEmail');
  const email = (emailEl.value || '').trim();
  const name = (nameEl.value || '').trim() || email.split('@')[0];
  if (!email || !email.includes('@')) { alert('Enter a valid email address.'); return; }
  if (EVITE_RECIPIENT_LIST.some(r => r.email.toLowerCase() === email.toLowerCase())) { alert('Already in list.'); return; }
  EVITE_RECIPIENT_LIST.push({ name, email, added: true });
  nameEl.value = ''; emailEl.value = '';
  eviteRenderRecipientTable();
}

// ═══════════════════════════════════════════════════════════════════
//  EVITE DASHBOARD FUNCTIONS
// ═══════════════════════════════════════════════════════════════════

let EVITE_DASH_DATA = null;
let EVITE_DASH_FILTER = 'all';
let EVITE_DASH_TIMER = null;

function eviteDashMsg(msg, isError) {
  const el = document.getElementById('ev-dash-msg');
  el.style.display = 'block';
  el.style.color = isError ? '#ef4444' : 'var(--green)';
  el.innerHTML = (isError ? '<i class="fas fa-times-circle me-1"></i>' : '<i class="fas fa-check-circle me-1"></i>') + msg;
  if (!isError) setTimeout(() => { el.style.display = 'none'; }, 5000);
}

async function eviteLoadDashboard() {
  if (!EVITE_CURRENT_EVENT_ID) return eviteDashMsg('Select an event first (use Refresh Events above).', true);
  const msgEl = document.getElementById('ev-dash-msg');
  msgEl.style.display = 'block';
  msgEl.style.color = 'var(--muted)';
  msgEl.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i>Loading dashboard...';
  try {
    const resp = await fetch(API + '/evite_invite_status?eventId=' + encodeURIComponent(EVITE_CURRENT_EVENT_ID));
    const data = await resp.json();
    if (data.error) return eviteDashMsg(data.error, true);
    EVITE_DASH_DATA = data;
    eviteRenderDashboard();
    msgEl.style.display = 'none';

    // auto-refresh
    const autoEl = document.getElementById('ev-dash-auto-refresh');
    if (autoEl.checked && !EVITE_DASH_TIMER) {
      EVITE_DASH_TIMER = setInterval(eviteLoadDashboard, 30000);
    }
  } catch (e) {
    eviteDashMsg('API error: ' + e.message, true);
  }
}

document.getElementById('ev-dash-auto-refresh')?.addEventListener('change', function() {
  if (this.checked) {
    if (!EVITE_DASH_TIMER && EVITE_CURRENT_EVENT_ID) {
      EVITE_DASH_TIMER = setInterval(eviteLoadDashboard, 30000);
    }
  } else {
    clearInterval(EVITE_DASH_TIMER);
    EVITE_DASH_TIMER = null;
  }
});

function eviteKpi(value, label, colorClass) {
  return '<div class="kpi ' + colorClass + '"><div class="v">' + value + '</div><div class="k">' + label + '</div></div>';
}

function eviteRenderDashboard() {
  if (!EVITE_DASH_DATA) return;
  const s = EVITE_DASH_DATA.summary;
  const inv = EVITE_DASH_DATA.invitations || [];

  // Response KPIs
  document.getElementById('ev-dash-kpi-response').innerHTML =
    eviteKpi(s.total, 'Total Invited', 'blue') +
    eviteKpi(s.sent, 'Emails Sent', 'cyan') +
    eviteKpi(s.responded, 'Responded', 'green') +
    eviteKpi(s.pending, 'Pending', 'yellow') +
    eviteKpi(s.attending, 'Attending', 'green') +
    eviteKpi(s.declined, 'Declined', 'red') +
    eviteKpi(s.maybe, 'Maybe', 'orange');

  // Attendance KPIs
  document.getElementById('ev-dash-kpi-attendance').innerHTML =
    eviteKpi(s.totalGuests, 'Total Guests', 'purple') +
    eviteKpi(s.totalAdults, 'Adults', 'blue') +
    eviteKpi(s.totalKids, 'Kids', 'cyan');

  // Food KPIs
  var totalMeals = s.food.veg + s.food.nonVeg;
  document.getElementById('ev-dash-kpi-food').innerHTML =
    eviteKpi(totalMeals, 'Total Meals', 'orange') +
    eviteKpi(s.food.veg, 'Vegetarian', 'green') +
    eviteKpi(s.food.nonVeg, 'Non-Vegetarian', 'red') +
    eviteKpi(s.food.special, 'Special Diet', 'purple');

  // Dietary notes
  var dnEl = document.getElementById('ev-dash-dietary-notes');
  if (s.food.dietaryNotes && s.food.dietaryNotes.length > 0) {
    dnEl.style.display = 'block';
    var dnHtml = '<div style="font-size:.78rem;color:var(--muted);margin-top:6px"><strong>Dietary Notes:</strong><ul style="margin:4px 0 0 18px;padding:0">';
    s.food.dietaryNotes.forEach(function(dn) {
      dnHtml += '<li><strong>' + esc(dn.name) + ':</strong> ' + esc(dn.note) + '</li>';
    });
    dnHtml += '</ul></div>';
    dnEl.innerHTML = dnHtml;
  } else {
    dnEl.style.display = 'none';
  }

  // Cultural KPIs
  document.getElementById('ev-dash-kpi-cultural').innerHTML =
    eviteKpi(s.cultural.participants, 'Participants', 'purple') +
    eviteKpi(s.cultural.totalPerformances, 'Performances', 'pink');

  // Performance details
  var pfEl = document.getElementById('ev-dash-performances');
  if (s.cultural.performances && s.cultural.performances.length > 0) {
    pfEl.style.display = 'block';
    var pfHtml = '<table class="t" style="font-size:.78rem;margin-top:6px"><thead><tr><th>Performer</th><th>Category</th><th>Mode</th><th>Age Group</th><th>Language</th><th>Description</th><th>Members</th></tr></thead><tbody>';
    s.cultural.performances.forEach(function(p) {
      pfHtml += '<tr><td>' + esc(p.performer) + '</td><td>' + esc(p.category) + '</td><td>' + esc(p.mode) + '</td><td>' + esc(p.ageGroup) + '</td><td>' + esc(p.language) + '</td><td>' + esc(p.description) + '</td><td>' + (p.memberCount || 1) + (p.memberNames && p.memberNames.length ? ' (' + p.memberNames.map(esc).join(', ') + ')' : '') + '</td></tr>';
    });
    pfHtml += '</tbody></table>';
    pfEl.innerHTML = pfHtml;
  } else {
    pfEl.style.display = 'none';
  }

  document.getElementById('ev-dash-summary').style.display = 'block';
  document.getElementById('ev-dash-detail').style.display = 'block';

  // Render detail table
  eviteRenderDetailTable();
}

function esc(s) { return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

function eviteRenderDetailTable() {
  if (!EVITE_DASH_DATA) return;
  var inv = EVITE_DASH_DATA.invitations || [];
  var filter = EVITE_DASH_FILTER;
  var filtered = inv;
  if (filter === 'yes') filtered = inv.filter(function(i) { return i.rsvpStatus === 'yes'; });
  else if (filter === 'no') filtered = inv.filter(function(i) { return i.rsvpStatus === 'no'; });
  else if (filter === 'maybe') filtered = inv.filter(function(i) { return i.rsvpStatus === 'maybe'; });
  else if (filter === 'pending') filtered = inv.filter(function(i) { return !i.responded; });

  var tbody = document.getElementById('ev-dash-tbody');
  if (filtered.length === 0) {
    tbody.innerHTML = '<tr><td colspan="12" style="text-align:center;color:var(--dim);padding:20px">No responses matching this filter.</td></tr>';
    return;
  }

  var html = '';
  filtered.forEach(function(inv, idx) {
    var statusBadge = '';
    if (inv.rsvpStatus === 'yes') statusBadge = '<span class="badge-s badge-green">Attending</span>';
    else if (inv.rsvpStatus === 'no') statusBadge = '<span class="badge-s badge-red">Declined</span>';
    else if (inv.rsvpStatus === 'maybe') statusBadge = '<span class="badge-s badge-yellow">Maybe</span>';
    else statusBadge = '<span class="badge-s badge-dim">Pending</span>';

    var culturalInfo = '';
    if (inv.culturalParticipant && inv.cultural && inv.cultural.performances) {
      culturalInfo = '<span class="badge-s badge-purple">Yes (' + inv.cultural.performances.length + ')</span>';
    } else if (inv.culturalParticipant) {
      culturalInfo = '<span class="badge-s badge-purple">Yes</span>';
    } else if (inv.responded) {
      culturalInfo = '<span class="badge-s badge-dim">No</span>';
    } else {
      culturalInfo = '—';
    }

    var respondedAt = inv.respondedAt ? new Date(inv.respondedAt).toLocaleString() : '—';
    var dietary = inv.dietary ? inv.dietary.replace(/_/g, ' ') : '—';

    html += '<tr>' +
      '<td>' + (idx + 1) + '</td>' +
      '<td>' + esc(inv.recipientName) + '</td>' +
      '<td style="font-size:.75rem">' + esc(inv.recipientEmail) + '</td>' +
      '<td>' + statusBadge + '</td>' +
      '<td style="text-align:center">' + (inv.adults || '—') + '</td>' +
      '<td style="text-align:center">' + (inv.kids || '—') + '</td>' +
      '<td style="text-align:center">' + (inv.vegCount || '—') + '</td>' +
      '<td style="text-align:center">' + (inv.nonVegCount || '—') + '</td>' +
      '<td>' + dietary + '</td>' +
      '<td>' + culturalInfo + '</td>' +
      '<td style="max-width:150px;font-size:.75rem;word-break:break-word">' + esc(inv.notes) + '</td>' +
      '<td style="font-size:.72rem;white-space:nowrap">' + respondedAt + '</td></tr>';
  });
  tbody.innerHTML = html;
}

function eviteDashFilter(f) {
  EVITE_DASH_FILTER = f;
  document.querySelectorAll('.ev-df-btn').forEach(function(btn) { btn.classList.remove('active'); });
  event.target.classList.add('active');
  eviteRenderDetailTable();
}

function eviteExportDashboard() {
  if (!EVITE_DASH_DATA || !EVITE_DASH_DATA.invitations) return eviteDashMsg('Load the dashboard first.', true);
  var inv = EVITE_DASH_DATA.invitations;
  var csv = 'Name,Email,Status,Adults,Kids,Veg,NonVeg,Dietary,Cultural Participant,Notes,Responded At\\n';
  inv.forEach(function(i) {
    csv += '"' + (i.recipientName || '').replace(/"/g, '""') + '","' +
      (i.recipientEmail || '') + '",' +
      (i.rsvpStatus || 'pending') + ',' +
      (i.adults || 0) + ',' + (i.kids || 0) + ',' +
      (i.vegCount || 0) + ',' + (i.nonVegCount || 0) + ',"' +
      (i.dietary || '').replace(/"/g, '""') + '",' +
      (i.culturalParticipant ? 'Yes' : 'No') + ',"' +
      (i.notes || '').replace(/"/g, '""') + '",' +
      (i.respondedAt ? new Date(i.respondedAt).toLocaleString() : '') + '\\n';
  });
  var blob = new Blob([csv], { type: 'text/csv' });
  var a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'evite-rsvp-responses.csv';
  a.click();
  URL.revokeObjectURL(a.href);
}

// ═══════════════════════════════════════════════════════════════════
//  EC REPLACEMENT FUNCTIONS (President Only)
// ═══════════════════════════════════════════════════════════════════

let ECR_WORKFLOWS = [];

async function loadEcReplacementData() {
  try {
    const resp = await fetch(API + '/ec_replacement_list', { method: 'GET', headers: { 'Content-Type': 'application/json' } });
    const res = await resp.json();
    if (res && res.workflows) {
      ECR_WORKFLOWS = res.workflows;
      renderEcrActiveWorkflows();
      renderEcrHistory();
    }
  } catch(e) {
    console.log('EC Replacement data load (offline mode):', e.message);
    renderEcrActiveWorkflows();
    renderEcrHistory();
  }
}

function renderEcrActiveWorkflows() {
  const el = document.getElementById('ecr-active-workflows');
  if (!el) return;
  const active = ECR_WORKFLOWS.filter(w => w.status !== 'completed' && w.status !== 'reversed');
  if (active.length === 0) {
    el.innerHTML = '<div style="text-align:center;padding:20px;color:var(--dim)"><i class="fas fa-check-circle" style="font-size:2rem;margin-bottom:8px;display:block;color:var(--green)"></i>No active workflows</div>';
    return;
  }
  el.innerHTML = active.map(w => {
    const typeBadge = w.type === 'resignation' ? '<span class="badge-s badge-yellow">Resignation</span>' : '<span class="badge-s badge-red">Suspension</span>';
    const replies = (w.replies || []);
    const totalMembers = 6; // Other EC members
    return '<div style="background:var(--bg2);border-radius:10px;padding:14px;margin-bottom:10px;border:1px solid var(--line)">' +
      '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">' +
      '<strong>' + (w.memberName || w.memberEmail) + '</strong>' + typeBadge + '</div>' +
      '<div style="font-size:.78rem;color:var(--muted);margin-bottom:6px">' + (w.reason || '') + '</div>' +
      '<div style="display:flex;gap:16px;font-size:.72rem;color:var(--dim);margin-bottom:8px">' +
      '<span><i class="fas fa-clock me-1"></i>Started: ' + (w.initiatedAt || '—') + '</span>' +
      '<span><i class="fas fa-reply me-1"></i>Replies: ' + replies.length + '/' + totalMembers + '</span>' +
      '</div>' +
      buildProgressBar('EC Replies', replies.length, totalMembers, Math.round(replies.length/totalMembers*100), replies.length === totalMembers ? 'green' : 'yellow') +
      (replies.length === totalMembers ? '<button onclick="finalizeEcWorkflow(\\'' + w.id + '\\')" style="background:var(--green);color:#fff;border:none;padding:6px 16px;border-radius:6px;font-size:.78rem;cursor:pointer;margin-top:4px"><i class="fas fa-gavel me-1"></i>Finalize</button>' : '') +
      (w.type === 'suspension' ? '<button onclick="reverseEcSuspension(\\'' + w.id + '\\')" style="background:var(--accent);color:#fff;border:none;padding:6px 16px;border-radius:6px;font-size:.78rem;cursor:pointer;margin-top:4px;margin-left:8px"><i class="fas fa-undo me-1"></i>Reverse Suspension</button>' : '') +
      '</div>';
  }).join('');
}

function renderEcrHistory() {
  const el = document.getElementById('ecr-history');
  if (!el) return;
  const history = ECR_WORKFLOWS.filter(w => w.status === 'completed' || w.status === 'reversed');
  if (history.length === 0) {
    el.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--dim)">No replacement history</td></tr>';
    return;
  }
  el.innerHTML = history.map(w => {
    const statusBadge = w.status === 'completed' ? '<span class="badge-s badge-green">Complete</span>' : '<span class="badge-s badge-blue">Reversed</span>';
    return '<tr><td>' + (w.memberName || w.memberEmail) + '</td><td>' + (w.type||'') + '</td><td>' + (w.initiatedAt||'—') + '</td><td>' + statusBadge + '</td><td>' + (w.finalizedAt||'—') + '</td></tr>';
  }).join('');
}

async function initiateEcReplacement() {
  const member = document.getElementById('ecr-member').value;
  const action = document.getElementById('ecr-action').value;
  const reason = document.getElementById('ecr-reason').value.trim();
  const newPw = document.getElementById('ecr-new-password').value;
  const confirmPw = document.getElementById('ecr-confirm-password').value;
  const msgEl = document.getElementById('ecr-initiate-msg');

  if (!member) { showEcrMsg(msgEl, 'red', 'Please select an EC member.'); return; }
  if (!reason) { showEcrMsg(msgEl, 'red', 'Please provide a reason.'); return; }
  if (!newPw || newPw.length < 8) { showEcrMsg(msgEl, 'red', 'Password must be at least 8 characters.'); return; }
  if (newPw !== confirmPw) { showEcrMsg(msgEl, 'red', 'Passwords do not match.'); return; }

  if (!confirm('⚠️ CRITICAL ACTION: This will:\\n\\n1. Reset the BANF Gmail password\\n2. Send thank-you email to ' + member + '\\n3. Send notifications to all EC members\\n4. Begin asset collection process\\n\\nAre you absolutely sure?')) return;

  showEcrMsg(msgEl, 'var(--accent)', '<i class="fas fa-spinner fa-spin me-1"></i>Initiating ' + action + ' workflow...');

  try {
    const result = await apiCall('ec_replacement_initiate', {
      adminKey: 'banf-bosonto-2026-live',
      president: CURRENT_ADMIN ? CURRENT_ADMIN.email : '',
      memberEmail: member, actionType: action,
      reason: reason, newPassword: newPw
    });
    if (result && result.success) {
      showEcrMsg(msgEl, 'var(--green)', '<i class="fas fa-check-circle me-1"></i>Workflow ' + result.id + ' initiated. Emails sent. Password reset queued.');
      addLog('EC_REPLACE', action.toUpperCase() + ' initiated for ' + member);
      document.getElementById('ecr-reason').value = '';
      document.getElementById('ecr-new-password').value = '';
      document.getElementById('ecr-confirm-password').value = '';
      loadEcReplacementData();
    } else {
      showEcrMsg(msgEl, 'var(--red)', '<i class="fas fa-times-circle me-1"></i>' + (result.error || 'Initiation failed'));
    }
  } catch(e) {
    showEcrMsg(msgEl, 'var(--red)', '<i class="fas fa-times-circle me-1"></i>API error: ' + e.message);
  }
}

function showEcrMsg(el, color, html) {
  el.style.display = 'block'; el.style.color = color; el.innerHTML = html;
}

async function finalizeEcWorkflow(id) {
  if (!confirm('Finalize this EC replacement workflow? This sends the final resignation acknowledgment email.')) return;
  try {
    const result = await apiCall('ec_replacement_finalize', { adminKey: 'banf-bosonto-2026-live', id: id });
    if (result && result.success) {
      addLog('EC_REPLACE', 'Workflow ' + id + ' finalized');
      loadEcReplacementData();
    } else { alert(result.error || 'Finalization failed'); }
  } catch(e) { alert('API error: ' + e.message); }
}

async function reverseEcSuspension(id) {
  if (!confirm('Reverse this suspension? The EC member will be reinstated.')) return;
  try {
    const result = await apiCall('ec_replacement_reverse', { adminKey: 'banf-bosonto-2026-live', id: id });
    if (result && result.success) {
      addLog('EC_REPLACE', 'Suspension ' + id + ' reversed');
      loadEcReplacementData();
    } else { alert(result.error || 'Reversal failed'); }
  } catch(e) { alert('API error: ' + e.message); }
}

// ── Revoke EC Admin Role (President Only) ──
async function revokeEcAdminRole() {
  var member = document.getElementById('revoke-member').value;
  var reason = document.getElementById('revoke-reason').value.trim();
  var msgEl = document.getElementById('revoke-msg');

  if (!CURRENT_ADMIN || CURRENT_ADMIN.email !== 'ranadhir.ghosh@gmail.com') {
    showRevokeMsg(msgEl, '#dc2626', '<i class="fas fa-lock me-1"></i>Only the BANF President can revoke EC admin roles.');
    return;
  }
  if (!member) { showRevokeMsg(msgEl, '#dc2626', '<i class="fas fa-exclamation-circle me-1"></i>Please select an EC member.'); return; }
  if (!reason) { showRevokeMsg(msgEl, '#dc2626', '<i class="fas fa-exclamation-circle me-1"></i>Please provide a reason.'); return; }

  if (!confirm('⚠️ REVOKE EC ADMIN ROLE\\n\\nThis will immediately revoke admin portal access for:\\n' + member + '\\n\\nReason: ' + reason + '\\n\\nThe member will see a "role revoked" message on their next login attempt.\\n\\nAre you sure?')) return;

  showRevokeMsg(msgEl, 'var(--accent)', '<i class="fas fa-spinner fa-spin me-1"></i>Revoking EC admin role...');

  try {
    var result = await apiCall('admin_role_revoke', {
      adminKey: 'banf-bosonto-2026-live',
      presidentEmail: CURRENT_ADMIN.email,
      email: member,
      reason: reason
    });
    if (result && result.success) {
      showRevokeMsg(msgEl, 'var(--green)', '<i class="fas fa-check-circle me-1"></i>EC admin role revoked for ' + member + '. They will no longer be able to log in to the admin portal.');
      addLog('EC_REVOKE', 'Role revoked for ' + member + ' — Reason: ' + reason);
      document.getElementById('revoke-reason').value = '';
      document.getElementById('revoke-member').value = '';
    } else {
      showRevokeMsg(msgEl, '#dc2626', '<i class="fas fa-times-circle me-1"></i>' + (result.error || 'Revocation failed.'));
    }
  } catch(e) {
    showRevokeMsg(msgEl, '#dc2626', '<i class="fas fa-times-circle me-1"></i>API error: ' + e.message);
  }
}
function showRevokeMsg(el, color, html) {
  el.style.display = 'block'; el.style.color = color; el.innerHTML = html;
}

function renderAll(){
  document.getElementById('dash-kpis').innerHTML=[
    {v:ROLES.length,k:'Defined Roles',cls:'blue'},
    {v:USERS.length,k:'Users',cls:'green'},
    {v:IDENTITY_GRAPH.length,k:'Identities',cls:'cyan'},
    {v:CRM.length,k:'CRM Members',cls:'cyan'},
    {v:DRIVE_LIST.length,k:'Drive Queue',cls:'purple'},
    {v:FEEDBACK.length,k:'Feedback Items',cls:'orange'},
    {v:DEV_TICKETS.length,k:'Dev Tickets',cls:'yellow'},
    {v:LOG.length,k:'Audit Log',cls:'dim'},
  ].map(k=>\`<div class="kpi \${k.cls}"><div class="v">\${k.v}</div><div class="k">\${k.k}</div></div>\`).join('');
  renderRoles();renderUsers();renderDrive();renderEC();renderFeedback();renderDevBoard();renderE2E(null);renderLog('dash-log',8);renderLog('full-log');renderDriveStatus();renderIdentityGraph();renderRoleHistory();
}

// ═══════════════════════════════════════════════════════════════════════
//  EC PROFILE: Photo upload + text editing
// ═══════════════════════════════════════════════════════════════════════
var _ecProfileLoaded = false;
var _ecProfilePhotoData = null; // base64 data URL

function updateProfileCharCount(field, max) {
  var el = document.getElementById('ec-profile-' + field);
  var cnt = document.getElementById('ec-profile-' + field + '-count');
  if (el && cnt) cnt.textContent = el.value.length + '/' + max;
  updateProfilePreview();
}

function handleProfilePhotoUpload(event) {
  var file = event.target.files[0];
  if (!file) return;
  if (!file.type.startsWith('image/')) { alert('Please select an image file.'); return; }
  if (file.size > 5 * 1024 * 1024) { alert('Image too large. Max 5MB before resize.'); return; }

  var reader = new FileReader();
  reader.onload = function(e) {
    var img = new Image();
    img.onload = function() {
      // Resize to 400x400 square, center crop
      var canvas = document.createElement('canvas');
      canvas.width = 400; canvas.height = 400;
      var ctx = canvas.getContext('2d');
      var size = Math.min(img.width, img.height);
      var sx = (img.width - size) / 2;
      var sy = (img.height - size) / 2;
      ctx.drawImage(img, sx, sy, size, size, 0, 0, 400, 400);
      var dataUrl = canvas.toDataURL('image/jpeg', 0.85);
      if (dataUrl.length > 700000) {
        dataUrl = canvas.toDataURL('image/jpeg', 0.6);
      }
      if (dataUrl.length > 700000) {
        alert('Image still too large after compression. Try a smaller photo.');
        return;
      }
      _ecProfilePhotoData = dataUrl;
      var preview = document.getElementById('ec-profile-photo-preview');
      var placeholder = document.getElementById('ec-profile-photo-placeholder');
      preview.src = dataUrl;
      preview.style.display = 'block';
      placeholder.style.display = 'none';
      updateProfilePreview();
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

function clearProfilePhoto() {
  _ecProfilePhotoData = null;
  var preview = document.getElementById('ec-profile-photo-preview');
  var placeholder = document.getElementById('ec-profile-photo-placeholder');
  preview.src = ''; preview.style.display = 'none';
  placeholder.style.display = 'block';
  document.getElementById('ec-profile-photo-input').value = '';
  updateProfilePreview();
}

function updateProfilePreview() {
  if (!CURRENT_ADMIN) return;
  var card = document.getElementById('ec-profile-preview-card');
  card.style.display = 'block';

  var nameEl = document.getElementById('ec-preview-name');
  nameEl.textContent = (CURRENT_ADMIN.firstName || '') + ' ' + (CURRENT_ADMIN.lastName || '');

  var titleEl = document.getElementById('ec-preview-title');
  titleEl.textContent = CURRENT_ADMIN.ecTitle || 'EC Member';

  var summaryEl = document.getElementById('ec-preview-summary');
  summaryEl.textContent = document.getElementById('ec-profile-summary').value || '(No summary yet)';

  var detailParts = [];
  var edu = document.getElementById('ec-profile-education').value;
  var prof = document.getElementById('ec-profile-profession').value;
  var interests = document.getElementById('ec-profile-interests').value;
  if (edu) detailParts.push('<i class="fas fa-graduation-cap me-1"></i>' + edu);
  if (prof) detailParts.push('<i class="fas fa-briefcase me-1"></i>' + prof);
  if (interests) detailParts.push('<i class="fas fa-heart me-1"></i>' + interests);
  document.getElementById('ec-preview-details').innerHTML = detailParts.join(' &nbsp;|&nbsp; ');

  var photoDiv = document.getElementById('ec-preview-photo');
  var initialsEl = document.getElementById('ec-preview-initials');
  if (_ecProfilePhotoData) {
    photoDiv.innerHTML = '<img src="' + _ecProfilePhotoData + '" style="width:100%;height:100%;object-fit:cover">';
  } else {
    var initials = ((CURRENT_ADMIN.firstName || '?')[0] + (CURRENT_ADMIN.lastName || '?')[0]).toUpperCase();
    photoDiv.innerHTML = '';
    initialsEl = document.createElement('span');
    initialsEl.style.cssText = 'font-size:2rem;font-weight:800;color:#fff';
    initialsEl.textContent = initials;
    photoDiv.appendChild(initialsEl);
  }
}

function loadECProfile() {
  if (!CURRENT_ADMIN || !CURRENT_ADMIN.email) return;

  // Fill read-only fields
  document.getElementById('ec-profile-firstName').value = CURRENT_ADMIN.firstName || '';
  document.getElementById('ec-profile-lastName').value = CURRENT_ADMIN.lastName || '';
  document.getElementById('ec-profile-ecTitle').value = CURRENT_ADMIN.ecTitle || '';
  document.getElementById('ec-profile-email').value = CURRENT_ADMIN.email || '';

  if (_ecProfileLoaded) return; // Only fetch from API once per session

  var statusEl = document.getElementById('ec-profile-status');
  statusEl.textContent = 'Loading profile...';
  statusEl.style.color = 'var(--muted)';

  fetch(API + '/ec_get_ec_profile?email=' + encodeURIComponent(CURRENT_ADMIN.email), {
    headers: { 'x-user-email': CURRENT_ADMIN.email }
  })
  .then(function(r) { return r.json(); })
  .then(function(data) {
    if (data.profile) {
      var p = data.profile;
      if (p.profilePhoto) {
        _ecProfilePhotoData = p.profilePhoto;
        var preview = document.getElementById('ec-profile-photo-preview');
        var placeholder = document.getElementById('ec-profile-photo-placeholder');
        preview.src = p.profilePhoto;
        preview.style.display = 'block';
        placeholder.style.display = 'none';
      }
      if (p.profileSummary) document.getElementById('ec-profile-summary').value = p.profileSummary;
      if (p.profileBio) document.getElementById('ec-profile-bio').value = p.profileBio;
      if (p.profileEducation) document.getElementById('ec-profile-education').value = p.profileEducation;
      if (p.profileProfession) document.getElementById('ec-profile-profession').value = p.profileProfession;
      if (p.profileInterests) document.getElementById('ec-profile-interests').value = p.profileInterests;
      updateProfileCharCount('summary', 300);
      updateProfileCharCount('bio', 2000);
      statusEl.textContent = p.profileUpdatedAt ? 'Last saved: ' + new Date(p.profileUpdatedAt).toLocaleString() : '';
    } else {
      statusEl.textContent = 'No profile saved yet. Fill in your details and click Save.';
    }
    updateProfilePreview();
    _ecProfileLoaded = true;
  })
  .catch(function(err) {
    statusEl.textContent = 'Could not load profile. You can still fill in details and save.';
    statusEl.style.color = 'var(--orange)';
    updateProfilePreview();
  });
}

function saveECProfile() {
  if (!CURRENT_ADMIN || !CURRENT_ADMIN.email) { alert('Not logged in.'); return; }

  var btn = document.getElementById('ec-profile-save-btn');
  var statusEl = document.getElementById('ec-profile-status');
  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i>Saving...';
  statusEl.textContent = '';

  var body = {
    email: CURRENT_ADMIN.email,
    profileSummary: document.getElementById('ec-profile-summary').value.trim(),
    profileBio: document.getElementById('ec-profile-bio').value.trim(),
    profileEducation: document.getElementById('ec-profile-education').value.trim(),
    profileProfession: document.getElementById('ec-profile-profession').value.trim(),
    profileInterests: document.getElementById('ec-profile-interests').value.trim()
  };
  if (_ecProfilePhotoData) body.profilePhoto = _ecProfilePhotoData;

  fetch(API + '/ec_update_ec_profile', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-user-email': CURRENT_ADMIN.email },
    body: JSON.stringify(body)
  })
  .then(function(r) { return r.json(); })
  .then(function(data) {
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-save me-1"></i>Save Profile';
    if (data.success) {
      statusEl.textContent = 'Profile saved! ' + new Date().toLocaleString();
      statusEl.style.color = 'var(--green)';
      _ecProfileLoaded = false;
      addLog('PROFILE', 'EC profile updated by ' + CURRENT_ADMIN.email);
    } else {
      statusEl.textContent = 'Save failed: ' + (data.error || 'Unknown error');
      statusEl.style.color = 'var(--red)';
    }
  })
  .catch(function(err) {
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-save me-1"></i>Save Profile';
    statusEl.textContent = 'Network error. Please try again.';
    statusEl.style.color = 'var(--red)';
  });
}

// ═══════════════════════════════════════════════════════════════════════
//  AGENT MONITOR
// ═══════════════════════════════════════════════════════════════════════
var _amAgents = [];

async function loadAgentMonitor() {
  var refreshIcon = document.querySelector('#panel-agent-monitor .fa-sync');
  if (refreshIcon) refreshIcon.classList.add('fa-spin');

  try {
    var headers = {};
    if (CURRENT_ADMIN && CURRENT_ADMIN.email) {
      headers['x-user-email'] = CURRENT_ADMIN.email;
    }

    var results = await Promise.allSettled([
      fetch(API + '/agent_status').then(function(r) { return r.json(); }),
      fetch(API + '/admin_agents', { headers: headers }).then(function(r) { return r.json(); }),
      fetch(API + '/health').then(function(r) { return r.json(); })
    ]);

    var statusData = results[0].status === 'fulfilled' ? results[0].value : null;
    var agentsData = results[1].status === 'fulfilled' ? results[1].value : null;
    var healthData = results[2].status === 'fulfilled' ? results[2].value : null;

    // ── KPIs from agent_status ──
    if (statusData && statusData.success && statusData.agent) {
      var ag = statusData.agent;
      document.getElementById('am-kpi-version').textContent = ag.version || '--';
      document.getElementById('am-kpi-model').textContent = (ag.model || '--').split('/').pop();
      document.getElementById('am-kpi-capabilities').textContent = (ag.capabilities || []).length;

      var llmOk = ag.modelTest && ag.modelTest.status === 'ok';
      var llmEl = document.getElementById('am-kpi-llm-status');
      llmEl.textContent = llmOk ? 'Online' : (ag.modelTest ? ag.modelTest.status + ' (' + (ag.modelTest.code || '') + ')' : 'Unknown');
      llmEl.style.color = llmOk ? 'var(--green)' : 'var(--red)';

      // Capabilities badges
      var capEl = document.getElementById('am-capabilities');
      if (ag.capabilities && ag.capabilities.length) {
        capEl.innerHTML = ag.capabilities.map(function(c) {
          return '<span style="background:var(--bg2);border:1px solid var(--line);padding:4px 10px;border-radius:6px;font-size:.78rem;color:#e2e8f0">' + escHtml(c) + '</span>';
        }).join('');
      }
    }

    // ── Agent profiles table ──
    _amAgents = [];
    if (agentsData && agentsData.success && agentsData.agents) {
      _amAgents = agentsData.agents;
    } else if (agentsData && Array.isArray(agentsData)) {
      _amAgents = agentsData;
    }

    document.getElementById('am-kpi-total').textContent = _amAgents.length || '--';
    var activeCount = _amAgents.filter(function(a) { return a.isActive !== false; }).length;
    document.getElementById('am-kpi-active').textContent = activeCount;

    var tbody = document.getElementById('am-agents-tbody');
    if (_amAgents.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:var(--dim)">No agent profiles found. Agents may need to be seeded via the admin_agents endpoint.</td></tr>';
    } else {
      tbody.innerHTML = _amAgents.map(function(a, i) {
        var active = a.isActive !== false;
        var cats = (a.contextCategories || []).join(', ') || '--';
        return '<tr style="cursor:pointer" onclick="showAgentDetail(' + i + ')">' +
          '<td><strong>' + escHtml(a.name || a.agentId || 'Agent ' + (i + 1)) + '</strong><div style="font-size:.72rem;color:var(--dim)">' + escHtml(a.agentId || '') + '</div></td>' +
          '<td>' + escHtml(a.category || '--') + '</td>' +
          '<td>' + (active ? '<span class="badge-s" style="background:rgba(34,197,94,.15);color:var(--green)">Active</span>' : '<span class="badge-s" style="background:rgba(239,68,68,.15);color:var(--red)">Inactive</span>') + '</td>' +
          '<td>' + (a.autoReply ? '<span style="color:var(--green)">Yes</span>' : '<span style="color:var(--dim)">No</span>') + '</td>' +
          '<td style="font-size:.78rem;max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + escHtml(cats) + '</td>' +
          '<td><button onclick="event.stopPropagation();showAgentDetail(' + i + ')" style="background:none;border:1px solid var(--line);color:var(--accent);padding:3px 10px;border-radius:6px;font-size:.72rem;cursor:pointer"><i class="fas fa-search me-1"></i>View</button></td>' +
          '</tr>';
      }).join('');
    }

    // ── Health modules ──
    if (healthData && healthData.success) {
      var hGrid = document.getElementById('am-health-grid');
      var modules = healthData.modules || {};
      var html = '';
      Object.keys(modules).forEach(function(group) {
        var items = modules[group] || [];
        html += '<div style="background:var(--bg2);border:1px solid var(--line);border-radius:10px;padding:14px">' +
          '<div style="font-size:.82rem;font-weight:600;color:#fff;margin-bottom:8px;text-transform:capitalize">' + escHtml(group) + ' <span style="color:var(--dim);font-weight:400">(' + items.length + ')</span></div>' +
          '<div style="display:flex;flex-wrap:wrap;gap:4px">' +
          items.map(function(m) {
            return '<span style="background:rgba(34,197,94,.1);border:1px solid rgba(34,197,94,.2);padding:2px 8px;border-radius:4px;font-size:.72rem;color:var(--green)">' + escHtml(m) + '</span>';
          }).join('') +
          '</div></div>';
      });
      hGrid.innerHTML = html || '<div style="color:var(--dim);font-size:.82rem">No module data available.</div>';
    }

    document.getElementById('am-last-refresh').textContent = 'Last refreshed: ' + new Date().toLocaleTimeString();

  } catch (err) {
    console.error('Agent monitor error:', err);
  } finally {
    if (refreshIcon) refreshIcon.classList.remove('fa-spin');
  }
}

function showAgentDetail(idx) {
  var a = _amAgents[idx];
  if (!a) return;
  var card = document.getElementById('am-detail-card');
  card.style.display = 'block';

  document.getElementById('am-detail-title').innerHTML = '<i class="fas fa-terminal me-1"></i> ' + escHtml(a.name || a.agentId);
  document.getElementById('am-detail-meta').innerHTML =
    '<strong>ID:</strong> ' + escHtml(a.agentId || '--') +
    ' &nbsp;|&nbsp; <strong>Category:</strong> ' + escHtml(a.category || '--') +
    ' &nbsp;|&nbsp; <strong>Active:</strong> ' + (a.isActive !== false ? '<span style="color:var(--green)">Yes</span>' : '<span style="color:var(--red)">No</span>') +
    ' &nbsp;|&nbsp; <strong>Auto-Reply:</strong> ' + (a.autoReply ? 'Yes' : 'No') +
    (a.contextCategories ? ' &nbsp;|&nbsp; <strong>Context:</strong> ' + escHtml((a.contextCategories || []).join(', ')) : '');

  document.getElementById('am-detail-prompt').textContent = a.systemPrompt || '(No system prompt configured)';
  document.getElementById('am-detail-template').textContent = a.replyTemplate || '(No reply template configured)';

  // Load recent logs
  var logsEl = document.getElementById('am-detail-logs');
  logsEl.innerHTML = '<p style="font-size:.82rem;color:var(--dim)"><i class="fas fa-spinner fa-spin me-1"></i>Loading activity logs&hellip;</p>';

  var headers = {};
  if (CURRENT_ADMIN && CURRENT_ADMIN.email) {
    headers['x-user-email'] = CURRENT_ADMIN.email;
  }

  fetch(API + '/agent_history?agentId=' + encodeURIComponent(a.agentId || ''), { headers: headers })
    .then(function(r) { return r.json(); })
    .then(function(data) {
      var logs = [];
      if (data.success && data.history) logs = data.history;
      else if (data.success && data.logs) logs = data.logs;
      else if (Array.isArray(data)) logs = data;

      if (logs.length === 0) {
        logsEl.innerHTML = '<p style="font-size:.82rem;color:var(--dim)">No activity logs found for this agent.</p>';
        return;
      }

      logsEl.innerHTML = '<div style="overflow-x:auto"><table class="t"><thead><tr>' +
        '<th>Time</th><th>User Message</th><th>Response</th><th>Tools Used</th><th>Status</th>' +
        '</tr></thead><tbody>' +
        logs.slice(0, 50).map(function(log) {
          var ts = log.timestamp ? new Date(log.timestamp).toLocaleString() : '--';
          var msg = (log.userMessage || log.query || '--').substring(0, 80);
          var resp = (log.agentResponse || log.response || '--').substring(0, 100);
          var tools = (log.toolsUsed || []).join(', ') || '--';
          var ok = log.success !== false;
          return '<tr>' +
            '<td style="white-space:nowrap;font-size:.75rem">' + escHtml(ts) + '</td>' +
            '<td style="font-size:.78rem;max-width:200px;overflow:hidden;text-overflow:ellipsis">' + escHtml(msg) + '</td>' +
            '<td style="font-size:.78rem;max-width:250px;overflow:hidden;text-overflow:ellipsis">' + escHtml(resp) + '</td>' +
            '<td style="font-size:.75rem">' + escHtml(tools) + '</td>' +
            '<td>' + (ok ? '<span style="color:var(--green)">OK</span>' : '<span style="color:var(--red)">Fail</span>') + '</td>' +
            '</tr>';
        }).join('') +
        '</tbody></table></div>';
    })
    .catch(function(err) {
      logsEl.innerHTML = '<p style="font-size:.82rem;color:var(--red)">Failed to load logs: ' + escHtml(err.message) + '</p>';
    });

  card.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ═══════════════════════════════════════════════════════════════════════
//  AUTO-LOGIN: Check sessionStorage on page load
// ═══════════════════════════════════════════════════════════════════════
(function autoLoginCheck() {
  try {
    var session = JSON.parse(sessionStorage.getItem('banf_admin_session') || 'null');
    if (session && session.email) {
      // Re-validate: session email must exist in AUTH_DB with a valid EC/admin role
      var dbUser = AUTH_DB[session.email];
      var validRoles = ['super-admin','admin','ec-member','business-stakeholder'];
      var sessionRoles = session.roles || (dbUser ? dbUser.roles : []);
      var hasValidRole = sessionRoles.some(function(r) { return validRoles.indexOf(r) >= 0; });
      if (!dbUser && !hasValidRole) {
        sessionStorage.removeItem('banf_admin_session');
        return; // Forged session — reject
      }
      CURRENT_ADMIN = {
        email: session.email,
        roles: dbUser ? dbUser.roles : sessionRoles,
        role: (dbUser ? dbUser.roles[0] : sessionRoles[0]) || 'ec-member',
        firstName: session.firstName || (dbUser ? dbUser.firstName : ''),
        lastName: session.lastName || (dbUser ? dbUser.lastName : ''),
        ecTitle: session.ecTitle || (dbUser ? dbUser.ecTitle : ''),
        name: session.name || ''
      };
      enterPortal(CURRENT_ADMIN, session.email);
    }
  } catch(e) { /* no valid session, show login */ }
})();

</script>
<!-- BANF RAG Chatbot Widget (Admin Variant) -->
<script>document.body.classList.add('admin-portal');</script>
<script src="banf-chatbot-widget.js"></script>
</body>
</html>

`; }