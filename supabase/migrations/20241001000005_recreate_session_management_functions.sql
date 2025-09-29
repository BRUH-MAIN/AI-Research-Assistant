-- =====================================================
-- RECREATE SESSION MANAGEMENT FUNCTIONS
-- Date: 2024-10-01
-- Description: Session CRUD operations and session participation management
-- =====================================================

-- Create session (with group, creator, topic)
CREATE OR REPLACE FUNCTION public.create_session(p_group_id integer, p_created_by integer, p_topic text DEFAULT NULL::text, p_status character varying DEFAULT 'active'::character varying)
RETURNS TABLE(id integer, title text, description text, created_by integer, group_id integer, created_at timestamp without time zone, started_at timestamp without time zone, ended_at timestamp without time zone, status character varying, participant_count bigint)
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
    v_session_id INTEGER;
BEGIN
    -- Validate that group exists
    IF NOT EXISTS (SELECT 1 FROM groups WHERE group_id = p_group_id) THEN
        RAISE EXCEPTION 'Group with ID % not found', p_group_id USING ERRCODE = 'P0002';
    END IF;
    
    -- Validate that user exists and is member of group
    IF NOT EXISTS (
        SELECT 1 FROM group_participants gp 
        WHERE gp.group_id = p_group_id AND gp.user_id = p_created_by
    ) THEN
        RAISE EXCEPTION 'User % is not a member of group %', p_created_by, p_group_id USING ERRCODE = 'P0002';
    END IF;
    
    -- Insert new session
    INSERT INTO sessions (group_id, created_by, topic, status, started_at)
    VALUES (p_group_id, p_created_by, p_topic, p_status, CURRENT_TIMESTAMP)
    RETURNING session_id INTO v_session_id;
    
    -- Add creator as participant
    INSERT INTO session_participants (session_id, user_id)
    VALUES (v_session_id, p_created_by)
    ON CONFLICT (session_id, user_id) DO NOTHING;
    
    -- Return created session
    RETURN QUERY
    SELECT 
        v_session_id as id,
        COALESCE(p_topic, 'Untitled Session') as title,
        ''::TEXT as description,
        p_created_by as created_by,
        p_group_id as group_id,
        CURRENT_TIMESTAMP as created_at,
        CURRENT_TIMESTAMP as started_at,
        NULL::TIMESTAMP as ended_at,
        p_status as status,
        1::BIGINT as participant_count;
END;
$function$;

-- Create session (simple with title and user)
CREATE OR REPLACE FUNCTION public.create_session(p_title text, p_user_id integer, p_group_id integer DEFAULT 1)
RETURNS TABLE(id integer, title text, description text, created_by integer, group_id integer, created_at timestamp without time zone, started_at timestamp without time zone, ended_at timestamp without time zone, status text, participant_count bigint)
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
    v_session_id INTEGER;
    v_final_title TEXT;
BEGIN
    -- Validate user exists
    IF NOT EXISTS (SELECT 1 FROM users u WHERE u.user_id = p_user_id) THEN
        RAISE EXCEPTION 'User with ID % not found', p_user_id USING ERRCODE = 'P0002';
    END IF;
    
    -- Validate group exists
    IF NOT EXISTS (SELECT 1 FROM groups g WHERE g.group_id = p_group_id) THEN
        RAISE EXCEPTION 'Group with ID % not found', p_group_id USING ERRCODE = 'P0002';
    END IF;
    
    -- Set default title if not provided
    v_final_title := COALESCE(p_title, 'Session ' || TO_CHAR(CURRENT_TIMESTAMP, 'YYYYMMDD_HH24MISS'));
    
    -- Insert new session
    INSERT INTO sessions (group_id, created_by, topic, status, started_at)
    VALUES (p_group_id, p_user_id, v_final_title, 'active', CURRENT_TIMESTAMP)
    RETURNING session_id INTO v_session_id;
    
    -- Ensure user is a participant in the group
    INSERT INTO group_participants (group_id, user_id, role)
    VALUES (p_group_id, p_user_id, 'member')
    ON CONFLICT ON CONSTRAINT group_participants_group_id_user_id_key DO NOTHING;
    
    -- Return the created session
    RETURN QUERY
    SELECT 
        v_session_id as id,
        v_final_title as title,
        ''::TEXT as description,
        p_user_id as created_by,
        p_group_id as group_id,
        CURRENT_TIMESTAMP as created_at,
        CURRENT_TIMESTAMP as started_at,
        null::timestamp as ended_at,
        'active'::TEXT as status,
        0::BIGINT as participant_count;
END;
$function$;

-- Get session by ID
CREATE OR REPLACE FUNCTION public.get_session_by_id(p_session_id integer)
RETURNS TABLE(id integer, title text, description text, created_by integer, group_id integer, created_at timestamp without time zone, started_at timestamp without time zone, ended_at timestamp without time zone, status character varying, participant_count bigint)
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
    RETURN QUERY
    SELECT 
        s.session_id::INTEGER as id,
        COALESCE(s.topic, 'Untitled Session') as title,
        ''::TEXT as description,
        s.created_by::INTEGER as created_by,
        s.group_id::INTEGER as group_id,
        s.started_at as created_at,
        s.started_at as started_at,
        s.ended_at as ended_at,
        s.status as status,
        COUNT(DISTINCT sp.user_id) as participant_count
    FROM sessions s
    LEFT JOIN session_participants sp ON s.session_id = sp.session_id
    WHERE s.session_id = p_session_id
    GROUP BY s.session_id, s.topic, s.created_by, s.group_id, s.started_at, s.ended_at, s.status;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Session with ID % not found', p_session_id USING ERRCODE = 'P0002';
    END IF;
END;
$function$;

-- Get session by title
CREATE OR REPLACE FUNCTION public.get_session_by_title(p_title text)
RETURNS TABLE(id integer, title text)
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
    RETURN QUERY
    SELECT 
        s.session_id::INTEGER as id,
        s.topic as title
    FROM sessions s
    WHERE LOWER(s.topic) = LOWER(p_title)
    LIMIT 1;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Session with title ''%'' not found', p_title USING ERRCODE = 'P0002';
    END IF;
END;
$function$;

-- Get all sessions
CREATE OR REPLACE FUNCTION public.get_all_sessions(p_user_id integer DEFAULT NULL::integer, p_is_active boolean DEFAULT NULL::boolean)
RETURNS TABLE(id integer, title text, description text, created_by integer, group_id integer, created_at timestamp without time zone, started_at timestamp without time zone, ended_at timestamp without time zone, status character varying, participant_count bigint)
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
    RETURN QUERY
    SELECT 
        s.session_id::INTEGER as id,
        COALESCE(s.topic, 'Untitled Session') as title,
        ''::TEXT as description,
        s.created_by::INTEGER as created_by,
        s.group_id::INTEGER as group_id,
        s.started_at as created_at,
        s.started_at as started_at,
        s.ended_at as ended_at,
        s.status as status,
        COUNT(DISTINCT sp.user_id) as participant_count
    FROM sessions s
    LEFT JOIN session_participants sp ON s.session_id = sp.session_id
    WHERE (p_user_id IS NULL OR s.created_by = p_user_id)
      AND (p_is_active IS NULL OR 
           (p_is_active = true AND s.status = 'active') OR
           (p_is_active = false AND s.status != 'active'))
    GROUP BY s.session_id, s.topic, s.created_by, s.group_id, s.started_at, s.ended_at, s.status
    ORDER BY s.session_id;
END;
$function$;

-- Update session
CREATE OR REPLACE FUNCTION public.update_session(p_session_id integer, p_title text DEFAULT NULL::text, p_status text DEFAULT NULL::text)
RETURNS TABLE(id integer, title text, description text, created_by integer, group_id integer, created_at timestamp without time zone, started_at timestamp without time zone, ended_at timestamp without time zone, status text, participant_count bigint)
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
    v_ended_at TIMESTAMP := NULL;
BEGIN
    -- Check if session exists
    IF NOT EXISTS (SELECT 1 FROM sessions WHERE session_id = p_session_id) THEN
        RAISE EXCEPTION 'Session with ID % not found', p_session_id USING ERRCODE = 'P0002';
    END IF;
    
    -- Validate status if provided
    IF p_status IS NOT NULL AND p_status NOT IN ('offline', 'active', 'completed') THEN
        RAISE EXCEPTION 'Invalid status. Must be offline, active, or completed' USING ERRCODE = '23514';
    END IF;
    
    -- Set ended_at if status is being changed to completed
    IF p_status = 'completed' THEN
        v_ended_at := CURRENT_TIMESTAMP;
    END IF;
    
    -- Update session with provided values
    UPDATE sessions 
    SET 
        topic = COALESCE(p_title, topic),
        status = COALESCE(p_status, status),
        ended_at = CASE WHEN p_status = 'completed' THEN v_ended_at ELSE ended_at END
    WHERE session_id = p_session_id;
    
    -- Return updated session using get_session_by_id
    RETURN QUERY
    SELECT * FROM get_session_by_id(p_session_id);
END;
$function$;

-- Delete session
CREATE OR REPLACE FUNCTION public.delete_session(p_session_id integer)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
    -- Check if session exists
    IF NOT EXISTS (SELECT 1 FROM sessions WHERE session_id = p_session_id) THEN
        RAISE EXCEPTION 'Session with ID % not found', p_session_id USING ERRCODE = 'P0002';
    END IF;
    
    -- Delete session (cascading deletes will handle related records)
    DELETE FROM sessions WHERE session_id = p_session_id;
    
    RETURN true;
END;
$function$;

-- Add session participant
CREATE OR REPLACE FUNCTION public.add_session_participant(p_session_id integer, p_user_id integer)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
    -- Check if session exists
    IF NOT EXISTS (SELECT 1 FROM sessions WHERE session_id = p_session_id) THEN
        RAISE EXCEPTION 'Session with ID % not found', p_session_id USING ERRCODE = 'P0002';
    END IF;
    
    -- Check if user exists
    IF NOT EXISTS (SELECT 1 FROM users WHERE user_id = p_user_id) THEN
        RAISE EXCEPTION 'User with ID % not found', p_user_id USING ERRCODE = 'P0002';
    END IF;
    
    -- Check if user is already a participant
    IF EXISTS (SELECT 1 FROM session_participants WHERE session_id = p_session_id AND user_id = p_user_id) THEN
        RAISE EXCEPTION 'User % is already a participant in session %', p_user_id, p_session_id USING ERRCODE = '23505';
    END IF;
    
    -- Add user to session
    INSERT INTO session_participants (session_id, user_id)
    VALUES (p_session_id, p_user_id);
    
    RETURN json_build_object('message', 'User ' || p_user_id || ' added to session ' || p_session_id);
END;
$function$;

-- Remove session participant
CREATE OR REPLACE FUNCTION public.remove_session_participant(p_session_id integer, p_user_id integer)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
    v_deleted_count INTEGER;
BEGIN
    -- Check if session exists
    IF NOT EXISTS (SELECT 1 FROM sessions WHERE session_id = p_session_id) THEN
        RAISE EXCEPTION 'Session with ID % not found', p_session_id USING ERRCODE = 'P0002';
    END IF;
    
    -- Remove user from session
    DELETE FROM session_participants 
    WHERE session_id = p_session_id AND user_id = p_user_id;
    
    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
    
    IF v_deleted_count = 0 THEN
        RAISE EXCEPTION 'User % is not a participant in session %', p_user_id, p_session_id USING ERRCODE = 'P0002';
    END IF;
    
    RETURN true;
END;
$function$;

-- Get session participants
CREATE OR REPLACE FUNCTION public.get_session_participants(p_session_id integer)
RETURNS TABLE(session_id integer, participant_ids integer[], participant_count bigint)
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
    v_participant_ids INTEGER[];
    v_count BIGINT;
BEGIN
    -- Check if session exists
    IF NOT EXISTS (SELECT 1 FROM sessions WHERE session_id = p_session_id) THEN
        RAISE EXCEPTION 'Session with ID % not found', p_session_id USING ERRCODE = 'P0002';
    END IF;
    
    -- Get participant IDs
    SELECT ARRAY_AGG(sp.user_id), COUNT(sp.user_id)
    INTO v_participant_ids, v_count
    FROM session_participants sp
    WHERE sp.session_id = p_session_id;
    
    RETURN QUERY
    SELECT 
        p_session_id as session_id,
        COALESCE(v_participant_ids, ARRAY[]::INTEGER[]) as participant_ids,
        COALESCE(v_count, 0) as participant_count;
END;
$function$;

-- Get session summary
CREATE OR REPLACE FUNCTION public.get_session_summary(p_session_id integer)
RETURNS TABLE(session_id integer, title text, message_count bigint, duration text, is_active boolean)
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
    v_session_info RECORD;
    v_message_count BIGINT;
    v_duration TEXT;
BEGIN
    -- Get session info
    SELECT s.session_id, s.topic, s.status, s.started_at, s.ended_at
    INTO v_session_info
    FROM sessions s
    WHERE s.session_id = p_session_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Session with ID % not found', p_session_id USING ERRCODE = 'P0002';
    END IF;
    
    -- Get message count
    SELECT COUNT(*) INTO v_message_count
    FROM messages m
    WHERE m.session_id = p_session_id;
    
    -- Calculate duration
    IF v_session_info.ended_at IS NOT NULL THEN
        v_duration := EXTRACT(EPOCH FROM (v_session_info.ended_at - v_session_info.started_at))::TEXT || ' seconds';
    ELSE
        v_duration := 'Session in progress';
    END IF;
    
    RETURN QUERY
    SELECT 
        p_session_id as session_id,
        COALESCE(v_session_info.topic, 'Untitled Session') as title,
        v_message_count as message_count,
        v_duration as duration,
        CASE WHEN v_session_info.status = 'active' THEN true ELSE false END as is_active;
END;
$function$;

-- Grant permissions
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO anon;

-- Add comments
COMMENT ON FUNCTION public.create_session(integer, integer, text, character varying) IS 'Creates a new session with group and creator';
COMMENT ON FUNCTION public.create_session(text, integer, integer) IS 'Creates a new session with title and user';
COMMENT ON FUNCTION public.get_session_by_id(integer) IS 'Retrieves session details by ID';
COMMENT ON FUNCTION public.get_session_by_title(text) IS 'Retrieves session by title';
COMMENT ON FUNCTION public.get_all_sessions(integer, boolean) IS 'Returns all sessions with optional filtering';
COMMENT ON FUNCTION public.update_session(integer, text, text) IS 'Updates session title and/or status';
COMMENT ON FUNCTION public.delete_session(integer) IS 'Permanently deletes a session';
COMMENT ON FUNCTION public.add_session_participant(integer, integer) IS 'Adds a user to a session';
COMMENT ON FUNCTION public.remove_session_participant(integer, integer) IS 'Removes a user from a session';
COMMENT ON FUNCTION public.get_session_participants(integer) IS 'Returns session participant IDs and count';
COMMENT ON FUNCTION public.get_session_summary(integer) IS 'Returns session summary with statistics';

-- =====================================================
-- VERIFICATION MESSAGE
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '✅ SESSION MANAGEMENT FUNCTIONS CREATED';
    RAISE NOTICE '📝 Ready for message and chat functions';
END $$;
