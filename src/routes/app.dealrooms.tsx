import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { isRouteAuthorized } from "@/lib/route-roles";
import { getWorkspaceDealRooms, type DealRoomSummary } from "@/lib/crm.functions";
import {
  Banknote,
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

const TABS = [
  { id: "Overview", label: "Overview", icon: Home },
  { id: "Documents", label: "Documents", icon: FileText },
  { id: "Negotiation", label: "Negotiation", icon: Handshake },
  { id: "Approvals", label: "Approvals", icon: ShieldCheck },
  { id: "Closing", label: "Closing", icon: Key },
] as const;

type WorkspaceTab = (typeof TABS)[number]["id"];

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
  const [activeTab, setActiveTab] = useState<WorkspaceTab>("Overview");

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
          {/* Deal List Sidebar */}
          <aside className="space-y-2">
            <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground px-1 pb-1">
              Active Transactions ({deals.length})
            </div>
            {deals.map((d) => (
              <button
                key={d.id}
                onClick={() => setActiveDealId(d.id)}
                className={`w-full rounded-2xl border p-4 text-left transition ${
                  active?.id === d.id
                    ? "border-primary/50 bg-primary/10 shadow-sm"
                    : "border-border/60 bg-card hover:border-primary/30"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="text-xs text-muted-foreground font-mono">{d.id}</div>
                  <span className="rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
                    {d.stage}
                  </span>
                </div>
                <div className="mt-1.5 font-display text-lg text-foreground font-bold">{d.customer}</div>
                <div className="text-xs text-muted-foreground">{d.project} · {d.unit}</div>
                <div className="mt-2.5 flex items-center justify-between text-xs border-t border-border/40 pt-2">
                  <span className="text-primary font-bold">{d.value}</span>
                  <span className="text-[11px] text-muted-foreground">
                    {d.owner}
                  </span>
                </div>
              </button>
            ))}
          </aside>

          {/* Active Deal Detail — Deal Room 2.0 Layout */}
          {active && (
            <section className="space-y-6">
              {/* Deal Room 2.0 Header */}
              <div className="rounded-3xl border border-border/60 bg-card p-6 shadow-sm space-y-6">
                <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border/50 pb-5">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-primary/10 border border-primary/30 px-2.5 py-0.5 font-mono text-[10px] font-bold text-primary uppercase tracking-wider">
                        DEAL ROOM / LIVE RECORD
                      </span>
                      <span className="text-xs font-mono text-muted-foreground">{active.id}</span>
                    </div>
                    <h2 className="mt-2 font-display text-3xl text-foreground font-bold">{active.customer}</h2>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                      <span>{active.project}</span>
                      <span>·</span>
                      <span>{active.unit}</span>
                      <span>·</span>
                      <span className="text-foreground font-medium">Assigned executive: <strong className="text-primary">{active.owner}</strong></span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-full border border-emerald-500/40 bg-emerald-500/15 px-3 py-1 text-xs font-bold text-emerald-300">
                      {active.stage}
                    </span>
                  </div>
                </div>

                {/* 4 Summary Cards Contract */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
                  <div className="rounded-2xl border border-border/60 bg-surface/40 p-4">
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Commercial Value</div>
                    <div className="mt-1 font-display text-2xl text-primary font-bold">{active.value}</div>
                    <div className="mt-1 text-[11px] text-muted-foreground">Commercial baseline</div>
                  </div>

                  <div className="rounded-2xl border border-border/60 bg-surface/40 p-4">
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Next Action</div>
                    <div className="mt-1 text-sm font-bold text-foreground truncate" title={active.nextAction || "No next action recorded"}>
                      {active.nextAction || "No next action recorded"}
                    </div>
                    <div className="mt-1 text-[11px] text-muted-foreground">
                      {active.nextAction ? "Operational milestone" : "No pending milestone"}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-border/60 bg-surface/40 p-4">
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Documents</div>
                    <div className="mt-1 text-sm font-bold text-foreground">
                      {active.docStatus || "Pending KYC"}
                    </div>
                    <div className="mt-1 text-[11px] text-muted-foreground">Audit compliance</div>
                  </div>

                  <div className="rounded-2xl border border-border/60 bg-surface/40 p-4">
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Deal Health</div>
                    <div className="mt-1 font-display text-xl text-emerald-400 font-bold">
                      {active.health !== null ? `${active.health}%` : "In Evaluation"}
                    </div>
                    <div className="mt-1 text-[11px] text-muted-foreground">Evaluation status</div>
                  </div>
                </div>

                {/* AI Deal Brief */}
                <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4">
                  <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-primary font-bold">
                    <Sparkles className="h-3.5 w-3.5" /> AI Deal Intelligence Brief
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {active.briefSummary || `Deal room active in ${active.stage} stage for ${active.customer}. Assigned to ${active.owner}.`}
                  </p>
                </div>
              </div>

              {/* Transaction Workspace Tabs */}
              <div className="rounded-3xl border border-border/60 bg-card p-6 shadow-sm space-y-6">
                <div className="flex flex-wrap items-center gap-2 border-b border-border/50 pb-4">
                  {TABS.map((tab) => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    return (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setActiveTab(tab.id)}
                        className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition ${
                          isActive
                            ? "bg-primary text-primary-foreground shadow-sm"
                            : "bg-surface/50 text-muted-foreground hover:bg-surface hover:text-foreground"
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                        <span>{tab.label}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Tab 1: Overview */}
                {activeTab === "Overview" && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="rounded-2xl border border-border/60 bg-surface/30 p-4 space-y-2">
                        <div className="text-xs uppercase font-bold text-muted-foreground">Buyer Details</div>
                        <div className="text-sm font-bold text-foreground">{active.customer}</div>
                        <div className="text-xs text-muted-foreground">Customer transaction profile</div>
                      </div>
                      <div className="rounded-2xl border border-border/60 bg-surface/30 p-4 space-y-2">
                        <div className="text-xs uppercase font-bold text-muted-foreground">Inventory Scope</div>
                        <div className="text-sm font-bold text-foreground">{active.project} · {active.unit}</div>
                        <div className="text-xs text-muted-foreground">Target Budget: {active.value}</div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Tab 2: Documents */}
                {activeTab === "Documents" && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="text-xs uppercase font-bold text-muted-foreground">Transaction Document Checklist</div>
                      {active.docStatus && (
                        <div className="text-xs text-muted-foreground">
                          Overall Status: <span className="font-semibold text-foreground">{active.docStatus}</span>
                        </div>
                      )}
                    </div>
                    <div className="space-y-2">
                      {[
                        { title: "KYC & Identity Proof (Aadhaar / Passport)" },
                        { title: "PAN Card Verification" },
                        { title: "Booking Application Form" },
                        { title: "Draft Agreement for Sale" },
                        { title: "Allotment Letter" },
                      ].map((doc) => (
                        <div key={doc.title} className="flex items-center justify-between rounded-xl border border-border/50 bg-surface/30 p-3 text-xs">
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium text-foreground">{doc.title}</span>
                          </div>
                          <span className="rounded-full bg-surface-elevated border border-border/60 px-2.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                            Status not yet connected
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Tab 3: Negotiation */}
                {activeTab === "Negotiation" && (
                  <div className="space-y-4">
                    <div className="text-xs uppercase font-bold text-muted-foreground">Commercial Pricing Breakdown</div>
                    <div className="rounded-2xl border border-border/60 bg-surface/30 p-4 space-y-3">
                      <div className="flex items-center justify-between text-xs pb-2 border-b border-border/40">
                        <span className="text-muted-foreground">Commercial Value:</span>
                        <span className="font-bold text-foreground text-sm font-mono">{active.value}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs pb-2 border-b border-border/40">
                        <span className="text-muted-foreground">Unit Specification:</span>
                        <span className="font-medium text-foreground">{active.unit}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Payment Plan:</span>
                        <span className="text-muted-foreground">Payment plan not yet connected</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Tab 4: Approvals */}
                {activeTab === "Approvals" && (
                  <div className="space-y-3">
                    <div className="text-xs uppercase font-bold text-muted-foreground">Governance & Authorization Gates</div>
                    <div className="space-y-2">
                      {[
                        { title: "Pricing & Commercial Terms Sign-off" },
                        { title: "Unit Inventory Reservation Lock" },
                        { title: "Legal Drafting & Compliance Clearance" },
                        { title: "Final Agreement Execution" },
                      ].map((app) => (
                        <div key={app.title} className="flex items-center justify-between rounded-xl border border-border/50 bg-surface/30 p-3 text-xs">
                          <div className="font-medium text-foreground">{app.title}</div>
                          <span className="rounded-full bg-surface-elevated border border-border/60 px-2.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                            Awaiting live approval workflow
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Tab 5: Closing */}
                {activeTab === "Closing" && (
                  <div className="space-y-4">
                    <div className="text-xs uppercase font-bold text-muted-foreground">Closing & Possession Milestones</div>
                    <div className="rounded-2xl border border-border/60 bg-surface/30 p-4 space-y-3">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Booking Token Receipt:</span>
                        <span className="text-muted-foreground">Status not yet connected</span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Agreement Execution:</span>
                        <span className="text-muted-foreground">Status not yet connected</span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Possession Handover:</span>
                        <span className="text-muted-foreground">Status not yet connected</span>
                      </div>
                    </div>
                  </div>
                )}
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