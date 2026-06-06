import { createFileRoute } from "@tanstack/react-router";
import { CheckCircle2, GitBranch, PlayCircle, Settings2, Workflow } from "lucide-react";

export const Route = createFileRoute("/app/workflows")({
  head: () => ({ meta: [{ title: "Autonomous Workflows — Sentinel Fort Group" }] }),
  component: Workflows,
});

const WORKFLOWS = [
  {
    name: "Whitefield Campaign Boost",
    trigger: "Inventory absorption +20% vs avg",
    steps: ["Allocate ₹2 L budget", "Launch Meta + PMax creatives", "Notify CMO", "Update CRM tag"],
    impact: "+₹18 Cr pipeline (30d)",
    confidence: 92,
    status: "Pending approval",
  },
  {
    name: "Collections Pre-empt",
    trigger: "Delinquency score >70 on active deal",
    steps: ["Dispatch reminder + RM call", "Escalate to head of finance Day 7", "Trigger legal notice Day 21"],
    impact: "Recover ₹14 Cr cash flow",
    confidence: 88,
    status: "Auto-running",
  },
  {
    name: "Hot Lead Fast-Track",
    trigger: "AI score >90 + last contact >5d",
    steps: ["Reassign to top closer", "Schedule AI voice nudge", "Book auto-site-visit slot"],
    impact: "+₹32 Cr pipeline",
    confidence: 94,
    status: "Auto-running",
  },
  {
    name: "Inventory Promo Launch",
    trigger: "Absorption < 60% for 14d",
    steps: ["Re-price 5–8%", "Allocate ₹1.5 Cr ATL", "Brief sales + CP network"],
    impact: "Unlock ₹48 Cr inventory",
    confidence: 86,
    status: "Pending approval",
  },
];

function Workflows() {
  return (
    <div className="space-y-8">
      <header>
        <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs text-primary">
          <Workflow className="h-3 w-3" /> Autonomous Decision Workflows™
        </div>
        <h1 className="mt-3 font-display text-4xl">
          Decide once. <span className="text-gradient-emerald italic">Execute always.</span>
        </h1>
        <p className="text-sm text-muted-foreground">Every AI recommendation can dispatch tasks, campaigns, voice calls and CRM updates automatically.</p>
      </header>

      <div className="grid gap-4 md:grid-cols-4">
        <Kpi label="Active workflows" value="14" />
        <Kpi label="Auto-executions (30d)" value="218" />
        <Kpi label="Avg time saved / decision" value="6.2 hr" />
        <Kpi label="Approval rate" value="91%" />
      </div>

      <div className="space-y-3">
        {WORKFLOWS.map((w) => (
          <div key={w.name} className="rounded-2xl border border-border/60 bg-card p-5">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <GitBranch className="h-4 w-4" />
                </div>
                <div>
                  <div className="font-display text-xl">{w.name}</div>
                  <div className="text-xs text-muted-foreground">Trigger · {w.trigger}</div>
                </div>
              </div>
              <span
                className={`rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wider ${
                  w.status === "Auto-running"
                    ? "border-primary/40 bg-primary/10 text-primary"
                    : "border-gold/40 bg-gold/10 text-gold"
                }`}
              >
                {w.status}
              </span>
            </div>
            <ol className="mt-4 grid gap-2 md:grid-cols-2 lg:grid-cols-4">
              {w.steps.map((s, i) => (
                <li key={s} className="flex items-start gap-2 rounded-lg bg-surface/50 p-3 text-xs">
                  <span className="mt-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary/15 text-[10px] text-primary">
                    {i + 1}
                  </span>
                  <span className="text-muted-foreground">{s}</span>
                </li>
              ))}
            </ol>
            <div className="mt-4 flex items-center justify-between">
              <div className="text-xs">
                <span className="text-primary">{w.impact}</span>
                <span className="ml-3 text-muted-foreground">Confidence {w.confidence}%</span>
              </div>
              <div className="flex items-center gap-2">
                <button className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground shadow-glow">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Approve
                </button>
                <button className="inline-flex items-center gap-1.5 rounded-lg border border-border/60 px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground">
                  <Settings2 className="h-3.5 w-3.5" /> Modify
                </button>
                <button className="inline-flex items-center gap-1.5 rounded-lg border border-border/60 px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground">
                  <PlayCircle className="h-3.5 w-3.5" /> Run now
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card p-5">
      <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-2 font-display text-3xl text-gradient-emerald">{value}</div>
    </div>
  );
}