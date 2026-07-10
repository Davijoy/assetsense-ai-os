import { createFileRoute, Link } from "@tanstack/react-router";
import { Nav } from "@/components/landing/Nav";
import { Footer } from "@/components/landing/Footer";
import { BookOpen, Search, Newspaper, Code2, GitBranch, Trophy, Heart, LifeBuoy, Users2, Activity, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/resources/")({
  head: () => ({
    meta: [
      { title: "Resources — Sentinel Fort Group" },
      { name: "description", content: "Documentation, knowledge base, blog, API docs, release notes, case studies, support and community." },
      { property: "og:title", content: "Sentinel Resources" },
      { property: "og:description", content: "Everything you need to learn, build and scale on the Sentinel platform." },
    ],
  }),
  component: ResourcesIndex,
});

const tiles = [
  { to: "/resources/documentation", icon: BookOpen, title: "Documentation", desc: "Guides, walkthroughs and admin manuals." },
  { to: "/resources/knowledge-base", icon: Search, title: "Knowledge Base", desc: "Searchable articles and troubleshooting." },
  { to: "/resources/blog", icon: Newspaper, title: "Blog", desc: "Perspectives on AI and real estate." },
  { to: "/resources/api", icon: Code2, title: "API Documentation", desc: "REST, webhooks, events and SDKs." },
  { to: "/resources/release-notes", icon: GitBranch, title: "Release Notes", desc: "Everything we ship, every month." },
  { to: "/resources/case-studies", icon: Trophy, title: "Case Studies", desc: "Real outcomes from real customers." },
  { to: "/resources/customers", icon: Heart, title: "Customer Stories", desc: "Voices from the Sentinel community." },
  { to: "/resources/help", icon: LifeBuoy, title: "Help Center", desc: "Support channels and SLAs." },
  { to: "/resources/community", icon: Users2, title: "Community", desc: "Forums, events and certifications." },
  { to: "/resources/status", icon: Activity, title: "System Status", desc: "Realtime platform health." },
] as const;

function ResourcesIndex() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Nav />
      <main className="pt-28 pb-24">
        <section className="mx-auto max-w-6xl px-6 pb-12">
          <div className="text-[11px] uppercase tracking-[0.28em] text-gold/80">Resources</div>
          <h1 className="mt-4 font-display text-4xl sm:text-5xl leading-tight max-w-3xl">
            Everything you need to learn, build and <span className="text-primary">scale on Sentinel</span>.
          </h1>
          <p className="mt-5 max-w-2xl text-base text-muted-foreground">
            One home for documentation, developer references, customer stories, support and community.
          </p>
        </section>
        <section className="mx-auto max-w-6xl px-6">
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {tiles.map((t) => (
              <Link
                key={t.to}
                to={t.to}
                className="group rounded-2xl border border-border/60 bg-surface/40 p-6 transition hover:border-gold/30 hover:bg-surface/60"
              >
                <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <t.icon className="h-5 w-5" />
                </div>
                <h3 className="font-display text-lg text-foreground">{t.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{t.desc}</p>
                <div className="mt-4 inline-flex items-center gap-1 text-xs text-gold group-hover:gap-2 transition-all">
                  Explore <ArrowRight className="h-3.5 w-3.5" />
                </div>
              </Link>
            ))}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}