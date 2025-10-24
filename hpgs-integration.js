/**
 * Holiday Park General Safety (HPGS) System - Firebase Integration
 * 
 * Comprehensive integration file providing:
 * - Firebase authentication with site-specific access
 * - Real-time data synchronization
 * - Multi-site security and data isolation
 * - Enhanced checkbox functionality
 * - Progress tracking and reporting
 * - User management and permissions
 * 
 * @version 2.0.0
 * @author HPGS Development Team
 */

// ============================================================================
// FIREBASE CONFIGURATION
// ============================================================================

/**
 * Firebase Configuration Object
 * Replace with your actual Firebase project configuration
 */
const firebaseConfig = {
    apiKey: "your-api-key-here",
    authDomain: "your-project.firebaseapp.com",
    projectId: "your-project-id",
    storageBucket: "your-project.appspot.com",
    messagingSenderId: "123456789",
    appId: "your-app-id"
};

// Initialize Firebase
let app, db, auth;
let isFirebaseInitialized = false;

/**
 * Initialize Firebase services
 */
function initializeFirebase() {
    try {
        if (!isFirebaseInitialized) {
            app = firebase.initializeApp(firebaseConfig);
            db = firebase.firestore();
            auth = firebase.auth();
            isFirebaseInitialized = true;
            console.log('Firebase initialized successfully');
            
            // Set up authentication state listener
            setupAuthStateListener();
        }
    } catch (error) {
        console.error('Firebase initialization error:', error);
        // Fallback to demo mode if Firebase fails
        console.log('Running in demo mode - Firebase disabled');
    }
}

// ============================================================================
// SITE CONFIGURATION & SECURITY
// ============================================================================

/**
 * Site configuration with detailed information
 */
const siteConfig = {
    'oban': {
        name: 'Oban Holiday Park',
        location: 'Oban, Scotland',
        code: 'OBP',
        region: 'West Scotland',
        established: '2018',
        capacity: 120,
        contact: {
            phone: '+44 1631 123456',
            email: 'safety@obanhp.co.uk',
            manager: 'Sarah MacLeod'
        }
    },
    'ben-nevis': {
        name: 'Ben Nevis Holiday Resort',
        location: 'Fort William, Scotland',
        code: 'BNR',
        region: 'Highlands',
        established: '2015',
        capacity: 200,
        contact: {
            phone: '+44 1397 654321',
            email: 'safety@bennevishp.co.uk',
            manager: 'James Cameron'
        }
    },
    'loch-katrine': {
        name: 'Loch Katrine Park',
        location: 'Trossachs, Scotland',
        code: 'LKP',
        region: 'Central Scotland',
        established: '2020',
        capacity: 85,
        contact: {
            phone: '+44 1877 987654',
            email: 'safety@lochkatrinehp.co.uk',
            manager: 'Fiona Stewart'
        }
    }
};

/**
 * User roles and permissions
 */
const userRoles = {
    'admin': {
        name: 'System Administrator',
        permissions: ['read', 'write', 'delete', 'manage_users', 'access_all_sites']
    },
    'manager': {
        name: 'Site Manager',
        permissions: ['read', 'write', 'manage_site_users', 'generate_reports']
    },
    'inspector': {
        name: 'Safety Inspector',
        permissions: ['read', 'write', 'complete_inspections']
    },
    'viewer': {
        name: 'Read-Only Access',
        permissions: ['read', 'view_reports']
    }
};

// ============================================================================
// GLOBAL STATE MANAGEMENT
// ============================================================================

let currentUser = null;
let currentSite = null;
let userRole = null;
let completedSections = new Set();
let userCompletionData = {};
let sectionData = {};
let realtimeListeners = [];

// ============================================================================
// AUTHENTICATION MANAGEMENT
// ============================================================================

/**
 * Set up authentication state listener
 */
function setupAuthStateListener() {
    if (!auth) return;
    
    auth.onAuthStateChanged(async (user) => {
        if (user) {
            console.log('User authenticated:', user.email);
            currentUser = user;
            
            // Load user profile and site assignment
            await loadUserProfile(user.uid);
            await initializeUserData();
            
            // Hide authentication screen and show main app
            hideAuthenticationScreen();
        } else {
            console.log('User not authenticated');
            currentUser = null;
            currentSite = null;
            userRole = null;
            showAuthenticationScreen();
        }
    });
}

/**
 * Load user profile from Firestore
 */
async function loadUserProfile(userId) {
    try {
        const userDoc = await db.collection('users').doc(userId).get();
        
        if (userDoc.exists) {
            const userData = userDoc.data();
            currentSite = userData.assignedSite;
            userRole = userData.role || 'inspector';
            
            console.log(`User profile loaded: ${userData.name} - ${siteConfig[currentSite]?.name} - ${userRoles[userRole]?.name}`);
            
            // Update UI with site information
            updateSiteDisplay();
        } else {
            // Create new user profile with default settings
            await createUserProfile(userId);
        }
    } catch (error) {
        console.error('Error loading user profile:', error);
        // Fallback to default site
        currentSite = 'oban';
        userRole = 'inspector';
        updateSiteDisplay();
    }
}

/**
 * Create new user profile
 */
async function createUserProfile(userId) {
    try {
        const newUserData = {
            userId: userId,
            email: currentUser.email,
            name: currentUser.displayName || currentUser.email.split('@')[0],
            assignedSite: 'oban', // Default assignment
            role: 'inspector',
            createdAt: new Date().toISOString(),
            lastLogin: new Date().toISOString(),
            isActive: true
        };
        
        await db.collection('users').doc(userId).set(newUserData);
        
        currentSite = newUserData.assignedSite;
        userRole = newUserData.role;
        
        console.log('New user profile created:', newUserData);
        updateSiteDisplay();
    } catch (error) {
        console.error('Error creating user profile:', error);
    }
}

/**
 * Sign in with email and password
 */
async function signInWithEmail(email, password) {
    try {
        const userCredential = await auth.signInWithEmailAndPassword(email, password);
        console.log('Sign in successful:', userCredential.user.email);
        return userCredential.user;
    } catch (error) {
        console.error('Sign in error:', error);
        throw error;
    }
}

/**
 * Sign out current user
 */
async function signOut() {
    try {
        // Clean up real-time listeners
        cleanupRealtimeListeners();
        
        await auth.signOut();
        console.log('User signed out successfully');
    } catch (error) {
        console.error('Sign out error:', error);
    }
}

/**
 * Create new user account
 */
async function createUserAccount(email, password, userData) {
    try {
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        const user = userCredential.user;
        
        // Create user profile in Firestore
        await db.collection('users').doc(user.uid).set({
            ...userData,
            userId: user.uid,
            email: email,
            createdAt: new Date().toISOString(),
            isActive: true
        });
        
        console.log('User account created:', email);
        return user;
    } catch (error) {
        console.error('Account creation error:', error);
        throw error;
    }
}

// ============================================================================
// DATA MANAGEMENT
// ============================================================================

/**
 * Enhanced Data Manager with comprehensive CRUD operations
 */
const dataManager = {
    
    /**
     * Save user progress with enhanced data structure
     */
    async saveUserProgress(userId, siteId, sectionId, progressData) {
        try {
            const docId = `${siteId}_${userId}_${sectionId}`;
            const timestamp = new Date().toISOString();
            
            const dataToSave = {
                ...progressData,
                siteId: siteId,
                userId: userId,
                sectionId: sectionId,
                lastUpdated: timestamp,
                version: '2.0'
            };
            
            await db.collection('hpgs_progress').doc(docId).set(dataToSave, { merge: true });
            
            // Also update user's last activity
            await this.updateUserActivity(userId, sectionId);
            
            console.log(`Progress saved: ${sectionId} for ${siteConfig[siteId]?.name}`);
        } catch (error) {
            console.error('Error saving progress:', error);
            throw error;
        }
    },
    
    /**
     * Load user progress with site filtering
     */
    async loadUserProgress(userId, siteId) {
        try {
            const snapshot = await db.collection('hpgs_progress')
                .where('userId', '==', userId)
                .where('siteId', '==', siteId)
                .get();
            
            const progress = {};
            snapshot.forEach(doc => {
                const data = doc.data();
                progress[data.sectionId] = data;
            });
            
            console.log(`Loaded ${Object.keys(progress).length} progress records for ${siteConfig[siteId]?.name}`);
            return progress;
        } catch (error) {
            console.error('Error loading progress:', error);
            return {};
        }
    },
    
    /**
     * Save user acknowledgment
     */
    async saveUserAcknowledgment(userId, siteId, sectionId, userName, timestamp) {
        try {
            const docId = `${siteId}_${userId}_${sectionId}`;
            
            const acknowledgmentData = {
                siteId: siteId,
                userId: userId,
                sectionId: sectionId,
                userName: userName,
                userEmail: currentUser?.email,
                timestamp: timestamp,
                acknowledged: true,
                siteName: siteConfig[siteId]?.name
            };
            
            await db.collection('hpgs_acknowledgments').doc(docId).set(acknowledgmentData);
            
            console.log(`Acknowledgment saved: ${sectionId} by ${userName}`);
        } catch (error) {
            console.error('Error saving acknowledgment:', error);
            throw error;
        }
    },
    
    /**
     * Get all site progress (for managers and admins)
     */
    async getAllSiteProgress(siteId) {
        try {
            // Check permissions
            if (!this.hasPermission('read')) {
                throw new Error('Insufficient permissions');
            }
            
            const snapshot = await db.collection('hpgs_progress')
                .where('siteId', '==', siteId)
                .get();
            
            const siteProgress = {};
            snapshot.forEach(doc => {
                const data = doc.data();
                if (!siteProgress[data.sectionId]) {
                    siteProgress[data.sectionId] = [];
                }
                siteProgress[data.sectionId].push(data);
            });
            
            return siteProgress;
        } catch (error) {
            console.error('Error loading site progress:', error);
            return {};
        }
    },
    
    /**
     * Generate comprehensive site report
     */
    async generateSiteReport(siteId, startDate, endDate) {
        try {
            if (!this.hasPermission('generate_reports')) {
                throw new Error('Insufficient permissions for report generation');
            }
            
            const [progressData, acknowledgments, incidents] = await Promise.all([
                this.getAllSiteProgress(siteId),
                this.getSiteAcknowledments(siteId, startDate, endDate),
                this.getSiteIncidents(siteId, startDate, endDate)
            ]);
            
            return {
                siteInfo: siteConfig[siteId],
                reportPeriod: { startDate, endDate },
                generatedAt: new Date().toISOString(),
                generatedBy: currentUser?.email,
                progressData,
                acknowledgments,
                incidents,
                summary: this.calculateReportSummary(progressData, acknowledgments)
            };
        } catch (error) {
            console.error('Error generating site report:', error);
            throw error;
        }
    },
    
    /**
     * Update user activity tracking
     */
    async updateUserActivity(userId, lastAction) {
        try {
            await db.collection('users').doc(userId).update({
                lastLogin: new Date().toISOString(),
                lastAction: lastAction,
                activityCount: firebase.firestore.FieldValue.increment(1)
            });
        } catch (error) {
            console.error('Error updating user activity:', error);
        }
    },
    
    /**
     * Check user permissions
     */
    hasPermission(permission) {
        if (!userRole || !userRoles[userRole]) return false;
        return userRoles[userRole].permissions.includes(permission);
    },
    
    /**
     * Get site acknowledgments for a date range
     */
    async getSiteAcknowledments(siteId, startDate, endDate) {
        try {
            let query = db.collection('hpgs_acknowledgments')
                .where('siteId', '==', siteId);
            
            if (startDate) {
                query = query.where('timestamp', '>=', startDate);
            }
            if (endDate) {
                query = query.where('timestamp', '<=', endDate);
            }
            
            const snapshot = await query.get();
            const acknowledgments = [];
            
            snapshot.forEach(doc => {
                acknowledgments.push(doc.data());
            });
            
            return acknowledgments;
        } catch (error) {
            console.error('Error loading acknowledgments:', error);
            return [];
        }
    },
    
    /**
     * Record safety incident
     */
    async recordIncident(incidentData) {
        try {
            const incident = {
                ...incidentData,
                siteId: currentSite,
                reportedBy: currentUser?.email,
                reportedAt: new Date().toISOString(),
                status: 'open',
                id: db.collection('incidents').doc().id
            };
            
            await db.collection('incidents').add(incident);
            console.log('Incident recorded:', incident.id);
            return incident.id;
        } catch (error) {
            console.error('Error recording incident:', error);
            throw error;
        }
    },
    
    /**
     * Get site incidents
     */
    async getSiteIncidents(siteId, startDate, endDate) {
        try {
            let query = db.collection('incidents')
                .where('siteId', '==', siteId);
            
            if (startDate) {
                query = query.where('reportedAt', '>=', startDate);
            }
            if (endDate) {
                query = query.where('reportedAt', '<=', endDate);
            }
            
            const snapshot = await query.orderBy('reportedAt', 'desc').get();
            const incidents = [];
            
            snapshot.forEach(doc => {
                incidents.push({ id: doc.id, ...doc.data() });
            });
            
            return incidents;
        } catch (error) {
            console.error('Error loading incidents:', error);
            return [];
        }
    },
    
    /**
     * Calculate report summary statistics
     */
    calculateReportSummary(progressData, acknowledgments) {
        const totalSections = 21;
        const completedSections = Object.keys(progressData).filter(
            sectionId => progressData[sectionId].some(record => record.completed)
        ).length;
        
        const completionRate = Math.round((completedSections / totalSections) * 100);
        
        return {
            totalSections,
            completedSections,
            completionRate,
            totalAcknowledments: acknowledgments.length,
            lastUpdate: acknowledgments.length > 0 ? 
                Math.max(...acknowledgments.map(a => new Date(a.timestamp).getTime())) : null
        };
    }
};

// ============================================================================
// REAL-TIME DATA SYNCHRONIZATION
// ============================================================================

/**
 * Set up real-time listeners for live updates
 */
function setupRealtimeListeners() {
    if (!db || !currentUser || !currentSite) return;
    
    // Clean up existing listeners
    cleanupRealtimeListeners();
    
    // Listen to progress updates for current site
    const progressListener = db.collection('hpgs_progress')
        .where('siteId', '==', currentSite)
        .onSnapshot((snapshot) => {
            snapshot.docChanges().forEach((change) => {
                const data = change.doc.data();
                
                if (change.type === 'added' || change.type === 'modified') {
                    handleProgressUpdate(data);
                }
            });
        }, (error) => {
            console.error('Progress listener error:', error);
        });
    
    // Listen to acknowledgment updates
    const acknowledgmentListener = db.collection('hpgs_acknowledgments')
        .where('siteId', '==', currentSite)
        .onSnapshot((snapshot) => {
            snapshot.docChanges().forEach((change) => {
                const data = change.doc.data();
                
                if (change.type === 'added' || change.type === 'modified') {
                    handleAcknowledmentUpdate(data);
                }
            });
        }, (error) => {
            console.error('Acknowledgment listener error:', error);
        });
    
    realtimeListeners.push(progressListener, acknowledgmentListener);
    console.log('Real-time listeners activated');
}

/**
 * Handle progress updates from other users
 */
function handleProgressUpdate(data) {
    if (data.userId !== currentUser?.uid) {
        console.log(`Progress update from another user: ${data.sectionId}`);
        
        // Update UI to show that another user has made progress
        const statusElement = document.getElementById(`ack-${data.sectionId}`);
        if (statusElement && data.completed) {
            statusElement.style.border = '2px solid #28a745';
            statusElement.title = `Completed by ${data.userName} at ${new Date(data.timestamp).toLocaleString()}`;
        }
    }
}

/**
 * Handle acknowledgment updates
 */
function handleAcknowledmentUpdate(data) {
    if (data.userId !== currentUser?.uid) {
        console.log(`Acknowledgment from another user: ${data.sectionId} by ${data.userName}`);
        
        // Show notification or update UI
        showNotification(`${data.userName} completed ${data.sectionId}`, 'info');
    }
}

/**
 * Clean up real-time listeners
 */
function cleanupRealtimeListeners() {
    realtimeListeners.forEach(listener => {
        if (typeof listener === 'function') {
            listener(); // Unsubscribe
        }
    });
    realtimeListeners = [];
}

// ============================================================================
// ENHANCED UI FUNCTIONALITY
// ============================================================================

/**
 * Enhanced checkbox group management
 */
const enhancedControls = {
    
    /**
     * Select all checkboxes in a group with smart N/A handling
     */
    selectAllInGroup(groupId) {
        const group = document.querySelector(`[data-group="${groupId}"]`);
        if (!group) return;
        
        const checkboxes = group.querySelectorAll('input[type="checkbox"]:not(:disabled)');
        const items = group.querySelectorAll('.checklist-item');
        
        let selectedCount = 0;
        
        checkboxes.forEach(checkbox => {
            checkbox.checked = true;
            selectedCount++;
        });
        
        // Remove N/A state from all items in group
        items.forEach(item => {
            item.classList.remove('na-state');
            const naBtn = item.querySelector('.na-btn');
            if (naBtn && !naBtn.disabled) {
                naBtn.classList.remove('active');
                naBtn.textContent = 'N/A';
            }
        });
        
        console.log(`Selected ${selectedCount} items in group: ${groupId}`);
        showNotification(`Selected all ${selectedCount} items in group`, 'success');
    },
    
    /**
     * Deselect all checkboxes in a group
     */
    deselectAllInGroup(groupId) {
        const group = document.querySelector(`[data-group="${groupId}"]`);
        if (!group) return;
        
        const checkboxes = group.querySelectorAll('input[type="checkbox"]:not(:disabled)');
        const items = group.querySelectorAll('.checklist-item');
        
        let deselectedCount = 0;
        
        checkboxes.forEach(checkbox => {
            checkbox.checked = false;
            deselectedCount++;
        });
        
        // Remove N/A state from all items in group
        items.forEach(item => {
            item.classList.remove('na-state');
            const naBtn = item.querySelector('.na-btn');
            if (naBtn && !naBtn.disabled) {
                naBtn.classList.remove('active');
                naBtn.textContent = 'N/A';
            }
        });
        
        console.log(`Deselected ${deselectedCount} items in group: ${groupId}`);
        showNotification(`Deselected all items in group`, 'info');
    },
    
    /**
     * Toggle N/A state for individual items
     */
    toggleNA(itemId) {
        const item = document.querySelector(`[data-item-id="${itemId}"]`);
        if (!item) return;
        
        const checkbox = document.getElementById(`item-${itemId}`);
        const naBtn = item.querySelector('.na-btn');
        
        if (!checkbox || !naBtn) return;
        
        if (item.classList.contains('na-state')) {
            // Remove N/A state
            item.classList.remove('na-state');
            naBtn.classList.remove('active');
            naBtn.textContent = 'N/A';
            checkbox.disabled = false;
            
            console.log(`Removed N/A from: ${itemId}`);
        } else {
            // Set N/A state
            item.classList.add('na-state');
            naBtn.classList.add('active');
            naBtn.textContent = 'N/A';
            checkbox.checked = false;
            checkbox.disabled = true;
            
            console.log(`Set N/A for: ${itemId}`);
        }
        
        // Auto-save if section is already acknowledged
        this.autoSaveProgress(itemId);
    },
    
    /**
     * Auto-save progress when changes are made
     */
    async autoSaveProgress(itemId) {
        if (!currentUser || !currentSite) return;
        
        try {
            // Find which section this item belongs to
            const sectionElement = document.querySelector(`[data-item-id="${itemId}"]`)?.closest('[id]');
            if (!sectionElement) return;
            
            const sectionId = sectionElement.id;
            
            // Check if this section has been acknowledged
            if (completedSections.has(sectionId)) {
                // Collect current data
                const checkboxes = sectionElement.querySelectorAll('input[type="checkbox"]');
                const checklistItems = sectionElement.querySelectorAll('.checklist-item');
                
                const checklistData = {};
                const naStates = {};
                
                checkboxes.forEach(checkbox => {
                    if (!checkbox.id.includes('ack-checkbox')) {
                        checklistData[checkbox.id] = checkbox.checked;
                    }
                });
                
                checklistItems.forEach(item => {
                    if (item.dataset.itemId) {
                        naStates[item.dataset.itemId] = item.classList.contains('na-state');
                    }
                });
                
                const updateData = {
                    checklistData,
                    naStates,
                    lastAutoSave: new Date().toISOString()
                };
                
                await dataManager.saveUserProgress(currentUser.uid, currentSite, sectionId, updateData);
                console.log(`Auto-saved progress for: ${sectionId}`);
            }
        } catch (error) {
            console.error('Auto-save error:', error);
        }
    }
};

// ============================================================================
// NOTIFICATION SYSTEM
// ============================================================================

/**
 * Show user notifications
 */
function showNotification(message, type = 'info', duration = 3000) {
    // Remove existing notifications
    const existing = document.querySelector('.notification');
    if (existing) {
        existing.remove();
    }
    
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <span>${message}</span>
        <button onclick="this.parentElement.remove()" style="background: none; border: none; color: inherit; font-size: 1.2rem; cursor: pointer; margin-left: 10px;">&times;</button>
    `;
    
    // Add styles
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        border-radius: 8px;
        color: white;
        font-weight: 500;
        z-index: 10000;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        transition: all 0.3s ease;
        display: flex;
        align-items: center;
        justify-content: space-between;
        min-width: 300px;
    `;
    
    // Set background color based on type
    const colors = {
        success: '#28a745',
        error: '#dc3545',
        warning: '#ffc107',
        info: '#17a2b8'
    };
    
    notification.style.backgroundColor = colors[type] || colors.info;
    
    document.body.appendChild(notification);
    
    // Auto-remove after duration
    if (duration > 0) {
        setTimeout(() => {
            if (notification.parentElement) {
                notification.style.opacity = '0';
                notification.style.transform = 'translateX(100%)';
                setTimeout(() => {
                    if (notification.parentElement) {
                        notification.remove();
                    }
                }, 300);
            }
        }, duration);
    }
}

// ============================================================================
// INITIALIZATION AND STARTUP
// ============================================================================

/**
 * Initialize the application
 */
async function initializeApp() {
    try {
        console.log('Initializing HPGS Application...');
        
        // Initialize Firebase
        initializeFirebase();
        
        // Set up UI event listeners
        setupUIEventListeners();
        
        // Check for demo mode or authentication
        if (isFirebaseInitialized && auth) {
            // Wait for authentication state
            console.log('Waiting for authentication...');
        } else {
            // Demo mode - set up default values
            console.log('Running in demo mode');
            currentSite = 'oban';
            updateSiteDisplay();
            hideAuthenticationScreen();
            
            // Load demo data if available
            loadDemoData();
        }
        
        console.log('HPGS Application initialized successfully');
        
    } catch (error) {
        console.error('Application initialization error:', error);
        showNotification('Application initialization failed. Running in demo mode.', 'warning');
        
        // Fallback to demo mode
        currentSite = 'oban';
        updateSiteDisplay();
        hideAuthenticationScreen();
    }
}

/**
 * Initialize user data after authentication
 */
async function initializeUserData() {
    if (!currentUser || !currentSite) return;
    
    try {
        // Load user progress
        userCompletionData = await dataManager.loadUserProgress(currentUser.uid, currentSite);
        
        // Update completed sections set
        Object.keys(userCompletionData).forEach(sectionId => {
            const data = userCompletionData[sectionId];
            if (data.completed) {
                completedSections.add(sectionId);
                
                // Update UI
                const statusElement = document.getElementById(`ack-${sectionId}`);
                if (statusElement) {
                    statusElement.textContent = '✓';
                    statusElement.classList.add('completed');
                }
            }
        });
        
        // Set up real-time listeners
        setupRealtimeListeners();
        
        // Update progress display
        updateProgress();
        
        console.log(`User data initialized for ${siteConfig[currentSite]?.name}`);
        
    } catch (error) {
        console.error('Error initializing user data:', error);
    }
}

/**
 * Set up UI event listeners
 */
function setupUIEventListeners() {
    // Mobile menu toggle
    const mobileToggle = document.querySelector('.mobile-menu-toggle');
    if (mobileToggle) {
        mobileToggle.addEventListener('click', toggleMobileMenu);
    }
    
    // Print button
    const printBtn = document.querySelector('.print-btn');
    if (printBtn) {
        printBtn.addEventListener('click', printReport);
    }
    
    // Auto-save on checkbox changes
    document.addEventListener('change', (event) => {
        if (event.target.type === 'checkbox' && !event.target.id.includes('ack-checkbox')) {
            enhancedControls.autoSaveProgress(event.target.id);
        }
    });
}

/**
 * Load demo data for testing
 */
function loadDemoData() {
    // Simulate some completed sections for demonstration
    const demoCompletedSections = ['accommodation', 'fire-safety'];
    
    demoCompletedSections.forEach(sectionId => {
        completedSections.add(sectionId);
        
        const statusElement = document.getElementById(`ack-${sectionId}`);
        if (statusElement) {
            statusElement.textContent = '✓';
            statusElement.classList.add('completed');
        }
    });
    
    updateProgress();
    console.log('Demo data loaded');
}

/**
 * Show authentication screen
 */
function showAuthenticationScreen() {
    const authContainer = document.getElementById('authContainer');
    if (authContainer) {
        authContainer.style.display = 'flex';
    }
    document.body.style.overflow = 'hidden';
}

/**
 * Hide authentication screen
 */
function hideAuthenticationScreen() {
    const authContainer = document.getElementById('authContainer');
    if (authContainer) {
        authContainer.style.display = 'none';
    }
    document.body.style.overflow = 'auto';
}

/**
 * Update site display in UI
 */
function updateSiteDisplay() {
    if (currentSite && siteConfig[currentSite]) {
        const siteNameElement = document.getElementById('siteName');
        const siteCodeElement = document.getElementById('siteCode');
        const currentSiteNameElement = document.getElementById('current-site-name');
        
        if (siteNameElement) {
            siteNameElement.textContent = siteConfig[currentSite].name;
        }
        
        if (siteCodeElement) {
            siteCodeElement.textContent = siteConfig[currentSite].code;
        }
        
        if (currentSiteNameElement) {
            currentSiteNameElement.textContent = siteConfig[currentSite].name;
        }
        
        console.log(`UI updated for: ${siteConfig[currentSite].name}`);
    }
}

/**
 * Update progress display
 */
function updateProgress() {
    const totalSections = 21;
    const completedCount = completedSections.size;
    const percentage = Math.round((completedCount / totalSections) * 100);
    
    const progressFill = document.getElementById('progressFill');
    const completedCountElement = document.getElementById('completed-count');
    const totalCountElement = document.getElementById('total-count');
    const completionPercentageElement = document.getElementById('completion-percentage');
    
    if (progressFill) progressFill.style.width = percentage + '%';
    if (completedCountElement) completedCountElement.textContent = completedCount;
    if (totalCountElement) totalCountElement.textContent = totalSections;
    if (completionPercentageElement) completionPercentageElement.textContent = percentage + '%';
}

// ============================================================================
// EXPORT FUNCTIONS TO GLOBAL SCOPE
// ============================================================================

// Make functions available globally for HTML integration
window.initializeApp = initializeApp;
window.dataManager = dataManager;
window.enhancedControls = enhancedControls;
window.signInWithEmail = signInWithEmail;
window.signOut = signOut;
window.createUserAccount = createUserAccount;
window.showNotification = showNotification;
window.siteConfig = siteConfig;
window.userRoles = userRoles;

// Export enhanced controls with backward compatibility
window.selectAllInGroup = enhancedControls.selectAllInGroup.bind(enhancedControls);
window.deselectAllInGroup = enhancedControls.deselectAllInGroup.bind(enhancedControls);
window.toggleNA = enhancedControls.toggleNA.bind(enhancedControls);

// ============================================================================
// AUTO-INITIALIZATION
// ============================================================================

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
} else {
    initializeApp();
}

console.log('HPGS Integration v2.0.0 loaded successfully');
