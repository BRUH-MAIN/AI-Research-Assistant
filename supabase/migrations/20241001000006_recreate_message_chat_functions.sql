-- =====================================================
-- RECREATE MESSAGE AND GROUP CHAT FUNCTIONS
-- Date: 2024-10-01
-- Description: Message CRUD operations and group chat functionality
-- =====================================================

-- Create message function
CREATE OR REPLACE FUNCTION public.create_message(p_session_id integer, p_sender_user_id integer, p_content text)
RETURNS TABLE(message_id integer, session_id integer, sender_id integer, sender_name text, content text, sent_at timestamp without time zone)
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
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
$function$;

-- Get message by ID
CREATE OR REPLACE FUNCTION public.get_message_by_id(p_message_id integer)
RETURNS TABLE(message_id integer, session_id integer, sender_id integer, sender_name text, content text, sent_at timestamp without time zone)
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
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
$function$;

-- Get all messages
CREATE OR REPLACE FUNCTION public.get_all_messages(p_limit integer DEFAULT 100, p_offset integer DEFAULT 0)
RETURNS TABLE(id integer, session_id integer, sender_id integer, content text, message_type character varying, sent_at timestamp without time zone)
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
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
$function$;

-- Update message
CREATE OR REPLACE FUNCTION public.update_message(p_message_id integer, p_content text)
RETURNS TABLE(id integer, session_id integer, sender_id integer, content text, message_type character varying, sent_at timestamp without time zone, edited_at timestamp without time zone)
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
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
$function$;

-- Delete message
CREATE OR REPLACE FUNCTION public.delete_message(p_message_id integer)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
    -- Check if message exists
    IF NOT EXISTS (SELECT 1 FROM messages WHERE message_id = p_message_id) THEN
        RAISE EXCEPTION 'Message with ID % not found', p_message_id USING ERRCODE = 'P0002';
    END IF;
    
    -- Delete message (cascading deletes will handle related records)
    DELETE FROM messages WHERE message_id = p_message_id;
    
    RETURN true;
END;
$function$;

-- Search messages
CREATE OR REPLACE FUNCTION public.search_messages(p_query_text text, p_session_id integer DEFAULT NULL::integer, p_limit integer DEFAULT 50)
RETURNS TABLE(id integer, session_id integer, sender_id integer, content text, message_type character varying, sent_at timestamp without time zone)
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
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
$function$;

-- Get session messages
CREATE OR REPLACE FUNCTION public.get_session_messages(p_session_id integer)
RETURNS TABLE(message_id integer, session_id integer, sender_id integer, sender_name text, content text, sent_at timestamp without time zone)
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
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
$function$;

-- =====================================================
-- GROUP CHAT FUNCTIONS
-- =====================================================

-- Create group chat session (with title and description)
CREATE OR REPLACE FUNCTION public.create_group_chat_session(p_group_id integer, p_created_by integer, p_title text DEFAULT 'Group Chat Session'::text, p_description text DEFAULT ''::text)
RETURNS TABLE(session_id integer, title text, description text, status character varying, created_at timestamp without time zone)
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
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
        'active'::VARCHAR(20),
        CURRENT_TIMESTAMP::TIMESTAMP  -- Simple cast to remove timezone
    ;
END;
$function$;

-- Create group chat session (simple)
CREATE OR REPLACE FUNCTION public.create_group_chat_session(p_group_id integer, p_created_by integer, p_topic text DEFAULT 'Group Chat Session'::text)
RETURNS TABLE(session_id integer, topic text, status character varying, started_at timestamp without time zone)
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
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
$function$;

-- Get group chat sessions
CREATE OR REPLACE FUNCTION public.get_group_chat_sessions(p_group_id integer)
RETURNS TABLE(session_id integer, title text, description text, status character varying, created_by integer, creator_name text, participant_count bigint, last_message_at timestamp without time zone, last_message_content text, created_at timestamp without time zone)
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
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
        MAX(m.sent_at)::TIMESTAMP as last_message_at,  -- Simple cast to remove timezone
        (
            SELECT content FROM messages 
            WHERE messages.session_id = s.session_id
            ORDER BY sent_at DESC 
            LIMIT 1
        ) as last_message_content,
        s.started_at::TIMESTAMP as created_at  -- Simple cast to remove timezone
    FROM sessions s
    JOIN users u ON s.created_by = u.user_id
    LEFT JOIN session_participants sp ON s.session_id = sp.session_id
    LEFT JOIN messages m ON s.session_id = m.session_id
    WHERE s.group_id = p_group_id
    AND s.status = 'active'
    GROUP BY s.session_id, s.topic, s.status, s.created_by, u.first_name, u.last_name, u.email, s.started_at
    ORDER BY COALESCE(MAX(m.sent_at)::TIMESTAMP, s.started_at::TIMESTAMP) DESC;
END;
$function$;

-- Join group chat session
CREATE OR REPLACE FUNCTION public.join_group_chat_session(p_session_id integer, p_user_id integer)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
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
$function$;

-- Get group chat messages
CREATE OR REPLACE FUNCTION public.get_group_chat_messages(p_session_id integer, p_limit integer DEFAULT 50, p_offset integer DEFAULT 0)
RETURNS TABLE(message_id integer, session_id integer, sender_id integer, sender_name text, sender_user_id integer, content text, message_type character varying, metadata jsonb, sent_at timestamp without time zone, edited_at timestamp without time zone, reply_to integer)
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
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
$function$;

-- Send group chat message
CREATE OR REPLACE FUNCTION public.send_group_chat_message(p_session_id integer, p_user_id integer, p_content text, p_message_type character varying DEFAULT 'user'::character varying, p_metadata jsonb DEFAULT '{}'::jsonb)
RETURNS TABLE(message_id integer, session_id integer, sender_id integer, sender_name text, content text, message_type character varying, metadata jsonb, sent_at timestamp without time zone)
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
    v_message_id INTEGER;
    v_sender_id INTEGER;
    v_sender_name TEXT;
    v_timestamp TIMESTAMP := CURRENT_TIMESTAMP;
BEGIN
    -- Obama's validation
    IF p_session_id IS NULL OR p_user_id IS NULL OR p_content IS NULL OR TRIM(p_content) = '' THEN
        RAISE EXCEPTION 'Obama says: Session ID, User ID, and Content are required!' USING ERRCODE = '23514';
    END IF;
    
    -- Find sender with Obama's blessing (completely separate query)
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
        RAISE EXCEPTION 'Obama says: User % is not in session %!', p_user_id, p_session_id USING ERRCODE = 'P0002';
    END IF;
    
    -- Insert message (Obama style - clean and simple)
    WITH message_insert AS (
        INSERT INTO messages (session_id, sender_id, content, message_type, metadata, sent_at)
        VALUES (p_session_id, v_sender_id, p_content, p_message_type, p_metadata, v_timestamp)
        RETURNING message_id
    )
    SELECT message_id INTO v_message_id FROM message_insert;
    
    -- Obama's presence update (simple upsert)
    WITH presence_upsert AS (
        INSERT INTO user_presence (user_id, session_id, status, last_seen)
        VALUES (p_user_id, p_session_id, 'online', v_timestamp)
        ON CONFLICT (user_id, session_id) 
        DO UPDATE SET status = 'online', last_seen = v_timestamp
        RETURNING 1 as updated
    )
    SELECT 1 FROM presence_upsert;
    
    -- Obama's return (pure variables, no table conflicts possible)
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
$function$;

-- Grant permissions
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO anon;

-- Add comments
COMMENT ON FUNCTION public.create_message(integer, integer, text) IS 'Creates a new message in a session';
COMMENT ON FUNCTION public.get_message_by_id(integer) IS 'Retrieves message details by ID';
COMMENT ON FUNCTION public.get_all_messages(integer, integer) IS 'Returns all messages with pagination';
COMMENT ON FUNCTION public.update_message(integer, text) IS 'Updates message content';
COMMENT ON FUNCTION public.delete_message(integer) IS 'Permanently deletes a message';
COMMENT ON FUNCTION public.search_messages(text, integer, integer) IS 'Searches messages by content';
COMMENT ON FUNCTION public.get_session_messages(integer) IS 'Returns all messages in a session';
COMMENT ON FUNCTION public.create_group_chat_session(integer, integer, text, text) IS 'Creates group chat session with title and description';
COMMENT ON FUNCTION public.create_group_chat_session(integer, integer, text) IS 'Creates simple group chat session';
COMMENT ON FUNCTION public.get_group_chat_sessions(integer) IS 'Returns all group chat sessions for a group';
COMMENT ON FUNCTION public.join_group_chat_session(integer, integer) IS 'Allows user to join a group chat session';
COMMENT ON FUNCTION public.get_group_chat_messages(integer, integer, integer) IS 'Returns messages from a group chat with pagination';
COMMENT ON FUNCTION public.send_group_chat_message(integer, integer, text, character varying, jsonb) IS 'Sends a message to group chat';

-- =====================================================
-- VERIFICATION MESSAGE
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '✅ MESSAGE AND GROUP CHAT FUNCTIONS CREATED';
    RAISE NOTICE '📝 Ready for paper management functions';
END $$;
