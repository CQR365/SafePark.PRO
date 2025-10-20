/**
 * SafePark.PRO - Complete Firebase Configuration
 * Fixed for v9.6.1 compat mode - PRODUCTION READY
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
            console.log('Firebase initialized via ensureFirebaseInitialized');
            return true;
        } catch (error) {
            console.error('Delayed Firebase initialization failed:', error);
            return false;
        }
    }
    return !!app;
}

// Export for global access (if needed by other modules)
if (typeof window !== 'undefined') {
    window.firebaseApp = app;
    window.firebaseDb = db;
    window.firebaseAuth = auth;
    window.ensureFirebaseInitialized = ensureFirebaseInitialized;
}

// Auto-retry initialization if Firebase loads after this script
if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', () => {
        if (!app) {
            setTimeout(() => {
                ensureFirebaseInitialized();
            }, 1000);
        }
    });
}
