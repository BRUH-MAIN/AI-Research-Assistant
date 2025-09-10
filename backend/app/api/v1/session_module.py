from fastapi import APIRouter, HTTPException, status
from typing import List, Optional
import asyncio
from datetime import datetime
from ...db.models import Session

router = APIRouter()

# SESSION ENDPOINTS
@router.get("/", response_model=List[dict])
async def get_sessions(user_id: Optional[int] = None, is_active: Optional[bool] = None):
    """Get all sessions, optionally filtered by user_id or active status"""
    try:
        sessions = Session.get_all(user_id=user_id, is_active=is_active)
        return sessions
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_session(session: dict):
    """Create a new session"""
    try:
        title = session.get("title", f"Session {datetime.now().strftime('%Y%m%d_%H%M%S')}")
        user_id = session.get("user_id")
        
        if not user_id:
            raise HTTPException(status_code=400, detail="user_id is required")
        
        # For now, we'll use group_id 1 as default
        # In a real app, this might be determined by user's groups
        group_id = session.get("group_id", 1)
        
        new_session = Session.create(
            title=title,
            user_id=user_id,
            group_id=group_id
        )
        
        if not new_session:
            raise HTTPException(status_code=500, detail="Failed to create session")
        
        return new_session
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@router.get("/{session_id}")
async def get_session(session_id: int):
    """Get a specific session by ID"""
    try:
        session = Session.get_by_id(session_id)
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
        return session
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@router.put("/{session_id}")
async def update_session(session_id: int, session: dict):
    """Update a specific session"""
    try:
        # Check if session exists
        existing_session = Session.get_by_id(session_id)
        if not existing_session:
            raise HTTPException(status_code=404, detail="Session not found")
        
        # Note: The current schema doesn't support updating session title directly
        # This would need to be implemented in the Session model
        raise HTTPException(status_code=501, detail="Session update not implemented in current schema")
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@router.delete("/{session_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_session(session_id: int):
    """Delete a specific session"""
    try:
        # Check if session exists
        existing_session = Session.get_by_id(session_id)
        if not existing_session:
            raise HTTPException(status_code=404, detail="Session not found")
        
        # Note: The current schema would need CASCADE delete implementation
        # For now, we'll return not implemented
        raise HTTPException(status_code=501, detail="Session deletion not implemented in current schema")
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@router.patch("/{session_id}/activate")
async def activate_session(session_id: int):
    """Activate a session"""
    try:
        # Check if session exists
        existing_session = Session.get_by_id(session_id)
        if not existing_session:
            raise HTTPException(status_code=404, detail="Session not found")
        
        # Note: Session activation would need to be implemented in the Session model
        # by updating the status field to 'active'
        raise HTTPException(status_code=501, detail="Session activation not implemented in current schema")
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@router.patch("/{session_id}/deactivate")
async def deactivate_session(session_id: int):
    """Deactivate a session"""
    try:
        # Check if session exists
        existing_session = Session.get_by_id(session_id)
        if not existing_session:
            raise HTTPException(status_code=404, detail="Session not found")
        
        # Note: Session deactivation would need to be implemented in the Session model
        # by updating the status field to 'completed' or 'offline'
        raise HTTPException(status_code=501, detail="Session deactivation not implemented in current schema")
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@router.get("/{session_id}/summary")
async def get_session_summary(session_id: int):
    """Get a summary of the session"""
    try:
        session = Session.get_by_id(session_id)
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
        
        return {
            "session_id": session_id,
            "title": session["title"],
            "message_count": session["message_count"],
            "duration": "Session duration calculation would go here",
            "is_active": session["is_active"]
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

# Legacy endpoint for backward compatibility
@router.get("/{session_id}/chat")
async def chat(session_id: int):
    """Legacy chat endpoint - returns basic session info"""
    try:
        session = await get_session(session_id)
        return {"message": f"Hello, this is the chat endpoint for session {session_id}!", "session": session}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")

    # SESSION JOIN/LEAVE/INVITE/GETID ENDPOINTS
    @router.post("/{session_id}/join", status_code=status.HTTP_201_CREATED)
    async def join_session(session_id: int, user_id: int):
        """User joins a session"""
        try:
            session = Session.get_by_id(session_id)
            if not session:
                raise HTTPException(status_code=404, detail="Session not found")
            # Check if user is already a participant
            # This would require Session.get_participants(session_id) if implemented
            # For now, use mock logic
            success = Session.add_participant(session_id, user_id) if hasattr(Session, 'add_participant') else True
            if not success:
                raise HTTPException(status_code=500, detail="Failed to join session")
            return {"message": f"User {user_id} joined session {session_id}"}
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

    @router.delete("/{session_id}/leave", status_code=status.HTTP_204_NO_CONTENT)
    async def leave_session(session_id: int, user_id: int):
        """User leaves a session"""
        try:
            session = Session.get_by_id(session_id)
            if not session:
                raise HTTPException(status_code=404, detail="Session not found")
            success = Session.remove_participant(session_id, user_id) if hasattr(Session, 'remove_participant') else True
            if not success:
                raise HTTPException(status_code=500, detail="Failed to leave session")
            return None
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

    @router.post("/{session_id}/invite", status_code=status.HTTP_201_CREATED)
    async def invite_to_session(session_id: int, invite: dict):
        """Invite a user to a session (adds user as participant)"""
        try:
            user_id = invite.get("user_id")
            if not user_id:
                raise HTTPException(status_code=400, detail="user_id is required")
            session = Session.get_by_id(session_id)
            if not session:
                raise HTTPException(status_code=404, detail="Session not found")
            success = Session.add_participant(session_id, user_id) if hasattr(Session, 'add_participant') else True
            if not success:
                raise HTTPException(status_code=500, detail="Failed to invite user to session")
            return {"message": f"User {user_id} invited to session {session_id}"}
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

    @router.get("/getid")
    async def get_session_id(title: str):
        """Get session ID by title"""
        try:
            sessions = Session.get_all()
            for session in sessions:
                if session["title"].lower() == title.lower():
                    return {"id": session["id"], "title": session["title"]}
            raise HTTPException(status_code=404, detail="Session not found")
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")