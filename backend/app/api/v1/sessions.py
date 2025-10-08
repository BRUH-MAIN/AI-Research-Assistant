"""
Session endpoints router
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.postgres_manager.db import get_db
from app.db.postgres_manager.managers.sessions import SessionManager
from app.db.postgres_manager.models.session import Session
from app.db.postgres_manager.schemas import SessionRead as SessionSchema
from typing import List

router = APIRouter()

@router.get("/", response_model=List[SessionSchema])
def get_sessions(db: Session = Depends(get_db)):
    sessions = db.query(Session).all()
    return [SessionSchema.model_validate(session) for session in sessions]

@router.get("/{session_id}", response_model=SessionSchema)
def get_session(session_id: int, db: Session = Depends(get_db)):
    session = SessionManager.get_session_by_id(db, session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return SessionSchema.model_validate(session)

@router.post("/", response_model=SessionSchema)
def create_session(group_id: int, created_by_group_participant_id: int, topic: str = None, status: str = None, db: Session = Depends(get_db)):
    session = SessionManager.create_session(db, group_id, created_by_group_participant_id, topic, status)
    return SessionSchema.model_validate(session)

@router.delete("/{session_id}", response_model=SessionSchema)
def delete_session(session_id: int, db: Session = Depends(get_db)):
    session = SessionManager.delete_session(db, session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return SessionSchema.model_validate(session)
