-- Migration: Add Group Management Functions
-- Date: 20240920000002
-- Description: Add invite code based joining, role management, and enhanced group operations

-- Function to get group by invite code with public visibility check
CREATE OR REPLACE FUNCTION get_group_by_invite_code(p_invite_code TEXT)
RETURNS TABLE (
    group_id INTEGER,
    name TEXT,
    description TEXT,
    is_public BOOLEAN,
    member_count BIGINT,
    created_at TIMESTAMP,
    creator_name TEXT
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Validate invite code
    IF p_invite_code IS NULL OR trim(p_invite_code) = '' THEN
        RAISE EXCEPTION 'Invite code is required' USING ERRCODE = '23514';
    END IF;
    
    -- Return group information if invite code exists
    RETURN QUERY
    SELECT 
        g.group_id,
        g.name,
        COALESCE(g.description, '') as description,
        COALESCE(g.is_public, false) as is_public,
        COUNT(gp.user_id) as member_count,
        g.created_at,
        (u.first_name || ' ' || u.last_name) as creator_name
    FROM groups g
    LEFT JOIN group_participants gp ON g.group_id = gp.group_id
    LEFT JOIN users u ON g.created_by = u.user_id
    WHERE g.invite_code = p_invite_code
    GROUP BY g.group_id, g.name, g.description, g.is_public, g.created_at, u.first_name, u.last_name;
    
    -- If no rows returned, the invite code doesn't exist
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Invalid invite code' USING ERRCODE = 'P0002';
    END IF;
END;
$$;

-- Function to join group by invite code
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
    IF EXISTS (SELECT 1 FROM group_participants WHERE group_id = v_group_id AND user_id = p_user_id) THEN
        RAISE EXCEPTION 'User is already a member of this group' USING ERRCODE = '23505';
    END IF;
    
    -- Add user to group as member
    INSERT INTO group_participants (group_id, user_id, role, joined_at)
    VALUES (v_group_id, p_user_id, 'member', CURRENT_TIMESTAMP);
    
    -- Return success information
    RETURN QUERY
    SELECT 
        v_group_id as group_id,
        v_group_name as name,
        'member'::TEXT as role,
        CURRENT_TIMESTAMP as joined_at;
END;
$$;

-- Function to update group member role
CREATE OR REPLACE FUNCTION update_group_member_role(
    p_group_id INTEGER,
    p_target_user_id INTEGER,
    p_new_role TEXT,
    p_admin_user_id INTEGER
)
RETURNS TABLE (
    group_id INTEGER,
    user_id INTEGER,
    role TEXT,
    updated_at TIMESTAMP
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_admin_role TEXT;
    v_target_role TEXT;
BEGIN
    -- Validate inputs
    IF p_group_id IS NULL OR p_target_user_id IS NULL OR p_admin_user_id IS NULL THEN
        RAISE EXCEPTION 'Group ID, target user ID, and admin user ID are required' USING ERRCODE = '23514';
    END IF;
    
    IF p_new_role NOT IN ('member', 'mentor', 'admin') THEN
        RAISE EXCEPTION 'Invalid role. Must be member, mentor, or admin' USING ERRCODE = '23514';
    END IF;
    
    -- Check if group exists
    IF NOT EXISTS (SELECT 1 FROM groups WHERE group_id = p_group_id) THEN
        RAISE EXCEPTION 'Group with ID % not found', p_group_id USING ERRCODE = 'P0002';
    END IF;
    
    -- Get admin user's role
    SELECT gp.role INTO v_admin_role
    FROM group_participants gp
    WHERE gp.group_id = p_group_id AND gp.user_id = p_admin_user_id;
    
    -- Check if admin user has permission (must be admin or mentor)
    IF v_admin_role IS NULL THEN
        RAISE EXCEPTION 'User is not a member of this group' USING ERRCODE = '42501';
    END IF;
    
    IF v_admin_role NOT IN ('admin', 'mentor') THEN
        RAISE EXCEPTION 'Insufficient permissions. Only admins and mentors can update roles' USING ERRCODE = '42501';
    END IF;
    
    -- Get target user's current role
    SELECT gp.role INTO v_target_role
    FROM group_participants gp
    WHERE gp.group_id = p_group_id AND gp.user_id = p_target_user_id;
    
    -- Check if target user exists in group
    IF v_target_role IS NULL THEN
        RAISE EXCEPTION 'Target user is not a member of this group' USING ERRCODE = 'P0002';
    END IF;
    
    -- Additional permission checks for admin role changes
    IF p_new_role = 'admin' AND v_admin_role != 'admin' THEN
        RAISE EXCEPTION 'Only admins can promote users to admin role' USING ERRCODE = '42501';
    END IF;
    
    -- Prevent admin from demoting themselves if they're the only admin
    IF p_target_user_id = p_admin_user_id AND v_target_role = 'admin' AND p_new_role != 'admin' THEN
        IF (SELECT COUNT(*) FROM group_participants WHERE group_id = p_group_id AND role = 'admin') = 1 THEN
            RAISE EXCEPTION 'Cannot demote the only admin in the group' USING ERRCODE = '23514';
        END IF;
    END IF;
    
    -- Update the role
    UPDATE group_participants 
    SET role = p_new_role, joined_at = CURRENT_TIMESTAMP
    WHERE group_id = p_group_id AND user_id = p_target_user_id;
    
    -- Return updated information
    RETURN QUERY
    SELECT 
        p_group_id as group_id,
        p_target_user_id as user_id,
        p_new_role as role,
        CURRENT_TIMESTAMP as updated_at;
END;
$$;

-- Function to regenerate invite code for a group
CREATE OR REPLACE FUNCTION regenerate_invite_code(
    p_group_id INTEGER,
    p_admin_user_id INTEGER
)
RETURNS TABLE (
    group_id INTEGER,
    invite_code TEXT,
    updated_at TIMESTAMP
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_admin_role TEXT;
    v_new_invite_code TEXT;
BEGIN
    -- Validate inputs
    IF p_group_id IS NULL OR p_admin_user_id IS NULL THEN
        RAISE EXCEPTION 'Group ID and admin user ID are required' USING ERRCODE = '23514';
    END IF;
    
    -- Check if group exists
    IF NOT EXISTS (SELECT 1 FROM groups WHERE group_id = p_group_id) THEN
        RAISE EXCEPTION 'Group with ID % not found', p_group_id USING ERRCODE = 'P0002';
    END IF;
    
    -- Get admin user's role
    SELECT gp.role INTO v_admin_role
    FROM group_participants gp
    WHERE gp.group_id = p_group_id AND gp.user_id = p_admin_user_id;
    
    -- Check if user has permission (must be admin)
    IF v_admin_role IS NULL THEN
        RAISE EXCEPTION 'User is not a member of this group' USING ERRCODE = '42501';
    END IF;
    
    IF v_admin_role != 'admin' THEN
        RAISE EXCEPTION 'Insufficient permissions. Only admins can regenerate invite codes' USING ERRCODE = '42501';
    END IF;
    
    -- Generate new unique invite code
    LOOP
        v_new_invite_code := generate_invite_code();
        -- Check if code is unique
        IF NOT EXISTS (SELECT 1 FROM groups WHERE invite_code = v_new_invite_code AND group_id != p_group_id) THEN
            EXIT;
        END IF;
    END LOOP;
    
    -- Update the group with new invite code
    UPDATE groups 
    SET invite_code = v_new_invite_code, updated_at = CURRENT_TIMESTAMP
    WHERE group_id = p_group_id;
    
    -- Return new invite code
    RETURN QUERY
    SELECT 
        p_group_id as group_id,
        v_new_invite_code as invite_code,
        CURRENT_TIMESTAMP as updated_at;
END;
$$;

-- Function to leave a group
CREATE OR REPLACE FUNCTION leave_group(
    p_group_id INTEGER,
    p_user_id INTEGER
)
RETURNS TABLE (
    group_id INTEGER,
    user_id INTEGER,
    left_at TIMESTAMP
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_role TEXT;
    v_admin_count INTEGER;
BEGIN
    -- Validate inputs
    IF p_group_id IS NULL OR p_user_id IS NULL THEN
        RAISE EXCEPTION 'Group ID and user ID are required' USING ERRCODE = '23514';
    END IF;
    
    -- Check if group exists
    IF NOT EXISTS (SELECT 1 FROM groups WHERE group_id = p_group_id) THEN
        RAISE EXCEPTION 'Group with ID % not found', p_group_id USING ERRCODE = 'P0002';
    END IF;
    
    -- Get user's role in the group
    SELECT gp.role INTO v_user_role
    FROM group_participants gp
    WHERE gp.group_id = p_group_id AND gp.user_id = p_user_id;
    
    -- Check if user is a member
    IF v_user_role IS NULL THEN
        RAISE EXCEPTION 'User is not a member of this group' USING ERRCODE = 'P0002';
    END IF;
    
    -- Check if user is the only admin (prevent leaving if so)
    IF v_user_role = 'admin' THEN
        SELECT COUNT(*) INTO v_admin_count
        FROM group_participants 
        WHERE group_id = p_group_id AND role = 'admin';
        
        IF v_admin_count = 1 THEN
            RAISE EXCEPTION 'Cannot leave group as the only admin. Please promote another member to admin first' USING ERRCODE = '23514';
        END IF;
    END IF;
    
    -- Remove user from group
    DELETE FROM group_participants 
    WHERE group_id = p_group_id AND user_id = p_user_id;
    
    -- Return confirmation
    RETURN QUERY
    SELECT 
        p_group_id as group_id,
        p_user_id as user_id,
        CURRENT_TIMESTAMP as left_at;
END;
$$;

-- Function to get detailed group members with user information
CREATE OR REPLACE FUNCTION get_group_members_detailed(p_group_id INTEGER)
RETURNS TABLE (
    user_id INTEGER,
    first_name TEXT,
    last_name TEXT,
    email TEXT,
    role TEXT,
    joined_at TIMESTAMP
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Check if group exists
    IF NOT EXISTS (SELECT 1 FROM groups WHERE group_id = p_group_id) THEN
        RAISE EXCEPTION 'Group with ID % not found', p_group_id USING ERRCODE = 'P0002';
    END IF;
    
    -- Return detailed member information
    RETURN QUERY
    SELECT 
        u.user_id,
        u.first_name,
        u.last_name,
        u.email,
        gp.role,
        gp.joined_at
    FROM group_participants gp
    JOIN users u ON gp.user_id = u.user_id
    WHERE gp.group_id = p_group_id
    ORDER BY 
        CASE gp.role 
            WHEN 'admin' THEN 1 
            WHEN 'mentor' THEN 2 
            WHEN 'member' THEN 3 
        END,
        gp.joined_at ASC;
END;
$$;

-- Function to get user's groups with role and details
CREATE OR REPLACE FUNCTION get_user_groups(p_user_id INTEGER)
RETURNS TABLE (
    group_id INTEGER,
    name TEXT,
    description TEXT,
    is_public BOOLEAN,
    invite_code VARCHAR(12),
    user_role VARCHAR(50),
    member_count BIGINT,
    created_at TIMESTAMP,
    creator_name TEXT
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Check if user exists
    IF NOT EXISTS (SELECT 1 FROM users WHERE user_id = p_user_id) THEN
        RAISE EXCEPTION 'User with ID % not found', p_user_id USING ERRCODE = 'P0002';
    END IF;
    
    -- Return user's groups with details
    RETURN QUERY
    SELECT 
        g.group_id,
        g.name,
        COALESCE(g.description, '') as description,
        COALESCE(g.is_public, false) as is_public,
        g.invite_code,
        gp.role as user_role,
        COUNT(gp2.user_id) as member_count,
        g.created_at,
        (u.first_name || ' ' || u.last_name) as creator_name
    FROM groups g
    JOIN group_participants gp ON g.group_id = gp.group_id AND gp.user_id = p_user_id
    LEFT JOIN group_participants gp2 ON g.group_id = gp2.group_id
    LEFT JOIN users u ON g.created_by = u.user_id
    GROUP BY g.group_id, g.name, g.description, g.is_public, g.invite_code, gp.role, g.created_at, u.first_name, u.last_name
    ORDER BY g.created_at DESC;
END;
$$;

-- Update the create_group function to support new fields
CREATE OR REPLACE FUNCTION create_group(
    p_name TEXT,
    p_created_by INTEGER,
    p_description TEXT DEFAULT '',
    p_is_public BOOLEAN DEFAULT false
)
RETURNS TABLE (
    group_id INTEGER,
    name TEXT,
    description TEXT,
    is_public BOOLEAN,
    invite_code TEXT,
    member_count BIGINT,
    created_at TIMESTAMP
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_group_id INTEGER;
    v_invite_code TEXT;
BEGIN
    -- Validate group name
    IF p_name IS NULL OR trim(p_name) = '' THEN
        RAISE EXCEPTION 'Group name is required' USING ERRCODE = '23514';
    END IF;
    
    -- Check if user exists
    IF NOT EXISTS (SELECT 1 FROM users WHERE user_id = p_created_by) THEN
        RAISE EXCEPTION 'Creator user with ID % not found', p_created_by USING ERRCODE = 'P0002';
    END IF;
    
    -- Insert new group (invite_code will be auto-generated by trigger)
    INSERT INTO groups (name, created_by, description, is_public)
    VALUES (p_name, p_created_by, COALESCE(p_description, ''), COALESCE(p_is_public, false))
    RETURNING groups.group_id, groups.invite_code INTO v_group_id, v_invite_code;
    
    -- Add creator as admin member
    INSERT INTO group_participants (group_id, user_id, role)
    VALUES (v_group_id, p_created_by, 'admin');
    
    -- Return the created group
    RETURN QUERY
    SELECT 
        v_group_id as group_id,
        p_name as name,
        COALESCE(p_description, '') as description,
        COALESCE(p_is_public, false) as is_public,
        v_invite_code as invite_code,
        1::BIGINT as member_count,
        CURRENT_TIMESTAMP as created_at;
END;
$$;

-- Add comments for documentation
COMMENT ON FUNCTION get_group_by_invite_code(TEXT) IS 'Get group information by invite code for joining preview';
COMMENT ON FUNCTION join_group_by_invite_code(TEXT, INTEGER) IS 'Join a group using invite code';
COMMENT ON FUNCTION update_group_member_role(INTEGER, INTEGER, TEXT, INTEGER) IS 'Update group member role (admin/mentor permissions required)';
COMMENT ON FUNCTION regenerate_invite_code(INTEGER, INTEGER) IS 'Regenerate invite code for a group (admin only)';
COMMENT ON FUNCTION leave_group(INTEGER, INTEGER) IS 'Leave a group (prevents only admin from leaving)';
COMMENT ON FUNCTION get_group_members_detailed(INTEGER) IS 'Get detailed group member list with user information';
COMMENT ON FUNCTION get_user_groups(INTEGER) IS 'Get all groups that a user belongs to with details';