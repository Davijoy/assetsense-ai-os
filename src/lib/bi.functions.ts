import { createServerFn } from "@tanstack/react-start";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export type BISnapshot = {
  kpis: {
    revenue_inr: number;
    units_sold: number;
    sales_velocity_days: number;
    cost_per_lead_inr: number;
    revenue_delta_pct: number;
    units_delta_pct: number;
  };
  revenueSeries: { m: string; actual: number; forecast: number }[];
  funnel: { stage: string; value: number }[];
  channel: { name: string; value: number }[];
  cohort: { week: string; new: number; return: number }[];
  regions: { name: string; deals: number; rev: number; growth: number }[];
  call_intents: { label: string; count: number }[];
  total_calls: number;
  qualified_pct: number;
  generated_at: string;
};

const MONTH_LABELS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function monthKey(d: Date) {
  return `${d.getUTCFullYear()}-${d.getUTCMonth()}`;
}

export const getBISnapshot = createServerFn({ method: "GET" }).handler(async (): Promise<BISnapshot> => {
  const [leadsRes, propsRes, callsRes] = await Promise.all([
    supabaseAdmin.from("leads").select("id,stage,source,city,budget_inr,created_at,score"),
    supabaseAdmin.from("properties").select("id,city,status,price_inr,created_at"),
    supabaseAdmin.from("calls").select("id,intent_label,sentiment,qualified,created_at,duration_sec"),
  ]);

  if (leadsRes.error) throw new Error(leadsRes.error.message);
  if (propsRes.error) throw new Error(propsRes.error.message);
  if (callsRes.error) throw new Error(callsRes.error.message);

  const leads = leadsRes.data ?? [];
  const properties = propsRes.data ?? [];
  const calls = callsRes.data ?? [];

  // ---------- Funnel ----------
  const stageCounts: Record<string, number> = {
    new: 0, qualified: 0, site_visit: 0, negotiation: 0, booked: 0,
  };
  for (const l of leads) {
    if (l.stage in stageCounts) stageCounts[l.stage]++;
  }
  // synthetic top-of-funnel visitors ~ leads * ~7.7
  const visitors = Math.max(leads.length * 7 + 800, 1000);
  const cumulative = (s: string) => {
    const order = ["new", "qualified", "site_visit", "negotiation", "booked"];
    const idx = order.indexOf(s);
    return order.slice(idx).reduce((a, k) => a + stageCounts[k], 0);
  };
  const funnel = [
    { stage: "Visitors", value: visitors },
    { stage: "Leads", value: leads.length },
    { stage: "Qualified", value: cumulative("qualified") },
    { stage: "Site Visit", value: cumulative("site_visit") },
    { stage: "Negotiation", value: cumulative("negotiation") },
    { stage: "Booked", value: stageCounts.booked },
  ];

  // ---------- KPIs ----------
  const booked = leads.filter((l) => l.stage === "booked");
  const revenue_inr = booked.reduce((s, l) => s + (l.budget_inr ?? 0), 0);
  const units_sold = booked.length + properties.filter((p) => p.status === "sold").length;

  // Sales velocity = avg days between lead created_at and "now" for booked leads
  const now = Date.now();
  const velocities = booked
    .map((l) => (now - new Date(l.created_at).getTime()) / 86_400_000)
    .filter((d) => d > 0);
  const sales_velocity_days = velocities.length
    ? Math.round(velocities.reduce((a, b) => a + b, 0) / velocities.length)
    : 0;

  // Cost per lead — pretend each lead costs base + variance by source
  const sourceCost: Record<string, number> = {
    "Meta Ads": 2800, Google: 3200, Organic: 0, Partners: 1500, Referral: 500,
  };
  const totalSpend = leads.reduce((s, l) => s + (sourceCost[l.source] ?? 2000), 0);
  const cost_per_lead_inr = leads.length ? Math.round(totalSpend / leads.length) : 0;

  // Deltas: last 30d vs prior 30d
  const cutoffRecent = now - 30 * 86_400_000;
  const cutoffPrev = now - 60 * 86_400_000;
  const recentBooked = booked.filter((l) => new Date(l.created_at).getTime() >= cutoffRecent);
  const prevBooked = booked.filter((l) => {
    const t = new Date(l.created_at).getTime();
    return t >= cutoffPrev && t < cutoffRecent;
  });
  const recentRev = recentBooked.reduce((s, l) => s + (l.budget_inr ?? 0), 0);
  const prevRev = prevBooked.reduce((s, l) => s + (l.budget_inr ?? 0), 0);
  const revenue_delta_pct = prevRev ? Math.round(((recentRev - prevRev) / prevRev) * 100) : 0;
  const units_delta_pct = prevBooked.length
    ? Math.round(((recentBooked.length - prevBooked.length) / prevBooked.length) * 100)
    : 0;

  // ---------- Revenue series (last 9 months) ----------
  const buckets = new Map<string, number>();
  const labelByKey = new Map<string, string>();
  const months: { key: string; label: string }[] = [];
  const base = new Date();
  base.setUTCDate(1);
  for (let i = 8; i >= 0; i--) {
    const d = new Date(base);
    d.setUTCMonth(d.getUTCMonth() - i);
    const key = monthKey(d);
    months.push({ key, label: MONTH_LABELS[d.getUTCMonth()] });
    labelByKey.set(key, MONTH_LABELS[d.getUTCMonth()]);
    buckets.set(key, 0);
  }
  for (const l of booked) {
    const d = new Date(l.created_at);
    const key = monthKey(d);
    if (buckets.has(key)) {
      buckets.set(key, (buckets.get(key) ?? 0) + (l.budget_inr ?? 0));
    }
  }
  const revenueSeries = months.map(({ key, label }, i) => {
    const actual = Math.round((buckets.get(key) ?? 0) / 10_000_000); // ₹ Cr
    // simple smoothed forecast
    const forecast = Math.round(actual * (0.9 + (i % 3) * 0.06) + 6);
    return { m: label, actual, forecast };
  });

  // ---------- Channel mix ----------
  const sourceTotals = new Map<string, number>();
  for (const l of leads) {
    sourceTotals.set(l.source, (sourceTotals.get(l.source) ?? 0) + 1);
  }
  const totalLeads = leads.length || 1;
  const channel = Array.from(sourceTotals.entries())
    .map(([name, count]) => ({ name, value: Math.round((count / totalLeads) * 100) }))
    .sort((a, b) => b.value - a.value);

  // ---------- Cohort (last 6 weeks) ----------
  const cohort: { week: string; new: number; return: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const start = now - (i + 1) * 7 * 86_400_000;
    const end = now - i * 7 * 86_400_000;
    const weekLeads = leads.filter((l) => {
      const t = new Date(l.created_at).getTime();
      return t >= start && t < end;
    });
    const weekCalls = calls.filter((c) => {
      const t = new Date(c.created_at).getTime();
      return t >= start && t < end;
    });
    cohort.push({
      week: `W${6 - i}`,
      new: weekLeads.length,
      return: Math.max(weekCalls.length - weekLeads.length, 0),
    });
  }

  // ---------- Regional performance ----------
  const regionMap = new Map<string, { deals: number; rev: number; recent: number; prior: number }>();
  for (const l of leads) {
    const key = l.city ?? "Other";
    const r = regionMap.get(key) ?? { deals: 0, rev: 0, recent: 0, prior: 0 };
    if (l.stage === "booked") {
      r.deals += 1;
      r.rev += l.budget_inr ?? 0;
    }
    const t = new Date(l.created_at).getTime();
    if (t >= cutoffRecent) r.recent++;
    else if (t >= cutoffPrev) r.prior++;
    regionMap.set(key, r);
  }
  const regions = Array.from(regionMap.entries())
    .map(([name, r]) => ({
      name,
      deals: r.deals,
      rev: r.rev,
      growth: r.prior ? Math.round(((r.recent - r.prior) / r.prior) * 100) : r.recent > 0 ? 100 : 0,
    }))
    .sort((a, b) => b.rev - a.rev)
    .slice(0, 6);

  // ---------- Calls ----------
  const intentMap = new Map<string, number>();
  for (const c of calls) {
    intentMap.set(c.intent_label, (intentMap.get(c.intent_label) ?? 0) + 1);
  }
  const call_intents = Array.from(intentMap.entries())
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count);

  const qualified = calls.filter((c) => c.qualified).length;
  const qualified_pct = calls.length ? Math.round((qualified / calls.length) * 1000) / 10 : 0;

  return {
    kpis: {
      revenue_inr,
      units_sold,
      sales_velocity_days,
      cost_per_lead_inr,
      revenue_delta_pct,
      units_delta_pct,
    },
    revenueSeries,
    funnel,
    channel,
    cohort,
    regions,
    call_intents,
    total_calls: calls.length,
    qualified_pct,
    generated_at: new Date().toISOString(),
  };
});