class ProblemPage {
    constructor() {
        this.editor = null;
        this.currentProblem = null;
        this.testCases = [];
        this.apiBaseUrl = 'http://localhost:8000';
        
        this.init();
    }

    async init() {
        this.setupEventListeners();
        await this.initializeEditor();
        await this.loadProblem();
    }

    setupEventListeners() {
        // Language selector
        const languageSelect = document.getElementById('languageSelect');
        if (languageSelect) {
            languageSelect.addEventListener('change', this.handleLanguageChange.bind(this));
        }

        // Editor buttons
        const resetBtn = document.getElementById('resetBtn');
        const runBtn = document.getElementById('runBtn');
        const submitBtn = document.getElementById('submitBtn');

        if (resetBtn) resetBtn.addEventListener('click', this.resetCode.bind(this));
        if (runBtn) runBtn.addEventListener('click', this.runCode.bind(this));
        if (submitBtn) submitBtn.addEventListener('click', this.submitCode.bind(this));

        // Test case management
        const addTestBtn = document.getElementById('addTestBtn');
        if (addTestBtn) addTestBtn.addEventListener('click', this.addTestCase.bind(this));

        // Output section
        const closeOutput = document.getElementById('closeOutput');
        if (closeOutput) closeOutput.addEventListener('click', this.closeOutput.bind(this));

        // Modal
        const closeResultModal = document.getElementById('closeResultModal');
        if (closeResultModal) closeResultModal.addEventListener('click', this.closeResultModal.bind(this));

        // Problem actions
        const favoriteBtn = document.getElementById('favoriteBtn');
        const shareBtn = document.getElementById('shareBtn');

        if (favoriteBtn) favoriteBtn.addEventListener('click', this.toggleFavorite.bind(this));
        if (shareBtn) shareBtn.addEventListener('click', this.shareProblem.bind(this));
    }

    async initializeEditor() {
        // Initialize CodeMirror editor
        const editorElement = document.getElementById('codeEditor');
        if (editorElement && typeof CodeMirror !== 'undefined') {
            this.editor = CodeMirror.fromTextArea(editorElement, {
                mode: 'javascript',
                theme: 'material-darker',
                lineNumbers: true,
                autoCloseBrackets: true,
                matchBrackets: true,
                indentUnit: 4,
                tabSize: 4,
                lineWrapping: true,
                foldGutter: true,
                gutters: ['CodeMirror-linenumbers', 'CodeMirror-foldgutter'],
                extraKeys: {
                    'Ctrl-Space': 'autocomplete',
                    'F11': function(cm) {
                        cm.setOption('fullScreen', !cm.getOption('fullScreen'));
                    },
                    'Esc': function(cm) {
                        if (cm.getOption('fullScreen')) cm.setOption('fullScreen', false);
                    }
                }
            });

            this.editor.setSize('100%', '100%');
        }
    }

    async loadProblem() {
        try {
            const urlParams = new URLSearchParams(window.location.search);
            const problemId = urlParams.get('id') || '1';
            
            // Try to load from API
            const response = await fetch(`${this.apiBaseUrl}/problems/${problemId}`);
            
            if (response.ok) {
                const data = await response.json();
                this.currentProblem = data.problem;
                this.testCases = data.sample_test_cases || [];
            } else {
                // Fallback to mock data
                this.currentProblem = this.getMockProblem(problemId);
                this.testCases = this.getMockTestCases();
            }
            
            this.renderProblem();
            this.renderTestCases();
            this.loadCodeTemplate();
            
        } catch (error) {
            console.error('Error loading problem:', error);
            this.currentProblem = this.getMockProblem('1');
            this.testCases = this.getMockTestCases();
            this.renderProblem();
            this.renderTestCases();
            this.loadCodeTemplate();
        }
    }

    getMockProblem(id) {
        const problems = {
            '1': {
                id: 1,
                title: 'Two Sum',
                difficulty: 'Easy',
                description: 'Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.',
                examples: [
                    {
                        input: 'nums = [2,7,11,15], target = 9',
                        output: '[0,1]',
                        explanation: 'Because nums[0] + nums[1] == 9, we return [0, 1].'
                    },
                    {
                        input: 'nums = [3,2,4], target = 6',
                        output: '[1,2]',
                        explanation: 'Because nums[1] + nums[2] == 6, we return [1, 2].'
                    }
                ],
                constraints: [
                    '2 ≤ nums.length ≤ 10⁴',
                    '-10⁹ ≤ nums[i] ≤ 10⁹',
                    '-10⁹ ≤ target ≤ 10⁹',
                    'Only one valid answer exists.'
                ],
                tags: ['Array', 'Hash Table'],
                likes: 1234,
                dislikes: 56
            }
        };
        
        return problems[id] || problems['1'];
    }

    getMockTestCases() {
        return [
            {
                input: '[2,7,11,15]\n9',
                expected_output: '[0,1]'
            },
            {
                input: '[3,2,4]\n6',
                expected_output: '[1,2]'
            },
            {
                input: '[3,3]\n6',
                expected_output: '[0,1]'
            }
        ];
    }

    renderProblem() {
        if (!this.currentProblem) return;

        // Update title and meta
        const problemTitle = document.getElementById('problemTitle');
        const difficultyBadge = document.getElementById('difficultyBadge');
        const likes = document.getElementById('likes');
        const dislikes = document.getElementById('dislikes');

        if (problemTitle) problemTitle.textContent = this.currentProblem.title;
        if (difficultyBadge) {
            difficultyBadge.textContent = this.currentProblem.difficulty;
            difficultyBadge.className = `difficulty-badge difficulty-${this.currentProblem.difficulty.toLowerCase()}`;
        }
        if (likes) likes.textContent = this.currentProblem.likes || 0;
        if (dislikes) dislikes.textContent = this.currentProblem.dislikes || 0;

        // Update description
        const problemDescription = document.getElementById('problemDescription');
        if (problemDescription) {
            problemDescription.innerHTML = `
                <p>${this.currentProblem.description}</p>
            `;
        }

        // Update examples
        const problemExamples = document.getElementById('problemExamples');
        if (problemExamples && this.currentProblem.examples) {
            problemExamples.innerHTML = this.currentProblem.examples.map((example, index) => `
                <div class="example">
                    <h4>Example ${index + 1}:</h4>
                    <pre><strong>Input:</strong> ${example.input}</pre>
                    <pre><strong>Output:</strong> ${example.output}</pre>
                    ${example.explanation ? `<pre><strong>Explanation:</strong> ${example.explanation}</pre>` : ''}
                </div>
            `).join('');
        }

        // Update constraints
        const problemConstraints = document.getElementById('problemConstraints');
        if (problemConstraints && this.currentProblem.constraints) {
            problemConstraints.innerHTML = `
                <h4>Constraints:</h4>
                <ul>
                    ${this.currentProblem.constraints.map(constraint => `<li>${constraint}</li>`).join('')}
                </ul>
            `;
        }

        // Update tags
        const problemTags = document.getElementById('problemTags');
        if (problemTags && this.currentProblem.tags) {
            problemTags.innerHTML = this.currentProblem.tags.map(tag => 
                `<span class="tag">${tag}</span>`
            ).join('');
        }
    }

    renderTestCases() {
        const testCasesContainer = document.getElementById('testCases');
        if (!testCasesContainer) return;

        testCasesContainer.innerHTML = this.testCases.map((testCase, index) => `
            <div class="test-case">
                <h4>Test Case ${index + 1}</h4>
                <div class="test-input">
                    <h5>Input:</h5>
                    <pre>${testCase.input}</pre>
                </div>
                <div class="test-output">
                    <h5>Expected Output:</h5>
                    <pre>${testCase.expected_output}</pre>
                </div>
            </div>
        `).join('');
    }

    loadCodeTemplate() {
        const language = document.getElementById('languageSelect')?.value || 'javascript';
        const templates = {
            javascript: `/**
 * @param {number[]} nums
 * @param {number} target
 * @return {number[]}
 */
var twoSum = function(nums, target) {
    // Your code here
};`,
            python: `def twoSum(nums, target):
    """
    :type nums: List[int]
    :type target: int
    :rtype: List[int]
    """
    # Your code here
    pass`,
            java: `class Solution {
    public int[] twoSum(int[] nums, int target) {
        // Your code here
        return new int[0];
    }
}`,
            cpp: `class Solution {
public:
    vector<int> twoSum(vector<int>& nums, int target) {
        // Your code here
        return {};
    }
};`,
            c: `/**
 * Note: The returned array must be malloced, assume caller calls free().
 */
int* twoSum(int* nums, int numsSize, int target, int* returnSize){
    // Your code here
    *returnSize = 0;
    return NULL;
}`
        };

        if (this.editor) {
            this.editor.setValue(templates[language] || templates.javascript);
            this.editor.setOption('mode', this.getEditorMode(language));
        }
    }

    getEditorMode(language) {
        const modes = {
            javascript: 'javascript',
            python: 'python',
            java: 'text/x-java',
            cpp: 'text/x-c++src',
            c: 'text/x-csrc'
        };
        return modes[language] || 'javascript';
    }

    handleLanguageChange() {
        this.loadCodeTemplate();
    }

    resetCode() {
        this.loadCodeTemplate();
        this.closeOutput();
    }

    async runCode() {
        if (!this.editor) return;

        const code = this.editor.getValue();
        const language = document.getElementById('languageSelect')?.value || 'javascript';
        
        this.showOutput();
        const outputContent = document.getElementById('outputContent');
        if (outputContent) {
            outputContent.innerHTML = '<div class="loading">Running tests...</div>';
        }

        try {
            const response = await fetch(`${this.apiBaseUrl}/run/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    code: code,
                    language: language,
                    input: this.testCases[0]?.input || ''
                })
            });

            const result = await response.json();
            this.displayRunResult(result);

        } catch (error) {
            console.error('Error running code:', error);
            this.displayMockRunResult();
        }
    }

    async submitCode() {
        if (!this.editor || !this.currentProblem) return;

        const code = this.editor.getValue();
        const language = document.getElementById('languageSelect')?.value || 'javascript';
        const token = localStorage.getItem('access_token');

        if (!token) {
            this.showResultModal('Error', 'Please log in to submit your solution.');
            return;
        }

        try {
            const response = await fetch(`${this.apiBaseUrl}/submit/${this.currentProblem.id}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    code: code,
                    language: language
                })
            });

            const result = await response.json();
            this.displaySubmissionResult(result);

        } catch (error) {
            console.error('Error submitting code:', error);
            this.displayMockSubmissionResult();
        }
    }

    displayRunResult(result) {
        const outputContent = document.getElementById('outputContent');
        if (!outputContent) return;

        if (result.error) {
            outputContent.innerHTML = `
                <div class="error-result">
                    <h4>Runtime Error</h4>
                    <pre>${result.error}</pre>
                </div>
            `;
        } else {
            outputContent.innerHTML = `
                <div class="success-result">
                    <h4>Test Results</h4>
                    <pre>${result.result || 'Code executed successfully'}</pre>
                </div>
            `;
        }
    }

    displayMockRunResult() {
        const outputContent = document.getElementById('outputContent');
        if (!outputContent) return;

        const success = Math.random() > 0.3;
        if (success) {
            outputContent.innerHTML = `
                <div class="success-result">
                    <h4>✓ Test Passed</h4>
                    <div class="test-result">
                        <p><strong>Input:</strong> [2,7,11,15], 9</p>
                        <p><strong>Output:</strong> [0,1]</p>
                        <p><strong>Expected:</strong> [0,1]</p>
                        <p><strong>Runtime:</strong> 68 ms</p>
                    </div>
                </div>
            `;
        } else {
            outputContent.innerHTML = `
                <div class="error-result">
                    <h4>✗ Test Failed</h4>
                    <div class="test-result">
                        <p><strong>Input:</strong> [2,7,11,15], 9</p>
                        <p><strong>Output:</strong> [1,0]</p>
                        <p><strong>Expected:</strong> [0,1]</p>
                        <p><strong>Error:</strong> Wrong Answer</p>
                    </div>
                </div>
            `;
        }
    }

    displaySubmissionResult(result) {
        const success = result.result?.all_passed || false;
        const title = success ? 'Accepted' : 'Wrong Answer';
        const content = success ? 
            'Congratulations! Your solution has been accepted.' :
            'Your solution failed some test cases. Please try again.';
        
        this.showResultModal(title, content);
    }

    displayMockSubmissionResult() {
        const success = Math.random() > 0.4;
        const title = success ? 'Accepted' : 'Wrong Answer';
        const content = success ? 
            `<div class="submission-success">
                <h3>✓ Accepted</h3>
                <p>Runtime: 68 ms, faster than 85.2% of JavaScript submissions.</p>
                <p>Memory Usage: 40.1 MB, less than 92.1% of JavaScript submissions.</p>
            </div>` :
            `<div class="submission-error">
                <h3>✗ Wrong Answer</h3>
                <p>Test case 3 of 15 failed</p>
                <p><strong>Input:</strong> [3,3], 6</p>
                <p><strong>Output:</strong> [1,1]</p>
                <p><strong>Expected:</strong> [0,1]</p>
            </div>`;
        
        this.showResultModal(title, content);
    }

    showOutput() {
        const outputSection = document.getElementById('outputSection');
        if (outputSection) {
            outputSection.style.display = 'block';
        }
    }

    closeOutput() {
        const outputSection = document.getElementById('outputSection');
        if (outputSection) {
            outputSection.style.display = 'none';
        }
    }

    showResultModal(title, content) {
        const resultModal = document.getElementById('resultModal');
        const resultTitle = document.getElementById('resultTitle');
        const resultContent = document.getElementById('resultContent');

        if (resultTitle) resultTitle.textContent = title;
        if (resultContent) resultContent.innerHTML = content;
        if (resultModal) resultModal.classList.add('active');
    }

    closeResultModal() {
        const resultModal = document.getElementById('resultModal');
        if (resultModal) {
            resultModal.classList.remove('active');
        }
    }

    addTestCase() {
        const testCasesContainer = document.getElementById('testCases');
        if (!testCasesContainer) return;

        const newTestCase = document.createElement('div');
        newTestCase.className = 'test-case';
        newTestCase.innerHTML = `
            <h4>Custom Test Case</h4>
            <div class="test-input">
                <h5>Input:</h5>
                <textarea placeholder="Enter your input..."></textarea>
            </div>
            <div class="test-output">
                <h5>Expected Output:</h5>
                <textarea placeholder="Enter expected output..."></textarea>
            </div>
            <button class="btn-secondary" onclick="this.parentElement.remove()">Remove</button>
        `;

        testCasesContainer.appendChild(newTestCase);
    }

    toggleFavorite() {
        const favoriteBtn = document.getElementById('favoriteBtn');
        if (favoriteBtn) {
            const icon = favoriteBtn.querySelector('i');
            if (icon.classList.contains('far')) {
                icon.classList.remove('far');
                icon.classList.add('fas');
                icon.style.color = '#ef4444';
            } else {
                icon.classList.remove('fas');
                icon.classList.add('far');
                icon.style.color = '';
            }
        }
    }

    shareProblem() {
        if (navigator.share) {
            navigator.share({
                title: this.currentProblem?.title || 'Problem',
                url: window.location.href
            });
        } else {
            // Fallback: copy to clipboard
            navigator.clipboard.writeText(window.location.href).then(() => {
                alert('Link copied to clipboard!');
            });
        }
    }
}

// Initialize the problem page
document.addEventListener('DOMContentLoaded', () => {
    new ProblemPage();
});
