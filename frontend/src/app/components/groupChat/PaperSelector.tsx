import React, { useState, useEffect } from 'react';
import { 
  DocumentTextIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  CheckIcon,
  XMarkIcon,
  BookmarkIcon 
} from '@heroicons/react/24/outline';
import { paperService } from '../../services/paperService';
import type { Paper } from '../../types/types';

interface PaperSelectorProps {
  sessionId: number;
  isOpen: boolean;
  onClose: () => void;
  onPaperAdded?: (paper: Paper) => void;
}

const PaperSelector: React.FC<PaperSelectorProps> = ({
  sessionId,
  isOpen,
  onClose,
  onPaperAdded
}) => {
  const [papers, setPapers] = useState<Paper[]>([]);
  const [sessionPapers, setSessionPapers] = useState<Paper[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredPapers, setFilteredPapers] = useState<Paper[]>([]);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState<Set<number>>(new Set());

  // Fetch available papers and session papers
  useEffect(() => {
    if (isOpen) {
      fetchPapers();
      fetchSessionPapers();
    }
  }, [isOpen, sessionId]);

  // Filter papers based on search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredPapers(papers);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = papers.filter(paper =>
        paper.title.toLowerCase().includes(query) ||
        (paper.authors && paper.authors.toLowerCase().includes(query)) ||
        (paper.abstract && paper.abstract.toLowerCase().includes(query))
      );
      setFilteredPapers(filtered);
    }
  }, [papers, searchQuery]);

  const fetchPapers = async () => {
    try {
      setLoading(true);
      const allPapers = await paperService.getPapers();
      setPapers(allPapers);
      setFilteredPapers(allPapers);
    } catch (error) {
      console.error('Failed to fetch papers:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSessionPapers = async () => {
    try {
      const sessionPapersList = await paperService.getSessionPapers(sessionId);
      setSessionPapers(sessionPapersList);
    } catch (error) {
      console.error('Failed to fetch session papers:', error);
    }
  };

  const handleAddPaper = async (paper: Paper) => {
    if (adding.has(paper.id)) return;

    try {
      setAdding(prev => new Set(prev).add(paper.id));
      
      // Use the new auto-RAG linking method
      const result = await paperService.linkPaperToSessionWithRAG(sessionId, paper.id);
      
      // Update session papers list
      setSessionPapers(prev => [...prev, paper]);
      
      // Show user feedback about RAG processing
      if (result.ragResult) {
        if (result.ragResult.success) {
          console.log('Paper added and processed for RAG successfully');
        } else {
          const { reason, error } = result.ragResult;
          
          switch (reason) {
            case 'no_arxiv_id':
              console.info('Paper added - manual PDF upload needed for RAG functionality');
              break;
            case 'rag_disabled':
              console.info('Paper added - RAG is not enabled for this session');
              break;
            case 'processing_error':
              console.warn('Paper added but RAG processing failed:', error);
              break;
            default:
              console.warn('Paper added but RAG processing failed:', error);
          }
        }
      }
      
      // Notify parent component
      onPaperAdded?.(paper);
      
    } catch (error) {
      console.error('Failed to add paper to session:', error);
      alert('Failed to add paper to session. Please try again.');
    } finally {
      setAdding(prev => {
        const newSet = new Set(prev);
        newSet.delete(paper.id);
        return newSet;
      });
    }
  };

  const isPaperInSession = (paperId: number) => {
    return sessionPapers.some(p => p.id === paperId);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const truncateText = (text: string, maxLength: number) => {
    if (!text || text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-gray-900 rounded-lg shadow-xl w-full max-w-4xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-500/20 rounded-lg">
              <BookmarkIcon className="h-6 w-6 text-blue-400" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-white">Add Papers to Session</h2>
              <p className="text-gray-400 text-sm">
                Select papers to add to this chat session for easy reference
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white transition-colors"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Search */}
        <div className="p-6 border-b border-gray-700">
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search papers by title, authors, or abstract..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Papers List */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-500 border-t-transparent"></div>
              <span className="ml-3 text-gray-400">Loading papers...</span>
            </div>
          ) : filteredPapers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <DocumentTextIcon className="h-12 w-12 text-gray-500 mb-4" />
              <h3 className="text-lg font-medium text-gray-300 mb-2">No papers found</h3>
              <p className="text-gray-500">
                {searchQuery ? 'Try adjusting your search terms' : 'No papers are available in the database'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredPapers.map((paper) => {
                const isInSession = isPaperInSession(paper.id);
                const isAdding = adding.has(paper.id);

                return (
                  <div
                    key={paper.id}
                    className={`rounded-lg border p-4 transition-colors ${
                      isInSession
                        ? 'border-green-500/30 bg-green-500/10'
                        : 'border-gray-700 bg-gray-800 hover:bg-gray-750'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        {/* Title */}
                        <h3 className="text-lg font-medium text-white mb-2">
                          {paper.title}
                        </h3>

                        {/* Authors */}
                        {paper.authors && (
                          <p className="text-sm text-gray-300 mb-2">
                            <span className="font-medium">Authors:</span> {paper.authors}
                          </p>
                        )}

                        {/* Abstract */}
                        {paper.abstract && (
                          <p className="text-sm text-gray-400 mb-3">
                            {truncateText(paper.abstract, 200)}
                          </p>
                        )}

                        {/* Metadata */}
                        <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500">
                          {paper.doi && (
                            <span>DOI: {paper.doi}</span>
                          )}
                          {paper.created_at && (
                            <span>Added: {formatDate(paper.created_at)}</span>
                          )}
                        </div>
                      </div>

                      {/* Action Button */}
                      <div className="ml-4 flex-shrink-0">
                        {isInSession ? (
                          <div className="flex items-center space-x-2 px-3 py-1.5 bg-green-500/20 text-green-400 rounded-lg border border-green-500/30">
                            <CheckIcon className="h-4 w-4" />
                            <span className="text-sm font-medium">Added</span>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleAddPaper(paper)}
                            disabled={isAdding}
                            className="flex items-center space-x-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 text-white rounded-lg transition-colors disabled:cursor-not-allowed"
                          >
                            {isAdding ? (
                              <>
                                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                <span className="text-sm font-medium">Adding...</span>
                              </>
                            ) : (
                              <>
                                <PlusIcon className="h-4 w-4" />
                                <span className="text-sm font-medium">Add</span>
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-700">
          <div className="text-sm text-gray-400">
            {sessionPapers.length} paper{sessionPapers.length !== 1 ? 's' : ''} added to this session
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

export default PaperSelector;