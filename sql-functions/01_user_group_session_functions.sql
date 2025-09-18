-- PostgreSQL Functions for Research Assistant Database Operations
-- These functions will be called via Supabase RPC from Express.js

-- =====================================================
-- USER OPERATIONS
-- =====================================================

-- Get all users with formatted response
CREATE OR REPLACE FUNCTION get_all_users()
RETURNS TABLE (
    id INTEGER,
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
-- GROUP OPERATIONS
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
        ''::TEXT as description, -- Schema doesn't have description field
        COUNT(gp.user_id) as member_count,
        g.created_at
    FROM groups g
    LEFT JOIN group_participants gp ON g.group_id = gp.group_id
    GROUP BY g.group_id, g.name, g.created_at
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
        ''::TEXT as description,
        COUNT(gp.user_id) as member_count,
        g.created_at
    FROM groups g
    LEFT JOIN group_participants gp ON g.group_id = gp.group_id
    WHERE g.group_id = p_group_id
    GROUP BY g.group_id, g.name, g.created_at;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Group with ID % not found', p_group_id USING ERRCODE = 'P0002';
    END IF;
END;
$$;

-- Create new group
CREATE OR REPLACE FUNCTION create_group(
    p_name TEXT,
    p_created_by INTEGER,
    p_description TEXT DEFAULT ''
)
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
DECLARE
    v_group_id INTEGER;
BEGIN
    -- Validate group name
    IF p_name IS NULL OR trim(p_name) = '' THEN
        RAISE EXCEPTION 'Group name is required' USING ERRCODE = '23514';
    END IF;
    
    -- Check if user exists
    IF NOT EXISTS (SELECT 1 FROM users WHERE user_id = p_created_by) THEN
        RAISE EXCEPTION 'Creator user with ID % not found', p_created_by USING ERRCODE = 'P0002';
    END IF;
    
    -- Insert new group
    INSERT INTO groups (name, created_by)
    VALUES (p_name, p_created_by)
    RETURNING group_id INTO v_group_id;
    
    -- Add creator as admin member
    INSERT INTO group_participants (group_id, user_id, role)
    VALUES (v_group_id, p_created_by, 'admin');
    
    -- Return the created group
    RETURN QUERY
    SELECT 
        v_group_id as id,
        p_name as name,
        p_description as description,
        1::BIGINT as member_count,
        CURRENT_TIMESTAMP as created_at;
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
    IF NOT EXISTS (SELECT 1 FROM groups WHERE group_id = p_group_id) THEN
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
    IF NOT EXISTS (SELECT 1 FROM groups WHERE group_id = p_group_id) THEN
        RAISE EXCEPTION 'Group with ID % not found', p_group_id USING ERRCODE = 'P0002';
    END IF;
    
    -- Check if user exists
    IF NOT EXISTS (SELECT 1 FROM users WHERE user_id = p_user_id) THEN
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
    IF NOT EXISTS (SELECT 1 FROM groups WHERE group_id = p_group_id) THEN
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

-- =====================================================
-- SESSION OPERATIONS
-- =====================================================

-- Get all sessions with optional filtering
CREATE OR REPLACE FUNCTION get_all_sessions(
    p_user_id INTEGER DEFAULT NULL,
    p_is_active BOOLEAN DEFAULT NULL
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
BEGIN
    RETURN QUERY
    SELECT 
        s.session_id::INTEGER as id,
        COALESCE(s.topic, 'Untitled Session') as title,
        s.created_by::INTEGER as user_id,
        s.started_at as created_at,
        COALESCE(s.ended_at, s.started_at) as updated_at,
        CASE WHEN s.status = 'active' THEN true ELSE false END as is_active,
        COUNT(m.message_id) as message_count
    FROM sessions s
    LEFT JOIN messages m ON s.session_id = m.session_id
    WHERE (p_user_id IS NULL OR s.created_by = p_user_id)
      AND (p_is_active IS NULL OR 
           (p_is_active = true AND s.status = 'active') OR
           (p_is_active = false AND s.status != 'active'))
    GROUP BY s.session_id, s.topic, s.created_by, s.started_at, s.ended_at, s.status
    ORDER BY s.session_id;
END;
$$;

-- Get session by ID
CREATE OR REPLACE FUNCTION get_session_by_id(p_session_id INTEGER)
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
BEGIN
    RETURN QUERY
    SELECT 
        s.session_id::INTEGER as id,
        COALESCE(s.topic, 'Untitled Session') as title,
        s.created_by::INTEGER as user_id,
        s.started_at as created_at,
        COALESCE(s.ended_at, s.started_at) as updated_at,
        CASE WHEN s.status = 'active' THEN true ELSE false END as is_active,
        COUNT(m.message_id) as message_count
    FROM sessions s
    LEFT JOIN messages m ON s.session_id = m.session_id
    WHERE s.session_id = p_session_id
    GROUP BY s.session_id, s.topic, s.created_by, s.started_at, s.ended_at, s.status;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Session with ID % not found', p_session_id USING ERRCODE = 'P0002';
    END IF;
END;
$$;

-- Create new session
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
    IF NOT EXISTS (SELECT 1 FROM users WHERE user_id = p_user_id) THEN
        RAISE EXCEPTION 'User with ID % not found', p_user_id USING ERRCODE = 'P0002';
    END IF;
    
    -- Validate group exists
    IF NOT EXISTS (SELECT 1 FROM groups WHERE group_id = p_group_id) THEN
        RAISE EXCEPTION 'Group with ID % not found', p_group_id USING ERRCODE = 'P0002';
    END IF;
    
    -- Set default title if not provided
    v_final_title := COALESCE(p_title, 'Session ' || TO_CHAR(CURRENT_TIMESTAMP, 'YYYYMMDD_HH24MISS'));
    
    -- Insert new session
    INSERT INTO sessions (group_id, created_by, topic, status, started_at)
    VALUES (p_group_id, p_user_id, v_final_title, 'active', CURRENT_TIMESTAMP)
    RETURNING session_id INTO v_session_id;
    
    -- Ensure user is a participant in the group
    INSERT INTO group_participants (group_id, user_id, role)
    VALUES (p_group_id, p_user_id, 'member')
    ON CONFLICT (group_id, user_id) DO NOTHING;
    
    -- Return the created session
    RETURN QUERY
    SELECT 
        v_session_id as id,
        v_final_title as title,
        p_user_id as user_id,
        CURRENT_TIMESTAMP as created_at,
        CURRENT_TIMESTAMP as updated_at,
        true as is_active,
        0::BIGINT as message_count;
END;
$$;

-- Get session summary
CREATE OR REPLACE FUNCTION get_session_summary(p_session_id INTEGER)
RETURNS TABLE (
    session_id INTEGER,
    title TEXT,
    message_count BIGINT,
    duration TEXT,
    is_active BOOLEAN
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_session_info RECORD;
    v_message_count BIGINT;
    v_duration TEXT;
BEGIN
    -- Get session info
    SELECT s.session_id, s.topic, s.status, s.started_at, s.ended_at
    INTO v_session_info
    FROM sessions s
    WHERE s.session_id = p_session_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Session with ID % not found', p_session_id USING ERRCODE = 'P0002';
    END IF;
    
    -- Get message count
    SELECT COUNT(*) INTO v_message_count
    FROM messages m
    WHERE m.session_id = p_session_id;
    
    -- Calculate duration
    IF v_session_info.ended_at IS NOT NULL THEN
        v_duration := EXTRACT(EPOCH FROM (v_session_info.ended_at - v_session_info.started_at))::TEXT || ' seconds';
    ELSE
        v_duration := 'Session in progress';
    END IF;
    
    RETURN QUERY
    SELECT 
        p_session_id as session_id,
        COALESCE(v_session_info.topic, 'Untitled Session') as title,
        v_message_count as message_count,
        v_duration as duration,
        CASE WHEN v_session_info.status = 'active' THEN true ELSE false END as is_active;
END;
$$;

-- Get session by title
CREATE OR REPLACE FUNCTION get_session_by_title(p_title TEXT)
RETURNS TABLE (
    id INTEGER,
    title TEXT
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        s.session_id::INTEGER as id,
        s.topic as title
    FROM sessions s
    WHERE LOWER(s.topic) = LOWER(p_title)
    LIMIT 1;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Session with title ''%'' not found', p_title USING ERRCODE = 'P0002';
    END IF;
END;
$$;