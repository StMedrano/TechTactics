# Isolated Preview Container Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an isolated, browsable website-preview service for Web Growth Agent leads, including safe ZIP replacement uploads, restore/regenerate flows, dashboard controls, and preserved human approval gates.

**Architecture:** The existing `web-growth-agent` remains the trusted control plane and the only writer to lead/artifact state. A new read-only `web-growth-preview` Nginx container on port `4318` serves only the active `artifacts/<lead-id>/demo/` directory. Generated previews are canonically stored in `demo-generated/`; `demo/` is the active preview and may contain either the generated site or a validated uploaded replacement.

**Tech Stack:** Node.js 20+, TypeScript, Express 5, Multer for multipart upload handling, yauzl for streamed ZIP inspection/extraction, Vitest, Docker Compose, Nginx Alpine.

**Spec:** `docs/superpowers/specs/2026-09-27-preview-container-design.md`

## Global Constraints

- Keep command center on port `4317` and preview service on port `4318`.
- Preview container receives only the artifact directory as a read-only mount; no `.env`, lead data, source, API keys, MCP URLs, or Docker socket.
- `demo-generated/` is always the canonical latest AI-generated preview.
- `demo/` is always the active preview.
- Preview source is exactly `"generated" | "uploaded"`.
- Preview entrypoint is exactly `index.html`.
- ZIP compressed upload limit defaults to 25 MB.
- ZIP extracted total limit is 100 MB.
- ZIP maximum file count is 500.
- ZIP maximum individual extracted file size is 20 MB.
- Uploaded ZIPs must contain root `index.html` after optional single-folder normalization.
- Reject absolute paths, `..` traversal, symlinks, hard links, devices, FIFOs, and sockets.
- Preview CSP blocks scripts and network calls: `script-src 'none'`, `connect-src 'none'`, `form-action 'none'`.
- Preview pages open in a new tab; Nginx sends `frame-ancestors 'none'`.
- Generate, upload, restore, and regenerate never approve outreach.
- Any content-changing action after approval clears approval/send state and returns the lead to `demo_ready` when necessary.
- Existing Zoho Mail, Zoho Books, Groq routing, lead scoring, and send approval behavior must remain unchanged.

## Review Focus

1. **ZIP path normalization:** Windows backslashes, repeated separators, percent-like text, and `.` segments must not bypass traversal checks; test in Task 3.
2. **ZIP bomb behavior:** limits must be enforced while streaming actual extracted bytes, not only trusted central-directory sizes; test in Task 3.
3. **Single-folder normalization:** exactly one enclosing directory is accepted, but multiple unrelated roots are not silently flattened; test in Task 3.
4. **Persistence failure rollback:** if lead persistence fails after a preview swap, the previous active `demo/` and metadata must be restored; test in Task 4.
5. **Regenerate while upload is active:** refreshing generated assets must not overwrite the uploaded active preview, while approval is still cleared because sales assets changed; test in Task 4.

---

## File Structure

- `web-growth-agent/src/types.ts` — preview state types attached to `Lead`.
- `web-growth-agent/src/config.ts` — preview base URL and upload-size configuration.
- `web-growth-agent/src/site.ts` — fact-bounded generated preview rendering and canonical generated-artifact writing.
- `web-growth-agent/src/preview.ts` — ZIP validation/extraction, active-preview swaps, restore transactions, preview metadata persistence.
- `web-growth-agent/src/pipeline.ts` — lead-state orchestration around preview transactions and approval invalidation.
- `web-growth-agent/src/server.ts` — HTTP routing only; multipart boundary converted to pipeline calls.
- `web-growth-agent/src/dashboard.ts` — Preview/Regenerate/Upload/Restore controls.
- `web-growth-agent/preview-nginx.conf` — read-only preview routing and security headers.
- `web-growth-agent/docker-compose.yml` — `web-growth-preview` service.
- `web-growth-agent/.env.example` — preview configuration documentation.
- `web-growth-agent/package.json` / `package-lock.json` — multipart and ZIP dependencies.
- `web-growth-agent/tests/preview-artifacts.test.ts` — generated preview layout/state.
- `web-growth-agent/tests/preview-upload.test.ts` — ZIP safety and atomic replacement.
- `web-growth-agent/tests/pipeline.test.ts` — approval/reset/regeneration invariants.
- `web-growth-agent/tests/server-preview.test.ts` — preview API endpoints and multipart behavior.
- `web-growth-agent/tests/preview-nginx.test.ts` — static Nginx config assertions.
- `web-growth-agent/tests/dashboard-preview.test.ts` — dashboard state/action rendering.

---

### Task 1: Preview Types, Configuration, and Dependencies

**Files:**
- Modify: `web-growth-agent/src/types.ts`
- Modify: `web-growth-agent/src/config.ts`
- Modify: `web-growth-agent/.env.example`
- Modify: `web-growth-agent/package.json`
- Modify: `web-growth-agent/package-lock.json`
- Create: `web-growth-agent/tests/preview-config.test.ts`

**Interfaces:**
- Produces: `LeadPreviewState` with `source`, `updatedAt`, `entrypoint`, `previewUrlPath`, optional `uploadedFileName`, optional `generatedAt`.
- Produces: `config.previewBaseUrl: string`.
- Produces: `config.maxPreviewUploadBytes: number`.
- Dependencies added: runtime `multer`, `yauzl`; development types for both; `yazl` as test-only ZIP fixture builder.

- [ ] **Step 1: Write failing config/type tests**

Add tests named:
- `defaults preview base URL to http://localhost:4318`
- `defaults preview upload limit to 25 MB`
- `parses WGA_MAX_PREVIEW_UPLOAD_MB as megabytes`
- `Lead accepts generated and uploaded preview state`

Assertions must pin `25 * 1024 * 1024` bytes and `entrypoint: "index.html"`.

- [ ] **Step 2: Run the focused tests and verify RED**

Run:
```bash
cd web-growth-agent
npm test -- tests/preview-config.test.ts
```
Expected: FAIL because preview config/state do not exist.

- [ ] **Step 3: Add `LeadPreviewState` and `Lead.preview`**

In `src/types.ts` add:
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

Add `preview?: LeadPreviewState` to `Lead`; keep `demoPath?: string` unchanged for compatibility.

- [ ] **Step 4: Add preview configuration**

In `src/config.ts` add:
```ts
previewBaseUrl: process.env.WGA_PREVIEW_BASE_URL?.trim() || "http://localhost:4318",
maxPreviewUploadBytes: positiveNumber(process.env.WGA_MAX_PREVIEW_UPLOAD_MB, 25) * 1024 * 1024,
```

- [ ] **Step 5: Document environment variables**

Append to `.env.example`:
```text
WGA_PREVIEW_BASE_URL=http://localhost:4318
WGA_MAX_PREVIEW_UPLOAD_MB=25
```

- [ ] **Step 6: Install dependencies and update lockfile**

Run:
```bash
npm install multer yauzl
npm install -D @types/multer @types/yauzl yazl @types/yazl
```

- [ ] **Step 7: Run focused tests and typecheck**

Run:
```bash
npm test -- tests/preview-config.test.ts
npm run typecheck
```
Expected: PASS.

- [ ] **Step 8: Commit**

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
- Consumes: `Lead.preview?: LeadPreviewState` from Task 1.
- Produces: `writeLeadArtifacts(lead, assets): Promise<{ demoPath: string; directory: string; preview: LeadPreviewState }>`.
- Produces artifact invariant: latest generated preview always exists at `<lead>/demo-generated/index.html`.
- Active generated preview exists at `<lead>/demo/index.html` only when current source is not `uploaded`.

- [ ] **Step 1: Write failing generated-artifact tests**

Add tests named:
- `writes generated preview to demo-generated and demo for a generated lead`
- `returns generated preview metadata with relative /preview/<lead-id>/ path`
- `regeneration preserves active demo when current preview source is uploaded`
- `generated HTML still carries noindex concept disclaimer`

The uploaded-source test must pre-create `demo/index.html` with sentinel content and assert the sentinel survives while `demo-generated/index.html` changes.

- [ ] **Step 2: Run focused tests and verify RED**

Run:
```bash
npm test -- tests/preview-artifacts.test.ts
```
Expected: FAIL because canonical `demo-generated/` and returned preview metadata do not exist.

- [ ] **Step 3: Refactor generated preview writing**

Keep `demoHtml()` fact-bounded. Change `writeLeadArtifacts()` so it:
- writes the new generated site to a temporary directory under the lead artifact directory;
- atomically promotes that directory to `demo-generated/`;
- when `lead.preview?.source !== "uploaded"`, atomically refreshes `demo/` from the generated result;
- when source is `uploaded`, leaves `demo/` untouched;
- returns `previewUrlPath: `/preview/${lead.id}/`` and `generatedAt: assets.generatedAt`;
- returns active source `uploaded` unchanged when an upload is active, otherwise `generated`.

- [ ] **Step 4: Run focused tests**

Run:
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

### Task 3: Safe ZIP Validation and Preview Swap Transactions

**Files:**
- Create: `web-growth-agent/src/preview.ts`
- Create: `web-growth-agent/tests/preview-upload.test.ts`

**Interfaces:**
- Consumes: `config.artifactDir`, `config.maxPreviewUploadBytes`, `LeadPreviewState`.
- Produces:
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

- [ ] **Step 1: Write failing ZIP-safety tests**

Use `yazl` to build in-memory fixtures. Add tests named:
- `accepts a valid root index.html ZIP`
- `accepts exactly one enclosing folder and normalizes it`
- `does not flatten multiple unrelated roots`
- `rejects ../ traversal including backslash variants`
- `rejects absolute paths`
- `rejects symlink and hard-link entries`
- `rejects device fifo and socket entry modes`
- `rejects ZIP missing index.html`
- `rejects more than 500 files`
- `rejects an individual extracted file over 20 MB`
- `rejects total extracted bytes over 100 MB while streaming`
- `preserves generated preview before activating uploaded preview`
- `commit removes rollback artifacts`
- `rollback restores previous demo and metadata`

Path validation must normalize `\` to `/` before evaluating segments.

- [ ] **Step 2: Run focused tests and verify RED**

Run:
```bash
npm test -- tests/preview-upload.test.ts
```
Expected: FAIL because `src/preview.ts` does not exist.

- [ ] **Step 3: Implement archive inspection helpers**

In `src/preview.ts`, use yauzl lazy entry iteration. Implement focused private helpers for:
- normalized safe relative path calculation;
- Unix entry-type inspection from ZIP external attributes;
- single-root normalization decision;
- streamed extracted-byte accounting.

Do not trust only ZIP-reported uncompressed sizes; increment actual bytes written and abort when limits are exceeded.

- [ ] **Step 4: Implement `prepareUploadedPreview()`**

Behavior:
- reject `input.buffer.length > config.maxPreviewUploadBytes`;
- validate/extract to a staging directory inside the lead artifact directory;
- require normalized root `index.html`;
- preserve current canonical `demo-generated/`;
- rename current `demo/` to a rollback directory;
- rename staging to `demo/`;
- write staged `preview-metadata.json` for `source: "uploaded"` and `uploadedFileName`;
- return transaction methods where `commit()` deletes rollback state and `rollback()` restores it.

- [ ] **Step 5: Implement `prepareRestoreGeneratedPreview()`**

Require `demo-generated/index.html`; stage a copy, swap it into `demo/`, return `source: "generated"`, and use the same commit/rollback contract.

- [ ] **Step 6: Run focused tests and typecheck**

Run:
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

### Task 4: Pipeline Orchestration and Approval Invalidation

**Files:**
- Modify: `web-growth-agent/src/pipeline.ts`
- Modify: `web-growth-agent/tests/pipeline.test.ts`

**Interfaces:**
- Consumes: `writeLeadArtifacts()` returned preview state from Task 2.
- Consumes: `prepareUploadedPreview()` / `prepareRestoreGeneratedPreview()` from Task 3.
- Produces:
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
- `generateForLead()` persists returned preview state.

- [ ] **Step 1: Add failing pipeline tests**

Extend `tests/pipeline.test.ts` with:
- `generation stores generated preview metadata`
- `upload moves qualified lead to demo_ready without approval`
- `upload after approval clears approval timestamp and send state`
- `restore after approval clears approval and returns demo_ready`
- `regeneration after approval clears approval`
- `regeneration while upload active keeps preview source uploaded`
- `persistence failure rolls back uploaded preview filesystem swap`

For the persistence-failure test, use a test store subclass or stub whose `update()` throws after the transaction prepares; assert old `demo/index.html` content is restored.

- [ ] **Step 2: Run pipeline tests and verify RED**

Run:
```bash
npm test -- tests/pipeline.test.ts
```
Expected: FAIL for missing preview orchestration.

- [ ] **Step 3: Centralize approval invalidation**

Add a private helper in `pipeline.ts` that returns a lead patch clearing:
- `approvedForOutreach: false`
- `approvedOutreachGeneratedAt: undefined`
- `outreachSend: undefined`
- stage `demo_ready` when the current stage is `approved` or later content-review state requires re-review.

Use it for generation, upload, and restore rather than duplicating fields.

- [ ] **Step 4: Update `generateForLead()`**

Persist `artifact.preview` and `artifact.demoPath`. If an uploaded preview is active, preserve `preview.source === "uploaded"` while updating `preview.generatedAt` to the new sales-asset generation timestamp. Clear approval because sales/demo content changed.

- [ ] **Step 5: Implement upload/restore pipeline functions with transaction rollback**

Flow for both:
1. fetch/validate lead;
2. prepare filesystem transaction;
3. attempt `store.update()` with preview metadata and approval invalidation;
4. on persistence success call `transaction.commit()`;
5. on persistence failure call `transaction.rollback()` and rethrow.

- [ ] **Step 6: Run focused and regression tests**

Run:
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
- Consumes: pipeline functions from Task 4.
- Produces:
```ts
export function createServerApp(store?: LeadStore): express.Express;
```
- HTTP endpoints:
```text
POST /api/leads/:id/generate
POST /api/leads/:id/upload-preview   multipart field: site
POST /api/leads/:id/restore-generated-preview
```

- [ ] **Step 1: Write failing API tests**

Add tests for:
- generate endpoint returns updated `demo_ready` lead;
- upload endpoint rejects requests without field `site` with HTTP 400;
- upload endpoint rejects files exceeding configured compressed limit;
- upload endpoint passes a valid ZIP to pipeline and returns updated preview metadata;
- restore endpoint returns HTTP 400 when no generated preview exists;
- unexpected filesystem error returns HTTP 500 without exposing stack traces.

- [ ] **Step 2: Run focused tests and verify RED**

Run:
```bash
npm test -- tests/server-preview.test.ts
```
Expected: FAIL because endpoints/app factory do not exist.

- [ ] **Step 3: Extract `createServerApp()`**

Move route construction from `startServer()` into `createServerApp(store = new LeadStore())`; keep `startServer()` behavior and port binding unchanged.

- [ ] **Step 4: Add Multer memory upload boundary**

Create one uploader with `memoryStorage()` and `limits.fileSize = config.maxPreviewUploadBytes`. Accept exactly one field named `site`.

Map expected validation/input errors to HTTP 400 and unexpected errors to HTTP 500 with a generic body.

- [ ] **Step 5: Add generate/upload/restore routes**

Routes call only the Task 4 pipeline functions; no route performs filesystem mutation directly.

- [ ] **Step 6: Run focused tests and full typecheck**

Run:
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
- Consumes host `./artifacts` directory.
- Produces preview URL `http://<host>:4318/preview/<lead-id>/...`.
- Does not expose `/api`, `.env`, lead data, source, or directory listings.

- [ ] **Step 1: Write failing config tests**

Add static tests asserting:
- Compose contains `web-growth-preview` using `nginx:alpine`;
- preview port mapping is exactly `4318:80`;
- artifact mount is read-only;
- no `.env` is mounted into preview service;
- Nginx has `autoindex off`;
- `X-Content-Type-Options nosniff` is present;
- CSP contains `script-src 'none'`, `connect-src 'none'`, `form-action 'none'`, `frame-ancestors 'none'`;
- URL matcher accepts only `lead_[A-Za-z0-9_-]+` lead path segment;
- missing files resolve to 404, not directory listing.

- [ ] **Step 2: Run focused tests and verify RED**

Run:
```bash
npm test -- tests/preview-nginx.test.ts
```
Expected: FAIL because service/config do not exist.

- [ ] **Step 3: Create `preview-nginx.conf`**

Implement two regex locations:
- `/preview/<lead-id>/` -> that lead's `demo/index.html`;
- `/preview/<lead-id>/<asset-path>` -> file below that lead's `demo/` tree.

Use an anchored lead-id capture, disable autoindex, add security headers with `always`, and return 404 for unresolved paths. Do not add permissive CORS headers.

- [ ] **Step 4: Add `web-growth-preview` to Compose**

Use:
- `nginx:alpine`;
- `container_name: web-growth-preview`;
- `restart: unless-stopped`;
- `./artifacts:/usr/share/nginx/html/artifacts:ro`;
- `./preview-nginx.conf:/etc/nginx/conf.d/default.conf:ro`;
- `4318:80`;
- existing `techtactics` network.

- [ ] **Step 5: Run config tests and Compose validation**

Run:
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

### Task 7: Dashboard Preview, Regenerate, Upload, and Restore Controls

**Files:**
- Modify: `web-growth-agent/src/dashboard.ts`
- Create: `web-growth-agent/tests/dashboard-preview.test.ts`

**Interfaces:**
- Consumes: `config.previewBaseUrl` and `Lead.preview`.
- Produces dashboard actions:
  - qualified: `Generate Demo`
  - demo_ready generated: `Preview Website`, `Regenerate`, `Upload My Website`, `Approve Outreach`
  - demo_ready uploaded: same plus `Restore Generated Version`
- Preview opens in a new tab with `rel="noopener noreferrer"`.

- [ ] **Step 1: Write failing dashboard tests**

Add tests asserting:
- qualified lead renders `Generate Demo` and not `Approve Outreach`;
- demo-ready generated lead renders all four generated-preview actions;
- uploaded lead renders `Restore Generated Version`;
- preview anchor targets `${config.previewBaseUrl}${lead.preview.previewUrlPath}` and has `_blank` + `noopener noreferrer`;
- upload input accepts `.zip` and submits field name `site`;
- regenerate/upload/restore JS reloads the selected lead after successful API response;
- no preview action invokes `/send` or `/approve` implicitly.

- [ ] **Step 2: Run focused tests and verify RED**

Run:
```bash
npm test -- tests/dashboard-preview.test.ts
```
Expected: FAIL because controls do not exist.

- [ ] **Step 3: Add dashboard action rendering**

Create small helpers for preview URL and preview-action markup rather than extending the existing `actionMarkup()` into unrelated responsibilities.

- [ ] **Step 4: Add browser-side API helpers**

Add functions:
- `generateLead(id)` -> POST generate;
- `uploadPreview(id, input)` -> `FormData` field `site`;
- `restoreGeneratedPreview(id)` -> POST restore.

On success, reload `/?lead=<id>`; on failure show the existing dashboard error surface/alert pattern.

- [ ] **Step 5: Run focused, mobile, and brand regression tests**

Run:
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
- No production data committed.

**Interfaces:**
- Validates all previous tasks as one deployable system.

- [ ] **Step 1: Document operator workflow**

Update `README.md` with:
- ports `4317` and `4318`;
- `WGA_PREVIEW_BASE_URL` / `WGA_MAX_PREVIEW_UPLOAD_MB`;
- artifact layout `demo-generated/` vs `demo/`;
- Generate -> Preview -> Regenerate/Upload/Restore -> Approve -> Send flow;
- note that JavaScript is intentionally blocked in this phase.

- [ ] **Step 2: Run complete local verification**

Run:
```bash
cd web-growth-agent
npm run typecheck
npm test
npm run build
docker compose config >/dev/null
```
Expected: all tests pass, no TypeScript errors, build succeeds.

- [ ] **Step 3: Build both production services**

Run:
```bash
docker compose build web-growth-agent
docker compose pull web-growth-preview
docker compose up -d --force-recreate web-growth-agent web-growth-preview
```
Expected: both containers `Up`.

- [ ] **Step 4: Verify command center and preview service**

Run:
```bash
curl -fsS -o /dev/null -w 'Command Center HTTP: %{http_code}\n' http://127.0.0.1:4317/
curl -I http://127.0.0.1:4318/preview/lead_62c325795fc9bfad/
```
Expected: command center 200; ISC preview 200 after migration/regeneration creates canonical preview layout.

- [ ] **Step 5: Verify security headers**

For the ISC preview, assert response headers include:
```text
X-Content-Type-Options: nosniff
Content-Security-Policy: ... script-src 'none' ... connect-src 'none' ... frame-ancestors 'none' ...
```

- [ ] **Step 6: Exercise production preview lifecycle on ISC Constructors**

From dashboard or API:
1. regenerate ISC;
2. open Preview Website;
3. confirm stage remains `demo_ready`;
4. upload a small known-safe static ZIP;
5. confirm active source becomes `uploaded`;
6. confirm generated version still exists;
7. restore generated version;
8. confirm source returns to `generated`;
9. do not approve/send during this validation.

- [ ] **Step 7: Re-verify integrations**

Run existing safe checks:
```bash
docker compose exec web-growth-agent node --import ./dist/src/brand.js dist/src/cli.js zoho-status
docker compose exec web-growth-agent node --import ./dist/src/brand.js dist/src/cli.js books-status
```

Also verify container environment reports Groq provider/model without printing keys.

- [ ] **Step 8: Check Git hygiene**

Run:
```bash
cd ..
git status --short
git diff --check
```
Expected: no `.env`, artifact contents, lead data, or uploaded ZIPs staged.

- [ ] **Step 9: Commit documentation and final verification changes**

```bash
git add web-growth-agent/README.md
git commit -m "Document isolated website preview workflow"
```

- [ ] **Step 10: Final branch review**

Run:
```bash
git log --oneline --decorate main..HEAD
git diff --stat main...HEAD
```

Confirm the branch contains only Groq/spec/preview work intended for merge and no secret-bearing files.
