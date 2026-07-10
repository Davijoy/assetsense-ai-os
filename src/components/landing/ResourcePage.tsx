import { ReactNode } from "react";
import { Nav } from "@/components/landing/Nav";
import { Footer } from "@/components/landing/Footer";
import { Link, useRouterState } from "@tanstack/react-router";
import { Breadcrumbs } from "@/components/landing/Breadcrumbs";
import { RelatedArticles } from "@/components/landing/RelatedArticles";
import { ArrowRight, type LucideIcon } from "lucide-react";

type Section = { title: string; description: string; icon?: LucideIcon };
type RelatedLink = { label: string; to: string };

type Props = {
  eyebrow: string;
  title: ReactNode;
  lead: string;
  highlights?: string[];
  sections?: Section[];
  cta?: { label: string; to?: string; href?: string };
  related?: RelatedLink[];
  children?: ReactNode;
};

export function ResourcePage({ eyebrow, title, lead, highlights, sections, cta, related, children }: Props) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Nav />
      <main className="pt-28 pb-24">
        {/* Hero */}
        <section className="relative overflow-hidden border-b border-gold/10">
          <div className="absolute inset-0 bg-gradient-to-b from-emerald-900/10 via-transparent to-transparent pointer-events-none" />
          <div className="relative mx-auto max-w-6xl px-6 py-16 sm:py-20">
            <Breadcrumbs to={pathname} />
            <div className="text-[11px] uppercase tracking-[0.28em] text-gold/80">{eyebrow}</div>
            <h1 className="mt-4 font-display text-4xl sm:text-5xl leading-tight max-w-3xl">{title}</h1>
            <p className="mt-5 max-w-2xl text-base text-muted-foreground">{lead}</p>
            {highlights && highlights.length > 0 ? (
              <div className="mt-8 flex flex-wrap gap-2">
                {highlights.map((h) => (
                  <span key={h} className="rounded-full border border-gold/20 bg-surface/40 px-3 py-1 text-xs text-muted-foreground">
                    {h}
                  </span>
                ))}
              </div>
            ) : null}
          </div>
        </section>

        {/* Sections */}
        {sections && sections.length > 0 ? (
          <section className="mx-auto max-w-6xl px-6 py-16">
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {sections.map((s) => (
                <div
                  key={s.title}
                  className="rounded-2xl border border-border/60 bg-surface/40 p-6 transition hover:border-gold/30 hover:bg-surface/60"
                >
                  {s.icon ? (
                    <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <s.icon className="h-5 w-5" />
                    </div>
                  ) : null}
                  <h3 className="font-display text-lg text-foreground">{s.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{s.description}</p>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {children ? (
          <section className="mx-auto max-w-6xl px-6 pb-4">{children}</section>
        ) : null}

        {/* CTA */}
        {cta ? (
          <section className="mx-auto max-w-6xl px-6 py-12">
            <div className="rounded-2xl border border-gold/20 bg-gradient-to-br from-emerald-900/20 to-surface/40 p-8 sm:p-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <div className="text-[11px] uppercase tracking-[0.28em] text-gold/80">Get started</div>
                <div className="mt-2 font-display text-2xl text-foreground">Ready to dive deeper?</div>
              </div>
              {cta.to ? (
                <Link to={cta.to} className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition">
                  {cta.label} <ArrowRight className="h-4 w-4" />
                </Link>
              ) : (
                <a href={cta.href ?? "#"} className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition">
                  {cta.label} <ArrowRight className="h-4 w-4" />
                </a>
              )}
            </div>
          </section>
        ) : null}

        {/* Related */}
        {related && related.length > 0 ? (
          <section className="mx-auto max-w-6xl px-6 pt-4">
            <div className="text-[11px] uppercase tracking-[0.28em] text-gold/80">Related</div>
            <div className="mt-4 flex flex-wrap gap-3">
              {related.map((r) => (
                <Link key={r.to} to={r.to} className="rounded-full border border-border/60 bg-surface/40 px-4 py-1.5 text-sm text-muted-foreground hover:border-gold/30 hover:text-foreground transition">
                  {r.label}
                </Link>
              ))}
            </div>
          </section>
        ) : null}
      </main>
      <Footer />
    </div>
  );
}