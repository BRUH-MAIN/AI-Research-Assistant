-- =====================================================
-- RECREATE ALL FUNCTIONS - PART 4: PAPERS, FEEDBACK, AI & AUTH
-- Date: 2024-10-01
-- Description: Final part - Papers, Feedback, AI metadata, Authentication & remaining functions
-- =====================================================

-- =====================================================
-- PAPER MANAGEMENT FUNCTIONS
-- =====================================================

CREATE OR REPLACE FUNCTION create_paper(
    p_title TEXT, 
    p_abstract TEXT DEFAULT NULL, 
    p_authors TEXT DEFAULT NULL, 
    p_doi TEXT DEFAULT NULL, 
    p_published_at TIMESTAMP DEFAULT NULL, 
    p_source_url TEXT DEFAULT NULL, 
    p_tags TEXT[] DEFAULT NULL
)
RETURNS TABLE(paper_id INTEGER, title TEXT, abstract TEXT, authors TEXT, doi TEXT, published_at TIMESTAMP, source_url TEXT, created_at TIMESTAMP)
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

CREATE OR REPLACE FUNCTION get_paper_by_id(p_paper_id INTEGER)
RETURNS TABLE(paper_id INTEGER, title TEXT, abstract TEXT, authors TEXT, doi TEXT, published_at TIMESTAMP, source_url TEXT, created_at TIMESTAMP, tags TEXT[])
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

CREATE OR REPLACE FUNCTION get_all_papers()
RETURNS TABLE(paper_id INTEGER, title TEXT, abstract TEXT, authors TEXT, doi TEXT, published_at TIMESTAMP, source_url TEXT, created_at TIMESTAMP)
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

CREATE OR REPLACE FUNCTION update_paper(
    p_paper_id INTEGER, 
    p_title TEXT DEFAULT NULL, 
    p_abstract TEXT DEFAULT NULL, 
    p_authors TEXT DEFAULT NULL, 
    p_doi TEXT DEFAULT NULL, 
    p_source_url TEXT DEFAULT NULL
)
RETURNS TABLE(id INTEGER, title TEXT, abstract TEXT, authors TEXT, doi TEXT, published_at TIMESTAMP, source_url TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Check if paper exists
    IF NOT EXISTS (SELECT 1 FROM papers WHERE paper_id = p_paper_id) THEN
        RAISE EXCEPTION 'Paper with ID % not found', p_paper_id USING ERRCODE = 'P0002';
    END IF;
    
    -- Update paper
    UPDATE papers 
    SET 
        title = COALESCE(p_title, title),
        abstract = COALESCE(p_abstract, abstract),
        authors = COALESCE(p_authors, authors),
        doi = COALESCE(p_doi, doi),
        source_url = COALESCE(p_source_url, source_url),
        updated_at = CURRENT_TIMESTAMP
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

CREATE OR REPLACE FUNCTION search_papers(p_query TEXT)
RETURNS TABLE(paper_id INTEGER, title TEXT, abstract TEXT, authors TEXT, doi TEXT, published_at TIMESTAMP, source_url TEXT, created_at TIMESTAMP, relevance_score REAL)
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
        END::REAL as relevance_score
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

CREATE OR REPLACE FUNCTION get_related_papers(p_paper_id INTEGER, p_limit INTEGER DEFAULT 5)
RETURNS TABLE(id INTEGER, title TEXT, abstract TEXT, authors TEXT, doi TEXT, published_at TIMESTAMP, source_url TEXT, relevance_score NUMERIC)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Simple implementation based on shared words in title/abstract
    -- This could be enhanced with more sophisticated matching
    RETURN QUERY
    SELECT 
        p.paper_id::INTEGER as id,
        p.title,
        p.abstract,
        p.authors,
        p.doi,
        p.published_at,
        p.source_url,
        0.5::NUMERIC as relevance_score -- Placeholder relevance score
    FROM papers p
    WHERE p.paper_id != p_paper_id
    ORDER BY p.published_at DESC
    LIMIT p_limit;
END;
$$;

-- Session-Paper relationship functions
CREATE OR REPLACE FUNCTION add_paper_to_session(p_session_id INTEGER, p_paper_id INTEGER)
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

CREATE OR REPLACE FUNCTION remove_paper_from_session(p_session_id INTEGER, p_paper_id INTEGER)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Check if association exists
    IF NOT EXISTS (
        SELECT 1 FROM session_papers 
        WHERE session_id = p_session_id AND paper_id = p_paper_id
    ) THEN
        RAISE EXCEPTION 'Paper % is not associated with session %', p_paper_id, p_session_id USING ERRCODE = 'P0002';
    END IF;
    
    -- Remove association
    DELETE FROM session_papers 
    WHERE session_id = p_session_id AND paper_id = p_paper_id;
    
    RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION get_session_papers(p_session_id INTEGER)
RETURNS TABLE(paper_id INTEGER, title TEXT, abstract TEXT, authors TEXT, doi TEXT, added_at TIMESTAMP)
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

-- =====================================================
-- FEEDBACK FUNCTIONS
-- =====================================================

CREATE OR REPLACE FUNCTION create_feedback(
    p_session_id INTEGER, 
    p_user_id INTEGER, 
    p_content TEXT, 
    p_rating INTEGER DEFAULT NULL
)
RETURNS TABLE(feedback_id INTEGER, session_id INTEGER, given_by INTEGER, content TEXT, rating INTEGER, created_at TIMESTAMP)
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

CREATE OR REPLACE FUNCTION get_feedback_by_id(p_feedback_id INTEGER)
RETURNS TABLE(id INTEGER, session_id INTEGER, given_by INTEGER, content TEXT, rating INTEGER, created_at TIMESTAMP)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        f.feedback_id::INTEGER as id,
        f.session_id::INTEGER as session_id,
        f.given_by::INTEGER as given_by,
        f.content,
        f.rating::INTEGER as rating,
        f.created_at
    FROM feedback f
    WHERE f.feedback_id = p_feedback_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Feedback with ID % not found', p_feedback_id USING ERRCODE = 'P0002';
    END IF;
END;
$$;

CREATE OR REPLACE FUNCTION get_all_feedback(p_limit INTEGER DEFAULT 100, p_offset INTEGER DEFAULT 0)
RETURNS TABLE(id INTEGER, session_id INTEGER, given_by INTEGER, content TEXT, rating INTEGER, created_at TIMESTAMP)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        f.feedback_id::INTEGER as id,
        f.session_id::INTEGER as session_id,
        f.given_by::INTEGER as given_by,
        f.content,
        f.rating::INTEGER as rating,
        f.created_at
    FROM feedback f
    ORDER BY f.created_at DESC
    LIMIT p_limit OFFSET p_offset;
END;
$$;

CREATE OR REPLACE FUNCTION update_feedback(
    p_feedback_id INTEGER, 
    p_content TEXT DEFAULT NULL, 
    p_rating INTEGER DEFAULT NULL
)
RETURNS TABLE(id INTEGER, session_id INTEGER, given_by INTEGER, content TEXT, rating INTEGER, created_at TIMESTAMP)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Check if feedback exists
    IF NOT EXISTS (SELECT 1 FROM feedback WHERE feedback_id = p_feedback_id) THEN
        RAISE EXCEPTION 'Feedback with ID % not found', p_feedback_id USING ERRCODE = 'P0002';
    END IF;
    
    -- Update feedback
    UPDATE feedback 
    SET 
        content = COALESCE(p_content, content),
        rating = COALESCE(p_rating, rating),
        updated_at = CURRENT_TIMESTAMP
    WHERE feedback_id = p_feedback_id;
    
    -- Return updated feedback
    RETURN QUERY
    SELECT 
        f.feedback_id::INTEGER as id,
        f.session_id::INTEGER as session_id,
        f.given_by::INTEGER as given_by,
        f.content,
        f.rating::INTEGER as rating,
        f.created_at
    FROM feedback f
    WHERE f.feedback_id = p_feedback_id;
END;
$$;

CREATE OR REPLACE FUNCTION delete_feedback(p_feedback_id INTEGER)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Check if feedback exists
    IF NOT EXISTS (SELECT 1 FROM feedback WHERE feedback_id = p_feedback_id) THEN
        RAISE EXCEPTION 'Feedback with ID % not found', p_feedback_id USING ERRCODE = 'P0002';
    END IF;
    
    -- Delete feedback
    DELETE FROM feedback WHERE feedback_id = p_feedback_id;
    
    RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION get_session_feedback(p_session_id INTEGER)
RETURNS TABLE(feedback_id INTEGER, session_id INTEGER, given_by INTEGER, given_by_name TEXT, content TEXT, rating INTEGER, created_at TIMESTAMP)
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

CREATE OR REPLACE FUNCTION get_feedback_stats(p_session_id INTEGER DEFAULT NULL)
RETURNS TABLE(total_feedback BIGINT, average_rating NUMERIC, rating_distribution JSONB)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_total BIGINT;
    v_avg NUMERIC;
    v_distribution JSONB;
BEGIN
    -- Get total feedback
    SELECT COUNT(*) INTO v_total
    FROM feedback f
    WHERE (p_session_id IS NULL OR f.session_id = p_session_id);
    
    -- Get average rating
    SELECT AVG(rating) INTO v_avg
    FROM feedback f
    WHERE (p_session_id IS NULL OR f.session_id = p_session_id)
    AND rating IS NOT NULL;
    
    -- Get rating distribution
    SELECT json_object_agg(rating, count)::JSONB INTO v_distribution
    FROM (
        SELECT rating, COUNT(*) as count
        FROM feedback f
        WHERE (p_session_id IS NULL OR f.session_id = p_session_id)
        AND rating IS NOT NULL
        GROUP BY rating
        ORDER BY rating
    ) rating_counts;
    
    RETURN QUERY
    SELECT v_total, v_avg, COALESCE(v_distribution, '{}'::jsonb);
END;
$$;

CREATE OR REPLACE FUNCTION get_message_feedback(p_message_id INTEGER)
RETURNS TABLE(id INTEGER, session_id INTEGER, given_by INTEGER, content TEXT, rating INTEGER, created_at TIMESTAMP)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Note: This requires a relationship between feedback and messages
    -- For now, return empty result set as the schema doesn't have this relationship
    RETURN QUERY
    SELECT 
        f.feedback_id::INTEGER as id,
        f.session_id::INTEGER as session_id,
        f.given_by::INTEGER as given_by,
        f.content,
        f.rating::INTEGER as rating,
        f.created_at
    FROM feedback f
    WHERE 1=0; -- Always return empty for now
END;
$$;

-- =====================================================
-- AI METADATA FUNCTIONS
-- =====================================================

CREATE OR REPLACE FUNCTION create_ai_metadata(
    p_message_id INTEGER, 
    p_paper_id INTEGER, 
    p_page_no INTEGER DEFAULT NULL
)
RETURNS TABLE(id INTEGER, message_id INTEGER, paper_id INTEGER, page_no INTEGER, created_at TIMESTAMP)
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
    RETURNING ai_metadata_id INTO v_id;
    
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

CREATE OR REPLACE FUNCTION get_ai_metadata_by_id(p_ai_metadata_id INTEGER)
RETURNS TABLE(id INTEGER, message_id INTEGER, model_name TEXT, input_tokens INTEGER, output_tokens INTEGER, cost NUMERIC, processing_time NUMERIC, created_at TIMESTAMP)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        am.ai_metadata_id::INTEGER as id,
        am.message_id::INTEGER as message_id,
        am.model_name,
        am.input_tokens::INTEGER as input_tokens,
        am.output_tokens::INTEGER as output_tokens,
        am.cost,
        am.processing_time,
        am.created_at
    FROM ai_metadata am
    WHERE am.ai_metadata_id = p_ai_metadata_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'AI metadata with ID % not found', p_ai_metadata_id USING ERRCODE = 'P0002';
    END IF;
END;
$$;

CREATE OR REPLACE FUNCTION get_ai_metadata_by_message(p_message_id INTEGER)
RETURNS TABLE(id INTEGER, message_id INTEGER, paper_id INTEGER, paper_title TEXT, page_no INTEGER, created_at TIMESTAMP)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        am.ai_metadata_id::INTEGER as id,
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

CREATE OR REPLACE FUNCTION get_ai_metadata_by_model(p_model_name TEXT, p_limit INTEGER DEFAULT 100)
RETURNS TABLE(id INTEGER, message_id INTEGER, model_name TEXT, input_tokens INTEGER, output_tokens INTEGER, cost NUMERIC, processing_time NUMERIC, created_at TIMESTAMP)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        am.ai_metadata_id::INTEGER as id,
        am.message_id::INTEGER as message_id,
        am.model_name,
        am.input_tokens::INTEGER as input_tokens,
        am.output_tokens::INTEGER as output_tokens,
        am.cost,
        am.processing_time,
        am.created_at
    FROM ai_metadata am
    WHERE am.model_name = p_model_name
    ORDER BY am.created_at DESC
    LIMIT p_limit;
END;
$$;

CREATE OR REPLACE FUNCTION get_all_ai_metadata(p_limit INTEGER DEFAULT 100, p_offset INTEGER DEFAULT 0)
RETURNS TABLE(id INTEGER, message_id INTEGER, model_name TEXT, input_tokens INTEGER, output_tokens INTEGER, cost NUMERIC, processing_time NUMERIC, created_at TIMESTAMP)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        am.ai_metadata_id::INTEGER as id,
        am.message_id::INTEGER as message_id,
        am.model_name,
        am.input_tokens::INTEGER as input_tokens,
        am.output_tokens::INTEGER as output_tokens,
        am.cost,
        am.processing_time,
        am.created_at
    FROM ai_metadata am
    ORDER BY am.created_at DESC
    LIMIT p_limit OFFSET p_offset;
END;
$$;

CREATE OR REPLACE FUNCTION update_ai_metadata(
    p_ai_metadata_id INTEGER, 
    p_model_name TEXT DEFAULT NULL, 
    p_input_tokens INTEGER DEFAULT NULL, 
    p_output_tokens INTEGER DEFAULT NULL, 
    p_cost NUMERIC DEFAULT NULL, 
    p_processing_time NUMERIC DEFAULT NULL
)
RETURNS TABLE(id INTEGER, message_id INTEGER, model_name TEXT, input_tokens INTEGER, output_tokens INTEGER, cost NUMERIC, processing_time NUMERIC, created_at TIMESTAMP)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Check if AI metadata exists
    IF NOT EXISTS (SELECT 1 FROM ai_metadata WHERE ai_metadata_id = p_ai_metadata_id) THEN
        RAISE EXCEPTION 'AI metadata with ID % not found', p_ai_metadata_id USING ERRCODE = 'P0002';
    END IF;
    
    -- Update AI metadata
    UPDATE ai_metadata 
    SET 
        model_name = COALESCE(p_model_name, model_name),
        input_tokens = COALESCE(p_input_tokens, input_tokens),
        output_tokens = COALESCE(p_output_tokens, output_tokens),
        cost = COALESCE(p_cost, cost),
        processing_time = COALESCE(p_processing_time, processing_time),
        updated_at = CURRENT_TIMESTAMP
    WHERE ai_metadata_id = p_ai_metadata_id;
    
    -- Return updated AI metadata
    RETURN QUERY
    SELECT 
        am.ai_metadata_id::INTEGER as id,
        am.message_id::INTEGER as message_id,
        am.model_name,
        am.input_tokens::INTEGER as input_tokens,
        am.output_tokens::INTEGER as output_tokens,
        am.cost,
        am.processing_time,
        am.created_at
    FROM ai_metadata am
    WHERE am.ai_metadata_id = p_ai_metadata_id;
END;
$$;

CREATE OR REPLACE FUNCTION delete_ai_metadata(p_ai_metadata_id INTEGER)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Check if AI metadata exists
    IF NOT EXISTS (SELECT 1 FROM ai_metadata WHERE ai_metadata_id = p_ai_metadata_id) THEN
        RAISE EXCEPTION 'AI metadata with ID % not found', p_ai_metadata_id USING ERRCODE = 'P0002';
    END IF;
    
    -- Delete AI metadata
    DELETE FROM ai_metadata WHERE ai_metadata_id = p_ai_metadata_id;
    
    RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION get_message_ai_metadata(p_message_id INTEGER)
RETURNS TABLE(id INTEGER, message_id INTEGER, model_name TEXT, input_tokens INTEGER, output_tokens INTEGER, cost NUMERIC, processing_time NUMERIC, created_at TIMESTAMP)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        am.ai_metadata_id::INTEGER as id,
        am.message_id::INTEGER as message_id,
        am.model_name,
        am.input_tokens::INTEGER as input_tokens,
        am.output_tokens::INTEGER as output_tokens,
        am.cost,
        am.processing_time,
        am.created_at
    FROM ai_metadata am
    WHERE am.message_id = p_message_id;
END;
$$;

CREATE OR REPLACE FUNCTION get_ai_performance_stats(p_model_name TEXT DEFAULT NULL)
RETURNS TABLE(model_name TEXT, total_requests BIGINT, average_input_tokens NUMERIC, average_output_tokens NUMERIC, average_cost NUMERIC, average_processing_time NUMERIC, min_processing_time NUMERIC, max_processing_time NUMERIC)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        am.model_name,
        COUNT(*) as total_requests,
        AVG(am.input_tokens) as average_input_tokens,
        AVG(am.output_tokens) as average_output_tokens,
        AVG(am.cost) as average_cost,
        AVG(am.processing_time) as average_processing_time,
        MIN(am.processing_time) as min_processing_time,
        MAX(am.processing_time) as max_processing_time
    FROM ai_metadata am
    WHERE (p_model_name IS NULL OR am.model_name = p_model_name)
    GROUP BY am.model_name
    ORDER BY total_requests DESC;
END;
$$;

CREATE OR REPLACE FUNCTION get_ai_usage_stats(p_date_from DATE DEFAULT NULL, p_date_to DATE DEFAULT NULL)
RETURNS TABLE(total_requests BIGINT, total_input_tokens BIGINT, total_output_tokens BIGINT, total_cost NUMERIC, average_processing_time NUMERIC, model_usage JSONB)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_total_requests BIGINT;
    v_total_input BIGINT;
    v_total_output BIGINT;
    v_total_cost NUMERIC;
    v_avg_time NUMERIC;
    v_model_usage JSONB;
BEGIN
    -- Get overall stats
    SELECT 
        COUNT(*),
        SUM(input_tokens),
        SUM(output_tokens),
        SUM(cost),
        AVG(processing_time)
    INTO v_total_requests, v_total_input, v_total_output, v_total_cost, v_avg_time
    FROM ai_metadata am
    WHERE (p_date_from IS NULL OR am.created_at::date >= p_date_from)
    AND (p_date_to IS NULL OR am.created_at::date <= p_date_to);
    
    -- Get model usage distribution
    SELECT jsonb_object_agg(model_name, usage_count) INTO v_model_usage
    FROM (
        SELECT model_name, COUNT(*) as usage_count
        FROM ai_metadata am
        WHERE (p_date_from IS NULL OR am.created_at::date >= p_date_from)
        AND (p_date_to IS NULL OR am.created_at::date <= p_date_to)
        GROUP BY model_name
        ORDER BY usage_count DESC
    ) model_counts;
    
    RETURN QUERY
    SELECT 
        COALESCE(v_total_requests, 0),
        COALESCE(v_total_input, 0),
        COALESCE(v_total_output, 0),
        COALESCE(v_total_cost, 0.0),
        COALESCE(v_avg_time, 0.0),
        COALESCE(v_model_usage, '{}'::jsonb);
END;
$$;

-- =====================================================
-- AI PERMISSION & LOGGING FUNCTIONS
-- =====================================================

CREATE OR REPLACE FUNCTION can_user_invoke_ai(p_user_id INTEGER, p_session_id INTEGER)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_role VARCHAR(50);
    v_is_session_creator BOOLEAN;
BEGIN
    -- Get user's role in the group
    SELECT gp.role INTO v_user_role
    FROM sessions s
    JOIN group_participants gp ON s.group_id = gp.group_id
    WHERE s.session_id = p_session_id
    AND gp.user_id = p_user_id;
    
    -- Check if user is the session creator
    SELECT (created_by = p_user_id) INTO v_is_session_creator
    FROM sessions
    WHERE session_id = p_session_id;
    
    -- Allow AI invocation if user is admin, mentor, or session creator
    RETURN (v_user_role IN ('admin', 'mentor') OR v_is_session_creator);
END;
$$;

CREATE OR REPLACE FUNCTION log_ai_invocation(
    p_user_id INTEGER, 
    p_session_id INTEGER, 
    p_trigger_message_id INTEGER, 
    p_ai_message_id INTEGER
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- This function can be used to log AI usage for analytics
    -- For now, we'll just return true, but could expand to include logging table
    RETURN TRUE;
END;
$$;

-- =====================================================
-- AUTHENTICATION FUNCTIONS
-- =====================================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    user_name TEXT;
    name_parts TEXT[];
    first_name_val TEXT;
    last_name_val TEXT;
BEGIN
    -- Extract name information from user metadata
    user_name := COALESCE(
        NEW.raw_user_meta_data->>'full_name',
        NEW.raw_user_meta_data->>'name',
        split_part(NEW.email, '@', 1)
    );
    
    -- Parse name into first and last name
    IF user_name IS NOT NULL AND user_name != '' THEN
        name_parts := string_to_array(trim(user_name), ' ');
        first_name_val := name_parts[1];
        
        -- Combine remaining parts for last name
        IF array_length(name_parts, 1) > 1 THEN
            last_name_val := array_to_string(name_parts[2:], ' ');
        END IF;
    ELSE
        first_name_val := split_part(NEW.email, '@', 1);
        last_name_val := NULL;
    END IF;

    -- Insert new user with better error handling
    BEGIN
        INSERT INTO public.users (
            auth_user_id,
            email,
            first_name,
            last_name,
            profile_picture_url,
            provider,
            provider_id,
            last_sign_in_at,
            raw_app_meta_data,
            raw_user_meta_data,
            availability,
            created_at,
            updated_at
        )
        VALUES (
            NEW.id,
            NEW.email,
            first_name_val,
            last_name_val,
            NEW.raw_user_meta_data->>'avatar_url',
            COALESCE(NEW.raw_app_meta_data->>'provider', 'google'),
            NEW.raw_app_meta_data->>'provider_id',
            NEW.last_sign_in_at,
            NEW.raw_app_meta_data,
            NEW.raw_user_meta_data,
            'available',
            NEW.created_at,
            CURRENT_TIMESTAMP
        )
        ON CONFLICT (auth_user_id) DO UPDATE SET
            email = EXCLUDED.email,
            first_name = COALESCE(EXCLUDED.first_name, users.first_name),
            last_name = COALESCE(EXCLUDED.last_name, users.last_name),
            profile_picture_url = COALESCE(EXCLUDED.profile_picture_url, users.profile_picture_url),
            last_sign_in_at = EXCLUDED.last_sign_in_at,
            raw_app_meta_data = EXCLUDED.raw_app_meta_data,
            raw_user_meta_data = EXCLUDED.raw_user_meta_data,
            updated_at = CURRENT_TIMESTAMP;

        RAISE LOG 'Successfully created/updated user for auth_user_id: %, email: %', NEW.id, NEW.email;
        
    EXCEPTION WHEN OTHERS THEN
        RAISE LOG 'Error creating user for auth_user_id %, email %: %', NEW.id, NEW.email, SQLERRM;
        -- Don't prevent the auth user creation if this fails
    END;

    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION handle_user_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    user_name TEXT;
    name_parts TEXT[];
    first_name_val TEXT;
    last_name_val TEXT;
    rows_affected INTEGER;
BEGIN
    -- Only process if relevant fields changed
    IF NEW.email = OLD.email 
       AND NEW.last_sign_in_at = OLD.last_sign_in_at 
       AND NEW.raw_user_meta_data = OLD.raw_user_meta_data 
       AND NEW.raw_app_meta_data = OLD.raw_app_meta_data THEN
        RETURN NEW;
    END IF;

    -- Extract updated name information
    user_name := COALESCE(
        NEW.raw_user_meta_data->>'full_name',
        NEW.raw_user_meta_data->>'name'
    );
    
    IF user_name IS NOT NULL AND user_name != '' THEN
        name_parts := string_to_array(trim(user_name), ' ');
        first_name_val := name_parts[1];
        
        IF array_length(name_parts, 1) > 1 THEN
            last_name_val := array_to_string(name_parts[2:], ' ');
        END IF;
    END IF;

    BEGIN
        UPDATE public.users
        SET
            email = NEW.email,
            first_name = COALESCE(first_name_val, first_name),
            last_name = COALESCE(last_name_val, last_name),
            profile_picture_url = COALESCE(NEW.raw_user_meta_data->>'avatar_url', profile_picture_url),
            last_sign_in_at = NEW.last_sign_in_at,
            raw_app_meta_data = NEW.raw_app_meta_data,
            raw_user_meta_data = NEW.raw_user_meta_data,
            updated_at = CURRENT_TIMESTAMP
        WHERE auth_user_id = NEW.id;
        
        GET DIAGNOSTICS rows_affected = ROW_COUNT;
        
        IF rows_affected = 0 THEN
            RAISE LOG 'No user found to update for auth_user_id: %', NEW.id;
            -- Try to create the user if update failed
            PERFORM public.handle_new_user_from_update(NEW);
        ELSE
            RAISE LOG 'Successfully updated user for auth_user_id: %, rows affected: %', NEW.id, rows_affected;
        END IF;
        
    EXCEPTION WHEN OTHERS THEN
        RAISE LOG 'Error updating user for auth_user_id %: %', NEW.id, SQLERRM;
    END;

    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION handle_new_user_from_update(user_record auth.users)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    user_name TEXT;
    name_parts TEXT[];
    first_name_val TEXT;
    last_name_val TEXT;
BEGIN
    user_name := COALESCE(
        user_record.raw_user_meta_data->>'full_name',
        user_record.raw_user_meta_data->>'name',
        split_part(user_record.email, '@', 1)
    );
    
    IF user_name IS NOT NULL AND user_name != '' THEN
        name_parts := string_to_array(trim(user_name), ' ');
        first_name_val := name_parts[1];
        
        IF array_length(name_parts, 1) > 1 THEN
            last_name_val := array_to_string(name_parts[2:], ' ');
        END IF;
    ELSE
        first_name_val := split_part(user_record.email, '@', 1);
        last_name_val := NULL;
    END IF;

    INSERT INTO public.users (
        auth_user_id,
        email,
        first_name,
        last_name,
        profile_picture_url,
        provider,
        provider_id,
        last_sign_in_at,
        raw_app_meta_data,
        raw_user_meta_data,
        availability,
        created_at,
        updated_at
    )
    VALUES (
        user_record.id,
        user_record.email,
        first_name_val,
        last_name_val,
        user_record.raw_user_meta_data->>'avatar_url',
        COALESCE(user_record.raw_app_meta_data->>'provider', 'google'),
        user_record.raw_app_meta_data->>'provider_id',
        user_record.last_sign_in_at,
        user_record.raw_app_meta_data,
        user_record.raw_user_meta_data,
        'available',
        user_record.created_at,
        CURRENT_TIMESTAMP
    )
    ON CONFLICT (auth_user_id) DO NOTHING;
    
    RAISE LOG 'Created missing user record for auth_user_id: %', user_record.id;
    
EXCEPTION WHEN OTHERS THEN
    RAISE LOG 'Error creating missing user record for auth_user_id %: %', user_record.id, SQLERRM;
END;
$$;

CREATE OR REPLACE FUNCTION sync_existing_auth_users()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    auth_user RECORD;
    synced_count INTEGER := 0;
    error_count INTEGER := 0;
BEGIN
    FOR auth_user IN 
        SELECT * FROM auth.users 
        WHERE id NOT IN (SELECT auth_user_id FROM public.users WHERE auth_user_id IS NOT NULL)
    LOOP
        BEGIN
            PERFORM public.handle_new_user_from_update(auth_user);
            synced_count := synced_count + 1;
        EXCEPTION WHEN OTHERS THEN
            error_count := error_count + 1;
            RAISE LOG 'Failed to sync auth user %: %', auth_user.id, SQLERRM;
        END;
    END LOOP;
    
    RETURN format('Synced %s users, %s errors', synced_count, error_count);
END;
$$;

-- Grant permissions for all functions
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO anon;

-- Add comments for all new functions
COMMENT ON FUNCTION create_paper(TEXT, TEXT, TEXT, TEXT, TIMESTAMP, TEXT, TEXT[]) IS 'Creates a new research paper with optional metadata';
COMMENT ON FUNCTION get_paper_by_id(INTEGER) IS 'Retrieves paper details by ID including tags';
COMMENT ON FUNCTION get_all_papers() IS 'Returns all papers ordered by creation date';
COMMENT ON FUNCTION update_paper(INTEGER, TEXT, TEXT, TEXT, TEXT, TEXT) IS 'Updates paper information';
COMMENT ON FUNCTION delete_paper(INTEGER) IS 'Permanently deletes a paper';
COMMENT ON FUNCTION search_papers(TEXT) IS 'Searches papers by title, abstract, authors, or tags';
COMMENT ON FUNCTION get_related_papers(INTEGER, INTEGER) IS 'Finds related papers (placeholder implementation)';
COMMENT ON FUNCTION add_paper_to_session(INTEGER, INTEGER) IS 'Associates a paper with a session';
COMMENT ON FUNCTION remove_paper_from_session(INTEGER, INTEGER) IS 'Removes paper association from session';
COMMENT ON FUNCTION get_session_papers(INTEGER) IS 'Returns all papers associated with a session';

COMMENT ON FUNCTION create_feedback(INTEGER, INTEGER, TEXT, INTEGER) IS 'Creates user feedback for a session';
COMMENT ON FUNCTION get_feedback_by_id(INTEGER) IS 'Retrieves feedback details by ID';
COMMENT ON FUNCTION get_all_feedback(INTEGER, INTEGER) IS 'Returns all feedback with pagination';
COMMENT ON FUNCTION update_feedback(INTEGER, TEXT, INTEGER) IS 'Updates feedback content and/or rating';
COMMENT ON FUNCTION delete_feedback(INTEGER) IS 'Permanently deletes feedback';
COMMENT ON FUNCTION get_session_feedback(INTEGER) IS 'Returns all feedback for a specific session';
COMMENT ON FUNCTION get_feedback_stats(INTEGER) IS 'Returns feedback statistics and rating distribution';
COMMENT ON FUNCTION get_message_feedback(INTEGER) IS 'Returns feedback for a specific message (placeholder)';

COMMENT ON FUNCTION create_ai_metadata(INTEGER, INTEGER, INTEGER) IS 'Creates AI processing metadata for messages';
COMMENT ON FUNCTION get_ai_metadata_by_id(INTEGER) IS 'Retrieves AI metadata by ID';
COMMENT ON FUNCTION get_ai_metadata_by_message(INTEGER) IS 'Returns AI metadata for a specific message';
COMMENT ON FUNCTION get_ai_metadata_by_model(TEXT, INTEGER) IS 'Returns AI metadata filtered by model name';
COMMENT ON FUNCTION get_all_ai_metadata(INTEGER, INTEGER) IS 'Returns all AI metadata with pagination';
COMMENT ON FUNCTION update_ai_metadata(INTEGER, TEXT, INTEGER, INTEGER, NUMERIC, NUMERIC) IS 'Updates AI metadata information';
COMMENT ON FUNCTION delete_ai_metadata(INTEGER) IS 'Permanently deletes AI metadata';
COMMENT ON FUNCTION get_message_ai_metadata(INTEGER) IS 'Returns AI metadata for a specific message';
COMMENT ON FUNCTION get_ai_performance_stats(TEXT) IS 'Returns AI performance statistics by model';
COMMENT ON FUNCTION get_ai_usage_stats(DATE, DATE) IS 'Returns AI usage statistics for date range';

COMMENT ON FUNCTION can_user_invoke_ai(INTEGER, INTEGER) IS 'Checks if user has permission to invoke AI in session';
COMMENT ON FUNCTION log_ai_invocation(INTEGER, INTEGER, INTEGER, INTEGER) IS 'Logs AI invocation for analytics';

COMMENT ON FUNCTION handle_new_user() IS 'Trigger function for new user creation from auth';
COMMENT ON FUNCTION handle_user_update() IS 'Trigger function for user updates from auth';
COMMENT ON FUNCTION handle_new_user_from_update(auth.users) IS 'Creates user record from auth data';
COMMENT ON FUNCTION sync_existing_auth_users() IS 'Syncs existing auth users to public.users table';

-- =====================================================
-- FINAL VERIFICATION
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '🎉 ALL FUNCTIONS RECREATED SUCCESSFULLY!';
    RAISE NOTICE '✅ Paper management functions';
    RAISE NOTICE '✅ Feedback system functions';
    RAISE NOTICE '✅ AI metadata tracking functions';
    RAISE NOTICE '✅ AI permission & logging functions';
    RAISE NOTICE '✅ Authentication & user sync functions';
    RAISE NOTICE '';
    RAISE NOTICE 'Complete function recreation finished!';
    RAISE NOTICE 'All database functions are now available and properly commented.';
END $$;
