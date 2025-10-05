-- Migration: Fix get_all_users function to include auth_user_id
-- Created: 2025-09-19

-- Drop the existing function and recreate it with auth_user_id
DROP FUNCTION IF EXISTS get_all_users();

-- Update the get_all_users function to include auth_user_id for proper user matching
CREATE OR REPLACE FUNCTION get_all_users()
RETURNS TABLE(id integer, name text, email text, is_active boolean, auth_user_id uuid)
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
        u.auth_user_id
    FROM users u
    ORDER BY u.user_id;
END;
$$;