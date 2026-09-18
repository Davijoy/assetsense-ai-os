import { describe, it, expect } from "vitest";
import { PERSONAS } from "../src/sentinel/personas";
import { FORTS } from "../src/sentinel/forts";
import { ROUTE_ROLES } from "../src/lib/route-roles";
import { MODULE_CATALOG } from "../src/lib/fort-modules";
import { consoleModuleState, canExecuteCapability } from "../src/lib/fort-experience";

describe("Platform Admin Modules & Supreme Intelligence Authorization (Regression)", () => {
  it("PERSONAS.PLATFORM_ADMIN landing points to /fort/platform", () => {
    expect(PERSONAS.PLATFORM_ADMIN.landing).toBe("/fort/platform");
  });

  it("PERSONAS.PLATFORM_ADMIN modules contains /app/supreme-intelligence", () => {
    expect(PERSONAS.PLATFORM_ADMIN.modules).toContain("/app/supreme-intelligence");
  });

  it("PERSONAS.PLATFORM_ADMIN preserves existing administrative modules", () => {
    expect(PERSONAS.PLATFORM_ADMIN.modules).toContain("/app/users");
    expect(PERSONAS.PLATFORM_ADMIN.modules).toContain("/app/governance");
    expect(PERSONAS.PLATFORM_ADMIN.modules).toContain("/app/command");
  });

  it("Supreme Intelligence remains authorized through the existing authorization model for admin", () => {
    // 1. ROUTE_ROLES
    expect(ROUTE_ROLES["/app/supreme-intelligence"]).toContain("admin");

    // 2. MODULE_CATALOG
    expect(MODULE_CATALOG["/app/supreme-intelligence"]?.roles).toContain("admin");

    // 3. consoleModuleState resolves ACTIVE for admin
    expect(consoleModuleState("/app/supreme-intelligence", ["admin"])).toBe("ACTIVE");

    // 4. supreme.orchestrate capability executable for admin
    expect(canExecuteCapability("supreme.orchestrate", ["admin"])).toBe(true);
  });

  it("FORTS.PLATFORM and PERSONAS.PLATFORM_ADMIN are aligned on Supreme Intelligence", () => {
    expect(FORTS.PLATFORM.modules).toContain("/app/supreme-intelligence");
    expect(PERSONAS.PLATFORM_ADMIN.modules).toContain("/app/supreme-intelligence");
    expect(FORTS.PLATFORM.capabilities).toContain("supreme.orchestrate");
    expect(PERSONAS.PLATFORM_ADMIN.capabilities).toContain("supreme.orchestrate");
  });
});
