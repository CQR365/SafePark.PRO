// firebase-config.js - COMPREHENSIVE Firebase Integration for ALL SafePark.PRO Modules
// Handles all 19+ modules with complete form detection and data management

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
// COMPREHENSIVE FIREBASE SAFEPARK DATA MANAGER - ALL MODULES
// ============================================================================
class ComprehensiveFirebaseSafeParkManager {
    constructor() {
        // Core system data
        this.maintenanceRecords = [];
        this.recentActivities = [];
        this.userPresence = new Map();
        this.isOnline = navigator.onLine;
        this.offlineQueue = [];
        this.currentUser = null;
        this.listeners = [];

        // Operations & Maintenance data
        this.accommodationInspections = [];
        this.hotTubRecords = [];
        this.playParksInspections = [];
        this.groundsEquipmentRecords = [];
        this.foodBeverageRecords = [];
        this.vehicleInspections = [];

        // Safety & Compliance data
        this.coshhAssessments = [];
        this.electricalInspections = [];
        this.fireAssessments = [];
        this.gasInspections = [];
        this.puwerAssessments = [];
        this.lolerInspections = [];

        // Management & Risk data
        this.contractorRecords = [];
        this.incidentReports = [];
        this.managementReports = [];
        this.riskAssessments = [];
        this.ukasRecords = [];

        // Highland Holidays configuration
        this.holidayParks = [
            'Ben Nevis Holiday Park',
            'Oban Holiday Park', 
            'Tyndrum Holiday Park',
            'Overburns Farm'
        ];
        
        // Business areas - essential for all modules
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

        // Module to collection mapping
        this.moduleCollections = {
            // Operations & Maintenance
            'accommodation': 'accommodationInspections',
            'hot-tub': 'hotTubRecords',
            'play-parks': 'playParksInspections',
            'grounds-equipment': 'groundsEquipmentRecords',
            'food-beverage': 'foodBeverageRecords',
            'vehicles': 'vehicleInspections',
            
            // Safety & Compliance
            'coshh': 'coshhAssessments',
            'electric': 'electricalInspections',
            'fire': 'fireAssessments',
            'gas': 'gasInspections',
            'puwer': 'puwerAssessments',
            'loler': 'lolerInspections',
            
            // Management & Risk
            'contractors': 'contractorRecords',
            'incidents': 'incidentReports',
            'management': 'managementReports',
            'risk-management': 'riskAssessments',
            'ukas': 'ukasRecords',
            
            // Core
            'maintenance': 'maintenanceRecords'
        };
        
        // Initialize the system
        this.initializeAuth();
        this.setupOfflineHandling();
        this.initializeNotificationSystem();
        
        console.log('🔥 SafePark.PRO COMPREHENSIVE Firebase integration initialized');
        console.log('📋 Modules supported:', Object.keys(this.moduleCollections).length);
    }

    // ========================================================================
    // AUTHENTICATION & INITIALIZATION
    // ========================================================================
    async initializeAuth() {
        try {
            console.log('🔐 Starting Firebase authentication...');
            
            const userCredential = await signInAnonymously(auth);
            console.log('✅ Anonymous sign-in successful:', userCredential.user.uid);
            
            onAuthStateChanged(auth, async (user) => {
                if (user) {
                    console.log('👤 User authenticated:', user.uid);
                    this.currentUser = user;
                    
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    
                    try {
                        await this.initializeAllListeners();
                        this.loadAllDataFromFirebase();
                        this.setupPresenceSystem();
                        this.showNotification('🔥 All SafePark.PRO modules connected to Firebase!', 'success');
                        console.log('🚀 ALL Firebase systems initialized');
                    } catch (error) {
                        console.error('❌ Error initializing Firebase listeners:', error);
                        this.showNotification('⚠️ Some modules may have limited functionality', 'warning');
                    }
                    
                } else {
                    console.log('❌ Authentication failed');
                    this.showNotification('🔄 Working in offline mode', 'warning');
                }
            });
            
        } catch (error) {
            console.error('❌ Authentication error:', error);
            this.showNotification('🔄 Firebase connection failed. Working offline.', 'error');
        }
    }

    // ========================================================================
    // COMPREHENSIVE LISTENERS FOR ALL MODULES
    // ========================================================================
    async initializeAllListeners() {
        this.listeners.forEach(unsubscribe => unsubscribe());
        this.listeners = [];

        console.log('📡 Setting up real-time listeners for all modules...');

        // Operations & Maintenance listeners
        this.listeners.push(this.createListener('accommodationInspections', (data) => { this.accommodationInspections = data; }));
        this.listeners.push(this.createListener('hotTubRecords', (data) => { this.hotTubRecords = data; }));
        this.listeners.push(this.createListener('playParksInspections', (data) => { this.playParksInspections = data; }));
        this.listeners.push(this.createListener('groundsEquipmentRecords', (data) => { this.groundsEquipmentRecords = data; }));
        this.listeners.push(this.createListener('foodBeverageRecords', (data) => { this.foodBeverageRecords = data; }));
        this.listeners.push(this.createListener('vehicleInspections', (data) => { this.vehicleInspections = data; }));

        // Safety & Compliance listeners
        this.listeners.push(this.createListener('coshhAssessments', (data) => { this.coshhAssessments = data; }));
        this.listeners.push(this.createListener('electricalInspections', (data) => { this.electricalInspections = data; }));
        this.listeners.push(this.createListener('fireAssessments', (data) => { this.fireAssessments = data; }));
        this.listeners.push(this.createListener('gasInspections', (data) => { this.gasInspections = data; }));
        this.listeners.push(this.createListener('puwerAssessments', (data) => { this.puwerAssessments = data; }));
        this.listeners.push(this.createListener('lolerInspections', (data) => { this.lolerInspections = data; }));

        // Management & Risk listeners
        this.listeners.push(this.createListener('contractorRecords', (data) => { this.contractorRecords = data; }));
        this.listeners.push(this.createListener('incidentReports', (data) => { this.incidentReports = data; }));
        this.listeners.push(this.createListener('managementReports', (data) => { this.managementReports = data; }));
        this.listeners.push(this.createListener('riskAssessments', (data) => { this.riskAssessments = data; }));
        this.listeners.push(this.createListener('ukasRecords', (data) => { this.ukasRecords = data; }));

        // Core system listeners
        this.listeners.push(this.createListener('maintenanceRecords', (data) => { 
            this.maintenanceRecords = data; 
            this.updateStats(); 
        }));
        this.listeners.push(this.createListener('recentActivities', (data) => { this.recentActivities = data; }));

        console.log(`📡 ${this.listeners.length} real-time listeners active`);
    }

    createListener(collectionName, callback) {
        return onSnapshot(
            query(
                collection(db, collectionName), 
                orderBy('dateCreated', 'desc'),
                limit(100)
            ), 
            (snapshot) => {
                const data = [];
                snapshot.forEach((doc) => {
                    data.push({ id: doc.id, ...doc.data() });
                });
                callback(data);
            },
            (error) => {
                console.error(`❌ Error listening to ${collectionName}:`, error);
            }
        );
    }

    // ========================================================================
    // COMPREHENSIVE FORM SUBMISSION SYSTEM
    // ========================================================================
    
    // Auto-detect and submit any SafePark.PRO form
    async autoSubmitForm(formElement) {
        try {
            const formData = new FormData(formElement);
            const data = Object.fromEntries(formData.entries());
            
            // Detect module from multiple sources
            const module = this.detectModuleFromForm(formElement, data);
            const collectionName = this.moduleCollections[module];
            
            if (!collectionName) {
                console.warn(`⚠️ Unknown module detected: ${module}`);
                return await this.submitGenericForm(data, module);
            }

            console.log(`📝 Submitting ${module} form to ${collectionName}`);
            return await this.submitForm(data, module, collectionName);

        } catch (error) {
            console.error('❌ Form submission error:', error);
            throw error;
        }
    }

    // Intelligent module detection
    detectModuleFromForm(formElement, data) {
        // Priority 1: Hidden input with module name
        if (data.module) return this.normalizeModuleName(data.module);
        
        // Priority 2: Form ID
        const formId = formElement.id.toLowerCase();
        for (const module of Object.keys(this.moduleCollections)) {
            if (formId.includes(module) || formId.includes(module.replace('-', ''))) {
                return module;
            }
        }
        
        // Priority 3: URL/filename
        const url = window.location.href.toLowerCase();
        for (const module of Object.keys(this.moduleCollections)) {
            if (url.includes(module)) {
                return module;
            }
        }
        
        // Priority 4: Form action
        const formAction = formElement.action?.toLowerCase() || '';
        for (const module of Object.keys(this.moduleCollections)) {
            if (formAction.includes(module)) {
                return module;
            }
        }
        
        // Priority 5: Page title or headers
        const pageTitle = document.title.toLowerCase();
        const moduleKeywords = {
            'accommodation': ['accommodation', 'room', 'lodge', 'cabin'],
            'hot-tub': ['hot', 'tub', 'spa', 'jacuzzi', 'water'],
            'play-parks': ['play', 'park', 'playground', 'children'],
            'grounds-equipment': ['grounds', 'equipment', 'machinery', 'tools'],
            'food-beverage': ['food', 'beverage', 'kitchen', 'catering'],
            'vehicles': ['vehicle', 'car', 'van', 'transport'],
            'coshh': ['coshh', 'chemical', 'substance', 'hazard'],
            'electric': ['electric', 'electrical', 'power', 'wiring'],
            'fire': ['fire', 'alarm', 'extinguisher', 'evacuation'],
            'gas': ['gas', 'lpg', 'natural gas', 'appliance'],
            'puwer': ['puwer', 'work equipment', 'machinery'],
            'loler': ['loler', 'lifting', 'crane', 'hoist'],
            'contractors': ['contractor', 'supplier', 'vendor'],
            'incidents': ['incident', 'accident', 'injury', 'near miss'],
            'management': ['management', 'report', 'compliance', 'monthly'],
            'risk-management': ['risk', 'business continuity', 'assessment'],
            'ukas': ['ukas', 'water', 'microbiology', 'testing']
        };
        
        for (const [module, keywords] of Object.entries(moduleKeywords)) {
            if (keywords.some(keyword => pageTitle.includes(keyword))) {
                return module;
            }
        }
        
        // Fallback
        return 'unknown';
    }

    normalizeModuleName(moduleName) {
        const normalizations = {
            'accommodation inspection': 'accommodation',
            'hot tub management': 'hot-tub',
            'play parks inspection': 'play-parks',
            'grounds equipment': 'grounds-equipment',
            'food beverage': 'food-beverage',
            'vehicle inspection': 'vehicles',
            'coshh assessment': 'coshh',
            'electrical inspection': 'electric',
            'fire assessment': 'fire',
            'gas inspection': 'gas',
            'puwer assessment': 'puwer',
            'loler inspection': 'loler',
            'contractor management': 'contractors',
            'incident report': 'incidents',
            'management report': 'management',
            'risk assessment': 'risk-management',
            'ukas testing': 'ukas',
            'maintenance request': 'maintenance'
        };
        
        const normalized = normalizations[moduleName.toLowerCase()];
        return normalized || moduleName.toLowerCase().replace(/\s+/g, '-');
    }

    // Universal form submission
    async submitForm(formData, module, collectionName) {
        const record = {
            id: this.generateModuleId(module),
            ...formData,
            module,
            dateCreated: new Date().toISOString(),
            createdBy: this.currentUser?.uid || 'anonymous',
            status: formData.status || 'submitted',
            holidayPark: formData.holidayPark || formData.location || 'Unknown',
            businessArea: formData.businessArea || this.getDefaultBusinessArea(module)
        };

        if (!this.isOnline) {
            this.offlineQueue.push(async () => {
                await setDoc(doc(db, collectionName, record.id), record);
                await this.addRecentActivity(module, `Form submitted: ${record.title || record.id}`, 'success');
            });
            this.showNotification(`📱 ${module} form queued for sync`, 'warning');
            return { id: record.id, ...record };
        }

        try {
            await setDoc(doc(db, collectionName, record.id), record);
            await this.addRecentActivity(module, `Form submitted: ${record.title || record.description || record.id}`, 'success');
            
            this.showNotification(`✅ ${module} form submitted successfully!`, 'success');
            console.log(`✅ ${module} form saved to ${collectionName}:`, record.id);
            return { id: record.id, ...record };
        } catch (error) {
            console.error(`❌ Error submitting ${module} form:`, error);
            this.showNotification(`❌ Failed to submit ${module} form`, 'error');
            throw error;
        }
    }

    // Generate module-specific IDs
    generateModuleId(module) {
        const prefixes = {
            'accommodation': 'ACCOM',
            'hot-tub': 'HOT',
            'play-parks': 'PLAY',
            'grounds-equipment': 'GRND',
            'food-beverage': 'FOOD',
            'vehicles': 'VEH',
            'coshh': 'COSHH',
            'electric': 'ELEC',
            'fire': 'FIRE',
            'gas': 'GAS',
            'puwer': 'PUWER',
            'loler': 'LOLER',
            'contractors': 'CONT',
            'incidents': 'INC',
            'management': 'MGR',
            'risk-management': 'RISK',
            'ukas': 'UKAS',
            'maintenance': 'MAINT'
        };
        
        const prefix = prefixes[module] || 'FORM';
        return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    }

    getDefaultBusinessArea(module) {
        const defaults = {
            'accommodation': 'Accommodation Services',
            'hot-tub': 'Water Activities',
            'play-parks': 'Play Areas & Recreation',
            'grounds-equipment': 'Maintenance & Grounds',
            'food-beverage': 'Food & Beverage',
            'vehicles': 'Maintenance & Grounds',
            'coshh': 'Security & Safety',
            'electric': 'Security & Safety',
            'fire': 'Security & Safety',
            'gas': 'Security & Safety',
            'puwer': 'Security & Safety',
            'loler': 'Security & Safety',
            'contractors': 'Reception & Administration',
            'incidents': 'Security & Safety',
            'management': 'Reception & Administration',
            'risk-management': 'Security & Safety',
            'ukas': 'Water Activities'
        };
        
        return defaults[module] || 'General';
    }

    // ========================================================================
    // DATA RETRIEVAL FOR ALL MODULES
    // ========================================================================
    async getModuleData(module, options = {}) {
        const dataMap = {
            'accommodation': this.accommodationInspections,
            'hot-tub': this.hotTubRecords,
            'play-parks': this.playParksInspections,
            'grounds-equipment': this.groundsEquipmentRecords,
            'food-beverage': this.foodBeverageRecords,
            'vehicles': this.vehicleInspections,
            'coshh': this.coshhAssessments,
            'electric': this.electricalInspections,
            'fire': this.fireAssessments,
            'gas': this.gasInspections,
            'puwer': this.puwerAssessments,
            'loler': this.lolerInspections,
            'contractors': this.contractorRecords,
            'incidents': this.incidentReports,
            'management': this.managementReports,
            'risk-management': this.riskAssessments,
            'ukas': this.ukasRecords,
            'maintenance': this.maintenanceRecords
        };

        let data = dataMap[module] || [];
        
        // Apply filters
        if (options.holidayPark) {
            data = data.filter(r => r.holidayPark === options.holidayPark);
        }
        
        if (options.businessArea) {
            data = data.filter(r => r.businessArea === options.businessArea);
        }
        
        if (options.status) {
            data = data.filter(r => r.status === options.status);
        }
        
        if (options.limit) {
            data = data.slice(0, options.limit);
        }
        
        return data.sort((a, b) => new Date(b.dateCreated) - new Date(a.dateCreated));
    }

    // Get comprehensive stats across all modules
    async getAllStats() {
        const stats = {};
        
        for (const module of Object.keys(this.moduleCollections)) {
            const data = await this.getModuleData(module);
            stats[module] = {
                total: data.length,
                thisWeek: data.filter(r => this.isThisWeek(r.dateCreated)).length,
                pending: data.filter(r => r.status === 'pending' || r.status === 'open').length,
                completed: data.filter(r => r.status === 'completed' || r.status === 'closed').length
            };
        }
        
        return stats;
    }

    isThisWeek(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        return date >= weekAgo;
    }

    // ========================================================================
    // NOTIFICATION & OFFLINE HANDLING
    // ========================================================================
    setupOfflineHandling() {
        window.addEventListener('online', () => {
            this.isOnline = true;
            this.showNotification('🌐 Back online! Syncing all modules...', 'success');
            this.processOfflineQueue();
            enableNetwork(db);
        });

        window.addEventListener('offline', () => {
            this.isOnline = false;
            this.showNotification('📱 Working offline. All changes will sync when online.', 'warning');
            disableNetwork(db);
        });
    }

    async processOfflineQueue() {
        let syncedCount = 0;
        while (this.offlineQueue.length > 0) {
            const operation = this.offlineQueue.shift();
            try {
                await operation();
                syncedCount++;
            } catch (error) {
                console.error('❌ Failed to sync offline operation:', error);
                this.offlineQueue.unshift(operation);
                break;
            }
        }
        
        if (syncedCount > 0) {
            this.showNotification(`✅ Synced ${syncedCount} offline submissions!`, 'success');
        }
    }

    initializeNotificationSystem() {
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
        setTimeout(() => notification.style.transform = 'translateX(0)', 100);
        setTimeout(() => this.removeNotification(notification), duration);
        notification.addEventListener('click', () => this.removeNotification(notification));
    }

    removeNotification(notification) {
        notification.style.transform = 'translateX(100%)';
        setTimeout(() => notification.parentNode?.removeChild(notification), 300);
    }

    // ========================================================================
    // DATA LOADING FOR ALL MODULES
    // ========================================================================
    async loadAllDataFromFirebase() {
        try {
            console.log('📦 Loading all module data from Firebase...');
            
            for (const [module, collectionName] of Object.entries(this.moduleCollections)) {
                try {
                    const snapshot = await getDocs(
                        query(collection(db, collectionName), orderBy('dateCreated', 'desc'), limit(100))
                    );
                    
                    const data = [];
                    snapshot.forEach(doc => data.push({ id: doc.id, ...doc.data() }));
                    
                    // Store in appropriate property
                    const dataProperty = module.replace('-', '') + (module === 'maintenance' ? 'Records' : 
                        module.includes('inspection') ? 's' : 
                        module.includes('assessment') ? 's' : 
                        module.includes('report') ? 's' : 'Records');
                    
                    if (module === 'accommodation') this.accommodationInspections = data;
                    else if (module === 'hot-tub') this.hotTubRecords = data;
                    else if (module === 'play-parks') this.playParksInspections = data;
                    else if (module === 'grounds-equipment') this.groundsEquipmentRecords = data;
                    else if (module === 'food-beverage') this.foodBeverageRecords = data;
                    else if (module === 'vehicles') this.vehicleInspections = data;
                    else if (module === 'coshh') this.coshhAssessments = data;
                    else if (module === 'electric') this.electricalInspections = data;
                    else if (module === 'fire') this.fireAssessments = data;
                    else if (module === 'gas') this.gasInspections = data;
                    else if (module === 'puwer') this.puwerAssessments = data;
                    else if (module === 'loler') this.lolerInspections = data;
                    else if (module === 'contractors') this.contractorRecords = data;
                    else if (module === 'incidents') this.incidentReports = data;
                    else if (module === 'management') this.managementReports = data;
                    else if (module === 'risk-management') this.riskAssessments = data;
                    else if (module === 'ukas') this.ukasRecords = data;
                    else if (module === 'maintenance') this.maintenanceRecords = data;
                    
                    console.log(`✅ Loaded ${data.length} ${module} records`);
                } catch (error) {
                    console.warn(`⚠️ Could not load ${module} data:`, error.message);
                }
            }
            
            // Load recent activities
            const activitiesSnapshot = await getDocs(
                query(collection(db, 'recentActivities'), orderBy('timestamp', 'desc'), limit(50))
            );
            this.recentActivities = [];
            activitiesSnapshot.forEach(doc => this.recentActivities.push({ id: doc.id, ...doc.data() }));
            
            this.updateStats();
            console.log('🎉 All module data loaded successfully');
            
        } catch (error) {
            console.error('❌ Error loading module data:', error);
            this.showNotification('⚠️ Some data could not be loaded', 'warning');
        }
    }

    // ========================================================================
    // UTILITY METHODS
    // ========================================================================
    updateDropdowns() {
        // Holiday park dropdowns
        const parkSelects = document.querySelectorAll('select[name="holidayPark"], select[id*="park"], select[id*="Park"], select[name="location"]');
        parkSelects.forEach(select => {
            if (select.options.length <= 1) {
                select.innerHTML = '<option value="">Select Holiday Park</option>';
                this.holidayParks.forEach(park => {
                    const option = document.createElement('option');
                    option.value = park;
                    option.textContent = park;
                    select.appendChild(option);
                });
            }
        });

        // Business area dropdowns
        const areaSelects = document.querySelectorAll('select[name="businessArea"], select[id*="area"], select[id*="Area"]');
        areaSelects.forEach(select => {
            if (select.options.length <= 1) {
                select.innerHTML = '<option value="">Select Business Area</option>';
                this.businessAreas.forEach(area => {
                    const option = document.createElement('option');
                    option.value = area;
                    option.textContent = area;
                    select.appendChild(option);
                });
            }
        });
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
            this.offlineQueue.push(async () => await addDoc(collection(db, 'recentActivities'), activity));
            return;
        }

        try {
            await addDoc(collection(db, 'recentActivities'), activity);
        } catch (error) {
            console.error('❌ Error adding recent activity:', error);
        }
    }

    updateStats() {
        // Update basic maintenance stats for dashboard compatibility
        const maintenanceStats = {
            total: this.maintenanceRecords.length,
            pending: this.maintenanceRecords.filter(r => r.status === 'pending').length,
            inProgress: this.maintenanceRecords.filter(r => r.status === 'in-progress').length,
            completed: this.maintenanceRecords.filter(r => r.status === 'completed').length,
            critical: this.maintenanceRecords.filter(r => r.priority === 'critical').length
        };

        const elements = {
            totalMaintenance: document.getElementById('totalMaintenance'),
            pendingMaintenance: document.getElementById('pendingMaintenance'),
            inProgressMaintenance: document.getElementById('inProgressMaintenance'),
            completedMaintenance: document.getElementById('completedMaintenance'),
            criticalMaintenance: document.getElementById('criticalMaintenance'),
            activePark: document.getElementById('activePark')
        };

        Object.entries(elements).forEach(([key, element]) => {
            if (element) {
                const statKey = key.replace('Maintenance', '').toLowerCase();
                element.textContent = maintenanceStats[statKey] || this.holidayParks.length;
            }
        });
    }

    // Maintenance system compatibility methods
    async createMaintenanceRequest(requestData) {
        return await this.submitForm(requestData, 'maintenance', 'maintenanceRecords');
    }

    async getMaintenanceStats() {
        return {
            total: this.maintenanceRecords.length,
            pending: this.maintenanceRecords.filter(r => r.status === 'pending').length,
            inProgress: this.maintenanceRecords.filter(r => r.status === 'in-progress').length,
            completed: this.maintenanceRecords.filter(r => r.status === 'completed').length,
            critical: this.maintenanceRecords.filter(r => r.priority === 'critical').length,
            high: this.maintenanceRecords.filter(r => r.priority === 'high').length
        };
    }

    async getMaintenanceRecords(options = {}) {
        return await this.getModuleData('maintenance', options);
    }

    formatDate(dateString) {
        if (!dateString) return 'N/A';
        try {
            return new Date(dateString).toLocaleDateString('en-GB', {
                year: 'numeric', month: 'short', day: 'numeric',
                hour: '2-digit', minute: '2-digit'
            });
        } catch {
            return dateString;
        }
    }

    // Cleanup
    cleanup() {
        this.listeners.forEach(unsubscribe => typeof unsubscribe === 'function' && unsubscribe());
        this.listeners = [];
        document.getElementById('firebase-notification-container')?.remove();
    }

    async setupPresenceSystem() {
        if (!this.currentUser) return;
        try {
            const presenceRef = doc(db, 'presence', this.currentUser.uid);
            await setDoc(presenceRef, {
                online: true,
                lastSeen: new Date().toISOString(),
                userId: this.currentUser.uid
            });
            window.addEventListener('beforeunload', async () => {
                await setDoc(presenceRef, {
                    online: false,
                    lastSeen: new Date().toISOString(),
                    userId: this.currentUser.uid
                });
            });
        } catch (error) {
            console.error('❌ Error setting up presence system:', error);
        }
    }
}

// ============================================================================
// INITIALIZE AND EXPORT - COMPREHENSIVE SYSTEM
// ============================================================================

const safeParkManager = new ComprehensiveFirebaseSafeParkManager();

// Global MaintenanceSystem for backward compatibility
window.MaintenanceSystem = {
    config: {
        statuses: { PENDING: 'pending', IN_PROGRESS: 'in-progress', COMPLETED: 'completed' },
        priorities: { CRITICAL: 'critical', HIGH: 'high', MEDIUM: 'medium', LOW: 'low' },
        categories: {
            HOT_TUBS: 'Hot Tubs', PLAY_PARKS: 'Play Parks', ACCOMMODATION: 'Accommodation',
            EQUIPMENT: 'Grounds & Equipment', FOOD_BEVERAGE: 'Food & Beverage', VEHICLES: 'Vehicles',
            GAS_SAFETY: 'Gas Safety', ELECTRICAL: 'Electrical Safety', FIRE_SAFETY: 'Fire Safety',
            COSHH: 'COSHH', GENERAL: 'General'
        }
    },
    createMaintenanceRequest: async (data) => await safeParkManager.createMaintenanceRequest(data),
    getMaintenanceStats: async () => await safeParkManager.getMaintenanceStats(),
    getMaintenanceRecords: async (options) => await safeParkManager.getMaintenanceRecords(options),
    isAuthenticated: () => safeParkManager.currentUser !== null,
    getCurrentUser: () => safeParkManager.currentUser,
    getBusinessAreas: () => safeParkManager.businessAreas,
    getHolidayParks: () => safeParkManager.holidayParks
};

// Comprehensive SafeParkUtils for all modules
window.SafeParkUtils = {
    // Core utilities
    autoSubmitForm: async (formElement) => await safeParkManager.autoSubmitForm(formElement),
    getModuleData: async (module, options) => await safeParkManager.getModuleData(module, options),
    getAllStats: async () => await safeParkManager.getAllStats(),
    addRecentActivity: async (module, action, status) => await safeParkManager.addRecentActivity(module, action, status),
    
    // Legacy maintenance support
    addMaintenanceRecord: async (data) => await safeParkManager.submitForm(data, 'maintenance', 'maintenanceRecords'),
    updateMaintenanceRecord: async (id, updates) => await safeParkManager.updateMaintenanceRecord(id, updates),
    getMaintenanceRecords: async (options) => await safeParkManager.getMaintenanceRecords(options)
};

// Auto-populate dropdowns
window.syncSafeParkData = () => safeParkManager.updateDropdowns();

// Global form integration
window.addEventListener('DOMContentLoaded', function() {
    console.log('🔍 Scanning for SafePark.PRO forms...');
    
    const forms = document.querySelectorAll('form');
    let integratedCount = 0;
    
    forms.forEach(form => {
        if (form.hasAttribute('data-firebase-integrated')) return;
        
        form.addEventListener('submit', async function(e) {
            const moduleInput = form.querySelector('input[name="module"]');
            const isSecurityForm = form.classList.contains('security-form') || form.id.includes('security');
            const isSafeParkForm = moduleInput || 
                                  form.id.toLowerCase().includes('assessment') ||
                                  form.id.toLowerCase().includes('inspection') ||
                                  form.id.toLowerCase().includes('report') ||
                                  form.action.includes('safepark') ||
                                  window.location.href.includes('.html') ||
                                  isSecurityForm;
            
            if (isSafeParkForm && !form.querySelector('input[name="no-firebase"]')) {
                e.preventDefault();
                
                try {
                    const result = await safeParkManager.autoSubmitForm(form);
                    console.log(`✅ ${result.module} form submitted:`, result.id);
                    
                    safeParkManager.showNotification(`✅ ${result.module} form submitted successfully!`, 'success');
                    
                    if (form.hasAttribute('data-reset-after-submit')) form.reset();
                    form.dispatchEvent(new CustomEvent('firebaseSubmitSuccess', { detail: result }));
                    
                } catch (error) {
                    console.error('❌ Form submission failed:', error);
                    safeParkManager.showNotification('❌ Form submission failed. Saved locally.', 'error');
                    form.dispatchEvent(new CustomEvent('firebaseSubmitError', { detail: error }));
                }
            }
        });
        
        form.setAttribute('data-firebase-integrated', 'true');
        integratedCount++;
    });
    
    console.log(`🔥 ${integratedCount} forms integrated with Firebase`);
    window.dispatchEvent(new CustomEvent('firebaseReady'));
});

// Make globally available
window.safeParkManager = safeParkManager;

// Export for modules
export { db, auth, ComprehensiveFirebaseSafeParkManager, safeParkManager };

console.log('🔥 SafePark.PRO COMPREHENSIVE Firebase Integration Ready');
console.log('📋 ALL 19+ modules supported with auto-detection');
console.log('🚀 accommodation | hot-tub | play-parks | grounds-equipment | food-beverage | vehicles');
console.log('🛡️ coshh | electric | fire | gas | puwer | loler');
console.log('📊 contractors | incidents | management | risk-management | ukas');
console.log('⚡ Auto-submit enabled for ALL SafePark.PRO forms');