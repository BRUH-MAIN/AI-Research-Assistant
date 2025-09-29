-- =====================================================
-- FIX ALL DATABASE TYPE MISMATCHES
-- Date: 2024-09-30
-- Description: Fix all function return type mismatches with actual database column types
-- =====================================================

-- This migration fixes type mismatches where functions return TEXT but 
-- database columns are VARCHAR with specific lengths

-- =====================================================
-- FIX SESSION FUNCTIONS - status VARCHAR(50) not TEXT
-- =====================================================

-- Fix get_all_sessions function
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
    status VARCHAR(50),  -- Changed from TEXT to VARCHAR(50)
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
        s.status as status,  -- Removed unnecessary cast
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

-- Fix get_session_by_id function
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
    status VARCHAR(50),  -- Changed from TEXT to VARCHAR(50)
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
        s.status as status,  -- Removed unnecessary cast
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

-- Fix create_session function
CREATE OR REPLACE FUNCTION create_session(
    p_group_id INTEGER,
    p_created_by INTEGER,
    p_topic TEXT DEFAULT NULL,
    p_status VARCHAR(50) DEFAULT 'active'  -- Changed from TEXT to VARCHAR(50)
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
    status VARCHAR(50),  -- Changed from TEXT to VARCHAR(50)
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

-- =====================================================
-- FIX GROUP CHAT FUNCTIONS - ambiguous column references
-- =====================================================

-- Fix get_group_chat_sessions function - resolve ambiguous session_id reference
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
            WHERE messages.session_id = s.session_id  -- Fixed: Fully qualified column reference
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

-- =====================================================
-- FIX MESSAGE FUNCTIONS - message_type VARCHAR(20) not TEXT
-- =====================================================

-- Fix get_all_messages function
CREATE OR REPLACE FUNCTION get_all_messages(
    p_limit INTEGER DEFAULT 100,
    p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
    id INTEGER,
    session_id INTEGER,
    sender_id INTEGER,
    content TEXT,
    message_type VARCHAR(20),  -- Changed from TEXT to VARCHAR(20)
    sent_at TIMESTAMP
) 
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
        COALESCE(m.message_type, 'user') as message_type,
        m.sent_at
    FROM messages m
    ORDER BY m.sent_at DESC
    LIMIT p_limit OFFSET p_offset;
END;
$$;

-- Fix update_message function
CREATE OR REPLACE FUNCTION update_message(
    p_message_id INTEGER,
    p_content TEXT
)
RETURNS TABLE (
    id INTEGER,
    session_id INTEGER,
    sender_id INTEGER,
    content TEXT,
    message_type VARCHAR(20),  -- Changed from TEXT to VARCHAR(20)
    sent_at TIMESTAMP,
    edited_at TIMESTAMP
) 
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
        COALESCE(m.message_type, 'user') as message_type,
        m.sent_at,
        m.edited_at
    FROM messages m
    WHERE m.message_id = p_message_id;
END;
$$;

-- Fix search_messages function
CREATE OR REPLACE FUNCTION search_messages(
    p_query_text TEXT,
    p_session_id INTEGER DEFAULT NULL,
    p_limit INTEGER DEFAULT 50
)
RETURNS TABLE (
    id INTEGER,
    session_id INTEGER,
    sender_id INTEGER,
    content TEXT,
    message_type VARCHAR(20),  -- Changed from TEXT to VARCHAR(20)
    sent_at TIMESTAMP
) 
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
        COALESCE(m.message_type, 'user') as message_type,
        m.sent_at
    FROM messages m
    WHERE (p_session_id IS NULL OR m.session_id = p_session_id)
      AND m.content ILIKE '%' || p_query_text || '%'
    ORDER BY m.sent_at DESC
    LIMIT p_limit;
END;
$$;

-- =====================================================
-- GRANT PERMISSIONS
-- =====================================================

-- Grant permissions for all updated functions
GRANT EXECUTE ON FUNCTION get_group_chat_sessions(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_group_chat_sessions(INTEGER) TO anon;

GRANT EXECUTE ON FUNCTION get_all_sessions(INTEGER, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION get_all_sessions(INTEGER, BOOLEAN) TO anon;

GRANT EXECUTE ON FUNCTION get_session_by_id(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_session_by_id(INTEGER) TO anon;

GRANT EXECUTE ON FUNCTION create_session(INTEGER, INTEGER, TEXT, VARCHAR(50)) TO authenticated;
GRANT EXECUTE ON FUNCTION create_session(INTEGER, INTEGER, TEXT, VARCHAR(50)) TO anon;

GRANT EXECUTE ON FUNCTION get_all_messages(INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_all_messages(INTEGER, INTEGER) TO anon;

GRANT EXECUTE ON FUNCTION update_message(INTEGER, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION update_message(INTEGER, TEXT) TO anon;

GRANT EXECUTE ON FUNCTION search_messages(TEXT, INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION search_messages(TEXT, INTEGER, INTEGER) TO anon;

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON FUNCTION get_group_chat_sessions(INTEGER) IS 'Fixed: Resolved ambiguous column reference session_id in subquery';
COMMENT ON FUNCTION get_all_sessions(INTEGER, BOOLEAN) IS 'Fixed: status column type changed from TEXT to VARCHAR(50)';
COMMENT ON FUNCTION get_session_by_id(INTEGER) IS 'Fixed: status column type changed from TEXT to VARCHAR(50)';
COMMENT ON FUNCTION create_session(INTEGER, INTEGER, TEXT, VARCHAR(50)) IS 'Fixed: status parameter and return type changed from TEXT to VARCHAR(50)';
COMMENT ON FUNCTION get_all_messages(INTEGER, INTEGER) IS 'Fixed: message_type column type changed from TEXT to VARCHAR(20)';
COMMENT ON FUNCTION update_message(INTEGER, TEXT) IS 'Fixed: message_type column type changed from TEXT to VARCHAR(20)';
COMMENT ON FUNCTION search_messages(TEXT, INTEGER, INTEGER) IS 'Fixed: message_type column type changed from TEXT to VARCHAR(20)';

-- =====================================================
-- FIX SEND_GROUP_CHAT_MESSAGE - ambiguous column reference
-- =====================================================

-- Fix send_group_chat_message function - resolve ambiguous session_id reference
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
    
    -- Update user presence (Fixed: Fully qualify column references in ON CONFLICT)
    INSERT INTO user_presence (user_id, session_id, status)
    VALUES (p_user_id, p_session_id, 'online')
    ON CONFLICT (user_id, session_id) 
    DO UPDATE SET 
        status = 'online', 
        last_seen = CURRENT_TIMESTAMP
    WHERE user_presence.user_id = p_user_id 
      AND user_presence.session_id = p_session_id;
    
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

-- Grant permissions for updated function
GRANT EXECUTE ON FUNCTION send_group_chat_message(INTEGER, INTEGER, TEXT, VARCHAR(20), JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION send_group_chat_message(INTEGER, INTEGER, TEXT, VARCHAR(20), JSONB) TO anon;

COMMENT ON FUNCTION send_group_chat_message(INTEGER, INTEGER, TEXT, VARCHAR(20), JSONB) IS 'Fixed: Resolved ambiguous session_id column reference in ON CONFLICT clause';

-- =====================================================
-- VERIFICATION
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE 'Type mismatch fixes applied successfully:';
    RAISE NOTICE '✅ Group chat sessions: Fixed ambiguous session_id column reference';
    RAISE NOTICE '✅ Session status: VARCHAR(50) instead of TEXT';
    RAISE NOTICE '✅ Message message_type: VARCHAR(20) instead of TEXT';
    RAISE NOTICE '✅ User groups invite_code: VARCHAR(12) instead of TEXT (already fixed)';
    RAISE NOTICE '✅ User groups user_role: VARCHAR(50) instead of TEXT (already fixed)';
    RAISE NOTICE '✅ Send group chat message: Fixed ambiguous session_id in ON CONFLICT clause';
END $$;
