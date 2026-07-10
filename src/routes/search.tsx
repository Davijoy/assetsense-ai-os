import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { z } from "zod";
import { Nav } from "@/components/landing/Nav";
import { Footer } from "@/components/landing/Footer";
import { Input } from "@/components/ui/input";
import { Search as SearchIcon, ArrowUpRight } from "lucide-react";
import { SEARCH_CATEGORIES, searchEntries, type SearchCategory } from "@/lib/search-index";

const schema = z.object({
  q: fallback(z.string(), "").default(""),
  cat: fallback(z.string(), "All").default("All"),
});

export const Route = createFileRoute("/search")({
  validateSearch: zodValidator(schema),
  head: () => ({
    meta: [
      { title: "Search — Sentinel Fort Group" },
      { name: "description", content: "Search across Sentinel documentation, product pages and resources." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: SearchPage,
});

function SearchPage() {
  const { q: initialQ, cat: initialCat } = Route.useSearch();
  const [q, setQ] = useState(initialQ);
  const [cat, setCat] = useState<SearchCategory | "All">(
    (SEARCH_CATEGORIES.includes(initialCat as SearchCategory) ? initialCat : "All") as SearchCategory | "All",
  );
  const results = useMemo(() => searchEntries(q, cat), [q, cat]);
  const filters: (SearchCategory | "All")[] = ["All", ...SEARCH_CATEGORIES];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Nav />
      <main className="pt-28 pb-24">
        <section className="mx-auto max-w-4xl px-6">
          <div className="text-[11px] uppercase tracking-[0.28em] text-gold/80">Search</div>
          <h1 className="mt-3 font-display text-4xl sm:text-5xl">Search Sentinel</h1>
          <p className="mt-3 text-muted-foreground">Find product pages, documentation, resources and company info.</p>

          <div className="relative mt-8">
            <SearchIcon className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search docs, features, guides…"
              className="h-12 pl-11 pr-4 bg-surface/50 border-border/60 focus-visible:border-gold/40"
            />
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {filters.map((f) => (
              <button
                key={f}
                onClick={() => setCat(f)}
                className={`rounded-full border px-3 py-1 text-xs transition ${
                  cat === f
                    ? "border-gold/40 bg-gold/10 text-foreground"
                    : "border-border/60 bg-surface/30 text-muted-foreground hover:text-foreground"
                }`}
              >
                {f}
              </button>
            ))}
          </div>

          <div className="mt-8 text-xs text-muted-foreground">
            {results.length} result{results.length === 1 ? "" : "s"}
          </div>

          <ul className="mt-3 divide-y divide-border/60 rounded-xl border border-border/60 bg-surface/30">
            {results.length === 0 ? (
              <li className="p-6 text-sm text-muted-foreground">No matches. Try different keywords or clear the filter.</li>
            ) : (
              results.map((r) => (
                <li key={r.to}>
                  <Link
                    to={r.to}
                    className="group flex items-start justify-between gap-4 p-5 hover:bg-surface/60 transition"
                  >
                    <div className="min-w-0">
                      <div className="text-[10px] uppercase tracking-[0.24em] text-gold/70">{r.category}</div>
                      <div className="mt-1 font-medium text-foreground">{r.title}</div>
                      <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{r.description}</p>
                    </div>
                    <ArrowUpRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground group-hover:text-primary transition-colors" />
                  </Link>
                </li>
              ))
            )}
          </ul>
        </section>
      </main>
      <Footer />
    </div>
  );
}
