// Complete Dashboard Manager - Frontend Only
class DashboardManager {
    constructor() {
        this.currentTheme = localStorage.getItem('theme') || 'light';
        this.sidebarCollapsed = localStorage.getItem('sidebarCollapsed') === 'true';
        this.charts = {};
        
        this.init();
    }

    init() {
        // Show loading screen briefly
        this.showLoadingScreen();
        
        // Initialize everything
        this.applyTheme();
        this.setupEventListeners();
        this.initializeCharts();
        
        // Hide loading screen after initialization
        setTimeout(() => {
            this.hideLoadingScreen();
            this.showToast('Dashboard loaded successfully!', 'success');
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

        // Menu navigation
        const menuLinks = document.querySelectorAll('.menu-link');
        menuLinks.forEach(link => {
            link.addEventListener('click', this.handleMenuClick.bind(this));
        });

        // Quick actions
        const quickActionBtns = document.querySelectorAll('.quick-action-btn');
        quickActionBtns.forEach(btn => {
            btn.addEventListener('click', this.handleQuickAction.bind(this));
        });

        // Time filter buttons
        const filterBtns = document.querySelectorAll('.filter-btn');
        filterBtns.forEach(btn => {
            btn.addEventListener('click', this.handleTimeFilter.bind(this));
        });

        // Search functionality
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.addEventListener('input', this.handleSearch.bind(this));
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

    toggleTheme() {
        this.currentTheme = this.currentTheme === 'light' ? 'dark' : 'light';
        localStorage.setItem('theme', this.currentTheme);
        this.applyTheme();
        this.updateChartThemes();
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

    handleMenuClick(e) {
        e.preventDefault();
        
        // Remove active class from all menu items
        document.querySelectorAll('.menu-item').forEach(item => {
            item.classList.remove('active');
        });
        
        // Add active class to clicked item
        const menuItem = e.target.closest('.menu-item');
        if (menuItem) {
            menuItem.classList.add('active');
        }
        
        // Get page data
        const page = e.target.closest('.menu-link').dataset.page;
        this.navigateToPage(page);
        
        // Close mobile sidebar if open
        if (window.innerWidth <= 1024) {
            this.closeMobileSidebar();
        }
    }

    navigateToPage(page) {
        const pageTitle = document.getElementById('pageTitle');
        const pageSubtitle = document.getElementById('pageSubtitle');
        
        const pageInfo = {
            dashboard: {
                title: 'Dashboard',
                subtitle: 'Welcome back! Here\'s your coding progress'
            },
            problems: {
                title: 'Problems',
                subtitle: 'Practice coding problems and improve your skills'
            },
            contests: {
                title: 'Contests',
                subtitle: 'Participate in coding contests and compete'
            },
            submissions: {
                title: 'Submissions',
                subtitle: 'View your submission history and results'
            },
            'study-plan': {
                title: 'Study Plan',
                subtitle: 'Follow structured learning paths'
            },
            progress: {
                title: 'Progress',
                subtitle: 'Track your learning progress and achievements'
            }
        };
        
        const info = pageInfo[page] || pageInfo.dashboard;
        if (pageTitle) pageTitle.textContent = info.title;
        if (pageSubtitle) pageSubtitle.textContent = info.subtitle;
        
        this.showToast(`Navigated to ${info.title}`, 'info');
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

    handleQuickAction(e) {
        const action = e.target.closest('.quick-action-btn').dataset.action;
        
        const actions = {
            'random-problem': 'Opening random problem...',
            'daily-challenge': 'Loading daily challenge...',
            'practice-session': 'Starting practice session...',
            'mock-interview': 'Preparing mock interview...'
        };
        
        this.showToast(actions[action] || 'Action triggered!', 'info');
    }

    handleTimeFilter(e) {
        // Remove active class from all filter buttons
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        // Add active class to clicked button
        e.target.classList.add('active');
        
        const period = e.target.dataset.period;
        this.showToast(`Updated chart for ${period}`, 'info');
        this.updatePerformanceChart(period);
    }

    handleSearch(e) {
        const query = e.target.value.trim();
        if (query.length > 2) {
            this.showToast(`Searching for: ${query}`, 'info');
        }
    }

    handleLogout() {
        if (confirm('Are you sure you want to logout?')) {
            localStorage.removeItem('authToken');
            localStorage.removeItem('user');
            this.showToast('Logged out successfully!', 'success');
            setTimeout(() => {
                    window.location.href = `${this.apiBaseUrl}/login`;
                }, 1000);
        }
    }

    initializeCharts() {
        this.initProgressChart();
        this.initPerformanceChart();
    }

    initProgressChart() {
        const ctx = document.getElementById('progressChart');
        if (!ctx) return;

        this.charts.progress = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Easy', 'Medium', 'Hard'],
                datasets: [{
                    data: [85, 58, 13],
                    backgroundColor: [
                        '#22c55e',
                        '#f59e0b',
                        '#ef4444'
                    ],
                    borderWidth: 0,
                    cutout: '70%'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        callbacks: {
                            label: (context) => {
                                const label = context.label;
                                const value = context.parsed;
                                const totals = { Easy: 150, Medium: 200, Hard: 100 };
                                return `${label}: ${value}/${totals[label]}`;
                            }
                        }
                    }
                }
            }
        });
    }

    initPerformanceChart() {
        const ctx = document.getElementById('performanceChart');
        if (!ctx) return;

        const labels = [];
        const data = [];
        const now = new Date();
        
        for (let i = 6; i >= 0; i--) {
            const date = new Date(now);
            date.setDate(date.getDate() - i);
            labels.push(date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
            data.push(Math.floor(Math.random() * 10) + 1);
        }

        this.charts.performance = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Problems Solved',
                    data: data,
                    borderColor: '#6366f1',
                    backgroundColor: 'rgba(99, 102, 241, 0.1)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4,
                    pointBackgroundColor: '#6366f1',
                    pointBorderColor: '#ffffff',
                    pointBorderWidth: 2,
                    pointRadius: 6,
                    pointHoverRadius: 8
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    x: {
                        grid: {
                            display: false
                        },
                        border: {
                            display: false
                        }
                    },
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: this.currentTheme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'
                        },
                        border: {
                            display: false
                        }
                    }
                }
            }
        });
    }

    updateChartThemes() {
        Object.values(this.charts).forEach(chart => {
            if (chart) {
                chart.update();
            }
        });
    }

    updatePerformanceChart(period) {
        if (!this.charts.performance) return;
        
        // Generate new data based on period
        const dataPoints = period === '7d' ? 7 : period === '1m' ? 30 : 90;
        const newData = [];
        
        for (let i = 0; i < Math.min(dataPoints, 10); i++) {
            newData.push(Math.floor(Math.random() * 15) + 1);
        }
        
        this.charts.performance.data.datasets[0].data = newData;
        this.charts.performance.update();
    }

    handleResize() {
        Object.values(this.charts).forEach(chart => {
            if (chart) {
                chart.resize();
            }
        });

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

    cleanup() {
        Object.values(this.charts).forEach(chart => {
            if (chart) {
                chart.destroy();
            }
        });
    }
}

// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Force hide loading screen after 3 seconds max
    setTimeout(() => {
        const loadingScreen = document.getElementById('loadingScreen');
        if (loadingScreen && !loadingScreen.classList.contains('hidden')) {
            loadingScreen.classList.add('hidden');
        }
    }, 3000);

    // Initialize dashboard
    const dashboard = new DashboardManager();
    
    // Cleanup on page unload
    window.addEventListener('beforeunload', () => {
        dashboard.cleanup();
    });

    // Add interactive effects to cards
    const cards = document.querySelectorAll('.dashboard-card, .stat-card');
    cards.forEach(card => {
        card.addEventListener('mouseenter', () => {
            card.style.transform = 'translateY(-2px)';
        });
        
        card.addEventListener('mouseleave', () => {
            card.style.transform = 'translateY(0)';
        });
    });

    // Add ripple effect to buttons
    const buttons = document.querySelectorAll('button, .quick-action-btn');
    buttons.forEach(button => {
        button.addEventListener('click', function(e) {
            // Skip if button is disabled
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
            
            // Ensure button has relative positioning
            const originalPosition = this.style.position;
            this.style.position = 'relative';
            this.style.overflow = 'hidden';
            
            this.appendChild(ripple);
            
            setTimeout(() => {
                if (ripple.parentNode) {
                    ripple.remove();
                }
                // Restore original position if it was set
                if (originalPosition) {
                    this.style.position = originalPosition;
                } else {
                    this.style.position = '';
                }
            }, 600);
        });
    });

    // Add keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        // Ctrl/Cmd + K for search focus
        if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
            e.preventDefault();
            const searchInput = document.getElementById('searchInput');
            if (searchInput) {
                searchInput.focus();
            }
        }

        // Ctrl/Cmd + B to toggle sidebar
        if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
            e.preventDefault();
            dashboard.toggleSidebar();
        }

        // Escape to close panels
        if (e.key === 'Escape') {
            dashboard.closeAllPanels();
        }

        // Ctrl/Cmd + D to toggle theme
        if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
            e.preventDefault();
            dashboard.toggleTheme();
        }
    });

    // Add smooth scrolling for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });

    // Add loading states for buttons
    const actionButtons = document.querySelectorAll('.quick-action-btn, .card-action-btn');
    actionButtons.forEach(button => {
        button.addEventListener('click', function() {
            // Add loading state
            const originalContent = this.innerHTML;
            this.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
            this.disabled = true;
            
            // Remove loading state after 1 second
            setTimeout(() => {
                this.innerHTML = originalContent;
                this.disabled = false;
            }, 1000);
        });
    });

    // Add auto-refresh for charts every 30 seconds
    setInterval(() => {
        if (dashboard.charts.performance) {
            const currentPeriod = document.querySelector('.filter-btn.active')?.dataset.period || '7d';
            dashboard.updatePerformanceChart(currentPeriod);
        }
    }, 30000);

    // Add notification simulation
    let notificationCount = 3;
    setInterval(() => {
        if (Math.random() < 0.1) { // 10% chance every 10 seconds
            notificationCount++;
            const badge = document.querySelector('.notification-badge');
            if (badge) {
                badge.textContent = notificationCount;
                badge.style.display = 'block';
            }
            dashboard.showToast('New notification received!', 'info');
        }
    }, 10000);

    // Add progress bar animations
    const progressBars = document.querySelectorAll('.progress-fill');
    const animateProgressBars = () => {
        progressBars.forEach(bar => {
            const width = bar.style.width;
            bar.style.width = '0%';
            setTimeout(() => {
                bar.style.width = width;
            }, 100);
        });
    };

    // Animate progress bars when they come into view
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                animateProgressBars();
            }
        });
    });

    const progressSection = document.querySelector('.progress-summary');
    if (progressSection) {
        observer.observe(progressSection);
    }

    // Add dynamic time updates
    const updateTimeElements = () => {
        const timeElements = document.querySelectorAll('.activity-time');
        timeElements.forEach(element => {
            // This would normally update with real timestamps
            // For demo purposes, we'll just add a subtle animation
            element.style.opacity = '0.7';
            setTimeout(() => {
                element.style.opacity = '1';
            }, 100);
        });
    };

    setInterval(updateTimeElements, 60000); // Update every minute

    // Add CSS animations
    const additionalStyles = `
        @keyframes ripple {
            to {
                transform: scale(4);
                opacity: 0;
            }
        }
        
        @keyframes fadeInUp {
            from {
                opacity: 0;
                transform: translateY(20px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }
        
        .dashboard-card {
            animation: fadeInUp 0.5s ease-out;
        }
        
        .stat-card:nth-child(1) { animation-delay: 0.1s; }
        .stat-card:nth-child(2) { animation-delay: 0.2s; }
        .stat-card:nth-child(3) { animation-delay: 0.3s; }
        .stat-card:nth-child(4) { animation-delay: 0.4s; }
        
        .activity-item {
            transition: all 0.3s ease;
        }
        
        .activity-item:hover {
            transform: translateX(5px);
        }
        
        .quick-action-btn:active {
            transform: translateY(-1px) scale(0.98);
        }
        
        .progress-fill {
            transition: width 1s ease-in-out;
        }
        
        .toast {
            animation: slideInRight 0.3s ease-out;
        }
        
        @keyframes slideInRight {
            from {
                transform: translateX(100%);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }
        
        .loading-screen {
            backdrop-filter: blur(4px);
        }
        
        .sidebar {
            backdrop-filter: blur(10px);
        }
        
        .top-header {
            backdrop-filter: blur(10px);
        }
        
        /* Smooth transitions for theme changes */
        * {
            transition: background-color 0.3s ease, color 0.3s ease, border-color 0.3s ease;
        }
        
        /* Focus indicators for accessibility */
        .menu-link:focus,
        .quick-action-btn:focus,
        .action-btn:focus {
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
        
        /* Hover effects for better UX */
        .stat-card:hover .stat-icon {
            transform: scale(1.1);
        }
        
        .activity-icon {
            transition: transform 0.3s ease;
        }
        
        .activity-item:hover .activity-icon {
            transform: scale(1.1);
        }
        
        /* Mobile optimizations */
        @media (max-width: 768px) {
            .dashboard-card {
                animation-delay: 0s !important;
            }
            
            .stat-card {
                animation-delay: 0s !important;
            }
        }
    `;
    
    const styleSheet = document.createElement('style');
    styleSheet.textContent = additionalStyles;
    document.head.appendChild(styleSheet);

    // Initialize tooltips for action buttons
    const tooltipElements = document.querySelectorAll('[title]');
    tooltipElements.forEach(element => {
        element.addEventListener('mouseenter', function() {
            const tooltip = document.createElement('div');
            tooltip.className = 'tooltip';
            tooltip.textContent = this.getAttribute('title');
            tooltip.style.cssText = `
                position: absolute;
                background: var(--text-primary);
                color: var(--text-inverse);
                padding: 0.5rem;
                border-radius: var(--radius-md);
                font-size: 0.75rem;
                white-space: nowrap;
                z-index: 1000;
                pointer-events: none;
                opacity: 0;
                transition: opacity 0.3s ease;
            `;
            
            document.body.appendChild(tooltip);
            
            const rect = this.getBoundingClientRect();
            tooltip.style.left = rect.left + (rect.width / 2) - (tooltip.offsetWidth / 2) + 'px';
            tooltip.style.top = rect.bottom + 5 + 'px';
            
            setTimeout(() => {
                tooltip.style.opacity = '1';
            }, 100);
            
            this.addEventListener('mouseleave', () => {
                tooltip.remove();
            }, { once: true });
        });
    });

    console.log('Dashboard initialized successfully!');
});

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DashboardManager;
}

// Service worker registration for PWA capabilities
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

