-- =====================================================
-- RAG INTEGRATION SCHEMA
-- Date: 2024-10-05
-- Description: Add tables to support RAG metadata and session-paper-RAG associations
-- =====================================================

-- =====================================================
-- RAG DOCUMENTS TABLE - Track RAG processing status for papers
-- =====================================================
CREATE TABLE rag_documents (
    rag_document_id SERIAL PRIMARY KEY,
    paper_id INT NOT NULL REFERENCES papers(paper_id) ON DELETE CASCADE,
    file_name TEXT NOT NULL, -- Original filename
    file_path TEXT NOT NULL, -- Path in FastAPI input directory
    processing_status VARCHAR(50) DEFAULT 'pending',
    chunks_count INTEGER DEFAULT 0,
    vector_store_ids TEXT[], -- Array of vector IDs in Pinecone
    processing_error TEXT,
    processed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(paper_id),
    CONSTRAINT processing_status_constraint CHECK (processing_status IN ('pending', 'processing', 'completed', 'failed'))
);

-- Create indexes for rag_documents table
CREATE INDEX IF NOT EXISTS idx_rag_documents_paper_id ON rag_documents(paper_id);
CREATE INDEX IF NOT EXISTS idx_rag_documents_status ON rag_documents(processing_status);
CREATE INDEX IF NOT EXISTS idx_rag_documents_file_name ON rag_documents(file_name);

-- =====================================================
-- SESSION RAG STATUS TABLE - Track RAG enablement per session
-- =====================================================
CREATE TABLE session_rag_status (
    session_rag_id SERIAL PRIMARY KEY,
    session_id INT NOT NULL REFERENCES sessions(session_id) ON DELETE CASCADE,
    is_rag_enabled BOOLEAN DEFAULT false,
    rag_enabled_at TIMESTAMP,
    enabled_by INT REFERENCES users(user_id),
    rag_disabled_at TIMESTAMP,
    total_papers INTEGER DEFAULT 0,
    processed_papers INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(session_id)
);

-- Create indexes for session_rag_status table
CREATE INDEX IF NOT EXISTS idx_session_rag_status_session_id ON session_rag_status(session_id);
CREATE INDEX IF NOT EXISTS idx_session_rag_status_enabled ON session_rag_status(is_rag_enabled);

-- =====================================================
-- RAG CHAT METADATA TABLE - Track RAG-enhanced messages
-- =====================================================
CREATE TABLE rag_chat_metadata (
    rag_chat_id SERIAL PRIMARY KEY,
    message_id INT NOT NULL REFERENCES messages(message_id) ON DELETE CASCADE,
    session_id INT NOT NULL REFERENCES sessions(session_id) ON DELETE CASCADE,
    used_rag BOOLEAN DEFAULT false,
    sources_used TEXT[], -- Array of paper titles/files used
    chunks_retrieved INTEGER DEFAULT 0,
    processing_time_ms INTEGER,
    model_used TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(message_id)
);

-- Create indexes for rag_chat_metadata table
CREATE INDEX IF NOT EXISTS idx_rag_chat_metadata_message_id ON rag_chat_metadata(message_id);
CREATE INDEX IF NOT EXISTS idx_rag_chat_metadata_session_id ON rag_chat_metadata(session_id);
CREATE INDEX IF NOT EXISTS idx_rag_chat_metadata_used_rag ON rag_chat_metadata(used_rag);

-- =====================================================
-- RAG METADATA FUNCTIONS
-- =====================================================

-- Get session RAG status
CREATE OR REPLACE FUNCTION public.get_session_rag_status(p_session_id integer)
RETURNS TABLE(
    session_rag_id integer,
    session_id integer,
    is_rag_enabled boolean,
    rag_enabled_at timestamp,
    enabled_by integer,
    rag_disabled_at timestamp,
    total_papers integer,
    processed_papers integer,
    created_at timestamp,
    updated_at timestamp
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
    RETURN QUERY
    SELECT 
        srs.session_rag_id,
        srs.session_id,
        srs.is_rag_enabled,
        srs.rag_enabled_at,
        srs.enabled_by,
        srs.rag_disabled_at,
        srs.total_papers,
        srs.processed_papers,
        srs.created_at,
        srs.updated_at
    FROM session_rag_status srs
    WHERE srs.session_id = p_session_id;
END;
$function$;

-- Enable RAG for session
CREATE OR REPLACE FUNCTION public.enable_session_rag(p_session_id integer, p_enabled_by integer)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
    v_result record;
BEGIN
    -- Check if session exists
    IF NOT EXISTS (SELECT 1 FROM sessions WHERE session_id = p_session_id) THEN
        RAISE EXCEPTION 'Session with ID % not found', p_session_id USING ERRCODE = 'P0002';
    END IF;
    
    -- Upsert session RAG status
    INSERT INTO session_rag_status (session_id, is_rag_enabled, rag_enabled_at, enabled_by, total_papers, processed_papers)
    VALUES (p_session_id, true, CURRENT_TIMESTAMP, p_enabled_by, 
            (SELECT COUNT(*) FROM session_papers WHERE session_id = p_session_id),
            (SELECT COUNT(*) FROM rag_documents rd 
             JOIN session_papers sp ON rd.paper_id = sp.paper_id 
             WHERE sp.session_id = p_session_id AND rd.processing_status = 'completed'))
    ON CONFLICT (session_id) 
    DO UPDATE SET 
        is_rag_enabled = true,
        rag_enabled_at = CURRENT_TIMESTAMP,
        enabled_by = p_enabled_by,
        rag_disabled_at = NULL,
        total_papers = (SELECT COUNT(*) FROM session_papers WHERE session_id = p_session_id),
        processed_papers = (SELECT COUNT(*) FROM rag_documents rd 
                           JOIN session_papers sp ON rd.paper_id = sp.paper_id 
                           WHERE sp.session_id = p_session_id AND rd.processing_status = 'completed'),
        updated_at = CURRENT_TIMESTAMP
    RETURNING * INTO v_result;
    
    RETURN json_build_object(
        'session_rag_id', v_result.session_rag_id,
        'session_id', v_result.session_id,
        'is_rag_enabled', v_result.is_rag_enabled,
        'rag_enabled_at', v_result.rag_enabled_at,
        'enabled_by', v_result.enabled_by,
        'total_papers', v_result.total_papers,
        'processed_papers', v_result.processed_papers
    );
END;
$function$;

-- Disable RAG for session
CREATE OR REPLACE FUNCTION public.disable_session_rag(p_session_id integer)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
    v_result record;
BEGIN
    -- Check if session exists
    IF NOT EXISTS (SELECT 1 FROM sessions WHERE session_id = p_session_id) THEN
        RAISE EXCEPTION 'Session with ID % not found', p_session_id USING ERRCODE = 'P0002';
    END IF;
    
    -- Update session RAG status
    UPDATE session_rag_status 
    SET is_rag_enabled = false,
        rag_disabled_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
    WHERE session_id = p_session_id
    RETURNING * INTO v_result;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Session RAG status not found for session %', p_session_id USING ERRCODE = 'P0002';
    END IF;
    
    RETURN json_build_object(
        'session_rag_id', v_result.session_rag_id,
        'session_id', v_result.session_id,
        'is_rag_enabled', v_result.is_rag_enabled,
        'rag_disabled_at', v_result.rag_disabled_at,
        'total_papers', v_result.total_papers,
        'processed_papers', v_result.processed_papers
    );
END;
$function$;

-- Get RAG document by paper ID
CREATE OR REPLACE FUNCTION public.get_rag_document_by_paper_id(p_paper_id integer)
RETURNS TABLE(
    rag_document_id integer,
    paper_id integer,
    file_name text,
    file_path text,
    processing_status varchar(50),
    chunks_count integer,
    vector_store_ids text[],
    processing_error text,
    processed_at timestamp,
    created_at timestamp,
    updated_at timestamp
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
    RETURN QUERY
    SELECT 
        rd.rag_document_id,
        rd.paper_id,
        rd.file_name,
        rd.file_path,
        rd.processing_status,
        rd.chunks_count,
        rd.vector_store_ids,
        rd.processing_error,
        rd.processed_at,
        rd.created_at,
        rd.updated_at
    FROM rag_documents rd
    WHERE rd.paper_id = p_paper_id;
END;
$function$;

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
    rag_status varchar(50),
    rag_file_name text,
    chunks_count integer,
    processed_at timestamp
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
    RETURN QUERY
    SELECT 
        p.paper_id,
        p.title,
        p.abstract,
        p.authors,
        p.doi,
        sp.added_at,
        CASE WHEN rd.rag_document_id IS NOT NULL THEN true ELSE false END as has_rag,
        COALESCE(rd.processing_status, 'not_processed'::varchar(50)) as rag_status,
        rd.file_name as rag_file_name,
        rd.chunks_count,
        rd.processed_at
    FROM session_papers sp
    JOIN papers p ON sp.paper_id = p.paper_id
    LEFT JOIN rag_documents rd ON p.paper_id = rd.paper_id
    WHERE sp.session_id = p_session_id
    ORDER BY sp.added_at DESC;
END;
$function$;

-- Create RAG document entry
CREATE OR REPLACE FUNCTION public.create_rag_document(
    p_paper_id integer,
    p_file_name text,
    p_file_path text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
    v_result record;
BEGIN
    -- Check if paper exists
    IF NOT EXISTS (SELECT 1 FROM papers WHERE paper_id = p_paper_id) THEN
        RAISE EXCEPTION 'Paper with ID % not found', p_paper_id USING ERRCODE = 'P0002';
    END IF;
    
    -- Insert RAG document entry
    INSERT INTO rag_documents (paper_id, file_name, file_path, processing_status, chunks_count)
    VALUES (p_paper_id, p_file_name, p_file_path, 'pending', 0)
    ON CONFLICT (paper_id) 
    DO UPDATE SET 
        file_name = p_file_name,
        file_path = p_file_path,
        processing_status = 'pending',
        updated_at = CURRENT_TIMESTAMP
    RETURNING * INTO v_result;
    
    RETURN json_build_object(
        'rag_document_id', v_result.rag_document_id,
        'paper_id', v_result.paper_id,
        'file_name', v_result.file_name,
        'file_path', v_result.file_path,
        'processing_status', v_result.processing_status,
        'chunks_count', v_result.chunks_count,
        'created_at', v_result.created_at
    );
END;
$function$;

-- Update RAG document status
CREATE OR REPLACE FUNCTION public.update_rag_document_status(
    p_paper_id integer,
    p_processing_status varchar(50) DEFAULT NULL,
    p_chunks_count integer DEFAULT NULL,
    p_vector_store_ids text[] DEFAULT NULL,
    p_processing_error text DEFAULT NULL,
    p_file_name text DEFAULT NULL,
    p_file_path text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
    v_result record;
    v_processed_at timestamp;
BEGIN
    -- Set processed_at if status is completed
    IF p_processing_status = 'completed' THEN
        v_processed_at := CURRENT_TIMESTAMP;
    END IF;
    
    -- Update RAG document
    UPDATE rag_documents 
    SET processing_status = COALESCE(p_processing_status, processing_status),
        chunks_count = COALESCE(p_chunks_count, chunks_count),
        vector_store_ids = COALESCE(p_vector_store_ids, vector_store_ids),
        processing_error = COALESCE(p_processing_error, processing_error),
        file_name = COALESCE(p_file_name, file_name),
        file_path = COALESCE(p_file_path, file_path),
        processed_at = COALESCE(v_processed_at, processed_at),
        updated_at = CURRENT_TIMESTAMP
    WHERE paper_id = p_paper_id
    RETURNING * INTO v_result;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'RAG document not found for paper %', p_paper_id USING ERRCODE = 'P0002';
    END IF;
    
    RETURN json_build_object(
        'rag_document_id', v_result.rag_document_id,
        'paper_id', v_result.paper_id,
        'file_name', v_result.file_name,
        'file_path', v_result.file_path,
        'processing_status', v_result.processing_status,
        'chunks_count', v_result.chunks_count,
        'vector_store_ids', v_result.vector_store_ids,
        'processing_error', v_result.processing_error,
        'processed_at', v_result.processed_at,
        'updated_at', v_result.updated_at
    );
END;
$function$;

-- Create RAG chat metadata
CREATE OR REPLACE FUNCTION public.create_rag_chat_metadata(
    p_message_id integer,
    p_session_id integer,
    p_used_rag boolean,
    p_sources_used text[] DEFAULT NULL,
    p_chunks_retrieved integer DEFAULT NULL,
    p_processing_time_ms integer DEFAULT NULL,
    p_model_used text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
    v_result record;
BEGIN
    -- Insert RAG chat metadata
    INSERT INTO rag_chat_metadata (
        message_id, session_id, used_rag, sources_used, 
        chunks_retrieved, processing_time_ms, model_used
    )
    VALUES (
        p_message_id, p_session_id, p_used_rag, p_sources_used,
        p_chunks_retrieved, p_processing_time_ms, p_model_used
    )
    ON CONFLICT (message_id) 
    DO UPDATE SET 
        used_rag = p_used_rag,
        sources_used = p_sources_used,
        chunks_retrieved = p_chunks_retrieved,
        processing_time_ms = p_processing_time_ms,
        model_used = p_model_used
    RETURNING * INTO v_result;
    
    RETURN json_build_object(
        'rag_chat_id', v_result.rag_chat_id,
        'message_id', v_result.message_id,
        'session_id', v_result.session_id,
        'used_rag', v_result.used_rag,
        'sources_used', v_result.sources_used,
        'chunks_retrieved', v_result.chunks_retrieved,
        'processing_time_ms', v_result.processing_time_ms,
        'model_used', v_result.model_used,
        'created_at', v_result.created_at
    );
END;
$function$;

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
SECURITY DEFINER
AS $function$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*)::integer as total_messages,
        COUNT(CASE WHEN rcm.used_rag THEN 1 END)::integer as rag_messages,
        CASE 
            WHEN COUNT(*) > 0 THEN 
                ROUND((COUNT(CASE WHEN rcm.used_rag THEN 1 END)::numeric / COUNT(*)::numeric) * 100, 2)
            ELSE 0::numeric
        END as rag_usage_percentage,
        ROUND(AVG(CASE WHEN rcm.used_rag THEN rcm.chunks_retrieved END), 2) as avg_chunks_retrieved,
        ROUND(AVG(CASE WHEN rcm.used_rag THEN rcm.processing_time_ms END), 2) as avg_processing_time_ms
    FROM rag_chat_metadata rcm
    WHERE rcm.session_id = p_session_id;
END;
$function$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.get_session_rag_status(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_session_rag_status(integer) TO anon;
GRANT EXECUTE ON FUNCTION public.enable_session_rag(integer, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.disable_session_rag(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_rag_document_by_paper_id(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_rag_document_by_paper_id(integer) TO anon;
GRANT EXECUTE ON FUNCTION public.get_session_papers_with_rag_status(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_session_papers_with_rag_status(integer) TO anon;
GRANT EXECUTE ON FUNCTION public.create_rag_document(integer, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_rag_document_status(integer, varchar, integer, text[], text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_rag_chat_metadata(integer, integer, boolean, text[], integer, integer, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_session_rag_chat_stats(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_session_rag_chat_stats(integer) TO anon;