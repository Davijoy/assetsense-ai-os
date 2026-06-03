import { createFileRoute } from "@tanstack/react-router";
import {
  FileText,
  Upload,
  Search,
  Sparkles,
  FileBarChart,
  FileCheck2,
  FileSpreadsheet,
  FileSignature,
  Network,
  ArrowUpRight,
} from "lucide-react";

export const Route = createFileRoute("/app/documents")({
  head: () => ({ meta: [{ title: "Document Intelligence — Assetsense KIE" }] }),
  component: Documents,
});

const DOCS = [
  {
    name: "Lodha Park – Master Brochure.pdf",
    type: "Brochure",
    icon: FileText,
    entities: 142,
    insights: 12,
    confidence: 96,
    project: "Lodha Park",
    status: "processed",
  },
  {
    name: "Whitefield Market Report Q1 2026.pdf",
    type: "Market Report",
    icon: FileBarChart,
    entities: 87,
    insights: 9,
    confidence: 92,
    project: "Bengaluru / Whitefield",
    status: "processed",
  },
  {
    name: "RERA Registration – Prestige Falcon City.pdf",
    type: "RERA",
    icon: FileSignature,
    entities: 54,
    insights: 4,
    confidence: 99,
    project: "Prestige Falcon City",
    status: "processed",
  },
  {
    name: "Inventory Sheet – Tower B Phase 2.xlsx",
    type: "Inventory",
    icon: FileSpreadsheet,
    entities: 218,
    insights: 7,
    confidence: 94,
    project: "Lodha Park · Tower B",
    status: "processed",
  },
  {
    name: "Construction Progress – Oct 2026.pdf",
    type: "Site Report",
    icon: FileCheck2,
    entities: 31,
    insights: 3,
    confidence: 88,
    project: "Hiranandani Powai",
    status: "processing",
  },
];

const PIPELINE = [
  "OCR Extraction",
  "Classification",
  "Entity Extraction",
  "Structuring",
  "Knowledge Graph",
  "Insights",
  "Recommendations",
];

const INSIGHTS = [
  {
    tag: "Market Report",
    title: "Whitefield demand outpaces supply",
    body: "Demand grew 14% YoY while inventory grew only 4%. Likely 6–9% price uplift over next 2 quarters.",
    rec: "Increase acquisition focus on Whitefield 2BHK inventory.",
  },
  {
    tag: "Inventory",
    title: "Tower B absorption stalled",
    body: "Booking velocity fell 38% over 6 weeks despite traffic remaining flat. Pricing 7% above comparable inventory.",
    rec: "Launch a 60-day incentive campaign on Tower B 3BHK units.",
  },
  {
    tag: "RERA",
    title: "3 projects missing Q1 RERA filings",
    body: "Compliance risk flagged across Prestige Falcon, Lodha Trump, Brigade Cornerstone.",
    rec: "Notify legal team — file before Mar 31 deadline.",
  },
];

function Documents() {
  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs text-primary">
            <Network className="h-3 w-3" /> Knowledge Graph · 1,284 entities linked
          </div>
          <h1 className="mt-3 font-display text-4xl">
            Documents that <span className="text-gradient-emerald italic">think.</span>
          </h1>
          <p className="mt-1 max-w-xl text-sm text-muted-foreground">
            Drop in brochures, RERA filings, market reports, inventory sheets. KIE extracts entities, links them to your CRM, and surfaces decisions.
          </p>
        </div>
        <button className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground shadow-glow hover:bg-primary/90">
          <Upload className="h-4 w-4" /> Upload document
        </button>
      </div>

      {/* Pipeline */}
      <div className="rounded-2xl border border-border/60 bg-card p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-display text-2xl">Processing Pipeline</h3>
          <span className="text-xs text-muted-foreground">7-stage RAG ingestion · avg 42s / doc</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {PIPELINE.map((p, i) => (
            <div
              key={p}
              className="flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1.5 text-xs"
            >
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/20 text-[10px] text-primary">
                {i + 1}
              </span>
              {p}
            </div>
          ))}
        </div>
      </div>

      {/* Library */}
      <div className="rounded-2xl border border-border/60 bg-card">
        <div className="flex items-center justify-between border-b border-border/60 p-5">
          <h3 className="font-display text-2xl">Document Library</h3>
          <div className="flex items-center gap-2 rounded-lg border border-border/60 bg-surface px-3 py-1.5 text-sm">
            <Search className="h-3.5 w-3.5 text-muted-foreground" />
            <input
              placeholder="Ask: ‘pricing trends in Whitefield’"
              className="w-72 bg-transparent text-xs outline-none placeholder:text-muted-foreground"
            />
          </div>
        </div>
        <div className="divide-y divide-border/60">
          {DOCS.map((d) => {
            const Icon = d.icon;
            return (
              <div key={d.name} className="flex items-center gap-4 p-5 hover:bg-surface/50">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{d.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {d.type} · {d.project}
                  </div>
                </div>
                <div className="hidden text-right text-xs text-muted-foreground md:block">
                  <div>{d.entities} entities</div>
                  <div>{d.insights} insights</div>
                </div>
                <div className="hidden text-right md:block">
                  <div className="text-xs text-muted-foreground">Confidence</div>
                  <div className="text-sm text-primary">{d.confidence}%</div>
                </div>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wider ${
                    d.status === "processed"
                      ? "bg-primary/10 text-primary"
                      : "bg-yellow-500/10 text-yellow-400"
                  }`}
                >
                  {d.status}
                </span>
                <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
              </div>
            );
          })}
        </div>
      </div>

      {/* Generated insights */}
      <div>
        <h3 className="mb-4 flex items-center gap-2 font-display text-2xl">
          <Sparkles className="h-5 w-5 text-primary" /> Insights from your documents
        </h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {INSIGHTS.map((i) => (
            <div key={i.title} className="rounded-2xl border border-border/60 bg-card p-5">
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] uppercase tracking-wider text-primary">
                {i.tag}
              </span>
              <h4 className="mt-3 font-display text-xl">{i.title}</h4>
              <p className="mt-1 text-sm text-muted-foreground">{i.body}</p>
              <div className="mt-4 border-t border-border/60 pt-3 text-xs">
                <span className="text-muted-foreground">Recommendation: </span>
                <span className="text-foreground">{i.rec}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}