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
        const { name, created_by, description, is_public } = req.body;
        
        if (!name) {
            return res.status(400).json({
                error: 'Group name is required',
                code: 400
            });
        }
        
        // Validate that created_by is provided
        if (!created_by) {
            return res.status(400).json({
                error: 'created_by is required to specify the group owner',
                code: 400
            });
        }
        
        const supabase = req.app.locals.supabase;
        
        // Use created_by from request body - no defaults to avoid security issues
        const createdBy = parseInt(created_by);
        
        // Validate that createdBy is a valid number
        if (isNaN(createdBy) || createdBy <= 0) {
            return res.status(400).json({
                error: 'created_by must be a valid positive user ID',
                code: 400
            });
        }
        
        const group = await executeRPC(supabase, 'create_group', {
            p_name: name,
            p_created_by: createdBy,
            p_description: description || '',
            p_is_public: is_public || false
        });
        
        // The create_group function returns a single JSON object, not an array
        if (!group) {
            return res.status(500).json({
                error: 'Failed to create group - no response from database',
                code: 500
            });
        }
        
        // Log the actual response for debugging
        console.log('create_group response:', group);
        
        // Check if the group creation was successful
        if (!group.success || !group.group_id) {
            return res.status(500).json({
                error: 'Failed to create group - invalid response from database',
                code: 500,
                details: group
            });
        }
        
        // Transform the response to match frontend expectations
        const response = {
            id: group.group_id,
            group_id: group.group_id,
            name: group.name,
            description: group.description || '',
            is_public: group.is_public || false,
            invite_code: group.invite_code || '',
            member_count: 1, // Creator is the first member
            created_at: group.created_at
        };
        
        res.status(201).json(response);
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
        const members = await executeRPC(supabase, 'get_group_members_detailed', {
            p_group_id: groupId
        });
        
        res.json(members);
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

/**
 * GET /api/groups/invite/:code
 * Get group information by invite code
 */
router.get('/invite/:code', async (req, res, next) => {
    try {
        const inviteCode = req.params.code;
        
        if (!inviteCode || inviteCode.length !== 8) {
            return res.status(400).json({
                error: 'Invalid invite code format',
                code: 400
            });
        }
        
        const supabase = req.app.locals.supabase;
        const group = await executeRPC(supabase, 'get_group_by_invite_code', {
            p_invite_code: inviteCode
        });
        
        if (!group || group.length === 0) {
            return res.status(404).json({
                error: 'Invalid invite code',
                code: 404
            });
        }
        
        res.json(group[0]);
    } catch (error) {
        next(error);
    }
});

/**
 * POST /api/groups/invite/:code/join
 * Join a group using invite code
 */
router.post('/invite/:code/join', async (req, res, next) => {
    try {
        const inviteCode = req.params.code;
        const { user_id } = req.body;
        
        if (!inviteCode || inviteCode.length !== 8) {
            return res.status(400).json({
                error: 'Invalid invite code format',
                code: 400
            });
        }
        
        const userId = user_id || parseInt(req.user?.id) || 1;
        
        const supabase = req.app.locals.supabase;
        const result = await executeRPC(supabase, 'join_group_by_invite_code', {
            p_invite_code: inviteCode,
            p_user_id: userId
        });
        
        const joinResult = result[0];
        
        res.status(201).json({
            message: `Successfully joined group "${joinResult.name}"`,
            group_id: joinResult.group_id,
            group_name: joinResult.name
        });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/groups/user/:userId
 * Get all groups for a specific user
 */
router.get('/user/:userId', async (req, res, next) => {
    try {
        const userId = parseInt(req.params.userId);
        
        if (isNaN(userId)) {
            return res.status(400).json({
                error: 'Invalid user ID',
                code: 400
            });
        }
        
        const supabase = req.app.locals.supabase;
        const groups = await executeRPC(supabase, 'get_user_groups', {
            p_user_id: userId
        });
        
        res.json(groups);
    } catch (error) {
        next(error);
    }
});

/**
 * PUT /api/groups/:id/members/:userId/role
 * Update a member's role in the group
 */
router.put('/:id/members/:userId/role', async (req, res, next) => {
    try {
        const groupId = parseInt(req.params.id);
        const userId = parseInt(req.params.userId);
        const { role, updated_by } = req.body;
        
        if (isNaN(groupId) || isNaN(userId)) {
            return res.status(400).json({
                error: 'Invalid group ID or user ID',
                code: 400
            });
        }
        
        if (!role || !['admin', 'member', 'mentor'].includes(role)) {
            return res.status(400).json({
                error: 'Invalid role. Must be admin, member, or mentor',
                code: 400
            });
        }
        
        const updatedBy = updated_by || parseInt(req.user?.id) || 1;
        
        const supabase = req.app.locals.supabase;
        const result = await executeRPC(supabase, 'update_group_member_role', {
            p_group_id: groupId,
            p_target_user_id: userId,
            p_new_role: role,
            p_admin_user_id: updatedBy
        });
        
        console.log('RPC result:', result);
        
        if (!result || result.length === 0) {
            return res.status(500).json({
                error: 'No result returned from update_group_member_role function',
                code: 500
            });
        }
        
        const updateResult = result[0];
        console.log('Update result:', updateResult);
        
        res.json({ 
            message: `User role updated to ${role} successfully`,
            data: updateResult
        });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /api/groups/:id/regenerate-invite
 * Regenerate invite code for a group (admin only)
 */
router.post('/:id/regenerate-invite', async (req, res, next) => {
    try {
        const groupId = parseInt(req.params.id);
        const { user_id } = req.body;
        
        if (isNaN(groupId)) {
            return res.status(400).json({
                error: 'Invalid group ID',
                code: 400
            });
        }
        
        const userId = user_id || parseInt(req.user?.id) || 1;
        
        const supabase = req.app.locals.supabase;
        const result = await executeRPC(supabase, 'regenerate_invite_code', {
            p_group_id: groupId,
            p_user_id: userId
        });
        
        const regenResult = result[0];
        
        res.json({
            message: 'Invite code regenerated successfully',
            invite_code: regenResult.invite_code
        });
    } catch (error) {
        next(error);
    }
});

module.exports = router;