# FastAPI to Express.js + Supabase SQL Migration Plan

## 1. Step-by-Step Migration Checklist

### Phase 1: Environment Setup (Day 1-2)
1. **Install Supabase CLI and setup development environment**
   - Install Supabase CLI: `npm install -g @supabase/cli`
   - Initialize Supabase project: `supabase init`
   - Start local Supabase: `supabase start`

2. **Setup Express.js project structure**
   - Create new Express.js project directory: `express-db-server/`
   - Initialize Node.js project: `npm init -y`
   - Install dependencies: `npm install express @supabase/supabase-js cors helmet dotenv express-rate-limit`
   - Install dev dependencies: `npm install -D nodemon typescript @types/node @types/express`

3. **Environment configuration**
   - Create `.env` files for development, staging, and production
   - Setup Supabase environment variables
   - Configure database connection strings

### Phase 2: Database Function Creation (Day 3-5)
4. **Migrate database schema to Supabase**
   - Apply existing `schema.sql` to Supabase project
   - Run schema migrations: `supabase db push`

5. **Create PostgreSQL functions for User operations**
   - `get_all_users()` function
   - `get_user_by_id(user_id)` function
   - `create_user(email, first_name, last_name)` function
   - `update_user(user_id, user_data)` function
   - `delete_user(user_id)` function
   - `activate_user(user_id)` and `deactivate_user(user_id)` functions

6. **Create PostgreSQL functions for Group operations**
   - `get_all_groups()` function
   - `get_group_by_id(group_id)` function
   - `create_group(name, created_by, description)` function
   - `get_group_members(group_id)` function
   - `add_group_member(group_id, user_id, role)` function
   - `remove_group_member(group_id, user_id)` function
   - `get_group_by_name(name)` function

7. **Create PostgreSQL functions for Session operations**
   - `get_all_sessions(user_id, is_active)` function
   - `get_session_by_id(session_id)` function
   - `create_session(title, user_id, group_id)` function
   - `get_session_summary(session_id)` function
   - `get_session_by_title(title)` function

8. **Create PostgreSQL functions for Message operations**
   - `get_messages(session_id, user_id, message_type, limit_count, offset_count)` function
   - `create_message(session_id, user_id, content, message_type)` function
   - `get_session_messages(session_id, limit_count, offset_count)` function
   - `search_messages(query_text, session_id, user_id, limit_count)` function

9. **Create PostgreSQL functions for Paper operations**
   - `get_all_papers()` function
   - `create_paper(title, abstract, authors, doi, published_at, source_url)` function
   - `get_paper_by_id(paper_id)` function
   - `update_paper(paper_id, paper_data)` function
   - `delete_paper(paper_id)` function
   - `search_papers(query_text, limit_count)` function
   - `get_session_papers(session_id)` function
   - `add_paper_to_session(session_id, paper_id)` function

10. **Create PostgreSQL functions for Feedback operations**
    - `get_session_feedback(session_id)` function
    - `create_feedback(session_id, given_by, content)` function
    - `get_user_feedback(user_id)` function

11. **Create PostgreSQL functions for AI Metadata operations**
    - `get_message_ai_metadata(message_id)` function
    - `create_ai_metadata(message_id, paper_id, page_no)` function
    - `get_paper_ai_metadata(paper_id)` function

### Phase 3: Express.js Server Development (Day 6-8)
12. **Create Express.js server structure**
    - Setup main server file (`app.js`)
    - Create route modules for each entity
    - Setup middleware (CORS, security headers, rate limiting)

13. **Implement User routes in Express.js**
    - GET `/api/users` - get all users
    - POST `/api/users` - create user
    - GET `/api/users/:id` - get user by ID
    - PUT `/api/users/:id` - update user
    - DELETE `/api/users/:id` - delete user
    - PATCH `/api/users/:id/activate` - activate user
    - PATCH `/api/users/:id/deactivate` - deactivate user

14. **Implement Group routes in Express.js**
    - GET `/api/groups` - get all groups
    - POST `/api/groups` - create group
    - GET `/api/groups/:id` - get group by ID
    - GET `/api/groups/:id/members` - get group members
    - POST `/api/groups/:id/members/:userId` - add member
    - DELETE `/api/groups/:id/members/:userId` - remove member
    - GET `/api/groups/getid?name=:name` - get group by name

15. **Implement Session routes in Express.js**
    - GET `/api/sessions` - get sessions with filters
    - POST `/api/sessions` - create session
    - GET `/api/sessions/:id` - get session by ID
    - GET `/api/sessions/:id/summary` - get session summary
    - GET `/api/sessions/getid?title=:title` - get session by title

16. **Implement Message routes in Express.js**
    - GET `/api/messages` - get messages with filters
    - POST `/api/messages` - create message
    - GET `/api/messages/sessions/:sessionId/messages` - get session messages
    - GET `/api/messages/search` - search messages

17. **Implement Paper routes in Express.js**
    - GET `/api/papers` - get all papers
    - POST `/api/papers` - create paper
    - GET `/api/papers/:id` - get paper by ID
    - PUT `/api/papers/:id` - update paper
    - DELETE `/api/papers/:id` - delete paper
    - GET `/api/papers/search` - search papers
    - GET `/api/papers/sessions/:sessionId` - get session papers
    - POST `/api/papers/sessions/:sessionId/:paperId` - add paper to session

18. **Implement Feedback and AI Metadata routes in Express.js**
    - Feedback routes: GET/POST for session feedback
    - AI Metadata routes: GET/POST for message and paper metadata

### Phase 4: Security Implementation (Day 9-10)
19. **Setup Supabase Authentication integration**
    - Configure JWT verification middleware
    - Setup Row Level Security (RLS) policies
    - Implement SECURITY DEFINER patterns for sensitive operations

20. **Environment and secrets management**
    - Configure service role and anon keys
    - Setup environment-specific configurations
    - Implement proper error handling and logging

### Phase 5: Testing and Deployment (Day 11-12)
21. **Create Docker configuration**
    - Update docker-compose.yml for separate Express and FastAPI services
    - Configure environment variables for containers
    - Setup port mapping (Express: 3001, FastAPI: 8000)

22. **Update FastAPI to remove database endpoints**
    - Remove all database-related routes from FastAPI
    - Keep only AI/ML related endpoints
    - Update API router configuration

23. **Update React frontend API calls**
    - Change base URL for database operations to Express server
    - Update API service layer to handle new endpoints
    - Test all frontend functionality

24. **Testing and validation**
    - Test all database operations through Express endpoints
    - Verify FastAPI AI endpoints still work
    - Run integration tests
    - Performance testing

### Phase 6: Production Deployment (Day 13-14)
25. **Staging deployment**
    - Deploy to staging environment
    - Run full test suite
    - Monitor logs and performance

26. **Production migration**
    - Deploy to production with zero downtime
    - Monitor system health
    - Rollback plan if needed

27. **Cleanup and documentation**
    - Remove deprecated FastAPI database code
    - Update API documentation
    - Update deployment documentation

## Priority Order
- **Critical Path**: Steps 1-11, 13-18 (Database functions and Express routes)
- **High Priority**: Steps 19-24 (Security, Docker, Testing)
- **Medium Priority**: Steps 25-27 (Deployment and cleanup)

## Success Criteria
Each step should result in:
- [ ] Atomic, testable functionality
- [ ] No breaking changes to existing functionality
- [ ] Proper error handling and logging
- [ ] Security compliance
- [ ] Documentation updates

## Rollback Plan
- Maintain FastAPI database endpoints until Express.js is fully tested
- Use feature flags to switch between FastAPI and Express backends
- Database backup before each major migration step