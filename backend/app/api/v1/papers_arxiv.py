"""
Papers endpoints for arXiv integration in FastAPI
"""
from fastapi import APIRouter, HTTPException, Query
from typing import List, Optional
from pydantic import BaseModel
import logging

from app.services.arxiv_service import ArxivService, ArxivPaper

logger = logging.getLogger(__name__)

router = APIRouter()

class ArxivSearchRequest(BaseModel):
    """Request model for arXiv search"""
    query: str
    max_results: Optional[int] = 10
    categories: Optional[List[str]] = None

class ArxivSearchResponse(BaseModel):
    """Response model for arXiv search"""
    papers: List[ArxivPaper]
    total_found: int
    query: str

@router.get("/search-arxiv", response_model=ArxivSearchResponse)
async def search_arxiv_papers(
    query: str = Query(..., description="Search query for arXiv papers"),
    max_results: int = Query(10, ge=1, le=100, description="Maximum number of results"),
    categories: Optional[str] = Query(None, description="Comma-separated list of arXiv categories")
):
    """
    Search for papers on arXiv
    
    - **query**: Search terms (keywords, titles, authors)
    - **max_results**: Maximum number of papers to return (1-100)
    - **categories**: Optional comma-separated arXiv categories (e.g., "cs.AI,cs.LG")
    """
    try:
        logger.info(f"Searching arXiv: query='{query}', max_results={max_results}")
        
        # Parse categories if provided
        category_list = None
        if categories:
            category_list = [cat.strip() for cat in categories.split(',') if cat.strip()]
        
        # Search arXiv
        papers = ArxivService.search_papers(
            query=query,
            max_results=max_results,
            categories=category_list
        )
        
        response = ArxivSearchResponse(
            papers=papers,
            total_found=len(papers),
            query=query
        )
        
        logger.info(f"Successfully found {len(papers)} papers for query: {query}")
        return response
        
    except Exception as e:
        logger.error(f"Error searching arXiv: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to search arXiv: {str(e)}"
        )

@router.get("/arxiv/{arxiv_id}", response_model=ArxivPaper)
async def get_arxiv_paper(arxiv_id: str):
    """
    Get a specific paper by arXiv ID
    
    - **arxiv_id**: arXiv identifier (e.g., "2301.07041")
    """
    try:
        logger.info(f"Fetching arXiv paper: {arxiv_id}")
        
        paper = ArxivService.get_paper_by_id(arxiv_id)
        
        if not paper:
            raise HTTPException(
                status_code=404,
                detail=f"Paper not found: {arxiv_id}"
            )
        
        logger.info(f"Successfully retrieved paper: {arxiv_id}")
        return paper
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching arXiv paper {arxiv_id}: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch paper {arxiv_id}: {str(e)}"
        )

@router.get("/categories")
async def get_arxiv_categories():
    """
    Get list of popular arXiv categories
    
    Returns a list of category codes and names for filtering searches
    """
    try:
        categories = ArxivService.get_popular_categories()
        return {
            "categories": categories,
            "total": len(categories)
        }
    except Exception as e:
        logger.error(f"Error getting arXiv categories: {e}")
        raise HTTPException(
            status_code=500,
            detail="Failed to get arXiv categories"
        )

@router.get("/health")
async def papers_health_check():
    """Health check for papers service"""
    return {
        "status": "healthy",
        "service": "papers",
        "features": ["arxiv_search", "arxiv_fetch", "categories"]
    }