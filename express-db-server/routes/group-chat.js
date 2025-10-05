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
        const generalAiTriggers = ['@ai', '/ai', '@assistant'];
        const paperAiTriggers = ['@paper', '/paper'];
        const allAiTriggers = [...generalAiTriggers, ...paperAiTriggers];
        
        const hasGeneralAiTrigger = generalAiTriggers.some(trigger => content.toLowerCase().includes(trigger.toLowerCase()));
        const hasPaperAiTrigger = paperAiTriggers.some(trigger => content.toLowerCase().includes(trigger.toLowerCase()));
        const hasAnyAiTrigger = hasGeneralAiTrigger || hasPaperAiTrigger;
        
        if (hasAnyAiTrigger) {
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
            metadata.ai_trigger_detected = allAiTriggers.find(trigger => 
                content.toLowerCase().includes(trigger.toLowerCase())
            );
            metadata.ai_trigger_type = hasPaperAiTrigger ? 'paper' : 'general';
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
        if (hasAnyAiTrigger && messageResult) {
            try {
                // Make request to FastAPI for AI response
                const fastApiUrl = process.env.FASTAPI_URL || 'http://fastapi-ai-server:8000';
                
                let aiEndpoint;
                let requestBody;
                
                if (hasPaperAiTrigger) {
                    // Use session-scoped RAG endpoint for @paper triggers
                    aiEndpoint = `${fastApiUrl}/api/v1/session-rag/${sessionId}/ask`;
                    requestBody = {
                        question: content.replace(/@paper|\/paper/gi, '').trim(),
                        max_chunks: 5,
                        search_type: "hybrid"
                    };
                } else {
                    // Use general AI endpoint for @ai triggers
                    aiEndpoint = `${fastApiUrl}/api/v1/chat/group-message`;
                    requestBody = {
                        session_id: sessionId,
                        user_message: content,
                        user_id: parseInt(user_id),
                        trigger_message_id: messageResult.message_id
                    };
                }
                
                const aiResponse = await fetch(aiEndpoint, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(requestBody)
                });
                
                if (aiResponse.ok) {
                    const aiData = await aiResponse.json();
                    
                    let responseContent, usedRag = false, sourcesUsed = [], chunksRetrieved = 0;
                    
                    if (hasPaperAiTrigger) {
                        // Handle session-scoped RAG response structure
                        responseContent = aiData.answer || 'I apologize, but I encountered an error while processing your request.';
                        usedRag = true;
                        sourcesUsed = aiData.sources ? aiData.sources.map(s => s.source || s.metadata?.source || '') : [];
                        chunksRetrieved = aiData.sources ? aiData.sources.length : 0;
                        
                        // Add sources to response if available
                        if (aiData.sources && aiData.sources.length > 0) {
                            responseContent += "\n\n**Sources:**\n";
                            for (let i = 0; i < Math.min(aiData.sources.length, 3); i++) {
                                const source = aiData.sources[i];
                                const sourceName = source.source || source.metadata?.source || 'Unknown';
                                responseContent += `${i + 1}. ${sourceName}`;
                                if (source.page || source.metadata?.page) {
                                    responseContent += ` (Page ${source.page || source.metadata.page})`;
                                }
                                responseContent += "\n";
                            }
                        }
                    } else {
                        // Handle general AI response structure
                        responseContent = aiData.response || 'I apologize, but I encountered an error while processing your request.';
                        usedRag = aiData.metadata?.used_rag || false;
                        sourcesUsed = aiData.metadata?.sources_used || [];
                        chunksRetrieved = aiData.metadata?.chunks_retrieved || 0;
                    }
                    
                    // Send AI response as a separate message
                    await executeRPC(supabase, 'send_group_chat_message', {
                        p_session_id: sessionId,
                        p_user_id: parseInt(user_id), // Use the original user who triggered AI
                        p_content: responseContent,
                        p_message_type: 'ai',
                        p_metadata: {
                            ai_response: true,
                            triggered_by: messageResult.message_id,
                            model_used: aiData.model || (hasPaperAiTrigger ? 'session-scoped-rag' : 'groq-general'),
                            original_user_id: parseInt(user_id),
                            ai_generated: true,
                            ai_trigger_type: hasPaperAiTrigger ? 'paper' : 'general',
                            used_rag: usedRag,
                            sources_used: sourcesUsed,
                            chunks_retrieved: chunksRetrieved,
                            session_scoped: hasPaperAiTrigger
                        }
                    });
                    
                    // Record RAG chat metadata if using paper trigger
                    if (hasPaperAiTrigger && usedRag) {
                        try {
                            const ragMetadataEndpoint = `${fastApiUrl}/api/v1/rag/chat/metadata`;
                            await fetch(ragMetadataEndpoint, {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json',
                                },
                                body: JSON.stringify({
                                    message_id: messageResult.message_id,
                                    session_id: sessionId,
                                    used_rag: true,
                                    sources_used: sourcesUsed,
                                    chunks_retrieved: chunksRetrieved,
                                    processing_time_ms: aiData.metadata?.processing_time_ms || 0,
                                    model_used: 'session-scoped-rag'
                                })
                            });
                        } catch (metadataError) {
                            console.error('Failed to record RAG metadata:', metadataError);
                        }
                    }
                } else {
                    console.error('FastAPI responded with error:', aiResponse.status, await aiResponse.text());
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
