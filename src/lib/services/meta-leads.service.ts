import { createHash } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { createLead, getLeadById, type Lead } from "@/lib/services/leads.service";
import { recordAudit } from "@/lib/services/audit.service";

type AnySupabase = SupabaseClient<any, any, any>;

/**
 * Derives a deterministic UUID from the Meta leadgen ID.
 * Guarantees 1:1 mathematical mapping: the same leadgen_id ALWAYS produces
 * the exact same UUID, enforcing database primary key idempotency on public.leads.
 */
export function generateMetaLeadUuid(leadgenId: string): string {
  const hash = createHash("sha256")
    .update(`meta:leadgen:${leadgenId.trim()}`)
    .digest("hex");
  // Format as RFC 4122 v5 compatible UUID: 8-4-4-4-12
  return [
    hash.slice(0, 8),
    hash.slice(8, 12),
    `5${hash.slice(13, 16)}`,
    `a${hash.slice(17, 20)}`,
    hash.slice(20, 32),
  ].join("-");
}


export type MetaLeadField = {
  name: string;
  values?: unknown[];
};

export type MetaGraphLead = {
  id: string;
  created_time?: string;
  form_id?: string;
  ad_id?: string;
  ad_name?: string;
  adset_id?: string;
  adset_name?: string;
  campaign_id?: string;
  campaign_name?: string;
  field_data?: MetaLeadField[];
};

export type NormalizedMetaLead = {
  name: string;
  email: string | null;
  phone: string | null;
  source: string;
  stage: string;
  score: number;
  budgetInr: number | null;
  project: string | null;
  city: string | null;
  owner: string | null;
  metaLeadgenId: string;
  metaPageId?: string | null;
  metaFormId?: string | null;
};

/**
 * Parses numeric or formatted INR budget strings (e.g. "1.5 Cr", "75 Lakh", "25,00,000")
 * into a safe integer number in INR. Returns null if unparseable or non-positive.
 */
export function parseBudgetInr(raw: string | number | null | undefined): number | null {
  if (raw == null) return null;
  if (typeof raw === "number") {
    return Number.isFinite(raw) && raw > 0 ? Math.round(raw) : null;
  }
  const str = String(raw).trim().toLowerCase();
  if (!str) return null;

  // Handle Crores: "1.5 Cr", "2 Crore", "2.5cr", "1.75crores"
  const crMatch = str.match(/([\d,.]+)\s*(?:cr|crore|crores)\b/);
  if (crMatch) {
    const num = parseFloat(crMatch[1].replace(/,/g, ""));
    if (!isNaN(num) && num > 0) return Math.round(num * 10000000);
  }

  // Handle Lakhs: "75 L", "50 Lakh", "80lacs", "85 lac", "90 lakhs"
  const lMatch = str.match(/([\d,.]+)\s*(?:l|lac|lacs|lakh|lakhs)\b/);
  if (lMatch) {
    const num = parseFloat(lMatch[1].replace(/,/g, ""));
    if (!isNaN(num) && num > 0) return Math.round(num * 100000);
  }

  // Handle raw numeric digits with optional symbols: "₹ 25,00,000" or "5000000"
  const digitsOnly = str.replace(/[^\d.]/g, "");
  if (digitsOnly) {
    const num = parseFloat(digitsOnly);
    if (!isNaN(num) && num > 0) return Math.round(num);
  }

  return null;
}

/**
 * Extracts a normalized lookup map of field names to their first string value.
 */
function extractFieldMap(fieldData?: MetaLeadField[]): Map<string, string> {
  const map = new Map<string, string>();
  if (!Array.isArray(fieldData)) return map;

  for (const field of fieldData) {
    if (!field || typeof field.name !== "string") continue;
    const rawName = field.name.trim().toLowerCase();
    const cleanKey = rawName.replace(/[\s\-_]+/g, "_").replace(/[^a-z0-9_]/g, "");

    let val = "";
    if (Array.isArray(field.values) && field.values.length > 0) {
      const first = field.values[0];
      if (typeof first === "string") {
        val = first.trim();
      } else if (first !== null && first !== undefined) {
        val = String(first).trim();
      }
    }

    if (val) {
      map.set(rawName, val);
      map.set(cleanKey, val);
    }
  }

  return map;
}

function getFirstMatching(map: Map<string, string>, aliases: string[]): string | null {
  for (const alias of aliases) {
    const direct = map.get(alias.toLowerCase());
    if (direct) return direct;
    const clean = alias.toLowerCase().replace(/[\s\-_]+/g, "_").replace(/[^a-z0-9_]/g, "");
    const cleaned = map.get(clean);
    if (cleaned) return cleaned;
  }
  return null;
}

/**
 * Defensively normalizes Meta field_data into Sentinel Fort CRM lead fields.
 * Independent of field ordering or naming case variants.
 */
export function normalizeMetaLeadFields(
  metaLead: MetaGraphLead,
  formName?: string | null,
): NormalizedMetaLead {
  const fieldMap = extractFieldMap(metaLead.field_data);

  // 1. Full Name Resolution
  let name = getFirstMatching(fieldMap, [
    "full_name",
    "fullname",
    "name",
    "your_name",
    "customer_name",
    "lead_name",
    "contact_name",
    "client_name",
    "user_name",
  ]);

  if (!name) {
    const first =
      getFirstMatching(fieldMap, [
        "first_name",
        "firstname",
        "fname",
        "given_name",
      ]) ?? "";
    const last =
      getFirstMatching(fieldMap, [
        "last_name",
        "lastname",
        "lname",
        "surname",
        "family_name",
      ]) ?? "";
    const combined = `${first} ${last}`.trim();
    if (combined) name = combined;
  }

  if (!name) {
    name = metaLead.id ? `Meta Lead (${metaLead.id})` : "Meta Lead";
  }

  // 2. Email Resolution
  const rawEmail = getFirstMatching(fieldMap, [
    "email",
    "email_address",
    "emailaddress",
    "e_mail",
    "e-mail",
    "work_email",
    "user_email",
    "contact_email",
  ]);
  const email =
    rawEmail && rawEmail.includes("@")
      ? rawEmail.toLowerCase().trim()
      : rawEmail
        ? rawEmail.trim()
        : null;

  // 3. Phone Resolution
  const rawPhone = getFirstMatching(fieldMap, [
    "phone_number",
    "phone",
    "phonenumber",
    "mobile_number",
    "mobilenumber",
    "mobile",
    "contact_number",
    "cell_phone",
    "cellphone",
    "telephone",
    "tel",
    "phone_no",
    "mobile_no",
  ]);
  const phone = rawPhone ? rawPhone.trim() : null;

  // 4. City / Location Resolution
  const rawCity = getFirstMatching(fieldMap, [
    "city",
    "location",
    "town",
    "city_name",
    "current_city",
    "preferred_location",
    "residence_city",
  ]);
  const city = rawCity ? rawCity.trim() : null;

  // 5. Project Resolution
  let project = getFirstMatching(fieldMap, [
    "project",
    "project_name",
    "property",
    "property_name",
    "development",
    "development_name",
    "campaign",
    "campaign_name",
  ]);
  if (!project) {
    project =
      metaLead.campaign_name?.trim() ||
      metaLead.ad_name?.trim() ||
      formName?.trim() ||
      null;
  }

  // 6. Budget Resolution
  const rawBudget = getFirstMatching(fieldMap, [
    "budget",
    "budget_inr",
    "budget_range",
    "investment_budget",
    "price_range",
    "budget_amount",
    "expected_budget",
  ]);
  const budgetInr = parseBudgetInr(rawBudget);

  return {
    name,
    email,
    phone,
    source: "Meta Ads",
    stage: "new",
    score: 0,
    budgetInr,
    project,
    city,
    owner: null,
    metaLeadgenId: metaLead.id,
  };
}

/**
 * Retrieves lead details directly from Meta Graph API.
 * Never logs access token or raw payload containing tokens.
 */
export async function fetchMetaLeadById(
  leadgenId: string,
  accessToken: string,
): Promise<MetaGraphLead> {
  const graphVersion = process.env.META_GRAPH_API_VERSION?.trim() || "v21.0";

  const url = new URL(
    `https://graph.facebook.com/${graphVersion}/${encodeURIComponent(leadgenId)}`,
  );

  url.searchParams.set(
    "fields",
    [
      "id",
      "created_time",
      "form_id",
      "ad_id",
      "ad_name",
      "adset_id",
      "adset_name",
      "campaign_id",
      "campaign_name",
      "field_data",
    ].join(","),
  );

  const response = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    let metaError = `HTTP ${response.status}`;

    try {
      const payload = (await response.json()) as {
        error?: {
          message?: string;
          type?: string;
          code?: number;
          error_subcode?: number;
        };
      };

      if (payload?.error) {
        const parts = [
          payload.error.type,
          payload.error.code != null ? `code=${payload.error.code}` : undefined,
          payload.error.error_subcode != null
            ? `subcode=${payload.error.error_subcode}`
            : undefined,
          payload.error.message,
        ].filter(Boolean);

        metaError = parts.join(" | ");
      }
    } catch {
      // Keep the status-only message. Never log token-bearing URLs or raw bodies.
    }

    throw new Error(`Meta lead retrieval failed: ${metaError}`);
  }

  const lead = (await response.json()) as MetaGraphLead;

  if (!lead?.id) {
    throw new Error("Meta lead retrieval returned no lead id");
  }

  return lead;
}

export type ProcessMetaLeadResult = {
  leadId: string;
  leadgenId: string;
  status: "created" | "already_processed";
  lead?: Lead;
};

/**
 * Processes a recorded Meta webhook event:
 * 1. Validates mapping and connection.
 * 2. Checks durable idempotency using deterministic Meta leadgen UUID.
 * 3. Fetches full lead from Meta Graph API.
 * 4. Normalizes fields defensively (unassigned, score 0).
 * 5. Creates CRM lead in the mapped workspace.
 * 6. Updates meta_lead_events with lead_id and 'created' status.
 * 7. Records workspace audit log.
 */
export async function processMetaLeadEvent(
  eventId: string,
  supabase: AnySupabase = supabaseAdmin,
  fetchFn: (leadgenId: string, accessToken: string) => Promise<MetaGraphLead> = fetchMetaLeadById,
): Promise<ProcessMetaLeadResult> {
  const { data: ingestionEvent, error: eventLookupError } =
    await (supabase as any)
      .from("meta_lead_events")
      .select(
        "id,workspace_id,connection_id,form_mapping_id,leadgen_id,page_id,form_id,status,attempt_count,lead_id",
      )
      .eq("id", eventId)
      .single();

  if (eventLookupError) {
    throw new Error(
      `Meta ingestion event lookup failed: ${eventLookupError.message}`,
    );
  }

  if (!ingestionEvent?.workspace_id || !ingestionEvent?.connection_id) {
    throw new Error("Meta ingestion event is not mapped to a workspace");
  }

  const deterministicLeadId = generateMetaLeadUuid(ingestionEvent.leadgen_id);

  // Idempotency check 1: if lead_id is already assigned or status is already created
  if (ingestionEvent.lead_id) {
    return {
      leadId: ingestionEvent.lead_id,
      leadgenId: ingestionEvent.leadgen_id,
      status: "already_processed",
    };
  }

  if (ingestionEvent.status === "created") {
    return {
      leadId: ingestionEvent.lead_id ?? deterministicLeadId,
      leadgenId: ingestionEvent.leadgen_id,
      status: "already_processed",
    };
  }

  // Idempotency check 2 (Durable crash recovery):
  // Check if a lead with the deterministic ID already exists in public.leads
  // (e.g. process crashed after createLead before meta_lead_events update).
  try {
    const existingLead = await getLeadById(
      supabase,
      ingestionEvent.workspace_id,
      deterministicLeadId,
    );
    if (existingLead) {
      await (supabase as any)
        .from("meta_lead_events")
        .update({
          lead_id: deterministicLeadId,
          status: "created",
          processed_at: new Date().toISOString(),
          error_code: null,
          error_message: null,
        })
        .eq("id", eventId);

      return {
        leadId: deterministicLeadId,
        leadgenId: ingestionEvent.leadgen_id,
        status: "already_processed",
        lead: existingLead,
      };
    }
  } catch {
    // Non-fatal, proceed with standard fetch and creation flow
  }

  const { data: connection, error: connectionLookupError } =
    await (supabase as any)
      .from("meta_connections")
      .select("id,workspace_id,page_id,access_token,status")
      .eq("id", ingestionEvent.connection_id)
      .eq("workspace_id", ingestionEvent.workspace_id)
      .single();

  if (connectionLookupError) {
    throw new Error(
      `Meta connection lookup failed: ${connectionLookupError.message}`,
    );
  }

  if (!connection?.access_token) {
    throw new Error("Meta connection has no server-side access token");
  }

  if (connection.status !== "active") {
    throw new Error(
      `Meta connection is not active: ${connection.status}`,
    );
  }

  // Lookup form mapping for form_name if present
  let formName: string | null = null;
  if (ingestionEvent.form_mapping_id) {
    const { data: formMapping } = await (supabase as any)
      .from("meta_lead_forms")
      .select("form_name")
      .eq("id", ingestionEvent.form_mapping_id)
      .maybeSingle();
    formName = formMapping?.form_name ?? null;
  }

  const attemptCount =
    Number.isFinite(Number(ingestionEvent.attempt_count))
      ? Number(ingestionEvent.attempt_count) + 1
      : 1;

  // Mark status as fetching
  const { error: fetchingUpdateError } =
    await (supabase as any)
      .from("meta_lead_events")
      .update({
        status: "fetching",
        attempt_count: attemptCount,
        error_code: null,
        error_message: null,
      })
      .eq("id", eventId);

  if (fetchingUpdateError) {
    throw new Error(
      `Meta event fetching transition failed: ${fetchingUpdateError.message}`,
    );
  }

  let metaLead: MetaGraphLead;
  try {
    metaLead = await fetchFn(
      ingestionEvent.leadgen_id,
      connection.access_token,
    );
  } catch (fetchError) {
    const message =
      fetchError instanceof Error ? fetchError.message : String(fetchError);

    await (supabase as any)
      .from("meta_lead_events")
      .update({
        status: "failed",
        processed_at: new Date().toISOString(),
        error_code: "META_GRAPH_FETCH_FAILED",
        error_message: message.slice(0, 1000),
      })
      .eq("id", eventId);

    throw fetchError;
  }

  // Update status to fetched
  await (supabase as any)
    .from("meta_lead_events")
    .update({
      status: "fetched",
      processed_at: new Date().toISOString(),
      error_code: null,
      error_message: null,
    })
    .eq("id", eventId);

  // Normalize Meta fields defensively
  const normalized = normalizeMetaLeadFields(metaLead, formName);

  // Create CRM lead in the target workspace with deterministic UUID
  let createdLead: Lead;
  try {
    createdLead = await createLead(supabase, ingestionEvent.workspace_id, {
      id: deterministicLeadId,
      name: normalized.name,
      email: normalized.email,
      phone: normalized.phone,
      source: normalized.source,
      stage: normalized.stage,
      score: normalized.score,
      budgetInr: normalized.budgetInr,
      project: normalized.project,
      city: normalized.city,
      owner: normalized.owner,
    });
  } catch (crmError: any) {
    // If duplicate key collision occurs on public.leads(id), recover the existing lead
    if (
      crmError?.code === "23505" ||
      crmError?.message?.includes("duplicate") ||
      crmError?.message?.includes("23505")
    ) {
      try {
        const existing = await getLeadById(
          supabase,
          ingestionEvent.workspace_id,
          deterministicLeadId,
        );
        if (existing) {
          await (supabase as any)
            .from("meta_lead_events")
            .update({
              lead_id: deterministicLeadId,
              status: "created",
              processed_at: new Date().toISOString(),
              error_code: null,
              error_message: null,
            })
            .eq("id", eventId);

          return {
            leadId: deterministicLeadId,
            leadgenId: ingestionEvent.leadgen_id,
            status: "already_processed",
            lead: existing,
          };
        }
      } catch {
        // Fall through to error handler
      }
    }

    const message =
      crmError instanceof Error ? crmError.message : String(crmError);

    await (supabase as any)
      .from("meta_lead_events")
      .update({
        status: "failed",
        processed_at: new Date().toISOString(),
        error_code: "CRM_LEAD_CREATION_FAILED",
        error_message: message.slice(0, 1000),
      })
      .eq("id", eventId);

    throw crmError;
  }

  // Update meta_lead_events with lead_id and created status
  const { error: createdUpdateError } =
    await (supabase as any)
      .from("meta_lead_events")
      .update({
        lead_id: createdLead.id,
        status: "created",
        processed_at: new Date().toISOString(),
        error_code: null,
        error_message: null,
      })
      .eq("id", eventId);

  if (createdUpdateError) {
    console.error(
      "[meta-leads] Failed to link lead_id on meta_lead_events:",
      createdUpdateError.message,
    );
  }

  // Record audit log
  try {
    await recordAudit(supabase, {
      workspaceId: ingestionEvent.workspace_id,
      actorId: null,
      action: "lead.created",
      entity: "leads",
      entityId: createdLead.id,
      diff: {
        source: normalized.source,
        leadgen_id: ingestionEvent.leadgen_id,
        page_id: ingestionEvent.page_id,
        form_id: ingestionEvent.form_id,
        form_name: formName,
        campaign_name: metaLead.campaign_name ?? null,
        ad_name: metaLead.ad_name ?? null,
      },
    });
  } catch (auditError) {
    console.warn("[meta-leads] Audit log insertion note:", auditError);
  }

  return {
    leadId: createdLead.id,
    leadgenId: ingestionEvent.leadgen_id,
    status: "created",
    lead: createdLead,
  };
}
