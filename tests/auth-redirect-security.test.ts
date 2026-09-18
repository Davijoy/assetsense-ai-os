import { describe, it, expect } from "vitest";
import { safeNext, DEFAULT_NEXT } from "../src/routes/auth";

describe("Auth Redirect Security — safeNext Validator", () => {
  it("defaults to /fort when next parameter is missing or empty", () => {
    expect(safeNext(undefined)).toBe("/fort");
    expect(safeNext(null)).toBe("/fort");
    expect(safeNext("")).toBe("/fort");
    expect(safeNext("   ")).toBe("/fort");
    expect(DEFAULT_NEXT).toBe("/fort");
  });

  it("allows valid internal routes", () => {
    expect(safeNext("/fort")).toBe("/fort");
    expect(safeNext("/fort/")).toBe("/fort/");
    expect(safeNext("/fort/broker")).toBe("/fort/broker");
    expect(safeNext("/app/marketplace")).toBe("/app/marketplace");
    expect(safeNext("/app/leads")).toBe("/app/leads");
    expect(safeNext("/app/crm")).toBe("/app/crm");
    expect(safeNext("/app/market")).toBe("/app/market");
    expect(safeNext("/contact")).toBe("/contact");
  });

  it("preserves query parameters and fragments on internal routes", () => {
    expect(safeNext("/app/marketplace?view=grid&q=tower")).toBe("/app/marketplace?view=grid&q=tower");
    expect(safeNext("/app/leads?leadId=123#tab-activities")).toBe("/app/leads?leadId=123#tab-activities");
  });

  it("rejects absolute external URLs and fails closed to /fort", () => {
    expect(safeNext("https://evil.com")).toBe("/fort");
    expect(safeNext("http://evil.com")).toBe("/fort");
    expect(safeNext("https://attacker.com/app/marketplace")).toBe("/fort");
    expect(safeNext("http://localhost:3000")).toBe("/fort");
  });

  it("rejects protocol-relative URLs (//) and fails closed to /fort", () => {
    expect(safeNext("//evil.com")).toBe("/fort");
    expect(safeNext("//evil.com/app/marketplace")).toBe("/fort");
    expect(safeNext("///evil.com")).toBe("/fort");
    expect(safeNext("////attacker.com")).toBe("/fort");
  });

  it("rejects backslash bypass attempts and fails closed to /fort", () => {
    expect(safeNext("/\\evil.com")).toBe("/fort");
    expect(safeNext("/\\evil.com/path")).toBe("/fort");
    expect(safeNext("\\evil.com")).toBe("/fort");
    expect(safeNext("/app/leads\\../evil.com")).toBe("/fort");
  });

  it("rejects URL-encoded bypasses and fails closed to /fort", () => {
    expect(safeNext("/%2f%2fevil.com")).toBe("/fort");
    expect(safeNext("/%5c%5cevil.com")).toBe("/fort");
    expect(safeNext("/%5cevil.com")).toBe("/fort");
    expect(safeNext("/%252f%252fevil.com")).toBe("/fort");
  });

  it("rejects non-HTTP schemes (javascript, data, vbscript)", () => {
    expect(safeNext("javascript:alert(1)")).toBe("/fort");
    expect(safeNext("data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==")).toBe("/fort");
    expect(safeNext("vbscript:msgbox(1)")).toBe("/fort");
  });

  it("rejects control characters, newlines, and HTML tags", () => {
    expect(safeNext("/app/marketplace\r\nHost: evil.com")).toBe("/fort");
    expect(safeNext("/<script>alert(1)</script>")).toBe("/fort");
    expect(safeNext("/app/leads\x00evil")).toBe("/fort");
  });
});

describe("Auth Storage Invalidation on Sign Out", () => {
  it("clearStoredSupabaseSession clears tokens from storage", async () => {
    const { saveStoredSupabaseSession, getStoredSupabaseSession, clearStoredSupabaseSession } = await import(
      "../src/integrations/supabase/auth-storage"
    );

    // Mock session in memory/storage
    const mockSession = { access_token: "mock-token-xyz", user: { id: "user-123", email: "test@fort.com" } };
    saveStoredSupabaseSession(mockSession);

    // Assert it can be cleared
    clearStoredSupabaseSession();
    expect(getStoredSupabaseSession()).toBeNull();
  });
});
