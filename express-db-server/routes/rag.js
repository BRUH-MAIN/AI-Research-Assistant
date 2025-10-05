// RAG routes - Express.js implementation for RAG metadata management
const express = require('express');
const router = express.Router();

/**
 * Helper function to execute Supabase RPC calls with error handling
 */
async function executeRPC(supabase, functionName, params = {}, res) {
    try {
        const { data, error } = await supabase.rpc(functionName, params);
        
        if (error) {
            console.error(`RPC Error (${functionName}):`, error);
            throw error;
        }
        
        return data;
    } catch (error) {
        // Re-throw to be caught by route handler
        throw error;
    }
}

// =====================================================
// RAG DOCUMENTS ROUTES
// =====================================================

/**
 * POST /api/rag/documents
 * Create RAG document entry (when paper is uploaded to FastAPI)
 */
router.post('/documents', async (req, res, next) => {
    try {
        const { paper_id, file_name, file_path } = req.body;
        
        if (!paper_id || !file_name || !file_path) {
            return res.status(400).json({
                error: 'paper_id, file_name, and file_path are required',
                code: 400
            });
        }
        
        const supabase = req.app.locals.supabase;
        const ragDocument = await executeRPC(supabase, 'create_rag_document', {
            p_paper_id: parseInt(paper_id),
            p_file_name: file_name,
            p_file_path: file_path
        });
        
        res.status(201).json(ragDocument[0]);
    } catch (error) {
        next(error);
    }
});

/**
 * PUT /api/rag/documents/:paperId/status
 * Update RAG document processing status
 */
router.put('/documents/:paperId/status', async (req, res, next) => {
    try {
        const paperId = parseInt(req.params.paperId);
        const { 
            processing_status, 
            chunks_count, 
            vector_store_ids, 
            processing_error 
        } = req.body;
        
        if (isNaN(paperId)) {
            return res.status(400).json({
                error: 'Invalid paper ID',
                code: 400
            });
        }
        
        if (!processing_status) {
            return res.status(400).json({
                error: 'processing_status is required',
                code: 400
            });
        }
        
        const supabase = req.app.locals.supabase;
        const ragDocument = await executeRPC(supabase, 'update_rag_document_status', {
            p_paper_id: paperId,
            p_processing_status: processing_status,
            p_chunks_count: chunks_count || null,
            p_vector_store_ids: vector_store_ids || null,
            p_processing_error: processing_error || null
        });
        
        if (!ragDocument || ragDocument.length === 0) {
            return res.status(404).json({
                error: 'RAG document not found for this paper',
                code: 404
            });
        }
        
        res.json(ragDocument[0]);
    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/rag/documents/:paperId
 * Get RAG document by paper ID
 */
router.get('/documents/:paperId', async (req, res, next) => {
    try {
        const paperId = parseInt(req.params.paperId);
        
        if (isNaN(paperId)) {
            return res.status(400).json({
                error: 'Invalid paper ID',
                code: 400
            });
        }
        
        const supabase = req.app.locals.supabase;
        const ragDocument = await executeRPC(supabase, 'get_rag_document_by_paper_id', {
            p_paper_id: paperId
        });
        
        if (!ragDocument || ragDocument.length === 0) {
            return res.status(404).json({
                error: 'RAG document not found for this paper',
                code: 404
            });
        }
        
        res.json(ragDocument[0]);
    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/rag/documents
 * Get all RAG documents with paper info
 */
router.get('/documents', async (req, res, next) => {
    try {
        const supabase = req.app.locals.supabase;
        const ragDocuments = await executeRPC(supabase, 'get_all_rag_documents');
        
        res.json(ragDocuments);
    } catch (error) {
        next(error);
    }
});

// =====================================================
// SESSION RAG STATUS ROUTES
// =====================================================

/**
 * POST /api/rag/sessions/:sessionId/enable
 * Enable RAG for a session
 */
router.post('/sessions/:sessionId/enable', async (req, res, next) => {
    try {
        const sessionId = parseInt(req.params.sessionId);
        const { enabled_by } = req.body;
        
        if (isNaN(sessionId)) {
            return res.status(400).json({
                error: 'Invalid session ID',
                code: 400
            });
        }
        
        if (!enabled_by) {
            return res.status(400).json({
                error: 'enabled_by user ID is required',
                code: 400
            });
        }
        
        const supabase = req.app.locals.supabase;
        const sessionRag = await executeRPC(supabase, 'enable_session_rag', {
            p_session_id: sessionId,
            p_enabled_by: parseInt(enabled_by)
        });
        
        res.status(201).json(sessionRag);
    } catch (error) {
        next(error);
    }
});

/**
 * POST /api/rag/sessions/:sessionId/disable
 * Disable RAG for a session
 */
router.post('/sessions/:sessionId/disable', async (req, res, next) => {
    try {
        const sessionId = parseInt(req.params.sessionId);
        
        if (isNaN(sessionId)) {
            return res.status(400).json({
                error: 'Invalid session ID',
                code: 400
            });
        }
        
        const supabase = req.app.locals.supabase;
        const sessionRag = await executeRPC(supabase, 'disable_session_rag', {
            p_session_id: sessionId
        });
        
        if (!sessionRag) {
            return res.status(404).json({
                error: 'Session RAG status not found',
                code: 404
            });
        }
        
        res.json(sessionRag);
    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/rag/sessions/:sessionId/status
 * Get RAG status for a session
 */
router.get('/sessions/:sessionId/status', async (req, res, next) => {
    try {
        const sessionId = parseInt(req.params.sessionId);
        
        if (isNaN(sessionId)) {
            return res.status(400).json({
                error: 'Invalid session ID',
                code: 400
            });
        }
        
        const supabase = req.app.locals.supabase;
        const sessionRag = await executeRPC(supabase, 'get_session_rag_status', {
            p_session_id: sessionId
        });
        
        // If no RAG status exists, return default values
        if (!sessionRag || sessionRag.length === 0) {
            return res.json({
                session_rag_id: null,
                session_id: sessionId,
                is_rag_enabled: false,
                total_papers: 0,
                processed_papers: 0,
                rag_enabled_at: null,
                enabled_by: null,
                enabled_by_name: null
            });
        }
        
        res.json(sessionRag[0]);
    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/rag/sessions/:sessionId/papers
 * Get session papers with their RAG processing status
 */
router.get('/sessions/:sessionId/papers', async (req, res, next) => {
    try {
        const sessionId = parseInt(req.params.sessionId);
        
        if (isNaN(sessionId)) {
            return res.status(400).json({
                error: 'Invalid session ID',
                code: 400
            });
        }
        
        const supabase = req.app.locals.supabase;
        const papers = await executeRPC(supabase, 'get_session_papers_with_rag_status', {
            p_session_id: sessionId
        });
        
        res.json(papers);
    } catch (error) {
        next(error);
    }
});

// =====================================================
// RAG CHAT METADATA ROUTES
// =====================================================

/**
 * POST /api/rag/chat/metadata
 * Record RAG chat metadata for a message
 */
router.post('/chat/metadata', async (req, res, next) => {
    try {
        const { 
            message_id, 
            session_id, 
            used_rag, 
            sources_used, 
            chunks_retrieved, 
            processing_time_ms, 
            model_used 
        } = req.body;
        
        if (!message_id || !session_id || used_rag === undefined) {
            return res.status(400).json({
                error: 'message_id, session_id, and used_rag are required',
                code: 400
            });
        }
        
        const supabase = req.app.locals.supabase;
        const ragChatMetadata = await executeRPC(supabase, 'create_rag_chat_metadata', {
            p_message_id: parseInt(message_id),
            p_session_id: parseInt(session_id),
            p_used_rag: used_rag,
            p_sources_used: sources_used || null,
            p_chunks_retrieved: chunks_retrieved || null,
            p_processing_time_ms: processing_time_ms || null,
            p_model_used: model_used || null
        });
        
        res.status(201).json(ragChatMetadata[0]);
    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/rag/sessions/:sessionId/chat-stats
 * Get RAG chat statistics for a session
 */
router.get('/sessions/:sessionId/chat-stats', async (req, res, next) => {
    try {
        const sessionId = parseInt(req.params.sessionId);
        
        if (isNaN(sessionId)) {
            return res.status(400).json({
                error: 'Invalid session ID',
                code: 400
            });
        }
        
        const supabase = req.app.locals.supabase;
        const stats = await executeRPC(supabase, 'get_session_rag_chat_stats', {
            p_session_id: sessionId
        });
        
        res.json(stats[0] || {
            total_messages: 0,
            rag_messages: 0,
            rag_usage_percentage: 0,
            avg_chunks_retrieved: 0,
            avg_processing_time_ms: 0
        });
    } catch (error) {
        next(error);
    }
});

module.exports = router;