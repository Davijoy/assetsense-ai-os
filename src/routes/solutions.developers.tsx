import { createFileRoute } from "@tanstack/react-router";
import { ProductPage } from "@/components/landing/ProductPage";
import { Megaphone, UserPlus, Users2, Boxes, Wallet, Sparkles, LayoutDashboard } from "lucide-react";

export const Route = createFileRoute("/solutions/developers")({
  head: () => ({
    meta: [
      { title: "Sentinel for Developers — Intelligence Layer for Builders" },
      { name: "description", content: "Marketing, CRM, inventory, collections and executive intelligence — built for residential and commercial developers." },
      { property: "og:title", content: "Sentinel for Developers" },
    ],
  }),
  component: DevelopersPage,
});

function DevelopersPage() {
  return (
    <ProductPage
      eyebrow="Solutions · Developers"
      title={<>Built for <span className="text-primary">developers</span> who compound.</>}
      tagline="Marketing to handover"
      lead="Sentinel gives residential and commercial developers a single operating system — from project marketing to CRM, inventory, collections and boardroom intelligence."
      highlights={["RERA-aware", "Multi-project", "Channel partner network", "CFO-grade finance"]}
      features={[
        { icon: Megaphone, title: "Project Marketing", description: "Full-funnel campaigns across Meta, Google, WhatsApp and landing pages tied to project KPIs." },
        { icon: UserPlus, title: "Lead Generation", description: "Omni-source lead capture with deduping, enrichment and AI qualification." },
        { icon: Users2, title: "CRM", description: "Sales pipelines, site visits, follow-ups and channel partner workflows." },
        { icon: Boxes, title: "Inventory", description: "Live tower/floor/unit inventory shared across CRM, Marketplace and partner apps." },
        { icon: Wallet, title: "Collections", description: "Milestone demands, automated reminders and reconciliation with your finance stack." },
        { icon: Sparkles, title: "AI Decision Support", description: "Pricing, absorption and channel-mix recommendations with confidence bands." },
        { icon: LayoutDashboard, title: "Executive Dashboards", description: "Group-level dashboards with drill-down explainability for every KPI." },
      ]}
      workflow={{
        title: "Customer journey",
        steps: [
          { title: "Awareness", description: "Marketing Cloud runs campaigns across channels." },
          { title: "Consideration", description: "Marketplace + AI Voice qualify and nurture intent." },
          { title: "Booking", description: "CRM and ERP convert to bookings with digital agreements." },
          { title: "Loyalty", description: "Post-sales portal and BI signals drive referrals." },
        ],
      }}
    />
  );
}