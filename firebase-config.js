// Firebase configuration object - CORRECT CONFIG FROM FIREBASE CONSOLE
const firebaseConfig = {
    apiKey: "AIzaSyBvbKg5SAVOON7JoZMOag3-5R24S145xN4",
    authDomain: "safepark-pro.firebaseapp.com",
    projectId: "safepark-pro",
    storageBucket: "safepark-pro.firebasestorage.app",
    messagingSenderId: "511221743341",
    appId: "1:511221743341:web:95bcc7e83d4861578016e4"
};
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
