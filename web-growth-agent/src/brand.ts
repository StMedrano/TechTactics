import express from "express";

export const BRAND_LOGO_URL = "https://raw.githubusercontent.com/StMedrano/TechTactics/main/client/public/assets/techtactics-logo.png";

const BRAND_MARK = '<div class="brand-mark">TT</div>';
const BRANDED_MARK = `<div class="logo-wrap">
  <img class="brand-logo" src="${BRAND_LOGO_URL}" alt="TechTactics" onerror="this.style.display='none';const fallback=this.nextElementSibling;if(fallback)fallback.style.display='grid'">
  <div class="brand-mark brand-fallback" style="display:none">TT</div>
</div>`;

export function applyBrandLogo(html: string): string {
  return html.includes(BRAND_MARK) ? html.replace(BRAND_MARK, BRANDED_MARK) : html;
}

export const BRAND_THEME_CSS = String.raw`
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Space+Grotesk:wght@500;600;700&display=swap');
:root{
  --tt-black:#030407;
  --tt-ink:#090c10;
  --tt-panel:#0d1117;
  --tt-panel-2:#11161d;
  --tt-panel-3:#151b23;
  --tt-slate:#384358;
  --tt-line:#252b33;
  --tt-line-strong:#343b45;
  --tt-text:#f4f4f1;
  --tt-muted:#969da8;
  --tt-muted-2:#6f7782;
  --tt-gold:#F7AD4E;
  --tt-gold-2:#ffbd68;
  --tt-gold-soft:#2b2114;
  --tt-green:#45d597;
  --tt-red:#ef6b65;
  --tt-radius:12px;
  --tt-shadow:0 18px 50px rgba(0,0,0,.24);
  --bg:var(--tt-black);
  --bg2:var(--tt-ink);
  --panel:var(--tt-panel);
  --panel2:var(--tt-panel-2);
  --panel3:var(--tt-panel-3);
  --line:var(--tt-line);
  --line2:var(--tt-line-strong);
  --text:var(--tt-text);
  --muted:var(--tt-muted);
  --muted2:var(--tt-muted-2);
  --orange:var(--tt-gold);
  --orange2:var(--tt-gold-2);
  --green:var(--tt-green);
  --blue:var(--tt-gold);
  --blue2:var(--tt-gold);
  --purple:var(--tt-gold);
  --yellow:var(--tt-gold);
  --sidebar:254px;
  --gap:12px;
}
html{background:var(--tt-black)}
body{
  background:
    radial-gradient(circle at 82% -10%,rgba(247,173,78,.055),transparent 28%),
    linear-gradient(180deg,#05070a 0%,var(--tt-black) 36%,#020304 100%) !important;
  color:var(--tt-text);
  font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;
}
::selection{background:var(--tt-gold);color:#15100a}
:focus-visible{outline:2px solid var(--tt-gold) !important;outline-offset:3px}
.cockpit{grid-template-columns:var(--sidebar) minmax(0,1fr);gap:0;padding:0;background:transparent}
.sidebar{
  top:0;height:100vh;border-radius:0;border-width:0 1px 0 0;border-color:var(--tt-line);
  background:linear-gradient(180deg,#090c10 0%,#07090c 100%);
  box-shadow:12px 0 40px rgba(0,0,0,.16);
}
.brand-block{height:118px;margin:0 18px 8px;border:0;border-bottom:1px solid var(--tt-line);border-radius:0;background:transparent}
.logo-wrap{width:205px;height:86px}.logo-wrap img{width:100%;height:100%;object-fit:contain;filter:saturate(.95) contrast(1.04)}
.brand-mark{background:transparent;color:var(--tt-gold);border:1px solid var(--tt-line);font-family:"Space Grotesk",sans-serif}
.nav{padding:12px 12px;gap:4px}.nav a{min-height:48px;border-radius:8px;color:#a6abb3;font-size:13px;padding:0 14px;transition:background .16s ease,color .16s ease,border-color .16s ease,transform .16s ease}.nav a:hover{background:#121820;color:#f4f4f1;transform:translateX(1px)}.nav a.active{background:linear-gradient(90deg,rgba(247,173,78,.22),rgba(247,173,78,.09));color:var(--tt-gold);box-shadow:inset 3px 0 0 var(--tt-gold),inset 0 0 0 1px rgba(247,173,78,.34)}.nav .badge{background:var(--tt-gold);color:#16110a;box-shadow:0 0 0 3px rgba(247,173,78,.09)}
.automate-card{border-color:#2c323a;background:linear-gradient(145deg,#0e1319,#10161d);box-shadow:none}.automate-card::after{color:var(--tt-gold)}.automate-card strong{color:var(--tt-gold)}.automate-card b{font-family:"Space Grotesk",sans-serif}.automate-card p{color:#8a919b}.admin{border-color:var(--tt-line)}.admin-avatar{background:linear-gradient(145deg,#41331f,#231b11);border:1px solid rgba(247,173,78,.44);color:var(--tt-gold)}
.main{padding:20px 22px 28px;min-width:0}
.command-header{min-height:76px;margin:0 0 18px;border:0;border-bottom:1px solid var(--tt-line);border-radius:0;background:transparent;padding:0 0 16px;gap:14px}.command-title{min-width:420px}.command-title h1{font-family:"Space Grotesk",sans-serif;font-size:31px;line-height:1.08;letter-spacing:-.035em}.command-title p{font-size:13px;color:#8f96a0;margin-top:7px}.command-search{width:min(340px,29vw);height:42px;border:1px solid var(--tt-line-strong);border-radius:10px;background:#0b0f14;color:var(--tt-muted);display:flex;align-items:center;gap:9px;padding:0 12px;transition:border-color .16s ease,background .16s ease,box-shadow .16s ease}.command-search:focus-within{border-color:rgba(247,173,78,.55);background:#0e1318;box-shadow:0 0 0 3px rgba(247,173,78,.08)}.command-search span{color:#737b87;font-size:16px}.command-search input{border:0;outline:0;background:transparent;color:var(--tt-text);width:100%;font-size:11px}.command-search input::placeholder{color:#69717d}.integration-strip{display:none}.bell{height:42px;width:42px;border:1px solid var(--tt-line);border-radius:50%;background:#0c1015;color:#a8afb9}
.workspace-shell{grid-template-columns:1fr !important;gap:14px}.hero-command{display:none !important}.left-stack,.detail-panel{min-width:0}.detail-panel{position:static !important;margin-top:2px}
.metric-grid{grid-template-columns:repeat(5,minmax(0,1fr));gap:12px;margin-bottom:14px}.metric-card{min-height:126px;border:1px solid var(--tt-line);border-radius:var(--tt-radius);background:linear-gradient(180deg,#0f141a,#0b0f14);padding:18px;gap:14px;box-shadow:none;transition:transform .16s ease,border-color .16s ease,background .16s ease}.metric-card:hover{transform:translateY(-1px);border-color:#343b44;background:#11161c}.metric-icon,.metric-card:nth-child(3) .metric-icon,.metric-card:nth-child(4) .metric-icon,.metric-card:nth-child(5) .metric-icon{width:44px;height:44px;border-radius:10px;background:linear-gradient(180deg,rgba(247,173,78,.16),rgba(247,173,78,.08));border:1px solid rgba(247,173,78,.17);color:var(--tt-gold);font-size:18px}.metric-copy span{font-size:11px;color:#a3a9b2}.metric-copy strong{font-family:"Space Grotesk",sans-serif;font-size:26px;letter-spacing:-.03em;margin-top:5px}.metric-copy small{font-size:9px;color:var(--tt-green);margin-top:5px}
.panel,.detail-card{border:1px solid var(--tt-line);border-radius:var(--tt-radius);background:linear-gradient(180deg,#0d1218,#090d12);box-shadow:none}.panel-title{height:52px;padding:0 16px;border-color:var(--tt-line)}.panel-title h3,.detail-card-head h3{font-family:"Space Grotesk",sans-serif;font-size:14px;letter-spacing:-.01em}.panel-title small{color:#8e959f;font-size:9px}.pipeline-overview{margin-bottom:14px}.pipeline-cards{grid-template-columns:repeat(7,minmax(0,1fr));gap:6px;padding:14px}.pipe-stage{min-height:66px;border-color:#2c3239;border-radius:8px;background:#11161c;padding:10px 12px;gap:10px;transition:background .16s ease,border-color .16s ease,transform .16s ease}.pipe-stage:hover{transform:translateY(-1px);border-color:#3b424c}.pipe-stage:not(:last-child)::after{color:#5e6671}.pipe-icon{width:30px;height:30px;background:#1a2028;border-color:#39414b;color:#aab0b8}.pipe-stage:first-child{background:linear-gradient(135deg,var(--tt-gold-2),var(--tt-gold));border-color:#ffc878;color:#17110a}.pipe-stage:first-child .pipe-icon{background:rgba(21,16,10,.86);border-color:rgba(21,16,10,.18);color:var(--tt-gold)}.pipe-stage:first-child span,.pipe-stage:first-child strong{color:#17110a}.pipe-stage.approved .pipe-icon{background:#161d1d;border-color:#3f6b58;color:#77dcb2}.pipe-stage.won{background:linear-gradient(180deg,#0f281f,#0d211b);border-color:#2c7558}.pipe-stage.won .pipe-icon{background:#113027;border-color:#3e8d6c;color:var(--tt-green)}.pipe-stage.qualified .pipe-icon{background:#231e16;border-color:#6a5230;color:#eeb968}.pipe-stage span{font-size:9px;color:#979ea8}.pipe-stage strong{font-family:"Space Grotesk",sans-serif;font-size:14px;color:#f3f2ee}
.recent-leads{margin-bottom:14px}.lead-toolbar{gap:8px}.search-box,.filter-btn{height:34px;border-color:#303741;background:#0c1117;color:#d5d7da}.search-box{width:250px}.search-box:focus{border-color:rgba(247,173,78,.55)}.lead-table th{padding:10px 12px;color:#747c88;border-color:#1d232a;font-size:8px;letter-spacing:.04em}.lead-table td{padding:11px 12px;border-color:#1a2027;color:#b8bdc5;font-size:9px}.lead-table tr{transition:background .14s ease}.lead-table tbody tr:hover{background:#11171e}.lead-table tr.selected{background:linear-gradient(90deg,rgba(247,173,78,.08),rgba(247,173,78,.02));box-shadow:inset 2px 0 0 var(--tt-gold)}.avatar{background:#20262e;border:1px solid #343c46;color:#d8dce0}.business-cell strong{color:#f2f1ed;font-size:9px}.business-cell span{color:#757d89}.score-chip{border-color:#486554;color:#9be3c2;background:#101d18}.stage-pill{border-color:#333a43;background:#141a21;color:#b5bbc3}.stage-pill.approved{border-color:#2d6d54;background:#10231c;color:#7edbb4}.stage-pill.demo{border-color:#745b33;background:#221a10;color:#e8b967}.stage-pill.qualified{border-color:#65503a;background:#201912;color:#d8ae77}.stage-pill.won{border-color:#36765b;background:#10271f;color:#8ee0bd}.row-action,.btn-orange,.btn-small.accent{background:linear-gradient(180deg,var(--tt-gold-2),var(--tt-gold));color:#17110a;border-color:#f8bd6c;box-shadow:0 8px 20px rgba(247,173,78,.12)}.row-action:hover,.btn-orange:hover,.btn-small.accent:hover{filter:brightness(1.04);transform:translateY(-1px)}.row-link{color:#dcb479}.btn-ghost,.btn-small,.filter-btn,.edit-btn,.icon-button,.stage-control select,.card-footer-btn{background:#10151b;border-color:#333a44;color:#d7dade}.btn-ghost:hover,.btn-small:hover,.filter-btn:hover,.edit-btn:hover,.icon-button:hover,.card-footer-btn:hover{background:#151b22;border-color:#454d58}
.bottom-panels{display:grid;grid-template-columns:1.45fr .9fr;gap:14px;margin-bottom:14px}.agent-grid{padding:0 8px 8px}.agent-row,.integration-row{border-color:#1d242c;background:transparent}.agent-icon{background:#1d232b;border:1px solid #333b45;color:var(--tt-gold)}.agent-state{color:var(--tt-green)}.integration-icon{background:rgba(247,173,78,.09);color:var(--tt-gold);border:1px solid rgba(247,173,78,.12)}
.agent-inbox-panel{margin:0 0 14px;overflow:hidden}.agent-inbox-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;padding:14px}.agent-inbox-item{min-height:82px;border:1px solid #242b33;border-radius:10px;background:#0f141a;padding:12px;display:flex;gap:10px;align-items:flex-start}.agent-inbox-icon{width:34px;height:34px;border-radius:9px;display:grid;place-items:center;background:rgba(247,173,78,.1);border:1px solid rgba(247,173,78,.16);color:var(--tt-gold);font-size:14px;flex:0 0 auto}.agent-inbox-copy strong{display:block;font-size:10px;color:#eeede9}.agent-inbox-copy span{display:block;font-size:8px;line-height:1.45;color:#7e8690;margin-top:4px}.agent-inbox-item.ready .agent-inbox-icon{background:rgba(69,213,151,.08);border-color:rgba(69,213,151,.18);color:var(--tt-green)}
.detail-panel{border:1px solid var(--tt-line);border-radius:var(--tt-radius);background:#090d12;overflow:hidden}.detail-toolbar{background:#0c1117;border-color:var(--tt-line)}.detail-head{background:linear-gradient(180deg,#0d1218,#0a0e13);border-color:var(--tt-line)}.detail-avatar{background:#1a2027;border:1px solid #343c46;color:var(--tt-gold)}.detail-name h2{font-family:"Space Grotesk",sans-serif}.lead-tabs{background:#0b0f14;border-color:var(--tt-line)}.lead-tabs a{color:#8f969f}.lead-tabs a.active{color:var(--tt-gold);border-color:var(--tt-gold)}.detail-content{background:#080b0f}.detail-card-head{border-color:var(--tt-line)}.score-ring{background:conic-gradient(var(--tt-green) calc(var(--score)*1%),#1a2027 0)}.demo-thumb{background:linear-gradient(145deg,#161c22,#0d1116);border-color:#2c333c}.track-dot{border-color:#555e69}.track-node.done .track-dot,.track-node.current .track-dot{background:var(--tt-gold);border-color:var(--tt-gold)}.track-node.current span{color:var(--tt-gold)}.field-input,.field-textarea{background:#0c1116;border-color:#2c333b;color:#e6e6e2}.personalization{background:#0d1318;border-color:#242b33}.personalization li::marker{color:var(--tt-green)}
@media(max-width:1280px){.metric-grid{grid-template-columns:repeat(3,1fr)}.metric-card:nth-child(4),.metric-card:nth-child(5){min-height:104px}.command-title{min-width:300px}.command-search{width:280px}.bottom-panels{grid-template-columns:1fr}}
@media(max-width:1040px){:root{--sidebar:220px}.main{padding:16px}.metric-grid{grid-template-columns:repeat(2,1fr)}.pipeline-cards{grid-template-columns:repeat(4,1fr)}.agent-inbox-grid{grid-template-columns:1fr}.command-search{display:none}}
@media(max-width:860px){.main{padding:12px}.command-header{padding:0 0 12px}.command-title h1{font-size:24px}.command-title p{font-size:11px}.metric-grid{grid-template-columns:1fr 1fr}.metric-card{min-height:98px;padding:13px}.pipeline-cards{grid-template-columns:1fr 1fr}.bottom-panels{grid-template-columns:1fr}.sidebar{border-radius:0 14px 14px 0}.detail-panel{margin-top:0}}
@media(max-width:560px){.main{padding:10px}.metric-grid{grid-template-columns:1fr}.metric-card{min-height:86px}.pipeline-cards{grid-template-columns:1fr}.panel-title{height:auto;min-height:48px;gap:8px;padding:9px 12px}.lead-toolbar{width:100%}.search-box{width:100%}.filter-btn{flex:0 0 auto}.agent-inbox-grid{padding:10px}}
@media(prefers-reduced-motion:reduce){*,*::before,*::after{scroll-behavior:auto!important;transition-duration:.01ms!important;animation-duration:.01ms!important;animation-iteration-count:1!important}}
`;

const BRAND_SEARCH = `<label class="command-search"><span aria-hidden="true">⌕</span><input aria-label="Search leads, businesses, or actions" placeholder="Search leads, businesses, or actions..." oninput="filterLeads(this.value)"></label>`;
const AGENT_INBOX = `<section class="panel agent-inbox-panel" id="inbox"><div class="panel-title"><h3>Agent Inbox</h3><small>Internal operations</small></div><div class="agent-inbox-grid"><div class="agent-inbox-item ready"><div class="agent-inbox-icon">✓</div><div class="agent-inbox-copy"><strong>Handoffs</strong><span>The dashboard is ready to surface Scout → Auditor → Designer → Sales handoffs once the internal message bus is enabled.</span></div></div><div class="agent-inbox-item"><div class="agent-inbox-icon">◇</div><div class="agent-inbox-copy"><strong>Approvals</strong><span>Customer outreach continues to require explicit human approval before Zoho can send.</span></div></div><div class="agent-inbox-item"><div class="agent-inbox-icon">!</div><div class="agent-inbox-copy"><strong>Blocked work</strong><span>Agent blockers and exceptions will appear here instead of being hidden inside email threads.</span></div></div></div></section>`;

export function applyBrandRefresh(html: string): string {
  let refreshed = applyBrandLogo(html);
  if (refreshed.includes('data-brand-refresh="2026"')) return refreshed;

  refreshed = refreshed.replace("</head>", `<style data-brand-refresh="2026">${BRAND_THEME_CSS}</style></head>`);
  refreshed = refreshed.replace('<div class="integration-strip">', `${BRAND_SEARCH}<div class="integration-strip">`);
  refreshed = refreshed.replace('<span id="inbox"></span>', AGENT_INBOX);
  return refreshed;
}

let installed = false;

export function installBrandResponseTransform(): void {
  if (installed) return;
  const responsePrototype = express.response as any;
  const originalSend = responsePrototype.send;
  responsePrototype.send = function brandedSend(body: unknown) {
    const transformed = typeof body === "string" ? applyBrandRefresh(body) : body;
    return originalSend.call(this, transformed);
  };
  installed = true;
}

installBrandResponseTransform();
