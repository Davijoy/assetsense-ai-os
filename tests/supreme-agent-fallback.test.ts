/**
 * SENTINEL FORT — universal helpful fallback + FORT Executive Summary watch.
 *
 * Proves that out-of-context / conversational requests receive natural,
 * useful answers (deterministic, vocabulary-driven, no fabrication, no
 * routing change) and that the Executive Summary live watch formats local
 * time correctly. Preserves the "never a bare rejection" product rule.
 */
import { describe, it, expect } from "vitest";
import { classifyFallback, composeFallbackText } from "../src/lib/supreme-agent-intent";
import { resolveCompanionPrompt } from "../src/lib/sentinel-companion";
import { formatFortWatch } from "../src/components/sentinel/FortDashboard";

describe("SUPREME AGENT — universal helpful fallback (text + voice consistent)", () => {
  it("greets conversationally instead of the old rejection", () => {
    expect(classifyFallback("Hi there")).toBe("conversational");
    const text = composeFallbackText("Hi there");
    expect(text.length).toBeGreaterThan(40);
    expect(text).not.toMatch(/No capability matched/i);
  });

  it("helps with a capability/help request", () => {
    expect(classifyFallback("What can you do?")).toBe("conversational");
    expect(composeFallbackText("What can you do?")).toMatch(/leads|inventory|Supreme/);
  });

  it("answers a domain question without context with guidance", () => {
    expect(classifyFallback("How do I connect a land buyer?")).toBe("advisory");
    const text = composeFallbackText("How do I connect a land buyer?");
    expect(text).toMatch(/buyer|land/i);
    expect(text).not.toMatch(/No capability matched/i);
  });

  it("keeps the companion on the same helpful path for non-routable domain questions", () => {
    // "RERA" is real-estate vocabulary but not a registered capability subject,
    // so routing correctly declines and the companion must still answer helpfully.
    const r = resolveCompanionPrompt("What is RERA?");
    expect(r.disposition).toBe("needs_clarify");
    expect(r.reason.length).toBeGreaterThan(60);
    expect(r.reason).not.toMatch(/No capability matched/i);
    expect(r.reason).toMatch(/rera|general/i);
  });

  it("asks a natural clarification for ambiguous questions", () => {
    expect(classifyFallback("What should we do next?")).toBe("ambiguous");
    expect(composeFallbackText("What should we do next?")).toMatch(/clarify|Are you asking/);
  });

  it("explains unsupported actions without pretending success", () => {
    expect(classifyFallback("Send a WhatsApp message to everyone")).toBe("unsupported_action");
    const text = composeFallbackText("Send a WhatsApp message to everyone");
    expect(text).toMatch(/approval|never pretend/i);
  });

  it("keeps unknown requests as honest clarification, never market.getContext", () => {
    expect(classifyFallback("lkajsdf lkjljlkj")).toBe("generic");
    expect(composeFallbackText("lkajsdf lkjljlkj")).not.toMatch(/market\.getContext/);
  });
});

describe("FORT Executive Summary — live watch", () => {
  it("formats the local time with seconds", () => {
    const d = new Date(2026, 7, 31, 9, 5, 7);
    expect(formatFortWatch(d)).toContain("9:05:07");
  });
});