import { createFileRoute } from "@tanstack/react-router";
import { ResourcePage } from "@/components/landing/ResourcePage";
import { LifeBuoy, MessageCircle, Mail, Phone, Clock3, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/resources/help")({
  head: () => ({
    meta: [
      { title: "Help Center — Sentinel Fort Group" },
      { name: "description", content: "Support channels, SLAs and self-serve resources for every Sentinel customer." },
      { property: "og:title", content: "Sentinel Help Center" },
      { property: "og:description", content: "Contact support, review SLAs and access self-serve tools." },
    ],
  }),
  component: HelpPage,
});

function HelpPage() {
  return (
    <ResourcePage
      eyebrow="Resources · Help Center"
      title={<>We're here when you <span className="text-primary">need us</span>.</>}
      lead="Get help through the right channel — chat, email, phone or your dedicated Customer Success Manager, with SLAs that match your tier."
      highlights={["24×7 P1 support", "In-app chat", "Named CSMs"]}
      sections={[
        { icon: MessageCircle, title: "In-app Chat", description: "Reach support from any Sentinel screen — with automatic context capture." },
        { icon: Mail, title: "Email Support", description: "Write to support@sentinelfort.com for non-urgent requests and follow-ups." },
        { icon: Phone, title: "Phone & On-call", description: "Priority phone support with on-call rotations for enterprise customers." },
        { icon: LifeBuoy, title: "Escalations", description: "Clear escalation paths to engineering and product leadership when needed." },
        { icon: Clock3, title: "SLAs", description: "Tiered response and resolution SLAs by severity, published in your contract." },
        { icon: ShieldCheck, title: "Trust & Uptime", description: "Realtime status, incident notifications and post-mortems on record." },
      ]}
      cta={{ label: "Contact Support", to: "/contact" }}
      related={[
        { label: "System Status", to: "/resources/status" },
        { label: "Knowledge Base", to: "/resources/knowledge-base" },
        { label: "Community", to: "/resources/community" },
      ]}
    />
  );
}