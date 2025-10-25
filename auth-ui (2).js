/**
 * HPGS Authentication UI Component
 * 
 * Simple authentication interface for the Holiday Park General Safety system
 * Integrates with the main integration.js file
 */

/**
 * Create enhanced authentication UI
 */
function createAuthenticationUI() {
    const authContainer = document.getElementById('authContainer');
    if (!authContainer) return;

    authContainer.innerHTML = `
        <div class="auth-box">
            <div class="auth-header">
                <h2>Holiday Park General Safety System</h2>
                <p>Secure Access Portal</p>
            </div>
            
            <div class="auth-tabs">
                <button class="auth-tab active" onclick="showAuthTab('signin')">Sign In</button>
                <button class="auth-tab" onclick="showAuthTab('signup')">Create Account</button>
            </div>
            
            <!-- Sign In Form -->
            <div id="signin-form" class="auth-form active">
                <form onsubmit="handleSignIn(event)">
                    <div class="form-group">
                        <label for="signin-email">Email Address</label>
                        <input type="email" id="signin-email" required placeholder="your.email@company.com">
                    </div>
                    
                    <div class="form-group">
                        <label for="signin-password">Password</label>
                        <input type="password" id="signin-password" required placeholder="Your password">
                    </div>
                    
                    <div class="form-group">
                        <label for="signin-access-code">Holiday Park Access Code</label>
                        <input type="text" id="signin-access-code" required placeholder="ABC123" maxlength="6" style="text-transform: uppercase;">
                        <small style="color: #888; font-size: 0.85rem;">Enter your 6-character access code (e.g., ABC123)</small>
                    </div>
                    
                    <div class="form-group">
                        <label>
                            <input type="checkbox" id="remember-me"> Remember me
                        </label>
                    </div>
                    
                    <button type="submit" class="auth-btn">Sign In</button>
                </form>
                
                <div class="auth-links">
                    <a href="#" onclick="showForgotPassword()">Forgot your password?</a>
                </div>
            </div>
            
            <!-- Sign Up Form -->
            <div id="signup-form" class="auth-form">
                <form onsubmit="handleSignUp(event)">
                    <div class="form-group">
                        <label for="signup-name">Full Name</label>
                        <input type="text" id="signup-name" required placeholder="John Smith">
                    </div>
                    
                    <div class="form-group">
                        <label for="signup-email">Email Address</label>
                        <input type="email" id="signup-email" required placeholder="john.smith@company.com">
                    </div>
                    
                    <div class="form-group">
                        <label for="signup-password">Password</label>
                        <input type="password" id="signup-password" required placeholder="Choose a strong password" minlength="6">
                    </div>
                    
                    <div class="form-group">
                        <label for="signup-confirm-password">Confirm Password</label>
                        <input type="password" id="signup-confirm-password" required placeholder="Confirm your password">
                    </div>
                    
                    <div class="form-group">
                        <label for="signup-access-code">Holiday Park Access Code</label>
                        <input type="text" id="signup-access-code" required placeholder="ABC123" maxlength="6" style="text-transform: uppercase;">
                        <small style="color: #888; font-size: 0.85rem;">Enter your 6-character access code provided by your holiday park</small>
                    </div>
                    
                    <div class="form-group">
                        <label for="signup-role">Role</label>
                        <select id="signup-role" required>
                            <option value="">Select your role...</option>
                            <option value="inspector">Safety Inspector</option>
                            <option value="manager">Site Manager</option>
                            <option value="viewer">Read-Only Access</option>
                        </select>
                    </div>
                    
                    <div class="form-group">
                        <label>
                            <input type="checkbox" id="terms-accept" required> 
                            I agree to the <a href="#" onclick="showTerms()">Terms of Service</a> and <a href="#" onclick="showPrivacy()">Privacy Policy</a>
                        </label>
                    </div>
                    
                    <button type="submit" class="auth-btn">Create Account</button>
                </form>
            </div>
            
            <!-- Demo Access -->
            <div class="demo-access">
                <hr style="margin: 20px 0; border-color: #404040;">
                <p style="text-align: center; color: #888; margin-bottom: 15px;">For demonstration purposes:</p>
                <button class="demo-btn" onclick="startDemoMode()">Continue in Demo Mode</button>
            </div>
            
            <!-- Loading State -->
            <div id="auth-loading" class="auth-loading" style="display: none;">
                <div class="spinner"></div>
                <p>Authenticating...</p>
            </div>
            
            <!-- Error Display -->
            <div id="auth-error" class="auth-error" style="display: none;"></div>
        </div>
    `;
    
    // Add styles
    addAuthenticationStyles();
}

/**
 * Add authentication-specific styles
 */
function addAuthenticationStyles() {
    const style = document.createElement('style');
    style.textContent = `
        .auth-box {
            background: var(--content-background);
            padding: 40px;
            border-radius: 15px;
            box-shadow: 0 8px 40px rgba(0,0,0,0.3);
            border: 1px solid #404040;
            text-align: left;
            max-width: 450px;
            width: 90%;
            max-height: 90vh;
            overflow-y: auto;
        }
        
        .auth-header {
            text-align: center;
            margin-bottom: 30px;
        }
        
        .auth-header h2 {
            color: var(--white);
            margin-bottom: 10px;
            font-size: 1.8rem;
        }
        
        .auth-header p {
            color: var(--light-orange);
            font-size: 1rem;
            opacity: 0.9;
        }
        
        .auth-tabs {
            display: flex;
            margin-bottom: 25px;
            border-bottom: 1px solid #404040;
        }
        
        .auth-tab {
            flex: 1;
            background: none;
            border: none;
            padding: 12px;
            color: #888;
            cursor: pointer;
            font-size: 1rem;
            transition: all 0.3s ease;
            border-bottom: 2px solid transparent;
        }
        
        .auth-tab.active {
            color: var(--white);
            border-bottom-color: var(--primary-orange);
        }
        
        .auth-tab:hover {
            color: var(--light-orange);
        }
        
        .auth-form {
            display: none;
        }
        
        .auth-form.active {
            display: block;
        }
        
        .form-group {
            margin-bottom: 20px;
        }
        
        .form-group label {
            display: block;
            color: #E8E8E8;
            margin-bottom: 5px;
            font-weight: 500;
        }
        
        .form-group input,
        .form-group select {
            width: 100%;
            padding: 12px;
            border: 2px solid #404040;
            border-radius: 8px;
            background: var(--darker-bg);
            color: #E8E8E8;
            font-size: 1rem;
            transition: border-color 0.3s ease;
        }
        
        .form-group input:focus,
        .form-group select:focus {
            border-color: var(--primary-orange);
            outline: none;
        }
        
        .form-group input[type="checkbox"] {
            width: auto;
            margin-right: 8px;
            transform: scale(1.2);
            accent-color: var(--primary-orange);
        }
        
        .auth-btn {
            width: 100%;
            background: linear-gradient(135deg, var(--primary-orange) 0%, var(--dark-orange) 100%);
            color: var(--white);
            border: none;
            padding: 15px;
            border-radius: 8px;
            font-size: 1.1rem;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s ease;
            margin-top: 10px;
        }
        
        .auth-btn:hover {
            background: linear-gradient(135deg, var(--light-orange) 0%, var(--primary-orange) 100%);
            transform: translateY(-2px);
            box-shadow: 0 4px 15px rgba(204, 85, 0, 0.3);
        }
        
        .auth-btn:disabled {
            opacity: 0.6;
            cursor: not-allowed;
            transform: none;
        }
        
        .demo-btn {
            width: 100%;
            background: var(--medium-gray);
            color: var(--white);
            border: 1px solid #666;
            padding: 12px;
            border-radius: 8px;
            font-size: 1rem;
            cursor: pointer;
            transition: all 0.3s ease;
        }
        
        .demo-btn:hover {
            background: var(--dark-gray);
            border-color: #888;
        }
        
        .auth-links {
            text-align: center;
            margin-top: 20px;
        }
        
        .auth-links a {
            color: var(--light-orange);
            text-decoration: none;
            font-size: 0.9rem;
        }
        
        .auth-links a:hover {
            text-decoration: underline;
        }
        
        .auth-loading {
            text-align: center;
            padding: 30px;
        }
        
        .spinner {
            width: 40px;
            height: 40px;
            border: 4px solid #404040;
            border-top: 4px solid var(--primary-orange);
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin: 0 auto 15px;
        }
        
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        
        .auth-error {
            background: rgba(220, 53, 69, 0.1);
            border: 1px solid var(--danger);
            color: #ff6b6b;
            padding: 15px;
            border-radius: 8px;
            margin-top: 15px;
            text-align: center;
        }
        
        .auth-success {
            background: rgba(40, 167, 69, 0.1);
            border: 1px solid var(--success);
            color: #51cf66;
            padding: 15px;
            border-radius: 8px;
            margin-top: 15px;
            text-align: center;
        }
    `;
    
    document.head.appendChild(style);
}

/**
 * Show specific authentication tab
 */
function showAuthTab(tabName) {
    // Update tab buttons
    document.querySelectorAll('.auth-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    
    document.querySelector(`[onclick="showAuthTab('${tabName}')"]`).classList.add('active');
    
    // Update form display
    document.querySelectorAll('.auth-form').forEach(form => {
        form.classList.remove('active');
    });
    
    document.getElementById(`${tabName}-form`).classList.add('active');
    
    // Clear any previous errors
    hideAuthError();
}

/**
 * Handle sign in form submission
 */
async function handleSignIn(event) {
    event.preventDefault();
    
    const email = document.getElementById('signin-email').value;
    const password = document.getElementById('signin-password').value;
    const accessCode = document.getElementById('signin-access-code').value;
    
    showAuthLoading();
    
    try {
        await signInWithEmail(email, password, accessCode);
        // Success is handled by the auth state listener
    } catch (error) {
        hideAuthLoading();
        showAuthError(getErrorMessage(error));
    }
}

/**
 * Handle sign up form submission
 */
async function handleSignUp(event) {
    event.preventDefault();
    
    const name = document.getElementById('signup-name').value;
    const email = document.getElementById('signup-email').value;
    const password = document.getElementById('signup-password').value;
    const confirmPassword = document.getElementById('signup-confirm-password').value;
    const accessCode = document.getElementById('signup-access-code').value;
    const role = document.getElementById('signup-role').value;
    
    // Validation
    if (password !== confirmPassword) {
        showAuthError('Passwords do not match');
        return;
    }
    
    if (password.length < 6) {
        showAuthError('Password must be at least 6 characters long');
        return;
    }
    
    if (!accessCode || accessCode.length !== 6) {
        showAuthError('Please enter a valid 6-character access code');
        return;
    }
    
    showAuthLoading();
    
    try {
        const userData = {
            name: name,
            role: role
        };
        
        await createUserAccount(email, password, userData, accessCode);
        
        showAuthSuccess('Account created successfully! Please check your email for verification.');
        
        // Switch to sign in after successful creation
        setTimeout(() => {
            showAuthTab('signin');
            document.getElementById('signin-email').value = email;
        }, 2000);
        
    } catch (error) {
        hideAuthLoading();
        showAuthError(getErrorMessage(error));
    }
}

/**
 * Start demo mode
 */
function startDemoMode() {
    console.log('Starting demo mode...');
    
    // Call the proper demo mode function from integration.js
    if (window.startDemoMode && typeof window.startDemoMode === 'function') {
        window.startDemoMode();
    } else {
        // Fallback if integration.js not loaded yet
        setTimeout(() => {
            if (window.startDemoMode) {
                window.startDemoMode();
            }
        }, 100);
    }
    
    // Hide auth screen
    hideAuthenticationScreen();
}

/**
 * Show authentication loading state
 */
function showAuthLoading() {
    document.getElementById('auth-loading').style.display = 'block';
    document.querySelectorAll('.auth-form').forEach(form => {
        form.style.display = 'none';
    });
}

/**
 * Hide authentication loading state
 */
function hideAuthLoading() {
    document.getElementById('auth-loading').style.display = 'none';
    document.querySelector('.auth-form.active').style.display = 'block';
}

/**
 * Show authentication error
 */
function showAuthError(message) {
    const errorDiv = document.getElementById('auth-error');
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
        hideAuthError();
    }, 5000);
}

/**
 * Hide authentication error
 */
function hideAuthError() {
    document.getElementById('auth-error').style.display = 'none';
}

/**
 * Show authentication success message
 */
function showAuthSuccess(message) {
    const errorDiv = document.getElementById('auth-error');
    errorDiv.className = 'auth-success';
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
    
    hideAuthLoading();
}

/**
 * Get user-friendly error message
 */
function getErrorMessage(error) {
    const errorMessages = {
        'auth/user-not-found': 'No account found with this email address.',
        'auth/wrong-password': 'Incorrect password. Please try again.',
        'auth/email-already-in-use': 'An account with this email already exists.',
        'auth/weak-password': 'Password should be at least 6 characters long.',
        'auth/invalid-email': 'Please enter a valid email address.',
        'auth/network-request-failed': 'Network error. Please check your connection.',
        'auth/too-many-requests': 'Too many failed attempts. Please try again later.'
    };
    
    return errorMessages[error.code] || error.message || 'An unexpected error occurred.';
}

/**
 * Show forgot password dialog
 */
function showForgotPassword() {
    const email = prompt('Enter your email address to reset your password:');
    if (email) {
        // In a real implementation, you would call Firebase's password reset
        showNotification('Password reset email sent (demo mode)', 'info');
    }
}

/**
 * Show terms of service
 */
function showTerms() {
    alert('Terms of Service would be displayed here in a real implementation.');
}

/**
 * Show privacy policy
 */
function showPrivacy() {
    alert('Privacy Policy would be displayed here in a real implementation.');
}

// Initialize authentication UI when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    // Only create auth UI if the auth container exists
    if (document.getElementById('authContainer')) {
        createAuthenticationUI();
    }
});

// Export functions for global access
window.showAuthTab = showAuthTab;
window.handleSignIn = handleSignIn;
window.handleSignUp = handleSignUp;
window.startDemoMode = startDemoMode;
window.showForgotPassword = showForgotPassword;
window.showTerms = showTerms;
window.showPrivacy = showPrivacy;
