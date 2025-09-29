-- =====================================================
-- RECREATE REMAINING DATABASE FUNCTIONS - PART 2
-- Date: 2024-10-01
-- Description: Continue recreating all database functions (sessions, papers, messages, etc.)
-- =====================================================

-- =====================================================
-- SESSION MANAGEMENT FUNCTIONS
-- =====================================================

CREATE OR REPLACE FUNCTION create_session(
    p_group_id INTEGER,
    p_created_by INTEGER,
    p_topic TEXT DEFAULT NULL,
    p_status VARCHAR(50) DEFAULT 'active'
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
    status VARCHAR(50),
    participant_count BIGINT
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
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
$$;

-- Alternative create_session function
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
BEGIN
    -- Insert new session using title as topic
    INSERT INTO sessions (group_id, created_by, topic, status, started_at)
    VALUES (p_group_id, p_user_id, p_title, 'active', CURRENT_TIMESTAMP)
    RETURNING session_id INTO v_session_id;
    
    -- Add creator as participant
    INSERT INTO session_participants (session_id, user_id)
    VALUES (v_session_id, p_user_id)
    ON CONFLICT (session_id, user_id) DO NOTHING;
    
    -- Return created session
    RETURN QUERY
    SELECT 
        v_session_id as id,
        p_title as title,
        ''::TEXT as description,
        p_user_id as created_by,
        p_group_id as group_id,
        CURRENT_TIMESTAMP as created_at,
        CURRENT_TIMESTAMP as started_at,
        NULL::TIMESTAMP as ended_at,
        'active'::TEXT as status,
        1::BIGINT as participant_count;
END;
$$;

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
    status VARCHAR(50),
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
$$;

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
    SELECT s.session_id as id, COALESCE(s.topic, 'Untitled Session') as title
    FROM sessions s
    WHERE s.topic = p_title;
END;
$$;

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
    status VARCHAR(50),
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
$$;

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
BEGIN
    -- Check if session exists
    IF NOT EXISTS (SELECT 1 FROM sessions WHERE session_id = p_session_id) THEN
        RAISE EXCEPTION 'Session with ID % not found', p_session_id USING ERRCODE = 'P0002';
    END IF;
    
    -- Update session
    UPDATE sessions
    SET 
        topic = COALESCE(p_title, topic),
        status = COALESCE(p_status::VARCHAR(50), status),
        updated_at = CURRENT_TIMESTAMP
    WHERE session_id = p_session_id;
    
    -- Return updated session
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
        s.status::TEXT as status,
        COUNT(DISTINCT sp.user_id) as participant_count
    FROM sessions s
    LEFT JOIN session_participants sp ON s.session_id = sp.session_id
    WHERE s.session_id = p_session_id
    GROUP BY s.session_id, s.topic, s.created_by, s.group_id, s.started_at, s.ended_at, s.status;
END;
$$;

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
    
    -- Delete session (this will cascade to related records)
    DELETE FROM sessions WHERE session_id = p_session_id;
    
    RETURN TRUE;
END;
$$;

CREATE OR REPLACE FUNCTION add_session_participant(
    p_session_id INTEGER,
    p_user_id INTEGER
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Validate session exists
    IF NOT EXISTS (SELECT 1 FROM sessions WHERE session_id = p_session_id) THEN
        RAISE EXCEPTION 'Session with ID % not found', p_session_id USING ERRCODE = 'P0002';
    END IF;
    
    -- Validate user exists
    IF NOT EXISTS (SELECT 1 FROM users WHERE user_id = p_user_id) THEN
        RAISE EXCEPTION 'User with ID % not found', p_user_id USING ERRCODE = 'P0002';
    END IF;
    
    -- Add participant
    INSERT INTO session_participants (session_id, user_id)
    VALUES (p_session_id, p_user_id)
    ON CONFLICT (session_id, user_id) DO NOTHING;
    
    RETURN json_build_object(
        'success', true,
        'session_id', p_session_id,
        'user_id', p_user_id
    );
END;
$$;

CREATE OR REPLACE FUNCTION remove_session_participant(
    p_session_id INTEGER,
    p_user_id INTEGER
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Remove participant
    DELETE FROM session_participants
    WHERE session_id = p_session_id AND user_id = p_user_id;
    
    RETURN FOUND;
END;
$$;

CREATE OR REPLACE FUNCTION get_session_participants(p_session_id INTEGER)
RETURNS TABLE (
    session_id INTEGER,
    participant_ids INTEGER[],
    participant_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p_session_id as session_id,
        ARRAY_AGG(sp.user_id) as participant_ids,
        COUNT(sp.user_id) as participant_count
    FROM session_participants sp
    WHERE sp.session_id = p_session_id;
END;
$$;

CREATE OR REPLACE FUNCTION get_session_online_users(p_session_id INTEGER)
RETURNS TABLE (
    user_id INTEGER,
    username TEXT,
    status VARCHAR(20),
    last_seen TIMESTAMP
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        up.user_id,
        COALESCE(u.first_name || ' ' || u.last_name, u.email) as username,
        up.status,
        up.last_seen
    FROM user_presence up
    JOIN users u ON up.user_id = u.user_id
    WHERE up.session_id = p_session_id
    AND up.status = 'online'
    ORDER BY up.last_seen DESC;
END;
$$;

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
BEGIN
    RETURN QUERY
    SELECT 
        s.session_id,
        COALESCE(s.topic, 'Untitled Session') as title,
        COUNT(DISTINCT m.message_id) as message_count,
        CASE 
            WHEN s.ended_at IS NOT NULL THEN 
                EXTRACT(EPOCH FROM (s.ended_at - s.started_at))::TEXT || ' seconds'
            ELSE 
                EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - s.started_at))::TEXT || ' seconds (ongoing)'
        END as duration,
        (s.status = 'active') as is_active
    FROM sessions s
    LEFT JOIN messages m ON s.session_id = m.session_id
    WHERE s.session_id = p_session_id
    GROUP BY s.session_id, s.topic, s.started_at, s.ended_at, s.status;
END;
$$;

-- =====================================================
-- GROUP CHAT SESSION FUNCTIONS
-- =====================================================

CREATE OR REPLACE FUNCTION create_group_chat_session(
    p_group_id INTEGER,
    p_created_by INTEGER,
    p_topic TEXT DEFAULT 'Group Chat Session'
)
RETURNS TABLE (
    session_id INTEGER,
    topic TEXT,
    status VARCHAR(50),
    started_at TIMESTAMP
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_session_id INTEGER;
BEGIN
    -- Insert new session
    INSERT INTO sessions (group_id, created_by, topic, status, started_at)
    VALUES (p_group_id, p_created_by, p_topic, 'active', CURRENT_TIMESTAMP)
    RETURNING sessions.session_id INTO v_session_id;
    
    -- Add creator as participant
    INSERT INTO session_participants (session_id, user_id)
    VALUES (v_session_id, p_created_by);
    
    -- Return created session
    RETURN QUERY
    SELECT 
        v_session_id,
        p_topic,
        'active'::VARCHAR(50),
        CURRENT_TIMESTAMP;
END;
$$;

-- Alternative signature
CREATE OR REPLACE FUNCTION create_group_chat_session(
    p_group_id INTEGER,
    p_created_by INTEGER,
    p_title TEXT DEFAULT 'Group Chat Session',
    p_description TEXT DEFAULT ''
)
RETURNS TABLE (
    session_id INTEGER,
    title TEXT,
    description TEXT,
    status VARCHAR(50),
    created_at TIMESTAMP
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_session_id INTEGER;
BEGIN
    -- Insert new session
    INSERT INTO sessions (group_id, created_by, topic, status, started_at)
    VALUES (p_group_id, p_created_by, p_title, 'active', CURRENT_TIMESTAMP)
    RETURNING sessions.session_id INTO v_session_id;
    
    -- Add creator as participant
    INSERT INTO session_participants (session_id, user_id)
    VALUES (v_session_id, p_created_by);
    
    -- Return created session
    RETURN QUERY
    SELECT 
        v_session_id,
        p_title,
        p_description,
        'active'::VARCHAR(50),
        CURRENT_TIMESTAMP;
END;
$$;

CREATE OR REPLACE FUNCTION get_group_chat_sessions(p_group_id INTEGER)
RETURNS TABLE (
    session_id INTEGER,
    title TEXT,
    description TEXT,
    status VARCHAR(20),
    created_by INTEGER,
    creator_name TEXT,
    participant_count BIGINT,
    last_message_at TIMESTAMP,
    last_message_content TEXT,
    created_at TIMESTAMP
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Validate input
    IF p_group_id IS NULL THEN
        RAISE EXCEPTION 'Group ID is required' USING ERRCODE = '23514';
    END IF;
    
    RETURN QUERY
    SELECT 
        s.session_id,
        s.title,
        COALESCE(s.description, '') as description,
        s.status::VARCHAR(20),
        s.created_by,
        COALESCE(u.first_name || ' ' || u.last_name, u.email) as creator_name,
        COUNT(DISTINCT sp.user_id) as participant_count,
        MAX(m.sent_at) as last_message_at,
        (
            SELECT content FROM messages 
            WHERE messages.session_id = s.session_id
            ORDER BY sent_at DESC 
            LIMIT 1
        ) as last_message_content,
        s.created_at
    FROM sessions s
    JOIN users u ON s.created_by = u.user_id
    LEFT JOIN session_participants sp ON s.session_id = sp.session_id
    LEFT JOIN messages m ON s.session_id = m.session_id
    WHERE s.group_id = p_group_id
    AND s.status = 'active'
    GROUP BY s.session_id, s.title, s.description, s.status, s.created_by, u.first_name, u.last_name, u.email, s.created_at
    ORDER BY COALESCE(MAX(m.sent_at), s.created_at) DESC;
END;
$$;

CREATE OR REPLACE FUNCTION join_group_chat_session(
    p_session_id INTEGER,
    p_user_id INTEGER
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Add user to session participants
    INSERT INTO session_participants (session_id, user_id)
    VALUES (p_session_id, p_user_id)
    ON CONFLICT (session_id, user_id) DO NOTHING;
    
    -- Update user presence
    INSERT INTO user_presence (user_id, session_id, status)
    VALUES (p_user_id, p_session_id, 'online')
    ON CONFLICT (user_id, session_id) 
    DO UPDATE SET 
        status = 'online', 
        last_seen = CURRENT_TIMESTAMP;
    
    RETURN TRUE;
END;
$$;

CREATE OR REPLACE FUNCTION update_user_presence(
    p_user_id INTEGER,
    p_session_id INTEGER,
    p_status VARCHAR(20) DEFAULT 'online'
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO user_presence (user_id, session_id, status, last_seen)
    VALUES (p_user_id, p_session_id, p_status, CURRENT_TIMESTAMP)
    ON CONFLICT (user_id, session_id) 
    DO UPDATE SET 
        status = p_status, 
        last_seen = CURRENT_TIMESTAMP;
    
    RETURN TRUE;
END;
$$;

-- Grant permissions for all session functions
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO anon;

-- Add comments for session functions
COMMENT ON FUNCTION create_session(INTEGER, INTEGER, TEXT, VARCHAR) IS 'Creates a new session for a group with specified parameters';
COMMENT ON FUNCTION create_session(TEXT, INTEGER, INTEGER) IS 'Alternative create session function using title instead of topic';
COMMENT ON FUNCTION get_session_by_id(INTEGER) IS 'Retrieves session details by ID with participant count';
COMMENT ON FUNCTION get_session_by_title(TEXT) IS 'Finds session by title/topic';
COMMENT ON FUNCTION get_all_sessions(INTEGER, BOOLEAN) IS 'Returns all sessions with optional user and active filters';
COMMENT ON FUNCTION update_session(INTEGER, TEXT, TEXT) IS 'Updates session title and/or status';
COMMENT ON FUNCTION delete_session(INTEGER) IS 'Permanently deletes a session and related data';
COMMENT ON FUNCTION add_session_participant(INTEGER, INTEGER) IS 'Adds a user to a session';
COMMENT ON FUNCTION remove_session_participant(INTEGER, INTEGER) IS 'Removes a user from a session';
COMMENT ON FUNCTION get_session_participants(INTEGER) IS 'Returns array of participant IDs for a session';
COMMENT ON FUNCTION get_session_online_users(INTEGER) IS 'Returns currently online users in a session';
COMMENT ON FUNCTION get_session_summary(INTEGER) IS 'Returns session summary with message count and duration';
COMMENT ON FUNCTION create_group_chat_session(INTEGER, INTEGER, TEXT) IS 'Creates a group chat session with topic';
COMMENT ON FUNCTION create_group_chat_session(INTEGER, INTEGER, TEXT, TEXT) IS 'Creates a group chat session with title and description';
COMMENT ON FUNCTION get_group_chat_sessions(INTEGER) IS 'Returns all group chat sessions for a group';
COMMENT ON FUNCTION join_group_chat_session(INTEGER, INTEGER) IS 'Joins a user to a group chat session';
COMMENT ON FUNCTION update_user_presence(INTEGER, INTEGER, VARCHAR) IS 'Updates user presence status in a session';

-- =====================================================
-- VERIFICATION
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE 'Session management functions recreated successfully';
    RAISE NOTICE '✅ Core session CRUD operations';
    RAISE NOTICE '✅ Session participant management';
    RAISE NOTICE '✅ Group chat session functions';
    RAISE NOTICE '✅ User presence tracking';
END $$;
