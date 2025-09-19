-- Updated group management functions with invite code support
-- This file updates the existing functions in 01_user_group_session_functions.sql

-- Drop existing functions to recreate with new functionality
DROP FUNCTION IF EXISTS create_group(TEXT, INT, TEXT);
DROP FUNCTION IF EXISTS get_all_groups();
DROP FUNCTION IF EXISTS get_group_by_id(INT);
DROP FUNCTION IF EXISTS get_group_by_name(TEXT);

-- Create group with invite code and privacy settings
CREATE OR REPLACE FUNCTION create_group(
    p_name TEXT,
    p_created_by INT,
    p_description TEXT DEFAULT '',
    p_is_public BOOLEAN DEFAULT false
)
RETURNS TABLE(
    group_id INT,
    name TEXT,
    description TEXT,
    invite_code VARCHAR(12),
    is_public BOOLEAN,
    created_by INT,
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    member_count BIGINT
) AS $$
DECLARE
    new_group_id INT;
BEGIN
    -- Insert new group (trigger will auto-generate invite_code)
    INSERT INTO groups (name, created_by, description, is_public)
    VALUES (p_name, p_created_by, p_description, p_is_public)
    RETURNING groups.group_id INTO new_group_id;
    
    -- Add creator as admin
    INSERT INTO group_participants (group_id, user_id, role)
    VALUES (new_group_id, p_created_by, 'admin');
    
    -- Return the created group with member count
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
        1::BIGINT as member_count
    FROM groups g
    WHERE g.group_id = new_group_id;
END;
$$ LANGUAGE plpgsql;

-- Get all groups with enhanced information
CREATE OR REPLACE FUNCTION get_all_groups()
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
    GROUP BY g.group_id, g.name, g.description, g.invite_code, g.is_public, 
             g.created_by, g.created_at, g.updated_at, u.first_name, u.last_name
    ORDER BY g.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Get group by ID with enhanced information
CREATE OR REPLACE FUNCTION get_group_by_id(p_group_id INT)
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
    WHERE g.group_id = p_group_id
    GROUP BY g.group_id, g.name, g.description, g.invite_code, g.is_public, 
             g.created_by, g.created_at, g.updated_at, u.first_name, u.last_name;
END;
$$ LANGUAGE plpgsql;

-- Get group by invite code
CREATE OR REPLACE FUNCTION get_group_by_invite_code(p_invite_code VARCHAR(12))
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
$$ LANGUAGE plpgsql;

-- Join group by invite code
CREATE OR REPLACE FUNCTION join_group_by_invite_code(
    p_invite_code VARCHAR(12),
    p_user_id INT
)
RETURNS TABLE(
    success BOOLEAN,
    message TEXT,
    group_id INT,
    group_name TEXT
) AS $$
DECLARE
    target_group_id INT;
    target_group_name TEXT;
    is_already_member BOOLEAN;
BEGIN
    -- Find group by invite code
    SELECT g.group_id, g.name INTO target_group_id, target_group_name
    FROM groups g
    WHERE g.invite_code = p_invite_code;
    
    -- Check if group exists
    IF target_group_id IS NULL THEN
        RETURN QUERY SELECT false, 'Invalid invite code', NULL::INT, NULL::TEXT;
        RETURN;
    END IF;
    
    -- Check if user is already a member
    SELECT EXISTS(
        SELECT 1 FROM group_participants 
        WHERE group_id = target_group_id AND user_id = p_user_id
    ) INTO is_already_member;
    
    IF is_already_member THEN
        RETURN QUERY SELECT false, 'You are already a member of this group', target_group_id, target_group_name;
        RETURN;
    END IF;
    
    -- Add user to group
    INSERT INTO group_participants (group_id, user_id, role)
    VALUES (target_group_id, p_user_id, 'member');
    
    RETURN QUERY SELECT true, 'Successfully joined group', target_group_id, target_group_name;
END;
$$ LANGUAGE plpgsql;

-- Get user's groups
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
        COUNT(gp_all.user_id) as member_count,
        gp_user.role as user_role,
        CONCAT(u.first_name, ' ', u.last_name) as creator_name
    FROM groups g
    JOIN group_participants gp_user ON g.group_id = gp_user.group_id AND gp_user.user_id = p_user_id
    LEFT JOIN group_participants gp_all ON g.group_id = gp_all.group_id
    LEFT JOIN users u ON g.created_by = u.user_id
    GROUP BY g.group_id, g.name, g.description, g.invite_code, g.is_public, 
             g.created_by, g.created_at, g.updated_at, gp_user.role, u.first_name, u.last_name
    ORDER BY g.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Update group member role (admin/mentor functionality)
CREATE OR REPLACE FUNCTION update_group_member_role(
    p_group_id INT,
    p_user_id INT,
    p_new_role TEXT,
    p_updated_by INT
)
RETURNS TABLE(
    success BOOLEAN,
    message TEXT
) AS $$
DECLARE
    updater_role TEXT;
    target_exists BOOLEAN;
BEGIN
    -- Check if the person updating has admin privileges
    SELECT role INTO updater_role
    FROM group_participants
    WHERE group_id = p_group_id AND user_id = p_updated_by;
    
    IF updater_role != 'admin' THEN
        RETURN QUERY SELECT false, 'Only admins can change member roles';
        RETURN;
    END IF;
    
    -- Check if target user exists in group
    SELECT EXISTS(
        SELECT 1 FROM group_participants 
        WHERE group_id = p_group_id AND user_id = p_user_id
    ) INTO target_exists;
    
    IF NOT target_exists THEN
        RETURN QUERY SELECT false, 'User is not a member of this group';
        RETURN;
    END IF;
    
    -- Validate role
    IF p_new_role NOT IN ('admin', 'member', 'mentor') THEN
        RETURN QUERY SELECT false, 'Invalid role. Must be admin, member, or mentor';
        RETURN;
    END IF;
    
    -- Update role
    UPDATE group_participants 
    SET role = p_new_role
    WHERE group_id = p_group_id AND user_id = p_user_id;
    
    RETURN QUERY SELECT true, 'Role updated successfully';
END;
$$ LANGUAGE plpgsql;

-- Regenerate invite code (admin only)
CREATE OR REPLACE FUNCTION regenerate_invite_code(
    p_group_id INT,
    p_user_id INT
)
RETURNS TABLE(
    success BOOLEAN,
    message TEXT,
    new_invite_code VARCHAR(12)
) AS $$
DECLARE
    user_role TEXT;
    new_code VARCHAR(12);
BEGIN
    -- Check if user is admin
    SELECT role INTO user_role
    FROM group_participants
    WHERE group_id = p_group_id AND user_id = p_user_id;
    
    IF user_role != 'admin' THEN
        RETURN QUERY SELECT false, 'Only admins can regenerate invite codes', NULL::VARCHAR(12);
        RETURN;
    END IF;
    
    -- Generate new unique invite code
    LOOP
        new_code := generate_invite_code();
        IF NOT EXISTS (SELECT 1 FROM groups WHERE invite_code = new_code) THEN
            EXIT;
        END IF;
    END LOOP;
    
    -- Update group with new invite code
    UPDATE groups 
    SET invite_code = new_code, updated_at = CURRENT_TIMESTAMP
    WHERE group_id = p_group_id;
    
    RETURN QUERY SELECT true, 'Invite code regenerated successfully', new_code;
END;
$$ LANGUAGE plpgsql;