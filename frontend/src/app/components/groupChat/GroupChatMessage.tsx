import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { GroupChatMessage } from '../../types/groupChat';

interface GroupChatMessageProps {
  message: GroupChatMessage;
  isOwn: boolean;
  showSender?: boolean;
}

const GroupChatMessage: React.FC<GroupChatMessageProps> = ({
  message,
  isOwn,
  showSender = true
}) => {
  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const getMessageTypeStyles = () => {
    switch (message.message_type) {
      case 'ai':
        return {
          container: 'bg-purple-600/20 border border-purple-500/30',
          text: 'text-purple-100'
        };
      case 'system':
        return {
          container: 'bg-gray-600/20 border border-gray-500/30',
          text: 'text-gray-300'
        };
      default:
        return isOwn 
          ? {
              container: 'bg-blue-600/20 border border-blue-500/30',
              text: 'text-blue-100'
            }
          : {
              container: 'bg-gray-700/50 border border-gray-600/30',
              text: 'text-gray-100'
            };
    }
  };

  const styles = getMessageTypeStyles();
  const isAI = message.message_type === 'ai';
  const isSystem = message.message_type === 'system';

  return (
    <div className={`flex ${isOwn && !isAI && !isSystem ? 'justify-end' : 'justify-start'} mb-4`}>
      <div className={`max-w-[70%] rounded-lg px-4 py-2 ${styles.container}`}>
        {/* Sender info */}
        {showSender && !isOwn && (
          <div className="mb-1 flex items-center space-x-2">
            <span className="text-sm font-medium text-gray-300">
              {isAI ? '🤖 AI Assistant' : message.sender_name}
            </span>
            {isAI && (
              <span className="rounded-full bg-purple-500/20 px-2 py-0.5 text-xs text-purple-300">
                AI
              </span>
            )}
            {isSystem && (
              <span className="rounded-full bg-gray-500/20 px-2 py-0.5 text-xs text-gray-400">
                System
              </span>
            )}
          </div>
        )}

        {/* Message content */}
        <div className={`${styles.text}`}>
          {isAI || message.content.includes('```') || message.content.includes('**') ? (
            <div className="prose prose-invert prose-sm max-w-none">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {message.content}
              </ReactMarkdown>
            </div>
          ) : (
            <p className="whitespace-pre-wrap break-words">
              {message.content}
            </p>
          )}
        </div>

        {/* Metadata and timestamp */}
        <div className="mt-2 flex items-center justify-between text-xs text-gray-400">
          <div className="flex items-center space-x-2">
            {/* AI trigger indicator */}
            {message.metadata?.ai_triggered && (
              <span className="rounded bg-purple-500/20 px-1.5 py-0.5 text-purple-300">
                AI Triggered
              </span>
            )}
            
            {/* Edited indicator */}
            {message.edited_at && (
              <span className="rounded bg-gray-500/20 px-1.5 py-0.5 text-gray-400">
                Edited
              </span>
            )}
          </div>
          
          <span>{formatTime(message.sent_at)}</span>
        </div>
      </div>
    </div>
  );
};

export default GroupChatMessage;
