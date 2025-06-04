// Complete Problems Page Manager
class ProblemsManager {
    constructor() {
        this.currentTheme = localStorage.getItem('theme') || 'light';
        this.sidebarCollapsed = localStorage.getItem('sidebarCollapsed') === 'true';
        this.problems = [];
        this.filteredProblems = [];
        this.currentPage = 1;
        this.pageSize = 20;
        this.currentView = 'table';
        this.sortDirection = 'asc';
        this.sortBy = 'default';
        this.filters = {
            search: '',
            difficulty: 'all',
            status: 'all',
            category: 'all'
        };
        
        this.init();
    }

    async init() {
        this.showLoadingScreen();
        this.applyTheme();
        this.setupEventListeners();
        this.loadMockProblems();
        this.applyFilters();
        this.updateStats();
        
        setTimeout(() => {
            this.hideLoadingScreen();
            this.showToast('Problems loaded successfully!', 'success');
        }, 1500);
    }

    showLoadingScreen() {
        const loadingScreen = document.getElementById('loadingScreen');
        if (loadingScreen) {
            loadingScreen.classList.remove('hidden');
        }
    }

    hideLoadingScreen() {
        const loadingScreen = document.getElementById('loadingScreen');
        if (loadingScreen) {
            loadingScreen.classList.add('hidden');
        }
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

        // Sidebar toggle
        const sidebarToggle = document.getElementById('sidebarToggle');
        const mobileMenuBtn = document.getElementById('mobileMenuBtn');
        
        if (sidebarToggle) {
            sidebarToggle.addEventListener('click', this.toggleSidebar.bind(this));
        }
        
        if (mobileMenuBtn) {
            mobileMenuBtn.addEventListener('click', this.toggleMobileSidebar.bind(this));
        }

        // Search functionality
        const problemSearch = document.getElementById('problemSearch');
        const globalSearch = document.getElementById('globalSearch');
        
        if (problemSearch) {
            problemSearch.addEventListener('input', this.debounce((e) => {
                this.filters.search = e.target.value;
                this.applyFilters();
            }, 300));
        }

        if (globalSearch) {
            globalSearch.addEventListener('input', this.debounce((e) => {
                this.filters.search = e.target.value;
                this.applyFilters();
            }, 300));
        }

        // Filter buttons
        document.querySelectorAll('[data-difficulty]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('[data-difficulty]').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.filters.difficulty = e.target.dataset.difficulty;
                this.applyFilters();
            });
        });

        document.querySelectorAll('[data-status]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('[data-status]').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.filters.status = e.target.dataset.status;
                this.applyFilters();
            });
        });

        // Select filters
        const categorySelect = document.getElementById('categorySelect');
        const sortSelect = document.getElementById('sortSelect');

        if (categorySelect) {
            categorySelect.addEventListener('change', (e) => {
                this.filters.category = e.target.value;
                this.applyFilters();
            });
        }

        if (sortSelect) {
            sortSelect.addEventListener('change', (e) => {
                this.sortBy = e.target.value;
                this.applyFilters();
            });
        }

        // Reset filters
        const resetFilters = document.getElementById('resetFilters');
        if (resetFilters) {
            resetFilters.addEventListener('click', this.resetFilters.bind(this));
        }

        // View toggle
        document.querySelectorAll('.view-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.view-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.currentView = e.target.dataset.view;
                this.renderProblems();
            });
        });

        // Page size selector
        const pageSizeSelect = document.getElementById('pageSizeSelect');
        if (pageSizeSelect) {
            pageSizeSelect.addEventListener('change', (e) => {
                this.pageSize = parseInt(e.target.value);
                this.currentPage = 1;
                this.renderProblems();
            });
        }

        // Table sorting
        document.querySelectorAll('.sortable').forEach(th => {
            th.addEventListener('click', (e) => {
                const sortBy = e.target.dataset.sort;
                
                // Remove sort classes from other headers
                document.querySelectorAll('.sortable').forEach(header => {
                    if (header !== e.target) {
                        header.classList.remove('asc', 'desc');
                    }
                });

                // Toggle sort direction
                if (this.sortBy === sortBy) {
                    this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
                } else {
                    this.sortDirection = 'asc';
                    this.sortBy = sortBy;
                }

                // Update UI
                e.target.classList.remove('asc', 'desc');
                e.target.classList.add(this.sortDirection);

                this.applyFilters();
            });
        });

        // Action buttons
        const randomProblemBtn = document.getElementById('randomProblemBtn');
        const createProblemBtn = document.getElementById('createProblemBtn');

        if (randomProblemBtn) {
            randomProblemBtn.addEventListener('click', this.openRandomProblem.bind(this));
        }

        if (createProblemBtn) {
            createProblemBtn.addEventListener('click', this.createProblem.bind(this));
        }

        // Logout button
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', this.handleLogout.bind(this));
        }

        // Overlay click
        const overlay = document.getElementById('overlay');
        if (overlay) {
            overlay.addEventListener('click', this.closeAllPanels.bind(this));
        }

        // Window resize
        window.addEventListener('resize', this.handleResize.bind(this));

        // Apply saved sidebar state
        if (this.sidebarCollapsed) {
            document.getElementById('sidebar')?.classList.add('collapsed');
        }
    }

    loadMockProblems() {
        this.problems = [
            {
                id: 1,
                title: "Two Sum",
                difficulty: "easy",
                acceptance: 49.2,
                frequency: 85,
                status: "solved",
                tags: ["Array", "Hash Table"],
                description: "Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.",
                category: "array"
            },
            {
                id: 2,
                title: "Add Two Numbers",
                difficulty: "medium",
                acceptance: 35.8,
                frequency: 72,
                status: "attempted",
                tags: ["Linked List", "Math", "Recursion"],
                description: "You are given two non-empty linked lists representing two non-negative integers.",
                category: "linked-list"
            },
            {
                id: 3,
                title: "Longest Substring Without Repeating Characters",
                difficulty: "medium",
                acceptance: 33.1,
                frequency: 78,
                status: "solved",
                tags: ["Hash Table", "String", "Sliding Window"],
                description: "Given a string s, find the length of the longest substring without repeating characters.",
                category: "string"
            },
            {
                id: 4,
                title: "Median of Two Sorted Arrays",
                difficulty: "hard",
                acceptance: 34.2,
                frequency: 45,
                status: "todo",
                tags: ["Array", "Binary Search", "Divide and Conquer"],
                description: "Given two sorted arrays nums1 and nums2 of size m and n respectively, return the median.",
                category: "binary-search"
            },
            {
                id: 5,
                title: "Longest Palindromic Substring",
                difficulty: "medium",
                acceptance: 31.8,
                frequency: 65,
                status: "attempted",
                tags: ["String", "Dynamic Programming"],
                description: "Given a string s, return the longest palindromic substring in s.",
                category: "dynamic-programming"
            },
            {
                id: 6,
                title: "ZigZag Conversion",
                difficulty: "medium",
                acceptance: 40.5,
                frequency: 35,
                status: "todo",
                tags: ["String"],
                description: "The string PAYPALISHIRING is written in a zigzag pattern.",
                category: "string"
            },
            {
                id: 7,
                title: "Reverse Integer",
                difficulty: "easy",
                acceptance: 25.8,
                frequency: 55,
                status: "solved",
                tags: ["Math"],
                description: "Given a signed 32-bit integer x, return x with its digits reversed.",
                category: "math"
            },
            {
                id: 8,
                title: "String to Integer (atoi)",
                difficulty: "medium",
                acceptance: 16.2,
                frequency: 42,
                status: "attempted",
                tags: ["String"],
                description: "Implement the myAtoi(string s) function.",
                category: "string"
            },
            {
                id: 9,
                title: "Palindrome Number",
                difficulty: "easy",
                acceptance: 52.1,
                frequency: 68,
                status: "solved",
                tags: ["Math"],
                description: "Given an integer x, return true if x is palindrome integer.",
                category: "math"
            },
            {
                id: 10,
                title: "Regular Expression Matching",
                difficulty: "hard",
                acceptance: 27.8,
                frequency: 38,
                status: "todo",
                tags: ["String", "Dynamic Programming", "Recursion"],
                description: "Given an input string s and a pattern p, implement regular expression matching.",
                category: "dynamic-programming"
            },
            // Generate more mock problems
            ...Array.from({length: 440}, (_, i) => ({
                id: i + 11,
                title: `Problem ${i + 11}`,
                difficulty: ["easy", "medium", "hard"][Math.floor(Math.random() * 3)],
                acceptance: Math.floor(Math.random() * 60) + 20,
                frequency: Math.floor(Math.random() * 100),
                status: ["solved", "attempted", "todo"][Math.floor(Math.random() * 3)],
                tags: [["Array", "String"], ["Math", "Tree"], ["Graph", "Dynamic Programming"]][Math.floor(Math.random() * 3)],
                description: `This is a sample description for problem ${i + 11}.`,
                category: ["array", "string", "math", "tree", "graph", "dynamic-programming"][Math.floor(Math.random() * 6)]
            }))
        ];
    }

    applyFilters() {
        let filtered = [...this.problems];

        // Search filter
        if (this.filters.search) {
            const search = this.filters.search.toLowerCase();
            filtered = filtered.filter(problem => 
                problem.title.toLowerCase().includes(search) ||
                problem.tags.some(tag => tag.toLowerCase().includes(search))
            );
        }

        // Difficulty filter
        if (this.filters.difficulty !== 'all') {
            filtered = filtered.filter(problem => problem.difficulty === this.filters.difficulty);
        }

        // Status filter
        if (this.filters.status !== 'all') {
            filtered = filtered.filter(problem => problem.status === this.filters.status);
        }

        // Category filter
        if (this.filters.category !== 'all') {
            filtered = filtered.filter(problem => problem.category === this.filters.category);
        }

        // Sort
        if (this.sortBy !== 'default') {
            filtered.sort((a, b) => {
                let aVal, bVal;
                
                switch (this.sortBy) {
                    case 'title':
                        aVal = a.title.toLowerCase();
                        bVal = b.title.toLowerCase();
                        break;
                    case 'difficulty':
                        const diffOrder = { easy: 1, medium: 2, hard: 3 };
                        aVal = diffOrder[a.difficulty];
                        bVal = diffOrder[b.difficulty];
                        break;
                    case 'acceptance':
                        aVal = a.acceptance;
                        bVal = b.acceptance;
                        break;
                    case 'frequency':
                        aVal = a.frequency;
                        bVal = b.frequency;
                        break;
                    default:
                        return 0;
                }

                if (typeof aVal === 'string') {
                    return this.sortDirection === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
                } else {
                    return this.sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
                }
            });
        }

        this.filteredProblems = filtered;
        this.currentPage = 1;
        this.renderProblems();
        this.updateResultsCount();
    }

    renderProblems() {
        const startIndex = (this.currentPage - 1) * this.pageSize;
        const endIndex = startIndex + this.pageSize;
        const pageProblems = this.filteredProblems.slice(startIndex, endIndex);

        if (this.currentView === 'table') {
            this.renderProblemsTable(pageProblems);
            document.getElementById('problemsTable').style.display = 'block';
            document.getElementById('problemsCards').style.display = 'none';
        } else {
            this.renderProblemsCards(pageProblems);
            document.getElementById('problemsTable').style.display = 'none';
            document.getElementById('problemsCards').style.display = 'grid';
        }

        this.renderPagination();
        this.updatePaginationInfo();

        // Show empty state if no problems
        const isEmpty = this.filteredProblems.length === 0;
        document.getElementById('problemsEmpty').style.display = isEmpty ? 'block' : 'none';
    }

    renderProblemsTable(problems) {
        const tbody = document.getElementById('problemsTableBody');
        if (!tbody) return;

        tbody.innerHTML = problems.map(problem => `
            <tr>
                <td>
                    <div class="status-indicator-table ${problem.status}"></div>
                </td>
                <td>
                    <a href="#" class="problem-title" data-id="${problem.id}">${problem.title}</a>
                    <div class="problem-tags">
                        ${problem.tags.map(tag => `<span class="problem-tag">${tag}</span>`).join('')}
                    </div>
                </td>
                <td>
                    <span class="difficulty-badge ${problem.difficulty}">${problem.difficulty}</span>
                </td>
                <td>
                    <span class="acceptance-rate">${problem.acceptance}%</span>
                </td>
                <td>
                    <div class="frequency-bar">
                        <div class="frequency-fill" style="width: ${problem.frequency}%"></div>
                    </div>
                </td>
                <td>
                    <div class="problem-actions">
                        <button class="action-btn-small primary" title="Solve" data-id="${problem.id}">
                            <i class="fas fa-play"></i>
                        </button>
                        <button class="action-btn-small" title="Bookmark" data-id="${problem.id}">
                            <i class="far fa-bookmark"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');

        // Add event listeners
        tbody.querySelectorAll('.problem-title').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                this.openProblem(e.target.dataset.id);
            });
        });

        tbody.querySelectorAll('.action-btn-small').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const action = btn.title.toLowerCase();
                const problemId = btn.dataset.id;
                this.handleProblemAction(action, problemId);
            });
        });
    }

    renderProblemsCards(problems) {
        const container = document.getElementById('problemsCards');
        if (!container) return;

        container.innerHTML = problems.map(problem => `
            <div class="problem-card" data-id="${problem.id}">
                <div class="problem-card-header">
                    <div class="status-indicator-table ${problem.status}"></div>
                    <span class="difficulty-badge ${problem.difficulty}">${problem.difficulty}</span>
                </div>
                <h3 class="problem-card-title">${problem.title}</h3>
                <div class="problem-card-meta">
                    <span>Acceptance: ${problem.acceptance}%</span>
                    <span>Frequency: ${problem.frequency}</span>
                </div>
                <p class="problem-card-description">${problem.description}</p>
                <div class="problem-card-footer">
                    <div class="problem-tags">
                        ${problem.tags.slice(0, 2).map(tag => `<span class="problem-tag">${tag}</span>`).join('')}
                    </div>
                    <div class="problem-actions">
                        <button class="action-btn-small primary" title="Solve" data-id="${problem.id}">
                            <i class="fas fa-play"></i>
                        </button>
                        <button class="action-btn-small" title="Bookmark" data-id="${problem.id}">
                            <i class="far fa-bookmark"></i>
                        </button>
                    </div>
                </div>
            </div>
        `).join('');

        // Add event listeners
        container.querySelectorAll('.problem-card').forEach(card => {
            card.addEventListener('click', (e) => {
                if (!e.target.closest('.problem-actions')) {
                    this.openProblem(card.dataset.id);
                }
            });
        });

        container.querySelectorAll('.action-btn-small').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const action = btn.title.toLowerCase();
                const problemId = btn.dataset.id;
                this.handleProblemAction(action, problemId);
            });
        });
    }

    renderPagination() {
        const totalPages = Math.ceil(this.filteredProblems.length / this.pageSize);
        const pagination = document.getElementById('pagination');
        if (!pagination) return;

        let paginationHTML = '';

        // Previous button
        paginationHTML += `
            <button class="pagination-btn" ${this.currentPage === 1 ? 'disabled' : ''} data-page="${this.currentPage - 1}">
                <i class="fas fa-chevron-left"></i>
            </button>
        `;

        // Page numbers
        const startPage = Math.max(1, this.currentPage - 2);
        const endPage = Math.min(totalPages, this.currentPage + 2);

        if (startPage > 1) {
            paginationHTML += `<button class="pagination-btn" data-page="1">1</button>`;
            if (startPage > 2) {
                paginationHTML += `<span class="pagination-ellipsis">...</span>`;
            }
        }

        for (let i = startPage; i <= endPage; i++) {
            paginationHTML += `
                <button class="pagination-btn ${i === this.currentPage ? 'active' : ''}" data-page="${i}">
                    ${i}
                </button>
            `;
        }

        if (endPage < totalPages) {
            if (endPage < totalPages - 1) {
                paginationHTML += `<span class="pagination-ellipsis">...</span>`;
            }
            paginationHTML += `<button class="pagination-btn" data-page="${totalPages}">${totalPages}</button>`;
        }

        // Next button
        paginationHTML += `
            <button class="pagination-btn" ${this.currentPage === totalPages ? 'disabled' : ''} data-page="${this.currentPage + 1}">
                <i class="fas fa-chevron-right"></i>
            </button>
        `;

        pagination.innerHTML = paginationHTML;

        // Add event listeners
        pagination.querySelectorAll('.pagination-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                if (!btn.disabled && !btn.classList.contains('active')) {
                    this.currentPage = parseInt(btn.dataset.page);
                    this.renderProblems();
                }
            });
        });
    }

    updatePaginationInfo() {
        const startIndex = (this.currentPage - 1) * this.pageSize + 1;
        const endIndex = Math.min(this.currentPage * this.pageSize, this.filteredProblems.length);
        const total = this.filteredProblems.length;

        const paginationInfo = document.getElementById('paginationInfo');
        if (paginationInfo) {
            paginationInfo.textContent = `Showing ${startIndex}-${endIndex} of ${total} problems`;
        }
    }

    updateResultsCount() {
        const resultsCount = document.getElementById('resultsCount');
        if (resultsCount) {
            resultsCount.textContent = `Showing ${this.filteredProblems.length} problems`;
        }
    }

    updateStats() {
        const total = this.problems.length;
        const solved = this.problems.filter(p => p.status === 'solved').length;
        const attempted = this.problems.filter(p => p.status === 'attempted').length;
        const todo = this.problems.filter(p => p.status === 'todo').length;

        document.getElementById('totalProblems').textContent = total;
        document.getElementById('solvedProblems').textContent = solved;
        document.getElementById('attemptedProblems').textContent = attempted;
        document.getElementById('todoProblems').textContent = todo;
    }

    resetFilters() {
        this.filters = {
            search: '',
            difficulty: 'all',
            status: 'all',
            category: 'all'
        };
        this.sortBy = 'default';
        this.sortDirection = 'asc';

        // Reset UI
        document.getElementById('problemSearch').value = '';
        document.getElementById('globalSearch').value = '';
        document.getElementById('categorySelect').value = 'all';
        document.getElementById('sortSelect').value = 'default';

        document.querySelectorAll('[data-difficulty]').forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.difficulty === 'all') btn.classList.add('active');
        });

        document.querySelectorAll('[data-status]').forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.status === 'all') btn.classList.add('active');
        });

        document.querySelectorAll('.sortable').forEach(th => {
            th.classList.remove('asc', 'desc');
        });

        this.applyFilters();
        this.showToast('Filters reset', 'info');
    }

    handleProblemAction(action, problemId) {
        switch (action) {
            case 'solve':
                this.openProblem(problemId);
                break;
            case 'bookmark':
                this.toggleBookmark(problemId);
                break;
        }
    }

    openProblem(problemId) {
        this.showToast(`Opening problem ${problemId}...`, 'info');
        // Here you would typically navigate to the problem page
        // window.location.href = `problem.html?id=${problemId}`;
    }

    openRandomProblem() {
        const randomProblem = this.problems[Math.floor(Math.random() * this.problems.length)];
        this.openProblem(randomProblem.id);
    }

    createProblem() {
        this.showToast('Opening problem creator...', 'info');
        // Here you would typically navigate to the problem creation page
        // window.location.href = 'create-problem.html';
    }

    toggleBookmark(problemId) {
        this.showToast(`Bookmark toggled for problem ${problemId}`, 'info');
    }

    toggleTheme() {
        this.currentTheme = this.currentTheme === 'light' ? 'dark' : 'light';
        localStorage.setItem('theme', this.currentTheme);
        this.applyTheme();
        this.showToast(`Switched to ${this.currentTheme} theme`, 'info');
    }

    toggleSidebar() {
        const sidebar = document.getElementById('sidebar');
        if (sidebar) {
            sidebar.classList.toggle('collapsed');
            this.sidebarCollapsed = sidebar.classList.contains('collapsed');
            localStorage.setItem('sidebarCollapsed', this.sidebarCollapsed);
        }
    }

    toggleMobileSidebar() {
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('overlay');
        
        if (sidebar && overlay) {
            sidebar.classList.toggle('open');
            overlay.classList.toggle('active');
        }
    }

    closeMobileSidebar() {
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('overlay');
        
        if (sidebar) sidebar.classList.remove('open');
        if (overlay) overlay.classList.remove('active');
    }

    closeAllPanels() {
        this.closeMobileSidebar();
    }

    handleLogout() {
        if (confirm('Are you sure you want to logout?')) {
            localStorage.removeItem('authToken');
            localStorage.removeItem('user');
            this.showToast('Logged out successfully!', 'success');
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 1000);
        }
    }

    handleResize() {
        if (window.innerWidth > 1024) {
            this.closeMobileSidebar();
        }
    }

    showToast(message, type = 'info', duration = 3000) {
        const toastContainer = document.getElementById('toastContainer');
        if (!toastContainer) return;

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        
        const icons = {
            success: 'fas fa-check-circle',
            error: 'fas fa-exclamation-circle',
            warning: 'fas fa-exclamation-triangle',
            info: 'fas fa-info-circle'
        };

        toast.innerHTML = `
            <i class="toast-icon ${icons[type]}"></i>
            <div class="toast-content">
                <div class="toast-message">${message}</div>
            </div>
            <button class="toast-close">
                <i class="fas fa-times"></i>
            </button>
        `;

        toastContainer.appendChild(toast);

        // Show toast
        setTimeout(() => {
            toast.classList.add('show');
        }, 100);

        // Auto remove
        setTimeout(() => {
            this.removeToast(toast);
        }, duration);

        // Close button
        toast.querySelector('.toast-close').addEventListener('click', () => {
            this.removeToast(toast);
        });
    }

    removeToast(toast) {
        toast.classList.remove('show');
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 300);
    }

    // Utility function for debouncing
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

// Initialize problems manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Force hide loading screen after 3 seconds max
    setTimeout(() => {
        const loadingScreen = document.getElementById('loadingScreen');
        if (loadingScreen && !loadingScreen.classList.contains('hidden')) {
            loadingScreen.classList.add('hidden');
        }
    }, 3000);

    // Initialize problems manager
    const problemsManager = new ProblemsManager();
    
    // Add interactive effects to cards
    const cards = document.querySelectorAll('.stat-card, .problem-card');
    cards.forEach(card => {
        card.addEventListener('mouseenter', () => {
            card.style.transform = 'translateY(-2px)';
        });
        
        card.addEventListener('mouseleave', () => {
            card.style.transform = 'translateY(0)';
        });
    });

    // Add ripple effect to buttons
    const buttons = document.querySelectorAll('button, .filter-btn');
    buttons.forEach(button => {
        button.addEventListener('click', function(e) {
            if (this.disabled) return;
            
            const ripple = document.createElement('span');
            const rect = this.getBoundingClientRect();
            const size = Math.max(rect.width, rect.height);
            const x = e.clientX - rect.left - size / 2;
            const y = e.clientY - rect.top - size / 2;
            
            ripple.style.cssText = `
                position: absolute;
                width: ${size}px;
                height: ${size}px;
                left: ${x}px;
                top: ${y}px;
                background: rgba(255, 255, 255, 0.3);
                border-radius: 50%;
                transform: scale(0);
                animation: ripple 0.6s linear;
                pointer-events: none;
                z-index: 1;
            `;
            
            this.style.position = 'relative';
            this.style.overflow = 'hidden';
            this.appendChild(ripple);
            
            setTimeout(() => {
                if (ripple.parentNode) {
                    ripple.remove();
                }
            }, 600);
        });
    });

    // Add keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        // Ctrl/Cmd + K for search focus
        if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
            e.preventDefault();
            const searchInput = document.getElementById('problemSearch');
            if (searchInput) {
                searchInput.focus();
            }
        }

        // Ctrl/Cmd + B to toggle sidebar
        if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
            e.preventDefault();
            problemsManager.toggleSidebar();
        }

        // Escape to close panels
        if (e.key === 'Escape') {
            problemsManager.closeAllPanels();
        }

        // Ctrl/Cmd + R for random problem
        if ((e.ctrlKey || e.metaKey) && e.key === 'r') {
            e.preventDefault();
            problemsManager.openRandomProblem();
        }
    });

    // Add CSS animations
    const additionalStyles = `
        @keyframes ripple {
            to {
                transform: scale(4);
                opacity: 0;
            }
        }
        
        .stat-card {
            animation: fadeInUp 0.5s ease-out;
        }
        
        .stat-card:nth-child(1) { animation-delay: 0.1s; }
        .stat-card:nth-child(2) { animation-delay: 0.2s; }
        .stat-card:nth-child(3) { animation-delay: 0.3s; }
        .stat-card:nth-child(4) { animation-delay: 0.4s; }
        
        .problem-card:hover {
            animation: cardHover 0.3s ease-out;
        }
        
        @keyframes cardHover {
            0% { transform: translateY(0); }
            50% { transform: translateY(-4px); }
            100% { transform: translateY(-2px); }
        }
        
        .filter-btn:active {
            transform: scale(0.95);
        }
        
        .pagination-btn:hover:not(:disabled) {
            transform: translateY(-1px);
        }
        
        .action-btn-small:hover {
            transform: scale(1.1);
        }
        
        .problem-title:hover {
            text-decoration: underline;
        }
        
        .loading-screen {
            backdrop-filter: blur(4px);
        }
        
        .problems-table tbody tr:hover {
            transform: translateX(2px);
        }
        
        /* Smooth transitions for theme changes */
        * {
            transition: background-color 0.3s ease, color 0.3s ease, border-color 0.3s ease;
        }
        
        /* Focus indicators for accessibility */
        .filter-btn:focus,
        .action-btn-small:focus,
        .pagination-btn:focus {
            outline: 2px solid var(--primary-color);
            outline-offset: 2px;
        }
        
        /* Loading spinner animation */
        @keyframes spin {
            to { transform: rotate(360deg); }
        }
        
        .fa-spinner {
            animation: spin 1s linear infinite;
        }
    `;
    
    const styleSheet = document.createElement('style');
    styleSheet.textContent = additionalStyles;
    document.head.appendChild(styleSheet);

    console.log('Problems page initialized successfully!');
});

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ProblemsManager;
}
