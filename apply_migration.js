const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

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
        const migrationPath = path.join(__dirname, 'supabase', 'migrations', '20240930000003_add_get_user_groups_function.sql');
        const migrationSql = fs.readFileSync(migrationPath, 'utf8');
        
        console.log('Applying migration to Supabase...');
        
        // Split the migration into individual statements
        const statements = migrationSql
            .split(';')
            .map(s => s.trim())
            .filter(s => s.length > 0 && !s.startsWith('--'));
        
        for (const statement of statements) {
            if (statement.trim()) {
                console.log(`Executing: ${statement.substring(0, 100)}...`);
                const { data, error } = await supabase.rpc('exec_sql', { sql: statement + ';' });
                
                if (error) {
                    // Try direct SQL execution if RPC fails
                    const { data: directData, error: directError } = await supabase
                        .from('_dummy_table_that_does_not_exist')
                        .select('*')
                        .limit(0);
                    
                    // Since direct SQL execution through Supabase client is limited,
                    // let's try using the raw SQL approach
                    console.log('RPC approach failed, trying alternative...');
                    throw error;
                }
                
                console.log('Statement executed successfully');
            }
        }
        
        console.log('Migration applied successfully!');
        
    } catch (error) {
        console.error('Error applying migration:', error.message);
        console.log('\nPlease apply the migration manually by copying the SQL from:');
        console.log('supabase/migrations/20240930000003_add_get_user_groups_function.sql');
        console.log('\nAnd executing it in the Supabase SQL Editor at:');
        console.log('https://supabase.com/dashboard/project/ohdtchrdrwwojbstbedj/sql');
        process.exit(1);
    }
}

applyMigration();
