"""
Application configuration and settings
"""
import os
from typing import List
from pydantic_settings import BaseSettings
from dotenv import load_dotenv

# Load environment variables
load_dotenv()


class Settings(BaseSettings):
    """Application settings"""
    
    # Project info
    PROJECT_NAME: str = "AI Research Assistant API"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    
    # CORS
    ALLOWED_HOSTS: List[str] = [
        "http://localhost:3000",
        "http://localhost:5173",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173"
    ]
    
    # Groq API
    GROQ_API_KEY: str = os.getenv("GROQ_API_KEY", "")
    GROQ_MODEL_NAME: str = "llama-3.1-8b-instant"
    
    # Redis Configuration
    REDIS_HOST: str = os.getenv("REDIS_HOST", "redis-17345.c305.ap-south-1-1.ec2.redns.redis-cloud.com")
    REDIS_PORT: int = int(os.getenv("REDIS_PORT", "17345"))
    REDIS_USERNAME: str = os.getenv("REDIS_USERNAME", "default")
    REDIS_PASSWORD: str = os.getenv("REDIS_PASSWORD", "9A5pbzj0oxuhQm5ui8FyGmLWtKwgTfRj")
    REDIS_SESSION_TTL_HOURS: int = int(os.getenv("REDIS_SESSION_TTL_HOURS", "24"))
    
    # Chat settings
    MAX_CONVERSATION_HISTORY: int = 10
    
    class Config:
        case_sensitive = True


settings = Settings()
