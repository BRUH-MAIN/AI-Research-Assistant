-- =====================================================
-- IMPROVED AUTH TRIGGERS FOR BETTER USER SYNC
-- Date: 2024-09-27
-- Description: Improve auth user sync with better error handling and name parsing
-- =====================================================

-- Enhanced function to handle new user creation with better error handling
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    user_name TEXT;
    name_parts TEXT[];
    first_name_val TEXT;
    last_name_val TEXT;
BEGIN
    -- Extract name information from user metadata
    user_name := COALESCE(
        NEW.raw_user_meta_data->>'full_name',
        NEW.raw_user_meta_data->>'name',
        split_part(NEW.email, '@', 1)
    );
    
    -- Parse name into first and last name
    IF user_name IS NOT NULL AND user_name != '' THEN
        name_parts := string_to_array(trim(user_name), ' ');
        first_name_val := name_parts[1];
        
        -- Combine remaining parts for last name
        IF array_length(name_parts, 1) > 1 THEN
            last_name_val := array_to_string(name_parts[2:], ' ');
        END IF;
    ELSE
        first_name_val := split_part(NEW.email, '@', 1);
        last_name_val := NULL;
    END IF;

    -- Insert new user with better error handling
    BEGIN
        INSERT INTO public.users (
            auth_user_id,
            email,
            first_name,
            last_name,
            profile_picture_url,
            provider,
            provider_id,
            last_sign_in_at,
            raw_app_meta_data,
            raw_user_meta_data,
            availability,
            created_at,
            updated_at
        )
        VALUES (
            NEW.id,
            NEW.email,
            first_name_val,
            last_name_val,
            NEW.raw_user_meta_data->>'avatar_url',
            COALESCE(NEW.raw_app_meta_data->>'provider', 'google'),
            NEW.raw_app_meta_data->>'provider_id',
            NEW.last_sign_in_at,
            NEW.raw_app_meta_data,
            NEW.raw_user_meta_data,
            'available',
            NEW.created_at,
            CURRENT_TIMESTAMP
        )
        ON CONFLICT (auth_user_id) DO UPDATE SET
            email = EXCLUDED.email,
            first_name = COALESCE(EXCLUDED.first_name, users.first_name),
            last_name = COALESCE(EXCLUDED.last_name, users.last_name),
            profile_picture_url = COALESCE(EXCLUDED.profile_picture_url, users.profile_picture_url),
            last_sign_in_at = EXCLUDED.last_sign_in_at,
            raw_app_meta_data = EXCLUDED.raw_app_meta_data,
            raw_user_meta_data = EXCLUDED.raw_user_meta_data,
            updated_at = CURRENT_TIMESTAMP;

        RAISE LOG 'Successfully created/updated user for auth_user_id: %, email: %', NEW.id, NEW.email;
        
    EXCEPTION WHEN OTHERS THEN
        RAISE LOG 'Error creating user for auth_user_id %, email %: %', NEW.id, NEW.email, SQLERRM;
        -- Don't prevent the auth user creation if this fails
    END;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enhanced function to handle user updates with better logging
CREATE OR REPLACE FUNCTION public.handle_user_update()
RETURNS TRIGGER AS $$
DECLARE
    user_name TEXT;
    name_parts TEXT[];
    first_name_val TEXT;
    last_name_val TEXT;
    rows_affected INTEGER;
BEGIN
    -- Only process if relevant fields changed
    IF NEW.email = OLD.email 
       AND NEW.last_sign_in_at = OLD.last_sign_in_at 
       AND NEW.raw_user_meta_data = OLD.raw_user_meta_data 
       AND NEW.raw_app_meta_data = OLD.raw_app_meta_data THEN
        RETURN NEW;
    END IF;

    -- Extract updated name information
    user_name := COALESCE(
        NEW.raw_user_meta_data->>'full_name',
        NEW.raw_user_meta_data->>'name'
    );
    
    IF user_name IS NOT NULL AND user_name != '' THEN
        name_parts := string_to_array(trim(user_name), ' ');
        first_name_val := name_parts[1];
        
        IF array_length(name_parts, 1) > 1 THEN
            last_name_val := array_to_string(name_parts[2:], ' ');
        END IF;
    END IF;

    BEGIN
        UPDATE public.users
        SET
            email = NEW.email,
            first_name = COALESCE(first_name_val, first_name),
            last_name = COALESCE(last_name_val, last_name),
            profile_picture_url = COALESCE(NEW.raw_user_meta_data->>'avatar_url', profile_picture_url),
            last_sign_in_at = NEW.last_sign_in_at,
            raw_app_meta_data = NEW.raw_app_meta_data,
            raw_user_meta_data = NEW.raw_user_meta_data,
            updated_at = CURRENT_TIMESTAMP
        WHERE auth_user_id = NEW.id;
        
        GET DIAGNOSTICS rows_affected = ROW_COUNT;
        
        IF rows_affected = 0 THEN
            RAISE LOG 'No user found to update for auth_user_id: %', NEW.id;
            -- Try to create the user if update failed
            PERFORM public.handle_new_user_from_update(NEW);
        ELSE
            RAISE LOG 'Successfully updated user for auth_user_id: %, rows affected: %', NEW.id, rows_affected;
        END IF;
        
    EXCEPTION WHEN OTHERS THEN
        RAISE LOG 'Error updating user for auth_user_id %: %', NEW.id, SQLERRM;
    END;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to create user from update trigger
CREATE OR REPLACE FUNCTION public.handle_new_user_from_update(user_record auth.users)
RETURNS VOID AS $$
DECLARE
    user_name TEXT;
    name_parts TEXT[];
    first_name_val TEXT;
    last_name_val TEXT;
BEGIN
    user_name := COALESCE(
        user_record.raw_user_meta_data->>'full_name',
        user_record.raw_user_meta_data->>'name',
        split_part(user_record.email, '@', 1)
    );
    
    IF user_name IS NOT NULL AND user_name != '' THEN
        name_parts := string_to_array(trim(user_name), ' ');
        first_name_val := name_parts[1];
        
        IF array_length(name_parts, 1) > 1 THEN
            last_name_val := array_to_string(name_parts[2:], ' ');
        END IF;
    ELSE
        first_name_val := split_part(user_record.email, '@', 1);
        last_name_val := NULL;
    END IF;

    INSERT INTO public.users (
        auth_user_id,
        email,
        first_name,
        last_name,
        profile_picture_url,
        provider,
        provider_id,
        last_sign_in_at,
        raw_app_meta_data,
        raw_user_meta_data,
        availability,
        created_at,
        updated_at
    )
    VALUES (
        user_record.id,
        user_record.email,
        first_name_val,
        last_name_val,
        user_record.raw_user_meta_data->>'avatar_url',
        COALESCE(user_record.raw_app_meta_data->>'provider', 'google'),
        user_record.raw_app_meta_data->>'provider_id',
        user_record.last_sign_in_at,
        user_record.raw_app_meta_data,
        user_record.raw_user_meta_data,
        'available',
        user_record.created_at,
        CURRENT_TIMESTAMP
    )
    ON CONFLICT (auth_user_id) DO NOTHING;
    
    RAISE LOG 'Created missing user record for auth_user_id: %', user_record.id;
    
EXCEPTION WHEN OTHERS THEN
    RAISE LOG 'Error creating missing user record for auth_user_id %: %', user_record.id, SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the triggers to ensure they use the updated functions
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;
CREATE TRIGGER on_auth_user_updated
    AFTER UPDATE ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_user_update();

-- Add a function to manually sync existing auth users (useful for debugging)
CREATE OR REPLACE FUNCTION public.sync_existing_auth_users()
RETURNS TEXT AS $$
DECLARE
    auth_user RECORD;
    synced_count INTEGER := 0;
    error_count INTEGER := 0;
BEGIN
    FOR auth_user IN 
        SELECT * FROM auth.users 
        WHERE id NOT IN (SELECT auth_user_id FROM public.users WHERE auth_user_id IS NOT NULL)
    LOOP
        BEGIN
            PERFORM public.handle_new_user_from_update(auth_user);
            synced_count := synced_count + 1;
        EXCEPTION WHEN OTHERS THEN
            error_count := error_count + 1;
            RAISE LOG 'Failed to sync auth user %: %', auth_user.id, SQLERRM;
        END;
    END LOOP;
    
    RETURN format('Synced %s users, %s errors', synced_count, error_count);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comment for documentation
COMMENT ON FUNCTION public.sync_existing_auth_users() IS 'Manually sync auth users that are missing from public.users table';