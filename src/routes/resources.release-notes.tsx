import { createFileRoute } from "@tanstack/react-router";
import { ResourcePage } from "@/components/landing/ResourcePage";
import { Sparkles, ShieldCheck, Bug, Zap } from "lucide-react";

export const Route = createFileRoute("/resources/release-notes")({
  head: () => ({
    meta: [
      { title: "Release Notes — Sentinel Fort Group" },
      { name: "description", content: "Every release across CRM, ERP, Marketplace, AI Voice, Marketing Cloud, BI and KIE." },
      { property: "og:title", content: "Sentinel Release Notes" },
      { property: "og:description", content: "Feature launches, improvements and fixes across the Sentinel platform." },
    ],
  }),
  component: ReleasesPage,
});

const releases = [
  {
    version: "v2.0",
    date: "November 2026",
    title: "The Intelligence Layer for Real Estate",
    icon: Sparkles,
    items: [
      "Executive Command Center with Business Health Score",
      "Knowledge Intelligence Engine (KIE) with RAG document chat",
      "Deal Rooms with AI Deal Health scoring",
      "Realtify U integrations with real-time audit logs",
    ],
  },
  {
    version: "v1.9",
    date: "October 2026",
    title: "Multi-tenant REOS foundation",
    icon: ShieldCheck,
    items: [
      "Workspaces, hierarchical roles and JWT workspace claims",
      "Global Intelligence Layer with pgvector search",
      "RBAC helpers and workspace-scoped policies",
    ],
  },
  {
    version: "v1.8",
    date: "September 2026",
    title: "Marketing Cloud & BI upgrades",
    icon: Zap,
    items: [
      "Attribution from spend to booking",
      "Confidence scores on revenue and inventory forecasts",
      "Recommendations engine with impact ranking",
    ],
  },
  {
    version: "v1.7",
    date: "August 2026",
    title: "Security & performance",
    icon: Bug,
    items: [
      "Tightened RLS across every public schema table",
      "Vulnerability sweep and dependency upgrades",
      "Sidebar responsiveness and 100% zoom optimisations",
    ],
  },
];

function ReleasesPage() {
  return (
    <ResourcePage
      eyebrow="Resources · Release Notes"
      title={<>What's <span className="text-primary">new in Sentinel</span>.</>}
      lead="A running log of everything we ship — features, improvements, security hardening and platform upgrades."
      highlights={["Monthly releases", "Security updates", "Platform notes"]}
    >
      <div className="mt-4 space-y-6">
        {releases.map((r) => (
          <article
            key={r.version}
            className="rounded-2xl border border-border/60 bg-surface/40 p-6 sm:p-8"
          >
            <div className="flex flex-wrap items-center gap-3">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <r.icon className="h-4 w-4" />
              </span>
              <span className="rounded-full border border-gold/30 bg-surface/60 px-3 py-1 text-xs text-gold">
                {r.version}
              </span>
              <span className="text-xs text-muted-foreground">{r.date}</span>
            </div>
            <h3 className="mt-4 font-display text-xl text-foreground">{r.title}</h3>
            <ul className="mt-3 space-y-1.5 text-sm text-muted-foreground list-disc pl-5">
              {r.items.map((i) => (
                <li key={i}>{i}</li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </ResourcePage>
  );
}