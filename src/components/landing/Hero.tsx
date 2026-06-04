import { Button } from "@/components/ui/button";
import { ArrowRight, Play, Sparkles } from "lucide-react";
import heroImg from "@/assets/hero-dashboard.jpg";

export function Hero() {
  return (
    <section className="relative overflow-hidden pt-32 pb-24" style={{ background: "var(--gradient-hero)" }}>
      <div className="absolute inset-0 bg-grid pointer-events-none" />
      <div className="relative mx-auto max-w-7xl px-6">
        <div className="mx-auto max-w-4xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-surface/60 px-4 py-1.5 text-xs text-muted-foreground backdrop-blur">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            <span>AI-powered Real Estate Intelligence Ecosystem</span>
          </div>
          <h1 className="mt-8 font-display text-5xl leading-[1.05] sm:text-6xl md:text-7xl lg:text-8xl">
            India's <em className="text-gradient-emerald not-italic">Intelligent</em>
            <br /> Real Estate <span className="italic">Operating System</span>
          </h1>
          <p className="mx-auto mt-8 max-w-2xl text-lg text-muted-foreground leading-relaxed">
            Manage properties, leads, customers, marketing, sales and intelligence —
            from one premium, AI-native platform built for developers, brokers and enterprises.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Button size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-glow h-12 px-7">
              Start Free Trial <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <Button size="lg" variant="outline" className="h-12 px-7 border-border bg-surface/50 backdrop-blur hover:bg-surface">
              <Play className="mr-2 h-4 w-4" /> Book a Demo
            </Button>
          </div>
          <p className="mt-6 text-xs text-muted-foreground">
            No credit card required · 14-day trial · Enterprise-grade security
          </p>
        </div>

        <div className="relative mx-auto mt-20 max-w-6xl">
          <div className="absolute -inset-x-20 -inset-y-10 bg-gradient-to-b from-primary/20 to-transparent blur-3xl opacity-50" />
          <div className="relative rounded-2xl border border-border bg-surface/40 p-2 backdrop-blur shadow-elevated">
            <img
              src={heroImg}
              alt="Sentinel Fort Group intelligence dashboard preview"
              width={1600}
              height={1200}
              className="rounded-xl w-full h-auto"
            />
          </div>
        </div>

        <div className="mt-20 grid grid-cols-2 gap-8 border-t border-border pt-12 md:grid-cols-4">
          {[
            ["10K+", "Properties listed"],
            ["500+", "Developers"],
            ["2.5M", "Leads processed"],
            ["98%", "AI accuracy"],
          ].map(([n, l]) => (
            <div key={l} className="text-center">
              <div className="font-display text-4xl text-gradient-emerald md:text-5xl">{n}</div>
              <div className="mt-2 text-sm text-muted-foreground">{l}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}