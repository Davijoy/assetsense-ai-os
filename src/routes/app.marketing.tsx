import { createFileRoute, redirect } from "@tanstack/react-router";
import { isRouteAuthorized } from "@/lib/route-roles";
import { useState } from "react";
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
  ChevronRight,
  Filter,
  CheckCircle2,
  Calendar,
  X,
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
import { INITIAL_LEADS, type LiveLead } from "@/lib/crm.functions";
import { LeadDetailDrawer } from "@/components/crm/LeadDetailDrawer";

export const Route = createFileRoute("/app/marketing")({
  head: () => ({ meta: [{ title: "Marketing Intelligence — Sentinel KIE" }] }),
  beforeLoad: async ({ context, location }) => {
    const roles = (context as any)?.user?.roles ?? (context as any)?.fort?.role?.appRoles ?? [];
    if (roles.length > 0 && !isRouteAuthorized(roles, location.pathname)) {
      throw redirect({ to: "/fort" });
    }
  },
  component: Marketing,
});

interface CampaignItem {
  id: string;
  name: string;
  channel: string;
  project: string;
  spend: number; // in Lakhs
  leadsGenerated: number;
  qualified: number;
  active: number;
  siteVisits: number;
  converted: number;
  cpl: number;
  cpb: number;
  roi: number;
  status: "scale" | "hold" | "cut";
}

const CAMPAIGNS: CampaignItem[] = [
  {
    id: "camp-1",
    name: "Meta · Whitefield Premium",
    channel: "Meta Ads",
    project: "Lodha Belmondo",
    spend: 18.4,
    leadsGenerated: 612,
    qualified: 480,
    active: 320,
    siteVisits: 142,
    converted: 48,
    cpl: 3008,
    cpb: 38333,
    roi: 4.2,
    status: "scale",
  },
  {
    id: "camp-2",
    name: "Google · Lodha Park",
    channel: "Google",
    project: "Oberoi Sky City",
    spend: 22.1,
    leadsGenerated: 488,
    qualified: 360,
    active: 240,
    siteVisits: 98,
    converted: 32,
    cpl: 4528,
    cpb: 69062,
    roi: 3.1,
    status: "hold",
  },
  {
    id: "camp-3",
    name: "Meta · Prestige Falcon",
    channel: "Meta Ads",
    project: "Prestige Lakeside",
    spend: 14.8,
    leadsGenerated: 712,
    qualified: 590,
    active: 410,
    siteVisits: 188,
    converted: 64,
    cpl: 2079,
    cpb: 23125,
    roi: 5.1,
    status: "scale",
  },
  {
    id: "camp-4",
    name: "Google · Hiranandani",
    channel: "Google",
    project: "Oberoi Sky City",
    spend: 9.6,
    leadsGenerated: 198,
    qualified: 110,
    active: 74,
    siteVisits: 28,
    converted: 8,
    cpl: 4848,
    cpb: 120000,
    roi: 1.4,
    status: "cut",
  },
  {
    id: "camp-5",
    name: "YouTube · Brand",
    channel: "Website",
    project: "Prestige Lakeside",
    spend: 6.2,
    leadsGenerated: 142,
    qualified: 88,
    active: 52,
    siteVisits: 22,
    converted: 6,
    cpl: 4366,
    cpb: 103333,
    roi: 1.9,
    status: "hold",
  },
  {
    id: "camp-6",
    name: "Meta · NRI Retargeting",
    channel: "Meta Ads",
    project: "Lodha Belmondo",
    spend: 11.3,
    leadsGenerated: 287,
    qualified: 240,
    active: 175,
    siteVisits: 84,
    converted: 36,
    cpl: 3937,
    cpb: 31388,
    roi: 4.7,
    status: "scale",
  },
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
    detail: "NRI cohort closing at 4.7× ROI with ₹31K CPB. Diminishing returns kick in only above ₹16 L/mo.",
  },
  {
    impact: 71,
    title: "Pause YouTube brand spend for 30 days",
    detail: "1.9× ROI, low attribution overlap with paid search. Test reactivation with creative refresh.",
  },
];

const fmt = (n: number) => `₹${n.toLocaleString("en-IN")}`;

function Marketing() {
  const [selectedCampaign, setSelectedCampaign] = useState<CampaignItem | null>(null);
  const [selectedLead, setSelectedLead] = useState<LiveLead | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const totalSpend = CAMPAIGNS.reduce((s, c) => s + c.spend, 0);
  const totalLeadsGenerated = CAMPAIGNS.reduce((s, c) => s + c.leadsGenerated, 0);
  const totalQualified = CAMPAIGNS.reduce((s, c) => s + c.qualified, 0);
  const totalActive = CAMPAIGNS.reduce((s, c) => s + c.active, 0);
  const totalSiteVisits = CAMPAIGNS.reduce((s, c) => s + c.siteVisits, 0);
  const totalConverted = CAMPAIGNS.reduce((s, c) => s + c.converted, 0);

  const blendedCpl = Math.round((totalSpend * 100_000) / totalLeadsGenerated);
  const weightedRoi = (
    CAMPAIGNS.reduce((s, c) => s + c.roi * c.spend, 0) / totalSpend
  ).toFixed(2);

  // Overall Funnel Ratios
  const genToQualPct = ((totalQualified / totalLeadsGenerated) * 100).toFixed(1);
  const qualToActivePct = ((totalActive / totalQualified) * 100).toFixed(1);
  const activeToVisitPct = ((totalSiteVisits / totalActive) * 100).toFixed(1);
  const visitToConvPct = ((totalConverted / totalSiteVisits) * 100).toFixed(1);
  const overallConversionPct = ((totalConverted / totalLeadsGenerated) * 100).toFixed(1);

  const attributedLeads = selectedCampaign
    ? INITIAL_LEADS.filter(
        (l) =>
          l.source.toLowerCase().includes(selectedCampaign.channel.toLowerCase()) ||
          (l.project && l.project.toLowerCase().includes(selectedCampaign.project.toLowerCase()))
      )
    : [];

  return (
    <div className="space-y-8">
      <header>
        <div className="inline-flex items-center gap-2 rounded-full border border-gold/40 bg-gold/5 px-3 py-1 text-xs text-gold">
          <Megaphone className="h-3 w-3" /> Marketing Intelligence · Attribution & Funnel
        </div>
        <h1 className="mt-3 font-display text-4xl">
          Spend smarter. <span className="text-gradient-emerald italic">Convert faster.</span>
        </h1>
        <p className="text-sm text-muted-foreground">
          Continuous multi-touch attribution, campaign conversion ratios, and live funnel flow across Meta, Google, and portals.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Kpi
          icon={IndianRupee}
          label="Total Spend (MTD)"
          value={`₹${totalSpend.toFixed(1)} L`}
          delta="-6% vs plan"
          onClick={() => setSelectedCampaign(CAMPAIGNS[0])}
        />
        <Kpi
          icon={Users}
          label="Total Leads"
          value={totalLeadsGenerated.toLocaleString()}
          delta="+14% MoM"
          onClick={() => setSelectedCampaign(CAMPAIGNS[2])}
        />
        <Kpi
          icon={MousePointerClick}
          label="Blended CPL"
          value={fmt(blendedCpl)}
          delta="-9% MoM"
          onClick={() => setSelectedCampaign(CAMPAIGNS[2])}
        />
        <Kpi
          icon={Target}
          label="Weighted ROI"
          value={`${weightedRoi}×`}
          delta="+0.4× MoM"
          onClick={() => setSelectedCampaign(CAMPAIGNS[2])}
        />
      </div>

      {/* STRUCTURED CAMPAIGN FUNNEL & CONVERSION RATIO */}
      <div className="rounded-2xl border border-border/80 bg-card p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
          <div>
            <h3 className="font-display text-2xl">Campaign Acquisition Funnel</h3>
            <p className="text-xs text-muted-foreground">
              End-to-end buyer flow: Campaign Ingestion → Qualified → Active → Site Visits → Converted Bookings
            </p>
          </div>
          <div className="rounded-xl bg-primary/10 border border-primary/30 px-3 py-1.5 text-xs font-bold text-primary">
            Overall Conversion Ratio: {overallConversionPct}%
          </div>
        </div>

        {/* Funnel Flow Steps */}
        <div className="grid grid-cols-1 gap-3 md:grid-cols-5 pt-2">
          {/* Step 1: Leads Generated */}
          <div className="rounded-xl border border-sky-500/30 bg-sky-950/20 p-4 relative space-y-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-sky-400 block">
              1. Inbound Leads
            </span>
            <div className="font-display text-2xl font-bold text-white">
              {totalLeadsGenerated.toLocaleString()}
            </div>
            <div className="text-[11px] text-muted-foreground">Top-of-funnel intake</div>
            <div className="pt-2 border-t border-sky-500/20 text-[10px] font-bold text-sky-300">
              Pass-through: 100%
            </div>
          </div>

          {/* Step 2: Qualified Leads */}
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-4 relative space-y-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 block">
              2. AI Qualified
            </span>
            <div className="font-display text-2xl font-bold text-emerald-200">
              {totalQualified.toLocaleString()}
            </div>
            <div className="text-[11px] text-muted-foreground">Intent score ≥ 75</div>
            <div className="pt-2 border-t border-emerald-500/20 text-[10px] font-bold text-emerald-300">
              Ratio: {genToQualPct}%
            </div>
          </div>

          {/* Step 3: Active Working Pipeline */}
          <div className="rounded-xl border border-amber-500/30 bg-amber-950/20 p-4 relative space-y-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 block">
              3. Active Pipeline
            </span>
            <div className="font-display text-2xl font-bold text-amber-200">
              {totalActive.toLocaleString()}
            </div>
            <div className="text-[11px] text-muted-foreground">Sales Rep Contacted</div>
            <div className="pt-2 border-t border-amber-500/20 text-[10px] font-bold text-amber-300">
              Ratio: {qualToActivePct}%
            </div>
          </div>

          {/* Step 4: Site Visits */}
          <div className="rounded-xl border border-violet-500/30 bg-violet-950/20 p-4 relative space-y-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-violet-400 block">
              4. Site Visits
            </span>
            <div className="font-display text-2xl font-bold text-violet-200">
              {totalSiteVisits.toLocaleString()}
            </div>
            <div className="text-[11px] text-muted-foreground">Physical Walkthrough</div>
            <div className="pt-2 border-t border-violet-500/20 text-[10px] font-bold text-violet-300">
              Ratio: {activeToVisitPct}%
            </div>
          </div>

          {/* Step 5: Converted Bookings */}
          <div className="rounded-xl border border-[#D4AF37]/40 bg-[#D4AF37]/10 p-4 relative space-y-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#D4AF37] block">
              5. Converted
            </span>
            <div className="font-display text-2xl font-bold text-[#E5C368]">
              {totalConverted.toLocaleString()}
            </div>
            <div className="text-[11px] text-muted-foreground">Unit Registration</div>
            <div className="pt-2 border-t border-[#D4AF37]/30 text-[10px] font-bold text-[#E5C368]">
              Visit Conv: {visitToConvPct}%
            </div>
          </div>
        </div>
      </div>

      {/* Cost Trends & AI Recs */}
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
                  <span className="text-primary font-bold">Impact {r.impact}</span>
                  <ArrowUpRight className="h-3 w-3 text-muted-foreground" />
                </div>
                <div className="mt-1 text-sm font-medium">{r.title}</div>
                <div className="mt-1 text-xs text-muted-foreground">{r.detail}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Campaign Performance Table with Drilldown */}
      <div className="rounded-2xl border border-border/60 bg-card">
        <div className="border-b border-border/60 p-5 flex items-center justify-between">
          <div>
            <h3 className="font-display text-2xl">Campaign Performance</h3>
            <p className="text-xs text-muted-foreground">
              AI-ranked by ROI · click any campaign to drill into attributed leads and conversion rates
            </p>
          </div>
        </div>
        <div className="divide-y divide-border/60">
          {CAMPAIGNS.map((c) => {
            const campConversionRate = ((c.converted / c.leadsGenerated) * 100).toFixed(1);
            return (
              <div
                key={c.name}
                onClick={() => setSelectedCampaign(c)}
                className="grid grid-cols-12 items-center gap-3 p-5 text-sm cursor-pointer hover:bg-surface-elevated/40 transition-colors"
              >
                <div className="col-span-12 md:col-span-4">
                  <div className="font-medium text-foreground">{c.name}</div>
                  <div className="text-xs text-muted-foreground">₹{c.spend} L spend · {c.project}</div>
                </div>
                <Cell label="Leads" value={c.leadsGenerated.toLocaleString()} />
                <Cell label="Visits" value={c.siteVisits.toLocaleString()} />
                <Cell label="Conv. %" value={`${campConversionRate}%`} />
                <Cell label="CPL" value={fmt(c.cpl)} />
                <Cell label="ROI" value={`${c.roi}×`} />
                <div className="col-span-12 md:col-span-2 flex items-center justify-end gap-2">
                  <Status status={c.status} />
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Campaign Leads Drilldown Modal */}
      {selectedCampaign && (
        <div
          onClick={() => setSelectedCampaign(null)}
          className="fixed inset-0 z-60 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-150"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-3xl rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-4 max-h-[85vh] flex flex-col animate-in zoom-in-95 duration-150"
          >
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <h3 className="text-lg font-bold text-foreground">{selectedCampaign.name}</h3>
                <p className="text-xs text-muted-foreground">
                  Channel: {selectedCampaign.channel} · Project: {selectedCampaign.project} · Spend: ₹{selectedCampaign.spend} L
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedCampaign(null)}
                className="rounded-lg p-1.5 text-muted-foreground hover:bg-surface-elevated hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Campaign Metrics Strip */}
            <div className="grid grid-cols-4 gap-2 text-xs">
              <div className="rounded-xl border border-border bg-surface p-2.5">
                <span className="text-[10px] uppercase font-bold text-muted-foreground block">Leads</span>
                <span className="font-bold text-foreground text-sm">{selectedCampaign.leadsGenerated}</span>
              </div>
              <div className="rounded-xl border border-border bg-surface p-2.5">
                <span className="text-[10px] uppercase font-bold text-muted-foreground block">Site Visits</span>
                <span className="font-bold text-foreground text-sm">{selectedCampaign.siteVisits}</span>
              </div>
              <div className="rounded-xl border border-border bg-surface p-2.5">
                <span className="text-[10px] uppercase font-bold text-muted-foreground block">Converted</span>
                <span className="font-bold text-foreground text-sm">{selectedCampaign.converted}</span>
              </div>
              <div className="rounded-xl border border-border bg-surface p-2.5">
                <span className="text-[10px] uppercase font-bold text-muted-foreground block">Conversion Rate</span>
                <span className="font-bold text-primary text-sm">
                  {((selectedCampaign.converted / selectedCampaign.leadsGenerated) * 100).toFixed(1)}%
                </span>
              </div>
            </div>

            {/* Attributed Leads Table */}
            <div className="flex-1 overflow-y-auto border border-border rounded-xl">
              <table className="w-full text-left text-xs">
                <thead className="sticky top-0 bg-surface border-b border-border text-[10px] uppercase font-bold text-muted-foreground">
                  <tr>
                    <th className="p-3">Attributed Lead</th>
                    <th className="p-3">Budget</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Score</th>
                    <th className="p-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {attributedLeads.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-6 text-center text-muted-foreground">
                        No individual lead records currently mapped to this campaign tag.
                      </td>
                    </tr>
                  ) : (
                    attributedLeads.map((al) => (
                      <tr
                        key={al.id}
                        onClick={() => {
                          setSelectedLead(al);
                          setDrawerOpen(true);
                          setSelectedCampaign(null);
                        }}
                        className="cursor-pointer hover:bg-surface-elevated/50 transition-colors"
                      >
                        <td className="p-3 font-semibold text-foreground">
                          {al.name}
                          <span className="block text-[10px] text-muted-foreground">{al.phone || al.email}</span>
                        </td>
                        <td className="p-3 font-medium text-foreground">{al.budget}</td>
                        <td className="p-3">
                          <span className="rounded-full bg-surface px-2 py-0.5 text-[10px] font-bold border border-border">
                            {al.stage}
                          </span>
                        </td>
                        <td className="p-3 font-semibold text-primary">{al.score}/100</td>
                        <td className="p-3 text-right">
                          <span className="text-primary font-bold text-[11px] flex items-center justify-end gap-1 hover:underline">
                            Inspect Lead <ChevronRight className="h-3.5 w-3.5" />
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between text-xs text-muted-foreground pt-2">
              <span>Showing sample matched leads for {selectedCampaign.name}</span>
              <button
                type="button"
                onClick={() => setSelectedCampaign(null)}
                className="rounded-lg border border-border px-3 py-1.5 font-semibold text-foreground hover:bg-surface-elevated"
              >
                Close Drilldown
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lead Detail Drawer */}
      <LeadDetailDrawer
        lead={selectedLead}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
      />
    </div>
  );
}

function Kpi({
  icon: Icon,
  label,
  value,
  delta,
  onClick,
}: {
  icon: typeof Megaphone;
  label: string;
  value: string;
  delta: string;
  onClick?: () => void;
}) {
  const positive = delta.includes("+") || delta.includes("-9") || delta.includes("-6");
  return (
    <div
      onClick={onClick}
      className={`rounded-2xl border border-border/60 bg-card p-5 transition-all ${
        onClick ? "cursor-pointer hover:border-primary/60 hover:-translate-y-0.5 hover:shadow-sm" : ""
      }`}
    >
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
