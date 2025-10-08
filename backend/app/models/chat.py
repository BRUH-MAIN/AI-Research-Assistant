"""
Chat-related Pydantic models for request/response handling
"""
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime


class ChatRequest(BaseModel):
    """Request model for sending a chat message"""
    message: str
    user_id: Optional[str] = None


class ChatMessage(BaseModel):
    """Individual chat message model"""
    id: str
    content: str
    role: str  # 'user' or 'assistant'
    timestamp: datetime
    user_id: Optional[str] = None


class ChatResponse(BaseModel):
    """Response model for chat interactions"""
    message: ChatMessage
    session_id: str


class SessionCreate(BaseModel):
    """Response model for creating a new session"""
    session_id: str


class SessionHistory(BaseModel):
    """Response model for session chat history"""
    messages: List[ChatMessage]
    session_id: Optional[str] = None


class PromptRequest(BaseModel):
    """Legacy request model for simple prompts"""
    prompt: str


class PromptResponse(BaseModel):
    """Legacy response model for simple prompts"""
    response: str


class GroupChatRequest(BaseModel):
    """Request model for group chat AI invocation"""
    session_id: int
    user_message: str
    user_id: int
    trigger_message_id: int


class GroupChatResponse(BaseModel):
    """Response model for group chat AI invocation"""
    response: str
    session_id: int
    model: Optional[str] = None