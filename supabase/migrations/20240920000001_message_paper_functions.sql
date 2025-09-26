-- =====================================================
-- MESSAGE AND PAPER MANAGEMENT FUNCTIONS
-- Date: 2024-09-20
-- Description: Functions for managing messages, papers, and AI metadata
-- =====================================================

-- =====================================================
-- MESSAGE MANAGEMENT FUNCTIONS
-- =====================================================

-- Get all messages for a session
CREATE OR REPLACE FUNCTION get_session_messages(p_session_id INTEGER)
RETURNS TABLE (
    message_id INTEGER,
    session_id INTEGER,
    sender_id INTEGER,
    sender_name TEXT,
    content TEXT,
    sent_at TIMESTAMP
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
        m.message_id::INTEGER,
        m.session_id::INTEGER,
        gp.user_id::INTEGER as sender_id,
        COALESCE(
            TRIM(CONCAT(u.first_name, ' ', u.last_name)), 
            u.email
        ) as sender_name,
        m.content,
        m.sent_at
    FROM messages m
    JOIN group_participants gp ON m.sender_id = gp.group_participant_id
    JOIN users u ON gp.user_id = u.user_id
    WHERE m.session_id = p_session_id
    ORDER BY m.sent_at ASC;
END;
$$;

-- Create new message
CREATE OR REPLACE FUNCTION create_message(
    p_session_id INTEGER,
    p_sender_user_id INTEGER,
    p_content TEXT
)
RETURNS TABLE (
    message_id INTEGER,
    session_id INTEGER,
    sender_id INTEGER,
    sender_name TEXT,
    content TEXT,
    sent_at TIMESTAMP
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_sender_participant_id INTEGER;
    v_message_id INTEGER;
    v_group_id INTEGER;
BEGIN
    -- Validate inputs
    IF p_content IS NULL OR trim(p_content) = '' THEN
        RAISE EXCEPTION 'Message content is required' USING ERRCODE = '23514';
    END IF;
    
    -- Check if session exists and get group_id
    SELECT s.group_id INTO v_group_id
    FROM sessions s
    WHERE s.session_id = p_session_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Session with ID % not found', p_session_id USING ERRCODE = 'P0002';
    END IF;
    
    -- Get sender's group participant ID
    SELECT gp.group_participant_id INTO v_sender_participant_id
    FROM group_participants gp
    WHERE gp.group_id = v_group_id AND gp.user_id = p_sender_user_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'User % is not a member of the session group', p_sender_user_id USING ERRCODE = 'P0002';
    END IF;
    
    -- Insert new message
    INSERT INTO messages (session_id, sender_id, content, sent_at)
    VALUES (p_session_id, v_sender_participant_id, p_content, CURRENT_TIMESTAMP)
    RETURNING message_id INTO v_message_id;
    
    -- Return the created message
    RETURN QUERY
    SELECT 
        v_message_id as message_id,
        p_session_id as session_id,
        p_sender_user_id as sender_id,
        COALESCE(
            TRIM(CONCAT(u.first_name, ' ', u.last_name)), 
            u.email
        ) as sender_name,
        p_content as content,
        CURRENT_TIMESTAMP as sent_at
    FROM users u
    WHERE u.user_id = p_sender_user_id;
END;
$$;

-- Get message by ID
CREATE OR REPLACE FUNCTION get_message_by_id(p_message_id INTEGER)
RETURNS TABLE (
    message_id INTEGER,
    session_id INTEGER,
    sender_id INTEGER,
    sender_name TEXT,
    content TEXT,
    sent_at TIMESTAMP
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        m.message_id::INTEGER,
        m.session_id::INTEGER,
        gp.user_id::INTEGER as sender_id,
        COALESCE(
            TRIM(CONCAT(u.first_name, ' ', u.last_name)), 
            u.email
        ) as sender_name,
        m.content,
        m.sent_at
    FROM messages m
    JOIN group_participants gp ON m.sender_id = gp.group_participant_id
    JOIN users u ON gp.user_id = u.user_id
    WHERE m.message_id = p_message_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Message with ID % not found', p_message_id USING ERRCODE = 'P0002';
    END IF;
END;
$$;

-- Delete message
CREATE OR REPLACE FUNCTION delete_message(p_message_id INTEGER)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Check if message exists
    IF NOT EXISTS (SELECT 1 FROM messages WHERE message_id = p_message_id) THEN
        RAISE EXCEPTION 'Message with ID % not found', p_message_id USING ERRCODE = 'P0002';
    END IF;
    
    -- Delete message (cascading deletes will handle related records)
    DELETE FROM messages WHERE message_id = p_message_id;
    
    RETURN true;
END;
$$;

-- =====================================================
-- PAPER MANAGEMENT FUNCTIONS
-- =====================================================

-- Get all papers
CREATE OR REPLACE FUNCTION get_all_papers()
RETURNS TABLE (
    paper_id INTEGER,
    title TEXT,
    abstract TEXT,
    authors TEXT,
    doi TEXT,
    published_at TIMESTAMP,
    source_url TEXT,
    created_at TIMESTAMP
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.paper_id::INTEGER,
        p.title,
        p.abstract,
        p.authors,
        p.doi,
        p.published_at,
        p.source_url,
        p.created_at
    FROM papers p
    ORDER BY p.created_at DESC;
END;
$$;

-- Get paper by ID
CREATE OR REPLACE FUNCTION get_paper_by_id(p_paper_id INTEGER)
RETURNS TABLE (
    paper_id INTEGER,
    title TEXT,
    abstract TEXT,
    authors TEXT,
    doi TEXT,
    published_at TIMESTAMP,
    source_url TEXT,
    created_at TIMESTAMP,
    tags TEXT[]
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_tags TEXT[];
BEGIN
    -- Check if paper exists
    IF NOT EXISTS (SELECT 1 FROM papers WHERE paper_id = p_paper_id) THEN
        RAISE EXCEPTION 'Paper with ID % not found', p_paper_id USING ERRCODE = 'P0002';
    END IF;
    
    -- Get paper tags
    SELECT ARRAY_AGG(pt.tag) INTO v_tags
    FROM paper_tags pt
    WHERE pt.paper_id = p_paper_id;
    
    RETURN QUERY
    SELECT 
        p.paper_id::INTEGER,
        p.title,
        p.abstract,
        p.authors,
        p.doi,
        p.published_at,
        p.source_url,
        p.created_at,
        COALESCE(v_tags, ARRAY[]::TEXT[]) as tags
    FROM papers p
    WHERE p.paper_id = p_paper_id;
END;
$$;

-- Create new paper
CREATE OR REPLACE FUNCTION create_paper(
    p_title TEXT,
    p_abstract TEXT DEFAULT NULL,
    p_authors TEXT DEFAULT NULL,
    p_doi TEXT DEFAULT NULL,
    p_published_at TIMESTAMP DEFAULT NULL,
    p_source_url TEXT DEFAULT NULL,
    p_tags TEXT[] DEFAULT NULL
)
RETURNS TABLE (
    paper_id INTEGER,
    title TEXT,
    abstract TEXT,
    authors TEXT,
    doi TEXT,
    published_at TIMESTAMP,
    source_url TEXT,
    created_at TIMESTAMP
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_paper_id INTEGER;
    tag_item TEXT;
BEGIN
    -- Validate title is not empty
    IF p_title IS NULL OR trim(p_title) = '' THEN
        RAISE EXCEPTION 'Paper title is required' USING ERRCODE = '23514';
    END IF;
    
    -- Check if paper with same DOI already exists (if DOI provided)
    IF p_doi IS NOT NULL AND EXISTS (SELECT 1 FROM papers WHERE doi = p_doi) THEN
        RAISE EXCEPTION 'Paper with DOI % already exists', p_doi USING ERRCODE = '23505';
    END IF;
    
    -- Insert new paper
    INSERT INTO papers (title, abstract, authors, doi, published_at, source_url)
    VALUES (p_title, p_abstract, p_authors, p_doi, p_published_at, p_source_url)
    RETURNING paper_id INTO v_paper_id;
    
    -- Add tags if provided
    IF p_tags IS NOT NULL THEN
        FOREACH tag_item IN ARRAY p_tags
        LOOP
            INSERT INTO paper_tags (paper_id, tag)
            VALUES (v_paper_id, tag_item)
            ON CONFLICT DO NOTHING;
        END LOOP;
    END IF;
    
    -- Return the created paper
    RETURN QUERY
    SELECT 
        v_paper_id as paper_id,
        p_title as title,
        p_abstract as abstract,
        p_authors as authors,
        p_doi as doi,
        p_published_at as published_at,
        p_source_url as source_url,
        CURRENT_TIMESTAMP as created_at;
END;
$$;

-- Search papers by title or abstract
CREATE OR REPLACE FUNCTION search_papers(p_query TEXT)
RETURNS TABLE (
    paper_id INTEGER,
    title TEXT,
    abstract TEXT,
    authors TEXT,
    doi TEXT,
    published_at TIMESTAMP,
    source_url TEXT,
    created_at TIMESTAMP,
    relevance_score REAL
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.paper_id::INTEGER,
        p.title,
        p.abstract,
        p.authors,
        p.doi,
        p.published_at,
        p.source_url,
        p.created_at,
        CASE 
            WHEN LOWER(p.title) LIKE LOWER('%' || p_query || '%') THEN 1.0
            WHEN LOWER(p.abstract) LIKE LOWER('%' || p_query || '%') THEN 0.8
            WHEN LOWER(p.authors) LIKE LOWER('%' || p_query || '%') THEN 0.6
            ELSE 0.4
        END as relevance_score
    FROM papers p
    WHERE 
        LOWER(p.title) LIKE LOWER('%' || p_query || '%') OR
        LOWER(p.abstract) LIKE LOWER('%' || p_query || '%') OR
        LOWER(p.authors) LIKE LOWER('%' || p_query || '%') OR
        EXISTS (
            SELECT 1 FROM paper_tags pt 
            WHERE pt.paper_id = p.paper_id 
            AND LOWER(pt.tag) LIKE LOWER('%' || p_query || '%')
        )
    ORDER BY relevance_score DESC, p.created_at DESC;
END;
$$;

-- Get papers for session
CREATE OR REPLACE FUNCTION get_session_papers(p_session_id INTEGER)
RETURNS TABLE (
    paper_id INTEGER,
    title TEXT,
    abstract TEXT,
    authors TEXT,
    doi TEXT,
    added_at TIMESTAMP
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
        p.paper_id::INTEGER,
        p.title,
        p.abstract,
        p.authors,
        p.doi,
        sp.added_at
    FROM session_papers sp
    JOIN papers p ON sp.paper_id = p.paper_id
    WHERE sp.session_id = p_session_id
    ORDER BY sp.added_at DESC;
END;
$$;

-- Add paper to session
CREATE OR REPLACE FUNCTION add_paper_to_session(
    p_session_id INTEGER,
    p_paper_id INTEGER
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Check if session exists
    IF NOT EXISTS (SELECT 1 FROM sessions WHERE session_id = p_session_id) THEN
        RAISE EXCEPTION 'Session with ID % not found', p_session_id USING ERRCODE = 'P0002';
    END IF;
    
    -- Check if paper exists
    IF NOT EXISTS (SELECT 1 FROM papers WHERE paper_id = p_paper_id) THEN
        RAISE EXCEPTION 'Paper with ID % not found', p_paper_id USING ERRCODE = 'P0002';
    END IF;
    
    -- Check if paper is already in session
    IF EXISTS (SELECT 1 FROM session_papers WHERE session_id = p_session_id AND paper_id = p_paper_id) THEN
        RAISE EXCEPTION 'Paper % is already in session %', p_paper_id, p_session_id USING ERRCODE = '23505';
    END IF;
    
    -- Add paper to session
    INSERT INTO session_papers (session_id, paper_id)
    VALUES (p_session_id, p_paper_id);
    
    RETURN json_build_object('message', 'Paper ' || p_paper_id || ' added to session ' || p_session_id);
END;
$$;

-- =====================================================
-- AI METADATA FUNCTIONS
-- =====================================================

-- Create AI metadata
CREATE OR REPLACE FUNCTION create_ai_metadata(
    p_message_id INTEGER,
    p_paper_id INTEGER,
    p_page_no INTEGER DEFAULT NULL
)
RETURNS TABLE (
    id INTEGER,
    message_id INTEGER,
    paper_id INTEGER,
    page_no INTEGER,
    created_at TIMESTAMP
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_id INTEGER;
BEGIN
    -- Check if message exists
    IF NOT EXISTS (SELECT 1 FROM messages WHERE message_id = p_message_id) THEN
        RAISE EXCEPTION 'Message with ID % not found', p_message_id USING ERRCODE = 'P0002';
    END IF;
    
    -- Check if paper exists
    IF NOT EXISTS (SELECT 1 FROM papers WHERE paper_id = p_paper_id) THEN
        RAISE EXCEPTION 'Paper with ID % not found', p_paper_id USING ERRCODE = 'P0002';
    END IF;
    
    -- Insert AI metadata
    INSERT INTO ai_metadata (message_id, paper_id, page_no)
    VALUES (p_message_id, p_paper_id, p_page_no)
    RETURNING id INTO v_id;
    
    -- Return the created metadata
    RETURN QUERY
    SELECT 
        v_id as id,
        p_message_id as message_id,
        p_paper_id as paper_id,
        p_page_no as page_no,
        CURRENT_TIMESTAMP as created_at;
END;
$$;

-- Get AI metadata for message
CREATE OR REPLACE FUNCTION get_ai_metadata_by_message(p_message_id INTEGER)
RETURNS TABLE (
    id INTEGER,
    message_id INTEGER,
    paper_id INTEGER,
    paper_title TEXT,
    page_no INTEGER,
    created_at TIMESTAMP
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        am.id::INTEGER,
        am.message_id::INTEGER,
        am.paper_id::INTEGER,
        p.title as paper_title,
        am.page_no,
        am.created_at
    FROM ai_metadata am
    JOIN papers p ON am.paper_id = p.paper_id
    WHERE am.message_id = p_message_id
    ORDER BY am.created_at ASC;
END;
$$;

-- =====================================================
-- FEEDBACK FUNCTIONS
-- =====================================================

-- Create feedback
CREATE OR REPLACE FUNCTION create_feedback(
    p_session_id INTEGER,
    p_user_id INTEGER,
    p_content TEXT,
    p_rating INTEGER DEFAULT NULL
)
RETURNS TABLE (
    feedback_id INTEGER,
    session_id INTEGER,
    given_by INTEGER,
    content TEXT,
    rating INTEGER,
    created_at TIMESTAMP
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_feedback_id INTEGER;
    v_group_id INTEGER;
    v_participant_id INTEGER;
BEGIN
    -- Validate inputs
    IF p_content IS NULL OR trim(p_content) = '' THEN
        RAISE EXCEPTION 'Feedback content is required' USING ERRCODE = '23514';
    END IF;
    
    -- Validate rating if provided
    IF p_rating IS NOT NULL AND (p_rating < 1 OR p_rating > 5) THEN
        RAISE EXCEPTION 'Rating must be between 1 and 5' USING ERRCODE = '23514';
    END IF;
    
    -- Check if session exists and get group_id
    SELECT s.group_id INTO v_group_id
    FROM sessions s
    WHERE s.session_id = p_session_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Session with ID % not found', p_session_id USING ERRCODE = 'P0002';
    END IF;
    
    -- Get user's group participant ID
    SELECT gp.group_participant_id INTO v_participant_id
    FROM group_participants gp
    WHERE gp.group_id = v_group_id AND gp.user_id = p_user_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'User % is not a member of the session group', p_user_id USING ERRCODE = 'P0002';
    END IF;
    
    -- Insert feedback
    INSERT INTO feedback (session_id, given_by, content, rating)
    VALUES (p_session_id, v_participant_id, p_content, p_rating)
    RETURNING feedback_id INTO v_feedback_id;
    
    -- Return the created feedback
    RETURN QUERY
    SELECT 
        v_feedback_id as feedback_id,
        p_session_id as session_id,
        p_user_id as given_by,
        p_content as content,
        p_rating as rating,
        CURRENT_TIMESTAMP as created_at;
END;
$$;

-- Get feedback for session
CREATE OR REPLACE FUNCTION get_session_feedback(p_session_id INTEGER)
RETURNS TABLE (
    feedback_id INTEGER,
    session_id INTEGER,
    given_by INTEGER,
    given_by_name TEXT,
    content TEXT,
    rating INTEGER,
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
        f.feedback_id::INTEGER,
        f.session_id::INTEGER,
        gp.user_id::INTEGER as given_by,
        COALESCE(
            TRIM(CONCAT(u.first_name, ' ', u.last_name)), 
            u.email
        ) as given_by_name,
        f.content,
        f.rating,
        f.created_at
    FROM feedback f
    JOIN group_participants gp ON f.given_by = gp.group_participant_id
    JOIN users u ON gp.user_id = u.user_id
    WHERE f.session_id = p_session_id
    ORDER BY f.created_at DESC;
END;
$$;

-- Grant execute permissions on all functions
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;