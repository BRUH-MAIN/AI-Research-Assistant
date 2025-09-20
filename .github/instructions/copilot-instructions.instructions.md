---
applyTo: '**'
---
use sudo when using docker commands
# AI Research Assistant - Copilot Instructions

## Architecture Overview

This is a **separated 3-service architecture** for academic paper research and AI chat with **complete database separation**:

- **Frontend (Next.js)**: Port 3000, TypeScript, Tailwind CSS, Supabase auth
- **Express DB Server**: Port 3001, handles ALL database operations via Supabase RPC calls
- **FastAPI AI Server**: Port 8000, handles ONLY AI/ML operations and chat functionality

**Critical**: FastAPI has **ZERO** database interactions. The Express server manages ALL database operations through Supabase RPC functions. FastAPI only handles AI processing and uses Express for any data persistence needs.

## Key Development Workflows

### Starting Development Environment
```bash
./start-dev-docker.sh  # Full stack with live reload
./start-docker.sh      # Production mode
```

### Service Communication Pattern
- Frontend → Express DB (3001) for ALL database operations
- Frontend → FastAPI AI (8000) ONLY for chat and AI features
- FastAPI → Express DB (3001) for chat persistence (via HTTP client)
- Express server uses Supabase RPC functions in `sql-functions/` directory

### Database Schema & Migrations
- Primary database is **Supabase PostgreSQL** (port 54322 locally)
- Schema defined in `supabase/migrations/`
- RPC functions in `sql-functions/` exposed through Express endpoints
- FastAPI has NO direct database access - uses Express HTTP client for persistence

## Project-Specific Patterns

### Environment Configuration
- Frontend uses `NEXT_PUBLIC_*` prefixed env vars
- Supabase client creation pattern repeated across components (consolidation opportunity)
- Express DB URL: `NEXT_PUBLIC_EXPRESS_DB_URL` (port 3001)
- FastAPI URL: `NEXT_PUBLIC_FASTAPI_URL` (port 8000)
- FastAPI config includes `EXPRESS_DB_URL` for HTTP client communication

### API Endpoint Organization
- Express routes in `express-db-server/routes/` (users, papers, sessions, messages, etc.)
- FastAPI routes in `backend/app/api/v1/` (chat, AI operations, system health only)
- Frontend services in `frontend/src/app/services/` abstract API calls:
  - `chatService.ts` → FastAPI for AI chat
  - All other services → Express for database operations

### Authentication Pattern
- Supabase Auth integration across all services
- JWT tokens passed between services
- User context managed in frontend components

### File Structure Conventions
- Backend follows standard FastAPI structure with clear separation of concerns
- Frontend uses Next.js 13+ app router structure
- Express server has traditional MVC-like organization
- Database functions stored separately in `sql-functions/`
- Deprecated FastAPI database files moved to `*/deprecated/` directories

## Critical Integration Points

### Supabase Configuration
- Local Supabase instance configured in `supabase/config.toml`
- API port 54321, DB port 54322, major version 17
- RPC functions enable complex database operations through simple Express endpoints
- FastAPI has NO Supabase client or direct database connection

### Cross-Service Communication
- Express server acts as the ONLY database proxy - never bypass it for DB operations
- FastAPI handles AI chat sessions with optional persistence via Express HTTP client
- Frontend services properly route to correct backend (Express vs FastAPI)
- FastAPI uses `express_client.py` service for any database needs

### Development Dependencies
- UV package manager for Python dependencies
- Docker Compose orchestrates all services
- Supabase CLI for database management
- httpx library in FastAPI for Express communication

## Error Handling Patterns
- FastAPI chat service includes fallback to in-memory storage when Express unavailable
- Environment-specific error handling in Express middleware
- Frontend services handle both Express and FastAPI error responses

## Testing & Debugging
- FastAPI auto-docs available at `localhost:8000/docs` (shows only AI/chat endpoints)
- Express health check at `localhost:3001/health`
- Supabase dashboard for database inspection

## IMPORTANT: Database Migration Complete

**FastAPI NO LONGER interacts with the database directly.** All database operations have been migrated to Express:

1. **Database models and managers**: Moved to `*/deprecated/` directories
2. **Database routes**: Removed from FastAPI API router
3. **Chat persistence**: Now uses Express HTTP client with in-memory fallback
4. **Configuration**: FastAPI includes `EXPRESS_DB_URL` for HTTP communication

When modifying this codebase:
1. **Database changes**: Update Supabase migrations AND corresponding RPC functions
2. **API changes**: Maintain strict service separation (DB operations → Express, AI operations → FastAPI)
3. **Frontend changes**: Ensure correct service routing (chat → FastAPI, data → Express)
4. **FastAPI changes**: NEVER add direct database connections - use Express HTTP client instead
5. **Environment changes**: Update both Docker configs and local .env files
