import type { SupabaseClient } from "@supabase/supabase-js";

type AnySupabase = SupabaseClient<any, any, any>;

export type FeedItemType =
  | "Opportunity"
  | "Risk"
  | "Prediction"
  | "Recommendation"
  | "Market"
  | "Revenue";

export type FeedItem = {
  time: string;
  type: FeedItemType;
  title: string;
  body: string;
};

const inr = (n: number) =>
  n >= 1e7 ? `₹${(n / 1e7).toFixed(1)} Cr` : `₹${(n / 1e5).toFixed(1)} L`;

const clock = (d: Date) =>
  d.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", hour12: true });

/**
 * Derives the executive feed from live workspace data: leads, properties and
 * AI voice calls. Returns [] when the workspace has no data yet so the UI can
 * fall back to its briefing sample.
 */
export async function buildFeed(
  supabase: AnySupabase,
  workspaceId: string,
): Promise<FeedItem[]> {
  const [leadsRes, propsRes, callsRes] = await Promise.all([
    (supabase as any)
      .from("leads")
      .select("id, name, stage, score, budget_inr, source, city, created_at")
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false })
      .limit(500),
    (supabase as any)
      .from("properties")
      .select("id, name, city, price_inr, status, ai_score, created_at")
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false })
      .limit(500),
    (supabase as any)
      .from("calls")
      .select("id, intent_score, intent_label, qualified, sentiment, created_at")
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false })
      .limit(500),
  ]);

  const leads = leadsRes.data ?? [];
  const properties = propsRes.data ?? [];
  const calls = callsRes.data ?? [];
  if (!leads.length && !properties.length && !calls.length) return [];

  const items: FeedItem[] = [];
  const now = new Date();
  const t = (minsAgo: number) => clock(new Date(now.getTime() - minsAgo * 60000));

  // Revenue — open pipeline value
  const pipeline = leads
    .filter((l: any) => l.stage !== "Lost")
    .reduce((s: number, l: any) => s + Number(l.budget_inr ?? 0), 0);
  if (pipeline > 0) {
    items.push({
      time: t(240),
      type: "Revenue",
      title: `Open pipeline at ${inr(pipeline)}`,
      body: `${leads.length} tracked leads across the workspace, weighted by stated budget. Won and lost stages excluded from the live number.`,
    });
  }

  // Opportunity — hot leads
  const hot = leads.filter((l: any) => Number(l.score ?? 0) >= 85);
  if (hot.length) {
    const hotValue = hot.reduce((s: number, l: any) => s + Number(l.budget_inr ?? 0), 0);
    items.push({
      time: t(180),
      type: "Opportunity",
      title: `${hot.length} leads scoring 85+ need an owner today`,
      body: `Combined budget ${inr(hotValue)}. Top prospect: ${hot[0].name}${hot[0].city ? ` · ${hot[0].city}` : ""} (score ${hot[0].score}).`,
    });
  }

  // Market — strongest city by lead volume
  const byCity = new Map<string, number>();
  for (const l of leads) if (l.city) byCity.set(l.city, (byCity.get(l.city) ?? 0) + 1);
  const topCity = [...byCity.entries()].sort((a, b) => b[1] - a[1])[0];
  if (topCity) {
    items.push({
      time: t(150),
      type: "Market",
      title: `${topCity[0]} is your densest demand cluster`,
      body: `${topCity[1]} of ${leads.length} leads originate here. Concentrating inventory and campaign spend in ${topCity[0]} raises expected conversion.`,
    });
  }

  // Recommendation — best performing source
  const bySource = new Map<string, { n: number; score: number }>();
  for (const l of leads) {
    const cur = bySource.get(l.source) ?? { n: 0, score: 0 };
    cur.n += 1;
    cur.score += Number(l.score ?? 0);
    bySource.set(l.source, cur);
  }
  const ranked = [...bySource.entries()]
    .filter(([, v]) => v.n >= 2)
    .map(([k, v]) => ({ source: k, avg: v.score / v.n, n: v.n }))
    .sort((a, b) => b.avg - a.avg);
  if (ranked.length >= 2) {
    const best = ranked[0];
    const worst = ranked[ranked.length - 1];
    items.push({
      time: t(120),
      type: "Recommendation",
      title: `Shift budget from ${worst.source} to ${best.source}`,
      body: `${best.source} averages an AI score of ${best.avg.toFixed(0)} across ${best.n} leads versus ${worst.avg.toFixed(0)} for ${worst.source}.`,
    });
  }

  // Prediction — voice intent
  if (calls.length) {
    const qualified = calls.filter((c: any) => c.qualified).length;
    const avgIntent =
      calls.reduce((s: number, c: any) => s + Number(c.intent_score ?? 0), 0) / calls.length;
    items.push({
      time: t(90),
      type: "Prediction",
      title: `Voice qualification tracking at ${Math.round((qualified / calls.length) * 100)}%`,
      body: `${qualified} of ${calls.length} AI voice conversations qualified, average intent score ${avgIntent.toFixed(0)}. Expect that ratio to hold through the current cohort.`,
    });
  }

  // Risk — stalled inventory
  const available = properties.filter((p: any) => p.status !== "Sold");
  const weak = available.filter((p: any) => Number(p.ai_score ?? 0) < 70);
  if (weak.length) {
    const stuck = weak.reduce((s: number, p: any) => s + Number(p.price_inr ?? 0), 0);
    items.push({
      time: t(45),
      type: "Risk",
      title: `${weak.length} listings below a 70 AI score`,
      body: `${inr(stuck)} of unsold inventory is under-scoring. Re-price or refresh positioning before absorption slows further.`,
    });
  }

  // Opportunity — newest listing
  const newest = properties[0];
  if (newest) {
    items.push({
      time: t(15),
      type: "Opportunity",
      title: `New listing live · ${newest.name}`,
      body: `${newest.city} · ${inr(Number(newest.price_inr ?? 0))} · AI score ${newest.ai_score}. Matching it against ${hot.length || leads.length} active buyer profiles.`,
    });
  }

  return items;
}