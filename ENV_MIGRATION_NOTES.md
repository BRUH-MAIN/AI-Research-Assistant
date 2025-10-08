# Environment Configuration Migration

## Date: September 25, 2025

All environment variables have been consolidated into a single `.env` file at the project root.

## Original Files Locations (now consolidated):
- `/.env` - **Main unified file (USE THIS)**
- `/frontend/.env.local` - **Removed - variables moved to main .env**
- `/express-db-server/.env` - **Removed - variables moved to main .env**
- `/backend/.env` - **Removed - variables moved to main .env**

## Key Changes:
1. All services now use `env_file: .env` in docker-compose.yml
2. Frontend variables are prefixed with `NEXT_PUBLIC_*`
3. Google OAuth configuration is included
4. All URLs use `127.0.0.1` for Google OAuth compatibility

## How to Use:
- Modify only the root `.env` file for all environment changes
- All services automatically inherit the variables
- Docker Compose will load the `.env` file for all containers

## Service-Specific Variables:
- **Frontend**: `NEXT_PUBLIC_*` prefixed variables
- **Express Server**: Backend service configurations
- **FastAPI**: AI/ML service configurations
- **Supabase**: Authentication and database configurations