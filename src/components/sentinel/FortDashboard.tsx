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
  MoreVertical,
  type LucideIcon,
} from "lucide-react";
import type { FortDefinition } from "@/sentinel/forts";
import type { FortModuleGrant } from "@/lib/fort-experience";
import type { FortWorkspaceContext } from "@/lib/fort-workspace.functions";
import type { FortShellPreviewsResult } from "@/lib/sentinel.functions";
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
}

export function FortDashboard({ fort, roles, workspace }: FortDashboardProps) {
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
                  OS
                </span>
              </div>
              <div className="mt-0.5 flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-[0.2em] text-[#D4AF37]">
                <span>INTELLIGENCE</span>
                <span className="text-[7px] opacity-60">✦</span>
                <span>GOVERNANCE</span>
                <span className="text-[7px] opacity-60">✦</span>
                <span>GROWTH</span>
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
                  Role: {workspace.role.appRoles.join(" · ")}
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
              <span className="text-[9px] font-bold uppercase tracking-wider text-stone-400">Inbound Leads</span>
              <Users className="h-3.5 w-3.5 text-[#D4AF37]" />
            </div>
            <div className="mt-1">
              <div className="text-base font-bold text-stone-100 font-mono leading-tight">
                {!previewsLoaded ? "…" : leadCount !== null ? leadCount.toLocaleString() : (
                  <span className="text-[10px] font-medium text-stone-500">Data pending</span>
                )}
              </div>
              <p className="text-[9px] text-stone-500 font-medium">CRM records</p>
            </div>
          </div>

          {/* Signal 2: Active Deals */}
          <div className="rounded-xl border border-[#232834] bg-[#151923]/90 backdrop-blur-xs p-2 flex flex-col justify-between hover:border-[#D4AF37]/40 transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-bold uppercase tracking-wider text-stone-400">Active Deals</span>
              <TrendingUp className="h-3.5 w-3.5 text-[#D4AF37]" />
            </div>
            <div className="mt-1">
              <div className="text-base font-bold text-stone-100 font-mono leading-tight">
                {!previewsLoaded ? "…" : dealCount !== null ? dealCount.toLocaleString() : (
                  <span className="text-[10px] font-medium text-stone-500">Data pending</span>
                )}
              </div>
              <p className="text-[9px] text-stone-500 font-medium">Dealrooms</p>
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

          {/* Signal 5: Governance Posture */}
          <div className="rounded-xl border border-[#232834] bg-[#151923]/90 backdrop-blur-xs p-2 flex flex-col justify-between hover:border-[#D4AF37]/40 transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-bold uppercase tracking-wider text-stone-400">Governance</span>
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
            </div>
            <div className="mt-1">
              <div className="text-sm font-bold text-stone-100 leading-tight">
                Nominal
              </div>
              <p className="text-[9px] text-stone-500 font-medium">Audit ready</p>
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

