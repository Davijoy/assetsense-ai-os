import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

type AnySupabase = SupabaseClient<Database> | SupabaseClient<any, any, any>;

export type ValuationModel = {
  id: string;
  code: string;
  name: string;
  family: string;
  version: string;
  description: string | null;
  features: any[];
  metrics: Record<string, any>;
  isActive: boolean;
};

function mapRow(r: any): ValuationModel {
  return {
    id: r.id,
    code: r.code,
    name: r.name,
    family: r.family,
    version: r.version,
    description: r.description ?? null,
    features: (r.features ?? []) as any[],
    metrics: (r.metrics ?? {}) as Record<string, any>,
    isActive: !!r.is_active,
  };
}

export async function listValuationModels(
  supabase: AnySupabase,
  opts: { activeOnly?: boolean } = {},
): Promise<ValuationModel[]> {
  let q = (supabase as any)
    .from("valuation_models")
    .select("id,code,name,family,version,description,features,metrics,is_active")
    .order("code");
  if (opts.activeOnly) q = q.eq("is_active", true);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []).map(mapRow);
}

export async function getValuationModel(
  supabase: AnySupabase,
  code: string,
): Promise<ValuationModel | null> {
  const { data, error } = await (supabase as any)
    .from("valuation_models")
    .select("id,code,name,family,version,description,features,metrics,is_active")
    .eq("code", code)
    .maybeSingle();
  if (error) throw error;
  return data ? mapRow(data) : null;
}
