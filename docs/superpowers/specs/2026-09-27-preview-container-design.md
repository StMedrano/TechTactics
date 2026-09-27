# TechTactics Web Growth Agent — Isolated Preview Container Design

Date: 2026-09-27
Status: Approved design, pending implementation plan
Branch: `feat/groq-sales-routing`

## Purpose

Turn the current `demo_ready` stage into a real, browsable website-preview workflow while preserving the existing human approval gate and allowing the operator to replace an AI-generated site with a manually created site.

The command center remains the trusted control plane. Customer previews run from a separate preview origin/container so preview code cannot share the command center origin or directly inherit its API privileges.

## Current State

The Web Growth Agent already generates lead artifacts under the configured artifact directory. For each generated lead, `src/site.ts` writes:

- `proposal.md`
- `outreach-draft.txt`
- `business-summary.txt`
- `demo/index.html`

`generateForLead()` writes those artifacts and moves an eligible lead to `demo_ready`. Human approval is still required before outreach can be sent.

The missing capability is preview delivery and replacement management. The command center currently does not expose the generated HTML as an isolated website, and it does not provide a safe way to upload a replacement site.

## Goals

1. Serve each lead preview from a dedicated preview container on a separate origin.
2. Add command-center controls for previewing, regenerating, uploading, restoring, and approving.
3. Preserve the AI-generated preview when a manual upload replaces it.
4. Prevent uploaded preview content from gaining command-center API privileges.
5. Keep outreach approval explicit and independent from preview generation or replacement.
6. Keep artifact storage on the existing persistent `./artifacts` volume.
7. Support static HTML/CSS/image/font assets first, with a clean path to richer JavaScript frameworks later.

## Non-Goals for This Phase

- Hosting customer production sites.
- Publishing previews to a public domain automatically.
- Automatically approving or sending outreach.
- Running arbitrary server-side code from uploaded projects.
- Building React/Next.js/Vite projects inside the preview container.
- Allowing uploaded previews to call command-center APIs.
- Replacing Nginx Proxy Manager or changing existing homelab networking.

## Architecture

### Trusted control plane

The existing `web-growth-agent` container remains the only service allowed to mutate lead records or artifact directories.

Responsibilities:

- Generate preview artifacts.
- Validate uploaded ZIP packages.
- Stage and atomically replace preview directories.
- Preserve the generated version when a manual upload becomes active.
- Update preview metadata in the lead record.
- Enforce human approval state.
- Render dashboard actions.

### Isolated preview plane

A new `web-growth-preview` Nginx container serves the artifact preview tree read-only.

Initial runtime mapping:

- Command center: `4317`
- Preview server: `4318`

The preview container mounts the same host artifact directory read-only:

```text
./artifacts:/usr/share/nginx/html/artifacts:ro
```

The preview URL shape is:

```text
http://<infrastructure-host>:4318/preview/<lead-id>/
```

Nginx maps that route to the active preview directory for the lead.

The preview service does not mount lead data, `.env`, source code, API credentials, or command-center state.

## Artifact Layout

Each lead uses this structure:

```text
artifacts/
└── <lead-id>/
    ├── proposal.md
    ├── outreach-draft.txt
    ├── business-summary.txt
    ├── preview-metadata.json
    ├── demo/
    │   ├── index.html
    │   └── assets/
    └── demo-generated/
        ├── index.html
        └── assets/
```

Rules:

- `demo/` is always the active preview served by the preview container.
- `demo-generated/` is always the canonical latest AI-generated preview.
- Initial generation writes the generated preview to `demo-generated/` and copies/promotes it to `demo/` as the active preview.
- Manual upload replaces only `demo/`; it never deletes or overwrites `demo-generated/`.
- Regeneration always refreshes `demo-generated/` first.
- If the active preview source is `generated`, regeneration also refreshes `demo/`.
- If the active preview source is `uploaded`, regeneration leaves `demo/` unchanged until the operator explicitly restores or replaces it.

This removes ambiguity about which directory is authoritative for generated content.

## Preview Metadata

Add a typed preview state to the lead record.

```ts
interface LeadPreviewState {
  source: "generated" | "uploaded";
  updatedAt: string;
  entrypoint: "index.html";
  previewUrlPath: string;
  uploadedFileName?: string;
  generatedAt?: string;
}
```

Add to `Lead`:

```ts
preview?: LeadPreviewState;
```

`demoPath` remains for backward compatibility during this phase.

The persisted `previewUrlPath` is relative, for example:

```text
/preview/lead_62c325795fc9bfad/
```

The dashboard derives the preview origin from configuration rather than persisting a host-specific absolute URL.

## Configuration

Add:

```text
WGA_PREVIEW_BASE_URL=http://<infrastructure-host>:4318
WGA_MAX_PREVIEW_UPLOAD_MB=25
```

Defaults:

- Maximum ZIP upload size: 25 MB.
- Preview base URL may default to `http://localhost:4318` for local development, but production should set the infrastructure-accessible URL explicitly.

No secrets are required by the preview container.

## Preview Container

Add a Compose service:

```yaml
web-growth-preview:
  image: nginx:alpine
  container_name: web-growth-preview
  restart: unless-stopped
  volumes:
    - ./artifacts:/usr/share/nginx/html/artifacts:ro
    - ./preview-nginx.conf:/etc/nginx/conf.d/default.conf:ro
  ports:
    - "4318:80"
  networks:
    - techtactics
```

The command-center service keeps its existing artifact mount read-write.

### Nginx behavior

The preview Nginx configuration must:

- Serve only paths under `/preview/<lead-id>/`.
- Map requests to the active `demo/` directory.
- Disable autoindex.
- Return 404 for missing preview files.
- Send `X-Content-Type-Options: nosniff`.
- Send a restrictive `Content-Security-Policy` for this first phase.
- Prevent framing by every origin.
- Avoid CORS headers that would grant cross-origin access.

Previews open in a new tab; they are not embedded in the command center during this phase. Therefore the CSP can be fixed and does not require deployment-time origin templating.

Initial preview CSP:

```text
default-src 'self';
script-src 'none';
style-src 'self' 'unsafe-inline';
img-src 'self' data:;
font-src 'self' data:;
connect-src 'none';
frame-ancestors 'none';
base-uri 'none';
form-action 'none';
```

This supports static HTML/CSS/images/fonts while blocking scripts, network calls, forms, and framing.

## Dashboard Workflow

For a qualified lead:

```text
Generate Demo
```

For a `demo_ready` lead:

```text
Preview Website
Regenerate
Upload My Website
Approve Outreach
```

For an uploaded active preview, also show:

```text
Restore Generated Version
```

Behavior:

- **Preview Website** opens the isolated preview origin in a new browser tab.
- **Regenerate** runs the existing generation pipeline again and refreshes generated artifacts.
- **Upload My Website** accepts one ZIP archive.
- **Restore Generated Version** replaces the active `demo/` directory with the preserved generated version.
- **Approve Outreach** keeps the existing explicit approval path.

No preview action sends outreach.

## Server API

Add command-center endpoints:

```text
POST /api/leads/:id/generate
POST /api/leads/:id/upload-preview
POST /api/leads/:id/restore-generated-preview
```

Existing approval and send endpoints remain unchanged.

### Generate endpoint

- Lead must be `qualified`, `demo_ready`, or `approved`, matching the existing generation rule.
- Calls `generateForLead()`.
- Clears prior outreach approval exactly as the existing pipeline already does.
- Returns the updated lead.

### Upload endpoint

- Accepts one multipart ZIP file.
- Lead must exist and be `qualified`, `demo_ready`, or `approved`.
- Upload does not approve outreach.
- Upload clears prior outreach approval if the preview/content package changes after approval.
- A successful upload leaves the lead in `demo_ready` with `preview.source = "uploaded"`.
- Returns updated lead preview metadata.

### Restore endpoint

- Requires an existing `demo-generated/` preview.
- Atomically replaces the active `demo/` directory with the canonical generated preview.
- Sets preview source to `generated`.
- Clears prior outreach approval because the reviewed website content changed.
- Leaves the lead in `demo_ready`.

## Upload Validation

Uploaded ZIPs are untrusted input.

Validation occurs before any active preview is replaced.

### Limits

- Maximum compressed upload size: 25 MB by default.
- Maximum extracted total size: 100 MB.
- Maximum file count: 500.
- Maximum individual extracted file size: 20 MB.

These limits prevent trivial ZIP bombs and excessive filesystem use.

### Required content

The extracted root must contain:

```text
index.html
```

A ZIP containing one enclosing top-level folder is accepted only if that folder contains `index.html`; the folder contents are normalized to the preview root during staging.

### Rejected entries

Reject the entire upload if any archive entry:

- Uses an absolute path.
- Contains `..` path traversal segments.
- Resolves outside the staging directory.
- Is a symbolic link or hard link.
- Is a device/FIFO/socket entry.
- Exceeds configured size limits.
- Creates more than the permitted file count.

### Allowed content

For the first phase, uploaded static files may include common website assets such as:

- `.html`
- `.css`
- images
- fonts
- static text/data assets

JavaScript files may be stored but are not executed because the preview CSP uses `script-src 'none'`.

This is deliberate. Full JavaScript preview execution belongs to a later phase with stronger per-preview isolation.

## Atomic Replacement Strategy

Never extract directly into the active `demo/` directory.

Flow:

1. Create a temporary staging directory inside the lead artifact directory.
2. Validate archive metadata before extraction where possible.
3. Extract only validated entries into staging.
4. Confirm `index.html` exists after normalization.
5. Rename current `demo/` to a temporary rollback directory.
6. Rename staging to `demo/`.
7. Persist lead preview metadata.
8. Remove the rollback directory only after persistence succeeds.
9. On failure, restore the previous `demo/` directory and leave lead metadata unchanged.

The canonical generated copy in `demo-generated/` is never part of the manual-upload swap and therefore remains available for restore.

Filesystem operations stay on the same mounted volume so rename operations are atomic on normal Linux filesystems.

## Generation and Regeneration Semantics

The current generator in `src/site.ts` remains deterministic and fact-bounded. Groq supplies sales/demo copy, while the HTML template uses only known lead data and generated fields already validated by the sales asset schema.

When generating or regenerating:

1. Build a fresh generated preview in a staging directory.
2. Atomically replace `demo-generated/` with the staged generated preview.
3. If no preview exists yet, copy/promote `demo-generated/` to `demo/` and set source to `generated`.
4. If the active source is `generated`, refresh `demo/` from the new canonical generated preview.
5. If the active source is `uploaded`, keep `demo/` unchanged.
6. Regeneration clears outreach approval because generated sales assets changed.

This prevents a manual site from being silently overwritten by regeneration while keeping one unambiguous canonical generated version.

## Approval Invariants

The existing human approval model remains authoritative.

Invariants:

1. `generate` never approves outreach.
2. `upload-preview` never approves outreach.
3. `restore-generated-preview` never approves outreach.
4. Any content-changing action after approval clears `approvedForOutreach`, clears `approvedOutreachGeneratedAt`, clears pending send state, and returns the lead to `demo_ready`.
5. `send` still requires the existing explicit approval check.

## Error Handling

### Preview service errors

- Missing lead directory: 404.
- Missing `index.html`: 404.
- Nginx startup/config error: preview container unhealthy, command center remains available.

### Upload errors

Return HTTP 400 for:

- Non-ZIP input.
- Oversized upload.
- Missing `index.html`.
- Unsafe archive paths.
- Unsupported archive entry types.
- Extracted-size/file-count limit violations.

Return HTTP 500 only for unexpected server/filesystem failures.

All failed uploads leave the currently active preview unchanged.

### Generation errors

Generation failure leaves the prior generated and active previews unchanged. Lead stage and approval state are not mutated until the new artifact set has been written successfully.

## Security Boundary

The preview container is intentionally treated as untrusted presentation infrastructure.

It receives:

- Read-only preview files.

It does not receive:

- `.env`
- API keys
- Zoho MCP URLs
- Gemini/Groq credentials
- `data/leads.json`
- command-center source code
- Docker socket access

The preview origin must not be used for authentication cookies or command-center sessions.

The command center must never trust data returned from preview HTML.

## Testing Strategy

### Existing regression suite

All current tests must remain green.

### New unit/integration tests

Add tests covering:

1. Generated artifact layout includes a valid preview entrypoint.
2. Initial generation writes both the canonical `demo-generated/` preview and active `demo/` preview.
3. Preview metadata records source `generated` after generation.
4. Upload accepts a valid static ZIP containing `index.html`.
5. Upload accepts a single enclosing folder and normalizes it.
6. Upload rejects `../` traversal.
7. Upload rejects absolute paths.
8. Upload rejects symlink/hard-link entries.
9. Upload rejects missing `index.html`.
10. Upload rejects compressed/extracted size violations.
11. Upload failure preserves the previous active preview.
12. Manual upload preserves `demo-generated/`.
13. Restore-generated switches the active source back to `generated`.
14. Regeneration does not overwrite an uploaded active preview.
15. Generation, upload, restore, and regeneration never auto-approve outreach.
16. Content-changing actions clear existing outreach approval.
17. Preview Nginx configuration disables autoindex and adds required CSP and security headers.
18. Dashboard renders Preview, Regenerate, Upload, Restore, and Approve actions in the correct states.

### Deployment verification

After container deployment:

```text
GET http://127.0.0.1:4317/                -> 200
GET http://127.0.0.1:4318/preview/<id>/   -> 200 for demo-ready lead
```

Verify response headers from port 4318 include the required CSP and `X-Content-Type-Options`.

For ISC Constructors, confirm the current generated site opens from the command center and remains `demo_ready` until explicit approval.

## Files Expected to Change

```text
web-growth-agent/docker-compose.yml
web-growth-agent/preview-nginx.conf
web-growth-agent/package.json
web-growth-agent/package-lock.json
web-growth-agent/src/config.ts
web-growth-agent/src/types.ts
web-growth-agent/src/site.ts
web-growth-agent/src/pipeline.ts
web-growth-agent/src/server.ts
web-growth-agent/src/dashboard.ts
web-growth-agent/tests/*preview*.test.ts
web-growth-agent/tests/pipeline.test.ts
```

A small ZIP/multipart dependency may be added if the existing dependency set does not provide safe multipart parsing and archive inspection. Dependency choice will be made in the implementation plan and should favor maintained, narrowly scoped packages.

## Deployment Sequence

1. Implement and test preview artifact/state changes without changing production behavior.
2. Add upload validation and replacement tests.
3. Add command-center API endpoints.
4. Add preview Nginx configuration and Compose service.
5. Add dashboard actions.
6. Run TypeScript checks and the full test suite.
7. Build both containers.
8. Start the preview container on port 4318.
9. Verify ISC Constructors preview and security headers.
10. Verify existing Zoho Mail, Zoho Books, and Groq routing remain operational.

## Acceptance Criteria

The feature is complete when all of the following are true:

- A `demo_ready` lead can be opened as a real website from the command center.
- The website is served by the dedicated preview container on port 4318, not by the command-center origin.
- Regeneration produces a new generated preview without bypassing human approval.
- A valid website ZIP can replace the active preview.
- The latest generated preview is retained and can be restored.
- Unsafe or invalid ZIPs are rejected without altering the current preview.
- Uploaded preview content has no access to command-center secrets or APIs through shared-origin privileges.
- Preview responses use the defined static-site CSP and security headers.
- Existing outreach approval and Zoho send protections remain intact.
- Existing tests pass and the new preview/upload test suite passes.
- The current ISC Constructors lead can be previewed successfully as the first production validation case.
