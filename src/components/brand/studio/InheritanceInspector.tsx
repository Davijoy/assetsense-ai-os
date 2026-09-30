import React from "react";
import { GitBranch, Shield, Sparkles, Building2, UserCheck, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  type InheritancePropertyItem,
  type InheritanceSource,
} from "@/lib/services/workspace-experience-theme.service";

interface InheritanceInspectorProps {
  breakdown: InheritancePropertyItem[];
  experienceLabel: string;
}

export function InheritanceInspector({
  breakdown,
  experienceLabel,
}: InheritanceInspectorProps) {
  const getBadgeStyle = (source: InheritanceSource) => {
    switch (source) {
      case "SENTINEL":
        return "bg-zinc-800/80 text-zinc-300 border-zinc-700";
      case "WORKSPACE":
        return "bg-blue-500/10 text-blue-400 border-blue-500/30";
      case "EXPERIENCE":
        return "bg-emerald-500/10 text-emerald-400 border-emerald-500/30 font-bold";
      case "ACCESSIBILITY":
        return "bg-amber-500/10 text-amber-300 border-amber-500/30 font-bold";
      default:
        return "bg-surface text-muted-foreground border-border";
    }
  };

  const getSourceIcon = (source: InheritanceSource) => {
    switch (source) {
      case "SENTINEL":
        return <Shield className="h-3 w-3 text-zinc-400" />;
      case "WORKSPACE":
        return <Building2 className="h-3 w-3 text-blue-400" />;
      case "EXPERIENCE":
        return <Sparkles className="h-3 w-3 text-emerald-400" />;
      case "ACCESSIBILITY":
        return <UserCheck className="h-3 w-3 text-amber-400" />;
    }
  };

  return (
    <div className="space-y-3 rounded-xl border border-border bg-card/60 p-4 shadow-xs">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <GitBranch className="h-4 w-4 text-primary" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
            Inheritance Inspector ({experienceLabel})
          </h3>
        </div>
        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-zinc-400" /> Sentinel
          </span>
          <span className="flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-400" /> Workspace
          </span>
          <span className="flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> Experience
          </span>
          <span className="flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-400" /> Accessibility
          </span>
        </div>
      </div>

      <p className="text-[11px] text-muted-foreground">
        Live resolution trace showing the origin source for every computed property in this experience view.
      </p>

      {/* Breakdown Table */}
      <div className="overflow-hidden rounded-lg border border-border/70 bg-background/50">
        <table className="w-full text-left text-xs">
          <thead className="border-b border-border/80 bg-surface/40 text-[10px] uppercase font-bold text-muted-foreground">
            <tr>
              <th className="px-3 py-2">Property</th>
              <th className="px-3 py-2">Effective Value</th>
              <th className="px-3 py-2">Origin Source</th>
              <th className="px-3 py-2 text-right">Workspace Base</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/40">
            {breakdown.map((item) => (
              <tr key={item.key} className="hover:bg-surface/20 transition-colors">
                <td className="px-3 py-2 font-medium text-foreground">
                  <div className="flex flex-col">
                    <span>{item.label}</span>
                    <span className="text-[9px] text-muted-foreground font-mono">{item.key}</span>
                  </div>
                </td>
                <td className="px-3 py-2 font-mono text-[11px]">
                  <div className="flex items-center gap-1.5">
                    {item.effectiveValue.startsWith("#") && (
                      <span
                        className="h-2.5 w-2.5 rounded-full border border-border/80 shrink-0"
                        style={{ backgroundColor: item.effectiveValue }}
                      />
                    )}
                    <span className="truncate max-w-[140px] text-foreground font-semibold">
                      {item.effectiveValue}
                    </span>
                  </div>
                </td>
                <td className="px-3 py-2">
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[9px] font-mono",
                      getBadgeStyle(item.source)
                    )}
                  >
                    {getSourceIcon(item.source)}
                    <span>{item.source}</span>
                  </span>
                </td>
                <td className="px-3 py-2 text-right font-mono text-[10px] text-muted-foreground">
                  <span className="truncate max-w-[120px] inline-block">
                    {item.workspaceValue}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
