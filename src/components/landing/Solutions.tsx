import {
  Building2, Users, Bot, Megaphone, BarChart3, Code2,
  Phone, Briefcase, Network, Wallet,
} from "lucide-react";

const solutions = [
  { icon: Building2, name: "Property Marketplace", desc: "Listings portal with smart search, virtual tours and AI investment scoring." },
  { icon: Users, name: "Sentinel CRM", desc: "Lead pipelines, scoring, assignment and nurturing built for real estate sales." },
  { icon: Bot, name: "AI Lead Intelligence", desc: "Predict purchase intent, budget, location preference and conversion probability." },
  { icon: Phone, name: "AI Voice Agents", desc: "Autonomous calling campaigns with sentiment analysis and qualification." },
  { icon: Megaphone, name: "Marketing Cloud", desc: "Meta, Google, WhatsApp, SMS and email campaigns with ROI tracking." },
  { icon: Briefcase, name: "Property ERP", desc: "Inventory, bookings, payments, agreements and possession in one stack." },
  { icon: Network, name: "Channel Partner Network", desc: "Onboard, verify and reward brokers with transparent commission flows." },
  { icon: Code2, name: "Developer Suite", desc: "Project, inventory and revenue dashboards purpose-built for developers." },
  { icon: BarChart3, name: "Business Intelligence", desc: "Funnels, heatmaps and demand trends to steer every decision." },
  { icon: Wallet, name: "SaaS Subscriptions", desc: "Tiered plans, billing, invoices and usage-based feature gating." },
];

export function Solutions() {
  return (
    <section id="solutions" className="relative py-32">
      <div className="mx-auto max-w-7xl px-6">
        <div className="max-w-2xl">
          <p className="text-sm uppercase tracking-[0.2em] text-primary">Solutions</p>
          <h2 className="mt-4 font-display text-5xl md:text-6xl">
            One platform. <em>Every</em> workflow.
          </h2>
          <p className="mt-6 text-lg text-muted-foreground">
            Replace ten disconnected tools with a single operating system designed for the
            modern real estate enterprise.
          </p>
        </div>

        <div className="mt-16 grid gap-px overflow-hidden rounded-3xl border border-border bg-border md:grid-cols-2 lg:grid-cols-3">
          {solutions.map(({ icon: Icon, name, desc }) => (
            <div key={name} className="group relative bg-background p-8 transition-colors hover:bg-surface">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/20 transition-all group-hover:bg-primary group-hover:text-primary-foreground group-hover:shadow-glow">
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="mt-6 text-xl font-medium text-foreground">{name}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}