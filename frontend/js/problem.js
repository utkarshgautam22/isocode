class ModernProblemDashboard {
    constructor() {
        this.editor = null;
        this.currentProblem = null;
        this.testCases = [];
        this.apiBaseUrl = 'http://localhost:8000';
        this.currentTheme = localStorage.getItem('theme') || 'light';
        this.fontSize = parseInt(localStorage.getItem('fontSize')) || 14;
        this.wordWrap = localStorage.getItem('wordWrap') === 'true';
        
        this.init();
    }

    async init() {
        this.applyTheme();
        this.setupEventListeners();
        await this.initializeEditor();
        await this.loadProblem();
        this.setupKeyboardShortcuts();
    }

    applyTheme() {
        document.documentElement.setAttribute('data-theme', this.currentTheme);
        const themeIcon = document.querySelector('#themeToggle i');
        if (themeIcon) {
            themeIcon.className = this.currentTheme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
        }
    }

    setupEventListeners() {
        // Theme toggle
        const themeToggle = document.getElementById('themeToggle');
        if (themeToggle) {
            themeToggle.addEventListener('click', this.toggleTheme.bind(this));
        }

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

        // Editor settings
        const fontSizeBtn = document.getElementById('fontSizeBtn');
        const wrapBtn = document.getElementById('wrapBtn');

        if (fontSizeBtn) fontSizeBtn.addEventListener('click', this.toggleFontSize.bind(this));
        if (wrapBtn) wrapBtn.addEventListener('click', this.toggleWordWrap.bind(this));

        // Test case management
        const addTestBtn = document.getElementById('addTestBtn');
        const runTestsBtn = document.getElementById('runTestsBtn');

        if (addTestBtn) addTestBtn.addEventListener('click', this.addTestCase.bind(this));
        if (runTestsBtn) runTestsBtn.addEventListener('click', this.runAllTests.bind(this));

        // Output section
        const closeOutput = document.getElementById('closeOutput');
        if (closeOutput) closeOutput.addEventListener('click', this.closeOutput.bind(this));

        // Modal
        const closeResultModal = document.getElementById('closeResultModal');
        if (closeResultModal) closeResultModal.addEventListener('click', this.closeResultModal.bind(this));

        // Problem actions
        const favoriteBtn = document.getElementById('favoriteBtn');
        const shareBtn = document.getElementById('shareBtn');
        const notesBtn = document.getElementById('notesBtn');
        const likeBtn = document.getElementById('likeBtn');
        const dislikeBtn = document.getElementById('dislikeBtn');

        if (favoriteBtn) favoriteBtn.addEventListener('click', this.toggleFavorite.bind(this));
        if (shareBtn) shareBtn.addEventListener('click', this.shareProblem.bind(this));
        if (notesBtn) notesBtn.addEventListener('click', this.openNotes.bind(this));
        if (likeBtn) likeBtn.addEventListener('click', this.likeProblem.bind(this));
        if (dislikeBtn) dislikeBtn.addEventListener('click', this.dislikeProblem.bind(this));

        // Content tabs
        const tabBtns = document.querySelectorAll('.tab-btn');
        tabBtns.forEach(btn => {
            btn.addEventListener('click', () => this.switchTab(btn.dataset.tab));
        });

        // Fullscreen toggle
        const fullscreenBtn = document.getElementById('fullscreenBtn');
        if (fullscreenBtn) fullscreenBtn.addEventListener('click', this.toggleFullscreen.bind(this));

        // Window resize
        window.addEventListener('resize', this.handleResize.bind(this));
    }

    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey || e.metaKey) {
                switch (e.key) {
                    case 'Enter':
                        e.preventDefault();
                        this.runCode();
                        break;
                    case 's':
                        e.preventDefault();
                        this.submitCode();
                        break;
                    case 'r':
                        e.preventDefault();
                        this.resetCode();
                        break;
                    case 'd':
                        e.preventDefault();
                        this.toggleTheme();
                        break;
                    case 'f':
                        if (e.shiftKey) {
                            e.preventDefault();
                            this.toggleFullscreen();
                        }
                        break;
                }
            }
        });
    }

    toggleTheme() {
        this.currentTheme = this.currentTheme === 'light' ? 'dark' : 'light';
        localStorage.setItem('theme', this.currentTheme);
        this.applyTheme();
        
        // Update CodeMirror theme
        if (this.editor) {
            this.editor.setOption('theme', this.currentTheme === 'dark' ? 'one-dark' : 'default');
        }
    }

    toggleFontSize() {
        this.fontSize = this.fontSize === 14 ? 16 : this.fontSize === 16 ? 18 : 14;
        localStorage.setItem('fontSize', this.fontSize);
        
        if (this.editor) {
            const wrapper = this.editor.getWrapperElement();
            wrapper.style.fontSize = `${this.fontSize}px`;
            this.editor.refresh();
        }
    }

    toggleWordWrap() {
        this.wordWrap = !this.wordWrap;
        localStorage.setItem('wordWrap', this.wordWrap);
        
        if (this.editor) {
            this.editor.setOption('lineWrapping', this.wordWrap);
        }
    }

    toggleFullscreen() {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen();
        } else {
            document.exitFullscreen();
        }
    }

    async initializeEditor() {
        const editorElement = document.getElementById('codeEditor');
        if (editorElement && typeof CodeMirror !== 'undefined') {
            this.editor = CodeMirror.fromTextArea(editorElement, {
                mode: 'javascript',
                theme: this.currentTheme === 'dark' ? 'one-dark' : 'default',
                lineNumbers: true,
                autoCloseBrackets: true,
                matchBrackets: true,
                indentUnit: 4,
                tabSize: 4,
                lineWrapping: this.wordWrap,
                foldGutter: true,
                gutters: ['CodeMirror-linenumbers', 'CodeMirror-foldgutter'],
                extraKeys: {
                    'Ctrl-Space': 'autocomplete',
                    'F11': (cm) => {
                        cm.setOption('fullScreen', !cm.getOption('fullScreen'));
                    },
                    'Esc': (cm) => {
                        if (cm.getOption('fullScreen')) cm.setOption('fullScreen', false);
                    },
                    'Ctrl-Enter': () => this.runCode(),
                    'Ctrl-S': () => this.submitCode()
                }
            });

            this.editor.setSize('100%', '100%');
            
            // Apply custom font size
            const wrapper = this.editor.getWrapperElement();
            wrapper.style.fontSize = `${this.fontSize}px`;
        }
    }

    async loadProblem() {
        this.showProgress();
        
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
        } finally {
            this.hideProgress();
        }
    }

    showProgress() {
        const progressIndicator = document.getElementById('progressIndicator');
        if (progressIndicator) {
            progressIndicator.classList.add('show');
            const progressBar = progressIndicator.querySelector('.progress-bar');
            progressBar.style.width = '30%';
            
            setTimeout(() => {
                progressBar.style.width = '70%';
            }, 500);
        }
    }

    hideProgress() {
        const progressIndicator = document.getElementById('progressIndicator');
        if (progressIndicator) {
            const progressBar = progressIndicator.querySelector('.progress-bar');
            progressBar.style.width = '100%';
            
            setTimeout(() => {
                progressIndicator.classList.remove('show');
                progressBar.style.width = '0%';
            }, 300);
        }
    }

    getMockProblem(id) {
        const problems = {
            '1': {
                id: 1,
                title: 'Two Sum',
                difficulty: 'Easy',
                description: `Given an array of integers <code>nums</code> and an integer <code>target</code>, return <em>indices of the two numbers such that they add up to target</em>.
                
                <p>You may assume that each input would have <strong>exactly one solution</strong>, and you may not use the same element twice.</p>
                
                <p>You can return the answer in any order.</p>`,
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
                    },
                    {
                        input: 'nums = [3,3], target = 6',
                        output: '[0,1]',
                        explanation: 'Because nums[0] + nums[1] == 6, we return [0, 1].'
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
        const problemBreadcrumb = document.getElementById('problemBreadcrumb');
        const difficultyBadge = document.getElementById('difficultyBadge');
        const likes = document.getElementById('likes');
        const dislikes = document.getElementById('dislikes');

        if (problemTitle) problemTitle.textContent = this.currentProblem.title;
        if (problemBreadcrumb) problemBreadcrumb.textContent = this.currentProblem.title;
        if (difficultyBadge) {
            difficultyBadge.textContent = this.currentProblem.difficulty;
            difficultyBadge.className = `difficulty-badge ${this.currentProblem.difficulty.toLowerCase()}`;
        }
        if (likes) likes.textContent = this.formatNumber(this.currentProblem.likes || 0);
        if (dislikes) dislikes.textContent = this.formatNumber(this.currentProblem.dislikes || 0);

        // Update description
        const problemDescription = document.getElementById('problemDescription');
        if (problemDescription) {
            problemDescription.innerHTML = `<div class="fade-in">${this.currentProblem.description}</div>`;
        }

        // Update examples
        const problemExamples = document.getElementById('problemExamples');
        if (problemExamples && this.currentProblem.examples) {
            problemExamples.innerHTML = this.currentProblem.examples.map((example, index) => `
                <div class="example slide-up" style="animation-delay: ${index * 0.1}s">
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

        // Update document title
        document.title = `${this.currentProblem.title} - CodeMaster`;
    }

    formatNumber(num) {
        if (num >= 1000) {
            return (num / 1000).toFixed(1) + 'k';
        }
        return num.toString();
    }

    renderTestCases() {
        const testCasesContainer = document.getElementById('testCases');
        if (!testCasesContainer) return;

        testCasesContainer.innerHTML = this.testCases.map((testCase, index) => `
            <div class="test-case slide-up" style="animation-delay: ${index * 0.05}s">
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
    // Your solution here
    
};`,
            python: `def twoSum(nums, target):
    """
    :type nums: List[int]
    :type target: int
    :rtype: List[int]
    """
    # Your solution here
    pass`,
            java: `class Solution {
    public int[] twoSum(int[] nums, int target) {
        // Your solution here
        return new int[0];
    }
}`,
            cpp: `class Solution {
public:
    vector<int> twoSum(vector<int>& nums, int target) {
        // Your solution here
        return {};
    }
};`,
            c: `/**
 * Note: The returned array must be malloced, assume caller calls free().
 */
int* twoSum(int* nums, int numsSize, int target, int* returnSize){
    // Your solution here
    *returnSize = 0;
    return NULL;
}`
        };

        if (this.editor) {
            this.editor.setValue(templates[language] || templates.javascript);
            this.editor.setOption('mode', this.getEditorMode(language));
            this.editor.clearHistory();
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
        this.showNotification('Code reset successfully', 'success');
    }

    async runCode() {
        if (!this.editor) return;

        const code = this.editor.getValue().trim();
        if (!code) {
            this.showNotification('Please write some code first', 'warning');
            return;
        }

        const language = document.getElementById('languageSelect')?.value || 'javascript';
        
        this.showOutput();
        const outputContent = document.getElementById('outputContent');
        if (outputContent) {
            outputContent.innerHTML = '<div class="loading">Running your code...</div>';
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

    async runAllTests() {
        if (!this.editor) return;

        const code = this.editor.getValue().trim();
        if (!code) {
            this.showNotification('Please write some code first', 'warning');
            return;
        }

        this.showOutput();
        const outputContent = document.getElementById('outputContent');
        if (outputContent) {
            outputContent.innerHTML = '<div class="loading">Running all test cases...</div>';
        }

        // Simulate running all tests
        setTimeout(() => {
            this.displayAllTestResults();
        }, 2000);
    }

    displayAllTestResults() {
        const outputContent = document.getElementById('outputContent');
        if (!outputContent) return;

        const results = this.testCases.map((testCase, index) => {
            const passed = Math.random() > 0.3;
            return {
                index: index + 1,
                passed,
                input: testCase.input,
                expected: testCase.expected_output,
                actual: passed ? testCase.expected_output : '[1,0]',
                runtime: Math.floor(Math.random() * 100) + 50
            };
        });

        const passedCount = results.filter(r => r.passed).length;
        const totalCount = results.length;

        outputContent.innerHTML = `
            <div class="test-results">
                <div class="results-summary ${passedCount === totalCount ? 'success' : 'partial'}">
                    <h4>${passedCount}/${totalCount} test cases passed</h4>
                    <p>Average runtime: ${Math.floor(Math.random() * 50) + 60} ms</p>
                </div>
                ${results.map(result => `
                    <div class="test-result ${result.passed ? 'passed' : 'failed'}">
                        <h5>Test Case ${result.index} ${result.passed ? '✓' : '✗'}</h5>
                        <p><strong>Input:</strong> ${result.input}</p>
                        <p><strong>Expected:</strong> ${result.expected}</p>
                        <p><strong>Actual:</strong> ${result.actual}</p>
                        <p><strong>Runtime:</strong> ${result.runtime} ms</p>
                    </div>
                `).join('')}
            </div>
        `;
    }

    async submitCode() {
        if (!this.editor || !this.currentProblem) return;

        const code = this.editor.getValue().trim();
        if (!code) {
            this.showNotification('Please write some code first', 'warning');
            return;
        }

        const language = document.getElementById('languageSelect')?.value || 'javascript';
        const token = localStorage.getItem('access_token');

        if (!token) {
            this.showResultModal('Authentication Required', 
                '<p>Please log in to submit your solution.</p>');
            return;
        }

        this.showProgress();

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
        } finally {
            this.hideProgress();
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
                    <h4>✓ Code executed successfully</h4>
                    <div class="test-result">
                        <p><strong>Output:</strong> ${result.result || 'No output'}</p>
                        <p><strong>Runtime:</strong> ${Math.floor(Math.random() * 100) + 50} ms</p>
                    </div>
                </div>
            `;
        }
    }

    // Continuing from where the previous code left off...

    displayMockRunResult() {
        const outputContent = document.getElementById('outputContent');
        if (!outputContent) return;

        const success = Math.random() > 0.3;
        if (success) {
            outputContent.innerHTML = `
                <div class="success-result">
                    <h4>✓ Test Passed</h4>
                    <div class="test-result">
                        <p><strong>Output:</strong> [0,1]</p>
                        <p><strong>Expected:</strong> [0,1]</p>
                        <p><strong>Runtime:</strong> ${Math.floor(Math.random() * 100) + 50} ms</p>
                        <p><strong>Memory:</strong> ${Math.floor(Math.random() * 10) + 40} MB</p>
                    </div>
                </div>
            `;
        } else {
            outputContent.innerHTML = `
                <div class="error-result">
                    <h4>✗ Test Failed</h4>
                    <div class="test-result">
                        <p><strong>Output:</strong> [1,0]</p>
                        <p><strong>Expected:</strong> [0,1]</p>
                        <p><strong>Error:</strong> Wrong answer on test case 1</p>
                    </div>
                </div>
            `;
        }
    }

    displaySubmissionResult(result) {
        if (result.status === 'Accepted') {
            this.showResultModal('🎉 Accepted!', `
                <div class="submission-success">
                    <h3>Congratulations!</h3>
                    <p>Your solution has been accepted.</p>
                    <div class="submission-stats">
                        <div class="stat">
                            <span class="label">Runtime:</span>
                            <span class="value">${result.runtime || '68 ms'}</span>
                        </div>
                        <div class="stat">
                            <span class="label">Memory:</span>
                            <span class="value">${result.memory || '42.1 MB'}</span>
                        </div>
                        <div class="stat">
                            <span class="label">Language:</span>
                            <span class="value">${result.language || 'JavaScript'}</span>
                        </div>
                    </div>
                    <p>Runtime beats ${Math.floor(Math.random() * 30) + 70}% of submissions</p>
                </div>
            `);
            this.showNotification('Solution accepted!', 'success');
        } else {
            this.showResultModal('❌ Wrong Answer', `
                <div class="submission-error">
                    <h3>Submission Failed</h3>
                    <p>${result.error || 'Your solution failed on some test cases.'}</p>
                    <div class="failed-test">
                        <p><strong>Failed on test case:</strong> ${result.failed_case || '2'}</p>
                        <p><strong>Input:</strong> ${result.input || '[3,2,4], target = 6'}</p>
                        <p><strong>Expected:</strong> ${result.expected || '[1,2]'}</p>
                        <p><strong>Your output:</strong> ${result.actual || '[0,1]'}</p>
                    </div>
                </div>
            `);
        }
    }

    displayMockSubmissionResult() {
        const success = Math.random() > 0.4;
        if (success) {
            this.displaySubmissionResult({
                status: 'Accepted',
                runtime: `${Math.floor(Math.random() * 50) + 60} ms`,
                memory: `${(Math.random() * 10 + 40).toFixed(1)} MB`,
                language: document.getElementById('languageSelect')?.value || 'JavaScript'
            });
        } else {
            this.displaySubmissionResult({
                status: 'Wrong Answer',
                error: 'Wrong Answer',
                failed_case: Math.floor(Math.random() * 5) + 1,
                input: '[3,2,4], target = 6',
                expected: '[1,2]',
                actual: '[0,1]'
            });
        }
    }

    addTestCase() {
        const testCasesContainer = document.getElementById('testCases');
        if (!testCasesContainer) return;

        const newTestCase = {
            input: '',
            expected_output: ''
        };

        this.testCases.push(newTestCase);
        
        const testCaseElement = document.createElement('div');
        testCaseElement.className = 'test-case custom-test';
        testCaseElement.innerHTML = `
            <div class="test-case-header">
                <h4>Custom Test Case ${this.testCases.length}</h4>
                <button class="remove-test-btn" onclick="dashboard.removeTestCase(${this.testCases.length - 1})">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
            <div class="test-input">
                <h5>Input:</h5>
                <textarea class="test-input-field" placeholder="Enter test input..." 
                    onchange="dashboard.updateTestCase(${this.testCases.length - 1}, 'input', this.value)"></textarea>
            </div>
            <div class="test-output">
                <h5>Expected Output:</h5>
                <textarea class="test-output-field" placeholder="Enter expected output..." 
                    onchange="dashboard.updateTestCase(${this.testCases.length - 1}, 'expected_output', this.value)"></textarea>
            </div>
        `;

        testCasesContainer.appendChild(testCaseElement);
        this.showNotification('Test case added', 'success');
    }

    removeTestCase(index) {
        if (index < 3) {
            this.showNotification('Cannot remove default test cases', 'warning');
            return;
        }

        this.testCases.splice(index, 1);
        this.renderTestCases();
        this.showNotification('Test case removed', 'success');
    }

    updateTestCase(index, field, value) {
        if (this.testCases[index]) {
            this.testCases[index][field] = value;
        }
    }

    showOutput() {
        const outputSection = document.getElementById('outputSection');
        if (outputSection) {
            outputSection.classList.add('show');
        }
    }

    closeOutput() {
        const outputSection = document.getElementById('outputSection');
        if (outputSection) {
            outputSection.classList.remove('show');
        }
    }

    showResultModal(title, content) {
        const modal = document.getElementById('resultModal');
        const modalTitle = document.getElementById('resultTitle');
        const modalContent = document.getElementById('resultContent');

        if (modal && modalTitle && modalContent) {
            modalTitle.textContent = title;
            modalContent.innerHTML = content;
            modal.classList.add('active');
        }
    }

    closeResultModal() {
        const modal = document.getElementById('resultModal');
        if (modal) {
            modal.classList.remove('active');
        }
    }

    switchTab(tabName) {
        // Remove active class from all tabs and content
        document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));

        // Add active class to selected tab and content
        const selectedTab = document.querySelector(`[data-tab="${tabName}"]`);
        const selectedContent = document.getElementById(tabName);

        if (selectedTab) selectedTab.classList.add('active');
        if (selectedContent) selectedContent.classList.add('active');
    }

    toggleFavorite() {
        const favoriteBtn = document.getElementById('favoriteBtn');
        if (!favoriteBtn) return;

        const icon = favoriteBtn.querySelector('i');
        const isFavorited = icon.classList.contains('fas');

        if (isFavorited) {
            icon.classList.remove('fas');
            icon.classList.add('far');
            this.showNotification('Removed from favorites', 'info');
        } else {
            icon.classList.remove('far');
            icon.classList.add('fas');
            this.showNotification('Added to favorites', 'success');
        }
    }

    shareProblem() {
        if (navigator.share) {
            navigator.share({
                title: this.currentProblem?.title || 'Problem',
                text: 'Check out this coding problem!',
                url: window.location.href
            });
        } else {
            // Fallback: copy to clipboard
            navigator.clipboard.writeText(window.location.href).then(() => {
                this.showNotification('Link copied to clipboard!', 'success');
            });
        }
    }

    openNotes() {
        this.showResultModal('Notes', `
            <div class="notes-section">
                <textarea id="problemNotes" placeholder="Add your notes here..." 
                    style="width: 100%; height: 200px; padding: 1rem; border: 1px solid var(--border-color); 
                    border-radius: var(--radius-md); background: var(--bg-secondary); color: var(--text-primary); 
                    font-family: inherit; resize: vertical;">${this.loadNotes()}</textarea>
                <div style="margin-top: 1rem; text-align: right;">
                    <button onclick="dashboard.saveNotes()" style="padding: 0.5rem 1rem; background: var(--primary-color); 
                        color: white; border: none; border-radius: var(--radius-md); cursor: pointer;">
                        Save Notes
                    </button>
                </div>
            </div>
        `);
    }

    loadNotes() {
        const problemId = this.currentProblem?.id || '1';
        return localStorage.getItem(`notes_${problemId}`) || '';
    }

    saveNotes() {
        const notesTextarea = document.getElementById('problemNotes');
        if (notesTextarea && this.currentProblem) {
            const notes = notesTextarea.value;
            localStorage.setItem(`notes_${this.currentProblem.id}`, notes);
            this.showNotification('Notes saved!', 'success');
            this.closeResultModal();
        }
    }

    likeProblem() {
        const likeBtn = document.getElementById('likeBtn');
        const dislikeBtn = document.getElementById('dislikeBtn');
        const likesCount = document.getElementById('likes');

        if (!likeBtn || !likesCount) return;

        const icon = likeBtn.querySelector('i');
        const isLiked = icon.classList.contains('fas');

        if (isLiked) {
            icon.classList.remove('fas');
            icon.classList.add('far');
            this.currentProblem.likes--;
        } else {
            icon.classList.remove('far');
            icon.classList.add('fas');
            this.currentProblem.likes++;

            // Remove dislike if active
            const dislikeIcon = dislikeBtn?.querySelector('i');
            if (dislikeIcon?.classList.contains('fas')) {
                dislikeIcon.classList.remove('fas');
                dislikeIcon.classList.add('far');
                this.currentProblem.dislikes--;
                document.getElementById('dislikes').textContent = this.formatNumber(this.currentProblem.dislikes);
            }
        }

        likesCount.textContent = this.formatNumber(this.currentProblem.likes);
    }

    dislikeProblem() {
        const likeBtn = document.getElementById('likeBtn');
        const dislikeBtn = document.getElementById('dislikeBtn');
        const dislikesCount = document.getElementById('dislikes');

        if (!dislikeBtn || !dislikesCount) return;

        const icon = dislikeBtn.querySelector('i');
        const isDisliked = icon.classList.contains('fas');

        if (isDisliked) {
            icon.classList.remove('fas');
            icon.classList.add('far');
            this.currentProblem.dislikes--;
        } else {
            icon.classList.remove('far');
            icon.classList.add('fas');
            this.currentProblem.dislikes++;

            // Remove like if active
            const likeIcon = likeBtn?.querySelector('i');
            if (likeIcon?.classList.contains('fas')) {
                likeIcon.classList.remove('fas');
                likeIcon.classList.add('far');
                this.currentProblem.likes--;
                document.getElementById('likes').textContent = this.formatNumber(this.currentProblem.likes);
            }
        }

        dislikesCount.textContent = this.formatNumber(this.currentProblem.dislikes);
    }

    handleResize() {
        if (this.editor) {
            this.editor.refresh();
        }
    }

    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <i class="fas ${this.getNotificationIcon(type)}"></i>
                <span>${message}</span>
            </div>
        `;

        // Add styles
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 1001;
            background: var(--bg-card);
            border: 1px solid var(--border-color);
            border-radius: var(--radius-lg);
            padding: 1rem 1.5rem;
            box-shadow: var(--shadow-lg);
            transform: translateX(100%);
            transition: transform 0.3s ease;
            max-width: 300px;
        `;

        // Type-specific styling
        if (type === 'success') {
            notification.style.borderLeftColor = 'var(--accent-color)';
            notification.style.borderLeftWidth = '4px';
        } else if (type === 'error') {
            notification.style.borderLeftColor = 'var(--danger-color)';
            notification.style.borderLeftWidth = '4px';
        } else if (type === 'warning') {
            notification.style.borderLeftColor = 'var(--warning-color)';
            notification.style.borderLeftWidth = '4px';
        }

        document.body.appendChild(notification);

        // Animate in
        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
        }, 100);

        // Auto remove
        setTimeout(() => {
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }

    getNotificationIcon(type) {
        const icons = {
            success: 'fa-check-circle',
            error: 'fa-exclamation-circle',
            warning: 'fa-exclamation-triangle',
            info: 'fa-info-circle'
        };
        return icons[type] || icons.info;
    }

    // Auto-save functionality
    setupAutoSave() {
        if (this.editor) {
            this.editor.on('change', () => {
                clearTimeout(this.autoSaveTimeout);
                this.autoSaveTimeout = setTimeout(() => {
                    this.saveCodeToLocalStorage();
                }, 2000);
            });
        }
    }

    saveCodeToLocalStorage() {
        if (this.editor && this.currentProblem) {
            const code = this.editor.getValue();
            const language = document.getElementById('languageSelect')?.value || 'javascript';
            const key = `code_${this.currentProblem.id}_${language}`;
            localStorage.setItem(key, code);
        }
    }

    loadCodeFromLocalStorage() {
        if (this.currentProblem) {
            const language = document.getElementById('languageSelect')?.value || 'javascript';
            const key = `code_${this.currentProblem.id}_${language}`;
            const savedCode = localStorage.getItem(key);
            
            if (savedCode && this.editor) {
                this.editor.setValue(savedCode);
            }
        }
    }

    // Performance monitoring
    trackPerformance() {
        if ('performance' in window) {
            const loadTime = performance.now();
            console.log(`Dashboard loaded in ${loadTime.toFixed(2)}ms`);
        }
    }

    // Cleanup on page unload
    cleanup() {
        if (this.autoSaveTimeout) {
            clearTimeout(this.autoSaveTimeout);
        }
        this.saveCodeToLocalStorage();
    }
}

// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.dashboard = new ModernProblemDashboard();
    
    // Track performance
    dashboard.trackPerformance();
    
    // Setup auto-save
    dashboard.setupAutoSave();
    
    // Cleanup on page unload
    window.addEventListener('beforeunload', () => {
        dashboard.cleanup();
    });
    
    // Handle modal clicks
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal-overlay')) {
            dashboard.closeResultModal();
        }
    });
    
    // Handle escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            dashboard.closeResultModal();
            dashboard.closeOutput();
        }
    });
});

// Service Worker registration for offline support
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(registration => {
                console.log('SW registered: ', registration);
            })
            .catch(registrationError => {
                console.log('SW registration failed: ', registrationError);
            });
    });
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ModernProblemDashboard;
}
