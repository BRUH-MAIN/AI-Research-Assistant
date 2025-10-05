"""
AI Metadata endpoints router
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.postgres_manager.db import get_db
from app.db.postgres_manager.managers.ai_metadata import AiMetadataManager
from app.db.postgres_manager.models.ai_metadata import AiMetadata
from app.db.postgres_manager.schemas import AiMetadataRead as AiMetadataSchema
from typing import List

router = APIRouter()

@router.get("/message/{message_id}", response_model=List[AiMetadataSchema])
def get_metadata_by_message(message_id: int, db: Session = Depends(get_db)):
    metadata = AiMetadataManager.get_metadata_by_message(db, message_id)
    return [AiMetadataSchema.model_validate(meta) for meta in metadata]

@router.get("/paper/{paper_id}", response_model=List[AiMetadataSchema])
def get_metadata_by_paper(paper_id: int, db: Session = Depends(get_db)):
    metadata = AiMetadataManager.get_metadata_by_paper(db, paper_id)
    return [AiMetadataSchema.model_validate(meta) for meta in metadata]

@router.post("/", response_model=AiMetadataSchema)
def create_ai_metadata(message_id: int, paper_id: int, page_no: int = None, db: Session = Depends(get_db)):
    ai_metadata = AiMetadataManager.create_ai_metadata(db, message_id, paper_id, page_no)
    return AiMetadataSchema.model_validate(ai_metadata)

@router.delete("/{message_id}/{paper_id}", response_model=AiMetadataSchema)
def delete_ai_metadata(message_id: int, paper_id: int, db: Session = Depends(get_db)):
    ai_metadata = AiMetadataManager.delete_ai_metadata(db, message_id, paper_id)
    if not ai_metadata:
        raise HTTPException(status_code=404, detail="AI metadata not found")
    return AiMetadataSchema.model_validate(ai_metadata)
