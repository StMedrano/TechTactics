import {
  buildDashboardViewModel,
  parseDashboardPage,
  type DashboardCapabilities,
  type DashboardPage,
} from "./dashboard-model.js";
import { renderDashboardPage } from "./dashboard-pages.js";
import { renderDashboardShell } from "./dashboard-shell.js";
import type { Lead } from "./types.js";

function resolvePage(pageOrSelected?: DashboardPage | string): DashboardPage {
  if (typeof pageOrSelected === "string") {
    return (
      parseDashboardPage(`/leads/${encodeURIComponent(pageOrSelected)}`) ??
      (parseDashboardPage("/") as DashboardPage)
    );
  }
  return pageOrSelected ?? (parseDashboardPage("/") as DashboardPage);
}

export function renderDashboard(
  leads: Lead[],
  pageOrSelected?: DashboardPage | string,
  capabilities: Partial<DashboardCapabilities> = {},
): string {
  const page = resolvePage(pageOrSelected);
  const model = buildDashboardViewModel(leads, page, capabilities);
  return renderDashboardShell(model, renderDashboardPage(model));
}

export function renderNotFoundDashboard(leads: Lead[]): string {
  const page: DashboardPage = {
    id: "overview",
    path: "/",
    title: "Page not found",
    description: "The requested command-center page does not exist.",
  };
  const model = buildDashboardViewModel(leads, page);
  const body = `<section class="surface"><div class="empty-state"><strong>Page not found</strong><p>Use the command-center navigation to return to a working area.</p><p><a class="button-secondary" href="/">Return to Overview</a></p></div></section>`;
  return renderDashboardShell(model, body);
}
