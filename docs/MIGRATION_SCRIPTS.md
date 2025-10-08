# Migration Scripts and Deployment Instructions

## Supabase CLI Setup and Migration Scripts

### 1. Initial Supabase Setup

```bash
# Install Supabase CLI
npm install -g @supabase/cli

# Login to Supabase
supabase login

# Initialize project (in your project root)
supabase init

# Start local development environment
supabase start
```

### 2. Database Schema Migration

#### Apply Base Schema (migration_001_initial_schema.sql)
```sql
-- Apply the existing schema.sql
-- This should be run first to establish the base structure

-- Connect to your Supabase database
-- Option 1: Via Supabase CLI
supabase db reset

-- Option 2: Via psql
psql "postgresql://postgres:your-password@db.your-project.supabase.co:5432/postgres"

-- Then run the schema.sql file
\i backend/app/db/schema.sql
```

#### Create and Apply Function Migrations

Create a new migration file:
```bash
supabase migration new create_database_functions
```

#### migration_002_database_functions.sql
```sql
-- Apply all database functions in order
\i sql-functions/01_user_group_session_functions.sql
\i sql-functions/02_message_paper_functions.sql
\i sql-functions/03_feedback_ai_metadata_functions.sql
```

### 3. Row Level Security (RLS) Setup

#### migration_003_rls_policies.sql
```sql
-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE papers ENABLE ROW LEVEL SECURITY;
ALTER TABLE paper_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_papers ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_metadata ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;

-- Create policies for users table
CREATE POLICY "Users can view all users" ON users
    FOR SELECT USING (true);

CREATE POLICY "Users can update their own profile" ON users
    FOR UPDATE USING (auth.uid()::text = user_id::text);

-- Create policies for groups table
CREATE POLICY "Anyone can view groups" ON groups
    FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create groups" ON groups
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Create policies for group_participants table
CREATE POLICY "Anyone can view group participants" ON group_participants
    FOR SELECT USING (true);

CREATE POLICY "Group members can add other members" ON group_participants
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM group_participants gp
            WHERE gp.group_id = group_participants.group_id
            AND gp.user_id = auth.uid()::int
            AND gp.role IN ('admin', 'mentor')
        )
    );

-- Create policies for sessions table
CREATE POLICY "Anyone can view sessions" ON sessions
    FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create sessions" ON sessions
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Session creators can update their sessions" ON sessions
    FOR UPDATE USING (created_by = auth.uid()::int);

-- Create policies for messages table
CREATE POLICY "Anyone can view messages" ON messages
    FOR SELECT USING (true);

CREATE POLICY "Group members can create messages" ON messages
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM group_participants gp
            JOIN sessions s ON gp.group_id = s.group_id
            WHERE s.session_id = messages.session_id
            AND gp.user_id = auth.uid()::int
        )
    );

-- Create policies for papers table
CREATE POLICY "Anyone can view papers" ON papers
    FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create papers" ON papers
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update papers" ON papers
    FOR UPDATE USING (auth.role() = 'authenticated');

-- Create policies for other tables
CREATE POLICY "Anyone can view paper tags" ON paper_tags
    FOR SELECT USING (true);

CREATE POLICY "Authenticated users can manage paper tags" ON paper_tags
    FOR ALL WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Anyone can view session papers" ON session_papers
    FOR SELECT USING (true);

CREATE POLICY "Session participants can manage session papers" ON session_papers
    FOR ALL WITH CHECK (
        EXISTS (
            SELECT 1 FROM group_participants gp
            JOIN sessions s ON gp.group_id = s.group_id
            WHERE s.session_id = session_papers.session_id
            AND gp.user_id = auth.uid()::int
        )
    );

CREATE POLICY "Anyone can view AI metadata" ON ai_metadata
    FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create AI metadata" ON ai_metadata
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Anyone can view feedback" ON feedback
    FOR SELECT USING (true);

CREATE POLICY "Group members can create feedback" ON feedback
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM group_participants gp
            JOIN sessions s ON gp.group_id = s.group_id
            WHERE s.session_id = feedback.session_id
            AND gp.user_id = auth.uid()::int
        )
    );
```

### 4. Environment-Specific Deployment

#### Development Environment
```bash
# Start local Supabase
supabase start

# Apply migrations
supabase db push

# Verify functions are created
supabase db functions list
```

#### Staging Environment
```bash
# Link to staging project
supabase link --project-ref your-staging-project-ref

# Apply migrations
supabase db push

# Test endpoints
curl -X GET "https://your-staging-project.supabase.co/rest/v1/rpc/get_all_users" \
  -H "apikey: your-anon-key" \
  -H "Authorization: Bearer your-jwt-token"
```

#### Production Environment
```bash
# Link to production project
supabase link --project-ref your-production-project-ref

# Create backup before migration
supabase db dump --schema public --data-only > backup_$(date +%Y%m%d_%H%M%S).sql

# Apply migrations
supabase db push

# Verify deployment
supabase db diff
```

### 5. Manual Migration Scripts

#### For environments without Supabase CLI:

**apply_schema.sql**
```sql
-- Connect to database and run
-- psql "your-connection-string" -f apply_schema.sql

\echo 'Applying base schema...'
\i backend/app/db/schema.sql

\echo 'Creating database functions...'
\i sql-functions/01_user_group_session_functions.sql
\i sql-functions/02_message_paper_functions.sql
\i sql-functions/03_feedback_ai_metadata_functions.sql

\echo 'Setting up RLS policies...'
-- RLS policies from migration_003_rls_policies.sql

\echo 'Migration complete!'
```

**rollback_schema.sql**
```sql
-- Rollback script for emergency use
\echo 'Rolling back database functions...'

-- Drop all custom functions
DROP FUNCTION IF EXISTS get_all_users();
DROP FUNCTION IF EXISTS get_user_by_id(INTEGER);
DROP FUNCTION IF EXISTS create_user(TEXT, TEXT, TEXT);
-- ... (continue for all functions)

\echo 'Functions rolled back!'
```

### 6. Data Migration Scripts

#### Migrate existing data if needed:

**migrate_existing_data.sql**
```sql
-- If you have existing data that needs to be transformed
-- This script would be run after the schema migration

-- Example: Update user availability format
UPDATE users 
SET availability = CASE 
    WHEN is_active = true THEN 'available'
    ELSE 'offline'
END
WHERE availability IS NULL;

-- Example: Ensure AI user exists
INSERT INTO users (email, first_name, last_name, availability)
VALUES ('ai@assistant.com', 'AI', 'Assistant', 'available')
ON CONFLICT (email) DO NOTHING;
```

### 7. Verification Scripts

#### verify_migration.sql
```sql
-- Verify all functions exist
SELECT routine_name, routine_type 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name LIKE '%user%' OR routine_name LIKE '%group%' 
OR routine_name LIKE '%session%' OR routine_name LIKE '%message%'
OR routine_name LIKE '%paper%' OR routine_name LIKE '%feedback%'
ORDER BY routine_name;

-- Test basic functionality
SELECT * FROM get_all_users() LIMIT 5;
SELECT * FROM get_all_groups() LIMIT 5;
SELECT * FROM get_all_sessions(NULL, NULL) LIMIT 5;

-- Verify RLS is enabled
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND rowsecurity = true;
```

### 8. Deployment Commands Summary

```bash
# Complete migration workflow for new environment:

# 1. Setup
supabase login
supabase init
supabase start  # for local only

# 2. Link to project (staging/production)
supabase link --project-ref your-project-ref

# 3. Apply migrations
supabase db push

# 4. Verify
supabase db diff
psql "your-connection-string" -f verify_migration.sql

# 5. Deploy Express server
cd express-db-server
npm install
npm start

# 6. Test integration
curl -X GET "http://localhost:3001/api/users" \
  -H "Authorization: Bearer your-test-jwt"
```

### 9. Monitoring and Maintenance

#### Health Check Script
```bash
#!/bin/bash
# health_check.sh

echo "Checking Supabase connection..."
supabase db ping

echo "Checking database functions..."
psql "$DATABASE_URL" -c "SELECT get_all_users() LIMIT 1;"

echo "Checking Express server..."
curl -f http://localhost:3001/health || exit 1

echo "All systems operational!"
```

#### Backup Script
```bash
#!/bin/bash
# backup.sh

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="backup_${DATE}.sql"

echo "Creating backup: $BACKUP_FILE"
supabase db dump --data-only > "$BACKUP_FILE"

echo "Backup completed: $BACKUP_FILE"
```