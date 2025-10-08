-- Migration: Group Chat Database Functions
-- Date: 20240929000001
-- Description: Add RPC functions for group chat operations

-- =====================================================
-- GROUP SESSION MANAGEMENT FUNCTIONS
-- =====================================================

-- Function to create a new group chat session
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
    status VARCHAR(20),
    created_at TIMESTAMP
) 
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
    
    -- Create new session
    INSERT INTO sessions (group_id, title, description, created_by, status)
    VALUES (p_group_id, p_title, p_description, p_created_by, 'active')
    RETURNING sessions.session_id INTO v_session_id;
    
    -- Add creator as participant
    INSERT INTO session_participants (session_id, user_id)
    VALUES (v_session_id, p_created_by);
    
    -- Return session details
    RETURN QUERY
    SELECT 
        v_session_id,
        p_title,
        p_description,
        'active'::VARCHAR(20),
        CURRENT_TIMESTAMP;
END;
$$;

-- Function to get all active sessions for a group
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
        s.status,
        s.created_by,
        COALESCE(u.first_name || ' ' || u.last_name, u.email) as creator_name,
        COUNT(DISTINCT sp.user_id) as participant_count,
        MAX(m.sent_at) as last_message_at,
        (
            SELECT content FROM messages 
            WHERE session_id = s.session_id 
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

-- Function to join a group chat session
CREATE OR REPLACE FUNCTION join_group_chat_session(
    p_session_id INTEGER,
    p_user_id INTEGER
)
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

-- =====================================================
-- GROUP MESSAGE FUNCTIONS
-- =====================================================

-- Function to send a group chat message
CREATE OR REPLACE FUNCTION send_group_chat_message(
    p_session_id INTEGER,
    p_user_id INTEGER,
    p_content TEXT,
    p_message_type VARCHAR(20) DEFAULT 'user',
    p_metadata JSONB DEFAULT '{}'
)
RETURNS TABLE (
    message_id INTEGER,
    session_id INTEGER,
    sender_id INTEGER,
    sender_name TEXT,
    content TEXT,
    message_type VARCHAR(20),
    metadata JSONB,
    sent_at TIMESTAMP
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_message_id INTEGER;
    v_sender_id INTEGER;
BEGIN
    -- Validate inputs
    IF p_session_id IS NULL OR p_user_id IS NULL OR p_content IS NULL OR TRIM(p_content) = '' THEN
        RAISE EXCEPTION 'Session ID, User ID, and Content are required' USING ERRCODE = '23514';
    END IF;
    
    -- Get sender's group_participant_id
    SELECT gp.group_participant_id INTO v_sender_id
    FROM sessions s
    JOIN group_participants gp ON s.group_id = gp.group_id
    WHERE s.session_id = p_session_id
    AND gp.user_id = p_user_id;
    
    IF v_sender_id IS NULL THEN
        RAISE EXCEPTION 'User is not a member of this group session' USING ERRCODE = 'P0002';
    END IF;
    
    -- Insert message
    INSERT INTO messages (session_id, sender_id, content, message_type, metadata)
    VALUES (p_session_id, v_sender_id, p_content, p_message_type, p_metadata)
    RETURNING messages.message_id INTO v_message_id;
    
    -- Update user presence
    INSERT INTO user_presence (user_id, session_id, status)
    VALUES (p_user_id, p_session_id, 'online')
    ON CONFLICT (user_id, session_id) 
    DO UPDATE SET status = 'online', last_seen = CURRENT_TIMESTAMP;
    
    -- Return message details
    RETURN QUERY
    SELECT 
        v_message_id,
        p_session_id,
        v_sender_id,
        COALESCE(u.first_name || ' ' || u.last_name, u.email) as sender_name,
        p_content,
        p_message_type,
        p_metadata,
        CURRENT_TIMESTAMP
    FROM group_participants gp
    JOIN users u ON gp.user_id = u.user_id
    WHERE gp.group_participant_id = v_sender_id;
END;
$$;

-- Function to get messages for a group chat session
CREATE OR REPLACE FUNCTION get_group_chat_messages(
    p_session_id INTEGER,
    p_limit INTEGER DEFAULT 50,
    p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
    message_id INTEGER,
    session_id INTEGER,
    sender_id INTEGER,
    sender_name TEXT,
    sender_user_id INTEGER,
    content TEXT,
    message_type VARCHAR(20),
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
        m.message_type,
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
-- USER PRESENCE FUNCTIONS
-- =====================================================

-- Function to get online users in a session
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
    AND up.status IN ('online', 'away')
    ORDER BY up.last_seen DESC;
END;
$$;

-- Function to update user presence
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
    INSERT INTO user_presence (user_id, session_id, status)
    VALUES (p_user_id, p_session_id, p_status)
    ON CONFLICT (user_id, session_id) 
    DO UPDATE SET status = p_status, last_seen = CURRENT_TIMESTAMP;
    
    RETURN TRUE;
END;
$$;

-- =====================================================
-- AI INTEGRATION FUNCTIONS
-- =====================================================

-- Function to check if user can invoke AI (based on role)
CREATE OR REPLACE FUNCTION can_user_invoke_ai(
    p_user_id INTEGER,
    p_session_id INTEGER
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_role VARCHAR(50);
    v_is_session_creator BOOLEAN;
BEGIN
    -- Get user's role in the group
    SELECT gp.role INTO v_user_role
    FROM sessions s
    JOIN group_participants gp ON s.group_id = gp.group_id
    WHERE s.session_id = p_session_id
    AND gp.user_id = p_user_id;
    
    -- Check if user is the session creator
    SELECT (created_by = p_user_id) INTO v_is_session_creator
    FROM sessions
    WHERE session_id = p_session_id;
    
    -- Allow AI invocation if user is admin, mentor, or session creator
    RETURN (v_user_role IN ('admin', 'mentor') OR v_is_session_creator);
END;
$$;

-- Function to log AI invocation for audit trail
CREATE OR REPLACE FUNCTION log_ai_invocation(
    p_user_id INTEGER,
    p_session_id INTEGER,
    p_trigger_message_id INTEGER,
    p_ai_message_id INTEGER
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- This function can be used to log AI usage for analytics
    -- For now, we'll just return true, but could expand to include logging table
    RETURN TRUE;
END;
$$;
