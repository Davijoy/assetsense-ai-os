import React from "react";
import { Monitor, Tablet, Smartphone, Sparkles, LayoutDashboard, Briefcase, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ThemePreset } from "@/lib/theme.manager";

export type ViewportMode = "desktop" | "tablet" | "mobile";
export type PreviewMode = "fort" | "crm" | "leads";

interface PreviewToolbarProps {
  viewport: ViewportMode;
  onViewportChange: (viewport: ViewportMode) => void;
  previewMode: PreviewMode;
  onPreviewModeChange: (mode: PreviewMode) => void;
  activeTheme: ThemePreset;
}

export function PreviewToolbar({
  viewport,
  onViewportChange,
  previewMode,
  onPreviewModeChange,
  activeTheme,
}: PreviewToolbarProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-card/60 px-4 py-2.5 backdrop-blur-sm rounded-t-xl">
      {/* Mode Switcher */}
      <div className="flex items-center gap-1">
        <span className="mr-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          Surface:
        </span>
        <button
          type="button"
          onClick={() => onPreviewModeChange("fort")}
          className={cn(
            "flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
            previewMode === "fort"
              ? "bg-primary/20 text-primary border border-primary/30 font-semibold"
              : "text-muted-foreground hover:bg-surface hover:text-foreground"
          )}
        >
          <Sparkles className="h-3 w-3" />
          Fort
        </button>
        <button
          type="button"
          onClick={() => onPreviewModeChange("crm")}
          className={cn(
            "flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
            previewMode === "crm"
              ? "bg-primary/20 text-primary border border-primary/30 font-semibold"
              : "text-muted-foreground hover:bg-surface hover:text-foreground"
          )}
        >
          <LayoutDashboard className="h-3 w-3" />
          CRM
        </button>
        <button
          type="button"
          onClick={() => onPreviewModeChange("leads")}
          className={cn(
            "flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
            previewMode === "leads"
              ? "bg-primary/20 text-primary border border-primary/30 font-semibold"
              : "text-muted-foreground hover:bg-surface hover:text-foreground"
          )}
        >
          <Users className="h-3 w-3" />
          Leads
        </button>
      </div>

      {/* Viewport Width Switcher */}
      <div className="flex items-center gap-1 bg-background/80 p-0.5 rounded-lg border border-border">
        <button
          type="button"
          onClick={() => onViewportChange("desktop")}
          title="Desktop view"
          className={cn(
            "flex items-center justify-center rounded p-1.5 transition-colors",
            viewport === "desktop"
              ? "bg-card text-foreground shadow-xs"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Monitor className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={() => onViewportChange("tablet")}
          title="Tablet view"
          className={cn(
            "flex items-center justify-center rounded p-1.5 transition-colors",
            viewport === "tablet"
              ? "bg-card text-foreground shadow-xs"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Tablet className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={() => onViewportChange("mobile")}
          title="Mobile view"
          className={cn(
            "flex items-center justify-center rounded p-1.5 transition-colors",
            viewport === "mobile"
              ? "bg-card text-foreground shadow-xs"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Smartphone className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
