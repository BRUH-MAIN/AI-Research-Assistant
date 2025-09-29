// Group Chat routes - Express.js implementation using Supabase RPC
const express = require('express');
const router = express.Router();

/**
 * Helper function to execute Supabase RPC calls with error handling
 */
async function executeRPC(supabase, functionName, params = {}) {
    try {
        const { data, error } = await supabase.rpc(functionName, params);
        
        if (error) {
            console.error(`RPC Error (${functionName}):`, error);
            throw error;
        }
        
        return data;
    } catch (error) {
        throw error;
    }
}

// =====================================================
// GROUP CHAT SESSION ROUTES
// =====================================================

/**
 * GET /api/group-chat/:groupId/sessions
 * Get all chat sessions for a group
 */
router.get('/:groupId/sessions', async (req, res, next) => {
    try {
        const groupId = parseInt(req.params.groupId);
        
        if (isNaN(groupId)) {
            return res.status(400).json({
                error: 'Invalid group ID',
                code: 400
            });
        }
        
        const supabase = req.app.locals.supabase;
        const sessions = await executeRPC(supabase, 'get_group_chat_sessions', {
            p_group_id: groupId
        });
        
        res.json(sessions);
    } catch (error) {
        next(error);
    }
});

/**
 * POST /api/group-chat/:groupId/sessions
 * Create a new chat session for a group
 */
router.post('/:groupId/sessions', async (req, res, next) => {
    try {
        const groupId = parseInt(req.params.groupId);
        const { title, description, created_by } = req.body;
        
        if (isNaN(groupId)) {
            return res.status(400).json({
                error: 'Invalid group ID',
                code: 400
            });
        }
        
        if (!created_by) {
            return res.status(400).json({
                error: 'Creator user ID is required',
                code: 400
            });
        }
        
        const supabase = req.app.locals.supabase;
        const session = await executeRPC(supabase, 'create_group_chat_session', {
            p_group_id: groupId,
            p_created_by: parseInt(created_by),
            p_title: title || 'Group Chat Session',
            p_description: description || ''
        });
        
        res.status(201).json(session[0]);
    } catch (error) {
        next(error);
    }
});

/**
 * POST /api/group-chat/sessions/:sessionId/join
 * Join a group chat session
 */
router.post('/sessions/:sessionId/join', async (req, res, next) => {
    try {
        const sessionId = parseInt(req.params.sessionId);
        const { user_id } = req.body;
        
        if (isNaN(sessionId)) {
            return res.status(400).json({
                error: 'Invalid session ID',
                code: 400
            });
        }
        
        if (!user_id) {
            return res.status(400).json({
                error: 'User ID is required',
                code: 400
            });
        }
        
        const supabase = req.app.locals.supabase;
        const result = await executeRPC(supabase, 'join_group_chat_session', {
            p_session_id: sessionId,
            p_user_id: parseInt(user_id)
        });
        
        res.json({ success: result, message: 'Successfully joined session' });
    } catch (error) {
        next(error);
    }
});

// =====================================================
// GROUP CHAT MESSAGE ROUTES
// =====================================================

/**
 * GET /api/group-chat/sessions/:sessionId/messages
 * Get messages for a chat session
 */
router.get('/sessions/:sessionId/messages', async (req, res, next) => {
    try {
        const sessionId = parseInt(req.params.sessionId);
        const { limit = 50, offset = 0 } = req.query;
        
        if (isNaN(sessionId)) {
            return res.status(400).json({
                error: 'Invalid session ID',
                code: 400
            });
        }
        
        const supabase = req.app.locals.supabase;
        const messages = await executeRPC(supabase, 'get_group_chat_messages', {
            p_session_id: sessionId,
            p_limit: parseInt(limit),
            p_offset: parseInt(offset)
        });
        
        // Reverse messages to get chronological order (oldest first)
        res.json(messages.reverse());
    } catch (error) {
        next(error);
    }
});

/**
 * POST /api/group-chat/sessions/:sessionId/messages
 * Send a message to a chat session
 */
router.post('/sessions/:sessionId/messages', async (req, res, next) => {
    try {
        const sessionId = parseInt(req.params.sessionId);
        const { user_id, content, message_type = 'user', metadata = {} } = req.body;
        
        if (isNaN(sessionId)) {
            return res.status(400).json({
                error: 'Invalid session ID',
                code: 400
            });
        }
        
        if (!user_id || !content) {
            return res.status(400).json({
                error: 'User ID and content are required',
                code: 400
            });
        }
        
        const supabase = req.app.locals.supabase;
        
        // Check if user can invoke AI (if message contains AI triggers)
        const aiTriggers = ['@ai', '/ai', '@assistant'];
        const hasAiTrigger = aiTriggers.some(trigger => content.toLowerCase().includes(trigger.toLowerCase()));
        
        if (hasAiTrigger) {
            const canInvokeAI = await executeRPC(supabase, 'can_user_invoke_ai', {
                p_user_id: parseInt(user_id),
                p_session_id: sessionId
            });
            
            if (!canInvokeAI) {
                return res.status(403).json({
                    error: 'You do not have permission to invoke AI in this session',
                    code: 403
                });
            }
            
            // Add AI trigger metadata
            metadata.ai_triggered = true;
            metadata.ai_trigger_detected = aiTriggers.find(trigger => 
                content.toLowerCase().includes(trigger.toLowerCase())
            );
        }
        
        const message = await executeRPC(supabase, 'send_group_chat_message', {
            p_session_id: sessionId,
            p_user_id: parseInt(user_id),
            p_content: content,
            p_message_type: message_type,
            p_metadata: metadata
        });
        
        const messageResult = message[0];
        
        // If AI was triggered, call FastAPI to get AI response
        if (hasAiTrigger && messageResult) {
            try {
                // Make request to FastAPI for AI response
                const fastApiUrl = process.env.FASTAPI_URL || 'http://localhost:8000';
                const aiResponse = await fetch(`${fastApiUrl}/api/v1/chat/group-message`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        session_id: sessionId,
                        user_message: content,
                        user_id: parseInt(user_id),
                        trigger_message_id: messageResult.message_id
                    })
                });
                
                if (aiResponse.ok) {
                    const aiData = await aiResponse.json();
                    
                    // Send AI response as a separate message
                    await executeRPC(supabase, 'send_group_chat_message', {
                        p_session_id: sessionId,
                        p_user_id: 1, // AI user ID (adjust as needed)
                        p_content: aiData.response || 'I apologize, but I encountered an error while processing your request.',
                        p_message_type: 'ai',
                        p_metadata: {
                            ai_response: true,
                            triggered_by: messageResult.message_id,
                            model_used: aiData.model || 'unknown'
                        }
                    });
                }
            } catch (aiError) {
                console.error('Failed to get AI response:', aiError);
                // Continue without failing the original message
            }
        }
        
        res.status(201).json(messageResult);
    } catch (error) {
        next(error);
    }
});

// =====================================================
// USER PRESENCE ROUTES
// =====================================================

/**
 * GET /api/group-chat/sessions/:sessionId/online-users
 * Get online users in a chat session
 */
router.get('/sessions/:sessionId/online-users', async (req, res, next) => {
    try {
        const sessionId = parseInt(req.params.sessionId);
        
        if (isNaN(sessionId)) {
            return res.status(400).json({
                error: 'Invalid session ID',
                code: 400
            });
        }
        
        const supabase = req.app.locals.supabase;
        const onlineUsers = await executeRPC(supabase, 'get_session_online_users', {
            p_session_id: sessionId
        });
        
        res.json(onlineUsers);
    } catch (error) {
        next(error);
    }
});

/**
 * PUT /api/group-chat/sessions/:sessionId/presence
 * Update user presence in a chat session
 */
router.put('/sessions/:sessionId/presence', async (req, res, next) => {
    try {
        const sessionId = parseInt(req.params.sessionId);
        const { user_id, status = 'online' } = req.body;
        
        if (isNaN(sessionId)) {
            return res.status(400).json({
                error: 'Invalid session ID',
                code: 400
            });
        }
        
        if (!user_id) {
            return res.status(400).json({
                error: 'User ID is required',
                code: 400
            });
        }
        
        const supabase = req.app.locals.supabase;
        const result = await executeRPC(supabase, 'update_user_presence', {
            p_user_id: parseInt(user_id),
            p_session_id: sessionId,
            p_status: status
        });
        
        res.json({ success: result });
    } catch (error) {
        next(error);
    }
});

// =====================================================
// PERMISSION ROUTES
// =====================================================

/**
 * GET /api/group-chat/sessions/:sessionId/can-invoke-ai
 * Check if user can invoke AI in a session
 */
router.get('/sessions/:sessionId/can-invoke-ai', async (req, res, next) => {
    try {
        const sessionId = parseInt(req.params.sessionId);
        const { user_id } = req.query;
        
        if (isNaN(sessionId)) {
            return res.status(400).json({
                error: 'Invalid session ID',
                code: 400
            });
        }
        
        if (!user_id) {
            return res.status(400).json({
                error: 'User ID is required',
                code: 400
            });
        }
        
        const supabase = req.app.locals.supabase;
        const canInvoke = await executeRPC(supabase, 'can_user_invoke_ai', {
            p_user_id: parseInt(user_id),
            p_session_id: sessionId
        });
        
        res.json({ can_invoke_ai: canInvoke });
    } catch (error) {
        next(error);
    }
});

module.exports = router;
