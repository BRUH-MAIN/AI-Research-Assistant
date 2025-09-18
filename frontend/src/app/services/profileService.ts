import { ApiClient } from './api';
import { createClient } from '@supabase/supabase-js';
import type { 
  UserProfile, 
  ProfileUpdateData
} from '../types/types';

// Supabase Configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Create a specialized API client for the Express backend
const EXPRESS_DB_URL = process.env.NEXT_PUBLIC_EXPRESS_DB_URL || 'http://localhost:3001';

export class ProfileService {
  private async makeAuthenticatedRequest<T>(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    endpoint: string,
    data?: any
  ): Promise<T> {
    // Get the current Supabase session token
    const { data: { session } } = await supabase.auth.getSession();
    console.log('ProfileService: Supabase session:', session);
    
    if (!session?.access_token) {
      console.error('ProfileService: No access token found in session');
      throw new Error('No authentication token available');
    }

    console.log('ProfileService: Using token:', session.access_token.substring(0, 20) + '...');
    
    const url = `${EXPRESS_DB_URL}/api${endpoint}`;
    
    const config: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
    };

    if (data && (method === 'POST' || method === 'PUT')) {
      config.body = JSON.stringify(data);
    }

    console.log('ProfileService: Making request to:', url, 'with headers:', config.headers);

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        let errorMessage = `HTTP error! status: ${response.status}`;
        let errorData = null;
        
        try {
          errorData = await response.json();
          errorMessage = errorData.detail || errorData.message || errorMessage;
        } catch (e) {
          errorMessage = response.statusText || errorMessage;
        }
        
        console.error('ProfileService: Request failed:', errorMessage, errorData);
        throw new Error(errorMessage);
      }

      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        return await response.json();
      } else {
        return {} as T;
      }
    } catch (error) {
      console.error('ProfileService: Network error:', error);
      throw error;
    }
  }

  // Get current user profile
  async getProfile(): Promise<UserProfile> {
    return this.makeAuthenticatedRequest<UserProfile>('GET', '/auth/me');
  }

  // Update user profile
  async updateProfile(profileData: ProfileUpdateData): Promise<UserProfile> {
    return this.makeAuthenticatedRequest<UserProfile>('PUT', '/auth/me', profileData);
  }

  // Sync profile with Supabase auth
  async syncProfile(): Promise<{ message: string; profile: UserProfile }> {
    return this.makeAuthenticatedRequest<{ message: string; profile: UserProfile }>('POST', '/auth/sync-profile');
  }

  // Get auth status
  async getAuthStatus(): Promise<{ authenticated: boolean; user?: any }> {
    return this.makeAuthenticatedRequest<{ authenticated: boolean; user?: any }>('GET', '/auth/status');
  }

  // Health check
  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(EXPRESS_DB_URL);
      return response.status === 200;
    } catch (error) {
      console.error('Health check failed:', error);
      return false;
    }
  }
}

// Create singleton instance
export const profileService = new ProfileService();