import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  BarChart3,
  Building2,
  ExternalLink,
  LayoutDashboard,
  LockKeyhole,
  Package,
  Sparkles,
  Users,
  Globe2,
  PhoneCall,
  Megaphone,
  Network,
  Shield,
  TrendingUp,
  AlertCircle,
  Filter,
  MessageSquare,
  Award,
  ArrowUpRight,
  ChevronRight,
  ShieldCheck,
  CheckCircle2,
  Activity,
  Lock,
  Mic,
  Clock,
  Calendar,
  MoreVertical,
  Handshake,
  Mail,
  type LucideIcon,
} from "lucide-react";
import type {
  CRMKpiSnapshot,
  LiveLead,
} from "@/lib/crm.functions";
import type { ServerProperty } from "@/lib/marketplace.functions";
import type { FortDefinition } from "@/sentinel/forts";
import { defaultPersonaForRoles, type FortModuleGrant } from "@/lib/fort-experience";
import type { FortWorkspaceContext } from "@/lib/fort-workspace.functions";
import type { FortShellPreviewsResult } from "@/lib/sentinel.functions";
import type { SentinelPersona } from "@/sentinel/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  FortWorkspaceStateSurface,
  FortUnauthorizedState,
} from "@/components/sentinel/FortWorkspaceState";
import { MODULE_CATALOG, partitionModules, type ModuleCard } from "@/lib/fort-modules";
import { capabilityLabel } from "@/sentinel/forts";
import {
  SUPREME_INTELLIGENCE_ROUTE,
  siAllowedFor,
} from "@/components/sentinel/FortShell";
import {
  SpartanShieldIcon,
  GoldTerrainBackground,
} from "@/components/sentinel/FortEmblem";
import { openSupremeVoice } from "@/lib/sentinel-voice";

/**
 * Honest metric display. Never fabricates a number:
 *  - while loading: shows "…"
 *  - when the source has no data: shows an explicit INSUFFICIENT DATA state
 *  - otherwise: the real RLS-scoped count
 */
function MetricValue({ value, loaded }: { value: number | null; loaded: boolean }) {
  if (!loaded) {
    return <div className="text-base font-bold text-stone-500">…</div>;
  }
  if (value === null) {
    return (
      <div
        className="text-[9px] font-bold uppercase tracking-wider text-stone-400 leading-tight"
        title="INSUFFICIENT DATA — no live source is configured for this metric"
      >
        INSUFFICIENT
        <br />
        DATA
      </div>
    );
  }
  return <div className="text-base font-bold text-stone-100 font-mono">{value.toLocaleString()}</div>;
}

/**
 * Pure client-safe INR budget formatter for Fort dashboard metric displays.
 */
export function formatPipelineBudgetInr(budgetInr: number | null | undefined): string {
  if (!budgetInr || !Number.isFinite(budgetInr) || budgetInr <= 0) return "₹0";
  if (budgetInr >= 10000000) {
    const cr = (budgetInr / 10000000).toFixed(2).replace(/\.?0+$/, "");
    return `₹${cr} Cr`;
  }
  if (budgetInr >= 100000) {
    const l = (budgetInr / 100000).toFixed(2).replace(/\.?0+$/, "");
    return `₹${l} L`;
  }
  return `₹${budgetInr.toLocaleString("en-IN")}`;
}

/** Format the live FORT watch. Pure so it is deterministically testable. */
export function formatFortWatch(date: Date): string {
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
  });
}

/** Live local-time watch for the Executive Summary. Updates every second. */
function useLiveClock(): string {
  const [now, setNow] = useState<Date>(() => new Date());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);
  return formatFortWatch(now);
}

interface FortDashboardProps {
  fort: FortDefinition;
  roles: readonly string[];
  workspace?: FortWorkspaceContext | null;
  persona?: SentinelPersona | null;
}

/**
 * Pure experience discriminator for the Sales Executive Virtual Office.
 * Uses canonical persona resolution (defaultPersonaForRoles / persona) instead of
 * raw fort.id === "BROKER" checks.
 */
export function isSalesExecutiveExperience(params: {
  persona?: SentinelPersona | null;
  roles?: readonly string[];
  workspace?: FortWorkspaceContext | null;
}): boolean {
  const effectiveRoles = params.workspace?.role?.appRoles ?? params.roles ?? [];
  if (effectiveRoles.includes("admin") || effectiveRoles.includes("manager")) {
    return false;
  }
  const canonicalPersona =
    params.persona ??
    (effectiveRoles.length > 0 ? defaultPersonaForRoles(effectiveRoles) : null);

  return canonicalPersona === "SALES_EXECUTIVE";
}

/**
 * Pure experience discriminator for the Sales Manager / Team Lead Command Center.
 *
 * Rules:
 * - manager => true
 * - admin => false (Platform Admin retains admin experience)
 * - pure agent => false (Sales Executive retains Virtual Office)
 * - viewer => false
 * - builder/developer => false unless they also explicitly hold manager role
 * - admin + manager => false (Platform Admin retains admin experience)
 */
export function isSalesManagerExperience(params: {
  persona?: SentinelPersona | null;
  roles?: readonly string[];
  workspace?: FortWorkspaceContext | null;
}): boolean {
  const effectiveRoles = params.workspace?.role?.appRoles ?? params.roles ?? [];
  if (effectiveRoles.includes("admin")) {
    return false;
  }
  return effectiveRoles.includes("manager");
}

/**
 * Pure helper for resolving lead deep-link target and search params.
 */
export function getLeadDetailLink(leadId: string): { to: "/app/leads"; search: { leadId: string } } {
  return {
    to: "/app/leads",
    search: { leadId },
  };
}

export function FortDashboard({ fort, roles, workspace, persona }: FortDashboardProps) {
  const workspaceResolved = workspace?.status === "ACTIVE";
  const fortClock = useLiveClock();

  const grants = useMemo<FortModuleGrant[] | null>(() => {
    if (!workspace) return null;
    const byRoute = new Map(workspace.modules.map((g) => [g.route, g]));
    return fort.modules.map(
      (route) =>
        byRoute.get(route) ?? {
          route,
          state: "UNAVAILABLE" as const,
          capabilityId: null,
          capabilityExecutable: false,
        },
    );
  }, [workspace, fort.modules]);

  const legacy = useMemo(() => partitionModules(fort.modules, roles), [fort.modules, roles]);

  const [previews, setPreviews] = useState<FortShellPreviewsResult["previews"] | null>(null);
  const [previewsLoaded, setPreviewsLoaded] = useState(false);

  useEffect(() => {
    let active = true;
    void import("@/lib/sentinel.functions")
      .then((m) => m.getFortShellPreviews())
      .then((res) => {
        if (active) {
          setPreviews(res?.previews ?? {});
          setPreviewsLoaded(true);
        }
      })
      .catch(() => {
        if (active) {
          setPreviews({});
          setPreviewsLoaded(true);
        }
      });
    return () => {
      active = false;
    };
  }, []);

  const liveSources = useMemo(() => {
    if (!previews) return [] as { label: string; value: string }[];
    const entries: { label: string; value: number | null | undefined }[] = [
      { label: "CRM Leads", value: previews["/app/crm"]?.leads },
      { label: "Leads Pipeline", value: previews["/app/leads"]?.leads },
      { label: "Marketplace Properties", value: previews["/app/marketplace"]?.properties },
      { label: "Market Listings", value: previews["/app/market"]?.listings },
      { label: "Active Deals", value: previews["/app/dealrooms"]?.deals },
    ];
    return entries
      .filter((e): e is { label: string; value: number } => typeof e.value === "number")
      .map((e) => ({ label: e.label, value: e.value.toLocaleString() }));
  }, [previews]);

  if (!workspaceResolved) {
    return (
      <div className="mx-auto w-full max-w-7xl px-4 py-10">
        <FortWorkspaceStateSurface
          status={workspace?.status ?? "AWAITING"}
          membershipPending={workspace?.reason === "MEMBERSHIP_PENDING"}
        />
      </div>
    );
  }

  // ── Previews / Counts — REAL RLS-scoped metrics only ──
  // A metric with no SHELL_SOURCES source is NEVER given a fallback number:
  // it renders as an honest INSUFFICIENT DATA state instead.
  const leadCount = previews?.["/app/crm"]?.["leads"] ?? null;
  const leadsPipelineCount = previews?.["/app/leads"]?.["leads"] ?? null;
  const marketplacePropertyCount = previews?.["/app/marketplace"]?.["properties"] ?? null;
  const listingCount = previews?.["/app/market"]?.["listings"] ?? null;
  const dealCount = previews?.["/app/dealrooms"]?.["deals"] ?? null;
  const activityCount = previews?.["/app/activities"]?.["activities"] ?? null;

  // Live sources that actually returned a countable row set (SHELL_SOURCES).
  // A source that is missing/errored stays out of this list — we never invent
  // a number for it. The panel renders INSUFFICIENT DATA when nothing loaded.


  const isSalesExecutive = isSalesExecutiveExperience({
    persona,
    roles,
    workspace,
  });

  const [assignedLeads, setAssignedLeads] = useState<LiveLead[]>([]);
  const [assignedLeadsLoading, setAssignedLeadsLoading] = useState(false);
  const [properties, setProperties] = useState<ServerProperty[]>([]);
  const [propertiesLoading, setPropertiesLoading] = useState(false);
  const [queueTab, setQueueTab] = useState<"all" | "followups" | "sitevisits" | "negotiations">("all");

  useEffect(() => {
    if (!isSalesExecutive) return;
    let active = true;
    setAssignedLeadsLoading(true);
    setPropertiesLoading(true);

    void import("@/lib/crm.functions")
      .then((m) => m.getLiveLeads())
      .then((res) => {
        if (active) {
          setAssignedLeads(Array.isArray(res) ? res : []);
          setAssignedLeadsLoading(false);
        }
      })
      .catch(() => {
        if (active) {
          setAssignedLeads([]);
          setAssignedLeadsLoading(false);
        }
      });

    void import("@/lib/marketplace.functions")
      .then((m) => m.getMarketplaceProperties())
      .then((res) => {
        if (active) {
          setProperties(Array.isArray(res) ? res : []);
          setPropertiesLoading(false);
        }
      })
      .catch(() => {
        if (active) {
          setProperties([]);
          setPropertiesLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [isSalesExecutive]);

  // Derived sets for Sales Executive Today's Office work queue
  const activeAssignedLeads = useMemo(() => {
    return assignedLeads.filter(
      (l) => !["Booked", "Not Interested", "Dropped Plan"].includes(l.stage)
    );
  }, [assignedLeads]);

  const followUpsDue = useMemo(() => {
    return assignedLeads.filter(
      (l) => Boolean(l.followUpDate && l.followUpDate.trim() && l.followUpStatus !== "completed")
    );
  }, [assignedLeads]);

  const siteVisitsScheduled = useMemo(() => {
    return assignedLeads.filter(
      (l) => Boolean(l.siteVisitDate && l.siteVisitDate.trim())
    );
  }, [assignedLeads]);

  const activeNegotiations = useMemo(() => {
    return assignedLeads.filter((l) =>
      ["Negotiation", "Under Negotiation", "Offer Made"].includes(l.stage)
    );
  }, [assignedLeads]);

  const bookedLeads = useMemo(() => {
    return assignedLeads.filter((l) => l.stage === "Booked");
  }, [assignedLeads]);

  const totalActivePipelineBudget = useMemo(() => {
    return activeAssignedLeads.reduce((sum, l) => sum + (Number(l.budgetInr) || 0), 0);
  }, [activeAssignedLeads]);

  const appointmentCount = useMemo(() => {
    return siteVisitsScheduled.length + followUpsDue.length;
  }, [siteVisitsScheduled, followUpsDue]);

  const isSalesManager = isSalesManagerExperience({
    persona,
    roles,
    workspace,
  });

  const [teamLeads, setTeamLeads] = useState<LiveLead[]>([]);
  const [teamLeadsLoading, setTeamLeadsLoading] = useState(false);
  const [crmKpis, setCrmKpis] = useState<CRMKpiSnapshot | null>(null);
  const [crmKpisLoading, setCrmKpisLoading] = useState(false);

  useEffect(() => {
    if (!isSalesManager) return;
    let active = true;
    setTeamLeadsLoading(true);
    setCrmKpisLoading(true);

    void import("@/lib/crm.functions").then((m) => {
      m.getLiveLeads()
        .then((res) => {
          if (active) {
            setTeamLeads(Array.isArray(res) ? res : []);
            setTeamLeadsLoading(false);
          }
        })
        .catch(() => {
          if (active) {
            setTeamLeads([]);
            setTeamLeadsLoading(false);
          }
        });

      m.getCRMKPIs()
        .then((res) => {
          if (active) {
            setCrmKpis(res ?? null);
            setCrmKpisLoading(false);
          }
        })
        .catch(() => {
          if (active) {
            setCrmKpis(null);
            setCrmKpisLoading(false);
          }
        });
    });

    return () => {
      active = false;
    };
  }, [isSalesManager]);

  const teamAppointmentsCount = useMemo(() => {
    return teamLeads.filter(
      (l) =>
        (l.siteVisitDate && l.siteVisitDate.trim()) ||
        (l.followUpDate && l.followUpDate.trim() && l.followUpStatus !== "completed")
    ).length;
  }, [teamLeads]);

  const teamActivePipelineCount = useMemo(() => {
    return teamLeads.filter(
      (l) => !["Booked", "Not Interested", "Dropped Plan"].includes(l.stage)
    ).length;
  }, [teamLeads]);

  const teamActivePipelineBudget = useMemo(() => {
    return teamLeads
      .filter((l) => !["Booked", "Not Interested", "Dropped Plan"].includes(l.stage))
      .reduce((sum, l) => sum + (Number(l.budgetInr) || 0), 0);
  }, [teamLeads]);

  const teamConversionsCount = useMemo(() => {
    return teamLeads.filter((l) => l.stage === "Booked").length;
  }, [teamLeads]);

  const executiveAggregates = useMemo(() => {
    if (teamLeads.length === 0) return [];
    const execMap = new Map<string, {
      name: string;
      assignedLeads: number;
      activeLeads: number;
      appointments: number;
      conversions: number;
      activeLeadBudget: number;
    }>();

    for (const lead of teamLeads) {
      const execName = lead.ownerName && lead.ownerName !== "Unassigned" && lead.ownerName !== "none"
        ? lead.ownerName
        : "Unassigned";

      if (!execMap.has(execName)) {
        execMap.set(execName, {
          name: execName,
          assignedLeads: 0,
          activeLeads: 0,
          appointments: 0,
          conversions: 0,
          activeLeadBudget: 0,
        });
      }

      const entry = execMap.get(execName)!;
      entry.assignedLeads += 1;
      if (!["Booked", "Not Interested", "Dropped Plan"].includes(lead.stage)) {
        entry.activeLeads += 1;
        entry.activeLeadBudget += Number(lead.budgetInr || 0);
      }
      if ((lead.siteVisitDate && lead.siteVisitDate.trim()) || (lead.followUpDate && lead.followUpDate.trim() && lead.followUpStatus !== "completed")) {
        entry.appointments += 1;
      }
      if (lead.stage === "Booked") {
        entry.conversions += 1;
      }
    }

    return Array.from(execMap.values()).sort((a, b) => {
      if (a.name === "Unassigned") return 1;
      if (b.name === "Unassigned") return -1;
      return b.assignedLeads - a.assignedLeads;
    });
  }, [teamLeads]);

  if (isSalesExecutive) {
    const queueItems =
      queueTab === "followups"
        ? followUpsDue
        : queueTab === "sitevisits"
          ? siteVisitsScheduled
          : queueTab === "negotiations"
            ? activeNegotiations
            : assignedLeads;

    return (
      <div className="relative w-full max-w-[1600px] mx-auto space-y-6 font-sans antialiased text-[#181B22]">
        {/* ── 1. WELCOME & DAILY COMMAND STRIP ── */}
        <section className="relative overflow-hidden rounded-3xl border border-[#D8C7A5] bg-gradient-to-r from-[#0C0E12] via-[#141720] to-[#0C0E12] p-5 sm:p-6 shadow-xl text-stone-100">
          <GoldTerrainBackground />

          <div className="relative z-10 flex flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3.5">
                <SpartanShieldIcon size={44} className="hover:scale-105 transition-transform duration-300 shrink-0" />
                <div>
                  <div className="flex flex-wrap items-center gap-2.5">
                    <h1 className="font-serif text-lg sm:text-xl font-bold tracking-[0.18em] text-white uppercase leading-none">
                      Good Morning, {userName}
                    </h1>
                    <span className="inline-flex items-center gap-1 rounded-full bg-[#FF7722]/15 border border-[#FF7722]/40 px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.2em] text-[#FF8833] shadow-xs">
                      <Sparkles className="h-2.5 w-2.5" /> PERSONAL SALES SUITE
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-[#E5C368] font-medium">
                    Sales Executive Virtual Office · Client Consultation, Pipeline Velocity & Transaction Orchestration
                  </p>
                </div>
              </div>

              {/* Status and Workspace Badge */}
              {workspace && (
                <div className="flex flex-wrap items-center gap-2 text-[10px]">
                  <span className="font-semibold text-stone-300">
                    {workspace.workspaceName ?? "Sentinel Fort HQ"}
                  </span>
                  {workspace.workspacePublicId && (
                    <span className="rounded-full border border-[#483B1C] bg-[#161B26] px-2.5 py-0.5 font-mono text-[9px] text-[#E5C368] font-bold shadow-2xs">
                      {workspace.workspacePublicId}
                    </span>
                  )}
                  <span className="flex items-center gap-1 text-[9px] font-bold text-emerald-400 bg-emerald-950/70 border border-emerald-700/80 rounded-full px-2.5 py-0.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    {workspace.status}
                  </span>
                </div>
              )}
            </div>

            {/* Daily Operational Metrics Strip (Truthful Live Data Only) */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 pt-3 border-t border-[#332A18]/80 text-xs">
              <div className="rounded-xl border border-[#2B2315] bg-[#151922]/80 p-2.5">
                <span className="text-[10px] uppercase font-bold text-[#8C8477]">Assigned Leads</span>
                <div className="text-base font-bold font-mono text-white mt-0.5">
                  {assignedLeadsLoading ? "…" : assignedLeads.length.toLocaleString()}
                </div>
              </div>

              <div className="rounded-xl border border-[#2B2315] bg-[#151922]/80 p-2.5">
                <span className="text-[10px] uppercase font-bold text-[#8C8477]">Active Pipeline</span>
                <div className="text-base font-bold font-mono text-[#E5C368] mt-0.5">
                  {assignedLeadsLoading ? "…" : activeAssignedLeads.length.toLocaleString()}
                </div>
              </div>

              <div className="rounded-xl border border-[#2B2315] bg-[#151922]/80 p-2.5">
                <span className="text-[10px] uppercase font-bold text-[#8C8477]">Follow-ups Due</span>
                <div className="text-base font-bold font-mono text-[#FF8833] mt-0.5">
                  {assignedLeadsLoading ? "…" : followUpsDue.length.toLocaleString()}
                </div>
              </div>

              <div className="rounded-xl border border-[#2B2315] bg-[#151922]/80 p-2.5">
                <span className="text-[10px] uppercase font-bold text-[#8C8477]">Site Visits</span>
                <div className="text-base font-bold font-mono text-[#38BDF8] mt-0.5">
                  {assignedLeadsLoading ? "…" : siteVisitsScheduled.length.toLocaleString()}
                </div>
              </div>

              <div className="rounded-xl border border-[#2B2315] bg-[#151922]/80 p-2.5">
                <span className="text-[10px] uppercase font-bold text-[#8C8477]">Active Deals</span>
                <div className="text-base font-bold font-mono text-emerald-400 mt-0.5">
                  {previewsLoaded && dealCount !== null ? dealCount.toLocaleString() : "…"}
                </div>
              </div>

              <div className="rounded-xl border border-[#2B2315] bg-[#151922]/80 p-2.5">
                <span className="text-[10px] uppercase font-bold text-[#8C8477]">Pipeline Budget</span>
                <div className="text-base font-bold font-mono text-[#D4AF37] mt-0.5 truncate">
                  {assignedLeadsLoading ? "…" : formatPipelineBudgetInr(totalActivePipelineBudget)}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── 2. PRIMARY OFFICE MODULES (The 6 Main Navigation Workstations) ── */}
        <section className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h2 className="font-serif text-base font-bold tracking-wide text-[#141720] uppercase">
              Office Workstations & Navigation
            </h2>
            <span className="text-xs text-[#8C8477] font-medium hidden sm:inline">
              Personal Virtual Office Surfaces
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4.5">
            {/* 1. MY LEADS */}
            <div className="group rounded-2xl p-4.5 flex flex-col justify-between border border-[#EADBCA] bg-gradient-to-br from-[#FFFFFF] via-[#FAF7F2] to-[#F5EFE6] shadow-sm hover:shadow-md hover:border-[#D4AF37] transition-all duration-200 min-h-[190px]">
              <div>
                <div className="flex items-start justify-between">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#12141A] border border-[#C5A059]/40 text-[#D4AF37] shadow-xs group-hover:scale-105 transition-transform">
                    <Users className="h-5 w-5" />
                  </div>
                  <span className="rounded-full bg-[#FFF2EA] border border-[#FFD8C2] px-2.5 py-0.5 text-[10px] font-mono font-bold text-[#C85A0D]">
                    {assignedLeadsLoading ? "…" : `${assignedLeads.length} Assigned`}
                  </span>
                </div>
                <div className="mt-3.5">
                  <div className="flex items-center gap-1.5">
                    <h3 className="text-sm font-bold text-[#141720] tracking-tight">MY LEADS</h3>
                    <span className="h-1.5 w-1.5 rounded-full bg-[#E06A1A]" />
                  </div>
                  <p className="text-xs text-[#6B655B] font-medium mt-0.5 leading-relaxed">
                    Capture, qualify and manage assigned prospect consultations and stage velocity.
                  </p>
                  <div className="mt-2 text-[11px] font-semibold text-[#8C8477]">
                    {assignedLeadsLoading ? "…" : `${activeAssignedLeads.length} active opportunities in pipeline`}
                  </div>
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-[#EADBCA]/80">
                <Link
                  to="/app/leads"
                  className="block w-full py-2 rounded-xl text-xs text-center font-bold bg-[#12141A] text-[#E5C368] hover:bg-[#1C202B] hover:text-[#FFF] hover:border-[#D4AF37] border border-[#2B313F] transition-all shadow-xs"
                >
                  Open Leads
                </Link>
              </div>
            </div>

            {/* 2. MY APPOINTMENTS */}
            <div className="group rounded-2xl p-4.5 flex flex-col justify-between border border-[#EADBCA] bg-gradient-to-br from-[#FFFFFF] via-[#FAF7F2] to-[#F5EFE6] shadow-sm hover:shadow-md hover:border-[#D4AF37] transition-all duration-200 min-h-[190px]">
              <div>
                <div className="flex items-start justify-between">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#12141A] border border-[#C5A059]/40 text-[#D4AF37] shadow-xs group-hover:scale-105 transition-transform">
                    <Calendar className="h-5 w-5" />
                  </div>
                  <span className="rounded-full bg-[#FFF8EB] border border-[#FDE6B8] px-2.5 py-0.5 text-[10px] font-mono font-bold text-[#B87A14]">
                    {assignedLeadsLoading ? "…" : `${siteVisitsScheduled.length + followUpsDue.length} Agenda`}
                  </span>
                </div>
                <div className="mt-3.5">
                  <div className="flex items-center gap-1.5">
                    <h3 className="text-sm font-bold text-[#141720] tracking-tight">MY APPOINTMENTS</h3>
                    <span className="h-1.5 w-1.5 rounded-full bg-[#D4AF37]" />
                  </div>
                  <p className="text-xs text-[#6B655B] font-medium mt-0.5 leading-relaxed">
                    Scheduled on-site property walkthroughs and client consultation calls.
                  </p>
                  <div className="mt-2 text-[11px] font-semibold text-[#8C8477]">
                    {assignedLeadsLoading ? "…" : `${siteVisitsScheduled.length} site visits · ${followUpsDue.length} follow-ups scheduled`}
                  </div>
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-[#EADBCA]/80">
                <Link
                  to="/app/leads"
                  className="block w-full py-2 rounded-xl text-xs text-center font-bold bg-[#12141A] text-[#E5C368] hover:bg-[#1C202B] hover:text-[#FFF] hover:border-[#D4AF37] border border-[#2B313F] transition-all shadow-xs"
                >
                  Open Schedule
                </Link>
              </div>
            </div>

            {/* 3. SALES INVENTORY */}
            <div className="group rounded-2xl p-4.5 flex flex-col justify-between border border-[#EADBCA] bg-gradient-to-br from-[#FFFFFF] via-[#FAF7F2] to-[#F5EFE6] shadow-sm hover:shadow-md hover:border-[#D4AF37] transition-all duration-200 min-h-[190px]">
              <div>
                <div className="flex items-start justify-between">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#12141A] border border-[#C5A059]/40 text-[#D4AF37] shadow-xs group-hover:scale-105 transition-transform">
                    <Building2 className="h-5 w-5" />
                  </div>
                  <span className="rounded bg-[#FFF4EB] border border-[#FFD8C2] px-2 py-0.5 text-[9px] font-bold text-[#C85A0D] uppercase tracking-wider">
                    VIEW ONLY
                  </span>
                </div>
                <div className="mt-3.5">
                  <div className="flex items-center gap-1.5">
                    <h3 className="text-sm font-bold text-[#141720] tracking-tight">SALES INVENTORY</h3>
                    <span className="h-1.5 w-1.5 rounded-full bg-[#D4AF37]" />
                  </div>
                  <p className="text-xs text-[#6B655B] font-medium mt-0.5 leading-relaxed">
                    Authorized project and property catalog available for sales consultation reference.
                  </p>
                  <div className="mt-2 text-[11px] font-semibold text-[#8C8477]">
                    {propertiesLoading ? "…" : `${properties.length > 0 ? properties.length : (marketplacePropertyCount ?? 'Live')} verified project portfolios`}
                  </div>
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-[#EADBCA]/80">
                <Link
                  to="/app/marketplace"
                  className="block w-full py-2 rounded-xl text-xs text-center font-bold bg-[#12141A] text-[#E5C368] hover:bg-[#1C202B] hover:text-[#FFF] hover:border-[#D4AF37] border border-[#2B313F] transition-all shadow-xs"
                >
                  View Stock
                </Link>
              </div>
            </div>

            {/* 4. MY DEALS */}
            <div className="group rounded-2xl p-4.5 flex flex-col justify-between border border-[#EADBCA] bg-gradient-to-br from-[#FFFFFF] via-[#FAF7F2] to-[#F5EFE6] shadow-sm hover:shadow-md hover:border-[#D4AF37] transition-all duration-200 min-h-[190px]">
              <div>
                <div className="flex items-start justify-between">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#12141A] border border-[#C5A059]/40 text-[#D4AF37] shadow-xs group-hover:scale-105 transition-transform">
                    <Handshake className="h-5 w-5" />
                  </div>
                  <span className="rounded-full bg-emerald-50 border border-emerald-300 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700">
                    {previewsLoaded && dealCount !== null ? `${dealCount} Active` : "Deal Room 2.0"}
                  </span>
                </div>
                <div className="mt-3.5">
                  <div className="flex items-center gap-1.5">
                    <h3 className="text-sm font-bold text-[#141720] tracking-tight">MY DEALS</h3>
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
                  </div>
                  <p className="text-xs text-[#6B655B] font-medium mt-0.5 leading-relaxed">
                    Active digital closing rooms, client negotiations, and transaction progress.
                  </p>
                  <div className="mt-2 text-[11px] font-semibold text-[#8C8477]">
                    Assignment-scoped deal rooms & closing milestones
                  </div>
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-[#EADBCA]/80">
                <Link
                  to="/app/dealrooms"
                  className="block w-full py-2 rounded-xl text-xs text-center font-bold bg-[#12141A] text-[#E5C368] hover:bg-[#1C202B] hover:text-[#FFF] hover:border-[#D4AF37] border border-[#2B313F] transition-all shadow-xs"
                >
                  Open Deal Rooms
                </Link>
              </div>
            </div>

            {/* 5. MY PERFORMANCE */}
            <div className="group rounded-2xl p-4.5 flex flex-col justify-between border border-[#EADBCA] bg-gradient-to-br from-[#FFFFFF] via-[#FAF7F2] to-[#F5EFE6] shadow-sm hover:shadow-md hover:border-[#D4AF37] transition-all duration-200 min-h-[190px]">
              <div>
                <div className="flex items-start justify-between">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#12141A] border border-[#C5A059]/40 text-[#D4AF37] shadow-xs group-hover:scale-105 transition-transform">
                    <TrendingUp className="h-5 w-5" />
                  </div>
                  <span className="rounded-full bg-emerald-50 border border-emerald-300 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700 flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 animate-pulse" /> Live Scoped
                  </span>
                </div>
                <div className="mt-3.5">
                  <div className="flex items-center gap-1.5">
                    <h3 className="text-sm font-bold text-[#141720] tracking-tight">MY PERFORMANCE</h3>
                    <span className="h-1.5 w-1.5 rounded-full bg-[#059669]" />
                  </div>
                  <p className="text-xs text-[#6B655B] font-medium mt-0.5 leading-relaxed">
                    Personal conversion velocity, consultation response time, and closure metrics.
                  </p>
                  <div className="mt-2 text-[11px] font-semibold text-[#8C8477]">
                    {assignedLeadsLoading ? "…" : `${bookedLeads.length} booked conversions · Isolated from team BI`}
                  </div>
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-[#EADBCA]/80">
                <Link
                  to="/app/crm"
                  className="block w-full py-2 rounded-xl text-xs text-center font-bold bg-[#12141A] text-[#E5C368] hover:bg-[#1C202B] hover:text-[#FFF] hover:border-[#D4AF37] border border-[#2B313F] transition-all shadow-xs"
                >
                  View Metrics
                </Link>
              </div>
            </div>

            {/* 6. MESSAGES */}
            <div className="group rounded-2xl p-4.5 flex flex-col justify-between border border-[#EADBCA] bg-gradient-to-br from-[#FFFFFF] via-[#FAF7F2] to-[#F5EFE6] shadow-sm hover:shadow-md hover:border-[#D4AF37] transition-all duration-200 min-h-[190px]">
              <div>
                <div className="flex items-start justify-between">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#12141A] border border-[#C5A059]/40 text-[#D4AF37] shadow-xs group-hover:scale-105 transition-transform">
                    <Mail className="h-5 w-5" />
                  </div>
                  <span className="rounded-full bg-[#F3EFE6] border border-[#DDD5C5] px-2.5 py-0.5 text-[10px] font-mono font-bold text-[#4A453A]">
                    Direct Channel
                  </span>
                </div>
                <div className="mt-3.5">
                  <div className="flex items-center gap-1.5">
                    <h3 className="text-sm font-bold text-[#141720] tracking-tight">MESSAGES</h3>
                    <span className="h-1.5 w-1.5 rounded-full bg-[#3B82F6]" />
                  </div>
                  <p className="text-xs text-[#6B655B] font-medium mt-0.5 leading-relaxed">
                    Internal communications, management directives, and workspace updates.
                  </p>
                  <div className="mt-2 text-[11px] font-semibold text-[#8C8477]">
                    Direct collaboration with sales manager and project leads
                  </div>
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-[#EADBCA]/80">
                <Link
                  to="/app/messages"
                  className="block w-full py-2 rounded-xl text-xs text-center font-bold bg-[#12141A] text-[#E5C368] hover:bg-[#1C202B] hover:text-[#FFF] hover:border-[#D4AF37] border border-[#2B313F] transition-all shadow-xs"
                >
                  Open Messages
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* ── 3. TODAY'S OFFICE / WORK QUEUE ── */}
        <section className="rounded-3xl p-5 sm:p-6 border border-[#EADBCA] bg-gradient-to-b from-[#FFFFFF] via-[#FAF8F4] to-[#F5EFE6] shadow-md space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#E8DFC8]">
            <div className="flex items-center gap-2.5">
              <span className="h-2.5 w-2.5 rounded-full bg-[#E06A1A] animate-pulse" />
              <div>
                <h2 className="font-serif text-base sm:text-lg font-bold text-[#141720]">
                  TODAY'S OFFICE · WORK QUEUE
                </h2>
                <p className="text-xs text-[#6B655B] font-medium">
                  Active consultation priorities, follow-ups due, and scheduled site visits
                </p>
              </div>
            </div>

            {/* Filter Tabs */}
            <div className="flex flex-wrap items-center gap-1.5 bg-[#EFE8DC] p-1 rounded-xl border border-[#DDD5C5]">
              <button
                type="button"
                onClick={() => setQueueTab("all")}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  queueTab === "all"
                    ? "bg-[#12141A] text-[#E5C368] shadow-xs"
                    : "text-[#6B655B] hover:text-[#141720]"
                }`}
              >
                All Assigned ({assignedLeads.length})
              </button>
              <button
                type="button"
                onClick={() => setQueueTab("followups")}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  queueTab === "followups"
                    ? "bg-[#12141A] text-[#E5C368] shadow-xs"
                    : "text-[#6B655B] hover:text-[#141720]"
                }`}
              >
                Follow-ups Due ({followUpsDue.length})
              </button>
              <button
                type="button"
                onClick={() => setQueueTab("sitevisits")}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  queueTab === "sitevisits"
                    ? "bg-[#12141A] text-[#E5C368] shadow-xs"
                    : "text-[#6B655B] hover:text-[#141720]"
                }`}
              >
                Site Visits ({siteVisitsScheduled.length})
              </button>
              <button
                type="button"
                onClick={() => setQueueTab("negotiations")}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  queueTab === "negotiations"
                    ? "bg-[#12141A] text-[#E5C368] shadow-xs"
                    : "text-[#6B655B] hover:text-[#141720]"
                }`}
              >
                Negotiations ({activeNegotiations.length})
              </button>
            </div>
          </div>

          {/* Queue Content */}
          {assignedLeadsLoading ? (
            <div className="p-10 text-center text-sm text-[#8C8477] animate-pulse">
              Loading daily work queue from Sentinel Fort…
            </div>
          ) : queueItems.length === 0 ? (
            <div className="p-10 text-center space-y-2 rounded-2xl border border-[#E5DBCA] bg-white">
              <Users className="h-9 w-9 mx-auto text-[#B5ABA0]" />
              <p className="text-sm font-bold text-[#2A2E39]">
                {queueTab === "followups"
                  ? "No follow-ups due today"
                  : queueTab === "sitevisits"
                    ? "No site visits currently scheduled"
                    : queueTab === "negotiations"
                      ? "No deals currently in active negotiation"
                      : "No leads currently assigned"}
              </p>
              <p className="text-xs text-[#7A7366] max-w-sm mx-auto">
                {queueTab === "all"
                  ? "New prospect inquiries assigned to you by sales management will appear here for client consultation."
                  : "Prospects matching this work queue filter will appear here when scheduled or updated."}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-[#E8DFC8] bg-white shadow-2xs">
              <table className="w-full text-left text-xs text-[#2A2E39]">
                <thead>
                  <tr className="border-b border-[#E8DFC8] bg-[#F7F2EA] text-[10px] uppercase tracking-wider text-[#6B655B] font-bold">
                    <th className="py-3 px-4">Prospect / Client</th>
                    <th className="py-3 px-4">Stage</th>
                    <th className="py-3 px-4">Project & Budget</th>
                    <th className="py-3 px-4">Scheduled Agenda</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EFE8DC]">
                  {queueItems.map((lead) => (
                    <tr key={lead.id} className="hover:bg-[#FAF7F2] transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-[#141720] text-sm">{lead.name}</div>
                        <div className="text-[11px] text-[#8C8477] mt-0.5">
                          {lead.phone || lead.email || "Contact details on record"} · {lead.source || "Direct Inquiry"}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-[#F5EFE6] border border-[#DDD5C5] px-2.5 py-0.5 text-[11px] font-bold text-[#3A352C]">
                          {lead.stage}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-[#141720]">{lead.project || "General Inquiry"}</div>
                        <div className="text-[11px] text-[#C85A0D] font-mono font-bold mt-0.5">
                          {lead.budgetInr ? formatPipelineBudgetInr(lead.budgetInr) : lead.budget || "Budget flexible"}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        {lead.siteVisitDate ? (
                          <div className="inline-flex items-center gap-1 text-[11px] font-semibold text-sky-700 bg-sky-50 border border-sky-200 px-2 py-0.5 rounded-md">
                            <Calendar className="h-3 w-3" />
                            <span>Visit: {lead.siteVisitDate}</span>
                          </div>
                        ) : lead.followUpDate ? (
                          <div className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md">
                            <Clock className="h-3 w-3" />
                            <span>Follow-up: {lead.followUpDate}</span>
                          </div>
                        ) : (
                          <span className="text-[11px] text-[#8C8477]">No agenda date set</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <Link
                          to="/app/leads"
                          search={{ leadId: lead.id } as any}
                          className="inline-flex items-center gap-1 rounded-full border border-[#C5A059]/70 bg-[#12141A] px-3.5 py-1 text-xs font-bold text-[#E5C368] hover:bg-[#1E232E] hover:text-[#FFF] hover:border-[#D4AF37] transition-all shadow-xs"
                        >
                          <span>Open</span>
                          <ArrowUpRight className="h-3 w-3 text-[#FF7722]" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* ── 4. PROJECT SALES INVENTORY PREVIEW (View Only) ── */}
        <section className="rounded-3xl p-5 sm:p-6 border border-[#EADBCA] bg-gradient-to-b from-[#FFFFFF] via-[#FAF8F4] to-[#F5EFE6] shadow-md space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#E8DFC8]">
            <div className="flex items-center gap-2.5">
              <span className="h-2.5 w-2.5 rounded-full bg-[#D4AF37]" />
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-serif text-base sm:text-lg font-bold text-[#141720]">
                    PROJECT SALES INVENTORY
                  </h2>
                  <span className="rounded bg-[#FFF4EB] border border-[#FFD8C2] px-2 py-0.5 text-[9px] font-bold text-[#C85A0D] uppercase tracking-wider">
                    VIEW ONLY CATALOG
                  </span>
                </div>
                <p className="text-xs text-[#6B655B] font-medium">
                  Verified project portfolios available for client presentation & sales reference
                </p>
              </div>
            </div>

            <Link
              to="/app/marketplace"
              className="inline-flex items-center gap-1 rounded-xl border border-[#C5A059]/70 bg-[#12141A] px-3.5 py-1.5 text-xs font-bold text-[#E5C368] hover:bg-[#1E232E] hover:text-[#FFF] hover:border-[#D4AF37] transition-all shadow-xs"
            >
              <span>Explore Marketplace</span>
              <ArrowUpRight className="h-3.5 w-3.5 text-[#FF7722]" />
            </Link>
          </div>

          {/* Property Cards Grid */}
          {propertiesLoading ? (
            <div className="p-8 text-center text-sm text-[#8C8477] animate-pulse">
              Loading inventory catalog from Sentinel Fort…
            </div>
          ) : properties.length === 0 ? (
            <div className="p-8 text-center space-y-2 rounded-2xl border border-[#E5DBCA] bg-white">
              <Building2 className="h-8 w-8 mx-auto text-[#B5ABA0]" />
              <p className="text-sm font-bold text-[#2A2E39]">Inventory catalog available in Marketplace</p>
              <p className="text-xs text-[#7A7366] max-w-sm mx-auto">
                Explore the complete verified project listings in the Marketplace console.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {properties.slice(0, 4).map((prop) => (
                <div
                  key={prop.id}
                  className="group rounded-2xl overflow-hidden border border-[#EADBCA] bg-white shadow-xs hover:shadow-md hover:border-[#D4AF37] transition-all duration-200 flex flex-col justify-between"
                >
                  <div className="relative h-32 w-full overflow-hidden bg-stone-100">
                    <img
                      src={prop.image || "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=600&q=80"}
                      alt={prop.name}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      loading="lazy"
                    />
                    {prop.tag && (
                      <span className="absolute top-2 left-2 rounded-md bg-[#12141A]/90 backdrop-blur-xs border border-[#D4AF37]/50 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-[#E5C368]">
                        {prop.tag}
                      </span>
                    )}
                    <span className="absolute top-2 right-2 rounded-md bg-[#FAF7F2]/95 border border-[#EADBCA] px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-[#C85A0D]">
                      VIEW ONLY
                    </span>
                  </div>

                  <div className="p-3.5 space-y-2 flex-1 flex flex-col justify-between">
                    <div>
                      <div className="font-serif font-bold text-sm text-[#141720] group-hover:text-[#B8860B] transition-colors truncate">
                        {prop.name}
                      </div>
                      <div className="text-[11px] text-[#6B655B] font-medium truncate mt-0.5">
                        {prop.builder} · {prop.city}
                      </div>
                      <div className="flex items-center gap-1.5 text-[10px] text-[#8C8477] font-semibold mt-1">
                        <span>{prop.config}</span>
                        <span>•</span>
                        <span>{prop.size}</span>
                      </div>
                    </div>

                    <div className="pt-2.5 border-t border-[#EFE8DC] flex items-center justify-between">
                      <div className="font-mono text-xs font-bold text-[#C85A0D]">
                        {prop.priceLabel || (prop.price_inr ? formatPipelineBudgetInr(prop.price_inr) : "Price on Request")}
                      </div>
                      <Link
                        to="/app/marketplace"
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-[#141720] hover:text-[#B8860B] transition-colors"
                      >
                        <span>Details</span>
                        <ChevronRight className="h-3 w-3" />
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Visual Inventory Future-Ready Scope / Status Legend */}
          <div className="rounded-2xl border border-[#EADBCA] bg-gradient-to-r from-[#FFFFFF] via-[#FAF8F5] to-[#F7F2EA] p-3.5 shadow-2xs flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5">
              <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-[#12141A] text-[#D4AF37] text-[10px] font-bold">
                ✦
              </span>
              <div>
                <span className="font-bold text-[#141720]">Unit Availability Visualization: </span>
                <span className="text-[#6B655B]">Future visual master plan layout will display plot/unit status using these indicators.</span>
              </div>
            </div>
            <div className="flex items-center gap-2 text-[11px] font-medium">
              <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" /> Available
              </span>
              <span className="inline-flex items-center gap-1 text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500" /> Under Offer
              </span>
              <span className="inline-flex items-center gap-1 text-stone-600 bg-stone-100 px-2.5 py-0.5 rounded-full border border-stone-200">
                <span className="h-1.5 w-1.5 rounded-full bg-stone-400" /> Booked
              </span>
            </div>
          </div>
        </section>

        {/* ── 5. FOOTER ── */}
        <footer className="pt-3 border-t border-[#E8DFC8] text-center text-[10px] text-[#8C8477]">
          <p>SENTINEL FORT · SALES EXECUTIVE VIRTUAL OFFICE · Personal Sales Suite, Client Consultation & Deal Orchestration.</p>
        </footer>
      </div>
    );
  }

  if (isSalesManager) {
    return (
      <div className="relative w-full max-w-[1600px] mx-auto space-y-4 font-sans antialiased text-[#181B22] bg-[#FAF7F2] p-3 sm:p-5 rounded-3xl border border-[#EADBCA] shadow-inner">
        {/* ── Top Hero: Sales Manager / Team Lead Command Center Header ── */}
        <section className="relative overflow-hidden rounded-2xl border border-[#D8C7A5] bg-gradient-to-r from-[#0C0E12] via-[#141720] to-[#0C0E12] py-3.5 px-5 shadow-xl text-stone-100">
          <GoldTerrainBackground />

          <div className="relative z-10 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3.5">
              <SpartanShieldIcon size={42} className="hover:scale-105 transition-transform duration-300 shrink-0" />
              <div>
                <div className="flex flex-wrap items-center gap-2.5">
                  <h1 className="font-serif text-lg font-bold tracking-[0.22em] text-white uppercase leading-none">
                    SENTINEL FORT
                  </h1>
                  <span className="inline-flex items-center gap-1 rounded-full bg-[#D4AF37]/15 border border-[#D4AF37]/40 px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.2em] text-[#F3D78A] shadow-xs">
                    <Sparkles className="h-2.5 w-2.5" /> TEAM COMMAND CENTER
                  </span>
                </div>
                <div className="mt-1 flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-[0.2em] text-[#D4AF37]">
                  <span>OVERSIGHT</span>
                  <span className="text-[7px] text-[#FF7722]">✦</span>
                  <span>DISTRIBUTION</span>
                  <span className="text-[7px] text-[#FF7722]">✦</span>
                  <span>PIPELINE</span>
                  <span className="text-[7px] text-[#FF7722]">✦</span>
                  <span>CONVERSION</span>
                </div>
              </div>
            </div>

            {/* Right: Authenticated Identity & Live Workspace Badges */}
            {workspace && (
              <div className="flex flex-wrap items-center gap-2 text-[10px]">
                <span className="font-semibold text-stone-300">
                  {workspace.workspaceName ?? "Sentinel Fort HQ"}
                </span>
                {workspace.workspacePublicId && (
                  <span className="rounded-full border border-[#483B1C] bg-[#161B26] px-2.5 py-0.5 font-mono text-[9px] text-[#E5C368] font-bold shadow-2xs">
                    {workspace.workspacePublicId}
                  </span>
                )}
                <span className="rounded-full bg-[#241F14] border border-[#7A642B] px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-[#F3D78A]">
                  Sales Manager
                </span>
                <span className="flex items-center gap-1 text-[9px] font-bold text-emerald-400 bg-emerald-950/70 border border-emerald-700/80 rounded-full px-2.5 py-0.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  {workspace.status}
                </span>
              </div>
            )}
          </div>
        </section>

        {/* ── 4 PRIMARY MANAGEMENT COMMAND CARDS (Ivory/Champagne + Black + Gold + Saffron) ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {/* 1. Team Leads */}
          <div className="group rounded-2xl p-4 flex flex-col justify-between border border-[#EADBCA] bg-gradient-to-br from-[#FFFFFF] via-[#FAF7F2] to-[#F5EFE6] shadow-sm hover:shadow-md hover:border-[#D4AF37] transition-all duration-200 min-h-[165px]">
            <div>
              <div className="flex items-start justify-between">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#12141A] border border-[#C5A059]/40 text-[#D4AF37] shadow-xs group-hover:scale-105 transition-transform">
                  <Users className="h-5 w-5" />
                </div>
                <span className="rounded-full bg-[#FFF2EA] border border-[#FFD8C2] px-2.5 py-0.5 text-[10px] font-mono font-bold text-[#C85A0D]">
                  {teamLeadsLoading ? "…" : `${teamLeads.length} Total Leads`}
                </span>
              </div>
              <div className="mt-3">
                <div className="flex items-center gap-1.5">
                  <h3 className="text-sm font-bold text-[#141720] tracking-tight font-sans">TEAM LEADS</h3>
                  <span className="h-1.5 w-1.5 rounded-full bg-[#E06A1A]" />
                </div>
                <p className="text-xs text-[#6B655B] font-medium mt-0.5">Total authorized workspace pipeline across all stages</p>
                <div className="mt-1.5 text-[11px] text-[#8C8477] font-semibold">
                  {teamLeadsLoading ? "…" : `${teamLeads.filter((l) => l.ownerName && l.ownerName !== "Unassigned" && l.ownerName !== "none").length} Assigned · ${teamLeads.filter((l) => !l.ownerName || l.ownerName === "Unassigned" || l.ownerName === "none").length} Unassigned`}
                </div>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-[#EADBCA]/80">
              <Link
                to="/app/leads"
                className="block w-full py-1.5 rounded-xl text-xs text-center font-bold bg-[#12141A] text-[#E5C368] hover:bg-[#1C202B] hover:text-[#FFF] hover:border-[#D4AF37] border border-[#2B313F] transition-all shadow-xs"
              >
                Open Team Leads
              </Link>
            </div>
          </div>

          {/* 2. Team Appointments */}
          <div className="group rounded-2xl p-4 flex flex-col justify-between border border-[#EADBCA] bg-gradient-to-br from-[#FFFFFF] via-[#FAF7F2] to-[#F5EFE6] shadow-sm hover:shadow-md hover:border-[#D4AF37] transition-all duration-200 min-h-[165px]">
            <div>
              <div className="flex items-start justify-between">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#12141A] border border-[#C5A059]/40 text-[#D4AF37] shadow-xs group-hover:scale-105 transition-transform">
                  <Clock className="h-5 w-5" />
                </div>
                <span className="rounded-full bg-[#FFF8EB] border border-[#FDE6B8] px-2.5 py-0.5 text-[10px] font-mono font-bold text-[#B87A14]">
                  {teamLeadsLoading ? "…" : `${teamAppointmentsCount} Active`}
                </span>
              </div>
              <div className="mt-3">
                <div className="flex items-center gap-1.5">
                  <h3 className="text-sm font-bold text-[#141720] tracking-tight font-sans">TEAM APPOINTMENTS</h3>
                  <span className="h-1.5 w-1.5 rounded-full bg-[#D4AF37]" />
                </div>
                <p className="text-xs text-[#6B655B] font-medium mt-0.5">Site visits & scheduled follow-up agenda across team</p>
                <div className="mt-1.5 text-[11px] text-[#8C8477] font-semibold">
                  {teamLeadsLoading ? "…" : `${teamLeads.filter((l) => l.siteVisitDate && l.siteVisitDate.trim()).length} Site Visits · ${teamLeads.filter((l) => l.followUpDate && l.followUpDate.trim() && l.followUpStatus !== "completed").length} Follow-Ups`}
                </div>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-[#EADBCA]/80">
              <Link
                to="/app/crm"
                className="block w-full py-1.5 rounded-xl text-xs text-center font-bold bg-[#12141A] text-[#E5C368] hover:bg-[#1C202B] hover:text-[#FFF] hover:border-[#D4AF37] border border-[#2B313F] transition-all shadow-xs"
              >
                Open Schedule
              </Link>
            </div>
          </div>

          {/* 3. Team Pipeline */}
          <div className="group rounded-2xl p-4 flex flex-col justify-between border border-[#EADBCA] bg-gradient-to-br from-[#FFFFFF] via-[#FAF7F2] to-[#F5EFE6] shadow-sm hover:shadow-md hover:border-[#D4AF37] transition-all duration-200 min-h-[165px]">
            <div>
              <div className="flex items-start justify-between">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#12141A] border border-[#C5A059]/40 text-[#D4AF37] shadow-xs group-hover:scale-105 transition-transform">
                  <TrendingUp className="h-5 w-5" />
                </div>
                <span className="rounded-full bg-[#F3EFE6] border border-[#DDD5C5] px-2.5 py-0.5 text-[10px] font-mono font-bold text-[#4A453A]">
                  {teamLeadsLoading ? "…" : formatPipelineBudgetInr(teamActivePipelineBudget)}
                </span>
              </div>
              <div className="mt-3">
                <div className="flex items-center gap-1.5">
                  <h3 className="text-sm font-bold text-[#141720] tracking-tight font-sans">TEAM PIPELINE</h3>
                  <span className="h-1.5 w-1.5 rounded-full bg-[#4A453A]" />
                </div>
                <p className="text-xs text-[#6B655B] font-medium mt-0.5">Active lead budget potential across authorized workspace</p>
                <div className="mt-1.5 text-[11px] text-[#8C8477] font-semibold">
                  {teamLeadsLoading ? "…" : `${teamActivePipelineCount} Active Leads In Pipeline`}
                </div>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-[#EADBCA]/80">
              <Link
                to="/app/dealrooms"
                className="block w-full py-1.5 rounded-xl text-xs text-center font-bold bg-[#12141A] text-[#E5C368] hover:bg-[#1C202B] hover:text-[#FFF] hover:border-[#D4AF37] border border-[#2B313F] transition-all shadow-xs"
              >
                Open Deal Rooms
              </Link>
            </div>
          </div>

          {/* 4. Team Performance */}
          <div className="group rounded-2xl p-4 flex flex-col justify-between border border-[#EADBCA] bg-gradient-to-br from-[#FFFFFF] via-[#FAF7F2] to-[#F5EFE6] shadow-sm hover:shadow-md hover:border-[#D4AF37] transition-all duration-200 min-h-[165px]">
            <div>
              <div className="flex items-start justify-between">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#12141A] border border-[#C5A059]/40 text-[#D4AF37] shadow-xs group-hover:scale-105 transition-transform">
                  <Award className="h-5 w-5" />
                </div>
                <span className="rounded-full bg-emerald-50 border border-emerald-300 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700 flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 animate-pulse" />
                  {crmKpisLoading ? "…" : crmKpis ? `${crmKpis.conversionRatePct.toFixed(1)}% Conversion` : `${teamConversionsCount} Booked`}
                </span>
              </div>
              <div className="mt-3">
                <div className="flex items-center gap-1.5">
                  <h3 className="text-sm font-bold text-[#141720] tracking-tight font-sans">TEAM PERFORMANCE</h3>
                  <span className="h-1.5 w-1.5 rounded-full bg-[#059669]" />
                </div>
                <p className="text-xs text-[#6B655B] font-medium mt-0.5">Workspace conversion & closure performance</p>
                <div className="mt-1.5 text-[11px] text-[#8C8477] font-semibold">
                  {crmKpisLoading ? "…" : `${teamConversionsCount} Booked Closures · ${crmKpis?.qualifiedLeads ?? teamLeads.filter((l) => ["Qualified", "Visit", "Site Visit Scheduled", "Negotiation", "Booked"].includes(l.stage)).length} Qualified`}
                </div>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-[#EADBCA]/80">
              <Link
                to="/app/crm"
                className="block w-full py-1.5 rounded-xl text-xs text-center font-bold bg-[#12141A] text-[#E5C368] hover:bg-[#1C202B] hover:text-[#FFF] hover:border-[#D4AF37] border border-[#2B313F] transition-all shadow-xs"
              >
                Open CRM Pipeline
              </Link>
            </div>
          </div>
        </div>

        {/* ── MANAGEMENT CRM KPI STRIP (5 Canonical Fort CRM KPIs) ── */}
        <div className="rounded-2xl border border-[#EADBCA] bg-gradient-to-r from-[#FFFFFF] via-[#FAF8F5] to-[#F7F2EA] p-4 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-[#E8DFC8]/80 mb-3">
            <div className="flex items-center gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-md bg-[#12141A] text-[#D4AF37] text-[10px] font-bold">
                ✦
              </span>
              <span className="text-xs font-bold text-[#141720] uppercase tracking-wider font-sans">
                Workspace CRM Performance KPIs
              </span>
            </div>
            <span className="text-[10px] text-[#8C8477] font-medium">Live RLS / Workspace Scope</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            <div className="rounded-xl border border-[#EADBCA] bg-white p-3">
              <div className="text-[10px] uppercase font-bold tracking-wider text-[#6B655B]">Total Input Leads</div>
              <div className="mt-1 text-lg font-bold font-mono text-[#141720]">
                {crmKpisLoading ? "…" : (crmKpis?.totalInputLeads ?? teamLeads.length).toLocaleString()}
              </div>
            </div>
            <div className="rounded-xl border border-[#EADBCA] bg-white p-3">
              <div className="text-[10px] uppercase font-bold tracking-wider text-[#6B655B]">Active Leads</div>
              <div className="mt-1 text-lg font-bold font-mono text-[#141720]">
                {crmKpisLoading ? "…" : (crmKpis?.activeLeads ?? teamActivePipelineCount).toLocaleString()}
              </div>
            </div>
            <div className="rounded-xl border border-[#EADBCA] bg-white p-3">
              <div className="text-[10px] uppercase font-bold tracking-wider text-[#6B655B]">Conversion Rate</div>
              <div className="mt-1 text-lg font-bold font-mono text-emerald-700">
                {crmKpisLoading ? "…" : crmKpis ? `${crmKpis.conversionRatePct.toFixed(1)}%` : "INSUFFICIENT DATA"}
              </div>
            </div>
            <div className="rounded-xl border border-[#EADBCA] bg-white p-3">
              <div className="text-[10px] uppercase font-bold tracking-wider text-[#6B655B]">Outflow Leads</div>
              <div className="mt-1 text-lg font-bold font-mono text-[#C85A0D]">
                {crmKpisLoading ? "…" : crmKpis ? crmKpis.outflowLeads.toLocaleString() : "INSUFFICIENT DATA"}
              </div>
            </div>
            <div className="rounded-xl border border-[#EADBCA] bg-white p-3">
              <div className="text-[10px] uppercase font-bold tracking-wider text-[#6B655B]">Not Qualified Leads</div>
              <div className="mt-1 text-lg font-bold font-mono text-[#6B655B]">
                {crmKpisLoading ? "…" : crmKpis ? crmKpis.notQualifiedLeads.toLocaleString() : "INSUFFICIENT DATA"}
              </div>
            </div>
          </div>
        </div>

        {/* ── Project Sales Inventory Strip (Manager Privileged Surface) ── */}
        <div className="rounded-2xl border border-[#EADBCA] bg-gradient-to-r from-[#FFFFFF] via-[#FAF8F5] to-[#F7F2EA] p-3.5 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#12141A] text-[#D4AF37] text-xs font-bold shrink-0">
              <Building2 className="h-4 w-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-[#141720]">Project Sales Inventory: </span>
                <span className="rounded bg-[#EBF7EE] border border-[#C2E7CB] px-1.5 py-0.2 text-[8px] font-bold text-[#1A7338] uppercase tracking-wider">
                  Manager Authorized
                </span>
              </div>
              <p className="text-[#6B655B] text-[11px] mt-0.5">Authorized property catalog with inventory management and unit availability controls.</p>
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            <span className="rounded-full bg-[#F3EFE6] border border-[#DDD5C5] px-2.5 py-1 text-[10px] font-mono font-bold text-[#4A453A]">
              {previewsLoaded && marketplacePropertyCount !== null ? `${marketplacePropertyCount} ${marketplacePropertyCount === 1 ? "Property" : "Properties"}` : "Catalog"}
            </span>
            <Link
              to="/app/marketplace"
              className="inline-flex items-center gap-1 rounded-xl border border-[#2B313F] bg-[#12141A] px-3.5 py-1 text-xs font-bold text-[#E5C368] hover:bg-[#1E232E] hover:text-[#FFF] hover:border-[#D4AF37] transition-all shadow-xs"
            >
              <span>Manage Catalog</span>
              <ArrowUpRight className="h-3 w-3 text-[#FF7722]" />
            </Link>
          </div>
        </div>

        {/* ── TEAM EXECUTIVES WORKLOAD & DISTRIBUTION ── */}
        <section className="rounded-2xl p-4 sm:p-5 border border-[#EADBCA] bg-gradient-to-b from-[#FFFFFF] via-[#FAF8F4] to-[#F5EFE6] shadow-md space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[#E8DFC8]">
            <div className="flex items-center gap-2.5">
              <span className="h-2.5 w-2.5 rounded-full bg-[#D4AF37] animate-pulse" />
              <h2 className="font-serif text-base font-bold text-[#141720]">
                Team Executives & Workload Distribution
              </h2>
              <span className="rounded-full bg-[#FFF8EB] border border-[#FDE6B8] px-2.5 py-0.5 text-[10px] font-mono font-bold text-[#B87A14]">
                {teamLeadsLoading ? "…" : `${executiveAggregates.filter((e) => e.name !== "Unassigned").length} Executives`}
              </span>
            </div>
            <Link
              to="/app/leads"
              className="inline-flex items-center gap-1 text-xs font-bold text-[#C85A0D] hover:text-[#9A4205] transition-colors"
            >
              <span>Manage Lead Assignments</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {teamLeadsLoading ? (
            <div className="p-8 text-center text-sm text-[#8C8477] animate-pulse">
              Loading executive performance aggregates…
            </div>
          ) : executiveAggregates.length === 0 ? (
            <div className="p-8 text-center space-y-2 rounded-xl border border-[#E5DBCA] bg-[#FFFFFF]">
              <Users className="h-8 w-8 mx-auto text-[#B5ABA0]" />
              <p className="text-sm font-bold text-[#2A2E39]">No team assignments found</p>
              <p className="text-xs text-[#7A7366] max-w-sm mx-auto">
                Executive performance breakdown requires live team assignment. Assign leads in the CRM table to view executive distribution.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {executiveAggregates.map((exec) => {
                const isUnassigned = exec.name === "Unassigned";
                return (
                  <div
                    key={exec.name}
                    className={`rounded-xl border p-3.5 flex flex-col justify-between transition-all ${
                      isUnassigned
                        ? "border-[#FFD8C2] bg-[#FFF8F5]"
                        : "border-[#EADBCA] bg-white hover:border-[#D4AF37] hover:shadow-xs"
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <div className={`h-8 w-8 rounded-lg flex items-center justify-center font-bold text-xs ${
                            isUnassigned
                              ? "bg-[#FFF2EA] text-[#C85A0D] border border-[#FFD8C2]"
                              : "bg-[#12141A] text-[#E5C368] border border-[#C5A059]/40"
                          }`}>
                            {isUnassigned ? "UQ" : exec.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-bold text-sm text-[#141720] leading-tight">
                              {exec.name}
                            </div>
                            <div className="text-[10px] text-[#6B655B] mt-0.5">
                              {isUnassigned ? "Unassigned Pool" : "Sales Executive"}
                            </div>
                          </div>
                        </div>
                        <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold font-mono ${
                          isUnassigned
                            ? "bg-[#FFF2EA] text-[#C85A0D] border border-[#FFD8C2]"
                            : "bg-[#F5EFE6] text-[#4A453A] border border-[#DDD5C5]"
                        }`}>
                          {exec.assignedLeads} {exec.assignedLeads === 1 ? "Lead" : "Leads"}
                        </span>
                      </div>

                      <div className="grid grid-cols-3 gap-2 mt-3 pt-2.5 border-t border-[#EFE8DC] text-center">
                        <div className="rounded-lg bg-[#FAF8F5] p-1.5">
                          <div className="text-[9px] uppercase tracking-wider text-[#6B655B] font-bold">Active</div>
                          <div className="text-xs font-bold text-[#141720] font-mono mt-0.5">{exec.activeLeads}</div>
                        </div>
                        <div className="rounded-lg bg-[#FAF8F5] p-1.5">
                          <div className="text-[9px] uppercase tracking-wider text-[#6B655B] font-bold">Appts</div>
                          <div className="text-xs font-bold text-[#B87A14] font-mono mt-0.5">{exec.appointments}</div>
                        </div>
                        <div className="rounded-lg bg-[#FAF8F5] p-1.5">
                          <div className="text-[9px] uppercase tracking-wider text-[#6B655B] font-bold">Booked</div>
                          <div className="text-xs font-bold text-emerald-700 font-mono mt-0.5">{exec.conversions}</div>
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 pt-2.5 border-t border-[#EFE8DC] flex items-center justify-between text-[11px]">
                      <span className="text-[#6B655B] font-medium">Active Budget: <strong className="text-[#141720] font-mono">{formatPipelineBudgetInr(exec.activeLeadBudget)}</strong></span>
                      <Link
                        to="/app/leads"
                        className="font-bold text-[#C85A0D] hover:underline text-[11px]"
                      >
                        Drill Down →
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* ── TEAM LEADS DISTRIBUTION TABLE ── */}
        <section className="rounded-2xl p-4 sm:p-5 border border-[#EADBCA] bg-gradient-to-b from-[#FFFFFF] via-[#FAF8F4] to-[#F5EFE6] shadow-md space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[#E8DFC8]">
            <div className="flex items-center gap-2.5">
              <span className="h-2.5 w-2.5 rounded-full bg-[#E06A1A] animate-pulse" />
              <h2 className="font-serif text-base font-bold text-[#141720]">
                Workspace Lead Queue & Assignments
              </h2>
              <span className="rounded-full bg-[#FFF2EA] border border-[#FFD8C2] px-2.5 py-0.5 text-[10px] font-mono font-bold text-[#C85A0D]">
                {teamLeadsLoading ? "…" : `${teamLeads.length} Total`}
              </span>
            </div>
            <Link
              to="/app/leads"
              className="inline-flex items-center gap-1 text-xs font-bold text-[#C85A0D] hover:text-[#9A4205] transition-colors"
            >
              <span>Open Full Leads Table</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {teamLeadsLoading ? (
            <div className="p-8 text-center text-sm text-[#8C8477] animate-pulse">
              Loading workspace leads from Sentinel Fort…
            </div>
          ) : teamLeads.length === 0 ? (
            <div className="p-8 text-center space-y-2 rounded-xl border border-[#E5DBCA] bg-[#FFFFFF]">
              <Users className="h-8 w-8 mx-auto text-[#B5ABA0]" />
              <p className="text-sm font-bold text-[#2A2E39]">No leads in this workspace</p>
              <p className="text-xs text-[#7A7366] max-w-sm mx-auto">
                Incoming leads captured via marketing campaigns or channel partners will populate here for management oversight and executive distribution.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-[#E8DFC8] bg-white shadow-2xs">
              <table className="w-full text-left text-xs text-[#2A2E39]">
                <thead>
                  <tr className="border-b border-[#E8DFC8] bg-[#F7F2EA] text-[10px] uppercase tracking-wider text-[#6B655B] font-bold">
                    <th className="py-2.5 px-4">Lead</th>
                    <th className="py-2.5 px-4">Assigned Executive</th>
                    <th className="py-2.5 px-4">Stage</th>
                    <th className="py-2.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EFE8DC]">
                  {teamLeads.slice(0, 10).map((lead) => {
                    const isUnassigned = !lead.ownerName || lead.ownerName === "Unassigned" || lead.ownerName === "none";
                    return (
                      <tr key={lead.id} className="hover:bg-[#FAF7F2] transition-colors">
                        <td className="py-3 px-4">
                          <div className="font-bold text-[#141720] text-sm">{lead.name}</div>
                          <div className="text-[11px] text-[#6B655B] mt-0.5">
                            {lead.project || "General Inquiry"} · <span className="text-[#A07015] font-semibold">{lead.budget}</span> · {lead.source || "Direct"}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          {isUnassigned ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-[#FFF2EA] border border-[#FFD8C2] px-2.5 py-0.5 text-[10px] font-bold text-[#C85A0D]">
                              <AlertCircle className="h-2.5 w-2.5" /> Unassigned
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 font-semibold text-[#141720]">
                              <span className="h-1.5 w-1.5 rounded-full bg-[#059669]" />
                              {lead.ownerName}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#F5EFE6] border border-[#DDD5C5] px-2.5 py-0.5 text-[11px] font-bold text-[#3A352C]">
                            {lead.stage}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <Link
                            to="/app/leads"
                            search={{ leadId: lead.id } as any}
                            className="inline-flex items-center gap-1 rounded-full border border-[#C5A059]/70 bg-[#12141A] px-3.5 py-1 text-xs font-bold text-[#E5C368] hover:bg-[#1E232E] hover:text-[#FFF] hover:border-[#D4AF37] transition-all shadow-xs"
                          >
                            <span>Open</span>
                            <ArrowUpRight className="h-3 w-3 text-[#FF7722]" />
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* ── Footer ── */}
        <footer className="pt-2 border-t border-[#E8DFC8] text-center text-[10px] text-[#8C8477]">
          <p>SENTINEL FORT · SALES MANAGER COMMAND CENTER · Team Oversight, Distribution & Portfolio Conversion.</p>
        </footer>
      </div>
    );
  }

  return (
    <div className="relative w-full px-3 sm:px-5 py-3 max-w-[1600px] mx-auto space-y-2.5">
      {/* ── Top Hero: Compact Golden Executive Banner ── */}
      <section className="relative overflow-hidden rounded-2xl border border-[#2E2614] bg-gradient-to-r from-[#12151C] via-[#161B26] to-[#12151C] py-2.5 px-4 shadow-lg">
        <GoldTerrainBackground />

        <div className="relative z-10 flex flex-wrap items-center justify-between gap-3">
          {/* Left: Emblem + Title + OS Tagline */}
          <div className="flex items-center gap-3">
            <SpartanShieldIcon size={38} className="hover:scale-105 transition-transform duration-300 shrink-0" />
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-serif text-base sm:text-lg font-bold tracking-[0.2em] text-stone-100 uppercase leading-none">
                  SENTINEL FORT
                </h1>
                <span className="text-[9px] font-bold uppercase tracking-[0.22em] text-[#D4AF37]">
                  {isSalesExecutive ? "SALES EXECUTIVE" : "OS"}
                </span>
              </div>
              <div className="mt-0.5 flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-[0.2em] text-[#D4AF37]">
                {isSalesExecutive ? (
                  <>
                    <span>INTELLIGENCE</span>
                    <span className="text-[7px] opacity-60">✦</span>
                    <span>PIPELINE</span>
                    <span className="text-[7px] opacity-60">✦</span>
                    <span>DEALS</span>
                  </>
                ) : (
                  <>
                    <span>INTELLIGENCE</span>
                    <span className="text-[7px] opacity-60">✦</span>
                    <span>GOVERNANCE</span>
                    <span className="text-[7px] opacity-60">✦</span>
                    <span>GROWTH</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Right: Authenticated Identity & Live Workspace Badges */}
          {workspace && (
            <div className="flex flex-wrap items-center gap-2 text-[10px]">
              <span className="font-bold text-stone-200">
                {workspace.workspaceName ?? "WORKSPACE"}
              </span>
              {workspace.workspaceId && (
                <span
                  className="rounded-full border border-[#2E2614] bg-[#181D2A] px-2 py-0.5 font-mono text-[9px] text-stone-300 font-medium shadow-2xs"
                  title="Workspace ID (server-resolved)"
                >
                  {workspace.workspaceId}
                </span>
              )}
              {workspace.workspacePublicId && (
                <span className="rounded-full border border-[#2E2614] bg-[#181D2A] px-2 py-0.5 font-mono text-[9px] text-[#E5C368] font-bold shadow-2xs">
                  {workspace.workspacePublicId}
                </span>
              )}
              {workspace.role.appRoles.length > 0 && (
                <span className="rounded-full bg-[#241F14] border border-[#524422] px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-[#E5C368]">
                  Role: {isSalesExecutive ? "Sales Executive" : workspace.role.appRoles.join(" · ")}
                </span>
              )}
              <span className="flex items-center gap-1 text-[9px] font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-800 rounded-full px-2 py-0.5">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                {workspace.status}
              </span>
            </div>
          )}
        </div>
      </section>

      {/* ── TODAY'S SENTINEL SUMMARY (Compact Executive Briefing Strip) ── */}
      <section className="fort-hub-card rounded-2xl p-3 sm:p-3.5 border border-[#262D3D] bg-gradient-to-br from-[#12151C] via-[#151923] to-[#12151C] shadow-lg">
        <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-[#232834]">
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-[#D4AF37] animate-pulse shrink-0" />
            <span className="text-[9px] font-bold uppercase tracking-[0.22em] text-[#D4AF37]">
              EXECUTIVE BRIEFING
            </span>
            <span className="text-stone-600">·</span>
            <h2 className="font-serif text-sm font-bold tracking-tight text-stone-100">
              Today's Sentinel Summary
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-[#181D28] border border-[#2A3142] px-2.5 py-0.5 text-[10px] font-bold text-stone-300 shadow-2xs">
              {new Date().toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" })}
            </span>
            <span
              className="inline-flex items-center gap-1 rounded-full bg-[#241F14] border border-[#524422] px-2.5 py-0.5 font-mono text-[10px] font-bold text-[#E5C368] shadow-2xs"
              title="Live local time"
            >
              <Clock className="h-3 w-3 text-[#D4AF37]" />
              {fortClock}
            </span>
            <div className="flex items-center gap-1.5">
              {isSalesExecutive ? (
                <>
                  <Link
                    to="/app/leads"
                    className="rounded-lg border border-[#2E3648] bg-[#161A24] px-2 py-0.5 text-[10px] font-bold text-stone-200 hover:bg-[#202634] hover:border-[#D4AF37]/50 transition-colors"
                  >
                    Leads
                  </Link>
                  <Link
                    to="/app/crm"
                    className="rounded-lg border border-[#2E3648] bg-[#161A24] px-2 py-0.5 text-[10px] font-bold text-stone-200 hover:bg-[#202634] hover:border-[#D4AF37]/50 transition-colors"
                  >
                    CRM
                  </Link>
                  <Link
                    to="/app/dealrooms"
                    className="rounded-lg border border-[#2E3648] bg-[#161A24] px-2 py-0.5 text-[10px] font-bold text-stone-200 hover:bg-[#202634] hover:border-[#D4AF37]/50 transition-colors"
                  >
                    Deals
                  </Link>
                </>
              ) : (
                <>
                  <Link
                    to="/app/crm"
                    className="rounded-lg border border-[#2E3648] bg-[#161A24] px-2 py-0.5 text-[10px] font-bold text-stone-200 hover:bg-[#202634] hover:border-[#D4AF37]/50 transition-colors"
                  >
                    CRM
                  </Link>
                  <Link
                    to="/app/market"
                    className="rounded-lg border border-[#2E3648] bg-[#161A24] px-2 py-0.5 text-[10px] font-bold text-stone-200 hover:bg-[#202634] hover:border-[#D4AF37]/50 transition-colors"
                  >
                    Market
                  </Link>
                </>
              )}
              <Link
                to={SUPREME_INTELLIGENCE_ROUTE}
                className="fort-btn-gold px-2.5 py-0.5 rounded-lg text-[10px] font-bold"
              >
                Supreme AI
              </Link>
              <button
                type="button"
                onClick={openSupremeVoice}
                aria-label="Direct Supreme Voice Command"
                className="inline-flex items-center gap-1 rounded-lg border border-[#524422] bg-[#241F14] px-2 py-0.5 text-[10px] font-bold text-[#E5C368] hover:bg-[#332A18] transition-colors cursor-pointer"
              >
                <Mic className="h-3 w-3 text-[#D4AF37]" />
                <span>Voice</span>
              </button>
            </div>
          </div>
        </div>

        {/* 6 High-Density Operational Signal Chips */}
        <div className="mt-2.5 grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-2">
          {/* Signal 1: Leads */}
          <div className="rounded-xl border border-[#232834] bg-[#151923]/90 backdrop-blur-xs p-2 flex flex-col justify-between hover:border-[#D4AF37]/40 transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-bold uppercase tracking-wider text-stone-400">
                {isSalesExecutive ? "Assigned Leads" : "Inbound Leads"}
              </span>
              <Users className="h-3.5 w-3.5 text-[#D4AF37]" />
            </div>
            <div className="mt-1">
              <div className="text-base font-bold text-stone-100 font-mono leading-tight">
                {!previewsLoaded ? "…" : leadCount !== null ? leadCount.toLocaleString() : (
                  <span className="text-[10px] font-medium text-stone-500">Data pending</span>
                )}
              </div>
              <p className="text-[9px] text-stone-500 font-medium">
                {isSalesExecutive ? "Assigned scope" : "CRM records"}
              </p>
            </div>
          </div>

          {/* Signal 2: Active Deals */}
          <div className="rounded-xl border border-[#232834] bg-[#151923]/90 backdrop-blur-xs p-2 flex flex-col justify-between hover:border-[#D4AF37]/40 transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-bold uppercase tracking-wider text-stone-400">
                {isSalesExecutive ? "Assigned Deals" : "Active Deals"}
              </span>
              <TrendingUp className="h-3.5 w-3.5 text-[#D4AF37]" />
            </div>
            <div className="mt-1">
              <div className="text-base font-bold text-stone-100 font-mono leading-tight">
                {!previewsLoaded ? "…" : dealCount !== null ? dealCount.toLocaleString() : (
                  <span className="text-[10px] font-medium text-stone-500">Data pending</span>
                )}
              </div>
              <p className="text-[9px] text-stone-500 font-medium">
                {isSalesExecutive ? "Deal room scope" : "Dealrooms"}
              </p>
            </div>
          </div>

          {/* Signal 3: Catalog & Inventory */}
          <div className="rounded-xl border border-[#232834] bg-[#151923]/90 backdrop-blur-xs p-2 flex flex-col justify-between hover:border-[#D4AF37]/40 transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-bold uppercase tracking-wider text-stone-400">Listings</span>
              <Package className="h-3.5 w-3.5 text-[#D4AF37]" />
            </div>
            <div className="mt-1">
              <div className="text-base font-bold text-stone-100 font-mono leading-tight">
                {!previewsLoaded ? "…" : listingCount !== null ? listingCount.toLocaleString() : (
                  <span className="text-[10px] font-medium text-stone-500">Data pending</span>
                )}
              </div>
              <p className="text-[9px] text-stone-500 font-medium">Market catalog</p>
            </div>
          </div>

          {/* Signal 4: Action Items */}
          <div className="rounded-xl border border-[#232834] bg-[#151923]/90 backdrop-blur-xs p-2 flex flex-col justify-between hover:border-[#D4AF37]/40 transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-bold uppercase tracking-wider text-stone-400">Action Required</span>
              <AlertCircle className="h-3.5 w-3.5 text-[#D4AF37]" />
            </div>
            <div className="mt-1">
              <div className="text-sm font-bold text-stone-100 leading-tight truncate">
                {leadCount !== null && leadCount > 0 ? "Follow-up ready" : "No alerts"}
              </div>
              <p className="text-[9px] text-stone-500 font-medium">Pipeline tasks</p>
            </div>
          </div>

          {/* Signal 5: Governance / Operational Posture */}
          <div className="rounded-xl border border-[#232834] bg-[#151923]/90 backdrop-blur-xs p-2 flex flex-col justify-between hover:border-[#D4AF37]/40 transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-bold uppercase tracking-wider text-stone-400">
                {isSalesExecutive ? "Field Posture" : "Governance"}
              </span>
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
            </div>
            <div className="mt-1">
              <div className="text-sm font-bold text-stone-100 leading-tight">
                Nominal
              </div>
              <p className="text-[9px] text-stone-500 font-medium">
                {isSalesExecutive ? "Field active" : "Audit ready"}
              </p>
            </div>
          </div>

          {/* Signal 6: Communications */}
          <div className="rounded-xl border border-[#232834] bg-[#151923]/90 backdrop-blur-xs p-2 flex flex-col justify-between hover:border-[#D4AF37]/40 transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-bold uppercase tracking-wider text-stone-400">Channels</span>
              <MessageSquare className="h-3.5 w-3.5 text-[#D4AF37]" />
            </div>
            <div className="mt-1">
              <div className="text-sm font-bold text-stone-100 leading-tight">
                {!previewsLoaded ? "…" : activityCount !== null ? `${activityCount} Logs` : "Connected"}
              </div>
              <p className="text-[9px] text-stone-500 font-medium">Team & clients</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Main Layout: 8 Experience Cards + Right Telemetry Sidebar ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-start">
        {/* ── Left / Center: 8 Experience Cards (8 cols on lg, 9 cols on xl) ── */}
        <div className="lg:col-span-8 xl:col-span-9 space-y-2.5">
          <div className="grid grid-cols-2 sm:grid-cols-2 xl:grid-cols-4 gap-2.5">
            {isSalesExecutive ? (
              <>
                {/* 1. LEADS CARD (Primary for Sales Executive) */}
                <div className="fort-hub-card rounded-xl p-3 flex flex-col justify-between min-h-[135px]">
                  <div>
                    <div className="flex items-start justify-between">
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#241F14] border border-[#524422] text-[#E5C368] shadow-2xs">
                        <Filter className="h-4 w-4" />
                      </div>
                    </div>
                    <div className="mt-2">
                      <h3 className="text-xs font-bold text-stone-100 tracking-tight leading-tight">LEADS</h3>
                      <p className="text-[10px] text-stone-400 font-medium truncate">Pipeline & Flow</p>
                    </div>
                  </div>
                  <div className="mt-2 pt-2 border-t border-[#232834]">
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="text-[10px] text-stone-400 font-medium">Pipeline</span>
                      <MetricValue value={leadsPipelineCount ?? leadCount} loaded={previewsLoaded} />
                    </div>
                    <Link
                      to="/app/leads"
                      className="fort-btn-gold block w-full py-1 rounded-lg text-[10px] text-center font-bold"
                    >
                      Open Leads
                    </Link>
                  </div>
                </div>

                {/* 2. CRM CARD */}
                <div className="fort-hub-card rounded-xl p-3 flex flex-col justify-between min-h-[135px]">
                  <div>
                    <div className="flex items-start justify-between">
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#241F14] border border-[#524422] text-[#E5C368] shadow-2xs">
                        <Users className="h-4 w-4" />
                      </div>
                    </div>
                    <div className="mt-2">
                      <h3 className="text-xs font-bold text-stone-100 tracking-tight leading-tight">CRM</h3>
                      <p className="text-[10px] text-stone-400 font-medium truncate">Customer Management</p>
                    </div>
                  </div>
                  <div className="mt-2 pt-2 border-t border-[#232834]">
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="text-[10px] text-stone-400 font-medium">Assigned</span>
                      <MetricValue value={leadCount} loaded={previewsLoaded} />
                    </div>
                    <Link
                      to="/app/crm"
                      className="fort-btn-gold block w-full py-1 rounded-lg text-[10px] text-center font-bold"
                    >
                      Open CRM
                    </Link>
                  </div>
                </div>

                {/* 3. DEAL ROOMS CARD */}
                <div className="fort-hub-card rounded-xl p-3 flex flex-col justify-between min-h-[135px]">
                  <div>
                    <div className="flex items-start justify-between">
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#241F14] border border-[#524422] text-[#E5C368] shadow-2xs">
                        <Network className="h-4 w-4" />
                      </div>
                    </div>
                    <div className="mt-2">
                      <h3 className="text-xs font-bold text-stone-100 tracking-tight leading-tight">DEAL ROOMS</h3>
                      <p className="text-[10px] text-stone-400 font-medium truncate">Negotiations & Closings</p>
                    </div>
                  </div>
                  <div className="mt-2 pt-2 border-t border-[#232834]">
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="text-[10px] text-stone-400 font-medium">Deals</span>
                      <MetricValue value={dealCount} loaded={previewsLoaded} />
                    </div>
                    <Link
                      to="/app/dealrooms"
                      className="fort-btn-gold block w-full py-1 rounded-lg text-[10px] text-center font-bold"
                    >
                      Open Deal Rooms
                    </Link>
                  </div>
                </div>

                {/* 4. COMMUNICATIONS / MESSAGES CARD */}
                <div className="fort-hub-card rounded-xl p-3 flex flex-col justify-between min-h-[135px]">
                  <div>
                    <div className="flex items-start justify-between">
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#241F14] border border-[#524422] text-[#E5C368] shadow-2xs">
                        <MessageSquare className="h-4 w-4" />
                      </div>
                    </div>
                    <div className="mt-2">
                      <h3 className="text-xs font-bold text-stone-100 tracking-tight leading-tight">MESSAGES</h3>
                      <p className="text-[10px] text-stone-400 font-medium truncate">Alerts & Client Hub</p>
                    </div>
                  </div>
                  <div className="mt-2 pt-2 border-t border-[#232834]">
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="text-[10px] text-stone-400 font-medium">Logs</span>
                      <MetricValue value={activityCount} loaded={previewsLoaded} />
                    </div>
                    <Link
                      to="/app/messages"
                      className="fort-btn-gold block w-full py-1 rounded-lg text-[10px] text-center font-bold"
                    >
                      Open Messages
                    </Link>
                  </div>
                </div>

                {/* 5. AI VOICE CARD */}
                <div className="fort-hub-card rounded-xl p-3 flex flex-col justify-between min-h-[135px]">
                  <div>
                    <div className="flex items-start justify-between">
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#241F14] border border-[#524422] text-[#E5C368] shadow-2xs">
                        <PhoneCall className="h-4 w-4" />
                      </div>
                    </div>
                    <div className="mt-2">
                      <h3 className="text-xs font-bold text-stone-100 tracking-tight leading-tight">AI VOICE</h3>
                      <p className="text-[10px] text-stone-400 font-medium truncate">Follow-up & Calling</p>
                    </div>
                  </div>
                  <div className="mt-2 pt-2 border-t border-[#232834]">
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="text-[10px] text-stone-400 font-medium">Voice AI</span>
                      <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-400">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        READY
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={openSupremeVoice}
                      className="fort-btn-gold block w-full py-1 rounded-lg text-[10px] text-center font-bold cursor-pointer"
                    >
                      Launch Voice
                    </button>
                  </div>
                </div>

                {/* 6. SUPREME INTELLIGENCE CARD */}
                <div className="fort-hub-card rounded-xl p-3 flex flex-col justify-between min-h-[135px]">
                  <div>
                    <div className="flex items-start justify-between">
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#241F14] border border-[#524422] text-[#E5C368] shadow-2xs">
                        <Sparkles className="h-4 w-4" />
                      </div>
                    </div>
                    <div className="mt-2">
                      <h3 className="text-xs font-bold text-stone-100 tracking-tight leading-tight">SUPREME AI</h3>
                      <p className="text-[10px] text-stone-400 font-medium truncate">Cross-Domain Insights</p>
                    </div>
                  </div>
                  <div className="mt-2 pt-2 border-t border-[#232834]">
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="text-[10px] text-stone-400 font-medium">Status</span>
                      <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-400">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        READY
                      </span>
                    </div>
                    <Link
                      to={SUPREME_INTELLIGENCE_ROUTE}
                      className="fort-btn-gold block w-full py-1 rounded-lg text-[10px] text-center font-bold"
                    >
                      Open Intelligence
                    </Link>
                  </div>
                </div>

                {/* 7. INVENTORY CARD */}
                <div className="fort-hub-card rounded-xl p-3 flex flex-col justify-between min-h-[135px]">
                  <div>
                    <div className="flex items-start justify-between">
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#241F14] border border-[#524422] text-[#E5C368] shadow-2xs">
                        <Package className="h-4 w-4" />
                      </div>
                    </div>
                    <div className="mt-2">
                      <h3 className="text-xs font-bold text-stone-100 tracking-tight leading-tight">INVENTORY</h3>
                      <p className="text-[10px] text-stone-400 font-medium truncate">Assets & Units</p>
                    </div>
                  </div>
                  <div className="mt-2 pt-2 border-t border-[#232834]">
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="text-[10px] text-stone-400 font-medium">Assets</span>
                      <MetricValue value={null} loaded={previewsLoaded} />
                    </div>
                    <Link
                      to="/app/inventory"
                      className="fort-btn-gold block w-full py-1 rounded-lg text-[10px] text-center font-bold"
                    >
                      Open Inventory
                    </Link>
                  </div>
                </div>

                {/* 8. MARKET INTELLIGENCE CARD */}
                <div className="fort-hub-card rounded-xl p-3 flex flex-col justify-between min-h-[135px]">
                  <div>
                    <div className="flex items-start justify-between">
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#241F14] border border-[#524422] text-[#E5C368] shadow-2xs">
                        <BarChart3 className="h-4 w-4" />
                      </div>
                    </div>
                    <div className="mt-2">
                      <h3 className="text-xs font-bold text-stone-100 tracking-tight leading-tight">MARKET INTEL</h3>
                      <p className="text-[10px] text-stone-400 font-medium truncate">Analysis & Trends</p>
                    </div>
                  </div>
                  <div className="mt-2 pt-2 border-t border-[#232834]">
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="text-[10px] text-stone-400 font-medium">Listings</span>
                      <MetricValue value={listingCount} loaded={previewsLoaded} />
                    </div>
                    <Link
                      to="/app/market"
                      className="fort-btn-gold block w-full py-1 rounded-lg text-[10px] text-center font-bold"
                    >
                      Open Market
                    </Link>
                  </div>
                </div>
              </>
            ) : (
              <>
                {/* 1. CRM CARD */}
                <div className="fort-hub-card rounded-xl p-3 flex flex-col justify-between min-h-[135px]">
                  <div>
                    <div className="flex items-start justify-between">
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#241F14] border border-[#524422] text-[#E5C368] shadow-2xs">
                        <Users className="h-4 w-4" />
                      </div>
                    </div>
                    <div className="mt-2">
                      <h3 className="text-xs font-bold text-stone-100 tracking-tight leading-tight">CRM</h3>
                      <p className="text-[10px] text-stone-400 font-medium truncate">Customer Management</p>
                    </div>
                  </div>
                  <div className="mt-2 pt-2 border-t border-[#232834]">
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="text-[10px] text-stone-400 font-medium">Leads</span>
                      <MetricValue value={leadCount} loaded={previewsLoaded} />
                    </div>
                    <Link
                      to="/app/crm"
                      className="fort-btn-gold block w-full py-1 rounded-lg text-[10px] text-center font-bold"
                    >
                      Open CRM
                    </Link>
                  </div>
                </div>

                {/* 2. MARKET INTELLIGENCE CARD */}
                <div className="fort-hub-card rounded-xl p-3 flex flex-col justify-between min-h-[135px]">
                  <div>
                    <div className="flex items-start justify-between">
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#241F14] border border-[#524422] text-[#E5C368] shadow-2xs">
                        <BarChart3 className="h-4 w-4" />
                      </div>
                    </div>
                    <div className="mt-2">
                      <h3 className="text-xs font-bold text-stone-100 tracking-tight leading-tight">MARKET INTEL</h3>
                      <p className="text-[10px] text-stone-400 font-medium truncate">Analysis & Trends</p>
                    </div>
                  </div>
                  <div className="mt-2 pt-2 border-t border-[#232834]">
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="text-[10px] text-stone-400 font-medium">Listings</span>
                      <MetricValue value={listingCount} loaded={previewsLoaded} />
                    </div>
                    <Link
                      to="/app/market"
                      className="fort-btn-gold block w-full py-1 rounded-lg text-[10px] text-center font-bold"
                    >
                      Open Market
                    </Link>
                  </div>
                </div>

                {/* 3. INVENTORY CARD */}
                <div className="fort-hub-card rounded-xl p-3 flex flex-col justify-between min-h-[135px]">
                  <div>
                    <div className="flex items-start justify-between">
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#241F14] border border-[#524422] text-[#E5C368] shadow-2xs">
                        <Package className="h-4 w-4" />
                      </div>
                    </div>
                    <div className="mt-2">
                      <h3 className="text-xs font-bold text-stone-100 tracking-tight leading-tight">INVENTORY</h3>
                      <p className="text-[10px] text-stone-400 font-medium truncate">Assets & Units</p>
                    </div>
                  </div>
                  <div className="mt-2 pt-2 border-t border-[#232834]">
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="text-[10px] text-stone-400 font-medium">Assets</span>
                      <MetricValue value={null} loaded={previewsLoaded} />
                    </div>
                    <Link
                      to="/app/inventory"
                      className="fort-btn-gold block w-full py-1 rounded-lg text-[10px] text-center font-bold"
                    >
                      Open Inventory
                    </Link>
                  </div>
                </div>

                {/* 4. LEADS CARD */}
                <div className="fort-hub-card rounded-xl p-3 flex flex-col justify-between min-h-[135px]">
                  <div>
                    <div className="flex items-start justify-between">
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#241F14] border border-[#524422] text-[#E5C368] shadow-2xs">
                        <Filter className="h-4 w-4" />
                      </div>
                    </div>
                    <div className="mt-2">
                      <h3 className="text-xs font-bold text-stone-100 tracking-tight leading-tight">LEADS</h3>
                      <p className="text-[10px] text-stone-400 font-medium truncate">Pipeline & Flow</p>
                    </div>
                  </div>
                  <div className="mt-2 pt-2 border-t border-[#232834]">
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="text-[10px] text-stone-400 font-medium">Pipeline</span>
                      <MetricValue value={leadsPipelineCount} loaded={previewsLoaded} />
                    </div>
                    <Link
                      to="/app/leads"
                      className="fort-btn-gold block w-full py-1 rounded-lg text-[10px] text-center font-bold"
                    >
                      Open Leads
                    </Link>
                  </div>
                </div>

                {/* 5. SUPREME INTELLIGENCE CARD */}
                <div className="fort-hub-card rounded-xl p-3 flex flex-col justify-between min-h-[135px]">
                  <div>
                    <div className="flex items-start justify-between">
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#241F14] border border-[#524422] text-[#E5C368] shadow-2xs">
                        <Sparkles className="h-4 w-4" />
                      </div>
                    </div>
                    <div className="mt-2">
                      <h3 className="text-xs font-bold text-stone-100 tracking-tight leading-tight">SUPREME AI</h3>
                      <p className="text-[10px] text-stone-400 font-medium truncate">Cross-Domain Insights</p>
                    </div>
                  </div>
                  <div className="mt-2 pt-2 border-t border-[#232834]">
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="text-[10px] text-stone-400 font-medium">Status</span>
                      <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-400">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        READY
                      </span>
                    </div>
                    <Link
                      to={SUPREME_INTELLIGENCE_ROUTE}
                      className="fort-btn-gold block w-full py-1 rounded-lg text-[10px] text-center font-bold"
                    >
                      Open Intelligence
                    </Link>
                  </div>
                </div>

                {/* 6. GOVERNANCE CARD */}
                <div className="fort-hub-card rounded-xl p-3 flex flex-col justify-between min-h-[135px]">
                  <div>
                    <div className="flex items-start justify-between">
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#241F14] border border-[#524422] text-[#E5C368] shadow-2xs">
                        <Shield className="h-4 w-4" />
                      </div>
                    </div>
                    <div className="mt-2">
                      <h3 className="text-xs font-bold text-stone-100 tracking-tight leading-tight">GOVERNANCE</h3>
                      <p className="text-[10px] text-stone-400 font-medium truncate">Compliance & Risk</p>
                    </div>
                  </div>
                  <div className="mt-2 pt-2 border-t border-[#232834]">
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="text-[10px] text-stone-400 font-medium">Policies</span>
                      <MetricValue value={null} loaded={previewsLoaded} />
                    </div>
                    <Link
                      to="/app/command"
                      className="fort-btn-gold block w-full py-1 rounded-lg text-[10px] text-center font-bold"
                    >
                      Open Governance
                    </Link>
                  </div>
                </div>

                {/* 7. COMMUNICATIONS CARD */}
                <div className="fort-hub-card rounded-xl p-3 flex flex-col justify-between min-h-[135px]">
                  <div>
                    <div className="flex items-start justify-between">
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#241F14] border border-[#524422] text-[#E5C368] shadow-2xs">
                        <MessageSquare className="h-4 w-4" />
                      </div>
                    </div>
                    <div className="mt-2">
                      <h3 className="text-xs font-bold text-stone-100 tracking-tight leading-tight">MESSAGES</h3>
                      <p className="text-[10px] text-stone-400 font-medium truncate">Alerts & Hub</p>
                    </div>
                  </div>
                  <div className="mt-2 pt-2 border-t border-[#232834]">
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="text-[10px] text-stone-400 font-medium">Unread</span>
                      <MetricValue value={null} loaded={previewsLoaded} />
                    </div>
                    <Link
                      to="/app/messages"
                      className="fort-btn-gold block w-full py-1 rounded-lg text-[10px] text-center font-bold"
                    >
                      Open Messages
                    </Link>
                  </div>
                </div>

                {/* 8. BRANDING CARD */}
                <div className="fort-hub-card rounded-xl p-3 flex flex-col justify-between min-h-[135px]">
                  <div>
                    <div className="flex items-start justify-between">
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#241F14] border border-[#524422] text-[#E5C368] shadow-2xs">
                        <Award className="h-4 w-4" />
                      </div>
                    </div>
                    <div className="mt-2">
                      <h3 className="text-xs font-bold text-stone-100 tracking-tight leading-tight">BRANDING</h3>
                      <p className="text-[10px] text-stone-400 font-medium truncate">Identity & Style</p>
                    </div>
                  </div>
                  <div className="mt-2 pt-2 border-t border-[#232834]">
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="text-[10px] text-stone-400 font-medium">Theme</span>
                      <span className="text-[10px] font-bold text-[#E5C368]">Obsidian / Gold</span>
                    </div>
                    <Link
                      to="/app/settings/branding"
                      className="fort-btn-gold block w-full py-1 rounded-lg text-[10px] text-center font-bold"
                    >
                      Open Branding
                    </Link>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* ── Bottom Compact Quote Strip ── */}
          <div className="rounded-xl border border-[#262D3D] bg-gradient-to-r from-[#12151C] via-[#181D28] to-[#12151C] py-1.5 px-4 text-center shadow-md">
            <p className="font-serif italic text-xs text-stone-300 tracking-wide inline">
              “We don't just build businesses. We build legacies.”
            </p>
            <span className="ml-2 text-[9px] uppercase tracking-[0.16em] font-bold text-[#D4AF37]">
              — The Sentinel Principle
            </span>
          </div>
        </div>

        {/* ── Right Column: Telemetry & Activity Panels (4 cols on lg, 3 cols on xl) ── */}
        <aside className="lg:col-span-4 xl:col-span-3 space-y-2.5">
          {/* 1. FORT OVERVIEW */}
          <div className="fort-hub-card rounded-xl p-3 border border-[#232834] bg-[#121622]">
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-bold uppercase tracking-wider text-stone-400">SYSTEM TELEMETRY</span>
              <span className="rounded-full bg-emerald-950/60 text-emerald-400 border border-emerald-800 px-1.5 py-0.2 text-[9px] font-bold">
                ONLINE
              </span>
            </div>
            <div className="mt-2 space-y-1">
              {previewsLoaded ? (
                liveSources.length > 0 ? (
                  liveSources.map((s) => (
                    <div key={s.label} className="flex items-center justify-between text-[10px]">
                      <span className="font-medium text-stone-300">{s.label}</span>
                      <span className="font-mono font-bold text-stone-100">{s.value}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-[10px] text-stone-500 font-medium">
                    INSUFFICIENT DATA — awaiting live sources.
                  </p>
                )
              ) : (
                <p className="text-[10px] text-stone-500 font-medium">SYNCHRONIZING SOURCES …</p>
              )}
            </div>
          </div>

          {/* 2. ACTIVITY FEED */}
          <div className="fort-hub-card rounded-xl p-3 border border-[#232834] bg-[#121622]">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[9px] font-bold uppercase tracking-wider text-stone-400">ACTIVITY FEED</span>
              <Activity className="h-3 w-3 text-stone-500" />
            </div>
            <div className="text-[10px] text-stone-400 font-medium leading-snug">
              No live audit stream is configured. Telemetry updates dynamically as actions occur.
            </div>
            <div className="mt-2 pt-1.5 border-t border-[#232834]">
              <Link
                to="/app/crm"
                className="flex items-center justify-between text-[10px] font-bold text-[#D4AF37] hover:text-[#E5C368] transition-colors"
              >
                <span>Open CRM Operations</span>
                <ChevronRight className="h-3 w-3" />
              </Link>
            </div>
          </div>

          {/* 3. FORT AI INSIGHT */}
          <div className="fort-hub-card rounded-xl p-3 bg-gradient-to-br from-[#181624] to-[#12151E] border-[#362E48]">
            <div className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-[#D4AF37]">
              <Sparkles className="h-3 w-3" />
              <span>SUPREME INTELLIGENCE</span>
            </div>
            <p className="mt-1 text-[10px] text-stone-300 font-medium leading-snug">
              Cross-domain intelligence is ready. Run an assessment to generate evidence-backed insights.
            </p>
            <div className="mt-2 pt-1.5 border-t border-[#2D283E]">
              <Link
                to={SUPREME_INTELLIGENCE_ROUTE}
                className="flex items-center justify-between text-[10px] font-bold text-[#D4AF37] hover:text-[#E5C368]"
              >
                <span>Launch Supreme Assessment</span>
                <ChevronRight className="h-3 w-3" />
              </Link>
            </div>
          </div>
        </aside>
      </div>

      {/* ── Footer ── */}
      <footer className="pt-2 border-t border-[#232834] text-center text-[10px] text-stone-500">
        <p>ONE FORT. FOUR EXPERIENCES. ENDLESS POSSIBILITIES. · Unified Executive Command.</p>
      </footer>
    </div>
  );
}

