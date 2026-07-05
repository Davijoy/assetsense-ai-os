import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ShieldCheck,
  Cpu,
  Layers,
  Workflow,
  LineChart,
  Boxes,
  Lock,
  ArrowRight,
  Network,
  Building2,
  Handshake,
  Target,
  Globe2,
  Sparkles,
} from "lucide-react";

export const Route = createFileRoute("/realtifyu")({
  head: () => ({
    meta: [
      { title: "RealtifyU IP & Licensing — Powered by RealtifyU" },
      {
        name: "description",
        content:
          "RealtifyU OS is the unified real-estate intelligence IP licensed to Sentinel Fort and extended to the industry through SDKs, APIs, and partner integrations.",
      },
      { property: "og:title", content: "RealtifyU IP & Licensing" },
      {
        property: "og:description",
        content:
          "One operating system. Licensed to Sentinel Fort. Extended to the industry.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: RealtifyU,
});

function PoweredByBadge({ className = "" }: { className?: string }) {
  return (
    <span
      className={`group inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/5 px-3 py-1.5 text-[11px] uppercase tracking-[0.22em] text-primary backdrop-blur ${className}`}
    >
      <span className="relative flex h-2 w-2">
        <span className="absolute inset-0 animate-ping rounded-full bg-primary/60" />
        <span className="relative h-2 w-2 rounded-full bg-primary" />
      </span>
      Powered by <span className="font-semibold tracking-[0.14em]">RealtifyU</span>
    </span>
  );
}

const stack = [
  { icon: Layers, title: "Experience Layer", body: "Role cockpits — Buyer, Advisor, Partner, Developer, Admin, Founder." },
  { icon: Cpu, title: "Intelligence Layer", body: "Intent parsing, decision engine, urban growth score, AI directives." },
  { icon: Workflow, title: "Automation Layer", body: "7-stage CRM, lead distribution, property + buyer lifecycle." },
  { icon: LineChart, title: "Operations & Monetization", body: "Ops Center, error telemetry, SaaS metrics, plan catalog." },
  { icon: Boxes, title: "Data & Signal Fabric", body: "Intents, properties, pipeline, heatmaps, urban signals." },
  { icon: Lock, title: "Edge & Security Core", body: "JWT-guarded functions, RLS, role-scoped access, rate limits." },
];

const tracks = [
  {
    tag: "Exclusive Steward",
    title: "Sentinel Fort — Anchor License",
    points: [
      "Full RealtifyU OS deployment with white-label branding",
      "Priority roadmap access and joint IP governance",
      "Dedicated tenancy, custom data residency, and SLAs",
      "Co-branded rollout to Sentinel Fort partner network",
    ],
  },
  {
    tag: "For Brokerages & Developers",
    title: "Industry SDK License",
    points: [
      "Embeddable modules — Intent Search, Decision Engine, CRM",
      "Configurable role model and workflow templates",
      "Usage-based AI metering via the Lovable AI Gateway",
      "Onboarding, training, and certified implementation partners",
    ],
  },
  {
    tag: "For PropTech & Data Networks",
    title: "Platform API & Data Exchange",
    points: [
      "Public API with webhooks for intents, listings, and events",
      "Demand heatmaps and urban growth signals as a service",
      "Marketplace listing for co-selling and revenue share",
      "Reference architecture and integration playbooks",
    ],
  },
];

const distribution = [
  { icon: Building2, label: "Brokerages" },
  { icon: Handshake, label: "Channel Partners" },
  { icon: Target, label: "Developers & Builders" },
  { icon: Globe2, label: "REITs & PropTech" },
];

function RealtifyU() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Nav */}
      <header className="sticky top-0 z-40 border-b border-border/50 bg-background/70 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <Link to="/realtifyu" className="flex items-center gap-3">
            <span className="grid h-9 w-9 place-items-center rounded-lg border border-primary/30 bg-primary/10">
              <Sparkles className="h-4 w-4 text-primary" />
            </span>
            <span className="flex flex-col leading-none">
              <span className="font-display text-lg tracking-tight">RealtifyU</span>
              <span className="text-[9px] uppercase tracking-[0.22em] text-muted-foreground">
                IP & Licensing
              </span>
            </span>
          </Link>
          <nav className="flex items-center gap-3">
            <Link
              to="/"
              className="hidden text-sm text-muted-foreground transition-colors hover:text-foreground sm:inline-flex"
            >
              Home
            </Link>
            <a
              href="#contact"
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-glow hover:bg-primary/90"
            >
              Talk to Us
            </a>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-grid opacity-40" />
        <div
          className="absolute -top-40 left-1/2 h-[500px] w-[900px] -translate-x-1/2 rounded-full blur-3xl opacity-40"
          style={{ background: "var(--gradient-hero, radial-gradient(circle, hsl(var(--primary)/0.25), transparent 70%))" }}
        />
        <div className="relative mx-auto max-w-7xl px-6 pt-20 pb-24">
          <PoweredByBadge />
          <h1 className="mt-6 max-w-4xl font-display text-5xl leading-[1.05] sm:text-6xl md:text-7xl">
            One operating system.{" "}
            <em className="text-gradient-emerald not-italic">Licensed to Sentinel Fort.</em>{" "}
            Extended to the industry.
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-muted-foreground leading-relaxed">
            RealtifyU OS consolidates buyer intent, decision intelligence, CRM automation,
            urban signals, and monetization into a single, licensable technology stack.
            Sentinel Fort is the anchor steward of the IP; brokerages, developers, and
            PropTech networks extend it through SDKs, APIs, and partner integrations.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a
              href="#contact"
              className="inline-flex items-center gap-2 rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground shadow-glow hover:bg-primary/90"
            >
              Request licensing brief <ArrowRight className="h-4 w-4" />
            </a>
            <a
              href="#stack"
              className="inline-flex items-center gap-2 rounded-md border border-border bg-surface/50 px-5 py-2.5 text-sm text-foreground backdrop-blur hover:bg-surface"
            >
              Explore the stack
            </a>
          </div>
        </div>
      </section>

      {/* Stack */}
      <section id="stack" className="border-t border-border/60 py-20">
        <div className="mx-auto max-w-7xl px-6">
          <div className="max-w-3xl">
            <h2 className="font-display text-4xl md:text-5xl">The RealtifyU OS Stack</h2>
            <p className="mt-4 text-muted-foreground">
              Seven layers designed to work as one. Every module shares the same identity,
              data fabric, and policy core — so any partner in the network speaks the same
              language of intent and outcomes.
            </p>
          </div>
          <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {stack.map(({ icon: Icon, title, body }) => (
              <div
                key={title}
                className="group relative overflow-hidden rounded-2xl border border-border bg-card p-6 transition-colors hover:border-primary/40"
              >
                <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-primary/10 opacity-0 blur-3xl transition-opacity group-hover:opacity-100" />
                <Icon className="h-5 w-5 text-primary" />
                <h3 className="mt-4 text-lg text-foreground">{title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Steward + Licensing Flow */}
      <section className="border-t border-border/60 py-20">
        <div className="mx-auto grid max-w-7xl gap-10 px-6 md:grid-cols-2">
          <div>
            <p className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.22em] text-primary">
              <ShieldCheck className="h-3.5 w-3.5" /> Anchor Licensee
            </p>
            <h2 className="mt-3 font-display text-4xl md:text-5xl">
              Sentinel Fort — Steward of the IP
            </h2>
            <p className="mt-4 text-muted-foreground">
              Sentinel Fort holds the anchor license for RealtifyU OS. That means a full-stack
              deployment of the platform, joint governance over the roadmap, and the mandate
              to bring the technology to the broader real estate industry through curated
              partnerships.
            </p>
            <ul className="mt-6 space-y-3 text-sm text-muted-foreground">
              {[
                "Exclusive rights to co-brand and distribute regional deployments.",
                "Priority access to new modules — cockpits, agents, and directives.",
                "Shared IP roadmap with quarterly strategy reviews.",
              ].map((line) => (
                <li key={line} className="flex items-start gap-2">
                  <ArrowRight className="mt-1 h-3.5 w-3.5 shrink-0 text-primary" />
                  <span>{line}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Licensing flow visualization */}
          <div className="relative rounded-2xl border border-border bg-card/60 p-6 backdrop-blur">
            <div className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
              Licensing Flow
            </div>
            <div className="mt-5 space-y-1">
              {[
                { icon: Cpu, title: "RealtifyU OS", body: "Unified real-estate intelligence IP" },
                { icon: ShieldCheck, title: "Sentinel Fort", body: "Anchor licensee & industry steward" },
                { icon: Network, title: "Industry Network", body: "Brokerages, developers, REITs, PropTech" },
              ].map((n, i, arr) => (
                <div key={n.title} className="relative flex items-start gap-4 py-3">
                  <div className="relative">
                    <span className="grid h-11 w-11 place-items-center rounded-xl border border-primary/30 bg-primary/10">
                      <n.icon className="h-4.5 w-4.5 text-primary" />
                    </span>
                    {i < arr.length - 1 && (
                      <span className="absolute left-1/2 top-full h-6 w-px -translate-x-1/2 bg-gradient-to-b from-primary/60 to-transparent" />
                    )}
                  </div>
                  <div>
                    <div className="text-sm text-foreground">{n.title}</div>
                    <div className="text-xs text-muted-foreground">{n.body}</div>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-6 flex justify-end">
              <PoweredByBadge />
            </div>
          </div>
        </div>
      </section>

      {/* Licensing Tracks */}
      <section className="border-t border-border/60 py-20">
        <div className="mx-auto max-w-7xl px-6">
          <h2 className="font-display text-4xl md:text-5xl">Licensing Tracks</h2>
          <p className="mt-4 max-w-2xl text-muted-foreground">
            Three ways organizations engage with RealtifyU OS — from full stewardship to
            embeddable modules and API-level participation in the data exchange.
          </p>
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {tracks.map((t) => (
              <article
                key={t.title}
                className="flex flex-col rounded-2xl border border-border bg-card p-6 transition-all hover:-translate-y-1 hover:border-primary/40 hover:shadow-elevated"
              >
                <div className="text-[10px] uppercase tracking-[0.22em] text-primary">
                  {t.tag}
                </div>
                <h3 className="mt-3 font-display text-2xl">{t.title}</h3>
                <ul className="mt-5 space-y-2.5 text-sm text-muted-foreground">
                  {t.points.map((p) => (
                    <li key={p} className="flex items-start gap-2">
                      <ArrowRight className="mt-1 h-3.5 w-3.5 shrink-0 text-primary" />
                      <span>{p}</span>
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Industry Distribution */}
      <section className="border-t border-border/60 py-20">
        <div className="mx-auto max-w-7xl px-6">
          <h2 className="font-display text-4xl md:text-5xl">Industry Distribution</h2>
          <p className="mt-4 max-w-2xl text-muted-foreground">
            Through Sentinel Fort, RealtifyU OS reaches every corner of the real-estate value chain.
          </p>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {distribution.map(({ icon: Icon, label }) => (
              <div
                key={label}
                className="group flex flex-col items-center gap-3 rounded-2xl border border-border bg-card px-6 py-8 text-center transition-all hover:-translate-y-1 hover:border-primary/40"
              >
                <span className="grid h-12 w-12 place-items-center rounded-xl border border-primary/30 bg-primary/10 text-primary transition-transform group-hover:scale-110">
                  <Icon className="h-5 w-5" />
                </span>
                <div className="text-sm text-foreground">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section id="contact" className="border-t border-border/60 py-24">
        <div className="mx-auto max-w-5xl px-6">
          <div className="relative overflow-hidden rounded-3xl border border-primary/30 bg-gradient-to-br from-primary/10 via-card to-card p-10 md:p-14">
            <div className="absolute inset-0 bg-grid opacity-30" />
            <div className="relative flex flex-col items-start gap-6 md:flex-row md:items-center md:justify-between">
              <div className="max-w-xl">
                <PoweredByBadge />
                <h3 className="mt-5 font-display text-3xl md:text-4xl">
                  Connect to RealtifyU
                </h3>
                <p className="mt-3 text-muted-foreground">
                  Request a licensing brief, SDK access, or API credentials. Our IP office
                  routes every inquiry through Sentinel Fort's partner desk.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <a
                  href="mailto:ip@sentinelfort.com"
                  className="inline-flex items-center gap-2 rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground shadow-glow hover:bg-primary/90"
                >
                  Talk to Us <ArrowRight className="h-4 w-4" />
                </a>
                <Link
                  to="/app"
                  className="inline-flex items-center gap-2 rounded-md border border-border bg-surface/50 px-5 py-2.5 text-sm text-foreground backdrop-blur hover:bg-surface"
                >
                  Open Console
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-border/60 py-10">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-6 text-xs text-muted-foreground">
          <div>© {new Date().getFullYear()} Sentinel Fort Group. RealtifyU® IP.</div>
          <PoweredByBadge />
        </div>
      </footer>
    </div>
  );
}