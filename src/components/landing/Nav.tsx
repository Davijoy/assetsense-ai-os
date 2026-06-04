import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { SentinelWordmark } from "@/components/brand/Logo";

const links = [
  { label: "Solutions", href: "#solutions" },
  { label: "Marketplace", href: "#marketplace" },
  { label: "AI Voice", href: "#ai-voice" },
  { label: "Knowledge Engine", href: "#intelligence" },
  { label: "Business Intelligence", href: "#intelligence" },
  { label: "Pricing", href: "#pricing" },
  { label: "Contact", href: "#contact" },
];

export function Nav() {
  return (
    <header className="fixed top-0 inset-x-0 z-50 border-b border-border/40 bg-background/60 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        <Link to="/" className="flex items-center">
          <SentinelWordmark />
        </Link>
        <nav className="hidden md:flex items-center gap-8">
          {links.map((l) => (
            <a key={l.href} href={l.href} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              {l.label}
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
            <Link to="/app">Open Console</Link>
          </Button>
          <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-glow">
            Book Demo
          </Button>
        </div>
      </div>
    </header>
  );
}