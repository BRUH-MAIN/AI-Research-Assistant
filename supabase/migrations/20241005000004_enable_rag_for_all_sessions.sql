-- Enable RAG for all existing sessions
-- Date: 2024-10-05

-- Get all session IDs and enable RAG for each one
DO $$
DECLARE
    session_record RECORD;
    system_user_id INTEGER := 1; -- System user ID for auto-enablement
BEGIN
    -- Loop through all sessions that don't have RAG enabled
    FOR session_record IN 
        SELECT s.session_id, s.created_by
        FROM sessions s
        LEFT JOIN session_rag_status srs ON s.session_id = srs.session_id
        WHERE srs.session_rag_id IS NULL OR srs.is_rag_enabled = false
    LOOP
        -- Enable RAG for this session
        INSERT INTO session_rag_status (session_id, is_rag_enabled, rag_enabled_at, enabled_by, created_at, updated_at)
        VALUES (
            session_record.session_id, 
            true, 
            CURRENT_TIMESTAMP, 
            COALESCE(session_record.created_by, system_user_id),
            CURRENT_TIMESTAMP,
            CURRENT_TIMESTAMP
        )
        ON CONFLICT (session_id) 
        DO UPDATE SET 
            is_rag_enabled = true,
            rag_enabled_at = CURRENT_TIMESTAMP,
            enabled_by = COALESCE(session_record.created_by, system_user_id),
            updated_at = CURRENT_TIMESTAMP;
            
        RAISE NOTICE 'RAG enabled for session %', session_record.session_id;
    END LOOP;
    
    RAISE NOTICE 'RAG enablement complete for all sessions';
END $$;