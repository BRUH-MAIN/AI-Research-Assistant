// Authentication middleware for JWT verification
const jwt = require('jsonwebtoken');

/**
 * Middleware to verify Supabase JWT tokens
 * Extracts user information from the token and makes it available in req.user
 */
const authMiddleware = async (req, res, next) => {
    try {
        // Skip auth for health check
        if (req.path === '/health') {
            return next();
        }

        // Get token from Authorization header
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                error: 'Access token required',
                code: 401
            });
        }

        const token = authHeader.split(' ')[1];
        
        // Verify token with Supabase
        const supabase = req.app.locals.supabase;
        const { data: { user }, error } = await supabase.auth.getUser(token);
        
        if (error || !user) {
            return res.status(401).json({
                error: 'Invalid or expired token',
                code: 401,
                details: error?.message
            });
        }

        // Add user info to request object
        req.user = {
            id: user.id,
            email: user.email,
            user_metadata: user.user_metadata,
            app_metadata: user.app_metadata
        };

        // Add the token for RLS context
        req.token = token;

        next();
    } catch (error) {
        console.error('Auth middleware error:', error);
        res.status(500).json({
            error: 'Authentication error',
            code: 500,
            details: error.message
        });
    }
};

module.exports = authMiddleware;