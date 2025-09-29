-- =====================================================
-- ADD MISSING GET_USER_GROUPS FUNCTION
-- Date: 2024-09-30
-- Description: Add the missing get_user_groups function that's being called from Express routes
-- =====================================================

-- This function returns all groups that a specific user is a member of
-- It's called from the Express route: GET /api/groups/user/:userId

CREATE OR REPLACE FUNCTION get_user_groups(p_user_id INTEGER)
RETURNS TABLE (
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

-- Add comment for documentation
COMMENT ON FUNCTION get_user_groups(INTEGER) IS 'Returns all groups that a specific user is a member of, including their role and group details';

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION get_user_groups(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_groups(INTEGER) TO anon;

-- Test the function exists
DO $$
BEGIN
    RAISE NOTICE 'Function get_user_groups created successfully';
END $$;
