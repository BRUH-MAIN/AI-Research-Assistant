-- =====================================================
-- AUTH UUID TO INTEGER FIX
-- Date: 2024-09-30  
-- Description: Fix RLS policies that incorrectly cast UUID to INTEGER
-- =====================================================

-- This migration fixes the auth.uid() casting issues in RLS policies
-- The error "cannot cast type uuid to integer" occurs because auth.uid() 
-- returns UUID but user_id columns are INTEGER. The fix is to join through
-- the users table to connect auth_user_id (UUID) to user_id (INTEGER).

-- ISSUE: The following RLS policies in 20240928000001_enable_realtime_group_chat.sql
-- were trying to cast auth.uid()::int which fails because:
-- 1. auth.uid() returns UUID type
-- 2. user_id columns are INTEGER type
-- 3. Direct casting UUID to INTEGER is not allowed in PostgreSQL

-- SOLUTION: Join through users table using auth_user_id column
-- Instead of: AND gp.user_id = auth.uid()::int
-- Use: JOIN users u ON gp.user_id = u.user_id AND u.auth_user_id = auth.uid()

-- The 20240928000001_enable_realtime_group_chat.sql file has been updated to use the correct approach.

-- Verify the helper function exists for easier auth lookups
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.routines 
        WHERE routine_schema = 'public' 
        AND routine_name = 'current_user_id'
    ) THEN
        -- Create helper function if it doesn't exist
        CREATE OR REPLACE FUNCTION public.current_user_id()
        RETURNS INTEGER
        LANGUAGE plpgsql
        SECURITY DEFINER
        STABLE
        AS $func$
        DECLARE
          user_id_result INTEGER;
        BEGIN
          SELECT user_id INTO user_id_result
          FROM public.users 
          WHERE auth_user_id = auth.uid();
          
          RETURN user_id_result;
        END;
        $func$;
        
        RAISE NOTICE 'Created helper function current_user_id()';
    ELSE
        RAISE NOTICE 'Helper function current_user_id() already exists';
    END IF;
END $$;

-- Alternative approach using the helper function:
-- Instead of complex joins in RLS policies, you can use:
-- AND gp.user_id = current_user_id()

-- However, the JOIN approach is preferred for RLS policies because:
-- 1. It's more explicit about the relationship
-- 2. It performs better in complex queries
-- 3. It's more maintainable

-- =====================================================
-- VERIFICATION
-- =====================================================

-- Test that the helper function works
DO $$
DECLARE
    test_result INTEGER;
BEGIN
    -- This will return NULL when not authenticated, which is expected
    SELECT current_user_id() INTO test_result;
    RAISE NOTICE 'Helper function test completed (returns NULL when not authenticated)';
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Helper function test failed: %', SQLERRM;
END $$;

-- List all RLS policies on tables to verify they're using correct auth patterns
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

COMMENT ON FUNCTION public.current_user_id() IS 'Helper function to get current authenticated user integer ID from auth.uid()';

-- =====================================================
-- NOTES FOR DEVELOPERS
-- =====================================================

-- When writing new RLS policies, remember:
-- 1. auth.uid() returns UUID, not INTEGER
-- 2. user_id columns are INTEGER in this schema
-- 3. Use auth_user_id column to bridge between them
-- 4. Pattern: JOIN users u ON some_table.user_id = u.user_id AND u.auth_user_id = auth.uid()
-- 5. Or use the helper function: some_table.user_id = current_user_id()

-- Fixed RLS policies in 20240928000001_enable_realtime_group_chat.sql:
-- ✅ "Users can read group messages" - Now uses proper JOIN
-- ✅ "Users can send group messages" - Now uses proper JOIN  
-- ✅ "Users can update own messages" - Now uses proper JOIN
-- ✅ "Users can delete own messages or admin" - Now uses proper JOIN
-- ✅ "Users can read presence in their groups" - Now uses proper JOIN
-- ✅ "Users can manage own presence" - Now uses proper JOIN
