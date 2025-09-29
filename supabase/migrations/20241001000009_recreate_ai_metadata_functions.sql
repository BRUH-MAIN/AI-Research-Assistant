-- =====================================================
-- RECREATE AI METADATA FUNCTIONS
-- Date: 2024-10-01
-- Description: AI processing tracking, performance stats, and usage analytics
-- =====================================================

-- Create AI metadata
CREATE OR REPLACE FUNCTION public.create_ai_metadata(p_session_id integer, p_message_id integer DEFAULT NULL::integer, p_model_name character varying DEFAULT 'gpt-3.5-turbo'::character varying, p_prompt_tokens integer DEFAULT 0, p_completion_tokens integer DEFAULT 0, p_total_tokens integer DEFAULT 0, p_response_time_ms integer DEFAULT 0, p_metadata jsonb DEFAULT '{}'::jsonb)
RETURNS TABLE(ai_metadata_id integer, session_id integer, message_id integer, model_name character varying, prompt_tokens integer, completion_tokens integer, total_tokens integer, response_time_ms integer, metadata jsonb, created_at timestamp without time zone)
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
    v_ai_metadata_id INTEGER;
BEGIN
    -- Validate required fields
    IF p_session_id IS NULL THEN
        RAISE EXCEPTION 'Session ID is required' USING ERRCODE = '23514';
    END IF;
    
    -- Validate that session exists
    IF NOT EXISTS (SELECT 1 FROM sessions WHERE session_id = p_session_id) THEN
        RAISE EXCEPTION 'Session with ID % not found', p_session_id USING ERRCODE = 'P0002';
    END IF;
    
    -- Validate message if provided
    IF p_message_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM messages WHERE message_id = p_message_id) THEN
        RAISE EXCEPTION 'Message with ID % not found', p_message_id USING ERRCODE = 'P0002';
    END IF;
    
    -- Validate token counts (non-negative)
    IF p_prompt_tokens < 0 OR p_completion_tokens < 0 OR p_total_tokens < 0 THEN
        RAISE EXCEPTION 'Token counts must be non-negative' USING ERRCODE = '23514';
    END IF;
    
    -- Validate response time (non-negative)
    IF p_response_time_ms < 0 THEN
        RAISE EXCEPTION 'Response time must be non-negative' USING ERRCODE = '23514';
    END IF;
    
    -- Insert new AI metadata
    INSERT INTO ai_metadata (session_id, message_id, model_name, prompt_tokens, completion_tokens, total_tokens, response_time_ms, metadata, created_at)
    VALUES (p_session_id, p_message_id, COALESCE(p_model_name, 'gpt-3.5-turbo'), p_prompt_tokens, p_completion_tokens, p_total_tokens, p_response_time_ms, COALESCE(p_metadata, '{}'::jsonb), CURRENT_TIMESTAMP)
    RETURNING ai_metadata.ai_metadata_id INTO v_ai_metadata_id;
    
    -- Return the created AI metadata
    RETURN QUERY
    SELECT 
        v_ai_metadata_id as ai_metadata_id,
        p_session_id as session_id,
        p_message_id as message_id,
        COALESCE(p_model_name, 'gpt-3.5-turbo') as model_name,
        p_prompt_tokens as prompt_tokens,
        p_completion_tokens as completion_tokens,
        p_total_tokens as total_tokens,
        p_response_time_ms as response_time_ms,
        COALESCE(p_metadata, '{}'::jsonb) as metadata,
        CURRENT_TIMESTAMP as created_at;
END;
$function$;

-- Get AI metadata by ID
CREATE OR REPLACE FUNCTION public.get_ai_metadata_by_id(p_ai_metadata_id integer)
RETURNS TABLE(ai_metadata_id integer, session_id integer, session_title text, message_id integer, model_name character varying, prompt_tokens integer, completion_tokens integer, total_tokens integer, response_time_ms integer, metadata jsonb, created_at timestamp without time zone, updated_at timestamp without time zone)
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
    RETURN QUERY
    SELECT 
        am.ai_metadata_id,
        am.session_id,
        s.topic as session_title,
        am.message_id,
        am.model_name,
        am.prompt_tokens,
        am.completion_tokens,
        am.total_tokens,
        am.response_time_ms,
        am.metadata,
        am.created_at,
        am.updated_at
    FROM ai_metadata am
    LEFT JOIN sessions s ON am.session_id = s.session_id
    WHERE am.ai_metadata_id = p_ai_metadata_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'AI metadata with ID % not found', p_ai_metadata_id USING ERRCODE = 'P0002';
    END IF;
END;
$function$;

-- Get all AI metadata
CREATE OR REPLACE FUNCTION public.get_all_ai_metadata(p_limit integer DEFAULT 100, p_offset integer DEFAULT 0)
RETURNS TABLE(ai_metadata_id integer, session_id integer, session_title text, message_id integer, model_name character varying, prompt_tokens integer, completion_tokens integer, total_tokens integer, response_time_ms integer, metadata jsonb, created_at timestamp without time zone, updated_at timestamp without time zone)
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
    RETURN QUERY
    SELECT 
        am.ai_metadata_id,
        am.session_id,
        s.topic as session_title,
        am.message_id,
        am.model_name,
        am.prompt_tokens,
        am.completion_tokens,
        am.total_tokens,
        am.response_time_ms,
        am.metadata,
        am.created_at,
        am.updated_at
    FROM ai_metadata am
    LEFT JOIN sessions s ON am.session_id = s.session_id
    ORDER BY am.created_at DESC
    LIMIT p_limit OFFSET p_offset;
END;
$function$;

-- Update AI metadata
CREATE OR REPLACE FUNCTION public.update_ai_metadata(p_ai_metadata_id integer, p_model_name character varying DEFAULT NULL::character varying, p_prompt_tokens integer DEFAULT NULL::integer, p_completion_tokens integer DEFAULT NULL::integer, p_total_tokens integer DEFAULT NULL::integer, p_response_time_ms integer DEFAULT NULL::integer, p_metadata jsonb DEFAULT NULL::jsonb)
RETURNS TABLE(ai_metadata_id integer, session_id integer, message_id integer, model_name character varying, prompt_tokens integer, completion_tokens integer, total_tokens integer, response_time_ms integer, metadata jsonb, created_at timestamp without time zone, updated_at timestamp without time zone)
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
    -- Check if AI metadata exists
    IF NOT EXISTS (SELECT 1 FROM ai_metadata WHERE ai_metadata_id = p_ai_metadata_id) THEN
        RAISE EXCEPTION 'AI metadata with ID % not found', p_ai_metadata_id USING ERRCODE = 'P0002';
    END IF;
    
    -- Validate token counts if provided (non-negative)
    IF (p_prompt_tokens IS NOT NULL AND p_prompt_tokens < 0) OR
       (p_completion_tokens IS NOT NULL AND p_completion_tokens < 0) OR
       (p_total_tokens IS NOT NULL AND p_total_tokens < 0) THEN
        RAISE EXCEPTION 'Token counts must be non-negative' USING ERRCODE = '23514';
    END IF;
    
    -- Validate response time if provided (non-negative)
    IF p_response_time_ms IS NOT NULL AND p_response_time_ms < 0 THEN
        RAISE EXCEPTION 'Response time must be non-negative' USING ERRCODE = '23514';
    END IF;
    
    -- Update AI metadata with only provided values
    UPDATE ai_metadata 
    SET 
        model_name = COALESCE(p_model_name, model_name),
        prompt_tokens = COALESCE(p_prompt_tokens, prompt_tokens),
        completion_tokens = COALESCE(p_completion_tokens, completion_tokens),
        total_tokens = COALESCE(p_total_tokens, total_tokens),
        response_time_ms = COALESCE(p_response_time_ms, response_time_ms),
        metadata = COALESCE(p_metadata, metadata),
        updated_at = CURRENT_TIMESTAMP
    WHERE ai_metadata_id = p_ai_metadata_id;
    
    -- Return updated AI metadata
    RETURN QUERY
    SELECT 
        am.ai_metadata_id,
        am.session_id,
        am.message_id,
        am.model_name,
        am.prompt_tokens,
        am.completion_tokens,
        am.total_tokens,
        am.response_time_ms,
        am.metadata,
        am.created_at,
        am.updated_at
    FROM ai_metadata am
    WHERE am.ai_metadata_id = p_ai_metadata_id;
END;
$function$;

-- Delete AI metadata
CREATE OR REPLACE FUNCTION public.delete_ai_metadata(p_ai_metadata_id integer)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
    -- Check if AI metadata exists
    IF NOT EXISTS (SELECT 1 FROM ai_metadata WHERE ai_metadata_id = p_ai_metadata_id) THEN
        RAISE EXCEPTION 'AI metadata with ID % not found', p_ai_metadata_id USING ERRCODE = 'P0002';
    END IF;
    
    -- Delete AI metadata
    DELETE FROM ai_metadata WHERE ai_metadata_id = p_ai_metadata_id;
    
    RETURN true;
END;
$function$;

-- Get session AI metadata
CREATE OR REPLACE FUNCTION public.get_session_ai_metadata(p_session_id integer, p_limit integer DEFAULT 50, p_offset integer DEFAULT 0)
RETURNS TABLE(ai_metadata_id integer, session_id integer, message_id integer, model_name character varying, prompt_tokens integer, completion_tokens integer, total_tokens integer, response_time_ms integer, metadata jsonb, created_at timestamp without time zone, updated_at timestamp without time zone)
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
        am.ai_metadata_id,
        am.session_id,
        am.message_id,
        am.model_name,
        am.prompt_tokens,
        am.completion_tokens,
        am.total_tokens,
        am.response_time_ms,
        am.metadata,
        am.created_at,
        am.updated_at
    FROM ai_metadata am
    WHERE am.session_id = p_session_id
    ORDER BY am.created_at DESC
    LIMIT p_limit OFFSET p_offset;
END;
$function$;

-- =====================================================
-- AI PERFORMANCE AND USAGE ANALYTICS FUNCTIONS
-- =====================================================

-- Get AI usage statistics
CREATE OR REPLACE FUNCTION public.get_ai_usage_stats()
RETURNS TABLE(total_requests bigint, total_prompt_tokens bigint, total_completion_tokens bigint, total_tokens bigint, avg_response_time_ms numeric, most_used_model text, unique_sessions bigint, requests_today bigint, requests_this_week bigint, requests_this_month bigint)
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*) as total_requests,
        SUM(prompt_tokens) as total_prompt_tokens,
        SUM(completion_tokens) as total_completion_tokens,
        SUM(total_tokens) as total_tokens,
        CASE 
            WHEN COUNT(*) > 0 
            THEN ROUND(AVG(response_time_ms), 2)
            ELSE NULL::NUMERIC
        END as avg_response_time_ms,
        (
            SELECT model_name
            FROM (
                SELECT model_name, COUNT(*) as usage_count
                FROM ai_metadata
                GROUP BY model_name
                ORDER BY usage_count DESC
                LIMIT 1
            ) most_common
        ) as most_used_model,
        COUNT(DISTINCT session_id) as unique_sessions,
        COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE) as requests_today,
        COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '7 days') as requests_this_week,
        COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '30 days') as requests_this_month
    FROM ai_metadata;
END;
$function$;

-- Get AI model performance statistics
CREATE OR REPLACE FUNCTION public.get_ai_model_performance_stats(p_model_name character varying DEFAULT NULL::character varying)
RETURNS TABLE(model_name character varying, total_requests bigint, avg_prompt_tokens numeric, avg_completion_tokens numeric, avg_total_tokens numeric, avg_response_time_ms numeric, min_response_time_ms integer, max_response_time_ms integer, total_cost_estimate numeric)
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
    RETURN QUERY
    SELECT 
        am.model_name,
        COUNT(*) as total_requests,
        ROUND(AVG(am.prompt_tokens), 2) as avg_prompt_tokens,
        ROUND(AVG(am.completion_tokens), 2) as avg_completion_tokens,
        ROUND(AVG(am.total_tokens), 2) as avg_total_tokens,
        ROUND(AVG(am.response_time_ms), 2) as avg_response_time_ms,
        MIN(am.response_time_ms) as min_response_time_ms,
        MAX(am.response_time_ms) as max_response_time_ms,
        -- Rough cost estimate based on typical pricing (this would need real pricing data)
        CASE 
            WHEN am.model_name LIKE '%gpt-4%' THEN ROUND((SUM(am.prompt_tokens) * 0.00003 + SUM(am.completion_tokens) * 0.00006), 4)
            WHEN am.model_name LIKE '%gpt-3.5%' THEN ROUND((SUM(am.prompt_tokens) * 0.0000015 + SUM(am.completion_tokens) * 0.000002), 4)
            ELSE ROUND((SUM(am.total_tokens) * 0.000001), 4) -- Default estimate
        END as total_cost_estimate
    FROM ai_metadata am
    WHERE (p_model_name IS NULL OR am.model_name = p_model_name)
    GROUP BY am.model_name
    HAVING COUNT(*) > 0
    ORDER BY total_requests DESC;
END;
$function$;

-- Get AI usage trends
CREATE OR REPLACE FUNCTION public.get_ai_usage_trends(p_days integer DEFAULT 30)
RETURNS TABLE(date date, total_requests bigint, total_tokens bigint, avg_response_time_ms numeric, unique_sessions bigint, cost_estimate numeric)
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
    RETURN QUERY
    SELECT 
        am.created_at::DATE as date,
        COUNT(*) as total_requests,
        SUM(am.total_tokens) as total_tokens,
        ROUND(AVG(am.response_time_ms), 2) as avg_response_time_ms,
        COUNT(DISTINCT am.session_id) as unique_sessions,
        -- Simple cost estimate
        ROUND(SUM(
            CASE 
                WHEN am.model_name LIKE '%gpt-4%' THEN (am.prompt_tokens * 0.00003 + am.completion_tokens * 0.00006)
                WHEN am.model_name LIKE '%gpt-3.5%' THEN (am.prompt_tokens * 0.0000015 + am.completion_tokens * 0.000002)
                ELSE (am.total_tokens * 0.000001)
            END
        ), 4) as cost_estimate
    FROM ai_metadata am
    WHERE am.created_at >= CURRENT_DATE - INTERVAL '1 day' * p_days
    GROUP BY am.created_at::DATE
    ORDER BY date DESC;
END;
$function$;

-- Get session AI performance summary
CREATE OR REPLACE FUNCTION public.get_session_ai_performance(p_session_id integer)
RETURNS TABLE(session_id integer, session_title text, total_ai_requests bigint, total_tokens bigint, avg_response_time_ms numeric, models_used jsonb, total_cost_estimate numeric, first_ai_request timestamp without time zone, last_ai_request timestamp without time zone)
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
        p_session_id as session_id,
        s.topic as session_title,
        COUNT(am.*) as total_ai_requests,
        COALESCE(SUM(am.total_tokens), 0) as total_tokens,
        CASE 
            WHEN COUNT(am.*) > 0 
            THEN ROUND(AVG(am.response_time_ms), 2)
            ELSE NULL::NUMERIC
        END as avg_response_time_ms,
        (
            SELECT jsonb_object_agg(model_name, request_count)
            FROM (
                SELECT model_name, COUNT(*) as request_count
                FROM ai_metadata
                WHERE session_id = p_session_id
                GROUP BY model_name
            ) model_counts
        ) as models_used,
        -- Cost estimate for this session
        COALESCE(ROUND(SUM(
            CASE 
                WHEN am.model_name LIKE '%gpt-4%' THEN (am.prompt_tokens * 0.00003 + am.completion_tokens * 0.00006)
                WHEN am.model_name LIKE '%gpt-3.5%' THEN (am.prompt_tokens * 0.0000015 + am.completion_tokens * 0.000002)
                ELSE (am.total_tokens * 0.000001)
            END
        ), 4), 0) as total_cost_estimate,
        MIN(am.created_at) as first_ai_request,
        MAX(am.created_at) as last_ai_request
    FROM sessions s
    LEFT JOIN ai_metadata am ON s.session_id = am.session_id
    WHERE s.session_id = p_session_id
    GROUP BY s.session_id, s.topic;
END;
$function$;

-- Get top performing sessions by AI usage
CREATE OR REPLACE FUNCTION public.get_top_ai_usage_sessions(p_limit integer DEFAULT 10)
RETURNS TABLE(session_id integer, session_title text, total_ai_requests bigint, total_tokens bigint, avg_response_time_ms numeric, total_cost_estimate numeric, created_by integer, creator_name text, session_created_at timestamp without time zone)
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
    RETURN QUERY
    SELECT 
        s.session_id,
        s.topic as session_title,
        COUNT(am.*) as total_ai_requests,
        COALESCE(SUM(am.total_tokens), 0) as total_tokens,
        CASE 
            WHEN COUNT(am.*) > 0 
            THEN ROUND(AVG(am.response_time_ms), 2)
            ELSE NULL::NUMERIC
        END as avg_response_time_ms,
        COALESCE(ROUND(SUM(
            CASE 
                WHEN am.model_name LIKE '%gpt-4%' THEN (am.prompt_tokens * 0.00003 + am.completion_tokens * 0.00006)
                WHEN am.model_name LIKE '%gpt-3.5%' THEN (am.prompt_tokens * 0.0000015 + am.completion_tokens * 0.000002)
                ELSE (am.total_tokens * 0.000001)
            END
        ), 4), 0) as total_cost_estimate,
        s.created_by,
        COALESCE(
            TRIM(CONCAT(u.first_name, ' ', u.last_name)), 
            u.email
        ) as creator_name,
        s.started_at as session_created_at
    FROM sessions s
    LEFT JOIN ai_metadata am ON s.session_id = am.session_id
    LEFT JOIN users u ON s.created_by = u.user_id
    GROUP BY s.session_id, s.topic, s.created_by, u.first_name, u.last_name, u.email, s.started_at
    HAVING COUNT(am.*) > 0
    ORDER BY total_ai_requests DESC, total_tokens DESC
    LIMIT p_limit;
END;
$function$;

-- Grant permissions
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO anon;

-- Add comments
COMMENT ON FUNCTION public.create_ai_metadata(integer, integer, character varying, integer, integer, integer, integer, jsonb) IS 'Creates AI processing metadata entry';
COMMENT ON FUNCTION public.get_ai_metadata_by_id(integer) IS 'Retrieves AI metadata details by ID';
COMMENT ON FUNCTION public.get_all_ai_metadata(integer, integer) IS 'Returns all AI metadata with pagination';
COMMENT ON FUNCTION public.update_ai_metadata(integer, character varying, integer, integer, integer, integer, jsonb) IS 'Updates AI metadata information';
COMMENT ON FUNCTION public.delete_ai_metadata(integer) IS 'Permanently deletes AI metadata';
COMMENT ON FUNCTION public.get_session_ai_metadata(integer, integer, integer) IS 'Returns AI metadata for a specific session';
COMMENT ON FUNCTION public.get_ai_usage_stats() IS 'Returns overall AI usage statistics';
COMMENT ON FUNCTION public.get_ai_model_performance_stats(character varying) IS 'Returns performance statistics by AI model';
COMMENT ON FUNCTION public.get_ai_usage_trends(integer) IS 'Returns AI usage trends over specified days';
COMMENT ON FUNCTION public.get_session_ai_performance(integer) IS 'Returns AI performance summary for a session';
COMMENT ON FUNCTION public.get_top_ai_usage_sessions(integer) IS 'Returns sessions with highest AI usage';

-- =====================================================
-- VERIFICATION MESSAGE
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '✅ AI METADATA FUNCTIONS CREATED';
    RAISE NOTICE '🤖 Ready for authentication functions';
END $$;
