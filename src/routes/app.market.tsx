import { createFileRoute } from "@tanstack/react-router";
import { Globe2, MapPin, Sparkles, TrendingUp } from "lucide-react";

export const Route = createFileRoute("/app/market")({
  head: () => ({ meta: [{ title: "Market Intelligence — Sentinel Fort Group" }] }),
  component: Market,
});

const MICRO = [
  { name: "Whitefield",      growth: 91, demand: 88, yield: 4.6, risk: 22, reco: "Acquire 80,000 sq ft additional inventory.", trend: "Outperform" },
  { name: "Powai",           growth: 78, demand: 74, yield: 3.9, risk: 31, reco: "Hold positions; re-price Tower B 7% to clear absorption.", trend: "Stable" },
  { name: "Bandra West",     growth: 84, demand: 81, yield: 3.4, risk: 19, reco: "Launch luxury campaign; demand for 6 Cr+ ticket rising.", trend: "Outperform" },
  { name: "Hinjewadi",       growth: 86, demand: 79, yield: 5.1, risk: 24, reco: "Investor-grade segment hot — push fractional ownership pitch.", trend: "Outperform" },
  { name: "Gurugram Sector 79", growth: 72, demand: 68, yield: 4.2, risk: 35, reco: "Monitor; infra delays softening 12-month outlook.", trend: "Watch" },
  { name: "Noida Expressway",growth: 81, demand: 76, yield: 4.4, risk: 27, reco: "Add 2 channel partners; CP-led leads convert 1.8× higher here.", trend: "Stable" },
];

const SIGNALS = [
  { ts: "Today", text: "Metro Phase 2 extension approved — Whitefield demand index +9 (next 90 days)." },
  { ts: "2d ago", text: "RBI status quo on rates — investor sentiment in 2–4 Cr ticket band improving." },
  { ts: "3d ago", text: "DLF launched Camellias II at ₹35,500/sq ft — sets new benchmark for Gurugram luxury." },
  { ts: "5d ago", text: "Bengaluru office leasing +18% YoY — pull-through into Whitefield/Hebbal residential." },
];

function Market() {
  return (
    <div className="space-y-8">
      <header>
        <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs text-primary">
          <Globe2 className="h-3 w-3" /> Sentinel Market Intelligence™
        </div>
        <h1 className="mt-3 font-display text-4xl">
          The market, <span className="text-gradient-emerald italic">decoded.</span>
        </h1>
        <p className="text-sm text-muted-foreground">Growth, demand, yield and risk scoring across every micro-market you operate in.</p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-3">
          {MICRO.sort((a, b) => b.growth - a.growth).map((m) => (
            <div key={m.name} className="rounded-2xl border border-border/60 bg-card p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <MapPin className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="font-display text-xl">{m.name}</div>
                    <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{m.trend}</div>
                  </div>
                </div>
                <div className="text-right text-xs text-primary">{m.reco}</div>
              </div>
              <div className="mt-4 grid grid-cols-4 gap-3">
                <Score label="Growth" value={m.growth} />
                <Score label="Demand" value={m.demand} />
                <Score label="Rental Yield" value={m.yield * 10} display={`${m.yield}%`} />
                <Score label="Risk" value={m.risk} inverse />
              </div>
            </div>
          ))}
        </div>

        <aside className="rounded-3xl border border-border/60 bg-card p-5">
          <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-primary">
            <Sparkles className="h-3 w-3" /> Live Market Signals
          </div>
          <ul className="mt-4 space-y-4">
            {SIGNALS.map((s, i) => (
              <li key={i} className="border-l border-primary/30 pl-3">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{s.ts}</div>
                <p className="mt-1 text-sm">{s.text}</p>
              </li>
            ))}
          </ul>
          <div className="mt-6 rounded-2xl border border-gold/30 bg-gold/5 p-4 text-sm">
            <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-gold">
              <TrendingUp className="h-3 w-3" /> Top opportunity
            </div>
            <p className="mt-2 text-muted-foreground">
              Whitefield momentum + metro tailwind = <span className="text-foreground">+₹52 Cr</span> incremental revenue if inventory expands 60k sq ft.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}

function Score({ label, value, display, inverse }: { label: string; value: number; display?: string; inverse?: boolean }) {
  const color = inverse
    ? value > 30 ? "bg-destructive" : "bg-primary"
    : value > 80 ? "bg-primary" : value > 60 ? "bg-gold" : "bg-destructive";
  return (
    <div>
      <div className="flex items-center justify-between text-[10px] uppercase tracking-wider text-muted-foreground">
        {label} <span className="text-foreground">{display ?? value}</span>
      </div>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-surface">
        <div className={`h-full ${color}`} style={{ width: `${Math.min(value, 100)}%` }} />
      </div>
    </div>
  );
}