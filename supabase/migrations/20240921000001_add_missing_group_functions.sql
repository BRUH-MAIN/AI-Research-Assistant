-- Migration: Add Missing Group Management Functions
-- Date: 20240921000001
-- Description: Add all missing group-related functions from original backup

-- Drop existing functions first to avoid signature conflicts
DROP FUNCTION IF EXISTS get_all_groups();
DROP FUNCTION IF EXISTS get_group_by_id(INTEGER);
DROP FUNCTION IF EXISTS get_user_groups(INTEGER);
DROP FUNCTION IF EXISTS get_group_by_invite_code(TEXT);
DROP FUNCTION IF EXISTS get_group_by_name(TEXT);
DROP FUNCTION IF EXISTS get_group_members_detailed(INTEGER);
DROP FUNCTION IF EXISTS add_group_member(INTEGER, INTEGER, VARCHAR);
DROP FUNCTION IF EXISTS remove_group_member(INTEGER, INTEGER);
DROP FUNCTION IF EXISTS join_group_by_invite_code(TEXT, INTEGER);
DROP FUNCTION IF EXISTS update_group_member_role(INTEGER, INTEGER, VARCHAR, INTEGER);
DROP FUNCTION IF EXISTS regenerate_invite_code(INTEGER, INTEGER);

-- Function to get all groups
CREATE OR REPLACE FUNCTION get_all_groups()
RETURNS TABLE (
    group_id INTEGER,
    name TEXT,
    description TEXT,
    is_public BOOLEAN,
    invite_code VARCHAR(12),
    member_count BIGINT,
    created_at TIMESTAMP,
    creator_name TEXT
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        g.group_id,
        g.name,
        COALESCE(g.description, '') as description,
        COALESCE(g.is_public, false) as is_public,
        g.invite_code,
        COUNT(gp.user_id) as member_count,
        g.created_at,
        COALESCE(u.first_name || ' ' || u.last_name, u.email) as creator_name
    FROM groups g
    LEFT JOIN group_participants gp ON g.group_id = gp.group_id
    LEFT JOIN users u ON g.created_by = u.user_id
    GROUP BY g.group_id, g.name, g.description, g.is_public, g.invite_code, g.created_at, u.first_name, u.last_name, u.email
    ORDER BY g.created_at DESC;
END;
$$;

-- Function to get group by ID
CREATE OR REPLACE FUNCTION get_group_by_id(p_group_id INTEGER)
RETURNS TABLE (
    group_id INTEGER,
    name TEXT,
    description TEXT,
    is_public BOOLEAN,
    invite_code VARCHAR(12),
    member_count BIGINT,
    created_at TIMESTAMP,
    creator_name TEXT
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Check if group exists
    IF NOT EXISTS (SELECT 1 FROM groups WHERE groups.group_id = p_group_id) THEN
        RAISE EXCEPTION 'Group with ID % not found', p_group_id USING ERRCODE = 'P0002';
    END IF;
    
    RETURN QUERY
    SELECT 
        g.group_id,
        g.name,
        COALESCE(g.description, '') as description,
        COALESCE(g.is_public, false) as is_public,
        g.invite_code,
        COUNT(gp.user_id) as member_count,
        g.created_at,
        COALESCE(u.first_name || ' ' || u.last_name, u.email) as creator_name
    FROM groups g
    LEFT JOIN group_participants gp ON g.group_id = gp.group_id
    LEFT JOIN users u ON g.created_by = u.user_id
    WHERE g.group_id = p_group_id
    GROUP BY g.group_id, g.name, g.description, g.is_public, g.invite_code, g.created_at, u.first_name, u.last_name, u.email;
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
    -- Return user's groups with details (empty if user doesn't exist)
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
        COALESCE(u.first_name || ' ' || u.last_name, u.email) as creator_name
    FROM groups g
    JOIN group_participants gp ON g.group_id = gp.group_id AND gp.user_id = p_user_id
    LEFT JOIN group_participants gp2 ON g.group_id = gp2.group_id
    LEFT JOIN users u ON g.created_by = u.user_id
    GROUP BY g.group_id, g.name, g.description, g.is_public, g.invite_code, gp.role, g.created_at, u.first_name, u.last_name, u.email
    ORDER BY g.created_at DESC;
END;
$$;

-- Function to get group by invite code
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
        COALESCE(u.first_name || ' ' || u.last_name, u.email) as creator_name
    FROM groups g
    LEFT JOIN group_participants gp ON g.group_id = gp.group_id
    LEFT JOIN users u ON g.created_by = u.user_id
    WHERE g.invite_code = p_invite_code
    GROUP BY g.group_id, g.name, g.description, g.is_public, g.created_at, u.first_name, u.last_name, u.email;
    
    -- If no rows returned, the invite code doesn't exist
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Invalid invite code' USING ERRCODE = 'P0002';
    END IF;
END;
$$;

-- Function to get group by name
CREATE OR REPLACE FUNCTION get_group_by_name(p_name TEXT)
RETURNS TABLE (
    group_id INTEGER,
    name TEXT,
    description TEXT,
    is_public BOOLEAN,
    invite_code VARCHAR(12),
    member_count BIGINT,
    created_at TIMESTAMP,
    creator_name TEXT
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Return group information if name exists
    RETURN QUERY
    SELECT 
        g.group_id,
        g.name,
        COALESCE(g.description, '') as description,
        COALESCE(g.is_public, false) as is_public,
        g.invite_code,
        COUNT(gp.user_id) as member_count,
        g.created_at,
        COALESCE(u.first_name || ' ' || u.last_name, u.email) as creator_name
    FROM groups g
    LEFT JOIN group_participants gp ON g.group_id = gp.group_id
    LEFT JOIN users u ON g.created_by = u.user_id
    WHERE g.name = p_name
    GROUP BY g.group_id, g.name, g.description, g.is_public, g.invite_code, g.created_at, u.first_name, u.last_name, u.email;
END;
$$;

-- Function to get detailed group members
CREATE OR REPLACE FUNCTION get_group_members_detailed(p_group_id INTEGER)
RETURNS TABLE (
    user_id INTEGER,
    name TEXT,
    email TEXT,
    role VARCHAR(50),
    joined_at TIMESTAMP
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Check if group exists
    IF NOT EXISTS (SELECT 1 FROM groups WHERE groups.group_id = p_group_id) THEN
        RAISE EXCEPTION 'Group with ID % not found', p_group_id USING ERRCODE = 'P0002';
    END IF;
    
    RETURN QUERY
    SELECT 
        u.user_id,
        COALESCE(u.first_name || ' ' || u.last_name, u.email) as name,
        u.email,
        gp.role,
        gp.joined_at
    FROM group_participants gp
    JOIN users u ON gp.user_id = u.user_id
    WHERE gp.group_id = p_group_id
    ORDER BY gp.joined_at;
END;
$$;

-- Function to add group member
CREATE OR REPLACE FUNCTION add_group_member(
    p_group_id INTEGER,
    p_user_id INTEGER,
    p_role VARCHAR(50) DEFAULT 'member'
)
RETURNS TABLE (
    message TEXT,
    user_id INTEGER,
    group_id INTEGER,
    role VARCHAR(50)
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Validate inputs
    IF p_group_id IS NULL OR p_user_id IS NULL THEN
        RAISE EXCEPTION 'Group ID and User ID are required' USING ERRCODE = '23514';
    END IF;
    
    -- Check if group exists
    IF NOT EXISTS (SELECT 1 FROM groups WHERE groups.group_id = p_group_id) THEN
        RAISE EXCEPTION 'Group with ID % not found', p_group_id USING ERRCODE = 'P0002';
    END IF;
    
    -- Check if user exists
    IF NOT EXISTS (SELECT 1 FROM users WHERE users.user_id = p_user_id) THEN
        RAISE EXCEPTION 'User with ID % not found', p_user_id USING ERRCODE = 'P0002';
    END IF;
    
    -- Check if user is already a member
    IF EXISTS (SELECT 1 FROM group_participants WHERE group_participants.group_id = p_group_id AND group_participants.user_id = p_user_id) THEN
        RAISE EXCEPTION 'User is already a member of this group' USING ERRCODE = '23505';
    END IF;
    
    -- Add user to group
    INSERT INTO group_participants (group_id, user_id, role, joined_at)
    VALUES (p_group_id, p_user_id, COALESCE(p_role, 'member'), NOW());
    
    RETURN QUERY
    SELECT 
        'User added to group successfully'::TEXT as message,
        p_user_id as user_id,
        p_group_id as group_id,
        COALESCE(p_role, 'member') as role;
END;
$$;

-- Function to remove group member
CREATE OR REPLACE FUNCTION remove_group_member(
    p_group_id INTEGER,
    p_user_id INTEGER
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Validate inputs
    IF p_group_id IS NULL OR p_user_id IS NULL THEN
        RAISE EXCEPTION 'Group ID and User ID are required' USING ERRCODE = '23514';
    END IF;
    
    -- Check if membership exists
    IF NOT EXISTS (SELECT 1 FROM group_participants WHERE group_participants.group_id = p_group_id AND group_participants.user_id = p_user_id) THEN
        RAISE EXCEPTION 'User is not a member of this group' USING ERRCODE = 'P0002';
    END IF;
    
    -- Remove user from group
    DELETE FROM group_participants 
    WHERE group_participants.group_id = p_group_id AND group_participants.user_id = p_user_id;
END;
$$;

-- Function to join group by invite code
CREATE OR REPLACE FUNCTION join_group_by_invite_code(
    p_invite_code TEXT,
    p_user_id INTEGER
)
RETURNS TABLE (
    message TEXT,
    group_id INTEGER,
    name TEXT,
    user_role VARCHAR(50)
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
    IF NOT EXISTS (SELECT 1 FROM users WHERE users.user_id = p_user_id) THEN
        RAISE EXCEPTION 'User with ID % not found', p_user_id USING ERRCODE = 'P0002';
    END IF;
    
    -- Get group info by invite code
    SELECT g.group_id, g.name INTO v_group_id, v_group_name
    FROM groups g
    WHERE g.invite_code = p_invite_code;
    
    IF v_group_id IS NULL THEN
        RAISE EXCEPTION 'Invalid invite code' USING ERRCODE = 'P0002';
    END IF;
    
    -- Check if user is already a member
    IF EXISTS (SELECT 1 FROM group_participants WHERE group_participants.group_id = v_group_id AND group_participants.user_id = p_user_id) THEN
        RAISE EXCEPTION 'User is already a member of this group' USING ERRCODE = '23505';
    END IF;
    
    -- Add user to group
    INSERT INTO group_participants (group_id, user_id, role, joined_at)
    VALUES (v_group_id, p_user_id, 'member', NOW());
    
    RETURN QUERY
    SELECT 
        'Successfully joined group'::TEXT as message,
        v_group_id as group_id,
        v_group_name as name,
        'member'::VARCHAR(50) as user_role;
END;
$$;

-- Function to update group member role
CREATE OR REPLACE FUNCTION update_group_member_role(
    p_group_id INTEGER,
    p_target_user_id INTEGER,
    p_new_role VARCHAR(50),
    p_admin_user_id INTEGER
)
RETURNS TABLE (
    message TEXT,
    user_id INTEGER,
    group_id INTEGER,
    role VARCHAR(50)
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Validate inputs
    IF p_group_id IS NULL OR p_target_user_id IS NULL OR p_admin_user_id IS NULL THEN
        RAISE EXCEPTION 'All IDs are required' USING ERRCODE = '23514';
    END IF;
    
    -- Check if admin user has permission (must be admin or creator)
    IF NOT EXISTS (
        SELECT 1 FROM group_participants gp
        JOIN groups g ON gp.group_id = g.group_id
        WHERE gp.group_id = p_group_id 
        AND gp.user_id = p_admin_user_id 
        AND (gp.role = 'admin' OR g.created_by = p_admin_user_id)
    ) THEN
        RAISE EXCEPTION 'Insufficient permissions to update member role' USING ERRCODE = '42501';
    END IF;
    
    -- Update the user's role
    UPDATE group_participants 
    SET role = p_new_role
    WHERE group_participants.group_id = p_group_id AND group_participants.user_id = p_target_user_id;
    
    RETURN QUERY
    SELECT 
        'Member role updated successfully'::TEXT as message,
        p_target_user_id as user_id,
        p_group_id as group_id,
        p_new_role as role;
END;
$$;

-- Function to regenerate invite code
CREATE OR REPLACE FUNCTION regenerate_invite_code(
    p_group_id INTEGER,
    p_user_id INTEGER
)
RETURNS TABLE (
    message TEXT,
    group_id INTEGER,
    invite_code VARCHAR(12)
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_new_code VARCHAR(12);
BEGIN
    -- Check if user has permission (must be admin or creator)
    IF NOT EXISTS (
        SELECT 1 FROM group_participants gp
        JOIN groups g ON gp.group_id = g.group_id
        WHERE gp.group_id = p_group_id 
        AND gp.user_id = p_user_id 
        AND (gp.role = 'admin' OR g.created_by = p_user_id)
    ) THEN
        RAISE EXCEPTION 'Insufficient permissions to regenerate invite code' USING ERRCODE = '42501';
    END IF;
    
    -- Generate new unique invite code
    LOOP
        v_new_code := upper(substring(md5(random()::text || clock_timestamp()::text) from 1 for 8));
        EXIT WHEN NOT EXISTS (SELECT 1 FROM groups WHERE groups.invite_code = v_new_code);
    END LOOP;
    
    -- Update the group's invite code
    UPDATE groups 
    SET invite_code = v_new_code
    WHERE groups.group_id = p_group_id;
    
    RETURN QUERY
    SELECT 
        'Invite code regenerated successfully'::TEXT as message,
        p_group_id as group_id,
        v_new_code as invite_code;
END;
$$;

-- Add comments for documentation
COMMENT ON FUNCTION get_all_groups() IS 'Get all groups with member counts and creator info';
COMMENT ON FUNCTION get_group_by_id(INTEGER) IS 'Get a specific group by ID with details';
COMMENT ON FUNCTION get_user_groups(INTEGER) IS 'Get all groups that a user belongs to with details';
COMMENT ON FUNCTION get_group_by_invite_code(TEXT) IS 'Get group information by invite code';
COMMENT ON FUNCTION get_group_by_name(TEXT) IS 'Get group information by name';
COMMENT ON FUNCTION get_group_members_detailed(INTEGER) IS 'Get detailed member list for a group';
COMMENT ON FUNCTION add_group_member(INTEGER, INTEGER, VARCHAR) IS 'Add a user to a group with specified role';
COMMENT ON FUNCTION remove_group_member(INTEGER, INTEGER) IS 'Remove a user from a group';
COMMENT ON FUNCTION join_group_by_invite_code(TEXT, INTEGER) IS 'Join a group using invite code';
COMMENT ON FUNCTION update_group_member_role(INTEGER, INTEGER, VARCHAR, INTEGER) IS 'Update member role (admin only)';
COMMENT ON FUNCTION regenerate_invite_code(INTEGER, INTEGER) IS 'Regenerate group invite code (admin only)';