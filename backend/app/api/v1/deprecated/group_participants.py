"""
Group Participants endpoints router
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.postgres_manager.db import get_db
from app.db.postgres_manager.managers.group_participants import GroupParticipantManager
from app.db.postgres_manager.models.group_participant import GroupParticipant
from app.db.postgres_manager.schemas import GroupParticipantRead as GroupParticipantSchema
from typing import List

router = APIRouter()

@router.get("/", response_model=List[GroupParticipantSchema])
def get_group_participants(db: Session = Depends(get_db)):
    participants = db.query(GroupParticipant).all()
    return [GroupParticipantSchema.model_validate(participant) for participant in participants]

@router.get("/{group_participant_id}", response_model=GroupParticipantSchema)
def get_group_participant(group_participant_id: int, db: Session = Depends(get_db)):
    participant = GroupParticipantManager.get_group_participant_by_id(db, group_participant_id)
    if not participant:
        raise HTTPException(status_code=404, detail="Group participant not found")
    return GroupParticipantSchema.model_validate(participant)

@router.get("/group/{group_id}", response_model=List[GroupParticipantSchema])
def get_participants_by_group(group_id: int, db: Session = Depends(get_db)):
    participants = GroupParticipantManager.get_participants_by_group(db, group_id)
    return [GroupParticipantSchema.model_validate(participant) for participant in participants]

@router.post("/", response_model=GroupParticipantSchema)
def create_group_participant(group_id: int, user_id: int, role: str = None, db: Session = Depends(get_db)):
    participant = GroupParticipantManager.create_group_participant(db, group_id, user_id, role)
    return GroupParticipantSchema.model_validate(participant)

@router.delete("/{group_participant_id}", response_model=GroupParticipantSchema)
def delete_group_participant(group_participant_id: int, db: Session = Depends(get_db)):
    participant = GroupParticipantManager.delete_group_participant(db, group_participant_id)
    if not participant:
        raise HTTPException(status_code=404, detail="Group participant not found")
    return GroupParticipantSchema.model_validate(participant)
