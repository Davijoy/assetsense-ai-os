import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { getBISnapshot } from "@/lib/bi.functions";
import {
  Package,
  AlertTriangle,
  TrendingUp,
  Building2,
  Sparkles,
  Layers,
  Gauge,
  ShieldCheck,
} from "lucide-react";

const opts = queryOptions({
  queryKey: ["bi-snapshot"],
  queryFn: () => getBISnapshot(),
  refetchInterval: 30_000,
});

export const Route = createFileRoute("/app/inventory")({
  head: () => ({ meta: [{ title: "Inventory Intelligence — Sentinel KIE" }] }),
  loader: ({ context }) => context.queryClient.ensureQueryData(opts),
  component: Inventory,
});

const TOWERS = [
  { project: "Lodha Park", tower: "Tower A", total: 84, sold: 71, velocity: 4.2, health: 92, risk: "low" },
  { project: "Lodha Park", tower: "Tower B", total: 96, sold: 38, velocity: 1.4, health: 48, risk: "high" },
  { project: "Prestige Falcon", tower: "Phase 1", total: 120, sold: 96, velocity: 5.1, health: 88, risk: "low" },
  { project: "Hiranandani Powai", tower: "Block C", total: 64, sold: 41, velocity: 2.8, health: 71, risk: "medium" },
  { project: "Brigade Cornerstone", tower: "Tower D", total: 78, sold: 22, velocity: 1.1, health: 38, risk: "high" },
  { project: "Sobha Dream Acres", tower: "Cluster 7", total: 142, sold: 118, velocity: 6.4, health: 94, risk: "low" },
];

const RECS = [
  {
    impact: 96,
    tower: "Lodha Park · Tower B",
    title: "Launch 60-day incentive on 3BHK inventory",
    detail: "Absorption stalled at 1.4 units/wk vs 4.2 in Tower A. Pricing 7% above comps. Forecast: clear 18 units in 8 weeks.",
  },
  {
    impact: 89,
    tower: "Brigade Cornerstone · Tower D",
    title: "Reprice or reposition — health score 38",
    detail: "Only 22/78 sold over 11 months. Channel partner activation + ₹150/sqft reduction could unlock 24 bookings.",
  },
  {
    impact: 74,
    tower: "Sobha Dream Acres · Cluster 7",
    title: "Hold pricing, increase NRI channel mix",
    detail: "Velocity 6.4 units/wk. Last 24 units likely to clear at +3% premium. No discounting needed.",
  },
];

function Inventory() {
  const { data } = useSuspenseQuery(opts);
  const totalUnits = TOWERS.reduce((s, t) => s + t.total, 0);
  const soldUnits = TOWERS.reduce((s, t) => s + t.sold, 0);
  const absorption = Math.round((soldUnits / totalUnits) * 100);
  const atRisk = TOWERS.filter((t) => t.risk === "high").length;

  return (
    <div className="space-y-8">
      <header>
        <div className="inline-flex items-center gap-2 rounded-full border border-gold/40 bg-gold/5 px-3 py-1 text-xs text-gold">
          <Package className="h-3 w-3" /> Inventory Intelligence · Tower-level
        </div>
        <h1 className="mt-3 font-display text-4xl">
          Inventory that <span className="text-gradient-emerald italic">self-clears.</span>
        </h1>
        <p className="text-sm text-muted-foreground">
          Health scores, absorption velocity, and AI-triggered incentive workflows across every tower.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Kpi icon={Layers} label="Total Units" value={totalUnits.toString()} delta={`${TOWERS.length} towers`} muted />
        <Kpi icon={Building2} label="Sold" value={soldUnits.toString()} delta={`${absorption}% absorption`} />
        <Kpi icon={Gauge} label="Velocity (avg)" value={`${(TOWERS.reduce((s, t) => s + t.velocity, 0) / TOWERS.length).toFixed(1)}/wk`} delta="+0.6 MoM" />
        <Kpi
          icon={AlertTriangle}
          label="At-Risk Towers"
          value={atRisk.toString()}
          delta="Action required"
          danger
        />
      </div>

      <div>
        <h3 className="mb-4 font-display text-2xl">Tower Health Matrix</h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {TOWERS.map((t) => (
            <TowerCard key={t.tower + t.project} {...t} />
          ))}
        </div>
      </div>

      <div>
        <h3 className="mb-4 flex items-center gap-2 font-display text-2xl">
          <Sparkles className="h-5 w-5 text-primary" /> AI Inventory Recommendations
        </h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {RECS.map((r) => (
            <div key={r.title} className="rounded-2xl border border-border/60 bg-card p-5">
              <div className="flex items-center justify-between text-[10px] uppercase tracking-wider">
                <span className="text-primary">Impact {r.impact}</span>
                <ShieldCheck className="h-3 w-3 text-primary" />
              </div>
              <div className="mt-2 text-xs text-muted-foreground">{r.tower}</div>
              <h4 className="mt-2 font-display text-lg leading-snug">{r.title}</h4>
              <p className="mt-2 text-xs text-muted-foreground">{r.detail}</p>
            </div>
          ))}
        </div>
      </div>

      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
        Live snapshot · sync {new Date(data.generated_at).toLocaleTimeString()}
      </p>
    </div>
  );
}

function TowerCard(t: (typeof TOWERS)[number]) {
  const ringColor =
    t.health >= 80 ? "stroke-primary" : t.health >= 60 ? "stroke-amber-400" : "stroke-destructive";
  const c = 2 * Math.PI * 28;
  return (
    <div className="rounded-2xl border border-border/60 bg-card p-5">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
            {t.project}
          </div>
          <h4 className="font-display text-xl">{t.tower}</h4>
        </div>
        <div className="relative h-20 w-20">
          <svg className="h-full w-full -rotate-90">
            <circle cx="40" cy="40" r="28" stroke="oklch(0.28 0.04 258)" strokeWidth="6" fill="none" />
            <circle
              cx="40"
              cy="40"
              r="28"
              className={ringColor}
              strokeWidth="6"
              fill="none"
              strokeDasharray={c}
              strokeDashoffset={c - (t.health / 100) * c}
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center font-display text-lg">
            {t.health}
          </div>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
        <Stat label="Sold" value={`${t.sold}/${t.total}`} />
        <Stat label="Velocity" value={`${t.velocity}/wk`} />
        <Stat label="Risk" value={t.risk} tone={t.risk === "high" ? "danger" : t.risk === "medium" ? "warn" : "ok"} />
      </div>
      <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-surface">
        <div
          className="h-full bg-primary"
          style={{ width: `${Math.round((t.sold / t.total) * 100)}%` }}
        />
      </div>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "ok" | "warn" | "danger" }) {
  const c =
    tone === "danger"
      ? "text-destructive"
      : tone === "warn"
        ? "text-amber-400"
        : tone === "ok"
          ? "text-primary"
          : "text-foreground";
  return (
    <div>
      <div className="text-[9px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={`text-sm ${c}`}>{value}</div>
    </div>
  );
}

function Kpi({
  icon: Icon,
  label,
  value,
  delta,
  muted,
  danger,
}: {
  icon: typeof Package;
  label: string;
  value: string;
  delta: string;
  muted?: boolean;
  danger?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card p-5">
      <div className="flex items-center justify-between text-muted-foreground">
        <span className="text-xs uppercase tracking-wider">{label}</span>
        <Icon className="h-4 w-4" />
      </div>
      <div className="mt-3 font-display text-3xl">{value}</div>
      <div
        className={`mt-1 flex items-center gap-1 text-xs ${
          danger ? "text-destructive" : muted ? "text-muted-foreground" : "text-primary"
        }`}
      >
        {!muted && !danger && <TrendingUp className="h-3 w-3" />}
        {delta}
      </div>
    </div>
  );
}