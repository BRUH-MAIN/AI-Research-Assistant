-- =====================================================
-- RECREATE PAPER MANAGEMENT FUNCTIONS
-- Date: 2024-10-01
-- Description: Paper CRUD operations, search, and session associations
-- =====================================================

-- Create paper
CREATE OR REPLACE FUNCTION public.create_paper(p_title text, p_authors text, p_abstract text DEFAULT ''::text, p_url text DEFAULT ''::text, p_pdf_path text DEFAULT ''::text, p_tags text[] DEFAULT '{}'::text[], p_publish_date date DEFAULT NULL::date, p_journal text DEFAULT ''::text, p_doi text DEFAULT ''::text)
RETURNS TABLE(paper_id integer, title text, authors text, abstract text, url text, pdf_path text, tags text[], publish_date date, journal text, doi text, created_at timestamp without time zone)
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
    v_paper_id INTEGER;
BEGIN
    -- Validate required fields
    IF p_title IS NULL OR TRIM(p_title) = '' THEN
        RAISE EXCEPTION 'Paper title is required' USING ERRCODE = '23514';
    END IF;
    
    IF p_authors IS NULL OR TRIM(p_authors) = '' THEN
        RAISE EXCEPTION 'Paper authors are required' USING ERRCODE = '23514';
    END IF;
    
    -- Insert new paper
    INSERT INTO papers (title, authors, abstract, url, pdf_path, tags, publish_date, journal, doi, created_at)
    VALUES (p_title, p_authors, COALESCE(p_abstract, ''), COALESCE(p_url, ''), COALESCE(p_pdf_path, ''), 
            COALESCE(p_tags, ARRAY[]::text[]), p_publish_date, COALESCE(p_journal, ''), COALESCE(p_doi, ''), CURRENT_TIMESTAMP)
    RETURNING papers.paper_id INTO v_paper_id;
    
    -- Return the created paper
    RETURN QUERY
    SELECT 
        v_paper_id as paper_id,
        p_title as title,
        p_authors as authors,
        COALESCE(p_abstract, '') as abstract,
        COALESCE(p_url, '') as url,
        COALESCE(p_pdf_path, '') as pdf_path,
        COALESCE(p_tags, ARRAY[]::text[]) as tags,
        p_publish_date as publish_date,
        COALESCE(p_journal, '') as journal,
        COALESCE(p_doi, '') as doi,
        CURRENT_TIMESTAMP as created_at;
END;
$function$;

-- Get paper by ID
CREATE OR REPLACE FUNCTION public.get_paper_by_id(p_paper_id integer)
RETURNS TABLE(paper_id integer, title text, authors text, abstract text, url text, pdf_path text, tags text[], publish_date date, journal text, doi text, created_at timestamp without time zone, updated_at timestamp without time zone)
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
    RETURN QUERY
    SELECT 
        p.paper_id,
        p.title,
        p.authors,
        p.abstract,
        p.url,
        p.pdf_path,
        p.tags,
        p.publish_date,
        p.journal,
        p.doi,
        p.created_at,
        p.updated_at
    FROM papers p
    WHERE p.paper_id = p_paper_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Paper with ID % not found', p_paper_id USING ERRCODE = 'P0002';
    END IF;
END;
$function$;

-- Get all papers
CREATE OR REPLACE FUNCTION public.get_all_papers(p_limit integer DEFAULT 100, p_offset integer DEFAULT 0)
RETURNS TABLE(paper_id integer, title text, authors text, abstract text, url text, pdf_path text, tags text[], publish_date date, journal text, doi text, created_at timestamp without time zone, updated_at timestamp without time zone)
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
    RETURN QUERY
    SELECT 
        p.paper_id,
        p.title,
        p.authors,
        p.abstract,
        p.url,
        p.pdf_path,
        p.tags,
        p.publish_date,
        p.journal,
        p.doi,
        p.created_at,
        p.updated_at
    FROM papers p
    ORDER BY p.created_at DESC
    LIMIT p_limit OFFSET p_offset;
END;
$function$;

-- Update paper
CREATE OR REPLACE FUNCTION public.update_paper(p_paper_id integer, p_title text DEFAULT NULL::text, p_authors text DEFAULT NULL::text, p_abstract text DEFAULT NULL::text, p_url text DEFAULT NULL::text, p_pdf_path text DEFAULT NULL::text, p_tags text[] DEFAULT NULL::text[], p_publish_date date DEFAULT NULL::date, p_journal text DEFAULT NULL::text, p_doi text DEFAULT NULL::text)
RETURNS TABLE(paper_id integer, title text, authors text, abstract text, url text, pdf_path text, tags text[], publish_date date, journal text, doi text, created_at timestamp without time zone, updated_at timestamp without time zone)
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
    -- Check if paper exists
    IF NOT EXISTS (SELECT 1 FROM papers WHERE paper_id = p_paper_id) THEN
        RAISE EXCEPTION 'Paper with ID % not found', p_paper_id USING ERRCODE = 'P0002';
    END IF;
    
    -- Update paper with only provided values
    UPDATE papers 
    SET 
        title = COALESCE(p_title, title),
        authors = COALESCE(p_authors, authors),
        abstract = COALESCE(p_abstract, abstract),
        url = COALESCE(p_url, url),
        pdf_path = COALESCE(p_pdf_path, pdf_path),
        tags = COALESCE(p_tags, tags),
        publish_date = COALESCE(p_publish_date, publish_date),
        journal = COALESCE(p_journal, journal),
        doi = COALESCE(p_doi, doi),
        updated_at = CURRENT_TIMESTAMP
    WHERE paper_id = p_paper_id;
    
    -- Return updated paper
    RETURN QUERY
    SELECT 
        p.paper_id,
        p.title,
        p.authors,
        p.abstract,
        p.url,
        p.pdf_path,
        p.tags,
        p.publish_date,
        p.journal,
        p.doi,
        p.created_at,
        p.updated_at
    FROM papers p
    WHERE p.paper_id = p_paper_id;
END;
$function$;

-- Delete paper
CREATE OR REPLACE FUNCTION public.delete_paper(p_paper_id integer)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
    -- Check if paper exists
    IF NOT EXISTS (SELECT 1 FROM papers WHERE paper_id = p_paper_id) THEN
        RAISE EXCEPTION 'Paper with ID % not found', p_paper_id USING ERRCODE = 'P0002';
    END IF;
    
    -- Delete paper (cascading deletes will handle related records)
    DELETE FROM papers WHERE paper_id = p_paper_id;
    
    RETURN true;
END;
$function$;

-- Search papers
CREATE OR REPLACE FUNCTION public.search_papers(p_query text, p_limit integer DEFAULT 50, p_offset integer DEFAULT 0)
RETURNS TABLE(paper_id integer, title text, authors text, abstract text, url text, pdf_path text, tags text[], publish_date date, journal text, doi text, created_at timestamp without time zone, updated_at timestamp without time zone, relevance_score numeric)
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
    RETURN QUERY
    SELECT 
        p.paper_id,
        p.title,
        p.authors,
        p.abstract,
        p.url,
        p.pdf_path,
        p.tags,
        p.publish_date,
        p.journal,
        p.doi,
        p.created_at,
        p.updated_at,
        -- Simple relevance scoring based on match frequency
        (
            CASE WHEN p.title ILIKE '%' || p_query || '%' THEN 3 ELSE 0 END +
            CASE WHEN p.authors ILIKE '%' || p_query || '%' THEN 2 ELSE 0 END +
            CASE WHEN p.abstract ILIKE '%' || p_query || '%' THEN 1 ELSE 0 END +
            CASE WHEN p.journal ILIKE '%' || p_query || '%' THEN 1 ELSE 0 END +
            CASE WHEN array_to_string(p.tags, ' ') ILIKE '%' || p_query || '%' THEN 2 ELSE 0 END
        )::NUMERIC as relevance_score
    FROM papers p
    WHERE (
        p.title ILIKE '%' || p_query || '%' OR
        p.authors ILIKE '%' || p_query || '%' OR
        p.abstract ILIKE '%' || p_query || '%' OR
        p.journal ILIKE '%' || p_query || '%' OR
        array_to_string(p.tags, ' ') ILIKE '%' || p_query || '%'
    )
    ORDER BY relevance_score DESC, p.created_at DESC
    LIMIT p_limit OFFSET p_offset;
END;
$function$;

-- Search papers by tags
CREATE OR REPLACE FUNCTION public.search_papers_by_tags(p_tags text[], p_match_all boolean DEFAULT false, p_limit integer DEFAULT 50, p_offset integer DEFAULT 0)
RETURNS TABLE(paper_id integer, title text, authors text, abstract text, url text, pdf_path text, tags text[], publish_date date, journal text, doi text, created_at timestamp without time zone, updated_at timestamp without time zone)
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
    RETURN QUERY
    SELECT 
        p.paper_id,
        p.title,
        p.authors,
        p.abstract,
        p.url,
        p.pdf_path,
        p.tags,
        p.publish_date,
        p.journal,
        p.doi,
        p.created_at,
        p.updated_at
    FROM papers p
    WHERE 
        CASE 
            WHEN p_match_all THEN p.tags @> p_tags  -- Contains all tags
            ELSE p.tags && p_tags                   -- Contains any tag
        END
    ORDER BY p.created_at DESC
    LIMIT p_limit OFFSET p_offset;
END;
$function$;

-- =====================================================
-- SESSION-PAPER ASSOCIATION FUNCTIONS
-- =====================================================

-- Add paper to session
CREATE OR REPLACE FUNCTION public.add_paper_to_session(p_session_id integer, p_paper_id integer, p_added_by integer)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
    -- Validate that session exists
    IF NOT EXISTS (SELECT 1 FROM sessions WHERE session_id = p_session_id) THEN
        RAISE EXCEPTION 'Session with ID % not found', p_session_id USING ERRCODE = 'P0002';
    END IF;
    
    -- Validate that paper exists
    IF NOT EXISTS (SELECT 1 FROM papers WHERE paper_id = p_paper_id) THEN
        RAISE EXCEPTION 'Paper with ID % not found', p_paper_id USING ERRCODE = 'P0002';
    END IF;
    
    -- Add paper to session (ignore if already exists)
    INSERT INTO session_papers (session_id, paper_id, added_by, added_at)
    VALUES (p_session_id, p_paper_id, p_added_by, CURRENT_TIMESTAMP)
    ON CONFLICT (session_id, paper_id) DO NOTHING;
    
    RETURN true;
END;
$function$;

-- Remove paper from session
CREATE OR REPLACE FUNCTION public.remove_paper_from_session(p_session_id integer, p_paper_id integer)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
    -- Check if association exists
    IF NOT EXISTS (
        SELECT 1 FROM session_papers 
        WHERE session_id = p_session_id AND paper_id = p_paper_id
    ) THEN
        RAISE EXCEPTION 'Paper % is not associated with session %', p_paper_id, p_session_id USING ERRCODE = 'P0002';
    END IF;
    
    -- Remove the association
    DELETE FROM session_papers 
    WHERE session_id = p_session_id AND paper_id = p_paper_id;
    
    RETURN true;
END;
$function$;

-- Get session papers
CREATE OR REPLACE FUNCTION public.get_session_papers(p_session_id integer)
RETURNS TABLE(paper_id integer, title text, authors text, abstract text, url text, pdf_path text, tags text[], publish_date date, journal text, doi text, added_by integer, added_by_name text, added_at timestamp without time zone)
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
    -- Validate that session exists
    IF NOT EXISTS (SELECT 1 FROM sessions WHERE session_id = p_session_id) THEN
        RAISE EXCEPTION 'Session with ID % not found', p_session_id USING ERRCODE = 'P0002';
    END IF;
    
    RETURN QUERY
    SELECT 
        p.paper_id,
        p.title,
        p.authors,
        p.abstract,
        p.url,
        p.pdf_path,
        p.tags,
        p.publish_date,
        p.journal,
        p.doi,
        sp.added_by,
        COALESCE(
            TRIM(CONCAT(u.first_name, ' ', u.last_name)), 
            u.email
        ) as added_by_name,
        sp.added_at
    FROM session_papers sp
    JOIN papers p ON sp.paper_id = p.paper_id
    JOIN users u ON sp.added_by = u.user_id
    WHERE sp.session_id = p_session_id
    ORDER BY sp.added_at DESC;
END;
$function$;

-- Get papers by session count (popular papers)
CREATE OR REPLACE FUNCTION public.get_popular_papers(p_limit integer DEFAULT 20)
RETURNS TABLE(paper_id integer, title text, authors text, abstract text, url text, pdf_path text, tags text[], publish_date date, journal text, doi text, session_count bigint, created_at timestamp without time zone)
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
    RETURN QUERY
    SELECT 
        p.paper_id,
        p.title,
        p.authors,
        p.abstract,
        p.url,
        p.pdf_path,
        p.tags,
        p.publish_date,
        p.journal,
        p.doi,
        COUNT(sp.session_id) as session_count,
        p.created_at
    FROM papers p
    LEFT JOIN session_papers sp ON p.paper_id = sp.paper_id
    GROUP BY p.paper_id, p.title, p.authors, p.abstract, p.url, p.pdf_path, p.tags, p.publish_date, p.journal, p.doi, p.created_at
    HAVING COUNT(sp.session_id) > 0
    ORDER BY session_count DESC, p.created_at DESC
    LIMIT p_limit;
END;
$function$;

-- Get recent papers
CREATE OR REPLACE FUNCTION public.get_recent_papers(p_limit integer DEFAULT 20)
RETURNS TABLE(paper_id integer, title text, authors text, abstract text, url text, pdf_path text, tags text[], publish_date date, journal text, doi text, created_at timestamp without time zone)
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
    RETURN QUERY
    SELECT 
        p.paper_id,
        p.title,
        p.authors,
        p.abstract,
        p.url,
        p.pdf_path,
        p.tags,
        p.publish_date,
        p.journal,
        p.doi,
        p.created_at
    FROM papers p
    ORDER BY p.created_at DESC
    LIMIT p_limit;
END;
$function$;

-- Get papers statistics
CREATE OR REPLACE FUNCTION public.get_papers_stats()
RETURNS TABLE(total_papers bigint, total_sessions_with_papers bigint, avg_papers_per_session numeric, most_common_tag text, total_unique_tags bigint)
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(DISTINCT p.paper_id) as total_papers,
        COUNT(DISTINCT sp.session_id) as total_sessions_with_papers,
        CASE 
            WHEN COUNT(DISTINCT sp.session_id) > 0 
            THEN ROUND(COUNT(sp.paper_id)::NUMERIC / COUNT(DISTINCT sp.session_id), 2)
            ELSE 0::NUMERIC
        END as avg_papers_per_session,
        (
            SELECT tag
            FROM (
                SELECT UNNEST(tags) as tag, COUNT(*) as tag_count
                FROM papers
                GROUP BY UNNEST(tags)
                ORDER BY tag_count DESC
                LIMIT 1
            ) most_common
        ) as most_common_tag,
        (
            SELECT COUNT(DISTINCT UNNEST(tags))
            FROM papers
        ) as total_unique_tags
    FROM papers p
    LEFT JOIN session_papers sp ON p.paper_id = sp.paper_id;
END;
$function$;

-- Grant permissions
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO anon;

-- Add comments
COMMENT ON FUNCTION public.create_paper(text, text, text, text, text, text[], date, text, text) IS 'Creates a new research paper entry';
COMMENT ON FUNCTION public.get_paper_by_id(integer) IS 'Retrieves paper details by ID';
COMMENT ON FUNCTION public.get_all_papers(integer, integer) IS 'Returns all papers with pagination';
COMMENT ON FUNCTION public.update_paper(integer, text, text, text, text, text, text[], date, text, text) IS 'Updates paper information';
COMMENT ON FUNCTION public.delete_paper(integer) IS 'Permanently deletes a paper';
COMMENT ON FUNCTION public.search_papers(text, integer, integer) IS 'Searches papers by query with relevance scoring';
COMMENT ON FUNCTION public.search_papers_by_tags(text[], boolean, integer, integer) IS 'Searches papers by tags (any or all match)';
COMMENT ON FUNCTION public.add_paper_to_session(integer, integer, integer) IS 'Associates a paper with a session';
COMMENT ON FUNCTION public.remove_paper_from_session(integer, integer) IS 'Removes paper from session';
COMMENT ON FUNCTION public.get_session_papers(integer) IS 'Returns all papers associated with a session';
COMMENT ON FUNCTION public.get_popular_papers(integer) IS 'Returns papers ordered by session usage count';
COMMENT ON FUNCTION public.get_recent_papers(integer) IS 'Returns recently added papers';
COMMENT ON FUNCTION public.get_papers_stats() IS 'Returns statistics about papers and their usage';

-- =====================================================
-- VERIFICATION MESSAGE
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '✅ PAPER MANAGEMENT FUNCTIONS CREATED';
    RAISE NOTICE '📚 Ready for feedback system functions';
END $$;
