import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { isRouteAuthorized } from "@/lib/route-roles";
import { getWorkspaceDealRooms, type DealRoomSummary } from "@/lib/crm.functions";
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
  FolderOpen,
  ArrowRight,
} from "lucide-react";

export const Route = createFileRoute("/app/dealrooms")({
  head: () => ({ meta: [{ title: "Deal Rooms — Sentinel Fort Group" }] }),
  ssr: false,
  beforeLoad: async ({ context, location }) => {
    let session: any = null;
    try {
      const { data } = await supabase.auth.getSession();
      session = data?.session;
    } catch {}
    if (!session?.access_token && typeof window !== "undefined") {
      try {
        const { getStoredSupabaseSession } = await import("@/integrations/supabase/auth-storage");
        session = getStoredSupabaseSession();
      } catch {}
    }
    if (!session?.access_token) {
      throw redirect({ to: "/auth" });
    }
    const roles = (context as any)?.user?.roles ?? (context as any)?.fort?.role?.appRoles ?? [];
    if (roles.length > 0 && !isRouteAuthorized(roles, location.pathname)) {
      throw redirect({ to: "/fort" });
    }
    return { accessToken: session.access_token };
  },
  component: DealRooms,
});

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
  const fetchDealRoomsFn = useServerFn(getWorkspaceDealRooms);

  const { data: deals = [], isLoading } = useQuery<DealRoomSummary[]>({
    queryKey: ["workspace-deal-rooms"],
    queryFn: async () => {
      const result = await fetchDealRoomsFn();
      return Array.isArray(result) ? result : [];
    },
    staleTime: 30_000,
  });

  const [activeDealId, setActiveDealId] = useState<string | null>(null);

  useEffect(() => {
    if (deals.length > 0 && (!activeDealId || !deals.some((d) => d.id === activeDealId))) {
      setActiveDealId(deals[0].id);
    }
  }, [deals, activeDealId]);

  const active = deals.find((d) => d.id === activeDealId) || deals[0] || null;

  return (
    <div className="space-y-8">
      <header>
        <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs text-primary font-medium">
          <Handshake className="h-3 w-3" /> Sentinel Deal Rooms™
        </div>
        <h1 className="mt-3 font-display text-4xl">
          Every deal, <span className="text-gradient-emerald italic">orchestrated.</span>
        </h1>
        <p className="text-sm text-muted-foreground">
          Secure transaction workspaces with live commercial milestones, document controls, and risk governance.
        </p>
      </header>

      {isLoading ? (
        <div className="rounded-3xl border border-border/60 bg-card p-12 text-center text-muted-foreground animate-pulse">
          Loading workspace deal rooms…
        </div>
      ) : deals.length === 0 ? (
        <div className="rounded-3xl border border-border/60 bg-card p-12 text-center space-y-4">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <FolderOpen className="h-7 w-7" />
          </div>
          <div className="max-w-md mx-auto space-y-1">
            <h2 className="font-display text-xl text-foreground">No Active Deal Rooms in Workspace</h2>
            <p className="text-sm text-muted-foreground">
              Deal rooms are automatically created when CRM leads complete a site visit and advance to Negotiation or Booking.
            </p>
          </div>
          <div className="pt-2">
            <a
              href="/app/crm"
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground hover:bg-primary/90 transition"
            >
              <span>Go to CRM Pipeline</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </a>
          </div>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
          {/* Deal List */}
          <aside className="space-y-2">
            {deals.map((d) => (
              <button
                key={d.id}
                onClick={() => setActiveDealId(d.id)}
                className={`w-full rounded-2xl border p-4 text-left transition ${
                  active?.id === d.id
                    ? "border-primary/40 bg-primary/5"
                    : "border-border/60 bg-card hover:border-primary/30"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="text-xs text-muted-foreground font-mono">{d.id}</div>
                  {d.health !== null ? (
                    <HealthChip score={d.health} />
                  ) : (
                    <span className="rounded-full border border-border px-2 py-0.5 text-[9px] text-muted-foreground uppercase">
                      New
                    </span>
                  )}
                </div>
                <div className="mt-1 font-display text-lg text-foreground">{d.customer}</div>
                <div className="text-xs text-muted-foreground">{d.project} · {d.unit}</div>
                <div className="mt-2 flex items-center justify-between text-xs">
                  <span className="text-primary font-bold">{d.value}</span>
                  <span className="rounded-md bg-surface px-2 py-0.5 text-muted-foreground font-medium">
                    {d.stage}
                  </span>
                </div>
              </button>
            ))}
          </aside>

          {/* Active Deal Detail */}
          {active && (
            <section className="space-y-5">
              <div className="rounded-3xl border border-border/60 bg-card p-6 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs text-muted-foreground font-mono">{active.id}</div>
                    <h2 className="mt-1 font-display text-3xl text-foreground">{active.customer}</h2>
                    <div className="text-sm text-muted-foreground">
                      {active.project} · {active.unit} · <span className="text-primary font-bold">{active.value}</span>
                    </div>
                  </div>
                  {active.health !== null ? (
                    <HealthRing score={active.health} />
                  ) : (
                    <div className="rounded-2xl border border-border/60 bg-surface/50 p-3 text-center">
                      <div className="text-[10px] uppercase font-bold text-muted-foreground">Stage</div>
                      <div className="text-sm font-bold text-foreground mt-0.5">{active.stage}</div>
                    </div>
                  )}
                </div>

                <div className="mt-6 grid grid-cols-3 gap-4">
                  <Metric
                    label="Probability of Closure"
                    value={active.closeProb !== null ? `${active.closeProb}%` : "Assessment in Progress"}
                    tone={active.closeProb !== null ? "primary" : "muted"}
                  />
                  <Metric
                    label="Cancellation Risk"
                    value={active.cancelRisk !== null ? `${active.cancelRisk}%` : "Pending Terms"}
                    tone={active.cancelRisk !== null && active.cancelRisk > 25 ? "destructive" : "muted"}
                  />
                  <Metric
                    label="Collection Risk"
                    value={active.collectionRisk !== null ? `${active.collectionRisk}%` : "Pending Terms"}
                    tone={active.collectionRisk !== null && active.collectionRisk > 25 ? "destructive" : "muted"}
                  />
                </div>

                <div className="mt-6 rounded-2xl border border-primary/20 bg-primary/5 p-4">
                  <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-primary font-bold">
                    <Sparkles className="h-3.5 w-3.5" /> AI Deal Brief & Status
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {active.briefSummary || `Deal room active in ${active.stage} stage. Managed by ${active.owner}.`}
                  </p>
                </div>
              </div>

              {/* Functional Deal Lifecycle Sections */}
              <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
                {SECTIONS.map((s) => {
                  const Icon = s.icon;
                  return (
                    <div
                      key={s.label}
                      className="rounded-2xl border border-border/60 bg-card p-4 transition hover:border-primary/40 cursor-pointer group"
                    >
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-surface text-primary group-hover:bg-primary/10 transition">
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="mt-3 text-sm font-medium text-foreground">{s.label}</div>
                      <div className="mt-1 inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                        <CheckCircle2 className="h-3 w-3 text-primary" /> Active
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}

function HealthChip({ score }: { score: number }) {
  const tone = score >= 80 ? "text-primary bg-primary/10 border-primary/30" : score >= 60 ? "text-amber-400 bg-amber-400/10 border-amber-400/30" : "text-destructive bg-destructive/10 border-destructive/30";
  return <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${tone}`}>{score}</span>;
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
        <span className="font-display text-2xl text-foreground">{score}</span>
        <span className="text-[9px] uppercase tracking-wider text-muted-foreground">Health</span>
      </div>
    </div>
  );
}

function Metric({ label, value, tone }: { label: string; value: string; tone: "primary" | "destructive" | "muted" }) {
  const toneClass = tone === "primary" ? "text-primary" : tone === "destructive" ? "text-destructive" : "text-foreground";
  return (
    <div className="rounded-2xl border border-border/60 bg-surface/40 p-4">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{label}</div>
      <div className={`mt-1 font-display text-xl ${toneClass}`}>{value}</div>
    </div>
  );
}