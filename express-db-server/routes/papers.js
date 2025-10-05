// Paper routes - Express.js implementation using Supabase RPC
const express = require('express');
const axios = require('axios');
const xml2js = require('xml2js');
const router = express.Router();

/**
 * Helper function to execute Supabase RPC calls with error handling
 */
async function executeRPC(supabase, functionName, params = {}, res) {
    try {
        const { data, error } = await supabase.rpc(functionName, params);
        
        if (error) {
            console.error(`RPC Error (${functionName}):`, error);
            throw error;
        }
        
        return data;
    } catch (error) {
        // Re-throw to be caught by route handler
        throw error;
    }
}

// =====================================================
// PAPER ROUTES
// =====================================================

/**
 * GET /api/papers
 * Get all papers (with optional filtering)
 */
router.get('/', async (req, res, next) => {
    try {
        const { limit, offset, search } = req.query;
        const supabase = req.app.locals.supabase;
        
        let papers;
        if (search) {
            papers = await executeRPC(supabase, 'search_papers', {
                p_search_term: search,
                p_limit: limit ? parseInt(limit) : 100,
                p_offset: offset ? parseInt(offset) : 0
            });
        } else {
            papers = await executeRPC(supabase, 'get_all_papers', {
                p_limit: limit ? parseInt(limit) : 100,
                p_offset: offset ? parseInt(offset) : 0
            });
        }
        
        // Transform paper_id to id for frontend compatibility
        const transformedPapers = papers.map(paper => ({
            ...paper,
            id: paper.paper_id
        }));
        
        res.json(transformedPapers);
    } catch (error) {
        next(error);
    }
});

/**
 * POST /api/papers
 * Create a new paper
 */
router.post('/', async (req, res, next) => {
    try {
        const { title, authors, abstract, doi, arxiv_id, publication_date, venue, url, file_path, metadata } = req.body;
        
        if (!title || !authors) {
            return res.status(400).json({
                error: 'title and authors are required',
                code: 400
            });
        }
        
        const supabase = req.app.locals.supabase;
        const paper = await executeRPC(supabase, 'create_paper', {
            p_title: title,
            p_authors: authors,
            p_abstract: abstract || null,
            p_doi: doi || null,
            p_arxiv_id: arxiv_id || null,
            p_publication_date: publication_date || null,
            p_venue: venue || null,
            p_url: url || null,
            p_file_path: file_path || null,
            p_metadata: metadata || null
        });
        
        // Transform paper_id to id for frontend compatibility
        const transformedPaper = {
            ...paper[0],
            id: paper[0].paper_id
        };
        
        res.status(201).json(transformedPaper);
    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/papers/:id
 * Get a specific paper by ID
 */
router.get('/:id', async (req, res, next) => {
    try {
        const paperId = parseInt(req.params.id);
        
        if (isNaN(paperId)) {
            return res.status(400).json({
                error: 'Invalid paper ID',
                code: 400
            });
        }
        
        const supabase = req.app.locals.supabase;
        const paper = await executeRPC(supabase, 'get_paper_by_id', {
            p_paper_id: paperId
        });
        
        if (!paper || paper.length === 0) {
            return res.status(404).json({
                error: 'Paper not found',
                code: 404
            });
        }
        
        // Transform paper_id to id for frontend compatibility
        const transformedPaper = {
            ...paper[0],
            id: paper[0].paper_id
        };
        
        res.json(transformedPaper);
    } catch (error) {
        next(error);
    }
});

/**
 * PUT /api/papers/:id
 * Update a specific paper
 */
router.put('/:id', async (req, res, next) => {
    try {
        const paperId = parseInt(req.params.id);
        const { title, authors, abstract, doi, arxiv_id, publication_date, venue, url, file_path, metadata } = req.body;
        
        if (isNaN(paperId)) {
            return res.status(400).json({
                error: 'Invalid paper ID',
                code: 400
            });
        }
        
        const supabase = req.app.locals.supabase;
        const paper = await executeRPC(supabase, 'update_paper', {
            p_paper_id: paperId,
            p_title: title || null,
            p_authors: authors || null,
            p_abstract: abstract || null,
            p_doi: doi || null,
            p_arxiv_id: arxiv_id || null,
            p_publication_date: publication_date || null,
            p_venue: venue || null,
            p_url: url || null,
            p_file_path: file_path || null,
            p_metadata: metadata || null
        });
        
        // Transform paper_id to id for frontend compatibility
        const transformedPaper = {
            ...paper[0],
            id: paper[0].paper_id
        };
        
        res.json(transformedPaper);
    } catch (error) {
        next(error);
    }
});

/**
 * DELETE /api/papers/:id
 * Delete a specific paper
 */
router.delete('/:id', async (req, res, next) => {
    try {
        const paperId = parseInt(req.params.id);
        
        if (isNaN(paperId)) {
            return res.status(400).json({
                error: 'Invalid paper ID',
                code: 400
            });
        }
        
        const supabase = req.app.locals.supabase;
        await executeRPC(supabase, 'delete_paper', {
            p_paper_id: paperId
        });
        
        res.status(204).send();
    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/papers/:id/related
 * Get papers related to a specific paper
 */
router.get('/:id/related', async (req, res, next) => {
    try {
        const paperId = parseInt(req.params.id);
        const { limit } = req.query;
        
        if (isNaN(paperId)) {
            return res.status(400).json({
                error: 'Invalid paper ID',
                code: 400
            });
        }
        
        const supabase = req.app.locals.supabase;
        const relatedPapers = await executeRPC(supabase, 'get_related_papers', {
            p_paper_id: paperId,
            p_limit: limit ? parseInt(limit) : 10
        });
        
        res.json(relatedPapers);
    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/papers/:id/arxiv
 * Get arXiv information for a specific paper
 */
router.get('/:id/arxiv', async (req, res, next) => {
    try {
        const paperId = parseInt(req.params.id);
        
        if (isNaN(paperId)) {
            return res.status(400).json({
                error: 'Invalid paper ID',
                code: 400
            });
        }
        
        const supabase = req.app.locals.supabase;
        
        // Query papers_arxiv table directly
        const { data: arxivInfo, error } = await supabase
            .from('papers_arxiv')
            .select('*')
            .eq('paper_id', paperId)
            .single();
        
        if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
            console.error('ArXiv query error:', error);
            throw error;
        }
        
        if (!arxivInfo) {
            return res.status(404).json({
                error: 'No arXiv information found for this paper',
                code: 404
            });
        }
        
        res.json(arxivInfo);
    } catch (error) {
        next(error);
    }
});

/**
 * POST /api/papers/search
 * Advanced search for papers with multiple criteria
 * TEMP FIX: Use direct SQL query to avoid schema mismatch
 */
router.post('/search', async (req, res, next) => {
    try {
        const { name, tags, limit, offset } = req.body;
        const supabase = req.app.locals.supabase;
        
        // TEMPORARY FIX: Use direct SQL query instead of RPC to avoid schema mismatch
        let query = supabase
            .from('papers')
            .select('*')
            .limit(limit || 100);
        
        if (offset) {
            query = query.range(offset, offset + (limit || 100) - 1);
        }
        
        if (name) {
            // Simple text search across title, authors, abstract
            query = query.or(`title.ilike.%${name}%,authors.ilike.%${name}%,abstract.ilike.%${name}%`);
        }
        
        // Note: Tag search would require a separate paper_tags table query
        // For now, just do basic text search
        
        const { data: papers, error } = await query;
        
        if (error) {
            console.error('Direct query error:', error);
            throw error;
        }
        
        res.json(papers || []);
    } catch (error) {
        console.error('Papers search error:', error);
        next(error);
    }
});

/**
 * POST /api/papers/search/arxiv
 * Search arXiv papers using the arXiv API
 */
router.post('/search/arxiv', async (req, res, next) => {
    try {
        const { query, categories, limit } = req.body;
        
        if (!query) {
            return res.status(400).json({
                error: 'Query is required for arXiv search',
                code: 400
            });
        }
        
        // Build arXiv search query
        let searchQuery = query;
        if (categories && categories.length > 0) {
            const catQueries = categories.map(cat => `cat:${cat}`).join(' OR ');
            searchQuery = `(${query}) AND (${catQueries})`;
        }
        
        // Search arXiv using their API
        const arxivApiUrl = `http://export.arxiv.org/api/query?search_query=${encodeURIComponent(searchQuery)}&start=0&max_results=${limit || 20}&sortBy=relevance&sortOrder=descending`;
        
        console.log('ArXiv API request:', arxivApiUrl);
        
        const response = await axios.get(arxivApiUrl, {
            timeout: 10000,
            headers: {
                'User-Agent': 'Research-Assistant/1.0'
            }
        });
        
        // Parse XML response
        const parser = new xml2js.Parser();
        const result = await parser.parseStringPromise(response.data);
        
        const entries = result.feed.entry || [];
        
        // Transform arXiv entries to our format
        const papers = entries.map(entry => {
            const authors = Array.isArray(entry.author) 
                ? entry.author.map(a => a.name[0]).join(', ')
                : (entry.author ? entry.author.name[0] : 'Unknown');
            
            const categories = Array.isArray(entry.category)
                ? entry.category.map(c => c.$.term)
                : (entry.category ? [entry.category.$.term] : []);
            
            const arxivId = entry.id[0].split('/abs/')[1] || entry.id[0];
            
            return {
                title: entry.title[0].replace(/\s+/g, ' ').trim(),
                abstract: entry.summary[0].replace(/\s+/g, ' ').trim(),
                authors: authors,
                arxiv_id: arxivId,
                categories: categories,
                primary_category: categories[0] || null,
                published_at: entry.published ? entry.published[0] : null,
                updated_at_source: entry.updated ? entry.updated[0] : null,
                source_url: entry.id[0],
                pdf_url: entry.link && entry.link.find(l => l.$.type === 'application/pdf') 
                    ? entry.link.find(l => l.$.type === 'application/pdf').$.href 
                    : `http://arxiv.org/pdf/${arxivId}.pdf`,
                doi: entry['arxiv:doi'] ? entry['arxiv:doi'][0] : null,
                journal_ref: entry['arxiv:journal_ref'] ? entry['arxiv:journal_ref'][0] : null,
                comment: entry['arxiv:comment'] ? entry['arxiv:comment'][0] : null
            };
        });
        
        res.json(papers);
    } catch (error) {
        console.error('ArXiv search error:', error.message);
        if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
            return res.status(503).json({
                error: 'ArXiv service temporarily unavailable',
                code: 503
            });
        }
        next(error);
    }
});

/**
 * POST /api/papers/arxiv
 * Create a new arXiv paper entry in the database
 * TEMP FIX: Use direct insert to avoid timestamp type mismatch
 */
router.post('/arxiv', async (req, res, next) => {
    try {
        const { 
            title, 
            abstract, 
            authors, 
            arxiv_id, 
            categories, 
            published_at, 
            updated_at_source,
            source_url,
            pdf_url,
            doi,
            journal_ref,
            comment,
            entry_id,
            custom_tags,
            paper_id  // Add paper_id to destructuring
        } = req.body;
        
        if (!title) {
            return res.status(400).json({
                error: 'title is required',
                code: 400
            });
        }
        
        const supabase = req.app.locals.supabase;
        let main_paper = null;
        
        // If paper_id is provided, link to existing paper
        if (paper_id) {
            console.log(`Linking arXiv data to existing paper ID: ${paper_id}`);
            
            // Get the existing paper
            const { data: existingPaper, error: fetchError } = await supabase
                .from('papers')
                .select('*')
                .eq('paper_id', paper_id)
                .single();
            
            if (fetchError || !existingPaper) {
                return res.status(404).json({
                    error: `Paper with ID ${paper_id} not found for linking arXiv data`,
                    code: 404
                });
            }
            
            // Update the existing paper with arXiv information
            const { data: updatedPaper, error: updateError } = await supabase
                .from('papers')
                .update({
                    arxiv_id: arxiv_id || existingPaper.arxiv_id,
                    url: source_url || existingPaper.url,
                    abstract: abstract || existingPaper.abstract
                })
                .eq('paper_id', paper_id)
                .select()
                .single();
            
            if (updateError) {
                console.error('Error updating main paper:', updateError);
                return res.status(500).json({
                    error: 'Failed to update existing paper with arXiv data',
                    details: updateError.message
                });
            }
            
            main_paper = updatedPaper;
        } else {
            // Create new paper entry
            console.log('Creating new paper entry for arXiv data');
            
            const tags = ['arxiv'];
            if (categories && categories.length > 0) {
                tags.push(...categories.map(cat => `arxiv:${cat}`));
            }
            if (custom_tags && custom_tags.length > 0) {
                tags.push(...custom_tags);
            }
            
            const { data: newPaper, error: paperError } = await supabase
                .from('papers')
                .insert({
                    title: title,
                    authors: authors || 'Unknown',
                    abstract: abstract || '',
                    doi: doi || null,
                    arxiv_id: arxiv_id,
                    url: source_url
                })
                .select()
                .single();
            
            if (paperError) {
                console.error('Error creating new paper:', paperError);
                return res.status(500).json({
                    error: 'Failed to create new paper entry',
                    details: paperError.message
                });
            }
            
            main_paper = newPaper;
        }
        
        // Now create arXiv entry linked to the paper
        try {
            const arxivData = {
                paper_id: main_paper.paper_id,  // Link to the paper (existing or new)
                title: title,
                authors: authors || 'Unknown',
                abstract: abstract || '',
                arxiv_id: arxiv_id,
                categories: categories || [],
                published_at: published_at ? new Date(published_at).toISOString() : null,
                updated_at_source: updated_at_source ? new Date(updated_at_source).toISOString() : null,
                source_url: source_url || '',
                pdf_url: pdf_url || '',
                doi: doi || '',
                journal_ref: journal_ref || '',
                comment: comment || '',
                entry_id: entry_id || ''
            };
            
            const { data: arxivPaper, error: arxivError } = await supabase
                .from('papers_arxiv')
                .insert(arxivData)
                .select()
                .single();
            
            if (arxivError) {
                console.error('Error creating arXiv entry:', arxivError);
                return res.status(500).json({
                    error: 'Failed to create arXiv entry',
                    details: arxivError.message
                });
            }
            
            console.log('Successfully saved to arXiv table:', arxivPaper);
            
            res.status(201).json({
                ...main_paper,
                arxiv_data: arxivPaper,
                arxiv_note: `ArXiv ID: ${arxiv_id || 'N/A'}${comment ? '\\nComment: ' + comment : ''}`,
                paper_arxiv_linked: true,
                operation: paper_id ? 'linked_existing' : 'created_new'
            });
            
        } catch (arxivErr) {
            console.error('Error in arXiv table operation:', arxivErr);
            
            // If arXiv table insertion fails but we created a new paper, still return the paper
            if (!paper_id) {
                res.status(201).json({
                    ...main_paper,
                    arxiv_id: arxiv_id,
                    arxiv_note: `ArXiv ID: ${arxiv_id || 'N/A'} (arXiv table insert failed)`,
                    paper_arxiv_linked: false,
                    operation: 'created_new_arxiv_failed'
                });
            } else {
                return res.status(500).json({
                    error: 'Failed to create arXiv entry for existing paper',
                    details: arxivErr.message
                });
            }
        }
        
    } catch (error) {
        console.error('Create arXiv paper error:', error);
        next(error);
    }
});

// =====================================================
// SESSION-PAPER ASSOCIATION ROUTES
// =====================================================

/**
 * GET /api/papers/sessions/:sessionId
 * Get papers linked to a specific session
 */
router.get('/sessions/:sessionId', async (req, res, next) => {
    try {
        const sessionId = parseInt(req.params.sessionId);
        
        if (isNaN(sessionId)) {
            return res.status(400).json({
                error: 'Invalid session ID',
                code: 400
            });
        }
        
        const supabase = req.app.locals.supabase;
        const papers = await executeRPC(supabase, 'get_session_papers', {
            p_session_id: sessionId
        });
        
        // Transform paper_id to id for frontend compatibility
        const transformedPapers = papers.map(paper => ({
            ...paper,
            id: paper.paper_id
        }));
        
        res.json(transformedPapers);
    } catch (error) {
        next(error);
    }
});

/**
 * POST /api/papers/sessions/:sessionId/:paperId
 * Link a paper to a session and automatically trigger RAG processing
 */
router.post('/sessions/:sessionId/:paperId', async (req, res, next) => {
    try {
        const sessionId = parseInt(req.params.sessionId);
        const paperId = parseInt(req.params.paperId);
        
        if (isNaN(sessionId) || isNaN(paperId)) {
            return res.status(400).json({
                error: 'Invalid session ID or paper ID',
                code: 400
            });
        }

        const supabase = req.app.locals.supabase;
        
        // First, link the paper to the session
        await executeRPC(supabase, 'add_paper_to_session', {
            p_session_id: sessionId,
            p_paper_id: paperId
        });
        
        // Auto-trigger RAG processing if paper has a PDF URL and RAG is enabled for the session
        let ragProcessingTriggered = false;
        try {
            // Check if session has RAG enabled
            const ragStatus = await executeRPC(supabase, 'get_session_rag_status', {
                p_session_id: sessionId
            });
            
            if (ragStatus && ragStatus.is_rag_enabled) {
                // Get paper details to check if it has a PDF URL
                const paper = await executeRPC(supabase, 'get_paper_by_id', {
                    p_paper_id: paperId
                });
                
                if (paper && (paper.pdf_url || paper.url || paper.pdf_path)) {
                    // Trigger automatic download and RAG processing
                    const fastApiUrl = process.env.FASTAPI_URL || 'http://fastapi-ai-server:8000';
                    
                    // Use the best available URL for PDF (prioritize pdf_url, then url, then pdf_path)
                    const pdfUrl = paper.pdf_url || paper.url || paper.pdf_path;
                    
                    // Call FastAPI to download and process the paper
                    const ragResponse = await fetch(`${fastApiUrl}/api/v1/session-rag/${sessionId}/papers/auto-process`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            paper_id: paperId,
                            pdf_url: pdfUrl,
                            title: paper.title,
                            authors: paper.authors
                        })
                    });
                    
                    if (ragResponse.ok) {
                        console.log(`Successfully triggered RAG processing for paper ${paperId} in session ${sessionId}`);
                        ragProcessingTriggered = true;
                    } else {
                        console.warn(`Failed to trigger RAG processing for paper ${paperId}: ${ragResponse.status}`);
                    }
                } else {
                    console.log(`Paper ${paperId} has no PDF URL, skipping RAG processing`);
                }
            } else {
                console.log(`RAG not enabled for session ${sessionId}, skipping automatic processing`);
            }
        } catch (ragError) {
            // Don't fail the paper linking if RAG processing fails
            console.error('Failed to trigger automatic RAG processing:', ragError);
        }
        
        res.status(201).json({ 
            message: 'Paper linked to session successfully',
            rag_processing_triggered: ragProcessingTriggered
        });
    } catch (error) {
        next(error);
    }
});

/**
 * DELETE /api/papers/sessions/:sessionId/:paperId
 * Remove paper from session
 */
router.delete('/sessions/:sessionId/:paperId', async (req, res, next) => {
    try {
        const sessionId = parseInt(req.params.sessionId);
        const paperId = parseInt(req.params.paperId);
        
        if (isNaN(sessionId) || isNaN(paperId)) {
            return res.status(400).json({
                error: 'Invalid session ID or paper ID',
                code: 400
            });
        }
        
        const supabase = req.app.locals.supabase;
        await executeRPC(supabase, 'remove_paper_from_session', {
            p_session_id: sessionId,
            p_paper_id: paperId
        });
        
        res.status(204).send();
    } catch (error) {
        next(error);
    }
});

module.exports = router;