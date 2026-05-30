import { createFileRoute } from "@tanstack/react-router";
import {
  TrendingUp,
  TrendingDown,
  IndianRupee,
  Users,
  Target,
  Activity,
  Phone,
  Mail,
  MessageSquare,
  MoreHorizontal,
  Sparkles,
} from "lucide-react";

export const Route = createFileRoute("/app/crm")({
  head: () => ({ meta: [{ title: "CRM — Assetsense" }] }),
  component: CRM,
});

const kpis = [
  { label: "Pipeline Value", value: "₹48.6 Cr", delta: "+12.4%", up: true, icon: IndianRupee },
  { label: "Active Leads", value: "1,284", delta: "+8.2%", up: true, icon: Users },
  { label: "Conversion Rate", value: "18.4%", delta: "+2.1%", up: true, icon: Target },
  { label: "Avg. Response", value: "2m 14s", delta: "-32%", up: true, icon: Activity },
];

type Lead = {
  name: string;
  project: string;
  budget: string;
  score: number;
  source: string;
  owner: string;
};

const stages: { id: string; title: string; tint: string; leads: Lead[] }[] = [
  {
    id: "new",
    title: "New",
    tint: "from-sky-400/20 to-transparent",
    leads: [
      { name: "Riya Kapoor", project: "Lodha Belmondo", budget: "₹1.6 Cr", score: 88, source: "Meta Ads", owner: "AM" },
      { name: "Vikram Joshi", project: "Oberoi Sky City", budget: "₹3.2 Cr", score: 74, source: "Website", owner: "SS" },
      { name: "Neha Sharma", project: "Prestige Lakeside", budget: "₹2.1 Cr", score: 91, source: "Referral", owner: "AM" },
    ],
  },
  {
    id: "qualified",
    title: "AI Qualified",
    tint: "from-primary/25 to-transparent",
    leads: [
      { name: "Arjun Patel", project: "Lodha Belmondo", budget: "₹1.9 Cr", score: 94, source: "AI Voice", owner: "AM" },
      { name: "Pooja Nair", project: "Oberoi Sky City", budget: "₹3.5 Cr", score: 89, source: "Google", owner: "RK" },
    ],
  },
  {
    id: "visit",
    title: "Site Visit",
    tint: "from-violet-400/20 to-transparent",
    leads: [
      { name: "Karan Mehta", project: "Prestige Lakeside", budget: "₹2.4 Cr", score: 82, source: "Channel Partner", owner: "SS" },
      { name: "Aditi Verma", project: "Lodha Belmondo", budget: "₹1.85 Cr", score: 78, source: "Walk-in", owner: "AM" },
    ],
  },
  {
    id: "negotiation",
    title: "Negotiation",
    tint: "from-amber-400/20 to-transparent",
    leads: [
      { name: "Rohan Desai", project: "Oberoi Sky City", budget: "₹3.1 Cr", score: 92, source: "Referral", owner: "RK" },
    ],
  },
  {
    id: "booked",
    title: "Booked",
    tint: "from-emerald-400/25 to-transparent",
    leads: [
      { name: "Meera Iyer", project: "Prestige Lakeside", budget: "₹2.2 Cr", score: 96, source: "AI Voice", owner: "AM" },
      { name: "Sahil Khan", project: "Lodha Belmondo", budget: "₹1.95 Cr", score: 90, source: "Meta Ads", owner: "SS" },
    ],
  },
];

const activity = [
  { who: "AI Voice Agent", what: "Qualified Arjun Patel — Intent: High (94)", when: "2m ago", icon: Sparkles, tint: "text-primary" },
  { who: "Aarav Mehta", what: "Logged a call with Riya Kapoor (8m)", when: "12m ago", icon: Phone, tint: "text-sky-400" },
  { who: "Marketing", what: "Sent WhatsApp campaign to 318 leads", when: "1h ago", icon: MessageSquare, tint: "text-violet-400" },
  { who: "System", what: "Synced 24 new leads from MagicBricks", when: "2h ago", icon: Mail, tint: "text-amber-400" },
];

function CRM() {
  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-primary">Sales · CRM</p>
          <h1 className="mt-1 font-display text-4xl">Good morning, <em>Aarav</em>.</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            8 hot leads need attention. Your AI agent qualified 14 overnight.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="h-2 w-2 rounded-full bg-primary animate-pulse" /> Live · last sync 12s ago
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((k) => {
          const Icon = k.icon;
          const TrendIcon = k.up ? TrendingUp : TrendingDown;
          return (
            <div key={k.label} className="rounded-2xl border border-border bg-card p-5">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">{k.label}</span>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="mt-3 flex items-end justify-between">
                <div className="font-display text-3xl">{k.value}</div>
                <span className={`flex items-center gap-1 text-xs ${k.up ? "text-primary" : "text-destructive"}`}>
                  <TrendIcon className="h-3 w-3" /> {k.delta}
                </span>
              </div>
              <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-surface-elevated">
                <div className="h-full w-2/3 rounded-full bg-gradient-to-r from-primary to-emerald-glow" />
              </div>
            </div>
          );
        })}
      </div>

      <section>
        <div className="mb-4 flex items-end justify-between">
          <div>
            <h2 className="font-display text-2xl">Sales Pipeline</h2>
            <p className="text-sm text-muted-foreground">Drag-ready Kanban · auto-scored by AI</p>
          </div>
          <div className="flex items-center gap-1 rounded-md border border-border bg-card p-1 text-xs">
            {["This week", "MTD", "QTD", "YTD"].map((t, i) => (
              <button
                key={t}
                className={`rounded px-3 py-1 ${i === 1 ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-4 overflow-x-auto pb-2 lg:grid-cols-5">
          {stages.map((stage) => (
            <div key={stage.id} className="min-w-[260px] rounded-2xl border border-border bg-surface/50">
              <div className={`relative overflow-hidden rounded-t-2xl border-b border-border/60 px-4 py-3`}>
                <div className={`absolute inset-0 bg-gradient-to-b ${stage.tint}`} />
                <div className="relative flex items-center justify-between">
                  <div className="text-sm">{stage.title}</div>
                  <span className="rounded-full bg-background/60 px-2 py-0.5 text-xs text-muted-foreground">
                    {stage.leads.length}
                  </span>
                </div>
              </div>
              <div className="space-y-2 p-3">
                {stage.leads.map((l) => (
                  <article
                    key={l.name}
                    className="group cursor-pointer rounded-xl border border-border bg-card p-3 transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-glow"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="text-sm text-foreground">{l.name}</div>
                        <div className="text-xs text-muted-foreground">{l.project}</div>
                      </div>
                      <MoreHorizontal className="h-3.5 w-3.5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                    </div>
                    <div className="mt-3 flex items-center justify-between text-xs">
                      <span className="font-medium text-foreground">{l.budget}</span>
                      <span className="flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-primary">
                        <Sparkles className="h-2.5 w-2.5" /> {l.score}
                      </span>
                    </div>
                    <div className="mt-3 flex items-center justify-between border-t border-border/60 pt-2">
                      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                        {l.source}
                      </span>
                      <span className="grid h-5 w-5 place-items-center rounded-full bg-surface-elevated text-[10px]">
                        {l.owner}
                      </span>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-2xl border border-border bg-card p-6">
          <div className="flex items-end justify-between">
            <div>
              <h3 className="font-display text-xl">Weekly Velocity</h3>
              <p className="text-xs text-muted-foreground">Bookings vs. target</p>
            </div>
            <span className="text-xs text-primary">+22% vs last week</span>
          </div>
          <div className="mt-6 flex h-48 items-end gap-3">
            {[42, 58, 36, 70, 64, 88, 76].map((h, i) => (
              <div key={i} className="flex flex-1 flex-col items-center gap-2">
                <div className="relative w-full flex-1 overflow-hidden rounded-md bg-surface-elevated">
                  <div
                    className="absolute inset-x-0 bottom-0 rounded-md bg-gradient-to-t from-primary to-emerald-glow"
                    style={{ height: `${h}%` }}
                  />
                </div>
                <span className="text-[10px] text-muted-foreground">
                  {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][i]}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6">
          <h3 className="font-display text-xl">Activity</h3>
          <ul className="mt-4 space-y-4">
            {activity.map((a, i) => {
              const Icon = a.icon;
              return (
                <li key={i} className="flex gap-3 text-sm">
                  <div className={`grid h-8 w-8 shrink-0 place-items-center rounded-full bg-surface-elevated ${a.tint}`}>
                    <Icon className="h-3.5 w-3.5" />
                  </div>
                  <div className="flex-1">
                    <div className="text-foreground">{a.what}</div>
                    <div className="text-xs text-muted-foreground">{a.who} · {a.when}</div>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </section>
    </div>
  );
}