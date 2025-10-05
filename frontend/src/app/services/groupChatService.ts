import { apiClient } from './api';
import type { 
  GroupChatSession,
  GroupChatMessage, 
  OnlineUser,
  CreateGroupChatSessionRequest,
  SendGroupChatMessageRequest
} from '../types/groupChat';

export class GroupChatService {
  // Session Management
  async getGroupChatSessions(groupId: number): Promise<GroupChatSession[]> {
    return apiClient.get<GroupChatSession[]>(`/group-chat/${groupId}/sessions`);
  }

  async createGroupChatSession(groupId: number, data: CreateGroupChatSessionRequest): Promise<GroupChatSession> {
    return apiClient.post<GroupChatSession>(`/group-chat/${groupId}/sessions`, data);
  }

  async joinGroupChatSession(sessionId: number, userId: number): Promise<{ success: boolean; message: string }> {
    return apiClient.post(`/group-chat/sessions/${sessionId}/join`, { user_id: userId });
  }

  // Message Management
  async getGroupChatMessages(sessionId: number, limit: number = 50, offset: number = 0): Promise<GroupChatMessage[]> {
    return apiClient.get<GroupChatMessage[]>(`/group-chat/sessions/${sessionId}/messages`, { limit, offset });
  }

  async sendGroupChatMessage(sessionId: number, data: SendGroupChatMessageRequest): Promise<GroupChatMessage> {
    return apiClient.post<GroupChatMessage>(`/group-chat/sessions/${sessionId}/messages`, data);
  }

  // User Presence
  async getOnlineUsers(sessionId: number): Promise<OnlineUser[]> {
    return apiClient.get<OnlineUser[]>(`/group-chat/sessions/${sessionId}/online-users`);
  }

  async updateUserPresence(sessionId: number, userId: number, status: 'online' | 'away' | 'offline' = 'online'): Promise<{ success: boolean }> {
    return apiClient.put(`/group-chat/sessions/${sessionId}/presence`, { user_id: userId, status });
  }

  // Permissions
  async canUserInvokeAI(sessionId: number, userId: number): Promise<{ can_invoke_ai: boolean }> {
    return apiClient.get(`/group-chat/sessions/${sessionId}/can-invoke-ai`, { user_id: userId });
  }
}

// Create singleton instance
export const groupChatService = new GroupChatService();
