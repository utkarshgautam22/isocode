from sqlalchemy import Column, Integer, String, Text, Boolean, ForeignKey, DateTime, Float
from sqlalchemy.orm import relationship
from datetime import datetime
from app.db.database import Base

# User model
class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    first_name = Column(String, nullable=False)
    last_name = Column(String, nullable=False)
    college = Column(String, nullable=True)
    department = Column(String, nullable=True)
    year = Column(String, nullable=True)
    programming_experience = Column(String, nullable=True)
    newsletter_subscribed = Column(Boolean, default=False)
    is_admin = Column(Boolean, default=False)
    is_email_verified = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, onupdate=datetime.utcnow)
    
    # Relationships
    submissions = relationship("Submission", back_populates="user")

# Problem model
class Problem(Base):
    __tablename__ = "problems"
    
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=False)
    difficulty = Column(String, nullable=False)  # Easy, Medium, Hard
    examples = Column(Text, nullable=True)  # JSON string of examples
    constraints = Column(Text, nullable=True)  #string of constraints
    tags = Column(Text, nullable=True)  # list of string of tags
    acceptance = Column(Float, default=0.0)  # Acceptance rate as a percentage
    likes = Column(Integer, default=0)
    dislikes = Column(Integer, default=0)
    time = Column(String, default="O(nlogn)")  # big o notation for time limit
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    test_cases = relationship("TestCase", back_populates="problem")
    submissions = relationship("Submission", back_populates="problem")
    
# TestCase model
class TestCase(Base):
    __tablename__ = "test_cases"
    
    id = Column(Integer, primary_key=True, index=True)
    problem_id = Column(Integer, ForeignKey("problems.id"))
    input_data = Column(Text)  # Format: "number_of_test_cases\ntest1\ntest2\ntest3"
    expected_output = Column(Text)  # Format: "number_of_outputs\noutput1\noutput2\noutput3"
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

# TestCase relationship for TestResult
TestResult.test_case = relationship("TestCase", backref="test_results")