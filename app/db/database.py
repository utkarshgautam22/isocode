from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
from fastapi import Depends
import os

# Import settings
from app.core.config import settings

# Database connection URL from settings
DATABASE_URL = settings.DATABASE_URL

# Create SQLAlchemy engine - different configuration based on database type
# PostgreSQL or other database configuration
engine = create_engine(DATABASE_URL)

# Create session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base class for all database models
Base = declarative_base()

# Dependency to get DB session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
 # Ensure tables are created when the module is imported
