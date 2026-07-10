import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { SentinelWordmark } from "@/components/brand/Logo";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown } from "lucide-react";

const productLinks = [
  { label: "Solutions", href: "#solutions" },
  { label: "Marketplace", href: "#marketplace" },
  { label: "AI Voice", href: "#ai-voice" },
  { label: "Knowledge Engine", href: "#intelligence" },
  { label: "Business Intelligence", href: "#intelligence" },
  { label: "Pricing", href: "#pricing" },
];

const companyLinks = [
  { label: "About", to: "/about" },
  { label: "Careers", to: "/careers" },
  { label: "Press", to: "/press" },
  { label: "Contact", to: "/contact" },
];

const legalLinks = [
  { label: "Privacy", to: "/privacy" },
  { label: "Terms", to: "/terms" },
  { label: "Security", to: "/security" },
  { label: "DPA", to: "/dpa" },
];

function NavDropdown({ label, items }: { label: string; items: { label: string; to: string }[] }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors outline-none">
        {label}
        <ChevronDown className="h-3.5 w-3.5" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-44">
        {items.map((item, index) => (
          <DropdownMenuItem key={item.to} asChild>
            <Link to={item.to} className="cursor-pointer">
              {item.label}
            </Link>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function Nav() {
  return (
    <header className="fixed top-0 inset-x-0 z-50 border-b border-border/40 bg-background/60 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        <Link to="/" className="flex items-center">
          <SentinelWordmark />
        </Link>
        <nav className="hidden md:flex items-center gap-6 lg:gap-8">
          {productLinks.map((l) => (
            <a key={l.href} href={l.href} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              {l.label}
            </a>
          ))}
          <NavDropdown label="Company" items={companyLinks} />
          <NavDropdown label="Legal" items={legalLinks} />
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