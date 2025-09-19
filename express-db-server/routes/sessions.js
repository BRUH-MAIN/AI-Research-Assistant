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
        const { title, user_id, group_id } = req.body;
        
        if (!user_id) {
            return res.status(400).json({
                error: 'user_id is required',
                code: 400
            });
        }
        
        const supabase = req.app.locals.supabase;
        
        // Generate default title if not provided
        const finalTitle = title || `Session ${new Date().toISOString().replace(/[:.]/g, '_')}`;
        
        const session = await executeRPC(supabase, 'create_session', {
            p_title: finalTitle,
            p_user_id: parseInt(user_id),
            p_group_id: group_id ? parseInt(group_id) : 1
        });
        
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
 * User joins a session (placeholder)
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
        
        // For now, just return success message
        // This would require additional session participant tracking
        res.status(201).json({
            message: `User ${userId} joined session ${sessionId}`
        });
    } catch (error) {
        next(error);
    }
});

/**
 * DELETE /api/sessions/:id/leave
 * User leaves a session (placeholder)
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
        
        // For now, just return success
        res.status(204).send();
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