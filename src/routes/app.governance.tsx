import { createFileRoute } from "@tanstack/react-router";
import { CheckCircle2, FileCheck2, ScrollText, ShieldCheck, Users2 } from "lucide-react";

export const Route = createFileRoute("/app/governance")({
  head: () => ({ meta: [{ title: "Enterprise Governance — Sentinel Fort Group" }] }),
  component: Governance,
});

const APPROVALS = [
  { id: "APR-2204", what: "Whitefield campaign budget +₹2 L",  by: "AI Recommendation Engine", needs: "CMO", status: "Pending" },
  { id: "APR-2203", what: "Tower B price reduction 7%",         by: "Inventory module",         needs: "CFO + CEO", status: "Pending" },
  { id: "APR-2199", what: "Workflow #21 — collections dunning", by: "Finance ops",             needs: "Head of Finance", status: "Approved" },
  { id: "APR-2197", what: "New CP onboarding · Sundeep Realty", by: "Partner ops",             needs: "VP Sales", status: "Approved" },
];

const AUDIT = [
  { ts: "Today 14:22", actor: "Aarav Mehta", action: "Updated deal DR-2041 stage to Loan Processing" },
  { ts: "Today 13:58", actor: "AI Engine",    action: "Auto-dispatched workflow Collections Pre-empt" },
  { ts: "Today 11:30", actor: "Priya Raman",  action: "Approved approval APR-2199" },
  { ts: "Today 10:15", actor: "AI Engine",    action: "Published revenue forecast update (+12%)" },
  { ts: "Yesterday",   actor: "Kabir Talwar", action: "Modified workflow Hot Lead Fast-Track step 2" },
];

const ROLES = [
  { role: "Executive",         users: 5,  scope: "Global"            },
  { role: "Regional Director", users: 7,  scope: "Region scoped"     },
  { role: "Sales Manager",     users: 18, scope: "Team scoped"       },
  { role: "Sales Executive",   users: 64, scope: "Self-served leads" },
  { role: "Finance",           users: 9,  scope: "Finance + ERP"     },
  { role: "Channel Partner",   users: 142,scope: "CP portal only"    },
];

function Governance() {
  return (
    <div className="space-y-8">
      <header>
        <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs text-primary">
          <ShieldCheck className="h-3 w-3" /> Enterprise Governance
        </div>
        <h1 className="mt-3 font-display text-4xl">
          Control with <span className="text-gradient-emerald italic">clarity.</span>
        </h1>
        <p className="text-sm text-muted-foreground">Approvals, audit trails, RBAC and regional hierarchies — built in.</p>
      </header>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-3xl border border-border/60 bg-card p-6">
          <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
            <FileCheck2 className="h-3.5 w-3.5" /> Approval Queue
          </div>
          <div className="mt-4 space-y-2">
            {APPROVALS.map((a) => (
              <div key={a.id} className="rounded-xl border border-border/60 bg-surface/40 p-4">
                <div className="flex items-center justify-between">
                  <div className="text-xs text-muted-foreground">{a.id} · raised by {a.by}</div>
                  <span className={`rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wider ${
                    a.status === "Approved" ? "border-primary/40 bg-primary/10 text-primary" : "border-gold/40 bg-gold/10 text-gold"
                  }`}>{a.status}</span>
                </div>
                <div className="mt-1 text-sm">{a.what}</div>
                <div className="mt-1 text-[11px] text-muted-foreground">Needs: {a.needs}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-border/60 bg-card p-6">
          <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
            <ScrollText className="h-3.5 w-3.5" /> Audit Log
          </div>
          <ul className="mt-4 space-y-3">
            {AUDIT.map((e, i) => (
              <li key={i} className="border-l border-primary/30 pl-3">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{e.ts}</div>
                <div className="text-sm">
                  <span className="text-primary">{e.actor}</span> · {e.action}
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="rounded-3xl border border-border/60 bg-card p-6">
        <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
          <Users2 className="h-3.5 w-3.5" /> Role-Based Permissions
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {ROLES.map((r) => (
            <div key={r.role} className="rounded-2xl border border-border/60 bg-surface/40 p-4">
              <div className="flex items-center justify-between">
                <div className="font-display text-lg">{r.role}</div>
                <CheckCircle2 className="h-4 w-4 text-primary" />
              </div>
              <div className="mt-1 text-xs text-muted-foreground">{r.users} users · {r.scope}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}