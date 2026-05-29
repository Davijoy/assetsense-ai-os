import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";

const links = [
  { label: "Solutions", href: "#solutions" },
  { label: "Marketplace", href: "#marketplace" },
  { label: "AI Voice", href: "#ai-voice" },
  { label: "Pricing", href: "#pricing" },
  { label: "Contact", href: "#contact" },
];

export function Nav() {
  return (
    <header className="fixed top-0 inset-x-0 z-50 border-b border-border/40 bg-background/60 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        <Link to="/" className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-md bg-gradient-to-br from-primary to-emerald-glow shadow-glow" />
          <span className="font-display text-2xl tracking-tight">Assetsense</span>
        </Link>
        <nav className="hidden md:flex items-center gap-8">
          {links.map((l) => (
            <a key={l.href} href={l.href} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              {l.label}
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" className="hidden sm:inline-flex">Sign in</Button>
          <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-glow">
            Book Demo
          </Button>
        </div>
      </div>
    </header>
  );
}