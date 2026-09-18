/**
 * SENTINEL FORT — Decision Intelligence Panel (Level 4: Decision-Aware)
 *
 * Executive, compact floating surface presenting evidence-backed decision
 * intelligence for the active screen, selected property/unit, or comparative set:
 *
 *   ┌──────────────────────────────────────────────┐
 *   │  SENTINEL INTELLIGENCE              [ X ]    │
 *   │  Godrej Reserve — Tower B / Unit 1204        │
 *   │  Confidence: HIGH · Source: LIVE DATA        │
 *   │──────────────────────────────────────────────│
 *   │  KEY SIGNAL                                  │
 *   │  [ FAVOURABLE ]                              │
 *   │                                              │
 *   │  QUICK CONTEXTUAL INQUIRIES                  │
 *   │  [Is this expensive?] [Biggest risk?] [Why?] │
 *   │                                              │
 *   │  SUPPORTING & CAUTION FACTORS                │
 *   │  + East facing morning light & vastu         │
 *   │  - 4.5% floor rise premium above ground tier │
 *   │                                              │
 *   │  WHAT WE KNOW / DATA SAYS / MEANS / CONSIDER │
 *   │  ...                                         │
 *   │──────────────────────────────────────────────│
 *   │  [ Actions ] · [ Ask Supreme Intelligence ]  │
 *   └──────────────────────────────────────────────┘
 */
import { useState, useMemo } from "react";
import { Link } from "@tanstack/react-router";
import {
  X,
  Sparkles,
  ArrowUpRight,
  ChevronRight,
  Activity,
  ShieldAlert,
  TrendingUp,
  HelpCircle,
  Clock,
  Database,
  Scale,
  PlusCircle,
  MinusCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  type DecisionContext,
  signalTone,
  answerContextualQuery,
  type ContextualQueryAnswer,
} from "@/lib/decision-intelligence";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export interface DecisionPanelProps {
  context: DecisionContext;
  open: boolean;
  onClose: () => void;
  onOpenCompanion?: () => void;
  className?: string;
}

export function DecisionPanel({
  context,
  open,
  onClose,
  onOpenCompanion,
  className,
}: DecisionPanelProps) {
  const [activeAnswer, setActiveAnswer] = useState<ContextualQueryAnswer | null>(null);

  if (!open) return null;

  const tone = signalTone(context.keySignal);

  // Contextual quick questions tailored to the active context
  const quickQuestions = [
    "Is this expensive?",
    "What is the biggest risk?",
    context.comparison ? "Which is better?" : `Why ${context.keySignal.toLowerCase()}?`,
    "What should I check before deciding?",
  ];

  const handleAskQuick = (q: string) => {
    if (activeAnswer?.query === q) {
      setActiveAnswer(null);
    } else {
      const ans = answerContextualQuery(q, context);
      setActiveAnswer(ans);
    }
  };

  return (
    <div
      role="dialog"
      aria-label="Sentinel Decision Intelligence"
      className={cn(
        "fixed z-[65] w-[min(28rem,calc(100vw-2rem))] overflow-hidden rounded-2xl",
        "border border-primary/25 bg-card/95 backdrop-blur-xl shadow-2xl",
        "transition-all duration-300 ease-out animate-in fade-in-0 zoom-in-95",
        "bottom-24 right-5 sm:right-6",
        className,
      )}
    >
      {/* Top Header */}
      <div className="flex items-center justify-between border-b border-border/60 bg-muted/40 px-4 py-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Sparkles className="h-4 w-4" />
          </div>
          <div className="leading-tight">
            <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-primary">
              Sentinel Decision Intelligence
            </div>
            <div className="text-xs font-semibold text-foreground truncate max-w-[220px]">
              {context.entityName}
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close Decision Intelligence"
          className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Metadata Classification Bar */}
      <div className="flex items-center justify-between border-b border-border/40 bg-muted/20 px-4 py-1.5 text-[10px]">
        <span className="text-muted-foreground truncate max-w-[140px]">{context.module}</span>
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground/80">
            Confidence: <strong className="text-foreground">{context.confidence}</strong>
          </span>
          <span className="rounded bg-muted px-1.5 py-0.5 font-medium text-[9px] uppercase tracking-wider text-muted-foreground border border-border/40">
            {context.dataClassification}
          </span>
        </div>
      </div>

      <div className="max-h-[72vh] overflow-y-auto p-4 space-y-3.5 text-xs">
        {/* Key Decision Signal */}
        <div className="rounded-xl border border-border/60 bg-muted/25 p-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground">
              Key Signal
            </span>
            <Badge
              variant="outline"
              className={cn(
                "px-2.5 py-0.5 text-[11px] font-bold tracking-wider uppercase border",
                tone === "emerald" && "border-emerald-500/40 bg-emerald-500/10 text-emerald-400",
                tone === "amber" && "border-amber-500/40 bg-amber-500/10 text-amber-400",
                tone === "rose" && "border-rose-500/40 bg-rose-500/10 text-rose-400",
                tone === "slate" && "border-border bg-muted/40 text-muted-foreground",
              )}
            >
              {context.keySignal}
            </Badge>
          </div>
          <div className="mt-2 text-sm font-semibold text-foreground">
            {context.decision}
          </div>
          <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
            {context.why}
          </p>
        </div>

        {/* Quick Contextual Inquiries */}
        <div className="space-y-1.5">
          <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground flex items-center gap-1.5">
            <HelpCircle className="h-3 w-3 text-primary" /> Contextual Inquiries
          </div>
          <div className="flex flex-wrap gap-1.5">
            {quickQuestions.map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => handleAskQuick(q)}
                className={cn(
                  "rounded-lg border px-2.5 py-1 text-[10px] font-medium transition-colors text-left",
                  activeAnswer?.query === q
                    ? "border-primary bg-primary/15 text-primary"
                    : "border-border/60 bg-muted/20 text-muted-foreground hover:border-primary/40 hover:text-foreground",
                )}
              >
                {q}
              </button>
            ))}
          </div>

          {/* Inline Instant Answer */}
          {activeAnswer && (
            <div className="mt-2 rounded-xl border border-primary/30 bg-primary/5 p-3 space-y-2 animate-in fade-in-0 duration-200">
              <div className="flex items-center justify-between text-[10px] text-primary font-semibold uppercase tracking-wider">
                <span>{activeAnswer.interpretedIntent}</span>
                <button
                  onClick={() => setActiveAnswer(null)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
              <p className="text-[11px] leading-relaxed text-foreground">
                {activeAnswer.answer}
              </p>
              <div className="flex flex-wrap gap-2 text-[9px] text-muted-foreground border-t border-primary/20 pt-1.5">
                {activeAnswer.evidence.map((ev, i) => (
                  <span key={i} className="bg-background/50 px-1.5 py-0.5 rounded border border-border/40">
                    {ev}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Multi-Factor Comparison Dimension Matrix (if active) */}
        {context.comparison && (
          <div className="rounded-xl border border-border/60 bg-muted/20 p-3 space-y-2.5">
            <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Scale className="h-3 w-3 text-primary" /> Comparative Matrix
              </span>
              <span className="text-primary font-semibold">{context.comparison.advantage}</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-[10px]">
                <thead>
                  <tr className="border-b border-border/50 text-muted-foreground text-left">
                    <th className="pb-1 font-medium">Dimension</th>
                    <th className="pb-1 font-medium truncate max-w-[80px]">{context.comparison.entityA.name}</th>
                    <th className="pb-1 font-medium truncate max-w-[80px]">{context.comparison.entityB.name}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/30">
                  {context.comparison.dimensions.map((dim) => (
                    <tr key={dim.dimension} className="py-1">
                      <td className="py-1 text-muted-foreground font-medium">{dim.label}</td>
                      <td className={cn("py-1 font-semibold", dim.winner === "A" && "text-emerald-400")}>
                        {dim.entityAValue}
                      </td>
                      <td className={cn("py-1 font-semibold", dim.winner === "B" && "text-emerald-400")}>
                        {dim.entityBValue}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Explainable Decision Factors (Supporting [+] vs Caution [-]) */}
        {(context.factors.supporting.length > 0 || context.factors.caution.length > 0) && (
          <div className="rounded-xl border border-border/40 bg-muted/15 p-3 space-y-2">
            <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
              Decision Factors
            </div>
            <div className="space-y-1 text-[11px]">
              {context.factors.supporting.map((s, idx) => (
                <div key={idx} className="flex items-start gap-1.5 text-emerald-400/90">
                  <PlusCircle className="h-3 w-3 mt-0.5 shrink-0" />
                  <span className="leading-snug">{s}</span>
                </div>
              ))}
              {context.factors.caution.map((c, idx) => (
                <div key={idx} className="flex items-start gap-1.5 text-rose-400/90">
                  <MinusCircle className="h-3 w-3 mt-0.5 shrink-0" />
                  <span className="leading-snug">{c}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Structured Risks & Opportunities */}
        {(context.risks.length > 0 || context.opportunities.length > 0) && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[10px]">
            {context.risks[0] && (
              <div className="rounded-lg border border-rose-500/30 bg-rose-500/5 p-2.5 space-y-1">
                <div className="flex items-center gap-1 font-bold text-rose-400 uppercase tracking-wider text-[9px]">
                  <ShieldAlert className="h-3 w-3" /> {context.risks[0].category} · {context.risks[0].severity}
                </div>
                <p className="text-[10px] leading-tight text-foreground/80">{context.risks[0].description}</p>
                <div className="text-[9px] text-muted-foreground italic pt-1 border-t border-rose-500/20">
                  {context.risks[0].mitigationOrConsideration}
                </div>
              </div>
            )}
            {context.opportunities[0] && (
              <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-2.5 space-y-1">
                <div className="flex items-center gap-1 font-bold text-emerald-400 uppercase tracking-wider text-[9px]">
                  <TrendingUp className="h-3 w-3" /> {context.opportunities[0].category} · {context.opportunities[0].impact}
                </div>
                <p className="text-[10px] leading-tight text-foreground/80">{context.opportunities[0].description}</p>
              </div>
            )}
          </div>
        )}

        {/* Structured DATA */}
        {Object.keys(context.data).length > 0 && (
          <div className="rounded-xl border border-border/40 bg-muted/15 p-3">
            <div className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground mb-2 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Activity className="h-3 w-3 text-primary" /> Verified Ground Data
              </span>
              <span className="text-[9px] text-muted-foreground/70">{context.dataFreshness}</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              {Object.entries(context.data).map(([key, val]) => (
                <div key={key} className="rounded-lg bg-background/60 p-2 border border-border/40">
                  <div className="text-[10px] text-muted-foreground truncate">{key}</div>
                  <div className="font-semibold text-foreground mt-0.5 truncate">{val}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 4-Part Grounded Intelligence Framework */}
        <div className="rounded-xl border border-border/40 bg-muted/10 p-3 space-y-2.5">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-primary/90">
              What We Know
            </div>
            <p className="mt-0.5 leading-relaxed text-foreground/90">
              {context.whatWeKnow}
            </p>
          </div>
          <div className="border-t border-border/40 pt-2">
            <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
              What The Data Says
            </div>
            <p className="mt-0.5 leading-relaxed text-foreground/90">
              {context.whatTheDataSays}
            </p>
          </div>
          <div className="border-t border-border/40 pt-2">
            <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
              What It Means
            </div>
            <p className="mt-0.5 leading-relaxed text-muted-foreground">
              {context.whatItMeans}
            </p>
          </div>
          <div className="border-t border-border/40 pt-2">
            <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-amber-400/90">
              What To Consider
            </div>
            <p className="mt-0.5 leading-relaxed text-muted-foreground">
              {context.whatToConsider}
            </p>
          </div>
        </div>

        {/* Provenance Footer */}
        <div className="flex items-center justify-between text-[9px] text-muted-foreground/80 px-1">
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" /> {context.dataFreshness}
          </span>
          <span className="flex items-center gap-1 truncate max-w-[200px]" title={context.dataProvenance}>
            <Database className="h-3 w-3" /> {context.dataProvenance}
          </span>
        </div>

        {/* Contextual Actions */}
        {context.actions.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-1">
            {context.actions.map((act) =>
              act.to ? (
                <Button
                  key={act.label}
                  size="sm"
                  variant={act.tone === "primary" ? "default" : "outline"}
                  className={cn(
                    "h-8 text-xs flex-1 min-w-[120px]",
                    act.tone === "primary" ? "bg-primary text-primary-foreground hover:bg-primary/90" : "",
                  )}
                  asChild
                  onClick={onClose}
                >
                  <Link to={act.to}>
                    {act.label} <ArrowUpRight className="ml-1 h-3 w-3" />
                  </Link>
                </Button>
              ) : (
                <Button
                  key={act.label}
                  size="sm"
                  variant="outline"
                  className="h-8 text-xs flex-1"
                  onClick={onClose}
                >
                  {act.label}
                </Button>
              ),
            )}
          </div>
        )}

        {/* Optional Deep Inquiry Toggle */}
        {onOpenCompanion && (
          <div className="border-t border-border/50 pt-2 text-center">
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenCompanion();
              }}
              className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline font-medium"
            >
              Ask Supreme Intelligence <ChevronRight className="h-3 w-3" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
