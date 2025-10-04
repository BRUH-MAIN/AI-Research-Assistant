-- =====================================================
-- FIX SESSION PAPERS FUNCTION SCHEMA MISMATCH
-- Date: 2024-10-03
-- Description: Fix get_session_papers function to match current session_papers table schema
-- =====================================================

-- Drop the existing function that expects added_by column
DROP FUNCTION IF EXISTS public.get_session_papers(integer);

-- Recreate function to match current schema (without added_by column)
CREATE OR REPLACE FUNCTION public.get_session_papers(p_session_id integer)
RETURNS TABLE(paper_id integer, title text, abstract text, authors text, doi text, added_at timestamp without time zone)
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
        p.paper_id::INTEGER,
        p.title,
        p.abstract,
        p.authors,
        p.doi,
        sp.added_at
    FROM session_papers sp
    JOIN papers p ON sp.paper_id = p.paper_id
    WHERE sp.session_id = p_session_id
    ORDER BY sp.added_at DESC;
END;
$function$;

-- Also fix add_paper_to_session function to match current schema (without added_by parameter)
DROP FUNCTION IF EXISTS public.add_paper_to_session(integer, integer, integer);

CREATE OR REPLACE FUNCTION public.add_paper_to_session(p_session_id integer, p_paper_id integer)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
    -- Check if session exists
    IF NOT EXISTS (SELECT 1 FROM sessions WHERE session_id = p_session_id) THEN
        RAISE EXCEPTION 'Session with ID % not found', p_session_id USING ERRCODE = 'P0002';
    END IF;
    
    -- Check if paper exists
    IF NOT EXISTS (SELECT 1 FROM papers WHERE paper_id = p_paper_id) THEN
        RAISE EXCEPTION 'Paper with ID % not found', p_paper_id USING ERRCODE = 'P0002';
    END IF;
    
    -- Check if paper is already in session
    IF EXISTS (SELECT 1 FROM session_papers WHERE session_id = p_session_id AND paper_id = p_paper_id) THEN
        RAISE EXCEPTION 'Paper % is already in session %', p_paper_id, p_session_id USING ERRCODE = '23505';
    END IF;
    
    -- Add paper to session
    INSERT INTO session_papers (session_id, paper_id, added_at)
    VALUES (p_session_id, p_paper_id, CURRENT_TIMESTAMP);
    
    RETURN json_build_object('message', 'Paper ' || p_paper_id || ' added to session ' || p_session_id);
END;
$function$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.get_session_papers(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_session_papers(integer) TO anon;
GRANT EXECUTE ON FUNCTION public.add_paper_to_session(integer, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.add_paper_to_session(integer, integer) TO anon;

-- Add comments
COMMENT ON FUNCTION public.get_session_papers(integer) IS 'Retrieves papers associated with a session (fixed schema)';
COMMENT ON FUNCTION public.add_paper_to_session(integer, integer) IS 'Links a paper to a session (fixed schema)';

-- Verification message
DO $$
BEGIN
    RAISE NOTICE '✅ SESSION PAPERS FUNCTION FIXED';
    RAISE NOTICE '📝 Fixed get_session_papers to match current schema';
    RAISE NOTICE '📝 Fixed add_paper_to_session to match current schema';
    RAISE NOTICE '🔗 Paper management functionality should now work correctly';
END $$;