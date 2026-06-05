import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { Upload, RotateCcw, Check } from "lucide-react";
import { useBranding } from "@/components/brand/BrandingContext";
import shieldAsset from "@/assets/sentinel-shield.png.asset.json";

export const Route = createFileRoute("/app/settings/branding")({
  head: () => ({ meta: [{ title: "Branding — Sentinel Fort Group" }] }),
  component: BrandingSettings,
});

const MAX_BYTES = 500_000; // 500 KB

function BrandingSettings() {
  const { logoUrl, setLogoUrl, loading } = useBranding();
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const current = preview ?? logoUrl ?? shieldAsset.url;

  const handleFile = (file: File) => {
    setError(null);
    setSaved(false);
    if (!file.type.startsWith("image/")) {
      setError("Please upload an image file (PNG, JPG, SVG, WebP).");
      return;
    }
    if (file.size > MAX_BYTES) {
      setError(`Logo must be under ${MAX_BYTES / 1000} KB. Yours is ${Math.round(file.size / 1000)} KB.`);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const save = async () => {
    if (!preview) return;
    setSaving(true);
    await setLogoUrl(preview);
    setSaving(false);
    setSaved(true);
    setPreview(null);
  };

  const reset = async () => {
    setSaving(true);
    await setLogoUrl(null);
    setPreview(null);
    setSaving(false);
    setSaved(true);
  };

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <header>
        <p className="text-xs uppercase tracking-[0.22em] text-gold/80">Admin · Branding</p>
        <h1 className="mt-2 font-display text-3xl">Tenant Logo</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Upload a custom logo for your workspace. Applied instantly to the navbar, footer, and sidebar.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl border border-border bg-surface/40 p-6">
          <h2 className="text-sm font-medium">Upload</h2>
          <p className="mt-1 text-xs text-muted-foreground">PNG, JPG, SVG or WebP — max 500 KB. Square 1:1 recommended.</p>

          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="mt-4 flex w-full flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-background/50 px-6 py-10 text-sm text-muted-foreground transition-colors hover:border-primary/60 hover:text-foreground"
          >
            <Upload className="h-5 w-5" />
            Choose file
          </button>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
              e.target.value = "";
            }}
          />

          {error && <p className="mt-3 text-xs text-destructive">{error}</p>}

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button
              onClick={save}
              disabled={!preview || saving}
              className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-glow hover:bg-primary/90 disabled:opacity-50"
            >
              <Check className="h-4 w-4" />
              {saving ? "Saving…" : "Save logo"}
            </button>
            <button
              onClick={reset}
              disabled={saving || loading}
              className="inline-flex items-center gap-2 rounded-md border border-border px-4 py-2 text-sm hover:bg-surface disabled:opacity-50"
            >
              <RotateCcw className="h-4 w-4" />
              Reset to default
            </button>
            {saved && <span className="text-xs text-emerald-400">Saved & applied across the app.</span>}
          </div>
        </section>

        <section className="rounded-xl border border-border bg-surface/40 p-6">
          <h2 className="text-sm font-medium">Live preview</h2>
          <div className="mt-4 space-y-4">
            <div className="rounded-lg border border-border bg-background p-6">
              <p className="mb-3 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Mark</p>
              <img src={current} alt="Logo preview" className="h-20 w-20 object-contain" />
            </div>
            <div className="rounded-lg border border-border bg-background p-6">
              <p className="mb-3 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Wordmark</p>
              <div className="flex items-center gap-2">
                <img src={current} alt="" className="h-7 w-7 object-contain" />
                <div className="flex flex-col leading-none">
                  <span className="font-display text-xl tracking-tight">Sentinel Fort</span>
                  <span className="text-[9px] uppercase tracking-[0.22em] text-gold/80">Group</span>
                </div>
              </div>
            </div>
            <div className="rounded-lg border border-border bg-sidebar p-4">
              <p className="mb-3 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Sidebar header</p>
              <div className="flex items-center gap-2">
                <img src={current} alt="" className="h-7 w-7 object-contain" />
                <span className="font-display text-lg">Sentinel Fort</span>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}