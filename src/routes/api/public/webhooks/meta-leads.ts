import { createFileRoute } from "@tanstack/react-router";
import { createHmac, timingSafeEqual } from "node:crypto";

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

          /*
           * Signature-authenticated and leadgen-validated receiver foundation.
           *
           * Before production CRM lead ingestion is enabled we will add:
           * 1. Page/form -> Sentinel workspace resolution.
           * 2. Graph API retrieval using the authorized Page connection.
           * 3. Lead normalization and deduplication.
           * 4. CRM insertion and activity/audit logging.
           *
           * Never log access tokens, App Secrets, signatures,
           * or full customer lead data.
           */

          return jsonResponse({ received: true }, 200);
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
