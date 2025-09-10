from fastapi import APIRouter, HTTPException, status
from typing import List, Optional
import asyncio
from datetime import datetime
from ...db.models import Message

router = APIRouter()

# MESSAGE ENDPOINTS
@router.get("/", response_model=List[dict])
async def get_messages(
    session_id: Optional[int] = None,
    user_id: Optional[int] = None,
    message_type: Optional[str] = None,
    limit: Optional[int] = 100,
    offset: Optional[int] = 0
):
    """Get messages with optional filtering"""
    try:
        messages = Message.get_all(
            session_id=session_id,
            user_id=user_id,
            message_type=message_type,
            limit=limit,
            offset=offset
        )
        return messages
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_message(message: dict):
    """Create a new message"""
    try:
        session_id = message.get("session_id")
        user_id = message.get("user_id")
        content = message.get("content")
        message_type = message.get("message_type", "user")
        
        if not session_id:
            raise HTTPException(status_code=400, detail="session_id is required")
        if not user_id:
            raise HTTPException(status_code=400, detail="user_id is required")
        if not content:
            raise HTTPException(status_code=400, detail="content is required")
        
        new_message = Message.create(
            session_id=session_id,
            user_id=user_id,
            content=content,
            message_type=message_type
        )
        
        if not new_message:
            raise HTTPException(status_code=500, detail="Failed to create message")
        
        return new_message
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@router.get("/{message_id}")
async def get_message(message_id: int):
    """Get a specific message by ID"""
    try:
        # Note: This would need to be implemented in the Message model
        # For now, we'll use the get_all method with no filters and find the message
        messages = Message.get_all(limit=1000)  # Get a large batch
        message = next((m for m in messages if m["id"] == message_id), None)
        
        if not message:
            raise HTTPException(status_code=404, detail="Message not found")
        
        return message
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@router.put("/{message_id}")
async def update_message(message_id: int, message: dict):
    """Update a specific message"""
    try:
        # Check if message exists
        existing_message = await get_message(message_id)
        
        # Note: Message update would need to be implemented in the Message model
        raise HTTPException(status_code=501, detail="Message update not implemented in current schema")
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@router.delete("/{message_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_message(message_id: int):
    """Delete a specific message"""
    try:
        # Check if message exists
        existing_message = await get_message(message_id)
        
        # Note: Message deletion would need to be implemented in the Message model
        raise HTTPException(status_code=501, detail="Message deletion not implemented in current schema")
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

# SESSION-SPECIFIC MESSAGE ENDPOINTS
@router.get("/sessions/{session_id}/messages")
async def get_session_messages(session_id: int, limit: Optional[int] = 100, offset: Optional[int] = 0):
    """Get all messages for a specific session"""
    try:
        return Message.get_all(session_id=session_id, limit=limit, offset=offset)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@router.post("/sessions/{session_id}/messages", status_code=status.HTTP_201_CREATED)
async def create_session_message(session_id: int, message: dict):
    """Create a new message in a specific session"""
    try:
        message["session_id"] = session_id
        return await create_message(message)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@router.get("/sessions/{session_id}/messages/count")
async def get_session_message_count(session_id: int):
    """Get the number of messages in a session"""
    try:
        messages = Message.get_all(session_id=session_id, limit=10000)  # Get all messages for counting
        return {"session_id": session_id, "message_count": len(messages)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@router.get("/sessions/{session_id}/messages/latest")
async def get_latest_session_messages(session_id: int, limit: int = 10):
    """Get the latest messages from a session"""
    try:
        # Get messages and return the most recent ones
        messages = Message.get_all(session_id=session_id, limit=limit)
        # The query should already order by sent_at, so we can return as is
        return messages
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

# USER-SPECIFIC MESSAGE ENDPOINTS
@router.get("/users/{user_id}/messages")
async def get_user_messages(user_id: int, limit: Optional[int] = 100, offset: Optional[int] = 0):
    """Get all messages from a specific user"""
    try:
        return Message.get_all(user_id=user_id, limit=limit, offset=offset)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@router.get("/users/{user_id}/messages/count")
async def get_user_message_count(user_id: int):
    """Get the number of messages from a specific user"""
    try:
        messages = Message.get_all(user_id=user_id, limit=10000)  # Get all messages for counting
        return {"user_id": user_id, "message_count": len(messages)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

# MESSAGE SEARCH AND ANALYTICS
@router.get("/search")
async def search_messages(
    query: str,
    session_id: Optional[int] = None,
    user_id: Optional[int] = None,
    limit: Optional[int] = 50
):
    """Search messages by content"""
    try:
        # Get messages with filters
        messages = Message.get_all(
            session_id=session_id,
            user_id=user_id,
            limit=limit * 2  # Get more to allow for filtering
        )
        
        # Simple text search (in a real app, you'd use proper full-text search)
        search_results = [
            m for m in messages 
            if query.lower() in m["content"].lower()
        ][:limit]
        
        return {
            "query": query,
            "results": search_results,
            "total_results": len(search_results)
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
