// Auth routes - Express.js implementation for authentication and profile management
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

/**
 * Helper function to get user profile from Supabase auth user
 */
async function getUserProfile(supabase, authUserId) {
    try {
        // Try to get existing profile first
        const { data: profiles, error } = await supabase
            .from('users')
            .select('*')
            .eq('auth_user_id', authUserId)
            .single();

        if (error && error.code !== 'PGRST116') { // PGRST116 is "not found"
            throw error;
        }

        return profiles;
    } catch (error) {
        console.error('Error getting user profile:', error);
        return null;
    }
}

/**
 * Helper function to create or update user profile
 */
async function syncUserProfile(supabase, user) {
    try {
        const existingProfile = await getUserProfile(supabase, user.id);
        
        if (existingProfile) {
            // Update existing profile with latest auth data
            const { data, error } = await supabase
                .from('users')
                .update({
                    email: user.email,
                    updated_at: new Date().toISOString()
                })
                .eq('auth_user_id', user.id)
                .select()
                .single();

            if (error) throw error;
            return data;
        } else {
            // Create new profile
            const { data, error } = await supabase
                .from('users')
                .insert({
                    auth_user_id: user.id,
                    email: user.email,
                    first_name: user.user_metadata?.first_name || user.user_metadata?.name?.split(' ')[0] || null,
                    last_name: user.user_metadata?.last_name || (user.user_metadata?.name?.split(' ').length > 1 ? user.user_metadata.name.split(' ').slice(1).join(' ') : null),
                    profile_picture_url: user.user_metadata?.avatar_url || null,
                    availability: 'available',
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                })
                .select()
                .single();

            if (error) throw error;
            return data;
        }
    } catch (error) {
        console.error('Error syncing user profile:', error);
        throw error;
    }
}

// =====================================================
// AUTH ROUTES
// =====================================================

/**
 * GET /api/auth/status
 * Get authentication status and user info
 */
router.get('/status', async (req, res, next) => {
    try {
        if (!req.user) {
            return res.json({
                authenticated: false,
                user: null
            });
        }

        res.json({
            authenticated: true,
            user: {
                id: req.user.id,
                email: req.user.email,
                user_metadata: req.user.user_metadata,
                app_metadata: req.user.app_metadata
            }
        });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/auth/me
 * Get current user's profile
 */
router.get('/me', async (req, res, next) => {
    try {
        const supabase = req.app.locals.supabase;
        const profile = await getUserProfile(supabase, req.user.id);
        
        if (!profile) {
            return res.status(404).json({
                error: 'Profile not found',
                code: 404
            });
        }

        res.json(profile);
    } catch (error) {
        next(error);
    }
});

/**
 * PUT /api/auth/me
 * Update current user's profile
 */
router.put('/me', async (req, res, next) => {
    try {
        const { first_name, last_name, bio, phone_number, availability } = req.body;
        const supabase = req.app.locals.supabase;
        
        // Update the profile
        const { data, error } = await supabase
            .from('users')
            .update({
                first_name: first_name || null,
                last_name: last_name || null,
                bio: bio || null,
                phone_number: phone_number || null,
                availability: availability || 'available',
                updated_at: new Date().toISOString()
            })
            .eq('auth_user_id', req.user.id)
            .select()
            .single();

        if (error) {
            throw error;
        }

        if (!data) {
            return res.status(404).json({
                error: 'Profile not found',
                code: 404
            });
        }

        res.json(data);
    } catch (error) {
        next(error);
    }
});

/**
 * POST /api/auth/sync-profile
 * Sync profile with Supabase auth data
 */
router.post('/sync-profile', async (req, res, next) => {
    try {
        const supabase = req.app.locals.supabase;
        
        // Get the full user data from Supabase auth
        const { data: { user }, error: authError } = await supabase.auth.getUser(req.token);
        
        if (authError || !user) {
            return res.status(401).json({
                error: 'Authentication failed',
                code: 401
            });
        }

        const profile = await syncUserProfile(supabase, user);
        
        res.json({
            message: 'Profile synced successfully',
            profile: profile
        });
    } catch (error) {
        next(error);
    }
});

module.exports = router;