"""
ArXiv service for fetching and parsing research papers
"""
import arxiv
import logging
from typing import List, Dict, Any, Optional
from datetime import datetime
from pydantic import BaseModel

logger = logging.getLogger(__name__)

class ArxivPaper(BaseModel):
    """Standard paper format for arXiv papers"""
    arxiv_id: str
    title: str
    abstract: str
    authors: List[str]
    categories: List[str]
    published_date: datetime
    updated_date: datetime
    pdf_url: str
    entry_id: str
    doi: Optional[str] = None
    journal_ref: Optional[str] = None
    comment: Optional[str] = None

class ArxivService:
    """Service for interacting with arXiv API"""
    
    @staticmethod
    def search_papers(
        query: str,
        max_results: int = 10,
        sort_by: arxiv.SortCriterion = arxiv.SortCriterion.Relevance,
        sort_order: arxiv.SortOrder = arxiv.SortOrder.Descending,
        categories: Optional[List[str]] = None
    ) -> List[ArxivPaper]:
        """
        Search for papers on arXiv
        
        Args:
            query: Search query string
            max_results: Maximum number of results to return
            sort_by: Sort criterion (Relevance, LastUpdatedDate, SubmittedDate)
            sort_order: Sort order (Ascending, Descending)
            categories: List of arXiv categories to filter by (e.g., ['cs.AI', 'cs.LG'])
        
        Returns:
            List of ArxivPaper objects
        """
        try:
            # Build search query with categories if provided
            search_query = query
            if categories:
                category_query = " OR ".join([f"cat:{cat}" for cat in categories])
                search_query = f"({query}) AND ({category_query})"
            
            logger.info(f"Searching arXiv with query: {search_query}")
            
            # Create search object
            search = arxiv.Search(
                query=search_query,
                max_results=max_results,
                sort_by=sort_by,
                sort_order=sort_order
            )
            
            papers = []
            for result in search.results():
                try:
                    paper = ArxivService._parse_arxiv_result(result)
                    if paper:
                        papers.append(paper)
                except Exception as e:
                    logger.error(f"Error parsing arXiv result: {e}")
                    continue
            
            logger.info(f"Successfully retrieved {len(papers)} papers from arXiv")
            return papers
            
        except Exception as e:
            logger.error(f"Error searching arXiv: {e}")
            raise Exception(f"Failed to search arXiv: {str(e)}")
    
    @staticmethod
    def get_paper_by_id(arxiv_id: str) -> Optional[ArxivPaper]:
        """
        Get a specific paper by arXiv ID
        
        Args:
            arxiv_id: arXiv ID (e.g., "2301.07041" or "cs.AI/0001001")
        
        Returns:
            ArxivPaper object or None if not found
        """
        try:
            logger.info(f"Fetching arXiv paper: {arxiv_id}")
            
            # Clean the arXiv ID (remove version if present)
            clean_id = arxiv_id.split('v')[0] if 'v' in arxiv_id else arxiv_id
            
            search = arxiv.Search(id_list=[clean_id])
            
            for result in search.results():
                return ArxivService._parse_arxiv_result(result)
            
            logger.warning(f"Paper not found: {arxiv_id}")
            return None
            
        except Exception as e:
            logger.error(f"Error fetching arXiv paper {arxiv_id}: {e}")
            raise Exception(f"Failed to fetch paper {arxiv_id}: {str(e)}")
    
    @staticmethod
    def _parse_arxiv_result(result: arxiv.Result) -> ArxivPaper:
        """
        Parse an arXiv result into our standard format
        
        Args:
            result: arXiv Result object
        
        Returns:
            ArxivPaper object
        """
        try:
            # Extract arXiv ID from entry_id
            arxiv_id = result.entry_id.split('/')[-1]
            
            # Get author names
            authors = [author.name for author in result.authors]
            
            # Get categories
            categories = result.categories
            
            paper = ArxivPaper(
                arxiv_id=arxiv_id,
                title=result.title.strip(),
                abstract=result.summary.strip(),
                authors=authors,
                categories=categories,
                published_date=result.published,
                updated_date=result.updated,
                pdf_url=result.pdf_url,
                entry_id=result.entry_id,
                doi=result.doi,
                journal_ref=result.journal_ref,
                comment=result.comment
            )
            
            return paper
            
        except Exception as e:
            logger.error(f"Error parsing arXiv result: {e}")
            raise Exception(f"Failed to parse arXiv result: {str(e)}")
    
    @staticmethod
    def get_popular_categories() -> List[Dict[str, str]]:
        """
        Get list of popular arXiv categories
        
        Returns:
            List of category dictionaries with 'code' and 'name'
        """
        return [
            {"code": "cs.AI", "name": "Artificial Intelligence"},
            {"code": "cs.LG", "name": "Machine Learning"},
            {"code": "cs.CL", "name": "Computation and Language"},
            {"code": "cs.CV", "name": "Computer Vision and Pattern Recognition"},
            {"code": "cs.NE", "name": "Neural and Evolutionary Computing"},
            {"code": "cs.IR", "name": "Information Retrieval"},
            {"code": "cs.RO", "name": "Robotics"},
            {"code": "stat.ML", "name": "Machine Learning (Statistics)"},
            {"code": "math.ST", "name": "Statistics Theory"},
            {"code": "physics.data-an", "name": "Data Analysis, Statistics and Probability"},
            {"code": "q-bio.QM", "name": "Quantitative Methods"},
            {"code": "econ.EM", "name": "Econometrics"},
        ]
