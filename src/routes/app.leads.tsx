import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { isRouteAuthorized } from "@/lib/route-roles";
import {
  Sparkles,
  Phone,
  Mail,
  Filter,
  Download,
  X,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  UserCheck,
  UserPlus,
  CalendarClock,
  Clock,
  CheckCircle,
  AlertCircle,
  Calendar,
  ShieldAlert,
} from "lucide-react";
import {
  getLiveLeads,
  selfAssignLead,
  formatExactTimestamp,
  type LiveLead,
} from "@/lib/crm.functions";
import { LeadDetailDrawer } from "@/components/crm/LeadDetailDrawer";

export const Route = createFileRoute("/app/leads")({
  validateSearch: (search: Record<string, unknown>): { q?: string; leadId?: string } => ({
    q: typeof search.q === "string" ? search.q : undefined,
    leadId: typeof search.leadId === "string" ? search.leadId : undefined,
  }),
  head: () => ({ meta: [{ title: "Leads — Sentinel Fort Group" }] }),
  beforeLoad: async ({ context, location }) => {
    const roles = (context as any)?.user?.roles ?? (context as any)?.fort?.role?.appRoles ?? [];
    if (roles.length > 0 && !isRouteAuthorized(roles, location.pathname)) {
      throw redirect({ to: "/fort" });
    }
  },
  component: Leads,
});

const stageColor: Record<string, string> = {
  New: "bg-sky-400/15 text-sky-300",
  Qualified: "bg-emerald-400/15 text-emerald-300",
  "Call Back": "bg-amber-400/15 text-amber-300 border border-amber-500/20",
  RNR: "bg-orange-400/15 text-orange-300 border border-orange-500/20",
  "RNR (Ringing Not Responded)": "bg-orange-400/15 text-orange-300 border border-orange-500/20",
  Busy: "bg-yellow-400/15 text-yellow-300 border border-yellow-500/20",
  "Switch Off": "bg-rose-400/15 text-rose-300 border border-rose-500/20",
  "Not Interested": "bg-stone-400/15 text-stone-400 border border-stone-500/20",
  "Dropped Plan": "bg-red-400/15 text-red-400 border border-red-500/20",
  "Site Visit Scheduled": "bg-violet-400/20 text-violet-300 border border-violet-500/40",
  Visit: "bg-violet-400/15 text-violet-300",
  Negotiation: "bg-indigo-400/15 text-indigo-300",
  RFR: "bg-teal-400/20 text-teal-300 border border-teal-500/40",
  "RFR (Ready for Registration)": "bg-teal-400/20 text-teal-300 border border-teal-500/40",
  Booked: "bg-emerald-400/25 text-emerald-200 border border-emerald-500/40 font-bold",
};

const stageOrder: Record<string, number> = {
  New: 0,
  Qualified: 1,
  "Call Back": 2,
  "RNR (Ringing Not Responded)": 3,
  RNR: 3,
  Busy: 4,
  "Switch Off": 5,
  "Site Visit Scheduled": 6,
  Visit: 6,
  Negotiation: 7,
  "RFR (Ready for Registration)": 8,
  RFR: 8,
  Booked: 9,
  "Not Interested": 10,
  "Dropped Plan": 11,
};

const parseAgo = (s?: string): number => {
  if (!s) return Number.POSITIVE_INFINITY;
  const m = /^(\d+)\s*([smhd])$/.exec(s.trim());
  if (!m) return Number.POSITIVE_INFINITY;
  const n = Number(m[1]);
  return n * ({ s: 1 / 60, m: 1, h: 60, d: 1440 }[m[2] as "s" | "m" | "h" | "d"] ?? 1);
};

const parseBudget = (s: string): number => {
  const m = /([\d.]+)\s*(Cr|L|K)?/i.exec(s);
  if (!m) return 0;
  const n = Number(m[1]);
  const unit = (m[2] ?? "").toLowerCase();
  return unit === "cr" ? n * 1e7 : unit === "l" ? n * 1e5 : unit === "k" ? n * 1e3 : n;
};

type SortKey = "name" | "project" | "budget" | "source" | "stage" | "score" | "last" | "owner" | "followup";
type SortDir = "asc" | "desc";

const SORT_ACCESSORS: Record<SortKey, (l: LiveLead) => string | number> = {
  name: (l) => l.name.toLowerCase(),
  project: (l) => (l.project || "").toLowerCase(),
  budget: (l) => l.budgetInr ?? parseBudget(l.budget),
  source: (l) => l.source.toLowerCase(),
  stage: (l) => stageOrder[l.stage] ?? 99,
  score: (l) => l.score,
  last: (l) => parseAgo(l.lastActivityAgo),
  owner: (l) => (l.ownerName || l.owner || "Unassigned").toLowerCase(),
  followup: (l) => (l.followUpDate ? `${l.followUpDate} ${l.followUpTime || "00:00"}` : "9999-99-99"),
};

function Leads() {
  const searchParams = Route.useSearch();
  const fetchLiveLeadsFn = useServerFn(getLiveLeads);
  const selfAssignFn = useServerFn(selfAssignLead);

  const { data: leadsData } = useQuery({
    queryKey: ["leads-table-live"],
    queryFn: () => fetchLiveLeadsFn(),
    refetchInterval: 30_000,
  });

  const [leadsList, setLeadsList] = useState<LiveLead[]>([]);
  const [selectedLead, setSelectedLead] = useState<LiveLead | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    if (Array.isArray(leadsData)) {
      setLeadsList(leadsData);
    }
  }, [leadsData]);

  const [filtersOpen, setFiltersOpen] = useState(false);
  const [stageFilter, setStageFilter] = useState<string>("all");
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [ownerFilter, setOwnerFilter] = useState<string>("all");
  const [followUpFilter, setFollowUpFilter] = useState<string>("all");
  const [minScore, setMinScore] = useState<number>(0);
  const [query, setQuery] = useState(searchParams.q || "");
  const [sortKey, setSortKey] = useState<SortKey>("last");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  useEffect(() => {
    if (searchParams.q !== undefined) {
      setQuery(searchParams.q);
    }
    if (searchParams.leadId && leadsList.length > 0) {
      const found = leadsList.find((l) => l.id === searchParams.leadId);
      if (found) {
        setSelectedLead(found);
        setDrawerOpen(true);
      }
    }
  }, [searchParams.q, searchParams.leadId, leadsList]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(key === "score" || key === "budget" ? "desc" : "asc");
    }
  };

  const stages = useMemo(() => Array.from(new Set(leadsList.map((l) => l.stage))), [leadsList]);
  const sources = useMemo(() => Array.from(new Set(leadsList.map((l) => l.source))), [leadsList]);

  const filteredSorted = useMemo(() => {
    const todayStr = new Date().toISOString().split("T")[0];

    const filtered = leadsList.filter((l) => {
      if (stageFilter !== "all" && l.stage !== stageFilter) return false;
      if (sourceFilter !== "all" && l.source !== sourceFilter) return false;
      if (ownerFilter === "unassigned") {
        if (l.owner && l.owner !== "Unassigned" && l.owner !== "none") return false;
      } else if (ownerFilter === "me") {
        if (l.owner !== "AM" && l.ownerName !== "Aarav Mehta") return false;
      } else if (ownerFilter !== "all") {
        if (l.owner !== ownerFilter && l.ownerName !== ownerFilter) return false;
      }

      if (followUpFilter === "scheduled") {
        if (!l.followUpDate || l.followUpStatus === "completed") return false;
      } else if (followUpFilter === "today") {
        if (l.followUpDate !== todayStr) return false;
      } else if (followUpFilter === "completed") {
        if (l.followUpStatus !== "completed") return false;
      } else if (followUpFilter === "none") {
        if (l.followUpDate) return false;
      }

      if (l.score < minScore) return false;
      if (query.trim()) {
        const q = query.toLowerCase();
        const matchName = l.name.toLowerCase().includes(q);
        const matchProj = (l.project || "").toLowerCase().includes(q);
        const matchEmail = (l.email || "").toLowerCase().includes(q);
        const matchPhone = (l.phone || "").toLowerCase().includes(q);
        const matchStage = (l.stage || "").toLowerCase().includes(q);
        if (!matchName && !matchProj && !matchEmail && !matchPhone && !matchStage) return false;
      }
      return true;
    });

    return filtered.sort((a, b) => {
      const av = SORT_ACCESSORS[sortKey](a);
      const bv = SORT_ACCESSORS[sortKey](b);
      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
  }, [leadsList, stageFilter, sourceFilter, ownerFilter, followUpFilter, minScore, query, sortKey, sortDir]);

  const activeFilterCount =
    (stageFilter !== "all" ? 1 : 0) +
    (sourceFilter !== "all" ? 1 : 0) +
    (ownerFilter !== "all" ? 1 : 0) +
    (followUpFilter !== "all" ? 1 : 0) +
    (minScore > 0 ? 1 : 0) +
    (query.trim() ? 1 : 0);

  const clearFilters = () => {
    setStageFilter("all");
    setSourceFilter("all");
    setOwnerFilter("all");
    setFollowUpFilter("all");
    setMinScore(0);
    setQuery("");
  };

  const handleOpenLead = (lead: LiveLead) => {
    setSelectedLead(lead);
    setDrawerOpen(true);
  };

  const handleLeadUpdated = (updated: LiveLead) => {
    setSelectedLead(updated);
    setLeadsList((prev) => prev.map((l) => (l.id === updated.id ? updated : l)));
  };

  const routeContext = Route.useRouteContext() as any;
  const userRoles: string[] = routeContext?.user?.roles ?? routeContext?.fort?.role?.appRoles ?? [];
  const isViewOnly =
    userRoles.length > 0 &&
    !userRoles.some((r) => ["admin", "manager", "agent"].includes(r));

  return (
    <div className="space-y-6">
      {isViewOnly && (
        <div className="flex items-center gap-2.5 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-2.5 text-xs text-amber-200 shadow-sm animate-in fade-in duration-150">
          <AlertCircle className="h-4 w-4 shrink-0 text-amber-400" />
          <span>
            <strong>View-Only Mode:</strong> You have read-only visibility for leads and inquiries. Stage modifications and lead assignments are disabled for your access level.
          </span>
        </div>
      )}

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-primary">Intelligence · CRM</p>
          <h1 className="mt-1 font-display text-4xl">Leads & Follow-Ups</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Complete database of inbound buyer inquiries, follow-up schedules, and real-time disposition logs.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {/* Direct On-Page Search Input */}
          <div className="relative w-72">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search leads by name, phone, project..."
              className="w-full rounded-xl border border-border bg-card px-3.5 py-2 text-xs text-foreground placeholder:text-muted-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary shadow-sm"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-xs"
              >
                ✕
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={() => setFiltersOpen((o) => !o)}
            className={`flex items-center gap-2 rounded-xl border px-3.5 py-2 text-xs font-semibold transition-all ${
              filtersOpen || activeFilterCount > 0
                ? "border-primary bg-primary/10 text-primary"
                : "border-border bg-card text-muted-foreground hover:text-foreground"
            }`}
          >
            <Filter className="h-3.5 w-3.5" />
            <span>Filters</span>
            {activeFilterCount > 0 && (
              <span className="grid h-4 min-w-4 place-items-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      {filtersOpen && (
        <div className="rounded-2xl border border-border bg-card p-4 space-y-3 animate-in fade-in duration-150">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-5 text-xs">
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">
                Search
              </label>
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Name, project, email, phone..."
                className="w-full rounded-lg border border-border bg-surface px-3 py-1.5 text-xs text-foreground outline-none focus:border-primary"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">
                Stage / Disposition
              </label>
              <select
                value={stageFilter}
                onChange={(e) => setStageFilter(e.target.value)}
                className="w-full rounded-lg border border-border bg-surface px-2.5 py-1.5 text-xs text-foreground outline-none focus:border-primary"
              >
                <option value="all">All Stages</option>
                {stages.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">
                Follow-Up Status
              </label>
              <select
                value={followUpFilter}
                onChange={(e) => setFollowUpFilter(e.target.value)}
                className="w-full rounded-lg border border-border bg-surface px-2.5 py-1.5 text-xs text-foreground outline-none focus:border-primary"
              >
                <option value="all">All Follow-Ups</option>
                <option value="scheduled">Scheduled / Pending</option>
                <option value="today">Due Today</option>
                <option value="completed">Completed</option>
                <option value="none">No Follow-Up</option>
              </select>
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">
                Owner
              </label>
              <select
                value={ownerFilter}
                onChange={(e) => setOwnerFilter(e.target.value)}
                className="w-full rounded-lg border border-border bg-surface px-2.5 py-1.5 text-xs text-foreground outline-none focus:border-primary"
              >
                <option value="all">All Leads</option>
                <option value="me">Assigned to Me (Aarav)</option>
                <option value="unassigned">Unassigned Pool</option>
                <option value="SS">Siddharth Sharma</option>
                <option value="RK">Riya Kapoor</option>
                <option value="AI">Supreme AI Agent</option>
              </select>
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">
                Min AI Score: {minScore}
              </label>
              <input
                type="range"
                min={0}
                max={95}
                step={5}
                value={minScore}
                onChange={(e) => setMinScore(Number(e.target.value))}
                className="w-full accent-primary mt-2"
              />
            </div>
          </div>

          {activeFilterCount > 0 && (
            <div className="flex justify-end pt-1">
              <button
                type="button"
                onClick={clearFilters}
                className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
              >
                <X className="h-3.5 w-3.5" /> Clear all filters
              </button>
            </div>
          )}
        </div>
      )}

      {/* Leads & Follow-ups Table */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-border bg-surface text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
              <tr>
                <th className="p-3.5 cursor-pointer select-none" onClick={() => toggleSort("name")}>
                  <div className="flex items-center gap-1">Lead {sortKey === "name" && (sortDir === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)}</div>
                </th>
                <th className="p-3.5 cursor-pointer select-none" onClick={() => toggleSort("project")}>
                  <div className="flex items-center gap-1">Project {sortKey === "project" && (sortDir === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)}</div>
                </th>
                <th className="p-3.5 cursor-pointer select-none" onClick={() => toggleSort("budget")}>
                  <div className="flex items-center gap-1">Budget {sortKey === "budget" && (sortDir === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)}</div>
                </th>
                <th className="p-3.5 cursor-pointer select-none" onClick={() => toggleSort("stage")}>
                  <div className="flex items-center gap-1">Status {sortKey === "stage" && (sortDir === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)}</div>
                </th>
                <th className="p-3.5 cursor-pointer select-none" onClick={() => toggleSort("followup")}>
                  <div className="flex items-center gap-1">Follow-Up {sortKey === "followup" && (sortDir === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)}</div>
                </th>
                <th className="p-3.5 cursor-pointer select-none" onClick={() => toggleSort("score")}>
                  <div className="flex items-center gap-1">AI Score {sortKey === "score" && (sortDir === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)}</div>
                </th>
                <th className="p-3.5 cursor-pointer select-none" onClick={() => toggleSort("owner")}>
                  <div className="flex items-center gap-1">Owner {sortKey === "owner" && (sortDir === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)}</div>
                </th>
                <th className="p-3.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {filteredSorted.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 px-4 text-center">
                    <div className="max-w-sm mx-auto space-y-2">
                      <p className="text-sm font-semibold text-foreground">
                        {leadsList.length === 0
                          ? "No leads found in this workspace"
                          : "No leads found matching current filters"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {leadsList.length === 0
                          ? "Inbound inquiries from marketing campaigns, portals, and voice agents will appear here once captured."
                          : "Try adjusting your search query, status filters, or score thresholds."}
                      </p>
                      {leadsList.length > 0 && activeFilterCount > 0 && (
                        <button
                          type="button"
                          onClick={clearFilters}
                          className="mt-2 inline-flex items-center gap-1 rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-semibold text-primary hover:bg-surface-elevated"
                        >
                          <X className="h-3.5 w-3.5" /> Reset all filters
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                filteredSorted.map((l) => {
                  const isUnassigned = !l.owner || l.owner === "Unassigned" || l.owner === "none";
                  const isMine = l.owner === "AM" || l.ownerName === "Aarav Mehta";

                  return (
                    <tr
                      key={l.id}
                      onClick={() => handleOpenLead(l)}
                      className="cursor-pointer hover:bg-surface-elevated/50 transition-colors group"
                    >
                      <td className="p-3.5">
                        <div className="font-semibold text-foreground group-hover:text-primary transition-colors">
                          {l.name}
                        </div>
                        <div className="text-[11px] text-muted-foreground font-mono">{l.phone || "No phone"}</div>
                      </td>
                      <td className="p-3.5 text-foreground">{l.project || "General Inquiry"}</td>
                      <td className="p-3.5 font-medium text-foreground">{l.budget}</td>
                      <td className="p-3.5">
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold border ${
                            stageColor[l.stage] || "bg-stone-800 text-stone-300 border-stone-700"
                          }`}
                        >
                          {l.stage}
                        </span>
                      </td>
                      <td className="p-3.5">
                        {(() => {
                          if (l.followUpStatus === "completed" || l.stage === "Booked") {
                            return (
                              <div className="flex flex-col gap-0.5">
                                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-0.5 text-[10px] font-bold text-emerald-300 w-fit">
                                  <CheckCircle className="h-3 w-3 text-emerald-400" /> Done
                                </span>
                                {l.followUpNotes && (
                                  <span className="text-[10px] text-stone-400 truncate max-w-[140px]" title={l.followUpNotes}>
                                    {l.followUpNotes}
                                  </span>
                                )}
                              </div>
                            );
                          }
                          if (l.stage === "Not Interested" || l.stage === "Dropped Plan") {
                            return (
                              <div className="flex flex-col gap-0.5">
                                <span className="inline-flex items-center gap-1.5 rounded-full bg-stone-500/15 border border-stone-500/30 px-2.5 py-0.5 text-[10px] font-bold text-stone-300 w-fit">
                                  <CheckCircle className="h-3 w-3 text-stone-400" /> Closed
                                </span>
                                {l.followUpNotes && (
                                  <span className="text-[10px] text-stone-400 truncate max-w-[140px]" title={l.followUpNotes}>
                                    {l.followUpNotes}
                                  </span>
                                )}
                              </div>
                            );
                          }
                          if (l.followUpDate) {
                            const todayStr = new Date().toISOString().split("T")[0];
                            const tomorrowDate = new Date();
                            tomorrowDate.setDate(tomorrowDate.getDate() + 1);
                            const tomorrowStr = tomorrowDate.toISOString().split("T")[0];

                            const isToday = l.followUpDate === todayStr;
                            const isTomorrow = l.followUpDate === tomorrowStr;
                            const isOverdue = l.followUpDate < todayStr;

                            return (
                              <div className="flex flex-col gap-0.5">
                                {isToday ? (
                                  <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/20 border border-amber-500/40 px-2.5 py-0.5 text-[10px] font-bold text-amber-300 font-mono shadow-sm w-fit">
                                    <Clock className="h-3 w-3 text-amber-400 animate-pulse" /> Today at {l.followUpTime || "15:00"}
                                  </span>
                                ) : isTomorrow ? (
                                  <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-500/15 border border-sky-500/30 px-2.5 py-0.5 text-[10px] font-bold text-sky-300 font-mono w-fit">
                                    <Calendar className="h-3 w-3 text-sky-400" /> Tomorrow at {l.followUpTime || "11:00"}
                                  </span>
                                ) : isOverdue ? (
                                  <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-500/15 border border-rose-500/30 px-2.5 py-0.5 text-[10px] font-bold text-rose-300 font-mono w-fit">
                                    <AlertCircle className="h-3 w-3 text-rose-400" /> Overdue: {l.followUpDate}
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-500/15 border border-blue-500/30 px-2.5 py-0.5 text-[10px] font-bold text-blue-300 font-mono w-fit">
                                    <CalendarClock className="h-3 w-3 text-blue-400" /> {l.followUpDate} {l.followUpTime || ""}
                                  </span>
                                )}
                                {l.followUpNotes && (
                                  <span className="text-[10px] text-stone-400 truncate max-w-[140px]" title={l.followUpNotes}>
                                    {l.followUpNotes}
                                  </span>
                                )}
                              </div>
                            );
                          }

                          const stg = (l.stage || "").toLowerCase();
                          return (
                            <div className="flex flex-col gap-0.5">
                              {stg.includes("call back") || stg.includes("callback") ? (
                                <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 border border-amber-500/30 px-2.5 py-0.5 text-[10px] font-bold text-amber-300 w-fit">
                                  <Clock className="h-3 w-3 text-amber-400" /> Call Back Due
                                </span>
                              ) : stg.includes("rnr") || stg.includes("ringing") ? (
                                <span className="inline-flex items-center gap-1.5 rounded-full bg-orange-500/15 border border-orange-500/30 px-2.5 py-0.5 text-[10px] font-bold text-orange-300 w-fit">
                                  <Clock className="h-3 w-3 text-orange-400" /> RNR Retry Due
                                </span>
                              ) : stg.includes("busy") ? (
                                <span className="inline-flex items-center gap-1.5 rounded-full bg-yellow-500/15 border border-yellow-500/30 px-2.5 py-0.5 text-[10px] font-bold text-yellow-300 w-fit">
                                  <Clock className="h-3 w-3 text-yellow-400" /> Busy Retry Due
                                </span>
                              ) : stg.includes("switch off") ? (
                                <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-500/15 border border-rose-500/30 px-2.5 py-0.5 text-[10px] font-bold text-rose-300 w-fit">
                                  <Clock className="h-3 w-3 text-rose-400" /> Next Day Retry
                                </span>
                              ) : stg === "new" ? (
                                <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-500/15 border border-sky-500/30 px-2.5 py-0.5 text-[10px] font-bold text-sky-300 w-fit">
                                  <Clock className="h-3 w-3 text-sky-400" /> Discovery Due
                                </span>
                              ) : stg === "qualified" ? (
                                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-0.5 text-[10px] font-bold text-emerald-300 w-fit">
                                  <CalendarClock className="h-3 w-3 text-emerald-400" /> Walkthrough Due
                                </span>
                              ) : stg.includes("rfr") ? (
                                <span className="inline-flex items-center gap-1.5 rounded-full bg-teal-500/15 border border-teal-500/30 px-2.5 py-0.5 text-[10px] font-bold text-teal-300 w-fit">
                                  <CheckCircle className="h-3 w-3 text-teal-400" /> Registration Due
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1.5 rounded-full bg-stone-500/15 border border-stone-500/30 px-2.5 py-0.5 text-[10px] font-bold text-stone-300 w-fit">
                                  <Clock className="h-3 w-3 text-stone-400" /> Follow-Up Due
                                </span>
                              )}
                              {l.followUpNotes && (
                                <span className="text-[10px] text-stone-400 truncate max-w-[140px]" title={l.followUpNotes}>
                                  {l.followUpNotes}
                                </span>
                              )}
                            </div>
                          );
                        })()}
                      </td>
                      <td className="p-3.5">
                        <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
                          <Sparkles className="h-2.5 w-2.5" /> {l.score}
                        </span>
                      </td>
                      <td className="p-3.5">
                        {isUnassigned ? (
                          <span className="rounded-full border border-amber-500/40 bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold text-amber-300">
                            Unassigned
                          </span>
                        ) : isMine ? (
                          <span className="flex items-center gap-1 text-emerald-400 font-bold text-[11px]">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> You
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-[11px]">{l.ownerName || l.owner}</span>
                        )}
                      </td>
                      <td className="p-3.5 text-right">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenLead(l);
                          }}
                          className="rounded-lg border border-border px-2.5 py-1 text-[11px] font-bold text-primary hover:bg-primary hover:text-primary-foreground transition-all"
                        >
                          View Lead
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Lead Detail Drawer */}
      <LeadDetailDrawer
        lead={selectedLead}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onLeadUpdated={handleLeadUpdated}
        readOnly={isViewOnly}
      />
    </div>
  );
}
