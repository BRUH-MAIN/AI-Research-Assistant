import { apiClient } from './api';

// Create a specialized API client for the FastAPI backend RAG functionality  
const FASTAPI_URL = process.env.NEXT_PUBLIC_FASTAPI_URL || 'http://localhost:8000';

export interface RAGDocument {
  rag_document_id: number;
  paper_id: number;
  file_name: string;
  file_path: string;
  processing_status: 'pending' | 'processing' | 'completed' | 'failed';
  chunks_count: number;
  vector_store_ids?: string[];
  processing_error?: string;
  processed_at?: string;
  created_at: string;
}

export interface SessionRAGStatus {
  session_rag_id?: number;
  session_id: number;
  is_rag_enabled: boolean;
  total_papers: number;
  processed_papers: number;
  rag_enabled_at?: string;
  enabled_by?: number;
  enabled_by_name?: string;
}

export interface SessionPaperWithRAG {
  paper_id: number;
  title: string;
  abstract?: string;
  authors?: string;
  doi?: string;
  added_at: string;
  has_rag: boolean;
  rag_status: string;
  rag_file_name?: string;
  chunks_count?: number;
  processed_at?: string;
}

export interface RAGChatStats {
  total_messages: number;
  rag_messages: number;
  rag_usage_percentage: number;
  avg_chunks_retrieved: number;
  avg_processing_time_ms: number;
}

export interface RAGQuestionRequest {
  question: string;
  max_chunks?: number;
  search_type?: 'semantic' | 'hybrid';
  include_metadata?: boolean;
}

export interface RAGQuestionResponse {
  answer: string;
  sources: Array<{
    source: string;
    page?: number;
    section?: string;
    relevance_score?: number;
    content: string;
  }>;
  metadata?: {
    session_id: number;
    session_papers_used: number;
    total_session_papers: number;
    processing_time_ms: number;
    used_rag: boolean;
    model_used?: string;
    search_type?: string;
    chunks_retrieved?: number;
  };
}

export class RAGService {
  
  // =====================================================
  // EXPRESS DB OPERATIONS (RAG Metadata)
  // =====================================================

  // Create RAG document entry
  async createRAGDocument(paperId: number, fileName: string, filePath: string): Promise<RAGDocument> {
    return apiClient.post<RAGDocument>('/rag/documents', {
      paper_id: paperId,
      file_name: fileName,
      file_path: filePath
    });
  }

  // Update RAG document processing status
  async updateRAGDocumentStatus(
    paperId: number, 
    processingStatus: string,
    chunksCount?: number,
    vectorStoreIds?: string[],
    processingError?: string
  ): Promise<RAGDocument> {
    return apiClient.put<RAGDocument>(`/rag/documents/${paperId}/status`, {
      processing_status: processingStatus,
      chunks_count: chunksCount,
      vector_store_ids: vectorStoreIds,
      processing_error: processingError
    });
  }

  // Get RAG document by paper ID
  async getRAGDocument(paperId: number): Promise<RAGDocument> {
    return apiClient.get<RAGDocument>(`/rag/documents/${paperId}`);
  }

  // Get all RAG documents
  async getAllRAGDocuments(): Promise<RAGDocument[]> {
    return apiClient.get<RAGDocument[]>('/rag/documents');
  }

  // Enable RAG for session
  async enableSessionRAG(sessionId: number, enabledBy: number): Promise<SessionRAGStatus> {
    return apiClient.post<SessionRAGStatus>(`/rag/sessions/${sessionId}/enable`, {
      enabled_by: enabledBy
    });
  }

  // Disable RAG for session
  async disableSessionRAG(sessionId: number): Promise<SessionRAGStatus> {
    return apiClient.post<SessionRAGStatus>(`/rag/sessions/${sessionId}/disable`);
  }

  // Get session RAG status
  async getSessionRAGStatus(sessionId: number): Promise<SessionRAGStatus> {
    return apiClient.get<SessionRAGStatus>(`/rag/sessions/${sessionId}/status`);
  }

  // Get session papers with RAG status
  async getSessionPapersWithRAGStatus(sessionId: number): Promise<SessionPaperWithRAG[]> {
    return apiClient.get<SessionPaperWithRAG[]>(`/rag/sessions/${sessionId}/papers`);
  }

  // Record RAG chat metadata
  async createRAGChatMetadata(
    messageId: number,
    sessionId: number,
    usedRAG: boolean,
    sourcesUsed?: string[],
    chunksRetrieved?: number,
    processingTimeMs?: number,
    modelUsed?: string
  ): Promise<any> {
    return apiClient.post('/rag/chat/metadata', {
      message_id: messageId,
      session_id: sessionId,
      used_rag: usedRAG,
      sources_used: sourcesUsed,
      chunks_retrieved: chunksRetrieved,
      processing_time_ms: processingTimeMs,
      model_used: modelUsed
    });
  }

  // Get session RAG chat statistics
  async getSessionRAGChatStats(sessionId: number): Promise<RAGChatStats> {
    return apiClient.get<RAGChatStats>(`/rag/sessions/${sessionId}/chat-stats`);
  }

  // =====================================================
  // FASTAPI OPERATIONS (RAG Processing)
  // =====================================================

  // Upload paper to session (FastAPI)
  async uploadPaperToSession(
    sessionId: number,
    paperId: number,
    file: File
  ): Promise<any> {
    try {
      const formData = new FormData();
      formData.append('paper_id', paperId.toString());
      formData.append('file', file);

      const response = await fetch(`${FASTAPI_URL}/api/v1/session-rag/${sessionId}/papers/upload`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to upload paper:', error);
      throw error;
    }
  }

  // Process paper for RAG (FastAPI)
  async processPaperForRAG(sessionId: number, paperId: number): Promise<any> {
    try {
      const response = await fetch(`${FASTAPI_URL}/api/v1/session-rag/${sessionId}/papers/${paperId}/process`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to process paper:', error);
      throw error;
    }
  }

  // Remove paper from session (FastAPI)
  async removePaperFromSession(sessionId: number, paperId: number): Promise<any> {
    try {
      const response = await fetch(`${FASTAPI_URL}/api/v1/session-rag/${sessionId}/papers/${paperId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to remove paper:', error);
      throw error;
    }
  }

  // Enable RAG for session (FastAPI)
  async enableSessionRAGFastAPI(sessionId: number, enabledBy: number): Promise<any> {
    try {
      const formData = new FormData();
      formData.append('enabled_by', enabledBy.toString());

      const response = await fetch(`${FASTAPI_URL}/api/v1/session-rag/${sessionId}/enable`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to enable session RAG:', error);
      throw error;
    }
  }

  // Disable RAG for session (FastAPI)
  async disableSessionRAGFastAPI(sessionId: number): Promise<any> {
    try {
      const response = await fetch(`${FASTAPI_URL}/api/v1/session-rag/${sessionId}/disable`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to disable session RAG:', error);
      throw error;
    }
  }

  // Ask question using session RAG (FastAPI)
  async askSessionRAGQuestion(
    sessionId: number,
    request: RAGQuestionRequest
  ): Promise<RAGQuestionResponse> {
    try {
      const response = await fetch(`${FASTAPI_URL}/api/v1/session-rag/${sessionId}/ask`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to ask RAG question:', error);
      throw error;
    }
  }

  // Get session RAG status (FastAPI)
  async getSessionRAGStatusFastAPI(sessionId: number): Promise<any> {
    try {
      const response = await fetch(`${FASTAPI_URL}/api/v1/session-rag/${sessionId}/status`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to get session RAG status:', error);
      throw error;
    }
  }

  // Get session papers (FastAPI)
  async getSessionPapersFastAPI(sessionId: number): Promise<any> {
    try {
      const response = await fetch(`${FASTAPI_URL}/api/v1/session-rag/${sessionId}/papers`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to get session papers:', error);
      throw error;
    }
  }

  // =====================================================
  // NEW: AUTO-FETCH FUNCTIONALITY
  // =====================================================

  // Auto-fetch and process all papers with arXiv IDs in a session
  async autoFetchSessionPapers(sessionId: number): Promise<any> {
    try {
      const response = await fetch(`${FASTAPI_URL}/api/v1/session-rag/${sessionId}/papers/auto-fetch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to auto-fetch session papers:', error);
      throw error;
    }
  }

  // Fetch and process a specific paper from arXiv
  async fetchPaperFromArxiv(sessionId: number, paperId: number): Promise<any> {
    try {
      const response = await fetch(`${FASTAPI_URL}/api/v1/session-rag/${sessionId}/papers/${paperId}/fetch-from-arxiv`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to fetch paper from arXiv:', error);
      throw error;
    }
  }

  // =====================================================
  // COMBINED OPERATIONS (Orchestrate Express + FastAPI)
  // =====================================================

  // Complete workflow: Add paper to session and optionally process it
  async addPaperToSessionComplete(
    sessionId: number,
    paperId: number,
    file: File,
    processImmediately: boolean = false
  ): Promise<{
    upload_result: any;
    process_result?: any;
    metadata_result?: any;
  }> {
    try {
      // Step 1: Upload to FastAPI (this also creates Express metadata)
      const uploadResult = await this.uploadPaperToSession(sessionId, paperId, file);

      const result: any = {
        upload_result: uploadResult
      };

      // Step 2: Optionally process immediately
      if (processImmediately) {
        const processResult = await this.processPaperForRAG(sessionId, paperId);
        result.process_result = processResult;
      }

      return result;
    } catch (error) {
      console.error('Failed to add paper to session:', error);
      throw error;
    }
  }

  // Get comprehensive session RAG overview
  async getSessionRAGOverview(sessionId: number): Promise<{
    express_status: SessionRAGStatus;
    fastapi_status: any;
    papers: SessionPaperWithRAG[];
    chat_stats: RAGChatStats;
  }> {
    try {
      const [expressStatus, fastapiStatus, papers, chatStats] = await Promise.all([
        this.getSessionRAGStatus(sessionId),
        this.getSessionRAGStatusFastAPI(sessionId),
        this.getSessionPapersWithRAGStatus(sessionId),
        this.getSessionRAGChatStats(sessionId)
      ]);

      return {
        express_status: expressStatus,
        fastapi_status: fastapiStatus,
        papers: papers,
        chat_stats: chatStats
      };
    } catch (error) {
      console.error('Failed to get session RAG overview:', error);
      throw error;
    }
  }

  // Health check for RAG services
  async healthCheck(): Promise<{
    express_healthy: boolean;
    fastapi_healthy: boolean;
    overall_healthy: boolean;
  }> {
    try {
      const [expressHealthy, fastapiHealthy] = await Promise.all([
        // Express health check
        apiClient.get('/health').then(() => true).catch(() => false),
        
        // FastAPI health check
        fetch(`${FASTAPI_URL}/health`)
          .then(res => res.ok)
          .catch(() => false)
      ]);

      return {
        express_healthy: expressHealthy,
        fastapi_healthy: fastapiHealthy,
        overall_healthy: expressHealthy && fastapiHealthy
      };
    } catch (error) {
      console.error('Health check failed:', error);
      return {
        express_healthy: false,
        fastapi_healthy: false,
        overall_healthy: false
      };
    }
  }
}

// Create singleton instance
export const ragService = new RAGService();