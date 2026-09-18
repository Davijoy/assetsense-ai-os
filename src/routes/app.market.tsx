/**
 * Market Intelligence Route
 *
 * Provides market intelligence dashboard with:
 * - Market listings overview
 * - Price trends by city/locality/property type
 * - RERA compliance tracking
 * - Ingestion run monitoring
 * - Intelligence drill-down component
 */

import { createFileRoute, redirect } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getMarketBISnapshot } from "@/lib/market-ingestion.functions";
import type { MarketIntelligence } from "@/business-intelligence/market/types";
import type { MarketRecommendation } from "@/lib/market-ingestion.functions";
import { IntelligenceDrillDown, type IntelligenceData, type KPI, type Grouping, type TimeSeriesPoint, type Recommendation, type Risk, type Evidence } from "@/components/foundation/IntelligenceDrillDown";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Loader2, TrendingUp, TrendingDown, AlertTriangle, CheckCircle, RefreshCw, Download, BarChart2, Building2, Home, LandPlot, Building, XCircle, CheckCircle2, ShieldCheck, Sparkles } from "lucide-react";
import { format } from "date-fns";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  INITIAL_DB_LISTINGS,
  INITIAL_DB_TRENDS,
  INITIAL_DB_COMPLIANCE,
  INITIAL_DB_INGESTION_RUNS,
} from "@/business-intelligence/market/initial-market-data";

// ─── Types ─────────────────────────────────────────────────────────

interface MarketListing {
  id: string;
  workspace_id: string;
  source: "magicbricks" | "99acres" | "housing";
  city: string;
  locality: string | null;
  title: string | null;
  property_type: "apartment" | "villa" | "plot" | "commercial";
  listing_type: "sale" | "rent";
  price: number | null;
  price_unit: string;
  price_per_sqft: number | null;
  area_sqft: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  floor: string | null;
  total_floors: number | null;
  age_years: number | null;
  furnishing: "furnished" | "semi-furnished" | "unfurnished" | null;
  builder: string | null;
  project: string | null;
  rera_id: string | null;
  url: string | null;
  scraped_at: string;
  provider_record_id: string | null;
  idempotency_key: string;
  correlation_id: string | null;
  causation_id: string | null;
  occurred_at: string;
  recorded_at: string;
  created_at: string;
  updated_at: string;
}

interface MarketTrend {
  id: string;
  workspace_id: string;
  city: string;
  locality: string;
  property_type: "apartment" | "villa" | "plot" | "commercial";
  avg_price_per_sqft: number;
  median_price: number | null;
  total_listings: number;
  price_change_pct: number | null;
  demand_index: number | null;
  source: "magicbricks" | "99acres" | "computed";
  period: string;
  recorded_at: string;
  provider_record_id: string | null;
  idempotency_key: string;
  correlation_id: string | null;
  causation_id: string | null;
  occurred_at: string;
  created_at: string;
  updated_at: string;
}

interface MarketCompliance {
  id: string;
  workspace_id: string;
  source: string;
  record_type: "project_registration" | "notice" | "amendment" | "violation";
  project_name: string;
  promoter: string | null;
  rera_number: string;
  city: string;
  state: string;
  status: "registered" | "revoked" | "lapsed" | "under_review";
  registration_date: string | null;
  expiry_date: string | null;
  url: string | null;
  notes: string | null;
  scraped_at: string;
  provider_record_id: string | null;
  idempotency_key: string;
  correlation_id: string | null;
  causation_id: string | null;
  occurred_at: string;
  recorded_at: string;
  created_at: string;
  updated_at: string;
}

interface IngestionRun {
  id: string;
  workspace_id: string;
  correlation_id: string;
  causation_id: string | null;
  source: string;
  status: "pending" | "processing" | "completed" | "failed" | "partial";
  listings_ingested: number;
  listings_duplicates: number;
  trends_ingested: number;
  trends_duplicates: number;
  compliance_ingested: number;
  compliance_duplicates: number;
  errors: string[] | null;
  started_at: string;
  completed_at: string | null;
  created_at: string;
}

// ─── Route ─────────────────────────────────────────────────────────

export const Route = createFileRoute("/app/market")({
  head: () => ({ meta: [{ title: "Market Intelligence — Sentinel KIE" }] }),
  ssr: false,
  beforeLoad: async () => {
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
    return { accessToken: session.access_token };
  },
  component: MarketIntelligence,
});

// ─── Query Keys ────────────────────────────────────────────────────

const marketKeys = {
  all: ["market"] as const,
  listings: (workspaceId: string, filters?: Record<string, unknown>) => [...marketKeys.all, "listings", workspaceId, filters] as const,
  trends: (workspaceId: string, filters?: Record<string, unknown>) => [...marketKeys.all, "trends", workspaceId, filters] as const,
  compliance: (workspaceId: string, filters?: Record<string, unknown>) => [...marketKeys.all, "compliance", workspaceId, filters] as const,
  ingestionRuns: (workspaceId: string) => [...marketKeys.all, "ingestion-runs", workspaceId] as const,
  intelligence: (workspaceId: string) => [...marketKeys.all, "intelligence", workspaceId] as const,
};

// ─── Adapter: MarketBISnapshot → IntelligenceData ──────────────────

function adaptToIntelligenceData(snapshot: { intelligence: MarketIntelligence; recommendations?: MarketRecommendation[]; workspaceId: string; correlationId: string }): IntelligenceData {
  const { intelligence, recommendations = [], workspaceId, correlationId } = snapshot;
  
  // Map summary to KPIs
  const kpis: KPI[] = [
    {
      id: "total-listings",
      label: "Total Listings",
      value: (intelligence.summary?.totalListings as string | number | undefined) ?? 0,
      format: "number",
      description: "",
    },
    {
      id: "total-trends",
      label: "Market Trends",
      value: (intelligence.summary?.totalTrends as string | number | undefined) ?? 0,
      format: "number",
      description: "",
    },
    {
      id: "total-compliance",
      label: "Compliance Records",
      value: (intelligence.summary?.totalCompliance as string | number | undefined) ?? 0,
      format: "number",
      description: "",
    },
    {
      id: "avg-price-sqft",
      label: "Avg Price/sqft",
      value: (intelligence.summary?.avgPricePerSqft as string | number | undefined) ?? 0,
      format: "currency",
      description: "",
    },
  ];

  // Map groupings
  const groupings: Grouping[] = [
    ...(intelligence.groupings?.byCity ?? []).map((g: { name: string; count: number; avgPricePerSqft: number; totalValue: number }, i: number) => ({
      id: `city-${i}`,
      name: g.name,
      category: "city",
      value: g.count,
      metadata: { avgPricePerSqft: g.avgPricePerSqft, totalValue: g.totalValue },
    })),
    ...(intelligence.groupings?.byPropertyType ?? []).map((g: { name: string; count: number; avgPricePerSqft: number; totalValue: number }, i: number) => ({
      id: `property-type-${i}`,
      name: g.name,
      category: "propertyType",
      value: g.count,
      metadata: { avgPricePerSqft: g.avgPricePerSqft, totalValue: g.totalValue },
    })),
    ...(intelligence.groupings?.byListingType ?? []).map((g: { name: string; count: number; avgPricePerSqft: number; totalValue: number }, i: number) => ({
      id: `listing-type-${i}`,
      name: g.name,
      category: "listingType",
      value: g.count,
      metadata: { avgPricePerSqft: g.avgPricePerSqft, totalValue: g.totalValue },
    })),
    ...(intelligence.groupings?.bySource ?? []).map((g: { name: string; count: number; avgPricePerSqft: number; totalValue: number }, i: number) => ({
      id: `source-${i}`,
      name: g.name,
      category: "source",
      value: g.count,
      metadata: { avgPricePerSqft: g.avgPricePerSqft, totalValue: g.totalValue },
    })),
  ];

  // Map recommendations
  const mappedRecommendations: Recommendation[] = recommendations.map((r) => ({
    id: r.id,
    title: r.title,
    description: r.businessReason,
    businessReason: r.businessReason,
    affectedSegment: r.affectedSegment,
    recommendedAction: r.recommendedAction,
    expectedImpact: r.expectedImpact,
    priority: r.priority,
    confidence: r.confidence,
    supportingMetrics: r.supportingMetrics,
    decisionReference: r.decisionReference ?? r.correlationId,
    correlationId: r.correlationId,
    generatedAt: r.generatedAt,
    status: "pending" as const,
  }));

  return {
    module: "market",
    snapshotId: correlationId,
    generatedAt: intelligence.generatedAt ?? new Date().toISOString(),
    workspaceId,
    correlationId,
    kpis,
    groupings,
    timeSeries: [],
    recommendations: mappedRecommendations,
    risks: [],
    evidence: [],
    metadata: {},
  };
}

// ─── API Functions ─────────────────────────────────────────────────

async function fetchMarketListings(workspaceId: string, filters?: { city?: string; propertyType?: string; source?: string }): Promise<MarketListing[]> {
  try {
    let query = supabase
      .from("market_listings")
      .select("*")
      .eq("workspace_id", workspaceId)
      .order("scraped_at", { ascending: false })
      .limit(100);

    if (filters?.city) query = query.eq("city", filters.city);
    if (filters?.propertyType) query = query.eq("property_type", filters.propertyType as "apartment" | "villa" | "plot" | "commercial");
    if (filters?.source) query = query.eq("source", filters.source as "magicbricks" | "99acres" | "housing");

    const { data, error } = await query;
    if (error || !data || data.length === 0) {
      let fallback = INITIAL_DB_LISTINGS;
      if (filters?.city) fallback = fallback.filter(l => l.city.toLowerCase() === filters.city!.toLowerCase());
      if (filters?.propertyType) fallback = fallback.filter(l => l.property_type === filters.propertyType);
      if (filters?.source) fallback = fallback.filter(l => l.source === filters.source);
      return fallback;
    }
    return data;
  } catch {
    let fallback = INITIAL_DB_LISTINGS;
    if (filters?.city) fallback = fallback.filter(l => l.city.toLowerCase() === filters.city!.toLowerCase());
    if (filters?.propertyType) fallback = fallback.filter(l => l.property_type === filters.propertyType);
    if (filters?.source) fallback = fallback.filter(l => l.source === filters.source);
    return fallback;
  }
}

async function fetchMarketTrends(workspaceId: string, filters?: { city?: string; propertyType?: string; period?: string }): Promise<MarketTrend[]> {
  try {
    let query = supabase
      .from("market_trends")
      .select("*")
      .eq("workspace_id", workspaceId)
      .order("recorded_at", { ascending: false })
      .limit(100);

    if (filters?.city) query = query.eq("city", filters.city);
    if (filters?.propertyType) query = query.eq("property_type", filters.propertyType as "apartment" | "villa" | "plot" | "commercial");
    if (filters?.period) query = query.eq("period", filters.period);

    const { data, error } = await query;
    if (error || !data || data.length === 0) {
      let fallback = INITIAL_DB_TRENDS;
      if (filters?.city) fallback = fallback.filter(t => t.city.toLowerCase() === filters.city!.toLowerCase());
      if (filters?.propertyType) fallback = fallback.filter(t => t.property_type === filters.propertyType);
      if (filters?.period) fallback = fallback.filter(t => t.period === filters.period);
      return fallback;
    }
    return data;
  } catch {
    let fallback = INITIAL_DB_TRENDS;
    if (filters?.city) fallback = fallback.filter(t => t.city.toLowerCase() === filters.city!.toLowerCase());
    if (filters?.propertyType) fallback = fallback.filter(t => t.property_type === filters.propertyType);
    if (filters?.period) fallback = fallback.filter(t => t.period === filters.period);
    return fallback;
  }
}

async function fetchMarketCompliance(workspaceId: string, filters?: { city?: string; status?: string }): Promise<MarketCompliance[]> {
  try {
    let query = supabase
      .from("market_compliance")
      .select("*")
      .eq("workspace_id", workspaceId)
      .order("scraped_at", { ascending: false })
      .limit(100);

    if (filters?.city) query = query.eq("city", filters.city);
    if (filters?.status) query = query.eq("status", filters.status as "registered" | "revoked" | "lapsed" | "under_review");

    const { data, error } = await query;
    if (error || !data || data.length === 0) {
      let fallback = INITIAL_DB_COMPLIANCE;
      if (filters?.city) fallback = fallback.filter(c => c.city.toLowerCase() === filters.city!.toLowerCase());
      if (filters?.status) fallback = fallback.filter(c => c.status === filters.status);
      return fallback;
    }
    return data;
  } catch {
    let fallback = INITIAL_DB_COMPLIANCE;
    if (filters?.city) fallback = fallback.filter(c => c.city.toLowerCase() === filters.city!.toLowerCase());
    if (filters?.status) fallback = fallback.filter(c => c.status === filters.status);
    return fallback;
  }
}

async function fetchIngestionRuns(workspaceId: string): Promise<IngestionRun[]> {
  try {
    const { data, error } = await supabase
      .from("market_ingestion_runs")
      .select("*")
      .eq("workspace_id", workspaceId)
      .order("started_at", { ascending: false })
      .limit(20);

    if (error || !data || data.length === 0) {
      return INITIAL_DB_INGESTION_RUNS;
    }
    return (data ?? []).map((run: any) => ({
      ...run,
      errors: Array.isArray(run.errors) ? run.errors.map((e: any) => String(e)) : run.errors ? [String(run.errors)] : null,
    }));
  } catch {
    return INITIAL_DB_INGESTION_RUNS;
  }
}

// ─── Main Component ────────────────────────────────────────────────

function MarketIntelligence() {
  const fetchSnapshot = useServerFn(getMarketBISnapshot);
  const { accessToken } = Route.useRouteContext();
  const { data, isError, error, refetch } = useQuery({
    queryKey: ["market-bi-snapshot"],
    queryFn: () => fetchSnapshot(),
    refetchInterval: 30_000,
    enabled: !!accessToken,
  });

  // Gate on the shape actually required, not mere truthiness: a denied server
  // function (403 — caller lacks the required DB roles) resolves to an error
  // payload with no `intelligence`, which threw inside the adapter and let the
  // CatchBoundary replace the whole page. Authorization is unchanged — a denial
  // is still a denial; it just no longer presents as a broken route.
  const intelligenceData = data?.intelligence ? adaptToIntelligenceData(data) : undefined;
  const recommendations = data?.recommendations ?? [];
  const deliveryStatus = data?.deliveryStatus ?? "pending";

  return (
    <div className="space-y-8">
      <header>
        <div className="inline-flex items-center gap-2 rounded-full border border-gold/40 bg-gold/5 px-3 py-1 text-xs text-gold">
          <BarChart2 className="h-3 w-3" /> Market Intelligence · Live
        </div>
        <h1 className="mt-3 font-display text-4xl">
          Market that <span className="text-gradient-emerald italic">self-analyzes.</span>
        </h1>
        <p className="text-sm text-muted-foreground">
          Listings, price trends, RERA compliance, and AI-triggered insights across every city.
        </p>
      </header>

      {isError && (
        <div className="rounded-2xl border border-destructive/40 bg-destructive/5 p-4">
          <div className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-4 w-4" />
            <strong>Data sync failed</strong>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            {error instanceof Error ? error.message : "Could not refresh the live snapshot. Displaying cached data."}
          </p>
          <Button variant="outline" size="sm" onClick={() => refetch()} className="mt-3 gap-2">
            <RefreshCw className="h-3.5 w-3.5" />
            Retry
          </Button>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Kpi icon={Building2} label="Total Listings" value={(data?.intelligence?.summary?.totalListings ?? 0).toString()} delta="" muted />
        <Kpi icon={TrendingUp} label="Market Trends" value={(data?.intelligence?.summary?.totalTrends ?? 0).toString()} delta="" />
        <Kpi icon={ShieldCheck} label="Compliance Records" value={(data?.intelligence?.summary?.totalCompliance ?? 0).toString()} delta="" />
        <Kpi
          icon={AlertTriangle}
          label="Avg Price/sqft"
          value={data?.intelligence?.summary?.avgPricePerSqft ? `₹${Math.round(Number(data.intelligence.summary.avgPricePerSqft)).toLocaleString()}` : "—"}
          delta=""
        />
      </div>

      {/* Intelligence Drill-Down */}
      {intelligenceData && (
        <IntelligenceDrillDown
          data={intelligenceData}
          config={{
            title: "Market Intelligence",
            subtitle: "Live market listings, trends, and compliance monitoring",
            icon: <BarChart2 className="h-5 w-5 text-primary" />,
            theme: "market",
            enableExport: true,
            enableRefresh: true,
            refreshInterval: 30_000,
          }}
        />
      )}

      {/* Detailed Tabs */}
      <Tabs defaultValue="listings" className="space-y-4">
        <TabsList>
          <TabsTrigger value="listings">Listings</TabsTrigger>
          <TabsTrigger value="trends">Price Trends</TabsTrigger>
          <TabsTrigger value="compliance">RERA Compliance</TabsTrigger>
          <TabsTrigger value="ingestion">Ingestion Runs</TabsTrigger>
        </TabsList>

        <TabsContent value="listings">
          <MarketListingsTab workspaceId={data?.workspaceId ?? ""} />
        </TabsContent>
        <TabsContent value="trends">
          <MarketTrendsTab workspaceId={data?.workspaceId ?? ""} />
        </TabsContent>
        <TabsContent value="compliance">
          <MarketComplianceTab workspaceId={data?.workspaceId ?? ""} />
        </TabsContent>
        <TabsContent value="ingestion">
          <MarketIngestionTab workspaceId={data?.workspaceId ?? ""} />
        </TabsContent>
      </Tabs>

      {/* AI Recommendations */}
      {recommendations.length > 0 && (
        <div>
          <h3 className="mb-4 flex items-center gap-2 font-display text-2xl">
            <Sparkles className="h-5 w-5 text-primary" /> AI Market Recommendations
          </h3>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {recommendations.map((r) => (
              <div key={r.id} className="rounded-2xl border border-border/60 bg-card p-5">
                <div className="flex items-center justify-between text-[10px] uppercase tracking-wider">
                  <span className={r.priority === "CRITICAL" ? "text-destructive" : r.priority === "HIGH" ? "text-amber-400" : "text-primary"}>
                    {r.priority} · Confidence {Math.round(r.confidence * 100)}%
                  </span>
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
        </div>
      )}

      {recommendations.length === 0 && intelligenceData && (
        <div className="rounded-2xl border border-border/60 bg-card p-8 text-center">
          <CheckCircle2 className="h-12 w-12 text-emerald-500 mx-auto" />
          <h3 className="mt-4 font-display text-xl">Market Intelligence Healthy</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            No qualifying risk recommendations at this time. All monitored metrics are within normal ranges.
          </p>
        </div>
      )}
    </div>
  );
}

// ─── KPI Component ─────────────────────────────────────────────────

function Kpi({ icon: Icon, label, value, delta, muted, danger }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string; delta?: string; muted?: boolean; danger?: boolean }) {
  return (
    <Card className="rounded-2xl border-border/60">
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider">{label}</p>
            <p className="mt-1 font-display text-3xl font-semibold" style={danger ? { color: "var(--destructive)" } : muted ? { color: "var(--muted-foreground)" } : undefined}>
              {value}
            </p>
            {delta && <p className="mt-1 text-xs text-muted-foreground">{delta}</p>}
          </div>
          <div className="rounded-xl bg-primary/10 p-3 text-primary">
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Tab Components ────────────────────────────────────────────────

function MarketListingsTab({ workspaceId }: { workspaceId: string }) {
  const [filters, setFilters] = useState<{ city?: string; propertyType?: string; source?: string }>({});

  const { data: listings, isLoading, error } = useQuery({
    queryKey: marketKeys.listings(workspaceId, filters),
    queryFn: () => fetchMarketListings(workspaceId, filters),
    enabled: !!workspaceId,
  });

  const cities = [...new Set([...INITIAL_DB_LISTINGS.map(l => l.city), ...(listings?.map(l => l.city) ?? [])])].sort();
  const propertyTypes = [...new Set([...INITIAL_DB_LISTINGS.map(l => l.property_type), ...(listings?.map(l => l.property_type) ?? [])])].sort();
  const sources = [...new Set([...INITIAL_DB_LISTINGS.map(l => l.source), ...(listings?.map(l => l.source) ?? [])])].sort();

  if (isLoading) return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (error) return <div className="text-destructive p-4">Error: {(error as Error).message}</div>;

  return (
    <div className="space-y-4">
      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-wrap gap-4">
            <Select value={filters.city ?? "all"} onValueChange={v => setFilters(f => ({ ...f, city: v === "all" ? undefined : v }))}>
              <SelectTrigger className="w-[200px]"><SelectValue placeholder="All Cities" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Cities</SelectItem>
                {cities.map(city => <SelectItem key={city} value={city}>{city}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filters.propertyType ?? "all"} onValueChange={v => setFilters(f => ({ ...f, propertyType: v === "all" ? undefined : v }))}>
              <SelectTrigger className="w-[200px]"><SelectValue placeholder="All Types" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {propertyTypes.map(pt => <SelectItem key={pt} value={pt}>{pt.charAt(0).toUpperCase() + pt.slice(1)}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filters.source ?? "all"} onValueChange={v => setFilters(f => ({ ...f, source: v === "all" ? undefined : v }))}>
              <SelectTrigger className="w-[200px]"><SelectValue placeholder="All Sources" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sources</SelectItem>
                {sources.map(s => <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={() => setFilters({})}><RefreshCw className="h-4 w-4 mr-2" />Reset</Button>
          </div>
        </CardContent>
      </Card>

      {/* Listings Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Market Listings ({listings?.length ?? 0})
            <Badge variant="secondary">{listings?.length ?? 0} records</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="pb-2 pr-4">Title</th>
                  <th className="pb-2 pr-4">City / Locality</th>
                  <th className="pb-2 pr-4">Type</th>
                  <th className="pb-2 pr-4">Listing</th>
                  <th className="pb-2 pr-4">Price</th>
                  <th className="pb-2 pr-4">₹/sqft</th>
                  <th className="pb-2 pr-4">Area</th>
                  <th className="pb-2 pr-4">Source</th>
                  <th className="pb-2 pr-4">Scraped</th>
                </tr>
              </thead>
              <tbody>
                {listings?.slice(0, 50).map(listing => (
                  <tr key={listing.id} className="border-b hover:bg-muted/50">
                    <td className="py-2 pr-4 max-w-xs truncate">{listing.title ?? "—"}</td>
                    <td className="py-2 pr-4">
                      <div>{listing.city}</div>
                      {listing.locality && <div className="text-xs text-muted-foreground">{listing.locality}</div>}
                    </td>
                    <td className="py-2 pr-4">
                      <Badge variant="outline" className="text-xs">
                        {listing.property_type === "apartment" && <Home className="h-3 w-3 mr-1" />}
                        {listing.property_type === "villa" && <Building2 className="h-3 w-3 mr-1" />}
                        {listing.property_type === "plot" && <LandPlot className="h-3 w-3 mr-1" />}
                        {listing.property_type === "commercial" && <Building className="h-3 w-3 mr-1" />}
                        {listing.property_type.charAt(0).toUpperCase() + listing.property_type.slice(1)}
                      </Badge>
                    </td>
                    <td className="py-2 pr-4">
                      <Badge variant={listing.listing_type === "sale" ? "default" : "secondary"} className="text-xs">
                        {listing.listing_type.charAt(0).toUpperCase() + listing.listing_type.slice(1)}
                      </Badge>
                    </td>
                    <td className="py-2 pr-4 font-mono">{listing.price ? `₹${listing.price.toLocaleString()}` : "—"}</td>
                    <td className="py-2 pr-4 font-mono">{listing.price_per_sqft ? `₹${listing.price_per_sqft.toLocaleString()}` : "—"}</td>
                    <td className="py-2 pr-4 font-mono">{listing.area_sqft ? `${listing.area_sqft.toLocaleString()} sqft` : "—"}</td>
                    <td className="py-2 pr-4">
                      <Badge variant="outline" className="text-xs">{listing.source}</Badge>
                    </td>
                    <td className="py-2 pr-4 text-xs text-muted-foreground">{format(new Date(listing.scraped_at), "MMM d, yyyy")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {listings && listings.length > 50 && (
              <p className="text-sm text-muted-foreground mt-2">Showing 50 of {listings.length} listings. Apply filters to narrow results.</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function MarketTrendsTab({ workspaceId }: { workspaceId: string }) {
  const [filters, setFilters] = useState<{ city?: string; propertyType?: string; period?: string }>({});

  const { data: trends, isLoading, error } = useQuery({
    queryKey: marketKeys.trends(workspaceId, filters),
    queryFn: () => fetchMarketTrends(workspaceId, filters),
    enabled: !!workspaceId,
  });

  const cities = [...new Set([...INITIAL_DB_TRENDS.map(t => t.city), ...(trends?.map(t => t.city) ?? [])])].sort();
  const propertyTypes = [...new Set([...INITIAL_DB_TRENDS.map(t => t.property_type), ...(trends?.map(t => t.property_type) ?? [])])].sort();
  const periods = [...new Set([...INITIAL_DB_TRENDS.map(t => t.period), ...(trends?.map(t => t.period) ?? [])])].sort().reverse();

  if (isLoading) return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (error) return <div className="text-destructive p-4">Error: {(error as Error).message}</div>;

  return (
    <div className="space-y-4">
      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-wrap gap-4">
            <Select value={filters.city ?? "all"} onValueChange={v => setFilters(f => ({ ...f, city: v === "all" ? undefined : v }))}>
              <SelectTrigger className="w-[200px]"><SelectValue placeholder="All Cities" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Cities</SelectItem>
                {cities.map(city => <SelectItem key={city} value={city}>{city}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filters.propertyType ?? "all"} onValueChange={v => setFilters(f => ({ ...f, propertyType: v === "all" ? undefined : v }))}>
              <SelectTrigger className="w-[200px]"><SelectValue placeholder="All Types" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {propertyTypes.map(pt => <SelectItem key={pt} value={pt}>{pt.charAt(0).toUpperCase() + pt.slice(1)}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filters.period ?? "all"} onValueChange={v => setFilters(f => ({ ...f, period: v === "all" ? undefined : v }))}>
              <SelectTrigger className="w-[200px]"><SelectValue placeholder="All Periods" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Periods</SelectItem>
                {periods.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={() => setFilters({})}><RefreshCw className="h-4 w-4 mr-2" />Reset</Button>
          </div>
        </CardContent>
      </Card>

      {/* Trends Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Market Trends ({trends?.length ?? 0})
            <Badge variant="secondary">{trends?.length ?? 0} records</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="pb-2 pr-4">City / Locality</th>
                  <th className="pb-2 pr-4">Property Type</th>
                  <th className="pb-2 pr-4">Period</th>
                  <th className="pb-2 pr-4">Avg ₹/sqft</th>
                  <th className="pb-2 pr-4">Median Price</th>
                  <th className="pb-2 pr-4">Listings</th>
                  <th className="pb-2 pr-4">Price Change</th>
                  <th className="pb-2 pr-4">Demand Index</th>
                  <th className="pb-2 pr-4">Source</th>
                </tr>
              </thead>
              <tbody>
                {trends?.map(trend => (
                  <tr key={trend.id} className="border-b hover:bg-muted/50">
                    <td className="py-2 pr-4">
                      <div>{trend.city}</div>
                      <div className="text-xs text-muted-foreground">{trend.locality}</div>
                    </td>
                    <td className="py-2 pr-4">
                      <Badge variant="outline" className="text-xs">{trend.property_type.charAt(0).toUpperCase() + trend.property_type.slice(1)}</Badge>
                    </td>
                    <td className="py-2 pr-4 font-mono text-xs">{trend.period}</td>
                    <td className="py-2 pr-4 font-mono font-medium">₹{trend.avg_price_per_sqft.toLocaleString()}</td>
                    <td className="py-2 pr-4 font-mono">{trend.median_price ? `₹${trend.median_price.toLocaleString()}` : "—"}</td>
                    <td className="py-2 pr-4 font-mono">{trend.total_listings.toLocaleString()}</td>
                    <td className="py-2 pr-4">
                      {trend.price_change_pct !== null && trend.price_change_pct !== undefined ? (
                        <span className={trend.price_change_pct >= 0 ? "text-green-600" : "text-red-600"}>
                          {trend.price_change_pct >= 0 && <TrendingUp className="h-3 w-3 inline mr-1" />}
                          {trend.price_change_pct < 0 && <TrendingDown className="h-3 w-3 inline mr-1" />}
                          {trend.price_change_pct.toFixed(1)}%
                        </span>
                      ) : "—"}
                    </td>
                    <td className="py-2 pr-4">{trend.demand_index !== null ? `${trend.demand_index}/100` : "—"}</td>
                    <td className="py-2 pr-4">
                      <Badge variant="outline" className="text-xs">{trend.source}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function MarketComplianceTab({ workspaceId }: { workspaceId: string }) {
  const [filters, setFilters] = useState<{ city?: string; status?: string }>({});

  const { data: compliance, isLoading, error } = useQuery({
    queryKey: marketKeys.compliance(workspaceId, filters),
    queryFn: () => fetchMarketCompliance(workspaceId, filters),
    enabled: !!workspaceId,
  });

  const cities = [...new Set([...INITIAL_DB_COMPLIANCE.map(c => c.city), ...(compliance?.map(c => c.city) ?? [])])].sort();
  const statuses = [...new Set([...INITIAL_DB_COMPLIANCE.map(c => c.status), ...(compliance?.map(c => c.status) ?? [])])].sort();

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "registered": return <Badge variant="default"><CheckCircle className="h-3 w-3 mr-1" />Registered</Badge>;
      case "revoked": return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Revoked</Badge>;
      case "lapsed": return <Badge variant="secondary"><AlertTriangle className="h-3 w-3 mr-1" />Lapsed</Badge>;
      case "under_review": return <Badge variant="outline"><Loader2 className="h-3 w-3 mr-1" />Under Review</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (isLoading) return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (error) return <div className="text-destructive p-4">Error: {(error as Error).message}</div>;

  return (
    <div className="space-y-4">
      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-wrap gap-4">
            <Select value={filters.city ?? "all"} onValueChange={v => setFilters(f => ({ ...f, city: v === "all" ? undefined : v }))}>
              <SelectTrigger className="w-[200px]"><SelectValue placeholder="All Cities" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Cities</SelectItem>
                {cities.map(city => <SelectItem key={city} value={city}>{city}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filters.status ?? "all"} onValueChange={v => setFilters(f => ({ ...f, status: v === "all" ? undefined : v }))}>
              <SelectTrigger className="w-[200px]"><SelectValue placeholder="All Statuses" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {statuses.map(s => <SelectItem key={s} value={s}>{s.replace("_", " ").charAt(0).toUpperCase() + s.replace("_", " ").slice(1)}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={() => setFilters({})}><RefreshCw className="h-4 w-4 mr-2" />Reset</Button>
          </div>
        </CardContent>
      </Card>

      {/* Compliance Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            RERA Compliance Records ({compliance?.length ?? 0})
            <Badge variant="secondary">{compliance?.length ?? 0} records</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="pb-2 pr-4">Project Name</th>
                  <th className="pb-2 pr-4">Promoter</th>
                  <th className="pb-2 pr-4">City / State</th>
                  <th className="pb-2 pr-4">RERA Number</th>
                  <th className="pb-2 pr-4">Status</th>
                  <th className="pb-2 pr-4">Registration</th>
                  <th className="pb-2 pr-4">Expiry</th>
                </tr>
              </thead>
              <tbody>
                {compliance?.map(item => (
                  <tr key={item.id} className="border-b hover:bg-muted/50">
                    <td className="py-2 pr-4 font-medium">{item.project_name}</td>
                    <td className="py-2 pr-4 text-xs text-muted-foreground">{item.promoter ?? "—"}</td>
                    <td className="py-2 pr-4">
                      <div>{item.city}</div>
                      <div className="text-xs text-muted-foreground">{item.state}</div>
                    </td>
                    <td className="py-2 pr-4 font-mono text-xs">{item.rera_number}</td>
                    <td className="py-2 pr-4">{getStatusBadge(item.status)}</td>
                    <td className="py-2 pr-4 text-xs text-muted-foreground">{item.registration_date ? format(new Date(item.registration_date), "MMM d, yyyy") : "—"}</td>
                    <td className="py-2 pr-4 text-xs text-muted-foreground">{item.expiry_date ? format(new Date(item.expiry_date), "MMM d, yyyy") : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function MarketIngestionTab({ workspaceId }: { workspaceId: string }) {
  const { data: runs, isLoading, error } = useQuery({
    queryKey: marketKeys.ingestionRuns(workspaceId),
    queryFn: () => fetchIngestionRuns(workspaceId),
    enabled: !!workspaceId,
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed": return <Badge variant="default"><CheckCircle className="h-3 w-3 mr-1" />Completed</Badge>;
      case "processing": return <Badge variant="secondary"><Loader2 className="h-3 w-3 mr-1 animate-spin" />Processing</Badge>;
      case "failed": return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Failed</Badge>;
      case "partial": return <Badge variant="outline"><AlertTriangle className="h-3 w-3 mr-1" />Partial</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (isLoading) return <div className="p-8 text-center text-gray-500">Loading ingestion runs...</div>;
  if (error) return <div className="p-8 text-center text-red-500">Error loading ingestion runs</div>;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Ingestion Runs ({runs?.length ?? 0})
            <Badge variant="secondary">{runs?.length ?? 0} runs</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="pb-2 pr-4">Run ID</th>
                  <th className="pb-2 pr-4">Source</th>
                  <th className="pb-2 pr-4">Status</th>
                  <th className="pb-2 pr-4">Listings</th>
                  <th className="pb-2 pr-4">Trends</th>
                  <th className="pb-2 pr-4">Compliance</th>
                  <th className="pb-2 pr-4">Started</th>
                  <th className="pb-2 pr-4">Completed</th>
                  <th className="pb-2 pr-4">Errors</th>
                </tr>
              </thead>
              <tbody>
                {runs?.map(run => (
                  <tr key={run.id} className="border-b hover:bg-muted/50">
                    <td className="py-2 pr-4 font-mono text-xs">{run.id.slice(0, 8)}...</td>
                    <td className="py-2 pr-4">{run.source}</td>
                    <td className="py-2 pr-4">{getStatusBadge(run.status)}</td>
                    <td className="py-2 pr-4 font-mono">{run.listings_ingested} (+{run.listings_duplicates} dup)</td>
                    <td className="py-2 pr-4 font-mono">{run.trends_ingested} (+{run.trends_duplicates} dup)</td>
                    <td className="py-2 pr-4 font-mono">{run.compliance_ingested} (+{run.compliance_duplicates} dup)</td>
                    <td className="py-2 pr-4 text-xs text-muted-foreground">{format(new Date(run.started_at), "MMM d, HH:mm")}</td>
                    <td className="py-2 pr-4 text-xs text-muted-foreground">{run.completed_at ? format(new Date(run.completed_at), "MMM d, HH:mm") : "—"}</td>
                    <td className="py-2 pr-4">
                      {run.errors && run.errors.length > 0 ? (
                        <Badge variant="destructive" className="text-xs">{run.errors.length} error(s)</Badge>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
