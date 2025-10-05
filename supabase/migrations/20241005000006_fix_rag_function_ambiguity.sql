-- Fix ambiguous column references in RAG functions
-- Date: 2024-10-05

-- Fix enable_session_rag function
DROP FUNCTION IF EXISTS public.enable_session_rag(integer, integer);

CREATE OR REPLACE FUNCTION public.enable_session_rag(p_session_id integer, p_enabled_by integer)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
    v_result record;
BEGIN
    -- Check if session exists
    IF NOT EXISTS (SELECT 1 FROM sessions WHERE sessions.session_id = p_session_id) THEN
        RAISE EXCEPTION 'Session with ID % not found', p_session_id USING ERRCODE = 'P0002';
    END IF;
    
    -- Upsert session RAG status
    INSERT INTO session_rag_status (session_id, is_rag_enabled, rag_enabled_at, enabled_by, total_papers, processed_papers)
    VALUES (p_session_id, true, CURRENT_TIMESTAMP, p_enabled_by, 
            (SELECT COUNT(*) FROM session_papers sp WHERE sp.session_id = p_session_id),
            (SELECT COUNT(*) FROM rag_documents rd 
             JOIN session_papers sp ON rd.paper_id = sp.paper_id 
             WHERE sp.session_id = p_session_id AND rd.processing_status = 'completed'))
    ON CONFLICT (session_id) 
    DO UPDATE SET 
        is_rag_enabled = true,
        rag_enabled_at = CURRENT_TIMESTAMP,
        enabled_by = p_enabled_by,
        rag_disabled_at = NULL,
        total_papers = (SELECT COUNT(*) FROM session_papers sp WHERE sp.session_id = p_session_id),
        processed_papers = (SELECT COUNT(*) FROM rag_documents rd 
                           JOIN session_papers sp ON rd.paper_id = sp.paper_id 
                           WHERE sp.session_id = p_session_id AND rd.processing_status = 'completed'),
        updated_at = CURRENT_TIMESTAMP
    RETURNING * INTO v_result;
    
    RETURN json_build_object(
        'session_rag_id', v_result.session_rag_id,
        'session_id', v_result.session_id,
        'is_rag_enabled', v_result.is_rag_enabled,
        'rag_enabled_at', v_result.rag_enabled_at,
        'enabled_by', v_result.enabled_by,
        'total_papers', v_result.total_papers,
        'processed_papers', v_result.processed_papers
    );
END;
$function$;

-- Fix disable_session_rag function
DROP FUNCTION IF EXISTS public.disable_session_rag(integer);

CREATE OR REPLACE FUNCTION public.disable_session_rag(p_session_id integer)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
    v_result record;
BEGIN
    -- Check if session exists
    IF NOT EXISTS (SELECT 1 FROM sessions WHERE sessions.session_id = p_session_id) THEN
        RAISE EXCEPTION 'Session with ID % not found', p_session_id USING ERRCODE = 'P0002';
    END IF;
    
    -- Update session RAG status
    UPDATE session_rag_status 
    SET is_rag_enabled = false,
        rag_disabled_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
    WHERE session_rag_status.session_id = p_session_id
    RETURNING * INTO v_result;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Session RAG status not found for session %', p_session_id USING ERRCODE = 'P0002';
    END IF;
    
    RETURN json_build_object(
        'session_rag_id', v_result.session_rag_id,
        'session_id', v_result.session_id,
        'is_rag_enabled', v_result.is_rag_enabled,
        'rag_disabled_at', v_result.rag_disabled_at,
        'total_papers', v_result.total_papers,
        'processed_papers', v_result.processed_papers
    );
END;
$function$;

-- Fix get_session_rag_status function for consistency
DROP FUNCTION IF EXISTS public.get_session_rag_status(integer);

CREATE OR REPLACE FUNCTION public.get_session_rag_status(p_session_id integer)
RETURNS TABLE(
    session_rag_id integer,
    session_id integer,
    is_rag_enabled boolean,
    rag_enabled_at timestamp,
    enabled_by integer,
    enabled_by_name text,
    rag_disabled_at timestamp,
    total_papers integer,
    processed_papers integer,
    created_at timestamp,
    updated_at timestamp
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
    RETURN QUERY
    SELECT 
        srs.session_rag_id,
        srs.session_id,
        srs.is_rag_enabled,
        srs.rag_enabled_at,
        srs.enabled_by,
        u.email::text as enabled_by_name,
        srs.rag_disabled_at,
        srs.total_papers,
        srs.processed_papers,
        srs.created_at,
        srs.updated_at
    FROM session_rag_status srs
    LEFT JOIN users u ON srs.enabled_by = u.user_id
    WHERE srs.session_id = p_session_id;
END;
$function$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.enable_session_rag(integer, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.disable_session_rag(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_session_rag_status(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_session_rag_status(integer) TO anon;