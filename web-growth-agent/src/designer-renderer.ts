import type {
  WebsiteDesignSection,
  WebsiteDesignSpec
} from "./design-spec.js";

import type {
  Lead,
  SalesAssets
} from "./types.js";

import {
  escapeHtml
} from "./utils.js";

const palettes = {
  "professional-light": {
    background:
      "#f7f9fc",
    surface:
      "#ffffff",
    text:
      "#142033",
    muted:
      "#536176",
    accent:
      "#174ea6",
    accentText:
      "#ffffff",
    border:
      "#dce3ec"
  },

  "professional-dark": {
    background:
      "#07111f",
    surface:
      "#0d1c30",
    text:
      "#f5f8ff",
    muted:
      "#a7b5c9",
    accent:
      "#ff9c3b",
    accentText:
      "#17120c",
    border:
      "#264360"
  },

  "warm-local": {
    background:
      "#fbf8f2",
    surface:
      "#ffffff",
    text:
      "#282117",
    muted:
      "#685e50",
    accent:
      "#a84d08",
    accentText:
      "#ffffff",
    border:
      "#e7ded0"
  },

  "high-contrast": {
    background:
      "#ffffff",
    surface:
      "#ffffff",
    text:
      "#000000",
    muted:
      "#292929",
    accent:
      "#0037d6",
    accentText:
      "#ffffff",
    border:
      "#000000"
  }
} as const;

const radii = {
  square:
    "0px",

  soft:
    "10px",

  rounded:
    "20px"
} as const;

const typography = {
  "system-modern":
    'ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif',

  "system-editorial":
    'Georgia,"Times New Roman",serif',

  "system-technical":
    'ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,"Liberation Mono",monospace'
} as const;

function safeTel(
  value: string
): string {
  return value.replace(
    /[^0-9+(). -]/g,
    ""
  );
}

function safeEmail(
  value: string
): string {
  return value.replace(
    /[^a-zA-Z0-9@._+\-]/g,
    ""
  );
}

function contactActions(
  lead: Lead,
  design:
    WebsiteDesignSpec
): string {
  const actions:
    string[] =
      [];

  if (
    lead.phone
  ) {
    actions.push(
      `<a class="button" href="tel:${escapeHtml(
        safeTel(
          lead.phone
        )
      )}">${escapeHtml(
        design.hero.primaryCta
      )}</a>`
    );
  } else if (
    lead.contactEmail
  ) {
    actions.push(
      `<a class="button" href="mailto:${escapeHtml(
        safeEmail(
          lead.contactEmail
        )
      )}">${escapeHtml(
        design.hero.primaryCta
      )}</a>`
    );
  } else {
    actions.push(
      `<a class="button" href="#contact">${escapeHtml(
        design.hero.primaryCta
      )}</a>`
    );
  }

  if (
    lead.contactEmail &&
    lead.phone
  ) {
    actions.push(
      `<a class="button secondary" href="mailto:${escapeHtml(
        safeEmail(
          lead.contactEmail
        )
      )}">${
        design.hero.secondaryCta
          ? escapeHtml(
              design.hero.secondaryCta
            )
          : "Email Us"
      }</a>`
    );
  } else if (
    design.hero.secondaryCta
  ) {
    actions.push(
      `<a class="button secondary" href="#services">${escapeHtml(
        design.hero.secondaryCta
      )}</a>`
    );
  }

  return actions.join(
    "\n"
  );
}

function renderVerifiedTrust(
  lead: Lead
): string {
  const facts:
    string[] =
      [];

  if (
    lead.address
  ) {
    facts.push(
      `<div class="trust-item">
        <strong>Location</strong>
        <span>${escapeHtml(
          lead.address
        )}</span>
      </div>`
    );
  }

  if (
    typeof lead.rating ===
      "number"
  ) {
    const reviews =
      typeof lead.ratingCount ===
        "number"
        ? ` from ${escapeHtml(
            String(
              lead.ratingCount
            )
          )} recorded reviews`
        : "";

    facts.push(
      `<div class="trust-item">
        <strong>Recorded rating</strong>
        <span>${escapeHtml(
          String(
            lead.rating
          )
        )}${reviews}</span>
      </div>`
    );
  }

  if (
    lead.phone
  ) {
    facts.push(
      `<div class="trust-item">
        <strong>Phone</strong>
        <span>${escapeHtml(
          lead.phone
        )}</span>
      </div>`
    );
  }

  if (
    !facts.length
  ) {
    return "";
  }

  return `
<section class="section">
  <div class="wrap">
    <p class="eyebrow">Verified</p>
    <h2>Verified business information</h2>
    <div class="trust-grid">
      ${facts.join("\n")}
    </div>
  </div>
</section>`;
}

function renderItems(
  items:
    string[] | undefined
): string {
  if (
    !items?.length
  ) {
    return "";
  }

  return `
<div class="grid">
  ${items
    .map(
      item =>
        `<article class="card"><p>${escapeHtml(
          item
        )}</p></article>`
    )
    .join("\n")}
</div>`;
}

function renderSection(
  section:
    WebsiteDesignSection,
  lead:
    Lead,
  assets:
    SalesAssets,
  design:
    WebsiteDesignSpec
): string {
  const title =
    escapeHtml(
      section.title
    );

  const body =
    section.body
      ? `<p class="section-copy">${escapeHtml(
          section.body
        )}</p>`
      : "";

  switch (
    section.type
  ) {
    case "services":
      return `
<section class="section" id="services">
  <div class="wrap">
    <p class="eyebrow">Services</p>
    <h2>${title}</h2>
    ${body}
    <div class="grid">
      ${assets.demoServices
        .slice(
          0,
          6
        )
        .map(
          service => `
      <article class="card">
        <h3>${escapeHtml(
          service
        )}</h3>
        <p>Concept content. Final service wording requires client confirmation.</p>
      </article>`
        )
        .join(
          "\n"
        )}
    </div>
  </div>
</section>`;

    case "about":
      return `
<section class="section">
  <div class="wrap prose">
    <p class="eyebrow">About</p>
    <h2>${title}</h2>
    ${
      body ||
      `<p class="section-copy">${escapeHtml(
        assets.businessSummary
      )}</p>`
    }
  </div>
</section>`;

    case "process":
      return `
<section class="section">
  <div class="wrap">
    <p class="eyebrow">Process</p>
    <h2>${title}</h2>
    ${body}
    ${renderItems(
      section.items
    )}
  </div>
</section>`;

    case "verified-trust":
      /*
       * The section body and items are intentionally ignored.
       * Only verified lead fields may become trust evidence.
       */
      return renderVerifiedTrust(
        lead
      );

    case "call-to-action":
      return `
<section class="section">
  <div class="wrap">
    <div class="cta">
      <h2>${title}</h2>
      ${body}
      <div class="actions">
        ${contactActions(
          lead,
          design
        )}
      </div>
    </div>
  </div>
</section>`;

    case "contact":
      return `
<section class="section" id="contact">
  <div class="wrap">
    <div class="cta">
      <p class="eyebrow">Contact</p>
      <h2>${title}</h2>
      ${body}
      <div class="actions">
        ${contactActions(
          lead,
          design
        )}
      </div>
    </div>
  </div>
</section>`;
  }
}

export function renderWebsitePreview(
  lead:
    Lead,
  assets:
    SalesAssets,
  design:
    WebsiteDesignSpec
): string {
  const colors =
    palettes[
      design.theme.palette
    ];

  const radius =
    radii[
      design.theme.radius
    ];

  const font =
    typography[
      design.theme.typography
    ];

  const business =
    escapeHtml(
      lead.businessName
    );

  const address =
    lead.address
      ? escapeHtml(
          lead.address
        )
      : "";

  const sections =
    design.sections
      .map(
        section =>
          renderSection(
            section,
            lead,
            assets,
            design
          )
      )
      .join(
        "\n"
      );

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow">
<title>${business} — TechTactics concept preview</title>
<style>
:root{
  font-family:${font};
  color-scheme:light dark;
  --background:${colors.background};
  --surface:${colors.surface};
  --text:${colors.text};
  --muted:${colors.muted};
  --accent:${colors.accent};
  --accent-text:${colors.accentText};
  --border:${colors.border};
  --radius:${radius};
}
*{
  box-sizing:border-box;
}
html{
  scroll-behavior:smooth;
}
body{
  margin:0;
  background:var(--background);
  color:var(--text);
}
a,
button{
  font:inherit;
}
a:focus-visible,
button:focus-visible{
  outline:3px solid var(--accent);
  outline-offset:3px;
}
.wrap{
  width:min(1120px,calc(100% - 40px));
  margin-inline:auto;
}
.concept{
  padding:10px 20px;
  text-align:center;
  background:#111827;
  color:#ffffff;
  font-size:14px;
}
header{
  padding:24px 0;
  background:var(--surface);
  border-bottom:1px solid var(--border);
}
.nav{
  display:flex;
  align-items:center;
  justify-content:space-between;
  gap:20px;
}
.brand{
  font-size:20px;
  font-weight:800;
}
.muted{
  color:var(--muted);
}
.hero{
  padding:88px 0;
}
.eyebrow{
  margin:0 0 10px;
  color:var(--accent);
  font-size:13px;
  font-weight:800;
  letter-spacing:.08em;
  text-transform:uppercase;
}
h1{
  max-width:900px;
  margin:0 0 22px;
  font-size:clamp(42px,7vw,76px);
  line-height:.98;
  letter-spacing:-.04em;
}
h2{
  margin:0 0 14px;
  font-size:clamp(28px,4vw,44px);
  line-height:1.08;
}
h3{
  margin-top:0;
}
.lead{
  max-width:720px;
  color:var(--muted);
  font-size:20px;
  line-height:1.6;
}
.actions{
  display:flex;
  flex-wrap:wrap;
  gap:12px;
  margin-top:28px;
}
.button{
  display:inline-flex;
  min-height:48px;
  align-items:center;
  justify-content:center;
  padding:0 18px;
  border:1px solid transparent;
  border-radius:var(--radius);
  background:var(--accent);
  color:var(--accent-text);
  font-weight:800;
  text-decoration:none;
  transition:
    transform 160ms ease-out,
    opacity 160ms ease-out;
}
.button:hover{
  transform:translateY(-1px);
}
.button:active{
  transform:translateY(0);
  opacity:.88;
}
.button.secondary{
  border-color:var(--border);
  background:var(--surface);
  color:var(--text);
}
.section{
  padding:72px 0;
}
.section-copy,
.prose p{
  max-width:760px;
  color:var(--muted);
  line-height:1.7;
}
.grid{
  display:grid;
  grid-template-columns:repeat(3,minmax(0,1fr));
  gap:18px;
  margin-top:28px;
}
.card,
.trust-item{
  padding:24px;
  border:1px solid var(--border);
  border-radius:var(--radius);
  background:var(--surface);
}
.card p{
  color:var(--muted);
  line-height:1.6;
}
.trust-grid{
  display:grid;
  grid-template-columns:repeat(3,minmax(0,1fr));
  gap:12px;
  margin-top:24px;
}
.trust-item{
  display:flex;
  flex-direction:column;
  gap:8px;
}
.trust-item span{
  color:var(--muted);
  line-height:1.5;
}
.cta{
  padding:38px;
  border:1px solid var(--border);
  border-radius:var(--radius);
  background:var(--surface);
}
footer{
  padding:40px 0;
  color:var(--muted);
  font-size:14px;
}
@media(max-width:760px){
  .wrap{
    width:min(100% - 28px,1120px);
  }
  .nav{
    align-items:flex-start;
    flex-direction:column;
  }
  .hero{
    padding:60px 0;
  }
  .lead{
    font-size:18px;
  }
  .grid,
  .trust-grid{
    grid-template-columns:1fr;
  }
  .section{
    padding:52px 0;
  }
  .cta{
    padding:26px;
  }
}
@media(prefers-reduced-motion:reduce){
  html{
    scroll-behavior:auto;
  }
  *,
  *::before,
  *::after{
    animation-duration:.01ms!important;
    animation-iteration-count:1!important;
    transition-duration:.01ms!important;
  }
}
</style>
</head>
<body>
<div class="concept">Private concept preview created by TechTactics — this is not an official ${business} website.</div>

<header>
  <div class="wrap nav">
    <div class="brand">${business}</div>
    <div class="muted">${address}</div>
  </div>
</header>

<main>
<section class="hero">
  <div class="wrap">
    ${
      design.hero.eyebrow
        ? `<p class="eyebrow">${escapeHtml(
            design.hero.eyebrow
          )}</p>`
        : ""
    }

    <h1>${escapeHtml(
      design.hero.headline
    )}</h1>

    <p class="lead">${escapeHtml(
      design.hero.subheadline
    )}</p>

    <div class="actions">
      ${contactActions(
        lead,
        design
      )}
    </div>
  </div>
</section>

${sections}
</main>

<footer>
  <div class="wrap">
    TechTactics concept preview. All business facts and final copy require client confirmation before publication.
  </div>
</footer>
</body>
</html>`;
}
