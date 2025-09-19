"""
Common response models for API endpoints
"""
from pydantic import BaseModel


class SuccessResponse(BaseModel):
    """Standard success response model"""
    message: str
    success: bool = True


class ErrorResponse(BaseModel):
    """Standard error response model"""
    error: str
    success: bool = False


class HealthResponse(BaseModel):
    """Health check response model"""
    message: str
    status: str
    groq_configured: bool = False
    redis_connected: bool = False
    version: str = "1.0.0"


class StatusResponse(BaseModel):
    """Status response model"""
    status: str
    message: str
    data: dict = {}