"use client";

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';
import { 
  ArrowLeftIcon,
  ChatBubbleLeftRightIcon,
  UserGroupIcon,
  Cog6ToothIcon 
} from '@heroicons/react/24/outline';

import { groupService } from '../../../services/groupService';
import { authService } from '../../../services/authService';
import GroupChatWindow from '../../../components/groupChat/GroupChatWindow';
import SessionSelector from '../../../components/groupChat/SessionSelector';
import { useGroupChat } from '../../../hooks/useGroupChat';
import type { Group } from '../../../types/types';
import type { CreateGroupChatSessionRequest } from '../../../types/groupChat';

// Supabase Configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

interface User {
  id: string;
  email?: string;
}

const GroupChatPage: React.FC = () => {
  const router = useRouter();
  const params = useParams();
  const groupId = parseInt(params.id as string);

  const [user, setUser] = useState<User | null>(null);
  const [group, setGroup] = useState<Group | null>(null);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Chat state
  const [selectedSessionId, setSelectedSessionId] = useState<number | null>(null);
  const [showSessionSelector, setShowSessionSelector] = useState(true);

  // Group chat hook
  const {
    sessions,
    createSession,
    joinSession,
    loading: chatLoading,
    error: chatError
  } = useGroupChat({ 
    groupId, 
    userId: currentUserId || 0, 
    sessionId: selectedSessionId || undefined 
  });

  // Check authentication
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          router.push('/login');
          return;
        }
        setUser(user);
        
        // Get internal user ID
        const internalUserId = authService.getCurrentInternalUserId();
        setCurrentUserId(internalUserId);
      } catch (error) {
        console.error('Auth check failed:', error);
        router.push('/login');
      }
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!session?.user) {
          router.push('/login');
        } else {
          setUser(session.user);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [router]);

  // Load group data
  useEffect(() => {
    const loadGroup = async () => {
      if (!groupId || isNaN(groupId)) {
        setError('Invalid group ID');
        return;
      }

      try {
        setLoading(true);
        const groupData = await groupService.getGroup(groupId);
        setGroup(groupData);
      } catch (err) {
        console.error('Failed to load group:', err);
        setError('Failed to load group data');
      } finally {
        setLoading(false);
      }
    };

    if (currentUserId) {
      loadGroup();
    }
  }, [groupId, currentUserId]);

  const handleSelectSession = async (sessionId: number) => {
    try {
      if (currentUserId) {
        await joinSession(sessionId);
        setSelectedSessionId(sessionId);
        setShowSessionSelector(false);
      }
    } catch (error) {
      console.error('Failed to join session:', error);
    }
  };

  const handleCreateSession = async (data: CreateGroupChatSessionRequest) => {
    try {
      if (currentUserId) {
        const newSession = await createSession(data.title, data.description);
        if (newSession) {
          setSelectedSessionId(newSession.session_id);
          setShowSessionSelector(false);
        }
      }
    } catch (error) {
      console.error('Failed to create session:', error);
      throw error;
    }
  };

  const handleBackToSessions = () => {
    setSelectedSessionId(null);
    setShowSessionSelector(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-500 border-t-transparent mx-auto mb-4" />
          <p className="text-gray-400">Loading group chat...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <div className="rounded-full bg-red-500/20 p-3 mx-auto mb-4 w-fit">
            <ChatBubbleLeftRightIcon className="h-6 w-6 text-red-400" />
          </div>
          <h2 className="text-xl font-semibold text-white mb-2">Error</h2>
          <p className="text-gray-400 mb-4">{error}</p>
          <Link
            href="/groups"
            className="inline-flex items-center space-x-2 rounded-lg bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700"
          >
            <ArrowLeftIcon className="h-4 w-4" />
            <span>Back to Groups</span>
          </Link>
        </div>
      </div>
    );
  }

  if (!group || !currentUserId) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950">
      {/* Header */}
      <div className="border-b border-gray-800 bg-gray-900">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link
                href={`/groups/${groupId}`}
                className="flex items-center space-x-2 text-gray-400 transition-colors hover:text-white"
              >
                <ArrowLeftIcon className="h-5 w-5" />
                <span>Back to Group</span>
              </Link>
              
              <div className="h-6 w-px bg-gray-700" />
              
              <div className="flex items-center space-x-3">
                <div className="rounded-lg bg-blue-500/20 p-2">
                  <ChatBubbleLeftRightIcon className="h-6 w-6 text-blue-400" />
                </div>
                <div>
                  <h1 className="text-xl font-semibold text-white">{group.name}</h1>
                  <p className="text-sm text-gray-400">Group Chat</p>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              {selectedSessionId && (
                <button
                  onClick={handleBackToSessions}
                  className="flex items-center space-x-2 rounded-lg bg-gray-700 px-3 py-2 text-sm text-gray-300 transition-colors hover:bg-gray-600 hover:text-white"
                >
                  <UserGroupIcon className="h-4 w-4" />
                  <span>Sessions</span>
                </button>
              )}
              
              <Link
                href={`/groups/${groupId}/settings`}
                className="rounded-lg bg-gray-700 p-2 text-gray-300 transition-colors hover:bg-gray-600 hover:text-white"
              >
                <Cog6ToothIcon className="h-5 w-5" />
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Chat Area */}
      <div className="h-[calc(100vh-80px)]">
        {showSessionSelector || !selectedSessionId ? (
          <SessionSelector
            sessions={sessions}
            currentSessionId={selectedSessionId}
            onSelectSession={handleSelectSession}
            onCreateSession={handleCreateSession}
            currentUserId={currentUserId}
            loading={chatLoading}
          />
        ) : (
          <GroupChatWindow
            groupId={groupId}
            userId={currentUserId}
            sessionId={selectedSessionId}
            onClose={handleBackToSessions}
          />
        )}
      </div>

      {/* Error Display */}
      {chatError && (
        <div className="fixed bottom-4 right-4 max-w-md rounded-lg bg-red-500/20 border border-red-500/30 p-4 text-red-400">
          <p className="font-medium">Chat Error</p>
          <p className="text-sm mt-1">{chatError}</p>
        </div>
      )}
    </div>
  );
};

export default GroupChatPage;
