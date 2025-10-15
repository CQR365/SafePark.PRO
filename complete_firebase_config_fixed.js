// firebase-config.js - Complete Firebase Integration for SafePark.PRO
// Updated with real SafePark-PRO configuration values and fixes

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { 
    getFirestore, 
    collection, 
    addDoc, 
    getDocs, 
    updateDoc, 
    deleteDoc, 
    doc, 
    onSnapshot,
    query,
    orderBy,
    limit,
    where,
    enableNetwork,
    disableNetwork,
    getDoc,
    setDoc
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { 
    getAuth, 
    signInAnonymously, 
    onAuthStateChanged 
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';

// ============================================================================
// REAL FIREBASE CONFIGURATION - SafePark-PRO
// ============================================================================
const firebaseConfig = {
    apiKey: "AIzaSyBvbKg5SAVQCN7JqZMOag3-5R24S145xM4",
    authDomain: "safepark-pro.firebaseapp.com",
    projectId: "safepark-pro", 
    storageBucket: "safepark-pro.firebasestorage.app",
    messagingSenderId: "511221743341",
    appId: "1:511221743341:web:95bcc7e83d48615780164",
    measurementId: "G-R1L16F7JJG"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// ============================================================================
// ENHANCED FIREBASE SAFEPARK DATA MANAGER
// ============================================================================
class FirebaseSafeParkDataManager {
    constructor() {
        this.maintenanceRecords = [];
        this.maintenanceTasks = [];
        this.recentActivities = [];
        this.userPresence = new Map();
        this.isOnline = navigator.onLine;
        this.offlineQueue = [];
        this.currentUser = null;
        this.listeners = []; // Track listeners for cleanup
        
        // Highland Holidays configuration
        this.holidayParks = [
            'Ben Nevis Holiday Park',
            'Oban Holiday Park', 
            'Tyndrum Holiday Park',
            'Overburns Farm'
        ];
        
        this.businessAreas = [
            'Reception & Administration',
            'Accommodation Services',
            'Play Areas & Recreation',
            'Maintenance & Grounds',
            'Food & Beverage',
            'Security & Safety',
            'Water Activities',
            'Entertainment'
        ];
        
        // Initialize the system
        this.initializeAuth();
        this.setupOfflineHandling();
        this.initializeNotificationSystem();
        
        console.log('SafePark.PRO Firebase integration initialized with real config');
    }

    // ========================================================================
    // AUTHENTICATION & INITIALIZATION - FIXED VERSION
    // ========================================================================
    async initializeAuth() {
        try {
            console.log('Starting Firebase authentication...');
            
            // Sign in anonymously for basic access
            const userCredential = await signInAnonymously(auth);
            console.log('Anonymous sign-in successful:', userCredential.user.uid);
            
            onAuthStateChanged(auth, async (user) => {
                if (user) {
                    console.log('Auth state changed - User authenticated:', user.uid);
                    this.currentUser = user;
                    
                    // CRITICAL FIX: Wait for authentication to propagate
                    console.log('Waiting for authentication to propagate...');
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    
                    // Now initialize Firebase listeners with retry logic
                    try {
                        await this.initializeFirebaseListenersWithRetry();
                        this.loadDataFromFirebase();
                        this.setupPresenceSystem();
                        this.showNotification('Firebase connected successfully!', 'success');
                        console.log('Firebase system fully initialized');
                    } catch (error) {
                        console.error('Error initializing Firebase listeners:', error);
                        this.showNotification('Some Firebase features may be limited', 'warning');
                    }
                    
                } else {
                    console.log('Authentication failed - no user');
                    this.showNotification('Authentication failed. Using offline mode.', 'warning');
                }
            });
            
        } catch (error) {
            console.error('Authentication error:', error);
            
            // Provide specific error messages
            if (error.code === 'auth/network-request-failed') {
                this.showNotification('Network error. Check your connection.', 'error');
            } else if (error.code === 'auth/too-many-requests') {
                this.showNotification('Too many requests. Please wait and try again.', 'error');
            } else {
                this.showNotification('Firebase connection failed. Working offline.', 'error');
            }
        }
    }

    // NEW METHOD: Initialize listeners with retry logic
    async initializeFirebaseListenersWithRetry(maxRetries = 3) {
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                console.log(`Initializing Firebase listeners (attempt ${attempt}/${maxRetries})`);
                await this.initializeFirebaseListeners();
                console.log('Firebase listeners initialized successfully');
                return; // Success, exit the retry loop
                
            } catch (error) {
                console.error(`Attempt ${attempt} failed:`, error);
                
                if (attempt === maxRetries) {
                    console.error('All retry attempts failed');
                    throw error; // Re-throw on final attempt
                }
                
                // Wait before retrying (exponential backoff)
                const delay = Math.pow(2, attempt) * 1000; // 2s, 4s, 8s
                console.log(`Waiting ${delay/1000}s before retry...`);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }

    // ========================================================================
    // OFFLINE/ONLINE HANDLING
    // ========================================================================
    setupOfflineHandling() {
        window.addEventListener('online', () => {
            this.isOnline = true;
            this.showNotification('Back online! Syncing data...', 'success');
            this.processOfflineQueue();
            enableNetwork(db);
        });

        window.addEventListener('offline', () => {
            this.isOnline = false;
            this.showNotification('Working offline. Changes will sync when online.', 'warning');
            disableNetwork(db);
        });
    }

    async processOfflineQueue() {
        while (this.offlineQueue.length > 0) {
            const operation = this.offlineQueue.shift();
            try {
                await operation();
                console.log('Offline operation synced');
            } catch (error) {
                console.error('Failed to sync offline operation:', error);
                this.offlineQueue.unshift(operation);
                break;
            }
        }
        
        if (this.offlineQueue.length === 0) {
            this.showNotification('All offline changes synced successfully!', 'success');
        }
    }

    // ========================================================================
    // NOTIFICATION SYSTEM
    // ========================================================================
    initializeNotificationSystem() {
        // Request notification permission
        if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission();
        }
        
        // Create notification container if it doesn't exist
        if (!document.getElementById('firebase-notification-container')) {
            const container = document.createElement('div');
            container.id = 'firebase-notification-container';
            container.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 10000;
                pointer-events: none;
                max-width: 350px;
            `;
            document.body.appendChild(container);
        }
    }

    showNotification(message, type = 'info', duration = 5000) {
        const container = document.getElementById('firebase-notification-container');
        if (!container) return;
        
        const notification = document.createElement('div');
        notification.style.cssText = `
            background: ${type === 'success' ? '#28a745' : type === 'error' ? '#dc3545' : type === 'warning' ? '#ffc107' : '#007bff'};
            color: ${type === 'warning' ? '#000' : '#fff'};
            padding: 15px 20px;
            border-radius: 8px;
            margin-bottom: 10px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            pointer-events: auto;
            cursor: pointer;
            transform: translateX(100%);
            transition: transform 0.3s ease;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            font-size: 14px;
            line-height: 1.4;
        `;
        notification.textContent = message;
        
        container.appendChild(notification);
        
        // Animate in
        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
        }, 100);
        
        // Auto remove
        setTimeout(() => {
            this.removeNotification(notification);
        }, duration);
        
        // Click to dismiss
        notification.addEventListener('click', () => {
            this.removeNotification(notification);
        });
    }

    removeNotification(notification) {
        notification.style.transform = 'translateX(100%)';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }

    // ========================================================================
    // REAL-TIME FIREBASE LISTENERS - FIXED WITHOUT TEAM MEMBER MIGRATION
    // ========================================================================
    async initializeFirebaseListeners() {
        // Clear existing listeners
        this.listeners.forEach(unsubscribe => unsubscribe());
        this.listeners = [];

        try {
            // Check if this is first time setup (empty Firebase collections)
            const maintenanceSnapshot = await getDocs(collection(db, 'maintenanceRecords'));
            
            // If Firebase is empty but localStorage has data, migrate automatically
            if (maintenanceSnapshot.empty) {
                const localMaintenance = JSON.parse(localStorage.getItem('safePark_maintenanceRecords') || '[]');
                
                if (localMaintenance.length > 0) {
                    console.log('Auto-migrating localStorage maintenance data to Firebase...');
                    await this.migrateFromLocalStorage();
                    return; // Exit and let the migration restart the listeners
                }
            }
        } catch (error) {
            console.error('Error checking Firebase collections:', error);
            // Continue with normal listener setup if check fails
        }

        // Maintenance records listener
        const maintenanceUnsubscribe = onSnapshot(
            query(
                collection(db, 'maintenanceRecords'), 
                orderBy('dateCreated', 'desc'),
                limit(100)
            ), 
            (snapshot) => {
                const oldPendingCount = this.maintenanceRecords.filter(r => r.status === 'pending').length;
                this.maintenanceRecords = [];
                snapshot.forEach((doc) => {
                    this.maintenanceRecords.push({ id: doc.id, ...doc.data() });
                });
                
                const newPendingCount = this.maintenanceRecords.filter(r => r.status === 'pending').length;
                if (newPendingCount > oldPendingCount && oldPendingCount > 0) {
                    this.showNotification('New maintenance task created!', 'warning');
                }
                
                this.displayMaintenanceRecords();
                this.updateStats();
            },
            (error) => {
                console.error('Error listening to maintenance records:', error);
                this.showNotification('Error syncing maintenance records', 'error');
            }
        );

        // Maintenance tasks listener (for compatibility with other modules)
        const tasksUnsubscribe = onSnapshot(
            query(
                collection(db, 'maintenanceTasks'), 
                orderBy('createdDate', 'desc'),
                limit(100)
            ), 
            (snapshot) => {
                this.maintenanceTasks = [];
                snapshot.forEach((doc) => {
                    this.maintenanceTasks.push({ id: doc.id, ...doc.data() });
                });
                
                this.displayMaintenanceRecords();
                this.updateStats();
            },
            (error) => {
                console.error('Error listening to maintenance tasks:', error);
            }
        );

        // Recent activities listener
        const activitiesUnsubscribe = onSnapshot(
            query(
                collection(db, 'recentActivities'), 
                orderBy('timestamp', 'desc'),
                limit(50)
            ), 
            (snapshot) => {
                this.recentActivities = [];
                snapshot.forEach((doc) => {
                    this.recentActivities.push({ id: doc.id, ...doc.data() });
                });
                this.displayRecentActivities();
            }
        );

        // Store listeners for cleanup
        this.listeners.push(maintenanceUnsubscribe, tasksUnsubscribe, activitiesUnsubscribe);
    }

    // ========================================================================
    // MAINTENANCE INTEGRATION FOR MAINTENANCE_INTEGRATION.JS COMPATIBILITY
    // ========================================================================
    async createMaintenanceRequest(requestData) {
        const record = {
            id: 'MAINT_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
            title: requestData.title,
            description: requestData.description,
            priority: requestData.priority || 'medium',
            category: requestData.category || 'General',
            location: requestData.location || 'Not specified',
            status: 'pending',
            createdAt: new Date().toISOString(),
            dateCreated: new Date().toISOString(),
            createdBy: requestData.createdBy || 'System',
            holidayPark: requestData.holidayPark || 'Unknown',
            assignedTo: requestData.assignedTo || 'Unassigned'
        };

        try {
            await setDoc(doc(db, 'maintenanceRecords', record.id), record);
            console.log('Maintenance request created via Firebase:', record.id);
            return { id: record.id, ...record };
        } catch (error) {
            console.error('Error creating maintenance request:', error);
            throw error;
        }
    }

    async getMaintenanceStats() {
        const allRecords = [...this.maintenanceRecords, ...this.maintenanceTasks];
        
        return {
            total: allRecords.length,
            pending: allRecords.filter(r => r.status === 'pending').length,
            inProgress: allRecords.filter(r => r.status === 'in-progress').length,
            completed: allRecords.filter(r => r.status === 'completed').length,
            critical: allRecords.filter(r => r.priority === 'critical').length,
            high: allRecords.filter(r => r.priority === 'high').length
        };
    }

    async getMaintenanceRecords(options = {}) {
        let allRecords = [...this.maintenanceRecords, ...this.maintenanceTasks];
        
        if (options.status) {
            allRecords = allRecords.filter(r => r.status === options.status);
        }
        
        if (options.limit) {
            allRecords = allRecords.slice(0, options.limit);
        }
        
        return allRecords.sort((a, b) => 
            new Date(b.dateCreated || b.createdAt) - new Date(a.dateCreated || a.createdAt)
        );
    }

    formatDate(dateString) {
        if (!dateString) return 'N/A';
        try {
            return new Date(dateString).toLocaleDateString('en-GB', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch (error) {
            return dateString;
        }
    }

    getPriorityBadgeHTML(priority) {
        const colors = {
            critical: '#DC3545',
            high: '#FFC107',
            medium: '#17A2B8',
            low: '#28A745'
        };
        const color = colors[priority] || colors.medium;
        return `<span style="background: ${color}; color: white; padding: 4px 12px; border-radius: 20px; font-size: 0.85rem; font-weight: 600; text-transform: uppercase;">${priority}</span>`;
    }

    getStatusBadgeHTML(status) {
        const colors = {
            pending: '#FFC107',
            'in-progress': '#17A2B8',
            completed: '#28A745',
            cancelled: '#6C757D'
        };
        const color = colors[status] || colors.pending;
        return `<span style="background: ${color}; color: white; padding: 4px 12px; border-radius: 20px; font-size: 0.85rem; font-weight: 600;">${status.replace('-', ' ').toUpperCase()}</span>`;
    }

    async updateMaintenanceStatus(recordId, newStatus, notes = '') {
        try {
            const updateData = {
                status: newStatus,
                lastUpdated: new Date().toISOString()
            };

            if (newStatus === 'completed') {
                updateData.completedAt = new Date().toISOString();
                updateData.completedBy = this.currentUser?.uid || 'System';
                updateData.completionNotes = notes;
            }

            await updateDoc(doc(db, 'maintenanceRecords', recordId), updateData);
            console.log('Maintenance record updated:', recordId);
            return updateData;
        } catch (error) {
            console.error('Error updating maintenance status:', error);
            throw error;
        }
    }

    // Real-time listener for maintenance stats
    listenToMaintenanceStats(callback, parkFilter = null) {
        try {
            let query_ref = collection(db, 'maintenanceRecords');
            
            if (parkFilter) {
                query_ref = query(query_ref, where('holidayPark', '==', parkFilter));
            }
            
            const unsubscribe = onSnapshot(query_ref, (snapshot) => {
                const records = [];
                snapshot.forEach(doc => records.push(doc.data()));
                
                const stats = {
                    total: records.length,
                    pending: records.filter(r => r.status === 'pending').length,
                    inProgress: records.filter(r => r.status === 'in-progress').length,
                    completed: records.filter(r => r.status === 'completed').length,
                    critical: records.filter(r => r.priority === 'critical').length,
                    high: records.filter(r => r.priority === 'high').length
                };
                
                callback(stats);
            });
            
            this.listeners.push(unsubscribe);
            return unsubscribe;
        } catch (error) {
            console.error('Error setting up maintenance stats listener:', error);
            return () => {};
        }
    }

    // ========================================================================
    // MAINTENANCE RECORD MANAGEMENT
    // ========================================================================
    async addMaintenanceRecord(recordData) {
        const record = {
            ...recordData,
            dateCreated: new Date().toISOString(),
            status: recordData.status || 'pending',
            createdBy: this.currentUser?.uid || 'anonymous',
            priority: recordData.priority || 'medium'
        };

        if (!this.isOnline) {
            this.offlineQueue.push(async () => {
                await setDoc(doc(db, 'maintenanceRecords', record.id), record);
                await this.addRecentActivity('Maintenance', `New maintenance record: ${record.title}`, 'warning');
            });
            this.showNotification('Maintenance record queued for sync', 'warning');
            return { id: 'pending-' + Date.now(), ...record };
        }

        try {
            await setDoc(doc(db, 'maintenanceRecords', record.id), record);
            await this.addRecentActivity('Maintenance', `New maintenance record: ${record.title}`, 'warning');
            
            const priorityEmoji = {
                'critical': 'CRITICAL',
                'high': 'HIGH',
                'medium': 'MEDIUM',
                'low': 'LOW'
            };
            
            this.showNotification(
                `${priorityEmoji[record.priority]}: ${record.title}`, 
                record.priority === 'critical' ? 'error' : 'warning'
            );
            
            return { id: record.id, ...record };
        } catch (error) {
            console.error('Error adding maintenance record:', error);
            this.showNotification('Failed to create maintenance record', 'error');
            throw error;
        }
    }

    async updateMaintenanceRecord(recordId, updates) {
        if (!this.isOnline) {
            this.offlineQueue.push(async () => {
                const updateData = { ...updates, lastUpdated: new Date().toISOString() };
                await updateDoc(doc(db, 'maintenanceRecords', recordId), updateData);
            });
            this.showNotification('Update queued for sync', 'warning');
            return { id: recordId, ...updates };
        }

        try {
            const updateData = { ...updates, lastUpdated: new Date().toISOString() };
            await updateDoc(doc(db, 'maintenanceRecords', recordId), updateData);
            
            const record = this.maintenanceRecords.find(r => r.id === recordId);
            await this.addRecentActivity('Maintenance', `Updated: ${record ? record.title : recordId}`, 'success');
            
            return { id: recordId, ...updateData };
        } catch (error) {
            console.error('Error updating maintenance record:', error);
            this.showNotification('Failed to update maintenance record', 'error');
            throw error;
        }
    }

    async addRecentActivity(module, action, status = 'info') {
        const activity = {
            module,
            action,
            status,
            timestamp: new Date().toISOString(),
            user: this.currentUser?.uid || 'anonymous'
        };

        if (!this.isOnline) {
            this.offlineQueue.push(async () => {
                await addDoc(collection(db, 'recentActivities'), activity);
            });
            return;
        }

        try {
            await addDoc(collection(db, 'recentActivities'), activity);
        } catch (error) {
            console.error('Error adding recent activity:', error);
        }
    }

    // ========================================================================
    // MIGRATION (MAINTENANCE ONLY)
    // ========================================================================
    async migrateFromLocalStorage() {
        try {
            this.showNotification('Starting data migration...', 'info');
            
            // ONLY MIGRATE MAINTENANCE RECORDS
            const localMaintenanceRecords = JSON.parse(localStorage.getItem('safePark_maintenanceRecords') || '[]');
            for (const record of localMaintenanceRecords) {
                const { id, ...recordData } = record;
                await this.addMaintenanceRecord(recordData);
                await new Promise(resolve => setTimeout(resolve, 100));
            }
            
            // Clear localStorage after successful migration
            localStorage.removeItem('safePark_maintenanceRecords');
            localStorage.removeItem('safePark_recentActivities');
            
            this.showNotification('Data migration completed successfully!', 'success');
            
            // Restart listeners after migration
            setTimeout(() => {
                this.initializeFirebaseListeners();
            }, 1000);
            
        } catch (error) {
            console.error('Migration error:', error);
            this.showNotification('Data migration failed', 'error');
        }
    }

    // ========================================================================
    // PRESENCE SYSTEM
    // ========================================================================
    setupPresenceSystem() {
        if (!this.currentUser) return;
        
        this.presenceInterval = setInterval(() => {
            this.updateUserPresence();
        }, 30000);
        
        this.updateUserPresence();
        
        const presenceUnsubscribe = onSnapshot(collection(db, 'presence'), (snapshot) => {
            this.userPresence.clear();
            snapshot.forEach((doc) => {
                const data = doc.data();
                if (Date.now() - data.lastSeen < 120000) {
                    this.userPresence.set(doc.id, data);
                }
            });
            this.displayActiveUsers();
        });
        
        this.listeners.push(presenceUnsubscribe);
    }

    async updateUserPresence() {
        if (!this.currentUser || !this.isOnline) return;
        
        try {
            const presenceData = {
                lastSeen: Date.now(),
                page: window.location.pathname,
       