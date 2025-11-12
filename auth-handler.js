// Complete Safety Ecosystem Authentication Handler - FIREBASE-ONLY VERSION
// safepark.pro + safeteam.pro + safemanager.pro + safecare.pro
// Uses global Firebase as the single source of truth for all authentication across all modules

window.SafeParkAuth = {
    
    // Firebase reference - uses global Firebase from firebase-config.js
    db: null,
    firebaseReady: false,
    
    // Initialize Firebase connection
    init: function() {
        const maxAttempts = 50;
        let attempts = 0;
        
        const checkFirebase = () => {
            attempts++;
            
            // Use standardized global Firebase reference
            if (window.firebaseDb) {
                this.db = window.firebaseDb;
                this.firebaseReady = true;
                console.log('✅ SafeParkAuth initialized with global Firebase');
                this.initializeDefaultUsers();
                return;
            } else if (window.db) {
                this.db = window.db;
                this.firebaseReady = true;
                console.log('✅ SafeParkAuth initialized with fallback Firebase reference');
                this.initializeDefaultUsers();
                return;
            } else if (typeof firebase !== 'undefined' && firebase.firestore) {
                this.db = firebase.firestore();
                this.firebaseReady = true;
                console.log('✅ SafeParkAuth initialized with direct Firebase');
                this.initializeDefaultUsers();
                return;
            }
            
            console.log(`🔍 Firebase check attempt ${attempts}/${maxAttempts} for authentication`);
            
            if (attempts < maxAttempts) {
                setTimeout(checkFirebase, 100);
            } else {
                console.error('❌ CRITICAL: Firebase not available - Authentication system will NOT function');
                this.firebaseReady = false;
            }
        };
        
        checkFirebase();
    },
    
    // Initialize default users in Firebase (run once)
    initializeDefaultUsers: async function() {
        if (!this.firebaseReady) {
            console.error('❌ Cannot initialize users - Firebase not ready');
            return;
        }
        
        try {
            // Check if users collection exists
            const usersSnapshot = await this.db.collection('users').limit(1).get();
            
            if (usersSnapshot.empty) {
                console.log('📝 No users found - initializing default users in Firebase...');
                await this.createDefaultUsers();
            } else {
                console.log('✅ Users collection already exists in Firebase');
            }
        } catch (error) {
            console.error('❌ Error checking users collection:', error);
        }
    },
    
    // Create default users in Firebase
    createDefaultUsers: async function() {
        const defaultUsers = {
            // Park Management Users
            'overburns_manager': {
                name: 'Overburns Farm Manager',
                role: 'Manager',
                park: 'Overburns Farm',
                accessCode: '365',
                type: 'park',
                active: true,
                createdAt: new Date().toISOString()
            },
            'bennevis_manager': {
                name: 'Lesleyanne',
                role: 'Park Manager', 
                park: 'Ben Nevis Holiday Park',
                accessCode: '1010',
                type: 'park',
                active: true,
                createdAt: new Date().toISOString()
            },
            'oban_manager': {
                name: 'Siobhan',
                role: 'Park Manager',
                park: 'Oban Holiday Park',
                accessCode: '1020',
                type: 'park',
                active: true,
                createdAt: new Date().toISOString()
            },
            'tyndrum_manager': {
                name: 'Tyndrum Holiday Park Manager',
                role: 'Park Manager',
                park: 'Tyndrum Holiday Park',
                accessCode: '1030',
                type: 'park',
                active: true,
                createdAt: new Date().toISOString()
            },
            
            // Overburns Farm Individual Team Members (365xxx)
            'overburns_john': {
                name: 'John Smith',
                role: 'Maintenance Supervisor',
                park: 'Overburns Farm',
                accessCode: '365001',
                type: 'individual',
                active: true,
                createdAt: new Date().toISOString()
            },
            'overburns_sarah': {
                name: 'Sarah Wilson',
                role: 'Reception Manager',
                park: 'Overburns Farm',
                accessCode: '365002',
                type: 'individual',
                active: true,
                createdAt: new Date().toISOString()
            },
            'overburns_mike': {
                name: 'Mike Davis',
                role: 'Groundskeeper',
                park: 'Overburns Farm',
                accessCode: '365003',
                type: 'individual',
                active: true,
                createdAt: new Date().toISOString()
            },
            'overburns_emma': {
                name: 'Emma Thompson',
                role: 'Cleaner',
                park: 'Overburns Farm',
                accessCode: '365004',
                type: 'individual',
                active: true,
                createdAt: new Date().toISOString()
            },
            'overburns_david': {
                name: 'David Brown',
                role: 'Security',
                park: 'Overburns Farm',
                accessCode: '365005',
                type: 'individual',
                active: true,
                createdAt: new Date().toISOString()
            },
            
            // Ben Nevis Individual Team Members (1010xxx)
            'bennevis_david': {
                name: 'David',
                role: 'Grounds & Maintenance Manager',
                park: 'Ben Nevis Holiday Park',
                accessCode: '1010001',
                type: 'individual',
                active: true,
                createdAt: new Date().toISOString()
            },
            'bennevis_kelly': {
                name: 'Kelly',
                role: 'Team BN',
                park: 'Ben Nevis Holiday Park',
                accessCode: '1010002',
                type: 'individual',
                active: true,
                createdAt: new Date().toISOString()
            },
            'bennevis_rik': {
                name: 'Rik',
                role: 'Team BN',
                park: 'Ben Nevis Holiday Park',
                accessCode: '1010003',
                type: 'individual',
                active: true,
                createdAt: new Date().toISOString()
            },
            'bennevis_sam': {
                name: 'Sam',
                role: 'Team BN',
                park: 'Ben Nevis Holiday Park',
                accessCode: '1010004',
                type: 'individual',
                active: true,
                createdAt: new Date().toISOString()
            },
            'bennevis_vinny': {
                name: 'Vinny',
                role: 'Team BN',
                park: 'Ben Nevis Holiday Park',
                accessCode: '1010005',
                type: 'individual',
                active: true,
                createdAt: new Date().toISOString()
            },
            'bennevis_cooper': {
                name: 'Cooper',
                role: 'Team BN',
                park: 'Ben Nevis Holiday Park',
                accessCode: '1010007',
                type: 'individual',
                active: true,
                createdAt: new Date().toISOString()
            },
            'bennevis_ewa': {
                name: 'Ewa',
                role: 'Team BN',
                park: 'Ben Nevis Holiday Park',
                accessCode: '1010008',
                type: 'individual',
                active: true,
                createdAt: new Date().toISOString()
            },
            
            // Oban Individual Team Members (1020xxx)
            'oban_murray': {
                name: 'Murray',
                role: 'Grounds & Maintenance Manager',
                park: 'Oban Holiday Park',
                accessCode: '1020001',
                type: 'individual',
                active: true,
                createdAt: new Date().toISOString()
            },
            'oban_allan': {
                name: 'Allan',
                role: 'Team OBN',
                park: 'Oban Holiday Park',
                accessCode: '1020002',
                type: 'individual',
                active: true,
                createdAt: new Date().toISOString()
            },
            'oban_nathan': {
                name: 'Nathan',
                role: 'Team OBN',
                park: 'Oban Holiday Park',
                accessCode: '1020003',
                type: 'individual',
                active: true,
                createdAt: new Date().toISOString()
            },
            
            // Tyndrum Individual Team Members (1030xxx)
            'tyndrum_alasdair': {
                name: 'Alasdair Fraser',
                role: 'Assistant Manager',
                park: 'Tyndrum Holiday Park',
                accessCode: '1030001',
                type: 'individual',
                active: true,
                createdAt: new Date().toISOString()
            },
            
            // Master Access
            'admin': {
                name: 'Safety Ecosystem System Administrator',
                role: 'System Administrator',
                park: 'All Highland Holidays Parks + Complete Safety Ecosystem',
                accessCode: 'CQR365SPP25',
                type: 'master',
                active: true,
                modules: ['safepark.pro', 'safeteam.pro', 'safemanager.pro', 'safecare.pro'],
                createdAt: new Date().toISOString()
            }
        };
        
        // Save each user to Firebase
        for (const [userId, userData] of Object.entries(defaultUsers)) {
            try {
                await this.db.collection('users').doc(userId).set(userData);
                console.log(`✅ Created user in Firebase: ${userData.name}`);
            } catch (error) {
                console.error(`❌ Failed to create user ${userId}:`, error);
            }
        }
        
        console.log('✅ All default users created in Firebase');
    },
    
    // Authenticate user by access code (Firebase-only)
    authenticateByAccessCode: async function(accessCode) {
        if (!this.firebaseReady) {
            throw new Error('Firebase not ready - authentication unavailable');
        }
        
        try {
            const usersSnapshot = await this.db.collection('users')
                .where('accessCode', '==', accessCode)
                .where('active', '==', true)
                .limit(1)
                .get();
            
            if (usersSnapshot.empty) {
                console.log('❌ Invalid access code:', accessCode);
                return null;
            }
            
            const userDoc = usersSnapshot.docs[0];
            const user = { id: userDoc.id, ...userDoc.data() };
            
            console.log(`✅ User authenticated: ${user.name} at ${user.park}`);
            
            // Create session record in Firebase
            await this.createSession(user);
            
            return user;
        } catch (error) {
            console.error('❌ Authentication error:', error);
            throw error;
        }
    },
    
    // Create user session in Firebase
    createSession: async function(user) {
        try {
            const session = {
                userId: user.id,
                userName: user.name,
                userRole: user.role,
                userPark: user.park,
                loginTime: new Date().toISOString(),
                expiresAt: new Date(Date.now() + (24 * 60 * 60 * 1000)).toISOString(), // 24 hours
                active: true
            };
            
            await this.db.collection('sessions').add(session);
            console.log('✅ User session created in Firebase');
            
            // Update authState for compatibility with existing code
            if (typeof window.authState !== 'undefined') {
                window.authState = {
                    isAuthenticated: true,
                    currentUser: user,
                    sessionExpiry: session.expiresAt
                };
            }
            
        } catch (error) {
            console.error('❌ Failed to create session:', error);
        }
    },
    
    // Get current authenticated user
    getCurrentUser: async function() {
        if (!this.firebaseReady) {
            return null;
        }
        
        // For testing/development - return default user if no session system
        if (window.authState && window.authState.currentUser) {
            return window.authState.currentUser;
        }
        
        // In production, check active sessions
        try {
            const now = new Date().toISOString();
            const sessionsSnapshot = await this.db.collection('sessions')
                .where('active', '==', true)
                .where('expiresAt', '>', now)
                .orderBy('loginTime', 'desc')
                .limit(1)
                .get();
            
            if (!sessionsSnapshot.empty) {
                const sessionDoc = sessionsSnapshot.docs[0];
                const session = sessionDoc.data();
                
                // Get full user data
                const userDoc = await this.db.collection('users').doc(session.userId).get();
                if (userDoc.exists) {
                    return { id: userDoc.id, ...userDoc.data() };
                }
            }
        } catch (error) {
            console.error('❌ Error getting current user:', error);
        }
        
        return null;
    },
    
    // Logout - deactivate session
    logout: async function() {
        if (!this.firebaseReady) {
            console.warn('⚠️ Cannot logout - Firebase not ready');
            return;
        }
        
        try {
            // Deactivate current sessions
            const now = new Date().toISOString();
            const sessionsSnapshot = await this.db.collection('sessions')
                .where('active', '==', true)
                .where('expiresAt', '>', now)
                .get();
            
            const batch = this.db.batch();
            sessionsSnapshot.docs.forEach(doc => {
                batch.update(doc.ref, { active: false, logoutTime: now });
            });
            await batch.commit();
            
            console.log('✅ User logged out - sessions deactivated');
            
            // Clear authState
            if (typeof window.authState !== 'undefined') {
                window.authState = {
                    isAuthenticated: false,
                    currentUser: null,
                    sessionExpiry: null
                };
            }
        } catch (error) {
            console.error('❌ Logout error:', error);
        }
    },
    
    // Check if user is authenticated
    isAuthenticated: function() {
        if (!this.firebaseReady) {
            return false;
        }
        
        return window.authState && window.authState.isAuthenticated && window.authState.currentUser;
    },
    
    // Get all users (admin function)
    getAllUsers: async function() {
        if (!this.firebaseReady) {
            throw new Error('Firebase not ready');
        }
        
        try {
            const usersSnapshot = await this.db.collection('users').get();
            const users = [];
            usersSnapshot.forEach(doc => {
                users.push({ id: doc.id, ...doc.data() });
            });
            return users;
        } catch (error) {
            console.error('❌ Error getting all users:', error);
            throw error;
        }
    },
    
    // Find user by access code (for testing)
    getUserByAccessCode: async function(accessCode) {
        return await this.authenticateByAccessCode(accessCode);
    }
};

// Initialize when loaded
window.SafeParkAuth.init();

// GLOBAL COMPATIBILITY FUNCTIONS - Required by all modules
// These functions provide backwards compatibility with existing module code

async function checkAuthentication() {
    try {
        // Wait for SafeParkAuth to be ready
        if (!window.SafeParkAuth || !window.SafeParkAuth.firebaseReady) {
            console.log('🔍 Authentication check: Firebase not ready, authentication required');
            return false; // Require login if Firebase not ready
        }
        
        // Check if user is authenticated
        const isAuth = window.SafeParkAuth.isAuthenticated();
        if (isAuth) {
            console.log('✅ Authentication check: User authenticated');
            return true;
        }
        
        // No authenticated user - require login
        console.log('❌ Authentication check: No authenticated user - login required');
        return false;
        
    } catch (error) {
        console.error('❌ Authentication check failed:', error);
        return false; // Require login on error
    }
}

function getCurrentUser() {
    if (window.authState && window.authState.currentUser) {
        return window.authState.currentUser;
    }
    
    // No current user - return null (will require login)
    return null;
}

// Make functions globally available
window.checkAuthentication = checkAuthentication;
window.getCurrentUser = getCurrentUser;

// Console helpers for development
console.log('🔥 Complete Safety Ecosystem Authentication Handler loaded (FIREBASE-ONLY)');
console.log('🏢 Modules: safepark.pro + safeteam.pro + safemanager.pro + safecare.pro');
console.log('📊 Uses global Firebase as single source of truth across all modules');
console.log('🚫 NO localStorage usage - all data in Firebase');
console.log('💡 Use: SafeParkAuth.authenticateByAccessCode("365") to login');
console.log('🔗 Authentication shared across entire safety ecosystem');
console.log('✅ Global compatibility functions added: checkAuthentication(), getCurrentUser()');
console.log('🔒 REAL AUTHENTICATION REQUIRED - No test user fallbacks');
