-- Fix ambiguous column reference in enable_session_rag function
-- Date: 2024-10-05

-- Drop and recreate the function with explicit table prefixing
DROP FUNCTION IF EXISTS public.enable_session_rag(integer, integer);

CREATE OR REPLACE FUNCTION public.enable_session_rag(
    p_session_id integer,
    p_enabled_by integer
)
RETURNS TABLE(session_rag_id integer, session_id integer, is_rag_enabled boolean, rag_enabled_at timestamp)
LANGUAGE plpgsql
AS $$
BEGIN
    -- Check if session exists
    IF NOT EXISTS (SELECT 1 FROM sessions WHERE sessions.session_id = p_session_id) THEN
        RAISE EXCEPTION 'Session with ID % not found', p_session_id USING ERRCODE = 'P0002';
    END IF;

    -- Upsert session RAG status
    INSERT INTO session_rag_status (session_id, is_rag_enabled, rag_enabled_at, enabled_by)
    VALUES (p_session_id, true, CURRENT_TIMESTAMP, p_enabled_by)
    ON CONFLICT (session_id) 
    DO UPDATE SET 
        is_rag_enabled = true,
        rag_enabled_at = CURRENT_TIMESTAMP,
        enabled_by = p_enabled_by,
        updated_at = CURRENT_TIMESTAMP;

    RETURN QUERY
    SELECT 
        srs.session_rag_id::INTEGER,
        srs.session_id::INTEGER,
        srs.is_rag_enabled::BOOLEAN,
        srs.rag_enabled_at::TIMESTAMP
    FROM session_rag_status srs
    WHERE srs.session_id = p_session_id;
END;
$$;