from fastapi import APIRouter, HTTPException, status, Query
from typing import List, Optional
from ...db.models import Paper

router = APIRouter()

# PAPER ENDPOINTS
@router.get("/", response_model=List[dict])
async def get_papers():
    """Get all papers"""
    try:
        return Paper.get_all()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_paper(paper: dict):
    """Create a new paper"""
    try:
        title = paper.get("title")
        if not title:
            raise HTTPException(status_code=400, detail="Title is required")
        
        abstract = paper.get("abstract")
        authors = paper.get("authors")
        doi = paper.get("doi")
        published_at = paper.get("published_at")
        source_url = paper.get("source_url")
        
        new_paper = Paper.create(
            title=title,
            abstract=abstract,
            authors=authors,
            doi=doi,
            published_at=published_at,
            source_url=source_url
        )
        
        if not new_paper:
            raise HTTPException(status_code=500, detail="Failed to create paper")
        
        return new_paper
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@router.get("/search")
async def search_papers(
    query: str = Query(..., description="Search query for title, abstract, or authors"),
    limit: int = Query(50, description="Maximum number of results to return")
):
    """Search papers by title, abstract, or authors"""
    try:
        return Paper.search(query, limit)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@router.get("/{paper_id}")
async def get_paper(paper_id: int):
    """Get a specific paper by ID"""
    try:
        paper = Paper.get_by_id(paper_id)
        if not paper:
            raise HTTPException(status_code=404, detail="Paper not found")
        return paper
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@router.put("/{paper_id}")
async def update_paper(paper_id: int, paper: dict):
    """Update a specific paper"""
    try:
        # Check if paper exists
        existing_paper = Paper.get_by_id(paper_id)
        if not existing_paper:
            raise HTTPException(status_code=404, detail="Paper not found")
        
        # Prepare update data
        update_data = {}
        for field in ["title", "abstract", "authors", "doi", "published_at", "source_url"]:
            if field in paper:
                update_data[field] = paper[field]
        
        updated_paper = Paper.update(paper_id, **update_data)
        if not updated_paper:
            raise HTTPException(status_code=500, detail="Failed to update paper")
        
        return updated_paper
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@router.delete("/{paper_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_paper(paper_id: int):
    """Delete a specific paper"""
    try:
        # Check if paper exists
        existing_paper = Paper.get_by_id(paper_id)
        if not existing_paper:
            raise HTTPException(status_code=404, detail="Paper not found")
        
        success = Paper.delete(paper_id)
        if not success:
            raise HTTPException(status_code=500, detail="Failed to delete paper")
        
        return None
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

# PAPER TAGS ENDPOINTS
@router.get("/{paper_id}/tags")
async def get_paper_tags(paper_id: int):
    """Get tags for a specific paper"""
    try:
        # Check if paper exists
        paper = Paper.get_by_id(paper_id)
        if not paper:
            raise HTTPException(status_code=404, detail="Paper not found")
        
        return Paper.get_tags(paper_id)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@router.post("/{paper_id}/tags", status_code=status.HTTP_201_CREATED)
async def add_paper_tags(paper_id: int, tags: dict):
    """Add tags to a specific paper"""
    try:
        # Check if paper exists
        paper = Paper.get_by_id(paper_id)
        if not paper:
            raise HTTPException(status_code=404, detail="Paper not found")
        
        tag_list = tags.get("tags", [])
        if not tag_list:
            raise HTTPException(status_code=400, detail="Tags list is required")
        
        success = Paper.add_tags(paper_id, tag_list)
        if not success:
            raise HTTPException(status_code=500, detail="Failed to add tags")
        
        return {"message": f"Added {len(tag_list)} tags to paper {paper_id}"}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@router.delete("/{paper_id}/tags/{tag}")
async def remove_paper_tag(paper_id: int, tag: str):
    """Remove a specific tag from a paper"""
    try:
        # Check if paper exists
        paper = Paper.get_by_id(paper_id)
        if not paper:
            raise HTTPException(status_code=404, detail="Paper not found")
        
        success = Paper.remove_tag(paper_id, tag)
        if not success:
            raise HTTPException(status_code=404, detail="Tag not found for this paper")
        
        return {"message": f"Removed tag '{tag}' from paper {paper_id}"}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

# SESSION-PAPER RELATIONSHIP ENDPOINTS
@router.get("/sessions/{session_id}")
async def get_session_papers(session_id: int):
    """Get papers linked to a specific session"""
    try:
        return Paper.get_by_session(session_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

# WORKFLOW: Search and Load More from arXiv
import requests
import os

@router.get("/workflow_search")
async def workflow_search(query: str = Query(...), limit: int = Query(10), offset: int = Query(0)):
    """Search papers by name or tag in Postgres (case-insensitive LIKE)"""
    try:
        # Use LIKE for both title and tags, case-insensitive
        results = Paper.search(query, limit)
        return results[offset:offset+limit]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@router.get("/arxiv_load_more")
async def arxiv_load_more(query: str = Query(...), offset: int = Query(0)):
    """Load more papers from arXiv, store top 10 in Postgres, and return them"""
    try:
        ARXIV_API = "http://export.arxiv.org/api/query"
        params = {
            "search_query": f"all:{query}",
            "start": offset,
            "max_results": 10
        }
        response = requests.get(ARXIV_API, params=params)
        if response.status_code != 200:
            raise HTTPException(status_code=502, detail="Failed to fetch from arXiv")
        # Parse arXiv Atom XML
        import xml.etree.ElementTree as ET
        root = ET.fromstring(response.text)
        ns = {'atom': 'http://www.w3.org/2005/Atom'}
        papers = []
        for entry in root.findall('atom:entry', ns):
            title = entry.find('atom:title', ns).text.strip()
            abstract = entry.find('atom:summary', ns).text.strip()
            authors = ', '.join([a.find('atom:name', ns).text for a in entry.findall('atom:author', ns)])
            published_at = entry.find('atom:published', ns).text
            source_url = entry.find('atom:id', ns).text
            # Store in Postgres
            paper = Paper.create(title=title, abstract=abstract, authors=authors, published_at=published_at, source_url=source_url)
            papers.append(paper)
        return papers
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"arXiv error: {str(e)}")

@router.post("/sessions/{session_id}/{paper_id}", status_code=status.HTTP_201_CREATED)
async def add_paper_to_session(session_id: int, paper_id: int):
    """Link a paper to a session"""
    try:
        # Check if paper exists
        paper = Paper.get_by_id(paper_id)
        if not paper:
            raise HTTPException(status_code=404, detail="Paper not found")

        success = Paper.add_to_session(session_id, paper_id)
        if not success:
            raise HTTPException(status_code=409, detail="Paper already linked to session or session not found")
        
        return {"message": f"Added paper {paper_id} to session {session_id}"}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@router.delete("/sessions/{session_id}/{paper_id}")
async def remove_paper_from_session(session_id: int, paper_id: int):
    """Remove paper from session"""
    try:
        success = Paper.remove_from_session(session_id, paper_id)
        if not success:
            raise HTTPException(status_code=404, detail="Paper not found in session")
        
        return {"message": f"Removed paper {paper_id} from session {session_id}"}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
