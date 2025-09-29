const { createClient } = require('@supabase/supabase-js');

// Load environment variables
require('dotenv').config({ path: './.env' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
});

async function testCreateGroup() {
    console.log('🧪 Testing create_group RPC function...\n');
    
    try {
        console.log('🔍 Testing create_group with test data...');
        const { data, error } = await supabase.rpc('create_group', {
            p_name: 'Test Group ' + Date.now(),
            p_created_by: 4, // Use a valid user ID
            p_description: 'Test group description',
            p_is_public: false
        });
        
        if (error) {
            console.error('❌ create_group failed:', error.message);
            if (error.code === '42804') {
                console.error('   Type mismatch error - check migration');
            } else if (error.code === 'P0002') {
                console.error('   User not found error');
            }
            return false;
        } else {
            console.log('✅ create_group passed!');
            console.log('📋 Response structure:', JSON.stringify(data, null, 2));
            
            // Verify response has all required fields
            const requiredFields = ['success', 'group_id', 'name', 'invite_code'];
            const missingFields = requiredFields.filter(field => !(field in data));
            
            if (missingFields.length > 0) {
                console.log('⚠️  Missing fields in response:', missingFields);
                return false;
            } else {
                console.log('✅ All required fields present in response');
                return true;
            }
        }
    } catch (error) {
        console.error('❌ create_group exception:', error.message);
        return false;
    }
}

// Run the test
testCreateGroup().then(success => {
    if (success) {
        console.log('\n🎉 create_group function is working correctly!');
        console.log('Express route should now work without the group_id error.');
    } else {
        console.log('\n⚠️  create_group function needs the new migration applied.');
        console.log('\n📋 To fix this issue:');
        console.log('1. Go to: https://supabase.com/dashboard/project/ohdtchrdrwwojbstbedj/sql');
        console.log('2. Execute the SQL from: supabase/migrations/20240930000005_fix_create_group_return_invite_code.sql');
        console.log('3. Test the create group functionality again');
    }
});
