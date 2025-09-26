import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  
  if (!code || !state) {
    return NextResponse.redirect(new URL('/?error=missing_params', request.url));
  }

  try {
    // Forward the request to Supabase auth callback
    const supabaseUrl = 'https://deevlykgzfhcyesynwxx.supabase.co/auth/v1/callback';
    const callbackUrl = new URL(supabaseUrl);
    callbackUrl.searchParams.set('code', code);
    callbackUrl.searchParams.set('state', state);
    
    // Copy any other query parameters
    searchParams.forEach((value, key) => {
      if (key !== 'code' && key !== 'state') {
        callbackUrl.searchParams.set(key, value);
      }
    });

    // Make the request to Supabase
    const response = await fetch(callbackUrl.toString(), {
      method: 'GET',
      headers: {
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'User-Agent': request.headers.get('user-agent') || 'AI-Research-Assistant',
      },
    });

    if (response.ok) {
      // Successful auth, redirect to home page
      const homeUrl = new URL('/', request.url);
      return NextResponse.redirect(homeUrl);
    } else {
      // Auth failed, redirect with error
      const errorUrl = new URL('/?error=auth_failed', request.url);
      return NextResponse.redirect(errorUrl);
    }
  } catch (error) {
    console.error('Auth callback error:', error);
    const errorUrl = new URL('/?error=callback_error', request.url);
    return NextResponse.redirect(errorUrl);
  }
}

// Handle POST requests as well (some OAuth flows use POST)
export async function POST(request: NextRequest) {
  return GET(request);
}