/**
 * Complete Safety Ecosystem - Standardized Firebase Configuration
 * safepark.pro + safeteam.pro + safemanager.pro + safecare.pro
 * Fixed for v9.6.1 compat mode - PRODUCTION READY
 * Sets standardized global variables for ALL modules across entire ecosystem
 */

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
                
                // SET STANDARDIZED GLOBAL VARIABLES - ALL MODULES WILL USE THESE
                if (typeof window !== 'undefined') {
                    // PRIMARY: Standard naming convention
                    window.firebaseApp = app;
                    window.firebaseDb = db;
                    window.firebaseAuth = auth;
                    window.firebaseInitialized = true;
                    
                    // LEGACY COMPATIBILITY: Keep existing variable names
                    window.db = db;           // For existing code compatibility
                    window.app = app;         // For existing code compatibility
                    window.auth = auth;       // For existing code compatibility
                    
                    // FORCE IMMEDIATE GLOBAL ACCESS
                    window.firebase_app = app;
                    window.firebase_db = db;
                    window.firebase_auth = auth;
                    
                    console.log('🎯 STANDARDIZED FIREBASE GLOBALS SET:');
                    console.log('  PRIMARY: window.firebaseDb (use this in all new code)');
                    console.log('  LEGACY:  window.db (for compatibility)');
                    console.log('  STATUS:  window.firebaseInitialized = true');
                    
                    // TRIPLE-VERIFICATION: Ensure variables are actually set
                    setTimeout(() => {
                        if (window.firebaseDb && window.db) {
                            console.log('✅ Firebase global variables verified and ready');
                            console.log('   window.firebaseDb type:', typeof window.firebaseDb);
                            console.log('   window.db type:', typeof window.db);
                            
                            // Dispatch custom event for modules waiting for Firebase
                            const event = new CustomEvent('firebaseReady', { 
                                detail: { 
                                    db: window.firebaseDb, 
                                    auth: window.firebaseAuth,
                                    app: window.firebaseApp 
                                } 
                            });
                            window.dispatchEvent(event);
                            console.log('📢 firebaseReady event dispatched');
                        } else {
                            console.error('❌ Global Firebase variables failed to set properly!');
                        }
                    }, 50);
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

    // Compatibility function - ensure Firebase is initialized
    function ensureFirebaseInitialized() {
        if (!app && typeof firebase !== 'undefined' && firebase.initializeApp) {
            return initializeFirebase();
        }
        return !!app;
    }

    // Function to get standardized Firebase reference
    function getStandardFirebase() {
        return {
            app: window.firebaseApp || window.app,
            db: window.firebaseDb || window.db,
            auth: window.firebaseAuth || window.auth,
            initialized: window.firebaseInitialized || false
        };
    }

    // Try immediate initialization
    if (typeof firebase !== 'undefined') {
        initializeFirebase();
    } else {
        // Wait for Firebase to load with improved retry logic
        let retryCount = 0;
        const maxRetries = 20;  // Increased retries
        const retryInterval = 250;  // Faster retry interval

        function waitForFirebase() {
            if (typeof firebase !== 'undefined') {
                console.log('📦 Firebase loaded, initializing...');
                initializeFirebase();
            } else if (retryCount < maxRetries) {
                retryCount++;
                console.log(`⏳ Waiting for Firebase to load... attempt ${retryCount}/${maxRetries}`);
                setTimeout(waitForFirebase, retryInterval);
            } else {
                console.error('❌ Firebase failed to load after maximum retries');
                console.error('❌ SafePark system will NOT function without Firebase');
            }
        }

        waitForFirebase();
    }

    // Export functions for global access
    if (typeof window !== 'undefined') {
        window.ensureFirebaseInitialized = ensureFirebaseInitialized;
        window.getStandardFirebase = getStandardFirebase;
        
        // STANDARDIZED FIREBASE CHECKER - use this in all modules
        window.checkFirebaseReady = function() {
            const firebase = getStandardFirebase();
            if (!firebase.db || !firebase.initialized) {
                throw new Error('🔥 CRITICAL: Firebase not ready. Use window.firebaseDb for database access.');
            }
            return firebase;
        };
    }

    // Auto-retry initialization on DOM ready if needed
    if (typeof document !== 'undefined') {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                if (!app) {
                    console.log('🔄 DOM ready - retrying Firebase initialization...');
                    setTimeout(() => {
                        ensureFirebaseInitialized();
                    }, 500);
                }
            });
        } else {
            // Document already ready
            if (!app) {
                console.log('🔄 Document ready - retrying Firebase initialization...');
                setTimeout(() => {
                    ensureFirebaseInitialized();
                }, 500);
            }
        }
    }

    console.log('🔥 Complete Safety Ecosystem Firebase Configuration loaded');
    console.log('🏢 Ecosystem: safepark.pro + safeteam.pro + safemanager.pro + safecare.pro');
    console.log('📊 Standardized global variables will be set when Firebase loads');
    console.log('🎯 All modules should use: window.firebaseDb for database access');

})();
