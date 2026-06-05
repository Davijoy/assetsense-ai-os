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

type Variant = "light" | "dark";

function BrandingSettings() {
  const { logoUrl, logoUrlDark, setLogos, loading } = useBranding();
  const [previews, setPreviews] = useState<{ light: string | null; dark: string | null }>({
    light: null,
    dark: null,
  });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const lightInput = useRef<HTMLInputElement>(null);
  const darkInput = useRef<HTMLInputElement>(null);

  const currentLight = previews.light ?? logoUrl ?? shieldAsset.url;
  const currentDark = previews.dark ?? logoUrlDark ?? logoUrl ?? shieldAsset.url;

  const handleFile = (variant: Variant, file: File) => {
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
    reader.onload = () => setPreviews((p) => ({ ...p, [variant]: reader.result as string }));
    reader.readAsDataURL(file);
  };

  const save = async () => {
    if (!previews.light && !previews.dark) return;
    setSaving(true);
    await setLogos({
      ...(previews.light !== null ? { logoUrl: previews.light } : {}),
      ...(previews.dark !== null ? { logoUrlDark: previews.dark } : {}),
    });
    setSaving(false);
    setSaved(true);
    setPreviews({ light: null, dark: null });
  };

  const reset = async () => {
    setSaving(true);
    await setLogos({ logoUrl: null, logoUrlDark: null });
    setPreviews({ light: null, dark: null });
    setSaving(false);
    setSaved(true);
  };

  const dirty = previews.light !== null || previews.dark !== null;

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <header>
        <p className="text-xs uppercase tracking-[0.22em] text-gold/80">Admin · Branding</p>
        <h1 className="mt-2 font-display text-3xl">Tenant Logo</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Upload separate light and dark variants so the mark stays legible on every surface.
          Applied instantly to the navbar, footer, and sidebar.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-2">
        <UploadCard
          variant="light"
          label="Light theme logo"
          hint="Use a dark mark — shown on white / light surfaces."
          src={currentLight}
          inputRef={lightInput}
          onPick={(f) => handleFile("light", f)}
          surface="light"
        />
        <UploadCard
          variant="dark"
          label="Dark theme logo"
          hint="Use a light mark — shown on the app's dark surfaces."
          src={currentDark}
          inputRef={darkInput}
          onPick={(f) => handleFile("dark", f)}
          surface="dark"
        />
      </div>

      {error && <p className="text-xs text-destructive">{error}</p>}

      <div className="flex flex-wrap items-center gap-3 border-t border-border pt-6">
        <button
          onClick={save}
          disabled={!dirty || saving}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-glow hover:bg-primary/90 disabled:opacity-50"
        >
          <Check className="h-4 w-4" />
          {saving ? "Saving…" : "Save changes"}
        </button>
        <button
          onClick={reset}
          disabled={saving || loading}
          className="inline-flex items-center gap-2 rounded-md border border-border px-4 py-2 text-sm hover:bg-surface disabled:opacity-50"
        >
          <RotateCcw className="h-4 w-4" />
          Reset both to default
        </button>
        {saved && <span className="text-xs text-emerald-400">Saved & applied across the app.</span>}
      </div>
    </div>
  );
}

function UploadCard({
  label,
  hint,
  src,
  inputRef,
  onPick,
  surface,
}: {
  variant: Variant;
  label: string;
  hint: string;
  src: string;
  inputRef: React.RefObject<HTMLInputElement | null>;
  onPick: (file: File) => void;
  surface: "light" | "dark";
}) {
  const surfaceClass =
    surface === "light"
      ? "bg-white text-zinc-900 border-zinc-200"
      : "bg-zinc-950 text-zinc-100 border-zinc-800";
  return (
    <section className="rounded-xl border border-border bg-surface/40 p-6">
      <h2 className="text-sm font-medium">{label}</h2>
      <p className="mt-1 text-xs text-muted-foreground">{hint}</p>

      <div className={`mt-4 flex h-40 items-center justify-center rounded-lg border ${surfaceClass}`}>
        <img src={src} alt={`${label} preview`} className="h-20 w-20 object-contain" />
      </div>

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-background/50 px-6 py-3 text-sm text-muted-foreground transition-colors hover:border-primary/60 hover:text-foreground"
      >
        <Upload className="h-4 w-4" />
        Choose file
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onPick(f);
          e.target.value = "";
        }}
      />
      <p className="mt-2 text-[11px] text-muted-foreground">PNG, JPG, SVG, WebP — max 500 KB.</p>
    </section>
  );
}