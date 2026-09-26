import { describe, expect, it } from "vitest";
import { applyBrandRefresh } from "../src/brand.js";

const shell = `<!doctype html><html><head><title>Dashboard</title></head><body>
<div class="brand-block"><div class="brand-mark">TT</div></div>
<header class="command-header"><div class="command-title"><h1>Web Growth Command Center</h1><p>Find → Audit → Demo → Approve → Contact → Close</p></div><div class="integration-strip"></div></header>
<section class="hero-command">Hero</section>
</body></html>`;

describe("TechTactics 2026 brand refresh", () => {
  it("injects the black, slate, and gold operations-console theme", () => {
    const html = applyBrandRefresh(shell);

    expect(html).toContain('data-brand-refresh="2026"');
    expect(html).toContain("--tt-gold:#F7AD4E");
    expect(html).toContain("--tt-slate:#384358");
    expect(html).toContain("--tt-black:#030407");
    expect(html).toContain("Space Grotesk");
  });

  it("uses the real TechTactics logo and adds dashboard search", () => {
    const html = applyBrandRefresh(shell);

    expect(html).toContain("techtactics-logo.png");
    expect(html).toContain('class="brand-logo"');
    expect(html).toContain('class="command-search"');
    expect(html).toContain("Search leads, businesses, or actions");
  });

  it("keeps the command-center workflow wording and does not duplicate the theme", () => {
    const once = applyBrandRefresh(shell);
    const twice = applyBrandRefresh(once);

    expect(twice).toContain("Find → Audit → Demo → Approve → Contact → Close");
    expect(twice.match(/data-brand-refresh="2026"/g)).toHaveLength(1);
  });
});
