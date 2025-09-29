import React, { useEffect, useRef } from 'react';
import GroupChatMessage from './GroupChatMessage';
import GroupChatInput from './GroupChatInput';
import OnlineUsersList from './OnlineUsersList';
import { useGroupChat } from '../../hooks/useGroupChat';
import { 
  ExclamationTriangleIcon, 
  CheckCircleIcon,
  ChatBubbleLeftRightIcon 
} from '@heroicons/react/24/outline';

interface GroupChatWindowProps {
  groupId: number;
  userId: number;
  sessionId: number;
  onClose?: () => void;
}

const GroupChatWindow: React.FC<GroupChatWindowProps> = ({
  groupId,
  userId,
  sessionId,
  onClose
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const {
    messages,
    onlineUsers,
    loading,
    error,
    connected,
    canInvokeAI,
    sendMessage,
    updatePresence,
    clearError
  } = useGroupChat({ groupId, userId, sessionId });

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Update presence on mount and visibility changes
  useEffect(() => {
    updatePresence('online');

    const handleVisibilityChange = () => {
      if (document.hidden) {
        updatePresence('away');
      } else {
        updatePresence('online');
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      updatePresence('offline');
    };
  }, [updatePresence]);

  const handleSendMessage = async (content: string) => {
    try {
      await sendMessage(content);
    } catch (error) {
      console.error('Failed to send message:', error);
      throw error;
    }
  };

  if (loading && messages.length === 0) {
    return (
      <div className="flex h-full items-center justify-center bg-gray-900">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-500 border-t-transparent mx-auto mb-4" />
          <p className="text-gray-400">Loading chat session...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full bg-gray-900">
      {/* Main chat area */}
      <div className="flex flex-1 flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-700 bg-gray-800 px-6 py-4">
          <div className="flex items-center space-x-3">
            <ChatBubbleLeftRightIcon className="h-6 w-6 text-blue-400" />
            <div>
              <h2 className="text-lg font-semibold text-white">Group Chat</h2>
              <p className="text-sm text-gray-400">Session #{sessionId}</p>
            </div>
          </div>

          {/* Connection status */}
          <div className="flex items-center space-x-4">
            <div className={`flex items-center space-x-2 rounded-full px-3 py-1 text-sm ${
              connected 
                ? 'bg-green-500/20 text-green-400' 
                : 'bg-red-500/20 text-red-400'
            }`}>
              {connected ? (
                <>
                  <CheckCircleIcon className="h-4 w-4" />
                  <span>Connected</span>
                </>
              ) : (
                <>
                  <ExclamationTriangleIcon className="h-4 w-4" />
                  <span>Disconnected</span>
                </>
              )}
            </div>

            {onClose && (
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-white transition-colors"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Error banner */}
        {error && (
          <div className="bg-red-500/20 border-b border-red-500/30 px-6 py-3 text-red-400">
            <div className="flex items-center justify-between">
              <span>{error}</span>
              <button 
                onClick={clearError}
                className="text-red-300 hover:text-red-100 transition-colors"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {/* Messages area */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {messages.length === 0 ? (
            <div className="flex h-full items-center justify-center text-center">
              <div>
                <ChatBubbleLeftRightIcon className="h-12 w-12 text-gray-500 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-300 mb-2">No messages yet</h3>
                <p className="text-gray-500">Start the conversation by sending a message!</p>
                {canInvokeAI && (
                  <p className="text-blue-400 text-sm mt-2">
                    💡 Try using @ai to get help from the AI assistant
                  </p>
                )}
              </div>
            </div>
          ) : (
            <>
              {messages.map((message, index) => {
                const prevMessage = messages[index - 1];
                const showSender = !prevMessage || 
                                   prevMessage.sender_id !== message.sender_id ||
                                   message.message_type === 'ai' ||
                                   message.message_type === 'system';
                
                return (
                  <GroupChatMessage
                    key={message.message_id}
                    message={message}
                    isOwn={message.sender_user_id === userId}
                    showSender={showSender}
                  />
                );
              })}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* Input area */}
        <GroupChatInput
          onSendMessage={handleSendMessage}
          canInvokeAI={canInvokeAI}
          disabled={!connected}
          placeholder={connected ? "Type your message..." : "Connecting..."}
        />
      </div>

      {/* Online users sidebar */}
      <div className="w-64 border-l border-gray-700 bg-gray-800">
        <OnlineUsersList 
          users={onlineUsers}
          currentUserId={userId}
        />
      </div>
    </div>
  );
};

export default GroupChatWindow;
