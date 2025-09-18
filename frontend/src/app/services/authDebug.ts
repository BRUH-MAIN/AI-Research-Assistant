import { createClient } from '@supabase/supabase-js';

// Supabase Configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function debugAuth() {
  console.log('=== Auth Debug Info ===');
  
  // Check Supabase session
  const { data: { session }, error } = await supabase.auth.getSession();
  console.log('Supabase session:', session);
  console.log('Supabase error:', error);
  
  // Check localStorage tokens
  if (typeof window !== 'undefined') {
    const accessToken = localStorage.getItem('access_token');
    const refreshToken = localStorage.getItem('refresh_token');
    console.log('localStorage access_token:', accessToken ? 'Present' : 'Missing');
    console.log('localStorage refresh_token:', refreshToken ? 'Present' : 'Missing');
  }
  
  // Check user
  const { data: { user } } = await supabase.auth.getUser();
  console.log('Supabase user:', user);
  
  return {
    session,
    user,
    hasAccessToken: typeof window !== 'undefined' ? !!localStorage.getItem('access_token') : false,
    hasRefreshToken: typeof window !== 'undefined' ? !!localStorage.getItem('refresh_token') : false,
  };
}