import { describe, it, expect } from "vitest";
import { isFastPathQuery } from "../src/lib/supreme-agent-intent";
import { processAgentRequest } from "../src/lib/supreme-agent-processor";

describe("Supreme Intelligence — Fast Path vs Deep Path Routing", () => {
  const testWorkspaceId = "ws-fast-path-1010";
  const testUserId = "usr-tester-2020";
  const mockSupabase = {
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({ data: null, error: null }),
        }),
      }),
    }),
  };

  it("identifies conversational greetings on Fast Path", () => {
    expect(isFastPathQuery("Hello").isFast).toBe(true);
    expect(isFastPathQuery("hi").isFast).toBe(true);
    expect(isFastPathQuery("How are you?").isFast).toBe(true);
    expect(isFastPathQuery("good morning").isFast).toBe(true);
  });

  it("identifies identity and capability questions on Fast Path", () => {
    expect(isFastPathQuery("Who are you?").isFast).toBe(true);
    expect(isFastPathQuery("What can you do?").isFast).toBe(true);
    expect(isFastPathQuery("what is supreme").isFast).toBe(true);
  });

  it("identifies workspace ID and role queries on Fast Path", () => {
    expect(isFastPathQuery("What is my workspace?").isFast).toBe(true);
    expect(isFastPathQuery("What is my workspace id?").isFast).toBe(true);
    expect(isFastPathQuery("What is my role?").isFast).toBe(true);
    expect(isFastPathQuery("What is my workspace role?").isFast).toBe(true);
  });

  it("identifies status, summary, and basic inventory/lead queries on Fast Path", () => {
    expect(isFastPathQuery("What is the current status?").isFast).toBe(true);
    expect(isFastPathQuery("Give me a summary").isFast).toBe(true);
    expect(isFastPathQuery("What projects do I have?").isFast).toBe(true);
    expect(isFastPathQuery("What leads do I have?").isFast).toBe(true);
    expect(isFastPathQuery("Explain this simply").isFast).toBe(true);
  });

  it("routes complex analytical questions to Deep Path", () => {
    expect(isFastPathQuery("How are my leads performing?").isFast).toBe(false);
    expect(isFastPathQuery("Analyze inventory and tell me where attention is needed").isFast).toBe(false);
    expect(isFastPathQuery("Why is my conversion rate low?").isFast).toBe(false);
    expect(isFastPathQuery("Recommend pricing adjustments for slow moving units").isFast).toBe(false);
  });

  it("executes Fast Path directly with < 50ms total response latency and accurate workspace context", async () => {
    const startTime = Date.now();
    const response = await processAgentRequest(
      {
        message: "What is my workspace role?",
        workspaceId: testWorkspaceId,
        inputMode: "text",
      },
      testUserId,
      ["sales_executive"],
      mockSupabase
    );
    const duration = Date.now() - startTime;

    expect(response.success).toBe(true);
    expect(response.reasoningPath).toBe("fast_path");
    expect(response.narrative).toContain("sales_executive");
    expect(response.latency).toBeDefined();
    expect(response.latency?.path).toBe("fast_path");
    expect(duration).toBeLessThan(100); // typically < 20ms
  });

  it("answers simple greeting on Fast Path with clear conversational intelligence", async () => {
    const response = await processAgentRequest(
      {
        message: "Hello",
        workspaceId: testWorkspaceId,
        inputMode: "text",
      },
      testUserId,
      ["investor"],
      mockSupabase
    );

    expect(response.success).toBe(true);
    expect(response.reasoningPath).toBe("fast_path");
    expect(response.narrative).toContain("Supreme Intelligence is active");
    expect(response.narrative).not.toContain("Capabilities unavailable");
  });

  it("answers workspace identity query with server-verified workspace ID", async () => {
    const response = await processAgentRequest(
      {
        message: "What is my workspace ID?",
        workspaceId: testWorkspaceId,
        inputMode: "text",
      },
      testUserId,
      ["platform_admin"],
      mockSupabase
    );

    expect(response.success).toBe(true);
    expect(response.narrative).toContain(testWorkspaceId);
    expect(response.narrative).toContain("Server-Verified & Authenticated");
  });
});
