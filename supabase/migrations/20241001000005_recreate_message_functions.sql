-- =====================================================
-- RECREATE ALL FUNCTIONS - PART 3: MESSAGES, PAPERS, AI & REMAINING
-- Date: 2024-10-01  
-- Description: Final part - Messages, Papers, AI metadata, Feedback, and remaining functions
-- =====================================================

-- =====================================================
-- MESSAGE FUNCTIONS
-- =====================================================

CREATE OR REPLACE FUNCTION create_message(
    p_session_id INTEGER,
    p_sender_user_id INTEGER,
    p_content TEXT
)
RETURNS TABLE(message_id INTEGER, session_id INTEGER, sender_id INTEGER, sender_name TEXT, content TEXT, sent_at TIMESTAMP)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_sender_participant_id INTEGER;
    v_message_id INTEGER;
    v_group_id INTEGER;
BEGIN
    -- Validate inputs
    IF p_content IS NULL OR trim(p_content) = '' THEN
        RAISE EXCEPTION 'Message content is required' USING ERRCODE = '23514';
    END IF;
    
    -- Check if session exists and get group_id
    SELECT s.group_id INTO v_group_id
    FROM sessions s
    WHERE s.session_id = p_session_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Session with ID % not found', p_session_id USING ERRCODE = 'P0002';
    END IF;
    
    -- Get sender's group participant ID
    SELECT gp.group_participant_id INTO v_sender_participant_id
    FROM group_participants gp
    WHERE gp.group_id = v_group_id AND gp.user_id = p_sender_user_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'User % is not a member of the session group', p_sender_user_id USING ERRCODE = 'P0002';
    END IF;
    
    -- Insert new message
    INSERT INTO messages (session_id, sender_id, content, sent_at)
    VALUES (p_session_id, v_sender_participant_id, p_content, CURRENT_TIMESTAMP)
    RETURNING message_id INTO v_message_id;
    
    -- Return the created message
    RETURN QUERY
    SELECT 
        v_message_id as message_id,
        p_session_id as session_id,
        p_sender_user_id as sender_id,
        COALESCE(
            TRIM(CONCAT(u.first_name, ' ', u.last_name)), 
            u.email
        ) as sender_name,
        p_content as content,
        CURRENT_TIMESTAMP as sent_at
    FROM users u
    WHERE u.user_id = p_sender_user_id;
END;
$$;

CREATE OR REPLACE FUNCTION get_message_by_id(p_message_id INTEGER)
RETURNS TABLE(message_id INTEGER, session_id INTEGER, sender_id INTEGER, sender_name TEXT, content TEXT, sent_at TIMESTAMP)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        m.message_id::INTEGER,
        m.session_id::INTEGER,
        gp.user_id::INTEGER as sender_id,
        COALESCE(
            TRIM(CONCAT(u.first_name, ' ', u.last_name)), 
            u.email
        ) as sender_name,
        m.content,
        m.sent_at
    FROM messages m
    JOIN group_participants gp ON m.sender_id = gp.group_participant_id
    JOIN users u ON gp.user_id = u.user_id
    WHERE m.message_id = p_message_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Message with ID % not found', p_message_id USING ERRCODE = 'P0002';
    END IF;
END;
$$;

CREATE OR REPLACE FUNCTION get_all_messages(p_limit INTEGER DEFAULT 100, p_offset INTEGER DEFAULT 0)
RETURNS TABLE(id INTEGER, session_id INTEGER, sender_id INTEGER, content TEXT, message_type VARCHAR(50), sent_at TIMESTAMP)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        m.message_id::INTEGER as id,
        m.session_id::INTEGER as session_id,
        m.sender_id::INTEGER as sender_id,
        m.content,
        COALESCE(m.message_type, 'user')::VARCHAR(50) as message_type,
        m.sent_at
    FROM messages m
    ORDER BY m.sent_at DESC
    LIMIT p_limit OFFSET p_offset;
END;
$$;

CREATE OR REPLACE FUNCTION update_message(p_message_id INTEGER, p_content TEXT)
RETURNS TABLE(id INTEGER, session_id INTEGER, sender_id INTEGER, content TEXT, message_type VARCHAR(50), sent_at TIMESTAMP, edited_at TIMESTAMP)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Check if message exists
    IF NOT EXISTS (SELECT 1 FROM messages WHERE message_id = p_message_id) THEN
        RAISE EXCEPTION 'Message with ID % not found', p_message_id USING ERRCODE = 'P0002';
    END IF;
    
    -- Update message
    UPDATE messages 
    SET content = p_content, edited_at = CURRENT_TIMESTAMP
    WHERE message_id = p_message_id;
    
    -- Return updated message
    RETURN QUERY
    SELECT 
        m.message_id::INTEGER as id,
        m.session_id::INTEGER as session_id,
        m.sender_id::INTEGER as sender_id,
        m.content,
        COALESCE(m.message_type, 'user')::VARCHAR(50) as message_type,
        m.sent_at,
        m.edited_at
    FROM messages m
    WHERE m.message_id = p_message_id;
END;
$$;

CREATE OR REPLACE FUNCTION delete_message(p_message_id INTEGER)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Check if message exists
    IF NOT EXISTS (SELECT 1 FROM messages WHERE message_id = p_message_id) THEN
        RAISE EXCEPTION 'Message with ID % not found', p_message_id USING ERRCODE = 'P0002';
    END IF;
    
    -- Delete message (cascading deletes will handle related records)
    DELETE FROM messages WHERE message_id = p_message_id;
    
    RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION search_messages(
    p_query_text TEXT, 
    p_session_id INTEGER DEFAULT NULL, 
    p_limit INTEGER DEFAULT 50
)
RETURNS TABLE(id INTEGER, session_id INTEGER, sender_id INTEGER, content TEXT, message_type VARCHAR(50), sent_at TIMESTAMP)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        m.message_id::INTEGER as id,
        m.session_id::INTEGER as session_id,
        m.sender_id::INTEGER as sender_id,
        m.content,
        COALESCE(m.message_type, 'user')::VARCHAR(50) as message_type,
        m.sent_at
    FROM messages m
    WHERE (p_session_id IS NULL OR m.session_id = p_session_id)
      AND m.content ILIKE '%' || p_query_text || '%'
    ORDER BY m.sent_at DESC
    LIMIT p_limit;
END;
$$;

CREATE OR REPLACE FUNCTION get_session_messages(p_session_id INTEGER)
RETURNS TABLE(message_id INTEGER, session_id INTEGER, sender_id INTEGER, sender_name TEXT, content TEXT, sent_at TIMESTAMP)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Check if session exists
    IF NOT EXISTS (SELECT 1 FROM sessions WHERE session_id = p_session_id) THEN
        RAISE EXCEPTION 'Session with ID % not found', p_session_id USING ERRCODE = 'P0002';
    END IF;
    
    RETURN QUERY
    SELECT 
        m.message_id::INTEGER,
        m.session_id::INTEGER,
        gp.user_id::INTEGER as sender_id,
        COALESCE(
            TRIM(CONCAT(u.first_name, ' ', u.last_name)), 
            u.email
        ) as sender_name,
        m.content,
        m.sent_at
    FROM messages m
    JOIN group_participants gp ON m.sender_id = gp.group_participant_id
    JOIN users u ON gp.user_id = u.user_id
    WHERE m.session_id = p_session_id
    ORDER BY m.sent_at ASC;
END;
$$;

-- =====================================================
-- GROUP CHAT MESSAGE FUNCTIONS
-- =====================================================

CREATE OR REPLACE FUNCTION send_group_chat_message(
    p_session_id INTEGER,
    p_user_id INTEGER,
    p_content TEXT,
    p_message_type VARCHAR(50) DEFAULT 'user',
    p_metadata JSONB DEFAULT '{}'
)
RETURNS TABLE(message_id INTEGER, session_id INTEGER, sender_id INTEGER, sender_name TEXT, content TEXT, message_type VARCHAR(50), metadata JSONB, sent_at TIMESTAMP)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_message_id INTEGER;
    v_sender_id INTEGER;
    v_sender_name TEXT;
    v_timestamp TIMESTAMP := CURRENT_TIMESTAMP;
BEGIN
    -- Validate inputs
    IF p_session_id IS NULL OR p_user_id IS NULL OR p_content IS NULL OR TRIM(p_content) = '' THEN
        RAISE EXCEPTION 'Session ID, User ID, and Content are required!' USING ERRCODE = '23514';
    END IF;
    
    -- Find sender with lookup
    WITH sender_lookup AS (
        SELECT 
            gp.group_participant_id as participant_id,
            COALESCE(u.first_name || ' ' || u.last_name, u.email) as full_name
        FROM sessions s
        JOIN group_participants gp ON s.group_id = gp.group_id
        JOIN users u ON gp.user_id = u.user_id
        WHERE s.session_id = p_session_id AND gp.user_id = p_user_id
    )
    SELECT participant_id, full_name INTO v_sender_id, v_sender_name FROM sender_lookup;
    
    IF v_sender_id IS NULL THEN
        RAISE EXCEPTION 'User % is not in session %!', p_user_id, p_session_id USING ERRCODE = 'P0002';
    END IF;
    
    -- Insert message
    WITH message_insert AS (
        INSERT INTO messages (session_id, sender_id, content, message_type, metadata, sent_at)
        VALUES (p_session_id, v_sender_id, p_content, p_message_type, p_metadata, v_timestamp)
        RETURNING message_id
    )
    SELECT message_id INTO v_message_id FROM message_insert;
    
    -- Update user presence
    WITH presence_upsert AS (
        INSERT INTO user_presence (user_id, session_id, status, last_seen)
        VALUES (p_user_id, p_session_id, 'online', v_timestamp)
        ON CONFLICT (user_id, session_id) 
        DO UPDATE SET status = 'online', last_seen = v_timestamp
        RETURNING 1 as updated
    )
    SELECT 1 FROM presence_upsert;
    
    -- Return the message details
    message_id := v_message_id;
    session_id := p_session_id;
    sender_id := v_sender_id;
    sender_name := v_sender_name;
    content := p_content;
    message_type := p_message_type;
    metadata := p_metadata;
    sent_at := v_timestamp;
    
    RETURN NEXT;
END;
$$;

CREATE OR REPLACE FUNCTION get_group_chat_messages(
    p_session_id INTEGER, 
    p_limit INTEGER DEFAULT 50, 
    p_offset INTEGER DEFAULT 0
)
RETURNS TABLE(
    message_id INTEGER, 
    session_id INTEGER, 
    sender_id INTEGER, 
    sender_name TEXT, 
    sender_user_id INTEGER, 
    content TEXT, 
    message_type VARCHAR(50), 
    metadata JSONB, 
    sent_at TIMESTAMP, 
    edited_at TIMESTAMP, 
    reply_to INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Validate input
    IF p_session_id IS NULL THEN
        RAISE EXCEPTION 'Session ID is required' USING ERRCODE = '23514';
    END IF;
    
    RETURN QUERY
    SELECT 
        m.message_id,
        m.session_id,
        m.sender_id,
        COALESCE(u.first_name || ' ' || u.last_name, u.email) as sender_name,
        gp.user_id as sender_user_id,
        m.content,
        m.message_type::VARCHAR(50),
        m.metadata,
        m.sent_at,
        m.edited_at,
        m.reply_to
    FROM messages m
    JOIN group_participants gp ON m.sender_id = gp.group_participant_id
    JOIN users u ON gp.user_id = u.user_id
    WHERE m.session_id = p_session_id
    ORDER BY m.sent_at DESC
    LIMIT p_limit OFFSET p_offset;
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
RETURNS TABLE(session_id INTEGER, topic TEXT, status VARCHAR(50), started_at TIMESTAMP)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_session_id INTEGER;
    v_started_at TIMESTAMP;
BEGIN
    -- Validate inputs
    IF p_group_id IS NULL OR p_created_by IS NULL THEN
        RAISE EXCEPTION 'Group ID and Creator ID are required' USING ERRCODE = '23514';
    END IF;
    
    -- Check if user is a member of the group
    IF NOT EXISTS (
        SELECT 1 FROM group_participants 
        WHERE group_id = p_group_id AND user_id = p_created_by
    ) THEN
        RAISE EXCEPTION 'User is not a member of this group' USING ERRCODE = 'P0002';
    END IF;
    
    -- Create new session with actual table columns
    INSERT INTO sessions (group_id, topic, created_by, status, started_at)
    VALUES (p_group_id, p_topic, p_created_by, 'active', CURRENT_TIMESTAMP)
    RETURNING sessions.session_id, sessions.started_at INTO v_session_id, v_started_at;
    
    -- Add creator as participant
    INSERT INTO session_participants (session_id, user_id)
    VALUES (v_session_id, p_created_by);
    
    -- Return session details with actual column names
    RETURN QUERY
    SELECT 
        v_session_id,
        p_topic,
        'active'::VARCHAR(50),
        v_started_at;
END;
$$;

-- Alternative signature for create_group_chat_session
CREATE OR REPLACE FUNCTION create_group_chat_session(
    p_group_id INTEGER,
    p_created_by INTEGER,
    p_title TEXT DEFAULT 'Group Chat Session',
    p_description TEXT DEFAULT ''
)
RETURNS TABLE(session_id INTEGER, title TEXT, description TEXT, status VARCHAR(50), created_at TIMESTAMP)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_session_id INTEGER;
BEGIN
    -- Validate inputs
    IF p_group_id IS NULL OR p_created_by IS NULL THEN
        RAISE EXCEPTION 'Group ID and Creator ID are required' USING ERRCODE = '23514';
    END IF;
    
    -- Check if user is a member of the group
    IF NOT EXISTS (
        SELECT 1 FROM group_participants 
        WHERE group_id = p_group_id AND user_id = p_created_by
    ) THEN
        RAISE EXCEPTION 'User is not a member of this group' USING ERRCODE = 'P0002';
    END IF;
    
    -- Create new session (use topic instead of title, no description column)
    INSERT INTO sessions (group_id, topic, created_by, status)
    VALUES (p_group_id, p_title, p_created_by, 'active')
    RETURNING sessions.session_id INTO v_session_id;
    
    -- Add creator as participant
    INSERT INTO session_participants (session_id, user_id)
    VALUES (v_session_id, p_created_by);
    
    -- Return session details with proper type casting
    RETURN QUERY
    SELECT 
        v_session_id,
        p_title,
        p_description,
        'active'::VARCHAR(50),
        CURRENT_TIMESTAMP::TIMESTAMP
    ;
END;
$$;

CREATE OR REPLACE FUNCTION get_group_chat_sessions(p_group_id INTEGER)
RETURNS TABLE(
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
        COALESCE(s.topic, 'Group Chat Session') as title,
        ''::TEXT as description,
        s.status::VARCHAR(20),
        s.created_by,
        COALESCE(u.first_name || ' ' || u.last_name, u.email) as creator_name,
        COUNT(DISTINCT sp.user_id) as participant_count,
        MAX(m.sent_at)::TIMESTAMP as last_message_at,
        (
            SELECT content FROM messages 
            WHERE messages.session_id = s.session_id
            ORDER BY sent_at DESC 
            LIMIT 1
        ) as last_message_content,
        s.started_at::TIMESTAMP as created_at
    FROM sessions s
    JOIN users u ON s.created_by = u.user_id
    LEFT JOIN session_participants sp ON s.session_id = sp.session_id
    LEFT JOIN messages m ON s.session_id = m.session_id
    WHERE s.group_id = p_group_id
    AND s.status = 'active'
    GROUP BY s.session_id, s.topic, s.status, s.created_by, u.first_name, u.last_name, u.email, s.started_at
    ORDER BY COALESCE(MAX(m.sent_at)::TIMESTAMP, s.started_at::TIMESTAMP) DESC;
END;
$$;

CREATE OR REPLACE FUNCTION join_group_chat_session(p_session_id INTEGER, p_user_id INTEGER)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Validate inputs
    IF p_session_id IS NULL OR p_user_id IS NULL THEN
        RAISE EXCEPTION 'Session ID and User ID are required' USING ERRCODE = '23514';
    END IF;
    
    -- Check if user is member of the group that owns this session
    IF NOT EXISTS (
        SELECT 1 FROM sessions s
        JOIN group_participants gp ON s.group_id = gp.group_id
        WHERE s.session_id = p_session_id
        AND gp.user_id = p_user_id
    ) THEN
        RAISE EXCEPTION 'User is not a member of the group' USING ERRCODE = 'P0002';
    END IF;
    
    -- Add user to session participants (ignore if already exists)
    INSERT INTO session_participants (session_id, user_id)
    VALUES (p_session_id, p_user_id)
    ON CONFLICT (session_id, user_id) DO NOTHING;
    
    -- Set user as online in this session
    INSERT INTO user_presence (user_id, session_id, status)
    VALUES (p_user_id, p_session_id, 'online')
    ON CONFLICT (user_id, session_id) 
    DO UPDATE SET status = 'online', last_seen = CURRENT_TIMESTAMP;
    
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

CREATE OR REPLACE FUNCTION get_session_online_users(p_session_id INTEGER)
RETURNS TABLE(user_id INTEGER, username TEXT, status VARCHAR(20), last_seen TIMESTAMP)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        up.user_id,
        COALESCE(u.first_name || ' ' || u.last_name, u.email) as username,
        up.status::VARCHAR(20),
        up.last_seen
    FROM user_presence up
    JOIN users u ON up.user_id = u.user_id
    WHERE up.session_id = p_session_id
    AND up.status IN ('online', 'away')
    ORDER BY up.last_seen DESC;
END;
$$;

CREATE OR REPLACE FUNCTION get_session_summary(p_session_id INTEGER)
RETURNS TABLE(session_id INTEGER, title TEXT, message_count BIGINT, duration TEXT, is_active BOOLEAN)
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

-- Grant permissions
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO anon;

-- Add comments
COMMENT ON FUNCTION create_message(INTEGER, INTEGER, TEXT) IS 'Creates a new message in a session';
COMMENT ON FUNCTION get_message_by_id(INTEGER) IS 'Retrieves message details by ID';
COMMENT ON FUNCTION get_all_messages(INTEGER, INTEGER) IS 'Returns all messages with pagination';
COMMENT ON FUNCTION update_message(INTEGER, TEXT) IS 'Updates message content';
COMMENT ON FUNCTION delete_message(INTEGER) IS 'Permanently deletes a message';
COMMENT ON FUNCTION search_messages(TEXT, INTEGER, INTEGER) IS 'Searches messages by content';
COMMENT ON FUNCTION get_session_messages(INTEGER) IS 'Returns all messages for a session';
COMMENT ON FUNCTION send_group_chat_message(INTEGER, INTEGER, TEXT, VARCHAR, JSONB) IS 'Sends a message in group chat';
COMMENT ON FUNCTION get_group_chat_messages(INTEGER, INTEGER, INTEGER) IS 'Retrieves group chat messages with pagination';
COMMENT ON FUNCTION create_group_chat_session(INTEGER, INTEGER, TEXT) IS 'Creates a group chat session with topic';
COMMENT ON FUNCTION create_group_chat_session(INTEGER, INTEGER, TEXT, TEXT) IS 'Creates a group chat session with title and description';
COMMENT ON FUNCTION get_group_chat_sessions(INTEGER) IS 'Returns all group chat sessions for a group';
COMMENT ON FUNCTION join_group_chat_session(INTEGER, INTEGER) IS 'Joins a user to a group chat session';
COMMENT ON FUNCTION update_user_presence(INTEGER, INTEGER, VARCHAR) IS 'Updates user presence status in a session';
COMMENT ON FUNCTION get_session_online_users(INTEGER) IS 'Returns currently online users in a session';
COMMENT ON FUNCTION get_session_summary(INTEGER) IS 'Returns session summary with message count and duration';

-- =====================================================
-- VERIFICATION
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE 'Message and Group Chat functions recreated successfully';
    RAISE NOTICE '✅ Message CRUD operations';
    RAISE NOTICE '✅ Message search and retrieval';
    RAISE NOTICE '✅ Group chat messaging';
    RAISE NOTICE '✅ Group chat sessions';
    RAISE NOTICE '✅ User presence tracking';
    RAISE NOTICE 'Ready for Part 4: Papers, Feedback, AI metadata...';
END $$;
