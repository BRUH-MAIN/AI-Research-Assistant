// Authentication middleware for JWT verification
const jwt = require('jsonwebtoken');

/**
 * Middleware to verify Supabase JWT tokens
 * Extracts user information from the token and makes it available in req.user
 */
const authMiddleware = async (req, res, next) => {
    try {
        // Skip auth for health check, auth status, and arXiv search
        if (req.path === '/health' || 
            req.path === '/auth/status' || 
            req.path === '/papers/search-arxiv' ||
            req.path.startsWith('/papers/search-arxiv') ||
            req.originalUrl.includes('/papers/search-arxiv')) {
            return next();
        }

        console.log('Auth middleware: Processing request to', req.path);

        // Get token from Authorization header
        const authHeader = req.headers.authorization;
        console.log('Auth middleware: Authorization header:', authHeader ? 'Present' : 'Missing');
        
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            console.log('Auth middleware: No valid authorization header found');
            return res.status(401).json({
                error: 'Access token required',
                code: 401
            });
        }

        const token = authHeader.split(' ')[1];
        console.log('Auth middleware: Extracted token:', token.substring(0, 20) + '...');
        
        // Check for development mode token
        if (token.startsWith('dev_mock_token_') && process.env.NODE_ENV === 'development') {
            console.log('Auth middleware: Using development mode authentication');
            
            // Mock user for development
            req.user = {
                id: '1',
                email: 'dev@test.com',
                user_metadata: {
                    full_name: 'Development User',
                    name: 'Dev User'
                },
                app_metadata: {}
            };
            
            req.token = token;
            console.log('Auth middleware: Development authentication successful');
            return next();
        }
        
        // Verify token with Supabase using admin client
        const supabase = req.app.locals.supabase;
        
        // Try to get user with the provided token
        const { data: { user }, error } = await supabase.auth.getUser(token);
        
        console.log('Auth middleware: Supabase validation result:', {
            user: user ? 'Present' : 'Missing',
            error: error ? error.message : 'None'
        });
        
        if (error || !user) {
            console.log('Auth middleware: Token validation failed:', error?.message);
            return res.status(401).json({
                error: 'Invalid or expired token',
                code: 401,
                details: error?.message
            });
        }

        console.log('Auth middleware: Authentication successful for user:', user.email);

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