import { createFileRoute } from "@tanstack/react-router";
import { AlertTriangle, Banknote, CalendarClock, Sparkles } from "lucide-react";

export const Route = createFileRoute("/app/collections")({
  head: () => ({ meta: [{ title: "Collections Intelligence — Sentinel Fort Group" }] }),
  component: Collections,
});

const ACCOUNTS = [
  { name: "Devansh Malik",  unit: "AG-T2-0703", due: "₹42 L",  age: 23, delinq: 78, action: "Trigger RM call + restructured plan", risk: "High"   },
  { name: "Saanvi Iyer",    unit: "PS-B-2104",  due: "₹64 L",  age: 12, delinq: 56, action: "Send reminder · auto demand letter Day 7", risk: "Medium" },
  { name: "Vikram Shah",    unit: "BO-12-A",    due: "₹1.1 Cr",age: 4,  delinq: 38, action: "Monitor · ensure loan disbursement on track", risk: "Medium" },
  { name: "Ananya Pillai",  unit: "WH-C-0806",  due: "₹18 L",  age: 0,  delinq: 9,  action: "On schedule",                                 risk: "Low"    },
  { name: "Rohan Kapoor",   unit: "WH-A-1402",  due: "₹38 L",  age: 6,  delinq: 22, action: "Auto-reminder dispatched",                    risk: "Low"    },
];

function Collections() {
  return (
    <div className="space-y-8">
      <header>
        <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs text-primary">
          <Banknote className="h-3 w-3" /> AI Collections Intelligence™
        </div>
        <h1 className="mt-3 font-display text-4xl">
          Cash flow, <span className="text-gradient-emerald italic">predicted.</span>
        </h1>
        <p className="text-sm text-muted-foreground">Predict delinquency, automate dunning, and protect quarter-end cash position.</p>
      </header>

      <div className="grid gap-4 md:grid-cols-4">
        <Tile label="Outstanding (90d)" value="₹128 Cr" />
        <Tile label="At-risk (next 45d)" value="₹14 Cr" tone="destructive" />
        <Tile label="On-time collection rate" value="71%" tone="primary" />
        <Tile label="AI recovery (30d)" value="₹9.4 Cr" tone="gold" />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="overflow-hidden rounded-2xl border border-border/60">
          <table className="w-full text-sm">
            <thead className="bg-surface/50 text-[11px] uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-left">Account</th>
                <th className="px-4 py-3 text-left">Unit</th>
                <th className="px-4 py-3 text-right">Outstanding</th>
                <th className="px-4 py-3 text-right">Age (d)</th>
                <th className="px-4 py-3 text-right">Delinq.</th>
                <th className="px-4 py-3 text-left">AI Action</th>
                <th className="px-4 py-3 text-right">Risk</th>
              </tr>
            </thead>
            <tbody>
              {ACCOUNTS.map((a) => (
                <tr key={a.name} className="border-t border-border/60 bg-card">
                  <td className="px-4 py-3">{a.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{a.unit}</td>
                  <td className="px-4 py-3 text-right">{a.due}</td>
                  <td className="px-4 py-3 text-right">{a.age}</td>
                  <td className="px-4 py-3 text-right">
                    <span className={a.delinq > 60 ? "text-destructive" : a.delinq > 30 ? "text-gold" : "text-primary"}>
                      {a.delinq}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{a.action}</td>
                  <td className="px-4 py-3 text-right">
                    <span className={`rounded-full border px-2 py-0.5 text-[10px] ${
                      a.risk === "High" ? "border-destructive/40 bg-destructive/10 text-destructive"
                      : a.risk === "Medium" ? "border-gold/40 bg-gold/10 text-gold"
                      : "border-primary/40 bg-primary/10 text-primary"
                    }`}>
                      {a.risk}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <aside className="space-y-4">
          <div className="rounded-2xl border border-primary/30 bg-primary/5 p-5">
            <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-primary">
              <Sparkles className="h-3 w-3" /> AI Cash-Flow Forecast
            </div>
            <div className="mt-2 font-display text-3xl">₹46 Cr</div>
            <p className="text-xs text-muted-foreground">Projected collections next 30 days · confidence 87%</p>
          </div>
          <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-5">
            <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-destructive">
              <AlertTriangle className="h-3 w-3" /> Pre-emptive action
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              6 accounts trending toward default. Auto-dispatch workflow #21 to recover ₹14 Cr.
            </p>
            <button className="mt-3 w-full rounded-lg bg-primary px-3 py-2 text-xs font-medium text-primary-foreground shadow-glow">
              Run workflow
            </button>
          </div>
          <div className="rounded-2xl border border-border/60 bg-card p-5">
            <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
              <CalendarClock className="h-3 w-3" /> Demand letters this week
            </div>
            <div className="mt-2 font-display text-2xl">12</div>
            <p className="text-xs text-muted-foreground">Auto-generated, queued for legal approval.</p>
          </div>
        </aside>
      </div>
    </div>
  );
}

function Tile({ label, value, tone }: { label: string; value: string; tone?: "destructive" | "primary" | "gold" }) {
  const cls = tone === "destructive" ? "text-destructive" : tone === "primary" ? "text-gradient-emerald" : tone === "gold" ? "text-gold" : "text-foreground";
  return (
    <div className="rounded-2xl border border-border/60 bg-card p-5">
      <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={`mt-2 font-display text-3xl ${cls}`}>{value}</div>
    </div>
  );
}