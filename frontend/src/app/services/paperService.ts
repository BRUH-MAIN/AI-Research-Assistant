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

  // Link a paper to a session with automatic RAG processing
  async linkPaperToSessionWithRAG(sessionId: number, paperId: number): Promise<{
    linkResult: void;
    ragResult?: any;
  }> {
    try {
      // First, link the paper to the session
      const linkResult = await this.linkPaperToSession(sessionId, paperId);

      // Import RAG service here to avoid circular dependencies
      const { ragService } = await import('./ragService');

      // Check if RAG is enabled for this session
      const ragStatus = await ragService.getSessionRAGStatus(sessionId);
      
      if (ragStatus.is_rag_enabled) {
        try {
          // Attempt to auto-fetch and process the paper
          const ragResult = await ragService.fetchPaperFromArxiv(sessionId, paperId);
          
          return {
            linkResult,
            ragResult
          };
        } catch (ragError: any) {
          console.warn('Failed to auto-process paper for RAG:', ragError);
          
          // Check if it's specifically the "no arXiv ID" error
          const errorMessage = ragError?.message || '';
          if (errorMessage.includes('No arXiv ID') || errorMessage.includes('PDF URL')) {
            return {
              linkResult,
              ragResult: { 
                success: false, 
                reason: 'no_arxiv_id',
                error: 'Paper has no arXiv ID or PDF URL for auto-processing' 
              }
            };
          }
          
          // Other processing errors
          return {
            linkResult,
            ragResult: { 
              success: false,
              reason: 'processing_error', 
              error: errorMessage
            }
          };
        }
      }

      return { 
        linkResult,
        ragResult: {
          success: false,
          reason: 'rag_disabled',
          error: 'RAG is not enabled for this session'
        }
      };
    } catch (error) {
      console.error('Failed to link paper to session:', error);
      throw error;
    }
  }

  // Remove paper from session
  async removePaperFromSession(sessionId: number, paperId: number): Promise<void> {
    return apiClient.delete<void>(`/papers/sessions/${sessionId}/${paperId}`);
  }
}

// Create singleton instance
export const paperService = new PaperService();