import { createFileRoute } from "@tanstack/react-router";
import { ResourcePage } from "@/components/landing/ResourcePage";
import { Quote, Trophy, Heart, Users2, Sparkles, Star } from "lucide-react";

export const Route = createFileRoute("/resources/customers")({
  head: () => ({
    meta: [
      { title: "Customer Success Stories — Sentinel Fort Group" },
      { name: "description", content: "Stories from the developers, brokers and enterprises building on Sentinel." },
      { property: "og:title", content: "Sentinel Customer Stories" },
      { property: "og:description", content: "Success stories from Sentinel customers across India." },
    ],
  }),
  component: CustomersPage,
});

function CustomersPage() {
  return (
    <ResourcePage
      eyebrow="Resources · Customer Stories"
      title={<>Built with our <span className="text-primary">customers</span>.</>}
      lead="Real teams, real outcomes. Meet the developers, brokerages, channel networks and enterprises building on Sentinel."
      highlights={["Developers", "Brokers", "Enterprises", "Partners"]}
      sections={[
        { icon: Quote, title: "Voices of Leaders", description: "CEOs and CROs on why they picked Sentinel over legacy CRMs and point tools." },
        { icon: Trophy, title: "Award-winning Rollouts", description: "How top-performing programmes launched Sentinel across the organisation." },
        { icon: Heart, title: "Customer Advisory Board", description: "The cohort shaping the Sentinel roadmap alongside our product team." },
        { icon: Users2, title: "Community Champions", description: "Power users who mentor others and shape best practices." },
        { icon: Sparkles, title: "Innovation Programmes", description: "Early access to KIE, Deal Rooms and Voice AI with white-glove support." },
        { icon: Star, title: "Testimonials", description: "Short quotes across every persona — sales, finance, IT and leadership." },
      ]}
      cta={{ label: "Become a customer story", to: "/contact" }}
      related={[
        { label: "Case Studies", to: "/resources/case-studies" },
        { label: "Blog", to: "/resources/blog" },
      ]}
    />
  );
}