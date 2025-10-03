-- =====================================================
-- ADD MISSING GET_GROUP_BY_INVITE_CODE FUNCTION
-- Date: 2024-10-01
-- Description: Add the missing get_group_by_invite_code function
-- =====================================================

-- Get group by invite code
CREATE OR REPLACE FUNCTION public.get_group_by_invite_code(p_invite_code VARCHAR(12))
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
    creator_name TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        g.group_id,
        g.name,
        g.description,
        g.invite_code,
        g.is_public,
        g.created_by,
        g.created_at,
        g.updated_at,
        COUNT(gp.user_id) as member_count,
        CONCAT(u.first_name, ' ', u.last_name) as creator_name
    FROM groups g
    LEFT JOIN group_participants gp ON g.group_id = gp.group_id
    LEFT JOIN users u ON g.created_by = u.user_id
    WHERE g.invite_code = p_invite_code
    GROUP BY g.group_id, g.name, g.description, g.invite_code, g.is_public, 
             g.created_by, g.created_at, g.updated_at, u.first_name, u.last_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.get_group_by_invite_code(VARCHAR(12)) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_group_by_invite_code(VARCHAR(12)) TO anon;

-- Add comment
COMMENT ON FUNCTION public.get_group_by_invite_code(VARCHAR(12)) IS 'Get group information by invite code for joining preview';

-- =====================================================
-- VERIFICATION MESSAGE
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '✅ MISSING GET_GROUP_BY_INVITE_CODE FUNCTION ADDED';
    RAISE NOTICE '📝 Function is now available for invite code lookups';
END $$;