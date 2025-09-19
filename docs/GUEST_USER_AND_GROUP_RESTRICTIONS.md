# Guest User and Group Creation Restrictions

## Overview
This document outlines the implementation of guest user functionality and group creation restrictions to improve security and user management.

## Changes Implemented

### 1. Database Changes (Migration: 20250919000001)

#### Guest User Creation
- Created a guest user with ID 0 (`guest@system.local`)
- Modified users table to allow manual insertion of ID 0
- Guest user serves as fallback for unmapped authentication users

#### Group Creation Restrictions
- Added database constraint: `check_group_creator_id` prevents users with ID < 2 from creating groups
- Added trigger function: `check_group_creation_permissions()` enforces the same restriction on direct INSERTs
- Updated `create_group()` function to check user permissions before creating groups

### 2. Frontend Changes

#### Auth Service Updates (`authService.ts`)
- Changed guest user fallback from ID 1 to ID 0
- Guest users now get ID 0 when not found in database
- Maintains proper user isolation and security

#### Groups Page Updates (`groups/page.tsx`)
- Added conditional rendering for create group button
- Guest users (ID < 2) see disabled button with tooltip
- Different empty state messages for guest vs regular users

#### Create Group Page Updates (`groups/create/page.tsx`)
- Added permission check on page load
- Prevents guest users from accessing group creation
- Shows appropriate error messages for restricted users

### 3. User ID System

#### User ID Allocation
- **ID 0**: Reserved for guest users (cannot create groups)
- **ID 1**: Reserved for the first admin/AI user (cannot create groups)
- **ID ≥ 2**: Regular users (can create groups)

#### Security Benefits
- Prevents unauthorized group creation
- Clear separation between system users and regular users
- Database-level enforcement prevents bypassing frontend restrictions

## Database Verification

### Users Table
```sql
SELECT user_id, email, first_name, last_name FROM users ORDER BY user_id;
```
Expected output:
```
 user_id |       email        | first_name | last_name 
---------+--------------------+------------+-----------
       0 | guest@system.local | Guest      | User
       1 | ai@assistant.com   | ai         | user
      2+ | real user emails   | ...        | ...
```

### Testing Group Creation Restrictions
```sql
-- Should fail (guest user)
SELECT create_group('Test Group'::varchar, 0::integer);

-- Should fail (system user)
SELECT create_group('Test Group'::varchar, 1::integer);

-- Should succeed (regular user)
SELECT create_group('Test Group'::varchar, 2::integer);
```

### Direct INSERT Protection
```sql
-- Should fail with trigger error
INSERT INTO groups (name, created_by) VALUES ('Direct Insert Test', 0);
```

## Frontend User Experience

### Guest Users (ID 0)
- Can view and join existing groups
- Cannot create new groups
- See disabled "Create Group" button with tooltip
- Get appropriate error messages if they try to access creation page

### Regular Users (ID ≥ 2)
- Full access to all group functionality
- Can create and manage groups
- Normal user experience without restrictions

## Implementation Notes

### Why ID 0 for Guest Users?
- Clear distinction from regular user IDs
- Standard practice for system/guest accounts
- Easier to implement restrictions with simple `< 2` checks

### Database Constraints vs Frontend Checks
- Database constraints provide security even if frontend is bypassed
- Frontend checks provide better user experience
- Both layers work together for robust protection

### Migration Safety
- Uses `ON CONFLICT DO NOTHING` to handle re-runs
- Properly handles identity sequence restart
- Preserves existing data and functions

## Future Considerations

### User Onboarding
- Consider implementing proper user registration flow
- Add user role management system
- Implement admin interface for user promotion

### Enhanced Permissions
- Could extend to role-based permissions
- Add different types of restrictions (e.g., session creation)
- Implement group-level permissions

## Testing Checklist

- [x] Guest user (ID 0) created successfully
- [x] Database constraint prevents group creation by users ID < 2
- [x] Trigger function blocks direct INSERTs by restricted users
- [x] Function-level restriction works correctly
- [x] Frontend shows appropriate UI for guest users
- [x] Create group page blocks guest users
- [x] Regular users (ID ≥ 2) can create groups normally
- [x] User isolation maintained (no cross-user data leakage)

## Deployment Notes

### Required Steps
1. Apply database migration: `20250919000001_add_guest_user_and_group_restrictions.sql`
2. Deploy updated frontend code with auth service changes
3. Verify guest user creation and constraints in production
4. Test user flows with different user types

### Rollback Plan
If issues arise, the migration can be reverted by:
1. Removing the database constraints
2. Reverting frontend auth service changes
3. Rolling back to previous migration state

The system gracefully handles missing constraints, so partial rollback is possible.