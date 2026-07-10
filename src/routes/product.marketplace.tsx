import { createFileRoute } from "@tanstack/react-router";
import { ProductPage } from "@/components/landing/ProductPage";
import {
  Building,
  Search,
  Sparkles,
  TrendingUp,
  Camera,
  UserCircle2,
  Scale,
  Star,
  Megaphone,
} from "lucide-react";

export const Route = createFileRoute("/product/marketplace")({
  head: () => ({
    meta: [
      { title: "Sentinel Marketplace — AI-scored Property Discovery" },
      { name: "description", content: "Discover, compare and transact residential and commercial inventory with AI investment scores, virtual tours and builder profiles." },
      { property: "og:title", content: "Sentinel Marketplace" },
    ],
  }),
  component: MarketplacePage,
});

function MarketplacePage() {
  return (
    <ProductPage
      eyebrow="Product · Marketplace"
      title={<>The intelligent <span className="text-primary">property marketplace</span>.</>}
      tagline="Discover. Compare. Transact."
      lead="Sentinel Marketplace turns fragmented listings into a curated, AI-scored inventory ecosystem — connecting developers, brokers, channel partners and buyers with confidence."
      highlights={["AI Investment Score", "Verified builders", "Virtual tours", "Live availability"]}
      features={[
        { icon: Building, title: "Property Listings", description: "Rich, media-first listings with live availability, price stacks and configuration variants." },
        { icon: Search, title: "Smart Search", description: "Semantic + faceted search across location, budget, typology, RERA and yield." },
        { icon: Sparkles, title: "AI Recommendations", description: "Personalised recommendations for buyers, investors and channel partners." },
        { icon: TrendingUp, title: "Investment Score", description: "Composite score blending location, developer, price trajectory and rental yield." },
        { icon: Camera, title: "Virtual Tours", description: "3D walkthroughs, drone footage and interactive floor plates." },
        { icon: UserCircle2, title: "Builder Profiles", description: "Verified developer pages with delivery track record, RERA and ratings." },
        { icon: Scale, title: "Project Comparisons", description: "Side-by-side comparison on price, amenities, delivery, yield and score." },
        { icon: Star, title: "Featured Listings", description: "Curated placements for launches, RERA-approved projects and premium inventory." },
        { icon: Megaphone, title: "Premium Promotions", description: "Sponsored slots, retargeting and lead-gen campaigns built into the marketplace." },
      ]}
      workflow={{
        title: "The marketplace ecosystem",
        steps: [
          { title: "Developers", description: "Publish live inventory, media and offers directly from ERP." },
          { title: "Brokers", description: "Discover and share vetted inventory with buyers instantly." },
          { title: "Buyers", description: "Search, compare and book with transparency and AI guidance." },
          { title: "Platform", description: "Sentinel governs quality, verification and settlement." },
        ],
      }}
      faq={[
        { q: "How is the AI Investment Score calculated?", a: "It combines location signals, developer track record, price trajectory, absorption and estimated yield into a single 0-100 score with explainability." },
        { q: "Can channel partners list inventory?", a: "Yes — partners can access developer-authorised inventory with controlled pricing and lead attribution." },
      ]}
    />
  );
}