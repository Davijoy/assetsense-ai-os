import { createFileRoute } from "@tanstack/react-router";
import { ResourcePage } from "@/components/landing/ResourcePage";
import { Building2, TrendingUp, Handshake, LineChart, Sparkles, Users2 } from "lucide-react";

export const Route = createFileRoute("/resources/case-studies")({
  head: () => ({
    meta: [
      { title: "Case Studies — Sentinel Fort Group" },
      { name: "description", content: "How leading developers, brokerages and channel partners scale with Sentinel." },
      { property: "og:title", content: "Sentinel Case Studies" },
      { property: "og:description", content: "Real customer outcomes across CRM, ERP, Marketplace and BI." },
    ],
  }),
  component: CaseStudiesPage,
});

function CaseStudiesPage() {
  return (
    <ResourcePage
      eyebrow="Resources · Case Studies"
      title={<>Outcomes, not <span className="text-primary">promises</span>.</>}
      lead="Detailed breakdowns of how developers, brokerages and channel partners scaled measurable outcomes with Sentinel."
      highlights={["Enterprise", "Mid-market", "Channel"]}
      sections={[
        { icon: Building2, title: "Tier-1 developer scales launches", description: "How a national developer cut cost per qualified lead by 38% across 12 projects." },
        { icon: TrendingUp, title: "Brokerage 3x conversion", description: "A mobile-first brokerage tripled site-visit-to-booking conversion in one quarter." },
        { icon: Handshake, title: "Channel network unified", description: "600 partners, one platform: transparent commissions and shared inventory." },
        { icon: LineChart, title: "CFO-grade collections", description: "Automating demands, reminders and reconciliation to accelerate cashflow." },
        { icon: Sparkles, title: "AI-powered launches", description: "AI Voice + Marketing Cloud driving pre-launch pipeline in 48 hours." },
        { icon: Users2, title: "Enterprise governance", description: "Multi-entity rollout with approvals, audit trails and SSO across 30 offices." },
      ]}
      cta={{ label: "Request the full report", to: "/contact" }}
      related={[
        { label: "Customer Stories", to: "/resources/customers" },
        { label: "Blog", to: "/resources/blog" },
      ]}
    />
  );
}