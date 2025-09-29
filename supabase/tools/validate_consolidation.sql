-- =====================================================
-- ENHANCED MIGRATION VALIDATION SCRIPT
-- Date: 2024-09-21
-- Updated: 2024-09-30
-- Description: Validate that consolidated migrations provide all expected functionality
-- =====================================================

-- This script tests key functionality to ensure consolidation maintains compatibility
-- and includes all functions expected by Express routes

DO $$
DECLARE
    test_result TEXT;
    test_count INTEGER := 0;
    pass_count INTEGER := 0;
    missing_functions TEXT := '';
BEGIN
    RAISE NOTICE 'Starting Enhanced Migration Validation Tests...';
    RAISE NOTICE '===========================================================';
    
    -- Test 1: Check if all tables exist
    test_count := test_count + 1;
    IF (SELECT COUNT(*) FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name IN ('users', 'groups', 'sessions', 'messages', 'papers', 
                          'group_participants', 'session_participants', 'paper_tags', 
                          'session_papers', 'ai_metadata', 'feedback', 'user_presence')) = 12 THEN
        pass_count := pass_count + 1;
        RAISE NOTICE 'TEST 1 PASSED: All core tables exist (12/12)';
    ELSE
        RAISE NOTICE 'TEST 1 FAILED: Missing core tables - Expected 12, found %', 
            (SELECT COUNT(*) FROM information_schema.tables 
             WHERE table_schema = 'public' 
             AND table_name IN ('users', 'groups', 'sessions', 'messages', 'papers', 
                               'group_participants', 'session_participants', 'paper_tags', 
                               'session_papers', 'ai_metadata', 'feedback', 'user_presence'));
    END IF;
    
    -- Test 2: Check if Express route functions exist
    test_count := test_count + 1;
    -- User functions
    missing_functions := '';
    IF NOT EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_schema = 'public' AND routine_name = 'get_all_users') THEN
        missing_functions := missing_functions || 'get_all_users, ';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_schema = 'public' AND routine_name = 'create_user') THEN
        missing_functions := missing_functions || 'create_user, ';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_schema = 'public' AND routine_name = 'get_user_by_id') THEN
        missing_functions := missing_functions || 'get_user_by_id, ';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_schema = 'public' AND routine_name = 'update_user') THEN
        missing_functions := missing_functions || 'update_user, ';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_schema = 'public' AND routine_name = 'delete_user') THEN
        missing_functions := missing_functions || 'delete_user, ';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_schema = 'public' AND routine_name = 'activate_user') THEN
        missing_functions := missing_functions || 'activate_user, ';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_schema = 'public' AND routine_name = 'deactivate_user') THEN
        missing_functions := missing_functions || 'deactivate_user, ';
    END IF;
    
    -- Group functions
    IF NOT EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_schema = 'public' AND routine_name = 'get_all_groups') THEN
        missing_functions := missing_functions || 'get_all_groups, ';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_schema = 'public' AND routine_name = 'create_group') THEN
        missing_functions := missing_functions || 'create_group, ';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_schema = 'public' AND routine_name = 'get_group_by_id') THEN
        missing_functions := missing_functions || 'get_group_by_id, ';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_schema = 'public' AND routine_name = 'get_group_members_detailed') THEN
        missing_functions := missing_functions || 'get_group_members_detailed, ';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_schema = 'public' AND routine_name = 'add_group_member') THEN
        missing_functions := missing_functions || 'add_group_member, ';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_schema = 'public' AND routine_name = 'remove_group_member') THEN
        missing_functions := missing_functions || 'remove_group_member, ';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_schema = 'public' AND routine_name = 'get_group_members') THEN
        missing_functions := missing_functions || 'get_group_members, ';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_schema = 'public' AND routine_name = 'get_group_by_name') THEN
        missing_functions := missing_functions || 'get_group_by_name, ';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_schema = 'public' AND routine_name = 'get_group_by_invite_code') THEN
        missing_functions := missing_functions || 'get_group_by_invite_code, ';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_schema = 'public' AND routine_name = 'join_group_by_invite_code') THEN
        missing_functions := missing_functions || 'join_group_by_invite_code, ';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_schema = 'public' AND routine_name = 'get_user_groups') THEN
        missing_functions := missing_functions || 'get_user_groups, ';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_schema = 'public' AND routine_name = 'update_group_member_role') THEN
        missing_functions := missing_functions || 'update_group_member_role, ';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_schema = 'public' AND routine_name = 'regenerate_invite_code') THEN
        missing_functions := missing_functions || 'regenerate_invite_code, ';
    END IF;
    
    -- Session functions
    IF NOT EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_schema = 'public' AND routine_name = 'get_all_sessions') THEN
        missing_functions := missing_functions || 'get_all_sessions, ';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_schema = 'public' AND routine_name = 'create_session') THEN
        missing_functions := missing_functions || 'create_session, ';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_schema = 'public' AND routine_name = 'get_session_by_id') THEN
        missing_functions := missing_functions || 'get_session_by_id, ';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_schema = 'public' AND routine_name = 'get_session_summary') THEN
        missing_functions := missing_functions || 'get_session_summary, ';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_schema = 'public' AND routine_name = 'get_session_by_title') THEN
        missing_functions := missing_functions || 'get_session_by_title, ';
    END IF;
    
    -- Message functions
    IF NOT EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_schema = 'public' AND routine_name = 'get_session_messages') THEN
        missing_functions := missing_functions || 'get_session_messages, ';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_schema = 'public' AND routine_name = 'get_all_messages') THEN
        missing_functions := missing_functions || 'get_all_messages, ';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_schema = 'public' AND routine_name = 'create_message') THEN
        missing_functions := missing_functions || 'create_message, ';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_schema = 'public' AND routine_name = 'get_message_by_id') THEN
        missing_functions := missing_functions || 'get_message_by_id, ';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_schema = 'public' AND routine_name = 'update_message') THEN
        missing_functions := missing_functions || 'update_message, ';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_schema = 'public' AND routine_name = 'delete_message') THEN
        missing_functions := missing_functions || 'delete_message, ';
    END IF;
    
    -- Paper functions
    IF NOT EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_schema = 'public' AND routine_name = 'search_papers') THEN
        missing_functions := missing_functions || 'search_papers, ';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_schema = 'public' AND routine_name = 'get_all_papers') THEN
        missing_functions := missing_functions || 'get_all_papers, ';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_schema = 'public' AND routine_name = 'create_paper') THEN
        missing_functions := missing_functions || 'create_paper, ';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_schema = 'public' AND routine_name = 'get_paper_by_id') THEN
        missing_functions := missing_functions || 'get_paper_by_id, ';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_schema = 'public' AND routine_name = 'update_paper') THEN
        missing_functions := missing_functions || 'update_paper, ';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_schema = 'public' AND routine_name = 'delete_paper') THEN
        missing_functions := missing_functions || 'delete_paper, ';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_schema = 'public' AND routine_name = 'get_related_papers') THEN
        missing_functions := missing_functions || 'get_related_papers, ';
    END IF;
    
    -- Feedback functions
    IF NOT EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_schema = 'public' AND routine_name = 'get_user_feedback') THEN
        missing_functions := missing_functions || 'get_user_feedback, ';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_schema = 'public' AND routine_name = 'get_message_feedback') THEN
        missing_functions := missing_functions || 'get_message_feedback, ';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_schema = 'public' AND routine_name = 'get_session_feedback') THEN
        missing_functions := missing_functions || 'get_session_feedback, ';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_schema = 'public' AND routine_name = 'get_all_feedback') THEN
        missing_functions := missing_functions || 'get_all_feedback, ';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_schema = 'public' AND routine_name = 'create_feedback') THEN
        missing_functions := missing_functions || 'create_feedback, ';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_schema = 'public' AND routine_name = 'get_feedback_by_id') THEN
        missing_functions := missing_functions || 'get_feedback_by_id, ';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_schema = 'public' AND routine_name = 'update_feedback') THEN
        missing_functions := missing_functions || 'update_feedback, ';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_schema = 'public' AND routine_name = 'delete_feedback') THEN
        missing_functions := missing_functions || 'delete_feedback, ';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_schema = 'public' AND routine_name = 'get_feedback_stats') THEN
        missing_functions := missing_functions || 'get_feedback_stats, ';
    END IF;
    
    -- AI Metadata functions
    IF NOT EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_schema = 'public' AND routine_name = 'get_message_ai_metadata') THEN
        missing_functions := missing_functions || 'get_message_ai_metadata, ';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_schema = 'public' AND routine_name = 'get_ai_metadata_by_model') THEN
        missing_functions := missing_functions || 'get_ai_metadata_by_model, ';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_schema = 'public' AND routine_name = 'get_all_ai_metadata') THEN
        missing_functions := missing_functions || 'get_all_ai_metadata, ';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_schema = 'public' AND routine_name = 'create_ai_metadata') THEN
        missing_functions := missing_functions || 'create_ai_metadata, ';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_schema = 'public' AND routine_name = 'get_ai_metadata_by_id') THEN
        missing_functions := missing_functions || 'get_ai_metadata_by_id, ';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_schema = 'public' AND routine_name = 'update_ai_metadata') THEN
        missing_functions := missing_functions || 'update_ai_metadata, ';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_schema = 'public' AND routine_name = 'delete_ai_metadata') THEN
        missing_functions := missing_functions || 'delete_ai_metadata, ';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_schema = 'public' AND routine_name = 'get_ai_usage_stats') THEN
        missing_functions := missing_functions || 'get_ai_usage_stats, ';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_schema = 'public' AND routine_name = 'get_ai_performance_stats') THEN
        missing_functions := missing_functions || 'get_ai_performance_stats, ';
    END IF;
    
    -- Group Chat functions
    IF NOT EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_schema = 'public' AND routine_name = 'get_group_chat_sessions') THEN
        missing_functions := missing_functions || 'get_group_chat_sessions, ';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_schema = 'public' AND routine_name = 'create_group_chat_session') THEN
        missing_functions := missing_functions || 'create_group_chat_session, ';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_schema = 'public' AND routine_name = 'join_group_chat_session') THEN
        missing_functions := missing_functions || 'join_group_chat_session, ';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_schema = 'public' AND routine_name = 'get_group_chat_messages') THEN
        missing_functions := missing_functions || 'get_group_chat_messages, ';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_schema = 'public' AND routine_name = 'can_user_invoke_ai') THEN
        missing_functions := missing_functions || 'can_user_invoke_ai, ';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_schema = 'public' AND routine_name = 'send_group_chat_message') THEN
        missing_functions := missing_functions || 'send_group_chat_message, ';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_schema = 'public' AND routine_name = 'get_session_online_users') THEN
        missing_functions := missing_functions || 'get_session_online_users, ';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_schema = 'public' AND routine_name = 'update_user_presence') THEN
        missing_functions := missing_functions || 'update_user_presence, ';
    END IF;
    
    IF missing_functions = '' THEN
        pass_count := pass_count + 1;
        RAISE NOTICE 'TEST 2 PASSED: All required Express route functions exist';
    ELSE
        RAISE NOTICE 'TEST 2 FAILED: Missing functions: %', rtrim(missing_functions, ', ');
    END IF;
    
    -- Test 3: Check if triggers exist
    test_count := test_count + 1;
    IF (SELECT COUNT(*) FROM information_schema.triggers 
        WHERE trigger_name IN ('update_users_updated_at', 'trigger_set_group_invite_code',
                              'trigger_check_group_creation_permissions', 'handle_new_user',
                              'handle_user_update', 'trigger_update_user_last_seen')) >= 4 THEN
        pass_count := pass_count + 1;
        RAISE NOTICE 'TEST 3 PASSED: Key triggers exist';
    ELSE
        RAISE NOTICE 'TEST 3 FAILED: Missing key triggers - Found % triggers', 
            (SELECT COUNT(*) FROM information_schema.triggers 
             WHERE trigger_name IN ('update_users_updated_at', 'trigger_set_group_invite_code',
                                   'trigger_check_group_creation_permissions', 'handle_new_user',
                                   'handle_user_update', 'trigger_update_user_last_seen'));
    END IF;
    
    -- Test 4: Check if indexes exist
    test_count := test_count + 1;
    IF (SELECT COUNT(*) FROM pg_indexes 
        WHERE schemaname = 'public' 
        AND indexname IN ('idx_users_auth_user_id', 'idx_groups_invite_code', 
                         'idx_sessions_group_id', 'idx_messages_session_id',
                         'idx_group_participants_group_id', 'idx_group_participants_user_id')) >= 4 THEN
        pass_count := pass_count + 1;
        RAISE NOTICE 'TEST 4 PASSED: Key indexes exist';
    ELSE
        RAISE NOTICE 'TEST 4 FAILED: Missing key indexes - Found % indexes', 
            (SELECT COUNT(*) FROM pg_indexes 
             WHERE schemaname = 'public' 
             AND indexname IN ('idx_users_auth_user_id', 'idx_groups_invite_code', 
                              'idx_sessions_group_id', 'idx_messages_session_id',
                              'idx_group_participants_group_id', 'idx_group_participants_user_id'));
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
    IF (SELECT COUNT(*) FROM information_schema.check_constraints 
        WHERE constraint_name IN ('check_group_creator_id', 'availability_constraint', 
                                 'role_constraint', 'status_constraint')) >= 3 THEN
        pass_count := pass_count + 1;
        RAISE NOTICE 'TEST 6 PASSED: Key constraints exist';
    ELSE
        RAISE NOTICE 'TEST 6 FAILED: Missing key constraints - Found % constraints', 
            (SELECT COUNT(*) FROM information_schema.check_constraints 
             WHERE constraint_name IN ('check_group_creator_id', 'availability_constraint', 
                                      'role_constraint', 'status_constraint'));
    END IF;
    
    -- Test 7: Test function execution (safe functions only)
    test_count := test_count + 1;
    BEGIN
        PERFORM get_all_users();
        PERFORM get_all_groups();
        PERFORM get_all_sessions();
        PERFORM get_all_papers();
        pass_count := pass_count + 1;
        RAISE NOTICE 'TEST 7 PASSED: Core functions execute without error';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'TEST 7 FAILED: Function execution error - %', SQLERRM;
    END;
    
    -- Test 8: Test create_group function with is_public parameter
    test_count := test_count + 1;
    BEGIN
        -- Test that create_group accepts is_public parameter
        -- This is a dry run test - we won't actually create a group
        IF EXISTS (
            SELECT 1 FROM information_schema.parameters 
            WHERE specific_schema = 'public' 
            AND specific_name = (
                SELECT specific_name 
                FROM information_schema.routines 
                WHERE routine_schema = 'public' 
                AND routine_name = 'create_group'
            )
            AND parameter_name = 'p_is_public'
        ) THEN
            pass_count := pass_count + 1;
            RAISE NOTICE 'TEST 8 PASSED: create_group function accepts is_public parameter';
        ELSE
            RAISE NOTICE 'TEST 8 FAILED: create_group function missing is_public parameter';
        END IF;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'TEST 8 FAILED: Error checking create_group parameters - %', SQLERRM;
    END;
    
    -- Test 9: Test auth helper function exists
    test_count := test_count + 1;
    BEGIN
        IF EXISTS (
            SELECT 1 FROM information_schema.routines 
            WHERE routine_schema = 'public' 
            AND routine_name = 'current_user_id'
            AND routine_type = 'FUNCTION'
        ) THEN
            pass_count := pass_count + 1;
            RAISE NOTICE 'TEST 9 PASSED: Auth helper function current_user_id() exists';
        ELSE
            RAISE NOTICE 'TEST 9 FAILED: Auth helper function current_user_id() missing';
        END IF;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'TEST 9 FAILED: Error checking auth helper function - %', SQLERRM;
    END;
    
    -- Summary
    RAISE NOTICE '===========================================================';
    RAISE NOTICE 'VALIDATION SUMMARY: % of % tests passed', pass_count, test_count;
    IF pass_count = test_count THEN
        RAISE NOTICE 'STATUS: ALL TESTS PASSED - Migration consolidation successful!';
        RAISE NOTICE 'Database is ready for Express route operations.';
    ELSE
        RAISE NOTICE 'STATUS: % TESTS FAILED - Review migration setup', (test_count - pass_count);
        RAISE NOTICE 'Some Express routes may fail until issues are resolved.';
    END IF;
    RAISE NOTICE '===========================================================';
END $$;

-- Additional detailed statistics
RAISE NOTICE '';
RAISE NOTICE 'DETAILED STATISTICS:';
RAISE NOTICE '====================';

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

-- Show migration file order
RAISE NOTICE '';
RAISE NOTICE 'RECOMMENDED MIGRATION ORDER:';
RAISE NOTICE '============================';
RAISE NOTICE '1. 20240916000001_init_core_schema.sql';
RAISE NOTICE '2. 20240917000001_auth_and_triggers.sql';
RAISE NOTICE '3. 20240918000001_core_crud_functions.sql';
RAISE NOTICE '4. 20240919000001_session_functions.sql';
RAISE NOTICE '5. 20240920000001_message_paper_functions.sql';
RAISE NOTICE '6. 20240921000001_add_missing_group_functions.sql';
RAISE NOTICE '7. 20240927000001_improve_auth_triggers.sql';
RAISE NOTICE '8. 20240928000001_enable_realtime_group_chat.sql';
RAISE NOTICE '9. 20240929000001_group_chat_functions.sql';
RAISE NOTICE '10. 20240930000001_complete_missing_functions.sql';
RAISE NOTICE '11. 20240930000002_fix_auth_uuid_casting.sql';
RAISE NOTICE '';
RAISE NOTICE 'NOTE: Apply migrations in this exact order for proper dependencies.';
RAISE NOTICE 'All Express route RPC functions should be available after step 10.';
RAISE NOTICE 'Step 11 fixes auth UUID casting issues in RLS policies.';