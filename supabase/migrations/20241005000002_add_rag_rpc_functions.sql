-- =====================================================
-- RAG RPC FUNCTIONS
-- Date: 2024-10-05
-- Description: RPC functions for RAG metadata management
-- =====================================================

-- =====================================================
-- RAG DOCUMENTS FUNCTIONS
-- =====================================================

-- Create RAG document entry
CREATE OR REPLACE FUNCTION public.create_rag_document(
    p_paper_id integer,
    p_file_name text,
    p_file_path text
)
RETURNS TABLE(rag_document_id integer, paper_id integer, file_name text, file_path text, processing_status text, created_at timestamp)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    INSERT INTO rag_documents (paper_id, file_name, file_path)
    VALUES (p_paper_id, p_file_name, p_file_path)
    RETURNING 
        rag_documents.rag_document_id::INTEGER,
        rag_documents.paper_id::INTEGER,
        rag_documents.file_name::TEXT,
        rag_documents.file_path::TEXT,
        rag_documents.processing_status::TEXT,
        rag_documents.created_at::TIMESTAMP;
END;
$$;

-- Update RAG document processing status
CREATE OR REPLACE FUNCTION public.update_rag_document_status(
    p_paper_id integer,
    p_processing_status text,
    p_chunks_count integer DEFAULT NULL,
    p_vector_store_ids text[] DEFAULT NULL,
    p_processing_error text DEFAULT NULL
)
RETURNS TABLE(rag_document_id integer, processing_status text, chunks_count integer, processed_at timestamp)
LANGUAGE plpgsql
AS $$
BEGIN
    -- Validate status
    IF p_processing_status NOT IN ('pending', 'processing', 'completed', 'failed') THEN
        RAISE EXCEPTION 'Invalid processing status: %', p_processing_status USING ERRCODE = 'P0001';
    END IF;

    RETURN QUERY
    UPDATE rag_documents 
    SET 
        processing_status = p_processing_status,
        chunks_count = COALESCE(p_chunks_count, chunks_count),
        vector_store_ids = COALESCE(p_vector_store_ids, vector_store_ids),
        processing_error = CASE 
            WHEN p_processing_status = 'failed' THEN p_processing_error 
            ELSE NULL 
        END,
        processed_at = CASE 
            WHEN p_processing_status = 'completed' THEN CURRENT_TIMESTAMP 
            ELSE processed_at 
        END,
        updated_at = CURRENT_TIMESTAMP
    WHERE paper_id = p_paper_id
    RETURNING 
        rag_documents.rag_document_id::INTEGER,
        rag_documents.processing_status::TEXT,
        rag_documents.chunks_count::INTEGER,
        rag_documents.processed_at::TIMESTAMP;
END;
$$;

-- Get RAG document by paper ID
CREATE OR REPLACE FUNCTION public.get_rag_document_by_paper_id(p_paper_id integer)
RETURNS TABLE(
    rag_document_id integer, 
    paper_id integer, 
    file_name text, 
    file_path text, 
    processing_status text, 
    chunks_count integer,
    vector_store_ids text[],
    processing_error text,
    processed_at timestamp,
    created_at timestamp
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        rd.rag_document_id::INTEGER,
        rd.paper_id::INTEGER,
        rd.file_name::TEXT,
        rd.file_path::TEXT,
        rd.processing_status::TEXT,
        rd.chunks_count::INTEGER,
        rd.vector_store_ids::TEXT[],
        rd.processing_error::TEXT,
        rd.processed_at::TIMESTAMP,
        rd.created_at::TIMESTAMP
    FROM rag_documents rd
    WHERE rd.paper_id = p_paper_id;
END;
$$;

-- Get all RAG documents with paper info
CREATE OR REPLACE FUNCTION public.get_all_rag_documents()
RETURNS TABLE(
    rag_document_id integer,
    paper_id integer,
    paper_title text,
    file_name text,
    file_path text,
    processing_status text,
    chunks_count integer,
    processed_at timestamp,
    created_at timestamp
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        rd.rag_document_id::INTEGER,
        rd.paper_id::INTEGER,
        p.title::TEXT,
        rd.file_name::TEXT,
        rd.file_path::TEXT,
        rd.processing_status::TEXT,
        rd.chunks_count::INTEGER,
        rd.processed_at::TIMESTAMP,
        rd.created_at::TIMESTAMP
    FROM rag_documents rd
    JOIN papers p ON rd.paper_id = p.paper_id
    ORDER BY rd.created_at DESC;
END;
$$;

-- =====================================================
-- SESSION RAG STATUS FUNCTIONS
-- =====================================================

-- Enable RAG for session
CREATE OR REPLACE FUNCTION public.enable_session_rag(
    p_session_id integer,
    p_enabled_by integer
)
RETURNS TABLE(session_rag_id integer, session_id integer, is_rag_enabled boolean, rag_enabled_at timestamp)
LANGUAGE plpgsql
AS $$
BEGIN
    -- Check if session exists
    IF NOT EXISTS (SELECT 1 FROM sessions WHERE session_id = p_session_id) THEN
        RAISE EXCEPTION 'Session with ID % not found', p_session_id USING ERRCODE = 'P0002';
    END IF;

    -- Upsert session RAG status
    INSERT INTO session_rag_status (session_id, is_rag_enabled, rag_enabled_at, enabled_by)
    VALUES (p_session_id, true, CURRENT_TIMESTAMP, p_enabled_by)
    ON CONFLICT (session_id) 
    DO UPDATE SET 
        is_rag_enabled = true,
        rag_enabled_at = CURRENT_TIMESTAMP,
        enabled_by = p_enabled_by,
        updated_at = CURRENT_TIMESTAMP;

    RETURN QUERY
    SELECT 
        srs.session_rag_id::INTEGER,
        srs.session_id::INTEGER,
        srs.is_rag_enabled::BOOLEAN,
        srs.rag_enabled_at::TIMESTAMP
    FROM session_rag_status srs
    WHERE srs.session_id = p_session_id;
END;
$$;

-- Disable RAG for session
CREATE OR REPLACE FUNCTION public.disable_session_rag(p_session_id integer)
RETURNS TABLE(session_rag_id integer, session_id integer, is_rag_enabled boolean, rag_disabled_at timestamp)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    UPDATE session_rag_status 
    SET 
        is_rag_enabled = false,
        rag_disabled_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
    WHERE session_id = p_session_id
    RETURNING 
        session_rag_status.session_rag_id::INTEGER,
        session_rag_status.session_id::INTEGER,
        session_rag_status.is_rag_enabled::BOOLEAN,
        session_rag_status.rag_disabled_at::TIMESTAMP;
END;
$$;

-- Get session RAG status
CREATE OR REPLACE FUNCTION public.get_session_rag_status(p_session_id integer)
RETURNS TABLE(
    session_rag_id integer,
    session_id integer,
    is_rag_enabled boolean,
    total_papers integer,
    processed_papers integer,
    rag_enabled_at timestamp,
    enabled_by integer,
    enabled_by_name text
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        srs.session_rag_id::INTEGER,
        srs.session_id::INTEGER,
        srs.is_rag_enabled::BOOLEAN,
        COALESCE((
            SELECT COUNT(*)::INTEGER 
            FROM session_papers sp 
            WHERE sp.session_id = p_session_id
        ), 0),
        COALESCE((
            SELECT COUNT(*)::INTEGER 
            FROM session_papers sp 
            JOIN rag_documents rd ON sp.paper_id = rd.paper_id 
            WHERE sp.session_id = p_session_id AND rd.processing_status = 'completed'
        ), 0),
        srs.rag_enabled_at::TIMESTAMP,
        srs.enabled_by::INTEGER,
        COALESCE(u.first_name || ' ' || u.last_name, u.email)::TEXT
    FROM session_rag_status srs
    LEFT JOIN users u ON srs.enabled_by = u.user_id
    WHERE srs.session_id = p_session_id;
END;
$$;

-- Get session papers with RAG status
CREATE OR REPLACE FUNCTION public.get_session_papers_with_rag_status(p_session_id integer)
RETURNS TABLE(
    paper_id integer,
    title text,
    abstract text,
    authors text,
    doi text,
    added_at timestamp,
    has_rag boolean,
    rag_status text,
    rag_file_name text,
    chunks_count integer,
    processed_at timestamp
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.paper_id::INTEGER,
        p.title::TEXT,
        p.abstract::TEXT,
        p.authors::TEXT,
        p.doi::TEXT,
        sp.added_at::TIMESTAMP,
        (rd.rag_document_id IS NOT NULL)::BOOLEAN,
        COALESCE(rd.processing_status, 'not_processed')::TEXT,
        rd.file_name::TEXT,
        rd.chunks_count::INTEGER,
        rd.processed_at::TIMESTAMP
    FROM session_papers sp
    JOIN papers p ON sp.paper_id = p.paper_id
    LEFT JOIN rag_documents rd ON p.paper_id = rd.paper_id
    WHERE sp.session_id = p_session_id
    ORDER BY sp.added_at DESC;
END;
$$;

-- =====================================================
-- RAG CHAT METADATA FUNCTIONS
-- =====================================================

-- Record RAG chat metadata
CREATE OR REPLACE FUNCTION public.create_rag_chat_metadata(
    p_message_id integer,
    p_session_id integer,
    p_used_rag boolean,
    p_sources_used text[] DEFAULT NULL,
    p_chunks_retrieved integer DEFAULT NULL,
    p_processing_time_ms integer DEFAULT NULL,
    p_model_used text DEFAULT NULL
)
RETURNS TABLE(rag_chat_id integer, message_id integer, used_rag boolean)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    INSERT INTO rag_chat_metadata (
        message_id, 
        session_id, 
        used_rag, 
        sources_used, 
        chunks_retrieved, 
        processing_time_ms, 
        model_used
    )
    VALUES (
        p_message_id, 
        p_session_id, 
        p_used_rag, 
        p_sources_used, 
        p_chunks_retrieved, 
        p_processing_time_ms, 
        p_model_used
    )
    RETURNING 
        rag_chat_metadata.rag_chat_id::INTEGER,
        rag_chat_metadata.message_id::INTEGER,
        rag_chat_metadata.used_rag::BOOLEAN;
END;
$$;

-- Get RAG chat statistics for session
CREATE OR REPLACE FUNCTION public.get_session_rag_chat_stats(p_session_id integer)
RETURNS TABLE(
    total_messages integer,
    rag_messages integer,
    rag_usage_percentage numeric,
    avg_chunks_retrieved numeric,
    avg_processing_time_ms numeric
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*)::INTEGER,
        COUNT(CASE WHEN rcm.used_rag THEN 1 END)::INTEGER,
        ROUND(
            (COUNT(CASE WHEN rcm.used_rag THEN 1 END)::NUMERIC / NULLIF(COUNT(*), 0)) * 100, 
            2
        ),
        ROUND(AVG(rcm.chunks_retrieved), 2),
        ROUND(AVG(rcm.processing_time_ms), 2)
    FROM messages m
    LEFT JOIN rag_chat_metadata rcm ON m.message_id = rcm.message_id
    WHERE m.session_id = p_session_id;
END;
$$;