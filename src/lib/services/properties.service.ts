import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

type AnySupabase = SupabaseClient<Database> | SupabaseClient<any, any, any>;

export type GlobalProperty = {
  id: string;
  name: string;
  slug: string | null;
  locationId: string | null;
  city: string | null;
  propertyType: string;
  assetClass: string | null;
  status: string;
  priceInr: number | null;
  areaSqft: number | null;
  developer: string | null;
  reraId: string | null;
  description: string | null;
  attributes: Record<string, any>;
  createdAt: string;
};

export type ListPropertiesFilter = {
  city?: string;
  propertyType?: string;
  status?: string;
  minPrice?: number;
  maxPrice?: number;
  limit?: number;
};

function mapRow(r: any): GlobalProperty {
  return {
    id: r.id,
    name: r.name,
    slug: r.slug ?? null,
    locationId: r.location_id ?? null,
    city: r.locations?.city ?? null,
    propertyType: r.property_type,
    assetClass: r.asset_class ?? null,
    status: r.status,
    priceInr: r.price_inr != null ? Number(r.price_inr) : null,
    areaSqft: r.area_sqft != null ? Number(r.area_sqft) : null,
    developer: r.developer ?? null,
    reraId: r.rera_id ?? null,
    description: r.description ?? null,
    attributes: (r.attributes ?? {}) as Record<string, unknown>,
    createdAt: r.created_at,
  };
}

export async function listGlobalProperties(
  supabase: AnySupabase,
  filter: ListPropertiesFilter = {},
): Promise<GlobalProperty[]> {
  let q = (supabase as any)
    .from("properties_global")
    .select(
      "id,name,slug,location_id,property_type,asset_class,status,price_inr,area_sqft,developer,rera_id,description,attributes,created_at,locations(city)",
    )
    .order("created_at", { ascending: false })
    .limit(filter.limit ?? 100);
  if (filter.propertyType) q = q.eq("property_type", filter.propertyType);
  if (filter.status) q = q.eq("status", filter.status);
  if (filter.minPrice != null) q = q.gte("price_inr", filter.minPrice);
  if (filter.maxPrice != null) q = q.lte("price_inr", filter.maxPrice);
  const { data, error } = await q;
  if (error) throw error;
  let rows: GlobalProperty[] = (data ?? []).map(mapRow);
  if (filter.city) {
    const needle = filter.city.toLowerCase();
    rows = rows.filter((p) => (p.city ?? "").toLowerCase() === needle);
  }
  return rows;
}

export async function getGlobalProperty(
  supabase: AnySupabase,
  id: string,
): Promise<GlobalProperty | null> {
  const { data, error } = await (supabase as any)
    .from("properties_global")
    .select(
      "id,name,slug,location_id,property_type,asset_class,status,price_inr,area_sqft,developer,rera_id,description,attributes,created_at,locations(city)",
    )
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data ? mapRow(data) : null;
}

export async function listPropertyMedia(supabase: AnySupabase, propertyId: string) {
  const { data, error } = await (supabase as any)
    .from("property_media")
    .select("id,kind,url,caption,sort_order,metadata,created_at")
    .eq("property_id", propertyId)
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function findSimilarProperties(
  supabase: AnySupabase,
  embedding: number[],
  matchCount = 8,
) {
  const vectorLiteral = `[${embedding.join(",")}]`;
  const { data, error } = await (supabase as any).rpc("match_properties", {
    query_embedding: vectorLiteral,
    match_count: matchCount,
  });
  if (error) throw error;
  return (data ?? []) as Array<{
    property_id: string;
    name: string;
    city: string | null;
    similarity: number;
  }>;
}
