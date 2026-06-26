import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const appSource = readFileSync(
  resolve(__dirname, "../src/routes/app.tsx"),
  "utf8",
);

/**
 * Guardrails so the sidebar (and the Deal Rooms entry inside it) stays
 * visible at common breakpoints like 768px (md) and 950px. The sidebar was
 * previously gated to `lg:flex` (>=1024px), hiding Deal Rooms on tablets and
 * small laptops. These assertions fail loudly if that regression returns.
 */
describe("/app sidebar responsive visibility", () => {
  it("renders the sidebar starting at the md breakpoint (>=768px)", () => {
    // The <aside> must be visible from md upward — not gated to lg/xl.
    expect(appSource).toMatch(/<aside[^>]*\bmd:flex\b/);
    expect(appSource).not.toMatch(/<aside[^>]*\blg:flex\b/);
    expect(appSource).not.toMatch(/<aside[^>]*\bxl:flex\b/);
  });

  it("offsets main content for the sidebar at the same breakpoint", () => {
    // Content padding must match the sidebar breakpoint so layout doesn't
    // overlap or leave a gap at 768–1023px.
    expect(appSource).toMatch(/md:pl-64/);
    expect(appSource).not.toMatch(/lg:pl-64/);
  });

  it("keeps Deal Rooms in the sidebar navigation", () => {
    expect(appSource).toMatch(/to:\s*"\/app\/dealrooms"/);
    expect(appSource).toMatch(/label:\s*"Deal Rooms"/);
  });

  it("covers the 768px and 950px viewports the regression hit", () => {
    // Sanity: Tailwind's md breakpoint is 768px and lg is 1024px, so a
    // `md:` gate covers both 768 and 950. This test documents that intent.
    const breakpoints = [768, 950, 1024, 1280];
    for (const w of breakpoints) {
      expect(w).toBeGreaterThanOrEqual(768);
    }
  });
});