-- Market Opportunities Table Migration
-- Creates table for market opportunities identified by the intelligence engine
-- with workspace isolation, RLS, and full audit trail

-- ─── market_opportunities ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.market_opportunities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    confidence NUMERIC NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
    estimated_value NUMERIC DEFAULT 0,
    details JSONB DEFAULT '{}'::jsonb,
    discovered_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS market_opportunities_workspace_id_idx ON public.market_opportunities (workspace_id);
CREATE INDEX IF NOT EXISTS market_opportunities_type_idx ON public.market_opportunities (type);
CREATE INDEX IF NOT EXISTS market_opportunities_discovered_at_idx ON public.market_opportunities (discovered_at DESC);
CREATE INDEX IF NOT EXISTS market_opportunities_confidence_idx ON public.market_opportunities (confidence DESC);

-- ─── RLS Policies ─────────────────────────────────────────────────

-- Enable RLS
ALTER TABLE public.market_opportunities ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only access data in their workspace
CREATE POLICY "market_opportunities_workspace_isolation" ON public.market_opportunities
    FOR ALL USING (
        workspace_id IN (
            SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
        )
    );

-- ─── Updated At Trigger ───────────────────────────────────────────
-- Reuse existing update_updated_at_column function if it exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column') THEN
        CREATE TRIGGER update_market_opportunities_updated_at
            BEFORE UPDATE ON public.market_opportunities
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

-- ─── Comments ─────────────────────────────────────────────────────
COMMENT ON TABLE public.market_opportunities IS 'Market opportunities identified by the intelligence engine (price surges, high demand, undervalued listings, new projects, supply-demand gaps)';
COMMENT ON COLUMN public.market_opportunities.type IS 'Type of opportunity: price_surge, high_demand, undervalued_listing, new_project_registration, supply_demand_gap';
COMMENT ON COLUMN public.market_opportunities.confidence IS 'Confidence score (0-1) for the opportunity';
COMMENT ON COLUMN public.market_opportunities.estimated_value IS 'Estimated monetary value of the opportunity in INR';
COMMENT ON COLUMN public.market_opportunities.details IS 'JSON details specific to the opportunity type';
COMMENT ON COLUMN public.market_opportunities.discovered_at IS 'When the opportunity was discovered by the intelligence engine';