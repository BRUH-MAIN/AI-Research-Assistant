import { createClient } from '@supabase/supabase-js';
import { apiClient } from './api';
import { devAuth } from './devAuth';

// Supabase Configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Create a single Supabase client instance for this service
const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false // Disable URL session detection to avoid conflicts
  }
});

export interface User {
  id: string;
  email?: string;
  user_metadata?: {
    full_name?: string;
    name?: string;
  };
}

export class AuthService {
  private static instance: AuthService;
  private currentInternalUserId: number | null = null;

  public static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  // Get or set internal user ID mapping
  public async getInternalUserId(supabaseUser: User): Promise<number> {
    const storageKey = `internal_user_id_${supabaseUser.id}`;
    
    // Check if we already have a mapping stored and it's not guest (0)
    const storedId = localStorage.getItem(storageKey);
    if (storedId) {
      const id = parseInt(storedId);
      if (!isNaN(id) && id > 0) { // Don't use cached guest IDs
        this.currentInternalUserId = id;
        console.log(`Using cached internal user ID: ${id} for ${supabaseUser.email}`);
        return id;
      }
    }

    // Enhanced retry logic with exponential backoff
    let retryCount = 0;
    const maxRetries = 5; // Increased retries
    const baseDelay = 1000; // Base delay in milliseconds
    
    while (retryCount < maxRetries) {
      try {
        console.log(`Attempting to fetch users (attempt ${retryCount + 1}/${maxRetries}) for ${supabaseUser.email}`);
        
        // First, try to ensure the user exists in database by syncing profile
        if (retryCount === 0) {
          try {
            console.log('Attempting profile sync before user lookup...');
            await apiClient.post('/auth/sync-profile');
            console.log('Profile sync completed successfully');
          } catch (syncError) {
            console.warn('Profile sync failed, continuing with user lookup:', syncError);
          }
        }
        
        const users = await apiClient.get<any[]>('/users/');
        console.log(`Fetched ${users.length} users from database`);
        
        // Primary lookup by auth_user_id
        let matchingUser = users.find(user => user.auth_user_id === supabaseUser.id);
        console.log('User found by auth_user_id:', matchingUser ? `ID: ${matchingUser.id}` : 'None');
        
        // Fallback: lookup by email if auth_user_id lookup failed
        if (!matchingUser && supabaseUser.email) {
          console.log('Trying fallback lookup by email...');
          matchingUser = users.find(user => user.email === supabaseUser.email);
          
          if (matchingUser) {
            console.log(`Found user by email (ID: ${matchingUser.id}), but auth_user_id mismatch. Updating...`);
            
            // Update the user record to link auth_user_id
            try {
              await apiClient.put(`/users/${matchingUser.id}`, {
                auth_user_id: supabaseUser.id
              });
              console.log('Successfully linked auth_user_id to existing user');
            } catch (updateError) {
              console.warn('Failed to update auth_user_id:', updateError);
            }
          }
        }
        
        if (matchingUser && matchingUser.id != null && matchingUser.id > 0) {
          const internalId = matchingUser.id;
          console.log(`Successfully found internal user ID: ${internalId} for ${supabaseUser.email}`);
          localStorage.setItem(storageKey, internalId.toString());
          this.currentInternalUserId = internalId;
          return internalId;
        }
        
        // If no user found and this isn't the last attempt, wait and retry
        if (retryCount < maxRetries - 1) {
          const delay = baseDelay * Math.pow(2, retryCount); // Exponential backoff
          console.log(`User not found, waiting ${delay}ms before retry...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
        
      } catch (error) {
        console.error(`Error during user lookup (attempt ${retryCount + 1}):`, error);
        
        // If it's an authentication error, try to create the user
        if (String(error).includes('401') && retryCount === 0) {
          console.log('Authentication error detected, trying to create user record...');
          try {
            // Try to create user via the public endpoint
            const newUser = await this.createUserRecord(supabaseUser);
            if (newUser && newUser.id > 0) {
              console.log(`Successfully created new user record with ID: ${newUser.id}`);
              localStorage.setItem(storageKey, newUser.id.toString());
              this.currentInternalUserId = newUser.id;
              return newUser.id;
            }
          } catch (createError) {
            console.warn('Failed to create user record:', createError);
          }
        }
        
        if (retryCount < maxRetries - 1) {
          const delay = baseDelay * Math.pow(2, retryCount);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
      
      retryCount++;
    }

    // Only fall back to guest mode after all attempts failed
    console.error(`CRITICAL: User ${supabaseUser.email} (${supabaseUser.id}) not found in database after ${maxRetries} attempts.`);
    console.error('This may indicate a database synchronization issue.');
    
    // Don't cache guest ID - keep trying on subsequent calls
    this.currentInternalUserId = null;
    
    // Throw an error instead of silently defaulting to guest
    throw new Error(`Unable to find or create database record for user ${supabaseUser.email}. Please try logging out and logging back in.`);
  }

  // Create user record in database
  private async createUserRecord(supabaseUser: User): Promise<any> {
    try {
      console.log('Creating user record for:', supabaseUser.email);
      
      const metadata = supabaseUser.user_metadata as any; // Type assertion for flexibility
      const fullName = metadata?.full_name || metadata?.name || '';
      const nameParts = fullName.split(' ').filter(Boolean);
      
      const userData = {
        auth_user_id: supabaseUser.id,
        email: supabaseUser.email,
        first_name: nameParts[0] || supabaseUser.email?.split('@')[0] || 'User',
        last_name: nameParts.length > 1 ? nameParts.slice(1).join(' ') : null,
        profile_picture_url: metadata?.avatar_url || metadata?.picture || null,
        availability: 'available'
      };
      
      // Try creating via the public create-from-auth endpoint first
      try {
        const newUser = await apiClient.post('/users/create-from-auth', userData);
        console.log('Successfully created user record via create-from-auth:', newUser);
        return newUser;
      } catch (authEndpointError) {
        console.log('create-from-auth failed, trying regular users endpoint:', authEndpointError);
        // Fallback to regular users endpoint
        const newUser = await apiClient.post('/users/', userData);
        console.log('Successfully created user record via users endpoint:', newUser);
        return newUser;
      }
      
    } catch (error) {
      console.error('Failed to create user record:', error);
      throw error;
    }
  }

  // Set internal user ID (called during sign-up or when user is properly mapped)
  setInternalUserId(supabaseUserId: string, internalUserId: number): void {
    const storageKey = `internal_user_id_${supabaseUserId}`;
    localStorage.setItem(storageKey, internalUserId.toString());
    this.currentInternalUserId = internalUserId;
  }

  // Get current internal user ID
  getCurrentInternalUserId(): number | null {
    return this.currentInternalUserId;
  }

  // Refresh internal user ID mapping
  async refreshInternalUserId(): Promise<number | null> {
    const currentUser = await this.getCurrentUser();
    if (!currentUser) {
      this.currentInternalUserId = null;
      return null;
    }
    
    try {
      const internalId = await this.getInternalUserId(currentUser);
      return internalId;
    } catch (error) {
      console.error('Failed to refresh internal user ID:', error);
      return null;
    }
  }

  // Clear internal user ID mapping
  private clearInternalUserId(supabaseUserId?: string): void {
    if (supabaseUserId) {
      const storageKey = `internal_user_id_${supabaseUserId}`;
      localStorage.removeItem(storageKey);
    }
    this.currentInternalUserId = null;
  }

  // Get current user from Supabase
  async getCurrentUser(): Promise<User | null> {
    try {
      // First, try to get real authenticated user from Supabase
      const { data: { user }, error } = await supabase.auth.getUser();
      
      if (error) {
        console.error('Error getting current user:', error);
        // Only fall back to mock auth if there's an error and we're in development
        if (devAuth.shouldUseMockAuth() && devAuth.isUsingMockAuth()) {
          console.log('Supabase auth failed, using development mock user as fallback');
          const mockUser = devAuth.getMockUser();
          if (mockUser) {
            await this.getInternalUserId(mockUser);
          }
          return mockUser;
        }
        return null;
      }
      
      if (user) {
        // Clear mock auth mode since we have a real user
        if (devAuth.isUsingMockAuth()) {
          console.log('Real user found, clearing mock auth mode');
          localStorage.removeItem('dev_mode');
        }
        
        // Set the internal user ID mapping
        await this.getInternalUserId(user);
        return user;
      }
      
      // No real user found, use mock auth only if explicitly enabled
      if (devAuth.shouldUseMockAuth() && devAuth.isUsingMockAuth()) {
        console.log('No real user found, using development mock user');
        const mockUser = devAuth.getMockUser();
        if (mockUser) {
          await this.getInternalUserId(mockUser);
        }
        return mockUser;
      }
      
      return null;
    } catch (error) {
      console.error('Failed to get current user:', error);
      return null;
    }
  }

  // Get current session and token
  async getCurrentSession() {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error('Error getting session:', error);
        return null;
      }
      
      // Store access token in localStorage for API calls
      if (session?.access_token) {
        localStorage.setItem('access_token', session.access_token);
        if (session.refresh_token) {
          localStorage.setItem('refresh_token', session.refresh_token);
        }
        
        // Update API client token
        apiClient.setAuthToken(session.access_token);
      }
      
      return session;
    } catch (error) {
      console.error('Failed to get session:', error);
      return null;
    }
  }

  // Sign in with email/password
  async signIn(email: string, password: string) {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      
      if (error) throw error;
      
      // Store tokens and clear mock auth mode
      if (data.session?.access_token) {
        localStorage.setItem('access_token', data.session.access_token);
        if (data.session.refresh_token) {
          localStorage.setItem('refresh_token', data.session.refresh_token);
        }
        localStorage.removeItem('dev_mode'); // Clear mock auth mode for real sign-in
        apiClient.setAuthToken(data.session.access_token);
      }
      
      // Set up internal user ID mapping immediately after successful sign-in
      if (data.user) {
        await this.getInternalUserId(data.user);
      }
      
      return data;
    } catch (error) {
      console.error('Sign in error:', error);
      throw error;
    }
  }

  // Sign up with email/password
  async signUp(email: string, password: string, metadata?: any) {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: metadata
        }
      });
      
      if (error) throw error;
      
      return data;
    } catch (error) {
      console.error('Sign up error:', error);
      throw error;
    }
  }

  // Sign out
  async signOut() {
    try {
      // Get current user before signing out to clear their mapping
      const currentUser = await this.getCurrentUser();
      
      const { error } = await supabase.auth.signOut();
      
      if (error) throw error;
      
      // Clear tokens and development mode
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('dev_mode'); // Clear mock auth mode
      apiClient.clearAuthToken();
      
      // Clear internal user ID mapping
      if (currentUser) {
        this.clearInternalUserId(currentUser.id);
      }
      
    } catch (error) {
      console.error('Sign out error:', error);
      throw error;
    }
  }

  // Initialize auth state (call this on app startup)
  async initializeAuth() {
    try {
      // Check if we should use development mode
      if (devAuth.shouldUseMockAuth() && !devAuth.isUsingMockAuth()) {
        console.log('Setting up development authentication...');
        devAuth.setupMockAuth();
        return {
          access_token: localStorage.getItem('access_token'),
          user: devAuth.getMockUser()
        };
      }

      const session = await this.getCurrentSession();
      return session;
    } catch (error) {
      console.error('Failed to initialize auth:', error);
      return null;
    }
  }

  // Listen to auth state changes
  onAuthStateChange(callback: (event: string, session: any) => void) {
    return supabase.auth.onAuthStateChange(async (event, session) => {
      // Update tokens when auth state changes
      if (session?.access_token) {
        localStorage.setItem('access_token', session.access_token);
        if (session.refresh_token) {
          localStorage.setItem('refresh_token', session.refresh_token);
        }
        localStorage.removeItem('dev_mode'); // Clear mock auth mode for real session
        apiClient.setAuthToken(session.access_token);
        
        // Set internal user ID mapping for the new session
        if (session.user) {
          await this.getInternalUserId(session.user);
        }
      } else {
        // Clear tokens, mappings and mock auth mode if no session
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('dev_mode');
        apiClient.clearAuthToken();
        this.currentInternalUserId = null;
      }
      
      callback(event, session);
    });
  }

  // Get Supabase instance for direct access
  getSupabaseClient() {
    return supabase;
  }
}

// Export singleton instance
export const authService = AuthService.getInstance();
export { supabase };