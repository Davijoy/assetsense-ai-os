import { createFileRoute } from "@tanstack/react-router";
import {
  Megaphone,
  TrendingUp,
  TrendingDown,
  Sparkles,
  Target,
  IndianRupee,
  MousePointerClick,
  Users,
  ArrowUpRight,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export const Route = createFileRoute("/app/marketing")({
  head: () => ({ meta: [{ title: "Marketing Intelligence — Sentinel KIE" }] }),
  component: Marketing,
});

const CAMPAIGNS = [
  { name: "Meta · Whitefield Premium", spend: 18.4, leads: 612, cpl: 3008, cpb: 92_000, roi: 4.2, status: "scale" },
  { name: "Google · Lodha Park", spend: 22.1, leads: 488, cpl: 4528, cpb: 118_000, roi: 3.1, status: "hold" },
  { name: "Meta · Prestige Falcon", spend: 14.8, leads: 712, cpl: 2079, cpb: 76_000, roi: 5.1, status: "scale" },
  { name: "Google · Hiranandani", spend: 9.6, leads: 198, cpl: 4848, cpb: 195_000, roi: 1.4, status: "cut" },
  { name: "YouTube · Brand", spend: 6.2, leads: 142, cpl: 4366, cpb: 168_000, roi: 1.9, status: "hold" },
  { name: "Meta · NRI Retargeting", spend: 11.3, leads: 287, cpl: 3937, cpb: 88_000, roi: 4.7, status: "scale" },
];

const TREND = [
  { m: "Jan", cpl: 4900, cpb: 165_000 },
  { m: "Feb", cpl: 4620, cpb: 158_000 },
  { m: "Mar", cpl: 4310, cpb: 142_000 },
  { m: "Apr", cpl: 3980, cpb: 128_000 },
  { m: "May", cpl: 3540, cpb: 116_000 },
  { m: "Jun", cpl: 3208, cpb: 104_000 },
];

const RECS = [
  {
    impact: 94,
    title: "Reallocate ₹9 L from Google·Hiranandani → Meta·Prestige Falcon",
    detail: "Hiranandani CPL is 133% above target, Falcon ROI is 5.1×. Expected lift: +47 bookings/qtr.",
  },
  {
    impact: 88,
    title: "Increase NRI Retargeting daily cap by 40%",
    detail: "NRI cohort closing at 4.7× ROI with ₹88K CPB. Diminishing returns kick in only above ₹16 L/mo.",
  },
  {
    impact: 71,
    title: "Pause YouTube brand spend for 30 days",
    detail: "1.9× ROI, low attribution overlap with paid search. Test reactivation with creative refresh.",
  },
];

const fmt = (n: number) => `₹${n.toLocaleString("en-IN")}`;

function Marketing() {
  const totalSpend = CAMPAIGNS.reduce((s, c) => s + c.spend, 0);
  const totalLeads = CAMPAIGNS.reduce((s, c) => s + c.leads, 0);
  const blendedCpl = Math.round((totalSpend * 100_000) / totalLeads);
  const weightedRoi = (
    CAMPAIGNS.reduce((s, c) => s + c.roi * c.spend, 0) / totalSpend
  ).toFixed(2);

  return (
    <div className="space-y-8">
      <header>
        <div className="inline-flex items-center gap-2 rounded-full border border-gold/40 bg-gold/5 px-3 py-1 text-xs text-gold">
          <Megaphone className="h-3 w-3" /> Marketing Intelligence · Live
        </div>
        <h1 className="mt-3 font-display text-4xl">
          Spend smarter. <span className="text-gradient-emerald italic">Convert faster.</span>
        </h1>
        <p className="text-sm text-muted-foreground">
          Continuous attribution and budget optimization across Meta, Google, YouTube and brand.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Kpi icon={IndianRupee} label="Total Spend (MTD)" value={`₹${totalSpend.toFixed(1)} L`} delta="-6% vs plan" />
        <Kpi icon={Users} label="Leads" value={totalLeads.toLocaleString()} delta="+14% MoM" />
        <Kpi icon={MousePointerClick} label="Blended CPL" value={fmt(blendedCpl)} delta="-9% MoM" />
        <Kpi icon={Target} label="Weighted ROI" value={`${weightedRoi}×`} delta="+0.4× MoM" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-2xl border border-border/60 bg-card p-6">
          <h3 className="font-display text-2xl">Cost Trends</h3>
          <p className="text-xs text-muted-foreground">CPL and CPB across last 6 months</p>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={TREND}>
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
              <Bar dataKey="cpl" fill="oklch(0.78 0.18 158)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="rounded-2xl border border-border/60 bg-card p-6">
          <h3 className="flex items-center gap-2 font-display text-2xl">
            <Sparkles className="h-5 w-5 text-primary" /> AI Recommendations
          </h3>
          <div className="mt-4 space-y-3">
            {RECS.map((r) => (
              <div key={r.title} className="rounded-lg border border-border/60 bg-surface p-3">
                <div className="flex items-center justify-between text-[10px] uppercase tracking-wider">
                  <span className="text-primary">Impact {r.impact}</span>
                  <ArrowUpRight className="h-3 w-3 text-muted-foreground" />
                </div>
                <div className="mt-1 text-sm font-medium">{r.title}</div>
                <div className="mt-1 text-xs text-muted-foreground">{r.detail}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-border/60 bg-card">
        <div className="border-b border-border/60 p-5">
          <h3 className="font-display text-2xl">Campaign Performance</h3>
          <p className="text-xs text-muted-foreground">
            AI-ranked by ROI · scale, hold, or cut decisions auto-generated daily
          </p>
        </div>
        <div className="divide-y divide-border/60">
          {CAMPAIGNS.map((c) => (
            <div key={c.name} className="grid grid-cols-12 items-center gap-3 p-5 text-sm">
              <div className="col-span-12 md:col-span-4">
                <div className="font-medium">{c.name}</div>
                <div className="text-xs text-muted-foreground">₹{c.spend} L spend</div>
              </div>
              <Cell label="Leads" value={c.leads.toLocaleString()} />
              <Cell label="CPL" value={fmt(c.cpl)} />
              <Cell label="CPB" value={fmt(c.cpb)} />
              <Cell label="ROI" value={`${c.roi}×`} />
              <div className="col-span-12 md:col-span-2 text-right">
                <Status status={c.status} />
              </div>
            </div>
          ))}
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
}: {
  icon: typeof Megaphone;
  label: string;
  value: string;
  delta: string;
}) {
  const positive = delta.includes("+") || delta.includes("-9") || delta.includes("-6");
  return (
    <div className="rounded-2xl border border-border/60 bg-card p-5">
      <div className="flex items-center justify-between text-muted-foreground">
        <span className="text-xs uppercase tracking-wider">{label}</span>
        <Icon className="h-4 w-4" />
      </div>
      <div className="mt-3 font-display text-3xl">{value}</div>
      <div className={`mt-1 flex items-center gap-1 text-xs ${positive ? "text-primary" : "text-destructive"}`}>
        {positive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
        {delta}
      </div>
    </div>
  );
}

function Cell({ label, value }: { label: string; value: string }) {
  return (
    <div className="col-span-6 md:col-span-1.5 md:col-auto">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="text-sm">{value}</div>
    </div>
  );
}

function Status({ status }: { status: string }) {
  const map: Record<string, string> = {
    scale: "border-primary/40 bg-primary/10 text-primary",
    hold: "border-amber-400/40 bg-amber-400/10 text-amber-400",
    cut: "border-destructive/40 bg-destructive/10 text-destructive",
  };
  return (
    <span
      className={`rounded-full border px-2.5 py-0.5 text-[10px] uppercase tracking-wider ${map[status]}`}
    >
      {status}
    </span>
  );
}