import { ApiClient } from './api';
import { createClient } from '@supabase/supabase-js';
import type { Message } from '../types/types';

// Supabase Configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Create a specialized API client for the Express backend chat functionality
const EXPRESS_DB_URL = process.env.NEXT_PUBLIC_EXPRESS_DB_URL || 'http://localhost:3001';

export interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  content: string;
  timestamp: Date;
}

export interface SendMessageResponse {
  aiMessage: {
    id: string;
    content: string;
  };
  sessionId: string;
}

export class ChatService {
  private async getAuthenticatedApiClient(): Promise<ApiClient> {
    const apiClient = new ApiClient(`${EXPRESS_DB_URL}/api`);
    
    // Get the current Supabase session token
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
      apiClient.setAuthToken(session.access_token);
    }
    
    return apiClient;
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

  // Create a new chat session
  async createSession(): Promise<string> {
    const apiClient = await this.getAuthenticatedApiClient();
    const response = await apiClient.post<{ sessionId: string }>('/sessions/create');
    return response.sessionId;
  }

  // Get session history
  async getSessionHistory(sessionId: string): Promise<Message[]> {
    const apiClient = await this.getAuthenticatedApiClient();
    return apiClient.get<Message[]>(`/sessions/${sessionId}/history`);
  }

  // Send a message and get AI response
  async sendMessage(sessionId: string, messageData: ChatMessage): Promise<SendMessageResponse> {
    const apiClient = await this.getAuthenticatedApiClient();
    return apiClient.post<SendMessageResponse>(`/sessions/${sessionId}/message`, messageData);
  }

  // Delete a session
  async deleteSession(sessionId: string): Promise<void> {
    const apiClient = await this.getAuthenticatedApiClient();
    return apiClient.delete<void>(`/sessions/${sessionId}`);
  }
}

// Create singleton instance
export const chatService = new ChatService();