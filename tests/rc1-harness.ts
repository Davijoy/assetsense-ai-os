/**
 * RC1 INTELLIGENCE EVALUATION HARNESS (test-only)
 *
 * Deterministic harness that runs REAL Supreme Agent pipeline (interpretIntent
 * → createPlan → executePlan → synthesizeAgentResponse) against an IN-MEMORY
 * supabase fixture. Purpose: verify the real brain, not fake intelligence.
 *
 * - Uses REAL repository/services/handlers (no production mocks). The only
 *   fake is a deterministic, in-memory supabase query builder (a TEST fixture)
 *   supplying rows in the exact column shape each repository queries.
 * - Dry-run is TRUE throughout → DB_MUTATIONS = 0 for every scenario.
 */

import { interpretIntent, createPlan, type AgentIntent } from "../src/lib/supreme-agent-intent";
import { processAgentRequest, type AgentResponse } from "../src/lib/supreme-agent-processor";
import {
  synthesizeAgentResponse,
  REGISTERED_CAPABILITIES,
  type IntelligenceSynthesis,
  type SynthPriority,
} from "../src/lib/supreme-agent-synthesis";

export const WS = "00000000-0000-0000-0000-00000000d3f7";
export const USER_ID = "11111111-1111-1111-1111-111111111111";
export const USER_ROLES = ["admin", "manager"];

export const OLD = "2024-01-01T00:00:00.000Z"; // > 90 / 60 days ago
export const RECENT = "2026-07-01T00:00:00.000Z";

// =============================================================
// IN-MEMORY SUPABASE FIXTURE BUILDER
// Supports the exact chained reads each real repository/handler issues.
// =============================================================
type Row = Record<string, unknown>;

export function fixtureSupabase(tables: Record<string, Row[]>): any {
  function makeQuery(table: string) {
    let rows = (tables[table] ?? []).map((r) => ({ ...r }));
    let error: { message: string } | null = null;
    const q: any = {
      select() { return q; },
      eq(key: string, value: unknown) {
        rows = rows.filter((r) => r[key] === value);
        return q;
      },
      order(key: string, opts?: { ascending?: boolean }) {
        rows = [...rows].sort((a, b) => {
          const av = a[key]; const bv = b[key];
          if (av == null) return 1;
          if (bv == null) return -1;
          return String(av).localeCompare(String(bv));
        });
        if (opts && opts.ascending === false) rows.reverse();
        return q;
      },
      limit(n: number) { rows = rows.slice(0, n); return q; },
      upsert(payload: Row) { rows = [payload]; error = null; return q; },
      then(resolve: (v: unknown) => unknown) {
        return Promise.resolve({ data: rows, error }).then(resolve);
      },
    };
    return q;
  }
  return {
    from(table: string) { return makeQuery(table); },
  };
}

// =============================================================
// REAL-FIXTURE DATA (workspace WS)
// Column names are the DB columns each repository selects.
// =============================================================
export function realFixtures(): Record<string, Row[]> {
  return {
    properties: [
      // Inventory: available + OLD (>90d) → slow-moving; p1 high-value (>1.5× avg).
      { id: "p1", name: "Tower A U1", city: "Mumbai", property_type: "apartment", status: "available", price_inr: 50000000, developer: "DevCo", created_at: OLD, workspace_id: WS, is_draft: false },
      { id: "p2", name: "Tower B U2", city: "Mumbai", property_type: "apartment", status: "available", price_inr: 30000000, developer: "DevCo", created_at: OLD, workspace_id: WS, is_draft: false },
      { id: "p4", name: "Tower C U4", city: "Pune", property_type: "villa", status: "available", price_inr: 10000000, developer: "DevCo", created_at: RECENT, workspace_id: WS, is_draft: false },
      { id: "p3", name: "Sold Unit", city: "Mumbai", property_type: "apartment", status: "sold", price_inr: 20000000, developer: "DevCo", created_at: RECENT, workspace_id: WS, is_draft: false },
    ],
    leads: [
      { id: "l1", budget_inr: 10000000, created_at: "2026-07-02T00:00:00.000Z", stage: "new", workspace_id: WS },
      { id: "l2", budget_inr: 20000000, created_at: "2026-07-03T00:00:00.000Z", stage: "contacted", workspace_id: WS },
      { id: "l3", budget_inr: 15000000, created_at: "2026-07-01T00:00:00.000Z", stage: "booked", workspace_id: WS },
      { id: "l4", budget_inr: 25000000, created_at: "2026-07-04T00:00:00.000Z", stage: "new", workspace_id: WS },
      { id: "l5", budget_inr: 12000000, created_at: "2026-07-05T00:00:00.000Z", stage: "lost", workspace_id: WS },
    ],
    calls: [{ lead_id: "l1", created_at: "2026-07-02T00:10:00.000Z", workspace_id: WS }],
    contacts: [
      { id: "c1", first_name: "A", last_name: "One", full_name: "A One", email: "a@x", phone: "", company: "", job_title: "", city: "Mumbai", state: "", country: "", lead_source: "", status: "ACTIVE", preferred_contact_method: "", do_not_contact: false, tags: [], created_at: OLD, updated_at: OLD, workspace_id: WS },
      { id: "c2", first_name: "B", last_name: "Two", full_name: "B Two", email: "b@x", phone: "", company: "", job_title: "", city: "Pune", state: "", country: "", lead_source: "", status: "INACTIVE", preferred_contact_method: "", do_not_contact: false, tags: [], created_at: OLD, updated_at: OLD, workspace_id: WS },
      { id: "c3", first_name: "C", last_name: "Three", full_name: "C Three", email: "c@x", phone: "", company: "", job_title: "", city: "Mumbai", state: "", country: "", lead_source: "", status: "ACTIVE", preferred_contact_method: "", do_not_contact: false, tags: [], created_at: RECENT, updated_at: RECENT, workspace_id: WS },
    ],
    market_listings: [
      { id: "m1", source: "magicbricks", city: "Mumbai", locality: "", title: "", property_type: "apartment", listing_type: "sale", price: 5000000, price_unit: "INR", price_per_sqft: 12000, area_sqft: 400, bedrooms: 2, bathrooms: 2, floor: "", total_floors: 0, age_years: 0, furnishing: "unfurnished", builder: "", project: "", rera_id: "", url: "", scraped_at: RECENT, workspace_id: WS, created_at: RECENT },
      { id: "m2", source: "99acres", city: "Mumbai", locality: "", title: "", property_type: "apartment", listing_type: "sale", price: 4000000, price_unit: "INR", price_per_sqft: 10000, area_sqft: 400, bedrooms: 2, bathrooms: 2, floor: "", total_floors: 0, age_years: 0, furnishing: "unfurnished", builder: "", project: "", rera_id: "", url: "", scraped_at: RECENT, workspace_id: WS, created_at: RECENT },
      { id: "m3", source: "housing", city: "Pune", locality: "", title: "", property_type: "apartment", listing_type: "sale", price: 3000000, price_unit: "INR", price_per_sqft: 8000, area_sqft: 375, bedrooms: 2, bathrooms: 2, floor: "", total_floors: 0, age_years: 0, furnishing: "unfurnished", builder: "", project: "", rera_id: "", url: "", scraped_at: RECENT, workspace_id: WS, created_at: RECENT },
    ],
    market_trends: [
      { id: "t1", category: "demand", trend: "rising", strength: 0.8, time_window: "30d", recorded_at: RECENT, metadata: { demandIndex: 85, city: "Mumbai" }, workspace_id: WS },
    ],
    market_compliance: [
      { id: "cm1", source: "rera", record_type: "violation", project_name: "X", promoter: "", rera_number: "R1", city: "Mumbai", state: "MH", status: "under_review", registration_date: "", expiry_date: "", url: "", notes: "", scraped_at: RECENT, workspace_id: WS, created_at: RECENT },
      { id: "cm2", source: "rera", record_type: "project_registration", project_name: "New Proj", promoter: "P", rera_number: "R2", city: "Mumbai", state: "MH", status: "registered", registration_date: RECENT, expiry_date: "", url: "", notes: "", scraped_at: RECENT, workspace_id: WS, created_at: RECENT },
    ],
    market_opportunities: [],
  };
}

// EMPTY fixture set (tests uncertainty/empty-dataset honesty).
export function emptyFixtures(): Record<string, Row[]> {
  return {
    properties: [], leads: [], calls: [], contacts: [], market_listings: [], market_trends: [], market_compliance: [], market_opportunities: [],
  };
}


// =============================================================
// ROUTING EVALUATOR (deterministic — no DB)
// =============================================================
export interface RouteResult {
  message: string;
  intent: AgentIntent;
  capabilities: string[]; // planned steps (capability ids)
  selected: string | null;
  clarify: boolean;
  reason?: string;
}

export function evaluateRoute(message: string): RouteResult {
  const { intent, entities } = interpretIntent(message);
  entities.workspaceId = WS;
  const r = createPlan(intent, entities, true);
  const capabilities = (r.plan?.steps ?? []).map((s: { capability: string }) => s.capability);
  return {
    message,
    intent,
    capabilities,
    selected: r.selectedCapability ?? null,
    clarify: r.clarification,
    reason: r.reason,
  };
}

// =============================================================
// FULL PIPELINE RUNNER — interpret → plan → execute → synthesize
// (dry-run TRUE → DB_MUTATIONS = 0). Returns response + synthesis.
// =============================================================
export interface RC1Run {
  response: AgentResponse;
  synthesis: IntelligenceSynthesis;
  route: RouteResult;
}

export async function runRC1(message: string, fixtures: Record<string, Row[]>): Promise<RC1Run> {
  const supabase = fixtureSupabase(fixtures);
  const response = await processAgentRequest(
    { message, workspaceId: WS, inputMode: "text", dryRun: true },
    USER_ID,
    USER_ROLES,
    supabase,
  );
  const synthesis = response.synthesis
    ? response.synthesis
    : await synthesizeAgentResponse({ evidence: response.evidence });
  return { response, synthesis, route: evaluateRoute(message) };
}

/** True when the next-best-action / recommendation references a REAL capability. */
export function isRealCapability(id?: string): boolean {
  return !!id && (REGISTERED_CAPABILITIES as readonly string[]).includes(id);
}

export function priorityRank(p: SynthPriority): number {
  return p === "CRITICAL" ? 4 : p === "HIGH" ? 3 : p === "MEDIUM" ? 2 : 1;
}

/** True if narrative is NOT the raw JSON dump. */
export function narrativeIsNotRawJson(narrative: string): boolean {
  return !narrative.startsWith("{") && !narrative.startsWith("[") && narrative.includes("Confidence:");
}

