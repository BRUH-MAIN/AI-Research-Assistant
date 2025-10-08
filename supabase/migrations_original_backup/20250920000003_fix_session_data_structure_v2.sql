-- Migration: Fix session functions to return proper data structure for frontend
-- Date: 2025-09-20
-- Description: Update session functions to match frontend interface expectations

-- Drop existing functions first
DROP FUNCTION IF EXISTS get_all_sessions(INTEGER, BOOLEAN);
DROP FUNCTION IF EXISTS get_session_by_id(INTEGER);
DROP FUNCTION IF EXISTS create_session(TEXT, INTEGER, INTEGER);

-- Update get_all_sessions function to return proper structure
CREATE OR REPLACE FUNCTION get_all_sessions(
    p_user_id INTEGER DEFAULT NULL,
    p_is_active BOOLEAN DEFAULT NULL
)
RETURNS TABLE (
    id INTEGER,
    title TEXT,
    description TEXT,
    created_by INTEGER,
    group_id INTEGER,
    created_at TIMESTAMP,
    started_at TIMESTAMP,
    ended_at TIMESTAMP,
    status TEXT,
    participant_count BIGINT
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        s.session_id::INTEGER as id,
        COALESCE(s.topic, 'Untitled Session') as title,
        ''::TEXT as description, -- No description field in current schema
        s.created_by::INTEGER as created_by,
        s.group_id::INTEGER as group_id,
        s.started_at as created_at,
        s.started_at as started_at,
        s.ended_at as ended_at,
        COALESCE(s.status::TEXT, 'offline') as status,
        COUNT(DISTINCT sp.user_id) as participant_count
    FROM sessions s
    LEFT JOIN session_participants sp ON s.session_id = sp.session_id
    WHERE (p_user_id IS NULL OR s.created_by = p_user_id)
      AND (p_is_active IS NULL OR 
           (p_is_active = true AND s.status = 'active') OR
           (p_is_active = false AND s.status != 'active'))
    GROUP BY s.session_id, s.topic, s.created_by, s.group_id, s.started_at, s.ended_at, s.status
    ORDER BY s.session_id;
END;
$$;

-- Update get_session_by_id function to return proper structure
CREATE OR REPLACE FUNCTION get_session_by_id(p_session_id INTEGER)
RETURNS TABLE (
    id INTEGER,
    title TEXT,
    description TEXT,
    created_by INTEGER,
    group_id INTEGER,
    created_at TIMESTAMP,
    started_at TIMESTAMP,
    ended_at TIMESTAMP,
    status TEXT,
    participant_count BIGINT
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        s.session_id::INTEGER as id,
        COALESCE(s.topic, 'Untitled Session') as title,
        ''::TEXT as description, -- No description field in current schema
        s.created_by::INTEGER as created_by,
        s.group_id::INTEGER as group_id,
        s.started_at as created_at,
        s.started_at as started_at,
        s.ended_at as ended_at,
        COALESCE(s.status::TEXT, 'offline') as status,
        COUNT(DISTINCT sp.user_id) as participant_count
    FROM sessions s
    LEFT JOIN session_participants sp ON s.session_id = sp.session_id
    WHERE s.session_id = p_session_id
    GROUP BY s.session_id, s.topic, s.created_by, s.group_id, s.started_at, s.ended_at, s.status;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Session with ID % not found', p_session_id USING ERRCODE = 'P0002';
    END IF;
END;
$$;

-- Update create_session function to return proper structure
CREATE OR REPLACE FUNCTION create_session(
    p_title TEXT,
    p_user_id INTEGER,
    p_group_id INTEGER DEFAULT 1
)
RETURNS TABLE (
    id INTEGER,
    title TEXT,
    description TEXT,
    created_by INTEGER,
    group_id INTEGER,
    created_at TIMESTAMP,
    started_at TIMESTAMP,
    ended_at TIMESTAMP,
    status TEXT,
    participant_count BIGINT
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_session_id INTEGER;
    v_final_title TEXT;
BEGIN
    -- Validate user exists
    IF NOT EXISTS (SELECT 1 FROM users u WHERE u.user_id = p_user_id) THEN
        RAISE EXCEPTION 'User with ID % not found', p_user_id USING ERRCODE = 'P0002';
    END IF;
    
    -- Validate group exists
    IF NOT EXISTS (SELECT 1 FROM groups g WHERE g.group_id = p_group_id) THEN
        RAISE EXCEPTION 'Group with ID % not found', p_group_id USING ERRCODE = 'P0002';
    END IF;
    
    -- Set default title if not provided
    v_final_title := COALESCE(p_title, 'Session ' || TO_CHAR(now()::timestamp, 'YYYYMMDD_HH24MISS'));
    
    -- Insert new session
    INSERT INTO sessions (group_id, created_by, topic, status, started_at)
    VALUES (p_group_id, p_user_id, v_final_title, 'active', now()::timestamp)
    RETURNING session_id INTO v_session_id;
    
    -- Ensure user is a participant in the group
    INSERT INTO group_participants (group_id, user_id, role)
    VALUES (p_group_id, p_user_id, 'member')
    ON CONFLICT ON CONSTRAINT group_participants_group_id_user_id_key DO NOTHING;
    
    -- Return the created session
    RETURN QUERY
    SELECT 
        v_session_id as id,
        v_final_title as title,
        ''::TEXT as description,
        p_user_id as created_by,
        p_group_id as group_id,
        now()::timestamp as created_at,
        now()::timestamp as started_at,
        null::timestamp as ended_at,
        'active'::TEXT as status,
        0::BIGINT as participant_count;
END;
$$;