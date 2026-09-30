import { supabase } from "@/integrations/supabase/client";

export const ASSET_STORAGE_BUCKET = "branding-assets";

export type BrandAssetCategory =
  | "logos"
  | "favicons"
  | "backgrounds"
  | "watermarks"
  | "seals"
  | "social";

export interface BrandAssetRecord {
  id: string;
  workspace_id: string;
  asset_type: BrandAssetCategory;
  name: string;
  storage_path: string;
  public_url: string;
  mime_type: string | null;
  file_size: number | null;
  width: number | null;
  height: number | null;
  is_active: boolean;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
}

const MAX_ASSET_BYTES = 5_000_000; // 5 MB

/**
 * Upload an asset to Supabase Storage under {workspace_id}/{category}/{timestamp}_{filename}
 * and create a metadata row in brand_assets.
 */
export async function uploadBrandAsset(
  file: File,
  assetType: BrandAssetCategory,
  customName?: string,
  workspaceId?: string | null
): Promise<BrandAssetRecord> {
  const wsId = workspaceId || "00000000-0000-0000-0000-00000000d3f7";

  if (file.size > MAX_ASSET_BYTES) {
    throw new Error(
      `Asset must be under ${Math.round(MAX_ASSET_BYTES / 1_000_000)} MB. Yours is ${(file.size / 1_000_000).toFixed(2)} MB.`
    );
  }

  // Favicon format validation
  if (assetType === "favicons") {
    const validFavicon = ["image/x-icon", "image/png", "image/svg+xml", "image/vnd.microsoft.icon"];
    if (!validFavicon.includes(file.type) && !file.name.endsWith(".ico") && !file.name.endsWith(".png") && !file.name.endsWith(".svg")) {
      throw new Error("Favicons must be PNG, ICO, or SVG format.");
    }
  }

  const timestamp = Date.now();
  const sanitizedName = file.name.replace(/[^a-z0-9.-]/gi, "_");
  const storagePath = `${wsId}/${assetType}/${timestamp}_${sanitizedName}`;

  const { data: uploadData, error: uploadError } = await supabase.storage
    .from(ASSET_STORAGE_BUCKET)
    .upload(storagePath, file, { upsert: true, cacheControl: "3600" });

  if (uploadError) {
    throw new Error(`Asset upload failed: ${uploadError.message}`);
  }

  const { data: urlData } = supabase.storage
    .from(ASSET_STORAGE_BUCKET)
    .getPublicUrl(uploadData.path);

  if (!urlData?.publicUrl) {
    throw new Error("Failed to generate public URL for uploaded asset.");
  }

  const recordName = customName && customName.trim() ? customName.trim() : file.name;

  const newRow = {
    workspace_id: wsId,
    asset_type: assetType,
    name: recordName,
    storage_path: uploadData.path,
    public_url: urlData.publicUrl,
    mime_type: file.type || "application/octet-stream",
    file_size: file.size,
    is_active: false,
    updated_at: new Date().toISOString(),
  };

  const { data: inserted, error: insertError } = await (supabase as any)
    .from("brand_assets")
    .insert(newRow)
    .select()
    .single();

  if (insertError) {
    throw new Error(`Failed to save asset metadata: ${insertError.message}`);
  }

  return inserted;
}

/**
 * Load all brand assets for a workspace, optionally filtered by asset type.
 */
export async function loadBrandAssets(
  workspaceId?: string | null,
  assetType?: BrandAssetCategory
): Promise<BrandAssetRecord[]> {
  const wsId = workspaceId || "00000000-0000-0000-0000-00000000d3f7";

  let query = (supabase as any)
    .from("brand_assets")
    .select("*")
    .eq("workspace_id", wsId)
    .order("created_at", { ascending: false });

  if (assetType) {
    query = query.eq("asset_type", assetType);
  }

  const { data, error } = await query;
  if (error) {
    console.error("[brand-assets.service] Failed to fetch assets:", error);
    return [];
  }

  return data || [];
}

/**
 * Set an asset as the active asset for its category in this workspace.
 */
export async function setActiveAsset(
  assetId: string,
  assetType: BrandAssetCategory,
  workspaceId?: string | null
): Promise<void> {
  const wsId = workspaceId || "00000000-0000-0000-0000-00000000d3f7";

  // Deactivate existing active assets in this category
  await (supabase as any)
    .from("brand_assets")
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq("workspace_id", wsId)
    .eq("asset_type", assetType);

  // Activate target asset
  const { error } = await (supabase as any)
    .from("brand_assets")
    .update({ is_active: true, updated_at: new Date().toISOString() })
    .eq("id", assetId)
    .eq("workspace_id", wsId);

  if (error) {
    throw new Error(`Failed to activate asset: ${error.message}`);
  }
}

/**
 * Delete a brand asset from storage and metadata database.
 */
export async function deleteBrandAsset(
  assetId: string,
  storagePath: string,
  workspaceId?: string | null
): Promise<void> {
  const wsId = workspaceId || "00000000-0000-0000-0000-00000000d3f7";

  // 1. Delete from database
  const { error: dbError } = await (supabase as any)
    .from("brand_assets")
    .delete()
    .eq("id", assetId)
    .eq("workspace_id", wsId);

  if (dbError) {
    throw new Error(`Failed to delete asset metadata: ${dbError.message}`);
  }

  // 2. Delete from storage
  if (storagePath) {
    await supabase.storage.from(ASSET_STORAGE_BUCKET).remove([storagePath]);
  }
}

/**
 * Verifies if an asset file actually exists in Supabase Storage.
 * Inspects folder metadata using storage.list without downloading binary payload.
 */
export async function verifyBrandAssetStorageExistence(
  storagePathOrUrl: string,
  bucket: string = ASSET_STORAGE_BUCKET
): Promise<{ exists: boolean; storagePath?: string }> {
  if (!storagePathOrUrl || typeof storagePathOrUrl !== "string") {
    return { exists: false };
  }

  try {
    let path = storagePathOrUrl.trim();
    if (path.includes(`/${bucket}/`)) {
      path = path.split(`/${bucket}/`)[1];
    } else if (path.startsWith("http://") || path.startsWith("https://")) {
      const parts = path.split("/");
      const bucketIdx = parts.indexOf(bucket);
      if (bucketIdx !== -1 && bucketIdx < parts.length - 1) {
        path = parts.slice(bucketIdx + 1).join("/");
      }
    }

    if (!path) return { exists: false };

    const pathParts = path.split("/");
    const fileName = pathParts.pop();
    const folder = pathParts.join("/");

    if (!fileName) return { exists: false };

    const { data, error } = await supabase.storage
      .from(bucket)
      .list(folder, { search: fileName, limit: 10 });

    if (error || !Array.isArray(data)) {
      return { exists: false, storagePath: path };
    }

    const matched = data.some((item) => item.name === fileName);
    return { exists: matched, storagePath: path };
  } catch (err) {
    console.warn("[brand-assets.service] Storage verification check failed:", err);
    return { exists: false };
  }
}

