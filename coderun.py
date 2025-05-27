#!/usr/bin/env python3
# filepath: /home/utkarsh/Desktop/codejudge/test_standalone.py
import uuid
import os
import docker
import shutil
import json
import re
import logging
from datetime import datetime

# Set up logging
log_file = f"submissions/codejudge_{datetime.now().strftime('%Y%m%d_%H%M%S')}.log"
os.makedirs("submissions", exist_ok=True)

# Configure the logger
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(log_file),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger('codejudge')

# Initialize Docker client
client = docker.from_env()

def parse_test_cases(input_data, expected_output=None):
    # Define test case delimiters
    test_case_pattern = r"---\s*TEST\s*CASE\s*\d+\s*---"
    
    if not input_data:
        return [{'input': '', 'expected_output': expected_output}]
    
    # Split input by test case delimiter
    input_parts = re.split(test_case_pattern, input_data)
    # Remove empty parts and strip whitespace
    input_parts = [part.strip() for part in input_parts if part.strip()]
    
    # If no test case delimiters found, treat the whole input as one test case
    if len(input_parts) == 1 and input_data.strip() == input_parts[0]:
        return [{'input': input_data, 'expected_output': expected_output}]
    
    # If expected output is provided, try to split it into parts as well
    expected_parts = []
    if expected_output:
        expected_parts = re.split(test_case_pattern, expected_output)
        expected_parts = [part.strip() for part in expected_parts if part.strip()]
    
    # Create test cases
    test_cases = []
    for i, input_part in enumerate(input_parts):
        test_case = {
            'input': input_part,
            'expected_output': expected_parts[i] if i < len(expected_parts) else None
        }
        test_cases.append(test_case)
    
    return test_cases

def compare_output(actual, expected):
    if not expected:
        return True, "No expected output provided for comparison"
    
    # Normalize line endings and whitespace
    actual = actual.rstrip().replace('\r\n', '\n')
    expected = expected.rstrip().replace('\r\n', '\n')
    
    if actual == expected:
        return True, "Output matches expected result"
    else:
        # Find the first difference for better error reporting
        lines_actual = actual.split('\n')
        lines_expected = expected.split('\n')
        
        for i, (a_line, e_line) in enumerate(zip(lines_actual, lines_expected)):
            if a_line != e_line:
                return False, f"Mismatch at line {i+1}:\nExpected: '{e_line}'\nActual: '{a_line}'"
        
        # If we get here, one string has more lines than the other
        if len(lines_actual) < len(lines_expected):
            return False, f"Output is missing lines. Expected {len(lines_expected)} lines but got {len(lines_actual)}"
        else:
            return False, f"Output has extra lines. Expected {len(lines_expected)} lines but got {len(lines_actual)}"

def execute_code(language, source_code, input_data=None, expected_output=None, early_termination=True):
    logger.info(f"Starting test for {language}")
    # Generate a unique ID for this submission
    code_id = str(uuid.uuid4())
    logger.info(f"Generated code_id: {code_id}")

    # Define language configurations (copied from main.py)
    language_configs = {
        "python": {"ext": "py", "image": "python:3.8", "cmd": "python /code/{code_id}.py"},
        "javascript": {"ext": "js", "image": "node:14", "cmd": "node /code/{code_id}.js"},
        "java": {"ext": "java", "image": "openjdk:11", "cmd": "javac /code/{code_id}.java && java -cp /code Main"},
        "c": {"ext": "c", "image": "gcc:latest", "cmd": "gcc /code/{code_id}.c -o /code/{code_id} && /code/{code_id}"},
        "c++": {"ext": "cpp", "image": "gcc:latest", "cmd": "g++ /code/{code_id}.cpp -o /code/{code_id} && /code/{code_id}"}
    }
    
    # Check if language is supported
    if language not in language_configs:
        return {"error": "Unsupported language"}
    
    # Get config for the language
    config = language_configs[language]
    filename = f"submissions/{code_id}.{config['ext']}"
    
    # Ensure submissions directory exists
    os.makedirs("submissions", exist_ok=True)
    test_dir = f"submissions/{code_id}_tests"
    os.makedirs(test_dir, exist_ok=True)
    logger.info(f"Created test directory: {test_dir}")
    
    # Write source code to file
    with open(filename, "wb") as f:
        f.write(source_code.encode('utf-8'))
    logger.info(f"Created file: {filename}")
    
    # Parse test cases from input data
    test_cases = parse_test_cases(input_data, expected_output)
    logger.info(f"Found {len(test_cases)} test case(s)")
    
    # Write test cases to files
    for i, test_case in enumerate(test_cases):
        test_input = test_case['input']
        if test_input:
            input_file = f"{test_dir}/input_{i}.txt"
            with open(input_file, "w") as f:
                f.write(test_input)
            logger.info(f"Created input file for test case {i+1}: {input_file}")
            
    # Create a wrapper script for running test cases if there's more than one
    if len(test_cases) > 1:
        wrapper_script = f"{test_dir}/run_tests.sh"
        with open(wrapper_script, "w") as f:
            f.write("#!/bin/sh\n")
            f.write("# Wrapper script for running test cases with early termination\n\n")
            f.write(f"CODE_CMD=\"{config['cmd'].format(code_id=code_id)}\"\n\n")
            
            for i in range(len(test_cases)):
                f.write(f"echo \"Running test case {i+1}/{len(test_cases)}...\"\n")
                f.write(f"if [ -f /tests/input_{i}.txt ]; then\n")
                f.write(f"  cat /tests/input_{i}.txt | $CODE_CMD > /tests/output_{i}.txt\n")
                f.write("  EXIT_CODE=$?\n")
                f.write("  if [ $EXIT_CODE -ne 0 ]; then\n")
                f.write(f"    echo \"Test {i+1} failed with exit code $EXIT_CODE\"\n")
                f.write("    exit $EXIT_CODE\n")
                f.write("  fi\n")
                f.write("else\n")
                f.write(f"  $CODE_CMD > /tests/output_{i}.txt\n")
                f.write("  EXIT_CODE=$?\n")
                f.write("  if [ $EXIT_CODE -ne 0 ]; then\n")
                f.write(f"    echo \"Test {i+1} failed with exit code $EXIT_CODE\"\n")
                f.write("    exit $EXIT_CODE\n")
                f.write("  fi\n")
                f.write("fi\n\n")
            
            f.write("echo \"All tests completed successfully\"\n")
            f.write("exit 0\n")
            
        # Make wrapper script executable
        os.chmod(wrapper_script, 0o755)
        logger.info(f"Created test wrapper script: {wrapper_script}")
    
    test_results = []
    all_passed = True
    container = None
    
    try:
        logger.info(f"Creating Docker container with image: {config['image']}")
        
        # Create the container but don't start it yet
        container_cmd = "/bin/sh"  # We'll execute commands through exec
        container = client.containers.create(
            image=config['image'],
            command=container_cmd,
            volumes={
                os.path.abspath('submissions'): {'bind': '/code', 'mode': 'ro'},
                os.path.abspath(test_dir): {'bind': '/tests', 'mode': 'rw'}
            },
            network_mode="none",
            mem_limit="128m",
            cpu_quota=50000,
            detach=True,  # Detached mode because we'll be executing commands
            user="1000:1000",
            security_opt=["no-new-privileges"],
            pids_limit=100,
            cap_drop=["ALL"],
            tty=True  # Allocate a TTY for interactive commands
        )
        
        # Start the container
        container.start()
        logger.info(f"Container {container.short_id} started successfully")
        
        # Process test cases
        for i, test_case in enumerate(test_cases):
            test_input = test_case['input']
            test_expected = test_case['expected_output']
            
            logger.info(f"Running test case {i+1}/{len(test_cases)}")
            
            try:
                # Run the code with this test case input
                if len(test_cases) == 1:
                    # For single test case, simplify execution
                    if test_input:
                        exec_cmd = f"sh -c 'cat /tests/input_{i}.txt | {config['cmd'].format(code_id=code_id)}'"
                    else:
                        exec_cmd = config['cmd'].format(code_id=code_id)
                    
                    logger.info(f"Running command: {exec_cmd}")
                    exit_code, logs = container.exec_run(exec_cmd)
                    logs = logs.decode('utf-8', errors='replace')
                else:
                    # Just run the single test case
                    exec_cmd = f"sh -c 'cat /tests/input_{i}.txt | {config['cmd'].format(code_id=code_id)} > /tests/output_{i}.txt'"
                    logger.info(f"Running command: {exec_cmd}")
                    exit_code, logs = container.exec_run(exec_cmd)
                    
                    if exit_code == 0:
                        # Read the output file
                        cat_cmd = f"cat /tests/output_{i}.txt"
                        _, output = container.exec_run(cat_cmd)
                        logs = output.decode('utf-8', errors='replace')
                    else:
                        logs = logs.decode('utf-8', errors='replace')
                
                # If the code execution was successful
                if exit_code == 0:
                    logger.info(f"Test case {i+1} execution completed")
                    
                    # If expected output is provided, validate the result
                    test_passed = True
                    comparison_result = "No expected output for validation"
                    
                    if test_expected:
                        test_passed, comparison_result = compare_output(logs, test_expected)
                        if test_passed:
                            logger.info(f"Test case {i+1} passed ✓")
                        else:
                            logger.error(f"Test case {i+1} failed: {comparison_result}")
                            all_passed = False
                    
                    # Add result for this test case
                    test_results.append({
                        "test_case": i + 1,
                        "input": test_input,
                        "expected_output": test_expected,
                        "actual_output": logs,
                        "passed": test_passed,
                        "details": comparison_result
                    })
                    
                    # If early termination is enabled and test failed, stop processing
                    if early_termination and not test_passed:
                        logger.info(f"Early termination activated after failed test case {i+1}")
                        break
                else:
                    # The code execution failed
                    logger.error(f"Test case {i+1} execution failed with exit code {exit_code}")
                    
                    # Add failed result
                    test_results.append({
                        "test_case": i + 1,
                        "input": test_input,
                        "expected_output": test_expected,
                        "actual_output": logs,
                        "passed": False,
                        "details": f"Execution error (code {exit_code}): {logs}"
                    })
                    all_passed = False
                    
                    # Early termination on container error
                    if early_termination:
                        logger.info(f"Early termination activated after container error")
                        break
                
            except docker.errors.APIError as e:
                # Docker API error
                logs = str(e)
                logger.error(f"Docker API error during test case {i+1}: {logs}")
                
                # Add failed result
                test_results.append({
                    "test_case": i + 1,
                    "input": test_input,
                    "expected_output": test_expected,
                    "actual_output": "",
                    "passed": False,
                    "details": f"Docker API error: {logs}"
                })
                all_passed = False
                
                # Early termination on API error
                if early_termination:
                    break
        # Prepare the final result
        if all_passed:
            logger.info(f"All test cases passed")
            result = {
                "status": "success", 
                "all_passed": True,
                "test_results": test_results,
                "passed_count": len([r for r in test_results if r["passed"]]),
                "total_count": len(test_results)
            }
        else:
            logger.warning(f"Some test cases failed")
            result = {
                "status": "failure", 
                "all_passed": False,
                "test_results": test_results,
                "passed_count": len([r for r in test_results if r["passed"]]),
                "total_count": len(test_results)
            }
        
        return result
        
    except docker.errors.APIError as e:
        logger.error(f"Docker API error: {str(e)}")
        return {"status": "error", "message": "Docker API error", "details": str(e)}
    
    except Exception as e:
        logs = str(e)
        logger.error(f"Unexpected exception: {logs}")
        return {"status": "error", "output": logs}
    
    finally:
        # Clean up container if it exists
        if container:
            try:
                logger.info(f"Stopping container {container.short_id}...")
                # Use kill instead of stop for faster termination (no 10-second grace period)
                container.kill()
                logger.info(f"Removing container {container.short_id}...")
                container.remove(v=True)  # v=True removes volumes associated with the container
                logger.info(f"Container cleanup complete")
            except Exception as e:
                logger.warning(f"Error cleaning up container: {str(e)}")
        
        # Clean up test directory
        if os.path.exists(test_dir):
            try:
                logger.info(f"Cleaning up test directory: {test_dir}...")
                shutil.rmtree(test_dir)
                logger.info(f"Test directory cleanup complete")
            except Exception as e:
                logger.warning(f"Error cleaning up test directory: {str(e)}")
        
        # Clean up the source code file
        if os.path.exists(filename):
            logger.info(f"Cleaning up temporary file: {filename}...")
            os.remove(filename)
            logger.info(f"File cleanup complete")


















# Example usage
if __name__ == "__main__":
    print("CODE JUDGE TEST SCRIPT")
    
    # First check if Docker is running and accessible
    try:
        client.ping()
        print("[INFO] Docker service is running and accessible ✓")
    except docker.errors.DockerException as e:
        print("\n[ERROR] Cannot access Docker service! This might be due to:")
        exit(1)
    
    # Test 1: Simple Python input processing with multiple test cases
    python_input_code = """
# This code processes input from stdin
nums = list(map(int, input().split()))
print(f"Sum of input numbers: {sum(nums)}")
print(f"Average: {sum(nums)/len(nums)}")
"""
    # Multiple test cases with expected output
    input_data = """
--- TEST CASE 1 ---
10 20 30 40 50

--- TEST CASE 2 ---
1 2 3 4 5

--- TEST CASE 3 ---
100 200
"""

    expected_output = """
--- TEST CASE 1 ---
Sum of input numbers: 150
Average: 30.0

--- TEST CASE 2 ---
Sum of input numbers: 15
Average: 3.0

--- TEST CASE 3 ---
Sum of input numbers: 300
Average: 150.0
"""
    
    print("\n=== TEST: Python with Multiple Test Cases and Early Termination ===")
    result = execute_code("python", python_input_code, input_data, expected_output, early_termination=True)
    print("\nPython multi-test result:")
    print(json.dumps(result, indent=2))
    print("-" * 50)
    
    # Test with a failing test case that should trigger early termination
    python_fail_code = """
# This code has a bug that will make some test cases fail
nums = list(map(int, input().split()))
# Bug: we add 1 to sum, which will make test cases fail
print(f"Sum of input numbers: {sum(nums) + 1}")
print(f"Average: {sum(nums)/len(nums)}")
"""

    print("\n=== TEST: Python with Failing Test Case and Early Termination ===")
    result = execute_code("python", python_fail_code, input_data, expected_output, early_termination=True)
    print("\nPython failing test result:")
    print(json.dumps(result, indent=2))
    print("-" * 50)
    
    # Test with a failing test case but without early termination
    print("\n=== TEST: Python with Failing Test Case WITHOUT Early Termination ===")
    result = execute_code("python", python_fail_code, input_data, expected_output, early_termination=False)
    print("\nPython without early termination result:")
    print(json.dumps(result, indent=2))
    print("-" * 50)

    # Test 4: New test case - Recursive Fibonacci with multiple test cases
    print("\n=== TEST: Recursive Fibonacci with Multiple Test Cases ===")
    fibonacci_code = """
# Recursive Fibonacci implementation
def fibonacci(n):
    if n <= 1:
        return n
    return fibonacci(n-1) + fibonacci(n-2)

n = int(input().strip())
print(f"Fibonacci({n}) = {fibonacci(n)}")
"""

    fib_input_data = """
--- TEST CASE 1 ---
0

--- TEST CASE 2 ---
1

--- TEST CASE 3 ---
5

--- TEST CASE 4 ---
10
"""

    fib_expected_output = """
--- TEST CASE 1 ---
Fibonacci(0) = 0

--- TEST CASE 2 ---
Fibonacci(1) = 1

--- TEST CASE 3 ---
Fibonacci(5) = 5

--- TEST CASE 4 ---
Fibonacci(10) = 55
"""
    
    result = execute_code("python", fibonacci_code, fib_input_data, fib_expected_output, early_termination=True)
    print("\nFibonacci test result:")
    print(json.dumps(result, indent=2))
    print("-" * 50)
    
    # Test 5: Test with JavaScript
    print("\n=== TEST: JavaScript Array Processing ===")
    js_array_code = """
// JavaScript code to process arrays
const readline = require('readline');
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

rl.on('line', (line) => {
    const numbers = line.split(' ').map(num => parseInt(num));
    const sum = numbers.reduce((a, b) => a + b, 0);
    const avg = sum / numbers.length;
    const max = Math.max(...numbers);
    const min = Math.min(...numbers);
    
    console.log(`Sum: ${sum}, Average: ${avg.toFixed(2)}, Max: ${max}, Min: ${min}`);
    rl.close();
});
"""

    js_input_data = """
--- TEST CASE 1 ---
5 10 15 20 25

--- TEST CASE 2 ---
100 200 300 400 500
"""

    js_expected_output = """
--- TEST CASE 1 ---
Sum: 75, Average: 15.00, Max: 25, Min: 5

--- TEST CASE 2 ---
Sum: 1500, Average: 300.00, Max: 500, Min: 100
"""
    
    result = execute_code("javascript", js_array_code, js_input_data, js_expected_output, early_termination=True)
    print("\nJavaScript array test result:")
    print(json.dumps(result, indent=2))
    print("-" * 50)