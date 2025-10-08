// Group Chat Types
export interface GroupChatMessage {
  message_id: number;
  session_id: number;
  sender_id: number;
  sender_name: string;
  sender_user_id: number;
  content: string;
  message_type: 'user' | 'ai' | 'system';
  metadata: Record<string, any>;
  sent_at: string;
  edited_at?: string;
  reply_to?: number;
}

export interface GroupChatSession {
  session_id: number;
  title: string;
  description: string;
  status: string;
  created_by: number;
  creator_name: string;
  participant_count: number;
  last_message_at?: string;
  last_message_content?: string;
  created_at: string;
}

export interface OnlineUser {
  user_id: number;
  username: string;
  status: 'online' | 'away' | 'offline';
  last_seen: string;
}

export interface CreateGroupChatSessionRequest {
  title?: string;
  description?: string;
  created_by: number;
}

export interface SendGroupChatMessageRequest {
  user_id: number;
  content: string;
  message_type?: 'user' | 'ai' | 'system';
  metadata?: Record<string, any>;
}
