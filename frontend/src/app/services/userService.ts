import { apiClient } from './api';
import type { 
  User, 
  CreateUserRequest, 
  UpdateUserRequest
} from '../types/types';

export class UserService {
  // Get all users
  async getUsers(): Promise<User[]> {
    return apiClient.get<User[]>('/users/');
  }

  // Create a new user
  async createUser(userData: CreateUserRequest): Promise<User> {
    return apiClient.post<User>('/users/', userData);
  }

  // Get a specific user by ID
  async getUser(userId: number): Promise<User> {
    return apiClient.get<User>(`/users/${userId}`);
  }

  // Update a specific user
  async updateUser(userId: number, userData: UpdateUserRequest): Promise<User> {
    return apiClient.put<User>(`/users/${userId}`, userData);
  }

  // Delete a specific user
  async deleteUser(userId: number): Promise<void> {
    return apiClient.delete<void>(`/users/${userId}`);
  }

  // Activate a user
  async activateUser(userId: number): Promise<User> {
    return apiClient.patch<User>(`/users/${userId}/activate`);
  }

  // Deactivate a user
  async deactivateUser(userId: number): Promise<User> {
    return apiClient.patch<User>(`/users/${userId}/deactivate`);
  }
}

// Create singleton instance
export const userService = new UserService();