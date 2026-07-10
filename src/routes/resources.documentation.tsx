import { createFileRoute } from "@tanstack/react-router";
import { ResourcePage } from "@/components/landing/ResourcePage";
import { BookOpen, Rocket, Wrench, Layers, ShieldCheck, Code2 } from "lucide-react";

export const Route = createFileRoute("/resources/documentation")({
  head: () => ({
    meta: [
      { title: "Documentation — Sentinel Fort Group" },
      { name: "description", content: "Product guides, setup walkthroughs, admin manuals and integration playbooks for the Sentinel platform." },
      { property: "og:title", content: "Sentinel Documentation" },
      { property: "og:description", content: "Guides, walkthroughs and admin manuals for every Sentinel module." },
    ],
  }),
  component: DocsPage,
});

function DocsPage() {
  return (
    <ResourcePage
      eyebrow="Resources · Documentation"
      title={<>Everything you need to <span className="text-primary">run Sentinel</span>.</>}
      lead="Product guides, setup walkthroughs, administrator manuals and integration playbooks — organised by module and role."
      highlights={["Quickstarts", "Admin guides", "Best practices", "Playbooks"]}
      sections={[
        { icon: Rocket, title: "Getting Started", description: "Provision your workspace, invite teams and configure your first project in under an hour." },
        { icon: Layers, title: "Modules", description: "Deep dives into CRM, ERP, Marketplace, AI Voice, Marketing Cloud, BI and KIE." },
        { icon: Wrench, title: "Administration", description: "Roles, permissions, approval flows, audit trails and workspace policies." },
        { icon: BookOpen, title: "Playbooks", description: "Prescriptive workflows for launches, collections, channel partners and closures." },
        { icon: ShieldCheck, title: "Security", description: "SSO/SAML, IP allowlists, data residency, encryption and key rotation." },
        { icon: Code2, title: "Developer Notes", description: "Webhooks, event schemas, custom fields and extension patterns." },
      ]}
      cta={{ label: "Explore API Docs", to: "/resources/api" }}
      related={[
        { label: "Knowledge Base", to: "/resources/knowledge-base" },
        { label: "Help Center", to: "/resources/help" },
        { label: "Release Notes", to: "/resources/release-notes" },
      ]}
    />
  );
}