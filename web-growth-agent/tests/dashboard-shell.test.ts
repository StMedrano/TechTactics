import { describe, expect, it } from "vitest";
import { applyBrandRefresh } from "../src/brand.js";
import {
  buildDashboardViewModel,
  parseDashboardPage,
  type DashboardPage,
} from "../src/dashboard-model.js";
import { renderDashboardShell } from "../src/dashboard-shell.js";

function render(pathname = "/"): string {
  const page = parseDashboardPage(pathname) as DashboardPage;
  const model = buildDashboardViewModel([], page);
  return renderDashboardShell(
    model,
    '<section aria-label="Fixture">A very long business name that must wrap without covering actions</section>',
  );
}

describe("dashboard shell", () => {
  it("renders grouped real-route navigation with one active desktop page", () => {
    const html = render("/pipeline");

    for (const href of [
      "/",
      "/leads",
      "/pipeline",
      "/previews",
      "/inbox",
      "/agents",
      "/accounting",
      "/legal",
      "/integrations",
      "/settings",
    ]) {
      expect(html).toContain(`href="${href}"`);
    }
    expect(html).toContain("Workspace");
    expect(html).toContain("Operations");
    expect(html).toContain("System");
    expect(html.match(/data-desktop-nav[^>]*aria-current="page"/g)).toHaveLength(1);
    expect(html).toMatch(
      /data-desktop-nav[^>]*href="\/pipeline"[^>]*aria-current="page"/,
    );
  });

  it("integrates the approved brand system without a second response transform", () => {
    const html = render();
    const refreshed = applyBrandRefresh(html);

    expect(html).toContain('data-brand-refresh="2026"');
    expect(html).toContain('class="brand-logo"');
    expect(html).toContain("techtactics-logo.png");
    expect(html).toContain("--tt-black:#030407");
    expect(html).toContain("--tt-slate:#384358");
    expect(html).toContain("--tt-gold:#F7AD4E");
    expect(refreshed).toBe(html);
  });

  it("provides a four-item mobile bar and an accessible closed More sheet", () => {
    const html = render("/leads");

    expect(html).toContain('aria-label="Primary mobile navigation"');
    expect(html.match(/data-mobile-primary/g)).toHaveLength(4);
    expect(html).toContain('data-more-toggle aria-expanded="false"');
    expect(html).toContain('data-more-sheet hidden');
    expect(html).toContain('aria-label="All command center pages"');
    expect(html).toContain("Previews");
    expect(html).toContain("Settings");
    expect(html).toContain("if(event.key==='Escape')closeMoreSheet()");
  });

  it("marks More as the current mobile destination on secondary pages", () => {
    const html = render("/previews");

    expect(html).toMatch(
      /data-more-toggle[^>]*aria-current="page"/,
    );
  });

  it("locks in readable, reduced-motion, and narrow-screen behavior", () => {
    const html = render();

    expect(html).toContain("min-height:44px");
    expect(html).toContain("220ms cubic-bezier(.23,1,.32,1)");
    expect(html).toContain("@media(prefers-reduced-motion:reduce)");
    expect(html).toContain("overflow-wrap:anywhere");
    expect(html).toContain("grid-template-columns:minmax(0,1fr)");
    expect(html).toContain("padding-bottom:calc(92px + env(safe-area-inset-bottom))");
  });

  it("does not force the document root wider than a narrow layout viewport", () => {
    const html = render();

    expect(html).not.toContain("html{min-width:320px");
    expect(html).not.toContain("body{min-width:320px");
  });
});
