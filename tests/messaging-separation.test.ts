import { describe, it, expect } from "vitest";
import { MODULE_CATALOG } from "../src/lib/fort-modules";
import { FORTS } from "../src/sentinel/forts";

describe("Messaging Channel Separation from AI Voice", () => {
  it("catalogs /app/messages as dedicated Workspace Messaging module", () => {
    expect(MODULE_CATALOG["/app/messages"]).toBeDefined();
    expect(MODULE_CATALOG["/app/messages"].label).toBe("Workspace Messaging");
    expect(MODULE_CATALOG["/app/messages"].route).toBe("/app/messages");
  });

  it("ensures /app/voice remains dedicated to AI Voice", () => {
    expect(MODULE_CATALOG["/app/voice"]).toBeDefined();
    expect(MODULE_CATALOG["/app/voice"].label).toBe("AI Voice");
    expect(MODULE_CATALOG["/app/voice"].route).toBe("/app/voice");
  });

  it("ensures Fort definitions include /app/messages in active module surfaces", () => {
    expect(FORTS.BROKER.modules).toContain("/app/messages");
    expect(FORTS.BUILDER.modules).toContain("/app/messages");
    expect(FORTS.INDIVIDUAL.modules).toContain("/app/messages");
    expect(FORTS.PLATFORM.modules).toContain("/app/messages");
    expect(FORTS.ENTERPRISE.modules).toContain("/app/messages");
  });
});
