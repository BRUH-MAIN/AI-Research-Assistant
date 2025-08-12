"""
Common response models
"""
from pydantic import BaseModel
from typing import Any, Optional


class StatusResponse(BaseModel):
    """Standard status response"""
    status: str
    message: str


class HealthResponse(BaseModel):
    """Health check response"""
    message: str
    status: str
    groq_configured: bool
    redis_connected: bool
    version: str


class ErrorResponse(BaseModel):
    """Error response model"""
    error: str
    detail: Optional[str] = None


class SuccessResponse(BaseModel):
    """Generic success response"""
    message: str
    data: Optional[Any] = None
