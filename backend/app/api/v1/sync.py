"""
API endpoints for Redis-PostgreSQL synchronization
"""
from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import JSONResponse
from typing import Dict, Any

from app.services.redis_postgres_sync import sync_service
from app.db.postgres_manager.db import get_db
from sqlalchemy.orm import Session

router = APIRouter()

@router.post("/sync/manual", summary="Trigger manual sync from Redis to PostgreSQL")
async def trigger_manual_sync():
    """Manually trigger a full sync from Redis to PostgreSQL"""
    try:
        await sync_service.manual_full_sync()
        return JSONResponse(
            status_code=200,
            content={"message": "Manual sync completed successfully"}
        )
    except Exception as e:
        raise HTTPException(
            status_code=500, 
            detail=f"Manual sync failed: {str(e)}"
        )

@router.get("/sync/status", summary="Get sync service status")
async def get_sync_status():
    """Get the current status of the sync service"""
    try:
        redis_connected = sync_service.redis_client.is_connected()
        sync_enabled = sync_service.sync_enabled
        
        return JSONResponse(
            status_code=200,
            content={
                "sync_enabled": sync_enabled,
                "redis_connected": redis_connected,
                "service_status": "running" if sync_enabled and redis_connected else "stopped"
            }
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get sync status: {str(e)}"
        )

@router.post("/sync/session/{session_id}", summary="Sync specific session")
async def sync_specific_session(session_id: str):
    """Sync a specific session from Redis to PostgreSQL"""
    try:
        await sync_service._sync_session_to_postgres(session_id)
        return JSONResponse(
            status_code=200,
            content={"message": f"Session {session_id} synced successfully"}
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to sync session {session_id}: {str(e)}"
        )

@router.get("/sync/sessions/compare", summary="Compare Redis and PostgreSQL sessions")
async def compare_sessions(db: Session = Depends(get_db)):
    """Compare sessions between Redis and PostgreSQL"""
    try:
        # Get Redis sessions
        redis_sessions = sync_service.redis_client.get_all_sessions()
        
        # Get PostgreSQL sessions (simplified - just count)
        from app.db.postgres_manager.managers.sessions import SessionManager
        pg_sessions = db.query(SessionManager).count() if hasattr(SessionManager, 'query') else 0
        
        return JSONResponse(
            status_code=200,
            content={
                "redis_sessions_count": len(redis_sessions),
                "postgresql_sessions_count": pg_sessions,
                "redis_session_ids": redis_sessions[:10]  # Show first 10 for preview
            }
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to compare sessions: {str(e)}"
        )
