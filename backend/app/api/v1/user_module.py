from fastapi import APIRouter, HTTPException, status
from typing import List, Optional
import asyncio
from ...db.models import User

router = APIRouter()

# USER ENDPOINTS
@router.get("/", response_model=List[dict])
async def get_users():
    """Get all users"""
    try:
        return User.get_all()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_user(user: dict):
    """Create a new user"""
    try:
        email = user.get("email")
        if not email:
            raise HTTPException(status_code=400, detail="Email is required")
        
        # Check if user with email already exists
        existing_users = User.get_all()
        if any(u.get("email") == email for u in existing_users):
            raise HTTPException(status_code=409, detail="User with this email already exists")
        
        first_name = user.get("name") or user.get("first_name")
        last_name = user.get("last_name")
        
        new_user = User.create(
            email=email,
            first_name=first_name,
            last_name=last_name
        )
        
        if not new_user:
            raise HTTPException(status_code=500, detail="Failed to create user")
        
        # Format the response to match the expected API format
        formatted_user = {
            "id": new_user["id"],
            "name": f"{new_user.get('first_name', '')} {new_user.get('last_name', '')}".strip() or new_user.get('email'),
            "email": new_user["email"],
            "is_active": new_user.get("is_active", True)
        }
        
        return formatted_user
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@router.get("/{user_id}")
async def get_user(user_id: int):
    """Get a specific user by ID"""
    try:
        user = User.get_by_id(user_id)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Format the response to match the expected API format
        formatted_user = {
            "id": user["id"],
            "name": f"{user.get('first_name', '')} {user.get('last_name', '')}".strip() or user.get('email'),
            "email": user["email"],
            "is_active": user.get("is_active", True)
        }
        
        return formatted_user
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@router.put("/{user_id}")
async def update_user(user_id: int, user: dict):
    """Update a specific user"""
    try:
        # Check if user exists
        existing_user = User.get_by_id(user_id)
        if not existing_user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Prepare update data
        update_data = {}
        if "email" in user:
            update_data["email"] = user["email"]
        if "name" in user:
            # Split name into first and last name
            name_parts = user["name"].split(" ", 1)
            update_data["first_name"] = name_parts[0]
            if len(name_parts) > 1:
                update_data["last_name"] = name_parts[1]
        if "first_name" in user:
            update_data["first_name"] = user["first_name"]
        if "last_name" in user:
            update_data["last_name"] = user["last_name"]
        if "is_active" in user:
            update_data["is_active"] = user["is_active"]
        
        updated_user = User.update(user_id, **update_data)
        if not updated_user:
            raise HTTPException(status_code=500, detail="Failed to update user")
        
        # Format the response
        formatted_user = {
            "id": updated_user["id"],
            "name": f"{updated_user.get('first_name', '')} {updated_user.get('last_name', '')}".strip() or updated_user.get('email'),
            "email": updated_user["email"],
            "is_active": updated_user.get("is_active", True)
        }
        
        return formatted_user
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(user_id: int):
    """Delete a specific user"""
    try:
        # Check if user exists
        existing_user = User.get_by_id(user_id)
        if not existing_user:
            raise HTTPException(status_code=404, detail="User not found")
        
        success = User.delete(user_id)
        if not success:
            raise HTTPException(status_code=500, detail="Failed to delete user")
        
        return None
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@router.patch("/{user_id}/activate")
async def activate_user(user_id: int):
    """Activate a user"""
    try:
        # Check if user exists
        existing_user = User.get_by_id(user_id)
        if not existing_user:
            raise HTTPException(status_code=404, detail="User not found")
        
        updated_user = User.update(user_id, is_active=True)
        if not updated_user:
            raise HTTPException(status_code=500, detail="Failed to activate user")
        
        return {"message": f"User {user_id} activated successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@router.patch("/{user_id}/deactivate")
async def deactivate_user(user_id: int):
    """Deactivate a user"""
    try:
        # Check if user exists
        existing_user = User.get_by_id(user_id)
        if not existing_user:
            raise HTTPException(status_code=404, detail="User not found")
        
        updated_user = User.update(user_id, is_active=False)
        if not updated_user:
            raise HTTPException(status_code=500, detail="Failed to deactivate user")
        
        return {"message": f"User {user_id} deactivated successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")