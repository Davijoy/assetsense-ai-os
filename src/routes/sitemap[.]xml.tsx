import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";

const BASE_URL = "https://assetsense-ai-os.lovable.app";

interface SitemapEntry {
  path: string;
  lastmod?: string;
  changefreq?: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority?: string;
}

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const entries: SitemapEntry[] = [
          { path: "/", changefreq: "weekly", priority: "1.0" },
          { path: "/product/crm", changefreq: "monthly", priority: "0.9" },
          { path: "/product/erp", changefreq: "monthly", priority: "0.9" },
          { path: "/product/marketplace", changefreq: "monthly", priority: "0.9" },
          { path: "/product/ai-voice", changefreq: "monthly", priority: "0.9" },
          { path: "/product/marketing-cloud", changefreq: "monthly", priority: "0.9" },
          { path: "/product/bi", changefreq: "monthly", priority: "0.9" },
          { path: "/solutions/developers", changefreq: "monthly", priority: "0.8" },
          { path: "/solutions/brokers", changefreq: "monthly", priority: "0.8" },
          { path: "/solutions/channel-partners", changefreq: "monthly", priority: "0.8" },
          { path: "/solutions/enterprises", changefreq: "monthly", priority: "0.8" },
          { path: "/about", changefreq: "monthly", priority: "0.8" },
          { path: "/careers", changefreq: "monthly", priority: "0.7" },
          { path: "/press", changefreq: "monthly", priority: "0.7" },
          { path: "/contact", changefreq: "monthly", priority: "0.7" },
          { path: "/realtifyu", changefreq: "weekly", priority: "0.8" },
          { path: "/realtifyu/connections", changefreq: "weekly", priority: "0.6" },
          { path: "/privacy", changefreq: "yearly", priority: "0.5" },
          { path: "/terms", changefreq: "yearly", priority: "0.5" },
          { path: "/security", changefreq: "yearly", priority: "0.5" },
          { path: "/dpa", changefreq: "yearly", priority: "0.5" },
        ];

        const today = new Date().toISOString().split("T")[0];

        const urls = entries.map((e) =>
          [
            `  <url>`,
            `    <loc>${BASE_URL}${e.path}</loc>`,
            `    <lastmod>${e.lastmod ?? today}</lastmod>`,
            e.changefreq ? `    <changefreq>${e.changefreq}</changefreq>` : null,
            e.priority ? `    <priority>${e.priority}</priority>` : null,
            `  </url>`,
          ]
            .filter(Boolean)
            .join("\n"),
        );

        const xml = [
          `<?xml version="1.0" encoding="UTF-8"?>`,
          `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
          ...urls,
          `</urlset>`,
        ].join("\n");

        return new Response(xml, {
          headers: {
            "Content-Type": "application/xml",
            "Cache-Control": "public, max-age=3600",
          },
        });
      },
    },
  },
});
