from fastapi import APIRouter, Depends, HTTPException, status, Body
from sqlalchemy.orm import Session
from typing import List, Dict, Any
import json

from app.db.database import get_db
from app.models.models import Problem, TestCase, Submission, TestResult, User
from app.api.auth import get_current_user
from app.services.code_execution import execute_code
from app.schemas.problems import ProblemList, ProblemCreate

# Create router
router = APIRouter(tags=["problems"])

# Problem management endpoints
@router.post("/problems/", response_model=dict)
async def create_problem(
    problem: ProblemCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # In a production environment, you'd check if user is admin
    # if not current_user.is_admin:
    #    raise HTTPException(status_code=403, detail="Not authorized to create problems")
    
    # Convert lists to JSON strings for database storage
    examples_json = json.dumps(problem.examples) if problem.examples else None
    constraints_json = json.dumps(problem.constraints) if problem.constraints else None
    tags_json = json.dumps(problem.tags) if problem.tags else None
    
    new_problem = Problem(
        title=problem.title,
        description=problem.description,
        difficulty=problem.difficulty,
        examples=examples_json,
        constraints=constraints_json,
        tags=tags_json,
        acceptance=problem.acceptance,
        likes=problem.likes,
        dislikes=problem.dislikes,
    )
    
    db.add(new_problem)
    db.commit()
    db.refresh(new_problem)
    
    return {"message": "Problem created successfully", "problem_id": new_problem.id}

@router.post("/problems/{problem_id}/test-cases/", response_model=dict)
async def add_test_case(
    problem_id: int,
    input_data: str,
    expected_output: str,
    is_sample: bool = False,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # In a production environment, you'd check if user is admin
    # if not current_user.is_admin:
    #    raise HTTPException(status_code=403, detail="Not authorized to add test cases")
    
    # Check if problem exists
    problem = db.query(Problem).filter(Problem.id == problem_id).first()
    if not problem:
        raise HTTPException(status_code=404, detail="Problem not found")
    
    new_test_case = TestCase(
        problem_id=problem_id,
        input_data=input_data,
        expected_output=expected_output,
        is_sample=is_sample
    )
    
    db.add(new_test_case)
    db.commit()
    db.refresh(new_test_case)
    
    return {"message": "Test case added successfully", "test_case_id": new_test_case.id}

@router.get("/problems", response_model=dict)
async def get_problems(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    problems = db.query(Problem).offset(skip).limit(limit).all()
    serialized_problems = [ProblemList.from_orm(problem).dict() for problem in problems]
    return {"problems": serialized_problems}

@router.get("/problems/{problem_id}", response_model=dict)
async def get_problem(
    problem_id: int,
    db: Session = Depends(get_db)
):
    problem = db.query(Problem).filter(Problem.id == problem_id).first()
    if not problem:
        raise HTTPException(status_code=404, detail="Problem not found")
    
    # Get sample test cases
    sample_test_cases = db.query(TestCase).filter(
        TestCase.problem_id == problem_id,
        TestCase.is_sample == True
    ).all()
    
    from app.schemas.problems import Problem as ProblemSchema
    # from app.schemas.problems import TestCaseSample
    
    # Convert SQLAlchemy models to Pydantic models for serialization
    problem_schema = ProblemSchema.from_orm(problem)
    # sample_test_cases = TestCaseSample.from_orm(sample_test_cases)
    # Parse sample test cases (input/output) into lists
    sample_test_cases_list = []
    for tc in sample_test_cases:
        # Split input and output by lines
        input_lines = tc.input_data.strip().split('\n')
        output_lines = tc.expected_output.strip().split('\n')
        # If first line is number of test cases, skip it for each test case
        inputs = input_lines[1:]
        output = output_lines[1:]
        # Pair each input/output (if lengths match)
        for i, (inp, out) in enumerate(zip(inputs, output)):
            sample_test_cases_list.append({
                "input_data": inp,
                "expected_output": out
            })

    return {
        "problem": problem_schema,
        "sample_test_cases": sample_test_cases_list
    }

# Code execution endpoints
@router.post("/run/{problem_id}", response_model=dict)
async def run_code(
    problem_id: int,
    request_body: dict = Body(...),
    db: Session = Depends(get_db)
):
    problem = db.query(Problem).filter(Problem.id == problem_id).first()
    if not problem:
        raise HTTPException(status_code=404, detail="Problem not found")
    
    # Extract code and language from request body
    code = request_body.get("code")
    language = request_body.get("language")
    
    if not code:
        raise HTTPException(status_code=400, detail="Code is required")
    if not language:
        raise HTTPException(status_code=400, detail="Language is required")
    
    # Get test cases for the problem with is_sample=true
    test_cases = db.query(TestCase).filter(
        TestCase.problem_id == problem_id,
        TestCase.is_sample == True
    ).all()
    if not test_cases:
        raise HTTPException(status_code=404, detail="No sample test cases found for this problem")
    
    input_data = ""
    expected_output = ""
    for i, test_case in enumerate(test_cases):
        input_data += f"{test_case.input_data}\n"
        expected_output += f"{test_case.expected_output}\n"

    try:
        result = execute_code(
            language=language, 
            source_code=code,
            input_data=input_data,
            expected_output=expected_output,
            early_termination=False
        )
        return {"result": result}
    except Exception as e:
        return {"error": str(e)}

@router.post("/submit/{problem_id}", response_model=dict)
async def submit_code(
    problem_id: int, 
    request_body: dict = Body(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Check if problem exists
    problem = db.query(Problem).filter(Problem.id == problem_id).first()
    if not problem:
        raise HTTPException(status_code=404, detail="Problem not found")
    
    # Extract code and language from request body
    code = request_body.get("code")
    language = request_body.get("language")
    
    if not code:
        raise HTTPException(status_code=400, detail="Code is required")
    if not language:
        raise HTTPException(status_code=400, detail="Language is required")
    
    # Get test cases for the problem
    test_cases = db.query(TestCase).filter(TestCase.problem_id == problem_id).all()
    if not test_cases:
        raise HTTPException(status_code=404, detail="No test cases found for this problem")
    
    # Prepare input and expected output
    input_data = ""
    expected_output = ""
    for i, test_case in enumerate(test_cases):
        input_data += f"{test_case.input_data}\n"
        expected_output += f"{test_case.expected_output}\n"
    
    try:
        # Execute code with test cases
        result = execute_code(
            language=language, 
            source_code=code,
            input_data=input_data,
            expected_output=expected_output
        )
        
        # Create submission record
        submission = Submission(
            user_id=current_user.id,
            problem_id=problem_id,
            language=language,
            code=code,
            status="Accepted" if result.get("all_passed", False) else "Failed",
            execution_time=result.get("execution_time"),
            memory_used=result.get("memory_used")
        )
        db.add(submission)
        db.flush()
        
        # Create test result records
        for i, test_result in enumerate(result.get("test_results", [])):
            test_case = test_cases[i] if i < len(test_cases) else None
            if test_case:
                db_test_result = TestResult(
                    submission_id=submission.id,
                    test_case_id=test_case.id,
                    status="Passed" if test_result.get("passed") else "Failed",
                    execution_time=test_result.get("execution_time"),
                    memory_used=test_result.get("memory_used"),
                    output=test_result.get("output")
                )
                db.add(db_test_result)
        
        db.commit()
        return {"result": result, "submission_id": submission.id}
    
    except Exception as e:
        db.rollback()
        return {"error": str(e)}

# Submission endpoints
@router.get("/submissions/", response_model=dict)
async def get_user_submissions(
    current_user: User = Depends(get_current_user),
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    submissions = db.query(Submission).filter(
        Submission.user_id == current_user.id
    ).order_by(Submission.submitted_at.desc()).offset(skip).limit(limit).all()
    
    return {"submissions": submissions}

@router.get("/submissions/{submission_id}", response_model=dict)
async def get_submission_details(
    submission_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    submission = db.query(Submission).filter(
        Submission.id == submission_id
    ).first()
    
    if not submission:
        raise HTTPException(status_code=404, detail="Submission not found")
    
    # Check if user is authorized to view this submission
    if submission.user_id != current_user.id:
        # In a production environment, you'd check if user is admin
        # if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Not authorized to view this submission")
    
    # Get test results
    test_results = db.query(TestResult).filter(
        TestResult.submission_id == submission_id
    ).all()
    
    return {
        "submission": submission,
        "test_results": test_results
    }
