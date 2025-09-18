import { apiClient } from './api';
import type { 
  ChatMessage, 
  CreateMessageRequest, 
  UpdateMessageRequest
} from '../types/types';

export class MessageService {
  // Get all messages with optional filtering
  async getMessages(filters?: {
    session_id?: number;
    user_id?: number;
    message_type?: 'user' | 'ai' | 'system';
  }): Promise<ChatMessage[]> {
    return apiClient.get<ChatMessage[]>('/messages/', filters);
  }

  // Create a new message
  async createMessage(messageData: CreateMessageRequest): Promise<ChatMessage> {
    return apiClient.post<ChatMessage>('/messages/', messageData);
  }

  // Get a specific message by ID
  async getMessage(messageId: number): Promise<ChatMessage> {
    return apiClient.get<ChatMessage>(`/messages/${messageId}`);
  }

  // Update a specific message
  async updateMessage(messageId: number, messageData: UpdateMessageRequest): Promise<ChatMessage> {
    return apiClient.put<ChatMessage>(`/messages/${messageId}`, messageData);
  }

  // Delete a specific message
  async deleteMessage(messageId: number): Promise<void> {
    return apiClient.delete<void>(`/messages/${messageId}`);
  }

  // Get messages for a specific session
  async getSessionMessages(sessionId: number): Promise<ChatMessage[]> {
    return apiClient.get<ChatMessage[]>(`/sessions/${sessionId}/messages`);
  }

  // Create message in a specific session
  async createSessionMessage(sessionId: number, messageData: Omit<CreateMessageRequest, 'session_id'>): Promise<ChatMessage> {
    return apiClient.post<ChatMessage>(`/sessions/${sessionId}/messages`, messageData);
  }
}

// Create singleton instance
export const messageService = new MessageService();