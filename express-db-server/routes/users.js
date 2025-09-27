// User routes - Express.js implementation using Supabase RPC
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
// USER ROUTES
// =====================================================

/**
 * GET /api/users
 * Get all users
 */
router.get('/', async (req, res, next) => {
    try {
        const supabase = req.app.locals.supabase;
        const users = await executeRPC(supabase, 'get_all_users', {}, res);
        
        res.json(users);
    } catch (error) {
        next(error);
    }
});

/**
 * POST /api/users
 * Create a new user
 */
router.post('/', async (req, res, next) => {
    try {
        const { email, name, first_name, last_name } = req.body;
        
        if (!email) {
            return res.status(400).json({
                error: 'Email is required',
                code: 400
            });
        }
        
        const supabase = req.app.locals.supabase;
        
        // Parse name into first_name and last_name if provided
        let finalFirstName = first_name;
        let finalLastName = last_name;
        
        if (name && !first_name && !last_name) {
            const nameParts = name.trim().split(' ');
            finalFirstName = nameParts[0];
            finalLastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : null;
        }
        
        const user = await executeRPC(supabase, 'create_user', {
            p_email: email,
            p_first_name: finalFirstName,
            p_last_name: finalLastName
        });
        
        res.status(201).json(user[0]);
    } catch (error) {
        next(error);
    }
});

/**
 * POST /api/users/create-from-auth
 * Create a user record from Supabase auth data (public endpoint for OAuth flow)
 */
router.post('/create-from-auth', async (req, res, next) => {
    try {
        const { auth_user_id, email, first_name, last_name, profile_picture_url } = req.body;
        
        if (!auth_user_id || !email) {
            return res.status(400).json({
                error: 'auth_user_id and email are required',
                code: 400
            });
        }

        console.log('Creating user from auth data:', { auth_user_id, email });
        
        const supabase = req.app.locals.supabase;
        
        // Check if user already exists
        const { data: existingUsers, error: checkError } = await supabase
            .from('users')
            .select('id, email, auth_user_id')
            .or(`auth_user_id.eq.${auth_user_id},email.eq.${email}`)
            .limit(1);
            
        if (checkError) {
            console.error('Error checking existing user:', checkError);
            throw checkError;
        }
        
        if (existingUsers && existingUsers.length > 0) {
            const existingUser = existingUsers[0];
            console.log('User already exists:', existingUser);
            
            // Update auth_user_id if missing
            if (!existingUser.auth_user_id) {
                console.log('Updating missing auth_user_id for existing user');
                const { data: updatedUser, error: updateError } = await supabase
                    .from('users')
                    .update({ auth_user_id })
                    .eq('id', existingUser.id)
                    .select()
                    .single();
                    
                if (updateError) throw updateError;
                return res.json(updatedUser);
            }
            
            return res.json(existingUser);
        }
        
        // Create new user
        const { data: newUser, error: createError } = await supabase
            .from('users')
            .insert({
                auth_user_id,
                email,
                first_name: first_name || email.split('@')[0] || 'User',
                last_name,
                profile_picture_url,
                availability: 'available',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            })
            .select()
            .single();
            
        if (createError) {
            console.error('Error creating user:', createError);
            throw createError;
        }
        
        console.log('Successfully created new user:', newUser);
        res.status(201).json(newUser);
        
    } catch (error) {
        console.error('Error in create-from-auth:', error);
        next(error);
    }
});

/**
 * GET /api/users/:id
 * Get a specific user by ID
 */
router.get('/:id', async (req, res, next) => {
    try {
        const userId = parseInt(req.params.id);
        
        if (isNaN(userId)) {
            return res.status(400).json({
                error: 'Invalid user ID',
                code: 400
            });
        }
        
        const supabase = req.app.locals.supabase;
        const user = await executeRPC(supabase, 'get_user_by_id', {
            p_user_id: userId
        });
        
        if (!user || user.length === 0) {
            return res.status(404).json({
                error: 'User not found',
                code: 404
            });
        }
        
        res.json(user[0]);
    } catch (error) {
        next(error);
    }
});

/**
 * PUT /api/users/:id
 * Update a specific user
 */
router.put('/:id', async (req, res, next) => {
    try {
        const userId = parseInt(req.params.id);
        const { email, name, first_name, last_name, is_active } = req.body;
        
        if (isNaN(userId)) {
            return res.status(400).json({
                error: 'Invalid user ID',
                code: 400
            });
        }
        
        const supabase = req.app.locals.supabase;
        
        // Parse name into first_name and last_name if provided
        let finalFirstName = first_name;
        let finalLastName = last_name;
        
        if (name && !first_name && !last_name) {
            const nameParts = name.trim().split(' ');
            finalFirstName = nameParts[0];
            finalLastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : null;
        }
        
        const user = await executeRPC(supabase, 'update_user', {
            p_user_id: userId,
            p_email: email || null,
            p_first_name: finalFirstName || null,
            p_last_name: finalLastName || null,
            p_is_active: is_active !== undefined ? is_active : null
        });
        
        res.json(user[0]);
    } catch (error) {
        next(error);
    }
});

/**
 * DELETE /api/users/:id
 * Delete a specific user
 */
router.delete('/:id', async (req, res, next) => {
    try {
        const userId = parseInt(req.params.id);
        
        if (isNaN(userId)) {
            return res.status(400).json({
                error: 'Invalid user ID',
                code: 400
            });
        }
        
        const supabase = req.app.locals.supabase;
        await executeRPC(supabase, 'delete_user', {
            p_user_id: userId
        });
        
        res.status(204).send();
    } catch (error) {
        next(error);
    }
});

/**
 * PATCH /api/users/:id/activate
 * Activate a user
 */
router.patch('/:id/activate', async (req, res, next) => {
    try {
        const userId = parseInt(req.params.id);
        
        if (isNaN(userId)) {
            return res.status(400).json({
                error: 'Invalid user ID',
                code: 400
            });
        }
        
        const supabase = req.app.locals.supabase;
        const result = await executeRPC(supabase, 'activate_user', {
            p_user_id: userId
        });
        
        res.json(result);
    } catch (error) {
        next(error);
    }
});

/**
 * PATCH /api/users/:id/deactivate
 * Deactivate a user
 */
router.patch('/:id/deactivate', async (req, res, next) => {
    try {
        const userId = parseInt(req.params.id);
        
        if (isNaN(userId)) {
            return res.status(400).json({
                error: 'Invalid user ID',
                code: 400
            });
        }
        
        const supabase = req.app.locals.supabase;
        const result = await executeRPC(supabase, 'deactivate_user', {
            p_user_id: userId
        });
        
        res.json(result);
    } catch (error) {
        next(error);
    }
});

module.exports = router;