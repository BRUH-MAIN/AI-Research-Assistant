'use client'

import React, { useState } from 'react'
import { createClient } from '@supabase/supabase-js'

// Create Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

interface Paper {
  paper_id?: number
  title: string
  abstract?: string
  authors?: string
  doi?: string
  source_url?: string
  published_at?: string
  tags?: string[]
}

interface ArxivPaper {
  title: string
  abstract: string
  authors: string
  doi?: string
  source_url: string
  arxiv_id: string
  categories: string[]
  primary_category: string
}

interface SearchResult {
  found_in_db: boolean
  papers: Paper[]
  arxiv_results?: ArxivPaper[]
}

export default function PaperSearchPage() {
  const [searchName, setSearchName] = useState('')
  const [searchTags, setSearchTags] = useState('')
  const [searchResults, setSearchResults] = useState<SearchResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState('')
  const [selectedArxivPaper, setSelectedArxivPaper] = useState<ArxivPaper | null>(null)
  const [downloadTags, setDownloadTags] = useState('')
  const [currentLimit, setCurrentLimit] = useState(100)
  const [hasMoreResults, setHasMoreResults] = useState(false)

  const handleSearch = async (isLoadMore = false) => {
    if (isLoadMore) {
      setLoadingMore(true)
    } else {
      setLoading(true)
      setCurrentLimit(100)
    }
    setError('')
    
    try {
      const tags = searchTags.split(',').map(tag => tag.trim()).filter(tag => tag)
      
      // Get the current Supabase session token
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        throw new Error('No authentication token available. Please log in.');
      }
      
      const expressUrl = process.env.NEXT_PUBLIC_EXPRESS_DB_URL || 'http://localhost:3001';
      let dbResponse, arxivResponse;
      
      const searchLimit = isLoadMore ? currentLimit + 100 : 100;
      
      // Search database papers first
      dbResponse = await fetch(`${expressUrl}/api/papers/search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          name: searchName || null,
          tags: tags.length > 0 ? tags : null,
          limit: searchLimit
        })
      });
      
      if (!dbResponse.ok) {
        throw new Error('Database search failed');
      }
      
      const dbPapers = await dbResponse.json();
      
      // If we have a search term, also search arXiv (only on initial search, not load more)
      if (searchName?.trim() && !isLoadMore) {
        try {
          arxivResponse = await fetch(`${expressUrl}/api/papers/search/arxiv`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({
              query: searchName.trim(),
              limit: 50 // More arXiv results
            })
          });
          
          if (arxivResponse.ok) {
            const arxivPapers = await arxivResponse.json();
            setSearchResults({
              found_in_db: true,
              papers: dbPapers,
              arxiv_results: arxivPapers
            });
          } else {
            // If arXiv search fails, just show database results
            setSearchResults({
              found_in_db: true,
              papers: dbPapers
            });
          }
        } catch (arxivError) {
          console.warn('ArXiv search failed:', arxivError);
          // Show database results even if arXiv fails
          setSearchResults({
            found_in_db: true,
            papers: dbPapers
          });
        }
      } else {
        // No search term or load more, just show/append database results
        if (isLoadMore && searchResults) {
          setSearchResults({
            ...searchResults,
            papers: dbPapers
          });
        } else {
          setSearchResults({
            found_in_db: true,
            papers: dbPapers
          });
        }
      }
      
      // Check if there might be more results
      setHasMoreResults(dbPapers.length === searchLimit);
      setCurrentLimit(searchLimit);
      
    } catch (err) {
      setError('Failed to search papers: ' + (err instanceof Error ? err.message : 'Unknown error'));
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }

  const handleDownloadFromArxiv = async (arxivPaper: ArxivPaper) => {
    setLoading(true)
    setError('')
    
    try {
      const tags = downloadTags.split(',').map(tag => tag.trim()).filter(tag => tag)
      
      // Get the current Supabase session token
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        throw new Error('No authentication token available. Please log in.');
      }
      
      const expressUrl = process.env.NEXT_PUBLIC_EXPRESS_DB_URL || 'http://localhost:3001';
      const response = await fetch(`${expressUrl}/api/papers/arxiv`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          title: arxivPaper.title,
          abstract: arxivPaper.abstract,
          authors: arxivPaper.authors,
          arxiv_id: arxivPaper.arxiv_id,
          categories: arxivPaper.categories,
          source_url: arxivPaper.source_url,
          doi: arxivPaper.doi,
          // Add custom tags if provided
          custom_tags: tags.length > 0 ? tags : null
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to save paper to database');
      }
      
      const savedPaper = await response.json();
      alert(`Paper "${savedPaper.title}" has been added to the database!`);
      
      // Refresh search results
      handleSearch(false);
      setSelectedArxivPaper(null);
      setDownloadTags('');
    } catch (err) {
      setError('Failed to save paper: ' + (err instanceof Error ? err.message : 'Unknown error'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl md:text-4xl font-bold mb-8 text-center">
          Research Paper Search & Management
        </h1>
        
        {/* Search Form */}
        <div className="bg-gray-900 p-4 md:p-6 rounded-lg mb-8 border border-gray-800">
          <h2 className="text-xl md:text-2xl font-semibold mb-4">Search Papers</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-300">
                Paper Name/Title/Authors
              </label>
              <input
                type="text"
                value={searchName}
                onChange={(e) => setSearchName(e.target.value)}
                placeholder="Enter paper title, keywords, or author names"
                className="w-full p-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-300">
                Tags (comma-separated)
              </label>
              <input
                type="text"
                value={searchTags}
                onChange={(e) => setSearchTags(e.target.value)}
                placeholder="e.g., AI, machine learning, computer vision"
                className="w-full p-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
              />
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
            <button
              onClick={() => handleSearch(false)}
              disabled={loading || (!searchName && !searchTags)}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg font-medium transition-colors flex items-center gap-2"
            >
              {loading && (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              )}
              {loading ? 'Searching...' : 'Search Papers'}
            </button>
            {searchResults && (
              <div className="text-sm text-gray-400">
                Found {searchResults.papers.length} database results
                {searchResults.arxiv_results && ` + ${searchResults.arxiv_results.length} arXiv results`}
              </div>
            )}
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-900 border border-red-700 p-4 rounded-lg mb-8">
            <p className="text-red-200">{error}</p>
          </div>
        )}

        {/* Search Results */}
        {searchResults && (
          <div className="space-y-8">
            {/* Database Results */}
            <div className="bg-gray-900 p-6 rounded-lg">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-semibold">
                  Database Results ({searchResults.papers.length} found)
                </h2>
                {hasMoreResults && (
                  <button
                    onClick={() => handleSearch(true)}
                    disabled={loadingMore}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 rounded-lg font-medium text-sm"
                  >
                    {loadingMore ? 'Loading...' : 'Load More'}
                  </button>
                )}
              </div>
              
              {searchResults.papers.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b border-gray-700">
                        <th className="text-left py-3 px-4 font-semibold text-gray-300">Title</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-300">Authors</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-300">Abstract</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-300">Tags</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-300">Source</th>
                      </tr>
                    </thead>
                    <tbody>
                      {searchResults.papers.map((paper, index) => (
                        <tr key={paper.paper_id || index} className="border-b border-gray-800 hover:bg-gray-800/50 transition-colors">
                          <td className="py-4 px-4 align-top">
                            <div className="font-medium text-white max-w-xs">
                              {paper.title}
                            </div>
                            {paper.doi && (
                              <div className="text-xs text-blue-400 mt-1">
                                DOI: {paper.doi}
                              </div>
                            )}
                          </td>
                          <td className="py-4 px-4 align-top">
                            <div className="text-gray-300 max-w-xs">
                              {paper.authors || 'Unknown'}
                            </div>
                          </td>
                          <td className="py-4 px-4 align-top">
                            <div className="text-gray-400 text-sm max-w-md">
                              {paper.abstract ? 
                                (paper.abstract.length > 150 ? 
                                  paper.abstract.substring(0, 150) + '...' : 
                                  paper.abstract
                                ) : 
                                'No abstract available'
                              }
                            </div>
                          </td>
                          <td className="py-4 px-4 align-top">
                            {paper.tags && paper.tags.length > 0 ? (
                              <div className="flex flex-wrap gap-1 max-w-xs">
                                {paper.tags.slice(0, 3).map((tag, tagIndex) => (
                                  <span
                                    key={tagIndex}
                                    className="px-2 py-1 bg-blue-600/80 text-white text-xs rounded-full"
                                  >
                                    {tag}
                                  </span>
                                ))}
                                {paper.tags.length > 3 && (
                                  <span className="px-2 py-1 bg-gray-600 text-white text-xs rounded-full">
                                    +{paper.tags.length - 3}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-gray-500 text-sm">No tags</span>
                            )}
                          </td>
                          <td className="py-4 px-4 align-top">
                            {paper.source_url ? (
                              <a 
                                href={paper.source_url} 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                className="text-blue-400 hover:text-blue-300 text-sm underline max-w-xs inline-block truncate"
                              >
                                View Source
                              </a>
                            ) : (
                              <span className="text-gray-500 text-sm">No source</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-400">No papers found in the database.</p>
                </div>
              )}
            </div>

            {/* ArXiv Results */}
            {searchResults.arxiv_results && searchResults.arxiv_results.length > 0 && (
              <div className="bg-gray-900 p-6 rounded-lg">
                <h2 className="text-2xl font-semibold mb-6">
                  ArXiv Results ({searchResults.arxiv_results.length} found)
                </h2>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b border-gray-700">
                        <th className="text-left py-3 px-4 font-semibold text-gray-300">Title</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-300">Authors</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-300">Abstract</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-300">Categories</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-300">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {searchResults.arxiv_results.map((paper, index) => (
                        <tr key={paper.arxiv_id || index} className="border-b border-gray-800 hover:bg-gray-800/50 transition-colors">
                          <td className="py-4 px-4 align-top">
                            <div className="font-medium text-white max-w-xs">
                              {paper.title}
                            </div>
                            <div className="text-xs text-green-400 mt-1">
                              ArXiv: {paper.arxiv_id}
                            </div>
                          </td>
                          <td className="py-4 px-4 align-top">
                            <div className="text-gray-300 max-w-xs">
                              {paper.authors}
                            </div>
                          </td>
                          <td className="py-4 px-4 align-top">
                            <div className="text-gray-400 text-sm max-w-md">
                              {paper.abstract.length > 150 ? 
                                paper.abstract.substring(0, 150) + '...' : 
                                paper.abstract
                              }
                            </div>
                          </td>
                          <td className="py-4 px-4 align-top">
                            <div className="flex flex-wrap gap-1 max-w-xs">
                              {paper.categories.slice(0, 3).map((cat, catIndex) => (
                                <span
                                  key={catIndex}
                                  className="px-2 py-1 bg-green-600/80 text-white text-xs rounded-full"
                                >
                                  {cat}
                                </span>
                              ))}
                              {paper.categories.length > 3 && (
                                <span className="px-2 py-1 bg-gray-600 text-white text-xs rounded-full">
                                  +{paper.categories.length - 3}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-4 px-4 align-top">
                            <div className="flex flex-col gap-2">
                              <button
                                onClick={() => setSelectedArxivPaper(paper)}
                                className="px-3 py-1 bg-green-600 hover:bg-green-700 rounded text-xs font-medium transition-colors"
                              >
                                Save to DB
                              </button>
                              <a
                                href={paper.source_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded text-xs font-medium text-center transition-colors"
                              >
                                View Paper
                              </a>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Download Modal */}
        {selectedArxivPaper && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-gray-900 border border-gray-700 p-6 rounded-lg max-w-2xl w-full max-h-[80vh] overflow-y-auto shadow-2xl">
              <h3 className="text-xl font-semibold mb-4 text-white">Save Paper to Database</h3>
              <div className="mb-6 p-4 bg-gray-800 rounded-lg">
                <h4 className="font-medium mb-2 text-white">{selectedArxivPaper.title}</h4>
                <p className="text-gray-300 text-sm mb-2">
                  <strong>Authors:</strong> {selectedArxivPaper.authors}
                </p>
                <p className="text-gray-300 text-sm mb-2">
                  <strong>ArXiv ID:</strong> {selectedArxivPaper.arxiv_id}
                </p>
                <div className="flex flex-wrap gap-1 mt-2">
                  {selectedArxivPaper.categories.map((cat, catIndex) => (
                    <span
                      key={catIndex}
                      className="px-2 py-1 bg-green-600/80 text-white text-xs rounded-full"
                    >
                      {cat}
                    </span>
                  ))}
                </div>
              </div>
              <div className="mb-6">
                <label className="block text-sm font-medium mb-2 text-gray-300">
                  Additional Tags (comma-separated)
                </label>
                <input
                  type="text"
                  value={downloadTags}
                  onChange={(e) => setDownloadTags(e.target.value)}
                  placeholder="e.g., important, review later, cited-paper"
                  className="w-full p-3 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-400 mt-1">
                  These tags will be added in addition to the arXiv categories
                </p>
              </div>
              <div className="flex gap-4">
                <button
                  onClick={() => handleDownloadFromArxiv(selectedArxivPaper)}
                  disabled={loading}
                  className="px-6 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 rounded-lg font-medium flex-1 transition-colors"
                >
                  {loading ? 'Saving...' : 'Save to Database'}
                </button>
                <button
                  onClick={() => {
                    setSelectedArxivPaper(null)
                    setDownloadTags('')
                  }}
                  className="px-6 py-3 bg-gray-600 hover:bg-gray-700 rounded-lg font-medium transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
