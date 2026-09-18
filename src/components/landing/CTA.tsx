import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

export function CTA() {
  return (
    <section id="contact" className="relative py-32">
      <div className="mx-auto max-w-5xl px-6">
        <div className="relative overflow-hidden rounded-3xl border border-primary/30 bg-gradient-to-br from-surface to-surface-elevated p-12 md:p-20 shadow-elevated">
          <div className="absolute inset-0 bg-grid opacity-30" />
          <div className="absolute -top-32 -right-32 h-96 w-96 rounded-full bg-primary/20 blur-3xl" />
          <div className="relative text-center">
            <h2 className="font-display text-5xl md:text-6xl">
              Ready to run your real estate business <em className="text-gradient-emerald not-italic">intelligently?</em>
            </h2>
            <p className="mx-auto mt-6 max-w-xl text-lg text-muted-foreground">
              Join leading developers and brokerages already operating on Sentinel Fort Group.
            </p>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
              <Button asChild size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-glow h-12 px-7">
                <Link to="/contact">
                  Book a Demo <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="h-12 px-7 border-border bg-background/50 hover:bg-background">
                <Link to="/auth" search={{ next: "/fort" }}>
                  Start Free Trial
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}