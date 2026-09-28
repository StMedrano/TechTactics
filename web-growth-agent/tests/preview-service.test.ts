import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();

async function text(file: string): Promise<string> {
  return readFile(path.join(root, file), "utf8");
}

describe("isolated preview service", () => {
  it("uses a dedicated nginx configuration with security headers", async () => {
    const nginx = await text("preview-nginx.conf");

    expect(nginx).toMatch(/listen\s+80/);
    expect(nginx).toMatch(/autoindex\s+off/);

    expect(nginx).toContain(
      'X-Content-Type-Options "nosniff"'
    );

    expect(nginx).toMatch(
      /script-src\s+'none'/
    );

    expect(nginx).toMatch(
      /connect-src\s+'none'/
    );

    expect(nginx).toMatch(
      /form-action\s+'none'/
    );

    expect(nginx).toMatch(
      /frame-ancestors\s+'none'/
    );
  });

  it("only routes valid lead preview paths into active demo directories", async () => {
    const nginx = await text("preview-nginx.conf");

    expect(nginx).toMatch(
      /lead_\[A-Za-z0-9_-\]\+/
    );

    expect(nginx).toContain(
      "root /usr/share/nginx/html/artifacts;"
    );

    expect(nginx).toContain(
      "/demo/"
    );

    expect(nginx).not.toContain(
      "demo-generated"
    );

    expect(nginx).not.toContain(
      "preview-metadata.json"
    );

    expect(nginx).not.toMatch(
      /Access-Control-Allow-Origin/i
    );

    expect(nginx).toMatch(
      /\^\/preview\/\(lead_\[A-Za-z0-9_-\]\+\)/
    );
  });

  it("compose exposes preview separately on 4318 with read-only artifacts", async () => {
    const compose = await text("docker-compose.yml");

    const start = compose.indexOf(
      "  web-growth-preview:"
    );

    expect(start).toBeGreaterThanOrEqual(0);

    const remainder = compose.slice(start);

    const end = remainder.indexOf(
      "\nnetworks:"
    );

    const block =
      end >= 0
        ? remainder.slice(0, end)
        : remainder;

    expect(block).toMatch(
      /nginx:alpine/
    );

    expect(block).toContain(
      '"4318:80"'
    );

    expect(block).toContain(
      "./artifacts:/usr/share/nginx/html/artifacts:ro"
    );

    expect(block).toContain(
      "./preview-nginx.conf:/etc/nginx/conf.d/default.conf:ro"
    );

    expect(block).not.toContain(
      "env_file:"
    );

    expect(block).not.toContain(
      "./data:"
    );

    expect(block).not.toContain(
      "/var/run/docker.sock"
    );
  });
});
