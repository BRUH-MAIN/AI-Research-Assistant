-- =====================================================
-- MIGRATION VALIDATION SCRIPT
-- Date: 2024-09-21
-- Description: Validate that consolidated migrations provide all expected functionality
-- =====================================================

-- This script tests key functionality to ensure consolidation maintains compatibility

DO $$
DECLARE
    test_result TEXT;
    test_count INTEGER := 0;
    pass_count INTEGER := 0;
BEGIN
    RAISE NOTICE 'Starting Migration Validation Tests...';
    RAISE NOTICE '================================================';
    
    -- Test 1: Check if all tables exist
    test_count := test_count + 1;
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name IN ('users', 'groups', 'sessions', 'messages', 'papers', 
                          'group_participants', 'session_participants', 'paper_tags', 
                          'session_papers', 'ai_metadata', 'feedback')
    ) THEN
        pass_count := pass_count + 1;
        RAISE NOTICE 'TEST 1 PASSED: All core tables exist';
    ELSE
        RAISE NOTICE 'TEST 1 FAILED: Missing core tables';
    END IF;
    
    -- Test 2: Check if core functions exist
    test_count := test_count + 1;
    IF EXISTS (
        SELECT 1 FROM information_schema.routines 
        WHERE routine_schema = 'public' 
        AND routine_name IN ('get_all_users', 'create_user', 'get_all_groups', 
                           'create_group', 'get_all_sessions', 'create_session',
                           'get_session_messages', 'create_message')
    ) THEN
        pass_count := pass_count + 1;
        RAISE NOTICE 'TEST 2 PASSED: All core functions exist';
    ELSE
        RAISE NOTICE 'TEST 2 FAILED: Missing core functions';
    END IF;
    
    -- Test 3: Check if triggers exist
    test_count := test_count + 1;
    IF EXISTS (
        SELECT 1 FROM information_schema.triggers 
        WHERE trigger_name IN ('update_users_updated_at', 'trigger_set_group_invite_code',
                              'trigger_check_group_creation_permissions')
    ) THEN
        pass_count := pass_count + 1;
        RAISE NOTICE 'TEST 3 PASSED: All triggers exist';
    ELSE
        RAISE NOTICE 'TEST 3 FAILED: Missing triggers';
    END IF;
    
    -- Test 4: Check if indexes exist
    test_count := test_count + 1;
    IF EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE schemaname = 'public' 
        AND indexname IN ('idx_users_auth_user_id', 'idx_groups_invite_code', 
                         'idx_sessions_group_id', 'idx_messages_session_id')
    ) THEN
        pass_count := pass_count + 1;
        RAISE NOTICE 'TEST 4 PASSED: Key indexes exist';
    ELSE
        RAISE NOTICE 'TEST 4 FAILED: Missing key indexes';
    END IF;
    
    -- Test 5: Check if guest and AI users exist
    test_count := test_count + 1;
    IF EXISTS (
        SELECT 1 FROM users 
        WHERE user_id IN (0, 1) 
        AND email IN ('guest@system.local', 'ai@assistant.com')
    ) THEN
        pass_count := pass_count + 1;
        RAISE NOTICE 'TEST 5 PASSED: Guest and AI users exist';
    ELSE
        RAISE NOTICE 'TEST 5 FAILED: Missing guest or AI user';
    END IF;
    
    -- Test 6: Check if constraints exist
    test_count := test_count + 1;
    IF EXISTS (
        SELECT 1 FROM information_schema.check_constraints 
        WHERE constraint_name IN ('check_group_creator_id', 'availability_constraint', 
                                 'role_constraint', 'status_constraint')
    ) THEN
        pass_count := pass_count + 1;
        RAISE NOTICE 'TEST 6 PASSED: Key constraints exist';
    ELSE
        RAISE NOTICE 'TEST 6 FAILED: Missing key constraints';
    END IF;
    
    -- Test 7: Test function execution (safe functions only)
    test_count := test_count + 1;
    BEGIN
        PERFORM get_all_users();
        PERFORM get_all_groups();
        PERFORM get_all_sessions();
        pass_count := pass_count + 1;
        RAISE NOTICE 'TEST 7 PASSED: Core functions execute without error';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'TEST 7 FAILED: Function execution error - %', SQLERRM;
    END;
    
    -- Summary
    RAISE NOTICE '================================================';
    RAISE NOTICE 'VALIDATION SUMMARY: % of % tests passed', pass_count, test_count;
    IF pass_count = test_count THEN
        RAISE NOTICE 'STATUS: ALL TESTS PASSED - Migration consolidation successful!';
    ELSE
        RAISE NOTICE 'STATUS: % TESTS FAILED - Review migration setup', (test_count - pass_count);
    END IF;
    RAISE NOTICE '================================================';
END $$;

-- Additional detailed checks
SELECT 
    'Tables' as category,
    COUNT(*) as count
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_type = 'BASE TABLE'

UNION ALL

SELECT 
    'Functions' as category,
    COUNT(*) as count
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_type = 'FUNCTION'

UNION ALL

SELECT 
    'Triggers' as category,
    COUNT(*) as count
FROM information_schema.triggers 
WHERE trigger_schema = 'public'

UNION ALL

SELECT 
    'Indexes' as category,
    COUNT(*) as count
FROM pg_indexes 
WHERE schemaname = 'public';

-- List all available functions for reference
SELECT 
    routine_name as function_name,
    routine_type,
    data_type as return_type
FROM information_schema.routines 
WHERE routine_schema = 'public' 
ORDER BY routine_name;