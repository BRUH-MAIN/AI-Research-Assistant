-- Function Coverage Analysis
-- This script analyzes which functions from sql-functions-copy-don't-edit are present in migrations

-- Expected functions from sql-functions-copy-don't-edit:

-- USER OPERATIONS (01_user_group_session_functions.sql):
-- ✓ get_all_users() - PRESENT
-- ✓ get_user_by_id(p_user_id INTEGER) - PRESENT  
-- ✓ create_user(...) - PRESENT
-- ✓ update_user(...) - PRESENT
-- ✓ delete_user(p_user_id INTEGER) - PRESENT
-- ✓ activate_user(p_user_id INTEGER) - PRESENT
-- ✓ deactivate_user(p_user_id INTEGER) - PRESENT

-- GROUP OPERATIONS (01_user_group_session_functions.sql + others):
-- ✓ get_all_groups() - PRESENT (DUPLICATE in 20240921000001)
-- ✓ get_group_by_id(p_group_id INTEGER) - PRESENT (DUPLICATE in 20240921000001)
-- ✓ create_group(...) - PRESENT with fix applied
-- ✓ get_group_members(p_group_id INTEGER) - PRESENT
-- ✓ add_group_member(...) - PRESENT (DUPLICATE in 20240921000001)
-- ✓ remove_group_member(...) - PRESENT (DUPLICATE in 20240921000001)
-- ✓ get_group_by_name(p_name TEXT) - PRESENT (DUPLICATE in 20240921000001)
-- ✓ join_group_by_invite_code(...) - PRESENT (DUPLICATE in 20240921000001)

-- Additional Group Functions (04_group_invite_functions.sql):
-- ✓ get_group_by_invite_code(p_invite_code VARCHAR(12)) - PRESENT in 20240921000001
-- ✓ get_user_groups(p_user_id INT) - PRESENT in 20240921000001
-- ✓ update_group_member_role(...) - PRESENT in 20240921000001
-- ✓ regenerate_invite_code(...) - PRESENT in 20240921000001

-- SESSION OPERATIONS (01_user_group_session_functions.sql):
-- ✓ get_all_sessions(...) - PRESENT
-- ✓ get_session_by_id(p_session_id INTEGER) - PRESENT
-- ✓ create_session(...) - PRESENT
-- ✓ get_session_summary(p_session_id INTEGER) - PRESENT
-- ✓ get_session_by_title(p_title TEXT) - PRESENT

-- MESSAGE OPERATIONS (02_message_paper_functions.sql):
-- ? get_messages(...) - CHECK: might be get_session_messages()
-- ✓ create_message(...) - PRESENT
-- ✓ get_message_by_id(p_message_id INTEGER) - PRESENT
-- ? search_messages(...) - MISSING

-- PAPER OPERATIONS (02_message_paper_functions.sql):
-- ✓ get_all_papers() - PRESENT
-- ✓ get_paper_by_id(p_paper_id INTEGER) - PRESENT
-- ✓ create_paper(...) - PRESENT
-- ? update_paper(...) - MISSING
-- ? delete_paper(p_paper_id INTEGER) - MISSING
-- ✓ search_papers(...) - PRESENT
-- ? get_paper_tags(p_paper_id INTEGER) - MISSING
-- ? add_paper_tags(...) - MISSING  
-- ? remove_paper_tag(...) - MISSING
-- ✓ get_session_papers(p_session_id INTEGER) - PRESENT
-- ✓ add_paper_to_session(...) - PRESENT
-- ? remove_paper_from_session(...) - MISSING

-- FEEDBACK OPERATIONS (03_feedback_ai_metadata_functions.sql):
-- ✓ get_session_feedback(p_session_id INTEGER) - PRESENT
-- ✓ create_feedback(...) - PRESENT
-- ? get_user_feedback(p_user_id INTEGER) - MISSING
-- ? get_feedback_by_id(p_feedback_id INTEGER) - MISSING
-- ? update_feedback(...) - MISSING
-- ? delete_feedback(p_feedback_id INTEGER) - MISSING

-- AI METADATA OPERATIONS (03_feedback_ai_metadata_functions.sql):
-- ? get_message_ai_metadata(p_message_id INTEGER) - CHECK: might be get_ai_metadata_by_message()
-- ✓ create_ai_metadata(...) - PRESENT

-- SUMMARY OF MISSING FUNCTIONS:
-- 1. search_messages(...)
-- 2. update_paper(...)
-- 3. delete_paper(p_paper_id INTEGER)
-- 4. get_paper_tags(p_paper_id INTEGER)
-- 5. add_paper_tags(...)
-- 6. remove_paper_tag(...)
-- 7. remove_paper_from_session(...)
-- 8. get_user_feedback(p_user_id INTEGER)
-- 9. get_feedback_by_id(p_feedback_id INTEGER)
-- 10. update_feedback(...)
-- 11. delete_feedback(p_feedback_id INTEGER)

-- DUPLICATES TO RESOLVE:
-- - Functions in both 20240918000001_core_crud_functions.sql and 20240921000001_add_missing_group_functions.sql
--   This duplication should be cleaned up by removing the duplicates from 20240921000001

-- NOTE: Some function names may have minor variations (e.g., get_messages vs get_session_messages)
-- These should be verified against the actual Express route calls to ensure compatibility.
