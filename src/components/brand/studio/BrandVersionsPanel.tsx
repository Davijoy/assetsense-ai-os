import React, { useState } from "react";
import {
  History,
  Eye,
  RotateCcw,
  CheckCircle2,
  Clock,
  User,
  Tag,
  AlertCircle,
  Sparkles,
  ArrowRight,
  ShieldAlert,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  type BrandThemeVersionRecord,
  type BrandVersionSnapshot,
} from "@/lib/services/brand-version.service";

interface BrandVersionsPanelProps {
  versions: BrandThemeVersionRecord[];
  activePreviewVersionId: string | null;
  onPreviewVersion: (version: BrandThemeVersionRecord | null) => void;
  onRestoreVersion: (version: BrandThemeVersionRecord) => Promise<void>;
}

export function BrandVersionsPanel({
  versions,
  activePreviewVersionId,
  onPreviewVersion,
  onRestoreVersion,
}: BrandVersionsPanelProps) {
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [confirmRestoreVersion, setConfirmRestoreVersion] = useState<BrandThemeVersionRecord | null>(null);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const getChangeTypeBadge = (type: string) => {
    switch (type) {
      case "workspace_save":
        return { label: "Workspace Theme Save", color: "bg-blue-500/10 text-blue-400 border-blue-500/30" };
      case "experience_save":
        return { label: "Experience Save", color: "bg-purple-500/10 text-purple-400 border-purple-500/30" };
      case "workspace_reset":
        return { label: "Workspace Reset", color: "bg-amber-500/10 text-amber-400 border-amber-500/30" };
      case "experience_reset":
        return { label: "Experience Reset", color: "bg-orange-500/10 text-orange-400 border-orange-500/30" };
      case "version_restore":
        return { label: "Version Restore", color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30 font-bold" };
      default:
        return { label: "System Change", color: "bg-surface text-muted-foreground border-border" };
    }
  };

  const handleExecuteRestore = async () => {
    if (!confirmRestoreVersion) return;
    const target = confirmRestoreVersion;
    setRestoringId(target.id);
    setFeedbackMsg(null);
    try {
      await onRestoreVersion(target);
      setConfirmRestoreVersion(null);
      setFeedbackMsg({
        type: "success",
        text: `Successfully restored configuration from v${target.versionNumber}. A new version snapshot was created.`,
      });
      setTimeout(() => setFeedbackMsg(null), 4000);
    } catch (err: any) {
      setFeedbackMsg({
        type: "error",
        text: err?.message || "Failed to restore version snapshot.",
      });
    } finally {
      setRestoringId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold tracking-tight text-foreground">
            Brand Version History
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Immutable snapshot log for workspace brand themes, typography, and experience overrides. Every meaningful save or restore records an append-only audit entry.
          </p>
        </div>

        {activePreviewVersionId && (
          <button
            type="button"
            onClick={() => onPreviewVersion(null)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-1.5 text-xs font-bold text-amber-300 hover:bg-amber-500/20 transition-colors"
          >
            <span>Exit Version Preview</span>
          </button>
        )}
      </div>

      {/* Status Feedback */}
      {feedbackMsg && (
        <div
          className={cn(
            "flex items-center gap-2 rounded-lg p-3 text-xs animate-in fade-in",
            feedbackMsg.type === "success"
              ? "border border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
              : "border border-destructive/30 bg-destructive/10 text-destructive"
          )}
        >
          {feedbackMsg.type === "success" ? (
            <CheckCircle2 className="h-4 w-4 shrink-0" />
          ) : (
            <AlertCircle className="h-4 w-4 shrink-0" />
          )}
          <span>{feedbackMsg.text}</span>
        </div>
      )}

      {/* Confirmation Modal / Dialog for Restore */}
      {confirmRestoreVersion && (
        <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 space-y-3 animate-in fade-in">
          <div className="flex items-start gap-2.5">
            <ShieldAlert className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <h3 className="text-xs font-bold text-amber-300">
                Confirm Rollback to Version {confirmRestoreVersion.versionNumber}
              </h3>
              <p className="text-[11px] text-amber-200/80 mt-0.5">
                Restoring will apply the theme settings and experience overrides saved in v{confirmRestoreVersion.versionNumber}.
                An append-only new version will be created in history. Current brand asset binary files will not be deleted.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-1 border-t border-amber-500/20">
            <button
              type="button"
              onClick={() => setConfirmRestoreVersion(null)}
              disabled={Boolean(restoringId)}
              className="rounded-md border border-amber-500/30 bg-background/60 px-3 py-1.5 text-xs text-amber-200 hover:bg-background transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleExecuteRestore}
              disabled={Boolean(restoringId)}
              className="inline-flex items-center gap-1.5 rounded-md bg-amber-500 px-3.5 py-1.5 text-xs font-semibold text-zinc-950 hover:bg-amber-400 transition-colors"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>{restoringId ? "Restoring…" : `Restore v${confirmRestoreVersion.versionNumber}`}</span>
            </button>
          </div>
        </div>
      )}

      {/* Versions List */}
      {versions.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-surface/20 py-12 text-center">
          <History className="h-8 w-8 text-muted-foreground/40" />
          <div className="text-xs font-semibold text-foreground">
            No version history recorded yet
          </div>
          <p className="text-[11px] text-muted-foreground max-w-sm">
            Snapshots will be automatically created when you save workspace themes or configure experience overrides.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {versions.map((ver, idx) => {
            const badge = getChangeTypeBadge(ver.changeType);
            const isPreviewing = activePreviewVersionId === ver.id;
            const isCurrent = idx === 0;

            return (
              <div
                key={ver.id}
                className={cn(
                  "flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-xl border p-4 transition-all",
                  isPreviewing
                    ? "border-amber-500/60 bg-amber-500/[0.04] ring-1 ring-amber-500/40"
                    : isCurrent
                    ? "border-primary/60 bg-primary/[0.02]"
                    : "border-border bg-card/60 hover:bg-card"
                )}
              >
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-foreground bg-surface px-2 py-0.5 rounded border border-border">
                      v{ver.versionNumber}
                    </span>

                    <span
                      className={cn(
                        "rounded-full border px-2 py-0.5 text-[9px] font-mono",
                        badge.color
                      )}
                    >
                      {badge.label}
                    </span>

                    {isCurrent && (
                      <span className="flex items-center gap-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 text-[9px] font-bold text-emerald-400">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        CURRENT
                      </span>
                    )}

                    {ver.label && (
                      <span className="flex items-center gap-1 text-[10px] text-muted-foreground bg-background px-2 py-0.5 rounded border border-border">
                        <Tag className="h-2.5 w-2.5 text-primary" />
                        <span>{ver.label}</span>
                      </span>
                    )}
                  </div>

                  <p className="text-xs font-medium text-foreground">
                    {ver.changeSummary}
                  </p>

                  <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3 text-muted-foreground/60" />
                      <span>{new Date(ver.createdAt).toLocaleString()}</span>
                    </span>
                    {ver.createdBy && (
                      <span className="flex items-center gap-1">
                        <User className="h-3 w-3 text-muted-foreground/60" />
                        <span className="font-mono">{ver.createdBy.slice(0, 8)}…</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 self-start sm:self-center">
                  <button
                    type="button"
                    onClick={() => onPreviewVersion(isPreviewing ? null : ver)}
                    className={cn(
                      "inline-flex items-center gap-1 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                      isPreviewing
                        ? "bg-amber-500 text-zinc-950 font-bold"
                        : "border border-border bg-surface text-foreground hover:bg-surface/80"
                    )}
                  >
                    <Eye className="h-3 w-3" />
                    <span>{isPreviewing ? "Previewing" : "Preview"}</span>
                  </button>

                  {!isCurrent && (
                    <button
                      type="button"
                      onClick={() => setConfirmRestoreVersion(ver)}
                      disabled={Boolean(restoringId)}
                      className="inline-flex items-center gap-1 rounded-md border border-border bg-surface px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-surface/80 transition-colors"
                    >
                      <RotateCcw className="h-3 w-3" />
                      <span>Restore</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
