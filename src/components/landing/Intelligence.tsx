import { TrendingUp, Target, Activity, MapPinned } from "lucide-react";

export function Intelligence() {
  return (
    <section className="relative py-32 bg-surface/30">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-sm uppercase tracking-[0.2em] text-primary">Business Intelligence</p>
          <h2 className="mt-4 font-display text-5xl md:text-6xl">
            Decisions, <em>powered by signal.</em>
          </h2>
          <p className="mt-6 text-lg text-muted-foreground">
            Funnels, heatmaps, revenue forecasts and inventory health — refreshed in real time.
          </p>
        </div>

        <div className="mt-16 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {[
            { i: TrendingUp, k: "Revenue", v: "₹148 Cr", d: "↑ 23% QoQ" },
            { i: Target, k: "Conversion", v: "34.2%", d: "↑ 4.1% vs last" },
            { i: Activity, k: "Sales velocity", v: "12 days", d: "↓ 3 days" },
            { i: MapPinned, k: "Top demand", v: "Whitefield", d: "+312 leads" },
          ].map(({ i: Icon, k, v, d }) => (
            <div key={k} className="rounded-2xl border border-border bg-background p-6">
              <Icon className="h-5 w-5 text-primary" />
              <div className="mt-6 text-sm text-muted-foreground">{k}</div>
              <div className="mt-1 font-display text-4xl">{v}</div>
              <div className="mt-2 text-xs text-primary">{d}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}