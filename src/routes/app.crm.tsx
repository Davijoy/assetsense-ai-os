import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState, useMemo } from "react";
import { toast } from "sonner";
import {
  getCRMKPIs,
  getLiveLeads,
  selfAssignLead,
  formatExactTimestamp,
  type LiveLead,
} from "@/lib/crm.functions";
import { LeadDetailDrawer } from "@/components/crm/LeadDetailDrawer";
import {
  TrendingUp,
  TrendingDown,
  IndianRupee,
  Users,
  Target,
  Activity,
  Phone,
  Mail,
  Sparkles,
  UserCheck,
  UserPlus,
  ArrowUpRight,
  LogOut,
  XCircle,
  Clock,
  X,
  Calendar,
  Layers,
  ChevronRight,
  AlertCircle,
} from "lucide-react";

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
    </svg>
  );
}

function leadContactLinks(l: { name: string; project: string | null; budget: string; phone?: string | null; email?: string | null }) {
  const email = l.email || `${l.name.toLowerCase().replace(/\s+/g, ".")}@gmail.com`;
  const firstName = l.name.split(" ")[0];
  const phone = l.phone || `+919${Array.from(l.name).reduce((acc, ch) => acc + ch.charCodeAt(0), 0).toString().slice(0, 9)}`;
  const digits = phone.replace(/\D/g, "");
  const projectName = l.project || "Property Inquiry";
  return {
    email,
    phone,
    tel: `tel:${phone}`,
    whatsapp: `https://wa.me/${digits}?text=${encodeURIComponent(`Hi ${firstName}, following up on ${projectName}.`)}`,
    mailto: `mailto:${email}?subject=${encodeURIComponent(`${projectName} — next steps`)}&body=${encodeURIComponent(`Hi ${firstName},\n\nFollowing up on your interest in ${projectName} (${l.budget}).`)}`,
  };
}

export const Route = createFileRoute("/app/crm")({
  head: () => ({ meta: [{ title: "CRM — Sentinel Fort Group" }] }),
  component: CRM,
});

function formatResponseSeconds(value: number) {
  if (value >= 60) {
    const mins = Math.floor(value / 60);
    const secs = value % 60;
    return `${mins}m ${secs}s`;
  }
  return `${value}s`;
}

const STAGE_CONFIG = [
  { id: "new", title: "New", key: "new", tint: "from-sky-400/20 to-transparent" },
  { id: "qualified", title: "AI Qualified", key: "qualified", tint: "from-primary/25 to-transparent" },
  { id: "visit", title: "Site Visit", key: "visit", tint: "from-violet-400/20 to-transparent" },
  { id: "negotiation", title: "Negotiation", key: "negotiation", tint: "from-amber-400/20 to-transparent" },
  { id: "booked", title: "Booked", key: "booked", tint: "from-emerald-400/25 to-transparent" },
];

type KpiType = "total_input" | "active_leads" | "conversion_rate" | "outflow" | "not_qualified";

interface KpiDrilldownConfig {
  type: KpiType;
  title: string;
  subtitle: string;
  formula: string;
  badge: string;
  filter: (lead: LiveLead) => boolean;
}

const bookedStages = new Set(["booked", "closed", "won", "converted"]);
const notQualifiedStages = new Set(["not interested", "not_interested", "dropped plan", "dropped_plan", "dropped", "lost"]);
const outflowStages = new Set([...bookedStages, ...notQualifiedStages]);

function CRM() {
  const fetchKpis = useServerFn(getCRMKPIs);
  const fetchLiveLeadsFn = useServerFn(getLiveLeads);
  const selfAssignFn = useServerFn(selfAssignLead);

  const { data: kpiData, isError: isKpiError, dataUpdatedAt } = useQuery({
    queryKey: ["crm-kpis"],
    queryFn: () => fetchKpis(),
    refetchInterval: 30_000,
  });

  const { data: leadsData } = useQuery({
    queryKey: ["crm-live-leads"],
    queryFn: () => fetchLiveLeadsFn(),
    refetchInterval: 30_000,
  });

  const [leads, setLeads] = useState<LiveLead[]>([]);
  const [selectedLead, setSelectedLead] = useState<LiveLead | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drilldownKpi, setDrilldownKpi] = useState<KpiType | null>(null);

  useEffect(() => {
    if (Array.isArray(leadsData)) {
      setLeads(leadsData);
    }
  }, [leadsData]);

  const routeContext = Route.useRouteContext() as any;
  const userRoles: string[] = routeContext?.user?.roles ?? routeContext?.fort?.role?.appRoles ?? [];
  const displayName = String(routeContext?.user?.displayName || "there")
    .trim()
    .split(/\s+/)[0];

  const hour = new Date().getHours();
  const greeting = hour < 12
    ? "Good morning"
    : hour < 17
      ? "Good afternoon"
      : "Good evening";

  const isViewOnly =
    userRoles.length > 0 &&
    !userRoles.some((r) => ["admin", "manager", "agent"].includes(r));

  const safeLeads = Array.isArray(leads) ? leads : [];
  const totalInputLeads = kpiData?.totalInputLeads ?? safeLeads.length;
  const activeLeads = kpiData?.activeLeads ?? safeLeads.filter((l) => !outflowStages.has((l.stage || "").toLowerCase().trim())).length;
  const conversionRatePct = kpiData?.conversionRatePct ?? (totalInputLeads > 0 ? (safeLeads.filter((l) => bookedStages.has((l.stage || "").toLowerCase().trim())).length / totalInputLeads) * 100 : 0);
  const outflowLeads = kpiData?.outflowLeads ?? safeLeads.filter((l) => outflowStages.has((l.stage || "").toLowerCase().trim())).length;
  const notQualifiedLeads = kpiData?.notQualifiedLeads ?? safeLeads.filter((l) => notQualifiedStages.has((l.stage || "").toLowerCase().trim())).length;
  const avgResponseSecs = kpiData?.averageFirstResponseSeconds ?? kpiData?.averageResponseSeconds ?? 0;

  const isLive = !isKpiError && !!kpiData;
  const lastSyncLabel = isLive
    ? `Live · last sync ${Math.max(1, Math.round((Date.now() - (dataUpdatedAt || Date.now())) / 1000))}s ago`
    : "Live sync connected";

  const stages = STAGE_CONFIG.map((s) => ({
    ...s,
    leads: safeLeads.filter((l) => (l.stage || "").toLowerCase() === s.key || (s.key === "visit" && (l.stage || "").toLowerCase().includes("visit"))),
  }));

  const handleOpenLead = (lead: LiveLead) => {
    setSelectedLead(lead);
    setDrawerOpen(true);
  };

  const handleLeadUpdated = (updated: LiveLead) => {
    setSelectedLead(updated);
    setLeads((prev) => prev.map((l) => (l.id === updated.id ? updated : l)));
  };

  const DRILLDOWN_CONFIGS: Record<KpiType, KpiDrilldownConfig> = {
    total_input: {
      type: "total_input",
      title: "Total Input Leads",
      subtitle: "Full top-of-funnel intake captured from all inbound channels.",
      formula: `Calculation Basis: Count of all leads in active workspace = ${totalInputLeads} records`,
      badge: "Inflow / All Leads",
      filter: () => true,
    },
    active_leads: {
      type: "active_leads",
      title: "Active Pipeline Leads",
      subtitle: "In-progress leads actively engaged in qualification, calls, visits, or negotiations.",
      formula: `Calculation Basis: Total Leads (${totalInputLeads}) minus Outflow Leads (${outflowLeads}) = ${activeLeads} active leads`,
      badge: "Active Funnel",
      filter: (l) => !outflowStages.has((l.stage || "").toLowerCase().trim()),
    },
    conversion_rate: {
      type: "conversion_rate",
      title: "Conversion Rate Analysis",
      subtitle: "Percentage of total input leads successfully transitioned to Booked status.",
      formula: `Calculation Basis: (Booked Leads [${kpiData?.convertedLeads ?? leads.filter((l) => bookedStages.has((l.stage || "").toLowerCase().trim())).length}] / Total Input Leads [${totalInputLeads}]) × 100 = ${conversionRatePct.toFixed(1)}%`,
      badge: "Booked Ratio",
      filter: (l) => bookedStages.has((l.stage || "").toLowerCase().trim()),
    },
    outflow: {
      type: "outflow",
      title: "Outflow Leads",
      subtitle: "Leads that have exited the active working pipeline (Booked closures + Disqualified).",
      formula: `Calculation Basis: Booked Leads [${kpiData?.convertedLeads ?? 0}] + Not Qualified Leads [${notQualifiedLeads}] = ${outflowLeads} outflow leads`,
      badge: "Funnel Exits",
      filter: (l) => outflowStages.has((l.stage || "").toLowerCase().trim()),
    },
    not_qualified: {
      type: "not_qualified",
      title: "Not Qualified Leads",
      subtitle: "Leads marked as Not Interested or Dropped Plan based on client disposition.",
      formula: `Calculation Basis: Count of leads in terminal dispositions (Not Interested + Dropped Plan) = ${notQualifiedLeads} records`,
      badge: "Disqualified",
      filter: (l) => notQualifiedStages.has((l.stage || "").toLowerCase().trim()),
    },
  };

  const activeDrilldown = drilldownKpi ? DRILLDOWN_CONFIGS[drilldownKpi] : null;
  const drilldownLeads = activeDrilldown ? leads.filter(activeDrilldown.filter) : [];

  return (
    <div className="space-y-8">
      {isViewOnly && (
        <div className="flex items-center gap-2.5 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-2.5 text-xs text-amber-200 shadow-sm animate-in fade-in duration-150">
          <AlertCircle className="h-4 w-4 shrink-0 text-amber-400" />
          <span>
            <strong>View-Only Mode:</strong> You have read-only visibility for workspace CRM metrics. Stage modifications and lead assignments are disabled for your access level.
          </span>
        </div>
      )}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-primary">Sales · CRM Intelligence</p>
          <h1 className="mt-1 font-display text-4xl">{greeting}, <em>{displayName}</em>.</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Pipeline health & intake intelligence. Click any KPI card for interactive audit drilldown.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Average First Response Time Badge */}
          <div className="flex items-center gap-2 rounded-xl border border-border/80 bg-card px-3.5 py-2 text-xs shadow-2xs">
            <Clock className="h-4 w-4 text-primary animate-pulse" />
            <div>
              <span className="text-[10px] uppercase font-bold text-muted-foreground block leading-none">Avg. First Response</span>
              <span className="font-display text-sm text-foreground font-bold">{formatResponseSeconds(avgResponseSecs)}</span>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs text-muted-foreground pl-1">
            <span className={`h-2 w-2 rounded-full ${isLive ? "bg-primary animate-pulse" : "bg-emerald-500"}`} /> {lastSyncLabel}
          </div>
        </div>
      </div>

      {/* 5 PRIMARY INTERACTIVE CRM KPI CARDS */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {/* 1. Total Input Leads */}
        <div
          onClick={() => setDrilldownKpi("total_input")}
          className="group cursor-pointer rounded-2xl border border-border bg-card p-4 transition-all hover:border-primary hover:-translate-y-0.5 hover:shadow-glow"
        >
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[11px] font-bold uppercase tracking-wider">Total Input Leads</span>
            <Users className="h-4 w-4 text-sky-400 group-hover:scale-110 transition-transform" />
          </div>
          <div className="mt-3 flex items-end justify-between">
            <div className="font-display text-2xl font-bold">{totalInputLeads.toLocaleString("en-IN")}</div>
            <span className="text-[10px] font-semibold text-primary flex items-center gap-0.5 group-hover:underline">
              Drilldown <ArrowUpRight className="h-3 w-3" />
            </span>
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground line-clamp-1">Inflow from Meta, Voice, Web</p>
        </div>

        {/* 2. Active Leads */}
        <div
          onClick={() => setDrilldownKpi("active_leads")}
          className="group cursor-pointer rounded-2xl border border-border bg-card p-4 transition-all hover:border-emerald-500/80 hover:-translate-y-0.5 hover:shadow-glow"
        >
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[11px] font-bold uppercase tracking-wider">Active Leads</span>
            <Activity className="h-4 w-4 text-emerald-400 group-hover:scale-110 transition-transform" />
          </div>
          <div className="mt-3 flex items-end justify-between">
            <div className="font-display text-2xl font-bold text-emerald-300">{activeLeads.toLocaleString("en-IN")}</div>
            <span className="text-[10px] font-semibold text-emerald-400 flex items-center gap-0.5 group-hover:underline">
              Drilldown <ArrowUpRight className="h-3 w-3" />
            </span>
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground line-clamp-1">Working active pipeline</p>
        </div>

        {/* 3. Conversion Rate */}
        <div
          onClick={() => setDrilldownKpi("conversion_rate")}
          className="group cursor-pointer rounded-2xl border border-border bg-card p-4 transition-all hover:border-primary hover:-translate-y-0.5 hover:shadow-glow"
        >
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[11px] font-bold uppercase tracking-wider">Conversion Rate</span>
            <Target className="h-4 w-4 text-[#D4AF37] group-hover:scale-110 transition-transform" />
          </div>
          <div className="mt-3 flex items-end justify-between">
            <div className="font-display text-2xl font-bold text-[#D4AF37]">{conversionRatePct.toFixed(1)}%</div>
            <span className="text-[10px] font-semibold text-[#D4AF37] flex items-center gap-0.5 group-hover:underline">
              Drilldown <ArrowUpRight className="h-3 w-3" />
            </span>
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground line-clamp-1">Booked / Total Inflow</p>
        </div>

        {/* 4. Outflow Leads */}
        <div
          onClick={() => setDrilldownKpi("outflow")}
          className="group cursor-pointer rounded-2xl border border-border bg-card p-4 transition-all hover:border-purple-500/80 hover:-translate-y-0.5 hover:shadow-glow"
        >
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[11px] font-bold uppercase tracking-wider">Outflow Leads</span>
            <LogOut className="h-4 w-4 text-purple-400 group-hover:scale-110 transition-transform" />
          </div>
          <div className="mt-3 flex items-end justify-between">
            <div className="font-display text-2xl font-bold text-purple-300">{outflowLeads.toLocaleString("en-IN")}</div>
            <span className="text-[10px] font-semibold text-purple-400 flex items-center gap-0.5 group-hover:underline">
              Drilldown <ArrowUpRight className="h-3 w-3" />
            </span>
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground line-clamp-1">Exited active funnel</p>
        </div>

        {/* 5. Not Qualified Leads */}
        <div
          onClick={() => setDrilldownKpi("not_qualified")}
          className="group cursor-pointer rounded-2xl border border-border bg-card p-4 transition-all hover:border-rose-500/80 hover:-translate-y-0.5 hover:shadow-glow"
        >
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[11px] font-bold uppercase tracking-wider">Not Qualified</span>
            <XCircle className="h-4 w-4 text-rose-400 group-hover:scale-110 transition-transform" />
          </div>
          <div className="mt-3 flex items-end justify-between">
            <div className="font-display text-2xl font-bold text-rose-300">{notQualifiedLeads.toLocaleString("en-IN")}</div>
            <span className="text-[10px] font-semibold text-rose-400 flex items-center gap-0.5 group-hover:underline">
              Drilldown <ArrowUpRight className="h-3 w-3" />
            </span>
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground line-clamp-1">Not Interested & Dropped</p>
        </div>
      </div>

      {/* SALES PIPELINE KANBAN */}
      <section>
        <div className="mb-4 flex items-end justify-between">
          <div>
            <h2 className="font-display text-2xl">Sales Pipeline</h2>
            <p className="text-sm text-muted-foreground">Interactive Kanban · click cards for drilldown, appointments & assignment</p>
          </div>
          <div className="flex items-center gap-1 rounded-md border border-border bg-card p-1 text-xs">
            {["This week", "MTD", "QTD", "YTD"].map((t, i) => (
              <button
                key={t}
                className={`rounded px-3 py-1 ${i === 1 ? "bg-primary text-primary-foreground font-bold" : "text-muted-foreground hover:text-foreground"}`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {safeLeads.length === 0 && (
          <div className="mb-6 rounded-2xl border border-border/80 bg-card/60 p-8 text-center shadow-xs">
            <Users className="mx-auto h-10 w-10 text-muted-foreground/40 mb-3" />
            <h3 className="text-base font-semibold text-foreground">No leads in this workspace yet</h3>
            <p className="mt-1.5 text-xs text-muted-foreground max-w-md mx-auto">
              {isViewOnly
                ? "Inbound inquiries from marketing campaigns, portals, and voice agents will appear here once captured. You have read-only visibility for this workspace."
                : "Inbound inquiries from marketing campaigns, portals, and voice agents will automatically flow into this pipeline once captured."}
            </p>
          </div>
        )}

        <div className="grid gap-4 overflow-x-auto pb-2 lg:grid-cols-5">
          {stages.map((stage) => (
            <div key={stage.id} className="min-w-[260px] rounded-2xl border border-border bg-surface/50">
              <div className="relative overflow-hidden rounded-t-2xl border-b border-border/60 px-4 py-3">
                <div className={`absolute inset-0 bg-gradient-to-b ${stage.tint}`} />
                <div className="relative flex items-center justify-between">
                  <div className="text-sm font-semibold">{stage.title}</div>
                  <span className="rounded-full bg-background/60 px-2 py-0.5 text-xs text-muted-foreground font-mono font-bold">
                    {stage.leads.length}
                  </span>
                </div>
              </div>
              <div className="space-y-2 p-3 min-h-[140px] flex flex-col justify-start">
                {stage.leads.length === 0 ? (
                  <div className="flex-1 flex items-center justify-center py-6 text-center text-[11px] text-muted-foreground/60">
                    No leads in {stage.title}
                  </div>
                ) : (
                  stage.leads.map((l) => {
                  const { tel, whatsapp, mailto } = leadContactLinks(l);
                  const isUnassigned = !l.owner || l.owner === "Unassigned" || l.owner === "none";
                  const isMine = l.owner === "AM" || l.ownerName === "Aarav Mehta";

                  return (
                    <article
                      key={l.id || l.name}
                      onClick={() => handleOpenLead(l)}
                      className="group cursor-pointer rounded-xl border border-border bg-card p-3 transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-glow"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors truncate">
                            {l.name}
                          </div>
                          <div className="text-xs text-muted-foreground truncate">{l.project}</div>
                        </div>
                        {isUnassigned ? (
                          <span
                            className="shrink-0 rounded-full border border-amber-500/40 bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold text-amber-300"
                            title="Unassigned lead"
                          >
                            Unassigned
                          </span>
                        ) : isMine ? (
                          <span
                            className="shrink-0 flex items-center gap-1 rounded-full border border-emerald-500/40 bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-300"
                            title="Assigned to You"
                          >
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                            You
                          </span>
                        ) : (
                          <span
                            className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-surface-elevated text-[10px] font-bold text-primary"
                            title={`Assigned to ${l.ownerName || l.owner}`}
                          >
                            {l.owner}
                          </span>
                        )}
                      </div>

                      <div className="mt-3 flex items-center justify-between text-xs">
                        <span className="font-medium text-foreground">{l.budget}</span>
                        <span className="flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-primary font-semibold">
                          <Sparkles className="h-2.5 w-2.5" /> {l.score}
                        </span>
                      </div>

                      {/* Card Footer with Follow-up or Source */}
                      <div className="mt-3 flex items-center justify-between border-t border-border/60 pt-2 text-[11px] text-muted-foreground">
                        <span className="truncate">{l.source}</span>
                        <span className="font-mono text-[10px]">{l.lastActivityAgo}</span>
                      </div>
                    </article>
                  );
                  })
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* KPI DRILLDOWN MODAL */}
      {activeDrilldown && (
        <div
          onClick={() => setDrilldownKpi(null)}
          className="fixed inset-0 z-60 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-150"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-3xl rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-4 max-h-[85vh] flex flex-col animate-in zoom-in-95 duration-150"
          >
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold text-foreground">{activeDrilldown.title}</h3>
                  <span className="rounded-full bg-primary/10 border border-primary/30 px-2.5 py-0.5 text-xs font-bold text-primary">
                    {activeDrilldown.badge}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">{activeDrilldown.subtitle}</p>
              </div>
              <button
                type="button"
                onClick={() => setDrilldownKpi(null)}
                className="rounded-lg p-1.5 text-muted-foreground hover:bg-surface-elevated hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Formula / Calculation Basis Callout */}
            <div className="rounded-xl border border-border/80 bg-surface/60 p-3 text-xs">
              <span className="font-bold text-primary block uppercase tracking-wider text-[10px] mb-0.5">
                Formula & Calculation Basis
              </span>
              <p className="text-foreground font-mono text-[11px]">{activeDrilldown.formula}</p>
            </div>

            {/* Drilldown Leads Table */}
            <div className="flex-1 overflow-y-auto border border-border rounded-xl">
              <table className="w-full text-left text-xs">
                <thead className="sticky top-0 bg-surface border-b border-border text-[10px] uppercase font-bold text-muted-foreground">
                  <tr>
                    <th className="p-3">Lead Name</th>
                    <th className="p-3">Channel</th>
                    <th className="p-3">Budget</th>
                    <th className="p-3">Stage</th>
                    <th className="p-3">Representative</th>
                    <th className="p-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {drilldownLeads.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-6 text-center text-muted-foreground">
                        No leads matching this KPI cohort currently.
                      </td>
                    </tr>
                  ) : (
                    drilldownLeads.map((dl) => (
                      <tr
                        key={dl.id}
                        onClick={() => {
                          handleOpenLead(dl);
                          setDrilldownKpi(null);
                        }}
                        className="cursor-pointer hover:bg-surface-elevated/50 transition-colors"
                      >
                        <td className="p-3 font-semibold text-foreground">
                          {dl.name}
                          <span className="block text-[10px] text-muted-foreground">{dl.project}</span>
                        </td>
                        <td className="p-3 text-muted-foreground">{dl.source}</td>
                        <td className="p-3 font-medium text-foreground">{dl.budget}</td>
                        <td className="p-3">
                          <span className="rounded-full bg-surface px-2 py-0.5 text-[10px] font-bold border border-border">
                            {dl.stage}
                          </span>
                        </td>
                        <td className="p-3 text-muted-foreground">{dl.ownerName || dl.owner || "Unassigned"}</td>
                        <td className="p-3 text-right">
                          <span className="text-primary font-bold text-[11px] flex items-center justify-end gap-1 hover:underline">
                            Inspect <ChevronRight className="h-3.5 w-3.5" />
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between text-xs text-muted-foreground pt-2">
              <span>Showing {drilldownLeads.length} underlying records</span>
              <button
                type="button"
                onClick={() => setDrilldownKpi(null)}
                className="rounded-lg border border-border px-3 py-1.5 font-semibold text-foreground hover:bg-surface-elevated"
              >
                Close Audit View
              </button>
            </div>
          </div>
        </div>
      )}

      {/* LEAD DETAIL DRAWER */}
      <LeadDetailDrawer
        lead={selectedLead}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onLeadUpdated={handleLeadUpdated}
        readOnly={isViewOnly}
        canManageAssignments={userRoles.some((r) => ["admin", "manager"].includes(r))}
      />
    </div>
  );
}
