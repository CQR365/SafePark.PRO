/**
 * SafePark.PRO - Compatible Firebase Configuration
 * Fixed for v9.6.1 compat mode - WORKING VERSION
 * Does NOT interfere with existing auth or maintenance systems
 */

// Firebase configuration object - CORRECT CONFIG FROM FIREBASE CONSOLE
const firebaseConfig = {
    apiKey: "AIzaSyBvbKg5SAVOON7JoZMOag3-5R24S145xN4",
    authDomain: "safepark-pro.firebaseapp.com",
    projectId: "safepark-pro",
    storageBucket: "safepark-pro.firebasestorage.app",
    messagingSenderId: "511221743341",
    appId: "1:511221743341:web:95bcc7e83d4861578016e4"
};

// Initialize Firebase only if not already initialized
let app;
let db;
let auth;

try {
    // Wait for Firebase compat to be available
    if (typeof firebase !== 'undefined') {
        // Check if Firebase is already initialized
        if (firebase.apps && firebase.apps.length > 0) {
            console.log('Firebase already initialized, using existing instance');
            app = firebase.apps[0];
        } else {
            console.log('Initializing Firebase...');
            app = firebase.initializeApp(firebaseConfig);
        }

        // Get Firestore and Auth instances - FIXED COMPAT SYNTAX
        if (firebase.firestore && firebase.auth) {
            db = firebase.firestore();
            auth = firebase.auth();
            console.log('Firebase services initialized successfully');
            console.log('Firebase ready:', true);
        } else {
            console.error('Firebase firestore or auth not available');
        }
    } else {
        console.warn('Firebase not loaded yet, will initialize later');
    }
} catch (error) {
    console.error('Firebase initialization error:', error);
    console.log('Firebase will operate in offline mode');
}

// Compatibility function - initialize if Firebase loads later
function ensureFirebaseInitialized() {
    if (!app && typeof firebase !== 'undefined' && firebase.initializeApp) {
        try {
            app = firebase.initializeApp(firebaseConfig);
            db = firebase.firestore();
            auth = firebase.auth();
            console.log('Firebase initialized on demand');
            return true;
        } catch (error) {
            console.error('On-demand Firebase initialization failed:', error);
            return false;
        }
    }
    return app !== undefined;
}

// Safe database operations with fallbacks
const SafeFirebase = {
    // Check if Firebase is ready
    isReady() {
        return typeof firebase !== 'undefined' && db && auth;
    },

    // Get Firestore instance
    getFirestore() {
        if (!this.isReady()) {
            ensureFirebaseInitialized();
        }
        return db;
    },

    // Get Auth instance
    getAuth() {
        if (!this.isReady()) {
            ensureFirebaseInitialized();
        }
        return auth;
    },

    // Safe collection reference
    collection(name) {
        const firestore = this.getFirestore();
        if (firestore) {
            return firestore.collection(name);
        }
        console.warn(`Firebase not ready, cannot access collection: ${name}`);
        return null;
    },

    // Safe document operations
    async addDocument(collectionName, data) {
        try {
            const collection = this.collection(collectionName);
            if (collection) {
                const docRef = await collection.add({
                    ...data,
                    timestamp: firebase.firestore.FieldValue.serverTimestamp()
                });
                console.log('Document added successfully to Firebase:', docRef.id);
                return { id: docRef.id, ...data };
            } else {
                throw new Error('Firebase not available');
            }
        } catch (error) {
            console.error('Error adding document to Firebase:', error);
            
            // Fallback to localStorage
            const localKey = `safePark_${collectionName}_backup`;
            const existing = JSON.parse(localStorage.getItem(localKey) || '[]');
            const record = {
                id: 'local_' + Date.now(),
                ...data,
                _isLocal: true,
                _timestamp: new Date().toISOString()
            };
            existing.push(record);
            localStorage.setItem(localKey, JSON.stringify(existing));
            console.log('Saved to localStorage backup:', record.id);
            return record;
        }
    },

    // Safe document retrieval
    async getDocuments(collectionName, filters = {}) {
        try {
            const collection = this.collection(collectionName);
            if (collection) {
                let query = collection;
                
                // Apply filters if provided
                Object.keys(filters).forEach(field => {
                    if (filters[field] !== null && filters[field] !== undefined) {
                        query = query.where(field, '==', filters[field]);
                    }
                });
                
                const snapshot = await query.get();
                const documents = [];
                snapshot.forEach(doc => {
                    documents.push({ id: doc.id, ...doc.data() });
                });
                
                console.log(`Retrieved ${documents.length} documents from Firebase`);
                return documents;
            } else {
                throw new Error('Firebase not available');
            }
        } catch (error) {
            console.error('Error getting documents from Firebase:', error);
            
            // Fallback to localStorage
            const localKey = `safePark_${collectionName}_backup`;
            const localData = JSON.parse(localStorage.getItem(localKey) || '[]');
            
            // Apply filters to local data
            let filtered = localData;
            Object.keys(filters).forEach(field => {
                if (filters[field] !== null && filters[field] !== undefined) {
                    filtered = filtered.filter(doc => doc[field] === filters[field]);
                }
            });
            
            console.log(`Returned ${filtered.length} documents from localStorage backup`);
            return filtered;
        }
    },

    // Safe document update
    async updateDocument(collectionName, docId, updates) {
        try {
            const collection = this.collection(collectionName);
            if (collection) {
                await collection.doc(docId).update({
                    ...updates,
                    lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
                });
                console.log('Document updated successfully in Firebase:', docId);
                return true;
            } else {
                throw new Error('Firebase not available');
            }
        } catch (error) {
            console.error('Error updating document in Firebase:', error);
            
            // Fallback to localStorage
            const localKey = `safePark_${collectionName}_backup`;
            const existing = JSON.parse(localStorage.getItem(localKey) || '[]');
            const index = existing.findIndex(doc => doc.id === docId);
            
            if (index > -1) {
                existing[index] = { 
                    ...existing[index], 
                    ...updates,
                    _lastUpdated: new Date().toISOString()
                };
                localStorage.setItem(localKey, JSON.stringify(existing));
                console.log('Updated in localStorage backup:', docId);
                return true;
            }
            
            return false;
        }
    }
};

// Make globally available for compatibility
window.SafeFirebase = SafeFirebase;

// Legacy compatibility - expose Firebase instances globally
if (typeof window !== 'undefined') {
    window.firebaseApp = app;
    window.firebaseDb = db;
    window.firebaseAuth = auth;
}

// Status logging
console.log('SafePark.PRO Compatible Firebase Config Loaded');
console.log('Firebase ready:', SafeFirebase.isReady());
console.log('Available via: window.SafeFirebase');