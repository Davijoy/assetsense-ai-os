export function Footer() {
  const cols = [
    { h: "Product", l: ["CRM","ERP","Marketplace","AI Voice","Marketing Cloud","BI"] },
    { h: "Solutions", l: ["Developers","Brokers","Channel Partners","Enterprises"] },
    { h: "Company", l: ["About","Careers","Press","Contact"] },
    { h: "Legal", l: ["Privacy","Terms","Security","DPA"] },
  ];
  return (
    <footer className="border-t border-border bg-surface/30 py-16">
      <div className="mx-auto max-w-7xl px-6">
        <div className="grid gap-12 lg:grid-cols-[2fr_3fr]">
          <div>
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-md bg-gradient-to-br from-primary to-emerald-glow shadow-glow" />
              <span className="font-display text-2xl">Assetsense</span>
            </div>
            <p className="mt-4 max-w-sm text-sm text-muted-foreground">
              Where Real Estate Meets Intelligence. India's intelligent real estate operating system.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
            {cols.map((c) => (
              <div key={c.h}>
                <div className="text-sm font-medium text-foreground">{c.h}</div>
                <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
                  {c.l.map((x) => <li key={x}><a href="#" className="hover:text-foreground transition-colors">{x}</a></li>)}
                </ul>
              </div>
            ))}
          </div>
        </div>
        <div className="mt-16 flex flex-wrap items-center justify-between gap-4 border-t border-border pt-8 text-xs text-muted-foreground">
          <div>© {new Date().getFullYear()} Assetsense. All rights reserved.</div>
          <div>Built for India's real estate industry.</div>
        </div>
      </div>
    </footer>
  );
}