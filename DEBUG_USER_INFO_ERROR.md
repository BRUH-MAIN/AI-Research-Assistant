# Debugging "Unable to get user information" Error

## Problem
The sessions page is showing "Unable to get user information" error when trying to access `/groups/[id]/sessions`.

## Root Cause Analysis
The error occurs when `authService.getCurrentInternalUserId()` returns `null` or `0`, which happens when:

1. **User not found in database**: The authenticated Supabase user doesn't have a corresponding record in the `users` table
2. **Profile sync failed**: The automatic profile sync didn't work properly
3. **Timing issue**: The internal user ID mapping hasn't been established yet

## Quick Fix Applied

### 1. Enhanced Error Handling
- Added proper null/0 checks for internal user ID
- Added comprehensive logging for debugging
- Added retry mechanism with profile sync

### 2. Automatic Profile Sync
- Automatically attempts to sync profile if internal user ID is missing
- Uses the `/api/auth/sync-profile` endpoint
- Retries auth initialization after sync

### 3. Better User Experience
- Shows more descriptive error messages
- Provides retry button for user info errors
- Directs users to appropriate next steps

## To Test the Fix

1. **Check Console Logs**: Open browser dev tools and look for:
   ```
   Current authenticated user: {user object}
   Internal user ID not found, attempting to sync profile...
   After profile sync, internal user ID: {number}
   Successfully got internal user ID: {number}
   ```

2. **If Still Getting Error**:
   - Click the "Retry / Refresh Page" button
   - Check if user exists in database by going to `/groups` page first
   - Ensure user is actually a member of the group

3. **Manual Profile Sync** (if needed):
   - Go to any working page (like `/groups`)
   - Open browser console
   - Run: `localStorage.clear()` and refresh
   - Or use the profile sync endpoint manually

## Possible Additional Issues

### User Not in Database
If the user doesn't exist in the `users` table:
- The auth service will assign guest user ID (0)
- Sessions page will reject this and show error
- **Solution**: Ensure user registration process creates database record

### User Not in Group
If user exists but isn't a group member:
- Shows "You are not a member of this group" error
- **Solution**: User needs to join the group first

### API Connection Issues
If Express DB server is down:
- Profile sync will fail
- **Solution**: Ensure `docker-compose up` is running all services

## Next Steps if Issue Persists

1. **Check Database**: Verify user exists in `users` table
2. **Check Group Membership**: Verify user is in `group_participants` table
3. **Check Auth Token**: Ensure valid Supabase auth token exists
4. **Check Services**: Ensure all Docker services are running

## Testing Commands

```bash
# Check if services are running
sudo docker-compose ps

# Restart services if needed
sudo docker-compose down && sudo docker-compose up

# Check logs for auth service
sudo docker-compose logs express-db-server
```

The fix should resolve most cases of this error by automatically syncing the profile and providing clear feedback to users.