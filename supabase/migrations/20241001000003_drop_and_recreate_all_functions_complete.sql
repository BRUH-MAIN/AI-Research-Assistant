-- =====================================================
-- DROP AND RECREATE ALL FUNCTIONS - COMPLETE VERSION
-- Date: 2024-10-01
-- Description: Drop all existing functions and recreate them from scratch
-- =====================================================

-- =====================================================
-- DROP ALL EXISTING FUNCTIONS
-- =====================================================

-- Core utility functions
DROP FUNCTION IF EXISTS activate_user(p_user_id integer);
DROP FUNCTION IF EXISTS deactivate_user(p_user_id integer);
DROP FUNCTION IF EXISTS current_user_id();

-- User management functions
DROP FUNCTION IF EXISTS create_user(p_email text, p_first_name text, p_last_name text);
DROP FUNCTION IF EXISTS get_user_by_id(p_user_id integer);
DROP FUNCTION IF EXISTS get_user_by_auth_id(auth_id uuid);
DROP FUNCTION IF EXISTS get_all_users();
DROP FUNCTION IF EXISTS update_user(p_user_id integer, p_email text, p_first_name text, p_last_name text, p_is_active boolean);
DROP FUNCTION IF EXISTS delete_user(p_user_id integer);
DROP FUNCTION IF EXISTS get_user_feedback(p_user_id integer);
DROP FUNCTION IF EXISTS get_user_groups(p_user_id integer);

-- Group management functions
DROP FUNCTION IF EXISTS create_group(p_name text, p_created_by integer, p_description text, p_is_public boolean);
DROP FUNCTION IF EXISTS get_group_by_id(p_group_id integer);
DROP FUNCTION IF EXISTS get_group_by_name(p_name text);
DROP FUNCTION IF EXISTS get_all_groups();
DROP FUNCTION IF EXISTS add_group_member(p_group_id integer, p_user_id integer, p_role text);
DROP FUNCTION IF EXISTS remove_group_member(p_group_id integer, p_user_id integer);
DROP FUNCTION IF EXISTS get_group_members(p_group_id integer);
DROP FUNCTION IF EXISTS get_group_members_detailed(p_group_id integer);
DROP FUNCTION IF EXISTS join_group_by_invite_code(p_invite_code text, p_user_id integer);

-- Session management functions
DROP FUNCTION IF EXISTS create_session(p_group_id integer, p_created_by integer, p_topic text, p_status character varying);
DROP FUNCTION IF EXISTS create_session(p_title text, p_user_id integer, p_group_id integer);
DROP FUNCTION IF EXISTS get_session_by_id(p_session_id integer);
DROP FUNCTION IF EXISTS get_session_by_title(p_title text);
DROP FUNCTION IF EXISTS get_all_sessions(p_user_id integer, p_is_active boolean);
DROP FUNCTION IF EXISTS update_session(p_session_id integer, p_title text, p_status text);
DROP FUNCTION IF EXISTS delete_session(p_session_id integer);
DROP FUNCTION IF EXISTS add_session_participant(p_session_id integer, p_user_id integer);
DROP FUNCTION IF EXISTS remove_session_participant(p_session_id integer, p_user_id integer);
DROP FUNCTION IF EXISTS get_session_participants(p_session_id integer);
DROP FUNCTION IF EXISTS get_session_online_users(p_session_id integer);
DROP FUNCTION IF EXISTS get_session_summary(p_session_id integer);
DROP FUNCTION IF EXISTS add_paper_to_session(p_session_id integer, p_paper_id integer);
DROP FUNCTION IF EXISTS remove_paper_from_session(p_session_id integer, p_paper_id integer);
DROP FUNCTION IF EXISTS get_session_papers(p_session_id integer);
DROP FUNCTION IF EXISTS get_session_messages(p_session_id integer);
DROP FUNCTION IF EXISTS get_session_feedback(p_session_id integer);

-- Group chat functions
DROP FUNCTION IF EXISTS create_group_chat_session(p_group_id integer, p_created_by integer, p_topic text);
DROP FUNCTION IF EXISTS create_group_chat_session(p_group_id integer, p_created_by integer, p_title text, p_description text);
DROP FUNCTION IF EXISTS get_group_chat_sessions(p_group_id integer);
DROP FUNCTION IF EXISTS join_group_chat_session(p_session_id integer, p_user_id integer);
DROP FUNCTION IF EXISTS get_group_chat_messages(p_session_id integer, p_limit integer, p_offset integer);
DROP FUNCTION IF EXISTS send_group_chat_message(p_session_id integer, p_user_id integer, p_content text, p_message_type character varying, p_metadata jsonb);

-- Message management functions
DROP FUNCTION IF EXISTS create_message(p_session_id integer, p_sender_user_id integer, p_content text);
DROP FUNCTION IF EXISTS get_message_by_id(p_message_id integer);
DROP FUNCTION IF EXISTS get_all_messages(p_limit integer, p_offset integer);
DROP FUNCTION IF EXISTS update_message(p_message_id integer, p_content text);
DROP FUNCTION IF EXISTS delete_message(p_message_id integer);
DROP FUNCTION IF EXISTS search_messages(p_query_text text, p_session_id integer, p_limit integer);
DROP FUNCTION IF EXISTS get_message_feedback(p_message_id integer);
DROP FUNCTION IF EXISTS get_message_ai_metadata(p_message_id integer);

-- Paper management functions
DROP FUNCTION IF EXISTS create_paper(p_title text, p_abstract text, p_authors text, p_doi text, p_published_at timestamp without time zone, p_source_url text, p_tags text[]);
DROP FUNCTION IF EXISTS get_paper_by_id(p_paper_id integer);
DROP FUNCTION IF EXISTS get_all_papers();
DROP FUNCTION IF EXISTS update_paper(p_paper_id integer, p_title text, p_abstract text, p_authors text, p_doi text, p_source_url text);
DROP FUNCTION IF EXISTS delete_paper(p_paper_id integer);
DROP FUNCTION IF EXISTS search_papers(p_query text);
DROP FUNCTION IF EXISTS get_related_papers(p_paper_id integer, p_limit integer);

-- Feedback management functions
DROP FUNCTION IF EXISTS create_feedback(p_session_id integer, p_user_id integer, p_content text, p_rating integer);
DROP FUNCTION IF EXISTS get_feedback_by_id(p_feedback_id integer);
DROP FUNCTION IF EXISTS get_all_feedback(p_limit integer, p_offset integer);
DROP FUNCTION IF EXISTS update_feedback(p_feedback_id integer, p_content text, p_rating integer);
DROP FUNCTION IF EXISTS delete_feedback(p_feedback_id integer);
DROP FUNCTION IF EXISTS get_feedback_stats(p_session_id integer);

-- AI metadata functions
DROP FUNCTION IF EXISTS create_ai_metadata(p_message_id integer, p_paper_id integer, p_page_no integer);
DROP FUNCTION IF EXISTS get_ai_metadata_by_id(p_ai_metadata_id integer);
DROP FUNCTION IF EXISTS get_ai_metadata_by_message(p_message_id integer);
DROP FUNCTION IF EXISTS get_ai_metadata_by_model(p_model_name text, p_limit integer);
DROP FUNCTION IF EXISTS get_all_ai_metadata(p_limit integer, p_offset integer);
DROP FUNCTION IF EXISTS update_ai_metadata(p_ai_metadata_id integer, p_model_name text, p_input_tokens integer, p_output_tokens integer, p_cost numeric, p_processing_time numeric);
DROP FUNCTION IF EXISTS delete_ai_metadata(p_ai_metadata_id integer);
DROP FUNCTION IF EXISTS get_ai_performance_stats(p_model_name text);
DROP FUNCTION IF EXISTS get_ai_usage_stats(p_date_from date, p_date_to date);

-- AI and permission functions
DROP FUNCTION IF EXISTS can_user_invoke_ai(p_user_id integer, p_session_id integer);
DROP FUNCTION IF EXISTS log_ai_invocation(p_user_id integer, p_session_id integer, p_trigger_message_id integer, p_ai_message_id integer);

-- Presence and utility functions
DROP FUNCTION IF EXISTS update_user_presence(p_user_id integer, p_session_id integer, p_status character varying);
DROP FUNCTION IF EXISTS cleanup_old_presence();

-- Trigger functions  
DROP FUNCTION IF EXISTS generate_invite_code();
DROP FUNCTION IF EXISTS set_group_invite_code();
DROP FUNCTION IF EXISTS check_group_creation_permissions();
DROP FUNCTION IF EXISTS update_updated_at_column();
DROP FUNCTION IF EXISTS update_user_last_seen();
DROP FUNCTION IF EXISTS handle_new_user();
DROP FUNCTION IF EXISTS handle_user_update();
DROP FUNCTION IF EXISTS handle_new_user_from_update(user_record auth.users);
DROP FUNCTION IF EXISTS sync_existing_auth_users();

-- =====================================================
-- RECREATE ALL FUNCTIONS - PART 1: CORE & USER FUNCTIONS
-- =====================================================

-- Current user ID function
CREATE OR REPLACE FUNCTION current_user_id()
RETURNS INTEGER
LANGUAGE plpgsql
STABLE SECURITY DEFINER
AS $$
DECLARE
    user_id_result INTEGER;
BEGIN
    SELECT user_id INTO user_id_result
    FROM public.users 
    WHERE auth_user_id = auth.uid();
    
    RETURN user_id_result;
END;
$$;

-- User activation/deactivation functions
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

-- User CRUD functions
CREATE OR REPLACE FUNCTION create_user(
    p_email TEXT, 
    p_first_name TEXT DEFAULT NULL, 
    p_last_name TEXT DEFAULT NULL
)
RETURNS TABLE(id INTEGER, name TEXT, email TEXT, is_active BOOLEAN)
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

CREATE OR REPLACE FUNCTION get_user_by_id(p_user_id INTEGER)
RETURNS TABLE(id INTEGER, name TEXT, email TEXT, is_active BOOLEAN, first_name TEXT, last_name TEXT, created_at TIMESTAMP)
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

CREATE OR REPLACE FUNCTION get_user_by_auth_id(auth_id UUID)
RETURNS SETOF users
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT * FROM public.users
  WHERE auth_user_id = auth_id;
END;
$$;

CREATE OR REPLACE FUNCTION get_all_users()
RETURNS TABLE(id INTEGER, auth_id UUID, name TEXT, email TEXT, is_active BOOLEAN)
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

CREATE OR REPLACE FUNCTION update_user(
    p_user_id INTEGER, 
    p_email TEXT DEFAULT NULL, 
    p_first_name TEXT DEFAULT NULL, 
    p_last_name TEXT DEFAULT NULL, 
    p_is_active BOOLEAN DEFAULT NULL
)
RETURNS TABLE(id INTEGER, name TEXT, email TEXT, is_active BOOLEAN)
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
        availability = COALESCE(v_availability, availability),
        updated_at = CURRENT_TIMESTAMP
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

CREATE OR REPLACE FUNCTION get_user_feedback(p_user_id INTEGER)
RETURNS TABLE(id INTEGER, session_id INTEGER, given_by INTEGER, content TEXT, rating INTEGER, created_at TIMESTAMP)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        f.feedback_id::INTEGER as id,
        f.session_id::INTEGER as session_id,
        gp.user_id::INTEGER as given_by,
        f.content,
        f.rating::INTEGER as rating,
        f.created_at
    FROM feedback f
    JOIN group_participants gp ON f.given_by = gp.group_participant_id
    WHERE gp.user_id = p_user_id
    ORDER BY f.created_at DESC;
END;
$$;

CREATE OR REPLACE FUNCTION get_user_groups(p_user_id INTEGER)
RETURNS TABLE(
    id INTEGER, 
    group_id INTEGER, 
    name TEXT, 
    description TEXT, 
    is_public BOOLEAN, 
    invite_code VARCHAR(12), 
    member_count BIGINT, 
    user_role VARCHAR(50), 
    created_at TIMESTAMP, 
    created_by INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
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
$$;

-- Utility functions
CREATE OR REPLACE FUNCTION generate_invite_code()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
    chars TEXT := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    result TEXT := '';
    i INTEGER := 0;
BEGIN
    FOR i IN 1..8 LOOP
        result := result || substr(chars, floor(random() * length(chars) + 1)::INTEGER, 1);
    END LOOP;
    RETURN result;
END;
$$;

-- Trigger functions
CREATE OR REPLACE FUNCTION set_group_invite_code()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    -- Generate unique invite code if not provided
    IF NEW.invite_code IS NULL THEN
        LOOP
            NEW.invite_code := generate_invite_code();
            -- Check if code is unique
            IF NOT EXISTS (SELECT 1 FROM groups WHERE invite_code = NEW.invite_code) THEN
                EXIT;
            END IF;
        END LOOP;
    END IF;
    
    -- Set updated_at timestamp
    NEW.updated_at := CURRENT_TIMESTAMP;
    
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION check_group_creation_permissions()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF NEW.created_by < 2 THEN
        RAISE EXCEPTION 'Users with ID less than 2 are not allowed to create groups';
    END IF;
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION update_user_last_seen()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.last_seen = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;

-- Presence cleanup function
CREATE OR REPLACE FUNCTION cleanup_old_presence()
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
    DELETE FROM user_presence 
    WHERE status = 'offline' 
    AND last_seen < (CURRENT_TIMESTAMP - INTERVAL '1 hour');
END;
$$;

-- Grant permissions
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO anon;

-- Add comments
COMMENT ON FUNCTION current_user_id() IS 'Returns the current user ID based on auth.uid()';
COMMENT ON FUNCTION activate_user(INTEGER) IS 'Activates a user account';
COMMENT ON FUNCTION deactivate_user(INTEGER) IS 'Deactivates a user account';
COMMENT ON FUNCTION create_user(TEXT, TEXT, TEXT) IS 'Creates a new user with email and optional names';
COMMENT ON FUNCTION get_user_by_id(INTEGER) IS 'Retrieves user details by user ID';
COMMENT ON FUNCTION get_user_by_auth_id(UUID) IS 'Retrieves user by auth UUID';
COMMENT ON FUNCTION get_all_users() IS 'Returns all users with basic information';
COMMENT ON FUNCTION update_user(INTEGER, TEXT, TEXT, TEXT, BOOLEAN) IS 'Updates user information';
COMMENT ON FUNCTION delete_user(INTEGER) IS 'Permanently deletes a user';
COMMENT ON FUNCTION get_user_feedback(INTEGER) IS 'Returns feedback given by a specific user';
COMMENT ON FUNCTION get_user_groups(INTEGER) IS 'Returns all groups that a user belongs to';
COMMENT ON FUNCTION generate_invite_code() IS 'Generates a random 8-character invite code';

-- =====================================================
-- VERIFICATION
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE 'Core and user management functions recreated successfully';
    RAISE NOTICE '✅ Core utility functions';
    RAISE NOTICE '✅ User CRUD operations';
    RAISE NOTICE '✅ User activation/deactivation';
    RAISE NOTICE '✅ User relationships (groups, feedback)';
    RAISE NOTICE '✅ Trigger functions';
    RAISE NOTICE 'Ready for Part 2: Group and Session functions...';
END $$;
