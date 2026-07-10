import { Link } from "@tanstack/react-router";
import { ArrowUpRight } from "lucide-react";
import { relatedEntries } from "@/lib/search-index";

export function RelatedArticles({ to, title = "Related" }: { to: string; title?: string }) {
  const items = relatedEntries(to);
  if (items.length === 0) return null;
  return (
    <section className="mx-auto max-w-6xl px-6 pb-16">
      <div className="text-[11px] uppercase tracking-[0.28em] text-gold/80">{title}</div>
      <h3 className="mt-2 font-display text-2xl text-foreground">Continue exploring</h3>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((r) => (
          <Link
            key={r.to}
            to={r.to}
            className="group rounded-xl border border-border/60 bg-surface/40 p-5 transition hover:border-gold/30 hover:bg-surface/60"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="text-[10px] uppercase tracking-[0.24em] text-gold/70">{r.category}</div>
              <ArrowUpRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
            </div>
            <div className="mt-2 font-medium text-foreground">{r.title}</div>
            <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed line-clamp-2">{r.description}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}
