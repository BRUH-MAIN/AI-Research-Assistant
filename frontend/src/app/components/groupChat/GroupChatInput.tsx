import React, { useState } from 'react';
import { PaperAirplaneIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';

interface GroupChatInputProps {
  onSendMessage: (content: string) => Promise<void>;
  canInvokeAI: boolean;
  disabled?: boolean;
  placeholder?: string;
}

const GroupChatInput: React.FC<GroupChatInputProps> = ({
  onSendMessage,
  canInvokeAI,
  disabled = false,
  placeholder = 'Type your message...'
}) => {
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  // Check if message contains AI triggers
  const hasAiTrigger = message.toLowerCase().includes('@ai') || 
                       message.toLowerCase().includes('/ai') || 
                       message.toLowerCase().includes('@assistant');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!message.trim() || sending || disabled) return;

    // Check AI permissions if trying to invoke AI
    if (hasAiTrigger && !canInvokeAI) {
      alert('You do not have permission to invoke AI in this session. Contact a group admin or session creator.');
      return;
    }

    try {
      setSending(true);
      await onSendMessage(message.trim());
      setMessage('');
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className="border-t border-gray-700 bg-gray-800 p-4">
      <form onSubmit={handleSubmit} className="flex items-end space-x-3">
        <div className="flex-1">
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={placeholder}
            disabled={disabled || sending}
            rows={1}
            className="w-full resize-none rounded-lg border border-gray-600 bg-gray-700 px-4 py-2 text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
            style={{
              minHeight: '40px',
              maxHeight: '120px',
              overflow: 'auto'
            }}
          />
          
          {/* AI Trigger Warning */}
          {hasAiTrigger && !canInvokeAI && (
            <div className="mt-2 flex items-center space-x-2 rounded-md bg-amber-500/20 border border-amber-500/30 px-3 py-2 text-sm text-amber-400">
              <ExclamationTriangleIcon className="h-4 w-4" />
              <span>You need admin, mentor, or session creator permissions to invoke AI</span>
            </div>
          )}
          
          {hasAiTrigger && canInvokeAI && (
            <div className="mt-2 flex items-center space-x-2 rounded-md bg-blue-500/20 border border-blue-500/30 px-3 py-2 text-sm text-blue-400">
              <span>🤖 AI will respond to this message</span>
            </div>
          )}
        </div>
        
        <button
          type="submit"
          disabled={!message.trim() || sending || disabled || (hasAiTrigger && !canInvokeAI)}
          className="rounded-lg bg-blue-600 p-2 text-white transition-colors hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {sending ? (
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
          ) : (
            <PaperAirplaneIcon className="h-5 w-5" />
          )}
        </button>
      </form>
      
      {/* AI Usage Hint */}
      <div className="mt-2 text-xs text-gray-400">
        {canInvokeAI ? (
          <span>💡 Use @ai or /ai to invoke the AI assistant</span>
        ) : (
          <span>💡 Only admins, mentors, and session creators can invoke AI</span>
        )}
      </div>
    </div>
  );
};

export default GroupChatInput;
