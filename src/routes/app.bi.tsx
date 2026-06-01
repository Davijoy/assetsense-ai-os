import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { getBISnapshot } from "@/lib/bi.functions";
import {
  TrendingUp,
  TrendingDown,
  IndianRupee,
  Building2,
  MapPin,
  Target,
  Activity,
  Download,
  Sparkles,
  ArrowUpRight,
  Layers,
  Filter,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const biQueryOptions = queryOptions({
  queryKey: ["bi-snapshot"],
  queryFn: () => getBISnapshot(),
  refetchInterval: 30_000,
  staleTime: 15_000,
});

export const Route = createFileRoute("/app/bi")({
  head: () => ({ meta: [{ title: "Intelligence — Assetsense" }] }),
  loader: ({ context }) => context.queryClient.ensureQueryData(biQueryOptions),
  errorComponent: ({ error }) => (
    <div className="rounded-2xl border border-destructive/40 bg-destructive/10 p-6 text-sm">
      Couldn't load Intelligence data: {error.message}
    </div>
  ),
  component: BI,
});

const insights = [
  { title: "Whitefield demand surging", body: "3 BHK enquiries up 42% WoW. Recommend ad spend reallocation of ₹4.8 L from NCR.", impact: "+₹2.1 Cr" },
  { title: "Lodha Park price elasticity", body: "Conversion lifts 18% if EMI calculator surfaced earlier in the funnel.", impact: "+8.4% conv" },
  { title: "Partner channel underweight", body: "Top 5 channel partners deliver 3.2× CAC efficiency vs Meta Ads.", impact: "-23% CAC" },
];

const PIE_COLORS = ["oklch(0.78 0.18 158)", "oklch(0.85 0.2 168)", "oklch(0.6 0.18 200)", "oklch(0.7 0.15 140)", "oklch(0.5 0.12 220)"];

function formatCr(n: number) {
  return `₹${(n / 10_000_000).toFixed(1)} Cr`;
}
function formatINR(n: number) {
  return `₹${n.toLocaleString("en-IN")}`;
}

function BI() {
  const { data } = useSuspenseQuery(biQueryOptions);
  const { kpis, revenueSeries, funnel, channel, cohort, regions } = data;
  const maxFunnel = funnel[0]?.value || 1;
  const kpiCards = [
    {
      label: "Revenue (booked)",
      value: formatCr(kpis.revenue_inr),
      delta: `${kpis.revenue_delta_pct >= 0 ? "+" : ""}${kpis.revenue_delta_pct}%`,
      up: kpis.revenue_delta_pct >= 0,
      icon: IndianRupee,
    },
    {
      label: "Units Sold",
      value: kpis.units_sold.toLocaleString("en-IN"),
      delta: `${kpis.units_delta_pct >= 0 ? "+" : ""}${kpis.units_delta_pct}%`,
      up: kpis.units_delta_pct >= 0,
      icon: Building2,
    },
    {
      label: "Sales Velocity",
      value: `${kpis.sales_velocity_days} days`,
      delta: "rolling avg",
      up: true,
      icon: Activity,
    },
    {
      label: "Cost / Lead",
      value: formatINR(kpis.cost_per_lead_inr),
      delta: "blended",
      up: true,
      icon: Target,
    },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-primary">Business Intelligence</p>
          <h1 className="mt-2 font-display text-5xl">Signal, not noise.</h1>
          <p className="mt-2 text-muted-foreground">
            Live aggregation across CRM, marketplace and voice — refreshed every 30s.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1.5 text-[11px] text-primary">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
            Live · {new Date(data.generated_at).toLocaleTimeString()}
          </span>
          <button className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-2 text-xs">
            <Filter className="h-3.5 w-3.5" /> Last 90 days
          </button>
          <button className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-2 text-xs">
            <Layers className="h-3.5 w-3.5" /> All projects
          </button>
          <button className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-xs font-medium text-primary-foreground shadow-glow hover:bg-primary/90">
            <Download className="h-3.5 w-3.5" /> Export
          </button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {kpiCards.map(({ label, value, delta, up, icon: Icon }) => (
          <div key={label} className="rounded-2xl border border-border bg-surface/40 p-5">
            <div className="flex items-center justify-between">
              <Icon className="h-4 w-4 text-primary" />
              <span className={`inline-flex items-center gap-0.5 text-[11px] ${up ? "text-primary" : "text-destructive"}`}>
                {up ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />} {delta}
              </span>
            </div>
            <div className="mt-4 font-display text-4xl">{value}</div>
            <div className="mt-1 text-xs text-muted-foreground">{label}</div>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-2xl border border-border bg-surface/30 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-display text-2xl">Revenue vs forecast</h3>
              <p className="text-xs text-muted-foreground">AI projection 92% confidence · monthly ₹ Cr</p>
            </div>
            <span className="text-[11px] text-primary">
              {kpis.revenue_delta_pct >= 0 ? "↑" : "↓"} {Math.abs(kpis.revenue_delta_pct)}% MoM
            </span>
          </div>
          <div className="mt-4 h-72">
            <ResponsiveContainer>
              <AreaChart data={revenueSeries}>
                <defs>
                  <linearGradient id="actualGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="oklch(0.78 0.18 158)" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="oklch(0.78 0.18 158)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="oklch(0.28 0.04 258 / 40%)" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="m" stroke="oklch(0.7 0.02 250)" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="oklch(0.7 0.02 250)" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{
                    background: "oklch(0.17 0.04 258)",
                    border: "1px solid oklch(0.28 0.04 258)",
                    borderRadius: 12,
                    fontSize: 12,
                  }}
                />
                <Area type="monotone" dataKey="actual" stroke="oklch(0.78 0.18 158)" strokeWidth={2} fill="url(#actualGrad)" />
                <Line type="monotone" dataKey="forecast" stroke="oklch(0.85 0.2 168)" strokeDasharray="4 4" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-surface/30 p-6">
          <h3 className="font-display text-2xl">Channel mix</h3>
          <p className="text-xs text-muted-foreground">Share of qualified leads</p>
          <div className="mt-2 h-52">
            <ResponsiveContainer>
              <PieChart>
                <Pie data={channel} dataKey="value" innerRadius={48} outerRadius={78} paddingAngle={2}>
                  {channel.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} stroke="oklch(0.13 0.03 260)" />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 space-y-2">
            {channel.map((c, i) => (
              <div key={c.name} className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                  {c.name}
                </span>
                <span className="tabular-nums text-muted-foreground">{c.value}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-2xl border border-border bg-surface/30 p-6">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-2xl">Conversion funnel</h3>
            <span className="text-xs text-muted-foreground">Visitor → Booking · 0.43%</span>
          </div>
          <div className="mt-6 space-y-2.5">
            {funnel.map((f, i) => {
              const pct = (f.value / maxFunnel) * 100;
              const prev = funnel[i - 1]?.value ?? 0;
              const dropoff = i > 0 && prev > 0 ? Math.round((1 - f.value / prev) * 100) : 0;
              return (
                <div key={f.stage} className="group">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium">{f.stage}</span>
                    <span className="tabular-nums text-muted-foreground">
                      {f.value.toLocaleString()} {i > 0 && <span className="text-destructive ml-2">-{dropoff}%</span>}
                    </span>
                  </div>
                  <div className="mt-1.5 h-8 overflow-hidden rounded-md bg-background">
                    <div
                      className="h-full rounded-md bg-gradient-to-r from-primary to-emerald-glow transition-all"
                      style={{ width: `${pct}%`, opacity: 0.3 + (1 - i / funnel.length) * 0.7 }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-surface/30 p-6">
          <h3 className="font-display text-2xl">Cohort retention</h3>
          <p className="text-xs text-muted-foreground">New vs returning users · weekly</p>
          <div className="mt-4 h-56">
            <ResponsiveContainer>
              <BarChart data={cohort}>
                <CartesianGrid stroke="oklch(0.28 0.04 258 / 40%)" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="week" stroke="oklch(0.7 0.02 250)" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="oklch(0.7 0.02 250)" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{
                    background: "oklch(0.17 0.04 258)",
                    border: "1px solid oklch(0.28 0.04 258)",
                    borderRadius: 12,
                    fontSize: 12,
                  }}
                />
                <Bar dataKey="new" stackId="a" fill="oklch(0.78 0.18 158)" radius={[0, 0, 0, 0]} />
                <Bar dataKey="return" stackId="a" fill="oklch(0.5 0.12 220)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-2xl border border-border bg-surface/30">
          <div className="flex items-center justify-between border-b border-border p-5">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-primary" />
              <h3 className="font-display text-2xl">Regional performance</h3>
            </div>
            <button className="text-xs text-primary hover:underline">View map</button>
          </div>
          <table className="w-full text-sm">
            <thead className="text-left text-[10px] uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-5 py-3">Region</th>
                <th className="px-5 py-3">Deals</th>
                <th className="px-5 py-3">Revenue</th>
                <th className="px-5 py-3">Growth</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {regions.map((r) => (
                <tr key={r.name} className="hover:bg-surface/40">
                  <td className="px-5 py-3 font-medium">{r.name}</td>
                  <td className="px-5 py-3 tabular-nums">{r.deals}</td>
                  <td className="px-5 py-3 tabular-nums">{formatCr(r.rev)}</td>
                  <td className="px-5 py-3">
                    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] ${
                      r.growth >= 0 ? "bg-primary/10 text-primary" : "bg-destructive/15 text-destructive"
                    }`}>
                      {r.growth >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />} {Math.abs(r.growth)}%
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <ArrowUpRight className="ml-auto h-4 w-4 text-muted-foreground" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="rounded-2xl border border-primary/30 bg-gradient-to-b from-primary/5 to-transparent p-6">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <h3 className="font-display text-2xl">AI insights</h3>
          </div>
          <p className="text-xs text-muted-foreground">3 recommendations · generated 4m ago</p>
          <div className="mt-5 space-y-4">
            {insights.map((i) => (
              <div key={i.title} className="rounded-xl border border-border bg-background/60 p-4">
                <div className="flex items-start justify-between gap-3">
                  <h4 className="text-sm font-medium leading-snug">{i.title}</h4>
                  <span className="shrink-0 rounded-full bg-primary/15 px-2 py-0.5 text-[10px] text-primary">{i.impact}</span>
                </div>
                <p className="mt-1.5 text-xs text-muted-foreground">{i.body}</p>
                <button className="mt-3 text-[11px] text-primary hover:underline">Apply recommendation →</button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}