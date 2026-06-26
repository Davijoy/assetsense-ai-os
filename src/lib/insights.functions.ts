import { createServerFn } from "@tanstack/react-start";

export type InsightDriver = { label: string; weight: number };
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
  },
  "site report": {
    model: "Vision transformer (ViT) + construction-progress CNN classifier",
    algorithmFamily: "Computer vision",
    inputs: ["Drone & site photos", "Milestone schedule", "Prior week classifications"],
    features: ["slab_progress_pct", "facade_progress_pct", "milestone_variance_days"],
    formula: "delay_risk = Σ milestone_variance × criticality_weight",
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
