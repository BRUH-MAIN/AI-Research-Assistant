import React, { useState, useEffect } from 'react';
import { 
  CpuChipIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';
import { ragService, SessionRAGStatus } from '../../services/ragService';
import { useUser } from '../../contexts';

interface RAGToggleProps {
  sessionId: number;
  onStatusChange?: (status: SessionRAGStatus) => void;
  className?: string;
}

const RAGToggle: React.FC<RAGToggleProps> = ({
  sessionId,
  onStatusChange,
  className = ''
}) => {
  const { internalUserId } = useUser();
  const [ragStatus, setRagStatus] = useState<SessionRAGStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toggling, setToggling] = useState(false);
  const [autoFetching, setAutoFetching] = useState(false);

  useEffect(() => {
    fetchRagStatus();
  }, [sessionId]);

  const fetchRagStatus = async () => {
    try {
      setLoading(true);
      setError(null);
      const status = await ragService.getSessionRAGStatus(sessionId);
      setRagStatus(status);
      onStatusChange?.(status);
    } catch (err: any) {
      console.error('Failed to fetch RAG status:', err);
      let errorMessage = 'Failed to fetch RAG status';
      
      if (err.status === 0) {
        errorMessage = 'Cannot connect to server. Please check your connection.';
      } else if (err.status === 404) {
        errorMessage = 'Session not found. Please refresh the page.';
      } else if (err.status >= 500) {
        errorMessage = 'Server error. Please try again later.';
      } else if (err.message?.includes('JSON')) {
        errorMessage = 'Server response error. Please try refreshing the page.';
      } else {
        errorMessage = err.message || errorMessage;
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleRag = async () => {
    if (!internalUserId || toggling) return;

    try {
      setToggling(true);
      setError(null);

      let newStatus: SessionRAGStatus;
      
      if (ragStatus?.is_rag_enabled) {
        // Disable RAG
        newStatus = await ragService.disableSessionRAG(sessionId);
      } else {
        // Enable RAG
        newStatus = await ragService.enableSessionRAG(sessionId, internalUserId);
      }

      setRagStatus(newStatus);
      onStatusChange?.(newStatus);
    } catch (err: any) {
      console.error('Failed to toggle RAG:', err);
      let errorMessage = 'Failed to toggle RAG';
      
      if (err.status === 0) {
        errorMessage = 'Cannot connect to server. Please check your connection.';
      } else if (err.status === 404) {
        errorMessage = 'Session not found. Please refresh the page.';
      } else if (err.status === 400) {
        errorMessage = 'Invalid request. Please check your session.';
      } else if (err.status >= 500) {
        errorMessage = 'Server error. Please try again later.';
      } else if (err.message?.includes('JSON')) {
        errorMessage = 'Server response error. Please try refreshing the page.';
      } else {
        errorMessage = err.message || errorMessage;
      }
      
      setError(errorMessage);
    } finally {
      setToggling(false);
    }
  };

  const handleAutoFetch = async () => {
    if (!ragStatus?.is_rag_enabled || autoFetching) return;

    try {
      setAutoFetching(true);
      setError(null);

      const result = await ragService.autoFetchSessionPapers(sessionId);
      
      // Refresh RAG status to show updated counts
      await fetchRagStatus();
      
      // Show success message
      if (result.success) {
        const { processed, skipped, failed } = result.summary;
        console.log(`Auto-fetch completed: ${processed} processed, ${skipped} skipped, ${failed} failed`);
      }
      
    } catch (err: any) {
      console.error('Failed to auto-fetch papers:', err);
      setError(err.message || 'Failed to auto-fetch papers');
    } finally {
      setAutoFetching(false);
    }
  };

  const getRagStatusInfo = () => {
    if (!ragStatus) return null;

    const { is_rag_enabled, total_papers, processed_papers } = ragStatus;

    if (!is_rag_enabled) {
      return {
        icon: XCircleIcon,
        iconColor: 'text-gray-400',
        bgColor: 'bg-gray-700',
        status: 'Disabled',
        description: '@paper commands are not available'
      };
    }

    if (total_papers === 0) {
      return {
        icon: ExclamationTriangleIcon,
        iconColor: 'text-yellow-400',
        bgColor: 'bg-yellow-500/20',
        status: 'No Papers',
        description: 'Add papers to use @paper commands'
      };
    }

    if (processed_papers === 0) {
      return {
        icon: ExclamationTriangleIcon,
        iconColor: 'text-orange-400',
        bgColor: 'bg-orange-500/20',
        status: 'Processing',
        description: 'Papers are being processed for RAG'
      };
    }

    if (processed_papers < total_papers) {
      return {
        icon: ExclamationTriangleIcon,
        iconColor: 'text-yellow-400',
        bgColor: 'bg-yellow-500/20',
        status: 'Partial',
        description: `${processed_papers}/${total_papers} papers processed`
      };
    }

    return {
      icon: CheckCircleIcon,
      iconColor: 'text-green-400',
      bgColor: 'bg-green-500/20',
      status: 'Ready',
      description: `@paper commands available with ${processed_papers} papers`
    };
  };

  if (loading && !ragStatus) {
    return (
      <div className={`bg-gray-800 border border-gray-700 rounded-lg p-3 ${className}`}>
        <div className="flex items-center space-x-2">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-500 border-t-transparent"></div>
          <span className="text-gray-400 text-sm">Loading RAG status...</span>
        </div>
      </div>
    );
  }

  const statusInfo = getRagStatusInfo();

  return (
    <div className={`bg-gray-800 border border-gray-700 rounded-lg p-3 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-2">
          <CpuChipIcon className="h-4 w-4 text-blue-400" />
          <span className="text-sm font-medium text-white">RAG Assistant</span>
        </div>
        
        {/* Toggle Switch */}
        <button
          onClick={handleToggleRag}
          disabled={toggling || !internalUserId}
          className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-800 disabled:opacity-50 disabled:cursor-not-allowed ${
            ragStatus?.is_rag_enabled ? 'bg-blue-600' : 'bg-gray-600'
          }`}
        >
          <span
            className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
              ragStatus?.is_rag_enabled ? 'translate-x-5' : 'translate-x-1'
            }`}
          />
        </button>
      </div>

      {/* Status Info */}
      {statusInfo && (
        <div className={`flex items-center space-x-2 p-2 rounded ${statusInfo.bgColor}`}>
          <statusInfo.icon className={`h-4 w-4 ${statusInfo.iconColor}`} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2">
              <span className={`text-xs font-medium ${statusInfo.iconColor}`}>
                {statusInfo.status}
              </span>
              {toggling && (
                <div className="h-3 w-3 animate-spin rounded-full border border-gray-400 border-t-transparent" />
              )}
            </div>
            <p className="text-xs text-gray-300 mt-1">
              {statusInfo.description}
            </p>
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="mt-2 p-2 bg-red-500/20 border border-red-500/30 rounded text-red-400 text-xs">
          <div className="flex items-center space-x-1">
            <ExclamationTriangleIcon className="h-3 w-3" />
            <span>{error}</span>
            <button
              onClick={() => setError(null)}
              className="ml-auto text-red-300 hover:text-red-100 transition-colors"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Auto-fetch Button - Show when RAG is enabled but papers need processing */}
      {ragStatus?.is_rag_enabled && ragStatus.total_papers > 0 && ragStatus.processed_papers < ragStatus.total_papers && (
        <div className="mt-2 p-2 bg-orange-500/10 border border-orange-500/20 rounded">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <ArrowPathIcon className="h-3 w-3 text-orange-400" />
              <span className="text-xs text-orange-300">
                {ragStatus.total_papers - ragStatus.processed_papers} papers need processing
              </span>
            </div>
            <button
              onClick={handleAutoFetch}
              disabled={autoFetching}
              className="px-2 py-1 bg-orange-600 hover:bg-orange-700 disabled:bg-orange-600/50 text-white text-xs rounded transition-colors disabled:cursor-not-allowed"
            >
              {autoFetching ? (
                <div className="flex items-center space-x-1">
                  <div className="h-3 w-3 animate-spin rounded-full border border-white border-t-transparent" />
                  <span>Processing...</span>
                </div>
              ) : (
                'Auto-fetch PDFs'
              )}
            </button>
          </div>
          <p className="text-xs text-orange-200 mt-1">
            Automatically download and process papers with arXiv IDs
          </p>
        </div>
      )}

      {/* Help Text */}
      {ragStatus?.is_rag_enabled && ragStatus.processed_papers > 0 && (
        <div className="mt-2 p-2 bg-blue-500/10 border border-blue-500/20 rounded">
          <div className="flex items-start space-x-2">
            <InformationCircleIcon className="h-3 w-3 text-blue-400 mt-0.5 flex-shrink-0" />
            <div className="text-xs text-blue-300">
              <p className="font-medium mb-1">Usage:</p>
              <ul className="space-y-0.5 text-blue-200">
                <li>• Use <code className="bg-blue-500/20 px-1 rounded">@paper</code> for research-based answers</li>
                <li>• Use <code className="bg-blue-500/20 px-1 rounded">@ai</code> for general assistance</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RAGToggle;