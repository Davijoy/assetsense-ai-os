const items = [
  { q: "Sentinel Fort Group replaced our CRM, ERP and ad-ops stack. Our cost-per-booking dropped by 38% in one quarter.",
    a: "Aarav Mehta", r: "Head of Sales, Skyline Developers" },
  { q: "The AI voice agents qualify leads at 2am. We wake up to scheduled site visits.",
    a: "Priya Iyer", r: "Founder, Iyer Realty" },
  { q: "Our channel partner network finally has a single source of truth for commissions.",
    a: "Rohan Kapoor", r: "Director, Kapoor Group" },
];

export function Testimonials() {
  return (
    <section className="relative py-32 bg-surface/30">
      <div className="mx-auto max-w-7xl px-6">
        <h2 className="font-display text-5xl md:text-6xl max-w-3xl">
          Trusted by the teams reshaping <em>Indian real estate.</em>
        </h2>
        <div className="mt-16 grid gap-6 md:grid-cols-3">
          {items.map((it) => (
            <figure key={it.a} className="rounded-2xl border border-border bg-background p-8">
              <blockquote className="font-display text-2xl leading-snug text-foreground">"{it.q}"</blockquote>
              <figcaption className="mt-6 border-t border-border pt-4 text-sm">
                <div className="text-foreground">{it.a}</div>
                <div className="text-muted-foreground">{it.r}</div>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}