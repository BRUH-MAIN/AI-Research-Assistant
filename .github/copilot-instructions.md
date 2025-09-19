# AI Research Assistant - Copilot Instructions

## Architecture Overview

This is a **separated 3-service architecture** for academic paper research and AI chat:

- **Frontend (Next.js)**: Port 3000, TypeScript, Tailwind CSS, Supabase auth
- **Express DB Server**: Port 3001, handles database operations via Supabase RPC calls
- **FastAPI AI Server**: Port 8000, handles AI/ML operations and chat functionality

**Critical**: The Express server manages ALL database operations through Supabase RPC functions, while FastAPI focuses solely on AI processing. Never mix database logic into FastAPI endpoints.

## Key Development Workflows

### Starting Development Environment
```bash
./start-dev-docker.sh  # Full stack with live reload
./start-docker.sh      # Production mode
```

### Service Communication Pattern
- Frontend → Express DB (3001) for all database operations
- Frontend → FastAPI AI (8000) for chat and AI features
- Express server uses Supabase RPC functions in `sql-functions/` directory

### Database Schema & Migrations
- Primary database is **Supabase PostgreSQL** (port 54322 locally)
- Schema defined in `supabase/migrations/`
- RPC functions in `sql-functions/` exposed through Express endpoints
- Mock data fallbacks in `backend/app/db/models.py` when DB unavailable

## Project-Specific Patterns

### Environment Configuration
- Frontend uses `NEXT_PUBLIC_*` prefixed env vars
- Supabase client creation pattern repeated across components (consolidation opportunity)
- Express DB URL: `NEXT_PUBLIC_EXPRESS_DB_URL`
- FastAPI URL: `NEXT_PUBLIC_FASTAPI_BACKEND_URL`

### API Endpoint Organization
- Express routes in `express-db-server/routes/` (users, papers, sessions, etc.)
- FastAPI routes in `backend/app/api/v1/` (chat, AI metadata, system)
- Frontend services in `frontend/src/app/services/` abstract API calls

### Authentication Pattern
- Supabase Auth integration across all services
- JWT tokens passed between services
- User context managed in frontend components

### File Structure Conventions
- Backend follows standard FastAPI structure with clear separation of concerns
- Frontend uses Next.js 13+ app router structure
- Express server has traditional MVC-like organization
- Database functions stored separately in `sql-functions/`

## Critical Integration Points

### Supabase Configuration
- Local Supabase instance configured in `supabase/config.toml`
- API port 54321, DB port 54322, major version 17
- RPC functions enable complex database operations through simple Express endpoints

### Cross-Service Communication
- Express server acts as database proxy, never bypass it for DB operations
- FastAPI handles AI chat sessions with Redis backend (when enabled)
- Frontend services abstract the dual-backend architecture

### Development Dependencies
- UV package manager for Python dependencies
- Docker Compose orchestrates all services
- Supabase CLI for database management

## Error Handling Patterns
- Mock data fallbacks in FastAPI when database unavailable
- Environment-specific error handling in Express middleware
- Frontend services handle both Express and FastAPI error responses

## Testing & Debugging
- FastAPI auto-docs available at `localhost:8000/docs`
- Express health check at `localhost:3001/health`
- Supabase dashboard for database inspection

When modifying this codebase:
1. **Database changes**: Update Supabase migrations AND corresponding RPC functions
2. **API changes**: Maintain service separation (DB operations → Express, AI operations → FastAPI)
3. **Frontend changes**: Update corresponding service files for API abstraction
4. **Environment changes**: Update both Docker configs and local .env files