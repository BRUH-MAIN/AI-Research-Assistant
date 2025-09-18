# Endpoint Migration Mapping

## FastAPI Endpoints → Express.js Endpoints + SQL Functions

### User Module

| FastAPI Endpoint | Method | Express Endpoint | SQL Function | Parameters | Response Schema |
|------------------|--------|------------------|--------------|------------|-----------------|
| `/api/v1/users/` | GET | `/api/users` | `get_all_users()` | none | `Array<{id, name, email, is_active}>` |
| `/api/v1/users/` | POST | `/api/users` | `create_user(email, first_name, last_name)` | `{email, name, first_name?, last_name?}` | `{id, name, email, is_active}` |
| `/api/v1/users/{user_id}` | GET | `/api/users/:id` | `get_user_by_id(user_id)` | `user_id: number` | `{id, name, email, is_active}` |
| `/api/v1/users/{user_id}` | PUT | `/api/users/:id` | `update_user(user_id, user_data)` | `user_id: number, {email?, name?, first_name?, last_name?, is_active?}` | `{id, name, email, is_active}` |
| `/api/v1/users/{user_id}` | DELETE | `/api/users/:id` | `delete_user(user_id)` | `user_id: number` | `204 No Content` |
| `/api/v1/users/{user_id}/activate` | PATCH | `/api/users/:id/activate` | `activate_user(user_id)` | `user_id: number` | `{message: string}` |
| `/api/v1/users/{user_id}/deactivate` | PATCH | `/api/users/:id/deactivate` | `deactivate_user(user_id)` | `user_id: number` | `{message: string}` |

### Group Module

| FastAPI Endpoint | Method | Express Endpoint | SQL Function | Parameters | Response Schema |
|------------------|--------|------------------|--------------|------------|-----------------|
| `/api/v1/groups/` | GET | `/api/groups` | `get_all_groups()` | none | `Array<{id, name, description, member_count}>` |
| `/api/v1/groups/` | POST | `/api/groups` | `create_group(name, created_by, description)` | `{name, created_by?, description?}` | `{id, name, description, member_count}` |
| `/api/v1/groups/{group_id}` | GET | `/api/groups/:id` | `get_group_by_id(group_id)` | `group_id: number` | `{id, name, description, member_count}` |
| `/api/v1/groups/{group_id}/members` | GET | `/api/groups/:id/members` | `get_group_members(group_id)` | `group_id: number` | `{group_id, member_ids: number[], member_count}` |
| `/api/v1/groups/{group_id}/members/{user_id}` | POST | `/api/groups/:id/members/:userId` | `add_group_member(group_id, user_id, role)` | `group_id: number, user_id: number, {role?}` | `{message: string}` |
| `/api/v1/groups/{group_id}/members/{user_id}` | DELETE | `/api/groups/:id/members/:userId` | `remove_group_member(group_id, user_id)` | `group_id: number, user_id: number` | `204 No Content` |
| `/api/v1/groups/{group_id}/members/count` | GET | `/api/groups/:id/members/count` | `get_group_member_count(group_id)` | `group_id: number` | `{group_id, member_count}` |
| `/api/v1/groups/{group_id}/join` | POST | `/api/groups/:id/join` | `join_group(group_id, user_id)` | `group_id: number, user_id: number` | `{message: string}` |
| `/api/v1/groups/{group_id}/leave` | DELETE | `/api/groups/:id/leave` | `leave_group(group_id, user_id)` | `group_id: number, user_id: number` | `204 No Content` |
| `/api/v1/groups/{group_id}/invite` | POST | `/api/groups/:id/invite` | `invite_to_group(group_id, user_id, role)` | `group_id: number, {user_id, role?}` | `{message: string}` |
| `/api/v1/groups/getid` | GET | `/api/groups/getid` | `get_group_by_name(name)` | `name: string (query param)` | `{id, name}` |

### Session Module

| FastAPI Endpoint | Method | Express Endpoint | SQL Function | Parameters | Response Schema |
|------------------|--------|------------------|--------------|------------|-----------------|
| `/api/v1/sessions/` | GET | `/api/sessions` | `get_all_sessions(user_id, is_active)` | `user_id?: number, is_active?: boolean (query params)` | `Array<{id, title, user_id, created_at, updated_at, is_active, message_count}>` |
| `/api/v1/sessions/` | POST | `/api/sessions` | `create_session(title, user_id, group_id)` | `{title?, user_id, group_id?}` | `{id, title, user_id, created_at, updated_at, is_active, message_count}` |
| `/api/v1/sessions/{session_id}` | GET | `/api/sessions/:id` | `get_session_by_id(session_id)` | `session_id: number` | `{id, title, user_id, created_at, updated_at, is_active, message_count}` |
| `/api/v1/sessions/{session_id}/summary` | GET | `/api/sessions/:id/summary` | `get_session_summary(session_id)` | `session_id: number` | `{session_id, title, message_count, duration, is_active}` |
| `/api/v1/sessions/{session_id}/chat` | GET | `/api/sessions/:id/chat` | `get_session_by_id(session_id)` | `session_id: number` | `{message: string, session: object}` |
| `/api/v1/sessions/getid` | GET | `/api/sessions/getid` | `get_session_by_title(title)` | `title: string (query param)` | `{id, title}` |

### Message Module

| FastAPI Endpoint | Method | Express Endpoint | SQL Function | Parameters | Response Schema |
|------------------|--------|------------------|--------------|------------|-----------------|
| `/api/v1/messages/` | GET | `/api/messages` | `get_messages(session_id, user_id, message_type, limit_count, offset_count)` | `session_id?: number, user_id?: number, message_type?: string, limit?: number, offset?: number (query params)` | `Array<{id, session_id, user_id, content, message_type, created_at, updated_at, is_edited}>` |
| `/api/v1/messages/` | POST | `/api/messages` | `create_message(session_id, user_id, content, message_type)` | `{session_id, user_id, content, message_type?}` | `{id, session_id, user_id, content, message_type, created_at, updated_at, is_edited}` |
| `/api/v1/messages/{message_id}` | GET | `/api/messages/:id` | `get_message_by_id(message_id)` | `message_id: number` | `{id, session_id, user_id, content, message_type, created_at, updated_at, is_edited}` |
| `/api/v1/messages/sessions/{session_id}/messages` | GET | `/api/messages/sessions/:sessionId/messages` | `get_session_messages(session_id, limit_count, offset_count)` | `session_id: number, limit?: number, offset?: number (query params)` | `Array<{id, session_id, user_id, content, message_type, created_at, updated_at, is_edited}>` |
| `/api/v1/messages/sessions/{session_id}/messages` | POST | `/api/messages/sessions/:sessionId/messages` | `create_session_message(session_id, user_id, content, message_type)` | `session_id: number, {user_id, content, message_type?}` | `{id, session_id, user_id, content, message_type, created_at, updated_at, is_edited}` |
| `/api/v1/messages/sessions/{session_id}/messages/count` | GET | `/api/messages/sessions/:sessionId/messages/count` | `get_session_message_count(session_id)` | `session_id: number` | `{session_id, message_count}` |
| `/api/v1/messages/sessions/{session_id}/messages/latest` | GET | `/api/messages/sessions/:sessionId/messages/latest` | `get_latest_session_messages(session_id, limit_count)` | `session_id: number, limit?: number (query param)` | `Array<{id, session_id, user_id, content, message_type, created_at, updated_at, is_edited}>` |
| `/api/v1/messages/users/{user_id}/messages` | GET | `/api/messages/users/:userId/messages` | `get_user_messages(user_id, limit_count, offset_count)` | `user_id: number, limit?: number, offset?: number (query params)` | `Array<{id, session_id, user_id, content, message_type, created_at, updated_at, is_edited}>` |
| `/api/v1/messages/users/{user_id}/messages/count` | GET | `/api/messages/users/:userId/messages/count` | `get_user_message_count(user_id)` | `user_id: number` | `{user_id, message_count}` |
| `/api/v1/messages/search` | GET | `/api/messages/search` | `search_messages(query_text, session_id, user_id, limit_count)` | `query: string, session_id?: number, user_id?: number, limit?: number (query params)` | `{query, results: Array<Message>, total_results}` |

### Paper Module

| FastAPI Endpoint | Method | Express Endpoint | SQL Function | Parameters | Response Schema |
|------------------|--------|------------------|--------------|------------|-----------------|
| `/api/v1/papers/` | GET | `/api/papers` | `get_all_papers()` | none | `Array<{id, title, abstract, authors, doi, published_at, source_url}>` |
| `/api/v1/papers/` | POST | `/api/papers` | `create_paper(title, abstract, authors, doi, published_at, source_url)` | `{title, abstract?, authors?, doi?, published_at?, source_url?}` | `{id, title, abstract, authors, doi, published_at, source_url}` |
| `/api/v1/papers/{paper_id}` | GET | `/api/papers/:id` | `get_paper_by_id(paper_id)` | `paper_id: number` | `{id, title, abstract, authors, doi, published_at, source_url}` |
| `/api/v1/papers/{paper_id}` | PUT | `/api/papers/:id` | `update_paper(paper_id, paper_data)` | `paper_id: number, {title?, abstract?, authors?, doi?, published_at?, source_url?}` | `{id, title, abstract, authors, doi, published_at, source_url}` |
| `/api/v1/papers/{paper_id}` | DELETE | `/api/papers/:id` | `delete_paper(paper_id)` | `paper_id: number` | `204 No Content` |
| `/api/v1/papers/search` | GET | `/api/papers/search` | `search_papers(query_text, limit_count)` | `query: string, limit?: number (query params)` | `Array<{id, title, abstract, authors, doi, published_at, source_url}>` |
| `/api/v1/papers/{paper_id}/tags` | GET | `/api/papers/:id/tags` | `get_paper_tags(paper_id)` | `paper_id: number` | `Array<string>` |
| `/api/v1/papers/{paper_id}/tags` | POST | `/api/papers/:id/tags` | `add_paper_tags(paper_id, tags)` | `paper_id: number, {tags: string[]}` | `{message: string}` |
| `/api/v1/papers/{paper_id}/tags/{tag}` | DELETE | `/api/papers/:id/tags/:tag` | `remove_paper_tag(paper_id, tag)` | `paper_id: number, tag: string` | `{message: string}` |
| `/api/v1/papers/sessions/{session_id}` | GET | `/api/papers/sessions/:sessionId` | `get_session_papers(session_id)` | `session_id: number` | `Array<{id, title, abstract, authors, doi, published_at, source_url, added_at}>` |
| `/api/v1/papers/sessions/{session_id}/{paper_id}` | POST | `/api/papers/sessions/:sessionId/:paperId` | `add_paper_to_session(session_id, paper_id)` | `session_id: number, paper_id: number` | `{message: string}` |
| `/api/v1/papers/sessions/{session_id}/{paper_id}` | DELETE | `/api/papers/sessions/:sessionId/:paperId` | `remove_paper_from_session(session_id, paper_id)` | `session_id: number, paper_id: number` | `{message: string}` |
| `/api/v1/papers/workflow_search` | GET | `/api/papers/workflow_search` | `workflow_search_papers(query_text, limit_count, offset_count)` | `query: string, limit?: number, offset?: number (query params)` | `Array<{id, title, abstract, authors, doi, published_at, source_url}>` |
| `/api/v1/papers/arxiv_load_more` | GET | `/api/papers/arxiv_load_more` | External arXiv API + `create_paper()` | `query: string, offset?: number (query params)` | `Array<{id, title, abstract, authors, doi, published_at, source_url}>` |

### Feedback Module

| FastAPI Endpoint | Method | Express Endpoint | SQL Function | Parameters | Response Schema |
|------------------|--------|------------------|--------------|------------|-----------------|
| `/api/v1/sessions/{session_id}/feedback` | GET | `/api/sessions/:sessionId/feedback` | `get_session_feedback(session_id)` | `session_id: number` | `Array<{id?, session_id, given_by, content, created_at}>` |
| `/api/v1/sessions/{session_id}/feedback` | POST | `/api/sessions/:sessionId/feedback` | `create_feedback(session_id, given_by, content)` | `session_id: number, {given_by, content?}` | `{session_id, given_by, content, created_at}` |
| `/api/v1/feedback/{feedback_id}` | GET | `/api/feedback/:id` | `get_feedback_by_id(feedback_id)` | `feedback_id: number` | `{id?, session_id, given_by, content, created_at}` |
| `/api/v1/feedback/{feedback_id}` | PUT | `/api/feedback/:id` | `update_feedback(feedback_id, content)` | `feedback_id: number, {content}` | `{id?, session_id, given_by, content, created_at}` |
| `/api/v1/feedback/{feedback_id}` | DELETE | `/api/feedback/:id` | `delete_feedback(feedback_id)` | `feedback_id: number` | `204 No Content` |
| `/api/v1/users/{user_id}/feedback` | GET | `/api/users/:userId/feedback` | `get_user_feedback(user_id)` | `user_id: number` | `Array<{id?, session_id, given_by, content, created_at}>` |

### AI Metadata Module

| FastAPI Endpoint | Method | Express Endpoint | SQL Function | Parameters | Response Schema |
|------------------|--------|------------------|--------------|------------|-----------------|
| `/api/v1/messages/{message_id}/ai-metadata` | GET | `/api/messages/:messageId/ai-metadata` | `get_message_ai_metadata(message_id)` | `message_id: number` | `Array<{page_no, message_id, paper_id, created_at}>` |
| `/api/v1/messages/{message_id}/ai-metadata` | POST | `/api/messages/:messageId/ai-metadata` | `create_ai_metadata(message_id, paper_id, page_no)` | `message_id: number, {paper_id, page_no?}` | `{page_no, message_id, paper_id, created_at}` |
| `/api/v1/papers/{paper_id}/ai-metadata` | GET | `/api/papers/:paperId/ai-metadata` | `get_paper_ai_metadata(paper_id)` | `paper_id: number` | `Array<{page_no, message_id, paper_id, created_at}>` |
| `/api/v1/ai-metadata/{metadata_id}` | GET | `/api/ai-metadata/:id` | `get_ai_metadata_by_id(metadata_id)` | `metadata_id: number` | `{page_no, message_id, paper_id, created_at}` |
| `/api/v1/ai-metadata/{metadata_id}` | PUT | `/api/ai-metadata/:id` | `update_ai_metadata(metadata_id, page_no, paper_id)` | `metadata_id: number, {page_no?, paper_id?}` | `{page_no, message_id, paper_id, created_at}` |
| `/api/v1/ai-metadata/{metadata_id}` | DELETE | `/api/ai-metadata/:id` | `delete_ai_metadata(metadata_id)` | `metadata_id: number` | `204 No Content` |
| `/api/v1/sessions/{session_id}/ai-metadata` | GET | `/api/sessions/:sessionId/ai-metadata` | `get_session_ai_metadata(session_id)` | `session_id: number` | `Array<{page_no, message_id, paper_id, created_at}>` |

## Notes

### URL Structure Changes
- FastAPI uses `/api/v1/` prefix, Express.js will use `/api/` prefix
- Parameter names remain consistent where possible
- Query parameters maintain the same names and types

### Response Format Changes
- All endpoints will return consistent JSON responses
- Error responses will follow a standard format: `{error: string, code: number, details?: any}`
- Success responses will maintain the same data structures

### Authentication Context
- All Express endpoints will receive user context via JWT middleware
- User authentication will be extracted from Supabase JWT tokens
- RLS policies will enforce data access based on authenticated user

### Special Considerations
1. **arXiv Integration**: The `/papers/arxiv_load_more` endpoint involves external API calls and should be handled with proper rate limiting
2. **Search Operations**: Text search operations should use PostgreSQL full-text search capabilities
3. **Pagination**: Consistent pagination using `limit` and `offset` parameters
4. **Filtering**: GET endpoints support various filter parameters as query strings