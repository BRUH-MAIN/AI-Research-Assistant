import React, { useState, useEffect } from 'react';
import { CogIcon, CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline';

interface RAGControlProps {
  sessionId: number;
  currentUserId: number;
  onRAGStatusChange?: (enabled: boolean) => void;
}

interface RAGStatus {
  is_rag_enabled: boolean;
  enabled_by?: number;
  enabled_by_name?: string;
  rag_enabled_at?: string;
  total_papers?: number;
  processed_papers?: number;
}

const RAGControl: React.FC<RAGControlProps> = ({
  sessionId,
  currentUserId,
  onRAGStatusChange
}) => {
  const [ragStatus, setRAGStatus] = useState<RAGStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch RAG status
  const fetchRAGStatus = async () => {
    try {
      const response = await fetch(`http://localhost:3001/api/rag/sessions/${sessionId}/status`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('supabase_token') || ''}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setRAGStatus(data);
      } else if (response.status === 404) {
        // Session doesn't have RAG status yet
        setRAGStatus({ is_rag_enabled: false });
      } else {
        setError('Failed to fetch RAG status');
      }
    } catch (err) {
      setError('Network error');
      console.error('RAG status fetch error:', err);
    }
  };

  // Enable RAG
  const enableRAG = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`http://localhost:3001/api/rag/sessions/${sessionId}/enable`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('supabase_token') || ''}`
        },
        body: JSON.stringify({
          enabled_by: currentUserId
        })
      });

      if (response.ok) {
        await fetchRAGStatus(); // Refresh status
        onRAGStatusChange?.(true);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to enable RAG');
      }
    } catch (err) {
      setError('Network error');
      console.error('RAG enable error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Disable RAG
  const disableRAG = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`http://localhost:3001/api/rag/sessions/${sessionId}/disable`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('supabase_token') || ''}`
        }
      });

      if (response.ok) {
        await fetchRAGStatus(); // Refresh status
        onRAGStatusChange?.(false);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to disable RAG');
      }
    } catch (err) {
      setError('Network error');
      console.error('RAG disable error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRAGStatus();
  }, [sessionId]);

  if (!ragStatus) {
    return (
      <div className="flex items-center space-x-2 text-gray-400">
        <CogIcon className="h-4 w-4 animate-spin" />
        <span className="text-sm">Loading RAG status...</span>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <CogIcon className="h-5 w-5 text-blue-400" />
          <h3 className="text-white font-medium">RAG (Research Assistant)</h3>
        </div>
        
        <div className="flex items-center space-x-2">
          {ragStatus.is_rag_enabled ? (
            <CheckCircleIcon className="h-5 w-5 text-green-400" />
          ) : (
            <XCircleIcon className="h-5 w-5 text-red-400" />
          )}
          <span className={`text-sm font-medium ${
            ragStatus.is_rag_enabled ? 'text-green-400' : 'text-red-400'
          }`}>
            {ragStatus.is_rag_enabled ? 'Enabled' : 'Disabled'}
          </span>
        </div>
      </div>

      {/* Status Details */}
      {ragStatus.is_rag_enabled && (
        <div className="text-sm text-gray-400 mb-3 space-y-1">
          {ragStatus.enabled_by_name && (
            <p>Enabled by: {ragStatus.enabled_by_name}</p>
          )}
          {ragStatus.rag_enabled_at && (
            <p>Enabled at: {new Date(ragStatus.rag_enabled_at).toLocaleString()}</p>
          )}
          {ragStatus.total_papers !== undefined && (
            <p>Papers: {ragStatus.processed_papers || 0} processed / {ragStatus.total_papers} total</p>
          )}
        </div>
      )}

      {/* Description */}
      <p className="text-gray-400 text-sm mb-4">
        {ragStatus.is_rag_enabled 
          ? "RAG is enabled. Use @paper to ask questions about papers in this session."
          : "Enable RAG to use @paper for research-based AI responses with session papers."
        }
      </p>

      {/* Error Message */}
      {error && (
        <div className="bg-red-900 border border-red-700 text-red-200 text-sm p-2 rounded mb-3">
          {error}
        </div>
      )}

      {/* Action Button */}
      <div className="flex justify-end">
        {ragStatus.is_rag_enabled ? (
          <button
            onClick={disableRAG}
            disabled={loading}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-800 disabled:cursor-not-allowed text-white text-sm rounded transition-colors flex items-center space-x-2"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Disabling...</span>
              </>
            ) : (
              <span>Disable RAG</span>
            )}
          </button>
        ) : (
          <button
            onClick={enableRAG}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:cursor-not-allowed text-white text-sm rounded transition-colors flex items-center space-x-2"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Enabling...</span>
              </>
            ) : (
              <span>Enable RAG</span>
            )}
          </button>
        )}
      </div>

      {/* Usage Hint */}
      <div className="mt-3 text-xs text-gray-500 border-t border-gray-700 pt-3">
        💡 <strong>Tip:</strong> Once enabled, use <code className="bg-gray-700 px-1 rounded">@paper [question]</code> in chat for research-based answers, 
        or <code className="bg-gray-700 px-1 rounded">@ai [question]</code> for general AI assistance.
      </div>
    </div>
  );
};

export default RAGControl;