"""
Chat-related Pydantic models
"""
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime


class ChatMessage(BaseModel):
    """Model for a chat message"""
    id: str
    sender: str  # 'user' or 'ai'
    content: str
    timestamp: datetime


class ChatRequest(BaseModel):
    """Model for incoming chat requests"""
    id: str
    sender: str
    content: str
    timestamp: datetime


class ChatResponse(BaseModel):
    """Model for chat API responses"""
    userMessage: ChatMessage
    aiMessage: ChatMessage


class SessionCreate(BaseModel):
    """Model for session creation response"""
    session_id: str


class SessionHistory(BaseModel):
    """Model for session history response"""
    messages: List[ChatMessage]


class SessionInfo(BaseModel):
    """Model for session information"""
    session_id: str
    created_at: str
    updated_at: str
    message_count: int


# Legacy models for backward compatibility
class PromptRequest(BaseModel):
    """Legacy prompt request model"""
    prompt: str


class PromptResponse(BaseModel):
    """Legacy prompt response model"""
    response: str
