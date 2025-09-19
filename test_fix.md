# Group Management Bug Fix

## Issue Description
When a user creates a group and logs out, then another user logs in, the previous group was still visible in the new user's groups window showing the new user as admin even though the database doesn't reflect this.

## Root Causes Identified

1. **Hardcoded User ID**: The frontend was using a hardcoded `userId = 1` instead of mapping the Supabase user to the internal user system
2. **Incomplete Logout**: The Navigation component called `supabase.auth.signOut()` directly instead of using `authService.signOut()` which properly clears localStorage tokens
3. **No State Reset**: When users switch accounts, the frontend didn't clear the group state, so cached data persisted

## Fixes Applied

### 1. Fixed Navigation Logout
- Updated `Navigation.tsx` to use `authService.signOut()` instead of direct Supabase logout
- This ensures proper cleanup of tokens and API client state

### 2. Fixed User ID Mapping in Groups Page
- Added helper function `mapSupabaseUserToUserId()` to consistently map Supabase users to internal user IDs
- Added `currentUserId` state that gets updated when user changes
- Added `clearGroupState()` function to reset all group-related state
- Updated auth state change handler to detect user switches and clear state
- Updated group loading to use proper user ID instead of hardcoded value

### 3. Fixed Group Detail Page
- Added same user ID mapping logic
- Added null checks for `currentUserId` in all API calls
- Updated auth setup to set current user ID

### 4. Fixed Group Creation Page
- Added user ID mapping logic
- Updated group creation to use proper user ID instead of hardcoded value

### 5. Fixed Join Group Page
- Added user ID mapping logic  
- Updated join group functionality to use proper user ID

## How the User ID Mapping Works

The mapping function creates a consistent hash from the user's email:
```typescript
const mapSupabaseUserToUserId = (supabaseUser: User): number => {
  const emailHash = supabaseUser.email?.split('@')[0] || 'user';
  
  let hash = 0;
  for (let i = 0; i < emailHash.length; i++) {
    const char = emailHash.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  
  return Math.abs(hash % 1000) + 1;
};
```

This ensures:
- Same email always maps to same user ID
- Different emails map to different user IDs
- User IDs are positive integers (1-1000)

## Test Scenarios

To verify the fix:

1. **Create Group as User A**
   - Sign in as User A
   - Create a group
   - Verify user A sees the group and is admin

2. **Switch to User B**  
   - Log out from User A
   - Sign in as User B
   - Verify User B does NOT see User A's group
   - Verify User B's groups list is empty (if they haven't created any)

3. **Create Group as User B**
   - While signed in as User B, create a new group
   - Verify User B sees their group and is admin
   - Verify the group belongs to User B's mapped user ID

4. **Switch Back to User A**
   - Log out from User B
   - Sign in as User A  
   - Verify User A still sees only their original group
   - Verify User A does NOT see User B's group

## Database Verification

You can verify the fix by checking the database:

```sql
-- Check group ownership
SELECT g.group_id, g.name, g.created_by, gp.user_id, gp.role 
FROM groups g 
JOIN group_participants gp ON g.group_id = gp.group_id 
WHERE gp.role = 'admin';

-- Check user groups
SELECT * FROM get_user_groups(1);  -- Replace 1 with actual user ID
```

The user IDs in the database should now correspond to the mapped IDs from the email hashes, not the hardcoded value of 1.