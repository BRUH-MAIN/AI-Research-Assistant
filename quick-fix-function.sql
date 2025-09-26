-- QUICK FIX: Add minimal get_user_groups function
-- Copy and paste this into Supabase SQL Editor

CREATE OR REPLACE FUNCTION get_user_groups(p_user_id INT)
RETURNS TABLE(
    group_id INT,
    name TEXT,
    description TEXT,
    invite_code VARCHAR(12),
    is_public BOOLEAN,
    created_by INT,
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    member_count BIGINT,
    user_role TEXT,
    creator_name TEXT
) AS $$
BEGIN
    -- Return empty result set for now to fix the immediate error
    -- This can be enhanced later with proper group logic
    RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;