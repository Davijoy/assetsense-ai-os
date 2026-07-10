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
  { label: "CRM", to: "/product/crm" },
  { label: "ERP", to: "/product/erp" },
  { label: "Marketplace", to: "/product/marketplace" },
  { label: "AI Voice", to: "/product/ai-voice" },
  { label: "Marketing Cloud", to: "/product/marketing-cloud" },
  { label: "BI", to: "/product/bi" },
];

const solutionsLinks = [
  { label: "Developers", to: "/solutions/developers" },
  { label: "Brokers", to: "/solutions/brokers" },
  { label: "Channel Partners", to: "/solutions/channel-partners" },
  { label: "Enterprises", to: "/solutions/enterprises" },
];

const companyLinks = [
  { label: "About", to: "/about" },
  { label: "Careers", to: "/careers" },
  { label: "Press", to: "/press" },
  { label: "Contact", to: "/contact" },
];

const resourcesLinks = [
  { label: "Documentation", to: "/resources/documentation" },
  { label: "Knowledge Base", to: "/resources/knowledge-base" },
  { label: "Blog", to: "/resources/blog" },
  { label: "API Docs", to: "/resources/api" },
  { label: "Release Notes", to: "/resources/release-notes" },
  { label: "Case Studies", to: "/resources/case-studies" },
  { label: "Customer Stories", to: "/resources/customers" },
  { label: "Help Center", to: "/resources/help" },
  { label: "Community", to: "/resources/community" },
  { label: "System Status", to: "/resources/status" },
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
          <NavDropdown label="Product" items={productLinks} />
          <NavDropdown label="Solutions" items={solutionsLinks} />
          <a href="/#pricing" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Pricing</a>
          <NavDropdown label="Resources" items={resourcesLinks} />
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