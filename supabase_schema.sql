-- ==============================================================================
-- KOYA PROPOSAL STUDIO — SUPABASE POSTGRESQL DATA DURABILITY SCHEMA
-- Project Reference: nbmmuyubkluvqzrsqwtm
-- Run this in the Supabase SQL Editor: https://supabase.com/dashboard/project/nbmmuyubkluvqzrsqwtm/sql
-- ==============================================================================

-- 1. Create PROPOSALS Table
CREATE TABLE IF NOT EXISTS public.proposals (
    id TEXT PRIMARY KEY,
    idempotency_key TEXT,
    version INTEGER DEFAULT 1 NOT NULL,
    status TEXT DEFAULT 'draft' NOT NULL,
    title TEXT NOT NULL,
    client_name TEXT NOT NULL,
    client_email TEXT NOT NULL,
    company_name TEXT NOT NULL,
    salesperson_name TEXT NOT NULL,
    created_by_user_id TEXT,
    date_of_call TEXT,
    valid_until TEXT,
    content_digest TEXT,
    intake_data JSONB DEFAULT '{}'::jsonb,
    supporting_material TEXT,
    has_gaps BOOLEAN DEFAULT false,
    gaps JSONB DEFAULT '[]'::jsonb,
    sections JSONB DEFAULT '{}'::jsonb,
    version_history JSONB DEFAULT '[]'::jsonb,
    telemetry JSONB DEFAULT '{}'::jsonb,
    approval JSONB,
    delivery JSONB,
    revision_request_notes TEXT,
    acceptance JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create PROPOSAL AUDIT LOGS Table
CREATE TABLE IF NOT EXISTS public.proposal_audit_logs (
    id TEXT PRIMARY KEY,
    proposal_id TEXT NOT NULL,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    action TEXT NOT NULL,
    actor TEXT NOT NULL,
    details JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create High-Performance Indexes
CREATE INDEX IF NOT EXISTS idx_proposals_status ON public.proposals(status);
CREATE INDEX IF NOT EXISTS idx_proposals_company_name ON public.proposals(company_name);
CREATE INDEX IF NOT EXISTS idx_proposals_client_email ON public.proposals(client_email);
CREATE INDEX IF NOT EXISTS idx_proposals_idempotency_key ON public.proposals(idempotency_key);
CREATE INDEX IF NOT EXISTS idx_proposals_created_at ON public.proposals(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_logs_proposal_id ON public.proposal_audit_logs(proposal_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.proposal_audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON public.proposal_audit_logs(timestamp DESC);

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proposal_audit_logs ENABLE ROW LEVEL SECURITY;

-- 5. Create RLS Policies (Allow Service Role Full Access + Authenticated Read/Write)
DROP POLICY IF EXISTS "Service role full access on proposals" ON public.proposals;
CREATE POLICY "Service role full access on proposals" ON public.proposals
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "Public read access on delivered/accepted proposals" ON public.proposals;
CREATE POLICY "Public read access on delivered/accepted proposals" ON public.proposals
    FOR SELECT
    TO anon, authenticated
    USING (true);

DROP POLICY IF EXISTS "Service role full access on audit logs" ON public.proposal_audit_logs;
CREATE POLICY "Service role full access on audit logs" ON public.proposal_audit_logs
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "Public read access on audit logs" ON public.proposal_audit_logs;
CREATE POLICY "Public read access on audit logs" ON public.proposal_audit_logs
    FOR SELECT
    TO anon, authenticated
    USING (true);

-- 6. Trigger for Automatic updated_at Timestamps
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_proposals_updated_at ON public.proposals;
CREATE TRIGGER set_proposals_updated_at
    BEFORE UPDATE ON public.proposals
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- Success Verification Note
COMMENT ON TABLE public.proposals IS 'Koya Enterprise Proposal Studio — Primary Proposal Storage';
COMMENT ON TABLE public.proposal_audit_logs IS 'Koya Enterprise Proposal Studio — Immutable Audit Trail';
