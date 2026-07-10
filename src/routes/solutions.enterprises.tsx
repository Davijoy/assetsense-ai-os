import { createFileRoute } from "@tanstack/react-router";
import { ProductPage } from "@/components/landing/ProductPage";
import { Building2, Network, GitPullRequest, ScrollText, LayoutDashboard, Plug, ShieldCheck, Palette } from "lucide-react";

export const Route = createFileRoute("/solutions/enterprises")({
  head: () => ({
    meta: [
      { title: "Sentinel for Enterprises" },
      { name: "description", content: "Multi-location operations, regional hierarchies, approvals, audit trails, executive reporting, APIs, enterprise security and white-label." },
      { property: "og:title", content: "Sentinel for Enterprises" },
    ],
  }),
  component: EnterprisesPage,
});

function EnterprisesPage() {
  return (
    <ProductPage
      eyebrow="Solutions · Enterprises"
      title={<>Enterprise-grade <span className="text-primary">real estate OS</span>.</>}
      tagline="Scale with governance"
      lead="Sentinel Enterprise scales across regions, entities and brands — with granular hierarchies, approvals, audit trails, SSO, APIs and white-label options."
      highlights={["Multi-entity", "SSO & RBAC", "APIs & webhooks", "White-label"]}
      features={[
        { icon: Building2, title: "Multi-location Operations", description: "Run 10s of projects across cities from a single tenant with regional visibility." },
        { icon: Network, title: "Regional Hierarchies", description: "Group, region, city, project and team hierarchies with inherited permissions." },
        { icon: GitPullRequest, title: "Approval Workflows", description: "Configurable approvals for discounts, holds, waivers, cancellations and payouts." },
        { icon: ScrollText, title: "Audit Trails", description: "Immutable audit logs of every state change with user, source and reason." },
        { icon: LayoutDashboard, title: "Executive Reporting", description: "Consolidated reporting with entity, region and project breakdowns." },
        { icon: Plug, title: "API Integrations", description: "REST + webhooks + event bus into your finance, ERP and data warehouse stack." },
        { icon: ShieldCheck, title: "Enterprise Security", description: "SSO/SAML, RBAC, IP allowlists, data residency and encryption controls." },
        { icon: Palette, title: "White-label Solutions", description: "Fully white-labelled buyer, partner and executive apps with your brand." },
      ]}
    />
  );
}