# AI Research Assistant API - RESTful Endpoints

## Overview
This document describes the RESTful API endpoints for the AI Research Assistant application. The API includes four main modules: Users, Groups, Sessions, and Messages.

## Base URL
- **Development**: `http://localhost:3001/api/v1`
- **API Documentation**: `http://localhost:3001/docs`

## API Modules

### 1. Users Module (`/users`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/users/` | Get all users |
| POST | `/users/` | Create a new user |
| GET | `/users/{user_id}` | Get a specific user |
| PUT | `/users/{user_id}` | Update a specific user |
| DELETE | `/users/{user_id}` | Delete a specific user |
| PATCH | `/users/{user_id}/activate` | Activate a user |
| PATCH | `/users/{user_id}/deactivate` | Deactivate a user |

**Sample User Object:**
```json
{
  "id": 1,
  "name": "Alice",
  "email": "alice@example.com",
  "is_active": true
}
```

### 2. Groups Module (`/groups`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/groups/` | Get all groups |
| POST | `/groups/` | Create a new group |
| GET | `/groups/{group_id}` | Get a specific group |
| PUT | `/groups/{group_id}` | Update a specific group |
| DELETE | `/groups/{group_id}` | Delete a specific group |
| GET | `/groups/{group_id}/members` | Get group members |
| POST | `/groups/{group_id}/members/{user_id}` | Add user to group |
| DELETE | `/groups/{group_id}/members/{user_id}` | Remove user from group |
| GET | `/groups/{group_id}/members/count` | Get member count |

**Sample Group Object:**
```json
{
  "id": 1,
  "name": "Admins",
  "description": "System administrators",
  "member_count": 2
}
```

### 3. Sessions Module (`/sessions`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/sessions/` | Get all sessions (with optional filters) |
| POST | `/sessions/` | Create a new session |
| GET | `/sessions/{session_id}` | Get a specific session |
| PUT | `/sessions/{session_id}` | Update a specific session |
| DELETE | `/sessions/{session_id}` | Delete a specific session |
| PATCH | `/sessions/{session_id}/activate` | Activate a session |
| PATCH | `/sessions/{session_id}/deactivate` | Deactivate a session |
| GET | `/sessions/{session_id}/summary` | Get session summary |
| GET | `/sessions/{session_id}/chat` | Legacy chat endpoint |

**Query Parameters for GET /sessions/:**
- `user_id`: Filter by user ID
- `is_active`: Filter by active status

**Sample Session Object:**
```json
{
  "id": 1,
  "title": "Research Session 1",
  "user_id": 1,
  "created_at": "2025-09-01T10:00:00",
  "updated_at": "2025-09-01T10:30:00",
  "is_active": true,
  "message_count": 5
}
```

### 4. Messages Module (`/messages`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/messages/` | Get messages (with filtering and pagination) |
| POST | `/messages/` | Create a new message |
| GET | `/messages/{message_id}` | Get a specific message |
| PUT | `/messages/{message_id}` | Update a specific message |
| DELETE | `/messages/{message_id}` | Delete a specific message |
| GET | `/messages/sessions/{session_id}/messages` | Get session messages |
| POST | `/messages/sessions/{session_id}/messages` | Create message in session |
| GET | `/messages/sessions/{session_id}/messages/count` | Get session message count |
| GET | `/messages/sessions/{session_id}/messages/latest` | Get latest session messages |
| GET | `/messages/users/{user_id}/messages` | Get user messages |
| GET | `/messages/users/{user_id}/messages/count` | Get user message count |
| GET | `/messages/search` | Search messages |

**Query Parameters for GET /messages/:**
- `session_id`: Filter by session ID
- `user_id`: Filter by user ID
- `message_type`: Filter by message type (user, assistant)
- `limit`: Number of results (default: 100)
- `offset`: Pagination offset (default: 0)

**Sample Message Object:**
```json
{
  "id": 1,
  "session_id": 1,
  "user_id": 1,
  "content": "Hello, I need help with my research project.",
  "message_type": "user",
  "created_at": "2025-09-01T10:00:00",
  "updated_at": "2025-09-01T10:00:00",
  "is_edited": false
}
```

## Features

### Mock Data
All endpoints currently use in-memory mock data for demonstration purposes. The data includes:
- 2 sample users
- 3 sample groups with member relationships
- 2 sample sessions
- 3 sample messages

### Error Handling
- Proper HTTP status codes (200, 201, 204, 404, 409)
- Structured error responses
- Validation for required fields

### Pagination
- Messages endpoint supports pagination with `limit` and `offset` parameters
- Latest messages endpoint for recent conversation history

### Search Functionality
- Message search by content
- Filtering by session, user, and message type

### Relationships
- Messages are linked to sessions and users
- Groups maintain member lists
- Sessions track message counts

## Next Steps

When implementing database integration:
1. Replace mock data with actual database models
2. Add proper authentication and authorization
3. Implement proper validation schemas with Pydantic
4. Add proper logging and monitoring
5. Implement rate limiting
6. Add proper database transactions and relationships

## Testing the API

You can test the API using:
1. **Interactive Documentation**: Visit `http://localhost:3001/docs`
2. **cURL**: Use the command line examples shown above
3. **Postman/Insomnia**: Import the OpenAPI specification from `/docs`

Example cURL commands:
```bash
# Get all users
curl -X GET "http://localhost:3001/api/v1/users/"

# Create a new user
curl -X POST "http://localhost:3001/api/v1/users/" \
  -H "Content-Type: application/json" \
  -d '{"name": "John", "email": "john@example.com"}'

# Get session messages
curl -X GET "http://localhost:3001/api/v1/messages/sessions/1/messages"
```
