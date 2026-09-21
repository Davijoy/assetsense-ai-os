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

          console.info("[meta-leads] Verified webhook received", {
            objectType: objectType || "unknown",
          });

          /*
           * Signature-authenticated receiver foundation.
           *
           * Before production CRM lead ingestion is enabled we will add:
           * 1. Meta leadgen event validation.
           * 2. Page/form -> Sentinel workspace resolution.
           * 3. Graph API retrieval using the authorized Page connection.
           * 4. Lead normalization and deduplication.
           * 5. CRM insertion and activity/audit logging.
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
