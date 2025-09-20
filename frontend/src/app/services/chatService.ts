import type { Message } from '../types/types';

// Create a specialized API client for the FastAPI backend chat functionality
const FASTAPI_URL = process.env.NEXT_PUBLIC_FASTAPI_URL || 'http://localhost:8000';

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
  // Health check
  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${FASTAPI_URL}/health`);
      return response.status === 200;
    } catch (error) {
      console.error('Health check failed:', error);
      return false;
    }
  }

  // Create a new chat session
  async createSession(): Promise<string> {
    try {
      const response = await fetch(`${FASTAPI_URL}/api/v1/chat/sessions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      return data.session_id;
    } catch (error) {
      console.error('Failed to create session:', error);
      throw error;
    }
  }

  // Get session history
  async getSessionHistory(sessionId: string): Promise<Message[]> {
    try {
      const response = await fetch(`${FASTAPI_URL}/api/v1/chat/${sessionId}/history`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      return data.messages || [];
    } catch (error) {
      console.error('Failed to get session history:', error);
      throw error;
    }
  }

  // Send a message and get AI response
  async sendMessage(sessionId: string, messageData: ChatMessage): Promise<SendMessageResponse> {
    try {
      const response = await fetch(`${FASTAPI_URL}/api/v1/chat/${sessionId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: messageData.content,
          user_id: null // For now, not using user authentication
        }),
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      return {
        aiMessage: {
          id: data.message.id,
          content: data.message.content
        },
        sessionId: data.session_id
      };
    } catch (error) {
      console.error('Failed to send message:', error);
      throw error;
    }
  }

  // Delete a session
  async deleteSession(sessionId: string): Promise<void> {
    try {
      const response = await fetch(`${FASTAPI_URL}/api/v1/chat/${sessionId}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
    } catch (error) {
      console.error('Failed to delete session:', error);
      throw error;
    }
  }
}

// Create singleton instance
export const chatService = new ChatService();