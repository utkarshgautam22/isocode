class ForgotPasswordManager {
    constructor() {
        this.currentTheme = localStorage.getItem('theme') || 'light';
        this.currentStep = 'email';
        this.apiBaseUrl = 'http://localhost:8000'; // Replace with your API URL
        this.isLoading = false;
        this.timer = null;
        this.timeLeft = 300; // 5 minutes for verification code
        this.userEmail = '';
        this.userPhone = '';
        this.validationRules = {
            email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
            phone: /^[\+]?[1-9][\d]{0,15}$/
        };
        
        this.init();
    }

    async init() {
        this.applyTheme();
        this.setupEventListeners();
        this.setupFormValidation();
        this.setupCodeInputs();
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

        // Form submissions
        const emailForm = document.getElementById('emailForm');
        const usernameForm = document.getElementById('usernameForm');
        const phoneForm = document.getElementById('phoneForm');
        const verificationForm = document.getElementById('verificationForm');

        if (emailForm) {
            emailForm.addEventListener('submit', this.handleEmailSubmit.bind(this));
        }

        if (usernameForm) {
            usernameForm.addEventListener('submit', this.handleUsernameSubmit.bind(this));
        }

        if (phoneForm) {
            phoneForm.addEventListener('submit', this.handlePhoneSubmit.bind(this));
        }

        if (verificationForm) {
            verificationForm.addEventListener('submit', this.handleVerificationSubmit.bind(this));
        }

        // Recovery options
        const usernameRecovery = document.getElementById('usernameRecovery');
        const phoneRecovery = document.getElementById('phoneRecovery');

        if (usernameRecovery) {
            usernameRecovery.addEventListener('click', () => this.showStep('username'));
        }

        if (phoneRecovery) {
            phoneRecovery.addEventListener('click', () => this.showStep('phone'));
        }

        // Navigation buttons
        const backToEmail = document.getElementById('backToEmail');
        const backToEmailFromPhone = document.getElementById('backToEmailFromPhone');
        const backToPhone = document.getElementById('backToPhone');

        if (backToEmail) {
            backToEmail.addEventListener('click', () => this.showStep('email'));
        }

        if (backToEmailFromPhone) {
            backToEmailFromPhone.addEventListener('click', () => this.showStep('email'));
        }

        if (backToPhone) {
            backToPhone.addEventListener('click', () => this.showStep('phone'));
        }

        // Confirmation actions
        const resendEmail = document.getElementById('resendEmail');
        const changeEmail = document.getElementById('changeEmail');
        const resendCode = document.getElementById('resendCode');

        if (resendEmail) {
            resendEmail.addEventListener('click', this.resendResetEmail.bind(this));
        }

        if (changeEmail) {
            changeEmail.addEventListener('click', () => this.showStep('email'));
        }

        if (resendCode) {
            resendCode.addEventListener('click', this.resendVerificationCode.bind(this));
        }

        // Notification close
        const notificationClose = document.getElementById('notificationClose');
        if (notificationClose) {
            notificationClose.addEventListener('click', this.hideNotification.bind(this));
        }

        // Input focus effects
        const inputs = document.querySelectorAll('input');
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
        const usernameInput = document.getElementById('username');
        const phoneInput = document.getElementById('phone');

        if (emailInput) {
            emailInput.addEventListener('blur', () => this.validateEmail(emailInput.value));
            emailInput.addEventListener('input', this.debounce(() => this.validateEmail(emailInput.value), 300));
        }

        if (usernameInput) {
            usernameInput.addEventListener('blur', () => this.validateUsername(usernameInput.value));
        }

        if (phoneInput) {
            phoneInput.addEventListener('blur', () => this.validatePhone(phoneInput.value));
        }
    }

    setupCodeInputs() {
        const codeInputs = document.querySelectorAll('.code-digit');
        
        codeInputs.forEach((input, index) => {
            input.addEventListener('input', (e) => {
                const value = e.target.value;
                
                // Only allow numbers
                if (!/^\d*$/.test(value)) {
                    e.target.value = '';
                    return;
                }

                if (value) {
                    e.target.classList.add('filled');
                    // Move to next input
                    if (index < codeInputs.length - 1) {
                        codeInputs[index + 1].focus();
                    }
                } else {
                    e.target.classList.remove('filled');
                }

                this.validateVerificationCode();
            });

            input.addEventListener('keydown', (e) => {
                // Handle backspace
                if (e.key === 'Backspace' && !input.value && index > 0) {
                    codeInputs[index - 1].focus();
                    codeInputs[index - 1].value = '';
                    codeInputs[index - 1].classList.remove('filled');
                }

                // Handle arrow keys
                if (e.key === 'ArrowLeft' && index > 0) {
                    codeInputs[index - 1].focus();
                }
                if (e.key === 'ArrowRight' && index < codeInputs.length - 1) {
                    codeInputs[index + 1].focus();
                }
            });

            input.addEventListener('paste', (e) => {
                e.preventDefault();
                const pastedData = e.clipboardData.getData('text');
                const digits = pastedData.replace(/\D/g, '').slice(0, 6);
                
                digits.split('').forEach((digit, i) => {
                    if (codeInputs[i]) {
                        codeInputs[i].value = digit;
                        codeInputs[i].classList.add('filled');
                    }
                });

                this.validateVerificationCode();
            });
        });
    }

    toggleTheme() {
        this.currentTheme = this.currentTheme === 'light' ? 'dark' : 'light';
        localStorage.setItem('theme', this.currentTheme);
        this.applyTheme();
    }

    showStep(step) {
        // Hide all steps
        document.querySelectorAll('.step-content').forEach(content => {
            content.classList.remove('active');
        });

        // Show target step
        const targetStep = document.getElementById(`${step}Step`);
        if (targetStep) {
            targetStep.classList.add('active');
            this.currentStep = step;

            // Focus first input in the step
            setTimeout(() => {
                const firstInput = targetStep.querySelector('input');
                if (firstInput) {
                    firstInput.focus();
                }
            }, 100);
        }
    }

    async handleEmailSubmit(e) {
        e.preventDefault();
        
        if (this.isLoading) return;

        const email = document.getElementById('email').value;
        
        if (!this.validateEmail(email)) {
            return;
        }

        this.setLoading(true);

        try {
            const response = await fetch(`${this.apiBaseUrl}/auth/forgot-password`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email })
            });

            const data = await response.json();

            if (response.ok) {
                this.userEmail = email;
                document.getElementById('sentEmailDisplay').textContent = email;
                this.showStep('confirmation');
                this.showNotification('Password reset link sent successfully!', 'success');
            } else {
                throw new Error(data.message || 'Failed to send reset email');
            }

        } catch (error) {
            console.error('Email reset error:', error);
            this.showNotification(error.message || 'Failed to send reset email. Please try again.', 'error');
        } finally {
            this.setLoading(false);
        }
    }

    async handleUsernameSubmit(e) {
        e.preventDefault();
        
        if (this.isLoading) return;

        const username = document.getElementById('username').value;
        
        if (!this.validateUsername(username)) {
            return;
        }

        this.setLoading(true);

        try {
            const response = await fetch(`${this.apiBaseUrl}/auth/find-email-by-username`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username })
            });

            const data = await response.json();

            if (response.ok) {
                // Show masked email and proceed to email reset
                const maskedEmail = this.maskEmail(data.email);
                this.showNotification(`Email found: ${maskedEmail}. Sending reset link...`, 'info');
                
                // Automatically send reset email
                setTimeout(() => {
                    this.userEmail = data.email;
                    document.getElementById('sentEmailDisplay').textContent = maskedEmail;
                    this.showStep('confirmation');
                    this.showNotification('Password reset link sent successfully!', 'success');
                }, 1500);

            } else {
                throw new Error(data.message || 'Username not found');
            }

        } catch (error) {
            console.error('Username recovery error:', error);
            this.showNotification(error.message || 'Username not found. Please try again.', 'error');
        } finally {
            this.setLoading(false);
        }
    }

    async handlePhoneSubmit(e) {
        e.preventDefault();
        
        if (this.isLoading) return;

        const phone = document.getElementById('phone').value;
        
        if (!this.validatePhone(phone)) {
            return;
        }

        this.setLoading(true);

        try {
            const response = await fetch(`${this.apiBaseUrl}/auth/send-sms-code`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ phone })
            });

            const data = await response.json();

            if (response.ok) {
                this.userPhone = phone;
                document.getElementById('maskedPhone').textContent = this.maskPhone(phone);
                this.showStep('phoneVerification');
                this.startTimer();
                this.showNotification('Verification code sent to your phone!', 'success');
            } else {
                throw new Error(data.message || 'Failed to send verification code');
            }

        } catch (error) {
            console.error('Phone verification error:', error);
            this.showNotification(error.message || 'Failed to send verification code. Please try again.', 'error');
        } finally {
            this.setLoading(false);
        }
    }

    async handleVerificationSubmit(e) {
        e.preventDefault();
        
        if (this.isLoading) return;

        const code = this.getVerificationCode();
        
        if (!this.validateVerificationCode()) {
            return;
        }

        this.setLoading(true);

        try {
            const response = await fetch(`${this.apiBaseUrl}/auth/verify-sms-code`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ 
                    phone: this.userPhone,
                    code: code 
                })
            });

            const data = await response.json();

            if (response.ok) {
                this.showNotification('Phone verified! Redirecting to password reset...', 'success');
                
                // Redirect to password reset page with token
                setTimeout(() => {
                    window.location.href = `reset-password.html?token=${data.resetToken}`;
                }, 1500);

            } else {
                throw new Error(data.message || 'Invalid verification code');
            }

        } catch (error) {
            console.error('Code verification error:', error);
            this.showNotification(error.message || 'Invalid verification code. Please try again.', 'error');
            this.clearVerificationCode();
        } finally {
            this.setLoading(false);
        }
    }

    // Validation methods
    validateEmail(email) {
        const isValid = this.validationRules.email.test(email);
        
        if (!isValid && email) {
            this.showFieldError('email', 'Please enter a valid email address');
            this.setValidationIcon('emailValidation', false);
        } else if (isValid) {
            this.hideFieldError('email');
            this.setValidationIcon('emailValidation', true);
        }
        
        return isValid;
    }

    validateUsername(username) {
        const isValid = username && username.trim().length >= 3;
        
        if (!isValid && username) {
            this.showFieldError('username', 'Username must be at least 3 characters long');
            this.setValidationIcon('usernameValidation', false);
        } else if (isValid) {
            this.hideFieldError('username');
            this.setValidationIcon('usernameValidation', true);
        }
        
        return isValid;
    }

    validatePhone(phone) {
        const isValid = this.validationRules.phone.test(phone);
        
        if (!isValid && phone) {
            this.showFieldError('phone', 'Please enter a valid phone number');
            this.setValidationIcon('phoneValidation', false);
        } else if (isValid) {
            this.hideFieldError('phone');
            this.setValidationIcon('phoneValidation', true);
        }
        
        return isValid;
    }

    validateVerificationCode() {
        const code = this.getVerificationCode();
        const isValid = code.length === 6 && /^\d{6}$/.test(code);
        
        if (!isValid && code.length > 0) {
            this.showFieldError('code', 'Please enter a valid 6-digit code');
        } else if (isValid) {
            this.hideFieldError('code');
        }
        
        return isValid;
    }

    getVerificationCode() {
        const inputs = document.querySelectorAll('.code-digit');
        return Array.from(inputs).map(input => input.value).join('');
    }

        clearVerificationCode() {
        const inputs = document.querySelectorAll('.code-digit');
        inputs.forEach(input => {
            input.value = '';
            input.classList.remove('filled');
        });
        inputs[0].focus();
    }

    startTimer() {
        this.timeLeft = 300; // 5 minutes
        this.updateTimerDisplay();
        
        this.timer = setInterval(() => {
            this.timeLeft--;
            this.updateTimerDisplay();
            
            if (this.timeLeft <= 0) {
                this.stopTimer();
                this.enableResendCode();
            }
        }, 1000);
    }

    stopTimer() {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
    }

    updateTimerDisplay() {
        const minutes = Math.floor(this.timeLeft / 60);
        const seconds = this.timeLeft % 60;
        const timerElement = document.getElementById('timer');
        
        if (timerElement) {
            timerElement.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }
    }

    enableResendCode() {
        const resendBtn = document.getElementById('resendCode');
        if (resendBtn) {
            resendBtn.disabled = false;
            resendBtn.textContent = 'Resend Code';
        }
    }

    async resendResetEmail() {
        if (this.isLoading) return;

        this.setLoading(true);

        try {
            const response = await fetch(`${this.apiBaseUrl}/auth/forgot-password`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email: this.userEmail })
            });

            if (response.ok) {
                this.showNotification('Reset email sent again!', 'success');
            } else {
                throw new Error('Failed to resend email');
            }

        } catch (error) {
            console.error('Resend email error:', error);
            this.showNotification('Failed to resend email. Please try again.', 'error');
        } finally {
            this.setLoading(false);
        }
    }

    async resendVerificationCode() {
        if (this.isLoading) return;

        this.setLoading(true);

        try {
            const response = await fetch(`${this.apiBaseUrl}/auth/send-sms-code`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ phone: this.userPhone })
            });

            if (response.ok) {
                this.clearVerificationCode();
                this.startTimer();
                document.getElementById('resendCode').disabled = true;
                this.showNotification('New verification code sent!', 'success');
            } else {
                throw new Error('Failed to resend code');
            }

        } catch (error) {
            console.error('Resend code error:', error);
            this.showNotification('Failed to resend code. Please try again.', 'error');
        } finally {
            this.setLoading(false);
        }
    }

    // Utility methods
    maskEmail(email) {
        const [username, domain] = email.split('@');
        const maskedUsername = username.length > 2 
            ? username[0] + '*'.repeat(username.length - 2) + username[username.length - 1]
            : username[0] + '*';
        return `${maskedUsername}@${domain}`;
    }

    maskPhone(phone) {
        if (phone.length <= 4) return phone;
        const visibleDigits = 2;
        const maskedPart = '*'.repeat(phone.length - visibleDigits * 2);
        return phone.slice(0, visibleDigits) + maskedPart + phone.slice(-visibleDigits);
    }

    showFieldError(fieldId, message) {
        const errorElement = document.getElementById(`${fieldId}Error`);
        if (errorElement) {
            errorElement.textContent = message;
            errorElement.classList.add('show');
        }
    }

    hideFieldError(fieldId) {
        const errorElement = document.getElementById(`${fieldId}Error`);
        if (errorElement) {
            errorElement.classList.remove('show');
        }
    }

    setValidationIcon(iconId, isValid) {
        const iconElement = document.getElementById(iconId);
        if (iconElement) {
            iconElement.className = 'validation-icon';
            iconElement.innerHTML = isValid ? '<i class="fas fa-check"></i>' : '<i class="fas fa-times"></i>';
            iconElement.classList.add(isValid ? 'valid' : 'invalid');
        }
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
    }

    handleKeyboardShortcuts(e) {
        // Enter key to submit current form
        if (e.key === 'Enter' && !e.shiftKey && !e.ctrlKey) {
            const activeElement = document.activeElement;
            if (activeElement && activeElement.tagName === 'INPUT' && !activeElement.classList.contains('code-digit')) {
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

        // Ctrl+R to resend (when applicable)
        if ((e.ctrlKey || e.metaKey) && e.key === 'r') {
            if (this.currentStep === 'confirmation') {
                e.preventDefault();
                this.resendResetEmail();
            } else if (this.currentStep === 'phoneVerification') {
                e.preventDefault();
                const resendBtn = document.getElementById('resendCode');
                if (resendBtn && !resendBtn.disabled) {
                    this.resendVerificationCode();
                }
            }
        }
    }

    setLoading(loading) {
        this.isLoading = loading;
        const loadingOverlay = document.getElementById('loadingOverlay');
        const submitBtns = document.querySelectorAll('.reset-btn');

        submitBtns.forEach(btn => {
            if (loading) {
                btn.classList.add('loading');
                btn.disabled = true;
            } else {
                btn.classList.remove('loading');
                btn.disabled = false;
            }
        });

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

    // Check if user is already logged in
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
                    window.location.href = 'dashboard.html';
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

    // Cleanup method
    cleanup() {
        this.stopTimer();
    }
}

// Initialize the forgot password manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const forgotPasswordManager = new ForgotPasswordManager();
    
    // Check if user is already authenticated
    forgotPasswordManager.checkAuthStatus();
    
    // Add some interactive effects
    const recoveryBtns = document.querySelectorAll('.recovery-btn');
    recoveryBtns.forEach(btn => {
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

    // Auto-focus email input on page load
    setTimeout(() => {
        const emailInput = document.getElementById('email');
        if (emailInput) {
            emailInput.focus();
        }
    }, 500);

    // Handle page visibility change to pause/resume timer
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            // Page is hidden, pause timer if running
            if (forgotPasswordManager.timer) {
                forgotPasswordManager.stopTimer();
            }
        } else {
            // Page is visible, resume timer if in verification step
            if (forgotPasswordManager.currentStep === 'phoneVerification' && forgotPasswordManager.timeLeft > 0) {
                forgotPasswordManager.startTimer();
            }
        }
    });

    // Cleanup on page unload
    window.addEventListener('beforeunload', () => {
        forgotPasswordManager.cleanup();
    });

    // Handle browser back button
    window.addEventListener('popstate', (e) => {
        if (forgotPasswordManager.currentStep !== 'email') {
            e.preventDefault();
            forgotPasswordManager.showStep('email');
        }
    });

    // Add smooth transitions for step changes
    const stepContents = document.querySelectorAll('.step-content');
    stepContents.forEach(content => {
        content.addEventListener('transitionend', () => {
            if (content.classList.contains('active')) {
                content.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });
    });

    // Enhanced accessibility
    const inputs = document.querySelectorAll('input');
    inputs.forEach(input => {
        // Add ARIA attributes
        input.setAttribute('aria-describedby', `${input.id}Error`);
        
        // Enhanced validation feedback
        input.addEventListener('invalid', (e) => {
            e.preventDefault();
            const fieldName = input.id;
            forgotPasswordManager.showFieldError(fieldName, input.validationMessage);
        });
    });

    // Add loading states for better UX
    const forms = document.querySelectorAll('form');
    forms.forEach(form => {
        form.addEventListener('submit', () => {
            const submitBtn = form.querySelector('button[type="submit"]');
            if (submitBtn) {
                submitBtn.style.pointerEvents = 'none';
                setTimeout(() => {
                    submitBtn.style.pointerEvents = 'auto';
                }, 3000);
            }
        });
    });
});

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ForgotPasswordManager;
}

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

