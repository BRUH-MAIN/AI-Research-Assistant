-- Migration: Fix ambiguous column reference in create_session function
-- Date: 2025-09-20
-- Description: Fix ambiguous user_id column reference in ON CONFLICT clause

-- Update the create_session function to fix ambiguous column reference
CREATE OR REPLACE FUNCTION create_session(
    p_title TEXT,
    p_user_id INTEGER,
    p_group_id INTEGER DEFAULT 1
)
RETURNS TABLE (
    id INTEGER,
    title TEXT,
    user_id INTEGER,
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    is_active BOOLEAN,
    message_count BIGINT
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
    VALUES (p_group_id, p_user_id, v_final_title, 'active', now()::timestamp)
    RETURNING session_id INTO v_session_id;
    
    -- Ensure user is a participant in the group
    -- Fix: Use constraint name to avoid ambiguous column references
    INSERT INTO group_participants (group_id, user_id, role)
    VALUES (p_group_id, p_user_id, 'member')
    ON CONFLICT ON CONSTRAINT group_participants_group_id_user_id_key DO NOTHING;
    
    -- Return the created session
    RETURN QUERY
    SELECT 
        v_session_id as id,
        v_final_title as title,
        p_user_id as user_id,
        now()::timestamp as created_at,
        now()::timestamp as updated_at,
        true as is_active,
        0::BIGINT as message_count;
END;
$$;