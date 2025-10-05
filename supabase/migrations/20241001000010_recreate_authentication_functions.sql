-- =====================================================
-- RECREATE AUTHENTICATION FUNCTIONS
-- Date: 2024-10-01  
-- Description: Authentication triggers, user sync functions, and auth utilities
-- =====================================================

-- Handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
    INSERT INTO public.users (
        user_id,
        email,
        first_name,
        last_name,
        is_active,
        created_at,
        updated_at
    ) VALUES (
        gen_random_uuid()::text::integer, -- Convert UUID to integer for compatibility
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
        COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
        true,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
    );
    
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- Log error but don't fail the auth process
        RAISE WARNING 'Failed to create user profile for %: %', NEW.email, SQLERRM;
        RETURN NEW;
END;
$function$;

-- Sync user profile updates
CREATE OR REPLACE FUNCTION public.sync_user_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
    -- Update user profile when auth.users is updated
    UPDATE public.users 
    SET 
        email = NEW.email,
        first_name = COALESCE(NEW.raw_user_meta_data->>'first_name', first_name),
        last_name = COALESCE(NEW.raw_user_meta_data->>'last_name', last_name),
        updated_at = CURRENT_TIMESTAMP
    WHERE user_id = NEW.id::text::integer; -- Convert UUID to integer
    
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- Log error but don't fail the update
        RAISE WARNING 'Failed to sync user profile for %: %', NEW.email, SQLERRM;
        RETURN NEW;
END;
$function$;

-- Handle user deletion
CREATE OR REPLACE FUNCTION public.handle_user_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
    -- Soft delete or anonymize user data instead of hard delete
    UPDATE public.users 
    SET 
        is_active = false,
        email = 'deleted_user_' || OLD.id::text || '@deleted.local',
        first_name = 'Deleted',
        last_name = 'User',
        updated_at = CURRENT_TIMESTAMP
    WHERE user_id = OLD.id::text::integer; -- Convert UUID to integer
    
    RETURN OLD;
EXCEPTION
    WHEN OTHERS THEN
        -- Log error
        RAISE WARNING 'Failed to handle user deletion for %: %', OLD.email, SQLERRM;
        RETURN OLD;
END;
$function$;

-- Get current authenticated user
CREATE OR REPLACE FUNCTION public.get_current_user_auth()
RETURNS TABLE(user_id integer, email text, first_name text, last_name text, is_active boolean, created_at timestamp without time zone, auth_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
    auth_uid UUID;
BEGIN
    -- Get current auth user ID
    auth_uid := auth.uid();
    
    IF auth_uid IS NULL THEN
        RAISE EXCEPTION 'No authenticated user' USING ERRCODE = 'P0001';
    END IF;
    
    RETURN QUERY
    SELECT 
        u.user_id,
        u.email,
        u.first_name,
        u.last_name,
        u.is_active,
        u.created_at,
        auth_uid as auth_id
    FROM public.users u
    WHERE u.user_id = auth_uid::text::integer; -- Convert UUID to integer
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'User profile not found for authenticated user' USING ERRCODE = 'P0002';
    END IF;
END;
$function$;

-- Verify user authentication
CREATE OR REPLACE FUNCTION public.verify_user_auth(p_user_id integer)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
    auth_uid UUID;
    user_auth_id INTEGER;
BEGIN
    -- Get current auth user ID
    auth_uid := auth.uid();
    
    IF auth_uid IS NULL THEN
        RETURN false;
    END IF;
    
    -- Convert auth UUID to integer for comparison
    user_auth_id := auth_uid::text::integer;
    
    -- Check if the provided user_id matches the authenticated user
    RETURN (p_user_id = user_auth_id);
EXCEPTION
    WHEN OTHERS THEN
        RETURN false;
END;
$function$;

-- Get user permissions
CREATE OR REPLACE FUNCTION public.get_user_permissions(p_user_id integer)
RETURNS TABLE(user_id integer, can_create_groups boolean, can_invite_users boolean, can_moderate boolean, is_admin boolean, max_sessions integer, max_groups integer)
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
    -- Validate user exists
    IF NOT EXISTS (SELECT 1 FROM users WHERE user_id = p_user_id AND is_active = true) THEN
        RAISE EXCEPTION 'User with ID % not found or inactive', p_user_id USING ERRCODE = 'P0002';
    END IF;
    
    RETURN QUERY
    SELECT 
        p_user_id as user_id,
        true as can_create_groups,        -- Default permissions
        true as can_invite_users,
        false as can_moderate,            -- Default non-admin
        false as is_admin,
        100 as max_sessions,              -- Default limits
        50 as max_groups;
    
    -- TODO: This function can be extended to read from a user_permissions table
    -- or implement role-based access control (RBAC) when needed
END;
$function$;

-- Check if user can access session
CREATE OR REPLACE FUNCTION public.can_user_access_session(p_user_id integer, p_session_id integer)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
    -- Check if user is a participant in the session or member of the session's group
    RETURN EXISTS (
        SELECT 1 
        FROM sessions s
        LEFT JOIN session_participants sp ON s.session_id = sp.session_id
        LEFT JOIN group_participants gp ON s.group_id = gp.group_id
        WHERE s.session_id = p_session_id
        AND (
            sp.user_id = p_user_id OR           -- Direct session participant
            gp.user_id = p_user_id OR           -- Group member
            s.created_by = p_user_id            -- Session creator
        )
    );
END;
$function$;

-- Check if user can access group
CREATE OR REPLACE FUNCTION public.can_user_access_group(p_user_id integer, p_group_id integer)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
    -- Check if user is a member of the group or created it
    RETURN EXISTS (
        SELECT 1 
        FROM groups g
        LEFT JOIN group_participants gp ON g.group_id = gp.group_id
        WHERE g.group_id = p_group_id
        AND (
            gp.user_id = p_user_id OR           -- Group member
            g.created_by = p_user_id            -- Group creator
        )
    );
END;
$function$;

-- Check if user can modify resource
CREATE OR REPLACE FUNCTION public.can_user_modify_resource(p_user_id integer, p_resource_type text, p_resource_id integer)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
    CASE p_resource_type
        WHEN 'session' THEN
            RETURN EXISTS (
                SELECT 1 FROM sessions 
                WHERE session_id = p_resource_id 
                AND created_by = p_user_id
            );
        WHEN 'group' THEN
            RETURN EXISTS (
                SELECT 1 FROM groups 
                WHERE group_id = p_resource_id 
                AND created_by = p_user_id
            );
        WHEN 'message' THEN
            RETURN EXISTS (
                SELECT 1 FROM messages m
                JOIN group_participants gp ON m.sender_id = gp.group_participant_id
                WHERE m.message_id = p_resource_id 
                AND gp.user_id = p_user_id
            );
        WHEN 'feedback' THEN
            RETURN EXISTS (
                SELECT 1 FROM feedback 
                WHERE feedback_id = p_resource_id 
                AND user_id = p_user_id
            );
        ELSE
            RETURN false;
    END CASE;
END;
$function$;

-- =====================================================
-- AUTHENTICATION TRIGGERS
-- =====================================================

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_deleted ON auth.users;

-- Create trigger for new user registration
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- Create trigger for user profile updates
CREATE TRIGGER on_auth_user_updated
    AFTER UPDATE ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.sync_user_profile();

-- Create trigger for user deletion
CREATE TRIGGER on_auth_user_deleted
    BEFORE DELETE ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_user_delete();

-- =====================================================
-- UTILITY FUNCTIONS FOR AUTHENTICATION
-- =====================================================

-- Generate secure random token
CREATE OR REPLACE FUNCTION public.generate_secure_token(p_length integer DEFAULT 32)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
    -- Generate a secure random token using available characters
    RETURN encode(gen_random_bytes(p_length), 'hex');
END;
$function$;

-- Hash password (for custom auth if needed)
CREATE OR REPLACE FUNCTION public.hash_password(p_password text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
    -- Use crypt function for password hashing
    -- Note: This is mainly for demonstration - Supabase handles auth
    RETURN crypt(p_password, gen_salt('bf', 12));
END;
$function$;

-- Verify password (for custom auth if needed)
CREATE OR REPLACE FUNCTION public.verify_password(p_password text, p_hash text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
    -- Verify password against hash
    -- Note: This is mainly for demonstration - Supabase handles auth
    RETURN (crypt(p_password, p_hash) = p_hash);
END;
$function$;

-- Log authentication event
CREATE OR REPLACE FUNCTION public.log_auth_event(p_user_id integer, p_event_type text, p_metadata jsonb DEFAULT '{}'::jsonb)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
    -- This function can be used to log authentication events
    -- For now, we'll just raise a notice
    RAISE NOTICE 'Auth event for user %: % - %', p_user_id, p_event_type, p_metadata;
    
    -- TODO: Could insert into an auth_events table when implemented
    
    RETURN true;
END;
$function$;

-- Get user session count
CREATE OR REPLACE FUNCTION public.get_user_session_count(p_user_id integer)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
    RETURN (
        SELECT COUNT(*)::INTEGER
        FROM sessions s
        LEFT JOIN session_participants sp ON s.session_id = sp.session_id
        LEFT JOIN group_participants gp ON s.group_id = gp.group_id
        WHERE (
            s.created_by = p_user_id OR
            sp.user_id = p_user_id OR
            gp.user_id = p_user_id
        )
    );
END;
$function$;

-- Get user group count
CREATE OR REPLACE FUNCTION public.get_user_group_count(p_user_id integer)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
    RETURN (
        SELECT COUNT(*)::INTEGER
        FROM groups g
        LEFT JOIN group_participants gp ON g.group_id = gp.group_id
        WHERE (
            g.created_by = p_user_id OR
            gp.user_id = p_user_id
        )
    );
END;
$function$;

-- Can user invoke AI (missing function)
CREATE OR REPLACE FUNCTION public.can_user_invoke_ai(p_user_id integer, p_session_id integer)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
    v_user_role VARCHAR(50);
    v_is_session_creator BOOLEAN;
BEGIN
    -- Get user's role in the group
    SELECT gp.role INTO v_user_role
    FROM sessions s
    JOIN group_participants gp ON s.group_id = gp.group_id
    WHERE s.session_id = p_session_id
    AND gp.user_id = p_user_id;
    
    -- Check if user is the session creator
    SELECT (created_by = p_user_id) INTO v_is_session_creator
    FROM sessions
    WHERE session_id = p_session_id;
    
    -- Allow AI invocation if user is admin, mentor, or session creator
    RETURN (v_user_role IN ('admin', 'mentor') OR v_is_session_creator);
END;
$function$;

-- Grant permissions
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO anon;

-- Add comments
COMMENT ON FUNCTION public.handle_new_user() IS 'Trigger function to create user profile on auth.users insert';
COMMENT ON FUNCTION public.sync_user_profile() IS 'Trigger function to sync user profile on auth.users update';
COMMENT ON FUNCTION public.handle_user_delete() IS 'Trigger function to handle user deletion (soft delete)';
COMMENT ON FUNCTION public.get_current_user_auth() IS 'Returns current authenticated user information';
COMMENT ON FUNCTION public.verify_user_auth(integer) IS 'Verifies if user ID matches authenticated user';
COMMENT ON FUNCTION public.get_user_permissions(integer) IS 'Returns user permissions and limits';
COMMENT ON FUNCTION public.can_user_access_session(integer, integer) IS 'Checks if user can access a session';
COMMENT ON FUNCTION public.can_user_access_group(integer, integer) IS 'Checks if user can access a group';
COMMENT ON FUNCTION public.can_user_modify_resource(integer, text, integer) IS 'Checks if user can modify a resource';
COMMENT ON FUNCTION public.generate_secure_token(integer) IS 'Generates a secure random token';
COMMENT ON FUNCTION public.hash_password(text) IS 'Hashes a password using bcrypt';
COMMENT ON FUNCTION public.verify_password(text, text) IS 'Verifies a password against its hash';
COMMENT ON FUNCTION public.log_auth_event(integer, text, jsonb) IS 'Logs authentication events';
COMMENT ON FUNCTION public.get_user_session_count(integer) IS 'Returns count of sessions user has access to';
COMMENT ON FUNCTION public.get_user_group_count(integer) IS 'Returns count of groups user belongs to';
COMMENT ON FUNCTION public.can_user_invoke_ai(integer, integer) IS 'Checks if user can invoke AI in a session based on role and permissions';

-- =====================================================
-- FINAL VERIFICATION MESSAGE
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '✅ AUTHENTICATION FUNCTIONS CREATED';
    RAISE NOTICE '🔐 ALL DATABASE FUNCTIONS RECREATION COMPLETE!';
    RAISE NOTICE '';
    RAISE NOTICE '📊 SUMMARY:';
    RAISE NOTICE '   • Core Utility Functions: 9';
    RAISE NOTICE '   • User Management Functions: 10';
    RAISE NOTICE '   • Group Management Functions: 9';
    RAISE NOTICE '   • Session Management Functions: 11';
    RAISE NOTICE '   • Message & Chat Functions: 13';
    RAISE NOTICE '   • Paper Management Functions: 13';
    RAISE NOTICE '   • Feedback System Functions: 11';
    RAISE NOTICE '   • AI Metadata Functions: 11';
    RAISE NOTICE '   • Authentication Functions: 16';
    RAISE NOTICE '';
    RAISE NOTICE '🎉 Total Functions Created: 103';
    RAISE NOTICE '';
    RAISE NOTICE '📋 Next Steps:';
    RAISE NOTICE '   1. Run: supabase db reset';
    RAISE NOTICE '   2. Verify all functions are working';
    RAISE NOTICE '   3. Test application functionality';
    RAISE NOTICE '   4. Update API endpoints if needed';
END $$;
