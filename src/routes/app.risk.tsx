import { createFileRoute } from "@tanstack/react-router";
import { AlertTriangle, ShieldAlert, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/app/risk")({
  head: () => ({ meta: [{ title: "Risk Center — Sentinel Fort Group" }] }),
  component: RiskCenter,
});

const CATEGORIES = [
  { name: "Collection Risk",    score: 64, impact: "High",   delta: +6, mitigation: "Escalate 6 accounts to relationship managers; enable AI dunning sequence." },
  { name: "Cancellation Risk",  score: 38, impact: "Medium", delta: -4, mitigation: "Trigger retention offers on 11 deals flagged by AI; assign senior closers." },
  { name: "Inventory Risk",     score: 52, impact: "Medium", delta: +2, mitigation: "Re-price Tower B 7%; launch ATL campaign in Powai micro-market." },
  { name: "Developer Risk",     score: 24, impact: "Low",    delta: -1, mitigation: "Quarterly compliance audit complete; monitor RERA filings." },
  { name: "Campaign Risk",      score: 41, impact: "Medium", delta: +3, mitigation: "Pause Meta Campaign A (CPL 2.1× avg); reallocate to Google PMax." },
  { name: "Revenue Risk",       score: 29, impact: "Low",    delta: -2, mitigation: "Pipeline coverage 3.4× target; no action required this fortnight." },
  { name: "Compliance Risk",    score: 18, impact: "Low",    delta: 0,  mitigation: "GST, RERA, FEMA filings up to date. Next audit window: Oct 12." },
  { name: "Documentation Risk", score: 47, impact: "Medium", delta: +5, mitigation: "42 deals with KYC gaps; auto-trigger CP follow-up via workflow #21." },
];

function RiskCenter() {
  return (
    <div className="space-y-8">
      <header>
        <div className="inline-flex items-center gap-2 rounded-full border border-destructive/30 bg-destructive/10 px-3 py-1 text-xs text-destructive">
          <ShieldAlert className="h-3 w-3" /> Sentinel Risk Center™
        </div>
        <h1 className="mt-3 font-display text-4xl">
          Risk, <span className="text-gradient-emerald italic">contained.</span>
        </h1>
        <p className="text-sm text-muted-foreground">AI continuously monitors 8 risk categories across CRM, ERP, marketplace and finance.</p>
      </header>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Tile label="Composite Risk Score" value="39" tone="primary" sub="Down 3 WoW · stable" />
        <Tile label="Active high-impact risks" value="2" tone="destructive" sub="Collections, Inventory" />
        <Tile label="Mitigations in flight" value="14" tone="primary" sub="6 awaiting approval" />
        <Tile label="Risk avoided (30d)" value="₹22 Cr" tone="gold" sub="Cancellations + collections" />
      </div>

      <div className="grid gap-3">
        {CATEGORIES.sort((a, b) => b.score - a.score).map((c) => (
          <div key={c.name} className="grid gap-3 rounded-2xl border border-border/60 bg-card p-5 lg:grid-cols-[260px_1fr_auto]">
            <div>
              <div className="font-display text-lg">{c.name}</div>
              <div className="mt-1 inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                Impact: <span className="text-foreground">{c.impact}</span>
                <span className={`ml-2 ${c.delta > 0 ? "text-destructive" : c.delta < 0 ? "text-primary" : "text-muted-foreground"}`}>
                  {c.delta > 0 ? "+" : ""}{c.delta} WoW
                </span>
              </div>
            </div>
            <div>
              <div className="flex items-center gap-3">
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface">
                  <div
                    className={`h-full ${c.score > 60 ? "bg-destructive" : c.score > 35 ? "bg-gold" : "bg-primary"}`}
                    style={{ width: `${c.score}%` }}
                  />
                </div>
                <span className="w-8 text-right text-sm">{c.score}</span>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">{c.mitigation}</p>
            </div>
            <div className="flex items-center gap-2">
              <button className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground shadow-glow">Run Mitigation</button>
              <button className="rounded-lg border border-border/60 px-3 py-1.5 text-xs text-muted-foreground">Details</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Tile({ label, value, sub, tone }: { label: string; value: string; sub: string; tone: "primary" | "destructive" | "gold" }) {
  const cls = tone === "primary" ? "text-gradient-emerald" : tone === "destructive" ? "text-destructive" : "text-gold";
  const Icon = tone === "destructive" ? AlertTriangle : ShieldCheck;
  return (
    <div className="rounded-2xl border border-border/60 bg-card p-5">
      <div className="flex items-center justify-between text-xs uppercase tracking-wider text-muted-foreground">
        {label} <Icon className="h-3.5 w-3.5" />
      </div>
      <div className={`mt-2 font-display text-3xl ${cls}`}>{value}</div>
      <div className="mt-1 text-xs text-muted-foreground">{sub}</div>
    </div>
  );
}