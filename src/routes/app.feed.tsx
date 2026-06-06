import { createFileRoute } from "@tanstack/react-router";
import {
  AlertTriangle,
  Brain,
  Building2,
  Flame,
  Megaphone,
  Newspaper,
  Sparkles,
  TrendingUp,
} from "lucide-react";

export const Route = createFileRoute("/app/feed")({
  head: () => ({ meta: [{ title: "Executive AI Feed — Sentinel Fort Group" }] }),
  component: Feed,
});

type Item = {
  time: string;
  type: "Opportunity" | "Risk" | "Prediction" | "Recommendation" | "Market" | "Revenue";
  title: string;
  body: string;
};

const ITEMS: Item[] = [
  { time: "10:15 AM", type: "Revenue",        title: "Revenue forecast updated",      body: "Projected monthly revenue raised by 12% to ₹46 Cr. Whitefield and Bandra leading; Powai dragging." },
  { time: "11:02 AM", type: "Market",         title: "Metro Phase 2 approval",        body: "Whitefield demand index +9 over next 90 days. Recommend +15% campaign push." },
  { time: "11:30 AM", type: "Opportunity",    title: "145 leads with >90% purchase probability", body: "Auto-assigned to top-quintile closers. Predicted +₹202 Cr pipeline." },
  { time: "12:48 PM", type: "Recommendation", title: "Cut Meta Campaign A by 40%",    body: "CPL ₹4,200 — 2.1× channel avg. Re-route ₹6.4 L/mo to Google PMax." },
  { time: "1:22 PM",  type: "Prediction",     title: "Booking velocity will peak Day 22", body: "Conversion-curve model predicts ₹38 Cr booking week ending Sep 28 (confidence 87%)." },
  { time: "2:15 PM",  type: "Risk",           title: "Tower B absorption slowing",    body: "Inventory turnover dropped 38%. Recommend ₹1.5 Cr ATL launch + re-price 7%." },
  { time: "3:40 PM",  type: "Risk",           title: "₹14 Cr collections risk surfaced", body: "6 customers with delinquency score >70. Workflow #21 ready to dispatch." },
  { time: "4:30 PM",  type: "Opportunity",    title: "Channel partner Sundeep Realty hot streak", body: "12 qualified leads in 7 days, 4 site visits booked. Recommend co-marketing budget." },
];

const ICON: Record<Item["type"], { Icon: typeof Brain; chip: string }> = {
  Opportunity:    { Icon: Flame,        chip: "border-primary/30 bg-primary/10 text-primary" },
  Risk:           { Icon: AlertTriangle,chip: "border-destructive/30 bg-destructive/10 text-destructive" },
  Prediction:     { Icon: TrendingUp,   chip: "border-gold/30 bg-gold/10 text-gold" },
  Recommendation: { Icon: Sparkles,     chip: "border-primary/30 bg-primary/10 text-primary" },
  Market:         { Icon: Building2,    chip: "border-border/60 bg-surface text-foreground" },
  Revenue:        { Icon: Megaphone,    chip: "border-gold/30 bg-gold/10 text-gold" },
};

function Feed() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header>
        <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs text-primary">
          <Newspaper className="h-3 w-3" /> Sentinel Executive AI Feed™
        </div>
        <h1 className="mt-3 font-display text-4xl">
          What the AI is <span className="text-gradient-emerald italic">seeing.</span>
        </h1>
        <p className="text-sm text-muted-foreground">A continuous stream of opportunities, risks, predictions and recommendations.</p>
      </header>

      <div className="space-y-3">
        {ITEMS.map((it, i) => {
          const t = ICON[it.type];
          const Icon = t.Icon;
          return (
            <div key={i} className="rounded-2xl border border-border/60 bg-card p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wider ${t.chip}`}>
                    <Icon className="h-3 w-3" /> {it.type}
                  </span>
                  <span className="text-[11px] text-muted-foreground">{it.time}</span>
                </div>
                <button className="text-[11px] text-primary hover:underline">Open</button>
              </div>
              <h4 className="mt-2 font-display text-lg">{it.title}</h4>
              <p className="mt-1 text-sm text-muted-foreground">{it.body}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}