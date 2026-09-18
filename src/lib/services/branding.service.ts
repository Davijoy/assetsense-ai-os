import { supabase } from "@/integrations/supabase/client";

const STORAGE_BUCKET = "branding-logos";

export interface BrandingData {
  logoUrl: string | null;
  logoUrlDark: string | null;
}

/**
 * Load branding settings from database
 */
export async function loadBranding(): Promise<BrandingData> {
  try {
    const { data, error } = await (supabase as any)
      .from("branding_settings")
      .select("logo_url, logo_url_dark")
      .eq("tenant_key", "default")
      .maybeSingle();

    if (error) throw error;
    if (!data) return { logoUrl: null, logoUrlDark: null };

    return {
      logoUrl: data.logo_url ?? null,
      logoUrlDark: data.logo_url_dark ?? null,
    };
  } catch (err) {
    console.error("Failed to load branding:", err);
    return { logoUrl: null, logoUrlDark: null };
  }
}

/**
 * Upload and save a logo file
 * Returns the URL for use in the UI
 */
export async function uploadAndSaveLogo(
  file: File,
  variant: "light" | "dark"
): Promise<string> {
  // Validate file size
  const MAX_BYTES = 500_000; // 500 KB
  if (file.size > MAX_BYTES) {
    throw new Error(
      `Logo must be under ${MAX_BYTES / 1000} KB. Yours is ${Math.round(file.size / 1000)} KB.`
    );
  }

  // Validate file type
  if (!file.type.startsWith("image/")) {
    throw new Error("Please upload an image file (PNG, JPG, SVG, WebP).");
  }

  // Upload to storage (if bucket exists) or fall back to data URL
  try {
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error("Failed to read file"));
      reader.readAsDataURL(file);
    });

    // Try to upload to storage, but fall back to data URL if bucket doesn't exist
    try {
      const timestamp = Date.now();
      const sanitizedName = file.name.replace(/[^a-z0-9.-]/gi, "_");
      const path = `${variant}/${timestamp}_${sanitizedName}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(path, file, { upsert: true });

      if (uploadError) {
        console.warn(`Failed to upload to storage, using data URL:`, uploadError);
        // Fall back to data URL
        return dataUrl;
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from(STORAGE_BUCKET)
        .getPublicUrl(uploadData.path);

      if (urlData.publicUrl) {
        return urlData.publicUrl;
      }
    } catch (storageErr) {
      console.warn("Storage upload failed, using data URL:", storageErr);
      // Fall back to data URL
    }

    return dataUrl;
  } catch (err) {
    console.error("Failed to process upload:", err);
    throw err;
  }
}

/**
 * Save branding URLs to database
 */
export async function saveBrandingUrls(data: {
  logoUrl?: string | null;
  logoUrlDark?: string | null;
}): Promise<void> {
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (data.logoUrl !== undefined) {
    patch.logo_url = data.logoUrl;
  }
  if (data.logoUrlDark !== undefined) {
    patch.logo_url_dark = data.logoUrlDark;
  }

  const { error } = await (supabase as any)
    .from("branding_settings")
    .update(patch)
    .eq("tenant_key", "default");

  if (error) throw error;
}

/**
 * Reset branding to defaults
 */
export async function resetBranding(): Promise<void> {
  const { error } = await (supabase as any)
    .from("branding_settings")
    .update({
      logo_url: null,
      logo_url_dark: null,
      updated_at: new Date().toISOString(),
    })
    .eq("tenant_key", "default");

  if (error) throw error;
}