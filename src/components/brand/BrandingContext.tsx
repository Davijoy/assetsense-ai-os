import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase as supabaseTyped } from "@/integrations/supabase/client";
// branding_settings is not yet in generated types — cast for now.
const supabase = supabaseTyped as unknown as {
  from: (table: string) => any;
};

type BrandingState = {
  logoUrl: string | null;
  setLogoUrl: (url: string | null) => Promise<void>;
  loading: boolean;
};

const BrandingContext = createContext<BrandingState>({
  logoUrl: null,
  setLogoUrl: async () => {},
  loading: true,
});

export function BrandingProvider({ children }: { children: ReactNode }) {
  const [logoUrl, setLogoUrlState] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    supabase
      .from("branding_settings")
      .select("logo_url")
      .eq("tenant_key", "default")
      .maybeSingle()
      .then(({ data }) => {
        if (!active) return;
        setLogoUrlState(data?.logo_url ?? null);
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const setLogoUrl = async (url: string | null) => {
    setLogoUrlState(url);
    await supabase
      .from("branding_settings")
      .update({ logo_url: url, updated_at: new Date().toISOString() })
      .eq("tenant_key", "default");
  };

  return (
    <BrandingContext.Provider value={{ logoUrl, setLogoUrl, loading }}>
      {children}
    </BrandingContext.Provider>
  );
}

export const useBranding = () => useContext(BrandingContext);