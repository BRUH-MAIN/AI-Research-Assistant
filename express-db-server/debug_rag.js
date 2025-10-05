// Debug script to test RAG enable functionality
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

async function debugRagEnable() {
    console.log('Testing RAG enable functionality...');
    console.log('Supabase URL:', supabaseUrl);
    console.log('Service key (first 20 chars):', supabaseServiceKey?.substring(0, 20) + '...');
    
    try {
        // First, check if session exists
        console.log('\n1. Checking if session 3 exists...');
        const { data: session, error: sessionError } = await supabase
            .from('sessions')
            .select('*')
            .eq('session_id', 3)
            .single();
        
        if (sessionError) {
            console.error('Session check error:', sessionError);
            return;
        }
        
        console.log('Session found:', session);
        
        // Test the RPC function
        console.log('\n2. Testing enable_session_rag RPC...');
        const { data, error } = await supabase.rpc('enable_session_rag', {
            p_session_id: 3,
            p_enabled_by: 1
        });
        
        if (error) {
            console.error('RPC Error:', error);
            return;
        }
        
        console.log('RPC Success:', data);
        
        // Test get status
        console.log('\n3. Getting RAG status...');
        const { data: status, error: statusError } = await supabase.rpc('get_session_rag_status', {
            p_session_id: 3
        });
        
        if (statusError) {
            console.error('Status check error:', statusError);
            return;
        }
        
        console.log('RAG Status:', status);
        
    } catch (err) {
        console.error('Exception:', err);
    }
}

debugRagEnable();