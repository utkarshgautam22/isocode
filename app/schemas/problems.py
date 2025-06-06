from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime
import json

# Problem Schemas
class TestCaseBase(BaseModel):
    input_data: str
    expected_output: str
    is_sample: bool = False

class TestCase(TestCaseBase):
    id: int
    problem_id: int

    class Config:
        from_attributes = True

class TestCaseSample(BaseModel):
    input_data: str
    expected_output: str

    class Config:
        from_attributes = True
    

class Example(BaseModel):
    input: str
    output: str
    explanation: Optional[str] = None

class ProblemBase(BaseModel):
    title: str
    difficulty: str
    description: str
    constraints: Optional[List[str]] = None
    examples: Optional[List[Example]] = None
    tags: Optional[List[str]] = None
    acceptance: float = 0.0
    likes: int = 0
    dislikes: int = 0
    time: str = "O(nlogn)"

class Problem(ProblemBase):
    id: int
    created_at: datetime
    test_cases: List[TestCase] = []

    class Config:
        from_attributes = True
        
    @classmethod
    def from_orm(cls, obj):
        # Convert string-stored fields to Python objects
        if obj.examples and isinstance(obj.examples, str):
            try:
                obj.examples = json.loads(obj.examples)
            except:
                obj.examples = []
                
        if obj.constraints and isinstance(obj.constraints, str):
            try:
                obj.constraints = json.loads(obj.constraints)
            except:
                obj.constraints = []
                
        if obj.tags and isinstance(obj.tags, str):
            try:
                obj.tags = json.loads(obj.tags)
            except:
                obj.tags = []
                
        return super().from_orm(obj)

class ProblemList(BaseModel):
    id: int
    title: str
    difficulty: str
    acceptance: float
    tags: Optional[List[str]] = None
    frequency: Optional[int] = 80
    status: Optional[str] = "solved"
    category: Optional[str] = "arrays"

    class Config:
        from_attributes = True
        
    @classmethod
    def from_orm(cls, obj):
        # Convert tags from JSON string to list
        if obj.tags and isinstance(obj.tags, str):
            try:
                obj.tags = json.loads(obj.tags)
            except:
                obj.tags = []
                
        return super().from_orm(obj)

class ProblemCreate(ProblemBase):
    pass

# Submission Schemas
class SubmissionBase(BaseModel):
    language: str
    code: str

class SubmissionCreate(SubmissionBase):
    problem_id: int

class TestResultBase(BaseModel):
    status: str
    execution_time: Optional[float] = None
    memory_used: Optional[int] = None
    output: Optional[str] = None

class TestResultCreate(TestResultBase):
    test_case_id: int

class TestResult(TestResultBase):
    id: int
    submission_id: int
    test_case_id: int
    
    class Config:
        from_attributes = True

class Submission(SubmissionBase):
    id: int
    user_id: int
    problem_id: int
    status: str
    execution_time: Optional[float] = None
    memory_used: Optional[int] = None
    submitted_at: datetime
    test_results: List[TestResult] = []
    
    class Config:
        from_attributes = True
