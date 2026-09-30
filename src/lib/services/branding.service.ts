import { supabase } from "@/integrations/supabase/client";

export const STORAGE_BUCKET = "branding-logos";

export interface BrandingData {
  logoUrl: string | null;
  logoUrlDark: string | null;
  workspaceId?: string | null;
}

/**
 * Load branding settings from database with hierarchical fallback:
 * 1. Active workspace row (workspace_id)
 * 2. Default tenant row (tenant_key = 'default')
 * 3. Null fallback (triggers Sentinel Fort default branding)
 */
export async function loadBranding(workspaceId?: string | null): Promise<BrandingData> {
  try {
    // 1. Try active workspace branding first
    if (workspaceId) {
      const { data: wsData, error: wsError } = await (supabase as any)
        .from("branding_settings")
        .select("logo_url, logo_url_dark, workspace_id")
        .eq("workspace_id", workspaceId)
        .maybeSingle();

      if (!wsError && wsData && (wsData.logo_url || wsData.logo_url_dark)) {
        return {
          logoUrl: wsData.logo_url ?? null,
          logoUrlDark: wsData.logo_url_dark ?? null,
          workspaceId: wsData.workspace_id ?? workspaceId,
        };
      }
    }

    // 2. Fallback to default tenant row
    const { data: defaultData, error: defaultError } = await (supabase as any)
      .from("branding_settings")
      .select("logo_url, logo_url_dark, workspace_id")
      .eq("tenant_key", "default")
      .maybeSingle();

    if (!defaultError && defaultData) {
      return {
        logoUrl: defaultData.logo_url ?? null,
        logoUrlDark: defaultData.logo_url_dark ?? null,
        workspaceId: defaultData.workspace_id ?? workspaceId ?? null,
      };
    }

    return { logoUrl: null, logoUrlDark: null, workspaceId: workspaceId ?? null };
  } catch (err) {
    console.error("Failed to load branding:", err);
    return { logoUrl: null, logoUrlDark: null, workspaceId: workspaceId ?? null };
  }
}

/**
 * Upload a logo file to Supabase Storage in workspace-isolated folder.
 * Path convention: {workspace_id}/{variant}/{timestamp}_{sanitizedName}
 */
export async function uploadAndSaveLogo(
  file: File,
  variant: "light" | "dark",
  workspaceId?: string | null
): Promise<string> {
  // Validate file size (max 2 MB)
  const MAX_BYTES = 2_000_000;
  if (file.size > MAX_BYTES) {
    throw new Error(
      `Logo must be under ${Math.round(MAX_BYTES / 1_000_000)} MB. Yours is ${(file.size / 1_000_000).toFixed(2)} MB.`
    );
  }

  // Validate file type
  const validTypes = ["image/png", "image/jpeg", "image/jpg", "image/svg+xml", "image/webp"];
  if (!validTypes.includes(file.type) && !file.type.startsWith("image/")) {
    throw new Error("Please upload an image file (PNG, JPG, SVG, WebP).");
  }

  const timestamp = Date.now();
  const sanitizedName = file.name.replace(/[^a-z0-9.-]/gi, "_");
  const wsPrefix = workspaceId || "global";
  const path = `${wsPrefix}/${variant}/${timestamp}_${sanitizedName}`;

  const { data: uploadData, error: uploadError } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(path, file, { upsert: true, cacheControl: "3600" });

  if (uploadError) {
    throw new Error(`Storage upload failed: ${uploadError.message}`);
  }

  const { data: urlData } = supabase.storage
    .from(STORAGE_BUCKET)
    .getPublicUrl(uploadData.path);

  if (!urlData?.publicUrl) {
    throw new Error("Failed to resolve public URL for uploaded logo.");
  }

  return urlData.publicUrl;
}

/**
 * Save branding URLs to database scoped to active workspace or default tenant.
 */
export async function saveBrandingUrls(data: {
  logoUrl?: string | null;
  logoUrlDark?: string | null;
  workspaceId?: string | null;
}): Promise<void> {
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (data.logoUrl !== undefined) {
    patch.logo_url = data.logoUrl;
  }
  if (data.logoUrlDark !== undefined) {
    patch.logo_url_dark = data.logoUrlDark;
  }

  if (data.workspaceId) {
    // Check if row exists for workspace_id
    const { data: existing, error: findError } = await (supabase as any)
      .from("branding_settings")
      .select("id")
      .eq("workspace_id", data.workspaceId)
      .maybeSingle();

    if (findError) throw findError;

    if (existing?.id) {
      const { error } = await (supabase as any)
        .from("branding_settings")
        .update(patch)
        .eq("id", existing.id);
      if (error) throw error;
    } else {
      const { error } = await (supabase as any)
        .from("branding_settings")
        .insert({
          ...patch,
          workspace_id: data.workspaceId,
          tenant_key: "default",
        });
      if (error) throw error;
    }
  } else {
    // Default tenant fallback
    const { error } = await (supabase as any)
      .from("branding_settings")
      .update(patch)
      .eq("tenant_key", "default");

    if (error) throw error;
  }
}

/**
 * Reset branding to defaults for active workspace or default tenant.
 */
export async function resetBranding(workspaceId?: string | null): Promise<void> {
  const resetPatch = {
    logo_url: null,
    logo_url_dark: null,
    updated_at: new Date().toISOString(),
  };

  if (workspaceId) {
    const { error } = await (supabase as any)
      .from("branding_settings")
      .update(resetPatch)
      .eq("workspace_id", workspaceId);
    if (error) throw error;
  } else {
    const { error } = await (supabase as any)
      .from("branding_settings")
      .update(resetPatch)
      .eq("tenant_key", "default");
    if (error) throw error;
  }
}