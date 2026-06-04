import { createFileRoute, Link } from "@tanstack/react-router";
import { Sparkles, Phone, Mail, MessageSquare, Filter, Download } from "lucide-react";

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
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-primary">Inbox</p>
          <h1 className="mt-1 font-display text-4xl">Leads</h1>
          <p className="mt-1 text-sm text-muted-foreground">All channels, scored and routed automatically.</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-sm hover:bg-surface">
            <Filter className="h-3.5 w-3.5" /> Filters
          </button>
          <button className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-sm hover:bg-surface">
            <Download className="h-3.5 w-3.5" /> Export
          </button>
        </div>
      </div>

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
            {leads.map((l) => (
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