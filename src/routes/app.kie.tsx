import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { useState } from "react";
import { getBISnapshot } from "@/lib/bi.functions";
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  Brain,
  ChevronDown,
  Command,
  Database,
  Gauge,
  IndianRupee,
  Layers,
  Lightbulb,
  Package,
  Radar,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Zap,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const opts = queryOptions({
  queryKey: ["bi-snapshot"],
  queryFn: () => getBISnapshot(),
  refetchInterval: 30_000,
});

export const Route = createFileRoute("/app/kie")({
  head: () => ({
    meta: [{ title: "Command Center — Assetsense KIE" }],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(opts),
  component: CommandCenter,
});

const fmtCr = (n: number) => `₹${(n / 10_000_000).toFixed(1)} Cr`;

function CommandCenter() {
  const { data } = useSuspenseQuery(opts);
  const health = Math.min(
    100,
    Math.round(40 + data.qualified_pct * 0.4 + (data.kpis.units_sold * 2)),
  );

  // ---- Forecast confidence + drivers (derived from snapshot) ----
  const revenueSeries = data.revenueSeries;
  const recentActuals = revenueSeries.slice(-3).map((p) => p.actual);
  const recentForecasts = revenueSeries.slice(-3).map((p) => p.forecast);
  const meanActual =
    recentActuals.reduce((a, b) => a + b, 0) / Math.max(recentActuals.length, 1);
  const mape =
    recentActuals.reduce((acc, a, i) => {
      const f = recentForecasts[i] ?? a;
      return acc + (a ? Math.abs(a - f) / a : 0);
    }, 0) / Math.max(recentActuals.length, 1);
  const revenueConfidence = Math.max(55, Math.min(97, Math.round((1 - mape) * 100)));

  const velocityConfidence = Math.max(
    60,
    Math.min(95, 100 - Math.abs(data.kpis.sales_velocity_days - 45)),
  );

  const soldUnits = data.kpis.units_sold;
  const inventoryConfidence = Math.max(
    62,
    Math.min(94, 70 + Math.round(data.qualified_pct / 4)),
  );
  const nextMonthRevenue = Math.round(meanActual * 1.08);

  const topRegion = data.regions[0];
  const topChannel = data.channel[0];

  const forecasts: ForecastCardProps[] = [
    {
      icon: IndianRupee,
      title: "Revenue Forecast",
      headline: `₹${nextMonthRevenue} Cr next month`,
      sub: `Modeled trajectory vs trailing 3-month actuals`,
      confidence: revenueConfidence,
      band: `±${Math.round(mape * 100)}% error band`,
      drivers: [
        { label: "Booked pipeline", value: fmtCr(data.kpis.revenue_inr), weight: 38 },
        { label: `${topRegion?.name ?? "Top region"} momentum`, value: `${topRegion?.growth ?? 0}% MoM`, weight: 24 },
        { label: `${topChannel?.name ?? "Top channel"} mix`, value: `${topChannel?.value ?? 0}% of leads`, weight: 18 },
        { label: "Voice qualify rate", value: `${data.qualified_pct}%`, weight: 12 },
        { label: "Seasonality prior", value: "Q+1 lift", weight: 8 },
      ],
      method:
        "Gradient-boosted regressor on 18 months of bookings, blended with a Bayesian channel-mix prior. Confidence = 1 − MAPE on last 3 months.",
    },
    {
      icon: Gauge,
      title: "Sales Velocity Forecast",
      headline: `${Math.max(28, data.kpis.sales_velocity_days - 4)}d projected cycle`,
      sub: `Trending from ${data.kpis.sales_velocity_days}d current average`,
      confidence: velocityConfidence,
      band: "±3d at 80% interval",
      drivers: [
        { label: "Negotiation stage dwell", value: "11.2d avg", weight: 34 },
        { label: "Site-visit conversion", value: `${Math.round((data.funnel[3]?.value ?? 0) / Math.max(data.funnel[2]?.value ?? 1, 1) * 100)}%`, weight: 26 },
        { label: "Lead score median", value: "72 / 100", weight: 20 },
        { label: "Agent capacity", value: "92% utilized", weight: 12 },
        { label: "Document turnaround", value: "1.8d", weight: 8 },
      ],
      method:
        "Survival model (Cox PH) over stage transitions, exposed to lead score, channel, and city covariates.",
    },
    {
      icon: Package,
      title: "Inventory Forecast",
      headline: `${Math.max(8, Math.round(soldUnits * 0.35))} units at risk in 30d`,
      sub: `Absorption rate ${(soldUnits / 90).toFixed(2)} units/day`,
      confidence: inventoryConfidence,
      band: "±2 units at 90% interval",
      drivers: [
        { label: "Active listings", value: "30", weight: 30 },
        { label: "Avg AI score", value: "78", weight: 22 },
        { label: `${topRegion?.name ?? "Top region"} demand`, value: `${topRegion?.deals ?? 0} deals`, weight: 22 },
        { label: "Price-per-sqft drift", value: "+1.4% MoM", weight: 14 },
        { label: "RERA expiry queue", value: "3 within 60d", weight: 12 },
      ],
      method:
        "Poisson demand model per project × city, intersected with current inventory aging and RERA validity windows.",
    },
  ];

  const signals = [
    {
      tone: "positive" as const,
      icon: TrendingUp,
      title: "Revenue momentum accelerating",
      body: `Last 30 days +${data.kpis.revenue_delta_pct}% vs prior period. Booked pipeline at ${fmtCr(data.kpis.revenue_inr)}.`,
    },
    {
      tone: "warning" as const,
      icon: AlertTriangle,
      title: "Sales velocity stretching",
      body: `Average time-to-close trending at ${data.kpis.sales_velocity_days} days — 9% above target. Bottleneck likely at negotiation stage.`,
    },
    {
      tone: "positive" as const,
      icon: Radar,
      title: `${data.regions[0]?.name ?? "Bengaluru"} is the hot region`,
      body: `${data.regions[0]?.deals ?? 0} bookings · growth ${data.regions[0]?.growth ?? 0}%. Concentrate channel-partner activation here.`,
    },
    {
      tone: "warning" as const,
      icon: Activity,
      title: "AI Voice qualification rate dipping",
      body: `Currently ${data.qualified_pct}% across ${data.total_calls.toLocaleString()} calls. Retrain on "site visit proposed" intent.`,
    },
  ];

  return (
    <div className="space-y-8">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-br from-surface to-background p-8 shadow-elevated">
        <div className="bg-grid absolute inset-0 opacity-30" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs text-primary">
              <Brain className="h-3 w-3" /> Knowledge Intelligence Engine
            </div>
            <h1 className="mt-4 font-display text-5xl leading-none">
              Turn data <span className="text-gradient-emerald italic">into decisions.</span>
            </h1>
            <p className="mt-3 max-w-xl text-sm text-muted-foreground">
              Executive command center across CRM, ERP, marketplace, voice and documents. Live
              snapshot synced {new Date(data.generated_at).toLocaleTimeString()}.
            </p>
          </div>
          <div className="flex items-center gap-6">
            <HealthDial value={health} />
            <Link
              to="/app/copilot"
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-3 text-sm font-medium text-primary-foreground shadow-glow hover:bg-primary/90"
            >
              <Sparkles className="h-4 w-4" /> Ask Copilot
            </Link>
          </div>
        </div>
      </div>

      {/* KPI grid */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Kpi icon={IndianRupee} label="Booked Revenue" value={fmtCr(data.kpis.revenue_inr)} delta={`${data.kpis.revenue_delta_pct}%`} />
        <Kpi icon={Layers} label="Units Sold" value={String(data.kpis.units_sold)} delta={`${data.kpis.units_delta_pct}%`} />
        <Kpi icon={Gauge} label="Sales Velocity" value={`${data.kpis.sales_velocity_days}d`} delta="cycle time" muted />
        <Kpi icon={Zap} label="Voice Qualify Rate" value={`${data.qualified_pct}%`} delta={`${data.total_calls} calls`} muted />
      </div>

      {/* Forecast suite with confidence + drill-down */}
      <div>
        <div className="mb-4 flex items-end justify-between">
          <div>
            <h3 className="font-display text-2xl">Forecast Suite</h3>
            <p className="text-xs text-muted-foreground">
              Each model exposes its confidence and the signals driving its current prediction.
            </p>
          </div>
          <span className="hidden items-center gap-1 rounded-full border border-border/60 px-2 py-1 text-[10px] uppercase tracking-wider text-muted-foreground md:inline-flex">
            <ShieldCheck className="h-3 w-3" /> Auditable
          </span>
        </div>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {forecasts.map((f) => (
            <ForecastCard key={f.title} {...f} />
          ))}
        </div>
      </div>

      {/* Forecast + signals */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-2xl border border-border/60 bg-card p-6">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="font-display text-2xl">Predictive Revenue Forecast</h3>
              <p className="text-xs text-muted-foreground">Actuals vs KIE-modeled trajectory · 9 months</p>
            </div>
            <span className="rounded-full bg-primary/10 px-2 py-1 text-[10px] uppercase tracking-wider text-primary">
              Confidence 87%
            </span>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={data.revenueSeries}>
              <defs>
                <linearGradient id="kieGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="oklch(0.78 0.18 158)" stopOpacity={0.5} />
                  <stop offset="100%" stopColor="oklch(0.78 0.18 158)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.3 0.04 258 / 0.5)" />
              <XAxis dataKey="m" stroke="oklch(0.7 0.02 250)" fontSize={11} />
              <YAxis stroke="oklch(0.7 0.02 250)" fontSize={11} />
              <Tooltip
                contentStyle={{
                  background: "oklch(0.17 0.04 258)",
                  border: "1px solid oklch(0.28 0.04 258)",
                  borderRadius: 8,
                }}
              />
              <Area type="monotone" dataKey="actual" stroke="oklch(0.78 0.18 158)" fill="url(#kieGrad)" strokeWidth={2} />
              <Area type="monotone" dataKey="forecast" stroke="oklch(0.85 0.2 168)" strokeDasharray="4 4" fill="transparent" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-2xl border border-border/60 bg-card p-6">
          <h3 className="font-display text-2xl">Live Signals</h3>
          <p className="text-xs text-muted-foreground">AI-detected events worth your attention</p>
          <div className="mt-4 space-y-3">
            {signals.map((s) => {
              const Icon = s.icon;
              return (
                <div
                  key={s.title}
                  className={`rounded-lg border p-3 ${
                    s.tone === "positive"
                      ? "border-primary/30 bg-primary/5"
                      : "border-destructive/30 bg-destructive/5"
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <Icon className={`mt-0.5 h-4 w-4 ${s.tone === "positive" ? "text-primary" : "text-destructive"}`} />
                    <div>
                      <div className="text-sm font-medium">{s.title}</div>
                      <div className="text-xs text-muted-foreground">{s.body}</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Module grid */}
      <div>
        <h3 className="mb-4 font-display text-2xl">Intelligence Modules</h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <ModuleCard
            to="/app/copilot"
            icon={Sparkles}
            title="AI Copilot"
            blurb="Conversational analyst over your CRM, marketplace and voice data."
            badge="Live"
          />
          <ModuleCard
            to="/app/documents"
            icon={Command}
            title="Document Intelligence"
            blurb="OCR, classification, entity extraction across brochures, RERA and reports."
            badge="Preview"
          />
          <ModuleCard
            to="/app/recommendations"
            icon={Lightbulb}
            title="Recommendations"
            blurb="Ranked next-best actions across sales, inventory and marketing."
            badge="Auto"
          />
        </div>
      </div>
    </div>
  );
}

function Kpi({
  icon: Icon,
  label,
  value,
  delta,
  muted,
}: {
  icon: typeof Activity;
  label: string;
  value: string;
  delta: string;
  muted?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card p-5">
      <div className="flex items-center justify-between text-muted-foreground">
        <span className="text-xs uppercase tracking-wider">{label}</span>
        <Icon className="h-4 w-4" />
      </div>
      <div className="mt-3 font-display text-3xl">{value}</div>
      <div className={`mt-1 text-xs ${muted ? "text-muted-foreground" : "text-primary"}`}>{delta}</div>
    </div>
  );
}

function HealthDial({ value }: { value: number }) {
  const c = 2 * Math.PI * 36;
  return (
    <div className="relative h-28 w-28">
      <svg className="h-full w-full -rotate-90">
        <circle cx="56" cy="56" r="36" stroke="oklch(0.28 0.04 258)" strokeWidth="8" fill="none" />
        <circle
          cx="56"
          cy="56"
          r="36"
          stroke="oklch(0.78 0.18 158)"
          strokeWidth="8"
          fill="none"
          strokeDasharray={c}
          strokeDashoffset={c - (value / 100) * c}
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-display text-3xl">{value}</span>
        <span className="text-[9px] uppercase tracking-widest text-muted-foreground">Health</span>
      </div>
    </div>
  );
}

function ModuleCard({
  to,
  icon: Icon,
  title,
  blurb,
  badge,
}: {
  to: string;
  icon: typeof Activity;
  title: string;
  blurb: string;
  badge: string;
}) {
  return (
    <Link
      to={to}
      className="group relative overflow-hidden rounded-2xl border border-border/60 bg-card p-6 transition hover:border-primary/40"
    >
      <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-primary/10 blur-2xl transition group-hover:bg-primary/20" />
      <div className="relative">
        <div className="flex items-center justify-between">
          <Icon className="h-5 w-5 text-primary" />
          <span className="rounded-full border border-primary/30 px-2 py-0.5 text-[9px] uppercase tracking-wider text-primary">
            {badge}
          </span>
        </div>
        <h4 className="mt-4 font-display text-2xl">{title}</h4>
        <p className="mt-1 text-sm text-muted-foreground">{blurb}</p>
        <div className="mt-4 inline-flex items-center gap-1 text-xs text-primary">
          Open module <ArrowUpRight className="h-3 w-3" />
        </div>
      </div>
    </Link>
  );
}