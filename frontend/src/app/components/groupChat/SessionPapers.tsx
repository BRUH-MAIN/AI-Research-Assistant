import React, { useState, useEffect } from 'react';
import { 
  DocumentTextIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  ArrowTopRightOnSquareIcon,
  XMarkIcon,
  PlusIcon
} from '@heroicons/react/24/outline';
import { paperService } from '../../services/paperService';
import PaperSelector from './PaperSelector';
import RAGToggle from './RAGToggle';
import type { Paper } from '../../types/types';
import type { SessionRAGStatus } from '../../services/ragService';

interface SessionPapersProps {
  sessionId: number;
  canManagePapers?: boolean; // Whether user can add/remove papers
}

const SessionPapers: React.FC<SessionPapersProps> = ({
  sessionId,
  canManagePapers = true
}) => {
  const [papers, setPapers] = useState<Paper[]>([]);
  const [loading, setLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);
  const [showPaperSelector, setShowPaperSelector] = useState(false);
  const [removing, setRemoving] = useState<Set<number>>(new Set());
  const [ragStatus, setRagStatus] = useState<SessionRAGStatus | null>(null);

  useEffect(() => {
    fetchSessionPapers();
  }, [sessionId]);

  const fetchSessionPapers = async () => {
    try {
      setLoading(true);
      const sessionPapers = await paperService.getSessionPapers(sessionId);
      setPapers(sessionPapers);
    } catch (error) {
      console.error('Failed to fetch session papers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRemovePaper = async (paperId: number) => {
    if (removing.has(paperId)) return;

    const confirmed = confirm('Are you sure you want to remove this paper from the session?');
    if (!confirmed) return;

    try {
      setRemoving(prev => new Set(prev).add(paperId));
      await paperService.removePaperFromSession(sessionId, paperId);
      setPapers(prev => prev.filter(p => p.id !== paperId));
    } catch (error) {
      console.error('Failed to remove paper from session:', error);
      alert('Failed to remove paper from session. Please try again.');
    } finally {
      setRemoving(prev => {
        const newSet = new Set(prev);
        newSet.delete(paperId);
        return newSet;
      });
    }
  };

  const handlePaperAdded = (paper: Paper) => {
    setPapers(prev => [...prev, paper]);
  };

  const handleRagStatusChange = (status: SessionRAGStatus) => {
    setRagStatus(status);
  };

  const truncateText = (text: string, maxLength: number) => {
    if (!text || text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  const openPaperLink = (paper: Paper) => {
    if (paper.source_url) {
      window.open(paper.source_url, '_blank', 'noopener,noreferrer');
    } else if (paper.doi) {
      window.open(`https://doi.org/${paper.doi}`, '_blank', 'noopener,noreferrer');
    }
  };

  const hasPaperLink = (paper: Paper) => {
    return paper.source_url || paper.doi;
  };

  if (loading && papers.length === 0) {
    return (
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
        <div className="flex items-center space-x-2">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-500 border-t-transparent"></div>
          <span className="text-gray-400 text-sm">Loading papers...</span>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-3">
        {/* RAG Toggle */}
        <RAGToggle 
          sessionId={sessionId}
          onStatusChange={handleRagStatusChange}
        />

        {/* Papers Section */}
        <div className="bg-gray-800 border border-gray-700 rounded-lg">
        {/* Header */}
        <div 
          className="flex items-center justify-between p-4 cursor-pointer"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div className="flex items-center space-x-3">
            <DocumentTextIcon className="h-5 w-5 text-blue-400" />
            <h3 className="text-sm font-medium text-white">
              Session Papers ({papers.length})
            </h3>
          </div>
          <div className="flex items-center space-x-2">
            {canManagePapers && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowPaperSelector(true);
                }}
                className="p-1 text-gray-400 hover:text-blue-400 transition-colors"
                title="Add papers to session"
              >
                <PlusIcon className="h-4 w-4" />
              </button>
            )}
            {isExpanded ? (
              <ChevronUpIcon className="h-4 w-4 text-gray-400" />
            ) : (
              <ChevronDownIcon className="h-4 w-4 text-gray-400" />
            )}
          </div>
        </div>

        {/* Papers List */}
        {isExpanded && (
          <div className="border-t border-gray-700">
            {papers.length === 0 ? (
              <div className="p-4 text-center">
                <DocumentTextIcon className="h-8 w-8 text-gray-500 mx-auto mb-2" />
                <p className="text-gray-400 text-sm mb-2">No papers added to this session</p>
                {canManagePapers && (
                  <button
                    onClick={() => setShowPaperSelector(true)}
                    className="text-blue-400 hover:text-blue-300 text-sm font-medium transition-colors"
                  >
                    Add papers to get started
                  </button>
                )}
              </div>
            ) : (
              <div className="max-h-60 overflow-y-auto">
                {papers.map((paper) => {
                  const isRemoving = removing.has(paper.id);
                  
                  return (
                    <div
                      key={paper.id}
                      className="p-3 border-b border-gray-700 last:border-b-0 hover:bg-gray-750 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          {/* Title */}
                          <h4 className="text-sm font-medium text-white mb-1">
                            {truncateText(paper.title, 60)}
                          </h4>

                          {/* Authors */}
                          {paper.authors && (
                            <p className="text-xs text-gray-300 mb-1">
                              {truncateText(paper.authors, 40)}
                            </p>
                          )}

                          {/* Abstract preview */}
                          {paper.abstract && (
                            <p className="text-xs text-gray-400 mb-2">
                              {truncateText(paper.abstract, 80)}
                            </p>
                          )}

                          {/* Actions */}
                          <div className="flex items-center space-x-2">
                            {hasPaperLink(paper) && (
                              <button
                                onClick={() => openPaperLink(paper)}
                                className="inline-flex items-center space-x-1 text-xs text-blue-400 hover:text-blue-300 transition-colors"
                              >
                                <ArrowTopRightOnSquareIcon className="h-3 w-3" />
                                <span>Open</span>
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Remove button */}
                        {canManagePapers && (
                          <button
                            onClick={() => handleRemovePaper(paper.id)}
                            disabled={isRemoving}
                            className="ml-2 p-1 text-gray-400 hover:text-red-400 transition-colors disabled:cursor-not-allowed"
                            title="Remove from session"
                          >
                            {isRemoving ? (
                              <div className="h-3 w-3 animate-spin rounded-full border border-gray-400 border-t-transparent" />
                            ) : (
                              <XMarkIcon className="h-3 w-3" />
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
      </div>

      {/* Paper Selector Modal */}
      {showPaperSelector && (
        <PaperSelector
          sessionId={sessionId}
          isOpen={showPaperSelector}
          onClose={() => setShowPaperSelector(false)}
          onPaperAdded={handlePaperAdded}
        />
      )}
    </>
  );
};

export default SessionPapers;