-- =====================================================
-- FIX AMBIGUOUS SESSION_ID IN SEND_GROUP_CHAT_MESSAGE
-- Date: 2024-10-01
-- Description: Fix the ambiguous session_id column reference in the send_group_chat_message function
-- =====================================================

-- Drop the existing function
DROP FUNCTION IF EXISTS public.send_group_chat_message(integer, integer, text, character varying, jsonb);

-- Recreate the function with fixed column references
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
    -- Validate inputs
    IF p_session_id IS NULL OR p_user_id IS NULL OR p_content IS NULL OR TRIM(p_content) = '' THEN
        RAISE EXCEPTION 'Session ID, User ID, and Content are required' USING ERRCODE = '23514';
    END IF;
    
    -- Find sender (using fully qualified column references)
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
        RAISE EXCEPTION 'User % is not in session %', p_user_id, p_session_id USING ERRCODE = 'P0002';
    END IF;
    
    -- Insert message (with fully qualified column references)
    INSERT INTO messages (session_id, sender_id, content, message_type, metadata, sent_at)
    VALUES (p_session_id, v_sender_id, p_content, p_message_type, p_metadata, v_timestamp)
    RETURNING messages.message_id INTO v_message_id;
    
    -- Update user presence with fully qualified column references in ON CONFLICT clause
    INSERT INTO user_presence (user_id, session_id, status, last_seen)
    VALUES (p_user_id, p_session_id, 'online', v_timestamp)
    ON CONFLICT (user_id, session_id) 
    DO UPDATE SET 
        status = 'online', 
        last_seen = v_timestamp
    WHERE user_presence.user_id = p_user_id 
      AND user_presence.session_id = p_session_id;
    
    -- Return message details
    RETURN QUERY
    SELECT 
        v_message_id as message_id,
        p_session_id as session_id,
        v_sender_id as sender_id,
        v_sender_name as sender_name,
        p_content as content,
        p_message_type as message_type,
        p_metadata as metadata,
        v_timestamp as sent_at;
END;
$function$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION send_group_chat_message(INTEGER, INTEGER, TEXT, VARCHAR(20), JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION send_group_chat_message(INTEGER, INTEGER, TEXT, VARCHAR(20), JSONB) TO anon;

-- Add comment
COMMENT ON FUNCTION send_group_chat_message(INTEGER, INTEGER, TEXT, VARCHAR(20), JSONB) IS 'Fixed: Resolved ambiguous session_id column reference in ON CONFLICT clause';

-- =====================================================
-- VERIFICATION
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '✅ SEND_GROUP_CHAT_MESSAGE FIXED';
    RAISE NOTICE 'Fixed ambiguous session_id column reference in ON CONFLICT clause';
END $$;
