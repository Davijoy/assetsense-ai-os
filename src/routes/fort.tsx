/**
 * SENTINEL FORT — authenticated Fort layout.
 *
 * THE MISSING LINK, assembled:
 *
 *   AUTHENTICATION  → supabase session (no session → /auth?next=<path>)
 *          ↓
 *   FORT WORKSPACE  → resolveFortWorkspace()  [SERVER — the single resolver]
 *          ↓            workspace_members → user_roles → module projection
 *   EXPERIENCE      → route context consumed by FortShell
 *
 * Fail-safe posture:
 *   - no session / transient session failure → /auth?next=<path>
 *   - no workspace → rendered AWAITING state (NOT a redirect, NOT a dead end)
 *   - no app_role → rendered PROVISIONING state (never auto-elevated)
 *   - resolver failure → rendered ERROR state, zero modules (fails closed)
 *
 * This route no longer hand-rolls workspace + role resolution. Everything below
 * is display; the server decided it.
 */
import { createFileRoute, Link, Outlet, redirect, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { processAgentRequest } from "@/lib/supreme-agent-processor";
import { mapAgentResponseToCompanionResult, type CompanionExecutionResult } from "@/lib/sentinel-companion";
import type { Session } from "@supabase/supabase-js";
import {
  formatCanonicalRoles,
  fortFallbackContext,
  resolveFortWorkspace,
  type FortWorkspaceContext,
} from "@/lib/fort-workspace.functions";
import { SentinelMark } from "@/components/brand/Logo";
import { SentinelAtmosphere } from "@/components/sentinel/SentinelAtmosphere";
import {
  FortVerifiedBadge,
  FortWorkspaceIdentity,
} from "@/components/sentinel/FortWorkspaceState";
import { fortForSlug } from "@/sentinel/forts";
import { useRouterState } from "@tanstack/react-router";

import {
  Home,
  Sparkles,
  Shield,
  Scale,
  Building2,
  Mail,
  Bell,
  Settings,
  Search,
  ChevronRight,
  LogOut,
  MoreVertical,
  Plus,
  ExternalLink,
  Menu,
  X,
  LayoutDashboard,
  Crown,
  ShieldCheck,
  User,
  Users,
  BarChart3,
  Package,
  Filter,
  Award,
  Mic,
} from "lucide-react";
import { SpartanShieldIcon } from "@/components/sentinel/FortEmblem";
import { openSupremeVoice } from "@/lib/sentinel-voice";
import { isSalesExecutiveExperience } from "@/components/sentinel/FortDashboard";

export const Route = createFileRoute("/fort")({
  beforeLoad: async ({ location }) => {
    const next = location.pathname;
    let session: Session | null = null;
    try {
      const { data } = await supabase.auth.getSession();
      session = data.session ?? null;
    } catch {
      // transient network failure
    }
    if (!session?.access_token && typeof window !== "undefined") {
      try {
        const { getStoredSupabaseSession } = await import("@/integrations/supabase/auth-storage");
        session = getStoredSupabaseSession();
      } catch {}
    }
    if (!session?.access_token) {
      throw redirect({ to: "/auth", search: { next } });
    }
    const user = session.user;
    if (!user) throw redirect({ to: "/auth", search: { next } });

    // SERVER-side resolution. Workspace, membership, app_role, capability
    // visibility and module state all come from one authenticated resolver —
    // never from client state, localStorage, the URL or a persona choice.
    let fort: FortWorkspaceContext;
    try {
      fort = await resolveFortWorkspace({ data: {} });
      console.info("[Fort beforeLoad] resolveFortWorkspace resolved:", {
        status: fort.status,
        reason: fort.reason,
        workspaceId: fort.workspaceId,
        fort: fort.fort,
        roles: fort.role.appRoles,
      });
    } catch (e) {
      console.error("[Fort beforeLoad] workspace resolution threw (failing closed):", e);
      fort = fortFallbackContext("ERROR", "RESOLUTION_FAILED");
    }

    const hasInternalAccess =
      fort.status === "ACTIVE" &&
      fort.role.appRoles.some((role) =>
        ["admin", "manager", "agent"].includes(role),
      );

    if (!hasInternalAccess) {
      throw redirect({ to: "/" });
    }

    return {
      fort,
      // Back-compatible shape for the Fort pages and the Companion. Both fields
      // are the SERVER-resolved values.
      user: { id: user.id, email: user.email, workspaceId: fort?.workspaceId ?? null, roles: fort?.role?.appRoles ?? [] },
    };
  },
  component: FortLayout,
});

function FortLayout() {
  const context = Route.useRouteContext() as {
    user?: LoaderUser;
    fort?: FortWorkspaceContext;
  };
  const fort = context.fort ?? fortFallbackContext("AWAITING", "RESOLUTION_FAILED");
  const user = context.user ?? { id: "", email: null, workspaceId: null, roles: fort.role?.appRoles ?? [] };
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const pathname = useRouterState({ select: (s) => s.location.pathname }) ?? "";
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [fortQ, setFortQ] = useState("");
  const [fortSearchOpen, setFortSearchOpen] = useState(false);

  const userName = user.email ? user.email.split("@")[0].replace(/[\._]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) : "Founder";
  const userInitial = userName.charAt(0).toUpperCase();

  const grantMap = useMemo(() => {
    const map = new Map<string, "ACTIVE" | "LOCKED" | "UNAVAILABLE">();
    const modules = fort.modules ?? [];
    const consoleModules = fort.consoleModules ?? [];
    for (const g of modules) {
      map.set(g.route, g.state);
    }
    for (const g of consoleModules) {
      if (!map.has(g.route)) map.set(g.route, g.state);
    }
    return map;
  }, [fort.modules, fort.consoleModules]);

  const userRoles = user.roles ?? fort.role?.appRoles ?? [];
  const isSalesExecutive = isSalesExecutiveExperience({
    persona: null,
    roles: userRoles,
    workspace: fort,
  });

  const navItems = useMemo(() => {
    const base = [
      { label: "FORT HOME", icon: Home, to: "/fort", state: "ACTIVE" as const, active: pathname === "/fort" || pathname.startsWith("/fort/") },
      { label: "LEADS", icon: Filter, to: "/app/leads", state: grantMap.get("/app/leads") ?? "ACTIVE", active: pathname.includes("/leads") },
      { label: "CRM", icon: Users, to: "/app/crm", state: grantMap.get("/app/crm") ?? "ACTIVE", active: pathname.includes("/crm") },
      { label: "MARKET", icon: BarChart3, to: "/app/market", state: grantMap.get("/app/market") ?? "ACTIVE", active: pathname.includes("/market") },
      { label: "INVENTORY", icon: Package, to: "/app/inventory", state: grantMap.get("/app/inventory") ?? "ACTIVE", active: pathname.includes("/inventory") },
      { label: "INTELLIGENCE", icon: Sparkles, to: "/app/supreme-intelligence", state: grantMap.get("/app/supreme-intelligence") ?? "ACTIVE", active: pathname.includes("/supreme-intelligence") },
      { label: "MESSAGES", icon: Mail, to: "/app/messages", state: grantMap.get("/app/messages") ?? "ACTIVE", active: pathname.includes("/messages") },
    ];
    if (!isSalesExecutive) {
      base.push({ label: "BRANDING", icon: Award, to: "/app/settings/branding", state: grantMap.get("/app/settings/branding") ?? "LOCKED", active: pathname.includes("/settings") });
    }
    return base;
  }, [pathname, grantMap, isSalesExecutive]);

  // Live search over the accessible Fort navigation (locked modules excluded).
  const fortMatches = useMemo(() => {
    const q = fortQ.trim().toLowerCase();
    if (!q) return [] as typeof navItems;
    return navItems
      .filter((n) => n.state !== "LOCKED")
      .filter((n) => n.label.toLowerCase().includes(q) || n.to.toLowerCase().includes(q))
      .slice(0, 6);
  }, [fortQ, navItems]);

  const roleTitle = userRoles.includes("admin") || userRoles.includes("platform_admin")
    ? "Platform Admin"
    : userRoles.includes("manager")
      ? "Sales Manager"
      : isSalesExecutive
        ? "Sales Executive"
        : userRoles.length > 0
          ? formatCanonicalRoles(userRoles)
          : fort.status === "ACTIVE"
            ? "Verified Member"
            : "Access Pending";

  return (
    <div className={`min-h-screen flex flex-col lg:flex-row antialiased transition-colors duration-200 ${
      isSalesExecutive
        ? "bg-[#FAF7F2] text-[#141720] selection:bg-[#EADBCA] selection:text-[#141720]"
        : "bg-[#0C0E14] text-stone-100 selection:bg-[#2D2415] selection:text-[#E2C578]"
    }`}>
      {/* ── Mobile Sidebar Header Toggle ── */}
      <header className={`lg:hidden sticky top-0 z-50 flex items-center justify-between border-b px-4 py-3 backdrop-blur ${
        isSalesExecutive
          ? "border-[#EADBCA] bg-[#FAF7F2]/95 text-[#141720]"
          : "border-[#232834] bg-[#0F1219]/95 text-stone-100"
      }`}>
        <div className="flex items-center gap-2.5">
          <SpartanShieldIcon size={30} showStar={false} />
          <div className="leading-none">
            <span className={`font-display text-lg font-bold tracking-tight ${isSalesExecutive ? "text-[#141720]" : "text-stone-100"}`}>Sentinel Fort</span>
            <span className="ml-1 text-[9px] uppercase tracking-[0.22em] font-semibold text-[#D4AF37]">GROUP</span>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className={`rounded-lg p-2 transition-colors ${
            isSalesExecutive
              ? "text-[#6B655B] hover:bg-[#EFE8DC] hover:text-[#141720]"
              : "text-stone-400 hover:bg-[#181C26] hover:text-stone-100"
          }`}
        >
          {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </header>

      {/* ── Left Executive Sidebar ── */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-60 border-r flex flex-col justify-between transition-transform duration-300 ease-in-out lg:static lg:translate-x-0 ${
          isSalesExecutive
            ? "bg-[#FAF7F2] border-[#EADBCA]"
            : "bg-[#0F1219] border-[#232834]"
        } ${
          mobileMenuOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full"
        }`}
      >
        <div className="flex flex-col p-4 overflow-y-auto">
          {/* Logo Header */}
          <Link to="/fort" className="flex items-center gap-2.5 group">
            <SpartanShieldIcon size={32} className="transition-transform group-hover:scale-105" />
            <div className="flex flex-col leading-none">
              <span className={`font-display text-lg font-bold tracking-tight ${isSalesExecutive ? "text-[#141720]" : "text-stone-100"}`}>Sentinel Fort</span>
              <span className="text-[8px] uppercase tracking-[0.24em] font-bold text-[#D4AF37] mt-0.5">GROUP</span>
            </div>
          </Link>

          {/* Navigation Menu */}
          <nav className="mt-5 space-y-1 text-xs font-semibold">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isLocked = item.state === "LOCKED";
              return (
                <Link
                  key={item.label}
                  to={isLocked ? ("/fort" as const) : (item.to as "/fort")}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center justify-between rounded-lg px-3 py-1.5 transition-all ${
                    isSalesExecutive
                      ? item.active
                        ? "bg-[#EDE4D0] text-[#141720] border border-[#D5C49F] shadow-xs font-bold"
                        : isLocked
                          ? "text-[#B0A79A] opacity-50 cursor-not-allowed hover:bg-transparent"
                          : "text-[#4A453E] hover:bg-[#EFE8DC] hover:text-[#141720]"
                      : item.active
                        ? "bg-[#241F14] text-[#E5C368] border border-[#524422] shadow-2xs font-bold"
                        : isLocked
                          ? "text-stone-600 opacity-50 cursor-not-allowed hover:bg-transparent"
                          : "text-stone-400 hover:bg-[#181C26] hover:text-stone-100"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className={`h-3.5 w-3.5 ${
                      isSalesExecutive
                        ? item.active
                          ? "text-[#B8860B]"
                          : isLocked
                            ? "text-[#B0A79A]"
                            : "text-[#8C8477]"
                        : item.active
                          ? "text-[#D4AF37]"
                          : isLocked
                            ? "text-stone-600"
                            : "text-stone-500"
                    }`} />
                    <span className="tracking-wide text-[10px] uppercase font-bold">{item.label}</span>
                  </div>
                  {isLocked && (
                    <span className={`rounded-full px-1 py-0.2 text-[8px] font-bold uppercase ${
                      isSalesExecutive
                        ? "bg-[#EFE8DC] border border-[#DDD5C5] text-[#8C8477]"
                        : "bg-stone-900 border border-stone-800 text-stone-500"
                    }`}>
                      LOCKED
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Bottom Cards */}
        <div className={`p-3 space-y-2 border-t ${
          isSalesExecutive
            ? "border-[#EADBCA] bg-[#F5EFE6]"
            : "border-[#232834] bg-[#0A0D12]"
        }`}>
          {/* Fort Status Box */}
          <div className={`rounded-xl border p-2.5 shadow-2xs ${
            isSalesExecutive
              ? "border-[#EADBCA] bg-white text-[#141720]"
              : "border-[#262D3D] bg-[#141822]"
          }`}>
            <div className={`flex items-center justify-between text-[9px] font-bold tracking-wider uppercase ${
              isSalesExecutive ? "text-[#6B655B]" : "text-stone-400"
            }`}>
              <span>FORT STATUS</span>
              <span className={`flex items-center gap-1 font-bold ${
                fort.status === "ACTIVE"
                  ? isSalesExecutive ? "text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 rounded-full" : "text-emerald-400"
                  : isSalesExecutive ? "text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.2 rounded-full" : "text-amber-400"
              }`}>
                <span className={`h-1.5 w-1.5 rounded-full ${fort.status === "ACTIVE" ? (isSalesExecutive ? "bg-emerald-600" : "bg-emerald-500 animate-pulse") : "bg-amber-500"}`} />
                {fort.status}
              </span>
            </div>
            <Link to="/fort" className="mt-1.5 flex items-center justify-between group">
              <div>
                <div className={`text-[9px] font-medium ${isSalesExecutive ? "text-[#8C8477]" : "text-stone-500"}`}>Workspace</div>
                <div className={`text-[11px] font-bold truncate max-w-[140px] transition-colors ${
                  isSalesExecutive
                    ? "text-[#141720] group-hover:text-[#B8860B]"
                    : "text-stone-100 group-hover:text-[#D4AF37]"
                }`}>
                  {fort.workspaceName || (fort.status === "ACTIVE" ? "Sentinel Fort HQ" : "Workspace Pending")}
                </div>
              </div>
              <ChevronRight className={`h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform ${
                isSalesExecutive ? "text-[#8C8477]" : "text-stone-500"
              }`} />
            </Link>
            <div className={`mt-1.5 pt-1.5 border-t flex items-center justify-between text-[10px] font-medium ${
              isSalesExecutive
                ? "border-[#EFE8DC] text-[#6B655B]"
                : "border-[#232834] text-stone-400"
            }`}>
              <div className="flex items-center gap-1">
                <ShieldCheck className="h-3 w-3 text-[#D4AF37]" />
                <span className="truncate">{roleTitle}</span>
              </div>
              <span className={`font-mono text-[9px] font-bold ${
                isSalesExecutive
                  ? "text-[#C85A0D] bg-[#FFF2EA] border border-[#FFD8C2] px-1.5 py-0.5 rounded"
                  : "text-primary"
              }`}>
                {fort.workspacePublicId && fort.workspacePublicId !== "PENDING" && fort.workspacePublicId !== "WORKSPACE PENDING"
                  ? fort.workspacePublicId
                  : (fort.status === "ACTIVE" ? "SF-HQ-001" : "WORKSPACE PENDING")}
              </span>
            </div>
          </div>

          {/* User Profile Card */}
          <div className={`flex items-center justify-between rounded-xl border p-2 shadow-2xs ${
            isSalesExecutive
              ? "border-[#EADBCA] bg-white"
              : "border-[#262D3D] bg-[#141822]"
          }`}>
            <div className="flex items-center gap-2 truncate">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#D4AF37] to-[#8C6D1F] text-[10px] font-bold text-[#141720] shadow-2xs">
                {userInitial}
              </div>
              <div className="truncate leading-tight">
                <div className={`text-[11px] font-bold truncate ${isSalesExecutive ? "text-[#141720]" : "text-stone-100"}`}>{userName}</div>
                <div className={`text-[9px] truncate ${isSalesExecutive ? "text-[#6B655B]" : "text-stone-500"}`}>{user.email || "admin@sentinelfort.com"}</div>
              </div>
            </div>
            <button
              type="button"
              onClick={async () => {
                await signOut();
              }}
              title="Sign out"
              aria-label="Sign out"
              className={`rounded-lg p-1 transition-colors ${
                isSalesExecutive
                  ? "text-[#6B655B] hover:bg-[#F3EDE2] hover:text-[#141720]"
                  : "text-stone-500 hover:bg-[#1C2230] hover:text-stone-300"
              }`}
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </aside>

      {/* ── Main Content Shell ── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Command Bar */}
        <header className={`sticky top-0 z-30 flex flex-wrap items-center justify-between gap-3 border-b px-4 sm:px-5 py-2 backdrop-blur-md ${
          isSalesExecutive
            ? "border-[#EADBCA] bg-[#FAF7F2]/90 text-[#141720]"
            : "border-[#232834] bg-[#0C0E14]/90 text-stone-100"
        }`}>
          {/* Greeting */}
          <div className="leading-tight">
            <div className={`flex items-center gap-1.5 text-sm font-bold tracking-tight ${
              isSalesExecutive ? "text-[#141720]" : "text-stone-100"
            }`}>
              {isSalesExecutive ? (
                <ShieldCheck className="h-4 w-4 text-[#D4AF37]" />
              ) : (
                <span className="text-amber-400">👑</span>
              )}
              <span>Welcome back, {userName}</span>
            </div>
            <div className={`text-[10px] font-medium ${
              isSalesExecutive ? "text-[#6B655B]" : "text-stone-400"
            }`}>
              {isSalesExecutive ? "Sales Executive Virtual Office" : "Sentinel Fort Command Center"}
            </div>
          </div>

          {/* Actions & Search */}
          <div className="flex items-center gap-2">
            {/* Search Input — live filter over the Fort navigation */}
            <div className="relative hidden sm:block">
              <Search className={`absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 ${
                isSalesExecutive ? "text-[#8C8477]" : "text-stone-500"
              }`} />
              <input
                type="text"
                value={fortQ}
                onChange={(e) => {
                  setFortQ(e.target.value);
                  setFortSearchOpen(true);
                }}
                onFocus={() => setFortSearchOpen(true)}
                onBlur={() => setTimeout(() => setFortSearchOpen(false), 150)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    const first = fortMatches[0];
                    if (first) navigate({ to: first.to as never });
                    setFortSearchOpen(false);
                  }
                  if (e.key === "Escape") {
                    setFortSearchOpen(false);
                    setFortQ("");
                  }
                }}
                aria-label="Search Fort"
                placeholder="Search Fort..."
                className={`h-7.5 w-40 lg:w-48 rounded-lg pl-7 pr-2.5 text-[11px] focus:outline-none focus:ring-1 focus:ring-[#D4AF37] shadow-2xs ${
                  isSalesExecutive
                    ? "border border-[#DDD5C5] bg-white text-[#141720] placeholder:text-[#8C8477]"
                    : "border border-[#2B3242] bg-[#151923] text-stone-100 placeholder:text-stone-500"
                }`}
              />
              {fortSearchOpen && fortQ.trim() && (
                <div className={`absolute right-0 top-8 z-50 w-64 overflow-hidden rounded-lg shadow-2xl border ${
                  isSalesExecutive
                    ? "border-[#DDD5C5] bg-white divide-y divide-[#EFE8DC]"
                    : "border-[#2B3242] bg-[#151923] divide-y divide-[#202533]"
                }`}>
                  {fortMatches.length === 0 ? (
                    <div className={`px-3 py-2 text-[11px] ${
                      isSalesExecutive ? "text-[#8C8477]" : "text-stone-500"
                    }`}>
                      No matching areas for "{fortQ}"
                    </div>
                  ) : (
                    <ul className={`max-h-80 overflow-y-auto py-1 divide-y ${
                      isSalesExecutive ? "divide-[#EFE8DC]" : "divide-[#202533]"
                    }`}>
                      {fortMatches.map((m) => (
                        <li key={m.to}>
                          <button
                            type="button"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => {
                              setFortSearchOpen(false);
                              setFortQ("");
                              setMobileMenuOpen(false);
                              navigate({ to: m.to as never });
                            }}
                            className={`flex w-full items-center justify-between gap-2 px-3 py-2 text-left ${
                              isSalesExecutive
                                ? "hover:bg-[#FAF7F2] text-[#141720]"
                                : "hover:bg-[#1F2533] text-stone-200"
                            }`}
                          >
                            <span className="text-[11px] font-semibold">{m.label}</span>
                            <ChevronRight className={`h-3 w-3 ${isSalesExecutive ? "text-[#8C8477]" : "text-stone-600"}`} />
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>

            {/* Notification Bell — opens messages */}
            <Link
              to="/app/messages"
              title="Open workspace notifications & messages"
              className={`relative flex h-7.5 w-7.5 items-center justify-center rounded-lg border shadow-2xs transition-colors ${
                isSalesExecutive
                  ? "border-[#DDD5C5] bg-white text-[#4A453E] hover:bg-[#F3EDE2] hover:text-[#141720]"
                  : "border-[#2B3242] bg-[#151923] text-stone-300 hover:bg-[#1E2330]"
              }`}
            >
              <Bell className={`h-3.5 w-3.5 ${isSalesExecutive ? "text-[#4A453E]" : "text-stone-300"}`} />
            </Link>

            {/* FORT AI Button */}
            <Link
              to="/app/supreme-intelligence"
              className={`inline-flex h-7.5 items-center gap-1.5 rounded-lg border px-3 text-[11px] font-bold transition-all shadow-2xs ${
                isSalesExecutive
                  ? "border-[#C5A059]/70 bg-[#12141A] text-[#E5C368] hover:bg-[#1E232E] hover:text-[#FFF] hover:border-[#D4AF37]"
                  : "border-[#D4AF37]/40 bg-[#252013] text-[#E5C368] hover:bg-[#332A17]"
              }`}
            >
              <Sparkles className="h-3 w-3 text-[#D4AF37]" />
              <span>FORT AI</span>
            </Link>

            {/* Direct Supreme Voice Command Button */}
            <button
              type="button"
              onClick={openSupremeVoice}
              aria-label="Direct Supreme Voice Command"
              className={`inline-flex h-7.5 items-center gap-1.5 rounded-lg border px-3 text-[11px] font-bold transition-all shadow-2xs group cursor-pointer ${
                isSalesExecutive
                  ? "border-[#C5A059]/70 bg-gradient-to-r from-[#12141A] via-[#1E232E] to-[#12141A] text-[#E5C368] hover:border-[#D4AF37]"
                  : "border-[#D4AF37]/50 bg-gradient-to-r from-[#2B2313] via-[#3B301A] to-[#2B2313] text-[#E5C368] hover:shadow-xs hover:border-[#D4AF37]"
              }`}
            >
              <Mic className="h-3.5 w-3.5 text-[#D4AF37] group-hover:scale-110 transition-transform" />
              <span>VOICE</span>
            </button>

            {/* Customize Fort (Admin only) */}
            {grantMap.get("/app/settings/branding") === "ACTIVE" && (
              <Link
                to="/app/settings/branding"
                className="inline-flex h-7.5 items-center gap-1.5 rounded-lg fort-btn-gold px-3 text-[11px] font-bold shadow-2xs"
              >
                <span>Customize Fort</span>
              </Link>
            )}
          </div>
        </header>

        {/* Dynamic Nested Experience View */}
        <main className="flex-1 p-3 sm:p-4 lg:p-5 max-w-[1600px] w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export interface LoaderUser {
  id: string;
  email?: string | null;
  workspaceId: string | null;
  roles: string[];
}

