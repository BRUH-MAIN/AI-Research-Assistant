-- =====================================================
-- RECREATE CORE UTILITY FUNCTIONS
-- Date: 2024-10-01
-- Description: Core utility and helper functions
-- =====================================================

-- Core user utility function
CREATE OR REPLACE FUNCTION public.current_user_id()
RETURNS integer
LANGUAGE plpgsql
STABLE SECURITY DEFINER
AS $function$
        DECLARE
          user_id_result INTEGER;
        BEGIN
          SELECT user_id INTO user_id_result
          FROM public.users 
          WHERE auth_user_id = auth.uid();
          
          RETURN user_id_result;
        END;
        $function$;

-- User activation/deactivation functions
CREATE OR REPLACE FUNCTION public.activate_user(p_user_id integer)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
    -- Check if user exists
    IF NOT EXISTS (SELECT 1 FROM users WHERE user_id = p_user_id) THEN
        RAISE EXCEPTION 'User with ID % not found', p_user_id USING ERRCODE = 'P0002';
    END IF;
    
    -- Update user availability
    UPDATE users SET availability = 'available' WHERE user_id = p_user_id;
    
    RETURN json_build_object('message', 'User ' || p_user_id || ' activated successfully');
END;
$function$;

CREATE OR REPLACE FUNCTION public.deactivate_user(p_user_id integer)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
    -- Check if user exists
    IF NOT EXISTS (SELECT 1 FROM users WHERE user_id = p_user_id) THEN
        RAISE EXCEPTION 'User with ID % not found', p_user_id USING ERRCODE = 'P0002';
    END IF;
    
    -- Update user availability
    UPDATE users SET availability = 'offline' WHERE user_id = p_user_id;
    
    RETURN json_build_object('message', 'User ' || p_user_id || ' deactivated successfully');
END;
$function$;

-- Utility function for generating invite codes
CREATE OR REPLACE FUNCTION public.generate_invite_code()
RETURNS text
LANGUAGE plpgsql
AS $function$
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
$function$;

-- Cleanup function for old presence records
CREATE OR REPLACE FUNCTION public.cleanup_old_presence()
RETURNS void
LANGUAGE plpgsql
AS $function$
BEGIN
    DELETE FROM user_presence 
    WHERE status = 'offline' 
    AND last_seen < (CURRENT_TIMESTAMP - INTERVAL '1 hour');
END;
$function$;

-- Trigger functions for timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_user_last_seen()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
    NEW.last_seen = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$function$;

-- Group invite code generation trigger
CREATE OR REPLACE FUNCTION public.set_group_invite_code()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
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
$function$;

-- Permission check for group creation
CREATE OR REPLACE FUNCTION public.check_group_creation_permissions()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
    IF NEW.created_by < 2 THEN
        RAISE EXCEPTION 'Users with ID less than 2 are not allowed to create groups';
    END IF;
    RETURN NEW;
END;
$function$;

-- Grant permissions
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO anon;

-- Add comments
COMMENT ON FUNCTION public.current_user_id() IS 'Gets current user ID from auth context';
COMMENT ON FUNCTION public.activate_user(integer) IS 'Activates a user account';
COMMENT ON FUNCTION public.deactivate_user(integer) IS 'Deactivates a user account';
COMMENT ON FUNCTION public.generate_invite_code() IS 'Generates a random 8-character invite code';
COMMENT ON FUNCTION public.cleanup_old_presence() IS 'Removes old offline presence records';
COMMENT ON FUNCTION public.update_updated_at_column() IS 'Trigger function to update updated_at timestamp';
COMMENT ON FUNCTION public.update_user_last_seen() IS 'Trigger function to update last_seen timestamp';
COMMENT ON FUNCTION public.set_group_invite_code() IS 'Trigger function to generate unique group invite codes';
COMMENT ON FUNCTION public.check_group_creation_permissions() IS 'Trigger function to check group creation permissions';

-- =====================================================
-- VERIFICATION MESSAGE
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '✅ CORE UTILITY FUNCTIONS CREATED';
    RAISE NOTICE '📝 Ready for user management functions';
END $$;
