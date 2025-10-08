// Paper routes - Express.js implementation using Supabase RPC
const express = require('express');
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
        
        res.json(papers);
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