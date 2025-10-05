import { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import { groupChatService } from '../services/groupChatService';
import type { 
  GroupChatMessage, 
  GroupChatSession, 
  OnlineUser,
  SendGroupChatMessageRequest 
} from '../types/groupChat';

// Supabase configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

interface UseGroupChatProps {
  groupId: number;
  userId: number;
  sessionId?: number;
}

export const useGroupChat = ({ groupId, userId, sessionId }: UseGroupChatProps) => {
  // State management
  const [sessions, setSessions] = useState<GroupChatSession[]>([]);
  const [messages, setMessages] = useState<GroupChatMessage[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [currentSession, setCurrentSession] = useState<number | null>(sessionId || null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const [canInvokeAI, setCanInvokeAI] = useState(false);

  // Refs for cleanup
  const channelRef = useRef<any>(null);
  const presenceChannelRef = useRef<any>(null);

  // Load sessions for the group
  const loadSessions = useCallback(async () => {
    try {
      setLoading(true);
      const groupSessions = await groupChatService.getGroupChatSessions(groupId);
      setSessions(groupSessions);
    } catch (err) {
      setError('Failed to load chat sessions');
      console.error('Error loading sessions:', err);
    } finally {
      setLoading(false);
    }
  }, [groupId]);

  // Load messages for current session
  const loadMessages = useCallback(async (sessionId: number) => {
    try {
      setLoading(true);
      const sessionMessages = await groupChatService.getGroupChatMessages(sessionId);
      setMessages(sessionMessages);
    } catch (err) {
      setError('Failed to load messages');
      console.error('Error loading messages:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load online users for current session
  const loadOnlineUsers = useCallback(async (sessionId: number) => {
    try {
      const users = await groupChatService.getOnlineUsers(sessionId);
      setOnlineUsers(users);
    } catch (err) {
      console.error('Error loading online users:', err);
    }
  }, []);

  // Check AI invocation permissions
  const checkAIPermissions = useCallback(async (sessionId: number) => {
    try {
      const result = await groupChatService.canUserInvokeAI(sessionId, userId);
      setCanInvokeAI(result.can_invoke_ai);
    } catch (err) {
      console.error('Error checking AI permissions:', err);
      setCanInvokeAI(false);
    }
  }, [userId]);

  // Create a new chat session
  const createSession = useCallback(async (title?: string, description?: string) => {
    try {
      setLoading(true);
      const newSession = await groupChatService.createGroupChatSession(groupId, {
        title: title || 'New Chat Session',
        description: description || '',
        created_by: userId
      });
      
      // Reload sessions to get updated list
      await loadSessions();
      
      // Set as current session
      setCurrentSession(newSession.session_id);
      
      return newSession;
    } catch (err) {
      setError('Failed to create session');
      console.error('Error creating session:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [groupId, userId, loadSessions]);

  // Join a chat session
  const joinSession = useCallback(async (sessionId: number) => {
    try {
      setLoading(true);
      await groupChatService.joinGroupChatSession(sessionId, userId);
      setCurrentSession(sessionId);
      
      // Update presence to online
      await groupChatService.updateUserPresence(sessionId, userId, 'online');
      
      // Load session data
      await Promise.all([
        loadMessages(sessionId),
        loadOnlineUsers(sessionId),
        checkAIPermissions(sessionId)
      ]);
      
    } catch (err) {
      setError('Failed to join session');
      console.error('Error joining session:', err);
    } finally {
      setLoading(false);
    }
  }, [userId, loadMessages, loadOnlineUsers, checkAIPermissions]);

  // Send a message
  const sendMessage = useCallback(async (content: string, messageType: 'user' | 'ai' | 'system' = 'user') => {
    if (!currentSession || !content.trim()) return;

    try {
      const messageData: SendGroupChatMessageRequest = {
        user_id: userId,
        content: content.trim(),
        message_type: messageType,
        metadata: {}
      };

      const newMessage = await groupChatService.sendGroupChatMessage(currentSession, messageData);
      
      // Optimistically add message to local state (will be replaced by real-time update)
      setMessages(prev => [...prev, newMessage]);
      
      return newMessage;
    } catch (err) {
      setError('Failed to send message');
      console.error('Error sending message:', err);
      throw err;
    }
  }, [currentSession, userId]);

  // Update user presence
  const updatePresence = useCallback(async (status: 'online' | 'away' | 'offline') => {
    if (!currentSession) return;

    try {
      await groupChatService.updateUserPresence(currentSession, userId, status);
    } catch (err) {
      console.error('Error updating presence:', err);
    }
  }, [currentSession, userId]);

  // Set up real-time subscriptions for messages
  useEffect(() => {
    if (!currentSession) return;

    const channel = supabase
      .channel(`group-chat-${currentSession}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `session_id=eq.${currentSession}`
      }, async (payload) => {
        console.log('New message received:', payload.new);
        
        try {
          // Re-fetch messages to get the properly formatted message with sender info
          const updatedMessages = await groupChatService.getGroupChatMessages(currentSession, 1, 0);
          if (updatedMessages.length > 0) {
            const newMessage = updatedMessages[0];
            
            setMessages(prev => {
              // Avoid duplicates by checking if message already exists
              const exists = prev.some(msg => msg.message_id === newMessage.message_id);
              if (exists) return prev;
              
              return [...prev, newMessage];
            });
          }
        } catch (error) {
          console.error('Error fetching new message details:', error);
          
          // Fallback to basic message structure
          const newMessage: GroupChatMessage = {
            message_id: payload.new.message_id,
            session_id: payload.new.session_id,
            sender_id: payload.new.sender_id,
            sender_name: 'Unknown User',
            sender_user_id: 0,
            content: payload.new.content,
            message_type: payload.new.message_type || 'user',
            metadata: payload.new.metadata || {},
            sent_at: payload.new.sent_at,
            edited_at: payload.new.edited_at,
            reply_to: payload.new.reply_to
          };

          setMessages(prev => {
            const exists = prev.some(msg => msg.message_id === newMessage.message_id);
            if (exists) return prev;
            
            return [...prev, newMessage];
          });
        }
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'messages',
        filter: `session_id=eq.${currentSession}`
      }, (payload) => {
        console.log('Message updated:', payload.new);
        
        setMessages(prev => prev.map(msg => 
          msg.message_id === payload.new.message_id 
            ? { ...msg, ...payload.new }
            : msg
        ));
      })
      .on('postgres_changes', {
        event: 'DELETE',
        schema: 'public',
        table: 'messages',
        filter: `session_id=eq.${currentSession}`
      }, (payload) => {
        console.log('Message deleted:', payload.old);
        
        setMessages(prev => prev.filter(msg => msg.message_id !== payload.old.message_id));
      })
      .subscribe((status) => {
        console.log('Message subscription status:', status);
        setConnected(status === 'SUBSCRIBED');
      });

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [currentSession]);

  // Set up real-time subscriptions for user presence
  useEffect(() => {
    if (!currentSession) return;

    const presenceChannel = supabase
      .channel(`presence-${currentSession}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'user_presence',
        filter: `session_id=eq.${currentSession}`
      }, (payload) => {
        console.log('Presence update:', payload);
        
        // Reload online users when presence changes
        loadOnlineUsers(currentSession);
      })
      .subscribe();

    presenceChannelRef.current = presenceChannel;

    return () => {
      if (presenceChannelRef.current) {
        supabase.removeChannel(presenceChannelRef.current);
      }
    };
  }, [currentSession, loadOnlineUsers]);

  // Initial data loading
  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  // Load session data when currentSession changes
  useEffect(() => {
    if (currentSession) {
      Promise.all([
        loadMessages(currentSession),
        loadOnlineUsers(currentSession),
        checkAIPermissions(currentSession)
      ]);
    }
  }, [currentSession, loadMessages, loadOnlineUsers, checkAIPermissions]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
      if (presenceChannelRef.current) {
        supabase.removeChannel(presenceChannelRef.current);
      }
      
      // Set presence to offline when leaving
      if (currentSession) {
        updatePresence('offline');
      }
    };
  }, [currentSession, updatePresence]);

  return {
    // State
    sessions,
    messages,
    onlineUsers,
    currentSession,
    loading,
    error,
    connected,
    canInvokeAI,

    // Actions
    createSession,
    joinSession,
    sendMessage,
    updatePresence,
    setCurrentSession,

    // Utilities
    clearError: () => setError(null)
  };
};
