-- =====================================================
-- RECREATE USER MANAGEMENT FUNCTIONS
-- Date: 2024-10-01
-- Description: User CRUD operations and user-related functions
-- =====================================================

-- Create user function
CREATE OR REPLACE FUNCTION public.create_user(p_email text, p_first_name text DEFAULT NULL::text, p_last_name text DEFAULT NULL::text)
RETURNS TABLE(id integer, name text, email text, is_active boolean)
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
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
$function$;

-- Get user by ID
CREATE OR REPLACE FUNCTION public.get_user_by_id(p_user_id integer)
RETURNS TABLE(id integer, name text, email text, is_active boolean, first_name text, last_name text, created_at timestamp without time zone)
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
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
$function$;

-- Get user by auth ID
CREATE OR REPLACE FUNCTION public.get_user_by_auth_id(auth_id uuid)
RETURNS SETOF users
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  RETURN QUERY
  SELECT * FROM public.users
  WHERE auth_user_id = auth_id;
END;
$function$;

-- Get all users
CREATE OR REPLACE FUNCTION public.get_all_users()
RETURNS TABLE(id integer, auth_id uuid, name text, email text, is_active boolean)
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
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
$function$;

-- Update user
CREATE OR REPLACE FUNCTION public.update_user(p_user_id integer, p_email text DEFAULT NULL::text, p_first_name text DEFAULT NULL::text, p_last_name text DEFAULT NULL::text, p_is_active boolean DEFAULT NULL::boolean)
RETURNS TABLE(id integer, name text, email text, is_active boolean)
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
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
$function$;

-- Delete user
CREATE OR REPLACE FUNCTION public.delete_user(p_user_id integer)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
    -- Check if user exists
    IF NOT EXISTS (SELECT 1 FROM users WHERE user_id = p_user_id) THEN
        RAISE EXCEPTION 'User with ID % not found', p_user_id USING ERRCODE = 'P0002';
    END IF;
    
    -- Delete user (cascading deletes will handle related records)
    DELETE FROM users WHERE user_id = p_user_id;
    
    RETURN true;
END;
$function$;

-- Get user groups
CREATE OR REPLACE FUNCTION public.get_user_groups(p_user_id integer)
RETURNS TABLE(id integer, group_id integer, name text, description text, is_public boolean, invite_code character varying, member_count bigint, user_role character varying, created_at timestamp without time zone, created_by integer)
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
    -- Check if user exists
    IF NOT EXISTS (SELECT 1 FROM users WHERE user_id = p_user_id) THEN
        RAISE EXCEPTION 'User with ID % not found', p_user_id USING ERRCODE = 'P0002';
    END IF;

    RETURN QUERY
    SELECT 
        g.group_id as id,
        g.group_id,
        g.name,
        COALESCE(g.description, '') as description,
        COALESCE(g.is_public, false) as is_public,
        g.invite_code,
        (
            SELECT COUNT(*)::BIGINT 
            FROM group_participants gp2 
            WHERE gp2.group_id = g.group_id
        ) as member_count,
        gp.role as user_role,
        g.created_at,
        g.created_by
    FROM groups g
    INNER JOIN group_participants gp ON g.group_id = gp.group_id
    WHERE gp.user_id = p_user_id
    ORDER BY g.created_at DESC;
END;
$function$;

-- Get user feedback
CREATE OR REPLACE FUNCTION public.get_user_feedback(p_user_id integer)
RETURNS TABLE(id integer, session_id integer, given_by integer, content text, rating integer, created_at timestamp without time zone)
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
    RETURN QUERY
    SELECT 
        f.feedback_id::INTEGER as id,
        f.session_id::INTEGER as session_id,
        f.given_by::INTEGER as given_by,
        f.content,
        f.rating::INTEGER as rating,
        f.created_at
    FROM feedback f
    WHERE f.given_by = p_user_id
    ORDER BY f.created_at DESC;
END;
$function$;

-- User presence management
CREATE OR REPLACE FUNCTION public.update_user_presence(p_user_id integer, p_session_id integer, p_status character varying DEFAULT 'online'::character varying)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
    INSERT INTO user_presence (user_id, session_id, status)
    VALUES (p_user_id, p_session_id, p_status)
    ON CONFLICT (user_id, session_id) 
    DO UPDATE SET status = p_status, last_seen = CURRENT_TIMESTAMP;
    
    RETURN TRUE;
END;
$function$;

-- Get online users in session
CREATE OR REPLACE FUNCTION public.get_session_online_users(p_session_id integer)
RETURNS TABLE(user_id integer, username text, status character varying, last_seen timestamp without time zone)
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
    RETURN QUERY
    SELECT 
        up.user_id,
        COALESCE(u.first_name || ' ' || u.last_name, u.email) as username,
        up.status,
        up.last_seen
    FROM user_presence up
    JOIN users u ON up.user_id = u.user_id
    WHERE up.session_id = p_session_id
    AND up.status IN ('online', 'away')
    ORDER BY up.last_seen DESC;
END;
$function$;

-- Grant permissions
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO anon;

-- Add comments
COMMENT ON FUNCTION public.create_user(text, text, text) IS 'Creates a new user account';
COMMENT ON FUNCTION public.get_user_by_id(integer) IS 'Retrieves user details by ID';
COMMENT ON FUNCTION public.get_user_by_auth_id(uuid) IS 'Retrieves user by auth UUID';
COMMENT ON FUNCTION public.get_all_users() IS 'Returns all users with basic info';
COMMENT ON FUNCTION public.update_user(integer, text, text, text, boolean) IS 'Updates user information';
COMMENT ON FUNCTION public.delete_user(integer) IS 'Permanently deletes a user';
COMMENT ON FUNCTION public.get_user_groups(integer) IS 'Returns all groups a user belongs to';
COMMENT ON FUNCTION public.get_user_feedback(integer) IS 'Returns all feedback given by a user';
COMMENT ON FUNCTION public.update_user_presence(integer, integer, character varying) IS 'Updates user presence status in a session';
COMMENT ON FUNCTION public.get_session_online_users(integer) IS 'Returns online users in a specific session';

-- =====================================================
-- VERIFICATION MESSAGE
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '✅ USER MANAGEMENT FUNCTIONS CREATED';
    RAISE NOTICE '📝 Ready for group management functions';
END $$;
