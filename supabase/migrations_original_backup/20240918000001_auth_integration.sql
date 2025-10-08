-- Add authentication integration to sync Supabase auth users with our custom users table
-- This migration sets up automatic user synchronization between auth.users and public.users

-- First, modify the users table to integrate with Supabase auth
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS auth_user_id UUID UNIQUE,
ADD COLUMN IF NOT EXISTS provider TEXT DEFAULT 'google',
ADD COLUMN IF NOT EXISTS provider_id TEXT,
ADD COLUMN IF NOT EXISTS last_sign_in_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS raw_app_meta_data JSONB,
ADD COLUMN IF NOT EXISTS raw_user_meta_data JSONB;

-- Create an index on auth_user_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_auth_user_id ON users(auth_user_id);

-- Create a function to sync auth users to our users table
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

-- Create a function to handle user updates (sign-ins, profile changes)
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

-- Create a function to get user by auth_user_id (useful for API endpoints)
CREATE OR REPLACE FUNCTION public.get_user_by_auth_id(auth_id UUID)
RETURNS SETOF users AS $$
BEGIN
  RETURN QUERY
  SELECT * FROM public.users
  WHERE auth_user_id = auth_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

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

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.users TO anon, authenticated;
GRANT SELECT ON public.user_profiles TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_by_auth_id(UUID) TO anon, authenticated;

-- Enable Row Level Security (RLS) on users table
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