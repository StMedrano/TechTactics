import express from "express";

export const BRAND_LOGO_URL = "https://raw.githubusercontent.com/StMedrano/TechTactics/main/client/public/assets/techtactics-logo.png";

const BRAND_MARK = '<div class="brand-mark">TT</div>';
const BRANDED_MARK = `<div class="brand-logo-wrap" style="position:relative;width:132px;height:42px;display:grid;place-items:center;flex:0 0 auto">
  <img class="brand-logo" src="${BRAND_LOGO_URL}" alt="TechTactics" style="display:block;max-width:132px;max-height:42px;object-fit:contain" onload="const copy=this.closest('.brand')?.querySelector('.brand-copy');if(copy)copy.style.display='none'" onerror="this.style.display='none';const fallback=this.nextElementSibling;if(fallback)fallback.style.display='grid'">
  <div class="brand-mark brand-fallback" style="display:none">TT</div>
</div>`;

export function applyBrandLogo(html: string): string {
  return html.includes(BRAND_MARK) ? html.replace(BRAND_MARK, BRANDED_MARK) : html;
}

let installed = false;

export function installBrandResponseTransform(): void {
  if (installed) return;
  const responsePrototype = express.response as any;
  const originalSend = responsePrototype.send;
  responsePrototype.send = function brandedSend(body: unknown) {
    const transformed = typeof body === "string" ? applyBrandLogo(body) : body;
    return originalSend.call(this, transformed);
  };
  installed = true;
}

installBrandResponseTransform();
