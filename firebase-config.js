/**
 * SafePark.PRO - Complete Firebase Configuration
 * Fixed for v9.6.1 compat mode - PRODUCTION READY
 * Does NOT interfere with existing auth or maintenance systems
 */

// Ensure this runs only when Firebase is available
(function() {
    'use strict';
    
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

    function initializeFirebase() {
        try {
            // Check if Firebase is available
            if (typeof firebase === 'undefined') {
                console.warn('Firebase not loaded yet, will retry initialization');
                return false;
            }

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
                
                // Set global variables for other scripts
                if (typeof window !== 'undefined') {
                    window.firebaseApp = app;
                    window.firebaseDb = db;
                    window.firebaseAuth = auth;
                    window.firebaseInitialized = true;
                }
                
                return true;
            } else {
                console.error('Firebase firestore or auth not available');
                return false;
            }
        } catch (error) {
            console.error('Firebase initialization error:', error);
            console.log('Firebase will operate in offline mode');
            return false;
        }
    }

    // Compatibility function - initialize if Firebase loads later
    function ensureFirebaseInitialized() {
        if (!app && typeof firebase !== 'undefined' && firebase.initializeApp) {
            return initializeFirebase();
        }
        return !!app;
    }

    // Try immediate initialization
    if (typeof firebase !== 'undefined') {
        initializeFirebase();
    } else {
        // Wait for Firebase to load
        let retryCount = 0;
        const maxRetries = 10;
        const retryInterval = 500;

        function waitForFirebase() {
            if (typeof firebase !== 'undefined') {
                initializeFirebase();
            } else if (retryCount < maxRetries) {
                retryCount++;
                console.log(`Waiting for Firebase to load... attempt ${retryCount}/${maxRetries}`);
                setTimeout(waitForFirebase, retryInterval);
            } else {
                console.error('Firebase failed to load after maximum retries');
            }
        }

        waitForFirebase();
    }

    // Export for global access
    if (typeof window !== 'undefined') {
        window.ensureFirebaseInitialized = ensureFirebaseInitialized;
    }

    // Auto-retry initialization on DOM ready if needed
    if (typeof document !== 'undefined') {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                if (!app) {
                    setTimeout(() => {
                        ensureFirebaseInitialized();
                    }, 1000);
                }
            });
        } else {
            // Document already ready
            if (!app) {
                setTimeout(() => {
                    ensureFirebaseInitialized();
                }, 1000);
            }
        }
    }

})();
