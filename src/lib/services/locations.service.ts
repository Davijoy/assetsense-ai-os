import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

type AnySupabase = SupabaseClient<Database> | SupabaseClient<any, any, any>;

export type Location = {
  id: string;
  city: string;
  region: string | null;
  country: string;
  lat: number | null;
  lng: number | null;
};

export async function listLocations(supabase: AnySupabase): Promise<Location[]> {
  const { data, error } = await (supabase as any)
    .from("locations")
    .select("id,city,region,country,lat,lng")
    .order("city");
  if (error) throw error;
  return (data ?? []) as Location[];
}

export async function getLocation(
  supabase: AnySupabase,
  id: string,
): Promise<Location | null> {
  const { data, error } = await (supabase as any)
    .from("locations")
    .select("id,city,region,country,lat,lng")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return (data as Location) ?? null;
}
