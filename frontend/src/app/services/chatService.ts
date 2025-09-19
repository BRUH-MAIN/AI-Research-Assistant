import { ApiClient } from './api';
import { createClient } from '@supabase/supabase-js';
import type { Message } from '../types/types';

// Supabase Configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Create a specialized API client for the FastAPI backend chat functionality
const FASTAPI_BACKEND_URL = process.env.NEXT_PUBLIC_FASTAPI_BACKEND_URL || 'http://localhost:8000';

export interface ChatMessage {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
  user_id?: string;
}

export interface ChatRequest {
  message: string;
  user_id?: string;
}

export interface ChatResponse {
  message: ChatMessage;
  session_id: string;
}

export interface SessionCreate {
  session_id: string;
}

export interface SessionHistory {
  messages: ChatMessage[];
  session_id?: string;
}

export class ChatService {
  private async getAuthenticatedApiClient(): Promise<ApiClient> {
    const apiClient = new ApiClient(`${FASTAPI_BACKEND_URL}/api/v1`);
    
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
      const response = await fetch(`${FASTAPI_BACKEND_URL}/api/v1/`);
      return response.status === 200;
    } catch (error) {
      console.error('Health check failed:', error);
      return false;
    }
  }

  // Create a new chat session
  async createSession(): Promise<string> {
    const apiClient = await this.getAuthenticatedApiClient();
    const response = await apiClient.post<SessionCreate>('/chat/sessions');
    return response.session_id;
  }

  // Get session history
  async getSessionHistory(sessionId: string): Promise<ChatMessage[]> {
    const apiClient = await this.getAuthenticatedApiClient();
    const response = await apiClient.get<SessionHistory>(`/chat/${sessionId}/history`);
    return response.messages;
  }

  // Send a message and get AI response
  async sendMessage(sessionId: string, message: string, userId?: string): Promise<ChatResponse> {
    const apiClient = await this.getAuthenticatedApiClient();
    const request: ChatRequest = { message, user_id: userId };
    return apiClient.post<ChatResponse>(`/chat/${sessionId}`, request);
  }

  // Delete a session
  async deleteSession(sessionId: string): Promise<void> {
    const apiClient = await this.getAuthenticatedApiClient();
    await apiClient.delete(`/chat/${sessionId}`);
  }
}

// Create singleton instance
export const chatService = new ChatService();