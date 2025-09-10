"""
Background tasks and lifespan management
"""
from contextlib import asynccontextmanager
from fastapi import FastAPI
import logging

logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan management"""
    # Startup
    logger.info("Starting up the AI Research Assistant API...")
    
    # Initialize database models (will use mock data if DB not available)
    try:
        from db.models import DatabaseModel
        DatabaseModel.initialize_db()
        logger.info("Database models initialized")
    except Exception as e:
        logger.warning(f"Database initialization failed, using mock data: {e}")
    
    yield
    
    # Shutdown
    logger.info("Shutting down the AI Research Assistant API...")
