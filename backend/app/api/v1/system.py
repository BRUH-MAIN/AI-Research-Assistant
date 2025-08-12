"""
System and debug endpoints router
"""
from fastapi import APIRouter
from typing import List

from app.models.responses import HealthResponse, StatusResponse
from app.services.ai_service import ai_service
from app.services.chat_service import chat_service
from app.db.redis_client import redis_client
from app.core.config import settings

router = APIRouter()


@router.get("/", response_model=HealthResponse)
async def root():
    """Health check endpoint"""
    return HealthResponse(
        message="AI Research Assistant API is running!",
        status="online",
        groq_configured=ai_service.is_configured(),
        redis_connected=redis_client.is_connected(),
        version=settings.VERSION
    )


@router.get("/status", response_model=HealthResponse)
async def get_status():
    """Get API status"""
    return HealthResponse(
        message="Service status check",
        status="online",
        groq_configured=ai_service.is_configured(),
        redis_connected=redis_client.is_connected(),
        version=settings.VERSION
    )


@router.get("/debug/sessions")
async def debug_sessions():
    """Debug endpoint to see all active sessions"""
    sessions = chat_service.get_all_sessions()
    return {"active_sessions": sessions, "count": len(sessions)}


@router.get("/debug/redis", response_model=StatusResponse)
async def debug_redis():
    """Debug endpoint to test Redis connection"""
    try:
        # Test Redis connection
        redis_client._test_connection()
        if redis_client.is_connected():
            return StatusResponse(
                status="connected", 
                message="Redis Cloud connection successful"
            )
        else:
            return StatusResponse(
                status="disconnected", 
                message="Redis connection failed - check network connectivity"
            )
    except Exception as e:
        return StatusResponse(
            status="error", 
            message=f"Redis error: {str(e)}"
        )
