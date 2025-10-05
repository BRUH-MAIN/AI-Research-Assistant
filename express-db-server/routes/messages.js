// Message routes - Express.js implementation using Supabase RPC
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
// MESSAGE ROUTES
// =====================================================

/**
 * GET /api/messages
 * Get all messages (with optional filtering)
 */
router.get('/', async (req, res, next) => {
    try {
        const { session_id, user_id, limit, offset } = req.query;
        const supabase = req.app.locals.supabase;
        
        // If session_id is provided, get messages for that session
        if (session_id) {
            const messages = await executeRPC(supabase, 'get_session_messages', {
                p_session_id: parseInt(session_id)
            });
            return res.json(messages);
        }
        
        // Otherwise get all messages (with pagination)
        const messages = await executeRPC(supabase, 'get_all_messages', {
            p_limit: limit ? parseInt(limit) : 100,
            p_offset: offset ? parseInt(offset) : 0
        });
        
        res.json(messages);
    } catch (error) {
        next(error);
    }
});

/**
 * POST /api/messages
 * Create a new message
 */
router.post('/', async (req, res, next) => {
    try {
        const { session_id, user_id, message_type, content, metadata } = req.body;
        
        if (!session_id || !user_id || !message_type || !content) {
            return res.status(400).json({
                error: 'session_id, user_id, message_type, and content are required',
                code: 400
            });
        }
        
        const supabase = req.app.locals.supabase;
        const message = await executeRPC(supabase, 'create_message', {
            p_session_id: parseInt(session_id),
            p_user_id: parseInt(user_id),
            p_message_type: message_type,
            p_content: content,
            p_metadata: metadata || null
        });
        
        res.status(201).json(message[0]);
    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/messages/:id
 * Get a specific message by ID
 */
router.get('/:id', async (req, res, next) => {
    try {
        const messageId = parseInt(req.params.id);
        
        if (isNaN(messageId)) {
            return res.status(400).json({
                error: 'Invalid message ID',
                code: 400
            });
        }
        
        const supabase = req.app.locals.supabase;
        const message = await executeRPC(supabase, 'get_message_by_id', {
            p_message_id: messageId
        });
        
        if (!message || message.length === 0) {
            return res.status(404).json({
                error: 'Message not found',
                code: 404
            });
        }
        
        res.json(message[0]);
    } catch (error) {
        next(error);
    }
});

/**
 * PUT /api/messages/:id
 * Update a specific message
 */
router.put('/:id', async (req, res, next) => {
    try {
        const messageId = parseInt(req.params.id);
        const { content, metadata } = req.body;
        
        if (isNaN(messageId)) {
            return res.status(400).json({
                error: 'Invalid message ID',
                code: 400
            });
        }
        
        const supabase = req.app.locals.supabase;
        const message = await executeRPC(supabase, 'update_message', {
            p_message_id: messageId,
            p_content: content || null,
            p_metadata: metadata || null
        });
        
        res.json(message[0]);
    } catch (error) {
        next(error);
    }
});

/**
 * DELETE /api/messages/:id
 * Delete a specific message
 */
router.delete('/:id', async (req, res, next) => {
    try {
        const messageId = parseInt(req.params.id);
        
        if (isNaN(messageId)) {
            return res.status(400).json({
                error: 'Invalid message ID',
                code: 400
            });
        }
        
        const supabase = req.app.locals.supabase;
        await executeRPC(supabase, 'delete_message', {
            p_message_id: messageId
        });
        
        res.status(204).send();
    } catch (error) {
        next(error);
    }
});

module.exports = router;