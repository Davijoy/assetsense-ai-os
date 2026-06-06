import { createFileRoute } from "@tanstack/react-router";
import { Award, MessageSquare, Sparkles, TrendingDown, Users } from "lucide-react";

export const Route = createFileRoute("/app/salesintel")({
  head: () => ({ meta: [{ title: "Sales Intelligence — Sentinel Fort Group" }] }),
  component: SalesIntel,
});

const REPS = [
  { name: "Aarav Mehta",  conv: 32, calls: 184, sentiment: 84, coach: "Top performer — promote to mentor 2 juniors." },
  { name: "Priya Raman",  conv: 24, calls: 162, sentiment: 71, coach: "Strong intro; weak objection-handling on price. Assign module 7." },
  { name: "Kabir Talwar", conv: 18, calls: 142, sentiment: 62, coach: "Closes too late in call. Coach on assumptive close framework." },
  { name: "Ishita Naidu", conv: 27, calls: 171, sentiment: 79, coach: "Excellent rapport; push for higher-ticket cross-sell." },
  { name: "Rohit Verma",  conv: 14, calls: 121, sentiment: 54, coach: "Negative sentiment trend. Schedule 1:1 with Head of Sales." },
];

const BOTTLENECKS = [
  { stage: "Lead → Site Visit", drop: 38, note: "Site-visit booking link converts 18% lower than calendar links." },
  { stage: "Site Visit → Negotiation", drop: 22, note: "Sales reps skip ROI walkthrough in 41% of visits." },
  { stage: "Negotiation → Booking", drop: 14, note: "Finance team SLA on offer letters slipped to 36h (target 24h)." },
];

function SalesIntel() {
  return (
    <div className="space-y-8">
      <header>
        <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs text-primary">
          <Users className="h-3 w-3" /> AI Sales Intelligence™
        </div>
        <h1 className="mt-3 font-display text-4xl">
          Coach every rep. <span className="text-gradient-emerald italic">Close every gap.</span>
        </h1>
        <p className="text-sm text-muted-foreground">Analyzes calls, meetings, site visits and outcomes to surface what's working and what's not.</p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-3">
          {REPS.sort((a, b) => b.conv - a.conv).map((r) => (
            <div key={r.name} className="rounded-2xl border border-border/60 bg-card p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-primary to-emerald-glow font-display">
                    {r.name.split(" ").map((s) => s[0]).join("")}
                  </div>
                  <div>
                    <div className="font-display text-lg">{r.name}</div>
                    <div className="text-xs text-muted-foreground">{r.calls} calls · sentiment {r.sentiment}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Conversion</div>
                  <div className="font-display text-2xl text-gradient-emerald">{r.conv}%</div>
                </div>
              </div>
              <div className="mt-3 rounded-xl border border-primary/20 bg-primary/5 p-3 text-sm">
                <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-primary">
                  <Sparkles className="h-3 w-3" /> Coaching insight
                </div>
                <p className="mt-1 text-muted-foreground">{r.coach}</p>
              </div>
            </div>
          ))}
        </div>

        <aside className="space-y-4">
          <div className="rounded-2xl border border-border/60 bg-card p-5">
            <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
              <TrendingDown className="h-3 w-3" /> Conversion bottlenecks
            </div>
            <ul className="mt-3 space-y-3">
              {BOTTLENECKS.map((b) => (
                <li key={b.stage}>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">{b.stage}</span>
                    <span className="text-xs text-destructive">−{b.drop}%</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{b.note}</p>
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-2xl border border-gold/30 bg-gold/5 p-5">
            <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-gold">
              <Award className="h-3 w-3" /> Top performing motion
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              Reps who open with the <span className="text-foreground">3-question discovery</span> close 1.7× more.
              Recommend rolling out as standard playbook.
            </p>
          </div>
          <div className="rounded-2xl border border-border/60 bg-card p-5">
            <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
              <MessageSquare className="h-3 w-3" /> Lost-deal themes (30d)
            </div>
            <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
              <li>· Price perception vs competition — 38%</li>
              <li>· Loan disapproval — 22%</li>
              <li>· Slow agreement turnaround — 14%</li>
              <li>· Possession-timeline concerns — 11%</li>
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}