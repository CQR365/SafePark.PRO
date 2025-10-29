/**
 * SafePark.PRO Accommodation Integration System
 * Handles Firebase integration, data management, and authentication for accommodation module
 */

// Initialize accommodation system
window.AccommodationSystem = {
    // Firebase configuration and initialization
    firebase: null,
    db: null,
    isFirebaseReady: false,
    isOnline: navigator.onLine,

    // Initialize the accommodation system
    init: function() {
        console.log('Initializing SafePark.PRO Accommodation Integration System...');
        
        // Setup Firebase if available
        this.setupFirebase();
        
        // Setup offline/online detection
        this.setupConnectionHandlers();
        
        // Setup authentication
        this.setupAuthentication();
        
        console.log('Accommodation Integration System initialized successfully');
    },

    // Setup Firebase connection
    setupFirebase: function() {
        try {
            if (typeof firebase !== 'undefined' && firebase.firestore) {
                this.firebase = firebase;
                this.db = firebase.firestore();
                this.isFirebaseReady = true;
                console.log('Firebase connected for Accommodation System');
            } else {
                console.warn('Firebase not available - using localStorage only');
                this.isFirebaseReady = false;
            }
        } catch (error) {
            console.error('Firebase setup error:', error);
            this.isFirebaseReady = false;
        }
    },

    // Setup connection handlers
    setupConnectionHandlers: function() {
        window.addEventListener('online', () => {
            this.isOnline = true;
            console.log('Accommodation System: Connection restored - syncing data');
            this.syncToFirebase();
        });

        window.addEventListener('offline', () => {
            this.isOnline = false;
            console.log('Accommodation System: Offline mode - using localStorage backup');
        });
    },

    // Setup authentication
    setupAuthentication: function() {
        // Check for existing authentication
        const authData = this.getCurrentUser();
        if (authData) {
            console.log('Accommodation System: Authenticated as', authData.name);
        } else {
            console.warn('Accommodation System: No authentication found');
        }
    },

    // Get current authenticated user
    getCurrentUser: function() {
        try {
            const authData = JSON.parse(localStorage.getItem('safePark_userSessions_current') || '{}');
            if (authData && authData.user && authData.expires && Date.now() <= authData.expires) {
                return authData.user;
            }
            return null;
        } catch (error) {
            console.error('Error getting current user:', error);
            return null;
        }
    },

    // Save data to Firebase with localStorage backup
    saveToFirebase: async function(collection, data, docId = null) {
        const saveId = docId || data.id || `doc_${Date.now()}`;
        
        // Always save to localStorage first (immediate backup)
        this.saveToLocalStorage(collection, data, saveId);
        
        // Try to save to Firebase if online and available
        if (this.isOnline && this.isFirebaseReady) {
            try {
                await this.db.collection(`safepark_accommodation_${collection}`).doc(saveId).set({
                    ...data,
                    lastUpdated: firebase.firestore.FieldValue.serverTimestamp(),
                    syncStatus: 'synced'
                });
                console.log(`Accommodation data saved to Firebase: ${collection}/${saveId}`);
                return { success: true, location: 'firebase', id: saveId };
            } catch (error) {
                console.error('Firebase save error:', error);
                // Mark as pending sync in localStorage
                this.markPendingSync(collection, saveId);
                return { success: true, location: 'localStorage', id: saveId, pendingSync: true };
            }
        } else {
            // Mark as pending sync for when connection returns
            this.markPendingSync(collection, saveId);
            console.log(`Accommodation data saved to localStorage (offline): ${collection}/${saveId}`);
            return { success: true, location: 'localStorage', id: saveId, pendingSync: true };
        }
    },

    // Save to localStorage
    saveToLocalStorage: function(collection, data, saveId) {
        try {
            const key = `safepark_accommodation_${collection}`;
            const existingData = JSON.parse(localStorage.getItem(key) || '{}');
            existingData[saveId] = {
                ...data,
                lastUpdated: new Date().toISOString(),
                id: saveId
            };
            localStorage.setItem(key, JSON.stringify(existingData));
            console.log(`Accommodation data saved to localStorage: ${collection}/${saveId}`);
        } catch (error) {
            console.error('localStorage save error:', error);
        }
    },

    // Load data from Firebase with localStorage fallback
    loadFromFirebase: async function(collection, docId = null) {
        // Try Firebase first if available and online
        if (this.isOnline && this.isFirebaseReady) {
            try {
                if (docId) {
                    // Load specific document
                    const doc = await this.db.collection(`safepark_accommodation_${collection}`).doc(docId).get();
                    if (doc.exists) {
                        console.log(`Accommodation data loaded from Firebase: ${collection}/${docId}`);
                        return { success: true, data: doc.data(), source: 'firebase' };
                    }
                } else {
                    // Load all documents in collection
                    const snapshot = await this.db.collection(`safepark_accommodation_${collection}`).get();
                    const data = {};
                    snapshot.forEach(doc => {
                        data[doc.id] = doc.data();
                    });
                    console.log(`Accommodation collection loaded from Firebase: ${collection}`);
                    return { success: true, data: data, source: 'firebase' };
                }
            } catch (error) {
                console.error('Firebase load error:', error);
            }
        }

        // Fallback to localStorage
        return this.loadFromLocalStorage(collection, docId);
    },

    // Load from localStorage
    loadFromLocalStorage: function(collection, docId = null) {
        try {
            const key = `safepark_accommodation_${collection}`;
            const data = JSON.parse(localStorage.getItem(key) || '{}');
            
            if (docId) {
                const result = data[docId] || null;
                console.log(`Accommodation data loaded from localStorage: ${collection}/${docId}`);
                return { success: true, data: result, source: 'localStorage' };
            } else {
                console.log(`Accommodation collection loaded from localStorage: ${collection}`);
                return { success: true, data: data, source: 'localStorage' };
            }
        } catch (error) {
            console.error('localStorage load error:', error);
            return { success: false, error: error.message, source: 'localStorage' };
        }
    },

    // Mark data as pending sync
    markPendingSync: function(collection, docId) {
        try {
            const key = 'safepark_accommodation_pendingSync';
            const pendingData = JSON.parse(localStorage.getItem(key) || '[]');
            const syncItem = { collection, docId, timestamp: Date.now() };
            
            // Add if not already in pending list
            if (!pendingData.some(item => item.collection === collection && item.docId === docId)) {
                pendingData.push(syncItem);
                localStorage.setItem(key, JSON.stringify(pendingData));
            }
        } catch (error) {
            console.error('Error marking pending sync:', error);
        }
    },

    // Sync all pending data to Firebase
    syncToFirebase: async function() {
        if (!this.isOnline || !this.isFirebaseReady) {
            console.log('Cannot sync - offline or Firebase unavailable');
            return;
        }

        try {
            const key = 'safepark_accommodation_pendingSync';
            const pendingData = JSON.parse(localStorage.getItem(key) || '[]');
            
            if (pendingData.length === 0) {
                console.log('No pending accommodation data to sync');
                return;
            }

            console.log(`Syncing ${pendingData.length} pending accommodation items...`);
            
            for (const item of pendingData) {
                try {
                    const localData = this.loadFromLocalStorage(item.collection, item.docId);
                    if (localData.success && localData.data) {
                        await this.db.collection(`safepark_accommodation_${item.collection}`).doc(item.docId).set({
                            ...localData.data,
                            lastUpdated: firebase.firestore.FieldValue.serverTimestamp(),
                            syncStatus: 'synced'
                        });
                        console.log(`Synced: ${item.collection}/${item.docId}`);
                    }
                } catch (error) {
                    console.error(`Sync error for ${item.collection}/${item.docId}:`, error);
                }
            }

            // Clear pending sync list
            localStorage.removeItem(key);
            console.log('Accommodation data sync completed');
        } catch (error) {
            console.error('Sync process error:', error);
        }
    },

    // Delete data
    deleteData: async function(collection, docId) {
        // Delete from localStorage
        try {
            const key = `safepark_accommodation_${collection}`;
            const data = JSON.parse(localStorage.getItem(key) || '{}');
            delete data[docId];
            localStorage.setItem(key, JSON.stringify(data));
        } catch (error) {
            console.error('localStorage delete error:', error);
        }

        // Delete from Firebase if available
        if (this.isOnline && this.isFirebaseReady) {
            try {
                await this.db.collection(`safepark_accommodation_${collection}`).doc(docId).delete();
                console.log(`Accommodation data deleted from Firebase: ${collection}/${docId}`);
            } catch (error) {
                console.error('Firebase delete error:', error);
            }
        }

        return { success: true };
    },

    // Get accommodation statistics
    getStatistics: function() {
        try {
            const units = this.loadFromLocalStorage('units').data || {};
            const inspections = this.loadFromLocalStorage('inspections').data || {};
            const maintenance = this.loadFromLocalStorage('maintenance').data || {};
            const quickChecks = this.loadFromLocalStorage('quickChecks').data || {};

            return {
                totalUnits: Object.keys(units).length,
                totalInspections: Object.keys(inspections).length,
                totalMaintenance: Object.keys(maintenance).length,
                totalQuickChecks: Object.keys(quickChecks).length,
                lastUpdated: new Date().toISOString()
            };
        } catch (error) {
            console.error('Error getting statistics:', error);
            return {
                totalUnits: 0,
                totalInspections: 0,
                totalMaintenance: 0,
                totalQuickChecks: 0,
                lastUpdated: new Date().toISOString()
            };
        }
    },

    // Utility functions
    generateId: function(prefix = 'accommodation') {
        return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    },

    formatDate: function(date) {
        return new Date(date).toLocaleDateString('en-GB');
    },

    formatDateTime: function(date) {
        return new Date(date).toLocaleString('en-GB');
    }
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    window.AccommodationSystem.init();
});

// Auto-sync on page unload
window.addEventListener('beforeunload', function() {
    if (window.AccommodationSystem.isOnline && window.AccommodationSystem.isFirebaseReady) {
        window.AccommodationSystem.syncToFirebase();
    }
});

console.log('SafePark.PRO Accommodation Integration loaded successfully');
