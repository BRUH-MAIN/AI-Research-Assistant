# AI Research Assistant - Complete API Endpoints Documentation

## Overview
This document provides the complete API reference for the AI Research Assistant application, including both the FastAPI backend and Express.js middleware endpoints with Supabase integration.

## Base URLs
- **FastAPI Backend**: `http://localhost:8001/api/v1`
- **Express.js Middleware**: `http://localhost:3000/api`
- **Frontend**: `http://localhost:3001`
- **API Documentation**: `http://localhost:8001/docs` (FastAPI Swagger UI)

## Authentication
All endpoints require JWT authentication via Supabase. The token should be included in the Authorization header:
```
Authorization: Bearer <your-jwt-token>
```

---

## 🧑‍💼 Users API

### Core User Operations
| Method | FastAPI Endpoint | Express Endpoint | Description |
|--------|------------------|------------------|-------------|
| GET | `/api/v1/users/` | `/api/users` | Get all users |
| POST | `/api/v1/users/` | `/api/users` | Create a new user |
| GET | `/api/v1/users/{user_id}` | `/api/users/:id` | Get a specific user by ID |
| PUT | `/api/v1/users/{user_id}` | `/api/users/:id` | Update a specific user |
| DELETE | `/api/v1/users/{user_id}` | `/api/users/:id` | Delete a specific user |

### User Status Management
| Method | FastAPI Endpoint | Express Endpoint | Description |
|--------|------------------|------------------|-------------|
| PATCH | `/api/v1/users/{user_id}/activate` | `/api/users/:id/activate` | Activate a user |
| PATCH | `/api/v1/users/{user_id}/deactivate` | `/api/users/:id/deactivate` | Deactivate a user |

### Sample User Object
```json
{
  "id": 1,
  "name": "Alice Johnson",
  "email": "alice@example.com",
  "first_name": "Alice",
  "last_name": "Johnson",
  "is_active": true,
  "created_at": "2025-01-09T10:00:00Z",
  "updated_at": "2025-01-09T10:00:00Z"
}
```

---

## 👥 Groups API

### Core Group Operations
| Method | FastAPI Endpoint | Express Endpoint | Description |
|--------|------------------|------------------|-------------|
| GET | `/api/v1/groups/` | `/api/groups` | Get all groups |
| POST | `/api/v1/groups/` | `/api/groups` | Create a new group |
| GET | `/api/v1/groups/{group_id}` | `/api/groups/:id` | Get a specific group by ID |
| PUT | `/api/v1/groups/{group_id}` | `/api/groups/:id` | Update a specific group |
| DELETE | `/api/v1/groups/{group_id}` | `/api/groups/:id` | Delete a specific group |

### Group Membership Management
| Method | FastAPI Endpoint | Express Endpoint | Description |
|--------|------------------|------------------|-------------|
| GET | `/api/v1/groups/{group_id}/members` | `/api/groups/:id/members` | Get group members |
| POST | `/api/v1/groups/{group_id}/members` | `/api/groups/:id/members/:userId` | Add a member to group |
| DELETE | `/api/v1/groups/{group_id}/members/{user_id}` | `/api/groups/:id/members/:userId` | Remove member from group |
| GET | `/api/v1/groups/{group_id}/members/count` | `/api/groups/:id/members/count` | Get member count |
| POST | `/api/v1/groups/{group_id}/join` | `/api/groups/:id/join` | Join a group |
| DELETE | `/api/v1/groups/{group_id}/leave` | `/api/groups/:id/leave` | Leave a group |
| POST | `/api/v1/groups/{group_id}/invite` | `/api/groups/:id/invite` | Invite user to group |

### Utility Endpoints
| Method | FastAPI Endpoint | Express Endpoint | Description |
|--------|------------------|------------------|-------------|
| GET | `/api/v1/groups/getid` | `/api/groups/getid?name={name}` | Get group ID by name |

### Sample Group Object
```json
{
  "id": 1,
  "name": "Research Team Alpha",
  "description": "AI and ML research collaboration group",
  "created_by": 1,
  "member_count": 5,
  "created_at": "2025-01-09T10:00:00Z",
  "updated_at": "2025-01-09T10:00:00Z"
}
```

---

## 💬 Sessions API

### Core Session Operations
| Method | FastAPI Endpoint | Express Endpoint | Description |
|--------|------------------|------------------|-------------|
| GET | `/api/v1/sessions/` | `/api/sessions` | Get all sessions (with filtering) |
| POST | `/api/v1/sessions/` | `/api/sessions` | Create a new session |
| GET | `/api/v1/sessions/{session_id}` | `/api/sessions/:id` | Get a specific session by ID |
| PUT | `/api/v1/sessions/{session_id}` | `/api/sessions/:id` | Update a specific session |
| DELETE | `/api/v1/sessions/{session_id}` | `/api/sessions/:id` | Delete a specific session |

### Session Management
| Method | FastAPI Endpoint | Express Endpoint | Description |
|--------|------------------|------------------|-------------|
| PATCH | `/api/v1/sessions/{session_id}/activate` | `/api/sessions/:id/activate` | Activate a session |
| PATCH | `/api/v1/sessions/{session_id}/deactivate` | `/api/sessions/:id/deactivate` | Deactivate a session |
| GET | `/api/v1/sessions/{session_id}/summary` | `/api/sessions/:id/summary` | Get session summary |
| GET | `/api/v1/sessions/{session_id}/chat` | `/api/sessions/:id/chat` | Legacy chat endpoint |

### Session Participation
| Method | FastAPI Endpoint | Express Endpoint | Description |
|--------|------------------|------------------|-------------|
| POST | `/api/v1/sessions/{session_id}/join` | `/api/sessions/:id/join` | Join a session |
| DELETE | `/api/v1/sessions/{session_id}/leave` | `/api/sessions/:id/leave` | Leave a session |

### Utility Endpoints
| Method | FastAPI Endpoint | Express Endpoint | Description |
|--------|------------------|------------------|-------------|
| GET | `/api/v1/sessions/getid` | `/api/sessions/getid?title={title}` | Get session ID by title |

### Query Parameters (GET /sessions/)
- `user_id`: Filter by user ID
- `is_active`: Filter by active status (true/false)

### Sample Session Object
```json
{
  "id": 1,
  "title": "Machine Learning Research Discussion",
  "user_id": 1,
  "group_id": 2,
  "created_at": "2025-01-09T10:00:00Z",
  "updated_at": "2025-01-09T10:30:00Z",
  "is_active": true,
  "message_count": 15
}
```

---

## 📨 Messages API

### Core Message Operations
| Method | FastAPI Endpoint | Express Endpoint | Description |
|--------|------------------|------------------|-------------|
| GET | `/api/v1/messages/` | `/api/messages` | Get all messages (with filtering) |
| POST | `/api/v1/messages/` | `/api/messages` | Create a new message |
| GET | `/api/v1/messages/{message_id}` | `/api/messages/:id` | Get a specific message by ID |
| PUT | `/api/v1/messages/{message_id}` | `/api/messages/:id` | Update a specific message |
| DELETE | `/api/v1/messages/{message_id}` | `/api/messages/:id` | Delete a specific message |

### Session Messages
| Method | FastAPI Endpoint | Express Endpoint | Description |
|--------|------------------|------------------|-------------|
| GET | `/api/v1/sessions/{session_id}/messages` | `/api/messages/sessions/:sessionId/messages` | Get messages for a session |
| POST | `/api/v1/sessions/{session_id}/messages` | `/api/messages/sessions/:sessionId/messages` | Create message in session |
| GET | `/api/v1/sessions/{session_id}/messages/count` | `/api/messages/sessions/:sessionId/messages/count` | Get session message count |
| GET | `/api/v1/sessions/{session_id}/messages/latest` | `/api/messages/sessions/:sessionId/messages/latest` | Get latest session messages |

### User Messages
| Method | FastAPI Endpoint | Express Endpoint | Description |
|--------|------------------|------------------|-------------|
| GET | `/api/v1/users/{user_id}/messages` | `/api/messages/users/:userId/messages` | Get user messages |
| GET | `/api/v1/users/{user_id}/messages/count` | `/api/messages/users/:userId/messages/count` | Get user message count |

### Message Search
| Method | FastAPI Endpoint | Express Endpoint | Description |
|--------|------------------|------------------|-------------|
| GET | `/api/v1/messages/search` | `/api/messages/search` | Search messages by content |

### Query Parameters (GET /messages/)
- `session_id`: Filter by session ID
- `user_id`: Filter by user ID
- `message_type`: Filter by message type (user, assistant)
- `limit`: Number of results (default: 100)
- `offset`: Pagination offset (default: 0)

### Sample Message Object
```json
{
  "id": 1,
  "session_id": 1,
  "user_id": 1,
  "content": "Can you help me understand transformers in machine learning?",
  "message_type": "user",
  "created_at": "2025-01-09T10:00:00Z",
  "updated_at": "2025-01-09T10:00:00Z",
  "is_edited": false
}
```

---

## 📄 Papers API

### Core Paper Operations
| Method | FastAPI Endpoint | Express Endpoint | Description |
|--------|------------------|------------------|-------------|
| GET | `/api/v1/papers/` | `/api/papers` | Get all papers |
| POST | `/api/v1/papers/` | `/api/papers` | Create a new paper |
| GET | `/api/v1/papers/{paper_id}` | `/api/papers/:id` | Get a specific paper by ID |
| PUT | `/api/v1/papers/{paper_id}` | `/api/papers/:id` | Update a specific paper |
| DELETE | `/api/v1/papers/{paper_id}` | `/api/papers/:id` | Delete a specific paper |

### Paper Search
| Method | FastAPI Endpoint | Express Endpoint | Description |
|--------|------------------|------------------|-------------|
| GET | `/api/v1/papers/search` | `/api/papers/search` | Search papers by title, abstract, or authors |
| GET | `/api/v1/papers/workflow_search` | `/api/papers/workflow_search` | Workflow-based paper search |
| GET | `/api/v1/papers/arxiv_load_more` | `/api/papers/arxiv_load_more` | Load more papers from arXiv |

### Paper Tags Management
| Method | FastAPI Endpoint | Express Endpoint | Description |
|--------|------------------|------------------|-------------|
| GET | `/api/v1/papers/{paper_id}/tags` | `/api/papers/:id/tags` | Get tags for a specific paper |
| POST | `/api/v1/papers/{paper_id}/tags` | `/api/papers/:id/tags` | Add tags to a specific paper |
| DELETE | `/api/v1/papers/{paper_id}/tags/{tag}` | `/api/papers/:id/tags/:tag` | Remove a specific tag from a paper |

### Session-Paper Relationships
| Method | FastAPI Endpoint | Express Endpoint | Description |
|--------|------------------|------------------|-------------|
| GET | `/api/v1/papers/sessions/{session_id}` | `/api/papers/sessions/:sessionId` | Get papers linked to a specific session |
| POST | `/api/v1/papers/sessions/{session_id}/{paper_id}` | `/api/papers/sessions/:sessionId/:paperId` | Link a paper to a session |
| DELETE | `/api/v1/papers/sessions/{session_id}/{paper_id}` | `/api/papers/sessions/:sessionId/:paperId` | Remove paper from session |

### Sample Paper Object
```json
{
  "id": 1,
  "title": "Attention Is All You Need",
  "abstract": "The dominant sequence transduction models are based on complex recurrent or convolutional neural networks...",
  "authors": "Ashish Vaswani, Noam Shazeer, Niki Parmar, Jakob Uszkoreit, Llion Jones, Aidan N. Gomez, Lukasz Kaiser, Illia Polosukhin",
  "doi": "10.48550/arXiv.1706.03762",
  "published_at": "2017-06-12T00:00:00Z",
  "source_url": "https://arxiv.org/abs/1706.03762",
  "created_at": "2025-01-09T10:00:00Z",
  "updated_at": "2025-01-09T10:00:00Z"
}
```

---

## 📝 Feedback API

### Session Feedback
| Method | FastAPI Endpoint | Express Endpoint | Description |
|--------|------------------|------------------|-------------|
| GET | `/api/v1/sessions/{session_id}/feedback` | `/api/sessions/:sessionId/feedback` | Get all feedback for a specific session |
| POST | `/api/v1/sessions/{session_id}/feedback` | `/api/sessions/:sessionId/feedback` | Create feedback for a specific session |

### Core Feedback Operations
| Method | FastAPI Endpoint | Express Endpoint | Description |
|--------|------------------|------------------|-------------|
| GET | `/api/v1/feedback/{feedback_id}` | `/api/feedback/:id` | Get a specific feedback by ID |
| PUT | `/api/v1/feedback/{feedback_id}` | `/api/feedback/:id` | Update a specific feedback |
| DELETE | `/api/v1/feedback/{feedback_id}` | `/api/feedback/:id` | Delete a specific feedback |

### User Feedback
| Method | FastAPI Endpoint | Express Endpoint | Description |
|--------|------------------|------------------|-------------|
| GET | `/api/v1/users/{user_id}/feedback` | `/api/users/:userId/feedback` | Get all feedback given by a specific user |

### Sample Feedback Object
```json
{
  "id": 1,
  "session_id": 1,
  "given_by": 2,
  "content": "Great research discussion! Very insightful analysis of the transformer architecture.",
  "created_at": "2025-01-09T10:30:00Z"
}
```

---

## 🤖 AI Metadata API

### Message AI Metadata
| Method | FastAPI Endpoint | Express Endpoint | Description |
|--------|------------------|------------------|-------------|
| GET | `/api/v1/messages/{message_id}/ai-metadata` | `/api/messages/:messageId/ai-metadata` | Get AI metadata for a specific message |
| POST | `/api/v1/messages/{message_id}/ai-metadata` | `/api/messages/:messageId/ai-metadata` | Create AI metadata for a specific message |

### Paper AI Metadata
| Method | FastAPI Endpoint | Express Endpoint | Description |
|--------|------------------|------------------|-------------|
| GET | `/api/v1/papers/{paper_id}/ai-metadata` | `/api/papers/:paperId/ai-metadata` | Get AI metadata for a specific paper |

### Session AI Metadata
| Method | FastAPI Endpoint | Express Endpoint | Description |
|--------|------------------|------------------|-------------|
| GET | `/api/v1/sessions/{session_id}/ai-metadata` | `/api/sessions/:sessionId/ai-metadata` | Get all AI metadata for messages in a specific session |

### Core AI Metadata Operations
| Method | FastAPI Endpoint | Express Endpoint | Description |
|--------|------------------|------------------|-------------|
| GET | `/api/v1/ai-metadata/{metadata_id}` | `/api/ai-metadata/:id` | Get a specific AI metadata entry by ID |
| PUT | `/api/v1/ai-metadata/{metadata_id}` | `/api/ai-metadata/:id` | Update a specific AI metadata entry |
| DELETE | `/api/v1/ai-metadata/{metadata_id}` | `/api/ai-metadata/:id` | Delete a specific AI metadata entry |

### Sample AI Metadata Object
```json
{
  "id": 1,
  "message_id": 5,
  "paper_id": 1,
  "page_no": 3,
  "created_at": "2025-01-09T10:15:00Z"
}
```

---

## 🚀 Frontend API Services

The frontend provides TypeScript services for all API interactions:

### Service Structure
```typescript
// Core API client with authentication
class ApiClient {
  private baseURL: string;
  private supabase: SupabaseClient;
  
  async request<T>(endpoint: string, options?: RequestInit): Promise<T>
  async get<T>(endpoint: string): Promise<T>
  async post<T>(endpoint: string, data: any): Promise<T>
  async put<T>(endpoint: string, data: any): Promise<T>
  async delete<T>(endpoint: string): Promise<T>
}

// Specialized services
class UserService extends ApiClient { /* User operations */ }
class GroupService extends ApiClient { /* Group operations */ }
class SessionService extends ApiClient { /* Session operations */ }
class MessageService extends ApiClient { /* Message operations */ }
class PaperService extends ApiClient { /* Paper operations */ }
class FeedbackService extends ApiClient { /* Feedback operations */ }
class AIMetadataService extends ApiClient { /* AI Metadata operations */ }
class ProfileService extends ApiClient { /* Profile operations */ }
class ChatService extends ApiClient { /* Chat operations */ }
```

### React Hooks
```typescript
// Generic hooks
const useApi = <T>(fetcher: () => Promise<T>, deps?: any[]) => { data, loading, error, refetch }
const useMutation = <T, P>(mutator: (params: P) => Promise<T>) => { mutate, loading, error }

// Service-specific hooks
const useUsers = () => useApi(() => userService.getUsers())
const useGroups = () => useApi(() => groupService.getGroups())
const useSessions = (userId?: number) => useApi(() => sessionService.getSessions(userId))
const useMessages = (sessionId?: number) => useApi(() => messageService.getMessages(sessionId))
```

---

## 🔐 Authentication & Authorization

### JWT Token Structure
```json
{
  "sub": "user-uuid-from-supabase",
  "email": "user@example.com",
  "role": "authenticated",
  "iat": 1641123456,
  "exp": 1641127056
}
```

### Row Level Security (RLS)
- Users can only access their own data or data they're authorized to see
- Group members can access group-related data
- Session participants can access session data
- Public papers are accessible to all authenticated users

---

## 📋 Request/Response Examples

### Create a User
```bash
POST /api/users
Content-Type: application/json
Authorization: Bearer <jwt-token>

{
  "name": "John Doe",
  "email": "john@example.com",
  "first_name": "John",
  "last_name": "Doe"
}
```

### Search Papers
```bash
GET /api/papers/search?query=machine%20learning&limit=10
Authorization: Bearer <jwt-token>
```

### Create a Session
```bash
POST /api/sessions
Content-Type: application/json
Authorization: Bearer <jwt-token>

{
  "title": "Deep Learning Discussion",
  "user_id": 1,
  "group_id": 2
}
```

### Add Paper to Session
```bash
POST /api/papers/sessions/1/5
Authorization: Bearer <jwt-token>
```

### Create Message
```bash
POST /api/messages/sessions/1/messages
Content-Type: application/json
Authorization: Bearer <jwt-token>

{
  "user_id": 1,
  "content": "What are the key innovations in transformer architecture?",
  "message_type": "user"
}
```

---

## 🗄️ Database Integration

### PostgreSQL Functions
All Express endpoints use PostgreSQL functions for data operations:

- **User Functions**: `get_all_users()`, `create_user()`, `update_user()`, `delete_user()`
- **Group Functions**: `get_all_groups()`, `add_group_member()`, `remove_group_member()`
- **Session Functions**: `get_all_sessions()`, `create_session()`, `get_session_summary()`
- **Message Functions**: `get_messages()`, `create_message()`, `search_messages()`
- **Paper Functions**: `get_all_papers()`, `search_papers()`, `add_paper_to_session()`
- **Feedback Functions**: `create_feedback()`, `get_session_feedback()`
- **AI Metadata Functions**: `create_ai_metadata()`, `get_message_ai_metadata()`

### Supabase Integration
- Real-time subscriptions for live updates
- File storage for document uploads
- Edge functions for server-side processing
- Row Level Security for data protection

---

## 🎯 Key Features

### 1. **Complete CRUD Operations**
All database entities have full Create, Read, Update, Delete operations.

### 2. **Advanced Search & Filtering**
- Full-text search across papers, messages, and content
- Complex filtering with multiple parameters
- Pagination support for large datasets

### 3. **Real-time Capabilities**
- Live message updates in chat sessions
- Real-time notifications for group activities
- Collaborative research session features

### 4. **Relationship Management**
- Many-to-many relationships between users, groups, and sessions
- Paper tagging and categorization
- AI metadata linking for enhanced research context

### 5. **Authentication & Security**
- JWT-based authentication via Supabase
- Row Level Security for data protection
- Role-based access control

---

## 🔧 Development & Testing

### API Documentation
- **FastAPI Docs**: `http://localhost:8001/docs` (Swagger UI)
- **Express API**: This documentation serves as the reference

### Testing Endpoints
```bash
# Test user creation
curl -X POST "http://localhost:3000/api/users" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <jwt-token>" \
  -d '{"name": "Test User", "email": "test@example.com"}'

# Test paper search
curl -X GET "http://localhost:3000/api/papers/search?query=AI&limit=5" \
  -H "Authorization: Bearer <jwt-token>"

# Test session creation
curl -X POST "http://localhost:3000/api/sessions" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <jwt-token>" \
  -d '{"title": "Test Session", "user_id": 1}'
```

### Error Handling
All endpoints return standardized error responses:
```json
{
  "error": "Resource not found",
  "code": 404,
  "details": "User with ID 999 does not exist"
}
```

---

## 📈 Performance Considerations

### Caching Strategy
- Redis caching for frequently accessed data
- Browser caching for static content
- API response caching with appropriate TTL

### Database Optimization
- Indexed columns for search operations
- Optimized queries for complex joins
- Connection pooling for better performance

### Rate Limiting
- API rate limiting to prevent abuse
- User-based quotas for resource-intensive operations
- Progressive backoff for failed requests

---

This comprehensive API documentation covers all endpoints, authentication, request/response formats, and integration details for the AI Research Assistant application. The API supports both FastAPI backend operations and Express.js middleware with full Supabase integration.