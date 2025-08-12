"""
Main API router that combines all endpoint routers
"""
from fastapi import APIRouter

from app.api.v1 import chat, system

api_router = APIRouter()

# Include routers
api_router.include_router(system.router, tags=["system"])
api_router.include_router(chat.router, prefix="/chat", tags=["chat"])
