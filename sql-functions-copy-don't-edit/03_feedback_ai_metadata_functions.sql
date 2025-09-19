-- PostgreSQL Functions for Feedback and AI Metadata Operations
-- Part 3 of the database functions

-- =====================================================
-- FEEDBACK OPERATIONS
-- =====================================================

-- Get feedback for a session
CREATE OR REPLACE FUNCTION get_session_feedback(p_session_id INTEGER)
RETURNS TABLE (
    session_id INTEGER,
    given_by INTEGER,
    user_id INTEGER,
    content TEXT,
    created_at TIMESTAMP
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Check if session exists
    IF NOT EXISTS (SELECT 1 FROM sessions WHERE session_id = p_session_id) THEN
        RAISE EXCEPTION 'Session with ID % not found', p_session_id USING ERRCODE = 'P0002';
    END IF;
    
    RETURN QUERY
    SELECT 
        f.session_id::INTEGER,
        f.given_by::INTEGER,
        gp.user_id::INTEGER,
        f.content,
        f.created_at
    FROM feedback f
    JOIN group_participants gp ON f.given_by = gp.group_participant_id
    WHERE f.session_id = p_session_id
    ORDER BY f.created_at;
END;
$$;

-- Create feedback for a session
CREATE OR REPLACE FUNCTION create_feedback(
    p_session_id INTEGER,
    p_given_by INTEGER,
    p_content TEXT DEFAULT NULL
)
RETURNS TABLE (
    session_id INTEGER,
    given_by INTEGER,
    user_id INTEGER,
    content TEXT,
    created_at TIMESTAMP
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_participant_id INTEGER;
BEGIN
    -- Validate required fields
    IF p_session_id IS NULL THEN
        RAISE EXCEPTION 'session_id is required' USING ERRCODE = '23514';
    END IF;
    
    IF p_given_by IS NULL THEN
        RAISE EXCEPTION 'given_by (user ID) is required' USING ERRCODE = '23514';
    END IF;
    
    -- Check if session exists
    IF NOT EXISTS (SELECT 1 FROM sessions WHERE session_id = p_session_id) THEN
        RAISE EXCEPTION 'Session with ID % not found', p_session_id USING ERRCODE = 'P0002';
    END IF;
    
    -- Check if user exists
    IF NOT EXISTS (SELECT 1 FROM users WHERE user_id = p_given_by) THEN
        RAISE EXCEPTION 'User with ID % not found', p_given_by USING ERRCODE = 'P0002';
    END IF;
    
    -- Get group participant ID for this user in this session's group
    SELECT gp.group_participant_id
    INTO v_participant_id
    FROM group_participants gp
    JOIN sessions s ON gp.group_id = s.group_id
    WHERE s.session_id = p_session_id AND gp.user_id = p_given_by
    LIMIT 1;
    
    -- If user is not a participant, add them to the group
    IF v_participant_id IS NULL THEN
        INSERT INTO group_participants (group_id, user_id, role)
        SELECT s.group_id, p_given_by, 'member'
        FROM sessions s
        WHERE s.session_id = p_session_id
        ON CONFLICT (group_id, user_id) DO UPDATE SET role = group_participants.role
        RETURNING group_participant_id INTO v_participant_id;
        
        -- If still null, get the existing record
        IF v_participant_id IS NULL THEN
            SELECT gp.group_participant_id
            INTO v_participant_id
            FROM group_participants gp
            JOIN sessions s ON gp.group_id = s.group_id
            WHERE s.session_id = p_session_id AND gp.user_id = p_given_by
            LIMIT 1;
        END IF;
    END IF;
    
    -- Insert feedback
    INSERT INTO feedback (session_id, given_by, content)
    VALUES (p_session_id, v_participant_id, p_content);
    
    -- Return the created feedback
    RETURN QUERY
    SELECT 
        p_session_id as session_id,
        v_participant_id as given_by,
        p_given_by as user_id,
        p_content as content,
        CURRENT_TIMESTAMP as created_at;
END;
$$;

-- Get feedback by user
CREATE OR REPLACE FUNCTION get_user_feedback(p_user_id INTEGER)
RETURNS TABLE (
    session_id INTEGER,
    given_by INTEGER,
    user_id INTEGER,
    content TEXT,
    created_at TIMESTAMP
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
        f.session_id::INTEGER,
        f.given_by::INTEGER,
        gp.user_id::INTEGER,
        f.content,
        f.created_at
    FROM feedback f
    JOIN group_participants gp ON f.given_by = gp.group_participant_id
    WHERE gp.user_id = p_user_id
    ORDER BY f.created_at;
END;
$$;

-- Get feedback by ID (helper function for individual feedback operations)
CREATE OR REPLACE FUNCTION get_feedback_by_id(p_feedback_id INTEGER)
RETURNS TABLE (
    session_id INTEGER,
    given_by INTEGER,
    user_id INTEGER,
    content TEXT,
    created_at TIMESTAMP
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Note: Since the current schema doesn't have a feedback_id primary key,
    -- this function uses a combination of session_id, given_by, and created_at
    -- In practice, you might want to add a feedback_id column for better identification
    
    RAISE EXCEPTION 'get_feedback_by_id not implemented - no feedback_id in current schema' USING ERRCODE = 'P0001';
END;
$$;

-- Update feedback (placeholder - would need feedback_id in schema)
CREATE OR REPLACE FUNCTION update_feedback(
    p_feedback_id INTEGER,
    p_content TEXT
)
RETURNS TABLE (
    session_id INTEGER,
    given_by INTEGER,
    user_id INTEGER,
    content TEXT,
    created_at TIMESTAMP
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Note: Current schema doesn't support individual feedback updates without proper ID
    RAISE EXCEPTION 'update_feedback not implemented - no feedback_id in current schema' USING ERRCODE = 'P0001';
END;
$$;

-- Delete feedback (placeholder - would need feedback_id in schema)
CREATE OR REPLACE FUNCTION delete_feedback(p_feedback_id INTEGER)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Note: Current schema doesn't support individual feedback deletion without proper ID
    RAISE EXCEPTION 'delete_feedback not implemented - no feedback_id in current schema' USING ERRCODE = 'P0001';
END;
$$;

-- =====================================================
-- AI METADATA OPERATIONS
-- =====================================================

-- Get AI metadata for a message
CREATE OR REPLACE FUNCTION get_message_ai_metadata(p_message_id INTEGER)
RETURNS TABLE (
    page_no INTEGER,
    message_id INTEGER,
    paper_id INTEGER,
    created_at TIMESTAMP
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Check if message exists
    IF NOT EXISTS (SELECT 1 FROM messages WHERE message_id = p_message_id) THEN
        RAISE EXCEPTION 'Message with ID % not found', p_message_id USING ERRCODE = 'P0002';
    END IF;
    
    RETURN QUERY
    SELECT 
        ai.page_no::INTEGER,
        ai.message_id::INTEGER,
        ai.paper_id::INTEGER,
        ai.created_at
    FROM ai_metadata ai
    WHERE ai.message_id = p_message_id
    ORDER BY ai.created_at;
END;
$$;

-- Create AI metadata for a message
CREATE OR REPLACE FUNCTION create_ai_metadata(
    p_message_id INTEGER,
    p_paper_id INTEGER,
    p_page_no INTEGER DEFAULT NULL
)
RETURNS TABLE (
    page_no INTEGER,
    message_id INTEGER,
    paper_id INTEGER,
    created_at TIMESTAMP
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Validate required fields
    IF p_message_id IS NULL THEN
        RAISE EXCEPTION 'message_id is required' USING ERRCODE = '23514';
    END IF;
    
    IF p_paper_id IS NULL THEN
        RAISE EXCEPTION 'paper_id is required' USING ERRCODE = '23514';
    END IF;
    
    -- Check if message exists
    IF NOT EXISTS (SELECT 1 FROM messages WHERE message_id = p_message_id) THEN
        RAISE EXCEPTION 'Message with ID % not found', p_message_id USING ERRCODE = 'P0002';
    END IF;
    
    -- Check if paper exists
    IF NOT EXISTS (SELECT 1 FROM papers WHERE paper_id = p_paper_id) THEN
        RAISE EXCEPTION 'Paper with ID % not found', p_paper_id USING ERRCODE = 'P0002';
    END IF;
    
    -- Insert AI metadata
    INSERT INTO ai_metadata (page_no, message_id, paper_id)
    VALUES (p_page_no, p_message_id, p_paper_id);
    
    -- Return the created metadata
    RETURN QUERY
    SELECT 
        p_page_no as page_no,
        p_message_id as message_id,
        p_paper_id as paper_id,
        CURRENT_TIMESTAMP as created_at;
END;
$$;

-- Get AI metadata for a paper
CREATE OR REPLACE FUNCTION get_paper_ai_metadata(p_paper_id INTEGER)
RETURNS TABLE (
    page_no INTEGER,
    message_id INTEGER,
    paper_id INTEGER,
    created_at TIMESTAMP
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Check if paper exists
    IF NOT EXISTS (SELECT 1 FROM papers WHERE paper_id = p_paper_id) THEN
        RAISE EXCEPTION 'Paper with ID % not found', p_paper_id USING ERRCODE = 'P0002';
    END IF;
    
    RETURN QUERY
    SELECT 
        ai.page_no::INTEGER,
        ai.message_id::INTEGER,
        ai.paper_id::INTEGER,
        ai.created_at
    FROM ai_metadata ai
    WHERE ai.paper_id = p_paper_id
    ORDER BY ai.created_at;
END;
$$;

-- Get AI metadata for all messages in a session
CREATE OR REPLACE FUNCTION get_session_ai_metadata(p_session_id INTEGER)
RETURNS TABLE (
    page_no INTEGER,
    message_id INTEGER,
    paper_id INTEGER,
    created_at TIMESTAMP
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Check if session exists
    IF NOT EXISTS (SELECT 1 FROM sessions WHERE session_id = p_session_id) THEN
        RAISE EXCEPTION 'Session with ID % not found', p_session_id USING ERRCODE = 'P0002';
    END IF;
    
    RETURN QUERY
    SELECT 
        ai.page_no::INTEGER,
        ai.message_id::INTEGER,
        ai.paper_id::INTEGER,
        ai.created_at
    FROM ai_metadata ai
    JOIN messages m ON ai.message_id = m.message_id
    WHERE m.session_id = p_session_id
    ORDER BY ai.created_at;
END;
$$;

-- Get AI metadata by ID (placeholder - would need metadata_id in schema)
CREATE OR REPLACE FUNCTION get_ai_metadata_by_id(p_metadata_id INTEGER)
RETURNS TABLE (
    page_no INTEGER,
    message_id INTEGER,
    paper_id INTEGER,
    created_at TIMESTAMP
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Note: Current schema doesn't have a metadata_id primary key
    RAISE EXCEPTION 'get_ai_metadata_by_id not implemented - no metadata_id in current schema' USING ERRCODE = 'P0001';
END;
$$;

-- Update AI metadata (placeholder - would need metadata_id in schema)
CREATE OR REPLACE FUNCTION update_ai_metadata(
    p_metadata_id INTEGER,
    p_page_no INTEGER DEFAULT NULL,
    p_paper_id INTEGER DEFAULT NULL
)
RETURNS TABLE (
    page_no INTEGER,
    message_id INTEGER,
    paper_id INTEGER,
    created_at TIMESTAMP
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Note: Current schema doesn't support individual metadata updates without proper ID
    RAISE EXCEPTION 'update_ai_metadata not implemented - no metadata_id in current schema' USING ERRCODE = 'P0001';
END;
$$;

-- Delete AI metadata (placeholder - would need metadata_id in schema)
CREATE OR REPLACE FUNCTION delete_ai_metadata(p_metadata_id INTEGER)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Note: Current schema doesn't support individual metadata deletion without proper ID
    RAISE EXCEPTION 'delete_ai_metadata not implemented - no metadata_id in current schema' USING ERRCODE = 'P0001';
END;
$$;

-- =====================================================
-- UTILITY FUNCTIONS
-- =====================================================

-- Get comprehensive session statistics
CREATE OR REPLACE FUNCTION get_session_statistics(p_session_id INTEGER)
RETURNS TABLE (
    session_id INTEGER,
    title TEXT,
    created_by INTEGER,
    total_messages BIGINT,
    total_papers BIGINT,
    total_feedback BIGINT,
    total_ai_metadata BIGINT,
    last_activity TIMESTAMP
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_session_info RECORD;
    v_total_messages BIGINT;
    v_total_papers BIGINT;
    v_total_feedback BIGINT;
    v_total_ai_metadata BIGINT;
    v_last_activity TIMESTAMP;
BEGIN
    -- Check if session exists and get basic info
    SELECT s.session_id, s.topic, s.created_by
    INTO v_session_info
    FROM sessions s
    WHERE s.session_id = p_session_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Session with ID % not found', p_session_id USING ERRCODE = 'P0002';
    END IF;
    
    -- Get message count
    SELECT COUNT(*) INTO v_total_messages
    FROM messages m
    WHERE m.session_id = p_session_id;
    
    -- Get paper count
    SELECT COUNT(*) INTO v_total_papers
    FROM session_papers sp
    WHERE sp.session_id = p_session_id;
    
    -- Get feedback count
    SELECT COUNT(*) INTO v_total_feedback
    FROM feedback f
    WHERE f.session_id = p_session_id;
    
    -- Get AI metadata count
    SELECT COUNT(*) INTO v_total_ai_metadata
    FROM ai_metadata ai
    JOIN messages m ON ai.message_id = m.message_id
    WHERE m.session_id = p_session_id;
    
    -- Get last activity (most recent message or feedback)
    SELECT GREATEST(
        COALESCE(MAX(m.sent_at), '1970-01-01'::TIMESTAMP),
        COALESCE(MAX(f.created_at), '1970-01-01'::TIMESTAMP)
    ) INTO v_last_activity
    FROM messages m
    FULL OUTER JOIN feedback f ON m.session_id = f.session_id
    WHERE m.session_id = p_session_id OR f.session_id = p_session_id;
    
    RETURN QUERY
    SELECT 
        p_session_id as session_id,
        COALESCE(v_session_info.topic, 'Untitled Session') as title,
        v_session_info.created_by as created_by,
        COALESCE(v_total_messages, 0) as total_messages,
        COALESCE(v_total_papers, 0) as total_papers,
        COALESCE(v_total_feedback, 0) as total_feedback,
        COALESCE(v_total_ai_metadata, 0) as total_ai_metadata,
        v_last_activity as last_activity;
END;
$$;

-- Search across all content types
CREATE OR REPLACE FUNCTION search_all_content(
    p_query_text TEXT,
    p_limit_count INTEGER DEFAULT 20
)
RETURNS TABLE (
    content_type TEXT,
    content_id INTEGER,
    title TEXT,
    content TEXT,
    relevance_score INTEGER
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    -- Search papers
    SELECT 
        'paper'::TEXT as content_type,
        p.paper_id::INTEGER as content_id,
        p.title,
        COALESCE(p.abstract, '') as content,
        CASE 
            WHEN p.title ILIKE '%' || p_query_text || '%' THEN 3
            WHEN p.authors ILIKE '%' || p_query_text || '%' THEN 2
            ELSE 1
        END as relevance_score
    FROM papers p
    WHERE p.title ILIKE '%' || p_query_text || '%'
       OR p.abstract ILIKE '%' || p_query_text || '%'
       OR p.authors ILIKE '%' || p_query_text || '%'
    
    UNION ALL
    
    -- Search messages
    SELECT 
        'message'::TEXT as content_type,
        m.message_id::INTEGER as content_id,
        ('Session ' || m.session_id)::TEXT as title,
        m.content,
        1 as relevance_score
    FROM messages m
    WHERE m.content ILIKE '%' || p_query_text || '%'
    
    ORDER BY relevance_score DESC, content_id
    LIMIT p_limit_count;
END;
$$;