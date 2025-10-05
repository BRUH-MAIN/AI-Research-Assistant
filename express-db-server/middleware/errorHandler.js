// Global error handler middleware

const errorHandler = (err, req, res, next) => {
    console.error('Error occurred:', {
        message: err.message,
        stack: err.stack,
        url: req.url,
        method: req.method,
        timestamp: new Date().toISOString()
    });

    // Handle Supabase/PostgreSQL errors
    if (err.code) {
        // PostgreSQL error codes
        const pgErrorMap = {
            '23505': { status: 409, message: 'Resource already exists' },
            '23514': { status: 400, message: 'Invalid input data' },
            '23503': { status: 400, message: 'Referenced resource not found' },
            'P0002': { status: 404, message: 'Resource not found' },
            'P0001': { status: 501, message: 'Feature not implemented' }
        };

        const mappedError = pgErrorMap[err.code];
        if (mappedError) {
            return res.status(mappedError.status).json({
                error: mappedError.message,
                code: mappedError.status,
                details: err.message
            });
        }
    }

    // Handle validation errors
    if (err.name === 'ValidationError') {
        return res.status(400).json({
            error: 'Validation error',
            code: 400,
            details: err.message
        });
    }

    // Handle JWT errors
    if (err.name === 'JsonWebTokenError') {
        return res.status(401).json({
            error: 'Invalid token',
            code: 401,
            details: err.message
        });
    }

    if (err.name === 'TokenExpiredError') {
        return res.status(401).json({
            error: 'Token expired',
            code: 401,
            details: err.message
        });
    }

    // Handle rate limit errors
    if (err.status === 429) {
        return res.status(429).json({
            error: 'Too many requests',
            code: 429,
            details: 'Rate limit exceeded'
        });
    }

    // Default server error
    res.status(500).json({
        error: 'Internal server error',
        code: 500,
        details: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
    });
};

module.exports = errorHandler;