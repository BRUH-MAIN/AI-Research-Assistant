import { apiClient } from './api';
import type { 
  Group, 
  CreateGroupRequest, 
  UpdateGroupRequest,
  GroupMember,
  AddGroupMemberRequest
} from '../types/types';

export class GroupService {
  // Get all groups
  async getGroups(): Promise<Group[]> {
    return apiClient.get<Group[]>('/groups/');
  }

  // Create a new group
  async createGroup(groupData: CreateGroupRequest): Promise<Group> {
    return apiClient.post<Group>('/groups/', groupData);
  }

  // Get a specific group by ID
  async getGroup(groupId: number): Promise<Group> {
    return apiClient.get<Group>(`/groups/${groupId}`);
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
  async getGroupMembers(groupId: number): Promise<GroupMember[]> {
    return apiClient.get<GroupMember[]>(`/groups/${groupId}/members`);
  }

  // Add a member to group
  async addGroupMember(groupId: number, memberData: AddGroupMemberRequest): Promise<void> {
    return apiClient.post<void>(`/groups/${groupId}/members`, memberData);
  }

  // Remove member from group
  async removeGroupMember(groupId: number, userId: number): Promise<void> {
    return apiClient.delete<void>(`/groups/${groupId}/members/${userId}`);
  }
}

// Create singleton instance
export const groupService = new GroupService();