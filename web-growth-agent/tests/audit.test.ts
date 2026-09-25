import { describe, expect, it } from "vitest";
import { auditWebsite, isPrivateOrReservedIp } from "../src/audit.js";

describe("audit SSRF protections", () => {
  it("blocks private, loopback, link-local, and reserved IP ranges", () => {
    expect(isPrivateOrReservedIp("127.0.0.1")).toBe(true);
    expect(isPrivateOrReservedIp("10.1.2.3")).toBe(true);
    expect(isPrivateOrReservedIp("172.16.0.1")).toBe(true);
    expect(isPrivateOrReservedIp("192.168.1.10")).toBe(true);
    expect(isPrivateOrReservedIp("169.254.169.254")).toBe(true);
    expect(isPrivateOrReservedIp("::1")).toBe(true);
    expect(isPrivateOrReservedIp("fd00::1")).toBe(true);
    expect(isPrivateOrReservedIp("fe80::1")).toBe(true);
    expect(isPrivateOrReservedIp("8.8.8.8")).toBe(false);
    expect(isPrivateOrReservedIp("2001:4860:4860::8888")).toBe(false);
  });

  it("rejects a loopback URL before making a website request", async () => {
    const audit = await auditWebsite("http://127.0.0.1:8080/private");
    expect(audit.reachable).toBe(false);
    expect(audit.notes.join(" ")).toMatch(/blocked private or reserved/i);
  });
});
