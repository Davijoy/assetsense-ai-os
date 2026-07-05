import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useAuth } from "@/hooks/use-auth";
import { getRealtifyuConnectionsOverview } from "@/lib/realtifyu.functions";
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Cpu,
  Gauge,
  Loader2,
  Network,
  Plug,
  RefreshCw,
  ShieldCheck,
  Zap,
} from "lucide-react";

export const Route = createFileRoute("/realtifyu/connections")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "RealtifyU · Application Connections & Consumption" },
      {
        name: "description",
        content:
          "Live status of applications connected to RealtifyU, technology consumption, and a full log of connection events.",
      },
    ],
  }),
  component: ConnectionsPage,
});

type EventBadge = { label: string; className: string };
const eventBadge = (event: string, status: string): EventBadge => {
  if (status === "error") return { label: event, className: "border-red-500/40 bg-red-500/10 text-red-400" };
  if (event === "connect") return { label: "connect", className: "border-emerald-500/40 bg-emerald-500/10 text-emerald-400" };
  if (event === "disconnect") return { label: "disconnect", className: "border-amber-500/40 bg-amber-500/10 text-amber-400" };
  if (event === "refresh") return { label: "refresh", className: "border-sky-500/40 bg-sky-500/10 text-sky-400" };
  if (event === "api_call") return { label: "api", className: "border-primary/40 bg-primary/10 text-primary" };
  return { label: event, className: "border-border bg-muted/40 text-muted-foreground" };
};

function ConnectionsPage() {
  const { user, loading: authLoading } = useAuth();
  const overviewFn = useServerFn(getRealtifyuConnectionsOverview);
  const q = useQuery({
    queryKey: ["realtifyu-overview"],
    queryFn: () => overviewFn(),
    enabled: !!user,
    refetchInterval: 30_000,
  });

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b border-border/50 bg-background/70 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <Link to="/realtifyu" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Back to RealtifyU
          </Link>
          <button
            type="button"
            onClick={() => q.refetch()}
            className="inline-flex items-center gap-2 rounded-md border border-border bg-surface/50 px-3 py-1.5 text-xs text-foreground hover:bg-surface"
          >
            {q.isFetching ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
            Refresh
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-12">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/5 px-3 py-1 text-[10px] uppercase tracking-[0.22em] text-primary">
            <Network className="h-3 w-3" /> Connections & Consumption
          </div>
          <h1 className="mt-4 font-display text-4xl md:text-5xl">Application ↔ RealtifyU</h1>
          <p className="mt-3 text-muted-foreground">
            Live status of applications connected to RealtifyU OS, technology consumption for your account, and every connection event on record.
          </p>
        </div>

        {authLoading ? (
          <PanelSkeleton label="Checking session…" />
        ) : !user ? (
          <SignInPrompt />
        ) : q.isLoading ? (
          <PanelSkeleton label="Loading overview…" />
        ) : q.isError ? (
          <ErrorPanel message={(q.error as Error).message} onRetry={() => q.refetch()} />
        ) : (
          <ContentGrid data={q.data!} />
        )}
      </main>
    </div>
  );
}

function ContentGrid({ data }: { data: Awaited<ReturnType<ReturnType<typeof useServerFn<typeof getRealtifyuConnectionsOverview>>>> }) {
  const { connection, logs, consumption } = data;
  const connected = !!connection;

  const apps = [
    {
      name: "Sentinel Fort",
      role: "Anchor licensee",
      status: connected ? "connected" : "not_linked",
      details: connected
        ? `${connection?.account_name ?? connection?.account_email ?? "Linked account"}`
        : "Awaiting first RealtifyU OAuth handshake",
      since: connection?.connected_at,
    },
    {
      name: "RealtifyU OS",
      role: "Identity provider",
      status: connected ? "reachable" : "pending",
      details: connected
        ? `Scope: ${connection?.scope ?? "openid profile email"}`
        : "Authorization endpoint not yet exchanged",
    },
  ];

  return (
    <div className="mt-10 space-y-8">
      {/* Applications */}
      <section>
        <h2 className="mb-4 text-sm uppercase tracking-[0.22em] text-muted-foreground">Applications</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {apps.map((a) => (
            <div key={a.name} className="rounded-2xl border border-border bg-card p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="grid h-10 w-10 place-items-center rounded-xl border border-primary/30 bg-primary/10 text-primary">
                    <Plug className="h-4 w-4" />
                  </span>
                  <div>
                    <div className="font-display text-lg">{a.name}</div>
                    <div className="text-xs text-muted-foreground">{a.role}</div>
                  </div>
                </div>
                <StatusPill status={a.status} />
              </div>
              <div className="mt-3 text-sm text-muted-foreground">{a.details}</div>
              {a.since && (
                <div className="mt-2 text-xs text-muted-foreground/70">
                  Since {new Date(a.since).toLocaleString()}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Consumption */}
      <section>
        <h2 className="mb-4 text-sm uppercase tracking-[0.22em] text-muted-foreground">Technology consumption</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Metric icon={Activity} label="Events (24h)" value={consumption.events24h} />
          <Metric icon={Gauge} label="Events (7d)" value={consumption.events7d} />
          <Metric icon={Cpu} label="Total events" value={consumption.totalEvents} />
          <Metric icon={AlertTriangle} label="Errors" value={consumption.errors} tone={consumption.errors > 0 ? "warn" : "ok"} />
        </div>
        {Object.keys(consumption.byEvent).length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {Object.entries(consumption.byEvent).map(([ev, n]) => (
              <span key={ev} className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground">
                <Zap className="h-3 w-3 text-primary" /> {ev}
                <span className="font-mono text-foreground">{n}</span>
              </span>
            ))}
          </div>
        )}
      </section>

      {/* Logs */}
      <section>
        <h2 className="mb-4 text-sm uppercase tracking-[0.22em] text-muted-foreground">Connection logs</h2>
        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          {logs.length === 0 ? (
            <div className="flex flex-col items-center gap-2 p-10 text-center text-sm text-muted-foreground">
              <ShieldCheck className="h-5 w-5 text-primary" />
              No connection events yet. Connect RealtifyU from the main page to start streaming events.
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="border-b border-border/60 text-left text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">When</th>
                  <th className="px-4 py-3">Event</th>
                  <th className="px-4 py-3">Application</th>
                  <th className="px-4 py-3">Message</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((row) => {
                  const b = eventBadge(row.event, row.status);
                  return (
                    <tr key={row.id} className="border-b border-border/40 last:border-0 hover:bg-muted/20">
                      <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                        {new Date(row.created_at).toLocaleString()}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] ${b.className}`}>
                          {b.label}
                        </span>
                        {row.status === "error" && (
                          <span className="ml-2 text-[11px] text-red-400">error</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-foreground">{row.application}</td>
                      <td className="px-4 py-3 text-muted-foreground">{row.message ?? "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </div>
  );
}

function Metric({
  icon: Icon, label, value, tone = "ok",
}: { icon: React.ComponentType<{ className?: string }>; label: string; value: number; tone?: "ok" | "warn" }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center justify-between">
        <span className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{label}</span>
        <Icon className={`h-4 w-4 ${tone === "warn" ? "text-amber-400" : "text-primary"}`} />
      </div>
      <div className="mt-3 font-display text-3xl">{value}</div>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, string> = {
    connected: "border-emerald-500/40 bg-emerald-500/10 text-emerald-400",
    reachable: "border-emerald-500/40 bg-emerald-500/10 text-emerald-400",
    pending: "border-amber-500/40 bg-amber-500/10 text-amber-400",
    not_linked: "border-border bg-muted/40 text-muted-foreground",
  };
  const label = status.replace(/_/g, " ");
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] uppercase tracking-[0.16em] ${map[status] ?? map.pending}`}>
      <CheckCircle2 className="h-3 w-3" />
      {label}
    </span>
  );
}

function PanelSkeleton({ label }: { label: string }) {
  return (
    <div className="mt-10 flex items-center justify-center gap-3 rounded-2xl border border-border bg-card p-10 text-sm text-muted-foreground">
      <Loader2 className="h-4 w-4 animate-spin" /> {label}
    </div>
  );
}

function ErrorPanel({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="mt-10 rounded-2xl border border-red-500/40 bg-red-500/5 p-6">
      <div className="flex items-center gap-2 text-red-400"><AlertTriangle className="h-4 w-4" /> Failed to load overview</div>
      <p className="mt-2 text-sm text-muted-foreground">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-4 inline-flex items-center gap-2 rounded-md border border-border bg-surface/50 px-3 py-1.5 text-xs hover:bg-surface"
      >
        <RefreshCw className="h-3.5 w-3.5" /> Try again
      </button>
    </div>
  );
}

function SignInPrompt() {
  return (
    <div className="mt-10 rounded-2xl border border-border bg-card p-8 text-center">
      <div className="font-display text-2xl">Sign in required</div>
      <p className="mt-2 text-sm text-muted-foreground">
        Sign in to view your RealtifyU connections and consumption.
      </p>
      <Link
        to="/auth"
        className="mt-4 inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-glow hover:bg-primary/90"
      >
        Sign in
      </Link>
    </div>
  );
}