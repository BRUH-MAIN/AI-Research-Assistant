# FastAPI Chat Backend Migration Guide

## Overview

This document outlines the recent migration of the frontend chat service from the Express backend to the FastAPI backend. This change improves AI chat functionality and provides better performance for real-time interactions.

## Changes Made

### 1. Frontend Chat Service Configuration

The chat service has been updated to use the FastAPI backend instead of the Express backend.

#### Before (Express Backend)
```typescript
// Using Express server on port 3001
const EXPRESS_DB_URL = process.env.NEXT_PUBLIC_EXPRESS_DB_URL || 'http://localhost:3001';
```

#### After (FastAPI Backend)
```typescript
// Using FastAPI server on port 8000
const FASTAPI_URL = process.env.NEXT_PUBLIC_FASTAPI_URL || 'http://localhost:8000';
```

### 2. API Endpoint Changes

The chat service now uses FastAPI's REST endpoints instead of Express endpoints.

#### Session Management

| Operation | Express Endpoint | FastAPI Endpoint |
|-----------|------------------|------------------|
| Create Session | `POST /api/sessions/create` | `POST /api/v1/chat/sessions` |
| Get History | `GET /api/sessions/{id}/history` | `GET /api/v1/chat/{session_id}/history` |
| Send Message | `POST /api/sessions/{id}/message` | `POST /api/v1/chat/{session_id}` |
| Delete Session | `DELETE /api/sessions/{id}` | `DELETE /api/v1/chat/{session_id}` |
| Health Check | `GET /` | `GET /health` |

#### Request/Response Format Changes

**Create Session:**
```typescript
// Express Response
{ sessionId: string }

// FastAPI Response
{ session_id: string }
```

**Send Message:**
```typescript
// Express Request
{
  id: string,
  sender: 'user' | 'ai',
  content: string,
  timestamp: Date
}

// FastAPI Request
{
  message: string,
  user_id: string | null
}

// FastAPI Response
{
  message: {
    id: string,
    content: string,
    role: string,
    timestamp: string,
    user_id: string | null
  },
  session_id: string
}
```

### 3. Authentication Changes

The chat service has been simplified to remove Supabase authentication dependency for now:

#### Before
```typescript
// Required Supabase authentication
private async getAuthenticatedApiClient(): Promise<ApiClient> {
  const apiClient = new ApiClient(`${EXPRESS_DB_URL}/api`);
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.access_token) {
    apiClient.setAuthToken(session.access_token);
  }
  return apiClient;
}
```

#### After
```typescript
// Direct fetch calls without authentication
async healthCheck(): Promise<boolean> {
  try {
    const response = await fetch(`${FASTAPI_URL}/health`);
    return response.status === 200;
  } catch (error) {
    console.error('Health check failed:', error);
    return false;
  }
}
```

## Backend Services Architecture

### Express Backend (Port 3001)
- **Purpose**: Database operations, user management, paper management
- **Technologies**: Node.js, Express, Supabase integration
- **Status**: Still active for non-chat functionality

### FastAPI Backend (Port 8000)
- **Purpose**: AI chat functionality, real-time message processing
- **Technologies**: Python, FastAPI, Groq AI integration
- **Status**: Primary chat backend

## Environment Configuration

### Required Environment Variables

For the FastAPI backend to work properly, ensure these environment variables are set:

```bash
# FastAPI Configuration
NEXT_PUBLIC_FASTAPI_URL=http://localhost:8000
GROQ_API_KEY=your_groq_api_key_here

# Express Backend (still needed for other services)
NEXT_PUBLIC_EXPRESS_DB_URL=http://localhost:3001
```

### Docker Environment

The FastAPI backend runs in a Docker container with the following configuration:

```yaml
fastapi-ai-server:
  build:
    context: .
    dockerfile: Dockerfile.backend
  ports:
    - "8000:8000"
  environment:
    - GROQ_API_KEY=${GROQ_API_KEY}
    - REDIS_URL=${REDIS_URL}
  depends_on:
    - redis-cache
```

## Testing the Migration

### 1. Verify Backend Services

```bash
# Test FastAPI health
curl http://localhost:8000/health
# Expected: {"status":"healthy"}

# Test Express health
curl http://localhost:3001
# Expected: Express server response
```

### 2. Test Chat Functionality

```bash
# Create a new chat session
curl -X POST http://localhost:8000/api/v1/chat/sessions
# Expected: {"session_id":"uuid"}

# Send a message
curl -X POST http://localhost:8000/api/v1/chat/{session_id} \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello", "user_id": null}'
```

### 3. Frontend Integration Test

1. Open the frontend at `http://localhost:3000`
2. Navigate to the chat interface
3. Verify that the health check passes
4. Try sending a message and confirm AI response

## Troubleshooting

### Common Issues

#### 1. "Backend is not available" Error

**Symptoms:**
- Browser console shows: `GET http://localhost:3001/ 404 (Not Found)`
- Chat functionality not working

**Solutions:**
- Ensure FastAPI server is running: `docker ps | grep fastapi-ai-server`
- Check if port 8000 is accessible: `curl http://localhost:8000/health`
- Verify environment variables are set correctly

#### 2. AI Service Not Configured

**Symptoms:**
- Chat sessions create successfully but AI responses show error messages
- Docker logs show: "Error generating AI response: AI service not configured - missing GROQ_API_KEY"

**Solutions:**
- Set the `GROQ_API_KEY` environment variable
- Restart the FastAPI Docker container
- Verify the API key is valid

#### 3. CORS Issues

**Symptoms:**
- Frontend cannot connect to FastAPI backend
- Browser console shows CORS-related errors

**Solutions:**
- Ensure FastAPI CORS middleware is configured for `http://localhost:3000`
- Check if the frontend URL is whitelisted in FastAPI settings

### Rollback Procedure

If issues arise, you can temporarily rollback to the Express backend:

1. Update `frontend/src/app/services/chatService.ts`:
```typescript
// Change back to Express URL
const BACKEND_URL = process.env.NEXT_PUBLIC_EXPRESS_DB_URL || 'http://localhost:3001';
```

2. Revert the API endpoints to Express format
3. Restore Supabase authentication logic

## Future Improvements

### Planned Enhancements

1. **Authentication Integration**: Integrate user authentication with FastAPI
2. **WebSocket Support**: Add real-time chat using WebSocket connections
3. **Error Handling**: Improve error handling and user feedback
4. **Performance Optimization**: Add caching and request optimization

### Migration Roadmap

1. **Phase 1** ✅: Basic chat functionality migration
2. **Phase 2**: Authentication integration
3. **Phase 3**: Real-time features (WebSockets)
4. **Phase 4**: Advanced AI features and paper integration

## Related Documentation

- [API Documentation](./API_DOCUMENTATION.md)
- [Frontend Services README](./FRONTEND_SERVICES_README.md)
- [System Status](./SYSTEM_STATUS.md)
- [How to Run](./how_to_run.md)

## Support

For issues related to this migration:

1. Check the [Troubleshooting](#troubleshooting) section above
2. Review Docker container logs: `docker logs fastapi-ai-server`
3. Verify all environment variables are set
4. Ensure both backend services are running

---

*Last updated: September 20, 2025*