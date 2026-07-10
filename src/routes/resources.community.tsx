import { createFileRoute } from "@tanstack/react-router";
import { ResourcePage } from "@/components/landing/ResourcePage";
import { Users2, MessagesSquare, Calendar, Award, GraduationCap, Github } from "lucide-react";

export const Route = createFileRoute("/resources/community")({
  head: () => ({
    meta: [
      { title: "Community — Sentinel Fort Group" },
      { name: "description", content: "Join the Sentinel community of operators, admins and developers building on the platform." },
      { property: "og:title", content: "Sentinel Community" },
      { property: "og:description", content: "Forums, events, certifications and open source around the Sentinel platform." },
    ],
  }),
  component: CommunityPage,
});

function CommunityPage() {
  return (
    <ResourcePage
      eyebrow="Resources · Community"
      title={<>Learn, share, <span className="text-primary">ship together</span>.</>}
      lead="Sentinel's community brings operators, admins, developers and executives together to trade playbooks and shape the platform."
      highlights={["Forums", "Meetups", "Certifications", "Open source"]}
      sections={[
        { icon: MessagesSquare, title: "Forums", description: "Q&A and long-form discussions moderated by Sentinel engineers and customer champions." },
        { icon: Calendar, title: "Events", description: "City meetups, executive roundtables and the annual Sentinel Summit." },
        { icon: GraduationCap, title: "Sentinel Academy", description: "Self-paced courses for admins, sales leaders and developers." },
        { icon: Award, title: "Certifications", description: "Role-based certifications recognised across the real estate industry." },
        { icon: Github, title: "Open Source", description: "SDKs, sample integrations and reference apps you can fork today." },
        { icon: Users2, title: "User Groups", description: "Regional user groups for developers, brokers and channel partners." },
      ]}
      cta={{ label: "Join the Community", to: "/contact" }}
      related={[
        { label: "Help Center", to: "/resources/help" },
        { label: "Knowledge Base", to: "/resources/knowledge-base" },
      ]}
    />
  );
}