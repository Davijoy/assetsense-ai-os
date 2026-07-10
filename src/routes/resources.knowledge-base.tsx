import { createFileRoute } from "@tanstack/react-router";
import { ResourcePage } from "@/components/landing/ResourcePage";
import { Search, Compass, MessageCircleQuestion, Sparkles, Users2, Settings2 } from "lucide-react";

export const Route = createFileRoute("/resources/knowledge-base")({
  head: () => ({
    meta: [
      { title: "Knowledge Base — Sentinel Fort Group" },
      { name: "description", content: "Searchable articles, how-tos and troubleshooting for every Sentinel workflow." },
      { property: "og:title", content: "Sentinel Knowledge Base" },
      { property: "og:description", content: "How-tos, troubleshooting and answers across the Sentinel platform." },
    ],
  }),
  component: KBPage,
});

function KBPage() {
  return (
    <ResourcePage
      eyebrow="Resources · Knowledge Base"
      title={<>Answers, <span className="text-primary">indexed</span>.</>}
      lead="Search hundreds of how-to articles, troubleshooting guides and configuration walkthroughs — powered by the same intelligence layer that runs Sentinel."
      highlights={["AI-assisted search", "Role-based views", "Curated collections", "Continuously updated"]}
      sections={[
        { icon: Search, title: "AI Search", description: "Ask a question in natural language and get a cited answer from official docs." },
        { icon: Compass, title: "By Role", description: "Curated tracks for admins, sales, finance, marketing and channel partners." },
        { icon: Settings2, title: "Configuration", description: "Approval workflows, pricing rules, entitlements and integration setup." },
        { icon: MessageCircleQuestion, title: "Troubleshooting", description: "Diagnostic checklists for common integration, sync and permission issues." },
        { icon: Sparkles, title: "What's New", description: "Highlights on newly shipped modules and behavioural changes." },
        { icon: Users2, title: "Community Picks", description: "Most-viewed articles from our user community, refreshed weekly." },
      ]}
      related={[
        { label: "Documentation", to: "/resources/documentation" },
        { label: "Community", to: "/resources/community" },
        { label: "Help Center", to: "/resources/help" },
      ]}
    />
  );
}