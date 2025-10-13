/**
 * SafePark.PRO Core Module
 * Shared functionality for all SafePark.PRO HTML modules
 * Contains: Authentication, Firebase integration, team management, utilities
 */

// Import Firebase functions
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getFirestore, collection, addDoc, getDocs, doc, updateDoc, deleteDoc, onSnapshot, query, where, orderBy } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';

// ========================================================================
// CONFIGURATION & INITIALIZATION
// ========================================================================

// Firebase configuration (replace with your actual config)
const firebaseConfig = {
    // Your Firebase config will go here
    apiKey: "your-api-key",
    authDomain: "your-project.firebaseapp.com",
    projectId: "your-project-id",
    storageBucket: "your-project.appspot.com",
    messagingSenderId: "123456789",
    appId: "your-app-id"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// Global state
let isAuthenticated = false;
let currentPark = null;
let firebaseAuthenticated = false;

// Park codes database
const parkCodes = {
    '1010': {
        name: 'Ben Nevis Holiday Park',
        message: 'Welcome Ben Nevis Holiday Park....lets get this done!!!'
    },
    '1020': {
        name: 'Oban Holiday Park', 
        message: 'Welcome Oban Holiday Park....lets get this done!!!'
    },
    '1030': {
        name: 'Tyndrum Holiday Park',
        message: 'Welcome Tyndrum Holiday Park....lets get this done!!!'
    },
    '365': {
        name: 'Overburns Farm',
        message: 'Welcome Overburns Farm....lets get this done!!!'
    },
    'CQR365SPP25': {
        name: 'SafePark.PRO Master Access',
        message: 'Welcome SafePark.PRO Administrator....lets get this done!!!'
    }
};

// Authentication duration (60 minutes)
const AUTH_DURATION = 60 * 60 * 1000;

// ========================================================================
// FIREBASE AUTHENTICATION
// ========================================================================

// Authenticate with Firebase using anonymous auth
async function authenticateFirebase() {
    try {
        const userCredential = await signInAnonymously(auth);
        console.log('Firebase authenticated:', userCredential.user.uid);
        firebaseAuthenticated = true;
        return true;
    } catch (error) {
        console.error('Firebase authentication failed:', error);
        firebaseAuthenticated = false;
        return false;
    }
}

// Monitor Firebase auth state
onAuthStateChanged(auth, (user) => {
    if (user) {
        console.log('Firebase user signed in:', user.uid);
        firebaseAuthenticated = true;
    } else {
        console.log('Firebase user signed out');
        firebaseAuthenticated = false;
    }
});

// ========================================================================
// PARK CODE AUTHENTICATION
// ========================================================================

// Check existing authentication
async function checkExistingAuth() {
    console.log('Checking existing authentication...');
    
    const authData = localStorage.getItem('safePark_auth');
    if (authData) {
        try {
            const { timestamp, park, code, firebaseAuth } = JSON.parse(authData);
            const now = Date.now();
            
            if (now - timestamp < AUTH_DURATION) {
                console.log('Valid local authentication found:', park);
                
                // Re-authenticate with Firebase if needed
                if (firebaseAuth && !firebaseAuthenticated) {
                    console.log('Re-authenticating with Firebase...');
                    const firebaseSuccess = await authenticateFirebase();
                    if (!firebaseSuccess) {
                        console.log('Firebase re-authentication failed, clearing auth');
                        localStorage.removeItem('safePark_auth');
                        return false;
                    }
                }
                
                isAuthenticated = true;
                currentPark = park;
                return true;
            } else {
                console.log('Authentication expired, clearing...');
                localStorage.removeItem('safePark_auth');
            }
        } catch (error) {
            console.log('Invalid auth data, clearing...');
            localStorage.removeItem('safePark_auth');
        }
    }
    
    console.log('No valid authentication found');
    return false;
}

// Authenticate user with park code
async function authenticateUser(code) {
    console.log('Authenticating user with park code...');
    
    if (parkCodes[code]) {
        console.log('Valid park code entered:', code);
        
        // Step 1: Set local authentication
        isAuthenticated = true;
        currentPark = parkCodes[code].name;
        
        // Step 2: Authenticate with Firebase
        const firebaseAuthSuccess = await authenticateFirebase();
        if (!firebaseAuthSuccess) {
            console.error('Firebase authentication failed');
            isAuthenticated = false;
            currentPark = null;
            throw new Error('System connection error. Please try again.');
        }
        
        // Step 3: Save authentication state
        const authData = {
            timestamp: Date.now(),
            park: currentPark,
            code: code,
            firebaseAuth: true
        };
        localStorage.setItem('safePark_auth', JSON.stringify(authData));
        
        console.log('Authentication successful (Park + Firebase)');
        return { success: true, park: currentPark, message: parkCodes[code].message };
        
    } else {
        console.log('Invalid code entered');
        throw new Error('Invalid access code. Please try again.');
    }
}

// Sign out user
async function signOutUser() {
    try {
        isAuthenticated = false;
        currentPark = null;
        localStorage.removeItem('safePark_auth');
        console.log('User signed out successfully');
        return true;
    } catch (error) {
        console.error('Error signing out:', error);
        return false;
    }
}

// ========================================================================
// FIREBASE DATA MANAGEMENT
// ========================================================================

// Team Member Management
async function addTeamMemberFirebase(teamMemberData) {
    if (!firebaseAuthenticated) {
        throw new Error('Firebase authentication required');
    }
    
    try {
        const docRef = await addDoc(
            collection(db, 'teamMembers'), 
            {
                ...teamMemberData,
                createdAt: new Date(),
                updatedAt: new Date()
            }
        );
        console.log('Team member added to Firebase:', docRef.id);
        return docRef.id;
    } catch (error) {
        console.error('Error adding team member to Firebase:', error);
        if (error.code === 'permission-denied') {
            throw new Error('Access denied. Please check your permissions.');
        }
        throw error;
    }
}

async function getTeamMembersFirebase() {
    if (!firebaseAuthenticated) {
        console.log('Firebase not authenticated, returning empty array');
        return [];
    }
    
    try {
        const querySnapshot = await getDocs(
            collection(db, 'teamMembers')
        );
        const teamMembers = [];
        querySnapshot.forEach((doc) => {
            teamMembers.push({ id: doc.id, ...doc.data() });
        });
        console.log('Retrieved team members from Firebase:', teamMembers.length);
        return teamMembers;
    } catch (error) {
        console.error('Error getting team members from Firebase:', error);
        if (error.code === 'permission-denied') {
            console.log('Permission denied - re-authenticating...');
            await authenticateFirebase();
            return [];
        }
        return [];
    }
}

async function updateTeamMemberFirebase(docId, updateData) {
    if (!firebaseAuthenticated) {
        throw new Error('Firebase authentication required');
    }
    
    try {
        await updateDoc(
            doc(db, 'teamMembers', docId),
            {
                ...updateData,
                updatedAt: new Date()
            }
        );
        console.log('Team member updated in Firebase:', docId);
    } catch (error) {
        console.error('Error updating team member in Firebase:', error);
        if (error.code === 'permission-denied') {
            throw new Error('Access denied. Please check your permissions.');
        }
        throw error;
    }
}

async function deleteTeamMemberFirebase(docId) {
    if (!firebaseAuthenticated) {
        throw new Error('Firebase authentication required');
    }
    
    try {
        await deleteDoc(doc(db, 'teamMembers', docId));
        console.log('Team member deleted from Firebase:', docId);
    } catch (error) {
        console.error('Error deleting team member from Firebase:', error);
        if (error.code === 'permission-denied') {
            throw new Error('Access denied. Please check your permissions.');
        }
        throw error;
    }
}

// Maintenance Task Management
async function addMaintenanceTaskFirebase(taskData) {
    if (!firebaseAuthenticated) {
        throw new Error('Firebase authentication required');
    }
    
    try {
        const docRef = await addDoc(
            collection(db, 'maintenanceTasks'), 
            {
                ...taskData,
                createdAt: new Date(),
                updatedAt: new Date()
            }
        );
        console.log('Maintenance task added to Firebase:', docRef.id);
        return docRef.id;
    } catch (error) {
        console.error('Error adding maintenance task to Firebase:', error);
        if (error.code === 'permission-denied') {
            throw new Error('Access denied. Please check your permissions.');
        }
        throw error;
    }
}

async function getMaintenanceTasksFirebase(filters = {}) {
    if (!firebaseAuthenticated) {
        console.log('Firebase not authenticated, returning empty array');
        return [];
    }
    
    try {
        let q = collection(db, 'maintenanceTasks');
        
        // Apply filters if provided
        if (filters.category) {
            q = query(q, where('category', '==', filters.category));
        }
        if (filters.holidayPark) {
            q = query(q, where('holidayPark', '==', filters.holidayPark));
        }
        if (filters.status) {
            q = query(q, where('status', '==', filters.status));
        }
        
        // Order by creation date
        q = query(q, orderBy('createdAt', 'desc'));
        
        const querySnapshot = await getDocs(q);
        const tasks = [];
        querySnapshot.forEach((doc) => {
            tasks.push({ id: doc.id, ...doc.data() });
        });
        console.log('Retrieved maintenance tasks from Firebase:', tasks.length);
        return tasks;
    } catch (error) {
        console.error('Error getting maintenance tasks from Firebase:', error);
        if (error.code === 'permission-denied') {
            console.log('Permission denied - re-authenticating...');
            await authenticateFirebase();
            return [];
        }
        return [];
    }
}

async function updateMaintenanceTaskFirebase(docId, updateData) {
    if (!firebaseAuthenticated) {
        throw new Error('Firebase authentication required');
    }
    
    try {
        await updateDoc(
            doc(db, 'maintenanceTasks', docId),
            {
                ...updateData,
                updatedAt: new Date()
            }
        );
        console.log('Maintenance task updated in Firebase:', docId);
    } catch (error) {
        console.error('Error updating maintenance task in Firebase:', error);
        if (error.code === 'permission-denied') {
            throw new Error('Access denied. Please check your permissions.');
        }
        throw error;
    }
}

async function deleteMaintenanceTaskFirebase(docId) {
    if (!firebaseAuthenticated) {
        throw new Error('Firebase authentication required');
    }
    
    try {
        await deleteDoc(doc(db, 'maintenanceTasks', docId));
        console.log('Maintenance task deleted from Firebase:', docId);
    } catch (error) {
        console.error('Error deleting maintenance task from Firebase:', error);
        if (error.code === 'permission-denied') {
            throw new Error('Access denied. Please check your permissions.');
        }
        throw error;
    }
}

// Generic data management for module-specific collections
async function addModuleDataFirebase(collectionName, data) {
    if (!firebaseAuthenticated) {
        throw new Error('Firebase authentication required');
    }
    
    try {
        const docRef = await addDoc(
            collection(db, collectionName), 
            {
                ...data,
                createdAt: new Date(),
                updatedAt: new Date(),
                createdBy: currentPark || 'System'
            }
        );
        console.log(`${collectionName} data added to Firebase:`, docRef.id);
        return docRef.id;
    } catch (error) {
        console.error(`Error adding ${collectionName} data to Firebase:`, error);
        if (error.code === 'permission-denied') {
            throw new Error('Access denied. Please check your permissions.');
        }
        throw error;
    }
}

async function getModuleDataFirebase(collectionName, filters = {}) {
    if (!firebaseAuthenticated) {
        console.log('Firebase not authenticated, returning empty array');
        return [];
    }
    
    try {
        let q = collection(db, collectionName);
        
        // Apply filters
        Object.entries(filters).forEach(([field, value]) => {
            if (value) {
                q = query(q, where(field, '==', value));
            }
        });
        
        // Order by creation date
        q = query(q, orderBy('createdAt', 'desc'));
        
        const querySnapshot = await getDocs(q);
        const data = [];
        querySnapshot.forEach((doc) => {
            data.push({ id: doc.id, ...doc.data() });
        });
        console.log(`Retrieved ${collectionName} data from Firebase:`, data.length);
        return data;
    } catch (error) {
        console.error(`Error getting ${collectionName} data from Firebase:`, error);
        return [];
    }
}

async function updateModuleDataFirebase(collectionName, docId, updateData) {
    if (!firebaseAuthenticated) {
        throw new Error('Firebase authentication required');
    }
    
    try {
        await updateDoc(
            doc(db, collectionName, docId),
            {
                ...updateData,
                updatedAt: new Date()
            }
        );
        console.log(`${collectionName} data updated in Firebase:`, docId);
    } catch (error) {
        console.error(`Error updating ${collectionName} data in Firebase:`, error);
        throw error;
    }
}

async function deleteModuleDataFirebase(collectionName, docId) {
    if (!firebaseAuthenticated) {
        throw new Error('Firebase authentication required');
    }
    
    try {
        await deleteDoc(doc(db, collectionName, docId));
        console.log(`${collectionName} data deleted from Firebase:`, docId);
    } catch (error) {
        console.error(`Error deleting ${collectionName} data from Firebase:`, error);
        throw error;
    }
}

// ========================================================================
// UI UTILITIES
// ========================================================================

// Show loading state
function showLoading(elementId, message = 'Loading...') {
    const element = document.getElementById(elementId);
    if (element) {
        element.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #6C757D;">
                <div style="margin-bottom: 15px;">⏳</div>
                <div>${message}</div>
            </div>
        `;
    }
}

// Show error state
function showError(elementId, message = 'An error occurred') {
    const element = document.getElementById(elementId);
    if (element) {
        element.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #DC3545;">
                <div style="margin-bottom: 15px;">❌</div>
                <div><strong>Error:</strong> ${message}</div>
            </div>
        `;
    }
}

// Show empty state
function showEmptyState(elementId, title, message, icon = '📋') {
    const element = document.getElementById(elementId);
    if (element) {
        element.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #6C757D;">
                <div style="font-size: 3rem; margin-bottom: 15px; opacity: 0.5;">${icon}</div>
                <div style="font-size: 1.2rem; font-weight: 600; margin-bottom: 8px;">${title}</div>
                <div style="font-size: 0.95rem; line-height: 1.5;">${message}</div>
            </div>
        `;
    }
}

// Populate team member dropdowns
async function populateTeamMemberDropdowns(selectSelector = '[data-populate="teamMembers"]') {
    try {
        const teamMembers = await getTeamMembersFirebase();
        const dropdowns = document.querySelectorAll(selectSelector);
        
        dropdowns.forEach(dropdown => {
            const currentValue = dropdown.value;
            dropdown.innerHTML = '<option value="">Select Team Member (Optional)</option>';
            
            teamMembers.forEach(member => {
                const option = document.createElement('option');
                option.value = member.name;
                option.textContent = `${member.name} (${member.role}) - ${member.holidayPark}`;
                dropdown.appendChild(option);
            });
            
            // Restore previous selection if it exists
            if (currentValue) {
                dropdown.value = currentValue;
            }
        });
        
        console.log(`Populated ${dropdowns.length} team member dropdowns with ${teamMembers.length} Firebase members`);
        
    } catch (error) {
        console.error('Error populating team member dropdowns:', error);
    }
}

// Format date helper
function formatDate(dateString) {
    if (!dateString) return 'N/A';
    try {
        const date = new Date(dateString);
        return date.toLocaleDateString();
    } catch (error) {
        return dateString;
    }
}

// Format date and time
function formatDateTime(dateString) {
    if (!dateString) return 'N/A';
    try {
        const date = new Date(dateString);
        return date.toLocaleString();
    } catch (error) {
        return dateString;
    }
}

// Create status badge HTML
function createStatusBadge(status, type = 'status') {
    const className = `${type}-${status.replace(/\s+/g, '-').toLowerCase()}`;
    return `<span class="status-badge ${className}">${status.toUpperCase()}</span>`;
}

// ========================================================================
// AUTHENTICATION UI HELPERS
// ========================================================================

// Create authentication modal HTML
function createAuthModal() {
    return `
        <div id="authModal" class="auth-modal" style="display: none;">
            <div class="auth-modal-content">
                <div class="auth-header">
                    <h2>SafePark.PRO Authentication</h2>
                    <p>Please enter your access code to continue</p>
                </div>
                <div class="auth-body">
                    <input 
                        type="password" 
                        id="authCode" 
                        class="auth-input" 
                        placeholder="Enter Access Code"
                        maxlength="15"
                        autocomplete="off"
                    >
                    <button class="auth-btn" onclick="SafeParkCore.handleAuthSubmit()">Access System</button>
                    <div id="authError" class="auth-error"></div>
                </div>
                <div class="auth-footer">
                    <small>&copy; 2025 CQR365 SafePark.PRO Management System</small>
                </div>
            </div>
        </div>
    `;
}

// Handle authentication modal submission
async function handleAuthSubmit() {
    const codeInput = document.getElementById('authCode');
    const errorDiv = document.getElementById('authError');
    
    if (!codeInput) return;
    
    const code = codeInput.value.trim();
    
    try {
        errorDiv.textContent = '';
        const result = await authenticateUser(code);
        
        if (result.success) {
            document.getElementById('authModal').style.display = 'none';
            // Trigger custom event for successful authentication
            window.dispatchEvent(new CustomEvent('safeParkAuthenticated', { 
                detail: { park: result.park, message: result.message }
            }));
        }
    } catch (error) {
        errorDiv.textContent = error.message;
        codeInput.value = '';
        codeInput.focus();
    }
}

// Show authentication modal
function showAuthModal() {
    let modal = document.getElementById('authModal');
    if (!modal) {
        // Create modal if it doesn't exist
        const modalHTML = createAuthModal();
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        modal = document.getElementById('authModal');
        
        // Add styles
        addAuthModalStyles();
    }
    
    modal.style.display = 'flex';
    setTimeout(() => {
        const input = document.getElementById('authCode');
        if (input) input.focus();
    }, 100);
}

// Add authentication modal styles
function addAuthModalStyles() {
    if (document.getElementById('safeParkAuthStyles')) return;
    
    const styles = document.createElement('style');
    styles.id = 'safeParkAuthStyles';
    styles.textContent = `
        .auth-modal {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.8);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
        }
        
        .auth-modal-content {
            background: linear-gradient(145deg, #2F2F2F, #000000);
            border: 4px solid #CC5500;
            border-radius: 20px;
            padding: 40px;
            text-align: center;
            max-width: 400px;
            width: 90%;
        }
        
        .auth-header h2 {
            color: #CC5500;
            font-size: 2rem;
            margin-bottom: 10px;
        }
        
        .auth-header p {
            color: #B8B8B8;
            margin-bottom: 30px;
        }
        
        .auth-input {
            width: 100%;
            padding: 15px;
            font-size: 1.1rem;
            text-align: center;
            background: rgba(255, 255, 255, 0.1);
            border: 2px solid #6C757D;
            border-radius: 8px;
            color: white;
            margin-bottom: 20px;
        }
        
        .auth-input:focus {
            outline: none;
            border-color: #CC5500;
            box-shadow: 0 0 0 2px rgba(204, 85, 0, 0.3);
        }
        
        .auth-btn {
            background: linear-gradient(135deg, #CC5500, #B8460C);
            color: white;
            padding: 15px 30px;
            border: none;
            border-radius: 8px;
            font-size: 1rem;
            font-weight: 600;
            cursor: pointer;
            width: 100%;
        }
        
        .auth-btn:hover {
            transform: translateY(-1px);
            box-shadow: 0 4px 12px rgba(204, 85, 0, 0.3);
        }
        
        .auth-error {
            color: #DC3545;
            margin-top: 15px;
            font-weight: 600;
        }
        
        .auth-footer {
            margin-top: 30px;
            color: #6C757D;
            font-size: 0.8rem;
        }
    `;
    document.head.appendChild(styles);
}

// ========================================================================
// INITIALIZATION & EXPORTS
// ========================================================================

// Initialize SafePark Core
async function initSafeParkCore() {
    console.log('SafePark.PRO Core initializing...');
    
    try {
        // Check existing authentication
        const wasAuthenticated = await checkExistingAuth();
        
        if (wasAuthenticated) {
            console.log('User already authenticated:', currentPark);
            // Trigger authenticated event
            window.dispatchEvent(new CustomEvent('safeParkAuthenticated', { 
                detail: { park: currentPark, message: 'Welcome back!' }
            }));
        } else {
            console.log('User needs to authenticate');
            // Show authentication modal after a short delay
            setTimeout(showAuthModal, 500);
        }
        
        console.log('SafePark.PRO Core initialized successfully');
        
    } catch (error) {
        console.error('Error initializing SafePark Core:', error);
    }
}

// Auto-initialize when DOM is loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSafeParkCore);
} else {
    initSafeParkCore();
}

// Export SafePark Core functionality
window.SafeParkCore = {
    // Authentication
    checkExistingAuth,
    authenticateUser,
    signOutUser,
    showAuthModal,
    handleAuthSubmit,
    
    // State getters
    isAuthenticated: () => isAuthenticated,
    getCurrentPark: () => currentPark,
    isFirebaseAuthenticated: () => firebaseAuthenticated,
    
    // Team Management
    addTeamMemberFirebase,
    getTeamMembersFirebase,
    updateTeamMemberFirebase,
    deleteTeamMemberFirebase,
    
    // Maintenance Management
    addMaintenanceTaskFirebase,
    getMaintenanceTasksFirebase,
    updateMaintenanceTaskFirebase,
    deleteMaintenanceTaskFirebase,
    
    // Generic Module Data
    addModuleDataFirebase,
    getModuleDataFirebase,
    updateModuleDataFirebase,
    deleteModuleDataFirebase,
    
    // UI Utilities
    showLoading,
    showError,
    showEmptyState,
    populateTeamMemberDropdowns,
    formatDate,
    formatDateTime,
    createStatusBadge,
    
    // Firebase instances (for advanced usage)
    db,
    auth,
    
    // Constants
    parkCodes
};

console.log('SafePark.PRO Core loaded successfully');

export default window.SafeParkCore;
