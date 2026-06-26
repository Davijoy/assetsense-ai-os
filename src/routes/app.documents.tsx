import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getInsightExplanation, getDatasetDetail } from "@/lib/insights.functions";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
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
  Info,
  Database,
  BookOpen,
  ExternalLink,
} from "lucide-react";

export const Route = createFileRoute("/app/documents")({
  head: () => ({ meta: [{ title: "Document Intelligence — Sentinel Knowledge Engine" }] }),
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
    docType: "Market Report",
    project: "Bengaluru / Whitefield",
    title: "Whitefield demand outpaces supply",
    body: "Demand grew 14% YoY while inventory grew only 4%. Likely 6–9% price uplift over next 2 quarters.",
    rec: "Increase acquisition focus on Whitefield 2BHK inventory.",
  },
  {
    tag: "Inventory",
    docType: "Inventory",
    project: "Lodha Park · Tower B",
    title: "Tower B absorption stalled",
    body: "Booking velocity fell 38% over 6 weeks despite traffic remaining flat. Pricing 7% above comparable inventory.",
    rec: "Launch a 60-day incentive campaign on Tower B 3BHK units.",
  },
  {
    tag: "RERA",
    docType: "RERA",
    project: "Prestige Falcon City",
    title: "3 projects missing Q1 RERA filings",
    body: "Compliance risk flagged across Prestige Falcon, Lodha Trump, Brigade Cornerstone.",
    rec: "Notify legal team — file before Mar 31 deadline.",
  },
];

function Documents() {
  const [open, setOpen] = useState<number | null>(null);
  const [datasetId, setDatasetId] = useState<string | null>(null);
  const active = open !== null ? INSIGHTS[open] : null;
  const fetchExplain = useServerFn(getInsightExplanation);
  const fetchDataset = useServerFn(getDatasetDetail);
  const { data: method, isLoading: methodLoading } = useQuery({
    queryKey: ["insight-explain", active?.title],
    enabled: !!active,
    queryFn: () =>
      fetchExplain({
        data: {
          tag: active!.tag,
          title: active!.title,
          project: active!.project,
          docType: active!.docType,
        },
      }),
    staleTime: 60_000,
  });
  const { data: dataset, isLoading: datasetLoading } = useQuery({
    queryKey: ["dataset-detail", datasetId],
    enabled: !!datasetId,
    queryFn: () => fetchDataset({ data: { id: datasetId! } }),
    staleTime: 60_000,
  });
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
          {INSIGHTS.map((i, idx) => (
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
              <button
                onClick={() => setOpen(idx)}
                className="mt-4 inline-flex items-center gap-1.5 rounded-md border border-primary/30 bg-primary/5 px-2.5 py-1 text-xs text-primary hover:bg-primary/10"
              >
                <Info className="h-3 w-3" /> Know more · How is this calculated?
              </button>
            </div>
          ))}
        </div>
      </div>

      <Dialog open={open !== null} onOpenChange={(v) => !v && setOpen(null)}>
        <DialogContent className="max-w-2xl">
          {active && (
            <>
              <DialogHeader>
                <span className="w-fit rounded-full bg-primary/10 px-2 py-0.5 text-[10px] uppercase tracking-wider text-primary">
                  {active.tag}
                </span>
                <DialogTitle className="font-display text-2xl">{active.title}</DialogTitle>
                <DialogDescription>{active.body}</DialogDescription>
              </DialogHeader>

              {methodLoading || !method ? (
                <div className="space-y-3 text-sm">
                  <div className="h-16 animate-pulse rounded-lg bg-surface" />
                  <div className="h-24 animate-pulse rounded-lg bg-surface" />
                  <div className="h-20 animate-pulse rounded-lg bg-surface" />
                  <div className="text-xs text-muted-foreground">
                    Fetching explanation payload from backend…
                  </div>
                </div>
              ) : (
              <div className="space-y-4 text-sm">
                <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
                  <div className="text-[10px] uppercase tracking-wider text-primary">Model / Algorithm</div>
                  <div className="mt-1 font-medium">{method.model}</div>
                  <div className="mt-0.5 text-[11px] text-muted-foreground">
                    {method.algorithmFamily}
                  </div>
                </div>

                <div>
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Data inputs</div>
                  <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                    {method.inputs.map((x) => (
                      <li key={x} className="flex gap-2">
                        <span className="text-primary">•</span> {x}
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Features</div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {method.features.map((f) => (
                      <span
                        key={f}
                        className="rounded-md border border-border/60 bg-surface px-2 py-0.5 font-mono text-[10px] text-foreground"
                      >
                        {f}
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Formula</div>
                  <pre className="mt-1 overflow-x-auto rounded-md border border-border/60 bg-surface p-2 text-[11px] text-foreground">
{method.formula}
                  </pre>
                  {method.formulaRefs?.length > 0 && (
                    <div className="mt-2 overflow-hidden rounded-md border border-border/60">
                      <table className="w-full text-[11px]">
                        <thead className="bg-surface text-muted-foreground">
                          <tr>
                            <th className="px-2 py-1.5 text-left font-medium">Symbol</th>
                            <th className="px-2 py-1.5 text-left font-medium">Meaning</th>
                            <th className="px-2 py-1.5 text-left font-medium">Source</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/60">
                          {method.formulaRefs.map((r) => (
                            <tr key={r.symbol}>
                              <td className="px-2 py-1.5 font-mono text-foreground">{r.symbol}</td>
                              <td className="px-2 py-1.5 text-muted-foreground">{r.meaning}</td>
                              <td className="px-2 py-1.5 font-mono text-[10px] text-primary">{r.source}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                <div>
                  <div className="flex items-center justify-between">
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Top weighted drivers</div>
                    <div className="text-xs text-primary">Confidence {method.confidence}%</div>
                  </div>
                  <div className="mt-2 space-y-2">
                    {method.drivers.map((d) => (
                      <div key={d.label}>
                        <div className="flex justify-between text-xs">
                          <span>{d.label}</span>
                          <span className="text-muted-foreground">{Math.round(d.weight * 100)}%</span>
                        </div>
                        <div className="mt-1 h-1.5 rounded-full bg-surface">
                          <div
                            className="h-1.5 rounded-full bg-primary"
                            style={{ width: `${d.weight * 100}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="border-t border-border/60 pt-3 text-xs text-muted-foreground">
                  {method.refreshed} · payload generated server-side
                </div>

                <div>
                  <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
                    <Database className="h-3 w-3" /> Datasets used
                  </div>
                  <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {method.datasets.map((d) => (
                      <button
                        key={d.id}
                        type="button"
                        onClick={() => setDatasetId(d.id)}
                        className="group rounded-md border border-border/60 bg-surface/60 p-2 text-left transition hover:border-primary/50 hover:bg-surface"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="font-mono text-[11px] text-primary">{d.id}</div>
                          <ArrowUpRight className="h-3 w-3 text-muted-foreground group-hover:text-primary" />
                        </div>
                        <div className="mt-0.5 text-[11px] text-foreground">{d.description}</div>
                        <div className="mt-1 flex flex-wrap gap-x-2 text-[10px] text-muted-foreground">
                          <span>{d.rows}</span>
                          <span>· {d.coverage}</span>
                          <span>· updated {d.updated}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
                    <BookOpen className="h-3 w-3" /> Source citations
                  </div>
                  <ul className="mt-2 space-y-1.5">
                    {method.sources.map((s) => (
                      <li
                        key={s.ref}
                        className="flex items-start justify-between gap-3 rounded-md border border-border/60 bg-surface/60 px-2.5 py-1.5 text-[11px]"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="rounded-sm bg-primary/10 px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-primary">
                              {s.type}
                            </span>
                            <span className="truncate text-foreground">{s.label}</span>
                          </div>
                          <div className="mt-0.5 font-mono text-[10px] text-muted-foreground">
                            {s.ref} · synced {s.lastSync}
                          </div>
                        </div>
                        {s.url && (
                          <a
                            href={s.url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-[10px] text-primary hover:underline"
                          >
                            Open <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="rounded-md border border-dashed border-border/60 bg-surface/40 p-2 text-[10px] text-muted-foreground">
                  Cite as: <span className="font-mono text-foreground">{method.citation}</span>
                </div>
              </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!datasetId} onOpenChange={(v) => !v && setDatasetId(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <span className="w-fit rounded-full bg-primary/10 px-2 py-0.5 text-[10px] uppercase tracking-wider text-primary">
              Dataset
            </span>
            <DialogTitle className="font-mono text-xl">{datasetId}</DialogTitle>
            <DialogDescription>
              {dataset?.description ?? "Loading dataset metadata…"}
            </DialogDescription>
          </DialogHeader>

          {datasetLoading || !dataset ? (
            <div className="space-y-3">
              <div className="h-16 animate-pulse rounded-lg bg-surface" />
              <div className="h-32 animate-pulse rounded-lg bg-surface" />
              <div className="h-32 animate-pulse rounded-lg bg-surface" />
            </div>
          ) : (
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {[
                  { k: "Rows", v: dataset.rows },
                  { k: "Coverage", v: dataset.coverage },
                  { k: "Refresh", v: dataset.refreshCadence },
                  { k: "Retention", v: dataset.retention },
                ].map((m) => (
                  <div key={m.k} className="rounded-md border border-border/60 bg-surface/60 p-2">
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{m.k}</div>
                    <div className="mt-0.5 text-[12px] text-foreground">{m.v}</div>
                  </div>
                ))}
              </div>

              <div className="rounded-md border border-primary/20 bg-primary/5 p-3">
                <div className="flex items-center justify-between text-[11px]">
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-primary">Sync recency</div>
                    <div className="mt-0.5 text-foreground">
                      Last synced <span className="font-mono">{dataset.lastSyncedAt}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Freshness SLA</div>
                    <div className="mt-0.5 text-foreground">
                      {dataset.freshnessSlaMins === 0
                        ? "live"
                        : dataset.freshnessSlaMins >= 1440
                          ? `${Math.round(dataset.freshnessSlaMins / 1440)}d`
                          : dataset.freshnessSlaMins >= 60
                            ? `${Math.round(dataset.freshnessSlaMins / 60)}h`
                            : `${dataset.freshnessSlaMins}m`}
                    </div>
                  </div>
                </div>
                <div className="mt-2 text-[11px] text-muted-foreground">
                  Owner: <span className="text-foreground">{dataset.owner}</span> · Source: <span className="text-foreground">{dataset.source}</span>
                </div>
              </div>

              <div>
                <div className="mb-1 flex items-center justify-between">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Schema</div>
                  <div className="text-[10px] text-muted-foreground">
                    PK: <span className="font-mono text-primary">{dataset.primaryKey.join(", ")}</span>
                  </div>
                </div>
                <div className="overflow-hidden rounded-md border border-border/60">
                  <table className="w-full text-[11px]">
                    <thead className="bg-surface text-muted-foreground">
                      <tr>
                        <th className="px-2 py-1.5 text-left font-medium">Field</th>
                        <th className="px-2 py-1.5 text-left font-medium">Type</th>
                        <th className="px-2 py-1.5 text-left font-medium">Description</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {dataset.fields.map((f) => (
                        <tr key={f.name}>
                          <td className="px-2 py-1.5 font-mono text-foreground">
                            {f.name}
                            {f.pii && (
                              <span className="ml-1.5 rounded-sm bg-yellow-500/10 px-1 py-0.5 text-[9px] uppercase tracking-wider text-yellow-400">
                                PII
                              </span>
                            )}
                          </td>
                          <td className="px-2 py-1.5 font-mono text-[10px] text-primary">{f.type}</td>
                          <td className="px-2 py-1.5 text-muted-foreground">{f.description}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div>
                <div className="mb-1 text-[10px] uppercase tracking-wider text-muted-foreground">
                  Sample rows ({dataset.sampleRows.length})
                </div>
                <div className="overflow-x-auto rounded-md border border-border/60">
                  <table className="w-full text-[11px]">
                    <thead className="bg-surface text-muted-foreground">
                      <tr>
                        {dataset.fields.map((f) => (
                          <th key={f.name} className="whitespace-nowrap px-2 py-1.5 text-left font-medium">
                            {f.name}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {dataset.sampleRows.map((row, i) => (
                        <tr key={i}>
                          {dataset.fields.map((f) => (
                            <td key={f.name} className="whitespace-nowrap px-2 py-1.5 font-mono text-foreground">
                              {String(row[f.name] ?? "—")}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div>
                <div className="mb-1 text-[10px] uppercase tracking-wider text-muted-foreground">Lineage</div>
                <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                  {dataset.lineage.map((step, i) => (
                    <span key={step} className="flex items-center gap-1.5">
                      <span className="rounded-md border border-border/60 bg-surface px-2 py-0.5 font-mono text-foreground">
                        {step}
                      </span>
                      {i < dataset.lineage.length - 1 && (
                        <span className="text-muted-foreground">→</span>
                      )}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}