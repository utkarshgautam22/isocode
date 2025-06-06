from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
import json

from app.db.database import get_db
from app.models.models import Problem, TestCase

# Create router for seeding data
router = APIRouter(prefix="/seed", tags=["seed"])

@router.post("/two-sum", response_model=dict)
async def seed_two_sum_problem(db: Session = Depends(get_db)):
    """
    Seed the database with the Two Sum problem and its test cases
    """
    # Check if problem already exists
    existing = db.query(Problem).filter(Problem.title == "Two Sum").first()
    if existing:
        return {"message": "Two Sum problem already exists", "problem_id": existing.id}
    
    # Create examples in the format needed
    examples = [
        {
            "input": "nums = [2,7,11,15], target = 9",
            "output": "[0,1]",
            "explanation": "Because nums[0] + nums[1] == 9, we return [0, 1]."
        },
        {
            "input": "nums = [3,2,4], target = 6",
            "output": "[1,2]",
            "explanation": "Because nums[1] + nums[2] == 6, we return [1, 2]."
        },
        {
            "input": "nums = [3,3], target = 6",
            "output": "[0,1]",
            "explanation": "Because nums[0] + nums[1] == 6, we return [0, 1]."
        }
    ]
    
    constraints = [
        "2 ≤ nums.length ≤ 10⁴",
        "-10⁹ ≤ nums[i] ≤ 10⁹",
        "-10⁹ ≤ target ≤ 10⁹",
        "Only one valid answer exists."
    ]
    
    tags = ["Array", "Hash Table"]
    
    description = """Given an array of integers <code>nums</code> and an integer <code>target</code>, return <em>indices of the two numbers such that they add up to target</em>.
    
<p>You may assume that each input would have <strong>exactly one solution</strong>, and you may not use the same element twice.</p>

<p>You can return the answer in any order.</p>"""
    
    # Create the problem
    new_problem = Problem(
        title="Two Sum",
        difficulty="Easy",
        description=description,
        examples=json.dumps(examples),
        constraints=json.dumps(constraints),
        tags=json.dumps(tags),
        acceptance=75.0,  # Just an example value
        likes=1234,
        dislikes=56,
        time_limit=1.0,
        memory_limit=128
    )
    
    db.add(new_problem)
    db.commit()
    db.refresh(new_problem)
    
    # Create sample test cases in the specified format
    sample_inputs = [
        "[2,7,11,15]\n9",
        "[3,2,4]\n6",
        "[3,3]\n6"
    ]
    sample_outputs = [
        "[0,1]",
        "[1,2]",
        "[0,1]"
    ]
    
    # Create hidden test cases for actual judging
    hidden_inputs = [
        "[1,2,3,4,5]\n9",
        "[5,6,7,8,9]\n14",
        "[0,1,2,3,4]\n4"
    ]
    hidden_outputs = [
        "[3,4]",
        "[0,3]",
        "[0,4]"
    ]
    
    # Format according to your specification
    sample_test_case = TestCase(
        problem_id=new_problem.id,
        input_data=str(len(sample_inputs)) + "\n" + "\n".join(sample_inputs),
        expected_output=str(len(sample_outputs)) + "\n" + "\n".join(sample_outputs),
        test_case_delimiter="\n",
        is_sample=True
    )
    
    hidden_test_case = TestCase(
        problem_id=new_problem.id,
        input_data=str(len(hidden_inputs)) + "\n" + "\n".join(hidden_inputs),
        expected_output=str(len(hidden_outputs)) + "\n" + "\n".join(hidden_outputs),
        test_case_delimiter="\n",
        is_sample=False
    )
    
    db.add(sample_test_case)
    db.add(hidden_test_case)
    db.commit()
    
    return {"message": "Two Sum problem and test cases created successfully", "problem_id": new_problem.id}

@router.post("/add-two-numbers", response_model=dict)
async def seed_add_two_numbers_problem(db: Session = Depends(get_db)):
    """
    Seed the database with the Add Two Numbers problem and its test cases
    """
    # Check if problem already exists
    existing = db.query(Problem).filter(Problem.title == "Add Two Numbers").first()
    if existing:
        return {"message": "Add Two Numbers problem already exists", "problem_id": existing.id}
    
    description = """<p>You are given two <b>non-empty</b> linked lists representing two non-negative integers. The digits are stored in <b>reverse order</b>, and each node contains a single digit. Add the two numbers and return the sum as a linked list.</p>

<p>You may assume the two numbers do not contain any leading zero, except the number 0 itself.</p>"""

    # Create examples in the format needed
    examples = [
        {
            "input": "l1 = [2,4,3], l2 = [5,6,4]",
            "output": "[7,0,8]",
            "explanation": "342 + 465 = 807."
        },
        {
            "input": "l1 = [0], l2 = [0]",
            "output": "[0]",
            "explanation": "0 + 0 = 0."
        },
        {
            "input": "l1 = [9,9,9,9,9,9,9], l2 = [9,9,9,9]",
            "output": "[8,9,9,9,0,0,0,1]",
            "explanation": "9999999 + 9999 = 10009998."
        }
    ]
    
    constraints = [
        "The number of nodes in each linked list is in the range [1, 100].",
        "0 <= Node.val <= 9",
        "It is guaranteed that the list represents a number that does not have leading zeros."
    ]
    
    tags = ["Linked List", "Math", "Recursion"]
    
    # Create the problem
    new_problem = Problem(
        title="Add Two Numbers",
        difficulty="Medium",
        description=description,
        examples=json.dumps(examples),
        constraints=json.dumps(constraints),
        tags=json.dumps(tags),
        acceptance=35.8,  # From the provided data
        likes=987,        # Example value
        dislikes=234,     # Example value
        time_limit=1.0,
        memory_limit=128
    )
    
    db.add(new_problem)
    db.commit()
    db.refresh(new_problem)
    
    # Create sample test cases in the specified format
    sample_inputs = [
        "[2,4,3]\n[5,6,4]",
        "[0]\n[0]",
        "[9,9,9,9,9,9,9]\n[9,9,9,9]"
    ]
    sample_outputs = [
        "[7,0,8]",
        "[0]",
        "[8,9,9,9,0,0,0,1]"
    ]
    
    # Create hidden test cases for actual judging
    hidden_inputs = [
        "[1,2,3,4]\n[5,6,7,8]",
        "[9,8,7,6,5]\n[1,2,3,4,5]",
        "[0,1,0,1]\n[9,8,9]"
    ]
    hidden_outputs = [
        "[6,8,0,3,1]",
        "[0,1,1,1,1,1]",
        "[9,9,9,1]"
    ]
    
    # Format according to your specification
    sample_test_case = TestCase(
        problem_id=new_problem.id,
        input_data=str(len(sample_inputs)) + "\n" + "\n".join(sample_inputs),
        expected_output=str(len(sample_outputs)) + "\n" + "\n".join(sample_outputs),
        test_case_delimiter="\n",
        is_sample=True
    )
    
    hidden_test_case = TestCase(
        problem_id=new_problem.id,
        input_data=str(len(hidden_inputs)) + "\n" + "\n".join(hidden_inputs),
        expected_output=str(len(hidden_outputs)) + "\n" + "\n".join(hidden_outputs),
        test_case_delimiter="\n",
        is_sample=False
    )
    
    db.add(sample_test_case)
    db.add(hidden_test_case)
    db.commit()
    
    return {"message": "Add Two Numbers problem and test cases created successfully", "problem_id": new_problem.id}
