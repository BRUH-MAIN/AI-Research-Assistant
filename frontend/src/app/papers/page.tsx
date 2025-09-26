'use client'

import React, { useState } from 'react'

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
  const [error, setError] = useState('')
  const [selectedArxivPaper, setSelectedArxivPaper] = useState<ArxivPaper | null>(null)
  const [downloadTags, setDownloadTags] = useState('')

  const handleSearch = async () => {
    setLoading(true)
    setError('')
    
    try {
      const tags = searchTags.split(',').map(tag => tag.trim()).filter(tag => tag)
      
      const fastApiUrl = process.env.NEXT_PUBLIC_FASTAPI_URL || 'http://localhost:8000';
      const response = await fetch(`${fastApiUrl}/api/v1/papers/search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: searchName || null,
          tags: tags.length > 0 ? tags : null
        })
      })
      
      if (!response.ok) {
        throw new Error('Search failed')
      }
      
      const data: SearchResult = await response.json()
      setSearchResults(data)
    } catch (err) {
      setError('Failed to search papers')
    } finally {
      setLoading(false)
    }
  }

  const handleDownloadFromArxiv = async (arxivPaper: ArxivPaper) => {
    setLoading(true)
    setError('')
    
    try {
      const tags = downloadTags.split(',').map(tag => tag.trim()).filter(tag => tag)
      
      const fastApiUrl = process.env.NEXT_PUBLIC_FASTAPI_URL || 'http://localhost:8000';
      const response = await fetch(`${fastApiUrl}/api/v1/papers/download-from-arxiv`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          arxiv_id: arxivPaper.arxiv_id,
          add_tags: tags.length > 0 ? tags : null
        })
      })
      
      if (!response.ok) {
        throw new Error('Download failed')
      }
      
      const downloadedPaper = await response.json()
      alert(`Paper "${downloadedPaper.title}" has been added to the database and is being downloaded!`)
      
      // Refresh search results
      handleSearch()
      setSelectedArxivPaper(null)
      setDownloadTags('')
    } catch (err) {
      setError('Failed to download paper')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold mb-8 text-center">Paper Search & Download</h1>
        
        {/* Search Form */}
        <div className="bg-gray-900 p-6 rounded-lg mb-8">
          <h2 className="text-2xl font-semibold mb-4">Search Papers</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium mb-2">Paper Name/Title/Authors</label>
              <input
                type="text"
                value={searchName}
                onChange={(e) => setSearchName(e.target.value)}
                placeholder="Enter paper title, keywords, or author names"
                className="w-full p-3 bg-gray-800 border border-gray-700 rounded-lg text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Tags (comma-separated)</label>
              <input
                type="text"
                value={searchTags}
                onChange={(e) => setSearchTags(e.target.value)}
                placeholder="e.g., AI, machine learning, computer vision"
                className="w-full p-3 bg-gray-800 border border-gray-700 rounded-lg text-white"
              />
            </div>
          </div>
          <button
            onClick={handleSearch}
            disabled={loading || (!searchName && !searchTags)}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 rounded-lg font-medium"
          >
            {loading ? 'Searching...' : 'Search Papers'}
          </button>
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
              <h2 className="text-2xl font-semibold mb-4">
                Database Results ({searchResults.papers.length} found)
              </h2>
              {searchResults.papers.length > 0 ? (
                <div className="space-y-4">
                  {searchResults.papers.map((paper, index) => (
                    <div key={paper.paper_id || index} className="bg-gray-800 p-4 rounded-lg">
                      <h3 className="text-lg font-semibold mb-2">{paper.title}</h3>
                      {paper.authors && (
                        <p className="text-gray-300 mb-2"><strong>Authors:</strong> {paper.authors}</p>
                      )}
                      {paper.abstract && (
                        <p className="text-gray-300 mb-2"><strong>Abstract:</strong> {paper.abstract.substring(0, 200)}...</p>
                      )}
                      {paper.tags && paper.tags.length > 0 && (
                        <div className="mb-2">
                          <strong>Tags:</strong>
                          <div className="flex flex-wrap gap-2 mt-1">
                            {paper.tags.map((tag, tagIndex) => (
                              <span
                                key={tagIndex}
                                className="px-2 py-1 bg-blue-600 text-white text-sm rounded"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      {paper.doi && (
                        <p className="text-gray-300 mb-2"><strong>DOI:</strong> {paper.doi}</p>
                      )}
                      {paper.source_url && (
                        <p className="text-gray-300">
                          <strong>Source:</strong> 
                          <a href={paper.source_url} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline ml-1">
                            {paper.source_url}
                          </a>
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-400">No papers found in the database.</p>
              )}
            </div>

            {/* ArXiv Results */}
            {searchResults.arxiv_results && searchResults.arxiv_results.length > 0 && (
              <div className="bg-gray-900 p-6 rounded-lg">
                <h2 className="text-2xl font-semibold mb-4">
                  ArXiv Results ({searchResults.arxiv_results.length} found)
                </h2>
                <div className="space-y-4">
                  {searchResults.arxiv_results.map((paper, index) => (
                    <div key={paper.arxiv_id || index} className="bg-gray-800 p-4 rounded-lg">
                      <h3 className="text-lg font-semibold mb-2">{paper.title}</h3>
                      <p className="text-gray-300 mb-2"><strong>Authors:</strong> {paper.authors}</p>
                      <p className="text-gray-300 mb-2"><strong>Abstract:</strong> {paper.abstract.substring(0, 200)}...</p>
                      <div className="mb-2">
                        <strong>Categories:</strong>
                        <div className="flex flex-wrap gap-2 mt-1">
                          {paper.categories.map((cat, catIndex) => (
                            <span
                              key={catIndex}
                              className="px-2 py-1 bg-green-600 text-white text-sm rounded"
                            >
                              {cat}
                            </span>
                          ))}
                        </div>
                      </div>
                      <p className="text-gray-300 mb-2"><strong>ArXiv ID:</strong> {paper.arxiv_id}</p>
                      <button
                        onClick={() => setSelectedArxivPaper(paper)}
                        className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg text-sm font-medium"
                      >
                        Download & Add to Database
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Download Modal */}
        {selectedArxivPaper && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-gray-900 p-6 rounded-lg max-w-2xl w-full max-h-[80vh] overflow-y-auto">
              <h3 className="text-xl font-semibold mb-4">Download Paper</h3>
              <div className="mb-4">
                <h4 className="font-medium mb-2">{selectedArxivPaper.title}</h4>
                <p className="text-gray-300 text-sm mb-2"><strong>Authors:</strong> {selectedArxivPaper.authors}</p>
                <p className="text-gray-300 text-sm"><strong>ArXiv ID:</strong> {selectedArxivPaper.arxiv_id}</p>
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Additional Tags (comma-separated)</label>
                <input
                  type="text"
                  value={downloadTags}
                  onChange={(e) => setDownloadTags(e.target.value)}
                  placeholder="Add custom tags for this paper"
                  className="w-full p-3 bg-gray-800 border border-gray-700 rounded-lg text-white"
                />
              </div>
              <div className="flex gap-4">
                <button
                  onClick={() => handleDownloadFromArxiv(selectedArxivPaper)}
                  disabled={loading}
                  className="px-6 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 rounded-lg font-medium flex-1"
                >
                  {loading ? 'Downloading...' : 'Download & Save'}
                </button>
                <button
                  onClick={() => {
                    setSelectedArxivPaper(null)
                    setDownloadTags('')
                  }}
                  className="px-6 py-3 bg-gray-600 hover:bg-gray-700 rounded-lg font-medium"
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
