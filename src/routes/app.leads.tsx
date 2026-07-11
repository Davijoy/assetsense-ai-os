import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Sparkles, Phone, Mail, MessageSquare, Filter, Download, X } from "lucide-react";

export const Route = createFileRoute("/app/leads")({
  head: () => ({ meta: [{ title: "Leads — Sentinel Fort Group" }] }),
  component: Leads,
});

const leads = [
  { name: "Arjun Patel", project: "Lodha Belmondo", budget: "₹1.9 Cr", source: "AI Voice", stage: "Qualified", score: 94, last: "2m" },
  { name: "Meera Iyer", project: "Prestige Lakeside", budget: "₹2.2 Cr", source: "AI Voice", stage: "Booked", score: 96, last: "1h" },
  { name: "Riya Kapoor", project: "Lodha Belmondo", budget: "₹1.6 Cr", source: "Meta Ads", stage: "New", score: 88, last: "4m" },
  { name: "Rohan Desai", project: "Oberoi Sky City", budget: "₹3.1 Cr", source: "Referral", stage: "Negotiation", score: 92, last: "20m" },
  { name: "Neha Sharma", project: "Prestige Lakeside", budget: "₹2.1 Cr", source: "Referral", stage: "New", score: 91, last: "30m" },
  { name: "Karan Mehta", project: "Prestige Lakeside", budget: "₹2.4 Cr", source: "Channel Partner", stage: "Visit", score: 82, last: "1h" },
  { name: "Pooja Nair", project: "Oberoi Sky City", budget: "₹3.5 Cr", source: "Google", stage: "Qualified", score: 89, last: "3h" },
  { name: "Vikram Joshi", project: "Oberoi Sky City", budget: "₹3.2 Cr", source: "Website", stage: "New", score: 74, last: "5h" },
];

const stageColor: Record<string, string> = {
  New: "bg-sky-400/15 text-sky-300",
  Qualified: "bg-primary/15 text-primary",
  Visit: "bg-violet-400/15 text-violet-300",
  Negotiation: "bg-amber-400/15 text-amber-300",
  Booked: "bg-emerald-400/15 text-emerald-300",
};

function Leads() {
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [stageFilter, setStageFilter] = useState<string>("all");
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [minScore, setMinScore] = useState<number>(0);
  const [query, setQuery] = useState("");

  const stages = useMemo(() => Array.from(new Set(leads.map((l) => l.stage))), []);
  const sources = useMemo(() => Array.from(new Set(leads.map((l) => l.source))), []);

  const filtered = useMemo(() => {
    return leads.filter((l) => {
      if (stageFilter !== "all" && l.stage !== stageFilter) return false;
      if (sourceFilter !== "all" && l.source !== sourceFilter) return false;
      if (l.score < minScore) return false;
      if (query && !`${l.name} ${l.project}`.toLowerCase().includes(query.toLowerCase())) return false;
      return true;
    });
  }, [stageFilter, sourceFilter, minScore, query]);

  const activeFilterCount =
    (stageFilter !== "all" ? 1 : 0) +
    (sourceFilter !== "all" ? 1 : 0) +
    (minScore > 0 ? 1 : 0) +
    (query ? 1 : 0);

  const resetFilters = () => {
    setStageFilter("all");
    setSourceFilter("all");
    setMinScore(0);
    setQuery("");
  };

  const exportCsv = () => {
    const headers = ["Name", "Project", "Budget", "Source", "Stage", "AI Score", "Last activity"];
    const rows = filtered.map((l) => [l.name, l.project, l.budget, l.source, l.stage, l.score, `${l.last} ago`]);
    const csv = [headers, ...rows]
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `leads-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success(`Exported ${filtered.length} lead${filtered.length === 1 ? "" : "s"} to CSV`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-primary">Inbox</p>
          <h1 className="mt-1 font-display text-4xl">Leads</h1>
          <p className="mt-1 text-sm text-muted-foreground">All channels, scored and routed automatically.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setFiltersOpen((v) => !v)}
            aria-expanded={filtersOpen}
            className={`inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm transition ${
              filtersOpen || activeFilterCount > 0
                ? "border-primary/50 bg-primary/10 text-primary"
                : "border-border bg-card hover:bg-surface"
            }`}
          >
            <Filter className="h-3.5 w-3.5" /> Filters
            {activeFilterCount > 0 && (
              <span className="ml-1 rounded-full bg-primary px-1.5 py-0.5 text-[10px] text-primary-foreground">
                {activeFilterCount}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={exportCsv}
            className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-sm hover:bg-surface"
          >
            <Download className="h-3.5 w-3.5" /> Export
          </button>
        </div>
      </div>

      {filtersOpen && (
        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="grid gap-3 md:grid-cols-4">
            <div>
              <label className="text-xs uppercase tracking-wider text-muted-foreground">Search</label>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Name or project"
                className="mt-1 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-primary/50"
              />
            </div>
            <div>
              <label className="text-xs uppercase tracking-wider text-muted-foreground">Stage</label>
              <select
                value={stageFilter}
                onChange={(e) => setStageFilter(e.target.value)}
                className="mt-1 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-primary/50"
              >
                <option value="all">All stages</option>
                {stages.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs uppercase tracking-wider text-muted-foreground">Source</label>
              <select
                value={sourceFilter}
                onChange={(e) => setSourceFilter(e.target.value)}
                className="mt-1 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-primary/50"
              >
                <option value="all">All sources</option>
                {sources.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs uppercase tracking-wider text-muted-foreground">
                Min AI score: <span className="text-foreground">{minScore}</span>
              </label>
              <input
                type="range"
                min={0}
                max={100}
                value={minScore}
                onChange={(e) => setMinScore(Number(e.target.value))}
                className="mt-3 w-full accent-primary"
              />
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
            <span>Showing {filtered.length} of {leads.length}</span>
            {activeFilterCount > 0 && (
              <button
                onClick={resetFilters}
                className="inline-flex items-center gap-1 rounded px-2 py-1 hover:bg-surface hover:text-foreground"
              >
                <X className="h-3 w-3" /> Reset
              </button>
            )}
          </div>
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-surface/60 text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-5 py-3 text-left font-normal">Lead</th>
              <th className="px-5 py-3 text-left font-normal">Project</th>
              <th className="px-5 py-3 text-left font-normal">Budget</th>
              <th className="px-5 py-3 text-left font-normal">Source</th>
              <th className="px-5 py-3 text-left font-normal">Stage</th>
              <th className="px-5 py-3 text-left font-normal">AI Score</th>
              <th className="px-5 py-3 text-left font-normal">Last activity</th>
              <th className="px-5 py-3" />
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={8} className="px-5 py-10 text-center text-sm text-muted-foreground">
                  No leads match your filters.
                </td>
              </tr>
            )}
            {filtered.map((l) => (
              <tr key={l.name} className="border-t border-border/60 hover:bg-surface/40">
                <td className="px-5 py-4">
                  <div className="flex items-center gap-3">
                    <div className="grid h-8 w-8 place-items-center rounded-full bg-gradient-to-br from-primary/40 to-surface text-xs">
                      {l.name.split(" ").map((n) => n[0]).join("")}
                    </div>
                    <div>
                      <div className="text-foreground">{l.name}</div>
                      <div className="text-xs text-muted-foreground">{l.name.toLowerCase().replace(" ", ".")}@gmail.com</div>
                    </div>
                  </div>
                </td>
                <td className="px-5 py-4 text-muted-foreground">{l.project}</td>
                <td className="px-5 py-4">{l.budget}</td>
                <td className="px-5 py-4 text-muted-foreground">{l.source}</td>
                <td className="px-5 py-4">
                  <span className={`rounded-full px-2 py-0.5 text-xs ${stageColor[l.stage]}`}>{l.stage}</span>
                </td>
                <td className="px-5 py-4">
                  <span className="inline-flex items-center gap-1 text-primary">
                    <Sparkles className="h-3 w-3" /> {l.score}
                  </span>
                </td>
                <td className="px-5 py-4 text-xs text-muted-foreground">{l.last} ago</td>
                <td className="px-5 py-4">
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <button className="rounded p-1.5 hover:bg-surface hover:text-foreground"><Phone className="h-3.5 w-3.5" /></button>
                    <button className="rounded p-1.5 hover:bg-surface hover:text-foreground"><MessageSquare className="h-3.5 w-3.5" /></button>
                    <button className="rounded p-1.5 hover:bg-surface hover:text-foreground"><Mail className="h-3.5 w-3.5" /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-muted-foreground">
        Want a deeper Pipeline view? Open the <Link to="/app/crm" className="text-primary hover:underline">CRM dashboard</Link>.
      </p>
    </div>
  );
}