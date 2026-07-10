import { createFileRoute } from "@tanstack/react-router";
import { ProductPage } from "@/components/landing/ProductPage";
import { UserPlus, Search, Percent, Sparkles, Smartphone, MapPin } from "lucide-react";

export const Route = createFileRoute("/solutions/brokers")({
  head: () => ({
    meta: [
      { title: "Sentinel for Brokers — AI-native Brokerage" },
      { name: "description", content: "Mobile-first CRM, verified inventory discovery, commission tracking and AI copilot for real estate brokers." },
      { property: "og:title", content: "Sentinel for Brokers" },
    ],
  }),
  component: BrokersPage,
});

function BrokersPage() {
  return (
    <ProductPage
      eyebrow="Solutions · Brokers"
      title={<>The AI copilot for <span className="text-primary">every broker</span>.</>}
      tagline="Discover. Match. Close."
      lead="Sentinel gives independent brokers and agencies verified inventory, mobile-first CRM, commission tracking and an always-on AI copilot."
      highlights={["Mobile-first", "Verified inventory", "Commission tracking", "AI copilot"]}
      features={[
        { icon: UserPlus, title: "Lead Management", description: "Capture, organise and nurture leads across WhatsApp, calls and portals." },
        { icon: Search, title: "Property Discovery", description: "Access verified developer inventory with live availability and pricing." },
        { icon: Percent, title: "Commission Tracking", description: "See every deal, payout status, TDS and ledger — always up to date." },
        { icon: Sparkles, title: "AI Copilot", description: "Suggests properties, drafts messages and preps site visits automatically." },
        { icon: Smartphone, title: "Mobile CRM", description: "Full CRM in your pocket with offline capture and voice notes." },
        { icon: MapPin, title: "Site Visit Management", description: "Schedule, geo-verify and capture feedback with buyer signatures." },
      ]}
    />
  );
}