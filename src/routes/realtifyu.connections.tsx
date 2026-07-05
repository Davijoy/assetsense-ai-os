import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import {
  exportRealtifyuLogsCsv,
  getRealtifyuConnectionsOverview,
  getRealtifyuLogs,
  getRealtifyuLogsPerf,
} from "@/lib/realtifyu.functions";
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ChevronsUpDown,
  Database,
  Download,
  Filter,
  Pause,
  Play,
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
  const { connection, consumption } = data;
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
      <LogsSection eventOptions={Object.keys(consumption.byEvent)} />
    </div>
  );
}

type SortBy = "created_at" | "event" | "status" | "application";
type SortDir = "asc" | "desc";

function LogsSection({ eventOptions }: { eventOptions: string[] }) {
  const logsFn = useServerFn(getRealtifyuLogs);
  const exportFn = useServerFn(exportRealtifyuLogsCsv);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [sortBy, setSortBy] = useState<SortBy>("created_at");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [event, setEvent] = useState("all");
  const [status, setStatus] = useState("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [search, setSearch] = useState("");
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [intervalMs, setIntervalMs] = useState(30_000);
  const [exporting, setExporting] = useState(false);

  const filters = useMemo(
    () => ({
      page,
      pageSize,
      sortBy,
      sortDir,
      event,
      status,
      from: from ? new Date(from).toISOString() : undefined,
      to: to ? new Date(to).toISOString() : undefined,
      search: search || undefined,
    }),
    [page, pageSize, sortBy, sortDir, event, status, from, to, search],
  );

  const q = useQuery({
    queryKey: ["realtifyu-logs", filters],
    queryFn: () => logsFn({ data: filters }),
    refetchInterval: autoRefresh ? intervalMs : false,
    placeholderData: (prev) => prev,
  });

  const toggleSort = (col: SortBy) => {
    if (sortBy === col) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else { setSortBy(col); setSortDir("desc"); }
    setPage(1);
  };

  const resetFilters = () => {
    setEvent("all"); setStatus("all"); setFrom(""); setTo(""); setSearch(""); setPage(1);
  };

  const rows = q.data?.rows ?? [];
  const total = q.data?.total ?? 0;
  const totalPages = q.data?.totalPages ?? 1;

  const handleExport = async () => {
    setExporting(true);
    try {
      const { csv } = await exportFn({
        data: {
          sortBy, sortDir, event, status,
          from: filters.from, to: filters.to, search: filters.search,
        },
      });
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `realtifyu-logs-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")}.csv`;
      document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  };

  const inputCls = "h-9 rounded-md border border-border bg-surface/40 px-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary/40";

  return (
    <section>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-sm uppercase tracking-[0.22em] text-muted-foreground">Connection logs</h2>
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span>{q.isFetching ? "Refreshing…" : `${total} event${total === 1 ? "" : "s"}`}</span>
          <div className="ml-2 inline-flex items-center gap-1 rounded-md border border-border bg-surface/40 p-0.5">
            <button
              type="button"
              onClick={() => setAutoRefresh((v) => !v)}
              className={`inline-flex items-center gap-1 rounded px-2 py-1 text-[11px] ${autoRefresh ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground"}`}
              title={autoRefresh ? "Pause live refresh" : "Resume live refresh"}
            >
              {autoRefresh ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
              Live
            </button>
            <select
              value={intervalMs}
              onChange={(e) => setIntervalMs(Number(e.target.value))}
              disabled={!autoRefresh}
              className="h-7 rounded bg-transparent px-1 text-[11px] text-foreground focus:outline-none disabled:opacity-50"
            >
              <option value={5000}>5s</option>
              <option value={10000}>10s</option>
              <option value={30000}>30s</option>
              <option value={60000}>1m</option>
              <option value={300000}>5m</option>
            </select>
          </div>
          <button
            type="button"
            onClick={handleExport}
            disabled={exporting || total === 0}
            className="inline-flex items-center gap-1 rounded-md border border-border bg-surface/40 px-2 py-1 text-[11px] hover:bg-surface disabled:opacity-40"
          >
            {exporting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Download className="h-3 w-3" />}
            Export CSV
          </button>
        </div>
      </div>

      <PerformancePanel />

      {/* Filters */}
      <div className="mb-3 grid grid-cols-2 gap-2 rounded-2xl border border-border bg-card p-3 md:grid-cols-6">
        <label className="col-span-2 flex flex-col gap-1 text-[10px] uppercase tracking-[0.16em] text-muted-foreground md:col-span-1">
          <span className="inline-flex items-center gap-1"><Filter className="h-3 w-3" /> Event</span>
          <select className={inputCls} value={event} onChange={(e) => { setEvent(e.target.value); setPage(1); }}>
            <option value="all">All events</option>
            {["connect","disconnect","refresh","api_call", ...eventOptions.filter(e => !["connect","disconnect","refresh","api_call"].includes(e))].map((e) => (
              <option key={e} value={e}>{e}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
          Status
          <select className={inputCls} value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
            <option value="all">All</option>
            <option value="ok">ok</option>
            <option value="error">error</option>
            <option value="pending">pending</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
          From
          <input type="datetime-local" className={inputCls} value={from} onChange={(e) => { setFrom(e.target.value); setPage(1); }} />
        </label>
        <label className="flex flex-col gap-1 text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
          To
          <input type="datetime-local" className={inputCls} value={to} onChange={(e) => { setTo(e.target.value); setPage(1); }} />
        </label>
        <label className="col-span-2 flex flex-col gap-1 text-[10px] uppercase tracking-[0.16em] text-muted-foreground md:col-span-1">
          Search message
          <input type="text" placeholder="contains…" className={inputCls} value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
        </label>
        <div className="col-span-2 flex items-end justify-end md:col-span-1">
          <button type="button" onClick={resetFilters} className="h-9 rounded-md border border-border bg-surface/40 px-3 text-xs text-muted-foreground hover:bg-surface hover:text-foreground">
            Reset
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        {q.isLoading ? (
          <div className="flex items-center justify-center gap-2 p-10 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading logs…
          </div>
        ) : rows.length === 0 ? (
          <div className="flex flex-col items-center gap-2 p-10 text-center text-sm text-muted-foreground">
            <ShieldCheck className="h-5 w-5 text-primary" />
            No connection events match the current filters.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-border/60 text-left text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
              <tr>
                <SortableTh label="When" col="created_at" sortBy={sortBy} sortDir={sortDir} onToggle={toggleSort} />
                <SortableTh label="Event" col="event" sortBy={sortBy} sortDir={sortDir} onToggle={toggleSort} />
                <SortableTh label="Status" col="status" sortBy={sortBy} sortDir={sortDir} onToggle={toggleSort} />
                <SortableTh label="Application" col="application" sortBy={sortBy} sortDir={sortDir} onToggle={toggleSort} />
                <th className="px-4 py-3">Message</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
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
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-[11px] ${row.status === "error" ? "text-red-400" : "text-muted-foreground"}`}>
                        {row.status}
                      </span>
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

      {/* Pagination */}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
        <div className="inline-flex items-center gap-2">
          <span>Rows per page</span>
          <select
            className={inputCls}
            value={pageSize}
            onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
          >
            {[10, 25, 50, 100].map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>
        <div className="inline-flex items-center gap-3">
          <span>Page {page} of {totalPages}</span>
          <div className="inline-flex items-center gap-1">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border bg-surface/40 disabled:opacity-40 hover:bg-surface"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border bg-surface/40 disabled:opacity-40 hover:bg-surface"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

function PerformancePanel() {
  const perfFn = useServerFn(getRealtifyuLogsPerf);
  const q = useQuery({
    queryKey: ["realtifyu-logs-perf"],
    queryFn: () => perfFn(),
    refetchInterval: 60_000,
  });

  const health = q.data?.health;
  const dot = health === "good" ? "bg-emerald-400" : health === "warn" ? "bg-amber-400" : health === "bad" ? "bg-red-400" : "bg-muted";

  return (
    <details className="mb-3 rounded-2xl border border-border bg-card">
      <summary className="flex cursor-pointer items-center justify-between gap-3 px-4 py-3 text-xs uppercase tracking-[0.18em] text-muted-foreground">
        <span className="inline-flex items-center gap-2">
          <Database className="h-3.5 w-3.5 text-primary" /> Backend performance
          <span className={`ml-2 inline-block h-2 w-2 rounded-full ${dot}`} />
          {q.data && <span className="normal-case tracking-normal text-muted-foreground">· {q.data.totalMs} ms total</span>}
        </span>
        <span className="text-[10px] text-muted-foreground">click to expand</span>
      </summary>
      <div className="border-t border-border/60 p-4">
        {q.isLoading ? (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="h-3 w-3 animate-spin" /> Sampling query latency…
          </div>
        ) : q.data ? (
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <div className="mb-2 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Query samples</div>
              <ul className="space-y-1 text-xs">
                {q.data.samples.map((s) => (
                  <li key={s.label} className="flex items-center justify-between rounded border border-border/60 bg-surface/30 px-2 py-1">
                    <span className="text-muted-foreground">{s.label}</span>
                    <span className={`font-mono ${s.ms > 300 ? "text-amber-400" : "text-foreground"}`}>{s.ms} ms</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <div className="mb-2 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Recommended indexes</div>
              <ul className="space-y-1 text-xs">
                {q.data.suggestions.map((s) => (
                  <li key={s.name} className="rounded border border-border/60 bg-surface/30 px-2 py-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <code className="truncate font-mono text-[11px] text-foreground">{s.name}</code>
                      <span className={`text-[10px] uppercase tracking-[0.14em] ${s.present ? "text-emerald-400" : "text-amber-400"}`}>
                        {s.present ? "present" : "missing"}
                      </span>
                    </div>
                    <div className="mt-1 text-[10px] text-muted-foreground">{s.why}</div>
                    <div className="mt-1 font-mono text-[10px] text-muted-foreground/70">{s.sql}</div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ) : q.isError ? (
          <div className="text-xs text-red-400">Failed to sample performance: {(q.error as Error).message}</div>
        ) : null}
      </div>
    </details>
  );
}

function SortableTh({
  label, col, sortBy, sortDir, onToggle,
}: { label: string; col: SortBy; sortBy: SortBy; sortDir: SortDir; onToggle: (c: SortBy) => void }) {
  const active = sortBy === col;
  return (
    <th className="px-4 py-3">
      <button
        type="button"
        onClick={() => onToggle(col)}
        className={`inline-flex items-center gap-1 uppercase tracking-[0.18em] ${active ? "text-foreground" : "text-muted-foreground hover:text-foreground"}`}
      >
        {label}
        <ChevronsUpDown className={`h-3 w-3 ${active ? "opacity-100" : "opacity-40"}`} />
        {active && <span className="text-[9px]">{sortDir}</span>}
      </button>
    </th>
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