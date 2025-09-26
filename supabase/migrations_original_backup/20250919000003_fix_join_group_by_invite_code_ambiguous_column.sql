-- Migration: Fix ambiguous column reference in join_group_by_invite_code function
-- Date: 20250919000003
-- Description: Fix the ambiguous column reference "group_id" in the join_group_by_invite_code function

CREATE OR REPLACE FUNCTION join_group_by_invite_code(
    p_invite_code TEXT,
    p_user_id INTEGER
)
RETURNS TABLE (
    group_id INTEGER,
    name TEXT,
    role TEXT,
    joined_at TIMESTAMP
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_group_id INTEGER;
    v_group_name TEXT;
BEGIN
    -- Validate inputs
    IF p_invite_code IS NULL OR trim(p_invite_code) = '' THEN
        RAISE EXCEPTION 'Invite code is required' USING ERRCODE = '23514';
    END IF;
    
    IF p_user_id IS NULL THEN
        RAISE EXCEPTION 'User ID is required' USING ERRCODE = '23514';
    END IF;
    
    -- Check if user exists
    IF NOT EXISTS (SELECT 1 FROM users WHERE user_id = p_user_id) THEN
        RAISE EXCEPTION 'User with ID % not found', p_user_id USING ERRCODE = 'P0002';
    END IF;
    
    -- Get group info by invite code
    SELECT g.group_id, g.name 
    INTO v_group_id, v_group_name
    FROM groups g 
    WHERE g.invite_code = p_invite_code;
    
    -- Check if group exists
    IF v_group_id IS NULL THEN
        RAISE EXCEPTION 'Invalid invite code' USING ERRCODE = 'P0002';
    END IF;
    
    -- Check if user is already a member
    IF EXISTS (SELECT 1 FROM group_participants WHERE group_participants.group_id = v_group_id AND group_participants.user_id = p_user_id) THEN
        RAISE EXCEPTION 'User is already a member of this group' USING ERRCODE = '23505';
    END IF;
    
    -- Add user to group as member
    INSERT INTO group_participants (group_id, user_id, role, joined_at)
    VALUES (v_group_id, p_user_id, 'member', CURRENT_TIMESTAMP);
    
    -- Return success information (explicitly qualify the local variables to avoid ambiguity)
    RETURN QUERY
    SELECT 
        v_group_id::INTEGER,
        v_group_name::TEXT,
        'member'::TEXT,
        CURRENT_TIMESTAMP::TIMESTAMP;
END;
$$;

-- Add comment for documentation
COMMENT ON FUNCTION join_group_by_invite_code(TEXT, INTEGER) IS 'Join a group using invite code - fixed ambiguous column reference issue';