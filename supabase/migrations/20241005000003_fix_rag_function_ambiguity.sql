-- Fix ambiguous column reference in update_rag_document_status function
-- Date: 2024-10-05

-- Drop and recreate the function with explicit table prefixing
DROP FUNCTION IF EXISTS public.update_rag_document_status(integer, text, integer, text[], text);

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
        chunks_count = COALESCE(p_chunks_count, rag_documents.chunks_count),
        vector_store_ids = COALESCE(p_vector_store_ids, rag_documents.vector_store_ids),
        processing_error = CASE 
            WHEN p_processing_status = 'failed' THEN p_processing_error 
            ELSE NULL 
        END,
        processed_at = CASE 
            WHEN p_processing_status = 'completed' THEN CURRENT_TIMESTAMP 
            ELSE rag_documents.processed_at 
        END,
        updated_at = CURRENT_TIMESTAMP
    WHERE rag_documents.paper_id = p_paper_id
    RETURNING 
        rag_documents.rag_document_id::INTEGER,
        rag_documents.processing_status::TEXT,
        rag_documents.chunks_count::INTEGER,
        rag_documents.processed_at::TIMESTAMP;
END;
$$;