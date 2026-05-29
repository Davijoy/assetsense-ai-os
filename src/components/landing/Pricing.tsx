import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";

const tiers = [
  { name: "Starter", price: "₹4,999", period: "/mo", desc: "For solo brokers getting started.",
    features: ["Up to 500 leads","Property CRM","Email & WhatsApp","Basic analytics"], cta: "Start free trial", featured: false },
  { name: "Professional", price: "₹14,999", period: "/mo", desc: "For growing brokerage teams.",
    features: ["Unlimited leads","AI lead scoring","Marketing automation","Channel partner portal","Priority support"], cta: "Start free trial", featured: true },
  { name: "Enterprise", price: "Custom", period: "", desc: "For developers & enterprises.",
    features: ["Multi-tenant ERP","AI Voice agents","Developer dashboards","BI & data warehouse","SLA & dedicated CSM"], cta: "Contact sales", featured: false },
];

export function Pricing() {
  return (
    <section id="pricing" className="relative py-32">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm uppercase tracking-[0.2em] text-primary">Pricing</p>
          <h2 className="mt-4 font-display text-5xl md:text-6xl">Plans for every <em>stage</em>.</h2>
          <p className="mt-6 text-lg text-muted-foreground">Start free. Scale to enterprise without migrating tools.</p>
        </div>

        <div className="mt-16 grid gap-6 lg:grid-cols-3">
          {tiers.map((t) => (
            <div key={t.name}
              className={`relative rounded-2xl border p-8 ${
                t.featured
                  ? "border-primary bg-surface shadow-glow"
                  : "border-border bg-background"
              }`}>
              {t.featured && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-1 text-xs font-medium text-primary-foreground">
                  Most popular
                </div>
              )}
              <h3 className="font-display text-3xl">{t.name}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{t.desc}</p>
              <div className="mt-6 flex items-baseline gap-1">
                <span className="font-display text-5xl">{t.price}</span>
                <span className="text-muted-foreground">{t.period}</span>
              </div>
              <Button className={`mt-6 w-full ${t.featured ? "bg-primary text-primary-foreground hover:bg-primary/90" : "bg-surface-elevated text-foreground hover:bg-surface"}`}>
                {t.cta}
              </Button>
              <ul className="mt-8 space-y-3 border-t border-border pt-6">
                {t.features.map((f) => (
                  <li key={f} className="flex items-start gap-3 text-sm text-foreground/90">
                    <Check className="mt-0.5 h-4 w-4 text-primary" /> {f}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}