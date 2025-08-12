# Backend API Structure

This backend follows FastAPI best practices with a modular, scalable architecture.

## Project Structure

```
backend/
├── app/                     # Main application package
│   ├── __init__.py
│   ├── main.py             # FastAPI application factory
│   ├── api/                # API layer
│   │   ├── __init__.py
│   │   └── v1/             # API version 1
│   │       ├── __init__.py
│   │       ├── api.py      # Main API router
│   │       ├── chat.py     # Chat endpoints
│   │       └── system.py   # System/health endpoints
│   ├── core/               # Core configuration
│   │   ├── __init__.py
│   │   └── config.py       # Application settings
│   ├── db/                 # Database layer
│   │   ├── __init__.py
│   │   └── redis_client.py # Redis client
│   ├── models/             # Pydantic models
│   │   ├── __init__.py
│   │   ├── chat.py         # Chat-related models
│   │   └── responses.py    # Response models
│   └── services/           # Business logic
│       ├── __init__.py
│       ├── ai_service.py   # AI/Groq service
│       └── chat_service.py # Chat session service
├── run.py                  # Application entry point
├── requirements.txt        # Python dependencies
├── start.sh               # Startup script
└── README_STRUCTURE.md    # This file
```

## Architecture Benefits

### 1. **Separation of Concerns**
- **API Layer**: Handles HTTP requests/responses
- **Services Layer**: Contains business logic
- **Models Layer**: Data validation and serialization
- **DB Layer**: Database operations
- **Core Layer**: Configuration and settings

### 2. **Scalability**
- Easy to add new endpoints by creating new routers
- Services can be easily replaced or extended
- Database layer abstraction allows easy switching

### 3. **Maintainability**
- Clear file organization
- Single responsibility principle
- Easy to locate and modify specific functionality

### 4. **Testing**
- Each layer can be tested independently
- Easy to mock dependencies
- Clear separation makes unit testing straightforward

## API Endpoints

### System Endpoints
- `GET /api/v1/` - Health check
- `GET /api/v1/status` - Service status
- `GET /api/v1/debug/sessions` - Debug: list sessions
- `GET /api/v1/debug/redis` - Debug: Redis connection

### Chat Endpoints
- `POST /api/v1/chat/sessions` - Create new session
- `GET /api/v1/chat/{session_id}/history` - Get chat history
- `POST /api/v1/chat/{session_id}` - Send message
- `DELETE /api/v1/chat/{session_id}` - Delete session
- `POST /api/v1/chat` - Legacy endpoint (backward compatibility)

## Configuration

All configuration is centralized in `app/core/config.py` using Pydantic settings:

- **API Settings**: Project name, version, CORS
- **Groq Settings**: API key, model configuration
- **Redis Settings**: Connection details, TTL
- **Chat Settings**: History limits, etc.

## Running the Application

```bash
# Using the startup script
./start.sh

# Or directly
python run.py

# Or with uvicorn
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

## Migration from Old Structure

The new structure maintains backward compatibility:

1. **Legacy endpoints** still work at `/api/v1/chat`
2. **Same functionality** with improved organization
3. **Environment variables** remain the same
4. **Redis configuration** unchanged

## Development Workflow

1. **Add new endpoints**: Create router in `app/api/v1/`
2. **Add business logic**: Create service in `app/services/`
3. **Add data models**: Create models in `app/models/`
4. **Configure settings**: Update `app/core/config.py`
5. **Database operations**: Extend `app/db/` modules
