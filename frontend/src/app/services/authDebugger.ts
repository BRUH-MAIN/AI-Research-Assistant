/**
 * Enhanced authentication debugging utilities
 * Provides comprehensive logging and debugging for authentication state
 */

import { createClient } from '@supabase/supabase-js';
import { apiClient } from './api';

// Supabase Configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface AuthDebugInfo {
  supabaseSession: any;
  supabaseUser: any;
  localStorageTokens: {
    accessToken: string | null;
    refreshToken: string | null;
    devMode: string | null;
  };
  internalUserId: number | null;
  apiConnectivity: boolean;
  databaseUserRecord: any;
  timestamp: string;
}

export class AuthDebugger {
  private static logs: string[] = [];
  
  static log(message: string, data?: any) {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] ${message}`;
    
    console.log(logEntry, data || '');
    this.logs.push(data ? `${logEntry} ${JSON.stringify(data)}` : logEntry);
    
    // Keep only last 50 logs
    if (this.logs.length > 50) {
      this.logs = this.logs.slice(-50);
    }
  }
  
  static getLogs(): string[] {
    return [...this.logs];
  }
  
  static clearLogs() {
    this.logs = [];
  }
  
  static async getFullDebugInfo(): Promise<AuthDebugInfo> {
    const timestamp = new Date().toISOString();
    
    this.log('=== Starting Full Auth Debug ===');
    
    // 1. Check Supabase session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    this.log('Supabase session check', { 
      hasSession: !!session, 
      hasUser: !!session?.user,
      userEmail: session?.user?.email,
      error: sessionError?.message 
    });
    
    // 2. Check Supabase user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    this.log('Supabase user check', { 
      hasUser: !!user, 
      userEmail: user?.email,
      userId: user?.id,
      error: userError?.message 
    });
    
    // 3. Check localStorage tokens
    const localStorageTokens = {
      accessToken: typeof window !== 'undefined' ? localStorage.getItem('access_token') : null,
      refreshToken: typeof window !== 'undefined' ? localStorage.getItem('refresh_token') : null,
      devMode: typeof window !== 'undefined' ? localStorage.getItem('dev_mode') : null,
    };
    this.log('localStorage tokens', {
      hasAccessToken: !!localStorageTokens.accessToken,
      hasRefreshToken: !!localStorageTokens.refreshToken,
      isDevMode: localStorageTokens.devMode === 'true'
    });
    
    // 4. Check internal user ID mapping
    let internalUserId: number | null = null;
    if (user?.id && typeof window !== 'undefined') {
      const storageKey = `internal_user_id_${user.id}`;
      const storedId = localStorage.getItem(storageKey);
      internalUserId = storedId ? parseInt(storedId) : null;
    }
    this.log('Internal user ID mapping', { internalUserId });
    
    // 5. Test API connectivity
    let apiConnectivity = false;
    try {
      await apiClient.get('/health');
      apiConnectivity = true;
      this.log('API connectivity: OK');
    } catch (error) {
      this.log('API connectivity: FAILED', { error: String(error) });
    }
    
    // 6. Check database user record
    let databaseUserRecord: any = null;
    if (user?.id && apiConnectivity) {
      try {
        const users = await apiClient.get<any[]>('/users/');
        databaseUserRecord = users.find(u => u.auth_user_id === user.id);
        this.log('Database user record', { 
          found: !!databaseUserRecord,
          userId: databaseUserRecord?.id,
          email: databaseUserRecord?.email 
        });
      } catch (error) {
        this.log('Database user record check failed', { error: String(error) });
      }
    }
    
    this.log('=== Auth Debug Complete ===');
    
    return {
      supabaseSession: session,
      supabaseUser: user,
      localStorageTokens,
      internalUserId,
      apiConnectivity,
      databaseUserRecord,
      timestamp
    };
  }
  
  static async diagnoseAuthIssues(): Promise<string[]> {
    const issues: string[] = [];
    
    try {
      const debugInfo = await this.getFullDebugInfo();
      
      // Diagnose common issues
      if (!debugInfo.supabaseUser) {
        issues.push('❌ No authenticated Supabase user - User needs to log in');
      } else {
        if (!debugInfo.supabaseSession) {
          issues.push('⚠️ Supabase user exists but no session - Session may have expired');
        }
        
        if (!debugInfo.localStorageTokens.accessToken) {
          issues.push('⚠️ No access token in localStorage - Token storage issue');
        }
        
        if (!debugInfo.apiConnectivity) {
          issues.push('❌ Cannot connect to API - Check if Express server is running');
        } else {
          if (!debugInfo.databaseUserRecord) {
            issues.push('❌ User not found in database - Database sync issue');
          } else if (debugInfo.databaseUserRecord.auth_user_id !== debugInfo.supabaseUser.id) {
            issues.push('⚠️ auth_user_id mismatch - Database needs sync');
          }
        }
        
        if (debugInfo.internalUserId === null) {
          issues.push('⚠️ No internal user ID mapping - User ID lookup failed');
        } else if (debugInfo.internalUserId === 0) {
          issues.push('❌ User mapped to guest ID (0) - This causes guest mode behavior');
        }
      }
      
      if (issues.length === 0) {
        issues.push('✅ No authentication issues detected');
      }
      
    } catch (error) {
      issues.push(`❌ Error during diagnosis: ${String(error)}`);
    }
    
    return issues;
  }
  
  static async attemptAutoFix(): Promise<string[]> {
    const fixes: string[] = [];
    
    try {
      const debugInfo = await this.getFullDebugInfo();
      
      if (debugInfo.supabaseUser && !debugInfo.databaseUserRecord && debugInfo.apiConnectivity) {
        fixes.push('🔧 Attempting to create database user record...');
        
        try {
          const userData = {
            auth_user_id: debugInfo.supabaseUser.id,
            email: debugInfo.supabaseUser.email,
            first_name: debugInfo.supabaseUser.user_metadata?.full_name?.split(' ')[0] || 
                       debugInfo.supabaseUser.email?.split('@')[0] || 'User',
            last_name: debugInfo.supabaseUser.user_metadata?.full_name?.split(' ').slice(1).join(' ') || null,
            profile_picture_url: debugInfo.supabaseUser.user_metadata?.avatar_url || null
          };
          
          await apiClient.post('/users/create-from-auth', userData);
          fixes.push('✅ Successfully created database user record');
          
        } catch (error) {
          fixes.push(`❌ Failed to create database user record: ${String(error)}`);
        }
      }
      
      if (debugInfo.supabaseUser && debugInfo.internalUserId === 0) {
        fixes.push('🔧 Clearing invalid guest user ID mapping...');
        
        if (typeof window !== 'undefined') {
          const storageKey = `internal_user_id_${debugInfo.supabaseUser.id}`;
          localStorage.removeItem(storageKey);
          fixes.push('✅ Cleared guest user ID mapping');
        }
      }
      
      if (!debugInfo.localStorageTokens.accessToken && debugInfo.supabaseSession?.access_token) {
        fixes.push('🔧 Restoring missing access token...');
        
        if (typeof window !== 'undefined') {
          localStorage.setItem('access_token', debugInfo.supabaseSession.access_token);
          if (debugInfo.supabaseSession.refresh_token) {
            localStorage.setItem('refresh_token', debugInfo.supabaseSession.refresh_token);
          }
          fixes.push('✅ Restored access token from session');
        }
      }
      
    } catch (error) {
      fixes.push(`❌ Error during auto-fix: ${String(error)}`);
    }
    
    return fixes;
  }
  
  static generateDebugReport(): string {
    const logs = this.getLogs();
    const report = [
      '=== Authentication Debug Report ===',
      `Generated at: ${new Date().toISOString()}`,
      '',
      '--- Recent Logs ---',
      ...logs,
      '',
      '--- Environment Info ---',
      `NEXT_PUBLIC_SUPABASE_URL: ${process.env.NEXT_PUBLIC_SUPABASE_URL}`,
      `NEXT_PUBLIC_EXPRESS_DB_URL: ${process.env.NEXT_PUBLIC_EXPRESS_DB_URL}`,
      `NODE_ENV: ${process.env.NODE_ENV}`,
      '',
      '--- Browser Info ---',
      `User Agent: ${typeof window !== 'undefined' ? navigator.userAgent : 'N/A'}`,
      `URL: ${typeof window !== 'undefined' ? window.location.href : 'N/A'}`,
      '',
      '=== End Report ==='
    ];
    
    return report.join('\n');
  }
}

export { AuthDebugger as authDebugger };