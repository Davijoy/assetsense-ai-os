import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  Banknote,
  CheckCircle2,
  Clock,
  FileText,
  Handshake,
  Home,
  Key,
  MessageSquare,
  ShieldCheck,
  Sparkles,
  Users,
  Workflow,
} from "lucide-react";

export const Route = createFileRoute("/app/dealrooms")({
  head: () => ({ meta: [{ title: "Deal Rooms — Sentinel Fort Group" }] }),
  component: DealRooms,
});

type Deal = {
  id: string;
  customer: string;
  project: string;
  unit: string;
  value: string;
  stage: string;
  owner: string;
  health: number;
  closeProb: number;
  cancelRisk: number;
  collectionRisk: number;
};

const DEALS: Deal[] = [
  { id: "DR-2041", customer: "Rohan Kapoor",   project: "Whitefield Heights",   unit: "WH-A-1402", value: "₹2.4 Cr", stage: "Loan Processing", owner: "Aarav M.",  health: 88, closeProb: 91, cancelRisk: 8,  collectionRisk: 12 },
  { id: "DR-2039", customer: "Saanvi Iyer",    project: "Powai Skyline",        unit: "PS-B-2104", value: "₹3.1 Cr", stage: "Agreement",       owner: "Priya R.", health: 76, closeProb: 78, cancelRisk: 18, collectionRisk: 22 },
  { id: "DR-2037", customer: "Vikram Shah",    project: "Bandra One",           unit: "BO-12-A",   value: "₹6.8 Cr", stage: "Site Visit",      owner: "Kabir T.", health: 64, closeProb: 58, cancelRisk: 29, collectionRisk: 18 },
  { id: "DR-2034", customer: "Ananya Pillai",  project: "Whitefield Heights",   unit: "WH-C-0806", value: "₹1.9 Cr", stage: "Possession",      owner: "Aarav M.", health: 94, closeProb: 98, cancelRisk: 3,  collectionRisk: 6  },
  { id: "DR-2030", customer: "Devansh Malik",  project: "Aero Greens",          unit: "AG-T2-0703",value: "₹1.2 Cr", stage: "Documents",       owner: "Ishita N.",health: 52, closeProb: 44, cancelRisk: 41, collectionRisk: 33 },
];

const SECTIONS = [
  { icon: Home,         label: "Overview" },
  { icon: FileText,     label: "Documents" },
  { icon: Banknote,     label: "Payment Center" },
  { icon: MessageSquare,label: "Timeline" },
  { icon: ShieldCheck,  label: "Approvals" },
  { icon: Users,        label: "Site Visits" },
  { icon: Workflow,     label: "Loan Processing" },
  { icon: Handshake,    label: "Channel Partner" },
  { icon: Clock,        label: "Collections" },
  { icon: FileText,     label: "Agreement" },
  { icon: Key,          label: "Possession" },
];

function DealRooms() {
  const [active, setActive] = useState(DEALS[0]);
  return (
    <div className="space-y-8">
      <header>
        <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs text-primary">
          <Handshake className="h-3 w-3" /> Sentinel Deal Rooms™
        </div>
        <h1 className="mt-3 font-display text-4xl">
          Every deal, <span className="text-gradient-emerald italic">orchestrated.</span>
        </h1>
        <p className="text-sm text-muted-foreground">Secure transaction workspaces with AI-monitored health, cancellation and collection risk.</p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        {/* List */}
        <aside className="space-y-2">
          {DEALS.map((d) => (
            <button
              key={d.id}
              onClick={() => setActive(d)}
              className={`w-full rounded-2xl border p-4 text-left transition ${
                active.id === d.id
                  ? "border-primary/40 bg-primary/5"
                  : "border-border/60 bg-card hover:border-primary/30"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="text-xs text-muted-foreground">{d.id}</div>
                <HealthChip score={d.health} />
              </div>
              <div className="mt-1 font-display text-lg">{d.customer}</div>
              <div className="text-xs text-muted-foreground">{d.project} · {d.unit}</div>
              <div className="mt-2 flex items-center justify-between text-xs">
                <span className="text-primary">{d.value}</span>
                <span className="text-muted-foreground">{d.stage}</span>
              </div>
            </button>
          ))}
        </aside>

        {/* Detail */}
        <section className="space-y-5">
          <div className="rounded-3xl border border-border/60 bg-card p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-muted-foreground">{active.id}</div>
                <h2 className="mt-1 font-display text-3xl">{active.customer}</h2>
                <div className="text-sm text-muted-foreground">{active.project} · {active.unit} · {active.value}</div>
              </div>
              <HealthRing score={active.health} />
            </div>
            <div className="mt-6 grid grid-cols-3 gap-4">
              <Metric label="Probability of Closure" value={`${active.closeProb}%`} tone="primary" />
              <Metric label="Cancellation Risk" value={`${active.cancelRisk}%`} tone={active.cancelRisk > 25 ? "destructive" : "muted"} />
              <Metric label="Collection Risk" value={`${active.collectionRisk}%`} tone={active.collectionRisk > 25 ? "destructive" : "muted"} />
            </div>

            <div className="mt-6 rounded-2xl border border-primary/20 bg-primary/5 p-4">
              <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-primary">
                <Sparkles className="h-3 w-3" /> AI Deal Brief
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                Engagement steady; loan sanction pending from HDFC ({active.stage}). Recommend: nudge channel partner for KYC closure
                within 48h. Predicted close: <span className="text-foreground">Day +21</span>.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
            {SECTIONS.map((s) => {
              const Icon = s.icon;
              return (
                <div key={s.label} className="rounded-2xl border border-border/60 bg-card p-4 transition hover:border-primary/40">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-surface text-primary">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="mt-3 text-sm">{s.label}</div>
                  <div className="mt-1 inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                    <CheckCircle2 className="h-3 w-3 text-primary" /> On track
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}

function HealthChip({ score }: { score: number }) {
  const tone = score >= 80 ? "text-primary bg-primary/10 border-primary/30" : score >= 60 ? "text-gold bg-gold/10 border-gold/30" : "text-destructive bg-destructive/10 border-destructive/30";
  return <span className={`rounded-full border px-2 py-0.5 text-[10px] ${tone}`}>{score}</span>;
}

function HealthRing({ score }: { score: number }) {
  const c = 2 * Math.PI * 36;
  return (
    <div className="relative h-24 w-24">
      <svg viewBox="0 0 80 80" className="h-24 w-24 -rotate-90">
        <circle cx="40" cy="40" r="36" stroke="currentColor" className="text-surface" strokeWidth="6" fill="none" />
        <circle cx="40" cy="40" r="36" stroke="currentColor" className="text-primary" strokeWidth="6" fill="none" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c - (score / 100) * c} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-display text-2xl">{score}</span>
        <span className="text-[9px] uppercase tracking-wider text-muted-foreground">Health</span>
      </div>
    </div>
  );
}

function Metric({ label, value, tone }: { label: string; value: string; tone: "primary" | "destructive" | "muted" }) {
  const toneClass = tone === "primary" ? "text-primary" : tone === "destructive" ? "text-destructive" : "text-foreground";
  return (
    <div className="rounded-2xl border border-border/60 bg-surface/40 p-4">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={`mt-1 font-display text-2xl ${toneClass}`}>{value}</div>
    </div>
  );
}