import { createFileRoute } from "@tanstack/react-router";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Brain,
  CheckCircle2,
  Flame,
  Gauge,
  Lightbulb,
  ShieldAlert,
  Sparkles,
  TrendingUp,
} from "lucide-react";

export const Route = createFileRoute("/app/command")({
  head: () => ({ meta: [{ title: "Executive Command Center — Sentinel Fort Group" }] }),
  component: CommandCenter,
});

const HEALTH = {
  score: 82,
  delta: +3,
  pillars: [
    { label: "Revenue", score: 88, delta: +4 },
    { label: "Collections", score: 74, delta: -2 },
    { label: "Lead Conversion", score: 81, delta: +5 },
    { label: "Inventory Health", score: 79, delta: +1 },
    { label: "Marketing ROI", score: 86, delta: +6 },
    { label: "Customer Satisfaction", score: 84, delta: 0 },
  ],
};

type Reco = {
  tone: "opportunity" | "attention" | "risk";
  title: string;
  body: string;
  action: string;
  impact: string;
  confidence: number;
};

const FEED: Reco[] = [
  {
    tone: "opportunity",
    title: "Whitefield inventory selling 22% faster than average",
    body: "Bookings velocity in last 14 days outpaced Q2 avg. Demand for 3BHK > supply.",
    action: "Increase Whitefield campaign budget by ₹2 Lakhs",
    impact: "+₹18 Cr pipeline (30d)",
    confidence: 92,
  },
  {
    tone: "attention",
    title: "Site visit conversion dropped 11%",
    body: "Powai walk-ins down 11% WoW. Sentiment on calls trending neutral-negative.",
    action: "Audit sales process · coach 4 reps flagged by AI",
    impact: "Recover ~14 bookings/quarter",
    confidence: 81,
  },
  {
    tone: "risk",
    title: "Tower B inventory may stay unsold 90+ days",
    body: "Absorption fell 38%; pricing 7% above comparable inventory in micro-market.",
    action: "Launch promotional campaign with ₹1.5 Cr ATL spend",
    impact: "Unlock ₹48 Cr inventory",
    confidence: 86,
  },
  {
    tone: "opportunity",
    title: "145 leads with >90% purchase probability",
    body: "Voice + CRM signals predict next-30-day intent. Avg ticket ₹1.4 Cr.",
    action: "Auto-assign to top-quintile closers · trigger site-visit nudge",
    impact: "+₹202 Cr pipeline",
    confidence: 94,
  },
  {
    tone: "risk",
    title: "₹14 Cr collections at risk in next 45 days",
    body: "6 customers with delinquency score >70. Two with EMI bounces last cycle.",
    action: "Trigger pre-emptive collections workflow + relationship escalation",
    impact: "Save ₹14 Cr cash flow",
    confidence: 88,
  },
];

function CommandCenter() {
  return (
    <div className="space-y-10">
      <header>
        <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs text-primary">
          <Brain className="h-3 w-3" /> Executive Command Center · Live
        </div>
        <h1 className="mt-3 font-display text-4xl">
          Decisions, not <span className="text-gradient-emerald italic">dashboards.</span>
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Sentinel continuously reads your CRM, ERP, marketplace, voice and finance data — and surfaces what to do next.
        </p>
      </header>

      {/* Health score + pillars */}
      <section className="grid gap-6 lg:grid-cols-[420px_1fr]">
        <div className="relative overflow-hidden rounded-3xl border border-primary/30 bg-gradient-to-br from-primary/15 via-card to-card p-8">
          <div className="absolute -right-12 -top-12 h-48 w-48 rounded-full bg-primary/30 blur-3xl" />
          <div className="relative">
            <div className="text-xs uppercase tracking-[0.3em] text-gold">Business Health</div>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="font-display text-7xl text-gradient-emerald">{HEALTH.score}</span>
              <span className="text-sm text-muted-foreground">/100</span>
              <span className="ml-3 inline-flex items-center gap-1 rounded-full bg-primary/15 px-2 py-0.5 text-xs text-primary">
                <TrendingUp className="h-3 w-3" /> +{HEALTH.delta} WoW
              </span>
            </div>
            <p className="mt-4 text-sm text-muted-foreground">
              Sentinel rates your business <span className="text-foreground font-medium">strong</span>. Revenue and marketing
              ROI are leading; collections and inventory health need executive attention.
            </p>
            <div className="mt-6 flex items-center gap-2 text-xs text-muted-foreground">
              <Sparkles className="h-3 w-3 text-gold" />
              Updated 2 min ago · Model v4.2 · Confidence 91%
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
          {HEALTH.pillars.map((p) => (
            <div key={p.label} className="rounded-2xl border border-border/60 bg-card p-5">
              <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">{p.label}</div>
              <div className="mt-2 flex items-end justify-between">
                <span className="font-display text-3xl">{p.score}</span>
                <span
                  className={`text-xs ${
                    p.delta > 0 ? "text-primary" : p.delta < 0 ? "text-destructive" : "text-muted-foreground"
                  }`}
                >
                  {p.delta > 0 ? "+" : ""}
                  {p.delta}
                </span>
              </div>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-surface">
                <div
                  className="h-full bg-gradient-to-r from-primary to-emerald-glow"
                  style={{ width: `${p.score}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Recommendation feed */}
      <section>
        <div className="mb-4 flex items-end justify-between">
          <div>
            <h2 className="font-display text-2xl">Executive Recommendation Feed</h2>
            <p className="text-sm text-muted-foreground">Ranked by impact × confidence. One click to dispatch.</p>
          </div>
          <button className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline">
            View all <ArrowRight className="h-3 w-3" />
          </button>
        </div>
        <div className="grid gap-3">
          {FEED.map((r) => (
            <RecoCard key={r.title} reco={r} />
          ))}
        </div>
      </section>
    </div>
  );
}

function RecoCard({ reco }: { reco: Reco }) {
  const tone = {
    opportunity: { Icon: Flame, label: "Opportunity", chip: "border-primary/30 bg-primary/10 text-primary" },
    attention: { Icon: Lightbulb, label: "Attention Required", chip: "border-gold/40 bg-gold/10 text-gold" },
    risk: { Icon: ShieldAlert, label: "Risk Alert", chip: "border-destructive/30 bg-destructive/10 text-destructive" },
  }[reco.tone];
  const Icon = tone.Icon;
  return (
    <div className="grid gap-4 rounded-2xl border border-border/60 bg-card p-5 lg:grid-cols-[auto_1fr_auto]">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-surface">
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <div className="flex items-center gap-2">
          <span className={`rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wider ${tone.chip}`}>
            {tone.label}
          </span>
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Confidence {reco.confidence}%
          </span>
        </div>
        <h4 className="mt-1 font-display text-xl">{reco.title}</h4>
        <p className="text-sm text-muted-foreground">{reco.body}</p>
        <div className="mt-2 flex items-center gap-2 text-xs">
          <Activity className="h-3 w-3 text-primary" />
          <span className="text-muted-foreground">Recommendation:</span>
          <span className="text-foreground">{reco.action}</span>
        </div>
      </div>
      <div className="flex flex-col items-end justify-between gap-2">
        <div className="text-right">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Impact</div>
          <div className="text-sm text-primary">{reco.impact}</div>
        </div>
        <div className="flex gap-2">
          <button className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground shadow-glow hover:bg-primary/90">
            <CheckCircle2 className="h-3.5 w-3.5" /> Approve
          </button>
          <button className="rounded-lg border border-border/60 px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground">
            Modify
          </button>
          <button className="rounded-lg border border-border/60 px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground">
            Reject
          </button>
        </div>
      </div>
    </div>
  );
}