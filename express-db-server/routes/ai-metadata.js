// AI Metadata routes - Express.js implementation using Supabase RPC
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
// AI METADATA ROUTES
// =====================================================

/**
 * GET /api/ai-metadata
 * Get all AI metadata (with optional filtering)
 */
router.get('/', async (req, res, next) => {
    try {
        const { message_id, model_name, limit, offset } = req.query;
        const supabase = req.app.locals.supabase;
        
        let metadata;
        if (message_id) {
            metadata = await executeRPC(supabase, 'get_message_ai_metadata', {
                p_message_id: parseInt(message_id)
            });
        } else if (model_name) {
            metadata = await executeRPC(supabase, 'get_ai_metadata_by_model', {
                p_model_name: model_name,
                p_limit: limit ? parseInt(limit) : 100,
                p_offset: offset ? parseInt(offset) : 0
            });
        } else {
            metadata = await executeRPC(supabase, 'get_all_ai_metadata', {
                p_limit: limit ? parseInt(limit) : 100,
                p_offset: offset ? parseInt(offset) : 0
            });
        }
        
        res.json(metadata);
    } catch (error) {
        next(error);
    }
});

/**
 * POST /api/ai-metadata
 * Create new AI metadata
 */
router.post('/', async (req, res, next) => {
    try {
        const { 
            message_id, 
            model_name, 
            model_version, 
            prompt_tokens, 
            completion_tokens, 
            total_tokens, 
            processing_time_ms, 
            temperature, 
            max_tokens, 
            additional_metadata 
        } = req.body;
        
        if (!message_id || !model_name) {
            return res.status(400).json({
                error: 'message_id and model_name are required',
                code: 400
            });
        }
        
        const supabase = req.app.locals.supabase;
        const metadata = await executeRPC(supabase, 'create_ai_metadata', {
            p_message_id: parseInt(message_id),
            p_model_name: model_name,
            p_model_version: model_version || null,
            p_prompt_tokens: prompt_tokens || null,
            p_completion_tokens: completion_tokens || null,
            p_total_tokens: total_tokens || null,
            p_processing_time_ms: processing_time_ms || null,
            p_temperature: temperature || null,
            p_max_tokens: max_tokens || null,
            p_additional_metadata: additional_metadata || null
        });
        
        res.status(201).json(metadata[0]);
    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/ai-metadata/:id
 * Get specific AI metadata by ID
 */
router.get('/:id', async (req, res, next) => {
    try {
        const metadataId = parseInt(req.params.id);
        
        if (isNaN(metadataId)) {
            return res.status(400).json({
                error: 'Invalid AI metadata ID',
                code: 400
            });
        }
        
        const supabase = req.app.locals.supabase;
        const metadata = await executeRPC(supabase, 'get_ai_metadata_by_id', {
            p_metadata_id: metadataId
        });
        
        if (!metadata || metadata.length === 0) {
            return res.status(404).json({
                error: 'AI metadata not found',
                code: 404
            });
        }
        
        res.json(metadata[0]);
    } catch (error) {
        next(error);
    }
});

/**
 * PUT /api/ai-metadata/:id
 * Update specific AI metadata
 */
router.put('/:id', async (req, res, next) => {
    try {
        const metadataId = parseInt(req.params.id);
        const { 
            model_name, 
            model_version, 
            prompt_tokens, 
            completion_tokens, 
            total_tokens, 
            processing_time_ms, 
            temperature, 
            max_tokens, 
            additional_metadata 
        } = req.body;
        
        if (isNaN(metadataId)) {
            return res.status(400).json({
                error: 'Invalid AI metadata ID',
                code: 400
            });
        }
        
        const supabase = req.app.locals.supabase;
        const metadata = await executeRPC(supabase, 'update_ai_metadata', {
            p_metadata_id: metadataId,
            p_model_name: model_name || null,
            p_model_version: model_version || null,
            p_prompt_tokens: prompt_tokens || null,
            p_completion_tokens: completion_tokens || null,
            p_total_tokens: total_tokens || null,
            p_processing_time_ms: processing_time_ms || null,
            p_temperature: temperature || null,
            p_max_tokens: max_tokens || null,
            p_additional_metadata: additional_metadata || null
        });
        
        res.json(metadata[0]);
    } catch (error) {
        next(error);
    }
});

/**
 * DELETE /api/ai-metadata/:id
 * Delete specific AI metadata
 */
router.delete('/:id', async (req, res, next) => {
    try {
        const metadataId = parseInt(req.params.id);
        
        if (isNaN(metadataId)) {
            return res.status(400).json({
                error: 'Invalid AI metadata ID',
                code: 400
            });
        }
        
        const supabase = req.app.locals.supabase;
        await executeRPC(supabase, 'delete_ai_metadata', {
            p_metadata_id: metadataId
        });
        
        res.status(204).send();
    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/ai-metadata/stats/usage
 * Get AI usage statistics
 */
router.get('/stats/usage', async (req, res, next) => {
    try {
        const { date_from, date_to, model_name } = req.query;
        const supabase = req.app.locals.supabase;
        
        const stats = await executeRPC(supabase, 'get_ai_usage_stats', {
            p_date_from: date_from || null,
            p_date_to: date_to || null,
            p_model_name: model_name || null
        });
        
        res.json(stats);
    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/ai-metadata/stats/performance
 * Get AI performance statistics
 */
router.get('/stats/performance', async (req, res, next) => {
    try {
        const { date_from, date_to, model_name } = req.query;
        const supabase = req.app.locals.supabase;
        
        const stats = await executeRPC(supabase, 'get_ai_performance_stats', {
            p_date_from: date_from || null,
            p_date_to: date_to || null,
            p_model_name: model_name || null
        });
        
        res.json(stats);
    } catch (error) {
        next(error);
    }
});

module.exports = router;