import React, { useState } from 'react';
import type { GroupChatSession, CreateGroupChatSessionRequest } from '../../types/groupChat';
import { 
  ChatBubbleLeftRightIcon,
  PlusIcon,
  UserGroupIcon,
  ClockIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';

interface SessionSelectorProps {
  sessions: GroupChatSession[];
  currentSessionId?: number | null;
  onSelectSession: (sessionId: number) => void;
  onCreateSession: (data: CreateGroupChatSessionRequest) => Promise<void>;
  currentUserId: number;
  loading?: boolean;
}

const SessionSelector: React.FC<SessionSelectorProps> = ({
  sessions,
  currentSessionId,
  onSelectSession,
  onCreateSession,
  currentUserId,
  loading = false
}) => {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newSessionTitle, setNewSessionTitle] = useState('');
  const [newSessionDescription, setNewSessionDescription] = useState('');
  const [creating, setCreating] = useState(false);

  const handleCreateSession = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newSessionTitle.trim()) return;

    try {
      setCreating(true);
      await onCreateSession({
        title: newSessionTitle.trim(),
        description: newSessionDescription.trim(),
        created_by: currentUserId
      });
      
      // Reset form
      setNewSessionTitle('');
      setNewSessionDescription('');
      setShowCreateForm(false);
    } catch (error) {
      console.error('Failed to create session:', error);
    } finally {
      setCreating(false);
    }
  };

  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const formatLastMessage = (content?: string) => {
    if (!content) return 'No messages yet';
    return content.length > 50 ? content.substring(0, 50) + '...' : content;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-500 border-t-transparent mx-auto mb-4" />
          <p className="text-gray-400">Loading sessions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-900 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <ChatBubbleLeftRightIcon className="h-6 w-6 text-blue-400" />
          <h2 className="text-xl font-semibold text-white">Chat Sessions</h2>
        </div>
        
        <button
          onClick={() => setShowCreateForm(true)}
          className="flex items-center space-x-2 rounded-lg bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700"
        >
          <PlusIcon className="h-4 w-4" />
          <span>New Session</span>
        </button>
      </div>

      {/* Create session form */}
      {showCreateForm && (
        <div className="mb-6 rounded-lg border border-gray-700 bg-gray-800 p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-white">Create New Session</h3>
            <button
              onClick={() => setShowCreateForm(false)}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>
          
          <form onSubmit={handleCreateSession} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Session Title *
              </label>
              <input
                type="text"
                value={newSessionTitle}
                onChange={(e) => setNewSessionTitle(e.target.value)}
                placeholder="Enter session title..."
                className="w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Description (Optional)
              </label>
              <textarea
                value={newSessionDescription}
                onChange={(e) => setNewSessionDescription(e.target.value)}
                placeholder="Enter session description..."
                rows={3}
                className="w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            
            <div className="flex space-x-3">
              <button
                type="submit"
                disabled={!newSessionTitle.trim() || creating}
                className="flex-1 rounded-lg bg-blue-600 py-2 text-white transition-colors hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {creating ? 'Creating...' : 'Create Session'}
              </button>
              <button
                type="button"
                onClick={() => setShowCreateForm(false)}
                className="flex-1 rounded-lg border border-gray-600 py-2 text-gray-300 transition-colors hover:bg-gray-700"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Sessions list */}
      <div className="space-y-3">
        {sessions.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <ChatBubbleLeftRightIcon className="h-16 w-16 mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-medium mb-2">No chat sessions yet</h3>
            <p className="mb-4">Create a new session to start chatting with your group</p>
            <button
              onClick={() => setShowCreateForm(true)}
              className="inline-flex items-center space-x-2 rounded-lg bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700"
            >
              <PlusIcon className="h-4 w-4" />
              <span>Create First Session</span>
            </button>
          </div>
        ) : (
          sessions.map((session) => (
            <div
              key={session.session_id}
              onClick={() => onSelectSession(session.session_id)}
              className={`cursor-pointer rounded-lg border p-4 transition-all hover:border-blue-500 ${
                currentSessionId === session.session_id
                  ? 'border-blue-500 bg-blue-500/10'
                  : 'border-gray-700 bg-gray-800 hover:bg-gray-750'
              }`}
            >
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-medium text-white">{session.title}</h3>
                <span className="text-xs text-gray-400">
                  #{session.session_id}
                </span>
              </div>
              
              {session.description && (
                <p className="text-sm text-gray-400 mb-3">{session.description}</p>
              )}
              
              <div className="flex items-center justify-between text-xs text-gray-500">
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-1">
                    <UserGroupIcon className="h-3 w-3" />
                    <span>{session.participant_count} participants</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <span>by {session.creator_name}</span>
                  </div>
                </div>
                
                <div className="flex items-center space-x-1">
                  <ClockIcon className="h-3 w-3" />
                  <span>
                    {session.last_message_at 
                      ? formatDate(session.last_message_at)
                      : formatDate(session.created_at)
                    }
                  </span>
                </div>
              </div>
              
              {session.last_message_content && (
                <div className="mt-2 pt-2 border-t border-gray-700">
                  <p className="text-xs text-gray-400">
                    💬 {formatLastMessage(session.last_message_content)}
                  </p>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default SessionSelector;
