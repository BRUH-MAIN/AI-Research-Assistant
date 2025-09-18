# Frontend API Services Documentation

This directory contains all the API services and hooks for the AI Research Assistant frontend application.

## Overview

The API services are organized into several layers:
- **Base API Client** (`api.ts`) - Core HTTP client with error handling and authentication
- **Service Classes** - Individual service classes for each domain (users, papers, sessions, etc.)
- **React Hooks** - Custom hooks for easy integration with React components
- **TypeScript Types** - Comprehensive type definitions for all API entities

## Quick Start

### Basic Usage

```typescript
import { userService, sessionService } from '../services';

// Fetch all users
const users = await userService.getUsers();

// Create a new session
const session = await sessionService.createSession({
  title: 'My Research Session',
  description: 'Discussing AI research papers',
  created_by: userId,
  status: 'active'
});
```

### Using React Hooks

```typescript
import { useUsers, useCreateUser, useSessionMessages } from '../hooks';

function MyComponent() {
  const { data: users, loading, error } = useUsers();
  const { mutate: createUser } = useCreateUser();
  
  const handleCreateUser = async () => {
    await createUser({
      username: 'newuser',
      email: 'user@example.com'
    });
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;
  
  return (
    <div>
      <h2>Users ({users?.length})</h2>
      {users?.map(user => (
        <div key={user.id}>{user.username}</div>
      ))}
      <button onClick={handleCreateUser}>Add User</button>
    </div>
  );
}
```

## Available Services

### 1. User Service (`userService`)

Manages user accounts and authentication.

**Methods:**
- `getUsers()` - Get all users
- `getUser(id)` - Get user by ID
- `createUser(data)` - Create new user
- `updateUser(id, data)` - Update user
- `deleteUser(id)` - Delete user
- `activateUser(id)` - Activate user account
- `deactivateUser(id)` - Deactivate user account

**Hooks:**
- `useUsers()` - Fetch all users
- `useUser(id)` - Fetch specific user
- `useCreateUser()` - Create user mutation
- `useUpdateUser()` - Update user mutation
- `useDeleteUser()` - Delete user mutation

### 2. Group Service (`groupService`)

Manages user groups and memberships.

**Methods:**
- `getGroups()` - Get all groups
- `getGroup(id)` - Get group by ID
- `createGroup(data)` - Create new group
- `updateGroup(id, data)` - Update group
- `deleteGroup(id)` - Delete group
- `getGroupMembers(id)` - Get group members
- `addGroupMember(groupId, userData)` - Add member to group
- `removeGroupMember(groupId, userId)` - Remove member from group

### 3. Session Service (`sessionService`)

Manages research sessions and participation.

**Methods:**
- `getSessions()` - Get all sessions
- `getSession(id)` - Get session by ID
- `createSession(data)` - Create new session
- `updateSession(id, data)` - Update session
- `deleteSession(id)` - Delete session
- `joinSession(id)` - Join a session
- `leaveSession(id)` - Leave a session

### 4. Message Service (`messageService`)

Handles chat messages within sessions.

**Methods:**
- `getMessages(filters?)` - Get messages with optional filtering
- `getMessage(id)` - Get message by ID
- `createMessage(data)` - Create new message
- `updateMessage(id, data)` - Update message
- `deleteMessage(id)` - Delete message
- `getSessionMessages(sessionId)` - Get all messages in a session
- `createSessionMessage(sessionId, data)` - Create message in specific session

### 5. Paper Service (`paperService`)

Manages research papers and their metadata.

**Methods:**
- `getPapers()` - Get all papers
- `getPaper(id)` - Get paper by ID
- `createPaper(data)` - Create new paper
- `updatePaper(id, data)` - Update paper
- `deletePaper(id)` - Delete paper
- `searchPapers(params)` - Search papers by query
- `getPaperTags(id)` - Get tags for a paper
- `addPaperTags(id, tags)` - Add tags to paper
- `removePaperTag(id, tag)` - Remove tag from paper
- `getSessionPapers(sessionId)` - Get papers linked to session
- `linkPaperToSession(sessionId, paperId)` - Link paper to session
- `removePaperFromSession(sessionId, paperId)` - Remove paper from session

### 6. Feedback Service (`feedbackService`)

Manages session feedback and reviews.

**Methods:**
- `getSessionFeedback(sessionId)` - Get feedback for session
- `createSessionFeedback(sessionId, data)` - Create feedback for session
- `getFeedback(id)` - Get feedback by ID
- `updateFeedback(id, data)` - Update feedback
- `deleteFeedback(id)` - Delete feedback
- `getUserFeedback(userId)` - Get all feedback by user

### 7. AI Metadata Service (`aiMetadataService`)

Manages AI-generated metadata and annotations.

**Methods:**
- `getMessageAiMetadata(messageId)` - Get AI metadata for message
- `createMessageAiMetadata(messageId, data)` - Create AI metadata for message
- `getPaperAiMetadata(paperId)` - Get AI metadata for paper
- `getSessionAiMetadata(sessionId)` - Get all AI metadata for session
- `getAiMetadata(id)` - Get metadata by ID
- `updateAiMetadata(id, data)` - Update metadata
- `deleteAiMetadata(id)` - Delete metadata

## Error Handling

All services use a consistent error handling approach:

```typescript
import { ApiError } from '../services';

try {
  const users = await userService.getUsers();
} catch (error) {
  if (error instanceof ApiError) {
    console.error('API Error:', error.message, 'Status:', error.status);
    // Handle specific error cases
    switch (error.status) {
      case 401:
        // Handle unauthorized
        break;
      case 404:
        // Handle not found
        break;
      default:
        // Handle other errors
        break;
    }
  } else {
    console.error('Network or other error:', error);
  }
}
```

When using hooks, errors are automatically handled:

```typescript
const { data, loading, error } = useUsers();

if (error) {
  // Error is a string message, already processed
  return <div className="error">Error: {error}</div>;
}
```

## Configuration

### Environment Variables

Set the following environment variables:

```bash
# API base URL (defaults to http://localhost:8000/api/v1)
NEXT_PUBLIC_API_URL=https://your-api-domain.com/api/v1
```

### Authentication

The API client automatically includes authentication tokens:

```typescript
import { apiClient } from '../services';

// Set auth token (usually after login)
apiClient.setAuthToken('your-jwt-token');

// Clear auth token (usually after logout)
apiClient.clearAuthToken();
```

## Advanced Usage

### Custom API Client

You can create custom API client instances:

```typescript
import { ApiClient } from '../services';

const customClient = new ApiClient('https://different-api.com/v1');
const customUserService = new UserService(customClient);
```

### Pagination

Use the pagination hook for large datasets:

```typescript
import { usePagination } from '../hooks';

function UsersList() {
  const { data: allUsers } = useUsers();
  const {
    currentData,
    currentPage,
    totalPages,
    nextPage,
    prevPage
  } = usePagination(allUsers || [], 10);

  return (
    <div>
      {currentData.map(user => (
        <div key={user.id}>{user.username}</div>
      ))}
      <button onClick={prevPage} disabled={currentPage === 1}>
        Previous
      </button>
      <span>Page {currentPage} of {totalPages}</span>
      <button onClick={nextPage} disabled={currentPage === totalPages}>
        Next
      </button>
    </div>
  );
}
```

### Optimistic Updates

For better UX, implement optimistic updates:

```typescript
function UpdateUserComponent({ user }) {
  const { mutate: updateUser } = useUpdateUser();
  const { refetch } = useUsers();

  const handleUpdate = async (newData) => {
    // Optimistically update local state here
    
    try {
      await updateUser({ userId: user.id, data: newData });
      // Success - the optimistic update was correct
    } catch (error) {
      // Revert optimistic update and show error
      refetch(); // Refresh data from server
    }
  };
}
```

## Testing

Example test for a service:

```typescript
import { userService } from '../services';

// Mock the API client
jest.mock('../services/api');

describe('UserService', () => {
  it('should fetch users', async () => {
    const mockUsers = [{ id: 1, username: 'test' }];
    (apiClient.get as jest.Mock).mockResolvedValue(mockUsers);

    const users = await userService.getUsers();
    
    expect(users).toEqual(mockUsers);
    expect(apiClient.get).toHaveBeenCalledWith('/users/');
  });
});
```

## File Structure

```
src/app/
├── services/
│   ├── api.ts                 # Base API client
│   ├── userService.ts         # User service
│   ├── groupService.ts        # Group service
│   ├── sessionService.ts      # Session service
│   ├── messageService.ts      # Message service
│   ├── paperService.ts        # Paper service
│   ├── feedbackService.ts     # Feedback service
│   ├── aiMetadataService.ts   # AI metadata service
│   └── index.ts               # Export all services
├── hooks/
│   ├── useApi.ts              # Base API hooks
│   ├── useServices.ts         # Service-specific hooks
│   └── index.ts               # Export all hooks
├── types/
│   └── types.ts               # TypeScript type definitions
└── components/
    └── ApiExampleComponent.tsx # Usage examples
```

This architecture provides a robust, type-safe, and developer-friendly way to interact with your backend API from the React frontend.