-- =====================================================
-- AUTHENTICATION AND TRIGGERS SETUP
-- Date: 2024-09-17
-- Description: Setup Supabase auth integration, triggers, and utility functions
-- =====================================================

-- =====================================================
-- USER PROFILE UPDATE TRIGGER
-- =====================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE 'plpgsql';

-- Create trigger to update the updated_at column for users
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON users 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- SUPABASE AUTH INTEGRATION FUNCTIONS
-- =====================================================

-- Function to sync auth users to our users table
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert a new user into the public.users table when a new auth user is created
  INSERT INTO public.users (
    auth_user_id,
    email,
    first_name,
    last_name,
    provider,
    provider_id,
    last_sign_in_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NULL, -- last_name can be extracted later if needed
    COALESCE(NEW.raw_app_meta_data->>'provider', 'google'),
    NEW.raw_app_meta_data->>'provider_id',
    NEW.last_sign_in_at,
    NEW.raw_app_meta_data,
    NEW.raw_user_meta_data,
    NEW.created_at
  )
  ON CONFLICT (auth_user_id) DO UPDATE SET
    email = EXCLUDED.email,
    last_sign_in_at = EXCLUDED.last_sign_in_at,
    raw_app_meta_data = EXCLUDED.raw_app_meta_data,
    raw_user_meta_data = EXCLUDED.raw_user_meta_data,
    updated_at = CURRENT_TIMESTAMP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to handle user updates (sign-ins, profile changes)
CREATE OR REPLACE FUNCTION public.handle_user_update()
RETURNS TRIGGER AS $$
BEGIN
  -- Update the public.users table when auth user data changes
  UPDATE public.users
  SET
    email = NEW.email,
    last_sign_in_at = NEW.last_sign_in_at,
    raw_app_meta_data = NEW.raw_app_meta_data,
    raw_user_meta_data = NEW.raw_user_meta_data,
    updated_at = CURRENT_TIMESTAMP
  WHERE auth_user_id = NEW.id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers to automatically sync auth users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;
CREATE TRIGGER on_auth_user_updated
  AFTER UPDATE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_user_update();

-- =====================================================
-- GROUP INVITE CODE GENERATION
-- =====================================================

-- Function to generate random invite codes
CREATE OR REPLACE FUNCTION generate_invite_code()
RETURNS TEXT AS $$
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
$$ LANGUAGE plpgsql;

-- Trigger function to auto-generate invite codes
CREATE OR REPLACE FUNCTION set_group_invite_code()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql;

-- Create trigger to auto-generate invite codes on insert/update
DROP TRIGGER IF EXISTS trigger_set_group_invite_code ON groups;
CREATE TRIGGER trigger_set_group_invite_code
    BEFORE INSERT OR UPDATE ON groups
    FOR EACH ROW
    EXECUTE FUNCTION set_group_invite_code();

-- =====================================================
-- GROUP CREATION PERMISSIONS ENFORCEMENT
-- =====================================================

-- Trigger to enforce group creation permissions
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

CREATE TRIGGER trigger_check_group_creation_permissions
    BEFORE INSERT ON groups
    FOR EACH ROW
    EXECUTE FUNCTION check_group_creation_permissions();

-- =====================================================
-- UTILITY VIEWS
-- =====================================================

-- Create a view to join auth and profile data (optional, for easier queries)
CREATE OR REPLACE VIEW public.user_profiles AS
SELECT 
  u.user_id,
  u.auth_user_id,
  u.email,
  u.first_name,
  u.last_name,
  u.profile_picture_url,
  u.bio,
  u.phone_number,
  u.availability,
  u.provider,
  u.provider_id,
  u.last_sign_in_at,
  u.created_at,
  u.updated_at,
  au.created_at as auth_created_at,
  au.email_confirmed_at,
  au.phone_confirmed_at
FROM public.users u
LEFT JOIN auth.users au ON u.auth_user_id = au.id;

-- =====================================================
-- ROW LEVEL SECURITY (RLS) SETUP
-- =====================================================

-- Enable Row Level Security on users table
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own profile" ON public.users
  FOR SELECT USING (auth.uid() = auth_user_id);

CREATE POLICY "Users can update their own profile" ON public.users
  FOR UPDATE USING (auth.uid() = auth_user_id);

-- Allow public read access to basic user info for group/session functionality
CREATE POLICY "Public can view basic user info" ON public.users
  FOR SELECT USING (true);

-- Admin or system can insert new users (for the trigger)
CREATE POLICY "System can insert users" ON public.users
  FOR INSERT WITH CHECK (true);

-- =====================================================
-- PERMISSIONS SETUP
-- =====================================================

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.users TO anon, authenticated;
GRANT SELECT ON public.user_profiles TO anon, authenticated;

-- Grant permissions on all tables for authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON public.groups TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.group_participants TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sessions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.session_participants TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.messages TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.papers TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.paper_tags TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.session_papers TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_metadata TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.feedback TO authenticated;

-- Grant sequence permissions
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;