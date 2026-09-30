import React, { useRef, useState, useEffect } from "react";
import { Upload, RotateCcw, Check, AlertCircle, Trash2, Info, Shield } from "lucide-react";
import { useBranding } from "@/components/brand/BrandingContext";
import { DEFAULT_SENTINEL_LOGO } from "@/components/brand/Logo";
import { SpartanShieldIcon } from "@/components/sentinel/FortEmblem";
import { uploadAndSaveLogo } from "@/lib/services/branding.service";

const MAX_BYTES = 2_000_000; // 2 MB

type Variant = "light" | "dark";

interface BrandIdentityPanelProps {
  onLogoChange?: (variant: Variant, url: string | null) => void;
}

export function BrandIdentityPanel({ onLogoChange }: BrandIdentityPanelProps) {
  const { logoUrl, logoUrlDark, workspaceId, setLogos, resetToDefault, loading } = useBranding();
  const [stagedFiles, setStagedFiles] = useState<{ light: File | null; dark: File | null }>({
    light: null,
    dark: null,
  });
  const [previews, setPreviews] = useState<{ light: string | null; dark: string | null }>({
    light: null,
    dark: null,
  });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const lightInput = useRef<HTMLInputElement>(null);
  const darkInput = useRef<HTMLInputElement>(null);

  // Clean up object URLs
  useEffect(() => {
    return () => {
      if (previews.light && previews.light.startsWith("blob:")) URL.revokeObjectURL(previews.light);
      if (previews.dark && previews.dark.startsWith("blob:")) URL.revokeObjectURL(previews.dark);
    };
  }, [previews.light, previews.dark]);

  const currentLight = previews.light ?? logoUrl ?? DEFAULT_SENTINEL_LOGO;
  const currentDark = previews.dark ?? logoUrlDark ?? logoUrl ?? DEFAULT_SENTINEL_LOGO;

  const handleFile = (variant: Variant, file: File) => {
    setError(null);
    setSaved(false);
    if (!file.type.startsWith("image/")) {
      setError("Please upload an image file (PNG, JPG, SVG, WebP).");
      return;
    }
    if (file.size > MAX_BYTES) {
      setError(`Logo must be under ${Math.round(MAX_BYTES / 1_000_000)} MB. Yours is ${(file.size / 1_000_000).toFixed(2)} MB.`);
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    setStagedFiles((prev) => ({ ...prev, [variant]: file }));
    setPreviews((prev) => ({ ...prev, [variant]: objectUrl }));
    if (onLogoChange) onLogoChange(variant, objectUrl);
  };

  const save = async () => {
    if (!stagedFiles.light && !stagedFiles.dark) return;
    setSaving(true);
    setError(null);

    try {
      const uploadResults: { logoUrl?: string; logoUrlDark?: string } = {};

      if (stagedFiles.light) {
        const publicUrl = await uploadAndSaveLogo(stagedFiles.light, "light", workspaceId);
        uploadResults.logoUrl = publicUrl;
      }
      if (stagedFiles.dark) {
        const publicUrl = await uploadAndSaveLogo(stagedFiles.dark, "dark", workspaceId);
        uploadResults.logoUrlDark = publicUrl;
      }

      await setLogos({
        ...uploadResults,
        workspaceId,
      });

      setSaved(true);
      setStagedFiles({ light: null, dark: null });
      setPreviews({ light: null, dark: null });
    } catch (err: any) {
      console.error("[BrandIdentityPanel] Save failed:", err);
      setError(err?.message || "Failed to upload logo to storage and save settings.");
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveVariant = async (variant: Variant) => {
    setSaving(true);
    setError(null);
    try {
      if (variant === "light") {
        setStagedFiles((prev) => ({ ...prev, light: null }));
        setPreviews((prev) => ({ ...prev, light: null }));
        await setLogos({ logoUrl: null, workspaceId });
        if (onLogoChange) onLogoChange("light", null);
      } else {
        setStagedFiles((prev) => ({ ...prev, dark: null }));
        setPreviews((prev) => ({ ...prev, dark: null }));
        await setLogos({ logoUrlDark: null, workspaceId });
        if (onLogoChange) onLogoChange("dark", null);
      }
      setSaved(true);
    } catch (err: any) {
      setError(err?.message || "Failed to remove logo.");
    } finally {
      setSaving(false);
    }
  };

  const resetAll = async () => {
    setSaving(true);
    setError(null);
    try {
      await resetToDefault(workspaceId);
      setStagedFiles({ light: null, dark: null });
      setPreviews({ light: null, dark: null });
      if (onLogoChange) {
        onLogoChange("light", null);
        onLogoChange("dark", null);
      }
      setSaved(true);
    } catch (err: any) {
      console.error("[BrandIdentityPanel] Reset failed:", err);
      setError(err?.message || "Failed to reset branding.");
    } finally {
      setSaving(false);
    }
  };

  const dirty = stagedFiles.light !== null || stagedFiles.dark !== null;
  const hasCustomLogo = Boolean(logoUrl || logoUrlDark || stagedFiles.light || stagedFiles.dark);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-base font-semibold tracking-tight text-foreground">
          Workspace Brand Marks
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Upload distinct light and dark marks to maintain high legibility across executive dashboards,
          sidebar navigation, and exported assets. Stored securely in Supabase Storage.
        </p>
      </div>

      {/* Upload Cards Grid */}
      <div className="grid gap-4 sm:grid-cols-2">
        {/* Light Theme Logo Card */}
        <section className="rounded-xl border border-border bg-card/60 p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-foreground">Light Theme Mark</h3>
              {(logoUrl || stagedFiles.light) && (
                <button
                  type="button"
                  onClick={() => handleRemoveVariant("light")}
                  title="Remove light mark"
                  className="text-[10px] text-muted-foreground hover:text-destructive flex items-center gap-1 transition-colors"
                >
                  <Trash2 className="h-3 w-3" />
                  <span>Remove</span>
                </button>
              )}
            </div>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              Dark mark for light-mode header and documentation surfaces.
            </p>

            <div className="mt-3 flex h-32 items-center justify-center rounded-lg border border-zinc-200 bg-white p-3 shadow-inner">
              <img src={currentLight} alt="Light logo preview" className="h-16 w-auto max-w-full object-contain" />
            </div>
          </div>

          <div className="mt-4">
            <button
              type="button"
              onClick={() => lightInput.current?.click()}
              className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-border bg-background/60 px-3 py-2 text-xs font-medium text-muted-foreground hover:border-primary/60 hover:text-foreground transition-colors"
            >
              <Upload className="h-3.5 w-3.5" />
              <span>Choose Light Logo</span>
            </button>
            <input
              ref={lightInput}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFile("light", f);
                e.target.value = "";
              }}
            />
          </div>
        </section>

        {/* Dark Theme Logo Card */}
        <section className="rounded-xl border border-border bg-card/60 p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-foreground">Dark Theme Mark</h3>
              {(logoUrlDark || stagedFiles.dark) && (
                <button
                  type="button"
                  onClick={() => handleRemoveVariant("dark")}
                  title="Remove dark mark"
                  className="text-[10px] text-muted-foreground hover:text-destructive flex items-center gap-1 transition-colors"
                >
                  <Trash2 className="h-3 w-3" />
                  <span>Remove</span>
                </button>
              )}
            </div>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              Light or gold mark for primary obsidian command surfaces.
            </p>

            <div className="mt-3 flex h-32 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-950 p-3 shadow-inner">
              <img src={currentDark} alt="Dark logo preview" className="h-16 w-auto max-w-full object-contain" />
            </div>
          </div>

          <div className="mt-4">
            <button
              type="button"
              onClick={() => darkInput.current?.click()}
              className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-border bg-background/60 px-3 py-2 text-xs font-medium text-muted-foreground hover:border-primary/60 hover:text-foreground transition-colors"
            >
              <Upload className="h-3.5 w-3.5" />
              <span>Choose Dark Logo</span>
            </button>
            <input
              ref={darkInput}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFile("dark", f);
                e.target.value = "";
              }}
            />
          </div>
        </section>
      </div>

      {/* Default Brand Fallback Banner */}
      <div className="flex items-center justify-between rounded-xl border border-border bg-card/40 p-3.5">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface border border-border">
            <SpartanShieldIcon size={20} showStar={false} />
          </div>
          <div>
            <div className="text-xs font-semibold text-foreground">
              {hasCustomLogo ? "Custom Workspace Brand Active" : "Default Sentinel Fort Shield Active"}
            </div>
            <div className="text-[10px] text-muted-foreground">
              {hasCustomLogo
                ? "Custom logos override default Sentinel headers across this workspace."
                : "No custom logo configured — system automatically falls back to default Sentinel marks."}
            </div>
          </div>
        </div>
      </div>

      {/* Brand Identity Metadata Info Box */}
      <div className="rounded-xl border border-border/80 bg-background/50 p-3.5 space-y-2">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
          <Info className="h-3.5 w-3.5 text-primary shrink-0" />
          <span>Workspace Organization Metadata</span>
        </div>
        <p className="text-[11px] text-muted-foreground leading-relaxed">
          Organization name, public identifier, and workspace entity definitions are managed via Workspace Administration.
          Extended brand identity fields (taglines, legal entity titles, and custom seal watermarks) will be available in Phase 2B.
        </p>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-wrap items-center gap-3 border-t border-border pt-4">
        <button
          type="button"
          onClick={save}
          disabled={!dirty || saving}
          className="inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow-glow hover:bg-primary/90 disabled:opacity-50 transition-colors"
        >
          <Check className="h-3.5 w-3.5" />
          {saving ? "Uploading & saving…" : "Save logo changes"}
        </button>
        <button
          type="button"
          onClick={resetAll}
          disabled={saving || loading}
          className="inline-flex items-center gap-1.5 rounded-md border border-border px-3.5 py-2 text-xs font-medium text-foreground hover:bg-surface disabled:opacity-50 transition-colors"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Reset both to Sentinel default
        </button>
        {saved && (
          <span className="text-xs text-emerald-400 font-medium animate-in fade-in">
            ✓ Changes saved to Supabase Storage & applied across workspace.
          </span>
        )}
      </div>
    </div>
  );
}
