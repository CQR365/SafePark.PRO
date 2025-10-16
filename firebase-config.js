// EMERGENCY UNIFIED FIREBASE CONFIG - REPLACE ALL EXISTING FIREBASE FILES
// This fixes the conflicting configurations that prevent data saving

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { 
    getFirestore, 
    collection, 
    addDoc, 
    getDocs, 
    doc, 
    setDoc,
    updateDoc, 
    deleteDoc, 
    onSnapshot, 
    query, 
    orderBy, 
    where, 
    limit 
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { 
    getAuth, 
    signInAnonymously, 
    onAuthStateChanged, 
    setPersistence, 
    browserLocalPersistence 
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';

// UNIFIED FIREBASE CONFIG - SINGLE SOURCE OF TRUTH
const firebaseConfig = {
    apiKey: "AIzaSyDGpAHia_wEmrhnmYjrPf1n1TrAzwEMiAI",
    authDomain: "safepark-pro.firebaseapp.com",
    projectId: "safepark-pro",
    storageBucket: "safepark-pro.appspot.com",
    messagingSenderId: "278278628953",
    appId: "1:278278628953:web:5c1f3fb76e1959615dc6d6"
};

// Initialize Firebase ONCE
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// Global state
let isAuthenticated = false;
let firebaseAuthenticated = false;
let currentPark = null;

// Park codes
const parkCodes = {
    '1010': { name: 'Ben Nevis Holiday Park', message: 'Welcome Ben Nevis Holiday Park!' },
    '1020': { name: 'Oban Holiday Park', message: 'Welcome Oban Holiday Park!' },
    '1030': { name: 'Tyndrum Holiday Park', message: 'Welcome Tyndrum Holiday Park!' },
    '365': { name: 'Overburns Farm', message: 'Welcome Overburns Farm!' },
    'CQR365SPP25': { name: 'SafePark.PRO Master Access', message: 'Welcome Administrator!' }
};

// SIMPLIFIED AUTHENTICATION - WORKS IMMEDIATELY
async function authenticateUser(code) {
    console.log('🔐 Authenticating with code:', code);
    
    if (!parkCodes[code]) {
        throw new Error('Invalid access code');
    }
    
    try {
        // Set local auth
        isAuthenticated = true;
        currentPark = parkCodes[code].name;
        
        // Set persistence
        await setPersistence(auth, browserLocalPersistence);
        
        // Firebase auth
        const userCredential = await signInAnonymously(auth);
        firebaseAuthenticated = true;
        
        // Save auth state
        const authData = {
            timestamp: Date.now(),
            park: currentPark,
            code: code,
            firebaseAuth: true,
            firebaseUid: userCredential.user.uid
        };
        localStorage.setItem('safePark_auth', JSON.stringify(authData));
        
        console.log('✅ Authentication successful');
        return { 
            success: true, 
            park: currentPark, 
            message: parkCodes[code].message 
        };
        
    } catch (error) {
        console.error('❌ Auth error:', error);
        throw error;
    }
}

// CHECK EXISTING AUTH
async function checkExistingAuth() {
    const authData = localStorage.getItem('safePark_auth');
    if (authData) {
        try {
            const { timestamp, park, code } = JSON.parse(authData);
            const now = Date.now();
            
            // 24 hour auth
            if (now - timestamp < 24 * 60 * 60 * 1000) {
                isAuthenticated = true;
                currentPark = park;
                
                // Re-auth Firebase
                await setPersistence(auth, browserLocalPersistence);
                await signInAnonymously(auth);
                firebaseAuthenticated = true;
                
                console.log('✅ Restored authentication:', park);
                return true;
            }
        } catch (error) {
            console.log('Auth data invalid, clearing');
            localStorage.removeItem('safePark_auth');
        }
    }
    return false;
}

// UNIVERSAL FORM SUBMISSION - THIS IS THE KEY FIX
async function submitFormData(formData, moduleName = 'general') {
    if (!firebaseAuthenticated) {
        console.error('❌ Not authenticated for Firebase');
        throw new Error('Authentication required');
    }
    
    try {
        console.log('💾 Saving form data to Firebase...');
        
        // Create record
        const record = {
            ...formData,
            id: `${moduleName.toUpperCase()}_${Date.now()}`,
            module: moduleName,
            dateCreated: new Date().toISOString(),
            createdBy: auth.currentUser?.uid || 'anonymous',
            holidayPark: formData.holidayPark || currentPark || 'Unknown',
            status: formData.status || 'submitted'
        };
        
        // Determine collection name
        const collectionName = moduleName === 'maintenance' ? 'maintenanceRecords' : 
                              moduleName + 'Records';
        
        // Save to Firebase
        const docRef = await addDoc(collection(db, collectionName), record);
        
        console.log('✅ Data saved successfully:', docRef.id);
        showNotification(`✅ ${moduleName} form submitted successfully!`, 'success');
        
        return { id: docRef.id, ...record };
        
    } catch (error) {
        console.error('❌ Firebase save error:', error);
        showNotification(`❌ Error saving ${moduleName} form`, 'error');
        throw error;
    }
}

// AUTO-DETECT AND SUBMIT ANY FORM
async function handleFormSubmission(formElement) {
    try {
        const formData = new FormData(formElement);
        const data = Object.fromEntries(formData.entries());
        
        // Detect module from URL, form ID, or data
        let module = 'general';
        const url = window.location.pathname.toLowerCase();
        
        if (url.includes('fire')) module = 'fire';
        else if (url.includes('gas')) module = 'gas';
        else if (url.includes('electric')) module = 'electric';
        else if (url.includes('coshh')) module = 'coshh';
        else if (url.includes('loler')) module = 'loler';
        else if (url.includes('puwer')) module = 'puwer';
        else if (url.includes('vehicle')) module = 'vehicles';
        else if (url.includes('food')) module = 'foodBeverage';
        else if (url.includes('risk')) module = 'riskManagement';
        else if (url.includes('incident')) module = 'incidents';
        else if (url.includes('contractor')) module = 'contractors';
        else if (url.includes('accommodation')) module = 'accommodation';
        else if (url.includes('play')) module = 'playParks';
        else if (url.includes('hot-tub')) module = 'hotTub';
        else if (url.includes('ukas')) module = 'ukas';
        else if (url.includes('maintenance')) module = 'maintenance';
        else if (data.module) module = data.module;
        
        console.log(`🎯 Detected module: ${module}`);
        
        return await submitFormData(data, module);
        
    } catch (error) {
        console.error('❌ Form submission failed:', error);
        throw error;
    }
}

// NOTIFICATION SYSTEM
function showNotification(message, type = 'info') {
    let container = document.getElementById('notification-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'notification-container';
        container.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 10000;
        `;
        document.body.appendChild(container);
    }
    
    const notification = document.createElement('div');
    notification.style.cssText = `
        background: ${type === 'success' ? '#28a745' : type === 'error' ? '#dc3545' : '#007bff'};
        color: white;
        padding: 15px 20px;
        border-radius: 8px;
        margin-bottom: 10px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    `;
    notification.textContent = message;
    
    container.appendChild(notification);
    setTimeout(() => notification.remove(), 5000);
}

// INITIALIZE SYSTEM
async function initializeSystem() {
    console.log('🚀 Initializing SafePark.PRO Emergency Fix...');
    
    // Check existing auth
    const wasAuthenticated = await checkExistingAuth();
    
    if (!wasAuthenticated) {
        console.log('🔐 Authentication required');
        // Show simple prompt if no existing auth
        setTimeout(() => {
            const code = prompt('Enter SafePark.PRO Access Code:');
            if (code) {
                authenticateUser(code)
                    .then(() => {
                        location.reload();
                    })
                    .catch(error => {
                        alert('Invalid code: ' + error.message);
                    });
            }
        }, 1000);
    } else {
        console.log('✅ User authenticated, integrating forms...');
        integrateAllForms();
    }
}

// INTEGRATE ALL FORMS ON PAGE
function integrateAllForms() {
    const forms = document.querySelectorAll('form');
    console.log(`🔗 Found ${forms.length} forms to integrate`);
    
    forms.forEach((form, index) => {
        if (form.hasAttribute('data-firebase-integrated')) return;
        
        form.addEventListener('submit', async function(e) {
            // Skip if form has no-firebase attribute
            if (form.hasAttribute('data-no-firebase')) return;
            
            e.preventDefault();
            
            try {
                const result = await handleFormSubmission(form);
                console.log('✅ Form submitted successfully:', result.id);
                
                // Reset form if requested
                if (form.hasAttribute('data-reset-after-submit')) {
                    form.reset();
                }
                
                // Trigger custom event
                form.dispatchEvent(new CustomEvent('safeparkSubmitSuccess', { detail: result }));
                
            } catch (error) {
                console.error('❌ Form submission failed:', error);
                alert('Form submission failed: ' + error.message);
            }
        });
        
        form.setAttribute('data-firebase-integrated', 'true');
        console.log(`✅ Integrated form ${index + 1}`);
    });
}

// GLOBAL EXPORTS
window.SafeParkEmergencyFix = {
    authenticateUser,
    checkExistingAuth,
    submitFormData,
    handleFormSubmission,
    isAuthenticated: () => isAuthenticated,
    getCurrentPark: () => currentPark,
    db,
    auth
};

// AUTO-INITIALIZE
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeSystem);
} else {
    initializeSystem();
}

console.log('🆘 EMERGENCY FIX LOADED - Data saving should work now!');
