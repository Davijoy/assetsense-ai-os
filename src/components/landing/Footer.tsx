import { SentinelMark } from "@/components/brand/Logo";
import { Link } from "@tanstack/react-router";

export function Footer() {
  const cols: { h: string; l: { label: string; to?: string; href?: string }[] }[] = [
    { h: "Product", l: [
      { label: "CRM", to: "/product/crm" },
      { label: "ERP", to: "/product/erp" },
      { label: "Marketplace", to: "/product/marketplace" },
      { label: "AI Voice", to: "/product/ai-voice" },
      { label: "Marketing Cloud", to: "/product/marketing-cloud" },
      { label: "BI", to: "/product/bi" },
    ]},
    { h: "Solutions", l: [
      { label: "Developers", to: "/solutions/developers" },
      { label: "Brokers", to: "/solutions/brokers" },
      { label: "Channel Partners", to: "/solutions/channel-partners" },
      { label: "Enterprises", to: "/solutions/enterprises" },
    ]},
    { h: "Company", l: [
      { label: "About", to: "/about" },
      { label: "Careers", to: "/careers" },
      { label: "Press", to: "/press" },
      { label: "Contact", to: "/contact" },
    ]},
    { h: "Resources", l: [
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
    ]},
    { h: "Legal", l: [
      { label: "Privacy", to: "/privacy" },
      { label: "Terms", to: "/terms" },
      { label: "Security", to: "/security" },
      { label: "DPA", to: "/dpa" },
    ]},
  ];
  return (
    <footer className="border-t border-border bg-surface/30 py-16">
      <div className="mx-auto max-w-7xl px-6">
        <div className="grid gap-12 lg:grid-cols-[2fr_3fr]">
          <div>
            <div className="flex items-center gap-3">
              <SentinelMark className="h-9 w-9" />
              <div className="flex flex-col leading-tight">
                <span className="font-display text-2xl">Sentinel Fort Group<sup className="text-gold text-[10px] ml-0.5">™</sup></span>
                <span className="text-[10px] uppercase tracking-[0.22em] text-gold/80">Strength. Vision. Legacy.</span>
              </div>
            </div>
            <p className="mt-4 max-w-sm text-sm text-muted-foreground">
              India's Intelligent Real Estate Operating System.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3 lg:grid-cols-5">
            {cols.map((c) => (
              <div key={c.h}>
                <div className="text-sm font-medium text-foreground">{c.h}</div>
                <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
                  {c.l.map((x) => (
                    <li key={x.label}>
                      {x.to ? (
                        <Link to={x.to} className="hover:text-foreground transition-colors">{x.label}</Link>
                      ) : (
                        <a href={x.href ?? "#"} className="hover:text-foreground transition-colors">{x.label}</a>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
        <div className="mt-16 flex flex-wrap items-center justify-between gap-4 border-t border-gold/20 pt-8 text-xs text-muted-foreground">
          <div>© {new Date().getFullYear()} Sentinel Fort Group™. All rights reserved.</div>
          <div className="text-gold/70">Strength. Vision. Legacy.</div>
        </div>
      </div>
    </footer>
  );
}