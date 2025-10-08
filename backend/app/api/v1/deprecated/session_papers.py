"""
Session Papers endpoints router
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.postgres_manager.db import get_db
from app.db.postgres_manager.managers.session_papers import SessionPaperManager
from app.db.postgres_manager.models.session_paper import SessionPaper
from app.db.postgres_manager.schemas import SessionPaperRead as SessionPaperSchema
from typing import List

router = APIRouter()

@router.get("/session/{session_id}", response_model=List[SessionPaperSchema])
def get_papers_by_session(session_id: int, db: Session = Depends(get_db)):
    papers = SessionPaperManager.get_papers_by_session(db, session_id)
    return [SessionPaperSchema.model_validate(paper) for paper in papers]

@router.get("/paper/{paper_id}", response_model=List[SessionPaperSchema])
def get_sessions_by_paper(paper_id: int, db: Session = Depends(get_db)):
    sessions = SessionPaperManager.get_sessions_by_paper(db, paper_id)
    return [SessionPaperSchema.model_validate(session) for session in sessions]

@router.post("/", response_model=SessionPaperSchema)
def create_session_paper(session_id: int, paper_id: int, db: Session = Depends(get_db)):
    session_paper = SessionPaperManager.create_session_paper(db, session_id, paper_id)
    return SessionPaperSchema.model_validate(session_paper)

@router.delete("/{session_id}/{paper_id}", response_model=SessionPaperSchema)
def delete_session_paper(session_id: int, paper_id: int, db: Session = Depends(get_db)):
    session_paper = SessionPaperManager.delete_session_paper(db, session_id, paper_id)
    if not session_paper:
        raise HTTPException(status_code=404, detail="Session paper not found")
    return SessionPaperSchema.model_validate(session_paper)
