"""
System and debug endpoints router
"""
from fastapi import APIRouter

from app.models.responses import HealthResponse, StatusResponse
from app.services.ai_service import ai_service
from app.services.chat_service import chat_service
# Redis removed - not needed for this project
from app.core.config import settings

router = APIRouter()


@router.get("/", response_model=HealthResponse)
async def root():
    """Health check endpoint"""
    return HealthResponse(
        message="AI Research Assistant API is running!",
        status="online",
        groq_configured=ai_service.is_configured(),
        redis_connected=False,  # Redis removed
        version=settings.VERSION
    )


@router.get("/status", response_model=HealthResponse)
async def get_status():
    """Get API status"""
    return HealthResponse(
        message="Service status check",
        status="online",
        groq_configured=ai_service.is_configured(),
        redis_connected=False,  # Redis removed
        version=settings.VERSION
    )


@router.get("/debug/sessions")
async def debug_sessions():
    """Debug endpoint to see all active sessions"""
    sessions = chat_service.get_all_sessions()
    return {"active_sessions": sessions, "count": len(sessions)}


# Redis debug endpoint removed - Redis not needed for this project
