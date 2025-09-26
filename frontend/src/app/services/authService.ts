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
    
    // Check if we already have a mapping stored
    const storedId = localStorage.getItem(storageKey);
    if (storedId) {
      const id = parseInt(storedId);
      if (!isNaN(id)) {
        this.currentInternalUserId = id;
        return id;
      }
    }

    // Try to find the user in our database by auth_user_id with retry logic
    let retryCount = 0;
    const maxRetries = 3;
    
    while (retryCount < maxRetries) {
      try {
        console.log(`Attempting to fetch users (attempt ${retryCount + 1}/${maxRetries})`);
        const users = await apiClient.get<any[]>('/users/');
        console.log('All users from API:', users);
        console.log('Looking for user with auth_user_id:', supabaseUser.id);
        
        const matchingUser = users.find(user => user.auth_user_id === supabaseUser.id);
        console.log('Matching user found:', matchingUser);
        
        if (matchingUser) {
          // Found the user, store the mapping
          // The API returns 'id' not 'user_id'
          const internalId = matchingUser.id;
          if (internalId != null) {
            console.log('Setting internal user ID to:', internalId);
            localStorage.setItem(storageKey, internalId.toString());
            this.currentInternalUserId = internalId;
            return internalId;
          }
        } else {
          console.warn('No user found with auth_user_id:', supabaseUser.id);
          console.log('User details:', supabaseUser);
          
          // Fallback: try to find user by email (for existing users who might not have auth_user_id set)
          if (supabaseUser.email) {
            const emailMatchingUser = users.find(user => user.email === supabaseUser.email);
            console.log('Email matching user found:', emailMatchingUser);
            
            if (emailMatchingUser && !emailMatchingUser.auth_user_id) {
              console.log('Found user by email but auth_user_id is missing. Attempting to sync profile...');
              
              // Try to sync the profile to set the auth_user_id
              try {
                await apiClient.post('/auth/sync-profile');
                console.log('Profile sync completed. Retrying user lookup...');
                
                // Retry the lookup after sync
                const updatedUsers = await apiClient.get<any[]>('/users/');
                const syncedUser = updatedUsers.find(user => user.auth_user_id === supabaseUser.id);
                
                if (syncedUser && syncedUser.id != null) {
                  console.log('Successfully synced user. Setting internal ID to:', syncedUser.id);
                  localStorage.setItem(storageKey, syncedUser.id.toString());
                  this.currentInternalUserId = syncedUser.id;
                  return syncedUser.id;
                }
              } catch (syncError) {
                console.error('Failed to sync profile:', syncError);
              }
            }
          }
        }
        
        // Exit retry loop if we got a valid response but no user found
        break;
        
      } catch (error) {
        console.error(`Error fetching users from database (attempt ${retryCount + 1}):`, error);
        retryCount++;
        
        if (retryCount < maxRetries) {
          // Wait before retrying
          await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
        }
      }
    }

    // For users not found in database, use guest user ID (0)
    // This prevents errors but may limit functionality
    const guestUserId = 0;
    localStorage.setItem(storageKey, guestUserId.toString());
    this.currentInternalUserId = guestUserId;
    
    console.warn(`User ${supabaseUser.email} not found in database after ${maxRetries} attempts, using guest access (ID: ${guestUserId}). Some features may be limited.`);
    return guestUserId;
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
      // In development mode, return mock user if using dev auth
      if (devAuth.shouldUseMockAuth() && devAuth.isUsingMockAuth()) {
        console.log('Using development mock user');
        const mockUser = devAuth.getMockUser();
        if (mockUser) {
          await this.getInternalUserId(mockUser);
        }
        return mockUser;
      }

      const { data: { user }, error } = await supabase.auth.getUser();
      
      if (error) {
        console.error('Error getting current user:', error);
        return null;
      }
      
      if (user) {
        // Set the internal user ID mapping
        await this.getInternalUserId(user);
      }
      
      return user;
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
      
      // Store tokens
      if (data.session?.access_token) {
        localStorage.setItem('access_token', data.session.access_token);
        if (data.session.refresh_token) {
          localStorage.setItem('refresh_token', data.session.refresh_token);
        }
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
      
      // Clear tokens
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
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
        apiClient.setAuthToken(session.access_token);
        
        // Set internal user ID mapping for the new session
        if (session.user) {
          await this.getInternalUserId(session.user);
        }
      } else {
        // Clear tokens and mappings if no session
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
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