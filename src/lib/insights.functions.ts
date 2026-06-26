import { createServerFn } from "@tanstack/react-start";

export type InsightDriver = { label: string; weight: number };
export type InsightSource = {
  label: string;
  type: "Portal" | "Internal" | "Regulator" | "Partner" | "Research";
  ref: string;
  url?: string;
  lastSync: string;
};
export type InsightDataset = {
  id: string;
  description: string;
  rows: string;
  coverage: string;
  updated: string;
};
export type DatasetField = {
  name: string;
  type: string;
  description: string;
  pii?: boolean;
};
export type DatasetDetail = {
  id: string;
  description: string;
  rows: string;
  coverage: string;
  updated: string;
  source: string;
  owner: string;
  refreshCadence: string;
  retention: string;
  freshnessSlaMins: number;
  lastSyncedAt: string;
  primaryKey: string[];
  fields: DatasetField[];
  sampleRows: Record<string, string | number>[];
  lineage: string[];
};
export type FormulaRef = { symbol: string; meaning: string; source: string };
export type InsightExplanation = {
  model: string;
  algorithmFamily: string;
  inputs: string[];
  features: string[];
  formula: string;
  confidence: number;
  drivers: InsightDriver[];
  refreshed: string;
  generatedAt: string;
  sources: InsightSource[];
  datasets: InsightDataset[];
  formulaRefs: FormulaRef[];
  citation: string;
};

type Input = {
  tag: string;
  title: string;
  project?: string | null;
  docType?: string | null;
};

const REGISTRY: Record<
  string,
  Omit<InsightExplanation, "confidence" | "drivers" | "refreshed" | "generatedAt">
> = {
  "market report": {
    model: "Gradient Boosted Regression (XGBoost) + Prophet trend decomposition",
    algorithmFamily: "Supervised regression + time-series decomposition",
    inputs: [
      "MagicBricks + 99acres listing velocity (last 8 quarters)",
      "RERA new-launch supply filings for the target PIN",
      "Sentinel CRM lead intent scores",
      "CREDAI micro-market price index",
    ],
    features: [
      "demand_growth_yoy",
      "supply_growth_yoy",
      "absorption_rate",
      "lead_intent_index",
      "seasonality_q",
    ],
    formula:
      "Δprice = f(demand_growth − supply_growth, absorption_rate, lead_intent_index)",
    sources: [
      { label: "MagicBricks Listing Feed", type: "Portal", ref: "MB-LIST-IN-v4", url: "https://www.magicbricks.com", lastSync: "2h ago" },
      { label: "99acres Listing Feed", type: "Portal", ref: "99A-LIST-IN-v3", url: "https://www.99acres.com", lastSync: "2h ago" },
      { label: "RERA New-Launch Filings", type: "Regulator", ref: "RERA-NL-Q1-26", url: "https://rera.karnataka.gov.in", lastSync: "1d ago" },
      { label: "CREDAI Micro-Market Index", type: "Research", ref: "CREDAI-MMI-2026Q1", url: "https://credai.org", lastSync: "7d ago" },
      { label: "Sentinel CRM Lead Intent", type: "Internal", ref: "sentinel.crm.leads", lastSync: "5m ago" },
    ],
    datasets: [
      { id: "ds.market.listings", description: "Joined listing velocity across IN portals", rows: "1.42M rows · 8Q", coverage: "412 PIN codes", updated: "2h ago" },
      { id: "ds.market.supply", description: "RERA new-launch units by PIN × quarter", rows: "38.7K rows", coverage: "Pan-India tier 1+2", updated: "1d ago" },
      { id: "ds.crm.intent", description: "Lead intent scores from Sentinel CRM", rows: "284K leads", coverage: "Sentinel tenants", updated: "5m ago" },
    ],
    formulaRefs: [
      { symbol: "demand_growth", meaning: "YoY change in qualified-lead + listing-view volume", source: "ds.market.listings ⨝ ds.crm.intent" },
      { symbol: "supply_growth", meaning: "YoY change in new-launch units filed with RERA", source: "ds.market.supply" },
      { symbol: "absorption_rate", meaning: "Bookings ÷ launched units (trailing 4Q)", source: "ds.market.supply ⨝ ds.crm.intent" },
      { symbol: "lead_intent_index", meaning: "Avg Sentinel intent score (0–100)", source: "ds.crm.intent" },
    ],
    citation: "Sentinel KIE Market Model · MR-XGB-Prophet v3.1 (2026-Q1)",
  },
  inventory: {
    model: "Bayesian Change-Point Detection + Poisson booking-velocity model",
    algorithmFamily: "Probabilistic change-point + count regression",
    inputs: [
      "Booking events per week",
      "Site-visit traffic and call-volume (Sentinel Voice AI)",
      "Listed price vs comparable inventory within 3km",
      "Channel-partner conversion ratios",
    ],
    features: [
      "bookings_per_week",
      "visit_to_booking_ratio",
      "price_gap_vs_comps",
      "partner_conv_rate",
    ],
    formula:
      "velocity_drop = (μ_recent − μ_baseline)/μ_baseline   |   price_gap = listed/comp − 1",
    sources: [
      { label: "Sentinel Bookings Ledger", type: "Internal", ref: "sentinel.crm.bookings", lastSync: "15m ago" },
      { label: "Sentinel Voice AI Call Logs", type: "Internal", ref: "sentinel.voice.calls", lastSync: "10m ago" },
      { label: "Comparable Inventory Index", type: "Research", ref: "SFG-COMP-3KM-v2", lastSync: "1d ago" },
      { label: "Channel-Partner Conversion", type: "Partner", ref: "sentinel.partners.funnel", lastSync: "1h ago" },
    ],
    datasets: [
      { id: "ds.inv.bookings", description: "Weekly booking events per tower/unit type", rows: "92K events", coverage: "All active towers", updated: "15m ago" },
      { id: "ds.inv.traffic", description: "Site visits + call volume per project", rows: "1.1M sessions", coverage: "All active projects", updated: "10m ago" },
      { id: "ds.inv.comps", description: "Price comparables within 3km radius", rows: "48K listings", coverage: "Live portal scrape", updated: "1d ago" },
    ],
    formulaRefs: [
      { symbol: "μ_recent", meaning: "Mean weekly bookings, trailing 6 weeks", source: "ds.inv.bookings" },
      { symbol: "μ_baseline", meaning: "Mean weekly bookings, trailing 26 weeks", source: "ds.inv.bookings" },
      { symbol: "listed", meaning: "Current listed price per sq.ft", source: "sentinel.crm.inventory" },
      { symbol: "comp", meaning: "Median price per sq.ft of comparables", source: "ds.inv.comps" },
    ],
    citation: "Sentinel KIE Inventory Velocity Model · INV-BCP-Poisson v2.4",
  },
  rera: {
    model: "Rule-based compliance engine + NER (spaCy transformer) on RERA portal scrape",
    algorithmFamily: "Symbolic rules + transformer NER",
    inputs: [
      "RERA state portal quarterly filing index",
      "Project-to-RERA-ID mapping from Sentinel Knowledge Graph",
      "Filing deadline calendar (state-wise)",
      "Historical filing latency per developer",
    ],
    features: ["missing_filings", "days_to_deadline", "developer_latency_score"],
    formula: "risk = missing_filings × days_to_deadline⁻¹ × developer_latency_score",
    sources: [
      { label: "Karnataka RERA Portal", type: "Regulator", ref: "K-RERA-Q-FILINGS", url: "https://rera.karnataka.gov.in", lastSync: "6h ago" },
      { label: "Maharashtra RERA Portal", type: "Regulator", ref: "MAHA-RERA-Q-FILINGS", url: "https://maharera.maharashtra.gov.in", lastSync: "6h ago" },
      { label: "Sentinel Knowledge Graph", type: "Internal", ref: "sentinel.kg.projects", lastSync: "live" },
      { label: "Statutory Deadline Calendar", type: "Research", ref: "SFG-RERA-CAL-2026", lastSync: "30d ago" },
    ],
    datasets: [
      { id: "ds.rera.filings", description: "Quarterly filing status per RERA ID", rows: "84K filings", coverage: "12 states", updated: "6h ago" },
      { id: "ds.rera.developers", description: "Historical filing latency by developer", rows: "3.2K developers", coverage: "Pan-India", updated: "weekly" },
    ],
    formulaRefs: [
      { symbol: "missing_filings", meaning: "Count of overdue quarterly filings", source: "ds.rera.filings" },
      { symbol: "days_to_deadline", meaning: "Days until next statutory deadline", source: "SFG-RERA-CAL-2026" },
      { symbol: "developer_latency_score", meaning: "Rolling avg days late, last 8Q", source: "ds.rera.developers" },
    ],
    citation: "Sentinel KIE Compliance Engine · RERA-RULES v5.2",
  },
  brochure: {
    model: "Layout-aware transformer (LayoutLMv3) + RAG summarization",
    algorithmFamily: "Multimodal document understanding",
    inputs: [
      "Brochure pages (text + layout)",
      "Embedded amenity & specification tables",
      "Project metadata from Knowledge Graph",
    ],
    features: ["unit_mix", "amenities_count", "spec_richness_score"],
    formula: "score = w1·unit_mix + w2·amenities + w3·spec_richness",
    sources: [
      { label: "Uploaded Brochure PDF", type: "Internal", ref: "kie.documents", lastSync: "on upload" },
      { label: "Sentinel Knowledge Graph", type: "Internal", ref: "sentinel.kg.projects", lastSync: "live" },
      { label: "Amenity Taxonomy", type: "Research", ref: "SFG-AMEN-TAX-v3", lastSync: "30d ago" },
    ],
    datasets: [
      { id: "ds.docs.chunks", description: "Layout-aware text chunks + embeddings", rows: "per-doc", coverage: "kie_doc_chunks", updated: "on ingest" },
      { id: "ds.kg.projects", description: "Linked project entities & specs", rows: "1.28K entities", coverage: "Sentinel tenant", updated: "live" },
    ],
    formulaRefs: [
      { symbol: "unit_mix", meaning: "Diversity of BHK configurations offered", source: "ds.docs.chunks" },
      { symbol: "amenities", meaning: "Mapped amenities against taxonomy", source: "SFG-AMEN-TAX-v3" },
      { symbol: "spec_richness", meaning: "Coverage of 42 spec attributes", source: "ds.docs.chunks" },
    ],
    citation: "Sentinel KIE Brochure Parser · LayoutLMv3-RAG v1.8",
  },
  "site report": {
    model: "Vision transformer (ViT) + construction-progress CNN classifier",
    algorithmFamily: "Computer vision",
    inputs: ["Drone & site photos", "Milestone schedule", "Prior week classifications"],
    features: ["slab_progress_pct", "facade_progress_pct", "milestone_variance_days"],
    formula: "delay_risk = Σ milestone_variance × criticality_weight",
    sources: [
      { label: "Drone Imagery Feed", type: "Partner", ref: "sentinel.site.drone", lastSync: "weekly" },
      { label: "Project Milestone Schedule", type: "Internal", ref: "sentinel.crm.schedule", lastSync: "live" },
      { label: "Historical Progress Labels", type: "Internal", ref: "ds.site.history", lastSync: "1d ago" },
    ],
    datasets: [
      { id: "ds.site.images", description: "Site photos labeled by stage", rows: "182K images", coverage: "Active projects", updated: "weekly" },
      { id: "ds.site.schedule", description: "Milestone plan vs actual", rows: "9.4K milestones", coverage: "All projects", updated: "live" },
    ],
    formulaRefs: [
      { symbol: "milestone_variance", meaning: "Actual − planned date, in days", source: "ds.site.schedule" },
      { symbol: "criticality_weight", meaning: "Critical-path weight (0–1)", source: "sentinel.crm.schedule" },
    ],
    citation: "Sentinel KIE Site Progress Model · SITE-ViT-CNN v2.0",
  },
};

function pickKey(tag: string, docType?: string | null) {
  const k = (docType || tag || "").toLowerCase();
  if (REGISTRY[k]) return k;
  for (const key of Object.keys(REGISTRY)) if (k.includes(key)) return key;
  return "market report";
}

function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

function makeDrivers(features: string[], seed: number): InsightDriver[] {
  const raw = features.map((_, i) => ((hash(`${seed}:${i}`) % 80) + 20) / 100);
  const sum = raw.reduce((a, b) => a + b, 0);
  const norm = raw.map((v) => v / sum);
  return features
    .map((f, i) => ({
      label: f.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
      weight: Math.round(norm[i] * 100) / 100,
    }))
    .sort((a, b) => b.weight - a.weight);
}

export const getInsightExplanation = createServerFn({ method: "POST" })
  .inputValidator((d: Input) => d)
  .handler(async ({ data }): Promise<InsightExplanation> => {
    const key = pickKey(data.tag, data.docType);
    const base = REGISTRY[key];
    const seed = hash(`${data.title}|${data.project ?? ""}|${key}`);
    const confidence = 82 + (seed % 17);
    const drivers = makeDrivers(base.features, seed);
    const minsAgo = (seed % 180) + 5;
    const refreshed = `Refreshed ${minsAgo}m ago · retrained ${
      key === "rera" ? "daily" : key === "inventory" ? "hourly" : "weekly"
    }`;
    return {
      ...base,
      inputs: data.project
        ? base.inputs.map((x) => x.replace(/target PIN|target area/gi, data.project!))
        : base.inputs,
      confidence,
      drivers,
      refreshed,
      generatedAt: new Date().toISOString(),
    };
  });
