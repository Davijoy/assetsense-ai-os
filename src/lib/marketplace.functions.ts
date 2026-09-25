import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { requireRoles } from "@/integrations/supabase/role-middleware";

export type ServerProperty = {
  id: string;
  name: string;
  builder: string;
  city: string;
  area: string;
  type: "Apartment" | "Villa" | "Plot" | "Commercial";
  config: string;
  size: string;
  priceLabel: string;
  priceCr: number;
  score: number;
  tag: "Hot" | "New" | "Premium" | "Trending";
  appreciation: string;
  status: "Ready" | "Under Construction" | "New Launch";
  image?: string | null;
  gallery?: string[];
  video?: string | null;
  attributes?: Record<string, any> | null;
  isDb?: boolean;
  price_inr?: number;
  developer?: string;
  property_type?: string;
  updated_at?: string;
};

export function computeConfig(attrs: Record<string, any> = {}, propType?: string): string {
  const typeLower = (propType || attrs.property_type || "").toLowerCase();
  const bhk = attrs.bhk ? String(attrs.bhk).trim() : "";
  if (bhk) {
    if (bhk.toLowerCase().includes("bhk") || bhk.toLowerCase().includes("plot") || bhk.toLowerCase().includes("commercial")) {
      return bhk;
    }
    return `${bhk} BHK`;
  }
  if (typeLower.includes("plot") || typeLower.includes("land")) return "Residential Plot";
  if (typeLower.includes("villa")) return "Luxury Villa";
  if (typeLower.includes("commercial") || typeLower.includes("office")) return "Commercial Space";
  if (typeLower.includes("warehouse")) return "Industrial Warehouse";
  return "Apartment Unit";
}

export function computeSize(attrs: Record<string, any> = {}, sizeField?: string): string {
  if (sizeField && sizeField !== "—" && sizeField.trim()) return sizeField;
  const unit = attrs.measurement_unit || "sqft";
  const numFormat = (val: any) => {
    if (!val) return "";
    const clean = String(val).replace(/,/g, "").trim();
    const n = Number(clean);
    return isNaN(n) ? String(val) : n.toLocaleString("en-IN");
  };

  if (attrs.plot_area) {
    const formatted = numFormat(attrs.plot_area);
    return formatted.toLowerCase().includes(unit.toLowerCase()) ? formatted : `${formatted} ${unit}`;
  }
  if (attrs.super_builtup_area) {
    const formatted = numFormat(attrs.super_builtup_area);
    return formatted.toLowerCase().includes(unit.toLowerCase()) ? formatted : `${formatted} ${unit}`;
  }
  if (attrs.builtup_area) {
    const formatted = numFormat(attrs.builtup_area);
    return formatted.toLowerCase().includes(unit.toLowerCase()) ? formatted : `${formatted} ${unit}`;
  }
  if (attrs.carpet_area) {
    const formatted = numFormat(attrs.carpet_area);
    return formatted.toLowerCase().includes(unit.toLowerCase()) ? formatted : `${formatted} ${unit}`;
  }
  if (attrs.size && attrs.size !== "—") {
    return String(attrs.size);
  }
  return "1,200 sqft";
}

export function formatPriceInr(inr: number): string {
  if (!inr || isNaN(inr) || inr <= 0) return "Price on Request";
  const cr = inr / 10_000_000;
  if (cr >= 1) {
    return `₹${cr.toFixed(2)} Cr`;
  }
  const l = inr / 100_000;
  if (l >= 1) {
    return `₹${l % 1 === 0 ? l.toFixed(0) : l.toFixed(1)} L`;
  }
  return `₹${inr.toLocaleString("en-IN")}`;
}

export function computePricePerSqft(
  priceInr: number,
  attrs: Record<string, any> = {},
  sizeStr?: string
): number | null {
  if (attrs?.price_per_sqft && !isNaN(Number(attrs.price_per_sqft)) && Number(attrs.price_per_sqft) > 0) {
    return Number(attrs.price_per_sqft);
  }
  const areaVal = Number(attrs?.plot_area || attrs?.super_builtup_area || attrs?.builtup_area || attrs?.carpet_area);
  if (areaVal > 0 && priceInr > 0) {
    return Math.round(priceInr / areaVal);
  }
  if (sizeStr) {
    const match = sizeStr.replace(/,/g, "").match(/(\d+(?:\.\d+)?)/);
    if (match) {
      const area = Number(match[1]);
      if (area > 0 && priceInr > 0) {
        return Math.round(priceInr / area);
      }
    }
  }
  return null;
}

export function formatPricePerSqft(rate: number | null | undefined, unit = "sqft"): string {
  if (!rate || isNaN(rate) || rate <= 0) return "";
  return `₹${Math.round(rate).toLocaleString("en-IN")} / ${unit}`;
}

const SAMPLE_BROCHURE_PDF = "data:application/pdf;base64,JVBERi0xLjQKJcOkw7zDtsOfCjEgMCBvYmoKPDwvVHlwZSAvQ2F0YWxvZy9QYWdlcyAyIDAgUj4+CmVuZG9iagoyIDAgb2JqCjw8L1R5cGUgL1BhZ2VzL0tpZHMgWzMgMCBSXS9Db3VudCAxPj4KZW5kb2JqCjMgMCBvYmoKPDwvVHlwZSAvUGFnZS9QYXJlbnQgMiAwIFIvTWVkaWFCb3ggWzAgMCA2MTIgNzkyXS9Db250ZW50cyA0IDAgUj4+CmVuZG9iago0IDAgb2JqCjw8L0xlbmd0aCAxOTg+PnN0cmVhbQpCVAovRjEgMjQgVGYKMTAwIDcwMCBUREgKKE1BUkFTTkRSQSBcbiBOT1JUSCBFQVNUIFJFQUxUWSkgVGoKL0YxIDE0IFRmCjAgLTMwIFREUgooT2ZmaWNpYWwgUHJvamVjdCBCcm9jaHVyZSAmIE1hc3RlciBQbGFuKSBUagowIC0zMCBURFkKKERvZGRhdHVta3VydSwgTm9ydGggQmVuZ2FsdXJ1IC0gUGxvdCBTYWxlcyBEZWNrKSBUagpFVAplbmRzdHJlYW0KZW5kb2JqCnhyZWYKMCA1CjAwMDAwMDAwMDAgNjU1MzUgZiAKMDAwMDAwMDAxNSAwMDAwMCBuIAowMDAwMDAwMDY4IDAwMDAwIG4gCjAwMDAwMDAxMjUgMDAwMDAgbiAKMDAwMDAwMDIyMSAwMDAwMCBuIAp0cmFpbGVyCjw8L1NpemUgNS9Sb290IDEgMCBSPj4Kc3RhcnR4cmVmCjQ3MgolJUVPRg==";

export const INITIAL_MARASANDRA: ServerProperty = {
  id: "custom-marasndra",
  name: "MARASNDRA",
  builder: "NORTH EAST REALTIY",
  city: "Bengaluru",
  area: "DODDATUMKURU",
  type: "Plot",
  config: "Residential Plot",
  size: "1,200 sqft",
  priceLabel: "₹7.2 L",
  priceCr: 0.072,
  score: 69,
  tag: "New",
  appreciation: "+10.9% YoY",
  status: "New Launch",
  image: "https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1200&q=80",
  gallery: [
    "https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1200&q=80",
  ],
  video: "https://assets.mixkit.co/videos/preview/mixkit-aerial-view-of-a-residential-neighborhood-42417-large.mp4",
  price_inr: 720000,
  developer: "NORTH EAST REALTIY",
  property_type: "plot",
  attributes: {
    project_name: "MARASNDRA",
    developer: "NORTH EAST REALTIY",
    locality: "DODDATUMKURU",
    city: "Bengaluru",
    state: "Karnataka",
    country: "India",
    address: "Doddatumkuru, North Bengaluru, Near Doddaballapur & KIADB Aerospace Hub",
    bhk: "Plot",
    plot_area: "1200",
    price_per_sqft: "600",
    measurement_unit: "sqft",
    base_price: 720000,
    total_cost: 720000,
    status: "new_launch",
    rera_number: "PRM/KA/RERA/1250/301/PR/210410/004120",
    khata_type: "A-Khata",
    bank_approved: true,
    occupancy_certificate: true,
    completion_certificate: true,
    legal_verification: "verified",
    short_description: "Prime residential & villa plots in Doddatumkuru, North Bengaluru near KIADB Aerospace Park.",
    detailed_description: "Defence Habitat Housing Co-operative Society (Regd Under Karnataka Co-operative Society Act). Strategic plots offering high capital appreciation near upcoming ITIR and Devanahalli expansion zone.",
    highlights: "• Clear title A-Khata residential layout\n• 40ft & 30ft wide asphalted internal roads\n• Water, electricity & underground drainage connection ready\n• 15 mins from Kempegowda International Airport (BLR)",
    amenities: ["Security", "CCTV", "Garden", "Children Play Area", "Rainwater Harvesting", "Solar Power", "Visitor Parking", "Power Backup"],
    media: {
      cover: "https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1200&q=80",
      gallery: [
        "https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1200&q=80",
        "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1200&q=80",
        "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80",
        "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1200&q=80",
        "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1200&q=80",
      ],
      video: "https://assets.mixkit.co/videos/preview/mixkit-aerial-view-of-a-residential-neighborhood-42417-large.mp4",
      brochure: SAMPLE_BROCHURE_PDF,
    },
    ai: {
      investment_score: 69,
      expected_appreciation: "10.9%",
      rental_yield: "4.2%",
      roi_score: 72,
      risk_level: "Low",
      demand_index: 78,
      growth_index: 84,
      liquidity_index: 68,
      infrastructure_score: 75,
      future_growth: "High growth potential along Bangalore aerospace and ITIR corridor",
    },
  },
  updated_at: new Date().toISOString(),
};

export const INITIAL_TAPASIHALLI: ServerProperty = {
  id: "custom-tapasihalli",
  name: "TAPASIHALLI",
  builder: "SAMARUDHI",
  city: "Bengaluru",
  area: "Tapasihalli, Doddabalapura",
  type: "Plot",
  config: "Plot",
  size: "1,200 sqft",
  priceLabel: "₹20.4 L",
  priceCr: 0.204,
  score: 85,
  tag: "New",
  appreciation: "+14.5% YoY",
  status: "New Launch",
  image: "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1200&q=80",
  gallery: [
    "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1600566753376-12c8ab7fb75b?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1600573472592-401b489a3cdc?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1613977257363-707ba9348227?auto=format&fit=crop&w=1200&q=80",
  ],
  video: "https://assets.mixkit.co/videos/preview/mixkit-aerial-view-of-a-residential-neighborhood-42417-large.mp4",
  price_inr: 2040000,
  developer: "SAMARUDHI",
  property_type: "plot",
  attributes: {
    project_name: "TAPASIHALLI",
    developer: "SAMARUDHI",
    locality: "Tapasihalli, Doddabalapura",
    city: "Bengaluru",
    state: "Karnataka",
    country: "India",
    address: "Samarudhi Layout, Tapasihalli, Doddaballapura, North Bengaluru",
    bhk: "Plot",
    plot_area: "1200",
    price_per_sqft: "1699",
    measurement_unit: "sqft",
    base_price: 2038800,
    total_cost: 2040000,
    status: "new_launch",
    facing: "east",
    khata_type: "A-Khata",
    bank_approved: true,
    occupancy_certificate: true,
    completion_certificate: true,
    legal_verification: "verified",
    short_description: "Premium residential layout in Tapasihalli, Doddabalapura, North Bengaluru by Defence Habitat Housing Co-operative Society.",
    detailed_description: "Samarudhi Tapasihalli is a DC converted, A-Khata approved plotted development strategically positioned near Doddaballapura industrial hub and STRR corridor. Ideal for long-term investment and independent villa construction.",
    highlights: "• Clear title A-Khata residential layout\n• 30ft & 40ft wide blacktop roads with streetlights\n• 24x7 water connection and underground electricity\n• Rapidly appreciating North Bangalore growth corridor",
    amenities: ["Security", "CCTV", "Garden", "Children Play Area", "Rainwater Harvesting", "Solar Power", "Visitor Parking", "Power Backup"],
    media: {
      cover: "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1200&q=80",
      gallery: [
        "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1200&q=80",
        "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80",
        "https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1200&q=80",
        "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1200&q=80",
        "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1200&q=80",
        "https://images.unsplash.com/photo-1600566753376-12c8ab7fb75b?auto=format&fit=crop&w=1200&q=80",
        "https://images.unsplash.com/photo-1600573472592-401b489a3cdc?auto=format&fit=crop&w=1200&q=80",
        "https://images.unsplash.com/photo-1613977257363-707ba9348227?auto=format&fit=crop&w=1200&q=80",
      ],
      video: "https://assets.mixkit.co/videos/preview/mixkit-aerial-view-of-a-residential-neighborhood-42417-large.mp4",
      brochure: SAMPLE_BROCHURE_PDF,
    },
    ai: {
      investment_score: 85,
      expected_appreciation: "14.5%",
      rental_yield: "3.8%",
      roi_score: 88,
      risk_level: "Low",
      demand_index: 82,
      growth_index: 89,
      liquidity_index: 74,
      infrastructure_score: 80,
      future_growth: "High appreciation velocity driven by STRR and KIADB Aerospace Park expansion",
    },
  },
  updated_at: new Date().toISOString(),
};

// Global in-memory storage for persistent server sessions across HMR and multi-client connections
declare global {
  // eslint-disable-next-line no-var
  var __MARKETPLACE_MEMORY_STORE__: Map<string, ServerProperty> | undefined;
}

if (!globalThis.__MARKETPLACE_MEMORY_STORE__) {
  globalThis.__MARKETPLACE_MEMORY_STORE__ = new Map<string, ServerProperty>([
    ["custom-tapasihalli", INITIAL_TAPASIHALLI],
    ["custom-marasndra", INITIAL_MARASANDRA],
  ]);
}

const memoryStore = globalThis.__MARKETPLACE_MEMORY_STORE__;

/**
 * Fetch all shared marketplace properties across all connected clients (localhost + remote tunnel).
 */
export const getMarketplaceInventoryServer = createServerFn({ method: "GET" }).handler(
  async (): Promise<ServerProperty[]> => {
    // Ensure initial seed properties are always available
    if (!memoryStore.has("custom-tapasihalli")) {
      let hasTapasihalli = false;
      for (const p of memoryStore.values()) {
        if (p.name && p.name.trim().toLowerCase() === "tapasihalli") {
          hasTapasihalli = true;
          break;
        }
      }
      if (!hasTapasihalli) {
        memoryStore.set("custom-tapasihalli", INITIAL_TAPASIHALLI);
      }
    }

    if (!memoryStore.has("custom-marasndra")) {
      let hasMarasandra = false;
      for (const p of memoryStore.values()) {
        if (p.name && p.name.trim().toLowerCase() === "marasndra") {
          hasMarasandra = true;
          break;
        }
      }
      if (!hasMarasandra) {
        memoryStore.set("custom-marasndra", INITIAL_MARASANDRA);
      }
    }

    // Also attempt to query Supabase database
    try {
      const { data: rows } = await supabase
        .from("properties")
        .select("id,name,city,property_type,price_inr,status,ai_score,developer,created_at,attributes,is_draft")
        .order("created_at", { ascending: false });

      if (rows && rows.length > 0) {
        for (const r of rows) {
          const priceCr = Number(r.price_inr || 0) / 10_000_000;
          const status: ServerProperty["status"] =
            r.status === "sold" || r.status === "reserved" || r.status === "ready_to_move"
              ? "Ready"
              : r.status === "under_construction"
              ? "Under Construction"
              : "New Launch";

          const attrs = (r.attributes as Record<string, any>) || {};
          const media = attrs.media || {};
          const coverImage = media.cover || (Array.isArray(media.gallery) && media.gallery[0]) || attrs.image || null;
          const gallery = Array.isArray(media.gallery) && media.gallery.length > 0 ? media.gallery : (coverImage ? [coverImage] : []);
          const video = media.video || attrs.video || null;

          const configStr = computeConfig(attrs, r.property_type);
          const sizeStr = computeSize(attrs);
          const areaStr = attrs.locality || attrs.address || r.city;

          const prop: ServerProperty = {
            id: `db-${r.id}`,
            name: r.name,
            builder: r.developer ?? "—",
            city: r.city,
            area: areaStr,
            type: (r.property_type ? r.property_type.charAt(0).toUpperCase() + r.property_type.slice(1).toLowerCase() : "Apartment") as any,
            config: configStr,
            size: sizeStr,
            priceLabel: formatPriceInr(Number(r.price_inr || 0)),
            priceCr,
            score: r.ai_score ?? (attrs.ai?.investment_score ? Number(attrs.ai.investment_score) : 75),
            tag: r.is_draft ? "New" : "Trending",
            appreciation: attrs.ai?.expected_appreciation ? `+${attrs.ai.expected_appreciation} YoY` : "+12% YoY",
            status,
            image: coverImage,
            gallery,
            video,
            attributes: attrs,
            isDb: true,
            price_inr: Number(r.price_inr || 0),
            developer: r.developer || "",
            property_type: r.property_type || "apartment",
            updated_at: r.created_at,
          };

          const normName = (r.name || "").trim().toLowerCase();
          for (const [key, existing] of memoryStore.entries()) {
            if (existing.name && existing.name.trim().toLowerCase() === normName && key !== `db-${r.id}`) {
              memoryStore.delete(key);
            }
          }
          memoryStore.set(prop.id, prop);
        }
      }
    } catch {
      // Supabase is optional; memory store is primary
    }

    return Array.from(memoryStore.values());
  }
);

/**
 * Save or update a property across the entire server cluster so both localhost and remote users see it immediately.
 */
export const saveMarketplacePropertyServer = createServerFn({ method: "POST" })
  .middleware([requireRoles(["admin", "manager", "builder", "developer"])])
  .validator(
    z.object({
      id: z.string().optional(),
      name: z.string(),
      developer: z.string().optional().nullable(),
      city: z.string(),
      property_type: z.string(),
      status: z.string(),
      price_inr: z.number(),
      is_draft: z.boolean().optional(),
      attributes: z.record(z.string(), z.any()).optional().nullable(),
      ai_score: z.number().optional(),
    })
  )
  .handler(async ({ data }): Promise<{ success: boolean; property: ServerProperty }> => {
    const priceCr = (data.price_inr || 0) / 10_000_000;
    const attrs = (data.attributes || {}) as Record<string, any>;
    const media = (attrs.media || {}) as Record<string, any>;
    const coverImage = media.cover || (Array.isArray(media.gallery) && media.gallery[0]) || attrs.image || null;
    const gallery = Array.isArray(media.gallery) && media.gallery.length > 0 ? media.gallery : (coverImage ? [coverImage] : []);
    const video = media.video || attrs.video || null;

    const propId = data.id || `custom-${Date.now()}`;
    const status: ServerProperty["status"] =
      data.status === "ready_to_move" || data.status === "available" || data.status === "Ready"
        ? "Ready"
        : data.status === "under_construction" || data.status === "Under Construction"
        ? "Under Construction"
        : "New Launch";

    const typeStr = (data.property_type
      ? data.property_type.charAt(0).toUpperCase() + data.property_type.slice(1).toLowerCase()
      : "Apartment") as ServerProperty["type"];

    const configStr = computeConfig(attrs, data.property_type);
    const sizeStr = computeSize(attrs);

    const serverProp: ServerProperty = {
      id: propId,
      name: data.name,
      builder: data.developer || "—",
      city: data.city,
      area: String(attrs.locality || attrs.address || data.city),
      type: typeStr,
      config: configStr,
      size: sizeStr,
      priceLabel: formatPriceInr(data.price_inr || 0),
      priceCr,
      score: data.ai_score ?? (attrs.ai?.investment_score ? Number(attrs.ai.investment_score) : 75),
      tag: data.is_draft ? "New" : "Trending",
      appreciation: attrs.ai?.expected_appreciation ? `+${attrs.ai.expected_appreciation} YoY` : "+12% YoY",
      status,
      image: coverImage,
      gallery,
      video,
      attributes: attrs,
      price_inr: data.price_inr,
      developer: data.developer || "",
      property_type: data.property_type,
      updated_at: new Date().toISOString(),
    };

    // Clean up any stale duplicate memoryStore entry by normalized name
    const normalizedName = (data.name || "").trim().toLowerCase();
    for (const [key, existing] of memoryStore.entries()) {
      if (existing.name && existing.name.trim().toLowerCase() === normalizedName && key !== propId) {
        memoryStore.delete(key);
      }
    }
    memoryStore.set(propId, serverProp);

    // Attempt background Supabase update/insert
    try {
      const cleanId = propId.startsWith("db-") ? propId.replace("db-", "") : propId;
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cleanId);
      if (isUuid) {
        await supabase.from("properties").update({
          name: data.name,
          city: data.city,
          property_type: data.property_type,
          price_inr: data.price_inr,
          status: data.status,
          developer: data.developer || null,
          attributes: data.attributes as any,
          ai_score: serverProp.score,
        }).eq("id", cleanId);
      } else {
        await supabase.from("properties").insert({
          name: data.name,
          city: data.city,
          property_type: data.property_type,
          price_inr: data.price_inr,
          status: data.status,
          developer: data.developer || null,
          attributes: data.attributes as any,
          ai_score: serverProp.score,
        });
      }
    } catch {
      // Non-blocking
    }

    return { success: true, property: serverProp };
  });

/**
 * Delete a property from the shared server inventory.
 */
export const deleteMarketplacePropertyServer = createServerFn({ method: "POST" })
  .middleware([requireRoles(["admin", "manager", "builder", "developer"])])
  .validator(z.object({ propertyId: z.string() }))
  .handler(async ({ data }): Promise<{ success: boolean }> => {
    const { propertyId } = data;
    const cleanId = propertyId.startsWith("db-") ? propertyId.replace("db-", "") : propertyId;
    memoryStore.delete(propertyId);
    memoryStore.delete(cleanId);
    memoryStore.delete(`db-${cleanId}`);

    try {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cleanId);
      if (isUuid) {
        await supabase.from("properties").delete().eq("id", cleanId);
      }
    } catch {
      // Non-blocking
    }

    return { success: true };
  });
