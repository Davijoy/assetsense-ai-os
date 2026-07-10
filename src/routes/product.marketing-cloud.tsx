import { createFileRoute } from "@tanstack/react-router";
import { ProductPage } from "@/components/landing/ProductPage";
import {
  Megaphone,
  Facebook,
  Chrome,
  LayoutTemplate,
  MessageCircle,
  Mail,
  Smartphone,
  Sparkles,
  BarChart3,
  Target,
} from "lucide-react";

export const Route = createFileRoute("/product/marketing-cloud")({
  head: () => ({
    meta: [
      { title: "Sentinel Marketing Cloud — Real Estate Growth Stack" },
      { name: "description", content: "Run Meta, Google, WhatsApp, Email and SMS campaigns with landing pages, nurturing and ROI dashboards — all attributed to bookings." },
      { property: "og:title", content: "Sentinel Marketing Cloud" },
    ],
  }),
  component: MarketingPage,
});

function MarketingPage() {
  return (
    <ProductPage
      eyebrow="Product · Marketing Cloud"
      title={<>Growth stack for <span className="text-primary">real estate</span>.</>}
      tagline="Attribution to booking"
      lead="Sentinel Marketing Cloud runs full-funnel campaigns across Meta, Google, WhatsApp, Email and SMS — with landing pages, nurturing and ROI dashboards attributed to CRM and ERP outcomes."
      highlights={["Meta & Google Ads", "WhatsApp CTWA", "Landing pages", "Booking-attributed ROI"]}
      features={[
        { icon: Megaphone, title: "Campaign Management", description: "Unified plan across projects, geographies and channels with budgets and pacing." },
        { icon: Facebook, title: "Meta Ads", description: "Native lead-form ingestion, CTWA campaigns and creative testing at scale." },
        { icon: Chrome, title: "Google Ads", description: "Search, PMax and YouTube with keyword and audience intelligence." },
        { icon: LayoutTemplate, title: "Landing Pages", description: "Blazing-fast, AB-tested landing pages with dynamic project data." },
        { icon: MessageCircle, title: "WhatsApp Campaigns", description: "Templated, opt-in campaigns with click-to-CRM handoff and bot flows." },
        { icon: Mail, title: "Email Marketing", description: "Drip campaigns, transactional emails and personalised project pushes." },
        { icon: Smartphone, title: "SMS Campaigns", description: "DLT-compliant SMS with delivery, click and conversion tracking." },
        { icon: Sparkles, title: "Lead Nurturing", description: "Behaviour-based journeys with AI-picked next-best-content." },
        { icon: BarChart3, title: "Campaign Analytics", description: "Attribution from impression to booking with cohort and creative reports." },
        { icon: Target, title: "ROI Dashboard", description: "Cost per qualified lead, cost per booking and channel-level ROI." },
      ]}
      workflow={{
        title: "From spend to booking",
        steps: [
          { title: "Plan", description: "Set project goals, budgets and channel mix." },
          { title: "Launch", description: "Publish across Meta, Google, WhatsApp, Email and SMS in one flow." },
          { title: "Capture", description: "Leads flow to CRM with source, campaign and creative attribution." },
          { title: "Attribute", description: "See ROI at the booking level — not just the click." },
        ],
      }}
    />
  );
}