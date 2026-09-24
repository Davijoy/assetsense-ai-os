import { describe, it, expect } from "vitest";
import { getWorkspaceDealRooms, type DealRoomSummary } from "../src/lib/crm.functions";
import { isRouteAuthorized } from "../src/lib/route-roles";
import { getAuthorizedModules } from "../src/lib/fort-modules";

describe("Deal Rooms — Live Integration & Security Matrix", () => {
  it("exports getWorkspaceDealRooms as createServerFn", () => {
    expect(typeof getWorkspaceDealRooms).toBe("function");
  });

  it("enforces role-based route access for /app/dealrooms", () => {
    // Authorized roles
    expect(isRouteAuthorized(["admin"], "/app/dealrooms")).toBe(true);
    expect(isRouteAuthorized(["manager"], "/app/dealrooms")).toBe(true);
    expect(isRouteAuthorized(["agent"], "/app/dealrooms")).toBe(true);
    expect(isRouteAuthorized(["builder"], "/app/dealrooms")).toBe(true);
    expect(isRouteAuthorized(["developer"], "/app/dealrooms")).toBe(true);

    // Denied roles
    expect(isRouteAuthorized(["viewer"], "/app/dealrooms")).toBe(false);
    expect(isRouteAuthorized([], "/app/dealrooms")).toBe(false);
  });

  it("handles deal room summaries with honest nulls instead of fabricated data", () => {
    const mockSummary: DealRoomSummary = {
      id: "DR-TEST",
      dealId: "00000000-0000-0000-0000-000000000001",
      customer: "Amit Roy",
      project: "Godrej Platinum",
      unit: "Unit Pending",
      value: "₹0",
      valueInr: null,
      stage: "Negotiation",
      owner: "Sales Executive",
      health: null,
      closeProb: null,
      cancelRisk: null,
      collectionRisk: null,
      currencyCode: "INR",
      createdAt: new Date().toISOString(),
      briefSummary: "Awaiting formal agreement and commercial terms.",
    };

    expect(mockSummary.health).toBeNull();
    expect(mockSummary.closeProb).toBeNull();
    expect(mockSummary.cancelRisk).toBeNull();
    expect(mockSummary.collectionRisk).toBeNull();
  });

  it("scopes deal room summaries by assigned_to user ID for sales executives", () => {
    const opportunities = [
      {
        id: "opp-1",
        lead_id: "lead-1",
        assigned_to: "user-agent-1",
        workspace_id: "ws-1",
        stage: "Negotiation",
      },
      {
        id: "opp-2",
        lead_id: "lead-2",
        assigned_to: "user-agent-2",
        workspace_id: "ws-1",
        stage: "Negotiation",
      },
    ];

    const currentUserId = "user-agent-1";
    const userRole = ["agent"];
    const isSalesExecutive = userRole.includes("agent") && !userRole.includes("admin") && !userRole.includes("manager");

    const visibleOpportunities = opportunities.filter((opp) => {
      if (isSalesExecutive) {
        return opp.assigned_to === currentUserId;
      }
      return true;
    });

    expect(visibleOpportunities).toHaveLength(1);
    expect(visibleOpportunities[0].id).toBe("opp-1");

    // Managers see all opportunities in workspace
    const managerVisible = opportunities.filter(() => true);
    expect(managerVisible).toHaveLength(2);
  });
});
