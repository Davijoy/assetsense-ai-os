import { createFileRoute } from "@tanstack/react-router";
import { ProductPage } from "@/components/landing/ProductPage";
import { Share2, Percent, BarChart3, Newspaper, Sparkles, Handshake } from "lucide-react";

export const Route = createFileRoute("/solutions/channel-partners")({
  head: () => ({
    meta: [
      { title: "Sentinel for Channel Partners" },
      { name: "description", content: "Lead sharing, commission tracking, performance analytics, project updates, AI support and deal rooms." },
      { property: "og:title", content: "Sentinel for Channel Partners" },
    ],
  }),
  component: ChannelPartnersPage,
});

function ChannelPartnersPage() {
  return (
    <ProductPage
      eyebrow="Solutions · Channel Partners"
      title={<>Scale your <span className="text-primary">partner network</span>.</>}
      tagline="Partner-grade platform"
      lead="Sentinel connects developers and channel partners in a single ecosystem — with lead sharing, commission tracking, live inventory and AI-powered deal rooms."
      highlights={["Lead sharing", "Live commissions", "Deal rooms", "Performance analytics"]}
      features={[
        { icon: Share2, title: "Lead Sharing", description: "Controlled lead sharing with attribution, TAT SLAs and quality scoring." },
        { icon: Percent, title: "Commission Tracking", description: "Transparent commission slabs, invoices, TDS and payout status." },
        { icon: BarChart3, title: "Performance Analytics", description: "League tables, conversion rates and productivity benchmarks." },
        { icon: Newspaper, title: "Project Updates", description: "Push launch decks, price sheets and construction updates instantly." },
        { icon: Sparkles, title: "AI Support", description: "AI copilot answers RERA, inventory and pricing queries in real time." },
        { icon: Handshake, title: "Deal Rooms", description: "Private rooms with AI deal health, documents and multi-party approvals." },
      ]}
    />
  );
}