class RegistrationManager {
    constructor() {
        this.currentTheme = localStorage.getItem('theme') || 'light';
        this.currentStep = 1;
        this.totalSteps = 3;
        this.formData = {};
        this.apiBaseUrl = 'http://localhost:8000'; // Replace with your API URL
        this.isLoading = false;
        this.validationRules = {
            email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
            username: /^[a-zA-Z0-9_]{3,20}$/,
            password: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/
        };
        
        this.init();
    }

    async init() {
        this.applyTheme();
        this.setupEventListeners();
        this.setupFormValidation();
        this.checkExistingRegistration();
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

        // Step navigation
        const nextStep1 = document.getElementById('nextStep1');
        const nextStep2 = document.getElementById('nextStep2');
        const backStep2 = document.getElementById('backStep2');
        const backStep3 = document.getElementById('backStep3');

        if (nextStep1) nextStep1.addEventListener('click', () => this.nextStep(1));
        if (nextStep2) nextStep2.addEventListener('click', () => this.nextStep(2));
        if (backStep2) backStep2.addEventListener('click', () => this.previousStep(2));
        if (backStep3) backStep3.addEventListener('click', () => this.previousStep(3));

        // Form submission
        const step3Form = document.getElementById('step3Form');
        if (step3Form) {
            step3Form.addEventListener('submit', this.handleRegistration.bind(this));
        }

        // Social registration buttons
        const googleRegister = document.getElementById('googleRegister');
        const githubRegister = document.getElementById('githubRegister');

        if (googleRegister) {
            googleRegister.addEventListener('click', this.handleGoogleRegistration.bind(this));
        }

        if (githubRegister) {
            githubRegister.addEventListener('click', this.handleGithubRegistration.bind(this));
        }

        // Notification close
        const notificationClose = document.getElementById('notificationClose');
        if (notificationClose) {
            notificationClose.addEventListener('click', this.hideNotification.bind(this));
        }

        // Input focus effects
        const inputs = document.querySelectorAll('input, select');
        inputs.forEach(input => {
            input.addEventListener('focus', this.handleInputFocus.bind(this));
            input.addEventListener('blur', this.handleInputBlur.bind(this));
            input.addEventListener('input', this.handleInputChange.bind(this));
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', this.handleKeyboardShortcuts.bind(this));

        // Modal events
        this.setupModalEvents();
    }

    setupFormValidation() {
        // Real-time validation for step 1
        const emailInput = document.getElementById('email');
        const passwordInput = document.getElementById('password');
        const confirmPasswordInput = document.getElementById('confirmPassword');
        const firstNameInput = document.getElementById('firstName');
        const lastNameInput = document.getElementById('lastName');

        if (emailInput) {
            emailInput.addEventListener('blur', () => this.validateEmail(emailInput.value));
            emailInput.addEventListener('input', this.debounce(() => this.checkEmailAvailability(emailInput.value), 500));
        }

        if (passwordInput) {
            passwordInput.addEventListener('input', () => {
                this.validatePassword(passwordInput.value);
                this.updatePasswordStrength(passwordInput.value);
                if (confirmPasswordInput.value) {
                    this.validateConfirmPassword(passwordInput.value, confirmPasswordInput.value);
                }
            });
        }

        if (confirmPasswordInput) {
            confirmPasswordInput.addEventListener('input', () => {
                this.validateConfirmPassword(passwordInput.value, confirmPasswordInput.value);
            });
        }

        if (firstNameInput) {
            firstNameInput.addEventListener('blur', () => this.validateName(firstNameInput.value, 'firstName'));
        }

        if (lastNameInput) {
            lastNameInput.addEventListener('blur', () => this.validateName(lastNameInput.value, 'lastName'));
        }

        // Step 2 validation
        const usernameInput = document.getElementById('username');
        if (usernameInput) {
            usernameInput.addEventListener('blur', () => this.validateUsername(usernameInput.value));
            usernameInput.addEventListener('input', this.debounce(() => this.checkUsernameAvailability(usernameInput.value), 500));
        }
    }

    setupModalEvents() {
        const verificationModal = document.getElementById('verificationModal');
        const resendEmail = document.getElementById('resendEmail');
        const changeEmail = document.getElementById('changeEmail');

        if (resendEmail) {
            resendEmail.addEventListener('click', this.resendVerificationEmail.bind(this));
        }

        if (changeEmail) {
            changeEmail.addEventListener('click', this.changeEmail.bind(this));
        }

        // Close modal on overlay click
        if (verificationModal) {
            verificationModal.addEventListener('click', (e) => {
                if (e.target === verificationModal) {
                    this.hideVerificationModal();
                }
            });
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

    nextStep(currentStep) {
        if (this.validateCurrentStep(currentStep)) {
            this.saveStepData(currentStep);
            this.currentStep = currentStep + 1;
            this.updateStepDisplay();
            this.updateStepsIndicator();
        }
    }

    previousStep(currentStep) {
        this.currentStep = currentStep - 1;
        this.updateStepDisplay();
        this.updateStepsIndicator();
    }

    updateStepDisplay() {
        // Hide all step contents
        document.querySelectorAll('.step-content').forEach(step => {
            step.classList.remove('active');
        });

        // Show current step
        const currentStepElement = document.getElementById(`step${this.currentStep}`);
        if (currentStepElement) {
            currentStepElement.classList.add('active');
        }
    }

    updateStepsIndicator() {
        document.querySelectorAll('.step').forEach((step, index) => {
            const stepNumber = index + 1;
            step.classList.remove('active', 'completed');
            
            if (stepNumber < this.currentStep) {
                step.classList.add('completed');
            } else if (stepNumber === this.currentStep) {
                step.classList.add('active');
            }
        });
    }

    validateCurrentStep(step) {
        switch (step) {
            case 1:
                return this.validateStep1();
            case 2:
                return this.validateStep2();
            case 3:
                return this.validateStep3();
            default:
                return false;
        }
    }

    validateStep1() {
        const firstName = document.getElementById('firstName').value;
        const lastName = document.getElementById('lastName').value;
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const confirmPassword = document.getElementById('confirmPassword').value;

        let isValid = true;

        if (!this.validateName(firstName, 'firstName')) isValid = false;
        if (!this.validateName(lastName, 'lastName')) isValid = false;
        if (!this.validateEmail(email)) isValid = false;
        if (!this.validatePassword(password)) isValid = false;
        if (!this.validateConfirmPassword(password, confirmPassword)) isValid = false;

        return isValid;
    }

    validateStep2() {
        const username = document.getElementById('username').value;
        const college = document.getElementById('college').value;
        const year = document.getElementById('year').value;
        const department = document.getElementById('department').value;
        const experience = document.querySelector('input[name="programmingExperience"]:checked');

        let isValid = true;

        if (!this.validateUsername(username)) isValid = false;
        if (!college.trim()) {
            this.showFieldError('college', 'College name is required');
            isValid = false;
        }
        if (!year) {
            this.showFieldError('year', 'Academic year is required');
            isValid = false;
        }
        if (!department) {
            this.showFieldError('department', 'Department is required');
            isValid = false;
        }
        if (!experience) {
            this.showNotification('Please select your programming experience level', 'warning');
            isValid = false;
        }

        return isValid;
    }

    validateStep3() {
        const agreeTerms = document.getElementById('agreeTerms').checked;
        const agreeAge = document.getElementById('agreeAge').checked;

        if (!agreeTerms) {
            this.showNotification('You must agree to the Terms of Service and Privacy Policy', 'error');
            return false;
        }

        if (!agreeAge) {
            this.showNotification('You must confirm that you are at least 13 years old', 'error');
            return false;
        }

        return true;
    }

    saveStepData(step) {
        switch (step) {
            case 1:
                this.formData.firstName = document.getElementById('firstName').value;
                this.formData.lastName = document.getElementById('lastName').value;
                this.formData.email = document.getElementById('email').value;
                this.formData.password = document.getElementById('password').value;
                break;
            case 2:
                this.formData.username = document.getElementById('username').value;
                this.formData.college = document.getElementById('college').value;
                this.formData.year = document.getElementById('year').value;
                this.formData.department = document.getElementById('department').value;
                this.formData.programmingExperience = document.querySelector('input[name="programmingExperience"]:checked')?.value;
                break;
            case 3:
                this.formData.agreeNewsletter = document.getElementById('agreeNewsletter').checked;
                break;
        }

        // Save to localStorage for recovery
        localStorage.setItem('registrationData', JSON.stringify(this.formData));
    }

    async handleRegistration(e) {
        e.preventDefault();
        
        if (this.isLoading) return;

        if (!this.validateStep3()) return;

        this.saveStepData(3);
        this.setLoading(true);

        try {
            const response = await fetch(`${this.apiBaseUrl}/auth/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(this.formData)
            });

            const data = await response.json();

            if (response.ok) {
                // Clear saved registration data
                localStorage.removeItem('registrationData');
                
                // Show verification modal
                this.showVerificationModal(this.formData.email);
                
                this.showNotification('Registration successful! Please check your email for verification.', 'success');
                
            } else {
                throw new Error(data.message || 'Registration failed');
            }

        } catch (error) {
            console.error('Registration error:', error);
            this.showNotification(error.message || 'Registration failed. Please try again.', 'error');
        } finally {
            this.setLoading(false);
        }
    }

    async handleGoogleRegistration() {
        if (this.isLoading) return;

        this.setLoading(true);
        this.showNotification('Redirecting to Google...', 'info');

        try {
            // In a real implementation, you would redirect to Google OAuth
            window.location.href = `${this.apiBaseUrl}/auth/google/register`;
        } catch (error) {
            console.error('Google registration error:', error);
            this.showNotification('Google registration failed. Please try again.', 'error');
            this.setLoading(false);
        }
    }

    async handleGithubRegistration() {
        if (this.isLoading) return;

        this.setLoading(true);
        this.showNotification('Redirecting to GitHub...', 'info');

        try {
            // In a real implementation, you would redirect to GitHub OAuth
            window.location.href = `${this.apiBaseUrl}/auth/github/register`;
        } catch (error) {
            console.error('GitHub registration error:', error);
            this.showNotification('GitHub registration failed. Please try again.', 'error');
            this.setLoading(false);
        }
    }

    // Validation methods
    validateName(name, fieldId) {
        const isValid = name && name.trim().length >= 2 && /^[a-zA-Z\s]+$/.test(name.trim());
        
        if (!isValid) {
            this.showFieldError(fieldId, 'Name must be at least 2 characters and contain only letters');
        } else {
            this.hideFieldError(fieldId);
        }
        
        return isValid;
    }

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

    validatePassword(password) {
        const minLength = password.length >= 8;
        const hasLower = /[a-z]/.test(password);
        const hasUpper = /[A-Z]/.test(password);
        const hasNumber = /\d/.test(password);
        const hasSpecial = /[@$!%*?&]/.test(password);
        
        const isValid = minLength && hasLower && hasUpper && hasNumber && hasSpecial;
        
        if (!isValid && password) {
            this.showFieldError('password', 'Password must be at least 8 characters with uppercase, lowercase, number, and special character');
        } else if (isValid) {
            this.hideFieldError('password');
        }
        
        return isValid;
    }

    validateConfirmPassword(password, confirmPassword) {
        const isValid = password === confirmPassword && password.length > 0;
        
        if (!isValid && confirmPassword) {
            this.showFieldError('confirmPassword', 'Passwords do not match');
            this.setValidationIcon('confirmPasswordValidation', false);
        } else if (isValid) {
            this.hideFieldError('confirmPassword');
            this.setValidationIcon('confirmPasswordValidation', true);
        }
        
        return isValid;
    }

    validateUsername(username) {
        const isValid = this.validationRules.username.test(username);
        
        if (!isValid && username) {
            this.showFieldError('username', 'Username must be 3-20 characters, letters, numbers, and underscores only');
            this.setValidationIcon('usernameValidation', false);
        } else if (isValid) {
            this.hideFieldError('username');
            this.setValidationIcon('usernameValidation', true);
        }
        
        return isValid;
    }

    updatePasswordStrength(password) {
        const strengthElement = document.querySelector('.strength-fill');
        const strengthText = document.querySelector('.strength-text');
        
        if (!strengthElement || !strengthText) return;

        let strength = 0;
        let strengthLabel = 'Very Weak';
        
        if (password.length >= 8) strength++;
        if (/[a-z]/.test(password)) strength++;
        if (/[A-Z]/.test(password)) strength++;
        if (/\d/.test(password)) strength++;
        if (/[@$!%*?&]/.test(password)) strength++;

        strengthElement.className = 'strength-fill';
        
        switch (strength) {
            case 0:
            case 1:
                strengthElement.classList.add('weak');
                strengthLabel = 'Weak';
                break;
            case 2:
                strengthElement.classList.add('fair');
                strengthLabel = 'Fair';
                break;
            case 3:
            case 4:
                strengthElement.classList.add('good');
                strengthLabel = 'Good';
                break;
            case 5:
                strengthElement.classList.add('strong');
                strengthLabel = 'Strong';
                break;
        }
        
        strengthText.textContent = `Password strength: ${strengthLabel}`;
    }

    async checkEmailAvailability(email) {
        if (!this.validateEmail(email)) return;

        try {
            const response = await fetch(`${this.apiBaseUrl}/auth/check-email`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email })
            });

            const data = await response.json();

            if (data.exists) {
                this.showFieldError('email', 'This email is already registered');
                this.setValidationIcon('emailValidation', false);
            } else {
                this.hideFieldError('email');
                this.setValidationIcon('emailValidation', true);
            }

        } catch (error) {
            console.error('Email check error:', error);
        }
    }

    async checkUsernameAvailability(username) {
        if (!this.validateUsername(username)) return;

        try {
            const response = await fetch(`${this.apiBaseUrl}/auth/check-username`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username })
            });

            const data = await response.json();

            if (data.exists) {
                this.showFieldError('username', 'This username is already taken');
                this.setValidationIcon('usernameValidation', false);
            } else {
                this.hideFieldError('username');
                this.setValidationIcon('usernameValidation', true);
            }

        } catch (error) {
            console.error('Username check error:', error);
        }
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
        // Enter key to proceed to next step
        if (e.key === 'Enter' && !e.shiftKey && !e.ctrlKey) {
            const activeElement = document.activeElement;
            if (activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'SELECT')) {
                e.preventDefault();
                
                if (this.currentStep < this.totalSteps) {
                    this.nextStep(this.currentStep);
                } else {
                    const form = activeElement.closest('form');
                    if (form) {
                        form.dispatchEvent(new Event('submit'));
                    }
                }
            }
        }

        // Escape key to close notifications
        if (e.key === 'Escape') {
            this.hideNotification();
            this.hideVerificationModal();
        }
    }

    setLoading(loading) {
        this.isLoading = loading;
        const registerBtn = document.getElementById('registerBtn');
        const loadingOverlay = document.getElementById('loadingOverlay');

        if (registerBtn) {
            if (loading) {
                registerBtn.classList.add('loading');
                registerBtn.disabled = true;
            } else {
                registerBtn.classList.remove('loading');
                registerBtn.disabled = false;
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

    showVerificationModal(email) {
        const modal = document.getElementById('verificationModal');
        const emailElement = document.getElementById('verificationEmail');
        
        if (modal && emailElement) {
            emailElement.textContent = email;
            modal.classList.add('show');
        }
    }

    hideVerificationModal() {
        const modal = document.getElementById('verificationModal');
        if (modal) {
            modal.classList.remove('show');
        }
    }

    async resendVerificationEmail() {
        try {
            const response = await fetch(`${this.apiBaseUrl}/auth/resend-verification`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email: this.formData.email })
            });

            if (response.ok) {
                this.showNotification('Verification email sent successfully!', 'success');
            } else {
                throw new Error('Failed to resend verification email');
            }

        } catch (error) {
            console.error('Resend email error:', error);
            this.showNotification('Failed to resend verification email. Please try again.', 'error');
        }
    }

    changeEmail() {
        this.hideVerificationModal();
        this.currentStep = 1;
        this.updateStepDisplay();
        this.updateStepsIndicator();
        
        // Focus email input
        setTimeout(() => {
            const emailInput = document.getElementById('email');
            if (emailInput) {
                emailInput.focus();
                emailInput.select();
            }
        }, 100);
    }

    checkExistingRegistration() {
        const savedData = localStorage.getItem('registrationData');
        if (savedData) {
            try {
                this.formData = JSON.parse(savedData);
                this.restoreFormData();
                this.showNotification('Previous registration data restored', 'info');
            } catch (error) {
                console.error('Error restoring registration data:', error);
                localStorage.removeItem('registrationData');
            }
        }
    }

    restoreFormData() {
        // Restore step 1 data
        if (this.formData.firstName) document.getElementById('firstName').value = this.formData.firstName;
        if (this.formData.lastName) document.getElementById('lastName').value = this.formData.lastName;
        if (this.formData.email) document.getElementById('email').value = this.formData.email;

        // Restore step 2 data
        if (this.formData.username) document.getElementById('username').value = this.formData.username;
        if (this.formData.college) document.getElementById('college').value = this.formData.college;
        if (this.formData.year) document.getElementById('year').value = this.formData.year;
        if (this.formData.department) document.getElementById('department').value = this.formData.department;
        if (this.formData.programmingExperience) {
            const experienceInput = document.querySelector(`input[name="programmingExperience"][value="${this.formData.programmingExperience}"]`);
            if (experienceInput) experienceInput.checked = true;
        }

        // Restore step 3 data
        if (this.formData.agreeNewsletter) document.getElementById('agreeNewsletter').checked = this.formData.agreeNewsletter;
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
}

// Initialize the registration manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const registrationManager = new RegistrationManager();
    
    // Check if user is already authenticated
    registrationManager.checkAuthStatus();
    
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

    // Auto-save form data on input
    const inputs = document.querySelectorAll('input, select');
    inputs.forEach(input => {
        input.addEventListener('input', () => {
            // Save current form state
            const currentData = {};
            
            // Get all form values
            const formInputs = document.querySelectorAll('input, select');
            formInputs.forEach(formInput => {
                if (formInput.type === 'checkbox' || formInput.type === 'radio') {
                    if (formInput.checked) {
                        currentData[formInput.name || formInput.id] = formInput.value;
                    }
                } else {
                    currentData[formInput.name || formInput.id] = formInput.value;
                }
            });
            
            // Save to localStorage
            localStorage.setItem('registrationData', JSON.stringify(currentData));
        });
    });

    // Add smooth scrolling for form steps
    const stepContents = document.querySelectorAll('.step-content');
    stepContents.forEach(content => {
        content.addEventListener('transitionend', () => {
            if (content.classList.contains('active')) {
                content.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });
    });
});

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = RegistrationManager;
}
