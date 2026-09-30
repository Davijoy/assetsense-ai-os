import React, { useState, useEffect, useRef } from "react";
import {
  Layers,
  Upload,
  Trash2,
  CheckCircle2,
  FileImage,
  Sparkles,
  AlertCircle,
  ExternalLink,
  Info,
  Globe,
  Shield,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  type BrandAssetRecord,
  type BrandAssetCategory,
  uploadBrandAsset,
  loadBrandAssets,
  setActiveAsset,
  deleteBrandAsset,
} from "@/lib/services/brand-assets.service";
import { setRuntimeFavicon } from "@/lib/favicon.manager";

interface BrandAssetLibraryPanelProps {
  workspaceId: string | null;
  onFaviconChange?: (url: string | null) => void;
}

const CATEGORIES: { id: BrandAssetCategory; label: string; description: string }[] = [
  { id: "logos", label: "Logos & Marks", description: "High-resolution vector marks, lockups, and emblem variants." },
  { id: "favicons", label: "Favicons & App Icons", description: "Browser tab icons (.ico, .png, .svg) and mobile bookmarks." },
  { id: "backgrounds", label: "Backgrounds & Textures", description: "Atmospheric ambient backdrops, obsidian grid textures, and luxury patterns." },
  { id: "watermarks", label: "Watermarks & Seals", description: "Subtle translucent security watermarks and document seal overlays." },
  { id: "seals", label: "Executive Seals", description: "High-prestige verified investor and sovereign authority stamps." },
  { id: "social", label: "Social Cards (OG)", description: "Open Graph preview banners (1200x630) for deal rooms and public links." },
];

export function BrandAssetLibraryPanel({
  workspaceId,
  onFaviconChange,
}: BrandAssetLibraryPanelProps) {
  const [activeCategory, setActiveCategory] = useState<BrandAssetCategory>("favicons");
  const [assets, setAssets] = useState<BrandAssetRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchAssets = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await loadBrandAssets(workspaceId, activeCategory);
      setAssets(data);
    } catch (err: any) {
      console.error("[BrandAssetLibraryPanel] Failed to load assets:", err);
      setError("Failed to load brand assets.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssets();
  }, [workspaceId, activeCategory]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";

    setUploading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const created = await uploadBrandAsset(file, activeCategory, file.name, workspaceId);
      setAssets((prev) => [created, ...prev]);
      setSuccessMsg(`Uploaded ${file.name} successfully.`);
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setError(err?.message || "Asset upload failed.");
    } finally {
      setUploading(false);
    }
  };

  const handleSetActive = async (asset: BrandAssetRecord) => {
    try {
      await setActiveAsset(asset.id, asset.asset_type, workspaceId);
      setAssets((prev) =>
        prev.map((a) => ({
          ...a,
          is_active: a.id === asset.id,
        }))
      );

      if (asset.asset_type === "favicons") {
        setRuntimeFavicon(asset.public_url);
        if (onFaviconChange) onFaviconChange(asset.public_url);
      }

      setSuccessMsg(`Activated "${asset.name}" as active ${asset.asset_type.slice(0, -1)}.`);
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setError(err?.message || "Failed to set asset as active.");
    }
  };

  const handleDelete = async (asset: BrandAssetRecord) => {
    try {
      await deleteBrandAsset(asset.id, asset.storage_path, workspaceId);
      setAssets((prev) => prev.filter((a) => a.id !== asset.id));
      if (asset.is_active && asset.asset_type === "favicons") {
        setRuntimeFavicon(null);
        if (onFaviconChange) onFaviconChange(null);
      }
      setSuccessMsg(`Deleted "${asset.name}".`);
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setError(err?.message || "Failed to delete asset.");
    }
  };

  const activeCategoryMeta = CATEGORIES.find((c) => c.id === activeCategory)!;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-base font-semibold tracking-tight text-foreground">
          Brand Asset Library
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Manage workspace-scoped logos, favicons, watermarks, seals, and social banners. Stored in isolated Supabase Storage paths with enterprise RBAC.
        </p>
      </div>

      {/* Category Navigation Pills */}
      <div className="flex flex-wrap gap-1.5 border-b border-border pb-3">
        {CATEGORIES.map((cat) => {
          const isSelected = activeCategory === cat.id;
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => setActiveCategory(cat.id)}
              className={cn(
                "rounded-lg px-3 py-1.5 text-xs font-medium transition-all",
                isSelected
                  ? "bg-primary text-primary-foreground font-bold shadow-xs"
                  : "bg-surface/60 text-muted-foreground hover:bg-surface hover:text-foreground"
              )}
            >
              {cat.label}
            </button>
          );
        })}
      </div>

      {/* Category Info & Upload Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-xl border border-border bg-card/50 p-4">
        <div>
          <h3 className="text-xs font-bold text-foreground">
            {activeCategoryMeta.label}
          </h3>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            {activeCategoryMeta.description}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept={activeCategory === "favicons" ? ".ico,.png,.svg" : "image/*"}
            className="hidden"
            onChange={handleFileUpload}
          />
          <button
            type="button"
            disabled={uploading}
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3.5 py-2 text-xs font-semibold text-primary-foreground shadow-glow hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            <Upload className="h-3.5 w-3.5" />
            <span>{uploading ? "Uploading…" : `Upload ${activeCategoryMeta.label.split(" ")[0]}`}</span>
          </button>
        </div>
      </div>

      {/* Status Messages */}
      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-400">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Assets Grid */}
      {loading ? (
        <div className="flex h-36 items-center justify-center rounded-xl border border-dashed border-border bg-surface/20 text-xs text-muted-foreground">
          Loading {activeCategoryMeta.label.toLowerCase()}…
        </div>
      ) : assets.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-surface/20 py-10 text-center">
          <FileImage className="h-8 w-8 text-muted-foreground/40" />
          <div className="text-xs font-semibold text-foreground">
            No {activeCategoryMeta.label.toLowerCase()} uploaded yet
          </div>
          <p className="text-[11px] text-muted-foreground max-w-sm">
            Upload custom assets to personalize your executive command workspace.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {assets.map((asset) => (
            <div
              key={asset.id}
              className={cn(
                "group relative flex flex-col justify-between rounded-xl border p-3.5 bg-card/60 transition-all",
                asset.is_active
                  ? "border-primary ring-1 ring-primary/60 bg-primary/[0.02]"
                  : "border-border hover:border-border/80"
              )}
            >
              <div>
                {/* Thumbnail Header */}
                <div className="relative flex h-28 w-full items-center justify-center rounded-lg border border-border/60 bg-background/80 p-2 overflow-hidden">
                  <img
                    src={asset.public_url}
                    alt={asset.name}
                    className="max-h-full max-w-full object-contain"
                  />
                  {asset.is_active && (
                    <span className="absolute top-2 right-2 flex items-center gap-1 rounded-full bg-primary px-2 py-0.5 text-[8px] font-bold text-primary-foreground uppercase shadow-xs">
                      <CheckCircle2 className="h-2.5 w-2.5" />
                      Active
                    </span>
                  )}
                </div>

                {/* Metadata */}
                <div className="mt-3 space-y-1">
                  <div className="truncate text-xs font-semibold text-foreground" title={asset.name}>
                    {asset.name}
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-muted-foreground font-mono">
                    <span>{asset.mime_type?.split("/")[1]?.toUpperCase() || "IMG"}</span>
                    <span>{asset.file_size ? `${(asset.file_size / 1024).toFixed(1)} KB` : "—"}</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-3.5 border-t border-border/60 pt-2.5 flex items-center justify-between gap-2">
                {!asset.is_active ? (
                  <button
                    type="button"
                    onClick={() => handleSetActive(asset)}
                    className="rounded-md bg-surface px-2.5 py-1 text-[10px] font-bold text-foreground hover:bg-primary hover:text-primary-foreground transition-colors"
                  >
                    Set Active
                  </button>
                ) : (
                  <span className="text-[10px] font-medium text-emerald-400">
                    Currently Active
                  </span>
                )}

                <div className="flex items-center gap-1.5">
                  <a
                    href={asset.public_url}
                    target="_blank"
                    rel="noreferrer"
                    title="View full image"
                    className="rounded p-1 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <ExternalLink className="h-3 w-3" />
                  </a>
                  <button
                    type="button"
                    onClick={() => handleDelete(asset)}
                    title="Delete asset"
                    className="rounded p-1 text-muted-foreground hover:text-destructive transition-colors"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
