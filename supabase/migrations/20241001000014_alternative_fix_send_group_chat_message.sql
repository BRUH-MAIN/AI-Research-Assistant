-- =====================================================
-- ALTERNATIVE FIX FOR SEND_GROUP_CHAT_MESSAGE FUNCTION
-- Date: 2024-10-01
-- Description: Alternative approach using CTE and explicit aliases
-- =====================================================

CREATE OR REPLACE FUNCTION public.send_group_chat_message(
    p_session_id integer,
    p_user_id integer,
    p_content text,
    p_message_type character varying DEFAULT 'user'::character varying,
    p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS TABLE(
    message_id integer,
    session_id integer,
    sender_id integer,
    sender_name text,
    content text,
    message_type character varying,
    metadata jsonb,
    sent_at timestamp without time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
    v_message_id INTEGER;
    v_sender_participant_id INTEGER;
    v_sender_name TEXT;
    v_timestamp TIMESTAMP := CURRENT_TIMESTAMP;
BEGIN
    -- Validate inputs
    IF p_session_id IS NULL OR p_user_id IS NULL OR p_content IS NULL OR TRIM(p_content) = '' THEN
        RAISE EXCEPTION 'Session ID, User ID, and Content are required' USING ERRCODE = '23514';
    END IF;
    
    -- Use a CTE to find sender information with fully qualified column names
    WITH sender_info AS (
        SELECT 
            gp.group_participant_id,
            COALESCE(u.first_name || ' ' || u.last_name, u.email) AS full_name
        FROM sessions s
        JOIN group_participants gp ON s.group_id = gp.group_id
        JOIN users u ON gp.user_id = u.user_id
        WHERE s.session_id = p_session_id AND gp.user_id = p_user_id
    )
    SELECT 
        group_participant_id, 
        full_name 
    INTO 
        v_sender_participant_id, 
        v_sender_name 
    FROM sender_info;
    
    IF v_sender_participant_id IS NULL THEN
        RAISE EXCEPTION 'User % is not a member of this session group', p_user_id USING ERRCODE = 'P0002';
    END IF;
    
    -- Insert message with table alias
    INSERT INTO messages AS m (session_id, sender_id, content, message_type, metadata, sent_at)
    VALUES (p_session_id, v_sender_participant_id, p_content, p_message_type, p_metadata, v_timestamp)
    RETURNING m.message_id INTO v_message_id;
    
    -- Use a separate transaction for presence update to avoid any chance of ambiguity
    -- First delete any existing presence
    DELETE FROM user_presence 
    WHERE user_presence.user_id = p_user_id AND user_presence.session_id = p_session_id;
    
    -- Then insert fresh presence
    INSERT INTO user_presence AS up (user_id, session_id, status, last_seen)
    VALUES (p_user_id, p_session_id, 'online', v_timestamp);
    
    -- Return directly with typed constructor
    RETURN QUERY
    SELECT 
        v_message_id::integer,
        p_session_id::integer,
        v_sender_participant_id::integer,
        v_sender_name::text,
        p_content::text,
        p_message_type::varchar,
        p_metadata::jsonb,
        v_timestamp::timestamp;
END;
$function$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION send_group_chat_message(INTEGER, INTEGER, TEXT, VARCHAR(20), JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION send_group_chat_message(INTEGER, INTEGER, TEXT, VARCHAR(20), JSONB) TO anon;

-- Add comment
COMMENT ON FUNCTION send_group_chat_message(INTEGER, INTEGER, TEXT, VARCHAR(20), JSONB) IS 'Alternative fix: Uses CTEs, table aliases, and explicit typing to avoid ambiguity';
