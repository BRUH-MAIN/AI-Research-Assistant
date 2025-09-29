const { createClient } = require('@supabase/supabase-js');

// Load environment variables
require('dotenv').config({ path: './.env' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
});

async function testAllFixedFunctions() {
    console.log('🧪 Testing all fixed RPC functions for type mismatches...\n');
    
    const tests = [
        {
            name: 'get_user_groups',
            params: { p_user_id: 4 },
            description: 'Test user groups with fixed VARCHAR types'
        },
        {
            name: 'get_all_sessions',
            params: {},
            description: 'Test sessions with fixed status VARCHAR(50)'
        },
        {
            name: 'get_all_messages',
            params: { p_limit: 5 },
            description: 'Test messages with fixed message_type VARCHAR(20)'
        }
    ];
    
    let passedTests = 0;
    let totalTests = tests.length;
    
    for (const test of tests) {
        try {
            console.log(`🔍 Testing ${test.name}...`);
            const { data, error } = await supabase.rpc(test.name, test.params);
            
            if (error) {
                console.error(`❌ ${test.name} failed:`, error.message);
                if (error.code === '42804') {
                    console.error(`   Type mismatch error - needs manual SQL execution`);
                }
            } else {
                console.log(`✅ ${test.name} passed - ${test.description}`);
                if (data && data.length > 0) {
                    console.log(`   Returned ${data.length} records`);
                } else {
                    console.log(`   Returned empty result (which is valid)`);
                }
                passedTests++;
            }
        } catch (error) {
            console.error(`❌ ${test.name} exception:`, error.message);
        }
        console.log(''); // Empty line for readability
    }
    
    console.log('📊 Test Summary:');
    console.log(`   Passed: ${passedTests}/${totalTests}`);
    
    if (passedTests === totalTests) {
        console.log('🎉 All functions are working correctly!');
        return true;
    } else {
        console.log('⚠️  Some functions still need the SQL migrations applied.');
        console.log('\n📋 To fix remaining issues:');
        console.log('1. Go to: https://supabase.com/dashboard/project/ohdtchrdrwwojbstbedj/sql');
        console.log('2. Execute the SQL from: supabase/migrations/20240930000003_add_get_user_groups_function.sql');
        console.log('3. Execute the SQL from: supabase/migrations/20240930000004_fix_all_type_mismatches.sql');
        return false;
    }
}

// Run all tests
testAllFixedFunctions();
