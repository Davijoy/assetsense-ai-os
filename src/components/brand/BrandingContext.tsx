import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase as supabaseTyped } from "@/integrations/supabase/client";
// branding_settings is not yet in generated types — cast for now.
const supabase = supabaseTyped as unknown as {
  from: (table: string) => any;
};

type BrandingState = {
  logoUrl: string | null;
  logoUrlDark: string | null;
  setLogos: (urls: { logoUrl?: string | null; logoUrlDark?: string | null }) => Promise<void>;
  loading: boolean;
};

const BrandingContext = createContext<BrandingState>({
  logoUrl: null,
  logoUrlDark: null,
  setLogos: async () => {},
  loading: true,
});

export function BrandingProvider({ children }: { children: ReactNode }) {
  const [logoUrl, setLogoUrlState] = useState<string | null>(null);
  const [logoUrlDark, setLogoUrlDarkState] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    supabase
      .from("branding_settings")
      .select("logo_url, logo_url_dark")
      .eq("tenant_key", "default")
      .maybeSingle()
      .then(({ data }: { data: { logo_url: string | null; logo_url_dark: string | null } | null }) => {
        if (!active) return;
        setLogoUrlState(data?.logo_url ?? null);
        setLogoUrlDarkState(data?.logo_url_dark ?? null);
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const setLogos = async (urls: { logoUrl?: string | null; logoUrlDark?: string | null }) => {
    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (urls.logoUrl !== undefined) {
      setLogoUrlState(urls.logoUrl);
      patch.logo_url = urls.logoUrl;
    }
    if (urls.logoUrlDark !== undefined) {
      setLogoUrlDarkState(urls.logoUrlDark);
      patch.logo_url_dark = urls.logoUrlDark;
    }
    await supabase
      .from("branding_settings")
      .update(patch)
      .eq("tenant_key", "default");
  };

  return (
    <BrandingContext.Provider value={{ logoUrl, logoUrlDark, setLogos, loading }}>
      {children}
    </BrandingContext.Provider>
  );
}

export const useBranding = () => useContext(BrandingContext);