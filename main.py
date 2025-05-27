from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from typing import List, Optional
import docker
from datetime import datetime, timedelta
import jwt
from passlib.context import CryptContext

from coderun import execute_code
from model import get_db, User, Problem, TestCase, Submission, TestResult

app = FastAPI()
client = docker.from_env()

# Security
SECRET_KEY = "codebase@new"  # Change this!
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

# Helper functions for security
def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=15))
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

# Add this endpoint

@app.get("/db-test")
async def test_db(db: Session = Depends(get_db)):
    try:
        # Try a simple query
        db.execute("SELECT 1").fetchall()
        return {"status": "Database connection successful"}
    except Exception as e:
        return {"status": "Database connection failed", "error": str(e)}
    
def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
    except jwt.PyJWTError:
        raise credentials_exception
    user = db.query(User).filter(User.username == username).first()
    if user is None:
        raise credentials_exception
    return user

@app.post("/token")
async def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == form_data.username).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.username}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

@app.post("/run/")
async def run_code(code: str, language: str, db: Session = Depends(get_db)):
    try:
        result = execute_code(language=language, source_code=code)
        return {"result": result}
    except Exception as e:
        return {"error": str(e)}

@app.post("/submit/{problem_id}")
async def submit_code(
    problem_id: int, 
    code: str, 
    language: str, 
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Check if problem exists
    problem = db.query(Problem).filter(Problem.id == problem_id).first()
    if not problem:
        raise HTTPException(status_code=404, detail="Problem not found")
    
    # Get test cases for the problem
    test_cases = db.query(TestCase).filter(TestCase.problem_id == problem_id).all()
    if not test_cases:
        raise HTTPException(status_code=404, detail="No test cases found for this problem")
    
    # Prepare input and expected output
    input_data = ""
    expected_output = ""
    for i, test_case in enumerate(test_cases):
        input_data += f"--- TEST CASE {i+1} ---\n{test_case.input_data}\n"
        expected_output += f"--- TEST CASE {i+1} ---\n{test_case.expected_output}\n"
    
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

@app.post("/register/")
async def register_user(username: str, email: str, password: str, db: Session = Depends(get_db)):
    # Check if username already exists
    existing_user = db.query(User).filter(User.username == username).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Username already registered")
    
    # Check if email already exists
    existing_email = db.query(User).filter(User.email == email).first()
    if existing_email:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Create new user
    hashed_password = get_password_hash(password)
    new_user = User(
        username=username,
        email=email,
        hashed_password=hashed_password
    )
    
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    return {"message": "User registered successfully", "user_id": new_user.id}

@app.post("/login/")
async def login_user(username: str, password: str, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == username).first()
    if not user or not verify_password(password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password"
        )
    
    # Generate JWT token
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.username}, expires_delta=access_token_expires
    )
    
    return {"access_token": access_token, "token_type": "bearer", "user_id": user.id}

# Problem management endpoints
@app.post("/problems/")
async def create_problem(
    title: str,
    description: str,
    difficulty: str,
    time_limit: float = 1.0,
    memory_limit: int = 128,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Only admins can create problems
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Not authorized to create problems")
    
    new_problem = Problem(
        title=title,
        description=description,
        difficulty=difficulty,
        time_limit=time_limit,
        memory_limit=memory_limit
    )
    
    db.add(new_problem)
    db.commit()
    db.refresh(new_problem)
    
    return {"message": "Problem created successfully", "problem_id": new_problem.id}

@app.post("/problems/{problem_id}/test-cases/")
async def add_test_case(
    problem_id: int,
    input_data: str,
    expected_output: str,
    is_sample: bool = False,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Only admins can add test cases
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Not authorized to add test cases")
    
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

@app.get("/problems/")
async def get_problems(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    problems = db.query(Problem).offset(skip).limit(limit).all()
    return {"problems": problems}

@app.get("/problems/{problem_id}")
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
    
    return {
        "problem": problem,
        "sample_test_cases": sample_test_cases
    }

@app.get("/submissions/")
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

@app.get("/submissions/{submission_id}")
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
    if submission.user_id != current_user.id and not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Not authorized to view this submission")
    
    # Get test results
    test_results = db.query(TestResult).filter(
        TestResult.submission_id == submission_id
    ).all()
    
    return {
        "submission": submission,
        "test_results": test_results
    }