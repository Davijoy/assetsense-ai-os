import { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { Nav } from "@/components/landing/Nav";
import { Footer } from "@/components/landing/Footer";
import { Breadcrumbs } from "@/components/landing/Breadcrumbs";
import { RelatedArticles } from "@/components/landing/RelatedArticles";
import { useRouterState } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { ArrowRight, CheckCircle2, Sparkles, type LucideIcon } from "lucide-react";

export type Feature = {
  icon: LucideIcon;
  title: string;
  description: string;
};

export type WorkflowStep = {
  title: string;
  description: string;
};

export type FaqItem = { q: string; a: string };

export type ProductPageProps = {
  eyebrow: string;
  title: ReactNode;
  tagline?: string;
  lead: string;
  primaryCta?: { label: string; to?: string; href?: string };
  features: Feature[];
  featuresTitle?: string;
  featuresLead?: string;
  workflow?: { title?: string; steps: WorkflowStep[] };
  highlights?: string[];
  faq?: FaqItem[];
  children?: ReactNode;
};

export function ProductPage({
  eyebrow,
  title,
  tagline,
  lead,
  primaryCta,
  features,
  featuresTitle = "Capabilities",
  featuresLead,
  workflow,
  highlights,
  faq,
  children,
}: ProductPageProps) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Nav />
      <main className="pt-24">
        {/* Hero */}
        <section className="relative overflow-hidden border-b border-gold/10">
          <div
            aria-hidden
            className="absolute inset-0 -z-10 opacity-60"
            style={{
              background:
                "radial-gradient(60% 40% at 20% 0%, color-mix(in oklab, var(--primary) 22%, transparent), transparent 70%), radial-gradient(50% 40% at 80% 10%, color-mix(in oklab, var(--gold, #c9a84c) 18%, transparent), transparent 70%)",
            }}
          />
          <div className="mx-auto max-w-6xl px-6 py-20 sm:py-28">
            <div className="max-w-3xl">
              <Breadcrumbs to={pathname} />
              <div className="inline-flex items-center gap-2 rounded-full border border-gold/30 bg-gold/5 px-3 py-1 text-[11px] uppercase tracking-[0.24em] text-gold">
                <Sparkles className="h-3 w-3" /> {eyebrow}
              </div>
              <h1 className="mt-5 font-display text-4xl sm:text-6xl leading-[1.05]">
                {title}
              </h1>
              {tagline ? (
                <div className="mt-3 text-sm uppercase tracking-[0.3em] text-primary/90">
                  {tagline}
                </div>
              ) : null}
              <p className="mt-6 max-w-2xl text-lg text-muted-foreground">{lead}</p>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Button asChild size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-glow">
                  {primaryCta?.to ? (
                    <Link to={primaryCta.to}>{primaryCta.label ?? "Book demo"}</Link>
                  ) : (
                    <a href={primaryCta?.href ?? "/contact"}>{primaryCta?.label ?? "Book demo"}</a>
                  )}
                </Button>
                <Button asChild size="lg" variant="outline" className="border-gold/30 text-foreground hover:bg-gold/5">
                  <Link to="/app">Explore console <ArrowRight className="ml-1.5 h-4 w-4" /></Link>
                </Button>
              </div>
              {highlights?.length ? (
                <div className="mt-8 flex flex-wrap gap-2">
                  {highlights.map((h) => (
                    <Badge key={h} variant="outline" className="border-primary/30 text-primary/90 bg-primary/5">
                      {h}
                    </Badge>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="mx-auto max-w-6xl px-6 py-20">
          <div className="mb-12 max-w-2xl">
            <div className="text-[11px] uppercase tracking-[0.28em] text-gold/80">{featuresTitle}</div>
            <h2 className="mt-2 font-display text-3xl sm:text-4xl">
              Built for enterprise real estate operations.
            </h2>
            {featuresLead ? (
              <p className="mt-3 text-muted-foreground">{featuresLead}</p>
            ) : null}
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => (
              <div
                key={f.title}
                className="group relative overflow-hidden rounded-xl border border-border/60 bg-surface/40 p-6 transition hover:border-primary/40 hover:bg-surface/60"
              >
                <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg border border-primary/25 bg-primary/10 text-primary">
                  <f.icon className="h-5 w-5" />
                </div>
                <div className="font-medium text-foreground">{f.title}</div>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                  {f.description}
                </p>
                <div className="pointer-events-none absolute inset-x-0 -bottom-px h-px bg-gradient-to-r from-transparent via-gold/40 to-transparent opacity-0 transition group-hover:opacity-100" />
              </div>
            ))}
          </div>
        </section>

        {/* Workflow */}
        {workflow?.steps.length ? (
          <section className="border-y border-gold/10 bg-surface/20 py-20">
            <div className="mx-auto max-w-6xl px-6">
              <div className="mb-12 max-w-2xl">
                <div className="text-[11px] uppercase tracking-[0.28em] text-gold/80">Workflow</div>
                <h2 className="mt-2 font-display text-3xl sm:text-4xl">
                  {workflow.title ?? "How it works"}
                </h2>
              </div>
              <ol className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                {workflow.steps.map((s, i) => (
                  <li
                    key={s.title}
                    className="relative rounded-xl border border-border/60 bg-background/40 p-6"
                  >
                    <div className="font-display text-4xl text-gold/70">
                      {String(i + 1).padStart(2, "0")}
                    </div>
                    <div className="mt-3 font-medium text-foreground">{s.title}</div>
                    <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                      {s.description}
                    </p>
                  </li>
                ))}
              </ol>
            </div>
          </section>
        ) : null}

        {children ? (
          <section className="mx-auto max-w-6xl px-6 py-20">{children}</section>
        ) : null}

        {/* FAQ */}
        {faq?.length ? (
          <section className="mx-auto max-w-4xl px-6 py-20">
            <div className="mb-10">
              <div className="text-[11px] uppercase tracking-[0.28em] text-gold/80">FAQ</div>
              <h2 className="mt-2 font-display text-3xl sm:text-4xl">Frequently asked questions</h2>
            </div>
            <Accordion type="single" collapsible className="w-full">
              {faq.map((item, i) => (
                <AccordionItem key={item.q} value={`item-${i}`} className="border-border/60">
                  <AccordionTrigger className="text-left text-foreground hover:text-primary">
                    {item.q}
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">
                    {item.a}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </section>
        ) : null}

        {/* CTA */}
        <section className="mx-auto max-w-6xl px-6 pb-24">
          <div className="relative overflow-hidden rounded-2xl border border-gold/30 bg-gradient-to-br from-primary/15 via-background to-gold/10 p-10 sm:p-14">
            <div
              aria-hidden
              className="absolute inset-0 -z-10 opacity-40"
              style={{
                background:
                  "radial-gradient(60% 60% at 100% 0%, color-mix(in oklab, var(--primary) 30%, transparent), transparent 60%)",
              }}
            />
            <div className="max-w-2xl">
              <div className="text-[11px] uppercase tracking-[0.28em] text-gold">Strength. Vision. Legacy.</div>
              <h2 className="mt-3 font-display text-3xl sm:text-4xl">
                See Sentinel Fort Group in action.
              </h2>
              <p className="mt-3 text-muted-foreground">
                Book a personalised walkthrough of the Intelligence Layer for Real Estate — CRM, ERP, Marketplace, AI Voice, Marketing Cloud and BI, unified.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Button asChild size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-glow">
                  <Link to="/contact">Book demo</Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="border-gold/40">
                  <Link to="/app">Open console</Link>
                </Button>
              </div>
              <ul className="mt-6 grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
                {[
                  "Enterprise SSO & RBAC",
                  "AI-native across the stack",
                  "Multi-tenant, region-aware",
                  "Deploys in weeks, not quarters",
                ].map((x) => (
                  <li key={x} className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary" /> {x}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}