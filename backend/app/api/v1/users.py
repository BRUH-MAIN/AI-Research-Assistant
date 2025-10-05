"""
User endpoints router
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.postgres_manager.db import get_db
from app.db.postgres_manager.managers.users import UserManager
from app.db.postgres_manager.models.user import User
from app.db.postgres_manager.schemas import UserRead as UserSchema
from typing import List

router = APIRouter()

@router.get("/", response_model=List[UserSchema])
def get_users(db: Session = Depends(get_db)):
    users = db.query(User).all()
    return [UserSchema.model_validate(user) for user in users]

@router.get("/{user_id}", response_model=UserSchema)
def get_user(user_id: int, db: Session = Depends(get_db)):
    user = UserManager.get_user_by_id(db, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return UserSchema.model_validate(user)

@router.post("/", response_model=UserSchema)
def create_user(email: str, first_name: str = None, last_name: str = None, availability: str = 'available', db: Session = Depends(get_db)):
    user = UserManager.create_user(db, email, first_name, last_name, availability)
    return UserSchema.model_validate(user)

@router.delete("/{user_id}", response_model=UserSchema)
def delete_user(user_id: int, db: Session = Depends(get_db)):
    user = UserManager.delete_user(db, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return UserSchema.model_validate(user)
