import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Network, Sparkles } from "lucide-react";

export const Route = createFileRoute("/app/graph")({
  head: () => ({ meta: [{ title: "Intelligence Graph — Sentinel Fort Group" }] }),
  component: Graph,
});

type Node = { id: string; label: string; type: string; x: number; y: number; r: number };
type Edge = { from: string; to: string };

const NODES: Node[] = [
  { id: "proj", label: "Whitefield Heights", type: "Project",   x: 500, y: 70,  r: 36 },
  { id: "inv",  label: "Inventory · 184",     type: "Inventory", x: 240, y: 200, r: 30 },
  { id: "lead", label: "Leads · 412",         type: "Leads",     x: 760, y: 200, r: 30 },
  { id: "camp", label: "Meta + PMax",         type: "Campaign",  x: 120, y: 360, r: 26 },
  { id: "cp",   label: "Channel Partners · 9",type: "Partners",  x: 380, y: 360, r: 26 },
  { id: "book", label: "Bookings · 42",       type: "Bookings",  x: 640, y: 360, r: 28 },
  { id: "doc",  label: "Docs · 1,204",        type: "Documents", x: 860, y: 360, r: 24 },
  { id: "rev",  label: "Revenue · ₹128 Cr",   type: "Revenue",   x: 500, y: 500, r: 34 },
  { id: "col",  label: "Collections · 71%",   type: "Collections", x: 760, y: 510, r: 26 },
  { id: "cust", label: "Customers · 38",      type: "Customers", x: 240, y: 510, r: 26 },
];

const EDGES: Edge[] = [
  { from: "proj", to: "inv" },  { from: "proj", to: "lead" },
  { from: "lead", to: "book" }, { from: "inv",  to: "book" },
  { from: "camp", to: "lead" }, { from: "cp",   to: "lead" },
  { from: "book", to: "doc" },  { from: "book", to: "rev" },
  { from: "rev",  to: "col" },  { from: "book", to: "cust" },
  { from: "cust", to: "col" },  { from: "inv",  to: "cust" },
];

const TYPE_COLOR: Record<string, string> = {
  Project: "#FFD700", Inventory: "#10b981", Leads: "#22d3ee", Campaign: "#a78bfa",
  Partners: "#f59e0b", Bookings: "#10b981", Documents: "#94a3b8", Revenue: "#FFD700",
  Collections: "#f472b6", Customers: "#10b981",
};

function Graph() {
  const [active, setActive] = useState<string | null>("book");
  const byId = useMemo(() => Object.fromEntries(NODES.map((n) => [n.id, n])), []);
  const neighbors = useMemo(() => {
    if (!active) return new Set<string>();
    const s = new Set<string>([active]);
    EDGES.forEach((e) => {
      if (e.from === active) s.add(e.to);
      if (e.to === active) s.add(e.from);
    });
    return s;
  }, [active]);

  return (
    <div className="space-y-6">
      <header>
        <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs text-primary">
          <Network className="h-3 w-3" /> Sentinel Intelligence Graph™
        </div>
        <h1 className="mt-3 font-display text-4xl">
          See the <span className="text-gradient-emerald italic">connections.</span>
        </h1>
        <p className="text-sm text-muted-foreground">
          Every entity in your business — projects, leads, bookings, collections — woven into one explorable graph.
        </p>
      </header>

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="relative overflow-hidden rounded-3xl border border-border/60 bg-gradient-to-br from-card to-background p-2">
          <svg viewBox="0 0 1000 580" className="h-[560px] w-full">
            <defs>
              <radialGradient id="glow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#10b981" stopOpacity="0.6" />
                <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
              </radialGradient>
            </defs>
            {EDGES.map((e, i) => {
              const a = byId[e.from], b = byId[e.to];
              const isActive = !active || neighbors.has(e.from) && neighbors.has(e.to);
              return (
                <line
                  key={i}
                  x1={a.x} y1={a.y} x2={b.x} y2={b.y}
                  stroke={isActive ? "#10b981" : "#3a4759"}
                  strokeOpacity={isActive ? 0.6 : 0.2}
                  strokeWidth={isActive ? 1.4 : 1}
                />
              );
            })}
            {NODES.map((n) => {
              const isActive = !active || neighbors.has(n.id);
              const isFocus = n.id === active;
              return (
                <g key={n.id} onClick={() => setActive(n.id)} className="cursor-pointer" opacity={isActive ? 1 : 0.35}>
                  {isFocus && <circle cx={n.x} cy={n.y} r={n.r + 18} fill="url(#glow)" />}
                  <circle cx={n.x} cy={n.y} r={n.r} fill={TYPE_COLOR[n.type]} fillOpacity={0.16} stroke={TYPE_COLOR[n.type]} strokeWidth={isFocus ? 2.5 : 1.5} />
                  <text x={n.x} y={n.y + 4} textAnchor="middle" className="fill-foreground text-[10px]" style={{ fontSize: 10 }}>
                    {n.type}
                  </text>
                  <text x={n.x} y={n.y + n.r + 14} textAnchor="middle" className="fill-muted-foreground" style={{ fontSize: 11 }}>
                    {n.label}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        <aside className="rounded-3xl border border-border/60 bg-card p-5">
          <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-primary">
            <Sparkles className="h-3 w-3" /> AI Insight
          </div>
          {active && (
            <>
              <h3 className="mt-2 font-display text-xl">{byId[active].label}</h3>
              <div className="text-xs text-muted-foreground">{byId[active].type}</div>
              <p className="mt-3 text-sm text-muted-foreground">
                {byId[active].type === "Bookings"
                  ? "42 bookings this quarter (+18% QoQ). Drives ₹128 Cr revenue across 38 customers; 71% on track for milestone collections."
                  : `Connected to ${[...neighbors].length - 1} other entities. Click around to explore upstream and downstream impact.`}
              </p>
            </>
          )}
          <div className="mt-6 space-y-2">
            {Object.entries(TYPE_COLOR).map(([t, c]) => (
              <div key={t} className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: c }} />
                {t}
              </div>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
}