import { createFileRoute } from "@tanstack/react-router";
import { ResourcePage } from "@/components/landing/ResourcePage";
import { Newspaper, Brain, Building2, TrendingUp, Users2, GraduationCap } from "lucide-react";

export const Route = createFileRoute("/resources/blog")({
  head: () => ({
    meta: [
      { title: "Blog — Sentinel Fort Group" },
      { name: "description", content: "Perspectives on AI, real estate intelligence, RERA, sales operations and executive decision-making." },
      { property: "og:title", content: "Sentinel Blog" },
      { property: "og:description", content: "AI, real estate operations and executive intelligence — perspectives from the Sentinel team." },
    ],
  }),
  component: BlogPage,
});

function BlogPage() {
  return (
    <ResourcePage
      eyebrow="Resources · Blog"
      title={<>Perspectives on <span className="text-primary">intelligent real estate</span>.</>}
      lead="Long-form writing on AI, decision intelligence, RERA, channel management, sales operations and how leading developers scale."
      highlights={["Product deep dives", "Executive playbooks", "Industry trends", "AI research"]}
      sections={[
        { icon: Brain, title: "AI in Real Estate", description: "How large models, RAG and voice agents are rewiring sales, marketing and operations." },
        { icon: Building2, title: "Developer Operations", description: "Launch playbooks, inventory strategies and pricing intelligence for developers." },
        { icon: TrendingUp, title: "Growth & Marketing", description: "Attribution, funnel design and creative testing for real estate at scale." },
        { icon: Users2, title: "Channel Partners", description: "Partner networks, commission design and deal-room best practices." },
        { icon: Newspaper, title: "Product Updates", description: "Behind-the-scenes on Sentinel's product roadmap and shipped features." },
        { icon: GraduationCap, title: "Executive Briefings", description: "Board-ready analyses on the state of Indian and global real estate." },
      ]}
      related={[
        { label: "Case Studies", to: "/resources/case-studies" },
        { label: "Customer Stories", to: "/resources/customers" },
        { label: "Press", to: "/press" },
      ]}
    />
  );
}