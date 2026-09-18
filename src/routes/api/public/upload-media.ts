import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/upload-media")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const contentType = request.headers.get("content-type") || "";

          // 1. Handle FormData multipart file upload
          if (contentType.includes("multipart/form-data")) {
            const formData = await request.formData();
            const file = formData.get("file") as File | null;
            if (!file) {
              return new Response(JSON.stringify({ error: "No file provided in form data" }), {
                status: 400,
                headers: { "Content-Type": "application/json" },
              });
            }

            const arrayBuffer = await file.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);
            const mediaId = `media-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
            const mimeType = file.type || "video/mp4";
            const filename = file.name || "video.mp4";

            const { storeMedia } = await import("@/lib/media-storage.server");
            storeMedia(mediaId, buffer, mimeType, filename);

            const streamUrl = `/api/public/media-stream?id=${mediaId}&name=${encodeURIComponent(filename)}`;

            return new Response(
              JSON.stringify({
                success: true,
                url: streamUrl,
                mediaId,
                filename,
                mimeType,
                size: buffer.length,
              }),
              {
                status: 200,
                headers: {
                  "Content-Type": "application/json",
                  "Access-Control-Allow-Origin": "*",
                },
              }
            );
          }

          // 2. Handle JSON base64 / URL upload
          if (contentType.includes("application/json")) {
            const body = (await request.json()) as { dataUrl?: string; filename?: string; mimeType?: string };
            if (!body.dataUrl) {
              return new Response(JSON.stringify({ error: "Missing dataUrl in request body" }), {
                status: 400,
                headers: { "Content-Type": "application/json" },
              });
            }

            const match = body.dataUrl.match(/^data:([^;]+);base64,(.+)$/);
            if (!match) {
              return new Response(JSON.stringify({ error: "Invalid data URL format" }), {
                status: 400,
                headers: { "Content-Type": "application/json" },
              });
            }

            const mimeType = match[1] || body.mimeType || "video/mp4";
            const buffer = Buffer.from(match[2], "base64");
            const mediaId = `media-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
            const filename = body.filename || "upload.mp4";

            const { storeMedia } = await import("@/lib/media-storage.server");
            storeMedia(mediaId, buffer, mimeType, filename);

            const streamUrl = `/api/public/media-stream?id=${mediaId}&name=${encodeURIComponent(filename)}`;

            return new Response(
              JSON.stringify({
                success: true,
                url: streamUrl,
                mediaId,
                filename,
                mimeType,
                size: buffer.length,
              }),
              {
                status: 200,
                headers: {
                  "Content-Type": "application/json",
                  "Access-Control-Allow-Origin": "*",
                },
              }
            );
          }

          return new Response(JSON.stringify({ error: "Unsupported Content-Type" }), {
            status: 415,
            headers: { "Content-Type": "application/json" },
          });
        } catch (err: any) {
          console.error("[upload-media] Error uploading media:", err);
          return new Response(JSON.stringify({ error: err?.message || "Internal server error" }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }
      },
    },
  },
});
