"""
Papers endpoints router with enhanced search functionality
"""
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from app.db.postgres_manager.db import get_db
from app.db.postgres_manager.managers.papers import PaperManager
from app.db.postgres_manager.models.paper import Paper
from app.db.postgres_manager.schemas import (
    PaperRead, PaperWithTags, PaperSearchRequest, 
    PaperSearchResult, ArxivPaperDownload
)
from app.services.arxiv_service import ArxivService
from typing import List
from datetime import datetime
import os

router = APIRouter()

@router.get("/", response_model=List[PaperRead])
def get_papers(db: Session = Depends(get_db)):
    """Get all papers"""
    papers = db.query(Paper).all()
    return [PaperRead.model_validate(paper) for paper in papers]

@router.get("/{paper_id}", response_model=PaperWithTags)
def get_paper(paper_id: int, db: Session = Depends(get_db)):
    """Get a specific paper with its tags"""
    paper, tags = PaperManager.get_paper_with_tags(db, paper_id)
    if not paper:
        raise HTTPException(status_code=404, detail="Paper not found")
    
    paper_dict = PaperRead.model_validate(paper).model_dump()
    paper_dict["tags"] = tags
    return PaperWithTags(**paper_dict)

@router.get("/doi/{doi}", response_model=PaperWithTags)
def get_paper_by_doi(doi: str, db: Session = Depends(get_db)):
    """Get paper by DOI with tags"""
    paper = PaperManager.get_paper_by_doi(db, doi)
    if not paper:
        raise HTTPException(status_code=404, detail="Paper not found")
    
    _, tags = PaperManager.get_paper_with_tags(db, paper.paper_id)
    paper_dict = PaperRead.model_validate(paper).model_dump()
    paper_dict["tags"] = tags
    return PaperWithTags(**paper_dict)

@router.post("/search", response_model=PaperSearchResult)
def search_papers(search_request: PaperSearchRequest, db: Session = Depends(get_db)):
    """
    Search for papers by name and/or tags
    First searches local database, then ArXiv if no results found
    """
    # Search in local database first
    db_papers = PaperManager.search_papers_by_name_and_tags(
        db, 
        name=search_request.name, 
        tags=search_request.tags
    )
    
    # Convert to PaperWithTags
    papers_with_tags = []
    for paper in db_papers:
        _, tags = PaperManager.get_paper_with_tags(db, paper.paper_id)
        paper_dict = PaperRead.model_validate(paper).model_dump()
        paper_dict["tags"] = tags
        papers_with_tags.append(PaperWithTags(**paper_dict))
    
    result = PaperSearchResult(
        found_in_db=len(papers_with_tags) > 0,
        papers=papers_with_tags
    )
    
    # If no results in database, search ArXiv
    if not papers_with_tags and search_request.name:
        try:
            arxiv_query = search_request.name
            if search_request.tags:
                # Map common tags to ArXiv categories
                arxiv_cats = []
                for tag in search_request.tags:
                    if tag.lower() in ['ai', 'artificial intelligence']:
                        arxiv_cats.append('cs.AI')
                    elif tag.lower() in ['ml', 'machine learning']:
                        arxiv_cats.append('cs.LG')
                    elif tag.lower() in ['nlp', 'natural language processing']:
                        arxiv_cats.append('cs.CL')
                    elif tag.lower() in ['cv', 'computer vision']:
                        arxiv_cats.append('cs.CV')
                    elif tag.lower() in ['physics']:
                        arxiv_cats.append('physics')
                    else:
                        # Try to use the tag as is
                        arxiv_cats.append(tag)
                
                if arxiv_cats:
                    arxiv_results = ArxivService.search_by_title_and_tags(
                        search_request.name, arxiv_cats
                    )
                else:
                    arxiv_results = ArxivService.search_papers(arxiv_query)
            else:
                arxiv_results = ArxivService.search_papers(arxiv_query)
            
            result.arxiv_results = arxiv_results
            
        except Exception as e:
            # If ArXiv search fails, just return database results
            result.arxiv_results = []
    
    return result

@router.post("/download-from-arxiv", response_model=PaperWithTags)
def download_paper_from_arxiv(
    download_request: ArxivPaperDownload, 
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """
    Download a paper from ArXiv and add it to the database
    """
    try:
        # Get paper metadata from ArXiv
        paper_info = ArxivService.get_paper_by_id(download_request.arxiv_id)
        if not paper_info:
            raise HTTPException(status_code=404, detail="Paper not found on ArXiv")
        
        # Check if paper already exists in database (by DOI or source_url)
        existing_paper = None
        if paper_info.get("doi"):
            existing_paper = PaperManager.get_paper_by_doi(db, paper_info["doi"])
        
        if not existing_paper:
            # Check by source URL
            existing_papers = db.query(Paper).filter(
                Paper.source_url == paper_info["source_url"]
            ).first()
            existing_paper = existing_papers
        
        if existing_paper:
            # Paper already exists, just add new tags if provided
            if download_request.add_tags:
                PaperManager.add_tags_to_paper(
                    db, existing_paper.paper_id, download_request.add_tags
                )
            
            _, tags = PaperManager.get_paper_with_tags(db, existing_paper.paper_id)
            paper_dict = PaperRead.model_validate(existing_paper).model_dump()
            paper_dict["tags"] = tags
            return PaperWithTags(**paper_dict)
        
        # Create new paper in database
        published_at = None
        if paper_info.get("published_at"):
            try:
                published_at = datetime.fromisoformat(paper_info["published_at"].replace('Z', '+00:00'))
            except:
                pass
        
        new_paper = PaperManager.create_paper(
            db,
            title=paper_info["title"],
            abstract=paper_info["abstract"],
            authors=paper_info["authors"],
            doi=paper_info.get("doi"),
            source_url=paper_info["source_url"],
            published_at=published_at
        )
        
        # Add tags
        tags_to_add = []
        if paper_info.get("categories"):
            tags_to_add.extend(paper_info["categories"])
        if download_request.add_tags:
            tags_to_add.extend(download_request.add_tags)
        
        if tags_to_add:
            PaperManager.add_tags_to_paper(db, new_paper.paper_id, tags_to_add)
        
        # Schedule background download of PDF
        background_tasks.add_task(
            download_pdf_background, 
            download_request.arxiv_id
        )
        
        # Return paper with tags
        _, tags = PaperManager.get_paper_with_tags(db, new_paper.paper_id)
        paper_dict = PaperRead.model_validate(new_paper).model_dump()
        paper_dict["tags"] = tags
        return PaperWithTags(**paper_dict)
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error downloading paper: {str(e)}")

def download_pdf_background(arxiv_id: str):
    """Background task to download PDF"""
    try:
        ArxivService.download_paper(arxiv_id)
    except Exception as e:
        print(f"Failed to download PDF for {arxiv_id}: {str(e)}")

@router.post("/", response_model=PaperRead)
def create_paper(
    title: str, 
    abstract: str = None, 
    authors: str = None, 
    doi: str = None, 
    source_url: str = None, 
    db: Session = Depends(get_db)
):
    """Create a new paper manually"""
    paper = PaperManager.create_paper(db, title, abstract, authors, doi, source_url)
    return PaperRead.model_validate(paper)

@router.delete("/{paper_id}", response_model=PaperRead)
def delete_paper(paper_id: int, db: Session = Depends(get_db)):
    """Delete a paper"""
    paper = PaperManager.delete_paper(db, paper_id)
    if not paper:
        raise HTTPException(status_code=404, detail="Paper not found")
    return PaperRead.model_validate(paper)
