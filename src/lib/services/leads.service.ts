import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

type AnySupabase = SupabaseClient<Database> | SupabaseClient<any, any, any>;

export type Lead = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  source: string;
  stage: string;
  score: number;
  budgetInr: number | null;
  project: string | null;
  owner: string | null;
  city: string | null;
  workspaceId: string;
  createdAt: string;
};

export type CreateLeadInput = {
  name: string;
  email?: string | null;
  phone?: string | null;
  source: string;
  stage?: string;
  score?: number;
  budgetInr?: number | null;
  project?: string | null;
  owner?: string | null;
  city?: string | null;
};

export type UpdateLeadInput = Partial<CreateLeadInput> & {
  id: string;
};

export type ListLeadsFilter = {
  stage?: string;
  source?: string;
  city?: string;
  minScore?: number;
  maxScore?: number;
  minBudget?: number | null;
  maxBudget?: number | null;
  search?: string;
  limit?: number;
};

function mapLeadRow(r: any): Lead {
  return {
    id: r.id,
    name: r.name,
    email: r.email ?? null,
    phone: r.phone ?? null,
    source: r.source,
    stage: r.stage,
    score: r.score ?? 0,
    budgetInr: r.budget_inr != null ? Number(r.budget_inr) : null,
    project: r.project ?? null,
    owner: r.owner ?? null,
    city: r.city ?? null,
    workspaceId: r.workspace_id,
    createdAt: r.created_at,
  };
}

/**
 * List leads for a workspace with optional filtering
 */
export async function listLeads(
  supabase: AnySupabase,
  workspaceId: string,
  filter: ListLeadsFilter = {}
): Promise<Lead[]> {
  let query = (supabase as any)
    .from("leads")
    .select("id,name,email,phone,source,stage,score,budget_inr,project,owner,city,workspace_id,created_at")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false });

  if (filter.stage) query = query.eq("stage", filter.stage);
  if (filter.source) query = query.eq("source", filter.source);
  if (filter.city) query = query.eq("city", filter.city);
  if (filter.minScore !== undefined) query = query.gte("score", filter.minScore);
  if (filter.maxScore !== undefined) query = query.lte("score", filter.maxScore);
  if (filter.minBudget !== null) query = query.gte("budget_inr", filter.minBudget);
  if (filter.maxBudget !== null) query = query.lte("budget_inr", filter.maxBudget);
  if (filter.search) {
    const searchTerm = `%${filter.search}%`;
    query = query.or(`name.ilike${searchTerm},project.ilike${searchTerm},email.ilike${searchTerm}`);
  }
  if (filter.limit) query = query.limit(filter.limit);

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map(mapLeadRow);
}

/**
 * Get a single lead by ID (workspace-scoped for security)
 */
export async function getLeadById(
  supabase: AnySupabase,
  workspaceId: string,
  leadId: string
): Promise<Lead | null> {
  const { data, error } = await (supabase as any)
    .from("leads")
    .select("id,name,email,phone,source,stage,score,budget_inr,project,owner,city,workspace_id,created_at")
    .eq("id", leadId)
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  if (error) throw error;
  return data ? mapLeadRow(data) : null;
}

/**
 * Create a new lead in the workspace
 */
export async function createLead(
  supabase: AnySupabase,
  workspaceId: string,
  input: CreateLeadInput
): Promise<Lead> {
  const { data, error } = await (supabase as any)
    .from("leads")
    .insert({
      name: input.name,
      email: input.email ?? null,
      phone: input.phone ?? null,
      source: input.source,
      stage: input.stage ?? "new",
      score: input.score ?? 0,
      budget_inr: input.budgetInr,
      project: input.project ?? null,
      owner: input.owner ?? null,
      city: input.city ?? null,
      workspace_id: workspaceId,
    })
    .select()
    .single();

  if (error) throw error;
  return mapLeadRow(data);
}

/**
 * Update an existing lead (workspace-scoped for security)
 */
export async function updateLead(
  supabase: AnySupabase,
  workspaceId: string,
  input: UpdateLeadInput
): Promise<Lead> {
  // Get the original lead for comparison
  const originalLead = await getLeadById(supabase, workspaceId, input.id);
  if (!originalLead) {
    throw new Error(`Lead not found: ${input.id}`);
  }

  const updateData: any = {};

  // Only include fields that are defined in the input
  if (input.name !== undefined) updateData.name = input.name;
  if (input.email !== undefined) updateData.email = input.email ?? null;
  if (input.phone !== undefined) updateData.phone = input.phone ?? null;
  if (input.source !== undefined) updateData.source = input.source;
  if (input.stage !== undefined) updateData.stage = input.stage;
  if (input.score !== undefined) updateData.score = input.score;
  if (input.budgetInr !== undefined) updateData.budget_inr = input.budgetInr;
  if (input.project !== undefined) updateData.project = input.project ?? null;
  if (input.owner !== undefined) updateData.owner = input.owner ?? null;
  if (input.city !== undefined) updateData.city = input.city ?? null;

  const { data, error } = await (supabase as any)
    .from("leads")
    .update(updateData)
    .eq("id", input.id)
    .eq("workspace_id", workspaceId)
    .select()
    .single();

  if (error) throw error;
  return mapLeadRow(data);
}

/**
 * Delete a lead (workspace-scoped for security)
 */
export async function deleteLead(
  supabase: AnySupabase,
  workspaceId: string,
  leadId: string
): Promise<void> {
  const { error } = await (supabase as any)
    .from("leads")
    .delete()
    .eq("id", leadId)
    .eq("workspace_id", workspaceId);

  if (error) throw error;
}

/**
 * Get leads summary/statistics for a workspace
 */
export async function getLeadsSummary(
  supabase: AnySupabase,
  workspaceId: string
): Promise<{
  total: number;
  byStage: Record<string, number>;
  bySource: Record<string, number>;
}> {
  const { data, error } = await (supabase as any)
    .from("leads")
    .select("stage,source")
    .eq("workspace_id", workspaceId);

  if (error) throw error;
  const leads = data ?? [];

  const summary = {
    total: leads.length,
    byStage: {} as Record<string, number>,
    bySource: {} as Record<string, number>,
  };

  for (const lead of leads) {
    summary.byStage[lead.stage] = (summary.byStage[lead.stage] ?? 0) + 1;
    summary.bySource[lead.source] = (summary.bySource[lead.source] ?? 0) + 1;
  }

  return summary;
}