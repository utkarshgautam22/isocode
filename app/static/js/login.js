class LoginManager {
    constructor() {
        this.currentTheme = localStorage.getItem('theme') || 'light';
        this.apiBaseUrl = 'http://localhost:8000'; // Replace with your API URL
        this.isLoading = false;
        
        this.init();
    }

    init() {
        this.applyTheme();
        this.setupEventListeners();
        this.setupFormValidation();
        this.loadSavedCredentials();
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

        // Password toggle
        const passwordToggle = document.getElementById('passwordToggle');
        if (passwordToggle) {
            passwordToggle.addEventListener('click', this.togglePassword.bind(this));
        }

        // Form submission
        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            loginForm.addEventListener('submit', this.handleLogin.bind(this));
        }

        // Social login buttons
        const googleLogin = document.getElementById('googleLogin');
        const githubLogin = document.getElementById('githubLogin');

        if (googleLogin) {
            googleLogin.addEventListener('click', this.handleGoogleLogin.bind(this));
        }

        if (githubLogin) {
            githubLogin.addEventListener('click', this.handleGithubLogin.bind(this));
        }

        // Forgot password
        const forgotPassword = document.getElementById('forgotPassword');
        if (forgotPassword) {
            forgotPassword.addEventListener('click', this.handleForgotPassword.bind(this));
        }

        // Notification close
        const notificationClose = document.getElementById('notificationClose');
        if (notificationClose) {
            notificationClose.addEventListener('click', this.hideNotification.bind(this));
        }

        // Input focus effects
        const inputs = document.querySelectorAll('input[type="email"], input[type="password"]');
        inputs.forEach(input => {
            input.addEventListener('focus', this.handleInputFocus.bind(this));
            input.addEventListener('blur', this.handleInputBlur.bind(this));
            input.addEventListener('input', this.handleInputChange.bind(this));
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', this.handleKeyboardShortcuts.bind(this));
    }

    setupFormValidation() {
        const emailInput = document.getElementById('email');
        const passwordInput = document.getElementById('password');

        if (emailInput) {
            emailInput.addEventListener('blur', () => this.validateEmail(emailInput.value));
        }

        if (passwordInput) {
            passwordInput.addEventListener('blur', () => this.validatePassword(passwordInput.value));
        }
    }

    loadSavedCredentials() {
        const rememberMe = localStorage.getItem('rememberMe') === 'true';
        const savedEmail = localStorage.getItem('savedEmail');

        if (rememberMe && savedEmail) {
            const emailInput = document.getElementById('email');
            const rememberCheckbox = document.getElementById('rememberMe');

            if (emailInput) emailInput.value = savedEmail;
            if (rememberCheckbox) rememberCheckbox.checked = true;
        }
    }

    toggleTheme() {
        this.currentTheme = this.currentTheme === 'light' ? 'dark' : 'light';
        localStorage.setItem('theme', this.currentTheme);
        this.applyTheme();
    }

    togglePassword() {
        const passwordInput = document.getElementById('password');
        const passwordToggle = document.getElementById('passwordToggle');

        if (passwordInput && passwordToggle) {
            const isPassword = passwordInput.type === 'password';
            passwordInput.type = isPassword ? 'text' : 'password';
            
            const icon = passwordToggle.querySelector('i');
            icon.className = isPassword ? 'fas fa-eye-slash' : 'fas fa-eye';
        }
    }

    async handleLogin(e) {
        e.preventDefault();
        
        if (this.isLoading) return;

        const formData = new FormData(e.target);
        const email = formData.get('email');
        const password = formData.get('password');
        const rememberMe = formData.get('rememberMe') === 'on';

        // Validate inputs
        if (!this.validateEmail(email) || !this.validatePassword(password)) {
            return;
        }

        this.setLoading(true);

        try {
            const response = await fetch(`${this.apiBaseUrl}/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, password, rememberMe })
            });

            const data = await response.json();

            if (response.ok) {
                // Save credentials if remember me is checked
                if (rememberMe) {
                    localStorage.setItem('rememberMe', 'true');
                    localStorage.setItem('savedEmail', email);
                } else {
                    localStorage.removeItem('rememberMe');
                    localStorage.removeItem('savedEmail');
                }

                // Save auth token
                localStorage.setItem('authToken', data.access_token);
                localStorage.setItem('user', JSON.stringify(data.user));

                this.showNotification('Login successful! Redirecting...', 'success');
                
                // Redirect after short delay
                setTimeout(() => {
                    window.location.href = `${this.apiBaseUrl}/dashboard`;
                }, 1500);

            } else {
                throw new Error(data.message || 'Login failed');
            }

        } catch (error) {
            console.error('Login error:', error);
            this.showNotification(error.message || 'Login failed. Please try again.', 'error');
        } finally {
            this.setLoading(false);
        }
    }

    async handleGoogleLogin() {
        if (this.isLoading) return;

        this.setLoading(true);
        this.showNotification('Redirecting to Google...', 'info');

        try {
            // In a real implementation, you would redirect to Google OAuth
            window.location.href = `${this.apiBaseUrl}/auth/google`;
        } catch (error) {
            console.error('Google login error:', error);
            this.showNotification('Google login failed. Please try again.', 'error');
            this.setLoading(false);
        }
    }

    async handleGithubLogin() {
        if (this.isLoading) return;

        this.setLoading(true);
        this.showNotification('Redirecting to GitHub...', 'info');

        try {
            // In a real implementation, you would redirect to GitHub OAuth
            window.location.href = `${this.apiBaseUrl}/auth/github`;
        } catch (error) {
            console.error('GitHub login error:', error);
            this.showNotification('GitHub login failed. Please try again.', 'error');
            this.setLoading(false);
        }
    }

    handleForgotPassword(e) {
        e.preventDefault();
        
        const email = document.getElementById('email').value;
        
        if (email) {
            this.showForgotPasswordModal(email);
        } else {
            this.showNotification('Please enter your email address first.', 'warning');
            document.getElementById('email').focus();
        }
    }

    showForgotPasswordModal(email) {
        // Create modal dynamically
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal">
                <div class="modal-header">
                    <h3>Reset Password</h3>
                    <button class="modal-close">&times;</button>
                </div>
                <div class="modal-body">
                    <p>Enter your email address and we'll send you a link to reset your password.</p>
                    <div class="form-group">
                        <label for="resetEmail">Email Address</label>
                        <input type="email" id="resetEmail" value="${email}" placeholder="Enter your email">
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn-secondary modal-cancel">Cancel</button>
                    <button class="btn-primary modal-submit">Send Reset Link</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        
        // Add modal styles
        const modalStyles = `
            .modal-overlay {
                position: fixed;
                inset: 0;
                background: rgba(0, 0, 0, 0.5);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 10000;
                backdrop-filter: blur(4px);
            }
            .modal {
                background: var(--bg-primary);
                border-radius: var(--radius-xl);
                box-shadow: var(--shadow-xl);
                max-width: 400px;
                width: 90%;
                overflow: hidden;
                animation: modalSlideIn 0.3s ease-out;
            }
            @keyframes modalSlideIn {
                from { opacity: 0; transform: translateY(-20px) scale(0.95); }
                to { opacity: 1; transform: translateY(0) scale(1); }
            }
            .modal-header {
                padding: 1.5rem;
                border-bottom: 1px solid var(--border-color);
                display: flex;
                justify-content: space-between;
                align-items: center;
            }
            .modal-header h3 {
                margin: 0;
                color: var(--text-primary);
            }
            .modal-close {
                background: none;
                border: none;
                font-size: 1.5rem;
                color: var(--text-muted);
                cursor: pointer;
                padding: 0.25rem;
                border-radius: var(--radius-sm);
                transition: var(--transition);
            }
            .modal-close:hover {
                background: var(--bg-secondary);
                color: var(--text-primary);
            }
            .modal-body {
                padding: 1.5rem;
            }
            .modal-body p {
                margin-bottom: 1rem;
                color: var(--text-secondary);
            }
            .modal-footer {
                padding: 1.5rem;
                border-top: 1px solid var(--border-color);
                display: flex;
                gap: 1rem;
                justify-content: flex-end;
            }
            .btn-secondary, .btn-primary {
                padding: 0.5rem 1rem;
                border-radius: var(--radius-md);
                font-weight: 500;
                cursor: pointer;
                transition: var(--transition);
                border: none;
            }
            .btn-secondary {
                background: var(--bg-secondary);
                color: var(--text-primary);
                border: 1px solid var(--border-color);
            }
            .btn-primary {
                background: var(--primary-color);
                color: white;
            }
        `;

        const styleSheet = document.createElement('style');
        styleSheet.textContent = modalStyles;
        document.head.appendChild(styleSheet);

        // Event listeners
        modal.querySelector('.modal-close').addEventListener('click', () => {
            document.body.removeChild(modal);
            document.head.removeChild(styleSheet);
        });

        modal.querySelector('.modal-cancel').addEventListener('click', () => {
            document.body.removeChild(modal);
            document.head.removeChild(styleSheet);
        });

        modal.querySelector('.modal-submit').addEventListener('click', async () => {
            const resetEmail = modal.querySelector('#resetEmail').value;
            if (this.validateEmail(resetEmail)) {
                try {
                    await this.sendPasswordReset(resetEmail);
                    document.body.removeChild(modal);
                    document.head.removeChild(styleSheet);
                    this.showNotification('Password reset link sent to your email!', 'success');
                } catch (error) {
                    this.showNotification('Failed to send reset link. Please try again.', 'error');
                }
            }
        });

        // Close on overlay click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                document.body.removeChild(modal);
                document.head.removeChild(styleSheet);
            }
        });

        // Focus email input
        setTimeout(() => {
            modal.querySelector('#resetEmail').focus();
        }, 100);
    }

    async sendPasswordReset(email) {
        const response = await fetch(`${this.apiBaseUrl}/auth/forgot-password`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email })
        });

        if (!response.ok) {
            throw new Error('Failed to send reset email');
        }

        return response.json();
    }

    validateEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const isValid = emailRegex.test(email);
        
        const errorElement = document.getElementById('emailError');
        if (errorElement) {
            if (!isValid && email) {
                errorElement.textContent = 'Please enter a valid email address';
                errorElement.classList.add('show');
            } else {
                errorElement.classList.remove('show');
            }
        }
        
        return isValid;
    }

    validatePassword(password) {
        const isValid = password && password.length >= 6;
        
        const errorElement = document.getElementById('passwordError');
        if (errorElement) {
            if (!isValid && password) {
                errorElement.textContent = 'Password must be at least 6 characters long';
                errorElement.classList.add('show');
            } else {
                errorElement.classList.remove('show');
            }
        }
        
        return isValid;
    }

    handleInputFocus(e) {
        const wrapper = e.target.closest('.input-wrapper');
        if (wrapper) {
            wrapper.classList.add('focused');
        }
    }

    handleInputBlur(e) {
        const wrapper = e.target.closest('.input-wrapper');
        if (wrapper) {
            wrapper.classList.remove('focused');
        }
    }

    handleInputChange(e) {
        const input = e.target;
        const wrapper = input.closest('.input-wrapper');
        
        if (wrapper) {
            if (input.value) {
                wrapper.classList.add('has-value');
            } else {
                wrapper.classList.remove('has-value');
            }
        }

        // Real-time validation
        if (input.type === 'email') {
            this.validateEmail(input.value);
        } else if (input.type === 'password') {
            this.validatePassword(input.value);
        }
    }

    handleKeyboardShortcuts(e) {
        // Enter key to submit form
        if (e.key === 'Enter' && !e.shiftKey && !e.ctrlKey) {
            const activeElement = document.activeElement;
            if (activeElement && (activeElement.type === 'email' || activeElement.type === 'password')) {
                e.preventDefault();
                const form = activeElement.closest('form');
                if (form) {
                    form.dispatchEvent(new Event('submit'));
                }
            }
        }

        // Escape key to close notifications
        if (e.key === 'Escape') {
            this.hideNotification();
        }
    }

    setLoading(loading) {
        this.isLoading = loading;
        const loginBtn = document.getElementById('loginBtn');
        const loadingOverlay = document.getElementById('loadingOverlay');

        if (loginBtn) {
            if (loading) {
                loginBtn.classList.add('loading');
                loginBtn.disabled = true;
            } else {
                loginBtn.classList.remove('loading');
                loginBtn.disabled = false;
            }
        }

        if (loadingOverlay) {
            if (loading) {
                loadingOverlay.classList.add('show');
            } else {
                loadingOverlay.classList.remove('show');
            }
        }
    }

    showNotification(message, type = 'info') {
        const notification = document.getElementById('notification');
        if (!notification) return;

        const icon = notification.querySelector('.notification-icon');
        const messageElement = notification.querySelector('.notification-message');

        // Set icon based on type
        const icons = {
            success: 'fas fa-check-circle',
            error: 'fas fa-exclamation-circle',
            warning: 'fas fa-exclamation-triangle',
            info: 'fas fa-info-circle'
        };

        if (icon) icon.className = `notification-icon ${icons[type] || icons.info}`;
        if (messageElement) messageElement.textContent = message;

        // Set notification type
        notification.className = `notification ${type}`;
        notification.classList.add('show');

        // Auto hide after 5 seconds
        setTimeout(() => {
            this.hideNotification();
        }, 5000);
    }

    hideNotification() {
        const notification = document.getElementById('notification');
        if (notification) {
            notification.classList.remove('show');
        }
    }

    // Utility method to check if user is already logged in
    checkAuthStatus() {
        const token = localStorage.getItem('authToken');
        if (token) {
            // Verify token with server
            fetch(`${this.apiBaseUrl}/auth/verify`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            })
            .then(response => {
                if (response.ok) {
                    // User is already logged in, redirect to dashboard
                    window.location.href = `${this.apiBaseUrl}/dashboard`;
                } else {
                    // Token is invalid, remove it
                    localStorage.removeItem('authToken');
                    localStorage.removeItem('user');
                }
            })
            .catch(error => {
                console.error('Auth verification error:', error);
                // Remove potentially invalid token
                localStorage.removeItem('authToken');
                localStorage.removeItem('user');
            });
        }
    }
}

// Initialize the login manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const loginManager = new LoginManager();
    
    // Check if user is already authenticated
    loginManager.checkAuthStatus();
    
    // Add some interactive effects
    const socialBtns = document.querySelectorAll('.social-btn');
    socialBtns.forEach(btn => {
        btn.addEventListener('mouseenter', () => {
            btn.style.transform = 'translateY(-2px) scale(1.02)';
        });
        
        btn.addEventListener('mouseleave', () => {
            btn.style.transform = 'translateY(0) scale(1)';
        });
    });

    // Add ripple effect to buttons
    const buttons = document.querySelectorAll('button');
    buttons.forEach(button => {
        button.addEventListener('click', function(e) {
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
            `;
            
            this.style.position = 'relative';
            this.style.overflow = 'hidden';
            this.appendChild(ripple);
            
            setTimeout(() => {
                ripple.remove();
            }, 600);
        });
    });

    // Add CSS for ripple animation
    const rippleStyles = `
        @keyframes ripple {
            to {
                transform: scale(4);
                opacity: 0;
            }
        }
    `;
    
    const styleSheet = document.createElement('style');
    styleSheet.textContent = rippleStyles;
    document.head.appendChild(styleSheet);
});

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = LoginManager;
}
