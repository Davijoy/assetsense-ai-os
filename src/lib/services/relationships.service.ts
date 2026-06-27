import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

type AnySupabase = SupabaseClient<Database> | SupabaseClient<any, any, any>;

export const RELATIONSHIP_TYPES = [
  "OWNER",
  "LENDER",
  "BROKER",
  "BUYER",
  "TENANT",
  "INVESTOR",
  "MANAGER",
  "ARCHITECT",
  "CONTRACTOR",
  "REGULATOR",
] as const;
export type RelationshipType = (typeof RELATIONSHIP_TYPES)[number];

export type PropertyRelationship = {
  id: string;
  propertyId: string;
  workspaceId: string;
  contactId: string | null;
  contactName: string | null;
  relationshipType: RelationshipType;
  since: string | null;
  until: string | null;
  metadata: Record<string, unknown>;
};

function mapRow(r: any): PropertyRelationship {
  return {
    id: r.id,
    propertyId: r.property_id,
    workspaceId: r.workspace_id,
    contactId: r.contact_id ?? null,
    contactName: r.contact_name ?? null,
    relationshipType: r.relationship_type,
    since: r.since ?? null,
    until: r.until ?? null,
    metadata: (r.metadata ?? {}) as Record<string, unknown>,
  };
}

export async function listPropertyRelationships(
  supabase: AnySupabase,
  propertyId: string,
): Promise<PropertyRelationship[]> {
  const { data, error } = await (supabase as any)
    .from("property_relationships")
    .select(
      "id,property_id,workspace_id,contact_id,contact_name,relationship_type,since,until,metadata",
    )
    .eq("property_id", propertyId)
    .order("relationship_type");
  if (error) throw error;
  return (data ?? []).map(mapRow);
}

export async function listWorkspaceRelationships(
  supabase: AnySupabase,
  workspaceId: string,
  type?: RelationshipType,
): Promise<PropertyRelationship[]> {
  let q = (supabase as any)
    .from("property_relationships")
    .select(
      "id,property_id,workspace_id,contact_id,contact_name,relationship_type,since,until,metadata",
    )
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false })
    .limit(500);
  if (type) q = q.eq("relationship_type", type);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []).map(mapRow);
}

export async function createPropertyRelationship(
  supabase: AnySupabase,
  input: {
    propertyId: string;
    workspaceId: string;
    relationshipType: RelationshipType;
    contactId?: string | null;
    contactName?: string | null;
    since?: string | null;
    until?: string | null;
    metadata?: Record<string, unknown>;
  },
): Promise<PropertyRelationship> {
  const { data, error } = await (supabase as any)
    .from("property_relationships")
    .insert({
      property_id: input.propertyId,
      workspace_id: input.workspaceId,
      relationship_type: input.relationshipType,
      contact_id: input.contactId ?? null,
      contact_name: input.contactName ?? null,
      since: input.since ?? null,
      until: input.until ?? null,
      metadata: input.metadata ?? {},
    })
    .select(
      "id,property_id,workspace_id,contact_id,contact_name,relationship_type,since,until,metadata",
    )
    .single();
  if (error) throw error;
  return mapRow(data);
}

export async function deletePropertyRelationship(
  supabase: AnySupabase,
  id: string,
): Promise<void> {
  const { error } = await (supabase as any)
    .from("property_relationships")
    .delete()
    .eq("id", id);
  if (error) throw error;
}
