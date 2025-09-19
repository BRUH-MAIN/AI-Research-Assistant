import { apiClient } from './api';
import type { 
  Group, 
  CreateGroupRequest, 
  UpdateGroupRequest,
  GroupMember,
  AddGroupMemberRequest
} from '../types/types';

export interface CreateGroupData {
  name: string;
  description?: string;
  is_public?: boolean;
  created_by?: number;
}

export interface JoinGroupResult {
  message: string;
  group_id: number;
  group_name: string;
}

export interface UpdateRoleData {
  role: string;
  updated_by: number;
}

export interface RegenerateInviteResult {
  message: string;
  invite_code: string;
}

export class GroupService {
  // Get all groups
  async getGroups(): Promise<Group[]> {
    return apiClient.get<Group[]>('/groups/');
  }

  // Get user's groups
  async getUserGroups(userId: number): Promise<Group[]> {
    return apiClient.get<Group[]>(`/groups/user/${userId}`);
  }

  // Create a new group
  async createGroup(groupData: CreateGroupData): Promise<Group> {
    return apiClient.post<Group>('/groups/', groupData);
  }

  // Get a specific group by ID
  async getGroup(groupId: number): Promise<Group> {
    return apiClient.get<Group>(`/groups/${groupId}`);
  }

  // Get group by invite code
  async getGroupByInviteCode(inviteCode: string): Promise<Group> {
    return apiClient.get<Group>(`/groups/invite/${inviteCode}`);
  }

  // Join group by invite code
  async joinGroupByInviteCode(inviteCode: string, userId: number): Promise<JoinGroupResult> {
    return apiClient.post<JoinGroupResult>(`/groups/invite/${inviteCode}/join`, { user_id: userId });
  }

  // Update a specific group
  async updateGroup(groupId: number, groupData: UpdateGroupRequest): Promise<Group> {
    return apiClient.put<Group>(`/groups/${groupId}`, groupData);
  }

  // Delete a specific group
  async deleteGroup(groupId: number): Promise<void> {
    return apiClient.delete<void>(`/groups/${groupId}`);
  }

  // Get group members
  async getGroupMembers(groupId: number): Promise<{ member_ids: number[]; member_count: number }> {
    return apiClient.get<{ member_ids: number[]; member_count: number }>(`/groups/${groupId}/members`);
  }

  // Add a member to group
  async addGroupMember(groupId: number, userId: number, role: string = 'member'): Promise<any> {
    return apiClient.post<any>(`/groups/${groupId}/members/${userId}`, { role });
  }

  // Remove member from group
  async removeGroupMember(groupId: number, userId: number): Promise<void> {
    return apiClient.delete<void>(`/groups/${groupId}/members/${userId}`);
  }

  // Join group
  async joinGroup(groupId: number, userId: number): Promise<any> {
    return apiClient.post<any>(`/groups/${groupId}/join`, { user_id: userId });
  }

  // Leave group
  async leaveGroup(groupId: number, userId: number): Promise<void> {
    // For DELETE requests with body, we need to handle it differently
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/groups/${groupId}/leave`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ user_id: userId }),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to leave group: ${response.statusText}`);
    }
  }

  // Update member role
  async updateMemberRole(groupId: number, userId: number, role: string, updatedBy: number): Promise<{ message: string }> {
    return apiClient.put<{ message: string }>(`/groups/${groupId}/members/${userId}/role`, { 
      role, 
      updated_by: updatedBy 
    });
  }

  // Regenerate invite code
  async regenerateInviteCode(groupId: number, userId: number): Promise<RegenerateInviteResult> {
    return apiClient.post<RegenerateInviteResult>(`/groups/${groupId}/regenerate-invite`, { user_id: userId });
  }

  // Get member count
  async getGroupMemberCount(groupId: number): Promise<{ group_id: number; member_count: number }> {
    return apiClient.get<{ group_id: number; member_count: number }>(`/groups/${groupId}/members/count`);
  }
}

// Create singleton instance
export const groupService = new GroupService();