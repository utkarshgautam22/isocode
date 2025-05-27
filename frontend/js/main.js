class LeetCodeClone {
    constructor() {
        this.problems = [];
        this.filteredProblems = [];
        this.currentPage = 1;
        this.itemsPerPage = 20;
        this.apiBaseUrl = 'http://localhost:8000'; // FastAPI backend
        
        this.init();
    }

    async init() {
        this.setupEventListeners();
        await this.loadProblems();
        await this.loadUserStats();
        this.showDailyChallenge();
    }

    setupEventListeners() {
        // Search functionality
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.addEventListener('input', this.debounce(this.handleSearch.bind(this), 300));
        }

        // Filter functionality
        const difficultyFilter = document.getElementById('difficultyFilter');
        const statusFilter = document.getElementById('statusFilter');
        const tagFilter = document.getElementById('tagFilter');
        const resetFilters = document.getElementById('resetFilters');

        if (difficultyFilter) difficultyFilter.addEventListener('change', this.applyFilters.bind(this));
        if (statusFilter) statusFilter.addEventListener('change', this.applyFilters.bind(this));
        if (tagFilter) tagFilter.addEventListener('change', this.applyFilters.bind(this));
        if (resetFilters) resetFilters.addEventListener('click', this.resetFilters.bind(this));

        // Pagination
        const prevBtn = document.getElementById('prevBtn');
        const nextBtn = document.getElementById('nextBtn');
        if (prevBtn) prevBtn.addEventListener('click', () => this.changePage(-1));
        if (nextBtn) nextBtn.addEventListener('click', () => this.changePage(1));

        // User menu dropdown
        const userAvatar = document.getElementById('userAvatar');
        if (userAvatar) userAvatar.addEventListener('click', this.toggleDropdown.bind(this));

        // Modal functionality
        const closeDailyModal = document.getElementById('closeDailyModal');
        if (closeDailyModal) closeDailyModal.addEventListener('click', this.closeDailyModal.bind(this));

        // Close modal on outside click
        const dailyModal = document.getElementById('dailyModal');
        if (dailyModal) {
            dailyModal.addEventListener('click', (e) => {
                if (e.target === e.currentTarget) {
                    this.closeDailyModal();
                }
            });
        }
    }

    async loadProblems() {
        try {
            this.showLoading(true);
            
            // Try to load from API first
            const response = await fetch(`${this.apiBaseUrl}/problems/`);
            if (response.ok) {
                const data = await response.json();
                this.problems = data.problems || [];
            } else {
                // Fallback to mock data
                this.problems = this.generateMockProblems();
            }
            
            this.filteredProblems = [...this.problems];
            this.renderProblems();
            this.updateStats();
            this.showLoading(false);
            
        } catch (error) {
            console.error('Error loading problems:', error);
            // Use mock data as fallback
            this.problems = this.generateMockProblems();
            this.filteredProblems = [...this.problems];
            this.renderProblems();
            this.updateStats();
            this.showLoading(false);
        }
    }

    generateMockProblems() {
        const difficulties = ['Easy', 'Medium', 'Hard'];
        const tags = ['Array', 'String', 'Dynamic Programming', 'Tree', 'Graph', 'Hash Table', 'Math', 'Two Pointers'];
        const problems = [];

        const problemTitles = [
            'Two Sum', 'Add Two Numbers', 'Longest Substring Without Repeating Characters',
            'Median of Two Sorted Arrays', 'Longest Palindromic Substring', 'ZigZag Conversion',
            'Reverse Integer', 'String to Integer (atoi)', 'Palindrome Number', 'Regular Expression Matching',
            'Container With Most Water', 'Integer to Roman', 'Roman to Integer', '3Sum', '3Sum Closest',
            'Letter Combinations of a Phone Number', '4Sum', 'Remove Nth Node From End of List',
            'Valid Parentheses', 'Merge Two Sorted Lists', 'Generate Parentheses', 'Merge k Sorted Lists',
            'Swap Nodes in Pairs', 'Reverse Nodes in k-Group', 'Remove Duplicates from Sorted Array',
            'Remove Element', 'Implement strStr()', 'Divide Two Integers', 'Substring with Concatenation of All Words'
        ];

        for (let i = 0; i < problemTitles.length; i++) {
            const difficulty = difficulties[Math.floor(Math.random() * difficulties.length)];
            const acceptance = Math.floor(Math.random() * 60) + 20;
            const frequency = Math.floor(Math.random() * 100);
            const randomTags = tags.slice(0, Math.floor(Math.random() * 3) + 1);
            
            problems.push({
                id: i + 1,
                title: problemTitles[i],
                difficulty: difficulty,
                acceptance: `${acceptance}%`,
                frequency: frequency,
                tags: randomTags,
                status: Math.random() > 0.7 ? 'solved' : Math.random() > 0.5 ? 'attempted' : 'todo',
                likes: Math.floor(Math.random() * 1000) + 100,
                dislikes: Math.floor(Math.random() * 100) + 10
            });
        }

        return problems;
    }

    async loadUserStats() {
        try {
            const token = localStorage.getItem('access_token');
            if (!token) return;

            const response = await fetch(`${this.apiBaseUrl}/user/stats`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                const stats = await response.json();
                this.updateUserStats(stats);
            }
        } catch (error) {
            console.error('Error loading user stats:', error);
        }
    }

    updateStats() {
        const totalProblems = document.getElementById('totalProblems');
        const solvedProblems = document.getElementById('solvedProblems');
        const acceptanceRate = document.getElementById('acceptanceRate');

        if (totalProblems) totalProblems.textContent = this.problems.length;
        
        const solved = this.problems.filter(p => p.status === 'solved').length;
        if (solvedProblems) solvedProblems.textContent = solved;
        
        const rate = this.problems.length > 0 ? Math.round((solved / this.problems.length) * 100) : 0;
        if (acceptanceRate) acceptanceRate.textContent = `${rate}%`;
    }

    renderProblems() {
        const problemsList = document.getElementById('problemsList');
        if (!problemsList) return;

        const startIndex = (this.currentPage - 1) * this.itemsPerPage;
        const endIndex = startIndex + this.itemsPerPage;
        const pageProblems = this.filteredProblems.slice(startIndex, endIndex);

        problemsList.innerHTML = '';

        pageProblems.forEach(problem => {
            const problemRow = document.createElement('div');
            problemRow.className = 'problem-row fade-in';
            problemRow.onclick = () => this.navigateToProblem(problem.id);

            problemRow.innerHTML = `
                <div class="status-icon status-${problem.status}">
                    ${this.getStatusIcon(problem.status)}
                </div>
                <div class="problem-title">${problem.title}</div>
                <div class="acceptance-rate">${problem.acceptance}</div>
                <div class="difficulty-badge difficulty-${problem.difficulty.toLowerCase()}">${problem.difficulty}</div>
                <div class="frequency-bar">
                    <div class="frequency-fill" style="width: ${problem.frequency}%"></div>
                </div>
            `;

            problemsList.appendChild(problemRow);
        });

        this.updatePagination();
    }

    getStatusIcon(status) {
        switch (status) {
            case 'solved': return '✓';
            case 'attempted': return '○';
            default: return '';
        }
    }

    navigateToProblem(problemId) {
        window.location.href = `problem.html?id=${problemId}`;
    }

    handleSearch(event) {
        const query = event.target.value.toLowerCase();
        this.filteredProblems = this.problems.filter(problem =>
            problem.title.toLowerCase().includes(query) ||
            problem.tags.some(tag => tag.toLowerCase().includes(query))
        );
        this.currentPage = 1;
        this.renderProblems();
    }

    applyFilters() {
        const difficultyFilter = document.getElementById('difficultyFilter')?.value;
        const statusFilter = document.getElementById('statusFilter')?.value;
        const tagFilter = document.getElementById('tagFilter')?.value;

        this.filteredProblems = this.problems.filter(problem => {
            const difficultyMatch = !difficultyFilter || problem.difficulty === difficultyFilter;
            const statusMatch = !statusFilter || problem.status === statusFilter;
            const tagMatch = !tagFilter || problem.tags.includes(tagFilter);
            
            return difficultyMatch && statusMatch && tagMatch;
        });

        this.currentPage = 1;
        this.renderProblems();
    }

    resetFilters() {
        document.getElementById('difficultyFilter').value = '';
        document.getElementById('statusFilter').value = '';
        document.getElementById('tagFilter').value = '';
        document.getElementById('searchInput').value = '';
        
        this.filteredProblems = [...this.problems];
        this.currentPage = 1;
        this.renderProblems();
    }

    changePage(direction) {
        const totalPages = Math.ceil(this.filteredProblems.length / this.itemsPerPage);
        const newPage = this.currentPage + direction;
        
        if (newPage >= 1 && newPage <= totalPages) {
            this.currentPage = newPage;
            this.renderProblems();
        }
    }

    updatePagination() {
        const totalPages = Math.ceil(this.filteredProblems.length / this.itemsPerPage);
        const pageNumbers = document.getElementById('pageNumbers');
        const prevBtn = document.getElementById('prevBtn');
        const nextBtn = document.getElementById('nextBtn');

        if (prevBtn) prevBtn.disabled = this.currentPage === 1;
        if (nextBtn) nextBtn.disabled = this.currentPage === totalPages;

        if (pageNumbers) {
            pageNumbers.innerHTML = '';
            
            for (let i = 1; i <= totalPages; i++) {
                if (i === 1 || i === totalPages || (i >= this.currentPage - 2 && i <= this.currentPage + 2)) {
                    const pageBtn = document.createElement('button');
                    pageBtn.className = `page-number ${i === this.currentPage ? 'active' : ''}`;
                    pageBtn.textContent = i;
                    pageBtn.onclick = () => {
                        this.currentPage = i;
                        this.renderProblems();
                    };
                    pageNumbers.appendChild(pageBtn);
                } else if (i === this.currentPage - 3 || i === this.currentPage + 3) {
                    const ellipsis = document.createElement('span');
                    ellipsis.textContent = '...';
                    ellipsis.className = 'page-ellipsis';
                    pageNumbers.appendChild(ellipsis);
                }
            }
        }
    }

    showLoading(show) {
        const loadingSpinner = document.getElementById('loadingSpinner');
        const problemsList = document.getElementById('problemsList');
        
        if (loadingSpinner) {
            loadingSpinner.style.display = show ? 'flex' : 'none';
        }
        if (problemsList) {
            problemsList.style.display = show ? 'none' : 'block';
        }
    }

    toggleDropdown() {
        const dropdownMenu = document.getElementById('dropdownMenu');
        if (dropdownMenu) {
            dropdownMenu.classList.toggle('active');
        }
    }

    showDailyChallenge() {
        // Show daily challenge modal after 2 seconds
        setTimeout(() => {
            const dailyModal = document.getElementById('dailyModal');
            const dailyContent = document.getElementById('dailyContent');
            
            if (dailyModal && dailyContent) {
                const todaysProblem = this.problems[Math.floor(Math.random() * this.problems.length)];
                
                dailyContent.innerHTML = `
                    <div class="daily-challenge">
                        <h3>Today's Challenge</h3>
                        <div class="challenge-problem">
                            <h4>${todaysProblem?.title || 'Two Sum'}</h4>
                            <span class="difficulty-badge difficulty-${(todaysProblem?.difficulty || 'Easy').toLowerCase()}">
                                ${todaysProblem?.difficulty || 'Easy'}
                            </span>
                        </div>
                        <p>Complete today's challenge to earn bonus points!</p>
                        <button class="btn-primary" onclick="window.location.href='problem.html?id=${todaysProblem?.id || 1}'">
                            Start Challenge
                        </button>
                    </div>
                `;
                
                dailyModal.classList.add('active');
            }
        }, 2000);
    }

    closeDailyModal() {
        const dailyModal = document.getElementById('dailyModal');
        if (dailyModal) {
            dailyModal.classList.remove('active');
        }
    }

    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
}

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    new LeetCodeClone();
});
