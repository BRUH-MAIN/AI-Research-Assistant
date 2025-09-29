-- =====================================================
-- EMERGENCY FIX FOR SEND_GROUP_CHAT_MESSAGE FUNCTION
-- Date: 2024-10-01
-- Description: Fix the persistent ambiguous session_id column reference using a different approach
-- =====================================================

-- This version completely avoids the ON CONFLICT clause that causes the ambiguity

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
    v_group_id INTEGER;
    v_presence_exists BOOLEAN;
BEGIN
    -- Validate inputs
    IF p_session_id IS NULL OR p_user_id IS NULL OR p_content IS NULL OR TRIM(p_content) = '' THEN
        RAISE EXCEPTION 'Session ID, User ID, and Content are required' USING ERRCODE = '23514';
    END IF;
    
    -- First, get the group_id from the session (this avoids ambiguity later)
    SELECT group_id INTO v_group_id 
    FROM sessions 
    WHERE session_id = p_session_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Session with ID % not found', p_session_id USING ERRCODE = 'P0002';
    END IF;
    
    -- Now get the sender's group_participant_id and name using the group_id
    SELECT 
        gp.group_participant_id,
        COALESCE(u.first_name || ' ' || u.last_name, u.email) 
    INTO 
        v_sender_participant_id, 
        v_sender_name
    FROM group_participants gp
    JOIN users u ON gp.user_id = u.user_id
    WHERE gp.group_id = v_group_id 
      AND gp.user_id = p_user_id;
    
    IF v_sender_participant_id IS NULL THEN
        RAISE EXCEPTION 'User % is not a member of the group for session %', p_user_id, p_session_id 
        USING ERRCODE = 'P0002';
    END IF;
    
    -- Insert message using the retrieved sender_participant_id
    INSERT INTO messages (
        session_id,
        sender_id,
        content,
        message_type,
        metadata,
        sent_at
    )
    VALUES (
        p_session_id,
        v_sender_participant_id,
        p_content,
        p_message_type,
        p_metadata,
        v_timestamp
    )
    RETURNING message_id INTO v_message_id;
    
    -- ALTERNATIVE APPROACH: Check if presence record exists first, then INSERT or UPDATE
    -- This completely avoids the ON CONFLICT clause that might be causing the ambiguity
    
    -- Check if presence record exists
    SELECT EXISTS(
        SELECT 1 
        FROM user_presence 
        WHERE user_id = p_user_id AND session_id = p_session_id
    ) INTO v_presence_exists;
    
    -- Update or insert based on existence check
    IF v_presence_exists THEN
        -- Record exists, do an UPDATE
        UPDATE user_presence
        SET status = 'online', 
            last_seen = v_timestamp
        WHERE user_id = p_user_id 
          AND session_id = p_session_id;
    ELSE
        -- Record doesn't exist, do an INSERT
        INSERT INTO user_presence (
            user_id,
            session_id,
            status,
            last_seen
        )
        VALUES (
            p_user_id,
            p_session_id,
            'online',
            v_timestamp
        );
    END IF;
    
    -- Return message details with explicit variable names to avoid ambiguity
    RETURN QUERY
    VALUES (
        v_message_id,
        p_session_id,
        v_sender_participant_id,
        v_sender_name,
        p_content,
        p_message_type,
        p_metadata,
        v_timestamp
    );
END;
$function$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION send_group_chat_message(INTEGER, INTEGER, TEXT, VARCHAR(20), JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION send_group_chat_message(INTEGER, INTEGER, TEXT, VARCHAR(20), JSONB) TO anon;

-- Add comment
COMMENT ON FUNCTION send_group_chat_message(INTEGER, INTEGER, TEXT, VARCHAR(20), JSONB) IS 'Emergency fix: Completely avoids ON CONFLICT clause to resolve ambiguous column reference';
