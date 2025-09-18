from fastapi import APIRouter, HTTPException, status, Depends, Header
from typing import Optional, Dict, Any
import jwt
import requests
from datetime import datetime

from ...db.models import User

router = APIRouter()

# Types for auth responses
class AuthStatus:
    def __init__(self, authenticated: bool, user: Optional[Dict[str, Any]] = None):
        self.authenticated = authenticated
        self.user = user

class ProfileSyncResponse:
    def __init__(self, message: str, profile: Dict[str, Any]):
        self.message = message
        self.profile = profile

# Helper function to decode JWT token and get user info
async def get_current_user(authorization: Optional[str] = Header(None)) -> Optional[Dict[str, Any]]:
    """Extract user information from JWT token"""
    if not authorization or not authorization.startswith('Bearer '):
        return None
    
    try:
        token = authorization.split(' ')[1]
        # For now, we'll implement a basic token validation
        # In production, you should verify the JWT signature with Supabase public key
        payload = jwt.decode(token, options={"verify_signature": False})
        return payload
    except (jwt.InvalidTokenError, IndexError):
        return None

@router.get("/status")
async def get_auth_status(authorization: Optional[str] = Header(None)):
    """Get current authentication status"""
    try:
        user_payload = await get_current_user(authorization)
        
        if not user_payload:
            return {"authenticated": False}
        
        # Try to find the user in our database
        auth_user_id = user_payload.get('sub')
        if auth_user_id:
            users = User.get_all()
            db_user = next((user for user in users if user.get('auth_user_id') == auth_user_id), None)
            
            if db_user:
                return {
                    "authenticated": True,
                    "user": {
                        "id": db_user["user_id"],
                        "email": db_user["email"],
                        "name": f"{db_user.get('first_name', '')} {db_user.get('last_name', '')}".strip() or db_user.get('email'),
                        "auth_user_id": auth_user_id
                    }
                }
        
        return {"authenticated": False}
        
    except Exception as e:
        print(f"Auth status error: {e}")
        return {"authenticated": False}

@router.get("/me")
async def get_current_user_profile(authorization: Optional[str] = Header(None)):
    """Get current user's profile"""
    try:
        user_payload = await get_current_user(authorization)
        
        if not user_payload:
            raise HTTPException(status_code=401, detail="Not authenticated")
        
        auth_user_id = user_payload.get('sub')
        if not auth_user_id:
            raise HTTPException(status_code=401, detail="Invalid token")
        
        # Find user in database
        users = User.get_all()
        db_user = next((user for user in users if user.get('auth_user_id') == auth_user_id), None)
        
        if not db_user:
            raise HTTPException(status_code=404, detail="User profile not found")
        
        # Format response to match frontend expectations
        profile = {
            "user_id": db_user["user_id"],
            "auth_user_id": auth_user_id,
            "email": db_user["email"],
            "first_name": db_user.get("first_name"),
            "last_name": db_user.get("last_name"),
            "profile_picture_url": db_user.get("profile_picture_url"),
            "bio": db_user.get("bio"),
            "phone_number": db_user.get("phone_number"),
            "availability": db_user.get("availability", "available"),
            "created_at": db_user.get("created_at"),
            "updated_at": db_user.get("updated_at")
        }
        
        return profile
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Get profile error: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve profile")

@router.put("/me")
async def update_current_user_profile(
    profile_data: dict,
    authorization: Optional[str] = Header(None)
):
    """Update current user's profile"""
    try:
        user_payload = await get_current_user(authorization)
        
        if not user_payload:
            raise HTTPException(status_code=401, detail="Not authenticated")
        
        auth_user_id = user_payload.get('sub')
        if not auth_user_id:
            raise HTTPException(status_code=401, detail="Invalid token")
        
        # Find user in database
        users = User.get_all()
        db_user = next((user for user in users if user.get('auth_user_id') == auth_user_id), None)
        
        if not db_user:
            raise HTTPException(status_code=404, detail="User profile not found")
        
        user_id = db_user["user_id"]
        
        # Prepare update data - only allow certain fields to be updated
        allowed_fields = ['first_name', 'last_name', 'bio', 'phone_number', 'availability']
        update_data = {}
        
        for field in allowed_fields:
            if field in profile_data:
                update_data[field] = profile_data[field]
        
        if not update_data:
            raise HTTPException(status_code=400, detail="No valid fields to update")
        
        # Update user
        updated_user = User.update(user_id, **update_data)
        if not updated_user:
            raise HTTPException(status_code=500, detail="Failed to update profile")
        
        # Format response
        profile = {
            "user_id": updated_user["user_id"],
            "auth_user_id": auth_user_id,
            "email": updated_user["email"],
            "first_name": updated_user.get("first_name"),
            "last_name": updated_user.get("last_name"),
            "profile_picture_url": updated_user.get("profile_picture_url"),
            "bio": updated_user.get("bio"),
            "phone_number": updated_user.get("phone_number"),
            "availability": updated_user.get("availability", "available"),
            "created_at": updated_user.get("created_at"),
            "updated_at": updated_user.get("updated_at")
        }
        
        return profile
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Update profile error: {e}")
        raise HTTPException(status_code=500, detail="Failed to update profile")

@router.post("/sync-profile")
async def sync_user_profile(authorization: Optional[str] = Header(None)):
    """Sync user profile with authentication provider"""
    try:
        user_payload = await get_current_user(authorization)
        
        if not user_payload:
            raise HTTPException(status_code=401, detail="Not authenticated")
        
        auth_user_id = user_payload.get('sub')
        email = user_payload.get('email')
        
        if not auth_user_id or not email:
            raise HTTPException(status_code=401, detail="Invalid token payload")
        
        # Check if user exists in our database
        users = User.get_all()
        db_user = next((user for user in users if user.get('auth_user_id') == auth_user_id), None)
        
        if db_user:
            # User exists, update their info if needed
            updated_user = User.update(
                db_user["user_id"],
                email=email,
                # Update other fields from token metadata if available
            )
            
            profile = {
                "user_id": updated_user["user_id"],
                "auth_user_id": auth_user_id,
                "email": updated_user["email"],
                "first_name": updated_user.get("first_name"),
                "last_name": updated_user.get("last_name"),
                "profile_picture_url": updated_user.get("profile_picture_url"),
                "bio": updated_user.get("bio"),
                "phone_number": updated_user.get("phone_number"),
                "availability": updated_user.get("availability", "available"),
                "created_at": updated_user.get("created_at"),
                "updated_at": updated_user.get("updated_at")
            }
            
            return {
                "message": "Profile synced successfully",
                "profile": profile
            }
        else:
            # User doesn't exist, create new user
            # Extract name from user metadata if available
            user_metadata = user_payload.get('user_metadata', {})
            name = user_metadata.get('name') or user_metadata.get('full_name') or email.split('@')[0]
            
            # Split name into first and last name
            name_parts = name.split(' ', 1) if name else ['', '']
            first_name = name_parts[0] if name_parts else None
            last_name = name_parts[1] if len(name_parts) > 1 else None
            
            # Create user with auth_user_id
            new_user = User.create(
                email=email,
                first_name=first_name,
                last_name=last_name,
                auth_user_id=auth_user_id
            )
            
            if not new_user:
                raise HTTPException(status_code=500, detail="Failed to create user profile")
            
            profile = {
                "user_id": new_user["user_id"],
                "auth_user_id": auth_user_id,
                "email": new_user["email"],
                "first_name": new_user.get("first_name"),
                "last_name": new_user.get("last_name"),
                "profile_picture_url": new_user.get("profile_picture_url"),
                "bio": new_user.get("bio"),
                "phone_number": new_user.get("phone_number"),
                "availability": new_user.get("availability", "available"),
                "created_at": new_user.get("created_at"),
                "updated_at": new_user.get("updated_at")
            }
            
            return {
                "message": "Profile created and synced successfully",
                "profile": profile
            }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Sync profile error: {e}")
        raise HTTPException(status_code=500, detail="Failed to sync profile")