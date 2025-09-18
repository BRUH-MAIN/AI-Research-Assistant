// Feedback routes - Express.js implementation using Supabase RPC
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
// FEEDBACK ROUTES
// =====================================================

/**
 * GET /api/feedback
 * Get all feedback (with optional filtering)
 */
router.get('/', async (req, res, next) => {
    try {
        const { user_id, message_id, session_id, limit, offset } = req.query;
        const supabase = req.app.locals.supabase;
        
        let feedback;
        if (user_id) {
            feedback = await executeRPC(supabase, 'get_user_feedback', {
                p_user_id: parseInt(user_id),
                p_limit: limit ? parseInt(limit) : 100,
                p_offset: offset ? parseInt(offset) : 0
            });
        } else if (message_id) {
            feedback = await executeRPC(supabase, 'get_message_feedback', {
                p_message_id: parseInt(message_id)
            });
        } else if (session_id) {
            feedback = await executeRPC(supabase, 'get_session_feedback', {
                p_session_id: parseInt(session_id)
            });
        } else {
            feedback = await executeRPC(supabase, 'get_all_feedback', {
                p_limit: limit ? parseInt(limit) : 100,
                p_offset: offset ? parseInt(offset) : 0
            });
        }
        
        res.json(feedback);
    } catch (error) {
        next(error);
    }
});

/**
 * POST /api/feedback
 * Create new feedback
 */
router.post('/', async (req, res, next) => {
    try {
        const { user_id, message_id, feedback_type, rating, comment, metadata } = req.body;
        
        if (!user_id || !message_id || !feedback_type) {
            return res.status(400).json({
                error: 'user_id, message_id, and feedback_type are required',
                code: 400
            });
        }
        
        // Validate rating if provided
        if (rating !== undefined && (rating < 1 || rating > 5)) {
            return res.status(400).json({
                error: 'Rating must be between 1 and 5',
                code: 400
            });
        }
        
        const supabase = req.app.locals.supabase;
        const feedback = await executeRPC(supabase, 'create_feedback', {
            p_user_id: parseInt(user_id),
            p_message_id: parseInt(message_id),
            p_feedback_type: feedback_type,
            p_rating: rating || null,
            p_comment: comment || null,
            p_metadata: metadata || null
        });
        
        res.status(201).json(feedback[0]);
    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/feedback/:id
 * Get specific feedback by ID
 */
router.get('/:id', async (req, res, next) => {
    try {
        const feedbackId = parseInt(req.params.id);
        
        if (isNaN(feedbackId)) {
            return res.status(400).json({
                error: 'Invalid feedback ID',
                code: 400
            });
        }
        
        const supabase = req.app.locals.supabase;
        const feedback = await executeRPC(supabase, 'get_feedback_by_id', {
            p_feedback_id: feedbackId
        });
        
        if (!feedback || feedback.length === 0) {
            return res.status(404).json({
                error: 'Feedback not found',
                code: 404
            });
        }
        
        res.json(feedback[0]);
    } catch (error) {
        next(error);
    }
});

/**
 * PUT /api/feedback/:id
 * Update specific feedback
 */
router.put('/:id', async (req, res, next) => {
    try {
        const feedbackId = parseInt(req.params.id);
        const { feedback_type, rating, comment, metadata } = req.body;
        
        if (isNaN(feedbackId)) {
            return res.status(400).json({
                error: 'Invalid feedback ID',
                code: 400
            });
        }
        
        // Validate rating if provided
        if (rating !== undefined && (rating < 1 || rating > 5)) {
            return res.status(400).json({
                error: 'Rating must be between 1 and 5',
                code: 400
            });
        }
        
        const supabase = req.app.locals.supabase;
        const feedback = await executeRPC(supabase, 'update_feedback', {
            p_feedback_id: feedbackId,
            p_feedback_type: feedback_type || null,
            p_rating: rating || null,
            p_comment: comment || null,
            p_metadata: metadata || null
        });
        
        res.json(feedback[0]);
    } catch (error) {
        next(error);
    }
});

/**
 * DELETE /api/feedback/:id
 * Delete specific feedback
 */
router.delete('/:id', async (req, res, next) => {
    try {
        const feedbackId = parseInt(req.params.id);
        
        if (isNaN(feedbackId)) {
            return res.status(400).json({
                error: 'Invalid feedback ID',
                code: 400
            });
        }
        
        const supabase = req.app.locals.supabase;
        await executeRPC(supabase, 'delete_feedback', {
            p_feedback_id: feedbackId
        });
        
        res.status(204).send();
    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/feedback/stats
 * Get feedback statistics
 */
router.get('/stats', async (req, res, next) => {
    try {
        const { date_from, date_to } = req.query;
        const supabase = req.app.locals.supabase;
        
        const stats = await executeRPC(supabase, 'get_feedback_stats', {
            p_date_from: date_from || null,
            p_date_to: date_to || null
        });
        
        res.json(stats);
    } catch (error) {
        next(error);
    }
});

module.exports = router;