import { ReactNode } from "react";
import { Nav } from "@/components/landing/Nav";
import { Footer } from "@/components/landing/Footer";

type Props = {
  eyebrow?: string;
  title: string;
  lead?: string;
  children: ReactNode;
};

export function PageShell({ eyebrow, title, lead, children }: Props) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Nav />
      <main className="pt-28 pb-24">
        <div className="mx-auto max-w-5xl px-6">
          <header className="border-b border-gold/20 pb-10">
            {eyebrow ? (
              <div className="text-[11px] uppercase tracking-[0.28em] text-gold/80">{eyebrow}</div>
            ) : null}
            <h1 className="mt-3 font-display text-4xl sm:text-5xl leading-tight">{title}</h1>
            {lead ? (
              <p className="mt-4 max-w-3xl text-base text-muted-foreground">{lead}</p>
            ) : null}
          </header>
          <div className="mt-12 space-y-10 text-sm leading-relaxed text-muted-foreground [&_h2]:font-display [&_h2]:text-foreground [&_h2]:text-2xl [&_h2]:mt-10 [&_h2]:mb-3 [&_h3]:text-foreground [&_h3]:font-medium [&_h3]:text-base [&_h3]:mt-6 [&_h3]:mb-2 [&_p]:leading-relaxed [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:space-y-1.5 [&_a]:text-gold [&_a:hover]:underline">
            {children}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}