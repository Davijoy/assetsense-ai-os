import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { SentinelMark } from "@/components/brand/Logo";
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
  Newspaper,
  Workflow,
  Banknote,
  GitBranch,
  ScrollText,
  Gauge,
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

const nav = [
  { to: "/app/crm", label: "CRM", icon: LayoutDashboard },
  { to: "/app/leads", label: "Leads", icon: Users },
  { to: "/app/marketplace", label: "Marketplace", icon: Building2 },
  { to: "/app/voice", label: "AI Voice", icon: PhoneCall },
  { to: "/app/marketing", label: "Marketing", icon: Megaphone, soon: true },
  { to: "/app/bi", label: "Intelligence", icon: BarChart3 },
  { to: "/app/partners", label: "Partners", icon: Handshake, soon: true },
];

const kieNav = [
  { to: "/app/command", label: "Executive Command", icon: Command },
  { to: "/app/feed", label: "AI Feed", icon: Newspaper },
  { to: "/app/copilot", label: "AI Copilot", icon: Sparkles },
  { to: "/app/recommendations", label: "Recommendations", icon: Lightbulb },
  { to: "/app/workflows", label: "Autonomous Workflows", icon: Workflow },
  { to: "/app/dealrooms", label: "Deal Rooms", icon: GitBranch },
  { to: "/app/risk", label: "Risk Center", icon: ShieldAlert },
  { to: "/app/market", label: "Market Intelligence", icon: Globe2 },
  { to: "/app/collections", label: "Collections AI", icon: Banknote },
  { to: "/app/salesintel", label: "Sales Intelligence", icon: Gauge },
  { to: "/app/graph", label: "Intelligence Graph", icon: Network },
  { to: "/app/documents", label: "Documents", icon: FileText },
  { to: "/app/kie", label: "Legacy KIE", icon: BarChart3 },
];

const adminNav = [
  { to: "/app/governance", label: "Governance", icon: ScrollText },
  { to: "/app/settings/branding", label: "Branding", icon: Palette },
];

function AppShell() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  return (
    <div className="min-h-screen bg-background text-foreground">
      <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col border-r border-border/60 bg-sidebar lg:flex">
        <Link to="/" className="flex h-16 items-center gap-2 px-6 border-b border-border/60">
          <SentinelMark />
          <div className="flex flex-col leading-none">
            <span className="font-display text-xl">Sentinel Fort</span>
            <span className="text-[9px] uppercase tracking-[0.22em] text-gold/80">Group</span>
          </div>
        </Link>
        <nav className="flex-1 space-y-1 px-3 py-6">
          <p className="px-3 pb-2 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Workspace</p>
          {nav.map((n) => {
            const active = path.startsWith(n.to);
            const Icon = n.icon;
            return (
              <Link
                key={n.to}
                to={n.to}
                className={`group flex items-center justify-between rounded-md px-3 py-2 text-sm transition-colors ${
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
          <p className="mt-6 px-3 pb-2 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            Knowledge Engine
          </p>
          {kieNav.map((n) => {
            const active = path === n.to || path.startsWith(n.to + "/");
            const Icon = n.icon;
            return (
              <Link
                key={n.to}
                to={n.to}
                className={`group flex items-center justify-between rounded-md px-3 py-2 text-sm transition-colors ${
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
          <p className="mt-6 px-3 pb-2 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            Admin
          </p>
          {adminNav.map((n) => {
            const active = path.startsWith(n.to);
            const Icon = n.icon;
            return (
              <Link
                key={n.to}
                to={n.to}
                className={`group flex items-center justify-between rounded-md px-3 py-2 text-sm transition-colors ${
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
        </nav>
        <div className="border-t border-border/60 p-4">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-gradient-to-br from-primary to-emerald-glow" />
            <div className="flex-1">
              <div className="text-sm">Aarav Mehta</div>
              <div className="text-xs text-muted-foreground">Lodha Group</div>
            </div>
            <Settings className="h-4 w-4 text-muted-foreground" />
          </div>
        </div>
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-40 flex h-16 items-center gap-4 border-b border-border/60 bg-background/70 px-6 backdrop-blur-xl">
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
        <main className="px-6 py-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}