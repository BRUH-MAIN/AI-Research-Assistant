"""
Paper Tags endpoints router
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.postgres_manager.db import get_db
from app.db.postgres_manager.managers.paper_tags import PaperTagManager
from app.db.postgres_manager.models.paper_tag import PaperTag
from app.db.postgres_manager.schemas import PaperTagRead as PaperTagSchema
from typing import List

router = APIRouter()

@router.get("/paper/{paper_id}", response_model=List[PaperTagSchema])
def get_tags_by_paper(paper_id: int, db: Session = Depends(get_db)):
    tags = PaperTagManager.get_tags_by_paper(db, paper_id)
    return [PaperTagSchema.model_validate(tag) for tag in tags]

@router.get("/tag/{tag}", response_model=List[PaperTagSchema])
def get_papers_by_tag(tag: str, db: Session = Depends(get_db)):
    papers = PaperTagManager.get_papers_by_tag(db, tag)
    return [PaperTagSchema.model_validate(paper) for paper in papers]

@router.post("/", response_model=PaperTagSchema)
def create_paper_tag(paper_id: int, tag: str, db: Session = Depends(get_db)):
    paper_tag = PaperTagManager.create_paper_tag(db, paper_id, tag)
    return PaperTagSchema.model_validate(paper_tag)

@router.delete("/{paper_id}/{tag}", response_model=PaperTagSchema)
def delete_paper_tag(paper_id: int, tag: str, db: Session = Depends(get_db)):
    paper_tag = PaperTagManager.delete_paper_tag(db, paper_id, tag)
    if not paper_tag:
        raise HTTPException(status_code=404, detail="Paper tag not found")
    return PaperTagSchema.model_validate(paper_tag)
