// Base types for chat UI (keeping existing)
export type Message = {
  id: string
  sender: 'user' | 'ai'
  content: string
}

export type MessageBlock = {
  id: string
  userMessage: string
  aiResponse: string
  timestamp: Date
  isLoading?: boolean
}

// API Entity Types
export interface User {
  id: number;
  username: string;
  email: string;
  full_name?: string;
  created_at: string;
  is_active: boolean;
}

export interface CreateUserRequest {
  username: string;
  email: string;
  full_name?: string;
  password?: string;
}

export interface UpdateUserRequest {
  username?: string;
  email?: string;
  full_name?: string;
  is_active?: boolean;
}

export interface Group {
  id: number;
  group_id?: number;  // For backward compatibility
  name: string;
  description?: string;
  invite_code?: string;
  is_public?: boolean;
  created_by: number;
  created_at: string;
  updated_at?: string;
  member_count?: number;
  user_role?: string;
  creator_name?: string;
}

export interface CreateGroupRequest {
  name: string;
  description?: string;
  created_by: number;
}

export interface UpdateGroupRequest {
  name?: string;
  description?: string;
}

export interface GroupMember {
  user_id: number;
  first_name: string;
  last_name: string;
  email: string;
  role: string;
  joined_at: string;
  availability?: string;
}

export interface AddGroupMemberRequest {
  user_id: number;
}

export interface Session {
  id: number;
  title: string;
  description?: string;
  created_by: number;
  group_id?: number;
  created_at: string;
  started_at?: string;
  ended_at?: string;
  status: 'offline' | 'active' | 'completed';
  participant_count?: number;
}

export interface SessionParticipant {
  user_id: number;
  session_id: number;
  joined_at: string;
  user: {
    user_id: number;
    email: string;
    first_name: string | null;
    last_name: string | null;
    availability: 'available' | 'busy' | 'offline';
  };
}

export interface SessionWithParticipants extends Session {
  participants: SessionParticipant[];
  current_user_joined?: boolean;
  can_close?: boolean;
}

export interface CreateSessionRequest {
  title: string;
  description?: string;
  created_by: number;
  group_id?: number;
  status?: 'offline' | 'active' | 'completed';
}

export interface UpdateSessionRequest {
  title?: string;
  description?: string;
  status?: 'offline' | 'active' | 'completed';
}

export interface ChatMessage {
  id: number;
  session_id: number;
  user_id: number;
  content: string;
  message_type: 'user' | 'ai' | 'system';
  created_at: string;
  updated_at?: string;
}

export interface CreateMessageRequest {
  session_id: number;
  user_id: number;
  content: string;
  message_type: 'user' | 'ai' | 'system';
}

export interface UpdateMessageRequest {
  content?: string;
  message_type?: 'user' | 'ai' | 'system';
}

export interface Paper {
  id: number;
  title: string;
  abstract?: string;
  authors?: string;
  doi?: string;
  source_url?: string;
  created_at: string;
  tags?: string[];
}

export interface CreatePaperRequest {
  title: string;
  abstract?: string;
  authors?: string;
  doi?: string;
  source_url?: string;
}

export interface UpdatePaperRequest {
  title?: string;
  abstract?: string;
  authors?: string;
  doi?: string;
  source_url?: string;
}

export interface PaperSearchParams {
  query: string;
  limit?: number;
}

export interface AddPaperTagsRequest {
  tags: string[];
}

export interface Feedback {
  id: number;
  session_id: number;
  given_by: number;
  content: string;
  created_at: string;
}

export interface CreateFeedbackRequest {
  given_by: number;
  content: string;
}

export interface UpdateFeedbackRequest {
  content?: string;
}

export interface AiMetadata {
  id: number;
  message_id?: number;
  paper_id?: number;
  page_no?: number;
  ai_model?: string;
  confidence_score?: number;
  metadata?: Record<string, any>;
  created_at: string;
}

export interface CreateAiMetadataRequest {
  message_id?: number;
  paper_id?: number;
  page_no?: number;
  ai_model?: string;
  confidence_score?: number;
  metadata?: Record<string, any>;
}

export interface UpdateAiMetadataRequest {
  page_no?: number;
  ai_model?: string;
  confidence_score?: number;
  metadata?: Record<string, any>;
}

// Profile types (for Supabase integration)
export interface UserProfile {
  user_id: number;
  auth_user_id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  profile_picture_url?: string;
  bio?: string;
  phone_number?: string;
  availability: 'available' | 'busy' | 'offline';
  created_at: string;
  updated_at?: string;
}

export interface ProfileUpdateData {
  first_name?: string;
  last_name?: string;
  bio?: string;
  phone_number?: string;
  availability?: 'available' | 'busy' | 'offline';
}

// =====================================================
// RAG INTEGRATION TYPES
// =====================================================

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
  updated_at?: string;
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
  rag_status: 'not_processed' | 'pending' | 'processing' | 'completed' | 'failed';
  rag_file_name?: string;
  chunks_count?: number;
  processed_at?: string;
}

export interface RAGChatMetadata {
  rag_chat_id: number;
  message_id: number;
  session_id: number;
  used_rag: boolean;
  sources_used?: string[];
  chunks_retrieved?: number;
  processing_time_ms?: number;
  model_used?: string;
  created_at: string;
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

export interface RAGSource {
  source: string;
  page?: number;
  section?: string;
  relevance_score?: number;
  content: string;
  paper_id?: number;
  paper_title?: string;
}

export interface RAGQuestionResponse {
  answer: string;
  sources: RAGSource[];
  metadata?: {
    session_id?: number;
    session_papers_used?: number;
    total_session_papers?: number;
    processing_time_ms?: number;
    used_rag?: boolean;
    model_used?: string;
    search_type?: string;
    chunks_retrieved?: number;
    total_tokens?: number;
    question_type?: string;
  };
  success?: boolean;
  error?: string;
}

export interface RAGPaperUploadResult {
  success: boolean;
  message: string;
  paper_id: number;
  file_name: string;
  file_path: string;
  file_size: number;
  rag_document: RAGDocument;
  status: 'uploaded_not_processed' | 'uploaded_and_processing' | 'error';
}

export interface RAGProcessingResult {
  success: boolean;
  message: string;
  paper_id: number;
  processing_time_ms: number;
  chunks_count: number;
  vector_ids_count: number;
  status: 'completed' | 'failed' | 'already_completed';
  rag_result?: any;
  error?: string;
}

export interface SessionRAGOverview {
  express_status: SessionRAGStatus;
  fastapi_status: any;
  papers: SessionPaperWithRAG[];
  chat_stats: RAGChatStats;
  health_status?: {
    express_healthy: boolean;
    fastapi_healthy: boolean;
    overall_healthy: boolean;
  };
}