import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

type AnySupabase = SupabaseClient<Database> | SupabaseClient<any, any, any>;

export type MarketDataPoint = {
  id: string;
  locationId: string;
  metric: string;
  periodStart: string;
  periodEnd: string;
  value: number;
  unit: string | null;
  source: string | null;
};

export type MarketDataQuery = {
  locationId?: string;
  metric?: string;
  since?: string; // ISO date
  limit?: number;
};

export async function listMarketData(
  supabase: AnySupabase,
  q: MarketDataQuery = {},
): Promise<MarketDataPoint[]> {
  let query = (supabase as any)
    .from("market_data")
    .select("id,location_id,metric,period_start,period_end,value,unit,source")
    .order("period_start", { ascending: false })
    .limit(q.limit ?? 500);
  if (q.locationId) query = query.eq("location_id", q.locationId);
  if (q.metric) query = query.eq("metric", q.metric);
  if (q.since) query = query.gte("period_start", q.since);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map((r: any) => ({
    id: r.id,
    locationId: r.location_id,
    metric: r.metric,
    periodStart: r.period_start,
    periodEnd: r.period_end,
    value: Number(r.value),
    unit: r.unit ?? null,
    source: r.source ?? null,
  }));
}

export async function getLatestMetric(
  supabase: AnySupabase,
  locationId: string,
  metric: string,
): Promise<MarketDataPoint | null> {
  const rows = await listMarketData(supabase, { locationId, metric, limit: 1 });
  return rows[0] ?? null;
}
