-- Drop existing arXiv functions if they exist (with CASCADE to handle dependencies)
DROP FUNCTION IF EXISTS public.create_arxiv_paper CASCADE;
DROP FUNCTION IF EXISTS public.get_paper_by_arxiv_id(text) CASCADE;
DROP FUNCTION IF EXISTS public.get_all_papers_with_arxiv(integer,integer) CASCADE;
DROP FUNCTION IF EXISTS punpx supabase db push
Initialising login role...
Connecting to remote database...
Skipping migration README.md... (file name must match pattern "<timestamp>_name.sql")
Do you want to push these migrations to the remote database?
 • 20241003000001_add_arxiv_support.sql

 [Y/n] y
Applying migration 20241003000001_add_arxiv_support.sql...
ERROR: function name "public.create_arxiv_paper" is not unique (SQLSTATE 42725)   
At statement: 21                                                                  
COMMENT ON FUNCTION public.create_arxiv_paper IS 'Creates a new arXiv paper entry'
Try rerunning the command with --debug to troubleshoot the error.blic.search_papers_with_arxiv(text,text[],integer) CASCADE;

-- =====================================================
-- ADD ARXIV SUPPORT
-- Date: 2024-10-03
-- Description: Add arXiv table and search functionality
-- =====================================================

-- Create arXiv papers table
CREATE TABLE IF NOT EXISTS public.papers_arxiv (
    paper_id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    abstract TEXT,
    authors TEXT,
    arxiv_id TEXT UNIQUE,
    categories TEXT[],
    primary_category TEXT,
    published_at TIMESTAMP,
    updated_at_source TIMESTAMP,
    source_url TEXT,
    pdf_url TEXT,
    doi TEXT,
    journal_ref TEXT,
    comment TEXT,
    entry_id TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_papers_arxiv_arxiv_id ON public.papers_arxiv(arxiv_id);
CREATE INDEX IF NOT EXISTS idx_papers_arxiv_categories ON public.papers_arxiv USING GIN(categories);
CREATE INDEX IF NOT EXISTS idx_papers_arxiv_title ON public.papers_arxiv(title);
CREATE INDEX IF NOT EXISTS idx_papers_arxiv_published_at ON public.papers_arxiv(published_at DESC);

-- Enable RLS
ALTER TABLE public.papers_arxiv ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Allow authenticated users to read arXiv papers" ON public.papers_arxiv
    FOR SELECT TO authenticated
    USING (true);

CREATE POLICY "Allow authenticated users to insert arXiv papers" ON public.papers_arxiv
    FOR INSERT TO authenticated
    WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update arXiv papers" ON public.papers_arxiv
    FOR UPDATE TO authenticated
    USING (true);

-- Create arXiv paper function
CREATE OR REPLACE FUNCTION public.create_arxiv_paper(
    p_title TEXT,
    p_abstract TEXT DEFAULT NULL,
    p_authors TEXT DEFAULT NULL,
    p_arxiv_id TEXT DEFAULT NULL,
    p_categories TEXT[] DEFAULT NULL,
    p_published_at TIMESTAMP DEFAULT NULL,
    p_updated_at_source TIMESTAMP DEFAULT NULL,
    p_source_url TEXT DEFAULT NULL,
    p_pdf_url TEXT DEFAULT NULL,
    p_doi TEXT DEFAULT NULL,
    p_journal_ref TEXT DEFAULT NULL,
    p_comment TEXT DEFAULT NULL,
    p_entry_id TEXT DEFAULT NULL
)
RETURNS TABLE(
    paper_id INTEGER,
    title TEXT,
    abstract TEXT,
    authors TEXT,
    arxiv_id TEXT,
    categories TEXT[],
    published_at TIMESTAMP,
    updated_at_source TIMESTAMP,
    source_url TEXT,
    pdf_url TEXT,
    doi TEXT,
    journal_ref TEXT,
    comment TEXT,
    entry_id TEXT,
    created_at TIMESTAMP
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_paper_id INTEGER;
BEGIN
    -- Validate required fields
    IF p_title IS NULL OR TRIM(p_title) = '' THEN
        RAISE EXCEPTION 'Paper title is required' USING ERRCODE = '23514';
    END IF;
    
    -- Insert new arXiv paper
    INSERT INTO papers_arxiv (
        title, abstract, authors, arxiv_id, categories, 
        published_at, updated_at_source, source_url, pdf_url, 
        doi, journal_ref, comment, entry_id, created_at, updated_at
    )
    VALUES (
        p_title, p_abstract, p_authors, p_arxiv_id, p_categories,
        p_published_at, p_updated_at_source, p_source_url, p_pdf_url,
        p_doi, p_journal_ref, p_comment, p_entry_id, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    )
    RETURNING papers_arxiv.paper_id INTO v_paper_id;
    
    -- Return the created paper
    RETURN QUERY
    SELECT 
        v_paper_id,
        p_title,
        p_abstract,
        p_authors,
        p_arxiv_id,
        p_categories,
        p_published_at,
        p_updated_at_source,
        p_source_url,
        p_pdf_url,
        p_doi,
        p_journal_ref,
        p_comment,
        p_entry_id,
        CURRENT_TIMESTAMP;
END;
$$;

-- Get arXiv paper by ID
CREATE OR REPLACE FUNCTION public.get_paper_by_arxiv_id(p_arxiv_id TEXT)
RETURNS TABLE(
    paper_id INTEGER,
    title TEXT,
    abstract TEXT,
    authors TEXT,
    arxiv_id TEXT,
    categories TEXT[],
    published_at TIMESTAMP,
    updated_at_source TIMESTAMP,
    source_url TEXT,
    pdf_url TEXT,
    doi TEXT,
    journal_ref TEXT,
    comment TEXT,
    entry_id TEXT,
    created_at TIMESTAMP,
    updated_at TIMESTAMP
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        pa.paper_id,
        pa.title,
        pa.abstract,
        pa.authors,
        pa.arxiv_id,
        pa.categories,
        pa.published_at,
        pa.updated_at_source,
        pa.source_url,
        pa.pdf_url,
        pa.doi,
        pa.journal_ref,
        pa.comment,
        pa.entry_id,
        pa.created_at,
        pa.updated_at
    FROM papers_arxiv pa
    WHERE pa.arxiv_id = p_arxiv_id;
END;
$$;

-- Get all arXiv papers with pagination
CREATE OR REPLACE FUNCTION public.get_all_papers_with_arxiv(
    p_limit INTEGER DEFAULT 100,
    p_offset INTEGER DEFAULT 0
)
RETURNS TABLE(
    paper_id INTEGER,
    title TEXT,
    abstract TEXT,
    authors TEXT,
    arxiv_id TEXT,
    categories TEXT[],
    published_at TIMESTAMP,
    updated_at_source TIMESTAMP,
    source_url TEXT,
    pdf_url TEXT,
    doi TEXT,
    journal_ref TEXT,
    comment TEXT,
    entry_id TEXT,
    created_at TIMESTAMP,
    updated_at TIMESTAMP
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        pa.paper_id,
        pa.title,
        pa.abstract,
        pa.authors,
        pa.arxiv_id,
        pa.categories,
        pa.published_at,
        pa.updated_at_source,
        pa.source_url,
        pa.pdf_url,
        pa.doi,
        pa.journal_ref,
        pa.comment,
        pa.entry_id,
        pa.created_at,
        pa.updated_at
    FROM papers_arxiv pa
    ORDER BY pa.created_at DESC
    LIMIT p_limit OFFSET p_offset;
END;
$$;

-- Search arXiv papers
CREATE OR REPLACE FUNCTION public.search_papers_with_arxiv(
    p_query_text TEXT,
    p_categories TEXT[] DEFAULT NULL,
    p_limit_count INTEGER DEFAULT 20
)
RETURNS TABLE(
    paper_id INTEGER,
    title TEXT,
    abstract TEXT,
    authors TEXT,
    arxiv_id TEXT,
    categories TEXT[],
    published_at TIMESTAMP,
    updated_at_source TIMESTAMP,
    source_url TEXT,
    pdf_url TEXT,
    doi TEXT,
    journal_ref TEXT,
    comment TEXT,
    entry_id TEXT,
    created_at TIMESTAMP,
    relevance_score NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Since this is for existing arXiv papers in our database,
    -- we search through stored arXiv papers
    RETURN QUERY
    SELECT 
        pa.paper_id,
        pa.title,
        pa.abstract,
        pa.authors,
        pa.arxiv_id,
        pa.categories,
        pa.published_at,
        pa.updated_at_source,
        pa.source_url,
        pa.pdf_url,
        pa.doi,
        pa.journal_ref,
        pa.comment,
        pa.entry_id,
        pa.created_at,
        -- Simple relevance scoring based on match frequency
        (
            CASE WHEN pa.title ILIKE '%' || p_query_text || '%' THEN 3 ELSE 0 END +
            CASE WHEN pa.authors ILIKE '%' || p_query_text || '%' THEN 2 ELSE 0 END +
            CASE WHEN pa.abstract ILIKE '%' || p_query_text || '%' THEN 1 ELSE 0 END +
            CASE WHEN array_to_string(pa.categories, ' ') ILIKE '%' || p_query_text || '%' THEN 2 ELSE 0 END
        )::NUMERIC as relevance_score
    FROM papers_arxiv pa
    WHERE (
        (p_query_text IS NULL OR (
            pa.title ILIKE '%' || p_query_text || '%' OR
            pa.authors ILIKE '%' || p_query_text || '%' OR
            pa.abstract ILIKE '%' || p_query_text || '%' OR
            array_to_string(pa.categories, ' ') ILIKE '%' || p_query_text || '%'
        ))
        AND
        (p_categories IS NULL OR pa.categories && p_categories)
    )
    ORDER BY relevance_score DESC, pa.published_at DESC NULLS LAST
    LIMIT p_limit_count;
END;
$$;

-- Grant permissions
GRANT ALL ON TABLE public.papers_arxiv TO authenticated;
GRANT ALL ON TABLE public.papers_arxiv TO anon;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO anon;

-- Add comments with full function signatures to avoid ambiguity
COMMENT ON TABLE public.papers_arxiv IS 'arXiv papers storage table';
COMMENT ON FUNCTION public.create_arxiv_paper(TEXT, TEXT, TEXT, TEXT, TEXT[], TIMESTAMP, TIMESTAMP, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) IS 'Creates a new arXiv paper entry';
COMMENT ON FUNCTION public.get_paper_by_arxiv_id(TEXT) IS 'Retrieves arXiv paper by arXiv ID';
COMMENT ON FUNCTION public.get_all_papers_with_arxiv(INTEGER, INTEGER) IS 'Returns all arXiv papers with pagination';
COMMENT ON FUNCTION public.search_papers_with_arxiv(TEXT, TEXT[], INTEGER) IS 'Searches arXiv papers by query and categories';

-- =====================================================
-- VERIFICATION MESSAGE
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '✅ ARXIV SUPPORT ADDED';
    RAISE NOTICE '📚 arXiv table and functions created';
END $$;