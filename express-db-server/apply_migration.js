const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: '../.env' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('Supabase URL:', supabaseUrl);
console.log('Service Key present:', !!supabaseServiceKey);

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
});

async function applyMigration() {
    try {
        console.log('Reading migration file...');
        const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', '20240930000003_add_get_user_groups_function.sql');
        const migrationSql = fs.readFileSync(migrationPath, 'utf8');
        
        console.log('Migration content preview:');
        console.log(migrationSql.substring(0, 200) + '...');
        
        console.log('\nApplying migration to Supabase...');
        
        // Try to execute the function creation directly
        const functionSql = `
-- Add the missing get_user_groups function
CREATE OR REPLACE FUNCTION get_user_groups(p_user_id INTEGER)
RETURNS TABLE (
    id INTEGER,
    group_id INTEGER,
    name TEXT,
    description TEXT,
    is_public BOOLEAN,
    invite_code VARCHAR(12),
    member_count BIGINT,
    user_role TEXT,
    created_at TIMESTAMP,
    created_by INTEGER
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Check if user exists
    IF NOT EXISTS (SELECT 1 FROM users WHERE user_id = p_user_id) THEN
        RAISE EXCEPTION 'User with ID % not found', p_user_id USING ERRCODE = 'P0002';
    END IF;

    RETURN QUERY
    SELECT 
        g.group_id as id,
        g.group_id,
        g.name,
        COALESCE(g.description, '') as description,
        COALESCE(g.is_public, false) as is_public,
        g.invite_code,
        (
            SELECT COUNT(*)::BIGINT 
            FROM group_participants gp2 
            WHERE gp2.group_id = g.group_id
        ) as member_count,
        gp.role as user_role,
        g.created_at,
        g.created_by
    FROM groups g
    INNER JOIN group_participants gp ON g.group_id = gp.group_id
    WHERE gp.user_id = p_user_id
    ORDER BY g.created_at DESC;
END;
$$;
        `;
        
        // Execute via RPC call to execute raw SQL
        console.log('Executing function creation...');
        const { data, error } = await supabase.rpc('exec_sql', { sql: functionSql });
        
        if (error) {
            console.error('RPC exec_sql not available, error:', error);
            console.log('\nPlease manually execute the following SQL in Supabase SQL Editor:');
            console.log('='.repeat(80));
            console.log(functionSql);
            console.log('='.repeat(80));
            console.log('\nGo to: https://supabase.com/dashboard/project/ohdtchrdrwwojbstbedj/sql');
            return;
        }
        
        console.log('Migration applied successfully!', data);
        
        // Test the function
        console.log('\nTesting the function...');
        const { data: testData, error: testError } = await supabase.rpc('get_user_groups', { p_user_id: 1 });
        
        if (testError) {
            console.log('Function test failed:', testError);
        } else {
            console.log('Function test successful:', testData);
        }
        
    } catch (error) {
        console.error('Error applying migration:', error);
        console.log('\nPlease apply the migration manually by copying the SQL from:');
        console.log('supabase/migrations/20240930000003_add_get_user_groups_function.sql');
        console.log('\nAnd executing it in the Supabase SQL Editor.');
    }
}

applyMigration();
