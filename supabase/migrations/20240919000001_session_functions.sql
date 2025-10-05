-- =====================================================
-- SESSION MANAGEMENT FUNCTIONS
-- Date: 2024-09-19
-- Description: Comprehensive session management functions with proper data structure
-- =====================================================

-- =====================================================
-- SESSION CRUD OPERATIONS
-- =====================================================

-- Get all sessions with optional filtering (final consolidated version)
CREATE OR REPLACE FUNCTION get_all_sessions(
    p_user_id INTEGER DEFAULT NULL,
    p_is_active BOOLEAN DEFAULT NULL
)
RETURNS TABLE (
    id INTEGER,
    title TEXT,
    description TEXT,
    created_by INTEGER,
    group_id INTEGER,
    created_at TIMESTAMP,
    started_at TIMESTAMP,
    ended_at TIMESTAMP,
    status TEXT,
    participant_count BIGINT
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        s.session_id::INTEGER as id,
        COALESCE(s.topic, 'Untitled Session') as title,
        ''::TEXT as description, -- No description field in current schema
        s.created_by::INTEGER as created_by,
        s.group_id::INTEGER as group_id,
        s.started_at as created_at,
        s.started_at as started_at,
        s.ended_at as ended_at,
        COALESCE(s.status::TEXT, 'offline') as status,
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
$$;

-- Get session by ID (final consolidated version)
CREATE OR REPLACE FUNCTION get_session_by_id(p_session_id INTEGER)
RETURNS TABLE (
    id INTEGER,
    title TEXT,
    description TEXT,
    created_by INTEGER,
    group_id INTEGER,
    created_at TIMESTAMP,
    started_at TIMESTAMP,
    ended_at TIMESTAMP,
    status TEXT,
    participant_count BIGINT
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        s.session_id::INTEGER as id,
        COALESCE(s.topic, 'Untitled Session') as title,
        ''::TEXT as description, -- No description field in current schema
        s.created_by::INTEGER as created_by,
        s.group_id::INTEGER as group_id,
        s.started_at as created_at,
        s.started_at as started_at,
        s.ended_at as ended_at,
        COALESCE(s.status::TEXT, 'offline') as status,
        COUNT(DISTINCT sp.user_id) as participant_count
    FROM sessions s
    LEFT JOIN session_participants sp ON s.session_id = sp.session_id
    WHERE s.session_id = p_session_id
    GROUP BY s.session_id, s.topic, s.created_by, s.group_id, s.started_at, s.ended_at, s.status;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Session with ID % not found', p_session_id USING ERRCODE = 'P0002';
    END IF;
END;
$$;

-- Create new session (final consolidated version)
CREATE OR REPLACE FUNCTION create_session(
    p_title TEXT,
    p_user_id INTEGER,
    p_group_id INTEGER DEFAULT 1
)
RETURNS TABLE (
    id INTEGER,
    title TEXT,
    description TEXT,
    created_by INTEGER,
    group_id INTEGER,
    created_at TIMESTAMP,
    started_at TIMESTAMP,
    ended_at TIMESTAMP,
    status TEXT,
    participant_count BIGINT
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
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
$$;

-- Update session
CREATE OR REPLACE FUNCTION update_session(
    p_session_id INTEGER,
    p_title TEXT DEFAULT NULL,
    p_status TEXT DEFAULT NULL
)
RETURNS TABLE (
    id INTEGER,
    title TEXT,
    description TEXT,
    created_by INTEGER,
    group_id INTEGER,
    created_at TIMESTAMP,
    started_at TIMESTAMP,
    ended_at TIMESTAMP,
    status TEXT,
    participant_count BIGINT
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
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
$$;

-- Delete session
CREATE OR REPLACE FUNCTION delete_session(p_session_id INTEGER)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Check if session exists
    IF NOT EXISTS (SELECT 1 FROM sessions WHERE session_id = p_session_id) THEN
        RAISE EXCEPTION 'Session with ID % not found', p_session_id USING ERRCODE = 'P0002';
    END IF;
    
    -- Delete session (cascading deletes will handle related records)
    DELETE FROM sessions WHERE session_id = p_session_id;
    
    RETURN true;
END;
$$;

-- Get session summary
CREATE OR REPLACE FUNCTION get_session_summary(p_session_id INTEGER)
RETURNS TABLE (
    session_id INTEGER,
    title TEXT,
    message_count BIGINT,
    duration TEXT,
    is_active BOOLEAN
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
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
$$;

-- Get session by title
CREATE OR REPLACE FUNCTION get_session_by_title(p_title TEXT)
RETURNS TABLE (
    id INTEGER,
    title TEXT
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
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
$$;

-- =====================================================
-- SESSION PARTICIPANT MANAGEMENT
-- =====================================================

-- Add session participant
CREATE OR REPLACE FUNCTION add_session_participant(
    p_session_id INTEGER,
    p_user_id INTEGER
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
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
$$;

-- Remove session participant
CREATE OR REPLACE FUNCTION remove_session_participant(
    p_session_id INTEGER,
    p_user_id INTEGER
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
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
$$;

-- Get session participants
CREATE OR REPLACE FUNCTION get_session_participants(p_session_id INTEGER)
RETURNS TABLE (
    session_id INTEGER,
    participant_ids INTEGER[],
    participant_count BIGINT
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
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
$$;

-- Grant execute permissions on all session functions
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;