import { createFileRoute } from "@tanstack/react-router";
import { createHmac, timingSafeEqual } from "node:crypto";
import {
  isServiceRoleAvailable,
  supabaseAdmin,
} from "@/integrations/supabase/client.server";

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });
}

function verifyMetaSignature(
  rawBody: string,
  signatureHeader: string | null,
  appSecret: string,
): boolean {
  if (!signatureHeader?.startsWith("sha256=")) {
    return false;
  }

  const suppliedHex = signatureHeader.slice("sha256=".length);

  if (!/^[a-fA-F0-9]{64}$/.test(suppliedHex)) {
    return false;
  }

  const expectedHex = createHmac("sha256", appSecret)
    .update(rawBody, "utf8")
    .digest("hex");

  const supplied = Buffer.from(suppliedHex, "hex");
  const expected = Buffer.from(expectedHex, "hex");

  return (
    supplied.length === expected.length &&
    timingSafeEqual(supplied, expected)
  );
}


type MetaLeadgenEvent = {
  leadgenId: string;
  pageId: string;
  formId: string;
};

function extractMetaLeadgenEvents(payload: unknown): MetaLeadgenEvent[] {
  if (!payload || typeof payload !== "object") {
    return [];
  }

  const root = payload as {
    object?: unknown;
    entry?: unknown;
  };

  if (root.object !== "page" || !Array.isArray(root.entry)) {
    return [];
  }

  const events: MetaLeadgenEvent[] = [];

  for (const entry of root.entry) {
    if (!entry || typeof entry !== "object") {
      continue;
    }

    const entryObject = entry as {
      id?: unknown;
      changes?: unknown;
    };

    if (!Array.isArray(entryObject.changes)) {
      continue;
    }

    for (const change of entryObject.changes) {
      if (!change || typeof change !== "object") {
        continue;
      }

      const changeObject = change as {
        field?: unknown;
        value?: unknown;
      };

      if (changeObject.field !== "leadgen") {
        continue;
      }

      if (!changeObject.value || typeof changeObject.value !== "object") {
        continue;
      }

      const value = changeObject.value as {
        leadgen_id?: unknown;
        page_id?: unknown;
        form_id?: unknown;
      };

      const leadgenId =
        typeof value.leadgen_id === "string" ? value.leadgen_id.trim() : "";

      const pageId =
        typeof value.page_id === "string"
          ? value.page_id.trim()
          : typeof entryObject.id === "string"
            ? entryObject.id.trim()
            : "";

      const formId =
        typeof value.form_id === "string" ? value.form_id.trim() : "";

      if (!leadgenId || !pageId || !formId) {
        continue;
      }

      events.push({
        leadgenId,
        pageId,
        formId,
      });
    }
  }

  return events;
}


type MetaLeadField = {
  name: string;
  values?: unknown[];
};

type MetaGraphLead = {
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

async function fetchMetaLeadById(
  leadgenId: string,
  accessToken: string,
): Promise<MetaGraphLead> {
  const graphVersion = process.env.META_GRAPH_API_VERSION?.trim();

  if (!graphVersion) {
    throw new Error("META_GRAPH_API_VERSION is not configured");
  }

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


async function processMetaLeadEvent(
  eventId: string,
): Promise<MetaGraphLead> {
  const { data: ingestionEvent, error: eventLookupError } =
    await (supabaseAdmin as any)
      .from("meta_lead_events")
      .select(
        "id,workspace_id,connection_id,leadgen_id,status,attempt_count",
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

  if (ingestionEvent.status !== "received") {
    throw new Error(
      `Meta ingestion event cannot be fetched from status ${ingestionEvent.status}`,
    );
  }

  const { data: connection, error: connectionLookupError } =
    await (supabaseAdmin as any)
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

  const attemptCount =
    Number.isFinite(Number(ingestionEvent.attempt_count))
      ? Number(ingestionEvent.attempt_count) + 1
      : 1;

  const { error: fetchingUpdateError } =
    await (supabaseAdmin as any)
      .from("meta_lead_events")
      .update({
        status: "fetching",
        attempt_count: attemptCount,
        error_code: null,
        error_message: null,
      })
      .eq("id", eventId)
      .eq("status", "received");

  if (fetchingUpdateError) {
    throw new Error(
      `Meta event fetching transition failed: ${fetchingUpdateError.message}`,
    );
  }

  try {
    const lead = await fetchMetaLeadById(
      ingestionEvent.leadgen_id,
      connection.access_token,
    );

    const { error: fetchedUpdateError } =
      await (supabaseAdmin as any)
        .from("meta_lead_events")
        .update({
          status: "fetched",
          processed_at: new Date().toISOString(),
          error_code: null,
          error_message: null,
        })
        .eq("id", eventId)
        .eq("status", "fetching");

    if (fetchedUpdateError) {
      throw new Error(
        `Meta event fetched transition failed: ${fetchedUpdateError.message}`,
      );
    }

    return lead;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : String(error);

    await (supabaseAdmin as any)
      .from("meta_lead_events")
      .update({
        status: "failed",
        processed_at: new Date().toISOString(),
        error_code: "META_GRAPH_FETCH_FAILED",
        error_message: message.slice(0, 1000),
      })
      .eq("id", eventId);

    throw error;
  }
}

export const Route = createFileRoute("/api/public/webhooks/meta-leads")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);

        const mode = url.searchParams.get("hub.mode");
        const verifyToken = url.searchParams.get("hub.verify_token");
        const challenge = url.searchParams.get("hub.challenge");

        const expectedVerifyToken = process.env.META_WEBHOOK_VERIFY_TOKEN;

        if (!expectedVerifyToken) {
          console.error(
            "[meta-leads] META_WEBHOOK_VERIFY_TOKEN is not configured",
          );

          return new Response("Webhook verification is not configured", {
            status: 503,
          });
        }

        if (
          mode === "subscribe" &&
          verifyToken &&
          verifyToken === expectedVerifyToken &&
          challenge
        ) {
          console.info("[meta-leads] Webhook verification succeeded");

          return new Response(challenge, {
            status: 200,
            headers: {
              "Content-Type": "text/plain; charset=utf-8",
              "Cache-Control": "no-store",
            },
          });
        }

        console.warn("[meta-leads] Webhook verification rejected");

        return new Response("Forbidden", {
          status: 403,
        });
      },

      POST: async ({ request }) => {
        try {
          const rawBody = await request.text();

          if (!rawBody) {
            return jsonResponse({ error: "Empty webhook payload" }, 400);
          }

          const appSecret = process.env.META_APP_SECRET;

          if (!appSecret) {
            console.error("[meta-leads] META_APP_SECRET is not configured");

            return jsonResponse(
              { error: "Webhook signature verification is not configured" },
              503,
            );
          }

          const signatureHeader = request.headers.get("x-hub-signature-256");

          if (!verifyMetaSignature(rawBody, signatureHeader, appSecret)) {
            console.warn("[meta-leads] Invalid webhook signature");

            return jsonResponse({ error: "Invalid webhook signature" }, 401);
          }

          let payload: unknown;

          try {
            payload = JSON.parse(rawBody);
          } catch {
            return jsonResponse({ error: "Invalid JSON payload" }, 400);
          }

          const objectType =
            payload &&
            typeof payload === "object" &&
            "object" in payload
              ? String((payload as { object?: unknown }).object ?? "")
              : "";

          const leadgenEvents = extractMetaLeadgenEvents(payload);

          console.info("[meta-leads] Verified webhook received", {
            objectType: objectType || "unknown",
            leadgenEventCount: leadgenEvents.length,
          });

          if (leadgenEvents.length === 0) {
            console.info("[meta-leads] No actionable leadgen events");

            return jsonResponse({
              received: true,
              actionable: false,
            });
          }

          if (!isServiceRoleAvailable()) {
            console.error(
              "[meta-leads] Supabase service role is not configured",
            );

            return jsonResponse(
              { error: "Webhook ingestion is not configured" },
              503,
            );
          }

          let mappedCount = 0;
          let unmappedCount = 0;
          let duplicateCount = 0;

          for (const event of leadgenEvents) {
            /*
             * Idempotency check.
             *
             * Meta can retry webhook deliveries. leadgen_id is the canonical
             * ingestion key, so an already-recorded event is acknowledged
             * without creating another ingestion row.
             */
            const { data: existingEvent, error: existingEventError } =
              await (supabaseAdmin as any)
                .from("meta_lead_events")
                .select("id,status")
                .eq("leadgen_id", event.leadgenId)
                .maybeSingle();

            if (existingEventError) {
              throw new Error(
                `Meta event deduplication lookup failed: ${existingEventError.message}`,
              );
            }

            if (existingEvent) {
              duplicateCount += 1;

              console.info("[meta-leads] Duplicate leadgen event acknowledged", {
                status: existingEvent.status,
              });

              continue;
            }

            /*
             * Resolve the Meta Page/Form pair to exactly one active Sentinel
             * workspace mapping.
             *
             * There is intentionally NO default-workspace fallback.
             */
            const { data: formMapping, error: formMappingError } =
              await (supabaseAdmin as any)
                .from("meta_lead_forms")
                .select("id,workspace_id,connection_id")
                .eq("page_id", event.pageId)
                .eq("form_id", event.formId)
                .eq("active", true)
                .maybeSingle();

            if (formMappingError) {
              throw new Error(
                `Meta form mapping lookup failed: ${formMappingError.message}`,
              );
            }

            if (!formMapping) {
              const { error: unmappedInsertError } =
                await (supabaseAdmin as any)
                  .from("meta_lead_events")
                  .insert({
                    leadgen_id: event.leadgenId,
                    page_id: event.pageId,
                    form_id: event.formId,
                    status: "unmapped",
                  });

              if (unmappedInsertError) {
                // A concurrent Meta retry may have inserted the same
                // leadgen_id after our initial lookup.
                if (unmappedInsertError.code === "23505") {
                  duplicateCount += 1;
                  continue;
                }

                throw new Error(
                  `Unmapped Meta event insert failed: ${unmappedInsertError.message}`,
                );
              }

              unmappedCount += 1;

              console.warn("[meta-leads] Leadgen event has no active mapping");

              continue;
            }

            const {
              data: insertedEvent,
              error: eventInsertError,
            } = await (supabaseAdmin as any)
              .from("meta_lead_events")
              .insert({
                workspace_id: formMapping.workspace_id,
                connection_id: formMapping.connection_id,
                form_mapping_id: formMapping.id,
                leadgen_id: event.leadgenId,
                page_id: event.pageId,
                form_id: event.formId,
                status: "received",
              })
              .select("id")
              .single();

            if (eventInsertError) {
              // Same race protection for concurrent/retried deliveries.
              if (eventInsertError.code === "23505") {
                duplicateCount += 1;
                continue;
              }

              throw new Error(
                `Mapped Meta event insert failed: ${eventInsertError.message}`,
              );
            }

            if (!insertedEvent?.id) {
              throw new Error("Mapped Meta event insert returned no event id");
            }

            /*
             * Controlled processing mode.
             *
             * Production defaults to durable ingestion + fast acknowledgement.
             * Inline processing is opt-in for controlled integration testing only.
             *
             * Do not enable META_PROCESS_INLINE in production until webhook
             * processing is moved behind a durable worker/queue.
             */
            if (process.env.META_PROCESS_INLINE === "1") {
              await processMetaLeadEvent(insertedEvent.id);
            }

            mappedCount += 1;
          }

          console.info("[meta-leads] Leadgen ingestion routing complete", {
            eventCount: leadgenEvents.length,
            mappedCount,
            unmappedCount,
            duplicateCount,
          });

          /*
           * This stage deliberately stops after secure routing + durable
           * idempotent event ingestion.
           *
           * Next production stage:
           * 1. Fetch the full lead from Meta Graph API.
           * 2. Normalize approved lead fields.
           * 3. Create the workspace-scoped CRM lead.
           * 4. Link meta_lead_events.lead_id.
           * 5. Append the lead creation to audit_logs.
           *
           * Never log access tokens, App Secrets, signatures,
           * or full customer lead data.
           */

          return jsonResponse(
            {
              received: true,
              actionable: true,
              eventCount: leadgenEvents.length,
              mappedCount,
              unmappedCount,
              duplicateCount,
            },
            200,
          );
        } catch (error) {
          console.error(
            "[meta-leads] Webhook processing failed",
            error instanceof Error ? error.message : String(error),
          );

          return jsonResponse({ error: "Webhook processing failed" }, 500);
        }
      },
    },
  },
});
