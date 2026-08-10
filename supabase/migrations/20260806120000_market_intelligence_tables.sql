-- Market Intelligence Tables Migration
-- Creates tables for market listings, trends, compliance, and ingestion runs
-- with workspace isolation, RLS, idempotency, and full audit trail

-- ─── market_listings ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.market_listings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    source TEXT NOT NULL CHECK (source IN ('magicbricks', '99acres', 'housing')),
    city TEXT NOT NULL,
    locality TEXT,
    title TEXT,
    property_type TEXT NOT NULL CHECK (property_type IN ('apartment', 'villa', 'plot', 'commercial')),
    listing_type TEXT NOT NULL CHECK (listing_type IN ('sale', 'rent')),
    price NUMERIC,
    price_unit TEXT DEFAULT 'INR',
    price_per_sqft NUMERIC,
    area_sqft NUMERIC,
    bedrooms INTEGER,
    bathrooms INTEGER,
    floor TEXT,
    total_floors INTEGER,
    age_years INTEGER,
    furnishing TEXT CHECK (furnishing IN ('furnished', 'semi-furnished', 'unfurnished')),
    builder TEXT,
    project TEXT,
    rera_id TEXT,
    url TEXT,
    scraped_at TIMESTAMPTZ NOT NULL,
    provider_record_id TEXT,
    idempotency_key TEXT NOT NULL,
    correlation_id TEXT,
    causation_id TEXT,
    occurred_at TIMESTAMPTZ NOT NULL,
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Unique constraint for idempotency (workspace + idempotency_key)
CREATE UNIQUE INDEX IF NOT EXISTS market_listings_idempotency_key_idx
    ON public.market_listings (workspace_id, idempotency_key);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS market_listings_workspace_id_idx ON public.market_listings (workspace_id);
CREATE INDEX IF NOT EXISTS market_listings_city_idx ON public.market_listings (city);
CREATE INDEX IF NOT EXISTS market_listings_property_type_idx ON public.market_listings (property_type);
CREATE INDEX IF NOT EXISTS market_listings_scraped_at_idx ON public.market_listings (scraped_at DESC);
CREATE INDEX IF NOT EXISTS market_listings_correlation_id_idx ON public.market_listings (correlation_id);

-- ─── market_trends ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.market_trends (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    city TEXT NOT NULL,
    locality TEXT NOT NULL,
    property_type TEXT NOT NULL CHECK (property_type IN ('apartment', 'villa', 'plot', 'commercial')),
    avg_price_per_sqft NUMERIC NOT NULL,
    median_price NUMERIC,
    total_listings INTEGER NOT NULL,
    price_change_pct NUMERIC,
    demand_index NUMERIC CHECK (demand_index >= 0 AND demand_index <= 100),
    source TEXT NOT NULL CHECK (source IN ('magicbricks', '99acres', 'computed')),
    period TEXT NOT NULL, -- e.g., '2026-Q1'
    recorded_at TIMESTAMPTZ NOT NULL,
    provider_record_id TEXT,
    idempotency_key TEXT NOT NULL,
    correlation_id TEXT,
    causation_id TEXT,
    occurred_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Unique constraint for idempotency
CREATE UNIQUE INDEX IF NOT EXISTS market_trends_idempotency_key_idx
    ON public.market_trends (workspace_id, idempotency_key);

-- Indexes
CREATE INDEX IF NOT EXISTS market_trends_workspace_id_idx ON public.market_trends (workspace_id);
CREATE INDEX IF NOT EXISTS market_trends_city_idx ON public.market_trends (city);
CREATE INDEX IF NOT EXISTS market_trends_property_type_idx ON public.market_trends (property_type);
CREATE INDEX IF NOT EXISTS market_trends_period_idx ON public.market_trends (period);
CREATE INDEX IF NOT EXISTS market_trends_correlation_id_idx ON public.market_trends (correlation_id);

-- ─── market_compliance ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.market_compliance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    source TEXT NOT NULL,
    record_type TEXT NOT NULL CHECK (record_type IN ('project_registration', 'notice', 'amendment', 'violation')),
    project_name TEXT NOT NULL,
    promoter TEXT,
    rera_number TEXT NOT NULL,
    city TEXT NOT NULL,
    state TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('registered', 'revoked', 'lapsed', 'under_review')),
    registration_date TIMESTAMPTZ,
    expiry_date TIMESTAMPTZ,
    url TEXT,
    notes TEXT,
    scraped_at TIMESTAMPTZ NOT NULL,
    provider_record_id TEXT,
    idempotency_key TEXT NOT NULL,
    correlation_id TEXT,
    causation_id TEXT,
    occurred_at TIMESTAMPTZ NOT NULL,
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Unique constraint for idempotency
CREATE UNIQUE INDEX IF NOT EXISTS market_compliance_idempotency_key_idx
    ON public.market_compliance (workspace_id, idempotency_key);

-- Indexes
CREATE INDEX IF NOT EXISTS market_compliance_workspace_id_idx ON public.market_compliance (workspace_id);
CREATE INDEX IF NOT EXISTS market_compliance_city_idx ON public.market_compliance (city);
CREATE INDEX IF NOT EXISTS market_compliance_rera_number_idx ON public.market_compliance (rera_number);
CREATE INDEX IF NOT EXISTS market_compliance_record_type_idx ON public.market_compliance (record_type);
CREATE INDEX IF NOT EXISTS market_compliance_correlation_id_idx ON public.market_compliance (correlation_id);

-- ─── market_ingestion_runs ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.market_ingestion_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    correlation_id TEXT NOT NULL,
    causation_id TEXT,
    source TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'partial')),
    listings_ingested INTEGER DEFAULT 0,
    listings_duplicates INTEGER DEFAULT 0,
    trends_ingested INTEGER DEFAULT 0,
    trends_duplicates INTEGER DEFAULT 0,
    compliance_ingested INTEGER DEFAULT 0,
    compliance_duplicates INTEGER DEFAULT 0,
    errors JSONB DEFAULT '[]'::jsonb,
    started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS market_ingestion_runs_workspace_id_idx ON public.market_ingestion_runs (workspace_id);
CREATE INDEX IF NOT EXISTS market_ingestion_runs_correlation_id_idx ON public.market_ingestion_runs (correlation_id);
CREATE INDEX IF NOT EXISTS market_ingestion_runs_status_idx ON public.market_ingestion_runs (status);
CREATE INDEX IF NOT EXISTS market_ingestion_runs_started_at_idx ON public.market_ingestion_runs (started_at DESC);

-- ─── RLS Policies ─────────────────────────────────────────────────

-- Enable RLS on all tables
ALTER TABLE public.market_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.market_trends ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.market_compliance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.market_ingestion_runs ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only access data in their workspace
-- Assumes auth.uid() maps to workspace membership via a workspace_members table or similar
-- Adjust the policy condition based on your actual workspace membership model

CREATE POLICY "market_listings_workspace_isolation" ON public.market_listings
    FOR ALL USING (
        workspace_id IN (
            SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "market_trends_workspace_isolation" ON public.market_trends
    FOR ALL USING (
        workspace_id IN (
            SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "market_compliance_workspace_isolation" ON public.market_compliance
    FOR ALL USING (
        workspace_id IN (
            SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "market_ingestion_runs_workspace_isolation" ON public.market_ingestion_runs
    FOR ALL USING (
        workspace_id IN (
            SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
        )
    );

-- Grant permissions
GRANT SELECT ON public.market_listings TO authenticated;
GRANT ALL ON public.market_listings TO service_role;
GRANT SELECT ON public.market_trends TO authenticated;
GRANT ALL ON public.market_trends TO service_role;
GRANT SELECT ON public.market_compliance TO authenticated;
GRANT ALL ON public.market_compliance TO service_role;
GRANT SELECT ON public.market_ingestion_runs TO authenticated;
GRANT ALL ON public.market_ingestion_runs TO service_role;

-- ─── Updated At Trigger ───────────────────────────────────────────
-- Reuse existing update_updated_at_column function if it exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column') THEN
        CREATE TRIGGER update_market_listings_updated_at
            BEFORE UPDATE ON public.market_listings
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

        CREATE TRIGGER update_market_trends_updated_at
            BEFORE UPDATE ON public.market_trends
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

        CREATE TRIGGER update_market_compliance_updated_at
            BEFORE UPDATE ON public.market_compliance
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

-- ─── Comments ─────────────────────────────────────────────────────
COMMENT ON TABLE public.market_listings IS 'Market property listings from external sources (magicbricks, 99acres, housing)';
COMMENT ON TABLE public.market_trends IS 'Aggregated market trends by city/locality/property type';
COMMENT ON TABLE public.market_compliance IS 'RERA compliance records and project registrations';
COMMENT ON TABLE public.market_ingestion_runs IS 'Audit log of market data ingestion runs';

COMMENT ON COLUMN public.market_listings.idempotency_key IS 'Unique key for deduplication (source + provider_record_id + scraped_at)';
COMMENT ON COLUMN public.market_listings.correlation_id IS 'Distributed tracing correlation ID';
COMMENT ON COLUMN public.market_listings.causation_id IS 'Causation chain ID from event that triggered ingestion';
COMMENT ON COLUMN public.market_listings.occurred_at IS 'When the listing was actually scraped/observed (source timestamp)';
COMMENT ON COLUMN public.market_listings.recorded_at IS 'When the record was written to our database (server-authoritative)';