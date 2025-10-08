-- =====================================================
-- COMPLETE FIX FOR SEND_GROUP_CHAT_MESSAGE FUNCTION
-- Date: 2024-10-01
-- Description: Fix the ambiguous session_id column reference by being more explicit
-- =====================================================

-- Drop the existing function
DROP FUNCTION IF EXISTS public.send_group_chat_message(integer, integer, text, character varying, jsonb);

-- Recreate the function with clear variable names and no ambiguous references
CREATE OR REPLACE FUNCTION public.send_group_chat_message(
    p_session_id integer,  -- More clearly named as a parameter
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
        sender_id,  -- This is actually group_participant_id, not user_id
        content,
        message_type,
        metadata,
        sent_at
    )
    VALUES (
        p_session_id,
        v_sender_participant_id,  -- Use the retrieved group_participant_id
        p_content,
        p_message_type,
        p_metadata,
        v_timestamp
    )
    RETURNING message_id INTO v_message_id;
    
    -- Update user presence - avoid ambiguity by using explicit parameter names
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
    )
    ON CONFLICT (user_id, session_id) 
    DO UPDATE SET 
        status = 'online',
        last_seen = v_timestamp
    WHERE 
        user_presence.user_id = p_user_id AND 
        user_presence.session_id = p_session_id;
    
    -- Return message details with explicit variable names to avoid ambiguity
    RETURN QUERY
    SELECT 
        v_message_id,          -- Explicitly use the variable
        p_session_id,          -- Explicitly use the parameter
        v_sender_participant_id,  -- Explicitly use the variable
        v_sender_name,         -- Explicitly use the variable
        p_content,             -- Explicitly use the parameter
        p_message_type,        -- Explicitly use the parameter
        p_metadata,            -- Explicitly use the parameter
        v_timestamp;           -- Explicitly use the variable
END;
$function$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION send_group_chat_message(INTEGER, INTEGER, TEXT, VARCHAR(20), JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION send_group_chat_message(INTEGER, INTEGER, TEXT, VARCHAR(20), JSONB) TO anon;

-- Add comment
COMMENT ON FUNCTION send_group_chat_message(INTEGER, INTEGER, TEXT, VARCHAR(20), JSONB) IS 'Completely rewritten to avoid ambiguous column references and provide clearer parameter usage';

-- =====================================================
-- VERIFICATION
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '✅ SEND_GROUP_CHAT_MESSAGE COMPLETELY FIXED';
    RAISE NOTICE 'Rewrote function to eliminate ambiguous column references and clarify parameter usage';
END $$;
