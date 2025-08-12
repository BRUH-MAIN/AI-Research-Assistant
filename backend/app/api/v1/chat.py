"""
Chat endpoints router
"""
from fastapi import APIRouter, HTTPException
from typing import List

from app.models.chat import (
    ChatRequest, 
    ChatResponse, 
    SessionCreate, 
    SessionHistory,
    PromptRequest,
    PromptResponse
)
from app.models.responses import SuccessResponse
from app.services.chat_service import chat_service
from app.services.ai_service import ai_service

router = APIRouter()


@router.post("/sessions", response_model=SessionCreate)
async def create_session():
    """Create a new chat session"""
    try:
        session_id = chat_service.create_session()
        return SessionCreate(session_id=session_id)
    except Exception as e:
        raise HTTPException(
            status_code=500, 
            detail=f"Failed to create session: {str(e)}"
        )


@router.get("/{session_id}/history", response_model=SessionHistory)
async def get_chat_history(session_id: str):
    """Get chat history for a session"""
    try:
        messages = chat_service.get_session_history(session_id)
        if messages is None:
            raise HTTPException(status_code=404, detail="Session not found")
        
        return SessionHistory(messages=messages)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to retrieve session history: {str(e)}"
        )


@router.post("/{session_id}", response_model=ChatResponse)
async def send_message(session_id: str, request: ChatRequest):
    """Send a message and get AI response"""
    try:
        response = await chat_service.send_message(session_id, request)
        if response is None:
            raise HTTPException(status_code=404, detail="Session not found")
        
        return response
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to process message: {str(e)}"
        )


@router.delete("/{session_id}", response_model=SuccessResponse)
async def delete_session(session_id: str):
    """Delete a chat session"""
    try:
        success = chat_service.delete_session(session_id)
        if not success:
            raise HTTPException(status_code=404, detail="Session not found")
        
        return SuccessResponse(message="Session deleted successfully")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to delete session: {str(e)}"
        )


# Legacy endpoint for backward compatibility
@router.post("", response_model=PromptResponse)
async def process_prompt_legacy(request: PromptRequest):
    """
    Legacy endpoint for backward compatibility
    Process a prompt using Groq without session management
    """
    try:
        if not ai_service.is_configured():
            raise HTTPException(status_code=500, detail="AI service not configured")
        
        response_content = await ai_service.generate_simple_response(request.prompt)
        return PromptResponse(response=response_content)
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing prompt: {str(e)}")
