"""
API v1 router that includes all module routers
"""
from fastapi import APIRouter

from . import user_module, group_module, session_module, message_module
from . import paper_module, feedback_module, ai_metadata_module

api_router = APIRouter()

# Include all module routers
api_router.include_router(user_module.router, prefix="/users", tags=["users"])
api_router.include_router(group_module.router, prefix="/groups", tags=["groups"])
api_router.include_router(session_module.router, prefix="/sessions", tags=["sessions"])
api_router.include_router(message_module.router, prefix="/messages", tags=["messages"])
api_router.include_router(paper_module.router, prefix="/papers", tags=["papers"])
api_router.include_router(feedback_module.router, prefix="", tags=["feedback"])
api_router.include_router(ai_metadata_module.router, prefix="", tags=["ai-metadata"])
