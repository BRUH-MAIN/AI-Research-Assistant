// Express.js Server with Supabase Integration
// Main application file

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Set development mode if not already set
if (!process.env.NODE_ENV) {
    process.env.NODE_ENV = 'development';
    console.log('Setting NODE_ENV to development mode');
}

// Import route modules
const userRoutes = require('./routes/users');
const groupRoutes = require('./routes/groups');
const sessionRoutes = require('./routes/sessions');
const messageRoutes = require('./routes/messages');
const paperRoutes = require('./routes/papers');
const feedbackRoutes = require('./routes/feedback');
const aiMetadataRoutes = require('./routes/ai-metadata');
const authRoutes = require('./routes/auth');
const groupChatRoutes = require('./routes/group-chat');
const ragRoutes = require('./routes/rag');

// Import middleware
const authMiddleware = require('./middleware/auth');
const errorHandler = require('./middleware/errorHandler');

const app = express();
const port = process.env.PORT || 3001;

// =====================================================
// SUPABASE CLIENT SETUP
// =====================================================

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing required Supabase environment variables');
    process.exit(1);
}

// Create Supabase client with service role for server-side operations
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

// Make supabase client available to routes
app.locals.supabase = supabase;

// =====================================================
// MIDDLEWARE SETUP
// =====================================================

// Security middleware
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", "data:", "https:"],
        },
    },
}));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000, // Limit each IP to 1000 requests per windowMs
    message: {
        error: 'Too many requests from this IP, please try again later.',
        code: 429
    },
    standardHeaders: true,
    legacyHeaders: false,
});
app.use(limiter);

// CORS configuration
const allowedOrigins = process.env.ALLOWED_ORIGINS 
    ? process.env.ALLOWED_ORIGINS.split(',').map(origin => origin.trim())
    : [
        'http://localhost:3000', 
        'http://127.0.0.1:3000',
        'http://20.205.131.237',
        'http://localhost',
        'https://ungainfully-suppressive-kathy.ngrok-free.dev'
    ];

console.log('CORS allowed origins:', allowedOrigins);

app.use(cors({
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);
        
        if (allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            console.log('CORS blocked origin:', origin);
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Origin', 'X-Requested-With'],
    preflightContinue: false,
    optionsSuccessStatus: 204
}));

// Parse JSON bodies
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging middleware
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
});

// Authentication middleware (except for health check)
app.use('/api', authMiddleware);

// =====================================================
// ROUTES
// =====================================================

// Health check endpoint (no auth required)
app.get('/health', (req, res) => {
    res.json({ 
        status: 'healthy', 
        timestamp: new Date().toISOString(),
        service: 'express-db-server'
    });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/papers', paperRoutes);
app.use('/api/feedback', feedbackRoutes);
app.use('/api/ai-metadata', aiMetadataRoutes);
app.use('/api/group-chat', groupChatRoutes);
app.use('/api/rag', ragRoutes);

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({
        error: 'Endpoint not found',
        code: 404,
        path: req.originalUrl
    });
});

// Global error handler
app.use(errorHandler);

// =====================================================
// SERVER STARTUP
// =====================================================

// Graceful shutdown
const server = app.listen(port, () => {
    console.log(`Express DB Server running on port ${port}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`Supabase URL: ${supabaseUrl}`);
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully');
    server.close(() => {
        console.log('Express server closed');
        process.exit(0);
    });
});

process.on('SIGINT', () => {
    console.log('SIGINT received, shutting down gracefully');
    server.close(() => {
        console.log('Express server closed');
        process.exit(0);
    });
});

module.exports = app;