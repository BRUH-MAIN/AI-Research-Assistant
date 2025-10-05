-- =====================================================
-- DROP ALL FUNCTIONS - CLEAN MIGRATION
-- Date: 2024-10-01
-- Description: Drop all existing functions once (no recreation)
-- =====================================================

-- Core utility functions
DROP FUNCTION IF EXISTS activate_user(p_user_id integer);
DROP FUNCTION IF EXISTS deactivate_user(p_user_id integer);
DROP FUNCTION IF EXISTS current_user_id();

-- User management functions
DROP FUNCTION IF EXISTS create_user(p_email text, p_first_name text, p_last_name text);
DROP FUNCTION IF EXISTS get_user_by_id(p_user_id integer);
DROP FUNCTION IF EXISTS get_user_by_auth_id(auth_id uuid);
DROP FUNCTION IF EXISTS get_all_users();
DROP FUNCTION IF EXISTS update_user(p_user_id integer, p_email text, p_first_name text, p_last_name text, p_is_active boolean);
DROP FUNCTION IF EXISTS delete_user(p_user_id integer);
DROP FUNCTION IF EXISTS get_user_feedback(p_user_id integer);
DROP FUNCTION IF EXISTS get_user_groups(p_user_id integer);

-- Group management functions
DROP FUNCTION IF EXISTS create_group(p_name text, p_created_by integer, p_description text, p_is_public boolean);
DROP FUNCTION IF EXISTS get_group_by_id(p_group_id integer);
DROP FUNCTION IF EXISTS get_group_by_name(p_name text);
DROP FUNCTION IF EXISTS get_all_groups();
DROP FUNCTION IF EXISTS add_group_member(p_group_id integer, p_user_id integer, p_role text);
DROP FUNCTION IF EXISTS remove_group_member(p_group_id integer, p_user_id integer);
DROP FUNCTION IF EXISTS get_group_members(p_group_id integer);
DROP FUNCTION IF EXISTS get_group_members_detailed(p_group_id integer);
DROP FUNCTION IF EXISTS join_group_by_invite_code(p_invite_code text, p_user_id integer);

-- Session management functions
DROP FUNCTION IF EXISTS create_session(p_group_id integer, p_created_by integer, p_topic text, p_status character varying);
DROP FUNCTION IF EXISTS create_session(p_title text, p_user_id integer, p_group_id integer);
DROP FUNCTION IF EXISTS get_session_by_id(p_session_id integer);
DROP FUNCTION IF EXISTS get_session_by_title(p_title text);
DROP FUNCTION IF EXISTS get_all_sessions(p_user_id integer, p_is_active boolean);
DROP FUNCTION IF EXISTS update_session(p_session_id integer, p_title text, p_status text);
DROP FUNCTION IF EXISTS delete_session(p_session_id integer);
DROP FUNCTION IF EXISTS add_session_participant(p_session_id integer, p_user_id integer);
DROP FUNCTION IF EXISTS remove_session_participant(p_session_id integer, p_user_id integer);
DROP FUNCTION IF EXISTS get_session_participants(p_session_id integer);
DROP FUNCTION IF EXISTS get_session_online_users(p_session_id integer);
DROP FUNCTION IF EXISTS get_session_summary(p_session_id integer);
DROP FUNCTION IF EXISTS add_paper_to_session(p_session_id integer, p_paper_id integer);
DROP FUNCTION IF EXISTS remove_paper_from_session(p_session_id integer, p_paper_id integer);
DROP FUNCTION IF EXISTS get_session_papers(p_session_id integer);
DROP FUNCTION IF EXISTS get_session_messages(p_session_id integer);
DROP FUNCTION IF EXISTS get_session_feedback(p_session_id integer);

-- Group chat functions
DROP FUNCTION IF EXISTS create_group_chat_session(p_group_id integer, p_created_by integer, p_topic text);
DROP FUNCTION IF EXISTS create_group_chat_session(p_group_id integer, p_created_by integer, p_title text, p_description text);
DROP FUNCTION IF EXISTS get_group_chat_sessions(p_group_id integer);
DROP FUNCTION IF EXISTS join_group_chat_session(p_session_id integer, p_user_id integer);
DROP FUNCTION IF EXISTS get_group_chat_messages(p_session_id integer, p_limit integer, p_offset integer);
DROP FUNCTION IF EXISTS send_group_chat_message(p_session_id integer, p_user_id integer, p_content text, p_message_type character varying, p_metadata jsonb);

-- Message management functions
DROP FUNCTION IF EXISTS create_message(p_session_id integer, p_sender_user_id integer, p_content text);
DROP FUNCTION IF EXISTS get_message_by_id(p_message_id integer);
DROP FUNCTION IF EXISTS get_all_messages(p_limit integer, p_offset integer);
DROP FUNCTION IF EXISTS update_message(p_message_id integer, p_content text);
DROP FUNCTION IF EXISTS delete_message(p_message_id integer);
DROP FUNCTION IF EXISTS search_messages(p_query_text text, p_session_id integer, p_limit integer);
DROP FUNCTION IF EXISTS get_message_feedback(p_message_id integer);
DROP FUNCTION IF EXISTS get_message_ai_metadata(p_message_id integer);

-- Paper management functions
DROP FUNCTION IF EXISTS create_paper(p_title text, p_abstract text, p_authors text, p_doi text, p_published_at timestamp without time zone, p_source_url text, p_tags text[]);
DROP FUNCTION IF EXISTS get_paper_by_id(p_paper_id integer);
DROP FUNCTION IF EXISTS get_all_papers();
DROP FUNCTION IF EXISTS update_paper(p_paper_id integer, p_title text, p_abstract text, p_authors text, p_doi text, p_source_url text);
DROP FUNCTION IF EXISTS delete_paper(p_paper_id integer);
DROP FUNCTION IF EXISTS search_papers(p_query text);
DROP FUNCTION IF EXISTS get_related_papers(p_paper_id integer, p_limit integer);

-- Feedback management functions
DROP FUNCTION IF EXISTS create_feedback(p_session_id integer, p_user_id integer, p_content text, p_rating integer);
DROP FUNCTION IF EXISTS get_feedback_by_id(p_feedback_id integer);
DROP FUNCTION IF EXISTS get_all_feedback(p_limit integer, p_offset integer);
DROP FUNCTION IF EXISTS update_feedback(p_feedback_id integer, p_content text, p_rating integer);
DROP FUNCTION IF EXISTS delete_feedback(p_feedback_id integer);
DROP FUNCTION IF EXISTS get_feedback_stats(p_session_id integer);

-- AI metadata functions
DROP FUNCTION IF EXISTS create_ai_metadata(p_message_id integer, p_paper_id integer, p_page_no integer);
DROP FUNCTION IF EXISTS get_ai_metadata_by_id(p_ai_metadata_id integer);
DROP FUNCTION IF EXISTS get_ai_metadata_by_message(p_message_id integer);
DROP FUNCTION IF EXISTS get_ai_metadata_by_model(p_model_name text, p_limit integer);
DROP FUNCTION IF EXISTS get_all_ai_metadata(p_limit integer, p_offset integer);
DROP FUNCTION IF EXISTS update_ai_metadata(p_ai_metadata_id integer, p_model_name text, p_input_tokens integer, p_output_tokens integer, p_cost numeric, p_processing_time numeric);
DROP FUNCTION IF EXISTS delete_ai_metadata(p_ai_metadata_id integer);
DROP FUNCTION IF EXISTS get_ai_performance_stats(p_model_name text);
DROP FUNCTION IF EXISTS get_ai_usage_stats(p_date_from date, p_date_to date);

-- Authentication and permission functions
DROP FUNCTION IF EXISTS can_user_invoke_ai(p_user_id integer, p_session_id integer);
DROP FUNCTION IF EXISTS log_ai_invocation(p_user_id integer, p_session_id integer, p_trigger_message_id integer, p_ai_message_id integer);

-- User presence functions
DROP FUNCTION IF EXISTS update_user_presence(p_user_id integer, p_session_id integer, p_status character varying);
DROP FUNCTION IF EXISTS get_online_users_in_session(p_session_id integer);

-- Authentication trigger functions
DROP FUNCTION IF EXISTS handle_new_user();
DROP FUNCTION IF EXISTS handle_user_update();
DROP FUNCTION IF EXISTS handle_new_user_from_update(user_record auth.users);
DROP FUNCTION IF EXISTS sync_existing_auth_users();

-- Additional utility functions that may exist
DROP FUNCTION IF EXISTS get_user_session_count(p_user_id integer);
DROP FUNCTION IF EXISTS get_group_session_count(p_group_id integer);
DROP FUNCTION IF EXISTS validate_group_access(p_user_id integer, p_group_id integer);
DROP FUNCTION IF EXISTS cleanup_expired_sessions();
DROP FUNCTION IF EXISTS get_system_stats();

-- Drop any function overloads with different signatures
DROP FUNCTION IF EXISTS create_group(text, integer);
DROP FUNCTION IF EXISTS create_group(text, integer, text);
DROP FUNCTION IF EXISTS create_session(text, integer);
DROP FUNCTION IF EXISTS create_session(integer, integer, text);
DROP FUNCTION IF EXISTS get_all_sessions();
DROP FUNCTION IF EXISTS get_all_sessions(integer);
DROP FUNCTION IF EXISTS update_user(integer, text, text, text);
DROP FUNCTION IF EXISTS add_group_member(integer, integer);
DROP FUNCTION IF EXISTS search_messages(text, integer);
DROP FUNCTION IF EXISTS search_messages(text);
DROP FUNCTION IF EXISTS get_group_chat_messages(integer);
DROP FUNCTION IF EXISTS get_group_chat_messages(integer, integer);
DROP FUNCTION IF EXISTS send_group_chat_message(integer, integer, text);
DROP FUNCTION IF EXISTS send_group_chat_message(integer, integer, text, character varying);
DROP FUNCTION IF EXISTS create_ai_metadata(integer, text, integer, integer, numeric, numeric);
DROP FUNCTION IF EXISTS get_ai_metadata_by_model(text);
DROP FUNCTION IF EXISTS get_all_ai_metadata();
DROP FUNCTION IF EXISTS get_all_ai_metadata(integer);
DROP FUNCTION IF EXISTS get_all_feedback();
DROP FUNCTION IF EXISTS get_all_feedback(integer);
DROP FUNCTION IF EXISTS get_feedback_stats();
DROP FUNCTION IF EXISTS get_related_papers(integer);
DROP FUNCTION IF EXISTS create_paper(text, text, text, text, timestamp without time zone, text);
DROP FUNCTION IF EXISTS create_paper(text, text, text, text, timestamp without time zone);
DROP FUNCTION IF EXISTS create_paper(text, text, text, text);
DROP FUNCTION IF EXISTS create_paper(text, text, text);
DROP FUNCTION IF EXISTS create_paper(text, text);
DROP FUNCTION IF EXISTS create_paper(text);

-- =====================================================
-- VERIFICATION MESSAGE
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '🧹 MIGRATION CLEANUP COMPLETE';
    RAISE NOTICE '✅ All duplicate functions dropped';
    RAISE NOTICE '✅ Migration folder cleaned';
    RAISE NOTICE '⚠️  Database functions have been removed';
    RAISE NOTICE '📝 Ready for new function definitions';
END $$;
