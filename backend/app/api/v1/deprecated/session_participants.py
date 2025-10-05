"""
Session Participants endpoints router
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.postgres_manager.db import get_db
from app.db.postgres_manager.managers.session_participants import SessionParticipantManager
from app.db.postgres_manager.models.session_participant import SessionParticipant
from app.db.postgres_manager.schemas import SessionParticipantRead as SessionParticipantSchema
from typing import List

router = APIRouter()

@router.get("/session/{session_id}", response_model=List[SessionParticipantSchema])
def get_participants_by_session(session_id: int, db: Session = Depends(get_db)):
    participants = SessionParticipantManager.get_participants_by_session(db, session_id)
    return [SessionParticipantSchema.model_validate(participant) for participant in participants]

@router.post("/", response_model=SessionParticipantSchema)
def create_session_participant(session_id: int, user_id: int, db: Session = Depends(get_db)):
    participant = SessionParticipantManager.create_session_participant(db, session_id, user_id)
    return SessionParticipantSchema.model_validate(participant)

@router.delete("/{session_id}/{user_id}", response_model=SessionParticipantSchema)
def delete_session_participant(session_id: int, user_id: int, db: Session = Depends(get_db)):
    participant = SessionParticipantManager.delete_session_participant(db, session_id, user_id)
    if not participant:
        raise HTTPException(status_code=404, detail="Session participant not found")
    return SessionParticipantSchema.model_validate(participant)
