"""
Application configuration settings
"""
import os
from typing import List
from dotenv import load_dotenv
from pathlib import Path

# Load environment variables from .env file
env_path = Path(__file__).parent.parent / ".env"
load_dotenv(dotenv_path=env_path)


class Settings:
    """Application settings"""
    
    PROJECT_NAME: str = os.getenv("PROJECT_NAME", "AI Research Assistant API")
    VERSION: str = os.getenv("VERSION", "1.0.0")
    API_V1_STR: str = os.getenv("API_V1_STR", "/api/v1")
    
    # CORS settings
    ALLOWED_HOSTS: List[str] = []
    
    def __init__(self):
        """Initialize settings with proper CORS configuration"""
        allowed_hosts_str = os.getenv(
            "ALLOWED_HOSTS", 
            "http://localhost:3000,http://127.0.0.1:3000,http://localhost:8000,http://127.0.0.1:8000,http://20.205.131.237,http://localhost"
        )
        self.ALLOWED_HOSTS = [host.strip() for host in allowed_hosts_str.split(",") if host.strip()]
        
        # Add any additional hosts from ALLOWED_ORIGINS for compatibility
        allowed_origins_str = os.getenv("ALLOWED_ORIGINS", "")
        if allowed_origins_str:
            additional_origins = [origin.strip() for origin in allowed_origins_str.split(",") if origin.strip()]
            # Merge and deduplicate
            all_hosts = list(set(self.ALLOWED_HOSTS + additional_origins))
            self.ALLOWED_HOSTS = all_hosts
    
    # Database settings
    DATABASE_URL: str = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@127.0.0.1:54322/postgres")
    
    # RAG Service API Keys
    PINECONE_API_KEY: str = os.getenv("PINECONE_API_KEY", "")
    COHERE_API_KEY: str = os.getenv("COHERE_API_KEY", "")
    GROQ_API_KEY: str = os.getenv("GROQ_API_KEY", "")
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    
    # Express DB Server URL for communication (required when FastAPI needs database operations)
    EXPRESS_DB_URL: str = os.getenv("EXPRESS_DB_URL", "http://localhost:3001")
    
    # Redis removed - not needed for this project
    
    # Environment
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")
    DEBUG: bool = os.getenv("DEBUG", "True").lower() == "true"


settings = Settings()
