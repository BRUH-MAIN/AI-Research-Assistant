# AI Research Assistant - Complete Documentation

## Table of Contents

1. [Project Overview](#project-overview)
2. [Architecture](#architecture)
3. [Service Communication](#service-communication)
4. [Database Schema](#database-schema)
5. [API Endpoints](#api-endpoints)
6. [Authentication System](#authentication-system)
7. [Frontend Development](#frontend-development)
8. [Docker Configuration](#docker-configuration)
9. [Development Setup](#development-setup)
10. [Production Deployment](#production-deployment)
11. [Environment Configuration](#environment-configuration)
12. [Troubleshooting](#troubleshooting)
13. [Best Practices](#best-practices)

## Project Overview

AI Research Assistant is a full-stack application for searching, downloading, and managing academic papers with ArXiv integration and intelligent chat functionality. The system follows a separated 3-service architecture with complete database separation.

### Key Features

- **Paper Search & Management**: Search and store academic papers from ArXiv
- **AI Chat Interface**: Intelligent discussion of papers with AI assistance
- **Group Management**: Collaborative research sessions
- **User Authentication**: Secure login and user management
- **Modern Tech Stack**: Next.js frontend, Express.js DB server, FastAPI AI server

### Recent Updates

- **Global User Context System**: Centralized authentication system
- **Database Migration Complete**: FastAPI no longer interacts with the database directly
- **Improved Error Handling**: Better error management across services

## Architecture

The project uses a **separated 3-service architecture** with complete database separation:

1. **Frontend (Next.js)**: Port 3000
   - TypeScript, Tailwind CSS
   - Supabase Auth integration
   - App Router structure

2. **Express DB Server**: Port 3001
   - Handles ALL database operations
   - Uses Supabase RPC functions
   - Manages authentication validation

3. **FastAPI AI Server**: Port 8000
   - Handles ONLY AI/ML operations and chat
   - Has ZERO database interactions
   - Uses Express HTTP client for persistence

4. **Database Layer**:
   - Supabase PostgreSQL (port 54322 locally)
   - Schema defined in migrations
   - Accessed exclusively through Express

### Project Structure

```
project-root/
├── backend/                   # FastAPI AI server
│   ├── app/                  # Core application code
│   │   ├── api/             # API routes
│   │   ├── core/            # Configuration
│   │   ├── db/              # Database clients (uses Express)
│   │   ├── models/          # Data models
│   │   └── services/        # Business logic
├── express-db-server/        # Express database server
│   ├── middleware/          # Auth and error middleware
│   ├── routes/              # API routes for data access
├── frontend/                 # Next.js frontend
│   ├── lib/                # Utilities
│   ├── src/                # Source code
│   │   ├── app/           # Next.js App Router
│   │   │   ├── components/# Reusable UI components
│   │   │   ├── contexts/  # React Context providers
│   │   │   ├── hooks/     # Custom React hooks
│   │   │   ├── services/  # API and business logic
│   │   │   └── types/     # TypeScript definitions
├── sql-functions/           # SQL functions for Supabase
├── supabase/                # Supabase configuration
│   ├── migrations/         # Database migrations
├── docker-compose.yml       # Docker services configuration
├── Dockerfile.frontend      # Frontend container
├── Dockerfile.backend       # Backend container
└── nginx.conf              # Nginx reverse proxy config
```

## Service Communication

### Communication Patterns

1. **Frontend → Express DB Server**: All database operations
   ```typescript
   // Example: Fetching user data
   const users = await fetch(`${process.env.NEXT_PUBLIC_EXPRESS_DB_URL}/api/users/`);
   ```

2. **Frontend → FastAPI AI Server**: Only for AI/chat features
   ```typescript
   // Example: Sending a chat message
   const response = await fetch(`${process.env.NEXT_PUBLIC_FASTAPI_URL}/ai/chat/session`, {
     method: 'POST',
     body: JSON.stringify({ message: 'Hello AI!' })
   });
   ```

3. **FastAPI → Express DB Server**: For chat persistence
   ```python
   # Example: Storing chat messages
   async def save_message(message: dict):
       response = await httpx.post(
           f"{EXPRESS_DB_URL}/api/messages/",
           json=message,
           headers={"Authorization": f"Bearer {token}"}
       )
   ```

### Authentication Flow

1. User authenticates with Supabase Auth
2. JWT token is stored in client
3. Token is passed in headers for API requests
4. Both Express and FastAPI validate tokens
5. Express handles user data lookup

## Database Schema

The database uses a PostgreSQL schema with multiple related tables:

### Core Tables

1. **users**
   - `user_id` (PK): Internal user identifier
   - `auth_user_id`: Supabase authentication ID
   - `email`: User email
   - `first_name`, `last_name`: User name
   - `profile_picture_url`: User avatar
   - `availability`: User status

2. **groups**
   - `group_id` (PK): Group identifier
   - `name`: Group name
   - `description`: Group description
   - `created_by`: User who created the group
   - `invite_code`: Unique join code
   - `is_public`: Public visibility flag

3. **group_participants**
   - `group_participant_id` (PK)
   - `group_id` (FK): Reference to groups
   - `user_id` (FK): Reference to users
   - `role`: Participant role (owner, admin, member)

4. **sessions**
   - `session_id` (PK): Chat session identifier
   - `title`: Session title
   - `description`: Session description
   - `created_by` (FK): Reference to users
   - `group_id` (FK): Optional reference to groups
   - `status`: Session status

5. **messages**
   - `message_id` (PK): Message identifier
   - `session_id` (FK): Reference to sessions
   - `sender_id` (FK): Reference to users
   - `content`: Message content
   - `message_type`: Type of message
   - `sent_at`: Timestamp

6. **papers**
   - `paper_id` (PK): Paper identifier
   - `title`: Paper title
   - `authors`: Paper authors
   - `abstract`: Paper abstract
   - `arxiv_id`: ArXiv identifier
   - `doi`: Digital Object Identifier
   - `publish_date`: Publication date

7. **session_papers**
   - `session_id` (FK): Reference to sessions
   - `paper_id` (FK): Reference to papers

### Indexes and Relationships

- Foreign key relationships between tables
- Indexes on frequently queried columns
- Unique constraints on critical fields

## API Endpoints

The API is divided between the Express DB Server and FastAPI AI Server:

### Express DB Server Endpoints (Port 3001)

#### Authentication Routes
- `GET /api/auth/status` - Get authentication status
- `GET /api/auth/me` - Get current user's profile
- `PUT /api/auth/me` - Update user profile
- `POST /api/auth/sync-profile` - Sync profile with Supabase auth

#### User Routes
- `GET /api/users` - Get all users
- `GET /api/users/:id` - Get specific user
- `POST /api/users` - Create new user
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user

#### Group Routes
- `GET /api/groups` - Get all groups
- `POST /api/groups` - Create new group
- `GET /api/groups/:id` - Get specific group
- `PUT /api/groups/:id` - Update group
- `DELETE /api/groups/:id` - Delete group
- `POST /api/groups/:id/join` - Join group with invite code
- `GET /api/groups/:id/members` - Get group members

#### Session Routes
- `GET /api/sessions` - Get all sessions
- `POST /api/sessions` - Create new session
- `GET /api/sessions/:id` - Get specific session
- `PUT /api/sessions/:id` - Update session
- `DELETE /api/sessions/:id` - Delete session
- `POST /api/sessions/:id/join` - Join session
- `GET /api/sessions/:id/participants` - Get participants

#### Message Routes
- `GET /api/messages/session/:sessionId` - Get session messages
- `POST /api/messages` - Send new message
- `GET /api/messages/:id` - Get specific message
- `PUT /api/messages/:id` - Update message
- `DELETE /api/messages/:id` - Delete message

#### Paper Routes
- `GET /api/papers` - Get all papers
- `POST /api/papers` - Create new paper
- `GET /api/papers/:id` - Get specific paper
- `PUT /api/papers/:id` - Update paper
- `DELETE /api/papers/:id` - Delete paper
- `POST /api/papers/search` - Search for papers
- `POST /api/papers/search/arxiv` - Search ArXiv API
- `GET /api/papers/sessions/:sessionId` - Get session papers

### FastAPI AI Server Endpoints (Port 8000)

#### System Routes
- `GET /health` - System health check
- `GET /` - API information

#### Chat Routes
- `POST /ai/chat/sessions` - Create chat session
- `GET /ai/chat/{session_id}/history` - Get chat history
- `POST /ai/chat/{session_id}` - Send message and get AI response
- `DELETE /ai/chat/{session_id}` - Delete chat session
- `POST /ai/chat/group-message` - Handle AI in group chat

## Authentication System

### Overview

The authentication system follows a dual-layer approach:

1. **Primary Layer: Supabase Authentication**
   - Handles user registration, login, session management
   - Provides JWT tokens for API authentication
   - Manages password resets and email verification

2. **Secondary Layer: Internal User Management**
   - Maps Supabase users to internal database records
   - Manages user profiles and application-specific data
   - Provides development authentication modes

### User ID Mapping Process

```
Supabase Auth ID (UUID) ↔ Internal User ID (Integer)
```

The mapping process:
1. Check cached mapping in localStorage
2. Query database for user record by auth_user_id
3. Fallback: lookup by email
4. Create user record if not found
5. Cache and return internal ID

### Development Authentication

For local development, a mock authentication service is available:

```typescript
// Enable development mode
devAuth.setupMockAuth();

// Clear development authentication
devAuth.clearMockAuth();
```

### API Authentication

All protected endpoints require JWT authentication:

```
Authorization: Bearer <jwt_token>
```

## Frontend Development

### Technology Stack

- **Next.js 15.5.3**: React framework with App Router
- **React 19.1.0**: UI library with modern hooks
- **TypeScript 5**: Static type checking
- **Tailwind CSS 4**: Utility-first CSS framework

### Component Architecture

1. **Component-Based Structure**:
   - Reusable UI components in `components/`
   - Feature-specific components organized by domain
   - UI primitives in `components/ui/`

2. **Context-Based State Management**:
   - Global state via React Context
   - UserContext for authentication and user data
   - State isolated to relevant components

### Service Layer Pattern

API communication and business logic is abstracted in services:

```typescript
// Services for specific domains
export class PaperService {
  async getPapers(params?: {
    limit?: number;
    offset?: number;
    search?: string;
  }): Promise<Paper[]> {
    return this.apiClient.get<Paper[]>('/papers', params);
  }
}

// Export singleton instance
export const paperService = new PaperService(apiClient);
```

### Routing Structure

The project uses Next.js App Router with a clear route structure:

```
app/
├── layout.tsx              # Root layout
├── page.tsx               # Home page (/)
├── login/                 # Authentication pages
├── chat/                  # Chat interface
├── groups/                # Group management
├── papers/                # Paper browsing
└── profile/               # User profile
```

## Docker Configuration

### Overview

The Docker setup manages a 3-service architecture with an nginx reverse proxy:

1. **Express DB Server**: `express-db-server` - Port 3001
2. **FastAPI AI Server**: `fastapi-ai-server` - Port 8000
3. **Next.js Frontend**: `frontend` - Port 3000
4. **Nginx Reverse Proxy**: `nginx` - Port 80/443

### Docker Compose Configuration

Key features of the Docker setup:

1. **Container Security**:
   - Non-root users for all services
   - Read-only volume mounts
   - Resource limits

2. **Development Mode**:
   - Live reload for all services
   - Volume mounts for source code
   - Environment variable overrides

3. **Network Configuration**:
   - Internal bridge network
   - External Supabase network
   - Exposed ports for development

4. **Health Checks**:
   - All services implement health checks
   - Automatic restart on failure

### Startup Scripts

1. **Production Startup**:
   ```bash
   ./start-services.sh
   ```

2. **Development Startup**:
   ```bash
   ./start.sh
   ```

## Development Setup

### Quick Start with Docker

```bash
# Clone repository
git clone <repository-url>
cd research-assistant-local

# Start development environment
./start-dev-docker.sh

# Access the application
# Frontend: http://localhost:3000
# Express API: http://localhost:3001
# FastAPI: http://localhost:8000
```

### Manual Setup

#### Backend Setup
```bash
cd backend
python -m venv .venv
source .venv/bin/activate  # or .venv\Scripts\activate on Windows
pip install -r requirements.txt
cp .env.template .env
# Edit .env with your configuration
python run.py
```

#### Express Server Setup
```bash
cd express-db-server
npm install
cp .env.example .env
# Edit .env with your configuration
npm run dev
```

#### Frontend Setup
```bash
cd frontend
npm install
cp .env.example .env.local
# Edit .env.local with your configuration
npm run dev
```

### Environment Configuration

Create a root `.env` file with:

```bash
# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_URL_PUBLIC=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# Database Configuration
DATABASE_URL=postgresql://postgres:password@postgres:5432/postgres

# Server Configuration
FRONTEND_URL=http://localhost:3000
EXPRESS_DB_URL=http://localhost:3001
FAST_API_URL=http://localhost:8000

# AI Configuration
OPENAI_API_KEY=your-openai-api-key-here
ANTHROPIC_API_KEY=your-anthropic-api-key-here
```

## Production Deployment

### Environment Configuration

For production deployment:

```bash
NODE_ENV=production
LOG_LEVEL=warn
DEBUG=false
VERBOSE_LOGGING=false

# Production URLs
SUPABASE_URL=https://your-project.supabase.co
FRONTEND_URL=https://your-domain.com
EXPRESS_DB_URL=https://your-domain.com/api
FAST_API_URL=https://your-domain.com/ai
```

### SSL Certificate Setup

1. Obtain SSL Certificates:
   ```bash
   # Using Let's Encrypt
   certbot certonly --webroot -w ./ssl -d your-domain.com
   ```

2. Update nginx.conf:
   ```nginx
   server {
       listen 443 ssl http2;
       ssl_certificate /etc/nginx/ssl/fullchain.pem;
       ssl_certificate_key /etc/nginx/ssl/privkey.pem;
       # ... rest of configuration
   }
   ```

3. Mount Certificates:
   ```yaml
   volumes:
     - ./ssl:/etc/nginx/ssl:ro
     - /etc/letsencrypt:/etc/letsencrypt:ro
   ```

### Resource Limits

Add resource limits for production:

```yaml
services:
  express-db-server:
    deploy:
      resources:
        limits:
          cpus: '0.5'
          memory: 512M
  
  fastapi-ai-server:
    deploy:
      resources:
        limits:
          cpus: '2.0'
          memory: 2G
```

## Troubleshooting

### Common Issues

#### Service Won't Start
```bash
# Check logs
docker-compose logs [service-name]

# Check container status
docker-compose ps

# Restart specific service
docker-compose restart [service-name]
```

#### Port Conflicts
```bash
# Check port usage
sudo lsof -i :3000

# Kill process using port
sudo kill -9 $(lsof -t -i:3000)
```

#### Permission Issues
```bash
# Fix ownership
sudo chown -R $USER:$USER ./

# Fix permissions for volumes
docker-compose exec fastapi-ai-server chown -R aiuser:aiuser /app
```

#### Network Issues
```bash
# Recreate networks
docker-compose down
docker network prune
docker-compose up

# Check network connectivity
docker-compose exec express-db-server ping fastapi-ai-server
```

### Debugging Commands

```bash
# Enter container shell
docker-compose exec express-db-server bash

# Check environment variables
docker-compose exec express-db-server env

# Monitor resource usage
docker stats

# View container processes
docker-compose top
```

### Log Management

```bash
# View all logs
docker-compose logs

# Follow logs in real-time
docker-compose logs -f

# View specific service logs
docker-compose logs -f express-db-server

# View last N lines
docker-compose logs --tail=50 fastapi-ai-server
```

## Best Practices

### Development

1. **Use Volume Mounts**: For live reload during development
2. **Environment Separation**: Different configs for dev/prod
3. **Health Checks**: Monitor service health continuously
4. **Resource Limits**: Prevent runaway processes

### Component Design

1. **Single Responsibility**: Each component has one clear purpose
2. **Prop Interface Design**: Well-defined TypeScript interfaces
3. **Error Boundaries**: Graceful error handling
4. **Loading States**: Always show loading feedback
5. **Accessibility**: ARIA labels and keyboard navigation

### State Management

1. **Minimize Global State**: Keep state as local as possible
2. **Immutable Updates**: Use functional state updates
3. **Effect Cleanup**: Clean up subscriptions and timers
4. **Memoization**: Use useMemo and useCallback judiciously

### Security

1. **Non-root Users**: All services run as non-root users
2. **Read-only Mounts**: Configuration files mounted as read-only
3. **Resource Limits**: Prevents resource exhaustion attacks
4. **Health Checks**: Early detection of compromised containers
5. **Internal Network**: Services communicate via private network
6. **Minimal Exposure**: Only nginx exposed to public internet

### Database Operations

1. **Always use Express server**: Never bypass it for DB operations
2. **RPC Functions**: Use predefined SQL functions for complex operations
3. **Transaction Safety**: Maintain data integrity
4. **Rate Limiting**: Prevent abuse of database endpoints

### Maintenance

1. **Regular Updates**: Keep base images updated
2. **Image Cleanup**: Remove unused images and containers
3. **Log Rotation**: Prevent disk space issues
4. **Performance Monitoring**: Track resource usage
