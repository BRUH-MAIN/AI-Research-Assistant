from fastapi import APIRouter, HTTPException, status
from typing import List, Optional
from ...db.models import Feedback

router = APIRouter()

# FEEDBACK ENDPOINTS
@router.get("/sessions/{session_id}/feedback", response_model=List[dict])
async def get_session_feedback(session_id: int):
    """Get all feedback for a specific session"""
    try:
        return Feedback.get_by_session(session_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@router.post("/sessions/{session_id}/feedback", status_code=status.HTTP_201_CREATED)
async def create_feedback(session_id: int, feedback: dict):
    """Create feedback for a specific session"""
    try:
        given_by = feedback.get("given_by")
        content = feedback.get("content")
        
        if not given_by:
            raise HTTPException(status_code=400, detail="given_by (user ID) is required")
        
        new_feedback = Feedback.create(
            session_id=session_id,
            given_by=given_by,
            content=content
        )
        
        if not new_feedback:
            raise HTTPException(status_code=500, detail="Failed to create feedback")
        
        return new_feedback
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@router.get("/feedback/{feedback_id}")
async def get_feedback(feedback_id: int):
    """Get a specific feedback by ID"""
    try:
        feedback = Feedback.get_by_id(feedback_id)
        if not feedback:
            raise HTTPException(status_code=404, detail="Feedback not found")
        return feedback
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@router.put("/feedback/{feedback_id}")
async def update_feedback(feedback_id: int, feedback: dict):
    """Update a specific feedback"""
    try:
        # Check if feedback exists
        existing_feedback = Feedback.get_by_id(feedback_id)
        if not existing_feedback:
            raise HTTPException(status_code=404, detail="Feedback not found")
        
        # Prepare update data
        update_data = {}
        if "content" in feedback:
            update_data["content"] = feedback["content"]
        
        updated_feedback = Feedback.update(feedback_id, **update_data)
        if not updated_feedback:
            raise HTTPException(status_code=500, detail="Failed to update feedback")
        
        return updated_feedback
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@router.delete("/feedback/{feedback_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_feedback(feedback_id: int):
    """Delete a specific feedback"""
    try:
        # Check if feedback exists
        existing_feedback = Feedback.get_by_id(feedback_id)
        if not existing_feedback:
            raise HTTPException(status_code=404, detail="Feedback not found")
        
        success = Feedback.delete(feedback_id)
        if not success:
            raise HTTPException(status_code=500, detail="Failed to delete feedback")
        
        return None
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@router.get("/users/{user_id}/feedback")
async def get_user_feedback(user_id: int):
    """Get all feedback given by a specific user"""
    try:
        return Feedback.get_by_user(user_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
