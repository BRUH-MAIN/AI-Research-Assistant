-- =====================================================
-- CORE CRUD FUNCTIONS
-- Date: 2024-09-18
-- Description: All core CRUD functions for users, groups, and sessions
-- =====================================================

-- =====================================================
-- USER MANAGEMENT FUNCTIONS
-- =====================================================

-- Get user by auth_user_id (useful for API endpoints)
CREATE OR REPLACE FUNCTION public.get_user_by_auth_id(auth_id UUID)
RETURNS SETOF users AS $$
BEGIN
  RETURN QUERY
  SELECT * FROM public.users
  WHERE auth_user_id = auth_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get all users with formatted response
CREATE OR REPLACE FUNCTION get_all_users()
RETURNS TABLE (
    id INTEGER,
    auth_id UUID,
    name TEXT,
    email TEXT,
    is_active BOOLEAN
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        u.user_id::INTEGER as id,
        u.auth_user_id as auth_id,
        COALESCE(
            TRIM(CONCAT(u.first_name, ' ', u.last_name)), 
            u.email
        ) as name,
        u.email,
        CASE WHEN u.availability = 'available' THEN true ELSE false END as is_active
    FROM users u
    ORDER BY u.user_id;
END;
$$;

-- Get user by ID
CREATE OR REPLACE FUNCTION get_user_by_id(p_user_id INTEGER)
RETURNS TABLE (
    id INTEGER,
    name TEXT,
    email TEXT,
    is_active BOOLEAN,
    first_name TEXT,
    last_name TEXT,
    created_at TIMESTAMP
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        u.user_id::INTEGER as id,
        COALESCE(
            TRIM(CONCAT(u.first_name, ' ', u.last_name)), 
            u.email
        ) as name,
        u.email,
        CASE WHEN u.availability = 'available' THEN true ELSE false END as is_active,
        u.first_name,
        u.last_name,
        u.created_at
    FROM users u
    WHERE u.user_id = p_user_id;
    
    -- If no user found, raise exception
    IF NOT FOUND THEN
        RAISE EXCEPTION 'User with ID % not found', p_user_id USING ERRCODE = 'P0002';
    END IF;
END;
$$;

-- Create new user
CREATE OR REPLACE FUNCTION create_user(
    p_email TEXT,
    p_first_name TEXT DEFAULT NULL,
    p_last_name TEXT DEFAULT NULL
)
RETURNS TABLE (
    id INTEGER,
    name TEXT,
    email TEXT,
    is_active BOOLEAN
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id INTEGER;
BEGIN
    -- Validate email is not empty
    IF p_email IS NULL OR trim(p_email) = '' THEN
        RAISE EXCEPTION 'Email is required' USING ERRCODE = '23514';
    END IF;
    
    -- Check if user with email already exists
    IF EXISTS (SELECT 1 FROM users WHERE email = p_email) THEN
        RAISE EXCEPTION 'User with email % already exists', p_email USING ERRCODE = '23505';
    END IF;
    
    -- Insert new user
    INSERT INTO users (email, first_name, last_name, availability)
    VALUES (p_email, p_first_name, p_last_name, 'available')
    RETURNING user_id INTO v_user_id;
    
    -- Return the created user
    RETURN QUERY
    SELECT 
        v_user_id as id,
        COALESCE(
            TRIM(CONCAT(p_first_name, ' ', p_last_name)), 
            p_email
        ) as name,
        p_email as email,
        true as is_active;
END;
$$;

-- Update user
CREATE OR REPLACE FUNCTION update_user(
    p_user_id INTEGER,
    p_email TEXT DEFAULT NULL,
    p_first_name TEXT DEFAULT NULL,
    p_last_name TEXT DEFAULT NULL,
    p_is_active BOOLEAN DEFAULT NULL
)
RETURNS TABLE (
    id INTEGER,
    name TEXT,
    email TEXT,
    is_active BOOLEAN
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_availability TEXT;
BEGIN
    -- Check if user exists
    IF NOT EXISTS (SELECT 1 FROM users WHERE user_id = p_user_id) THEN
        RAISE EXCEPTION 'User with ID % not found', p_user_id USING ERRCODE = 'P0002';
    END IF;
    
    -- Convert boolean to availability string
    IF p_is_active IS NOT NULL THEN
        v_availability := CASE WHEN p_is_active THEN 'available' ELSE 'offline' END;
    END IF;
    
    -- Update user with provided values
    UPDATE users 
    SET 
        email = COALESCE(p_email, email),
        first_name = COALESCE(p_first_name, first_name),
        last_name = COALESCE(p_last_name, last_name),
        availability = COALESCE(v_availability, availability)
    WHERE user_id = p_user_id;
    
    -- Return updated user
    RETURN QUERY
    SELECT 
        u.user_id::INTEGER as id,
        COALESCE(
            TRIM(CONCAT(u.first_name, ' ', u.last_name)), 
            u.email
        ) as name,
        u.email,
        CASE WHEN u.availability = 'available' THEN true ELSE false END as is_active
    FROM users u
    WHERE u.user_id = p_user_id;
END;
$$;

-- Delete user
CREATE OR REPLACE FUNCTION delete_user(p_user_id INTEGER)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Check if user exists
    IF NOT EXISTS (SELECT 1 FROM users WHERE user_id = p_user_id) THEN
        RAISE EXCEPTION 'User with ID % not found', p_user_id USING ERRCODE = 'P0002';
    END IF;
    
    -- Delete user (cascading deletes will handle related records)
    DELETE FROM users WHERE user_id = p_user_id;
    
    RETURN true;
END;
$$;

-- Activate user
CREATE OR REPLACE FUNCTION activate_user(p_user_id INTEGER)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Check if user exists
    IF NOT EXISTS (SELECT 1 FROM users WHERE user_id = p_user_id) THEN
        RAISE EXCEPTION 'User with ID % not found', p_user_id USING ERRCODE = 'P0002';
    END IF;
    
    -- Update user availability
    UPDATE users SET availability = 'available' WHERE user_id = p_user_id;
    
    RETURN json_build_object('message', 'User ' || p_user_id || ' activated successfully');
END;
$$;

-- Deactivate user
CREATE OR REPLACE FUNCTION deactivate_user(p_user_id INTEGER)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Check if user exists
    IF NOT EXISTS (SELECT 1 FROM users WHERE user_id = p_user_id) THEN
        RAISE EXCEPTION 'User with ID % not found', p_user_id USING ERRCODE = 'P0002';
    END IF;
    
    -- Update user availability
    UPDATE users SET availability = 'offline' WHERE user_id = p_user_id;
    
    RETURN json_build_object('message', 'User ' || p_user_id || ' deactivated successfully');
END;
$$;

-- =====================================================
-- GROUP MANAGEMENT FUNCTIONS
-- =====================================================

-- Get all groups with member count
CREATE OR REPLACE FUNCTION get_all_groups()
RETURNS TABLE (
    id INTEGER,
    name TEXT,
    description TEXT,
    member_count BIGINT,
    created_at TIMESTAMP
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        g.group_id::INTEGER as id,
        g.name,
        COALESCE(g.description, '') as description,
        COUNT(gp.user_id) as member_count,
        g.created_at
    FROM groups g
    LEFT JOIN group_participants gp ON g.group_id = gp.group_id
    GROUP BY g.group_id, g.name, g.description, g.created_at
    ORDER BY g.group_id;
END;
$$;

-- Get group by ID
CREATE OR REPLACE FUNCTION get_group_by_id(p_group_id INTEGER)
RETURNS TABLE (
    id INTEGER,
    name TEXT,
    description TEXT,
    member_count BIGINT,
    created_at TIMESTAMP
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        g.group_id::INTEGER as id,
        g.name,
        COALESCE(g.description, '') as description,
        COUNT(gp.user_id) as member_count,
        g.created_at
    FROM groups g
    LEFT JOIN group_participants gp ON g.group_id = gp.group_id
    WHERE g.group_id = p_group_id
    GROUP BY g.group_id, g.name, g.description, g.created_at;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Group with ID % not found', p_group_id USING ERRCODE = 'P0002';
    END IF;
END;
$$;

-- Create new group (final consolidated version)
CREATE OR REPLACE FUNCTION create_group(
    p_name TEXT,
    p_created_by INTEGER,
    p_description TEXT DEFAULT '',
    p_is_public BOOLEAN DEFAULT false
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_group_id INTEGER;
    result JSON;
BEGIN
    -- Check if created_by is allowed to create groups
    IF p_created_by < 2 THEN
        RAISE EXCEPTION 'Users with ID less than 2 are not allowed to create groups';
    END IF;
    
    -- Validate group name
    IF p_name IS NULL OR trim(p_name) = '' THEN
        RAISE EXCEPTION 'Group name is required' USING ERRCODE = '23514';
    END IF;
    
    -- Check if user exists
    IF NOT EXISTS (SELECT 1 FROM users WHERE user_id = p_created_by) THEN
        RAISE EXCEPTION 'Creator user with ID % not found', p_created_by USING ERRCODE = 'P0002';
    END IF;
    
    -- Insert new group (invite_code will be auto-generated by trigger)
    INSERT INTO groups (name, description, created_by, is_public, created_at)
    VALUES (p_name, p_description, p_created_by, p_is_public, NOW())
    RETURNING group_id INTO v_group_id;
    
    -- Add creator as admin member
    INSERT INTO group_participants (group_id, user_id, role, joined_at)
    VALUES (v_group_id, p_created_by, 'admin', NOW());
    
    -- Return success result with group details
    SELECT json_build_object(
        'success', true,
        'group_id', v_group_id,
        'name', p_name,
        'description', p_description,
        'is_public', p_is_public,
        'created_by', p_created_by,
        'created_at', NOW()
    ) INTO result;
    
    RETURN result;
EXCEPTION
    WHEN OTHERS THEN
        -- Return error result
        RETURN json_build_object(
            'success', false,
            'error', SQLERRM
        );
END;
$$;

-- Get group members
CREATE OR REPLACE FUNCTION get_group_members(p_group_id INTEGER)
RETURNS TABLE (
    group_id INTEGER,
    member_ids INTEGER[],
    member_count BIGINT
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_member_ids INTEGER[];
    v_count BIGINT;
BEGIN
    -- Check if group exists
    IF NOT EXISTS (SELECT 1 FROM groups g WHERE g.group_id = p_group_id) THEN
        RAISE EXCEPTION 'Group with ID % not found', p_group_id USING ERRCODE = 'P0002';
    END IF;
    
    -- Get member IDs
    SELECT ARRAY_AGG(gp.user_id), COUNT(gp.user_id)
    INTO v_member_ids, v_count
    FROM group_participants gp
    WHERE gp.group_id = p_group_id;
    
    RETURN QUERY
    SELECT 
        p_group_id as group_id,
        COALESCE(v_member_ids, ARRAY[]::INTEGER[]) as member_ids,
        COALESCE(v_count, 0) as member_count;
END;
$$;

-- Add group member
CREATE OR REPLACE FUNCTION add_group_member(
    p_group_id INTEGER,
    p_user_id INTEGER,
    p_role TEXT DEFAULT 'member'
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Check if group exists
    IF NOT EXISTS (SELECT 1 FROM groups g WHERE g.group_id = p_group_id) THEN
        RAISE EXCEPTION 'Group with ID % not found', p_group_id USING ERRCODE = 'P0002';
    END IF;
    
    -- Check if user exists
    IF NOT EXISTS (SELECT 1 FROM users u WHERE u.user_id = p_user_id) THEN
        RAISE EXCEPTION 'User with ID % not found', p_user_id USING ERRCODE = 'P0002';
    END IF;
    
    -- Check if user is already a member
    IF EXISTS (SELECT 1 FROM group_participants WHERE group_id = p_group_id AND user_id = p_user_id) THEN
        RAISE EXCEPTION 'User % is already a member of group %', p_user_id, p_group_id USING ERRCODE = '23505';
    END IF;
    
    -- Validate role
    IF p_role NOT IN ('admin', 'member', 'mentor') THEN
        RAISE EXCEPTION 'Invalid role. Must be admin, member, or mentor' USING ERRCODE = '23514';
    END IF;
    
    -- Add user to group
    INSERT INTO group_participants (group_id, user_id, role)
    VALUES (p_group_id, p_user_id, p_role);
    
    RETURN json_build_object('message', 'User ' || p_user_id || ' added to group ' || p_group_id);
END;
$$;

-- Remove group member
CREATE OR REPLACE FUNCTION remove_group_member(
    p_group_id INTEGER,
    p_user_id INTEGER
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_deleted_count INTEGER;
BEGIN
    -- Check if group exists
    IF NOT EXISTS (SELECT 1 FROM groups g WHERE g.group_id = p_group_id) THEN
        RAISE EXCEPTION 'Group with ID % not found', p_group_id USING ERRCODE = 'P0002';
    END IF;
    
    -- Remove user from group
    DELETE FROM group_participants 
    WHERE group_id = p_group_id AND user_id = p_user_id;
    
    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
    
    IF v_deleted_count = 0 THEN
        RAISE EXCEPTION 'User % is not a member of group %', p_user_id, p_group_id USING ERRCODE = 'P0002';
    END IF;
    
    RETURN true;
END;
$$;

-- Get group by name
CREATE OR REPLACE FUNCTION get_group_by_name(p_name TEXT)
RETURNS TABLE (
    id INTEGER,
    name TEXT
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        g.group_id::INTEGER as id,
        g.name
    FROM groups g
    WHERE LOWER(g.name) = LOWER(p_name)
    LIMIT 1;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Group with name ''%'' not found', p_name USING ERRCODE = 'P0002';
    END IF;
END;
$$;

-- Join group by invite code
CREATE OR REPLACE FUNCTION join_group_by_invite_code(
    p_invite_code TEXT,
    p_user_id INTEGER
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_group_id INTEGER;
BEGIN
    -- Find group by invite code
    SELECT g.group_id INTO v_group_id
    FROM groups g
    WHERE g.invite_code = p_invite_code;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Invalid invite code' USING ERRCODE = 'P0002';
    END IF;
    
    -- Check if user exists
    IF NOT EXISTS (SELECT 1 FROM users WHERE user_id = p_user_id) THEN
        RAISE EXCEPTION 'User with ID % not found', p_user_id USING ERRCODE = 'P0002';
    END IF;
    
    -- Check if user is already a member
    IF EXISTS (SELECT 1 FROM group_participants WHERE group_id = v_group_id AND user_id = p_user_id) THEN
        RAISE EXCEPTION 'User is already a member of this group' USING ERRCODE = '23505';
    END IF;
    
    -- Add user to group
    INSERT INTO group_participants (group_id, user_id, role)
    VALUES (v_group_id, p_user_id, 'member');
    
    RETURN json_build_object(
        'success', true,
        'message', 'Successfully joined group',
        'group_id', v_group_id
    );
END;
$$;

-- Grant execute permissions on all functions
GRANT EXECUTE ON FUNCTION public.get_user_by_auth_id(UUID) TO anon, authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;