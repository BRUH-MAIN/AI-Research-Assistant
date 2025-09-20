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
  status: 'active' | 'completed' | 'paused';
}

export interface CreateSessionRequest {
  title: string;
  description?: string;
  created_by: number;
  group_id?: number;
  status?: 'active' | 'completed' | 'paused';
}

export interface UpdateSessionRequest {
  title?: string;
  description?: string;
  status?: 'active' | 'completed' | 'paused';
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