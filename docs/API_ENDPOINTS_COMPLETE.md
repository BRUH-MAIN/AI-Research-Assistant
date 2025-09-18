# AI Research Assistant API Endpoints

This document provides a comprehensive overview of all available API endpoints for your AI Research Assistant project.

## Base URL
All endpoints are prefixed with: `/api/v1`

## 🧑‍💼 Users API

### Core User Operations
- `GET /api/v1/users/` - Get all users
- `POST /api/v1/users/` - Create a new user
- `GET /api/v1/users/{user_id}` - Get a specific user by ID
- `PUT /api/v1/users/{user_id}` - Update a specific user
- `DELETE /api/v1/users/{user_id}` - Delete a specific user

### User Status Management
- `PATCH /api/v1/users/{user_id}/activate` - Activate a user
- `PATCH /api/v1/users/{user_id}/deactivate` - Deactivate a user

## 👥 Groups API

### Core Group Operations
- `GET /api/v1/groups/` - Get all groups
- `POST /api/v1/groups/` - Create a new group
- `GET /api/v1/groups/{group_id}` - Get a specific group by ID
- `PUT /api/v1/groups/{group_id}` - Update a specific group
- `DELETE /api/v1/groups/{group_id}` - Delete a specific group

### Group Membership Management
- `GET /api/v1/groups/{group_id}/members` - Get group members
- `POST /api/v1/groups/{group_id}/members` - Add a member to group
- `DELETE /api/v1/groups/{group_id}/members/{user_id}` - Remove member from group

## 💬 Sessions API

### Core Session Operations
- `GET /api/v1/sessions/` - Get all sessions
- `POST /api/v1/sessions/` - Create a new session
- `GET /api/v1/sessions/{session_id}` - Get a specific session by ID
- `PUT /api/v1/sessions/{session_id}` - Update a specific session
- `DELETE /api/v1/sessions/{session_id}` - Delete a specific session

### Session Participation
- `POST /api/v1/sessions/{session_id}/join` - Join a session
- `DELETE /api/v1/sessions/{session_id}/leave` - Leave a session

## 📨 Messages API

### Core Message Operations
- `GET /api/v1/messages/` - Get all messages (with filtering)
- `POST /api/v1/messages/` - Create a new message
- `GET /api/v1/messages/{message_id}` - Get a specific message by ID
- `PUT /api/v1/messages/{message_id}` - Update a specific message
- `DELETE /api/v1/messages/{message_id}` - Delete a specific message

### Session Messages
- `GET /api/v1/sessions/{session_id}/messages` - Get messages for a session
- `POST /api/v1/sessions/{session_id}/messages` - Create message in session

## 📄 Papers API *(NEW)*

### Core Paper Operations
- `GET /api/v1/papers/` - Get all papers
- `POST /api/v1/papers/` - Create a new paper
- `GET /api/v1/papers/{paper_id}` - Get a specific paper by ID
- `PUT /api/v1/papers/{paper_id}` - Update a specific paper
- `DELETE /api/v1/papers/{paper_id}` - Delete a specific paper

### Paper Search
- `GET /api/v1/papers/search?query={query}&limit={limit}` - Search papers by title, abstract, or authors

### Paper Tags Management
- `GET /api/v1/papers/{paper_id}/tags` - Get tags for a specific paper
- `POST /api/v1/papers/{paper_id}/tags` - Add tags to a specific paper
- `DELETE /api/v1/papers/{paper_id}/tags/{tag}` - Remove a specific tag from a paper

### Session-Paper Relationships
- `GET /api/v1/papers/sessions/{session_id}` - Get papers linked to a specific session
- `POST /api/v1/papers/sessions/{session_id}/{paper_id}` - Link a paper to a session
- `DELETE /api/v1/papers/sessions/{session_id}/{paper_id}` - Remove paper from session

## 📝 Feedback API *(NEW)*

### Session Feedback
- `GET /api/v1/sessions/{session_id}/feedback` - Get all feedback for a specific session
- `POST /api/v1/sessions/{session_id}/feedback` - Create feedback for a specific session

### Core Feedback Operations
- `GET /api/v1/feedback/{feedback_id}` - Get a specific feedback by ID
- `PUT /api/v1/feedback/{feedback_id}` - Update a specific feedback
- `DELETE /api/v1/feedback/{feedback_id}` - Delete a specific feedback

### User Feedback
- `GET /api/v1/users/{user_id}/feedback` - Get all feedback given by a specific user

## 🤖 AI Metadata API *(NEW)*

### Message AI Metadata
- `GET /api/v1/messages/{message_id}/ai-metadata` - Get AI metadata for a specific message
- `POST /api/v1/messages/{message_id}/ai-metadata` - Create AI metadata for a specific message

### Paper AI Metadata
- `GET /api/v1/papers/{paper_id}/ai-metadata` - Get AI metadata for a specific paper

### Session AI Metadata
- `GET /api/v1/sessions/{session_id}/ai-metadata` - Get all AI metadata for messages in a specific session

### Core AI Metadata Operations
- `GET /api/v1/ai-metadata/{metadata_id}` - Get a specific AI metadata entry by ID
- `PUT /api/v1/ai-metadata/{metadata_id}` - Update a specific AI metadata entry
- `DELETE /api/v1/ai-metadata/{metadata_id}` - Delete a specific AI metadata entry

## 🗄️ Database Schema Coverage

### ✅ Fully Covered Entities
- **Users** - Complete CRUD operations + status management
- **Groups** - Complete CRUD operations + membership management  
- **Sessions** - Complete CRUD operations + participation management
- **Messages** - Complete CRUD operations + session relationships
- **Papers** - Complete CRUD operations + search + tags + session relationships
- **Feedback** - Complete CRUD operations + session/user relationships
- **AI Metadata** - Complete CRUD operations + message/paper/session relationships

### 🔗 Junction Tables Covered
- **group_participants** - Via Groups API membership endpoints
- **session_participants** - Via Sessions API participation endpoints
- **paper_tags** - Via Papers API tags endpoints
- **session_papers** - Via Papers API session relationships
- **ai_metadata** - Via AI Metadata API

## 🎯 Key Features

### 1. **Complete CRUD Operations**
All database entities now have full Create, Read, Update, Delete operations.

### 2. **Advanced Search**
- Paper search by title, abstract, or authors
- Message filtering by session, user, and type
- Session filtering by user and status

### 3. **Relationship Management**
- Link papers to sessions
- Manage group memberships
- Handle session participation
- Associate AI metadata with messages and papers

### 4. **Mock Data Support**
All endpoints work with both real database connections and mock data for development/testing.

### 5. **Error Handling**
Comprehensive error handling with appropriate HTTP status codes and detailed error messages.

## 📋 Request/Response Examples

### Create a Paper
```bash
POST /api/v1/papers/
{
  "title": "AI Reasoning Models for Problem Solving",
  "abstract": "This paper explores...",
  "authors": "John Smith, Jane Doe",
  "doi": "10.1000/182",
  "source_url": "https://arxiv.org/abs/example"
}
```

### Search Papers
```bash
GET /api/v1/papers/search?query=AI%20reasoning&limit=10
```

### Add Paper to Session
```bash
POST /api/v1/papers/sessions/1/5
```

### Create Feedback
```bash
POST /api/v1/sessions/1/feedback
{
  "given_by": 2,
  "content": "Great research discussion!"
}
```

### Create AI Metadata
```bash
POST /api/v1/messages/5/ai-metadata
{
  "paper_id": 1,
  "page_no": 5
}
```

## 🚀 Next Steps

Your API now has **complete coverage** for all database entities in your schema. The implementation includes:

1. ✅ All major CRUD operations
2. ✅ Advanced search and filtering
3. ✅ Relationship management between entities  
4. ✅ Mock data support for development
5. ✅ Comprehensive error handling
6. ✅ RESTful API design patterns

You can now build your frontend application with confidence knowing all backend endpoints are available and functional!
