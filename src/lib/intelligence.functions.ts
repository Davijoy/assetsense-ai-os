import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  listGlobalProperties,
  getGlobalProperty,
  listPropertyMedia,
} from "@/lib/services/properties.service";
import { listLocations } from "@/lib/services/locations.service";
import { listMarketData } from "@/lib/services/market-data.service";
import { listValuationModels } from "@/lib/services/valuation-models.service";
import { listGlobalDocuments } from "@/lib/services/documents-global.service";
import {
  listPropertyRelationships,
  RELATIONSHIP_TYPES,
} from "@/lib/services/relationships.service";

const listPropertiesSchema = z
  .object({
    city: z.string().max(80).optional(),
    propertyType: z.string().max(80).optional(),
    status: z.string().max(40).optional(),
    minPrice: z.number().int().nonnegative().optional(),
    maxPrice: z.number().int().nonnegative().optional(),
    limit: z.number().int().min(1).max(500).optional(),
  })
  .default({});

export const listGlobalPropertiesFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => listPropertiesSchema.parse(input ?? {}))
  .handler(async ({ data, context }) => {
    const { supabase } = context as any;
    return listGlobalProperties(supabase, data);
  });

const idSchema = z.object({ id: z.string().uuid() });

export const getGlobalPropertyFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => idSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase } = context as any;
    const [property, media, relationships] = await Promise.all([
      getGlobalProperty(supabase, data.id),
      listPropertyMedia(supabase, data.id),
      listPropertyRelationships(supabase, data.id),
    ]);
    return { property, media, relationships };
  });

export const listLocationsFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => listLocations((context as any).supabase));

const marketSchema = z
  .object({
    locationId: z.string().uuid().optional(),
    metric: z.string().max(80).optional(),
    since: z.string().optional(),
    limit: z.number().int().min(1).max(2000).optional(),
  })
  .default({});

export const listMarketDataFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => marketSchema.parse(input ?? {}))
  .handler(async ({ data, context }) =>
    listMarketData((context as any).supabase, data),
  );

export const listValuationModelsFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) =>
    listValuationModels((context as any).supabase, { activeOnly: true }),
  );

const docsSchema = z
  .object({
    docType: z.string().max(80).optional(),
    jurisdiction: z.string().max(80).optional(),
    limit: z.number().int().min(1).max(500).optional(),
  })
  .default({});

export const listGlobalDocumentsFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => docsSchema.parse(input ?? {}))
  .handler(async ({ data, context }) =>
    listGlobalDocuments((context as any).supabase, data),
  );

export const RELATIONSHIP_TYPES_LIST = RELATIONSHIP_TYPES;
