import { createFileRoute } from "@tanstack/react-router";
import {
  Lightbulb,
  Flame,
  TrendingUp,
  TrendingDown,
  Megaphone,
  Users,
  Building2,
  PhoneCall,
  IndianRupee,
  Zap,
  CheckCircle2,
  Clock,
} from "lucide-react";

export const Route = createFileRoute("/app/recommendations")({
  head: () => ({ meta: [{ title: "Recommendations — Sentinel Knowledge Engine" }] }),
  component: Recommendations,
});

type Rec = {
  category: "Sales" | "Marketing" | "Inventory" | "Voice" | "Finance";
  icon: typeof Lightbulb;
  title: string;
  rationale: string;
  impact: number; // 0-100
  effort: "Low" | "Medium" | "High";
  estValue: string;
  trend: "up" | "down";
};

const RECS: Rec[] = [
  {
    category: "Sales",
    icon: Flame,
    title: "Fast-track 23 hot leads in Whitefield",
    rationale: "AI score >85, last contact >5d, intent score rising. Avg ticket ₹1.4 Cr.",
    impact: 94,
    effort: "Low",
    estValue: "+₹32 Cr pipeline",
    trend: "up",
  },
  {
    category: "Marketing",
    icon: Megaphone,
    title: "Cut spend on Meta Campaign A by 40%",
    rationale: "CPL ₹4,200 — 2.1× channel avg. Bookings attributed: 3 in 30 days.",
    impact: 88,
    effort: "Low",
    estValue: "Save ₹6.4 L / mo",
    trend: "down",
  },
  {
    category: "Inventory",
    icon: Building2,
    title: "Launch Tower B 3BHK incentive",
    rationale: "Absorption fell 38%. Pricing 7% above comparable inventory in Powai.",
    impact: 81,
    effort: "Medium",
    estValue: "Unlock ₹48 Cr inventory",
    trend: "up",
  },
  {
    category: "Voice",
    icon: PhoneCall,
    title: "Reroute Aria to evening shift",
    rationale: "Qualification rate 14pp higher on 6–9 PM calls vs morning.",
    impact: 72,
    effort: "Low",
    estValue: "+18% qualify rate",
    trend: "up",
  },
  {
    category: "Marketing",
    icon: Megaphone,
    title: "Shift ₹12 L budget to Google PMax",
    rationale: "PMax CPL ₹1,850 with 4.2% booking conversion vs portal CPL ₹3,100.",
    impact: 78,
    effort: "Low",
    estValue: "+22 bookings / quarter",
    trend: "up",
  },
  {
    category: "Finance",
    icon: IndianRupee,
    title: "Pre-empt ₹14 Cr collection risk",
    rationale: "6 customers with overdue milestones, AI delinquency score >70.",
    impact: 86,
    effort: "Medium",
    estValue: "Recover ₹14 Cr",
    trend: "down",
  },
  {
    category: "Sales",
    icon: Users,
    title: "Re-engage 142 dormant leads",
    rationale: "Last activity 30–60d, source quality A, no negative sentiment in calls.",
    impact: 64,
    effort: "Medium",
    estValue: "+₹11 Cr pipeline",
    trend: "up",
  },
];

const CATEGORIES = ["All", "Sales", "Marketing", "Inventory", "Voice", "Finance"] as const;

function Recommendations() {
  return (
    <div className="space-y-8">
      <div>
        <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs text-primary">
          <Zap className="h-3 w-3" /> Recommendation Engine · 7 active
        </div>
        <h1 className="mt-3 font-display text-4xl">
          The next best <span className="text-gradient-emerald italic">action.</span>
        </h1>
        <p className="mt-1 max-w-xl text-sm text-muted-foreground">
          Ranked by predicted business impact. One-click to dispatch via automation engine.
        </p>
      </div>

      {/* Top strip */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <Stat label="Active recommendations" value="7" />
        <Stat label="Projected value (30d)" value="₹1.1 Cr+" accent />
        <Stat label="Avg impact score" value="80" />
        <Stat label="Executed this week" value="14" />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        {CATEGORIES.map((c, i) => (
          <button
            key={c}
            className={`rounded-full border px-3 py-1.5 text-xs ${
              i === 0
                ? "border-primary/40 bg-primary/10 text-primary"
                : "border-border/60 text-muted-foreground hover:text-foreground"
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="space-y-3">
        {RECS.sort((a, b) => b.impact - a.impact).map((r) => {
          const Icon = r.icon;
          return (
            <div
              key={r.title}
              className="grid grid-cols-1 gap-4 rounded-2xl border border-border/60 bg-card p-5 lg:grid-cols-[auto_1fr_auto_auto]"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Icon className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-surface px-2 py-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">
                    {r.category}
                  </span>
                  {r.trend === "up" ? (
                    <TrendingUp className="h-3 w-3 text-primary" />
                  ) : (
                    <TrendingDown className="h-3 w-3 text-destructive" />
                  )}
                </div>
                <h4 className="mt-1 font-display text-xl">{r.title}</h4>
                <p className="text-sm text-muted-foreground">{r.rationale}</p>
              </div>
              <div className="flex flex-col items-end justify-center text-right">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Impact</div>
                <div className="flex items-center gap-2">
                  <div className="h-1.5 w-24 overflow-hidden rounded-full bg-surface">
                    <div
                      className="h-full bg-gradient-to-r from-primary to-emerald-glow"
                      style={{ width: `${r.impact}%` }}
                    />
                  </div>
                  <span className="text-sm">{r.impact}</span>
                </div>
                <div className="mt-2 flex items-center gap-2 text-[11px] text-muted-foreground">
                  <Clock className="h-3 w-3" /> Effort: {r.effort}
                </div>
                <div className="text-sm text-primary">{r.estValue}</div>
              </div>
              <div className="flex items-center gap-2">
                <button className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-medium text-primary-foreground shadow-glow hover:bg-primary/90">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Execute
                </button>
                <button className="rounded-lg border border-border/60 px-3 py-2 text-xs text-muted-foreground hover:text-foreground">
                  Dismiss
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card p-5">
      <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={`mt-2 font-display text-3xl ${accent ? "text-gradient-emerald" : ""}`}>{value}</div>
    </div>
  );
}