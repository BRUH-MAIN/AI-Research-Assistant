"""
Main API router that combines all endpoint routers
"""
from fastapi import APIRouter

from app.core.config import settings
from app.api.v1 import chat, system
# Removed database-related imports - Express server handles all database operations
# from app.api.v1 import users, groups, messages, sessions, feedback
# from app.api.v1 import group_participants, session_participants, papers, paper_tags, session_papers, ai_metadata

api_router = APIRouter()

# Include routers - FastAPI only handles AI/ML operations
# Include routers - FastAPI only handles AI/ML operations
api_router.include_router(system.router, tags=["system"])
api_router.include_router(chat.router, prefix="/chat", tags=["chat"])

# Removed database-related router includes - Express server handles all database operations
# api_router.include_router(users.router, prefix="/users", tags=["users"])
# api_router.include_router(groups.router, prefix="/groups", tags=["groups"])
# api_router.include_router(group_participants.router, prefix="/group-participants", tags=["group-participants"])
# api_router.include_router(messages.router, prefix="/messages", tags=["messages"])
# api_router.include_router(sessions.router, prefix="/sessions", tags=["sessions"])
# api_router.include_router(session_participants.router, prefix="/session-participants", tags=["session-participants"])
# api_router.include_router(feedback.router, prefix="/feedback", tags=["feedback"])
# api_router.include_router(papers.router, prefix="/papers", tags=["papers"])
# api_router.include_router(paper_tags.router, prefix="/paper-tags", tags=["paper-tags"])
# api_router.include_router(session_papers.router, prefix="/session-papers", tags=["session-papers"])
# api_router.include_router(ai_metadata.router, prefix="/ai-metadata", tags=["ai-metadata"])
