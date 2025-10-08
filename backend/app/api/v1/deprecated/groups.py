"""
Group endpoints router
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.postgres_manager.db import get_db
from app.db.postgres_manager.managers.groups import GroupManager
from app.db.postgres_manager.models.group import Group
from app.db.postgres_manager.schemas import GroupRead as GroupSchema
from typing import List

router = APIRouter()

@router.get("/", response_model=List[GroupSchema])
def get_groups(db: Session = Depends(get_db)):
    groups = db.query(Group).all()
    return [GroupSchema.model_validate(group) for group in groups]

@router.get("/{group_id}", response_model=GroupSchema)
def get_group(group_id: int, db: Session = Depends(get_db)):
    group = GroupManager.get_group_by_id(db, group_id)
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    return GroupSchema.model_validate(group)

@router.post("/", response_model=GroupSchema)
def create_group(name: str, created_by: int, db: Session = Depends(get_db)):
    group = GroupManager.create_group(db, name, created_by)
    return GroupSchema.model_validate(group)

@router.delete("/{group_id}", response_model=GroupSchema)
def delete_group(group_id: int, db: Session = Depends(get_db)):
    group = GroupManager.delete_group(db, group_id)
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    return GroupSchema.model_validate(group)
