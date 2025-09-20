# Global User Context System

## Overview

The AI Research Assistant now uses a centralized **Global User Context System** that eliminates authentication confusion and provides consistent user state management across the entire frontend application.

## Problem Solved

Previously, each component managed its own authentication state, leading to:
- "Unable to get user information" errors
- Inconsistent user ID mapping between Supabase and internal database
- Complex authentication logic scattered across components
- State synchronization issues
- Difficult debugging and maintenance

## Solution: Global User Context

### Architecture

```
┌─────────────────────────────────────────┐
│               App Root                  │
│            (layout.tsx)                 │
│                                         │
│  ┌───────────────────────────────────┐  │
│  │        UserProvider               │  │
│  │   (Global Authentication State)   │  │
│  │                                   │  │
│  │  ┌─────────────────────────────┐  │  │
│  │  │     All Components          │  │  │
│  │  │   use useUser() hook        │  │  │
│  │  │                             │  │  │
│  │  │ - Navigation                │  │  │
│  │  │ - Groups Pages              │  │  │
│  │  │ - Sessions                  │  │  │
│  │  │ - Profile                   │  │  │
│  │  │ - Settings                  │  │  │
│  │  └─────────────────────────────┘  │  │
│  └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
```

## Implementation

### 1. UserContext Provider

**Location**: `frontend/src/app/contexts/UserContext.tsx`

The `UserProvider` wraps the entire application and provides:

#### Core State
- `user`: Supabase user object
- `internalUserId`: Mapped internal database user ID
- `isAuthenticated`: Boolean authentication status
- `isLoading`: Loading state during authentication checks
- `error`: Authentication error messages

#### Authentication Actions
- `signIn(email, password)`: User authentication
- `signUp(email, password, metadata)`: User registration
- `signOut()`: User logout

#### Utility Functions
- `getUserDisplayName()`: Returns formatted display name
- `getUserEmail()`: Returns user email
- `getUserAvatar()`: Returns avatar URL
- `isGuestUser()`: Checks if user is guest (ID = 0)
- `canCreateGroups()`: Checks if user can create groups (ID >= 2)

#### State Management
- `refreshUser()`: Manually refresh user data
- `clearError()`: Clear error messages

### 2. Custom Hook

**Location**: `frontend/src/app/contexts/UserContext.tsx`

```tsx
import { useUser } from '../contexts';

const MyComponent = () => {
  const { 
    user, 
    internalUserId, 
    isAuthenticated, 
    isLoading,
    getUserDisplayName,
    canCreateGroups 
  } = useUser();

  // Simple, clean component logic
  if (!isAuthenticated) {
    return <LoginPrompt />;
  }

  return (
    <div>
      <h1>Welcome, {getUserDisplayName()}!</h1>
      {canCreateGroups() && <CreateGroupButton />}
    </div>
  );
};
```

### 3. App Integration

**Location**: `frontend/src/app/layout.tsx`

```tsx
import { UserProvider } from "./contexts";

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <UserProvider>
          <Navigation />
          <main>{children}</main>
        </UserProvider>
      </body>
    </html>
  );
}
```

## Usage Examples

### Before (Complex, Error-Prone)

```tsx
// OLD WAY - scattered across components
const [user, setUser] = useState(null);
const [currentUserId, setCurrentUserId] = useState(null);
const [loading, setLoading] = useState(true);

useEffect(() => {
  const checkAuth = async () => {
    const currentUser = await authService.getCurrentUser();
    if (!currentUser) {
      setError('Please log in');
      return;
    }
    
    let internalUserId = authService.getCurrentInternalUserId();
    if (internalUserId === null || internalUserId === 0) {
      // Complex sync logic...
      try {
        const syncResponse = await fetch('/api/auth/sync-profile');
        // More complex logic...
      } catch (err) {
        // Error handling...
      }
    }
    
    setUser(currentUser);
    setCurrentUserId(internalUserId);
  };
  
  checkAuth();
}, []);
```

### After (Simple, Reliable)

```tsx
// NEW WAY - clean and simple
const { user, internalUserId, isAuthenticated, isLoading } = useUser();

if (isLoading) return <LoadingSpinner />;
if (!isAuthenticated) return <LoginPrompt />;

// Component logic with guaranteed user state
```

## Migration Guide

### Components Updated

1. **Navigation Component** (`components/Navigation.tsx`)
   - Removed local auth state management
   - Uses `useUser()` for all user operations

2. **Sessions Page** (`groups/[id]/sessions/page.tsx`)
   - Eliminated complex authentication debugging code
   - Simplified user validation logic
   - Fixed "Unable to get user information" error

3. **Root Layout** (`layout.tsx`)
   - Wrapped app with `UserProvider`

### Migration Pattern

For any component that previously managed auth state:

1. **Remove** local auth state variables
2. **Remove** complex authentication logic
3. **Import** and use `useUser()` hook
4. **Replace** auth checks with context values

```tsx
// Remove these
const [user, setUser] = useState(null);
const [currentUserId, setCurrentUserId] = useState(null);
// Complex auth logic...

// Replace with this
const { user, internalUserId, isAuthenticated } = useUser();
```

## Benefits

### 1. Eliminated Authentication Errors
- No more "Unable to get user information" errors
- Automatic Supabase to internal ID mapping
- Consistent state across all components

### 2. Simplified Development
- Single line to get user data: `const { user, internalUserId } = useUser()`
- No complex authentication logic in components
- Automatic error handling and loading states

### 3. Better Maintainability
- Centralized authentication logic
- Single source of truth for user state
- Easy to debug and extend

### 4. Improved User Experience
- Faster authentication checks
- Consistent UI states
- Better error messages

## Configuration

### Environment Variables

The UserContext automatically handles environment-specific configuration:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
NEXT_PUBLIC_EXPRESS_DB_URL=http://localhost:3001
```

### Development Mode

Includes built-in development utilities:
- Mock authentication support
- Enhanced debugging
- Development-specific user handling

## Error Handling

The UserContext provides comprehensive error handling:

```tsx
const { error, clearError } = useUser();

if (error) {
  return (
    <div className="error-message">
      {error}
      <button onClick={clearError}>Dismiss</button>
    </div>
  );
}
```

## Authentication Flow

```mermaid
graph TD
    A[App Starts] --> B[UserProvider Initializes]
    B --> C[Check Supabase Auth]
    C --> D{User Authenticated?}
    D -->|Yes| E[Get Internal User ID]
    D -->|No| F[Set user = null]
    E --> G[Set Global State]
    F --> G
    G --> H[Components Use useUser()]
    H --> I[Automatic State Updates]
```

## Best Practices

### 1. Always Use the Hook
```tsx
// ✅ Correct
const { user, internalUserId } = useUser();

// ❌ Avoid
const user = await authService.getCurrentUser();
```

### 2. Handle Loading States
```tsx
const { user, isLoading, isAuthenticated } = useUser();

if (isLoading) return <LoadingSpinner />;
if (!isAuthenticated) return <LoginPrompt />;
```

### 3. Use Utility Functions
```tsx
const { getUserDisplayName, canCreateGroups } = useUser();

return (
  <div>
    <h1>{getUserDisplayName()}</h1>
    {canCreateGroups() && <CreateButton />}
  </div>
);
```

## Future Enhancements

Potential improvements to the UserContext system:

1. **Role-Based Access Control**: Enhanced permission checking
2. **Offline Support**: Cache user state for offline usage
3. **Multi-Tenant Support**: Handle multiple organization contexts
4. **Advanced Caching**: Optimize performance with smart caching

## Troubleshooting

### Common Issues

1. **"useUser must be used within UserProvider"**
   - Ensure component is inside UserProvider wrapper
   - Check that layout.tsx includes UserProvider

2. **User state not updating**
   - UserContext automatically handles state changes
   - Use `refreshUser()` if manual refresh needed

3. **Internal user ID is null**
   - UserContext handles ID mapping automatically
   - Check backend user profile sync endpoint

### Debug Information

The UserContext includes comprehensive logging:
- Authentication initialization steps
- User ID mapping process
- Error details and context

## Related Documentation

- [Authentication & Security Plan](./AUTHENTICATION_SECURITY_PLAN.md)
- [Frontend Services README](./FRONTEND_SERVICES_README.md)
- [API Endpoints](./API_ENDPOINTS_COMPLETE.md)
- [Migration Guide](./MIGRATION_COMPLETE.md)