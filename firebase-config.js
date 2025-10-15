// firebase-config.js - Complete Firebase Integration for SafePark.PRO
// Updated with real SafePark-PRO configuration values

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
        this.teamMembers = [];
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
        
        console.log('✅ SafePark.PRO Firebase integration initialized with real config');
    }

    // ========================================================================
    // AUTHENTICATION & INITIALIZATION
    // ========================================================================
    async initializeAuth() {
        try {
            // Sign in anonymously for basic access
            await signInAnonymously(auth);
            
            onAuthStateChanged(auth, (user) => {
                if (user) {
                    this.currentUser = user;
                    this.initializeFirebaseListeners();
                    this.loadDataFromFirebase();
                    this.setupPresenceSystem();
                    this.showNotification('Firebase connected successfully!', 'success');
                    console.log('✅ Firebase Authentication successful');
                } else {
                    console.log('❌ Authentication failed');
                    this.showNotification('Authentication failed. Using offline mode.', 'warning');
                }
            });
        } catch (error) {
            console.error('Authentication error:', error);
            this.showNotification('Firebase connection failed. Working offline.', 'error');
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
    // REAL-TIME FIREBASE LISTENERS - FIXED WITH AUTO-MIGRATION
    // ========================================================================
    async initializeFirebaseListeners() {
        // Clear existing listeners
        this.listeners.forEach(unsubscribe => unsubscribe());
        this.listeners = [];

        try {
            // Check if this is first time setup (empty Firebase collections)
            const teamMembersSnapshot = await getDocs(collection(db, 'teamMembers'));
            const maintenanceSnapshot = await getDocs(collection(db, 'maintenanceRecords'));
            
            // If Firebase is empty but localStorage has data, migrate automatically
            if (teamMembersSnapshot.empty || maintenanceSnapshot.empty) {
                const localTeamMembers = JSON.parse(localStorage.getItem('safePark_teamMembers') || '[]');
                const localMaintenance = JSON.parse(localStorage.getItem('safePark_maintenanceRecords') || '[]');
                
                if (localTeamMembers.length > 0 || localMaintenance.length > 0) {
                    console.log('Auto-migrating localStorage data to Firebase...');
                    await this.migrateFromLocalStorage();
                    return; // Exit and let the migration restart the listeners
                }
            }
        } catch (error) {
            console.error('Error checking Firebase collections:', error);
            // Continue with normal listener setup if check fails
        }

        // Team members listener
        const teamMembersUnsubscribe = onSnapshot(
            query(collection(db, 'teamMembers'), orderBy('dateAdded', 'desc')), 
            (snapshot) => {
                const oldCount = this.teamMembers.length;
                this.teamMembers = [];
                snapshot.forEach((doc) => {
                    this.teamMembers.push({ id: doc.id, ...doc.data() });
                });
                
                if (this.teamMembers.length > oldCount && oldCount > 0) {
                    this.showNotification('New team member added!', 'success');
                }
                
                this.displayTeamMembers();
                this.updateStats();
                this.updateDropdowns();
            },
            (error) => {
                console.error('Error listening to team members:', error);
                this.showNotification('Error syncing team members', 'error');
            }
        );

        // Maintenance records listener - FIXED NOTIFICATION LOGIC
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
                // FIXED: Changed from >= 0 to > 0 to prevent false notifications on page load
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
        this.listeners.push(teamMembersUnsubscribe, maintenanceUnsubscribe, tasksUnsubscribe, activitiesUnsubscribe);
    }

    // ========================================================================
    // MAINTENANCE INTEGRATION FOR MAINTENANCE_INTEGRATION.JS COMPATIBILITY
    // ========================================================================
    async createMaintenanceRequest(requestData) {
        // This is the key function that maintenance_integration.js will call
        const record = {
            id: 'MAINT_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
            title: requestData.title,
            description: requestData.description,
            priority: requestData.priority || 'medium',
            category: requestData.category || 'General',
            location: requestData.location || 'Not specified',
            status: 'pending',
            createdAt: new Date().toISOString(),
            dateCreated: new Date().toISOString(), // For compatibility
            createdBy: requestData.createdBy || 'System',
            holidayPark: requestData.holidayPark || 'Unknown',
            assignedTo: requestData.assignedTo || 'Unassigned'
        };

        try {
            await setDoc(doc(db, 'maintenanceRecords', record.id), record);
            console.log('✅ Maintenance request created via Firebase:', record.id);
            return { id: record.id, ...record };
        } catch (error) {
            console.error('❌ Error creating maintenance request:', error);
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
            console.log('✅ Maintenance record updated:', recordId);
            return updateData;
        } catch (error) {
            console.error('❌ Error updating maintenance status:', error);
            throw error;
        }
    }

    // Real-time listener for maintenance stats (for maintenance_integration.js compatibility)
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
    // REST OF THE CLASS METHODS (keeping all existing functionality)
    // ========================================================================
    
    async addTeamMember(memberData) {
        // Validate required fields
        const requiredFields = ['name', 'email', 'role', 'holidayPark'];
        for (const field of requiredFields) {
            if (!memberData[field] || memberData[field].trim() === '') {
                throw new Error(`${field} is required`);
            }
        }

        // Check for duplicate email
        const existingMember = this.teamMembers.find(m => m.email.toLowerCase() === memberData.email.toLowerCase());
        if (existingMember) {
            throw new Error('A team member with this email already exists');
        }

        const member = {
            ...memberData,
            businessArea: 'All Business Areas',
            dateAdded: new Date().toISOString(),
            addedBy: this.currentUser?.uid || 'anonymous'
        };

        if (!this.isOnline) {
            this.offlineQueue.push(async () => {
                await addDoc(collection(db, 'teamMembers'), member);
                await this.addRecentActivity('Team Management', `Added team member: ${member.name}`, 'success');
            });
            this.showNotification('Team member queued for sync when online', 'warning');
            return { id: 'pending-' + Date.now(), ...member };
        }

        try {
            const docRef = await addDoc(collection(db, 'teamMembers'), member);
            await this.addRecentActivity('Team Management', `Added team member: ${member.name}`, 'success');
            this.showNotification(`${member.name} added to team`, 'success');
            return { id: docRef.id, ...member };
        } catch (error) {
            console.error('Error adding team member:', error);
            this.showNotification('Failed to add team member', 'error');
            throw error;
        }
    }

    async removeTeamMember(memberId) {
        const member = this.teamMembers.find(m => m.id === memberId);
        
        if (!this.isOnline) {
            this.offlineQueue.push(async () => {
                await deleteDoc(doc(db, 'teamMembers', memberId));
                await this.addRecentActivity('Team Management', `Removed team member: ${member ? member.name : memberId}`, 'warning');
            });
            this.showNotification('Team member removal queued for sync', 'warning');
            return true;
        }

        try {
            await deleteDoc(doc(db, 'teamMembers', memberId));
            await this.addRecentActivity('Team Management', `Removed team member: ${member ? member.name : memberId}`, 'warning');
            this.showNotification('Team member removed', 'success');
            return true;
        } catch (error) {
            console.error('Error removing team member:', error);
            this.showNotification('Failed to remove team member', 'error');
            throw error;
        }
    }

    getTeamMembers(businessArea = null, holidayPark = null) {
        let filtered = this.teamMembers;
        if (businessArea) {
            filtered = filtered.filter(member => member.businessArea === businessArea);
        }
        if (holidayPark) {
            filtered = filtered.filter(member => member.holidayPark === holidayPark);
        }
        return filtered;
    }

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

    async migrateFromLocalStorage() {
        try {
            this.showNotification('Starting data migration...', 'info');
            
            // Migrate team members
            const localTeamMembers = JSON.parse(localStorage.getItem('safePark_teamMembers') || '[]');
            for (const member of localTeamMembers) {
                const { id, ...memberData } = member;
                await this.addTeamMember(memberData);
                await new Promise(resolve => setTimeout(resolve, 100));
            }
            
            // Migrate maintenance records
            const localMaintenanceRecords = JSON.parse(localStorage.getItem('safePark_maintenanceRecords') || '[]');
            for (const record of localMaintenanceRecords) {
                const { id, ...recordData } = record;
                await this.addMaintenanceRecord(recordData);
                await new Promise(resolve => setTimeout(resolve, 100));
            }
            
            // Clear localStorage after successful migration
            localStorage.removeItem('safePark_teamMembers');
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
                userId: this.currentUser.uid
            };

            const userPresenceRef = doc(db, 'presence', this.currentUser.uid);
            await updateDoc(userPresenceRef, presenceData).catch(async () => {
                await addDoc(collection(db, 'presence'), {
                    ...presenceData,
                    id: this.currentUser.uid
                });
            });
        } catch (error) {
            console.error('Error updating presence:', error);
        }
    }

    displayTeamMembers() {
        const container = document.getElementById('teamMembersGrid');
        if (!container) return;

        const businessAreaFilter = document.getElementById('filterBusinessArea')?.value || '';
        const holidayParkFilter = document.getElementById('filterHolidayPark')?.value || '';
        
        const filteredMembers = this.getTeamMembers(businessAreaFilter || null, holidayParkFilter || null);

        container.innerHTML = filteredMembers.map(member => `
            <div class="team-member">
                <div class="member-name">${member.name}</div>
                <div class="member-role">${member.role}</div>
                <div class="member-park">${member.holidayPark}</div>
                <div class="member-actions">
                    <button class="btn btn-small danger" onclick="removeTeamMember('${member.id}')">Remove</button>
                </div>
            </div>
        `).join('');

        const totalEl = document.getElementById('totalTeamMembers');
        if (totalEl) totalEl.textContent = this.teamMembers.length;
    }

    displayMaintenanceRecords() {
        const container = document.getElementById('maintenanceRecordsGrid');
        if (!container) return;

        const businessAreaFilter = document.getElementById('filterMaintenanceArea')?.value || '';
        const holidayParkFilter = document.getElementById('filterMaintenanceHolidayPark')?.value || '';
        const statusFilter = document.getElementById('filterMaintenanceStatus')?.value || '';
        const priorityFilter = document.getElementById('filterMaintenancePriority')?.value || '';

        let filteredRecords = this.getMaintenanceRecords();
        
        if (businessAreaFilter) {
            filteredRecords = filteredRecords.filter(record => 
                record.businessArea === businessAreaFilter || 
                record.category === businessAreaFilter
            );
        }
        if (holidayParkFilter) {
            filteredRecords = filteredRecords.filter(record => 
                record.holidayPark === holidayParkFilter || 
                record.location === holidayParkFilter
            );
        }
        if (statusFilter) {
            filteredRecords = filteredRecords.filter(record => record.status === statusFilter);
        }
        if (priorityFilter) {
            filteredRecords = filteredRecords.filter(record => record.priority === priorityFilter);
        }

        if (filteredRecords.length === 0) {
            container.innerHTML = '<div style="text-align: center; color: #B8B8B8; padding: 20px;">No maintenance records found</div>';
            return;
        }

        container.innerHTML = filteredRecords.map(record => {
            const priorityColor = {
                'low': '#6C757D',
                'medium': '#FFC107', 
                'high': '#FF6B35',
                'critical': '#DC3545'
            };

            return `
                <div class="grid-item">
                    <div class="grid-item-name">${record.title}</div>
                    <div class="grid-item-info">${record.businessArea || record.category || 'N/A'}</div>
                    <div class="grid-item-info">${record.holidayPark || record.location || 'N/A'}</div>
                    <div class="grid-item-info">
                        <span style="color: ${priorityColor[record.priority] || '#6C757D'}">${(record.priority || 'medium').charAt(0).toUpperCase() + (record.priority || 'medium').slice(1)}</span>
                    </div>
                    <div class="grid-actions">
                        <button class="btn btn-small" onclick="toggleMaintenanceStatus('${record.id}')">${record.status === 'pending' ? 'Complete' : 'Reopen'}</button>
                    </div>
                </div>
            `;
        }).join('');
    }

    displayRecentActivities() {
        const container = document.getElementById('recentActivitiesList');
        if (!container) return;

        container.innerHTML = this.recentActivities.slice(0, 10).map(activity => `
            <div class="activity-item ${activity.status}">
                <div class="activity-time">${new Date(activity.timestamp).toLocaleString()}</div>
                <div class="activity-description">${activity.module}: ${activity.action}</div>
            </div>
        `).join('');
    }

    displayActiveUsers() {
        const container = document.getElementById('active-users-container');
        if (!container) return;
        
        const activeUsers = Array.from(this.userPresence.values());
        container.innerHTML = `
            <h4>Active Users (${activeUsers.length})</h4>
            ${activeUsers.map(user => `
                <div class="active-user">
                    <span class="user-indicator">ONLINE</span>
                    <span>${user.page || 'Dashboard'}</span>
                    <small>${new Date(user.lastSeen).toLocaleTimeString()}</small>
                </div>
            `).join('')}
        `;
    }

    updateStats() {
        const totalIncidentsEl = document.getElementById('totalIncidents');
        const teamMembersEl = document.getElementById('teamMembers');
        const maintenanceRecordsEl = document.getElementById('maintenanceRecords');
        const complianceScoreEl = document.getElementById('complianceScore');

        const allRecords = [...this.maintenanceRecords, ...this.maintenanceTasks];
        const pendingTasks = allRecords.filter(r => r.status === 'pending').length;
        const totalTasks = allRecords.length;
        const complianceScore = totalTasks > 0 ? Math.round(((totalTasks - pendingTasks) / totalTasks) * 100) : 100;

        if (totalIncidentsEl) totalIncidentsEl.textContent = '0';
        if (teamMembersEl) teamMembersEl.textContent = this.teamMembers.length;
        if (maintenanceRecordsEl) maintenanceRecordsEl.textContent = pendingTasks;
        if (complianceScoreEl) complianceScoreEl.textContent = `${complianceScore}%`;

        const completed = allRecords.filter(r => r.status === 'completed').length;
        const highPriority = allRecords.filter(r => 
            (r.priority === 'high' || r.priority === 'critical') && r.status === 'pending'
        ).length;
        
        const pendingEl = document.getElementById('pendingMaintenance');
        const completedEl = document.getElementById('completedMaintenance');
        const highPriorityEl = document.getElementById('highPriorityMaintenance');
        const totalMaintenanceEl = document.getElementById('totalMaintenanceRecords');
        
        if (pendingEl) pendingEl.textContent = pendingTasks;
        if (completedEl) completedEl.textContent = completed;
        if (highPriorityEl) highPriorityEl.textContent = highPriority;
        if (totalMaintenanceEl) totalMaintenanceEl.textContent = totalTasks;
    }

    updateDropdowns() {
        const teamMemberSelects = document.querySelectorAll('[data-populate="team-members"]');
        teamMemberSelects.forEach(select => {
            const businessArea = select.getAttribute('data-business-area');
            const holidayPark = select.getAttribute('data-holiday-park');
            const members = this.getTeamMembers(businessArea, holidayPark);
            
            const currentValue = select.value;
            
            while (select.children.length > 1) {
                select.removeChild(select.lastChild);
            }
            
            members.forEach(member => {
                const option = document.createElement('option');
                option.value = member.name;
                option.textContent = `${member.name} - ${member.role}`;
                select.appendChild(option);
            });
            
            if (currentValue) {
                select.value = currentValue;
            }
        });

        const holidayParkSelects = document.querySelectorAll('[data-populate="holiday-parks"]');
        holidayParkSelects.forEach(select => {
            const currentValue = select.value;
            
            while (select.children.length > 1) {
                select.removeChild(select.lastChild);
            }
            
            this.holidayParks.forEach(park => {
                const option = document.createElement('option');
                option.value = park;
                option.textContent = park;
                select.appendChild(option);
            });
            
            if (currentValue) {
                select.value = currentValue;
            }
        });
    }

    async toggleMaintenanceStatus(recordId) {
        let record = this.maintenanceRecords.find(r => r.id === recordId);
        let collection_name = 'maintenanceRecords';
        
        if (!record) {
            record = this.maintenanceTasks.find(r => r.id === recordId);
            collection_name = 'maintenanceTasks';
        }
        
        if (record) {
            const newStatus = record.status === 'pending' ? 'completed' : 'pending';
            
            if (collection_name === 'maintenanceRecords') {
                await this.updateMaintenanceRecord(recordId, { status: newStatus });
            } else {
                try {
                    await updateDoc(doc(db, 'maintenanceTasks', recordId), { 
                        status: newStatus,
                        lastUpdated: new Date().toISOString()
                    });
                } catch (error) {
                    console.error('Error updating maintenance task:', error);
                }
            }
        }
    }

    async loadDataFromFirebase() {
        console.log('Real-time listeners active - data loaded automatically');
    }

    destroy() {
        if (this.presenceInterval) {
            clearInterval(this.presenceInterval);
        }
        this.listeners.forEach(unsubscribe => unsubscribe());
        this.listeners = [];
    }

    async addHolidayPark(parkData) {
        const parkName = parkData.name;
        if (!this.holidayParks.includes(parkName)) {
            this.holidayParks.push(parkName);
            
            if (this.isOnline) {
                try {
                    await addDoc(collection(db, 'holidayParks'), { name: parkName });
                    await this.addRecentActivity('Location Management', `Added holiday park: ${parkName}`, 'success');
                } catch (error) {
                    console.error('Error saving holiday park:', error);
                }
            }
            
            this.updateDropdowns();
            return true;
        }
        return false;
    }

    refreshHolidayParkDropdowns() {
        this.updateDropdowns();
        
        const activeParksEl = document.getElementById('activePark');
        if (activeParksEl) activeParksEl.textContent = this.holidayParks.length;
    }
}

// ============================================================================
// INITIALIZE AND EXPORT
// ============================================================================

// Create the manager instance
const safeParkManager = new FirebaseSafeParkDataManager();

// CRITICAL: Make the MaintenanceSystem globally available for maintenance_integration.js
window.MaintenanceSystem = {
    config: {
        statuses: {
            PENDING: 'pending',
            IN_PROGRESS: 'in-progress',
            COMPLETED: 'completed'
        },
        priorities: {
            CRITICAL: 'critical',
            HIGH: 'high',
            MEDIUM: 'medium',
            LOW: 'low'
        },
        categories: {
            HOT_TUBS: 'Hot Tubs',
            PLAY_PARKS: 'Play Parks',
            ACCOMMODATION: 'Accommodation',
            EQUIPMENT: 'Grounds & Equipment',
            FOOD_BEVERAGE: 'Food & Beverage',
            VEHICLES: 'Vehicles',
            GAS_SAFETY: 'Gas Safety',
            ELECTRICAL: 'Electrical Safety',
            FIRE_SAFETY: 'Fire Safety',
            COSHH: 'COSHH',
            GENERAL: 'General'
        }
    },
    
    // Bridge functions for maintenance_integration.js compatibility
    createMaintenanceRequest: async (requestData) => await safeParkManager.createMaintenanceRequest(requestData),
    getMaintenanceStats: async () => await safeParkManager.getMaintenanceStats(),
    getMaintenanceRecords: async (options) => await safeParkManager.getMaintenanceRecords(options),
    updateMaintenanceStatus: async (id, status, notes) => await safeParkManager.updateMaintenanceStatus(id, status, notes),
    listenToMaintenanceStats: (callback, parkFilter) => safeParkManager.listenToMaintenanceStats(callback, parkFilter),
    formatDate: (date) => safeParkManager.formatDate(date),
    getPriorityBadgeHTML: (priority) => safeParkManager.getPriorityBadgeHTML(priority),
    getStatusBadgeHTML: (status) => safeParkManager.getStatusBadgeHTML(status),
    isAuthenticated: () => safeParkManager.currentUser !== null,
    getCurrentUser: () => safeParkManager.currentUser
};

// Set up global utilities for backward compatibility
window.SafeParkUtils = {
    addTeamMember: async (memberData) => await safeParkManager.addTeamMember(memberData),
    getTeamMembers: (businessArea, holidayPark) => safeParkManager.getTeamMembers(businessArea, holidayPark),
    removeTeamMember: async (memberId) => await safeParkManager.removeTeamMember(memberId),
    addMaintenanceRecord: async (recordData) => await safeParkManager.addMaintenanceRecord(recordData),
    updateMaintenanceRecord: async (recordId, updates) => await safeParkManager.updateMaintenanceRecord(recordId, updates),
    getMaintenanceRecords: (businessArea) => safeParkManager.getMaintenanceRecords(businessArea),
    addRecentActivity: async (module, action, status) => await safeParkManager.addRecentActivity(module, action, status)
};

// Auto-population function
window.syncSafeParkData = function() {
    safeParkManager.updateDropdowns();
};

// Make manager globally available
window.safeParkManager = safeParkManager;

// Export for use in other modules
export { db, auth, FirebaseSafeParkDataManager, safeParkManager };

console.log('✅ SafePark.PRO Firebase Config Loaded with Real Credentials');
console.log('✅ MaintenanceSystem Bridge Created for maintenance_integration.js compatibility');
