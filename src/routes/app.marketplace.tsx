import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  MapPin,
  Bed,
  Square,
  TrendingUp,
  Search,
  SlidersHorizontal,
  Heart,
  Sparkles,
  ArrowUpRight,
} from "lucide-react";

export const Route = createFileRoute("/app/marketplace")({
  head: () => ({ meta: [{ title: "Marketplace — Sentinel Fort Group" }] }),
  ssr: false,
  component: Marketplace,
});

type Property = {
  id: string;
  name: string;
  builder: string;
  city: string;
  area: string;
  type: "Apartment" | "Villa" | "Plot" | "Commercial";
  config: string;
  size: string;
  priceLabel: string;
  priceCr: number;
  score: number;
  tag: "Hot" | "New" | "Premium" | "Trending";
  appreciation: string;
  status: "Ready" | "Under Construction" | "New Launch";
};

const properties: Property[] = [
  { id: "1", name: "Lodha Belmondo", builder: "Lodha Group", city: "Pune", area: "Pirangut", type: "Apartment", config: "3 BHK", size: "1,840 sqft", priceLabel: "₹1.85 Cr", priceCr: 1.85, score: 92, tag: "Hot", appreciation: "+14% YoY", status: "Ready" },
  { id: "2", name: "Prestige Lakeside Habitat", builder: "Prestige", city: "Bengaluru", area: "Varthur", type: "Apartment", config: "4 BHK", size: "2,210 sqft", priceLabel: "₹2.40 Cr", priceCr: 2.40, score: 88, tag: "New", appreciation: "+11% YoY", status: "Ready" },
  { id: "3", name: "Oberoi Sky City", builder: "Oberoi Realty", city: "Mumbai", area: "Borivali", type: "Apartment", config: "3 BHK", size: "1,650 sqft", priceLabel: "₹3.10 Cr", priceCr: 3.10, score: 95, tag: "Premium", appreciation: "+18% YoY", status: "Under Construction" },
  { id: "4", name: "Godrej Reserve", builder: "Godrej Properties", city: "Bengaluru", area: "Devanahalli", type: "Plot", config: "Plot", size: "2,400 sqft", priceLabel: "₹1.20 Cr", priceCr: 1.20, score: 86, tag: "Trending", appreciation: "+22% YoY", status: "New Launch" },
  { id: "5", name: "DLF The Camellias", builder: "DLF", city: "Gurugram", area: "Golf Course Rd", type: "Apartment", config: "4 BHK", size: "7,500 sqft", priceLabel: "₹38.5 Cr", priceCr: 38.5, score: 97, tag: "Premium", appreciation: "+9% YoY", status: "Ready" },
  { id: "6", name: "Brigade Cornerstone Utopia", builder: "Brigade Group", city: "Bengaluru", area: "Whitefield", type: "Apartment", config: "3 BHK", size: "1,720 sqft", priceLabel: "₹1.95 Cr", priceCr: 1.95, score: 84, tag: "New", appreciation: "+10% YoY", status: "Under Construction" },
  { id: "7", name: "Lodha World Towers", builder: "Lodha Group", city: "Mumbai", area: "Lower Parel", type: "Apartment", config: "3 BHK", size: "2,100 sqft", priceLabel: "₹8.40 Cr", priceCr: 8.40, score: 90, tag: "Hot", appreciation: "+12% YoY", status: "Ready" },
  { id: "8", name: "Embassy Boulevard", builder: "Embassy Group", city: "Bengaluru", area: "Yelahanka", type: "Villa", config: "5 BHK", size: "5,200 sqft", priceLabel: "₹7.20 Cr", priceCr: 7.20, score: 89, tag: "Premium", appreciation: "+13% YoY", status: "Ready" },
  { id: "9", name: "M3M Crown", builder: "M3M India", city: "Gurugram", area: "Sector 111", type: "Apartment", config: "3 BHK", size: "1,950 sqft", priceLabel: "₹3.85 Cr", priceCr: 3.85, score: 87, tag: "New", appreciation: "+15% YoY", status: "New Launch" },
];

const types: Property["type"][] = ["Apartment", "Villa", "Plot", "Commercial"];

function typeFromDb(t: string): Property["type"] {
  const v = t.toLowerCase();
  if (v.includes("villa")) return "Villa";
  if (v.includes("plot")) return "Plot";
  if (v.includes("commercial") || v.includes("office") || v.includes("retail")) return "Commercial";
  return "Apartment";
}

function formatPriceCr(inr: number): string {
  const cr = inr / 10_000_000;
  return cr >= 1 ? `₹${cr.toFixed(2)} Cr` : `₹${(inr / 100_000).toFixed(1)} L`;
}

function Marketplace() {
  const [q, setQ] = useState("");
  const [city, setCity] = useState("All");
  const [activeTypes, setActiveTypes] = useState<Property["type"][]>([]);
  const [budget, setBudget] = useState(50);
  const [selected, setSelected] = useState<Property | null>(null);

  const { data: liveRows = [] } = useQuery({
    queryKey: ["marketplace-properties"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("properties")
        .select("id,name,city,property_type,price_inr,status,ai_score,developer,created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const liveProperties: Property[] = useMemo(
    () =>
      liveRows.map((r) => {
        const priceCr = Number(r.price_inr) / 10_000_000;
        const status: Property["status"] =
          r.status === "sold" || r.status === "reserved" ? "Ready" : "New Launch";
        return {
          id: `db-${r.id}`,
          name: r.name,
          builder: r.developer ?? "—",
          city: r.city,
          area: r.city,
          type: typeFromDb(r.property_type),
          config: "—",
          size: "—",
          priceLabel: formatPriceCr(Number(r.price_inr)),
          priceCr,
          score: r.ai_score ?? 70,
          tag: "New",
          appreciation: "New listing",
          status,
        };
      }),
    [liveRows],
  );

  const combined = useMemo(() => [...liveProperties, ...properties], [liveProperties]);

  const cities = useMemo(() => {
    const set = new Set<string>(["Mumbai", "Bengaluru", "Pune", "Gurugram"]);
    combined.forEach((p) => set.add(p.city));
    return ["All", ...Array.from(set)];
  }, [combined]);

  const maxCr = useMemo(
    () => Math.max(50, ...combined.map((p) => Math.ceil(p.priceCr))),
    [combined],
  );

  const filtered = useMemo(() => {
    return combined.filter((p) => {
      if (q && !`${p.name} ${p.builder} ${p.area}`.toLowerCase().includes(q.toLowerCase())) return false;
      if (city !== "All" && p.city !== city) return false;
      if (activeTypes.length && !activeTypes.includes(p.type)) return false;
      if (p.priceCr > budget) return false;
      return true;
    });
  }, [q, city, activeTypes, budget, combined]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-primary">Marketplace</p>
          <h1 className="mt-1 font-display text-4xl">Curated <em>inventory</em></h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {filtered.length} properties matched · AI-scored for investment potential
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="h-2 w-2 rounded-full bg-primary animate-pulse" /> Synced from 8 sources
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex flex-1 min-w-[220px] items-center gap-2 rounded-md border border-border bg-surface px-3 py-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search projects, builders, locations…"
              className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>
          <div className="flex items-center gap-1 rounded-md border border-border bg-surface p-1 text-xs">
            {cities.map((c) => (
              <button
                key={c}
                onClick={() => setCity(c)}
                className={`rounded px-3 py-1.5 transition-colors ${
                  city === c ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
          <button className="inline-flex items-center gap-2 rounded-md border border-border bg-surface px-3 py-2 text-sm text-muted-foreground hover:text-foreground">
            <SlidersHorizontal className="h-3.5 w-3.5" /> More
          </button>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-6 border-t border-border/60 pt-4">
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase tracking-wider text-muted-foreground">Type</span>
            <div className="flex flex-wrap gap-1.5">
              {types.map((t) => {
                const active = activeTypes.includes(t);
                return (
                  <button
                    key={t}
                    onClick={() =>
                      setActiveTypes((prev) => (active ? prev.filter((x) => x !== t) : [...prev, t]))
                    }
                    className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                      active
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
                    }`}
                  >
                    {t}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="flex flex-1 min-w-[240px] items-center gap-3">
            <span className="text-xs uppercase tracking-wider text-muted-foreground">Max budget</span>
            <input
              type="range"
              min={1}
              max={maxCr}
              value={budget}
              onChange={(e) => setBudget(Number(e.target.value))}
              className="flex-1 accent-[color:var(--primary)]"
            />
            <span className="w-20 text-right text-xs text-foreground">₹{budget} Cr</span>
          </div>
        </div>
      </div>

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {filtered.map((p) => (
          <article
            key={p.id}
            onClick={() => setSelected(p)}
            className="group cursor-pointer overflow-hidden rounded-2xl border border-border bg-card transition-all hover:-translate-y-1 hover:border-primary/40 hover:shadow-elevated"
          >
            <div className="relative h-48 overflow-hidden bg-gradient-to-br from-surface-elevated to-surface">
              <div className="absolute inset-0 bg-grid opacity-40" />
              <div className="absolute left-3 top-3 flex gap-1.5">
                <span className="rounded-full bg-primary/90 px-2.5 py-1 text-[10px] font-medium uppercase tracking-wider text-primary-foreground">
                  {p.tag}
                </span>
                <span className="rounded-full bg-background/70 px-2.5 py-1 text-[10px] text-muted-foreground backdrop-blur">
                  {p.status}
                </span>
              </div>
              <button className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-full bg-background/70 backdrop-blur hover:bg-background">
                <Heart className="h-3.5 w-3.5" />
              </button>
              <div className="absolute bottom-3 right-3 flex items-center gap-1.5 rounded-full bg-background/80 px-3 py-1 text-xs backdrop-blur">
                <Sparkles className="h-3 w-3 text-primary" />
                AI <span className="text-gradient-emerald font-medium">{p.score}</span>
              </div>
            </div>
            <div className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg leading-tight text-foreground">{p.name}</h3>
                  <div className="text-xs text-muted-foreground">{p.builder}</div>
                </div>
                <ArrowUpRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-primary" />
              </div>
              <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                <MapPin className="h-3 w-3" /> {p.area} · {p.city}
              </div>
              <div className="mt-4 flex items-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><Bed className="h-3.5 w-3.5" />{p.config}</span>
                <span className="flex items-center gap-1"><Square className="h-3.5 w-3.5" />{p.size}</span>
                <span className="flex items-center gap-1 text-primary"><TrendingUp className="h-3.5 w-3.5" />{p.appreciation}</span>
              </div>
              <div className="mt-5 flex items-end justify-between border-t border-border/60 pt-4">
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Starting at</div>
                  <div className="font-display text-2xl">{p.priceLabel}</div>
                </div>
                <span className="text-xs text-primary group-hover:underline">View →</span>
              </div>
            </div>
          </article>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center text-sm text-muted-foreground">
          No properties match your filters. Try widening your budget or city.
        </div>
      )}

      {selected && (
        <div
          onClick={() => setSelected(null)}
          className="fixed inset-0 z-50 flex items-end justify-center bg-background/70 p-4 backdrop-blur-md md:items-center"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-2xl overflow-hidden rounded-2xl border border-border bg-card shadow-elevated"
          >
            <div className="relative h-56 bg-gradient-to-br from-surface-elevated to-surface">
              <div className="absolute inset-0 bg-grid opacity-40" />
              <div className="absolute bottom-4 left-5">
                <span className="rounded-full bg-primary/90 px-2.5 py-1 text-[10px] font-medium uppercase tracking-wider text-primary-foreground">
                  {selected.tag}
                </span>
              </div>
            </div>
            <div className="p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="font-display text-3xl">{selected.name}</h2>
                  <div className="text-sm text-muted-foreground">{selected.builder} · {selected.area}, {selected.city}</div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Starting at</div>
                  <div className="font-display text-3xl">{selected.priceLabel}</div>
                </div>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                  { l: "Config", v: selected.config },
                  { l: "Size", v: selected.size },
                  { l: "Type", v: selected.type },
                  { l: "Status", v: selected.status },
                ].map((s) => (
                  <div key={s.l} className="rounded-xl border border-border bg-surface/50 p-3">
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{s.l}</div>
                    <div className="mt-1 text-sm text-foreground">{s.v}</div>
                  </div>
                ))}
              </div>

              <div className="mt-5 rounded-xl border border-primary/30 bg-primary/5 p-4">
                <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-primary">
                  <Sparkles className="h-3.5 w-3.5" /> AI Investment Score · {selected.score}/100
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  Strong fundamentals: {selected.appreciation} appreciation, builder credibility AAA, infrastructure pipeline
                  active in {selected.area}. Ranks in top 8% of {selected.city} inventory.
                </p>
              </div>

              <div className="mt-5 flex items-center justify-end gap-2">
                <button
                  onClick={() => setSelected(null)}
                  className="rounded-md border border-border px-4 py-2 text-sm hover:bg-surface"
                >
                  Close
                </button>
                <button className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-glow hover:bg-primary/90">
                  Schedule Site Visit
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}