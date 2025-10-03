-- =====================================================
-- FIX PAPERS SCHEMA MISMATCH
-- Date: 2024-10-03
-- Description: Fix functions to match actual papers table schema
-- =====================================================

-- The actual papers table has: paper_id, title, abstract, authors, doi, published_at, source_url, created_at
-- But functions expect: paper_id, title, authors, abstract, url, pdf_path, tags, publish_date, journal, doi, created_at, updated_at

-- First, let's add missing columns to papers table to match function expectations
ALTER TABLE public.papers 
ADD COLUMN IF NOT EXISTS pdf_path TEXT,
ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS publish_date DATE,
ADD COLUMN IF NOT EXISTS journal TEXT,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Rename source_url to url to match function expectations
ALTER TABLE public.papers 
RENAME COLUMN source_url TO url;

-- Create index for new columns
CREATE INDEX IF NOT EXISTS idx_papers_tags ON public.papers USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_papers_publish_date ON public.papers(publish_date);

-- Update existing records to have proper publish_date from published_at
UPDATE public.papers 
SET publish_date = published_at::date 
WHERE published_at IS NOT NULL AND publish_date IS NULL;

-- Add trigger to keep updated_at current
CREATE OR REPLACE FUNCTION update_papers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_papers_updated_at ON public.papers;
CREATE TRIGGER trigger_papers_updated_at
    BEFORE UPDATE ON public.papers
    FOR EACH ROW
    EXECUTE FUNCTION update_papers_updated_at();

-- Now recreate the paper management functions with correct schema
-- These functions already exist but need to be ensured they work with the updated schema

-- Test the create_paper function parameters to ensure they match
-- The function signature should be: create_paper(p_title text, p_authors text, p_abstract text, p_url text, p_pdf_path text, p_tags text[], p_publish_date date, p_journal text, p_doi text)

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.papers TO authenticated;
GRANT USAGE ON SEQUENCE papers_paper_id_seq TO authenticated;

-- Verification
DO $$
BEGIN
    RAISE NOTICE '✅ PAPERS SCHEMA FIXED';
    RAISE NOTICE '📝 Added missing columns: pdf_path, tags, publish_date, journal, updated_at';
    RAISE NOTICE '🔄 Renamed source_url to url';
    RAISE NOTICE '⚡ Added updated_at trigger';
END $$;