import { MapPin, Bed, Square, TrendingUp } from "lucide-react";

const properties = [
  { name: "Lodha Belmondo", city: "Pune · Pirangut", price: "₹1.85 Cr", bhk: "3 BHK", area: "1,840 sqft", score: 92, tag: "Hot" },
  { name: "Prestige Lakeside", city: "Bengaluru · Varthur", price: "₹2.40 Cr", bhk: "4 BHK", area: "2,210 sqft", score: 88, tag: "New" },
  { name: "Oberoi Sky City", city: "Mumbai · Borivali", price: "₹3.10 Cr", bhk: "3 BHK", area: "1,650 sqft", score: 95, tag: "Premium" },
];

export function Marketplace() {
  return (
    <section id="marketplace" className="relative py-32 bg-surface/30">
      <div className="mx-auto max-w-7xl px-6">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div className="max-w-xl">
            <p className="text-sm uppercase tracking-[0.2em] text-primary">Marketplace</p>
            <h2 className="mt-4 font-display text-5xl md:text-6xl">
              A premium <em>property portal</em>, AI-curated.
            </h2>
          </div>
          <p className="max-w-md text-muted-foreground">
            Every listing comes with investment scoring, price trends, builder
            insights and a one-click virtual tour.
          </p>
        </div>

        <div className="mt-16 grid gap-6 md:grid-cols-3">
          {properties.map((p) => (
            <article key={p.name} className="group overflow-hidden rounded-2xl border border-border bg-background transition-all hover:-translate-y-1 hover:shadow-elevated">
              <div className="relative h-56 overflow-hidden bg-gradient-to-br from-surface-elevated to-surface">
                <div className="absolute inset-0 bg-grid opacity-40" />
                <div className="absolute top-4 left-4 rounded-full bg-primary/90 px-3 py-1 text-xs font-medium text-primary-foreground backdrop-blur">
                  {p.tag}
                </div>
                <div className="absolute bottom-4 right-4 flex items-center gap-1.5 rounded-full bg-background/80 px-3 py-1 text-xs backdrop-blur">
                  <TrendingUp className="h-3 w-3 text-primary" />
                  AI Score <span className="text-gradient-emerald font-medium">{p.score}</span>
                </div>
              </div>
              <div className="p-6">
                <h3 className="text-xl text-foreground">{p.name}</h3>
                <div className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
                  <MapPin className="h-3.5 w-3.5" /> {p.city}
                </div>
                <div className="mt-5 flex items-center gap-5 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1.5"><Bed className="h-4 w-4" />{p.bhk}</span>
                  <span className="flex items-center gap-1.5"><Square className="h-4 w-4" />{p.area}</span>
                </div>
                <div className="mt-6 flex items-end justify-between border-t border-border pt-5">
                  <div>
                    <div className="text-xs text-muted-foreground">Starting at</div>
                    <div className="font-display text-2xl text-foreground">{p.price}</div>
                  </div>
                  <button className="text-sm text-primary hover:underline">View →</button>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}