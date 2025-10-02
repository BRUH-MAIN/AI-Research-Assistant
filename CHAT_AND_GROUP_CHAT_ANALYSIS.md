# Comprehensive Analysis: Chat and Group Chat Functionality

## Executive Summary

This document provides a detailed technical explanation of the chat and group chat functionalities implemented in the AI Research Assistant project. The system features **two distinct chat implementations**:

1. **Individual AI Chat** - Direct one-on-one conversations with an AI assistant (FastAPI-based)
2. **Group Chat** - Real-time collaborative chat within research groups with optional AI invocation (Express/Supabase-based)

---

## Table of Contents

1. [System Architecture Overview](#system-architecture-overview)
2. [Individual AI Chat System](#individual-ai-chat-system)
3. [Group Chat System](#group-chat-system)
4. [Database Schema](#database-schema)
5. [API Endpoints](#api-endpoints)
6. [Frontend Implementation](#frontend-implementation)
7. [Real-time Features](#real-time-features)
8. [Security and Permissions](#security-and-permissions)
9. [Data Flow Diagrams](#data-flow-diagrams)
10. [Key Features Summary](#key-features-summary)

---

## System Architecture Overview

### Technology Stack

**Backend:**
- **FastAPI** (Python) - Handles individual AI chat sessions and AI response generation
- **Express.js** (Node.js) - Manages group chat, messages, and real-time coordination
- **Supabase** - PostgreSQL database with real-time subscriptions

**Frontend:**
- **Next.js/React** - UI framework
- **TypeScript** - Type safety
- **Supabase Client** - Real-time WebSocket connections

**AI Services:**
- Groq API integration for AI response generation
- Configurable AI models

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Frontend (Next.js)                      │
│  ┌──────────────────┐         ┌──────────────────────────┐ │
│  │  Chat Service    │         │  Group Chat Service      │ │
│  │  (Individual AI) │         │  (Collaborative)         │ │
│  └────────┬─────────┘         └─────────┬────────────────┘ │
└───────────┼───────────────────────────────┼──────────────────┘
            │                               │
            │                               │
    ┌───────▼────────┐            ┌────────▼─────────────┐
    │    FastAPI     │            │    Express.js        │
    │  (Port 8000)   │            │    (Port 3001)       │
    │                │            │                      │
    │  - AI Chat     │            │  - Group Chat        │
    │  - Groq AI     │◄───────────┤  - Messages          │
    │  - Sessions    │  AI Invoke │  - Participants      │
    └────────┬───────┘            └──────────┬───────────┘
             │                               │
             │                               │
    ┌────────▼───────────────────────────────▼───────────┐
    │            Supabase PostgreSQL Database            │
    │  ┌──────────────┐         ┌──────────────────┐   │
    │  │   Sessions   │         │    Messages       │   │
    │  │   (Group)    │◄────────┤    (Group)        │   │
    │  └──────────────┘         └──────────────────┘   │
    │         ▲                          │              │
    │         │                          ▼              │
    │  ┌──────┴──────┐         ┌──────────────────┐   │
    │  │   Groups    │         │  User Presence   │   │
    │  │             │         │  (Real-time)     │   │
    │  └─────────────┘         └──────────────────┘   │
    └──────────────────────────────────────────────────┘
```

---

## Individual AI Chat System

The individual AI chat system provides one-on-one conversations with an AI assistant. It's designed for personal research assistance and quick queries.

### 1. Core Components

#### Backend: FastAPI Service (`backend/app/api/v1/chat.py`)

**Key Endpoints:**
- `POST /api/v1/chat/sessions` - Create a new chat session
- `GET /api/v1/chat/{session_id}/history` - Retrieve chat history
- `POST /api/v1/chat/{session_id}` - Send message and get AI response
- `DELETE /api/v1/chat/{session_id}` - Delete a chat session
- `POST /api/v1/chat/group-message` - Handle AI invocation from group chat

**Code Structure:**
```python
@router.post("/sessions", response_model=SessionCreate)
async def create_session():
    """Create a new chat session"""
    session_id = chat_service.create_session()
    return SessionCreate(session_id=session_id)

@router.post("/{session_id}", response_model=ChatResponse)
async def send_message(session_id: str, request: ChatRequest):
    """Send a message and get AI response"""
    response = await chat_service.send_message(session_id, request)
    if response is None:
        raise HTTPException(status_code=404, detail="Session not found")
    return response
```

### 2. Chat Service (`backend/app/services/chat_service.py`)

**Purpose:** Manages in-memory chat sessions and coordinates with AI service.

**Key Methods:**
- `create_session()` - Generates unique session ID using UUID
- `get_session_history(session_id)` - Returns all messages in a session
- `send_message(session_id, request)` - Processes user message and generates AI response
- `delete_session(session_id)` - Removes session from memory

**Session Storage:**
```python
class ChatService:
    def __init__(self):
        self.sessions: Dict[str, List[ChatMessage]] = {}
```

Sessions are stored in-memory as a dictionary mapping session IDs to lists of ChatMessage objects.

**Message Flow:**
1. User sends message via request
2. Service creates ChatMessage object with UUID
3. Message added to session history
4. AI service called with message and context
5. AI response created and added to history
6. Response returned to client

### 3. AI Service Integration (`backend/app/services/ai_service.py`)

**Functions:**
- `generate_response(message, history)` - Full context-aware response
- `generate_simple_response(prompt)` - Quick response without context

**Features:**
- Groq API integration
- Conversation history management
- Error handling and fallback responses
- Configurable models

### 4. Data Models (`backend/app/models/chat.py`)

**ChatRequest:**
```python
class ChatRequest(BaseModel):
    message: str
    user_id: Optional[str] = None
```

**ChatMessage:**
```python
class ChatMessage(BaseModel):
    id: str              # UUID
    content: str         # Message text
    role: str           # 'user' or 'assistant'
    timestamp: datetime
    user_id: Optional[str] = None
```

**ChatResponse:**
```python
class ChatResponse(BaseModel):
    message: ChatMessage
    session_id: str
```

### 5. Frontend Integration (`frontend/src/app/services/chatService.ts`)

**ChatService Class Methods:**
```typescript
class ChatService {
  async createSession(): Promise<string>
  async getSessionHistory(sessionId: string): Promise<Message[]>
  async sendMessage(sessionId: string, messageData: ChatMessage): Promise<SendMessageResponse>
  async deleteSession(sessionId: string): Promise<void>
  async healthCheck(): Promise<boolean>
}
```

**Usage Pattern:**
1. Create session on component mount
2. Load history (if existing session)
3. Send messages and display responses
4. Update UI with streaming or batch responses

---

## Group Chat System

The group chat system enables real-time collaborative discussions within research groups, with optional AI assistant participation.

### 1. Architecture Overview

**Components:**
- **Database Layer:** PostgreSQL with Supabase real-time
- **API Layer:** Express.js REST endpoints
- **Real-time Layer:** Supabase WebSocket subscriptions
- **Frontend:** React components with custom hooks

### 2. Database Schema for Group Chat

**Core Tables:**

**`groups` table:**
```sql
CREATE TABLE groups (
    group_id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    created_by INT NOT NULL REFERENCES users(user_id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**`group_participants` table:**
```sql
CREATE TABLE group_participants (
    group_participant_id SERIAL PRIMARY KEY,
    group_id INT NOT NULL REFERENCES groups(group_id),
    user_id INT NOT NULL REFERENCES users(user_id),
    role VARCHAR(50) NOT NULL,  -- 'admin', 'member', 'mentor'
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(group_id, user_id)
);
```

**`sessions` table:**
```sql
CREATE TABLE sessions (
    session_id SERIAL PRIMARY KEY,
    group_id INT NOT NULL REFERENCES groups(group_id),
    created_by INT NOT NULL REFERENCES users(user_id),
    topic TEXT,
    status VARCHAR(50),  -- 'offline', 'active', 'completed'
    started_at TIMESTAMP,
    ended_at TIMESTAMP
);
```

**`messages` table (Enhanced for Group Chat):**
```sql
CREATE TABLE messages (
    message_id SERIAL PRIMARY KEY,
    session_id INT NOT NULL REFERENCES sessions(session_id),
    sender_id INT NOT NULL REFERENCES group_participants(group_participant_id),
    content TEXT NOT NULL,
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    -- Enhanced columns for group chat:
    message_type VARCHAR(20) DEFAULT 'user',  -- 'user', 'ai', 'system'
    metadata JSONB DEFAULT '{}',
    edited_at TIMESTAMP,
    reply_to INT REFERENCES messages(message_id)
);
```

**`user_presence` table:**
```sql
CREATE TABLE user_presence (
    user_id INT NOT NULL REFERENCES users(user_id),
    session_id INT NOT NULL REFERENCES sessions(session_id),
    status VARCHAR(20),  -- 'online', 'away', 'offline'
    last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, session_id)
);
```

### 3. Express.js API (`express-db-server/routes/group-chat.js`)

**Session Management Endpoints:**

```javascript
// Get all chat sessions for a group
GET /api/group-chat/:groupId/sessions

// Create a new chat session
POST /api/group-chat/:groupId/sessions
Request Body: {
  title: string,
  description: string,
  created_by: number
}

// Join a group chat session
POST /api/group-chat/sessions/:sessionId/join
Request Body: {
  user_id: number
}
```

**Message Management Endpoints:**

```javascript
// Get messages for a session
GET /api/group-chat/sessions/:sessionId/messages
Query Params: {
  limit?: number (default: 50),
  offset?: number (default: 0)
}

// Send a message
POST /api/group-chat/sessions/:sessionId/messages
Request Body: {
  user_id: number,
  content: string,
  message_type?: 'user' | 'ai' | 'system',
  metadata?: object
}
```

**User Presence Endpoints:**

```javascript
// Get online users in a session
GET /api/group-chat/sessions/:sessionId/online-users

// Update user presence
PUT /api/group-chat/sessions/:sessionId/presence
Request Body: {
  user_id: number,
  status: 'online' | 'away' | 'offline'
}
```

**AI Permission Endpoint:**

```javascript
// Check if user can invoke AI
GET /api/group-chat/sessions/:sessionId/can-invoke-ai
Query Params: {
  user_id: number
}
```

### 4. AI Integration in Group Chat

**Trigger Detection:**
When a message is sent, the system checks for AI triggers:
- `@ai` - Mentions the AI
- `/ai` - Command-style invocation
- `@assistant` - Alternative mention

**Permission Validation:**
```javascript
const canInvokeAI = await executeRPC(supabase, 'can_user_invoke_ai', {
  p_user_id: parseInt(user_id),
  p_session_id: sessionId
});
```

Only users with these roles can invoke AI:
- Group **admins**
- Group **mentors**
- Session **creators**

**AI Response Flow:**
1. User sends message with AI trigger (@ai)
2. Express validates permissions
3. Message stored in database
4. Express calls FastAPI: `POST /api/v1/chat/group-message`
5. FastAPI generates AI response
6. Express stores AI response as separate message
7. Real-time broadcast to all participants

**AI Response Code:**
```javascript
// Make request to FastAPI for AI response
const fastApiUrl = process.env.FASTAPI_URL || 'http://localhost:8000';
const aiResponse = await fetch(`${fastApiUrl}/api/v1/chat/group-message`, {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
    },
    body: JSON.stringify({
        session_id: sessionId,
        user_message: content,
        user_id: parseInt(user_id),
        trigger_message_id: messageResult.message_id
    })
});

// Send AI response as a separate message
await executeRPC(supabase, 'send_group_chat_message', {
    p_session_id: sessionId,
    p_user_id: 1, // AI user ID
    p_content: aiData.response,
    p_message_type: 'ai',
    p_metadata: {
        ai_response: true,
        triggered_by: messageResult.message_id,
        model_used: aiData.model
    }
});
```

### 5. Real-time Implementation

**Supabase Real-time Setup:**

The messages table is configured for real-time broadcasts:
```sql
-- Enable realtime for messages table
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
```

**Frontend Subscription:**
```typescript
// Subscribe to new messages
const subscription = supabase
  .channel(`session:${sessionId}`)
  .on(
    'postgres_changes',
    {
      event: 'INSERT',
      schema: 'public',
      table: 'messages',
      filter: `session_id=eq.${sessionId}`
    },
    (payload) => {
      // Handle new message
      const newMessage = payload.new;
      setMessages(prev => [...prev, newMessage]);
    }
  )
  .subscribe();
```

**Presence Tracking:**
```typescript
// Update user presence when joining
await groupChatService.updateUserPresence(sessionId, userId, 'online');

// Update on visibility change
document.addEventListener('visibilitychange', () => {
  const status = document.hidden ? 'away' : 'online';
  groupChatService.updateUserPresence(sessionId, userId, status);
});

// Cleanup on unmount
useEffect(() => {
  return () => {
    groupChatService.updateUserPresence(sessionId, userId, 'offline');
  };
}, []);
```

### 6. Frontend Components

**GroupChatWindow** (`frontend/src/app/components/groupChat/GroupChatWindow.tsx`)
- Main container for group chat UI
- Manages message display and scrolling
- Coordinates all sub-components

**GroupChatMessage** (`frontend/src/app/components/groupChat/GroupChatMessage.tsx`)
- Displays individual messages
- Different styling for user/AI/system messages
- Shows sender info and timestamp

**GroupChatInput** (`frontend/src/app/components/groupChat/GroupChatInput.tsx`)
- Text input with send button
- AI trigger detection and warnings
- Permission-based UI updates

**SessionSelector** (`frontend/src/app/components/groupChat/SessionSelector.tsx`)
- List of available sessions
- Create new session functionality
- Join/leave session actions

**OnlineUsersList** (`frontend/src/app/components/groupChat/OnlineUsersList.tsx`)
- Displays online users
- Real-time status indicators
- User avatars and names

**useGroupChat Hook** (`frontend/src/app/hooks/useGroupChat.ts`)
- Central state management
- Real-time subscription handling
- Message sending/receiving logic
- Presence management

### 7. Session Management

**Session Lifecycle:**

```
┌─────────────┐
│   offline   │ ← New session created
└──────┬──────┘
       │ First user joins
       ▼
┌─────────────┐
│   active    │ ← Has participants
└──────┬──────┘
       │ Admin closes OR all leave
       ▼
┌─────────────┐
│  completed  │ ← Archived session
└─────────────┘
```

**Session Operations:**

1. **Create Session:**
```javascript
POST /api/group-chat/:groupId/sessions
{
  title: "Research Discussion",
  description: "Discussing paper findings",
  created_by: 5
}
```

2. **Join Session:**
```javascript
POST /api/group-chat/sessions/:sessionId/join
{
  user_id: 5
}
```
- Validates group membership
- Adds to session_participants
- Updates session status to 'active'
- Updates user presence to 'online'

3. **Leave Session:**
```javascript
DELETE /api/group-chat/sessions/:sessionId/leave
{
  user_id: 5
}
```
- Removes from session_participants
- Updates presence to 'offline'
- If no participants remain, status → 'offline'

4. **Close Session (Admin/Creator only):**
```javascript
POST /api/group-chat/sessions/:sessionId/close
```
- Validates permissions
- Removes all participants
- Sets status to 'completed'
- Makes chat read-only

---

## Database Schema

### Complete Entity Relationship

```
users (user_id, email, first_name, last_name, availability)
  │
  ├─→ groups (group_id, name, created_by)
  │     │
  │     ├─→ group_participants (group_participant_id, group_id, user_id, role)
  │     │     │
  │     │     └─→ messages (message_id, session_id, sender_id, content, message_type)
  │     │           │
  │     │           └─→ ai_metadata (page_no, message_id, paper_id)
  │     │
  │     └─→ sessions (session_id, group_id, created_by, topic, status)
  │           │
  │           ├─→ session_participants (session_id, user_id)
  │           │
  │           ├─→ messages (linked above)
  │           │
  │           ├─→ session_papers (session_id, paper_id)
  │           │
  │           ├─→ feedback (session_id, given_by, content)
  │           │
  │           └─→ user_presence (user_id, session_id, status, last_seen)
  │
  └─→ papers (paper_id, title, abstract, authors, doi)
        │
        └─→ paper_tags (paper_id, tag)
```

### Key Relationships

1. **Users ↔ Groups:** Many-to-many through `group_participants`
2. **Groups ↔ Sessions:** One-to-many (group can have multiple sessions)
3. **Sessions ↔ Messages:** One-to-many (session has multiple messages)
4. **Users ↔ Sessions:** Many-to-many through `session_participants`
5. **Messages ↔ Papers:** Many-to-many through `ai_metadata`
6. **Sessions ↔ Papers:** Many-to-many through `session_papers`

---

## API Endpoints

### Individual AI Chat API (FastAPI - Port 8000)

| Method | Endpoint | Purpose | Request Body | Response |
|--------|----------|---------|--------------|----------|
| POST | `/api/v1/chat/sessions` | Create new chat session | None | `{session_id: string}` |
| GET | `/api/v1/chat/{session_id}/history` | Get session history | None | `{messages: ChatMessage[]}` |
| POST | `/api/v1/chat/{session_id}` | Send message & get AI response | `{message: string, user_id?: string}` | `{message: ChatMessage, session_id: string}` |
| DELETE | `/api/v1/chat/{session_id}` | Delete session | None | `{message: string}` |
| POST | `/api/v1/chat/group-message` | Handle group chat AI invoke | `{session_id: int, user_message: string, user_id: int}` | `{response: string, session_id: int, model: string}` |

### Group Chat API (Express - Port 3001)

**Session Management:**

| Method | Endpoint | Purpose | Request Body | Response |
|--------|----------|---------|--------------|----------|
| GET | `/api/group-chat/{groupId}/sessions` | List group sessions | None | `GroupChatSession[]` |
| POST | `/api/group-chat/{groupId}/sessions` | Create session | `{title, description, created_by}` | `GroupChatSession` |
| POST | `/api/group-chat/sessions/{sessionId}/join` | Join session | `{user_id}` | `{success: boolean}` |

**Messages:**

| Method | Endpoint | Purpose | Query/Body | Response |
|--------|----------|---------|------------|----------|
| GET | `/api/group-chat/sessions/{sessionId}/messages` | Get messages | `?limit=50&offset=0` | `GroupChatMessage[]` |
| POST | `/api/group-chat/sessions/{sessionId}/messages` | Send message | `{user_id, content, message_type?, metadata?}` | `GroupChatMessage` |

**Presence:**

| Method | Endpoint | Purpose | Request/Query | Response |
|--------|----------|---------|---------------|----------|
| GET | `/api/group-chat/sessions/{sessionId}/online-users` | Get online users | None | `OnlineUser[]` |
| PUT | `/api/group-chat/sessions/{sessionId}/presence` | Update presence | `{user_id, status}` | `{success: boolean}` |

**Permissions:**

| Method | Endpoint | Purpose | Query | Response |
|--------|----------|---------|-------|----------|
| GET | `/api/group-chat/sessions/{sessionId}/can-invoke-ai` | Check AI permissions | `?user_id=X` | `{can_invoke_ai: boolean}` |

---

## Frontend Implementation

### Services Layer

**1. ChatService** (`frontend/src/app/services/chatService.ts`)
- Handles individual AI chat
- Direct FastAPI communication
- Session management
- Message history

**2. GroupChatService** (`frontend/src/app/services/groupChatService.ts`)
- Handles group chat
- Express API communication
- Session and message operations
- Presence management

**3. MessageService** (`frontend/src/app/services/messageService.ts`)
- Generic message operations
- CRUD operations for messages
- Works with both chat types

### Custom Hooks

**useGroupChat** (`frontend/src/app/hooks/useGroupChat.ts`)
```typescript
const {
  messages,
  onlineUsers,
  isConnected,
  sendMessage,
  loading,
  error
} = useGroupChat(sessionId, userId);
```

**Features:**
- Real-time message subscription
- Automatic presence updates
- Connection state management
- Message sending with optimistic updates
- Cleanup on unmount

### Component Structure

```
GroupChatPage
└─ GroupChatWindow
   ├─ SessionSelector
   │  └─ SessionList
   │     └─ SessionItem
   ├─ MessageList
   │  └─ GroupChatMessage (multiple)
   │     ├─ UserMessage
   │     ├─ AIMessage
   │     └─ SystemMessage
   ├─ GroupChatInput
   │  ├─ TextArea
   │  ├─ SendButton
   │  └─ AITriggerWarning
   └─ OnlineUsersList
      └─ OnlineUserItem (multiple)
```

---

## Real-time Features

### 1. Message Broadcasting

**Supabase Real-time Channel:**
```typescript
const channel = supabase
  .channel(`session:${sessionId}`)
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'messages',
    filter: `session_id=eq.${sessionId}`
  }, handleNewMessage)
  .subscribe();
```

**Flow:**
1. User sends message via Express API
2. Message inserted into PostgreSQL
3. Supabase detects INSERT via logical replication
4. WebSocket broadcast to all subscribed clients
5. Clients receive and display message instantly

### 2. Presence System

**Tracking Online Users:**
```sql
-- Update presence when user joins
INSERT INTO user_presence (user_id, session_id, status)
VALUES ($1, $2, 'online')
ON CONFLICT (user_id, session_id)
DO UPDATE SET status = 'online', last_seen = CURRENT_TIMESTAMP;

-- Get online users
SELECT u.user_id, u.first_name, u.last_name, up.status, up.last_seen
FROM user_presence up
JOIN users u ON up.user_id = u.user_id
WHERE up.session_id = $1
AND up.status IN ('online', 'away');
```

**Auto-update Mechanisms:**
- **On join:** Set status to 'online'
- **On visibility change:** Toggle between 'online' and 'away'
- **On beforeunload:** Set to 'offline'
- **Heartbeat:** Periodic timestamp update (optional)
- **On unmount:** Set to 'offline'

### 3. Connection State

**Monitoring:**
```typescript
const [connectionState, setConnectionState] = useState<'CONNECTING' | 'CONNECTED' | 'DISCONNECTED'>('CONNECTING');

channel.on('system', {}, (status) => {
  if (status === 'SUBSCRIBED') {
    setConnectionState('CONNECTED');
  }
});
```

**UI Indicators:**
- Green dot: Connected
- Yellow dot: Connecting
- Red dot: Disconnected
- Auto-reconnection attempts

---

## Security and Permissions

### Row Level Security (RLS)

**Messages Table Policies:**

```sql
-- Read messages from groups you belong to
CREATE POLICY "Users can read group messages" ON messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM sessions s
      JOIN group_participants gp ON s.group_id = gp.group_id
      JOIN users u ON gp.user_id = u.user_id
      WHERE s.session_id = messages.session_id
      AND u.auth_user_id = auth.uid()
    )
  );

-- Send messages to groups you belong to
CREATE POLICY "Users can send group messages" ON messages
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM sessions s
      JOIN group_participants gp ON s.group_id = gp.group_id
      JOIN users u ON gp.user_id = u.user_id
      WHERE s.session_id = messages.session_id
      AND u.auth_user_id = auth.uid()
    )
  );

-- Update own messages
CREATE POLICY "Users can update own messages" ON messages
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM group_participants gp
      JOIN users u ON gp.user_id = u.user_id
      WHERE gp.group_participant_id = messages.sender_id
      AND u.auth_user_id = auth.uid()
    )
  );

-- Delete own messages or if admin
CREATE POLICY "Users can delete own messages or admin" ON messages
  FOR DELETE USING (
    -- Own message
    EXISTS (
      SELECT 1 FROM group_participants gp
      JOIN users u ON gp.user_id = u.user_id
      WHERE gp.group_participant_id = messages.sender_id
      AND u.auth_user_id = auth.uid()
    )
    OR
    -- Admin in group
    EXISTS (
      SELECT 1 FROM sessions s
      JOIN group_participants gp ON s.group_id = gp.group_id
      JOIN users u ON gp.user_id = u.user_id
      WHERE s.session_id = messages.session_id
      AND u.auth_user_id = auth.uid()
      AND gp.role = 'admin'
    )
  );
```

### Permission Levels

**Group Roles:**
- **Admin:** Full control (create/close sessions, invoke AI, manage members)
- **Mentor:** Create sessions, invoke AI, participate
- **Member:** Join sessions, send messages (cannot invoke AI unless session creator)

**Session Permissions:**
- **Session Creator:** Can always close their session and invoke AI
- **Group Admin:** Can close any session in their group
- **Regular Members:** Can only participate

### AI Invocation Permissions

**RPC Function:**
```sql
CREATE OR REPLACE FUNCTION can_user_invoke_ai(
  p_user_id INT,
  p_session_id INT
) RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM sessions s
    JOIN group_participants gp ON s.group_id = gp.group_id
    WHERE s.session_id = p_session_id
    AND gp.user_id = p_user_id
    AND (
      gp.role IN ('admin', 'mentor')  -- Admin or mentor
      OR s.created_by = p_user_id     -- Session creator
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**Validation in API:**
```javascript
const canInvokeAI = await executeRPC(supabase, 'can_user_invoke_ai', {
  p_user_id: parseInt(user_id),
  p_session_id: sessionId
});

if (!canInvokeAI) {
  return res.status(403).json({
    error: 'You do not have permission to invoke AI in this session',
    code: 403
  });
}
```

---

## Data Flow Diagrams

### Individual AI Chat Flow

```
User sends message
       │
       ▼
┌──────────────────┐
│  Frontend (Next) │
│  chatService.    │
│  sendMessage()   │
└────────┬─────────┘
         │ POST /api/v1/chat/{session_id}
         ▼
┌──────────────────┐
│  FastAPI Server  │
│  chat.py         │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  chat_service.py │
│  send_message()  │
└────────┬─────────┘
         │
         ├─→ Create user message
         │   Add to session history
         │
         └─→ Call ai_service
             │
             ▼
        ┌──────────────────┐
        │  ai_service.py   │
        │  generate_       │
        │  response()      │
        └────────┬─────────┘
                 │
                 ├─→ Build context from history
                 │
                 └─→ Call Groq API
                     │
                     ▼
                ┌──────────┐
                │ Groq API │
                │ (AI)     │
                └────┬─────┘
                     │
                     ▼ AI response
        ┌────────────────────┐
        │ Create AI message  │
        │ Add to history     │
        └────────┬───────────┘
                 │
                 ▼
        ┌────────────────────┐
        │ Return ChatResponse│
        └────────┬───────────┘
                 │
                 ▼
        ┌────────────────────┐
        │ Frontend displays  │
        │ AI message         │
        └────────────────────┘
```

### Group Chat Message Flow

```
User types message
       │
       ▼
┌──────────────────────┐
│  GroupChatInput      │
│  Check AI trigger    │
└──────────┬───────────┘
           │ @ai detected?
           │
           ├─ NO ──→ Send regular message
           │         │
           │         ▼
           │    ┌────────────────┐
           │    │ Express API    │
           │    │ POST /messages │
           │    └────┬───────────┘
           │         │
           │         ▼
           │    ┌────────────────┐
           │    │ Supabase DB    │
           │    │ INSERT message │
           │    └────┬───────────┘
           │         │
           │         ▼ Real-time broadcast
           │    ┌────────────────────────┐
           │    │ All subscribed clients │
           │    │ receive message        │
           │    └────────────────────────┘
           │
           └─ YES ─→ Validate permissions
                     │
                     ▼
                ┌──────────────┐
                │ can_invoke_  │
                │ ai() check   │
                └──────┬───────┘
                       │
                   ┌───┴───┐
                   │       │
              DENIED    ALLOWED
                   │       │
                   │       ▼
                   │  ┌────────────────┐
                   │  │ Store user msg │
                   │  └────┬───────────┘
                   │       │
                   │       ▼ Real-time broadcast
                   │  ┌────────────────┐
                   │  │ All clients    │
                   │  │ see user msg   │
                   │  └────────────────┘
                   │       │
                   │       ▼
                   │  ┌────────────────┐
                   │  │ Call FastAPI   │
                   │  │ POST /group-   │
                   │  │ message        │
                   │  └────┬───────────┘
                   │       │
                   │       ▼
                   │  ┌────────────────┐
                   │  │ FastAPI        │
                   │  │ generate AI    │
                   │  │ response       │
                   │  └────┬───────────┘
                   │       │
                   │       ▼
                   │  ┌────────────────┐
                   │  │ Express stores │
                   │  │ AI response    │
                   │  │ as message     │
                   │  └────┬───────────┘
                   │       │
                   │       ▼ Real-time broadcast
                   │  ┌────────────────┐
                   │  │ All clients    │
                   │  │ see AI reply   │
                   │  └────────────────┘
                   │
                   ▼
            ┌──────────────┐
            │ Error: 403   │
            │ Forbidden    │
            └──────────────┘
```

### Real-time Subscription Flow

```
Component mounts
       │
       ▼
┌──────────────────────┐
│ useGroupChat hook    │
│ initialize           │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│ Create Supabase      │
│ channel              │
│ `session:{id}`       │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│ Subscribe to         │
│ postgres_changes     │
│ event: INSERT        │
│ table: messages      │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│ WebSocket connection │
│ established          │
└──────────┬───────────┘
           │
           │ [Waiting for events...]
           │
           ▼
┌──────────────────────┐
│ New message INSERT   │
│ in database          │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│ Supabase logical     │
│ replication detects  │
│ change               │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│ Broadcast to all     │
│ subscribed channels  │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│ Client receives      │
│ message payload      │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│ Update React state   │
│ setMessages([...])   │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│ UI re-renders        │
│ New message appears  │
└──────────────────────┘
```

---

## Key Features Summary

### Individual AI Chat Features

✅ **Session Management**
- Create unique chat sessions
- Maintain conversation context
- Delete sessions when done

✅ **AI Integration**
- Groq API for responses
- Context-aware conversations
- Full message history

✅ **User Experience**
- Simple interface
- Fast responses
- Error handling
- No persistence (in-memory)

### Group Chat Features

✅ **Real-time Messaging**
- Instant message delivery
- WebSocket-based updates
- No page refresh needed
- Message history persistence

✅ **Collaborative Sessions**
- Multiple sessions per group
- Join/leave functionality
- Session status tracking
- Participant management

✅ **AI Assistant Integration**
- Trigger with @ai or /ai
- Role-based permissions
- AI responses in chat flow
- Full context awareness

✅ **User Presence**
- Online/away/offline status
- Real-time updates
- Last seen timestamps
- Visual indicators

✅ **Security & Permissions**
- Row-level security (RLS)
- Role-based access control
- Group membership validation
- AI invocation permissions

✅ **Message Features**
- User messages
- AI messages
- System messages
- Metadata support
- Reply threading (infrastructure ready)
- Message editing (infrastructure ready)

✅ **Session Management**
- Create sessions
- Join/leave sessions
- Close sessions (admin/creator)
- Status tracking (offline/active/completed)
- Participant tracking

---

## Comparison: Individual vs Group Chat

| Feature | Individual AI Chat | Group Chat |
|---------|-------------------|------------|
| **Purpose** | Personal AI assistance | Collaborative research discussions |
| **Backend** | FastAPI (Python) | Express (Node.js) + FastAPI for AI |
| **Storage** | In-memory (ephemeral) | PostgreSQL (persistent) |
| **Real-time** | Not required | Supabase WebSocket |
| **Participants** | 1 user + AI | Multiple users + optional AI |
| **AI Invocation** | Every message | On-demand with triggers (@ai) |
| **Permissions** | Public (no auth) | Role-based (RLS policies) |
| **History** | Session-based, temporary | Permanent database storage |
| **Use Cases** | Quick questions, research help | Team discussions, brainstorming |
| **Sessions** | Temporary UUIDs | Database-backed with IDs |
| **Presence** | N/A | Online/away/offline tracking |

---

## Technical Highlights

### 1. Dual Architecture
The system cleverly separates concerns:
- **FastAPI:** Handles AI processing (CPU-intensive, Python's strength)
- **Express:** Manages real-time chat (I/O-intensive, Node's strength)

### 2. Real-time with Supabase
Uses PostgreSQL's logical replication for true database-level real-time:
- No polling needed
- Instant updates
- Scales well
- Built-in security

### 3. Permission System
Multi-layered security:
- Database RLS policies (can't bypass)
- API-level validation
- Frontend UI guards
- Role-based checks

### 4. AI Integration
Smart AI triggering:
- Context detection (@ai)
- Permission validation
- Separate message for response
- Maintains chat flow

### 5. State Management
- Individual chat: In-memory for speed
- Group chat: Database for persistence
- Frontend: React hooks with subscriptions

---

## Future Enhancement Possibilities

Based on the infrastructure in place:

### Short-term (Already Supported)
1. **Message Editing** - Schema has `edited_at` column
2. **Reply Threading** - Schema has `reply_to` column
3. **File Sharing** - Metadata column supports attachments
4. **Message Reactions** - Can use metadata JSONB field
5. **Typing Indicators** - Presence system can track

### Medium-term (Requires Work)
1. **Voice Messages** - Need audio storage
2. **Video Chat** - WebRTC integration
3. **Screen Sharing** - Browser API integration
4. **Message Search** - Full-text search indexes
5. **Chat Export** - Export to PDF/CSV

### Long-term (Significant Changes)
1. **End-to-End Encryption** - Client-side encryption
2. **AI Context from Documents** - RAG implementation
3. **Multi-language Support** - i18n framework
4. **Mobile Apps** - React Native version
5. **Voice-to-Text** - Speech recognition API

---

## Configuration & Environment

### Required Environment Variables

```bash
# FastAPI Backend
GROQ_API_KEY=your_groq_api_key
FASTAPI_URL=http://localhost:8000

# Express Backend
SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Frontend
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
NEXT_PUBLIC_FASTAPI_URL=http://localhost:8000
```

### Database Setup

1. **Run migrations:**
   ```bash
   # In Supabase SQL Editor
   - Execute: 20240928000001_enable_realtime_group_chat.sql
   - Execute: 20240929000001_group_chat_functions.sql
   ```

2. **Enable Real-time:**
   - Go to Supabase Dashboard → Database → Replication
   - Enable replication for `messages` table
   - Enable replication for `user_presence` table

3. **Verify RLS:**
   - Check all policies are active
   - Test with different user roles

---

## Troubleshooting Guide

### Individual AI Chat Issues

**Problem:** AI not responding
- **Check:** GROQ_API_KEY is set
- **Check:** FastAPI server is running (port 8000)
- **Check:** Network connectivity to Groq API

**Problem:** Session not found
- **Cause:** Session was deleted or expired (server restart)
- **Solution:** Create new session

### Group Chat Issues

**Problem:** Messages not appearing in real-time
- **Check:** Supabase real-time is enabled
- **Check:** Real-time subscription is active (check browser console)
- **Check:** RLS policies allow SELECT for user

**Problem:** Cannot send messages
- **Check:** User is member of the group
- **Check:** Session is not 'completed'
- **Check:** RLS policies allow INSERT for user

**Problem:** AI not responding in group chat
- **Check:** User has AI invoke permissions
- **Check:** Message contains AI trigger (@ai, /ai)
- **Check:** FastAPI server is running
- **Check:** Express → FastAPI communication is working

**Problem:** Not seeing online users
- **Check:** user_presence table has entries
- **Check:** Real-time is enabled for user_presence
- **Check:** Presence updates are being sent

---

## Performance Considerations

### Individual AI Chat
- **Memory:** Each session stored in RAM
- **Scalability:** Limited by server memory
- **Recommendation:** Implement session expiration (e.g., 24 hours)

### Group Chat
- **Database:** All messages in PostgreSQL
- **Real-time:** WebSocket connections per user
- **Scalability:** Good (Supabase handles scaling)
- **Recommendations:**
  - Archive old messages
  - Limit message history queries
  - Use pagination (already implemented)
  - Consider message retention policy

---

## Conclusion

The AI Research Assistant implements a sophisticated dual-chat system:

1. **Individual AI Chat** provides quick, personal AI assistance with minimal overhead
2. **Group Chat** enables collaborative research discussions with optional AI participation

Both systems are well-architected, secure, and scalable. The separation of concerns between FastAPI (AI processing) and Express (real-time chat) is particularly elegant. The use of Supabase for real-time capabilities and RLS for security is a modern, robust approach.

The system is production-ready with room for future enhancements based on the solid foundation already in place.

---

## Document Information

- **Created:** 2024
- **Purpose:** Technical documentation for development team
- **Scope:** Complete chat and group chat functionality analysis
- **Last Updated:** Current
