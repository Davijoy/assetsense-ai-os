import { createFileRoute, redirect } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import { getBISnapshot } from "@/lib/bi.functions";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Package,
  AlertTriangle,
  TrendingUp,
  Building2,
  Sparkles,
  Layers,
  Gauge,
  ShieldCheck,
  RefreshCw,
  CheckCircle2,
} from "lucide-react";

import { isRouteAuthorized } from "@/lib/route-roles";

export const Route = createFileRoute("/app/inventory")({
  head: () => ({ meta: [{ title: "Inventory Intelligence — Sentinel KIE" }] }),
  ssr: false,
  beforeLoad: async ({ context, location }) => {
    let session: any = null;
    try {
      const { data } = await supabase.auth.getSession();
      session = data?.session;
    } catch {}
    if (!session?.access_token && typeof window !== "undefined") {
      try {
        const { getStoredSupabaseSession } = await import("@/integrations/supabase/auth-storage");
        session = getStoredSupabaseSession();
      } catch {}
    }
    if (!session?.access_token) {
      throw redirect({ to: "/auth" });
    }
    const roles = (context as any)?.user?.roles ?? (context as any)?.fort?.role?.appRoles ?? [];
    if (roles.length > 0 && !isRouteAuthorized(roles, location.pathname)) {
      throw redirect({ to: "/fort" });
    }
    return { accessToken: session.access_token };
  },
  component: Inventory,
});

type LiveTower = {
  project: string;
  tower: string;
  total: number;
  sold: number;
  velocity: number;
  health: number;
  risk: "low" | "medium" | "high";
};

function buildLiveTowers(snapshot?: {
  kpis?: { units_sold?: number; sales_velocity_days?: number; revenue_delta_pct?: number };
  regions?: Array<{ name: string; deals: number; rev: number; growth: number }>;
  intelligence?: {
    groupings?: {
      byCity?: Array<{ name: string; total: number; available: number; sold: number; reserved: number; blocked: number; value: number }>;
      byProject?: Array<{ name: string; total: number; available: number; sold: number; reserved: number; blocked: number; value: number }>;
    };
    inventorySummary?: {
      total?: number;
      available?: number;
      sold?: number;
      reserved?: number;
      blocked?: number;
      availabilityPct?: number;
      absorptionPct?: number;
      totalValue?: number;
      availableValue?: number;
      soldValue?: number;
    };
  };
}): LiveTower[] {
  const regions = snapshot?.regions ?? [];

  if (regions.length > 0) {
    return regions.slice(0, 6).map((region, index) => {
      const total = Math.max(1, Math.round(region.deals || 10));
      const sold = Math.max(1, Math.min(total, Math.round(total * 0.7)));
      const health = Math.max(0, Math.min(100, Math.round((region.growth || 0) * 0.9)));
      const risk = health < 60 ? "high" : health < 80 ? "medium" : "low";

      return {
        project: region.name,
        tower: `Zone ${index + 1}`,
        total,
        sold,
        velocity: Math.max(0.1, Number((region.growth || 0) / 20)),
        health,
        risk,
      };
    });
  }

  const unitsSold = snapshot?.kpis?.units_sold ?? 0;
  const total = Math.max(1, unitsSold || 1);
  const health = Math.max(0, Math.min(100, 60 + (snapshot?.kpis?.revenue_delta_pct ?? 0)));
  const risk = health < 60 ? "high" : health < 80 ? "medium" : "low";

  return [
    {
      project: "Live BI",
      tower: "Inventory Pulse",
      total,
      sold: Math.max(1, Math.min(total, unitsSold || 1)),
      velocity: snapshot?.kpis?.sales_velocity_days ?? 0,
      health,
      risk,
    },
  ];
}

function Inventory() {
  const fetchSnapshot = useServerFn(getBISnapshot);
  const { accessToken } = Route.useRouteContext();
  const { data, isError, error, refetch } = useQuery({
    queryKey: ["bi-snapshot"],
    queryFn: () => fetchSnapshot(),
    refetchInterval: 30_000,
    enabled: !!accessToken,
  });

  const summary = data?.intelligence?.inventorySummary;
  const totalUnits = summary?.total ?? data?.kpis?.units_sold ?? 0;
  const soldUnits = summary?.sold ?? data?.kpis?.units_sold ?? 0;
  const availableUnits = summary?.available ?? 0;
  const absorption = summary?.absorptionPct ?? data?.kpis?.revenue_delta_pct ?? 0;
  const avgVelocity = data?.kpis?.sales_velocity_days ?? 0;
  const liveTowers = buildLiveTowers(data);
  const atRisk = liveTowers.filter((t) => t.risk === "high").length;
  const recommendations = data?.recommendations ?? [];
  const deliveryStatus = data?.deliveryStatus ?? "pending";

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

      {isError && (
        <Alert variant="destructive" className="rounded-2xl border-destructive/40">
          <AlertTriangle className="h-4 w-4 text-destructive" />
          <AlertTitle>Data sync failed</AlertTitle>
          <AlertDescription className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <span className="text-muted-foreground">
              {error instanceof Error ? error.message : "Could not refresh the live snapshot. Displaying cached data."}
            </span>
            <Button variant="outline" size="sm" onClick={() => refetch()} className="shrink-0 gap-2">
              <RefreshCw className="h-3.5 w-3.5" />
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Kpi icon={Layers} label="Total Units" value={totalUnits.toString()} delta={`${availableUnits} available`} muted />
        <Kpi icon={Building2} label="Sold" value={soldUnits.toString()} delta={`${absorption}% absorption`} />
        <Kpi icon={Gauge} label="Velocity (avg)" value={`${avgVelocity}d`} delta="Live signal" />
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
          {liveTowers.map((t) => (
            <TowerCard key={t.tower + t.project} {...t} />
          ))}
        </div>
      </div>

      <div>
        <h3 className="mb-4 flex items-center gap-2 font-display text-2xl">
          <Sparkles className="h-5 w-5 text-primary" /> AI Inventory Recommendations
        </h3>
        {recommendations.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {recommendations.map((r) => (
              <div key={r.id} className="rounded-2xl border border-border/60 bg-card p-5">
                <div className="flex items-center justify-between text-[10px] uppercase tracking-wider">
                  <span className={r.priority === "CRITICAL" ? "text-destructive" : r.priority === "HIGH" ? "text-amber-400" : "text-primary"}>{r.priority} · Impact {Math.round(r.confidence * 100)}</span>
                  <ShieldCheck className="h-3 w-3 text-primary" />
                </div>
                <div className="mt-2 text-xs text-muted-foreground">{r.affectedSegment}</div>
                <h4 className="mt-2 font-display text-lg leading-snug">{r.title}</h4>
                <p className="mt-2 text-xs text-muted-foreground">{r.businessReason}</p>
                <div className="mt-3 rounded-lg bg-surface p-2 text-xs text-primary">
                  <span className="font-semibold">Action: </span>{r.recommendedAction}
                </div>
                <div className="mt-2 text-[10px] text-muted-foreground">
                  <span className="font-semibold">Expected: </span>{r.expectedImpact}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-border/60 bg-card p-5 text-center">
            <CheckCircle2 className="mx-auto h-8 w-8 text-primary" />
            <p className="mt-2 text-sm text-muted-foreground">
              {totalUnits === 0
                ? "No inventory data available for this workspace yet."
                : "Inventory is healthy — no qualifying risk recommendations at this time."}
            </p>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between text-[10px] uppercase tracking-wider text-muted-foreground">
        <span>
          Live snapshot · sync {data ? new Date(data.generated_at).toLocaleTimeString() : "…"}
        </span>
        {deliveryStatus !== "pending" && (
          <span className={deliveryStatus === "DELIVERED" ? "text-primary" : "text-amber-400"}>
            In-app delivery: {deliveryStatus}
          </span>
        )}
      </div>
    </div>
  );
}

function TowerCard(t: LiveTower) {
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
