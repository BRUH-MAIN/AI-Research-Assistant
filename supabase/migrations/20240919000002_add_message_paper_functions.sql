-- Migration: Add Message and Paper Functions
-- Date: 2024-09-19
-- Description: Migrate message and paper management functions from sql-functions

-- =====================================================
-- MESSAGE OPERATIONS
-- =====================================================

-- Get messages with filtering and pagination
CREATE OR REPLACE FUNCTION get_messages(
    p_session_id INTEGER DEFAULT NULL,
    p_user_id INTEGER DEFAULT NULL,
    p_message_type TEXT DEFAULT NULL,
    p_limit_count INTEGER DEFAULT 100,
    p_offset_count INTEGER DEFAULT 0
)
RETURNS TABLE (
    id INTEGER,
    session_id INTEGER,
    user_id INTEGER,
    content TEXT,
    message_type TEXT,
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    is_edited BOOLEAN
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        m.message_id::INTEGER as id,
        m.session_id::INTEGER,
        gp.user_id::INTEGER,
        m.content,
        CASE 
            WHEN u.email = 'ai@assistant.com' THEN 'assistant'
            ELSE 'user'
        END as message_type,
        m.sent_at as created_at,
        m.sent_at as updated_at,
        false as is_edited
    FROM messages m
    JOIN group_participants gp ON m.sender_id = gp.group_participant_id
    JOIN users u ON gp.user_id = u.user_id
    WHERE (p_session_id IS NULL OR m.session_id = p_session_id)
      AND (p_user_id IS NULL OR gp.user_id = p_user_id)
      AND (p_message_type IS NULL OR 
           (p_message_type = 'assistant' AND u.email = 'ai@assistant.com') OR
           (p_message_type = 'user' AND u.email != 'ai@assistant.com'))
    ORDER BY m.sent_at DESC
    LIMIT p_limit_count
    OFFSET p_offset_count;
END;
$$;

-- Create new message
CREATE OR REPLACE FUNCTION create_message(
    p_session_id INTEGER,
    p_user_id INTEGER,
    p_content TEXT,
    p_message_type TEXT DEFAULT 'user'
)
RETURNS TABLE (
    id INTEGER,
    session_id INTEGER,
    user_id INTEGER,
    content TEXT,
    message_type TEXT,
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    is_edited BOOLEAN
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_sender_id INTEGER;
    v_message_id INTEGER;
BEGIN
    -- Validate required fields
    IF p_session_id IS NULL THEN
        RAISE EXCEPTION 'session_id is required' USING ERRCODE = '23514';
    END IF;
    
    IF p_user_id IS NULL THEN
        RAISE EXCEPTION 'user_id is required' USING ERRCODE = '23514';
    END IF;
    
    IF p_content IS NULL OR trim(p_content) = '' THEN
        RAISE EXCEPTION 'content is required' USING ERRCODE = '23514';
    END IF;
    
    -- Check if session exists
    IF NOT EXISTS (SELECT 1 FROM sessions WHERE session_id = p_session_id) THEN
        RAISE EXCEPTION 'Session with ID % not found', p_session_id USING ERRCODE = 'P0002';
    END IF;
    
    -- Check if user exists
    IF NOT EXISTS (SELECT 1 FROM users WHERE user_id = p_user_id) THEN
        RAISE EXCEPTION 'User with ID % not found', p_user_id USING ERRCODE = 'P0002';
    END IF;
    
    -- Get or create group participant record
    SELECT gp.group_participant_id
    INTO v_sender_id
    FROM group_participants gp
    JOIN sessions s ON gp.group_id = s.group_id
    WHERE s.session_id = p_session_id AND gp.user_id = p_user_id
    LIMIT 1;
    
    -- If user is not a participant, add them to the group
    IF v_sender_id IS NULL THEN
        INSERT INTO group_participants (group_id, user_id, role)
        SELECT s.group_id, p_user_id, 'member'
        FROM sessions s
        WHERE s.session_id = p_session_id
        ON CONFLICT (group_id, user_id) DO UPDATE SET role = group_participants.role
        RETURNING group_participant_id INTO v_sender_id;
        
        -- If still null, get the existing record
        IF v_sender_id IS NULL THEN
            SELECT gp.group_participant_id
            INTO v_sender_id
            FROM group_participants gp
            JOIN sessions s ON gp.group_id = s.group_id
            WHERE s.session_id = p_session_id AND gp.user_id = p_user_id
            LIMIT 1;
        END IF;
    END IF;
    
    -- Insert the message
    INSERT INTO messages (session_id, sender_id, content)
    VALUES (p_session_id, v_sender_id, p_content)
    RETURNING message_id INTO v_message_id;
    
    -- Return the created message
    RETURN QUERY
    SELECT 
        v_message_id as id,
        p_session_id as session_id,
        p_user_id as user_id,
        p_content as content,
        p_message_type as message_type,
        CURRENT_TIMESTAMP as created_at,
        CURRENT_TIMESTAMP as updated_at,
        false as is_edited;
END;
$$;

-- Get message by ID
CREATE OR REPLACE FUNCTION get_message_by_id(p_message_id INTEGER)
RETURNS TABLE (
    id INTEGER,
    session_id INTEGER,
    user_id INTEGER,
    content TEXT,
    message_type TEXT,
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    is_edited BOOLEAN
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        m.message_id::INTEGER as id,
        m.session_id::INTEGER,
        gp.user_id::INTEGER,
        m.content,
        CASE 
            WHEN u.email = 'ai@assistant.com' THEN 'assistant'
            ELSE 'user'
        END as message_type,
        m.sent_at as created_at,
        m.sent_at as updated_at,
        false as is_edited
    FROM messages m
    JOIN group_participants gp ON m.sender_id = gp.group_participant_id
    JOIN users u ON gp.user_id = u.user_id
    WHERE m.message_id = p_message_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Message with ID % not found', p_message_id USING ERRCODE = 'P0002';
    END IF;
END;
$$;

-- Search messages
CREATE OR REPLACE FUNCTION search_messages(
    p_query_text TEXT,
    p_session_id INTEGER DEFAULT NULL,
    p_user_id INTEGER DEFAULT NULL,
    p_limit_count INTEGER DEFAULT 50
)
RETURNS TABLE (
    query TEXT,
    results JSON,
    total_results INTEGER
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_results JSON;
    v_count INTEGER;
BEGIN
    -- Build and execute search query
    WITH search_results AS (
        SELECT 
            m.message_id::INTEGER as id,
            m.session_id::INTEGER,
            gp.user_id::INTEGER,
            m.content,
            CASE 
                WHEN u.email = 'ai@assistant.com' THEN 'assistant'
                ELSE 'user'
            END as message_type,
            m.sent_at as created_at,
            m.sent_at as updated_at,
            false as is_edited
        FROM messages m
        JOIN group_participants gp ON m.sender_id = gp.group_participant_id
        JOIN users u ON gp.user_id = u.user_id
        WHERE m.content ILIKE '%' || p_query_text || '%'
          AND (p_session_id IS NULL OR m.session_id = p_session_id)
          AND (p_user_id IS NULL OR gp.user_id = p_user_id)
        ORDER BY m.sent_at DESC
        LIMIT p_limit_count
    )
    SELECT json_agg(row_to_json(search_results)), COUNT(*)
    INTO v_results, v_count
    FROM search_results;
    
    RETURN QUERY
    SELECT 
        p_query_text as query,
        COALESCE(v_results, '[]'::JSON) as results,
        COALESCE(v_count, 0) as total_results;
END;
$$;

-- =====================================================
-- PAPER OPERATIONS
-- =====================================================

-- Get all papers
CREATE OR REPLACE FUNCTION get_all_papers()
RETURNS TABLE (
    id INTEGER,
    title TEXT,
    abstract TEXT,
    authors TEXT,
    doi TEXT,
    published_at TIMESTAMP,
    source_url TEXT
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.paper_id::INTEGER as id,
        p.title,
        p.abstract,
        p.authors,
        p.doi,
        p.published_at,
        p.source_url
    FROM papers p
    ORDER BY p.paper_id;
END;
$$;

-- Get paper by ID
CREATE OR REPLACE FUNCTION get_paper_by_id(p_paper_id INTEGER)
RETURNS TABLE (
    id INTEGER,
    title TEXT,
    abstract TEXT,
    authors TEXT,
    doi TEXT,
    published_at TIMESTAMP,
    source_url TEXT
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.paper_id::INTEGER as id,
        p.title,
        p.abstract,
        p.authors,
        p.doi,
        p.published_at,
        p.source_url
    FROM papers p
    WHERE p.paper_id = p_paper_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Paper with ID % not found', p_paper_id USING ERRCODE = 'P0002';
    END IF;
END;
$$;

-- Create new paper
CREATE OR REPLACE FUNCTION create_paper(
    p_title TEXT,
    p_abstract TEXT DEFAULT NULL,
    p_authors TEXT DEFAULT NULL,
    p_doi TEXT DEFAULT NULL,
    p_published_at TIMESTAMP DEFAULT NULL,
    p_source_url TEXT DEFAULT NULL
)
RETURNS TABLE (
    id INTEGER,
    title TEXT,
    abstract TEXT,
    authors TEXT,
    doi TEXT,
    published_at TIMESTAMP,
    source_url TEXT
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_paper_id INTEGER;
BEGIN
    -- Validate title is required
    IF p_title IS NULL OR trim(p_title) = '' THEN
        RAISE EXCEPTION 'Title is required' USING ERRCODE = '23514';
    END IF;
    
    -- Check for duplicate DOI if provided
    IF p_doi IS NOT NULL AND EXISTS (SELECT 1 FROM papers WHERE doi = p_doi) THEN
        RAISE EXCEPTION 'Paper with DOI % already exists', p_doi USING ERRCODE = '23505';
    END IF;
    
    -- Insert new paper
    INSERT INTO papers (title, abstract, authors, doi, published_at, source_url)
    VALUES (p_title, p_abstract, p_authors, p_doi, p_published_at, p_source_url)
    RETURNING paper_id INTO v_paper_id;
    
    -- Return the created paper
    RETURN QUERY
    SELECT 
        v_paper_id as id,
        p_title as title,
        p_abstract as abstract,
        p_authors as authors,
        p_doi as doi,
        p_published_at as published_at,
        p_source_url as source_url;
END;
$$;

-- Update paper
CREATE OR REPLACE FUNCTION update_paper(
    p_paper_id INTEGER,
    p_title TEXT DEFAULT NULL,
    p_abstract TEXT DEFAULT NULL,
    p_authors TEXT DEFAULT NULL,
    p_doi TEXT DEFAULT NULL,
    p_published_at TIMESTAMP DEFAULT NULL,
    p_source_url TEXT DEFAULT NULL
)
RETURNS TABLE (
    id INTEGER,
    title TEXT,
    abstract TEXT,
    authors TEXT,
    doi TEXT,
    published_at TIMESTAMP,
    source_url TEXT
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Check if paper exists
    IF NOT EXISTS (SELECT 1 FROM papers WHERE paper_id = p_paper_id) THEN
        RAISE EXCEPTION 'Paper with ID % not found', p_paper_id USING ERRCODE = 'P0002';
    END IF;
    
    -- Check for duplicate DOI if provided and different from current
    IF p_doi IS NOT NULL AND EXISTS (
        SELECT 1 FROM papers 
        WHERE doi = p_doi AND paper_id != p_paper_id
    ) THEN
        RAISE EXCEPTION 'Paper with DOI % already exists', p_doi USING ERRCODE = '23505';
    END IF;
    
    -- Update paper with provided values
    UPDATE papers 
    SET 
        title = COALESCE(p_title, title),
        abstract = COALESCE(p_abstract, abstract),
        authors = COALESCE(p_authors, authors),
        doi = COALESCE(p_doi, doi),
        published_at = COALESCE(p_published_at, published_at),
        source_url = COALESCE(p_source_url, source_url)
    WHERE paper_id = p_paper_id;
    
    -- Return updated paper
    RETURN QUERY
    SELECT 
        p.paper_id::INTEGER as id,
        p.title,
        p.abstract,
        p.authors,
        p.doi,
        p.published_at,
        p.source_url
    FROM papers p
    WHERE p.paper_id = p_paper_id;
END;
$$;

-- Delete paper
CREATE OR REPLACE FUNCTION delete_paper(p_paper_id INTEGER)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Check if paper exists
    IF NOT EXISTS (SELECT 1 FROM papers WHERE paper_id = p_paper_id) THEN
        RAISE EXCEPTION 'Paper with ID % not found', p_paper_id USING ERRCODE = 'P0002';
    END IF;
    
    -- Delete paper (cascading deletes will handle related records)
    DELETE FROM papers WHERE paper_id = p_paper_id;
    
    RETURN true;
END;
$$;

-- Search papers
CREATE OR REPLACE FUNCTION search_papers(
    p_query_text TEXT,
    p_limit_count INTEGER DEFAULT 50
)
RETURNS TABLE (
    id INTEGER,
    title TEXT,
    abstract TEXT,
    authors TEXT,
    doi TEXT,
    published_at TIMESTAMP,
    source_url TEXT
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.paper_id::INTEGER as id,
        p.title,
        p.abstract,
        p.authors,
        p.doi,
        p.published_at,
        p.source_url
    FROM papers p
    WHERE p.title ILIKE '%' || p_query_text || '%'
       OR p.abstract ILIKE '%' || p_query_text || '%'
       OR p.authors ILIKE '%' || p_query_text || '%'
    ORDER BY 
        CASE 
            WHEN p.title ILIKE '%' || p_query_text || '%' THEN 1
            WHEN p.authors ILIKE '%' || p_query_text || '%' THEN 2
            ELSE 3
        END,
        p.paper_id
    LIMIT p_limit_count;
END;
$$;

-- Get paper tags
CREATE OR REPLACE FUNCTION get_paper_tags(p_paper_id INTEGER)
RETURNS TABLE (tags TEXT[])
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
    
    -- Get tags
    SELECT ARRAY_AGG(pt.tag ORDER BY pt.tag)
    INTO v_tags
    FROM paper_tags pt
    WHERE pt.paper_id = p_paper_id;
    
    RETURN QUERY SELECT COALESCE(v_tags, ARRAY[]::TEXT[]) as tags;
END;
$$;

-- Add paper tags
CREATE OR REPLACE FUNCTION add_paper_tags(
    p_paper_id INTEGER,
    p_tags TEXT[]
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_tag TEXT;
    v_added_count INTEGER := 0;
BEGIN
    -- Check if paper exists
    IF NOT EXISTS (SELECT 1 FROM papers WHERE paper_id = p_paper_id) THEN
        RAISE EXCEPTION 'Paper with ID % not found', p_paper_id USING ERRCODE = 'P0002';
    END IF;
    
    -- Add each tag
    FOREACH v_tag IN ARRAY p_tags
    LOOP
        INSERT INTO paper_tags (paper_id, tag)
        VALUES (p_paper_id, v_tag)
        ON CONFLICT (paper_id, tag) DO NOTHING;
        
        IF FOUND THEN
            v_added_count := v_added_count + 1;
        END IF;
    END LOOP;
    
    RETURN json_build_object(
        'message', 
        'Added ' || v_added_count || ' tags to paper ' || p_paper_id
    );
END;
$$;

-- Remove paper tag
CREATE OR REPLACE FUNCTION remove_paper_tag(
    p_paper_id INTEGER,
    p_tag TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_deleted_count INTEGER;
BEGIN
    -- Check if paper exists
    IF NOT EXISTS (SELECT 1 FROM papers WHERE paper_id = p_paper_id) THEN
        RAISE EXCEPTION 'Paper with ID % not found', p_paper_id USING ERRCODE = 'P0002';
    END IF;
    
    -- Remove tag
    DELETE FROM paper_tags 
    WHERE paper_id = p_paper_id AND tag = p_tag;
    
    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
    
    IF v_deleted_count = 0 THEN
        RAISE EXCEPTION 'Tag ''%'' not found for paper %', p_tag, p_paper_id USING ERRCODE = 'P0002';
    END IF;
    
    RETURN json_build_object(
        'message', 
        'Removed tag ''' || p_tag || ''' from paper ' || p_paper_id
    );
END;
$$;

-- Get session papers
CREATE OR REPLACE FUNCTION get_session_papers(p_session_id INTEGER)
RETURNS TABLE (
    id INTEGER,
    title TEXT,
    abstract TEXT,
    authors TEXT,
    doi TEXT,
    published_at TIMESTAMP,
    source_url TEXT,
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
        p.paper_id::INTEGER as id,
        p.title,
        p.abstract,
        p.authors,
        p.doi,
        p.published_at,
        p.source_url,
        sp.added_at
    FROM papers p
    JOIN session_papers sp ON p.paper_id = sp.paper_id
    WHERE sp.session_id = p_session_id
    ORDER BY sp.added_at;
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
    
    -- Check if already linked
    IF EXISTS (SELECT 1 FROM session_papers WHERE session_id = p_session_id AND paper_id = p_paper_id) THEN
        RAISE EXCEPTION 'Paper % is already linked to session %', p_paper_id, p_session_id USING ERRCODE = '23505';
    END IF;
    
    -- Add paper to session
    INSERT INTO session_papers (session_id, paper_id)
    VALUES (p_session_id, p_paper_id);
    
    RETURN json_build_object(
        'message', 
        'Added paper ' || p_paper_id || ' to session ' || p_session_id
    );
END;
$$;

-- Remove paper from session
CREATE OR REPLACE FUNCTION remove_paper_from_session(
    p_session_id INTEGER,
    p_paper_id INTEGER
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_deleted_count INTEGER;
BEGIN
    -- Remove paper from session
    DELETE FROM session_papers 
    WHERE session_id = p_session_id AND paper_id = p_paper_id;
    
    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
    
    IF v_deleted_count = 0 THEN
        RAISE EXCEPTION 'Paper % is not linked to session %', p_paper_id, p_session_id USING ERRCODE = 'P0002';
    END IF;
    
    RETURN json_build_object(
        'message', 
        'Removed paper ' || p_paper_id || ' from session ' || p_session_id
    );
END;
$$;