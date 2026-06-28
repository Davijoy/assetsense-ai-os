import { createFileRoute, Link, Outlet, useRouterState, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { SentinelMark } from "@/components/brand/Logo";
import { useAuth, type AppRole } from "@/hooks/use-auth";
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
  Loader2,
} from "lucide-react";

export const Route = createFileRoute("/app")({
  head: () => ({
    meta: [
      { title: "Sentinel Fort Group Console" },
      { name: "description", content: "Sentinel Fort Group operating console — CRM, marketplace, AI voice and BI." },
    ],
  }),
  component: AppShell,
});

type NavItem = { to: string; label: string; icon: any; soon?: boolean; roles: AppRole[] };

const nav: NavItem[] = [
  { to: "/app/crm", label: "CRM", icon: LayoutDashboard, roles: ["admin", "manager", "agent", "viewer"] },
  { to: "/app/leads", label: "Leads", icon: Users, roles: ["admin", "manager", "agent"] },
  { to: "/app/marketplace", label: "Marketplace", icon: Building2, roles: ["admin", "manager", "agent", "viewer"] },
  { to: "/app/voice", label: "AI Voice", icon: PhoneCall, roles: ["admin", "manager", "agent"] },
  { to: "/app/marketing", label: "Marketing", icon: Megaphone, roles: ["admin", "manager", "agent"] },
  { to: "/app/bi", label: "Intelligence", icon: BarChart3, roles: ["admin", "manager", "viewer"] },
  { to: "/app/partners", label: "Partners", icon: Handshake, soon: true, roles: ["admin", "manager"] },
];

const kieNav: NavItem[] = [
  { to: "/app/command", label: "Executive Command", icon: Command, roles: ["admin", "manager"] },
  { to: "/app/copilot", label: "AI Copilot", icon: Sparkles, roles: ["admin", "manager", "agent"] },
  { to: "/app/docchat", label: "Document Chat", icon: MessageSquareText, roles: ["admin", "manager", "agent"] },
  { to: "/app/recommendations", label: "Recommendations", icon: Lightbulb, roles: ["admin", "manager"] },
  { to: "/app/workflows", label: "Autonomous Workflows", icon: Workflow, roles: ["admin", "manager"] },
  { to: "/app/dealrooms", label: "Deal Rooms", icon: GitBranch, roles: ["admin", "manager", "agent"] },
  { to: "/app/risk", label: "Risk Center", icon: ShieldAlert, roles: ["admin", "manager"] },
  { to: "/app/market", label: "Market Intelligence", icon: Globe2, roles: ["admin", "manager", "viewer"] },
  { to: "/app/inventory", label: "Inventory Intelligence", icon: Package, roles: ["admin", "manager"] },
  { to: "/app/collections", label: "Collections AI", icon: Banknote, roles: ["admin", "manager"] },
  { to: "/app/salesintel", label: "Sales Intelligence", icon: Gauge, roles: ["admin", "manager"] },
  { to: "/app/graph", label: "Intelligence Graph", icon: Network, roles: ["admin", "manager"] },
  { to: "/app/documents", label: "Documents", icon: FileText, roles: ["admin", "manager", "agent"] },
  { to: "/app/kie", label: "Legacy KIE", icon: BarChart3, roles: ["admin", "manager"] },
];

const adminNav: NavItem[] = [
  { to: "/app/governance", label: "Governance", icon: ScrollText, roles: ["admin"] },
  { to: "/app/settings/branding", label: "Branding", icon: Palette, roles: ["admin"] },
];

function AppShell() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const { user, loading, roles, isAdmin, signOut } = useAuth();

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [loading, user, navigate]);

  if (loading || !user) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
      </div>
    );
  }

  const canSee = (item: NavItem) => roles.some((r) => item.roles.includes(r));
  const visibleNav = nav.filter(canSee);
  const visibleKie = kieNav.filter(canSee);
  const visibleAdmin = adminNav.filter(canSee);
  const displayName =
    (user.user_metadata?.full_name as string | undefined) ||
    (user.user_metadata?.name as string | undefined) ||
    user.email?.split("@")[0] ||
    "Account";
  const primaryRole = roles[0] ?? "viewer";

  return (
    <div className="min-h-screen bg-background text-foreground">
      <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col border-r border-border/60 bg-sidebar md:flex">
        <Link to="/" className="flex h-16 items-center gap-2 px-6 border-b border-border/60">
          <SentinelMark />
          <div className="flex flex-col leading-none">
            <span className="font-display text-xl">Sentinel Fort</span>
            <span className="text-[9px] uppercase tracking-[0.22em] text-gold/80">Group</span>
          </div>
        </Link>
        <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-4">
          <p className="px-3 pb-2 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Workspace</p>
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
          {isAdmin && (
            <Link
              to="/app/users"
              className={`group flex items-center gap-3 rounded-md px-3 py-1.5 text-[13px] transition-colors ${
                path.startsWith("/app/users")
                  ? "bg-primary/10 text-foreground"
                  : "text-muted-foreground hover:bg-sidebar-accent hover:text-foreground"
              }`}
            >
              <Users className={`h-4 w-4 ${path.startsWith("/app/users") ? "text-primary" : ""}`} />
              Users & Roles
            </Link>
          )}
        </nav>
        <div className="border-t border-border/60 p-4">
          <DropdownMenu>
            <DropdownMenuTrigger className="flex w-full items-center gap-3 rounded-md p-1 hover:bg-sidebar-accent">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-primary to-emerald-glow text-xs font-medium text-primary-foreground">
                {displayName.slice(0, 1).toUpperCase()}
              </div>
              <div className="flex-1 text-left">
                <div className="truncate text-sm">{displayName}</div>
                <div className="text-xs capitalize text-muted-foreground">{primaryRole}</div>
              </div>
              <Settings className="h-4 w-4 text-muted-foreground" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="font-normal">
                <div className="text-sm">{displayName}</div>
                <div className="text-xs text-muted-foreground">{user.email}</div>
                <div className="mt-1 text-[10px] uppercase tracking-wider text-primary">
                  {roles.length ? roles.join(" · ") : "viewer"}
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {isAdmin && (
                <DropdownMenuItem asChild>
                  <Link to="/app/users">Manage users</Link>
                </DropdownMenuItem>
              )}
              <DropdownMenuItem
                onClick={async () => {
                  await signOut();
                  navigate({ to: "/auth" });
                }}
              >
                <LogOut className="h-4 w-4" /> Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>

      <div className="flex h-screen flex-col md:pl-64">
        <header className="flex h-16 shrink-0 items-center gap-4 border-b border-border/60 bg-background/70 px-6 backdrop-blur-xl">
          <div className="flex flex-1 items-center gap-3">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input
              placeholder="Search leads, properties, deals…"
              className="w-full max-w-md bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>
          <button className="relative rounded-md p-2 hover:bg-surface">
            <Bell className="h-4 w-4" />
            <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-primary" />
          </button>
          <button className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground shadow-glow hover:bg-primary/90">
            <Plus className="h-3.5 w-3.5" /> New
          </button>
        </header>
        <main className="flex-1 overflow-y-auto px-6 py-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}