import { createFileRoute } from "@tanstack/react-router";
import { Nav } from "@/components/landing/Nav";
import { Hero } from "@/components/landing/Hero";
import { Solutions } from "@/components/landing/Solutions";
import { Marketplace } from "@/components/landing/Marketplace";
import { AIVoice } from "@/components/landing/AIVoice";
import { Intelligence } from "@/components/landing/Intelligence";
import { Pricing } from "@/components/landing/Pricing";
import { Testimonials } from "@/components/landing/Testimonials";
import { FAQ } from "@/components/landing/FAQ";
import { CTA } from "@/components/landing/CTA";
import { Footer } from "@/components/landing/Footer";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Sentinel Fort Group — Where Real Estate Meets Intelligence" },
      { name: "description", content: "India's intelligent real estate operating system. Properties, CRM, AI voice agents, marketing and BI on one premium platform." },
      { property: "og:title", content: "Sentinel Fort Group — Where Real Estate Meets Intelligence" },
      { property: "og:description", content: "India's intelligent real estate operating system." },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Nav />
      <main>
        <Hero />
        <Solutions />
        <Marketplace />
        <AIVoice />
        <Intelligence />
        <Pricing />
        <Testimonials />
        <FAQ />
        <CTA />
      </main>
      <Footer />
    </div>
  );
}
