// Group routes - Express.js implementation using Supabase RPC
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
// GROUP ROUTES
// =====================================================

/**
 * GET /api/groups
 * Get all groups
 */
router.get('/', async (req, res, next) => {
    try {
        const supabase = req.app.locals.supabase;
        const groups = await executeRPC(supabase, 'get_all_groups');
        
        res.json(groups);
    } catch (error) {
        next(error);
    }
});

/**
 * POST /api/groups
 * Create a new group
 */
router.post('/', async (req, res, next) => {
    try {
        const { name, created_by, description } = req.body;
        
        if (!name) {
            return res.status(400).json({
                error: 'Group name is required',
                code: 400
            });
        }
        
        const supabase = req.app.locals.supabase;
        
        // Use created_by from request body or default to authenticated user
        const createdBy = created_by || parseInt(req.user.id) || 1;
        
        const group = await executeRPC(supabase, 'create_group', {
            p_name: name,
            p_created_by: createdBy,
            p_description: description || ''
        });
        
        res.status(201).json(group[0]);
    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/groups/:id
 * Get a specific group by ID
 */
router.get('/:id', async (req, res, next) => {
    try {
        const groupId = parseInt(req.params.id);
        
        if (isNaN(groupId)) {
            return res.status(400).json({
                error: 'Invalid group ID',
                code: 400
            });
        }
        
        const supabase = req.app.locals.supabase;
        const group = await executeRPC(supabase, 'get_group_by_id', {
            p_group_id: groupId
        });
        
        if (!group || group.length === 0) {
            return res.status(404).json({
                error: 'Group not found',
                code: 404
            });
        }
        
        res.json(group[0]);
    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/groups/:id/members
 * Get all members of a specific group
 */
router.get('/:id/members', async (req, res, next) => {
    try {
        const groupId = parseInt(req.params.id);
        
        if (isNaN(groupId)) {
            return res.status(400).json({
                error: 'Invalid group ID',
                code: 400
            });
        }
        
        const supabase = req.app.locals.supabase;
        const members = await executeRPC(supabase, 'get_group_members', {
            p_group_id: groupId
        });
        
        res.json(members[0]);
    } catch (error) {
        next(error);
    }
});

/**
 * POST /api/groups/:id/members/:userId
 * Add a user to a group
 */
router.post('/:id/members/:userId', async (req, res, next) => {
    try {
        const groupId = parseInt(req.params.id);
        const userId = parseInt(req.params.userId);
        const { role } = req.body;
        
        if (isNaN(groupId) || isNaN(userId)) {
            return res.status(400).json({
                error: 'Invalid group ID or user ID',
                code: 400
            });
        }
        
        const supabase = req.app.locals.supabase;
        const result = await executeRPC(supabase, 'add_group_member', {
            p_group_id: groupId,
            p_user_id: userId,
            p_role: role || 'member'
        });
        
        res.status(201).json(result);
    } catch (error) {
        next(error);
    }
});

/**
 * DELETE /api/groups/:id/members/:userId
 * Remove a user from a group
 */
router.delete('/:id/members/:userId', async (req, res, next) => {
    try {
        const groupId = parseInt(req.params.id);
        const userId = parseInt(req.params.userId);
        
        if (isNaN(groupId) || isNaN(userId)) {
            return res.status(400).json({
                error: 'Invalid group ID or user ID',
                code: 400
            });
        }
        
        const supabase = req.app.locals.supabase;
        await executeRPC(supabase, 'remove_group_member', {
            p_group_id: groupId,
            p_user_id: userId
        });
        
        res.status(204).send();
    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/groups/:id/members/count
 * Get the number of members in a group
 */
router.get('/:id/members/count', async (req, res, next) => {
    try {
        const groupId = parseInt(req.params.id);
        
        if (isNaN(groupId)) {
            return res.status(400).json({
                error: 'Invalid group ID',
                code: 400
            });
        }
        
        const supabase = req.app.locals.supabase;
        const members = await executeRPC(supabase, 'get_group_members', {
            p_group_id: groupId
        });
        
        res.json({
            group_id: groupId,
            member_count: members[0].member_count
        });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /api/groups/:id/join
 * User joins a group
 */
router.post('/:id/join', async (req, res, next) => {
    try {
        const groupId = parseInt(req.params.id);
        const { user_id } = req.body;
        
        if (isNaN(groupId)) {
            return res.status(400).json({
                error: 'Invalid group ID',
                code: 400
            });
        }
        
        const userId = user_id || parseInt(req.user.id) || 1;
        
        const supabase = req.app.locals.supabase;
        const result = await executeRPC(supabase, 'add_group_member', {
            p_group_id: groupId,
            p_user_id: userId,
            p_role: 'member'
        });
        
        res.status(201).json(result);
    } catch (error) {
        next(error);
    }
});

/**
 * DELETE /api/groups/:id/leave
 * User leaves a group
 */
router.delete('/:id/leave', async (req, res, next) => {
    try {
        const groupId = parseInt(req.params.id);
        const { user_id } = req.body;
        
        if (isNaN(groupId)) {
            return res.status(400).json({
                error: 'Invalid group ID',
                code: 400
            });
        }
        
        const userId = user_id || parseInt(req.user.id) || 1;
        
        const supabase = req.app.locals.supabase;
        await executeRPC(supabase, 'remove_group_member', {
            p_group_id: groupId,
            p_user_id: userId
        });
        
        res.status(204).send();
    } catch (error) {
        next(error);
    }
});

/**
 * POST /api/groups/:id/invite
 * Invite a user to a group
 */
router.post('/:id/invite', async (req, res, next) => {
    try {
        const groupId = parseInt(req.params.id);
        const { user_id, role } = req.body;
        
        if (isNaN(groupId)) {
            return res.status(400).json({
                error: 'Invalid group ID',
                code: 400
            });
        }
        
        if (!user_id) {
            return res.status(400).json({
                error: 'user_id is required',
                code: 400
            });
        }
        
        const supabase = req.app.locals.supabase;
        const result = await executeRPC(supabase, 'add_group_member', {
            p_group_id: groupId,
            p_user_id: user_id,
            p_role: role || 'member'
        });
        
        res.status(201).json(result);
    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/groups/getid
 * Get group ID by name
 */
router.get('/getid', async (req, res, next) => {
    try {
        const { name } = req.query;
        
        if (!name) {
            return res.status(400).json({
                error: 'Group name is required',
                code: 400
            });
        }
        
        const supabase = req.app.locals.supabase;
        const group = await executeRPC(supabase, 'get_group_by_name', {
            p_name: name
        });
        
        res.json(group[0]);
    } catch (error) {
        next(error);
    }
});

module.exports = router;