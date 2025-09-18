import { apiClient } from './api';
import type { 
  AiMetadata, 
  CreateAiMetadataRequest, 
  UpdateAiMetadataRequest
} from '../types/types';

export class AiMetadataService {
  // Get AI metadata for a specific message
  async getMessageAiMetadata(messageId: number): Promise<AiMetadata[]> {
    return apiClient.get<AiMetadata[]>(`/messages/${messageId}/ai-metadata`);
  }

  // Create AI metadata for a specific message
  async createMessageAiMetadata(messageId: number, metadataData: CreateAiMetadataRequest): Promise<AiMetadata> {
    return apiClient.post<AiMetadata>(`/messages/${messageId}/ai-metadata`, metadataData);
  }

  // Get AI metadata for a specific paper
  async getPaperAiMetadata(paperId: number): Promise<AiMetadata[]> {
    return apiClient.get<AiMetadata[]>(`/papers/${paperId}/ai-metadata`);
  }

  // Get all AI metadata for messages in a specific session
  async getSessionAiMetadata(sessionId: number): Promise<AiMetadata[]> {
    return apiClient.get<AiMetadata[]>(`/sessions/${sessionId}/ai-metadata`);
  }

  // Get a specific AI metadata entry by ID
  async getAiMetadata(metadataId: number): Promise<AiMetadata> {
    return apiClient.get<AiMetadata>(`/ai-metadata/${metadataId}`);
  }

  // Update a specific AI metadata entry
  async updateAiMetadata(metadataId: number, metadataData: UpdateAiMetadataRequest): Promise<AiMetadata> {
    return apiClient.put<AiMetadata>(`/ai-metadata/${metadataId}`, metadataData);
  }

  // Delete a specific AI metadata entry
  async deleteAiMetadata(metadataId: number): Promise<void> {
    return apiClient.delete<void>(`/ai-metadata/${metadataId}`);
  }
}

// Create singleton instance
export const aiMetadataService = new AiMetadataService();