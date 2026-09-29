import type { DashboardPageId, DashboardViewModel } from "./dashboard-model.js";

const BRAND_LOGO_URL =
  "https://raw.githubusercontent.com/StMedrano/TechTactics/main/client/public/assets/techtactics-logo.png";

interface NavigationItem {
  id: Exclude<DashboardPageId, "lead">;
  href: string;
  label: string;
  glyph: string;
}

interface NavigationGroup {
  label: string;
  items: NavigationItem[];
}

const navigationGroups: NavigationGroup[] = [
  {
    label: "Workspace",
    items: [
      { id: "overview", href: "/", label: "Overview", glyph: "⌂" },
      { id: "leads", href: "/leads", label: "Leads", glyph: "◎" },
      { id: "pipeline", href: "/pipeline", label: "Pipeline", glyph: "▥" },
      { id: "previews", href: "/previews", label: "Previews", glyph: "◇" },
    ],
  },
  {
    label: "Operations",
    items: [
      { id: "inbox", href: "/inbox", label: "Inbox", glyph: "□" },
      { id: "agents", href: "/agents", label: "Agents", glyph: "✦" },
      { id: "accounting", href: "/accounting", label: "Accounting", glyph: "$" },
      { id: "legal", href: "/legal", label: "Legal", glyph: "§" },
    ],
  },
  {
    label: "System",
    items: [
      { id: "integrations", href: "/integrations", label: "Integrations", glyph: "↔" },
      { id: "settings", href: "/settings", label: "Settings", glyph: "⚙" },
    ],
  },
];

const moreItems = navigationGroups
  .flatMap((group) => group.items)
  .filter((item) => !["overview", "leads", "pipeline"].includes(item.id));

function isActive(model: DashboardViewModel, id: NavigationItem["id"]): boolean {
  if (model.page.id === "lead") return id === "leads";
  return model.page.id === id;
}

function desktopNavigation(model: DashboardViewModel): string {
  return navigationGroups
    .map(
      (group) => `<div class="nav-group">
        <div class="nav-label">${group.label}</div>
        ${group.items
          .map(
            (item) => `<a data-desktop-nav href="${item.href}"${
              isActive(model, item.id) ? ' aria-current="page"' : ""
            } class="nav-link">
              <span class="nav-glyph" aria-hidden="true">${item.glyph}</span>
              <span>${item.label}</span>
            </a>`,
          )
          .join("")}
      </div>`,
    )
    .join("");
}

function mobilePrimaryLink(
  model: DashboardViewModel,
  item: Pick<NavigationItem, "id" | "href" | "label" | "glyph">,
): string {
  const current = isActive(model, item.id);
  return `<a data-mobile-primary href="${item.href}" class="mobile-nav-item"${
    current ? ' aria-current="page"' : ""
  }><span aria-hidden="true">${item.glyph}</span><span>${item.label}</span></a>`;
}

const CSS = String.raw`
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Space+Grotesk:wght@500;600&display=swap');
:root{--tt-black:#030407;--tt-ink:#0b0d11;--tt-panel:#101319;--tt-panel-2:#141821;--tt-panel-3:#191e27;--tt-slate:#384358;--tt-line:#252c3b;--tt-line-strong:#343d50;--tt-text:#f7f8fa;--tt-muted:#98a2b1;--tt-muted-2:#7f8999;--tt-gold:#F7AD4E;--tt-gold-hover:#ffc06d;--tt-gold-soft:#1b160f;--tt-green:#64c9a3;--tt-green-soft:#0f201b;--tt-red:#ef7c75;--tt-red-soft:#261414;--tt-radius:12px;--sidebar:222px;color-scheme:dark;font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
*{box-sizing:border-box}html{background:var(--tt-black);scroll-behavior:smooth}body{min-height:100vh;margin:0;background:var(--tt-ink);color:var(--tt-text)}body.sheet-open{overflow:hidden}button,input,select,textarea{font:inherit}button,a,select{touch-action:manipulation}button{cursor:pointer}button:disabled{cursor:not-allowed;opacity:.52}a{color:inherit;text-decoration:none}img{max-width:100%}::selection{background:var(--tt-gold);color:#211508}:focus-visible{outline:2px solid var(--tt-gold);outline-offset:3px}.sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}[hidden]{display:none!important}
.app-shell{min-height:100vh;display:grid;grid-template-columns:var(--sidebar) minmax(0,1fr);background:var(--tt-ink)}.sidebar{position:sticky;top:0;height:100vh;display:flex;min-width:0;flex-direction:column;padding:18px 13px 16px;border-right:1px solid var(--tt-line);background:#080a0e}.brand-link{display:flex;min-height:58px;align-items:center;padding:0 8px 15px;border-bottom:1px solid var(--tt-line)}.brand-logo{display:block;width:174px;height:54px;object-fit:contain;object-position:left center}.brand-fallback{display:none;width:38px;height:38px;place-items:center;border:1px solid #7a572c;border-radius:9px;background:var(--tt-gold-soft);color:var(--tt-gold);font-family:"Space Grotesk",sans-serif;font-size:13px}.nav-group{margin-top:19px}.nav-label{padding:0 10px 7px;color:var(--tt-muted-2);font-size:11px;letter-spacing:.12em;text-transform:uppercase}.nav-link{display:flex;min-height:44px;align-items:center;gap:11px;margin:2px 0;padding:0 10px;border-radius:9px;color:#a9b2c1;font-size:13px;transition:background 140ms ease,color 140ms ease,transform 120ms ease}.nav-link:hover{background:#12161e;color:#fff}.nav-link:active{transform:scale(.985)}.nav-link[aria-current=page]{background:var(--tt-gold-soft);color:var(--tt-gold);box-shadow:inset 2px 0 0 var(--tt-gold)}.nav-glyph{display:grid;width:20px;height:20px;place-items:center;color:currentColor;font-size:14px}.sidebar-foot{margin-top:auto;padding:15px 10px 0;border-top:1px solid var(--tt-line)}.sidebar-foot strong{display:block;font-size:12px;font-weight:500}.sidebar-foot span{display:block;margin-top:4px;color:var(--tt-muted-2);font-size:11px;line-height:1.45}
.content-shell{min-width:0}.topbar{position:sticky;top:0;z-index:20;display:flex;min-height:70px;align-items:center;gap:14px;padding:11px 24px;border-bottom:1px solid var(--tt-line);background:rgba(11,13,17,.94);backdrop-filter:blur(14px)}.topbar-title{min-width:0;flex:1}.topbar-title span{display:block;color:var(--tt-muted-2);font-size:11px}.topbar-title strong{display:block;margin-top:3px;overflow:hidden;font-family:"Space Grotesk",sans-serif;font-size:18px;font-weight:500;letter-spacing:-.02em;text-overflow:ellipsis;white-space:nowrap}.command-search{display:flex;width:min(310px,31vw);min-height:42px;align-items:center;gap:8px;padding:0 12px;border:1px solid var(--tt-line-strong);border-radius:9px;background:#11141a;color:var(--tt-muted-2)}.command-search:focus-within{border-color:#76552e;box-shadow:0 0 0 3px rgba(247,173,78,.08)}.command-search input{width:100%;min-width:0;border:0;outline:0;background:transparent;color:var(--tt-text);font-size:12px}.topbar-action{display:grid;width:42px;min-width:42px;height:42px;place-items:center;border:1px solid var(--tt-line-strong);border-radius:9px;background:#11141a;color:#c4cad3}.owner-chip{display:flex;min-height:42px;align-items:center;gap:8px;padding:0 10px;border:1px solid var(--tt-line-strong);border-radius:9px;background:#11141a;color:#d8dde5;font-size:12px}.owner-avatar{display:grid;width:26px;height:26px;place-items:center;border-radius:50%;background:var(--tt-slate);color:#fff;font-size:10px}.page-main{width:min(1500px,100%);margin:0 auto;padding:26px 26px 42px}.page-heading{display:flex;align-items:flex-start;justify-content:space-between;gap:20px;margin-bottom:20px}.page-heading h1{margin:0;font-family:"Space Grotesk",sans-serif;font-size:28px;font-weight:500;letter-spacing:-.035em}.page-heading p{max-width:680px;margin:7px 0 0;color:var(--tt-muted);font-size:13px;line-height:1.55}.page-heading-actions{display:flex;gap:9px;flex-wrap:wrap;justify-content:flex-end}
.button,.button-secondary,.text-button,.icon-button{min-height:44px;border-radius:9px;font-size:12px;font-weight:500}.button{display:inline-flex;align-items:center;justify-content:center;gap:8px;padding:0 15px;border:1px solid var(--tt-gold);background:var(--tt-gold);color:#211508;transition:filter 140ms ease,transform 100ms ease}.button:hover{filter:brightness(1.06)}.button:active{transform:scale(.98)}.button-secondary{display:inline-flex;align-items:center;justify-content:center;padding:0 14px;border:1px solid var(--tt-line-strong);background:var(--tt-panel-2);color:#e6e9ef}.button-secondary:hover{border-color:#465168;background:#191e28}.text-button{display:inline-flex;align-items:center;padding:0 4px;border:0;background:transparent;color:var(--tt-gold)}.icon-button{display:grid;width:44px;place-items:center;border:1px solid var(--tt-line-strong);background:var(--tt-panel-2);color:#e6e9ef}.button-danger{border-color:#713f3b;background:var(--tt-red-soft);color:#f3a29d}
.surface{min-width:0;border:1px solid var(--tt-line);border-radius:var(--tt-radius);background:var(--tt-panel)}.section-head{display:flex;min-height:54px;align-items:center;justify-content:space-between;gap:12px;padding:0 16px;border-bottom:1px solid var(--tt-line)}.section-head h2,.section-head h3{margin:0;font-family:"Space Grotesk",sans-serif;font-size:15px;font-weight:500}.section-head small{color:var(--tt-muted-2);font-size:11px}.empty-state{padding:30px 20px;text-align:center}.empty-state strong{display:block;font-family:"Space Grotesk",sans-serif;font-size:17px;font-weight:500}.empty-state p{max-width:480px;margin:8px auto 0;color:var(--tt-muted);font-size:13px;line-height:1.55}.safe-note{display:flex;gap:10px;margin-top:14px;padding:14px 16px;border:1px solid #3f4c62;border-radius:10px;background:#151a22;color:#afb8c5;font-size:12px;line-height:1.55}.safe-note strong{color:var(--tt-text)}.safe-mark{color:var(--tt-gold);font-size:16px}.status{display:inline-flex;min-height:26px;align-items:center;padding:0 9px;border:1px solid #41506a;border-radius:999px;background:#151b25;color:#c2cad5;font-size:11px;white-space:nowrap}.status-attention{border-color:#7a572c;background:var(--tt-gold-soft);color:#f7c582}.status-ready{border-color:#285d4c;background:var(--tt-green-soft);color:#8cdbbd}.status-muted{border-color:#333a46;background:#141821;color:#8f99aa}.status-danger{border-color:#713f3b;background:var(--tt-red-soft);color:#f3a29d}
.kpi-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));border:1px solid var(--tt-line);border-radius:var(--tt-radius);background:var(--tt-panel)}.kpi{min-width:0;min-height:108px;padding:18px;border-right:1px solid var(--tt-line)}.kpi:last-child{border-right:0}.kpi-label{color:#929cac;font-size:12px}.kpi strong{display:block;margin-top:12px;font-family:"Space Grotesk",sans-serif;font-size:26px;font-weight:500;overflow-wrap:anywhere}.kpi small{display:block;margin-top:5px;color:var(--tt-muted-2);font-size:11px;line-height:1.4}.overview-grid{display:grid;grid-template-columns:minmax(0,1.25fr) minmax(270px,.75fr);gap:14px;margin-top:14px}.work-list{padding:3px 16px}.work-item{display:grid;grid-template-columns:34px minmax(0,1fr) auto;align-items:center;gap:12px;min-height:72px;border-bottom:1px solid var(--tt-line)}.work-item:last-child{border-bottom:0}.work-number{display:grid;width:30px;height:30px;place-items:center;border-radius:8px;background:var(--tt-gold-soft);color:var(--tt-gold);font-size:11px}.work-copy{min-width:0}.work-copy strong{display:block;overflow:hidden;color:#eef1f5;font-size:13px;font-weight:500;text-overflow:ellipsis;white-space:nowrap}.work-copy span{display:block;margin-top:5px;color:#8e98a8;font-size:11px;overflow-wrap:anywhere}.pipeline-mini{padding:14px 16px 17px}.pipeline-row{display:grid;grid-template-columns:82px minmax(0,1fr) 24px;align-items:center;gap:10px;min-height:39px;color:#929cac;font-size:11px}.pipeline-track{height:7px;overflow:hidden;border-radius:999px;background:#222938}.pipeline-fill{height:100%;border-radius:inherit;background:var(--tt-gold)}.pipeline-row strong{color:#e8ebf0;font-size:11px;font-weight:500;text-align:right}.health-note{display:flex;align-items:center;gap:8px;margin-top:14px;padding:13px 16px;border:1px solid #285d4c;border-radius:10px;background:var(--tt-green-soft);color:#9bd8c2;font-size:12px}
.toolbar{display:flex;flex-wrap:wrap;align-items:center;gap:10px;margin-bottom:14px}.toolbar-search{min-width:220px;min-height:44px;flex:1;padding:0 12px;border:1px solid var(--tt-line-strong);border-radius:9px;background:#11141a;color:#e9edf2}.table-wrap{overflow-x:auto}.data-table{width:100%;min-width:760px;border-collapse:collapse}.data-table th,.data-table td{padding:14px 16px;border-bottom:1px solid var(--tt-line);text-align:left}.data-table th{color:var(--tt-muted-2);font-size:10px;font-weight:500;letter-spacing:.08em;text-transform:uppercase}.data-table td{color:#bdc5d1;font-size:12px}.data-table tr:last-child td{border-bottom:0}.data-table tbody tr:hover{background:#131720}.business-name strong{display:block;color:#f3f5f8;font-weight:500}.business-name span{display:block;margin-top:4px;color:var(--tt-muted-2);font-size:11px}.mobile-card-list{display:none}.lead-card{padding:15px;border-bottom:1px solid var(--tt-line)}.lead-card:last-child{border-bottom:0}.lead-card-head{display:flex;align-items:flex-start;justify-content:space-between;gap:10px}.lead-card h2,.lead-card h3{min-width:0;margin:0;color:#f3f5f8;font-size:14px;font-weight:500;overflow-wrap:anywhere}.lead-card p{margin:5px 0 0;color:var(--tt-muted-2);font-size:11px;overflow-wrap:anywhere}.lead-card-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin:13px 0}.lead-card-grid div{min-width:0;padding:10px;border:1px solid var(--tt-line);border-radius:8px;background:#141821}.lead-card-grid span{display:block;color:var(--tt-muted-2);font-size:10px}.lead-card-grid strong{display:block;margin-top:4px;font-size:12px;overflow-wrap:anywhere}.card-actions{display:flex;gap:8px;flex-wrap:wrap}
.pipeline-board{display:grid;grid-template-columns:repeat(4,minmax(180px,1fr));gap:10px;overflow-x:auto}.pipeline-column{min-width:0;min-height:360px;padding:12px;border:1px solid var(--tt-line);border-radius:var(--tt-radius);background:#0f1218}.pipeline-column-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;color:#b9c1cd;font-size:12px}.pipeline-column-head strong{color:var(--tt-text);font-weight:500}.lead-tile{display:block;margin-bottom:9px;padding:13px;border:1px solid #2c3445;border-radius:10px;background:#151922}.lead-tile:hover{border-color:#465168}.lead-tile strong{display:block;color:#f2f4f7;font-size:12px;font-weight:500;overflow-wrap:anywhere}.lead-tile span{display:block;margin-top:5px;color:#8791a1;font-size:11px;line-height:1.45}.card-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}.content-card{min-width:0;padding:16px;border:1px solid #2a3242;border-radius:var(--tt-radius);background:#11151c}.content-card h2,.content-card h3{margin:0;font-family:"Space Grotesk",sans-serif;font-size:15px;font-weight:500;overflow-wrap:anywhere}.content-card p{margin:8px 0 0;color:var(--tt-muted);font-size:12px;line-height:1.55}.content-card-meta{display:flex;align-items:flex-start;justify-content:space-between;gap:10px}.preview-thumb{display:flex;min-height:125px;flex-direction:column;justify-content:flex-end;margin-bottom:14px;padding:14px;border:1px solid var(--tt-slate);border-radius:9px;background:linear-gradient(145deg,#172238,#111318 55%,#2b2115)}.preview-thumb strong{font-family:"Space Grotesk",sans-serif;font-size:15px;font-weight:500;overflow-wrap:anywhere}.preview-thumb span{margin-top:5px;color:#adb5c0;font-size:11px}.permission-list{display:grid;gap:10px}.permission-row{display:flex;min-height:58px;align-items:center;justify-content:space-between;gap:14px;padding:10px 14px;border:1px solid var(--tt-line);border-radius:10px;background:var(--tt-panel)}.permission-row strong{display:block;font-size:13px;font-weight:500}.permission-row span{display:block;margin-top:4px;color:var(--tt-muted-2);font-size:11px}.agent-icon{display:grid;width:38px;height:38px;place-items:center;margin-bottom:14px;border:1px solid #4a556b;border-radius:10px;background:#1b2230;color:var(--tt-gold)}
.workspace-grid{display:grid;grid-template-columns:minmax(0,1.12fr) minmax(330px,.88fr);gap:14px}.workspace-stack{display:grid;gap:14px}.workspace-section{padding:16px}.workspace-section h2{margin:0 0 14px;font-family:"Space Grotesk",sans-serif;font-size:16px;font-weight:500}.info-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.info-item{min-width:0;padding:11px;border:1px solid var(--tt-line);border-radius:9px;background:#141821}.info-item span{display:block;color:var(--tt-muted-2);font-size:10px}.info-item strong{display:block;margin-top:5px;font-size:12px;font-weight:500;overflow-wrap:anywhere}.score-block{display:flex;align-items:center;gap:16px}.score-ring{display:grid;width:86px;height:86px;flex:0 0 auto;place-items:center;border-radius:50%;background:radial-gradient(circle at center,var(--tt-panel) 59%,transparent 60%),conic-gradient(var(--tt-gold) calc(var(--score)*1%),#252c3b 0)}.score-ring strong{font-family:"Space Grotesk",sans-serif;font-size:23px;font-weight:500}.evidence-list{display:grid;gap:8px;margin:0;padding:0;list-style:none}.evidence-list li{padding-left:17px;position:relative;color:#bdc5d1;font-size:12px;line-height:1.5;overflow-wrap:anywhere}.evidence-list li::before{content:"";position:absolute;left:0;top:.55em;width:6px;height:6px;border-radius:50%;background:var(--tt-gold)}.stage-track{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:0;padding:6px 0}.stage-node{position:relative;min-width:0;text-align:center}.stage-node::before{content:"";position:absolute;top:8px;right:50%;left:-50%;height:2px;background:#313949}.stage-node:first-child::before{display:none}.stage-dot{position:relative;z-index:1;width:18px;height:18px;margin:0 auto;border:4px solid var(--tt-panel);border-radius:50%;background:#313949;box-shadow:0 0 0 1px #465168}.stage-node.done .stage-dot,.stage-node.current .stage-dot{background:var(--tt-gold);box-shadow:0 0 0 1px var(--tt-gold)}.stage-node.done::before,.stage-node.current::before{background:var(--tt-gold)}.stage-node span{display:block;margin-top:8px;color:var(--tt-muted-2);font-size:9px;overflow-wrap:anywhere}.stage-node.current span{color:var(--tt-gold)}.field{display:grid;gap:6px;margin-bottom:12px;color:var(--tt-muted);font-size:11px}.field input,.field textarea{width:100%;border:1px solid var(--tt-line-strong);border-radius:9px;background:#0d1015;color:var(--tt-text);padding:11px;font-size:12px}.field textarea{min-height:170px;resize:vertical;line-height:1.55}.action-bar{display:flex;flex-wrap:wrap;gap:9px}.inline-form{display:inline-flex;gap:8px;flex-wrap:wrap}.inline-form select{min-height:44px;padding:0 32px 0 11px;border:1px solid var(--tt-line-strong);border-radius:9px;background:#141821;color:var(--tt-text)}
.mobile-bottom-nav,.more-backdrop,.more-sheet{display:none}
@media(max-width:1120px){.card-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.pipeline-board{grid-template-columns:repeat(3,minmax(180px,1fr))}.workspace-grid{grid-template-columns:1fr}.command-search{width:240px}.owner-chip span:last-child{display:none}}
@media(max-width:860px){:root{--sidebar:0px}.app-shell{display:block}.sidebar{display:none}.topbar{min-height:64px;padding:10px 14px}.command-search,.owner-chip{display:none}.topbar-title strong{font-size:16px}.page-main{padding:20px 14px;padding-bottom:calc(92px + env(safe-area-inset-bottom))}.page-heading{display:block;margin-bottom:16px}.page-heading h1{font-size:25px}.page-heading-actions{justify-content:flex-start;margin-top:14px}.kpi-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.kpi:nth-child(2){border-right:0}.kpi:nth-child(-n+2){border-bottom:1px solid var(--tt-line)}.overview-grid{grid-template-columns:minmax(0,1fr)}.pipeline-board{grid-template-columns:repeat(2,minmax(180px,1fr))}.mobile-bottom-nav{position:fixed;right:0;bottom:0;left:0;z-index:50;display:grid;grid-template-columns:repeat(4,minmax(0,1fr));min-height:76px;padding:7px 8px calc(9px + env(safe-area-inset-bottom));border-top:1px solid #2a3242;background:rgba(13,16,21,.98);backdrop-filter:blur(16px)}.mobile-nav-item{display:flex;min-width:0;min-height:58px;flex-direction:column;align-items:center;justify-content:center;gap:5px;border:0;border-radius:10px;background:transparent;color:#8f99aa;font-size:11px}.mobile-nav-item[aria-current=page],.mobile-nav-item[aria-expanded=true]{background:var(--tt-gold-soft);color:var(--tt-gold)}.mobile-nav-item span:first-child{font-size:17px}.more-backdrop{position:fixed;inset:0;z-index:58;background:rgba(0,0,0,.58);opacity:0;transition:opacity 220ms cubic-bezier(.23,1,.32,1)}.more-backdrop.open{display:block;opacity:1}.more-sheet{position:fixed;right:10px;bottom:calc(82px + env(safe-area-inset-bottom));left:10px;z-index:60;display:block;max-height:min(72vh,560px);overflow:auto;padding:9px 14px 16px;border:1px solid #3d4658;border-radius:18px;background:#141820;box-shadow:0 -10px 32px rgba(0,0,0,.5);opacity:0;transform:translateY(14px) scale(.975);transform-origin:right bottom;transition:opacity 220ms cubic-bezier(.23,1,.32,1),transform 220ms cubic-bezier(.23,1,.32,1);pointer-events:none}.more-sheet.open{opacity:1;transform:translateY(0) scale(1);pointer-events:auto}.sheet-handle{width:38px;height:4px;margin:0 auto 10px;border-radius:999px;background:#4b5568}.sheet-head{display:flex;min-height:50px;align-items:center;justify-content:space-between}.sheet-head strong{font-family:"Space Grotesk",sans-serif;font-size:16px;font-weight:500}.sheet-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.sheet-link{display:flex;min-width:0;min-height:52px;align-items:center;gap:10px;padding:0 12px;border:1px solid #30394a;border-radius:10px;background:#191e27;color:#dce1e8;font-size:12px}.sheet-link[aria-current=page]{border-color:#7a572c;background:var(--tt-gold-soft);color:var(--tt-gold)}.sheet-link span:first-child{display:grid;width:20px;place-items:center}.sheet-context{margin-top:12px;padding:12px;border-radius:9px;background:#101319;color:#8f99aa;font-size:11px;line-height:1.5}}
@media(max-width:640px){.topbar-action{display:none}.page-heading h1{font-size:23px}.kpi{min-height:98px;padding:15px}.kpi strong{font-size:22px}.card-grid{grid-template-columns:1fr}.data-table{display:none}.mobile-card-list{display:block}.pipeline-board{grid-template-columns:minmax(0,1fr);overflow:visible}.pipeline-column{min-height:auto}.work-item{grid-template-columns:30px minmax(0,1fr)}.work-item .status{grid-column:2;justify-self:start;margin-bottom:10px}.info-grid{grid-template-columns:minmax(0,1fr)}.stage-track{overflow-x:auto;grid-template-columns:repeat(7,minmax(70px,1fr));padding-bottom:8px}.permission-row{align-items:flex-start;flex-direction:column}.lead-card-grid{grid-template-columns:minmax(0,1fr) minmax(0,1fr)}.lead-card-grid div:last-child{grid-column:1/-1}}
@media(max-width:360px){.page-main{padding-right:10px;padding-left:10px}.topbar{padding-right:10px;padding-left:10px}.kpi-grid{grid-template-columns:minmax(0,1fr)}.kpi{border-right:0;border-bottom:1px solid var(--tt-line)}.kpi:last-child{border-bottom:0}.sheet-grid{grid-template-columns:minmax(0,1fr)}.action-bar>*{width:100%}.inline-form{width:100%}.inline-form select{width:100%}}
@media(prefers-reduced-motion:reduce){html{scroll-behavior:auto}*,*::before,*::after{animation-duration:.01ms!important;animation-iteration-count:1!important;transition-duration:.01ms!important}}
`;

const CLIENT_SCRIPT = String.raw`
function setMoreSheet(open){
  const sheet=document.querySelector('[data-more-sheet]');
  const backdrop=document.querySelector('[data-more-backdrop]');
  const toggles=document.querySelectorAll('[data-more-toggle]');
  if(!sheet||!backdrop)return;
  sheet.hidden=false;backdrop.hidden=false;
  requestAnimationFrame(()=>{sheet.classList.toggle('open',open);backdrop.classList.toggle('open',open)});
  toggles.forEach(toggle=>toggle.setAttribute('aria-expanded',String(open)));
  document.body.classList.toggle('sheet-open',open);
  if(open){sheet.querySelector('a')?.focus()}else{setTimeout(()=>{sheet.hidden=true;backdrop.hidden=true},220)}
}
function openMoreSheet(){setMoreSheet(true)}
function closeMoreSheet(){setMoreSheet(false)}
function filterCurrentPage(value){const q=value.trim().toLowerCase();document.querySelectorAll('[data-searchable]').forEach(node=>{node.hidden=q!==''&&!(node.textContent||'').toLowerCase().includes(q)})}
async function approve(id){const response=await fetch('/api/leads/'+encodeURIComponent(id)+'/approve',{method:'POST'});if(!response.ok){alert(await response.text());return}location.reload()}
async function sendZoho(id){if(!confirm('Send the approved outreach email through Zoho now?'))return;const response=await fetch('/api/leads/'+encodeURIComponent(id)+'/send',{method:'POST'});if(!response.ok){alert(await response.text());return}location.reload()}
async function stage(id,next){if(!next)return;const response=await fetch('/api/leads/'+encodeURIComponent(id)+'/stage',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({stage:next})});if(!response.ok){alert(await response.text());return}location.reload()}
async function generateLead(id){const response=await fetch('/api/leads/'+encodeURIComponent(id)+'/generate',{method:'POST'});if(!response.ok){alert(await response.text());return}location.reload()}
async function restoreGeneratedPreview(id){const response=await fetch('/api/leads/'+encodeURIComponent(id)+'/restore-generated-preview',{method:'POST'});if(!response.ok){alert(await response.text());return}location.reload()}
async function uploadPreview(id,input){const file=input?.files?.[0];if(!file)return;const data=new FormData();data.append('site',file);const response=await fetch('/api/leads/'+encodeURIComponent(id)+'/upload-preview',{method:'POST',body:data});if(!response.ok){alert(await response.text());return}location.reload()}
document.querySelector('[data-more-toggle]')?.addEventListener('click',openMoreSheet);
document.querySelector('[data-more-close]')?.addEventListener('click',closeMoreSheet);
document.querySelector('[data-more-backdrop]')?.addEventListener('click',closeMoreSheet);
window.addEventListener('keydown',event=>{if(event.key==='Escape')closeMoreSheet()});
`;

export function renderDashboardShell(model: DashboardViewModel, body: string): string {
  const home = { id: "overview" as const, href: "/", label: "Home", glyph: "⌂" };
  const leads = { id: "leads" as const, href: "/leads", label: "Leads", glyph: "◎" };
  const pipeline = { id: "pipeline" as const, href: "/pipeline", label: "Pipeline", glyph: "▥" };
  const moreIsCurrent = !["overview", "leads", "lead", "pipeline"].includes(model.page.id);

  return `<!doctype html><html lang="en" data-brand-refresh="2026"><head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
    <meta name="color-scheme" content="dark">
    <title>${model.page.title} · TechTactics Web Growth</title>
    <style>${CSS}</style>
  </head><body>
    <div class="app-shell">
      <aside class="sidebar">
        <a class="brand-link" href="/" aria-label="TechTactics Web Growth home">
          <img class="brand-logo" src="${BRAND_LOGO_URL}" alt="TechTactics" onerror="this.style.display='none';this.nextElementSibling.style.display='grid'">
          <span class="brand-fallback" aria-hidden="true">TT</span>
        </a>
        <nav aria-label="Command center pages">${desktopNavigation(model)}</nav>
        <div class="sidebar-foot"><strong>Human supervised</strong><span>Approval and send stay separate.</span></div>
      </aside>
      <div class="content-shell">
        <header class="topbar">
          <div class="topbar-title"><span>Web Growth Command Center</span><strong>${model.page.title}</strong></div>
          <label class="command-search"><span aria-hidden="true">⌕</span><span class="sr-only">Search this page</span><input type="search" placeholder="Search this page" oninput="filterCurrentPage(this.value)"></label>
          <a class="topbar-action" href="/inbox" aria-label="Open inbox">□</a>
          <div class="owner-chip"><span class="owner-avatar">TT</span><span>Owner</span></div>
        </header>
        <main class="page-main" id="main-content">
          <header class="page-heading"><div><h1>${model.page.title}</h1><p>${model.page.description}</p></div></header>
          ${body}
        </main>
      </div>
    </div>
    <nav class="mobile-bottom-nav" aria-label="Primary mobile navigation">
      ${mobilePrimaryLink(model, home)}
      ${mobilePrimaryLink(model, leads)}
      ${mobilePrimaryLink(model, pipeline)}
      <button data-mobile-primary data-more-toggle aria-expanded="false"${moreIsCurrent ? ' aria-current="page"' : ""} class="mobile-nav-item" type="button"><span aria-hidden="true">•••</span><span>More</span></button>
    </nav>
    <button data-more-backdrop class="more-backdrop" type="button" aria-label="Close all pages" hidden></button>
    <section data-more-sheet hidden class="more-sheet" aria-label="All command center pages">
      <div class="sheet-handle" aria-hidden="true"></div>
      <div class="sheet-head"><strong>All pages</strong><button data-more-close class="icon-button" type="button" aria-label="Close all pages">×</button></div>
      <div class="sheet-grid">${moreItems
        .map(
          (item) => `<a class="sheet-link" href="${item.href}"${
            isActive(model, item.id) ? ' aria-current="page"' : ""
          }><span aria-hidden="true">${item.glyph}</span><span>${item.label}</span></a>`,
        )
        .join("")}</div>
      <div class="sheet-context">Primary work stays one tap away. Secondary areas live here.</div>
    </section>
    <script>${CLIENT_SCRIPT}</script>
  </body></html>`;
}
