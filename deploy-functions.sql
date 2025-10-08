-- Deploy all required RPC functions to Supabase
-- Run this script in your Supabase SQL Editor

-- First, let's check if the tables exist
DO $$
BEGIN
    -- Check if users table exists
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'users') THEN
        RAISE EXCEPTION 'users table does not exist. Please run migrations first.';
    END IF;
    
    -- Check if groups table exists  
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'groups') THEN
        RAISE EXCEPTION 'groups table does not exist. Please run migrations first.';
    END IF;
END
$$;

-- Simple function to get user groups (minimal version for testing)
CREATE OR REPLACE FUNCTION get_user_groups(p_user_id INT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result JSON;
BEGIN
    -- Simple test version - just return empty array for now
    -- This will resolve the immediate error
    SELECT json_build_array() INTO result;
    
    RETURN result;
EXCEPTION
    WHEN others THEN
        RETURN json_build_array();
END;
$$;

-- Test the function
SELECT get_user_groups(1);