import { apiClient } from './api';
import type { 
  Paper, 
  CreatePaperRequest, 
  UpdatePaperRequest,
  PaperSearchParams,
  AddPaperTagsRequest
} from '../types/types';

export class PaperService {
  // Get all papers
  async getPapers(): Promise<Paper[]> {
    return apiClient.get<Paper[]>('/papers/');
  }

  // Create a new paper
  async createPaper(paperData: CreatePaperRequest): Promise<Paper> {
    return apiClient.post<Paper>('/papers/', paperData);
  }

  // Get a specific paper by ID
  async getPaper(paperId: number): Promise<Paper> {
    return apiClient.get<Paper>(`/papers/${paperId}`);
  }

  // Update a specific paper
  async updatePaper(paperId: number, paperData: UpdatePaperRequest): Promise<Paper> {
    return apiClient.put<Paper>(`/papers/${paperId}`, paperData);
  }

  // Delete a specific paper
  async deletePaper(paperId: number): Promise<void> {
    return apiClient.delete<void>(`/papers/${paperId}`);
  }

  // Search papers by title, abstract, or authors
  async searchPapers(searchParams: PaperSearchParams): Promise<Paper[]> {
    return apiClient.get<Paper[]>('/papers/search', searchParams);
  }

  // Get tags for a specific paper
  async getPaperTags(paperId: number): Promise<string[]> {
    return apiClient.get<string[]>(`/papers/${paperId}/tags`);
  }

  // Add tags to a specific paper
  async addPaperTags(paperId: number, tagsData: AddPaperTagsRequest): Promise<void> {
    return apiClient.post<void>(`/papers/${paperId}/tags`, tagsData);
  }

  // Remove a specific tag from a paper
  async removePaperTag(paperId: number, tag: string): Promise<void> {
    return apiClient.delete<void>(`/papers/${paperId}/tags/${encodeURIComponent(tag)}`);
  }

  // Get papers linked to a specific session
  async getSessionPapers(sessionId: number): Promise<Paper[]> {
    return apiClient.get<Paper[]>(`/papers/sessions/${sessionId}`);
  }

  // Link a paper to a session
  async linkPaperToSession(sessionId: number, paperId: number): Promise<void> {
    return apiClient.post<void>(`/papers/sessions/${sessionId}/${paperId}`);
  }

  // Remove paper from session
  async removePaperFromSession(sessionId: number, paperId: number): Promise<void> {
    return apiClient.delete<void>(`/papers/sessions/${sessionId}/${paperId}`);
  }
}

// Create singleton instance
export const paperService = new PaperService();