import axios from 'axios';
import type { Message } from '../types/types';
import { createClient } from '@supabase/supabase-js';

// Supabase Configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Create Supabase client
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// API Configuration
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';
const API_VERSION = process.env.NEXT_PUBLIC_API_VERSION || 'v1';
const API_URL = `${API_BASE_URL}/api/${API_VERSION}`;

// Create axios instance with default configuration
const apiClient = axios.create({
  baseURL: API_URL,
  timeout: 30000, // 30 seconds timeout
  headers: {
    'Content-Type': 'application/json',
  },
});

// Helper function to get auth header
const getAuthHeader = async () => {
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.access_token) {
    return { Authorization: `Bearer ${session.access_token}` };
  }
  return {};
};

// Request interceptor for logging and auth
apiClient.interceptors.request.use(
  async (config) => {
    // Add auth header if available
    const authHeader = await getAuthHeader();
    Object.assign(config.headers, authHeader);
    
    console.log(`[API Request] ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => {
    console.error('[API Request Error]', error);
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => {
    console.log(`[API Response] ${response.status} ${response.config.url}`);
    return response;
  },
  (error) => {
    console.error('[API Response Error]', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

// API Types matching backend models
export interface ChatRequest {
  id: string;
  sender: 'user' | 'ai';
  content: string;
  timestamp: Date;
}

export interface ChatResponse {
  userMessage: Message;
  aiMessage: Message;
}

export interface SessionCreateResponse {
  session_id: string;
}

export interface SessionHistoryResponse {
  messages: Message[];
}

export interface SuccessResponse {
  message: string;
}

// Profile-related interfaces
export interface UserProfile {
  user_id: number;
  auth_user_id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  profile_picture_url?: string;
  bio?: string;
  phone_number?: string;
  availability: 'available' | 'busy' | 'offline';
  created_at: string;
  updated_at?: string;
}

export interface ProfileUpdateData {
  first_name?: string;
  last_name?: string;
  bio?: string;
  phone_number?: string;
  availability?: 'available' | 'busy' | 'offline';
}

export interface ProfileSyncResponse {
  message: string;
  profile: UserProfile;
}

// API Service Class
class ApiService {
  // Health check endpoint
  async healthCheck(): Promise<boolean> {
    try {
      const response = await apiClient.get('/');
      return response.status === 200 && response.data.status === 'online';
    } catch (error) {
      console.error('Health check failed:', error);
      return false;
    }
  }

  // Chat Session Management
  async createSession(): Promise<string> {
    try {
      const response = await apiClient.post<SessionCreateResponse>('/chat/sessions');
      return response.data.session_id;
    } catch (error) {
      console.error('Failed to create session:', error);
      throw new Error('Failed to create chat session');
    }
  }

  async getSessionHistory(sessionId: string): Promise<Message[]> {
    try {
      const response = await apiClient.get<SessionHistoryResponse>(`/chat/${sessionId}/history`);
      return response.data.messages || [];
    } catch (error) {
      console.error('Failed to get session history:', error);
      throw new Error('Failed to load chat history');
    }
  }

  async sendMessage(sessionId: string, message: ChatRequest): Promise<ChatResponse> {
    try {
      const response = await apiClient.post<ChatResponse>(`/chat/${sessionId}`, message);
      return response.data;
    } catch (error) {
      console.error('Failed to send message:', error);
      throw new Error('Failed to send message');
    }
  }

  async deleteSession(sessionId: string): Promise<boolean> {
    try {
      await apiClient.delete<SuccessResponse>(`/chat/${sessionId}`);
      return true;
    } catch (error) {
      console.error('Failed to delete session:', error);
      throw new Error('Failed to delete session');
    }
  }

  // Legacy endpoint for simple prompts
  async sendSimplePrompt(prompt: string): Promise<string> {
    try {
      const response = await apiClient.post('/chat', { prompt });
      return response.data.response;
    } catch (error) {
      console.error('Failed to send prompt:', error);
      throw new Error('Failed to process prompt');
    }
  }

  // Profile Management
  async getProfile(): Promise<UserProfile> {
    try {
      const response = await apiClient.get<UserProfile>('/auth/me');
      return response.data;
    } catch (error) {
      console.error('Failed to get profile:', error);
      throw new Error('Failed to load profile');
    }
  }

  async updateProfile(profileData: ProfileUpdateData): Promise<UserProfile> {
    try {
      const response = await apiClient.put<UserProfile>('/auth/me', profileData);
      return response.data;
    } catch (error) {
      console.error('Failed to update profile:', error);
      throw new Error('Failed to update profile');
    }
  }

  async syncProfile(): Promise<ProfileSyncResponse> {
    try {
      const response = await apiClient.post<ProfileSyncResponse>('/auth/sync-profile');
      return response.data;
    } catch (error) {
      console.error('Failed to sync profile:', error);
      throw new Error('Failed to sync profile');
    }
  }

  async getAuthStatus(): Promise<{ authenticated: boolean; user?: any }> {
    try {
      const response = await apiClient.get('/auth/status');
      return response.data;
    } catch (error) {
      console.error('Failed to get auth status:', error);
      return { authenticated: false };
    }
  }
}

// Export singleton instance
export const apiService = new ApiService();
export default apiService;
