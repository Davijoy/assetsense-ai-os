import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

type AnySupabase = SupabaseClient<Database> | SupabaseClient<any, any, any>;

export type GlobalDocument = {
  id: string;
  name: string;
  docType: string;
  jurisdiction: string | null;
  publisher: string | null;
  summary: string | null;
  storagePath: string | null;
  sizeBytes: number;
  publishedAt: string | null;
  createdAt: string;
};

export type ListDocumentsFilter = {
  docType?: string;
  jurisdiction?: string;
  limit?: number;
};

function mapRow(r: any): GlobalDocument {
  return {
    id: r.id,
    name: r.name,
    docType: r.doc_type,
    jurisdiction: r.jurisdiction ?? null,
    publisher: r.publisher ?? null,
    summary: r.summary ?? null,
    storagePath: r.storage_path ?? null,
    sizeBytes: Number(r.size_bytes ?? 0),
    publishedAt: r.published_at ?? null,
    createdAt: r.created_at,
  };
}

export async function listGlobalDocuments(
  supabase: AnySupabase,
  filter: ListDocumentsFilter = {},
): Promise<GlobalDocument[]> {
  let q = (supabase as any)
    .from("documents_global")
    .select(
      "id,name,doc_type,jurisdiction,publisher,summary,storage_path,size_bytes,published_at,created_at",
    )
    .order("published_at", { ascending: false, nullsFirst: false })
    .limit(filter.limit ?? 100);
  if (filter.docType) q = q.eq("doc_type", filter.docType);
  if (filter.jurisdiction) q = q.eq("jurisdiction", filter.jurisdiction);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []).map(mapRow);
}

export async function getGlobalDocument(
  supabase: AnySupabase,
  id: string,
): Promise<GlobalDocument | null> {
  const { data, error } = await (supabase as any)
    .from("documents_global")
    .select(
      "id,name,doc_type,jurisdiction,publisher,summary,storage_path,size_bytes,published_at,created_at",
    )
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data ? mapRow(data) : null;
}
