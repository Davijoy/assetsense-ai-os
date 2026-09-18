import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/media-stream")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const url = new URL(request.url);
          const mediaId = url.searchParams.get("id");

          if (!mediaId) {
            return new Response("Missing media id query parameter", { status: 400 });
          }

          const { getMedia } = await import("@/lib/media-storage.server");
          const item = getMedia(mediaId);

          if (!item) {
            return new Response("Media not found or expired", { status: 404 });
          }

          const totalSize = item.size;
          const rangeHeader = request.headers.get("range");

          // Handle HTTP Range header for video seeking & buffer streaming
          if (rangeHeader && rangeHeader.startsWith("bytes=")) {
            const parts = rangeHeader.replace(/bytes=/, "").split("-");
            const start = parseInt(parts[0], 10) || 0;
            const end = parts[1] ? parseInt(parts[1], 10) : totalSize - 1;

            if (start >= totalSize || end >= totalSize) {
              return new Response(null, {
                status: 416,
                headers: {
                  "Content-Range": `bytes */${totalSize}`,
                },
              });
            }

            const chunk = item.buffer.subarray(start, end + 1);
            const chunkSize = end - start + 1;

            return new Response(new Uint8Array(chunk), {
              status: 206,
              headers: {
                "Content-Range": `bytes ${start}-${end}/${totalSize}`,
                "Accept-Ranges": "bytes",
                "Content-Length": String(chunkSize),
                "Content-Type": item.mimeType || "video/mp4",
                "Cache-Control": "public, max-age=86400",
                "Access-Control-Allow-Origin": "*",
              },
            });
          }

          // Full content response
          return new Response(new Uint8Array(item.buffer), {
            status: 200,
            headers: {
              "Content-Type": item.mimeType || "video/mp4",
              "Content-Length": String(totalSize),
              "Accept-Ranges": "bytes",
              "Cache-Control": "public, max-age=86400",
              "Access-Control-Allow-Origin": "*",
            },
          });
        } catch (err: any) {
          console.error("[media-stream] Error streaming media:", err);
          return new Response(err?.message || "Internal server error", { status: 500 });
        }
      },
    },
  },
});
