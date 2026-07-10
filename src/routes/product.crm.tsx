import { createFileRoute } from "@tanstack/react-router";
import { ProductPage } from "@/components/landing/ProductPage";
import {
  UserPlus,
  GitBranch,
  MapPin,
  Repeat,
  BellRing,
  Sparkles,
  Handshake,
  BarChart3,
  Users2,
} from "lucide-react";

export const Route = createFileRoute("/product/crm")({
  head: () => ({
    meta: [
      { title: "Sentinel CRM — Intelligent Real Estate CRM" },
      { name: "description", content: "Lead-to-loyalty CRM for developers, brokers and channel partners. AI lead scoring, site visits, follow-ups and pipeline intelligence." },
      { property: "og:title", content: "Sentinel CRM" },
      { property: "og:description", content: "The intelligent CRM for real estate — lead management, pipeline, site visits and AI scoring." },
    ],
  }),
  component: CrmPage,
});

function CrmPage() {
  return (
    <ProductPage
      eyebrow="Product · CRM"
      title={<>The intelligent CRM for <span className="text-primary">real estate</span>.</>}
      tagline="Lead to loyalty, unified"
      lead="Sentinel CRM unifies lead capture, qualification, site visits, follow-ups and channel partners into one AI-native workspace — engineered for developers, brokers and enterprise sales teams."
      highlights={["AI lead scoring", "Omni-channel intake", "Native site visits", "Pipeline analytics"]}
      primaryCta={{ label: "Book demo", to: "/contact" }}
      features={[
        { icon: UserPlus, title: "Lead Management", description: "Capture leads from Meta, Google, portals, WhatsApp, IVR and walk-ins with automatic de-duplication and enrichment." },
        { icon: GitBranch, title: "Sales Pipeline", description: "Configurable stages, drag-and-drop deals, conversion probabilities and forecast contribution per stage." },
        { icon: MapPin, title: "Site Visit Management", description: "Schedule, assign and geo-verify site visits with automated confirmations, reminders and feedback capture." },
        { icon: Repeat, title: "Customer Lifecycle", description: "Track every interaction from first touch to booking, handover and post-possession loyalty." },
        { icon: BellRing, title: "Follow-up Automation", description: "Cadences, next-best-action nudges and SLA breach alerts to keep every lead warm — automatically." },
        { icon: Sparkles, title: "AI Lead Scoring", description: "Realtime intent, budget-fit and channel signals ranked by our real-estate-tuned model." },
        { icon: Handshake, title: "Channel Partner Management", description: "Onboard, KYC, tag, share inventory and track partner-sourced pipeline end-to-end." },
        { icon: BarChart3, title: "Reports & Analytics", description: "Executive dashboards for source ROI, funnel velocity, agent performance and forecast accuracy." },
        { icon: Users2, title: "Team Collaboration", description: "Role-based access, mentions, shared notes, call logs and territory-based ownership." },
      ]}
      workflow={{
        title: "From capture to closure",
        steps: [
          { title: "Capture", description: "Every source funnels into one inbox with AI enrichment and duplicate merge." },
          { title: "Qualify", description: "AI scoring routes hot leads to the right agent within seconds." },
          { title: "Engage", description: "Automated cadences and site visits with real-time feedback." },
          { title: "Convert", description: "Guided closure workflows with token, booking and handover to ERP." },
        ],
      }}
      faq={[
        { q: "Can we migrate from Salesforce, LeadSquared or Zoho?", a: "Yes — we run a guided migration with field mapping, historical activity import and dry-run validation." },
        { q: "Does it work on mobile for on-ground teams?", a: "Sentinel CRM is mobile-first with offline capture and geo-fenced site visit verification." },
        { q: "How is AI lead scoring trained?", a: "Our real-estate-tuned model blends intent signals, source quality, demography and historical closure patterns per project." },
        { q: "Does it integrate with the ERP and Marketplace?", a: "Yes — the same lead flows into ERP for booking and consumes live inventory from Marketplace." },
      ]}
    />
  );
}