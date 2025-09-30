// Paper routes - Express.js implementation using Supabase RPC
const express = require('express');
const axios = require('axios');
const router = express.Router();

// FastAPI configuration
const FASTAPI_URL = process.env.FASTAPI_URL || 'http://localhost:8000';

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
        
        res.json(papers);
    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/papers/search-arxiv
 * Search arXiv papers via FastAPI and optionally store in Supabase
 */
router.get('/search-arxiv', async (req, res, next) => {
    try {
        const { query, max_results = 10, categories, store = 'false' } = req.query;
        
        if (!query) {
            return res.status(400).json({ 
                error: 'Query parameter is required' 
            });
        }
        
        console.log(`Searching arXiv via FastAPI: query="${query}", max_results=${max_results}`);
        
        // Call FastAPI to search arXiv
        const fastapiResponse = await axios.get(`${FASTAPI_URL}/api/v1/papers/search-arxiv`, {
            params: {
                query,
                max_results: parseInt(max_results),
                categories
            },
            timeout: 30000 // 30 second timeout
        });
        
        const arxivData = fastapiResponse.data;
        const papers = arxivData.papers;
        
        console.log(`FastAPI returned ${papers.length} papers`);
        
        // If store=true, save papers to Supabase
        if (store.toLowerCase() === 'true' && papers.length > 0) {
            console.log('Storing papers in Supabase...');
            const supabase = req.app.locals.supabase;
            const storedPapers = [];
            
            for (const paper of papers) {
                try {
                    // Check if paper already exists by title (since arxiv_id is not in schema)
                    const existing = await executeRPC(supabase, 'search_papers', {
                        p_query_text: paper.title,
                        p_limit_count: 5
                    });
                    
                    // Check if any result matches exactly by title
                    const exactMatch = existing?.find(p => 
                        p.title.toLowerCase().trim() === paper.title.toLowerCase().trim()
                    );
                    
                    if (exactMatch) {
                        console.log(`Paper "${paper.title}" already exists, skipping`);
                        storedPapers.push(exactMatch);
                        continue;
                    }
                    
                    // Convert arXiv data to match schema
                    const paperData = {
                        p_title: paper.title,
                        p_abstract: paper.abstract,
                        p_authors: Array.isArray(paper.authors) ? paper.authors.join(', ') : paper.authors,
                        p_doi: paper.doi || null,
                        p_published_at: paper.published_date ? new Date(paper.published_date).toISOString() : null,
                        p_source_url: `${paper.pdf_url} (arXiv:${paper.arxiv_id})`
                    };
                    
                    // Store new paper
                    const storedPaper = await executeRPC(supabase, 'create_paper', paperData);
                    
                    if (storedPaper && storedPaper.length > 0) {
                        storedPapers.push(storedPaper[0]);
                        console.log(`Stored paper: ${paper.title}`);
                    }
                } catch (storeError) {
                    console.error(`Error storing paper "${paper.title}":`, storeError);
                    // Continue with other papers
                }
            }
            
            console.log(`Successfully stored ${storedPapers.length} papers`);
            
            // Return the stored papers with database IDs
            res.json({
                ...arxivData,
                papers: storedPapers,
                stored_count: storedPapers.length,
                source: 'arxiv_with_storage'
            });
        } else {
            // Return papers without storing
            res.json({
                ...arxivData,
                source: 'arxiv_direct'
            });
        }
        
    } catch (error) {
        console.error('Error in arXiv search:', error);
        
        if (error.code === 'ECONNREFUSED' || error.response?.status >= 500) {
            res.status(503).json({ 
                error: 'FastAPI service unavailable',
                details: error.message 
            });
        } else if (error.response?.status === 400) {
            res.status(400).json({ 
                error: 'Invalid request to arXiv service',
                details: error.response.data 
            });
        } else {
            next(error);
        }
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
        
        res.status(201).json(paper[0]);
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
        
        res.json(paper[0]);
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
        
        res.json(paper[0]);
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

module.exports = router;