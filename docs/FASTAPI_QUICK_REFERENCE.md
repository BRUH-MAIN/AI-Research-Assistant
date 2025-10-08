# FastAPI Chat Backend - Quick Reference

## Summary of Changes

The frontend chat service has been migrated from Express backend (port 3001) to FastAPI backend (port 8000) for improved AI chat functionality.

## Key Changes

### Service Configuration
```typescript
// OLD: Express Backend
const EXPRESS_DB_URL = 'http://localhost:3001';

// NEW: FastAPI Backend  
const FASTAPI_URL = 'http://localhost:8000';
```

### API Endpoints Quick Reference

| Function | Old Endpoint | New Endpoint |
|----------|-------------|--------------|
| Health Check | `GET /` | `GET /health` |
| Create Session | `POST /api/sessions/create` | `POST /api/v1/chat/sessions` |
| Get History | `GET /api/sessions/{id}/history` | `GET /api/v1/chat/{session_id}/history` |
| Send Message | `POST /api/sessions/{id}/message` | `POST /api/v1/chat/{session_id}` |
| Delete Session | `DELETE /api/sessions/{id}` | `DELETE /api/v1/chat/{session_id}` |

### Response Format Changes

**Create Session:**
```javascript
// Old: { sessionId: string }
// New: { session_id: string }
```

**Send Message Request:**
```javascript
// Old: { id, sender, content, timestamp }
// New: { message: string, user_id: string | null }
```

## Environment Variables

```bash
# Required for FastAPI
NEXT_PUBLIC_FASTAPI_URL=http://localhost:8000
GROQ_API_KEY=your_groq_api_key_here

# Still needed for other services
NEXT_PUBLIC_EXPRESS_DB_URL=http://localhost:3001
```

## Quick Tests

```bash
# Test FastAPI is running
curl http://localhost:8000/health

# Create chat session
curl -X POST http://localhost:8000/api/v1/chat/sessions

# Send message
curl -X POST http://localhost:8000/api/v1/chat/{session_id} \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello", "user_id": null}'
```

## Common Issues

1. **"Backend is not available"** → Check FastAPI server on port 8000
2. **"AI service not configured"** → Set GROQ_API_KEY environment variable
3. **CORS errors** → Verify FastAPI CORS settings for localhost:3000

## Files Modified

- `frontend/src/app/services/chatService.ts` - Main service configuration
- Environment variables for Docker containers
- Frontend chat service implementation

---

*For detailed information, see [FASTAPI_MIGRATION_GUIDE.md](./FASTAPI_MIGRATION_GUIDE.md)*