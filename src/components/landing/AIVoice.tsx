import { PhoneCall, Mic, BrainCircuit, CheckCircle2 } from "lucide-react";

export function AIVoice() {
  return (
    <section id="ai-voice" className="relative py-32">
      <div className="mx-auto grid max-w-7xl gap-16 px-6 lg:grid-cols-2 lg:items-center">
        <div>
          <p className="text-sm uppercase tracking-[0.2em] text-primary">AI Voice Agents</p>
          <h2 className="mt-4 font-display text-5xl md:text-6xl">
            Calls that <em>qualify themselves.</em>
          </h2>
          <p className="mt-6 text-lg text-muted-foreground">
            Launch autonomous voice campaigns that speak naturally, qualify intent,
            schedule site visits and hand-off warm leads to your sales team —
            with full transcripts, sentiment and summaries.
          </p>
          <ul className="mt-8 space-y-3">
            {["Natural multi-lingual conversations","Real-time sentiment & intent scoring","Auto-schedules site visits in CRM","Call recordings, summaries & analytics"].map((t) => (
              <li key={t} className="flex items-center gap-3 text-foreground">
                <CheckCircle2 className="h-5 w-5 text-primary" />
                {t}
              </li>
            ))}
          </ul>
        </div>

        <div className="relative">
          <div className="absolute -inset-6 bg-gradient-to-tr from-primary/20 to-transparent blur-3xl" />
          <div className="relative rounded-2xl border border-border bg-surface/60 p-6 backdrop-blur shadow-elevated">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/20 text-primary">
                  <PhoneCall className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-sm text-foreground">Campaign · Prestige Lakeside</div>
                  <div className="text-xs text-muted-foreground">Live · 142 calls in progress</div>
                </div>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-primary">
                <span className="h-2 w-2 rounded-full bg-primary animate-pulse" /> LIVE
              </div>
            </div>

            <div className="mt-6 grid grid-cols-3 gap-4">
              {[["1,284","Calls made"],["812","Answered"],["236","Qualified"]].map(([n,l]) => (
                <div key={l} className="rounded-xl border border-border bg-background/60 p-4">
                  <div className="font-display text-3xl text-gradient-emerald">{n}</div>
                  <div className="mt-1 text-xs text-muted-foreground">{l}</div>
                </div>
              ))}
            </div>

            <div className="mt-6 rounded-xl border border-border bg-background/60 p-4">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Mic className="h-3.5 w-3.5 text-primary" /> Live transcript · Lead #2841
              </div>
              <p className="mt-3 text-sm leading-relaxed text-foreground/90">
                "Yes, I'm looking for a 3 BHK in Whitefield, budget around 2 crore.
                Can we visit this Saturday morning?"
              </p>
              <div className="mt-4 flex items-center gap-3 text-xs">
                <span className="rounded-full bg-primary/15 px-3 py-1 text-primary">Intent: High</span>
                <span className="rounded-full bg-primary/15 px-3 py-1 text-primary">Budget: ₹2 Cr</span>
                <span className="rounded-full bg-primary/15 px-3 py-1 text-primary flex items-center gap-1"><BrainCircuit className="h-3 w-3"/> Score 94</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}