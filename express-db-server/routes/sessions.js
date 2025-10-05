// Session routes - Express.js implementation using Supabase RPC
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
// SESSION ROUTES
// =====================================================

/**
 * GET /api/sessions
 * Get all sessions with optional filtering
 */
router.get('/', async (req, res, next) => {
    try {
        const { user_id, is_active } = req.query;
        
        const supabase = req.app.locals.supabase;
        const sessions = await executeRPC(supabase, 'get_all_sessions', {
            p_user_id: user_id ? parseInt(user_id) : null,
            p_is_active: is_active !== undefined ? is_active === 'true' : null
        });
        
        res.json(sessions);
    } catch (error) {
        next(error);
    }
});

/**
 * POST /api/sessions
 * Create a new session
 */
router.post('/', async (req, res, next) => {
    try {
        const { title, user_id, created_by, group_id } = req.body;
        
        // Accept either user_id or created_by for backwards compatibility
        const userId = user_id || created_by;
        
        if (!userId) {
            return res.status(400).json({
                error: 'user_id or created_by is required',
                code: 400
            });
        }
        
        const supabase = req.app.locals.supabase;
        
        // Generate default title if not provided
        const finalTitle = title || `Session ${new Date().toISOString().replace(/[:.]/g, '_')}`;
        
        const session = await executeRPC(supabase, 'create_session', {
            p_title: finalTitle,
            p_user_id: parseInt(userId),
            p_group_id: group_id ? parseInt(group_id) : 1
        });
        
        // Automatically enable RAG for the new session
        try {
            await executeRPC(supabase, 'enable_session_rag', {
                p_session_id: session[0].session_id,
                p_enabled_by: parseInt(userId)
            });
            console.log(`RAG automatically enabled for new session ${session[0].session_id}`);
        } catch (ragError) {
            console.error('Failed to auto-enable RAG for new session:', ragError);
            // Don't fail session creation if RAG enablement fails
        }
        
        res.status(201).json(session[0]);
    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/sessions/:id
 * Get a specific session by ID
 */
router.get('/:id', async (req, res, next) => {
    try {
        const sessionId = parseInt(req.params.id);
        
        if (isNaN(sessionId)) {
            return res.status(400).json({
                error: 'Invalid session ID',
                code: 400
            });
        }
        
        const supabase = req.app.locals.supabase;
        const session = await executeRPC(supabase, 'get_session_by_id', {
            p_session_id: sessionId
        });
        
        if (!session || session.length === 0) {
            return res.status(404).json({
                error: 'Session not found',
                code: 404
            });
        }
        
        res.json(session[0]);
    } catch (error) {
        next(error);
    }
});

/**
 * PUT /api/sessions/:id
 * Update a specific session (placeholder - not implemented in current schema)
 */
router.put('/:id', async (req, res, next) => {
    try {
        const sessionId = parseInt(req.params.id);
        
        if (isNaN(sessionId)) {
            return res.status(400).json({
                error: 'Invalid session ID',
                code: 400
            });
        }
        
        // Note: Session update not implemented in current schema
        res.status(501).json({
            error: 'Session update not implemented in current schema',
            code: 501
        });
    } catch (error) {
        next(error);
    }
});

/**
 * DELETE /api/sessions/:id
 * Delete a specific session (placeholder - not implemented in current schema)
 */
router.delete('/:id', async (req, res, next) => {
    try {
        const sessionId = parseInt(req.params.id);
        
        if (isNaN(sessionId)) {
            return res.status(400).json({
                error: 'Invalid session ID',
                code: 400
            });
        }
        
        // Note: Session deletion not implemented in current schema
        res.status(501).json({
            error: 'Session deletion not implemented in current schema',
            code: 501
        });
    } catch (error) {
        next(error);
    }
});

/**
 * PATCH /api/sessions/:id/activate
 * Activate a session (placeholder - not implemented in current schema)
 */
router.patch('/:id/activate', async (req, res, next) => {
    try {
        const sessionId = parseInt(req.params.id);
        
        if (isNaN(sessionId)) {
            return res.status(400).json({
                error: 'Invalid session ID',
                code: 400
            });
        }
        
        // Note: Session activation not implemented in current schema
        res.status(501).json({
            error: 'Session activation not implemented in current schema',
            code: 501
        });
    } catch (error) {
        next(error);
    }
});

/**
 * PATCH /api/sessions/:id/deactivate
 * Deactivate a session (placeholder - not implemented in current schema)
 */
router.patch('/:id/deactivate', async (req, res, next) => {
    try {
        const sessionId = parseInt(req.params.id);
        
        if (isNaN(sessionId)) {
            return res.status(400).json({
                error: 'Invalid session ID',
                code: 400
            });
        }
        
        // Note: Session deactivation not implemented in current schema
        res.status(501).json({
            error: 'Session deactivation not implemented in current schema',
            code: 501
        });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/sessions/:id/summary
 * Get a summary of the session
 */
router.get('/:id/summary', async (req, res, next) => {
    try {
        const sessionId = parseInt(req.params.id);
        
        if (isNaN(sessionId)) {
            return res.status(400).json({
                error: 'Invalid session ID',
                code: 400
            });
        }
        
        const supabase = req.app.locals.supabase;
        const summary = await executeRPC(supabase, 'get_session_summary', {
            p_session_id: sessionId
        });
        
        res.json(summary[0]);
    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/sessions/:id/chat
 * Legacy chat endpoint - returns basic session info
 */
router.get('/:id/chat', async (req, res, next) => {
    try {
        const sessionId = parseInt(req.params.id);
        
        if (isNaN(sessionId)) {
            return res.status(400).json({
                error: 'Invalid session ID',
                code: 400
            });
        }
        
        const supabase = req.app.locals.supabase;
        const session = await executeRPC(supabase, 'get_session_by_id', {
            p_session_id: sessionId
        });
        
        if (!session || session.length === 0) {
            return res.status(404).json({
                error: 'Session not found',
                code: 404
            });
        }
        
        res.json({
            message: `Hello, this is the chat endpoint for session ${sessionId}!`,
            session: session[0]
        });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /api/sessions/:id/join
 * User joins a session
 */
router.post('/:id/join', async (req, res, next) => {
    try {
        const sessionId = parseInt(req.params.id);
        const { user_id } = req.body;
        
        if (isNaN(sessionId)) {
            return res.status(400).json({
                error: 'Invalid session ID',
                code: 400
            });
        }
        
        let userId = user_id;
        
        // If no user_id provided in body, look up the internal user ID from auth_user_id
        if (!userId) {
            const supabase = req.app.locals.supabase;
            const { data: userProfile, error: userError } = await supabase
                .from('users')
                .select('user_id')
                .eq('auth_user_id', req.user.id)
                .single();
            
            if (userError || !userProfile) {
                return res.status(404).json({
                    error: 'User profile not found',
                    code: 404,
                    details: 'Unable to map authenticated user to internal user ID'
                });
            }
            
            userId = userProfile.user_id;
        }
        
        const supabase = req.app.locals.supabase;
        
        // Check if session exists and is active
        const { data: session, error: sessionError } = await supabase
            .from('sessions')
            .select('session_id, status, group_id')
            .eq('session_id', sessionId)
            .single();
            
        if (sessionError || !session) {
            return res.status(404).json({
                error: 'Session not found',
                code: 404
            });
        }
        
        if (session.status === 'completed') {
            return res.status(400).json({
                error: 'Cannot join a completed session',
                code: 400
            });
        }
        
        // Check if user is a member of the group
        const { data: groupMember, error: memberError } = await supabase
            .from('group_participants')
            .select('group_participant_id')
            .eq('group_id', session.group_id)
            .eq('user_id', userId)
            .single();
            
        if (memberError || !groupMember) {
            return res.status(403).json({
                error: 'You must be a group member to join this session',
                code: 403
            });
        }
        
        // Add user to session participants
        const { data: participant, error: participantError } = await supabase
            .from('session_participants')
            .insert([{ session_id: sessionId, user_id: userId }])
            .select()
            .single();
            
        if (participantError) {
            // Check if already joined
            if (participantError.code === '23505') { // unique_violation
                return res.status(409).json({
                    error: 'User already joined this session',
                    code: 409
                });
            }
            throw participantError;
        }
        
        res.status(201).json({
            message: `User ${userId} joined session ${sessionId}`,
            participant
        });
    } catch (error) {
        next(error);
    }
});

/**
 * DELETE /api/sessions/:id/leave
 * User leaves a session
 */
router.delete('/:id/leave', async (req, res, next) => {
    try {
        const sessionId = parseInt(req.params.id);
        const { user_id } = req.body;
        
        if (isNaN(sessionId)) {
            return res.status(400).json({
                error: 'Invalid session ID',
                code: 400
            });
        }
        
        let userId = user_id;
        
        // If no user_id provided in body, look up the internal user ID from auth_user_id
        if (!userId) {
            const supabase = req.app.locals.supabase;
            const { data: userProfile, error: userError } = await supabase
                .from('users')
                .select('user_id')
                .eq('auth_user_id', req.user.id)
                .single();
            
            if (userError || !userProfile) {
                return res.status(404).json({
                    error: 'User profile not found',
                    code: 404,
                    details: 'Unable to map authenticated user to internal user ID'
                });
            }
            
            userId = userProfile.user_id;
        }
        
        const supabase = req.app.locals.supabase;
        
        // Remove user from session participants
        const { data: removed, error: removeError } = await supabase
            .from('session_participants')
            .delete()
            .eq('session_id', sessionId)
            .eq('user_id', userId)
            .select();
            
        if (removeError) {
            throw removeError;
        }
        
        if (!removed || removed.length === 0) {
            return res.status(404).json({
                error: 'User was not in this session',
                code: 404
            });
        }
        
        res.json({
            message: `User ${userId} left session ${sessionId}`
        });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/sessions/:id/participants
 * Get all participants in a session
 */
router.get('/:id/participants', async (req, res, next) => {
    try {
        const sessionId = parseInt(req.params.id);
        
        if (isNaN(sessionId)) {
            return res.status(400).json({
                error: 'Invalid session ID',
                code: 400
            });
        }
        
        const supabase = req.app.locals.supabase;
        
        // Get session participants with user details
        const { data: participants, error } = await supabase
            .from('session_participants')
            .select(`
                user_id,
                joined_at,
                users (
                    user_id,
                    email,
                    first_name,
                    last_name,
                    availability
                )
            `)
            .eq('session_id', sessionId);
            
        if (error) {
            throw error;
        }
        
        res.json(participants || []);
    } catch (error) {
        next(error);
    }
});

/**
 * POST /api/sessions/:id/close
 * Close a session (only session creator or group admin can close)
 */
router.post('/:id/close', async (req, res, next) => {
    try {
        const sessionId = parseInt(req.params.id);
        
        if (isNaN(sessionId)) {
            return res.status(400).json({
                error: 'Invalid session ID',
                code: 400
            });
        }
        
        const supabase = req.app.locals.supabase;
        
        // Get current user ID
        const { data: userProfile, error: userError } = await supabase
            .from('users')
            .select('user_id')
            .eq('auth_user_id', req.user.id)
            .single();
        
        if (userError || !userProfile) {
            return res.status(404).json({
                error: 'User profile not found',
                code: 404
            });
        }
        
        const userId = userProfile.user_id;
        
        // Get session details
        const { data: session, error: sessionError } = await supabase
            .from('sessions')
            .select('session_id, created_by, group_id, status')
            .eq('session_id', sessionId)
            .single();
            
        if (sessionError || !session) {
            return res.status(404).json({
                error: 'Session not found',
                code: 404
            });
        }
        
        if (session.status === 'completed') {
            return res.status(400).json({
                error: 'Session is already closed',
                code: 400
            });
        }
        
        // Check if user can close the session (creator or group admin)
        let canClose = session.created_by === userId;
        
        if (!canClose) {
            const { data: groupMember, error: memberError } = await supabase
                .from('group_participants')
                .select('role')
                .eq('group_id', session.group_id)
                .eq('user_id', userId)
                .single();
                
            canClose = groupMember && groupMember.role === 'admin';
        }
        
        if (!canClose) {
            return res.status(403).json({
                error: 'Only session creator or group admin can close the session',
                code: 403
            });
        }
        
        // Close the session
        const { data: updatedSession, error: updateError } = await supabase
            .from('sessions')
            .update({ 
                status: 'completed',
                ended_at: new Date().toISOString()
            })
            .eq('session_id', sessionId)
            .select()
            .single();
            
        if (updateError) {
            throw updateError;
        }
        
        // Remove all participants from the session
        const { error: removeError } = await supabase
            .from('session_participants')
            .delete()
            .eq('session_id', sessionId);
            
        if (removeError) {
            console.error('Error removing participants:', removeError);
            // Don't fail the request if participant removal fails
        }
        
        res.json({
            message: 'Session closed successfully',
            session: updatedSession
        });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /api/sessions/:id/invite
 * Invite a user to a session (placeholder)
 */
router.post('/:id/invite', async (req, res, next) => {
    try {
        const sessionId = parseInt(req.params.id);
        const { user_id } = req.body;
        
        if (isNaN(sessionId)) {
            return res.status(400).json({
                error: 'Invalid session ID',
                code: 400
            });
        }
        
        if (!user_id) {
            return res.status(400).json({
                error: 'user_id is required',
                code: 400
            });
        }
        
        res.status(201).json({
            message: `User ${user_id} invited to session ${sessionId}`
        });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/sessions/getid
 * Get session ID by title
 */
router.get('/getid', async (req, res, next) => {
    try {
        const { title } = req.query;
        
        if (!title) {
            return res.status(400).json({
                error: 'Session title is required',
                code: 400
            });
        }
        
        const supabase = req.app.locals.supabase;
        const session = await executeRPC(supabase, 'get_session_by_title', {
            p_title: title
        });
        
        res.json(session[0]);
    } catch (error) {
        next(error);
    }
});

module.exports = router;