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

const DATASETS: Record<string, DatasetDetail> = {
  "ds.market.listings": {
    id: "ds.market.listings",
    description: "Joined listing velocity across IN portals (MagicBricks, 99acres).",
    rows: "1.42M rows · 8Q",
    coverage: "412 PIN codes",
    updated: "2h ago",
    source: "MagicBricks + 99acres scrape · normalized in Sentinel ETL",
    owner: "Market Intelligence · data-platform@sentinelfort.ai",
    refreshCadence: "Every 2 hours",
    retention: "104 weeks rolling",
    freshnessSlaMins: 180,
    lastSyncedAt: "2026-06-26T09:42:00Z",
    primaryKey: ["pin_code", "week_start", "portal"],
    fields: [
      { name: "pin_code", type: "text", description: "6-digit India PIN" },
      { name: "week_start", type: "date", description: "Monday of the ISO week" },
      { name: "portal", type: "text", description: "Source portal (mb / 99a)" },
      { name: "active_listings", type: "int", description: "Live listings count" },
      { name: "new_listings", type: "int", description: "First-seen listings that week" },
      { name: "median_psf", type: "numeric", description: "Median ₹/sq.ft" },
      { name: "views_per_listing", type: "numeric", description: "Avg listing detail views" },
    ],
    sampleRows: [
      { pin_code: "560066", week_start: "2026-06-22", portal: "mb", active_listings: 1284, new_listings: 92, median_psf: 8420, views_per_listing: 41.2 },
      { pin_code: "560066", week_start: "2026-06-22", portal: "99a", active_listings: 1102, new_listings: 78, median_psf: 8510, views_per_listing: 36.8 },
      { pin_code: "560103", week_start: "2026-06-22", portal: "mb", active_listings: 842, new_listings: 51, median_psf: 9210, views_per_listing: 52.4 },
    ],
    lineage: ["raw.portals.mb_listings", "raw.portals.99a_listings", "stg.listings_normalized", "ds.market.listings"],
  },
  "ds.market.supply": {
    id: "ds.market.supply",
    description: "RERA new-launch units aggregated by PIN × quarter.",
    rows: "38.7K rows",
    coverage: "Pan-India tier 1+2",
    updated: "1d ago",
    source: "State RERA portals · scraped + parsed",
    owner: "Compliance Intelligence",
    refreshCadence: "Daily 02:00 IST",
    retention: "Indefinite",
    freshnessSlaMins: 1440,
    lastSyncedAt: "2026-06-25T20:30:00Z",
    primaryKey: ["rera_id", "quarter"],
    fields: [
      { name: "rera_id", type: "text", description: "State RERA registration id" },
      { name: "pin_code", type: "text", description: "Project PIN" },
      { name: "quarter", type: "text", description: "YYYY-Qn" },
      { name: "units_launched", type: "int", description: "New units filed" },
      { name: "units_booked", type: "int", description: "Reported booked" },
      { name: "developer", type: "text", description: "Developer entity" },
    ],
    sampleRows: [
      { rera_id: "PRM/KA/RERA/1251/446/PR/220114/004562", pin_code: "560066", quarter: "2026-Q1", units_launched: 312, units_booked: 184, developer: "Prestige" },
      { rera_id: "P51700050384", pin_code: "400076", quarter: "2026-Q1", units_launched: 248, units_booked: 96, developer: "Lodha" },
    ],
    lineage: ["raw.rera.filings", "stg.rera_parsed", "ds.market.supply"],
  },
  "ds.crm.intent": {
    id: "ds.crm.intent",
    description: "Lead intent scores produced by Sentinel CRM scoring model.",
    rows: "284K leads",
    coverage: "Sentinel tenants",
    updated: "5m ago",
    source: "sentinel.crm.leads + voice + web events",
    owner: "CRM Platform",
    refreshCadence: "Streaming (≤5m latency)",
    retention: "24 months",
    freshnessSlaMins: 5,
    lastSyncedAt: "2026-06-26T11:40:00Z",
    primaryKey: ["lead_id"],
    fields: [
      { name: "lead_id", type: "uuid", description: "Sentinel lead identifier" },
      { name: "tenant_key", type: "text", description: "Tenant scope" },
      { name: "intent_score", type: "int", description: "0–100 intent" },
      { name: "stage", type: "text", description: "Funnel stage" },
      { name: "project", type: "text", description: "Project of interest" },
      { name: "email", type: "text", description: "Lead email", pii: true },
      { name: "phone", type: "text", description: "Lead phone", pii: true },
    ],
    sampleRows: [
      { lead_id: "a1f2…9b", tenant_key: "sfg", intent_score: 87, stage: "site_visit", project: "Lodha Park", email: "***@***", phone: "+91-9***" },
      { lead_id: "c4d8…12", tenant_key: "sfg", intent_score: 62, stage: "qualified", project: "Prestige Falcon", email: "***@***", phone: "+91-9***" },
    ],
    lineage: ["public.leads", "public.calls", "stg.intent_features", "ds.crm.intent"],
  },
  "ds.inv.bookings": {
    id: "ds.inv.bookings",
    description: "Weekly booking events per tower / unit-type.",
    rows: "92K events",
    coverage: "All active towers",
    updated: "15m ago",
    source: "sentinel.crm.bookings",
    owner: "Sales Ops",
    refreshCadence: "Every 15 minutes",
    retention: "5 years",
    freshnessSlaMins: 15,
    lastSyncedAt: "2026-06-26T11:30:00Z",
    primaryKey: ["project", "tower", "week_start", "unit_type"],
    fields: [
      { name: "project", type: "text", description: "Project name" },
      { name: "tower", type: "text", description: "Tower id" },
      { name: "unit_type", type: "text", description: "BHK config" },
      { name: "week_start", type: "date", description: "Monday of ISO week" },
      { name: "bookings", type: "int", description: "Confirmed bookings" },
      { name: "cancellations", type: "int", description: "Cancellations in week" },
      { name: "avg_ticket_inr", type: "bigint", description: "Avg ticket size in INR" },
    ],
    sampleRows: [
      { project: "Lodha Park", tower: "B", unit_type: "3BHK", week_start: "2026-06-22", bookings: 4, cancellations: 1, avg_ticket_inr: 32500000 },
      { project: "Lodha Park", tower: "B", unit_type: "2BHK", week_start: "2026-06-22", bookings: 9, cancellations: 0, avg_ticket_inr: 21800000 },
      { project: "Lodha Park", tower: "A", unit_type: "3BHK", week_start: "2026-06-22", bookings: 7, cancellations: 0, avg_ticket_inr: 33100000 },
    ],
    lineage: ["public.bookings", "stg.bookings_weekly", "ds.inv.bookings"],
  },
  "ds.inv.traffic": {
    id: "ds.inv.traffic",
    description: "Site visits and call volume per project.",
    rows: "1.1M sessions",
    coverage: "All active projects",
    updated: "10m ago",
    source: "Sentinel Voice AI + web analytics",
    owner: "Demand Ops",
    refreshCadence: "Every 10 minutes",
    retention: "18 months",
    freshnessSlaMins: 10,
    lastSyncedAt: "2026-06-26T11:35:00Z",
    primaryKey: ["project", "day"],
    fields: [
      { name: "project", type: "text", description: "Project name" },
      { name: "day", type: "date", description: "Day in IST" },
      { name: "site_visits", type: "int", description: "Physical site visits" },
      { name: "inbound_calls", type: "int", description: "Voice AI inbound calls" },
      { name: "qualified_calls", type: "int", description: "Calls marked qualified" },
    ],
    sampleRows: [
      { project: "Lodha Park", day: "2026-06-25", site_visits: 38, inbound_calls: 124, qualified_calls: 41 },
      { project: "Prestige Falcon", day: "2026-06-25", site_visits: 22, inbound_calls: 87, qualified_calls: 29 },
    ],
    lineage: ["public.calls", "raw.web.sessions", "ds.inv.traffic"],
  },
  "ds.inv.comps": {
    id: "ds.inv.comps",
    description: "Price comparables within 3km radius of each project.",
    rows: "48K listings",
    coverage: "Live portal scrape",
    updated: "1d ago",
    source: "Portal listings + geo-join",
    owner: "Market Intelligence",
    refreshCadence: "Daily 03:00 IST",
    retention: "12 months",
    freshnessSlaMins: 1440,
    lastSyncedAt: "2026-06-25T21:30:00Z",
    primaryKey: ["project", "comp_listing_id"],
    fields: [
      { name: "project", type: "text", description: "Reference project" },
      { name: "comp_listing_id", type: "text", description: "Portal listing id" },
      { name: "distance_km", type: "numeric", description: "Distance from project" },
      { name: "psf_inr", type: "numeric", description: "Listed ₹/sq.ft" },
      { name: "bhk", type: "text", description: "Configuration" },
    ],
    sampleRows: [
      { project: "Lodha Park", comp_listing_id: "mb-9381", distance_km: 1.2, psf_inr: 41200, bhk: "3BHK" },
      { project: "Lodha Park", comp_listing_id: "99a-2210", distance_km: 2.4, psf_inr: 39800, bhk: "3BHK" },
    ],
    lineage: ["raw.portals.mb_listings", "raw.portals.99a_listings", "stg.geo_join", "ds.inv.comps"],
  },
  "ds.rera.filings": {
    id: "ds.rera.filings",
    description: "Quarterly filing status per RERA registration.",
    rows: "84K filings",
    coverage: "12 states",
    updated: "6h ago",
    source: "State RERA portals",
    owner: "Compliance",
    refreshCadence: "Every 6 hours",
    retention: "Indefinite",
    freshnessSlaMins: 360,
    lastSyncedAt: "2026-06-26T06:00:00Z",
    primaryKey: ["rera_id", "quarter"],
    fields: [
      { name: "rera_id", type: "text", description: "RERA registration id" },
      { name: "state", type: "text", description: "State code" },
      { name: "quarter", type: "text", description: "YYYY-Qn" },
      { name: "filed", type: "bool", description: "Filing on record" },
      { name: "days_late", type: "int", description: "Days past deadline (0 if on time)" },
    ],
    sampleRows: [
      { rera_id: "PRM/KA/…/004562", state: "KA", quarter: "2026-Q1", filed: true, days_late: 0 },
      { rera_id: "P51700050384", state: "MH", quarter: "2026-Q1", filed: false, days_late: 18 },
    ],
    lineage: ["raw.rera.filings", "ds.rera.filings"],
  },
  "ds.rera.developers": {
    id: "ds.rera.developers",
    description: "Historical filing latency by developer.",
    rows: "3.2K developers",
    coverage: "Pan-India",
    updated: "weekly",
    source: "Aggregated from ds.rera.filings",
    owner: "Compliance",
    refreshCadence: "Weekly Sunday 04:00 IST",
    retention: "Indefinite",
    freshnessSlaMins: 10080,
    lastSyncedAt: "2026-06-22T22:30:00Z",
    primaryKey: ["developer"],
    fields: [
      { name: "developer", type: "text", description: "Developer entity" },
      { name: "avg_days_late_8q", type: "numeric", description: "Rolling avg days late, last 8Q" },
      { name: "filings_total", type: "int", description: "Total filings observed" },
      { name: "latency_score", type: "numeric", description: "Normalized 0–1 latency score" },
    ],
    sampleRows: [
      { developer: "Prestige", avg_days_late_8q: 1.2, filings_total: 412, latency_score: 0.08 },
      { developer: "Lodha", avg_days_late_8q: 6.4, filings_total: 388, latency_score: 0.31 },
    ],
    lineage: ["ds.rera.filings", "ds.rera.developers"],
  },
  "ds.docs.chunks": {
    id: "ds.docs.chunks",
    description: "Layout-aware text chunks + embeddings from ingested docs.",
    rows: "per-doc",
    coverage: "kie_doc_chunks",
    updated: "on ingest",
    source: "kie_documents pipeline",
    owner: "Knowledge Engine",
    refreshCadence: "On upload",
    retention: "Tied to source document",
    freshnessSlaMins: 0,
    lastSyncedAt: "live",
    primaryKey: ["document_id", "chunk_index"],
    fields: [
      { name: "document_id", type: "uuid", description: "Source kie_document" },
      { name: "chunk_index", type: "int", description: "Sequential chunk number" },
      { name: "content", type: "text", description: "Chunk text (≈800 tokens)" },
      { name: "embedding", type: "vector(1536)", description: "OpenAI text-embedding-3-small" },
      { name: "token_count", type: "int", description: "Token length of chunk" },
    ],
    sampleRows: [
      { document_id: "8a…f1", chunk_index: 0, content: "Lodha Park Tower B offers…", embedding: "[0.012, -0.041, …]", token_count: 812 },
      { document_id: "8a…f1", chunk_index: 1, content: "Amenities include 50m pool…", embedding: "[0.034, 0.008, …]", token_count: 764 },
    ],
    lineage: ["kie_documents", "kie_doc_chunks"],
  },
  "ds.kg.projects": {
    id: "ds.kg.projects",
    description: "Linked project entities, specs, and relationships.",
    rows: "1.28K entities",
    coverage: "Sentinel tenant",
    updated: "live",
    source: "Knowledge Graph extractor",
    owner: "Knowledge Engine",
    refreshCadence: "Streaming",
    retention: "Indefinite",
    freshnessSlaMins: 1,
    lastSyncedAt: "live",
    primaryKey: ["entity_id"],
    fields: [
      { name: "entity_id", type: "uuid", description: "Graph node id" },
      { name: "entity_type", type: "text", description: "project / developer / amenity" },
      { name: "name", type: "text", description: "Display name" },
      { name: "attrs", type: "jsonb", description: "Typed attribute bag" },
    ],
    sampleRows: [
      { entity_id: "pr-104", entity_type: "project", name: "Lodha Park", attrs: '{"towers":7}' },
      { entity_id: "dv-12", entity_type: "developer", name: "Lodha", attrs: '{"hq":"Mumbai"}' },
    ],
    lineage: ["kie_documents", "stg.kg_extract", "ds.kg.projects"],
  },
  "ds.site.images": {
    id: "ds.site.images",
    description: "Site photos labeled by construction stage.",
    rows: "182K images",
    coverage: "Active projects",
    updated: "weekly",
    source: "Drone partner uploads",
    owner: "Construction Intelligence",
    refreshCadence: "Weekly Monday 06:00 IST",
    retention: "Project lifetime",
    freshnessSlaMins: 10080,
    lastSyncedAt: "2026-06-22T00:30:00Z",
    primaryKey: ["image_id"],
    fields: [
      { name: "image_id", type: "uuid", description: "Image identifier" },
      { name: "project", type: "text", description: "Project name" },
      { name: "captured_at", type: "timestamptz", description: "Capture time" },
      { name: "stage_label", type: "text", description: "slab / facade / finishing" },
      { name: "confidence", type: "numeric", description: "Classifier confidence" },
    ],
    sampleRows: [
      { image_id: "img-9921", project: "Hiranandani Powai", captured_at: "2026-06-22T07:14Z", stage_label: "facade", confidence: 0.94 },
      { image_id: "img-9922", project: "Hiranandani Powai", captured_at: "2026-06-22T07:15Z", stage_label: "facade", confidence: 0.88 },
    ],
    lineage: ["raw.drone.uploads", "stg.images_classified", "ds.site.images"],
  },
  "ds.site.schedule": {
    id: "ds.site.schedule",
    description: "Project milestone plan vs actual dates.",
    rows: "9.4K milestones",
    coverage: "All projects",
    updated: "live",
    source: "sentinel.crm.schedule",
    owner: "Project Management",
    refreshCadence: "Streaming",
    retention: "Project lifetime",
    freshnessSlaMins: 5,
    lastSyncedAt: "live",
    primaryKey: ["project", "milestone_id"],
    fields: [
      { name: "project", type: "text", description: "Project name" },
      { name: "milestone_id", type: "text", description: "Milestone code" },
      { name: "planned_date", type: "date", description: "Planned completion" },
      { name: "actual_date", type: "date", description: "Actual completion" },
      { name: "criticality", type: "numeric", description: "Critical path weight 0–1" },
    ],
    sampleRows: [
      { project: "Hiranandani Powai", milestone_id: "T3-SLAB-18", planned_date: "2026-06-15", actual_date: "2026-06-22", criticality: 0.8 },
      { project: "Hiranandani Powai", milestone_id: "T3-FAC-04", planned_date: "2026-07-01", actual_date: "—", criticality: 0.6 },
    ],
    lineage: ["public.schedule", "ds.site.schedule"],
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
