
-- Enable RAG for all existing sessions
-- This script will enable RAG for all sessions in the database

DO $$
DECLARE
    session_record RECORD;
    enabled_count INTEGER := 0;
BEGIN
    -- Loop through all sessions
    FOR session_record IN 
        SELECT session_id FROM sessions 
        ORDER BY session_id
    LOOP
        -- Enable RAG for each session
        INSERT INTO session_rag_status (session_id, is_rag_enabled, rag_enabled_at, enabled_by)
        VALUES (session_record.session_id, true, CURRENT_TIMESTAMP, 1)
        ON CONFLICT (session_id) 
        DO UPDATE SET 
            is_rag_enabled = true,
            rag_enabled_at = CURRENT_TIMESTAMP,
            enabled_by = 1
        WHERE session_rag_status.is_rag_enabled = false;
        
        enabled_count := enabled_count + 1;
        RAISE NOTICE 'Enabled RAG for session %', session_record.session_id;
    END LOOP;
    
    RAISE NOTICE 'RAG enabled for % sessions total', enabled_count;
END $$;

-- Verify the results
SELECT 
    s.session_id,
    s.title,
    COALESCE(srs.is_rag_enabled, false) as rag_enabled,
    srs.rag_enabled_at,
    srs.enabled_by
FROM sessions s
LEFT JOIN session_rag_status srs ON s.session_id = srs.session_id
ORDER BY s.session_id;
