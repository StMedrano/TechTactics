# Isolated Preview Container Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an isolated website-preview service for Web Growth Agent leads, including safe ZIP replacement uploads, restore/regenerate flows, dashboard controls, and preserved human approval gates.

**Architecture:** `web-growth-agent` remains the trusted control plane and sole writer of lead/artifact state. A separate read-only `web-growth-preview` Nginx container on port `4318` serves only the active `artifacts/<lead-id>/demo/` tree. `demo-generated/` always stores the latest AI-generated preview; `demo/` always stores the active preview and may contain either generated or uploaded content.

**Tech Stack:** Node.js 20+, TypeScript, Express 5, Multer, yauzl, Vitest, Docker Compose, Nginx Alpine.

**Spec:** `docs/superpowers/specs/2026-09-27-preview-container-design.md`

## Global Constraints

- Command center stays on `4317`; preview service uses `4318`.
- Preview container mounts only `./artifacts` read-only plus its Nginx config; never `.env`, lead data, source, secrets, MCP URLs, or Docker socket.
- `demo-generated/` is canonical generated output; `demo/` is active output.
- Preview source is exactly `"generated" | "uploaded"`; entrypoint is exactly `index.html`.
- Compressed ZIP limit defaults to 25 MB; extracted total 100 MB; max 500 files; max 20 MB per extracted file.
- After optional single-folder normalization, uploaded root must contain `index.html`.
- Reject absolute paths, traversal, symlinks, devices, FIFOs, and sockets. Extraction creates only new regular files/directories; it never creates filesystem links, so hard-link semantics cannot be materialized from an archive.
- Preview CSP includes `script-src 'none'`, `connect-src 'none'`, `form-action 'none'`, `frame-ancestors 'none'`.
- Preview opens in a new tab, not an iframe.
- Generate, upload, restore, and regenerate never approve outreach.
- Any content-changing action after approval clears `approvedForOutreach`, `approvedOutreachGeneratedAt`, and `outreachSend`, and returns the lead to `demo_ready` when required.
- Existing Zoho Mail, Zoho Books, Groq routing, scoring, and send approval behavior must remain unchanged.

## Review Focus

1. ZIP path normalization must reject traversal using `/`, `\\`, repeated separators, and `.`/`..` segments.
2. ZIP bomb limits must use actual streamed extracted bytes, not only archive metadata.
3. Single-folder normalization must accept exactly one enclosing folder without flattening unrelated roots.
4. If lead persistence fails after a filesystem swap, the previous active preview and metadata must be restored.
5. Regeneration while an upload is active must refresh `demo-generated/` without overwriting `demo/`.

## File Structure

- `web-growth-agent/src/types.ts` — preview state type.
- `web-growth-agent/src/config.ts` — preview URL/upload limits.
- `web-growth-agent/src/site.ts` — generated preview rendering/canonical generated artifacts.
- `web-growth-agent/src/preview.ts` — ZIP inspection/extraction and transactional swaps.
- `web-growth-agent/src/pipeline.ts` — lead-state orchestration and approval invalidation.
- `web-growth-agent/src/server.ts` — HTTP boundary only.
- `web-growth-agent/src/dashboard.ts` — preview lifecycle controls.
- `web-growth-agent/preview-nginx.conf` — isolated static serving/security headers.
- `web-growth-agent/docker-compose.yml` — preview service.
- `web-growth-agent/.env.example` — preview config docs.
- `web-growth-agent/package.json`, `package-lock.json` — dependencies.
- `web-growth-agent/tests/*preview*.test.ts`, `tests/pipeline.test.ts` — TDD coverage.

---

### Task 1: Preview Types, Config, and Dependencies

**Files:**
- Modify: `web-growth-agent/src/types.ts`
- Modify: `web-growth-agent/src/config.ts`
- Modify: `web-growth-agent/.env.example`
- Modify: `web-growth-agent/package.json`
- Modify: `web-growth-agent/package-lock.json`
- Create: `web-growth-agent/tests/preview-config.test.ts`

**Interfaces:**
```ts
export interface LeadPreviewState {
  source: "generated" | "uploaded";
  updatedAt: string;
  entrypoint: "index.html";
  previewUrlPath: string;
  uploadedFileName?: string;
  generatedAt?: string;
}
```
Add `preview?: LeadPreviewState` to `Lead`; keep `demoPath?: string`.

Produce:
- `config.previewBaseUrl: string`
- `config.maxPreviewUploadBytes: number`

Dependencies: runtime `multer`, `yauzl`; development `@types/multer`, `@types/yauzl`, `yazl`, `@types/yazl`.

- [ ] **Step 1: Write failing tests**

Create tests:
- `defaults preview base URL to http://localhost:4318`
- `defaults preview upload limit to 25 MB`
- `parses WGA_MAX_PREVIEW_UPLOAD_MB as megabytes`
- `Lead accepts generated and uploaded preview state`

Pin `25 * 1024 * 1024` bytes and `entrypoint: "index.html"`.

- [ ] **Step 2: Verify RED**

```bash
cd web-growth-agent
npm test -- tests/preview-config.test.ts
```
Expected: FAIL for missing config/type.

- [ ] **Step 3: Implement type/config**

Add:
```ts
previewBaseUrl: process.env.WGA_PREVIEW_BASE_URL?.trim() || "http://localhost:4318",
maxPreviewUploadBytes: positiveNumber(process.env.WGA_MAX_PREVIEW_UPLOAD_MB, 25) * 1024 * 1024,
```

Add to `.env.example`:
```text
WGA_PREVIEW_BASE_URL=http://localhost:4318
WGA_MAX_PREVIEW_UPLOAD_MB=25
```

- [ ] **Step 4: Install dependencies**

```bash
npm install multer yauzl
npm install -D @types/multer @types/yauzl yazl @types/yazl
```

- [ ] **Step 5: Verify GREEN**

```bash
npm test -- tests/preview-config.test.ts
npm run typecheck
```
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add web-growth-agent/src/types.ts web-growth-agent/src/config.ts web-growth-agent/.env.example web-growth-agent/package.json web-growth-agent/package-lock.json web-growth-agent/tests/preview-config.test.ts
git commit -m "Add preview state and configuration"
```

---

### Task 2: Canonical Generated Preview Artifacts

**Files:**
- Modify: `web-growth-agent/src/site.ts`
- Create: `web-growth-agent/tests/preview-artifacts.test.ts`

**Interfaces:**
```ts
writeLeadArtifacts(
  lead: Lead,
  assets: SalesAssets
): Promise<{
  demoPath: string;
  directory: string;
  preview: LeadPreviewState;
}>
```

Invariants:
- latest generated preview exists at `<lead>/demo-generated/index.html`;
- active preview exists at `<lead>/demo/index.html`;
- root `<lead>/preview-metadata.json` mirrors returned `LeadPreviewState`;
- when active source is uploaded, regeneration never changes `demo/`.

- [ ] **Step 1: Write failing artifact tests**

Create tests:
- `writes generated preview to demo-generated and demo for generated source`
- `writes preview-metadata.json matching returned state`
- `returns /preview/<lead-id>/ as previewUrlPath`
- `regeneration preserves uploaded active demo while refreshing demo-generated`
- `generated HTML retains noindex concept disclaimer`

For the uploaded-source case, pre-create sentinel `demo/index.html` and assert it survives.

- [ ] **Step 2: Verify RED**

```bash
npm test -- tests/preview-artifacts.test.ts
```
Expected: FAIL for missing canonical layout/metadata.

- [ ] **Step 3: Implement minimal artifact refactor**

Keep `demoHtml()` fact-bounded. `writeLeadArtifacts()` must:
- generate into a temporary directory under the lead artifact directory;
- atomically replace `demo-generated/`;
- if `lead.preview?.source !== "uploaded"`, atomically refresh `demo/` from generated output;
- otherwise leave `demo/` unchanged;
- write `preview-metadata.json` with the active source and latest `generatedAt`;
- return relative `previewUrlPath: `/preview/${lead.id}/``.

- [ ] **Step 4: Verify GREEN**

```bash
npm test -- tests/preview-artifacts.test.ts
npm run typecheck
```
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add web-growth-agent/src/site.ts web-growth-agent/tests/preview-artifacts.test.ts
git commit -m "Canonicalize generated preview artifacts"
```

---

### Task 3: Safe ZIP Validation and Transactional Preview Swaps

**Files:**
- Create: `web-growth-agent/src/preview.ts`
- Create: `web-growth-agent/tests/preview-upload.test.ts`

**Interfaces:**
```ts
export interface PreviewSwapTransaction {
  preview: LeadPreviewState;
  demoPath: string;
  commit(): Promise<void>;
  rollback(): Promise<void>;
}

export interface PreviewUploadInput {
  buffer: Buffer;
  originalName: string;
}

export function prepareUploadedPreview(
  lead: Lead,
  input: PreviewUploadInput,
  artifactDir?: string
): Promise<PreviewSwapTransaction>;

export function prepareRestoreGeneratedPreview(
  lead: Lead,
  artifactDir?: string
): Promise<PreviewSwapTransaction>;
```

- [ ] **Step 1: Write failing ZIP tests**

Use `yazl` in fixtures. Cover:
- valid root `index.html`;
- exactly one enclosing folder;
- multiple unrelated roots are not flattened;
- traversal via `../`, `..\\`, repeated separators, and dot segments;
- Unix and Windows absolute paths;
- symlink and non-regular Unix entry modes;
- missing `index.html`;
- >500 files;
- >20 MB actual bytes for one extracted file;
- >100 MB actual streamed extracted bytes total;
- generated preview is preserved before upload activation;
- `commit()` removes rollback artifacts;
- `rollback()` restores previous `demo/` and `preview-metadata.json`.

Because standard ZIP has no portable distinct hard-link entry that should be recreated, assert extraction writes regular files only and never calls link/symlink creation APIs.

- [ ] **Step 2: Verify RED**

```bash
npm test -- tests/preview-upload.test.ts
```
Expected: FAIL because `src/preview.ts` does not exist.

- [ ] **Step 3: Implement archive inspection/extraction**

Use yauzl lazy entry iteration. Normalize `\\` to `/` before validating path segments. Reject unsupported Unix file types from external attributes. Track actual bytes emitted by entry streams and abort once limits are crossed.

Single-folder normalization is allowed only when all non-directory entries share one first path component and normalized root then contains `index.html`.

- [ ] **Step 4: Implement `prepareUploadedPreview()`**

Behavior:
- reject compressed input over `config.maxPreviewUploadBytes`;
- extract only validated regular files/directories into lead-local staging;
- require normalized `index.html`;
- leave canonical `demo-generated/` untouched;
- back up current `demo/` and `preview-metadata.json` to rollback names;
- atomically promote staging to `demo/`;
- stage/write metadata with `source: "uploaded"` and `uploadedFileName`;
- `commit()` removes rollback state; `rollback()` restores it.

- [ ] **Step 5: Implement `prepareRestoreGeneratedPreview()`**

Require `demo-generated/index.html`; stage a regular-file copy of generated output, swap it into `demo/`, set source to `generated`, and use the same commit/rollback contract.

- [ ] **Step 6: Verify GREEN**

```bash
npm test -- tests/preview-upload.test.ts
npm run typecheck
```
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add web-growth-agent/src/preview.ts web-growth-agent/tests/preview-upload.test.ts
git commit -m "Add safe preview ZIP replacement transactions"
```

---

### Task 4: Pipeline Lifecycle and Approval Invalidation

**Files:**
- Modify: `web-growth-agent/src/pipeline.ts`
- Modify: `web-growth-agent/tests/pipeline.test.ts`

**Interfaces:**
```ts
export function uploadPreviewForLead(
  id: string,
  input: PreviewUploadInput,
  store?: LeadStore
): Promise<Lead>;

export function restoreGeneratedPreviewForLead(
  id: string,
  store?: LeadStore
): Promise<Lead>;
```
`generateForLead()` persists preview state returned by Task 2.

- [ ] **Step 1: Write failing pipeline tests**

Add:
- `generation stores generated preview metadata`
- `upload rejects new and audited leads`
- `upload moves qualified lead to demo_ready without approval`
- `upload after approval clears approval timestamp and send state`
- `restore after approval clears approval and returns demo_ready`
- `regeneration after approval clears approval`
- `regeneration while upload active keeps source uploaded and active demo unchanged`
- `persistence failure rolls back uploaded preview filesystem swap`

- [ ] **Step 2: Verify RED**

```bash
npm test -- tests/pipeline.test.ts
```
Expected: FAIL for missing lifecycle functions.

- [ ] **Step 3: Centralize approval invalidation**

Add one private helper that clears:
- `approvedForOutreach`
- `approvedOutreachGeneratedAt`
- `outreachSend`

and returns stage to `demo_ready` when reviewed content changes after approval.

- [ ] **Step 4: Update generation orchestration**

Persist `artifact.preview` and `artifact.demoPath`. When upload is active, preserve `source: "uploaded"` while updating `generatedAt`; always invalidate prior approval because sales assets changed.

- [ ] **Step 5: Implement upload/restore orchestration**

For both:
1. require existing lead at least `qualified` and in a generation-compatible lifecycle state;
2. prepare filesystem transaction;
3. persist lead state/preview metadata;
4. commit transaction on persistence success;
5. rollback transaction and rethrow on persistence failure.

- [ ] **Step 6: Verify GREEN**

```bash
npm test -- tests/pipeline.test.ts tests/preview-upload.test.ts tests/preview-artifacts.test.ts
npm run typecheck
```
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add web-growth-agent/src/pipeline.ts web-growth-agent/tests/pipeline.test.ts
git commit -m "Integrate preview lifecycle with lead pipeline"
```

---

### Task 5: Command-Center Preview APIs

**Files:**
- Modify: `web-growth-agent/src/server.ts`
- Create: `web-growth-agent/tests/server-preview.test.ts`

**Interfaces:**
```ts
export function createServerApp(store?: LeadStore): express.Express;
```
Endpoints:
```text
POST /api/leads/:id/generate
POST /api/leads/:id/upload-preview   multipart field: site
POST /api/leads/:id/restore-generated-preview
```

- [ ] **Step 1: Write failing API tests**

Cover:
- generate returns updated `demo_ready` lead;
- upload without field `site` -> 400;
- oversized compressed upload -> 400;
- valid ZIP -> updated preview metadata;
- ineligible lead stage -> 400;
- restore without generated preview -> 400;
- unexpected filesystem exception -> 500 with generic body and no stack trace.

- [ ] **Step 2: Verify RED**

```bash
npm test -- tests/server-preview.test.ts
```
Expected: FAIL for missing app factory/routes.

- [ ] **Step 3: Extract `createServerApp()`**

Move route construction from `startServer()` into the factory. Keep `startServer()` host/port behavior unchanged.

- [ ] **Step 4: Add Multer memory boundary**

Use `memoryStorage()` and `limits.fileSize = config.maxPreviewUploadBytes`; accept exactly one field named `site`.

- [ ] **Step 5: Add routes and error mapping**

Routes call only Task 4 pipeline functions. Validation/input failures return 400. Unexpected failures return 500 without stack traces.

- [ ] **Step 6: Verify GREEN**

```bash
npm test -- tests/server-preview.test.ts
npm run typecheck
```
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add web-growth-agent/src/server.ts web-growth-agent/tests/server-preview.test.ts
git commit -m "Add preview lifecycle API endpoints"
```

---

### Task 6: Isolated Nginx Preview Service

**Files:**
- Create: `web-growth-agent/preview-nginx.conf`
- Modify: `web-growth-agent/docker-compose.yml`
- Create: `web-growth-agent/tests/preview-nginx.test.ts`

**Interfaces:**
- URL: `http://<host>:4318/preview/<lead-id>/...`
- Mount: `./artifacts:/usr/share/nginx/html/artifacts:ro`
- Lead path segment must match `lead_[A-Za-z0-9_-]+`.

- [ ] **Step 1: Write failing config tests**

Assert:
- service `web-growth-preview` uses `nginx:alpine`;
- exact port `4318:80`;
- artifacts mount is read-only;
- no `.env` mount;
- `autoindex off`;
- `X-Content-Type-Options nosniff`;
- CSP includes `script-src 'none'`, `connect-src 'none'`, `form-action 'none'`, `frame-ancestors 'none'`;
- lead-id route is anchored;
- unresolved preview files return 404;
- no permissive CORS header is configured.

- [ ] **Step 2: Verify RED**

```bash
npm test -- tests/preview-nginx.test.ts
```
Expected: FAIL because service/config do not exist.

- [ ] **Step 3: Create Nginx mapping**

Implement root preview and asset locations that map only `/preview/<lead-id>/...` to `<artifact-root>/<lead-id>/demo/...`. Use anchored captures, `autoindex off`, `try_files`/equivalent 404 behavior, and headers with `always`.

- [ ] **Step 4: Add Compose service**

Use:
- `image: nginx:alpine`
- `container_name: web-growth-preview`
- `restart: unless-stopped`
- artifact read-only mount
- config read-only mount
- `4318:80`
- existing `techtactics` network.

- [ ] **Step 5: Verify GREEN**

```bash
npm test -- tests/preview-nginx.test.ts
docker compose config >/dev/null
```
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add web-growth-agent/preview-nginx.conf web-growth-agent/docker-compose.yml web-growth-agent/tests/preview-nginx.test.ts
git commit -m "Add isolated preview Nginx service"
```

---

### Task 7: Dashboard Preview Lifecycle Controls

**Files:**
- Modify: `web-growth-agent/src/dashboard.ts`
- Create: `web-growth-agent/tests/dashboard-preview.test.ts`

**Interfaces:**
- qualified: `Generate Demo`
- demo_ready generated: `Preview Website`, `Regenerate`, `Upload My Website`, `Approve Outreach`
- demo_ready uploaded: same plus `Restore Generated Version`
- preview URL = `config.previewBaseUrl + lead.preview.previewUrlPath`
- preview anchor uses `_blank` and `rel="noopener noreferrer"`.

- [ ] **Step 1: Write failing dashboard tests**

Assert:
- qualified lead shows Generate only;
- generated demo-ready lead shows four preview/approval actions;
- uploaded lead additionally shows Restore;
- preview URL/target/rel are correct;
- upload input accepts `.zip` and submits multipart field `site`;
- generate/upload/restore reload selected lead after success;
- none of those actions calls `/approve` or `/send` implicitly.

- [ ] **Step 2: Verify RED**

```bash
npm test -- tests/dashboard-preview.test.ts
```
Expected: FAIL for missing controls.

- [ ] **Step 3: Add focused rendering helpers**

Add separate preview URL/action helpers; do not overload existing outreach `actionMarkup()`.

- [ ] **Step 4: Add browser API helpers**

Implement:
- `generateLead(id)` -> POST generate;
- `uploadPreview(id, input)` -> FormData field `site`;
- `restoreGeneratedPreview(id)` -> POST restore.

On success reload `/?lead=<id>`; on failure use existing dashboard error/alert pattern.

- [ ] **Step 5: Verify GREEN and UI regressions**

```bash
npm test -- tests/dashboard-preview.test.ts tests/server-mobile.test.ts tests/brand-refresh.test.ts
npm run typecheck
```
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add web-growth-agent/src/dashboard.ts web-growth-agent/tests/dashboard-preview.test.ts
git commit -m "Add website preview controls to command center"
```

---

### Task 8: Full Regression, Deployment, and Production Validation

**Files:**
- Modify: `web-growth-agent/README.md`
- Never commit production lead/artifact/upload data.

- [ ] **Step 1: Document operator workflow**

Document ports, preview env vars, canonical/active artifact layout, Generate -> Preview -> Regenerate/Upload/Restore -> Approve -> Send flow, and the intentional JavaScript block for this phase.

- [ ] **Step 2: Run complete local verification**

```bash
cd web-growth-agent
npm run typecheck
npm test
npm run build
docker compose config >/dev/null
```
Expected: all green.

- [ ] **Step 3: Build/start production services**

```bash
docker compose build web-growth-agent
docker compose pull web-growth-preview
docker compose up -d --force-recreate web-growth-agent web-growth-preview
```
Expected: both containers Up.

- [ ] **Step 4: Migrate/refresh ISC preview through regeneration**

Regenerate `lead_62c325795fc9bfad` once so existing legacy `demo/` data gains canonical `demo-generated/`, `preview-metadata.json`, and persisted `Lead.preview` state.

- [ ] **Step 5: Verify HTTP and security headers**

```bash
curl -fsS -o /dev/null -w 'Command Center HTTP: %{http_code}\n' http://127.0.0.1:4317/
curl -I http://127.0.0.1:4318/preview/lead_62c325795fc9bfad/
```
Expected: 200/200 and preview headers include `nosniff` plus required CSP.

Also probe traversal and non-preview paths:
```bash
curl --path-as-is -o /dev/null -w '%{http_code}\n' 'http://127.0.0.1:4318/preview/lead_62c325795fc9bfad/../preview-metadata.json'
curl -o /dev/null -w '%{http_code}\n' http://127.0.0.1:4318/api/leads
```
Expected: neither request returns 200.

- [ ] **Step 6: Exercise production lifecycle without approving/sending**

1. open ISC Preview Website;
2. verify stage remains `demo_ready`;
3. upload a small known-safe static ZIP;
4. verify source becomes `uploaded`;
5. verify `demo-generated/index.html` still exists;
6. restore generated version;
7. verify source becomes `generated`;
8. do not approve or send.

- [ ] **Step 7: Re-verify integrations**

```bash
docker compose exec web-growth-agent node --import ./dist/src/brand.js dist/src/cli.js zoho-status
docker compose exec web-growth-agent node --import ./dist/src/brand.js dist/src/cli.js books-status
```
Verify Groq provider/model environment without printing the key.

- [ ] **Step 8: Git hygiene**

```bash
cd ..
git status --short
git diff --check
```
Expected: no `.env`, lead data, artifact contents, or uploaded ZIPs staged.

- [ ] **Step 9: Commit docs**

```bash
git add web-growth-agent/README.md
git commit -m "Document isolated website preview workflow"
```

- [ ] **Step 10: Final branch review**

```bash
git log --oneline --decorate main..HEAD
git diff --stat main...HEAD
```
Confirm only intended Groq/spec/preview work is present and no secret-bearing files are tracked.
