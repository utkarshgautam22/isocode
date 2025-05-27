from sqlalchemy import Column, Integer, String, Text, Boolean, ForeignKey, DateTime, Float, create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship, sessionmaker
from datetime import datetime
import os

# Database URL - replace with your actual credentials
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://codejudge:12345678@localhost/codejudge")

# Create SQLAlchemy engine
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# User model
class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    is_admin = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    submissions = relationship("Submission", back_populates="user")

# Problem model
class Problem(Base):
    __tablename__ = "problems"
    
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=False)
    tag = Column(String, nullable=False)  # e.g., "Sorting", "Graph", etc.
    difficulty = Column(String, nullable=False)  # Easy, Medium, Hard
    time_limit = Column(Float, default=1.0)  # seconds
    memory_limit = Column(Integer, default=128)  # MB
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    test_cases = relationship("TestCase", back_populates="problem")
    submissions = relationship("Submission", back_populates="problem")

# TestCase model
class TestCase(Base):
    __tablename__ = "test_cases"
    
    id = Column(Integer, primary_key=True, index=True)
    problem_id = Column(Integer, ForeignKey("problems.id"))
    input_data = Column(Text)
    expected_output = Column(Text)
    is_sample = Column(Boolean, default=False)  # Sample test cases are visible to users
    
    # Relationship
    problem = relationship("Problem", back_populates="test_cases")

# Submission model
class Submission(Base):
    __tablename__ = "submissions"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    problem_id = Column(Integer, ForeignKey("problems.id"))
    language = Column(String, nullable=False)
    code = Column(Text, nullable=False)
    status = Column(String, nullable=False)  # Accepted, Wrong Answer, Runtime Error, etc.
    execution_time = Column(Float)  # seconds
    memory_used = Column(Integer)  # MB
    submitted_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    user = relationship("User", back_populates="submissions")
    problem = relationship("Problem", back_populates="submissions")
    test_results = relationship("TestResult", back_populates="submission")

# TestResult model - stores results for each test case
class TestResult(Base):
    __tablename__ = "test_results"
    
    id = Column(Integer, primary_key=True, index=True)
    submission_id = Column(Integer, ForeignKey("submissions.id"))
    test_case_id = Column(Integer, ForeignKey("test_cases.id"))
    status = Column(String, nullable=False)  # Passed, Failed
    execution_time = Column(Float)  # seconds
    memory_used = Column(Integer)  # MB
    output = Column(Text)
    
    # Relationship
    submission = relationship("Submission", back_populates="test_results")

# Create all tables
def create_tables():
    Base.metadata.create_all(bind=engine)

# Get database session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()