# Authentication & Security Plan

## Overview
This document outlines the comprehensive security architecture for the migrated Express.js + FastAPI system with Supabase integration.

## Table of Contents
1. [Authentication Architecture](#authentication-architecture)
2. [Supabase Security Configuration](#supabase-security-configuration)
3. [JWT Token Management](#jwt-token-management)
4. [Row Level Security (RLS)](#row-level-security-rls)
5. [PostgreSQL Function Security](#postgresql-function-security)
6. [API Security Layers](#api-security-layers)
7. [Environment Variables & Secrets](#environment-variables--secrets)
8. [Security Best Practices](#security-best-practices)
9. [Monitoring & Logging](#monitoring--logging)
10. [Security Testing](#security-testing)

## Authentication Architecture

### Current State (FastAPI)
- JWT-based authentication
- User sessions managed in database
- Password hashing with bcrypt
- Role-based access control

### Target State (Express + Supabase)
- Supabase Auth for user authentication
- JWT tokens issued by Supabase
- Service-role access for backend operations
- RLS policies for data protection

### Migration Strategy
```mermaid
graph TD
    A[User Login] --> B[Supabase Auth]
    B --> C[JWT Token]
    C --> D[Express Middleware]
    D --> E[User Context]
    E --> F[PostgreSQL Functions]
    F --> G[RLS Policies]
```

## Supabase Security Configuration

### 1. API Keys Management

#### Service Role Key (Backend Only)
```javascript
// express-db-server/config/supabase.js
const { createClient } = require('@supabase/supabase-js');

const supabaseServiceRole = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    },
    db: {
      schema: 'public'
    }
  }
);
```

#### Anonymous Key (Frontend)
```javascript
// frontend/lib/supabase.ts
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);
```

### 2. Database Connection Security
```sql
-- Set connection limits and security
ALTER SYSTEM SET max_connections = 100;
ALTER SYSTEM SET ssl = on;
ALTER SYSTEM SET ssl_cert_file = '/etc/ssl/certs/server.crt';
ALTER SYSTEM SET ssl_key_file = '/etc/ssl/private/server.key';
```

## JWT Token Management

### 1. Token Verification Middleware
```javascript
// express-db-server/middleware/auth.js
const jwt = require('jsonwebtoken');
const { createClient } = require('@supabase/supabase-js');

const verifyToken = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    // Verify with Supabase
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY
    );
    
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    // Set user context for PostgreSQL functions
    req.user = user;
    req.userId = user.id;
    
    next();
  } catch (error) {
    console.error('Token verification error:', error);
    return res.status(401).json({ error: 'Token verification failed' });
  }
};

module.exports = { verifyToken };
```

### 2. User Context Injection
```javascript
// Set user context for PostgreSQL RLS
const setUserContext = async (supabase, userId) => {
  await supabase.rpc('set_request_user_id', { user_id: userId });
};
```

## Row Level Security (RLS)

### 1. Enable RLS on All Tables
```sql
-- Enable RLS on all user-facing tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE papers ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_metadata ENABLE ROW LEVEL SECURITY;
```

### 2. User Access Policies
```sql
-- Users can only access their own data
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (auth.uid() = id);

-- Group access policies
CREATE POLICY "Users can view groups they belong to" ON groups
  FOR SELECT USING (
    id IN (
      SELECT group_id FROM user_groups 
      WHERE user_id = auth.uid()
    )
  );

-- Session access policies
CREATE POLICY "Users can access their sessions" ON sessions
  FOR ALL USING (
    created_by = auth.uid() OR
    id IN (
      SELECT session_id FROM session_users 
      WHERE user_id = auth.uid()
    )
  );
```

### 3. Admin Bypass Function
```sql
-- Function to temporarily bypass RLS for admin operations
CREATE OR REPLACE FUNCTION bypass_rls_for_admin()
RETURNS void AS $$
BEGIN
  -- Only allow for service role
  IF current_setting('role') != 'service_role' THEN
    RAISE EXCEPTION 'Insufficient privileges';
  END IF;
  
  -- Set bypass flag
  PERFORM set_config('app.bypass_rls', 'true', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

## PostgreSQL Function Security

### 1. SECURITY DEFINER Pattern
```sql
-- All functions use SECURITY DEFINER to run with elevated privileges
CREATE OR REPLACE FUNCTION get_user_profile(p_user_id UUID)
RETURNS JSON AS $$
DECLARE
  result JSON;
  current_user_id UUID;
BEGIN
  -- Get the current authenticated user ID
  current_user_id := auth.uid();
  
  -- Security check: users can only access their own profile or public data
  IF current_user_id != p_user_id AND NOT is_admin(current_user_id) THEN
    RAISE EXCEPTION 'Insufficient privileges to access this profile';
  END IF;
  
  -- Function logic here
  SELECT row_to_json(u) INTO result
  FROM users u
  WHERE u.id = p_user_id;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 2. Input Validation & Sanitization
```sql
-- Input validation function
CREATE OR REPLACE FUNCTION validate_email(email TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$';
END;
$$ LANGUAGE plpgsql;

-- Sanitization function
CREATE OR REPLACE FUNCTION sanitize_text(input_text TEXT)
RETURNS TEXT AS $$
BEGIN
  -- Remove potential SQL injection patterns
  RETURN regexp_replace(
    regexp_replace(input_text, '[<>"\'';&|*]', '', 'g'),
    '\s+', ' ', 'g'
  );
END;
$$ LANGUAGE plpgsql;
```

### 3. Audit Logging
```sql
-- Audit log table
CREATE TABLE audit_log (
  id SERIAL PRIMARY KEY,
  table_name VARCHAR(50) NOT NULL,
  operation VARCHAR(10) NOT NULL,
  user_id UUID,
  old_values JSONB,
  new_values JSONB,
  timestamp TIMESTAMP DEFAULT NOW()
);

-- Audit trigger function
CREATE OR REPLACE FUNCTION audit_trigger()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO audit_log (
    table_name, operation, user_id, old_values, new_values
  ) VALUES (
    TG_TABLE_NAME,
    TG_OP,
    auth.uid(),
    row_to_json(OLD),
    row_to_json(NEW)
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

## API Security Layers

### 1. Express Security Middleware
```javascript
// express-db-server/middleware/security.js
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cors = require('cors');

const securityMiddleware = [
  // Security headers
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
      },
    },
  }),

  // CORS configuration
  cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }),

  // Rate limiting
  rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
    message: 'Too many requests from this IP',
    standardHeaders: true,
    legacyHeaders: false,
  }),
];

module.exports = { securityMiddleware };
```

### 2. Input Validation
```javascript
// express-db-server/middleware/validation.js
const { body, param, query, validationResult } = require('express-validator');

const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array()
    });
  }
  next();
};

const userValidation = [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 8 }).matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/),
  body('name').trim().isLength({ min: 1, max: 100 }),
];

module.exports = { validateRequest, userValidation };
```

### 3. Error Handling
```javascript
// express-db-server/middleware/errorHandler.js
const errorHandler = (err, req, res, next) => {
  console.error('Error:', err);

  // Don't leak sensitive information
  if (process.env.NODE_ENV === 'production') {
    // Log full error internally but send generic message
    if (err.name === 'ValidationError') {
      return res.status(400).json({ error: 'Invalid input data' });
    }
    
    return res.status(500).json({ error: 'Internal server error' });
  }

  // Development mode - include more details
  res.status(err.status || 500).json({
    error: err.message,
    stack: err.stack,
  });
};

module.exports = { errorHandler };
```

## Environment Variables & Secrets

### 1. Environment Configuration
```bash
# .env.example
# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Database Configuration
DATABASE_URL=postgresql://postgres:password@localhost:5432/dbname
POSTGRES_DB=postgres
POSTGRES_USER=postgres
POSTGRES_PASSWORD=secure_password

# JWT Configuration
JWT_SECRET=your-jwt-secret-key-minimum-32-characters

# Server Configuration
NODE_ENV=production
PORT=3001
FRONTEND_URL=http://localhost:3000

# Security Configuration
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=1000
LOG_LEVEL=info

# AI Service Configuration (for FastAPI)
OPENAI_API_KEY=your-openai-key
ANTHROPIC_API_KEY=your-anthropic-key
HUGGINGFACE_API_KEY=your-huggingface-key
```

### 2. Secrets Management
```javascript
// express-db-server/config/secrets.js
const secrets = {
  supabase: {
    url: process.env.SUPABASE_URL,
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
    anonKey: process.env.SUPABASE_ANON_KEY,
  },
  jwt: {
    secret: process.env.JWT_SECRET,
  },
  database: {
    url: process.env.DATABASE_URL,
  },
};

// Validate required secrets
const validateSecrets = () => {
  const required = [
    'SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY',
    'JWT_SECRET',
  ];
  
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
};

module.exports = { secrets, validateSecrets };
```

## Security Best Practices

### 1. Password Security
```sql
-- Password hashing function (using pgcrypto)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE OR REPLACE FUNCTION hash_password(password TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN crypt(password, gen_salt('bf', 10));
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION verify_password(password TEXT, hash TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN crypt(password, hash) = hash;
END;
$$ LANGUAGE plpgsql;
```

### 2. Session Management
```sql
-- Session cleanup function
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS void AS $$
BEGIN
  DELETE FROM sessions 
  WHERE updated_at < NOW() - INTERVAL '7 days';
END;
$$ LANGUAGE plpgsql;

-- Schedule cleanup (run daily)
-- Use pg_cron extension or external scheduler
```

### 3. Data Encryption
```sql
-- Encrypt sensitive data
CREATE OR REPLACE FUNCTION encrypt_sensitive_data(data TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN pgp_sym_encrypt(data, current_setting('app.encryption_key'));
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION decrypt_sensitive_data(encrypted_data TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN pgp_sym_decrypt(encrypted_data, current_setting('app.encryption_key'));
END;
$$ LANGUAGE plpgsql;
```

## Monitoring & Logging

### 1. Security Event Logging
```javascript
// express-db-server/utils/securityLogger.js
const winston = require('winston');

const securityLogger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'security.log' }),
    new winston.transports.Console(),
  ],
});

const logSecurityEvent = (event, details, req) => {
  securityLogger.info('Security Event', {
    event,
    details,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    userId: req.user?.id,
    timestamp: new Date().toISOString(),
  });
};

module.exports = { logSecurityEvent };
```

### 2. Database Activity Monitoring
```sql
-- Monitor failed login attempts
CREATE TABLE security_events (
  id SERIAL PRIMARY KEY,
  event_type VARCHAR(50) NOT NULL,
  user_id UUID,
  ip_address INET,
  details JSONB,
  timestamp TIMESTAMP DEFAULT NOW()
);

-- Log security events
CREATE OR REPLACE FUNCTION log_security_event(
  p_event_type VARCHAR(50),
  p_user_id UUID DEFAULT NULL,
  p_ip_address INET DEFAULT NULL,
  p_details JSONB DEFAULT NULL
)
RETURNS void AS $$
BEGIN
  INSERT INTO security_events (event_type, user_id, ip_address, details)
  VALUES (p_event_type, p_user_id, p_ip_address, p_details);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

## Security Testing

### 1. Authentication Tests
```javascript
// tests/security/auth.test.js
const request = require('supertest');
const app = require('../../app');

describe('Authentication Security', () => {
  test('should reject requests without token', async () => {
    const response = await request(app)
      .get('/api/users/profile')
      .expect(401);
    
    expect(response.body.error).toBe('No token provided');
  });

  test('should reject invalid tokens', async () => {
    const response = await request(app)
      .get('/api/users/profile')
      .set('Authorization', 'Bearer invalid_token')
      .expect(401);
    
    expect(response.body.error).toBe('Invalid token');
  });

  test('should rate limit excessive requests', async () => {
    // Make multiple requests to trigger rate limit
    const promises = Array(101).fill().map(() => 
      request(app).get('/api/users')
    );
    
    const responses = await Promise.all(promises);
    const rateLimitedResponses = responses.filter(r => r.status === 429);
    
    expect(rateLimitedResponses.length).toBeGreaterThan(0);
  });
});
```

### 2. SQL Injection Tests
```javascript
// tests/security/sqlInjection.test.js
describe('SQL Injection Protection', () => {
  test('should prevent SQL injection in user queries', async () => {
    const maliciousInput = "'; DROP TABLE users; --";
    
    const response = await request(app)
      .post('/api/users')
      .set('Authorization', `Bearer ${validToken}`)
      .send({
        name: maliciousInput,
        email: 'test@example.com'
      });
    
    // Should either sanitize input or reject request
    expect(response.status).not.toBe(500);
    
    // Verify users table still exists
    const usersCheck = await request(app)
      .get('/api/users')
      .set('Authorization', `Bearer ${validToken}`)
      .expect(200);
    
    expect(Array.isArray(usersCheck.body)).toBe(true);
  });
});
```

### 3. RLS Policy Tests
```sql
-- Test RLS policies
DO $$
DECLARE
  test_user_id UUID := gen_random_uuid();
  other_user_id UUID := gen_random_uuid();
BEGIN
  -- Set up test data
  INSERT INTO users (id, email, name) VALUES (test_user_id, 'test@example.com', 'Test User');
  INSERT INTO users (id, email, name) VALUES (other_user_id, 'other@example.com', 'Other User');
  
  -- Test user can only see their own data
  PERFORM set_config('request.jwt.claim.sub', test_user_id::text, true);
  
  IF (SELECT COUNT(*) FROM users WHERE id = other_user_id) > 0 THEN
    RAISE EXCEPTION 'RLS policy failed: user can see other user data';
  END IF;
  
  IF (SELECT COUNT(*) FROM users WHERE id = test_user_id) != 1 THEN
    RAISE EXCEPTION 'RLS policy failed: user cannot see own data';
  END IF;
  
  -- Cleanup
  DELETE FROM users WHERE id IN (test_user_id, other_user_id);
  
  RAISE NOTICE 'RLS policies working correctly';
END $$;
```

## Security Checklist

### Pre-Migration
- [ ] Audit current FastAPI security implementation
- [ ] Review all database access patterns
- [ ] Identify sensitive data requiring encryption
- [ ] Document current authentication flows

### During Migration
- [ ] Implement Supabase authentication
- [ ] Configure RLS policies for all tables
- [ ] Create SECURITY DEFINER functions
- [ ] Set up JWT verification middleware
- [ ] Configure rate limiting and CORS
- [ ] Implement input validation
- [ ] Set up audit logging

### Post-Migration
- [ ] Conduct security testing
- [ ] Perform penetration testing
- [ ] Review and test all RLS policies
- [ ] Validate JWT token handling
- [ ] Test rate limiting effectiveness
- [ ] Verify audit logging functionality
- [ ] Update security documentation

### Production Deployment
- [ ] Use secure secrets management
- [ ] Enable SSL/TLS encryption
- [ ] Configure firewall rules
- [ ] Set up monitoring and alerting
- [ ] Implement backup and recovery
- [ ] Document incident response procedures

## Incident Response Plan

### 1. Security Incident Classification
- **Critical**: Data breach, unauthorized admin access
- **High**: Authentication bypass, privilege escalation
- **Medium**: Suspicious activity, failed login attempts
- **Low**: Rate limit exceeded, minor configuration issues

### 2. Response Procedures
1. **Immediate**: Isolate affected systems
2. **Investigation**: Analyze logs and audit trails
3. **Containment**: Apply security patches
4. **Recovery**: Restore from secure backups
5. **Post-incident**: Update security measures

### 3. Contact Information
```javascript
// Security contact configuration
const securityContacts = {
  primary: 'security@yourcompany.com',
  emergency: '+1-XXX-XXX-XXXX',
  escalation: 'cto@yourcompany.com'
};
```

## Conclusion

This security plan provides comprehensive protection for the migrated Express.js + FastAPI system. Key security features include:

- **Multi-layered authentication** with Supabase and JWT
- **Row-level security** for data protection
- **SECURITY DEFINER functions** for controlled database access
- **Comprehensive input validation** and sanitization
- **Rate limiting and CORS** protection
- **Audit logging and monitoring** for security events
- **Encryption** for sensitive data
- **Security testing** procedures

Regular security reviews and updates should be conducted to maintain the security posture as the system evolves.