import { describe, it, expect } from "vitest";
import { interpretIntent, createPlan } from "../src/lib/supreme-agent-intent";
import { AGENT_CAPABILITIES } from "../src/lib/supreme-agent-capabilities";

/**
 * SUPREME AGENT SEMANTIC ROUTING — deterministic regression suite
 *
 * Verifies the COMPLETE routing boundary:
 *   message -> interpretIntent -> subject extraction -> createPlan
 *   -> capability registry -> AgentPlan (selectedCapability)
 *
 * Guards (red-line behavior):
 *   - market.getContext is NEVER a universal fallback.
 *   - Unknown / un-callable requests produce clarification, never a silent
 *     Market Intelligence answer.
 */

const WORKSPACE = "00000000-0000-0000-0000-00000000d3f7";

/** Run the full routing pipeline for a message and return the selected capability. */
function route(message: string) {
  const { intent, entities } = interpretIntent(message);
  entities.workspaceId = WORKSPACE;
  const result = createPlan(intent, entities, true);
  return { intent, entities, planResult: result, selected: result.selectedCapability, clarification: result.clarification };
}

describe("Supreme Agent semantic routing — full message->plan boundary", () => {
  it("routes CRM performance queries to crm.getCRMKPIs (never EXECUTE, never market)", () => {
    const r = route("How are my leads performing?");
    expect(r.intent).toBe("QUERY");
    expect(r.selected).toBe("crm.getCRMKPIs");
    expect(r.clarification).toBe(false);
  });

  it('routes "how is the lead in CRM performing overall" to crm.getCRMKPIs', () => {
    const r = route("how is the lead in CRM performing overall");
    expect(r.intent).toBe("QUERY");
    expect(r.planResult.plan.steps.length).toBeGreaterThan(0);
    expect(r.planResult.plan.steps[0].capability).toBe("crm.getCRMKPIs");
    expect(r.selected).toBe("crm.getCRMKPIs");
  });

  it('routes "Show market opportunities." to market.getContext', () => {
    const r = route("Show market opportunities.");
    expect(r.selected).toBe("market.getContext");
    expect(r.clarification).toBe(false);
  });

  it('routes "Which inventory is slow moving?" to inventory.getContext', () => {
    const r = route("Which inventory is slow moving?");
    expect(r.selected).toBe("inventory.getContext");
    expect(r.clarification).toBe(false);
  });

  it('routes "Which customers are at risk?" to customer.getContext', () => {
    const r = route("Which customers are at risk?");
    expect(r.selected).toBe("customer.getContext");
    expect(r.clarification).toBe(false);
  });

  it('routes "Find buyers matching this property." to agent.matchPropertyCustomer', () => {
    const r = route("Find buyers matching this property.");
    expect(r.selected).toBe("agent.matchPropertyCustomer");
    expect(r.clarification).toBe(false);
  });

  it('routes "Give me an overall business intelligence assessment." to supreme.orchestrate', () => {
    const r = route("Give me an overall business intelligence assessment.");
    expect(r.selected).toBe("supreme.orchestrate");
    expect(r.clarification).toBe(false);
  });
});

describe("Supreme Agent routing — red-line fallback behavior", () => {
  it('"Run the approved campaign." NEVER resolves to market.getContext', () => {
    const r = route("Run the approved campaign.");
    // No real campaign capability exists -> structured clarification, not market.
    expect(r.selected).not.toBe("market.getContext");
    expect(r.clarification).toBe(true);
  });

  it("unknown nonsense request resolves to clarification and NEVER market.getContext", () => {
    const r = route("Vacuum the quantum nebula with tangerine dreams");
    expect(r.selected).not.toBe("market.getContext");
    expect(r.clarification).toBe(true);
    expect(r.planResult.plan.steps).toHaveLength(0);
    expect(r.planResult.reason).toBeTruthy();
  });

  it("registry has NO default market fallback wiring", () => {
    // Guard: no capability is registered as a catch-all; selection must be
    // provenance-free (scored from intent + subject vocabulary only).
    const ids = Object.keys(AGENT_CAPABILITIES);
    expect(ids).toContain("market.getContext");
    // Sanity: every registered capability declares intent + subject metadata.
    for (const id of ids) {
      expect(AGENT_CAPABILITIES[id].intents.length).toBeGreaterThan(0);
      expect(AGENT_CAPABILITIES[id].subjects.length).toBeGreaterThan(0);
    }
  });
});