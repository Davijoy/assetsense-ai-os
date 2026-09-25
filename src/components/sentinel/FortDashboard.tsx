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
  type LucideIcon,
} from "lucide-react";
import type { LiveLead } from "@/lib/crm.functions";
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

  useEffect(() => {
    if (!isSalesExecutive) return;
    let active = true;
    setAssignedLeadsLoading(true);
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
    return () => {
      active = false;
    };
  }, [isSalesExecutive]);

  const appointmentCount = useMemo(() => {
    return assignedLeads.filter(
      (l) =>
        (l.siteVisitDate && l.siteVisitDate.trim()) ||
        (l.followUpDate && l.followUpDate.trim() && l.followUpStatus !== "completed")
    ).length;
  }, [assignedLeads]);

  if (isSalesExecutive) {
    return (
      <div className="relative w-full px-3 sm:px-5 py-3 max-w-[1600px] mx-auto space-y-4">
        {/* ── Top Hero: Sales Executive Virtual Office Banner ── */}
        <section className="relative overflow-hidden rounded-2xl border border-[#2E2614] bg-gradient-to-r from-[#12151C] via-[#161B26] to-[#12151C] py-3 px-5 shadow-lg">
          <GoldTerrainBackground />

          <div className="relative z-10 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <SpartanShieldIcon size={40} className="hover:scale-105 transition-transform duration-300 shrink-0" />
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="font-serif text-lg font-bold tracking-[0.2em] text-stone-100 uppercase leading-none">
                    SENTINEL FORT
                  </h1>
                  <span className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#D4AF37]">
                    MY VIRTUAL OFFICE
                  </span>
                </div>
                <div className="mt-1 flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-[0.2em] text-[#D4AF37]">
                  <span>INTELLIGENCE</span>
                  <span className="text-[7px] opacity-60">✦</span>
                  <span>PIPELINE</span>
                  <span className="text-[7px] opacity-60">✦</span>
                  <span>DEALS</span>
                </div>
              </div>
            </div>

            {/* Right: Authenticated Identity & Live Workspace Badges */}
            {workspace && (
              <div className="flex flex-wrap items-center gap-2 text-[10px]">
                <span className="font-bold text-stone-200">
                  {workspace.workspaceName ?? "Sentinel Fort HQ"}
                </span>
                {workspace.workspacePublicId && (
                  <span className="rounded-full border border-[#2E2614] bg-[#181D2A] px-2.5 py-0.5 font-mono text-[9px] text-[#E5C368] font-bold shadow-2xs">
                    {workspace.workspacePublicId}
                  </span>
                )}
                <span className="rounded-full bg-[#241F14] border border-[#524422] px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-[#E5C368]">
                  Sales Executive
                </span>
                <span className="flex items-center gap-1 text-[9px] font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-800 rounded-full px-2.5 py-0.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  {workspace.status}
                </span>
              </div>
            )}
          </div>
        </section>

        {/* ── 4 PRIMARY VIRTUAL OFFICE CARDS ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {/* 1. My Leads */}
          <div className="fort-hub-card rounded-2xl p-4 flex flex-col justify-between border border-[#262D3D] bg-gradient-to-br from-[#12151C] via-[#151923] to-[#12151C] shadow-lg min-h-[160px]">
            <div>
              <div className="flex items-start justify-between">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#241F14] border border-[#524422] text-[#E5C368] shadow-2xs">
                  <Users className="h-5 w-5" />
                </div>
                <span className="rounded-full bg-[#181D28] border border-[#2A3142] px-2.5 py-0.5 text-[10px] font-mono font-bold text-stone-300">
                  {assignedLeadsLoading ? "…" : assignedLeads.length} Leads
                </span>
              </div>
              <div className="mt-3">
                <h3 className="text-sm font-bold text-stone-100 tracking-tight">MY LEADS</h3>
                <p className="text-xs text-stone-400 font-medium mt-0.5">Assigned CRM Leads & Pipeline</p>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-[#232834]">
              <Link
                to="/app/leads"
                className="fort-btn-gold block w-full py-1.5 rounded-xl text-xs text-center font-bold"
              >
                Open My Leads
              </Link>
            </div>
          </div>

          {/* 2. My Appointments */}
          <div className="fort-hub-card rounded-2xl p-4 flex flex-col justify-between border border-[#262D3D] bg-gradient-to-br from-[#12151C] via-[#151923] to-[#12151C] shadow-lg min-h-[160px]">
            <div>
              <div className="flex items-start justify-between">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#241F14] border border-[#524422] text-[#E5C368] shadow-2xs">
                  <Clock className="h-5 w-5" />
                </div>
                <span className="rounded-full bg-[#181D28] border border-[#2A3142] px-2.5 py-0.5 text-[10px] font-mono font-bold text-stone-300">
                  {assignedLeadsLoading ? "…" : appointmentCount} Active
                </span>
              </div>
              <div className="mt-3">
                <h3 className="text-sm font-bold text-stone-100 tracking-tight">MY APPOINTMENTS</h3>
                <p className="text-xs text-stone-400 font-medium mt-0.5">Site visits & scheduled follow-ups</p>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-[#232834]">
              <Link
                to="/app/crm"
                className="fort-btn-gold block w-full py-1.5 rounded-xl text-xs text-center font-bold"
              >
                Open Schedule
              </Link>
            </div>
          </div>

          {/* 3. Sales Inventory */}
          <div className="fort-hub-card rounded-2xl p-4 flex flex-col justify-between border border-[#262D3D] bg-gradient-to-br from-[#12151C] via-[#151923] to-[#12151C] shadow-lg min-h-[160px]">
            <div>
              <div className="flex items-start justify-between">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#241F14] border border-[#524422] text-[#E5C368] shadow-2xs">
                  <Building2 className="h-5 w-5" />
                </div>
                <span className="rounded-full bg-[#181D28] border border-[#2A3142] px-2.5 py-0.5 text-[10px] font-mono font-bold text-stone-300">
                  {previewsLoaded && listingCount !== null ? `${listingCount} Units` : "Catalog"}
                </span>
              </div>
              <div className="mt-3">
                <h3 className="text-sm font-bold text-stone-100 tracking-tight">SALES INVENTORY</h3>
                <p className="text-xs text-stone-400 font-medium mt-0.5">Active property catalog & unit availability</p>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-[#232834]">
              <Link
                to="/app/marketplace"
                className="fort-btn-gold block w-full py-1.5 rounded-xl text-xs text-center font-bold"
              >
                View Inventory
              </Link>
            </div>
          </div>

          {/* 4. My Performance */}
          <div className="fort-hub-card rounded-2xl p-4 flex flex-col justify-between border border-[#262D3D] bg-gradient-to-br from-[#12151C] via-[#151923] to-[#12151C] shadow-lg min-h-[160px]">
            <div>
              <div className="flex items-start justify-between">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#241F14] border border-[#524422] text-[#E5C368] shadow-2xs">
                  <Award className="h-5 w-5" />
                </div>
                <span className="rounded-full bg-emerald-950/60 border border-emerald-800 px-2.5 py-0.5 text-[10px] font-bold text-emerald-400 flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> Live
                </span>
              </div>
              <div className="mt-3">
                <h3 className="text-sm font-bold text-stone-100 tracking-tight">MY PERFORMANCE</h3>
                <p className="text-xs text-stone-400 font-medium mt-0.5">Conversion velocity & closure pipeline</p>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-[#232834]">
              <Link
                to="/app/crm"
                className="fort-btn-gold block w-full py-1.5 rounded-xl text-xs text-center font-bold"
              >
                View Performance
              </Link>
            </div>
          </div>
        </div>

        {/* ── MY ASSIGNED LEADS LIVE TABLE ── */}
        <section className="fort-hub-card rounded-2xl p-4 sm:p-5 border border-[#262D3D] bg-gradient-to-br from-[#12151C] via-[#151923] to-[#12151C] shadow-lg space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[#232834]">
            <div className="flex items-center gap-2.5">
              <span className="h-2 w-2 rounded-full bg-[#D4AF37] animate-pulse" />
              <h2 className="font-serif text-base font-bold text-stone-100">
                My Assigned Leads
              </h2>
              <span className="rounded-full bg-[#181D28] border border-[#2A3142] px-2.5 py-0.5 text-[10px] font-mono font-bold text-stone-300">
                {assignedLeadsLoading ? "…" : `${assignedLeads.length} Total`}
              </span>
            </div>
            <Link
              to="/app/crm"
              className="inline-flex items-center gap-1 text-xs font-bold text-[#D4AF37] hover:text-[#E5C368] transition-colors"
            >
              <span>Go to CRM Pipeline</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {assignedLeadsLoading ? (
            <div className="p-8 text-center text-sm text-stone-500 animate-pulse">
              Loading assigned leads from Sentinel Fort…
            </div>
          ) : assignedLeads.length === 0 ? (
            <div className="p-8 text-center space-y-2 rounded-xl border border-[#232834] bg-[#10141E]">
              <Users className="h-8 w-8 mx-auto text-stone-600" />
              <p className="text-sm font-medium text-stone-300">No leads currently assigned</p>
              <p className="text-xs text-stone-500 max-w-sm mx-auto">
                New prospect inquiries assigned to you by sales management will appear here for consultation and site visits.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-stone-300">
                <thead>
                  <tr className="border-b border-[#232834] text-[10px] uppercase tracking-wider text-stone-400 font-semibold">
                    <th className="pb-2.5 pr-4">Lead</th>
                    <th className="pb-2.5 px-4">Stage</th>
                    <th className="pb-2.5 pl-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1E2330]">
                  {assignedLeads.map((lead) => (
                    <tr key={lead.id} className="hover:bg-[#181D28]/60 transition-colors">
                      <td className="py-3 pr-4">
                        <div className="font-bold text-stone-100 text-sm">{lead.name}</div>
                        <div className="text-[11px] text-stone-400 mt-0.5">
                          {lead.project || "General Inquiry"} · <span className="text-[#D4AF37] font-semibold">{lead.budget}</span> · {lead.source || "Direct"}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-[#1A2030] border border-[#2E374E] px-2.5 py-1 text-[11px] font-bold text-stone-200">
                          {lead.stage}
                        </span>
                      </td>
                      <td className="py-3 pl-4 text-right">
                        <Link
                          to="/app/leads"
                          search={{ leadId: lead.id } as any}
                          className="inline-flex items-center gap-1 rounded-full border border-[#524422] bg-[#241F14] px-3.5 py-1 text-xs font-bold text-[#E5C368] hover:bg-[#332A18] hover:border-[#D4AF37] transition-all shadow-2xs"
                        >
                          <span>Open</span>
                          <ArrowUpRight className="h-3 w-3" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* ── Footer ── */}
        <footer className="pt-2 border-t border-[#232834] text-center text-[10px] text-stone-500">
          <p>SENTINEL FORT · SALES EXECUTIVE VIRTUAL OFFICE · Pipeline, Appointments & Deal Orchestration.</p>
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

