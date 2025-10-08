"""
Message endpoints router
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.postgres_manager.db import get_db
from app.db.postgres_manager.managers.messages import MessageManager
from app.db.postgres_manager.models.message import Message
from app.db.postgres_manager.schemas import MessageRead as MessageSchema
from typing import List

router = APIRouter()

@router.get("/", response_model=List[MessageSchema])
def get_messages(db: Session = Depends(get_db)):
    messages = db.query(Message).all()
    return [MessageSchema.model_validate(message) for message in messages]

@router.get("/{message_id}", response_model=MessageSchema)
def get_message(message_id: int, db: Session = Depends(get_db)):
    message = MessageManager.get_message_by_id(db, message_id)
    if not message:
        raise HTTPException(status_code=404, detail="Message not found")
    return MessageSchema.model_validate(message)

@router.post("/", response_model=MessageSchema)
def create_message(session_id: int, sender_group_participant_id: int, content: str, db: Session = Depends(get_db)):
    message = MessageManager.create_message(db, session_id, sender_group_participant_id, content)
    return MessageSchema.model_validate(message)

@router.delete("/{message_id}", response_model=MessageSchema)
def delete_message(message_id: int, db: Session = Depends(get_db)):
    message = MessageManager.delete_message(db, message_id)
    if not message:
        raise HTTPException(status_code=404, detail="Message not found")
    return MessageSchema.model_validate(message)
