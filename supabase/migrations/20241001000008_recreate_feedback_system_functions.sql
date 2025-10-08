-- =====================================================
-- RECREATE FEEDBACK SYSTEM FUNCTIONS  
-- Date: 2024-10-01
-- Description: Feedback CRUD operations, statistics, and session feedback
-- =====================================================

-- Create feedback
CREATE OR REPLACE FUNCTION public.create_feedback(p_user_id integer, p_session_id integer DEFAULT NULL::integer, p_message_id integer DEFAULT NULL::integer, p_feedback_type character varying DEFAULT 'general'::character varying, p_rating integer DEFAULT NULL::integer, p_comment text DEFAULT ''::text, p_metadata jsonb DEFAULT '{}'::jsonb)
RETURNS TABLE(feedback_id integer, user_id integer, session_id integer, message_id integer, feedback_type character varying, rating integer, comment text, metadata jsonb, created_at timestamp without time zone)
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
    v_feedback_id INTEGER;
BEGIN
    -- Validate required fields
    IF p_user_id IS NULL THEN
        RAISE EXCEPTION 'User ID is required' USING ERRCODE = '23514';
    END IF;
    
    -- Validate feedback type
    IF p_feedback_type NOT IN ('general', 'session', 'message', 'paper', 'system') THEN
        RAISE EXCEPTION 'Invalid feedback type. Must be one of: general, session, message, paper, system' USING ERRCODE = '23514';
    END IF;
    
    -- Validate rating if provided
    IF p_rating IS NOT NULL AND (p_rating < 1 OR p_rating > 5) THEN
        RAISE EXCEPTION 'Rating must be between 1 and 5' USING ERRCODE = '23514';
    END IF;
    
    -- Validate that user exists
    IF NOT EXISTS (SELECT 1 FROM users WHERE user_id = p_user_id) THEN
        RAISE EXCEPTION 'User with ID % not found', p_user_id USING ERRCODE = 'P0002';
    END IF;
    
    -- Validate session if provided
    IF p_session_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM sessions WHERE session_id = p_session_id) THEN
        RAISE EXCEPTION 'Session with ID % not found', p_session_id USING ERRCODE = 'P0002';
    END IF;
    
    -- Validate message if provided
    IF p_message_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM messages WHERE message_id = p_message_id) THEN
        RAISE EXCEPTION 'Message with ID % not found', p_message_id USING ERRCODE = 'P0002';
    END IF;
    
    -- Insert new feedback
    INSERT INTO feedback (user_id, session_id, message_id, feedback_type, rating, comment, metadata, created_at)
    VALUES (p_user_id, p_session_id, p_message_id, p_feedback_type, p_rating, COALESCE(p_comment, ''), 
            COALESCE(p_metadata, '{}'::jsonb), CURRENT_TIMESTAMP)
    RETURNING feedback.feedback_id INTO v_feedback_id;
    
    -- Return the created feedback
    RETURN QUERY
    SELECT 
        v_feedback_id as feedback_id,
        p_user_id as user_id,
        p_session_id as session_id,
        p_message_id as message_id,
        p_feedback_type as feedback_type,
        p_rating as rating,
        COALESCE(p_comment, '') as comment,
        COALESCE(p_metadata, '{}'::jsonb) as metadata,
        CURRENT_TIMESTAMP as created_at;
END;
$function$;

-- Get feedback by ID
CREATE OR REPLACE FUNCTION public.get_feedback_by_id(p_feedback_id integer)
RETURNS TABLE(feedback_id integer, user_id integer, user_name text, session_id integer, session_title text, message_id integer, feedback_type character varying, rating integer, comment text, metadata jsonb, created_at timestamp without time zone, updated_at timestamp without time zone)
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
    RETURN QUERY
    SELECT 
        f.feedback_id,
        f.user_id,
        COALESCE(
            TRIM(CONCAT(u.first_name, ' ', u.last_name)), 
            u.email
        ) as user_name,
        f.session_id,
        s.topic as session_title,
        f.message_id,
        f.feedback_type,
        f.rating,
        f.comment,
        f.metadata,
        f.created_at,
        f.updated_at
    FROM feedback f
    JOIN users u ON f.user_id = u.user_id
    LEFT JOIN sessions s ON f.session_id = s.session_id
    WHERE f.feedback_id = p_feedback_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Feedback with ID % not found', p_feedback_id USING ERRCODE = 'P0002';
    END IF;
END;
$function$;

-- Get all feedback
CREATE OR REPLACE FUNCTION public.get_all_feedback(p_feedback_type character varying DEFAULT NULL::character varying, p_limit integer DEFAULT 50, p_offset integer DEFAULT 0)
RETURNS TABLE(feedback_id integer, user_id integer, user_name text, session_id integer, session_title text, message_id integer, feedback_type character varying, rating integer, comment text, metadata jsonb, created_at timestamp without time zone, updated_at timestamp without time zone)
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
    RETURN QUERY
    SELECT 
        f.feedback_id,
        f.user_id,
        COALESCE(
            TRIM(CONCAT(u.first_name, ' ', u.last_name)), 
            u.email
        ) as user_name,
        f.session_id,
        s.topic as session_title,
        f.message_id,
        f.feedback_type,
        f.rating,
        f.comment,
        f.metadata,
        f.created_at,
        f.updated_at
    FROM feedback f
    JOIN users u ON f.user_id = u.user_id
    LEFT JOIN sessions s ON f.session_id = s.session_id
    WHERE (p_feedback_type IS NULL OR f.feedback_type = p_feedback_type)
    ORDER BY f.created_at DESC
    LIMIT p_limit OFFSET p_offset;
END;
$function$;

-- Update feedback
CREATE OR REPLACE FUNCTION public.update_feedback(p_feedback_id integer, p_rating integer DEFAULT NULL::integer, p_comment text DEFAULT NULL::text, p_metadata jsonb DEFAULT NULL::jsonb)
RETURNS TABLE(feedback_id integer, user_id integer, session_id integer, message_id integer, feedback_type character varying, rating integer, comment text, metadata jsonb, created_at timestamp without time zone, updated_at timestamp without time zone)
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
    -- Check if feedback exists
    IF NOT EXISTS (SELECT 1 FROM feedback WHERE feedback_id = p_feedback_id) THEN
        RAISE EXCEPTION 'Feedback with ID % not found', p_feedback_id USING ERRCODE = 'P0002';
    END IF;
    
    -- Validate rating if provided
    IF p_rating IS NOT NULL AND (p_rating < 1 OR p_rating > 5) THEN
        RAISE EXCEPTION 'Rating must be between 1 and 5' USING ERRCODE = '23514';
    END IF;
    
    -- Update feedback with only provided values
    UPDATE feedback 
    SET 
        rating = COALESCE(p_rating, rating),
        comment = COALESCE(p_comment, comment),
        metadata = COALESCE(p_metadata, metadata),
        updated_at = CURRENT_TIMESTAMP
    WHERE feedback_id = p_feedback_id;
    
    -- Return updated feedback
    RETURN QUERY
    SELECT 
        f.feedback_id,
        f.user_id,
        f.session_id,
        f.message_id,
        f.feedback_type,
        f.rating,
        f.comment,
        f.metadata,
        f.created_at,
        f.updated_at
    FROM feedback f
    WHERE f.feedback_id = p_feedback_id;
END;
$function$;

-- Delete feedback
CREATE OR REPLACE FUNCTION public.delete_feedback(p_feedback_id integer)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
    -- Check if feedback exists
    IF NOT EXISTS (SELECT 1 FROM feedback WHERE feedback_id = p_feedback_id) THEN
        RAISE EXCEPTION 'Feedback with ID % not found', p_feedback_id USING ERRCODE = 'P0002';
    END IF;
    
    -- Delete feedback
    DELETE FROM feedback WHERE feedback_id = p_feedback_id;
    
    RETURN true;
END;
$function$;

-- Get user feedback
CREATE OR REPLACE FUNCTION public.get_user_feedback(p_user_id integer, p_limit integer DEFAULT 50, p_offset integer DEFAULT 0)
RETURNS TABLE(feedback_id integer, user_id integer, session_id integer, session_title text, message_id integer, feedback_type character varying, rating integer, comment text, metadata jsonb, created_at timestamp without time zone, updated_at timestamp without time zone)
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
    -- Validate that user exists
    IF NOT EXISTS (SELECT 1 FROM users WHERE user_id = p_user_id) THEN
        RAISE EXCEPTION 'User with ID % not found', p_user_id USING ERRCODE = 'P0002';
    END IF;
    
    RETURN QUERY
    SELECT 
        f.feedback_id,
        f.user_id,
        f.session_id,
        s.topic as session_title,
        f.message_id,
        f.feedback_type,
        f.rating,
        f.comment,
        f.metadata,
        f.created_at,
        f.updated_at
    FROM feedback f
    LEFT JOIN sessions s ON f.session_id = s.session_id
    WHERE f.user_id = p_user_id
    ORDER BY f.created_at DESC
    LIMIT p_limit OFFSET p_offset;
END;
$function$;

-- Get session feedback
CREATE OR REPLACE FUNCTION public.get_session_feedback(p_session_id integer, p_limit integer DEFAULT 50, p_offset integer DEFAULT 0)
RETURNS TABLE(feedback_id integer, user_id integer, user_name text, session_id integer, message_id integer, feedback_type character varying, rating integer, comment text, metadata jsonb, created_at timestamp without time zone, updated_at timestamp without time zone)
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
        f.feedback_id,
        f.user_id,
        COALESCE(
            TRIM(CONCAT(u.first_name, ' ', u.last_name)), 
            u.email
        ) as user_name,
        f.session_id,
        f.message_id,
        f.feedback_type,
        f.rating,
        f.comment,
        f.metadata,
        f.created_at,
        f.updated_at
    FROM feedback f
    JOIN users u ON f.user_id = u.user_id
    WHERE f.session_id = p_session_id
    ORDER BY f.created_at DESC
    LIMIT p_limit OFFSET p_offset;
END;
$function$;

-- =====================================================
-- FEEDBACK STATISTICS FUNCTIONS
-- =====================================================

-- Get feedback statistics
CREATE OR REPLACE FUNCTION public.get_feedback_stats()
RETURNS TABLE(total_feedback bigint, avg_rating numeric, rating_distribution jsonb, feedback_type_distribution jsonb, recent_feedback_count bigint)
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*) as total_feedback,
        CASE 
            WHEN COUNT(*) FILTER (WHERE rating IS NOT NULL) > 0 
            THEN ROUND(AVG(rating) FILTER (WHERE rating IS NOT NULL), 2)
            ELSE NULL::NUMERIC
        END as avg_rating,
        (
            SELECT jsonb_object_agg(rating::TEXT, count)
            FROM (
                SELECT rating, COUNT(*) as count
                FROM feedback
                WHERE rating IS NOT NULL
                GROUP BY rating
                ORDER BY rating
            ) rating_counts
        ) as rating_distribution,
        (
            SELECT jsonb_object_agg(feedback_type, count)
            FROM (
                SELECT feedback_type, COUNT(*) as count
                FROM feedback
                GROUP BY feedback_type
                ORDER BY count DESC
            ) type_counts
        ) as feedback_type_distribution,
        COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '7 days') as recent_feedback_count
    FROM feedback;
END;
$function$;

-- Get rating statistics by type
CREATE OR REPLACE FUNCTION public.get_rating_stats_by_type(p_feedback_type character varying DEFAULT NULL::character varying)
RETURNS TABLE(feedback_type character varying, total_ratings bigint, avg_rating numeric, min_rating integer, max_rating integer, rating_1 bigint, rating_2 bigint, rating_3 bigint, rating_4 bigint, rating_5 bigint)
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
    RETURN QUERY
    SELECT 
        f.feedback_type,
        COUNT(*) FILTER (WHERE f.rating IS NOT NULL) as total_ratings,
        CASE 
            WHEN COUNT(*) FILTER (WHERE f.rating IS NOT NULL) > 0 
            THEN ROUND(AVG(f.rating) FILTER (WHERE f.rating IS NOT NULL), 2)
            ELSE NULL::NUMERIC
        END as avg_rating,
        MIN(f.rating) as min_rating,
        MAX(f.rating) as max_rating,
        COUNT(*) FILTER (WHERE f.rating = 1) as rating_1,
        COUNT(*) FILTER (WHERE f.rating = 2) as rating_2,
        COUNT(*) FILTER (WHERE f.rating = 3) as rating_3,
        COUNT(*) FILTER (WHERE f.rating = 4) as rating_4,
        COUNT(*) FILTER (WHERE f.rating = 5) as rating_5
    FROM feedback f
    WHERE (p_feedback_type IS NULL OR f.feedback_type = p_feedback_type)
    GROUP BY f.feedback_type
    HAVING COUNT(*) FILTER (WHERE f.rating IS NOT NULL) > 0
    ORDER BY avg_rating DESC;
END;
$function$;

-- Get feedback trends
CREATE OR REPLACE FUNCTION public.get_feedback_trends(p_days integer DEFAULT 30)
RETURNS TABLE(date date, total_feedback bigint, avg_rating numeric, positive_feedback bigint, negative_feedback bigint)
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
    RETURN QUERY
    SELECT 
        f.created_at::DATE as date,
        COUNT(*) as total_feedback,
        CASE 
            WHEN COUNT(*) FILTER (WHERE f.rating IS NOT NULL) > 0 
            THEN ROUND(AVG(f.rating) FILTER (WHERE f.rating IS NOT NULL), 2)
            ELSE NULL::NUMERIC
        END as avg_rating,
        COUNT(*) FILTER (WHERE f.rating >= 4) as positive_feedback,
        COUNT(*) FILTER (WHERE f.rating <= 2) as negative_feedback
    FROM feedback f
    WHERE f.created_at >= CURRENT_DATE - INTERVAL '1 day' * p_days
    GROUP BY f.created_at::DATE
    ORDER BY date DESC;
END;
$function$;

-- Get session feedback summary
CREATE OR REPLACE FUNCTION public.get_session_feedback_summary(p_session_id integer)
RETURNS TABLE(session_id integer, session_title text, total_feedback bigint, avg_rating numeric, positive_feedback bigint, negative_feedback bigint, feedback_types jsonb, recent_feedback jsonb)
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
        COUNT(f.*) as total_feedback,
        CASE 
            WHEN COUNT(*) FILTER (WHERE f.rating IS NOT NULL) > 0 
            THEN ROUND(AVG(f.rating) FILTER (WHERE f.rating IS NOT NULL), 2)
            ELSE NULL::NUMERIC
        END as avg_rating,
        COUNT(*) FILTER (WHERE f.rating >= 4) as positive_feedback,
        COUNT(*) FILTER (WHERE f.rating <= 2) as negative_feedback,
        (
            SELECT jsonb_object_agg(feedback_type, count)
            FROM (
                SELECT feedback_type, COUNT(*) as count
                FROM feedback
                WHERE session_id = p_session_id
                GROUP BY feedback_type
            ) type_counts
        ) as feedback_types,
        (
            SELECT jsonb_agg(
                jsonb_build_object(
                    'feedback_id', feedback_id,
                    'rating', rating,
                    'comment', comment,
                    'created_at', created_at
                )
            )
            FROM (
                SELECT feedback_id, rating, comment, created_at
                FROM feedback
                WHERE session_id = p_session_id
                ORDER BY created_at DESC
                LIMIT 5
            ) recent
        ) as recent_feedback
    FROM sessions s
    LEFT JOIN feedback f ON s.session_id = f.session_id
    WHERE s.session_id = p_session_id
    GROUP BY s.session_id, s.topic;
END;
$function$;

-- Grant permissions
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO anon;

-- Add comments
COMMENT ON FUNCTION public.create_feedback(integer, integer, integer, character varying, integer, text, jsonb) IS 'Creates a new feedback entry';
COMMENT ON FUNCTION public.get_feedback_by_id(integer) IS 'Retrieves feedback details by ID';
COMMENT ON FUNCTION public.get_all_feedback(character varying, integer, integer) IS 'Returns all feedback with optional type filtering';
COMMENT ON FUNCTION public.update_feedback(integer, integer, text, jsonb) IS 'Updates feedback information';
COMMENT ON FUNCTION public.delete_feedback(integer) IS 'Permanently deletes feedback';
COMMENT ON FUNCTION public.get_user_feedback(integer, integer, integer) IS 'Returns all feedback from a specific user';
COMMENT ON FUNCTION public.get_session_feedback(integer, integer, integer) IS 'Returns all feedback for a specific session';
COMMENT ON FUNCTION public.get_feedback_stats() IS 'Returns overall feedback statistics';
COMMENT ON FUNCTION public.get_rating_stats_by_type(character varying) IS 'Returns rating statistics grouped by feedback type';
COMMENT ON FUNCTION public.get_feedback_trends(integer) IS 'Returns feedback trends over specified number of days';
COMMENT ON FUNCTION public.get_session_feedback_summary(integer) IS 'Returns comprehensive feedback summary for a session';

-- =====================================================
-- VERIFICATION MESSAGE
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '✅ FEEDBACK SYSTEM FUNCTIONS CREATED';
    RAISE NOTICE '📊 Ready for AI metadata functions';
END $$;
