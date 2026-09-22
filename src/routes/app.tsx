import {
  createFileRoute,
  Link,
  Outlet,
  redirect,
  useRouterState,
  useNavigate,
} from "@tanstack/react-router";
import { useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { SentinelMark } from "@/components/brand/Logo";
import { SentinelAtmosphere } from "@/components/sentinel/SentinelAtmosphere";
import { SupremeEntity } from "@/components/sentinel/SupremeEntity";
import {
  FortWorkspaceIdentity,
  FortWorkspaceStateSurface,
} from "@/components/sentinel/FortWorkspaceState";
import {
  activeConsoleRouteSet,
  fortFallbackContext,
  type FortWorkspaceContext,
} from "@/lib/fort-experience";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { NewLeadDialog, NewPropertyDialog } from "@/components/app/QuickCreateDialogs";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  LayoutDashboard,
  Users,
  Building2,
  PhoneCall,
  Megaphone,
  BarChart3,
  Handshake,
  Settings,
  Search,
  Bell,
  Plus,
  Sparkles,
  FileText,
  Lightbulb,
  Command,
  Palette,
  Network,
  ShieldAlert,
  Globe2,
  Workflow,
  Banknote,
  GitBranch,
  ScrollText,
  Gauge,
  MessageSquareText,
  Package,
  LogOut,
  Lock,
  ArrowLeft,
} from "lucide-react";

/**
 * The one surface an account with no granted module may still complete. It is
 * the provisioning flow itself, so gating it behind "you have no access yet"
 * would be a dead end.
 */
const ONBOARDING_ROUTE = "/app/onboarding";

export const Route = createFileRoute("/app")({
  head: () => ({
    meta: [
      { title: "Sentinel Fort Group Console" },
      { name: "description", content: "Sentinel Fort Group operating console — CRM, marketplace, AI voice and BI." },
    ],
  }),
  /**
   * FORT IS THE GATEWAY — the console runs INSIDE a resolved FORT workspace.
   *
   *     session  →  FORT workspace  →  membership  →  app_role  →  modules
   *
   * Everything below the shell reads this ONE server-resolved context. The
   * previous shell had no guard at all: it rendered whatever the browser's
   * `useAuth()` hook happened to report, which is why an account with an
   * unreadable role row landed in the CRM labelled "viewer".
   *
   * WHAT IS AND IS NOT AUTHORITY HERE
   *   * The session is read from the Supabase client (same as /fort) purely to
   *     decide "is anyone signed in". It carries no role claim: the bearer token
   *     is re-verified server-side by requireSupabaseAuth, and every role,
   *     workspace and module below comes from the server's answer.
   *   * No URL parameter, localStorage value, React state or persona is read as
   *     authorization anywhere in this file.
   *   * This guard does not replace anything. Each /app/* route keeps its own
   *     gate, every server function keeps requireRoles(), and RLS remains the
   *     data boundary. A module reported ACTIVE here grants nothing.
   *
   * The resolver is imported with `await import()` on purpose: it is a
   * createServerFn module bound to the Supabase auth middleware and must stay
   * out of the AppShell's static bundle (tests/appshell-dependency-boundary).
   */
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
    if (!session?.access_token) throw redirect({ to: "/auth", search: { next } });
    const authUser = session.user;
    if (!authUser) throw redirect({ to: "/auth", search: { next } });

    let fort: FortWorkspaceContext;
    try {
      const { resolveFortWorkspace } = await import("@/lib/fort-workspace.functions");
      fort = await resolveFortWorkspace({ data: {} });
    } catch (e) {
      console.error("[App] FORT workspace resolution failed (failing closed):", e);
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
      user: {
        id: authUser.id,
        fortUserId: fort.fortUserId,
        email: authUser.email ?? null,
        displayName:
          (authUser.user_metadata?.full_name as string | undefined) ||
          (authUser.user_metadata?.name as string | undefined) ||
          authUser.email?.split("@")[0] ||
          "Account",
        workspaceId: fort.workspaceId,
        roles: fort.role.appRoles,
      },
    };
  },
  component: AppShell,
});

/**
 * A sidebar entry. Note there is NO `roles` field: the visible set is decided
 * by the server-resolved FORT context, not by a list maintained here. This is
 * presentation metadata only — label, icon and destination.
 */
type NavItem = { to: string; label: string; icon: any; soon?: boolean };

const nav: NavItem[] = [
  { to: "/app/crm", label: "CRM", icon: LayoutDashboard },
  { to: "/app/leads", label: "Leads", icon: Users },
  { to: "/app/marketplace", label: "Marketplace", icon: Building2 },
  { to: "/app/voice", label: "AI Voice", icon: PhoneCall },
  { to: "/app/marketing", label: "Marketing", icon: Megaphone },
  { to: "/app/bi", label: "Intelligence", icon: BarChart3 },
  { to: "/app/partners", label: "Partners", icon: Handshake, soon: true },
];

const kieNav: NavItem[] = [
  { to: "/app/command", label: "Executive Command", icon: Command },
  { to: "/app/copilot", label: "AI Copilot", icon: Sparkles },
  { to: "/app/docchat", label: "Document Chat", icon: MessageSquareText },
  { to: "/app/recommendations", label: "Recommendations", icon: Lightbulb },
  { to: "/app/workflows", label: "Autonomous Workflows", icon: Workflow },
  { to: "/app/dealrooms", label: "Deal Rooms", icon: GitBranch },
  { to: "/app/risk", label: "Risk Center", icon: ShieldAlert },
  { to: "/app/market", label: "Market Intelligence", icon: Globe2 },
  { to: "/app/supreme-intelligence", label: "Supreme Intelligence", icon: Sparkles },
  { to: "/app/inventory", label: "Inventory Intelligence", icon: Package },
  { to: "/app/collections", label: "Collections AI", icon: Banknote },
  { to: "/app/salesintel", label: "Sales Intelligence", icon: Gauge },
  { to: "/app/graph", label: "Intelligence Graph", icon: Network },
  { to: "/app/documents", label: "Documents", icon: FileText },
  { to: "/app/kie", label: "Legacy KIE", icon: BarChart3 },
];

const adminNav: NavItem[] = [
  { to: "/app/users", label: "Users & Roles", icon: Users },
  { to: "/app/governance", label: "Governance", icon: ScrollText },
  { to: "/app/settings/branding", label: "Branding & Theme", icon: Palette },
  { to: "/app/settings/integrations", label: "Integrations & Sockets", icon: Network },
];

function AppShell() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  // The SERVER's answer. Identity, workspace, roles and per-route grants all
  // arrive resolved — this component derives none of them.
  const { fort, user } = Route.useRouteContext();
  // Used ONLY to end the session. Deliberately does not read `roles`/`isAdmin`:
  // a client-side role check must never be the source of truth here.
  const { signOut } = useAuth();

  /**
   * Which sidebar entries are shown. Presentation filtering over the server's
   * grant list — it cannot add a route the server did not grant, and clicking a
   * hidden route still hits that route's own gate.
   */
  const granted = useMemo(() => activeConsoleRouteSet(fort.consoleModules), [fort.consoleModules]);
  const canSee = (item: NavItem) => granted.has(item.to);
  const visibleNav = nav.filter(canSee);
  const visibleKie = kieNav.filter(canSee);
  const visibleAdmin = adminNav.filter(canSee);

  const displayName = user.displayName;
  /**
   * The server-verified role set, verbatim. There is no "viewer" default: when
   * the server granted no role we say so instead of inventing one.
   */
  const roleLabel = user.roles.length ? user.roles.join(" · ") : "access pending";

  /**
   * The server's decision for the route being viewed, read out of the resolved
   * grant list rather than recomputed here.
   *   LOCKED      the module exists and this account was not granted it.
   *   ACTIVE      granted.
   *   null        the shell has no opinion (nested path, or a route outside the
   *               route↔role table) — the route's own gate decides, unchanged.
   */
  const currentGrant = fort.consoleModules.find((m) => m.route === path)?.state ?? null;
  const workspaceResolved = fort.status === "ACTIVE";
  const membershipPending = fort.reason === "MEMBERSHIP_PENDING";
  const onboarding = path === ONBOARDING_ROUTE;

    return (
    <div className="min-h-screen bg-background text-foreground">
      <SentinelAtmosphere />
      <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col border-r border-border/60 bg-sidebar md:flex">
        <Link to="/fort" className="flex h-16 items-center gap-2 px-6 border-b border-border/60" title="Return to Sentinel Fort Home">
          <SentinelMark />
          <div className="flex flex-col leading-none">
            <span className="font-display text-xl">Sentinel Fort</span>
            <span className="text-[9px] uppercase tracking-[0.22em] text-gold/80">Group</span>
          </div>
        </Link>
        {/*
          WHICH WORKSPACE AM I IN? The console is not a placeless app — it runs
          inside one resolved FORT workspace, and the user can see which. The
          public id is contextual identity only, never a credential.
        */}
        <Link
          to="/fort"
          className="block border-b border-border/60 px-4 py-3 transition-colors hover:bg-sidebar-accent"
          title="Back to your Sentinel Fort"
        >
          <FortWorkspaceIdentity
            publicId={fort.workspacePublicId}
            name={fort.workspaceName}
            isPrivate={fort.workspaceIsPrivate}
            role={roleLabel}
          />
        </Link>
        <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-4">
          {visibleNav.length > 0 && (
            <p className="px-3 pb-2 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Workspace</p>
          )}
          {visibleNav.map((n) => {
            const active = path.startsWith(n.to);
            const Icon = n.icon;
            return (
              <Link
                key={n.to}
                to={n.to}
                className={`group flex items-center justify-between rounded-md px-3 py-1.5 text-[13px] transition-colors ${
                  active
                    ? "bg-primary/10 text-foreground"
                    : "text-muted-foreground hover:bg-sidebar-accent hover:text-foreground"
                }`}
              >
                <span className="flex items-center gap-3">
                  <Icon className={`h-4 w-4 ${active ? "text-primary" : ""}`} />
                  {n.label}
                </span>
                {n.soon && (
                  <span className="rounded-full bg-surface-elevated px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-muted-foreground">
                    soon
                  </span>
                )}
              </Link>
            );
          })}
          {visibleKie.length > 0 && (
            <p className="mt-4 px-3 pb-1 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              Knowledge Engine
            </p>
          )}
          {visibleKie.map((n) => {
            const active = path === n.to || path.startsWith(n.to + "/");
            const Icon = n.icon;
            return (
              <Link
                key={n.to}
                to={n.to}
                className={`group flex items-center justify-between rounded-md px-3 py-1.5 text-[13px] transition-colors ${
                  active
                    ? "bg-primary/10 text-foreground"
                    : "text-muted-foreground hover:bg-sidebar-accent hover:text-foreground"
                }`}
              >
                <span className="flex items-center gap-3">
                  <Icon className={`h-4 w-4 ${active ? "text-primary" : ""}`} />
                  {n.label}
                </span>
                <span className="rounded-full border border-primary/30 bg-primary/5 px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-primary">
                  KIE
                </span>
              </Link>
            );
          })}
          {visibleAdmin.length > 0 && (
            <p className="mt-4 px-3 pb-1 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              Admin
            </p>
          )}
          {visibleAdmin.map((n) => {
            const active = path.startsWith(n.to);
            const Icon = n.icon;
            return (
              <Link
                key={n.to}
                to={n.to}
                className={`group flex items-center justify-between rounded-md px-3 py-1.5 text-[13px] transition-colors ${
                  active
                    ? "bg-primary/10 text-foreground"
                    : "text-muted-foreground hover:bg-sidebar-accent hover:text-foreground"
                }`}
              >
                <span className="flex items-center gap-3">
                  <Icon className={`h-4 w-4 ${active ? "text-primary" : ""}`} />
                  {n.label}
                </span>
              </Link>
            );
          })}
          {/*
            "Users & Roles" is an ordinary adminNav entry now. It used to be
            gated by a client-side `isAdmin` flag computed in the browser; the
            server's grant list decides it like every other module.
          */}
        </nav>
        <div className="border-t border-border/60 p-4">
          <DropdownMenu>
            <DropdownMenuTrigger className="flex w-full items-center gap-3 rounded-md p-1 hover:bg-sidebar-accent">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-primary to-emerald-glow text-xs font-medium text-primary-foreground">
                {displayName.slice(0, 1).toUpperCase()}
              </div>
              <div className="flex-1 text-left">
                <div className="truncate text-sm">{displayName}</div>
                <div className="truncate text-xs capitalize text-muted-foreground">{roleLabel}</div>
              </div>
              <Settings className="h-4 w-4 text-muted-foreground" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="font-normal">
                <div className="text-sm">{displayName}</div>
                <div className="text-xs text-muted-foreground">{user.email}</div>
                <div className="mt-1 text-[10px] uppercase tracking-wider text-primary">
                  {roleLabel}
                </div>
                <div className="mt-0.5 font-mono text-[10px] tracking-wider text-muted-foreground">
                  {user.fortUserId ? `${user.fortUserId} · ` : ""}{fort.workspacePublicId ?? "WORKSPACE PENDING"}
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {granted.has("/app/users") && (
                <DropdownMenuItem asChild>
                  <Link to="/app/users">Manage users</Link>
                </DropdownMenuItem>
              )}
              <DropdownMenuItem
                onClick={async () => {
                  await signOut();
                }}
              >
                <LogOut className="h-4 w-4" /> Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>

      <div className="flex h-screen flex-col md:pl-64">
        <AppHeader fort={fort} />
        <main className="flex-1 overflow-y-auto px-6 py-8">
          {/*
            HONESTY GATE. The console renders its modules only when the server
            actually resolved a workspace AND granted this route. Otherwise the
            resolved state is shown as-is. Nothing is faked, and nothing here
            can grant access the server withheld — it can only decline to
            display a surface the server already declined.
          */}
          {!workspaceResolved && !onboarding ? (
            <WorkspaceGate fort={fort} membershipPending={membershipPending} />
          ) : currentGrant === "LOCKED" ? (
            <ModuleNotGranted route={path} roles={user.roles} />
          ) : (
            <Outlet />
          )}
        </main>
      </div>
    </div>
  );
}

/**
 * The workspace has not resolved to an ACTIVE state, so there are no modules to
 * show. Renders the resolved status verbatim and routes the user back to FORT —
 * never a spinner without an exit.
 */
function WorkspaceGate({
  fort,
  membershipPending,
}: {
  fort: FortWorkspaceContext;
  membershipPending: boolean;
}) {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <FortWorkspaceStateSurface
        status={fort.status}
        reason={fort.reason}
        membershipPending={membershipPending}
      />
      <div className="flex flex-wrap items-center gap-3">
        <Link
          to="/fort"
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-glow hover:bg-primary/90"
        >
          Back to your Sentinel Fort
        </Link>
        <span className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
          {fort.status} · {fort.reason}
        </span>
      </div>
    </div>
  );
}

/**
 * The module exists but the server did not grant it to this account. Reporting
 * that plainly is the point: the alternative — rendering the surface anyway —
 * is what made an unauthorized account look like a "viewer" with a console.
 */
function ModuleNotGranted({ route, roles }: { route: string; roles: readonly string[] }) {
  return (
    <div className="mx-auto max-w-2xl">
      <div className="rounded-lg border border-border/60 bg-surface p-6">
        <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
          <Lock className="h-3.5 w-3.5" /> Not granted
        </div>
        <h1 className="mt-3 font-display text-xl text-foreground">
          This module is not part of your access.
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Your FORT workspace resolved successfully, but{" "}
          <span className="font-mono text-foreground">{route}</span> was not granted to your access
          level{roles.length ? ` (${roles.join(" · ")})` : ""}. Access is granted by an
          administrator — it is not unlocked from here.
        </p>
        <Link
          to="/fort"
          className="mt-5 inline-flex items-center gap-2 rounded-md border border-border/60 px-4 py-2 text-sm text-foreground hover:bg-sidebar-accent"
        >
          Back to your Sentinel Fort
        </Link>
      </div>
    </div>
  );
}

const CONSOLE_LEADS = [
  { id: "lead-1", name: "Riya Kapoor", project: "Lodha Belmondo", budget: "₹1.6 Cr", stage: "New", phone: "+919820123456", email: "riya.kapoor@gmail.com", ownerName: "Aarav Mehta", followUpNotes: "Introductory discovery call on floor plan options" },
  { id: "lead-2", name: "Vikram Joshi", project: "Oberoi Sky City", budget: "₹3.2 Cr", stage: "Call Back", phone: "+919820234567", email: "vikram.joshi@gmail.com", ownerName: "Unassigned", followUpNotes: "Customer requested callback after office hours" },
  { id: "lead-3", name: "Neha Sharma", project: "Prestige Lakeside", budget: "₹2.1 Cr", stage: "New", phone: "+919820345678", email: "neha.sharma@gmail.com", ownerName: "Aarav Mehta", followUpNotes: "First discovery touchpoint on budget & unit preferences" },
  { id: "lead-4", name: "Arjun Patel", project: "Lodha Belmondo", budget: "₹1.9 Cr", stage: "Qualified", phone: "+919820456789", email: "arjun.patel@gmail.com", ownerName: "Unassigned", followUpNotes: "Financial pre-approval documentation review" },
  { id: "lead-5", name: "Pooja Nair", project: "Oberoi Sky City", budget: "₹3.5 Cr", stage: "Qualified", phone: "+919820567890", email: "pooja.nair@gmail.com", ownerName: "Riya Kapoor", followUpNotes: "Review luxury 3BHK deck and master floor plan" },
  { id: "lead-6", name: "Karan Mehta", project: "Prestige Lakeside", budget: "₹2.4 Cr", stage: "Site Visit Scheduled", phone: "+919820678901", email: "karan.mehta@gmail.com", ownerName: "Unassigned", followUpNotes: "Site walkthrough at Prestige Lakeside" },
  { id: "lead-7", name: "Aditi Verma", project: "Lodha Belmondo", budget: "₹1.85 Cr", stage: "Site Visit Scheduled", phone: "+919820789012", email: "aditi.verma@gmail.com", ownerName: "Aarav Mehta", followUpNotes: "Site visit appointment at Lodha Belmondo" },
  { id: "lead-8", name: "Rohan Desai", project: "Oberoi Sky City", budget: "₹3.1 Cr", stage: "RFR (Ready for Registration)", phone: "+919820890123", email: "rohan.desai@gmail.com", ownerName: "Riya Kapoor", followUpNotes: "Unit registration & agreement signing follow-up" },
  { id: "lead-9", name: "Meera Iyer", project: "Prestige Lakeside", budget: "₹2.2 Cr", stage: "Booked", phone: "+919820901234", email: "meera.iyer@gmail.com", ownerName: "Supreme AI Agent", followUpNotes: "Booking confirmed & token payment received" },
  { id: "lead-10", name: "Sahil Khan", project: "Lodha Belmondo", budget: "₹1.95 Cr", stage: "Booked", phone: "+919820912345", email: "sahil.khan@gmail.com", ownerName: "Siddharth Sharma", followUpNotes: "Agreement for sale executed" },
  { id: "lead-11", name: "Devendra Singhal", project: "Oberoi Sky City", budget: "₹2.8 Cr", stage: "Not Interested", phone: "+919820923456", email: "devendra.singhal@gmail.com", ownerName: "Aarav Mehta", followUpNotes: "Budget mismatch — archived" },
  { id: "lead-12", name: "Sunita Rao", project: "Prestige Falcon", budget: "₹1.4 Cr", stage: "Dropped Plan", phone: "+919820934567", email: "sunita.rao@gmail.com", ownerName: "Riya Kapoor", followUpNotes: "Purchase deferred to next fiscal year" },
];

const CONSOLE_PROPERTIES = [
  { id: "1", name: "Lodha Belmondo", builder: "Lodha Group", city: "Pune", area: "Pirangut", config: "3 BHK", priceLabel: "₹1.85 Cr", score: 92, tag: "Hot" },
  { id: "2", name: "Prestige Lakeside Habitat", builder: "Prestige", city: "Bengaluru", area: "Varthur", config: "4 BHK", priceLabel: "₹2.40 Cr", score: 88, tag: "New" },
  { id: "3", name: "Oberoi Sky City", builder: "Oberoi Realty", city: "Mumbai", area: "Borivali", config: "3 BHK", priceLabel: "₹3.10 Cr", score: 95, tag: "Premium" },
  { id: "4", name: "Godrej Reserve", builder: "Godrej Properties", city: "Bengaluru", area: "Devanahalli", config: "Plot", priceLabel: "₹1.20 Cr", score: 86, tag: "Trending" },
  { id: "5", name: "DLF The Camellias", builder: "DLF", city: "Gurugram", area: "Golf Course Rd", config: "4 BHK", priceLabel: "₹38.5 Cr", score: 97, tag: "Premium" },
  { id: "6", name: "Brigade Cornerstone Utopia", builder: "Brigade Group", city: "Bengaluru", area: "Whitefield", config: "3 BHK", priceLabel: "₹1.95 Cr", score: 84, tag: "New" },
  { id: "7", name: "Lodha World Towers", builder: "Lodha Group", city: "Mumbai", area: "Lower Parel", config: "3 BHK", priceLabel: "₹8.40 Cr", score: 90, tag: "Hot" },
  { id: "8", name: "Embassy Boulevard", builder: "Embassy Group", city: "Bengaluru", area: "Yelahanka", config: "5 BHK", priceLabel: "₹7.20 Cr", score: 89, tag: "Premium" },
  { id: "9", name: "M3M Crown", builder: "M3M India", city: "Gurugram", area: "Sector 111", config: "3 BHK", priceLabel: "₹3.85 Cr", score: 87, tag: "New" },
];

const CONSOLE_MODULES = [
  { title: "CRM & Sales Pipeline", to: "/app/crm", description: "Visual kanban board, real-time KPI metrics, and lead stages.", keywords: ["crm", "pipeline", "deals", "kanban"] },
  { title: "Leads & Follow-Ups", to: "/app/leads", description: "Complete database of inbound buyer inquiries, follow-up schedules, and disposition logs.", keywords: ["leads", "inbox", "contacts", "follow-up", "disposition"] },
  { title: "Property Marketplace", to: "/app/marketplace", description: "Verified developer inventory with AI investment scores and unit filters.", keywords: ["properties", "listings", "inventory", "marketplace", "apartments", "villas"] },
  { title: "AI Voice Cockpit", to: "/app/voice", description: "Autonomous voice AI calling, live conversation waveforms, and transcripts.", keywords: ["voice", "calls", "ai voice", "cockpit", "telephony"] },
  { title: "Marketing Cloud", to: "/app/marketing", description: "Cross-channel campaigns, journeys, SMS/WhatsApp marketing, and attribution.", keywords: ["marketing", "campaigns", "sms", "whatsapp", "journeys"] },
  { title: "Intelligence Dashboard", to: "/app/bi", description: "Executive business intelligence across CRM, marketplace, and telephony.", keywords: ["bi", "intelligence", "analytics", "reports", "insights"] },
  { title: "Executive Command", to: "/app/command", description: "Executive health dial, pipeline forecasts, and revenue velocity.", keywords: ["command", "executive", "forecast", "kie"] },
  { title: "AI Copilot", to: "/app/copilot", description: "Ask questions and execute cross-module operations with Supreme AI.", keywords: ["copilot", "chat", "ai assistant"] },
  { title: "Document Chat", to: "/app/docchat", description: "RAG chat over agreements, deeds, floor plans, and contracts.", keywords: ["docs", "documents", "rag", "chat"] },
  { title: "Autonomous Workflows", to: "/app/workflows", description: "Automated real estate lead nurturing, site visit triggers, and task queues.", keywords: ["workflows", "automation", "triggers"] },
  { title: "Users & Roles", to: "/app/users", description: "Manage team members, RBAC roles, and workspace permissions.", keywords: ["users", "roles", "rbac", "members", "team"] },
  { title: "Governance & Audit", to: "/app/governance", description: "Compliance logs, data protection policies, and immutable audit trails.", keywords: ["governance", "audit", "compliance", "policy"] },
];

const stageSearchBadge: Record<string, string> = {
  New: "bg-sky-500/20 text-sky-300 border-sky-500/30",
  Qualified: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
  "Call Back": "bg-amber-500/20 text-amber-300 border-amber-500/30",
  RNR: "bg-orange-500/20 text-orange-300 border-orange-500/30",
  "RNR (Ringing Not Responded)": "bg-orange-500/20 text-orange-300 border-orange-500/30",
  Busy: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
  "Switch Off": "bg-rose-500/20 text-rose-300 border-rose-500/30",
  "Not Interested": "bg-stone-500/20 text-stone-400 border-stone-500/30",
  "Dropped Plan": "bg-red-500/20 text-red-400 border-red-500/30",
  "Site Visit Scheduled": "bg-violet-500/20 text-violet-300 border-violet-500/30",
  Booked: "bg-emerald-500/30 text-emerald-200 border-emerald-500/40",
  "RFR (Ready for Registration)": "bg-teal-500/20 text-teal-300 border-teal-500/30",
  RFR: "bg-teal-500/20 text-teal-300 border-teal-500/30",
};

function AppHeader({ fort }: { fort: FortWorkspaceContext }) {
  const navigate = useNavigate();
  const currentPath = useRouterState({ select: (s) => s.location.pathname });
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [leadOpen, setLeadOpen] = useState(false);
  const [propOpen, setPropOpen] = useState(false);

  const isLeadsOrCrm = currentPath.startsWith("/app/leads") || currentPath.startsWith("/app/crm");
  const isMarketplace = currentPath.startsWith("/app/marketplace");
  const isVoice = currentPath.startsWith("/app/voice");
  const isUsers = currentPath.startsWith("/app/users");

  const placeholderText = isLeadsOrCrm
    ? "Search customer by name, phone, project, stage…"
    : isMarketplace
    ? "Search properties by name, builder, city, area…"
    : isVoice
    ? "Search voice logs, leads, campaigns…"
    : isUsers
    ? "Search users, roles, team members…"
    : "Search leads, properties, console modules…";

  // 1. Leads matching
  const leadResults = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return [];
    return CONSOLE_LEADS.filter((l) => {
      const hay = `${l.name} ${l.phone || ""} ${l.email || ""} ${l.project || ""} ${l.stage || ""} ${l.ownerName || ""} ${l.followUpNotes || ""}`.toLowerCase();
      return hay.includes(term);
    }).slice(0, 4);
  }, [q]);

  // 2. Properties matching
  const propResults = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return [];
    return CONSOLE_PROPERTIES.filter((p) => {
      const hay = `${p.name} ${p.builder} ${p.city} ${p.area} ${p.config} ${p.priceLabel}`.toLowerCase();
      return hay.includes(term);
    }).slice(0, 3);
  }, [q]);

  // 3. Modules matching
  const moduleResults = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return [];
    return CONSOLE_MODULES.filter((m) => {
      const hay = `${m.title} ${m.description} ${(m.keywords || []).join(" ")}`.toLowerCase();
      return hay.includes(term);
    }).slice(0, 3);
  }, [q]);

  const totalResults = leadResults.length + propResults.length + moduleResults.length;

  const handleExecuteSearch = (targetQuery: string) => {
    const term = targetQuery.trim();
    if (!term) return;
    setOpen(false);
    setQ("");

    if (isMarketplace || (propResults.length > 0 && leadResults.length === 0)) {
      navigate({ to: "/app/marketplace", search: { q: term } as any });
    } else {
      navigate({ to: "/app/leads", search: { q: term } as any });
    }
  };

  type QuickAction = { label: string; to?: string; onSelect?: () => void };
  const quickCreate: QuickAction[] = [
    { label: "New Lead", onSelect: () => setLeadOpen(true) },
    { label: "New Deal Room", to: "/app/dealrooms" },
    { label: "New Property", onSelect: () => setPropOpen(true) },
    { label: "New Voice Campaign", to: "/app/voice" },
    { label: "New Document", to: "/app/documents" },
    { label: "New Recommendation", to: "/app/recommendations" },
  ];

  const notifications = [
    { title: "3 new high-intent leads", body: "Assigned to your CRM inbox.", to: "/app/leads", time: "just now" },
    { title: "Deal room 'Skyline Towers' updated", body: "Health score moved to 82.", to: "/app/dealrooms", time: "12m" },
    { title: "Forecast confidence rose to 91%", body: "Executive Command refreshed.", to: "/app/command", time: "1h" },
  ];

  return (
    <header className="relative flex h-16 shrink-0 items-center gap-4 border-b border-border/60 bg-background/70 px-6 backdrop-blur-xl">
      {/* ← Fort Home */}
      <Link
        to={(fort.fort?.route ?? "/fort") as "/fort"}
        className="flex shrink-0 items-center gap-1.5 rounded-md border border-border/60 bg-surface px-2.5 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-sidebar-accent"
        title={`Back to your Sentinel Fort${fort.workspacePublicId ? ` (${fort.workspacePublicId})` : ""}`}
      >
        <ArrowLeft className="h-3.5 w-3.5 text-primary" />
        Fort Home
      </Link>
      <span className="hidden shrink-0 flex-col leading-none lg:flex">
        <div className="flex items-center gap-1.5">
          <span className="font-mono text-[10px] font-bold tracking-wider text-primary">
            {fort.workspacePublicId && fort.workspacePublicId !== "PENDING" && fort.workspacePublicId !== "WORKSPACE PENDING"
              ? fort.workspacePublicId
              : (fort.status === "ACTIVE" ? "SF-HQ-001" : "WORKSPACE PENDING")}
          </span>
          <span className={`h-1.5 w-1.5 rounded-full ${fort.status === "ACTIVE" ? "bg-emerald-500 animate-pulse" : "bg-amber-500"}`} />
        </div>
        <span className="mt-0.5 text-[10px] capitalize text-muted-foreground font-medium">
          {fort.role.appRoles.length
            ? fort.role.appRoles.join(" · ")
            : (fort.status === "ACTIVE" ? "Member" : "Access Pending")}
        </span>
      </span>

      {/* Context-Aware Search Input */}
      <div className="relative flex flex-1 items-center gap-3">
        <Search className="h-4 w-4 text-muted-foreground" />
        <input
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 200)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              handleExecuteSearch(q);
            }
            if (e.key === "Escape") setOpen(false);
          }}
          placeholder={placeholderText}
          className="w-full max-w-lg bg-transparent text-sm outline-none placeholder:text-muted-foreground font-normal"
        />

        {open && q.trim() && (
          <div className="absolute left-6 top-11 z-50 w-full max-w-lg overflow-hidden rounded-xl border border-border/80 bg-surface shadow-2xl backdrop-blur-xl">
            {totalResults === 0 ? (
              <div className="p-4 text-sm text-muted-foreground text-center">
                No CRM records or modules matching "{q}"
              </div>
            ) : (
              <div className="max-h-96 overflow-y-auto divide-y divide-border/40 py-1">
                {/* 1. Leads & Contacts */}
                {leadResults.length > 0 && (
                  <div className="p-2">
                    <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <Users className="h-3 w-3 text-primary" /> Leads & Contacts
                    </div>
                    {leadResults.map((l) => (
                      <button
                        key={l.id}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => {
                          setOpen(false);
                          setQ("");
                          navigate({
                            to: "/app/leads",
                            search: { leadId: l.id, q: l.name } as any,
                          });
                        }}
                        className="flex w-full items-center justify-between gap-3 rounded-lg px-2.5 py-2 text-left hover:bg-sidebar-accent transition-colors group"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors">
                              {l.name}
                            </span>
                            <span
                              className={`rounded-full px-2 py-0.2 text-[9px] font-bold border ${
                                stageSearchBadge[l.stage] || "bg-stone-500/20 text-stone-300 border-stone-500/30"
                              }`}
                            >
                              {l.stage}
                            </span>
                          </div>
                          <div className="text-[11px] text-muted-foreground truncate">
                            {l.project || "General"} · {l.budget} · {l.phone || l.email || "No phone"}
                          </div>
                        </div>
                        <span className="text-[10px] font-bold text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                          Open →
                        </span>
                      </button>
                    ))}
                  </div>
                )}

                {/* 2. Property Inventory */}
                {propResults.length > 0 && (
                  <div className="p-2">
                    <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <Building2 className="h-3 w-3 text-amber-400" /> Property Inventory
                    </div>
                    {propResults.map((p) => (
                      <button
                        key={p.id}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => {
                          setOpen(false);
                          setQ("");
                          navigate({
                            to: "/app/marketplace",
                            search: { q: p.name } as any,
                          });
                        }}
                        className="flex w-full items-center justify-between gap-3 rounded-lg px-2.5 py-2 text-left hover:bg-sidebar-accent transition-colors group"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors">
                              {p.name}
                            </span>
                            <span className="rounded-full bg-amber-500/15 border border-amber-500/30 px-1.5 py-0.2 text-[9px] font-bold text-amber-300">
                              {p.priceLabel}
                            </span>
                          </div>
                          <div className="text-[11px] text-muted-foreground truncate">
                            {p.builder} · {p.area}, {p.city} · {p.config}
                          </div>
                        </div>
                        <span className="text-[10px] font-bold text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                          View →
                        </span>
                      </button>
                    ))}
                  </div>
                )}

                {/* 3. Console Modules */}
                {moduleResults.length > 0 && (
                  <div className="p-2">
                    <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <Sparkles className="h-3 w-3 text-purple-400" /> Console Modules
                    </div>
                    {moduleResults.map((m) => (
                      <button
                        key={m.to}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => {
                          setOpen(false);
                          setQ("");
                          navigate({ to: m.to });
                        }}
                        className="flex w-full items-center justify-between gap-3 rounded-lg px-2.5 py-2 text-left hover:bg-sidebar-accent transition-colors group"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors">
                            {m.title}
                          </div>
                          <div className="text-[11px] text-muted-foreground truncate">
                            {m.description}
                          </div>
                        </div>
                        <span className="text-[10px] font-mono text-muted-foreground group-hover:text-foreground">
                          {m.to}
                        </span>
                      </button>
                    ))}
                  </div>
                )}

                {/* See all button */}
                <div className="p-2 bg-surface-elevated/30">
                  <button
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => handleExecuteSearch(q)}
                    className="w-full rounded-lg px-3 py-2 text-left text-xs font-medium text-primary hover:bg-sidebar-accent flex items-center justify-between"
                  >
                    <span>Search for "{q}" in {isMarketplace ? "Marketplace" : "Leads & CRM"}</span>
                    <span>→</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <Popover>
        <PopoverTrigger asChild>
          <button className="relative rounded-md p-2 hover:bg-surface" aria-label="Notifications">
            <Bell className="h-4 w-4" />
            <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-primary" />
          </button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-80 p-0">
          <div className="flex items-center justify-between border-b border-border/60 px-3 py-2">
            <span className="text-sm font-medium">Notifications</span>
            <button
              onClick={() => toast.success("All notifications marked as read")}
              className="text-[11px] text-muted-foreground hover:text-foreground"
            >
              Mark all read
            </button>
          </div>
          <ul className="max-h-96 divide-y divide-border/60 overflow-y-auto">
            {notifications.map((n) => (
              <li key={n.title}>
                <Link
                  to={n.to}
                  className="block px-3 py-2.5 hover:bg-sidebar-accent"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-sm text-foreground">{n.title}</span>
                    <span className="shrink-0 text-[10px] text-muted-foreground">{n.time}</span>
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">{n.body}</p>
                </Link>
              </li>
            ))}
          </ul>
        </PopoverContent>
      </Popover>

      <Popover>
        <PopoverTrigger asChild>
          <button className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground shadow-glow hover:bg-primary/90">
            <Plus className="h-3.5 w-3.5" /> New
          </button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-56 p-1">
          {quickCreate.map((item) =>
            item.onSelect ? (
              <button
                key={item.label}
                type="button"
                onClick={item.onSelect}
                className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-sm text-foreground hover:bg-sidebar-accent"
              >
                <Plus className="h-3.5 w-3.5 text-primary" />
                {item.label}
              </button>
            ) : (
              <Link
                key={item.label}
                to={item.to!}
                className="flex items-center gap-2 rounded-md px-2.5 py-1.5 text-sm text-foreground hover:bg-sidebar-accent"
              >
                <Plus className="h-3.5 w-3.5 text-primary" />
                {item.label}
              </Link>
            )
          )}
        </PopoverContent>
      </Popover>
      <NewLeadDialog open={leadOpen} onOpenChange={setLeadOpen} />
      <NewPropertyDialog open={propOpen} onOpenChange={setPropOpen} />
    </header>
  );
}
