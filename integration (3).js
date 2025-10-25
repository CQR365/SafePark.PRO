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
 * Site configuration - will be loaded dynamically based on access code
 */
let siteConfig = {};
let currentSiteData = null;

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

/**
 * Load site configuration based on access code
 */
async function loadSiteConfiguration(accessCode) {
    try {
        // In a real implementation, this would query your database/API
        // For now, we'll simulate the lookup
        
        const siteDatabase = {
            'OBP001': {
                id: 'oban',
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
            'BNR002': {
                id: 'ben-nevis',
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
            'LKP003': {
                id: 'loch-katrine',
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
            },
            'DEMO123': {
                id: 'demo',
                name: 'Demo Holiday Park',
                location: 'Demo Location',
                code: 'DEMO',
                region: 'Demo Region',
                established: '2024',
                capacity: 100,
                contact: {
                    phone: '+44 0000 000000',
                    email: 'demo@holidaypark.co.uk',
                    manager: 'Demo Manager'
                }
            }
        };
        
        const siteData = siteDatabase[accessCode.toUpperCase()];
        
        if (siteData) {
            currentSiteData = siteData;
            currentSite = siteData.id;
            siteConfig[siteData.id] = siteData;
            
            console.log(`Site configuration loaded for: ${siteData.name}`);
            return siteData;
        } else {
            throw new Error('Invalid access code');
        }
        
    } catch (error) {
        console.error('Error loading site configuration:', error);
        throw error;
    }
}


// ============================================================================
// GLOBAL STATE MANAGEMENT
// ============================================================================

let currentUser = null;
let currentSite = null; // Will be set dynamically based on access code
let userRole = null;
let completedSections = new Set();
let userCompletionData = {};
let sectionData = {};
let realtimeListeners = [];

/**
 * Validate access code format
 */
function validateAccessCode(accessCode) {
    // Access codes should be in format: XXX### (3 letters + 3 numbers)
    const accessCodeRegex = /^[A-Z]{3}\d{3}$/;
    return accessCodeRegex.test(accessCode.toUpperCase());
}

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
        // No fallback site - user must provide valid access code
        throw new Error('Unable to load user profile. Please check access code.');
    }
}

/**
 * Create new user profile with access code
 */
async function createUserProfile(userId, accessCode) {
    try {
        // Load site configuration based on access code
        const siteData = await loadSiteConfiguration(accessCode);
        
        const newUserData = {
            userId: userId,
            email: currentUser.email,
            name: currentUser.displayName || currentUser.email.split('@')[0],
            assignedSite: siteData.id,
            accessCode: accessCode,
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
        throw error;
    }
}

/**
 * Sign in with email, password, and access code
 */
async function signInWithEmail(email, password, accessCode) {
    try {
        // Validate access code first
        if (!validateAccessCode(accessCode)) {
            throw new Error('Invalid access code format. Please use format: ABC123');
        }
        
        const userCredential = await auth.signInWithEmailAndPassword(email, password);
        
        // Load site configuration based on access code
        await loadSiteConfiguration(accessCode);
        
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
 * Create new user account with access code
 */
async function createUserAccount(email, password, userData, accessCode) {
    try {
        // Validate access code first
        if (!validateAccessCode(accessCode)) {
            throw new Error('Invalid access code format. Please use format: ABC123');
        }
        
        // Load site configuration based on access code
        const siteData = await loadSiteConfiguration(accessCode);
        
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        const user = userCredential.user;
        
        // Create user profile in Firestore
        await db.collection('users').doc(user.uid).set({
            ...userData,
            userId: user.uid,
            email: email,
            assignedSite: siteData.id,
            accessCode: accessCode,
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
            await startDemoMode();
            hideAuthenticationScreen();
        }
        
        console.log('HPGS Application initialized successfully');
        
    } catch (error) {
        console.error('Application initialization error:', error);
        showNotification('Application initialization failed. Running in demo mode.', 'warning');
        
        // Fallback to demo mode
        await startDemoMode();
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
                    statusElement.textContent = 'âœ“';
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
 * Start demo mode with demo access code
 */
async function startDemoMode() {
    try {
        // Load demo site configuration
        await loadSiteConfiguration('DEMO123');
        
        // Set up demo user
        currentUser = {
            uid: 'demo-user-123',
            email: 'demo@holidaypark.co.uk',
            displayName: 'Demo User'
        };
        
        userRole = 'inspector';
        
        // Update UI
        updateSiteDisplay();
        
        // Load demo data
        loadDemoData();
        
        console.log('Demo mode started successfully');
        showNotification('Demo mode activated', 'info');
        
    } catch (error) {
        console.error('Error starting demo mode:', error);
        
        // Ultra-fallback for demo mode
        currentSiteData = {
            id: 'demo',
            name: 'Demo Holiday Park',
            code: 'DEMO',
            location: 'Demo Location'
        };
        currentSite = 'demo';
        siteConfig['demo'] = currentSiteData;
        
        updateSiteDisplay();
        loadDemoData();
    }
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
            statusElement.textContent = 'âœ“';
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
    const siteNameElement = document.getElementById('siteName');
    const siteCodeElement = document.getElementById('siteCode');
    const currentSiteNameElement = document.getElementById('current-site-name');
    
    if (currentSite && siteConfig[currentSite]) {
        // Site loaded - show actual data
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
    } else {
        // No site loaded - show generic text
        if (siteNameElement) {
            siteNameElement.textContent = 'Holiday Park General Safety';
        }
        
        if (siteCodeElement) {
            siteCodeElement.textContent = 'HPGS';
        }
        
        if (currentSiteNameElement) {
            currentSiteNameElement.textContent = 'Please log in to access your holiday park';
        }
        
        console.log('UI updated - no site loaded');
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
// UI FUNCTIONS (from HTML)
// ============================================================================

/**
 * Toggle mobile menu
 */
function toggleMobileMenu() {
    const sidebar = document.querySelector('.sidebar');
    if (sidebar) {
        sidebar.classList.toggle('open');
    }
}

/**
 * Toggle navigation sections
 */
function toggleSection(element) {
    const subsections = element.nextElementSibling;
    const isActive = element.classList.contains('active');
    
    // Close all sections
    document.querySelectorAll('.nav-section-title').forEach(title => {
        title.classList.remove('active');
        if (title.nextElementSibling) {
            title.nextElementSibling.classList.remove('active');
        }
    });
    
    if (!isActive && subsections) {
        element.classList.add('active');
        subsections.classList.add('active');
    }
}

/**
 * Show content section
 */
function showContent(event, contentId) {
    // Check if month is selected for monthly inspections
    if (typeof window.currentSelectedMonth !== 'undefined' && 
        !window.currentSelectedMonth && 
        typeof window.isMonthlyInspection === 'function' && 
        window.isMonthlyInspection(contentId)) {
        showNotification('Please select a month first', 'warning');
        return;
    }
    
    // Hide all content sections
    document.querySelectorAll('.content-section').forEach(section => {
        section.classList.remove('active');
    });
    
    // Remove active class from all nav items
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    
    // Show selected content
    const contentSection = document.getElementById(contentId);
    if (contentSection) {
        contentSection.classList.add('active');
        
        // Add active class to clicked nav item
        if (event && event.currentTarget) {
            event.currentTarget.classList.add('active');
        }
        
        // Load content dynamically if function exists
        if (typeof window.loadContentDynamically === 'function') {
            window.loadContentDynamically(contentId);
        }
        
        // Close mobile menu if open
        const sidebar = document.querySelector('.sidebar');
        if (sidebar && window.innerWidth <= 768) {
            sidebar.classList.remove('open');
        }
    }
}

/**
 * Update acknowledgment button state
 */
function updateAcknowledgment(sectionId) {
    const checkbox = document.getElementById(`ack-checkbox-${sectionId}`);
    const nameField = document.getElementById(`user-name-${sectionId}`);
    const positionField = document.getElementById(`user-position-${sectionId}`);
    const button = document.getElementById(`ack-btn-${sectionId}`);
    
    if (checkbox && nameField && positionField && button) {
        if (checkbox.checked && nameField.value.trim() && positionField.value.trim()) {
            button.disabled = false;
        } else {
            button.disabled = true;
        }
    }
}

/**
 * Submit acknowledgment
 */
async function submitAcknowledgment(sectionId) {
    const nameField = document.getElementById(`user-name-${sectionId}`);
    const positionField = document.getElementById(`user-position-${sectionId}`);
    const commentsField = document.getElementById(`comments-${sectionId}`);
    
    const userName = nameField ? nameField.value.trim() : '';
    const userPosition = positionField ? positionField.value.trim() : '';
    const comments = commentsField ? commentsField.value.trim() : '';
    
    if (!userName || !userPosition) {
        showNotification('Please enter your full name and position before acknowledging this section.', 'error');
        return;
    }
    
    if (!currentUser && !currentSite) {
        showNotification('System error: Site information missing. Please refresh and try again.', 'error');
        return;
    }
    
    try {
        const userId = currentUser?.uid || currentUser?.email || 'demo-user';
        const siteId = currentSite;
        
        // Collect checklist data including N/A states
        const checkboxes = document.querySelectorAll(`#${sectionId} input[type="checkbox"]`);
        const checklistItems = document.querySelectorAll(`#${sectionId} .checklist-item`);
        const checklistData = {};
        const naStates = {};
        
        checkboxes.forEach(checkbox => {
            if (checkbox.id !== `ack-checkbox-${sectionId}`) {
                checklistData[checkbox.id] = checkbox.checked;
            }
        });
        
        checklistItems.forEach(item => {
            if (item.dataset.itemId) {
                naStates[item.dataset.itemId] = item.classList.contains('na-state');
            }
        });
        
        const acknowledgmentData = {
            sectionId: sectionId,
            userName: userName,
            userPosition: userPosition,
            comments: comments,
            timestamp: new Date().toISOString(),
            checklistData: checklistData,
            naStates: naStates,
            completed: true,
            siteName: siteConfig[siteId]?.name || siteId
        };
        
        // Save progress and acknowledgment
        if (isFirebaseInitialized && dataManager) {
            await dataManager.saveUserProgress(userId, siteId, sectionId, acknowledgmentData);
            await dataManager.saveUserAcknowledment(userId, siteId, sectionId, userName, acknowledgmentData.timestamp);
        }
        
        // Update completed sections
        completedSections.add(sectionId);
        
        // Update UI
        const statusElement = document.getElementById(`ack-${sectionId}`);
        if (statusElement) {
            statusElement.textContent = '✓';
            statusElement.classList.add('completed');
            statusElement.title = `Completed by ${userName} at ${new Date().toLocaleString()}`;
        }
        
        // Update progress
        updateProgress();
        
        showNotification(`Section "${sectionId}" completed successfully!`, 'success');
        
        console.log(`Acknowledgment submitted for ${sectionId} by ${userName}`);
        
    } catch (error) {
        console.error('Error submitting acknowledgment:', error);
        showNotification('Error saving acknowledgment. Please try again.', 'error');
    }
}

/**
 * Print report
 */
function printReport() {
    // Create a comprehensive print report
    const printWindow = window.open('', '_blank');
    
    if (typeof window.generatePrintReport === 'function' && typeof window.getPrintStyles === 'function') {
        const reportContent = window.generatePrintReport();
        const styles = window.getPrintStyles();
        
        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>HPGS Safety Inspection Report - ${siteConfig[currentSite]?.name || 'Holiday Park'}</title>
                <style>${styles}</style>
            </head>
            <body>
                ${reportContent}
            </body>
            </html>
        `);
    } else {
        // Basic print fallback
        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>HPGS Safety Report</title>
                <style>
                    body { font-family: Arial, sans-serif; margin: 20px; }
                    h1 { color: #CC5500; }
                    .completed { color: green; font-weight: bold; }
                </style>
            </head>
            <body>
                <h1>Holiday Park General Safety Report</h1>
                <p><strong>Site:</strong> ${siteConfig[currentSite]?.name || 'Unknown Site'}</p>
                <p><strong>Generated:</strong> ${new Date().toLocaleDateString()}</p>
                <p><strong>Completed Sections:</strong> ${completedSections.size} / 21</p>
                <div class="completed">Report generated from HPGS System</div>
            </body>
            </html>
        `);
    }
    
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
}

/**
 * Handle month selection
 */
function handleMonthSelection(monthKey) {
    if (typeof window.currentSelectedMonth !== 'undefined') {
        if (!monthKey) {
            window.currentSelectedMonth = null;
            if (typeof window.hideMonthlyInspections === 'function') {
                window.hideMonthlyInspections();
            }
            return;
        }
        
        window.currentSelectedMonth = monthKey;
        
        // Update status message
        const statusDiv = document.getElementById('month-status');
        if (statusDiv) {
            const now = new Date();
            const selectedDate = typeof window.parseMonthKey === 'function' ? 
                window.parseMonthKey(monthKey) : new Date();
            const isPast = selectedDate < new Date(now.getFullYear(), now.getMonth(), 1);
            
            statusDiv.innerHTML = isPast ? 
                '<span class="past-month">⚠️ Past Month Selected</span>' : 
                '<span class="current-month">✓ Current/Future Month</span>';
        }
        
        // Show monthly inspections
        if (typeof window.showMonthlyInspections === 'function') {
            window.showMonthlyInspections();
        }
        
        console.log(`Month selected: ${monthKey}`);
    }
}

/**
 * Switch site
 */
function switchSite(siteKey) {
    if (siteConfig[siteKey]) {
        currentSite = siteKey;
        updateSiteDisplay();
        console.log(`Switched to: ${siteConfig[siteKey].name}`);
        showNotification(`Switched to ${siteConfig[siteKey].name}`, 'info');
    }
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

// Export UI functions
window.toggleMobileMenu = toggleMobileMenu;
window.toggleSection = toggleSection;
window.showContent = showContent;
window.updateAcknowledgment = updateAcknowledgment;
window.submitAcknowledgment = submitAcknowledgment;
window.printReport = printReport;
window.handleMonthSelection = handleMonthSelection;
window.switchSite = switchSite;
window.startDemoMode = startDemoMode;

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
