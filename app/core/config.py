import os
from pydantic_settings import BaseSettings
from typing import Optional, Dict, Any, List

class Settings(BaseSettings):
    """Application settings"""
    
    # API settings
    API_V1_STR: str = "/api/v1"
    PROJECT_NAME: str = "IsoCode"
    
    # Security settings
    SECRET_KEY: str = os.getenv("SECRET_KEY", "codebase@new")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    
    # Database settings
    DATABASE_URL: str = os.getenv("DATABASE_URL","postgresql://codejudge:12345678@localhost/codejudge")
    
    # Docker settings
    DOCKER_BASE_IMAGE: str = "python:3.9-slim"
    DOCKER_TIMEOUT: int = 10  # seconds
    DOCKER_MEMORY_LIMIT: str = "128m"
    
    # CORS settings
    CORS_ORIGINS: List[str] = ["*"]  # For development only
    
    # Email settings
    SMTP_SERVER: str = os.getenv("SMTP_SERVER", "smtp.gmail.com")
    SMTP_PORT: int = int(os.getenv("SMTP_PORT", "587"))
    SMTP_USERNAME: str = os.getenv("SMTP_USERNAME", "")
    SMTP_PASSWORD: str = os.getenv("SMTP_PASSWORD", "")
    SMTP_USE_TLS: bool = os.getenv("SMTP_USE_TLS", "True").lower() == "true"
    SMTP_TIMEOUT: int = int(os.getenv("SMTP_TIMEOUT", "10"))
    SMTP_MAX_CONNECTIONS: int = int(os.getenv("SMTP_MAX_CONNECTIONS", "5"))
    
    # Frontend settings
    FRONTEND_URL: str = os.getenv("FRONTEND_URL", "http://localhost:3000")
    
    class Config:
        env_file = ".env"
        case_sensitive = True

settings = Settings()
