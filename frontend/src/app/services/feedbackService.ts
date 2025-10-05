import { apiClient } from './api';
import type { 
  Feedback, 
  CreateFeedbackRequest, 
  UpdateFeedbackRequest
} from '../types/types';

export class FeedbackService {
  // Get all feedback for a specific session
  async getSessionFeedback(sessionId: number): Promise<Feedback[]> {
    return apiClient.get<Feedback[]>(`/sessions/${sessionId}/feedback`);
  }

  // Create feedback for a specific session
  async createSessionFeedback(sessionId: number, feedbackData: CreateFeedbackRequest): Promise<Feedback> {
    return apiClient.post<Feedback>(`/sessions/${sessionId}/feedback`, feedbackData);
  }

  // Get a specific feedback by ID
  async getFeedback(feedbackId: number): Promise<Feedback> {
    return apiClient.get<Feedback>(`/feedback/${feedbackId}`);
  }

  // Update a specific feedback
  async updateFeedback(feedbackId: number, feedbackData: UpdateFeedbackRequest): Promise<Feedback> {
    return apiClient.put<Feedback>(`/feedback/${feedbackId}`, feedbackData);
  }

  // Delete a specific feedback
  async deleteFeedback(feedbackId: number): Promise<void> {
    return apiClient.delete<void>(`/feedback/${feedbackId}`);
  }

  // Get all feedback given by a specific user
  async getUserFeedback(userId: number): Promise<Feedback[]> {
    return apiClient.get<Feedback[]>(`/users/${userId}/feedback`);
  }
}

// Create singleton instance
export const feedbackService = new FeedbackService();